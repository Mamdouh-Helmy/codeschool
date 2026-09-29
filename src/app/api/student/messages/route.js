// /app/api/student/messages/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Student from "../../../models/Student";

// ── Types that belong to the STUDENT (not guardian) ──
const STUDENT_TYPES = new Set([
  // Welcome / language
  "welcome",
  "student_welcome",
  "language_selection",
  "language_confirmation",
  "bilingual_language_selection",
  "bilingual_language_confirmation",

  // Group / course
  "group_welcome",
  "group_welcome_student",
  "group_completion",
  "group_completion_student",
  "module_overview",
  "learning_supervisor_intro",
  "session_blog",

  // Reminders
  "session_reminder",
  "session_reminder_student",
  "reminder_24h_student",
  "reminder_1h_student",
  "reminder_15min_student",
  "reminder_24h_offline",
  "reminder_30min_offline",
  "pre_attendance_ping",

  // Attendance
  "absence_notification",
  "late_notification",
  "excused_notification",

  // Session updates
  "session_cancelled",
  "session_cancelled_student",
  "session_postponed",
  "session_postponed_student",
  "session_recording",

  // Evaluations
  "evaluation_pass",
  "evaluation_review",
  "evaluation_repeat",

  // Credit
  "credit_alert",
  "credit_exhausted",
  "credit_low_balance_4h_student",
  "credit_low_balance_2h_student",

  // Makeup
  "makeup_session_student",
  "makeup_session_student_offline",

  // Misc
  "custom",
  "other",
]);

