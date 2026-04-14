// /src/app/api/whatsapp/templates/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import WhatsAppTemplate from "../../../models/WhatsAppTemplate";
import { requireAdmin } from "@/utils/authMiddleware";

const DEFAULT_STUDENT_TEMPLATE = `{salutation_ar}
{salutation_en}

{welcome_ar} في Code School! 🌟
Welcome to Code School! 🌟

🌍 اختر لغتك المفضلة
حتى نتمكن من التواصل معك بسهولة وراحة، من فضلك أخبرنا باللغة التي تفضل استقبال رسائلنا بها:

🌍 Choose your preferred language
To ensure smooth and comfortable communication, please tell us which language you prefer to receive our messages in:

➡️ اللغة العربية
➡️ English

مع خالص التحية،
فريق Code School 💻

Best regards,
The Code School Team 💻

🌍 شكراً لثقتكم في Code School
🌍 Thank you for trusting Code School`;

const DEFAULT_GUARDIAN_TEMPLATE = `{guardianSalutation_ar}

تحية طيبة وبعد،
Greetings,

يسعدنا إبلاغكم بأن {studentGender_ar} **{studentName_ar}** قد انضم/انضمت رسمياً إلى عائلتنا التعليمية اليوم. 🎉
We are pleased to inform you that your child **{studentName_en}** has officially joined our educational family today. 🎉

سأكون متاحاً شخصياً للرد على أي استفسارات لديكم في أي وقت.
I will personally be available to answer any questions you may have at any time.

مع خالص الاحترام والتقدير،
فريق Code School 💻

Best regards,
The Code School Team 💻

🌍 شكراً لثقتكم في Code School
🌍 Thank you for trusting Code School`;

const DEFAULT_STUDENT_LANG_CONFIRMATION_AR = `✅ تم تأكيد اللغة المفضلة

{salutation_ar}،

تم تعيين *اللغة العربية* كلغة التواصل الرسمية معك.

📌 ماذا يحدث الآن؟
- جميع الرسائل القادمة ستكون بالعربية
- المحتوى التعليمي والدعم سيكون متاحاً بالعربية

نحن متحمسون لوجودك معنا! 🚀

مع أطيب التحيات،
فريق Code School 💻

🌍 شكراً لاختيارك Code School`;

const DEFAULT_STUDENT_LANG_CONFIRMATION_EN = `✅ Language Preference Confirmed

{salutation_en},

Your preferred language has been set to *English*.

📌 What happens next?
- All future messages will be sent in English
- Course materials and support will be available in English

We're excited to have you on board! 🚀

Best regards,
The Code School Team 💻

🌍 Thank you for choosing Code School`;

const DEFAULT_GUARDIAN_LANG_CONFIRMATION_AR = `{guardianSalutation_ar}،

يسعدنا إبلاغكم بأن {studentGender_ar} **{studentName_ar}** قام/ت باختيار *اللغة العربية* كلغة مفضلة للتواصل بنجاح.

📌 ماذا يعني هذا؟
- جميع الرسائل القادمة لـ{studentGender_ar} ستكون باللغة العربية

شكراً لثقتكم المستمرة في Code School.

مع أطيب التحيات،
فريق Code School 💻`;

const DEFAULT_GUARDIAN_LANG_CONFIRMATION_EN = `{guardianSalutation_en},

We are pleased to inform you that your {studentGender_en} **{studentName_en}** has successfully selected *English* as their preferred communication language.

📌 What this means?
- All future messages will be sent in English

Thank you for your continued trust in Code School.

Best regards,
The Code School Team 💻`;

