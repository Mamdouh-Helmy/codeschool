import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SectionImage from "../../../models/SectionImage";

export async function GET(req, context) {
  try {
    await connectDB();

    const { sectionName } = context.params;

    // البحث عن الصورة النشطة فقط
    const image = await SectionImage.findOne({ 
      sectionName,
      isActive: true
    });

    if (!image) {
      return NextResponse.json(
        { success: false, message: "Image not found for this section" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: image,
      message: "Image fetched successfully"
    });
  } catch (error) {
    console.error("Fetch section image error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch image" },
      { status: 500 }
    );
  }
}