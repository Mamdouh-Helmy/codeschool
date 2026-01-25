// models/Group.js - FIXED VERSION
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

    // Course Information
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    courseSnapshot: {
      type: Object,
      required: true,
    },

    // People
    instructors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
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
      daysOfWeek: {
        type: [
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
        validate: {
          validator: function (days) {
            // ✅ Must have exactly 3 days
            if (!days || days.length !== 3) {
              return false;
            }

            // ✅ Check if first day matches startDate
            if (this.startDate) {
              const startDayIndex = new Date(this.startDate).getDay();
              const dayNames = [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ];
              const expectedFirstDay = dayNames[startDayIndex];

              if (!days.includes(expectedFirstDay)) {
                return false;
              }
            }

            return true;
          },
          message:
            "Must select exactly 3 days, and first day must match the start date day",
        },
      },
      timeFrom: {
        type: String,
        required: true,
      },
      timeTo: {
        type: String,
        required: true,
      },
      timezone: {
        type: String,
        default: "Africa/Cairo",
      },
    },

    // Pricing
    pricing: {
      price: {
        type: Number,
        required: true,
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
        },
        amountPerInstallment: {
          type: Number,
          default: 0,
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

    // 📈 NEW: Marketing Automation Metadata
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
      campaigns: [
        {
          campaignId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MarketingCampaign",
          },
          campaignName: String,
          triggeredAt: Date,
          results: {
            totalStudents: Number,
            messagesSent: Number,
            responsesReceived: Number,
            conversions: Number,
            revenueGenerated: Number,
          },
        },
      ],
      settings: {
        followupDelayHours: {
          type: Number,
          default: 24,
        },
        maxRetries: {
          type: Number,
          default: 3,
        },
        autoGenerateOffers: {
          type: Boolean,
          default: true,
        },
        aiMessageGeneration: {
          type: Boolean,
          default: true,
        },
        segmentationRules: {
          starStudentThreshold: {
            type: Number,
            default: 4.5,
          },
          atRiskAttendanceThreshold: {
            type: Number,
            default: 70,
          },
          highPriorityCategories: {
            type: [String],
            default: ["at_risk", "needs_repeat"],
          },
        },
      },
      stats: {
        totalMarketingActions: Number,
        successfulActions: Number,
        conversionRate: Number,
        totalRevenue: Number,
        lastCampaignRun: Date,
      },
    },

    // Metadata
    metadata: {
      // Basic Metadata
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
      deletedAt: Date,

      // Completion Metadata
      completedAt: Date,
      completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      // Student Evaluations Metadata
      evaluationsEnabled: {
        type: Boolean,
        default: false,
      },
      evaluationsEnabledAt: Date,
      evaluationsEnabledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      evaluationsCompleted: {
        type: Boolean,
        default: false,
      },
      evaluationsCompletedAt: Date,
      evaluationsCompletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      evaluationSummary: {
        totalStudents: Number,
        evaluatedStudents: Number,
        pendingStudents: Number,
        passCount: Number,
        reviewCount: Number,
        repeatCount: Number,
        averageOverallScore: Number,
        categories: {
          ready_for_next_level: Number,
          needs_support: Number,
          needs_repeat: Number,
          at_risk: Number,
          star_student: Number,
        },
        completedAt: Date,
      },

      // Completion Messages Tracking
      completionMessagesSent: {
        type: Boolean,
        default: false,
      },
      completionMessagesSentAt: Date,
      completionMessagesResults: [
        {
          studentId: mongoose.Schema.Types.ObjectId,
          studentName: String,
          whatsappNumber: String,
          status: {
            type: String,
            enum: ["sent", "failed", "pending"],
          },
          customMessage: Boolean,
          hasFeedbackLink: Boolean,
          messagePreview: String,
          reason: String,
          error: String,
          sentAt: Date,
          responseReceived: Boolean,
          responseAt: Date,
        },
      ],
      completionMessagesSummary: {
        total: Number,
        succeeded: Number,
        failed: Number,
        pending: Number,
        customMessageUsed: Boolean,
        feedbackLinkProvided: Boolean,
        timestamp: Date,
      },

      // Session Generation
      sessionsGeneratedAt: Date,
      lastSessionGeneration: {
        date: Date,
        sessionsCount: Number,
        userId: mongoose.Schema.Types.ObjectId,
      },

      // Instructor Notifications
      instructorNotificationsSent: Boolean,
      instructorNotificationsSentAt: Date,
      instructorNotificationResults: [
        {
          instructorId: mongoose.Schema.Types.ObjectId,
          instructorName: String,
          instructorEmail: String,
          instructorPhone: String,
          status: String,
          customMessage: Boolean,
          messagePreview: String,
          sentAt: Date,
          error: String,
        },
      ],
      instructorNotificationsSummary: {
        total: Number,
        succeeded: Number,
        failed: Number,
        timestamp: Date,
      },

      // 📊 NEW: Marketing Followup Metadata
      marketingFollowupTriggered: {
        type: Boolean,
        default: false,
      },
      marketingFollowupTriggeredAt: Date,
      marketingFollowupTriggeredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      marketingFollowupCompleted: {
        type: Boolean,
        default: false,
      },
      marketingFollowupCompletedAt: Date,
      marketingFollowupResults: {
        totalStudents: Number,
        messagesSent: Number,
        responsesReceived: Number,
        conversions: Number,
        revenueGenerated: Number,
        starStudentsIdentified: Number,
        atRiskStudentsIdentified: Number,
        reEnrollmentOffersMade: Number,
        upsellOffersMade: Number,
        supportPackagesOffered: Number,
      },
      lastMarketingReportGenerated: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ==================== FIXED MIDDLEWARE ====================

// Update updatedAt on save - SIMPLIFIED
groupSchema.pre("save", function (next) {
  try {
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata.updatedAt = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

// Validate schedule before saving - SIMPLIFIED
groupSchema.pre("save", function (next) {
  try {
    // Only validate if schedule exists
    if (this.schedule && this.schedule.startDate && this.schedule.daysOfWeek) {
      const startDate = new Date(this.schedule.startDate);
      
      // Basic validation
      if (isNaN(startDate.getTime())) {
        return next(new Error("Invalid start date"));
      }

      // Ensure daysOfWeek is an array
      if (!Array.isArray(this.schedule.daysOfWeek)) {
        return next(new Error("daysOfWeek must be an array"));
      }

      // Check if we have exactly 3 days
      if (this.schedule.daysOfWeek.length !== 3) {
        return next(new Error("Must select exactly 3 days for the schedule"));
      }

      // Check if first day matches startDate
      const startDayIndex = startDate.getDay();
      const dayNames = [
        "Sunday", "Monday", "Tuesday", "Wednesday", 
        "Thursday", "Friday", "Saturday"
      ];
      const expectedFirstDay = dayNames[startDayIndex];

      if (!this.schedule.daysOfWeek.includes(expectedFirstDay)) {
        return next(
          new Error(
            `First selected day must be ${expectedFirstDay} (based on start date)`
          )
        );
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

// REMOVE the problematic marketing followup pre-save hook temporarily
// We'll add it back once the basic save works
// groupSchema.pre("save", async function (next) {
//   if (this.isModified("status") && this.status === "completed") {
//     try {
//       // Set completion metadata
//       this.metadata.completedAt = new Date();
//       this.metadata.completedBy = this.metadata.createdBy || this.instructors[0];

//       // Don't trigger marketing followup during basic save
//       // This can be handled separately
//     } catch (error) {
//       console.error("❌ [Group] Error in completion handler:", error);
//       // Continue with save even if marketing fails
//     }
//   }
//   next();
// });

// ==================== VIRTUAL PROPERTIES ====================

// Completion percentage
groupSchema.virtual("completionPercentage").get(async function () {
  try {
    const Session = mongoose.model("Session");
    const sessions = await Session.find({
      groupId: this._id,
      isDeleted: false,
    }).lean();

    if (sessions.length === 0) return 0;

    const completedCount = sessions.filter(
      (s) => s.status === "completed"
    ).length;
    return Math.round((completedCount / sessions.length) * 100);
  } catch (error) {
    return 0;
  }
});

// Days until completion
groupSchema.virtual("daysUntilCompletion").get(function () {
  if (!this.schedule?.startDate || this.status === "completed") return 0;

  const startDate = new Date(this.schedule.startDate);
  const daysPerWeek = 3; // 3 days per week
  const weeks = this.totalSessionsCount / 3; // 3 sessions per week

  const completionDate = new Date(startDate);
  completionDate.setDate(startDate.getDate() + weeks * 7);

  const today = new Date();
  const diffTime = completionDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Student capacity percentage
groupSchema.virtual("capacityPercentage").get(function () {
  if (this.maxStudents === 0) return 0;
  return Math.round((this.currentStudentsCount / this.maxStudents) * 100);
});

// ==================== METHODS ====================

// Check if group can be completed
groupSchema.methods.canBeCompleted = async function () {
  try {
    const Session = mongoose.model("Session");

    const sessions = await Session.find({
      groupId: this._id,
      isDeleted: false,
    }).lean();

    if (sessions.length === 0) {
      return {
        can: false,
        reason: "No sessions found for this group",
      };
    }

    const incompleteSessions = sessions.filter((s) => s.status !== "completed");

    if (incompleteSessions.length > 0) {
      return {
        can: false,
        reason: `${incompleteSessions.length} sessions not completed yet`,
        incompleteSessions: incompleteSessions.map((s) => ({
          id: s._id,
          title: s.title,
          status: s.status,
          scheduledDate: s.scheduledDate,
        })),
      };
    }

    if (this.status === "completed") {
      return {
        can: false,
        reason: "Group already marked as completed",
        completedAt: this.metadata.completedAt,
      };
    }

    return {
      can: true,
      totalSessions: sessions.length,
      completedSessions: sessions.length,
    };
  } catch (error) {
    return {
      can: false,
      reason: "Error checking completion status",
      error: error.message,
    };
  }
};

// Get completion statistics
groupSchema.methods.getCompletionStats = function () {
  return {
    isCompleted: this.status === "completed",
    completedAt: this.metadata.completedAt || null,
    completedBy: this.metadata.completedBy || null,
    messagesSent: this.metadata.completionMessagesSent || false,
    messagesSentAt: this.metadata.completionMessagesSentAt || null,
    summary: this.metadata.completionMessagesSummary || null,
    results: this.metadata.completionMessagesResults || [],
  };
};

// ==================== STATIC METHODS ====================

// Find groups needing marketing followup
groupSchema.statics.findGroupsNeedingMarketingFollowup = async function (
  limit = 10
) {
  try {
    const groups = await this.find({
      status: "completed",
      "marketing.enabled": true,
      "marketing.completionFollowup": true,
      $or: [
        { "metadata.marketingFollowupTriggered": false },
        { "metadata.marketingFollowupTriggered": { $exists: false } },
      ],
      isDeleted: false,
    })
      .select("name code status metadata marketing totalSessionsCount")
      .limit(limit)
      .lean();

    return groups;
  } catch (error) {
    console.error(
      "❌ [Group] Error finding groups needing marketing followup:",
      error
    );
    return [];
  }
};

// ==================== INDEXES ====================

groupSchema.index({ code: 1 }, { unique: true });
groupSchema.index({ courseId: 1 });
groupSchema.index({ status: 1 });
groupSchema.index({ "schedule.startDate": 1 });
groupSchema.index({ "metadata.completedAt": 1 });

// Ensure the model exists - FIXED
let Group;
try {
  Group = mongoose.model("Group");
} catch {
  Group = mongoose.model("Group", groupSchema);
}

export default Group;