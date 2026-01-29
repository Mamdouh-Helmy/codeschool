// app/api/upload-image/route.js
import { NextResponse } from "next/server";
import { uploadToCloudinary } from "@/lib/cloudinary";

export async function POST(request) {
  try {
    const { image, folder } = await request.json();

    if (!image) {
      return NextResponse.json(
        { success: false, message: "لا توجد صورة للرفع" },
        { status: 400 },
      );
    }

    // Upload to Cloudinary
    const imageUrl = await uploadToCloudinary(
      image,
      folder || "section-images-hero",
    );

    return NextResponse.json({
      success: true,
      imageUrl,
      message: "تم رفع الصورة بنجاح",
    });
  } catch (error) {
    console.error("❌ Error uploading image:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في رفع الصورة",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
