// app/api/courses/[id]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Course from "../../../models/Course";
import mongoose from "mongoose";

export async function GET(request, { params }) {
  try {
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

    const body = await request.json();

    const course = await Course.findByIdAndUpdate(
      id,
      {
        ...body,
        updatedAt: new Date(),
      },
      {
        new: true,
        runValidators: true,
      }
    )
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

    console.log("✅ Course updated:", id);

    return NextResponse.json({
      success: true,
      data: course,
    });
  } catch (error) {
    console.error("❌ Error updating course:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update course",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
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