// app/api/courses/route.js - FIXED COMPLETE VERSION
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Course from "../../models/Course";
import User from "../../models/User";

// Helper: Validate curriculum structure - FIXED version
const validateCurriculumStructure = (curriculum) => {
  if (!curriculum || curriculum.length === 0) {
    return { valid: true, errors: [] };
  }

  const errors = [];

  curriculum.forEach((module, moduleIndex) => {
    // Check module has required fields
    if (!module || typeof module !== "object") {
      errors.push(`Module ${moduleIndex + 1}: must be an object`);
      return;
    }

    if (!module.title || module.title.trim() === "") {
      errors.push(`Module ${moduleIndex + 1}: title is required`);
    }

    if (module.order === undefined || module.order === null) {
      errors.push(`Module ${moduleIndex + 1}: order is required`);
    }

    // Check lessons count
    if (!Array.isArray(module.lessons)) {
      errors.push(`Module ${moduleIndex + 1}: lessons must be an array`);
      return;
    }

    if (module.lessons.length !== 6) {
      errors.push(
        `Module ${moduleIndex + 1}: must have exactly 6 lessons (found ${module.lessons.length})`
      );
    }

    // Validate each lesson
    module.lessons.forEach((lesson, lessonIndex) => {
      if (!lesson || typeof lesson !== "object") {
        errors.push(`Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1}: must be an object`);
        return;
      }

      if (!lesson.title || lesson.title.trim() === "") {
        errors.push(`Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1}: title is required`);
      }

      if (lesson.order === undefined || lesson.order === null) {
        errors.push(`Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1}: order is required`);
      } else if (lesson.order < 1 || lesson.order > 6) {
        errors.push(`Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1}: order must be between 1 and 6`);
      }

      // التحقق من رقم السيشن الصحيح
      const expectedSession = Math.ceil(lesson.order / 2);
      if (lesson.sessionNumber === undefined || lesson.sessionNumber === null) {
        errors.push(`Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1}: sessionNumber is required`);
      } else if (lesson.sessionNumber !== expectedSession) {
        errors.push(
          `Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1}: sessionNumber must be ${expectedSession} for lesson order ${lesson.order} (found ${lesson.sessionNumber})`
        );
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
  };
};

export async function GET(request) {
  try {
    console.log("🔍 Fetching courses...");
    
    await connectDB();
    console.log("✅ Database connected");

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const total = await Course.countDocuments();

    // ✅ FIXED: Fetch courses with better error handling
    let courses;
    try {
      courses = await Course.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("instructors", "name email")
        .lean();
    } catch (populateError) {
      console.warn("⚠️ Warning: Could not populate instructors:", populateError.message);
      // Fallback: fetch without populate
      courses = await Course.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    }

    const totalPages = Math.ceil(total / limit);

    console.log("✅ Courses fetched from DB:", courses.length);

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

// app/api/courses/route.js - الجزء المتعلق بالـ POST فقط (محدث)
export async function POST(request) {
  let startTime = Date.now();
  
  try {
    console.log("🚀 Starting course creation process...");

    await connectDB();
    console.log("✅ Database connected in", Date.now() - startTime, "ms");

    const body = await request.json();
    console.log("📥 Received course data");
    
    // ✅ تبسيط تسجيل البيانات
    console.log("📊 Data structure:", {
      hasTitle: !!body.title,
      hasDescription: !!body.description,
      hasLevel: !!body.level,
      hasCreatedBy: !!body.createdBy,
      curriculumLength: body.curriculum?.length || 0,
    });

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

    // Required field validation
    if (!title || title.trim() === "") {
      console.log("❌ Missing title");
      return NextResponse.json(
        {
          success: false,
          error: "Title is required",
          message: "عنوان الكورس مطلوب",
        },
        { status: 400 }
      );
    }

    if (!description || description.trim() === "") {
      console.log("❌ Missing description");
      return NextResponse.json(
        {
          success: false,
          error: "Description is required",
          message: "وصف الكورس مطلوب",
        },
        { status: 400 }
      );
    }

    if (!level || !["beginner", "intermediate", "advanced"].includes(level)) {
      console.log("❌ Invalid level:", level);
      return NextResponse.json(
        {
          success: false,
          error: "Level must be one of: beginner, intermediate, advanced",
          message: "المستوى يجب أن يكون: مبتدئ، متوسط، متقدم",
        },
        { status: 400 }
      );
    }

    // ✅ FIXED: التحقق من createdBy بطريقة أبسط
    if (!createdBy || !createdBy.id || !createdBy.name || !createdBy.email || !createdBy.role) {
      console.log("❌ Invalid createdBy object");
      return NextResponse.json(
        {
          success: false,
          error: "createdBy must include: id, name, email, and role",
          message: "يجب أن يحتوي createdBy على: المعرف، الاسم، البريد الإلكتروني، والصلاحية",
        },
        { status: 400 }
      );
    }

    // ✅ FIXED: تبسيط تحضير البيانات
    const courseData = {
      title: title.trim(),
      description: description.trim(),
      level: level,
      createdBy: {
        id: createdBy.id,
        name: createdBy.name.trim(),
        email: createdBy.email.trim().toLowerCase(),
        role: createdBy.role,
      },
    };

    // Add optional fields if they exist
    if (curriculum && Array.isArray(curriculum)) {
      courseData.curriculum = curriculum;
    }
    
    if (projects && Array.isArray(projects)) {
      courseData.projects = projects;
    }
    
    if (instructors && Array.isArray(instructors)) {
      courseData.instructors = instructors;
    }
    
    if (price !== undefined && price !== null) {
      courseData.price = Number(price);
    }
    
    if (isActive !== undefined) {
      courseData.isActive = Boolean(isActive);
    }
    
    if (featured !== undefined) {
      courseData.featured = Boolean(featured);
    }
    
    if (thumbnail && thumbnail.trim() !== "") {
      courseData.thumbnail = thumbnail.trim();
    }

    console.log("📋 Course data prepared:", {
      title: courseData.title.substring(0, 30),
      level: courseData.level,
      curriculumModules: courseData.curriculum?.length || 0,
      hasCreatedBy: true,
    });

    // ✅ FIXED: استخدام new Course() بدلاً من Course.create() لتجنب المشاكل
    let course;
    try {
      console.log("💾 Creating course instance...");
      course = new Course(courseData);
      
      console.log("💾 Saving course to database...");
      await course.save();
      console.log("✅ Course saved successfully:", course._id);
    } catch (createError) {
      console.error("❌ Error saving course:", {
        name: createError.name,
        message: createError.message,
        errors: createError.errors,
      });

      // Handle validation errors
      if (createError.name === "ValidationError") {
        const errorDetails = {};
        if (createError.errors) {
          Object.keys(createError.errors).forEach(field => {
            errorDetails[field] = createError.errors[field].message;
          });
        }

        return NextResponse.json(
          {
            success: false,
            error: "Validation failed",
            message: "فشل التحقق من البيانات",
            details: errorDetails,
          },
          { status: 400 }
        );
      }

      // Handle duplicate errors
      if (createError.code === 11000) {
        const duplicateField = Object.keys(createError.keyPattern || {})[0] || "unknown";
        let errorMessage = "هذا الكورس موجود بالفعل";
        
        if (duplicateField === "slug") {
          errorMessage = "عنوان URL هذا مستخدم بالفعل، حاول استخدام عنوان مختلف";
        }
        
        return NextResponse.json(
          {
            success: false,
            error: "Duplicate entry",
            message: errorMessage,
            field: duplicateField,
          },
          { status: 409 }
        );
      }

      throw createError;
    }

    // ✅ FIXED: Try to populate after save
    let populatedCourse;
    try {
      populatedCourse = await Course.findById(course._id)
        .populate("instructors", "name email")
        .lean();
      console.log("✅ Course populated successfully");
    } catch (populateError) {
      console.warn("⚠️ Could not populate instructors:", populateError.message);
      populatedCourse = course.toObject ? course.toObject() : {
        ...courseData,
        _id: course._id,
        id: course._id,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      };
    }

    const totalTime = Date.now() - startTime;
    console.log(`🎉 Course creation completed in ${totalTime}ms`);

    return NextResponse.json(
      {
        success: true,
        data: populatedCourse,
        message: "تم إنشاء الكورس بنجاح",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error creating course:", error.message);
    
    // ✅ FIXED: معالجة الأخطاء النوعية
    if (error.message && error.message.includes("is not a function")) {
      return NextResponse.json(
        {
          success: false,
          error: "Internal function error",
          message: "خطأ داخلي في معالجة البيانات. تأكد من تنسيق البيانات المرسلة.",
        },
        { status: 500 }
      );
    }

    // ✅ رد الخطأ العام
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