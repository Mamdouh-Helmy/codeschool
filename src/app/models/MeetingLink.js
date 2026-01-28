// models/MeetingLink.js - الإصاح النهائي مع جميع التوابع المطلوبة
import mongoose from "mongoose";

const meetingLinkSchema = new mongoose.Schema({
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
    password: String
  },
  
  // Platform
  platform: {
    type: String,
    enum: ["zoom", "google_meet", "microsoft_teams", "other"],
    default: "zoom"
  },
  
  // Status
  status: {
    type: String,
    enum: ["active", "inactive", "maintenance", "reserved"],
    default: "active"
  },
  
  // Settings
  capacity: {
    type: Number,
    default: 100
  },
  durationLimit: {
    type: Number, // in minutes
    default: 120
  },
  
  // Scheduling
  allowedDays: [{
    type: String,
    enum: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  }],
  
  allowedTimeSlots: [{
    startTime: String, // Format: "HH:MM"
    endTime: String    // Format: "HH:MM"
  }],
  
  // Usage Tracking
  usageHistory: [{
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session"
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group"
    },
    startTime: Date,
    endTime: Date,
    duration: Number, // in minutes
    usedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Current Reservation
  currentReservation: {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session"
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group"
    },
    startTime: Date,
    endTime: Date,
    reservedAt: {
      type: Date,
      default: Date.now
    },
    reservedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  
  // Statistics
  stats: {
    totalUses: {
      type: Number,
      default: 0
    },
    totalHours: {
      type: Number,
      default: 0
    },
    lastUsed: Date,
    averageUsageDuration: {
      type: Number,
      default: 0
    }
  },
  
  // Metadata
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    notes: String
  },
  
  // Soft Delete
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date
}, {
  timestamps: true
});

// ==================== MIDDLEWARE ====================

// Update timestamp
meetingLinkSchema.pre("save", function (next) {
  if (this.isModified()) {
    this.metadata.updatedAt = new Date();
  }
  next();
});

// Soft delete filter
meetingLinkSchema.pre("find", function () {
  this.where({ isDeleted: false });
});

meetingLinkSchema.pre("findOne", function () {
  this.where({ isDeleted: false });
});

// ==================== STATIC METHODS ====================

/**
 * ✅ Find available meeting links for a time slot
 */
meetingLinkSchema.statics.findAvailableLinks = async function (startTime, endTime, limit = 10) {
  try {
    const availableLinks = [];
    const allLinks = await this.find({
      status: "active",
      isDeleted: false
    }).lean();

    for (const link of allLinks) {
      const isAvailable = await this.checkLinkAvailability(link._id, startTime, endTime);
      
      if (isAvailable) {
        // Check time slot restrictions
        let passesTimeRestriction = true;
        
        if (link.allowedTimeSlots && link.allowedTimeSlots.length > 0) {
          const sessionStartHour = startTime.getHours();
          const sessionStartMinute = startTime.getMinutes();
          const sessionStartTimeStr = `${sessionStartHour.toString().padStart(2, '0')}:${sessionStartMinute.toString().padStart(2, '0')}`;
          
          passesTimeRestriction = link.allowedTimeSlots.some(slot => {
            return sessionStartTimeStr >= slot.startTime && sessionStartTimeStr <= slot.endTime;
          });
        }
        
        // Check day restriction
        let passesDayRestriction = true;
        
        if (link.allowedDays && link.allowedDays.length > 0) {
          const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          const sessionDay = dayNames[startTime.getDay()];
          passesDayRestriction = link.allowedDays.includes(sessionDay);
        }
        
        if (passesTimeRestriction && passesDayRestriction) {
          // Calculate usage score (prefer less used links)
          const usageScore = link.stats?.totalUses || 0;
          
          availableLinks.push({
            ...link,
            usageScore,
            lastUsed: link.stats?.lastUsed || null,
            averageUsageDuration: link.stats?.averageUsageDuration || 0
          });
        }
      }
      
      if (availableLinks.length >= limit) break;
    }

    // Sort by usage (least used first)
    return availableLinks.sort((a, b) => a.usageScore - b.usageScore);
  } catch (error) {
    console.error("❌ Error finding available links:", error);
    return [];
  }
};

/**
 * ✅ Check if a specific link is available for a time slot
 */
