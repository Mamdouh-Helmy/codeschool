import mongoose from "mongoose";

const SectionImageHeroSchema = new mongoose.Schema(
  {
    language: {
      type: String,
      required: true,
      enum: ["ar", "en"],
      default: "ar"
    },
    
    // الصور
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
    
    // بيانات الهيرو (عربي)
    heroTitleAr: {
      type: String,
      default: "إطلاق طاقة المبدعين الصغار!"
    },
    heroDescriptionAr: {
      type: String,
      default: ""
    },
    instructor1Ar: {
      type: String,
      default: "ياسين عبدالله"
    },
    instructor1RoleAr: {
      type: String,
      default: "تعلم الآلة"
    },
    instructor2Ar: {
      type: String,
      default: "فريدة عبدالله"
    },
    instructor2RoleAr: {
      type: String,
      default: "تطوير الويب"
    },
    
    // بيانات الهيرو (انجليزي)
    heroTitleEn: {
      type: String,
      default: "Empower Young Minds!"
    },
    heroDescriptionEn: {
      type: String,
      default: ""
    },
    instructor1En: {
      type: String,
      default: "Yassin Abdullah"
    },
    instructor1RoleEn: {
      type: String,
      default: "Machine Learning"
    },
    instructor2En: {
      type: String,
      default: "Farida Abdullah"
    },
    instructor2RoleEn: {
      type: String,
      default: "Web Development"
    },
    
    // بيانات Welcome Popup (عربي)
    welcomeTitleAr: {
      type: String,
      default: "ارتقِ بعقول الشباب!"
    },
    welcomeSubtitle1Ar: {
      type: String,
      default: "حوّل مستقبل طفلك مع البرمجة"
    },
    welcomeSubtitle2Ar: {
      type: String,
      default: "احصل على خصم 30% على جميع الدورات"
    },
    welcomeFeature1Ar: {
      type: String,
      default: "130 ألف+ خريج"
    },
    welcomeFeature2Ar: {
      type: String,
      default: "مدربون خبراء"
    },
    welcomeFeature3Ar: {
      type: String,
      default: "تعلم تفاعلي"
    },
    welcomeFeature4Ar: {
      type: String,
      default: "لفترة محدودة فقط"
    },
    welcomeFeature5Ar: {
      type: String,
      default: "جميع الفئات العمرية"
    },
    welcomeFeature6Ar: {
      type: String,
      default: "شهادة معتمدة"
    },
    
    // بيانات Welcome Popup (انجليزي)
    welcomeTitleEn: {
      type: String,
      default: "Empower Young Minds!"
    },
    welcomeSubtitle1En: {
      type: String,
      default: "Transform your child's future with coding"
    },
    welcomeSubtitle2En: {
      type: String,
      default: "Get 30% off on all courses"
    },
    welcomeFeature1En: {
      type: String,
      default: "130K+ Graduates"
    },
    welcomeFeature2En: {
      type: String,
      default: "Expert Trainers"
    },
    welcomeFeature3En: {
      type: String,
      default: "Interactive Learning"
    },
    welcomeFeature4En: {
      type: String,
      default: "Limited Time Only"
    },
    welcomeFeature5En: {
      type: String,
      default: "All Age Groups"
    },
    welcomeFeature6En: {
      type: String,
      default: "Certified Certificate"
    },
    
    // Numbers - نفس القيم للغتين
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