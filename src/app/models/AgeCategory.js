// models/AgeCategory.js
import mongoose from 'mongoose';

// حذف الموديل من الكاش أولاً
delete mongoose.connection.models['AgeCategory'];

const AgeCategorySchema = new mongoose.Schema({
  age_range: {
    type: {
      en: { 
        type: String, 
        required: true,
        enum: ['6-8 years', '8-10 years', '10-12 years', '12-14 years', '14-16 years', '16-18 years', '18+ years']
      },
      ar: { 
        type: String, 
        required: true,
        enum: ['6-8 سنوات', '8-10 سنوات', '10-12 سنوات', '12-14 سنوات', '14-16 سنوات', '16-18 سنوات', '18+ سنة']
      }
    },
    required: true
  },
  name_en: { 
    type: String, 
    required: true,
    maxlength: 100 
  },
  name_ar: { 
    type: String, 
    required: true,
    maxlength: 100 
  },
  description_en: { 
    type: String, 
    required: true,
    maxlength: 500 
  },
  description_ar: { 
    type: String, 
    required: true,
    maxlength: 500 
  },
  order: { 
    type: Number, 
    required: true,
    min: 1,
    max: 10
  },
  is_active: {
    type: Boolean,
    default: true
  },
  icon: {
    type: String,
    default: '👶'
  }
}, { 
  timestamps: true 
});

export default mongoose.models.AgeCategory || 
  mongoose.model('AgeCategory', AgeCategorySchema);