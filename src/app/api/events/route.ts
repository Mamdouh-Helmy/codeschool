import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Event from "../../models/Event";

export const revalidate = 60;

export async function GET() {
  try {
    await connectDB();
    const events = await Event.find({ isActive: true }).sort({
      date: -1,
      time: -1,
    });

    return NextResponse.json({
      success: true,
      data: events,
      source: "database",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("GET /events error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch events",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const payload = await request.json();

    const newEvent = await Event.create({
      ...payload,
      currentAttendees: payload.currentAttendees ?? 0,
      isActive: payload.isActive ?? true,
    });

    return NextResponse.json({
      success: true,
      data: newEvent,
      message: "Event created successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("POST /events error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to create event" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const payload = await request.json();
    
   
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Missing event ID" },
        { status: 400 }
      );
    }

  
    const updated = await Event.findByIdAndUpdate(
      id,
      { 
        ...payload, 
        updatedAt: new Date() 
      },
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
      message: "Event updated successfully",
      data: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("PUT /events error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to update event" },
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

    const deleted = await Event.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Event not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Event deleted successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("DELETE /events error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to delete event" },
      { status: 500 }
    );
  }
}