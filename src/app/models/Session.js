// models/Session.js - ENHANCED WITH MEETING LINK SUPPORT + CASCADE RESCHEDULE REQUESTS
import mongoose from "mongoose";

const attendanceRecordSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    status: {
      type: String,
      enum: ["present", "absent", "late", "excused"],
      required: true,
    },
    notes: String,
    markedAt: {
      type: Date,
      default: Date.now,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { _id: false }
);

// ✅ طلب ترحيل السلسلة (cascade reschedule) — السيشن دي + كل اللي بعدها بترحل
// بمقدار أسبوع. الطلب ده بيتخزن جوه السيشن نفسها (مش في كولكشن منفصلة) وبيفضل
// "pending" لحد ما الأدمن يوافق أو يرفض. كل السيشنات اللي طُلبت مع بعض في نفس
// الطلب بتشترك في batchId واحد عشان الأدمن يقدر يوافق/يرفض المجموعة كلها مرة واحدة.
const pendingRescheduleSchema = new mongoose.Schema(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    // السيشن اللي المدرس دوس عليها وبدأ منها الطلب (مش كل سيشن في السلسلة هي trigger)
    triggerSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    // فتح دي بس / فتح دي واللي بعدها (بيتحكم في canViewDetails بعد الترحيل)
    // - single:    بعد الموافقة، اللي بعد الـ trigger يفضلوا يتبعوا قاعدة isToday العادية
    // - withNext:  بعد الموافقة، اللي بعد الـ trigger يبقى عندهم تفاصيل عامة (محتوى/دروس)
    //              بس من غير meeting link ولا تسجيل حضور لحد ما تاريخهم الجديد يجي فعلاً
    viewMode: {
      type: String,
      enum: ["single", "withNext"],
      default: "single",
    },
    shiftDays: { type: Number, default: 7 },
    oldScheduledDate: { type: Date, required: true },
    newScheduledDate: { type: Date, required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    requestedAt: { type: Date, default: Date.now },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNotes: { type: String, default: "" },
  },
  { _id: false }
);

