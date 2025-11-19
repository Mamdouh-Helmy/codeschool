// models/CurriculumStage.js
import mongoose from 'mongoose';

const CurriculumStageSchema = new mongoose.Schema({
  age_category_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'AgeCategory',
    required: true 
  },
  age_range: { 
    type: {
      en: { type: String, required: true },
      ar: { type: String, required: true }
    },
    required: true 
  },
  name_en: { type: String, required: true },  // من AgeCategory
  name_ar: { type: String, required: true },  // من AgeCategory
  title_en: { type: String, required: true }, // عنوان الـ stage نفسه
  title_ar: { type: String, required: true }, // عنوان الـ stage نفسه
  platform: { type: String, required: true }, // "Code.org", "Scratch", etc.
  language_type: { 
    type: {
      en: { type: String, required: true },
      ar: { type: String, required: true }
    },
    required: true 
  },
  duration: { type: String, required: true }, // "4 weeks", "6 months"
  lessons_count: { type: Number, required: true },
  projects_count: { type: Number, required: true },
  description_en: { type: String, required: true },
  description_ar: { type: String, required: true },
  media_url: { type: String }, // image or video URL
  order_index: { type: Number, required: true } // 1-6
}, { timestamps: true });

export default mongoose.models.CurriculumStage || 
  mongoose.model('CurriculumStage', CurriculumStageSchema);