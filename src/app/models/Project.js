import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, default: "" },
    video: { type: String, default: "" },
    portfolioLink: { type: String, default: "" },
    technologies: [{ type: String }],
    featured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    student: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      name: { type: String, required: true },
      email: { type: String },
      role: {
        type: String,
        enum: ["admin", "marketing", "student", "instructor"],
        default: "student",
      },
    },
  },
  { timestamps: true }
);


delete mongoose.connection.models.Project;

export default mongoose.models.Project ||
  mongoose.model("Project", ProjectSchema);