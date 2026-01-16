import mongoose from 'mongoose';

const actionDataSchema = new mongoose.Schema({
  // معلومات عامة
  customMessage: {
    type: String,
    required: true
  },
  discountPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  supportPackage: {
    type: String,
    enum: ['basic', 'standard', 'premium', 'intensive', 'personal_coaching', 'group_coaching']
  },
  nextLevel: String,
  
  // التوقيت
  deadline: Date,
  validUntil: Date,
  availableFrom: Date,
  
  // البيانات التحليلية
  weakPoints: [{
    type: String,
    enum: ['understanding', 'practice', 'attendance', 'participation', 'homework', 'projects']
  }],
  strengths: [{
    type: String,
    enum: ['fast_learner', 'hard_worker', 'team_player', 'creative', 'problem_solver', 'consistent']
  }],
  aiGenerated: {
    type: Boolean,
    default: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  
  // الحملة المرتبطة
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketingCampaign'
  },
  campaignName: String,
  
  // التفاصيل المالية
  originalPrice: Number,
  discountedPrice: Number,
  paymentLink: String,
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  
  // التحليل الذكي
  aiAnalysis: {
    confidenceScore: { type: Number, min: 0, max: 100 },
    suggestedImprovements: [String],
    predictedConversionProbability: { type: Number, min: 0, max: 100 },
    keyTriggers: [String]
  },
  
  // النسخ المختلفة
  messageVariations: [{
    language: { type: String, enum: ['ar', 'en'] },
    message: String,
    tested: { type: Boolean, default: false },
    performance: {
      sent: { type: Number, default: 0 },
      responses: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 }
    }
  }],
  
  // المرفقات
  attachments: [{
    type: { type: String, enum: ['image', 'video', 'document', 'link'] },
    url: String,
    caption: String
  }],
  
  // التخصيص
  personalization: {
    studentName: String,
    courseName: String,
    groupName: String,
    instructorName: String,
    customVariables: mongoose.Schema.Types.Mixed
  },
  
  // التتبع
  tracking: {
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    utmTerm: String,
    utmContent: String,
    referralCode: String
  }
}, { _id: false });

const communicationChannelsSchema = new mongoose.Schema({
  whatsapp: {
    enabled: { type: Boolean, default: true },
    templateId: String,
    language: { type: String, enum: ['ar', 'en'], default: 'ar' },
    sendTime: String,
    retryCount: { type: Number, default: 0 }
  },
  email: {
    enabled: { type: Boolean, default: false },
    templateId: String,
    subject: String,
    sentAt: Date,
    opened: { type: Boolean, default: false },
    openedAt: Date,
    clicked: { type: Boolean, default: false },
    clickedAt: Date
  },
  sms: {
    enabled: { type: Boolean, default: false },
    templateId: String,
    sentAt: Date,
    deliveryStatus: String
  }
}, { _id: false });

const resultsSchema = new mongoose.Schema({
  // حالة الإرسال
  messageSent: {
    type: Boolean,
    default: false
  },
  sentAt: Date,
  
  // الردود
  responseReceived: {
    type: Boolean,
    default: false
  },
  response: String,
  responseType: {
    type: String,
    enum: ['positive', 'negative', 'neutral', 'question', 'request_more_info']
  },
  responseAt: Date,
  
  // التحويل
  conversion: {
    type: Boolean,
    default: false
  },
  conversionType: {
    type: String,
    enum: ['upsell', 're_enrollment', 'support_package', 'referral', 'feedback']
  },
  conversionAt: Date,
  conversionValue: Number,
  
  // التفاعل
  engagement: {
    opened: { type: Boolean, default: false },
    openedAt: Date,
    clicked: { type: Boolean, default: false },
    clickedAt: Date,
    replied: { type: Boolean, default: false },
    repliedAt: Date,
    shared: { type: Boolean, default: false },
    sharedAt: Date
  },
  
  // الملاحظات
  notes: String,
  followupNeeded: { type: Boolean, default: false },
  followupScheduled: Date,
  
  // بيانات واجهة برمجة التطبيقات
  apiResponse: mongoose.Schema.Types.Mixed,
  messageId: String,
  deliveryStatus: String,
  readStatus: { type: Boolean, default: false },
  readAt: Date,
  
  // التحليلات
  timeToResponse: Number, // بالدقائق
  timeToConversion: Number, // بالدقائق
  interactionCount: { type: Number, default: 0 }
}, { _id: false });

