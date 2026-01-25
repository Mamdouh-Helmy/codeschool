// app/api/courses/route.js - COMPLETE FIXED VERSION
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Course from "../../models/Course";

// ==================== HELPER FUNCTIONS ====================

/**
 * Validate curriculum structure
 * @param {Array} curriculum - Array of modules
 * @returns {Object} - { valid: boolean, errors: Array }
 */
const validateCurriculumStructure = (curriculum) => {
  if (!curriculum || curriculum.length === 0) {
    return { valid: true, errors: [] };
  }

  const errors = [];

  curriculum.forEach((module, moduleIndex) => {
    // Check module is an object
    if (!module || typeof module !== "object") {
      errors.push(`Module ${moduleIndex + 1}: must be an object`);
      return;
    }

    // Check module title
    if (!module.title || module.title.trim() === "") {
      errors.push(`Module ${moduleIndex + 1}: title is required`);
    }

    // Check module order
    if (module.order === undefined || module.order === null) {
      errors.push(`Module ${moduleIndex + 1}: order is required`);
    }

    // Check lessons is array
    if (!Array.isArray(module.lessons)) {
      errors.push(`Module ${moduleIndex + 1}: lessons must be an array`);
      return;
    }

    // Check exact 6 lessons
    if (module.lessons.length !== 6) {
      errors.push(
        `Module ${moduleIndex + 1}: must have exactly 6 lessons (found ${module.lessons.length})`
      );
    }

    // Validate each lesson
    module.lessons.forEach((lesson, lessonIndex) => {
      if (!lesson || typeof lesson !== "object") {
        errors.push(
          `Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1}: must be an object`
        );
        return;
      }

      // Check lesson title
      if (!lesson.title || lesson.title.trim() === "") {
        errors.push(
          `Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1}: title is required`
        );
      }

      // Check lesson order
      if (lesson.order === undefined || lesson.order === null) {
        errors.push(
          `Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1}: order is required`
        );
      } else if (lesson.order < 1 || lesson.order > 6) {
        errors.push(
          `Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1}: order must be between 1 and 6`
        );
      }

      // Check session number
      const expectedSession = Math.ceil(lesson.order / 2);
      if (lesson.sessionNumber === undefined || lesson.sessionNumber === null) {
        errors.push(
          `Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1}: sessionNumber is required`
        );
      } else if (lesson.sessionNumber !== expectedSession) {
        errors.push(
          `Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1}: sessionNumber must be ${expectedSession} for lesson order ${lesson.order}`
        );
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
  };
};

// ==================== GET REQUEST ====================

/**
 * GET /api/courses
 * Fetch all courses with pagination
 * Query params: page, limit
 */
export async function GET(request) {
  const startTime = Date.now();

  try {
    console.log("🔍 GET /api/courses - Starting...");

    // Connect to database
    await connectDB();
    console.log("✅ Database connected");

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "10"));
    const skip = (page - 1) * limit;

    console.log(`📄 Fetching page ${page} with limit ${limit}`);

    // Count total documents
    const total = await Course.countDocuments();
    console.log(`📊 Total courses in database: ${total}`);

    // Fetch courses
    let courses;
    try {
      courses = await Course.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("instructors", "name email")
        .lean();

      console.log(`✅ Fetched ${courses.length} courses`);
    } catch (populateError) {
      console.warn("⚠️ Populate failed, fetching without populate:", populateError.message);
      courses = await Course.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    }

    const totalPages = Math.ceil(total / limit);
    const duration = Date.now() - startTime;

    console.log(`✅ GET request completed in ${duration}ms`);

    return NextResponse.json(
      {
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
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ GET /api/courses Error:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch courses",
        message: "فشل في جلب الكورسات",
      },
      { status: 500 }
    );
  }
}

// ==================== POST REQUEST ====================

/**
 * POST /api/courses
 * Create a new course
 * Required fields: title, description, level, createdBy
 */
export async function POST(request) {
  const startTime = Date.now();

  try {
    console.log("🚀 POST /api/courses - Starting course creation...");

    // Connect to database
    await connectDB();
    console.log("✅ Database connected");

    // Parse request body
    const body = await request.json();
    console.log("📥 Request body received");

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

    // ==================== VALIDATION ====================

    // Validate title
    if (!title || typeof title !== "string" || title.trim() === "") {
      console.log("❌ Validation failed: Missing or invalid title");
      return NextResponse.json(
        {
          success: false,
          error: "Title is required and must be a non-empty string",
          message: "العنوان مطلوب ويجب أن يكون نصاً غير فارغ",
        },
        { status: 400 }
      );
    }

    if (title.trim().length < 3) {
      console.log("❌ Validation failed: Title too short");
      return NextResponse.json(
        {
          success: false,
          error: "Title must be at least 3 characters long",
          message: "العنوان يجب أن يكون 3 أحرف على الأقل",
        },
        { status: 400 }
      );
    }

    // Validate description
    if (!description || typeof description !== "string" || description.trim() === "") {
      console.log("❌ Validation failed: Missing or invalid description");
      return NextResponse.json(
        {
          success: false,
          error: "Description is required and must be a non-empty string",
          message: "الوصف مطلوب ويجب أن يكون نصاً غير فارغ",
        },
        { status: 400 }
      );
    }

    if (description.trim().length < 10) {
      console.log("❌ Validation failed: Description too short");
      return NextResponse.json(
        {
          success: false,
          error: "Description must be at least 10 characters long",
          message: "الوصف يجب أن يكون 10 أحرف على الأقل",
        },
        { status: 400 }
      );
    }

    // Validate level
    if (!level || !["beginner", "intermediate", "advanced"].includes(level)) {
      console.log("❌ Validation failed: Invalid level:", level);
      return NextResponse.json(
        {
          success: false,
          error: "Level must be one of: beginner, intermediate, advanced",
          message: "المستوى يجب أن يكون: مبتدئ، متوسط، أو متقدم",
        },
        { status: 400 }
      );
    }

    // Validate createdBy
    if (!createdBy || typeof createdBy !== "object") {
      console.log("❌ Validation failed: Invalid createdBy object");
      return NextResponse.json(
        {
          success: false,
          error: "createdBy must be a valid object",
          message: "createdBy يجب أن يكون كائن صحيح",
        },
        { status: 400 }
      );
    }

    if (!createdBy.id || !createdBy.name || !createdBy.email || !createdBy.role) {
      console.log("❌ Validation failed: Missing createdBy fields");
      return NextResponse.json(
        {
          success: false,
          error: "createdBy must include: id, name, email, and role",
          message: "createdBy يجب أن يحتوي على: المعرف، الاسم، البريد الإلكتروني، والدور",
        },
        { status: 400 }
      );
    }

    // Validate curriculum if provided
    if (curriculum && Array.isArray(curriculum)) {
      const curriculumValidation = validateCurriculumStructure(curriculum);
      if (!curriculumValidation.valid) {
        console.log("❌ Validation failed: Invalid curriculum");
        return NextResponse.json(
          {
            success: false,
            error: "Invalid curriculum structure",
            message: "هيكل المناهج غير صحيح",
            details: curriculumValidation.errors,
          },
          { status: 400 }
        );
      }
    }

    // ==================== PREPARE COURSE DATA ====================

    console.log("📋 Preparing course data...");

    const courseData = {
      title: title.trim(),
      description: description.trim(),
      level: level.toLowerCase(),
      createdBy: {
        id: createdBy.id,
        name: createdBy.name.trim(),
        email: createdBy.email.trim().toLowerCase(),
        role: createdBy.role.trim(),
      },
    };

    // Add optional fields
    if (curriculum && Array.isArray(curriculum) && curriculum.length > 0) {
      courseData.curriculum = curriculum;
    }

    if (projects && Array.isArray(projects) && projects.length > 0) {
      courseData.projects = projects;
    }

    if (instructors && Array.isArray(instructors) && instructors.length > 0) {
      courseData.instructors = instructors;
    }

    if (price !== undefined && price !== null) {
      courseData.price = Math.max(0, Number(price));
    }

    if (isActive !== undefined) {
      courseData.isActive = Boolean(isActive);
    }

    if (featured !== undefined) {
      courseData.featured = Boolean(featured);
    }

    if (thumbnail && typeof thumbnail === "string" && thumbnail.trim() !== "") {
      courseData.thumbnail = thumbnail.trim();
    }

    console.log("✅ Course data prepared");

    // ==================== CREATE AND SAVE COURSE ====================

    console.log("💾 Creating and saving course...");

    let course;
    try {
      // Create new course instance
      course = new Course(courseData);

      // Save to database
      await course.save();
      console.log("✅ Course saved successfully:", course._id);
    } catch (saveError) {
      console.error("❌ Save error:", {
        name: saveError.name,
        message: saveError.message,
      });

      // Handle validation errors
      if (saveError.name === "ValidationError") {
        const errorDetails = {};
        if (saveError.errors) {
          Object.keys(saveError.errors).forEach((field) => {
            errorDetails[field] = saveError.errors[field].message;
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

      // Handle duplicate key errors
      if (saveError.code === 11000) {
        const duplicateField = Object.keys(saveError.keyPattern || {})[0] || "unknown";
        let errorMessage = "This course already exists";
        let arabicMessage = "هذا الكورس موجود بالفعل";

        if (duplicateField === "slug") {
          errorMessage = "This title URL is already in use";
          arabicMessage = "عنوان URL هذا مستخدم بالفعل";
        }

        return NextResponse.json(
          {
            success: false,
            error: "Duplicate entry",
            message: arabicMessage,
            field: duplicateField,
          },
          { status: 409 }
        );
      }

      // Unexpected error
      throw saveError;
    }

    // ==================== POPULATE AND RETURN ====================

    console.log("📤 Preparing response...");

    let populatedCourse;
    try {
      populatedCourse = await Course.findById(course._id)
        .populate("instructors", "name email")
        .lean();
      console.log("✅ Course populated successfully");
    } catch (populateError) {
      console.warn("⚠️ Could not populate instructors:", populateError.message);
      // Return course without populated instructors
      populatedCourse = course.toObject ? course.toObject() : {
        ...courseData,
        _id: course._id,
        id: course._id,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      };
    }

    const duration = Date.now() - startTime;
    console.log(`🎉 Course created successfully in ${duration}ms`);

    return NextResponse.json(
      {
        success: true,
        data: populatedCourse,
        message: "تم إنشاء الكورس بنجاح",
        duration: `${duration}ms`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ POST /api/courses Error:", error);
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

// ==================== DELETE REQUEST ====================

/**
 * DELETE /api/courses/[id]
 * Delete a course by ID
 */
export async function DELETE(request) {
  try {
    console.log("🗑️ DELETE /api/courses - Starting...");

    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Course ID is required",
          message: "معرف الكورس مطلوب",
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
          message: "الكورس غير موجود",
        },
        { status: 404 }
      );
    }

    console.log("✅ Course deleted:", id);

    return NextResponse.json(
      {
        success: true,
        message: "تم حذف الكورس بنجاح",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ DELETE error:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete course",
        message: "فشل في حذف الكورس",
      },
      { status: 500 }
    );
  }
}