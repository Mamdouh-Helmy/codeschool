// models/Session.js
// ═══════════════════════════════════════════════════════════════════════════
// Session Model — Meeting Link Support + Cascade Reschedule + Swap-Today
//                + Offline Flow + Auto deliveryMode Snapshot
// ═══════════════════════════════════════════════════════════════════════════

import mongoose from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// Sub-schemas
// ─────────────────────────────────────────────────────────────────────────────

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
  { _id: false },
);

// ✅ طلب ترحيل السلسلة (cascade reschedule)
// ────────────────────────────────────────────────────────────────
// - بيتخزن جوه السيشن نفسها (مش كولكشن منفصلة)
// - بيفضل "pending" لحد ما الأدمن يوافق أو يرفض
// - كل السيشنات المشتركة في نفس الطلب بيتشاركوا في batchId واحد
//
// viewMode:
//   - single:    فتح السيشن دي بس
//   - withNext:  فتح السيشن دي + معاينة لللي بعدها
//   - swapToday: استبدال مباشر بين سيشنين (المرجع swapSessionId)
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
    triggerSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    viewMode: {
      type: String,
      enum: ["single", "withNext", "swapToday"],
      default: "single",
    },
    swapSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      default: null,
    },
    shiftDays: { type: Number, default: 7 },
    oldScheduledDate: { type: Date, required: true },
    newScheduledDate: { type: Date, required: true },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestedAt: { type: Date, default: Date.now },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNotes: { type: String, default: "" },
  },
  { _id: false },
);

// ─────────────────────────────────────────────────────────────────────────────
// Main schema
// ─────────────────────────────────────────────────────────────────────────────