const metadataSchema = new mongoose.Schema({
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
  executedAt: Date,
  executionLogs: [{
    timestamp: { type: Date, default: Date.now },
    action: String,
    details: String,
    status: String,
    error: String
  }],
  
  // التتبع
  sessionId: String,
  ipAddress: String,
  userAgent: String,
  deviceType: String,
  
  // الأتمتة
  automationId: String,
  triggerType: {
    type: String,
    enum: ['manual', 'scheduled', 'event_based', 'api_call']
  },
  triggerEvent: String,
  
  // الحملة
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketingCampaign'
  },
  campaignType: String,
  
  // الإصدار
  version: {
    type: Number,
    default: 1
  },
  
  // الأرشفة
  archived: { type: Boolean, default: false },
  archivedAt: Date,
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // التصنيف
  tags: [String],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  }
}, { _id: false });

const marketingActionSchema = new mongoose.Schema({
  // نوع الإجراء
  actionType: {
    type: String,
    enum: ['upsell', 'support', 're_enroll', 'referral', 'feedback', 'welcome', 'reminder', 'announcement'],
    required: true
  },
  subType: {
    type: String,
    enum: [
      'level_upgrade',
      'course_extension',
      'bundle_offer',
      'discount_offer',
      'free_trial',
      'webinar_invite',
      'certificate_offer',
      'mentorship_offer'
    ]
  },
  
  // الهدف
  targetStudent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  targetGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  evaluationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentEvaluation'
  },
  
  // بيانات الإجراء
  actionData: actionDataSchema,
  
  // قنوات التواصل
  communicationChannels: communicationChannelsSchema,
  
  // الجدولة
  schedule: {
    scheduledAt: Date,
    timezone: {
      type: String,
      default: 'Africa/Cairo'
    },
    recurrence: {
      type: String,
      enum: ['once', 'daily', 'weekly', 'monthly', 'custom']
    },
    endDate: Date,
    maxAttempts: { type: Number, default: 3 }
  },
  
  // الحالة
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'in_progress', 'completed', 'failed', 'cancelled', 'expired', 'on_hold'],
    default: 'pending'
  },
  statusHistory: [{
    status: String,
    changedAt: { type: Date, default: Date.now },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    notes: String
  }],
  
  // النتائج
  results: resultsSchema,
  
  // المتابعة
  followupActions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketingAction'
  }],
  parentAction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketingAction'
  },
  
  // الميتاداتا
  metadata: metadataSchema,
  
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
marketingActionSchema.index({ targetStudent: 1 });
marketingActionSchema.index({ actionType: 1 });
marketingActionSchema.index({ status: 1 });
marketingActionSchema.index({ 'metadata.createdAt': -1 });
marketingActionSchema.index({ 'metadata.campaignId': 1 });
marketingActionSchema.index({ 'metadata.createdBy': 1 });
marketingActionSchema.index({ 'schedule.scheduledAt': 1 });
marketingActionSchema.index({ 'results.conversion': 1 });
marketingActionSchema.index({ 'metadata.priority': 1 });
marketingActionSchema.index({ evaluationId: 1 });

// Virtual Properties
marketingActionSchema.virtual('daysSinceCreation').get(function() {
  const created = this.metadata?.createdAt || this.createdAt;
  return Math.floor((new Date() - new Date(created)) / (1000 * 60 * 60 * 24));
});

marketingActionSchema.virtual('hoursSinceCreation').get(function() {
  const created = this.metadata?.createdAt || this.createdAt;
  return Math.floor((new Date() - new Date(created)) / (1000 * 60 * 60));
});

