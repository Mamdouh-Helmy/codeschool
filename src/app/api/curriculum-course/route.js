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
    slug: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple null values
      lowercase: true,
      trim: true,
    },
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

// Generate unique slug
CurriculumSchema.pre("save", async function (next) {
  if (this.isModified("title") && this.title) {
    let baseSlug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
    
    // If slug is empty after processing, use a default
    if (!baseSlug) {
      baseSlug = "curriculum";
    }
    
    // Check for duplicate slugs and append number if needed
    let slug = baseSlug;
    let counter = 1;
    
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const currentDoc = this;
    
    while (true) {
      const existing = await mongoose.models.Curriculum.findOne({ 
        slug, 
        _id: { $ne: currentDoc._id } 
      });
      
      if (!existing) {
        break;
      }
      
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  } else if (!this.slug && this.title) {
    // If no slug but has title, generate one
    const baseSlug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim() || "curriculum";
    
    this.slug = `${baseSlug}-${Date.now()}`;
  }
  
  next();
});

const Curriculum =
  mongoose.models.Curriculum || mongoose.model("Curriculum", CurriculumSchema);

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    let query = {};
    if (search) {
      query = {
        $or: [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { grade: { $regex: search, $options: "i" } },
          { subject: { $regex: search, $options: "i" } },
        ],
      };
    }

    const curriculums = await Curriculum.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: curriculums,
    });
  } catch (error) {
    console.error("Error fetching curriculums:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
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
      modules,
      level,
      grade,
      subject,
      duration,
      createdBy,
    } = body;

    if (!title || !level) {
      return NextResponse.json(
        {
          success: false,
          error: "Title and level are required",
        },
        { status: 400 },
      );
    }

    // Validate modules structure
    if (modules && modules.length > 0) {
      for (const module of modules) {
        if (!module.title) {
          return NextResponse.json(
            {
              success: false,
              error: "Each module must have a title",
            },
            { status: 400 },
          );
        }

        // Ensure each module has 6 lessons
        if (module.lessons && module.lessons.length !== 6) {
          return NextResponse.json(
            {
              success: false,
              error: "Each module must have exactly 6 lessons",
            },
            { status: 400 },
          );
        }
      }
    }

    const curriculum = await Curriculum.create({
      title,
      description,
      modules: modules || [],
      level,
      grade,
      subject,
      duration,
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
    console.error("Error creating curriculum:", error);
    
    // Handle duplicate key error specifically
    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          error: "A curriculum with this slug already exists. Please try a different title.",
        },
        { status: 409 },
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}