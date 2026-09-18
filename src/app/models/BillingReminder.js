// models/BillingReminder.js
// ✅ سجل مراحل التذكير بالسداد — الغرض الأساسي منه منع التكرار: كل مرحلة
// (7 أيام / 3 أيام / يوم / اليوم / متأخر) بتتبعت مرة واحدة بس لكل فاتورة.
//
// dueDateKey جزء من الـ unique index عمدًا: لو الأدمن مدّ تاريخ الاستحقاق،
// التاريخ الجديد بيبقى مفتاح جديد فالمراحل بتتبعت من أول وجديد عليه.
import mongoose from "mongoose";

const BillingReminderSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },

    stageKey: { type: String, required: true }, // due_in_7 | due_in_3 | ...
    reminderType: {
      type: String,
      enum: ["upcoming", "due_today", "overdue"],
      required: true,
    },

    dueDate: { type: Date, required: true },
    dueDateKey: { type: String, required: true }, // "2026-09-20" بتوقيت القاهرة
    daysUntilDue: { type: Number, required: true }, // سالب = متأخر

    amountRemaining: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "EGP" },

    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },

    recipients: [
      {
        _id: false,
        recipientType: {
          type: String,
          enum: ["student", "guardian"],
          required: true,
        },
        phone: { type: String, default: "" },
        status: { type: String, enum: ["sent", "failed"], required: true },
        messageId: { type: String, default: "" },
        error: { type: String, default: "" },
      },
    ],

    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// ✅ تذكير واحد بس لكل (فاتورة + مرحلة + تاريخ استحقاق)
BillingReminderSchema.index(
  { invoiceId: 1, stageKey: 1, dueDateKey: 1 },
  { unique: true, name: "unique_reminder_per_stage" },
);

BillingReminderSchema.index({ studentId: 1, sentAt: -1 });

const BillingReminder =
  mongoose.models.BillingReminder ||
  mongoose.model("BillingReminder", BillingReminderSchema);

export default BillingReminder;