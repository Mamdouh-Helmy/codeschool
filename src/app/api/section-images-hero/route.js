import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SectionImageHero from "../../models/SectionImageHero";

export const revalidate = 60;

// GET — جلب كل السجلات (عادةً سجل واحد فقط)
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const filter = activeOnly ? { isActive: true } : {};

    const records = await SectionImageHero.find(filter).sort({
      displayOrder: 1,
      createdAt: -1,
    });

    return NextResponse.json({
      success: true,
      data: records,
      count: records.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "فشل في جلب البيانات", error: error.message },
      { status: 500 }
    );
  }
}

// POST — إنشاء سجل جديد
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    if (!body.imageUrl) {
      return NextResponse.json(
        { success: false, message: "رابط الصورة الرئيسية مطلوب" },
        { status: 400 }
      );
    }

    const record = await SectionImageHero.create({
      imageUrl:       body.imageUrl,
      secondImageUrl: body.secondImageUrl || "",
      imageAlt:       body.imageAlt       || "",
      secondImageAlt: body.secondImageAlt || "",

      heroTitleAr:       body.heroTitleAr       || "",
      heroDescriptionAr: body.heroDescriptionAr || "",
      instructor1Ar:     body.instructor1Ar     || "",
      instructor1RoleAr: body.instructor1RoleAr || "",
      instructor2Ar:     body.instructor2Ar     || "",
      instructor2RoleAr: body.instructor2RoleAr || "",

      heroTitleEn:       body.heroTitleEn       || "",
      heroDescriptionEn: body.heroDescriptionEn || "",
      instructor1En:     body.instructor1En     || "",
      instructor1RoleEn: body.instructor1RoleEn || "",
      instructor2En:     body.instructor2En     || "",
      instructor2RoleEn: body.instructor2RoleEn || "",

      welcomeTitleAr:     body.welcomeTitleAr     || "",
      welcomeSubtitle1Ar: body.welcomeSubtitle1Ar || "",
      welcomeSubtitle2Ar: body.welcomeSubtitle2Ar || "",
      welcomeFeature1Ar:  body.welcomeFeature1Ar  || "",
      welcomeFeature2Ar:  body.welcomeFeature2Ar  || "",
      welcomeFeature3Ar:  body.welcomeFeature3Ar  || "",
      welcomeFeature4Ar:  body.welcomeFeature4Ar  || "",
      welcomeFeature5Ar:  body.welcomeFeature5Ar  || "",
      welcomeFeature6Ar:  body.welcomeFeature6Ar  || "",

      welcomeTitleEn:     body.welcomeTitleEn     || "",
      welcomeSubtitle1En: body.welcomeSubtitle1En || "",
      welcomeSubtitle2En: body.welcomeSubtitle2En || "",
      welcomeFeature1En:  body.welcomeFeature1En  || "",
      welcomeFeature2En:  body.welcomeFeature2En  || "",
      welcomeFeature3En:  body.welcomeFeature3En  || "",
      welcomeFeature4En:  body.welcomeFeature4En  || "",
      welcomeFeature5En:  body.welcomeFeature5En  || "",
      welcomeFeature6En:  body.welcomeFeature6En  || "",

      discount:     body.discount     ?? 30,
      happyParents: body.happyParents || "250",
      graduates:    body.graduates    || "130",

      isActive:     body.isActive     ?? true,
      displayOrder: body.displayOrder ?? 0,
    });

    return NextResponse.json({
      success: true,
      data: record,
      message: "تم الإنشاء بنجاح",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "فشل في الإنشاء", error: error.message },
      { status: 500 }
    );
  }
}