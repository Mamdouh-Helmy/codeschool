import mongoose from "mongoose";

const BlogSubscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastNotified: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Index for better query performance
BlogSubscriberSchema.index({ email: 1 });
BlogSubscriberSchema.index({ isActive: 1 });

export default mongoose.models.BlogSubscriber ||
  mongoose.model("BlogSubscriber", BlogSubscriberSchema);