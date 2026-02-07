// models/Course.js - COMPLETE FIX

import mongoose from "mongoose";

// ✅ Lesson Schema
const LessonSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  order: { type: Number, required: true },
  sessionNumber: { type: Number, default: 1 },
  duration: { type: String, default: "45 mins" },
}, { _id: false });

// ✅ Session Schema
const SessionSchema = new mongoose.Schema({
  sessionNumber: { type: Number, required: true },
  presentationUrl: { type: String, default: "" },
}, { _id: false });

// ✅ Module Schema - WITH INLINE BLOG (NO SEPARATE SCHEMA)
const ModuleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  order: { type: Number, required: true },
  lessons: { type: [LessonSchema], default: [] },
  sessions: { type: [SessionSchema], default: [] },
  projects: { type: [String], default: [] },
  blogBodyAr: { type: String, default: "" },  // ✅ FLAT STRUCTURE
  blogBodyEn: { type: String, default: "" },  // ✅ FLAT STRUCTURE
  blogCreatedAt: { type: Date, default: Date.now },
  blogUpdatedAt: { type: Date, default: Date.now },
  totalSessions: { type: Number, default: 3 },
}, { _id: false });

// ✅ Course Schema
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
      enum: ["beginner", "intermediate", "advanced"],
    },
    grade: { type: String, default: "" },
    subject: { type: String, default: "" },
    duration: { type: String, default: "" },
    
    curriculum: { type: [ModuleSchema], default: [] },
    
    isActive: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    thumbnail: { type: String, default: "" },
    
    createdBy: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      role: { type: String, required: true },
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
  }
);

// Virtuals
CourseSchema.virtual("totalModules").get(function () {
  return this.curriculum ? this.curriculum.length : 0;
});

CourseSchema.virtual("totalLessons").get(function () {
  if (!this.curriculum) return 0;
  return this.curriculum.reduce((total, module) => 
    total + (module.lessons ? module.lessons.length : 0), 0
  );
});

CourseSchema.virtual("totalSessions").get(function () {
  if (!this.curriculum) return 0;
  return this.curriculum.reduce((total, module) => 
    total + (module.totalSessions || 3), 0
  );
});

CourseSchema.virtual("totalProjects").get(function () {
  if (!this.curriculum) return 0;
  return this.curriculum.reduce((total, module) => 
    total + (module.projects ? module.projects.length : 0), 0
  );
});

// Indexes
CourseSchema.index({ title: "text", description: "text" });
CourseSchema.index({ level: 1 });
CourseSchema.index({ isActive: 1, featured: 1 });
CourseSchema.index({ createdAt: -1 });

// Pre-save hook
CourseSchema.pre('save', function(next) {
  console.log('💾 SAVING COURSE - CURRICULUM CHECK:');
  if (this.curriculum && this.curriculum.length > 0) {
    this.curriculum.forEach((module, idx) => {
      console.log(`Module ${idx + 1}:`, {
        title: module.title,
        blogBodyAr: module.blogBodyAr?.substring(0, 50),
        blogBodyEn: module.blogBodyEn?.substring(0, 50),
      });
    });
  }
  next();
});

let Course;
try {
  Course = mongoose.model("Course");
} catch (error) {
  Course = mongoose.model("Course", CourseSchema);
}

export default Course;