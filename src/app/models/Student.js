// /models/Student.js
import mongoose from "mongoose";

// =============================================
// ✅ SUB-SCHEMAS
// =============================================

const addressSchema = new mongoose.Schema({
  street: { type: String, default: "" },
  city: { type: String, default: "" },
  state: { type: String, default: "" },
  postalCode: { type: String, default: "" },
  country: { type: String, default: "" },
});

const currentCourseSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  enrolledDate: { type: Date, default: Date.now },
  progressPercentage: { type: Number, default: 0 },
});

const notificationChannelsSchema = new mongoose.Schema({
  email: { type: Boolean, default: true },
  whatsapp: { type: Boolean, default: true },
  sms: { type: Boolean, default: false },
});

const sessionReminderSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    reminderType: { type: String, enum: ["24hours", "1hour"], required: true },
    message: { type: String, required: true },
    language: { type: String, enum: ["ar", "en", "bilingual"], default: "ar" },
    sentAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["sent", "failed", "pending"],
      default: "sent",
    },
    error: { type: String },
    sessionDetails: {
      title: String,
      scheduledDate: Date,
      startTime: String,
      endTime: String,
      moduleIndex: Number,
      sessionNumber: Number,
    },
  },
  { _id: true, timestamps: true },
);

const whatsappMessageSchema = new mongoose.Schema(
  {
    messageType: {
      type: String,
      enum: [
        "welcome",
        "language_selection",
        "language_confirmation",
        "group_welcome",
        "group_welcome_guardian",
        "group_welcome_student",
        "session_reminder",
        "session_reminder_guardian",
        "session_reminder_student",
        "absence_notification",
        "late_notification",
        "excused_notification",
        "session_cancelled",
        "session_postponed",
        "group_completion",
        "custom",
        "other",
        "session_cancelled_student",
        "session_postponed_student",
        "reminder_24h_student",
        "reminder_1h_student",
        "group_completion_student",
        "session_cancelled_guardian",
        "session_postponed_guardian",
        "reminder_24h_guardian",
        "reminder_1h_guardian",
        "group_completion_guardian",
        "bilingual_language_selection",
        "bilingual_guardian_notification",
        "bilingual_language_confirmation",
        "bilingual_language_confirmation_guardian",
        "credit_alert",
        "credit_exhausted",
        "student_welcome",
        "guardian_welcome",
        "evaluation_pass",
        "evaluation_review",
        "evaluation_repeat",
        "session_recording",
        "module_overview",
        "learning_supervisor_intro",
        "guardian_notification",
        "reminder_15min_student",
        "reminder_15min_guardian",
        "session_blog",
        "reminder_24h_offline",
        "reminder_30min_offline",
        "pre_attendance_ping",
        "credit_low_balance_4h_student",
        "credit_low_balance_4h_guardian",
        "credit_low_balance_2h_student",
        "credit_low_balance_2h_guardian",
        "makeup_session_student",
        "makeup_session_guardian",
        "makeup_session_student_offline",
        "makeup_session_guardian_offline",
      ],
      required: true,
    },
messageContent: { type: String, default: "" },
    language: { type: String, enum: ["ar", "en", "bilingual"], default: "ar" },
    status: {
      type: String,
      enum: ["sent", "failed", "pending"],
      default: "sent",
      required: true,
    },
    recipientNumber: { type: String, required: true },
    wapilotMessageId: { type: String },
    sentAt: { type: Date, default: Date.now, required: true },
    metadata: {
      groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
      groupName: String,
      groupCode: String,
      sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
      sessionTitle: String,
      attendanceStatus: String,
      isCustomMessage: { type: Boolean, default: false },
      recipientType: {
        type: String,
        enum: ["student", "guardian"],
        default: "student",
      },
      guardianName: String,
      automationType: String,
      interactive: { type: Boolean, default: false },
      selectedLanguage: String,
      reminderType: String,
      oldStatus: String,
      newStatus: String,
      isBilingual: { type: Boolean, default: false },
      languages: [String],
      nameFormat: String,
      studentGender: String,
      studentNicknameAr: String,
      studentNicknameEn: String,
      guardianNicknameAr: String,
      guardianNicknameEn: String,
      relationship: String,
      remainingHours: Number,
      alertType: String,
    },
    error: { type: String },
    errorDetails: { stack: String, code: String, message: String },
  },
  { _id: true, timestamps: true },
);

