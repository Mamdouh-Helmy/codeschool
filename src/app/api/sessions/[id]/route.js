import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Session from "../../../models/Session";
import Course from "../../../models/Course";
import Student from "../../../models/Student";
import User from "../../../models/User";
import { requireAdmin } from "@/utils/authMiddleware";
import { onSessionStatusChanged } from "@/app/services/groupAutomation";
import mongoose from "mongoose";

// GET: Fetch sessions with filters
export async function GET(req) {
  try {
    console.log("🔍 Fetching sessions...");

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build query
    const query = { isDeleted: false };

    if (groupId) {
      if (!mongoose.Types.ObjectId.isValid(groupId)) {
        return NextResponse.json(
          { success: false, error: "Invalid group ID format" },
          { status: 400 }
        );
      }
      query.groupId = new mongoose.Types.ObjectId(groupId);
    }

    if (status) {
      query.status = status;
    }

    console.log("📊 Query:", query);

    // Get total count
    const total = await Session.countDocuments(query);

    // Get sessions
    const sessions = await Session.find(query)
      .populate("groupId", "name code")
      .populate("courseId", "title level")
      .populate("attendance.studentId", "personalInfo.fullName enrollmentNumber")
      .sort({ scheduledDate: 1, startTime: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    console.log(`✅ Found ${sessions.length} sessions`);

    // Format sessions with computed properties
    const formattedSessions = sessions.map((session) => {
      const scheduledDate = new Date(session.scheduledDate);
      const dayName = scheduledDate.toLocaleDateString("en-US", {
        weekday: "long",
      });
      const formattedDate = scheduledDate.toISOString().split("T")[0];

      // Calculate attendance stats
      const attendance = session.attendance || [];
      const presentCount = attendance.filter(
        (a) => a.status === "present"
      ).length;
      const absentCount = attendance.filter((a) => a.status === "absent").length;
      const lateCount = attendance.filter((a) => a.status === "late").length;
      const excusedCount = attendance.filter(
        (a) => a.status === "excused"
      ).length;

      return {
        id: session._id,
        title: session.title,
        description: session.description,
        sessionNumber: session.sessionNumber,
        moduleIndex: session.moduleIndex,
        lessonIndexes: session.lessonIndexes,
        scheduledDate: session.scheduledDate,
        formattedDate,
        dayName,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        meetingLink: session.meetingLink,
        meetingPlatform: session.meetingPlatform,
        recordingLink: session.recordingLink,
        attendanceTaken: session.attendanceTaken,
        attendance: {
          total: attendance.length,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          excused: excusedCount,
        },
        group: session.groupId
          ? {
              id: session.groupId._id,
              name: session.groupId.name,
              code: session.groupId.code,
            }
          : null,
        course: session.courseId
          ? {
              id: session.courseId._id,
              title: session.courseId.title,
              level: session.courseId.level,
            }
          : null,
        instructorNotes: session.instructorNotes,
        materials: session.materials || [],
        automationEvents: session.automationEvents,
        createdAt: session.createdAt || session.metadata?.createdAt,
        updatedAt: session.updatedAt || session.metadata?.updatedAt,
      };
    });

    // Calculate stats
    const stats = {
      total,
      scheduled: await Session.countDocuments({ ...query, status: "scheduled" }),
      completed: await Session.countDocuments({ ...query, status: "completed" }),
      cancelled: await Session.countDocuments({ ...query, status: "cancelled" }),
      postponed: await Session.countDocuments({ ...query, status: "postponed" }),
    };

    return NextResponse.json({
      success: true,
      data: formattedSessions,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching sessions:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch sessions",
      },
      { status: 500 }
    );
  }
}

// POST: Create new session (manual creation)
export async function POST(req) {
  try {
    console.log("🆕 Creating new session...");

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const adminUser = authCheck.user;
    await connectDB();

    const body = await req.json();
    console.log("📥 Session data:", body);

    const {
      groupId,
      courseId,
      moduleIndex,
      sessionNumber,
      lessonIndexes,
      title,
      description,
      scheduledDate,
      startTime,
      endTime,
      meetingLink,
      meetingPlatform,
    } = body;

    // Validation
    if (
      !groupId ||
      !courseId ||
      moduleIndex === undefined ||
      !sessionNumber ||
      !lessonIndexes ||
      !title ||
      !scheduledDate ||
      !startTime ||
      !endTime
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    // Check for duplicate session
    const existingSession = await Session.findOne({
      groupId,
      moduleIndex,
      sessionNumber,
      isDeleted: false,
    });

    if (existingSession) {
      return NextResponse.json(
        {
          success: false,
          error: "Session already exists for this module and session number",
        },
        { status: 409 }
      );
    }

    // Create session
    const sessionData = {
      groupId,
      courseId,
      moduleIndex,
      sessionNumber,
      lessonIndexes,
      title,
      description: description || "",
      scheduledDate: new Date(scheduledDate),
      startTime,
      endTime,
      status: "scheduled",
      meetingLink: meetingLink || "",
      meetingPlatform: meetingPlatform || null,
      attendanceTaken: false,
      attendance: [],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: adminUser.id,
      },
    };

    const session = await Session.create(sessionData);

    const populatedSession = await Session.findById(session._id)
      .populate("groupId", "name code")
      .populate("courseId", "title level")
      .lean();

    console.log(`✅ Session created: ${session.title}`);

    return NextResponse.json(
      {
        success: true,
        message: "Session created successfully",
        data: populatedSession,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error creating session:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors || {})
        .map((err) => err.message)
        .join("; ");

      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: messages,
        },
        { status: 400 }
      );
    }

    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          error: "Duplicate session detected",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create session",
      },
      { status: 500 }
    );
  }
}