const SessionSchema = new mongoose.Schema(
  {
    // Relations
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: [true, "Group is required"],
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course is required"],
    },

    // Curriculum Position - NEW: 3 Sessions System
    moduleIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    // ✅ NEW: sessionNumber (1, 2, or 3) - directly from lesson.sessionNumber
    sessionNumber: {
      type: Number,
      required: true,
      enum: [1, 2, 3],
      validate: {
        validator: function (v) {
          return [1, 2, 3].includes(v);
        },
        message:
          "Session number must be 1, 2, or 3 (Lessons 1-2→S1, 3-4→S2, 5-6→S3)",
      },
    },
    // ✅ Store which lessons this session covers (e.g., [1,2] for Session 1)
    lessonIndexes: {
      type: [Number],
      required: true,
      validate: {
        validator: function (arr) {
          return arr.length === 2 && arr.every((n) => n >= 0 && n < 6);
        },
        message: "Each session must cover exactly 2 lessons (0-5)",
      },
    },

    // Session Details
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },

    // ✅ Meeting Link Information
    meetingLink: {
      type: String,
      trim: true,
    },
    meetingCredentials: {
      username: {
        type: String,
        trim: true,
      },
      password: {
        type: String,
      },
    },
    meetingLinkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MeetingLink",
    },
    meetingPlatform: {
      type: String,
      enum: ["zoom", "google_meet", "microsoft_teams", "other", null],
      default: null,
    },

    // Schedule
    scheduledDate: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },

    // Status
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "postponed"],
      default: "scheduled",
    },

    // Recording
    recordingLink: {
      type: String,
      trim: true,
    },

    // Attendance
    attendanceTaken: {
      type: Boolean,
      default: false,
    },
    attendance: [attendanceRecordSchema],

    // ✅ Cascade Reschedule Request (embedded — no separate collection)
    pendingReschedule: {
      type: pendingRescheduleSchema,
      default: null,
    },

    // ✅ Early/Forced Access Window — لما طلب ترحيل يتعمل عليه approve وهو
    // كان الـ trigger session، السيشن دي تتفتح فورًا (meeting link + حضور)
    // بغض النظر عن تاريخها المجدول، لغاية ما المدرس يسجل الحضور أو ينتهي
    // الوقت المسموح. ده فلاج مستقل تمامًا عن isToday.
    earlyAccess: {
      enabled: { type: Boolean, default: false },
      grantedAt: { type: Date },
      grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      batchId: { type: mongoose.Schema.Types.ObjectId },
      // بيتقفل تلقائيًا أول ما الحضور يتسجل أو لما الأدمن/الكرون يقفله
      consumedAt: { type: Date },
    },

    // Automation Tracking
    automationEvents: {
      // Reminders
      reminderSent: {
        type: Boolean,
        default: false,
      },
      reminderSentAt: Date,

      // Absence notifications
      absentNotificationsSent: {
        type: Boolean,
        default: false,
      },
      absentNotificationsSentAt: Date,

      // Session updates
      postponeNotificationSent: {
        type: Boolean,
        default: false,
      },
      cancelNotificationSent: {
        type: Boolean,
        default: false,
      },

      // Meeting link assignment
      meetingLinkAssigned: {
        type: Boolean,
        default: false,
      },
      meetingLinkAssignedAt: Date,

      // Reminder details
      reminder24hSent: { type: Boolean, default: false },
      reminder24hSentAt: Date,
      reminder24hStudentsNotified: { type: Number, default: 0 },

      reminder1hSent: { type: Boolean, default: false },
      reminder1hSentAt: Date,
      reminder1hStudentsNotified: { type: Number, default: 0 },

      reminderStats: {
        total24hSent: { type: Number, default: 0 },
        total24hFailed: { type: Number, default: 0 },
        total1hSent: { type: Number, default: 0 },
        total1hFailed: { type: Number, default: 0 },
      },
    },

    // Notes
    instructorNotes: {
      type: String,
      trim: true,
    },

    // Materials
    materials: [
      {
        name: String,
        url: String,
        type: {
          type: String,
          enum: ["pdf", "video", "link", "document", "presentation", "other"],
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],

    // Metadata
    metadata: {
      createdAt: {
        type: Date,
        default: Date.now,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },

    // Soft Delete
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
    strict: true,
  }
);

// ==================== INDEXES ====================

// Basic indexes
SessionSchema.index({ groupId: 1, scheduledDate: 1 });
SessionSchema.index({ groupId: 1, status: 1 });
SessionSchema.index({ courseId: 1 });
SessionSchema.index({ scheduledDate: 1, status: 1 });
SessionSchema.index({ moduleIndex: 1, sessionNumber: 1 });

// ✅ Meeting link indexes
SessionSchema.index({ meetingLinkId: 1 });
SessionSchema.index({ meetingPlatform: 1 });
SessionSchema.index({ "automationEvents.meetingLinkAssigned": 1 });

// ✅ Cascade reschedule indexes — للأدمن (قائمة pending) وللتحقق السريع من التكرار
SessionSchema.index({ "pendingReschedule.status": 1 });
SessionSchema.index({ "pendingReschedule.batchId": 1 });

// ✅ Early access index — يساعد في تنظيف/فلترة السيشنات اللي عندها فتح فوري شغال
SessionSchema.index({ "earlyAccess.enabled": 1 });

// ✅ Unique constraint: one session per group/module/sessionNumber
SessionSchema.index(
  { groupId: 1, moduleIndex: 1, sessionNumber: 1 },
  {
    unique: true,
    name: "unique_session_per_group_module",
    background: true,
    partialFilterExpression: { isDeleted: false }
  }
);

// ==================== MIDDLEWARE ====================

// Update timestamp
SessionSchema.pre("save", async function () {
  this.metadata.updatedAt = new Date();
});

// Prevent deletion queries from returning deleted sessions
SessionSchema.pre("find", function () {
  this.where({ isDeleted: false });
});

SessionSchema.pre("findOne", function () {
  this.where({ isDeleted: false });
});

// ✅ Automatically release meeting link when session is deleted or cancelled
SessionSchema.pre("save", async function () {
  if (this.isModified("isDeleted") && this.isDeleted && this.meetingLinkId) {
    try {
      const { releaseMeetingLink } = await import("../../utils/sessionGenerator");
      await releaseMeetingLink(this._id);
    } catch (error) {
      console.error("❌ Error releasing meeting link on delete:", error);
    }
  }

  if (this.isModified("status") && this.status === "cancelled" && this.meetingLinkId) {
    try {
      const { releaseMeetingLink } = await import("../../utils/sessionGenerator");
      await releaseMeetingLink(this._id);
    } catch (error) {
      console.error("❌ Error releasing meeting link on cancellation:", error);
    }
  }
});

// ✅ Prevent duplicate sessions on save
SessionSchema.pre("save", async function () {
  if (this.isNew) {
    const existingSession = await mongoose.models.Session.findOne({
      groupId: this.groupId,
      moduleIndex: this.moduleIndex,
      sessionNumber: this.sessionNumber,
      isDeleted: false,
    });

    if (existingSession) {
      const error = new Error(
        `Session already exists for group ${this.groupId}, module ${this.moduleIndex}, session ${this.sessionNumber}`
      );
      error.code = "DUPLICATE_SESSION";
      throw error;
    }
  }
});

// ==================== VIRTUAL PROPERTIES ====================

// Total students marked
SessionSchema.virtual("totalMarked").get(function () {
  return this.attendance ? this.attendance.length : 0;
});

// Present count
SessionSchema.virtual("presentCount").get(function () {
  return this.attendance
    ? this.attendance.filter((a) => a.status === "present").length
    : 0;
});

// Absent count
SessionSchema.virtual("absentCount").get(function () {
  return this.attendance
    ? this.attendance.filter((a) => a.status === "absent").length
    : 0;
});

// Late count
SessionSchema.virtual("lateCount").get(function () {
  return this.attendance
    ? this.attendance.filter((a) => a.status === "late").length
    : 0;
});

// Excused count
SessionSchema.virtual("excusedCount").get(function () {
  return this.attendance
    ? this.attendance.filter((a) => a.status === "excused").length
    : 0;
});

// Day of week name
SessionSchema.virtual("dayName").get(function () {
  const dayMap = {
    0: "Sunday",
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
  };
  return dayMap[new Date(this.scheduledDate).getDay()] || "Unknown";
});

// Formatted date (YYYY-MM-DD)
SessionSchema.virtual("formattedDate").get(function () {
  return this.scheduledDate
    ? this.scheduledDate.toISOString().split("T")[0]
    : "";
});

// Lessons covered text
SessionSchema.virtual("lessonsText").get(function () {
  return this.lessonIndexes.map((idx) => `Lesson ${idx + 1}`).join(" & ");
});

// Module position (for display)
SessionSchema.virtual("modulePosition").get(function () {
  return this.moduleIndex + 1;
});

// Full date time for sorting
SessionSchema.virtual("fullDateTime").get(function () {
  if (!this.scheduledDate || !this.startTime) return null;

  const date = new Date(this.scheduledDate);
  const [hours, minutes] = this.startTime.split(":").map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
});

// ✅ Check if session has meeting link
SessionSchema.virtual("hasMeetingLink").get(function () {
  return !!this.meetingLink;
});

// ✅ Get meeting platform icon
SessionSchema.virtual("meetingPlatformIcon").get(function () {
  const icons = {
    zoom: "🔷",
    google_meet: "🔴",
    microsoft_teams: "🔵",
    other: "🔗",
  };
  return icons[this.meetingPlatform] || "📅";
});

// ✅ Get meeting credentials display (masked password)
SessionSchema.virtual("credentialsDisplay").get(function () {
  if (!this.meetingCredentials) return null;

  return {
    username: this.meetingCredentials.username,
    password: this.meetingCredentials.password ? "••••••••" : null,
    hasPassword: !!this.meetingCredentials.password,
  };
});

// ✅ هل فيه طلب ترحيل قيد المراجعة على السيشن دي دلوقتي؟
SessionSchema.virtual("hasPendingReschedule").get(function () {
  return !!(this.pendingReschedule && this.pendingReschedule.status === "pending");
});

// ✅ هل السيشن دي معندها فتح فوري (early access) شغال دلوقتي؟
SessionSchema.virtual("hasActiveEarlyAccess").get(function () {
  return !!(this.earlyAccess?.enabled && !this.earlyAccess?.consumedAt);
});

// ==================== METHODS ====================

// Check if session is in the past
SessionSchema.methods.isPast = function () {
  const now = new Date();
  const sessionDateTime = this.fullDateTime;
  return sessionDateTime ? sessionDateTime < now : false;
};

// Check if session is upcoming (within next 48 hours)
SessionSchema.methods.isUpcoming = function () {
  const now = new Date();
  const sessionDateTime = this.fullDateTime;

  if (!sessionDateTime) return false;

  const diffHours = (sessionDateTime - now) / (1000 * 60 * 60);
  return diffHours > 0 && diffHours <= 48;
};

// Check if session is today
SessionSchema.methods.isToday = function () {
  const today = new Date();
  const sessionDate = new Date(this.scheduledDate);

  return today.toDateString() === sessionDate.toDateString();
};

// ✅ Check if this session currently qualifies for "today-like" instructor access.
// True if it's scheduled for today OR it has an active (not yet consumed) early-access grant.
SessionSchema.methods.isEffectivelyToday = function () {
  return this.isToday() || this.hasActiveEarlyAccess;
};

// Get session summary
SessionSchema.methods.getSummary = function () {
  return {
    id: this._id,
    title: this.title,
    sessionNumber: this.sessionNumber,
    lessonIndexes: this.lessonIndexes,
    lessonsText: this.lessonsText,
    scheduledDate: this.scheduledDate,
    formattedDate: this.formattedDate,
    dayName: this.dayName,
    startTime: this.startTime,
    endTime: this.endTime,
    status: this.status,
    attendanceTaken: this.attendanceTaken,
    totalMarked: this.totalMarked,
    presentCount: this.presentCount,
    absentCount: this.absentCount,
    lateCount: this.lateCount,
    excusedCount: this.excusedCount,
    isPast: this.isPast(),
    isUpcoming: this.isUpcoming(),
    isToday: this.isToday(),
    moduleIndex: this.moduleIndex,
    modulePosition: this.modulePosition,
    meetingLink: this.meetingLink,
    meetingPlatform: this.meetingPlatform,
    meetingPlatformIcon: this.meetingPlatformIcon,
    hasMeetingLink: this.hasMeetingLink,
    recordingLink: this.recordingLink,
  };
};

// Get session display details (for UI)
SessionSchema.methods.getDisplayDetails = function () {
  const dayName = this.dayName;
  const lessonsText = this.lessonIndexes
    .map((idx) => `Lesson ${idx + 1}`)
    .join(" & ");

  return {
    id: this._id,
    title: this.title,
    sessionNumber: this.sessionNumber,
    sessionDisplay: `Session ${this.sessionNumber}`,
    lessons: lessonsText,
    lessonsCount: 2,
    date: this.formattedDate,
    day: dayName,
    time: `${this.startTime} - ${this.endTime}`,
    status: this.status,
    statusColor: this.getStatusColor(),
    module: `Module ${this.moduleIndex + 1}`,
    moduleIndex: this.moduleIndex,
    isPast: this.isPast(),
    isUpcoming: this.isUpcoming(),
    isToday: this.isToday(),
    attendanceTaken: this.attendanceTaken,
    meetingLink: this.meetingLink,
    meetingPlatform: this.meetingPlatform,
    meetingPlatformIcon: this.meetingPlatformIcon,
    hasMeetingLink: this.hasMeetingLink,
    credentialsDisplay: this.credentialsDisplay,
    recordingLink: this.recordingLink,
    instructorNotes: this.instructorNotes,
    materials: this.materials || [],
  };
};

// Get status color for UI
SessionSchema.methods.getStatusColor = function () {
  const colors = {
    scheduled:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    completed:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    postponed:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  };
  return (
    colors[this.status] ||
    "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
  );
};

// Check if attendance can be taken
SessionSchema.methods.canTakeAttendance = function () {
  if (this.status !== "scheduled" && this.status !== "completed") {
    return false;
  }

  // ✅ Early access (immediate-open after admin approval) bypasses the normal time window
  if (this.hasActiveEarlyAccess) {
    return true;
  }

  const now = new Date();
  const sessionDateTime = this.fullDateTime;

  if (!sessionDateTime) return false;

  // Can take attendance 30 minutes before and up to 2 hours after session
  const thirtyMinutesBefore = new Date(sessionDateTime.getTime() - 30 * 60000);
  const twoHoursAfter = new Date(sessionDateTime.getTime() + 2 * 60 * 60000);

  return now >= thirtyMinutesBefore && now <= twoHoursAfter;
};

// Check if session can be edited
SessionSchema.methods.canBeEdited = function () {
  // Cannot edit completed or cancelled sessions
  if (this.status === "completed" || this.status === "cancelled") {
    return false;
  }

  // Can edit scheduled or postponed sessions 24 hours before
  if (this.status === "scheduled" || this.status === "postponed") {
    const now = new Date();
    const sessionDateTime = this.fullDateTime;

    if (!sessionDateTime) return true;

    const hoursBefore = (sessionDateTime - now) / (1000 * 60 * 60);
    return hoursBefore > 24;
  }

  return true;
};

// ✅ Check if meeting link can be changed
SessionSchema.methods.canChangeMeetingLink = function () {
  if (this.status === "completed" || this.status === "cancelled") {
    return false;
  }

  const now = new Date();
  const sessionDateTime = this.fullDateTime;

  if (!sessionDateTime) return true;

  // Can change meeting link up to 1 hour before session
  const oneHourBefore = new Date(sessionDateTime.getTime() - 60 * 60000);
  return now < oneHourBefore;
};

// ✅ Release meeting link (wrapper method)
SessionSchema.methods.releaseMeetingLink = async function () {
  try {
    const { releaseMeetingLink } = await import("../../utils/sessionGenerator");
    return await releaseMeetingLink(this._id);
  } catch (error) {
    console.error("❌ Error releasing meeting link:", error);
    throw error;
  }
};

// ✅ Assign new meeting link
SessionSchema.methods.assignMeetingLink = async function (meetingLinkId, userId) {
  try {
    const { manuallyAssignMeetingLink } = await import("../../utils/sessionGenerator");
    return await manuallyAssignMeetingLink(this._id, meetingLinkId, userId);
  } catch (error) {
    console.error("❌ Error assigning meeting link:", error);
    throw error;
  }
};

// Get next session in sequence (if exists)
SessionSchema.methods.getNextSession = async function () {
  const nextSession = await mongoose
    .model("Session")
    .findOne({
      groupId: this.groupId,
      scheduledDate: { $gt: this.scheduledDate },
      isDeleted: false,
    })
    .sort({ scheduledDate: 1 });

  return nextSession;
};

// Get previous session in sequence (if exists)
SessionSchema.methods.getPreviousSession = async function () {
  const prevSession = await mongoose
    .model("Session")
    .findOne({
      groupId: this.groupId,
      scheduledDate: { $lt: this.scheduledDate },
      isDeleted: false,
    })
    .sort({ scheduledDate: -1 });

  return prevSession;
};

// Get session sequence in module
SessionSchema.methods.getModuleSessions = async function () {
  const moduleSessions = await mongoose
    .model("Session")
    .find({
      groupId: this.groupId,
      moduleIndex: this.moduleIndex,
      isDeleted: false,
    })
    .sort({ sessionNumber: 1 });

  return moduleSessions;
};

// ✅ يجيب السيشن دي + كل اللي بعدها بالتسلسل الكامل (moduleIndex ثم sessionNumber)
// ده الأساس اللي عليه بيتبني طلب ترحيل السلسلة (cascade reschedule request)
SessionSchema.methods.getChainFromHere = async function () {
  const allSessions = await mongoose
    .model("Session")
    .find({ groupId: this.groupId, isDeleted: false })
    .sort({ moduleIndex: 1, sessionNumber: 1 });

  const myIndex = allSessions.findIndex(
    (s) => s._id.toString() === this._id.toString()
  );

  if (myIndex === -1) return [this];

  return allSessions.slice(myIndex);
};

// ✅ يبني preview لترحيل السلسلة (السيشن دي + كل اللي بعدها) بمقدار shiftDays
// من غير ما يحفظ أي حاجة — للعرض على المدرس/الأدمن قبل التقديم/الموافقة
//
// 🔐 مهم جدًا: السيشن اللي المدرس دوس عليها (trigger / "this" session) هي اللي
// هتُفتح فورًا (earlyAccess) بعد الموافقة — يعني تاريخها المجدول مالوش قيمة
// عملية، ومينفعش يترحل، علشان معندناش سبب نغيره. لو رحّلناه برضو هيبان للمدرس
// إنه "ترحّل" حتى لو فاتح فورًا، وده مش المطلوب. فبالتالي:
//   - السيشن trigger (أول عنصر في السلسلة): newScheduledDate = oldScheduledDate (زي ما هي)
//   - كل اللي بعدها: newScheduledDate = oldScheduledDate + shiftDays (بترحل فعليًا)
SessionSchema.methods.buildCascadePreview = async function (shiftDays = 7) {
  const chain = await this.getChainFromHere();

  const affectedSessions = chain.map((session, index) => {
    const isTrigger = index === 0; // أول عنصر في الـ chain هو دايمًا السيشن اللي بدأنا منها
    const oldScheduledDate = new Date(session.scheduledDate);
    const newScheduledDate = new Date(oldScheduledDate);
    if (!isTrigger) {
      newScheduledDate.setDate(newScheduledDate.getDate() + shiftDays);
    }

    return {
      sessionId: session._id,
      title: session.title,
      moduleIndex: session.moduleIndex,
      sessionNumber: session.sessionNumber,
      status: session.status,
      isTrigger,
      oldScheduledDate,
      newScheduledDate,
    };
  });

  return {
    shiftDays,
    totalAffected: affectedSessions.length,
    completedCount: affectedSessions.filter((s) => s.status === "completed").length,
    affectedSessions,
  };
};

// ✅ يكتب pendingReschedule على كل سيشن في السلسلة (دي + كل اللي بعدها)
// بنفس batchId عشان الأدمن يقدر يوافق/يرفض المجموعة كلها مرة واحدة.
//
// 🔐 قاعدة مهمة: مينفعش يتقدم طلب جديد لو فيه طلب "pending" بالفعل على نفس
// الجروب (مش بس على نفس السيشن) — ده بيمنع تكدس أكتر من باتش في نفس الوقت.
SessionSchema.methods.submitCascadeRescheduleRequest = async function (
  { viewMode = "single", shiftDays = 7 },
  userId
) {
  const Session = mongoose.model("Session");

  const existingPending = await Session.findOne({
    groupId: this.groupId,
    isDeleted: false,
    "pendingReschedule.status": "pending",
  }).select("_id pendingReschedule.batchId");

  if (existingPending) {
    const error = new Error("يوجد طلب ترحيل قيد المراجعة لهذا الجروب بالفعل");
    error.code = "PENDING_REQUEST_EXISTS";
    error.existingBatchId = existingPending.pendingReschedule?.batchId;
    throw error;
  }

  const preview = await this.buildCascadePreview(shiftDays);
  const batchId = new mongoose.Types.ObjectId();
  const requestedAt = new Date();

  await Promise.all(
    preview.affectedSessions.map((item) =>
      Session.updateOne(
        { _id: item.sessionId, isDeleted: false },
        {
          $set: {
            pendingReschedule: {
              batchId,
              status: "pending",
              triggerSessionId: this._id,
              viewMode,
              shiftDays,
              oldScheduledDate: item.oldScheduledDate,
              newScheduledDate: item.newScheduledDate,
              requestedBy: userId,
              requestedAt,
            },
            "metadata.lastModifiedBy": userId,
            "metadata.updatedAt": requestedAt,
          },
        }
      )
    )
  );

  return { batchId, affectedCount: preview.affectedSessions.length, preview };
};

// ==================== STATIC METHODS ====================

// Get all sessions for a group grouped by day
SessionSchema.statics.getSessionsByDay = async function (groupId) {
  const sessions = await this.find({
    groupId,
    isDeleted: false,
  })
    .sort({ scheduledDate: 1, startTime: 1 })
    .lean();

  const grouped = {};

  sessions.forEach((session) => {
    const dateKey = new Date(session.scheduledDate).toISOString().split("T")[0];
    const dayName = new Date(session.scheduledDate).toLocaleDateString(
      "en-US",
      { weekday: "long" }
    );

    if (!grouped[dateKey]) {
      grouped[dateKey] = {
        date: dateKey,
        dayName: dayName,
        sessions: [],
      };
    }

    grouped[dateKey].sessions.push({
      id: session._id,
      title: session.title,
      sessionNumber: session.sessionNumber,
      moduleIndex: session.moduleIndex,
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      attendanceTaken: session.attendanceTaken,
      meetingLink: session.meetingLink,
      meetingPlatform: session.meetingPlatform,
      hasMeetingLink: !!session.meetingLink,
      lessonIndexes: session.lessonIndexes,
      lessonsText: session.lessonIndexes
        .map((idx) => `Lesson ${idx + 1}`)
        .join(" & "),
    });
  });

  // Convert to array sorted by date
  return Object.values(grouped).sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
};

// Get sessions for a specific day of week
SessionSchema.statics.getSessionsByDayOfWeek = async function (
  groupId,
  dayOfWeek
) {
  const sessions = await this.find({
    groupId,
    isDeleted: false,
  }).lean();

  return sessions.filter((session) => {
    const sessionDay = new Date(session.scheduledDate).getDay();
    const dayMap = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };
    return sessionDay === dayMap[dayOfWeek];
  });
};

