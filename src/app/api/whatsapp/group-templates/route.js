// /app/api/whatsapp/group-templates/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import WhatsAppTemplateAddGroup from "../../../models/WhatsAppTemplateAddGroup";
import { requireAdmin } from "@/utils/authMiddleware";

// ══════════════════════════════════════════════════════════════════════════
// 📘 DEFAULTS — ONLINE (8 slots)
// ══════════════════════════════════════════════════════════════════════════
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
// 📍 DEFAULTS — OFFLINE (8 slots)
// ══════════════════════════════════════════════════════════════════════════
const OFFLINE_STUDENT_MALE_AR = `{salutation_ar}،

يسرنا إعلامك بأنه تم تسجيلك بنجاح في Code School! 🎉

📘 البرنامج: {courseName}
👥 المجموعة: {groupName}
📅 تاريخ البدء: {startDate}
⏰ الموعد: {timeFrom} – {timeTo}
👨‍🏫 المدرب: {instructor}

📍 المكان: {placeName}
📌 العنوان: {address}
🗺️ اللوكيشن: {mapsLink}

متحمسون لبدء رحلتك التعليمية معنا! 🚀

مع أطيب التحيات،
فريق Code School 💻`;

const OFFLINE_STUDENT_MALE_EN = `{salutation_en},

We are pleased to confirm your enrollment at Code School! 🎉

📘 Program: {courseName}
👥 Group: {groupName}
📅 Start Date: {startDate}
⏰ Schedule: {timeFrom} – {timeTo}
👨‍🏫 Instructor: {instructor}

📍 Location: {placeName}
📌 Address: {address}
🗺️ Maps: {mapsLink}

Excited to start your learning journey with us! 🚀

Best regards,
Code School Team 💻`;

const OFFLINE_STUDENT_FEMALE_AR = OFFLINE_STUDENT_MALE_AR;
const OFFLINE_STUDENT_FEMALE_EN = OFFLINE_STUDENT_MALE_EN;

const OFFLINE_GUARDIAN_FATHER_AR = `{guardianSalutation_ar}،

يسرنا إعلامكم بأنه تم تسجيل {childTitle} {studentName} بنجاح في Code School! 🎉

📘 البرنامج: {courseName}
👥 المجموعة: {groupName}
📅 تاريخ البدء: {startDate}
⏰ الموعد: {timeFrom} – {timeTo}
👨‍🏫 المدرب: {instructor}

📍 المكان: {placeName}
📌 العنوان: {address}
🗺️ اللوكيشن: {mapsLink}

📌 ملاحظات هامة:
- يرجى التأكد من حضور {studentName} في الموعد المحدد
- الحضور المنتظم ضروري لتحقيق أفضل النتائج

نتطلع لرؤية تقدم {studentName} معنا! 🚀

مع أطيب التحيات،
فريق Code School 💻`;

const OFFLINE_GUARDIAN_FATHER_EN = `{guardianSalutation_en},

We are pleased to inform you that {childTitle} {studentName} has been successfully enrolled at Code School! 🎉

📘 Program: {courseName}
👥 Group: {groupName}
📅 Start Date: {startDate}
⏰ Schedule: {timeFrom} – {timeTo}
👨‍🏫 Instructor: {instructor}

📍 Location: {placeName}
📌 Address: {address}
🗺️ Maps: {mapsLink}

📌 Important Notes:
- Please ensure {studentName} attends on time
- Regular attendance is essential for best results

We look forward to seeing {studentName}'s progress! 🚀

Best regards,
Code School Team 💻`;

const OFFLINE_GUARDIAN_MOTHER_AR = OFFLINE_GUARDIAN_FATHER_AR;
const OFFLINE_GUARDIAN_MOTHER_EN = OFFLINE_GUARDIAN_FATHER_EN;

// ══════════════════════════════════════════════════════════════════════════
// المتغيرات
// ══════════════════════════════════════════════════════════════════════════
const ONLINE_VARIABLES = [
  { key: "{salutation_ar}",         label: "تحية الطالب (عربي)",         description: "" },
  { key: "{salutation_en}",         label: "تحية الطالب (إنجليزي)",      description: "" },
  { key: "{guardianSalutation_ar}", label: "تحية ولي الأمر (عربي)",      description: "" },
  { key: "{guardianSalutation_en}", label: "تحية ولي الأمر (إنجليزي)",   description: "" },
  { key: "{studentName}",           label: "اسم الطالب",                 description: "" },
  { key: "{guardianName}",          label: "اسم ولي الأمر",              description: "" },
  { key: "{childTitle}",            label: "ابنك/ابنتك",                 description: "" },
  { key: "{groupName}",             label: "اسم المجموعة",               description: "" },
  { key: "{courseName}",            label: "اسم الكورس",                 description: "" },
  { key: "{startDate}",             label: "تاريخ البدء",                description: "" },
  { key: "{timeFrom}",              label: "وقت البداية",                description: "" },
  { key: "{timeTo}",                label: "وقت النهاية",                description: "" },
  { key: "{instructor}",            label: "المدرب/المدربين",            description: "" },
  { key: "{firstMeetingLink}",      label: "رابط الجلسة الأولى",         description: "" },
];

