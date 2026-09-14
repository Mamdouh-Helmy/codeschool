// models/PackagePlan.js
// ✅ باقات الساعات بقت قابلة للتعديل من الأدمن (اسم/شهور/ساعات/سعر) بدل ما كانت
// enum ثابت (3months/6months/9months/12months) جوه Student.js. أي باكدج بتتخصص
// لطالب بتاخد "snapshot" من الباقة وقت الإنشاء (زي courseSnapshot في Group.js)
// عشان لو الأدمن عدّل أو مسح الباقة بعدين، الباكدجات القديمة تفضل زي ما هي.
import mongoose from "mongoose";

const PackagePlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // "باقة 3 شهور"
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    }, // معرف فريد قصير، يستخدم كـ packageType في Student.creditSystem
    months: { type: Number, required: true, min: 1 },
    totalHours: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 }, // السعر الافتراضي (قابل للتعديل وقت التخصيص لطالب معين)
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }, // ترتيب العرض في الدروب داون

    metadata: {
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },
  },
  { timestamps: true },
);

PackagePlanSchema.index({ isActive: 1, order: 1 });

const PackagePlan =
  mongoose.models.PackagePlan || mongoose.model("PackagePlan", PackagePlanSchema);

export default PackagePlan;