// models/Group.js
import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      unique: true,
      default: function () {
        return `GRP-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 4)
          .toUpperCase()}`;
      },
    },

    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    courseSnapshot: {
      type: Object,
      required: true,
    },

    // Module Selection for Sessions
    moduleSelection: {
      mode: {
        type: String,
        enum: ["all", "specific"],
        default: "all",
      },
      selectedModules: {
        type: [Number],
        default: [],
      },
    },

    // Instructors with countTime
    instructors: [
      {
        _id: false,
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        countTime: {
          type: Number,
          default: 0,
        },
      },
    ],

    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
      },
    ],

    // Capacity
    maxStudents: {
      type: Number,
      required: true,
      min: 1,
      default: 25,
    },
    currentStudentsCount: {
      type: Number,
      default: 0,
    },

    // Schedule
    schedule: {
      startDate: {
        type: Date,
        required: true,
      },
      daysOfWeek: [
        {
          type: String,
          enum: [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ],
        },
      ],
      timeFrom: {
        type: String,
        required: true,
        match: /^([01]\d|2[0-3]):([0-5]\d)$/,
      },
      timeTo: {
        type: String,
        required: true,
        match: /^([01]\d|2[0-3]):([0-5]\d)$/,
      },
      timezone: {
        type: String,
        default: "Africa/Cairo",
      },
    },

    firstMeetingLink: {
      type: String,
      default: "",
    },

        // ═══════════════════════════════════════════════════════════════
    // ✅ MAKE-UP GROUP (جروب تعويضي) — Ad-hoc group
    // ═══════════════════════════════════════════════════════════════
    // الجروب ده بيتعمل من صفحة الأدمن لما يعمل حصة تعويضية لطالب.
    // بيتميز بإنه:
    //   - طالب واحد بس
    //   - سيشن واحدة بس (بتتولّد عند الـActivation)
    //   - كل سيشناته isComplimentary: true
    // makeupInfo بيحفظ رابط الطالب + السيشن الأصلية + الجروب الأصلي.
    isMakeupGroup: {
      type: Boolean,
      default: false,
      index: true,
    },
    makeupInfo: {
      studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        default: null,
      },
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

    // ✅ نوع الجروب: أونلاين ولا أوفلاين
    deliveryMode: {
      type: String,
      enum: ["online", "offline"],
      default: "online",
    },
    location: {
      type: String,
      default: "",
    },
    locationDetails: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      placeName: { type: String, default: "" },
      country: { type: String, default: "" },
      address: { type: String, default: "" },
      extraDetails: { type: String, default: "" },
    },

    // Pricing
    pricing: {
      price: {
        type: Number,
        min: 0,
        default: 0,
      },
      paymentType: {
        type: String,
        enum: ["full", "installments"],
        default: "full",
      },
      installmentPlan: {
        numberOfInstallments: {
          type: Number,
          default: 0,
          min: 0,
        },
        amountPerInstallment: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    },

    // Automation Settings
    automation: {
      whatsappEnabled: {
        type: Boolean,
        default: true,
      },
      welcomeMessage: {
        type: Boolean,
        default: true,
      },
      reminderEnabled: {
        type: Boolean,
        default: true,
      },
      reminderBeforeHours: {
        type: Number,
        default: 24,
        min: 1,
        max: 168,
      },
      notifyGuardianOnAbsence: {
        type: Boolean,
        default: true,
      },
      notifyOnSessionUpdate: {
        type: Boolean,
        default: true,
      },
      completionMessage: {
        type: Boolean,
        default: true,
      },
    },

    // Status
    status: {
      type: String,
      enum: ["draft", "active", "completed", "cancelled"],
      default: "draft",
    },

    // ✅ Hold — تعليق الجروب مؤقتًا
    hold: {
      isHeld: {
        type: Boolean,
        default: false,
      },
      // duration: لفترة محددة بالأيام
      // sessions: لعدد سيشنات محددة
      // until_session: لحد سيشن محددة بالـ ID
      // indefinite: مفتوح لحد ما الأدمن يفكّه
      holdType: {
        type: String,
        enum: ["duration", "sessions", "until_session", "indefinite", null],
        default: null,
      },
      holdDays: { type: Number, default: 0 },
      holdSessionsCount: { type: Number, default: 0 },
      holdSessionsConsumed: { type: Number, default: 0 },
      // ✅ جديد: لو holdType === "until_session" — الـ ID بتاع السيشن المستهدفة
      holdUntilSessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Session",
        default: null,
      },
      holdStartDate: { type: Date, default: null },
      holdEndDate: { type: Date, default: null },
      holdReason: { type: String, default: "" },
      heldBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      heldAt: { type: Date, default: null },
      releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      releasedAt: { type: Date, default: null },
      releaseReason: { type: String, default: "" },
    },

    // ✅ سجل الـ Holds السابقة
    holdHistory: [
      {
        isHeld: { type: Boolean },
        holdType: { type: String },
        holdDays: { type: Number },
        holdSessionsCount: { type: Number },
        holdSessionsConsumed: { type: Number },
        holdUntilSessionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Session",
          default: null,
        },
        holdStartDate: { type: Date },
        holdEndDate: { type: Date },
        holdReason: { type: String, default: "" },
        heldBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        heldAt: { type: Date },
        releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        releasedAt: { type: Date },
        releaseReason: { type: String, default: "" },
        sessionsShifted: { type: Number, default: 0 },
        shiftDays: { type: Number, default: 0 },
      },
    ],

    // Sessions
    sessionsGenerated: {
      type: Boolean,
      default: false,
    },
    totalSessionsCount: {
      type: Number,
      default: 0,
    },

    // Soft Delete
    isDeleted: {
      type: Boolean,
      default: false,
    },

    // Marketing Automation Metadata
    marketing: {
      enabled: {
        type: Boolean,
        default: true,
      },
      evaluationFollowup: {
        type: Boolean,
        default: true,
      },
      completionFollowup: {
        type: Boolean,
        default: true,
      },
    },

    // Metadata
    metadata: {
      updatedAt: Date,
      sessionsGeneratedAt: Date,
      lastSessionGeneration: {
        date: Date,
        sessionsCount: Number,
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
      instructorNotificationsSent: Boolean,
      instructorNotificationsSentAt: Date,
      instructorNotificationResults: Array,
      instructorNotificationsSummary: Object,

      completionNotification: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        studentsNotified: { type: Number, default: 0 },
        studentsFailed: { type: Number, default: 0 },
        feedbackLink: { type: String, default: "" },
        results: { type: Array, default: [] },
      },
      completionNotifiedAt: Date,

      completedAt: Date,
      completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

      feedbackLink: { type: String, default: "" },
    },

    // ✅ الوسوم
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tag",
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ==================== VIRTUAL PROPERTIES ====================

