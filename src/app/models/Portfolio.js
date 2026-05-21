// models/Portfolio.js
import mongoose from 'mongoose';

const portfolioSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true
  },
  title: {
    type: String,
    required: [true, 'Portfolio title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  skills: [{
    name: {
      type: String,
      required: [true, 'Skill name is required'],
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
      trim: true,
      default: ''
    },
    icon: {
      type: String,
      default: ''
    }
  }],
  projects: [{
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: ''
    },
    technologies: [{
      type: String,
      trim: true
    }],
    demoUrl: {
      type: String,
      trim: true,
      default: ''
    },
    githubUrl: {
      type: String,
      trim: true,
      default: ''
    },
    images: [{
      url: {
        type: String,
        default: ''
      },
      alt: {
        type: String,
        default: ''
      }
    }],
    featured: {
      type: Boolean,
      default: false
    },
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['completed', 'in-progress', 'planned'],
      default: 'completed'
    }
  }],
  certificates: [{
    title: {
      type: String,
      required: [true, 'Certificate title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters']
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: ''
    },
    image: {
      url: { type: String, default: '' },
      alt: { type: String, default: '' }
    },
    issuer: {
      type: String,
      trim: true,
      default: ''
    },
    issueDate: {
      type: Date,
      default: null
    },
    credentialUrl: {
      type: String,
      trim: true,
      default: ''
    }
  }],
  socialLinks: {
    github: {
      type: String,
      trim: true,
      default: ''
    },
    linkedin: {
      type: String,
      trim: true,
      default: ''
    },
    twitter: {
      type: String,
      trim: true,
      default: ''
    },
    website: {
      type: String,
      trim: true,
      default: ''
    },
    behance: {
      type: String,
      trim: true,
      default: ''
    },
    dribbble: {
      type: String,
      trim: true,
      default: ''
    }
  },
  contactInfo: {
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    location: {
      type: String,
      trim: true,
      default: ''
    }
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  settings: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'blue', 'green'],
      default: 'dark'
    },
    layout: {
      type: String,
      enum: ['standard', 'minimal', 'creative'],
      default: 'standard'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 📌 Indexes
portfolioSchema.index({ isPublished: 1, createdAt: -1 });
portfolioSchema.index({ 'skills.name': 1 });
portfolioSchema.index({ views: -1 });

// 📌 Virtual field for total projects count
portfolioSchema.virtual('projectsCount').get(function() {
  return this.projects?.length || 0;
});

// 📌 Virtual field for total skills count
portfolioSchema.virtual('skillsCount').get(function() {
  return this.skills?.length || 0;
});

// 📌 Virtual field for total certificates count
portfolioSchema.virtual('certificatesCount').get(function() {
  return this.certificates?.length || 0;
});

// 📌 Method to increment views
portfolioSchema.methods.incrementViews = async function() {
  this.views += 1;
  await this.save();
  return this.views;
};

// 📌 Static method to find published portfolios
portfolioSchema.statics.findPublished = function() {
  return this.find({ isPublished: true }).sort({ createdAt: -1 });
};

// 📌 Pre-save middleware to validate data
portfolioSchema.pre('save', function(next) {
  if (this.skills && this.skills.length > 50) {
    return next(new Error('Cannot have more than 50 skills'));
  }

  if (this.projects && this.projects.length > 100) {
    return next(new Error('Cannot have more than 100 projects'));
  }

  if (this.certificates && this.certificates.length > 50) {
    return next(new Error('Cannot have more than 50 certificates'));
  }

  if (this.title) this.title = this.title.trim();
  if (this.description) this.description = this.description.trim();

  next();
});

// Export the model (prevent re-compilation in development)
export default mongoose.models.Portfolio || mongoose.model('Portfolio', portfolioSchema);