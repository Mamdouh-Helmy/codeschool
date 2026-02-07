// app/api/courses/[id]/route.js - FIXED VERSION

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
    console.log("📊 Raw curriculum:", JSON.stringify(body.curriculum, null, 2));
    
    // ✅ Process curriculum with EXPLICIT blog field preservation
    if (body.curriculum && Array.isArray(body.curriculum)) {
      body.curriculum = body.curriculum.map((module, moduleIndex) => {
        console.log(`\n📦 Processing module ${moduleIndex + 1}:`);
        console.log("  - Title:", module.title);
        console.log("  - Projects:", module.projects?.length || 0);
        
        // ✅ Extract blog data from both nested and flat formats
        const blogBodyAr = (module.blog?.bodyAr || module.blogBodyAr || "").trim();
        const blogBodyEn = (module.blog?.bodyEn || module.blogBodyEn || "").trim();
        
        console.log("  - Extracted blog:", {
          blogBodyArLength: blogBodyAr.length,
          blogBodyEnLength: blogBodyEn.length,
          blogBodyArPreview: blogBodyAr.substring(0, 50),
          blogBodyEnPreview: blogBodyEn.substring(0, 50),
        });
        
        const processedModule = {
          title: module.title?.trim() || `Module ${moduleIndex + 1}`,
          description: module.description?.trim() || "",
          order: module.order || moduleIndex + 1,
          totalSessions: module.totalSessions || 3,
          projects: Array.isArray(module.projects) ? module.projects.filter(p => p?.trim()) : [],
          
          // ✅ EXPLICIT blog fields
          blogBodyAr: blogBodyAr,
          blogBodyEn: blogBodyEn,
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
        
        console.log("  ✅ Processed module:", {
          title: processedModule.title,
          blogBodyArLength: processedModule.blogBodyAr.length,
          blogBodyEnLength: processedModule.blogBodyEn.length,
        });
        
        return processedModule;
      });
    }
    
    console.log("\n📊 Final processed curriculum:", JSON.stringify(body.curriculum, null, 2));
    
    console.log("💾 Updating course in database...");
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
    
    console.log("✅ Course updated successfully!");
    
    // ✅ Verify the saved data
    const verifiedCourse = await Course.findById(id).lean();
    console.log("\n🔍 VERIFICATION - Fetched from DB:");
    if (verifiedCourse.curriculum && verifiedCourse.curriculum.length > 0) {
      verifiedCourse.curriculum.forEach((module, idx) => {
        console.log(`Module ${idx + 1}:`, {
          title: module.title,
          blogBodyAr: module.blogBodyAr?.substring(0, 50) || 'EMPTY',
          blogBodyEn: module.blogBodyEn?.substring(0, 50) || 'EMPTY',
          blogBodyArLength: module.blogBodyAr?.length || 0,
          blogBodyEnLength: module.blogBodyEn?.length || 0,
        });
      });
    }
    
    return NextResponse.json({
      success: true,
      data: verifiedCourse,
      message: "Course updated successfully",
    });
  } catch (error) {
    console.error("❌ PUT Error:", error);
    console.error("❌ Error stack:", error.stack);
    
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