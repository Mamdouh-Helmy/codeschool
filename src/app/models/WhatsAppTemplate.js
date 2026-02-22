import mongoose from "mongoose";

const WhatsAppTemplateSchema = new mongoose.Schema(
  {
    // ✅ نوع القالب
    templateType: {
      type: String,
      enum: ["student_welcome", "guardian_notification"],
      required: true,
    },

    // ✅ اسم القالب
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // ✅ محتوى الرسالة
    content: {
      type: String,
      required: true,
    },

    // ✅ وصف القالب
    description: {
      type: String,
      default: "",
    },

    // ✅ هل القالب نشط؟
    isActive: {
      type: Boolean,
      default: true,
    },

    // ✅ هل هو القالب الافتراضي؟
    isDefault: {
      type: Boolean,
      default: false,
    },

    // ✅ المتغيرات المستخدمة في القالب
    variables: [
      {
        key: String,
        label: String,
        description: String,
      },
    ],

    // ✅ إحصائيات الاستخدام
    usageStats: {
      totalSent: { type: Number, default: 0 },
      lastUsedAt: { type: Date },
    },

    // ✅ metadata
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
  },
);

// ✅ Index للبحث السريع
WhatsAppTemplateSchema.index({ templateType: 1, isActive: 1 });
WhatsAppTemplateSchema.index({ isDefault: 1 });

// ✅ Pre-save middleware
WhatsAppTemplateSchema.pre("save", function (next) {
  this.metadata.updatedAt = new Date();
  next();
});

// ✅ Method لتحديث إحصائيات الاستخدام
WhatsAppTemplateSchema.methods.incrementUsage = async function () {
  this.usageStats.totalSent += 1;
  this.usageStats.lastUsedAt = new Date();
  await this.save();
};

export default mongoose.models.WhatsAppTemplate ||
  mongoose.model("WhatsAppTemplate", WhatsAppTemplateSchema);
