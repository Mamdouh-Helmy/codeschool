// app/api/overview/route.js
// ✅ API لصفحة نظرة عامة على المدرسين والطلاب وساعاتهم

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Student from "../../models/Student";
import Group from "../../models/Group";
import Session from "../../models/Session";
import User from "../../models/User";
import { requireAdmin } from "@/utils/authMiddleware";

// ── Helpers ──
// ✅ بيحول "HH:mm" لعدد دقايق من نص الليل
function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

// ✅ مدة السيشن الفعلية بالدقيقة — بيفضّل actualStartTime/actualEndTime (لو
// السيشن اتسجل لها وقت فعلي مختلف عن المجدول بعد التعديل) وبيرجع لـ
// startTime/endTime المجدولة لو مفيش وقت فعلي متسجل.
// 🆕 بدل الافتراض الثابت "كل سيشن = 2 ساعة"، كل سيشن بقى ليها مدتها الحقيقية.
function getSessionDurationMinutes(session) {
  const start = timeToMinutes(session.actualStartTime) ?? timeToMinutes(session.startTime);
  const end = timeToMinutes(session.actualEndTime) ?? timeToMinutes(session.endTime);

  if (start === null || end === null) return 0;

  let diff = end - start;
  if (diff < 0) diff += 24 * 60; // احتياط لو السيشن عدّت نص الليل
  return diff;
}

function minutesToHoursDecimal(minutes) {
  return Math.round(((minutes || 0) / 60) * 100) / 100;
}

