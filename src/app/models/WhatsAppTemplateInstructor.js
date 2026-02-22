// /src/models/WhatsAppTemplateInstructor.js
import mongoose from "mongoose";

const WhatsAppTemplateInstructorSchema = new mongoose.Schema(
  {
    templateType: {
      type: String,
      enum: ["group_activation"],
      required: true,
      default: "group_activation",
    },
    name: {
      type: String,
      required: true,
      trim: true,
      default: "قالب تفعيل المجموعة للمدرب",
    },

    // ✅ محتوى عربي وإنجليزي منفصلين
    contentAr: {
      type: String,
      required: true,
    },
    contentEn: {
      type: String,
      required: true,
    },

    // ✅ للتوافق مع الكود القديم - سيُحدَّث تلقائياً
    content: {
      type: String,
    },

    description: {
      type: String,
      default: "رسالة إخطار المدرب عند تفعيل مجموعة جديدة",
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
        _id: false,
      },
    ],
    usageStats: {
      totalSent: { type: Number, default: 0 },
      lastUsedAt: { type: Date },
    },
    metadata: {
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

WhatsAppTemplateInstructorSchema.index({ templateType: 1, isActive: 1 });
WhatsAppTemplateInstructorSchema.index({ isDefault: 1 });

WhatsAppTemplateInstructorSchema.pre("save", function (next) {
  this.metadata.updatedAt = new Date();
  // ✅ sync content مع العربي كـ default
  this.content = this.contentAr;
  next();
});

WhatsAppTemplateInstructorSchema.methods.incrementUsage = async function () {
  this.usageStats.totalSent += 1;
  this.usageStats.lastUsedAt = new Date();
  await this.save();
};

export default mongoose.models.WhatsAppTemplateInstructor ||
  mongoose.model("WhatsAppTemplateInstructor", WhatsAppTemplateInstructorSchema);