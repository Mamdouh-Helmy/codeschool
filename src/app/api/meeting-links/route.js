// app/api/meeting-links/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import MeetingLink from "../../models/MeetingLink";
import Session from "../../models/Session";
import { requireAdmin } from "@/utils/authMiddleware";

// Days of week for reference - MOVED TO TOP
const daysOfWeek = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// GET: Fetch all meeting links
export async function GET(req) {
  try {
    console.log("🔍 Fetching meeting links...");

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const platform = searchParams.get("platform");
    const search = searchParams.get("search");
    const availableOnly = searchParams.get("availableOnly") === "true";

    const query = { isDeleted: false };

    if (status) query.status = status;
    if (platform) query.platform = platform;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { link: { $regex: search, $options: "i" } },
        { "credentials.username": { $regex: search, $options: "i" } },
      ];
    }

    // Filter by availability
    if (availableOnly) {
      query.status = "available";
      query.$or = query.$or || [];
    }

    const total = await MeetingLink.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const links = await MeetingLink.find(query)
      .sort({ "metadata.createdAt": -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Format response
    const formattedLinks = links.map((link) => {
      // Calculate if link is currently in use
      const now = new Date();
      let isInUse = false;

      if (link.currentReservation) {
        const startTime = new Date(link.currentReservation.startTime);
        const endTime = new Date(link.currentReservation.endTime);
        isInUse = now >= startTime && now <= endTime;
      }

      return {
        id: link._id,
        name: link.name,
        link: link.link,
        platform: link.platform,
        status: link.status,
        credentials: {
          username: link.credentials.username,
          hasPassword: !!link.credentials.password,
        },
        capacity: link.capacity,
        durationLimit: link.durationLimit,
        allowedDays: link.allowedDays,
        allowedTimeSlots: link.allowedTimeSlots,
        stats: link.stats || {
          totalUses: 0,
          totalHours: 0,
          averageUsageDuration: 0,
        },
        currentReservation: link.currentReservation,
        isAvailable: link.status === "available",
        isInUse,
        nextReservation:
          link.currentReservation &&
          new Date(link.currentReservation.startTime) > now
            ? link.currentReservation
            : null,
        usagePercentage:
          link.stats?.totalUses > 0
            ? Math.min(100, ((link.stats.totalHours || 0) / (30 * 8)) * 100)
            : 0,
        metadata: link.metadata,
      };
    });

    const stats = {
      total,
      available: await MeetingLink.countDocuments({
        ...query,
        status: "available",
      }),
      reserved: await MeetingLink.countDocuments({
        ...query,
        status: "reserved",
      }),
      in_use: await MeetingLink.countDocuments({ ...query, status: "in_use" }),
      maintenance: await MeetingLink.countDocuments({
        ...query,
        status: "maintenance",
      }),
    };

    return NextResponse.json({
      success: true,
      data: formattedLinks,
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
    console.error("❌ Error fetching meeting links:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch meeting links",
      },
      { status: 500 },
    );
  }
}

// POST: Create new meeting link
export async function POST(req) {
  try {
    console.log("➕ Creating new meeting link...");

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const adminUser = authCheck.user;

    await connectDB();

    const body = await req.json();
    console.log(
      "📥 Received meeting link data:",
      JSON.stringify(body, null, 2),
    );

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

    // Validation
    if (!name || !link || !credentials?.username || !credentials?.password) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: name, link, credentials.username, credentials.password",
        },
        { status: 400 },
      );
    }

    // Validate URL format
    const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/;
    if (!urlPattern.test(link)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid link format. Please enter a valid URL.",
        },
        { status: 400 },
      );
    }

    // Check for duplicate link (case-insensitive)
    const existingLink = await MeetingLink.findOne({
      link: { $regex: new RegExp(`^${link}$`, "i") },
      isDeleted: false,
    });

    if (existingLink) {
      return NextResponse.json(
        {
          success: false,
          error: "Meeting link already exists with this URL",
        },
        { status: 409 },
      );
    }

    // Validate allowedDays
    if (!allowedDays || allowedDays.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "At least one day must be selected",
        },
        { status: 400 },
      );
    }

    // Validate allowedTimeSlots if provided
    if (allowedTimeSlots && allowedTimeSlots.length > 0) {
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

    // Create meeting link
    const meetingLinkData = {
      name: name.trim(),
      link: link.trim(),
      platform: platform || "zoom",
      credentials: {
        username: credentials.username.trim(),
        password: credentials.password,
      },
      capacity: capacity || 100,
      durationLimit: durationLimit || 120,
      status: status || "available",
      allowedDays: allowedDays || daysOfWeek, // Now correctly referenced
      allowedTimeSlots: allowedTimeSlots || [],
      metadata: {
        createdBy: adminUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: notes || "",
      },
      stats: {
        totalUses: 0,
        totalHours: 0,
        averageUsageDuration: 0,
        lastUsed: null,
      },
    };

    const meetingLink = await MeetingLink.create(meetingLinkData);

    console.log("✅ Meeting link created:", meetingLink.name);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: meetingLink._id,
          name: meetingLink.name,
          link: meetingLink.link,
          platform: meetingLink.platform,
          status: meetingLink.status,
          credentials: {
            username: meetingLink.credentials.username,
            hasPassword: true,
          },
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
    console.error("❌ Error creating meeting link:", error);

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
        error: error.message || "Failed to create meeting link",
      },
      { status: 500 },
    );
  }
}