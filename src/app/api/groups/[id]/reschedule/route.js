// app/api/groups/[id]/reschedule/route.js
//
// PUT  -> reschedule a group's NON-completed sessions to a new date/time pattern.
// GET  -> preview what would happen (counts + affected sessions) before committing.
//
// الـ PUT بيعمل فحصين قبل الحفظ:
//   1. تعارض مدرسين: لو أي مدرس من مدرسين الجروب ده موجود في جروب تاني
//      في نفس اليوم ونفس الوقت (تداخل) → 409 مع conflicts
//      (جروبين بنفس الميعاد ومدرسين مختلفين = مفيش تعارض)
//   2. تعارض مع اللينكات المستخدمة حاليًا في سيشنات الجروب (لو محجوزة لجروب
//      تاني على نفس الأيام/الوقت الجديد) → 409 مع linkConflicts
//   - لو تمام → بيعمل update على التواريخ فقط (اللينكات بتفضل زي ما هي)
//
// ✅ بعد النجاح: بيصفّر flags التذكيرات + بيفتح الجروب لو كان completed

import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Group            from "../../../../models/Group";
import Session          from "../../../../models/Session";
import { requireAdmin } from "@/utils/authMiddleware";
import { rescheduleGroupSessions } from "@/utils/sessionGenerator";
import { checkInstructorConflicts } from "@/utils/groupValidation";
import mongoose         from "mongoose";

// ✅ الـ flags اللي لازم تتصفّر لما المعاد يتغير
const RESET_REMINDER_FLAGS = {
  "automationEvents.reminderSent": false,
  "automationEvents.reminder24hSent": false,
  "automationEvents.reminder1hSent": false,
  "automationEvents.reminder15minSent": false,
  "automationEvents.reminder24hOfflineSent": false,
  "automationEvents.reminder30minOfflineSent": false,
  "automationEvents.preAttendancePingSent": false,
};

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

    if (group.isArchived) {
      return NextResponse.json(
        { success: false, error: "الجروب مؤرشف — استرجعه من الأرشيف الأول" },
        { status: 400 },
      );
    }

    // ✅ نسمح بـ completed لو عنده سيشنات قادمة (جروب اتضاف له محتوى جديد)
    const pendingCount = await Session.countDocuments({
      groupId: id,
      isDeleted: false,
      status: { $in: ["scheduled", "postponed"] },
    });

    if (
      group.status !== "active" &&
      !(group.status === "completed" && pendingCount > 0)
    ) {
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

    // ── فحص تعارض المدرسين ──────────────────────────────────────────────────
    // بنرفض بس لو مدرس من مدرسين الجروب ده موجود في جروب تاني في نفس
    // اليوم ونفس الوقت. جروبات بنفس الميعاد ومدرسين تانيين مش بتتعارض.
    const plainGroup = group.toObject();
    const groupInstructors = (plainGroup.instructors || []).map((i) => ({
      userId: i.userId?._id || i.userId,
    }));

    const instructorConflicts = await checkInstructorConflicts(
      groupInstructors,
      { daysOfWeek, timeFrom, timeTo },
      id,
    );

    if (instructorConflicts.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error:   "تعارض في مواعيد المدربين",
          // نفس شكل الداتا اللي ConflictAlert في الفورم متعود عليه
          conflicts: instructorConflicts.map((c) => ({
            groupName:      `${c.conflictGroupName} — المدرب: ${c.instructorName}`,
            groupCode:      c.conflictGroupCode,
            sharedDays:     c.conflictDays,
            theirTime:      c.conflictTime,
            instructorName: c.instructorName,
          })),
          message: instructorConflicts
            .map(
              (c) =>
                `المدرب "${c.instructorName}" موجود بالفعل في مجموعة "${c.conflictGroupName}" في نفس الموعد (${c.conflictDays.join("، ")} - ${c.conflictTime})`,
            )
            .join("\n"),
        },
        { status: 409 },
      );
    }

    // ── تطبيق الـ reschedule (date-only update، اللينكات بتفضل) ────────────
    // rescheduleGroupSessions بتعمل فحص إضافي على مستوى اللينكات نفسها (مش
    // بس جدول الجروب العام) وبترمي error بـ code = "LINK_CONFLICT" لو فيه
    // لينك مستخدم في سيشن من سيشنات الجروب متعارض فعليًا مع حجز جروب تاني
    let result;
    try {
      result = await rescheduleGroupSessions(
        id,
        group,
        { effectiveFrom, daysOfWeek, timeFrom, timeTo, timezone },
        adminUser.id,
        [],   // selectedLinkIds — مش محتاجينه هنا
      );
    } catch (error) {
      if (error.code === "LINK_CONFLICT") {
        return NextResponse.json(
          {
            success: false,
            error:   error.message,
            linkConflicts: (error.linkConflicts || []).map((c) => ({
              linkName:          c.linkName,
              conflictingGroupId: c.conflictingGroupId,
              conflictingDays:    c.conflictingDays,
              conflictingTime:    c.conflictingTime,
              affectedSessions:   c.affectedSessions,
            })),
            message:
              `اللينكات المرتبطة بسيشنات الجروب متعارضة مع ${error.linkConflicts?.length || 0} ` +
              `لينك محجوز لجروب تاني في نفس الميعاد الجديد. غيّر الميعاد أو حرّر اللينكات المتعارضة أولاً.`,
          },
          { status: 409 },
        );
      }
      throw error; // أي error تاني يروح للـ catch العام تحت
    }

    // تزامن totalSessionsCount
    const newTotal = await Session.countDocuments({ groupId: id, isDeleted: false });
    await Group.findByIdAndUpdate(id, { $set: { totalSessionsCount: newTotal } });

    // ✅ NEW: صفّر الـ flags للسيشنات غير المكتملة (المعاد اتغيّر)
    //    + اتأكد إن startTime/endTime بالوقت الجديد
    const flagsReset = await Session.updateMany(
      {
        groupId: id,
        isDeleted: false,
        status: { $in: ["scheduled", "postponed"] },
      },
      {
        $set: {
          startTime: timeFrom,
          endTime: timeTo,
          ...RESET_REMINDER_FLAGS,
        },
      },
    );

    // ✅ NEW: افتح الجروب لو كان completed وعنده سيشنات قادمة
    let reopened = false;
    try {
      const fresh = await Group.findById(id);
      if (fresh) {
        const r = await fresh.reopenAfterNewContent();
        reopened = !!r.reopened;
      }
    } catch (e) {
      console.error("⚠️ reopenAfterNewContent (reschedule) failed:", e.message);
    }

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
        remindersReset:   flagsReset.modifiedCount || 0,
        reopened,
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