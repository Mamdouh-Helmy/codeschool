import mongoose from 'mongoose';

const followupScheduleSchema = new mongoose.Schema({
  daysAfter: {
    type: Number,
    required: true,
    min: 1,
    max: 365
  },
  actionType: {
    type: String,
    enum: ['followup', 'reminder', 'support_offer', 'discount_extension', 'final_offer'],
    required: true
  },
  messageTemplate: String,
  channel: {
    type: String,
    enum: ['whatsapp', 'email', 'sms'],
    default: 'whatsapp'
  }
}, { _id: true });

const messageTemplateSchema = new mongoose.Schema({
  template: {
    type: String,
    required: true
  },
  variables: [String],
  aiEnhanced: {
    type: Boolean,
    default: true
  },
  language: {
    type: String,
    enum: ['ar', 'en'],
    default: 'ar'
  },
  sample: String
}, { _id: false });

const offersSchema = new mongoose.Schema({
  discountPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  supportSessions: {
    type: Number,
    min: 0,
    default: 0
  },
  deadlineDays: {
    type: Number,
    min: 1,
    default: 7
  },
  referralBonus: String,
  conditions: [String],
  exclusions: [String]
}, { _id: false });

const targetCriteriaSchema = new mongoose.Schema({
  // المجموعات المستهدفة
  groups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  
  // الطلاب المستهدفين مباشرة
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  
  // قرارات التقييم المستهدفة
  evaluationDecisions: [{
    type: String,
    enum: ['pass', 'review', 'repeat']
  }],
  
  // نطاق الحضور
  attendanceMin: {
    type: Number,
    min: 0,
    max: 100
  },
  attendanceMax: {
    type: Number,
    min: 0,
    max: 100
  },
  
  // المستوى التعليمي
  courseLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced']
  },
  
  // فئات الطلاب التسويقية
  studentCategories: [{
    type: String,
    enum: ['ready_for_next_level', 'needs_support', 'needs_repeat', 'at_risk', 'star_student']
  }],
  
  // تاريخ الالتحاق
  enrollmentDateRange: {
    from: Date,
    to: Date
  },
  
  // مستوى الأداء
  performanceScore: {
    min: { type: Number, min: 0, max: 5 },
    max: { type: Number, min: 0, max: 5 }
  }
}, { _id: false });

const automationRulesSchema = new mongoose.Schema({
  trigger: {
    type: String,
    enum: ['evaluation_completed', 'group_completed', 'attendance_threshold', 'manual', 'schedule', 'event_based'],
    required: true
  },
  triggerConditions: {
    evaluationDecision: String,
    attendancePercentage: Number,
    groupStatus: String,
    eventType: String
  },
  delayHours: {
    type: Number,
    min: 0,
    max: 720, // 30 يوم
    default: 24
  },
  maxRetries: {
    type: Number,
    min: 0,
    max: 10,
    default: 3
  },
  retryIntervalHours: {
    type: Number,
    min: 1,
    max: 168, // أسبوع
    default: 24
  },
  followupSchedule: [followupScheduleSchema],
  stopConditions: {
    maxDays: Number,
    maxContacts: Number,
    conversionThreshold: Number,
    negativeResponseKeywords: [String]
  }
}, { _id: false });

