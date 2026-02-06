// models/Course.js - FIXED SCHEMA WITH SESSIONS
import mongoose from "mongoose";

// ✅ Lesson Schema
const LessonSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  order: { type: Number, required: true },
  sessionNumber: { type: Number, default: 1 },
  duration: { type: String, default: "45 mins" },
});

// ✅ Session Schema - مع presentationUrl
const SessionSchema = new mongoose.Schema({
  sessionNumber: { type: Number, required: true },
  presentationUrl: { type: String, default: "" },
});

// ✅ Module Schema - INCLUDING sessions array
const ModuleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  order: { type: Number, required: true },
  lessons: { type: [LessonSchema], default: [] },
  sessions: { type: [SessionSchema], default: [] }, // ✅ هذا مهم جداً
  projects: { type: [String], default: [] },
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
    
    projects: { type: [String], default: [] },
    
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
  return this.projects ? this.projects.length : 0;
});

// Indexes
CourseSchema.index({ title: "text", description: "text" });
CourseSchema.index({ level: 1 });
CourseSchema.index({ isActive: 1, featured: 1 });
CourseSchema.index({ createdAt: -1 });

let Course;
try {
  Course = mongoose.model("Course");
} catch (error) {
  Course = mongoose.model("Course", CourseSchema);
}

export default Course;