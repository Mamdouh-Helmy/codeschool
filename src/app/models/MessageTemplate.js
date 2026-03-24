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
        "reminder_1h_student",
        "reminder_1h_guardian",
        "group_completion_student",
        "group_completion_guardian",
        "evaluation_pass",
        "evaluation_review",
        "evaluation_repeat",
        "session_recording",
      ],
    },

    recipientType: {
      type: String,
      enum: ["student", "guardian"],
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
MessageTemplateSchema.pre("save", async function (next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      {
        templateType:  this.templateType,
        recipientType: this.recipientType,
        isDefault: true,
        _id: { $ne: this._id },
      },
      { $set: { isDefault: false } },
    );
  }
  next();
});

// ─── Methods ──────────────────────────────────────────────────────────────────
MessageTemplateSchema.methods.getContent = function (language = "ar") {
  return language === "ar" ? this.contentAr : this.contentEn;
};

MessageTemplateSchema.methods.render = function (variables = {}, language = "ar") {
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
    guardianSalutation:  language === "ar" ? "عزيزي الأستاذ محمد"     : "Dear Mr. Mohamed",
    childTitle:          language === "ar" ? "ابنك"                    : "your son",
    studentName:         language === "ar" ? "أحمد"                    : "Ahmed",
    guardianName:        language === "ar" ? "محمد"                    : "Mohamed",
    sessionName:         language === "ar" ? "الجلسة الأولى"           : "Session 1",
    sessionDate:         language === "ar" ? "30/12/2025"              : "12/30/2025",
    sessionNumber:       "1",
    attendanceStatus:    language === "ar" ? "حاضر"                    : "Present",
    starsCommitment:     "⭐⭐⭐⭐⭐",
    starsUnderstanding:  "⭐⭐⭐⭐",
    starsTaskExecution:  "⭐⭐⭐⭐",
    starsParticipation:  "⭐⭐⭐⭐",
    instructorComment:   language === "ar" ? "أداء ممتاز، استمر هكذا!" : "Excellent performance, keep it up!",
    completedSessions:   "2",
    date:                language === "ar" ? "30/12/2025"              : "12/30/2025",
    time:                "5:00 PM - 7:00 PM",
    meetingLink:         "https://meet.google.com/xxx",
    groupName:           language === "ar" ? "المجموعة أ"              : "Group A",
    groupCode:           "GRP-001",
    courseName:          language === "ar" ? "برمجة بايثون"            : "Python Programming",
    enrollmentNumber:    "STU001",
    recordingLink:       "🎥 رابط التسجيل: https://drive.google.com/xxx",
    decision:            language === "ar" ? "ممتاز"                   : "Excellent",
  };
  return this.render(examples, language);
};

// ─── Static: getOrFallback ────────────────────────────────────────────────────
MessageTemplateSchema.statics.getOrFallback = async function (templateType, language = "ar") {
  const doc = await this.findOne({ templateType, isDefault: true, isActive: true }).lean();
  if (doc) {
    return {
      content:    language === "ar" ? doc.contentAr : doc.contentEn,
      isFallback: false,
      variables:  doc.variables || [],
    };
  }

  const fallbacks = getFallbackTemplates();
  const fb = fallbacks[templateType];
  if (!fb) return { content: "", isFallback: true, variables: [] };

  return {
    content:    language === "ar" ? fb.ar : fb.en,
    isFallback: true,
    variables:  fb.variables || [],
  };
};

