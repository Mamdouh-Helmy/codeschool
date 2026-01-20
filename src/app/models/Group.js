// models/Group.js - ENHANCED with Marketing Automation
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

// ==================== MIDDLEWARE ====================

// Update updatedAt on save
groupSchema.pre("save", function (next) {
  this.metadata.updatedAt = new Date();
  next();
});

// Validate schedule before saving
groupSchema.pre("save", function (next) {
  if (this.schedule && this.schedule.startDate && this.schedule.daysOfWeek) {
    const startDayIndex = new Date(this.schedule.startDate).getDay();
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

    if (!this.schedule.daysOfWeek.includes(expectedFirstDay)) {
      return next(
        new Error(
          `First selected day must be ${expectedFirstDay} (based on start date)`
        )
      );
    }

    if (this.schedule.daysOfWeek.length !== 3) {
      return next(new Error("Must select exactly 3 days for the schedule"));
    }
  }
  next();
});

// Trigger marketing followup when group is marked as completed
groupSchema.pre("save", async function (next) {
  if (this.isModified("status") && this.status === "completed") {
    try {
      // Set completion metadata
      this.metadata.completedAt = new Date();
      this.metadata.completedBy =
        this.metadata.createdBy || this.instructors[0];

      // Trigger marketing followup if enabled
      if (this.marketing.enabled && this.marketing.completionFollowup) {
        console.log(
          `🚀 [Group] Triggering marketing followup for completed group: ${this._id}`
        );

        // Import and trigger marketing automation
        const { triggerGroupCompletionMarketing } = await import(
          "../services/marketingAutomation"
        );
        await triggerGroupCompletionMarketing(
          this._id,
          this.metadata.createdBy
        );

        this.metadata.marketingFollowupTriggered = true;
        this.metadata.marketingFollowupTriggeredAt = new Date();
        this.metadata.marketingFollowupTriggeredBy = this.metadata.createdBy;
      }
    } catch (error) {
      console.error("❌ [Group] Error triggering marketing followup:", error);
      // Don't stop save process if marketing fails
    }
  }
  next();
});

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

// Get marketing statistics
groupSchema.methods.getMarketingStats = function () {
  return {
    enabled: this.marketing.enabled,
    campaigns: this.marketing.campaigns || [],
    settings: this.marketing.settings || {},
    stats: this.marketing.stats || {},
    followup: {
      triggered: this.metadata.marketingFollowupTriggered || false,
      triggeredAt: this.metadata.marketingFollowupTriggeredAt || null,
      completed: this.metadata.marketingFollowupCompleted || false,
      completedAt: this.metadata.marketingFollowupCompletedAt || null,
      results: this.metadata.marketingFollowupResults || {},
    },
  };
};

// Trigger marketing followup manually
groupSchema.methods.triggerMarketingFollowup = async function (userId) {
  try {
    console.log(
      `🎯 [Group] Manual marketing followup triggered for group: ${this._id}`
    );

    if (!this.marketing.enabled) {
      return {
        success: false,
        message: "Marketing automation is disabled for this group",
      };
    }

    if (this.status !== "completed") {
      return {
        success: false,
        message: "Group must be completed before triggering marketing followup",
      };
    }

    // Import marketing automation service
    const { triggerGroupCompletionMarketing } = await import(
      "../services/marketingAutomation"
    );

    const result = await triggerGroupCompletionMarketing(this._id, userId);

    // Update group metadata
    this.metadata.marketingFollowupTriggered = true;
    this.metadata.marketingFollowupTriggeredAt = new Date();
    this.metadata.marketingFollowupTriggeredBy = userId;

    await this.save();

    return {
      success: true,
      message: "Marketing followup triggered successfully",
      ...result,
    };
  } catch (error) {
    console.error("❌ [Group] Error triggering marketing followup:", error);
    return {
      success: false,
      message: "Failed to trigger marketing followup",
      error: error.message,
    };
  }
};

