// /app/api/student/dashboard/route.js
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
        { status: 401 },
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
        "_id personalInfo.fullName personalInfo.email academicInfo.groupIds academicInfo.currentCourses enrollmentInfo.status",
      )
      .lean();

    if (!student) {
      console.log(
        "⚠️ [Dashboard API] No student record found for user:",
        user.id,
      );
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
            lateSessions: 0,
            excusedSessions: 0,
            absentSessions: 0,
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
            statsCards: [],
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

    // ✅ حساب إحصائيات الحضور من جميع الجلسات
    console.log("📈 [Dashboard API] Calculating attendance stats...");

    const allSessions = await Session.find({
      groupId: { $in: groupIds },
      isDeleted: false,
    })
      .select("attendance attendanceTaken status")
      .lean();

    console.log(`📊 Found ${allSessions.length} total sessions`);

    const completedSessions = allSessions.filter(
      (s) => s.status === "completed",
    );
    const scheduledSessions = allSessions.filter(
      (s) => s.status === "scheduled",
    );

    const totalSessionsCount = allSessions.length;
    const completedSessionsCount = completedSessions.length;
    const remainingSessionsCount = scheduledSessions.length;

    console.log(
      `📊 Sessions breakdown: Total=${totalSessionsCount}, Completed=${completedSessionsCount}, Remaining=${remainingSessionsCount}`,
    );

    let attendedSessions = 0;
    let absentSessions = 0;
    let lateSessions = 0;
    let excusedSessions = 0;

    completedSessions.forEach((session) => {
      const attendanceRecord = session.attendance?.find(
        (a) => a.studentId.toString() === studentId.toString(),
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

    const completedWithAttendance =
      attendedSessions + lateSessions + excusedSessions;

    const progressPercentage =
      totalSessionsCount > 0
        ? Math.round((completedSessionsCount / totalSessionsCount) * 100)
        : 0;

    const attendanceRate =
      completedSessionsCount > 0
        ? Math.round(
            ((attendedSessions + lateSessions + excusedSessions) /
              completedSessionsCount) *
              100,
          )
        : 0;

    console.log("📊 Attendance breakdown:", {
      totalSessions: totalSessionsCount,
      completedSessions: completedSessionsCount,
      remainingSessions: remainingSessionsCount,
      attended: attendedSessions,
      absent: absentSessions,
      late: lateSessions,
      excused: excusedSessions,
      completedWithAttendance,
      progressPercentage: `${progressPercentage}%`,
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
        select: "title description level thumbnail curriculum duration",
      })
      .select(
        "name code status currentStudentsCount schedule metadata courseSnapshot",
      )
      .sort({ status: 1, "schedule.startDate": -1 })
      .lean();

    // ✅ حساب تقدم الدورات بشكل مفصّل
    console.log("📚 [Dashboard API] Calculating detailed course progress...");
    const currentCourses = await Promise.all(
      groups
        .filter((g) => g.status === "active")
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

          const progressPercentage =
            totalCourseSessions > 0
              ? Math.round(
                  (completedCourseSessions / totalCourseSessions) * 100,
                )
              : 0;

          const remainingSessions =
            totalCourseSessions - completedCourseSessions;
          const hoursLeft = remainingSessions * 2;

          let totalLessons = 0;
          if (group.courseId?.curriculum) {
            totalLessons = group.courseId.curriculum.reduce(
              (sum, module) => sum + (module.lessons?.length || 0),
              0,
            );
          }

          const courseTitle = (
            group.courseId?.title || group.name
          ).toLowerCase();
          let gradient, icon;

          if (
            courseTitle.includes("web") ||
            courseTitle.includes("html") ||
            courseTitle.includes("javascript")
          ) {
            gradient = "from-purple-500 to-indigo-600";
            icon = "code";
          } else if (
            courseTitle.includes("design") ||
            courseTitle.includes("ui") ||
            courseTitle.includes("ux")
          ) {
            gradient = "from-green-400 to-emerald-500";
            icon = "design";
          } else if (
            courseTitle.includes("data") ||
            courseTitle.includes("python")
          ) {
            gradient = "from-blue-500 to-cyan-500";
            icon = "database";
          } else if (
            courseTitle.includes("mobile") ||
            courseTitle.includes("app")
          ) {
            gradient = "from-pink-500 to-rose-600";
            icon = "smartphone";
          } else {
            gradient = "from-purple-500 to-indigo-600";
            icon = "code";
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
        }),
    );

    // ✅ الإنجازات بناءً على الجلسات المكتملة
    const achievements = [];
    if (attendanceRate >= 90) achievements.push("Perfect Attendance");
    if (completedSessionsCount >= 10)
      achievements.push("10 Sessions Milestone");
    if (completedSessionsCount >= 25)
      achievements.push("25 Sessions Milestone");
    if (completedSessionsCount >= 50)
      achievements.push("50 Sessions Milestone");
    if (completedSessionsCount >= 100)
      achievements.push("100 Sessions Milestone");

    const hoursLearned = completedSessionsCount * 2;

    // ✅ جلب الجلسة التالية
    console.log("📅 [Dashboard API] Fetching next session...");
    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    let nextSession = await Session.findOne({
      groupId: { $in: groupIds },
      scheduledDate: { $gte: todayStart, $lte: todayEnd },
      isDeleted: false,
      status: "scheduled",
    })
      .populate("groupId", "name code")
      .select(
        "title scheduledDate startTime endTime status meetingLink recordingLink moduleIndex sessionNumber attendanceTaken meetingPlatform",
      )
      .sort({ startTime: 1 })
      .lean();

    if (!nextSession) {
      nextSession = await Session.findOne({
        groupId: { $in: groupIds },
        scheduledDate: { $gt: todayEnd },
        isDeleted: false,
        status: "scheduled",
      })
        .populate("groupId", "name code")
        .select(
          "title scheduledDate startTime endTime status meetingLink recordingLink moduleIndex sessionNumber attendanceTaken meetingPlatform",
        )
        .sort({ scheduledDate: 1, startTime: 1 })
        .lean();
    }

    // ✅ جلب الجلسات القادمة
    console.log("📋 [Dashboard API] Fetching upcoming sessions...");
    const upcomingSessions = await Session.find({
      groupId: { $in: groupIds },
      scheduledDate: { $gte: todayStart },
      isDeleted: false,
      status: { $in: ["scheduled"] },
    })
      .populate("groupId", "name")
      .select(
        "title scheduledDate startTime endTime status meetingLink moduleIndex sessionNumber",
      )
      .sort({ scheduledDate: 1, startTime: 1 })
      .limit(10)
      .lean();

    const upcomingEvents = upcomingSessions.slice(0, 5).map((session) => {
      const sessionDate = new Date(session.scheduledDate);
      const formattedDate = sessionDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      return {
        _id: session._id,
        title: session.title,
        date: session.scheduledDate,
        formattedDate: formattedDate,
        startTime: session.startTime,
        endTime: session.endTime,
        type: "session",
        groupName: session.groupId?.name || "مجموعة",
        color: "green",
        icon: "Calendar",
      };
    });

    // ✅ جلب الإشعارات
    console.log("🔔 [Dashboard API] Fetching notifications...");
    const notifications = await fetchNotifications(studentId);

    // ✅ إحصائيات إجمالية
    const totalStudents = await Student.countDocuments({
      "enrollmentInfo.status": "Active",
      isDeleted: false,
    });

    const totalActiveCourses = await Course.countDocuments({
      isActive: true,
    });

    const allCompletedSessions = await Session.countDocuments({
      status: "completed",
      attendanceTaken: true,
      isDeleted: false,
    });

    const allSessionsCount = await Session.countDocuments({
      isDeleted: false,
    });

    const systemCompletionRate =
      allSessionsCount > 0
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
          totalSessions: totalSessionsCount,
          completedSessions: completedSessionsCount,
          remainingSessions: remainingSessionsCount,
          attendedSessions: attendedSessions,
          absentSessions: absentSessions,
          lateSessions: lateSessions,
          excusedSessions: excusedSessions,
          attendanceRate,
          progressPercentage,
          totalGroups: groupIds.length,
          activeGroups: groups.filter((g) => g.status === "active").length,
          pendingAssignments: 0,
          completedCourses: groups.filter((g) => g.status === "completed")
            .length,
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
          completed: completedSessionsCount,
          total: totalSessionsCount,
        },
        progressData: {
          stages: [
            {
              id: "start",
              label: "Start",
              labelAr: "البداية",
              percentage: 100,
              status: "completed",
              icon: "Play",
              color: "green",
              gradient: "from-green-400 to-emerald-500",
            },
            {
              id: "current",
              label: "Current Level",
              labelAr: "المستوى الحالي",
              percentage: progressPercentage,
              status:
                progressPercentage >= 100
                  ? "completed"
                  : progressPercentage >= 80
                    ? "almost_there"
                    : "active",
              icon: "BookOpen",
              color: "blue",
              gradient: "from-blue-400 to-cyan-500",
              isActive: progressPercentage < 100,
            },
            {
              id: "target",
              label: "Next Target",
              labelAr: "الهدف التالي",
              percentage: Math.min(progressPercentage + 25, 100),
              status: progressPercentage >= 75 ? "almost_there" : "pending",
              icon: "Award",
              color: "purple",
              gradient: "from-purple-400 to-pink-500",
            },
            {
              id: "completion",
              label: "Completion",
              labelAr: "الإكمال",
              percentage: progressPercentage >= 100 ? 100 : 0,
              status: progressPercentage >= 100 ? "completed" : "pending",
              icon: "CheckCircle",
              color: "gray",
              gradient: "from-gray-400 to-slate-400",
            },
          ],
          statsCards: [
            {
              id: "attended_sessions",
              title: "Attended",
              titleAr: "حضور",
              value: attendedSessions,
              icon: "CheckCircle",
              iconColor: "text-green-600 dark:text-green-400",
              bgColor: "bg-green-50 dark:bg-green-900/10",
              borderColor: "border-green-100 dark:border-green-900/30",
            },
            {
              id: "absent_sessions",
              title: "Absent",
              titleAr: "غياب",
              value: absentSessions,
              icon: "X",
              iconColor: "text-red-600 dark:text-red-400",
              bgColor: "bg-red-50 dark:bg-red-900/10",
              borderColor: "border-red-100 dark:border-red-900/30",
            },
            {
              id: "late_sessions",
              title: "Late",
              titleAr: "متأخر",
              value: lateSessions,
              icon: "Clock",
              iconColor: "text-yellow-600 dark:text-yellow-400",
              bgColor: "bg-yellow-50 dark:bg-yellow-900/10",
              borderColor: "border-yellow-100 dark:border-yellow-900/30",
            },
          ],
          summaryCards: [
            {
              id: "completed_sessions",
              title: "Completed Sessions",
              titleAr: "الجلسات المكتملة",
              value: completedSessionsCount,
              icon: "CheckCircle",
              iconColor: "text-green-600 dark:text-green-400",
              bgColor: "bg-green-50 dark:bg-green-900/10",
              borderColor: "border-green-100 dark:border-green-900/30",
            },
            {
              id: "hours_learned",
              title: "Hours Learned",
              titleAr: "ساعات التعلم",
              value: hoursLearned,
              icon: "Clock",
              iconColor: "text-blue-600 dark:text-blue-400",
              bgColor: "bg-blue-50 dark:bg-blue-900/10",
              borderColor: "border-blue-100 dark:border-blue-900/30",
            },
            {
              id: "achievements",
              title: "Achievements",
              titleAr: "الإنجازات",
              value: achievements.length,
              icon: "Award",
              iconColor: "text-purple-600 dark:text-purple-400",
              bgColor: "bg-purple-50 dark:bg-purple-900/10",
              borderColor: "border-purple-100 dark:border-purple-900/30",
            },
          ],
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
    console.log("📊 Final Stats:", {
      totalSessions: totalSessionsCount,
      completedSessions: completedSessionsCount,
      progress: `${progressPercentage}%`,
      attended: attendedSessions,
      absent: absentSessions,
      late: lateSessions,
    });

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
      { status: 500 },
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
 * ✅ تنسيق بيانات الجلسة
 */
function formatSession(session) {
  const today = new Date();
  const sessionDate = new Date(session.scheduledDate);
  const sessionEndDateTime = new Date(
    `${sessionDate.toDateString()} ${session.endTime}`,
  );

  const formattedDate = sessionDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

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
    course: group.courseId
      ? {
          title: group.courseId.title,
          level: group.courseId.level,
          thumbnail: group.courseId.thumbnail,
        }
      : null,
  };
}

/**
 * ✅ رتّب بالأحدث الأول، استبعد رسائل الجارديان،
 * واستبعد أي إشعار الطالب شافه بالفعل (ids أو قبل seenAt)
 */
async function fetchNotifications(studentId) {
  try {
    const student = await Student.findById(studentId)
      .select("whatsappMessages sessionReminders notificationsSeen")
      .lean();

    if (!student) return [];

    const seenIds = new Set((student.notificationsSeen?.ids || []).map(String));
    const seenAt = student.notificationsSeen?.seenAt
      ? new Date(student.notificationsSeen.seenAt).getTime()
      : 0;

    // مقروء لو الـ id متسجل، أو لو وقته قبل/يساوي "عرض كل الإشعارات"
    const isUnseen = (id, date) => {
      if (id && seenIds.has(String(id))) return false;
      if (seenAt && date && new Date(date).getTime() <= seenAt) return false;
      return true;
    };

    const notifications = [];

    // ── WhatsApp messages ──
    if (student.whatsappMessages?.length) {
      [...student.whatsappMessages]
        .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
        .filter((msg) => msg.status === "sent")
        .filter((msg) => {
          // استبعد رسائل الجارديان عشان الهيدر يبقى متوافق مع صفحة الرسائل
          if (msg.messageType?.includes("guardian")) return false;
          if (msg.metadata?.recipientType === "guardian") return false;
          return true;
        })
        .filter((msg) => isUnseen(msg._id, msg.sentAt))
        .slice(0, 5)
        .forEach((msg) => {
          notifications.push({
            id: String(msg._id),
            type: "whatsapp",
            title: getWhatsAppMessageTitle(msg.messageType),
            titleAr: getWhatsAppMessageTitleAr(msg.messageType),
            message: (msg.messageContent || "").substring(0, 100) + "...",
            date: msg.sentAt,
            time: formatRelativeTime(msg.sentAt),
            icon: "MessageSquare",
          });
        });
    }

    // ── Session reminders ──
    if (student.sessionReminders?.length) {
      [...student.sessionReminders]
        .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
        .filter((reminder) => reminder.status === "sent")
        .filter((reminder) => isUnseen(reminder._id, reminder.sentAt))
        .slice(0, 5)
        .forEach((reminder) => {
          notifications.push({
            id: String(reminder._id),
            type: "reminder",
            title: "Session Reminder",
            titleAr: "تذكير جلسة",
            message: reminder.message,
            date: reminder.sentAt,
            time: formatRelativeTime(reminder.sentAt),
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

function formatRelativeTime(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour ago`;
  if (diffDays < 7) return `${diffDays} day ago`;
  return new Date(date).toLocaleDateString();
}

function getWhatsAppMessageTitle(messageType) {
  const titles = {
    welcome: "Welcome Message",
    student_welcome: "Welcome Message",
    session_reminder: "Session Reminder",
    session_reminder_student: "Session Reminder",
    reminder_24h_student: "24h Reminder",
    reminder_1h_student: "1h Reminder",
    reminder_15min_student: "15min Reminder",
    absence_notification: "Absence Alert",
    late_notification: "Late Alert",
    excused_notification: "Excused Notification",
    session_cancelled: "Session Cancelled",
    session_cancelled_student: "Session Cancelled",
    session_postponed: "Session Postponed",
    session_postponed_student: "Session Postponed",
    session_recording: "Session Recording",
    group_welcome: "Group Welcome",
    group_welcome_student: "Group Welcome",
    group_completion: "Course Completed",
    group_completion_student: "Course Completed",
    module_overview: "Module Overview",
    evaluation_pass: "Evaluation Passed",
    evaluation_review: "Evaluation Review",
    evaluation_repeat: "Evaluation Repeat",
    credit_alert: "Credit Alert",
    credit_exhausted: "Credit Exhausted",
    credit_low_balance_4h_student: "Low Balance",
    credit_low_balance_2h_student: "Low Balance",
    makeup_session_student: "Makeup Session",
    makeup_session_student_offline: "Makeup Session",
  };
  return titles[messageType] || "Notification";
}

function getWhatsAppMessageTitleAr(messageType) {
  const titles = {
    welcome: "رسالة ترحيب",
    student_welcome: "رسالة ترحيب",
    session_reminder: "تذكير جلسة",
    session_reminder_student: "تذكير جلسة",
    reminder_24h_student: "تذكير قبل 24 ساعة",
    reminder_1h_student: "تذكير قبل ساعة",
    reminder_15min_student: "تذكير قبل 15 دقيقة",
    absence_notification: "تنبيه غياب",
    late_notification: "تنبيه تأخر",
    excused_notification: "إشعار غياب مبرر",
    session_cancelled: "إلغاء جلسة",
    session_cancelled_student: "إلغاء جلسة",
    session_postponed: "تأجيل جلسة",
    session_postponed_student: "تأجيل جلسة",
    session_recording: "تسجيل الجلسة",
    group_welcome: "ترحيب بالمجموعة",
    group_welcome_student: "ترحيب بالمجموعة",
    group_completion: "إكمال الدورة",
    group_completion_student: "إكمال الدورة",
    module_overview: "نظرة عامة على الوحدة",
    evaluation_pass: "تقييم - ناجح",
    evaluation_review: "تقييم - مراجعة",
    evaluation_repeat: "تقييم - إعادة",
    credit_alert: "تنبيه رصيد",
    credit_exhausted: "نفاد الرصيد",
    credit_low_balance_4h_student: "رصيد منخفض",
    credit_low_balance_2h_student: "رصيد منخفض جداً",
    makeup_session_student: "حصة تعويضية",
    makeup_session_student_offline: "حصة تعويضية",
  };
  return titles[messageType] || "إشعار";
}
