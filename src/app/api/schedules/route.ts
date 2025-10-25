import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import ScheduleEvent from "../../models/ScheduleEvent";

export const revalidate = 60;

export async function GET() {
  try {
    await connectDB();

    const events = await ScheduleEvent.find({}).sort({
      date: 1,
      time: 1,
    });

    return NextResponse.json({
      success: true,
      data: events,
      source: "database",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("GET /api/schedule-events error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch schedule events",
        data: [],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const payload = await request.json();

    const newEvent = await ScheduleEvent.create({
      ...payload,
      isActive: payload.isActive ?? true,
    });

    return NextResponse.json({
      success: true,
      data: newEvent,
      message: "Schedule event created successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("POST /api/schedule-events error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to create schedule event" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const payload = await request.json();
    const { id, ...updates } = payload;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Missing event ID" },
        { status: 400 }
      );
    }

    const updated = await ScheduleEvent.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Event not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Schedule event updated successfully",
      data: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("PUT /api/schedule-events error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to update schedule event" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Missing event ID" },
        { status: 400 }
      );
    }

    const deleted = await ScheduleEvent.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Event not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Schedule event deleted successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("DELETE /api/schedule-events error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to delete schedule event" },
      { status: 500 }
    );
  }
}