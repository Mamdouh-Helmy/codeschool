import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Student from "../../../models/Student";
import Session from "../../../models/Session";
import Group from "../../../models/Group";
import Course from "../../../models/Course";

export async function GET(req) {
  try {
    console.log("📊 [Dashboard API] Request received");

    const user = await getUserFromRequest(req);

    if (!user) {
      console.log("❌ [Dashboard API] Unauthorized - No user found");
      return NextResponse.json(
        {
          success: false,
          message: "غير مصرح بالوصول",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    console.log("✅ [Dashboard API] User authenticated:", {
      id: user.id,
      name: user.name,
      role: user.role,
    });

    await connectDB();

    const student = await Student.findOne({ authUserId: user.id })
      .select(
        "_id personalInfo.fullName personalInfo.email academicInfo.groupIds academicInfo.currentCourses enrollmentInfo.status"
      )
      .lean();

    if (!student) {
      console.log("⚠️ [Dashboard API] No student record found for user:", user.id);
      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name || "طالب",
            email: user.email || "",
            role: user.role || "student",
          },
          stats: {
            totalSessions: 0,
            attendedSessions: 0,
            attendanceRate: 0,
            totalGroups: 0,
            activeGroups: 0,
            pendingAssignments: 0,
            completedCourses: 0,
          },
          systemStats: {
            totalStudents: 0,
            totalActiveCourses: 0,
            systemCompletionRate: 0,
          },
          progressData: {
            stages: [],
            statsCards: []
          },
          nextSession: null,
          groups: [],
          sessions: [],
          notifications: [],
          currentCourses: [],
          upcomingEvents: [],
        },
      });
    }

    console.log("✅ [Dashboard API] Student found:", student._id);

    const studentId = student._id;
    const groupIds = student.academicInfo?.groupIds || [];

    // ✅ حساب إحصائيات الحضور
    console.log("📈 [Dashboard API] Calculating attendance stats...");

    const completedSessionsWithAttendance = await Session.find({
      groupId: { $in: groupIds },
      isDeleted: false,
      status: "completed",
      attendanceTaken: true
    })
      .select("attendance attendanceTaken")
      .lean();

    console.log(`📊 Found ${completedSessionsWithAttendance.length} completed sessions with attendance`);

    let attendedSessions = 0;
    let absentSessions = 0;
    let lateSessions = 0;
    let excusedSessions = 0;
    let totalSessionsWithAttendance = completedSessionsWithAttendance.length;

    completedSessionsWithAttendance.forEach((session) => {
      const attendanceRecord = session.attendance?.find(
        (a) => a.studentId.toString() === studentId.toString()
      );

      if (attendanceRecord) {
        switch (attendanceRecord.status) {
          case "present":
            attendedSessions++;
            break;
          case "absent":
            absentSessions++;
            break;
          case "late":
            lateSessions++;
            break;
          case "excused":
            excusedSessions++;
            break;
          default:
            absentSessions++;
        }
      } else {
        absentSessions++;
      }
    });

    const attendanceRate = totalSessionsWithAttendance > 0
      ? Math.round(((attendedSessions + lateSessions + excusedSessions) / totalSessionsWithAttendance) * 100)
      : 0;

    console.log("📊 Attendance breakdown:", {
      totalSessionsWithAttendance,
      attended: attendedSessions,
      absent: absentSessions,
      late: lateSessions,
      excused: excusedSessions,
      attendanceRate: `${attendanceRate}%`,
    });

    // ✅ جلب المجموعات مع بيانات الكورسات
    console.log("👥 [Dashboard API] Fetching groups with course data...");
    const groups = await Group.find({
      _id: { $in: groupIds },
      isDeleted: false,
      status: { $in: ["active", "completed"] },
    })
      .populate({
        path: "courseId",
        select: "title description level thumbnail curriculum duration"
      })
      .select("name code status currentStudentsCount schedule metadata courseSnapshot")
      .sort({ status: 1, "schedule.startDate": -1 })
      .lean();

    // ✅ حساب تقدم الدورات بشكل مفصّل
    console.log("📚 [Dashboard API] Calculating detailed course progress...");
    const currentCourses = await Promise.all(
      groups
        .filter(g => g.status === "active")
        .map(async (group) => {
          const courseId = group.courseId?._id || group.courseId;

          const totalCourseSessions = await Session.countDocuments({
            groupId: group._id,
            isDeleted: false,
          });

          const completedCourseSessions = await Session.countDocuments({
            groupId: group._id,
            isDeleted: false,
            status: "completed",
          });

          const progressPercentage = totalCourseSessions > 0
            ? Math.round((completedCourseSessions / totalCourseSessions) * 100)
            : 0;

          const remainingSessions = totalCourseSessions - completedCourseSessions;
          const estimatedHoursPerSession = 1.5;
          const hoursLeft = Math.ceil(remainingSessions * estimatedHoursPerSession);

          let totalLessons = 0;
          if (group.courseId?.curriculum) {
            totalLessons = group.courseId.curriculum.reduce((sum, module) =>
              sum + (module.lessons?.length || 0), 0
            );
          }

          const courseTitle = (group.courseId?.title || group.name).toLowerCase();
          let gradient, icon;

          if (courseTitle.includes('web') || courseTitle.includes('html') || courseTitle.includes('javascript')) {
            gradient = 'from-purple-500 to-indigo-600';
            icon = 'code';
          } else if (courseTitle.includes('design') || courseTitle.includes('ui') || courseTitle.includes('ux')) {
            gradient = 'from-green-400 to-emerald-500';
            icon = 'design';
          } else if (courseTitle.includes('data') || courseTitle.includes('python')) {
            gradient = 'from-blue-500 to-cyan-500';
            icon = 'database';
          } else if (courseTitle.includes('mobile') || courseTitle.includes('app')) {
            gradient = 'from-pink-500 to-rose-600';
            icon = 'smartphone';
          } else {
            gradient = 'from-purple-500 to-indigo-600';
            icon = 'code';
          }

          return {
            _id: group._id,
            title: group.courseId?.title || group.name,
            description: group.courseId?.description || "",
            groupName: group.name,
            groupCode: group.code,
            level: group.courseId?.level || "beginner",
            thumbnail: group.courseId?.thumbnail || "",
            progress: progressPercentage,
            totalSessions: totalCourseSessions,
            completedSessions: completedCourseSessions,
            remainingSessions,
            totalLessons,
            hoursLeft,
            status: "In Progress",
            gradient,
            icon,
          };
        })
    );

    // ✅ حساب إحصائيات التقدم الشاملة
    const totalAllSessions = await Session.countDocuments({
      groupId: { $in: groupIds },
      isDeleted: false
    });

    const completedAllSessions = await Session.countDocuments({
      groupId: { $in: groupIds },
      isDeleted: false,
      status: "completed"
    });

    const totalLessonsAcrossGroups = currentCourses.reduce((sum, course) =>
      sum + (course.totalLessons || 0), 0
    );

    const completedLessons = Math.floor((completedAllSessions / (totalAllSessions || 1)) * totalLessonsAcrossGroups) || 0;
    const totalHoursLearned = Math.round(completedAllSessions * 1.5);

    const achievements = [];
    if (attendanceRate >= 90) achievements.push("Perfect Attendance");
    if (completedAllSessions >= 10) achievements.push("10 Sessions Milestone");
    if (completedAllSessions >= 25) achievements.push("Quarter Century");
    if (completedAllSessions >= 50) achievements.push("Half Century");
    if (totalHoursLearned >= 50) achievements.push("50 Hours Badge");

    // ✅ [مُعدَّل] جلب الجلسة التالية – تعطي الأولوية لجلسة اليوم
    console.log("📅 [Dashboard API] Fetching next session...");
    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // 1️⃣ جرب تجيب جلسة اليوم
    let nextSession = await Session.findOne({
      groupId: { $in: groupIds },
      scheduledDate: { $gte: todayStart, $lte: todayEnd },
      isDeleted: false,
      status: "scheduled",
    })
      .populate("groupId", "name code")
      .select(
        "title scheduledDate startTime endTime status meetingLink recordingLink moduleIndex sessionNumber attendanceTaken meetingPlatform"
      )
      .sort({ startTime: 1 })
      .lean();

    // 2️⃣ لو مفيش جلسة اليوم، جيب أول جلسة مستقبلية
    if (!nextSession) {
      nextSession = await Session.findOne({
        groupId: { $in: groupIds },
        scheduledDate: { $gt: todayEnd },
        isDeleted: false,
        status: "scheduled",
      })
        .populate("groupId", "name code")
        .select(
          "title scheduledDate startTime endTime status meetingLink recordingLink moduleIndex sessionNumber attendanceTaken meetingPlatform"
        )
        .sort({ scheduledDate: 1, startTime: 1 })
        .lean();
    }

    // ✅ جلب الجلسات القادمة (للأحداث)
    console.log("📋 [Dashboard API] Fetching upcoming sessions...");
    const upcomingSessions = await Session.find({
      groupId: { $in: groupIds },
      scheduledDate: { $gte: todayStart },
      isDeleted: false,
      status: { $in: ["scheduled"] },
    })
      .populate("groupId", "name")
      .select(
        "title scheduledDate startTime endTime status meetingLink moduleIndex sessionNumber"
      )
      .sort({ scheduledDate: 1, startTime: 1 })
      .limit(10)
      .lean();

    // ✅ تحويل الجلسات لأحداث في Calendar
    const upcomingEvents = upcomingSessions.slice(0, 5).map(session => ({
      _id: session._id,
      title: session.title,
      date: session.scheduledDate,
      startTime: session.startTime,
      endTime: session.endTime,
      type: "session",
      groupName: session.groupId?.name || "مجموعة",
      color: "green",
      icon: "Calendar"
    }));

    // ✅ جلب الإشعارات
    console.log("🔔 [Dashboard API] Fetching notifications...");
    const notifications = await fetchNotifications(studentId);

    // ✅ إحصائيات إجمالية
    const totalStudents = await Student.countDocuments({
      "enrollmentInfo.status": "Active",
      isDeleted: false
    });

    const totalActiveCourses = await Course.countDocuments({
      isActive: true
    });

    const allCompletedSessions = await Session.countDocuments({
      status: "completed",
      attendanceTaken: true,
      isDeleted: false
    });

    const allSessionsCount = await Session.countDocuments({
      isDeleted: false
    });

    const systemCompletionRate = allSessionsCount > 0
      ? Math.round((allCompletedSessions / allSessionsCount) * 100)
      : 87;

    // ✅ تنسيق البيانات
    const response = {
      success: true,
      data: {
        user: {
          id: user.id,
          name: student.personalInfo?.fullName || user.name || "طالب",
          email: student.personalInfo?.email || user.email || "",
          role: user.role || "student",
        },
        stats: {
          totalSessions: totalSessionsWithAttendance,
          attendedSessions: attendedSessions,
          absentSessions: absentSessions,
          lateSessions: lateSessions,
          excusedSessions: excusedSessions,
          attendanceRate,
          totalGroups: groupIds.length,
          activeGroups: groups.filter((g) => g.status === "active").length,
          pendingAssignments: 0,
          completedCourses: groups.filter((g) => g.status === "completed").length,
        },
        systemStats: {
          totalStudents,
          totalActiveCourses,
          systemCompletionRate,
        },
        attendanceBreakdown: {
          attended: attendedSessions,
          absent: absentSessions,
          late: lateSessions,
          excused: excusedSessions,
          total: totalSessionsWithAttendance,
        },
        progressData: {
          stages: [
            {
              id: "start",
              label: "Start",
              percentage: 100,
              status: "completed",
              icon: "Play",
              color: "green",
              gradient: "from-green-400 to-emerald-500"
            },
            {
              id: "current",
              label: "Current Level",
              percentage: attendanceRate,
              status: "in_progress",
              icon: "BookOpen",
              color: "blue",
              gradient: "from-blue-400 to-cyan-500",
              isActive: true
            },
            {
              id: "target",
              label: "Next Target",
              percentage: Math.min(attendanceRate + 20, 100),
              status: "almost_there",
              icon: "Award",
              color: "purple",
              gradient: "from-purple-400 to-pink-500"
            },
            {
              id: "completion",
              label: "Completion",
              percentage: groups.filter(g => g.status === "completed").length > 0 ? 100 : 0,
              status: groups.filter(g => g.status === "completed").length > 0 ? "completed" : "pending",
              icon: "CheckCircle",
              color: "gray",
              gradient: "from-gray-400 to-slate-400"
            }
          ],
          statsCards: [
            {
              id: "completed_lessons",
              title: "Completed Lessons",
              value: completedLessons,
              icon: "CheckCircle",
              iconColor: "text-green-600 dark:text-green-400",
              bgColor: "bg-green-50 dark:bg-green-900/10",
              borderColor: "border-green-100 dark:border-green-900/30"
            },
            {
              id: "hours_learned",
              title: "Hours Learned",
              value: totalHoursLearned,
              icon: "Clock",
              iconColor: "text-blue-600 dark:text-blue-400",
              bgColor: "bg-blue-50 dark:bg-blue-900/10",
              borderColor: "border-blue-100 dark:border-blue-900/30"
            },
            {
              id: "achievements",
              title: "Achievements",
              value: achievements.length,
              icon: "Award",
              iconColor: "text-purple-600 dark:text-purple-400",
              bgColor: "bg-purple-50 dark:bg-purple-900/10",
              borderColor: "border-purple-100 dark:border-purple-900/30"
            }
          ]
        },
        nextSession: nextSession ? formatSession(nextSession) : null,
        groups: groups.map(formatGroup),
        sessions: upcomingSessions.map((s) => ({
          ...formatSession(s),
          groupName: s.groupId?.name,
        })),
        currentCourses,
        upcomingEvents,
        notifications,
      },
    };

    console.log("✅ [Dashboard API] Response ready");

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ [Dashboard API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في تحميل بيانات الداشبورد",
        error: error.message,
        code: "DASHBOARD_ERROR",
      },
      { status: 500 }
    );
  }
}

