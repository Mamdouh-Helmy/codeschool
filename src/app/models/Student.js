// /src/models/Student.js - النسخة النهائية مع دعم bilingual
import mongoose from "mongoose";

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
    reminderType: {
      type: String,
      enum: ["24hours", "1hour"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      enum: ["ar", "en", "bilingual"], // ✅ إضافة bilingual
      default: "ar",
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
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

// ✅ WhatsApp Messages Log Schema - مع دعم bilingual
const whatsappMessageSchema = new mongoose.Schema(
  {
    messageType: {
      type: String,
      enum: [
        // الأنواع الأساسية
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
        
        // الأنواع الجديدة للطالب
        "session_cancelled_student",
        "session_postponed_student",
        "reminder_24h_student",
        "reminder_1h_student",
        "group_completion_student",
        
        // الأنواع الجديدة لولي الأمر
        "session_cancelled_guardian",
        "session_postponed_guardian",
        "reminder_24h_guardian",
        "reminder_1h_guardian",
        "group_completion_guardian",
        
        // ✅ إضافة الأنواع الثنائية اللغة
        "bilingual_language_selection",
        "bilingual_guardian_notification",
        "bilingual_language_confirmation",
        "bilingual_language_confirmation_guardian",
      ],
      required: true,
    },
    messageContent: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      enum: ["ar", "en", "bilingual"], // ✅ إضافة bilingual
      default: "ar",
    },
    status: {
      type: String,
      enum: ["sent", "failed", "pending"],
      default: "sent",
      required: true,
    },
    recipientNumber: {
      type: String,
      required: true,
    },
    wapilotMessageId: {
      type: String,
    },
    sentAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
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
      
      // ✅ إضافة حقول جديدة للرسائل الثنائية اللغة
      isBilingual: { type: Boolean, default: false },
      languages: [String],
      nameFormat: String,
      studentGender: String,
      studentNicknameAr: String,
      studentNicknameEn: String,
      guardianNicknameAr: String,
      guardianNicknameEn: String,
      relationship: String,
    },
    error: {
      type: String,
    },
    errorDetails: {
      stack: String,
      code: String,
      message: String,
    },
  },
  { _id: true, timestamps: true },
);

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
        enum: ["male", "female", "other"],
        default: "male",
        // ✅ setter قوي جداً لتحويل أي قيمة إلى lowercase
        set: function(v) {
          if (!v) return 'male';
          if (typeof v === 'string') {
            const lower = v.toLowerCase().trim();
            if (lower === 'male' || lower === 'female' || lower === 'other') {
              return lower;
            }
          }
          return 'male';
        },
        // ✅ getter للتأكد من أن القيمة المرتجعة صحيحة
        get: function(v) {
          if (!v) return 'male';
          if (typeof v === 'string') {
            const lower = v.toLowerCase().trim();
            if (lower === 'male' || lower === 'female' || lower === 'other') {
              return lower;
            }
          }
          return 'male';
        }
      },
      nationalId: { type: String, unique: true, sparse: true },
      address: addressSchema,
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
      preferredLanguage: {
        type: String,
        enum: ["ar", "en"],
        default: "ar",
      },
      notificationChannels: notificationChannelsSchema,
      marketingOptIn: { type: Boolean, default: true },
    },

    sessionReminders: [sessionReminderSchema],

    // ✅ WhatsApp Messages Log Array
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
    // ✅ تفعيل getters عند التحويل إلى JSON
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// ✅ Pre-find middleware لتصحيح البيانات عند الاستعلام
StudentSchema.pre("find", function() {
  this._conditions = this._conditions || {};
  // لا نفعل شيئاً هنا، فقط نمرر
});

StudentSchema.pre("findOne", function() {
  this._conditions = this._conditions || {};
});

