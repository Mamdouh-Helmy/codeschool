// models/WebinarRegistration.js
import mongoose from "mongoose";

const WebinarRegistrationSchema = new mongoose.Schema(
  {
    webinar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Webinar",
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    phone: {
      type: String,
      default: ""
    },
    company: {
      type: String,
      default: ""
    },
    jobTitle: {
      type: String,
      default: ""
    },
    questions: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["registered", "attended", "cancelled"],
      default: "registered"
    },
    registrationDate: {
      type: Date,
      default: Date.now
    },
    attendedAt: {
      type: Date
    }
  },
  { 
    timestamps: true 
  }
);

// لمنع التسجيل المكرر لنفس الويبنار
WebinarRegistrationSchema.index({ webinar: 1, email: 1 }, { unique: true });
WebinarRegistrationSchema.index({ user: 1, webinar: 1 }, { unique: true });

export default mongoose.models.WebinarRegistration || 
  mongoose.model("WebinarRegistration", WebinarRegistrationSchema);