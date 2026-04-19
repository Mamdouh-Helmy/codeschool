// /api/sessions/[id]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Session from "../../../models/Session";
import Group from "../../../models/Group";
import { requireAdmin } from "@/utils/authMiddleware";
import { onSessionStatusChanged } from "@/app/services/groupAutomation";
import mongoose from "mongoose";

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
      .populate("groupId",  "name code")
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
        recordingLink:   session.recordingLink,
        attendanceTaken: session.attendanceTaken,
        attendance: {
          total:   attendance.length,
          present: attendance.filter((a) => a.status === "present").length,
          absent:  attendance.filter((a) => a.status === "absent").length,
          late:    attendance.filter((a) => a.status === "late").length,
          excused: attendance.filter((a) => a.status === "excused").length,
        },
        group: session.groupId
          ? { id: session.groupId._id, name: session.groupId.name, code: session.groupId.code }
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
      completed:  await Session.countDocuments({ ...query, status: "completed"  }),
      cancelled:  await Session.countDocuments({ ...query, status: "cancelled"  }),
      postponed:  await Session.countDocuments({ ...query, status: "postponed"  }),
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

    const session = await Session.create({
      groupId, courseId, moduleIndex, sessionNumber, lessonIndexes,
      title, description: description || "",
      scheduledDate:  new Date(scheduledDate),
      startTime, endTime,
      status:         "scheduled",
      meetingLink:    meetingLink || "",
      meetingPlatform: meetingPlatform || null,
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

    const existingSession = await Session.findOne({ _id: id, isDeleted: false }).populate("groupId");
    if (!existingSession) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
    }

    const oldStatus = existingSession.status;
    const newStatus = updateData.status;

    // ── Build update payload ───────────────────────────────────────────────
    const updatePayload = {
      meetingLink:      updateData.meetingLink      || "",
      recordingLink:    updateData.recordingLink    || "",
      instructorNotes:  updateData.instructorNotes  || "",
      status:           newStatus,
      "metadata.updatedBy": adminUser.id,
      "metadata.updatedAt": new Date(),
    };

    // ✅ حفظ metadata في الـ DB (studentMessages, guardianMessages) للـ audit trail
    if (updateData.metadata && Object.keys(updateData.metadata).length > 0) {
      updatePayload["metadata.lastNotificationMessages"] = updateData.metadata;
    }

    const updatedSession = await Session.findByIdAndUpdate(id, updatePayload, {
      new:            true,
      runValidators:  true,
    })
      .populate("groupId",  "name code automation courseSnapshot instructors")
      .populate("courseId", "title");

    console.log(`✅ Session updated: ${updatedSession.title} | ${oldStatus} → ${newStatus}`);

    // ── Add instructor hours when session completed ────────────────────────
    let instructorHoursResult = null;
    if (newStatus === "completed" && oldStatus !== "completed") {
      console.log(`\n⏱️ Session completed! Adding 2 hours to group instructors...`);
      try {
        const group = await Group.findById(existingSession.groupId._id || existingSession.groupId);
        if (group && group.instructors && group.instructors.length > 0) {
          instructorHoursResult = await group.addInstructorHours(2);
          console.log(`✅ Instructor hours added:`, instructorHoursResult);
        }
      } catch (err) {
        console.error(`❌ Error adding instructor hours:`, err);
      }
    }

    // ── Trigger notifications for cancelled / postponed ───────────────────
    if (
      newStatus &&
      oldStatus !== newStatus &&
      (newStatus === "cancelled" || newStatus === "postponed")
    ) {
      console.log(`🔄 Triggering ${newStatus} notifications...`);
      console.log(`📝 Student messages:  ${Object.keys(updateData.metadata?.studentMessages  || {}).length}`);
      console.log(`📝 Guardian messages: ${Object.keys(updateData.metadata?.guardianMessages || {}).length}`);

      setTimeout(async () => {
        try {
          // ✅ FIX: نمرر metadata كامل لـ onSessionStatusChanged
          // اللي بتقرأ:
          //   metadata.studentMessages[studentId]  — rendered message للطالب
          //   metadata.guardianMessages[studentId] — rendered message لولي الأمر
          const automationResult = await onSessionStatusChanged(
            id,
            newStatus,
            null,                                                    // customMessage (global) — مش بنستخدمه
            newStatus === "postponed" ? updateData.newDate : null,   // newDate
            newStatus === "postponed" ? updateData.newTime : null,   // newTime
            updateData.metadata || {}                                // ✅ { studentMessages, guardianMessages }
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