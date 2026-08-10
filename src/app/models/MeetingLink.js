// → app/models/MeetingLink.js  (استبدل الملف القديم بالكامل بده)
//
// ✅ التغيير الجوهري: currentReservation (object واحد) بقى reservations
// (array). السبب: object واحد يقدر يمثّل حجز جروب واحد بس في كل لحظة —
// فأي جروب تاني ياخد نفس اللينك (حتى لو مواعيده مش متعارضة فعليًا) كان
// بيكتب فوق حجز الجروب الأول ويمسحه بالكامل، وده اللي كان بيسمح بتضارب
// حقيقي بين الجروبات (لينك محجوز الأحد 1-3 يتحط تاني في نفس المعاد لجروب
// تاني، لأن الفحص كان بيقارن بس مع آخر حجز اتكتب، مش كل الحجوزات الفعلية).
import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    // sessionId تمثيلي (آخر سيشن اتحدّث بيه الحجز ده) — مش المصدر الوحيد
    // للحقيقة؛ الفحص الفعلي بيعتمد على daysOfWeek/timeFrom/timeTo
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
    daysOfWeek: [
      {
        type: String,
        enum: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      },
    ],
    timeFrom: String, // "HH:MM"
    timeTo: String,   // "HH:MM"
    // أول/آخر تاريخ فعلي لسيشن الجروب على اللينك ده — للعرض بس ("محجوز
    // لحد كذا")، مش بيُستخدم في فحص التعارض
    startTime: Date,
    endTime: Date,
    reservedAt: { type: Date, default: Date.now },
    reservedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: true }
);

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

    // ✅ NEW: كل entry = حجز جروب واحد على اللينك، وممكن يبقى فيه أكتر من
    // entry نشط في نفس الوقت طول ما مواعيدهم (أيام + وقت) مش متعارضة.
    // ده اللي بيسمح فعليًا بمشاركة نفس اللينك بين جروبات مختلفة من غير ما
    // حجز جروب يمسح حجز التاني بالغلط.
    reservations: {
      type: [reservationSchema],
      default: [],
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
meetingLinkSchema.index({ "reservations.sessionId": 1 });
meetingLinkSchema.index({ "reservations.groupId": 1 });
meetingLinkSchema.index({ "reservations.endTime": 1 });

// ==================== HELPERS ====================
/**
 * ✅ مقارنة جدول جديد مع حجز موجود بناءً على التكرار الأسبوعي (يوم + وقت)
 * مش بناءً على التاريخ المطلق
 */
function scheduleOverlaps(newSchedule, reservedDays, reservedFrom, reservedTo) {
  if (!newSchedule?.daysOfWeek?.length || !newSchedule?.timeFrom || !newSchedule?.timeTo) {
    return true; // بيانات ناقصة - تعامل بحذر
  }
  if (!reservedDays?.length || !reservedFrom || !reservedTo) {
    return true; // حجز قديم من غير بيانات تكرار - افترض تعارض للأمان
  }

  const dayOverlap = newSchedule.daysOfWeek.some((d) => reservedDays.includes(d));
  if (!dayOverlap) return false;

  const newFrom = newSchedule.timeFrom.replace(":", "");
  const newTo = newSchedule.timeTo.replace(":", "");
  const existFrom = reservedFrom.replace(":", "");
  const existTo = reservedTo.replace(":", "");

  return !(newTo <= existFrom || newFrom >= existTo);
}

/**
 * ✅ يدور جوه array الحجوزات على أول حجز (مش بتاع excludeGroupId، ولسه
 * ساري) بيتعارض فعليًا مع الجدول الجديد
 */
function findConflictingReservation(reservations, newSchedule, excludeGroupId = null) {
  const now = new Date();
  for (const res of reservations || []) {
    if (excludeGroupId && res.groupId?.toString() === excludeGroupId.toString()) continue;
    if (res.endTime && new Date(res.endTime) < now) continue; // انتهى فعليًا
    if (scheduleOverlaps(newSchedule, res.daysOfWeek, res.timeFrom, res.timeTo)) {
      return res;
    }
  }
  return null;
}

// ==================== STATIC METHODS ====================

/**
 * ✅ جلب اللينكات المتاحة فعليًا لجدول جروب جديد (بيقارن مع كل الحجوزات
 * النشطة على كل لينك، مش حجز واحد بس)
 */
meetingLinkSchema.statics.findAvailableLinksForSchedule = async function (newSchedule, limit = 50) {
  try {
    const candidates = await this.find({
      isDeleted: false,
      status: { $in: ["available", "reserved"] },
    })
      .sort({ "stats.totalUses": 1 })
      .lean();

    const available = candidates.filter(
      (link) => !findConflictingReservation(link.reservations, newSchedule),
    );

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
 * ✅ Reserve this link for a group's session(s).
 * scheduleInfo = { daysOfWeek: [...], timeFrom: "HH:MM", timeTo: "HH:MM" }
 *
 * لو الجروب ده أصلاً عنده entry على اللينك (بيستخدمه بالفعل)، الـ entry
 * بتتحدّث (union للأيام + توسيع نطاق التاريخ) بدل ما يتعمل entry جديد.
 * لو مفيش entry، بيتفحص تعارض مع أي entry تاني (لجروبات مختلفة) بس —
 * حجز نفس الجروب على نفس اللينك مش تعارض أبدًا.
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
    console.log(`🔒 Reserving link ${this.name} for group ${groupId} (session ${sessionId})`);

    if (this.status === "maintenance" || this.status === "inactive") {
      throw new Error(`Link is not available (status: ${this.status})`);
    }

    const now = new Date();
    // نظّف أي حجوزات انتهت فعليًا (endTime في الماضي) قبل أي فحص
    this.reservations = (this.reservations || []).filter(
      (r) => !r.endTime || new Date(r.endTime) >= now,
    );

    const existingIndex = this.reservations.findIndex(
      (r) => r.groupId?.toString() === groupId.toString(),
    );

    if (existingIndex === -1) {
      // جروب جديد على اللينك ده — لازم يتأكد إنه مش هيتعارض مع جروب تاني
      const conflict = findConflictingReservation(this.reservations, scheduleInfo, null);
      if (conflict) {
        throw new Error("Link is currently reserved for another group at an overlapping time");
      }

      this.reservations.push({
        groupId,
        sessionId,
        startTime,
        endTime,
        daysOfWeek: scheduleInfo?.daysOfWeek || [],
        timeFrom: scheduleInfo?.timeFrom || null,
        timeTo: scheduleInfo?.timeTo || null,
        reservedAt: new Date(),
        reservedBy: userId,
      });
    } else {
      // الجروب ده أصلاً بيستخدم اللينك — نحدّث entry بتاعه (union للأيام،
      // توسيع نطاق التاريخ) من غير فحص تعارض مع نفسه
      const existing = this.reservations[existingIndex];
      existing.daysOfWeek = Array.from(
        new Set([...(existing.daysOfWeek || []), ...(scheduleInfo?.daysOfWeek || [])]),
      );
      existing.timeFrom = scheduleInfo?.timeFrom || existing.timeFrom;
      existing.timeTo = scheduleInfo?.timeTo || existing.timeTo;
      existing.sessionId = sessionId;
      if (!existing.startTime || startTime < existing.startTime) existing.startTime = startTime;
      if (!existing.endTime || endTime > existing.endTime) existing.endTime = endTime;
      existing.reservedAt = new Date();
      existing.reservedBy = userId;
    }

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

/**
 * ✅ يفك حجز جروب معيّن بس من على اللينك — من غير ما يلمس حجوزات
 * جروبات تانية شغالة على نفس اللينك في نفس الوقت.
 */
meetingLinkSchema.methods.releaseReservation = async function (groupId, actualDuration = null) {
  try {
    console.log(`🔓 Releasing link ${this.name} for group ${groupId}`);

    const index = (this.reservations || []).findIndex(
      (r) => r.groupId?.toString() === groupId.toString(),
    );

    if (index === -1) {
      return { success: true, message: "No active reservation for this group", status: this.status };
    }

    const reservation = this.reservations[index];

    this.usageHistory.push({
      sessionId: reservation.sessionId,
      groupId: reservation.groupId,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      duration:
        actualDuration ||
        (reservation.startTime && reservation.endTime
          ? Math.round((new Date(reservation.endTime) - new Date(reservation.startTime)) / 60000)
          : 0),
      usedAt: reservation.reservedAt,
    });

    this.stats.totalUses += 1;
    this.stats.lastUsed = new Date();
    if (actualDuration) {
      this.stats.totalHours += actualDuration / 60;
      const totalMinutes = this.stats.totalHours * 60;
      this.stats.averageUsageDuration = Math.round(totalMinutes / this.stats.totalUses);
    }

    this.reservations.splice(index, 1);
    this.status = this.reservations.length > 0 ? "reserved" : "available";
    this.metadata.updatedAt = new Date();
    await this.save();

    console.log(`✅ Reservation released for group ${groupId}. Remaining active reservations: ${this.reservations.length}`);
    return {
      success: true,
      message: "Reservation released successfully",
      status: this.status,
      remainingReservations: this.reservations.length,
    };
  } catch (error) {
    console.error("❌ Error releasing reservation:", error);
    throw error;
  }
};

/**
 * ✅ يفك كل حجوزات اللينك دفعة واحدة (override إداري صريح — بيقفل كل
 * الجروبات المرتبطة باللينك ده، مش بس واحد). بيتستخدم في مسارات زي
 * "إلغاء حجز اللينكات المتاحة" في شاشة تفعيل الجروب.
 * ⚠️ لو فيه جروبات تانية شغالة فعليًا على اللينك، حجزها هيتفك برضو —
 * استخدمها بس لما تكون متأكد إن ده المطلوب فعلاً.
 */
meetingLinkSchema.methods.releaseAllReservations = async function () {
  try {
    console.log(`🔓 Force-releasing ALL reservations on link ${this.name}`);
    const now = new Date();

    for (const reservation of this.reservations || []) {
      this.usageHistory.push({
        sessionId: reservation.sessionId,
        groupId: reservation.groupId,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        duration:
          reservation.startTime && reservation.endTime
            ? Math.round((new Date(reservation.endTime) - new Date(reservation.startTime)) / 60000)
            : 0,
        usedAt: reservation.reservedAt,
      });
      this.stats.totalUses += 1;
    }
    if ((this.reservations || []).length > 0) this.stats.lastUsed = now;

    const releasedCount = (this.reservations || []).length;
    this.reservations = [];
    this.status = "available";
    this.metadata.updatedAt = now;
    await this.save();

    return {
      success: true,
      message: `Released ${releasedCount} reservation(s)`,
      status: this.status,
      releasedCount,
    };
  } catch (error) {
    console.error("❌ Error force-releasing link:", error);
    throw error;
  }
};

/**
 * ✅ فحص التوفر بناءً على جدول أسبوعي جديد (مش وقت واحد محدد)، مع
 * إمكانية استثناء جروب معين (نفس الجروب اللي بيفحص مش تعارض مع نفسه)
 */
meetingLinkSchema.methods.isAvailableForSchedule = function (newSchedule, excludeGroupId = null) {
  if (this.status === "maintenance" || this.status === "inactive") return false;
  return !findConflictingReservation(this.reservations, newSchedule, excludeGroupId);
};

/**
 * (Legacy) فحص توفر لوقت محدد - بيلف على كل الحجوزات النشطة
 */
meetingLinkSchema.methods.isAvailableForTimeSlot = function (startTime, endTime) {
  if (this.status !== "available" && this.status !== "reserved") return false;

  const now = new Date();
  const dayName = startTime.toLocaleDateString("en-US", { weekday: "long" });
  const newFrom = `${startTime.getHours().toString().padStart(2, "0")}${startTime.getMinutes().toString().padStart(2, "0")}`;
  const newTo = `${endTime.getHours().toString().padStart(2, "0")}${endTime.getMinutes().toString().padStart(2, "0")}`;

  for (const res of this.reservations || []) {
    if (res.endTime && new Date(res.endTime) < now) continue;

    if (res.daysOfWeek?.length && res.timeFrom && res.timeTo) {
      if (!res.daysOfWeek.includes(dayName)) continue;
      const existFrom = res.timeFrom.replace(":", "");
      const existTo = res.timeTo.replace(":", "");
      const overlaps = !(newTo <= existFrom || newFrom >= existTo);
      if (overlaps) return false;
      continue;
    }

    if (res.startTime && res.endTime) {
      const reservedStart = new Date(res.startTime);
      const reservedEnd = new Date(res.endTime);
      if (startTime < reservedEnd && endTime > reservedStart) return false;
    }
  }

  return true;
};

meetingLinkSchema.methods.getUsageStats = function () {
  return {
    totalUses: this.stats.totalUses,
    totalHours: this.stats.totalHours,
    averageUsageDuration: this.stats.averageUsageDuration,
    lastUsed: this.stats.lastUsed,
    currentStatus: this.status,
    activeReservationsCount: (this.reservations || []).length,
    isCurrentlyReserved: (this.reservations || []).length > 0,
  };
};

meetingLinkSchema.virtual("isAvailable").get(function () {
  if (this.status !== "available" && this.status !== "reserved") return false;
  const now = new Date();
  const activeReservations = (this.reservations || []).filter(
    (r) => !r.endTime || new Date(r.endTime) >= now,
  );
  return activeReservations.length === 0;
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