// app/api/courses/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Course from "../../models/Course";

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const total = await Course.countDocuments();
    const courses = await Course.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("instructors", "name email")
      .lean();

    const totalPages = Math.ceil(total / limit);

    console.log("✅ Courses from DB");

    return NextResponse.json({
      success: true,
      data: courses,
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
    console.error("❌ Error fetching courses:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch courses",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();

    const {
      title,
      description,
      level,
      curriculum,
      projects,
      instructors,
      price,
      isActive,
      featured,
      thumbnail,
      createdBy,
    } = body;

    if (!title || !description || !level) {
      return NextResponse.json(
        {
          success: false,
          error: "Title, description, and level are required",
        },
        { status: 400 }
      );
    }

    if (
      !createdBy ||
      !createdBy.id ||
      !createdBy.name ||
      !createdBy.email ||
      !createdBy.role
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "createdBy information is required",
        },
        { status: 400 }
      );
    }

    const course = await Course.create({
      title,
      description,
      level,
      curriculum: curriculum || [],
      projects: projects || [],
      instructors: instructors || [],
      price: price || 0,
      isActive: isActive !== undefined ? isActive : true,
      featured: featured !== undefined ? featured : false,
      thumbnail,
      createdBy,
    });

    console.log("✅ Course created:", course._id);

    return NextResponse.json(
      {
        success: true,
        data: course,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error creating course:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create course",
      },
      { status: 500 }
    );
  }
}