const OFFLINE_VARIABLES = [
  { key: "{salutation_ar}",         label: "تحية الطالب (عربي)",         description: "" },
  { key: "{salutation_en}",         label: "تحية الطالب (إنجليزي)",      description: "" },
  { key: "{guardianSalutation_ar}", label: "تحية ولي الأمر (عربي)",      description: "" },
  { key: "{guardianSalutation_en}", label: "تحية ولي الأمر (إنجليزي)",   description: "" },
  { key: "{studentName}",           label: "اسم الطالب",                 description: "" },
  { key: "{guardianName}",          label: "اسم ولي الأمر",              description: "" },
  { key: "{childTitle}",            label: "ابنك/ابنتك",                 description: "" },
  { key: "{groupName}",             label: "اسم المجموعة",               description: "" },
  { key: "{courseName}",            label: "اسم الكورس",                 description: "" },
  { key: "{startDate}",             label: "تاريخ البدء",                description: "" },
  { key: "{timeFrom}",              label: "وقت البداية",                description: "" },
  { key: "{timeTo}",                label: "وقت النهاية",                description: "" },
  { key: "{instructor}",            label: "المدرب/المدربين",            description: "" },
  { key: "{placeName}",             label: "اسم المكان",                 description: "" },
  { key: "{address}",               label: "العنوان التفصيلي",           description: "" },
  { key: "{mapsLink}",              label: "رابط الخريطة",               description: "" },
];

// ══════════════════════════════════════════════════════════════════════════
// 🔧 HELPER: يحدد الـ defaults حسب النوع
// ══════════════════════════════════════════════════════════════════════════
function getDefaultsForType(templateType) {
  if (templateType === "group_welcome_offline") {
    return {
      studentMaleContentAr:    OFFLINE_STUDENT_MALE_AR,
      studentMaleContentEn:    OFFLINE_STUDENT_MALE_EN,
      studentFemaleContentAr:  OFFLINE_STUDENT_FEMALE_AR,
      studentFemaleContentEn:  OFFLINE_STUDENT_FEMALE_EN,
      guardianFatherContentAr: OFFLINE_GUARDIAN_FATHER_AR,
      guardianFatherContentEn: OFFLINE_GUARDIAN_FATHER_EN,
      guardianMotherContentAr: OFFLINE_GUARDIAN_MOTHER_AR,
      guardianMotherContentEn: OFFLINE_GUARDIAN_MOTHER_EN,
      variables: OFFLINE_VARIABLES,
      name: "رسالة الترحيب بالمجموعة (Offline) - الافتراضية",
    };
  }
  return {
    studentMaleContentAr:    DEFAULT_STUDENT_MALE_AR,
    studentMaleContentEn:    DEFAULT_STUDENT_MALE_EN,
    studentFemaleContentAr:  DEFAULT_STUDENT_FEMALE_AR,
    studentFemaleContentEn:  DEFAULT_STUDENT_FEMALE_EN,
    guardianFatherContentAr: DEFAULT_GUARDIAN_FATHER_AR,
    guardianFatherContentEn: DEFAULT_GUARDIAN_FATHER_EN,
    guardianMotherContentAr: DEFAULT_GUARDIAN_MOTHER_AR,
    guardianMotherContentEn: DEFAULT_GUARDIAN_MOTHER_EN,
    variables: ONLINE_VARIABLES,
    name: "رسالة الترحيب بالمجموعة - الافتراضية",
  };
}