const campaignStatsSchema = new mongoose.Schema({
  // الأهداف
  totalTargets: {
    type: Number,
    default: 0
  },
  reachedTargets: {
    type: Number,
    default: 0
  },
  engagedTargets: {
    type: Number,
    default: 0
  },
  
  // الرسائل
  messagesSent: {
    type: Number,
    default: 0
  },
  messagesDelivered: {
    type: Number,
    default: 0
  },
  messagesRead: {
    type: Number,
    default: 0
  },
  messagesFailed: {
    type: Number,
    default: 0
  },
  
  // الردود
  responsesReceived: {
    type: Number,
    default: 0
  },
  positiveResponses: {
    type: Number,
    default: 0
  },
  negativeResponses: {
    type: Number,
    default: 0
  },
  neutralResponses: {
    type: Number,
    default: 0
  },
  
  // التحويلات
  conversions: {
    type: Number,
    default: 0
  },
  conversionRate: {
    type: Number,
    default: 0
  },
  pendingConversions: {
    type: Number,
    default: 0
  },
  
  // الإيرادات
  totalRevenue: {
    type: Number,
    default: 0
  },
  estimatedRevenue: {
    type: Number,
    default: 0
  },
  averageOrderValue: {
    type: Number,
    default: 0
  },
  
  // التكلفة
  totalCost: {
    type: Number,
    default: 0
  },
  costPerMessage: {
    type: Number,
    default: 0
  },
  costPerConversion: {
    type: Number,
    default: 0
  },
  
  // الأداء
  roi: {
    type: Number,
    default: 0
  },
  engagementRate: {
    type: Number,
    default: 0
  },
  responseRate: {
    type: Number,
    default: 0
  },
  
  // التوقيت
  startDate: Date,
  endDate: Date,
  lastMessageSent: Date,
  lastResponseReceived: Date,
  
  // التحليلات
  bestPerformingChannel: String,
  bestPerformingMessage: String,
  peakResponseTime: String,
  averageResponseTimeHours: Number
}, { _id: false });

