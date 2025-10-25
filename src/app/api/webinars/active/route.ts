import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Webinar from "../../../models/Webinar";
import { FALLBACK_ACTIVE_WEBINAR } from "@/lib/fallbackData/webinars";

export const revalidate = 60; // Revalidate every minute

// ✅ GET – إحضار الندوة النشطة التالية
export async function GET() {
  try {
    await connectDB();

    const now = new Date();
    const webinar = await Webinar.findOne({
      isActive: true,
      date: { $gte: now.toISOString().split("T")[0] },
    }).sort({ date: 1, time: 1 });

    if (!webinar) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "No active webinar found",
        source: "fallback",
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: webinar._id,
        title: webinar.title,
        date: webinar.date,
        time: webinar.time,
        crmRegistrationUrl: webinar.crmRegistrationUrl,
        instructor: webinar.instructor,
        instructorImage: webinar.instructorImage,
        maxAttendees: webinar.maxAttendees,
        currentAttendees: webinar.currentAttendees,
      },
      source: "database",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("GET /webinars/active error:", err);
    return NextResponse.json({
      success: true,
      data: FALLBACK_ACTIVE_WEBINAR,
      source: "fallback",
      message: "Using fallback data due to error",
      timestamp: new Date().toISOString(),
    });
  }
}