// ══════════════════════════════════════════════════════════════════════════
// 🔧 HELPER: Migration للـ 8 slots من الـ legacy fields
// ══════════════════════════════════════════════════════════════════════════
async function migrateSlotsIfNeeded(template, type) {
  const defaults = getDefaultsForType(type);

  // لو الـ 8 slots مليانين → مفيش حاجة نعملها
  if (template.studentMaleContentAr && template.guardianFatherContentAr) {
    return template;
  }

  // ✅ املأ الـ 8 slots من الـ legacy fields (studentContentAr / guardianContentAr / content)
  const newSlots = {
    studentMaleContentAr:    template.studentMaleContentAr    || template.studentContentAr   || template.content || defaults.studentMaleContentAr,
    studentMaleContentEn:    template.studentMaleContentEn    || template.studentContentEn   || defaults.studentMaleContentEn,
    studentFemaleContentAr:  template.studentFemaleContentAr  || template.studentContentAr   || template.content || defaults.studentFemaleContentAr,
    studentFemaleContentEn:  template.studentFemaleContentEn  || template.studentContentEn   || defaults.studentFemaleContentEn,
    guardianFatherContentAr: template.guardianFatherContentAr || template.guardianContentAr  || template.content || defaults.guardianFatherContentAr,
    guardianFatherContentEn: template.guardianFatherContentEn || template.guardianContentEn  || defaults.guardianFatherContentEn,
    guardianMotherContentAr: template.guardianMotherContentAr || template.guardianContentAr  || template.content || defaults.guardianMotherContentAr,
    guardianMotherContentEn: template.guardianMotherContentEn || template.guardianContentEn  || defaults.guardianMotherContentEn,
  };

  // ✅ احفظ التعديلات في الداتابيز عشان تفضل
  try {
    await WhatsAppTemplateAddGroup.findByIdAndUpdate(template._id, {
      $set: newSlots,
    });
    console.log(`✅ Migrated slots for ${type} template (${template._id})`);
  } catch (e) {
    console.error(`❌ Migration save failed for ${type}:`, e.message);
  }

  // ✅ حدّث الـ template object اللي هنرجعه
  return { ...template, ...newSlots };
}