// ✅ Credit Hours Package Schema
// 🆕 الباقات بقت قابلة للتعديل من الأدمن عبر PackagePlan model بدل enum ثابت.
// كل باكدج بتتخصص لطالب بتاخد "snapshot" من الـ PackagePlan وقت الإنشاء
// (packageType/packageName/months) عشان تفضل ثابتة تاريخيًا حتى لو الأدمن
// عدّل أو مسح الباقة الأصلية بعدين — بالظبط زي courseSnapshot في Group.js.
const creditPackageSchema = new mongoose.Schema({
  packagePlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PackagePlan",
    default: null,
  },
  packageType: {
    type: String,
    required: true,
    // ✅ من غير enum تاني — القيمة بتيجي من PackagePlan.slug ديناميكيًا
  },
  packageName: { type: String, default: "" }, // اسم الباقة وقت الإنشاء (snapshot)
  months: { type: Number, default: 0 }, // مدة الباقة بالشهور وقت الإنشاء (snapshot)
  totalHours: { type: Number, required: true },
  remainingHours: { type: Number, required: true },
  startDate: { type: Date, default: Date.now, required: true },
  endDate: { type: Date, required: true },
  price: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  status: {
    type: String,
    enum: ["active", "expired", "completed", "suspended"],
    default: "active",
  },
  // ✅ NEW: سجل تدقيق لأي تعديل يدوي يعمله الأدمن على الباكدج بعد إنشائه
  // (تصحيح غلطة في الساعات/السعر/التواريخ) — بيحتفظ بالقيم القديمة والسبب
  // من غير ما يأثر على منطق الفوترة أو يترحّل الباقة للهيستوري.
  editLog: [
    {
      editedAt: { type: Date, default: Date.now },
      editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reason: { type: String, default: "" },
      previousValues: {
        totalHours: Number,
        price: Number,
        startDate: Date,
        endDate: Date,
        packageType: String,
        packageName: String,
      },
    },
  ],
});

// ✅ Credit Hours Exception Schema
const creditExceptionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["deduction", "addition", "freeze"],
    required: true,
  },
  hours: { type: Number },
  reason: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: {
    type: String,
    enum: ["active", "completed", "cancelled"],
    default: "active",
  },
  isFrozen: { type: Boolean, default: false },
  frozenUntil: { type: Date },
  appliedToSessions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Session" }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ✅ Credit Usage History Schema
const creditUsageSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
  date: { type: Date, default: Date.now, required: true },
  hoursDeducted: { type: Number, required: true },
  sessionTitle: String,
  groupName: String,
  attendanceStatus: {
    type: String,
    enum: ["present", "absent", "late", "excused", "refund"],
    default: "present",
  },
  exceptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student.creditExceptions",
  },
  notes: String,
  deductedFromExceptions: { type: Number, default: 0 },
  deductedFromPackage: { type: Number, default: 0 },
});

// =============================================
// ✅ MAIN SCHEMA
// =============================================

