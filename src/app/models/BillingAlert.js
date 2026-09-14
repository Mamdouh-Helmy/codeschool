import mongoose from "mongoose";

const BillingAlertSchema = new mongoose.Schema(
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

    // ✅ NEW: escrow_review — تنبيه بعد انتهاء 14 يوم إسكرو على دفعة معينة،
    // بيستنى قرار الأدمن (احسبها فلوس / رجّعها) قبل ما أي حاجة تتنفذ فعليًا
    type: {
      type: String,
      enum: ["overdue", "escrow_review"],
      required: true,
    },
    status: { type: String, enum: ["open", "resolved"], default: "open" },

    // ✅ NEW: مطلوبة فقط لو النوع escrow_review — الدفعة اللي التنبيه ده خاص بيها
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },

    dueDateAtCreation: { type: Date, required: true }, // due date (overdue) أو escrow.releaseAt (escrow_review)

    resolution: {
      action: {
        type: String,
        enum: ["suspend", "extend", "recognize", "refund"],
        default: null,
      },
      oldDueDate: { type: Date },
      newDueDate: { type: Date },
      refundAmount: { type: Number },
      reason: { type: String, default: "" },
      actedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      actedAt: { type: Date },
    },
  },
  { timestamps: true },
);

// ✅ تيكت "open" واحد بس لكل فاتورة (لنوع overdue) في نفس الوقت
BillingAlertSchema.index(
  { invoiceId: 1, type: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "open", type: "overdue" },
  },
);

// ✅ تيكت "open" واحد بس لكل دفعة (لنوع escrow_review) في نفس الوقت
BillingAlertSchema.index(
  { paymentId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "open", type: "escrow_review" },
  },
);

const BillingAlert =
  mongoose.models.BillingAlert || mongoose.model("BillingAlert", BillingAlertSchema);
export default BillingAlert;