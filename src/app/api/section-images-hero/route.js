import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SectionImageHero from "../../models/SectionImageHero";

export const revalidate = 60;

// GET - جلب جميع الصور
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const language = searchParams.get("language");

    let filter = {};

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
    console.error("❌ Error fetching images:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في جلب الصور",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// POST - إنشاء صورة جديدة
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    // التحقق من الحقول المطلوبة
    if (!body.language || !body.imageUrl) {
      return NextResponse.json(
        {
          success: false,
          message: "اللغة ورابط الصورة مطلوبان",
        },
        { status: 400 }
      );
    }

    // التحقق من عدم وجود سجل بنفس اللغة مسبقاً
    const existingRecord = await SectionImageHero.findOne({ language: body.language });
    if (existingRecord) {
      return NextResponse.json(
        {
          success: false,
          message: `يوجد بالفعل سجل للغة ${body.language}. يمكنك تعديله بدلاً من إنشاء جديد.`,
        },
        { status: 400 }
      );
    }

    const newImage = await SectionImageHero.create({
      language: body.language,
      imageUrl: body.imageUrl,
      secondImageUrl: body.secondImageUrl || "",
      imageAlt: body.imageAlt || "",
      secondImageAlt: body.secondImageAlt || "",

      // بيانات الهيرو عربي
      heroTitleAr: body.heroTitleAr || "",
      heroDescriptionAr: body.heroDescriptionAr || "",
      instructor1Ar: body.instructor1Ar || "",
      instructor1RoleAr: body.instructor1RoleAr || "",
      instructor2Ar: body.instructor2Ar || "",
      instructor2RoleAr: body.instructor2RoleAr || "",

      // بيانات الهيرو انجليزي
      heroTitleEn: body.heroTitleEn || "",
      heroDescriptionEn: body.heroDescriptionEn || "",
      instructor1En: body.instructor1En || "",
      instructor1RoleEn: body.instructor1RoleEn || "",
      instructor2En: body.instructor2En || "",
      instructor2RoleEn: body.instructor2RoleEn || "",

      // بيانات Welcome Popup عربي
      welcomeTitleAr: body.welcomeTitleAr || "",
      welcomeSubtitle1Ar: body.welcomeSubtitle1Ar || "",
      welcomeSubtitle2Ar: body.welcomeSubtitle2Ar || "",
      welcomeFeature1Ar: body.welcomeFeature1Ar || "",
      welcomeFeature2Ar: body.welcomeFeature2Ar || "",
      welcomeFeature3Ar: body.welcomeFeature3Ar || "",
      welcomeFeature4Ar: body.welcomeFeature4Ar || "",
      welcomeFeature5Ar: body.welcomeFeature5Ar || "",
      welcomeFeature6Ar: body.welcomeFeature6Ar || "",

      // بيانات Welcome Popup انجليزي
      welcomeTitleEn: body.welcomeTitleEn || "",
      welcomeSubtitle1En: body.welcomeSubtitle1En || "",
      welcomeSubtitle2En: body.welcomeSubtitle2En || "",
      welcomeFeature1En: body.welcomeFeature1En || "",
      welcomeFeature2En: body.welcomeFeature2En || "",
      welcomeFeature3En: body.welcomeFeature3En || "",
      welcomeFeature4En: body.welcomeFeature4En || "",
      welcomeFeature5En: body.welcomeFeature5En || "",
      welcomeFeature6En: body.welcomeFeature6En || "",

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
      message: "تم إنشاء الصورة بنجاح",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error creating image:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في إنشاء الصورة",
        error: error.message,
      },
      { status: 500 }
    );
  }
}