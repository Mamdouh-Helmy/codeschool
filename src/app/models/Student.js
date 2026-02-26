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
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    reminderType: { type: String, enum: ["24hours", "1hour"], required: true },
    message: { type: String, required: true },
    language: { type: String, enum: ["ar", "en", "bilingual"], default: "ar" },
    sentAt: { type: Date, default: Date.now },
    status: { type: String, enum: ["sent", "failed", "pending"], default: "sent" },
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
         "welcome", "language_selection", "language_confirmation",
        "group_welcome", "group_welcome_guardian", "group_welcome_student",
        "session_reminder", "session_reminder_guardian", "session_reminder_student",
        "absence_notification", "late_notification", "excused_notification",
        "session_cancelled", "session_postponed", "group_completion",
        "custom", "other",
        "session_cancelled_student", "session_postponed_student",
        "reminder_24h_student", "reminder_1h_student", "group_completion_student",
        "session_cancelled_guardian", "session_postponed_guardian",
        "reminder_24h_guardian", "reminder_1h_guardian", "group_completion_guardian",
        "bilingual_language_selection", "bilingual_guardian_notification",
        "bilingual_language_confirmation", "bilingual_language_confirmation_guardian",
        "credit_alert", "credit_exhausted",
        "absence_notification", "late_notification", "excused_notification"
      ],
      required: true,
    },
    messageContent: { type: String, required: true },
    language: { type: String, enum: ["ar", "en", "bilingual"], default: "ar" },
    status: { type: String, enum: ["sent", "failed", "pending"], default: "sent", required: true },
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
      recipientType: { type: String, enum: ["student", "guardian"], default: "student" },
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
    required: true
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
    default: "active"
  }
});

// ✅ Credit Hours Exception Schema
const creditExceptionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["deduction", "addition", "freeze"],
    required: true
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
    default: "active"
  },
  isFrozen: { type: Boolean, default: false },
  frozenUntil: { type: Date },
  appliedToSessions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Session" }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
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
    default: "present"
  },
  exceptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Student.creditExceptions" },
  notes: String,
  deductedFromExceptions: { type: Number, default: 0 },
  deductedFromPackage: { type: Number, default: 0 }
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
      nationalId: { type: String, unique: true, sparse: true },
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
        default: "no_package"
      },
      notes: String
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
StudentSchema.methods.getEffectiveRemainingHours = function() {
  let total = 0;
  
  // رصيد الحزمة الحالية فقط (لأن استثناءات addition مضافة بالفعل إلى remainingHours)
  if (this.creditSystem?.currentPackage) {
    total += this.creditSystem.currentPackage.remainingHours || 0;
  }
  
  // ❌ لا نضيف الاستثناءات هنا لأنها مضافة بالفعل إلى remainingHours
  
  return total;
};

/**
 * ✅ التحقق من صلاحية الطالب لاستقبال الرسائل (محدثة)
 */
StudentSchema.methods.canReceiveMessages = function() {
  // حساب الرصيد الفعلي
  const effectiveRemaining = this.getEffectiveRemainingHours();
  
  // التحقق من الرصيد
  if (effectiveRemaining <= 0) {
    return { 
      canReceive: false, 
      reason: "zero_balance",
      message: "Zero balance - notifications disabled",
      remainingHours: 0
    };
  }

  // التحقق من إعدادات الإشعارات
  const whatsappEnabled = this.communicationPreferences?.notificationChannels?.whatsapp;
  if (!whatsappEnabled) {
    return { 
      canReceive: false, 
      reason: "whatsapp_disabled",
      message: "WhatsApp notifications are disabled" 
    };
  }

  // التحقق من وجود رقم واتساب صالح
  if (!this.personalInfo?.whatsappNumber && !this.guardianInfo?.whatsappNumber && !this.guardianInfo?.phone) {
    return { 
      canReceive: false, 
      reason: "no_whatsapp_number",
      message: "No WhatsApp number available" 
    };
  }

  return { 
    canReceive: true, 
    remainingHours: effectiveRemaining,
    preferredLanguage: this.communicationPreferences?.preferredLanguage || 'ar'
  };
};

