// app/api/instructor/reports/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Group from "../../../models/Group";
import Session from "../../../models/Session";
import Student from "../../../models/Student";
import Course from "../../../models/Course";

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, code: "UNAUTHORIZED" }, { status: 401 });
    }
    if (user.role !== "instructor" && user.role !== "admin") {
      return NextResponse.json({ success: false, code: "FORBIDDEN" }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId") || "all";
    const period = searchParams.get("period") || "all"; // all | month | week

    // ── Fetch instructor's groups ──
    const groups = await Group.find({
      "instructors.userId": user.id,
      isDeleted: false,
      status: { $in: ["active", "completed", "draft"] },
    })
      .populate({ path: "courseId", select: "title level thumbnail" })
      .select("name code status currentStudentsCount maxStudents schedule instructors courseSnapshot courseId students")
      .lean();

    const groupIds = groupId === "all"
      ? groups.map((g) => g._id)
      : [groups.find((g) => g._id.toString() === groupId)?._id].filter(Boolean);

    // ── Date filter ──
    let dateFilter = {};
    const now = new Date();
    if (period === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = { scheduledDate: { $gte: weekAgo } };
    } else if (period === "month") {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter = { scheduledDate: { $gte: monthAgo } };
    }

    // ── All sessions ──
    const allSessions = await Session.find({
      groupId: { $in: groupIds },
      isDeleted: false,
      ...dateFilter,
    })
      .populate("groupId", "name code")
      .select("status attendance scheduledDate startTime endTime title groupId moduleIndex sessionNumber")
      .lean();

    const completedSessions = allSessions.filter((s) => s.status === "completed");
    const scheduledSessions = allSessions.filter((s) => s.status === "scheduled");
    const cancelledSessions = allSessions.filter((s) => s.status === "cancelled");
    const postponedSessions = allSessions.filter((s) => s.status === "postponed");

    // ── Attendance totals ──
    let totalPresent = 0, totalAbsent = 0, totalLate = 0, totalExcused = 0;
    let totalRecords = 0;

    completedSessions.forEach((session) => {
      (session.attendance || []).forEach((rec) => {
        totalRecords++;
        if (rec.status === "present") totalPresent++;
        else if (rec.status === "absent") totalAbsent++;
        else if (rec.status === "late") totalLate++;
        else if (rec.status === "excused") totalExcused++;
      });
    });

    const overallAttendanceRate = totalRecords > 0
      ? Math.round(((totalPresent + totalLate + totalExcused) / totalRecords) * 100)
      : 0;

    // ── Per-group breakdown ──
    const groupReports = await Promise.all(
      groups.map(async (group) => {
        const gSessions = allSessions.filter((s) => s.groupId?._id?.toString() === group._id.toString() || s.groupId?.toString() === group._id.toString());
        const gCompleted = gSessions.filter((s) => s.status === "completed");

        let gPresent = 0, gAbsent = 0, gLate = 0, gExcused = 0, gRecords = 0;
        gCompleted.forEach((s) => {
          (s.attendance || []).forEach((r) => {
            gRecords++;
            if (r.status === "present") gPresent++;
            else if (r.status === "absent") gAbsent++;
            else if (r.status === "late") gLate++;
            else if (r.status === "excused") gExcused++;
          });
        });

        const gAttRate = gRecords > 0
          ? Math.round(((gPresent + gLate + gExcused) / gRecords) * 100)
          : 0;

        const myInstructor = group.instructors?.find(
          (i) => i.userId?.toString() === user.id || i.userId?._id?.toString() === user.id
        );

        return {
          _id: group._id,
          name: group.name,
          code: group.code,
          status: group.status,
          courseTitle: group.courseId?.title || group.courseSnapshot?.title || group.name,
          courseLevel: group.courseId?.level || "beginner",
          currentStudentsCount: group.currentStudentsCount || 0,
          totalSessions: gSessions.length,
          completedSessions: gCompleted.length,
          scheduledSessions: gSessions.filter((s) => s.status === "scheduled").length,
          cancelledSessions: gSessions.filter((s) => s.status === "cancelled").length,
          attendanceRate: gAttRate,
          present: gPresent,
          absent: gAbsent,
          late: gLate,
          excused: gExcused,
          totalRecords: gRecords,
          progress: gSessions.length > 0 ? Math.round((gCompleted.length / gSessions.length) * 100) : 0,
          myTeachingHours: myInstructor?.countTime || 0,
        };
      })
    );

    // ── Per-student breakdown across groups ──
    const uniqueStudentIds = new Set();
    groups.forEach((g) => (g.students || []).forEach((s) => uniqueStudentIds.add(s.toString())));

    const students = await Student.find({
      _id: { $in: [...uniqueStudentIds] },
      isDeleted: false,
    })
      .select("personalInfo.fullName personalInfo.email personalInfo.gender academicInfo enrollmentNumber")
      .lean();

    const studentReports = students.map((student) => {
      let sPresent = 0, sAbsent = 0, sLate = 0, sExcused = 0, sRecords = 0;
      completedSessions.forEach((session) => {
        const rec = (session.attendance || []).find(
          (r) => r.studentId?.toString() === student._id.toString()
        );
        if (rec) {
          sRecords++;
          if (rec.status === "present") sPresent++;
          else if (rec.status === "absent") sAbsent++;
          else if (rec.status === "late") sLate++;
          else if (rec.status === "excused") sExcused++;
        }
      });
      const rate = sRecords > 0
        ? Math.round(((sPresent + sLate + sExcused) / sRecords) * 100)
        : 0;

      return {
        _id: student._id,
        name: student.personalInfo?.fullName || "—",
        email: student.personalInfo?.email || "",
        gender: student.personalInfo?.gender || "male",
        enrollmentNumber: student.enrollmentNumber || "",
        present: sPresent,
        absent: sAbsent,
        late: sLate,
        excused: sExcused,
        totalSessions: sRecords,
        attendanceRate: rate,
      };
    });

    // ── Attendance trend by month (last 6 months) ──
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const monthSessions = completedSessions.filter((s) => {
        const sd = new Date(s.scheduledDate);
        return sd >= monthStart && sd <= monthEnd;
      });

      let mPresent = 0, mAbsent = 0, mLate = 0, mExcused = 0, mRecords = 0;
      monthSessions.forEach((s) => {
        (s.attendance || []).forEach((r) => {
          mRecords++;
          if (r.status === "present") mPresent++;
          else if (r.status === "absent") mAbsent++;
          else if (r.status === "late") mLate++;
          else if (r.status === "excused") mExcused++;
        });
      });

      monthlyTrend.push({
        month: d.toLocaleDateString("en-US", { month: "short" }),
        monthAr: d.toLocaleDateString("ar-EG", { month: "short" }),
        sessions: monthSessions.length,
        present: mPresent,
        absent: mAbsent,
        late: mLate,
        excused: mExcused,
        total: mRecords,
        rate: mRecords > 0 ? Math.round(((mPresent + mLate + mExcused) / mRecords) * 100) : 0,
      });
    }

    // ── Per-session attendance list ──
    const sessionReports = completedSessions
      .sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate))
      .slice(0, 20)
      .map((s) => {
        const present = (s.attendance || []).filter((r) => r.status === "present").length;
        const absent = (s.attendance || []).filter((r) => r.status === "absent").length;
        const late = (s.attendance || []).filter((r) => r.status === "late").length;
        const excused = (s.attendance || []).filter((r) => r.status === "excused").length;
        const total = s.attendance?.length || 0;
        return {
          _id: s._id,
          title: s.title,
          date: new Date(s.scheduledDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          startTime: s.startTime,
          endTime: s.endTime,
          groupName: s.groupId?.name || "—",
          present, absent, late, excused, total,
          rate: total > 0 ? Math.round(((present + late + excused) / total) * 100) : 0,
        };
      });

    return NextResponse.json({
      success: true,
      data: {
        groups: groupReports,
        allGroups: groups.map((g) => ({
          _id: g._id,
          name: g.name,
          code: g.code,
          courseTitle: g.courseId?.title || g.courseSnapshot?.title || g.name,
        })),
        overview: {
          totalGroups: groups.length,
          activeGroups: groups.filter((g) => g.status === "active").length,
          totalSessions: allSessions.length,
          completedSessions: completedSessions.length,
          scheduledSessions: scheduledSessions.length,
          cancelledSessions: cancelledSessions.length,
          postponedSessions: postponedSessions.length,
          totalStudents: uniqueStudentIds.size,
          totalPresent,
          totalAbsent,
          totalLate,
          totalExcused,
          totalRecords,
          overallAttendanceRate,
          totalTeachingHours: groups.reduce((sum, g) => {
            const me = g.instructors?.find(
              (i) => i.userId?.toString() === user.id || i.userId?._id?.toString() === user.id
            );
            return sum + (me?.countTime || 0);
          }, 0),
        },
        monthlyTrend,
        sessionReports,
        studentReports: studentReports.sort((a, b) => b.attendanceRate - a.attendanceRate),
      },
    });
  } catch (error) {
    console.error("❌ [Reports API]", error);
    return NextResponse.json(
      { success: false, message: "فشل في تحميل التقارير", error: error.message },
      { status: 500 }
    );
  }
}