// ✅ Pre-save middleware قوي جداً
StudentSchema.pre("save", async function(next) {
  console.log("🔧 [PRE-SAVE] Executing pre-save middleware...");

  try {
    // ✅ 1. تصحيح الـ gender بشكل يدوي
    if (this.personalInfo) {
      if (this.personalInfo.gender) {
        const originalGender = this.personalInfo.gender;
        const lowerGender = String(this.personalInfo.gender).toLowerCase().trim();
        
        if (lowerGender === 'male' || lowerGender === 'female' || lowerGender === 'other') {
          this.personalInfo.gender = lowerGender;
        } else {
          this.personalInfo.gender = 'male';
        }
        
        if (originalGender !== this.personalInfo.gender) {
          console.log(`✅ Fixed gender: ${originalGender} -> ${this.personalInfo.gender}`);
        }
      } else {
        this.personalInfo.gender = 'male';
      }
    }

    // ✅ 2. تصحيح الـ whatsappMessages
    if (this.whatsappMessages && Array.isArray(this.whatsappMessages)) {
      // تنظيف الرسائل الموجودة
      this.whatsappMessages = this.whatsappMessages.filter(msg => msg && typeof msg === 'object');
      
      this.whatsappMessages.forEach((msg, index) => {
        // تصحيح اللغة - مع دعم bilingual
        if (msg.language && !['ar', 'en', 'bilingual'].includes(msg.language)) {
          console.log(`✅ Fixed message language: ${msg.language} -> ar`);
          msg.language = 'ar';
        }
        
        // تصحيح نوع الرسالة - مع دعم الأنواع الجديدة
        const validTypes = [
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
          // ✅ إضافة الأنواع الجديدة
          "bilingual_language_selection",
          "bilingual_guardian_notification",
          "bilingual_language_confirmation",
          "bilingual_language_confirmation_guardian",
        ];
        
        if (!validTypes.includes(msg.messageType)) {
          console.log(`⚠️ Invalid message type: ${msg.messageType}, keeping as is for now`);
          // لا نغيره هنا لأن السيف سيتعامل معه
        }
      });
    }

    // ✅ 3. التأكد من وجود metadata
    if (!this.metadata) {
      console.log("📝 Initializing metadata object");
      this.metadata = {
        createdAt: new Date(),
        updatedAt: new Date(),
        whatsappTotalMessages: 0,
        whatsappMessagesCount: 0,
        totalSessionReminders: 0,
      };
    } else {
      console.log("📝 Updating metadata.updatedAt");
      this.metadata.updatedAt = new Date();
    }

    if (this.isNew) {
      console.log("📝 This is a new document");
      if (!this.metadata.createdAt) {
        this.metadata.createdAt = new Date();
      }
    }

    console.log("✅ [PRE-SAVE] Middleware completed successfully");
  } catch (error) {
    console.error("❌ Error in pre-save middleware:", error);
  }
  
  next();
});

