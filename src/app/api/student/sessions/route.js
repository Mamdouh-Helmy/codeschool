// app/api/student/sessions/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Student from "../../../models/Student";
import Session from "../../../models/Session";
import Group from "../../../models/Group";

// ═══════════════════════════════════════════════════════════════════════════
// ✅ HOLD HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function sortSessionsForHold(sessions) {
  return [...sessions].sort((a, b) => {
    if (a.moduleIndex !== b.moduleIndex) return a.moduleIndex - b.moduleIndex;
    if (a.sessionNumber !== b.sessionNumber)
      return a.sessionNumber - b.sessionNumber;
    return new Date(a.scheduledDate) - new Date(b.scheduledDate);
  });
}

function isSessionLockedByHold(session, group, allGroupSessions) {
  if (!group?.hold?.isHeld) return false;
  if (session?.status === "completed") return false;

  const hold = group.hold;

  if (hold.holdType === "indefinite" || hold.holdType === "duration")
    return true;
  if (!Array.isArray(allGroupSessions) || allGroupSessions.length === 0)
    return true;

  const sorted = sortSessionsForHold(allGroupSessions);
  const myIndex = sorted.findIndex(
    (s) => String(s._id) === String(session._id),
  );
  if (myIndex === -1) return false;

  if (hold.holdType === "sessions") {
    const consumed = hold.holdSessionsConsumed || 0;
    if (consumed === 0) return true;
    return myIndex < consumed;
  }

  if (hold.holdType === "until_session") {
    const targetId = hold.holdUntilSessionId;
    if (!targetId) return true;
    const targetIndex = sorted.findIndex(
      (s) => String(s._id) === String(targetId),
    );
    if (targetIndex === -1) return true;
    return myIndex <= targetIndex;
  }

  return false;
}

const json = (body, status = 200) => NextResponse.json(body, { status });