meetingLinkSchema.statics.checkLinkAvailability = async function (linkId, startTime, endTime) {
  try {
    const link = await this.findById(linkId);
    
    if (!link || link.status !== "active" || link.isDeleted) {
      return false;
    }

    // Check if currently reserved
    if (link.currentReservation && link.currentReservation.sessionId) {
      const reservationStart = new Date(link.currentReservation.startTime);
      const reservationEnd = new Date(link.currentReservation.endTime);
      
      // Check for overlap
      const hasOverlap = (
        (startTime >= reservationStart && startTime < reservationEnd) ||
        (endTime > reservationStart && endTime <= reservationEnd) ||
        (startTime <= reservationStart && endTime >= reservationEnd)
      );
      
      if (hasOverlap) {
        return false;
      }
    }

    // Check duration limit
    const durationMinutes = (endTime - startTime) / (1000 * 60);
    if (link.durationLimit && durationMinutes > link.durationLimit) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Error checking link availability:", error);
    return false;
  }
};

/**
 * ✅ Find available meeting links for a session
 */
meetingLinkSchema.statics.findLinksForSession = async function (sessionId) {
  try {
    const Session = mongoose.model("Session");
    const session = await Session.findById(sessionId);
    
    if (!session) {
      return [];
    }

    const startTime = new Date(session.scheduledDate);
    const [hours, minutes] = session.startTime.split(":").map(Number);
    startTime.setHours(hours, minutes, 0, 0);

    const endTime = new Date(startTime);
    const [endHours, endMinutes] = session.endTime.split(":").map(Number);
    endTime.setHours(endHours, endMinutes, 0, 0);

    return await this.findAvailableLinks(startTime, endTime);
  } catch (error) {
    console.error("❌ Error finding links for session:", error);
    return [];
  }
};

// ==================== METHODS ====================

/**
 * ✅ Reserve this link for a session
 */
meetingLinkSchema.methods.reserveForSession = async function (sessionId, groupId, startTime, endTime, userId) {
  try {
    const isAvailable = await this.constructor.checkLinkAvailability(this._id, startTime, endTime);
    
    if (!isAvailable) {
      throw new Error("Link is not available for the requested time slot");
    }

    // Calculate duration
    const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));

    // Update current reservation
    this.currentReservation = {
      sessionId,
      groupId,
      startTime,
      endTime,
      reservedAt: new Date(),
      reservedBy: userId
    };

    // Update statistics
    this.stats.totalUses = (this.stats.totalUses || 0) + 1;
    this.stats.totalHours = (this.stats.totalHours || 0) + (durationMinutes / 60);
    this.stats.lastUsed = new Date();
    
    // Calculate average usage duration
    if (this.stats.totalUses > 0) {
      this.stats.averageUsageDuration = this.stats.totalHours / this.stats.totalUses;
    }

    await this.save();

    return {
      success: true,
      link: this.link,
      credentials: this.credentials,
      reservation: this.currentReservation,
      message: "Link reserved successfully"
    };
  } catch (error) {
    console.error("❌ Error reserving link:", error);
    throw error;
  }
};

/**
 * ✅ Release this link from reservation
 */
meetingLinkSchema.methods.releaseLink = async function (actualDurationMinutes = null) {
  try {
    if (!this.currentReservation || !this.currentReservation.sessionId) {
      console.log("⚠️ Link is not currently reserved");
      return { success: true, message: "Link was not reserved" };
    }

    const sessionId = this.currentReservation.sessionId;
    const startTime = this.currentReservation.startTime;
    const endTime = this.currentReservation.endTime;

    // Calculate actual duration if not provided
    let durationMinutes = actualDurationMinutes;
    if (!durationMinutes && startTime && endTime) {
      durationMinutes = Math.round((new Date(endTime) - new Date(startTime)) / (1000 * 60));
    }

    // Add to usage history
    this.usageHistory.push({
      sessionId,
      groupId: this.currentReservation.groupId,
      startTime,
      endTime,
      duration: durationMinutes || 120,
      usedAt: new Date()
    });

    // Clear current reservation
    this.currentReservation = null;

    await this.save();

    return {
      success: true,
      sessionId,
      releasedAt: new Date(),
      durationMinutes: durationMinutes || 120,
      message: "Link released successfully"
    };
  } catch (error) {
    console.error("❌ Error releasing link:", error);
    throw error;
  }
};

/**
 * ✅ Check if link is currently available
 */
meetingLinkSchema.methods.isCurrentlyAvailable = function () {
  if (this.status !== "active" || this.isDeleted) {
    return false;
  }

  if (!this.currentReservation || !this.currentReservation.sessionId) {
    return true;
  }

  const now = new Date();
  const reservationEnd = new Date(this.currentReservation.endTime);

  return now > reservationEnd;
};

/**
 * ✅ Get next available time slot
 */