const StudentSchema = new mongoose.Schema(
  {
    authUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      sparse: true,
    },

    enrollmentNumber: {
      type: String,
      unique: true,
      sparse: true,
    },

    personalInfo: {
      fullName: { type: String, trim: true },
      nickname: {
        ar: { type: String, trim: true, default: "" },
        en: { type: String, trim: true, default: "" },
      },
      email: { type: String, lowercase: true },
      phone: { type: String },
      whatsappNumber: { type: String },
      dateOfBirth: { type: Date },
      gender: {
        type: String,
        enum: ["male", "female", "other", "Male", "Female"],
        default: "male",
      },
      // ✅ FIX: nationalId اختياري - sparse index يتجاهل null تلقائياً
      // المشكلة كانت إن "" (string فاضي) بيتعامل كـ duplicate مع الـ unique index
      // الحل: نبعت null دايماً لما الحقل فاضي (من route.js)
      nationalId: {
        type: String,
        default: null,
        // مش unique ومش sparse خالص
      },
      address: {
        street: { type: String, default: "" },
        city: { type: String, default: "" },
        state: { type: String, default: "" },
        postalCode: { type: String, default: "" },
        country: { type: String, default: "" },
      },
    },

    guardianInfo: {
      name: { type: String },
      nickname: {
        ar: { type: String, trim: true, default: "" },
        en: { type: String, trim: true, default: "" },
      },
      relationship: {
        type: String,
        enum: ["father", "mother", "guardian", "other"],
        default: "father",
      },
      phone: { type: String },
      whatsappNumber: { type: String },
      email: { type: String, lowercase: true },
    },

    enrollmentInfo: {
      enrollmentDate: { type: Date, default: Date.now },
      status: {
        type: String,
        enum: ["Active", "Suspended", "Graduated", "Dropped"],
        default: "Active",
      },
      source: {
        type: String,
        enum: ["Website", "Referral", "Marketing", "Walk-in"],
      },
      referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
    },

    academicInfo: {
      level: {
        type: String,
        enum: ["Beginner", "Intermediate", "Advanced"],
        default: "Beginner",
      },
      groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Group" }],
      currentCourses: [currentCourseSchema],
    },

    // ✅ الوسوم الخاصة بالطالب
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tag",
      },
    ],

    communicationPreferences: {
      preferredLanguage: { type: String, enum: ["ar", "en"], default: "ar" },
      notificationChannels: notificationChannelsSchema,
      marketingOptIn: { type: Boolean, default: true },
    },

    // ✅ Credit Hours System
    creditSystem: {
      currentPackage: creditPackageSchema,
      packagesHistory: [creditPackageSchema],
      exceptions: [creditExceptionSchema],
      usageHistory: [creditUsageSchema],
      stats: {
        totalHoursPurchased: { type: Number, default: 0 },
        totalHoursUsed: { type: Number, default: 0 },
        totalHoursRemaining: { type: Number, default: 0 },
        totalSessionsAttended: { type: Number, default: 0 },
        totalExceptions: { type: Number, default: 0 },
        activeExceptions: { type: Number, default: 0 },
        lastPackagePurchase: Date,
        lastUsageDate: Date,
        averageAttendancePerMonth: { type: Number, default: 0 },
        lowBalanceAlertsSent: { type: Number, default: 0 },
        zeroBalanceDate: Date,
        notificationsDisabledAt: Date,
      },
      status: {
        type: String,
        enum: ["active", "frozen", "expired", "no_package"],
        default: "no_package",
      },
      notes: String,
    },

    sessionReminders: [sessionReminderSchema],
    whatsappMessages: [whatsappMessageSchema],

    // ✅ NEW: Certificates issued to the student
    // تخزين معرفات الشهادات التي تم إرسالها للطالب لمنع التكرار
    issuedCertificates: [
      {
        moduleId: { type: String, required: true },
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
        imageUrl: { type: String },
        issuedAt: { type: Date, default: Date.now },
        studentDelivered: { type: Boolean, default: false },
        studentDeliveredAt: { type: Date },
        guardianDelivered: { type: Boolean, default: false },
        guardianDeliveredAt: { type: Date },
        // ✅ جديد: قفل يمنع التكرار حتى لو الكرون اشتغل بالتوازي
        generationStatus: {
          type: String,
          enum: ["idle", "generating"],
          default: "idle",
        },
        generationClaimedAt: { type: Date, default: null },
      },
    ],

    moduleOverviewsSent: [
      {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
        moduleIndex: { type: Number, required: true },
        moduleTitle: { type: String, default: "" },
        sentAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ["sending", "sent"],
          default: "sent",
        },
      },
    ],

    metadata: {
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      whatsappWelcomeSent: { type: Boolean, default: false },
      whatsappInteractiveSent: { type: Boolean, default: false },
      whatsappButtons: [{ id: String, title: String }],
      whatsappSentAt: { type: Date },
      whatsappMessageId: { type: String },
      whatsappStatus: {
        type: String,
        enum: ["pending", "sent", "failed", "skipped", "error", "resent"],
        default: "pending",
      },
      whatsappSkipReason: { type: String },
      whatsappError: { type: String },
      whatsappErrorAt: { type: Date },
      whatsappMode: {
        type: String,
        enum: ["production", "simulation"],
        default: "simulation",
      },
      whatsappMessagesCount: { type: Number, default: 0 },
      whatsappLanguageSelected: { type: Boolean, default: false },
      whatsappLanguageSelection: {
        type: String,
        enum: ["1", "2", "arabic_btn", "english_btn", null],
        default: null,
      },
      whatsappLanguageSelectedAt: { type: Date },
      whatsappButtonSelected: { type: String },
      whatsappButtonSelectedAt: { type: Date },
      whatsappResponseReceived: { type: Boolean, default: false },
      whatsappResponse: { type: String },
      whatsappResponseAt: { type: Date },
      whatsappLanguageConfirmed: { type: Boolean, default: false },
      whatsappLanguageConfirmationAt: { type: Date },
      whatsappConfirmationSent: { type: Boolean, default: false },
      whatsappConfirmationSentAt: { type: Date },
      whatsappConfirmationError: { type: String },
      whatsappConfirmationErrorAt: { type: Date },
      whatsappTotalMessages: { type: Number, default: 0 },
      whatsappLastInteraction: { type: Date },
      whatsappConversationId: { type: String },
      whatsappChatId: { type: String },
      whatsappStanzaId: { type: String },
      lastSessionReminder24h: { type: Date },
      lastSessionReminder1h: { type: Date },
      totalSessionReminders: { type: Number, default: 0 },
    },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    strict: true,
  },
);

// ✅ Index لتسريع البحث عن module overviews المرسلة لكل جروب
StudentSchema.index({ "moduleOverviewsSent.groupId": 1 });

// =============================================
// ✅ CREDIT SYSTEM METHODS
// =============================================

/**
 * ✅ دالة مساعدة لحساب الرصيد الفعلي (package فقط - لأن الاستثناءات مضافة بالفعل)
 */
