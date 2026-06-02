// models/SectionImage.js
import mongoose from "mongoose";

const SectionImageSchema = new mongoose.Schema(
  {
    // اسم القسم
    sectionName: { 
      type: String, 
      required: true,
      enum: ["ticket-section", "event-ticket"]
    },
    
    // رابط الصورة الرئيسية
    imageUrl: { 
      type: String, 
      required: true 
    },
    
    // النص البديل للصورة الرئيسية
    imageAlt: { 
      type: String, 
      required: true 
    },
    
    // وصف إضافي (اختياري)
    description: { 
      type: String, 
      default: "" 
    },
    
    // حالة الصورة (نشطة/غير نشطة)
    isActive: { 
      type: Boolean, 
      default: true 
    }
  },
  { 
    timestamps: true 
  }
);

// إنشاء index للبحث السريع
SectionImageSchema.index({ sectionName: 1, isActive: 1 });

// التأكد من أن الموديل مُسجل بشكل صحيح
export default mongoose.models.SectionImage || mongoose.model("SectionImage", SectionImageSchema);