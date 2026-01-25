// app/api/meeting-links/[id]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import MeetingLink from "../../../models/MeetingLink";
import Session from "../../../models/Session";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

// GET: Fetch single meeting link by ID
export async function GET(req, { params }) {
  try {
    console.log("🔍 Fetching meeting link by ID...");

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid meeting link ID format" },
        { status: 400 },
      );
    }

    const meetingLink = await MeetingLink.findOne({
      _id: id,
      isDeleted: false,
    }).lean();

    if (!meetingLink) {
      return NextResponse.json(
        { success: false, error: "Meeting link not found" },
        { status: 404 },
      );
    }

    // Calculate if link is currently in use
    const now = new Date();
    let isInUse = false;
    let activeSession = null;

    if (meetingLink.currentReservation) {
      const startTime = new Date(meetingLink.currentReservation.startTime);
      const endTime = new Date(meetingLink.currentReservation.endTime);
      isInUse = now >= startTime && now <= endTime;

      if (meetingLink.currentReservation.sessionId) {
        activeSession = await Session.findById(
          meetingLink.currentReservation.sessionId,
        )
          .select("title groupId scheduledDate startTime endTime status")
          .lean();
      }
    }

    // Get upcoming reservations
    const upcomingReservations = await Session.find({
      meetingLinkId: id,
      scheduledDate: { $gt: new Date() },
      isDeleted: false,
    })
      .select("title groupId scheduledDate startTime endTime status")
      .sort({ scheduledDate: 1 })
      .limit(5)
      .lean();

    // Get usage history
    const recentUsage =
      meetingLink.usageHistory
        ?.slice(-10)
        .sort((a, b) => new Date(b.usedAt) - new Date(a.usedAt)) || [];

    const formattedLink = {
      id: meetingLink._id,
      name: meetingLink.name,
      link: meetingLink.link,
      platform: meetingLink.platform,
      status: meetingLink.status,
      credentials: {
        username: meetingLink.credentials.username,
        password: meetingLink.credentials.password, // Include password for editing
      },
      capacity: meetingLink.capacity,
      durationLimit: meetingLink.durationLimit,
      allowedDays: meetingLink.allowedDays,
      allowedTimeSlots: meetingLink.allowedTimeSlots,
      stats: meetingLink.stats || {
        totalUses: 0,
        totalHours: 0,
        averageUsageDuration: 0,
        lastUsed: null,
      },
      currentReservation: meetingLink.currentReservation,
      isAvailable: meetingLink.status === "available",
      isInUse,
      activeSession,
      upcomingReservations,
      usageHistory: recentUsage,
      metadata: meetingLink.metadata,
    };

    return NextResponse.json({
      success: true,
      data: formattedLink,
    });
  } catch (error) {
    console.error("❌ Error fetching meeting link:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch meeting link",
      },
      { status: 500 },
    );
  }
}

// PUT: Update meeting link
export async function PUT(req, { params }) {
  try {
    console.log("✏️ Updating meeting link...");

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const adminUser = authCheck.user;

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid meeting link ID format" },
        { status: 400 },
      );
    }

    const body = await req.json();
    console.log("📥 Update data:", JSON.stringify(body, null, 2));

    // Find existing meeting link
    const existingLink = await MeetingLink.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!existingLink) {
      return NextResponse.json(
        { success: false, error: "Meeting link not found" },
        { status: 404 },
      );
    }

    // Check if link is currently in use (except for status changes)
    const now = new Date();
    if (existingLink.currentReservation) {
      const startTime = new Date(existingLink.currentReservation.startTime);
      const endTime = new Date(existingLink.currentReservation.endTime);
      const isCurrentlyInUse = now >= startTime && now <= endTime;

      // Don't allow changes to active links unless changing to maintenance
      if (isCurrentlyInUse && body.status !== "maintenance") {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot update meeting link while it is in use",
          },
          { status: 400 },
        );
      }
    }

    // Validation
    const {
      name,
      link,
      platform,
      credentials,
      capacity,
      durationLimit,
      allowedDays,
      allowedTimeSlots,
      notes,
      status,
    } = body;

    // Check if URL is being changed and validate
    if (link && link !== existingLink.link) {
      const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/;
      if (!urlPattern.test(link)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid link format",
          },
          { status: 400 },
        );
      }

      // Check for duplicate URL
      const duplicateLink = await MeetingLink.findOne({
        link: { $regex: new RegExp(`^${link}$`, "i") },
        _id: { $ne: id },
        isDeleted: false,
      });

      if (duplicateLink) {
        return NextResponse.json(
          {
            success: false,
            error: "Another meeting link already uses this URL",
          },
          { status: 409 },
        );
      }
    }

    // Validate allowedDays
    if (allowedDays && allowedDays.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "At least one day must be selected",
        },
        { status: 400 },
      );
    }

    // Validate allowedTimeSlots if provided
    if (allowedTimeSlots && Array.isArray(allowedTimeSlots)) {
      for (const slot of allowedTimeSlots) {
        if (!slot.startTime || !slot.endTime) {
          return NextResponse.json(
            {
              success: false,
              error: "Time slots must have both start and end times",
            },
            { status: 400 },
          );
        }

        if (slot.startTime >= slot.endTime) {
          return NextResponse.json(
            {
              success: false,
              error: "End time must be after start time",
            },
            { status: 400 },
          );
        }
      }
    }

    // Prepare update data
    const updateData = {
      metadata: {
        ...existingLink.metadata,
        updatedAt: new Date(),
        lastModifiedBy: adminUser.id,
      },
    };

    // Only update fields that are provided
    if (name !== undefined) updateData.name = name.trim();
    if (link !== undefined) updateData.link = link.trim();
    if (platform !== undefined) updateData.platform = platform;
    if (status !== undefined) updateData.status = status;
    if (capacity !== undefined) updateData.capacity = parseInt(capacity);
    if (durationLimit !== undefined)
      updateData.durationLimit = parseInt(durationLimit);
    if (allowedDays !== undefined) updateData.allowedDays = allowedDays;
    if (allowedTimeSlots !== undefined)
      updateData.allowedTimeSlots = allowedTimeSlots;
    if (notes !== undefined) updateData.metadata.notes = notes;

    // Handle credentials update (only if provided)
    if (credentials) {
      updateData.credentials = {
        username:
          credentials.username?.trim() || existingLink.credentials.username,
        password: credentials.password || existingLink.credentials.password,
      };
    }

    // Update the meeting link
    const updatedLink = await MeetingLink.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    console.log("✅ Meeting link updated:", updatedLink.name);

    return NextResponse.json({
      success: true,
      data: {
        id: updatedLink._id,
        name: updatedLink.name,
        link: updatedLink.link,
        platform: updatedLink.platform,
        status: updatedLink.status,
        credentials: {
          username: updatedLink.credentials.username,
          hasPassword: !!updatedLink.credentials.password,
        },
        capacity: updatedLink.capacity,
        durationLimit: updatedLink.durationLimit,
        allowedDays: updatedLink.allowedDays,
        allowedTimeSlots: updatedLink.allowedTimeSlots,
        metadata: updatedLink.metadata,
      },
      message: "Meeting link updated successfully",
    });
  } catch (error) {
    console.error("❌ Error updating meeting link:", error);

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
        { status: 400 },
      );
    }

    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          error: "Meeting link already exists with this name or URL",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update meeting link",
      },
      { status: 500 },
    );
  }
}