const STUDENT_VARIABLES = [
  { key: "{salutation_ar}", label: "التحية (عربي)", description: "عزيزي الطالب / عزيزتي الطالبة" },
  { key: "{salutation_en}", label: "التحية (إنجليزي)", description: "Dear student" },
  { key: "{welcome_ar}", label: "الترحيب", description: "أهلاً بك / أهلاً بكِ" },
  { key: "{name_ar}", label: "الاسم (عربي)", description: "الاسم المختصر بالعربي" },
  { key: "{name_en}", label: "الاسم (إنجليزي)", description: "الاسم المختصر بالإنجليزي" },
  { key: "{fullName}", label: "الاسم الكامل", description: "الاسم الكامل للطالب" },
  { key: "{you_ar}", label: "أنت/أنتِ", description: "ضمير المخاطب حسب الجنس" },
];

const GUARDIAN_VARIABLES = [
  { key: "{guardianSalutation_ar}", label: "التحية الكاملة لولي الأمر", description: "عزيزي الأستاذ / عزيزتي السيدة + الاسم" },
  { key: "{guardianName_ar}", label: "اسم ولي الأمر (عربي)", description: "الاسم المختصر" },
  { key: "{guardianName_en}", label: "اسم ولي الأمر (إنجليزي)", description: "الاسم المختصر" },
  { key: "{studentName_ar}", label: "اسم الطالب (عربي)", description: "الاسم المختصر بالعربي" },
  { key: "{studentName_en}", label: "اسم الطالب (إنجليزي)", description: "الاسم المختصر بالإنجليزي" },
  { key: "{studentGender_ar}", label: "جنس الطالب", description: "الابن / الابنة" },
  { key: "{relationship_ar}", label: "العلاقة", description: "الأب / الأم / الوصي" },
];

const STUDENT_CONFIRMATION_VARIABLES = [
  { key: "{salutation_ar}", label: "التحية (عربي)", description: "عزيزي الطالب / عزيزتي الطالبة" },
  { key: "{salutation_en}", label: "التحية (إنجليزي)", description: "Dear student" },
  { key: "{name_ar}", label: "الاسم (عربي)", description: "الاسم المختصر بالعربي" },
  { key: "{name_en}", label: "الاسم (إنجليزي)", description: "الاسم المختصر بالإنجليزي" },
  { key: "{selectedLanguage_ar}", label: "اللغة المختارة (عربي)", description: "العربية / الإنجليزية" },
  { key: "{selectedLanguage_en}", label: "اللغة المختارة (إنجليزي)", description: "Arabic / English" },
];

const GUARDIAN_CONFIRMATION_VARIABLES = [
  { key: "{guardianSalutation_ar}", label: "التحية الكاملة لولي الأمر (عربي)", description: "عزيزي الأستاذ + الاسم" },
  { key: "{guardianSalutation_en}", label: "التحية لولي الأمر (إنجليزي)", description: "Dear Mr./Mrs." },
  { key: "{studentName_ar}", label: "اسم الطالب (عربي)", description: "الاسم المختصر بالعربي" },
  { key: "{studentName_en}", label: "اسم الطالب (إنجليزي)", description: "الاسم المختصر بالإنجليزي" },
  { key: "{studentGender_ar}", label: "جنس الطالب (عربي)", description: "الابن / الابنة" },
  { key: "{studentGender_en}", label: "جنس الطالب (إنجليزي)", description: "son / daughter" },
  { key: "{selectedLanguage_ar}", label: "اللغة المختارة (عربي)", description: "العربية / الإنجليزية" },
  { key: "{selectedLanguage_en}", label: "اللغة المختارة (إنجليزي)", description: "Arabic / English" },
];