StudentSchema.methods.getEffectiveRemainingHours = function () {
  let total = 0;

  if (this.creditSystem?.currentPackage) {
    total += this.creditSystem.currentPackage.remainingHours || 0;
  }

  return total;
};

/**
 * ✅ التحقق من صلاحية الطالب لاستقبال الرسائل
 */
StudentSchema.methods.canReceiveMessages = function () {
  const effectiveRemaining = this.getEffectiveRemainingHours();

  if (effectiveRemaining <= 0) {
    return {
      canReceive: false,
      reason: "zero_balance",
      message: "Zero balance - notifications disabled",
      remainingHours: 0,
    };
  }

  const whatsappEnabled =
    this.communicationPreferences?.notificationChannels?.whatsapp;
  if (!whatsappEnabled) {
    return {
      canReceive: false,
      reason: "whatsapp_disabled",
      message: "WhatsApp notifications are disabled",
    };
  }

  if (
    !this.personalInfo?.whatsappNumber &&
    !this.guardianInfo?.whatsappNumber &&
    !this.guardianInfo?.phone
  ) {
    return {
      canReceive: false,
      reason: "no_whatsapp_number",
      message: "No WhatsApp number available",
    };
  }

  return {
    canReceive: true,
    remainingHours: effectiveRemaining,
    preferredLanguage: this.communicationPreferences?.preferredLanguage || "ar",
  };
};

/**
 * ✅ الحصول على حالة الرصيد
 */
StudentSchema.methods.getBalanceStatus = function () {
  const effectiveRemaining = this.getEffectiveRemainingHours();
  const hasPackage = !!this.creditSystem?.currentPackage;

  let level = "good";
  let canAttend = true;
  let canReceiveMessages = true;

  if (effectiveRemaining <= 0) {
    level = "zero";
    canAttend = false;
    canReceiveMessages = false;
  } else if (effectiveRemaining <= 2) {
    level = "critical";
    canAttend = true;
    canReceiveMessages = true;
  } else if (effectiveRemaining <= 5) {
    level = "low";
    canAttend = true;
    canReceiveMessages = true;
  }

  return {
    hasPackage,
    remainingHours: effectiveRemaining,
    totalHours: this.creditSystem?.currentPackage?.totalHours || 0,
    usedHours: this.creditSystem?.stats?.totalHoursUsed || 0,
    status: this.creditSystem?.status || "no_package",
    packageType: this.creditSystem?.currentPackage?.packageType,
    packageEndDate: this.creditSystem?.currentPackage?.endDate,
    level,
    canAttend,
    canReceiveMessages,
    percentageUsed:
      this.creditSystem?.currentPackage?.totalHours > 0
        ? Math.round(
            ((this.creditSystem?.stats?.totalHoursUsed || 0) /
              this.creditSystem.currentPackage.totalHours) *
              100,
          )
        : 0,
  };
};

// ✅ إضافة حزمة ساعات جديدة
// 🆕 بقت بتاخد packagePlanId بدل packageType ثابت — الباقة نفسها (شهور/ساعات)
// بتتجاب ديناميكيًا من PackagePlan model اللي الأدمن يقدر يديره من لوحة التحكم.
// السعر لسه ممكن يتخصص/يتغير وقت التخصيص لطالب معين (خصومات مثلًا).
StudentSchema.methods.addCreditPackage = async function (packageData) {
  try {
    // ✅ استيراد ديناميكي لتفادي أي circular imports بين الموديلات
    const PackagePlan = (await import("./PackagePlan")).default;

    if (!packageData.packagePlanId) {
      throw new Error("packagePlanId is required");
    }

    const plan = await PackagePlan.findOne({
      _id: packageData.packagePlanId,
      isActive: true,
    });

    if (!plan) {
      throw new Error("Invalid or inactive package plan");
    }

    const totalHours = plan.totalHours;
    const months = plan.months;

    // ✅ لو الأدمن مبعتش سعر مخصص، ناخد السعر الافتراضي من الباقة
    const price =
      packageData.price !== undefined && packageData.price !== null
        ? Number(packageData.price)
        : plan.price;

    const startDate = packageData.startDate || new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);

    const newPackage = {
      packagePlanId: plan._id,
      packageType: plan.slug, // snapshot
      packageName: plan.name, // snapshot
      months, // snapshot
      totalHours: totalHours,
      remainingHours: totalHours,
      startDate: startDate,
      endDate: endDate,
      price: price,
      isActive: true,
      status: "active",
    };

    if (this.creditSystem?.currentPackage) {
      if (!this.creditSystem.packagesHistory) {
        this.creditSystem.packagesHistory = [];
      }
      this.creditSystem.packagesHistory.push({
        ...this.creditSystem.currentPackage.toObject(),
        isActive: false,
        status: "expired",
      });
    }

    if (!this.creditSystem) {
      this.creditSystem = {
        currentPackage: null,
        packagesHistory: [],
        exceptions: [],
        usageHistory: [],
        stats: {
          totalHoursPurchased: 0,
          totalHoursUsed: 0,
          totalHoursRemaining: 0,
          totalSessionsAttended: 0,
          totalExceptions: 0,
          activeExceptions: 0,
          lowBalanceAlertsSent: 0,
        },
        status: "no_package",
      };
    }

    this.creditSystem.currentPackage = newPackage;
    this.creditSystem.stats.totalHoursPurchased += totalHours;
    this.creditSystem.stats.totalHoursRemaining = totalHours;
    this.creditSystem.stats.lastPackagePurchase = new Date();
    this.creditSystem.status = "active";

    if (this.communicationPreferences?.notificationChannels) {
      this.communicationPreferences.notificationChannels.whatsapp = true;
    }

      await this.save({ validateModifiedOnly: true });
    return { success: true, data: newPackage };
  } catch (error) {
    console.error("❌ Error adding credit package:", error);
    return { success: false, error: error.message };
  }
};

