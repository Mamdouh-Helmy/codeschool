// models/Course.js
import mongoose from "mongoose";

// Custom validators
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

      // Validate module has exactly 6 lessons
      if (!validateLessonsCount(module.lessons)) {
        return false;
      }

      // Validate each lesson has valid sessionNumber (1, 2, or 3)
      if (!Array.isArray(module.lessons)) {
        return false;
      }

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
      validate: {
        validator: function (value) {
          // التحقق من أن رقم السيشن يتناسب مع ترتيب الحصة
          // Lesson 1,2 → Session 1
          // Lesson 3,4 → Session 2
          // Lesson 5,6 → Session 3
          const expectedSession = Math.ceil(this.order / 2);
          return value === expectedSession;
        },
        message:
          "Session number must match lesson order (Lessons 1-2: Session 1, Lessons 3-4: Session 2, Lessons 5-6: Session 3)",
      },
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
      default: 3, // دائماً 3 سيشنات لكل 6 حصص
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
        validator: function (curriculum) {
          return validateCurriculum(curriculum);
        },
        message:
          "Invalid curriculum structure. Each module must have exactly 6 lessons with 3 sessions (2 lessons per session)",
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

// تعيين رقم السيشن تلقائياً لكل حصة حسب ترتيبها
CourseSchema.pre("save", function (next) {
  if (this.curriculum && this.curriculum.length > 0) {
    this.curriculum.forEach((module) => {
      if (module.lessons) {
        module.lessons.forEach((lesson) => {
          // حساب رقم السيشن من ترتيب الحصة
          // Lesson 1,2 → Session 1
          // Lesson 3,4 → Session 2
          // Lesson 5,6 → Session 3
          lesson.sessionNumber = Math.ceil(lesson.order / 2);
        });
        // تعيين إجمالي عدد السيشنات
        module.totalSessions = 3;
      }
    });
  }
  next();
});

delete mongoose.connection.models.Course;

const Course = mongoose.model("Course", CourseSchema);

export default Course;
