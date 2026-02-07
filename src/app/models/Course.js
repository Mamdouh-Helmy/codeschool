// models/Course.js - FINAL FIX

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

// ✅ Module Schema - REMOVED _id: false to allow proper saving
const ModuleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  order: { type: Number, required: true },
  lessons: [LessonSchema],
  sessions: [SessionSchema],
  projects: [{ type: String }],
  
  // ✅ EXPLICIT BLOG FIELDS - These MUST be defined explicitly
  blogBodyAr: { type: String, default: "" },
  blogBodyEn: { type: String, default: "" },
  blogCreatedAt: { type: Date, default: Date.now },
  blogUpdatedAt: { type: Date, default: Date.now },
  
  totalSessions: { type: Number, default: 3 },
});

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
    
    // ✅ Curriculum as array of ModuleSchema
    curriculum: [ModuleSchema],
    
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

// ✅ Pre-save hook with detailed logging
CourseSchema.pre('save', function(next) {
  console.log('💾 PRE-SAVE HOOK - CURRICULUM DATA:');
  if (this.curriculum && this.curriculum.length > 0) {
    this.curriculum.forEach((module, idx) => {
      console.log(`Module ${idx + 1} BEFORE SAVE:`, {
        title: module.title,
        blogBodyAr: module.blogBodyAr || 'UNDEFINED',
        blogBodyEn: module.blogBodyEn || 'UNDEFINED',
        blogBodyArLength: module.blogBodyAr?.length || 0,
        blogBodyEnLength: module.blogBodyEn?.length || 0,
      });
    });
  }
  next();
});

// ✅ Post-save hook to verify data was saved
CourseSchema.post('save', async function(doc) {
  console.log('✅ POST-SAVE HOOK - VERIFICATION:');
  if (doc.curriculum && doc.curriculum.length > 0) {
    doc.curriculum.forEach((module, idx) => {
      console.log(`Module ${idx + 1} AFTER SAVE:`, {
        title: module.title,
        blogBodyAr: module.blogBodyAr || 'UNDEFINED',
        blogBodyEn: module.blogBodyEn || 'UNDEFINED',
        blogBodyArLength: module.blogBodyAr?.length || 0,
        blogBodyEnLength: module.blogBodyEn?.length || 0,
      });
    });
  }
});

// Clear any existing model
if (mongoose.models.Course) {
  delete mongoose.models.Course;
}

const Course = mongoose.model("Course", CourseSchema);

export default Course;