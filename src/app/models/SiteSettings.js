import mongoose from "mongoose";

const SiteSettingsSchema = new mongoose.Schema(
  {
    // الإعدادات العامة
    siteName: { type: String, required: true, default: "Code School" },
    siteDescription: { type: String, default: "منصة تعليم البرمجة للشباب" },
    siteLogo: { type: String, default: "" },
    favicon: { type: String, default: "" },
    language: { type: String, default: "ar" },
    timezone: { type: String, default: "Africa/Cairo" },
    
    // إعدادات الاتصال
    contactEmail: { type: String, required: true },
    supportEmail: { type: String, default: "" },
    phoneNumber: { type: String, default: "" },
    address: { type: String, default: "" },
    
    // إعدادات الوسائط
    maxFileSize: { type: Number, default: 5 },
    allowedFileTypes: [{ type: String }],
    enableImageCompression: { type: Boolean, default: true },
    
    // إعدادات الأمان
    enableTwoFactor: { type: Boolean, default: false },
    sessionTimeout: { type: Number, default: 60 },
    maxLoginAttempts: { type: Number, default: 5 },
    
    // إعدادات المدفوعات
    currency: { type: String, default: "EGP" },
    taxRate: { type: Number, default: 14 },
    paymentMethods: [{ type: String }],
    
    // إعدادات الإشعارات
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    
    // إعدادات إضافية
    maintenanceMode: { type: Boolean, default: false },
    googleAnalyticsId: { type: String, default: "" },
    facebookPixelId: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.SiteSettings || mongoose.model("SiteSettings", SiteSettingsSchema);