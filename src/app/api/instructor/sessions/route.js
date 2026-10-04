// src/app/api/instructor/sessions/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Group from "../../../models/Group";
import Session from "../../../models/Session";
import Interview from "../../../models/Interview";
// ✅ FIX: لازم الموديل يتعمله import عشان يتسجّل في Mongoose قبل الـ populate
//    (كان بيطلع MissingSchemaError: Schema hasn't been registered for model "Student")
import Student from "../../../models/Student";
import MeetingLink from "../../../models/MeetingLink";
import { isSessionLockedByHold } from "../../../services/holdGuard";


// ═══════════════════════════════════════════════════════════════════════════
// ✅ HOLD HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function sortSessionsForHold(sessions) {
  return [...sessions].sort((a, b) => {
    if (a.moduleIndex !== b.moduleIndex) return a.moduleIndex - b.moduleIndex;
    if (a.sessionNumber !== b.sessionNumber) return a.sessionNumber - b.sessionNumber;
    return new Date(a.scheduledDate) - new Date(b.scheduledDate);
  });
}


// ═══════════════════════════════════════════════════════════════════════════
// ✅ INTERVIEWS
// ─────────────────────────────────────────────────────────────────────────
// المقابلات مفيهاش تسجيل حضور — المدرس بيروح للتقييم على طول.
//   - طفل  → التقييم بيروح لولي الأمر (recipientType: "guardian")
//   - بالغ → التقييم بيروح للطالب نفسه (recipientType: "student")
// ═══════════════════════════════════════════════════════════════════════════