/**
 * ✅ الحصول على حالة الرصيد (محدثة)
 */
StudentSchema.methods.getBalanceStatus = function() {
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
    percentageUsed: this.creditSystem?.currentPackage?.totalHours > 0 
      ? Math.round(((this.creditSystem?.stats?.totalHoursUsed || 0) / this.creditSystem.currentPackage.totalHours) * 100)
      : 0
  };
};

// ✅ إضافة حزمة ساعات جديدة
StudentSchema.methods.addCreditPackage = async function(packageData) {
  try {
    const packageTypes = {
      "3months": 24,
      "6months": 48,
      "9months": 72,
      "12months": 96
    };

    const totalHours = packageTypes[packageData.packageType];
    if (!totalHours) {
      throw new Error("Invalid package type");
    }

    const startDate = packageData.startDate || new Date();
    const endDate = new Date(startDate);
    
    const months = {
      "3months": 3,
      "6months": 6,
      "9months": 9,
      "12months": 12
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
      status: "active"
    };

    // إذا كان هناك package حالي، انقله للتاريخ
    if (this.creditSystem?.currentPackage) {
      if (!this.creditSystem.packagesHistory) {
        this.creditSystem.packagesHistory = [];
      }
      this.creditSystem.packagesHistory.push({
        ...this.creditSystem.currentPackage.toObject(),
        isActive: false,
        status: "expired"
      });
    }

    // تأكد من وجود creditSystem
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
          lowBalanceAlertsSent: 0
        },
        status: "no_package"
      };
    }

    this.creditSystem.currentPackage = newPackage;
    this.creditSystem.stats.totalHoursPurchased += totalHours;
    this.creditSystem.stats.totalHoursRemaining = totalHours; // ✅ الرصيد المبدئي = totalHours
    this.creditSystem.stats.lastPackagePurchase = new Date();
    this.creditSystem.status = "active";

    // إعادة تفعيل الإشعارات
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

// ✅ إضافة استثناء (معدلة - بدون مضاعفة)
StudentSchema.methods.addCreditException = async function(exceptionData) {
  try {
    console.log("🔄 addCreditException called with:", exceptionData);
    
    if (!this.creditSystem) {
      this.creditSystem = {
        exceptions: [],
        usageHistory: [],
        stats: {
          totalExceptions: 0,
          activeExceptions: 0,
          lowBalanceAlertsSent: 0
        },
        status: "no_package"
      };
    }

    if (!this.creditSystem.exceptions) {
      this.creditSystem.exceptions = [];
    }

    // التحقق من وجود استثناء مكرر
    const today = new Date(exceptionData.startDate).toDateString();
    const existingException = this.creditSystem.exceptions.find(
      e => e.type === exceptionData.type && 
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
      frozenUntil: exceptionData.type === "freeze" ? exceptionData.endDate : null,
      appliedToSessions: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.creditSystem.exceptions.push(newException);
    
    // تحديث الإحصائيات
    this.creditSystem.stats.totalExceptions = (this.creditSystem.stats.totalExceptions || 0) + 1;
    this.creditSystem.stats.activeExceptions = (this.creditSystem.stats.activeExceptions || 0) + 1;

    // إذا كان استثناء من نوع freeze، غير حالة النظام
    if (exceptionData.type === "freeze") {
      this.creditSystem.status = "frozen";
    }

    // إذا كان استثناء من نوع deduction، اخصم الساعات
    if (exceptionData.type === "deduction" && exceptionData.hours) {
      const deductionResult = await this.deductCreditHours({
        hours: exceptionData.hours,
        reason: `Exception: ${exceptionData.reason}`,
        exceptionId: newException._id
      });
      
      if (!deductionResult.success) {
        console.warn("⚠️ Deduction failed:", deductionResult.error);
      }
    }

    // ✅ إذا كان استثناء من نوع addition، أضف الساعات للرصيد مباشرة
    if (exceptionData.type === "addition" && exceptionData.hours) {
      if (this.creditSystem.currentPackage) {
        console.log(`➕ Adding ${exceptionData.hours} hours to package`);
        console.log(`   Before: ${this.creditSystem.currentPackage.remainingHours}`);
        
        // أضف الساعات إلى remainingHours (مرة واحدة فقط)
        this.creditSystem.currentPackage.remainingHours += exceptionData.hours;
        
        console.log(`   After: ${this.creditSystem.currentPackage.remainingHours}`);
        
        // سجل العملية في history
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
          deductedFromPackage: 0
        });

        // ✅ إعادة تفعيل الإشعارات إذا كان الرصيد أكبر من صفر
        if (this.creditSystem.currentPackage.remainingHours > 0) {
          if (this.communicationPreferences?.notificationChannels) {
            this.communicationPreferences.notificationChannels.whatsapp = true;
          }
        }

        // ✅ تحديث totalHoursRemaining بقيمة الحزمة فقط (لأن الاستثناء مضاف فيها)
        this.creditSystem.stats.totalHoursRemaining = this.creditSystem.currentPackage.remainingHours;
      }
    }

    await this.save();
    console.log("✅ Exception added successfully");
    console.log(`📊 Final totalHoursRemaining: ${this.creditSystem.stats.totalHoursRemaining}`);
    
    return { success: true, data: newException };
  } catch (error) {
    console.error("❌ Error adding credit exception:", error);
    return { success: false, error: error.message };
  }
};