// DELETE: Delete meeting link (soft delete)
export async function DELETE(req, { params }) {
  try {
    console.log("🗑️ Deleting meeting link...");

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const adminUser = authCheck.user;

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid meeting link ID format" },
        { status: 400 },
      );
    }

    // Find meeting link
    const meetingLink = await MeetingLink.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!meetingLink) {
      return NextResponse.json(
        { success: false, error: "Meeting link not found" },
        { status: 404 },
      );
    }

    // Check if link is currently in use
    const now = new Date();
    if (meetingLink.currentReservation) {
      const startTime = new Date(meetingLink.currentReservation.startTime);
      const endTime = new Date(meetingLink.currentReservation.endTime);
      const isCurrentlyInUse = now >= startTime && now <= endTime;

      if (isCurrentlyInUse) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot delete meeting link while it is in use",
          },
          { status: 400 },
        );
      }
    }

    // Check if link has future reservations
    const futureSessions = await Session.find({
      meetingLinkId: id,
      scheduledDate: { $gt: now },
      isDeleted: false,
    });

    if (futureSessions.length > 0) {
      const sessionTitles = futureSessions.map((s) => s.title).slice(0, 3);
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete meeting link with future reservations",
          details: {
            futureSessionsCount: futureSessions.length,
            sampleSessions: sessionTitles,
            suggestion: "Reassign or cancel future sessions first",
          },
        },
        { status: 400 },
      );
    }

    // Release meeting link from any active reservations
    if (meetingLink.currentReservation) {
      await meetingLink.releaseLink();
    }

    // Soft delete the meeting link
    meetingLink.isDeleted = true;
    meetingLink.deletedAt = new Date();
    meetingLink.status = "maintenance";
    meetingLink.metadata.updatedAt = new Date();
    meetingLink.metadata.lastModifiedBy = adminUser.id;

    await meetingLink.save();

    console.log("✅ Meeting link soft deleted:", meetingLink.name);

    return NextResponse.json({
      success: true,
      message: "Meeting link deleted successfully",
      data: {
        id: meetingLink._id,
        name: meetingLink.name,
        deletedAt: meetingLink.deletedAt,
      },
    });
  } catch (error) {
    console.error("❌ Error deleting meeting link:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete meeting link",
      },
      { status: 500 },
    );
  }
}

// PATCH: Partial update (e.g., change status only)
export async function PATCH(req, { params }) {
  try {
    console.log("🔄 Partial update of meeting link...");

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const adminUser = authCheck.user;

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid meeting link ID format" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, error: "Status is required for PATCH request" },
        { status: 400 },
      );
    }

    const meetingLink = await MeetingLink.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!meetingLink) {
      return NextResponse.json(
        { success: false, error: "Meeting link not found" },
        { status: 404 },
      );
    }

    // Update status
    meetingLink.status = status;
    meetingLink.metadata.updatedAt = new Date();
    meetingLink.metadata.lastModifiedBy = adminUser.id;

    await meetingLink.save();

    console.log(
      `✅ Meeting link status updated to ${status}:`,
      meetingLink.name,
    );

    return NextResponse.json({
      success: true,
      message: `Meeting link status updated to ${status}`,
      data: {
        id: meetingLink._id,
        name: meetingLink.name,
        status: meetingLink.status,
      },
    });
  } catch (error) {
    console.error("❌ Error updating meeting link status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update meeting link status",
      },
      { status: 500 },
    );
  }
}
