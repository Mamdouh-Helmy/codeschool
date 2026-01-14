import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Student from "../../../models/Student";
import Session from "../../../models/Session";
import Group from "../../../models/Group";

export async function GET(req) {
  try {
    console.log("📊 [Dashboard API] Request received");

    // الحصول على المستخدم من التوكن
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

    // الحصول على بيانات الطالب المرتبطة بـ User
    const student = await Student.findOne({ authUserId: user.id })
      .select(
        "_id personalInfo.fullName personalInfo.email academicInfo.groupIds enrollmentInfo.status"
      )
      .lean();

    // إذا لم يكن هناك طالب مرتبط، نرجع بيانات افتراضية
    if (!student) {
      console.log(
        "⚠️ [Dashboard API] No student record found for user:",
        user.id
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
            attendanceRate: 0,
            totalGroups: 0,
            activeGroups: 0,
            pendingAssignments: 0,
            completedCourses: 0,
          },
          nextSession: null,
          groups: [],
          sessions: [],
          notifications: [],
        },
      });
    }

    console.log("✅ [Dashboard API] Student found:", student._id);

    const studentId = student._id;
    const groupIds = student.academicInfo?.groupIds || [];

    // حساب إحصائيات الحضور - ✅ التصحيح الدقيق
    console.log("📈 [Dashboard API] Calculating attendance stats...");
    
    // ✅ نجلب فقط الجلسات المكتملة واتخذ فيها الحضور فعلاً
    const completedSessionsWithAttendance = await Session.find({
      groupId: { $in: groupIds },
      isDeleted: false,
      status: "completed", // ✅ فقط الجلسات المكتملة
      attendanceTaken: true // ✅ فقط الجلسات اللي اتعمل فيها أخذ حضور
    })
      .select("attendance attendanceTaken")
      .lean();

    console.log(`📊 [Dashboard API] Found ${completedSessionsWithAttendance.length} completed sessions with attendance`);

    // ✅ نبص على كل جلسة مكتملة واتخذ فيها حضور
    let attendedSessions = 0;
    let absentSessions = 0;
    let lateSessions = 0;
    let excusedSessions = 0;
    let totalSessionsWithAttendance = completedSessionsWithAttendance.length;

    completedSessionsWithAttendance.forEach((session) => {
      // ✅ نبحث عن سجل حضور الطالب في هذه الجلسة
      const attendanceRecord = session.attendance?.find(
        (a) => a.studentId.toString() === studentId.toString()
      );

      // ✅ حسب حالة الحضور
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
            // حالة غير معروفة، نحسبها غياب
            absentSessions++;
        }
      } else {
        // ✅ إذا مفيش سجل حضور للطالب في الجلسة، يبقى غائب
        absentSessions++;
      }
    });

    // ✅ نسبة الحضور = (الحضور + متأخر + معذور) ÷ إجمالي الجلسات اللي اتعمل فيها حضور
    const attendanceRate = totalSessionsWithAttendance > 0
      ? Math.round(((attendedSessions + lateSessions + excusedSessions) / totalSessionsWithAttendance) * 100)
      : 0;

    console.log("📊 [Dashboard API] Attendance breakdown:", {
      totalSessionsWithAttendance,
      attended: attendedSessions,
      absent: absentSessions,
      late: lateSessions,
      excused: excusedSessions,
      attendanceRate: `${attendanceRate}%`,
      calculation: `(${attendedSessions}+${lateSessions}+${excusedSessions})/${totalSessionsWithAttendance}`
    });

    // جلب الجلسة التالية
    console.log("📅 [Dashboard API] Fetching next session...");
    const now = new Date();
    const nextSession = await Session.findOne({
      groupId: { $in: groupIds },
      scheduledDate: { $gte: now },
      isDeleted: false,
      status: "scheduled",
    })
      .populate("groupId", "name code")
      .select(
        "title scheduledDate startTime endTime status meetingLink recordingLink moduleIndex sessionNumber attendanceTaken"
      )
      .sort({ scheduledDate: 1, startTime: 1 })
      .lean();

    // جلب المجموعات
    console.log("👥 [Dashboard API] Fetching groups...");
    const groups = await Group.find({
      _id: { $in: groupIds },
      isDeleted: false,
      status: { $in: ["active", "completed"] },
    })
      .select("name code status currentStudentsCount schedule metadata")
      .sort({ status: 1, "metadata.createdAt": -1 })
      .limit(5)
      .lean();

    // جلب الجلسات القادمة
    console.log("📋 [Dashboard API] Fetching upcoming sessions...");
    const upcomingSessions = await Session.find({
      groupId: { $in: groupIds },
      scheduledDate: { $gte: now },
      isDeleted: false,
      status: { $in: ["scheduled"] },
    })
      .populate("groupId", "name")
      .select(
        "title scheduledDate startTime endTime status meetingLink moduleIndex sessionNumber attendanceTaken"
      )
      .sort({ scheduledDate: 1, startTime: 1 })
      .limit(5)
      .lean();

    // جلب الجلسات المكتملة حديثاً (آخر 5 جلسات)
    console.log("✅ [Dashboard API] Fetching recent completed sessions...");
    const recentCompletedSessions = await Session.find({
      groupId: { $in: groupIds },
      isDeleted: false,
      status: "completed",
      attendanceTaken: true
    })
      .populate("groupId", "name")
      .select("title scheduledDate startTime endTime status attendance attendanceTaken")
      .sort({ scheduledDate: -1 })
      .limit(5)
      .lean();

    // ✅ إضافة تفاصيل الحضور لكل جلسة مكتملة
    const formattedRecentSessions = recentCompletedSessions.map(session => {
      const studentAttendance = session.attendance?.find(
        a => a.studentId.toString() === studentId.toString()
      );
      
      return {
        _id: session._id,
        title: session.title,
        scheduledDate: session.scheduledDate,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        attendanceTaken: session.attendanceTaken,
        attendanceStatus: studentAttendance?.status || "absent",
        attendanceNotes: studentAttendance?.notes || "",
        groupName: session.groupId?.name || "غير محدد"
      };
    });

    // جلب الإشعارات
    console.log("🔔 [Dashboard API] Fetching notifications...");
    const notifications = await fetchNotifications(studentId);

    // تنسيق البيانات
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
        attendanceBreakdown: {
          attended: attendedSessions,
          absent: absentSessions,
          late: lateSessions,
          excused: excusedSessions,
          total: totalSessionsWithAttendance,
          formula: "نسبة الحضور = (حاضر + متأخر + معذور) ÷ إجمالي الجلسات المكتملة"
        },
        nextSession: nextSession ? formatSession(nextSession) : null,
        groups: groups.map(formatGroup),
        sessions: upcomingSessions.map((s) => ({
          ...formatSession(s),
          groupName: s.groupId?.name,
        })),
        recentCompletedSessions: formattedRecentSessions,
        notifications,
      },
    };

    console.log("✅ [Dashboard API] Response ready, stats:", {
      attendanceRate: `${response.data.stats.attendanceRate}%`,
      attended: response.data.stats.attendedSessions,
      absent: response.data.stats.absentSessions,
      totalSessions: response.data.stats.totalSessions,
      groups: response.data.groups.length,
      upcomingSessions: response.data.sessions.length,
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
      { status: 500 }
    );
  }
}

// دالة مساعدة لجلب الإشعارات
async function fetchNotifications(studentId) {
  try {
    const student = await Student.findById(studentId)
      .select("whatsappMessages sessionReminders")
      .lean();

    const notifications = [];

    // إشعارات واتساب
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

    // إشعارات تذكير الجلسات
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

function formatSession(session) {
  return {
    _id: session._id,
    title: session.title,
    scheduledDate: session.scheduledDate,
    startTime: session.startTime,
    endTime: session.endTime,
    status: session.status,
    meetingLink: session.meetingLink,
    recordingLink: session.recordingLink,
    moduleIndex: session.moduleIndex,
    sessionNumber: session.sessionNumber,
    attendanceTaken: session.attendanceTaken,
    attendance: session.attendance || [],
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
  };
}