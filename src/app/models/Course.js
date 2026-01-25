// models/Course.js - FIXED VERSION (No Arrow Functions)
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

// ==================== HELPER FUNCTION ====================
function generateSlug(title) {
  if (!title) {
    return `course-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function processCurriculum(curriculum) {
  if (!curriculum || !Array.isArray(curriculum) || curriculum.length === 0) {
    return curriculum;
  }

  curriculum.forEach(function (module, moduleIndex) {
    if (!module) return;

    if (module.order === undefined || module.order === null) {
      module.order = moduleIndex + 1;
    }

    if (!module.title || module.title.trim() === "") {
      module.title = `Module ${module.order}`;
    }

    if (!Array.isArray(module.lessons)) {
      module.lessons = [];
    }

    if (module.lessons && module.lessons.length > 0) {
      module.lessons.forEach(function (lesson, lessonIndex) {
        if (!lesson || typeof lesson !== "object") return;

        if (lesson.order === undefined || lesson.order === null) {
          lesson.order = lessonIndex + 1;
        }

        if (lesson.sessionNumber === undefined || lesson.sessionNumber === null) {
          lesson.sessionNumber = Math.ceil(lesson.order / 2);
        }

        if (lesson.sessionNumber < 1) lesson.sessionNumber = 1;
        if (lesson.sessionNumber > 3) lesson.sessionNumber = 3;

        if (!lesson.title || (typeof lesson.title === "string" && lesson.title.trim() === "")) {
          lesson.title = `Lesson ${lesson.order}`;
        }
      });
    }

    module.totalSessions = 3;
  });

  return curriculum;
}

// ==================== MIDDLEWARE ====================

// ✅ Pre-save hook - SIMPLIFIED
CourseSchema.pre("save", function (next) {
  console.log("🔧 Running pre-save hook for course...");

  try {
    // Generate slug from title
    if (this.isModified("title") || !this.slug) {
      this.slug = generateSlug(this.title);
      console.log(`📝 Generated slug: ${this.slug}`);
    }

    // Process curriculum
    if (this.curriculum && Array.isArray(this.curriculum)) {
      console.log(`📚 Processing ${this.curriculum.length} modules...`);
      this.curriculum = processCurriculum(this.curriculum);
    }

    console.log("✅ Pre-save hook completed successfully");
    return next();
  } catch (err) {
    console.error("❌ Error in pre-save hook:", err.message || err);
    return next(err);
  }
});

// ==================== VIRTUAL PROPERTIES ====================

CourseSchema.virtual("totalLessons").get(function () {
  if (!this.curriculum) return 0;
  return this.curriculum.reduce(function (total, module) {
    return total + (module.lessons?.length || 0);
  }, 0);
});

CourseSchema.virtual("totalModules").get(function () {
  return this.curriculum?.length || 0;
});

CourseSchema.virtual("durationWeeks").get(function () {
  const totalModules = this.curriculum?.length || 0;
  return Math.ceil(totalModules * 1.5);
});

// ==================== STATIC METHODS ====================

CourseSchema.statics.findBySlug = async function (slug) {
  return this.findOne({ slug, isActive: true });
};

CourseSchema.statics.getActiveCourses = async function (options) {
  const opts = options || {};
  const limit = opts.limit || 10;
  const page = opts.page || 1;
  const featured = opts.featured || false;
  const skip = (page - 1) * limit;

  const query = { isActive: true };
  if (featured) query.featured = true;

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("instructors", "name email avatar");
};

CourseSchema.statics.searchCourses = async function (searchTerm, options) {
  const opts = options || {};
  const limit = opts.limit || 10;
  const page = opts.page || 1;
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

CourseSchema.methods.getSummary = function () {
  return {
    id: this._id,
    title: this.title,
    slug: this.slug,
    description:
      this.description.substring(0, 150) +
      (this.description.length > 150 ? "..." : ""),
    level: this.level,
    totalModules: this.totalModules,
    totalLessons: this.totalLessons,
    durationWeeks: this.durationWeeks,
    price: this.price,
    thumbnail: this.thumbnail,
    featured: this.featured,
  };
};

CourseSchema.methods.addInstructor = async function (instructorId) {
  if (!this.instructors.includes(instructorId)) {
    this.instructors.push(instructorId);
    await this.save();
  }
  return this;
};

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