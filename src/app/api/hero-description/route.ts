import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SectionImageHero from "../../models/SectionImageHero";

export const revalidate = 60;

export async function GET() {
  try {
    await connectDB();

    // رجّع أول hero active بدون شرط لغة
    const heroData = await SectionImageHero.findOne({
      sectionName: "hero-section", 
      isActive: true,
    }).sort({ displayOrder: 1 });

    return NextResponse.json({
      success: true,
      heroDescription: heroData?.heroDescription || "",
    });
  } catch (error: any) {
    console.error("Error fetching hero description:", error);

    return NextResponse.json(
      {
        success: false,
        heroDescription: "",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
