// app/api/student/groups/[groupId]/sessions/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Student from "../../../../../models/Student";
import Session from "../../../../../models/Session";
import Group from "../../../../../models/Group";

export async function GET(req, { params }) {
  try {
    // ✅ FIX: await params (Next.js 15)
    const { groupId } = await params;
    const { searchParams } = new URL(req.url);
    const moduleIndex = searchParams.get("moduleIndex");
    const status = searchParams.get("status");

    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غير مصرح بالوصول", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    await connectDB();

    const student = await Student.findOne({ authUserId: user.id })
      .select("_id academicInfo.groupIds")
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

    const query = { groupId, isDeleted: false };
    if (moduleIndex !== null) query.moduleIndex = parseInt(moduleIndex);
    if (status) query.status = status;

    const sessions = await Session.find(query)
      .select(
        "title description status scheduledDate startTime endTime moduleIndex sessionNumber lessonIndexes attendanceTaken attendance meetingLink meetingPlatform meetingCredentials recordingLink automationEvents instructorNotes materials"
      )
      .sort({ moduleIndex: 1, sessionNumber: 1 })
      .lean();

    const group = await Group.findById(groupId)
      .populate({ path: "courseId", select: "title curriculum" })
      .select("courseId name")
      .lean();

    const curriculum = group?.courseId?.curriculum || [];

    const sortedAll = await Session.find({ groupId, isDeleted: false })
      .select("status moduleIndex sessionNumber scheduledDate attendanceTaken")
      .sort({ moduleIndex: 1, sessionNumber: 1 })
      .lean();

    const sessionOrderMap = {};
    sortedAll.forEach((s, idx) => {
      sessionOrderMap[s._id.toString()] = idx;
    });

    const processedSessions = sessions.map((session) => {
      const sessionOrder = sessionOrderMap[session._id.toString()];
      const isFirst = sessionOrder === 0;
      const prevSessionInAll = sortedAll[sessionOrder - 1];
      const prevCompleted =
        isFirst || (prevSessionInAll && prevSessionInAll.status === "completed");

      const canAccess =
        session.status === "completed" ||
        (prevCompleted && session.status !== "cancelled");

      const attendanceRecord = session.attendance?.find(
        (a) => a.studentId?.toString() === student._id.toString()
      );

      const studentAttendance = attendanceRecord
        ? attendanceRecord.status
        : session.status === "completed"
        ? "absent"
        : null;

      const now = new Date();
      const sessionDate = new Date(session.scheduledDate);
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      const isToday = sessionDate >= todayStart && sessionDate <= todayEnd;

      const [endH, endM] = (session.endTime || "23:59").split(":").map(Number);
      const sessionEndTime = new Date(sessionDate);
      sessionEndTime.setHours(endH, endM, 0, 0);

      const showJoinButton =
        prevCompleted &&
        session.status === "scheduled" &&
        isToday &&
        sessionEndTime > now &&
        !!session.meetingLink;

      const moduleData = curriculum[session.moduleIndex] || {};

      // ── جلب الدروس الخاصة بهذه الجلسة بناءً على sessionNumber ──────────────
      // كل جلسة = 2 دروس بناءً على lesson.sessionNumber
      const sessionLessons = (moduleData.lessons || [])
        .filter((l) => l.sessionNumber === session.sessionNumber)
        .map((l) => ({
          title: l.title,
          order: l.order,
          sessionNumber: l.sessionNumber,
          // ✅ مدة الجلسة كلها ساعتين (120 دقيقة) مقسومة على عدد الدروس
          duration: "60 دقيقة",
        }));

      // fallback: لو مفيش دروس بـ sessionNumber استخدم lessonIndexes
      const fallbackLessons =
        sessionLessons.length > 0
          ? sessionLessons
          : (moduleData.lessons || [])
              .filter((l) => (session.lessonIndexes || []).includes(l.order - 1))
              .map((l) => ({
                title: l.title,
                order: l.order,
                sessionNumber: l.sessionNumber,
                duration: "60 دقيقة",
              }));

      return {
        _id: session._id,
        title: session.title,
        description: session.description || "",
        status: session.status,
        scheduledDate: session.scheduledDate,
        startTime: session.startTime,
        endTime: session.endTime,
        // ✅ مدة الجلسة الكلية = ساعتان دائمًا
        totalDuration: "ساعتان (120 دقيقة)",
        totalDurationMinutes: 120,
        moduleIndex: session.moduleIndex,
        moduleName: moduleData.title || `الوحدة ${session.moduleIndex + 1}`,
        sessionNumber: session.sessionNumber,
        lessonIndexes: session.lessonIndexes || [],
        // ✅ الدروس مفلترة بشكل صحيح مع المدة
        lessons: fallbackLessons,
        attendanceTaken: session.attendanceTaken,
        studentAttendance,
        meetingLink: canAccess && session.meetingLink ? session.meetingLink : null,
        meetingPlatform: session.meetingPlatform,
        recordingLink: session.status === "completed" ? session.recordingLink : null,
        materials:
          session.status === "completed" || canAccess
            ? session.materials || []
            : [],
        instructorNotes:
          session.status === "completed" ? session.instructorNotes : null,
        canAccess,
        isFirst,
        prevCompleted,
        showJoinButton,
        isToday,
        order: sessionOrder,
        automationEvents: {
          reminder24hSent: session.automationEvents?.reminder24hSent || false,
          reminder1hSent: session.automationEvents?.reminder1hSent || false,
        },
      };
    });

    const sessionsByModule = {};
    processedSessions.forEach((s) => {
      const key = s.moduleIndex;
      if (!sessionsByModule[key]) {
        const mod = curriculum[key] || {};
        sessionsByModule[key] = {
          moduleIndex: key,
          moduleName: mod.title || `الوحدة ${key + 1}`,
          moduleDescription: mod.description || "",
          totalSessions: mod.totalSessions || 3,
          sessions: [],
        };
      }
      sessionsByModule[key].sessions.push(s);
    });

    Object.values(sessionsByModule).forEach((mod) => {
      const done = mod.sessions.filter((s) => s.status === "completed").length;
      mod.completedSessions = done;
      mod.progressPercentage = Math.round((done / (mod.totalSessions || 3)) * 100);
      mod.isCompleted = done >= (mod.totalSessions || 3);
    });

    const allGroupSessions = await Session.find({ groupId, isDeleted: false }).lean();
    const totalCount = allGroupSessions.length;
    const completedCount = allGroupSessions.filter((s) => s.status === "completed").length;
    const scheduledCount = allGroupSessions.filter((s) => s.status === "scheduled").length;

    return NextResponse.json({
      success: true,
      data: {
        sessions: processedSessions,
        sessionsByModule: Object.values(sessionsByModule).sort(
          (a, b) => a.moduleIndex - b.moduleIndex
        ),
        stats: {
          total: totalCount,
          completed: completedCount,
          scheduled: scheduledCount,
          cancelled: allGroupSessions.filter((s) => s.status === "cancelled").length,
          postponed: allGroupSessions.filter((s) => s.status === "postponed").length,
          progressPercentage:
            totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
        },
        studentId: student._id,
      },
    });
  } catch (error) {
    console.error("❌ [Group Sessions API] Error:", error);
    return NextResponse.json(
      { success: false, message: "فشل في تحميل الجلسات", error: error.message },
      { status: 500 }
    );
  }
}