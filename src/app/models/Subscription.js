import mongoose from "mongoose";

const SubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PricingPlan",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "cancelled", "expired"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    paymentMethod: { type: String, default: "manual" },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    invoiceNumber: { type: String, unique: true },
    totalAmount: { type: Number, default: 0 },
    currency: { 
      type: String, 
      default: "USD",
      enum: ["USD", "EUR", "EGP"] // تحديد العملات المتاحة
    },
    studentCount: { type: Number, default: 1 },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Subscription ||
  mongoose.model("Subscription", SubscriptionSchema);