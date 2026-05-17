import mongoose from "mongoose";

const WhatsAppTemplateInstructorSchema = new mongoose.Schema(
  {
    templateType: {
      type: String,
      enum: ["group_activation", "reminder_24h", "reminder_15min"],
      required: true,
      default: "group_activation",
    },
    name: {
      type: String,
      required: true,
      trim: true,
      default: "قالب تفعيل المجموعة للمدرب",
    },
    contentAr: {
      type: String,
      required: true,
    },
    contentEn: {
      type: String,
      required: true,
    },
    content: {
      type: String,
    },
    description: {
      type: String,
      default: "رسالة إخطار المدرب",
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

WhatsAppTemplateInstructorSchema.pre("save", async function () {
  this.metadata.updatedAt = new Date();
  this.content = this.contentAr;
});

WhatsAppTemplateInstructorSchema.methods.incrementUsage = async function () {
  this.usageStats.totalSent += 1;
  this.usageStats.lastUsedAt = new Date();
  await this.save();
};

const WhatsAppTemplateInstructor = (() => {
  try {
    return mongoose.model("WhatsAppTemplateInstructor");
  } catch {
    return mongoose.model("WhatsAppTemplateInstructor", WhatsAppTemplateInstructorSchema);
  }
})();

export default WhatsAppTemplateInstructor;