// models/InstructorRate.js
import mongoose from "mongoose";

// ✅ كل تغيير في سعر المدرس بيتسجل كـ entry جديدة في history بتاريخ سريان
// (effectiveFrom). ده اللي بيخلي السيشن القديمة تفضل محسوبة بسعرها القديم
// حتى لو الأدمن رفع السعر بعدين — الحسبة بتاخد السعر السارِي وقت السيشن نفسها.
const rateHistorySchema = new mongoose.Schema(
  {
    hourlyRate: { type: Number, required: true, min: 0 },
    transportationAllowance: { type: Number, required: true, min: 0, default: 0 },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, default: null }, // null = ساري لحد دلوقتي
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    note: { type: String, default: "" },
  },
  { _id: true, timestamps: true },
);

const InstructorRateSchema = new mongoose.Schema(
  {
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // ✅ القيم الحالية = آخر entry في الـ history (بتتحدث تلقائيًا في setRate)
    hourlyRate: { type: Number, required: true, min: 0, default: 0 },
    transportationAllowance: { type: Number, required: true, min: 0, default: 0 },
    currency: { type: String, default: "EGP" },

    isActive: { type: Boolean, default: true },
    history: [rateHistorySchema],

    metadata: {
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      updatedAt: { type: Date, default: Date.now },
    },
  },
  { timestamps: true },
);

InstructorRateSchema.index({ isActive: 1 });

// =============================================
// ✅ STATICS
// =============================================

/**
 * ✅ السعر السارِي لمدرس معيّن في تاريخ معيّن.
 * بيرجع: { hourlyRate, transportationAllowance, currency, historyId, isFallback }
 * - isFallback = true معناها التاريخ ده أقدم من أول سعر اتسجل، فبناخد أقدم سعر
 *   (أأمن من إننا نحسبله صفر ونضيع حقه).
 * - بيرجع null لو المدرس ده أصلاً مالوش سعر متسجل — وقتها الـ payroll
 *   بيتخطاه ويبلّغ الأدمن بدل ما يسجل مبلغ غلط.
 */
InstructorRateSchema.statics.getEffectiveRate = async function (instructorId, atDate = new Date()) {
  const doc = await this.findOne({ instructorId }).lean();
  if (!doc) return null;

  const target = new Date(atDate).getTime();
  const history = [...(doc.history || [])].sort(
    (a, b) => new Date(a.effectiveFrom) - new Date(b.effectiveFrom),
  );

  if (history.length === 0) {
    return {
      hourlyRate: doc.hourlyRate || 0,
      transportationAllowance: doc.transportationAllowance || 0,
      currency: doc.currency || "EGP",
      historyId: null,
      isFallback: true,
    };
  }

  const match = history.find((h) => {
    const from = new Date(h.effectiveFrom).getTime();
    const to = h.effectiveTo ? new Date(h.effectiveTo).getTime() : Infinity;
    return target >= from && target < to;
  });

  const picked = match || history[0]; // fallback = أقدم سعر

  return {
    hourlyRate: picked.hourlyRate,
    transportationAllowance: picked.transportationAllowance || 0,
    currency: doc.currency || "EGP",
    historyId: picked._id,
    isFallback: !match,
  };
};

/**
 * ✅ تحديد/تعديل سعر مدرس — بيقفل آخر فترة سارية ويفتح فترة جديدة.
 * مبيعدّلش أي PayrollEntry قديمة خالص (الـ snapshot محفوظ فيها).
 */
InstructorRateSchema.statics.setRate = async function (
  instructorId,
  { hourlyRate, transportationAllowance = 0, effectiveFrom, changedBy, note = "" },
) {
  if (hourlyRate === undefined || hourlyRate === null || Number(hourlyRate) < 0) {
    throw new Error("hourlyRate is required and must be >= 0");
  }

  const from = effectiveFrom ? new Date(effectiveFrom) : new Date();
  if (Number.isNaN(from.getTime())) throw new Error("Invalid effectiveFrom date");

  let doc = await this.findOne({ instructorId });

  if (!doc) {
    doc = new this({
      instructorId,
      hourlyRate: Number(hourlyRate),
      transportationAllowance: Number(transportationAllowance) || 0,
      history: [],
      metadata: { createdBy: changedBy, lastModifiedBy: changedBy },
    });
  }

  const openEntries = doc.history.filter((h) => !h.effectiveTo);
  const last = openEntries.sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom))[0];

  if (last) {
    if (from <= new Date(last.effectiveFrom)) {
      const error = new Error("تاريخ السريان لازم يكون بعد تاريخ آخر سعر متسجل");
      error.code = "INVALID_EFFECTIVE_FROM";
      throw error;
    }
    last.effectiveTo = from;
  }

  doc.history.push({
    hourlyRate: Number(hourlyRate),
    transportationAllowance: Number(transportationAllowance) || 0,
    effectiveFrom: from,
    effectiveTo: null,
    changedBy,
    note,
  });

  doc.hourlyRate = Number(hourlyRate);
  doc.transportationAllowance = Number(transportationAllowance) || 0;
  doc.isActive = true;
  doc.metadata.lastModifiedBy = changedBy;
  doc.metadata.updatedAt = new Date();

  await doc.save();
  return doc;
};

InstructorRateSchema.set("toJSON", { virtuals: true });
InstructorRateSchema.set("toObject", { virtuals: true });

export default mongoose.models.InstructorRate ||
  mongoose.model("InstructorRate", InstructorRateSchema);