// ─── Fallback hardcoded templates ────────────────────────────────────────────
function getFallbackTemplates() {

  // ── المتغيرات المشتركة بين templates التقييم الثلاثة ──────────────────────
  const evalVariables = [
    { key: "guardianSalutation",  label: "تحية ولي الأمر",          example: "عزيزي الأستاذ محمد" },
    { key: "childTitle",          label: "صلة القرابة",             example: "ابنك" },
    { key: "studentName",         label: "اسم الطالب",              example: "أحمد" },
    { key: "sessionDate",         label: "تاريخ الجلسة",            example: "30/12/2025" },
    { key: "sessionNumber",       label: "رقم الجلسة",              example: "1" },
    { key: "attendanceStatus",    label: "حالة الحضور",             example: "حاضر" },
    { key: "starsCommitment",     label: "نجوم الالتزام والتركيز",  example: "⭐⭐⭐⭐⭐" },
    { key: "starsUnderstanding",  label: "نجوم مستوى الاستيعاب",   example: "⭐⭐⭐⭐" },
    { key: "starsTaskExecution",  label: "نجوم تنفيذ المهام",       example: "⭐⭐⭐⭐" },
    { key: "starsParticipation",  label: "نجوم المشاركة",           example: "⭐⭐⭐⭐" },
    { key: "instructorComment",   label: "تعليق المدرس",            example: "أداء ممتاز، استمر هكذا!" },
    { key: "completedSessions",   label: "عدد الحصص المنتهية",      example: "2" },
    { key: "recordingLink",       label: "رابط التسجيل",            example: "🎥 رابط التسجيل: https://..." },
  ];

  return {

    // ── evaluation_pass ──────────────────────────────────────────────────────
    evaluation_pass: {
      variables: evalVariables,
      ar:
`{guardianSalutation}،

تقرير الحصة 📃✨
📆 التاريخ : {sessionDate}
📑 رقم الحصة : {sessionNumber}
⏱️ مدة الحصة : ساعتين
👥 الحضور : {attendanceStatus}
📊 تقييم الأداء :
⭐ الالتزام والتركيز : {starsCommitment}
⭐ مستوى الاستيعاب : {starsUnderstanding}
⭐ تنفيذ المهام : {starsTaskExecution}
⭐ المشاركة داخل الحصة : {starsParticipation}
📝 تعليق المدرس :
{instructorComment}
🔢 عدد الحصص المنتهية : {completedSessions}
{recordingLink}
🙏 نشكركم على ثقتكم في Code School
📞 للتواصل : +2 011 40 474 129`,
      en:
`{guardianSalutation},

Session Report 📃✨
📆 Date : {sessionDate}
📑 Session No. : {sessionNumber}
⏱️ Duration : 2 hours
👥 Attendance : {attendanceStatus}
📊 Performance Evaluation :
⭐ Commitment & Focus : {starsCommitment}
⭐ Understanding Level : {starsUnderstanding}
⭐ Task Execution : {starsTaskExecution}
⭐ Class Participation : {starsParticipation}
📝 Instructor's Comment :
{instructorComment}
🔢 Sessions Completed : {completedSessions}
{recordingLink}
🙏 Thank you for trusting Code School
📞 Contact : +2 011 40 474 129`,
    },

    // ── evaluation_review ────────────────────────────────────────────────────
    evaluation_review: {
      variables: evalVariables,
      ar:
`{guardianSalutation}،

تقرير الحصة 📃✨
📆 التاريخ : {sessionDate}
📑 رقم الحصة : {sessionNumber}
⏱️ مدة الحصة : ساعتين
👥 الحضور : {attendanceStatus}
📊 تقييم الأداء :
⭐ الالتزام والتركيز : {starsCommitment}
⭐ مستوى الاستيعاب : {starsUnderstanding}
⭐ تنفيذ المهام : {starsTaskExecution}
⭐ المشاركة داخل الحصة : {starsParticipation}
📝 تعليق المدرس :
{instructorComment}
🔢 عدد الحصص المنتهية : {completedSessions}
{recordingLink}
🙏 نشكركم على ثقتكم في Code School
📞 للتواصل : +2 011 40 474 129`,
      en:
`{guardianSalutation},

Session Report 📃✨
📆 Date : {sessionDate}
📑 Session No. : {sessionNumber}
⏱️ Duration : 2 hours
👥 Attendance : {attendanceStatus}
📊 Performance Evaluation :
⭐ Commitment & Focus : {starsCommitment}
⭐ Understanding Level : {starsUnderstanding}
⭐ Task Execution : {starsTaskExecution}
⭐ Class Participation : {starsParticipation}
📝 Instructor's Comment :
{instructorComment}
🔢 Sessions Completed : {completedSessions}
{recordingLink}
🙏 Thank you for trusting Code School
📞 Contact : +2 011 40 474 129`,
    },

    // ── evaluation_repeat ────────────────────────────────────────────────────
    evaluation_repeat: {
      variables: evalVariables,
      ar:
`{guardianSalutation}،

تقرير الحصة 📃✨
📆 التاريخ : {sessionDate}
📑 رقم الحصة : {sessionNumber}
⏱️ مدة الحصة : ساعتين
👥 الحضور : {attendanceStatus}
📊 تقييم الأداء :
⭐ الالتزام والتركيز : {starsCommitment}
⭐ مستوى الاستيعاب : {starsUnderstanding}
⭐ تنفيذ المهام : {starsTaskExecution}
⭐ المشاركة داخل الحصة : {starsParticipation}
📝 تعليق المدرس :
{instructorComment}
🔢 عدد الحصص المنتهية : {completedSessions}
{recordingLink}
🙏 نشكركم على ثقتكم في Code School
📞 للتواصل : +2 011 40 474 129`,
      en:
`{guardianSalutation},

Session Report 📃✨
📆 Date : {sessionDate}
📑 Session No. : {sessionNumber}
⏱️ Duration : 2 hours
👥 Attendance : {attendanceStatus}
📊 Performance Evaluation :
⭐ Commitment & Focus : {starsCommitment}
⭐ Understanding Level : {starsUnderstanding}
⭐ Task Execution : {starsTaskExecution}
⭐ Class Participation : {starsParticipation}
📝 Instructor's Comment :
{instructorComment}
🔢 Sessions Completed : {completedSessions}
{recordingLink}
🙏 Thank you for trusting Code School
📞 Contact : +2 011 40 474 129`,
    },

    // ── session_recording ────────────────────────────────────────────────────
    session_recording: {
      variables: [
        { key: "guardianSalutation", label: "تحية ولي الأمر",   example: "عزيزي الأستاذ محمد" },
        { key: "childTitle",         label: "صلة القرابة",      example: "ابنك" },
        { key: "studentName",        label: "اسم الطالب",       example: "أحمد" },
        { key: "sessionName",        label: "اسم الجلسة",       example: "الجلسة الأولى" },
        { key: "recordingLink",      label: "رابط التسجيل",     example: "https://drive.google.com/xxx" },
      ],
      ar:
`{guardianSalutation}،

🎥 رابط تسجيل جلسة "{sessionName}" لـ{childTitle} *{studentName}*:

{recordingLink}

يمكن مراجعة التسجيل في أي وقت للمذاكرة والمراجعة.
فريق Code School 💻`,
      en:
`{guardianSalutation},

🎥 Recording for "{sessionName}" — {childTitle} *{studentName}*:

{recordingLink}

The recording can be reviewed anytime for study and revision.
Code School Team 💻`,
    },

  };
}

// تصدير الـ fallbacks للاستخدام خارج الموديل
export { getFallbackTemplates };

export default mongoose.models.MessageTemplate ||
  mongoose.model("MessageTemplate", MessageTemplateSchema);