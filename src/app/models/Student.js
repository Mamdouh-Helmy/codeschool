// /src/models/Student.js
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
    },
    error: { type: String },
    errorDetails: { stack: String, code: String, message: String },
  },
  { _id: true, timestamps: true }
);

// =============================================
// ✅ MAIN SCHEMA - بدون أي setter أو getter أو middleware
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
      // ✅ بدون setter أو getter - البيانات بتتنظف في route.js
      gender: {
        type: String,
        enum: ["male", "female", "other"],
        default: "male",
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
      preferredLanguage: { type: String, enum: ["ar", "en"], default: "ar" },
      notificationChannels: notificationChannelsSchema,
      marketingOptIn: { type: Boolean, default: true },
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
    // ✅ strict: true بس - بدون toJSON أو toObject أو أي options تانية
    strict: true,
  }
);

// =============================================
// ✅ INSTANCE METHODS
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
      },
      error: messageData.error || null,
      errorDetails: messageData.errorDetails || null,
    };

    this.whatsappMessages.push(messageToLog);

    if (!this.metadata) this.metadata = {};
    this.metadata.whatsappTotalMessages = (this.metadata.whatsappTotalMessages || 0) + 1;
    this.metadata.whatsappLastInteraction = new Date();
    this.metadata.updatedAt = new Date();

    // ✅ استخدم updateOne مباشرة بدلاً من this.save() لتجنب أي middleware
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
  return students.filter((s) => !s.hasReceivedReminder(sessionId, reminderType));
};

export default mongoose.models.Student || mongoose.model("Student", StudentSchema);