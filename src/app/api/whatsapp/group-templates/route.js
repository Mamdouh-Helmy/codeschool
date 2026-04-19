// /app/api/whatsapp/group-templates/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import WhatsAppTemplateAddGroup from "../../../models/WhatsAppTemplateAddGroup";
import { requireAdmin } from "@/utils/authMiddleware";

// ══════════════════════════════════════════════════════════════════════════
// القوالب الافتراضية — 8 slots (طالب ذكر/أنثى × عربي/إنجليزي)
//                              + (أب/أم × عربي/إنجليزي)
// ══════════════════════════════════════════════════════════════════════════

// ── طالب ذكر عربي ────────────────────────────────────────────────────────
const DEFAULT_STUDENT_MALE_AR = `{salutation_ar}،

يسرنا إعلامك بأنه تم تسجيلك بنجاح في Code School! 🎉

📘 البرنامج: {courseName}
👥 المجموعة: {groupName}
📅 تاريخ البدء: {startDate}
⏰ الموعد: {timeFrom} – {timeTo}
👨‍🏫 المدرب: {instructor}
🔗 رابط الجلسة الأولى: {firstMeetingLink}

متحمسون لبدء رحلتك التعليمية معنا! 🚀

مع أطيب التحيات،
فريق Code School 💻`;

// ── طالب ذكر إنجليزي ─────────────────────────────────────────────────────
const DEFAULT_STUDENT_MALE_EN = `{salutation_en},

We are pleased to confirm your enrollment at Code School! 🎉

📘 Program: {courseName}
👥 Group: {groupName}
📅 Start Date: {startDate}
⏰ Schedule: {timeFrom} – {timeTo}
👨‍🏫 Instructor: {instructor}
🔗 First Session Link: {firstMeetingLink}

Excited to start your learning journey with us! 🚀

Best regards,
Code School Team 💻`;

// ── طالبة أنثى عربي ──────────────────────────────────────────────────────
const DEFAULT_STUDENT_FEMALE_AR = `{salutation_ar}،

يسرنا إعلامك بأنه تم تسجيلك بنجاح في Code School! 🎉

📘 البرنامج: {courseName}
👥 المجموعة: {groupName}
📅 تاريخ البدء: {startDate}
⏰ الموعد: {timeFrom} – {timeTo}
👨‍🏫 المدرب: {instructor}
🔗 رابط الجلسة الأولى: {firstMeetingLink}

متحمسون لبدء رحلتك التعليمية معنا! 🚀

مع أطيب التحيات،
فريق Code School 💻`;

// ── طالبة أنثى إنجليزي ───────────────────────────────────────────────────
const DEFAULT_STUDENT_FEMALE_EN = `{salutation_en},

We are pleased to confirm your enrollment at Code School! 🎉

📘 Program: {courseName}
👥 Group: {groupName}
📅 Start Date: {startDate}
⏰ Schedule: {timeFrom} – {timeTo}
👨‍🏫 Instructor: {instructor}
🔗 First Session Link: {firstMeetingLink}

Excited to start your learning journey with us! 🚀

Best regards,
Code School Team 💻`;

// ── ولي أمر (أب) عربي ────────────────────────────────────────────────────
const DEFAULT_GUARDIAN_FATHER_AR = `{guardianSalutation_ar}،

يسرنا إعلامكم بأنه تم تسجيل {childTitle} {studentName} بنجاح في Code School! 🎉

📘 البرنامج: {courseName}
👥 المجموعة: {groupName}
📅 تاريخ البدء: {startDate}
⏰ الموعد: {timeFrom} – {timeTo}
👨‍🏫 المدرب: {instructor}
🔗 رابط الجلسة الأولى: {firstMeetingLink}

📌 ملاحظات هامة:
- يرجى التأكد من حضور {studentName} في الموعد المحدد
- تجهيز الجهاز (لابتوب/تابلت) مع شحن كامل
- الحضور المنتظم ضروري لتحقيق أفضل النتائج

نتطلع لرؤية تقدم {studentName} معنا! 🚀

مع أطيب التحيات،
فريق Code School 💻`;

