import mongoose from "mongoose";

const InvoiceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    // معرف الـ package subdocument (creditSystem.currentPackage._id) المرتبطة بالفاتورة دي
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },

    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, min: 0, default: 0 },

    // ✅ NEW: طريقة الدفع وقت إنشاء الفاتورة — بتحدد هل dueDate مطلوبة ولا لأ
    paymentOption: {
      type: String,
      enum: ["full", "none", "partial"],
      default: "none",
    },

    // ✅ dueDate بقت اختيارية — مطلوبة بس لو الفاتورة لسه مش Paid ومش Voided.
    // 🆕 FIX: كانت الشرط قبل كده `status !== "Paid"` بس، فلو فاتورة مدفوعة
    // بالكامل (dueDate = null) اتعملها refund وبقت status = "Voided"،
    // الـ validator كان بيطلب dueDate وهي null → validation error.
    // الفاتورة الملغية (Voided) مفيهاش معنى لاستحقاق أصلاً، فبنستثنيها هنا.
    dueDate: {
      type: Date,
      default: null,
      required: function () {
        return !["Paid", "Voided"].includes(this.status);
      },
    },

    status: {
      type: String,
      enum: ["Paid", "Pending", "Suspended", "Escrow", "Voided"],
      default: "Pending",
    },

    notes: { type: String, default: "" },

    metadata: {
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },
  },
  { timestamps: true },
);

InvoiceSchema.index({ dueDate: 1, status: 1 });
InvoiceSchema.index({ studentId: 1, createdAt: -1 });
InvoiceSchema.index({ groupId: 1, studentId: 1 });

// ✅ المتبقي = دايمًا محسوب من الفعلي، مش متخزن، عشان يفضل متسق مع الدفعات
InvoiceSchema.virtual("remainingAmount").get(function () {
  return Math.max(0, (this.totalAmount || 0) - (this.paidAmount || 0));
});

// ✅ إعادة حساب status بناءً على paidAmount — بيتجاهل الحالات اليدوية
// (Suspended / Voided) لأنها بتتغير من مكان تاني (billing-alerts أو refund)
InvoiceSchema.methods.recalculateStatus = function () {
  if (["Suspended", "Voided"].includes(this.status)) return;
  if (this.totalAmount > 0 && this.paidAmount >= this.totalAmount) {
    this.status = "Paid";
  } else if (this.status !== "Escrow") {
    this.status = "Pending";
  }
};

InvoiceSchema.set("toJSON", { virtuals: true });
InvoiceSchema.set("toObject", { virtuals: true });

const Invoice = mongoose.models.Invoice || mongoose.model("Invoice", InvoiceSchema);
export default Invoice;