// ── Display config per type ──
const TYPE_CONFIG = {
  // Reminders
  session_reminder:          { labelEn: "Session Reminder",  labelAr: "تذكير جلسة",         icon: "clock",   color: "blue",      filter: "reminder" },
  session_reminder_student:  { labelEn: "Session Reminder",  labelAr: "تذكير جلسة",         icon: "clock",   color: "blue",      filter: "reminder" },
  reminder_24h_student:      { labelEn: "24h Reminder",      labelAr: "تذكير قبل 24 ساعة",  icon: "clock",   color: "blue",      filter: "reminder" },
  reminder_1h_student:       { labelEn: "1h Reminder",       labelAr: "تذكير قبل ساعة",     icon: "clock",   color: "cyan",      filter: "reminder" },
  reminder_15min_student:    { labelEn: "15min Reminder",    labelAr: "تذكير قبل 15 دقيقة", icon: "clock",   color: "cyan",      filter: "reminder" },
  reminder_24h_offline:      { labelEn: "24h Reminder",      labelAr: "تذكير قبل 24 ساعة",  icon: "clock",   color: "blue",      filter: "reminder" },
  reminder_30min_offline:    { labelEn: "30min Drop-off",    labelAr: "تنبيه قبل 30 دقيقة", icon: "clock",   color: "cyan",      filter: "reminder" },
  pre_attendance_ping:       { labelEn: "Attendance Ping",   labelAr: "تنبيه قبل الحضور",   icon: "clock",   color: "cyan",      filter: "reminder" },

  // Attendance
  absence_notification:      { labelEn: "Absence",           labelAr: "غياب",               icon: "x",       color: "red",       filter: "attendance" },
  late_notification:         { labelEn: "Late",              labelAr: "تأخر",               icon: "warning", color: "amber",     filter: "attendance" },
  excused_notification:      { labelEn: "Excused",           labelAr: "غياب مبرر",          icon: "check",   color: "green",     filter: "attendance" },

  // Session updates
  session_cancelled:         { labelEn: "Cancelled",         labelAr: "إلغاء جلسة",         icon: "cancel",  color: "red",       filter: "session" },
  session_cancelled_student: { labelEn: "Cancelled",         labelAr: "إلغاء جلسة",         icon: "cancel",  color: "red",       filter: "session" },
  session_postponed:         { labelEn: "Postponed",         labelAr: "تأجيل جلسة",         icon: "refresh", color: "amber",     filter: "session" },
  session_postponed_student: { labelEn: "Postponed",         labelAr: "تأجيل جلسة",         icon: "refresh", color: "amber",     filter: "session" },
  session_recording:         { labelEn: "Session Recording", labelAr: "تسجيل الجلسة",       icon: "star",    color: "purple",    filter: "session" },
  session_blog:              { labelEn: "Session Blog",      labelAr: "مدونة الجلسة",       icon: "msg",     color: "secondary", filter: "session" },

  // Group / course
  group_welcome:             { labelEn: "Welcome",           labelAr: "ترحيب",              icon: "star",    color: "purple",    filter: "group" },
  group_welcome_student:     { labelEn: "Welcome",           labelAr: "ترحيب",              icon: "star",    color: "purple",    filter: "group" },
  welcome:                   { labelEn: "Welcome",           labelAr: "ترحيب",              icon: "star",    color: "purple",    filter: "group" },
  student_welcome:           { labelEn: "Welcome",           labelAr: "ترحيب",              icon: "star",    color: "purple",    filter: "group" },
  group_completion:          { labelEn: "Course Completed",  labelAr: "إكمال الدورة",       icon: "award",   color: "green",     filter: "group" },
  group_completion_student:  { labelEn: "Course Completed",  labelAr: "إكمال الدورة",       icon: "award",   color: "green",     filter: "group" },
  module_overview:           { labelEn: "Module Overview",   labelAr: "نظرة عامة على الوحدة", icon: "msg",   color: "secondary", filter: "group" },
  learning_supervisor_intro: { labelEn: "Supervisor Intro",  labelAr: "تعريف المشرف",       icon: "star",    color: "secondary", filter: "group" },

  // Evaluations
  evaluation_pass:           { labelEn: "Evaluation Pass",   labelAr: "تقييم - ناجح",       icon: "award",   color: "green",     filter: "group" },
  evaluation_review:         { labelEn: "Evaluation Review", labelAr: "تقييم - مراجعة",     icon: "warning", color: "amber",     filter: "group" },
  evaluation_repeat:         { labelEn: "Evaluation Repeat", labelAr: "تقييم - إعادة",      icon: "x",       color: "red",       filter: "group" },

  // Credit
  credit_alert:              { labelEn: "Credit Alert",      labelAr: "تنبيه رصيد",         icon: "warning", color: "amber",     filter: "credit" },
  credit_exhausted:          { labelEn: "No Credit",         labelAr: "نفاد الرصيد",        icon: "x",       color: "red",       filter: "credit" },
  credit_low_balance_4h_student: { labelEn: "Low Balance (4h)", labelAr: "رصيد منخفض",      icon: "warning", color: "amber",     filter: "credit" },
  credit_low_balance_2h_student: { labelEn: "Low Balance (2h)", labelAr: "رصيد منخفض جداً", icon: "warning", color: "red",       filter: "credit" },

  // Makeup
  makeup_session_student:         { labelEn: "Makeup Session", labelAr: "حصة تعويضية",      icon: "star",    color: "primary",   filter: "session" },
  makeup_session_student_offline: { labelEn: "Makeup Session", labelAr: "حصة تعويضية",      icon: "star",    color: "primary",   filter: "session" },

  // System / language
  language_selection:        { labelEn: "Language Setup",    labelAr: "اختيار اللغة",       icon: "globe",   color: "gray",      filter: "system" },
  language_confirmation:     { labelEn: "Language Confirmed", labelAr: "تأكيد اللغة",       icon: "check",   color: "gray",      filter: "system" },
  bilingual_language_selection:    { labelEn: "Language Setup", labelAr: "اختيار اللغة",   icon: "globe",   color: "gray",      filter: "system" },
  bilingual_language_confirmation: { labelEn: "Language Confirmed", labelAr: "تأكيد اللغة", icon: "check", color: "gray",      filter: "system" },
  custom:                    { labelEn: "Message",           labelAr: "رسالة",              icon: "msg",     color: "primary",   filter: "system" },
  other:                     { labelEn: "Notification",      labelAr: "إشعار",              icon: "bell",    color: "gray",      filter: "system" },
};

const getCfg = (type) =>
  TYPE_CONFIG[type] || { labelEn: "Notification", labelAr: "إشعار", icon: "bell", color: "gray", filter: "system" };

