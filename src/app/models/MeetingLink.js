// models/MeetingLink.js
import mongoose from "mongoose";

const meetingLinkSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Credentials for meeting access
    credentials: {
      username: {
        type: String,
        required: true,
        trim: true,
      },
      password: {
        type: String,
        required: true,
      },
    },
    
    // Meeting Platform
    platform: {
      type: String,
      enum: ["zoom", "google_meet", "microsoft_teams", "other"],
      default: "zoom",
    },
    
    // Availability Status
    status: {
      type: String,
      enum: ["available", "reserved", "in_use", "maintenance"],
      default: "available",
    },
    
    // Capacity and Settings
    capacity: {
      type: Number,
      default: 100,
      min: 1,
    },
    
    durationLimit: {
      type: Number, // in minutes
      default: 120,
      min: 30,
    },
    
    // Scheduling Restrictions
    allowedDays: {
      type: [String],
      enum: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      default: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
    },
    
    allowedTimeSlots: [
      {
        startTime: String, // Format: "08:00"
        endTime: String,   // Format: "22:00"
      },
    ],
    
    // Usage Tracking
    usageHistory: [
      {
        sessionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Session",
        },
        groupId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Group",
        },
        startTime: Date,
        endTime: Date,
        duration: Number, // in minutes
        usedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    
    // Current Reservation
    currentReservation: {
      sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Session",
      },
      groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
      },
      startTime: Date,
      endTime: Date,
      reservedAt: Date,
      reservedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    
    // Statistics
    stats: {
      totalUses: {
        type: Number,
        default: 0,
      },
      totalHours: {
        type: Number,
        default: 0,
      },
      lastUsed: Date,
      averageUsageDuration: {
        type: Number,
        default: 0,
      },
    },
    
    // Metadata
    metadata: {
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
      notes: String,
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ==================== MIDDLEWARE ====================

// Update updatedAt timestamp before saving
meetingLinkSchema.pre("save", function (next) {
  if (this.metadata) {
    this.metadata.updatedAt = new Date();
  } else {
    this.metadata = { updatedAt: new Date() };
  }
  next();
});

// Prevent deletion queries from returning deleted links
meetingLinkSchema.pre(/^find/, function () {
  this.where({ isDeleted: false });
});

// ==================== VIRTUAL PROPERTIES ====================

// Check if link is currently available
meetingLinkSchema.virtual("isAvailable").get(function () {
  return this.status === "available";
});

// Get upcoming reservation
meetingLinkSchema.virtual("nextReservation").get(function () {
  if (this.currentReservation?.startTime) {
    return this.currentReservation.startTime > new Date()
      ? this.currentReservation
      : null;
  }
  return null;
});

// Get current usage status
meetingLinkSchema.virtual("isInUse").get(function () {
  if (!this.currentReservation?.startTime || !this.currentReservation?.endTime)
    return false;

  const now = new Date();
  return (
    now >= this.currentReservation.startTime &&
    now <= this.currentReservation.endTime
  );
});

// Get usage percentage
meetingLinkSchema.virtual("usagePercentage").get(function () {
  if (!this.stats?.totalUses || this.stats.totalUses === 0) return 0;
  
  // Assuming 30 days per month, 8 hours per day maximum
  const maxPossibleHours = 30 * 8;
  const totalHours = this.stats.totalHours || 0;
  return Math.min(100, (totalHours / maxPossibleHours) * 100);
});

// ==================== METHODS ====================

/**
 * Reserve link for a session
 * @param {ObjectId} sessionId - The session ID
 * @param {ObjectId} groupId - The group ID
 * @param {Date} startTime - Session start time
 * @param {Date} endTime - Session end time
 * @param {ObjectId} userId - User ID who is reserving
 * @returns {Object} Reservation result
 */
meetingLinkSchema.methods.reserveForSession = async function (
  sessionId,
  groupId,
  startTime,
  endTime,
  userId
) {
  if (this.status !== "available") {
    throw new Error(`Meeting link is not available. Current status: ${this.status}`);
  }

  // Validate time slot
  const start = new Date(startTime);
  const end = new Date(endTime);
  const duration = (end - start) / (1000 * 60); // in minutes

  if (duration > this.durationLimit) {
    throw new Error(
      `Session duration (${duration} minutes) exceeds link limit (${this.durationLimit} minutes)`
    );
  }

  // Check day restriction
  const dayName = start.toLocaleDateString("en-US", { weekday: "long" });
  if (!this.allowedDays.includes(dayName)) {
    throw new Error(`Link not available on ${dayName}`);
  }

  // Check time slot restriction
  if (this.allowedTimeSlots && this.allowedTimeSlots.length > 0) {
    const sessionStartTime = start.toTimeString().slice(0, 5);
    const sessionEndTime = end.toTimeString().slice(0, 5);
    
    const isAllowed = this.allowedTimeSlots.some(slot => {
      return sessionStartTime >= slot.startTime && sessionEndTime <= slot.endTime;
    });
    
    if (!isAllowed) {
      throw new Error(`Session time not within allowed time slots`);
    }
  }

  // Reserve the link
  this.status = "reserved";
  this.currentReservation = {
    sessionId,
    groupId,
    startTime: start,
    endTime: end,
    reservedAt: new Date(),
    reservedBy: userId,
  };

  await this.save();
  
  return {
    success: true,
    message: "Link reserved successfully",
    link: this.link,
    credentials: this.credentials,
    reservation: this.currentReservation,
  };
};

/**
 * Release link after session
 * @param {number} actualDuration - Actual duration in minutes
 * @returns {Object} Release result
 */
meetingLinkSchema.methods.releaseLink = async function (actualDuration) {
  if (!this.currentReservation) {
    throw new Error("No active reservation to release");
  }

  // Record usage
  const usageRecord = {
    sessionId: this.currentReservation.sessionId,
    groupId: this.currentReservation.groupId,
    startTime: this.currentReservation.startTime,
    endTime: this.currentReservation.endTime,
    duration: actualDuration || 120, // default 2 hours
    usedAt: new Date(),
  };

  // Add to usage history
  if (!this.usageHistory) {
    this.usageHistory = [];
  }
  this.usageHistory.push(usageRecord);

  // Update stats
  if (!this.stats) {
    this.stats = {
      totalUses: 0,
      totalHours: 0,
      averageUsageDuration: 0,
    };
  }

  this.stats.totalUses += 1;
  const hoursToAdd = (actualDuration || 120) / 60;
  this.stats.totalHours += hoursToAdd;
  this.stats.lastUsed = new Date();
  
  // Calculate new average
  this.stats.averageUsageDuration = 
    this.stats.totalHours * 60 / this.stats.totalUses;

  // Clear reservation
  this.status = "available";
  this.currentReservation = null;

  await this.save();
  
  return {
    success: true,
    message: "Link released successfully",
    usageRecord,
  };
};

/**
 * Check availability for a time slot
 * @param {Date} startTime - Start time
 * @param {Date} endTime - End time
 * @returns {Object} Availability check result
 */
meetingLinkSchema.methods.checkAvailability = function (startTime, endTime) {
  if (this.status !== "available") {
    return {
      available: false,
      reason: `Link is ${this.status}`,
    };
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  const duration = (end - start) / (1000 * 60);

  // Check duration limit
  if (duration > this.durationLimit) {
    return {
      available: false,
      reason: `Duration exceeds limit (${duration} > ${this.durationLimit} minutes)`,
    };
  }

  // Check day restriction
  const dayName = start.toLocaleDateString("en-US", { weekday: "long" });
  if (!this.allowedDays.includes(dayName)) {
    return {
      available: false,
      reason: `Not available on ${dayName}`,
    };
  }

  // Check time slot restriction
  if (this.allowedTimeSlots && this.allowedTimeSlots.length > 0) {
    const sessionStartTime = start.toTimeString().slice(0, 5);
    const sessionEndTime = end.toTimeString().slice(0, 5);
    
    const isAllowed = this.allowedTimeSlots.some(slot => {
      return sessionStartTime >= slot.startTime && sessionEndTime <= slot.endTime;
    });
    
    if (!isAllowed) {
      return {
        available: false,
        reason: `Time slot not allowed`,
        allowedSlots: this.allowedTimeSlots,
      };
    }
  }

  return {
    available: true,
    duration: duration,
    withinLimits: duration <= this.durationLimit,
    dayAllowed: true,
    timeSlotAllowed: true,
  };
};

/**
 * Get usage statistics
 * @returns {Object} Usage statistics
 */
meetingLinkSchema.methods.getUsageStats = function () {
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recentUses = (this.usageHistory || []).filter(
    (use) => new Date(use.usedAt) >= thirtyDaysAgo
  );

  const usageByDay = {};
  recentUses.forEach((use) => {
    const day = new Date(use.usedAt).toLocaleDateString();
    usageByDay[day] = (usageByDay[day] || 0) + 1;
  });

  return {
    totalUses: this.stats?.totalUses || 0,
    totalHours: (this.stats?.totalHours || 0).toFixed(2),
    averageDuration: (this.stats?.averageUsageDuration || 0).toFixed(2),
    usagePercentage: this.usagePercentage.toFixed(2),
    recentUses: recentUses.length,
    usageByDay,
    lastUsed: this.stats?.lastUsed,
    currentStatus: this.status,
    nextReservation: this.nextReservation,
    isInUse: this.isInUse,
  };
};

// ==================== STATIC METHODS ====================

/**
 * Find available meeting links for a time slot
 * @param {Date} startTime - Session start time
 * @param {Date} endTime - Session end time
 * @param {number} limit - Maximum number of links to return
 * @returns {Array} Available meeting links
 */
meetingLinkSchema.statics.findAvailableLinks = async function (
  startTime,
  endTime,
  limit = 5
) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const dayName = start.toLocaleDateString("en-US", { weekday: "long" });
  const duration = (end - start) / (1000 * 60);

  // Find links that are available and match criteria
  const availableLinks = await this.find({
    status: "available",
    isDeleted: false,
    durationLimit: { $gte: duration },
    allowedDays: dayName,
  });

  // Filter by time slots if specified
  const filteredLinks = availableLinks.filter((link) => {
    if (!link.allowedTimeSlots || link.allowedTimeSlots.length === 0) return true;

    const sessionStartTime = start.toTimeString().slice(0, 5);
    const sessionEndTime = end.toTimeString().slice(0, 5);

    return link.allowedTimeSlots.some((slot) => {
      return (
        sessionStartTime >= slot.startTime && sessionEndTime <= slot.endTime
      );
    });
  });

  // Sort by usage (prefer less used links)
  return filteredLinks
    .sort((a, b) => (a.stats?.totalUses || 0) - (b.stats?.totalUses || 0))
    .slice(0, limit);
};

/**
 * Get link usage report
 * @param {Date} startDate - Report start date
 * @param {Date} endDate - Report end date
 * @returns {Object} Usage report
 */
meetingLinkSchema.statics.getUsageReport = async function (startDate, endDate) {
  const links = await this.find({ isDeleted: false }).lean();

  const report = {
    totalLinks: links.length,
    availableLinks: links.filter((l) => l.status === "available").length,
    reservedLinks: links.filter((l) => l.status === "reserved").length,
    inUseLinks: links.filter((l) => {
      if (!l.currentReservation) return false;
      const now = new Date();
      return (
        now >= new Date(l.currentReservation.startTime) &&
        now <= new Date(l.currentReservation.endTime)
      );
    }).length,
    totalUsage: {
      sessions: 0,
      hours: 0,
    },
    platformDistribution: {},
    dailyUsage: {},
  };

  links.forEach((link) => {
    // Platform distribution
    const platform = link.platform || "other";
    report.platformDistribution[platform] =
      (report.platformDistribution[platform] || 0) + 1;

    // Total usage
    report.totalUsage.sessions += link.stats?.totalUses || 0;
    report.totalUsage.hours += link.stats?.totalHours || 0;

    // Filter usage by date range if provided
    if (startDate && endDate) {
      const filteredHistory = (link.usageHistory || []).filter((use) => {
        const useDate = new Date(use.usedAt);
        return useDate >= new Date(startDate) && useDate <= new Date(endDate);
      });

      filteredHistory.forEach((use) => {
        const day = new Date(use.usedAt).toLocaleDateString();
        report.dailyUsage[day] = (report.dailyUsage[day] || 0) + 1;
      });
    } else {
      (link.usageHistory || []).forEach((use) => {
        const day = new Date(use.usedAt).toLocaleDateString();
        report.dailyUsage[day] = (report.dailyUsage[day] || 0) + 1;
      });
    }
  });

  // Calculate averages
  report.averageUsagePerLink = {
    sessions: links.length > 0 ? (report.totalUsage.sessions / links.length).toFixed(2) : "0.00",
    hours: links.length > 0 ? (report.totalUsage.hours / links.length).toFixed(2) : "0.00",
  };

  return report;
};

/**
 * Reserve a link for a session (auto-select)
 * @param {ObjectId} sessionId - Session ID
 * @param {ObjectId} groupId - Group ID
 * @param {Date} startTime - Start time
 * @param {Date} endTime - End time
 * @param {ObjectId} userId - User ID
 * @param {string} platform - Preferred platform
 * @returns {Object} Reservation result
 */
meetingLinkSchema.statics.reserveLinkForSession = async function (
  sessionId,
  groupId,
  startTime,
  endTime,
  userId,
  platform = null
) {
  const query = {
    status: "available",
    isDeleted: false,
  };

  if (platform) {
    query.platform = platform;
  }

  const availableLinks = await this.find(query);

  if (availableLinks.length === 0) {
    throw new Error("No available meeting links found");
  }

  // Find the best link (least used)
  const bestLink = availableLinks.sort(
    (a, b) => (a.stats?.totalUses || 0) - (b.stats?.totalUses || 0)
  )[0];

  try {
    const result = await bestLink.reserveForSession(
      sessionId,
      groupId,
      startTime,
      endTime,
      userId
    );
    
    return {
      success: true,
      linkId: bestLink._id,
      ...result,
    };
  } catch (error) {
    throw new Error(`Failed to reserve link: ${error.message}`);
  }
};

/**
 * Release all expired reservations
 * @returns {Object} Release results
 */
meetingLinkSchema.statics.releaseExpiredReservations = async function () {
  const now = new Date();
  
  const linksWithReservations = await this.find({
    status: "reserved",
    "currentReservation.endTime": { $lt: now },
    isDeleted: false,
  });

  const results = [];

  for (const link of linksWithReservations) {
    try {
      const result = await link.releaseLink();
      results.push({
        linkId: link._id,
        success: true,
        ...result,
      });
    } catch (error) {
      results.push({
        linkId: link._id,
        success: false,
        error: error.message,
      });
    }
  }

  return {
    totalProcessed: linksWithReservations.length,
    released: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
};

// ==================== INDEXES ====================

meetingLinkSchema.index({ status: 1 });
meetingLinkSchema.index({ platform: 1 });
meetingLinkSchema.index({ "currentReservation.sessionId": 1 });
meetingLinkSchema.index({ "currentReservation.groupId": 1 });
meetingLinkSchema.index({ "metadata.createdAt": -1 });
meetingLinkSchema.index({ "stats.lastUsed": -1 });
meetingLinkSchema.index({ link: 1 }, { unique: true });
meetingLinkSchema.index({ name: 1 });
meetingLinkSchema.index({ isDeleted: 1 });

// ==================== MODEL CREATION ====================

// Check if model already exists to prevent OverwriteModelError
let MeetingLink;

try {
  // Try to get existing model
  MeetingLink = mongoose.model("MeetingLink");
} catch {
  // Create new model if it doesn't exist
  MeetingLink = mongoose.model("MeetingLink", meetingLinkSchema);
}

export default MeetingLink;