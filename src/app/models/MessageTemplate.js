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
        "session_recording",   // ✅ تم الإضافة
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
    studentSalutation:  language === "ar" ? "عزيزي أحمد"              : "Dear Ahmed",
    guardianSalutation: language === "ar" ? "عزيزي الأستاذ محمد"      : "Dear Mr. Mohamed",
    childTitle:         language === "ar" ? "ابنك"                     : "your son",
    studentName:        language === "ar" ? "أحمد"                     : "Ahmed",
    guardianName:       language === "ar" ? "محمد"                     : "Mohamed",
    sessionName:        language === "ar" ? "الجلسة الأولى"            : "Session 1",
    date:               language === "ar" ? "الاثنين ١ يناير ٢٠٢٥"   : "Monday, January 1, 2025",
    time:               "5:00 PM - 7:00 PM",
    meetingLink:        "https://meet.google.com/xxx",
    groupName:          language === "ar" ? "المجموعة أ"               : "Group A",
    groupCode:          "GRP-001",
    courseName:         language === "ar" ? "برمجة بايثون"             : "Python Programming",
    status:             language === "ar" ? "غائب"                     : "absent",
    enrollmentNumber:   "STU001",
    recordingLink:      "https://drive.google.com/xxx",
    decision:           language === "ar" ? "ممتاز"                    : "Excellent",
  };
  return this.render(examples, language);
};

// ─── Static: getOrFallback ────────────────────────────────────────────────────
// لو مفيش template في الداتابيز يرجع الـ default hardcoded
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
// يُستخدم لما مفيش record في الداتابيز
function getFallbackTemplates() {
  return {

    // ── evaluation_pass ──────────────────────────────────────────────────────
    evaluation_pass: {
      variables: [
        { key: "guardianSalutation", label: "تحية ولي الأمر",   example: "عزيزي الأستاذ محمد" },
        { key: "childTitle",         label: "صلة القرابة",      example: "ابنك" },
        { key: "studentName",        label: "اسم الطالب",       example: "أحمد" },
        { key: "sessionName",        label: "اسم الجلسة",       example: "الجلسة الأولى" },
        { key: "recordingLink",      label: "رابط التسجيل",     example: "🎥 رابط التسجيل: https://..." },
      ],
      ar: `{guardianSalutation}،

نود مشاركتكم ملخص أداء {childTitle} *{studentName}* 📊

✅ *الأداء العام: ممتاز*

{studentName} أبدى فهماً ممتازاً للمحتوى والتزاماً ملحوظاً خلال جلسة "{sessionName}". نحن فخورون بتقدمه!

{recordingLink}

للاستفسار أو المتابعة لا تترددوا في التواصل.
فريق Code School 💻`,
      en: `{guardianSalutation},

We'd like to share a performance summary for {childTitle} *{studentName}* 📊

✅ *Overall Performance: Excellent*

{studentName} demonstrated excellent understanding and notable commitment during "{sessionName}". We're proud of their progress!

{recordingLink}

Feel free to contact us for any questions.
Code School Team 💻`,
    },

    // ── evaluation_review ────────────────────────────────────────────────────
    evaluation_review: {
      variables: [
        { key: "guardianSalutation", label: "تحية ولي الأمر",   example: "عزيزي الأستاذ محمد" },
        { key: "childTitle",         label: "صلة القرابة",      example: "ابنك" },
        { key: "studentName",        label: "اسم الطالب",       example: "أحمد" },
        { key: "sessionName",        label: "اسم الجلسة",       example: "الجلسة الأولى" },
        { key: "recordingLink",      label: "رابط التسجيل",     example: "🎥 رابط التسجيل: https://..." },
      ],
      ar: `{guardianSalutation}،

نود مشاركتكم ملخص أداء {childTitle} *{studentName}* 📊

⚠️ *الأداء العام: يحتاج مراجعة*

{studentName} أظهر بعض النقاط التي تحتاج مراجعة وتعزيز خلال جلسة "{sessionName}". ننصح بمراجعة مواد الجلسة ومتابعة التدريبات المنزلية.

{recordingLink}

نحن هنا لدعم {studentName} في أي وقت.
فريق Code School 💻`,
      en: `{guardianSalutation},

We'd like to share a performance summary for {childTitle} *{studentName}* 📊

⚠️ *Overall Performance: Needs Review*

{studentName} showed some areas that need reinforcement during "{sessionName}". We recommend reviewing session materials and practicing at home.

{recordingLink}

We're here to support {studentName} anytime.
Code School Team 💻`,
    },

    // ── evaluation_repeat ────────────────────────────────────────────────────
    evaluation_repeat: {
      variables: [
        { key: "guardianSalutation", label: "تحية ولي الأمر",   example: "عزيزي الأستاذ محمد" },
        { key: "childTitle",         label: "صلة القرابة",      example: "ابنك" },
        { key: "studentName",        label: "اسم الطالب",       example: "أحمد" },
        { key: "sessionName",        label: "اسم الجلسة",       example: "الجلسة الأولى" },
        { key: "recordingLink",      label: "رابط التسجيل",     example: "🎥 رابط التسجيل: https://..." },
      ],
      ar: `{guardianSalutation}،

نود مشاركتكم ملخص أداء {childTitle} *{studentName}* 📊

🔄 *الأداء العام: يحتاج دعم إضافي*

بعد متابعة أداء {studentName} في جلسة "{sessionName}"، نرى أن الاستفادة القصوى تتطلب مزيداً من الوقت والتدريب على هذا المحتوى.

{recordingLink}

نقترح مراجعة مواد الجلسة مرة أخرى. يرجى التواصل معنا لمناقشة أفضل الخطوات القادمة.
فريق Code School 💻`,
      en: `{guardianSalutation},

We'd like to share a performance summary for {childTitle} *{studentName}* 📊

🔄 *Overall Performance: Needs Additional Support*

After monitoring {studentName}'s performance during "{sessionName}", we believe maximum benefit requires more time and practice on this content.

{recordingLink}

Please contact us to discuss the best next steps.
Code School Team 💻`,
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
      ar: `{guardianSalutation}،

🎥 رابط تسجيل جلسة "{sessionName}" لـ{childTitle} *{studentName}*:

{recordingLink}

يمكن مراجعة التسجيل في أي وقت للمذاكرة والمراجعة.
فريق Code School 💻`,
      en: `{guardianSalutation},

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