const TEMPLATE_DEFAULTS = {
  student_welcome: {
    name: "رسالة الطالب - الافتراضية",
    content: DEFAULT_STUDENT_TEMPLATE,
    description: "رسالة اختيار اللغة للطالب - ثنائية اللغة",
    variables: STUDENT_VARIABLES,
  },
  guardian_notification: {
    name: "رسالة ولي الأمر - الافتراضية",
    content: DEFAULT_GUARDIAN_TEMPLATE,
    description: "إشعار تسجيل الطالب لولي الأمر - ثنائية اللغة",
    variables: GUARDIAN_VARIABLES,
  },
  student_language_confirmation: {
    name: "تأكيد اللغة للطالب",
    content: DEFAULT_STUDENT_LANG_CONFIRMATION_AR,
    contentAr: DEFAULT_STUDENT_LANG_CONFIRMATION_AR,
    contentEn: DEFAULT_STUDENT_LANG_CONFIRMATION_EN,
    description: "رسالة تأكيد اللغة للطالب - باللغة المختارة فقط",
    variables: STUDENT_CONFIRMATION_VARIABLES,
  },
  guardian_language_confirmation: {
    name: "تأكيد اللغة لولي الأمر",
    content: DEFAULT_GUARDIAN_LANG_CONFIRMATION_AR,
    contentAr: DEFAULT_GUARDIAN_LANG_CONFIRMATION_AR,
    contentEn: DEFAULT_GUARDIAN_LANG_CONFIRMATION_EN,
    description: "إشعار تأكيد اللغة لولي الأمر - باللغة المختارة فقط",
    variables: GUARDIAN_CONFIRMATION_VARIABLES,
  },
};

const ALL_TEMPLATE_TYPES = Object.keys(TEMPLATE_DEFAULTS);

async function createMissingDefaultTemplates(existingTemplates) {
  const existingTypes = existingTemplates.map((t) => t.templateType);
  const missingTypes = ALL_TEMPLATE_TYPES.filter((type) => !existingTypes.includes(type));
  if (missingTypes.length === 0) return [];

  console.log(`📝 Creating missing templates: ${missingTypes.join(", ")}`);

  return await Promise.all(
    missingTypes.map(async (type) => {
      const def = TEMPLATE_DEFAULTS[type];
      const t = new WhatsAppTemplate({
        templateType: type,
        name: def.name,
        content: def.content,
        ...(def.contentAr && { contentAr: def.contentAr }),
        ...(def.contentEn && { contentEn: def.contentEn }),
        description: def.description,
        isDefault: true,
        isActive: true,
        variables: def.variables,
      });
      await t.save();
      console.log(`✅ Created: ${type}`);
      return t;
    })
  );
}

