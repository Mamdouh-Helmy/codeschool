// lib/models.js
import mongoose from 'mongoose';

// ==================== StudentEvaluation ====================
const evaluationCriteriaSchema = new mongoose.Schema({
  understanding: { type: Number, min: 1, max: 5, required: true, validate: { validator: Number.isInteger, message: 'Understanding score must be an integer' } },
  commitment: { type: Number, min: 1, max: 5, required: true, validate: { validator: Number.isInteger, message: 'Commitment score must be an integer' } },
  attendance: { type: Number, min: 1, max: 5, required: true, validate: { validator: Number.isInteger, message: 'Attendance score must be an integer' } },
  participation: { type: Number, min: 1, max: 5, required: true, validate: { validator: Number.isInteger, message: 'Participation score must be an integer' } }
}, { _id: false });

const studentEvaluationSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  instructorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  criteria: { type: evaluationCriteriaSchema, required: true },
  finalDecision: { type: String, enum: ['pass', 'review', 'repeat'], required: true },
  notes: { type: String, trim: true, maxlength: 2000 },
  weakPoints: [{ type: String, enum: ['understanding', 'practice', 'attendance', 'participation', 'homework', 'projects'] }],
  strengths: [{ type: String, enum: ['fast_learner', 'hard_worker', 'team_player', 'creative', 'problem_solver', 'consistent'] }],
  calculatedStats: {
    overallScore: { type: Number, min: 1, max: 5, default: 0 },
    attendancePercentage: { type: Number, min: 0, max: 100, default: 0 },
    completedSessions: { type: Number, default: 0 },
    totalSessions: { type: Number, default: 0 }
  },
  marketing: {
    followupStatus: { type: String, enum: ['pending', 'in_progress', 'completed', 'failed', 'skipped'], default: 'pending' },
    followupCampaign: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketingCampaign' },
    followupActions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MarketingAction' }],
    messagesSent: [{
      type: String,
      channel: String,
      sentAt: Date,
      messageId: String
    }],
    offersMade: [{
      type: String,
      offerType: String,
      madeAt: Date,
      accepted: Boolean,
      acceptedAt: Date
    }],
    studentCategory: {
      type: String,
      enum: ['ready_for_next_level', 'needs_support', 'needs_repeat', 'at_risk', 'star_student'],
      default: 'needs_support'
    },
    nextSteps: [{
      type: String,
      enum: [
        'enroll_next_level',
        'support_sessions', 
        'repeat_course', 
        'mentorship', 
        'project_review',
        'intensive_support',
        'extra_practice',
        'referral_program',
        'feedback_session',
        'one_on_one_coaching'
      ]
    }],
    aiAnalysis: {
      summary: String,
      suggestedMessage: String,
      priority: { type: String, enum: ['high', 'medium', 'low'] },
      generatedAt: Date
    }
  },
  metadata: {
    evaluatedAt: { type: Date, default: Date.now },
    evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastModifiedAt: { type: Date, default: Date.now },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    automationTriggered: { type: Boolean, default: false },
    automationTriggeredAt: Date,
    marketingNotified: { type: Boolean, default: false },
    marketingNotifiedAt: Date
  },
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date
}, {
  timestamps: true
});

// Indexes
studentEvaluationSchema.index({ groupId: 1, studentId: 1 }, { unique: true });
studentEvaluationSchema.index({ instructorId: 1 });
studentEvaluationSchema.index({ finalDecision: 1 });
studentEvaluationSchema.index({ 'metadata.evaluatedAt': -1 });
studentEvaluationSchema.index({ 'marketing.followupStatus': 1 });
studentEvaluationSchema.index({ 'marketing.studentCategory': 1 });

