import mongoose from "mongoose";

const ContactSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: "" },
    specialist: { type: String, default: "" },
    date: { type: Date, default: null },
    time: { type: String, default: "" },
    message: { type: String, default: "" },
    appointmentType: { 
      type: String, 
      enum: ["consultation", "technical", "admission", "other"],
      default: "consultation" 
    },
    status: { 
      type: String, 
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending" 
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// تجنب مشاكل ال hot-reload في Next.js
delete mongoose.connection.models?.Contact;

export default mongoose.models.Contact ||
  mongoose.model("Contact", ContactSchema);