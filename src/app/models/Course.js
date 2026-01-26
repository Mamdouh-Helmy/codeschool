// models/Course.js - FINAL CLEAN VERSION
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

// ==================== MIDDLEWARE ====================

// ✅ CLEAN Pre-save hook - NO TRY-CATCH
CourseSchema.pre("save", function (next) {
  console.log("🔧 Running pre-save hook for course...");

  // Generate slug from title
  if (this.isModified("title") || !this.slug) {
    const title = this.title || "";
    const slug =
      title
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim() || `course-${Date.now()}`;

    this.slug = slug;
    console.log("📝 Generated slug:", this.slug);
  }

  console.log("✅ Pre-save hook completed successfully");
  next();
});

// ==================== VIRTUAL PROPERTIES ====================

CourseSchema.virtual("totalLessons").get(function () {
  if (!this.curriculum) return 0;
  let total = 0;
  for (let i = 0; i < this.curriculum.length; i++) {
    const module = this.curriculum[i];
    if (module && module.lessons) {
      total += module.lessons.length;
    }
  }
  return total;
});

CourseSchema.virtual("totalModules").get(function () {
  return this.curriculum ? this.curriculum.length : 0;
});

CourseSchema.virtual("durationWeeks").get(function () {
  const totalModules = this.curriculum ? this.curriculum.length : 0;
  return Math.ceil(totalModules * 1.5);
});

// ==================== STATIC METHODS ====================

CourseSchema.statics.findBySlug = async function (slug) {
  return this.findOne({ slug: slug, isActive: true });
};

CourseSchema.statics.getActiveCourses = async function (options) {
  const opts = options || {};
  const limit = opts.limit || 10;
  const page = opts.page || 1;
  const skip = (page - 1) * limit;

  const query = { isActive: true };
  if (opts.featured) {
    query.featured = true;
  }

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
  const desc = this.description || "";
  return {
    id: this._id,
    title: this.title,
    slug: this.slug,
    description: desc.substring(0, 150) + (desc.length > 150 ? "..." : ""),
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
  for (let i = 0; i < this.instructors.length; i++) {
    if (this.instructors[i].toString() === instructorId.toString()) {
      return this;
    }
  }
  this.instructors.push(instructorId);
  return this.save();
};

CourseSchema.methods.removeInstructor = async function (instructorId) {
  for (let i = 0; i < this.instructors.length; i++) {
    if (this.instructors[i].toString() === instructorId.toString()) {
      this.instructors.splice(i, 1);
      return this.save();
    }
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