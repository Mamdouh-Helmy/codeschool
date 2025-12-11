// models/ContactMessage.js
import mongoose from "mongoose";

const ContactMessageSchema = new mongoose.Schema(
  {
    portfolioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Portfolio",
      required: true,
    },
    senderInfo: {
      firstName: {
        type: String,
        required: true,
        trim: true,
      },
      lastName: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
      },
      phoneNumber: {
        type: String,
        required: true,
        trim: true,
      },
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    read: {
      type: Boolean,
      default: false,
    },
    replied: {
      type: Boolean,
      default: false,
    },
    archived: {
      type: Boolean,
      default: false,
    },
    spam: {
      type: Boolean,
      default: false,
    },
    // معلومات إضافية
    ipAddress: String,
    userAgent: String,
    referrer: String,
  },
  {
    timestamps: true,
  }
);

// Indexes للبحث السريع
ContactMessageSchema.index({ portfolioId: 1, createdAt: -1 });
ContactMessageSchema.index({ "senderInfo.email": 1 });
ContactMessageSchema.index({ read: 1 });
ContactMessageSchema.index({ createdAt: 1 });

// Virtual لاسم المرسل الكامل
ContactMessageSchema.virtual("senderFullName").get(function () {
  return `${this.senderInfo.firstName} ${this.senderInfo.lastName}`;
});

// Method لتمييز الرسالة كمقروءة
ContactMessageSchema.methods.markAsRead = function () {
  this.read = true;
  return this.save();
};

// Method للرد على الرسالة
ContactMessageSchema.methods.markAsReplied = function () {
  this.replied = true;
  return this.save();
};

// Method لأرشفة الرسالة
ContactMessageSchema.methods.archive = function () {
  this.archived = true;
  return this.save();
};

// Static method للبحث في الرسائل
ContactMessageSchema.statics.findByPortfolio = function (
  portfolioId,
  options = {}
) {
  const { page = 1, limit = 20, read, replied, archived, spam } = options;
  const skip = (page - 1) * limit;

  const query = { portfolioId };

  if (read !== undefined) query.read = read;
  if (replied !== undefined) query.replied = replied;
  if (archived !== undefined) query.archived = archived;
  if (spam !== undefined) query.spam = spam;

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// Static method للحصول على عدد الرسائل غير المقروءة
ContactMessageSchema.statics.getUnreadCount = function (portfolioId) {
  return this.countDocuments({
    portfolioId,
    read: false,
    archived: false,
    spam: false,
  });
};

export default mongoose.models.ContactMessage ||
  mongoose.model("ContactMessage", ContactMessageSchema);
