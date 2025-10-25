import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Webinar from "../../models/Webinar";

export const revalidate = 60;

// ✅ GET - جميع الندوات
export async function GET() {
  try {
    await connectDB();
    const webinars = await Webinar.find().sort({ date: -1, time: -1 });

    return NextResponse.json({
      success: true,
      data: webinars,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("GET /webinars error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch webinars" },
      { status: 500 }
    );
  }
}

// ✅ POST - إنشاء ندوة جديدة
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const payload = await request.json();

    const newWebinar = await Webinar.create({
      ...payload,
      currentAttendees: payload.currentAttendees ?? 0,
    });

    return NextResponse.json({
      success: true,
      data: newWebinar,
      message: "Webinar created successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("POST /webinars error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to create webinar" },
      { status: 500 }
    );
  }
}

// ✅ PUT - تعديل ندوة (مُصلح)
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    // الحصول على ID من query parameters
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    const payload = await request.json();
    const { ...updates } = payload;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Missing webinar ID" },
        { status: 400 }
      );
    }

    const updated = await Webinar.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Webinar not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Webinar updated successfully",
      data: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("PUT /webinars error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to update webinar" },
      { status: 500 }
    );
  }
}

// ✅ DELETE - حذف ندوة (مُصلح)
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Missing webinar ID" },
        { status: 400 }
      );
    }

    const deleted = await Webinar.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Webinar not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Webinar deleted successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("DELETE /webinars error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to delete webinar" },
      { status: 500 }
    );
  }
}