marketingActionSchema.virtual('isOverdue').get(function() {
  if (this.status !== 'scheduled' || !this.schedule?.scheduledAt) return false;
  return new Date() > new Date(this.schedule.scheduledAt);
});

marketingActionSchema.virtual('canBeExecuted').get(function() {
  if (this.status === 'completed' || this.status === 'cancelled' || this.status === 'failed') {
    return false;
  }
  
  if (this.schedule?.scheduledAt && new Date() < new Date(this.schedule.scheduledAt)) {
    return false;
  }
  
  return true;
});

marketingActionSchema.virtual('successProbability').get(function() {
  let probability = 50; // احتمال أساسي
  
  if (this.actionData?.aiAnalysis?.predictedConversionProbability) {
    probability = this.actionData.aiAnalysis.predictedConversionProbability;
  }
  
  // تعديل بناءً على نوع الإجراء
  const typeProbabilities = {
    'upsell': 60,
    'support': 70,
    're_enroll': 40,
    'referral': 30,
    'feedback': 80,
    'welcome': 90,
    'reminder': 50,
    'announcement': 40
  };
  
  probability = (probability + (typeProbabilities[this.actionType] || 50)) / 2;
  
  // تعديل بناءً على الأولوية
  const priorityModifiers = {
    'urgent': 1.2,
    'high': 1.1,
    'medium': 1.0,
    'low': 0.9
  };
  
  probability *= priorityModifiers[this.metadata?.priority || 'medium'];
  
  return Math.min(Math.max(probability, 0), 100);
});

// Pre-save middleware
marketingActionSchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  
  // تحديث سجل الحالة
  if (this.isModified('status')) {
    if (!this.statusHistory) {
      this.statusHistory = [];
    }
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
      changedBy: this.metadata?.lastModifiedBy || this.metadata?.createdBy,
      reason: this.statusChangeReason || 'تغيير تلقائي',
      notes: this.statusChangeNotes || ''
    });
  }
  
  // تسجيل تنفيذ الإجراء
  if (this.isModified('results.messageSent') && this.results.messageSent) {
    this.results.sentAt = new Date();
    if (!this.metadata.executedAt) {
      this.metadata.executedAt = new Date();
    }
  }
  
  // تسجيل الرد
  if (this.isModified('results.responseReceived') && this.results.responseReceived) {
    this.results.responseAt = new Date();
    
    // حساب وقت الاستجابة
    if (this.results.sentAt) {
      this.results.timeToResponse = Math.round(
        (new Date(this.results.responseAt) - new Date(this.results.sentAt)) / (1000 * 60)
      );
    }
  }
  
  // تسجيل التحويل
  if (this.isModified('results.conversion') && this.results.conversion) {
    this.results.conversionAt = new Date();
    
    // حساب وقت التحويل
    if (this.results.sentAt) {
      this.results.timeToConversion = Math.round(
        (new Date(this.results.conversionAt) - new Date(this.results.sentAt)) / (1000 * 60)
      );
    }
  }
  
  // تسجيل سجلات التنفيذ
  if (this.isModified('metadata.executionLogs') && this.metadata.executionLogs?.length > 0) {
    const lastLog = this.metadata.executionLogs[this.metadata.executionLogs.length - 1];
    if (!lastLog.timestamp) {
      lastLog.timestamp = new Date();
    }
  }
  
  next();
});

// Methods
// تنفيذ الإجراء
marketingActionSchema.methods.execute = async function(userId) {
  try {
    this.status = 'in_progress';
    this.metadata.lastModifiedBy = userId;
    
    // تسجيل محاولة التنفيذ
    this.metadata.executionLogs.push({
      action: 'execute',
      details: `بدء تنفيذ الإجراء ${this.actionType}`,
      status: 'in_progress',
      timestamp: new Date()
    });
    
    await this.save();
    
    return {
      success: true,
      message: 'بدأ تنفيذ الإجراء',
      actionId: this._id,
      status: this.status
    };
  } catch (error) {
    this.metadata.executionLogs.push({
      action: 'execute',
      details: `فشل في بدء التنفيذ: ${error.message}`,
      status: 'failed',
      error: error.message,
      timestamp: new Date()
    });
    
    await this.save();
    
    return {
      success: false,
      message: 'فشل في بدء تنفيذ الإجراء',
      error: error.message
    };
  }
};

