import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Student from "../../../../../models/Student";
import mongoose from "mongoose";

export async function PUT(req, { params }) {
  try {
    const notificationId = params.id;

    console.log(`📝 [Notification Read API] Marking as read: ${notificationId}`);

    if (!notificationId || !mongoose.Types.ObjectId.isValid(notificationId)) {
      return NextResponse.json(
        {
          success: false,
          message: "معرف الإشعار غير صالح",
          code: "INVALID_ID",
        },
        { status: 400 }
      );
    }

    // الحصول على المستخدم من التوكن
    const user = await getUserFromRequest(req);

    if (!user) {
      console.log("❌ [Notification Read API] Unauthorized - No user found");
      return NextResponse.json(
        {
          success: false,
          message: "غير مصرح بالوصول",
          code: "UNAUTHORIZED",
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
          code: "PROFILE_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // في حالتنا، جميع الإشعارات تعتبر مقروءة تلقائياً
    // لذلك نرجع نجاح بدون تحديث حقيقي
    console.log(`✅ [Notification Read API] Notification already marked as read`);

    return NextResponse.json({
      success: true,
      message: "تم تعيين الإشعار كمقروء",
    });
  } catch (error) {
    console.error("❌ [Notification Read API] Error marking as read:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في تعيين الإشعار كمقروء",
        error: error.message,
        code: "MARK_READ_ERROR",
      },
      { status: 500 }
    );
  }
}