// ── ولي أمر (أب) إنجليزي ─────────────────────────────────────────────────
const DEFAULT_GUARDIAN_FATHER_EN = `{guardianSalutation_en},

We are pleased to inform you that {childTitle} {studentName} has been successfully enrolled at Code School! 🎉

📘 Program: {courseName}
👥 Group: {groupName}
📅 Start Date: {startDate}
⏰ Schedule: {timeFrom} – {timeTo}
👨‍🏫 Instructor: {instructor}
🔗 First Session Link: {firstMeetingLink}

📌 Important Notes:
- Please ensure {studentName} attends on time
- Prepare the device (laptop/tablet) with full charge
- Regular attendance is essential for best results

We look forward to seeing {studentName}'s progress! 🚀

Best regards,
Code School Team 💻`;

// ── ولي أمر (أم) عربي ────────────────────────────────────────────────────
const DEFAULT_GUARDIAN_MOTHER_AR = `{guardianSalutation_ar}،

يسرنا إعلامك بأنه تم تسجيل {childTitle} {studentName} بنجاح في Code School! 🎉

📘 البرنامج: {courseName}
👥 المجموعة: {groupName}
📅 تاريخ البدء: {startDate}
⏰ الموعد: {timeFrom} – {timeTo}
👨‍🏫 المدرب: {instructor}
🔗 رابط الجلسة الأولى: {firstMeetingLink}

📌 ملاحظات هامة:
- يرجى التأكد من حضور {studentName} في الموعد المحدد
- تجهيز الجهاز (لابتوب/تابلت) مع شحن كامل
- الحضور المنتظم ضروري لتحقيق أفضل النتائج

نتطلع لرؤية تقدم {studentName} معنا! 🚀

مع أطيب التحيات،
فريق Code School 💻`;

// ── ولي أمر (أم) إنجليزي ─────────────────────────────────────────────────
const DEFAULT_GUARDIAN_MOTHER_EN = `{guardianSalutation_en},

We are pleased to inform you that {childTitle} {studentName} has been successfully enrolled at Code School! 🎉

📘 Program: {courseName}
👥 Group: {groupName}
📅 Start Date: {startDate}
⏰ Schedule: {timeFrom} – {timeTo}
👨‍🏫 Instructor: {instructor}
🔗 First Session Link: {firstMeetingLink}

📌 Important Notes:
- Please ensure {studentName} attends on time
- Prepare the device (laptop/tablet) with full charge
- Regular attendance is essential for best results

We look forward to seeing {studentName}'s progress! 🚀

Best regards,
Code School Team 💻`;

// ══════════════════════════════════════════════════════════════════════════
// المتغيرات المتاحة
// ══════════════════════════════════════════════════════════════════════════
const DEFAULT_VARIABLES = [
  { key: "{salutation_ar}",         label: "تحية الطالب (عربي)",         description: "تحية الطالب بالعربية — حسب الجنس" },
  { key: "{salutation_en}",         label: "تحية الطالب (إنجليزي)",      description: "تحية الطالب بالإنجليزية — حسب الجنس" },
  { key: "{guardianSalutation_ar}", label: "تحية ولي الأمر (عربي)",      description: "تحية ولي الأمر بالعربية — حسب أب/أم" },
  { key: "{guardianSalutation_en}", label: "تحية ولي الأمر (إنجليزي)",   description: "تحية ولي الأمر بالإنجليزية — حسب أب/أم" },
  { key: "{studentName}",           label: "اسم الطالب",                 description: "الاسم المختصر للطالب" },
  { key: "{guardianName}",          label: "اسم ولي الأمر",              description: "الاسم المختصر لولي الأمر" },
  { key: "{childTitle}",            label: "ابنك/ابنتك",                 description: "حسب جنس الطالب" },
  { key: "{groupName}",             label: "اسم المجموعة",               description: "اسم المجموعة" },
  { key: "{courseName}",            label: "اسم الكورس",                 description: "اسم البرنامج التعليمي" },
  { key: "{startDate}",             label: "تاريخ البدء",                description: "تاريخ بدء المجموعة" },
  { key: "{timeFrom}",              label: "وقت البداية",                description: "وقت بدء الحصة" },
  { key: "{timeTo}",                label: "وقت النهاية",                description: "وقت نهاية الحصة" },
  { key: "{instructor}",            label: "المدرب/المدربين",            description: "أسماء كل المدربين" },
  { key: "{firstMeetingLink}",      label: "رابط الجلسة الأولى",         description: "رابط الاجتماع لأول جلسة" },
];

