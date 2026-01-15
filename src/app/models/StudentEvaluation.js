// models/StudentEvaluation.js
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
    }
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

// Pre-save middleware لحساب الإحصائيات
studentEvaluationSchema.pre('save', function(next) {
  // حساب المعدل العام
  const scores = [
    this.criteria.understanding,
    this.criteria.commitment,
    this.criteria.attendance,
    this.criteria.participation
  ];
  this.calculatedStats.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  
  next();
});

// Middleware لمنع العمليات على المحذوف
studentEvaluationSchema.pre('find', function() {
  this.where({ isDeleted: false });
});

studentEvaluationSchema.pre('findOne', function() {
  this.where({ isDeleted: false });
});

// Method لحذف ناعم
studentEvaluationSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.metadata.lastModifiedAt = new Date();
  this.metadata.lastModifiedBy = userId;
  return this.save();
};

// Method لاستعادة
studentEvaluationSchema.methods.restore = function(userId) {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.metadata.lastModifiedAt = new Date();
  this.metadata.lastModifiedBy = userId;
  return this.save();
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

const StudentEvaluation = mongoose.models.StudentEvaluation || mongoose.model('StudentEvaluation', studentEvaluationSchema);

export default StudentEvaluation;