// Update marketing statistics
groupSchema.methods.updateMarketingStats = async function (data) {
  try {
    if (!this.marketing.stats) {
      this.marketing.stats = {
        totalMarketingActions: 0,
        successfulActions: 0,
        conversionRate: 0,
        totalRevenue: 0,
        lastCampaignRun: null,
      };
    }

    // Update stats
    if (data.totalMarketingActions !== undefined) {
      this.marketing.stats.totalMarketingActions = data.totalMarketingActions;
    }
    if (data.successfulActions !== undefined) {
      this.marketing.stats.successfulActions = data.successfulActions;
    }
    if (data.conversionRate !== undefined) {
      this.marketing.stats.conversionRate = data.conversionRate;
    }
    if (data.totalRevenue !== undefined) {
      this.marketing.stats.totalRevenue = data.totalRevenue;
    }
    if (data.lastCampaignRun !== undefined) {
      this.marketing.stats.lastCampaignRun = data.lastCampaignRun;
    }

    // Calculate conversion rate if not provided
    if (this.marketing.stats.totalMarketingActions > 0) {
      this.marketing.stats.conversionRate = parseFloat(
        (
          (this.marketing.stats.successfulActions /
            this.marketing.stats.totalMarketingActions) *
          100
        ).toFixed(2)
      );
    }

    await this.save();

    return {
      success: true,
      stats: this.marketing.stats,
    };
  } catch (error) {
    console.error("❌ [Group] Error updating marketing stats:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Get student segmentation
groupSchema.methods.getStudentSegmentation = async function () {
  try {
    const StudentEvaluation = mongoose.model("StudentEvaluation");

    const evaluations = await StudentEvaluation.find({
      groupId: this._id,
      isDeleted: false,
    })
      .populate(
        "studentId",
        "personalInfo.fullName personalInfo.email enrollmentNumber"
      )
      .lean();

    const segmentation = {
      star_students: [],
      ready_for_next_level: [],
      needs_support: [],
      needs_repeat: [],
      at_risk: [],
      not_evaluated: [],
    };

    evaluations.forEach((evaluation) => {
      const category = evaluation.marketing?.studentCategory || "not_evaluated";
      const studentData = {
        studentId: evaluation.studentId._id,
        studentName: evaluation.studentId.personalInfo?.fullName,
        enrollmentNumber: evaluation.studentId.enrollmentNumber,
        email: evaluation.studentId.personalInfo?.email,
        evaluationId: evaluation._id,
        overallScore: evaluation.calculatedStats?.overallScore,
        finalDecision: evaluation.finalDecision,
        weakPoints: evaluation.weakPoints || [],
        strengths: evaluation.strengths || [],
        aiAnalysis: evaluation.marketing?.aiAnalysis,
      };

      if (segmentation[category]) {
        segmentation[category].push(studentData);
      } else {
        segmentation.not_evaluated.push(studentData);
      }
    });

    return {
      success: true,
      totalStudents: evaluations.length,
      segmentation,
      summary: {
        star_students: segmentation.star_students.length,
        ready_for_next_level: segmentation.ready_for_next_level.length,
        needs_support: segmentation.needs_support.length,
        needs_repeat: segmentation.needs_repeat.length,
        at_risk: segmentation.at_risk.length,
        not_evaluated: segmentation.not_evaluated.length,
      },
    };
  } catch (error) {
    console.error("❌ [Group] Error getting student segmentation:", error);
    return {
      success: false,
      error: error.message,
    };
  }
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

// Get groups by marketing campaign
groupSchema.statics.getGroupsByCampaign = async function (campaignId) {
  try {
    const groups = await this.find({
      "marketing.campaigns.campaignId": campaignId,
      isDeleted: false,
    })
      .select("name code status marketing metadata")
      .lean();

    return groups;
  } catch (error) {
    console.error("❌ [Group] Error getting groups by campaign:", error);
    return [];
  }
};

// ==================== INDEXES ====================

groupSchema.index({ code: 1 }, { unique: true });
groupSchema.index({ courseId: 1 });
groupSchema.index({ status: 1 });
groupSchema.index({ "schedule.startDate": 1 });
groupSchema.index({ "metadata.completedAt": 1 });
groupSchema.index({ "metadata.completionMessagesSent": 1 });
groupSchema.index({ "marketing.enabled": 1 });
groupSchema.index({ "metadata.marketingFollowupTriggered": 1 });
groupSchema.index({ "metadata.marketingFollowupCompleted": 1 });
groupSchema.index({ "marketing.campaigns.campaignId": 1 });

// Ensure the model exists
const Group = mongoose.models.Group || mongoose.model("Group", groupSchema);

export default Group;
