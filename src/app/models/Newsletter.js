import mongoose from "mongoose";

const NewsletterSchema = new mongoose.Schema(
  {
    email: { 
      type: String, 
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    isActive: { type: Boolean, default: true },
    subscribedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// تجنب مشاكل ال hot-reload في Next.js
delete mongoose.connection.models?.Newsletter;

export default mongoose.models.Newsletter ||
  mongoose.model("Newsletter", NewsletterSchema);