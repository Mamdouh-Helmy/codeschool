import mongoose from "mongoose";

const SectionImageHeroSchema = new mongoose.Schema(
  {
    sectionName: {
      type: String,
      required: true,
      enum: ["hero-section", "welcome-popup"],
      default: "hero-section"
    },
    language: {
      type: String,
      required: true,
      enum: ["ar", "en"],
      default: "ar"
    },
    imageUrl: {
      type: String,
      required: true
    },
    secondImageUrl: {
      type: String,
      default: ""
    },
    imageAlt: {
      type: String,
      default: ""
    },
    secondImageAlt: {
      type: String,
      default: ""
    },
    
    // Hero Section Data
    heroTitle: {
      type: String,
      default: "إطلاق طاقة المبدعين الصغار!"
    },
    heroDescription: { // ← الحقل الجديد
      type: String,
      default: ""
    },
    instructor1: {
      type: String,
      default: "ياسين عبدالله"
    },
    instructor1Role: {
      type: String,
      default: "تعلم الآلة"
    },
    instructor2: {
      type: String,
      default: "فريدة عبدالله"
    },
    instructor2Role: {
      type: String,
      default: "تطوير الويب"
    },
    
    // Welcome Popup Data
    welcomeTitle: {
      type: String,
      default: "Empower Young Minds!"
    },
    welcomeSubtitle1: {
      type: String,
      default: "Transform your child's future with coding"
    },
    welcomeSubtitle2: {
      type: String,
      default: "Get 30% off on all courses"
    },
    welcomeFeature1: {
      type: String,
      default: "130 ألف+ خريج"
    },
    welcomeFeature2: {
      type: String,
      default: "مدربون خبراء"
    },
    welcomeFeature3: {
      type: String,
      default: "تعلم تفاعلي"
    },
    welcomeFeature4: {
      type: String,
      default: "لفترة محدودة فقط"
    },
    welcomeFeature5: {
      type: String,
      default: "جميع الفئات العمرية"
    },
    welcomeFeature6: {
      type: String,
      default: "شهادة معتمدة"
    },
    
    // Numbers
    discount: {
      type: Number,
      default: 30
    },
    happyParents: {
      type: String,
      default: "250"
    },
    graduates: {
      type: String,
      default: "130"
    },
    
    isActive: {
      type: Boolean,
      default: true
    },
    displayOrder: {
      type: Number,
      default: 0
    }
  },
  { 
    timestamps: true
  }
);

// لمنع تكرار النماذج في Next.js
if (mongoose.models && mongoose.models.SectionImageHero) {
  delete mongoose.models.SectionImageHero;
}

export default mongoose.models?.SectionImageHero || 
  mongoose.model("SectionImageHero", SectionImageHeroSchema);