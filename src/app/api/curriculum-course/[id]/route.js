import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";

// Define schemas
const LessonSchema = new mongoose.Schema({
  title: String,
  description: String,
  order: Number,
  sessionNumber: Number,
});

const SessionSchema = new mongoose.Schema({
  sessionNumber: Number,
  objectives: [String],
  outline: [String],
  presentationUrl: String,
  projects: [String],
});

const ModuleSchema = new mongoose.Schema({
  title: String,
  description: String,
  order: Number,
  lessons: [LessonSchema],
  sessions: [SessionSchema],
  projects: [String],
  totalSessions: { type: Number, default: 3 },
});

const CurriculumSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    modules: [ModuleSchema],
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
    },
    grade: String,
    subject: String,
    duration: String,
    createdBy: {
      id: String,
      name: String,
      email: String,
      role: String,
    },
  },
  {
    timestamps: true,
  },
);

// Remove the problematic pre-save hook for slug generation
// We'll handle slug generation in a simpler way

const Curriculum =
  mongoose.models.Curriculum || mongoose.model("Curriculum", CurriculumSchema);

// GET single curriculum
export async function GET(request, { params }) {
  try {
    await connectDB();
    
    // IMPORTANT: Await the params
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Curriculum ID is required",
        },
        { status: 400 },
      );
    }

    const curriculum = await Curriculum.findById(id).lean();

    if (!curriculum) {
      return NextResponse.json(
        {
          success: false,
          error: "Curriculum not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: curriculum,
    });
  } catch (error) {
    console.error("❌ Error fetching curriculum:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch curriculum",
      },
      { status: 500 },
    );
  }
}

// UPDATE curriculum
export async function PUT(request, { params }) {
  try {
    await connectDB();
    
    // IMPORTANT: Await the params
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Curriculum ID is required",
        },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { 
      title, 
      description, 
      modules, 
      level, 
      grade, 
      subject, 
      duration,
      createdBy 
    } = body;

    // Validation
    if (!title || !title.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Title is required",
        },
        { status: 400 },
      );
    }

    if (!level) {
      return NextResponse.json(
        {
          success: false,
          error: "Level is required",
        },
        { status: 400 },
      );
    }

    // Validate modules if provided
    if (modules && Array.isArray(modules)) {
      for (const module of modules) {
        if (!module.title || !module.title.trim()) {
          return NextResponse.json(
            {
              success: false,
              error: "Each module must have a title",
            },
            { status: 400 },
          );
        }

        // Ensure each module has lessons
        if (!module.lessons || !Array.isArray(module.lessons)) {
          return NextResponse.json(
            {
              success: false,
              error: "Each module must have lessons array",
            },
            { status: 400 },
          );
        }
      }
    }

    const updateData = {
      title: title.trim(),
      description: description?.trim() || "",
      modules: modules || [],
      level,
      grade: grade?.trim() || "",
      subject: subject?.trim() || "",
      duration: duration?.trim() || "",
    };

    // Include createdBy if provided (for new curriculum)
    if (createdBy) {
      updateData.createdBy = createdBy;
    }

    const curriculum = await Curriculum.findByIdAndUpdate(
      id,
      updateData,
      { 
        new: true, 
        runValidators: true 
      },
    ).lean();

    if (!curriculum) {
      return NextResponse.json(
        {
          success: false,
          error: "Curriculum not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: curriculum,
      message: "Curriculum updated successfully",
    });
  } catch (error) {
    console.error("❌ Error updating curriculum:", error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error: " + Object.values(error.errors).map(e => e.message).join(', '),
        },
        { status: 400 },
      );
    }
    
    // Handle cast error (invalid ID)
    if (error.name === 'CastError') {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid curriculum ID",
        },
        { status: 400 },
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update curriculum",
      },
      { status: 500 },
    );
  }
}

// DELETE curriculum
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    
    // IMPORTANT: Await the params
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Curriculum ID is required",
        },
        { status: 400 },
      );
    }

    const curriculum = await Curriculum.findByIdAndDelete(id);

    if (!curriculum) {
      return NextResponse.json(
        {
          success: false,
          error: "Curriculum not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Curriculum deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting curriculum:", error);
    
    // Handle cast error (invalid ID)
    if (error.name === 'CastError') {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid curriculum ID",
        },
        { status: 400 },
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete curriculum",
      },
      { status: 500 },
    );
  }
}