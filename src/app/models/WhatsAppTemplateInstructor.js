// src/models/WhatsAppTemplateInstructor.js
import mongoose from "mongoose";

const WhatsAppTemplateInstructorSchema = new mongoose.Schema(
  {
    templateType: {
      type: String,
      enum: [
        // ── الأصلي ────────────────────────────────────────────
        "group_activation",
        "reminder_24h",
        "reminder_15min",

        // ── OFFLINE — جديد ────────────────────────────────────
        "reminder_24h_offline",
        "reminder_30min_offline",
        "pre_attendance_ping",
      ],
      required: true,
      default: "group_activation",
    },
    name: {
      type: String,
      required: true,
      trim: true,
      default: "قالب تفعيل المجموعة للمدرب",
    },
    contentAr: {
      type: String,
      required: true,
    },
    contentEn: {
      type: String,
      required: true,
    },
    // ✅ content بياخد snapshot من contentAr تلقائيًا (للتوافق مع الكود القديم)
    content: {
      type: String,
    },
    description: {
      type: String,
      default: "رسالة إخبار المدرب",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    variables: [
      {
        key: String,
        label: String,
        description: String,
        _id: false,
      },
    ],
    usageStats: {
      totalSent: { type: Number, default: 0 },
      lastUsedAt: { type: Date },
    },
    metadata: {
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
WhatsAppTemplateInstructorSchema.index({ templateType: 1, isActive: 1 });
WhatsAppTemplateInstructorSchema.index({ isDefault: 1 });
// ✅ ضمان وجود template default واحد بس لكل templateType
WhatsAppTemplateInstructorSchema.index(
  { templateType: 1, isDefault: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true },
    name: "unique_default_per_type_instructor",
  },
);

// ─── Hooks ─────────────────────────────────────────────────────────────────────
WhatsAppTemplateInstructorSchema.pre("save", async function () {
  this.metadata.updatedAt = new Date();
  this.content = this.contentAr;

  // ✅ لو الاتنين فاضيين نرمي error واضح
  if (!this.contentAr && !this.contentEn) {
    throw new Error(
      "at least one of contentAr or contentEn must be provided",
    );
  }

  // ✅ لو واحد منهم فاضي، نعمل fallback للتاني عشان الكود ميقعش
  if (!this.contentAr && this.contentEn) this.contentAr = this.contentEn;
  if (!this.contentEn && this.contentAr) this.contentEn = this.contentAr;

  // ✅ ضمان إن فيه default واحد بس لكل type
  if (this.isDefault) {
    await this.constructor.updateMany(
      {
        templateType: this.templateType,
        isDefault: true,
        _id: { $ne: this._id },
      },
      { $set: { isDefault: false } },
    );
  }
});

// ─── Methods ───────────────────────────────────────────────────────────────────
WhatsAppTemplateInstructorSchema.methods.incrementUsage = async function () {
  this.usageStats.totalSent += 1;
  this.usageStats.lastUsedAt = new Date();
  await this.save();
};

// ✅ helper: يجيب محتوى اللغة المطلوبة مع fallback
WhatsAppTemplateInstructorSchema.methods.getContent = function (
  language = "ar",
) {
  if (language === "ar") {
    return this.contentAr || this.contentEn || this.content || "";
  }
  return this.contentEn || this.contentAr || this.content || "";
};

// ✅ helper: يستبدل المتغيرات في المحتوى
WhatsAppTemplateInstructorSchema.methods.render = function (
  variables = {},
  language = "ar",
) {
  let content = this.getContent(language);
  if (!content) return "";

  Object.entries(variables).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      content = content.replace(
        new RegExp(`\\{${key}\\}`, "g"),
        String(value),
      );
    }
  });
  return content;
};

// ─── Statics ───────────────────────────────────────────────────────────────────
// ✅ يجيب template default للـ type المطلوب
WhatsAppTemplateInstructorSchema.statics.getDefaultFor = async function (
  templateType,
) {
  return this.findOne({
    templateType,
    isActive: true,
    isDefault: true,
  }).lean();
};

// ✅ يضمن وجود default لكل type — يشتغل مع seed من لوحة التحكم
WhatsAppTemplateInstructorSchema.statics.ensureDefaults = async function () {
  const defaults = getInstructorFallbackTemplates();

  const results = [];
  for (const [templateType, data] of Object.entries(defaults)) {
    const existing = await this.findOne({ templateType, isDefault: true });

    if (!existing) {
      await this.create({
        templateType,
        name: data.name,
        contentAr: data.ar,
        contentEn: data.en,
        description: data.description || "",
        variables: data.variables || [],
        isActive: true,
        isDefault: true,
      });
      results.push({ templateType, action: "created" });
    } else {
      results.push({ templateType, action: "exists" });
    }
  }
  return results;
};

