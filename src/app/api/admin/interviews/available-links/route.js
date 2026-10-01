// /app/api/admin/interviews/available-links/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import MeetingLink from "../../../../models/MeetingLink";
import { requireAdmin } from "@/utils/authMiddleware";
import { findScheduleConflict } from "../../../../../utils/checkMeetingLinks";

export async function GET(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;
    await connectDB();

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    const startTime = searchParams.get("startTime");
    const endTime = searchParams.get("endTime");

    if (!dateStr || !startTime || !endTime) {
      return NextResponse.json({ success: false, error: "Missing date/startTime/endTime" }, { status: 400 });
    }

    const dayName = new Date(dateStr).toLocaleDateString("en-US", { weekday: "long" });
    const newSchedule = { daysOfWeek: [dayName], timeFrom: startTime, timeTo: endTime };

    const allLinks = await MeetingLink.find({
      isDeleted: false,
      status: { $in: ["available", "reserved", "in_use"] },
    })
      .sort({ "stats.totalUses": 1 })
      .select("name link platform reservations")
      .lean();

    const available = [];
    const reserved = [];

    for (const link of allLinks) {
      const c = findScheduleConflict(link, newSchedule, null);
      if (c) {
        reserved.push({
          id: link._id,
          name: link.name,
          link: link.link,
          platform: link.platform,
          reservedDays: c.conflictingDays || [],
          reservedTime: c.conflictingTime || "",
        });
      } else {
        available.push({
          id: link._id,
          name: link.name,
          link: link.link,
          platform: link.platform,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: { available, reserved },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}