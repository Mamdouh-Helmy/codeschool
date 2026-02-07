// app/api/courses/[id]/route.js - UPDATED PUT

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Course from "../../../models/Course";

function calculateSessionNumber(lessonOrder) {
  return Math.ceil(lessonOrder / 2);
}

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

export async function PUT(request, { params }) {
  try {
    await connectDB();
    
    const { id } = await params;
    const body = await request.json();
    
    console.log("📥 Updating course:", id);
    
    // ✅ FIXED: Process curriculum with FLAT blog fields
    if (body.curriculum && Array.isArray(body.curriculum)) {
      body.curriculum = body.curriculum.map((module, moduleIndex) => {
        console.log(`📦 Processing module ${moduleIndex + 1}:`, {
          title: module.title,
          projectsCount: module.projects?.length || 0,
          blogBodyAr: module.blog?.bodyAr?.substring(0, 50) || module.blogBodyAr?.substring(0, 50) || 'empty',
          blogBodyEn: module.blog?.bodyEn?.substring(0, 50) || module.blogBodyEn?.substring(0, 50) || 'empty',
        });
        
        return {
          title: module.title?.trim() || `Module ${moduleIndex + 1}`,
          description: module.description?.trim() || "",
          order: module.order || moduleIndex + 1,
          totalSessions: module.totalSessions || 3,
          projects: Array.isArray(module.projects) ? module.projects.filter(p => p?.trim()) : [],
          
          // ✅ FLAT BLOG FIELDS - support both nested and flat formats
          blogBodyAr: module.blog?.bodyAr?.trim() || module.blogBodyAr?.trim() || "",
          blogBodyEn: module.blog?.bodyEn?.trim() || module.blogBodyEn?.trim() || "",
          blogCreatedAt: module.blog?.createdAt || module.blogCreatedAt || new Date(),
          blogUpdatedAt: new Date(),
          
          lessons: (module.lessons || []).map((lesson, lessonIndex) => ({
            title: lesson.title?.trim() || `Lesson ${lessonIndex + 1}`,
            description: lesson.description?.trim() || "",
            order: lesson.order || lessonIndex + 1,
            sessionNumber: lesson.sessionNumber || calculateSessionNumber(lesson.order || lessonIndex + 1),
            duration: lesson.duration || "45 mins",
          })),
          sessions: (module.sessions || []).map((session, sessionIndex) => ({
            sessionNumber: session.sessionNumber || sessionIndex + 1,
            presentationUrl: session.presentationUrl?.trim() || "",
          })),
        };
      });
    }
    
    console.log("📊 Processed curriculum with blog:", JSON.stringify(body.curriculum, null, 2));
    
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
    
    console.log("✅ Course updated successfully");
    
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
    
    console.log("✅ Course deleted successfully");
    
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