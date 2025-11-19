// src/app/api/curriculum/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import CurriculumStage from "../../models/CurriculumStage";
import AgeCategory from "../../models/AgeCategory"; // أضف هذا الاستيراد

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const age = searchParams.get("age");

    let query = {};
    if (age) {
      query = {
        $or: [{ "age_range.en": age }, { "age_range.ar": age }],
      };
    }

    const stages = await CurriculumStage.find(query)
      .populate("age_category_id")
      .sort({ order_index: 1 });

    return NextResponse.json({
      success: true,
      data: stages,
    });
  } catch (error) {
    console.error("❌ Error fetching curriculum stages:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch curriculum stages" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    // التحقق من الحقول المطلوبة
    const requiredFields = [
      "age_category_id", // غيرنا من age_range إلى age_category_id
      "title_en",
      "title_ar",
      "platform", 
      "language_type",
      "duration",
      "lessons_count",
      "projects_count",
      "description_en",
      "description_ar",
      "order_index",
    ];
    
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Missing required fields: ${missingFields.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // التحقق من وجود الفئة العمرية باستخدام age_category_id
    const ageCategory = await AgeCategory.findById(body.age_category_id);
    
    if (!ageCategory) {
      return NextResponse.json(
        {
          success: false,
          message: "Age category not found",
        },
        { status: 404 }
      );
    }

    // إنشاء الـ stage مع التأكد من البيانات
    const newStage = await CurriculumStage.create({
      ...body,
      // تأكد من أن age_range مأخوذ من الفئة العمرية
      age_range: ageCategory.age_range,
      name_en: ageCategory.name_en,
      name_ar: ageCategory.name_ar,
    });

    return NextResponse.json(
      {
        success: true,
        data: newStage,
        message: "Curriculum stage created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating curriculum stage:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create curriculum stage" },
      { status: 500 }
    );
  }
}