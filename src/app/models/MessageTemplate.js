// في /src/models/MessageTemplate.js

import mongoose from "mongoose";

const MessageTemplateSchema = new mongoose.Schema(
  {
    templateType: {
      type: String,
      required: true,
      enum: [
        "student_welcome",
        "guardian_notification",
        "absence_notification",
        "late_notification",
        "excused_notification",
        "session_cancelled_student",
        "session_cancelled_guardian",
        "session_postponed_student",
        "session_postponed_guardian",
        "reminder_24h_student",
        "reminder_24h_guardian",
        "reminder_1h_student",
        "reminder_1h_guardian",
        "group_completion_student",
        "group_completion_guardian",
      ],
    },

    recipientType: {
      type: String,
      enum: ["student", "guardian"],
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    contentAr: {
      type: String,
      required: false, // ✅ تغيير من true إلى false
      default: "",     // ✅ إضافة قيمة افتراضية
    },

    contentEn: {
      type: String,
      required: false, // ✅ تغيير من true إلى false
      default: "",     // ✅ إضافة قيمة افتراضية
    },

    description: {
      type: String,
      default: "",
    },

    variables: [
      {
        key: String,
        label: String,
        description: String,
        example: String,
      },
    ],

    isDefault: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    usageStats: {
      totalSent: { type: Number, default: 0 },
      lastUsedAt: { type: Date },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
MessageTemplateSchema.index({ templateType: 1, isDefault: 1 });
MessageTemplateSchema.index({ templateType: 1, isActive: 1 });
MessageTemplateSchema.index({ recipientType: 1 });

// Ensure only one default template per type and recipient
MessageTemplateSchema.pre("save", async function (next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { 
        templateType: this.templateType, 
        recipientType: this.recipientType,
        isDefault: true, 
        _id: { $ne: this._id } 
      },
      { $set: { isDefault: false } }
    );
  }
  next();
});

// Get content by language
MessageTemplateSchema.methods.getContent = function (language = "ar") {
  return language === "ar" ? this.contentAr : this.contentEn;
};

// Render template with variables
MessageTemplateSchema.methods.render = function (variables = {}, language = "ar") {
  let content = this.getContent(language);
  
  Object.entries(variables).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      const regex = new RegExp(`\\{${key}\\}`, "g");
      content = content.replace(regex, String(value));
    }
  });
  
  return content;
};

// Get example of rendered template
MessageTemplateSchema.methods.getExample = function (language = "ar") {
  const examples = {
    studentSalutation: language === 'ar' ? 'عزيزي أحمد' : 'Dear Ahmed',
    guardianSalutation: language === 'ar' ? 'عزيزي الأستاذ محمد' : 'Dear Mr. Mohamed',
    childTitle: language === 'ar' ? 'ابنك' : 'your son',
    studentName: language === 'ar' ? 'أحمد' : 'Ahmed',
    guardianName: language === 'ar' ? 'محمد' : 'Mohamed',
    sessionName: language === 'ar' ? 'الجلسة الأولى' : 'Session 1',
    date: language === 'ar' ? 'الاثنين ١ يناير ٢٠٢٥' : 'Monday, January 1, 2025',
    time: '5:00 PM - 7:00 PM',
    meetingLink: 'https://meet.google.com/xxx',
    groupName: language === 'ar' ? 'المجموعة أ' : 'Group A',
    groupCode: 'GRP-001',
    courseName: language === 'ar' ? 'برمجة بايثون' : 'Python Programming',
    status: language === 'ar' ? 'غائب' : 'absent',
    enrollmentNumber: 'STU001'
  };
  
  return this.render(examples, language);
};

export default mongoose.models.MessageTemplate ||
  mongoose.model("MessageTemplate", MessageTemplateSchema);