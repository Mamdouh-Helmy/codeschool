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
  { _id: true, timestamps: true }
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
      ],
      required: true,
    },
    messageContent: { type: String, required: true },
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
  { _id: true, timestamps: true }
);

// ✅ Credit Hours Package Schema
const creditPackageSchema = new mongoose.Schema({
  packageType: {
    type: String,
    enum: ["3months", "6months", "9months", "12months"],
    required: true,
  },
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
        unique: true,
        sparse: true,
        default: null,
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
  }
);

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
              100
          )
        : 0,
  };
};

// ✅ إضافة حزمة ساعات جديدة
StudentSchema.methods.addCreditPackage = async function (packageData) {
  try {
    const packageTypes = {
      "3months": 24,
      "6months": 48,
      "9months": 72,
      "12months": 96,
    };

    const totalHours = packageTypes[packageData.packageType];
    if (!totalHours) {
      throw new Error("Invalid package type");
    }

    const startDate = packageData.startDate || new Date();
    const endDate = new Date(startDate);

    const months =
      {
        "3months": 3,
        "6months": 6,
        "9months": 9,
        "12months": 12,
      }[packageData.packageType] || 0;

    endDate.setMonth(endDate.getMonth() + months);

    const newPackage = {
      packageType: packageData.packageType,
      totalHours: totalHours,
      remainingHours: totalHours,
      startDate: startDate,
      endDate: endDate,
      price: packageData.price || 0,
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

    await this.save();
    return { success: true, data: newPackage };
  } catch (error) {
    console.error("❌ Error adding credit package:", error);
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
        e.status === "active"
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
          `   Before: ${this.creditSystem.currentPackage.remainingHours}`
        );

        this.creditSystem.currentPackage.remainingHours += exceptionData.hours;

        console.log(
          `   After: ${this.creditSystem.currentPackage.remainingHours}`
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

    await this.save();
    console.log("✅ Exception added successfully");
    console.log(
      `📊 Final totalHoursRemaining: ${this.creditSystem.stats.totalHoursRemaining}`
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
        (e) => e.type === "freeze" && e.status === "active"
      );

      if (!hasActiveFreeze) {
        this.creditSystem.status = this.creditSystem.currentPackage
          ? "active"
          : "no_package";
      }
    }

    await this.save();
    return { success: true, data: exception };
  } catch (error) {
    console.error("❌ Error ending credit exception:", error);
    return { success: false, error: error.message };
  }
};

// ✅ خصم ساعات من الرصيد
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
          (!e.endDate || new Date() <= new Date(e.endDate))
      );

      for (const exception of activeAdditions) {
        if (hoursToDeduct <= 0) break;

        const deductFromException = Math.min(
          exception.hours || 0,
          hoursToDeduct
        );
        exception.hours = (exception.hours || 0) - deductFromException;
        hoursToDeduct -= deductFromException;
        deductedFromExceptions += deductFromException;

        if (exception.hours <= 0) {
          exception.status = "completed";
          exception.endDate = new Date();
          this.creditSystem.stats.activeExceptions = Math.max(
            0,
            (this.creditSystem.stats.activeExceptions || 0) - 1
          );
        }
      }
    }

    if (hoursToDeduct > 0 && this.creditSystem.currentPackage) {
      const currentPackage = this.creditSystem.currentPackage;
      const deductFromPackage = Math.min(
        currentPackage.remainingHours,
        hoursToDeduct
      );
      currentPackage.remainingHours -= deductFromPackage;
      hoursToDeduct -= deductFromPackage;
      deductedFromPackage += deductFromPackage;

      if (currentPackage.remainingHours === 0) {
        currentPackage.status = "completed";
        this.creditSystem.status = "expired";
        this.creditSystem.stats.zeroBalanceDate = new Date();

        if (this.communicationPreferences?.notificationChannels) {
          this.communicationPreferences.notificationChannels.whatsapp = false;
          this.creditSystem.stats.notificationsDisabledAt = new Date();
        }
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

    await this.save();

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
      (this.creditSystem.stats.totalHoursUsed || 0) - addData.hours
    );
    this.creditSystem.stats.totalHoursRemaining =
      this.getEffectiveRemainingHours();
    this.creditSystem.stats.lastUsageDate = new Date();

    if (currentPackage.remainingHours > 0 && currentPackage.status === "completed") {
      currentPackage.status = "active";
      this.creditSystem.status = "active";
    }

    if (this.communicationPreferences?.notificationChannels) {
      this.communicationPreferences.notificationChannels.whatsapp = true;
    }

    await this.save();

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

export default mongoose.models.Student || mongoose.model("Student", StudentSchema);