async function loadInterviewItems(user, statusFilter) {
  const query = { instructorId: user.id };
  if (statusFilter && statusFilter !== "all") query.status = statusFilter;

  // isDeleted:false بيتضاف تلقائي من الـ pre("find") hook في الموديل
  const interviews = await Interview.find(query)
    .populate({
      path: "studentId",
      model: Student,
      select:
        "personalInfo.fullName personalInfo.nickname enrollmentNumber studentType",
    })
    .populate({ path: "meetingLinkId", select: "credentials platform name" })
    .sort({ scheduledDate: 1, startTime: 1 })
    .lean();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  return interviews.map((iv) => {
    const student =
      iv.studentId && typeof iv.studentId === "object" && iv.studentId._id
        ? iv.studentId
        : null;

    const isAdult = student?.studentType === "adults";
    const isOffline = iv.deliveryMode === "offline";

    const date = new Date(iv.scheduledDate);
    const isToday = date >= todayStart && date <= todayEnd;
    const isScheduled = iv.status === "scheduled";

    // ✅ التقييم متاح لو المقابلة scheduled ومعادها النهارده أو عدّى (مفيش حضور)
    const canEvaluate = isScheduled && date <= todayEnd;
    const evaluationCompleted = iv.status === "completed" && !!iv.evaluation?.decision;

    const canViewDetails = isScheduled && isToday;
    const showJoinButton = canViewDetails && !isOffline && !!iv.meetingLink;

    // Location (offline)
    let locationInfo = null;
    if (isOffline) {
      const loc = iv.locationDetails || {};
      const placeName = loc.placeName || iv.location || "";
      const address = loc.address || loc.extraDetails || "";

      let mapsLink = "";
      if (loc.lat != null && loc.lng != null) {
        mapsLink = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
      } else if (address) {
        mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      } else if (placeName) {
        mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}`;
      }

      locationInfo = {
        placeName,
        address,
        country: loc.country || "",
        lat: loc.lat ?? null,
        lng: loc.lng ?? null,
        mapsLink,
      };
    }

    // Sensitive data (online فقط وفي يوم المقابلة)
    let meetingLink = null;
    let meetingPlatform = null;
    let meetingCredentials = null;
    if (canViewDetails && !isOffline) {
      meetingLink = iv.meetingLink || null;
      meetingPlatform = iv.meetingPlatform || iv.meetingLinkId?.platform || null;
      const rawCreds = iv.meetingLinkId?.credentials || null;
      meetingCredentials = rawCreds
        ? { username: rawCreds.username || null, password: rawCreds.password || null }
        : null;
    }

    return {
      _id: iv._id,
      itemType: "interview",
      isInterview: true,
      title: iv.title,
      status: iv.status,
      scheduledDate: iv.scheduledDate,
      startTime: iv.startTime,
      endTime: iv.endTime,

      student: student
        ? {
            _id: student._id,
            name: student.personalInfo?.fullName || "بدون اسم",
            enrollmentNumber: student.enrollmentNumber || "",
            studentType: student.studentType || "kids",
            isAdult,
          }
        : null,
      isAdult,
      // ✅ مين هيستلم رسالة التقييم
      evaluationRecipient: isAdult ? "student" : "guardian",

      deliveryMode: iv.deliveryMode || "online",
      isOffline,
      locationInfo,
      meetingLink,
      meetingPlatform,
      meetingCredentials,

      isToday,
      canViewDetails,
      showJoinButton,

      // ✅ مفيش حضور للمقابلات
      attendanceRequired: false,
      showAttendanceButton: false,
      attendanceTaken: false,

      // ✅ التقييم على طول
      canEvaluate,
      showEvaluationButton: canEvaluate,
      evaluationCompleted,
      evaluation: evaluationCompleted
        ? {
            decision: iv.evaluation.decision,
            instructorComment: iv.evaluation.instructorComment || "",
            // ✅ NEW: تقييم الأداء بالنجوم (زي السيشن)
            ratings: {
              commitment: iv.evaluation.ratings?.commitment ?? 3,
              understanding: iv.evaluation.ratings?.understanding ?? 3,
              taskExecution: iv.evaluation.ratings?.taskExecution ?? 3,
              participation: iv.evaluation.ratings?.participation ?? 3,
            },
            interviewNumber: iv.evaluation.interviewNumber || 1,
            completedAt: iv.evaluation.completedAt || null,
          }
        : null,
      evaluationSent: !!iv.automationEvents?.evaluationSent,
      evaluationEndpoint: `/api/instructor/interviews/${iv._id}/evaluation`,

      instructorNotes: iv.instructorNotes || null,
    };
  });
}

function buildInterviewStats(items) {
  return {
    total: items.length,
    scheduled: items.filter((i) => i.status === "scheduled").length,
    completed: items.filter((i) => i.status === "completed").length,
    cancelled: items.filter((i) => i.status === "cancelled").length,
    postponed: items.filter((i) => i.status === "postponed").length,
    needsEvaluation: items.filter((i) => i.canEvaluate).length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ✅ GET
// ═══════════════════════════════════════════════════════════════════════════
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const groupIdFilter = searchParams.get("groupId");
    const limit = parseInt(searchParams.get("limit") || "200");

    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غير مصرح بالوصول", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    if (user.role !== "instructor" && user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "هذه الصفحة للمدرسين فقط", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    await connectDB();

    // ✅ المقابلات بتتجاب مرة واحدة (لو فيه فلتر جروب معناها المدرس بيفلتر على جروب → مفيش مقابلات)
    const interviews = groupIdFilter
      ? []
      : await loadInterviewItems(user, statusFilter);
    const interviewStats = buildInterviewStats(interviews);

    // ✅ جيب كل الجروبات اللي المدرس ده مسؤول عنها
    const groups = await Group.find({
      "instructors.userId": user.id,
      isDeleted: false,
      status: { $in: ["active", "completed", "draft"] },
    })
      .populate({
        path: "courseId",
        select: "title level curriculum description grade subject duration",
      })
      .select("_id name code courseId location locationDetails deliveryMode hold")
      .lean();

    const groupIds = groups.map((g) => g._id);

    if (groupIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          sessions: [],
          stats: {
            total: 0, completed: 0, scheduled: 0,
            cancelled: 0, postponed: 0, needsAttendance: 0,
          },
          interviews,
          interviewStats,
        },
      });
    }

    // ✅ FIX (SECURITY): لو فيه فلتر، لازم يكون عنصر موجود فعلاً في groupIds بتاعت المدرس
    let targetGroupIds = groupIds;
    if (groupIdFilter) {
      const matchedGroupId = groupIds.find((gid) => gid.toString() === groupIdFilter);
      if (!matchedGroupId) {
        return NextResponse.json(
          {
            success: false,
            message: "غير مصرح لك بالوصول لهذا الجروب",
            code: "FORBIDDEN_GROUP",
          },
          { status: 403 },
        );
      }
      targetGroupIds = [matchedGroupId];
    }

    // ✅ Map للجروبات
    const groupMap = {};
    groups.forEach((g) => {
      groupMap[g._id.toString()] = {
        name: g.name,
        code: g.code,
        location: g.location || "",
        locationDetails: g.locationDetails || {},
        deliveryMode: g.deliveryMode || "online",
        curriculum: g.courseId?.curriculum || [],
        course: g.courseId
          ? {
              title: g.courseId.title || "",
              description: g.courseId.description || "",
              level: g.courseId.level || "",
              grade: g.courseId.grade || "",
              subject: g.courseId.subject || "",
              duration: g.courseId.duration || "",
            }
          : null,
        isOnHold: !!g.hold?.isHeld,
        hold: g.hold || null,
      };
    });

    // ✅ نجيب كل سيشنات الجروبات (للـ Hold logic + current module detection)
    // بنجيبها لكل groupIds (مش targetGroupIds) عشان الـ hold/module maps تفضل صح
    const allGroupSessionsRaw = await Session.find({
      groupId: { $in: groupIds },
      isDeleted: false,
    })
      .select("_id groupId moduleIndex sessionNumber scheduledDate status")
      .lean();

    // ✅ Map: groupId → كل سيشنات الجروب
    const allGroupSessionsMap = {};
    allGroupSessionsRaw.forEach((s) => {
      const gid = s.groupId.toString();
      if (!allGroupSessionsMap[gid]) allGroupSessionsMap[gid] = [];
      allGroupSessionsMap[gid].push(s);
    });

    // ✅ حدد الـ current module لكل جروب
    const moduleStatsMap = {};
    allGroupSessionsRaw.forEach((s) => {
      const gid = s.groupId.toString();
      if (!moduleStatsMap[gid]) moduleStatsMap[gid] = {};
      if (!moduleStatsMap[gid][s.moduleIndex]) {
        moduleStatsMap[gid][s.moduleIndex] = { total: 0, completed: 0 };
      }
      moduleStatsMap[gid][s.moduleIndex].total += 1;
      if (s.status === "completed") {
        moduleStatsMap[gid][s.moduleIndex].completed += 1;
      }
    });

    const currentModuleIndexMap = {};
    Object.keys(moduleStatsMap).forEach((gid) => {
      const stats = moduleStatsMap[gid];
      const moduleIndexes = Object.keys(stats).map(Number).sort((a, b) => a - b);
      let current = null;
      for (const mIdx of moduleIndexes) {
        const { total, completed } = stats[mIdx];
        if (total > 0 && completed < total) {
          current = mIdx;
          break;
        }
      }
      currentModuleIndexMap[gid] = current;
    });

    // ✅ Build query للـ sessions — targetGroupIds بعد التحقق من الملكية
    const query = {
      groupId: { $in: targetGroupIds },
      isDeleted: false,
    };
    if (statusFilter && statusFilter !== "all") query.status = statusFilter;

    const allSessions = await Session.find(query)
      .populate({ path: "groupId", select: "name code" })
      .populate({ path: "meetingLinkId", select: "credentials platform name" })
      .select(
        "title description status scheduledDate startTime endTime moduleIndex sessionNumber " +
          "lessonIndexes attendanceTaken attendance meetingLink meetingPlatform meetingCredentials " +
          "meetingLinkId recordingLink materials instructorNotes groupId pendingReschedule earlyAccess " +
          "deliveryMode isComplimentary",
      )
      .sort({ scheduledDate: 1, startTime: 1 })
      .limit(limit)
      .lean();

    // ✅ Process each session
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const processedSessions = allSessions.map((session) => {
      const gid = session.groupId?._id?.toString() || session.groupId?.toString();
      const grp = groupMap[gid] || {};
      const curriculum = grp.curriculum || [];
      const moduleData = curriculum[session.moduleIndex] || {};

      const groupIsOnHold = !!grp.isOnHold;

      // ✅ هل السيشن دي بالتحديد مقفولة بسبب الـ Hold؟
      const sessionIsLocked = groupIsOnHold
        ? isSessionLockedByHold(
            {
              _id: session._id,
              moduleIndex: session.moduleIndex,
              sessionNumber: session.sessionNumber,
              status: session.status,
            },
            grp,
            allGroupSessionsMap[gid] || [],
          )
        : false;

      const deliveryMode = session.deliveryMode || grp.deliveryMode || "online";
      const isOffline = deliveryMode === "offline";

      // Location info
      let locationInfo = null;
      if (isOffline) {
        const loc = grp.locationDetails || {};
        const placeName = loc.placeName || grp.location || "";
        const address = loc.address || loc.extraDetails || "";
        const country = loc.country || "";

        let mapsLink = "";
        if (loc.lat != null && loc.lng != null) {
          mapsLink = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
        } else if (address) {
          mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
        } else if (placeName) {
          mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}`;
        }

        locationInfo = {
          placeName, address, country,
          lat: loc.lat ?? null,
          lng: loc.lng ?? null,
          mapsLink,
        };
      }

      // Lessons
      const bySessionNum = (moduleData.lessons || []).filter(
        (l) => l.sessionNumber === session.sessionNumber,
      );
      const byIndexes = (moduleData.lessons || []).filter((l) =>
        (session.lessonIndexes || []).includes(l.order - 1),
      );
      const rawLessons = bySessionNum.length > 0 ? bySessionNum : byIndexes;

      const seenTitles = new Set();
      const lessons = rawLessons
        .filter((l) => {
          if (seenTitles.has(l.title)) return false;
          seenTitles.add(l.title);
          return true;
        })
        .map((l) => ({
          title: l.title,
          description: l.description || "",
          duration: l.duration || "",
          order: l.order,
        }));

      // Today?
      const sessionDate = new Date(session.scheduledDate);
      const isToday = sessionDate >= todayStart && sessionDate <= todayEnd;

      // Early access
      const hasActiveEarlyAccess = !!(
        session.earlyAccess?.enabled && !session.earlyAccess?.consumedAt
      );

      const isEffectivelyToday = isToday || hasActiveEarlyAccess;
      const sessionStillActive = true;
      const attendanceAlreadyTaken = !!session.attendanceTaken;

      const attendanceBlocksAccess =
        attendanceAlreadyTaken && !hasActiveEarlyAccess && !isToday;

      let showJoinButton =
        isEffectivelyToday &&
        sessionStillActive &&
        !attendanceBlocksAccess &&
        !isOffline &&
        !!session.meetingLink;

      let showAttendanceButton =
        isOffline && isEffectivelyToday && sessionStillActive && !attendanceBlocksAccess;

      let canViewDetails =
        isEffectivelyToday && sessionStillActive && !attendanceBlocksAccess;

      let canViewAttendanceHistory =
        session.status === "completed" && attendanceAlreadyTaken;

      const wasApprovedWithNext =
        session.pendingReschedule?.status === "approved" &&
        session.pendingReschedule?.viewMode === "withNext";

      const currentModuleIndexForGroup = currentModuleIndexMap[gid];
      const isCurrentModuleSession =
        currentModuleIndexForGroup !== null &&
        currentModuleIndexForGroup !== undefined &&
        session.moduleIndex === currentModuleIndexForGroup;

      let canViewPartialDetails =
        !canViewDetails &&
        session.status !== "completed" &&
        (wasApprovedWithNext || isCurrentModuleSession);

      // ✅ OVERRIDE بسبب الـ Hold — لو السيشن دي بالتحديد مقفولة
      if (sessionIsLocked) {
        showJoinButton = false;
        showAttendanceButton = false;
        canViewDetails = false;
        canViewPartialDetails = false;
      }

      // Course info
      const sessionPresentationData = (moduleData.sessions || []).find(
        (s) => s.sessionNumber === session.sessionNumber,
      );
      const sessionDescription = session.description || "";

      const courseInfo = grp.course
        ? {
            title: grp.course.title,
            description: grp.course.description,
            level: grp.course.level,
            grade: grp.course.grade,
            subject: grp.course.subject,
            duration: grp.course.duration,
            moduleData: {
              title: moduleData.title || "",
              description: moduleData.description || "",
              blogBodyAr: moduleData.blogBodyAr || "",
              blogBodyEn: moduleData.blogBodyEn || "",
              presentationUrl: sessionPresentationData?.presentationUrl || "",
              projects: moduleData.projects || [],
            },
          }
        : null;

      // Sensitive data
      let meetingCredentials = null;
      let attendance = null;
      let meetingLink = null;
      let meetingPlatform = null;

      if (canViewDetails) {
        if (!isOffline) {
          const rawCreds =
            session.meetingCredentials?.username ||
            session.meetingCredentials?.password
              ? session.meetingCredentials
              : session.meetingLinkId?.credentials || null;

          meetingCredentials = rawCreds
            ? {
                username: rawCreds.username || null,
                password: rawCreds.password || null,
              }
            : null;
          meetingLink = session.meetingLink || null;
          meetingPlatform = session.meetingPlatform || null;
        }
        attendance = session.attendance || [];
      } else if (canViewAttendanceHistory) {
        attendance = session.attendance || [];
      }

      return {
        _id: session._id,
        itemType: "session",
        isInterview: false,
        title: session.title,
        description: sessionDescription,
        status: session.status,
        scheduledDate: session.scheduledDate,
        startTime: session.startTime,
        endTime: session.endTime,
        moduleIndex: session.moduleIndex,
        moduleName: moduleData.title || `الوحدة ${session.moduleIndex + 1}`,
        sessionNumber: session.sessionNumber,
        lessons,
        attendanceTaken: attendanceAlreadyTaken,
        attendance,
        meetingLink,
        meetingPlatform,
        meetingCredentials,
        recordingLink: isOffline ? null : (session.recordingLink || null),
        materials: session.materials || [],
        instructorNotes: session.instructorNotes || null,
        isToday,
        isEffectivelyToday,
        showJoinButton,
        showAttendanceButton,
        canViewDetails,
        canViewPartialDetails,
        canViewAttendanceHistory,
        hasActiveEarlyAccess,
        deliveryMode,
        isOffline,
        locationInfo,
        groupIsOnHold,
        sessionIsLocked, // ✅ هل السيشن دي بالتحديد مقفولة؟
        groupHold: grp.hold || null,
        // ✅ للفرونت يعرض بادج "حصة تعويضية" (بدون خصم رصيد)
        isComplimentary: session.isComplimentary === true,
        pendingReschedule: session.pendingReschedule
          ? {
              status: session.pendingReschedule.status,
              viewMode: session.pendingReschedule.viewMode,
              isTrigger:
                session.pendingReschedule.triggerSessionId?.toString() ===
                session._id.toString(),
              oldScheduledDate: session.pendingReschedule.oldScheduledDate,
              newScheduledDate: session.pendingReschedule.newScheduledDate,
              requestedAt: session.pendingReschedule.requestedAt,
            }
          : null,
        courseInfo,
        group: {
          _id: session.groupId?._id || session.groupId,
          name: session.groupId?.name || grp.name || "",
          code: session.groupId?.code || grp.code || "",
        },
      };
    });

    // Stats
    const all = processedSessions;
    const stats = {
      total: all.length,
      completed: all.filter((s) => s.status === "completed").length,
      scheduled: all.filter((s) => s.status === "scheduled").length,
      cancelled: all.filter((s) => s.status === "cancelled").length,
      postponed: all.filter((s) => s.status === "postponed").length,
      needsAttendance: all.filter(
        (s) => s.status === "completed" && !s.attendanceTaken,
      ).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        sessions: processedSessions,
        stats,
        // ✅ NEW: مقابلات المدرس (من غير حضور — تقييم على طول)
        interviews,
        interviewStats,
      },
    });
  } catch (error) {
    console.error("❌ [Instructor Sessions API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في تحميل الجلسات",
        error: error.message,
      },
      { status: 500 },
    );
  }
}