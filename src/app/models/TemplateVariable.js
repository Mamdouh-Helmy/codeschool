// src/models/TemplateVariable.js
import mongoose from "mongoose";

/**
 * يخزّن قيم المتغيرات القابلة للتعديل من الـ UI
 * كل متغير بيتخزن مرة واحدة بالعربي والإنجليزي
 *
 * مثال:
 *   key: "salutation_ar"
 *   valueAr: "عزيزي الطالب ممدوح"
 *   valueEn: "عزيزي الطالب ممدوح"   ← نفس القيمة (AR only)
 *
 *   key: "salutation_en"
 *   valueAr: "Dear student Mamdouh"
 *   valueEn: "Dear student Mamdouh"  ← نفس القيمة (EN only)
 *
 *   key: "guardianSalutation"
 *   valueAr: "عزيزي الأستاذ محمد"
 *   valueEn: "Dear Mr. Mohamed"
 */
const TemplateVariableSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      // مثال: "salutation_ar", "guardianSalutation", "childTitle"
    },

    // الاسم المعروض للمستخدم
    labelAr: {
      type: String,
      required: true,
      trim: true,
    },
    labelEn: {
      type: String,
      required: true,
      trim: true,
    },

    // الأيقونة المعروضة في الـ UI
    icon: {
      type: String,
      default: "📝",
    },

    // القيمة الفعلية للمتغير (اللي بتتحط في الرسالة)
    valueAr: {
      type: String,
      required: true,
      default: "",
    },
    valueEn: {
      type: String,
      required: true,
      default: "",
    },

    // تصنيف المتغير — لعرضه في مجموعات
    group: {
      type: String,
      enum: [
        "student",
        "guardian",
        "group",
        "session",
        "attendance",
        "evaluation",
        "common",
      ],
      default: "common",
    },

    // وصف مختصر
    description: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

TemplateVariableSchema.index({ key: 1 }, { unique: true });
TemplateVariableSchema.index({ group: 1 });
TemplateVariableSchema.index({ isActive: 1 });

/**
 * Static: بيجيب كل المتغيرات كـ map جاهز للاستخدام في render
 * بيرجع: { "{key}": "value" }
 */
TemplateVariableSchema.statics.getVarsMap = async function (lang = "ar") {
  const vars = await this.find({ isActive: true }).lean();
  const map = {};
  vars.forEach((v) => {
    map[`{${v.key}}`] = lang === "ar" ? v.valueAr : v.valueEn;
  });
  return map;
};

/**
 * Static: seed المتغيرات الافتراضية لو مش موجودة
 */
TemplateVariableSchema.statics.seedDefaults = async function () {
  const defaults = getDefaultVariables();
  const results = [];

  for (const variable of defaults) {
    const existing = await this.findOne({ key: variable.key });
    if (!existing) {
      const created = await this.create(variable);
      results.push({ key: variable.key, action: "created" });
    } else {
      results.push({ key: variable.key, action: "exists" });
    }
  }

  return results;
};

export default mongoose.models.TemplateVariable ||
  mongoose.model("TemplateVariable", TemplateVariableSchema);