// إكمال الإجراء
marketingActionSchema.methods.complete = async function(resultData, userId) {
  try {
    this.status = 'completed';
    this.results = {
      ...this.results,
      ...resultData
    };
    this.metadata.lastModifiedBy = userId;
    
    // تسجيل الإكمال
    this.metadata.executionLogs.push({
      action: 'complete',
      details: 'تم إكمال الإجراء بنجاح',
      status: 'completed',
      timestamp: new Date()
    });
    
    await this.save();
    
    return {
      success: true,
      message: 'تم إكمال الإجراء بنجاح',
      actionId: this._id,
      results: this.results
    };
  } catch (error) {
    this.metadata.executionLogs.push({
      action: 'complete',
      details: `فشل في إكمال الإجراء: ${error.message}`,
      status: 'failed',
      error: error.message,
      timestamp: new Date()
    });
    
    await this.save();
    
    return {
      success: false,
      message: 'فشل في إكمال الإجراء',
      error: error.message
    };
  }
};

// فشل الإجراء
marketingActionSchema.methods.fail = async function(errorMessage, userId) {
  try {
    this.status = 'failed';
    this.results.notes = errorMessage;
    this.metadata.lastModifiedBy = userId;
    
    // تسجيل الفشل
    this.metadata.executionLogs.push({
      action: 'fail',
      details: `فشل الإجراء: ${errorMessage}`,
      status: 'failed',
      error: errorMessage,
      timestamp: new Date()
    });
    
    await this.save();
    
    return {
      success: true,
      message: 'تم تسجيل فشل الإجراء',
      actionId: this._id,
      error: errorMessage
    };
  } catch (error) {
    console.error('Error marking action as failed:', error);
    return {
      success: false,
      message: 'فشل في تسجيل فشل الإجراء',
      error: error.message
    };
  }
};

// إعادة المحاولة
marketingActionSchema.methods.retry = async function(userId) {
  try {
    if (this.communicationChannels?.whatsapp?.retryCount >= 3) {
      return {
        success: false,
        message: 'تم تجاوز الحد الأقصى للمحاولات'
      };
    }
    
    this.status = 'pending';
    if (this.communicationChannels?.whatsapp) {
      this.communicationChannels.whatsapp.retryCount += 1;
    }
    this.metadata.lastModifiedBy = userId;
    
    // تسجيل إعادة المحاولة
    this.metadata.executionLogs.push({
      action: 'retry',
      details: `إعادة المحاولة رقم ${this.communicationChannels?.whatsapp?.retryCount || 1}`,
      status: 'pending',
      timestamp: new Date()
    });
    
    await this.save();
    
    return {
      success: true,
      message: 'تم جدولة إعادة المحاولة',
      actionId: this._id,
      retryCount: this.communicationChannels?.whatsapp?.retryCount || 1
    };
  } catch (error) {
    return {
      success: false,
      message: 'فشل في جدولة إعادة المحاولة',
      error: error.message
    };
  }
};

// إضافة متابعة
marketingActionSchema.methods.addFollowup = async function(followupData, userId) {
  try {
    if (!this.followupActions) {
      this.followupActions = [];
    }
    
    // إنشاء إجراء متابعة
    const followupAction = await MarketingAction.create({
      ...followupData,
      parentAction: this._id,
      metadata: {
        createdBy: userId,
        createdAt: new Date(),
        parentActionId: this._id
      }
    });
    
    this.followupActions.push(followupAction._id);
    this.results.followupNeeded = true;
    this.results.followupScheduled = followupData.schedule?.scheduledAt;
    
    await this.save();
    
    return {
      success: true,
      message: 'تم إضافة إجراء المتابعة',
      followupActionId: followupAction._id,
      parentActionId: this._id
    };
  } catch (error) {
    return {
      success: false,
      message: 'فشل في إضافة إجراء المتابعة',
      error: error.message
    };
  }
};

