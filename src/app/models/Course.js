// models/Course.js - SIMPLIFIED VERSION (NO VALIDATIONS)
import mongoose from "mongoose";

// LessonSchema بسيط بدون validations
const LessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    order: {
      type: Number,
    },
    sessionNumber: {
      type: Number,
    },
  },
  { _id: false }
);

// ModuleSchema بسيط
const ModuleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    order: {
      type: Number,
    },
    lessons: {
      type: [LessonSchema],
      default: [],
    },
    projects: {
      type: [String],
      default: [],
    },
    totalSessions: {
      type: Number,
      default: 3,
    },
  },
  { _id: true }
);

// CourseSchema بسيط بدون validations
const CourseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      sparse: true,
    },
    description: {
      type: String,
    },
    level: {
      type: String,
    },
    curriculum: {
      type: [ModuleSchema],
      default: [],
    },
    projects: {
      type: [String],
      default: [],
    },
    instructors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    price: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    thumbnail: {
      type: String,
      default: "",
    },
    createdBy: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      name: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
      role: {
        type: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Generate slug from title before saving
CourseSchema.pre("save", function (next) {
  try {
    if (this.isModified("title") || !this.slug) {
      const slug = this.title
        ? this.title
            .toLowerCase()
            .replace(/[^\w\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .trim()
        : "";
      
      this.slug = slug || `course-${Date.now()}`;
    }
    
    // Auto-calculate session numbers for lessons if not set
    if (this.curriculum && this.curriculum.length > 0) {
      this.curriculum.forEach((module) => {
        if (module.lessons && module.lessons.length > 0) {
          module.lessons.forEach((lesson) => {
            if (!lesson.sessionNumber || lesson.sessionNumber < 1 || lesson.sessionNumber > 3) {
              lesson.sessionNumber = Math.ceil(lesson.order / 2);
            }
          });
        }
        module.totalSessions = 3;
      });
    }
    
    next();
  } catch (error) {
    console.error("Error in CourseSchema pre-save hook:", error);
    next(error);
  }
});

// إضافة indexes مرة واحدة فقط
CourseSchema.index({ slug: 1 }, { unique: true, sparse: true });
CourseSchema.index({ createdAt: -1 });

// Clean model registration
if (mongoose.models.Course) {
  delete mongoose.models.Course;
}

const Course = mongoose.model("Course", CourseSchema);

export default Course;