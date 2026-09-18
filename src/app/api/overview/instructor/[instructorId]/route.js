// app/api/overview/instructor/[instructorId]/route.js
// ✅ سجل تفصيلي كامل لمدرس: كل السيشنات المكتملة اللي درسها + فلترة اختيارية بالشهر (?month=YYYY-MM)

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../../models/Group";
import Session from "../../../../models/Session";
import User from "../../../../models/User";
import { requireAdmin } from "@/utils/authMiddleware";

// ── Helpers ──
// ✅ بيحول "HH:mm" لعدد دقايق من نص الليل
function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

// ✅ مدة السيشن الفعلية بالدقيقة — بيفضّل actualStartTime/actualEndTime
// وبيرجع لـ startTime/endTime المجدولة لو مفيش وقت فعلي متسجل.
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

export async function GET(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { instructorId } = await params;
    const { searchParams } = new URL(req.url);
    const monthFilter = searchParams.get("month"); // "YYYY-MM" أو null

    const instructorUser = await User.findById(instructorId)
      .select("name email gender image profile")
      .lean();

    if (!instructorUser) {
      return NextResponse.json(
        { success: false, message: "المدرس غير موجود" },
        { status: 404 }
      );
    }

    // ✅ كل المجموعات اللي المدرس ده جزء منها
    const groups = await Group.find({
      "instructors.userId": instructorId,
      isDeleted: false,
    })
      .select("name code courseSnapshot instructors status")
      .lean();

    const groupsMap = {};
    groups.forEach((g) => {
      groupsMap[g._id.toString()] = g;
    });

    const groupIds = groups.map((g) => g._id);

    // ✅ كل السيشنات المكتملة في مجموعاته (كامل الهيستوري، مش محدود بعدد)
    // 🆕 ضفنا actualStartTime/actualEndTime عشان نحسب مدة كل سيشن الفعلية
    const completedSessions = await Session.find({
      groupId: { $in: groupIds },
      status: "completed",
      isDeleted: false,
    })
      .select(
        "groupId title moduleIndex sessionNumber scheduledDate startTime endTime actualStartTime actualEndTime attendance attendanceTaken"
      )
      .sort({ scheduledDate: -1 })
      .lean();

    // ✅ قائمة موحدة بكل سيشن + بيانات المجموعة + عدد الحضور/الغياب
    const allSessions = completedSessions.map((sess) => {
      const group = groupsMap[sess.groupId.toString()];
      const dateObj = new Date(sess.scheduledDate);
      const monthKey = `${dateObj.getFullYear()}-${String(
        dateObj.getMonth() + 1
      ).padStart(2, "0")}`;

      // 🆕 مدة السيشن الفعلية بالدقيقة، بدل SESSION_HOURS الثابتة
      const durationMinutes = getSessionDurationMinutes(sess);

      return {
        sessionId: sess._id,
        title: sess.title,
        groupId: sess.groupId,
        groupName: group?.name || "—",
        groupCode: group?.code || "",
        courseName: group?.courseSnapshot?.title || "دورة غير محددة",
        moduleIndex: sess.moduleIndex,
        sessionNumber: sess.sessionNumber,
        date: sess.scheduledDate,
        monthKey,
        startTime: sess.startTime,
        endTime: sess.endTime,
        // 🆕 الدقايق الخام — المصدر اللي الفرونت اند هيبني منه "ساعة ودقيقة"
        durationMinutes,
        hours: minutesToHoursDecimal(durationMinutes), // decimal — للتوافق
        attendanceTaken: sess.attendanceTaken,
        presentCount: (sess.attendance || []).filter((a) => a.status === "present").length,
        absentCount: (sess.attendance || []).filter((a) => a.status === "absent").length,
        lateCount: (sess.attendance || []).filter((a) => a.status === "late").length,
        excusedCount: (sess.attendance || []).filter((a) => a.status === "excused").length,
      };
    });

    // ✅ تجميع شهري لكل الشهور اللي فيها جلسات (للفلتر في الواجهة)
    const monthsMap = {};
    allSessions.forEach((s) => {
      if (!monthsMap[s.monthKey]) {
        monthsMap[s.monthKey] = {
          monthKey: s.monthKey,
          sessionsCount: 0,
          totalMinutes: 0,
          groupsSet: new Set(),
        };
      }
      monthsMap[s.monthKey].sessionsCount += 1;
      // 🆕 مجموع الدقايق الفعلية بدل sessionsCount * SESSION_HOURS
      monthsMap[s.monthKey].totalMinutes += s.durationMinutes;
      monthsMap[s.monthKey].groupsSet.add(s.groupName);
    });

    const monthsSummary = Object.values(monthsMap)
      .map((m) => ({
        monthKey: m.monthKey,
        sessionsCount: m.sessionsCount,
        totalMinutes: m.totalMinutes,
        totalHours: minutesToHoursDecimal(m.totalMinutes), // decimal — للتوافق
        groups: Array.from(m.groupsSet),
      }))
      .sort((a, b) => (a.monthKey < b.monthKey ? 1 : -1));

    // ✅ فلترة السيشنات حسب الشهر لو مطلوب
    const filteredSessions = monthFilter
      ? allSessions.filter((s) => s.monthKey === monthFilter)
      : allSessions;

    // ✅ إجمالي الساعات — 🆕 بقى بيتحسب من مجموع الدقايق الفعلية لكل
    // السيشنات المكتملة في مجموعات المدرس ده، بدل countTime الثابت أو
    // SESSION_HOURS الثابتة، عشان يفضل مطابق تمامًا لقائمة السيشنات المعروضة
    const totalMinutes = allSessions.reduce(
      (sum, s) => sum + s.durationMinutes,
      0
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          instructorId,
          name: instructorUser.name,
          email: instructorUser.email,
          gender: instructorUser.gender,
          jobTitle: instructorUser.profile?.jobTitle || "مدرس",
          totalMinutes,
          totalHours: minutesToHoursDecimal(totalMinutes), // decimal — للتوافق
          totalSessions: allSessions.length,
          totalGroups: groups.length,
          monthsSummary,
          selectedMonth: monthFilter || null,
          sessions: filteredSessions,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Instructor History API Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في جلب سجل المدرس",
        error: error.message,
      },
      { status: 500 }
    );
  }
}