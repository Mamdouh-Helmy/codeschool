import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import MeetingLink from "../../../models/MeetingLink";
import mongoose from "mongoose";

// GET: Get single meeting link by ID
export async function GET(req, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid meeting link ID" },
        { status: 400 },
      );
    }

    const link = await MeetingLink.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!link) {
      return NextResponse.json(
        { success: false, error: "Meeting link not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: link,
    });
  } catch (error) {
    console.error("❌ Error in GET /api/meeting-links/[id]:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// PUT: Update meeting link
export async function PUT(req, { params }) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await req.json();

    console.log("📤 Updating meeting link:", id);
    console.log("📋 Update data:", body);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid meeting link ID" },
        { status: 400 },
      );
    }

    // التحقق من وجود الحقول المطلوبة
    if (!body.name || !body.link) {
      return NextResponse.json(
        { success: false, error: "Name and link are required" },
        { status: 400 },
      );
    }

    // تحديث البيانات
    const updateData = {
      name: body.name,
      link: body.link,
      platform: body.platform || "zoom",
      credentials: {
        username: body.credentials?.username || "",
        password: body.credentials?.password || "",
      },
      capacity: parseInt(body.capacity) || 100,
      durationLimit: parseInt(body.durationLimit) || 120,
      status: body.status || "available",
      allowedDays: body.allowedDays || [],
      allowedTimeSlots: body.allowedTimeSlots || [],
      "metadata.notes": body.notes || "",
      "metadata.updatedAt": new Date(),
    };

    const updatedLink = await MeetingLink.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!updatedLink) {
      return NextResponse.json(
        { success: false, error: "Meeting link not found" },
        { status: 404 },
      );
    }

    console.log("✅ Updated meeting link:", updatedLink.name);

    return NextResponse.json({
      success: true,
      data: {
        id: updatedLink._id,
        _id: updatedLink._id,
        name: updatedLink.name,
        link: updatedLink.link,
        platform: updatedLink.platform,
        status: updatedLink.status,
      },
      message: "Meeting link updated successfully",
    });
  } catch (error) {
    console.error("❌ Error updating meeting link:", error);
    console.error("❌ Error stack:", error.stack);

    // معالجة أخطاء الـ duplicate
    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          error: "This link already exists",
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

// DELETE: Soft delete meeting link
export async function DELETE(req, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    console.log("🗑️ Deleting meeting link:", id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid meeting link ID" },
        { status: 400 },
      );
    }

    // Soft delete
    const deletedLink = await MeetingLink.findByIdAndUpdate(
      id,
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          status: "inactive",
          "metadata.updatedAt": new Date(),
        },
      },
      { new: true },
    );

    if (!deletedLink) {
      return NextResponse.json(
        { success: false, error: "Meeting link not found" },
        { status: 404 },
      );
    }

    console.log("✅ Deleted meeting link:", deletedLink.name);

    return NextResponse.json({
      success: true,
      message: "Meeting link deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting meeting link:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