// ═══════════════════════════════════════════════════════════════════════════
// GET
// ═══════════════════════════════════════════════════════════════════════════
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const groupIdFilter = searchParams.get("groupId");
    const limit = parseInt(searchParams.get("limit") || "100");

    const user = await getUserFromRequest(req);
    if (!user) {
      return json(
        { success: false, message: "غير مصرح بالوصول", code: "UNAUTHORIZED" },
        401,
      );
    }

    await connectDB();

    const student = await Student.findOne({ authUserId: user.id })
      .select("_id academicInfo.groupIds")
      .lean();

    if (!student) {
      return json(
        { success: false, message: "لم يتم العثور على بيانات الطالب" },
        404,
      );
    }

    const groupIds = student.academicInfo?.groupIds || [];
    if (groupIds.length === 0) {
      return json({
        success: true,
        data: {
          sessions: [],
          stats: { total: 0, completed: 0, scheduled: 0, cancelled: 0 },
        },
      });
    }

    // ✅ FIX (SECURITY): كان groupId من الـ query string بيتحط مباشرة في الـ
    // query من غير ما نتأكد إنه من جروبات الطالب ده، فأي طالب كان يقدر يشوف
    // سيشنات (وميتنج لينك) جروب مش بتاعه. دلوقتي لازم يكون ضمن groupIds بتاعته.
    let targetGroupIds = groupIds;
    if (groupIdFilter) {
      const matchedGroupId = groupIds.find(
        (gid) => gid.toString() === groupIdFilter,
      );
      if (!matchedGroupId) {
        return json(
          {
            success: false,
            message: "غير مصرح لك بالوصول لهذا الجروب",
            code: "FORBIDDEN_GROUP",
          },
          403,
        );
      }
      targetGroupIds = [matchedGroupId];
    }

    // ── جلب الجروبات مع الـ curriculum + hold + status ──────────────────────
    const groups = await Group.find({
      _id: { $in: groupIds },
      isDeleted: false,
    })
      .populate({ path: "courseId", select: "title level curriculum" })
      .select("_id name code courseId hold status")
      .lean();

    const groupCurriculumMap = {};
    const groupHoldMap = {};
    const groupStatusMap = {};

    groups.forEach((g) => {
      const gid = g._id.toString();
      groupCurriculumMap[gid] = g.courseId?.curriculum || [];
      groupHoldMap[gid] = g.hold || null;
      groupStatusMap[gid] = g.status || "draft";
    });

    // ── Build query ──────────────────────────────────────────────────────────
    const query = { groupId: { $in: targetGroupIds }, isDeleted: false };
    if (status && status !== "all") query.status = status;

    // ── جلب الجلسات ──────────────────────────────────────────────────────────
    const allSessions = await Session.find(query)
      .populate({
        path: "groupId",
        select: "name code courseId hold status deliveryMode",
      })
      .populate({ path: "courseId", select: "title level" })
      .select(
        "title status scheduledDate startTime endTime moduleIndex sessionNumber " +
          "lessonIndexes attendanceTaken attendance meetingLink meetingPlatform " +
          "recordingLink materials instructorNotes groupId courseId description " +
          "isComplimentary deliveryMode",
      )
      .sort({ scheduledDate: 1, startTime: 1 })
      .limit(limit)
      .lean();

    // ── ترتيب الجلسات لكل جروب (للـ prevCompleted + Hold) ─────────────────
    // بنجيبها لكل groupIds (مش targetGroupIds) عشان الترتيب يفضل صح.
    const sessionsByGroup = {};
    groupIds.forEach((gid) => {
      sessionsByGroup[gid.toString()] = [];
    });

    const allGroupSessions = await Session.find({
      groupId: { $in: groupIds },
      isDeleted: false,
    })
      .select("_id status groupId moduleIndex sessionNumber scheduledDate")
      .sort({ groupId: 1, moduleIndex: 1, sessionNumber: 1 })
      .lean();

    allGroupSessions.forEach((s) => {
      const gid = s.groupId.toString();
      if (!sessionsByGroup[gid]) sessionsByGroup[gid] = [];
      sessionsByGroup[gid].push(s);
    });

    // ── Process sessions ──────────────────────────────────────────────────────
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const processedSessions = allSessions.map((session) => {
      const gid =
        session.groupId?._id?.toString() || session.groupId?.toString();
      const groupOrder = sessionsByGroup[gid] || [];

      // ✅ FIX: طبقة حماية إضافية — حتى لو حصل وكان فيه recordingLink متخزن
      // من قبل على سيشن offline (بيانات قديمة قبل إصلاح مصدر المشكلة)، برضو
      // منمنعش نعرضه للطالب
      const sessionIsOffline =
        (session.deliveryMode || session.groupId?.deliveryMode) === "offline";
      const sessionIdx = groupOrder.findIndex(
        (s) => s._id.toString() === session._id.toString(),
      );

      const isFirst = sessionIdx === 0;
      const prevSession = sessionIdx > 0 ? groupOrder[sessionIdx - 1] : null;
      const prevCompleted =
        isFirst || (prevSession && prevSession.status === "completed");

      // ✅ Hold
      const sessionGroupHold = session.groupId?.hold;
      const holdInfo = sessionGroupHold?.isHeld
        ? sessionGroupHold
        : groupHoldMap[gid];
      const groupIsOnHold = !!holdInfo?.isHeld;

      const sessionIsLocked = groupIsOnHold
        ? isSessionLockedByHold(
            {
              _id: session._id,
              moduleIndex: session.moduleIndex,
              sessionNumber: session.sessionNumber,
              status: session.status,
            },
            { hold: holdInfo },
            groupOrder,
          )
        : false;

      const sessionGroupStatus =
        session.groupId?.status || groupStatusMap[gid] || "draft";
      const groupIsActive = sessionGroupStatus === "active";

      // ✅ canAccess: الأساسي + override لو الجروب مش active أو السيشن مقفولة
      const isCompleted = session.status === "completed";
      let canAccess =
        isCompleted || (prevCompleted && session.status !== "cancelled");
      if (!isCompleted && (!groupIsActive || sessionIsLocked))
        canAccess = false;

      // Attendance
      const attRecord = session.attendance?.find(
        (a) => a.studentId?.toString() === student._id.toString(),
      );
      const studentAttendance = attRecord
        ? attRecord.status
        : isCompleted
          ? "absent"
          : null;

      // Join button
      const sessionDate = new Date(session.scheduledDate);
      const isToday = sessionDate >= todayStart && sessionDate <= todayEnd;

      const [endH = 23, endM = 59] = (session.endTime || "23:59")
        .split(":")
        .map(Number);
      const sessionEndTime = new Date(sessionDate);
      sessionEndTime.setHours(endH, endM, 0, 0);

      const showJoinButton =
        groupIsActive &&
        !sessionIsLocked &&
        prevCompleted &&
        session.status === "scheduled" &&
        isToday &&
        sessionEndTime > now &&
        !!session.meetingLink;

      // ── الدروس من الـ curriculum ──────────────────────────────────────────
      const moduleData =
        (groupCurriculumMap[gid] || [])[session.moduleIndex] || {};
      const moduleLessons = moduleData.lessons || [];

      const bySessionNum = moduleLessons.filter(
        (l) => l.sessionNumber === session.sessionNumber,
      );
      const byIndexes = moduleLessons.filter((l) =>
        (session.lessonIndexes || []).includes(l.order - 1),
      );
      const rawLessons = bySessionNum.length > 0 ? bySessionNum : byIndexes;
      const lessons = rawLessons.map((l) => ({ title: l.title }));

      // ✅ المواد: للمكتملة، أو للي الطالب عنده وصول ليها (ومش مقفولة)
      const materials =
        isCompleted || (canAccess && !sessionIsLocked)
          ? session.materials || []
          : [];

      return {
        _id: session._id,
        title: session.title,
        description: session.description || "",
        status: session.status,
        scheduledDate: session.scheduledDate,
        startTime: session.startTime,
        endTime: session.endTime,
        moduleIndex: session.moduleIndex,
        moduleName: moduleData.title || `الوحدة ${session.moduleIndex + 1}`,
        sessionNumber: session.sessionNumber,
        lessons,
        attendanceTaken: session.attendanceTaken,
        studentAttendance,
        meetingLink: canAccess ? session.meetingLink : null,
        meetingPlatform: session.meetingPlatform,
        recordingLink:
          isCompleted && !sessionIsOffline ? session.recordingLink : null,
        materials,
        instructorNotes: isCompleted ? session.instructorNotes : null,
        canAccess,
        isToday,
        showJoinButton,

        // ✅ Hold info
        groupIsOnHold,
        groupIsActive,
        sessionIsLocked,

        // ✅ للفرونت يعرض بادج "حصة تعويضية"
        isComplimentary: session.isComplimentary === true,

        group: {
          _id: session.groupId?._id || session.groupId,
          name: session.groupId?.name || "",
          code: session.groupId?.code || "",
        },
        course: session.courseId
          ? { title: session.courseId.title, level: session.courseId.level }
          : null,
      };
    });

    // ── Stats ─────────────────────────────────────────────────────────────────
    const statsAll = await Session.find({
      groupId: { $in: groupIds },
      isDeleted: false,
    })
      .select("status groupId")
      .lean();

    const heldGroupIds = new Set(
      Object.keys(groupHoldMap).filter((gid) => groupHoldMap[gid]?.isHeld),
    );
    const countByStatus = (s) => statsAll.filter((x) => x.status === s).length;

    const stats = {
      total: statsAll.length,
      completed: countByStatus("completed"),
      scheduled: countByStatus("scheduled"),
      cancelled: countByStatus("cancelled"),
      postponed: countByStatus("postponed"),
      onHold: statsAll.filter(
        (s) =>
          heldGroupIds.has(s.groupId?.toString()) && s.status !== "completed",
      ).length,
    };

    return json({
      success: true,
      data: { sessions: processedSessions, stats, studentId: student._id },
    });
  } catch (error) {
    console.error("❌ [All Sessions API] Error:", error);
    return json(
      { success: false, message: "فشل في تحميل الجلسات", error: error.message },
      500,
    );
  }
}
