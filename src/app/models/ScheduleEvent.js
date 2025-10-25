import mongoose from "mongoose";

const ScheduleEventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    date: { type: String, required: true },
    time: { type: String, required: true },
    duration: { type: Number, default: 60 },
    image: { type: String, default: "" },
    location: { type: String, default: "" },
    speakers: [{ 
      name: String, 
      role: String, 
      image: String 
    }],
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.models.ScheduleEvent ||
  mongoose.model("ScheduleEvent", ScheduleEventSchema);