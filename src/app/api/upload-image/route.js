import { NextResponse } from "next/server";
import { uploadToCloudinary } from "@/lib/cloudinary";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = formData.get("folder") || "section-images";

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file provided" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    // uploadToCloudinary بترجع secure_url زي https://res.cloudinary.com/...
    const imageUrl = await uploadToCloudinary(base64, folder);

    return NextResponse.json({
      success: true,
      imageUrl,
      message: "Image uploaded successfully",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to upload: " + error.message },
      { status: 500 }
    );
  }
}