const SessionSchema = new mongoose.Schema(
  {
    // ── Relations ──────────────────────────────────────────────────────────
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

    // ── Curriculum Position ────────────────────────────────────────────────
    moduleIndex: {
      type: Number,
      required: true,
      min: 0,
    },
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

    // ── Session Details ────────────────────────────────────────────────────
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },

    // ── Meeting Link (Online only) ─────────────────────────────────────────
    meetingLink: {
      type: String,
      trim: true,
    },
    meetingCredentials: {
      username: { type: String, trim: true },
      password: { type: String },
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

    // ── Schedule ───────────────────────────────────────────────────────────
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

    // ── Status ─────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "postponed"],
      default: "scheduled",
    },

    // ── Recording (Online only) ────────────────────────────────────────────
    recordingLink: {
      type: String,
      trim: true,
    },

    // ── Make-up Session ────────────────────────────────────────────────────
    // isComplimentary = true معناه:
    //   ❌ مفيش خصم من رصيد الطالب
    //   ✅ المدرس بيتحاسب عادي في الـ payroll
    isComplimentary: {
      type: Boolean,
      default: false,
      index: true,
    },
    makeupInfo: {
      originalSessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Session",
        default: null,
      },
      originalGroupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
        default: null,
      },
      originalSessionTitle: { type: String, default: "" },
      originalSessionDate: { type: Date, default: null },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      createdAt: { type: Date, default: null },
    },

    // ── Delivery Mode ──────────────────────────────────────────────────────
    // Snapshot من نوع الجروب وقت الإنشاء (auto-populated via pre-insertMany
    // و pre-save hooks — لو null بيتقرا من الجروب وقت الحساب)
    deliveryMode: {
      type: String,
      enum: ["online", "offline", null],
      default: null,
    },

    // ── Actual Times (Payroll) ─────────────────────────────────────────────
    actualStartTime: { type: String, default: null }, // "19:00"
    actualEndTime: { type: String, default: null }, // "20:30"

    payroll: {
      processed: { type: Boolean, default: false },
      processedAt: { type: Date },
      durationMinutes: { type: Number, default: 0 },
      entriesCount: { type: Number, default: 0 },
      lastError: { type: String, default: "" },
    },

    // ── Attendance ─────────────────────────────────────────────────────────
    attendanceTaken: {
      type: Boolean,
      default: false,
    },
    attendance: [attendanceRecordSchema],

    // ── Cascade Reschedule ─────────────────────────────────────────────────
    pendingReschedule: {
      type: pendingRescheduleSchema,
      default: null,
    },

    // ── Early Access ───────────────────────────────────────────────────────
    // لما طلب ترحيل يتوافق عليه وهو trigger session، السيشن دي تتفتح فورًا
    // (meeting link + حضور) بغض النظر عن تاريخها، لحد ما الحضور يتسجل.
    earlyAccess: {
      enabled: { type: Boolean, default: false },
      grantedAt: { type: Date },
      grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      batchId: { type: mongoose.Schema.Types.ObjectId },
      consumedAt: { type: Date },
    },

    // ── Automation Tracking ────────────────────────────────────────────────
    automationEvents: {
      // ─ Online Flow ─
      reminderSent: { type: Boolean, default: false },
      reminderSentAt: Date,

      absentNotificationsSent: { type: Boolean, default: false },
      absentNotificationsSentAt: Date,

      postponeNotificationSent: { type: Boolean, default: false },
      cancelNotificationSent: { type: Boolean, default: false },

      meetingLinkAssigned: { type: Boolean, default: false },
      meetingLinkAssignedAt: Date,

      reminder24hSent: { type: Boolean, default: false },
      reminder24hSentAt: Date,
      reminder24hStudentsNotified: { type: Number, default: 0 },

      reminder1hSent: { type: Boolean, default: false },
      reminder1hSentAt: Date,
      reminder1hStudentsNotified: { type: Number, default: 0 },

      reminder15minSent: { type: Boolean, default: false },
      reminder15minSentAt: Date,
      reminder15minStudentsNotified: { type: Number, default: 0 },

      reminderStats: {
        total24hSent: { type: Number, default: 0 },
        total24hFailed: { type: Number, default: 0 },
        total1hSent: { type: Number, default: 0 },
        total1hFailed: { type: Number, default: 0 },
      },

      // ─ Offline Flow ─
      reminder24hOfflineSent: { type: Boolean, default: false },
      reminder24hOfflineSentAt: Date,
      reminder24hOfflineStudentsNotified: { type: Number, default: 0 },
      reminder24hOfflineInstructorsNotified: { type: Number, default: 0 },

      reminder30minOfflineSent: { type: Boolean, default: false },
      reminder30minOfflineSentAt: Date,
      reminder30minOfflineStudentsNotified: { type: Number, default: 0 },
      reminder30minOfflineInstructorsNotified: { type: Number, default: 0 },

      preAttendancePingSent: { type: Boolean, default: false },
      preAttendancePingSentAt: Date,
      preAttendancePingStudentsNotified: { type: Number, default: 0 },
      preAttendancePingInstructorsNotified: { type: Number, default: 0 },

      reminderStatsOffline: {
        total24hSent: { type: Number, default: 0 },
        total24hFailed: { type: Number, default: 0 },
        total30minSent: { type: Number, default: 0 },
        total30minFailed: { type: Number, default: 0 },
        totalPingSent: { type: Number, default: 0 },
        totalPingFailed: { type: Number, default: 0 },
      },
    },

    // ── Notes & Materials ──────────────────────────────────────────────────
    instructorNotes: {
      type: String,
      trim: true,
    },
    materials: [
      {
        name: String,
        url: String,
        type: {
          type: String,
          enum: ["pdf", "video", "link", "document", "presentation", "other"],
        },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],

    // ── Metadata ───────────────────────────────────────────────────────────
    metadata: {
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },

    // ── Soft Delete ────────────────────────────────────────────────────────
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
    strict: true,
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════════════════

SessionSchema.index({ groupId: 1, scheduledDate: 1 });
SessionSchema.index({ groupId: 1, status: 1 });
SessionSchema.index({ courseId: 1 });
SessionSchema.index({ scheduledDate: 1, status: 1 });
SessionSchema.index({ moduleIndex: 1, sessionNumber: 1 });

SessionSchema.index({ meetingLinkId: 1 });
SessionSchema.index({ meetingPlatform: 1 });
SessionSchema.index({ "automationEvents.meetingLinkAssigned": 1 });

SessionSchema.index({ "pendingReschedule.status": 1 });
SessionSchema.index({ "pendingReschedule.batchId": 1 });

SessionSchema.index({ "earlyAccess.enabled": 1 });

SessionSchema.index({ "payroll.processed": 1, status: 1 });

SessionSchema.index({ "automationEvents.reminder24hOfflineSent": 1 });
SessionSchema.index({ "automationEvents.reminder30minOfflineSent": 1 });
SessionSchema.index({ "automationEvents.preAttendancePingSent": 1 });

SessionSchema.index(
  { groupId: 1, moduleIndex: 1, sessionNumber: 1 },
  {
    unique: true,
    name: "unique_session_per_group_module",
    background: true,
    partialFilterExpression: { isDeleted: false },
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════
//
// ⚠️ قاعدة مهمة عن Mongoose async middleware (Kareem):
//    - async function (...) → مش بتاخد `next` خالص. أول argument هو القيمة
//      الفعلية (docs في insertMany، مش next).
//    - sync function (next, ...) → بتاخد next ولازم تنادي عليه.
//
//    لو غلطت في الـ signature هتشوف "next is not a function" وقت التشغيل.
// ═══════════════════════════════════════════════════════════════════════════

// ── Update timestamp ────────────────────────────────────────────────────────
SessionSchema.pre("save", async function () {
  this.metadata.updatedAt = new Date();
});

// ── Prevent deletion queries from returning deleted sessions ────────────────
SessionSchema.pre("find", function () {
  this.where({ isDeleted: false });
});

SessionSchema.pre("findOne", function () {
  this.where({ isDeleted: false });
});

// ── Auto-release meeting link on delete or cancel ───────────────────────────
SessionSchema.pre("save", async function () {
  if (this.isModified("isDeleted") && this.isDeleted && this.meetingLinkId) {
    try {
      const { releaseMeetingLink } =
        await import("../../utils/sessionGenerator");
      await releaseMeetingLink(this._id);
    } catch (error) {
      console.error("❌ Error releasing meeting link on delete:", error);
    }
  }

  if (
    this.isModified("status") &&
    this.status === "cancelled" &&
    this.meetingLinkId
  ) {
    try {
      const { releaseMeetingLink } =
        await import("../../utils/sessionGenerator");
      await releaseMeetingLink(this._id);
    } catch (error) {
      console.error("❌ Error releasing meeting link on cancellation:", error);
    }
  }
});

// ── Prevent duplicate sessions on save ──────────────────────────────────────
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
        `Session already exists for group ${this.groupId}, module ${this.moduleIndex}, session ${this.sessionNumber}`,
      );
      error.code = "DUPLICATE_SESSION";
      throw error;
    }
  }
});

