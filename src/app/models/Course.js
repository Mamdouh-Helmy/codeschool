// models/Course.js
import mongoose from "mongoose";

// Simplified validators
const validateLessonsCount = function (lessons) {
  if (!Array.isArray(lessons)) return false;
  return lessons.length === 6;
};

const validateSessionNumber = function (lesson) {
  if (!lesson || typeof lesson !== "object") return false;
  // يجب أن يكون رقم السيشن بين 1 و 3
  return lesson.sessionNumber >= 1 && lesson.sessionNumber <= 3;
};

const validateCurriculum = function (curriculum) {
  try {
    if (!curriculum || curriculum.length === 0) {
      return true; // Curriculum is optional
    }

    if (!Array.isArray(curriculum)) {
      return false;
    }

    for (let i = 0; i < curriculum.length; i++) {
      const module = curriculum[i];

      if (!module || typeof module !== "object") {
        return false;
      }

      // Validate lessons exist
      if (!Array.isArray(module.lessons)) {
        return false;
      }

      // Validate module has exactly 6 lessons
      if (!validateLessonsCount(module.lessons)) {
        return false;
      }

      // Validate each lesson has valid sessionNumber (1, 2, or 3)
      for (let j = 0; j < module.lessons.length; j++) {
        const lesson = module.lessons[j];
        if (!validateSessionNumber(lesson)) {
          return false;
        }
      }
    }

    return true;
  } catch (err) {
    console.error("Error in validateCurriculum:", err);
    return false;
  }
};

const LessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Lesson title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    order: {
      type: Number,
      required: [true, "Lesson order is required"],
      min: 1,
      max: 6,
    },
    sessionNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 3,
    },
  },
  { _id: true, _id: false } // Disable _id for lessons if they're always nested
);

const ModuleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Module title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    order: {
      type: Number,
      required: [true, "Module order is required"],
      min: 1,
    },
    lessons: {
      type: [LessonSchema],
      default: [],
      validate: {
        validator: function (lessons) {
          return validateLessonsCount(lessons);
        },
        message:
          "Each module must have exactly 6 lessons (3 sessions: 2 lessons per session)",
      },
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

const CourseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
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
      required: [true, "Description is required"],
    },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: [true, "Level is required"],
    },
    curriculum: {
      type: [ModuleSchema],
      default: [],
      validate: {
        validator: function (curriculum) {
          return validateCurriculum(curriculum);
        },
        message:
          "Invalid curriculum structure. Each module must have exactly 6 lessons with 3 sessions (2 lessons per session)",
      },
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
      min: 0,
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
      type: new mongoose.Schema(
        {
          id: {
            type: String,
            required: [true, "Creator ID is required"],
            trim: true,
          },
          name: {
            type: String,
            required: [true, "Creator name is required"],
            trim: true,
          },
          email: {
            type: String,
            required: [true, "Creator email is required"],
            trim: true,
          },
          role: {
            type: String,
            enum: ["admin", "instructor"],
            required: [true, "Creator role is required"],
          },
        },
        { _id: false }
      ),
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Generate slug from title before saving
CourseSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    const slug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
    
    // Ensure slug is not empty
    this.slug = slug || `course-${Date.now()}`;
  }
  
  // Auto-calculate session numbers for lessons if not set
  if (this.curriculum && this.curriculum.length > 0) {
    this.curriculum.forEach((module) => {
      if (module.lessons && module.lessons.length > 0) {
        module.lessons.forEach((lesson) => {
          // Only set sessionNumber if not already set
          if (!lesson.sessionNumber || lesson.sessionNumber < 1 || lesson.sessionNumber > 3) {
            // Calculate session number from order: 
            // Lessons 1-2 → Session 1, Lessons 3-4 → Session 2, Lessons 5-6 → Session 3
            lesson.sessionNumber = Math.ceil(lesson.order / 2);
          }
        });
      }
      // Ensure totalSessions is 3
      module.totalSessions = 3;
    });
  }
  
  next();
});

// Fix for hot reloading in development
if (mongoose.models.Course) {
  delete mongoose.models.Course;
}

const Course = mongoose.model("Course", CourseSchema);

export default Course;