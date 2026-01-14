import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Session from "../../../models/Session";
import Group from "../../../models/Group";
import Student from "../../../models/Student";
import Course from "../../../models/Course";
import mongoose from "mongoose";

export async function GET(req) {
  try {
    console.log("👨‍🏫 [Instructor Dashboard API] Request received");

    // الحصول على المستخدم من التوكن
    const user = await getUserFromRequest(req);
    
    if (!user) {
      console.log("❌ [Instructor Dashboard] Unauthorized - No user found");
      return NextResponse.json(
        { 
          success: false, 
          message: "غير مصرح بالوصول",
          code: "UNAUTHORIZED"
        },
        { status: 401 }
      );
    }

    // التحقق من أن المستخدم مدرس
    if (user.role !== "instructor" && user.role !== "admin") {
      return NextResponse.json(
        { 
          success: false, 
          message: "غير مصرح - يجب أن تكون مدرساً",
          code: "NOT_INSTRUCTOR"
        },
        { status: 403 }
      );
    }

    console.log("✅ [Instructor Dashboard] User authenticated:", {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email
    });

    await connectDB();

    // ==================== جلب المجموعات الخاصة بالمدرس ====================
    console.log("👥 [Instructor Dashboard] Fetching instructor groups...");
    
    const groups = await Group.find({
      instructors: user.id,
      isDeleted: false,
      status: { $in: ["active", "completed"] }
    })
      .populate("courseId", "title level")
      .select("name code status currentStudentsCount maxStudents schedule pricing totalSessionsCount metadata")
      .sort({ "schedule.startDate": -1 })
      .lean();

    console.log(`✅ [Instructor Dashboard] Found ${groups.length} groups`);

    // ==================== جلسات اليوم ====================
    console.log("📅 [Instructor Dashboard] Fetching today's sessions...");
    
    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const todayEnd = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );

    const todaySessions = await Session.find({
      groupId: { $in: groups.map(g => g._id) },
      scheduledDate: { $gte: todayStart, $lt: todayEnd },
      isDeleted: false,
      status: { $in: ["scheduled", "postponed"] }
    })
      .populate("groupId", "name code")
      .populate("courseId", "title")
      .sort({ startTime: 1 })
      .lean();

    console.log(`✅ [Instructor Dashboard] Found ${todaySessions.length} today sessions`);

    // ==================== الجلسات القادمة ====================
    console.log("🔮 [Instructor Dashboard] Fetching upcoming sessions...");
    
    const now = new Date();
    const upcomingSessions = await Session.find({
      groupId: { $in: groups.map(g => g._id) },
      scheduledDate: { $gt: now },
      isDeleted: false,
      status: { $in: ["scheduled", "postponed"] }
    })
      .populate("groupId", "name code")
      .populate("courseId", "title")
      .sort({ scheduledDate: 1, startTime: 1 })
      .limit(10)
      .lean();

    console.log(`✅ [Instructor Dashboard] Found ${upcomingSessions.length} upcoming sessions`);

    // ==================== جلسات تحتاج لتسجيل حضور ====================
    console.log("📝 [Instructor Dashboard] Fetching sessions needing attendance...");
    
    const todayForAttendance = new Date();
    const attendanceStart = new Date(todayForAttendance.getTime() - 2 * 60 * 60 * 1000); // قبل ساعتين
    const attendanceEnd = new Date(todayForAttendance.getTime() + 2 * 60 * 60 * 1000); // بعد ساعتين

    const sessionsNeedingAttendance = await Session.find({
      groupId: { $in: groups.map(g => g._id) },
      scheduledDate: { 
        $gte: new Date(todayForAttendance.setHours(0, 0, 0, 0)),
        $lt: new Date(todayForAttendance.setHours(23, 59, 59, 999))
      },
      isDeleted: false,
      status: { $in: ["scheduled", "completed"] },
      $or: [
        { attendanceTaken: false },
        { 
          attendanceTaken: true,
          attendance: { $size: 0 }
        }
      ]
    })
      .populate("groupId", "name code currentStudentsCount")
      .populate("courseId", "title")
      .sort({ scheduledDate: 1, startTime: 1 })
      .lean();

    console.log(`✅ [Instructor Dashboard] Found ${sessionsNeedingAttendance.length} sessions needing attendance`);

    // ==================== جلسات مكتملة حديثاً ====================
    console.log("✅ [Instructor Dashboard] Fetching recently completed sessions...");
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentCompletedSessions = await Session.find({
      groupId: { $in: groups.map(g => g._id) },
      scheduledDate: { $gte: weekAgo },
      isDeleted: false,
      status: "completed",
      attendanceTaken: true
    })
      .populate("groupId", "name code")
      .populate("courseId", "title")
      .sort({ scheduledDate: -1 })
      .limit(5)
      .lean();

    console.log(`✅ [Instructor Dashboard] Found ${recentCompletedSessions.length} recent completed sessions`);

    // ==================== إحصائيات ====================
    console.log("📊 [Instructor Dashboard] Calculating statistics...");
    
    const totalStudents = await Student.countDocuments({
      "academicInfo.groupIds": { $in: groups.map(g => g._id) },
      isDeleted: false,
      "enrollmentInfo.status": "Active"
    });

    const allSessions = await Session.find({
      groupId: { $in: groups.map(g => g._id) },
      isDeleted: false
    }).lean();

    const totalSessions = allSessions.length;
    const completedSessions = allSessions.filter(s => s.status === "completed").length;
    const pendingSessions = allSessions.filter(s => s.status === "scheduled" || s.status === "postponed").length;

    const attendanceStats = {
      totalSessionsWithAttendance: allSessions.filter(s => s.attendanceTaken).length,
      totalStudentsMarked: allSessions.reduce((total, session) => total + (session.attendance?.length || 0), 0)
    };

    // تحضير البيانات
    const stats = {
      totalGroups: groups.length,
      activeGroups: groups.filter(g => g.status === "active").length,
      completedGroups: groups.filter(g => g.status === "completed").length,
      totalStudents: totalStudents,
      totalSessions: totalSessions,
      completedSessions: completedSessions,
      pendingSessions: pendingSessions,
      attendanceStats: attendanceStats,
      todaySessionsCount: todaySessions.length,
      upcomingSessionsCount: upcomingSessions.length,
      sessionsNeedingAttendanceCount: sessionsNeedingAttendance.length
    };

    // ==================== تحضير الرد ====================
    console.log("📦 [Instructor Dashboard] Preparing response...");
    
    const response = {
      success: true,
      data: {
        instructor: {
          id: user.id,
          name: user.name || "مدرس",
          email: user.email,
          role: user.role
        },
        stats: stats,
        todaySessions: todaySessions.map(formatSession),
        upcomingSessions: upcomingSessions.map(formatSession),
        sessionsNeedingAttendance: sessionsNeedingAttendance.map(session => ({
          ...formatSession(session),
          totalStudents: session.groupId?.currentStudentsCount || 0,
          studentsMarked: session.attendance?.length || 0
        })),
        recentCompletedSessions: recentCompletedSessions.map(formatSession),
        groups: groups.map(formatGroup),
        metadata: {
          lastUpdated: new Date().toISOString(),
          groupsCount: groups.length,
          totalDataPoints: {
            sessions: totalSessions,
            students: totalStudents,
            attendanceRecords: attendanceStats.totalStudentsMarked
          }
        }
      }
    };

    console.log("✅ [Instructor Dashboard] Response ready!");
    return NextResponse.json(response);

  } catch (error) {
    console.error("❌ [Instructor Dashboard API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في تحميل بيانات لوحة التحكم",
        error: error.message,
        code: "DASHBOARD_ERROR"
      },
      { status: 500 }
    );
  }
}