// Methods
studentEvaluationSchema.methods.analyzeNotes = async function() {
  if (!this.notes) return;

  const weakKeywords = {
    understanding: ['صعب', 'لم يفهم', 'بحاجة لشرح', 'مش فاهم', 'ضعيف في', 'يعاني من'],
    practice: ['لا يمارس', 'لا يحل واجبات', 'بحاجة لممارسة', 'ممارسة قليلة'],
    attendance: ['يغيب', 'يتأخر', 'غيابات', 'تأخير'],
    participation: ['هادئ', 'لا يشارك', 'غير متفاعل', 'صامت'],
    homework: ['لا يسلم واجبات', 'يتأخر في التسليم', 'واجبات ناقصة'],
    projects: ['مشروع غير مكتمل', 'بحاجة لتحسين', 'جودة منخفضة']
  };

  const strengthKeywords = {
    fast_learner: ['سريع التعلم', 'يفهم بسرعة', 'ذكي', 'موهوب'],
    hard_worker: ['مجتهد', 'مثابر', 'دؤوب', 'يعمل بجد'],
    team_player: ['يعمل مع الفريق', 'متعاون', 'يساعد زملاءه'],
    creative: ['مبدع', 'إبداعي', 'أفكار جديدة'],
    problem_solver: ['يحل المشاكل', 'تحليلي', 'يفكر بطريقة منطقية'],
    consistent: ['منتظم', 'ثابت', 'مستمر', 'لا يتأخر']
  };

  this.weakPoints = [];
  this.strengths = [];

  Object.entries(weakKeywords).forEach(([category, keywords]) => {
    keywords.forEach(keyword => {
      if (this.notes.includes(keyword) && !this.weakPoints.includes(category)) {
        this.weakPoints.push(category);
      }
    });
  });

  Object.entries(strengthKeywords).forEach(([category, keywords]) => {
    keywords.forEach(keyword => {
      if (this.notes.includes(keyword) && !this.strengths.includes(category)) {
        this.strengths.push(category);
      }
    });
  });
};

studentEvaluationSchema.methods.determineStudentCategory = function() {
  switch (this.finalDecision) {
    case 'pass':
      if (this.calculatedStats.overallScore >= 4.5) {
        this.marketing.studentCategory = 'star_student';
        this.marketing.nextSteps = ['enroll_next_level', 'referral_program'];
      } else {
        this.marketing.studentCategory = 'ready_for_next_level';
        this.marketing.nextSteps = ['enroll_next_level'];
      }
      break;
    case 'review':
      if (this.weakPoints.length > 2) {
        this.marketing.studentCategory = 'at_risk';
        this.marketing.nextSteps = ['support_sessions', 'mentorship', 'extra_practice'];
      } else {
        this.marketing.studentCategory = 'needs_support';
        this.marketing.nextSteps = ['support_sessions', 'project_review'];
      }
      break;
    case 'repeat':
      this.marketing.studentCategory = 'needs_repeat';
      this.marketing.nextSteps = ['repeat_course', 'intensive_support', 'mentorship'];
      break;
  }
};

// Pre-save middleware
studentEvaluationSchema.pre('save', async function(next) {
  try {
    const scores = [
      this.criteria.understanding,
      this.criteria.commitment,
      this.criteria.attendance,
      this.criteria.participation
    ];
    this.calculatedStats.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10;
    await this.analyzeNotes();
    this.determineStudentCategory();
    next();
  } catch (error) {
    next(error);
  }
});

// ==================== Marketing Models ====================
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
  name: { type: String, required: true },
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
    pass: { template: String, variables: [String], aiEnhanced: { type: Boolean, default: true } },
    review: { template: String, variables: [String], aiEnhanced: { type: Boolean, default: true } },
    repeat: { template: String, variables: [String], aiEnhanced: { type: Boolean, default: true } }
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
  referrerId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  referredId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  referralCode: { type: String, required: true, unique: true },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "MarketingCampaign" },
  status: { type: String, enum: ["pending", "completed", "expired", "cancelled"], default: "pending" },
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

// ==================== Export Models Safely ====================
export const StudentEvaluation = mongoose.models.StudentEvaluation || 
  mongoose.model('StudentEvaluation', studentEvaluationSchema);

export const MarketingAction = mongoose.models.MarketingAction || 
  mongoose.model('MarketingAction', marketingActionSchema);

export const MarketingCampaign = mongoose.models.MarketingCampaign || 
  mongoose.model('MarketingCampaign', marketingCampaignSchema);

export const Referral = mongoose.models.Referral || 
  mongoose.model('Referral', referralSchema);