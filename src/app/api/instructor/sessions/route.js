// app/api/instructor/sessions/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Group from "../../../models/Group";
import Session from "../../../models/Session";
import MeetingLink from "../../../models/MeetingLink";

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

    // ── 1. Get all groups assigned to this instructor ──────────────────────
    const groups = await Group.find({
      "instructors.userId": user.id,
      isDeleted: false,
      status: { $in: ["active", "completed", "draft"] },
    })
      .populate({
        path: "courseId",
        select: "title level curriculum description grade subject duration",
      })
      // ✅ نضيف حقول الموقع ونوع الجروب
      .select("_id name code courseId location locationDetails deliveryMode")
      .lean();

    const groupIds = groups.map((g) => g._id);

    if (groupIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          sessions: [],
          stats: { total: 0, completed: 0, scheduled: 0, cancelled: 0, postponed: 0, needsAttendance: 0 },
        },
      });
    }

    // Map: groupId → curriculum & group info + full course data
    const groupMap = {};
    groups.forEach((g) => {
      groupMap[g._id.toString()] = {
        name: g.name,
        code: g.code,
        // ✅ جديد: بيانات الموقع ونوع الجروب
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
      };
    });

    // ── 1.5 Compute the "current module" for each group ─────────────────────
    const progressSessions = await Session.find({
      groupId: { $in: groupIds },
      isDeleted: false,
    })
      .select("groupId moduleIndex status")
      .lean();

    const moduleStatsMap = {};
    progressSessions.forEach((s) => {
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

    // ── 2. Build session query ─────────────────────────────────────────────
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
          "deliveryMode", // ✅ جديد
      )
      .sort({ scheduledDate: 1, startTime: 1 })
      .limit(limit)
      .lean();

    // ── 3. Process each session ────────────────────────────────────────────
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

      // ── ✅ Delivery Mode + Location Info ─────────────────────────────
      const deliveryMode = session.deliveryMode || grp.deliveryMode || "online";
      const isOffline = deliveryMode === "offline";

      // ── Build location info for offline sessions ─────────────────────
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
          placeName,
          address,
          country,
          lat: loc.lat ?? null,
          lng: loc.lng ?? null,
          mapsLink,
        };
      }

      // ── Lessons ────────────────────────────────────────────────────
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

      // ── Is today? ────────────────────────────────────────────────────
      const sessionDate = new Date(session.scheduledDate);
      const isToday = sessionDate >= todayStart && sessionDate <= todayEnd;

      // ── Early access ─────────────────────────────────────────────────
      const hasActiveEarlyAccess = !!(
        session.earlyAccess?.enabled && !session.earlyAccess?.consumedAt
      );

      const isEffectivelyToday = isToday || hasActiveEarlyAccess;
      const sessionStillActive = true;
      const attendanceAlreadyTaken = !!session.attendanceTaken;

      const attendanceBlocksAccess =
        attendanceAlreadyTaken && !hasActiveEarlyAccess && !isToday;

      // ✅ زرار بدء الحصة (Join) — للأونلاين بس
      const showJoinButton =
        isEffectivelyToday &&
        sessionStillActive &&
        !attendanceBlocksAccess &&
        !isOffline &&
        !!session.meetingLink;

      // 🆕 زرار "تسجيل الحضور" المباشر — للـ Offline بس
      const showAttendanceButton =
        isOffline &&
        isEffectivelyToday &&
        sessionStillActive &&
        !attendanceBlocksAccess;

      // ── Access permissions ───────────────────────────────────────────
      const canViewDetails =
        isEffectivelyToday && sessionStillActive && !attendanceBlocksAccess;

      const canViewAttendanceHistory =
        session.status === "completed" && attendanceAlreadyTaken;

      const wasApprovedWithNext =
        session.pendingReschedule?.status === "approved" &&
        session.pendingReschedule?.viewMode === "withNext";

      const currentModuleIndexForGroup = currentModuleIndexMap[gid];
      const isCurrentModuleSession =
        currentModuleIndexForGroup !== null &&
        currentModuleIndexForGroup !== undefined &&
        session.moduleIndex === currentModuleIndexForGroup;

      const canViewPartialDetails =
        !canViewDetails &&
        session.status !== "completed" &&
        (wasApprovedWithNext || isCurrentModuleSession);

      // ── Course info ──────────────────────────────────────────────────
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

      // ── Sensitive data ───────────────────────────────────────────────
      let meetingCredentials = null;
      let attendance = null;
      let meetingLink = null;
      let meetingPlatform = null;

      if (canViewDetails) {
        if (!isOffline) {
          const rawCreds =
            session.meetingCredentials?.username || session.meetingCredentials?.password
              ? session.meetingCredentials
              : session.meetingLinkId?.credentials || null;

          meetingCredentials = rawCreds
            ? { username: rawCreds.username || null, password: rawCreds.password || null }
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
        showAttendanceButton, // ✅ جديد
        canViewDetails,
        canViewPartialDetails,
        canViewAttendanceHistory,
        hasActiveEarlyAccess,

        // ✅ جديد: delivery mode + location
        deliveryMode,
        isOffline,
        locationInfo,

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

    // ── 4. Stats ───────────────────────────────────────────────────────────
    const all = processedSessions;
    const stats = {
      total: all.length,
      completed: all.filter((s) => s.status === "completed").length,
      scheduled: all.filter((s) => s.status === "scheduled").length,
      cancelled: all.filter((s) => s.status === "cancelled").length,
      postponed: all.filter((s) => s.status === "postponed").length,
      needsAttendance: all.filter((s) => s.status === "completed" && !s.attendanceTaken).length,
    };

    return NextResponse.json({
      success: true,
      data: { sessions: processedSessions, stats },
    });
  } catch (error) {
    console.error("❌ [Instructor Sessions API] Error:", error);
    return NextResponse.json(
      { success: false, message: "فشل في تحميل الجلسات", error: error.message },
      { status: 500 },
    );
  }
}