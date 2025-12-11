// models/User.js - الإصدار المبسط
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
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores']
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
    },
    profile: {
      bio: {
        type: String,
        default: ""
      },
      jobTitle: {
        type: String,
        default: "Developer"
      },
      company: {
        type: String,
        default: ""
      },
      website: {
        type: String,
        default: ""
      },
      location: {
        type: String,
        default: ""
      },
      phone: {
        type: String,
        default: ""
      }
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { 
    timestamps: true,
    strict: true 
  }
);

// إنشاء indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true, sparse: true });

// Virtual للحصول على profile URL
UserSchema.virtual('profileUrl').get(function() {
  return this.username ? `/portfolio/${this.username}` : null;
});

console.log("✅ User Schema loaded successfully (SIMPLIFIED VERSION)");
export default mongoose.models.User || mongoose.model("User", UserSchema);