// models/Marketing.js
import mongoose from "mongoose";

const marketingActionSchema = new mongoose.Schema({
  actionType: {
    type: String,
    enum: ["upsell", "support", "re_enroll", "referral", "feedback"],
    required: true
  },
  targetStudent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },
  targetGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group"
  },
  evaluationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "StudentEvaluation"
  },
  actionData: {
    // مختلف حسب نوع الإجراء
    customMessage: String,
    discountPercentage: Number,
    supportPackage: String,
    nextLevel: String,
    deadline: Date,
    weakPoints: [String],
    aiGenerated: Boolean,
    generatedAt: Date
  },
  communicationChannels: {
    whatsapp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false }
  },
  status: {
    type: String,
    enum: ["pending", "in_progress", "completed", "failed", "cancelled"],
    default: "pending"
  },
  results: {
    messageSent: Boolean,
    sentAt: Date,
    responseReceived: Boolean,
    response: String,
    conversion: Boolean,
    conversionAt: Date,
    notes: String
  },
  metadata: {
    createdBy: mongoose.Schema.Types.ObjectId,
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date,
    executedAt: Date,
    executionLogs: [String]
  }
}, { timestamps: true });

const marketingCampaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  campaignType: {
    type: String,
    enum: ["evaluation_followup", "retention", "upsell", "re_enrollment", "referral"],
    required: true
  },
  targetCriteria: {
    groups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Group" }],
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
    evaluationDecisions: [{ type: String, enum: ["pass", "review", "repeat"] }],
    attendanceMin: Number,
    attendanceMax: Number,
    courseLevel: String
  },
  automationRules: {
    trigger: {
      type: String,
      enum: ["evaluation_completed", "group_completed", "attendance_threshold", "manual"],
      required: true
    },
    delayHours: { type: Number, default: 24 },
    maxRetries: { type: Number, default: 3 },
    followupSchedule: [{ daysAfter: Number, actionType: String }]
  },
  messages: {
    pass: {
      template: String,
      variables: [String],
      aiEnhanced: { type: Boolean, default: true }
    },
    review: {
      template: String,
      variables: [String],
      aiEnhanced: { type: Boolean, default: true }
    },
    repeat: {
      template: String,
      variables: [String],
      aiEnhanced: { type: Boolean, default: true }
    }
  },
  offers: {
    discountPercentage: Number,
    supportSessions: Number,
    deadlineDays: Number,
    referralBonus: String
  },
  status: {
    type: String,
    enum: ["draft", "active", "paused", "completed", "archived"],
    default: "draft"
  },
  stats: {
    totalTargets: Number,
    messagesSent: Number,
    responsesReceived: Number,
    conversions: Number,
    conversionRate: Number,
    startDate: Date,
    endDate: Date
  },
  metadata: {
    createdBy: mongoose.Schema.Types.ObjectId,
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date
  }
}, { timestamps: true });

const referralSchema = new mongoose.Schema({
  referrerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },
  referredId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },
  referralCode: {
    type: String,
    required: true,
    unique: true
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MarketingCampaign"
  },
  status: {
    type: String,
    enum: ["pending", "completed", "expired", "cancelled"],
    default: "pending"
  },
  rewards: {
    referrerReward: String,
    referredReward: String,
    claimed: { type: Boolean, default: false },
    claimedAt: Date
  },
  metadata: {
    createdAt: { type: Date, default: Date.now },
    completedAt: Date,
    notes: String
  }
}, { timestamps: true });

const MarketingAction = mongoose.model("MarketingAction", marketingActionSchema);
const MarketingCampaign = mongoose.model("MarketingCampaign", marketingCampaignSchema);
const Referral = mongoose.model("Referral", referralSchema);

export { MarketingAction, MarketingCampaign, Referral };