groupSchema.virtual("capacityPercentage").get(function () {
  if (this.maxStudents === 0) return 0;
  return Math.round((this.currentStudentsCount / this.maxStudents) * 100);
});

groupSchema.virtual("daysRemaining").get(function () {
  if (!this.schedule?.startDate || this.totalSessionsCount === 0) return 0;

  const daysPerWeek = this.schedule.daysOfWeek?.length || 1;
  const totalWeeks = Math.ceil(this.totalSessionsCount / daysPerWeek);
  const daysRequired = totalWeeks * 7;

  const startDate = new Date(this.schedule.startDate);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + daysRequired);

  const today = new Date();
  const diffTime = endDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, daysRemaining);
});

// ✅ هل الجروب "فعليًا" شغال؟ (status active AND not on hold)
groupSchema.virtual("isEffectivelyActive").get(function () {
  if (this.status !== "active") return false;
  if (this.hold?.isHeld) return false;
  return true;
});

// ✅ هل الجروب على Hold؟
groupSchema.virtual("isOnHold").get(function () {
  return !!this.hold?.isHeld;
});

// ✅ كام فاضل في الـ Hold؟
groupSchema.virtual("holdRemaining").get(function () {
  if (!this.hold?.isHeld) return null;

  if (this.hold.holdType === "indefinite") {
    return { type: "indefinite", days: null, sessions: null };
  }

  if (this.hold.holdType === "until_session") {
    return {
      type: "until_session",
      days: null,
      sessions: null,
      untilSessionId: this.hold.holdUntilSessionId || null,
    };
  }

  if (this.hold.holdType === "sessions") {
    return {
      type: "sessions",
      days: null,
      sessions: Math.max(
        0,
        (this.hold.holdSessionsCount || 0) -
          (this.hold.holdSessionsConsumed || 0)
      ),
    };
  }

  if (!this.hold.holdEndDate) return { type: "duration", days: 0 };

  const now = new Date();
  const diff = this.hold.holdEndDate.getTime() - now.getTime();
  return {
    type: "duration",
    days: Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))),
  };
});

