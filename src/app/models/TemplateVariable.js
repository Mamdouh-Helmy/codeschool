// src/models/TemplateVariable.js
import mongoose from "mongoose";

/**
 * يخزّن قيم المتغيرات القابلة للتعديل من الـ UI
 * كل متغير بيتخزن مرة واحدة بالعربي والإنجليزي
 * مع دعم الجنس: male/female للطالب والمدرب، father/mother لولي الأمر
 */
const TemplateVariableSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    labelAr: { type: String, required: true, trim: true },
    labelEn: { type: String, required: true, trim: true },

    icon: { type: String, default: "📝" },

    // ── القيم الافتراضية (للمعاينة) ──────────────────────────
    valueAr: { type: String, required: true, default: "" },
    valueEn: { type: String, required: true, default: "" },

    // ── قيم الجنس للطالب (ذكر / أنثى) ──────────────────────
    valueMaleAr: { type: String, default: "" },
    valueMaleEn: { type: String, default: "" },
    valueFemaleAr: { type: String, default: "" },
    valueFemaleEn: { type: String, default: "" },

    // ── قيم ولي الأمر (أب / أم) ──────────────────────────────
    valueFatherAr: { type: String, default: "" },
    valueFatherEn: { type: String, default: "" },
    valueMotherAr: { type: String, default: "" },
    valueMotherEn: { type: String, default: "" },

    // هل يدعم هذا المتغير التمييز بالجنس؟
    hasGender: { type: Boolean, default: false },
    // نوع الجنس: "student" | "guardian" | "instructor"
    genderType: {
      type: String,
      enum: ["student", "guardian", "instructor", null],
      default: null,
    },

    group: {
      type: String,
      enum: [
        "student",
        "guardian",
        "instructor",
        "group",
        "session",
        "attendance",
        "reminder",
        "completion",
        "evaluation",
        "common",
      ],
      default: "common",
    },

    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

TemplateVariableSchema.index({ key: 1 }, { unique: true });
TemplateVariableSchema.index({ group: 1 });
TemplateVariableSchema.index({ isActive: 1 });

/**
 * Static: بيجيب كل المتغيرات كـ map جاهز للاستخدام في render
 * @param {string} lang - "ar" | "en"
 * @param {object} genderContext - { studentGender: "male"|"female", guardianType: "father"|"mother", instructorGender: "male"|"female" }
 */
