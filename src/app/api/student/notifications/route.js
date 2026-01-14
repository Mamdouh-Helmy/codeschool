import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Student from "../../../models/Student";

export async function GET(req) {
  try {
    console.log("🔔 [Notifications API] Fetching notifications");
    
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

    console.log("✅ [Notifications API] User authenticated:", { 
      id: user.id, 
      role: user.role 
    });

    await connectDB();

    // الحصول على بيانات الطالب المرتبطة بـ User
    const student = await Student.findOne({ authUserId: user.id })
      .select("whatsappMessages sessionReminders personalInfo.fullName")
      .lean();

    if (!student) {
      console.log("⚠️ [Notifications API] No student record found");
      return NextResponse.json({
        success: true,
        data: [],
        count: 0
      });
    }

    const notifications = [];

    // إشعارات واتساب
    if (student.whatsappMessages && student.whatsappMessages.length > 0) {
      student.whatsappMessages
        .filter(msg => msg.status === 'sent' || msg.status === 'failed')
        .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
        .forEach(msg => {
          const notificationType = getNotificationType(msg.messageType);
          
          notifications.push({
            id: msg._id.toString(),
            type: notificationType.category,
            title: getWhatsAppMessageTitle(msg.messageType),
            message: truncateMessage(msg.messageContent, 150),
            date: msg.sentAt,
            icon: getIconForType(notificationType.category),
            read: true, // جميع رسائل الواتساب تعتبر مقروءة تلقائياً
            metadata: {
              messageId: msg._id,
              type: msg.messageType,
              status: msg.status,
              groupId: msg.metadata?.groupId,
              groupName: msg.metadata?.groupName,
              sessionId: msg.metadata?.sessionId,
              sessionTitle: msg.metadata?.sessionTitle,
              language: msg.language
            }
          });
        });
    }

    // إشعارات تذكير الجلسات
    if (student.sessionReminders && student.sessionReminders.length > 0) {
      student.sessionReminders
        .filter(reminder => reminder.status === 'sent' || reminder.status === 'failed')
        .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
        .forEach(reminder => {
          notifications.push({
            id: reminder._id.toString(),
            type: 'reminder',
            title: getReminderTitle(reminder.reminderType),
            message: truncateMessage(reminder.message, 150),
            date: reminder.sentAt,
            icon: 'Bell',
            read: true, // جميع التذكيرات تعتبر مقروءة تلقائياً
            metadata: {
              reminderId: reminder._id,
              type: reminder.reminderType,
              status: reminder.status,
              sessionId: reminder.sessionId,
              groupId: reminder.groupId,
              language: reminder.language,
              sessionDetails: reminder.sessionDetails
            }
          });
        });
    }

    // فرز الإشعارات حسب التاريخ
    notifications.sort((a, b) => new Date(b.date) - new Date(a.date));

    console.log(`✅ [Notifications API] Found ${notifications.length} notifications`);

    return NextResponse.json({
      success: true,
      data: notifications,
      count: notifications.length
    });

  } catch (error) {
    console.error("❌ [Notifications API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في تحميل الإشعارات",
        error: error.message,
        code: "NOTIFICATIONS_ERROR"
      },
      { status: 500 }
    );
  }
}

// PUT - تعيين جميع الإشعارات كمقروءة
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

    // في حالتنا، جميع الإشعارات تعتبر مقروءة تلقائياً
    // لذلك نرجع رسالة تأكيد فقط
    console.log(`✅ [Notifications API] All notifications already marked as read`);

    return NextResponse.json({
      success: true,
      message: "تم تعيين جميع الإشعارات كمقروءة",
      count: student.whatsappMessages?.length || 0 + student.sessionReminders?.length || 0
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

// دالة مساعدة لاختصار الرسالة
function truncateMessage(message, maxLength) {
  if (!message || message.length <= maxLength) {
    return message || '';
  }
  return message.substring(0, maxLength) + '...';
}

// دالة لتحديد نوع الإشعار
function getNotificationType(messageType) {
  const types = {
    'welcome': { category: 'whatsapp', icon: 'MessageSquare' },
    'language_selection': { category: 'whatsapp', icon: 'Globe' },
    'language_confirmation': { category: 'whatsapp', icon: 'CheckCircle' },
    'group_welcome': { category: 'whatsapp', icon: 'Users' },
    'session_reminder': { category: 'whatsapp', icon: 'Bell' },
    'absence_notification': { category: 'whatsapp', icon: 'AlertCircle' },
    'session_cancelled': { category: 'whatsapp', icon: 'XCircle' },
    'session_postponed': { category: 'whatsapp', icon: 'Clock' },
    'custom': { category: 'whatsapp', icon: 'MessageSquare' },
    'other': { category: 'whatsapp', icon: 'MessageSquare' }
  };
  
  return types[messageType] || { category: 'whatsapp', icon: 'Bell' };
}

// دالة للحصول على عنوان رسالة الواتساب
function getWhatsAppMessageTitle(messageType) {
  const titles = {
    'welcome': 'رسالة ترحيب',
    'language_selection': 'اختيار اللغة',
    'language_confirmation': 'تأكيد اللغة',
    'group_welcome': 'ترحيب بالمجموعة',
    'session_reminder': 'تذكير جلسة',
    'absence_notification': 'تنبيه غياب',
    'session_cancelled': 'إلغاء جلسة',
    'session_postponed': 'تأجيل جلسة',
    'custom': 'رسالة مخصصة',
    'other': 'رسالة'
  };
  return titles[messageType] || 'رسالة واتساب';
}

// دالة للحصول على عنوان التذكير
function getReminderTitle(reminderType) {
  return reminderType === '24hours' 
    ? 'تذكير قبل 24 ساعة' 
    : 'تذكير قبل ساعة';
}

// دالة للحصول على الأيقونة المناسبة
function getIconForType(type) {
  const icons = {
    'whatsapp': 'MessageSquare',
    'reminder': 'Bell',
    'warning': 'AlertCircle',
    'alert': 'AlertTriangle'
  };
  return icons[type] || 'MessageSquare';
}