// ==================== METHODS ====================

groupSchema.methods.addStudent = function (studentId) {
  if (!this.students.includes(studentId)) {
    this.students.push(studentId);
    this.currentStudentsCount = this.students.length;
  }
  return this.save();
};

groupSchema.methods.removeStudent = function (studentId) {
  const index = this.students.indexOf(studentId);
  if (index > -1) {
    this.students.splice(index, 1);
    this.currentStudentsCount = this.students.length;
  }
  return this.save();
};

groupSchema.methods.isFull = function () {
  return this.currentStudentsCount >= this.maxStudents;
};

// ✅ بقت بتاخد المدة الفعلية بالدقايق
groupSchema.methods.addInstructorHours = async function (durationMinutes = 0) {
  if (!this.instructors || this.instructors.length === 0) {
    console.log("⚠️ No instructors in group to add hours to");
    return { success: false, reason: "no_instructors" };
  }

  const hoursToAdd =
    Math.round(((Number(durationMinutes) || 0) / 60) * 100) / 100;

  if (hoursToAdd <= 0) {
    return { success: false, reason: "invalid_duration" };
  }

  for (const instructor of this.instructors) {
    instructor.countTime =
      Math.round(((instructor.countTime || 0) + hoursToAdd) * 100) / 100;
  }

  await this.save();
  return {
    success: true,
    instructorsUpdated: this.instructors.length,
    hoursAdded: hoursToAdd,
    durationMinutes,
  };
};

groupSchema.methods.getInstructorHours = function (userId) {
  const instructor = this.instructors.find(
    (i) => i.userId.toString() === userId.toString()
  );
  return instructor?.countTime || 0;
};

// ═══════════════════════════════════════════════════════════════════
// ✅ HOLD SYSTEM
// ═══════════════════════════════════════════════════════════════════

/**
 * 🎯 تفعيل الـ Hold على الجروب
 */
