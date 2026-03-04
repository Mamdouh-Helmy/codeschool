// app/api/student/groups/[groupId]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Student from "../../../../models/Student";
import Session from "../../../../models/Session";
import Group from "../../../../models/Group";
import Course from "../../../../models/Course";

export async function GET(req, { params }) {
  try {
    const { groupId } = await params;

    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غير مصرح بالوصول", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    await connectDB();

    // ── التحقق أن الطالب عضو في هذا الجروب ──────────────────────────────────
    const student = await Student.findOne({ authUserId: user.id })
      .select("_id academicInfo.groupIds personalInfo.fullName")
      .lean();

    if (!student) {
      return NextResponse.json(
        { success: false, message: "لم يتم العثور على بيانات الطالب" },
        { status: 404 }
      );
    }

    const isMember = student.academicInfo?.groupIds?.some(
      (id) => id.toString() === groupId
    );

    if (!isMember) {
      return NextResponse.json(
        { success: false, message: "غير مصرح لك بالوصول لهذا الجروب" },
        { status: 403 }
      );
    }

    // ── جلب بيانات الجروب مع الكورس والمدرسين ────────────────────────────────
    const group = await Group.findOne({ _id: groupId, isDeleted: false })
      .populate({
        path: "courseId",
        select: "title description level thumbnail curriculum duration grade subject",
      })
      .populate({
        path: "instructors.userId",
        select: "name email profile gender",
      })
      .lean();

    if (!group) {
      return NextResponse.json(
        { success: false, message: "لم يتم العثور على الجروب" },
        { status: 404 }
      );
    }

    // ── جلب إحصائيات الجلسات ──────────────────────────────────────────────────
    const allSessions = await Session.find({
      groupId,
      isDeleted: false,
    })
      .select(
        "status attendanceTaken attendance scheduledDate startTime endTime title moduleIndex sessionNumber meetingLink meetingPlatform"
      )
      .sort({ scheduledDate: 1, startTime: 1 })
      .lean();

    const totalSessions = allSessions.length;
    const completedSessions = allSessions.filter((s) => s.status === "completed");
    const scheduledSessions = allSessions.filter((s) => s.status === "scheduled");
    const cancelledSessions = allSessions.filter((s) => s.status === "cancelled");
    const postponedSessions = allSessions.filter((s) => s.status === "postponed");

    const completedCount = completedSessions.length;
    const remainingCount = scheduledSessions.length;
    const progressPercentage =
      totalSessions > 0 ? Math.round((completedCount / totalSessions) * 100) : 0;

    // ── حساب حضور الطالب ──────────────────────────────────────────────────────
    let attendedCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    completedSessions.forEach((session) => {
      const record = session.attendance?.find(
        (a) => a.studentId.toString() === student._id.toString()
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

    // ── الجلسة التالية ────────────────────────────────────────────────────────
    const now = new Date();
    const nextSession =
      scheduledSessions
        .filter((s) => new Date(s.scheduledDate) >= new Date(now.toDateString()))
        .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))[0] || null;

    // ── آخر جلسة مكتملة ──────────────────────────────────────────────────────
    const lastCompletedSession =
      completedSessions[completedSessions.length - 1] || null;

    // ── تنسيق بيانات المدرسين ─────────────────────────────────────────────────
    const instructors = (group.instructors || []).map((inst) => ({
      _id: inst.userId?._id,
      name: inst.userId?.name || "مدرس",
      email: inst.userId?.email || "",
      avatar: (inst.userId?.name || "M").charAt(0).toUpperCase(),
      countTime: inst.countTime || 0,
    }));

    // ── إحصائيات الجروب ───────────────────────────────────────────────────────
    const groupStats = {
      totalSessions,
      completedSessions: completedCount,
      remainingSessions: remainingCount,
      cancelledSessions: cancelledSessions.length,
      postponedSessions: postponedSessions.length,
      progressPercentage,
      attendedSessions: attendedCount,
      absentSessions: absentCount,
      lateSessions: lateCount,
      excusedSessions: excusedCount,
      attendanceRate,
      hoursCompleted: completedCount * 2,
      hoursRemaining: remainingCount * 2,
      totalHours: totalSessions * 2,
    };

    // ── تنسيق modules ─────────────────────────────────────────────────────────
    const course = group.courseId;
    const modules = (course?.curriculum || []).map((mod, modIdx) => {
      const modSessionStart = modIdx * (mod.totalSessions || 3);
      const modSessionsDone = Math.min(
        Math.max(completedCount - modSessionStart, 0),
        mod.totalSessions || 3
      );
      const modPct = Math.round(
        (modSessionsDone / (mod.totalSessions || 3)) * 100
      );

      return {
        _id: mod._id,
        title: mod.title,
        description: mod.description,
        order: mod.order,
        // ✅ عدد السيشنات (بدل عدد الدروس)
        totalSessions: mod.totalSessions || 3,
        completedSessions: modSessionsDone,
        progressPercentage: modPct,
        isCompleted: modSessionsDone >= (mod.totalSessions || 3),
        isActive:
          modSessionsDone > 0 && modSessionsDone < (mod.totalSessions || 3),
        isPending: modSessionsDone === 0,
        lessons: (mod.lessons || []).map((l) => ({
          title: l.title,
          order: l.order,
          sessionNumber: l.sessionNumber,
          duration: l.duration || "45 دقيقة",
        })),
        projects: mod.projects || [],
      };
    });

    // ✅ عدد السيشنات الإجمالي من الـ curriculum (ليس الدروس)
    const totalCourseSessions = modules.reduce(
      (sum, mod) => sum + (mod.totalSessions || 3),
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        group: {
          _id: group._id,
          name: group.name,
          code: group.code,
          status: group.status,
          schedule: group.schedule,
          maxStudents: group.maxStudents,
          currentStudentsCount: group.currentStudentsCount || 0,
          firstMeetingLink: group.firstMeetingLink || "",
          automation: group.automation,
          sessionsGenerated: group.sessionsGenerated,
        },
        course: course
          ? {
              _id: course._id,
              title: course.title,
              description: course.description,
              level: course.level,
              thumbnail: course.thumbnail,
              duration: course.duration,
              grade: course.grade,
              subject: course.subject,
              totalModules: modules.length,
              // ✅ عدد السيشنات بدل عدد الدروس
              totalSessions: totalCourseSessions,
            }
          : null,
        instructors,
        modules,
        stats: groupStats,
        nextSession: nextSession
          ? {
              _id: nextSession._id,
              title: nextSession.title,
              scheduledDate: nextSession.scheduledDate,
              startTime: nextSession.startTime,
              endTime: nextSession.endTime,
              moduleIndex: nextSession.moduleIndex,
              sessionNumber: nextSession.sessionNumber,
              meetingLink: nextSession.meetingLink,
              meetingPlatform: nextSession.meetingPlatform,
            }
          : null,
        lastCompletedSession: lastCompletedSession
          ? {
              _id: lastCompletedSession._id,
              title: lastCompletedSession.title,
              scheduledDate: lastCompletedSession.scheduledDate,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("❌ [Group Detail API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في تحميل بيانات الجروب",
        error: error.message,
      },
      { status: 500 }
    );
  }
}