// Get session distribution statistics
SessionSchema.statics.getSessionStats = async function (groupId) {
  const stats = await this.aggregate([
    {
      $match: {
        groupId: new mongoose.Types.ObjectId(groupId),
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const statsMap = {
    scheduled: 0,
    completed: 0,
    cancelled: 0,
    postponed: 0,
    total: 0,
    withMeetingLinks: 0,
  };

  // Get count of sessions with meeting links
  const sessionsWithLinks = await this.countDocuments({
    groupId: new mongoose.Types.ObjectId(groupId),
    isDeleted: false,
    meetingLink: { $ne: null },
  });

  stats.forEach((stat) => {
    statsMap[stat._id] = stat.count;
    statsMap.total += stat.count;
  });

  statsMap.withMeetingLinks = sessionsWithLinks;

  return statsMap;
};

// Get next upcoming session for a group
SessionSchema.statics.getNextUpcomingSession = async function (groupId) {
  const now = new Date();

  return await this.findOne({
    groupId,
    scheduledDate: { $gte: now },
    status: "scheduled",
    isDeleted: false,
  }).sort({ scheduledDate: 1, startTime: 1 });
};

// Get sessions by module
SessionSchema.statics.getSessionsByModule = async function (groupId) {
  const sessions = await this.find({
    groupId,
    isDeleted: false,
  })
    .sort({ moduleIndex: 1, sessionNumber: 1 })
    .lean();

  const groupedByModule = {};

  sessions.forEach((session) => {
    const moduleKey = `module_${session.moduleIndex}`;

    if (!groupedByModule[moduleKey]) {
      groupedByModule[moduleKey] = {
        moduleIndex: session.moduleIndex,
        moduleNumber: session.moduleIndex + 1,
        sessions: [],
      };
    }

    groupedByModule[moduleKey].sessions.push({
      id: session._id,
      sessionNumber: session.sessionNumber,
      title: session.title,
      scheduledDate: session.scheduledDate,
      formattedDate: new Date(session.scheduledDate)
        .toISOString()
        .split("T")[0],
      dayName: new Date(session.scheduledDate).toLocaleDateString("en-US", {
        weekday: "long",
      }),
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      attendanceTaken: session.attendanceTaken,
      meetingLink: session.meetingLink,
      meetingPlatform: session.meetingPlatform,
      hasMeetingLink: !!session.meetingLink,
      lessonIndexes: session.lessonIndexes,
      lessonsText: session.lessonIndexes
        .map((idx) => `Lesson ${idx + 1}`)
        .join(" & "),
    });
  });

  // Convert to array and sort by module index
  return Object.values(groupedByModule).sort(
    (a, b) => a.moduleIndex - b.moduleIndex
  );
};

// Get today's sessions for a group
SessionSchema.statics.getTodaySessions = async function (groupId) {
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const todayEnd = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1
  );

  return await this.find({
    groupId,
    scheduledDate: { $gte: todayStart, $lt: todayEnd },
    isDeleted: false,
  }).sort({ startTime: 1 });
};

// Get sessions within date range
SessionSchema.statics.getSessionsByDateRange = async function (
  groupId,
  startDate,
  endDate
) {
  return await this.find({
    groupId,
    scheduledDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
    isDeleted: false,
  }).sort({ scheduledDate: 1, startTime: 1 });
};

// ✅ Get sessions needing meeting links
SessionSchema.statics.getSessionsNeedingMeetingLinks = async function (
  groupId = null,
  limit = 50
) {
  const query = {
    status: "scheduled",
    meetingLink: { $in: [null, ""] },
    scheduledDate: { $gte: new Date() },
    isDeleted: false,
  };

  if (groupId) {
    query.groupId = new mongoose.Types.ObjectId(groupId);
  }

  return await this.find(query)
    .sort({ scheduledDate: 1 })
    .limit(limit)
    .lean();
};

// ✅ Get available meeting links for a session
SessionSchema.statics.getAvailableMeetingLinksForSession = async function (
  sessionId
) {
  const session = await this.findById(sessionId);

  if (!session) {
    throw new Error("Session not found");
  }

  const { getAvailableMeetingLinks } = await import("../../utils/sessionGenerator");

  // Create date objects for the session time
  const startTime = new Date(session.scheduledDate);
  const [hours, minutes] = session.startTime.split(":").map(Number);
  startTime.setHours(hours, minutes, 0, 0);

  const endTime = new Date(startTime);
  const [endHours, endMinutes] = session.endTime.split(":").map(Number);
  endTime.setHours(endHours, endMinutes, 0, 0);

  return await getAvailableMeetingLinks(startTime, endTime);
};

// ✅ Get all pending cascade reschedule requests, grouped by batchId — للأدمن
SessionSchema.statics.getPendingRescheduleBatches = async function () {
  const sessions = await this.find({
    isDeleted: false,
    "pendingReschedule.status": "pending",
  })
    .populate({ path: "groupId", select: "name code" })
    .populate({ path: "pendingReschedule.requestedBy", select: "name email" })
    .sort({ "pendingReschedule.requestedAt": -1, moduleIndex: 1, sessionNumber: 1 })
    .lean();

  const batches = {};

  sessions.forEach((session) => {
    const batchId = session.pendingReschedule.batchId.toString();

    if (!batches[batchId]) {
      batches[batchId] = {
        batchId,
        groupId: session.groupId?._id || session.groupId,
        groupName: session.groupId?.name || "",
        groupCode: session.groupId?.code || "",
        triggerSessionId: session.pendingReschedule.triggerSessionId,
        viewMode: session.pendingReschedule.viewMode,
        shiftDays: session.pendingReschedule.shiftDays,
        requestedBy: session.pendingReschedule.requestedBy,
        requestedAt: session.pendingReschedule.requestedAt,
        sessions: [],
      };
    }

    batches[batchId].sessions.push({
      sessionId: session._id,
      title: session.title,
      moduleIndex: session.moduleIndex,
      sessionNumber: session.sessionNumber,
      status: session.status,
      isTrigger:
        session.pendingReschedule.triggerSessionId?.toString() === session._id.toString(),
      oldScheduledDate: session.pendingReschedule.oldScheduledDate,
      newScheduledDate: session.pendingReschedule.newScheduledDate,
    });
  });

  return Object.values(batches);
};

// ✅ موافقة الأدمن على batch كامل:
//   1. بيحدّث scheduledDate لكل سيشن في الـ batch (دي + كل اللي بعدها)
//   2. بيمنح السيشن "trigger" (اللي المدرس دوس عليها وقدم الطلب منها) earlyAccess
//      فوري — تتفتح فورًا (meeting link + حضور) من غير ما ترتبط بتاريخها الجديد.
//   3. مينفعش يلمس status (غير الإرجاع لـ scheduled في حالة withNext مش لازم)،
//      ولا attendance، ولا meetingLink بتاع باقي السيشنات — كل ده بيفضل زي ما هو.
SessionSchema.statics.approveRescheduleBatch = async function (batchId, adminUserId) {
  const sessions = await this.find({
    isDeleted: false,
    "pendingReschedule.batchId": batchId,
    "pendingReschedule.status": "pending",
  });

  if (sessions.length === 0) {
    const error = new Error("لا يوجد طلب ترحيل مطابق لهذا الرقم أو تمت معالجته بالفعل");
    error.code = "BATCH_NOT_FOUND";
    throw error;
  }

  const now = new Date();
  const results = [];
  // كل سيشنات الباتش بيشتركوا في نفس triggerSessionId
  const triggerSessionId = sessions[0].pendingReschedule.triggerSessionId?.toString();

  for (const session of sessions) {
    const isTrigger = session._id.toString() === triggerSessionId;

    // 🔐 السيشن trigger مينفعش يترحل خالص — هي اللي هتتفتح فورًا (earlyAccess)
    // بغض النظر عن تاريخها، فمفيش أي سبب نلمس scheduledDate بتاعها. باقي
    // السيشنات في الباتش (اللي بعد الـ trigger) هي اللي بترحّل فعليًا.
    if (!isTrigger) {
      session.scheduledDate = session.pendingReschedule.newScheduledDate;
    }

    session.pendingReschedule.status = "approved";
    session.pendingReschedule.reviewedBy = adminUserId;
    session.pendingReschedule.reviewedAt = now;
    session.metadata.lastModifiedBy = adminUserId;
    session.metadata.updatedAt = now;

    // ✅ السيشن اللي المدرس بدأ منها الطلب تتفتح فورًا، بغض النظر عن تاريخها
    if (isTrigger) {
      session.earlyAccess = {
        enabled: true,
        grantedAt: now,
        grantedBy: adminUserId,
        batchId: session.pendingReschedule.batchId,
        consumedAt: null,
      };
    }

    await session.save();
    results.push({
      sessionId: session._id,
      newScheduledDate: session.scheduledDate,
      isTrigger,
      earlyAccessGranted: isTrigger,
    });
  }

  return { batchId, updatedCount: results.length, sessions: results, triggerSessionId };
};

// ✅ رفض الأدمن لـ batch كامل: بيقفل pendingReschedule من غير ما يغير scheduledDate
// ولا يمنح أي earlyAccess — كل حاجة تفضل زي ما هي تمامًا.
SessionSchema.statics.rejectRescheduleBatch = async function (batchId, adminUserId, reviewNotes = "") {
  const sessions = await this.find({
    isDeleted: false,
    "pendingReschedule.batchId": batchId,
    "pendingReschedule.status": "pending",
  });

  if (sessions.length === 0) {
    const error = new Error("لا يوجد طلب ترحيل مطابق لهذا الرقم أو تمت معالجته بالفعل");
    error.code = "BATCH_NOT_FOUND";
    throw error;
  }

  const now = new Date();

  const result = await this.updateMany(
    {
      isDeleted: false,
      "pendingReschedule.batchId": batchId,
      "pendingReschedule.status": "pending",
    },
    {
      $set: {
        "pendingReschedule.status": "rejected",
        "pendingReschedule.reviewedBy": adminUserId,
        "pendingReschedule.reviewedAt": now,
        "pendingReschedule.reviewNotes": reviewNotes,
        "metadata.lastModifiedBy": adminUserId,
        "metadata.updatedAt": now,
      },
    }
  );

  return { batchId, updatedCount: result.modifiedCount };
};

// ✅ يقفل earlyAccess على سيشن بعد ما الحضور يتسجل، أو يدويًا من الأدمن
SessionSchema.statics.consumeEarlyAccess = async function (sessionId, userId) {
  const now = new Date();
  return await this.updateOne(
    { _id: sessionId, isDeleted: false, "earlyAccess.enabled": true },
    {
      $set: {
        "earlyAccess.consumedAt": now,
        "metadata.lastModifiedBy": userId,
        "metadata.updatedAt": now,
      },
    }
  );
};

// Delete all sessions for a group (soft delete)
SessionSchema.statics.deleteGroupSessions = async function (groupId, userId) {
  // First release all meeting links
  const sessions = await this.find({
    groupId: groupId,
    isDeleted: false,
    meetingLinkId: { $ne: null },
  });

  for (const session of sessions) {
    try {
      await session.releaseMeetingLink();
    } catch (error) {
      console.error(`⚠️ Failed to release meeting link for session ${session._id}:`, error.message);
    }
  }

  // Then mark as deleted
  const result = await this.updateMany(
    {
      groupId: groupId,
      isDeleted: false,
    },
    {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        status: "cancelled",
        "metadata.lastModifiedBy": userId,
        "metadata.updatedAt": new Date(),
      },
    }
  );

  return result;
};

// Find duplicate sessions
SessionSchema.statics.findDuplicates = async function (groupId) {
  const duplicates = await this.aggregate([
    {
      $match: {
        groupId: new mongoose.Types.ObjectId(groupId),
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: {
          groupId: "$groupId",
          moduleIndex: "$moduleIndex",
          sessionNumber: "$sessionNumber",
        },
        count: { $sum: 1 },
        sessions: { $push: "$$ROOT" },
      },
    },
    {
      $match: {
        count: { $gt: 1 },
      },
    },
  ]);

  return duplicates;
};

// ==================== JSON TRANSFORM ====================

// Ensure virtuals are included in JSON
SessionSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    // Remove sensitive/technical fields
    delete ret.__v;
    delete ret.isDeleted;
    delete ret.deletedAt;

    // Remove password from meeting credentials
    if (ret.meetingCredentials && ret.meetingCredentials.password) {
      ret.meetingCredentials.password = "••••••••";
    }

    return ret;
  },
});

SessionSchema.set("toObject", {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    delete ret.isDeleted;
    delete ret.deletedAt;

    if (ret.meetingCredentials && ret.meetingCredentials.password) {
      ret.meetingCredentials.password = "••••••••";
    }

    return ret;
  },
});

// Create the model
const Session =
  mongoose.models.Session || mongoose.model("Session", SessionSchema);

export default Session;