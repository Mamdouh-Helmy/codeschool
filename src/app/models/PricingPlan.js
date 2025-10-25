import mongoose from "mongoose";

const PricingPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    billingPeriod: {
      type: String,
      enum: ["monthly", "quarterly", "yearly"],
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

    // ✅ العلاقات مع المستخدم المسؤول
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.models.PricingPlan ||
  mongoose.model("PricingPlan", PricingPlanSchema);
