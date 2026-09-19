// app/api/student/sessions/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Student from "../../../models/Student";
import Session from "../../../models/Session";
import Group from "../../../models/Group";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const status  = searchParams.get("status");
    const groupId = searchParams.get("groupId");
    const limit   = parseInt(searchParams.get("limit") || "100");

    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غير مصرح بالوصول", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    await connectDB();

    const student = await Student.findOne({ authUserId: user.id })
      .select("_id academicInfo.groupIds")
      .lean();

    if (!student) {
      return NextResponse.json(
        { success: false, message: "لم يتم العثور على بيانات الطالب" },
        { status: 404 }
      );
    }

    const groupIds = student.academicInfo?.groupIds || [];
    if (groupIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: { sessions: [], stats: { total: 0, completed: 0, scheduled: 0, cancelled: 0 } },
      });
    }

    // ── جلب الجروبات مع الـ curriculum + hold + status ──────────────────────
    const groups = await Group.find({ _id: { $in: groupIds }, isDeleted: false })
      .populate({ path: "courseId", select: "title level curriculum" })
      .select("_id name code courseId hold status")
      .lean();

    // Map: groupId → curriculum + hold info + status
    const groupCurriculumMap = {};
    const groupHoldMap = {};
    const groupStatusMap = {};

    groups.forEach((g) => {
      const gid = g._id.toString();
      groupCurriculumMap[gid] = g.courseId?.curriculum || [];
      groupHoldMap[gid] = !!g.hold?.isHeld;
      groupStatusMap[gid] = g.status || "draft";
    });

    // ── Build query ──────────────────────────────────────────────────────────
    const query = {
      groupId: groupId ? { $in: [groupId] } : { $in: groupIds },
      isDeleted: false,
    };
    if (status && status !== "all") query.status = status;

    // ── جلب الجلسات ──────────────────────────────────────────────────────────
    const allSessions = await Session.find(query)
      .populate({ path: "groupId", select: "name code courseId hold status" })
      .populate({ path: "courseId", select: "title level" })
      .select(
        "title status scheduledDate startTime endTime moduleIndex sessionNumber " +
        "lessonIndexes attendanceTaken attendance meetingLink meetingPlatform " +
        "recordingLink materials instructorNotes groupId courseId description"
      )
      .sort({ scheduledDate: 1, startTime: 1 })
      .limit(limit)
      .lean();

    // ── ترتيب الجلسات لكل جروب لحساب canAccess ───────────────────────────────
    const sessionsByGroup = {};
    groupIds.forEach((gid) => { sessionsByGroup[gid.toString()] = []; });

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

    const processedSessions = allSessions.map((session) => {
      const gid = session.groupId?._id?.toString() || session.groupId?.toString();
      const groupOrder = sessionsByGroup[gid] || [];
      const sessionIdx = groupOrder.findIndex(
        (s) => s._id.toString() === session._id.toString()
      );

      const isFirst      = sessionIdx === 0;
      const prevSession  = sessionIdx > 0 ? groupOrder[sessionIdx - 1] : null;
      const prevCompleted = isFirst || (prevSession && prevSession.status === "completed");

      // ✅ هل الجروب على Hold؟ (من الـ session.groupId أو من الـ map)
      const sessionGroupHold = !!session.groupId?.hold?.isHeld;
      const groupIsOnHold =
        sessionGroupHold || !!groupHoldMap[gid];

      // ✅ هل الجروب فعّال أصلًا؟
      const sessionGroupStatus = session.groupId?.status || groupStatusMap[gid] || "draft";
      const groupIsActive = sessionGroupStatus === "active";

      // ✅ canAccess الأساسي
      let canAccess =
        session.status === "completed" ||
        (prevCompleted && session.status !== "cancelled");

      // ✅ OVERRIDE: لو الجروب على Hold أو مش active → مفيش وصول لأي سيشن
      // (ما عدا السيشنات المكتملة — دي تاريخية ويشوفوها عادي)
      if (session.status !== "completed") {
        if (groupIsOnHold || !groupIsActive) {
          canAccess = false;
        }
      }

      // Attendance
      const attRecord = session.attendance?.find(
        (a) => a.studentId?.toString() === student._id.toString()
      );
      const studentAttendance = attRecord
        ? attRecord.status
        : session.status === "completed" ? "absent" : null;

      // Join button
      const sessionDate = new Date(session.scheduledDate);
      const todayStart  = new Date(now); todayStart.setHours(0, 0, 0, 0);
      const todayEnd    = new Date(now); todayEnd.setHours(23, 59, 59, 999);
      const isToday     = sessionDate >= todayStart && sessionDate <= todayEnd;

      const [endH = 23, endM = 59] = (session.endTime || "23:59").split(":").map(Number);
      const sessionEndTime = new Date(sessionDate);
      sessionEndTime.setHours(endH, endM, 0, 0);

      // ✅ showJoinButton: لازم الجروب مش على Hold ومش inactive
      let showJoinButton =
        prevCompleted &&
        session.status === "scheduled" &&
        isToday &&
        sessionEndTime > now &&
        !!session.meetingLink;

      if (groupIsOnHold || !groupIsActive) {
        showJoinButton = false;
      }

      // ── الدروس من الـ curriculum ──────────────────────────────────────────
      const curriculum  = groupCurriculumMap[gid] || [];
      const moduleData  = curriculum[session.moduleIndex] || {};

      const bySessionNum = (moduleData.lessons || []).filter(
        (l) => l.sessionNumber === session.sessionNumber
      );
      const byIndexes = (moduleData.lessons || []).filter(
        (l) => (session.lessonIndexes || []).includes(l.order - 1)
      );
      const rawLessons = bySessionNum.length > 0 ? bySessionNum : byIndexes;

      const lessons = rawLessons.map((l) => ({ title: l.title }));

      // ✅ Recording: للسيشنات المكتملة بس (Hold مش بيأثر على التاريخي)
      const recordingLink =
        session.status === "completed" ? session.recordingLink : null;

      // ✅ materials: بس للسيشنات اللي الطالب عنده وصول ليها
      const materials =
        (session.status === "completed" || canAccess) && !groupIsOnHold
          ? session.materials || []
          : session.status === "completed"
            ? session.materials || []
            : [];

      return {
        _id:              session._id,
        title:            session.title,
        description:      session.description || "",
        status:           session.status,
        scheduledDate:    session.scheduledDate,
        startTime:        session.startTime,
        endTime:          session.endTime,
        moduleIndex:      session.moduleIndex,
        moduleName:       moduleData.title || `الوحدة ${session.moduleIndex + 1}`,
        sessionNumber:    session.sessionNumber,
        lessons,
        attendanceTaken:  session.attendanceTaken,
        studentAttendance,
        meetingLink:      canAccess ? session.meetingLink : null,
        meetingPlatform:  session.meetingPlatform,
        recordingLink,
        materials,
        instructorNotes:  session.status === "completed" ? session.instructorNotes : null,
        canAccess,
        isToday,
        showJoinButton,

        // ✅ Hold info — جديد
        groupIsOnHold,
        groupIsActive,

        group: {
          _id:  session.groupId?._id || session.groupId,
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
    }).select("status groupId").lean();

    // ✅ إحصائيات الـ Hold — جديد
    const heldGroupIds = Object.keys(groupHoldMap).filter(
      (gid) => groupHoldMap[gid]
    );
    const heldSessions = statsAll.filter((s) =>
      heldGroupIds.includes(s.groupId?.toString())
    );

    const stats = {
      total:     statsAll.length,
      completed: statsAll.filter((s) => s.status === "completed").length,
      scheduled: statsAll.filter((s) => s.status === "scheduled").length,
      cancelled: statsAll.filter((s) => s.status === "cancelled").length,
      postponed: statsAll.filter((s) => s.status === "postponed").length,

      // ✅ جديد: كم سيشن متأثر بالـ Hold
      onHold: heldSessions.filter((s) => s.status !== "completed").length,
    };

    return NextResponse.json({
      success: true,
      data: { sessions: processedSessions, stats, studentId: student._id },
    });
  } catch (error) {
    console.error("❌ [All Sessions API] Error:", error);
    return NextResponse.json(
      { success: false, message: "فشل في تحميل الجلسات", error: error.message },
      { status: 500 }
    );
  }
}