// ── Auto-populate deliveryMode from Group (insertMany) ──────────────────────
// السبب: Session.insertMany() مش بيمر على pre("save")، فلو الـ session
// generator مبعتش deliveryMode صريحًا، بيتحفظ بـ null — وبعدين الـ cron
// والـ ReminderModal يصنّفوا السيشن غلط (online بدل offline أو العكس).
//
// الحل ده مركزي — بيشتغل على أي insertMany في أي مكان بالمشروع.
SessionSchema.pre("insertMany", async function (docs) {
  if (!Array.isArray(docs) || docs.length === 0) return;

  // نجمع الـ groupIds اللي محتاجة lookup (سيشنات بدون deliveryMode)
  const groupIdsToResolve = [
    ...new Set(
      docs
        .filter((d) => !d.deliveryMode && d.groupId)
        .map((d) => d.groupId.toString()),
    ),
  ];

  if (groupIdsToResolve.length === 0) return;

  try {
    const Group = mongoose.models.Group || mongoose.model("Group");

    const groups = await Group.find({ _id: { $in: groupIdsToResolve } })
      .select("_id deliveryMode")
      .lean();

    const modeMap = {};
    groups.forEach((g) => {
      modeMap[g._id.toString()] = g.deliveryMode || "online";
    });

    docs.forEach((doc) => {
      if (!doc.deliveryMode && doc.groupId) {
        doc.deliveryMode = modeMap[doc.groupId.toString()] || "online";
      }
    });
  } catch (err) {
    console.error(
      "⚠️ [Session.insertMany] Could not resolve deliveryMode from groups:",
      err.message,
    );
    // Fallback آمن: أي doc مفيهوش deliveryMode يبقى "online"
    docs.forEach((doc) => {
      if (!doc.deliveryMode) doc.deliveryMode = "online";
    });
  }
});

