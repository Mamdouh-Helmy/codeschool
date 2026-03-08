// /src/app/services/whatsapp-templates-data.js
// ✅ فايل منفصل للـ confirmation templates الافتراضية
// مستورد في الـ webhook مباشرة — مش في route.js عشان Next.js مش بيسمح بـ named exports هناك

export const CONFIRMATION_TEMPLATES = {
  student: {
    ar: `✅ تم تأكيد اللغة المفضلة

{salutation_ar}،

تم تعيين *اللغة العربية* كلغة التواصل الرسمية معك.

📌 ماذا يحدث الآن؟
- جميع الرسائل القادمة ستكون بالعربية
- المحتوى التعليمي والدعم سيكون متاحاً بالعربية

نحن متحمسون لوجودك معنا! 🚀

مع أطيب التحيات،
فريق Code School 💻

🌍 شكراً لاختيارك Code School`,

    en: `✅ Language Preference Confirmed

{salutation_en},

Your preferred language has been set to *English*.

📌 What happens next?
- All future messages will be sent in English
- Course materials and support will be available in English

We're excited to have you on board! 🚀

Best regards,
The Code School Team 💻

🌍 Thank you for choosing Code School`,
  },

  guardian: {
    ar: `{guardianSalutation_ar}،

يسعدنا إبلاغكم بأن {studentGender_ar} **{studentName_ar}** قام/ت باختيار *اللغة العربية* كلغة مفضلة للتواصل بنجاح.

📌 ماذا يعني هذا؟
- جميع الرسائل القادمة لـ{studentGender_ar} ستكون باللغة العربية

شكراً لثقتكم المستمرة في Code School.

مع أطيب التحيات،
فريق Code School 💻`,

    en: `{guardianSalutation_en},

We are pleased to inform you that your {studentGender_en} **{studentName_en}** has successfully selected *English* as their preferred communication language.

📌 What this means?
- All future messages will be sent in English

Thank you for your continued trust in Code School.

Best regards,
The Code School Team 💻`,
  },
};