// /app/api/whatsapp/group-templates/route.js - UPDATED WITH firstMeetingLink
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import WhatsAppTemplateAddGroup from "../../../models/WhatsAppTemplateAddGroup";
import { requireAdmin } from "@/utils/authMiddleware";

// ✅ القوالب الافتراضية - طالب عربي
const DEFAULT_STUDENT_AR = `{salutation}،

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

// ✅ القوالب الافتراضية - طالب إنجليزي
const DEFAULT_STUDENT_EN = `{salutation},

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

// ✅ القوالب الافتراضية - ولي الأمر عربي
const DEFAULT_GUARDIAN_AR = `{salutation}،

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

// ✅ القوالب الافتراضية - ولي الأمر إنجليزي
const DEFAULT_GUARDIAN_EN = `{salutation},

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

// ✅ قائمة المتغيرات المتاحة - مع إضافة firstMeetingLink
const DEFAULT_VARIABLES = [
  { key: "{salutation}", label: "التحية", description: "عزيزي/عزيزتي حسب الجنس أو العلاقة" },
  { key: "{studentName}", label: "اسم الطالب", description: "الاسم المختصر للطالب" },
  { key: "{guardianName}", label: "اسم ولي الأمر", description: "الاسم المختصر لولي الأمر" },
  { key: "{childTitle}", label: "ابنك/ابنتك", description: "حسب جنس الطالب" },
  { key: "{groupName}", label: "اسم المجموعة", description: "اسم المجموعة" },
  { key: "{courseName}", label: "اسم الكورس", description: "اسم البرنامج التعليمي" },
  { key: "{startDate}", label: "تاريخ البدء", description: "تاريخ بدء المجموعة" },
  { key: "{timeFrom}", label: "وقت البداية", description: "وقت بدء الحصة" },
  { key: "{timeTo}", label: "وقت النهاية", description: "وقت نهاية الحصة" },
  { key: "{instructor}", label: "المدرب/المدربين", description: "أسماء كل المدربين" },
  { key: "{firstMeetingLink}", label: "رابط الجلسة الأولى", description: "رابط الاجتماع لأول جلسة مجدولة" }, // ✅ NEW
];

// ============================================================
// GET: جلب القالب
// ============================================================
export async function GET(req) {
  try {
    await connectDB();

    let template = await WhatsAppTemplateAddGroup.findOne({
      templateType: "group_welcome",
      isDefault: true,
      isActive: true,
    }).lean();

    if (!template) {
      console.log("⚠️ No default template found, creating one...");
      try {
        const newTemplate = new WhatsAppTemplateAddGroup({
          templateType: "group_welcome",
          name: "رسالة الترحيب بالمجموعة - الافتراضية",
          studentContentAr: DEFAULT_STUDENT_AR,
          studentContentEn: DEFAULT_STUDENT_EN,
          guardianContentAr: DEFAULT_GUARDIAN_AR,
          guardianContentEn: DEFAULT_GUARDIAN_EN,
          content: DEFAULT_STUDENT_AR,
          description: "رسائل منفصلة للطالب وولي الأمر مع دعم العربية والإنجليزية ورابط الجلسة الأولى",
          isDefault: true,
          isActive: true,
          variables: DEFAULT_VARIABLES,
        });
        await newTemplate.save();
        template = newTemplate.toObject();
        console.log("✅ Default template created with firstMeetingLink");
      } catch (createError) {
        console.error("❌ Error creating template:", createError);
        template = {
          _id: "default",
          studentContentAr: DEFAULT_STUDENT_AR,
          studentContentEn: DEFAULT_STUDENT_EN,
          guardianContentAr: DEFAULT_GUARDIAN_AR,
          guardianContentEn: DEFAULT_GUARDIAN_EN,
          content: DEFAULT_STUDENT_AR,
          variables: DEFAULT_VARIABLES,
        };
      }
    }

    // ✅ Migration: لو في قالب قديم بـ content واحد بس
    if (!template.studentContentAr) {
      template.studentContentAr = template.content || DEFAULT_STUDENT_AR;
      template.studentContentEn = DEFAULT_STUDENT_EN;
      template.guardianContentAr = DEFAULT_GUARDIAN_AR;
      template.guardianContentEn = DEFAULT_GUARDIAN_EN;
    }

    // ✅ Migration: لو الـ variables القديمة مش فيها firstMeetingLink
    const hasFirstMeetingLink = (template.variables || []).some(
      (v) => v.key === "{firstMeetingLink}"
    );
    if (!hasFirstMeetingLink) {
      template.variables = DEFAULT_VARIABLES;
    }

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error("❌ Error fetching group template:", error);
    return NextResponse.json({
      success: true,
      data: {
        _id: "default",
        studentContentAr: DEFAULT_STUDENT_AR,
        studentContentEn: DEFAULT_STUDENT_EN,
        guardianContentAr: DEFAULT_GUARDIAN_AR,
        guardianContentEn: DEFAULT_GUARDIAN_EN,
        variables: DEFAULT_VARIABLES,
      },
    });
  }
}