TemplateVariableSchema.statics.getVarsMap = async function (
  lang = "ar",
  genderContext = {},
) {
  const vars = await this.find({ isActive: true }).lean();
  const {
    studentGender = "male",
    guardianType = "father",
    instructorGender = "male",
  } = genderContext;

  const map = {};
  vars.forEach((v) => {
    let val;
    if (v.hasGender) {
      if (v.genderType === "student") {
        val =
          lang === "ar"
            ? (studentGender === "male" ? v.valueMaleAr : v.valueFemaleAr) ||
              v.valueAr
            : (studentGender === "male" ? v.valueMaleEn : v.valueFemaleEn) ||
              v.valueEn;
      } else if (v.genderType === "guardian") {
        val =
          lang === "ar"
            ? (guardianType === "father" ? v.valueFatherAr : v.valueMotherAr) ||
              v.valueAr
            : (guardianType === "father" ? v.valueFatherEn : v.valueMotherEn) ||
              v.valueEn;
      } else if (v.genderType === "instructor") {
        val =
          lang === "ar"
            ? (instructorGender === "male" ? v.valueMaleAr : v.valueFemaleAr) ||
              v.valueAr
            : (instructorGender === "male" ? v.valueMaleEn : v.valueFemaleEn) ||
              v.valueEn;
      } else {
        val = lang === "ar" ? v.valueAr : v.valueEn;
      }
    } else {
      val = lang === "ar" ? v.valueAr : v.valueEn;
    }
    map[`{${v.key}}`] = val || "";
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
      await this.create(variable);
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
// القيم الافتراضية الكاملة — مع دعم الجنس
// ─────────────────────────────────────────────────────────────────────────────
export function getDefaultVariables() {
  return [
    // ══════════════════════════════════════════════════════════
    // STUDENT — الطالب (مع ذكر / أنثى)
    // ══════════════════════════════════════════════════════════
    {
      key: "supervisorName",
      labelAr: "اسم المشرف الأكاديمي",
      labelEn: "Learning Supervisor Name",
      icon: "👨‍🏫",
      valueAr: "أحمد علي",
      valueEn: "Ahmed Ali",
      valueMaleAr: "أحمد علي",
      valueMaleEn: "Ahmed Ali",
      valueFemaleAr: "نورا محمد",
      valueFemaleEn: "Nora Mohamed",
      hasGender: true,
      genderType: "instructor",
      group: "instructor",
    },
    {
      key: "moduleTitle",
      labelAr: "عنوان الموديول",
      labelEn: "Module Title",
      icon: "📚",
      valueAr: "Mobile App Development",
      valueEn: "Mobile App Development",
      hasGender: false,
      group: "session",
    },
    {
      key: "salutation_ar",
      labelAr: "تحية الطالب (عربي)",
      labelEn: "Student Salutation (AR)",
      icon: "👋",
      valueAr: "عزيزي الطالب ممدوح",
      valueEn: "عزيزي الطالب ممدوح",
      valueMaleAr: "عزيزي الطالب ممدوح",
      valueMaleEn: "عزيزي الطالب ممدوح",
      valueFemaleAr: "عزيزتي الطالبة سارة",
      valueFemaleEn: "عزيزتي الطالبة سارة",
      hasGender: true,
      genderType: "student",
      group: "student",
    },
    {
      key: "salutation_en",
      labelAr: "تحية الطالب (إنجليزي)",
      labelEn: "Student Salutation (EN)",
      icon: "👋",
      valueAr: "Dear student Mamdouh",
      valueEn: "Dear student Mamdouh",
      valueMaleAr: "Dear student Mamdouh",
      valueMaleEn: "Dear student Mamdouh",
      valueFemaleAr: "Dear student Sara",
      valueFemaleEn: "Dear student Sara",
      hasGender: true,
      genderType: "student",
      group: "student",
    },
    {
      key: "name_ar",
      labelAr: "اسم الطالب (عربي)",
      labelEn: "Name (AR)",
      icon: "👤",
      valueAr: "ممدوح",
      valueEn: "ممدوح",
      valueMaleAr: "ممدوح",
      valueMaleEn: "ممدوح",
      valueFemaleAr: "سارة",
      valueFemaleEn: "سارة",
      hasGender: true,
      genderType: "student",
      group: "student",
    },
    {
      key: "name_en",
      labelAr: "اسم الطالب (إنجليزي)",
      labelEn: "Name (EN)",
      icon: "👤",
      valueAr: "Mamdouh",
      valueEn: "Mamdouh",
      valueMaleAr: "Mamdouh",
      valueMaleEn: "Mamdouh",
      valueFemaleAr: "Sara",
      valueFemaleEn: "Sara",
      hasGender: true,
      genderType: "student",
      group: "student",
    },
    {
      key: "fullName",
      labelAr: "الاسم الكامل للطالب",
      labelEn: "Full Name",
      icon: "📝",
      valueAr: "ممدوح أحمد",
      valueEn: "Mamdouh Ahmed",
      valueMaleAr: "ممدوح أحمد",
      valueMaleEn: "Mamdouh Ahmed",
      valueFemaleAr: "سارة محمد",
      valueFemaleEn: "Sara Mohamed",
      hasGender: true,
      genderType: "student",
      group: "student",
    },
    {
      key: "you_ar",
      labelAr: "أنت / أنتِ",
      labelEn: "You (AR)",
      icon: "🫵",
      valueAr: "أنت",
      valueEn: "أنت",
      valueMaleAr: "أنت",
      valueMaleEn: "أنت",
      valueFemaleAr: "أنتِ",
      valueFemaleEn: "أنتِ",
      hasGender: true,
      genderType: "student",
      group: "student",
    },
    {
      key: "welcome_ar",
      labelAr: "أهلاً (عربي)",
      labelEn: "Welcome (AR)",
      icon: "🌟",
      valueAr: "أهلاً بك",
      valueEn: "أهلاً بك",
      valueMaleAr: "أهلاً بك",
      valueMaleEn: "أهلاً بك",
      valueFemaleAr: "أهلاً بكِ",
      valueFemaleEn: "أهلاً بكِ",
      hasGender: true,
      genderType: "student",
      group: "student",
    },
    {
      key: "selectedLanguage_ar",
      labelAr: "اللغة المختارة (عربي)",
      labelEn: "Selected Language (AR)",
      icon: "🌍",
      valueAr: "العربية",
      valueEn: "الإنجليزية",
      hasGender: false,
      group: "student",
    },
    {
      key: "selectedLanguage_en",
      labelAr: "اللغة المختارة (إنجليزي)",
      labelEn: "Selected Language (EN)",
      icon: "🌍",
      valueAr: "Arabic",
      valueEn: "English",
      hasGender: false,
      group: "student",
    },
    {
      key: "studentSalutation",
      labelAr: "تحية الطالب (في رسائل ولي الأمر)",
      labelEn: "Student Salutation (in guardian msgs)",
      icon: "👋",
      valueAr: "عزيزي ممدوح",
      valueEn: "Dear Mamdouh",
      valueMaleAr: "عزيزي ممدوح",
      valueMaleEn: "Dear Mamdouh",
      valueFemaleAr: "عزيزتي سارة",
      valueFemaleEn: "Dear Sara",
      hasGender: true,
      genderType: "student",
      group: "guardian",
    },

    // ══════════════════════════════════════════════════════════
    // GUARDIAN — ولي الأمر (أب / أم)
    // ══════════════════════════════════════════════════════════
    {
      key: "guardianSalutation_ar",
      labelAr: "تحية ولي الأمر (عربي)",
      labelEn: "Guardian Salutation (AR)",
      icon: "👋",
      valueAr: "عزيزي الأستاذ محمد",
      valueEn: "عزيزي الأستاذ محمد",
      valueFatherAr: "عزيزي الأستاذ محمد",
      valueFatherEn: "عزيزي الأستاذ محمد",
      valueMotherAr: "عزيزتي السيدة فاطمة",
      valueMotherEn: "عزيزتي السيدة فاطمة",
      hasGender: true,
      genderType: "guardian",
      group: "guardian",
    },
    {
      key: "guardianSalutation_en",
      labelAr: "تحية ولي الأمر (إنجليزي)",
      labelEn: "Guardian Salutation (EN)",
      icon: "👋",
      valueAr: "Dear Mr. Mohamed",
      valueEn: "Dear Mr. Mohamed",
      valueFatherAr: "Dear Mr. Mohamed",
      valueFatherEn: "Dear Mr. Mohamed",
      valueMotherAr: "Dear Mrs. Fatima",
      valueMotherEn: "Dear Mrs. Fatima",
      hasGender: true,
      genderType: "guardian",
      group: "guardian",
    },
    {
      key: "guardianSalutation",
      labelAr: "تحية ولي الأمر",
      labelEn: "Guardian Salutation",
      icon: "👋",
      valueAr: "عزيزي الأستاذ محمد",
      valueEn: "Dear Mr. Mohamed",
      valueFatherAr: "عزيزي الأستاذ محمد",
      valueFatherEn: "Dear Mr. Mohamed",
      valueMotherAr: "عزيزتي السيدة فاطمة",
      valueMotherEn: "Dear Mrs. Fatima",
      hasGender: true,
      genderType: "guardian",
      group: "guardian",
    },
    {
      key: "guardianName",
      labelAr: "اسم ولي الأمر",
      labelEn: "Guardian Name",
      icon: "👨",
      valueAr: "محمد",
      valueEn: "Mohamed",
      valueFatherAr: "محمد",
      valueFatherEn: "Mohamed",
      valueMotherAr: "فاطمة",
      valueMotherEn: "Fatima",
      hasGender: true,
      genderType: "guardian",
      group: "guardian",
    },
    {
      key: "studentGender_ar",
      labelAr: "جنس الطالب (عربي)",
      labelEn: "Student Gender (AR)",
      icon: "⚧",
      valueAr: "الابن",
      valueEn: "الابن",
      valueMaleAr: "الابن",
      valueMaleEn: "الابن",
      valueFemaleAr: "الابنة",
      valueFemaleEn: "الابنة",
      hasGender: true,
      genderType: "student",
      group: "guardian",
    },
    {
      key: "studentGender_en",
      labelAr: "جنس الطالب (إنجليزي)",
      labelEn: "Student Gender (EN)",
      icon: "⚧",
      valueAr: "son",
      valueEn: "son",
      valueMaleAr: "son",
      valueMaleEn: "son",
      valueFemaleAr: "daughter",
      valueFemaleEn: "daughter",
      hasGender: true,
      genderType: "student",
      group: "guardian",
    },
    {
      key: "studentName_ar",
      labelAr: "اسم الطالب - عربي (في رسائل ولي الأمر)",
      labelEn: "Student Name (AR)",
      icon: "👤",
      valueAr: "ممدوح",
      valueEn: "ممدوح",
      valueMaleAr: "ممدوح",
      valueMaleEn: "ممدوح",
      valueFemaleAr: "سارة",
      valueFemaleEn: "سارة",
      hasGender: true,
      genderType: "student",
      group: "guardian",
    },
    {
      key: "studentName_en",
      labelAr: "اسم الطالب - إنجليزي (في رسائل ولي الأمر)",
      labelEn: "Student Name (EN)",
      icon: "👤",
      valueAr: "Mamdouh",
      valueEn: "Mamdouh",
      valueMaleAr: "Mamdouh",
      valueMaleEn: "Mamdouh",
      valueFemaleAr: "Sara",
      valueFemaleEn: "Sara",
      hasGender: true,
      genderType: "student",
      group: "guardian",
    },
    {
      key: "studentName",
      labelAr: "اسم الطالب",
      labelEn: "Student Name",
      icon: "👤",
      valueAr: "ممدوح",
      valueEn: "Mamdouh",
      valueMaleAr: "ممدوح",
      valueMaleEn: "Mamdouh",
      valueFemaleAr: "سارة",
      valueFemaleEn: "Sara",
      hasGender: true,
      genderType: "student",
      group: "guardian",
    },
    {
      key: "relationship_ar",
      labelAr: "صلة القرابة (عربي)",
      labelEn: "Relationship (AR)",
      icon: "👨‍👩‍👦",
      valueAr: "الأب",
      valueEn: "الأب",
      valueFatherAr: "الأب",
      valueFatherEn: "الأب",
      valueMotherAr: "الأم",
      valueMotherEn: "الأم",
      hasGender: true,
      genderType: "guardian",
      group: "guardian",
    },
    {
      key: "fullStudentName",
      labelAr: "الاسم الكامل للطالب",
      labelEn: "Full Student Name",
      icon: "📝",
      valueAr: "ممدوح أحمد علي",
      valueEn: "Mamdouh Ahmed Ali",
      valueMaleAr: "ممدوح أحمد علي",
      valueMaleEn: "Mamdouh Ahmed Ali",
      valueFemaleAr: "سارة محمد علي",
      valueFemaleEn: "Sara Mohamed Ali",
      hasGender: true,
      genderType: "student",
      group: "guardian",
    },
    {
      key: "childTitle",
      labelAr: "ابنك / ابنتك",
      labelEn: "Child Title",
      icon: "👶",
      valueAr: "ابنك",
      valueEn: "your son",
      valueFatherAr: "ابنك",
      valueFatherEn: "your son",
      valueMotherAr: "ابنتك",
      valueMotherEn: "your daughter",
      // للمزيد من الدقة — يتأثر بجنس الطالب أيضاً
      valueMaleAr: "ابنك",
      valueMaleEn: "your son",
      valueFemaleAr: "ابنتك",
      valueFemaleEn: "your daughter",
      hasGender: true,
      genderType: "student",
      group: "guardian",
    },
    {
      key: "enrollmentNumber",
      labelAr: "رقم القيد",
      labelEn: "Enrollment Number",
      icon: "🔢",
      valueAr: "STU-2024-001",
      valueEn: "STU-2024-001",
      hasGender: false,
      group: "guardian",
    },

    // ══════════════════════════════════════════════════════════
    // INSTRUCTOR — المدرب (مع ذكر / أنثى)
    // ══════════════════════════════════════════════════════════
    {
      key: "instructorSalutation",
      labelAr: "تحية المدرب",
      labelEn: "Instructor Salutation",
      icon: "👋",
      valueAr: "عزيزي الأستاذ أحمد",
      valueEn: "Dear Mr. Ahmed",
      valueMaleAr: "عزيزي الأستاذ أحمد",
      valueMaleEn: "Dear Mr. Ahmed",
      valueFemaleAr: "عزيزتي الأستاذة نورا",
      valueFemaleEn: "Dear Ms. Nora",
      hasGender: true,
      genderType: "instructor",
      group: "instructor",
    },
    {
      key: "salutation",
      labelAr: "التحية (للمجموعات / المدرب)",
      labelEn: "Salutation (groups/instructor)",
      icon: "👋",
      valueAr: "عزيزي ممدوح",
      valueEn: "Dear Mamdouh",
      valueMaleAr: "عزيزي أحمد",
      valueMaleEn: "Dear Ahmed",
      valueFemaleAr: "عزيزتي نورا",
      valueFemaleEn: "Dear Nora",
      hasGender: true,
      genderType: "instructor",
      group: "instructor",
    },
    {
      key: "instructorName",
      labelAr: "اسم المدرب (مختصر)",
      labelEn: "Instructor Name (short)",
      icon: "👨‍🏫",
      valueAr: "أحمد",
      valueEn: "Ahmed",
      valueMaleAr: "أحمد",
      valueMaleEn: "Ahmed",
      valueFemaleAr: "نورا",
      valueFemaleEn: "Nora",
      hasGender: true,
      genderType: "instructor",
      group: "instructor",
    },
    {
      key: "instructorFullName",
      labelAr: "الاسم الكامل للمدرب",
      labelEn: "Instructor Full Name",
      icon: "👨‍🏫",
      valueAr: "أحمد محمد علي",
      valueEn: "Ahmed Mohamed Ali",
      valueMaleAr: "أحمد محمد علي",
      valueMaleEn: "Ahmed Mohamed Ali",
      valueFemaleAr: "نورا محمد علي",
      valueFemaleEn: "Nora Mohamed Ali",
      hasGender: true,
      genderType: "instructor",
      group: "instructor",
    },
    {
      key: "instructorTitle",
      labelAr: "لقب المدرب",
      labelEn: "Instructor Title",
      icon: "🎓",
      valueAr: "الأستاذ أحمد",
      valueEn: "Mr. Ahmed",
      valueMaleAr: "الأستاذ أحمد",
      valueMaleEn: "Mr. Ahmed",
      valueFemaleAr: "الأستاذة نورا",
      valueFemaleEn: "Ms. Nora",
      hasGender: true,
      genderType: "instructor",
      group: "instructor",
    },

    // ══════════════════════════════════════════════════════════
    // GROUP — المجموعة
    // ══════════════════════════════════════════════════════════
    {
      key: "courseName",
      labelAr: "اسم الكورس",
      labelEn: "Course Name",
      icon: "📚",
      valueAr: "الإنجليزية للمبتدئين",
      valueEn: "English for Beginners",
      hasGender: false,
      group: "group",
    },
    {
      key: "groupName",
      labelAr: "اسم المجموعة",
      labelEn: "Group Name",
      icon: "👥",
      valueAr: "مستوى مبتدئ A1",
      valueEn: "Beginner Level A1",
      hasGender: false,
      group: "group",
    },
    {
      key: "groupCode",
      labelAr: "كود المجموعة",
      labelEn: "Group Code",
      icon: "🔤",
      valueAr: "GRP-001",
      valueEn: "GRP-001",
      hasGender: false,
      group: "group",
    },
    {
      key: "startDate",
      labelAr: "تاريخ بدء المجموعة",
      labelEn: "Group Start Date",
      icon: "📅",
      valueAr: "الاثنين 15 مايو 2024",
      valueEn: "Monday, May 15, 2024",
      hasGender: false,
      group: "group",
    },
    {
      key: "timeTo",
      labelAr: "وقت نهاية الحصة",
      labelEn: "Session End Time",
      icon: "⏰",
      valueAr: "08:30 مساءً",
      valueEn: "08:30 PM",
      hasGender: false,
      group: "group",
    },
    {
      key: "timeFrom",
      labelAr: "وقت بداية الحصة",
      labelEn: "Session Start Time",
      icon: "⏰",
      valueAr: "07:00 مساءً",
      valueEn: "07:00 PM",
      hasGender: false,
      group: "group",
    },
    {
      key: "instructor",
      labelAr: "اسم المدرب (في المجموعات)",
      labelEn: "Instructor (groups)",
      icon: "👨‍🏫",
      valueAr: "الأستاذ أحمد",
      valueEn: "Mr. Ahmed",
      valueMaleAr: "الأستاذ أحمد",
      valueMaleEn: "Mr. Ahmed",
      valueFemaleAr: "الأستاذة نورا",
      valueFemaleEn: "Ms. Nora",
      hasGender: true,
      genderType: "instructor",
      group: "group",
    },
    {
      key: "firstMeetingLink",
      labelAr: "رابط أول جلسة",
      labelEn: "First Meeting Link",
      icon: "🔗",
      valueAr: "https://meet.google.com/abc-xyz",
      valueEn: "https://meet.google.com/abc-xyz",
      hasGender: false,
      group: "group",
    },
    {
      key: "studentCount",
      labelAr: "عدد طلاب المجموعة",
      labelEn: "Student Count",
      icon: "👥",
      valueAr: "8",
      valueEn: "8",
      hasGender: false,
      group: "group",
    },

    // ══════════════════════════════════════════════════════════
    // SESSION — الحصة
    // ══════════════════════════════════════════════════════════
    {
      key: "sessionName",
      labelAr: "اسم الحصة",
      labelEn: "Session Name",
      icon: "📘",
      valueAr: "الدرس الأول: التعارف",
      valueEn: "Lesson 1: Introduction",
      hasGender: false,
      group: "session",
    },
    {
      key: "date",
      labelAr: "تاريخ الحصة",
      labelEn: "Session Date",
      icon: "📅",
      valueAr: "الثلاثاء 20 مايو 2024",
      valueEn: "Tuesday, May 20, 2024",
      hasGender: false,
      group: "session",
    },
    {
      key: "time",
      labelAr: "وقت الحصة",
      labelEn: "Session Time",
      icon: "⏰",
      valueAr: "07:00 - 08:30 مساءً",
      valueEn: "07:00 - 08:30 PM",
      hasGender: false,
      group: "session",
    },
    {
      key: "meetingLink",
      labelAr: "رابط الحصة",
      labelEn: "Meeting Link",
      icon: "🔗",
      valueAr: "https://meet.google.com/abc-xyz",
      valueEn: "https://meet.google.com/abc-xyz",
      hasGender: false,
      group: "session",
    },
    {
      key: "newDate",
      labelAr: "التاريخ الجديد (بعد التأجيل)",
      labelEn: "New Date",
      icon: "📅",
      valueAr: "الخميس 22 مايو 2024",
      valueEn: "Thursday, May 22, 2024",
      hasGender: false,
      group: "session",
    },
    {
      key: "newTime",
      labelAr: "الوقت الجديد (بعد التأجيل)",
      labelEn: "New Time",
      icon: "⏰",
      valueAr: "08:00 - 09:30 مساءً",
      valueEn: "08:00 - 09:30 PM",
      hasGender: false,
      group: "session",
    },
    {
      key: "cancellationReason",
      labelAr: "سبب الإلغاء",
      labelEn: "Cancellation Reason",
      icon: "❌",
      valueAr: "ظروف طارئة",
      valueEn: "Emergency circumstances",
      hasGender: false,
      group: "session",
    },
    {
      key: "postponeReason",
      labelAr: "سبب التأجيل",
      labelEn: "Postpone Reason",
      icon: "🔄",
      valueAr: "تعارض في الجدول",
      valueEn: "Schedule conflict",
      hasGender: false,
      group: "session",
    },

    // ══════════════════════════════════════════════════════════
    // ATTENDANCE — الحضور
    // ══════════════════════════════════════════════════════════
    {
      key: "attendanceStatus",
      labelAr: "حالة الحضور",
      labelEn: "Attendance Status",
      icon: "📌",
      valueAr: "حاضر",
      valueEn: "Present",
      valueMaleAr: "حاضر",
      valueMaleEn: "Present",
      valueFemaleAr: "حاضرة",
      valueFemaleEn: "Present",
      hasGender: true,
      genderType: "student",
      group: "attendance",
    },
    {
      key: "status",
      labelAr: "الحالة",
      labelEn: "Status",
      icon: "📌",
      valueAr: "حاضر",
      valueEn: "Present",
      valueMaleAr: "حاضر",
      valueMaleEn: "Present",
      valueFemaleAr: "حاضرة",
      valueFemaleEn: "Present",
      hasGender: true,
      genderType: "student",
      group: "attendance",
    },
    {
      key: "lateMinutes",
      labelAr: "دقائق التأخير",
      labelEn: "Minutes Late",
      icon: "⏱️",
      valueAr: "15",
      valueEn: "15",
      hasGender: false,
      group: "attendance",
    },

    // ══════════════════════════════════════════════════════════
    // REMINDER — التذكيرات
    // ══════════════════════════════════════════════════════════
    {
      key: "reminderType",
      labelAr: "نوع التذكير",
      labelEn: "Reminder Type",
      icon: "🔔",
      valueAr: "تذكير بموعد الحصة",
      valueEn: "Session reminder",
      hasGender: false,
      group: "reminder",
    },
    {
      key: "hoursLeft",
      labelAr: "عدد الساعات المتبقية",
      labelEn: "Hours Left",
      icon: "⏳",
      valueAr: "24",
      valueEn: "24",
      hasGender: false,
      group: "reminder",
    },
    {
      key: "minutesLeft",
      labelAr: "عدد الدقائق المتبقية",
      labelEn: "Minutes Left",
      icon: "⏱️",
      valueAr: "60",
      valueEn: "60",
      hasGender: false,
      group: "reminder",
    },

    // ══════════════════════════════════════════════════════════
    // COMPLETION — الإكمال
    // ══════════════════════════════════════════════════════════
    {
      key: "completionDate",
      labelAr: "تاريخ إكمال المجموعة",
      labelEn: "Completion Date",
      icon: "🎉",
      valueAr: "الجمعة 30 يونيو 2024",
      valueEn: "Friday, June 30, 2024",
      hasGender: false,
      group: "completion",
    },
    {
      key: "totalSessions",
      labelAr: "إجمالي عدد الحصص",
      labelEn: "Total Sessions",
      icon: "🔢",
      valueAr: "12",
      valueEn: "12",
      hasGender: false,
      group: "completion",
    },
    {
      key: "certificateLink",
      labelAr: "رابط الشهادة",
      labelEn: "Certificate Link",
      icon: "🏆",
      valueAr: "https://codeschool.com/certificate/xxx",
      valueEn: "https://codeschool.com/certificate/xxx",
      hasGender: false,
      group: "completion",
    },
    {
      key: "feedbackLink",
      labelAr: "رابط الاستبيان",
      labelEn: "Feedback Link",
      icon: "⭐",
      valueAr: "https://forms.gle/xyz123",
      valueEn: "https://forms.gle/xyz123",
      hasGender: false,
      group: "completion",
    },

    // ══════════════════════════════════════════════════════════
    // EVALUATION — التقييم
    // ══════════════════════════════════════════════════════════
    {
      key: "sessionDate",
      labelAr: "تاريخ الجلسة (في التقرير)",
      labelEn: "Session Date (report)",
      icon: "📆",
      valueAr: "30/12/2025",
      valueEn: "12/30/2025",
      hasGender: false,
      group: "evaluation",
    },
    {
      key: "sessionNumber",
      labelAr: "رقم الحصة (في التقرير)",
      labelEn: "Session Number (report)",
      icon: "📑",
      valueAr: "1",
      valueEn: "1",
      hasGender: false,
      group: "evaluation",
    },
    {
      key: "starsCommitment",
      labelAr: "نجوم الالتزام",
      labelEn: "Stars: Commitment",
      icon: "⭐",
      valueAr: "⭐⭐⭐⭐⭐",
      valueEn: "⭐⭐⭐⭐⭐",
      hasGender: false,
      group: "evaluation",
    },
    {
      key: "starsUnderstanding",
      labelAr: "نجوم الاستيعاب",
      labelEn: "Stars: Understanding",
      icon: "⭐",
      valueAr: "⭐⭐⭐⭐",
      valueEn: "⭐⭐⭐⭐",
      hasGender: false,
      group: "evaluation",
    },
    {
      key: "starsTaskExecution",
      labelAr: "نجوم تنفيذ المهام",
      labelEn: "Stars: Task Execution",
      icon: "⭐",
      valueAr: "⭐⭐⭐⭐",
      valueEn: "⭐⭐⭐⭐",
      hasGender: false,
      group: "evaluation",
    },
    {
      key: "starsParticipation",
      labelAr: "نجوم المشاركة",
      labelEn: "Stars: Participation",
      icon: "⭐",
      valueAr: "⭐⭐⭐⭐",
      valueEn: "⭐⭐⭐⭐",
      hasGender: false,
      group: "evaluation",
    },
    {
      key: "instructorComment",
      labelAr: "تعليق المدرس",
      labelEn: "Instructor Comment",
      icon: "📝",
      valueAr: "أداء ممتاز، استمر هكذا!",
      valueEn: "Excellent performance, keep it up!",
      hasGender: false,
      group: "evaluation",
    },
    {
      key: "completedSessions",
      labelAr: "عدد الحصص المنتهية",
      labelEn: "Completed Sessions",
      icon: "🔢",
      valueAr: "2",
      valueEn: "2",
      hasGender: false,
      group: "evaluation",
    },
    {
      key: "recordingLink",
      labelAr: "رابط تسجيل الحصة",
      labelEn: "Recording Link",
      icon: "🎥",
      valueAr: "🎥 رابط التسجيل: https://drive.google.com/xxx",
      valueEn: "🎥 Recording: https://drive.google.com/xxx",
      hasGender: false,
      group: "evaluation",
    },
    {
      key: "evaluationDecision",
      labelAr: "نتيجة التقييم النهائية",
      labelEn: "Evaluation Decision",
      icon: "🏆",
      valueAr: "ممتاز — جاهز للانتقال للمستوى التالي",
      valueEn: "Excellent — Ready for the next level",
      valueMaleAr: "ممتاز — جاهز للانتقال للمستوى التالي",
      valueMaleEn: "Excellent — Ready for the next level",
      valueFemaleAr: "ممتازة — جاهزة للانتقال للمستوى التالي",
      valueFemaleEn: "Excellent — Ready for the next level",
      hasGender: true,
      genderType: "student",
      group: "evaluation",
    },

    // ══════════════════════════════════════════════════════════
    // COMMON — عامة
    // ══════════════════════════════════════════════════════════
    {
      key: "decision",
      labelAr: "نتيجة التقييم (مختصرة)",
      labelEn: "Evaluation Decision (short)",
      icon: "🏆",
      valueAr: "ممتاز",
      valueEn: "Excellent",
      valueMaleAr: "ممتاز",
      valueMaleEn: "Excellent",
      valueFemaleAr: "ممتازة",
      valueFemaleEn: "Excellent",
      hasGender: true,
      genderType: "student",
      group: "common",
    },
  ];
}
