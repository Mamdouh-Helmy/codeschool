import mongoose from "mongoose";

const meetingLinkSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      required: true,
      unique: true,
    },

    // Credentials
    credentials: {
      username: String,
      password: String,
    },

    // Platform
    platform: {
      type: String,
      enum: ["zoom", "google_meet", "microsoft_teams", "other"],
      default: "zoom",
    },

    // Status
    status: {
      type: String,
      enum: ["available", "reserved", "in_use", "maintenance", "inactive"],
      default: "available",
    },

    // Settings
    capacity: {
      type: Number,
      default: 100,
    },
    durationLimit: {
      type: Number,
      default: 120,
    },

    // Scheduling
    allowedDays: [
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
    allowedTimeSlots: [
      {
        startTime: String,
        endTime: String,
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
        duration: Number,
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
      reservedAt: {
        type: Date,
        default: Date.now,
      },
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
  }
);

// ==================== INDEXES ====================
meetingLinkSchema.index({ link: 1 }, { unique: true });
meetingLinkSchema.index({ status: 1 });
meetingLinkSchema.index({ platform: 1 });
meetingLinkSchema.index({ isDeleted: 1 });
meetingLinkSchema.index({ "currentReservation.sessionId": 1 });
meetingLinkSchema.index({ "currentReservation.endTime": 1 });

// ==================== STATIC METHODS ====================

/**
 * ✅ Find available meeting links for a time slot
 */
meetingLinkSchema.statics.findAvailableLinks = async function (
  startTime,
  endTime,
  limit = 10
) {
  try {
    const now = new Date();

    // Find links that are:
    // 1. Not deleted
    // 2. Status is 'available' or 'reserved' (but reservation expired)
    // 3. Not currently reserved OR reservation ended
    const availableLinks = await this.find({
      isDeleted: false,
      status: { $in: ["available", "reserved"] },
      $or: [
        // No current reservation
        { "currentReservation.sessionId": { $exists: false } },
        { "currentReservation.sessionId": null },
        // Reservation ended
        { "currentReservation.endTime": { $lt: now } },
      ],
    })
      .sort({ "stats.totalUses": 1 }) // Prefer less-used links
      .limit(limit)
      .lean();

    console.log(`📋 Found ${availableLinks.length} available meeting links`);

    return availableLinks;
  } catch (error) {
    console.error("❌ Error finding available links:", error);
    return [];
  }
};

/**
 * ✅ Get meeting link by ID
 */
meetingLinkSchema.statics.getById = async function (linkId) {
  try {
    const link = await this.findOne({
      _id: linkId,
      isDeleted: false,
    });

    return link;
  } catch (error) {
    console.error("❌ Error getting meeting link:", error);
    return null;
  }
};

/**
 * ✅ Get all active meeting links
 */
meetingLinkSchema.statics.getAllActive = async function () {
  try {
    const links = await this.find({
      isDeleted: false,
      status: { $in: ["available", "reserved"] },
    }).sort({ name: 1 });

    return links;
  } catch (error) {
    console.error("❌ Error getting active links:", error);
    return [];
  }
};

// ==================== INSTANCE METHODS ====================

/**
 * ✅ Reserve this link for a session
 */
meetingLinkSchema.methods.reserveForSession = async function (
  sessionId,
  groupId,
  startTime,
  endTime,
  userId
) {
  try {
    console.log(`🔒 Reserving link ${this.name} for session ${sessionId}`);

    // Check if link is available
    if (this.status === "maintenance" || this.status === "inactive") {
      throw new Error(`Link is not available (status: ${this.status})`);
    }

    // Check for conflicting reservations
    if (this.currentReservation && this.currentReservation.sessionId) {
      const currentEndTime = new Date(this.currentReservation.endTime);
      if (currentEndTime > new Date()) {
        // Check if it's the same session (allow re-reservation)
        if (
          this.currentReservation.sessionId.toString() !== sessionId.toString()
        ) {
          throw new Error("Link is currently reserved for another session");
        }
      }
    }

    // Update the link with reservation
    this.currentReservation = {
      sessionId: sessionId,
      groupId: groupId,
      startTime: startTime,
      endTime: endTime,
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

/**
 * ✅ Release this link (mark as available again)
 */
meetingLinkSchema.methods.releaseLink = async function (actualDuration = null) {
  try {
    console.log(`🔓 Releasing link ${this.name}`);

    // Add to usage history if there was a reservation
    if (this.currentReservation && this.currentReservation.sessionId) {
      const usageRecord = {
        sessionId: this.currentReservation.sessionId,
        groupId: this.currentReservation.groupId,
        startTime: this.currentReservation.startTime,
        endTime: this.currentReservation.endTime,
        duration:
          actualDuration ||
          Math.round(
            (new Date(this.currentReservation.endTime) -
              new Date(this.currentReservation.startTime)) /
              60000
          ),
        usedAt: this.currentReservation.reservedAt,
      };

      this.usageHistory.push(usageRecord);

      // Update stats
      this.stats.totalUses += 1;
      this.stats.lastUsed = new Date();

      if (actualDuration) {
        this.stats.totalHours += actualDuration / 60;

        // Calculate average
        const totalMinutes = this.stats.totalHours * 60;
        this.stats.averageUsageDuration = Math.round(
          totalMinutes / this.stats.totalUses
        );
      }
    }

    // Clear reservation
    this.currentReservation = undefined;
    this.status = "available";
    this.metadata.updatedAt = new Date();

    await this.save();

    console.log(`✅ Link released and marked as available`);

    return {
      success: true,
      message: "Link released successfully",
      status: this.status,
    };
  } catch (error) {
    console.error("❌ Error releasing link:", error);
    throw error;
  }
};

/**
 * ✅ Check if link is available for a time slot
 */
meetingLinkSchema.methods.isAvailableForTimeSlot = function (
  startTime,
  endTime
) {
  if (this.status !== "available" && this.status !== "reserved") {
    return false;
  }

  // Check current reservation
  if (this.currentReservation && this.currentReservation.sessionId) {
    const reservedStart = new Date(this.currentReservation.startTime);
    const reservedEnd = new Date(this.currentReservation.endTime);

    // Check for overlap
    if (startTime < reservedEnd && endTime > reservedStart) {
      return false;
    }
  }

  return true;
};

/**
 * ✅ Get usage statistics
 */
meetingLinkSchema.methods.getUsageStats = function () {
  return {
    totalUses: this.stats.totalUses,
    totalHours: this.stats.totalHours,
    averageUsageDuration: this.stats.averageUsageDuration,
    lastUsed: this.stats.lastUsed,
    currentStatus: this.status,
    isCurrentlyReserved: !!(
      this.currentReservation && this.currentReservation.sessionId
    ),
  };
};

// ==================== MIDDLEWARE ====================

// Update timestamp on save
meetingLinkSchema.pre("save", function (next) {
  this.metadata.updatedAt = new Date();
  next();
});

// ==================== VIRTUAL PROPERTIES ====================

meetingLinkSchema.virtual("isAvailable").get(function () {
  if (this.status !== "available" && this.status !== "reserved") {
    return false;
  }

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

// ==================== JSON TRANSFORM ====================

meetingLinkSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    // Don't expose password in JSON by default
    if (ret.credentials && ret.credentials.password) {
      ret.credentials.passwordSet = true;
      delete ret.credentials.password;
    }
    return ret;
  },
});

meetingLinkSchema.set("toObject", {
  virtuals: true,
});

// Clean model registration
if (mongoose.models.MeetingLink) {
  delete mongoose.models.MeetingLink;
}

const MeetingLink = mongoose.model("MeetingLink", meetingLinkSchema);

export default MeetingLink