// ============================================================
// ✅ GET
// ============================================================
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const templateType = searchParams.get("templateType");
    const getDefault = searchParams.get("default") === "true";

    let query = { isActive: true };
    if (templateType) query.templateType = templateType;
    if (getDefault) query.isDefault = true;

    let templates = await WhatsAppTemplate.find(query)
      .populate("metadata.createdBy", "name email")
      .populate("metadata.lastModifiedBy", "name email")
      .sort({ isDefault: -1, "metadata.createdAt": -1 });

    // ✅ تأكد إن الـ 4 أنواع كلها موجودة
    if (getDefault && !templateType) {
      const newTemplates = await createMissingDefaultTemplates(templates);
      if (newTemplates.length > 0) templates = [...templates, ...newTemplates];
    }

    // ✅ لو مفيش حاجة خالص
    if (getDefault && templates.length === 0) {
      const allNew = await Promise.all(
        ALL_TEMPLATE_TYPES.map(async (type) => {
          const def = TEMPLATE_DEFAULTS[type];
          const t = new WhatsAppTemplate({
            templateType: type,
            name: def.name,
            content: def.content,
            ...(def.contentAr && { contentAr: def.contentAr }),
            ...(def.contentEn && { contentEn: def.contentEn }),
            description: def.description,
            isDefault: true,
            isActive: true,
            variables: def.variables,
          });
          await t.save();
          return t;
        })
      );
      return NextResponse.json({
        success: true,
        data: allNew,
        message: "تم إنشاء جميع القوالب الافتراضية",
      });
    }

    // ✅ إرجاع البيانات مباشرة بدون auto-fix
    return NextResponse.json({
      success: true,
      data: templates,
      count: templates.length,
    });
  } catch (error) {
    console.error("❌ Error fetching templates:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch templates", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================================
// ✅ POST
// ============================================================
export async function POST(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const adminUser = authCheck.user;
    await connectDB();

    const { templateType, name, content, contentAr, contentEn, description, setAsDefault } = await req.json();

    if (setAsDefault) {
      await WhatsAppTemplate.updateMany(
        { templateType, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const template = new WhatsAppTemplate({
      templateType,
      name,
      content: contentAr || content,
      ...(contentAr !== undefined && { contentAr }),
      ...(contentEn !== undefined && { contentEn }),
      description: description || "",
      isDefault: setAsDefault || false,
      isActive: true,
      variables: TEMPLATE_DEFAULTS[templateType]?.variables || [],
      metadata: { createdBy: adminUser.id, lastModifiedBy: adminUser.id },
    });

    await template.save();
    return NextResponse.json({ success: true, data: template, message: "تم إنشاء القالب بنجاح" });
  } catch (error) {
    console.error("❌ Error creating template:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create template", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================================
// ✅ PUT
// ============================================================
export async function PUT(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const adminUser = authCheck.user;
    await connectDB();

    const { id, name, content, contentAr, contentEn, description, isActive, setAsDefault } = await req.json();

    const template = await WhatsAppTemplate.findById(id);
    if (!template) {
      return NextResponse.json({ success: false, message: "Template not found" }, { status: 404 });
    }

    if (setAsDefault) {
      await WhatsAppTemplate.updateMany(
        { templateType: template.templateType, isDefault: true, _id: { $ne: id } },
        { $set: { isDefault: false } }
      );
      template.isDefault = true;
    }

    if (name) template.name = name;
    if (description !== undefined) template.description = description;
    if (isActive !== undefined) template.isActive = isActive;

    if (contentAr !== undefined) {
      template.contentAr = contentAr;
      template.content   = contentAr;
    } else if (content) {
      template.content = content;
    }
    if (contentEn !== undefined) template.contentEn = contentEn;

    template.metadata.lastModifiedBy = adminUser.id;
    template.metadata.updatedAt = new Date();

    await template.save();
    return NextResponse.json({ success: true, data: template, message: "تم تحديث القالب بنجاح" });
  } catch (error) {
    console.error("❌ Error updating template:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update template", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================================
// ✅ PATCH - إعادة ضبط القوالب الافتراضية
// ============================================================
export async function PATCH(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const deleted = await WhatsAppTemplate.deleteMany({ isDefault: true });
    console.log(`🗑️ Deleted ${deleted.deletedCount} old default templates`);

    const newTemplates = await Promise.all(
      ALL_TEMPLATE_TYPES.map(async (type) => {
        const def = TEMPLATE_DEFAULTS[type];
        const t = new WhatsAppTemplate({
          templateType: type,
          name: def.name,
          content: def.content,
          ...(def.contentAr && { contentAr: def.contentAr }),
          ...(def.contentEn && { contentEn: def.contentEn }),
          description: def.description,
          isDefault: true,
          isActive: true,
          variables: def.variables,
        });
        await t.save();
        return t;
      })
    );

    return NextResponse.json({
      success: true,
      message: `✅ تم إعادة ضبط ${newTemplates.length} قوالب افتراضية`,
      data: Object.fromEntries(
        newTemplates.map((t) => [t.templateType, { id: t._id }])
      ),
    });
  } catch (error) {
    console.error("❌ Error resetting templates:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ============================================================
// ✅ DELETE
// ============================================================
export async function DELETE(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    const template = await WhatsAppTemplate.findById(id);
    if (!template) {
      return NextResponse.json({ success: false, message: "Template not found" }, { status: 404 });
    }

    if (template.isDefault) {
      return NextResponse.json(
        { success: false, message: "Cannot delete default template. Set another template as default first." },
        { status: 400 }
      );
    }

    await WhatsAppTemplate.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "تم حذف القالب بنجاح" });
  } catch (error) {
    console.error("❌ Error deleting template:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete template", error: error.message },
      { status: 500 }
    );
  }
}