// ✅ NEW: تعديل بيانات الباكدج الحالي (تصحيح غلطة أدمن — نوع/ساعات/سعر/تواريخ)
// من غير ما يترحّل الباقة القديمة للهيستوري ومن غير ما ينشئ فاتورة جديدة.
// بيحافظ على الساعات المستخدمة فعليًا (مينفعش تنزل الساعات الكلية تحتها) وبيسجّل
// كل تعديل في editLog بالقيم القديمة والسبب للمراجعة لاحقًا.
StudentSchema.methods.editCreditPackage = async function (updates) {
  try {
    if (!this.creditSystem?.currentPackage) {
      return { success: false, error: "No active package to edit" };
    }

    const pkg = this.creditSystem.currentPackage;

    // ✅ Snapshot القيم قبل التعديل — يتسجل في editLog ويُستخدم لحساب الفرق
    const before = {
      totalHours: pkg.totalHours || 0,
      remainingHours: pkg.remainingHours || 0,
      price: pkg.price || 0,
      startDate: pkg.startDate,
      endDate: pkg.endDate,
      packageType: pkg.packageType,
      packageName: pkg.packageName,
    };

    const hoursAlreadyUsed = Math.max(
      0,
      before.totalHours - before.remainingHours,
    );

    let newTotalHours = before.totalHours;
    let newMonths = pkg.months;

    // ✅ لو الأدمن غيّر نوع الباقة نفسها (packagePlanId) — ناخد snapshot جديد
    if (
      updates.packagePlanId &&
      String(updates.packagePlanId) !== String(pkg.packagePlanId || "")
    ) {
      const PackagePlan = (await import("./PackagePlan")).default;
      const plan = await PackagePlan.findOne({
        _id: updates.packagePlanId,
        isActive: true,
      });
      if (!plan) {
        return { success: false, error: "Invalid or inactive package plan" };
      }
      pkg.packagePlanId = plan._id;
      pkg.packageType = plan.slug;
      pkg.packageName = plan.name;
      newMonths = plan.months;
      newTotalHours =
        updates.totalHours !== undefined && updates.totalHours !== null
          ? Number(updates.totalHours)
          : plan.totalHours;
    } else if (
      updates.totalHours !== undefined &&
      updates.totalHours !== null
    ) {
      // ✅ تعديل الساعات يدويًا من غير تغيير نوع الباقة
      newTotalHours = Number(updates.totalHours);
    }

    if (!Number.isFinite(newTotalHours) || newTotalHours < 0) {
      return {
        success: false,
        error: "totalHours must be a valid non-negative number",
      };
    }

    if (newTotalHours < hoursAlreadyUsed) {
      return {
        success: false,
        error: `Cannot set total hours below what's already used (${hoursAlreadyUsed}h used)`,
      };
    }

    if (updates.months !== undefined && updates.months !== null) {
      newMonths = Number(updates.months);
    }

    // ✅ تاريخ البداية / النهاية
    const startDate = updates.startDate
      ? new Date(updates.startDate)
      : pkg.startDate;
    let endDate;
    if (updates.endDate) {
      endDate = new Date(updates.endDate);
    } else {
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + (newMonths || 0));
    }

    if (endDate <= startDate) {
      return { success: false, error: "endDate must be after startDate" };
    }

    // ✅ تطبيق التعديلات
    pkg.totalHours = newTotalHours;
    pkg.remainingHours = newTotalHours - hoursAlreadyUsed;
    pkg.months = newMonths;
    pkg.startDate = startDate;
    pkg.endDate = endDate;

    const priceChanged = updates.price !== undefined && updates.price !== null;
    if (priceChanged) {
      pkg.price = Number(updates.price);
    }

    // ✅ لو رجّعنا الرصيد المتبقي لأكتر من صفر بعد ما كان خلص
    if (pkg.remainingHours > 0 && pkg.status === "completed") {
      pkg.status = "active";
      this.creditSystem.status = "active";
      if (this.communicationPreferences?.notificationChannels) {
        this.communicationPreferences.notificationChannels.whatsapp = true;
      }
    }

    // ✅ تصحيح إحصائية إجمالي الساعات المشتراة بمقدار الفرق
    this.creditSystem.stats.totalHoursPurchased = Math.max(
      0,
      (this.creditSystem.stats.totalHoursPurchased || 0) +
        (newTotalHours - before.totalHours),
    );
    this.creditSystem.stats.totalHoursRemaining =
      this.getEffectiveRemainingHours();

    // ✅ تسجيل التعديل في سجل التدقيق
    if (!pkg.editLog) pkg.editLog = [];
    pkg.editLog.push({
      editedAt: new Date(),
      editedBy: updates.editedBy || null,
      reason: updates.reason || "",
      previousValues: before,
    });

    this.metadata.lastModifiedBy =
      updates.editedBy || this.metadata.lastModifiedBy;
    this.metadata.updatedAt = new Date();

await this.save({ validateModifiedOnly: true });
    return {
      success: true,
      data: pkg,
      remainingHours: this.getEffectiveRemainingHours(),
      priceChanged,
      newPrice: pkg.price,
    };
  } catch (error) {
    console.error("❌ Error editing credit package:", error);
    return { success: false, error: error.message };
  }
};

