import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SectionImageHero from "../../../models/SectionImageHero";

export const revalidate = 60;

// GET - جلب بيانات الـ Hero مع دعم اللغات
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const language = searchParams.get("language") || "ar";
    const activeOnly = searchParams.get("activeOnly") !== "false";

    let filter = {
      sectionName: "hero-section"
    };
    
    if (activeOnly) {
      filter.isActive = true;
    }

    // جلب بيانات الـ Hero مع التصفية باللغة
    const heroData = await SectionImageHero.find(filter)
      .sort({ displayOrder: 1, createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: heroData,
      count: heroData.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Error fetching hero data:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في جلب بيانات الـ Hero",
        error: error.message
      },
      { status: 500 }
    );
  }
}