// ══════════════════════════════════════════════════════════════════════════
// GET — جلب القالب
// ══════════════════════════════════════════════════════════════════════════
export async function GET(req) {
  try {
    await connectDB();

    let template = await WhatsAppTemplateAddGroup.findOne({
      templateType: "group_welcome",
      isDefault: true,
      isActive: true,
    }).lean();

    if (!template) {
      console.log("⚠️ No default template found, creating...");
      try {
        const newTemplate = new WhatsAppTemplateAddGroup({
          templateType: "group_welcome",
          name: "رسالة الترحيب بالمجموعة - الافتراضية",
          // ── 8 slots ──────────────────────────────────────────────────
          studentMaleContentAr:    DEFAULT_STUDENT_MALE_AR,
          studentMaleContentEn:    DEFAULT_STUDENT_MALE_EN,
          studentFemaleContentAr:  DEFAULT_STUDENT_FEMALE_AR,
          studentFemaleContentEn:  DEFAULT_STUDENT_FEMALE_EN,
          guardianFatherContentAr: DEFAULT_GUARDIAN_FATHER_AR,
          guardianFatherContentEn: DEFAULT_GUARDIAN_FATHER_EN,
          guardianMotherContentAr: DEFAULT_GUARDIAN_MOTHER_AR,
          guardianMotherContentEn: DEFAULT_GUARDIAN_MOTHER_EN,
          // ── legacy fields للتوافق مع الكود القديم ────────────────────
          studentContentAr:  DEFAULT_STUDENT_MALE_AR,
          studentContentEn:  DEFAULT_STUDENT_MALE_EN,
          guardianContentAr: DEFAULT_GUARDIAN_FATHER_AR,
          guardianContentEn: DEFAULT_GUARDIAN_FATHER_EN,
          content: DEFAULT_STUDENT_MALE_AR,
          // ──────────────────────────────────────────────────────────────
          isDefault: true,
          isActive: true,
          variables: DEFAULT_VARIABLES,
        });
        await newTemplate.save();
        template = newTemplate.toObject();
        console.log("✅ Default template created with 8 gender-aware slots");
      } catch (createError) {
        console.error("❌ Error creating template:", createError);
        // ── Fallback in-memory template ───────────────────────────────
        return NextResponse.json({
          success: true,
          data: {
            _id: "default",
            studentMaleContentAr:    DEFAULT_STUDENT_MALE_AR,
            studentMaleContentEn:    DEFAULT_STUDENT_MALE_EN,
            studentFemaleContentAr:  DEFAULT_STUDENT_FEMALE_AR,
            studentFemaleContentEn:  DEFAULT_STUDENT_FEMALE_EN,
            guardianFatherContentAr: DEFAULT_GUARDIAN_FATHER_AR,
            guardianFatherContentEn: DEFAULT_GUARDIAN_FATHER_EN,
            guardianMotherContentAr: DEFAULT_GUARDIAN_MOTHER_AR,
            guardianMotherContentEn: DEFAULT_GUARDIAN_MOTHER_EN,
            studentContentAr:  DEFAULT_STUDENT_MALE_AR,
            studentContentEn:  DEFAULT_STUDENT_MALE_EN,
            guardianContentAr: DEFAULT_GUARDIAN_FATHER_AR,
            guardianContentEn: DEFAULT_GUARDIAN_FATHER_EN,
            variables: DEFAULT_VARIABLES,
          },
        });
      }
    }

    // ── Migration: قالب قديم بـ content واحد ─────────────────────────────
    if (!template.studentMaleContentAr) {
      template.studentMaleContentAr    = template.studentContentAr   || template.content || DEFAULT_STUDENT_MALE_AR;
      template.studentMaleContentEn    = template.studentContentEn   || DEFAULT_STUDENT_MALE_EN;
      template.studentFemaleContentAr  = template.studentContentAr   || template.content || DEFAULT_STUDENT_FEMALE_AR;
      template.studentFemaleContentEn  = template.studentContentEn   || DEFAULT_STUDENT_FEMALE_EN;
      template.guardianFatherContentAr = template.guardianContentAr  || DEFAULT_GUARDIAN_FATHER_AR;
      template.guardianFatherContentEn = template.guardianContentEn  || DEFAULT_GUARDIAN_FATHER_EN;
      template.guardianMotherContentAr = template.guardianContentAr  || DEFAULT_GUARDIAN_MOTHER_AR;
      template.guardianMotherContentEn = template.guardianContentEn  || DEFAULT_GUARDIAN_MOTHER_EN;
      console.log("🔄 Migration: filled 8 slots from legacy fields");
    }

    // ── Migration: تحديث المتغيرات القديمة ───────────────────────────────
    const hasCorrectVars = (template.variables || []).some(v => v.key === "{salutation_ar}");
    if (!hasCorrectVars) {
      template.variables = DEFAULT_VARIABLES;
    }

    return NextResponse.json({ success: true, data: template });

  } catch (error) {
    console.error("❌ Error fetching group template:", error);
    return NextResponse.json({
      success: true,
      data: {
        _id: "default",
        studentMaleContentAr:    DEFAULT_STUDENT_MALE_AR,
        studentMaleContentEn:    DEFAULT_STUDENT_MALE_EN,
        studentFemaleContentAr:  DEFAULT_STUDENT_FEMALE_AR,
        studentFemaleContentEn:  DEFAULT_STUDENT_FEMALE_EN,
        guardianFatherContentAr: DEFAULT_GUARDIAN_FATHER_AR,
        guardianFatherContentEn: DEFAULT_GUARDIAN_FATHER_EN,
        guardianMotherContentAr: DEFAULT_GUARDIAN_MOTHER_AR,
        guardianMotherContentEn: DEFAULT_GUARDIAN_MOTHER_EN,
        studentContentAr:  DEFAULT_STUDENT_MALE_AR,
        guardianContentAr: DEFAULT_GUARDIAN_FATHER_AR,
        variables: DEFAULT_VARIABLES,
      },
    });
  }
}

