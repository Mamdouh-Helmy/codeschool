import mongoose from "mongoose";

const VerificationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: '10m' }, // ينتهي بعد 10 دقائق تلقائياً
    },
    verified: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
    }
  },
  { timestamps: true }
);

// إنشاء indexes
VerificationSchema.index({ email: 1, otp: 1 });

console.log("✅ Verification Schema loaded successfully");
export default mongoose.models.Verification || mongoose.model("Verification", VerificationSchema);