// ==================== الدوال المساعدة ====================

/**
 * ✅ تنسيق الوقت من "14:30" إلى "2:30 PM"
 */
function formatTime(timeStr) {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

/**
 * ✅ [مُعدَّل] تنسيق بيانات الجلسة مع إضافة date, time, isToday
 */
function formatSession(session) {
  const today = new Date();
  const sessionDate = new Date(session.scheduledDate);
  const sessionEndDateTime = new Date(`${sessionDate.toDateString()} ${session.endTime}`);

  // تاريخ مفهوم: "Feb 11, 2026"
  const formattedDate = sessionDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // وقت مفهوم: "10:00 AM - 11:30 AM"
  const formattedTime = `${formatTime(session.startTime)} - ${formatTime(session.endTime)}`;

  return {
    _id: session._id,
    title: session.title,
    scheduledDate: session.scheduledDate,
    startTime: session.startTime,
    endTime: session.endTime,
    date: formattedDate,
    time: formattedTime,
    status: session.status,
    meetingLink: session.meetingLink,
    recordingLink: session.recordingLink,
    moduleIndex: session.moduleIndex,
    sessionNumber: session.sessionNumber,
    attendanceTaken: session.attendanceTaken,
    attendance: session.attendance || [],
    meetingPlatform: session.meetingPlatform,
    isToday:
      sessionDate.toDateString() === today.toDateString() &&
      session.status === "scheduled" &&
      sessionEndDateTime > today,
    group: session.groupId
      ? {
          id: session.groupId._id,
          name: session.groupId.name,
          code: session.groupId.code,
        }
      : null,
  };
}

function formatGroup(group) {
  return {
    _id: group._id,
    name: group.name,
    code: group.code,
    status: group.status,
    currentStudentsCount: group.currentStudentsCount || 0,
    schedule: group.schedule,
    metadata: group.metadata || {},
    course: group.courseId ? {
      title: group.courseId.title,
      level: group.courseId.level,
      thumbnail: group.courseId.thumbnail,
    } : null,
  };
}

async function fetchNotifications(studentId) {
  try {
    const student = await Student.findById(studentId)
      .select("whatsappMessages sessionReminders")
      .lean();

    const notifications = [];

    if (student.whatsappMessages && student.whatsappMessages.length > 0) {
      student.whatsappMessages
        .filter((msg) => msg.status === "sent")
        .slice(0, 5)
        .forEach((msg) => {
          notifications.push({
            id: msg._id,
            type: "whatsapp",
            title: getWhatsAppMessageTitle(msg.messageType),
            message: msg.messageContent.substring(0, 100) + "...",
            date: msg.sentAt,
            icon: "MessageSquare",
          });
        });
    }

    if (student.sessionReminders && student.sessionReminders.length > 0) {
      student.sessionReminders
        .filter((reminder) => reminder.status === "sent")
        .slice(0, 5)
        .forEach((reminder) => {
          notifications.push({
            id: reminder._id,
            type: "reminder",
            title: "تذكير جلسة",
            message: reminder.message,
            date: reminder.sentAt,
            icon: "Bell",
          });
        });
    }

    return notifications.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}

function getWhatsAppMessageTitle(messageType) {
  const titles = {
    welcome: "رسالة ترحيب",
    session_reminder: "تذكير جلسة",
    absence_notification: "تنبيه غياب",
    session_cancelled: "إلغاء جلسة",
    session_postponed: "تأجيل جلسة",
    group_welcome: "ترحيب بالمجموعة",
  };
  return titles[messageType] || "رسالة واتساب";
}