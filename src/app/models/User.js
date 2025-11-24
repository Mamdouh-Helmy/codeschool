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
    username: {
      type: String,
      unique: true,
      sparse: true, // يسمح بقيم null
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
      bio: String,
      jobTitle: String,
      company: String,
      website: String,
      location: String,
      phone: String
    },
    socialLinks: {
      github: String,
      linkedin: String,
      twitter: String,
      facebook: String,
      instagram: String
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

// Index إضافي للـ username للبحث السريع
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });

// Virtual للحصول على profile URL
UserSchema.virtual('profileUrl').get(function() {
  return this.username ? `/portfolio/${this.username}` : null;
});

// Method لتوليد username تلقائياً من الاسم
UserSchema.methods.generateUsername = async function() {
  const baseUsername = this.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 15);
  
  let username = baseUsername;
  let counter = 1;
  
  // التأكد من أن الـ username فريد
  while (await mongoose.models.User.findOne({ username })) {
    username = `${baseUsername}${counter}`;
    counter++;
  }
  
  this.username = username;
  return username;
};

// Method للتحقق من صلاحيات المستخدم
UserSchema.methods.canManagePortfolio = function(portfolioUserId) {
  return this.role === 'admin' || this._id.toString() === portfolioUserId.toString();
};

// Middleware قبل الحفظ - توليد username إذا لم يكن موجود
UserSchema.pre('save', async function(next) {
  if (!this.username && this.name) {
    await this.generateUsername();
  }
  next();
});

console.log("🔧 User Schema loaded with username field");
export default mongoose.models.User || mongoose.model("User", UserSchema);