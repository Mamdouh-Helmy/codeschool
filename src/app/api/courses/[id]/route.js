// app/api/courses/[id]/route.js - COMPLETE FIXED VERSION
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Course from "../../../models/Course";

// دالة مساعدة لحساب رقم الجلسة بناءً على ترتيب الدرس
function calculateSessionNumber(lessonOrder) {
  return Math.ceil(lessonOrder / 2); // 2 درس لكل جلسة
}

// GET - جلب كورس بواسطة ID
export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const { id } = await params;
    
    const course = await Course.findById(id).lean();
    
    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: course });
  } catch (error) {
    console.error("❌ GET by ID Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - تحديث كورس
export async function PUT(request, { params }) {
  try {
    await connectDB();
    
    const { id } = await params;
    const body = await request.json();
    
    // ✅ معالجة curriculum بشكل صحيح INCLUDING SESSIONS WITH presentationUrl
    if (body.curriculum && Array.isArray(body.curriculum)) {
      body.curriculum = body.curriculum.map((module, moduleIndex) => ({
        title: module.title?.trim() || `Module ${moduleIndex + 1}`,
        description: module.description?.trim() || "",
        order: module.order || moduleIndex + 1,
        totalSessions: module.totalSessions || 3,
        projects: module.projects || [],
        lessons: (module.lessons || []).map((lesson, lessonIndex) => ({
          title: lesson.title?.trim() || `Lesson ${lessonIndex + 1}`,
          description: lesson.description?.trim() || "",
          order: lesson.order || lessonIndex + 1,
          sessionNumber: lesson.sessionNumber || calculateSessionNumber(lesson.order || lessonIndex + 1),
          duration: lesson.duration || "45 mins",
        })),
        // ✅ إضافة معالجة sessions مع presentationUrl
        sessions: (module.sessions || []).map((session, sessionIndex) => ({
          sessionNumber: session.sessionNumber || sessionIndex + 1,
          presentationUrl: session.presentationUrl?.trim() || "",
        })),
      }));
    }
    
    const course = await Course.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );
    
    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: course,
      message: "Course updated successfully",
    });
  } catch (error) {
    console.error("❌ PUT Error:", error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { success: false, error: messages.join(', ') },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - حذف كورس
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    
    const { id } = await params;
    
    const course = await Course.findByIdAndDelete(id);
    
    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error("❌ DELETE Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}