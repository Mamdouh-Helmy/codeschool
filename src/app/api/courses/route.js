// app/api/courses/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Course from "../../models/Course";

// Helper: Validate curriculum structure
const validateCurriculumStructure = (curriculum) => {
  if (!curriculum || curriculum.length === 0) {
    return { valid: true, errors: [] };
  }

  const errors = [];

  curriculum.forEach((module, moduleIndex) => {
    // Check module has required fields
    if (!module.title || module.title.trim() === "") {
      errors.push(
        `Module ${moduleIndex + 1}: title is required`
      );
    }

    if (module.order === undefined || module.order === null) {
      errors.push(
        `Module ${moduleIndex + 1}: order is required`
      );
    }

    // Check lessons count
    if (!Array.isArray(module.lessons)) {
      errors.push(
        `Module ${moduleIndex + 1}: lessons must be an array`
      );
      return;
    }

    if (module.lessons.length !== 6) {
      errors.push(
        `Module ${moduleIndex + 1}: must have exactly 6 lessons (found ${module.lessons.length})`
      );
    }

    // Validate each lesson
    module.lessons.forEach((lesson, lessonIndex) => {
      if (!lesson.title || lesson.title.trim() === "") {
        errors.push(
          `Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1}: title is required`
        );
      }

      if (lesson.order === undefined || lesson.order === null) {
        errors.push(
          `Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1}: order is required`
        );
      }

      if (lesson.sessionsCount !== 2) {
        errors.push(
          `Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1}: sessionsCount must be 2 (found ${lesson.sessionsCount})`
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

    console.log("✅ Courses fetched from DB");

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
    console.log("🚀 Starting course creation process...");
    
    await connectDB();
    console.log("✅ Database connected");

    const body = await request.json();
    console.log("📥 Received course data:", JSON.stringify(body, null, 2));

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
    if (!title || !description || !level) {
      console.log("❌ Missing required fields");
      return NextResponse.json(
        {
          success: false,
          error: "Title, description, and level are required",
          message: "Title, description, and level are required",
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
      console.log("❌ Missing createdBy information");
      return NextResponse.json(
        {
          success: false,
          error: "createdBy information (id, name, email, role) is required",
          message: "createdBy information (id, name, email, role) is required",
        },
        { status: 400 }
      );
    }

    // Validate curriculum structure if provided
    if (curriculum && curriculum.length > 0) {
      console.log("🔍 Validating curriculum structure...");
      const curriculumValidation = validateCurriculumStructure(curriculum);
      if (!curriculumValidation.valid) {
        console.log("❌ Curriculum validation failed:", curriculumValidation.errors);
        return NextResponse.json(
          {
            success: false,
            error: "Invalid curriculum structure",
            message: "Invalid curriculum structure",
            details: curriculumValidation.errors,
          },
          { status: 400 }
        );
      }
      console.log("✅ Curriculum validation passed");
    }

    console.log("📝 Creating course in database...");
    
    // ✅ تنظيف البيانات قبل الحفظ
    const courseData = {
      title: title.trim(),
      description: description.trim(),
      level,
      curriculum: curriculum || [],
      projects: projects || [],
      instructors: instructors || [],
      price: price || 0,
      isActive: isActive !== undefined ? isActive : true,
      featured: featured !== undefined ? featured : false,
      thumbnail: thumbnail && thumbnail.trim() !== "" ? thumbnail.trim() : undefined,
      createdBy: {
        id: createdBy.id,
        name: createdBy.name,
        email: createdBy.email,
        role: createdBy.role,
      },
    };

    console.log("📋 Course data prepared:", {
      title: courseData.title,
      level: courseData.level,
      curriculumModules: courseData.curriculum.length,
      instructors: courseData.instructors.length,
    });
    
    const course = await Course.create(courseData);

    const populatedCourse = await Course.findById(course._id).populate(
      "instructors",
      "name email"
    );

    console.log("✅ Course created successfully:", course._id);

    return NextResponse.json(
      {
        success: true,
        data: populatedCourse,
        message: "Course created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error creating course:", {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      errors: error.errors,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue,
    });

    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors || {})
        .map((err) => err.message || err.toString())
        .join("; ");
      console.error("❌ Validation errors:", messages);
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          message: "فشل التحقق من البيانات",
          details: messages,
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
          message: `الكورس موجود مسبقاً: ${field}`,
          field: field,
        },
        { status: 409 }
      );
    }

    // Handle CastError (invalid ObjectId, etc.)
    if (error.name === "CastError") {
      console.error("❌ Cast error:", error.path, error.value);
      return NextResponse.json(
        {
          success: false,
          error: `Invalid value for field: ${error.path}`,
          message: `قيمة غير صحيحة للحقل: ${error.path}`,
          field: error.path,
          value: error.value,
        },
        { status: 400 }
      );
    }

    // Handle TypeError (like "e is not a function")
    if (error.name === "TypeError" && error.message.includes("is not a function")) {
      console.error("❌ TypeError - function call error:", error.message);
      return NextResponse.json(
        {
          success: false,
          error: "Internal validation error",
          message: "خطأ في التحقق من البيانات. يرجى التحقق من صحة البيانات المدخلة.",
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create course",
        message: error.message || "فشل في إنشاء الكورس",
        ...(process.env.NODE_ENV === "development" && {
          stack: error.stack,
          details: {
            name: error.name,
            code: error.code,
          },
        }),
      },
      { status: 500 }
    );
  }
}