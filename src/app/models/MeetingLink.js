import mongoose from "mongoose";

const meetingLinkSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    link: { type: String, required: true, unique: true },

    credentials: {
      username: String,
      password: String,
    },

    platform: {
      type: String,
      enum: ["zoom", "google_meet", "microsoft_teams", "other"],
      default: "zoom",
    },

    status: {
      type: String,
      enum: ["available", "reserved", "in_use", "maintenance", "inactive"],
      default: "available",
    },

    capacity: { type: Number, default: 100 },
    durationLimit: { type: Number, default: 120 },

    allowedDays: [
      {
        type: String,
        enum: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
      },
    ],
    allowedTimeSlots: [{ startTime: String, endTime: String }],

    usageHistory: [
      {
        sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
        startTime: Date,
        endTime: Date,
        duration: Number,
        usedAt: { type: Date, default: Date.now },
      },
    ],

    // ✅ Current Reservation
    // startTime/endTime = النطاق الكامل (أول سيشن → آخر سيشن) وده للعرض بس
    // ("محجوز لحد كذا" في الواجهة) — مش بيُستخدم للفحص الفعلي للتعارض
    // ✅ الفحص الحقيقي بيعتمد على daysOfWeek + timeFrom/timeTo (الجدول الأسبوعي المتكرر)
    currentReservation: {
      sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
      groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
      startTime: Date,
      endTime: Date,
      // ✅ NEW
      daysOfWeek: [
        {
          type: String,
          enum: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
        },
      ],
      timeFrom: String, // "HH:MM"
      timeTo: String,   // "HH:MM"
      reservedAt: { type: Date, default: Date.now },
      reservedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },

    stats: {
      totalUses: { type: Number, default: 0 },
      totalHours: { type: Number, default: 0 },
      lastUsed: Date,
      averageUsageDuration: { type: Number, default: 0 },
    },

    metadata: {
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
      notes: String,
    },

    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true }
);

meetingLinkSchema.index({ link: 1 }, { unique: true });
meetingLinkSchema.index({ status: 1 });
meetingLinkSchema.index({ platform: 1 });
meetingLinkSchema.index({ isDeleted: 1 });
meetingLinkSchema.index({ "currentReservation.sessionId": 1 });
meetingLinkSchema.index({ "currentReservation.endTime": 1 });

// ==================== HELPER ====================
/**
 * ✅ مقارنة جدول جديد مع حجز موجود بناءً على التكرار الأسبوعي (يوم + وقت)
 * مش بناءً على التاريخ المطلق
 */
function scheduleOverlaps(newSchedule, reservedDays, reservedFrom, reservedTo) {
  if (!newSchedule?.daysOfWeek?.length || !newSchedule?.timeFrom || !newSchedule?.timeTo) {
    return true; // بيانات ناقصة - تعامل بحذر
  }
  if (!reservedDays?.length || !reservedFrom || !reservedTo) {
    // حجز قديم من غير بيانات تكرار (قبل التحديث) - افترض تعارض للأمان
    return true;
  }

  const dayOverlap = newSchedule.daysOfWeek.some((d) => reservedDays.includes(d));
  if (!dayOverlap) return false;

  const newFrom = newSchedule.timeFrom.replace(":", "");
  const newTo = newSchedule.timeTo.replace(":", "");
  const existFrom = reservedFrom.replace(":", "");
  const existTo = reservedTo.replace(":", "");

  return !(newTo <= existFrom || newFrom >= existTo);
}

// ==================== STATIC METHODS ====================

/**
 * ✅ NEW: جلب اللينكات المتاحة فعليًا لجدول جروب جديد
 * (بيقارن الأيام/الساعات الأسبوعية مش التاريخ الكامل)
 */
meetingLinkSchema.statics.findAvailableLinksForSchedule = async function (newSchedule, limit = 50) {
  try {
    const now = new Date();
    const candidates = await this.find({
      isDeleted: false,
      status: { $in: ["available", "reserved"] },
    })
      .sort({ "stats.totalUses": 1 })
      .lean();

    const available = candidates.filter((link) => {
      const res = link.currentReservation;
      if (!res?.sessionId) return true;
      if (new Date(res.endTime) < now) return true;
      return !scheduleOverlaps(newSchedule, res.daysOfWeek, res.timeFrom, res.timeTo);
    });

    return available.slice(0, limit);
  } catch (error) {
    console.error("❌ Error finding schedule-available links:", error);
    return [];
  }
};

meetingLinkSchema.statics.getById = async function (linkId) {
  try {
    return await this.findOne({ _id: linkId, isDeleted: false });
  } catch (error) {
    console.error("❌ Error getting meeting link:", error);
    return null;
  }
};

meetingLinkSchema.statics.getAllActive = async function () {
  try {
    return await this.find({
      isDeleted: false,
      status: { $in: ["available", "reserved"] },
    }).sort({ name: 1 });
  } catch (error) {
    console.error("❌ Error getting active links:", error);
    return [];
  }
};

// ==================== INSTANCE METHODS ====================

/**
 * ✅ Reserve this link for a session
 * scheduleInfo = { daysOfWeek: [...], timeFrom: "HH:MM", timeTo: "HH:MM" }
 */
