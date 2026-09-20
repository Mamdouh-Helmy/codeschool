import mongoose from "mongoose";

const WhatsAppTemplateAddGroupSchema = new mongoose.Schema(
  {
    templateType: {
      type: String,
      // ✅ ضيفنا group_welcome_offline
      enum: ["student_welcome", "guardian_notification", "group_welcome", "group_welcome_offline"],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    studentContentAr: {
      type: String,
      default: "",
    },
    studentContentEn: {
      type: String,
      default: "",
    },
    guardianContentAr: {
      type: String,
      default: "",
    },
    guardianContentEn: {
      type: String,
      default: "",
    },
    // ✅ للتوافق مع الكود القديم
    content: {
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

WhatsAppTemplateAddGroupSchema.index({ templateType: 1, isActive: 1 });
WhatsAppTemplateAddGroupSchema.index({ isDefault: 1 });

WhatsAppTemplateAddGroupSchema.pre("save", async function () {
  this.metadata.updatedAt = new Date();
  // sync content مع رسالة الطالب العربي كـ default للتوافق
  if (this.studentContentAr) this.content = this.studentContentAr;
});

WhatsAppTemplateAddGroupSchema.methods.incrementUsage = async function () {
  this.usageStats.totalSent += 1;
  this.usageStats.lastUsedAt = new Date();
  await this.save();
};

const WhatsAppTemplateAddGroup = (() => {
  try {
    return mongoose.model("WhatsAppTemplateAddGroup");
  } catch {
    return mongoose.model("WhatsAppTemplateAddGroup", WhatsAppTemplateAddGroupSchema);
  }
})();

export default WhatsAppTemplateAddGroup;