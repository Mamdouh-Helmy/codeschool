// app/api/admin/stats/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";

// ============================================
// Define User Schema
// ============================================
const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "marketing", "student", "instructor"],
      default: "student",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// ============================================
// Define Course Schema
// ============================================
const LessonSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    description: { type: String, default: "" },
    order: { type: Number, default: 1 },
    sessionNumber: { type: Number, default: 1 },
  },
  { _id: false },
);

const SessionSchema = new mongoose.Schema(
  {
    sessionNumber: { type: Number, required: true },
    objectives: { type: [String], default: [] },
    outline: { type: [String], default: [] },
    presentationUrl: { type: String, default: "" },
    projects: { type: [String], default: [] },
  },
  { _id: false },
);

const ModuleSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    description: { type: String, default: "" },
    order: { type: Number, default: 1 },
    lessons: { type: [LessonSchema], default: [] },
    sessions: { type: [SessionSchema], default: [] },
    projects: { type: [String], default: [] },
    totalSessions: { type: Number, default: 3 },
  },
  { _id: true },
);

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
    grade: { type: String, default: "" },
    subject: { type: String, default: "" },
    duration: { type: String, default: "" },
    curriculum: { type: [ModuleSchema], default: [] },
    price: { type: Number, default: 0, min: [0, "Price cannot be negative"] },
    isActive: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    thumbnail: { type: String, default: "" },
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
  { timestamps: true },
);

// ============================================
// Create or use existing models
// ============================================
const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Course = mongoose.models.Course || mongoose.model("Course", CourseSchema);

// ============================================
// GET Stats API
// ============================================
export async function GET(request) {
  try {
    await connectDB();

    // جلب عدد المستخدمين الكلي
    const totalUsers = await User.countDocuments({ isActive: true });

    // جلب عدد الكورسات النشطة
    const activeCourses = await Course.countDocuments({ isActive: true });

    // جلب إجمالي الكورسات (نشطة وغير نشطة)
    const totalCourses = await Course.countDocuments();

    // جلب الكورسات المميزة
    const featuredCourses = await Course.countDocuments({
      featured: true,
      isActive: true,
    });

    // إحصائيات إضافية
    const stats = {
      totalUsers,
      activeCourses,
      totalCourses,
      featuredCourses,
      // إحصائيات المستخدمين حسب الدور
      totalInstructors: await User.countDocuments({
        role: "instructor",
        isActive: true,
      }),
      totalStudents: await User.countDocuments({
        role: "student",
        isActive: true,
      }),
      totalAdmins: await User.countDocuments({
        role: "admin",
        isActive: true,
      }),
      totalMarketing: await User.countDocuments({
        role: "marketing",
        isActive: true,
      }),
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("❌ Error fetching stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch statistics",
      },
      { status: 500 },
    );
  }
}
