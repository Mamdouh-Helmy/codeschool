// app/api/courses/[id]/route.js

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Course from "../../../models/Course";

const calculateSessionNumber = (lessonOrder) => Math.ceil(lessonOrder / 2);

const processModule = (module, moduleIndex) => {
  // Module-level blog (backward compatibility)
  const moduleBlogBodyAr = (module.blog?.bodyAr || module.blogBodyAr || "").trim();
  const moduleBlogBodyEn = (module.blog?.bodyEn || module.blogBodyEn || "").trim();

  return {
    title: module.title?.trim() || `Module ${moduleIndex + 1}`,
    description: module.description?.trim() || "",
    order: module.order || moduleIndex + 1,
    totalSessions: module.totalSessions || 3,
    projects: Array.isArray(module.projects)
      ? module.projects.filter((p) => p?.trim())
      : [],
    blogBodyAr: moduleBlogBodyAr,
    blogBodyEn: moduleBlogBodyEn,
    blogCreatedAt: module.blog?.createdAt || module.blogCreatedAt || new Date(),
    blogUpdatedAt: new Date(),
    lessons: (module.lessons || []).map((lesson, lessonIndex) => ({
      title: lesson.title?.trim() || `Lesson ${lessonIndex + 1}`,
      description: lesson.description?.trim() || "",
      order: lesson.order || lessonIndex + 1,
      sessionNumber:
        lesson.sessionNumber || calculateSessionNumber(lesson.order || lessonIndex + 1),
      duration: lesson.duration || "45 mins",
    })),
    sessions: (module.sessions || []).map((session, sessionIndex) => ({
      sessionNumber: session.sessionNumber || sessionIndex + 1,
      presentationUrl: session.presentationUrl?.trim() || "",
      blogBodyAr: (session.blogBodyAr || "").trim(),
      blogBodyEn: (session.blogBodyEn || "").trim(),
      blogImage: session.blogImage?.trim() || "",
      blogUpdatedAt: new Date(),
    })),
    hasCertificate: !!module.hasCertificate,
    certificateBackground: module.hasCertificate
      ? module.certificateBackground?.trim() || ""
      : "",
    certificateSignatureName: module.hasCertificate
      ? module.certificateSignatureName?.trim() || ""
      : "",
    certificateCaption: module.hasCertificate
      ? module.certificateCaption?.trim() || ""
      : "",
  };
};

// ✅ الحقول المسموح بتعديلها فقط (createdBy و slug و _id مش بينتعدلوا من الـ client)
const ALLOWED_UPDATE_FIELDS = [
  "title",
  "description",
  "level",
  "grade",
  "subject",
  "duration",
  "curriculum",
  "isActive",
  "featured",
  "thumbnail",
];

// ✅ حماية: لازم يكون مسجل دخول (وممكن تحصرها على أدوار معينة)
async function requireUser(request) {
  const currentUser = await getUserFromRequest(request);
  if (!currentUser) {
    return {
      error: NextResponse.json(
        { success: false, error: "Please login first" },
        { status: 401 }
      ),
    };
  }

  // (اختياري) اسمح بس للأدمن/المدرس - فك الكومنت وعدّل الـ roles حسب عندك
  // if (!["admin", "teacher"].includes(currentUser.role)) {
  //   return {
  //     error: NextResponse.json(
  //       { success: false, error: "Forbidden" },
  //       { status: 403 }
  //     ),
  //   };
  // }

  return { user: currentUser };
}

export async function GET(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;
    const course = await Course.findById(id).lean();

    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: course });
  } catch (error) {
    console.error("❌ GET by ID Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();

    const { error: authError } = await requireUser(request);
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();

    // ✅ ناخد الحقول المسموحة بس
    const updates = {};
    for (const key of ALLOWED_UPDATE_FIELDS) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    // Process curriculum if present
    if (updates.curriculum && Array.isArray(updates.curriculum)) {
      updates.curriculum = updates.curriculum.map(processModule);
    }

    if (typeof updates.level === "string") {
      updates.level = updates.level.toLowerCase();
    }

    const course = await Course.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: course,
      message: "Course updated successfully",
    });
  } catch (error) {
    console.error("❌ PUT Error:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return NextResponse.json(
        { success: false, error: messages.join(", ") },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const { error: authError } = await requireUser(request);
    if (authError) return authError;

    const { id } = await params;
    const course = await Course.findByIdAndDelete(id);

    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error("❌ DELETE Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}