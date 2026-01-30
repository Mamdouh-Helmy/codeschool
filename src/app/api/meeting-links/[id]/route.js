import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import MeetingLink from "../../../models/MeetingLink";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

// GET: جلب رابط واحد بواسطة ID
export async function GET(req, { params }) {
  try {
    console.log("🔍 Fetching meeting link by ID...");

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    await connectDB();

    // استخراج الـ params
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

    // تنسيق الرد
    const formattedLink = {
      id: meetingLink._id,
      _id: meetingLink._id,
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

// PUT: تحديث رابط
export async function PUT(req, { params }) {
  try {
    console.log("✏️ Updating meeting link...");

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    await connectDB();

    // استخراج الـ params
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid meeting link ID format" },
        { status: 400 },
      );
    }

    const body = await req.json();
    console.log("📥 Update data:", JSON.stringify(body, null, 2));

    // البحث عن الرابط الموجود
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

    // التحقق من الحالة (status)
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

    // التحقق إذا كان الرابط يتغير والتحقق من صحة الرابط
    if (body.link && body.link !== existingLink.link) {
      // التحقق من تنسيق الرابط
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

      // التحقق من تكرار الرابط
      const duplicateLink = await MeetingLink.findOne({
        link: body.link,
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

    // إعداد بيانات التحديث
    const updateData = {
      metadata: {
        ...existingLink.metadata,
        updatedAt: new Date(),
      },
    };

    // تحديث الحقول المقدمة فقط
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

    // تحديث بيانات الدخول (credentials)
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

    // تحديث الرابط
    const updatedLink = await MeetingLink.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
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
        _id: updatedLink._id,
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
        notes: updatedLink.metadata?.notes || "",
      },
      message: "Meeting link updated successfully",
    });
  } catch (error) {
    console.error("❌ Error updating meeting link:", error);

    if (error.name === "ValidationError") {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: error.message,
        },
        { status: 400 },
      );
    }

    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          error: "Meeting link already exists with this URL",
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

// DELETE: حذف رابط
export async function DELETE(req, { params }) {
  try {
    console.log("🗑️ Deleting meeting link from database...");

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    await connectDB();

    // استخراج الـ params
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid meeting link ID format" },
        { status: 400 },
      );
    }

    // البحث عن الرابط
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

    // ✅ HARD DELETE - حذف فعلي من الداتابيس
    const deletedLink = await MeetingLink.findByIdAndDelete(id);

    console.log("✅ Meeting link permanently deleted:", deletedLink.name);

    return NextResponse.json({
      success: true,
      message: "Meeting link permanently deleted from database",
      data: {
        id: deletedLink._id,
        name: deletedLink.name,
        link: deletedLink.link,
        deletedAt: new Date(),
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