// تحديث نتائج واجهة برمجة التطبيقات
marketingActionSchema.methods.updateAPIResults = async function(apiResponse) {
  try {
    this.results.apiResponse = apiResponse;
    this.results.messageId = apiResponse.messageId;
    this.results.deliveryStatus = apiResponse.status;
    
    if (apiResponse.status === 'delivered') {
      this.results.messageSent = true;
      this.results.sentAt = new Date();
    }
    
    // تسجيل استجابة API
    this.metadata.executionLogs.push({
      action: 'api_response',
      details: `استجابة API: ${apiResponse.status}`,
      status: apiResponse.status === 'delivered' ? 'success' : 'failed',
      timestamp: new Date()
    });
    
    await this.save();
    
    return {
      success: true,
      message: 'تم تحديث نتائج API',
      messageId: apiResponse.messageId,
      status: apiResponse.status
    };
  } catch (error) {
    return {
      success: false,
      message: 'فشل في تحديث نتائج API',
      error: error.message
    };
  }
};

// الحصول على ملخص الإجراء
marketingActionSchema.methods.getSummary = function() {
  return {
    id: this._id,
    actionType: this.actionType,
    targetStudent: this.targetStudent,
    status: this.status,
    priority: this.metadata?.priority || 'medium',
    scheduledAt: this.schedule?.scheduledAt,
    sentAt: this.results.sentAt,
    responseReceived: this.results.responseReceived,
    conversion: this.results.conversion,
    conversionValue: this.results.conversionValue,
    successProbability: this.successProbability,
    daysSinceCreation: this.daysSinceCreation,
    canBeExecuted: this.canBeExecuted,
    isOverdue: this.isOverdue
  };
};

// الحصول على سجل التنفيذ
marketingActionSchema.methods.getExecutionLog = function() {
  return this.metadata?.executionLogs || [];
};

// Static Methods
// البحث عن الإجراءات المعلقة
marketingActionSchema.statics.findPendingActions = async function(limit = 100) {
  return this.find({
    status: 'pending',
    isDeleted: false,
    $or: [
      { 'schedule.scheduledAt': { $exists: false } },
      { 'schedule.scheduledAt': { $lte: new Date() } }
    ]
  })
  .sort({ 'metadata.priority': -1, 'metadata.createdAt': 1 })
  .limit(limit)
  .populate('targetStudent', 'personalInfo.fullName personalInfo.whatsappNumber')
  .populate('targetGroup', 'name code')
  .lean();
};

// البحث عن الإجراءات المجدولة
marketingActionSchema.statics.findScheduledActions = async function(startDate, endDate) {
  return this.find({
    status: 'scheduled',
    'schedule.scheduledAt': { $gte: startDate, $lte: endDate },
    isDeleted: false
  })
  .sort({ 'schedule.scheduledAt': 1 })
  .populate('targetStudent', 'personalInfo.fullName personalInfo.whatsappNumber')
  .lean();
};

// البحث عن الإجراءات الفاشلة التي تحتاج إعادة محاولة
marketingActionSchema.statics.findFailedActionsNeedingRetry = async function(hoursThreshold = 24) {
  const thresholdDate = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);
  
  return this.find({
    status: 'failed',
    'metadata.updatedAt': { $lt: thresholdDate },
    isDeleted: false,
    $or: [
      { 'communicationChannels.whatsapp.retryCount': { $lt: 3 } },
      { 'communicationChannels.whatsapp.retryCount': { $exists: false } }
    ]
  })
  .sort({ 'metadata.updatedAt': 1 })
  .limit(50)
  .lean();
};