// ── Auto-populate deliveryMode from Group (single save) ─────────────────────
// نفس منطق insertMany بس للسيشن الواحدة (Session.create / new Session().save)
SessionSchema.pre("save", async function () {
  if (this.isNew && !this.deliveryMode && this.groupId) {
    try {
      const Group = mongoose.models.Group || mongoose.model("Group");
      const group = await Group.findById(this.groupId)
        .select("deliveryMode")
        .lean();
      this.deliveryMode = group?.deliveryMode || "online";
    } catch {
      this.deliveryMode = "online";
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// VIRTUAL PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════

SessionSchema.virtual("totalMarked").get(function () {
  return this.attendance ? this.attendance.length : 0;
});

SessionSchema.virtual("presentCount").get(function () {
  return this.attendance
    ? this.attendance.filter((a) => a.status === "present").length
    : 0;
});

SessionSchema.virtual("absentCount").get(function () {
  return this.attendance
    ? this.attendance.filter((a) => a.status === "absent").length
    : 0;
});

SessionSchema.virtual("lateCount").get(function () {
  return this.attendance
    ? this.attendance.filter((a) => a.status === "late").length
    : 0;
});

SessionSchema.virtual("excusedCount").get(function () {
  return this.attendance
    ? this.attendance.filter((a) => a.status === "excused").length
    : 0;
});

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

SessionSchema.virtual("formattedDate").get(function () {
  return this.scheduledDate
    ? this.scheduledDate.toISOString().split("T")[0]
    : "";
});

SessionSchema.virtual("lessonsText").get(function () {
  return this.lessonIndexes.map((idx) => `Lesson ${idx + 1}`).join(" & ");
});

SessionSchema.virtual("modulePosition").get(function () {
  return this.moduleIndex + 1;
});

SessionSchema.virtual("fullDateTime").get(function () {
  if (!this.scheduledDate || !this.startTime) return null;

  const date = new Date(this.scheduledDate);
  const [hours, minutes] = this.startTime.split(":").map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
});

SessionSchema.virtual("hasMeetingLink").get(function () {
  return !!this.meetingLink;
});

SessionSchema.virtual("meetingPlatformIcon").get(function () {
  const icons = {
    zoom: "🔷",
    google_meet: "🔴",
    microsoft_teams: "🔵",
    other: "🔗",
  };
  return icons[this.meetingPlatform] || "📅";
});

SessionSchema.virtual("credentialsDisplay").get(function () {
  if (!this.meetingCredentials) return null;

  return {
    username: this.meetingCredentials.username,
    password: this.meetingCredentials.password ? "••••••••" : null,
    hasPassword: !!this.meetingCredentials.password,
  };
});

SessionSchema.virtual("hasPendingReschedule").get(function () {
  return !!(
    this.pendingReschedule && this.pendingReschedule.status === "pending"
  );
});

SessionSchema.virtual("hasActiveEarlyAccess").get(function () {
  return !!(this.earlyAccess?.enabled && !this.earlyAccess?.consumedAt);
});

SessionSchema.virtual("isOffline").get(function () {
  const mode = this.deliveryMode || this.populated?.groupId?.deliveryMode;
  return mode === "offline";
});

SessionSchema.virtual("isOnline").get(function () {
  const mode = this.deliveryMode || this.populated?.groupId?.deliveryMode;
  return mode !== "offline";
});

// ═══════════════════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════════════════

SessionSchema.methods.isPast = function () {
  const now = new Date();
  const sessionDateTime = this.fullDateTime;
  return sessionDateTime ? sessionDateTime < now : false;
};

SessionSchema.methods.isUpcoming = function () {
  const now = new Date();
  const sessionDateTime = this.fullDateTime;

  if (!sessionDateTime) return false;

  const diffHours = (sessionDateTime - now) / (1000 * 60 * 60);
  return diffHours > 0 && diffHours <= 48;
};

SessionSchema.methods.isToday = function () {
  const today = new Date();
  const sessionDate = new Date(this.scheduledDate);

  return today.toDateString() === sessionDate.toDateString();
};

SessionSchema.methods.isEffectivelyToday = function () {
  return this.isToday() || this.hasActiveEarlyAccess;
};

SessionSchema.methods.getSummary = function () {
  const isOfflineMode =
    (this.deliveryMode || this.populated?.groupId?.deliveryMode) === "offline";

  const groupLoc = this.populated?.groupId?.locationDetails || {};
  const groupLocation = this.populated?.groupId?.location || "";

  const locationInfo = isOfflineMode
    ? {
        placeName: groupLoc.placeName || groupLocation || "",
        address: groupLoc.address || groupLoc.extraDetails || "",
        country: groupLoc.country || "",
        lat: groupLoc.lat ?? null,
        lng: groupLoc.lng ?? null,
      }
    : null;

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
    deliveryMode: this.deliveryMode || null,
    isOffline: isOfflineMode,
    locationInfo,
    meetingLink: this.meetingLink,
    meetingPlatform: this.meetingPlatform,
    meetingPlatformIcon: this.meetingPlatformIcon,
    hasMeetingLink: this.hasMeetingLink,
    recordingLink: this.recordingLink,
    automationEventsOffline: {
      reminder24hOfflineSent:
        this.automationEvents?.reminder24hOfflineSent || false,
      reminder24hOfflineSentAt:
        this.automationEvents?.reminder24hOfflineSentAt || null,
      reminder30minOfflineSent:
        this.automationEvents?.reminder30minOfflineSent || false,
      reminder30minOfflineSentAt:
        this.automationEvents?.reminder30minOfflineSentAt || null,
      preAttendancePingSent:
        this.automationEvents?.preAttendancePingSent || false,
      preAttendancePingSentAt:
        this.automationEvents?.preAttendancePingSentAt || null,
    },
  };
};

SessionSchema.methods.getDisplayDetails = function () {
  const dayName = this.dayName;
  const lessonsText = this.lessonIndexes
    .map((idx) => `Lesson ${idx + 1}`)
    .join(" & ");

  const isOfflineMode =
    (this.deliveryMode || this.populated?.groupId?.deliveryMode) === "offline";

  const groupLoc = this.populated?.groupId?.locationDetails || {};
  const groupLocation = this.populated?.groupId?.location || "";

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
    deliveryMode: this.deliveryMode || null,
    isOffline: isOfflineMode,
    locationInfo: isOfflineMode
      ? {
          placeName: groupLoc.placeName || groupLocation || "",
          address: groupLoc.address || groupLoc.extraDetails || "",
          country: groupLoc.country || "",
          lat: groupLoc.lat ?? null,
          lng: groupLoc.lng ?? null,
        }
      : null,
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

SessionSchema.methods.canTakeAttendance = function () {
  const allowedStatuses = ["scheduled", "completed", "cancelled", "postponed"];
  if (!allowedStatuses.includes(this.status)) return false;

  if (this.hasActiveEarlyAccess) return true;

  const now = new Date();
  const sessionDateTime = this.fullDateTime;
  if (!sessionDateTime) return false;

  const thirtyMinutesBefore = new Date(sessionDateTime.getTime() - 30 * 60000);
  const twoHoursAfter = new Date(sessionDateTime.getTime() + 2 * 60 * 60000);

  return now >= thirtyMinutesBefore && now <= twoHoursAfter;
};

SessionSchema.methods.canBeEdited = function () {
  if (this.status === "completed" || this.status === "cancelled") return false;

  if (this.status === "scheduled" || this.status === "postponed") {
    const now = new Date();
    const sessionDateTime = this.fullDateTime;
    if (!sessionDateTime) return true;

    const hoursBefore = (sessionDateTime - now) / (1000 * 60 * 60);
    return hoursBefore > 24;
  }

  return true;
};

SessionSchema.methods.canChangeMeetingLink = function () {
  if (this.status === "completed" || this.status === "cancelled") return false;

  const now = new Date();
  const sessionDateTime = this.fullDateTime;
  if (!sessionDateTime) return true;

  const oneHourBefore = new Date(sessionDateTime.getTime() - 60 * 60000);
  return now < oneHourBefore;
};

SessionSchema.methods.releaseMeetingLink = async function () {
  try {
    const { releaseMeetingLink } = await import("../../utils/sessionGenerator");
    return await releaseMeetingLink(this._id);
  } catch (error) {
    console.error("❌ Error releasing meeting link:", error);
    throw error;
  }
};

SessionSchema.methods.assignMeetingLink = async function (
  meetingLinkId,
  userId,
) {
  try {
    const { manuallyAssignMeetingLink } =
      await import("../../utils/sessionGenerator");
    return await manuallyAssignMeetingLink(this._id, meetingLinkId, userId);
  } catch (error) {
    console.error("❌ Error assigning meeting link:", error);
    throw error;
  }
};

SessionSchema.methods.getNextSession = async function () {
  return await mongoose
    .model("Session")
    .findOne({
      groupId: this.groupId,
      scheduledDate: { $gt: this.scheduledDate },
      isDeleted: false,
    })
    .sort({ scheduledDate: 1 });
};

SessionSchema.methods.getPreviousSession = async function () {
  return await mongoose
    .model("Session")
    .findOne({
      groupId: this.groupId,
      scheduledDate: { $lt: this.scheduledDate },
      isDeleted: false,
    })
    .sort({ scheduledDate: -1 });
};

SessionSchema.methods.getModuleSessions = async function () {
  return await mongoose
    .model("Session")
    .find({
      groupId: this.groupId,
      moduleIndex: this.moduleIndex,
      isDeleted: false,
    })
    .sort({ sessionNumber: 1 });
};

// ✅ يجيب السيشن دي + كل اللي بعدها بالتسلسل الكامل
// 🔧 الترتيب على أساس scheduledDate الفعلي (مع moduleIndex/sessionNumber tie-breaker)
SessionSchema.methods.getChainFromHere = async function () {
  const allSessions = await mongoose
    .model("Session")
    .find({ groupId: this.groupId, isDeleted: false })
    .sort({ scheduledDate: 1, moduleIndex: 1, sessionNumber: 1 });

  const myIndex = allSessions.findIndex(
    (s) => s._id.toString() === this._id.toString(),
  );

  if (myIndex === -1) return [this];

  return allSessions.slice(myIndex);
};

SessionSchema.methods.getAllGroupSessionsSorted = async function () {
  return await mongoose
    .model("Session")
    .find({ groupId: this.groupId, isDeleted: false })
    .sort({ scheduledDate: 1, moduleIndex: 1, sessionNumber: 1 });
};

// ✅ يبني preview لترحيل جدول الجروب كله (بدون حفظ)
SessionSchema.methods.buildCascadePreview = async function (shiftDays = 7) {
  const allSessions = await this.getAllGroupSessionsSorted();

  const affectedSessions = [];
  const skippedSessions = [];

  allSessions.forEach((session) => {
    const isTrigger = session._id.toString() === this._id.toString();
    const oldScheduledDate = new Date(session.scheduledDate);

    if (!isTrigger && session.status === "completed") {
      skippedSessions.push({
        sessionId: session._id,
        title: session.title,
        moduleIndex: session.moduleIndex,
        sessionNumber: session.sessionNumber,
        status: session.status,
        scheduledDate: oldScheduledDate,
        reason: "completed",
      });
      return;
    }

    const newScheduledDate = new Date(oldScheduledDate);
    if (!isTrigger) {
      newScheduledDate.setDate(newScheduledDate.getDate() + shiftDays);
    }

    affectedSessions.push({
      sessionId: session._id,
      title: session.title,
      moduleIndex: session.moduleIndex,
      sessionNumber: session.sessionNumber,
      status: session.status,
      isTrigger,
      oldScheduledDate,
      newScheduledDate,
    });
  });

  return {
    shiftDays,
    totalAffected: affectedSessions.length,
    completedCount: affectedSessions.filter((s) => s.status === "completed")
      .length,
    skippedCount: skippedSessions.length,
    skippedSessions,
    affectedSessions,
  };
};

// ✅ يكتب pendingReschedule على كل سيشن في السلسلة
SessionSchema.methods.submitCascadeRescheduleRequest = async function (
  { viewMode = "single", shiftDays = 7 },
  userId,
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
        },
      ),
    ),
  );

  return { batchId, affectedCount: preview.affectedSessions.length, preview };
};

