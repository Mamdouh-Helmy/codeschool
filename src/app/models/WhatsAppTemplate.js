import mongoose from "mongoose";

const WhatsAppTemplateSchema = new mongoose.Schema(
  {
    templateType: {
      type: String,
      enum: [
        "student_welcome",
        "guardian_notification",
        "student_language_confirmation",
        "guardian_language_confirmation",
      ],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // ✅ content = الـ AR للـ legacy fallback (الـ webhook القديم)
    content: {
      type: String,
      required: true,
    },
    // ✅ contentAr و contentEn — مستخدمين في قوالب تأكيد اللغة
    // الـ webhook الجديد بيختار الـ content المناسب بناءً على selectedLanguage
    contentAr: {
      type: String,
      default: "",
    },
    contentEn: {
      type: String,
      default: "",
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

WhatsAppTemplateSchema.pre("save", async function () {
  this.metadata.updatedAt = new Date();

  // ✅ auto-sync: لو contentAr فارغ يتملى من content
  if (!this.contentAr && this.content) {
    this.contentAr = this.content;
  }
});

WhatsAppTemplateSchema.methods.incrementUsage = async function () {
  this.usageStats.totalSent += 1;
  this.usageStats.lastUsedAt = new Date();
  await this.save();
};

const WhatsAppTemplate = (() => {
  try {
    return mongoose.model("WhatsAppTemplate");
  } catch {
    return mongoose.model("WhatsAppTemplate", WhatsAppTemplateSchema);
  }
})();

export default WhatsAppTemplate;