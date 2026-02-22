// /app/api/whatsapp/instructor-templates/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import WhatsAppTemplateInstructor from "../../../models/WhatsAppTemplateInstructor";
import { requireAdmin } from "@/utils/authMiddleware";

const DEFAULT_CONTENT_AR = `{salutation}،

يسرنا إعلامك بأن مجموعة جديدة قد تم تعيينها وتفعيلها بنجاح تحت إشرافك بالتفاصيل التالية:

📘 البرنامج: {courseName}
👥 المجموعة: {groupName}
📅 تاريخ الحصة الأولى: {startDate}
⏰ الموعد: {timeFrom} – {timeTo}
👦👧 عدد الطلاب: {studentCount}

📌 يرجى التأكد من التالي:
- مراجعة المنهج وخطة الجلسة قبل الحصة الأولى
- فتح رابط الاجتماع قبل ١٠-١٥ دقيقة على الأقل
- التأكد من جاهزية جميع الأدوات والمواد المطلوبة
- تسجيل الحضور وتقييم الجلسة بعد كل حصة

نقدر التزامك واحترافيتك ونتمنى لك رحلة تعليمية ناجحة ومؤثرة مع طلابك 🚀

مع أطيب التحيات،
إدارة Code School 💻`;

const DEFAULT_CONTENT_EN = `{salutation},

We are pleased to inform you that a new group has been successfully assigned and activated under your supervision with the following details:

📘 Program: {courseName}
👥 Group: {groupName}
📅 First Session Date: {startDate}
⏰ Schedule: {timeFrom} – {timeTo}
👦👧 Students Enrolled: {studentCount}

📌 Please ensure the following:
- Review the curriculum and session plan before the first session
- Open the meeting link at least 10-15 minutes early
- Ensure all required tools and materials are ready
- Record attendance and evaluate the session after each class

We appreciate your commitment and professionalism. Wishing you a successful and impactful learning journey with your students! 🚀

Best regards,
Code School Administration 💻`;

const DEFAULT_VARIABLES = [
  { key: "{salutation}", label: "التحية / Salutation", description: "عزيزي/عزيزتي + الاسم" },
  { key: "{instructorName}", label: "اسم المدرب / Instructor Name", description: "الاسم المختصر" },
  { key: "{groupName}", label: "اسم المجموعة / Group Name", description: "اسم المجموعة" },
  { key: "{courseName}", label: "اسم الكورس / Course Name", description: "اسم البرنامج" },
  { key: "{startDate}", label: "تاريخ البدء / Start Date", description: "تاريخ بدء المجموعة" },
  { key: "{timeFrom}", label: "وقت البداية / Time From", description: "وقت بدء الحصة" },
  { key: "{timeTo}", label: "وقت النهاية / Time To", description: "وقت نهاية الحصة" },
  { key: "{studentCount}", label: "عدد الطلاب / Student Count", description: "عدد الطلاب المسجلين" },
];

// ✅ GET: جلب القالب
export async function GET(req) {
  try {
    await connectDB();

    let template = await WhatsAppTemplateInstructor.findOne({
      templateType: "group_activation",
      isDefault: true,
      isActive: true,
    }).lean();

    if (!template) {
      console.log("⚠️ No default instructor template found, creating one...");
      try {
        const newTemplate = new WhatsAppTemplateInstructor({
          templateType: "group_activation",
          name: "قالب تفعيل المجموعة - الافتراضي",
          contentAr: DEFAULT_CONTENT_AR,
          contentEn: DEFAULT_CONTENT_EN,
          content: DEFAULT_CONTENT_AR,
          description: "رسالة إخطار المدرب الافتراضية عند تفعيل مجموعة",
          isDefault: true,
          isActive: true,
          variables: DEFAULT_VARIABLES,
        });
        await newTemplate.save();
        template = newTemplate.toObject();
        console.log("✅ Default instructor template created");
      } catch (createError) {
        console.error("❌ Error creating template:", createError);
        // Fallback in memory
        template = {
          _id: "default",
          templateType: "group_activation",
          name: "Default Template",
          contentAr: DEFAULT_CONTENT_AR,
          contentEn: DEFAULT_CONTENT_EN,
          content: DEFAULT_CONTENT_AR,
          isDefault: true,
          isActive: true,
          variables: DEFAULT_VARIABLES,
        };
      }
    }

    // ✅ migration: لو في قالب قديم بدون contentAr/contentEn
    if (!template.contentAr && template.content) {
      template.contentAr = template.content;
      template.contentEn = DEFAULT_CONTENT_EN;
    }
    if (!template.contentAr) template.contentAr = DEFAULT_CONTENT_AR;
    if (!template.contentEn) template.contentEn = DEFAULT_CONTENT_EN;

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error("❌ Error fetching instructor template:", error);
    return NextResponse.json({
      success: true,
      data: {
        _id: "default",
        contentAr: DEFAULT_CONTENT_AR,
        contentEn: DEFAULT_CONTENT_EN,
        content: DEFAULT_CONTENT_AR,
        variables: DEFAULT_VARIABLES,
      },
    });
  }
}

// ✅ PUT: تحديث القالب
export async function PUT(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const adminUser = authCheck.user;
    await connectDB();

    const body = await req.json();
    const { id, contentAr, contentEn, content, setAsDefault } = body;

    console.log("📝 UPDATE instructor template:", { id, setAsDefault });

    const template = await WhatsAppTemplateInstructor.findById(id);
    if (!template) {
      return NextResponse.json({ success: false, message: "Template not found" }, { status: 404 });
    }

    // ✅ تحديث المحتوى
    if (contentAr !== undefined) template.contentAr = contentAr;
    if (contentEn !== undefined) template.contentEn = contentEn;
    // backward compat
    if (content !== undefined) template.content = content;
    else if (contentAr !== undefined) template.content = contentAr;

    if (setAsDefault) {
      await WhatsAppTemplateInstructor.updateMany(
        { templateType: "group_activation", isDefault: true, _id: { $ne: id } },
        { $set: { isDefault: false } }
      );
      template.isDefault = true;
    }

    template.metadata.lastModifiedBy = adminUser.id;
    template.metadata.updatedAt = new Date();
    await template.save();

    return NextResponse.json({ success: true, data: template, message: "تم تحديث القالب بنجاح" });
  } catch (error) {
    console.error("❌ Error updating instructor template:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
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
    const { name, contentAr, contentEn, description, setAsDefault } = body;

    if (setAsDefault) {
      await WhatsAppTemplateInstructor.updateMany(
        { templateType: "group_activation", isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const template = new WhatsAppTemplateInstructor({
      templateType: "group_activation",
      name: name || "قالب جديد",
      contentAr: contentAr || DEFAULT_CONTENT_AR,
      contentEn: contentEn || DEFAULT_CONTENT_EN,
      content: contentAr || DEFAULT_CONTENT_AR,
      description: description || "",
      isDefault: setAsDefault || false,
      variables: DEFAULT_VARIABLES,
      metadata: {
        createdBy: adminUser.id,
        lastModifiedBy: adminUser.id,
      },
    });

    await template.save();

    return NextResponse.json({ success: true, data: template, message: "تم إنشاء القالب بنجاح" });
  } catch (error) {
    console.error("❌ Error creating instructor template:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}