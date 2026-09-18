// models/PayrollEntry.js
import mongoose from "mongoose";

// ✅ سطر واحد لكل (مدرس + سيشن). كل الأرقام هنا snapshot ثابت وقت الإنشاء:
// السعر، المدة، المبلغ، وبدل المواصلات. مفيش حاجة بتتحسب من تاني وقت العرض.
//
// ⛔️ مهم: الـ Refund بتاع الطالب مبيلمسش أي entry هنا خالص — المدرس خد حقه
// عن الشغل اللي اتعمل، والـ refund بيتسجل كتكلفة على الشركة في نظام الفواتير.
const PayrollEntrySchema = new mongoose.Schema(
  {
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
      index: true,
    },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", default: null },

    sessionTitle: { type: String, default: "" },
    groupName: { type: String, default: "" },

    // ✅ تاريخ السيشن — هو الأساس في حساب "أول سيشن offline في اليوم"
    sessionDate: { type: Date, required: true, index: true },

    deliveryMode: {
      type: String,
      enum: ["online", "offline"],
      required: true,
    },

    // ── الوقت الفعلي ────────────────────────────────────────────────
    actualStartTime: { type: String, default: "" }, // "19:00"
    actualEndTime: { type: String, default: "" },   // "20:30"
    durationMinutes: { type: Number, required: true, min: 0 },
    // مصدر الوقت: فعلي من المدرس/الأدمن ولا الجدول المخطط
    durationSource: {
      type: String,
      enum: ["actual", "scheduled"],
      default: "scheduled",
    },

    // ── الفلوس (snapshot) ───────────────────────────────────────────
    hourlyRateSnapshot: { type: Number, required: true, min: 0 },
    rateHistoryId: { type: mongoose.Schema.Types.ObjectId, default: null },
    sessionAmount: { type: Number, required: true, min: 0 },

    transportationAllowance: { type: Number, default: 0, min: 0 },
    transportationApplied: { type: Boolean, default: false },
    transportationSkipReason: {
      type: String,
      enum: ["", "online_session", "already_paid_today", "no_allowance_configured"],
      default: "",
    },

    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "EGP" },

    status: {
      type: String,
      enum: ["pending", "approved", "paid", "cancelled"],
      default: "pending",
      index: true,
    },

    notes: { type: String, default: "" },

    metadata: {
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      source: {
        type: String,
        enum: ["admin_complete", "instructor_evaluation", "manual", "recalculation"],
        default: "manual",
      },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      approvedAt: { type: Date },
      paidAt: { type: Date },
      updatedAt: { type: Date, default: Date.now },
    },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// ✅ منع التكرار: سطر واحد بس لكل مدرس في كل سيشن
PayrollEntrySchema.index(
  { instructorId: 1, sessionId: 1 },
  {
    unique: true,
    name: "unique_payroll_per_instructor_session",
    partialFilterExpression: { isDeleted: false },
  },
);

PayrollEntrySchema.index({ instructorId: 1, sessionDate: -1 });
PayrollEntrySchema.index({ sessionDate: -1, status: 1 });

PayrollEntrySchema.pre("save", function () {
  this.metadata.updatedAt = new Date();
});

// ✅ ملخص مالي لمدرس في فترة
PayrollEntrySchema.statics.getInstructorSummary = async function (
  instructorId,
  { from, to, status } = {},
) {
  const match = {
    instructorId: new mongoose.Types.ObjectId(instructorId),
    isDeleted: false,
    status: { $ne: "cancelled" },
  };
  if (status) match.status = status;
  if (from || to) {
    match.sessionDate = {};
    if (from) match.sessionDate.$gte = new Date(from);
    if (to) match.sessionDate.$lte = new Date(to);
  }

  const [result] = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        sessionsCount: { $sum: 1 },
        totalMinutes: { $sum: "$durationMinutes" },
        totalSessionAmount: { $sum: "$sessionAmount" },
        totalTransportation: { $sum: "$transportationAllowance" },
        totalAmount: { $sum: "$totalAmount" },
      },
    },
  ]);

  return (
    result || {
      sessionsCount: 0,
      totalMinutes: 0,
      totalSessionAmount: 0,
      totalTransportation: 0,
      totalAmount: 0,
    }
  );
};

PayrollEntrySchema.set("toJSON", { virtuals: true });
PayrollEntrySchema.set("toObject", { virtuals: true });

export default mongoose.models.PayrollEntry ||
  mongoose.model("PayrollEntry", PayrollEntrySchema);