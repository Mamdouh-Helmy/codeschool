// app/api/courses/[id]/route.js - PUT و GET فقط
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Course from "../../../models/Course";
import mongoose from "mongoose";

export async function GET(request, { params }) {
  try {
    console.log("📖 GET /api/courses/[id] - Fetching single course...");
    await connectDB();

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid course ID",
        },
        { status: 400 }
      );
    }

    const course = await Course.findById(id)
      .populate("instructors", "name email")
      .lean();

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          error: "Course not found",
        },
        { status: 404 }
      );
    }

    console.log("✅ Course fetched:", id);

    return NextResponse.json({
      success: true,
      data: course,
    });
  } catch (error) {
    console.error("❌ Error fetching course:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch course",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    console.log(`✏️ PUT /api/courses/[id] - Updating course: ${params.id}`);

    await connectDB();
    console.log("✅ Database connected");

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log("❌ Invalid course ID format:", id);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid course ID",
          message: "Invalid course ID format",
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log("📥 Update data received");

    // Clean and prepare update data
    const updateData = {
      ...body,
      updatedAt: new Date(),
    };

    // Trim string fields if they exist
    if (updateData.title) {
      updateData.title = updateData.title.trim();
    }
    if (updateData.description) {
      updateData.description = updateData.description.trim();
    }

    console.log("🔄 Executing database update...");

    const course = await Course.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    ).populate("instructors", "name email");

    if (!course) {
      console.log("❌ Course not found:", id);
      return NextResponse.json(
        {
          success: false,
          error: "Course not found",
          message: "Course not found",
        },
        { status: 404 }
      );
    }

    console.log("✅ Course updated successfully:", id);

    return NextResponse.json({
      success: true,
      data: course,
      message: "Course updated successfully",
    });
  } catch (error) {
    console.error("❌ Error updating course:", {
      message: error.message,
      name: error.name,
      code: error.code,
    });

    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      const messages = [];
      for (const key in error.errors) {
        messages.push(error.errors[key].message);
      }
      console.error("❌ Validation errors:", messages.join("; "));
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          message: "Validation failed",
          details: messages.join("; "),
        },
        { status: 400 }
      );
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "unknown";
      console.error("❌ Duplicate field error:", field);
      return NextResponse.json(
        {
          success: false,
          error: `Duplicate ${field}`,
          message: `A course with this ${field} already exists`,
          field: field,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update course",
        message: error.message || "Failed to update course",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    console.log(`🗑️ DELETE /api/courses/[id] - Deleting course: ${params.id}`);
    await connectDB();

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid course ID",
        },
        { status: 400 }
      );
    }

    const course = await Course.findByIdAndDelete(id);

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          error: "Course not found",
        },
        { status: 404 }
      );
    }

    console.log("✅ Course deleted:", id);

    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch (error) {
    console.error("❌ Error deleting course:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete course",
      },
      { status: 500 }
    );
  }
}