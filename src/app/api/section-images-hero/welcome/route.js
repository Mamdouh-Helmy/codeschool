import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SectionImageHero from "../../../models/SectionImageHero";

export const revalidate = 60;

// GET - جلب بيانات الـ Welcome Popup مع دعم اللغات
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const language = searchParams.get("language") || "ar";
    const activeOnly = searchParams.get("activeOnly") !== "false";

    let filter = {
      sectionName: "welcome-popup"
    };
    
    if (activeOnly) {
      filter.isActive = true;
    }

    // جلب بيانات الـ Welcome Popup مع التصفية باللغة
    const welcomeData = await SectionImageHero.find(filter)
      .sort({ displayOrder: 1, createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: welcomeData,
      count: welcomeData.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Error fetching welcome popup data:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في جلب بيانات الـ Welcome Popup",
        error: error.message
      },
      { status: 500 }
    );
  }
}