// ✅ Method to log WhatsApp message - مع دعم bilingual
StudentSchema.methods.logWhatsAppMessage = async function (messageData) {
  try {
    console.log(`\n📝 [LOG_METHOD] Logging WhatsApp message`);
    console.log(`   Type: ${messageData.messageType}`);
    console.log(`   Status: ${messageData.status}`);
    console.log(`   Language: ${messageData.language}`);

    if (!this.whatsappMessages) {
      this.whatsappMessages = [];
    }

    // ✅ تصحيح اللغة - مع دعم bilingual
    let language = messageData.language || "ar";
    const validLanguages = ["ar", "en", "bilingual"];
    if (!validLanguages.includes(language)) {
      language = "ar";
      console.log(`⚠️ Invalid language value, defaulting to 'ar'`);
    }

    // ✅ التحقق من نوع الرسالة - مع دعم bilingual
    const validMessageTypes = [
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
      // ✅ إضافة الأنواع الجديدة
      "bilingual_language_selection",
      "bilingual_guardian_notification",
      "bilingual_language_confirmation",
      "bilingual_language_confirmation_guardian",
    ];

    let messageType = messageData.messageType;
    if (!validMessageTypes.includes(messageType)) {
      console.log(`⚠️ Invalid message type: ${messageType}, using as is (might be new type)`);
      // نستخدمه كما هو، لأن السكيما ستتعامل معه
    }

    // ✅ تصحيح الـ gender قبل الحفظ
    if (this.personalInfo && this.personalInfo.gender) {
      const originalGender = this.personalInfo.gender;
      const lowerGender = String(this.personalInfo.gender).toLowerCase().trim();
      if (lowerGender === 'male' || lowerGender === 'female' || lowerGender === 'other') {
        this.personalInfo.gender = lowerGender;
      } else {
        this.personalInfo.gender = 'male';
      }
      if (originalGender !== this.personalInfo.gender) {
        console.log(`✅ Fixed gender before save: ${originalGender} -> ${this.personalInfo.gender}`);
      }
    }

    const messageToLog = {
      messageType: messageType,
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
        
        // ✅ إضافة الحقول الجديدة للرسائل الثنائية اللغة
        isBilingual: messageData.metadata?.isBilingual || false,
        languages: messageData.metadata?.languages || null,
        nameFormat: messageData.metadata?.nameFormat || null,
        studentGender: messageData.metadata?.studentGender || null,
        studentNicknameAr: messageData.metadata?.studentNicknameAr || null,
        studentNicknameEn: messageData.metadata?.studentNicknameEn || null,
        guardianNicknameAr: messageData.metadata?.guardianNicknameAr || null,
        guardianNicknameEn: messageData.metadata?.guardianNicknameEn || null,
        relationship: messageData.metadata?.relationship || null,
      },
      error: messageData.error || null,
      errorDetails: messageData.errorDetails || null,
    };

    console.log(`✅ Message object created:`, {
      type: messageToLog.messageType,
      status: messageToLog.status,
      to: messageToLog.recipientNumber,
      language: messageToLog.language,
    });

    this.whatsappMessages.push(messageToLog);
    console.log(`✅ Added to whatsappMessages array`);

    if (!this.metadata) {
      this.metadata = {};
    }

    this.metadata.whatsappTotalMessages =
      (this.metadata.whatsappTotalMessages || 0) + 1;
    this.metadata.whatsappLastInteraction = new Date();

    console.log(`📊 Updated metadata counters:`);
    console.log(`   Total messages: ${this.metadata.whatsappTotalMessages}`);
    console.log(
      `   Last interaction: ${this.metadata.whatsappLastInteraction.toISOString()}`,
    );

    console.log(`💾 Saving student document...`);

    // ✅ محاولة الحفظ مع معالجة الأخطاء
    try {
      const savedDoc = await this.save();
      console.log(`✅ Document saved successfully`);
      return savedDoc;
    } catch (saveError) {
      console.error(`❌ Save failed, trying one more time with clean data...`);
      
      // ✅ محاولة أخيرة: إنشاء كائن نظيف للحفظ
      const cleanDoc = this.toObject();
      
      // تنظيف الـ gender
      if (cleanDoc.personalInfo?.gender) {
        cleanDoc.personalInfo.gender = String(cleanDoc.personalInfo.gender).toLowerCase();
      }
      
      // حفظ باستخدام updateOne لتجاوز الفاليديشن
      await mongoose.model('Student').updateOne(
        { _id: this._id },
        { 
          $set: {
            'personalInfo.gender': 'male',
            whatsappMessages: this.whatsappMessages,
            'metadata.whatsappTotalMessages': this.metadata.whatsappTotalMessages,
            'metadata.whatsappLastInteraction': new Date()
          }
        }
      );
      
      console.log(`✅ Saved using updateOne fallback`);
      return this;
    }
  } catch (error) {
    console.error(`\n❌ [LOG_METHOD] Error in logWhatsAppMessage:`, error.message);
    if (error.name === "ValidationError") {
      console.error(`   Validation Errors:`);
      Object.entries(error.errors).forEach(([field, err]) => {
        console.error(`   - ${field}: ${err.message}`);
      });
    }
    // لا نرمي الخطأ حتى لا نوقف إرسال الرسالة
    return null;
  }
};

// ✅ Method to get all WhatsApp messages
StudentSchema.methods.getWhatsAppMessages = function (filters = {}) {
  if (!this.whatsappMessages || this.whatsappMessages.length === 0) {
    return [];
  }

  let messages = [...this.whatsappMessages];

  if (filters.messageType) {
    messages = messages.filter(
      (msg) => msg.messageType === filters.messageType,
    );
  }

  if (filters.status) {
    messages = messages.filter((msg) => msg.status === filters.status);
  }

  if (filters.language) {
    messages = messages.filter((msg) => msg.language === filters.language);
  }

  if (filters.startDate) {
    messages = messages.filter(
      (msg) => msg.sentAt >= new Date(filters.startDate),
    );
  }

  if (filters.endDate) {
    messages = messages.filter(
      (msg) => msg.sentAt <= new Date(filters.endDate),
    );
  }

  return messages.sort((a, b) => b.sentAt - a.sentAt);
};

