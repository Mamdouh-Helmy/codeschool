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

    // Build query
    const query = { isDeleted: false };

    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const platform = searchParams.get("platform");

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { link: { $regex: search, $options: "i" } },
        { "credentials.username": { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.status = status;
    }

    if (platform) {
      query.platform = platform;
    }

    const total = await MeetingLink.countDocuments(query);
    const links = await MeetingLink.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get statistics - FIXED: استخدام قيم status الصحيحة
    const stats = {
      total: await MeetingLink.countDocuments({ isDeleted: false }),
      available: await MeetingLink.countDocuments({
        status: "available",
        isDeleted: false,
      }),
      reserved: await MeetingLink.countDocuments({
        status: "reserved",
        isDeleted: false,
      }),
      in_use: await MeetingLink.countDocuments({
        status: "in_use",
        isDeleted: false,
      }),
      maintenance: await MeetingLink.countDocuments({
        status: "maintenance",
        isDeleted: false,
      }),
      inactive: await MeetingLink.countDocuments({
        status: "inactive",
        isDeleted: false,
      }),
    };

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: links,
      stats,
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
      { status: 500 },
    );
  }
}

// POST: أبسط نسخة - FIXED: إصلاح مشكلة validStatus
export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    console.log("Creating meeting link:", body.name);

    // ✅ FIXED: استخدام ObjectId صالح
    const adminUserId = new mongoose.Types.ObjectId(); // إنشاء ID جديد

    // ✅ FIXED: استخدام التحقق الصحيح من status
    const validStatuses = [
      "available",
      "reserved",
      "in_use",
      "maintenance",
      "inactive",
    ];
    const status = validStatuses.includes(body.status)
      ? body.status
      : "available";

    const meetingLinkData = {
      name: body.name || "New Link",
      link: body.link || "",
      platform: body.platform || "zoom",
      credentials: {
        username: body.credentials?.username || "",
        password: body.credentials?.password || "",
      },
      capacity: body.capacity || 100,
      durationLimit: body.durationLimit || 120,
      status: status, // ✅ استخدام status صالح
      allowedDays: body.allowedDays || [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      allowedTimeSlots: body.allowedTimeSlots || [],
      metadata: {
        createdBy: adminUserId, // ✅ ObjectId صالح
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: body.notes || "",
      },
      stats: {
        totalUses: 0,
        totalHours: 0,
        averageUsageDuration: 0,
      },
      isDeleted: false,
    };

    // حفظ البيانات مباشرة
    const meetingLink = new MeetingLink(meetingLinkData);
    await meetingLink.save();

    console.log("✅ Created:", meetingLink.name);

    return NextResponse.json(
      {
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
          metadata: meetingLink.metadata,
        },
        message: "Meeting link created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating meeting link:", error.message);

    // فقط معالجة أخطاء الـ duplicate
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
        error: error.message || "Failed to create meeting link",
      },
      { status: 500 },
    );
  }
}
