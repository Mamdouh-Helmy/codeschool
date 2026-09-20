// src/models/WhatsAppTemplateInstructor.js
import mongoose from "mongoose";

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA
// ═══════════════════════════════════════════════════════════════════════════
const WhatsAppTemplateInstructorSchema = new mongoose.Schema(
  {
    templateType: {
      type: String,
      enum: [
        // ── Group Activation ──────────────────────────────────
        "group_activation",
        "group_activation_offline",
        // ── الأصلي ────────────────────────────────────────────
        "reminder_24h",
        "reminder_15min",
        // ── OFFLINE ────────────────────────────────────────────
        "reminder_24h_offline",
        "reminder_30min_offline",
        "pre_attendance_ping",
        // ── 🎁 الحصة التعويضية ────────────────────────────────
        "makeup_session_instructor",
        "makeup_session_instructor_offline",
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
      default: "",
    },
    contentEn: {
      type: String,
      default: "",
    },
    // ✅ snapshot من contentAr للتوافق مع الكود القديم
    content: {
      type: String,
      default: "",
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
        _id: false,
        key: String,
        label: String,
        description: String,
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
  {
    timestamps: true,
    // ✅ تحويل تلقائي لـ plain object عند الـ JSON.stringify
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════════════════
WhatsAppTemplateInstructorSchema.index({ templateType: 1, isActive: 1 });
WhatsAppTemplateInstructorSchema.index({ isDefault: 1 });
WhatsAppTemplateInstructorSchema.index(
  { templateType: 1, isDefault: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true },
    name: "unique_default_per_type_instructor",
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════════════════
WhatsAppTemplateInstructorSchema.pre("save", async function () {
  if (!this.metadata) this.metadata = {};
  this.metadata.updatedAt = new Date();

  // ✅ لازم يكون فيه محتوى بالعربي أو الإنجليزي على الأقل
  if (!this.contentAr && !this.contentEn) {
    throw new Error(
      "at least one of contentAr or contentEn must be provided",
    );
  }

  // ✅ fallback بين اللغتين
  if (!this.contentAr && this.contentEn) this.contentAr = this.contentEn;
  if (!this.contentEn && this.contentAr) this.contentEn = this.contentAr;

  // ✅ content snapshot من contentAr
  this.content = this.contentAr;

  // ✅ default واحد بس لكل نوع
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

// ═══════════════════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════════════════
WhatsAppTemplateInstructorSchema.methods.incrementUsage =
  async function () {
    if (!this.usageStats) this.usageStats = { totalSent: 0 };
    this.usageStats.totalSent = (this.usageStats.totalSent || 0) + 1;
    this.usageStats.lastUsedAt = new Date();
    await this.save();
  };

WhatsAppTemplateInstructorSchema.methods.getContent = function (
  language = "ar",
) {
  if (language === "ar") {
    return this.contentAr || this.contentEn || this.content || "";
  }
  return this.contentEn || this.contentAr || this.content || "";
};

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

// ═══════════════════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ✅ يجيب القالب الافتراضي لنوع معين — plain object جاهز للـ serialize
 */
WhatsAppTemplateInstructorSchema.statics.getDefaultFor = async function (
  templateType,
) {
  return this.findOne({
    templateType,
    isActive: true,
    isDefault: true,
  })
    .select("-__v")
    .lean();
};

/**
 * ✅ يجيب كل القوالب النشطة — plain objects
 */
WhatsAppTemplateInstructorSchema.statics.getActiveTemplates =
  async function () {
    return this.find({ isActive: true }).select("-__v").lean();
  };

/**
 * ✅ يعمل seed للقوالب الافتراضية لو مش موجودة
 */
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

// ═══════════════════════════════════════════════════════════════════════════
// FALLBACK TEMPLATES (hardcoded)
// ═══════════════════════════════════════════════════════════════════════════
export function getInstructorFallbackTemplates() {
  return {
    // ═════════════════════════════════════════════════════════════════════
    // 🎯 GROUP ACTIVATION — ONLINE
    // ═════════════════════════════════════════════════════════════════════
    group_activation: {
      name: "إشعار تفعيل مجموعة للمدرب (Online)",
      description: "بيتبعت للمدرب أول ما الجروب الأونلاين يتفعّل",
      variables: [
        { key: "instructorSalutation", label: "تحية المدرب" },
        { key: "courseName", label: "اسم الكورس" },
        { key: "groupName", label: "اسم المجموعة" },
        { key: "startDate", label: "تاريخ البداية" },
        { key: "timeFrom", label: "وقت البداية" },
        { key: "timeTo", label: "وقت النهاية" },
        { key: "studentCount", label: "عدد الطلاب" },
        { key: "meetingLink", label: "لينك الحصة" },
      ],
      ar: `{instructorSalutation} 👋

حبيت أبلغك إنه تم إسناد جروب *{groupName}* الخاص بكورس *{courseName}* لحضرتك ✨
دي كل تفاصيل البداية عشان تكون جاهز:

📘 الـ Course: {courseName}
👥 الـ Group: {groupName}
📅 تاريخ البداية: {startDate}
⏰ المعاد: من {timeFrom} إلى {timeTo}
🔗 لينك الحصة:
{meetingLink}

متحمسين جداً لبداية قوية معاك، وبالتوفيق يا هندسة 🌟

نور ✨
فريق الأوبيريشن - Code School`,
      en: `{instructorSalutation} 👋

We're pleased to assign you group *{groupName}* for *{courseName}* ✨
Here are all the starting details to get you ready:

📘 Course: {courseName}
👥 Group: {groupName}
📅 Start Date: {startDate}
⏰ Time: From {timeFrom} to {timeTo}
🔗 Meeting Link:
{meetingLink}

Excited for a strong start with you, best of luck! 🌟

Nour ✨
Operations Team - Code School`,
    },

    // ═════════════════════════════════════════════════════════════════════
    // 🎯 GROUP ACTIVATION — OFFLINE
    // ═════════════════════════════════════════════════════════════════════
    group_activation_offline: {
      name: "إشعار تفعيل مجموعة للمدرب (Offline)",
      description: "بيتبعت للمدرب أول ما الجروب الأوفلاين يتفعّل",
      variables: [
        { key: "instructorSalutation", label: "تحية المدرب" },
        { key: "courseName", label: "اسم الكورس" },
        { key: "groupName", label: "اسم المجموعة" },
        { key: "startDate", label: "تاريخ البداية" },
        { key: "timeFrom", label: "وقت البداية" },
        { key: "timeTo", label: "وقت النهاية" },
        { key: "studentCount", label: "عدد الطلاب" },
        { key: "placeName", label: "اسم المكان" },
        { key: "address", label: "العنوان التفصيلي" },
        { key: "mapsLink", label: "رابط الخريطة" },
      ],
      ar: `{instructorSalutation} 👋

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
فريق الأوبيريشن - Code School`,
      en: `{instructorSalutation} 👋

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
Operations Team - Code School`,
    },

    // ═════════════════════════════════════════════════════════════════════
    // ⏰ REMINDER 24H (Online)
    // ═════════════════════════════════════════════════════════════════════
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

    // ═════════════════════════════════════════════════════════════════════
    // ⏳ REMINDER 15MIN (Online)
    // ═════════════════════════════════════════════════════════════════════
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

    // ═════════════════════════════════════════════════════════════════════
    // 📍 REMINDER 24H OFFLINE (Maps)
    // ═════════════════════════════════════════════════════════════════════
    reminder_24h_offline: {
      name: "تذكير 24 ساعة للمدرب (Offline — Maps)",
      description: "تذكير للمدرب قبل الحصة الأوفلاين بـ 24 ساعة مع اللوكيشن",
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

    // ═════════════════════════════════════════════════════════════════════
    // 🚗 REMINDER 30MIN OFFLINE (Drop-off)
    // ═════════════════════════════════════════════════════════════════════
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

    // ═════════════════════════════════════════════════════════════════════
    // ✅ PRE-ATTENDANCE PING
    // ═════════════════════════════════════════════════════════════════════
    pre_attendance_ping: {
      name: "Pre-Attendance Ping للمدرب",
      description: "رسالة قبل بداية الحصة مباشرة — للمدرب لتأكيد الاستعداد",
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

    // ═════════════════════════════════════════════════════════════════════
    // 🎁 MAKE-UP SESSION (الحصة التعويضية — للمدرب) — Online
    // ═════════════════════════════════════════════════════════════════════
    makeup_session_instructor: {
      name: "حصة تعويضية - المدرب",
      description: "بيتبعت للمدرب لما الأدمن يعمل حصة تعويضية جديدة",
      variables: [
        { key: "instructorSalutation", label: "تحية المدرب" },
        { key: "instructorName", label: "اسم المدرب" },
        { key: "studentName", label: "اسم الطالب" },
        { key: "courseName", label: "اسم الكورس" },
        { key: "groupName", label: "اسم المجموعة" },
        { key: "groupCode", label: "كود المجموعة" },
        { key: "originalDate", label: "تاريخ الحصة الأصلية" },
        { key: "originalTime", label: "وقت الحصة الأصلية" },
        { key: "originalSessionTitle", label: "عنوان الحصة الأصلية" },
        { key: "newDate", label: "تاريخ الحصة التعويضية" },
        { key: "newTime", label: "وقت الحصة التعويضية" },
        {
          key: "sessionLocationBlock",
          label: "معلومات المكان / اللينك (تلقائي)",
        },
      ],
      ar: `{instructorSalutation} 👋

تم تحديد حصة تعويضية جديدة ليك:

📘 الكورس: {courseName}
👥 المجموعة: {groupName} ({groupCode})
👤 الطالب: {studentName}

📅 التاريخ: {newDate}
⏰ الوقت: {newTime}
{sessionLocationBlock}

🔄 الحصة الأصلية:
📅 {originalDate}
⏰ {originalTime}
📚 {originalSessionTitle}

ملاحظة: الحصة دي تعويضية (مجانية على الطالب)، لكن المدرس بيتحاسب عليها عادي.

فريق Code School 💻`,
      en: `{instructorSalutation} 👋

A new make-up session has been scheduled for you:

📘 Course: {courseName}
👥 Group: {groupName} ({groupCode})
👤 Student: {studentName}

📅 Date: {newDate}
⏰ Time: {newTime}
{sessionLocationBlock}

🔄 Original Session:
📅 {originalDate}
⏰ {originalTime}
📚 {originalSessionTitle}

Note: This is a make-up session (free for the student), but the instructor is still paid for it.

Code School Team 💻`,
    },

    // ═════════════════════════════════════════════════════════════════════
    // 🎁 MAKE-UP SESSION (Offline — للمدرب)
    // ═════════════════════════════════════════════════════════════════════
    makeup_session_instructor_offline: {
      name: "حصة تعويضية - المدرب (Offline)",
      description: "بيتبعت للمدرب لما الأدمن يعمل حصة تعويضية أوفلاين",
      variables: [
        { key: "instructorSalutation", label: "تحية المدرب" },
        { key: "instructorName", label: "اسم المدرب" },
        { key: "studentName", label: "اسم الطالب" },
        { key: "courseName", label: "اسم الكورس" },
        { key: "groupName", label: "اسم المجموعة" },
        { key: "groupCode", label: "كود المجموعة" },
        { key: "originalDate", label: "تاريخ الحصة الأصلية" },
        { key: "originalTime", label: "وقت الحصة الأصلية" },
        { key: "originalSessionTitle", label: "عنوان الحصة الأصلية" },
        { key: "newDate", label: "تاريخ الحصة التعويضية" },
        { key: "newTime", label: "وقت الحصة التعويضية" },
        { key: "placeName", label: "اسم المكان" },
        { key: "address", label: "العنوان التفصيلي" },
        { key: "mapsLink", label: "رابط الخريطة" },
      ],
      ar: `{instructorSalutation} 👋

تم تحديد حصة تعويضية جديدة ليك (Offline):

📘 الكورس: {courseName}
👥 المجموعة: {groupName} ({groupCode})
👤 الطالب: {studentName}

📅 التاريخ: {newDate}
⏰ الوقت: {newTime}
📍 المكان: {placeName}
📌 العنوان: {address}
🗺️ اللوكيشن: {mapsLink}

🔄 الحصة الأصلية:
📅 {originalDate}
⏰ {originalTime}
📚 {originalSessionTitle}

ملاحظة: الحصة دي تعويضية (مجانية على الطالب)، لكن المدرس بيتحاسب عليها عادي.

فريق Code School 💻`,
      en: `{instructorSalutation} 👋

A new make-up session has been scheduled for you (Offline):

📘 Course: {courseName}
👥 Group: {groupName} ({groupCode})
👤 Student: {studentName}

📅 Date: {newDate}
⏰ Time: {newTime}
📍 Location: {placeName}
📌 Address: {address}
🗺️ Maps: {mapsLink}

🔄 Original Session:
📅 {originalDate}
⏰ {originalTime}
📚 {originalSessionTitle}

Note: This is a make-up session (free for the student), but the instructor is still paid for it.

Code School Team 💻`,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MODEL EXPORT — آمن للـ hot reload
// ═══════════════════════════════════════════════════════════════════════════
const WhatsAppTemplateInstructor =
  mongoose.models.WhatsAppTemplateInstructor ||
  mongoose.model(
    "WhatsAppTemplateInstructor",
    WhatsAppTemplateInstructorSchema,
  );

export default WhatsAppTemplateInstructor;