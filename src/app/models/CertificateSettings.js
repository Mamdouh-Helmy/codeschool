// /src/app/models/CertificateSettings.js
//
// ✅ Singleton document بيحتفظ بروابط الصور/الشعارات الثابتة اللي بتظهر في
// كل شهادة (badge, logo, stem, iAIDL, finland, kidsafe). لو أي حقل فاضي
// (null)، الشهادة بترجع تستخدم الصورة المحلية الافتراضية من public/images
// زي ما كان شغال قبل كده (راجع utils/certificateHtml.js).
//
// ⚠️ ملحوظة Next.js dev mode: مونجوز بيكاش الموديل في mongoose.models
// باسمه. لو الملف اتحمّل مرة أول قبل ما الـ static method يتضاف (أو أي
// hot-reload حصل في نص التعديل)، mongoose.models.CertificateSettings
// بيفضل يشاور على النسخة القديمة اللي مالهاش getSingleton، وده اللي بيدي
// خطأ "getSingleton is not a function". الحل هنا: في development بس،
// بنحذف الموديل المكاش قبل ما نسجله تاني، عشان يستخدم دايمًا آخر نسخة من
// الـ schema/statics. في production ده مش بيحصل أصلاً لأن السيرفر بيتشغل
// مرة واحدة.

import mongoose from "mongoose";

const CertificateSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    badge: { type: String, default: null },
    logo: { type: String, default: null },
    stem: { type: String, default: null },
    iAIDL: { type: String, default: null },
    finland: { type: String, default: null },
    kidsafe: { type: String, default: null },
  },
  { timestamps: true }
);

// ✅ بيرجع الـ document الوحيد بتاع الإعدادات، ولو مش موجود بيعمله أول مرة
CertificateSettingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({ key: "default" });
  if (!doc) {
    doc = await this.create({ key: "default" });
  }
  return doc;
};

// ✅ في وضع التطوير بس: امسح أي نسخة موديل مكاش قديمة (من hot-reload سابق)
// قبل التسجيل، عشان نضمن إن الـ statics الجديدة (زي getSingleton) موجودة
// دايمًا. في production مش هيتنفذ أصلاً.
if (process.env.NODE_ENV !== "production" && mongoose.models.CertificateSettings) {
  delete mongoose.models.CertificateSettings;
}

export default mongoose.models.CertificateSettings ||
  mongoose.model("CertificateSettings", CertificateSettingsSchema);