// ─── Fallback templates (hardcoded) ───────────────────────────────────────────
export function getInstructorFallbackTemplates() {
  return {
    // ══════════════════════════════════════════════════════════
    // group_activation (الأصلي)
    // ══════════════════════════════════════════════════════════
    group_activation: {
      name: "قالب تفعيل المجموعة للمدرب",
      description: "بيتبعت للمدرب أول ما المجموعة تتفعّل",
      variables: [
        { key: "instructorSalutation", label: "تحية المدرب" },
        { key: "courseName", label: "اسم الكورس" },
        { key: "groupName", label: "اسم المجموعة" },
        { key: "startDate", label: "تاريخ البداية" },
        { key: "timeFrom", label: "وقت البداية" },
        { key: "timeTo", label: "وقت النهاية" },
        { key: "studentCount", label: "عدد الطلاب" },
      ],
      ar: `{instructorSalutation}،

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
إدارة Code School 💻`,
      en: `{instructorSalutation},

We are pleased to inform you that a new group has been assigned and activated under your supervision with the following details:

📘 Program: {courseName}
👥 Group: {groupName}
📅 First Session Date: {startDate}
⏰ Schedule: {timeFrom} – {timeTo}
👦👧 Students: {studentCount}

📌 Please make sure to:
- Review the curriculum and session plan before the first session
- Open the meeting link at least 10-15 minutes early
- Ensure all required tools and materials are ready
- Take attendance and evaluate the session after each class

We appreciate your commitment and professionalism, and wish you a successful educational journey with your students 🚀

Best regards,
Code School Management 💻`,
    },

    // ══════════════════════════════════════════════════════════
    // reminder_24h (أونلاين)
    // ══════════════════════════════════════════════════════════
    reminder_24h: {
      name: "تذكير 24 ساعة للمدرب (Online)",
      description: "تذكير للمدرب قبل الحصة الأونلاين بـ 24 ساعة",
      variables: [
        { key: "instructorSalutation", label: "تحية المدرب" },
        { key: "sessionName", label: "اسم الحصة" },
        { key: "sessionDescription", label: "وصف الحصة" },
        { key: "date", label: "التاريخ" },
        { key: "time", label: "الوقت" },
        { key: "meetingLink", label: "رابط الاجتماع" },
        { key: "username", label: "Username" },
        { key: "password", label: "Password" },
        { key: "groupName", label: "اسم المجموعة" },
        { key: "studentCount", label: "عدد الطلاب" },
      ],
      ar: `{instructorSalutation} 👋
حبيت أفكرك إن ميعادنا بكرة إن شاء الله ✨

📘 الـ Session: {sessionName}
📝 وصف السيشن: {sessionDescription}
📅 التاريخ: {date}
⏰ الوقت: {time}
🔗 لينك الحصة:
{meetingLink}

🔐 بيانات الدخول:
👤 Username: {username}
🔑 Password: {password}

👥 المجموعة: {groupName}
🔢 عدد الطلاب: {studentCount}

متحمسين نشوفك بكرة 💻🚀
فريق Code School`,
      en: `{instructorSalutation} 👋
Just a reminder that our session is tomorrow, God willing ✨

📘 Session: {sessionName}
📝 Overview: {sessionDescription}
📅 Date: {date}
⏰ Time: {time}
🔗 Meeting Link:
{meetingLink}

🔐 Login Details:
👤 Username: {username}
🔑 Password: {password}

👥 Group: {groupName}
🔢 Students: {studentCount}

Can't wait to see you tomorrow 💻🚀
Code School Team`,
    },

    // ══════════════════════════════════════════════════════════
    // reminder_15min (أونلاين)
    // ══════════════════════════════════════════════════════════
    reminder_15min: {
      name: "تذكير 15 دقيقة للمدرب (Online)",
      description: "تذكير للمدرب قبل الحصة الأونلاين بـ 15 دقيقة",
      variables: [
        { key: "instructorSalutation", label: "تحية المدرب" },
        { key: "sessionName", label: "اسم الحصة" },
        { key: "sessionDescription", label: "وصف الحصة" },
        { key: "time", label: "الوقت" },
        { key: "meetingLink", label: "رابط الاجتماع" },
        { key: "username", label: "Username" },
        { key: "password", label: "Password" },
        { key: "groupName", label: "اسم المجموعة" },
      ],
      ar: `{instructorSalutation} 👋
حبيت أفكرك إن ميعادنا هيبدأ خلال *15 دقيقة* إن شاء الله ✨

📘 الـ Session: {sessionName}
📝 وصف السيشن: {sessionDescription}
⏰ الوقت: {time}
🔗 لينك الحصة:
{meetingLink}

🔐 بيانات الدخول:
👤 Username: {username}
🔑 Password: {password}

👥 المجموعة: {groupName}

متحمسين نشوفك دلوقتي 💻🚀
فريق Code School`,
      en: `{instructorSalutation} 👋
Just a reminder that our session starts in *15 minutes*, God willing ✨

📘 Session: {sessionName}
📝 Overview: {sessionDescription}
⏰ Time: {time}
🔗 Meeting Link:
{meetingLink}

🔐 Login Details:
👤 Username: {username}
🔑 Password: {password}

👥 Group: {groupName}

Can't wait to see you now 💻🚀
Code School Team`,
    },

    // ══════════════════════════════════════════════════════════
    // reminder_24h_offline (أوفلاين — Maps Reminder)
    // ══════════════════════════════════════════════════════════
    reminder_24h_offline: {
      name: "تذكير 24 ساعة للمدرب (Offline — Maps)",
      description:
        "تذكير للمدرب قبل الحصة الأوفلاين بـ 24 ساعة مع اللوكيشن",
      variables: [
        { key: "instructorSalutation", label: "تحية المدرب" },
        { key: "sessionName", label: "اسم الحصة" },
        { key: "date", label: "التاريخ" },
        { key: "time", label: "الوقت" },
        { key: "placeName", label: "اسم المكان" },
        { key: "address", label: "العنوان" },
        { key: "mapsLink", label: "رابط الخريطة" },
        { key: "groupName", label: "اسم المجموعة" },
        { key: "studentCount", label: "عدد الطلاب" },
      ],
      ar: `{instructorSalutation} 👋

تذكير: عندك حصة *{sessionName}* بكرة إن شاء الله (Offline) ✨

📅 التاريخ: {date}
⏰ الوقت: {time}

📍 المكان: {placeName}
📌 العنوان: {address}
🗺️ {mapsLink}

👥 المجموعة: {groupName}
🔢 عدد الطلاب: {studentCount}

فريق Code School 💻`,
      en: `{instructorSalutation} 👋

Reminder: You have an *offline* session *{sessionName}* tomorrow ✨

📅 Date: {date}
⏰ Time: {time}

📍 Location: {placeName}
📌 Address: {address}
🗺️ {mapsLink}

👥 Group: {groupName}
🔢 Students: {studentCount}

Code School Team 💻`,
    },

    // ══════════════════════════════════════════════════════════
    // reminder_30min_offline (Drop-off Alert)
    // ══════════════════════════════════════════════════════════
    reminder_30min_offline: {
      name: "تنبيه 30 دقيقة للمدرب (Offline — Drop-off)",
      description:
        "تنبيه للمدرب قبل الحصة الأوفلاين بـ 30 دقيقة (استعداد للنزول)",
      variables: [
        { key: "instructorSalutation", label: "تحية المدرب" },
        { key: "sessionName", label: "اسم الحصة" },
        { key: "time", label: "الوقت" },
        { key: "placeName", label: "المكان" },
        { key: "mapsLink", label: "رابط الخريطة" },
        { key: "groupName", label: "اسم المجموعة" },
      ],
      ar: `{instructorSalutation} 👋

⏰ فاضل 30 دقيقة على بداية حصة *{sessionName}*

📍 المكان: {placeName}
🗺️ {mapsLink}

👥 المجموعة: {groupName}

فريق Code School 💻`,
      en: `{instructorSalutation} 👋

⏰ 30 minutes until *{sessionName}* starts

📍 Location: {placeName}
🗺️ {mapsLink}

👥 Group: {groupName}

Code School Team 💻`,
    },

    // ══════════════════════════════════════════════════════════
    // pre_attendance_ping
    // ══════════════════════════════════════════════════════════
    pre_attendance_ping: {
      name: "Pre-Attendance Ping للمدرب",
      description:
        "رسالة قبل بداية الحصة مباشرة — للمدرب لتأكيد الاستعداد",
      variables: [
        { key: "instructorSalutation", label: "تحية المدرب" },
        { key: "sessionName", label: "اسم الحصة" },
      ],
      ar: `{instructorSalutation} 👋

الحصة *{sessionName}* هتبدأ دلوقتي، ياريت نتأكد إن الطلاب موجودين وجاهزين ونسجل الحضور ✨

فريق Code School 💻`,
      en: `{instructorSalutation} 👋

*{sessionName}* is about to start, please make sure students are present and take attendance ✨

Code School Team 💻`,
    },
  };
}

// ─── Model ─────────────────────────────────────────────────────────────────────
const WhatsAppTemplateInstructor =
  mongoose.models.WhatsAppTemplateInstructor ||
  mongoose.model(
    "WhatsAppTemplateInstructor",
    WhatsAppTemplateInstructorSchema,
  );

export default WhatsAppTemplateInstructor;