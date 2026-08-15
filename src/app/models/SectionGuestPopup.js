import mongoose from "mongoose";

const SectionGuestPopupSchema = new mongoose.Schema(
  {
    titleAr: { type: String, default: "شوف ملفك وهو" },
    titleAccentAr: { type: String, default: "بيتوثّق" },
    subtitle1Ar: {
      type: String,
      default:
        "يسعدنا الانضمام للأسبقين في تأسيس الـ Personal Portfolio الخاص بك.",
    },
    subtitle2Ar: {
      type: String,
      default:
        "منصة مصممة خصيصًا لتعكس خبراتك وتبرز مهاراتك بشكل احترافي، يسهل مشاركتها مع شبكة علاقاتك أو جهات عمل مستقبلية.",
    },
    point1TitleAr: { type: String, default: "مسار مهني منظم" },
    point1Ar: {
      type: String,
      default: "قدّم نفسك بشكل معتمد وموثوق في مجالك.",
    },
    point2TitleAr: { type: String, default: "أدوات عرض ذكية" },
    point2Ar: { type: String, default: "أبرز إنجازاتك بأفضل صورة ممكنة." },
    ctaAr: {
      type: String,
      default: "ابدأ في إضافة بياناتك وتحديث مسارك المهني",
    },
    buttonAr: { type: String, default: "ابدأ بناء ملفك الشخصي" },
    tag1Ar: { type: String, default: "مهارة" },
    tag2Ar: { type: String, default: "مهارة" },
    tag3Ar: { type: String, default: "+٥" },
    liveAr: { type: String, default: "موثّق" },

    titleEn: { type: String, default: "Watch your profile" },
    titleAccentEn: { type: String, default: "get verified" },
    subtitle1En: {
      type: String,
      default:
        "We're excited to have you among the first to build your Personal Portfolio.",
    },
    subtitle2En: {
      type: String,
      default:
        "A platform designed to reflect your experience and highlight your skills professionally — easy to share with your network or future employers.",
    },
    point1TitleEn: { type: String, default: "A career, organized" },
    point1En: {
      type: String,
      default: "Present yourself as a credible, verified expert in your field.",
    },
    point2TitleEn: { type: String, default: "Smart showcase tools" },
    point2En: {
      type: String,
      default: "Highlight your achievements in the best possible light.",
    },
    ctaEn: {
      type: String,
      default: "Start adding your info and updating your career path.",
    },
    buttonEn: { type: String, default: "Build My Portfolio" },
    tag1En: { type: String, default: "Skill" },
    tag2En: { type: String, default: "Skill" },
    tag3En: { type: String, default: "+5" },
    liveEn: { type: String, default: "Verified" },

    buttonLink: { type: String, default: "/portfolio/builder" },
    stampLogoUrl: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

delete mongoose.models?.SectionGuestPopup;

export default mongoose.model("SectionGuestPopup", SectionGuestPopupSchema);
