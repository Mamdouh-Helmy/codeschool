import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Student from "../../../../models/Student";

export async function PUT(req) {
  try {
    console.log("📝 [Notifications API] Marking all as read");
    
    // الحصول على المستخدم من التوكن
    const user = await getUserFromRequest(req);
    
    if (!user) {
      console.log("❌ [Notifications API] Unauthorized - No user found");
      return NextResponse.json(
        { 
          success: false, 
          message: "غير مصرح بالوصول",
          code: "UNAUTHORIZED"
        },
        { status: 401 }
      );
    }

    await connectDB();

    // الحصول على بيانات الطالب المرتبطة بـ User
    const student = await Student.findOne({ authUserId: user.id });

    if (!student) {
      return NextResponse.json(
        { 
          success: false, 
          message: "الملف الشخصي غير موجود",
          code: "PROFILE_NOT_FOUND"
        },
        { status: 404 }
      );
    }

    let updatedCount = 0;

    // تحديث رسائل الواتساب
    if (student.whatsappMessages && student.whatsappMessages.length > 0) {
      student.whatsappMessages.forEach(msg => {
        msg.status = 'sent'; // تعتبر 'sent' كمقروءة
      });
      updatedCount += student.whatsappMessages.length;
    }

    // تحديث تذكيرات الجلسات
    if (student.sessionReminders && student.sessionReminders.length > 0) {
      student.sessionReminders.forEach(reminder => {
        reminder.status = 'sent'; // تعتبر 'sent' كمقروءة
      });
      updatedCount += student.sessionReminders.length;
    }

    // حفظ التغييرات
    await student.save();
    
    console.log(`✅ [Notifications API] Marked ${updatedCount} notifications as read`);

    return NextResponse.json({
      success: true,
      message: `تم تعيين ${updatedCount} إشعار كمقروء`,
      count: updatedCount
    });

  } catch (error) {
    console.error("❌ [Notifications API] Error marking all as read:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في تعيين الإشعارات كمقروءة",
        error: error.message,
        code: "MARK_READ_ERROR"
      },
      { status: 500 }
    );
  }
}