import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      stageId,
      stageTitle,
      ageRange,
      platform,
      languageType,
      duration,
      studentName,
      phoneNumber,
      message,
    } = body;

    // التحقق من الحقول المطلوبة
    if (!stageId || !stageTitle || !ageRange) {
      return NextResponse.json(
        { success: false, message: "Stage information is required" },
        { status: 400 }
      );
    }

    // رقم الواتساب المستهدف
    const whatsappNumber = "+201110050892";

    // نص الرسالة المحسّن
    const whatsappMessage =
      `طلب تسجيل جديد في المنصة التعليمية\n\n` +
      `بيانات المرحلة:\n` +
      `• الفئة العمرية: ${ageRange}\n` +
      `• اسم المرحلة: ${stageTitle}\n` +
      `• نوع البرمجة: ${languageType || "غير محدد"}\n` +
      `• المدة: ${duration || "غير محدد"}\n\n` +
      `رسالة إضافية:\n${message || "لا توجد رسالة إضافية"}\n\n`;

    // ترميز الرسالة للرابط
    const encodedMessage = encodeURIComponent(whatsappMessage);

    // إنشاء رابط الواتساب
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

    // إرجاع الرابط للعميل
    return NextResponse.json({
      success: true,
      message: "Enrollment request created successfully",
      data: {
        whatsappUrl,
        stageId,
        stageTitle,
        ageRange,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Error in enrollment:", error);
    return NextResponse.json(
      { success: false, message: "Failed to process enrollment" },
      { status: 500 }
    );
  }
}
