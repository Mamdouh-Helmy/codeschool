// /api/sessions/[id]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Session from "../../../models/Session";
import Group from "../../../models/Group";
import { requireAdmin } from "@/utils/authMiddleware";
import { onSessionStatusChanged } from "../../../services/groupAutomation";
import mongoose from "mongoose";

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

  if (hold.holdType === "sessions") {
    const consumed = hold.holdSessionsConsumed || 0;
    if (consumed === 0) return true;
    return myIndex < consumed;
  }

  if (hold.holdType === "until_session") {
    const targetId = hold.holdUntilSessionId;
    if (!targetId) return true;
    const targetIndex = sorted.findIndex((s) => String(s._id) === String(targetId));
    if (targetIndex === -1) return true;
    return myIndex <= targetIndex;
  }

  return false;
}

// ============================================================
// GET
// ============================================================
export async function GET(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");
    const status  = searchParams.get("status");
    const page    = parseInt(searchParams.get("page")  || "1");
    const limit   = parseInt(searchParams.get("limit") || "50");

    const query = { isDeleted: false };
    if (groupId) {
      if (!mongoose.Types.ObjectId.isValid(groupId))
        return NextResponse.json({ success: false, error: "Invalid group ID format" }, { status: 400 });
      query.groupId = new mongoose.Types.ObjectId(groupId);
    }
    if (status) query.status = status;

    const total    = await Session.countDocuments(query);
    const sessions = await Session.find(query)
      .populate("groupId",  "name code deliveryMode hold status")
      .populate("courseId", "title level")
      .populate("attendance.studentId", "personalInfo.fullName enrollmentNumber")
      .sort({ scheduledDate: 1, startTime: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const formattedSessions = sessions.map((session) => {
      const scheduledDate = new Date(session.scheduledDate);
      const dayName       = scheduledDate.toLocaleDateString("en-US", { weekday: "long" });
      const formattedDate = scheduledDate.toISOString().split("T")[0];
      const attendance    = session.attendance || [];

      return {
        id:              session._id,
        title:           session.title,
        description:     session.description,
        sessionNumber:   session.sessionNumber,
        moduleIndex:     session.moduleIndex,
        lessonIndexes:   session.lessonIndexes,
        scheduledDate:   session.scheduledDate,
        formattedDate,
        dayName,
        startTime:       session.startTime,
        endTime:         session.endTime,
        status:          session.status,
        meetingLink:     session.meetingLink,
        meetingPlatform: session.meetingPlatform,
        meetingCredentials: session.meetingCredentials || null,
        recordingLink:   session.recordingLink,
        attendanceTaken: session.attendanceTaken,

        deliveryMode:    session.deliveryMode || session.groupId?.deliveryMode || "online",
        actualStartTime: session.actualStartTime || "",
        actualEndTime:   session.actualEndTime || "",
        payroll: session.payroll || { processed: false, durationMinutes: 0, entriesCount: 0 },

        attendance: {
          total:   attendance.length,
          present: attendance.filter((a) => a.status === "present").length,
          absent:  attendance.filter((a) => a.status === "absent").length,
          late:    attendance.filter((a) => a.status === "late").length,
          excused: attendance.filter((a) => a.status === "excused").length,
        },

        group: session.groupId
          ? {
              id: session.groupId._id,
              name: session.groupId.name,
              code: session.groupId.code,
              isOnHold: !!session.groupId.hold?.isHeld,
              status: session.groupId.status || null,
              hold: session.groupId.hold || null,
            }
          : null,

        course: session.courseId
          ? { id: session.courseId._id, title: session.courseId.title, level: session.courseId.level }
          : null,
        instructorNotes:  session.instructorNotes,
        materials:        session.materials || [],
        automationEvents: session.automationEvents,
        createdAt:        session.createdAt || session.metadata?.createdAt,
        updatedAt:        session.updatedAt || session.metadata?.updatedAt,
      };
    });

    const stats = {
      total,
      scheduled: await Session.countDocuments({ ...query, status: "scheduled" }),
      completed: await Session.countDocuments({ ...query, status: "completed" }),
      cancelled: await Session.countDocuments({ ...query, status: "cancelled" }),
      postponed: await Session.countDocuments({ ...query, status: "postponed" }),
    };

    return NextResponse.json({
      success: true,
      data:    formattedSessions,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext:    page < Math.ceil(total / limit),
        hasPrev:    page > 1,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching sessions:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

// ============================================================
// POST
// ============================================================
export async function POST(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const adminUser = authCheck.user;
    await connectDB();

    const body = await req.json();
    const {
      groupId, courseId, moduleIndex, sessionNumber, lessonIndexes,
      title, description, scheduledDate, startTime, endTime,
      meetingLink, meetingPlatform,
    } = body;

    if (
      !groupId || !courseId || moduleIndex === undefined || !sessionNumber ||
      !lessonIndexes || !title || !scheduledDate || !startTime || !endTime
    ) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const existingSession = await Session.findOne({
      groupId, moduleIndex, sessionNumber, isDeleted: false,
    });
    if (existingSession) {
      return NextResponse.json(
        { success: false, error: "Session already exists for this module and session number" },
        { status: 409 }
      );
    }

    const group = await Group.findById(groupId).select("deliveryMode").lean();

    const session = await Session.create({
      groupId, courseId, moduleIndex, sessionNumber, lessonIndexes,
      title, description: description || "",
      scheduledDate:  new Date(scheduledDate),
      startTime, endTime,
      status:         "scheduled",
      meetingLink:    meetingLink || "",
      meetingPlatform: meetingPlatform || null,
      deliveryMode:   group?.deliveryMode || "online",
      attendanceTaken: false,
      attendance:      [],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: adminUser.id,
      },
    });

    const populatedSession = await Session.findById(session._id)
      .populate("groupId",  "name code")
      .populate("courseId", "title level")
      .lean();

    return NextResponse.json(
      { success: true, message: "Session created successfully", data: populatedSession },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error creating session:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors || {}).map((e) => e.message).join("; ");
      return NextResponse.json({ success: false, error: "Validation failed", details: messages }, { status: 400 });
    }
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: "Duplicate session detected" }, { status: 409 });
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create session" },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT
// ============================================================

function shiftTimeByDuration(oldStart, oldEnd, newStart) {
  const toMinutes = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const toTimeStr = (mins) => {
    const normalized = ((mins % 1440) + 1440) % 1440;
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };
  const durationMin = toMinutes(oldEnd) - toMinutes(oldStart);
  return toTimeStr(toMinutes(newStart) + durationMin);
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    console.log(`\n✏️ Updating session: ${id}`);

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const adminUser = authCheck.user;
    await connectDB();

    const updateData = await req.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid session ID format" }, { status: 400 });
    }

    const existingSession = await Session.findOne({ _id: id, isDeleted: false })
      .populate({
        path: "groupId",
        select: "name code automation courseSnapshot instructors deliveryMode hold status",
      });

    if (!existingSession) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
    }

    // ═══════════════════════════════════════════════════════════════════
    // ✅ HOLD GUARD — منع التعديل لو السيشن دي بالتحديد مقفولة
    // ═══════════════════════════════════════════════════════════════════
    const groupIsOnHold = !!existingSession.groupId?.hold?.isHeld;

    if (groupIsOnHold) {
      const allGroupSessions = await Session.find({
        groupId: existingSession.groupId._id || existingSession.groupId,
        isDeleted: false,
      })
        .select("_id moduleIndex sessionNumber scheduledDate status")
        .lean();

      const sessionIsLocked = isSessionLockedByHold(
        {
          _id: existingSession._id,
          moduleIndex: existingSession.moduleIndex,
          sessionNumber: existingSession.sessionNumber,
          status: existingSession.status,
        },
        existingSession.groupId,
        allGroupSessions
      );

      if (sessionIsLocked) {
        return NextResponse.json(
          {
            success: false,
            error: "السيشن دي مقفولة بسبب الـ Hold — مينفعش تعدّل أي حاجة فيها",
            code: "SESSION_ON_HOLD",
          },
          { status: 403 }
        );
      }
    }

    const oldStatus = existingSession.status;
    const newStatus = updateData.status;

    const isNewlyCancelled    = newStatus === "cancelled" && oldStatus !== "cancelled";
    const isPostponedWithDate = newStatus === "postponed" && !!updateData.newDate;

    const basePayload = {
      meetingLink:      updateData.meetingLink      || "",
      recordingLink:    updateData.recordingLink    || "",
      instructorNotes:  updateData.instructorNotes  || "",
      "metadata.updatedBy": adminUser.id,
      "metadata.updatedAt": new Date(),
    };

    if (updateData.actualStartTime) basePayload.actualStartTime = updateData.actualStartTime;
    if (updateData.actualEndTime)   basePayload.actualEndTime   = updateData.actualEndTime;

    if (updateData.metadata && Object.keys(updateData.metadata).length > 0) {
      basePayload["metadata.lastNotificationMessages"] = updateData.metadata;
    }

    let cascadeResult = null;
    let updatedSession = null;

    if (isNewlyCancelled) {
      try {
        cascadeResult = await Session.cascadeShiftOnCancel(id, adminUser.id, 7);
        console.log(
          `🔁 Cascade cancel: shifted ${cascadeResult.shiftedCount} session(s), skipped ${cascadeResult.skippedCount}`
        );
      } catch (cascadeError) {
        console.error("❌ Error cascading cancel:", cascadeError);
        return NextResponse.json(
          { success: false, error: cascadeError.message || "فشل إلغاء السيشن وترحيل الباقي" },
          { status: 400 }
        );
      }

      updatedSession = await Session.findByIdAndUpdate(id, basePayload, {
        new:           true,
        runValidators: true,
      })
        .populate("groupId",  "name code automation courseSnapshot instructors deliveryMode hold status")
        .populate("courseId", "title");

    } else if (isPostponedWithDate) {
      const oldStart = existingSession.startTime;
      const oldEnd   = existingSession.endTime;
      const newStart = updateData.newTime || oldStart;

      basePayload.status        = newStatus;
      basePayload.scheduledDate = new Date(updateData.newDate);
      basePayload.startTime     = newStart;
      basePayload.endTime       = shiftTimeByDuration(oldStart, oldEnd, newStart);

      updatedSession = await Session.findByIdAndUpdate(id, basePayload, {
        new:           true,
        runValidators: true,
      })
        .populate("groupId",  "name code automation courseSnapshot instructors deliveryMode hold status")
        .populate("courseId", "title");

    } else {
      basePayload.status = newStatus;

      updatedSession = await Session.findByIdAndUpdate(id, basePayload, {
        new:           true,
        runValidators: true,
      })
        .populate("groupId",  "name code automation courseSnapshot instructors deliveryMode hold status")
        .populate("courseId", "title");
    }

    console.log(`✅ Session updated: ${updatedSession.title} | ${oldStatus} → ${newStatus}`);

    let instructorHoursResult = null;
    let payrollResult = null;

    if (newStatus === "completed" && oldStatus !== "completed") {
      try {
        const { processSessionPayroll } = await import("@/lib/payroll");
        payrollResult = await processSessionPayroll({
          sessionId: id,
          actualStartTime: updateData.actualStartTime || null,
          actualEndTime:   updateData.actualEndTime   || null,
          actedBy: adminUser.id,
          source: "admin_complete",
        });
      } catch (payrollError) {
        console.error("⚠️ Payroll processing failed:", payrollError.message);
        payrollResult = { success: false, error: payrollError.message };
      }

      try {
        const group = await Group.findById(existingSession.groupId._id || existingSession.groupId);
        if (group?.instructors?.length) {
          instructorHoursResult = await group.addInstructorHours(
            payrollResult?.durationMinutes || 0
          );
        }
      } catch (err) {
        console.error("❌ Error adding instructor hours:", err);
      }
    }

    if (
      oldStatus === "completed" &&
      newStatus &&
      newStatus !== "completed" &&
      ["cancelled", "postponed"].includes(newStatus)
    ) {
      try {
        const { cancelSessionPayroll } = await import("@/lib/payroll");
        const cancelRes = await cancelSessionPayroll(id, {
          actedBy: adminUser.id,
          reason: `تم تغيير حالة السيشن من completed إلى ${newStatus}`,
        });
        console.log(`💸 Payroll cancelled: ${cancelRes.cancelledCount} entry(ies)`);
      } catch (err) {
        console.error("⚠️ Failed to cancel payroll entries:", err.message);
      }
    }

    if (
      newStatus &&
      oldStatus !== newStatus &&
      (newStatus === "cancelled" || newStatus === "postponed")
    ) {
      console.log(`🔄 Triggering ${newStatus} notifications...`);

      setTimeout(async () => {
        try {
          const automationResult = await onSessionStatusChanged(
            id,
            newStatus,
            null,
            newStatus === "postponed" ? updateData.newDate : null,
            newStatus === "postponed" ? updateData.newTime : null,
            updateData.metadata || {}
          );

          console.log("✅ Automation completed:", {
            success: automationResult.success,
            sent:    automationResult.successCount,
            failed:  automationResult.failCount,
          });
        } catch (automationError) {
          console.error("❌ Automation failed:", automationError);
        }
      }, 500);

      return NextResponse.json({
        success: true,
        message: "Session updated successfully",
        data:    updatedSession,
        instructorHours: instructorHoursResult,
        payroll: payrollResult,
        cascade: cascadeResult,
        automation: {
          triggered: true,
          action:    `Sending ${newStatus} notifications`,
          studentMessagesCount:  Object.keys(updateData.metadata?.studentMessages  || {}).length,
          guardianMessagesCount: Object.keys(updateData.metadata?.guardianMessages || {}).length,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Session updated successfully",
      data:    updatedSession,
      instructorHours: instructorHoursResult,
      payroll: payrollResult,
      cascade: cascadeResult,
    });

  } catch (error) {
    console.error("❌ Error updating session:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================
// DELETE
// ============================================================
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid session ID format" }, { status: 400 });
    }

    const deletedSession = await Session.findByIdAndUpdate(
      id,
      { $set: { isDeleted: true, deletedAt: new Date(), status: "cancelled" } },
      { new: true }
    );

    if (!deletedSession) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
    }

    try {
      const { cancelSessionPayroll } = await import("@/lib/payroll");
      await cancelSessionPayroll(id, {
        actedBy: authCheck.user.id,
        reason: "تم حذف السيشن",
      });
    } catch (err) {
      console.error("⚠️ Failed to cancel payroll on delete:", err.message);
    }

    return NextResponse.json({
      success: true,
      message: "Session deleted successfully (soft delete)",
      data: {
        id:        deletedSession._id,
        title:     deletedSession.title,
        deletedAt: deletedSession.deletedAt,
      },
    });
  } catch (error) {
    console.error("❌ Error deleting session:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete session" },
      { status: 500 }
    );
  }
}