// models/Course.js
import mongoose from "mongoose";

// Custom validators
const validateLessonsCount = (lessons) => {
  if (!Array.isArray(lessons)) return false;
  return lessons.length === 6;
};

const validateSessionsCount = (lesson) => {
  return lesson.sessionsCount === 2;
};

const validateCurriculum = function (curriculum) {
  if (!curriculum || curriculum.length === 0) {
    return true; // Curriculum is optional
  }

  return curriculum.every((module) => {
    // Validate module has exactly 6 lessons
    if (!validateLessonsCount(module.lessons)) {
      return false;
    }

    // Validate each lesson has sessionsCount = 2
    return module.lessons.every((lesson) => validateSessionsCount(lesson));
  });
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
    },
    order: {
      type: Number,
      required: [true, "Lesson order is required"],
      min: 1,
      max: 6,
    },
    sessionsCount: {
      type: Number,
      required: true,
      enum: [2],
      default: 2,
    },
  },
  { _id: true }
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
    },
    order: {
      type: Number,
      required: [true, "Module order is required"],
    },
    lessons: {
      type: [LessonSchema],
      validate: {
        validator: validateLessonsCount,
        message: "Each module must have exactly 6 lessons",
      },
    },
    projects: {
      type: [String],
      default: [],
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
        validator: validateCurriculum,
        message:
          "Invalid curriculum structure. Each module must have exactly 6 lessons, and each lesson must have sessionsCount = 2",
      },
    },
    projects: [
      {
        type: String,
      },
    ],
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
    },
    createdBy: {
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
  },
  {
    timestamps: true,
  }
);

// Generate slug from title before saving
CourseSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }
  next();
});

// Ensure each lesson's sessionsCount is always 2 before saving
CourseSchema.pre("save", function (next) {
  if (this.curriculum && this.curriculum.length > 0) {
    this.curriculum.forEach((module) => {
      if (module.lessons) {
        module.lessons.forEach((lesson) => {
          lesson.sessionsCount = 2;
        });
      }
    });
  }
  next();
});

delete mongoose.connection.models.Course;

const Course = mongoose.model("Course", CourseSchema);

export default Course;