groupSchema.methods.holdGroup = async function ({
  holdType = "duration",
  holdDays = 7,
  holdSessionsCount = 1,
  holdUntilSessionId = null,
  reason = "",
  userId = null,
  shiftSessions = true,
} = {}) {
  if (this.hold?.isHeld) {
    return { success: false, error: "الجروب بالفعل على Hold" };
  }

  if (this.status !== "active") {
    return {
      success: false,
      error: "مينفعش تعمل Hold لجروب مش Active",
    };
  }

  const Session = mongoose.model("Session");
  const now = new Date();
  let holdEndDate = null;
  let shiftDays = 0;
  let sessionsShifted = 0;

  // ────────────────────────────────────────────────────────────────
  // 1️⃣ Hold لفترة محددة (بالأيام)
  // ────────────────────────────────────────────────────────────────
  if (holdType === "duration") {
    if (!holdDays || holdDays <= 0) {
      return { success: false, error: "لازم تحدد عدد أيام صحيحة" };
    }
    holdEndDate = new Date(now);
    holdEndDate.setDate(holdEndDate.getDate() + holdDays);
    shiftDays = holdDays;

    if (shiftSessions && shiftDays > 0) {
      const affectedSessions = await Session.find({
        groupId: this._id,
        isDeleted: false,
        status: { $in: ["scheduled", "postponed"] },
      });
      for (const session of affectedSessions) {
        const oldDate = new Date(session.scheduledDate);
        const newDate = new Date(oldDate);
        newDate.setDate(newDate.getDate() + shiftDays);
        session.scheduledDate = newDate;
        session.metadata.lastModifiedBy = userId;
        session.metadata.updatedAt = now;
        await session.save();
        sessionsShifted++;
      }
    }
  }

  // ────────────────────────────────────────────────────────────────
  // 2️⃣ Hold لعدد سيشنات محددة
  // ────────────────────────────────────────────────────────────────
  else if (holdType === "sessions") {
    if (!holdSessionsCount || holdSessionsCount <= 0) {
      return { success: false, error: "لازم تحدد عدد سيشنات صحيح" };
    }
    const daysPerWeek = this.schedule?.daysOfWeek?.length || 1;
    const daysBetweenSessions = Math.ceil(7 / daysPerWeek);
    shiftDays = daysBetweenSessions * holdSessionsCount;
    holdEndDate = new Date(now);
    holdEndDate.setDate(holdEndDate.getDate() + shiftDays);

    if (shiftSessions && shiftDays > 0) {
      const affectedSessions = await Session.find({
        groupId: this._id,
        isDeleted: false,
        status: { $in: ["scheduled", "postponed"] },
      });
      for (const session of affectedSessions) {
        const oldDate = new Date(session.scheduledDate);
        const newDate = new Date(oldDate);
        newDate.setDate(newDate.getDate() + shiftDays);
        session.scheduledDate = newDate;
        session.metadata.lastModifiedBy = userId;
        session.metadata.updatedAt = now;
        await session.save();
        sessionsShifted++;
      }
    }
  }

  // ────────────────────────────────────────────────────────────────
  // 3️⃣ Hold لحد سيشن محددة بالـ ID
  // ────────────────────────────────────────────────────────────────
  else if (holdType === "until_session") {
    if (!holdUntilSessionId) {
      return {
        success: false,
        error: "لازم تحدد السيشن المستهدفة",
      };
    }

    const targetSession = await Session.findOne({
      _id: holdUntilSessionId,
      groupId: this._id,
      isDeleted: false,
    })
      .select("scheduledDate title moduleIndex sessionNumber status")
      .lean();

    if (!targetSession) {
      return {
        success: false,
        error: "السيشن المحددة مش موجودة في الجروب ده",
      };
    }

    if (targetSession.status === "completed") {
      return {
        success: false,
        error: "السيشن المحددة مكتملة بالفعل — اختر سيشن لسه مجدولة",
      };
    }

    // ✅ تاريخ انتهاء الـ Hold = تاريخ السيشن المستهدفة (للعرض)
    holdEndDate = new Date(targetSession.scheduledDate);
    shiftDays = 7;

    if (shiftSessions && shiftDays > 0) {
      // ✅ نرحّل السيشنات من تاريخ السيشن المستهدفة وما بعدها فقط
      const sessionsFromTarget = await Session.find({
        groupId: this._id,
        isDeleted: false,
        status: { $in: ["scheduled", "postponed"] },
        scheduledDate: { $gte: targetSession.scheduledDate },
      }).sort({ scheduledDate: 1 });

      for (const s of sessionsFromTarget) {
        const oldDate = new Date(s.scheduledDate);
        const newDate = new Date(oldDate);
        newDate.setDate(newDate.getDate() + shiftDays);
        s.scheduledDate = newDate;
        s.metadata.lastModifiedBy = userId;
        s.metadata.updatedAt = now;
        await s.save();
        sessionsShifted++;
      }
    }
  }

  // ────────────────────────────────────────────────────────────────
  // 4️⃣ Hold مفتوح (indefinite)
  // ────────────────────────────────────────────────────────────────
  else if (holdType === "indefinite") {
    holdEndDate = null;
    shiftDays = 7;

    if (shiftSessions && shiftDays > 0) {
      const affectedSessions = await Session.find({
        groupId: this._id,
        isDeleted: false,
        status: { $in: ["scheduled", "postponed"] },
      });
      for (const session of affectedSessions) {
        const oldDate = new Date(session.scheduledDate);
        const newDate = new Date(oldDate);
        newDate.setDate(newDate.getDate() + shiftDays);
        session.scheduledDate = newDate;
        session.metadata.lastModifiedBy = userId;
        session.metadata.updatedAt = now;
        await session.save();
        sessionsShifted++;
      }
    }
  } else {
    return { success: false, error: "holdType غير صالح" };
  }

  // ✅ حفظ الـ Hold
  this.hold = {
    isHeld: true,
    holdType,
    holdDays: holdType === "duration" ? holdDays : 0,
    holdSessionsCount: holdType === "sessions" ? holdSessionsCount : 0,
    holdSessionsConsumed: 0,
    holdUntilSessionId:
      holdType === "until_session" ? holdUntilSessionId : null,
    holdStartDate: now,
    holdEndDate,
    holdReason: reason || "",
    heldBy: userId,
    heldAt: now,
    releasedBy: null,
    releasedAt: null,
    releaseReason: "",
  };

  this.markModified("hold");
  await this.save();

  return {
    success: true,
    data: {
      holdType,
      holdDays: holdType === "duration" ? holdDays : 0,
      holdSessionsCount: holdType === "sessions" ? holdSessionsCount : 0,
      holdUntilSessionId:
        holdType === "until_session" ? holdUntilSessionId : null,
      holdStartDate: now,
      holdEndDate,
      sessionsShifted,
      shiftDays,
    },
  };
};

