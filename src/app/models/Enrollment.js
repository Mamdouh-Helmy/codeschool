// models/Enrollment.js
import mongoose from 'mongoose';

const EnrollmentSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stage_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CurriculumStage',
    required: true
  },
  child_name: {
    type: String,
    required: true
  },
  child_age: {
    type: Number,
    required: true
  },
  parent_email: {
    type: String,
    required: true
  },
  parent_phone: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled'],
    default: 'pending'
  },
  enrolled_at: {
    type: Date,
    default: Date.now
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, { timestamps: true });

// لمنع الاشتراك المكرر في نفس المرحلة
EnrollmentSchema.index({ user_id: 1, stage_id: 1 }, { unique: true });

export default mongoose.models.Enrollment || 
  mongoose.model('Enrollment', EnrollmentSchema);