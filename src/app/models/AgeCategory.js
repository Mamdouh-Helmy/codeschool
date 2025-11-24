// models/AgeCategory.js
import mongoose from 'mongoose';

// حذف الموديل من الكاش أولاً
delete mongoose.connection.models['AgeCategory'];

const AgeCategorySchema = new mongoose.Schema({
  age_range: {
    type: {
      en: { 
        type: String, 
        required: true
        // تم إزالة الـ enum للسماح بقيم مخصصة
      },
      ar: { 
        type: String, 
        required: true
        // تم إزالة الـ enum للسماح بقيم مخصصة
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