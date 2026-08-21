import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Session from "../../../../models/Session";
import Course from "../../../../models/Course";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const { sessionId } = await params;

    const session = await Session.findById(sessionId)
      .select("courseId moduleIndex sessionNumber title")
      .lean();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "الجلسة غير موجودة" },
        { status: 404 }
      );
    }

    const course = await Course.findById(session.courseId)
      .select("title curriculum")
      .lean();

    if (!course) {
      return NextResponse.json(
        { success: false, message: "الكورس غير موجود" },
        { status: 404 }
      );
    }

    const moduleData = course.curriculum?.[session.moduleIndex];
    const sessionBlog = (moduleData?.sessions || []).find(
      (s) => s.sessionNumber === session.sessionNumber
    );

    if (!sessionBlog || (!sessionBlog.blogBodyAr?.trim() && !sessionBlog.blogBodyEn?.trim())) {
      return NextResponse.json(
        { success: false, message: "لا يوجد محتوى بلوج لهذه الجلسة" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        courseTitle: course.title,
        moduleTitle: moduleData.title,
        sessionTitle: session.title,
        sessionNumber: session.sessionNumber,
        blogBodyAr: sessionBlog.blogBodyAr || "",
        blogBodyEn: sessionBlog.blogBodyEn || "",
        blogImage: sessionBlog.blogImage || "",
      },
    });
  } catch (error) {
    console.error("❌ [session-blog GET]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}