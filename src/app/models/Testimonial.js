import mongoose from "mongoose";

const TestimonialSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    studentName: { type: String, required: true },
    studentImage: { type: String, default: "" },
    courseId: { type: String, default: "" },
    courseTitle: { type: String, default: "" },
    rating: { type: Number, default: 5 },
    comment: { type: String, required: true },
    featured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Testimonial ||
  mongoose.model("Testimonial", TestimonialSchema);
