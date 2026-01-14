import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Student from "../../../models/Student";

export async function GET(req) {
  try {
    console.log("👤 [Profile API] Request received");
    
    // الحصول على المستخدم من التوكن
    const user = await getUserFromRequest(req);
    
    if (!user) {
      console.log("❌ [Profile API] Unauthorized - No user found");
      return NextResponse.json(
        { 
          success: false, 
          message: "غير مصرح بالوصول",
          code: "UNAUTHORIZED"
        },
        { status: 401 }
      );
    }

    console.log("✅ [Profile API] User authenticated:", { 
      id: user.id, 
      role: user.role 
    });

    await connectDB();

    // البحث عن الطالب المرتبط بالمستخدم
    const student = await Student.findOne({ authUserId: user.id })
      .select("-isDeleted -deletedAt -__v")
      .lean();

    if (!student) {
      console.log("⚠️ [Profile API] No student record found");
      return NextResponse.json(
        { 
          success: false, 
          message: "الملف الشخصي غير موجود",
          code: "STUDENT_NOT_FOUND"
        },
        { status: 404 }
      );
    }

    // تنسيق البيانات للإرجاع
    const formattedProfile = {
      _id: student._id,
      personalInfo: student.personalInfo || {},
      guardianInfo: student.guardianInfo || {},
      academicInfo: student.academicInfo || {},
      communicationPreferences: student.communicationPreferences || {
        preferredLanguage: "ar",
        notificationChannels: { email: true, whatsapp: true, sms: false },
        marketingOptIn: true
      },
      enrollmentInfo: student.enrollmentInfo || {
        enrollmentDate: new Date(),
        status: "Active"
      },
      metadata: student.metadata || {},
    };

    return NextResponse.json({
      success: true,
      data: formattedProfile
    });

  } catch (error) {
    console.error("❌ [Profile API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في تحميل الملف الشخصي",
        error: error.message,
        code: "PROFILE_ERROR"
      },
      { status: 500 }
    );
  }
}