// ==================== دوال مساعدة ====================

function formatSession(session) {
  return {
    id: session._id,
    title: session.title,
    scheduledDate: session.scheduledDate,
    startTime: session.startTime,
    endTime: session.endTime,
    status: session.status,
    moduleIndex: session.moduleIndex,
    sessionNumber: session.sessionNumber,
    lessonIndexes: session.lessonIndexes || [],
    attendanceTaken: session.attendanceTaken || false,
    attendanceCount: session.attendance?.length || 0,
    meetingLink: session.meetingLink || "",
    recordingLink: session.recordingLink || "",
    group: {
      id: session.groupId?._id,
      name: session.groupId?.name || "غير محدد",
      code: session.groupId?.code || "غير محدد"
    },
    course: {
      title: session.courseId?.title || "غير محدد"
    },
    dayName: getDayName(session.scheduledDate),
    isToday: isToday(session.scheduledDate),
    isUpcoming: isUpcoming(session.scheduledDate),
    canTakeAttendance: canTakeAttendance(session)
  };
}

function formatGroup(group) {
  return {
    id: group._id,
    name: group.name,
    code: group.code,
    status: group.status,
    course: {
      title: group.courseId?.title || "غير محدد",
      level: group.courseId?.level || "غير محدد"
    },
    schedule: group.schedule,
    studentCount: group.currentStudentsCount || 0,
    maxStudents: group.maxStudents || 0,
    totalSessions: group.totalSessionsCount || 0,
    progress: calculateGroupProgress(group),
    lastActivity: group.metadata?.updatedAt || group.createdAt
  };
}

function getDayName(dateString) {
  const date = new Date(dateString);
  const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  return days[date.getDay()] || "غير محدد";
}

function isToday(dateString) {
  const today = new Date();
  const sessionDate = new Date(dateString);
  return today.toDateString() === sessionDate.toDateString();
}

function isUpcoming(dateString) {
  const now = new Date();
  const sessionDate = new Date(dateString);
  return sessionDate > now;
}

function canTakeAttendance(session) {
  const now = new Date();
  const sessionDateTime = new Date(session.scheduledDate);
  const [hours, minutes] = session.startTime.split(":").map(Number);
  sessionDateTime.setHours(hours, minutes, 0, 0);

  // يمكن أخذ الحضور قبل الجلسة بـ 30 دقيقة وبعد انتهائها بـ 2 ساعة
  const thirtyMinutesBefore = new Date(sessionDateTime.getTime() - 30 * 60000);
  const twoHoursAfter = new Date(sessionDateTime.getTime() + 2 * 60 * 60000);

  return now >= thirtyMinutesBefore && now <= twoHoursAfter;
}

function calculateGroupProgress(group) {
  if (group.status === "completed") return 100;
  
  // يمكننا حساب التقدم بناءً على السيشنات المكتملة
  // هذا مثال مبسط
  const daysSinceStart = Math.floor((new Date() - new Date(group.schedule.startDate)) / (1000 * 60 * 60 * 24));
  const totalDays = 60; // افتراضي 60 يوم للكورس
  
  if (daysSinceStart <= 0) return 0;
  if (daysSinceStart >= totalDays) return 100;
  
  return Math.round((daysSinceStart / totalDays) * 100);
}