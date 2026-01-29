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

    // Check if link is in_use status or has active reservation
    if (meetingLink.status === "in_use") {
      isInUse = true;
      if (meetingLink.currentReservation?.sessionId) {
        activeSession = await Session.findById(
          meetingLink.currentReservation.sessionId,
        )
          .select("title groupId scheduledDate startTime endTime status")
          .lean();
      }
    } else if (meetingLink.currentReservation) {
      const startTime = new Date(meetingLink.currentReservation.startTime);
      const endTime = new Date(meetingLink.currentReservation.endTime);
      isInUse = now >= startTime && now <= endTime;

      if (isInUse && meetingLink.currentReservation.sessionId) {
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
        username: meetingLink.credentials?.username || "",
        password: meetingLink.credentials?.password || "", // Include password for editing
      },
      capacity: meetingLink.capacity || 100,
      durationLimit: meetingLink.durationLimit || 120,
      allowedDays: meetingLink.allowedDays || [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      allowedTimeSlots: meetingLink.allowedTimeSlots || [],
      stats: meetingLink.stats || {
        totalUses: 0,
        totalHours: 0,
        averageUsageDuration: 0,
        lastUsed: null,
      },
      currentReservation: meetingLink.currentReservation,
      isAvailable: meetingLink.status === "available",
      isInUse: isInUse || meetingLink.status === "in_use",
      activeSession,
      upcomingReservations,
      usageHistory: recentUsage,
      metadata: meetingLink.metadata || {
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: "",
      },
      notes: meetingLink.metadata?.notes || "",
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

// PUT: Update meeting link - FIXED: إصلاح مشكلة الـ ID
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
    console.log("📝 Meeting Link ID to update:", id);

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
    const isCurrentlyInUse =
      existingLink.status === "in_use" ||
      (existingLink.currentReservation &&
        now >= new Date(existingLink.currentReservation.startTime) &&
        now <= new Date(existingLink.currentReservation.endTime));

    // Don't allow certain changes to active links
    if (isCurrentlyInUse) {
      // Allow changing status to maintenance even if in use
      if (body.status && body.status !== "maintenance") {
        return NextResponse.json(
          {
            success: false,
            error:
              "Cannot update meeting link while it is in use. Consider setting status to 'maintenance' first.",
          },
          { status: 400 },
        );
      }
    }

    // Validate status
    const validStatuses = [
      "available",
      "reserved",
      "in_use",
      "maintenance",
      "inactive",
    ];
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Valid statuses are: ${validStatuses.join(", ")}`,
        },
        { status: 400 },
      );
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
    if (notes !== undefined) {
      updateData.metadata = updateData.metadata || {};
      updateData.metadata.notes = notes;
    }

    // Handle credentials update (only if provided)
    if (credentials) {
      updateData.credentials = {
        username:
          credentials.username?.trim() ||
          existingLink.credentials?.username ||
          "",
        password:
          credentials.password || existingLink.credentials?.password || "",
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
          username: updatedLink.credentials?.username || "",
          password: updatedLink.credentials?.password || "",
        },
        capacity: updatedLink.capacity,
        durationLimit: updatedLink.durationLimit,
        allowedDays: updatedLink.allowedDays,
        allowedTimeSlots: updatedLink.allowedTimeSlots,
        metadata: updatedLink.metadata,
        notes: updatedLink.metadata?.notes || "",
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
    const isCurrentlyInUse =
      meetingLink.status === "in_use" ||
      (meetingLink.currentReservation &&
        now >= new Date(meetingLink.currentReservation.startTime) &&
        now <= new Date(meetingLink.currentReservation.endTime));

    if (isCurrentlyInUse) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cannot delete meeting link while it is in use. Change status to 'maintenance' first.",
        },
        { status: 400 },
      );
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
    meetingLink.status = "inactive"; // تغيير من "maintenance" إلى "inactive"
    meetingLink.metadata = meetingLink.metadata || {};
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
        status: meetingLink.status,
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
    const { status, notes } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, error: "Status is required for PATCH request" },
        { status: 400 },
      );
    }

    // Validate status
    const validStatuses = [
      "available",
      "reserved",
      "in_use",
      "maintenance",
      "inactive",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Valid statuses are: ${validStatuses.join(", ")}`,
        },
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

    // Check if trying to change from in_use status
    if (
      meetingLink.status === "in_use" &&
      status !== "in_use" &&
      status !== "maintenance"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cannot change status from 'in_use'. Consider setting to 'maintenance' first.",
        },
        { status: 400 },
      );
    }

    // Update status
    meetingLink.status = status;
    meetingLink.metadata = meetingLink.metadata || {};
    meetingLink.metadata.updatedAt = new Date();
    meetingLink.metadata.lastModifiedBy = adminUser.id;

    if (notes !== undefined) {
      meetingLink.metadata.notes = notes;
    }

    // If changing to available and has current reservation, clear it
    if (status === "available" && meetingLink.currentReservation) {
      // Check if reservation is in the past
      const now = new Date();
      const reservationEnd = new Date(meetingLink.currentReservation.endTime);
      if (now > reservationEnd) {
        // Add to usage history before clearing
        if (meetingLink.currentReservation.sessionId) {
          const durationMinutes = Math.round(
            (reservationEnd.getTime() -
              new Date(meetingLink.currentReservation.startTime).getTime()) /
              (1000 * 60),
          );

          meetingLink.usageHistory = meetingLink.usageHistory || [];
          meetingLink.usageHistory.push({
            sessionId: meetingLink.currentReservation.sessionId,
            groupId: meetingLink.currentReservation.groupId,
            startTime: meetingLink.currentReservation.startTime,
            endTime: meetingLink.currentReservation.endTime,
            duration: durationMinutes,
            usedAt: new Date(),
          });

          // Update stats
          meetingLink.stats = meetingLink.stats || {};
          meetingLink.stats.totalUses = (meetingLink.stats.totalUses || 0) + 1;
          meetingLink.stats.totalHours =
            (meetingLink.stats.totalHours || 0) + durationMinutes / 60;
          meetingLink.stats.lastUsed = new Date();

          if (meetingLink.stats.totalUses > 0) {
            meetingLink.stats.averageUsageDuration =
              meetingLink.stats.totalHours / meetingLink.stats.totalUses;
          }
        }

        meetingLink.currentReservation = null;
      }
    }

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
        metadata: meetingLink.metadata,
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
