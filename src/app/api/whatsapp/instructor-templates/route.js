// /app/api/whatsapp/instructor-templates/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import WhatsAppTemplateInstructor from "../../../models/WhatsAppTemplateInstructor";
import { requireAdmin } from "@/utils/authMiddleware";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ═══════════════════════════════════════════════════════════════════════
// 📘 DEFAULT CONTENT — ONLINE
// ═══════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════
// 📍 DEFAULT CONTENT — OFFLINE
// ═══════════════════════════════════════════════════════════════════════
const DEFAULT_OFFLINE_CONTENT_AR = `{instructorSalutation} 👋

حبيت أبلغك إنه تم إسناد جروب *{groupName}* الخاص بكورس *{courseName}* لحضرتك ✨
دي كل تفاصيل البداية عشان تكون جاهز:

📘 الـ Course: {courseName}
👥 الـ Group: {groupName}
📅 تاريخ البداية: {startDate}
⏰ المعاد: من {timeFrom} إلى {timeTo}

📍 المكان: {placeName}
📌 العنوان: {address}
🗺️ اللوكيشن: {mapsLink}

متحمسين جداً لبداية قوية معاك، وبالتوفيق يا هندسة 🌟

نور ✨
فريق الأوبيريشن - Code School`;

const DEFAULT_OFFLINE_CONTENT_EN = `{instructorSalutation} 👋

We're pleased to assign you group *{groupName}* for *{courseName}* ✨
Here are all the starting details to get you ready:

📘 Course: {courseName}
👥 Group: {groupName}
📅 Start Date: {startDate}
⏰ Time: From {timeFrom} to {timeTo}

📍 Location: {placeName}
📌 Address: {address}
🗺️ Maps: {mapsLink}

Excited for a strong start with you, best of luck! 🌟

Nour ✨
Operations Team - Code School`;

// ═══════════════════════════════════════════════════════════════════════
// 📋 DEFAULT VARIABLES
// ═══════════════════════════════════════════════════════════════════════
const DEFAULT_VARIABLES = [
  { key: "{salutation}",     label: "التحية / Salutation",                  description: "عزيزي/عزيزتي + الاسم" },
  { key: "{instructorName}", label: "اسم المدرب / Instructor Name",          description: "الاسم المختصر" },
  { key: "{groupName}",      label: "اسم المجموعة / Group Name",             description: "اسم المجموعة" },
  { key: "{courseName}",     label: "اسم الكورس / Course Name",              description: "اسم البرنامج" },
  { key: "{startDate}",      label: "تاريخ البدء / Start Date",              description: "تاريخ بدء المجموعة" },
  { key: "{timeFrom}",       label: "وقت البداية / Time From",              description: "وقت بدء الحصة" },
  { key: "{timeTo}",         label: "وقت النهاية / Time To",                description: "وقت نهاية الحصة" },
  { key: "{studentCount}",   label: "عدد الطلاب / Student Count",            description: "عدد الطلاب المسجلين" },
];

