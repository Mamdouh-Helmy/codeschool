import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SectionImageHero from "../../models/SectionImageHero";

export const revalidate = 60;

// GET - جلب جميع صور الأقسام
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const sectionName = searchParams.get("sectionName");
    const activeOnly = searchParams.get("activeOnly") === "true";
    const language = searchParams.get("language");

    let filter = {};

    if (sectionName) {
      filter.sectionName = sectionName;
    }

    if (activeOnly) {
      filter.isActive = true;
    }

    if (language) {
      filter.language = language;
    }

    const images = await SectionImageHero.find(filter).sort({
      displayOrder: 1,
      createdAt: -1,
    });

    return NextResponse.json({
      success: true,
      data: images,
      count: images.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching section images:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في جلب صور الأقسام",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// POST - إنشاء صورة قسم جديدة
// POST - إنشاء صورة قسم جديدة
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    // التحقق من الحقول المطلوبة
    if (!body.sectionName || !body.imageUrl) {
      return NextResponse.json(
        {
          success: false,
          message: "اسم القسم ورابط الصورة مطلوبان",
        },
        { status: 400 }
      );
    }

    const newImage = await SectionImageHero.create({
      sectionName: body.sectionName,
      language: body.language || "ar",
      imageUrl: body.imageUrl,
      secondImageUrl: body.secondImageUrl || "",
      imageAlt: body.imageAlt || "",
      secondImageAlt: body.secondImageAlt || "",

      // بيانات الـ Hero
      heroTitle: body.heroTitle || "",
      heroDescription: body.heroDescription || "", // ← الحقل الجديد
      instructor1: body.instructor1 || "",
      instructor1Role: body.instructor1Role || "",
      instructor2: body.instructor2 || "",
      instructor2Role: body.instructor2Role || "",

      // بيانات الـ Welcome Popup
      welcomeTitle: body.welcomeTitle || "",
      welcomeSubtitle1: body.welcomeSubtitle1 || "",
      welcomeSubtitle2: body.welcomeSubtitle2 || "",
      welcomeFeature1: body.welcomeFeature1 || "",
      welcomeFeature2: body.welcomeFeature2 || "",
      welcomeFeature3: body.welcomeFeature3 || "",
      welcomeFeature4: body.welcomeFeature4 || "",
      welcomeFeature5: body.welcomeFeature5 || "",
      welcomeFeature6: body.welcomeFeature6 || "",

      // الأرقام
      discount: body.discount || 30,
      happyParents: body.happyParents || "250",
      graduates: body.graduates || "130",

      isActive: body.isActive !== undefined ? body.isActive : true,
      displayOrder: body.displayOrder || 0,
    });

    return NextResponse.json({
      success: true,
      data: newImage,
      message: "تم إنشاء صورة القسم بنجاح",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error creating section image:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في إنشاء صورة القسم",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
