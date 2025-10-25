import mongoose from "mongoose";

const EventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },

    date: { type: String, required: true }, 
    time: { type: String, required: true },
    duration: { type: Number, default: 60 },

    location: { type: String, default: "" },
    image: { type: String, default: "" },

    tags: [{ type: String }],

    
    instructor: { type: String, default: "" },
    instructorImage: { type: String, default: "" },

    crmRegistrationUrl: { type: String, default: "" },
    isActive: { type: Boolean, default: true },

    maxAttendees: { type: Number, default: 100 },
    currentAttendees: { type: Number, default: 0 },

    registrationStart: { type: Date },
    registrationEnd: { type: Date },

    speakers: [{ name: String, role: String, image: String }],

  
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.models.Event || mongoose.model("Event", EventSchema);