// ── Filter groups (for tabs) ──
const FILTER_GROUPS = {
  reminder: [
    "session_reminder", "session_reminder_student",
    "reminder_24h_student", "reminder_1h_student", "reminder_15min_student",
    "reminder_24h_offline", "reminder_30min_offline", "pre_attendance_ping",
  ],
  attendance: ["absence_notification", "late_notification", "excused_notification"],
  session: [
    "session_cancelled", "session_cancelled_student",
    "session_postponed", "session_postponed_student",
    "session_recording", "session_blog",
    "makeup_session_student", "makeup_session_student_offline",
  ],
  group: [
    "group_welcome", "group_welcome_student", "welcome", "student_welcome",
    "group_completion", "group_completion_student",
    "module_overview", "learning_supervisor_intro",
    "evaluation_pass", "evaluation_review", "evaluation_repeat",
  ],
  credit: [
    "credit_alert", "credit_exhausted",
    "credit_low_balance_4h_student", "credit_low_balance_2h_student",
  ],
  system: [
    "language_selection", "language_confirmation",
    "bilingual_language_selection", "bilingual_language_confirmation",
    "custom", "other",
  ],
};

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غير مصرح بالوصول", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all";
    const search = searchParams.get("search") || "";
    const page   = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit  = Math.min(500, parseInt(searchParams.get("limit") || "20"));

    const student = await Student.findOne({ authUserId: user.id })
      .select("whatsappMessages personalInfo.fullName")
      .lean();

    if (!student) {
      return NextResponse.json({
        success: true,
        data: { messages: [], stats: {}, pagination: { page, limit, total: 0, pages: 0 } },
      });
    }

    // ── 1. Keep only STUDENT messages ──
    let msgs = (student.whatsappMessages || []).filter((m) => {
      if (m.messageType?.includes("guardian")) return false;
      if (m.metadata?.recipientType === "guardian") return false;
      return STUDENT_TYPES.has(m.messageType);
    });

    // ── 2. Filter by category tab ──
    if (filter !== "all") {
      const allowed = FILTER_GROUPS[filter] || [];
      msgs = msgs.filter((m) => allowed.includes(m.messageType));
    }

    // ── 3. Search ──
    if (search.trim()) {
      const q = search.toLowerCase();
      msgs = msgs.filter(
        (m) =>
          m.messageContent?.toLowerCase().includes(q) ||
          m.metadata?.groupName?.toLowerCase().includes(q) ||
          m.metadata?.sessionTitle?.toLowerCase().includes(q)
      );
    }

    // ── 4. Sort newest first ──
    msgs = msgs.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

    const total = msgs.length;

    // ── 5. Paginate ──
    const paged = msgs.slice((page - 1) * limit, page * limit);

    // ── 6. Enrich ──
    const enriched = paged.map((m) => {
      const cfg = getCfg(m.messageType);
      return {
        _id: m._id,
        messageType: m.messageType,
        content: m.messageContent,
        language: m.language,
        sentAt: m.sentAt,
        status: m.status,
        label: { en: cfg.labelEn, ar: cfg.labelAr },
        icon: cfg.icon,
        color: cfg.color,
        filterGroup: cfg.filter,
        metadata: {
          groupName:        m.metadata?.groupName        || null,
          groupCode:        m.metadata?.groupCode        || null,
          sessionTitle:     m.metadata?.sessionTitle     || null,
          attendanceStatus: m.metadata?.attendanceStatus || null,
          remainingHours:   m.metadata?.remainingHours   ?? null,
          alertType:        m.metadata?.alertType        || null,
        },
      };
    });

    // ── 7. Stats for filter tabs (before search) ──
    const allStudentMsgs = (student.whatsappMessages || []).filter((m) => {
      if (m.messageType?.includes("guardian")) return false;
      if (m.metadata?.recipientType === "guardian") return false;
      return STUDENT_TYPES.has(m.messageType);
    });

    const stats = { all: allStudentMsgs.length };
    for (const [key, types] of Object.entries(FILTER_GROUPS)) {
      stats[key] = allStudentMsgs.filter((m) => types.includes(m.messageType)).length;
    }

    return NextResponse.json({
      success: true,
      data: {
        messages: enriched,
        stats,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error("❌ [Student Messages]", error);
    return NextResponse.json(
      { success: false, message: "فشل في جلب الرسائل", error: error.message },
      { status: 500 }
    );
  }
}

// ── PATCH: delete a whatsapp message by _id ──
export async function PATCH(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غير مصرح", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { action, id } = body;

    if (action !== "delete" || !id) {
      return NextResponse.json(
        { success: false, message: "بيانات غير صحيحة" },
        { status: 400 }
      );
    }

    const result = await Student.updateOne(
      { authUserId: user.id },
      { $pull: { whatsappMessages: { _id: id } } }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { success: false, message: "الرسالة غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ [Messages PATCH]", error);
    return NextResponse.json(
      { success: false, message: "فشل في حذف الرسالة", error: error.message },
      { status: 500 }
    );
  }
}