/**
 * 🎯 فكّ الـ Hold
 */
groupSchema.methods.releaseGroup = async function ({
  userId = null,
  reason = "",
} = {}) {
  if (!this.hold?.isHeld) {
    return { success: false, error: "الجروب مش على Hold أصلاً" };
  }

  const now = new Date();

  const historyEntry = {
    isHeld: true,
    holdType: this.hold.holdType,
    holdDays: this.hold.holdDays,
    holdSessionsCount: this.hold.holdSessionsCount,
    holdSessionsConsumed: this.hold.holdSessionsConsumed,
    holdUntilSessionId: this.hold.holdUntilSessionId || null,
    holdStartDate: this.hold.holdStartDate,
    holdEndDate: this.hold.holdEndDate,
    holdReason: this.hold.holdReason,
    heldBy: this.hold.heldBy,
    heldAt: this.hold.heldAt,
    releasedBy: userId,
    releasedAt: now,
    releaseReason: reason || "",
    sessionsShifted: 0,
    shiftDays: 0,
  };

  if (!this.holdHistory) this.holdHistory = [];
  this.holdHistory.push(historyEntry);

  this.hold = {
    isHeld: false,
    holdType: null,
    holdDays: 0,
    holdSessionsCount: 0,
    holdSessionsConsumed: 0,
    holdUntilSessionId: null,
    holdStartDate: null,
    holdEndDate: null,
    holdReason: "",
    heldBy: null,
    heldAt: null,
    releasedBy: userId,
    releasedAt: now,
    releaseReason: reason || "",
  };

  this.markModified("hold");
  this.markModified("holdHistory");
  await this.save();

  return {
    success: true,
    data: {
      releasedAt: now,
      holdHistoryCount: this.holdHistory.length,
    },
  };
};

/**
 * 🎯 استهلاك سيشن من Hold من نوع "sessions"
 */
groupSchema.methods.consumeHoldSession = async function () {
  if (!this.hold?.isHeld) return { success: false, consumed: 0 };
  if (this.hold.holdType !== "sessions")
    return { success: false, consumed: 0 };

  this.hold.holdSessionsConsumed =
    (this.hold.holdSessionsConsumed || 0) + 1;

  let autoReleased = false;
  if (
    this.hold.holdSessionsConsumed >= this.hold.holdSessionsCount
  ) {
    this.hold.isHeld = false;
    this.hold.holdType = null;
    autoReleased = true;
  }

  this.markModified("hold");
  await this.save();

  return {
    success: true,
    consumed: this.hold.holdSessionsConsumed,
    autoReleased,
  };
};

/**
 * 🎯 جديد: لو الـ holdType = "until_session" ولسه شغال، افحص لو السيشن
 *    المستهدفة اتحسبت (اتاخد فيها حضور) → نفكّ الـ Hold تلقائيًا
 *
 *    @param {ObjectId} sessionId — السيشن اللي اتحسبت دلوقتي
 *    @returns {Object} { success, released }
 */
