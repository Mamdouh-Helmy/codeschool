// models/MeetingLink.js - إصدار مبسط خالي من المشاكل
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
      type: Number, // in minutes
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
        startTime: String, // Format: "HH:MM"
        endTime: String, // Format: "HH:MM"
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

// ✅ إزالة جميع الـ middleware المسبب للمشكلة
// لا نستخدم أي pre أو post hooks

// ✅ إنشاء المودل بشكل نظيف
const MeetingLink = mongoose.model("MeetingLink", meetingLinkSchema);

export default MeetingLink;