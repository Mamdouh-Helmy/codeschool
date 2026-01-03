import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  street: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  postalCode: { type: String, default: '' },
  country: { type: String, default: '' }
});

const currentCourseSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  enrolledDate: { type: Date, default: Date.now },
  progressPercentage: { type: Number, default: 0, min: 0, max: 100 }
});

const notificationChannelsSchema = new mongoose.Schema({
  email: { type: Boolean, default: true },
  whatsapp: { type: Boolean, default: true },
  sms: { type: Boolean, default: false }
});

const StudentSchema = new mongoose.Schema({
  // Reference to User model (غير إجباري)
  authUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    unique: true,
    sparse: true
  },

  // Auto-generated enrollment number
  enrollmentNumber: {
    type: String,
    unique: true,
    sparse: true
  },

  // Personal Information
  personalInfo: {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required']
    },
    whatsappNumber: {
      type: String,
      required: [true, 'WhatsApp number is required']
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required']
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: [true, 'Gender is required']
    },
    nationalId: {
      type: String,
      required: [true, 'National ID is required'],
      unique: true
    },
    address: addressSchema
  },

  // Guardian Information
  guardianInfo: {
    name: {
      type: String,
      required: [true, 'Guardian name is required']
    },
    relationship: {
      type: String,
      required: [true, 'Relationship is required']
    },
    phone: {
      type: String,
      required: [true, 'Guardian phone is required']
    },
    whatsappNumber: {
      type: String
    },
    email: {
      type: String,
      lowercase: true
    }
  },

  // Enrollment Information
  enrollmentInfo: {
    enrollmentDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['Active', 'Suspended', 'Graduated', 'Dropped'],
      default: 'Active'
    },
    source: {
      type: String,
      enum: ['Website', 'Referral', 'Marketing', 'Walk-in'],
      required: [true, 'Enrollment source is required']
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    }
  },

  // Academic Information
  academicInfo: {
    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Beginner'
    },
    groupIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group'
    }],
    currentCourses: [currentCourseSchema]
  },

  // Communication Preferences
  communicationPreferences: {
    preferredLanguage: {
      type: String,
      enum: ['ar', 'en'],
      default: 'ar'
    },
    notificationChannels: notificationChannelsSchema,
    marketingOptIn: {
      type: Boolean,
      default: true
    }
  },

  // Metadata
  metadata: {
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    // 🔥 حقول WhatsApp الأساسية والمحسنة
    whatsappWelcomeSent: {
      type: Boolean,
      default: false
    },
    whatsappInteractiveSent: {
      type: Boolean,
      default: false
    },
    whatsappButtons: [{
      id: String,
      title: String
    }],
    whatsappSentAt: {
      type: Date
    },
    whatsappMessageId: {
      type: String
    },
    whatsappStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'skipped', 'error', 'resent'],
      default: 'pending'
    },
    whatsappSkipReason: {
      type: String
    },
    whatsappError: {
      type: String
    },
    whatsappErrorAt: {
      type: Date
    },
    whatsappMode: {
      type: String,
      enum: ['production', 'simulation'],
      default: 'simulation'
    },
    whatsappMessagesCount: {
      type: Number,
      default: 0
    },
    
    // 🔥 حقول اختيار اللغة والتفاعل (FIXED!)
    whatsappLanguageSelected: {
      type: Boolean,
      default: false
    },
    whatsappLanguageSelection: {
      type: String,
      // ✅ الحل: إضافة IDs الأزرار إلى enum
      enum: ['1', '2', 'arabic_btn', 'english_btn', null],
      default: null
    },
    whatsappLanguageSelectedAt: {
      type: Date
    },
    whatsappButtonSelected: {
      type: String
    },
    whatsappButtonSelectedAt: {
      type: Date
    },
    whatsappResponseReceived: {
      type: Boolean,
      default: false
    },
    whatsappResponse: {
      type: String
    },
    whatsappResponseAt: {
      type: Date
    },
    
    // 🔥 حقول تأكيد اللغة
    whatsappLanguageConfirmed: {
      type: Boolean,
      default: false
    },
    whatsappLanguageConfirmationAt: {
      type: Date
    },
    whatsappConfirmationSent: {
      type: Boolean,
      default: false
    },
    whatsappConfirmationSentAt: {
      type: Date
    },
    whatsappConfirmationError: {
      type: String
    },
    whatsappConfirmationErrorAt: {
      type: Date
    },
    
    // 🔥 إحصائيات إضافية
    whatsappTotalMessages: {
      type: Number,
      default: 0
    },
    whatsappLastInteraction: {
      type: Date
    },
    whatsappConversationId: {
      type: String
    }
  },

  // Soft delete flag
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true,
  strict: true
});

// Indexes for better performance
StudentSchema.index({ enrollmentNumber: 1 }, { unique: true, sparse: true });
StudentSchema.index({ 'personalInfo.whatsappNumber': 1 });
StudentSchema.index({ 'personalInfo.nationalId': 1 }, { unique: true });
StudentSchema.index({ 'enrollmentInfo.status': 1 });
StudentSchema.index({ 'personalInfo.email': 1 });
StudentSchema.index({ authUserId: 1 }, { unique: true, sparse: true });
StudentSchema.index({ 'metadata.whatsappStatus': 1 });
StudentSchema.index({ 'metadata.whatsappWelcomeSent': 1 });
StudentSchema.index({ 'metadata.whatsappInteractiveSent': 1 });
StudentSchema.index({ 'metadata.whatsappLanguageSelected': 1 });
StudentSchema.index({ 'metadata.whatsappConfirmationSent': 1 });
StudentSchema.index({ 'communicationPreferences.preferredLanguage': 1 });
StudentSchema.index({ 'metadata.whatsappResponseReceived': 1 });
StudentSchema.index({ 'metadata.whatsappButtonSelected': 1 });

// Prevent returning deleted students by default
StudentSchema.pre('find', function() {
  this.where({ isDeleted: false });
});

StudentSchema.pre('findOne', function() {
  this.where({ isDeleted: false });
});

// Update timestamp before save
StudentSchema.pre('save', function(next) {
  this.metadata.updatedAt = Date.now();
  next();
});

// 🔥 Middleware لتحديث الحقول المترابطة
StudentSchema.pre('save', function(next) {
  // إذا تم اختيار اللغة، تحديث الحقول المترابطة
  if (this.metadata.whatsappLanguageSelected && !this.metadata.whatsappLanguageSelectedAt) {
    this.metadata.whatsappLanguageSelectedAt = new Date();
    this.metadata.whatsappResponseReceived = true;
    this.metadata.whatsappResponse = this.metadata.whatsappLanguageSelection;
    this.metadata.whatsappResponseAt = new Date();
  }
  
  // إذا تم الضغط على زر، تحديث الحقول المترابطة
  if (this.metadata.whatsappButtonSelected && !this.metadata.whatsappButtonSelectedAt) {
    this.metadata.whatsappButtonSelectedAt = new Date();
  }
  
  next();
});

export default mongoose.models.Student || mongoose.model('Student', StudentSchema);