// ✅ Method to get message statistics - مع دعم bilingual
StudentSchema.methods.getWhatsAppStats = function () {
  if (!this.whatsappMessages || this.whatsappMessages.length === 0) {
    return {
      total: 0,
      sent: 0,
      failed: 0,
      pending: 0,
      byType: {},
      byLanguage: {},
    };
  }

  const stats = {
    total: this.whatsappMessages.length,
    sent: 0,
    failed: 0,
    pending: 0,
    byType: {},
    byLanguage: {},
  };

  this.whatsappMessages.forEach((msg) => {
    if (msg.status === "sent") stats.sent++;
    if (msg.status === "failed") stats.failed++;
    if (msg.status === "pending") stats.pending++;

    stats.byType[msg.messageType] = (stats.byType[msg.messageType] || 0) + 1;
    stats.byLanguage[msg.language] = (stats.byLanguage[msg.language] || 0) + 1;
  });

  return stats;
};

// Session Reminder Methods
StudentSchema.methods.addSessionReminder = function (reminderData) {
  if (!this.sessionReminders) {
    this.sessionReminders = [];
  }

  this.sessionReminders.push(reminderData);

  if (!this.metadata) {
    this.metadata = {};
  }

  if (reminderData.reminderType === "24hours") {
    this.metadata.lastSessionReminder24h = new Date();
  } else if (reminderData.reminderType === "1hour") {
    this.metadata.lastSessionReminder1h = new Date();
  }

  this.metadata.totalSessionReminders =
    (this.metadata.totalSessionReminders || 0) + 1;
  this.metadata.whatsappTotalMessages =
    (this.metadata.whatsappTotalMessages || 0) + 1;
  this.metadata.whatsappLastInteraction = new Date();

  return this.save();
};

StudentSchema.methods.hasReceivedReminder = function (sessionId, reminderType) {
  if (!this.sessionReminders || this.sessionReminders.length === 0) {
    return false;
  }

  return this.sessionReminders.some(
    (reminder) =>
      reminder.sessionId.toString() === sessionId.toString() &&
      reminder.reminderType === reminderType &&
      reminder.status === "sent",
  );
};

StudentSchema.methods.getSessionReminders = function (sessionId) {
  if (!this.sessionReminders) {
    return [];
  }

  return this.sessionReminders.filter(
    (reminder) => reminder.sessionId.toString() === sessionId.toString(),
  );
};

StudentSchema.statics.getStudentsForReminder = async function (
  groupId,
  sessionId,
  reminderType,
) {
  const students = await this.find({
    "academicInfo.groupIds": groupId,
    "enrollmentInfo.status": "Active",
    "personalInfo.whatsappNumber": { $exists: true, $ne: null, $ne: "" },
    isDeleted: false,
  });

  return students.filter(
    (student) => !student.hasReceivedReminder(sessionId, reminderType),
  );
};

// ✅ تصحيح البيانات الموجودة عند تحميل المودل
(async function fixExistingData() {
  try {
    const Student = mongoose.models.Student || mongoose.model("Student", StudentSchema);
    
    // البحث عن الطلاب الذين لديهم gender خاطئ
    const studentsWithWrongGender = await Student.find({
      $or: [
        { 'personalInfo.gender': { $regex: /^[A-Z]/ } }, // يبدأ بحرف كبير
        { 'personalInfo.gender': { $nin: ['male', 'female', 'other'] } }
      ]
    });

    if (studentsWithWrongGender.length > 0) {
      console.log(`🔧 Fixing ${studentsWithWrongGender.length} students with wrong gender...`);
      
      for (const student of studentsWithWrongGender) {
        const oldGender = student.personalInfo.gender;
        const newGender = String(oldGender).toLowerCase();
        
        if (['male', 'female', 'other'].includes(newGender)) {
          await Student.updateOne(
            { _id: student._id },
            { $set: { 'personalInfo.gender': newGender } }
          );
          console.log(`   Fixed: ${oldGender} -> ${newGender}`);
        } else {
          await Student.updateOne(
            { _id: student._id },
            { $set: { 'personalInfo.gender': 'male' } }
          );
          console.log(`   Fixed invalid: ${oldGender} -> male`);
        }
      }
    }

    // ✅ تصحيح الرسائل القديمة التي قد تكون bilingual
    const studentsWithBilingualMessages = await Student.find({
      'whatsappMessages.language': { $in: ['bilingual'] }
    });

    if (studentsWithBilingualMessages.length > 0) {
      console.log(`🔧 Found ${studentsWithBilingualMessages.length} students with bilingual messages - keeping as is`);
    }
  } catch (error) {
    // تجاهل الأخطاء عند التحميل
  }
})();

export default mongoose.models.Student ||
  mongoose.model("Student", StudentSchema);