// ============================================================
// PUT: تحديث القالب
// ============================================================
export async function PUT(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const adminUser = authCheck.user;
    await connectDB();

    const body = await req.json();
    const {
      id,
      studentContentAr,
      studentContentEn,
      guardianContentAr,
      guardianContentEn,
      setAsDefault,
    } = body;

    const template = await WhatsAppTemplateAddGroup.findById(id);
    if (!template) {
      return NextResponse.json(
        { success: false, message: "Template not found" },
        { status: 404 }
      );
    }

    if (studentContentAr !== undefined) template.studentContentAr = studentContentAr;
    if (studentContentEn !== undefined) template.studentContentEn = studentContentEn;
    if (guardianContentAr !== undefined) template.guardianContentAr = guardianContentAr;
    if (guardianContentEn !== undefined) template.guardianContentEn = guardianContentEn;
    template.content = studentContentAr || template.studentContentAr;

    // ✅ تحديث الـ variables لتشمل firstMeetingLink
    template.variables = DEFAULT_VARIABLES;

    if (setAsDefault) {
      await WhatsAppTemplateAddGroup.updateMany(
        { templateType: "group_welcome", isDefault: true, _id: { $ne: id } },
        { $set: { isDefault: false } }
      );
      template.isDefault = true;
    }

    template.metadata.lastModifiedBy = adminUser.id;
    template.metadata.updatedAt = new Date();
    await template.save();

    return NextResponse.json({
      success: true,
      data: template,
      message: "تم تحديث القالب بنجاح",
    });
  } catch (error) {
    console.error("❌ Error updating template:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// ============================================================
// POST: إنشاء قالب جديد
// ============================================================
export async function POST(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const adminUser = authCheck.user;
    await connectDB();

    const body = await req.json();
    const {
      name,
      studentContentAr,
      studentContentEn,
      guardianContentAr,
      guardianContentEn,
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
      studentContentAr: studentContentAr || DEFAULT_STUDENT_AR,
      studentContentEn: studentContentEn || DEFAULT_STUDENT_EN,
      guardianContentAr: guardianContentAr || DEFAULT_GUARDIAN_AR,
      guardianContentEn: guardianContentEn || DEFAULT_GUARDIAN_EN,
      content: studentContentAr || DEFAULT_STUDENT_AR,
      description: description || "",
      isDefault: setAsDefault || false,
      variables: DEFAULT_VARIABLES,
      metadata: {
        createdBy: adminUser.id,
        lastModifiedBy: adminUser.id,
      },
    });

    await template.save();

    return NextResponse.json({
      success: true,
      data: template,
      message: "تم إنشاء القالب بنجاح",
    });
  } catch (error) {
    console.error("❌ Error creating template:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}