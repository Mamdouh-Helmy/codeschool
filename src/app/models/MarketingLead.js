import mongoose from 'mongoose';

const marketingLeadSchema = new mongoose.Schema({
  // Basic Information
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  whatsappNumber: {
    type: String,
    trim: true
  },
  
  // Lead Source
  source: {
    type: String,
    enum: ['landing_page', 'contact_form', 'referral', 'social_media', 'event', 'other'],
    required: true
  },
  sourceDetails: {
    pageUrl: String,
    formType: String,
    campaignName: String,
    medium: String
  },
  
  // Lead Status
  status: {
    type: String,
    enum: ['new', 'contacted', 'converted', 'not_interested', 'follow_up'],
    default: 'new'
  },
  
  // Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: Date,
  
  // Communication History
  communicationHistory: [{
    channel: {
      type: String,
      enum: ['whatsapp', 'email', 'phone', 'sms']
    },
    message: String,
    direction: {
      type: String,
      enum: ['inbound', 'outbound']
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'replied', 'failed']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String,
    metadata: Object
  }],
  
  // WhatsApp Status Tracking
  whatsappStatus: {
    lastMessage: String,
    lastMessageAt: Date,
    lastResponse: String,
    lastResponseAt: Date,
    conversationStage: {
      type: String,
      enum: ['initial', 'follow_up', 'qualified', 'closing', 'converted']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  
  // Conversion Details
  conversion: {
    convertedAt: Date,
    convertedBy: mongoose.Schema.Types.ObjectId,
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group'
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    revenue: Number,
    notes: String
  },
  
  // Lead Score
  leadScore: {
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    factors: [{
      factor: String,
      score: Number,
      reason: String
    }],
    lastUpdated: Date
  },
  
  // Tags & Categories
  tags: [{
    type: String,
    enum: [
      'high_potential',
      'tech_savvy',
      'student',
      'professional',
      'beginner',
      'advanced',
      'urgent',
      'referred'
    ]
  }],
  
  // Metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    location: String,
    deviceType: String,
    createdBy: mongoose.Schema.Types.ObjectId,
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    lastContacted: Date,
    nextFollowUp: Date
  },
  
  // Soft Delete
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
marketingLeadSchema.index({ status: 1 });
marketingLeadSchema.index({ assignedTo: 1 });
marketingLeadSchema.index({ 'metadata.createdAt': -1 });
marketingLeadSchema.index({ 'whatsappStatus.isActive': 1 });
marketingLeadSchema.index({ email: 1 }, { sparse: true });
marketingLeadSchema.index({ phone: 1 }, { unique: true, sparse: true });

// Virtual: Days since creation
marketingLeadSchema.virtual('daysSinceCreation').get(function() {
  const now = new Date();
  const created = this.metadata?.createdAt || this.createdAt;
  const diffTime = now - new Date(created);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual: Last contact days
marketingLeadSchema.virtual('daysSinceLastContact').get(function() {
  if (!this.metadata?.lastContacted) return null;
  const now = new Date();
  const diffTime = now - new Date(this.metadata.lastContacted);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual: Is overdue for followup
marketingLeadSchema.virtual('isOverdue').get(function() {
  if (!this.metadata?.nextFollowUp) return false;
  return new Date() > new Date(this.metadata.nextFollowUp);
});

// Pre-save middleware
marketingLeadSchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  
  // Update lead score automatically
  if (this.isModified('status') || this.isModified('communicationHistory')) {
    this.updateLeadScore();
  }
  
  next();
});

// Method: Update lead score
marketingLeadSchema.methods.updateLeadScore = function() {
  let score = 0;
  const factors = [];
  
  // Factor 1: Lead status
  const statusScores = {
    'new': 10,
    'contacted': 30,
    'follow_up': 50,
    'converted': 100,
    'not_interested': 0
  };
  score += statusScores[this.status] || 0;
  factors.push({
    factor: 'status',
    score: statusScores[this.status] || 0,
    reason: `Lead status: ${this.status}`
  });
  
  // Factor 2: Communication frequency
  const commCount = this.communicationHistory?.length || 0;
  const commScore = Math.min(commCount * 5, 30);
  score += commScore;
  factors.push({
    factor: 'communication_frequency',
    score: commScore,
    reason: `${commCount} communications`
  });
  
  // Factor 3: Recent activity
  if (this.metadata?.lastContacted) {
    const daysSince = this.daysSinceLastContact;
    if (daysSince !== null) {
      const activityScore = daysSince <= 1 ? 20 : daysSince <= 3 ? 10 : daysSince <= 7 ? 5 : 0;
      score += activityScore;
      factors.push({
        factor: 'recent_activity',
        score: activityScore,
        reason: `Last contact: ${daysSince} days ago`
      });
    }
  }
  
  // Factor 4: WhatsApp engagement
  if (this.whatsappStatus?.lastResponseAt) {
    const daysSinceResponse = Math.floor((new Date() - new Date(this.whatsappStatus.lastResponseAt)) / (1000 * 60 * 60 * 24));
    const whatsappScore = daysSinceResponse <= 1 ? 15 : daysSinceResponse <= 3 ? 10 : 5;
    score += whatsappScore;
    factors.push({
      factor: 'whatsapp_engagement',
      score: whatsappScore,
      reason: `Last WhatsApp response: ${daysSinceResponse} days ago`
    });
  }
  
  // Factor 5: Lead completeness
  let completenessScore = 0;
  if (this.email) completenessScore += 10;
  if (this.whatsappNumber) completenessScore += 10;
  if (this.sourceDetails?.pageUrl) completenessScore += 5;
  score += completenessScore;
  factors.push({
    factor: 'data_completeness',
    score: completenessScore,
    reason: 'Contact information completeness'
  });
  
  // Update lead score
  this.leadScore = {
    score: Math.min(Math.max(score, 0), 100),
    factors,
    lastUpdated: new Date()
  };
};

// Method: Add communication
marketingLeadSchema.methods.addCommunication = function(communicationData) {
  if (!this.communicationHistory) {
    this.communicationHistory = [];
  }
  
  this.communicationHistory.push({
    ...communicationData,
    timestamp: new Date()
  });
  
  this.metadata.lastContacted = new Date();
  
  // Auto-set status
  if (communicationData.direction === 'outbound' && this.status === 'new') {
    this.status = 'contacted';
  }
  
  // Set next follow-up (24 hours for outbound, 48 hours for inbound)
  if (communicationData.direction === 'outbound') {
    const nextFollowUp = new Date();
    nextFollowUp.setHours(nextFollowUp.getHours() + 24);
    this.metadata.nextFollowUp = nextFollowUp;
  }
  
  return this.save();
};

// Method: Update WhatsApp status
marketingLeadSchema.methods.updateWhatsAppStatus = function(messageData) {
  this.whatsappStatus = {
    ...this.whatsappStatus,
    lastMessage: messageData.message,
    lastMessageAt: messageData.timestamp || new Date(),
    lastResponse: messageData.response,
    lastResponseAt: messageData.response ? new Date() : this.whatsappStatus?.lastResponseAt,
    conversationStage: messageData.conversationStage || this.whatsappStatus?.conversationStage || 'initial',
    isActive: true
  };
  
  if (messageData.response) {
    this.status = 'follow_up';
  }
  
  return this.save();
};

// Method: Convert lead to student
marketingLeadSchema.methods.convertToStudent = function(conversionData) {
  this.status = 'converted';
  this.conversion = {
    convertedAt: new Date(),
    convertedBy: conversionData.convertedBy,
    courseId: conversionData.courseId,
    groupId: conversionData.groupId,
    studentId: conversionData.studentId,
    revenue: conversionData.revenue,
    notes: conversionData.notes
  };
  
  this.whatsappStatus.conversationStage = 'converted';
  
  return this.save();
};

// Static: Find leads needing followup
marketingLeadSchema.statics.findLeadsNeedingFollowup = async function(limit = 50) {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  return this.find({
    status: { $in: ['contacted', 'follow_up'] },
    $or: [
      { 'metadata.nextFollowUp': { $lte: now } },
      { 
        'metadata.lastContacted': { $lte: twentyFourHoursAgo },
        'metadata.nextFollowUp': { $exists: false }
      }
    ],
    isDeleted: false,
    'conversion.convertedAt': { $exists: false }
  })
  .sort({ 'leadScore.score': -1, 'metadata.lastContacted': 1 })
  .limit(limit)
  .lean();
};

// Static: Get lead statistics
marketingLeadSchema.statics.getLeadStats = async function(timeframe = 'month') {
  const dateFilter = getDateFilter(timeframe);
  
  const stats = await this.aggregate([
    {
      $match: {
        'metadata.createdAt': dateFilter,
        isDeleted: false
      }
    },
    {
      $facet: {
        // Total leads by status
        byStatus: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ],
        
        // Leads by source
        bySource: [
          {
            $group: {
              _id: '$source',
              count: { $sum: 1 }
            }
          }
        ],
        
        // Conversion rate
        conversionStats: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              converted: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'converted'] }, 1, 0]
                }
              },
              revenue: {
                $sum: {
                  $cond: [
                    { $eq: ['$status', 'converted'] },
                    { $ifNull: ['$conversion.revenue', 0] },
                    0
                  ]
                }
              }
            }
          }
        ],
        
        // Lead score distribution
        scoreDistribution: [
          {
            $bucket: {
              groupBy: '$leadScore.score',
              boundaries: [0, 25, 50, 75, 100],
              default: 'Other',
              output: {
                count: { $sum: 1 },
                avgScore: { $avg: '$leadScore.score' }
              }
            }
          }
        ],
        
        // Daily trend
        dailyTrend: [
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$metadata.createdAt' }
              },
              count: { $sum: 1 },
              converted: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'converted'] }, 1, 0]
                }
              }
            }
          },
          { $sort: { '_id': 1 } }
        ]
      }
    }
  ]);
  
  return {
    timeframe,
    totals: {
      all: stats[0]?.conversionStats[0]?.total || 0,
      converted: stats[0]?.conversionStats[0]?.converted || 0,
      conversionRate: stats[0]?.conversionStats[0]?.total > 0 
        ? parseFloat(((stats[0]?.conversionStats[0]?.converted / stats[0]?.conversionStats[0]?.total) * 100).toFixed(2))
        : 0,
      revenue: stats[0]?.conversionStats[0]?.revenue || 0
    },
    byStatus: stats[0]?.byStatus || [],
    bySource: stats[0]?.bySource || [],
    scoreDistribution: stats[0]?.scoreDistribution || [],
    dailyTrend: stats[0]?.dailyTrend || []
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

const MarketingLead = mongoose.models.MarketingLead || mongoose.model('MarketingLead', marketingLeadSchema);

export default MarketingLead;