// app/api/instructor/dashboard/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import User from "../../../models/User";
import Group from "../../../models/Group";
import Session from "../../../models/Session";
import Course from "../../../models/Course";

export async function GET(req) {
  try {
    console.log("📊 [Instructor Dashboard API] Request received");

    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "غير مصرح بالوصول", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    if (user.role !== "instructor" && user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "هذه الصفحة للمدرسين فقط", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    await connectDB();

    // ── Fetch groups where this instructor is assigned ──
    const groups = await Group.find({
      "instructors.userId": user.id,
      isDeleted: false,
      status: { $in: ["active", "completed", "draft"] },
    })
      .populate({
        path: "courseId",
        select: "title description level thumbnail curriculum",
      })
      .populate({
        path: "instructors.userId",
        select: "name email gender image",
      })
      .select(
        "name code status currentStudentsCount maxStudents schedule instructors courseSnapshot courseId metadata students"
      )
      .sort({ status: 1, updatedAt: -1 })
      .lean();

    console.log(`✅ Found ${groups.length} groups for instructor ${user.id}`);

    const groupIds = groups.map((g) => g._id);

    // ── Sessions (with actual start/end time for real duration calculation) ──
    // ✅ ضفنا actualStartTime/actualEndTime عشان نحسب مدة كل سيشن الفعلية بالدقيقة
    const allSessions = await Session.find({
      groupId: { $in: groupIds },
      isDeleted: false,
    })
      .select(
        "status attendanceTaken attendance scheduledDate startTime endTime actualStartTime actualEndTime title groupId moduleIndex sessionNumber"
      )
      .lean();

    const completedSessions = allSessions.filter((s) => s.status === "completed");
    const scheduledSessions = allSessions.filter((s) => s.status === "scheduled");
    const cancelledSessions = allSessions.filter((s) => s.status === "cancelled");
    const postponedSessions = allSessions.filter((s) => s.status === "postponed");

    const totalSessionsCount = allSessions.length;
    const completedSessionsCount = completedSessions.length;
    const scheduledSessionsCount = scheduledSessions.length;

    // ── Total teaching time = مجموع مدة كل سيشن مكتملة بالدقيقة الفعلية ──
    // ✅ بنحسبها من الـ Session مباشرة (مش من countTime المتراكم في الجروب)،
    // عشان لو سيشن اتعدلت بعد ما اتقفلت، الرقم يفضل مطابق للواقع دايمًا.
    // بتفضّل actualStartTime/actualEndTime لو موجودين، وبترجع لـ startTime/endTime
    // المجدولة لو مفيش وقت فعلي متسجل.
    //
    // 🆕 دلوقتي بنفضل شغالين بالدقيقة الصحيحة (integer) لحد آخر لحظة، وبنبعتها
    // زي ما هي للفرونت اند (totalTeachingMinutes / myTeachingMinutes) عشان
    // تتعرض "ساعة ودقيقة" بدل ساعة عشرية (زي 3.5) اللي مش دقيقة فعليًا.
    // بنسيب totalTeachingHours / myTeachingHours (decimal) موجودين برضو
    // للتوافق مع أي صفحة تانية (زي /instructor/reports) بتستخدمهم.
    let totalTeachingMinutes = 0;
    const minutesByGroup = {};

    completedSessions.forEach((session) => {
      const minutes = getSessionDurationMinutes(session);
      totalTeachingMinutes += minutes;

      const gId = session.groupId.toString();
      minutesByGroup[gId] = (minutesByGroup[gId] || 0) + minutes;
    });

    totalTeachingMinutes = Math.round(totalTeachingMinutes);
    const totalTeachingHours = Math.round((totalTeachingMinutes / 60) * 100) / 100;

    // ── Attendance analytics ──
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalExcused = 0;
    let totalStudentAttendanceRecords = 0;

    completedSessions.forEach((session) => {
      if (session.attendance && session.attendance.length > 0) {
        session.attendance.forEach((record) => {
          totalStudentAttendanceRecords++;
          switch (record.status) {
            case "present": totalPresent++; break;
            case "absent": totalAbsent++; break;
            case "late": totalLate++; break;
            case "excused": totalExcused++; break;
          }
        });
      }
    });

    const overallAttendanceRate =
      totalStudentAttendanceRecords > 0
        ? Math.round(((totalPresent + totalLate + totalExcused) / totalStudentAttendanceRecords) * 100)
        : 0;

    // ── Total unique students across all groups ──
    // نستخدم students array لو موجود، وإلا نستخدم currentStudentsCount كـ fallback
    const uniqueStudentIds = new Set();
    let totalStudentsFromCount = 0;
    groups.forEach((g) => {
      if (g.students && g.students.length > 0) {
        g.students.forEach((s) => uniqueStudentIds.add(s.toString()));
      } else {
        // fallback: students array فارغة لكن currentStudentsCount موجود
        totalStudentsFromCount += g.currentStudentsCount || 0;
      }
    });
    const totalStudents = uniqueStudentIds.size > 0
      ? uniqueStudentIds.size
      : totalStudentsFromCount;

    // ── Next upcoming session ──
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
      .select("title scheduledDate startTime endTime status meetingLink groupId moduleIndex sessionNumber")
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
        .select("title scheduledDate startTime endTime status meetingLink groupId moduleIndex sessionNumber")
        .sort({ scheduledDate: 1, startTime: 1 })
        .lean();
    }

    // ── Upcoming sessions (next 10) ──
    const upcomingSessions = await Session.find({
      groupId: { $in: groupIds },
      scheduledDate: { $gte: todayStart },
      isDeleted: false,
      status: "scheduled",
    })
      .populate("groupId", "name")
      .select("title scheduledDate startTime endTime status meetingLink groupId moduleIndex sessionNumber")
      .sort({ scheduledDate: 1, startTime: 1 })
      .limit(10)
      .lean();

    // ── Recent completed sessions (last 5) ──
    const recentSessions = await Session.find({
      groupId: { $in: groupIds },
      status: "completed",
      isDeleted: false,
    })
      .populate("groupId", "name")
      .select("title scheduledDate startTime endTime attendance groupId moduleIndex sessionNumber")
      .sort({ scheduledDate: -1 })
      .limit(5)
      .lean();

    // ── Per-group progress ──
    const groupsProgress = await Promise.all(
      groups
        .filter((g) => g.status === "active")
        .map(async (group) => {
          const groupSessions = allSessions.filter(
            (s) => s.groupId.toString() === group._id.toString()
          );
          const groupCompleted = groupSessions.filter((s) => s.status === "completed").length;
          const groupTotal = groupSessions.length;
          const progress = groupTotal > 0 ? Math.round((groupCompleted / groupTotal) * 100) : 0;

          // ✅ ساعات المدرس في الجروب ده = مجموع مدة السيشنات المكتملة الفعلية
          // بالدقيقة (نفس مصدر totalTeachingHours)، مش countTime المتراكم
          const groupMinutes = Math.round(minutesByGroup[group._id.toString()] || 0);
          const myTeachingHours = Math.round((groupMinutes / 60) * 100) / 100;

          return {
            _id: group._id,
            name: group.name,
            code: group.code,
            status: group.status,
            courseTitle: group.courseId?.title || group.courseSnapshot?.title || group.name,
            courseLevel: group.courseId?.level || "beginner",
            courseThumbnail: group.courseId?.thumbnail || "",
            currentStudentsCount: group.currentStudentsCount || 0,
            maxStudents: group.maxStudents || 25,
            schedule: group.schedule,
            totalSessions: groupTotal,
            completedSessions: groupCompleted,
            remainingSessions: groupTotal - groupCompleted,
            progress,
            // 🆕 الدقايق الخام — المصدر الوحيد اللي الفرونت اند هيعرض منه
            // "ساعة ودقيقة" بشكل دقيق
            myTeachingMinutes: groupMinutes,
            // decimal — لسه موجود للتوافق مع أي كود قديم
            myTeachingHours,
          };
        })
    );

    // ── Upcoming events for calendar ──
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
        formattedDate,
        startTime: session.startTime,
        endTime: session.endTime,
        type: "session",
        groupName: session.groupId?.name || "مجموعة",
        color: "green",
        icon: "Calendar",
      };
    });

    // ── Progress stages ──
    const progressPercentage =
      totalSessionsCount > 0
        ? Math.round((completedSessionsCount / totalSessionsCount) * 100)
        : 0;

    const progressStages = [
      {
        id: "start",
        label: "Started",
        labelAr: "البداية",
        percentage: 100,
        status: "completed",
        icon: "Play",
        color: "green",
        gradient: "from-green-400 to-emerald-500",
      },
      {
        id: "current",
        label: "In Progress",
        labelAr: "جارٍ التدريس",
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
        label: "Next Milestone",
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
    ];

    const response = {
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name || "مدرس",
          email: user.email || "",
          role: user.role,
        },
        stats: {
          // 🆕 الدقايق الخام لإجمالي ساعات التدريس — المصدر اللي الفرونت اند
          // هيبني منه عرض "Xh Ym" / "Xس Yد" بدقة كاملة
          totalTeachingMinutes,
          // decimal — لسه موجود للتوافق
          totalTeachingHours,
          totalGroups: groups.length,
          activeGroups: groups.filter((g) => g.status === "active").length,
          completedGroups: groups.filter((g) => g.status === "completed").length,
          totalStudents,
          totalSessions: totalSessionsCount,
          completedSessions: completedSessionsCount,
          scheduledSessions: scheduledSessionsCount,
          cancelledSessions: cancelledSessions.length,
          postponedSessions: postponedSessions.length,
          overallAttendanceRate,
          progressPercentage,
          totalPresent,
          totalAbsent,
          totalLate,
          totalExcused,
        },
        progressData: {
          stages: progressStages,
          summaryCards: [
            {
              id: "teaching_hours",
              title: "Teaching Hours",
              titleAr: "ساعات التدريس",
              // 🆕 value هنا بيفضل عشان أي كود قديم، لكن الفرونت اند دلوقتي
              // بيبني القيمة المعروضة (ساعة:دقيقة) بنفسه من stats.totalTeachingMinutes
              value: totalTeachingHours,
              icon: "Clock",
              iconColor: "text-blue-600 dark:text-blue-400",
              bgColor: "bg-blue-50 dark:bg-blue-900/10",
              borderColor: "border-blue-100 dark:border-blue-900/30",
            },
            {
              id: "sessions_completed",
              title: "Sessions Done",
              titleAr: "جلسات مكتملة",
              value: completedSessionsCount,
              icon: "CheckCircle",
              iconColor: "text-green-600 dark:text-green-400",
              bgColor: "bg-green-50 dark:bg-green-900/10",
              borderColor: "border-green-100 dark:border-green-900/30",
            },
            {
              id: "completion_rate",
              title: "Completion Rate",
              titleAr: "نسبة الإكمال",
              value: `${progressPercentage}%`,
              icon: "BarChart3",
              iconColor: "text-purple-600 dark:text-purple-400",
              bgColor: "bg-purple-50 dark:bg-purple-900/10",
              borderColor: "border-purple-100 dark:border-purple-900/30",
            },
          ],
        },
        nextSession: nextSession ? formatSession(nextSession) : null,
        currentGroups: groupsProgress,
        upcomingEvents,
        recentSessions: recentSessions.map((s) => ({
          ...formatSession(s),
          groupName: s.groupId?.name,
          presentCount: s.attendance?.filter((a) => a.status === "present").length || 0,
          absentCount: s.attendance?.filter((a) => a.status === "absent").length || 0,
          totalAttendance: s.attendance?.length || 0,
        })),
      },
    };

    console.log("✅ [Instructor Dashboard API] Response ready");
    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ [Instructor Dashboard API] Error:", error);
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