const marketingCampaignSchema = new mongoose.Schema({
  // المعلومات الأساسية
  name: {
    type: String,
    required: [true, 'اسم الحملة مطلوب'],
    trim: true
  },
  code: {
    type: String,
    unique: true,
    default: function() {
      return `CAMP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    }
  },
  description: {
    type: String,
    trim: true
  },
  campaignType: {
    type: String,
    enum: [
      'evaluation_followup',
      'retention',
      'upsell',
      're_enrollment',
      'referral',
      'welcome',
      'reactivation',
      'feedback',
      'announcement',
      'promotional'
    ],
    required: true
  },
  
  // الأهداف والمعايير
  targetCriteria: targetCriteriaSchema,
  exclusions: [{
    type: String,
    enum: ['already_converted', 'recently_contacted', 'opted_out', 'completed_campaign']
  }],
  audienceSize: Number,
  
  // قواعد الأتمتة
  automationRules: automationRulesSchema,
  
  // الرسائل والعروض
  messages: {
    pass: messageTemplateSchema,
    review: messageTemplateSchema,
    repeat: messageTemplateSchema,
    general: messageTemplateSchema,
    followup: messageTemplateSchema,
    reminder: messageTemplateSchema
  },
  offers: offersSchema,
  creativeAssets: [{
    type: {
      type: String,
      enum: ['image', 'video', 'document', 'link']
    },
    url: String,
    caption: String,
    order: Number
  }],
  
  // القنوات
  channels: {
    whatsapp: {
      enabled: { type: Boolean, default: true },
      templateId: String,
      languageCode: { type: String, default: 'ar' }
    },
    email: {
      enabled: { type: Boolean, default: false },
      templateId: String,
      subject: String
    },
    sms: {
      enabled: { type: Boolean, default: false },
      templateId: String
    }
  },
  
  // الجدولة
  schedule: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: Date,
    sendTime: {
      type: String,
      default: '10:00'
    },
    timezone: {
      type: String,
      default: 'Africa/Cairo'
    },
    daysOfWeek: [{
      type: String,
      enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    }],
    frequency: {
      type: String,
      enum: ['once', 'daily', 'weekly', 'monthly'],
      default: 'once'
    }
  },
  
  // الحالة
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled', 'archived'],
    default: 'draft'
  },
  statusHistory: [{
    status: String,
    changedAt: { type: Date, default: Date.now },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String
  }],
  
  // الإحصائيات
  stats: campaignStatsSchema,
  
  // الميزانية
  budget: {
    allocated: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
    remaining: { type: Number, default: 0 },
    currency: {
      type: String,
      default: 'EGP'
    }
  },
  
  // الفريق
  team: {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    collaborators: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      role: {
        type: String,
        enum: ['manager', 'executor', 'analyst', 'viewer']
      },
      addedAt: { type: Date, default: Date.now }
    }]
  },
  
  // التعلم والتحسين
  aiOptimization: {
    enabled: { type: Boolean, default: true },
    learningFromPastCampaigns: { type: Boolean, default: true },
    messageOptimization: { type: Boolean, default: true },
    timingOptimization: { type: Boolean, default: true },
    aBTesting: {
      enabled: { type: Boolean, default: false },
      variations: [{
        name: String,
        message: String,
        audiencePercentage: Number,
        results: {
          conversions: { type: Number, default: 0 },
          engagement: { type: Number, default: 0 }
        }
      }]
    }
  },
  
  // التقارير والتحليلات
  reports: [{
    reportType: String,
    generatedAt: Date,
    data: Object,
    insights: [String],
    recommendations: [String]
  }],
  
  // الميتاداتا
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    version: {
      type: Number,
      default: 1
    },
    tags: [String],
    notes: String,
    approval: {
      required: { type: Boolean, default: false },
      approved: { type: Boolean, default: false },
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      approvedAt: Date,
      comments: String
    }
  },
  
  // الحذف الناعم
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
marketingCampaignSchema.index({ code: 1 }, { unique: true });
marketingCampaignSchema.index({ status: 1 });
marketingCampaignSchema.index({ 'metadata.createdAt': -1 });
marketingCampaignSchema.index({ 'schedule.startDate': 1 });
marketingCampaignSchema.index({ campaignType: 1 });
marketingCampaignSchema.index({ 'team.owner': 1 });
marketingCampaignSchema.index({ 'targetCriteria.groups': 1 });
marketingCampaignSchema.index({ 'metadata.tags': 1 });
marketingCampaignSchema.index({ 'stats.conversionRate': -1 });
marketingCampaignSchema.index({ 'stats.totalRevenue': -1 });

// Virtual Properties
marketingCampaignSchema.virtual('durationDays').get(function() {
  if (!this.schedule?.startDate) return 0;
  const start = new Date(this.schedule.startDate);
  const end = this.schedule?.endDate ? new Date(this.schedule.endDate) : new Date();
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
});

marketingCampaignSchema.virtual('daysRemaining').get(function() {
  if (!this.schedule?.endDate || this.status !== 'active') return null;
  const end = new Date(this.schedule.endDate);
  const now = new Date();
  return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
});

marketingCampaignSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

marketingCampaignSchema.virtual('isOverdue').get(function() {
  if (!this.schedule?.endDate) return false;
  return new Date() > new Date(this.schedule.endDate) && this.status === 'active';
});

marketingCampaignSchema.virtual('performanceRating').get(function() {
  const stats = this.stats || {};
  let score = 0;
  
  if (stats.conversionRate > 20) score += 40;
  else if (stats.conversionRate > 10) score += 30;
  else if (stats.conversionRate > 5) score += 20;
  else if (stats.conversionRate > 0) score += 10;
  
  if (stats.engagementRate > 50) score += 30;
  else if (stats.engagementRate > 30) score += 20;
  else if (stats.engagementRate > 15) score += 10;
  
  if (stats.roi > 200) score += 30;
  else if (stats.roi > 100) score += 20;
  else if (stats.roi > 50) score += 10;
  
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'average';
  return 'poor';
});

// Pre-save middleware
marketingCampaignSchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  
  // تحديث الميزانية المتبقية
  if (this.budget) {
    this.budget.remaining = Math.max(0, this.budget.allocated - this.budget.spent);
  }
  
  // تحديث معدل التحويل
  if (this.stats && this.stats.messagesSent > 0) {
    this.stats.conversionRate = parseFloat(
      ((this.stats.conversions / this.stats.messagesSent) * 100).toFixed(2)
    );
  }
  
  // تحديث معدل المشاركة
  if (this.stats && this.stats.messagesSent > 0) {
    this.stats.engagementRate = parseFloat(
      ((this.stats.responsesReceived / this.stats.messagesSent) * 100).toFixed(2)
    );
  }
  
  // تحديث معدل الاستجابة
  if (this.stats && this.stats.messagesSent > 0) {
    this.stats.responseRate = parseFloat(
      ((this.stats.responsesReceived / this.stats.messagesSent) * 100).toFixed(2)
    );
  }
  
  // تحديث ROI
  if (this.stats && this.budget?.spent > 0) {
    this.stats.roi = parseFloat(
      (((this.stats.totalRevenue - this.budget.spent) / this.budget.spent) * 100).toFixed(2)
    );
  }
  
  // تحديث سجل الحالة
  if (this.isModified('status')) {
    if (!this.statusHistory) {
      this.statusHistory = [];
    }
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
      changedBy: this.metadata.lastModifiedBy || this.metadata.createdBy,
      reason: this.statusChangeReason || 'تغيير تلقائي'
    });
  }
  
  next();
});

// Methods
// تحديث الإحصائيات
marketingCampaignSchema.methods.updateStats = function(statsUpdate) {
  if (!this.stats) {
    this.stats = {};
  }
  
  Object.keys(statsUpdate).forEach(key => {
    if (typeof this.stats[key] === 'number') {
      this.stats[key] = (this.stats[key] || 0) + statsUpdate[key];
    } else {
      this.stats[key] = statsUpdate[key];
    }
  });
  
  return this.save();
};

// إضافة تقرير
marketingCampaignSchema.methods.addReport = function(reportData) {
  if (!this.reports) {
    this.reports = [];
  }
  
  this.reports.push({
    reportType: reportData.reportType || 'custom',
    generatedAt: new Date(),
    data: reportData.data || {},
    insights: reportData.insights || [],
    recommendations: reportData.recommendations || []
  });
  
  return this.save();
};

// إضافة مرفق
marketingCampaignSchema.methods.addCreativeAsset = function(assetData) {
  if (!this.creativeAssets) {
    this.creativeAssets = [];
  }
  
  this.creativeAssets.push({
    type: assetData.type,
    url: assetData.url,
    caption: assetData.caption || '',
    order: this.creativeAssets.length
  });
  
  return this.save();
};

// تشغيل الحملة
marketingCampaignSchema.methods.activate = function(userId) {
  this.status = 'active';
  this.schedule.startDate = new Date();
  this.metadata.lastModifiedBy = userId;
  
  return this.save();
};

// إيقاف الحملة
marketingCampaignSchema.methods.pause = function(userId, reason) {
  this.status = 'paused';
  this.metadata.lastModifiedBy = userId;
  this.statusChangeReason = reason;
  
  return this.save();
};

// إكمال الحملة
marketingCampaignSchema.methods.complete = function(userId, notes) {
  this.status = 'completed';
  this.schedule.endDate = new Date();
  this.metadata.lastModifiedBy = userId;
  this.statusChangeReason = notes;
  
  return this.save();
};

// حساب نسبة الإكمال
marketingCampaignSchema.methods.getCompletionPercentage = function() {
  if (!this.schedule?.startDate) return 0;
  
  const start = new Date(this.schedule.startDate);
  const end = this.schedule?.endDate ? new Date(this.schedule.endDate) : new Date();
  const totalDuration = (end - start) / (1000 * 60 * 60 * 24);
  
  if (totalDuration <= 0) return 100;
  
  const daysPassed = (new Date() - start) / (1000 * 60 * 60 * 24);
  return Math.min(100, Math.round((daysPassed / totalDuration) * 100));
};

// الحصول على ملخص الحملة
marketingCampaignSchema.methods.getSummary = function() {
  return {
    id: this._id,
    name: this.name,
    code: this.code,
    campaignType: this.campaignType,
    status: this.status,
    durationDays: this.durationDays,
    daysRemaining: this.daysRemaining,
    completionPercentage: this.getCompletionPercentage(),
    stats: {
      totalTargets: this.stats?.totalTargets || 0,
      messagesSent: this.stats?.messagesSent || 0,
      conversions: this.stats?.conversions || 0,
      conversionRate: this.stats?.conversionRate || 0,
      totalRevenue: this.stats?.totalRevenue || 0,
      roi: this.stats?.roi || 0
    },
    budget: {
      allocated: this.budget?.allocated || 0,
      spent: this.budget?.spent || 0,
      remaining: this.budget?.remaining || 0
    },
    schedule: {
      startDate: this.schedule?.startDate,
      endDate: this.schedule?.endDate,
      isActive: this.isActive,
      isOverdue: this.isOverdue
    },
    performanceRating: this.performanceRating
  };
};

// Static Methods
// البحث عن الحملات النشطة
marketingCampaignSchema.statics.findActiveCampaigns = async function() {
  return this.find({
    status: 'active',
    isDeleted: false
  }).sort({ 'schedule.startDate': 1 });
};

// البحث عن الحملات المجدولة
marketingCampaignSchema.statics.findScheduledCampaigns = async function(startDate, endDate) {
  return this.find({
    status: 'scheduled',
    'schedule.startDate': { $gte: startDate, $lte: endDate },
    isDeleted: false
  }).sort({ 'schedule.startDate': 1 });
};

// البحث عن الحملات التي تحتاج متابعة
marketingCampaignSchema.statics.findCampaignsNeedingAttention = async function() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  return this.find({
    status: 'active',
    $or: [
      { 'stats.lastMessageSent': { $lt: sevenDaysAgo } },
      { 'stats.conversionRate': { $lt: 5 } },
      { 'stats.engagementRate': { $lt: 10 } }
    ],
    isDeleted: false
  }).sort({ 'stats.conversionRate': 1 }).limit(10);
};

// الحصول على إحصائيات الحملات حسب النوع
marketingCampaignSchema.statics.getCampaignStatsByType = async function(timeframe = 'month') {
  const dateFilter = getDateFilter(timeframe);
  
  return this.aggregate([
    {
      $match: {
        'metadata.createdAt': dateFilter,
        isDeleted: false
      }
    },
    {
      $group: {
        _id: '$campaignType',
        totalCampaigns: { $sum: 1 },
        activeCampaigns: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        totalRevenue: { $sum: { $ifNull: ['$stats.totalRevenue', 0] } },
        totalConversions: { $sum: { $ifNull: ['$stats.conversions', 0] } },
        totalMessages: { $sum: { $ifNull: ['$stats.messagesSent', 0] } },
        avgConversionRate: { $avg: { $ifNull: ['$stats.conversionRate', 0] } },
        avgROI: { $avg: { $ifNull: ['$stats.roi', 0] } }
      }
    },
    {
      $sort: { totalRevenue: -1 }
    }
  ]);
};

// الحصول على أفضل الحملات أداءً
marketingCampaignSchema.statics.getTopPerformingCampaigns = async function(limit = 10) {
  return this.find({
    status: { $in: ['completed', 'active'] },
    isDeleted: false,
    'stats.conversions': { $gt: 0 }
  })
  .sort({ 'stats.conversionRate': -1, 'stats.totalRevenue': -1 })
  .limit(limit)
  .lean();
};

// التحقق من صحة الحملة قبل التشغيل
marketingCampaignSchema.statics.validateCampaign = function(campaignData) {
  const errors = [];
  
  if (!campaignData.name || campaignData.name.length < 3) {
    errors.push('اسم الحملة يجب أن يكون 3 أحرف على الأقل');
  }
  
  if (!campaignData.campaignType) {
    errors.push('نوع الحملة مطلوب');
  }
  
  if (!campaignData.schedule?.startDate) {
    errors.push('تاريخ البدء مطلوب');
  }
  
  if (campaignData.schedule?.endDate && 
      new Date(campaignData.schedule.endDate) < new Date(campaignData.schedule.startDate)) {
    errors.push('تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء');
  }
  
  if (campaignData.budget?.allocated < 0) {
    errors.push('الميزانية المخصصة يجب أن تكون قيمة موجبة');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Helper function for date filtering
function getDateFilter(timeframe) {
  const now = new Date();
  let startDate;
  
  switch (timeframe) {
    case 'day':
      startDate = new Date(now.setDate(now.getDate() - 1));
      break;
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'month':
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case 'quarter':
      startDate = new Date(now.setMonth(now.getMonth() - 3));
      break;
    case 'year':
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      startDate = new Date(now.setMonth(now.getMonth() - 1));
  }
  
  return { $gte: startDate };
}

const MarketingCampaign = mongoose.models.MarketingCampaign || mongoose.model('MarketingCampaign', marketingCampaignSchema);

export default MarketingCampaign;