// ✅ إضافة استثناء
StudentSchema.methods.addCreditException = async function (exceptionData) {
  try {
    console.log("🔄 addCreditException called with:", exceptionData);

    if (!this.creditSystem) {
      this.creditSystem = {
        exceptions: [],
        usageHistory: [],
        stats: {
          totalExceptions: 0,
          activeExceptions: 0,
          lowBalanceAlertsSent: 0,
        },
        status: "no_package",
      };
    }

    if (!this.creditSystem.exceptions) {
      this.creditSystem.exceptions = [];
    }

    const today = new Date(exceptionData.startDate).toDateString();
    const existingException = this.creditSystem.exceptions.find(
      (e) =>
        e.type === exceptionData.type &&
        e.hours === exceptionData.hours &&
        e.reason === exceptionData.reason &&
        new Date(e.startDate).toDateString() === today &&
        e.status === "active",
    );

    if (existingException) {
      console.log("⚠️ Duplicate exception detected, skipping...");
      return { success: true, data: existingException, skipped: true };
    }

    const newException = {
      type: exceptionData.type,
      hours: exceptionData.hours || null,
      reason: exceptionData.reason,
      startDate: exceptionData.startDate || new Date(),
      endDate: exceptionData.endDate || null,
      notes: exceptionData.notes || "",
      createdBy: exceptionData.createdBy,
      status: "active",
      isFrozen: exceptionData.type === "freeze",
      frozenUntil:
        exceptionData.type === "freeze" ? exceptionData.endDate : null,
      appliedToSessions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.creditSystem.exceptions.push(newException);

    this.creditSystem.stats.totalExceptions =
      (this.creditSystem.stats.totalExceptions || 0) + 1;
    this.creditSystem.stats.activeExceptions =
      (this.creditSystem.stats.activeExceptions || 0) + 1;

    if (exceptionData.type === "freeze") {
      this.creditSystem.status = "frozen";
    }

    if (exceptionData.type === "deduction" && exceptionData.hours) {
      const deductionResult = await this.deductCreditHours({
        hours: exceptionData.hours,
        reason: `Exception: ${exceptionData.reason}`,
        exceptionId: newException._id,
      });

      if (!deductionResult.success) {
        console.warn("⚠️ Deduction failed:", deductionResult.error);
      }
    }

    if (exceptionData.type === "addition" && exceptionData.hours) {
      if (this.creditSystem.currentPackage) {
        console.log(`➕ Adding ${exceptionData.hours} hours to package`);
        console.log(
          `   Before: ${this.creditSystem.currentPackage.remainingHours}`,
        );

        this.creditSystem.currentPackage.remainingHours += exceptionData.hours;

        console.log(
          `   After: ${this.creditSystem.currentPackage.remainingHours}`,
        );

        if (!this.creditSystem.usageHistory) {
          this.creditSystem.usageHistory = [];
        }

        this.creditSystem.usageHistory.push({
          date: new Date(),
          hoursDeducted: -exceptionData.hours,
          reason: `استثناء إضافة ساعات: ${exceptionData.reason}`,
          exceptionId: newException._id,
          sessionTitle: "إضافة رصيد",
          attendanceStatus: "refund",
          deductedFromExceptions: exceptionData.hours,
          deductedFromPackage: 0,
        });

        if (this.creditSystem.currentPackage.remainingHours > 0) {
          if (this.communicationPreferences?.notificationChannels) {
            this.communicationPreferences.notificationChannels.whatsapp = true;
          }
        }

        this.creditSystem.stats.totalHoursRemaining =
          this.creditSystem.currentPackage.remainingHours;
      }
    }

     await this.save({ validateModifiedOnly: true });
    console.log("✅ Exception added successfully");
    console.log(
      `📊 Final totalHoursRemaining: ${this.creditSystem.stats.totalHoursRemaining}`,
    );

    return { success: true, data: newException };
  } catch (error) {
    console.error("❌ Error adding credit exception:", error);
    return { success: false, error: error.message };
  }
};

// ✅ إنهاء استثناء
StudentSchema.methods.endCreditException = async function (exceptionId) {
  try {
    const exception = this.creditSystem?.exceptions?.id(exceptionId);
    if (!exception) {
      throw new Error("Exception not found");
    }

    exception.status = "completed";
    exception.endDate = new Date();
    exception.updatedAt = new Date();

    if (this.creditSystem.stats.activeExceptions > 0) {
      this.creditSystem.stats.activeExceptions -= 1;
    }

    if (exception.type === "freeze") {
      const hasActiveFreeze = this.creditSystem.exceptions.some(
        (e) => e.type === "freeze" && e.status === "active",
      );

      if (!hasActiveFreeze) {
        this.creditSystem.status = this.creditSystem.currentPackage
          ? "active"
          : "no_package";
      }
    }

       await this.save({ validateModifiedOnly: true });
    return { success: true, data: exception };
  } catch (error) {
    console.error("❌ Error ending credit exception:", error);
    return { success: false, error: error.message };
  }
};

// ✅ خصم ساعات من الرصيد
// 🆕 دلوقتي دي كمان مسؤولة عن تفعيل بداية عدّ الإسكرو (14 يوم) على فاتورة
// الجروب ده — أول ما يحصل أول خصم ساعات فعلي للطالب في الجروب، بغض النظر
// تمامًا عن حالة الحضور (present/absent/late/excused) — لأن المهم إن السيشن
// "اتسحبت" (اتخصم منها ساعات)، مش إن الطالب حضر بالفعل.
StudentSchema.methods.deductCreditHours = async function (deductionData) {
  try {
    const effectiveRemaining = this.getEffectiveRemainingHours();

    if (effectiveRemaining < deductionData.hours) {
      return {
        success: false,
        error: `Insufficient hours. Remaining: ${effectiveRemaining}`,
        remainingHours: effectiveRemaining,
        canProceed: false,
      };
    }

    let hoursToDeduct = deductionData.hours;
    let deductedFromExceptions = 0;
    let deductedFromPackage = 0;

    if (
      this.creditSystem.exceptions &&
      this.creditSystem.exceptions.length > 0
    ) {
      const activeAdditions = this.creditSystem.exceptions.filter(
        (e) =>
          e.type === "addition" &&
          e.status === "active" &&
          (!e.endDate || new Date() <= new Date(e.endDate)),
      );

      for (const exception of activeAdditions) {
        if (hoursToDeduct <= 0) break;

        const deductFromException = Math.min(
          exception.hours || 0,
          hoursToDeduct,
        );
        exception.hours = (exception.hours || 0) - deductFromException;
        hoursToDeduct -= deductFromException;
        deductedFromExceptions += deductFromException;

        if (exception.hours <= 0) {
          exception.status = "completed";
          exception.endDate = new Date();
          this.creditSystem.stats.activeExceptions = Math.max(
            0,
            (this.creditSystem.stats.activeExceptions || 0) - 1,
          );
        }
      }
    }

    if (hoursToDeduct > 0 && this.creditSystem.currentPackage) {
      const currentPackage = this.creditSystem.currentPackage;
      const deductFromPackage = Math.min(
        currentPackage.remainingHours,
        hoursToDeduct,
      );
      currentPackage.remainingHours -= deductFromPackage;
      hoursToDeduct -= deductFromPackage;
      deductedFromPackage += deductFromPackage;

            if (currentPackage.remainingHours === 0) {
        currentPackage.status = "completed";
        this.creditSystem.status = "expired";
        this.creditSystem.stats.zeroBalanceDate = new Date();

        // ✅ FIX: متبقاش تقفل قناة الواتساب هنا فورًا — ده كان بيمنع
        // sendLowBalanceAlerts من بعت رسالة "credit_low_balance_2h" لأن
        // canSendMessageForLowBalance كانت بترجع false على طول (القناة
        // اتقفلت قبل ما نوصل لمرحلة الإرسال). التعطيل الفعلي بقى مسؤولية
        // disableZeroBalanceNotifications، اللي بتتنفذ في الـ route بعد
        // إرسال رسالة الـ 2h مباشرة، مش هنا جوه الخصم نفسه.
      }
    }

    if (hoursToDeduct > 0) {
      return {
        success: false,
        error: `Insufficient hours. Could only deduct ${deductionData.hours - hoursToDeduct} out of ${deductionData.hours}`,
        remainingHours: this.getEffectiveRemainingHours(),
        canProceed: false,
      };
    }

    if (!this.creditSystem.usageHistory) {
      this.creditSystem.usageHistory = [];
    }

    // ✅ NEW: نتأكد قبل ما نضيف السجل الجديد هل ده أول خصم ساعات للطالب في
    // الجروب ده — لو كذلك، ده اللي هيفعّل بداية عدّ الإسكرو على فاتورة الجروب
    const isFirstUsageForGroup = deductionData.groupId
      ? !this.creditSystem.usageHistory.some(
          (u) =>
            u.groupId &&
            u.groupId.toString() === deductionData.groupId.toString(),
        )
      : false;

    const usageRecord = {
      sessionId: deductionData.sessionId || null,
      groupId: deductionData.groupId || null,
      date: new Date(),
      hoursDeducted: deductionData.hours,
      sessionTitle: deductionData.sessionTitle || "Session",
      groupName: deductionData.groupName || "Group",
      attendanceStatus: deductionData.attendanceStatus || "present",
      exceptionId: deductionData.exceptionId,
      notes: deductionData.notes || "",
      deductedFromExceptions,
      deductedFromPackage,
    };

    this.creditSystem.usageHistory.push(usageRecord);

    this.creditSystem.stats.totalHoursUsed =
      (this.creditSystem.stats.totalHoursUsed || 0) + deductionData.hours;
    this.creditSystem.stats.totalHoursRemaining =
      this.getEffectiveRemainingHours();
    this.creditSystem.stats.totalSessionsAttended =
      (this.creditSystem.stats.totalSessionsAttended || 0) + 1;
    this.creditSystem.stats.lastUsageDate = new Date();

     await this.save({ validateModifiedOnly: true });

    // ✅ NEW: تفعيل بداية الإسكرو (14 يوم) لو ده أول سيشن بتتخصم منها ساعات
    // في الجروب ده — بأي حالة حضور. العملية غير حرجة: لو فشلت متأثرش على
    // نجاح خصم الساعات نفسه.
    if (isFirstUsageForGroup && deductionData.groupId) {
      try {
        const { handleFirstSessionForBilling } = await import("@/lib/billing");
        await handleFirstSessionForBilling({
          studentId: this._id,
          groupId: deductionData.groupId,
        });
      } catch (billingError) {
        console.error(
          "⚠️ Failed to start escrow for billing:",
          billingError.message,
        );
      }
    }

    return {
      success: true,
      remainingHours: this.getEffectiveRemainingHours(),
      deductedFromExceptions,
      deductedFromPackage,
      usageRecord,
    };
  } catch (error) {
    console.error("❌ Error deducting credit hours:", error);
    return { success: false, error: error.message };
  }
};

// ✅ إضافة ساعات للرصيد (استرجاع)
StudentSchema.methods.addCreditHours = async function (addData) {
  try {
    if (!this.creditSystem?.currentPackage) {
      return {
        success: false,
        error: "No active credit package",
        canProceed: false,
      };
    }

    const currentPackage = this.creditSystem.currentPackage;
    currentPackage.remainingHours += addData.hours;

    if (!this.creditSystem.usageHistory) {
      this.creditSystem.usageHistory = [];
    }

    this.creditSystem.usageHistory.push({
      sessionId: addData.sessionId || null,
      groupId: addData.groupId || null,
      date: new Date(),
      hoursDeducted: -addData.hours,
      sessionTitle: addData.sessionTitle || "Refund",
      groupName: addData.groupName || "",
      attendanceStatus: "refund",
      notes: addData.reason || "Hours refunded",
      deductedFromExceptions: 0,
      deductedFromPackage: -addData.hours,
    });

    this.creditSystem.stats.totalHoursUsed = Math.max(
      0,
      (this.creditSystem.stats.totalHoursUsed || 0) - addData.hours,
    );
    this.creditSystem.stats.totalHoursRemaining =
      this.getEffectiveRemainingHours();
    this.creditSystem.stats.lastUsageDate = new Date();

    if (
      currentPackage.remainingHours > 0 &&
      currentPackage.status === "completed"
    ) {
      currentPackage.status = "active";
      this.creditSystem.status = "active";
    }

    if (this.communicationPreferences?.notificationChannels) {
      this.communicationPreferences.notificationChannels.whatsapp = true;
    }

      await this.save({ validateModifiedOnly: true });

    return {
      success: true,
      remainingHours: this.getEffectiveRemainingHours(),
      addedHours: addData.hours,
    };
  } catch (error) {
    console.error("❌ Error adding credit hours:", error);
    return { success: false, error: error.message };
  }
};

export default mongoose.models.Student ||
  mongoose.model("Student", StudentSchema);
