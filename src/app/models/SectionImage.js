import mongoose from "mongoose";

const SectionImageSchema = new mongoose.Schema(
  {
    // اسم القسم
    sectionName: { 
      type: String, 
      required: true,
      enum: ["ticket-section", "event-ticket", "hero-section", "about-section", "contact-section"]
    },
    
    // رابط الصورة
    imageUrl: { 
      type: String, 
      required: true 
    },
    
    // النص البديل للصورة
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
    },
    
    // ترتيب العرض
    displayOrder: { 
      type: Number, 
      default: 0 
    }
  },
  { 
    timestamps: true 
  }
);

// إنشاء index للبحث السريع بدون اللغة
SectionImageSchema.index({ sectionName: 1, isActive: 1 });

export default mongoose.models.SectionImage ||
  mongoose.model("SectionImage", SectionImageSchema);