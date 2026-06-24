// app/api/groups/[id]/reschedule/route.js
//
// PUT  -> reschedule a group's NON-completed sessions to a new date/time pattern.
// GET  -> preview what would happen (counts + affected sessions) before committing.
//
// الـ PUT بيعمل فحص تعارض مع الجروبات التانية قبل الحفظ:
//   - لو جروب تاني نشط عنده نفس الأيام + وقت متداخل → بيرجع خطأ 409
//   - لو تمام → بيعمل update على التواريخ فقط (اللينكات بتفضل زي ما هي)

import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Group            from "../../../../models/Group";
import Session          from "../../../../models/Session";
import { requireAdmin } from "@/utils/authMiddleware";
import { rescheduleGroupSessions } from "@/utils/sessionGenerator";
import mongoose         from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: فحص التعارض مع الجروبات التانية
// تعارض = نفس الأيام (أي يوم مشترك) + وقت متداخل
// ─────────────────────────────────────────────────────────────────────────────
function timesOverlap(fromA, toA, fromB, toB) {
  // HH:MM → number للمقارنة السريعة
  const toNum = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const aStart = toNum(fromA), aEnd = toNum(toA);
  const bStart = toNum(fromB), bEnd = toNum(toB);
  return aStart < bEnd && bStart < aEnd;
}

async function findConflictingGroups(currentGroupId, daysOfWeek, timeFrom, timeTo) {
  // نجيب كل الجروبات النشطة الـ sessions متولدة ليها ومش نفس الجروب
  const otherGroups = await Group.find({
    _id:               { $ne: currentGroupId },
    status:            "active",
    sessionsGenerated: true,
    isDeleted:         false,
    "schedule.daysOfWeek": { $in: daysOfWeek },   // عنده على الأقل يوم مشترك
  })
    .select("name code schedule.daysOfWeek schedule.timeFrom schedule.timeTo")
    .lean();

  const conflicts = [];

  for (const g of otherGroups) {
    const sharedDays = (g.schedule?.daysOfWeek || []).filter((d) =>
      daysOfWeek.includes(d),
    );
    if (sharedDays.length === 0) continue;

    if (timesOverlap(timeFrom, timeTo, g.schedule.timeFrom, g.schedule.timeTo)) {
      conflicts.push({
        id:         g._id,
        name:       g.name,
        code:       g.code,
        sharedDays,
        timeFrom:   g.schedule.timeFrom,
        timeTo:     g.schedule.timeTo,
      });
    }
  }

  return conflicts;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET: Preview impact of a reschedule before applying it
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid group ID" },
        { status: 400 },
      );
    }

    const group = await Group.findOne({ _id: id, isDeleted: false });
    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 },
      );
    }

    const allSessions = await Session.find({
      groupId: id,
      isDeleted: false,
    }).sort({ moduleIndex: 1, sessionNumber: 1 });

    const completed = allSessions.filter((s) => s.status === "completed");
    const scheduled = allSessions.filter((s) => s.status === "scheduled");
    const cancelled = allSessions.filter((s) => s.status === "cancelled");
    const postponed = allSessions.filter((s) => s.status === "postponed");
    const affected  = [...scheduled, ...cancelled, ...postponed];

    return NextResponse.json({
      success: true,
      data: {
        totalSessions:  allSessions.length,
        completedCount: completed.length,
        affectedCount:  affected.length,
        breakdown: {
          scheduled: scheduled.length,
          cancelled: cancelled.length,
          postponed: postponed.length,
        },
        // لا يوجد release في الـ flow الجديد
        linksToRelease: 0,
        note: "Session dates will be updated in-place. Meeting links are preserved.",
        frozenSessions: completed.map((s) => ({
          id:            s._id,
          moduleIndex:   s.moduleIndex,
          sessionNumber: s.sessionNumber,
          title:         s.title,
          scheduledDate: s.scheduledDate,
        })),
        affectedSessions: affected.map((s) => ({
          id:            s._id,
          moduleIndex:   s.moduleIndex,
          sessionNumber: s.sessionNumber,
          title:         s.title,
          status:        s.status,
          scheduledDate: s.scheduledDate,
          hasMeetingLink: !!s.meetingLink,
        })),
      },
    });
  } catch (error) {
    console.error("❌ GET reschedule preview error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT: Apply the reschedule
// ─────────────────────────────────────────────────────────────────────────────
export async function PUT(req, { params }) {
  try {
    const { id } = await params;

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const adminUser = authCheck.user;
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid group ID format" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const {
      effectiveFrom,
      daysOfWeek,
      timeFrom,
      timeTo,
      timezone,
    } = body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!effectiveFrom || !daysOfWeek?.length || !timeFrom || !timeTo) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: effectiveFrom, daysOfWeek, timeFrom, timeTo",
        },
        { status: 400 },
      );
    }

    if (daysOfWeek.length > 3) {
      return NextResponse.json(
        { success: false, error: "A maximum of 3 days can be selected" },
        { status: 400 },
      );
    }

    const group = await Group.findOne({ _id: id, isDeleted: false }).populate("courseId");
    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 },
      );
    }

    if (group.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          error: `Reschedule is only available for active groups. Current status: ${group.status}`,
        },
        { status: 400 },
      );
    }

    if (!group.sessionsGenerated) {
      return NextResponse.json(
        {
          success: false,
          error: "Group has no generated sessions yet. Use the regular update instead.",
        },
        { status: 400 },
      );
    }

    // ── فحص التعارض مع الجروبات التانية ────────────────────────────────────
    const conflicts = await findConflictingGroups(id, daysOfWeek, timeFrom, timeTo);

    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error:   "Schedule conflict detected with other active groups",
          conflicts: conflicts.map((c) => ({
            groupName:  c.name,
            groupCode:  c.code,
            sharedDays: c.sharedDays,
            theirTime:  `${c.timeFrom} - ${c.timeTo}`,
          })),
          message:
            `The selected schedule conflicts with ${conflicts.length} other group(s). ` +
            `Please choose a different time or days.`,
        },
        { status: 409 },
      );
    }

    // ── تطبيق الـ reschedule (date-only update، اللينكات بتفضل) ────────────
    const result = await rescheduleGroupSessions(
      id,
      group,
      { effectiveFrom, daysOfWeek, timeFrom, timeTo, timezone },
      adminUser.id,
      [],   // selectedLinkIds — مش محتاجينه هنا
    );

    // تزامن totalSessionsCount
    const newTotal = await Session.countDocuments({ groupId: id, isDeleted: false });
    await Group.findByIdAndUpdate(id, { $set: { totalSessionsCount: newTotal } });

    return NextResponse.json({
      success: true,
      message: result.message,
      data: {
        groupId:          id,
        regeneratedCount: result.regenerated,
        frozenCount:      result.frozen,
        linksReleased:    0,
        newStartDate:     result.startDate,
        newEndDate:       result.endDate,
        note:             "Meeting links were preserved on all sessions.",
      },
    });
  } catch (error) {
    console.error("❌ Error rescheduling group:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reschedule group" },
      { status: 500 },
    );
  }
}