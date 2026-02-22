// /src/app/api/whatsapp/templates/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import WhatsAppTemplate from "../../../models/WhatsAppTemplate";
import { requireAdmin } from "@/utils/authMiddleware";

// ✅ القوالب الافتراضية - بالمتغيرات الديناميكية الصحيحة
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

// ✅ دالة مساعدة: هل القالب يستخدم المتغيرات؟
const templateUsesVariables = (content, type) => {
  if (type === "student_welcome") {
    return content.includes("{salutation_ar}") || content.includes("{welcome_ar}");
  }
  if (type === "guardian_notification") {
    return content.includes("{guardianSalutation_ar}") || content.includes("{studentGender_ar}");
  }
  return false;
};

// ✅ GET: جلب القوالب
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const templateType = searchParams.get("templateType");
    const getDefault = searchParams.get("default") === "true";

    let query = { isActive: true };
    if (templateType) query.templateType = templateType;
    if (getDefault) query.isDefault = true;

    const templates = await WhatsAppTemplate.find(query)
      .populate("metadata.createdBy", "name email")
      .populate("metadata.lastModifiedBy", "name email")
      .sort({ "metadata.createdAt": -1 });

    // ✅ لا يوجد قوالب - أنشئها بالمتغيرات
    if (getDefault && templates.length === 0) {
      console.log("📝 No default templates found - creating with variables...");

      const studentTemplate = new WhatsAppTemplate({
        templateType: "student_welcome",
        name: "رسالة الطالب - الافتراضية",
        content: DEFAULT_STUDENT_TEMPLATE,
        description: "رسالة اختيار اللغة للطالب - متغيرات ديناميكية",
        isDefault: true,
        isActive: true,
        variables: STUDENT_VARIABLES,
      });

      const guardianTemplate = new WhatsAppTemplate({
        templateType: "guardian_notification",
        name: "رسالة ولي الأمر - الافتراضية",
        content: DEFAULT_GUARDIAN_TEMPLATE,
        description: "إشعار تسجيل الطالب لولي الأمر - متغيرات ديناميكية",
        isDefault: true,
        isActive: true,
        variables: GUARDIAN_VARIABLES,
      });

      await studentTemplate.save();
      await guardianTemplate.save();

      console.log("✅ Default templates created with variables");

      return NextResponse.json({
        success: true,
        data: [studentTemplate, guardianTemplate],
        message: "تم إنشاء القوالب الافتراضية بالمتغيرات",
      });
    }

    // ✅ يوجد قوالب - تحقق وحدّث أي قالب لا يستخدم المتغيرات
    const updatedTemplates = [];
    for (const template of templates) {
      if (!templateUsesVariables(template.content, template.templateType)) {
        console.log(`🔧 Template "${template.templateType}" has no variables - auto-fixing...`);

        const newContent = template.templateType === "student_welcome"
          ? DEFAULT_STUDENT_TEMPLATE
          : DEFAULT_GUARDIAN_TEMPLATE;

        const updated = await WhatsAppTemplate.findByIdAndUpdate(
          template._id,
          {
            $set: {
              content: newContent,
              "metadata.updatedAt": new Date(),
            }
          },
          { new: true }
        );

        updatedTemplates.push(updated);
        console.log(`✅ Auto-fixed template: ${template.templateType}`);
      } else {
        updatedTemplates.push(template);
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedTemplates,
      count: updatedTemplates.length,
    });
  } catch (error) {
    console.error("❌ Error fetching templates:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch templates", error: error.message },
      { status: 500 }
    );
  }
}

// ✅ POST: إنشاء قالب جديد
export async function POST(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const adminUser = authCheck.user;
    await connectDB();

    const body = await req.json();
    const { templateType, name, content, description, setAsDefault } = body;

    if (setAsDefault) {
      await WhatsAppTemplate.updateMany(
        { templateType, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const template = new WhatsAppTemplate({
      templateType,
      name,
      content,
      description: description || "",
      isDefault: setAsDefault || false,
      isActive: true,
      variables: templateType === "student_welcome" ? STUDENT_VARIABLES : GUARDIAN_VARIABLES,
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
      { success: false, message: "Failed to create template", error: error.message },
      { status: 500 }
    );
  }
}

// ✅ PUT: تحديث قالب موجود
export async function PUT(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const adminUser = authCheck.user;
    await connectDB();

    const body = await req.json();
    const { id, name, content, description, isActive, setAsDefault } = body;

    const template = await WhatsAppTemplate.findById(id);

    if (!template) {
      return NextResponse.json(
        { success: false, message: "Template not found" },
        { status: 404 }
      );
    }

    if (setAsDefault) {
      await WhatsAppTemplate.updateMany(
        { templateType: template.templateType, isDefault: true, _id: { $ne: id } },
        { $set: { isDefault: false } }
      );
      template.isDefault = true;
    }

    if (name) template.name = name;
    if (content) template.content = content;
    if (description !== undefined) template.description = description;
    if (isActive !== undefined) template.isActive = isActive;

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
      { success: false, message: "Failed to update template", error: error.message },
      { status: 500 }
    );
  }
}

// ✅ PATCH: إعادة ضبط القوالب الافتراضية بالمتغيرات الصحيحة
export async function PATCH(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    console.log("🔄 Resetting all default templates to use variables...");

    // احذف القوالب الافتراضية القديمة
    const deleted = await WhatsAppTemplate.deleteMany({ isDefault: true });
    console.log(`🗑️ Deleted ${deleted.deletedCount} old default templates`);

    // أنشئ قوالب جديدة بالمتغيرات
    const studentTemplate = new WhatsAppTemplate({
      templateType: "student_welcome",
      name: "رسالة الطالب - الافتراضية",
      content: DEFAULT_STUDENT_TEMPLATE,
      description: "رسالة اختيار اللغة للطالب - متغيرات ديناميكية",
      isDefault: true,
      isActive: true,
      variables: STUDENT_VARIABLES,
    });

    const guardianTemplate = new WhatsAppTemplate({
      templateType: "guardian_notification",
      name: "رسالة ولي الأمر - الافتراضية",
      content: DEFAULT_GUARDIAN_TEMPLATE,
      description: "إشعار تسجيل الطالب لولي الأمر - متغيرات ديناميكية",
      isDefault: true,
      isActive: true,
      variables: GUARDIAN_VARIABLES,
    });

    await studentTemplate.save();
    await guardianTemplate.save();

    console.log("✅ Default templates reset successfully with variables");

    return NextResponse.json({
      success: true,
      message: "✅ تم إعادة ضبط القوالب بالمتغيرات الصحيحة",
      data: {
        student: {
          id: studentTemplate._id,
          content: studentTemplate.content,
          variables: STUDENT_VARIABLES.map(v => v.key),
        },
        guardian: {
          id: guardianTemplate._id,
          content: guardianTemplate.content,
          variables: GUARDIAN_VARIABLES.map(v => v.key),
        },
      },
    });
  } catch (error) {
    console.error("❌ Error resetting templates:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// ✅ DELETE: حذف قالب
export async function DELETE(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    const template = await WhatsAppTemplate.findById(id);

    if (!template) {
      return NextResponse.json(
        { success: false, message: "Template not found" },
        { status: 404 }
      );
    }

    if (template.isDefault) {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot delete default template. Set another template as default first.",
        },
        { status: 400 }
      );
    }

    await WhatsAppTemplate.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "تم حذف القالب بنجاح",
    });
  } catch (error) {
    console.error("❌ Error deleting template:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete template", error: error.message },
      { status: 500 }
    );
  }
}