groupSchema.methods.checkAndReleaseUntilSessionHold = async function (
  sessionId,
) {
  if (!this.hold?.isHeld) return { success: false, released: false };
  if (this.hold.holdType !== "until_session") {
    return { success: false, released: false };
  }
  if (!this.hold.holdUntilSessionId) {
    return { success: false, released: false };
  }

  // ✅ السيشن المستهدفة هي اللي اتحسبت؟ → افكّ الـ Hold
  if (this.hold.holdUntilSessionId.toString() !== sessionId.toString()) {
    return { success: true, released: false };
  }

  // ✅ فكّ الـ Hold
  const now = new Date();
  const historyEntry = {
    isHeld: true,
    holdType: this.hold.holdType,
    holdDays: this.hold.holdDays,
    holdSessionsCount: this.hold.holdSessionsCount,
    holdSessionsConsumed: this.hold.holdSessionsConsumed,
    holdUntilSessionId: this.hold.holdUntilSessionId,
    holdStartDate: this.hold.holdStartDate,
    holdEndDate: this.hold.holdEndDate,
    holdReason: this.hold.holdReason,
    heldBy: this.hold.heldBy,
    heldAt: this.hold.heldAt,
    releasedBy: null,
    releasedAt: now,
    releaseReason: "فك تلقائي — السيشن المستهدفة اتحسبت",
    sessionsShifted: 0,
    shiftDays: 0,
  };

  if (!this.holdHistory) this.holdHistory = [];
  this.holdHistory.push(historyEntry);

  this.hold = {
    isHeld: false,
    holdType: null,
    holdDays: 0,
    holdSessionsCount: 0,
    holdSessionsConsumed: 0,
    holdUntilSessionId: null,
    holdStartDate: null,
    holdEndDate: null,
    holdReason: "",
    heldBy: null,
    heldAt: null,
    releasedBy: null,
    releasedAt: now,
    releaseReason: "فك تلقائي — السيشن المستهدفة اتحسبت",
  };

  this.markModified("hold");
  this.markModified("holdHistory");
  await this.save();

  return { success: true, released: true };
};

// ==================== STATIC METHODS ====================

groupSchema.statics.findActive = function () {
  return this.find({
    status: "active",
    isDeleted: false,
  })
    .populate("courseId")
    .populate("instructors.userId", "name email gender profile")
    .populate("tags");
};

groupSchema.statics.findByCourse = function (courseId) {
  return this.find({
    courseId,
    isDeleted: false,
  })
    .populate("instructors.userId", "name email")
    .populate("tags");
};

/**
 * 🎯 فكّ تلقائي للـ Holds المنتهية
 */
groupSchema.statics.autoReleaseExpiredHolds = async function () {
  const now = new Date();
  const released = [];

  // ────────────────────────────────────────────────────────────────
  // 1️⃣ duration: انتهت مدتها
  // ────────────────────────────────────────────────────────────────
  const durationExpiredGroups = await this.find({
    isDeleted: false,
    "hold.isHeld": true,
    "hold.holdType": "duration",
    "hold.holdEndDate": { $lte: now },
  });

  for (const group of durationExpiredGroups) {
    await group.releaseGroup({
      userId: null,
      reason: "فك تلقائي — انتهت مدة الـ Hold",
    });
    released.push({
      _id: group._id,
      name: group.name,
      code: group.code,
      reason: "duration_expired",
    });
  }

  // ────────────────────────────────────────────────────────────────
  // 2️⃣ until_session: لو السيشن المستهدفة مكتملة / اتحذفت / تاريخها
  //    عدى من زمان (حماية إضافية للـ attendance route)
  // ────────────────────────────────────────────────────────────────
  const untilSessionGroups = await this.find({
    isDeleted: false,
    "hold.isHeld": true,
    "hold.holdType": "until_session",
    "hold.holdUntilSessionId": { $ne: null },
  });

  for (const group of untilSessionGroups) {
    try {
      const targetSession = await mongoose
        .model("Session")
        .findById(group.hold.holdUntilSessionId)
        .select("scheduledDate status isDeleted")
        .lean();

      const shouldRelease =
        !targetSession ||
        targetSession.isDeleted ||
        targetSession.status === "completed" ||
        new Date(targetSession.scheduledDate) <
          new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      if (shouldRelease) {
        await group.releaseGroup({
          userId: null,
          reason:
            "فك تلقائي — السيشن المستهدفة انتهت أو اتحذفت",
        });
        released.push({
          _id: group._id,
          name: group.name,
          code: group.code,
          reason: "until_session_expired",
        });
      }
    } catch (err) {
      console.warn(
        `⚠️ Could not process until_session hold for group ${group._id}:`,
        err.message,
      );
    }
  }

  return { count: released.length, released };
};

const Group = mongoose.models.Group || mongoose.model("Group", groupSchema);

export default Group;