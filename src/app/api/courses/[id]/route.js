// app/api/courses/[id]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Course from "../../../models/Course";
import mongoose from "mongoose";

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

export async function GET(request, { params }) {
  try {
    await connectDB();

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid course ID",
        },
        { status: 400 }
      );
    }

    const course = await Course.findById(id)
      .populate("instructors", "name email")
      .lean();

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          error: "Course not found",
        },
        { status: 404 }
      );
    }

    console.log("✅ Course fetched:", id);

    return NextResponse.json({
      success: true,
      data: course,
    });
  } catch (error) {
    console.error("❌ Error fetching course:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch course",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid course ID",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate curriculum structure if provided in update
    if (body.curriculum !== undefined) {
      const curriculumValidation = validateCurriculumStructure(
        body.curriculum
      );
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

    const course = await Course.findByIdAndUpdate(
      id,
      {
        ...body,
        updatedAt: new Date(),
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("instructors", "name email");

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          error: "Course not found",
        },
        { status: 404 }
      );
    }

    console.log("✅ Course updated:", id);

    return NextResponse.json({
      success: true,
      data: course,
    });
  } catch (error) {
    console.error("❌ Error updating course:", error);

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
        error: error.message || "Failed to update course",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid course ID",
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
        },
        { status: 404 }
      );
    }

    console.log("✅ Course deleted:", id);

    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch (error) {
    console.error("❌ Error deleting course:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete course",
      },
      { status: 500 }
    );
  }
}