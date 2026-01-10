// models/Group.js
import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    unique: true,
    default: function() {
      return `GRP-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    }
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  courseSnapshot: {
    type: Object,
    required: true
  },
  instructors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  maxStudents: {
    type: Number,
    required: true,
    min: 1,
    default: 25
  },
  currentStudentsCount: {
    type: Number,
    default: 0
  },
  schedule: {
    startDate: {
      type: Date,
      required: true
    },
    daysOfWeek: {
      type: [{
        type: String,
        enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      }],
      validate: {
        validator: function(days) {
          // ✅ Must have exactly 3 days
          if (!days || days.length !== 3) {
            return false;
          }

          // ✅ Check if first day matches startDate
          if (this.startDate) {
            const startDayIndex = new Date(this.startDate).getDay();
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const expectedFirstDay = dayNames[startDayIndex];
            
            if (!days.includes(expectedFirstDay)) {
              return false;
            }
          }

          return true;
        },
        message: 'Must select exactly 3 days, and first day must match the start date day'
      }
    },
    timeFrom: {
      type: String,
      required: true
    },
    timeTo: {
      type: String,
      required: true
    },
    timezone: {
      type: String,
      default: 'Africa/Cairo'
    }
  },
  pricing: {
    price: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    paymentType: {
      type: String,
      enum: ['full', 'installments'],
      default: 'full'
    },
    installmentPlan: {
      numberOfInstallments: {
        type: Number,
        default: 0
      },
      amountPerInstallment: {
        type: Number,
        default: 0
      }
    }
  },
  automation: {
    whatsappEnabled: {
      type: Boolean,
      default: true
    },
    welcomeMessage: {
      type: Boolean,
      default: true
    },
    reminderEnabled: {
      type: Boolean,
      default: true
    },
    reminderBeforeHours: {
      type: Number,
      default: 24,
      min: 1,
      max: 168
    },
    notifyGuardianOnAbsence: {
      type: Boolean,
      default: true
    },
    notifyOnSessionUpdate: {
      type: Boolean,
      default: true
    },
    completionMessage: {
      type: Boolean,
      default: true
    }
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'cancelled'],
    default: 'draft'
  },
  sessionsGenerated: {
    type: Boolean,
    default: false
  },
  totalSessionsCount: {
    type: Number,
    default: 0
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    deletedAt: Date
  }
}, {
  timestamps: true
});

// Middleware لتحديث updatedAt
groupSchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  next();
});

// ✅ Validate schedule before saving
groupSchema.pre('save', function(next) {
  if (this.schedule && this.schedule.startDate && this.schedule.daysOfWeek) {
    const startDayIndex = new Date(this.schedule.startDate).getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const expectedFirstDay = dayNames[startDayIndex];

    if (!this.schedule.daysOfWeek.includes(expectedFirstDay)) {
      return next(new Error(`First selected day must be ${expectedFirstDay} (based on start date)`));
    }

    if (this.schedule.daysOfWeek.length !== 3) {
      return next(new Error('Must select exactly 3 days for the schedule'));
    }
  }

  next();
});

// إنشاء index لتحسين الأداء
groupSchema.index({ code: 1 }, { unique: true });
groupSchema.index({ courseId: 1 });
groupSchema.index({ status: 1 });
groupSchema.index({ 'schedule.startDate': 1 });

// Ensure the model exists
const Group = mongoose.models.Group || mongoose.model('Group', groupSchema);

export default Group;