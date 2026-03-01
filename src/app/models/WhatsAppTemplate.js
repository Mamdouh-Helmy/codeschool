import mongoose from "mongoose";

const WhatsAppTemplateSchema = new mongoose.Schema(
  {
    templateType: {
      type: String,
      enum: ["student_welcome", "guardian_notification"],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    variables: [
      {
        key: String,
        label: String,
        description: String,
      },
    ],
    usageStats: {
      totalSent: { type: Number, default: 0 },
      lastUsedAt: { type: Date },
    },
    metadata: {
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
  }
);

WhatsAppTemplateSchema.index({ templateType: 1, isActive: 1 });
WhatsAppTemplateSchema.index({ isDefault: 1 });

// ✅ الحل: async بدل next callback
WhatsAppTemplateSchema.pre("save", async function () {
  this.metadata.updatedAt = new Date();
});

WhatsAppTemplateSchema.methods.incrementUsage = async function () {
  this.usageStats.totalSent += 1;
  this.usageStats.lastUsedAt = new Date();
  await this.save();
};

// ✅ الحل: try/catch بدل || للتحقق من الـ model
const WhatsAppTemplate = (() => {
  try {
    return mongoose.model("WhatsAppTemplate");
  } catch {
    return mongoose.model("WhatsAppTemplate", WhatsAppTemplateSchema);
  }
})();

export default WhatsAppTemplate;