// api/upload-cv/route.js
import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

// ✅ ارفع الحد
export const maxDuration = 60;

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = formData.get("folder") || "portfolio-cv";

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file provided" },
        { status: 400 }
      );
    }

    // ✅ لازم يبقى PDF بس
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { success: false, message: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    // ✅ حد 10MB للـ CV
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    // ✅ رفع مباشر بـ resource_type: "raw" وبدون أي transformation
    // عشان الملف يفضل PDF قابل للتحميل زي ما هو، من غير تحويل لصورة
    const uploadResponse = await cloudinary.uploader.upload(base64, {
      folder,
      resource_type: "raw",
    });

    return NextResponse.json({
      success: true,
      fileUrl: uploadResponse.secure_url,
      message: "CV uploaded successfully",
    });
  } catch (error) {
    console.error("CV upload error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to upload: " + error.message },
      { status: 500 }
    );
  }
}