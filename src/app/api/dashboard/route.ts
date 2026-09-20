// app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

import Student from "../../models/Student";
import Group from "../../models/Group";
import Invoice from "../../models/Invoice";
import Payment from "../../models/Payment";
import StudentEvaluation from "../../models/StudentEvaluation";
import User from "../../models/User";
import Project from "../../models/Project";
import BlogPost from "../../models/BlogPost";

import { FLOW_COLORS } from "../../../lib/constants/dashboard";

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function getLocale(req: Request): "ar" | "en" {
  return (req.headers.get("accept-language") || "").startsWith("ar") ? "ar" : "en";
}

function fmtTimeAgo(date: Date | string, locale: "ar" | "en"): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.max(0, Math.floor(diff / 60000));
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);

  if (locale === "ar") {
    if (m < 60) return `قبل ${m} دقيقة`;
    if (h < 24) return `قبل ${h} ساعة`;
    return `قبل ${d} يوم`;
  }
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const locale = getLocale(request);
    await connectDB();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // ─── COUNTS (parallel) ──────────────────────────────────
    const [
      totalStudents,
      activeSubscriptions,
      totalGroups,
      activeGroups,
      totalInstructors,
      totalProjects,
      totalBlogs,
      draftPosts,
      pendingInvoices,
      overdueInvoices,
      completedEvals,
      totalEvals,
      zeroBalanceStudents,
    ] = await Promise.all([
      Student.countDocuments({ isDeleted: false }),

      Student.countDocuments({
        isDeleted: false,
        "creditSystem.status": "active",
        "creditSystem.currentPackage.remainingHours": { $gt: 0 },
      }),

      Group.countDocuments({ isDeleted: false, isMakeupGroup: { $ne: true } }),

      Group.countDocuments({
        isDeleted: false,
        isMakeupGroup: { $ne: true },
        status: "active",
        "hold.isHeld": false,
      }),

      User.countDocuments({ role: "instructor", isActive: true }),

      Project.countDocuments({ isActive: true }),
      BlogPost.countDocuments({ status: "published" }),
      BlogPost.countDocuments({ status: "draft" }),

      Invoice.countDocuments({ status: "Pending" }),
      Invoice.countDocuments({
        status: { $in: ["Pending", "Suspended"] },
        dueDate: { $lt: now },
      }),

      StudentEvaluation.countDocuments({ isDeleted: false, finalDecision: "pass" }),
      StudentEvaluation.countDocuments({ isDeleted: false }),

      Student.countDocuments({
        isDeleted: false,
        "creditSystem.currentPackage": { $ne: null },
        "creditSystem.currentPackage.remainingHours": { $lte: 0 },
      }),
    ]);

    // ─── REVENUE (collected + escrow) ───────────────────────
    const [thisMonthAgg, lastMonthAgg, escrowAgg] = await Promise.all([
      Payment.aggregate([
        { $match: { type: "payment", status: "completed", date: { $gte: startOfMonth, $lte: now } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Payment.aggregate([
        { $match: { type: "payment", status: "completed", date: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      // ✅ Escrow من Invoice (مش Payment) — لأن Invoice هو اللي بيحمل حالة Escrow
      Invoice.aggregate([
        { $match: { status: "Escrow" } },
        { $group: { _id: null, total: { $sum: { $subtract: ["$totalAmount", "$paidAmount"] } } } },
      ]),
    ]);

    const monthlyRevenue = thisMonthAgg[0]?.total || 0;
    const prevRevenue = lastMonthAgg[0]?.total || 0;
    const escrowAmount = escrowAgg[0]?.total || 0;

    const revenueTrendPct =
      prevRevenue > 0
        ? Math.round(((monthlyRevenue - prevRevenue) / prevRevenue) * 100)
        : monthlyRevenue > 0
          ? 100
          : 0;

    const courseCompletion = totalEvals > 0 ? Math.round((completedEvals / totalEvals) * 100) : 0;

    // ─── PERFORMANCE (weekly engagement) ────────────────────
    const activeGroupsList = await Group.find({
      isDeleted: false,
      isMakeupGroup: { $ne: true },
      status: "active",
      "hold.isHeld": false,
    })
      .select("schedule.daysOfWeek currentStudentsCount maxStudents")
      .lean();

    const daysEn = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const daysAr = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

    const performance = daysEn.map((dayEn, idx) => {
      const groups = activeGroupsList.filter((g: any) => g.schedule?.daysOfWeek?.includes(dayEn));
      const label = locale === "ar" ? daysAr[idx] : dayEn.slice(0, 3);
      if (groups.length === 0) return { label, value: 0 };
      const avg =
        groups.reduce((sum: number, g: any) => {
          const cap = g.maxStudents > 0 ? (g.currentStudentsCount / g.maxStudents) * 100 : 0;
          return sum + cap;
        }, 0) / groups.length;
      return { label, value: Math.round(avg) };
    });

    // ─── STUDENT LIFECYCLE ─────────────────────────────────
    const [enrolled, inGroup, withPackage, attended] = await Promise.all([
      Student.countDocuments({ isDeleted: false }),
      Student.countDocuments({ isDeleted: false, "academicInfo.groupIds.0": { $exists: true } }),
      Student.countDocuments({ isDeleted: false, "creditSystem.status": "active" }),
      Student.countDocuments({
        isDeleted: false,
        "creditSystem.stats.totalSessionsAttended": { $gt: 0 },
      }),
    ]);

    const studentLifecycle = [
      { stage: "enrolled", count: enrolled, color: FLOW_COLORS.lifecycle.enrolled },
      { stage: "assigned_to_group", count: inGroup, color: FLOW_COLORS.lifecycle.assigned_to_group },
      { stage: "has_active_package", count: withPackage, color: FLOW_COLORS.lifecycle.has_active_package },
      { stage: "attended_session", count: attended, color: FLOW_COLORS.lifecycle.attended_session },
    ];

    // ─── BILLING FUNNEL ─────────────────────────────────────
    const billingAgg = await Invoice.aggregate([
      { $match: { status: { $ne: "Voided" } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          amount: { $sum: { $subtract: ["$totalAmount", "$paidAmount"] } },
        },
      },
    ]);

    const bMap = billingAgg.reduce((acc: any, b: any) => {
      acc[b._id] = { count: b.count, amount: Math.max(0, b.amount || 0) };
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);

    const billingFunnel = [
      { stage: "pending", count: bMap.Pending?.count || 0, amount: bMap.Pending?.amount || 0, color: FLOW_COLORS.billing.pending },
      { stage: "escrow", count: bMap.Escrow?.count || 0, amount: bMap.Escrow?.amount || 0, color: FLOW_COLORS.billing.escrow },
      { stage: "suspended", count: bMap.Suspended?.count || 0, amount: bMap.Suspended?.amount || 0, color: FLOW_COLORS.billing.suspended },
      { stage: "paid", count: bMap.Paid?.count || 0, amount: 0, color: FLOW_COLORS.billing.paid },
    ];

    // ─── CREDIT HEALTH (fixed buckets) ──────────────────────
    const creditAgg = await Student.aggregate([
      { $match: { isDeleted: false, "creditSystem.currentPackage": { $ne: null } } },
      {
        $bucket: {
          groupBy: "$creditSystem.currentPackage.remainingHours",
          boundaries: [0, 0.1, 5, 15],
          default: "good",
          output: { count: { $sum: 1 } },
        },
      },
    ]);

    const creditHealth = [
      { level: "zero", count: creditAgg.find((b: any) => b._id === 0)?.count || 0, color: FLOW_COLORS.credit.zero },
      { level: "critical", count: creditAgg.find((b: any) => b._id === 0.1)?.count || 0, color: FLOW_COLORS.credit.critical },
      { level: "low", count: creditAgg.find((b: any) => b._id === 5)?.count || 0, color: FLOW_COLORS.credit.low },
      { level: "good", count: creditAgg.find((b: any) => b._id === "good")?.count || 0, color: FLOW_COLORS.credit.good },
    ];

    // ─── REVENUE TREND (6 months) ───────────────────────────
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const trendAgg = await Payment.aggregate([
      { $match: { type: "payment", status: "completed", date: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            y: { $year: "$date" },
            m: { $month: "$date" },
            escrow: { $ifNull: ["$escrow.status", "recognized"] },
          },
          total: { $sum: "$amount" },
        },
      },
    ]);

    const revenueTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString(locale === "ar" ? "ar-EG" : "en", { month: "short" });
      const y = d.getFullYear();
      const m = d.getMonth() + 1;

      const collected = trendAgg
        .filter((t: any) => t._id.y === y && t._id.m === m && t._id.escrow === "recognized")
        .reduce((s: number, t: any) => s + t.total, 0);

      const esc = trendAgg
        .filter((t: any) => t._id.y === y && t._id.m === m && t._id.escrow === "in_escrow")
        .reduce((s: number, t: any) => s + t.total, 0);

      revenueTrend.push({ month: label, collected, escrow: esc });
    }

    // ─── ACTIVITIES ────────────────────────────────────────
    const [payments, evals, groups, users] = await Promise.all([
      Payment.find({ type: "payment", status: "completed" })
        .sort({ date: -1 })
        .limit(3)
        .populate("studentId", "personalInfo.fullName")
        .lean(),
      StudentEvaluation.find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(2)
        .populate("studentId", "personalInfo.fullName")
        .populate("groupId", "name")
        .lean(),
      Group.find({ isDeleted: false, isMakeupGroup: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(2)
        .select("name code courseSnapshot status createdAt")
        .lean(),
      User.find({ role: "student", isActive: true })
        .sort({ createdAt: -1 })
        .limit(2)
        .select("name createdAt")
        .lean(),
    ]);

    const activities: any[] = [];

    payments.forEach((p: any) => {
      activities.push({
        id: `pay-${p._id}`,
        title: `${locale === "ar" ? "دفعة مستلمة" : "Payment received"} — ${(p.amount || 0).toLocaleString()} EGP`,
        description: `${p.studentId?.personalInfo?.fullName || (locale === "ar" ? "طالب" : "Student")} • ${p.method || "cash"}`,
        timestamp: fmtTimeAgo(p.date, locale),
        rawTime: new Date(p.date).getTime(),
        icon: "ion:cash-outline",
        tone: "success",
      });
    });

    evals.forEach((e: any) => {
      activities.push({
        id: `eval-${e._id}`,
        title: `${locale === "ar" ? "تقييم" : "Evaluation"}: ${(e.finalDecision || "").toUpperCase()}`,
        description: `${e.studentId?.personalInfo?.fullName || "—"} ${locale === "ar" ? "في" : "in"} ${e.groupId?.name || "Group"}`,
        timestamp: fmtTimeAgo(e.createdAt, locale),
        rawTime: new Date(e.createdAt).getTime(),
        icon: "ion:ribbon-outline",
        tone: e.finalDecision === "pass" ? "success" : "warning",
      });
    });

    groups.forEach((g: any) => {
      activities.push({
        id: `grp-${g._id}`,
        title: `${locale === "ar" ? "جروب جديد" : "New group"}: ${g.name}`,
        description: `${g.courseSnapshot?.title || g.code} • ${g.status}`,
        timestamp: fmtTimeAgo(g.createdAt, locale),
        rawTime: new Date(g.createdAt).getTime(),
        icon: "ion:people-circle-outline",
        tone: "info",
      });
    });

    users.forEach((u: any) => {
      activities.push({
        id: `usr-${u._id}`,
        title: locale === "ar" ? "تسجيل طالب جديد" : "New Student Registration",
        description: `${u.name} ${locale === "ar" ? "انضم للمنصة" : "joined the platform"}`,
        timestamp: fmtTimeAgo(u.createdAt, locale),
        rawTime: new Date(u.createdAt).getTime(),
        icon: "ion:person-add",
        tone: "success",
      });
    });

    if (zeroBalanceStudents > 0) {
      activities.push({
        id: "zero-balance",
        title: `${zeroBalanceStudents} ${locale === "ar" ? "طالب برصيد صفر" : "students with zero balance"}`,
        description: locale === "ar"
          ? "الرصيد استنفد — تم تعطيل الإشعارات"
          : "Credit exhausted — notifications disabled",
        timestamp: locale === "ar" ? "الآن" : "now",
        rawTime: Date.now(),
        icon: "ion:alert-circle-outline",
        tone: "warning",
      });
    }

    activities.sort((a, b) => b.rawTime - a.rawTime);

    // ─── ENROLLMENTS ───────────────────────────────────────
    const recentStudents = await Student.find({ isDeleted: false })
      .sort({ "enrollmentInfo.enrollmentDate": -1, createdAt: -1 })
      .limit(8)
      .populate({
        path: "academicInfo.groupIds",
        select: "name courseSnapshot",
      })
      .select(
        "personalInfo.fullName personalInfo.email enrollmentInfo.enrollmentDate creditSystem.currentPackage academicInfo.groupIds"
      )
      .lean();

    const enrollments = recentStudents.map((s: any, i: number) => {
      const pkg = s.creditSystem?.currentPackage;
      const progress =
        pkg && pkg.totalHours > 0
          ? Math.round(((pkg.totalHours - pkg.remainingHours) / pkg.totalHours) * 100)
          : 0;

      let status: "active" | "pending" | "trial" = "pending";
      if (pkg?.status === "active") status = "active";
      else if (!s.academicInfo?.groupIds?.length) status = "trial";

      const firstGroup = s.academicInfo?.groupIds?.[0];

      return {
        id: s._id?.toString() || `enroll-${i}-${Date.now()}`,
        name: s.personalInfo?.fullName || (locale === "ar" ? "غير معروف" : "Unknown"),
        email: s.personalInfo?.email || "—",
        course:
          firstGroup?.courseSnapshot?.title ||
          firstGroup?.name ||
          (locale === "ar" ? "غير محدد" : "Not assigned"),
        progress,
        enrolledOn: new Date(s.enrollmentInfo?.enrollmentDate || Date.now()).toLocaleDateString(
          locale === "ar" ? "ar-EG" : "en-US"
        ),
        status,
      };
    });

    // ─── RESPONSE ──────────────────────────────────────────
    return NextResponse.json({
      success: true,
      hasData: true,
      timestamp: new Date().toISOString(),
      data: {
        stats: {
          totalStudents,
          activeSubscriptions,
          monthlyRevenue,
          courseCompletion,
          totalProjects,
          totalBlogs,
          totalGroups,
          activeGroups,
          totalInstructors,
          pendingInvoices,
          overdueInvoices,
          escrowAmount,
          revenueTrendPct,
        },
        performance,
        activities: activities.slice(0, 6).map(({ rawTime, ...r }) => r),
        enrollments: enrollments.slice(0, 5),
        content: {
          stats: [
            {
              label: locale === "ar" ? "المقالات المنشورة" : "Published Posts",
              value: totalBlogs.toString(),
              change: `${draftPosts} ${locale === "ar" ? "مسودة" : "drafts"}`,
              isPositive: draftPosts < 5,
              icon: "ion:document-text",
            },
            {
              label: locale === "ar" ? "المشاريع النشطة" : "Active Projects",
              value: totalProjects.toString(),
              change: "+8%",
              isPositive: true,
              icon: "ion:rocket",
            },
          ],
          actions: [
            {
              label: locale === "ar" ? "كتابة مقال جديد" : "Write New Blog Post",
              description: locale === "ar" ? "إنشاء محتوى" : "Content creation",
              href: "/admin/blogs",
            },
            {
              label: locale === "ar" ? "عرض مشاريع الطلاب" : "View Student Projects",
              description: locale === "ar" ? "مراجعة المحفظة" : "Portfolio review",
              href: "/admin/projects",
            },
          ],
        },
        flows: { studentLifecycle, billingFunnel, creditHealth },
        revenueTrend,
      },
    });
  } catch (error: any) {
    console.error("❌ Dashboard API error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch dashboard" },
      { status: 500 }
    );
  }
}