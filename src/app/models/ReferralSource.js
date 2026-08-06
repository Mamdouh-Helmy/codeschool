// models/ReferralSource.js
import mongoose from "mongoose";

const referralSourceSchema = new mongoose.Schema(
  {
    // النص اللي بيظهر للمستخدم في الـ select، زي "TED Talk" أو "Instagram"
    label: {
      type: String,
      required: [true, "Label is required"],
      trim: true,
      maxlength: [60, "Label cannot exceed 60 characters"],
    },
    // قيمة تقنية فريدة تستخدم داخليًا (lowercase، بدون مسافات)
    value: {
      type: String,
      required: [true, "Value is required"],
      trim: true,
      lowercase: true,
      unique: true,
      match: [
        /^[a-z0-9_-]+$/,
        "Value can only contain lowercase letters, numbers, - and _",
      ],
    },
    // الأدمن يقدر يوقف مصدر من غير ما يمسحه (يفضل موجود في المستخدمين القدام)
    isActive: {
      type: Boolean,
      default: true,
    },
    // ترتيب الظهور في الـ select
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

referralSourceSchema.index({ isActive: 1, order: 1 });

export default mongoose.models.ReferralSource ||
  mongoose.model("ReferralSource", referralSourceSchema);