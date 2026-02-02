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
  }
);

const Curriculum =
  mongoose.models.Curriculum || mongoose.model("Curriculum", CurriculumSchema);

// GET all curriculums
export async function GET(request) {
  try {
    await connectDB();

    // حذف الـ index القديم للـ slug (سيتم تنفيذه مرة واحدة فقط)
    try {
      const collection = mongoose.connection.db.collection('curriculums');
      await collection.dropIndex('slug_1');
      console.log('✅ Old slug index removed');
    } catch (err) {
      // Index already removed or doesn't exist - ignore
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const level = searchParams.get("level");
    const grade = searchParams.get("grade");
    const subject = searchParams.get("subject");

    let query = {};
    
    // Build search query
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { grade: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
      ];
    }
    
    // Add filters
    if (level) {
      query.level = level;
    }
    
    if (grade) {
      query.grade = { $regex: grade, $options: "i" };
    }
    
    if (subject) {
      query.subject = { $regex: subject, $options: "i" };
    }

    const curriculums = await Curriculum.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: curriculums,
      count: curriculums.length,
    });
  } catch (error) {
    console.error("❌ Error fetching curriculums:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch curriculums",
      },
      { status: 500 },
    );
  }
}

// CREATE new curriculum
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      title,
      description,
      modules,
      level,
      grade,
      subject,
      duration,
      createdBy,
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

    if (!createdBy || !createdBy.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Creator information is required",
        },
        { status: 400 },
      );
    }

    // Validate modules structure
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

        // Ensure each module has lessons array
        if (!module.lessons || !Array.isArray(module.lessons)) {
          return NextResponse.json(
            {
              success: false,
              error: "Each module must have lessons array",
            },
            { status: 400 },
          );
        }

        // Ensure sessions array exists
        if (!module.sessions || !Array.isArray(module.sessions)) {
          module.sessions = [
            {
              sessionNumber: 1,
              objectives: [],
              outline: [],
              projects: [],
            },
            {
              sessionNumber: 2,
              objectives: [],
              outline: [],
              projects: [],
            },
            {
              sessionNumber: 3,
              objectives: [],
              outline: [],
              projects: [],
            },
          ];
        }
      }
    }

    const curriculum = await Curriculum.create({
      title: title.trim(),
      description: description?.trim() || "",
      modules: modules || [],
      level,
      grade: grade?.trim() || "",
      subject: subject?.trim() || "",
      duration: duration?.trim() || "",
      createdBy,
    });

    return NextResponse.json(
      {
        success: true,
        data: curriculum,
        message: "Curriculum created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("❌ Error creating curriculum:", error);
    
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
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create curriculum",
      },
      { status: 500 },
    );
  }
}