// /src/app/api/whatsapp/test-send/route.js
import { NextResponse } from "next/server";
import { wapilotService } from "../../../services/wapilot-service";
import { requireAdmin } from "@/utils/authMiddleware";

export async function POST(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const body = await req.json();
    const { phoneNumber, messageContent, messageType, testData } = body;

    if (!phoneNumber || !messageContent) {
      return NextResponse.json(
        { success: false, message: "Phone number and message content are required" },
        { status: 400 }
      );
    }

    // تحضير الرسالة مع بيانات الاختبار
    let processedMessage = messageContent;
    
    if (testData) {
      // استبدال المتغيرات ببيانات الاختبار
      const isMale = testData.student.gender === "Male";
      
      processedMessage = messageContent
        .replace(/{name_ar}/g, testData.student.nameAr)
        .replace(/{name_en}/g, testData.student.nameEn)
        .replace(/{fullName}/g, testData.student.name)
        .replace(/{salutation_ar}/g, isMale ? `عزيزي الطالب ${testData.student.nameAr}` : `عزيزتي الطالبة ${testData.student.nameAr}`)
        .replace(/{salutation_en}/g, `Dear student ${testData.student.nameEn}`)
        .replace(/{you_ar}/g, isMale ? "أنت" : "أنتِ")
        .replace(/{welcome_ar}/g, isMale ? "أهلاً بك" : "أهلاً بكِ")
        .replace(/{guardianName_ar}/g, testData.guardian.nameAr)
        .replace(/{guardianName_en}/g, testData.guardian.nameEn)
        .replace(/{studentName_ar}/g, testData.student.nameAr)
        .replace(/{studentName_en}/g, testData.student.nameEn)
        .replace(/{fullStudentName}/g, testData.student.name)
        .replace(/{relationship_ar}/g, testData.guardian.relationship === "father" ? "الأب" : "الأم")
        .replace(/{studentGender_ar}/g, isMale ? "الابن" : "الابنة")
        .replace(/{guardianSalutation_ar}/g, testData.guardian.relationship === "father" 
          ? `عزيزي الأستاذ ${testData.guardian.nameAr}` 
          : `عزيزتي السيدة ${testData.guardian.nameAr}`);
    }

    // إرسال الرسالة
    const result = await wapilotService.sendTextMessage(
      wapilotService.preparePhoneNumber(phoneNumber),
      processedMessage
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Test message sent successfully",
        data: result
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.error || "Failed to send test message"
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Error in test-send:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}