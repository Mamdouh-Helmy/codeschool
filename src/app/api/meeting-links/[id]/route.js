import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import MeetingLink from "../../../models/MeetingLink";
import Session from "../../../models/Session";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

// ✅ FIX: استخراج الـ params بشكل صحيح
export async function GET(req, { params }) {
  try {
    console.log("🔍 Fetching meeting link by ID...");

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    await connectDB();

    // ✅ FIX: استخدام await مع params
    const { id } = await params;

    console.log("📝 Requested ID:", id);

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

    // Format the response
    const formattedLink = {
      id: meetingLink._id,
      _id: meetingLink._id, // ✅ إضافة _id
      name: meetingLink.name,
      link: meetingLink.link,
      platform: meetingLink.platform,
      status: meetingLink.status,
      credentials: {
        username: meetingLink.credentials?.username || "",
        password: meetingLink.credentials?.password || "",
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

    // ✅ FIX: استخدام await مع params
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

    // Check if link is being changed and validate URL
    if (body.link && body.link !== existingLink.link) {
      const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/;
      if (!urlPattern.test(body.link)) {
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
        link: { $regex: new RegExp(`^${body.link}$`, "i") },
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

    // Prepare update data
    const updateData = {
      metadata: {
        ...existingLink.metadata,
        updatedAt: new Date(),
        lastModifiedBy: adminUser.id,
      },
    };

    // Only update fields that are provided
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.link !== undefined) updateData.link = body.link.trim();
    if (body.platform !== undefined) updateData.platform = body.platform;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.capacity !== undefined)
      updateData.capacity = parseInt(body.capacity);
    if (body.durationLimit !== undefined)
      updateData.durationLimit = parseInt(body.durationLimit);
    if (body.allowedDays !== undefined)
      updateData.allowedDays = body.allowedDays;
    if (body.allowedTimeSlots !== undefined)
      updateData.allowedTimeSlots = body.allowedTimeSlots;
    if (body.notes !== undefined) {
      updateData.metadata = updateData.metadata || {};
      updateData.metadata.notes = body.notes;
    }

    // Handle credentials update
    if (body.credentials) {
      updateData.credentials = {
        username:
          body.credentials.username?.trim() ||
          existingLink.credentials?.username ||
          "",
        password:
          body.credentials.password || existingLink.credentials?.password || "",
      };
    }

    // Update the meeting link
    const updatedLink = await MeetingLink.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!updatedLink) {
      return NextResponse.json(
        { success: false, error: "Failed to update meeting link" },
        { status: 500 },
      );
    }

    console.log("✅ Meeting link updated:", updatedLink.name);

    return NextResponse.json({
      success: true,
      data: {
        id: updatedLink._id,
        _id: updatedLink._id, // ✅ إضافة _id
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

// DELETE: Delete meeting link
export async function DELETE(req, { params }) {
  try {
    console.log("🗑️ Deleting meeting link...");

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const adminUser = authCheck.user;

    await connectDB();

    // ✅ FIX: استخدام await مع params
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

    // Soft delete the meeting link
    meetingLink.isDeleted = true;
    meetingLink.deletedAt = new Date();
    meetingLink.status = "inactive";
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
