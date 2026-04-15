// =============================================================================
// utils/enrollmentGenerator.js
// Atomic enrollment number generator — race-condition-free
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the counter document ID for a given year.
 * @param {number} year
 * @returns {string}
 */
const buildCounterId = (year) => `enrollment_${year}`;

/**
 * Formats a sequence number into a zero-padded string.
 * @param {number} seq
 * @returns {string}
 */
const padSequence = (seq) => String(seq).padStart(SEQUENCE_PADDING, "0");

/**
 * Builds the full enrollment number string.
 * @param {number} year
 * @param {number} seq
 * @returns {string}
 */
const buildEnrollmentNumber = (year, seq) =>
  `${PREFIX}-${year}${padSequence(seq)}`;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates a unique enrollment number atomically.
 *
 * Uses MongoDB's findOneAndUpdate + $inc to guarantee no two concurrent
 * requests ever receive the same sequence number.
 *
 * @returns {Promise<string>} e.g. "STU-20260003"
 * @throws {Error} if the yearly limit (9999) is exceeded or DB fails
 */
export async function generateEnrollmentNumber() {
  await connectDB();

  const year = new Date().getFullYear();
  const counterId = buildCounterId(year);

  const counter = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  if (!counter) {
    throw new Error("Failed to generate enrollment number: counter unavailable");
  }

  if (counter.seq > MAX_SEQUENCE) {
    throw new Error(
      `Enrollment number limit reached for ${year}. Maximum is ${MAX_SEQUENCE}.`
    );
  }

  const enrollmentNumber = buildEnrollmentNumber(year, counter.seq);

  console.log(`🔢 Generated enrollment number: ${enrollmentNumber}`);

  return enrollmentNumber;
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
 *
 * @typedef {Object} EnrollmentStats
 * @property {number} year
 * @property {number} totalStudents       — active (non-deleted) students this year
 * @property {number} lastSequence        — last issued sequence number
 * @property {number} nextSequence        — next sequence that will be issued
 * @property {string} lastEnrollmentNumber
 * @property {number} remainingSlots      — how many numbers are left this year
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
        lastSequence > 0
          ? buildEnrollmentNumber(year, lastSequence)
          : "None",
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
 * Usage (run once from a script or a one-off API route):
 *   import { syncCounterWithExistingData } from "@/utils/enrollmentGenerator";
 *   await syncCounterWithExistingData();
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
    { $max: { seq: lastSeq } }, // only update if DB value is lower
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