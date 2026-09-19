// src/app/api/instructor/sessions/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Group from "../../../models/Group";
import Session from "../../../models/Session";
import MeetingLink from "../../../models/MeetingLink";

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

function isSessionLockedByHold(session, group, allGroupSessions) {
  if (!group?.hold?.isHeld) return false;
  if (session?.status === "completed") return false;

  const hold = group.hold;

  // indefinite / duration → كل الجلسات مقفولة
  if (hold.holdType === "indefinite" || hold.holdType === "duration") {
    return true;
  }

  if (!Array.isArray(allGroupSessions) || allGroupSessions.length === 0) {
    return true;
  }

  const sorted = sortSessionsForHold(allGroupSessions);
  const myId = String(session._id);
  const myIndex = sorted.findIndex((s) => String(s._id) === myId);
  if (myIndex === -1) return false;

  // sessions: N سيشنات الأولى
  if (hold.holdType === "sessions") {
    const consumed = hold.holdSessionsConsumed || 0;
    if (consumed === 0) return true;
    return myIndex < consumed;
  }

  // until_session: من أول الترتيب لحد السيشن المستهدفة (شاملة)
  if (hold.holdType === "until_session") {
    const targetId = hold.holdUntilSessionId;
    if (!targetId) return true;
    const targetIndex = sorted.findIndex((s) => String(s._id) === String(targetId));
    if (targetIndex === -1) return true;
    return myIndex <= targetIndex;
  }

  return false;
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
        },
      });
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

    // ✅ Build query للـ sessions
    const query = {
      groupId: groupIdFilter ? groupIdFilter : { $in: groupIds },
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
          "deliveryMode",
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
        recordingLink: session.recordingLink || null,
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
        sessionIsLocked, // ✅ جديد — هل السيشن دي بالتحديد مقفولة؟
        groupHold: grp.hold || null,
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
      data: { sessions: processedSessions, stats },
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