meetingLinkSchema.methods.getNextAvailableSlot = function () {
  if (!this.currentReservation || !this.currentReservation.sessionId) {
    return new Date(); // Available now
  }

  const reservationEnd = new Date(this.currentReservation.endTime);
  
  // Add 15 minutes buffer
  const nextAvailable = new Date(reservationEnd.getTime() + 15 * 60000);
  
  return nextAvailable;
};

/**
 * ✅ Get link usage statistics
 */
meetingLinkSchema.methods.getUsageStats = function () {
  return {
    totalUses: this.stats.totalUses || 0,
    totalHours: this.stats.totalHours || 0,
    lastUsed: this.stats.lastUsed,
    averageUsageDuration: this.stats.averageUsageDuration || 0,
    usageHistoryCount: this.usageHistory.length,
    currentReservation: this.currentReservation,
    isCurrentlyAvailable: this.isCurrentlyAvailable(),
    nextAvailableSlot: this.getNextAvailableSlot()
  };
};

/**
 * ✅ Update link status
 */
meetingLinkSchema.methods.updateStatus = async function (newStatus, notes = null) {
  this.status = newStatus;
  
  if (notes) {
    this.metadata.notes = notes;
  }
  
  this.metadata.updatedAt = new Date();
  
  await this.save();
  
  return {
    success: true,
    status: this.status,
    updatedAt: this.metadata.updatedAt
  };
};

/**
 * ✅ Add time slot restrictions
 */
meetingLinkSchema.methods.addTimeSlot = async function (startTime, endTime) {
  if (!this.allowedTimeSlots) {
    this.allowedTimeSlots = [];
  }

  this.allowedTimeSlots.push({
    startTime,
    endTime
  });

  await this.save();

  return {
    success: true,
    timeSlots: this.allowedTimeSlots,
    count: this.allowedTimeSlots.length
  };
};

/**
 * ✅ Add day restrictions
 */
meetingLinkSchema.methods.addAllowedDay = async function (day) {
  if (!this.allowedDays) {
    this.allowedDays = [];
  }

  const validDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  if (!validDays.includes(day)) {
    throw new Error(`Invalid day: ${day}. Must be one of: ${validDays.join(", ")}`);
  }

  if (!this.allowedDays.includes(day)) {
    this.allowedDays.push(day);
  }

  await this.save();

  return {
    success: true,
    allowedDays: this.allowedDays,
    count: this.allowedDays.length
  };
};

// ==================== VIRTUAL PROPERTIES ====================

meetingLinkSchema.virtual("isReserved").get(function () {
  return !!(this.currentReservation && this.currentReservation.sessionId);
});

meetingLinkSchema.virtual("reservationDetails").get(function () {
  if (!this.currentReservation) return null;
  
  return {
    sessionId: this.currentReservation.sessionId,
    groupId: this.currentReservation.groupId,
    startTime: this.currentReservation.startTime,
    endTime: this.currentReservation.endTime,
    reservedAt: this.currentReservation.reservedAt,
    reservedBy: this.currentReservation.reservedBy
  };
});

meetingLinkSchema.virtual("usageSummary").get(function () {
  return {
    totalUses: this.stats.totalUses || 0,
    totalHours: this.stats.totalHours || 0,
    averageDuration: this.stats.averageUsageDuration || 0,
    lastUsed: this.stats.lastUsed,
    isActive: this.status === "active",
    isReserved: this.isReserved
  };
});

// ==================== INDEXES ====================

meetingLinkSchema.index({ link: 1 }, { unique: true });
meetingLinkSchema.index({ status: 1 });
meetingLinkSchema.index({ platform: 1 });
meetingLinkSchema.index({ "currentReservation.sessionId": 1 });
meetingLinkSchema.index({ "metadata.createdAt": -1 });
meetingLinkSchema.index({ isDeleted: 1 });

// ==================== JSON TRANSFORM ====================

meetingLinkSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    // Remove sensitive/technical fields
    delete ret.__v;
    delete ret.isDeleted;
    delete ret.deletedAt;
    
    // Mask password in credentials
    if (ret.credentials && ret.credentials.password) {
      ret.credentials.password = "••••••••";
    }
    
    return ret;
  }
});

meetingLinkSchema.set("toObject", {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    delete ret.isDeleted;
    delete ret.deletedAt;
    
    if (ret.credentials && ret.credentials.password) {
      ret.credentials.password = "••••••••";
    }
    
    return ret;
  }
});

// Clean model registration
if (mongoose.models.MeetingLink) {
  delete mongoose.models.MeetingLink;
}

const MeetingLink = mongoose.model("MeetingLink", meetingLinkSchema);

export default MeetingLink;