export async function GET(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    // =============================================
    // ✅ 1. جلب بيانات الطلاب مع الـ credit system
    // =============================================
    const students = await Student.find({ isDeleted: false })
      .select(
        "enrollmentNumber personalInfo guardianInfo enrollmentInfo academicInfo communicationPreferences creditSystem metadata"
      )
      .lean();

    const formattedStudents = students.map((s) => {
      const pkg = s.creditSystem?.currentPackage || null;
      const stats = s.creditSystem?.stats || {};
      const status = s.creditSystem?.status || "no_package";

      const remainingHours = pkg?.remainingHours ?? 0;
      const usedHours = stats.totalHoursUsed ?? 0;
      const totalHours = pkg?.totalHours ?? 0;
      const usagePct =
        totalHours > 0 ? Math.round((usedHours / totalHours) * 100) : 0;

      const hasActiveFreeze = (s.creditSystem?.exceptions || []).some(
        (e) => e.type === "freeze" && e.status === "active"
      );

      let creditLevel = "no_package";
      if (hasActiveFreeze) creditLevel = "frozen";
      else if (status === "active" && remainingHours > 5) creditLevel = "active";
      else if (remainingHours > 0 && remainingHours <= 5) creditLevel = "low";
      else if (remainingHours <= 0 && totalHours > 0) creditLevel = "expired";

      return {
        _id: s._id,
        enrollmentNumber: s.enrollmentNumber,
        name: s.personalInfo?.fullName || "—",
        nickname: {
          ar: s.personalInfo?.nickname?.ar || "",
          en: s.personalInfo?.nickname?.en || "",
        },
        email: s.personalInfo?.email || "",
        phone: s.personalInfo?.phone || "",
        whatsappNumber: s.personalInfo?.whatsappNumber || "",
        gender: s.personalInfo?.gender || "male",
        guardianName: s.guardianInfo?.name || "",
        enrollmentStatus: s.enrollmentInfo?.status || "Active",
        level: s.academicInfo?.level || "Beginner",
        language: s.communicationPreferences?.preferredLanguage || "ar",
        credit: {
          status: creditLevel,
          systemStatus: status,
          hasPackage: !!pkg,
          packageType: pkg?.packageType || null,
          totalHours,
          usedHours,
          remainingHours,
          usagePct,
          packageStartDate: pkg?.startDate || null,
          packageEndDate: pkg?.endDate || null,
          packagePrice: pkg?.price || 0,
          hasActiveFreeze,
          lastUsageDate: stats.lastUsageDate || null,
          totalSessionsAttended: stats.totalSessionsAttended || 0,
          lowBalanceAlertsSent: stats.lowBalanceAlertsSent || 0,
          activeExceptions: (s.creditSystem?.exceptions || []).filter(
            (e) => e.status === "active"
          ).length,
          recentUsage: (s.creditSystem?.usageHistory || [])
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5)
            .map((u) => ({
              date: u.date,
              hoursDeducted: u.hoursDeducted,
              sessionTitle: u.sessionTitle,
              groupName: u.groupName,
              attendanceStatus: u.attendanceStatus,
            })),
        },
        groupIds: s.academicInfo?.groupIds || [],
        createdAt: s.metadata?.createdAt || s.createdAt,
      };
    });

    // =============================================
    // ✅ 2. جلب بيانات المجموعات مع المدرسين والـ countTime
    // =============================================
    const groups = await Group.find({ isDeleted: false })
      .select("name code courseId courseSnapshot instructors students status schedule totalSessionsCount")
      .populate("instructors.userId", "name email gender image profile")
      .lean();

    // =============================================
    // ✅ 3. جلب السيشنات المكتملة لكل مجموعة
    // =============================================
    const groupIds = groups.map((g) => g._id);

    // 🆕 ضفنا actualStartTime/actualEndTime عشان نحسب مدة كل سيشن الفعلية
    // بالدقيقة بدل افتراض ثابت (كان بيفترض كل سيشن = 2 ساعة بالظبط)
    const completedSessions = await Session.find({
      groupId: { $in: groupIds },
      status: "completed",
      isDeleted: false,
    })
      .select(
        "groupId moduleIndex sessionNumber title scheduledDate startTime endTime actualStartTime actualEndTime attendanceTaken attendance"
      )
      .lean();

    // ✅ تنظيم السيشنات حسب الـ groupId
    const sessionsByGroup = {};
    completedSessions.forEach((sess) => {
      const gId = sess.groupId.toString();
      if (!sessionsByGroup[gId]) sessionsByGroup[gId] = [];
      sessionsByGroup[gId].push(sess);
    });

    // =============================================
    // ✅ 4. بناء بيانات المدرسين
    // =============================================
    const instructorsMap = {};

    groups.forEach((group) => {
      const groupSessions = sessionsByGroup[group._id.toString()] || [];

      // 🆕 مجموع الدقايق الفعلية لكل السيشنات المكتملة في الجروب ده — نفس
      // المدة دي بتتحسب لكل مدرسين الجروب (زي منطق addInstructorHours في
      // الـ Group model اللي بيضيف نفس المدة لكل مدرسين الجروب مع بعض)
      const groupMinutesTotal = groupSessions.reduce(
        (sum, s) => sum + getSessionDurationMinutes(s),
        0
      );

      group.instructors?.forEach((inst) => {
        if (!inst.userId) return;

        const userId = inst.userId._id
          ? inst.userId._id.toString()
          : inst.userId.toString();

        if (!instructorsMap[userId]) {
          const userData = inst.userId._id ? inst.userId : null;
          instructorsMap[userId] = {
            _id: userId,
            name: userData?.name || "مدرس",
            email: userData?.email || "",
            gender: userData?.gender || "male",
            image: userData?.image || "",
            jobTitle: userData?.profile?.jobTitle || "مدرس",
            groups: [],
            // 🆕 الدقايق الخام هي المصدر الأساسي دلوقتي
            totalMinutes: 0,
            totalHours: 0, // decimal — لسه موجود للتوافق مع أي كود قديم
            totalSessions: 0,
            lastSession: null,
          };
        }

        const sessionsInGroup = groupSessions.length;

        // ✅ آخر سيشن لهذا المدرس في هذه المجموعة
        const sortedSessions = [...groupSessions].sort(
          (a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate)
        );
        const lastSess = sortedSessions[0] || null;

        instructorsMap[userId].groups.push({
          groupId: group._id,
          groupName: group.name,
          groupCode: group.code,
          courseName:
            group.courseSnapshot?.title ||
            group.courseId?.title ||
            "دورة غير محددة",
          groupStatus: group.status,
          // 🆕 الدقايق الفعلية — العرض في الفرونت اند هيبني منها "ساعة ودقيقة"
          hoursInGroupMinutes: groupMinutesTotal,
          // decimal — لسه موجود للتوافق
          hoursInGroup: minutesToHoursDecimal(groupMinutesTotal),
          sessionsCount: sessionsInGroup,
          studentsCount: group.students?.length || 0,
          lastSession: lastSess
            ? {
                title: lastSess.title,
                date: lastSess.scheduledDate,
                moduleIndex: lastSess.moduleIndex,
                sessionNumber: lastSess.sessionNumber,
              }
            : null,
          recentSessions: sortedSessions.slice(0, 3).map((s) => ({
            title: s.title,
            date: s.scheduledDate,
            moduleIndex: s.moduleIndex,
            sessionNumber: s.sessionNumber,
          })),
        });

        instructorsMap[userId].totalMinutes += groupMinutesTotal;
        instructorsMap[userId].totalSessions += sessionsInGroup;

        // ✅ تحديث آخر سيشن عام للمدرس
        if (
          lastSess &&
          (!instructorsMap[userId].lastSession ||
            new Date(lastSess.scheduledDate) >
              new Date(instructorsMap[userId].lastSession.date))
        ) {
          instructorsMap[userId].lastSession = {
            title: lastSess.title,
            date: lastSess.scheduledDate,
            groupName: group.name,
            moduleIndex: lastSess.moduleIndex,
            sessionNumber: lastSess.sessionNumber,
          };
        }
      });
    });

    // ✅ حساب totalHours (decimal) النهائي لكل مدرس من totalMinutes — للتوافق
    Object.values(instructorsMap).forEach((inst) => {
      inst.totalHours = minutesToHoursDecimal(inst.totalMinutes);
    });

    const formattedInstructors = Object.values(instructorsMap).sort(
      (a, b) => b.totalMinutes - a.totalMinutes
    );

    // =============================================
    // ✅ 5. إحصائيات عامة
    // =============================================
    const totalStudents = formattedStudents.length;
    const activeStudents = formattedStudents.filter(
      (s) => s.credit.creditLevel === "active"
    ).length;
    const lowBalanceStudents = formattedStudents.filter(
      (s) => s.credit.creditLevel === "low"
    ).length;
    const expiredStudents = formattedStudents.filter(
      (s) => s.credit.creditLevel === "expired"
    ).length;
    const frozenStudents = formattedStudents.filter(
      (s) => s.credit.creditLevel === "frozen"
    ).length;
    const noPackageStudents = formattedStudents.filter(
      (s) => s.credit.creditLevel === "no_package"
    ).length;
    const totalRemainingHours = formattedStudents.reduce(
      (s, st) => s + st.credit.remainingHours,
      0
    );
    const totalUsedHours = formattedStudents.reduce(
      (s, st) => s + st.credit.usedHours,
      0
    );

    const totalInstructors = formattedInstructors.length;
    // 🆕 من الدقايق الخام بدل جمع decimal hours مباشرة (أدق)
    const totalInstructorMinutes = formattedInstructors.reduce(
      (s, i) => s + i.totalMinutes,
      0
    );
    const totalInstructorHours = minutesToHoursDecimal(totalInstructorMinutes);
    const totalInstructorSessions = formattedInstructors.reduce(
      (s, i) => s + i.totalSessions,
      0
    );

    // 🆕 إجمالي دقايق كل السيشنات المكتملة (لكل المجموعات) — بدل
    // totalCompletedSessions * SESSION_HOURS الثابتة
    const totalCompletedSessions = completedSessions.length;
    const totalCompletedMinutes = completedSessions.reduce(
      (sum, s) => sum + getSessionDurationMinutes(s),
      0
    );

    const stats = {
      students: {
        total: totalStudents,
        active: formattedStudents.filter(
          (s) => s.enrollmentStatus === "Active"
        ).length,
        graduated: formattedStudents.filter(
          (s) => s.enrollmentStatus === "Graduated"
        ).length,
        suspended: formattedStudents.filter(
          (s) => s.enrollmentStatus === "Suspended"
        ).length,
        dropped: formattedStudents.filter(
          (s) => s.enrollmentStatus === "Dropped"
        ).length,
      },
      credit: {
        totalWithPackage: formattedStudents.filter((s) => s.credit.hasPackage)
          .length,
        active: formattedStudents.filter(
          (s) => s.credit.creditLevel === "active"
        ).length,
        low: lowBalanceStudents,
        expired: expiredStudents,
        frozen: frozenStudents,
        noPackage: noPackageStudents,
        totalRemainingHours,
        totalUsedHours,
      },
      instructors: {
        total: totalInstructors,
        // 🆕 الدقايق الخام — المصدر اللي الفرونت اند هيبني منه العرض
        totalMinutes: totalInstructorMinutes,
        totalHours: totalInstructorHours, // decimal — للتوافق
        totalSessions: totalInstructorSessions,
        avgHoursPerInstructor:
          totalInstructors > 0
            ? Math.round(totalInstructorHours / totalInstructors)
            : 0,
      },
      sessions: {
        totalCompleted: totalCompletedSessions,
        // 🆕 مدة حقيقية بالدقيقة بدل totalCompletedSessions * 2 الثابتة
        totalMinutes: totalCompletedMinutes,
        totalHours: minutesToHoursDecimal(totalCompletedMinutes), // decimal — للتوافق
      },
      groups: {
        total: groups.length,
        active: groups.filter((g) => g.status === "active").length,
        completed: groups.filter((g) => g.status === "completed").length,
        draft: groups.filter((g) => g.status === "draft").length,
      },
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          instructors: formattedInstructors,
          students: formattedStudents,
          stats,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Overview API Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في جلب البيانات",
        error: error.message,
      },
      { status: 500 }
    );
  }
}