// ══════════════════════════════════════════════════════════════════════════
// GET — جلب القالب (يدعم نوعين: group_welcome و group_welcome_offline)
// ══════════════════════════════════════════════════════════════════════════
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const typeParam = searchParams.get("type");

    // ✅ لو مفيش type → رجّع النوعين (array)
    if (!typeParam) {
      let templates = await WhatsAppTemplateAddGroup.find({
        templateType: { $in: ["group_welcome", "group_welcome_offline"] },
        isActive: true,
      }).lean();

      // ✅ لو مفيش group_welcome_offline، أنشئه
      const hasOffline = templates.some(t => t.templateType === "group_welcome_offline");
      if (!hasOffline) {
        const defaults = getDefaultsForType("group_welcome_offline");
        try {
          const newOffline = new WhatsAppTemplateAddGroup({
            templateType: "group_welcome_offline",
            ...defaults,
            isDefault: true,
            isActive: true,
          });
          await newOffline.save();
          templates.push(newOffline.toObject());
          console.log("✅ group_welcome_offline created");
        } catch (e) {
          console.error("❌ Error creating offline template:", e);
        }
      }

      // ✅ لو مفيش group_welcome، أنشئه
      const hasOnline = templates.some(t => t.templateType === "group_welcome");
      if (!hasOnline) {
        const defaults = getDefaultsForType("group_welcome");
        try {
          const newOnline = new WhatsAppTemplateAddGroup({
            templateType: "group_welcome",
            ...defaults,
            isDefault: true,
            isActive: true,
          });
          await newOnline.save();
          templates.push(newOnline.toObject());
          console.log("✅ group_welcome created");
        } catch (e) {
          console.error("❌ Error creating online template:", e);
        }
      }

      // ✅ Migration للـ 8 slots لكل قالب لو محتاج
      const migratedTemplates = await Promise.all(
        templates.map(t => migrateSlotsIfNeeded(t, t.templateType))
      );

      return NextResponse.json({ success: true, data: migratedTemplates });
    }

    // ✅ لو فيه type محدد → رجّع قالب واحد
    const type = typeParam;
    const defaults = getDefaultsForType(type);

    let template = await WhatsAppTemplateAddGroup.findOne({
      templateType: type,
      isDefault: true,
      isActive: true,
    }).lean();

    // ✅ إنشاء تلقائي لو مش موجود
    if (!template) {
      console.log(`⚠️ No default template for ${type}, creating...`);
      try {
        const newTemplate = new WhatsAppTemplateAddGroup({
          templateType: type,
          ...defaults,
          isDefault: true,
          isActive: true,
        });
        await newTemplate.save();
        template = newTemplate.toObject();
        console.log(`✅ Default ${type} template created`);
      } catch (createError) {
        console.error(`❌ Error creating ${type} template:`, createError);
        // in-memory fallback
        return NextResponse.json({
          success: true,
          data: {
            _id: "default",
            templateType: type,
            ...defaults,
            isDefault: true,
            isActive: true,
          },
        });
      }
    }

    // ✅ Migration للـ 8 slots (للـ online + offline على حد سواء)
    template = await migrateSlotsIfNeeded(template, type);

    return NextResponse.json({ success: true, data: template });

  } catch (error) {
    console.error("❌ Error fetching group template:", error);
    return NextResponse.json({
      success: true,
      data: [],
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
      studentMaleContentAr,    studentMaleContentEn,
      studentFemaleContentAr,  studentFemaleContentEn,
      guardianFatherContentAr, guardianFatherContentEn,
      guardianMotherContentAr, guardianMotherContentEn,
      // legacy
      studentContentAr, studentContentEn,
      guardianContentAr, guardianContentEn,
      setAsDefault,
    } = body;

    const template = await WhatsAppTemplateAddGroup.findById(id);
    if (!template) {
      return NextResponse.json({ success: false, message: "Template not found" }, { status: 404 });
    }

    // ✅ 8 slots
    if (studentMaleContentAr    !== undefined) template.studentMaleContentAr    = studentMaleContentAr;
    if (studentMaleContentEn    !== undefined) template.studentMaleContentEn    = studentMaleContentEn;
    if (studentFemaleContentAr  !== undefined) template.studentFemaleContentAr  = studentFemaleContentAr;
    if (studentFemaleContentEn  !== undefined) template.studentFemaleContentEn  = studentFemaleContentEn;
    if (guardianFatherContentAr !== undefined) template.guardianFatherContentAr = guardianFatherContentAr;
    if (guardianFatherContentEn !== undefined) template.guardianFatherContentEn = guardianFatherContentEn;
    if (guardianMotherContentAr !== undefined) template.guardianMotherContentAr = guardianMotherContentAr;
    if (guardianMotherContentEn !== undefined) template.guardianMotherContentEn = guardianMotherContentEn;

    // legacy
    if (studentContentAr  !== undefined) template.studentContentAr  = studentContentAr;
    if (studentContentEn  !== undefined) template.studentContentEn  = studentContentEn;
    if (guardianContentAr !== undefined) template.guardianContentAr = guardianContentAr;
    if (guardianContentEn !== undefined) template.guardianContentEn = guardianContentEn;

    template.content = template.studentMaleContentAr || template.studentContentAr || "";

    // ✅ حدّث الـ variables حسب النوع
    const defaults = getDefaultsForType(template.templateType);
    template.variables = defaults.variables;

    if (setAsDefault) {
      await WhatsAppTemplateAddGroup.updateMany(
        {
          templateType: template.templateType,
          isDefault: true,
          _id: { $ne: id },
        },
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
      templateType = "group_welcome",
      name,
      studentMaleContentAr,    studentMaleContentEn,
      studentFemaleContentAr,  studentFemaleContentEn,
      guardianFatherContentAr, guardianFatherContentEn,
      guardianMotherContentAr, guardianMotherContentEn,
      description,
      setAsDefault,
    } = body;

    const defaults = getDefaultsForType(templateType);

    if (setAsDefault) {
      await WhatsAppTemplateAddGroup.updateMany(
        { templateType, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const template = new WhatsAppTemplateAddGroup({
      templateType,
      name: name || defaults.name,
      studentMaleContentAr:    studentMaleContentAr    || defaults.studentMaleContentAr,
      studentMaleContentEn:    studentMaleContentEn    || defaults.studentMaleContentEn,
      studentFemaleContentAr:  studentFemaleContentAr  || defaults.studentFemaleContentAr,
      studentFemaleContentEn:  studentFemaleContentEn  || defaults.studentFemaleContentEn,
      guardianFatherContentAr: guardianFatherContentAr || defaults.guardianFatherContentAr,
      guardianFatherContentEn: guardianFatherContentEn || defaults.guardianFatherContentEn,
      guardianMotherContentAr: guardianMotherContentAr || defaults.guardianMotherContentAr,
      guardianMotherContentEn: guardianMotherContentEn || defaults.guardianMotherContentEn,
      studentContentAr:  studentMaleContentAr    || defaults.studentMaleContentAr,
      studentContentEn:  studentMaleContentEn    || defaults.studentMaleContentEn,
      guardianContentAr: guardianFatherContentAr || defaults.guardianFatherContentAr,
      guardianContentEn: guardianFatherContentEn || defaults.guardianFatherContentEn,
      content: studentMaleContentAr || defaults.studentMaleContentAr,
      description: description || "",
      isDefault: setAsDefault || false,
      variables: defaults.variables,
      metadata: {
        createdBy: adminUser.id,
        lastModifiedBy: adminUser.id,
      },
    });

    await template.save();
    console.log(`✅ New ${templateType} template created`);

    return NextResponse.json({ success: true, data: template, message: "تم إنشاء القالب بنجاح" });

  } catch (error) {
    console.error("❌ Error creating template:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}