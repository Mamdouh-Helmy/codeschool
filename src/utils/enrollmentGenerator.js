// =============================================================================
// utils/enrollmentGenerator.js
// Atomic enrollment number generator — race-condition-free with retry logic
// Format: STU-YYYYXXXX  (e.g. STU-20260001)
// =============================================================================

import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";

// ---------------------------------------------------------------------------
// Counter model (one document per year, e.g. { _id: "enrollment_2026", seq: 7 })
// ---------------------------------------------------------------------------

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter =
  mongoose.models.Counter || mongoose.model("Counter", counterSchema);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PREFIX = "STU";
const MAX_SEQUENCE = 9999;
const SEQUENCE_PADDING = 4;
const MAX_RETRIES = 5; // ✅ عدد المحاولات عند حدوث تعارض

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const buildCounterId = (year) => `enrollment_${year}`;

const padSequence = (seq) => String(seq).padStart(SEQUENCE_PADDING, "0");

const buildEnrollmentNumber = (year, seq) =>
  `${PREFIX}-${year}${padSequence(seq)}`;

// ---------------------------------------------------------------------------
// ✅ NEW: دالة مساعدة لمزامنة الـ Counter مع البيانات الموجودة
// ---------------------------------------------------------------------------

async function ensureCounterIsSynced(year) {
  try {
    const Student = mongoose.model("Student");

    // إيجاد آخر رقم تسجيل موجود في قاعدة البيانات لهذه السنة
    const lastStudent = await Student.findOne({
      enrollmentNumber: { $regex: `^${PREFIX}-${year}` },
    })
      .sort({ enrollmentNumber: -1 })
      .select("enrollmentNumber")
      .lean();

    if (!lastStudent) return; // لا يوجد طلاب، لا حاجة للمزامنة

    const lastSeq = parseInt(
      lastStudent.enrollmentNumber.slice(-SEQUENCE_PADDING),
      10
    );

    if (isNaN(lastSeq) || lastSeq <= 0) return;

    // تحديث الـ Counter فقط إذا كانت القيمة الموجودة أقل من آخر seq في البيانات
    await Counter.findOneAndUpdate(
      { _id: buildCounterId(year) },
      { $max: { seq: lastSeq } }, // $max يضمن عدم الرجوع للخلف أبداً
      { upsert: true }
    );

    console.log(
      `🔄 Counter synced for ${year}: lastSeq=${lastSeq}, next will be ${lastSeq + 1}`
    );
  } catch (err) {
    console.error("⚠️ Counter sync warning (non-fatal):", err.message);
    // لا نرمي خطأ هنا، نتابع التنفيذ
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates a unique enrollment number atomically with retry logic.
 *
 * Uses MongoDB's findOneAndUpdate + $inc to guarantee no two concurrent
 * requests ever receive the same sequence number.
 *
 * If a duplicate key error occurs (e.g. counter out-of-sync with existing data),
 * it auto-syncs the counter and retries up to MAX_RETRIES times.
 *
 * @returns {Promise<string>} e.g. "STU-20260003"
 * @throws {Error} if the yearly limit (9999) is exceeded or DB fails
 */
export async function generateEnrollmentNumber() {
  await connectDB();

  const year = new Date().getFullYear();
  const counterId = buildCounterId(year);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    // ✅ في أول محاولة: مزامنة الـ Counter مع البيانات الموجودة
    if (attempt === 1) {
      await ensureCounterIsSynced(year);
    }

    const counter = await Counter.findOneAndUpdate(
      { _id: counterId },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    if (!counter) {
      throw new Error(
        "Failed to generate enrollment number: counter unavailable"
      );
    }

    if (counter.seq > MAX_SEQUENCE) {
      throw new Error(
        `Enrollment number limit reached for ${year}. Maximum is ${MAX_SEQUENCE}.`
      );
    }

    const enrollmentNumber = buildEnrollmentNumber(year, counter.seq);

    // ✅ التحقق من عدم وجود رقم مكرر قبل الإرجاع
    try {
      const Student = mongoose.model("Student");
      const exists = await Student.exists({ enrollmentNumber });

      if (!exists) {
        console.log(
          `🔢 Generated enrollment number: ${enrollmentNumber}${attempt > 1 ? ` (attempt ${attempt})` : ""}`
        );
        return enrollmentNumber;
      }

      // الرقم موجود مسبقاً — نعيد المزامنة ونحاول مرة أخرى
      console.warn(
        `⚠️ Enrollment number ${enrollmentNumber} already exists, resyncing counter (attempt ${attempt}/${MAX_RETRIES})...`
      );
      await ensureCounterIsSynced(year);
    } catch (checkErr) {
      // لو فشل التحقق (مثلاً Student model غير موجود بعد)، نرجع الرقم مباشرة
      console.warn(
        "⚠️ Could not verify enrollment number uniqueness, proceeding:",
        checkErr.message
      );
      console.log(`🔢 Generated enrollment number: ${enrollmentNumber}`);
      return enrollmentNumber;
    }
  }

  // إذا استنفذنا كل المحاولات، نرمي خطأ واضح
  throw new Error(
    `Failed to generate a unique enrollment number after ${MAX_RETRIES} attempts. Please run syncCounterWithExistingData() and try again.`
  );
}

/**
 * Checks whether a given enrollment number is unique in the database.
 *
 * @param {string} enrollmentNumber
 * @returns {Promise<boolean>} true if unique, false if already taken
 */
export async function validateUniqueEnrollmentNumber(enrollmentNumber) {
  await connectDB();

  try {
    const Student = mongoose.model("Student");
    const exists = await Student.exists({ enrollmentNumber, isDeleted: false });
    return !exists;
  } catch (error) {
    console.error("❌ Error validating enrollment number:", error);
    return false;
  }
}

/**
 * Returns enrollment statistics for the current year.
 *
 * @returns {Promise<EnrollmentStats|null>}
 */
export async function getEnrollmentStats() {
  await connectDB();

  try {
    const year = new Date().getFullYear();
    const Student = mongoose.model("Student");

    const [counter, totalStudents] = await Promise.all([
      Counter.findById(buildCounterId(year)).lean(),
      Student.countDocuments({
        enrollmentNumber: { $regex: `^${PREFIX}-${year}` },
        isDeleted: false,
      }),
    ]);

    const lastSequence = counter?.seq ?? 0;
    const nextSequence = lastSequence + 1;

    return {
      year,
      totalStudents,
      lastSequence,
      nextSequence,
      lastEnrollmentNumber:
        lastSequence > 0 ? buildEnrollmentNumber(year, lastSequence) : "None",
      remainingSlots: MAX_SEQUENCE - lastSequence,
    };
  } catch (error) {
    console.error("❌ Error fetching enrollment stats:", error);
    return null;
  }
}

/**
 * One-time migration helper — syncs the counter with existing DB records.
 *
 * Run this ONCE after deploying to a database that already has students,
 * so the counter starts from the correct sequence instead of 1.
 *
 * @returns {Promise<{ year: number, syncedTo: number, nextWillBe: string }>}
 */
export async function syncCounterWithExistingData() {
  await connectDB();

  const year = new Date().getFullYear();
  const Student = mongoose.model("Student");

  const lastStudent = await Student.findOne({
    enrollmentNumber: { $regex: `^${PREFIX}-${year}` },
  })
    .sort({ enrollmentNumber: -1 })
    .select("enrollmentNumber")
    .lean();

  const lastSeq = lastStudent?.enrollmentNumber
    ? parseInt(lastStudent.enrollmentNumber.slice(-SEQUENCE_PADDING), 10)
    : 0;

  await Counter.findOneAndUpdate(
    { _id: buildCounterId(year) },
    { $max: { seq: lastSeq } },
    { upsert: true }
  );

  const result = {
    year,
    syncedTo: lastSeq,
    nextWillBe: buildEnrollmentNumber(year, lastSeq + 1),
  };

  console.log("✅ Counter synced:", result);

  return result;
}