// ✅ Swap request بين سيشن معينة وسيشن "اليوم"
SessionSchema.methods.submitSwapWithTodayRequest = async function (
  { todaySession, shiftDays = 7 },
  userId,
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

  const batchId = new mongoose.Types.ObjectId();
  const requestedAt = new Date();

  const targetOldDate = new Date(this.scheduledDate);
  const todayOldDate = new Date(todaySession.scheduledDate);

  const targetNewDate = new Date(todayOldDate);
  const todayNewDate = new Date(targetOldDate);

  await Promise.all([
    Session.updateOne(
      { _id: this._id, isDeleted: false },
      {
        $set: {
          pendingReschedule: {
            batchId,
            status: "pending",
            triggerSessionId: this._id,
            viewMode: "swapToday",
            shiftDays,
            oldScheduledDate: targetOldDate,
            newScheduledDate: targetNewDate,
            swapSessionId: todaySession._id,
            requestedBy: userId,
            requestedAt,
          },
          "metadata.lastModifiedBy": userId,
          "metadata.updatedAt": requestedAt,
        },
      },
    ),
    Session.updateOne(
      { _id: todaySession._id, isDeleted: false },
      {
        $set: {
          pendingReschedule: {
            batchId,
            status: "pending",
            triggerSessionId: this._id,
            viewMode: "swapToday",
            shiftDays,
            oldScheduledDate: todayOldDate,
            newScheduledDate: todayNewDate,
            swapSessionId: this._id,
            requestedBy: userId,
            requestedAt,
          },
          "metadata.lastModifiedBy": userId,
          "metadata.updatedAt": requestedAt,
        },
      },
    ),
  ]);

  return {
    batchId,
    affectedCount: 2,
    targetSessionId: this._id,
    targetTitle: this.title,
    todaySessionId: todaySession._id,
    todaySessionTitle: todaySession.title,
    targetOldDate,
    targetNewDate,
    todayOldDate,
    todayNewDate,
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════════════════

// ── Cascade shift on cancel ────────────────────────────────────────────────
// عند إلغاء سيشن (trigger)، بترحل هي + كل السيشنات غير المكتملة في الجروب
// بمقدار shiftDays أسبوع. الـ trigger بتفضل cancelled على تاريخها الجديد.
SessionSchema.statics.cascadeShiftOnCancel = async function (
  sessionId,
  userId,
  shiftDays = 7,
) {
  const triggerSession = await this.findById(sessionId);
  if (!triggerSession) {
    const error = new Error("Session not found");
    error.code = "SESSION_NOT_FOUND";
    throw error;
  }

  if (triggerSession.status === "completed") {
    const error = new Error("لا يمكن إلغاء سيشن مكتملة بالفعل");
    error.code = "SESSION_ALREADY_COMPLETED";
    throw error;
  }

  if (triggerSession.status === "cancelled") {
    const error = new Error("السيشن دي ملغية بالفعل");
    error.code = "SESSION_ALREADY_CANCELLED";
    throw error;
  }

  const chain = await triggerSession.getAllGroupSessionsSorted();
  const now = new Date();
  const shifted = [];
  const skipped = [];

  for (const session of chain) {
    const isTrigger = session._id.toString() === triggerSession._id.toString();

    if (session.status === "completed") {
      skipped.push({
        sessionId: session._id,
        title: session.title,
        reason: "completed",
      });
      continue;
    }

    if (!isTrigger && session.status === "cancelled") {
      skipped.push({
        sessionId: session._id,
        title: session.title,
        reason: "cancelled",
      });
      continue;
    }

    const oldScheduledDate = new Date(session.scheduledDate);
    const newScheduledDate = new Date(oldScheduledDate);
    newScheduledDate.setDate(newScheduledDate.getDate() + shiftDays);

    session.scheduledDate = newScheduledDate;
    if (isTrigger) session.status = "cancelled";
    session.metadata.lastModifiedBy = userId;
    session.metadata.updatedAt = now;
    await session.save();

    shifted.push({
      sessionId: session._id,
      title: session.title,
      isTrigger,
      oldScheduledDate,
      newScheduledDate,
    });
  }

  return {
    triggerSessionId: triggerSession._id,
    shiftDays,
    shiftedCount: shifted.length,
    skippedCount: skipped.length,
    shifted,
    skipped,
  };
};

// ── Find "effectively today" session in group ──────────────────────────────
SessionSchema.statics.findEffectiveTodaySessionInGroup = async function (
  groupId,
  excludeSessionId,
) {
  const candidates = await this.find({
    groupId,
    isDeleted: false,
    _id: { $ne: excludeSessionId },
  });

  return candidates.find((s) => s.isEffectivelyToday()) || null;
};

// ── Sessions by day ────────────────────────────────────────────────────────
SessionSchema.statics.getSessionsByDay = async function (groupId) {
  const sessions = await this.find({ groupId, isDeleted: false })
    .sort({ scheduledDate: 1, startTime: 1 })
    .lean();

  const grouped = {};

  sessions.forEach((session) => {
    const dateKey = new Date(session.scheduledDate).toISOString().split("T")[0];
    const dayName = new Date(session.scheduledDate).toLocaleDateString(
      "en-US",
      { weekday: "long" },
    );

    if (!grouped[dateKey]) {
      grouped[dateKey] = { date: dateKey, dayName, sessions: [] };
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

  return Object.values(grouped).sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );
};

// ── Sessions by day of week ────────────────────────────────────────────────
SessionSchema.statics.getSessionsByDayOfWeek = async function (
  groupId,
  dayOfWeek,
) {
  const sessions = await this.find({ groupId, isDeleted: false }).lean();

  const dayMap = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  return sessions.filter((session) => {
    const sessionDay = new Date(session.scheduledDate).getDay();
    return sessionDay === dayMap[dayOfWeek];
  });
};

// ── Session stats ──────────────────────────────────────────────────────────
SessionSchema.statics.getSessionStats = async function (groupId) {
  const stats = await this.aggregate([
    {
      $match: {
        groupId: new mongoose.Types.ObjectId(groupId),
        isDeleted: false,
      },
    },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const statsMap = {
    scheduled: 0,
    completed: 0,
    cancelled: 0,
    postponed: 0,
    total: 0,
    withMeetingLinks: 0,
  };

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

// ── Next upcoming session ──────────────────────────────────────────────────
SessionSchema.statics.getNextUpcomingSession = async function (groupId) {
  const now = new Date();

  return await this.findOne({
    groupId,
    scheduledDate: { $gte: now },
    status: "scheduled",
    isDeleted: false,
  }).sort({ scheduledDate: 1, startTime: 1 });
};

// ── Sessions by module ─────────────────────────────────────────────────────
SessionSchema.statics.getSessionsByModule = async function (groupId) {
  const sessions = await this.find({ groupId, isDeleted: false })
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

  return Object.values(groupedByModule).sort(
    (a, b) => a.moduleIndex - b.moduleIndex,
  );
};

// ── Today's sessions ───────────────────────────────────────────────────────
SessionSchema.statics.getTodaySessions = async function (groupId) {
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const todayEnd = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
  );

  return await this.find({
    groupId,
    scheduledDate: { $gte: todayStart, $lt: todayEnd },
    isDeleted: false,
  }).sort({ startTime: 1 });
};

// ── Sessions within date range ─────────────────────────────────────────────
SessionSchema.statics.getSessionsByDateRange = async function (
  groupId,
  startDate,
  endDate,
) {
  return await this.find({
    groupId,
    scheduledDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
    isDeleted: false,
  }).sort({ scheduledDate: 1, startTime: 1 });
};

// ── Sessions needing meeting links ─────────────────────────────────────────
SessionSchema.statics.getSessionsNeedingMeetingLinks = async function (
  groupId = null,
  limit = 50,
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

  return await this.find(query).sort({ scheduledDate: 1 }).limit(limit).lean();
};

// ── Available meeting links for a session ──────────────────────────────────
SessionSchema.statics.getAvailableMeetingLinksForSession = async function (
  sessionId,
) {
  const session = await this.findById(sessionId);
  if (!session) throw new Error("Session not found");

  const { getAvailableMeetingLinks } = await import(
    "../../utils/sessionGenerator"
  );
  return await getAvailableMeetingLinks(
    [session.dayName],
    session.startTime,
    session.endTime,
  );
};

// ── Pending reschedule batches (grouped by batchId) ────────────────────────
SessionSchema.statics.getPendingRescheduleBatches = async function () {
  const sessions = await this.find({
    isDeleted: false,
    "pendingReschedule.status": "pending",
  })
    .populate({ path: "groupId", select: "name code" })
    .populate({ path: "pendingReschedule.requestedBy", select: "name email" })
    .sort({
      "pendingReschedule.requestedAt": -1,
      moduleIndex: 1,
      sessionNumber: 1,
    })
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
        session.pendingReschedule.triggerSessionId?.toString() ===
        session._id.toString(),
      oldScheduledDate: session.pendingReschedule.oldScheduledDate,
      newScheduledDate: session.pendingReschedule.newScheduledDate,
    });
  });

  return Object.values(batches);
};

// ── Approve reschedule batch ───────────────────────────────────────────────
SessionSchema.statics.approveRescheduleBatch = async function (
  batchId,
  adminUserId,
) {
  const sessions = await this.find({
    isDeleted: false,
    "pendingReschedule.batchId": batchId,
    "pendingReschedule.status": "pending",
  });

  if (sessions.length === 0) {
    const error = new Error(
      "لا يوجد طلب ترحيل مطابق لهذا الرقم أو تمت معالجته بالفعل",
    );
    error.code = "BATCH_NOT_FOUND";
    throw error;
  }

  const now = new Date();
  const results = [];
  const triggerSessionId =
    sessions[0].pendingReschedule.triggerSessionId?.toString();

  for (const session of sessions) {
    const isTrigger = session._id.toString() === triggerSessionId;
    const isSwap = session.pendingReschedule.viewMode === "swapToday";

    if (!isTrigger || isSwap) {
      session.scheduledDate = session.pendingReschedule.newScheduledDate;
    }

    session.pendingReschedule.status = "approved";
    session.pendingReschedule.reviewedBy = adminUserId;
    session.pendingReschedule.reviewedAt = now;
    session.metadata.lastModifiedBy = adminUserId;
    session.metadata.updatedAt = now;

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

  return {
    batchId,
    updatedCount: results.length,
    sessions: results,
    triggerSessionId,
  };
};

// ── Reject reschedule batch ────────────────────────────────────────────────
SessionSchema.statics.rejectRescheduleBatch = async function (
  batchId,
  adminUserId,
  reviewNotes = "",
) {
  const sessions = await this.find({
    isDeleted: false,
    "pendingReschedule.batchId": batchId,
    "pendingReschedule.status": "pending",
  });

  if (sessions.length === 0) {
    const error = new Error(
      "لا يوجد طلب ترحيل مطابق لهذا الرقم أو تمت معالجته بالفعل",
    );
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
    },
  );

  return { batchId, updatedCount: result.modifiedCount };
};

// ── Consume early access ───────────────────────────────────────────────────
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
    },
  );
};

