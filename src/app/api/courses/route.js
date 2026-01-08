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

    // Required field validation
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
          error: "createdBy information (id, name, email, role) is required",
        },
        { status: 400 }
      );
    }

    // Validate curriculum structure if provided
    if (curriculum && curriculum.length > 0) {
      const curriculumValidation = validateCurriculumStructure(curriculum);
      if (!curriculumValidation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid curriculum structure",
            details: curriculumValidation.errors,
          },
          { status: 400 }
        );
      }
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

    const populatedCourse = await Course.findById(course._id).populate(
      "instructors",
      "name email"
    );

    console.log("✅ Course created:", course._id);

    return NextResponse.json(
      {
        success: true,
        data: populatedCourse,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error creating course:", error);

    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors)
        .map((err) => err.message)
        .join("; ");
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: messages,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create course",
      },
      { status: 500 }
    );
  }
}