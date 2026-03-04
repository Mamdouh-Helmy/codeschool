// app/api/student/groups/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Student from "../../../models/Student";
import Session from "../../../models/Session";
import Group from "../../../models/Group";

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غير مصرح بالوصول", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    await connectDB();

    const student = await Student.findOne({ authUserId: user.id })
      .select("_id academicInfo.groupIds personalInfo.fullName")
      .lean();

    if (!student) {
      return NextResponse.json(
        { success: false, message: "لم يتم العثور على بيانات الطالب" },
        { status: 404 }
      );
    }

    const groupIds = student.academicInfo?.groupIds || [];

    if (groupIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          groups: [],
          stats: {
            total: 0,
            active: 0,
            completed: 0,
            totalHours: 0,
            totalSessions: 0,
            completedSessions: 0,
            overallProgress: 0,
            overallAttendance: 0,
          },
        },
      });
    }

    // ── جلب الجروبات مع الكورس والمدرسين ─────────────────────────────────────
    const groups = await Group.find({
      _id: { $in: groupIds },
      isDeleted: false,
    })
      .populate({
        path: "courseId",
        select: "title description level thumbnail grade subject curriculum",
      })
      .populate({
        path: "instructors.userId",
        select: "name",
      })
      .select(
        "name code status schedule maxStudents currentStudentsCount courseId instructors sessionsGenerated totalSessionsCount"
      )
      .sort({ status: 1, createdAt: -1 })
      .lean();

    // ── لكل جروب، احسب الإحصائيات ────────────────────────────────────────────
    const enrichedGroups = await Promise.all(
      groups.map(async (group) => {
        const allSessions = await Session.find({
          groupId: group._id,
          isDeleted: false,
        })
          .select("status attendance attendanceTaken scheduledDate startTime endTime title moduleIndex sessionNumber")
          .lean();

        const totalSessions = allSessions.length;
        const completedSessions = allSessions.filter((s) => s.status === "completed");
        const completedCount = completedSessions.length;
        const remainingCount = allSessions.filter((s) => s.status === "scheduled").length;
        const progressPercentage =
          totalSessions > 0 ? Math.round((completedCount / totalSessions) * 100) : 0;

        // حضور الطالب (حاضر + متأخر + معذور)
        let attendedCount = 0;
        let absentCount = 0;
        let lateCount = 0;
        let excusedCount = 0;

        completedSessions.forEach((session) => {
          const record = session.attendance?.find(
            (a) => a.studentId?.toString() === student._id.toString()
          );
          if (record) {
            if (record.status === "present") attendedCount++;
            else if (record.status === "absent") absentCount++;
            else if (record.status === "late") lateCount++;
            else if (record.status === "excused") excusedCount++;
          } else {
            absentCount++;
          }
        });

        const attendanceRate =
          completedCount > 0
            ? Math.round(
                ((attendedCount + lateCount + excusedCount) / completedCount) * 100
              )
            : 0;

        // ✅ عدد السيشنات في الكورس (من curriculum)
        const courseCurriculum = group.courseId?.curriculum || [];
        const totalCourseSessions = courseCurriculum.reduce(
          (sum, mod) => sum + (mod.totalSessions || 3),
          0
        );

        // الجلسة القادمة
        const now = new Date();
        const nextSession = allSessions
          .filter(
            (s) => s.status === "scheduled" && new Date(s.scheduledDate) >= now
          )
          .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))[0];

        // المدرسون
        const instructors = (group.instructors || []).map((inst) => ({
          name: inst.userId?.name || "مدرب",
          avatar: (inst.userId?.name || "م").charAt(0).toUpperCase(),
          countTime: inst.countTime || 0,
        }));

        return {
          _id: group._id,
          name: group.name,
          code: group.code,
          status: group.status,
          schedule: group.schedule,
          maxStudents: group.maxStudents,
          currentStudentsCount: group.currentStudentsCount || 0,
          course: group.courseId
            ? {
                _id: group.courseId._id,
                title: group.courseId.title,
                description: group.courseId.description,
                level: group.courseId.level,
                thumbnail: group.courseId.thumbnail,
                grade: group.courseId.grade,
                subject: group.courseId.subject,
                // ✅ عدد السيشنات بدل عدد الدروس
                totalSessions: totalCourseSessions,
              }
            : null,
          instructors,
          stats: {
            // إجمالي الجلسات الفعلية في الداتابيز
            totalSessions,
            completedSessions: completedCount,
            remainingSessions: remainingCount,
            progressPercentage,
            // الحضور
            attendedSessions: attendedCount,
            absentSessions: absentCount,
            lateSessions: lateCount,
            excusedSessions: excusedCount,
            attendanceRate,
            // الساعات (كل سيشن = ساعتين)
            hoursCompleted: completedCount * 2,
            hoursRemaining: remainingCount * 2,
            totalHours: totalSessions * 2,
          },
          nextSession: nextSession
            ? {
                scheduledDate: nextSession.scheduledDate,
                title: nextSession.title,
                startTime: nextSession.startTime,
                endTime: nextSession.endTime,
              }
            : null,
        };
      })
    );

    const activeGroups = enrichedGroups.filter((g) => g.status === "active");
    const completedGroups = enrichedGroups.filter((g) => g.status === "completed");

    // ✅ إجمالي الإحصائيات لكل الجروبات
    const totalAllSessions = enrichedGroups.reduce((s, g) => s + g.stats.totalSessions, 0);
    const completedAllSessions = enrichedGroups.reduce((s, g) => s + g.stats.completedSessions, 0);
    const overallProgress = totalAllSessions > 0
      ? Math.round((completedAllSessions / totalAllSessions) * 100)
      : 0;

    const avgAttendance = enrichedGroups.length > 0
      ? Math.round(
          enrichedGroups.reduce((s, g) => s + g.stats.attendanceRate, 0) /
            enrichedGroups.length
        )
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        groups: enrichedGroups,
        stats: {
          total: enrichedGroups.length,
          active: activeGroups.length,
          completed: completedGroups.length,
          totalHours: enrichedGroups.reduce((s, g) => s + g.stats.hoursCompleted, 0),
          totalSessions: totalAllSessions,
          completedSessions: completedAllSessions,
          overallProgress,
          overallAttendance: avgAttendance,
        },
      },
    });
  } catch (error) {
    console.error("❌ [Groups List API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في تحميل المجموعات",
        error: error.message,
      },
      { status: 500 }
    );
  }
}