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

export async function POST(request) {
  let startTime = Date.now();
  
  try {
    console.log("🚀 Starting course creation process...");

    await connectDB();
    console.log("✅ Database connected in", Date.now() - startTime, "ms");

    const body = await request.json();
    console.log("📥 Received course data");
    
    // ✅ FIXED: إزالة تسجيل البيانات الكامل لتجنب المشاكل
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

    // ✅ FIXED: تبسيط التحقق من createdBy
    if (!createdBy || typeof createdBy !== "object") {
      console.log("❌ Missing createdBy object");
      return NextResponse.json(
        {
          success: false,
          error: "createdBy information is required",
          message: "معلومات المنشئ مطلوبة",
        },
        { status: 400 }
      );
    }

    const requiredCreatedByFields = ["id", "name", "email", "role"];
    const missingFields = requiredCreatedByFields.filter(field => !createdBy[field]);

    if (missingFields.length > 0) {
      console.log("❌ Missing createdBy fields:", missingFields);
      return NextResponse.json(
        {
          success: false,
          error: `Missing createdBy fields: ${missingFields.join(", ")}`,
          message: `حقول ناقصة في معلومات المنشئ: ${missingFields.join(", ")}`,
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
            message: "هيكل المنهج الدراسي غير صالح",
            details: curriculumValidation.errors.slice(0, 5), // إظهار أول 5 أخطاء فقط
          },
          { status: 400 }
        );
      }
      console.log("✅ Curriculum validation passed");
    }

    console.log("📝 Creating course in database...");

    // ✅ FIXED: تنظيف البيانات بشكل آمن
    const courseData = {
      title: title.trim(),
      description: description.trim(),
      level: level,
      curriculum: curriculum || [],
      projects: projects || [],
      instructors: instructors || [],
      price: typeof price === "number" ? price : 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      featured: featured !== undefined ? Boolean(featured) : false,
      thumbnail: thumbnail && thumbnail.trim() !== "" ? thumbnail.trim() : "",
      createdBy: {
        id: createdBy.id.toString().trim(),
        name: createdBy.name.trim(),
        email: createdBy.email.trim(),
        role: createdBy.role,
      },
    };

    console.log("📋 Course data prepared:", {
      title: courseData.title.substring(0, 50) + (courseData.title.length > 50 ? "..." : ""),
      level: courseData.level,
      curriculumModules: courseData.curriculum.length,
      totalLessons: courseData.curriculum.reduce(
        (sum, m) => sum + (m.lessons?.length || 0),
        0
      ),
      hasCreatedBy: !!courseData.createdBy,
    });

    // ✅ FIXED: محاولة إنشاء الكورس مع معالجة الأخطاء المحددة
    let course;
    try {
      console.log("💾 Saving course to database...");
      course = await Course.create(courseData);
      console.log("✅ Course created successfully:", course._id);
    } catch (createError) {
      console.error("❌ Error creating course:", {
        name: createError.name,
        message: createError.message,
        errors: createError.errors,
        code: createError.code,
      });

      // معالجة خطأ Mongoose بشكل أفضل
      if (createError.name === "ValidationError") {
        const errorDetails = {};
        if (createError.errors) {
          for (const field in createError.errors) {
            errorDetails[field] = createError.errors[field].message;
          }
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

      // معالجة أخطاء التكرار
      if (createError.code === 11000) {
        const duplicateField = Object.keys(createError.keyPattern || {})[0] || "unknown";
        return NextResponse.json(
          {
            success: false,
            error: "Duplicate entry",
            message: `هذا الكورس موجود بالفعل (حقل مكرر: ${duplicateField})`,
            field: duplicateField,
          },
          { status: 409 }
        );
      }

      throw createError; // إعادة رمي الخطأ للمعالجة العامة
    }

    // ✅ FIXED: محاولة جلب الكورس مع populate
    let populatedCourse;
    try {
      populatedCourse = await Course.findById(course._id)
        .populate("instructors", "name email")
        .lean();
      console.log("✅ Course populated successfully");
    } catch (populateError) {
      console.warn("⚠️ Could not populate instructors:", populateError.message);
      populatedCourse = course.toObject ? course.toObject() : course;
    }

    const totalTime = Date.now() - startTime;
    console.log(`🎉 Course creation completed in ${totalTime}ms`);

    return NextResponse.json(
      {
        success: true,
        data: populatedCourse,
        message:
          "تم إنشاء الكورس بنجاح مع 3 جلسات لكل وحدة (حصتين لكل جلسة)",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error creating course:", {
      message: error.message,
      name: error.name,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });

    // ✅ FIXED: معالجة خطأ "e is not a function" بشكل محدد
    if (error.name === "TypeError" && error.message && error.message.includes("is not a function")) {
      console.error("🔍 TypeError details:", {
        message: error.message,
        stack: error.stack,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Internal validation error",
          message: "خطأ داخلي في التحقق من البيانات. يرجى التحقق من تنسيق البيانات المرسلة.",
          suggestion: "تأكد من أن جميع الحقول مرسلة بالتنسيق الصحيح وأن curriculum يحتوي على هيكل صالح.",
        },
        { status: 500 }
      );
    }

    // ✅ معالجة أخطاء Mongoose الأخرى
    if (error.name === "CastError") {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid value for field: ${error.path}`,
          message: `قيمة غير صالحة للحقل: ${error.path}`,
          field: error.path,
          value: error.value,
        },
        { status: 400 }
      );
    }

    // ✅ معالجة أخطاء الـ Reference
    if (error.name === "ReferenceError") {
      return NextResponse.json(
        {
          success: false,
          error: "Internal reference error",
          message: "خطأ مرجعي داخلي. يرجى إعادة المحاولة.",
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