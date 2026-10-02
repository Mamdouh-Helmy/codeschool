// src/models/MessageTemplate.js

import mongoose from "mongoose";

const MessageTemplateSchema = new mongoose.Schema(
  {
    templateType: {
      type: String,
      required: true,
      enum: [
        "student_welcome",
        "guardian_notification",
        "absence_notification",
        "late_notification",
        "excused_notification",
        "session_cancelled_student",
        "session_cancelled_guardian",
        "session_postponed_student",
        "session_postponed_guardian",
        "reminder_24h_student",
        "reminder_24h_guardian",
        "reminder_15min_student",
        "reminder_15min_guardian",
        "group_completion_student",
        "group_completion_guardian",
        "evaluation_pass",
        "evaluation_review",
        "evaluation_repeat",
        "session_recording",
        "session_recording_adult",
        "learning_supervisor_intro",
        "module_overview",
        "module_overview_adult",
        "portfolio_inactivity_reminder",
        "portfolio_update_broadcast",
        "portfolio_contact_form_notification",
        "reminder_24h_offline_student",
        "reminder_24h_offline_guardian",
        "reminder_30min_offline_student",
        "reminder_30min_offline_guardian",
        "pre_attendance_ping_student",
        "pre_attendance_ping_guardian",
        "credit_low_balance_4h_student",
        "credit_low_balance_4h_guardian",
        "credit_low_balance_2h_student",
        "credit_low_balance_2h_guardian",
        // ── Make-up (Online) ──────────────────────────────────────
        "makeup_session_student",
        "makeup_session_guardian",
        "makeup_session_instructor",
        // ── Make-up (Offline) ─────────────────────────────────────
        "makeup_session_student_offline",
        "makeup_session_guardian_offline",
        "makeup_session_instructor_offline",

        // ── Adults (Online Reminders) ────────────────────────────
        "reminder_24h_adult",
        "reminder_15min_adult",
        // ── Adults (Offline Reminders) ───────────────────────────
        "reminder_24h_offline_adult",
        "reminder_30min_offline_adult",
        // ── Adults (Attendance) ──────────────────────────────────
        "absence_notification_adult",
        "late_notification_adult",
        "excused_notification_adult",
        // ── Adults (Evaluation) ──────────────────────────────────
        "evaluation_pass_adult",
        "evaluation_review_adult",
        "evaluation_repeat_adult",
        // ═══════════════════════════════════════════════════════════
        // 🎯 INTERVIEWS — Welcome (Online + Offline)
        // ═══════════════════════════════════════════════════════════
        "interview_welcome_child_online",
        "interview_welcome_child_offline",
        "interview_welcome_guardian_online",
        "interview_welcome_guardian_offline",
        "interview_welcome_adult_online",
        "interview_welcome_adult_offline",
        "interview_welcome_instructor_online",
        "interview_welcome_instructor_offline",

        // 🎯 INTERVIEWS — Online Reminders (24h + 15min)
        "interview_reminder_24h_online_child",
        "interview_reminder_24h_online_guardian",
        "interview_reminder_15min_online_child",
        "interview_reminder_15min_online_guardian",
        "interview_reminder_24h_online_adult",
        "interview_reminder_15min_online_adult",
        "interview_reminder_24h_online_instructor",
        "interview_reminder_15min_online_instructor",

        // 🎯 INTERVIEWS — Offline Reminders (24h + 30min + Ping)
        "interview_reminder_24h_offline_child",
        "interview_reminder_30min_offline_child",
        "interview_pre_ping_offline_child",
        "interview_reminder_24h_offline_guardian",
        "interview_reminder_30min_offline_guardian",
        "interview_pre_ping_offline_guardian",
        "interview_reminder_24h_offline_adult",
        "interview_reminder_30min_offline_adult",
        "interview_pre_ping_offline_adult",
        "interview_reminder_24h_offline_instructor",
        "interview_reminder_30min_offline_instructor",
        "interview_pre_ping_offline_instructor",

        // 🎯 INTERVIEWS — Evaluation
        "interview_evaluation_guardian",
        "interview_evaluation_adult",
      ],
    },

    recipientType: {
      type: String,
      enum: ["student", "guardian", "portfolio_owner", "instructor"],
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    contentAr: {
      type: String,
      required: false,
      default: "",
    },

    contentEn: {
      type: String,
      required: false,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },

    variables: [
      {
        key: String,
        label: String,
        description: String,
        example: String,
      },
    ],

    isDefault: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    usageStats: {
      totalSent: { type: Number, default: 0 },
      lastUsedAt: { type: Date },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
MessageTemplateSchema.index({ templateType: 1, isDefault: 1 });
MessageTemplateSchema.index({ templateType: 1, isActive: 1 });
MessageTemplateSchema.index({ recipientType: 1 });

// ─── Ensure only one default per type + recipient ─────────────────────────────
MessageTemplateSchema.pre("save", async function () {
  if (this.isDefault) {
    await this.constructor.updateMany(
      {
        templateType: this.templateType,
        recipientType: this.recipientType,
        isDefault: true,
        _id: { $ne: this._id },
      },
      { $set: { isDefault: false } },
    );
  }
});

// ─── Methods ──────────────────────────────────────────────────────────────────
MessageTemplateSchema.methods.getContent = function (language = "ar") {
  return language === "ar" ? this.contentAr : this.contentEn;
};

MessageTemplateSchema.methods.render = function (
  variables = {},
  language = "ar",
) {
  let content = this.getContent(language);
  Object.entries(variables).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      content = content.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
    }
  });
  return content;
};

MessageTemplateSchema.methods.getExample = function (language = "ar") {
  const examples = {
    guardianSalutation:
      language === "ar" ? "عزيزي الأستاذ محمد" : "Dear Mr. Mohamed",
    childTitle: language === "ar" ? "ابنك" : "your son",
    studentName: language === "ar" ? "أحمد" : "Ahmed",
    guardianName: language === "ar" ? "محمد" : "Mohamed",
    sessionName: language === "ar" ? "الجلسة الأولى" : "Session 1",
    sessionDate: language === "ar" ? "30/12/2025" : "12/30/2025",
    sessionNumber: "1",
    attendanceStatus: language === "ar" ? "حاضر" : "Present",
    starsCommitment: "⭐⭐⭐⭐⭐",
    starsUnderstanding: "⭐⭐⭐⭐",
    starsTaskExecution: "⭐⭐⭐⭐",
    starsParticipation: "⭐⭐⭐⭐",
    packageName:
      language === "ar"
        ? "الباقة الشهرية (12 ساعة)"
        : "Monthly Package (12 hours)",
    remainingHours: "4",
    threshold: "4",
    instructorComment:
      language === "ar"
        ? "أداء ممتاز، استمر هكذا!"
        : "Excellent performance, keep it up!",
    completedSessions: "2",
    date: language === "ar" ? "30/12/2025" : "12/30/2025",
    time: "5:00 PM - 7:00 PM",
    meetingLink: "https://meet.google.com/xxx",
    groupName: language === "ar" ? "المجموعة أ" : "Group A",
    groupCode: "GRP-001",
    courseName: language === "ar" ? "برمجة بايثون" : "Python Programming",
    enrollmentNumber: "STU001",
    recordingLink: "🎥 رابط التسجيل: https://drive.google.com/xxx",
    decision: language === "ar" ? "ممتاز" : "Excellent",
    supervisorName: language === "ar" ? "أحمد علي" : "Ahmed Ali",
    moduleTitle:
      language === "ar"
        ? "Real-Life Mobile Solutions"
        : "Real-Life Mobile Solutions",
    ownerName: language === "ar" ? "أحمد" : "Ahmed",
    portfolioLink: "https://codeschool.com/portfolio/ahmed",
    updateLink: "https://codeschool.com/portfolio/ahmed",
    dashboardLink: "https://codeschool.com/dashboard",

    placeName:
      language === "ar" ? "Code School - المعادي" : "Code School - Maadi",
    address:
      language === "ar" ? "شارع 9، المعادي، القاهرة" : "Street 9, Maadi, Cairo",
    mapsLink: "https://www.google.com/maps?q=29.9603,31.2569",

    studentSalutation: language === "ar" ? "عزيزي الطالب أحمد" : "Dear Ahmed",
    newDate:
      language === "ar"
        ? "الخميس 25 سبتمبر 2026"
        : "Thursday, September 25, 2026",
    newTime: "05:00 PM - 06:30 PM",
    newSessionTitle: "Make-up Session 1: Introduction",
    originalDate:
      language === "ar" ? "السبت 15 أغسطس 2026" : "Saturday, August 15, 2026",
    originalTime: "05:00 PM - 07:00 PM",
    originalSessionTitle: "Session 1: Introduction",
    instructorName: language === "ar" ? "أحمد" : "Ahmed",
    instructorSalutation:
      language === "ar" ? "عزيزي الأستاذ أحمد" : "Dear Mr. Ahmed",

    sessionLocationBlock:
      language === "ar"
        ? "📍 المكان: Code School - المعادي\n📌 العنوان: شارع 9، المعادي، القاهرة\n🗺️ اللوكيشن: https://maps.google.com/..."
        : "📍 Location: Code School - Maadi\n📌 Address: Street 9, Maadi, Cairo\n🗺️ Location: https://maps.google.com/...",
  };
  return this.render(examples, language);
};

MessageTemplateSchema.statics.getOrFallback = async function (
  templateType,
  language = "ar",
  recipientType = null,
) {
  const query = { templateType, isDefault: true, isActive: true };
  if (recipientType) query.recipientType = recipientType;

  const docs = await this.find(query).sort({ updatedAt: -1 }).lean();

  for (const doc of docs) {
    const [preferred, other] =
      language === "ar"
        ? [doc.contentAr, doc.contentEn]
        : [doc.contentEn, doc.contentAr];
    const content = preferred?.trim() ? preferred : other?.trim() ? other : "";
    if (content) {
      return { content, isFallback: false, variables: doc.variables || [] };
    }
  }

  if (docs.length) {
    console.warn(
      `⚠️ Template ${templateType} found but empty — using fallback`,
    );
  }

  const fallbacks = getFallbackTemplates();
  const fb = fallbacks[templateType];
  if (!fb) return { content: "", isFallback: true, variables: [] };

  return {
    content: language === "ar" ? fb.ar : fb.en,
    isFallback: true,
    variables: fb.variables || [],
  };
};

// ─── Fallback hardcoded templates ────────────────────────────────────────────
function getFallbackTemplates() {
  const evalVariables = [
    {
      key: "guardianSalutation",
      label: "تحية ولي الأمر",
      example: "عزيزي الأستاذ محمد",
    },
    { key: "childTitle", label: "صلة القرابة", example: "ابنك" },
    { key: "studentName", label: "اسم الطالب", example: "أحمد" },
    { key: "sessionDate", label: "تاريخ الجلسة", example: "30/12/2025" },
    { key: "sessionNumber", label: "رقم الجلسة", example: "1" },
    { key: "attendanceStatus", label: "حالة الحضور", example: "حاضر" },
    {
      key: "starsCommitment",
      label: "نجوم الالتزام والتركيز",
      example: "⭐⭐⭐⭐⭐",
    },
    {
      key: "starsUnderstanding",
      label: "نجوم مستوى الاستيعاب",
      example: "⭐⭐⭐⭐",
    },
    {
      key: "starsTaskExecution",
      label: "نجوم تنفيذ المهام",
      example: "⭐⭐⭐⭐",
    },
    { key: "starsParticipation", label: "نجوم المشاركة", example: "⭐⭐⭐⭐" },
    {
      key: "instructorComment",
      label: "تعليق المدرس",
      example: "أداء ممتاز، استمر هكذا!",
    },
    { key: "completedSessions", label: "عدد الحصص المنتهية", example: "2" },
    {
      key: "recordingLink",
      label: "رابط التسجيل",
      example: "🎥 رابط التسجيل: https://...",
    },
  ];

  const offlineLocationVariables = [
    { key: "placeName", label: "اسم المكان", example: "Code School - المعادي" },
    {
      key: "address",
      label: "العنوان التفصيلي",
      example: "شارع 9، المعادي، القاهرة",
    },
    {
      key: "mapsLink",
      label: "رابط الخريطة",
      example: "https://maps.google.com/...",
    },
  ];

  const smartLocationVar = {
    key: "sessionLocationBlock",
    label: "معلومات المكان / اللينك (تلقائي)",
    example: "🔗 رابط الحصة: ... أو 📍 المكان: ...",
  };

  // ─────────────────────────────────────────────────────────────
  // ✅ متغيرات الحصة التعويضية (Online)
  // ─────────────────────────────────────────────────────────────
  const makeupStudentVariables = [
    {
      key: "studentSalutation",
      label: "تحية الطالب",
      example: "عزيزي الطالب أحمد",
    },
    { key: "studentName", label: "اسم الطالب", example: "أحمد" },
    { key: "courseName", label: "اسم الكورس", example: "Python Programming" },
    {
      key: "groupName",
      label: "اسم المجموعة الجديدة",
      example: "Make-up - Ahmed",
    },
    { key: "groupCode", label: "كود المجموعة", example: "MAKEUP-001" },
    {
      key: "originalDate",
      label: "تاريخ الحصة الأصلية",
      example: "السبت 15 أغسطس 2026",
    },
    {
      key: "originalTime",
      label: "وقت الحصة الأصلية",
      example: "05:00 PM - 07:00 PM",
    },
    {
      key: "originalSessionTitle",
      label: "عنوان الحصة الأصلية",
      example: "Session 1: Introduction",
    },
    {
      key: "newDate",
      label: "تاريخ الحصة التعويضية",
      example: "الخميس 25 سبتمبر 2026",
    },
    {
      key: "newTime",
      label: "وقت الحصة التعويضية",
      example: "05:00 PM - 06:30 PM",
    },
    {
      key: "newSessionTitle",
      label: "عنوان الحصة التعويضية",
      example: "Make-up Session 1: Introduction",
    },
    {
      key: "meetingLink",
      label: "رابط الحصة",
      example: "https://meet.google.com/xxx",
    },
    { key: "instructorName", label: "اسم المدرس", example: "أحمد" },
  ];

  const makeupGuardianVariables = [
    {
      key: "guardianSalutation",
      label: "تحية ولي الأمر",
      example: "عزيزي الأستاذ محمد",
    },
    { key: "guardianName", label: "اسم ولي الأمر", example: "محمد" },
    { key: "childTitle", label: "صلة القرابة", example: "ابنك" },
    { key: "studentName", label: "اسم الطالب", example: "أحمد" },
    { key: "courseName", label: "اسم الكورس", example: "Python Programming" },
    {
      key: "groupName",
      label: "اسم المجموعة الجديدة",
      example: "Make-up - Ahmed",
    },
    { key: "groupCode", label: "كود المجموعة", example: "MAKEUP-001" },
    {
      key: "originalDate",
      label: "تاريخ الحصة الأصلية",
      example: "السبت 15 أغسطس 2026",
    },
    {
      key: "originalTime",
      label: "وقت الحصة الأصلية",
      example: "05:00 PM - 07:00 PM",
    },
    {
      key: "newDate",
      label: "تاريخ الحصة التعويضية",
      example: "الخميس 25 سبتمبر 2026",
    },
    {
      key: "newTime",
      label: "وقت الحصة التعويضية",
      example: "05:00 PM - 06:30 PM",
    },
    {
      key: "meetingLink",
      label: "رابط الحصة",
      example: "https://meet.google.com/xxx",
    },
    { key: "instructorName", label: "اسم المدرس", example: "أحمد" },
  ];

  const makeupInstructorVariables = [
    {
      key: "instructorSalutation",
      label: "تحية المدرس",
      example: "عزيزي الأستاذ أحمد",
    },
    { key: "instructorName", label: "اسم المدرس", example: "أحمد" },
    { key: "studentName", label: "اسم الطالب", example: "أحمد" },
    { key: "courseName", label: "اسم الكورس", example: "Python Programming" },
    { key: "groupName", label: "اسم المجموعة", example: "Make-up - Ahmed" },
    { key: "groupCode", label: "كود المجموعة", example: "MAKEUP-001" },
    {
      key: "originalDate",
      label: "تاريخ الحصة الأصلية",
      example: "السبت 15 أغسطس 2026",
    },
    {
      key: "originalTime",
      label: "وقت الحصة الأصلية",
      example: "05:00 PM - 07:00 PM",
    },
    {
      key: "originalSessionTitle",
      label: "عنوان الحصة الأصلية",
      example: "Session 1: Introduction",
    },
    {
      key: "newDate",
      label: "تاريخ الحصة التعويضية",
      example: "الخميس 25 سبتمبر 2026",
    },
    {
      key: "newTime",
      label: "وقت الحصة التعويضية",
      example: "05:00 PM - 06:30 PM",
    },
    {
      key: "meetingLink",
      label: "رابط الحصة",
      example: "https://meet.google.com/xxx",
    },
  ];

  // ─────────────────────────────────────────────────────────────
  // ✅ متغيرات الحصة التعويضية (Offline)
  // ─────────────────────────────────────────────────────────────
  const makeupStudentOfflineVariables = [
    {
      key: "studentSalutation",
      label: "تحية الطالب",
      example: "عزيزي الطالب أحمد",
    },
    { key: "studentName", label: "اسم الطالب", example: "أحمد" },
    { key: "courseName", label: "اسم الكورس", example: "Python Programming" },
    {
      key: "groupName",
      label: "اسم المجموعة الجديدة",
      example: "Make-up - Ahmed",
    },
    { key: "groupCode", label: "كود المجموعة", example: "MAKEUP-001" },
    {
      key: "originalDate",
      label: "تاريخ الحصة الأصلية",
      example: "السبت 15 أغسطس 2026",
    },
    {
      key: "originalTime",
      label: "وقت الحصة الأصلية",
      example: "05:00 PM - 07:00 PM",
    },
    {
      key: "originalSessionTitle",
      label: "عنوان الحصة الأصلية",
      example: "Session 1: Introduction",
    },
    {
      key: "newDate",
      label: "تاريخ الحصة التعويضية",
      example: "الخميس 25 سبتمبر 2026",
    },
    {
      key: "newTime",
      label: "وقت الحصة التعويضية",
      example: "05:00 PM - 06:30 PM",
    },
    {
      key: "newSessionTitle",
      label: "عنوان الحصة التعويضية",
      example: "Make-up Session 1: Introduction",
    },
    { key: "placeName", label: "اسم المكان", example: "Code School - المعادي" },
    {
      key: "address",
      label: "العنوان التفصيلي",
      example: "شارع 9، المعادي، القاهرة",
    },
    {
      key: "mapsLink",
      label: "رابط الخريطة",
      example: "https://maps.google.com/...",
    },
    smartLocationVar,
    { key: "instructorName", label: "اسم المدرس", example: "أحمد" },
  ];

  const makeupGuardianOfflineVariables = [
    {
      key: "guardianSalutation",
      label: "تحية ولي الأمر",
      example: "عزيزي الأستاذ محمد",
    },
    { key: "guardianName", label: "اسم ولي الأمر", example: "محمد" },
    { key: "childTitle", label: "صلة القرابة", example: "ابنك" },
    { key: "studentName", label: "اسم الطالب", example: "أحمد" },
    { key: "courseName", label: "اسم الكورس", example: "Python Programming" },
    {
      key: "groupName",
      label: "اسم المجموعة الجديدة",
      example: "Make-up - Ahmed",
    },
    { key: "groupCode", label: "كود المجموعة", example: "MAKEUP-001" },
    {
      key: "originalDate",
      label: "تاريخ الحصة الأصلية",
      example: "السبت 15 أغسطس 2026",
    },
    {
      key: "originalTime",
      label: "وقت الحصة الأصلية",
      example: "05:00 PM - 07:00 PM",
    },
    {
      key: "newDate",
      label: "تاريخ الحصة التعويضية",
      example: "الخميس 25 سبتمبر 2026",
    },
    {
      key: "newTime",
      label: "وقت الحصة التعويضية",
      example: "05:00 PM - 06:30 PM",
    },
    { key: "placeName", label: "اسم المكان", example: "Code School - المعادي" },
    {
      key: "address",
      label: "العنوان التفصيلي",
      example: "شارع 9، المعادي، القاهرة",
    },
    {
      key: "mapsLink",
      label: "رابط الخريطة",
      example: "https://maps.google.com/...",
    },
    smartLocationVar,
    { key: "instructorName", label: "اسم المدرس", example: "أحمد" },
  ];

  const makeupInstructorOfflineVariables = [
    {
      key: "instructorSalutation",
      label: "تحية المدرس",
      example: "عزيزي الأستاذ أحمد",
    },
    { key: "instructorName", label: "اسم المدرس", example: "أحمد" },
    { key: "studentName", label: "اسم الطالب", example: "أحمد" },
    { key: "courseName", label: "اسم الكورس", example: "Python Programming" },
    { key: "groupName", label: "اسم المجموعة", example: "Make-up - Ahmed" },
    { key: "groupCode", label: "كود المجموعة", example: "MAKEUP-001" },
    {
      key: "originalDate",
      label: "تاريخ الحصة الأصلية",
      example: "السبت 15 أغسطس 2026",
    },
    {
      key: "originalTime",
      label: "وقت الحصة الأصلية",
      example: "05:00 PM - 07:00 PM",
    },
    {
      key: "originalSessionTitle",
      label: "عنوان الحصة الأصلية",
      example: "Session 1: Introduction",
    },
    {
      key: "newDate",
      label: "تاريخ الحصة التعويضية",
      example: "الخميس 25 سبتمبر 2026",
    },
    {
      key: "newTime",
      label: "وقت الحصة التعويضية",
      example: "05:00 PM - 06:30 PM",
    },
    { key: "placeName", label: "اسم المكان", example: "Code School - المعادي" },
    {
      key: "address",
      label: "العنوان التفصيلي",
      example: "شارع 9، المعادي، القاهرة",
    },
    {
      key: "mapsLink",
      label: "رابط الخريطة",
      example: "https://maps.google.com/...",
    },
    smartLocationVar,
  ];

  // ═════════════════════════════════════════════════════════════
  // 🎯 INTERVIEW — Variables
  // ═════════════════════════════════════════════════════════════
  const interviewCommonVariables = [
    { key: "date", label: "تاريخ المقابلة", example: "الثلاثاء 20 مايو 2024" },
    { key: "time", label: "وقت المقابلة", example: "07:00 - 08:30 مساءً" },
    {
      key: "meetingLink",
      label: "رابط المقابلة (Online)",
      example: "https://meet.google.com/xxx",
    },
    {
      key: "sessionName",
      label: "عنوان المقابلة",
      example: "Interview Session 1",
    },
    { key: "instructorName", label: "اسم المُقابِل / المدرب", example: "أحمد" },
    {
      key: "instructorSalutation",
      label: "تحية المُقابِل",
      example: "عزيزي الأستاذ أحمد",
    },
  ];

  const interviewOfflineVars = [
    ...offlineLocationVariables,
    { key: "placeName", label: "اسم المكان", example: "Code School - المعادي" },
  ];

  const interviewEvalVariables = [
    {
      key: "guardianSalutation",
      label: "تحية ولي الأمر",
      example: "عزيزي الأستاذ محمد",
    },
    {
      key: "studentSalutation",
      label: "تحية الطالب (للبالغ)",
      example: "عزيزي أحمد",
    },
    { key: "childTitle", label: "صلة القرابة", example: "ابنك" },
    { key: "studentName", label: "اسم الطالب", example: "أحمد" },
    { key: "interviewDate", label: "تاريخ المقابلة", example: "30/12/2025" },
    { key: "interviewNumber", label: "رقم المقابلة", example: "1" },
    {
      key: "instructorComment",
      label: "تعليق المُقابِل",
      example: "أداء ممتاز",
    }, // ✅
    { key: "evaluationDecision", label: "النتيجة النهائية", example: "مقبول" },
  ];

  return {
    // ── evaluation_pass ────────────────────────────────────────
    evaluation_pass: {
      variables: evalVariables,
      ar: `{guardianSalutation}،\n\nتقرير الحصة 📃✨\n📆 التاريخ : {sessionDate}\n📑 رقم الحصة : {sessionNumber}\n⏱️ مدة الحصة : ساعتين\n👥 الحضور : {attendanceStatus}\n📊 تقييم الأداء :\n⭐ الالتزام والتركيز : {starsCommitment}\n⭐ مستوى الاستيعاب : {starsUnderstanding}\n⭐ تنفيذ المهام : {starsTaskExecution}\n⭐ المشاركة داخل الحصة : {starsParticipation}\n📝 تعليق المدرس :\n{instructorComment}\n🔢 عدد الحصص المنتهية : {completedSessions}\n{recordingLink}\n🙏 نشكركم على ثقتكم في Code School\n📞 للتواصل : +2 011 40 474 129`,
      en: `{guardianSalutation},\n\nSession Report 📃✨\n📆 Date : {sessionDate}\n📑 Session No. : {sessionNumber}\n⏱️ Duration : 2 hours\n👥 Attendance : {attendanceStatus}\n📊 Performance Evaluation :\n⭐ Commitment & Focus : {starsCommitment}\n⭐ Understanding Level : {starsUnderstanding}\n⭐ Task Execution : {starsTaskExecution}\n⭐ Class Participation : {starsParticipation}\n📝 Instructor's Comment :\n{instructorComment}\n🔢 Sessions Completed : {completedSessions}\n{recordingLink}\n🙏 Thank you for trusting Code School\n📞 Contact : +2 011 40 474 129`,
    },

    // ── evaluation_review ──────────────────────────────────────
    evaluation_review: {
      variables: evalVariables,
      ar: `{guardianSalutation}،\n\nتقرير الحصة 📃✨\n📆 التاريخ : {sessionDate}\n📑 رقم الحصة : {sessionNumber}\n⏱️ مدة الحصة : ساعتين\n👥 الحضور : {attendanceStatus}\n📊 تقييم الأداء :\n⭐ الالتزام والتركيز : {starsCommitment}\n⭐ مستوى الاستيعاب : {starsUnderstanding}\n⭐ تنفيذ المهام : {starsTaskExecution}\n⭐ المشاركة داخل الحصة : {starsParticipation}\n📝 تعليق المدرس :\n{instructorComment}\n🔢 عدد الحصص المنتهية : {completedSessions}\n{recordingLink}\n🙏 نشكركم على ثقتكم في Code School\n📞 للتواصل : +2 011 40 474 129`,
      en: `{guardianSalutation},\n\nSession Report 📃✨\n📆 Date : {sessionDate}\n📑 Session No. : {sessionNumber}\n⏱️ Duration : 2 hours\n👥 Attendance : {attendanceStatus}\n📊 Performance Evaluation :\n⭐ Commitment & Focus : {starsCommitment}\n⭐ Understanding Level : {starsUnderstanding}\n⭐ Task Execution : {starsTaskExecution}\n⭐ Class Participation : {starsParticipation}\n📝 Instructor's Comment :\n{instructorComment}\n🔢 Sessions Completed : {completedSessions}\n{recordingLink}\n🙏 Thank you for trusting Code School\n📞 Contact : +2 011 40 474 129`,
    },

    // ── evaluation_repeat ──────────────────────────────────────
    evaluation_repeat: {
      variables: evalVariables,
      ar: `{guardianSalutation}،\n\nتقرير الحصة 📃✨\n📆 التاريخ : {sessionDate}\n📑 رقم الحصة : {sessionNumber}\n⏱️ مدة الحصة : ساعتين\n👥 الحضور : {attendanceStatus}\n📊 تقييم الأداء :\n⭐ الالتزام والتركيز : {starsCommitment}\n⭐ مستوى الاستيعاب : {starsUnderstanding}\n⭐ تنفيذ المهام : {starsTaskExecution}\n⭐ المشاركة داخل الحصة : {starsParticipation}\n📝 تعليق المدرس :\n{instructorComment}\n🔢 عدد الحصص المنتهية : {completedSessions}\n{recordingLink}\n🙏 نشكركم على ثقتكم في Code School\n📞 للتواصل : +2 011 40 474 129`,
      en: `{guardianSalutation},\n\nSession Report 📃✨\n📆 Date : {sessionDate}\n📑 Session No. : {sessionNumber}\n⏱️ Duration : 2 hours\n👥 Attendance : {attendanceStatus}\n📊 Performance Evaluation :\n⭐ Commitment & Focus : {starsCommitment}\n⭐ Understanding Level : {starsUnderstanding}\n⭐ Task Execution : {starsTaskExecution}\n⭐ Class Participation : {starsParticipation}\n📝 Instructor's Comment :\n{instructorComment}\n🔢 Sessions Completed : {completedSessions}\n{recordingLink}\n🙏 Thank you for trusting Code School\n📞 Contact : +2 011 40 474 129`,
    },

    // ── session_recording ──────────────────────────────────────
    session_recording: {
      variables: [
        {
          key: "guardianSalutation",
          label: "تحية ولي الأمر",
          example: "عزيزي الأستاذ محمد",
        },
        { key: "childTitle", label: "صلة القرابة", example: "ابنك" },
        { key: "studentName", label: "اسم الطالب", example: "أحمد" },
        { key: "sessionName", label: "اسم الجلسة", example: "الجلسة الأولى" },
        {
          key: "recordingLink",
          label: "رابط التسجيل",
          example: "https://drive.google.com/xxx",
        },
      ],
      ar: `{guardianSalutation}،\n\n🎥 رابط تسجيل جلسة "{sessionName}" لـ{childTitle} *{studentName}*:\n\n{recordingLink}\n\nيمكن مراجعة التسجيل في أي وقت للمذاكرة والمراجعة.\nفريق Code School 💻`,
      en: `{guardianSalutation},\n\n🎥 Recording for "{sessionName}" — {childTitle} *{studentName}*:\n\n{recordingLink}\n\nThe recording can be reviewed anytime for study and revision.\nCode School Team 💻`,
    },

    // ── learning_supervisor_intro ─────────────────────────────
    learning_supervisor_intro: {
      variables: [
        {
          key: "guardianSalutation",
          label: "تحية ولي الأمر",
          example: "عزيزي الأستاذ أحمد",
        },
        { key: "childTitle", label: "صلة القرابة", example: "ابنك" },
        { key: "studentName", label: "اسم الطالب", example: "يوسف" },
        { key: "supervisorName", label: "اسم المشرف", example: "أحمد علي" },
      ],
      ar: `{guardianSalutation} 👋\nأنا {supervisorName}، الـ Learning Supervisor الخاص بـ {childTitle} **{studentName}** في Code School ✨\nحبيت أعرف حضرتك بنفسي، لأنني هكون معاكم في المتابعة الأكاديمية خلال الفترة الجاية، وهشارك مع حضرتك التقييمات الدورية، وكمان في بداية كل Module هبعت لحضرتك نظرة بسيطة على اللي {childTitle} هيتعلمه خلالها 🌟\nهدفي إن المتابعة تكون واضحة ومريحة، وإن حضرتك تبقى مطّمن على رحلة {studentName} التعليمية خطوة بخطوة 🤍\nوأي وقت تحب تستفسر عن أي حاجة تخص المستوى أو التقدم، أنا موجود مع حضرتك.\n{supervisorName} ✨\nLearning Supervisor`,
      en: `{guardianSalutation} 👋\nI am {supervisorName}, your Learning Supervisor for {childTitle} **{studentName}** at Code School ✨\nI wanted to introduce myself, as I will be following up on the academic progress during the coming period. I will share periodic evaluations with you, and at the beginning of each Module, I will send you a brief overview of what {childTitle} will be learning 🌟\nMy goal is to make follow-up clear and comfortable, and to keep you reassured about {studentName}'s educational journey step by step 🤍\nAnytime you would like to inquire about anything regarding the level or progress, I am here for you.\n{supervisorName} ✨\nLearning Supervisor`,
    },

    // ── module_overview ───────────────────────────────────────
    module_overview: {
      variables: [
        {
          key: "guardianSalutation",
          label: "تحية ولي الأمر",
          example: "عزيزي الأستاذ أحمد",
        },
        { key: "childTitle", label: "صلة القرابة", example: "ابنك" },
        { key: "studentName", label: "اسم الطالب", example: "يوسف" },
        {
          key: "moduleTitle",
          label: "عنوان الموديول",
          example: "Real-Life Mobile Solutions",
        },
        { key: "supervisorName", label: "اسم المشرف", example: "أحمد علي" },
      ],
      ar: `{guardianSalutation} 👋\nحابب أشارك مع حضرتك لمحة سريعة عن الـ Module الجديد اللي هيبدأه {childTitle} **{studentName}** ✨\n\n**Module Title:** {moduleTitle}\n\nخلال الـ Module ده، {studentName} هياخد فكرة ممتعة وبسيطة عن إزاي التطبيقات اللي بنستخدمها في حياتنا بتتعمل وبتتجهز بشكل مناسب للمستخدمين 📱\nوهيركز كمان على بناء شاشات بسيطة تشبه تطبيقات الموبايل، مع تدريب عملي يساعده يفهم الفكرة خطوة بخطوة بشكل سهل ومناسب لسنه 🌟\n\nوأنا هكون متابع مع حضرتك خلال الـ Module، وهشاركك أي ملاحظات مهمة أو تطور واضح بإذن الله.\n\n{supervisorName} ✨\nLearning Supervisor`,
      en: `{guardianSalutation} 👋\nI would like to share with you a quick overview of the new Module that {childTitle} **{studentName}** will be starting ✨\n\n**Module Title:** {moduleTitle}\n\nDuring this Module, {studentName} will get a fun and simple idea about how the applications we use in our daily lives are built and tailored for users 📱\nHe will also focus on building simple screens similar to mobile applications, with practical training to help him understand the concept step by step in an easy and age-appropriate way 🌟\n\nI will be following up with you during the Module and will share any important notes or noticeable progress with you, God willing.\n\n{supervisorName} ✨\nLearning Supervisor`,
    },

    // ── reminder_15min_student ────────────────────────────────
    reminder_15min_student: {
      variables: [
        {
          key: "salutation_ar",
          label: "تحية الطالب عربي",
          example: "عزيزي الطالب ممدوح",
        },
        {
          key: "salutation_en",
          label: "تحية الطالب إنجليزي",
          example: "Dear student Mamdouh",
        },
        { key: "sessionName", label: "اسم الحصة", example: "الدرس الأول" },
        { key: "time", label: "وقت الحصة", example: "07:00 - 08:30 مساءً" },
        {
          key: "meetingLink",
          label: "رابط الحصة",
          example: "https://meet.google.com/xxx",
        },
      ],
      ar: `{salutation_ar}،\n\n⏳ تذكير: حصتك *{sessionName}* هتبدأ خلال *15 دقيقة* الساعة {time} ⏰\n\n🔗 رابط الحصة:\n{meetingLink}\n\nCode School 💻`,
      en: `{salutation_en},\n\n⏳ Reminder: Your session *{sessionName}* starts in *15 minutes* at {time} ⏰\n\n🔗 Meeting link:\n{meetingLink}\n\nCode School 💻`,
    },

    // ── module_overview_adult (للبالغين — بيتبعت للطالب مباشرة) ──
    module_overview_adult: {
      variables: [
        {
          key: "studentSalutation",
          label: "تحية الطالب",
          example: "عزيزي أحمد",
        },
        { key: "studentName", label: "اسم الطالب", example: "أحمد" },
        {
          key: "moduleTitle",
          label: "عنوان الموديول",
          example: "Real-Life Mobile Solutions",
        },
        { key: "supervisorName", label: "اسم المشرف", example: "أحمد علي" },
      ],
      ar: `{studentSalutation} 👋\nحابب أشارك معاك لمحة سريعة عن الـ Module الجديد اللي هتبدأه ✨\n\n**Module Title:** {moduleTitle}\n\nخلال الـ Module ده، هتاخد فكرة عملية وممتعة عن إزاي التطبيقات اللي بنستخدمها في حياتنا بتتعمل وبتتجهز بشكل مناسب للمستخدمين 📱\nوهتركز كمان على بناء شاشات بسيطة تشبه تطبيقات الموبايل، مع تدريب عملي يساعدك تفهم الفكرة خطوة بخطوة 🌟\n\nوأنا هكون متابع معاك خلال الـ Module، وهشاركك أي ملاحظات مهمة أو تطور واضح بإذن الله.\n\n{supervisorName} ✨\nLearning Supervisor`,
      en: `{studentSalutation} 👋\nI would like to share with you a quick overview of the new Module that you will be starting ✨\n\n**Module Title:** {moduleTitle}\n\nDuring this Module, you will get a practical and fun idea about how the applications we use in our daily lives are built and tailored for users 📱\nYou will also focus on building simple screens similar to mobile applications, with practical training to help you understand the concept step by step 🌟\n\nI will be following up with you during the Module and will share any important notes or noticeable progress with you, God willing.\n\n{supervisorName} ✨\nLearning Supervisor`,
    },

    // ── session_recording_adult (للبالغين — يبعت للطالب مباشرة) ──
    session_recording_adult: {
      variables: [
        {
          key: "studentSalutation",
          label: "تحية الطالب",
          example: "عزيزي أحمد",
        },
        { key: "studentName", label: "اسم الطالب", example: "أحمد" },
        { key: "sessionName", label: "اسم الجلسة", example: "الجلسة الأولى" },
        {
          key: "recordingLink",
          label: "رابط التسجيل",
          example: "https://drive.google.com/xxx",
        },
      ],
      ar: `{studentSalutation}،\n\n🎥 رابط تسجيل جلسة "{sessionName}":\n\n{recordingLink}\n\nيمكنك مراجعة التسجيل في أي وقت للمذاكرة والمراجعة.\nفريق Code School 💻`,
      en: `{studentSalutation},\n\n🎥 Recording for "{sessionName}":\n\n{recordingLink}\n\nYou can review the recording anytime for study and revision.\nCode School Team 💻`,
    },

    // ── reminder_15min_guardian ───────────────────────────────
    reminder_15min_guardian: {
      variables: [
        {
          key: "guardianSalutation",
          label: "تحية ولي الأمر",
          example: "عزيزي الأستاذ محمد",
        },
        { key: "childTitle", label: "صلة القرابة", example: "ابنك" },
        { key: "studentName", label: "اسم الطالب", example: "ممدوح" },
        { key: "sessionName", label: "اسم الحصة", example: "الدرس الأول" },
        { key: "time", label: "وقت الحصة", example: "07:00 - 08:30 مساءً" },
        {
          key: "meetingLink",
          label: "رابط الحصة",
          example: "https://meet.google.com/xxx",
        },
      ],
      ar: `{guardianSalutation}،\n\n⏳ تذكير: حصة {childTitle} *{studentName}* - *{sessionName}* هتبدأ خلال *15 دقيقة* الساعة {time} ⏰\n\n🔗 رابط الحصة:\n{meetingLink}\n\nCode School 💻`,
      en: `{guardianSalutation},\n\n⏳ Reminder: {childTitle} *{studentName}*'s session *{sessionName}* starts in *15 minutes* at {time} ⏰\n\n🔗 Meeting link:\n{meetingLink}\n\nCode School 💻`,
    },

    // ═══════════════════════════════════════════════════════════
    // ✅ CREDIT / BILLING
    // ═══════════════════════════════════════════════════════════
    credit_low_balance_4h_student: {
      variables: [
        {
          key: "salutation_ar",
          label: "تحية الطالب (عربي)",
          example: "عزيزي الطالب ممدوح",
        },
        {
          key: "salutation_en",
          label: "تحية الطالب (إنجليزي)",
          example: "Dear student Mamdouh",
        },
        { key: "remainingHours", label: "الساعات المتبقية", example: "4" },
        {
          key: "packageName",
          label: "اسم الباقة",
          example: "الباقة الشهرية (12 ساعة)",
        },
      ],
      ar: `{salutation_ar} 👋\n\n⚠️ تنبيه: رصيد الساعات المتبقية في باقتك قارب على الانتهاء.\n\n🔋 الساعات المتبقية: *{remainingHours}* ساعة\n📦 الباقة: {packageName}\n\nلتجنب توقف الجلسات، بننصحك بتجديد الباقة قبل ما الرصيد ينفذ.\n\nفريق Code School 💻`,
      en: `{salutation_en} 👋\n\n⚠️ Heads-up: Your remaining credit hours are running low.\n\n🔋 Remaining hours: *{remainingHours}*\n📦 Package: {packageName}\n\nTo avoid any session interruption, we recommend renewing your package before the balance runs out.\n\nCode School Team 💻`,
    },
    credit_low_balance_4h_guardian: {
      variables: [
        {
          key: "guardianSalutation",
          label: "تحية ولي الأمر",
          example: "عزيزي الأستاذ محمد",
        },
        { key: "childTitle", label: "صلة القرابة", example: "ابنك" },
        { key: "studentName", label: "اسم الطالب", example: "ممدوح" },
        { key: "remainingHours", label: "الساعات المتبقية", example: "4" },
        {
          key: "packageName",
          label: "اسم الباقة",
          example: "الباقة الشهرية (12 ساعة)",
        },
      ],
      ar: `{guardianSalutation} 👋\n\n⚠️ تنبيه: رصيد ساعات {childTitle} *{studentName}* قارب على الانتهاء.\n\n🔋 الساعات المتبقية: *{remainingHours}* ساعة\n📦 الباقة: {packageName}\n\nلتجنب توقف الجلسات، بننصح حضرتك بتجديد الباقة قبل ما الرصيد ينفذ.\n\nفريق Code School 💻`,
      en: `{guardianSalutation} 👋\n\n⚠️ Heads-up: {childTitle} *{studentName}*'s credit hours are running low.\n\n🔋 Remaining hours: *{remainingHours}*\n📦 Package: {packageName}\n\nTo avoid any session interruption, we recommend renewing the package before the balance runs out.\n\nCode School Team 💻`,
    },
    credit_low_balance_2h_student: {
      variables: [
        {
          key: "salutation_ar",
          label: "تحية الطالب (عربي)",
          example: "عزيزي الطالب ممدوح",
        },
        {
          key: "salutation_en",
          label: "تحية الطالب (إنجليزي)",
          example: "Dear student Mamdouh",
        },
        { key: "remainingHours", label: "الساعات المتبقية", example: "2" },
        {
          key: "packageName",
          label: "اسم الباقة",
          example: "الباقة الشهرية (12 ساعة)",
        },
      ],
      ar: `{salutation_ar} 🚨\n\n🚨 تنبيه عاجل: رصيد ساعاتك أوشك على النفاذ.\n\n🔋 الساعات المتبقية: *{remainingHours}* ساعة فقط\n📦 الباقة: {packageName}\n\nبرجاء التواصل مع الإدارة فورًا لتجديد الباقة، عشان ما توقفش الجلسات.\n\nفريق Code School 💻`,
      en: `{salutation_en} 🚨\n\n🚨 Urgent: Your credit hours are almost exhausted.\n\n🔋 Remaining hours: *{remainingHours}* only\n📦 Package: {packageName}\n\nPlease contact the administration immediately to renew your package, so your sessions don't stop.\n\nCode School Team 💻`,
    },
    credit_low_balance_2h_guardian: {
      variables: [
        {
          key: "guardianSalutation",
          label: "تحية ولي الأمر",
          example: "عزيزي الأستاذ محمد",
        },
        { key: "childTitle", label: "صلة القرابة", example: "ابنك" },
        { key: "studentName", label: "اسم الطالب", example: "ممدوح" },
        { key: "remainingHours", label: "الساعات المتبقية", example: "2" },
        {
          key: "packageName",
          label: "اسم الباقة",
          example: "الباقة الشهرية (12 ساعة)",
        },
      ],
      ar: `{guardianSalutation} 🚨\n\n🚨 تنبيه عاجل: رصيد ساعات {childTitle} *{studentName}* أوشك على النفاذ.\n\n🔋 الساعات المتبقية: *{remainingHours}* ساعة فقط\n📦 الباقة: {packageName}\n\nبرجاء التواصل مع الإدارة فورًا لتجديد الباقة، عشان ما توقفش جلسات {childTitle}.\n\nفريق Code School 💻`,
      en: `{guardianSalutation} 🚨\n\n🚨 Urgent: {childTitle} *{studentName}*'s credit hours are almost exhausted.\n\n🔋 Remaining hours: *{remainingHours}* only\n📦 Package: {packageName}\n\nPlease contact the administration immediately to renew the package, so {childTitle}'s sessions don't stop.\n\nCode School Team 💻`,
    },

    // ── portfolio_inactivity_reminder ─────────────────────────
    portfolio_inactivity_reminder: {
      variables: [
        { key: "ownerName", label: "اسم صاحب البورتفوليو", example: "أحمد" },
        {
          key: "portfolioLink",
          label: "رابط البورتفوليو",
          example: "https://codeschool.com/portfolio/ahmed",
        },
      ],
      ar: `أهلاً بيك يا {ownerName}،\n\nعارفين إن الـ Personal Portfolio بتاعك مش مجرد صفحة على النت، ده واجهة الـ Business بتاعك والمكان اللي بيعكس مجهودك وشغلك.\n\nعشان كده، صممنا البورتفوليو بتاعك ليكون صديق لمحركات البحث ومُحسن للـ SEO والـ GEO.. وده معناه Visibility أعلى وعملاء أكتر يقدروا يوصلولك بسهولة.\n\nادخل دلوقتي وضيف أي Updates جديدة في الـ Projects بتاعتك عشان تفضل دايماً في الصدارة والـ Ranking بتاعك يعلى!\n\nلينك البورتفوليو بتاعك:\n{portfolioLink}`,
      en: `Hi {ownerName},\n\nYour Personal Portfolio isn't just a page online — it's the face of your business and the place that reflects your effort and work.\n\nThat's why we designed your portfolio to be search-engine friendly and optimized for SEO & GEO.. which means higher visibility and more clients finding you easily.\n\nLog in now and add any new Updates to your Projects to stay ahead and keep your Ranking climbing!\n\nYour portfolio link:\n{portfolioLink}`,
    },
    portfolio_update_broadcast: {
      variables: [
        { key: "ownerName", label: "اسم صاحب البورتفوليو", example: "أحمد" },
        {
          key: "updateLink",
          label: "رابط صفحة التحديثات",
          example: "https://codeschool.com/portfolio/ahmed",
        },
      ],
      ar: `أهلاً يا {ownerName} ✨\n\nلأن الـ Personal Portfolio بتاعك هو واجهتك الرقمية، إحنا دايماً بنطور الـ System عشان نضمن إنك في الصدارة. 🎯\n\nنزلنا النهاردة Update جديد هيحسن الـ SEO والـ GEO لصفحتك بشكل ملحوظ عشان يضمنلك أعلى Visibility ممكنة.\n\nادخل شوف التحديثات واعمل Update لبياناتك من هنا:\n🔗 {updateLink}\n\nيومك جميل وموفق! 🌻`,
      en: `Hi {ownerName} ✨\n\nSince your Personal Portfolio is your digital face, we're always upgrading the System to keep you ahead. 🎯\n\nToday we shipped a new Update that noticeably improves the SEO & GEO of your page, giving you the highest possible Visibility.\n\nCheck out the updates and refresh your data here:\n🔗 {updateLink}\n\nHave a great day! 🌻`,
    },
    portfolio_contact_form_notification: {
      variables: [
        { key: "ownerName", label: "اسم صاحب البورتفوليو", example: "أحمد" },
        {
          key: "dashboardLink",
          label: "رابط لوحة التحكم",
          example: "https://codeschool.com/dashboard",
        },
      ],
      ar: `عزيزي {ownerName}،\n\nيعلمك نظام الإشعارات الآلي بتلقي رسالة جديدة عبر الـ Contact Form الخاص بالـ Personal Portfolio الخاص بك.\n\nلضمان الخصوصية وسرية البيانات، يتم توجيه جميع الرسائل وتشفيرها آلياً إلى حسابك دون أي تدخل بشري.\n\nلعرض محتوى الرسالة والرد عليها، برجاء تسجيل الدخول إلى الـ Dashboard:\n🔗 {dashboardLink}`,
      en: `Dear {ownerName},\n\nOur automated notification system informs you that a new message has been received via the Contact Form on your Personal Portfolio.\n\nTo ensure privacy and data confidentiality, all messages are automatically routed and encrypted to your account without any human intervention.\n\nTo view the message and reply, please log in to your Dashboard:\n🔗 {dashboardLink}`,
    },

    // ═══════════════════════════════════════════════════════════
    // ✅ OFFLINE TEMPLATES — 24h
    // ═══════════════════════════════════════════════════════════
    reminder_24h_offline_student: {
      variables: [
        {
          key: "salutation_ar",
          label: "تحية الطالب (عربي)",
          example: "عزيزي الطالب ممدوح",
        },
        {
          key: "salutation_en",
          label: "تحية الطالب (إنجليزي)",
          example: "Dear student Mamdouh",
        },
        { key: "sessionName", label: "اسم الحصة", example: "الدرس الأول" },
        { key: "date", label: "التاريخ", example: "غدًا" },
        { key: "time", label: "الوقت", example: "07:00 - 08:30 مساءً" },
        ...offlineLocationVariables,
      ],
      ar: `{salutation_ar} 👋\n\nتذكير: حصتك *{sessionName}* بكرة إن شاء الله ✨\n\n📅 التاريخ: {date}\n⏰ الوقت: {time}\n\n📍 المكان: {placeName}\n📌 العنوان: {address}\n\n🗺️ اللوكيشن على الخريطة:\n{mapsLink}\n\nمنتظرينك في الميعاد 💻\nCode School`,
      en: `{salutation_en} 👋\n\nReminder: Your session *{sessionName}* is tomorrow, God willing ✨\n\n📅 Date: {date}\n⏰ Time: {time}\n\n📍 Location: {placeName}\n📌 Address: {address}\n\n🗺️ Location on Maps:\n{mapsLink}\n\nSee you there 💻\nCode School`,
    },
    reminder_24h_offline_guardian: {
      variables: [
        {
          key: "guardianSalutation",
          label: "تحية ولي الأمر",
          example: "عزيزي الأستاذ محمد",
        },
        { key: "childTitle", label: "صلة القرابة", example: "ابنك" },
        { key: "studentName", label: "اسم الطالب", example: "ممدوح" },
        { key: "sessionName", label: "اسم الحصة", example: "الدرس الأول" },
        { key: "date", label: "التاريخ", example: "غدًا" },
        { key: "time", label: "الوقت", example: "07:00 - 08:30 مساءً" },
        ...offlineLocationVariables,
      ],
      ar: `{guardianSalutation} 👋\n\nتذكير: حصة {childTitle} *{studentName}* بكرة إن شاء الله ✨\n\n📘 الـ Session: {sessionName}\n📅 التاريخ: {date}\n⏰ الوقت: {time}\n\n📍 المكان: {placeName}\n📌 العنوان: {address}\n\n🗺️ اللوكيشن على الخريطة:\n{mapsLink}\n\nياريت تجهز {childTitle} للوصول في الميعاد 🙏\nCode School 💻`,
      en: `{guardianSalutation} 👋\n\nReminder: {childTitle} *{studentName}*'s session is tomorrow ✨\n\n📘 Session: {sessionName}\n📅 Date: {date}\n⏰ Time: {time}\n\n📍 Location: {placeName}\n📌 Address: {address}\n\n🗺️ Location on Maps:\n{mapsLink}\n\nPlease prepare {childTitle} to arrive on time 🙏\nCode School 💻`,
    },
    reminder_30min_offline_student: {
      variables: [
        { key: "salutation_ar", label: "تحية الطالب", example: "عزيزي ممدوح" },
        {
          key: "salutation_en",
          label: "Student Salutation (EN)",
          example: "Dear Mamdouh",
        },
        { key: "sessionName", label: "اسم الحصة", example: "الدرس الأول" },
        { key: "time", label: "الوقت", example: "07:00" },
        { key: "placeName", label: "المكان", example: "Code School - المعادي" },
        {
          key: "mapsLink",
          label: "لينك الخريطة",
          example: "https://maps.google.com/...",
        },
      ],
      ar: `{salutation_ar} 👋\n\n⏰ فاضل 30 دقيقة على بداية الحصة *{sessionName}*\n\n📍 المكان: {placeName}\n🗺️ {mapsLink}\n\nيلا استعد للنزول 👍\nCode School 💻`,
      en: `{salutation_en} 👋\n\n⏰ 30 minutes left until *{sessionName}*\n\n📍 Location: {placeName}\n🗺️ {mapsLink}\n\nGet ready to head out 👍\nCode School 💻`,
    },
    reminder_30min_offline_guardian: {
      variables: [
        {
          key: "guardianSalutation",
          label: "تحية ولي الأمر",
          example: "عزيزي الأستاذ محمد",
        },
        { key: "childTitle", label: "صلة القرابة", example: "ابنك" },
        { key: "studentName", label: "اسم الطالب", example: "ممدوح" },
        { key: "sessionName", label: "اسم الحصة", example: "الدرس الأول" },
        { key: "time", label: "الوقت", example: "07:00" },
        { key: "placeName", label: "المكان", example: "Code School - المعادي" },
        {
          key: "mapsLink",
          label: "لينك الخريطة",
          example: "https://maps.google.com/...",
        },
      ],
      ar: `{guardianSalutation} 👋\n\n🚗 تنبيه: حصة {childTitle} *{studentName}* هتبدأ بعد 30 دقيقة\n\n⏰ الوقت: {time}\n📍 المكان: {placeName}\n🗺️ {mapsLink}\n\nياريت تجهز {childTitle} للنزول في الميعاد 🙏\nCode School 💻`,
      en: `{guardianSalutation} 👋\n\n🚗 Heads-up: {childTitle} *{studentName}*'s session starts in 30 minutes\n\n⏰ Time: {time}\n📍 Location: {placeName}\n🗺️ {mapsLink}\n\nPlease prepare {childTitle} to head out on time 🙏\nCode School 💻`,
    },
    pre_attendance_ping_student: {
      variables: [
        { key: "salutation_ar", label: "تحية الطالب", example: "عزيزي ممدوح" },
        {
          key: "salutation_en",
          label: "Student Salutation (EN)",
          example: "Dear Mamdouh",
        },
        { key: "sessionName", label: "اسم الحصة", example: "الدرس الأول" },
      ],
      ar: `{salutation_ar} 👋\n\nبنستعد نبدأ حصة *{sessionName}* دلوقتي، ياريت نتأكد إنك موجود وجاهز ✨\nCode School 💻`,
      en: `{salutation_en} 👋\n\nWe're about to start *{sessionName}* now, please make sure you're ready ✨\nCode School 💻`,
    },
    pre_attendance_ping_guardian: {
      variables: [
        {
          key: "guardianSalutation",
          label: "تحية ولي الأمر",
          example: "عزيزي الأستاذ محمد",
        },
        { key: "childTitle", label: "صلة القرابة", example: "ابنك" },
        { key: "studentName", label: "اسم الطالب", example: "ممدوح" },
        { key: "sessionName", label: "اسم الحصة", example: "الدرس الأول" },
      ],
      ar: `{guardianSalutation} 👋\n\nبنستعد نبدأ حصة {childTitle} *{studentName}* دلوقتي، ياريت نتأكد إنه موجود وجاهز ✨\nCode School 💻`,
      en: `{guardianSalutation} 👋\n\nWe're about to start {childTitle} *{studentName}*'s session now, please make sure they're ready ✨\nCode School 💻`,
    },

    // ═══════════════════════════════════════════════════════════
    // ✅ ADULTS — Reminders
    // ═══════════════════════════════════════════════════════════
    reminder_24h_adult: {
      variables: [
        {
          key: "studentSalutation",
          label: "تحية الطالب",
          example: "عزيزي أحمد",
        },
        { key: "studentName", label: "اسم الطالب", example: "أحمد" },
        { key: "sessionName", label: "اسم الحصة", example: "الدرس الأول" },
        { key: "date", label: "التاريخ", example: "غدًا" },
        { key: "time", label: "الوقت", example: "07:00 - 08:30 مساءً" },
        {
          key: "meetingLink",
          label: "رابط الحصة",
          example: "https://meet.google.com/xxx",
        },
      ],
      ar: `{studentSalutation} 👋\n\nتذكير: حصتك *{sessionName}* بكرة إن شاء الله ✨\n\n📘 الحصة: {sessionName}\n📅 التاريخ: {date}\n⏰ الوقت: {time}\n🔗 لينك الحصة:\n{meetingLink}\n\n💡 ياريت تتأكد إن اللاب مشحون، النت مستقر، والكاميرا جاهزة 👍\n\nمتحمسين نشوفك بكرة 💻🚀\nفريق Code School`,
      en: `{studentSalutation} 👋\n\nJust a reminder that your session *{sessionName}* is tomorrow ✨\n\n📘 Session: {sessionName}\n📅 Date: {date}\n⏰ Time: {time}\n🔗 Meeting Link:\n{meetingLink}\n\n💡 Please make sure your laptop is charged, internet is stable, and camera is ready 👍\n\nExcited to see you tomorrow 💻🚀\nCode School Team`,
    },
    reminder_15min_adult: {
      variables: [
        {
          key: "studentSalutation",
          label: "تحية الطالب",
          example: "عزيزي أحمد",
        },
        { key: "sessionName", label: "اسم الحصة", example: "الدرس الأول" },
        { key: "time", label: "الوقت", example: "07:00 - 08:30 مساءً" },
        {
          key: "meetingLink",
          label: "رابط الحصة",
          example: "https://meet.google.com/xxx",
        },
      ],
      ar: `{studentSalutation} 👋\n\n⏳ تذكير: حصتك *{sessionName}* هتبدأ خلال *15 دقيقة* الساعة {time} ⏰\n\n🔗 رابط الحصة:\n{meetingLink}\n\nCode School 💻`,
      en: `{studentSalutation} 👋\n\n⏳ Reminder: Your session *{sessionName}* starts in *15 minutes* at {time} ⏰\n\n🔗 Meeting link:\n{meetingLink}\n\nCode School 💻`,
    },
    reminder_24h_offline_adult: {
      variables: [
        {
          key: "studentSalutation",
          label: "تحية الطالب",
          example: "عزيزي أحمد",
        },
        { key: "sessionName", label: "اسم الحصة", example: "الدرس الأول" },
        { key: "date", label: "التاريخ", example: "غدًا" },
        { key: "time", label: "الوقت", example: "07:00 - 08:30 مساءً" },
        ...offlineLocationVariables,
      ],
      ar: `{studentSalutation} 👋\n\nتذكير: حصتك *{sessionName}* بكرة إن شاء الله ✨\n\n📅 التاريخ: {date}\n⏰ الوقت: {time}\n\n📍 المكان: {placeName}\n📌 العنوان: {address}\n🗺️ اللوكيشن على الخريطة:\n{mapsLink}\n\nمنتظرينك في الميعاد 💻\nCode School`,
      en: `{studentSalutation} 👋\n\nReminder: Your session *{sessionName}* is tomorrow ✨\n\n📅 Date: {date}\n⏰ Time: {time}\n\n📍 Location: {placeName}\n📌 Address: {address}\n🗺️ Location on Maps:\n{mapsLink}\n\nSee you there 💻\nCode School`,
    },
    reminder_30min_offline_adult: {
      variables: [
        {
          key: "studentSalutation",
          label: "تحية الطالب",
          example: "عزيزي أحمد",
        },
        { key: "sessionName", label: "اسم الحصة", example: "الدرس الأول" },
        { key: "time", label: "الوقت", example: "07:00" },
        { key: "placeName", label: "المكان", example: "Code School - المعادي" },
        {
          key: "mapsLink",
          label: "لينك الخريطة",
          example: "https://maps.google.com/...",
        },
      ],
      ar: `{studentSalutation} 👋\n\n⏰ فاضل 30 دقيقة على بداية الحصة *{sessionName}*\n\n📍 المكان: {placeName}\n🗺️ {mapsLink}\n\nيلا استعد للنزول 👍\nCode School 💻`,
      en: `{studentSalutation} 👋\n\n⏰ 30 minutes left until *{sessionName}*\n\n📍 Location: {placeName}\n🗺️ {mapsLink}\n\nGet ready to head out 👍\nCode School 💻`,
    },

    // ═══════════════════════════════════════════════════════════
    // ✅ ADULTS — Attendance
    // ═══════════════════════════════════════════════════════════
    absence_notification_adult: {
      variables: [
        {
          key: "studentSalutation",
          label: "تحية الطالب",
          example: "عزيزي أحمد",
        },
        { key: "sessionName", label: "اسم الحصة", example: "الدرس الأول" },
        { key: "date", label: "التاريخ", example: "الثلاثاء 20 مايو 2024" },
        { key: "time", label: "الوقت", example: "07:00 - 08:30 مساءً" },
      ],
      ar: `{studentSalutation}،\n\nنود إعلامك بأنه تم تسجيل غيابك عن الحصة:\n\n📘 الحصة: {sessionName}\n📅 التاريخ: {date}\n⏰ الوقت: {time}\n\nيرجى التواصل معنا في حال وجود أي استفسار.\nفريق Code School 💻`,
      en: `{studentSalutation},\n\nWe would like to inform you that your absence has been recorded for the session:\n\n📘 Session: {sessionName}\n📅 Date: {date}\n⏰ Time: {time}\n\nPlease contact us if you have any questions.\nCode School Team 💻`,
    },
    late_notification_adult: {
      variables: [
        {
          key: "studentSalutation",
          label: "تحية الطالب",
          example: "عزيزي أحمد",
        },
        { key: "sessionName", label: "اسم الحصة", example: "الدرس الأول" },
        { key: "date", label: "التاريخ", example: "الثلاثاء 20 مايو 2024" },
      ],
      ar: `{studentSalutation}،\n\nنود إعلامك بأنه تم تسجيل وصولك متأخراً للحصة:\n\n📘 الحصة: {sessionName}\n📅 التاريخ: {date}\n\nيرجى الحرص على المواعيد في المرات القادمة.\nفريق Code School 💻`,
      en: `{studentSalutation},\n\nWe would like to inform you that your late arrival has been recorded for the session:\n\n📘 Session: {sessionName}\n📅 Date: {date}\n\nPlease ensure punctuality in future sessions.\nCode School Team 💻`,
    },
    excused_notification_adult: {
      variables: [
        {
          key: "studentSalutation",
          label: "تحية الطالب",
          example: "عزيزي أحمد",
        },
        { key: "sessionName", label: "اسم الحصة", example: "الدرس الأول" },
        { key: "date", label: "التاريخ", example: "الثلاثاء 20 مايو 2024" },
      ],
      ar: `{studentSalutation}،\n\nتم تسجيل غيابك بعذر عن الحصة:\n\n📘 الحصة: {sessionName}\n📅 التاريخ: {date}\n\nفريق Code School 💻`,
      en: `{studentSalutation},\n\nYour absence has been recorded as excused for the session:\n\n📘 Session: {sessionName}\n📅 Date: {date}\n\nCode School Team 💻`,
    },

    // ═══════════════════════════════════════════════════════════
    // ✅ ADULTS — Evaluation
    // ═══════════════════════════════════════════════════════════
    evaluation_pass_adult: {
      variables: evalVariables,
      ar: `{studentSalutation}،\n\nتقرير الحصة 📃✨\n📆 التاريخ : {sessionDate}\n📑 رقم الحصة : {sessionNumber}\n⏱️ مدة الحصة : ساعتين\n👥 الحضور : {attendanceStatus}\n📊 تقييم الأداء :\n⭐ الالتزام والتركيز : {starsCommitment}\n⭐ مستوى الاستيعاب : {starsUnderstanding}\n⭐ تنفيذ المهام : {starsTaskExecution}\n⭐ المشاركة داخل الحصة : {starsParticipation}\n📝 تعليق المدرب :\n{instructorComment}\n🔢 عدد الحصص المنتهية : {completedSessions}\n{recordingLink}\n🏆 النتيجة : {evaluationDecision}\n🙏 نشكرك على ثقتك في Code School\n📞 للتواصل : +2 011 40 474 129`,
      en: `{studentSalutation},\n\nSession Report 📃✨\n📆 Date : {sessionDate}\n📑 Session No. : {sessionNumber}\n⏱️ Duration : 2 hours\n👥 Attendance : {attendanceStatus}\n📊 Performance Evaluation :\n⭐ Commitment & Focus : {starsCommitment}\n⭐ Understanding Level : {starsUnderstanding}\n⭐ Task Execution : {starsTaskExecution}\n⭐ Class Participation : {starsParticipation}\n📝 Instructor's Comment :\n{instructorComment}\n🔢 Sessions Completed : {completedSessions}\n{recordingLink}\n🏆 Result : {evaluationDecision}\n🙏 Thank you for trusting Code School\n📞 Contact : +2 011 40 474 129`,
    },
    evaluation_review_adult: {
      variables: evalVariables,
      ar: `{studentSalutation}،\n\nتقرير الحصة 📃✨\n📆 التاريخ : {sessionDate}\n📑 رقم الحصة : {sessionNumber}\n⏱️ مدة الحصة : ساعتين\n👥 الحضور : {attendanceStatus}\n📊 تقييم الأداء :\n⭐ الالتزام والتركيز : {starsCommitment}\n⭐ مستوى الاستيعاب : {starsUnderstanding}\n⭐ تنفيذ المهام : {starsTaskExecution}\n⭐ المشاركة داخل الحصة : {starsParticipation}\n📝 تعليق المدرب :\n{instructorComment}\n🔢 عدد الحصص المنتهية : {completedSessions}\n{recordingLink}\n🏆 النتيجة : {evaluationDecision}\n🙏 نشكرك على ثقتك في Code School\n📞 للتواصل : +2 011 40 474 129`,
      en: `{studentSalutation},\n\nSession Report 📃✨\n📆 Date : {sessionDate}\n📑 Session No. : {sessionNumber}\n⏱️ Duration : 2 hours\n👥 Attendance : {attendanceStatus}\n📊 Performance Evaluation :\n⭐ Commitment & Focus : {starsCommitment}\n⭐ Understanding Level : {starsUnderstanding}\n⭐ Task Execution : {starsTaskExecution}\n⭐ Class Participation : {starsParticipation}\n📝 Instructor's Comment :\n{instructorComment}\n🔢 Sessions Completed : {completedSessions}\n{recordingLink}\n🏆 Result : {evaluationDecision}\n🙏 Thank you for trusting Code School\n📞 Contact : +2 011 40 474 129`,
    },
    evaluation_repeat_adult: {
      variables: evalVariables,
      ar: `{studentSalutation}،\n\nتقرير الحصة 📃✨\n📆 التاريخ : {sessionDate}\n📑 رقم الحصة : {sessionNumber}\n⏱️ مدة الحصة : ساعتين\n👥 الحضور : {attendanceStatus}\n📊 تقييم الأداء :\n⭐ الالتزام والتركيز : {starsCommitment}\n⭐ مستوى الاستيعاب : {starsUnderstanding}\n⭐ تنفيذ المهام : {starsTaskExecution}\n⭐ المشاركة داخل الحصة : {starsParticipation}\n📝 تعليق المدرب :\n{instructorComment}\n🔢 عدد الحصص المنتهية : {completedSessions}\n{recordingLink}\n🏆 النتيجة : {evaluationDecision}\n🙏 نشكرك على ثقتك في Code School\n📞 للتواصل : +2 011 40 474 129`,
      en: `{studentSalutation},\n\nSession Report 📃✨\n📆 Date : {sessionDate}\n📑 Session No. : {sessionNumber}\n⏱️ Duration : 2 hours\n👥 Attendance : {attendanceStatus}\n📊 Performance Evaluation :\n⭐ Commitment & Focus : {starsCommitment}\n⭐ Understanding Level : {starsUnderstanding}\n⭐ Task Execution : {starsTaskExecution}\n⭐ Class Participation : {starsParticipation}\n📝 Instructor's Comment :\n{instructorComment}\n🔢 Sessions Completed : {completedSessions}\n{recordingLink}\n🏆 Result : {evaluationDecision}\n🙏 Thank you for trusting Code School\n📞 Contact : +2 011 40 474 129`,
    },

    // ═══════════════════════════════════════════════════════════
    // 🎁 MAKE-UP SESSION (Online)
    // ═══════════════════════════════════════════════════════════
    makeup_session_student: {
      variables: makeupStudentVariables,
      ar: `{studentSalutation} 👋\n\nعندنا خبر حلو ليك! 🎁\n\nتم تحديد حصة تعويضية ليك عشان نعوّضك عن الحصة اللي فاتتك:\n\n📘 الكورس: {courseName}\n👥 المجموعة الجديدة: {groupName}\n\n🔄 الحصة الأصلية:\n📅 {originalDate}\n⏰ {originalTime}\n📚 {originalSessionTitle}\n\n✨ الحصة التعويضية الجديدة:\n📅 {newDate}\n⏰ {newTime}\n📚 {newSessionTitle}\n🔗 رابط الحصة: {meetingLink}\n👨‍🏫 المدرس: {instructorName}\n\n🎉 الحصة دي مجانية تمامًا — مش هتتخصم من رصيدك.\n\nمستنيينك! 💻\nفريق Code School`,
      en: `{studentSalutation} 👋\n\nWe've got great news! 🎁\n\nA make-up session has been scheduled for you:\n\n📘 Course: {courseName}\n👥 New Group: {groupName}\n\n🔄 Original Session:\n📅 {originalDate}\n⏰ {originalTime}\n📚 {originalSessionTitle}\n\n✨ New Make-up Session:\n📅 {newDate}\n⏰ {newTime}\n📚 {newSessionTitle}\n🔗 Meeting Link: {meetingLink}\n👨‍🏫 Instructor: {instructorName}\n\n🎉 This session is completely free — it won't be deducted from your balance.\n\nSee you there! 💻\nCode School Team`,
    },
    makeup_session_guardian: {
      variables: makeupGuardianVariables,
      ar: `{guardianSalutation} 👋\n\nيسرنا إبلاغكم إنه تم تحديد حصة تعويضية لـ{childTitle} **{studentName}**:\n\n📘 الكورس: {courseName}\n👥 المجموعة الجديدة: {groupName}\n\n🔄 الحصة الأصلية:\n📅 {originalDate}\n⏰ {originalTime}\n\n✨ الحصة التعويضية الجديدة:\n📅 {newDate}\n⏰ {newTime}\n🔗 رابط الحصة: {meetingLink}\n👨‍🏫 المدرس: {instructorName}\n\n🎉 الحصة دي مجانية — مش هتتخصم من رصيد {childTitle}.\n\nفريق Code School 💻`,
      en: `{guardianSalutation} 👋\n\nWe are pleased to inform you that a make-up session has been scheduled for {childTitle} **{studentName}**:\n\n📘 Course: {courseName}\n👥 New Group: {groupName}\n\n🔄 Original Session:\n📅 {originalDate}\n⏰ {originalTime}\n\n✨ New Make-up Session:\n📅 {newDate}\n⏰ {newTime}\n🔗 Meeting Link: {meetingLink}\n👨‍🏫 Instructor: {instructorName}\n\n🎉 This session is free — it won't be deducted from {childTitle}'s balance.\n\nCode School Team 💻`,
    },
    makeup_session_instructor: {
      variables: makeupInstructorVariables,
      ar: `{instructorSalutation} 👋\n\nتم تحديد حصة تعويضية جديدة ليك:\n\n📘 الكورس: {courseName}\n👥 المجموعة: {groupName}\n👤 الطالب: {studentName}\n\n📅 التاريخ: {newDate}\n⏰ الوقت: {newTime}\n🔗 رابط الحصة: {meetingLink}\n\n🔄 الحصة الأصلية:\n📅 {originalDate}\n⏰ {originalTime}\n📚 {originalSessionTitle}\n\nملاحظة: الحصة دي تعويضية (مجانية على الطالب)، لكن المدرس بيتحاسب عليها عادي.\n\nفريق Code School 💻`,
      en: `{instructorSalutation} 👋\n\nA new make-up session has been scheduled for you:\n\n📘 Course: {courseName}\n👥 Group: {groupName}\n👤 Student: {studentName}\n\n📅 Date: {newDate}\n⏰ Time: {newTime}\n🔗 Meeting Link: {meetingLink}\n\n🔄 Original Session:\n📅 {originalDate}\n⏰ {originalTime}\n📚 {originalSessionTitle}\n\nNote: This is a make-up session (free for the student), but the instructor is still paid for it.\n\nCode School Team 💻`,
    },

    // ═══════════════════════════════════════════════════════════
    // 🎁 MAKE-UP SESSION (Offline)
    // ═══════════════════════════════════════════════════════════
    makeup_session_student_offline: {
      variables: makeupStudentOfflineVariables,
      ar: `{studentSalutation} 👋\n\nعندنا خبر حلو ليك! 🎁\n\nتم تحديد حصة تعويضية ليك عشان نعوّضك عن الحصة اللي فاتتك:\n\n📘 الكورس: {courseName}\n👥 المجموعة الجديدة: {groupName}\n\n🔄 الحصة الأصلية:\n📅 {originalDate}\n⏰ {originalTime}\n📚 {originalSessionTitle}\n\n✨ الحصة التعويضية الجديدة:\n📅 {newDate}\n⏰ {newTime}\n📚 {newSessionTitle}\n{sessionLocationBlock}\n👨‍🏫 المدرس: {instructorName}\n\n🎉 الحصة دي مجانية تمامًا — مش هتتخصم من رصيدك.\n\nمستنيينك! 💻\nفريق Code School`,
      en: `{studentSalutation} 👋\n\nWe've got great news! 🎁\n\nA make-up session has been scheduled for you:\n\n📘 Course: {courseName}\n👥 New Group: {groupName}\n\n🔄 Original Session:\n📅 {originalDate}\n⏰ {originalTime}\n📚 {originalSessionTitle}\n\n✨ New Make-up Session:\n📅 {newDate}\n⏰ {newTime}\n📚 {newSessionTitle}\n{sessionLocationBlock}\n👨‍🏫 Instructor: {instructorName}\n\n🎉 This session is completely free — it won't be deducted from your balance.\n\nSee you there! 💻\nCode School Team`,
    },
    makeup_session_guardian_offline: {
      variables: makeupGuardianOfflineVariables,
      ar: `{guardianSalutation} 👋\n\nيسرنا إبلاغكم إنه تم تحديد حصة تعويضية لـ{childTitle} **{studentName}**:\n\n📘 الكورس: {courseName}\n👥 المجموعة الجديدة: {groupName}\n\n🔄 الحصة الأصلية:\n📅 {originalDate}\n⏰ {originalTime}\n\n✨ الحصة التعويضية الجديدة:\n📅 {newDate}\n⏰ {newTime}\n{sessionLocationBlock}\n👨‍🏫 المدرس: {instructorName}\n\n🎉 الحصة دي مجانية — مش هتتخصم من رصيد {childTitle}.\n\nفريق Code School 💻`,
      en: `{guardianSalutation} 👋\n\nWe are pleased to inform you that a make-up session has been scheduled for {childTitle} **{studentName}**:\n\n📘 Course: {courseName}\n👥 New Group: {groupName}\n\n🔄 Original Session:\n📅 {originalDate}\n⏰ {originalTime}\n\n✨ New Make-up Session:\n📅 {newDate}\n⏰ {newTime}\n{sessionLocationBlock}\n👨‍🏫 Instructor: {instructorName}\n\n🎉 This session is free — it won't be deducted from {childTitle}'s balance.\n\nCode School Team 💻`,
    },
    makeup_session_instructor_offline: {
      variables: makeupInstructorOfflineVariables,
      ar: `{instructorSalutation} 👋\n\nتم تحديد حصة تعويضية جديدة ليك (Offline):\n\n📘 الكورس: {courseName}\n👥 المجموعة: {groupName}\n👤 الطالب: {studentName}\n\n📅 التاريخ: {newDate}\n⏰ الوقت: {newTime}\n{sessionLocationBlock}\n\n🔄 الحصة الأصلية:\n📅 {originalDate}\n⏰ {originalTime}\n📚 {originalSessionTitle}\n\nملاحظة: الحصة دي تعويضية (مجانية على الطالب)، لكن المدرس بيتحاسب عليها عادي.\n\nفريق Code School 💻`,
      en: `{instructorSalutation} 👋\n\nA new make-up session has been scheduled for you (Offline):\n\n📘 Course: {courseName}\n👥 Group: {groupName}\n👤 Student: {studentName}\n\n📅 Date: {newDate}\n⏰ Time: {newTime}\n{sessionLocationBlock}\n\n🔄 Original Session:\n📅 {originalDate}\n⏰ {originalTime}\n📚 {originalSessionTitle}\n\nNote: This is a make-up session (free for the student), but the instructor is still paid for it.\n\nCode School Team 💻`,
    },
    // ═══════════════════════════════════════════════════════════
    // 🎯 INTERVIEW — EVALUATION
    // ═══════════════════════════════════════════════════════════
    interview_evaluation_guardian: {
      variables: interviewEvalVariables,
      ar: `{guardianSalutation}،\n\nتقرير المقابلة 📋✨\n📆 التاريخ : {interviewDate}\n📑 رقم المقابلة : {interviewNumber}\n👤 الطالب : {studentName}\n\n📝 تعليق المُقابِل :\n{instructorComment}\n\n🏆 النتيجة : {evaluationDecision}\n\n🙏 نشكركم على ثقتكم في Code School\n📞 للتواصل : +2 011 40 474 129`,
      en: `{guardianSalutation},\n\nInterview Report 📋✨\n📆 Date : {interviewDate}\n📑 Interview No. : {interviewNumber}\n👤 Student : {studentName}\n\n📝 Interviewer's Comment :\n{instructorComment}\n\n🏆 Result : {evaluationDecision}\n\n🙏 Thank you for trusting Code School\n📞 Contact : +2 011 40 474 129`,
    },

    interview_evaluation_adult: {
      variables: interviewEvalVariables,
      ar: `{studentSalutation}،\n\nتقرير المقابلة 📋✨\n📆 التاريخ : {interviewDate}\n📑 رقم المقابلة : {interviewNumber}\n\n📝 تعليق المُقابِل :\n{instructorComment}\n\n🏆 النتيجة : {evaluationDecision}\n\n🙏 نشكرك على ثقتك في Code School\n📞 للتواصل : +2 011 40 474 129`,
      en: `{studentSalutation},\n\nInterview Report 📋✨\n📆 Date : {interviewDate}\n📑 Interview No. : {interviewNumber}\n\n📝 Interviewer's Comment :\n{instructorComment}\n\n🏆 Result : {evaluationDecision}\n\n🙏 Thank you for trusting Code School\n📞 Contact : +2 011 40 474 129`,
    },
    // ═══════════════════════════════════════════════════════════
    // 🎯 INTERVIEW — Welcome (Online)
    // ═══════════════════════════════════════════════════════════
    interview_welcome_child_online: {
      variables: [
        {
          key: "salutation_ar",
          label: "تحية الطالب (عربي)",
          example: "عزيزي ممدوح",
        },
        {
          key: "salutation_en",
          label: "تحية الطالب (إنجليزي)",
          example: "Dear Mamdouh",
        },
        { key: "studentName", label: "اسم الطالب", example: "ممدوح" },
        {
          key: "date",
          label: "تاريخ المقابلة",
          example: "الثلاثاء 20 مايو 2024",
        },
        { key: "time", label: "وقت المقابلة", example: "07:00 - 08:30 مساءً" },
        {
          key: "meetingLink",
          label: "رابط المقابلة",
          example: "https://meet.google.com/xxx",
        },
        { key: "instructorName", label: "اسم المُقابِل", example: "أحمد" },
      ],
      ar: `{salutation_ar} 👋\n\nأهلاً بيك في Code School! 🎉\n\nبنسعد بإبلاغك إنه تم تحديد ميعاد المقابلة الشخصية بتاعتك (Online):\n\n📅 التاريخ: {date}\n⏰ الوقت: {time}\n🔗 رابط المقابلة:\n{meetingLink}\n\n👨‍🏫 المُقابِل: {instructorName}\n\n💡 ياريت تجهز قبل الميعاد بخمس دقايق، وتتأكد إن اللاب مشحون، النت مستقر، والكاميرا جاهزة 👍\n\nمتحمسين نشوفك! 💻🚀\nفريق Code School`,
      en: `{salutation_en} 👋\n\nWelcome to Code School! 🎉\n\nWe're happy to confirm your interview has been scheduled (Online):\n\n📅 Date: {date}\n⏰ Time: {time}\n🔗 Meeting Link:\n{meetingLink}\n\n👨‍🏫 Interviewer: {instructorName}\n\n💡 Please be ready 5 minutes early, make sure your laptop is charged, internet is stable, and camera is ready 👍\n\nExcited to meet you! 💻🚀\nCode School Team`,
    },
    interview_welcome_child_offline: {
      variables: [
        {
          key: "salutation_ar",
          label: "تحية الطالب (عربي)",
          example: "عزيزي ممدوح",
        },
        {
          key: "salutation_en",
          label: "تحية الطالب (إنجليزي)",
          example: "Dear Mamdouh",
        },
        { key: "studentName", label: "اسم الطالب", example: "ممدوح" },
        {
          key: "date",
          label: "تاريخ المقابلة",
          example: "الثلاثاء 20 مايو 2024",
        },
        { key: "time", label: "وقت المقابلة", example: "07:00 - 08:30 مساءً" },
        { key: "placeName", label: "المكان", example: "Code School - المعادي" },
        { key: "address", label: "العنوان", example: "شارع 9، المعادي" },
        {
          key: "mapsLink",
          label: "اللوكيشن",
          example: "https://maps.google.com/...",
        },
        { key: "instructorName", label: "اسم المُقابِل", example: "أحمد" },
      ],
      ar: `{salutation_ar} 👋\n\nأهلاً بيك في Code School! 🎉\n\nبنسعد بإبلاغك إنه تم تحديد ميعاد المقابلة الشخصية بتاعتك (Offline):\n\n📅 التاريخ: {date}\n⏰ الوقت: {time}\n\n📍 المكان: {placeName}\n📌 العنوان: {address}\n🗺️ اللوكيشن:\n{mapsLink}\n\n👨‍🏫 المُقابِل: {instructorName}\n\n💡 ياريت تكون في المكان قبل الميعاد بخمس دقايق 👍\n\nمتحمسين نشوفك! 💻🚀\nفريق Code School`,
      en: `{salutation_en} 👋\n\nWelcome to Code School! 🎉\n\nWe're happy to confirm your interview has been scheduled (Offline):\n\n📅 Date: {date}\n⏰ Time: {time}\n\n📍 Location: {placeName}\n📌 Address: {address}\n🗺️ Location:\n{mapsLink}\n\n👨‍🏫 Interviewer: {instructorName}\n\n💡 Please be at the location 5 minutes early 👍\n\nExcited to meet you! 💻🚀\nCode School Team`,
    },

    interview_welcome_guardian_online: {
      variables: [
        {
          key: "guardianSalutation",
          label: "تحية ولي الأمر",
          example: "عزيزي الأستاذ محمد",
        },
        { key: "childTitle", label: "صلة القرابة", example: "ابنك" },
        { key: "studentName", label: "اسم الطالب", example: "ممدوح" },
        {
          key: "date",
          label: "تاريخ المقابلة",
          example: "الثلاثاء 20 مايو 2024",
        },
        { key: "time", label: "وقت المقابلة", example: "07:00 - 08:30 مساءً" },
        {
          key: "meetingLink",
          label: "رابط المقابلة",
          example: "https://meet.google.com/xxx",
        },
        { key: "instructorName", label: "اسم المُقابِل", example: "أحمد" },
      ],
      ar: `{guardianSalutation} 👋\n\nيسرنا إبلاغكم بأنه تم تحديد ميعاد المقابلة الشخصية لـ{childTitle} **{studentName}** (Online):\n\n📅 التاريخ: {date}\n⏰ الوقت: {time}\n🔗 رابط المقابلة:\n{meetingLink}\n\n👨‍🏫 المُقابِل: {instructorName}\n\nنتمنى من حضرتكم تجهيز {childTitle} للمقابلة في الميعاد، والتأكد من استقرار النت وجاهزية الكاميرا 👍\n\nنتطلع للقائكم قريباً 🌟\nفريق Code School 💻`,
      en: `{guardianSalutation} 👋\n\nWe are pleased to inform you that an interview has been scheduled for {childTitle} **{studentName}** (Online):\n\n📅 Date: {date}\n⏰ Time: {time}\n🔗 Meeting Link:\n{meetingLink}\n\n👨‍🏫 Interviewer: {instructorName}\n\nPlease ensure {childTitle} is ready on time, with a stable internet connection and a working camera 👍\n\nLooking forward to meeting you soon 🌟\nCode School Team 💻`,
    },
    interview_welcome_guardian_offline: {
      variables: [
        {
          key: "guardianSalutation",
          label: "تحية ولي الأمر",
          example: "عزيزي الأستاذ محمد",
        },
        { key: "childTitle", label: "صلة القرابة", example: "ابنك" },
        { key: "studentName", label: "اسم الطالب", example: "ممدوح" },
        {
          key: "date",
          label: "تاريخ المقابلة",
          example: "الثلاثاء 20 مايو 2024",
        },
        { key: "time", label: "وقت المقابلة", example: "07:00 - 08:30 مساءً" },
        { key: "placeName", label: "المكان", example: "Code School - المعادي" },
        { key: "address", label: "العنوان", example: "شارع 9، المعادي" },
        {
          key: "mapsLink",
          label: "اللوكيشن",
          example: "https://maps.google.com/...",
        },
        { key: "instructorName", label: "اسم المُقابِل", example: "أحمد" },
      ],
      ar: `{guardianSalutation} 👋\n\nيسرنا إبلاغكم بأنه تم تحديد ميعاد المقابلة الشخصية لـ{childTitle} **{studentName}** (Offline):\n\n📅 التاريخ: {date}\n⏰ الوقت: {time}\n\n📍 المكان: {placeName}\n📌 العنوان: {address}\n🗺️ اللوكيشن:\n{mapsLink}\n\n👨‍🏫 المُقابِل: {instructorName}\n\nنتمنى من حضرتكم تجهيز {childTitle} للوصول في الميعاد 👍\n\nنتطلع للقائكم قريباً 🌟\nفريق Code School 💻`,
      en: `{guardianSalutation} 👋\n\nWe are pleased to inform you that an interview has been scheduled for {childTitle} **{studentName}** (Offline):\n\n📅 Date: {date}\n⏰ Time: {time}\n\n📍 Location: {placeName}\n📌 Address: {address}\n🗺️ Location:\n{mapsLink}\n\n👨‍🏫 Interviewer: {instructorName}\n\nPlease ensure {childTitle} arrives on time 👍\n\nLooking forward to meeting you soon 🌟\nCode School Team 💻`,
    },

    interview_welcome_adult_online: {
      variables: [
        {
          key: "studentSalutation",
          label: "تحية الطالب البالغ",
          example: "عزيزي أحمد",
        },
        { key: "studentName", label: "اسم الطالب", example: "أحمد" },
        {
          key: "date",
          label: "تاريخ المقابلة",
          example: "الثلاثاء 20 مايو 2024",
        },
        { key: "time", label: "وقت المقابلة", example: "07:00 - 08:30 مساءً" },
        {
          key: "meetingLink",
          label: "رابط المقابلة",
          example: "https://meet.google.com/xxx",
        },
        { key: "instructorName", label: "اسم المُقابِل", example: "أحمد" },
      ],
      ar: `{studentSalutation} 👋\n\nأهلاً بيك في Code School! 🎉\n\nتم تحديد ميعاد المقابلة الشخصية بتاعتك (Online):\n\n📅 التاريخ: {date}\n⏰ الوقت: {time}\n🔗 رابط المقابلة:\n{meetingLink}\n\n👨‍🏫 المُقابِل: {instructorName}\n\n💡 ياريت تجهز قبل الميعاد بخمس دقايق 👍\n\nمتحمسين نشوفك! 💻🚀\nفريق Code School`,
      en: `{studentSalutation} 👋\n\nWelcome to Code School! 🎉\n\nYour interview has been scheduled (Online):\n\n📅 Date: {date}\n⏰ Time: {time}\n🔗 Meeting Link:\n{meetingLink}\n\n👨‍🏫 Interviewer: {instructorName}\n\n💡 Please be ready 5 minutes early 👍\n\nExcited to meet you! 💻🚀\nCode School Team`,
    },
    interview_welcome_adult_offline: {
      variables: [
        {
          key: "studentSalutation",
          label: "تحية الطالب البالغ",
          example: "عزيزي أحمد",
        },
        { key: "studentName", label: "اسم الطالب", example: "أحمد" },
        {
          key: "date",
          label: "تاريخ المقابلة",
          example: "الثلاثاء 20 مايو 2024",
        },
        { key: "time", label: "وقت المقابلة", example: "07:00 - 08:30 مساءً" },
        { key: "placeName", label: "المكان", example: "Code School - المعادي" },
        { key: "address", label: "العنوان", example: "شارع 9، المعادي" },
        {
          key: "mapsLink",
          label: "اللوكيشن",
          example: "https://maps.google.com/...",
        },
        { key: "instructorName", label: "اسم المُقابِل", example: "أحمد" },
      ],
      ar: `{studentSalutation} 👋\n\nأهلاً بيك في Code School! 🎉\n\nتم تحديد ميعاد المقابلة الشخصية بتاعتك (Offline):\n\n📅 التاريخ: {date}\n⏰ الوقت: {time}\n\n📍 المكان: {placeName}\n📌 العنوان: {address}\n🗺️ اللوكيشن:\n{mapsLink}\n\n👨‍🏫 المُقابِل: {instructorName}\n\n💡 ياريت تكون في المكان قبل الميعاد بخمس دقايق 👍\n\nمتحمسين نشوفك! 💻🚀\nفريق Code School`,
      en: `{studentSalutation} 👋\n\nWelcome to Code School! 🎉\n\nYour interview has been scheduled (Offline):\n\n📅 Date: {date}\n⏰ Time: {time}\n\n📍 Location: {placeName}\n📌 Address: {address}\n🗺️ Location:\n{mapsLink}\n\n👨‍🏫 Interviewer: {instructorName}\n\n💡 Please be at the location 5 minutes early 👍\n\nExcited to meet you! 💻🚀\nCode School Team`,
    },

    interview_welcome_instructor_online: {
      variables: [
        {
          key: "instructorSalutation",
          label: "تحية المُقابِل",
          example: "عزيزي الأستاذ أحمد",
        },
        { key: "instructorName", label: "اسم المُقابِل", example: "أحمد" },
        { key: "studentName", label: "اسم الطالب", example: "ممدوح" },
        {
          key: "date",
          label: "تاريخ المقابلة",
          example: "الثلاثاء 20 مايو 2024",
        },
        { key: "time", label: "وقت المقابلة", example: "07:00 - 08:30 مساءً" },
        {
          key: "meetingLink",
          label: "رابط المقابلة",
          example: "https://meet.google.com/xxx",
        },
      ],
      ar: `{instructorSalutation} 👋\n\nتم تحديد مقابلة شخصية جديدة ليك (Online):\n\n👤 الطالب: {studentName}\n📅 التاريخ: {date}\n⏰ الوقت: {time}\n🔗 رابط المقابلة:\n{meetingLink}\n\nياريت تكون جاهز قبل الميعاد بخمس دقايق، وتتأكد من استقرار النت والكاميرا 👍\n\nبالتوفيق! 💻🚀\nفريق Code School`,
      en: `{instructorSalutation} 👋\n\nA new interview has been scheduled for you (Online):\n\n👤 Student: {studentName}\n📅 Date: {date}\n⏰ Time: {time}\n🔗 Meeting Link:\n{meetingLink}\n\nPlease be ready 5 minutes early, with a stable internet connection and working camera 👍\n\nGood luck! 💻🚀\nCode School Team`,
    },
    interview_welcome_instructor_offline: {
      variables: [
        {
          key: "instructorSalutation",
          label: "تحية المُقابِل",
          example: "عزيزي الأستاذ أحمد",
        },
        { key: "instructorName", label: "اسم المُقابِل", example: "أحمد" },
        { key: "studentName", label: "اسم الطالب", example: "ممدوح" },
        {
          key: "date",
          label: "تاريخ المقابلة",
          example: "الثلاثاء 20 مايو 2024",
        },
        { key: "time", label: "وقت المقابلة", example: "07:00 - 08:30 مساءً" },
        { key: "placeName", label: "المكان", example: "Code School - المعادي" },
        { key: "address", label: "العنوان", example: "شارع 9، المعادي" },
        {
          key: "mapsLink",
          label: "اللوكيشن",
          example: "https://maps.google.com/...",
        },
      ],
      ar: `{instructorSalutation} 👋\n\nتم تحديد مقابلة شخصية جديدة ليك (Offline):\n\n👤 الطالب: {studentName}\n📅 التاريخ: {date}\n⏰ الوقت: {time}\n\n📍 المكان: {placeName}\n📌 العنوان: {address}\n🗺️ اللوكيشن:\n{mapsLink}\n\nياريت تكون في المكان قبل الميعاد بخمس دقايق 👍\n\nبالتوفيق! 💻🚀\nفريق Code School`,
      en: `{instructorSalutation} 👋\n\nA new interview has been scheduled for you (Offline):\n\n👤 Student: {studentName}\n📅 Date: {date}\n⏰ Time: {time}\n\n📍 Location: {placeName}\n📌 Address: {address}\n🗺️ Location:\n{mapsLink}\n\nPlease be at the location 5 minutes early 👍\n\nGood luck! 💻🚀\nCode School Team`,
    },

    // ═══════════════════════════════════════════════════════════
    // 🎯 INTERVIEW — ONLINE REMINDERS
    // ═══════════════════════════════════════════════════════════
    interview_reminder_24h_online_child: {
      variables: [
        { key: "salutation_ar", label: "تحية الطالب", example: "عزيزي ممدوح" },
        {
          key: "salutation_en",
          label: "Student Salutation (EN)",
          example: "Dear Mamdouh",
        },
        { key: "date", label: "التاريخ", example: "غدًا" },
        { key: "time", label: "الوقت", example: "07:00" },
        {
          key: "meetingLink",
          label: "رابط المقابلة",
          example: "https://meet.google.com/xxx",
        },
      ],
      ar: `{salutation_ar} 👋\n\n⏰ تذكير: عندك مقابلة شخصية بكرة إن شاء الله ✨\n\n📅 التاريخ: {date}\n⏰ الوقت: {time}\n🔗 رابط المقابلة:\n{meetingLink}\n\n💡 ياريت تجهز قبل الميعاد، وتتأكد إن اللاب مشحون والنت مستقر 👍\n\nمستنيينك! 💻\nCode School`,
      en: `{salutation_en} 👋\n\n⏰ Reminder: You have an interview tomorrow ✨\n\n📅 Date: {date}\n⏰ Time: {time}\n🔗 Meeting Link:\n{meetingLink}\n\n💡 Please prepare on time, and make sure your laptop is charged and internet is stable 👍\n\nWe're waiting for you! 💻\nCode School`,
    },

    interview_reminder_24h_online_guardian: {
      variables: [
        {
          key: "guardianSalutation",
          label: "تحية ولي الأمر",
          example: "عزيزي الأستاذ محمد",
        },
        { key: "childTitle", label: "صلة القرابة", example: "ابنك" },
        { key: "studentName", label: "اسم الطالب", example: "ممدوح" },
        { key: "date", label: "التاريخ", example: "غدًا" },
        { key: "time", label: "الوقت", example: "07:00" },
        {
          key: "meetingLink",
          label: "رابط المقابلة",
          example: "https://meet.google.com/xxx",
        },
      ],
      ar: `{guardianSalutation} 👋\n\n⏰ تذكير: مقابلة {childTitle} *{studentName}* بكرة إن شاء الله ✨\n\n📅 التاريخ: {date}\n⏰ الوقت: {time}\n🔗 رابط المقابلة:\n{meetingLink}\n\nياريت تجهز {childTitle} للمقابلة في الميعاد، وتتأكد من استقرار النت والكاميرا 🙏\nCode School 💻`,
      en: `{guardianSalutation} 👋\n\n⏰ Reminder: {childTitle} *{studentName}*'s interview is tomorrow ✨\n\n📅 Date: {date}\n⏰ Time: {time}\n🔗 Meeting Link:\n{meetingLink}\n\nPlease have {childTitle} ready on time, with stable internet and camera 🙏\nCode School 💻`,
    },

    interview_reminder_15min_online_child: {
      variables: [
        { key: "salutation_ar", label: "تحية الطالب", example: "عزيزي ممدوح" },
        {
          key: "salutation_en",
          label: "Student Salutation (EN)",
          example: "Dear Mamdouh",
        },
        {
          key: "meetingLink",
          label: "رابط المقابلة",
          example: "https://meet.google.com/xxx",
        },
      ],
      ar: `{salutation_ar} 👋\n\n⏳ فاضل 15 دقيقة على بداية المقابلة بتاعتك ⏰\n\n🔗 رابط المقابلة:\n{meetingLink}\n\nيلا استعد من دلوقتي 👍\nCode School 💻`,
      en: `{salutation_en} 👋\n\n⏳ 15 minutes until your interview ⏰\n\n🔗 Meeting Link:\n{meetingLink}\n\nGet ready now 👍\nCode School 💻`,
    },

    interview_reminder_15min_online_guardian: {
      variables: [
        {
          key: "guardianSalutation",
          label: "تحية ولي الأمر",
          example: "عزيزي الأستاذ محمد",
        },
        { key: "childTitle", label: "صلة القرابة", example: "ابنك" },
        { key: "studentName", label: "اسم الطالب", example: "ممدوح" },
        {
          key: "meetingLink",
          label: "رابط المقابلة",
          example: "https://meet.google.com/xxx",
        },
      ],
      ar: `{guardianSalutation} 👋\n\n⏳ فاضل 15 دقيقة على بداية مقابلة {childTitle} *{studentName}* ⏰\n\n🔗 رابط المقابلة:\n{meetingLink}\n\nياريت تجهز {childTitle} في الميعاد 🙏\nCode School 💻`,
      en: `{guardianSalutation} 👋\n\n⏳ 15 minutes until {childTitle} *{studentName}*'s interview ⏰\n\n🔗 Meeting Link:\n{meetingLink}\n\nPlease have {childTitle} ready on time 🙏\nCode School 💻`,
    },

    interview_reminder_24h_online_adult: {
      variables: [
        {
          key: "studentSalutation",
          label: "تحية الطالب البالغ",
          example: "عزيزي أحمد",
        },
        { key: "date", label: "التاريخ", example: "غدًا" },
        { key: "time", label: "الوقت", example: "07:00" },
        {
          key: "meetingLink",
          label: "رابط المقابلة",
          example: "https://meet.google.com/xxx",
        },
      ],
      ar: `{studentSalutation} 👋\n\n⏰ تذكير: عندك مقابلة شخصية بكرة إن شاء الله ✨\n\n📅 التاريخ: {date}\n⏰ الوقت: {time}\n🔗 رابط المقابلة:\n{meetingLink}\n\nمستنيينك! 💻\nCode School`,
      en: `{studentSalutation} 👋\n\n⏰ Reminder: You have an interview tomorrow ✨\n\n📅 Date: {date}\n⏰ Time: {time}\n🔗 Meeting Link:\n{meetingLink}\n\nWe're waiting for you! 💻\nCode School`,
    },

    interview_reminder_15min_online_adult: {
      variables: [
        {
          key: "studentSalutation",
          label: "تحية الطالب البالغ",
          example: "عزيزي أحمد",
        },
        {
          key: "meetingLink",
          label: "رابط المقابلة",
          example: "https://meet.google.com/xxx",
        },
      ],
      ar: `{studentSalutation} 👋\n\n⏳ فاضل 15 دقيقة على بداية المقابلة ⏰\n\n🔗 رابط المقابلة:\n{meetingLink}\n\nيلا استعد 👍\nCode School 💻`,
      en: `{studentSalutation} 👋\n\n⏳ 15 minutes until the interview ⏰\n\n🔗 Meeting Link:\n{meetingLink}\n\nGet ready 👍\nCode School 💻`,
    },

    interview_reminder_24h_online_instructor: {
      variables: [
        {
          key: "instructorSalutation",
          label: "تحية المُقابِل",
          example: "عزيزي الأستاذ أحمد",
        },
        { key: "studentName", label: "اسم الطالب", example: "ممدوح" },
        { key: "date", label: "التاريخ", example: "غدًا" },
        { key: "time", label: "الوقت", example: "07:00" },
        {
          key: "meetingLink",
          label: "رابط المقابلة",
          example: "https://meet.google.com/xxx",
        },
      ],
      ar: `{instructorSalutation} 👋\n\n⏰ تذكير: عندك مقابلة شخصية للطالب *{studentName}* بكرة إن شاء الله ✨\n\n📅 التاريخ: {date}\n⏰ الوقت: {time}\n🔗 رابط المقابلة:\n{meetingLink}\n\nبالتوفيق! 💻\nCode School`,
      en: `{instructorSalutation} 👋\n\n⏰ Reminder: You have an interview for *{studentName}* tomorrow ✨\n\n📅 Date: {date}\n⏰ Time: {time}\n🔗 Meeting Link:\n{meetingLink}\n\nGood luck! 💻\nCode School`,
    },

    interview_reminder_15min_online_instructor: {
      variables: [
        {
          key: "instructorSalutation",
          label: "تحية المُقابِل",
          example: "عزيزي الأستاذ أحمد",
        },
        { key: "studentName", label: "اسم الطالب", example: "ممدوح" },
        {
          key: "meetingLink",
          label: "رابط المقابلة",
          example: "https://meet.google.com/xxx",
        },
      ],
      ar: `{instructorSalutation} 👋\n\n⏳ فاضل 15 دقيقة على بداية المقابلة مع *{studentName}* ⏰\n\n🔗 رابط المقابلة:\n{meetingLink}\n\nبالتوفيق! 💻\nCode School`,
      en: `{instructorSalutation} 👋\n\n⏳ 15 minutes until the interview with *{studentName}* ⏰\n\n🔗 Meeting Link:\n{meetingLink}\n\nGood luck! 💻\nCode School`,
    },

    // ═══════════════════════════════════════════════════════════
    // 🎯 INTERVIEW — OFFLINE REMINDERS
    // ═══════════════════════════════════════════════════════════
    interview_reminder_24h_offline_child: {
      variables: [
        { key: "salutation_ar", label: "تحية الطالب", example: "عزيزي ممدوح" },
        {
          key: "salutation_en",
          label: "Student Salutation (EN)",
          example: "Dear Mamdouh",
        },
        { key: "date", label: "التاريخ", example: "غدًا" },
        { key: "time", label: "الوقت", example: "07:00" },
        ...interviewOfflineVars,
      ],
      ar: `{salutation_ar} 👋\n\n⏰ تذكير: عندك مقابلة شخصية بكرة إن شاء الله ✨\n\n📅 التاريخ: {date}\n⏰ الوقت: {time}\n\n📍 المكان: {placeName}\n📌 العنوان: {address}\n🗺️ اللوكيشن:\n{mapsLink}\n\nمستنيينك! 💻\nCode School`,
      en: `{salutation_en} 👋\n\n⏰ Reminder: You have an interview tomorrow ✨\n\n📅 Date: {date}\n⏰ Time: {time}\n\n📍 Location: {placeName}\n📌 Address: {address}\n🗺️ Location:\n{mapsLink}\n\nWe're waiting for you! 💻\nCode School`,
    },

    interview_reminder_30min_offline_child: {
      variables: [
        { key: "salutation_ar", label: "تحية الطالب", example: "عزيزي ممدوح" },
        {
          key: "salutation_en",
          label: "Student Salutation (EN)",
          example: "Dear Mamdouh",
        },
        { key: "placeName", label: "المكان", example: "Code School - المعادي" },
        {
          key: "mapsLink",
          label: "اللوكيشن",
          example: "https://maps.google.com/...",
        },
      ],
      ar: `{salutation_ar} 👋\n\n⏰ فاضل 30 دقيقة على بداية مقابلتك\n\n📍 المكان: {placeName}\n🗺️ {mapsLink}\n\nيلا استعد للنزول 👍\nCode School 💻`,
      en: `{salutation_en} 👋\n\n⏰ 30 minutes until your interview\n\n📍 Location: {placeName}\n🗺️ {mapsLink}\n\nGet ready to head out 👍\nCode School 💻`,
    },

    interview_pre_ping_offline_child: {
      variables: [
        { key: "salutation_ar", label: "تحية الطالب", example: "عزيزي ممدوح" },
        {
          key: "salutation_en",
          label: "Student Salutation (EN)",
          example: "Dear Mamdouh",
        },
      ],
      ar: `{salutation_ar} 👋\n\nبنستعد نبدأ مقابلتك دلوقتي، ياريت نتأكد إنك موجود وجاهز ✨\nCode School 💻`,
      en: `{salutation_en} 👋\n\nWe're about to start your interview now, please make sure you're ready ✨\nCode School 💻`,
    },

    interview_reminder_24h_offline_guardian: {
      variables: [
        {
          key: "guardianSalutation",
          label: "تحية ولي الأمر",
          example: "عزيزي الأستاذ محمد",
        },
        { key: "childTitle", label: "صلة القرابة", example: "ابنك" },
        { key: "studentName", label: "اسم الطالب", example: "ممدوح" },
        { key: "date", label: "التاريخ", example: "غدًا" },
        { key: "time", label: "الوقت", example: "07:00" },
        ...interviewOfflineVars,
      ],
      ar: `{guardianSalutation} 👋\n\n⏰ تذكير: مقابلة {childTitle} *{studentName}* بكرة إن شاء الله ✨\n\n📅 التاريخ: {date}\n⏰ الوقت: {time}\n\n📍 المكان: {placeName}\n📌 العنوان: {address}\n🗺️ اللوكيشن:\n{mapsLink}\n\nياريت تجهز {childTitle} للوصول في الميعاد 🙏\nCode School 💻`,
      en: `{guardianSalutation} 👋\n\n⏰ Reminder: {childTitle} *{studentName}*'s interview is tomorrow ✨\n\n📅 Date: {date}\n⏰ Time: {time}\n\n📍 Location: {placeName}\n📌 Address: {address}\n🗺️ Location:\n{mapsLink}\n\nPlease have {childTitle} arrive on time 🙏\nCode School 💻`,
    },

    interview_reminder_30min_offline_guardian: {
      variables: [
        {
          key: "guardianSalutation",
          label: "تحية ولي الأمر",
          example: "عزيزي الأستاذ محمد",
        },
        { key: "childTitle", label: "صلة القرابة", example: "ابنك" },
        { key: "studentName", label: "اسم الطالب", example: "ممدوح" },
        { key: "placeName", label: "المكان", example: "Code School - المعادي" },
        {
          key: "mapsLink",
          label: "اللوكيشن",
          example: "https://maps.google.com/...",
        },
      ],
      ar: `{guardianSalutation} 👋\n\n🚗 تنبيه: مقابلة {childTitle} *{studentName}* هتبدأ بعد 30 دقيقة\n\n📍 المكان: {placeName}\n🗺️ {mapsLink}\n\nياريت تجهز {childTitle} للنزول في الميعاد 🙏\nCode School 💻`,
      en: `{guardianSalutation} 👋\n\n🚗 Heads-up: {childTitle} *{studentName}*'s interview starts in 30 minutes\n\n📍 Location: {placeName}\n🗺️ {mapsLink}\n\nPlease have {childTitle} head out on time 🙏\nCode School 💻`,
    },

    interview_pre_ping_offline_guardian: {
      variables: [
        {
          key: "guardianSalutation",
          label: "تحية ولي الأمر",
          example: "عزيزي الأستاذ محمد",
        },
        { key: "childTitle", label: "صلة القرابة", example: "ابنك" },
        { key: "studentName", label: "اسم الطالب", example: "ممدوح" },
      ],
      ar: `{guardianSalutation} 👋\n\nبنستعد نبدأ مقابلة {childTitle} *{studentName}* دلوقتي، ياريت نتأكد إنه موجود وجاهز ✨\nCode School 💻`,
      en: `{guardianSalutation} 👋\n\nWe're about to start {childTitle} *{studentName}*'s interview now, please make sure they're ready ✨\nCode School 💻`,
    },

    interview_reminder_24h_offline_adult: {
      variables: [
        {
          key: "studentSalutation",
          label: "تحية الطالب البالغ",
          example: "عزيزي أحمد",
        },
        { key: "date", label: "التاريخ", example: "غدًا" },
        { key: "time", label: "الوقت", example: "07:00" },
        ...interviewOfflineVars,
      ],
      ar: `{studentSalutation} 👋\n\n⏰ تذكير: عندك مقابلة شخصية بكرة إن شاء الله ✨\n\n📅 التاريخ: {date}\n⏰ الوقت: {time}\n\n📍 المكان: {placeName}\n📌 العنوان: {address}\n🗺️ اللوكيشن:\n{mapsLink}\n\nمستنيينك! 💻\nCode School`,
      en: `{studentSalutation} 👋\n\n⏰ Reminder: You have an interview tomorrow ✨\n\n📅 Date: {date}\n⏰ Time: {time}\n\n📍 Location: {placeName}\n📌 Address: {address}\n🗺️ Location:\n{mapsLink}\n\nWe're waiting for you! 💻\nCode School`,
    },

    interview_reminder_30min_offline_adult: {
      variables: [
        {
          key: "studentSalutation",
          label: "تحية الطالب البالغ",
          example: "عزيزي أحمد",
        },
        { key: "placeName", label: "المكان", example: "Code School - المعادي" },
        {
          key: "mapsLink",
          label: "اللوكيشن",
          example: "https://maps.google.com/...",
        },
      ],
      ar: `{studentSalutation} 👋\n\n⏰ فاضل 30 دقيقة على بداية مقابلتك\n\n📍 المكان: {placeName}\n🗺️ {mapsLink}\n\nيلا استعد 👍\nCode School 💻`,
      en: `{studentSalutation} 👋\n\n⏰ 30 minutes until your interview\n\n📍 Location: {placeName}\n🗺️ {mapsLink}\n\nGet ready 👍\nCode School 💻`,
    },

    interview_pre_ping_offline_adult: {
      variables: [
        {
          key: "studentSalutation",
          label: "تحية الطالب البالغ",
          example: "عزيزي أحمد",
        },
      ],
      ar: `{studentSalutation} 👋\n\nبنستعد نبدأ مقابلتك دلوقتي، ياريت نتأكد إنك موجود وجاهز ✨\nCode School 💻`,
      en: `{studentSalutation} 👋\n\nWe're about to start your interview now, please make sure you're ready ✨\nCode School 💻`,
    },

    interview_reminder_24h_offline_instructor: {
      variables: [
        {
          key: "instructorSalutation",
          label: "تحية المُقابِل",
          example: "عزيزي الأستاذ أحمد",
        },
        { key: "studentName", label: "اسم الطالب", example: "ممدوح" },
        { key: "date", label: "التاريخ", example: "غدًا" },
        { key: "time", label: "الوقت", example: "07:00" },
        ...interviewOfflineVars,
      ],
      ar: `{instructorSalutation} 👋\n\n⏰ تذكير: عندك مقابلة *{studentName}* بكرة إن شاء الله ✨\n\n📅 التاريخ: {date}\n⏰ الوقت: {time}\n\n📍 المكان: {placeName}\n📌 العنوان: {address}\n🗺️ اللوكيشن:\n{mapsLink}\n\nبالتوفيق! 💻\nCode School`,
      en: `{instructorSalutation} 👋\n\n⏰ Reminder: You have an interview for *{studentName}* tomorrow ✨\n\n📅 Date: {date}\n⏰ Time: {time}\n\n📍 Location: {placeName}\n📌 Address: {address}\n🗺️ Location:\n{mapsLink}\n\nGood luck! 💻\nCode School`,
    },

    interview_reminder_30min_offline_instructor: {
      variables: [
        {
          key: "instructorSalutation",
          label: "تحية المُقابِل",
          example: "عزيزي الأستاذ أحمد",
        },
        { key: "studentName", label: "اسم الطالب", example: "ممدوح" },
        { key: "placeName", label: "المكان", example: "Code School - المعادي" },
        {
          key: "mapsLink",
          label: "اللوكيشن",
          example: "https://maps.google.com/...",
        },
      ],
      ar: `{instructorSalutation} 👋\n\n⏰ فاضل 30 دقيقة على بداية المقابلة مع *{studentName}*\n\n📍 المكان: {placeName}\n🗺️ {mapsLink}\n\nبالتوفيق! 💻\nCode School`,
      en: `{instructorSalutation} 👋\n\n⏰ 30 minutes until the interview with *{studentName}*\n\n📍 Location: {placeName}\n🗺️ {mapsLink}\n\nGood luck! 💻\nCode School`,
    },

    interview_pre_ping_offline_instructor: {
      variables: [
        {
          key: "instructorSalutation",
          label: "تحية المُقابِل",
          example: "عزيزي الأستاذ أحمد",
        },
        { key: "studentName", label: "اسم الطالب", example: "ممدوح" },
      ],
      ar: `{instructorSalutation} 👋\n\nالمقابلة مع *{studentName}* هتبدأ دلوقتي، ياريت نتأكد إن الطالب موجود وجاهز ✨\nCode School 💻`,
      en: `{instructorSalutation} 👋\n\nThe interview with *{studentName}* is about to start, please make sure the student is present and ready ✨\nCode School 💻`,
    },
  };
}

// تصدير الـ fallbacks للاستخدام خارج الموديل
export { getFallbackTemplates };

export default mongoose.models.MessageTemplate ||
  mongoose.model("MessageTemplate", MessageTemplateSchema);
