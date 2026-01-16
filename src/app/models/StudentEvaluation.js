// models/StudentEvaluation.js - UPDATED
import mongoose from 'mongoose';

const evaluationCriteriaSchema = new mongoose.Schema({
  understanding: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
    validate: {
      validator: Number.isInteger,
      message: 'Understanding score must be an integer'
    }
  },
  commitment: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
    validate: {
      validator: Number.isInteger,
      message: 'Commitment score must be an integer'
    }
  },
  attendance: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
    validate: {
      validator: Number.isInteger,
      message: 'Attendance score must be an integer'
    }
  },
  participation: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
    validate: {
      validator: Number.isInteger,
      message: 'Participation score must be an integer'
    }
  }
}, { _id: false });

const studentEvaluationSchema = new mongoose.Schema({
  // العلاقات
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  instructorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // التقييمات
  criteria: {
    type: evaluationCriteriaSchema,
    required: true
  },

  // النتيجة النهائية
  finalDecision: {
    type: String,
    enum: ['pass', 'review', 'repeat'],
    required: true
  },

  // الملاحظات الإضافية
  notes: {
    type: String,
    trim: true,
    maxlength: 2000
  },

  // نقاط الضعف (مستخرجة من الملاحظات)
  weakPoints: [{
    type: String,
    enum: ['understanding', 'practice', 'attendance', 'participation', 'homework', 'projects']
  }],

  // نقاط القوة
  strengths: [{
    type: String,
    enum: ['fast_learner', 'hard_worker', 'team_player', 'creative', 'problem_solver', 'consistent']
  }],

  // الإحصائيات المحسوبة
  calculatedStats: {
    overallScore: {
      type: Number,
      min: 1,
      max: 5,
      default: 0
    },
    attendancePercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    completedSessions: {
      type: Number,
      default: 0
    },
    totalSessions: {
      type: Number,
      default: 0
    }
  },

  // Marketing Metadata
  marketing: {
    followupStatus: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed', 'skipped'],
      default: 'pending'
    },
    followupCampaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MarketingCampaign'
    },
    followupActions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MarketingAction'
    }],
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
        'intensive_support',  // ✅ تم الإضافة
        'extra_practice',     // ✅ تم الإضافة
        'referral_program',   // ✅ تم الإضافة
        'feedback_session',   // ✅ تم الإضافة
        'one_on_one_coaching' // ✅ تم الإضافة
      ]
    }],
    aiAnalysis: {
      summary: String,
      suggestedMessage: String,
      priority: {
        type: String,
        enum: ['high', 'medium', 'low']
      },
      generatedAt: Date
    }
  },

  // Metadata
  metadata: {
    evaluatedAt: {
      type: Date,
      default: Date.now
    },
    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastModifiedAt: {
      type: Date,
      default: Date.now
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    automationTriggered: {
      type: Boolean,
      default: false
    },
    automationTriggeredAt: Date,
    marketingNotified: {
      type: Boolean,
      default: false
    },
    marketingNotifiedAt: Date
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

// Indexes
studentEvaluationSchema.index({ groupId: 1, studentId: 1 }, { unique: true });
studentEvaluationSchema.index({ instructorId: 1 });
studentEvaluationSchema.index({ finalDecision: 1 });
studentEvaluationSchema.index({ 'metadata.evaluatedAt': -1 });
studentEvaluationSchema.index({ 'marketing.followupStatus': 1 });
studentEvaluationSchema.index({ 'marketing.studentCategory': 1 });

// Pre-save middleware لحساب الإحصائيات وتحديد الفئة
studentEvaluationSchema.pre('save', async function(next) {
  try {
    // حساب المعدل العام
    const scores = [
      this.criteria.understanding,
      this.criteria.commitment,
      this.criteria.attendance,
      this.criteria.participation
    ];
    this.calculatedStats.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10;

    // تحليل الملاحظات لتحديد نقاط الضعف
    await this.analyzeNotes();

    // تحديد فئة الطالب بناءً على القرار النهائي
    this.determineStudentCategory();

    next();
  } catch (error) {
    next(error);
  }
});

// Method لتحليل الملاحظات
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

  // البحث عن نقاط الضعف
  Object.entries(weakKeywords).forEach(([category, keywords]) => {
    keywords.forEach(keyword => {
      if (this.notes.includes(keyword) && !this.weakPoints.includes(category)) {
        this.weakPoints.push(category);
      }
    });
  });

  // البحث عن نقاط القوة
  Object.entries(strengthKeywords).forEach(([category, keywords]) => {
    keywords.forEach(keyword => {
      if (this.notes.includes(keyword) && !this.strengths.includes(category)) {
        this.strengths.push(category);
      }
    });
  });
};

// Method لتحديد فئة الطالب
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

// Method لتحليل AI
studentEvaluationSchema.methods.generateAIAnalysis = function() {
  const analysis = {
    summary: '',
    suggestedMessage: '',
    priority: 'medium'
  };

  const studentName = '{{studentName}}'; // سيتم استبداله لاحقاً
  const courseName = '{{courseName}}';

  switch (this.marketing.studentCategory) {
    case 'star_student':
      analysis.summary = 'طالب متميز بأداء عالٍ ونقاط قوة واضحة. مناسب للترقية ولبرنامج الإحالات.';
      analysis.suggestedMessage = `🎉 مبروك ${studentName}!
أداؤك في ${courseName} كان استثنائياً! 🏆
مستعد للتحدي القادم? عندنا ${courseName} المتقدم بخصم 20% لك.
أنت أيضاً مؤهل لبرنامج الإحالات الخاص بنا!`;
      analysis.priority = 'high';
      break;

    case 'ready_for_next_level':
      analysis.summary = 'طالب مؤهل للانتقال للمستوى التالي مع بعض نقاط التحسين.';
      analysis.suggestedMessage = `👍 أحسنت ${studentName}!
أكملت ${courseName} بنجاح 🎓
مستعد للمستوى التالي? عندك خصم 15% على التسجيل المبكر.
نصيحة: ركز أكثر على ${this.weakPoints[0] || 'الممارسة العملية'}`;
      analysis.priority = 'medium';
      break;

    case 'needs_support':
      analysis.summary = `طالب بحاجة لدعم في: ${this.weakPoints.join(', ')}`;
      analysis.suggestedMessage = `👋 ${studentName}، أداؤك جيد!
لكن محتاج تدعيم في: ${this.weakPoints.map(wp => {
        const map = {
          understanding: 'الفهم',
          practice: 'الممارسة',
          attendance: 'الحضور',
          participation: 'المشاركة',
          homework: 'الواجبات',
          projects: 'المشاريع'
        };
        return map[wp] || wp;
      }).join(' و ')}
عندنا جلسات دعم مجانية الأسبوع الجاي!`;
      analysis.priority = 'medium';
      break;

    case 'at_risk':
      analysis.summary = 'طالب معرض للخروج يحتاج تدخل سريع.';
      analysis.suggestedMessage = `🔔 ${studentName}، عندنا خطة خاصة لك!
نعرف إن ${courseName} كان تحدياً.
بنقترح: جلسات دعم مكثفة + مراجعة المشاريع
بخصم 30% للاستمرار معنا!`;
      analysis.priority = 'high';
      break;

    case 'needs_repeat':
      analysis.summary = 'طالب يحتاج إعادة الكورس مع دعم إضافي.';
      analysis.suggestedMessage = `🔄 ${studentName}، علشان تستفيد 100%
بنقترح إعادة ${courseName} مع:
• دعم إضافي شخصي
• خصم 40% على الإعادة
• مراجعة جميع المشاريع
مستعد للانطلاق من جديد?`;
      analysis.priority = 'high';
      break;
  }

  this.marketing.aiAnalysis = {
    ...analysis,
    generatedAt: new Date()
  };

  return analysis;
};

// Static Method للحصول على إحصائيات المجموعة
studentEvaluationSchema.statics.getGroupStats = async function(groupId) {
  const evaluations = await this.find({ groupId, isDeleted: false })
    .populate('studentId', 'personalInfo.fullName enrollmentNumber')
    .lean();

  if (evaluations.length === 0) {
    return {
      total: 0,
      evaluated: 0,
      pending: 0,
      decisions: { pass: 0, review: 0, repeat: 0 },
      categories: {
        ready_for_next_level: 0,
        needs_support: 0,
        needs_repeat: 0,
        at_risk: 0,
        star_student: 0
      },
      averageScores: {}
    };
  }

  const stats = {
    total: evaluations.length,
    evaluated: evaluations.length,
    pending: 0,
    decisions: {
      pass: evaluations.filter(e => e.finalDecision === 'pass').length,
      review: evaluations.filter(e => e.finalDecision === 'review').length,
      repeat: evaluations.filter(e => e.finalDecision === 'repeat').length
    },
    categories: {
      ready_for_next_level: evaluations.filter(e => e.marketing?.studentCategory === 'ready_for_next_level').length,
      needs_support: evaluations.filter(e => e.marketing?.studentCategory === 'needs_support').length,
      needs_repeat: evaluations.filter(e => e.marketing?.studentCategory === 'needs_repeat').length,
      at_risk: evaluations.filter(e => e.marketing?.studentCategory === 'at_risk').length,
      star_student: evaluations.filter(e => e.marketing?.studentCategory === 'star_student').length
    },
    averageScores: {
      understanding: 0,
      commitment: 0,
      attendance: 0,
      participation: 0,
      overall: 0
    }
  };

  // حساب المتوسطات
  evaluations.forEach(evaluation => {
    stats.averageScores.understanding += evaluation.criteria.understanding;
    stats.averageScores.commitment += evaluation.criteria.commitment;
    stats.averageScores.attendance += evaluation.criteria.attendance;
    stats.averageScores.participation += evaluation.criteria.participation;
    stats.averageScores.overall += evaluation.calculatedStats.overallScore;
  });

  Object.keys(stats.averageScores).forEach(key => {
    stats.averageScores[key] = parseFloat((stats.averageScores[key] / evaluations.length).toFixed(2));
  });

  return stats;
};

// Method لتفعيل المتابعة التسويقية
studentEvaluationSchema.methods.triggerMarketingFollowup = async function(userId) {
  try {
    console.log(`🚀 [Marketing Followup] Triggering for student ${this.studentId} with decision: ${this.finalDecision}`);
    
    // توليد تحليل AI
    this.generateAIAnalysis();
    
    // تحديث الحالة
    this.marketing.followupStatus = 'in_progress';
    this.marketing.followupStartedAt = new Date();
    this.metadata.marketingNotified = true;
    this.metadata.marketingNotifiedAt = new Date();
    
    await this.save();
    
    // استدعاء خدمة المتابعة التسويقية
    const { triggerEvaluationFollowup } = await import('../services/marketingAutomation');
    await triggerEvaluationFollowup(this._id, userId);
    
    return {
      success: true,
      message: 'Marketing followup triggered successfully',
      studentCategory: this.marketing.studentCategory,
      aiAnalysis: this.marketing.aiAnalysis
    };
    
  } catch (error) {
    console.error('❌ Error triggering marketing followup:', error);
    this.marketing.followupStatus = 'failed';
    await this.save();
    
    return {
      success: false,
      error: error.message
    };
  }
};

const StudentEvaluation = mongoose.models.StudentEvaluation || mongoose.model('StudentEvaluation', studentEvaluationSchema);

export default StudentEvaluation;