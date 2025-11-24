// models/Portfolio.js
import mongoose from 'mongoose';

const portfolioSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // كل user له portfolio واحد فقط
  },
  title: {
    type: String,
    required: [true, 'Portfolio title is required'],
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  skills: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    level: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    category: {
      type: String,
      trim: true
    },
    icon: String
  }],
  projects: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      maxlength: 1000
    },
    technologies: [String],
    demoUrl: String,
    githubUrl: String,
    images: [{
      url: String,
      alt: String
    }],
    featured: {
      type: Boolean,
      default: false
    },
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['completed', 'in-progress', 'planned'],
      default: 'completed'
    }
  }],
  socialLinks: {
    github: String,
    linkedin: String,
    twitter: String,
    website: String,
    behance: String,
    dribbble: String
  },
  contactInfo: {
    email: String,
    phone: String,
    location: String
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  settings: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'blue', 'green'],
      default: 'light'
    },
    layout: {
      type: String,
      enum: ['standard', 'minimal', 'creative'],
      default: 'standard'
    }
  }
}, {
  timestamps: true
});

// Index للمستخدم والسحب العام
portfolioSchema.index({ userId: 1 });
portfolioSchema.index({ isPublished: 1, createdAt: -1 });

export default mongoose.models.Portfolio || mongoose.model('Portfolio', portfolioSchema);