// الحصول على إحصائيات الإجراءات
marketingActionSchema.statics.getActionStats = async function(timeframe = 'month', userId = null) {
  const dateFilter = getDateFilter(timeframe);
  const matchQuery = {
    'metadata.createdAt': dateFilter,
    isDeleted: false
  };
  
  if (userId) {
    matchQuery['metadata.createdBy'] = userId;
  }
  
  return this.aggregate([
    {
      $match: matchQuery
    },
    {
      $facet: {
        overall: [
          {
            $group: {
              _id: null,
              totalActions: { $sum: 1 },
              pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
              inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
              completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
              failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
              totalConversions: { $sum: { $cond: [{ $eq: ['$results.conversion', true] }, 1, 0] } },
              totalRevenue: { $sum: { $ifNull: ['$results.conversionValue', 0] } },
              avgResponseTime: { $avg: { $ifNull: ['$results.timeToResponse', 0] } },
              avgConversionTime: { $avg: { $ifNull: ['$results.timeToConversion', 0] } }
            }
          }
        ],
        byType: [
          {
            $group: {
              _id: '$actionType',
              count: { $sum: 1 },
              conversions: { $sum: { $cond: [{ $eq: ['$results.conversion', true] }, 1, 0] } },
              revenue: { $sum: { $ifNull: ['$results.conversionValue', 0] } },
              avgSuccessRate: {
                $avg: {
                  $cond: [
                    { $gt: ['$results.conversion', false] },
                    100,
                    0
                  ]
                }
              }
            }
          }
        ],
        byStatus: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              avgAge: {
                $avg: {
                  $divide: [
                    { $subtract: [new Date(), '$metadata.createdAt'] },
                    1000 * 60 * 60 * 24 // تحويل إلى أيام
                  ]
                }
              }
            }
          }
        ],
        dailyTrend: [
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$metadata.createdAt' }
              },
              count: { $sum: 1 },
              conversions: { $sum: { $cond: [{ $eq: ['$results.conversion', true] }, 1, 0] } },
              revenue: { $sum: { $ifNull: ['$results.conversionValue', 0] } }
            }
          },
          { $sort: { '_id': 1 } },
          { $limit: 30 }
        ]
      }
    }
  ]);
};

// الحصول على أفضل الإجراءات أداءً
marketingActionSchema.statics.getTopPerformingActions = async function(limit = 20) {
  return this.find({
    status: 'completed',
    'results.conversion': true,
    isDeleted: false
  })
  .sort({ 'results.conversionValue': -1 })
  .limit(limit)
  .populate('targetStudent', 'personalInfo.fullName')
  .populate('targetGroup', 'name')
  .lean();
};

// الحصول على الإجراءات التي تحتاج متابعة
marketingActionSchema.statics.getActionsNeedingFollowup = async function(limit = 50) {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  
  return this.find({
    status: 'completed',
    'results.followupNeeded': true,
    'results.followupScheduled': { $lte: threeDaysAgo },
    isDeleted: false
  })
  .sort({ 'results.followupScheduled': 1 })
  .limit(limit)
  .populate('targetStudent', 'personalInfo.fullName personalInfo.whatsappNumber')
  .lean();
};

// التحقق من صحة الإجراء قبل الإنشاء
marketingActionSchema.statics.validateAction = function(actionData) {
  const errors = [];
  
  if (!actionData.actionType) {
    errors.push('نوع الإجراء مطلوب');
  }
  
  if (!actionData.targetStudent) {
    errors.push('الطالب المستهدف مطلوب');
  }
  
  if (!actionData.actionData?.customMessage) {
    errors.push('رسالة الإجراء مطلوبة');
  }
  
  if (actionData.schedule?.scheduledAt && 
      new Date(actionData.schedule.scheduledAt) < new Date()) {
    errors.push('تاريخ الجدولة يجب أن يكون في المستقبل');
  }
  
  if (actionData.actionData?.discountPercentage && 
      (actionData.actionData.discountPercentage < 0 || actionData.actionData.discountPercentage > 100)) {
    errors.push('نسبة الخصم يجب أن تكون بين 0 و 100');
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

const MarketingAction = mongoose.models.MarketingAction || mongoose.model('MarketingAction', marketingActionSchema);

export default MarketingAction;