import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Course from "../../../models/Course";
import mongoose from "mongoose";

export async function GET(request, { params }) {
  try {
    console.log("📖 GET /api/courses/[id]");
    await connectDB();

    // FIX: Await the params
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid course ID" },
        { status: 400 },
      );
    }

    const course = await Course.findById(id)
      .populate("instructors", "name email")
      .lean();

    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 },
      );
    }

    console.log("✅ Course fetched:", id);
    return NextResponse.json({ success: true, data: course });
  } catch (error) {
    console.error("❌ GET Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

export async function PUT(request, { params }) {
  try {
    console.log("✏️ PUT /api/courses/[id]");
    await connectDB();

    // FIX: Await the params
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid course ID" },
        { status: 400 },
      );
    }

    const body = await request.json();

    const updateData = {
      ...body,
      updatedAt: new Date(),
    };

    if (updateData.title) {
      updateData.title = updateData.title.trim();
    }
    if (updateData.description) {
      updateData.description = updateData.description.trim();
    }

    const course = await Course.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    ).populate("instructors", "name email");

    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 },
      );
    }

    console.log("✅ Course updated:", id);
    return NextResponse.json({
      success: true,
      data: course,
      message: "Course updated successfully",
    });
  } catch (error) {
    console.error("❌ PUT Error:", error.message);

    if (error.name === "ValidationError") {
      const messages = [];
      for (const key in error.errors) {
        messages.push(error.errors[key].message);
      }
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: messages.join("; "),
        },
        { status: 400 },
      );
    }

    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          error: "Duplicate entry",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    console.log("🗑️ DELETE /api/courses/[id]");
    await connectDB();

    // FIX: Await the params
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid course ID" },
        { status: 400 },
      );
    }

    const course = await Course.findByIdAndDelete(id);

    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 },
      );
    }

    console.log("✅ Course deleted:", id);
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("❌ DELETE Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}