// ═══════════════════════════════════════════════════════════════════════
// 📋 INSTRUCTOR VARIABLES MAP — لكل نوع قالب
// ═══════════════════════════════════════════════════════════════════════
const INSTRUCTOR_VARIABLES_MAP = {
  // ── ONLINE ──────────────────────────────────────────────────────────
  group_activation: [
    { key: "{instructorSalutation}", label: "تحية المدرب / Instructor Salutation", description: "" },
    { key: "{courseName}",           label: "اسم الكورس / Course Name",           description: "" },
    { key: "{groupName}",            label: "اسم المجموعة / Group Name",           description: "" },
    { key: "{startDate}",            label: "تاريخ البداية / Start Date",          description: "" },
    { key: "{timeFrom}",             label: "وقت البداية / Time From",             description: "" },
    { key: "{timeTo}",               label: "وقت النهاية / Time To",               description: "" },
    { key: "{studentCount}",         label: "عدد الطلاب / Student Count",          description: "" },
    { key: "{meetingLink}",          label: "لينك الحصة / Meeting Link",           description: "" },
  ],

  // ── OFFLINE ─────────────────────────────────────────────────────────
  group_activation_offline: [
    { key: "{instructorSalutation}", label: "تحية المدرب / Instructor Salutation", description: "" },
    { key: "{courseName}",           label: "اسم الكورس / Course Name",           description: "" },
    { key: "{groupName}",            label: "اسم المجموعة / Group Name",           description: "" },
    { key: "{startDate}",            label: "تاريخ البداية / Start Date",          description: "" },
    { key: "{timeFrom}",             label: "وقت البداية / Time From",             description: "" },
    { key: "{timeTo}",               label: "وقت النهاية / Time To",               description: "" },
    { key: "{studentCount}",         label: "عدد الطلاب / Student Count",          description: "" },
    { key: "{placeName}",            label: "اسم المكان / Location Name",         description: "" },
    { key: "{address}",              label: "العنوان / Address",                   description: "" },
    { key: "{mapsLink}",             label: "رابط الخريطة / Maps Link",            description: "" },
  ],

  // ── REMINDERS ───────────────────────────────────────────────────────
  reminder_24h: [
    { key: "{instructorSalutation}", label: "تحية المدرب",  description: "" },
    { key: "{sessionName}",          label: "اسم الحصة",    description: "" },
    { key: "{sessionDescription}",   label: "وصف الحصة",    description: "" },
    { key: "{date}",                 label: "التاريخ",       description: "" },
    { key: "{time}",                 label: "الوقت",         description: "" },
    { key: "{meetingLink}",          label: "رابط الاجتماع", description: "" },
    { key: "{username}",             label: "Username",     description: "" },
    { key: "{password}",             label: "Password",     description: "" },
    { key: "{groupName}",            label: "اسم المجموعة", description: "" },
    { key: "{studentCount}",         label: "عدد الطلاب",   description: "" },
  ],
  reminder_15min: [
    { key: "{instructorSalutation}", label: "تحية المدرب",  description: "" },
    { key: "{sessionName}",          label: "اسم الحصة",    description: "" },
    { key: "{sessionDescription}",   label: "وصف الحصة",    description: "" },
    { key: "{time}",                 label: "الوقت",         description: "" },
    { key: "{meetingLink}",          label: "رابط الاجتماع", description: "" },
    { key: "{username}",             label: "Username",     description: "" },
    { key: "{password}",             label: "Password",     description: "" },
    { key: "{groupName}",            label: "اسم المجموعة", description: "" },
  ],
  reminder_24h_offline: [
    { key: "{instructorSalutation}", label: "تحية المدرب",  description: "" },
    { key: "{sessionName}",          label: "اسم الحصة",    description: "" },
    { key: "{date}",                 label: "التاريخ",       description: "" },
    { key: "{time}",                 label: "الوقت",         description: "" },
    { key: "{placeName}",            label: "اسم المكان",   description: "" },
    { key: "{address}",              label: "العنوان",       description: "" },
    { key: "{mapsLink}",             label: "رابط الخريطة", description: "" },
    { key: "{groupName}",            label: "اسم المجموعة", description: "" },
    { key: "{studentCount}",         label: "عدد الطلاب",   description: "" },
  ],
  reminder_30min_offline: [
    { key: "{instructorSalutation}", label: "تحية المدرب",  description: "" },
    { key: "{sessionName}",          label: "اسم الحصة",    description: "" },
    { key: "{time}",                 label: "الوقت",         description: "" },
    { key: "{placeName}",            label: "المكان",        description: "" },
    { key: "{mapsLink}",             label: "رابط الخريطة", description: "" },
    { key: "{groupName}",            label: "اسم المجموعة", description: "" },
  ],
  pre_attendance_ping: [
    { key: "{instructorSalutation}", label: "تحية المدرب", description: "" },
    { key: "{sessionName}",          label: "اسم الحصة",   description: "" },
  ],

  // ── MAKE-UP ─────────────────────────────────────────────────────────
  makeup_session_instructor: [
    { key: "{instructorSalutation}",  label: "تحية المدرب",              description: "" },
    { key: "{instructorName}",        label: "اسم المدرب",               description: "" },
    { key: "{studentName}",           label: "اسم الطالب",               description: "" },
    { key: "{courseName}",            label: "اسم الكورس",               description: "" },
    { key: "{groupName}",             label: "اسم المجموعة",             description: "" },
    { key: "{groupCode}",             label: "كود المجموعة",             description: "" },
    { key: "{originalDate}",          label: "تاريخ الحصة الأصلية",      description: "" },
    { key: "{originalTime}",          label: "وقت الحصة الأصلية",        description: "" },
    { key: "{originalSessionTitle}",  label: "عنوان الحصة الأصلية",      description: "" },
    { key: "{newDate}",               label: "تاريخ الحصة التعويضية",    description: "" },
    { key: "{newTime}",               label: "وقت الحصة التعويضية",      description: "" },
    { key: "{sessionLocationBlock}",  label: "معلومات المكان / اللينك",  description: "" },
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// 🔧 HELPER: يرجّع الـ fallbacks الصح حسب نوع القالب
// ═══════════════════════════════════════════════════════════════════════
function getFallbackContent(templateType) {
  const isOfflineType = templateType === "group_activation_offline";
  return {
    contentAr: isOfflineType ? DEFAULT_OFFLINE_CONTENT_AR : DEFAULT_CONTENT_AR,
    contentEn: isOfflineType ? DEFAULT_OFFLINE_CONTENT_EN : DEFAULT_CONTENT_EN,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// ✅ GET: جلب القوالب
//   ?type=X          → قالب واحد (object) من النوع ده
//   ?default=true    → القالب الافتراضي لـ group_activation
//   (بدون باراميتر)   → كل القوالب (array)
// ═══════════════════════════════════════════════════════════════════════
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const typeParam = searchParams.get("type");
    const wantsDefault = searchParams.get("default") === "true";

    // ✅ قالب واحد
    if (typeParam || wantsDefault) {
      const type = typeParam || "group_activation";

      // الأولوية للـ default
      let template = await WhatsAppTemplateInstructor.findOne({
        templateType: type,
        isActive: true,
        isDefault: true,
      }).lean();

      // fallback: أي قالب فعّال من نفس النوع
      if (!template) {
        template = await WhatsAppTemplateInstructor.findOne({
          templateType: type,
          isActive: true,
        })
          .sort({ updatedAt: -1 })
          .lean();
      }

      if (template) {
        // ✅ migration
        const fb = getFallbackContent(type);

        if (!template.contentAr && template.content) {
          template.contentAr = template.content;
          template.contentEn = fb.contentEn;
        }
        if (!template.contentAr) template.contentAr = fb.contentAr;
        if (!template.contentEn) template.contentEn = fb.contentEn;

        return NextResponse.json({ success: true, data: template });
      }

      // ✅ مفيش قالب محفوظ → رجّع fallback من الذاكرة
      const fb = getFallbackContent(type);

      return NextResponse.json({
        success: true,
        data: {
          _id: null,
          templateType: type,
          contentAr: fb.contentAr,
          contentEn: fb.contentEn,
          content:   fb.contentAr,
          isDefault: false,
          isActive: true,
          variables: INSTRUCTOR_VARIABLES_MAP[type] || DEFAULT_VARIABLES,
          _notFound: true,
        },
      });
    }

    // ✅ مفيش باراميترات → رجّع كل قوالب المدربين
    const templates = await WhatsAppTemplateInstructor.find({
      isActive: true,
    }).lean();

    const migrated = templates.map((t) => {
      const fb = getFallbackContent(t.templateType);

      if (!t.contentAr && t.content) {
        t.contentAr = t.content;
        t.contentEn = fb.contentEn;
      }
      if (!t.contentAr) t.contentAr = fb.contentAr;
      if (!t.contentEn) t.contentEn = fb.contentEn;

      return t;
    });

    return NextResponse.json({ success: true, data: migrated });
  } catch (error) {
    console.error("❌ Error fetching instructor templates:", error);
    return NextResponse.json({ success: true, data: [] });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ✅ PUT: تحديث القالب
// ═══════════════════════════════════════════════════════════════════════
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
      return NextResponse.json(
        { success: false, message: "Template not found" },
        { status: 404 },
      );
    }

    if (contentAr !== undefined) template.contentAr = contentAr;
    if (contentEn !== undefined) template.contentEn = contentEn;
    if (content !== undefined) template.content = content;
    else if (contentAr !== undefined) template.content = contentAr;

    if (setAsDefault) {
      await WhatsAppTemplateInstructor.updateMany(
        {
          templateType: template.templateType,
          isDefault: true,
          _id: { $ne: id },
        },
        { $set: { isDefault: false } },
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
    console.error("❌ Error updating instructor template:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ✅ POST: إنشاء قالب جديد (مع دعم upsert)
// ═══════════════════════════════════════════════════════════════════════
export async function POST(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const adminUser = authCheck.user;
    await connectDB();

    const body = await req.json();
    const {
      templateType,
      name,
      contentAr,
      contentEn,
      description,
      setAsDefault,
    } = body;

    const finalTemplateType = templateType || "group_activation";

    const templateVariables =
      INSTRUCTOR_VARIABLES_MAP[finalTemplateType] || DEFAULT_VARIABLES;

    const fb = getFallbackContent(finalTemplateType);

    // ✅ لو فيه قالب موجود بنفس النوع، اعمل update بدل create
    const existing = await WhatsAppTemplateInstructor.findOne({
      templateType: finalTemplateType,
    });

    if (existing) {
      if (contentAr !== undefined) existing.contentAr = contentAr;
      if (contentEn !== undefined) existing.contentEn = contentEn;
      if (contentAr !== undefined) existing.content = contentAr;
      if (name) existing.name = name;
      if (description !== undefined) existing.description = description;

      existing.variables = templateVariables;
      existing.isActive = true;

      if (setAsDefault) {
        await WhatsAppTemplateInstructor.updateMany(
          {
            templateType: finalTemplateType,
            isDefault: true,
            _id: { $ne: existing._id },
          },
          { $set: { isDefault: false } },
        );
        existing.isDefault = true;
      }

      existing.metadata.lastModifiedBy = adminUser.id;
      existing.metadata.updatedAt = new Date();
      await existing.save();

      return NextResponse.json({
        success: true,
        data: existing,
        message: "تم تحديث القالب بنجاح",
      });
    }

    // ✅ مفيش قالب موجود → أنشئ واحد جديد
    if (setAsDefault) {
      await WhatsAppTemplateInstructor.updateMany(
        { templateType: finalTemplateType, isDefault: true },
        { $set: { isDefault: false } },
      );
    }

    const template = new WhatsAppTemplateInstructor({
      templateType: finalTemplateType,
      name: name || "قالب جديد",
      contentAr: contentAr || fb.contentAr,
      contentEn: contentEn || fb.contentEn,
      content:   contentAr || fb.contentAr,
      description: description || "",
      isDefault: setAsDefault !== undefined ? setAsDefault : true,
      isActive: true,
      variables: templateVariables,
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
    console.error("❌ Error creating instructor template:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}