// ── Soft delete all sessions for a group ───────────────────────────────────
SessionSchema.statics.deleteGroupSessions = async function (groupId, userId) {
  const sessions = await this.find({
    groupId,
    isDeleted: false,
    meetingLinkId: { $ne: null },
  });

  for (const session of sessions) {
    try {
      await session.releaseMeetingLink();
    } catch (error) {
      console.error(
        `⚠️ Failed to release meeting link for session ${session._id}:`,
        error.message,
      );
    }
  }

  return await this.updateMany(
    { groupId, isDeleted: false },
    {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        status: "cancelled",
        "metadata.lastModifiedBy": userId,
        "metadata.updatedAt": new Date(),
      },
    },
  );
};

// ── Find duplicate sessions ────────────────────────────────────────────────
SessionSchema.statics.findDuplicates = async function (groupId) {
  return await this.aggregate([
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
    { $match: { count: { $gt: 1 } } },
  ]);
};

// ═══════════════════════════════════════════════════════════════════════════
// JSON TRANSFORMS
// ═══════════════════════════════════════════════════════════════════════════

const transformSession = (doc, ret) => {
  delete ret.__v;
  delete ret.isDeleted;
  delete ret.deletedAt;

  if (ret.meetingCredentials?.password) {
    ret.meetingCredentials.password = "••••••••";
  }

  return ret;
};

SessionSchema.set("toJSON", { virtuals: true, transform: transformSession });
SessionSchema.set("toObject", { virtuals: true, transform: transformSession });

// ═══════════════════════════════════════════════════════════════════════════
// MODEL EXPORT
// ═══════════════════════════════════════════════════════════════════════════

// Dev hot-reload guard — يمنع stale model registration
if (process.env.NODE_ENV !== "production" && mongoose.models.Session) {
  delete mongoose.models.Session;
}

const Session =
  mongoose.models.Session || mongoose.model("Session", SessionSchema);

export default Session;