// ── Helpers ──

function formatTime(timeStr) {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

// ✅ بيحول "HH:mm" لعدد دقايق من نص الليل
function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

// ✅ مدة السيشن الفعلية بالدقيقة — بيفضّل actualStartTime/actualEndTime (لو
// السيشن اتسجل لها وقت فعلي مختلف عن المجدول بعد التعديل) وبيرجع لـ
// startTime/endTime المجدولة لو مفيش وقت فعلي متسجل
function getSessionDurationMinutes(session) {
  const start = timeToMinutes(session.actualStartTime) ?? timeToMinutes(session.startTime);
  const end   = timeToMinutes(session.actualEndTime)   ?? timeToMinutes(session.endTime);

  if (start === null || end === null) return 0;

  let diff = end - start;
  if (diff < 0) diff += 24 * 60; // احتياط لو السيشن عدّت نص الليل
  return diff;
}

function formatSession(session) {
  const today = new Date();
  const sessionDate = new Date(session.scheduledDate);

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
    moduleIndex: session.moduleIndex,
    sessionNumber: session.sessionNumber,
    attendanceTaken: session.attendanceTaken,
    isToday:
      sessionDate.toDateString() === today.toDateString() &&
      session.status === "scheduled",
    group: session.groupId
      ? { id: session.groupId._id, name: session.groupId.name, code: session.groupId.code }
      : null,
  };
}