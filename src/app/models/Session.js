// models/Session.js
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

    // Meeting Details
    meetingLink: {
      type: String,
      trim: true,
    },
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

    // Automation Tracking
    automationEvents: {
      reminderSent: {
        type: Boolean,
        default: false,
      },
      reminderSentAt: Date,
      absentNotificationsSent: {
        type: Boolean,
        default: false,
      },
      absentNotificationsSentAt: Date,
      postponeNotificationSent: {
        type: Boolean,
        default: false,
      },
      cancelNotificationSent: {
        type: Boolean,
        default: false,
      },

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

// Compound Indexes
SessionSchema.index({ groupId: 1, scheduledDate: 1 });
SessionSchema.index({ groupId: 1, status: 1 });
SessionSchema.index({ courseId: 1 });
SessionSchema.index({ scheduledDate: 1, status: 1 });
SessionSchema.index({ moduleIndex: 1, sessionNumber: 1 });

// ✅ Unique constraint: one session per group/module/sessionNumber
// ⚠️ REMOVED: lessonIndex from unique index to prevent duplicate key errors
SessionSchema.index(
  { groupId: 1, moduleIndex: 1, sessionNumber: 1 },
  {
    unique: true,
    name: "unique_session_per_group_module",
    background: true,
  }
);

// Update timestamp
SessionSchema.pre("save", function (next) {
  this.metadata.updatedAt = new Date();
  next();
});

// Prevent deletion queries from returning deleted sessions
SessionSchema.pre("find", function () {
  this.where({ isDeleted: false });
});

SessionSchema.pre("findOne", function () {
  this.where({ isDeleted: false });
});

// ✅ Prevent duplicate sessions on save
SessionSchema.pre("save", async function (next) {
  try {
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
        return next(error);
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Virtual: Total students marked
SessionSchema.virtual("totalMarked").get(function () {
  return this.attendance ? this.attendance.length : 0;
});

// Virtual: Present count
SessionSchema.virtual("presentCount").get(function () {
  return this.attendance
    ? this.attendance.filter((a) => a.status === "present").length
    : 0;
});

// Virtual: Absent count
SessionSchema.virtual("absentCount").get(function () {
  return this.attendance
    ? this.attendance.filter((a) => a.status === "absent").length
    : 0;
});

// Virtual: Day of week name
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

// Virtual: Formatted date (YYYY-MM-DD)
SessionSchema.virtual("formattedDate").get(function () {
  return this.scheduledDate
    ? this.scheduledDate.toISOString().split("T")[0]
    : "";
});

// Virtual: Lessons covered text
SessionSchema.virtual("lessonsText").get(function () {
  return this.lessonIndexes.map((idx) => `Lesson ${idx + 1}`).join(" & ");
});

// Virtual: Module position (for display)
SessionSchema.virtual("modulePosition").get(function () {
  return this.moduleIndex + 1;
});

// Virtual: Full date time for sorting
SessionSchema.virtual("fullDateTime").get(function () {
  if (!this.scheduledDate || !this.startTime) return null;

  const date = new Date(this.scheduledDate);
  const [hours, minutes] = this.startTime.split(":").map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
});

// Method: Check if session is in the past
SessionSchema.methods.isPast = function () {
  const now = new Date();
  const sessionDateTime = this.fullDateTime;
  return sessionDateTime ? sessionDateTime < now : false;
};

// Method: Check if session is upcoming (within next 48 hours)
SessionSchema.methods.isUpcoming = function () {
  const now = new Date();
  const sessionDateTime = this.fullDateTime;

  if (!sessionDateTime) return false;

  const diffHours = (sessionDateTime - now) / (1000 * 60 * 60);
  return diffHours > 0 && diffHours <= 48;
};

// Method: Check if session is today
SessionSchema.methods.isToday = function () {
  const today = new Date();
  const sessionDate = new Date(this.scheduledDate);

  return today.toDateString() === sessionDate.toDateString();
};

// Method: Get session summary
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
    isPast: this.isPast(),
    isUpcoming: this.isUpcoming(),
    isToday: this.isToday(),
    moduleIndex: this.moduleIndex,
    modulePosition: this.modulePosition,
    meetingLink: this.meetingLink,
    recordingLink: this.recordingLink,
  };
};

// Method: Get session display details (for UI)
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
    recordingLink: this.recordingLink,
    instructorNotes: this.instructorNotes,
  };
};

// Method: Get status color for UI
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

// Method: Check if attendance can be taken
SessionSchema.methods.canTakeAttendance = function () {
  if (this.status !== "scheduled" && this.status !== "completed") {
    return false;
  }

  const now = new Date();
  const sessionDateTime = this.fullDateTime;

  if (!sessionDateTime) return false;

  // يمكن أخذ الحضور قبل الجلسة بـ 30 دقيقة وبعد انتهائها بـ 2 ساعة
  const thirtyMinutesBefore = new Date(sessionDateTime.getTime() - 30 * 60000);
  const twoHoursAfter = new Date(sessionDateTime.getTime() + 2 * 60 * 60000);

  return now >= thirtyMinutesBefore && now <= twoHoursAfter;
};

// Method: Check if session can be edited
SessionSchema.methods.canBeEdited = function () {
  // لا يمكن تعديل السيشنات المكتملة أو الملغاة
  if (this.status === "completed" || this.status === "cancelled") {
    return false;
  }

  // يمكن تعديل السيشنات المؤجلة أو المجدولة قبل موعدها بـ 24 ساعة
  if (this.status === "scheduled" || this.status === "postponed") {
    const now = new Date();
    const sessionDateTime = this.fullDateTime;

    if (!sessionDateTime) return true;

    const hoursBefore = (sessionDateTime - now) / (1000 * 60 * 60);
    return hoursBefore > 24;
  }

  return true;
};

// Method: Get next session in sequence (if exists)
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

// Method: Get previous session in sequence (if exists)
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

// Method: Get session sequence in module
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

// Static: Get all sessions for a group grouped by day
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

// Static: Get sessions for a specific day of week
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

// Static: Get session distribution statistics
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
  };

  stats.forEach((stat) => {
    statsMap[stat._id] = stat.count;
    statsMap.total += stat.count;
  });

  return statsMap;
};

// Static: Get next upcoming session for a group
SessionSchema.statics.getNextUpcomingSession = async function (groupId) {
  const now = new Date();

  return await this.findOne({
    groupId,
    scheduledDate: { $gte: now },
    status: "scheduled",
    isDeleted: false,
  }).sort({ scheduledDate: 1, startTime: 1 });
};

// Static: Get sessions by module
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

// Static: Get today's sessions for a group
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

// Static: Get sessions within date range
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

// Static: Delete all sessions for a group (soft delete)
SessionSchema.statics.deleteGroupSessions = async function (groupId, userId) {
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

// Static: Find duplicate sessions
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

// Ensure virtuals are included in JSON
SessionSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    // Remove sensitive/technical fields
    delete ret.__v;
    delete ret.isDeleted;
    delete ret.deletedAt;
    return ret;
  },
});

SessionSchema.set("toObject", {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    delete ret.isDeleted;
    delete ret.deletedAt;
    return ret;
  },
});

// Create the model
const Session =
  mongoose.models.Session || mongoose.model("Session", SessionSchema);

export default Session;