// ══════════════════════════════════════════════════════════════════════════
// PUT — تحديث القالب
// ══════════════════════════════════════════════════════════════════════════
export async function PUT(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const adminUser = authCheck.user;
    await connectDB();

    const body = await req.json();
    const {
      id,
      // ── 8 new gender-aware fields ──────────────────────────────────
      studentMaleContentAr,
      studentMaleContentEn,
      studentFemaleContentAr,
      studentFemaleContentEn,
      guardianFatherContentAr,
      guardianFatherContentEn,
      guardianMotherContentAr,
      guardianMotherContentEn,
      // ── legacy fields (still accepted for backward compat) ──────────
      studentContentAr,
      studentContentEn,
      guardianContentAr,
      guardianContentEn,
      setAsDefault,
    } = body;

    const template = await WhatsAppTemplateAddGroup.findById(id);
    if (!template) {
      return NextResponse.json({ success: false, message: "Template not found" }, { status: 404 });
    }

    // ── Update new 8 slots ────────────────────────────────────────────────
    if (studentMaleContentAr    !== undefined) template.studentMaleContentAr    = studentMaleContentAr;
    if (studentMaleContentEn    !== undefined) template.studentMaleContentEn    = studentMaleContentEn;
    if (studentFemaleContentAr  !== undefined) template.studentFemaleContentAr  = studentFemaleContentAr;
    if (studentFemaleContentEn  !== undefined) template.studentFemaleContentEn  = studentFemaleContentEn;
    if (guardianFatherContentAr !== undefined) template.guardianFatherContentAr = guardianFatherContentAr;
    if (guardianFatherContentEn !== undefined) template.guardianFatherContentEn = guardianFatherContentEn;
    if (guardianMotherContentAr !== undefined) template.guardianMotherContentAr = guardianMotherContentAr;
    if (guardianMotherContentEn !== undefined) template.guardianMotherContentEn = guardianMotherContentEn;

    // ── Update legacy slots too (for backward compat) ────────────────────
    if (studentContentAr  !== undefined) template.studentContentAr  = studentContentAr;
    if (studentContentEn  !== undefined) template.studentContentEn  = studentContentEn;
    if (guardianContentAr !== undefined) template.guardianContentAr = guardianContentAr;
    if (guardianContentEn !== undefined) template.guardianContentEn = guardianContentEn;

    // ── Keep content in sync with studentMaleContentAr ───────────────────
    template.content = template.studentMaleContentAr || template.studentContentAr || "";
    template.variables = DEFAULT_VARIABLES;

    if (setAsDefault) {
      await WhatsAppTemplateAddGroup.updateMany(
        { templateType: "group_welcome", isDefault: true, _id: { $ne: id } },
        { $set: { isDefault: false } }
      );
      template.isDefault = true;
    }

    template.metadata.lastModifiedBy = adminUser.id;
    template.metadata.updatedAt      = new Date();
    await template.save();

    console.log(`✅ Template updated: ${id}`);

    return NextResponse.json({ success: true, data: template, message: "تم تحديث القالب بنجاح" });

  } catch (error) {
    console.error("❌ Error updating template:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ══════════════════════════════════════════════════════════════════════════
// POST — إنشاء قالب جديد
// ══════════════════════════════════════════════════════════════════════════
export async function POST(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const adminUser = authCheck.user;
    await connectDB();

    const body = await req.json();
    const {
      name,
      studentMaleContentAr,    studentMaleContentEn,
      studentFemaleContentAr,  studentFemaleContentEn,
      guardianFatherContentAr, guardianFatherContentEn,
      guardianMotherContentAr, guardianMotherContentEn,
      description,
      setAsDefault,
    } = body;

    if (setAsDefault) {
      await WhatsAppTemplateAddGroup.updateMany(
        { templateType: "group_welcome", isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const template = new WhatsAppTemplateAddGroup({
      templateType: "group_welcome",
      name: name || "قالب جديد",
      studentMaleContentAr:    studentMaleContentAr    || DEFAULT_STUDENT_MALE_AR,
      studentMaleContentEn:    studentMaleContentEn    || DEFAULT_STUDENT_MALE_EN,
      studentFemaleContentAr:  studentFemaleContentAr  || DEFAULT_STUDENT_FEMALE_AR,
      studentFemaleContentEn:  studentFemaleContentEn  || DEFAULT_STUDENT_FEMALE_EN,
      guardianFatherContentAr: guardianFatherContentAr || DEFAULT_GUARDIAN_FATHER_AR,
      guardianFatherContentEn: guardianFatherContentEn || DEFAULT_GUARDIAN_FATHER_EN,
      guardianMotherContentAr: guardianMotherContentAr || DEFAULT_GUARDIAN_MOTHER_AR,
      guardianMotherContentEn: guardianMotherContentEn || DEFAULT_GUARDIAN_MOTHER_EN,
      // legacy
      studentContentAr:  studentMaleContentAr    || DEFAULT_STUDENT_MALE_AR,
      studentContentEn:  studentMaleContentEn    || DEFAULT_STUDENT_MALE_EN,
      guardianContentAr: guardianFatherContentAr || DEFAULT_GUARDIAN_FATHER_AR,
      guardianContentEn: guardianFatherContentEn || DEFAULT_GUARDIAN_FATHER_EN,
      content: studentMaleContentAr || DEFAULT_STUDENT_MALE_AR,
      description: description || "",
      isDefault: setAsDefault || false,
      variables: DEFAULT_VARIABLES,
      metadata: {
        createdBy: adminUser.id,
        lastModifiedBy: adminUser.id,
      },
    });

    await template.save();
    console.log("✅ New template created with 8 slots");

    return NextResponse.json({ success: true, data: template, message: "تم إنشاء القالب بنجاح" });

  } catch (error) {
    console.error("❌ Error creating template:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}