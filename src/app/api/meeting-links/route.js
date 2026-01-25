import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import MeetingLink from "../../models/MeetingLink";
import mongoose from "mongoose";

// GET: أبسط نسخة
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const total = await MeetingLink.countDocuments({ isDeleted: false });
    const links = await MeetingLink.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: links,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST: أبسط نسخة
export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    console.log("Creating meeting link:", body.name);

    // ✅ FIXED: استخدام ObjectId صالح
    const adminUserId = new mongoose.Types.ObjectId(); // إنشاء ID جديد
    
    // البيانات الأساسية فقط
    const meetingLinkData = {
      name: body.name || "New Link",
      link: body.link || "",
      platform: body.platform || "zoom",
      credentials: {
        username: body.credentials?.username || "",
        password: body.credentials?.password || ""
      },
      capacity: body.capacity || 100,
      durationLimit: body.durationLimit || 120,
      status: body.status || "available",
      allowedDays: body.allowedDays || [
        "Sunday", "Monday", "Tuesday", "Wednesday", 
        "Thursday", "Friday", "Saturday"
      ],
      allowedTimeSlots: body.allowedTimeSlots || [],
      metadata: {
        createdBy: adminUserId, // ✅ ObjectId صالح
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: body.notes || ""
      },
      stats: {
        totalUses: 0,
        totalHours: 0,
        averageUsageDuration: 0
      },
      isDeleted: false
    };

    // حفظ البيانات مباشرة
    const meetingLink = new MeetingLink(meetingLinkData);
    await meetingLink.save();

    console.log("✅ Created:", meetingLink.name);

    return NextResponse.json({
      success: true,
      data: {
        id: meetingLink._id,
        name: meetingLink.name,
        link: meetingLink.link,
        platform: meetingLink.platform,
        status: meetingLink.status,
        credentials: meetingLink.credentials,
        capacity: meetingLink.capacity,
        durationLimit: meetingLink.durationLimit,
        allowedDays: meetingLink.allowedDays,
        allowedTimeSlots: meetingLink.allowedTimeSlots,
        metadata: meetingLink.metadata
      },
      message: "Meeting link created successfully"
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating meeting link:", error.message);
    
    // فقط معالجة أخطاء الـ duplicate
    if (error.code === 11000) {
      return NextResponse.json({
        success: false,
        error: "This link already exists"
      }, { status: 409 });
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to create meeting link"
    }, { status: 500 });
  }
}