// ─────────────────────────────────────────────────────────────────────────────
// القيم الافتراضية — نفس ALL_VARS في الفرونت إند بس في الداتابيز
// ─────────────────────────────────────────────────────────────────────────────
export function getDefaultVariables() {
  return [
    // ── Student basic ─────────────────────────────────────────
    {
      key: "salutation_ar",
      labelAr: "تحية (عربي)",
      labelEn: "Salutation (AR)",
      icon: "👋",
      valueAr: "عزيزي الطالب ممدوح",
      valueEn: "عزيزي الطالب ممدوح",
      group: "student",
      description: "التحية بالعربي للطالب",
    },
    {
      key: "salutation_en",
      labelAr: "تحية (إنجليزي)",
      labelEn: "Salutation (EN)",
      icon: "👋",
      valueAr: "Dear student Mamdouh",
      valueEn: "Dear student Mamdouh",
      group: "student",
      description: "التحية بالإنجليزي للطالب",
    },
    {
      key: "name_ar",
      labelAr: "الاسم (عربي)",
      labelEn: "Name (AR)",
      icon: "👤",
      valueAr: "ممدوح",
      valueEn: "ممدوح",
      group: "student",
    },
    {
      key: "name_en",
      labelAr: "الاسم (إنجليزي)",
      labelEn: "Name (EN)",
      icon: "👤",
      valueAr: "Mamdouh",
      valueEn: "Mamdouh",
      group: "student",
    },
    {
      key: "fullName",
      labelAr: "الاسم الكامل",
      labelEn: "Full Name",
      icon: "📝",
      valueAr: "ممدوح أحمد",
      valueEn: "Mamdouh Ahmed",
      group: "student",
    },
    {
      key: "you_ar",
      labelAr: "أنت / حضرتك",
      labelEn: "You (AR)",
      icon: "🫵",
      valueAr: "أنت",
      valueEn: "أنت",
      group: "student",
    },
    {
      key: "welcome_ar",
      labelAr: "أهلاً (عربي)",
      labelEn: "Welcome (AR)",
      icon: "🌟",
      valueAr: "أهلاً بك",
      valueEn: "أهلاً بك",
      group: "student",
    },

    // ── Language confirmation ─────────────────────────────────
    {
      key: "selectedLanguage_ar",
      labelAr: "اللغة المختارة (عربي)",
      labelEn: "Selected Language (AR)",
      icon: "🌍",
      valueAr: "العربية",
      valueEn: "الإنجليزية",
      group: "student",
    },
    {
      key: "selectedLanguage_en",
      labelAr: "اللغة المختارة (إنجليزي)",
      labelEn: "Selected Language (EN)",
      icon: "🌍",
      valueAr: "Arabic",
      valueEn: "English",
      group: "student",
    },

    // ── Guardian ──────────────────────────────────────────────
    {
      key: "guardianSalutation_ar",
      labelAr: "تحية ولي الأمر (عربي)",
      labelEn: "Guardian Salutation (AR)",
      icon: "👋",
      valueAr: "عزيزي الأستاذ محمد",
      valueEn: "عزيزي الأستاذ محمد",
      group: "guardian",
    },
    {
      key: "guardianSalutation_en",
      labelAr: "تحية ولي الأمر (إنجليزي)",
      labelEn: "Guardian Salutation (EN)",
      icon: "👋",
      valueAr: "Dear Mr. Mohamed",
      valueEn: "Dear Mr. Mohamed",
      group: "guardian",
    },
    {
      key: "guardianSalutation",
      labelAr: "تحية ولي الأمر",
      labelEn: "Guardian Salutation",
      icon: "👋",
      valueAr: "عزيزي الأستاذ محمد",
      valueEn: "Dear Mr. Mohamed",
      group: "guardian",
    },
    {
      key: "studentSalutation",
      labelAr: "تحية الطالب",
      labelEn: "Student Salutation",
      icon: "👋",
      valueAr: "عزيزي ممدوح",
      valueEn: "Dear Mamdouh",
      group: "guardian",
    },
    {
      key: "studentGender_ar",
      labelAr: "جنس الطالب (عربي)",
      labelEn: "Student Gender (AR)",
      icon: "⚧",
      valueAr: "الابن",
      valueEn: "الابن",
      group: "guardian",
    },
    {
      key: "studentGender_en",
      labelAr: "جنس الطالب (إنجليزي)",
      labelEn: "Student Gender (EN)",
      icon: "⚧",
      valueAr: "son",
      valueEn: "son",
      group: "guardian",
    },
    {
      key: "studentName_ar",
      labelAr: "اسم الطالب (عربي)",
      labelEn: "Student Name (AR)",
      icon: "👤",
      valueAr: "ممدوح",
      valueEn: "ممدوح",
      group: "guardian",
    },
    {
      key: "studentName_en",
      labelAr: "اسم الطالب (إنجليزي)",
      labelEn: "Student Name (EN)",
      icon: "👤",
      valueAr: "Mamdouh",
      valueEn: "Mamdouh",
      group: "guardian",
    },
    {
      key: "studentName",
      labelAr: "اسم الطالب",
      labelEn: "Student Name",
      icon: "👤",
      valueAr: "ممدوح",
      valueEn: "Mamdouh",
      group: "guardian",
    },
    {
      key: "relationship_ar",
      labelAr: "العلاقة (عربي)",
      labelEn: "Relationship (AR)",
      icon: "👨‍👩‍👦",
      valueAr: "الأب",
      valueEn: "الأب",
      group: "guardian",
    },
    {
      key: "fullStudentName",
      labelAr: "الاسم الكامل للطالب",
      labelEn: "Full Student Name",
      icon: "📝",
      valueAr: "ممدوح أحمد علي",
      valueEn: "Mamdouh Ahmed Ali",
      group: "guardian",
    },
    {
      key: "guardianName",
      labelAr: "اسم ولي الأمر",
      labelEn: "Guardian Name",
      icon: "👨",
      valueAr: "محمد",
      valueEn: "Mohamed",
      group: "guardian",
    },
    {
      key: "childTitle",
      labelAr: "ابنك / ابنتك",
      labelEn: "Child Title",
      icon: "👶",
      valueAr: "ابنك",
      valueEn: "your son",
      group: "guardian",
    },
    {
      key: "enrollmentNumber",
      labelAr: "رقم القيد",
      labelEn: "Enrollment Number",
      icon: "🔢",
      valueAr: "STU-2024-001",
      valueEn: "STU-2024-001",
      group: "guardian",
    },

    // ── Group ─────────────────────────────────────────────────
    {
      key: "salutation",
      labelAr: "التحية",
      labelEn: "Salutation",
      icon: "👋",
      valueAr: "عزيزي ممدوح",
      valueEn: "Dear Mamdouh",
      group: "group",
    },
    {
      key: "courseName",
      labelAr: "اسم الكورس",
      labelEn: "Course Name",
      icon: "📚",
      valueAr: "الإنجليزية للمبتدئين",
      valueEn: "English for Beginners",
      group: "group",
    },
    {
      key: "groupName",
      labelAr: "اسم المجموعة",
      labelEn: "Group Name",
      icon: "👥",
      valueAr: "مستوى مبتدئ A1",
      valueEn: "Beginner Level A1",
      group: "group",
    },
    {
      key: "groupCode",
      labelAr: "كود المجموعة",
      labelEn: "Group Code",
      icon: "🔤",
      valueAr: "GRP-001",
      valueEn: "GRP-001",
      group: "group",
    },
    {
      key: "startDate",
      labelAr: "تاريخ البدء",
      labelEn: "Start Date",
      icon: "📅",
      valueAr: "الاثنين 15 مايو 2024",
      valueEn: "Monday, May 15, 2024",
      group: "group",
    },
    {
      key: "timeTo",
      labelAr: "وقت النهاية",
      labelEn: "End Time",
      icon: "⏰",
      valueAr: "08:30 مساءً",
      valueEn: "08:30 PM",
      group: "group",
    },
    {
      key: "timeFrom",
      labelAr: "وقت البداية",
      labelEn: "Start Time",
      icon: "⏰",
      valueAr: "07:00 مساءً",
      valueEn: "07:00 PM",
      group: "group",
    },
    {
      key: "instructor",
      labelAr: "اسم المدرب",
      labelEn: "Instructor",
      icon: "👨‍🏫",
      valueAr: "أستاذ أحمد",
      valueEn: "Mr. Ahmed",
      group: "group",
    },
    {
      key: "instructorName",
      labelAr: "اسم المدرب (مختصر)",
      labelEn: "Instructor Name",
      icon: "👨‍🏫",
      valueAr: "أحمد",
      valueEn: "Ahmed",
      group: "group",
    },
    {
      key: "firstMeetingLink",
      labelAr: "رابط أول جلسة",
      labelEn: "First Meeting Link",
      icon: "🔗",
      valueAr: "https://meet.google.com/abc-xyz",
      valueEn: "https://meet.google.com/abc-xyz",
      group: "group",
    },
    {
      key: "studentCount",
      labelAr: "عدد الطلاب",
      labelEn: "Student Count",
      icon: "👥",
      valueAr: "8",
      valueEn: "8",
      group: "group",
    },

    // ── Session ───────────────────────────────────────────────
    {
      key: "sessionName",
      labelAr: "اسم الحصة",
      labelEn: "Session Name",
      icon: "📘",
      valueAr: "الدرس الأول: التعارف",
      valueEn: "Lesson 1: Introduction",
      group: "session",
    },
    {
      key: "date",
      labelAr: "التاريخ",
      labelEn: "Date",
      icon: "📅",
      valueAr: "الثلاثاء 20 مايو 2024",
      valueEn: "Tuesday, May 20, 2024",
      group: "session",
    },
    {
      key: "time",
      labelAr: "الوقت",
      labelEn: "Time",
      icon: "⏰",
      valueAr: "07:00 - 08:30 مساءً",
      valueEn: "07:00 - 08:30 PM",
      group: "session",
    },
    {
      key: "meetingLink",
      labelAr: "رابط الحصة",
      labelEn: "Meeting Link",
      icon: "🔗",
      valueAr: "https://meet.google.com/abc-xyz",
      valueEn: "https://meet.google.com/abc-xyz",
      group: "session",
    },
    {
      key: "newDate",
      labelAr: "التاريخ الجديد",
      labelEn: "New Date",
      icon: "📅",
      valueAr: "الخميس 22 مايو 2024",
      valueEn: "Thursday, May 22, 2024",
      group: "session",
    },
    {
      key: "newTime",
      labelAr: "الوقت الجديد",
      labelEn: "New Time",
      icon: "⏰",
      valueAr: "08:00 - 09:30 مساءً",
      valueEn: "08:00 - 09:30 PM",
      group: "session",
    },

    // ── Attendance ────────────────────────────────────────────
    {
      key: "status",
      labelAr: "الحالة",
      labelEn: "Status",
      icon: "📌",
      valueAr: "غائب",
      valueEn: "Absent",
      group: "attendance",
    },

    // ── Evaluation ────────────────────────────────────────────
    {
      key: "sessionDate",
      labelAr: "تاريخ الجلسة",
      labelEn: "Session Date",
      icon: "📆",
      valueAr: "30/12/2025",
      valueEn: "12/30/2025",
      group: "evaluation",
    },
    {
      key: "sessionNumber",
      labelAr: "رقم الحصة",
      labelEn: "Session Number",
      icon: "📑",
      valueAr: "1",
      valueEn: "1",
      group: "evaluation",
    },
    {
      key: "attendanceStatus",
      labelAr: "الحضور",
      labelEn: "Attendance Status",
      icon: "👥",
      valueAr: "حاضر",
      valueEn: "Present",
      group: "evaluation",
    },
    {
      key: "starsCommitment",
      labelAr: "نجوم الالتزام والتركيز",
      labelEn: "Stars: Commitment",
      icon: "⭐",
      valueAr: "⭐⭐⭐⭐⭐",
      valueEn: "⭐⭐⭐⭐⭐",
      group: "evaluation",
    },
    {
      key: "starsUnderstanding",
      labelAr: "نجوم مستوى الاستيعاب",
      labelEn: "Stars: Understanding",
      icon: "⭐",
      valueAr: "⭐⭐⭐⭐",
      valueEn: "⭐⭐⭐⭐",
      group: "evaluation",
    },
    {
      key: "starsTaskExecution",
      labelAr: "نجوم تنفيذ المهام",
      labelEn: "Stars: Task Execution",
      icon: "⭐",
      valueAr: "⭐⭐⭐⭐",
      valueEn: "⭐⭐⭐⭐",
      group: "evaluation",
    },
    {
      key: "starsParticipation",
      labelAr: "نجوم المشاركة داخل الحصة",
      labelEn: "Stars: Participation",
      icon: "⭐",
      valueAr: "⭐⭐⭐⭐",
      valueEn: "⭐⭐⭐⭐",
      group: "evaluation",
    },
    {
      key: "instructorComment",
      labelAr: "تعليق المدرس",
      labelEn: "Instructor Comment",
      icon: "📝",
      valueAr: "أداء ممتاز، استمر هكذا!",
      valueEn: "Excellent performance, keep it up!",
      group: "evaluation",
    },
    {
      key: "completedSessions",
      labelAr: "عدد الحصص المنتهية",
      labelEn: "Completed Sessions",
      icon: "🔢",
      valueAr: "2",
      valueEn: "2",
      group: "evaluation",
    },
    {
      key: "recordingLink",
      labelAr: "رابط التسجيل",
      labelEn: "Recording Link",
      icon: "🎥",
      valueAr: "🎥 رابط التسجيل: https://drive.google.com/xxx",
      valueEn: "🎥 Recording: https://drive.google.com/xxx",
      group: "evaluation",
    },

    // ── Common ────────────────────────────────────────────────
    {
      key: "feedbackLink",
      labelAr: "رابط التقييم",
      labelEn: "Feedback Link",
      icon: "⭐",
      valueAr: "https://forms.gle/xyz123",
      valueEn: "https://forms.gle/xyz123",
      group: "common",
    },
    {
      key: "decision",
      labelAr: "نتيجة التقييم",
      labelEn: "Evaluation Decision",
      icon: "🏆",
      valueAr: "ممتاز",
      valueEn: "Excellent",
      group: "evaluation",
    },
  ];
}