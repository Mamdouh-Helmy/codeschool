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
      enum: ["ar", "en"],
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

// ✅ NEW: WhatsApp Messages Log Schema
const whatsappMessageSchema = new mongoose.Schema(
  {
    messageType: {
      type: String,
      enum: [
        "welcome",
        "language_selection",
        "language_confirmation",
        "group_welcome",
        "session_reminder",
        "absence_notification",
        "session_cancelled",
        "session_postponed",
        "group_welcome_guardian", // ✅ أضف هذا
        "session_reminder_guardian", // ✅ أضف هذا
        "session_reminder_student", // ✅ أضف هذا
        "custom",
        "other",
      ],
      required: true,
    },
    messageContent: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      enum: ["ar", "en"],
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
      email: { type: String, lowercase: true },
      phone: { type: String },
      whatsappNumber: { type: String },
      dateOfBirth: { type: Date },
      gender: { type: String },
      nationalId: { type: String, unique: true, sparse: true },
      address: addressSchema,
    },

    guardianInfo: {
      name: { type: String },
      relationship: { type: String },
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

    // ✅ NEW: WhatsApp Messages Log Array
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
  },
);

// Indexes
StudentSchema.index({ enrollmentNumber: 1 }, { unique: true, sparse: true });
StudentSchema.index({ "personalInfo.whatsappNumber": 1 });
StudentSchema.index(
  { "personalInfo.nationalId": 1 },
  { unique: true, sparse: true },
);
StudentSchema.index({ "enrollmentInfo.status": 1 });
StudentSchema.index({ "personalInfo.email": 1 });
StudentSchema.index({ authUserId: 1 }, { unique: true, sparse: true });
StudentSchema.index({ "academicInfo.groupIds": 1 });
StudentSchema.index({ "communicationPreferences.preferredLanguage": 1 });
StudentSchema.index({ "sessionReminders.sessionId": 1 });
StudentSchema.index({ "sessionReminders.reminderType": 1 });
StudentSchema.index({ "sessionReminders.sentAt": -1 });

// ✅ NEW: WhatsApp Messages Indexes
StudentSchema.index({ "whatsappMessages.sentAt": -1 });
StudentSchema.index({ "whatsappMessages.messageType": 1 });
StudentSchema.index({ "whatsappMessages.status": 1 });

// Pre-find middleware
StudentSchema.pre("find", function () {
  this.where({ isDeleted: false });
});

StudentSchema.pre("findOne", function () {
  this.where({ isDeleted: false });
});

// ✅ هذا الجزء يُستبدل في ملف Student.js

// ✅ FIXED: Pre-save middleware
StudentSchema.pre("save", async function () {
  console.log("🔧 [PRE-SAVE] Executing pre-save middleware...");

  try {
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
    throw error;
  }
});

// ✅ IMPROVED: Method to log WhatsApp message - More robust error handling
StudentSchema.methods.logWhatsAppMessage = async function (messageData) {
  try {
    console.log(`\n📝 [LOG_METHOD] Logging WhatsApp message`);
    console.log(`   Type: ${messageData.messageType}`);
    console.log(`   Status: ${messageData.status}`);

    if (!this.whatsappMessages) {
      this.whatsappMessages = [];
    }

    // ✅ Only map to whatsappMessageSchema fields
    const messageToLog = {
      messageType: messageData.messageType,
      messageContent: messageData.messageContent,
      language: messageData.language || "ar",
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

    // ✅ Update ONLY safe metadata counters
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

    // ✅ Use proper save with error handling
    const savedDoc = await this.save();
    console.log(`✅ Document saved successfully`);
    return savedDoc;
  } catch (error) {
    console.error(
      `\n❌ [LOG_METHOD] Error in logWhatsAppMessage:`,
      error.message,
    );
    if (error.name === "ValidationError") {
      console.error(`   Validation Errors:`);
      Object.entries(error.errors).forEach(([field, err]) => {
        console.error(`   - ${field}: ${err.message}`);
      });
    }
    throw error;
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

// ✅ Method to get message statistics
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
    // Count by status
    if (msg.status === "sent") stats.sent++;
    if (msg.status === "failed") stats.failed++;
    if (msg.status === "pending") stats.pending++;

    // Count by type
    stats.byType[msg.messageType] = (stats.byType[msg.messageType] || 0) + 1;

    // Count by language
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

export default mongoose.models.Student ||
  mongoose.model("Student", StudentSchema);
