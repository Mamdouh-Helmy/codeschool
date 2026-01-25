// app/api/courses/route.js - SUPER SIMPLIFIED VERSION
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Course from "../../models/Course";

// GET - أبسط نسخة
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
      .lean();

    const totalPages = Math.ceil(total / limit);

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
    console.error("Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - أبسط نسخة بدون أي validations
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    
    console.log("Creating course with data:", {
      title: body.title,
      level: body.level
    });

    // تحضير البيانات الأساسية فقط
    const courseData = {
      title: body.title || "New Course",
      description: body.description || "",
      level: body.level || "beginner",
      curriculum: body.curriculum || [],
      projects: body.projects || [],
      instructors: body.instructors || [],
      price: body.price || 0,
      isActive: body.isActive !== false, // true by default
      featured: body.featured || false,
      thumbnail: body.thumbnail || "",
      createdBy: body.createdBy || {
        id: "000000000000000000000000",
        name: "System",
        email: "system@example.com",
        role: "admin"
      }
    };

    // إنشاء الكورس
    const course = new Course(courseData);
    await course.save();

    // إرجاع البيانات
    const responseData = {
      id: course._id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      level: course.level,
      curriculum: course.curriculum,
      totalModules: course.curriculum?.length || 0,
      totalLessons: course.curriculum?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || 0,
      price: course.price,
      isActive: course.isActive,
      featured: course.featured,
      thumbnail: course.thumbnail,
      createdBy: course.createdBy,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    };

    return NextResponse.json(
      {
        success: true,
        data: responseData,
        message: "Course created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating course:", error.message);
    
    // معالجة أخطاء الـ slug المكرر فقط
    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          error: "Course with similar title already exists",
          message: "هذا الكورس موجود بالفعل",
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create course",
        message: "فشل في إنشاء الكورس",
      },
      { status: 500 }
    );
  }
}