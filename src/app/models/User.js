// models/User.js
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true, 
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false, 
    },
    role: {
      type: String,
      enum: ["admin", "marketing", "student", "instructor"],
      default: "student",
    },
    image: {
      type: String,
      default: "/images/default-avatar.jpg",
    },
    qrCode: {
      type: String,
      default: "",
    },
    qrCodeData: {
      type: String,
      default: "",
    }
  },
  { 
    timestamps: true,
    strict: true 
  }
);

console.log("🔧 User Schema loaded with QR fields");
export default mongoose.models.User || mongoose.model("User", UserSchema);