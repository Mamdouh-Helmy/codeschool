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
        {
          success: false,
          message: "هذه الصفحة للمدرسين فقط",
          code: "FORBIDDEN",
        },
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
      .select("_id name code courseId")
      .lean();

    const groupIds = groups.map((g) => g._id);

    if (groupIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          sessions: [],
          stats: {
            total: 0,
            completed: 0,
            scheduled: 0,
            cancelled: 0,
            postponed: 0,
            needsAttendance: 0,
          },
        },
      });
    }

    // Map: groupId → curriculum & group info + full course data
    const groupMap = {};
    groups.forEach((g) => {
      groupMap[g._id.toString()] = {
        name: g.name,
        code: g.code,
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
          "meetingLinkId recordingLink materials instructorNotes groupId pendingReschedule earlyAccess",
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
      const gid =
        session.groupId?._id?.toString() || session.groupId?.toString();
      const grp = groupMap[gid] || {};
      const curriculum = grp.curriculum || [];
      const moduleData = curriculum[session.moduleIndex] || {};

      // ── Lessons from curriculum (by sessionNumber) ─────────────────────
      const bySessionNum = (moduleData.lessons || []).filter(
        (l) => l.sessionNumber === session.sessionNumber,
      );
      const byIndexes = (moduleData.lessons || []).filter((l) =>
        (session.lessonIndexes || []).includes(l.order - 1),
      );
      const rawLessons = bySessionNum.length > 0 ? bySessionNum : byIndexes;

      // Deduplicate lessons by title
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

      // ── Is today (by raw scheduled date)? ────────────────────────────────
      const sessionDate = new Date(session.scheduledDate);
      const isToday = sessionDate >= todayStart && sessionDate <= todayEnd;

      // ── 🔐 Early access: admin approved a "open this session now" request.
      //     This bypasses the date entirely until consumed (attendance taken
      //     or manually revoked). Independent from isToday.
      const hasActiveEarlyAccess = !!(
        session.earlyAccess?.enabled && !session.earlyAccess?.consumedAt
      );

      // ── Effective "today" = real today OR an active early-access grant ──
      const isEffectivelyToday = isToday || hasActiveEarlyAccess;

      // ── Show join button? ──────────────────────────────────────────────
      const [endH = 23, endM = 59] = (session.endTime || "23:59")
        .split(":")
        .map(Number);
      const sessionEndTime = new Date(sessionDate);
      sessionEndTime.setHours(endH, endM, 0, 0);

      const sessionStillActive = hasActiveEarlyAccess
        ? true
        : sessionEndTime > now;

      // ✅ الـ attendanceTaken دايمًا بياخد قيمته الحقيقية من DB
      // مش sensitive data — مجرد flag بيقول "الحضور اتسجل"
      // محتاجه دايمًا في الـ stats وفي الـ session row
      const attendanceAlreadyTaken = !!session.attendanceTaken;

      const showJoinButton =
        session.status === "scheduled" &&
        isEffectivelyToday &&
        sessionStillActive &&
        !attendanceAlreadyTaken &&
        !!session.meetingLink;

      // ── 🔐 SECURITY: Can user view FULL details (link + attendance)? ────
      // True only if the session is effectively "today" (real date today, or
      // an approved early-access grant) AND it has a meeting link AND it's
      // still within its active window AND attendance hasn't been taken yet.
      const canViewDetails =
        isEffectivelyToday && sessionStillActive && !attendanceAlreadyTaken;

      // ── 🔓 Partial details (content/lessons only, no link/attendance) ───
      const wasApprovedWithNext =
        session.pendingReschedule?.status === "approved" &&
        session.pendingReschedule?.viewMode === "withNext";
      const canViewPartialDetails =
        !canViewDetails && wasApprovedWithNext && !attendanceAlreadyTaken;

      // ── Session description from curriculum ────────────────────────────
      const sessionPresentationData = (moduleData.sessions || []).find(
        (s) => s.sessionNumber === session.sessionNumber,
      );

      const sessionDescription = session.description || "";

      // ── Build courseInfo payload ───────────────────────────────────────
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

      // ── 🔐 SECURITY: Sensitive data (link + credentials + roster) ────────
      // ✅ الـ FIX: attendanceTaken بيتبعت دايمًا بقيمته الحقيقية من DB
      //            بدل ما كان بيتبعت بـ false لو canViewDetails = false
      //
      // الـ sensitive data الحقيقية اللي محتاجة حماية:
      //   - meetingLink      → رابط الاجتماع
      //   - meetingCredentials → يوزرنيم وباسورد
      //   - attendance array → بيانات الطلاب
      //
      // الـ attendanceTaken مجرد boolean flag — مش sensitive ومحتاجه
      // في أي مكان عشان نعرف إيه حالة الجلسة (completed + needsAttendance).

      let meetingCredentials = null;
      let attendance = null;
      let meetingLink = null;
      let meetingPlatform = null;

      if (canViewDetails) {
        // Only send credentials for active sessions
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

        // Only send attendance data for today's (or early-access) sessions
        attendance = session.attendance || [];
        meetingLink = session.meetingLink || null;
        meetingPlatform = session.meetingPlatform || null;
      }
      // ملاحظة: شيلنا الـ else if (canViewPartialDetails) اللي كان بيبعت
      // attendanceTaken فقط في الـ partial mode — دلوقتي attendanceTaken
      // بيتبعت دايمًا بقيمته الحقيقية بغض النظر عن الـ mode

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
        // ✅ دايمًا بقيمته الحقيقية — مش sensitive data
        attendanceTaken: attendanceAlreadyTaken,
        // 🔐 Sensitive: null إلا لو canViewDetails
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
        // 🔐 Access flags for frontend
        canViewDetails,
        canViewPartialDetails,
        hasActiveEarlyAccess,
        // 🔄 Reschedule request state
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
    // ✅ دلوقتي needsAttendance هيشتغل صح لأن attendanceTaken بقيمته الحقيقية
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
      { success: false, message: "فشل في تحميل الجلسات", error: error.message },
      { status: 500 },
    );
  }
}
