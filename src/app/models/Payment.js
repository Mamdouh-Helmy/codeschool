import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
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

    // موجب لدفعة عادية، سالب لأي refund/void
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now, required: true },
    method: { type: String, default: "cash" }, // cash, instapay, card, other
    notes: { type: String, default: "" },

    type: {
      type: String,
      enum: ["payment", "refund"],
      default: "payment",
    },
    status: {
      type: String,
      enum: ["completed", "voided"],
      default: "completed",
    },

    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // ── Escrow / Revenue Recognition ──────────────────────────────────────
    escrow: {
      status: {
        type: String,
        enum: ["not_started", "in_escrow", "recognized", "refunded"],
        default: "not_started",
      },
      startedAt: { type: Date, default: null }, // أول حضور على الفاتورة دي
      releaseAt: { type: Date, default: null },  // startedAt + 14 يوم
      recognizedAt: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

PaymentSchema.index({ "escrow.status": 1, "escrow.releaseAt": 1 });
PaymentSchema.index({ invoiceId: 1, date: -1 });

const Payment = mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
export default Payment;