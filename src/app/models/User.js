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
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address",
      ],
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers and underscores",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },
    gender: {
      type: String,
      enum: {
        values: ["male", "female"],
        message: "{VALUE} is not a valid gender",
      },
      default: undefined,
    },
    language: {
      type: String,
      enum: {
        values: ["ar", "en"],
        message: "{VALUE} is not a valid language",
      },
      default: "ar",
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
        default: "",
      },
      jobTitle: {
        type: String,
        default: "Developer",
      },
      company: {
        type: String,
        default: "",
      },
      website: {
        type: String,
        default: "",
      },
      location: {
        type: String,
        default: "",
      },
      phone: {
        type: String,
        default: "",
      },
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    notificationHistory: [
      {
        groupId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Group",
          default: null,
        },
        groupName: { type: String, default: "" },
        courseName: { type: String, default: "" },
        messageContent: { type: String, default: "" },
        language: {
          type: String,
          enum: ["ar", "en"],
          default: "ar",
        },
        sentAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["sent", "failed"],
          default: "sent",
        },
        failureReason: {
          type: String,
          default: "",
        },
      },
    ],

    metadata: {
      lastGroupNotificationSent: { type: Date, default: null },
      lastNotificationGroupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
        default: null,
      },
    },
  },
  {
    timestamps: true,
    strict: true,
    minimize: false,
  }
);

// ✅ بدون duplicate indexes — email و username معرّفين unique في الـ schema فوق
UserSchema.index({ gender: 1 }, { sparse: true });
UserSchema.index({ language: 1 }, { sparse: true });

UserSchema.virtual("profileUrl").get(function () {
  return this.username ? `/portfolio/${this.username}` : null;
});

UserSchema.virtual("genderAr").get(function () {
  if (!this.gender) return null;
  return this.gender === "male" ? "ذكر" : "أنثى";
});

console.log("✅ User Schema loaded successfully");

if (mongoose.models.User) {
  delete mongoose.models.User;
}

export default mongoose.model("User", UserSchema);