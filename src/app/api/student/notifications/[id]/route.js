import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Student from "../../../../models/Student";
import mongoose from "mongoose";

export async function DELETE(req, { params }) {
  try {
    const notificationId = params.id;

    console.log(`🗑️ [Notification Delete API] Deleting notification: ${notificationId}`);

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
      console.log("❌ [Notification Delete API] Unauthorized - No user found");
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

    let notificationFound = false;
    let notificationType = "";

    // البحث في رسائل الواتساب
    if (student.whatsappMessages) {
      const initialLength = student.whatsappMessages.length;
      student.whatsappMessages = student.whatsappMessages.filter(
        (msg) => msg._id.toString() !== notificationId
      );
      
      if (student.whatsappMessages.length < initialLength) {
        notificationFound = true;
        notificationType = "whatsapp";
      }
    }

    // البحث في تذكيرات الجلسات
    if (!notificationFound && student.sessionReminders) {
      const initialLength = student.sessionReminders.length;
      student.sessionReminders = student.sessionReminders.filter(
        (rem) => rem._id.toString() !== notificationId
      );
      
      if (student.sessionReminders.length < initialLength) {
        notificationFound = true;
        notificationType = "reminder";
      }
    }

    if (!notificationFound) {
      return NextResponse.json(
        {
          success: false,
          message: "الإشعار غير موجود",
          code: "NOTIFICATION_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // حفظ التغييرات
    await student.save();

    console.log(`✅ [Notification Delete API] Deleted ${notificationType} notification`);

    return NextResponse.json({
      success: true,
      message: "تم حذف الإشعار بنجاح",
      type: notificationType
    });
  } catch (error) {
    console.error("❌ [Notification Delete API] Error deleting notification:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في حذف الإشعار",
        error: error.message,
        code: "DELETE_ERROR",
      },
      { status: 500 }
    );
  }
}

// GET - جلب تفاصيل إشعار محدد (اختياري)
export async function GET(req, { params }) {
  try {
    const notificationId = params.id;

    console.log(`🔍 [Notification Detail API] Fetching notification: ${notificationId}`);

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
      console.log("❌ [Notification Detail API] Unauthorized - No user found");
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
    const student = await Student.findOne({ authUserId: user.id })
      .select("whatsappMessages sessionReminders personalInfo.fullName")
      .lean();

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

    let notification = null;
    let notificationType = "";

    // البحث في رسائل الواتساب
    if (student.whatsappMessages) {
      const whatsappMsg = student.whatsappMessages.find(
        (msg) => msg._id.toString() === notificationId
      );

      if (whatsappMsg) {
        notificationType = "whatsapp";
        notification = {
          id: whatsappMsg._id.toString(),
          type: "whatsapp",
          messageType: whatsappMsg.messageType,
          title: getWhatsAppMessageTitle(whatsappMsg.messageType),
          message: whatsappMsg.messageContent,
          language: whatsappMsg.language || "ar",
          status: whatsappMsg.status,
          date: whatsappMsg.sentAt,
          recipientNumber: whatsappMsg.recipientNumber,
          wapilotMessageId: whatsappMsg.wapilotMessageId,
          metadata: whatsappMsg.metadata || {},
          error: whatsappMsg.error,
          errorDetails: whatsappMsg.errorDetails,
          createdAt: whatsappMsg.createdAt,
          updatedAt: whatsappMsg.updatedAt,
        };
      }
    }

    // البحث في تذكيرات الجلسات
    if (!notification && student.sessionReminders) {
      const reminder = student.sessionReminders.find(
        (rem) => rem._id.toString() === notificationId
      );

      if (reminder) {
        notificationType = "reminder";
        notification = {
          id: reminder._id.toString(),
          type: "reminder",
          reminderType: reminder.reminderType,
          title: getReminderTitle(reminder.reminderType),
          message: reminder.message,
          language: reminder.language || "ar",
          status: reminder.status,
          date: reminder.sentAt,
          metadata: {
            sessionId: reminder.sessionId,
            groupId: reminder.groupId,
            sessionDetails: reminder.sessionDetails || {},
            error: reminder.error,
          },
          createdAt: reminder.createdAt,
          updatedAt: reminder.updatedAt,
        };
      }
    }

    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          message: "الإشعار غير موجود",
          code: "NOTIFICATION_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    console.log(`✅ [Notification Detail API] Found notification: ${notificationType}`);

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error("❌ [Notification Detail API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في تحميل تفاصيل الإشعار",
        error: error.message,
        code: "NOTIFICATION_DETAIL_ERROR",
      },
      { status: 500 }
    );
  }
}

// دالة للحصول على عنوان رسالة الواتساب
function getWhatsAppMessageTitle(messageType) {
  const titles = {
    welcome: "رسالة ترحيب",
    language_selection: "اختيار اللغة",
    language_confirmation: "تأكيد اللغة",
    group_welcome: "ترحيب بالمجموعة",
    session_reminder: "تذكير جلسة",
    absence_notification: "تنبيه غياب",
    session_cancelled: "إلغاء جلسة",
    session_postponed: "تأجيل جلسة",
    custom: "رسالة مخصصة",
    other: "رسالة",
  };
  return titles[messageType] || "رسالة واتساب";
}

// دالة للحصول على عنوان التذكير
function getReminderTitle(reminderType) {
  return reminderType === "24hours" ? "تذكير قبل 24 ساعة" : "تذكير قبل ساعة";
}