meetingLinkSchema.methods.reserveForSession = async function (
  sessionId,
  groupId,
  startTime,
  endTime,
  userId,
  scheduleInfo = null
) {
  try {
    console.log(`🔒 Reserving link ${this.name} for session ${sessionId}`);

    if (this.status === "maintenance" || this.status === "inactive") {
      throw new Error(`Link is not available (status: ${this.status})`);
    }

    if (this.currentReservation && this.currentReservation.sessionId) {
      const currentEndTime = new Date(this.currentReservation.endTime);
      if (currentEndTime > new Date()) {
        if (this.currentReservation.sessionId.toString() !== sessionId.toString()) {
          const realConflict = scheduleOverlaps(
            scheduleInfo,
            this.currentReservation.daysOfWeek,
            this.currentReservation.timeFrom,
            this.currentReservation.timeTo,
          );
          if (realConflict) {
            throw new Error("Link is currently reserved for another session");
          }
        }
      }
    }

    this.currentReservation = {
      sessionId,
      groupId,
      startTime,
      endTime,
      daysOfWeek: scheduleInfo?.daysOfWeek || [],
      timeFrom: scheduleInfo?.timeFrom || null,
      timeTo: scheduleInfo?.timeTo || null,
      reservedAt: new Date(),
      reservedBy: userId,
    };

    this.status = "reserved";
    this.metadata.updatedAt = new Date();
    await this.save();

    console.log(`✅ Link reserved successfully`);
    return {
      success: true,
      link: this.link,
      credentials: {
        username: this.credentials?.username,
        password: this.credentials?.password,
      },
      platform: this.platform,
      reservedUntil: endTime,
    };
  } catch (error) {
    console.error("❌ Error reserving link:", error);
    throw error;
  }
};

meetingLinkSchema.methods.releaseLink = async function (actualDuration = null) {
  try {
    console.log(`🔓 Releasing link ${this.name}`);

    if (this.currentReservation && this.currentReservation.sessionId) {
      const usageRecord = {
        sessionId: this.currentReservation.sessionId,
        groupId: this.currentReservation.groupId,
        startTime: this.currentReservation.startTime,
        endTime: this.currentReservation.endTime,
        duration:
          actualDuration ||
          Math.round(
            (new Date(this.currentReservation.endTime) - new Date(this.currentReservation.startTime)) / 60000
          ),
        usedAt: this.currentReservation.reservedAt,
      };

      this.usageHistory.push(usageRecord);
      this.stats.totalUses += 1;
      this.stats.lastUsed = new Date();

      if (actualDuration) {
        this.stats.totalHours += actualDuration / 60;
        const totalMinutes = this.stats.totalHours * 60;
        this.stats.averageUsageDuration = Math.round(totalMinutes / this.stats.totalUses);
      }
    }

    this.currentReservation = undefined;
    this.status = "available";
    this.metadata.updatedAt = new Date();
    await this.save();

    console.log(`✅ Link released and marked as available`);
    return { success: true, message: "Link released successfully", status: this.status };
  } catch (error) {
    console.error("❌ Error releasing link:", error);
    throw error;
  }
};

/**
 * ✅ NEW: فحص التوفر بناءً على جدول أسبوعي جديد (مش وقت واحد محدد)
 */
meetingLinkSchema.methods.isAvailableForSchedule = function (newSchedule) {
  if (this.status === "maintenance" || this.status === "inactive") return false;

  const res = this.currentReservation;
  if (!res || !res.sessionId) return true;

  const now = new Date();
  if (new Date(res.endTime) < now) return true;

  return !scheduleOverlaps(newSchedule, res.daysOfWeek, res.timeFrom, res.timeTo);
};

/**
 * (Legacy) فحص توفر لوقت محدد - بقى بياخد بالباله الجدول المتكرر لو موجود
 */
meetingLinkSchema.methods.isAvailableForTimeSlot = function (startTime, endTime) {
  if (this.status !== "available" && this.status !== "reserved") return false;

  const res = this.currentReservation;
  if (!res || !res.sessionId) return true;

  const now = new Date();
  if (new Date(res.endTime) < now) return true;

  if (res.daysOfWeek?.length && res.timeFrom && res.timeTo) {
    const dayName = startTime.toLocaleDateString("en-US", { weekday: "long" });
    if (!res.daysOfWeek.includes(dayName)) return true;

    const newFrom = `${startTime.getHours().toString().padStart(2, "0")}${startTime.getMinutes().toString().padStart(2, "0")}`;
    const newTo = `${endTime.getHours().toString().padStart(2, "0")}${endTime.getMinutes().toString().padStart(2, "0")}`;
    const existFrom = res.timeFrom.replace(":", "");
    const existTo = res.timeTo.replace(":", "");

    return newTo <= existFrom || newFrom >= existTo;
  }

  // fallback لحجوزات قديمة من غير بيانات تكرار
  const reservedStart = new Date(res.startTime);
  const reservedEnd = new Date(res.endTime);
  return !(startTime < reservedEnd && endTime > reservedStart);
};

meetingLinkSchema.methods.getUsageStats = function () {
  return {
    totalUses: this.stats.totalUses,
    totalHours: this.stats.totalHours,
    averageUsageDuration: this.stats.averageUsageDuration,
    lastUsed: this.stats.lastUsed,
    currentStatus: this.status,
    isCurrentlyReserved: !!(this.currentReservation && this.currentReservation.sessionId),
  };
};

meetingLinkSchema.virtual("isAvailable").get(function () {
  if (this.status !== "available" && this.status !== "reserved") return false;
  if (this.currentReservation && this.currentReservation.sessionId) {
    const now = new Date();
    const reservedEnd = new Date(this.currentReservation.endTime);
    return reservedEnd < now;
  }
  return true;
});

meetingLinkSchema.virtual("displayName").get(function () {
  return `${this.name} (${this.platform})`;
});

meetingLinkSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    if (ret.credentials && ret.credentials.password) {
      ret.credentials.passwordSet = true;
      delete ret.credentials.password;
    }
    return ret;
  },
});

meetingLinkSchema.set("toObject", { virtuals: true });

if (mongoose.models.MeetingLink) {
  delete mongoose.models.MeetingLink;
}

const MeetingLink = mongoose.model("MeetingLink", meetingLinkSchema);
export default MeetingLink;