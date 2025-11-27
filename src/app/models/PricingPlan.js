import mongoose from "mongoose";

const PricingPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    billingPeriod: {
      type: String,
      // ✅ إزالة enum للسماح بأي فترة دفع
      default: "monthly",
    },
    features: [{ type: String }],
    isPopular: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    maxStudents: { type: Number, default: 0 },
    language: { type: String, enum: ["ar", "en"], default: "en" },
    type: { type: String, default: "standard" },
    discount: { type: Number, default: 0 },
    originalPrice: { type: Number },
    
    // ✅ إضافة حقل جديد لتحديد إذا كانت الفترة مخصصة
    isCustomBilling: { type: Boolean, default: false },
    
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// ✅ إضافة index للبحث السريع
PricingPlanSchema.index({ billingPeriod: 1, isActive: 1 });
PricingPlanSchema.index({ isPopular: 1, isActive: 1 });

export default mongoose.models.PricingPlan ||
  mongoose.model("PricingPlan", PricingPlanSchema);