// PUT: Update session with custom message support
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    console.log(`✏️ Updating session: ${id}`);

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const adminUser = authCheck.user;
    await connectDB();

    const updateData = await req.json();
    console.log(`📦 Update data:`, {
      status: updateData.status,
      hasStudentMessage: !!updateData.metadata?.studentMessage,
      hasGuardianMessage: !!updateData.metadata?.guardianMessage
    });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid session ID format" },
        { status: 400 }
      );
    }

    const existingSession = await Session.findOne({
      _id: id,
      isDeleted: false,
    }).populate("groupId");

    if (!existingSession) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    const oldStatus = existingSession.status;
    const newStatus = updateData.status;

    const updatePayload = {
      meetingLink: updateData.meetingLink || "",
      recordingLink: updateData.recordingLink || "",
      instructorNotes: updateData.instructorNotes || "",
      status: newStatus,
      "metadata.updatedBy": adminUser.id,
      "metadata.updatedAt": new Date(),
    };

    // حفظ الرسائل المخصصة كما هي
    if (updateData.metadata) {
      updatePayload["metadata.studentMessage"] = updateData.metadata.studentMessage;
      updatePayload["metadata.guardianMessage"] = updateData.metadata.guardianMessage;
    }

    const updatedSession = await Session.findByIdAndUpdate(id, updatePayload, {
      new: true,
      runValidators: true,
    })
      .populate("groupId", "name code automation courseSnapshot")
      .populate("courseId", "title");

    console.log(`✅ Session updated: ${updatedSession.title}`);

    // تشغيل الأتمتة إذا تغيرت الحالة
    if (newStatus && oldStatus !== newStatus && (newStatus === "cancelled" || newStatus === "postponed")) {
      console.log(`🔄 Triggering automation for ${newStatus}...`);

      // تشغيل في الخلفية
      setTimeout(async () => {
        try {
          let newDate = null;
          let newTime = null;
          
          if (newStatus === "postponed") {
            newDate = updateData.newDate;
            newTime = updateData.newTime;
          }
          
          const automationResult = await onSessionStatusChanged(
            id,
            newStatus,
            null,
            newDate,
            newTime,
            updateData.metadata || {}
          );
          
          console.log("✅ Automation completed:", {
            success: automationResult.success,
            sent: automationResult.successCount
          });
        } catch (automationError) {
          console.error("❌ Automation failed:", automationError);
        }
      }, 500);

      return NextResponse.json({
        success: true,
        message: "Session updated successfully",
        data: updatedSession,
        automation: {
          triggered: true,
          action: `Sending ${newStatus} notifications`,
          studentMessageSaved: !!updateData.metadata?.studentMessage,
          guardianMessageSaved: !!updateData.metadata?.guardianMessage
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Session updated successfully",
      data: updatedSession,
    });

  } catch (error) {
    console.error("❌ Error updating session:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Soft delete session
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    console.log(`🗑️ Soft deleting session: ${id}`);

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid session ID format" },
        { status: 400 }
      );
    }

    const deletedSession = await Session.findByIdAndUpdate(
      id,
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          status: "cancelled",
        },
      },
      { new: true }
    );

    if (!deletedSession) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    console.log(`✅ Session deleted: ${deletedSession.title}`);

    return NextResponse.json({
      success: true,
      message: "Session deleted successfully (soft delete)",
      data: {
        id: deletedSession._id,
        title: deletedSession.title,
        deletedAt: deletedSession.deletedAt,
      },
    });
  } catch (error) {
    console.error("❌ Error deleting session:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete session",
      },
      { status: 500 }
    );
  }
}