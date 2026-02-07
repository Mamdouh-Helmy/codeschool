// app/api/courses/route.js - FIXED VERSION

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Course from "../../models/Course";

function generateSlug(title) {
  if (!title) return `course-${Date.now()}`;
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim() || `course-${Date.now()}`;
}

function calculateSessionNumber(lessonOrder) {
  return Math.ceil(lessonOrder / 2);
}

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "10"));
    const skip = (page - 1) * limit;

    const query = {};
    
    if (searchParams.get("level")) {
      query.level = searchParams.get("level");
    }
    
    if (searchParams.get("active") !== null) {
      query.isActive = searchParams.get("active") === "true";
    }
    
    if (searchParams.get("featured") === "true") {
      query.featured = true;
    }
    
    if (searchParams.get("search")) {
      query.$or = [
        { title: { $regex: searchParams.get("search"), $options: "i" } },
        { description: { $regex: searchParams.get("search"), $options: "i" } },
      ];
    }

    const total = await Course.countDocuments(query);
    const courses = await Course.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: courses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("❌ GET Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
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
      grade,
      subject,
      isActive,
      featured,
      thumbnail,
      duration,
      createdBy,
    } = body;

    console.log("📥 Received course data");
    console.log("📊 Raw curriculum:", JSON.stringify(curriculum, null, 2));

    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 }
      );
    }

    if (!description?.trim()) {
      return NextResponse.json(
        { success: false, error: "Description is required" },
        { status: 400 }
      );
    }

    if (!level) {
      return NextResponse.json(
        { success: false, error: "Level is required" },
        { status: 400 }
      );
    }

    if (!createdBy?.id || !createdBy?.name || !createdBy?.email || !createdBy?.role) {
      return NextResponse.json(
        { success: false, error: "Creator information is incomplete" },
        { status: 400 }
      );
    }

    // ✅ Process curriculum with EXPLICIT blog field preservation
    let processedCurriculum = [];
    if (curriculum && Array.isArray(curriculum)) {
      processedCurriculum = curriculum.map((module, moduleIndex) => {
        console.log(`\n📦 Processing module ${moduleIndex + 1}:`);
        console.log("  - Title:", module.title);
        console.log("  - Projects:", module.projects?.length || 0);
        console.log("  - Blog (nested):", {
          hasBodyAr: !!module.blog?.bodyAr,
          hasBodyEn: !!module.blog?.bodyEn,
          bodyArLength: module.blog?.bodyAr?.length || 0,
          bodyEnLength: module.blog?.bodyEn?.length || 0,
        });
        
        // ✅ Extract blog data properly
        const blogBodyAr = (module.blog?.bodyAr || module.blogBodyAr || "").trim();
        const blogBodyEn = (module.blog?.bodyEn || module.blogBodyEn || "").trim();
        
        console.log("  - Extracted blog:", {
          blogBodyAr: blogBodyAr.substring(0, 100),
          blogBodyEn: blogBodyEn.substring(0, 100),
          blogBodyArLength: blogBodyAr.length,
          blogBodyEnLength: blogBodyEn.length,
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

    console.log("\n📊 Final processed curriculum:", JSON.stringify(processedCurriculum, null, 2));

    const courseData = {
      title: title.trim(),
      description: description.trim(),
      slug: generateSlug(title),
      level: level.toLowerCase(),
      grade: grade?.trim() || "",
      subject: subject?.trim() || "",
      curriculum: processedCurriculum,
      isActive: isActive !== undefined ? isActive : true,
      featured: featured || false,
      thumbnail: thumbnail?.trim() || "",
      duration: duration?.trim() || "",
      createdBy: {
        id: createdBy.id,
        name: createdBy.name.trim(),
        email: createdBy.email.trim().toLowerCase(),
        role: createdBy.role.trim(),
      },
    };

    console.log("\n💾 Creating course with data:", {
      title: courseData.title,
      curriculumCount: courseData.curriculum.length,
      firstModuleBlog: courseData.curriculum[0] ? {
        blogBodyArLength: courseData.curriculum[0].blogBodyAr?.length || 0,
        blogBodyEnLength: courseData.curriculum[0].blogBodyEn?.length || 0,
      } : null,
    });

    const course = new Course(courseData);

    console.log("💾 Saving course to database...");
    const savedCourse = await course.save();
    
    console.log("✅ Course saved successfully!");
    console.log("✅ Saved course ID:", savedCourse._id);
    
    // ✅ Verify the saved data
    const verifiedCourse = await Course.findById(savedCourse._id).lean();
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

    return NextResponse.json(
      {
        success: true,
        data: verifiedCourse,
        message: "Course created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ POST Error:", error);
    console.error("❌ Error stack:", error.stack);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { success: false, error: messages.join(', ') },
        { status: 400 }
      );
    }
    
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: "Course with this title already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}