// app/api/overview/instructor/[instructorId]/route.js
// ✅ سجل تفصيلي كامل لمدرس: كل السيشنات المكتملة اللي درسها + فلترة اختيارية بالشهر (?month=YYYY-MM)

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../../models/Group";
import Session from "../../../../models/Session";
import User from "../../../../models/User";
import { requireAdmin } from "@/utils/authMiddleware";

const SESSION_HOURS = 2;

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
    const completedSessions = await Session.find({
      groupId: { $in: groupIds },
      status: "completed",
      isDeleted: false,
    })
      .select(
        "groupId title moduleIndex sessionNumber scheduledDate startTime endTime attendance attendanceTaken"
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
        hours: SESSION_HOURS,
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
          totalHours: 0,
          groupsSet: new Set(),
        };
      }
      monthsMap[s.monthKey].sessionsCount += 1;
      monthsMap[s.monthKey].totalHours += SESSION_HOURS;
      monthsMap[s.monthKey].groupsSet.add(s.groupName);
    });

    const monthsSummary = Object.values(monthsMap)
      .map((m) => ({
        monthKey: m.monthKey,
        sessionsCount: m.sessionsCount,
        totalHours: m.totalHours,
        groups: Array.from(m.groupsSet),
      }))
      .sort((a, b) => (a.monthKey < b.monthKey ? 1 : -1));

    // ✅ فلترة السيشنات حسب الشهر لو مطلوب
    const filteredSessions = monthFilter
      ? allSessions.filter((s) => s.monthKey === monthFilter)
      : allSessions;

    // ✅ إجمالي الساعات من countTime الفعلي المخزن في كل جروب (المصدر الرسمي)
    const totalHoursFromGroups = groups.reduce((sum, g) => {
      const inst = g.instructors?.find(
        (i) => i.userId?.toString() === instructorId
      );
      return sum + (inst?.countTime || 0);
    }, 0);

    return NextResponse.json(
      {
        success: true,
        data: {
          instructorId,
          name: instructorUser.name,
          email: instructorUser.email,
          gender: instructorUser.gender,
          jobTitle: instructorUser.profile?.jobTitle || "مدرس",
          totalHours: totalHoursFromGroups,
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