// ✅ إنهاء استثناء
StudentSchema.methods.endCreditException = async function(exceptionId) {
  try {
    const exception = this.creditSystem?.exceptions?.id(exceptionId);
    if (!exception) {
      throw new Error("Exception not found");
    }

    exception.status = "completed";
    exception.endDate = new Date();
    exception.updatedAt = new Date();

    // تقليل عدد الاستثناءات النشطة
    if (this.creditSystem.stats.activeExceptions > 0) {
      this.creditSystem.stats.activeExceptions -= 1;
    }

    // إذا كان استثناء freeze وكان هو الوحيد النشط، رجع الحالة لـ active
    if (exception.type === "freeze") {
      const hasActiveFreeze = this.creditSystem.exceptions.some(
        e => e.type === "freeze" && e.status === "active"
      );
      
      if (!hasActiveFreeze) {
        this.creditSystem.status = this.creditSystem.currentPackage ? "active" : "no_package";
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
StudentSchema.methods.deductCreditHours = async function(deductionData) {
  try {
    const effectiveRemaining = this.getEffectiveRemainingHours();
    
    if (effectiveRemaining < deductionData.hours) {
      return { 
        success: false, 
        error: `Insufficient hours. Remaining: ${effectiveRemaining}`,
        remainingHours: effectiveRemaining,
        canProceed: false 
      };
    }

    let hoursToDeduct = deductionData.hours;
    let deductedFromExceptions = 0;
    let deductedFromPackage = 0;

    // الخصم من الاستثناءات أولاً
    if (this.creditSystem.exceptions && this.creditSystem.exceptions.length > 0) {
      const activeAdditions = this.creditSystem.exceptions.filter(
        e => e.type === 'addition' && 
             e.status === 'active' && 
             (!e.endDate || new Date() <= new Date(e.endDate))
      );

      for (const exception of activeAdditions) {
        if (hoursToDeduct <= 0) break;
        
        const deductFromException = Math.min(exception.hours || 0, hoursToDeduct);
        exception.hours = (exception.hours || 0) - deductFromException;
        hoursToDeduct -= deductFromException;
        deductedFromExceptions += deductFromException;
        
        if (exception.hours <= 0) {
          exception.status = 'completed';
          exception.endDate = new Date();
          this.creditSystem.stats.activeExceptions = Math.max(0, (this.creditSystem.stats.activeExceptions || 0) - 1);
        }
      }
    }

    // الخصم المتبقي من الحزمة
    if (hoursToDeduct > 0 && this.creditSystem.currentPackage) {
      const currentPackage = this.creditSystem.currentPackage;
      const deductFromPackage = Math.min(currentPackage.remainingHours, hoursToDeduct);
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
        canProceed: false 
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
      deductedFromPackage
    };

    this.creditSystem.usageHistory.push(usageRecord);

    this.creditSystem.stats.totalHoursUsed = (this.creditSystem.stats.totalHoursUsed || 0) + deductionData.hours;
    this.creditSystem.stats.totalHoursRemaining = this.getEffectiveRemainingHours();
    this.creditSystem.stats.totalSessionsAttended = (this.creditSystem.stats.totalSessionsAttended || 0) + 1;
    this.creditSystem.stats.lastUsageDate = new Date();

    await this.save();
    
    return { 
      success: true, 
      remainingHours: this.getEffectiveRemainingHours(),
      deductedFromExceptions,
      deductedFromPackage,
      usageRecord 
    };
  } catch (error) {
    console.error("❌ Error deducting credit hours:", error);
    return { success: false, error: error.message };
  }
};

// ✅ إضافة ساعات للرصيد (استرجاع)
StudentSchema.methods.addCreditHours = async function(addData) {
  try {
    if (!this.creditSystem?.currentPackage) {
      return { 
        success: false, 
        error: "No active credit package",
        canProceed: false 
      };
    }

    const currentPackage = this.creditSystem.currentPackage;
    currentPackage.remainingHours += addData.hours;

    if (!this.creditSystem.usageHistory) {
      this.creditSystem.usageHistory = [];
    }

    const usageRecord = {
      sessionId: addData.sessionId || null,
      groupId: addData.groupId || null,
      date: new Date(),
      hoursDeducted: -addData.hours,
      sessionTitle: addData.sessionTitle || "Manual Credit Addition",
      groupName: addData.groupName || "System",
      attendanceStatus: addData.attendanceStatus || "refund",
      notes: addData.notes || `Manual credit addition of ${addData.hours} hours`,
      deductedFromExceptions: 0,
      deductedFromPackage: addData.hours
    };

    this.creditSystem.usageHistory.push(usageRecord);

    this.creditSystem.stats.totalHoursUsed = (this.creditSystem.stats.totalHoursUsed || 0) - addData.hours;
    this.creditSystem.stats.totalHoursRemaining = this.getEffectiveRemainingHours();
    this.creditSystem.stats.totalSessionsAttended = (this.creditSystem.stats.totalSessionsAttended || 0) - 1;
    this.creditSystem.stats.lastUsageDate = new Date();

    if (currentPackage.remainingHours > 0) {
      if (this.communicationPreferences?.notificationChannels) {
        this.communicationPreferences.notificationChannels.whatsapp = true;
      }
    }

    await this.save();
    
    return { 
      success: true, 
      remainingHours: this.getEffectiveRemainingHours(),
      usageRecord 
    };
  } catch (error) {
    console.error("❌ Error adding credit hours:", error);
    return { success: false, error: error.message };
  }
};

// ✅ التحقق من صلاحية الطالب لحضور جلسة
StudentSchema.methods.canAttendSession = async function() {
  try {
    const effectiveRemaining = this.getEffectiveRemainingHours();
    
    if (effectiveRemaining < 2) {
      return {
        canAttend: false,
        reason: "insufficient_hours",
        message: "Insufficient hours for session (need 2 hours)",
        remainingHours: effectiveRemaining
      };
    }

    const activeFreeze = this.creditSystem.exceptions?.find(
      e => e.type === "freeze" && 
           e.status === "active" && 
           (!e.endDate || new Date() <= new Date(e.endDate))
    );

    if (activeFreeze) {
      return {
        canAttend: false,
        reason: "frozen",
        message: `Account frozen: ${activeFreeze.reason}`,
        exception: activeFreeze
      };
    }

    return {
      canAttend: true,
      remainingHours: effectiveRemaining,
      packageEndDate: this.creditSystem.currentPackage?.endDate
    };
  } catch (error) {
    console.error("❌ Error checking attendance eligibility:", error);
    return {
      canAttend: false,
      reason: "error",
      message: error.message
    };
  }
};

// ✅ الحصول على إحصائيات الساعات
StudentSchema.methods.getCreditStats = function() {
  if (!this.creditSystem) {
    return {
      hasPackage: false,
      packageType: null,
      totalHours: 0,
      usedHours: 0,
      remainingHours: 0,
      usagePercentage: 0,
      status: "no_package",
      activeExceptions: [],
      recentUsage: [],
      canReceiveMessages: false,
      balanceLevel: "none"
    };
  }

  const currentPackage = this.creditSystem.currentPackage;
  const totalHours = currentPackage?.totalHours || 0;
  const usedHours = this.creditSystem.stats?.totalHoursUsed || 0;
  const remainingHours = this.getEffectiveRemainingHours();
  const usagePercentage = totalHours > 0 ? (usedHours / totalHours) * 100 : 0;
  
  let balanceLevel = "good";
  if (remainingHours <= 0) balanceLevel = "zero";
  else if (remainingHours <= 2) balanceLevel = "critical";
  else if (remainingHours <= 5) balanceLevel = "low";

  const activeExceptions = this.creditSystem.exceptions?.filter(
    e => e.status === "active"
  ) || [];

  const recentUsage = this.creditSystem.usageHistory
    ?.sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10) || [];

  const canReceive = this.canReceiveMessages();

  return {
    hasPackage: !!currentPackage,
    packageType: currentPackage?.packageType,
    packageStartDate: currentPackage?.startDate,
    packageEndDate: currentPackage?.endDate,
    totalHours,
    usedHours,
    remainingHours,
    usagePercentage: Math.round(usagePercentage * 100) / 100,
    status: this.creditSystem.status,
    activeExceptions,
    activeExceptionsCount: activeExceptions.length,
    recentUsage,
    lastUsageDate: this.creditSystem.stats?.lastUsageDate,
    balanceLevel,
    canReceiveMessages: canReceive.canReceive,
    messagesDisabledReason: !canReceive.canReceive ? canReceive.reason : null,
    lowBalanceAlertsSent: this.creditSystem.stats?.lowBalanceAlertsSent || 0,
    zeroBalanceDate: this.creditSystem.stats?.zeroBalanceDate
  };
};

// ✅ تسجيل إشعار الرصيد المنخفض
StudentSchema.methods.logLowBalanceAlert = async function() {
  if (!this.creditSystem?.stats) return;
  
  this.creditSystem.stats.lowBalanceAlertsSent = (this.creditSystem.stats.lowBalanceAlertsSent || 0) + 1;
  await this.save();
};

// ✅ تعطيل إشعارات الطالب يدوياً
StudentSchema.methods.disableNotifications = async function(reason = "manual") {
  if (this.communicationPreferences?.notificationChannels) {
    this.communicationPreferences.notificationChannels.whatsapp = false;
    this.creditSystem.stats.notificationsDisabledAt = new Date();
    this.creditSystem.notes = this.creditSystem.notes 
      ? `${this.creditSystem.notes}\nNotifications disabled at ${new Date().toISOString()} - Reason: ${reason}`
      : `Notifications disabled at ${new Date().toISOString()} - Reason: ${reason}`;
    
    await this.save();
    return { success: true };
  }
  return { success: false, error: "No notification channels found" };
};

// ✅ تفعيل إشعارات الطالب
StudentSchema.methods.enableNotifications = async function() {
  if (this.communicationPreferences?.notificationChannels) {
    this.communicationPreferences.notificationChannels.whatsapp = true;
    this.creditSystem.notes = this.creditSystem.notes 
      ? `${this.creditSystem.notes}\nNotifications enabled at ${new Date().toISOString()}`
      : `Notifications enabled at ${new Date().toISOString()}`;
    
    await this.save();
    return { success: true };
  }
  return { success: false, error: "No notification channels found" };
};

// =============================================
// ✅ WHATSAPP METHODS
// =============================================

StudentSchema.methods.logWhatsAppMessage = async function (messageData) {
  try {
    if (!this.whatsappMessages) {
      this.whatsappMessages = [];
    }

    const validLanguages = ["ar", "en", "bilingual"];
    const language = validLanguages.includes(messageData.language)
      ? messageData.language
      : "ar";

    const messageToLog = {
      messageType: messageData.messageType,
      messageContent: messageData.messageContent,
      language: language,
      status: messageData.status || "sent",
      recipientNumber: messageData.recipientNumber,
      wapilotMessageId: messageData.wapilotMessageId || null,
      sentAt: messageData.sentAt || new Date(),
      metadata: {
        groupId: messageData.metadata?.groupId || null,
        groupName: messageData.metadata?.groupName || null,
        groupCode: messageData.metadata?.groupCode || null,
        sessionId: messageData.metadata?.sessionId || null,
        sessionTitle: messageData.metadata?.sessionTitle || null,
        attendanceStatus: messageData.metadata?.attendanceStatus || null,
        isCustomMessage: messageData.metadata?.isCustomMessage || false,
        recipientType: messageData.metadata?.recipientType || "student",
        guardianName: messageData.metadata?.guardianName || null,
        automationType: messageData.metadata?.automationType || null,
        interactive: messageData.metadata?.interactive || false,
        selectedLanguage: messageData.metadata?.selectedLanguage || null,
        reminderType: messageData.metadata?.reminderType || null,
        oldStatus: messageData.metadata?.oldStatus || null,
        newStatus: messageData.metadata?.newStatus || null,
        isBilingual: messageData.metadata?.isBilingual || false,
        languages: messageData.metadata?.languages || null,
        nameFormat: messageData.metadata?.nameFormat || null,
        studentGender: messageData.metadata?.studentGender || null,
        studentNicknameAr: messageData.metadata?.studentNicknameAr || null,
        studentNicknameEn: messageData.metadata?.studentNicknameEn || null,
        guardianNicknameAr: messageData.metadata?.guardianNicknameAr || null,
        guardianNicknameEn: messageData.metadata?.guardianNicknameEn || null,
        relationship: messageData.metadata?.relationship || null,
        remainingHours: messageData.metadata?.remainingHours,
        alertType: messageData.metadata?.alertType,
      },
      error: messageData.error || null,
      errorDetails: messageData.errorDetails || null,
    };

    this.whatsappMessages.push(messageToLog);

    if (!this.metadata) this.metadata = {};
    this.metadata.whatsappTotalMessages = (this.metadata.whatsappTotalMessages || 0) + 1;
    this.metadata.whatsappLastInteraction = new Date();
    this.metadata.updatedAt = new Date();

    await mongoose.model("Student").updateOne(
      { _id: this._id },
      {
        $push: { whatsappMessages: messageToLog },
        $set: {
          "metadata.whatsappTotalMessages": this.metadata.whatsappTotalMessages,
          "metadata.whatsappLastInteraction": new Date(),
          "metadata.updatedAt": new Date(),
        },
      }
    );

    return this;
  } catch (error) {
    console.error("❌ [logWhatsAppMessage] Error:", error.message);
    return null;
  }
};

StudentSchema.methods.getWhatsAppMessages = function (filters = {}) {
  if (!this.whatsappMessages || this.whatsappMessages.length === 0) return [];

  let messages = [...this.whatsappMessages];

  if (filters.messageType) messages = messages.filter((m) => m.messageType === filters.messageType);
  if (filters.status) messages = messages.filter((m) => m.status === filters.status);
  if (filters.language) messages = messages.filter((m) => m.language === filters.language);
  if (filters.startDate) messages = messages.filter((m) => m.sentAt >= new Date(filters.startDate));
  if (filters.endDate) messages = messages.filter((m) => m.sentAt <= new Date(filters.endDate));

  return messages.sort((a, b) => b.sentAt - a.sentAt);
};

StudentSchema.methods.getWhatsAppStats = function () {
  if (!this.whatsappMessages || this.whatsappMessages.length === 0) {
    return { total: 0, sent: 0, failed: 0, pending: 0, byType: {}, byLanguage: {} };
  }

  const stats = { total: this.whatsappMessages.length, sent: 0, failed: 0, pending: 0, byType: {}, byLanguage: {} };

  this.whatsappMessages.forEach((msg) => {
    if (msg.status === "sent") stats.sent++;
    if (msg.status === "failed") stats.failed++;
    if (msg.status === "pending") stats.pending++;
    stats.byType[msg.messageType] = (stats.byType[msg.messageType] || 0) + 1;
    stats.byLanguage[msg.language] = (stats.byLanguage[msg.language] || 0) + 1;
  });

  return stats;
};

// =============================================
// ✅ SESSION REMINDER METHODS
// =============================================

StudentSchema.methods.addSessionReminder = function (reminderData) {
  if (!this.sessionReminders) this.sessionReminders = [];
  this.sessionReminders.push(reminderData);
  if (!this.metadata) this.metadata = {};
  if (reminderData.reminderType === "24hours") this.metadata.lastSessionReminder24h = new Date();
  else if (reminderData.reminderType === "1hour") this.metadata.lastSessionReminder1h = new Date();
  this.metadata.totalSessionReminders = (this.metadata.totalSessionReminders || 0) + 1;
  this.metadata.whatsappTotalMessages = (this.metadata.whatsappTotalMessages || 0) + 1;
  this.metadata.whatsappLastInteraction = new Date();
  return this.save();
};

StudentSchema.methods.hasReceivedReminder = function (sessionId, reminderType) {
  if (!this.sessionReminders || this.sessionReminders.length === 0) return false;
  return this.sessionReminders.some(
    (r) => r.sessionId.toString() === sessionId.toString() &&
            r.reminderType === reminderType &&
            r.status === "sent"
  );
};

StudentSchema.methods.getSessionReminders = function (sessionId) {
  if (!this.sessionReminders) return [];
  return this.sessionReminders.filter((r) => r.sessionId.toString() === sessionId.toString());
};

// =============================================
// ✅ STATIC METHODS
// =============================================

StudentSchema.statics.getStudentsForReminder = async function (groupId, sessionId, reminderType) {
  const students = await this.find({
    "academicInfo.groupIds": groupId,
    "enrollmentInfo.status": "Active",
    "personalInfo.whatsappNumber": { $exists: true, $ne: null, $ne: "" },
    isDeleted: false,
  });
  
  const eligibleStudents = [];
  for (const student of students) {
    const canReceive = student.canReceiveMessages();
    if (canReceive.canReceive && !student.hasReceivedReminder(sessionId, reminderType)) {
      eligibleStudents.push(student);
    }
  }
  
  return eligibleStudents;
};

StudentSchema.statics.getExpiredPackages = async function() {
  const now = new Date();
  return await this.find({
    "creditSystem.currentPackage.endDate": { $lt: now },
    "creditSystem.currentPackage.status": "active",
    isDeleted: false
  });
};

StudentSchema.statics.getLowBalanceStudents = async function(threshold = 5) {
  const students = await this.find({
    isDeleted: false
  });
  
  return students.filter(student => {
    const effectiveRemaining = student.getEffectiveRemainingHours();
    return effectiveRemaining <= threshold && effectiveRemaining > 0;
  });
};

StudentSchema.statics.getZeroBalanceStudents = async function() {
  const students = await this.find({
    isDeleted: false
  });
  
  return students.filter(student => {
    return student.getEffectiveRemainingHours() <= 0;
  });
};

StudentSchema.statics.getStudentsWithDisabledNotifications = async function() {
  return await this.find({
    "communicationPreferences.notificationChannels.whatsapp": false,
    isDeleted: false
  });
};

// =============================================
// ✅ VIRTUALS
// =============================================

StudentSchema.virtual("fullNameWithNumber").get(function () {
  return `${this.personalInfo.fullName} (${this.enrollmentNumber})`;
});

StudentSchema.virtual("age").get(function () {
  if (!this.personalInfo.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.personalInfo.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// =============================================
// ✅ INDEXES
// =============================================

StudentSchema.index({ enrollmentNumber: 1 });
StudentSchema.index({ "personalInfo.email": 1 });
StudentSchema.index({ "personalInfo.phone": 1 });
StudentSchema.index({ "guardianInfo.phone": 1 });
StudentSchema.index({ "guardianInfo.whatsappNumber": 1 });
StudentSchema.index({ "academicInfo.groupIds": 1 });
StudentSchema.index({ isDeleted: 1 });
StudentSchema.index({ "creditSystem.status": 1 });
StudentSchema.index({ "creditSystem.currentPackage.remainingHours": 1 });

// =============================================
// ✅ EXPORT
// =============================================

export default mongoose.models.Student || mongoose.model("Student", StudentSchema);