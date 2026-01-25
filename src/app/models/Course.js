// models/Course.js - COMPLETE FIXED VERSION
import mongoose from "mongoose";

// ==================== LESSON SCHEMA ====================
const LessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    order: {
      type: Number,
      default: 1,
    },
    sessionNumber: {
      type: Number,
      default: 1,
    },
  },
  { _id: false }
);

// ==================== MODULE SCHEMA ====================
const ModuleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    order: {
      type: Number,
      default: 1,
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

// ==================== COURSE SCHEMA ====================
const CourseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [200, "Title cannot exceed 200 characters"],
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
      minlength: [10, "Description must be at least 10 characters"],
    },
    level: {
      type: String,
      required: [true, "Level is required"],
      enum: {
        values: ["beginner", "intermediate", "advanced"],
        message: "Level must be beginner, intermediate, or advanced",
      },
    },
    curriculum: {
      type: [ModuleSchema],
      default: [],
      validate: {
        validator: function (curriculum) {
          // Allow empty curriculum
          if (!curriculum || curriculum.length === 0) return true;

          // Validate each module
          return curriculum.every((module, moduleIndex) => {
            // Basic module validation
            if (!module.title || module.title.trim() === "") {
              throw new Error(`Module ${moduleIndex + 1} must have a title`);
            }

            if (module.order === undefined || module.order < 1) {
              throw new Error(`Module ${moduleIndex + 1} must have a valid order`);
            }

            // Lessons validation
            if (!Array.isArray(module.lessons)) {
              throw new Error(`Module ${moduleIndex + 1} lessons must be an array`);
            }

            // Check if we have exactly 6 lessons
            if (module.lessons.length !== 6) {
              throw new Error(`Module ${moduleIndex + 1} must have exactly 6 lessons`);
            }

            // Validate each lesson
            return module.lessons.every((lesson, lessonIndex) => {
              if (!lesson.title || lesson.title.trim() === "") {
                throw new Error(`Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1} must have a title`);
              }

              if (lesson.order === undefined || lesson.order < 1 || lesson.order > 6) {
                throw new Error(
                  `Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1} must have order between 1 and 6`
                );
              }

              return true;
            });
          });
        },
        message: "Invalid curriculum structure",
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
      min: [0, "Price cannot be negative"],
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
        required: [true, "Creator ID is required"],
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
        lowercase: true,
      },
      role: {
        type: String,
        required: [true, "Creator role is required"],
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ==================== MIDDLEWARE ====================

// ✅ Pre-save hook - Generate slug and validate curriculum
CourseSchema.pre("save", function (next) {
  console.log("🔧 Running pre-save hook for course...");

  try {
    // Generate slug from title
    if (this.isModified("title") || !this.slug) {
      const slug = this.title
        ? this.title
            .toLowerCase()
            .replace(/[^\w\s-]/g, "") // Remove special chars
            .replace(/\s+/g, "-") // Replace spaces with hyphens
            .replace(/-+/g, "-") // Replace multiple hyphens with single
            .trim()
        : "";

      this.slug = slug || `course-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log(`📝 Generated slug: ${this.slug}`);
    }

    // Ensure curriculum has proper structure
    if (this.curriculum && Array.isArray(this.curriculum)) {
      console.log(`📚 Processing ${this.curriculum.length} modules...`);

      this.curriculum.forEach((module, moduleIndex) => {
        // Ensure module has order
        if (module.order === undefined || module.order === null) {
          module.order = moduleIndex + 1;
        }

        // Ensure module has title
        if (!module.title || module.title.trim() === "") {
          module.title = `Module ${module.order}`;
        }

        // Ensure module has lessons array
        if (!module.lessons || !Array.isArray(module.lessons)) {
          module.lessons = [];
        }

        // Process lessons
        if (module.lessons && Array.isArray(module.lessons) && module.lessons.length > 0) {
          for (let lessonIndex = 0; lessonIndex < module.lessons.length; lessonIndex++) {
            const lesson = module.lessons[lessonIndex];

            if (!lesson || typeof lesson !== "object") continue;

            // Ensure lesson has order
            if (lesson.order === undefined || lesson.order === null) {
              lesson.order = lessonIndex + 1;
            }

            // Ensure lesson has session number
            if (lesson.sessionNumber === undefined || lesson.sessionNumber === null) {
              lesson.sessionNumber = Math.ceil(lesson.order / 2);
            }

            // Ensure session number is valid (1-3)
            if (lesson.sessionNumber < 1) lesson.sessionNumber = 1;
            if (lesson.sessionNumber > 3) lesson.sessionNumber = 3;

            // Ensure lesson has title
            if (!lesson.title || (typeof lesson.title === "string" && lesson.title.trim() === "")) {
              lesson.title = `Lesson ${lesson.order}`;
            }
          }
        }

        // Set total sessions for module
        module.totalSessions = 3;
      });
    }

    console.log("✅ Pre-save hook completed successfully");
    next();
  } catch (err) {
    console.error("❌ Error in pre-save hook:", err.message);
    next(err);
  }
});

// ==================== VIRTUAL PROPERTIES ====================

// Total lessons in course
CourseSchema.virtual("totalLessons").get(function () {
  if (!this.curriculum) return 0;
  return this.curriculum.reduce((total, module) => {
    return total + (module.lessons?.length || 0);
  }, 0);
});

// Total modules in course
CourseSchema.virtual("totalModules").get(function () {
  return this.curriculum?.length || 0;
});

// Course duration in weeks
CourseSchema.virtual("durationWeeks").get(function () {
  const totalModules = this.curriculum?.length || 0;
  return Math.ceil(totalModules * 1.5);
});

// ==================== STATIC METHODS ====================

// Find course by slug
CourseSchema.statics.findBySlug = async function (slug) {
  return this.findOne({ slug, isActive: true });
};

// Get active courses
CourseSchema.statics.getActiveCourses = async function (options = {}) {
  const { limit = 10, page = 1, featured = false } = options;
  const skip = (page - 1) * limit;

  const query = { isActive: true };
  if (featured) query.featured = true;

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("instructors", "name email avatar");
};

// Search courses
CourseSchema.statics.searchCourses = async function (searchTerm, options = {}) {
  const { limit = 10, page = 1 } = options;
  const skip = (page - 1) * limit;

  const query = {
    isActive: true,
    $or: [
      { title: { $regex: searchTerm, $options: "i" } },
      { description: { $regex: searchTerm, $options: "i" } },
      { level: { $regex: searchTerm, $options: "i" } },
    ],
  };

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("instructors", "name email avatar");
};

// ==================== INSTANCE METHODS ====================

// Get course summary
CourseSchema.methods.getSummary = function () {
  return {
    id: this._id,
    title: this.title,
    slug: this.slug,
    description: this.description.substring(0, 150) + (this.description.length > 150 ? "..." : ""),
    level: this.level,
    totalModules: this.totalModules,
    totalLessons: this.totalLessons,
    durationWeeks: this.durationWeeks,
    price: this.price,
    thumbnail: this.thumbnail,
    featured: this.featured,
  };
};

// Add instructor to course
CourseSchema.methods.addInstructor = async function (instructorId) {
  if (!this.instructors.includes(instructorId)) {
    this.instructors.push(instructorId);
    await this.save();
  }
  return this;
};

// Remove instructor from course
CourseSchema.methods.removeInstructor = async function (instructorId) {
  const index = this.instructors.indexOf(instructorId);
  if (index > -1) {
    this.instructors.splice(index, 1);
    await this.save();
  }
  return this;
};

// ==================== INDEXES ====================

CourseSchema.index({ slug: 1 }, { unique: true, sparse: true });
CourseSchema.index({ title: "text", description: "text" });
CourseSchema.index({ level: 1 });
CourseSchema.index({ isActive: 1, featured: 1 });
CourseSchema.index({ "createdBy.id": 1 });
CourseSchema.index({ createdAt: -1 });

// ==================== MODEL CREATION ====================

let Course;

try {
  Course = mongoose.model("Course");
} catch (error) {
  Course = mongoose.model("Course", CourseSchema);
}

export default Course;