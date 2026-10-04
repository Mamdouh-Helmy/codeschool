// /models/Interview.js
import mongoose from "mongoose";

// ─── Sub: Ratings (نفس تقييم الأداء بتاع السيشن العادية) ─────────────────────
const ratingsSchema = new mongoose.Schema(
  {
    commitment: { type: Number, min: 1, max: 5, default: 3 },
    understanding: { type: Number, min: 1, max: 5, default: 3 },
    taskExecution: { type: Number, min: 1, max: 5, default: 3 },
    participation: { type: Number, min: 1, max: 5, default: 3 },
  },
  { _id: false }
);

// ─── Sub: Evaluation ────────────────────────────────────────────────────────
const evaluationSchema = new mongoose.Schema(
  {
    decision: {
      type: String,
      enum: ["pass", "review", "repeat", null],
      default: null,
    },
    instructorComment: { type: String, default: "" },
    // ✅ NEW: تقييم الأداء بالنجوم (4 معايير)
    ratings: { type: ratingsSchema, default: () => ({}) },
    interviewNumber: { type: Number, default: 1 },
    completedAt: { type: Date, default: null },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

// ─── Main ────────────────────────────────────────────────────────────────────
const InterviewSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: { type: String, required: true, trim: true },
    scheduledDate: { type: Date, required: true },
    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },

    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "postponed"],
      default: "scheduled",
    },

    // ─── Delivery ────────────────────────────────────────────────────────
    deliveryMode: {
      type: String,
      enum: ["online", "offline"],
      required: true,
      default: "online",
    },

    // ─── Online ──────────────────────────────────────────────────────────
    meetingLink: { type: String, default: "" },
    meetingLinkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MeetingLink",
      default: null,
    },
    meetingPlatform: {
      type: String,
      enum: ["zoom", "google_meet", "microsoft_teams", "other", null],
      default: null,
    },

    // ─── Offline ─────────────────────────────────────────────────────────
    location: { type: String, default: "" },
    locationDetails: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      placeName: { type: String, default: "" },
      country: { type: String, default: "" },
      address: { type: String, default: "" },
      extraDetails: { type: String, default: "" },
    },

    // ─── Evaluation / Report ────────────────────────────────────────────
    evaluation: { type: evaluationSchema, default: null },

    actualStartTime: { type: String, default: null },
    actualEndTime: { type: String, default: null },
    payroll: {
      processed: { type: Boolean, default: false },
      processedAt: { type: Date },
      durationMinutes: { type: Number, default: 0 },
      lastError: { type: String, default: "" },
    },

    instructorNotes: { type: String, default: "" },

    // ─── Recording (Online فقط) ─────────────────────────────────────────
    recordingLink: { type: String, default: "" },

    // ─── Automation ─────────────────────────────────────────────────────
    automationEvents: {
      welcomeSent: { type: Boolean, default: false },
      welcomeSentAt: { type: Date, default: null },

      reminder24hSent: { type: Boolean, default: false },
      reminder24hSentAt: { type: Date, default: null },
      reminder24hStudentsNotified: { type: Number, default: 0 },
      reminder24hInstructorsNotified: { type: Number, default: 0 },

      reminder15minSent: { type: Boolean, default: false },
      reminder15minSentAt: { type: Date, default: null },
      reminder15minStudentsNotified: { type: Number, default: 0 },
      reminder15minInstructorsNotified: { type: Number, default: 0 },

      reminder30minOfflineSent: { type: Boolean, default: false },
      reminder30minOfflineSentAt: { type: Date, default: null },
      reminder30minOfflineStudentsNotified: { type: Number, default: 0 },
      reminder30minOfflineInstructorsNotified: { type: Number, default: 0 },

      prePingOfflineSent: { type: Boolean, default: false },
      prePingOfflineSentAt: { type: Date, default: null },
      prePingOfflineStudentsNotified: { type: Number, default: 0 },
      prePingOfflineInstructorsNotified: { type: Number, default: 0 },

      evaluationSent: { type: Boolean, default: false },
      evaluationSentAt: { type: Date, default: null },

      // ✅ لينك التسجيل (Online فقط)
      recordingSent: { type: Boolean, default: false },
      recordingSentAt: { type: Date, default: null },
      recordingSentLink: { type: String, default: "" },
    },

    metadata: {
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },

    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true, strict: true }
);

// ─── Indexes ────────────────────────────────────────────────────────────────
InterviewSchema.index({ scheduledDate: 1, status: 1 });
InterviewSchema.index({ instructorId: 1, scheduledDate: 1 });
InterviewSchema.index({ studentId: 1, scheduledDate: 1 });
InterviewSchema.index({ meetingLinkId: 1 });

// ─── Pre-save: release meeting link on delete/cancel ────────────────────────
InterviewSchema.pre("save", async function () {
  this.metadata.updatedAt = new Date();

  const shouldRelease =
    this.meetingLinkId &&
    ((this.isModified("isDeleted") && this.isDeleted) ||
      (this.isModified("status") && this.status === "cancelled"));

  if (!shouldRelease) return;

  try {
    const MeetingLink =
      mongoose.models.MeetingLink || mongoose.model("MeetingLink");
    const link = await MeetingLink.findById(this.meetingLinkId);
    if (link) {
      await link.releaseReservation(this._id, null, "interview");
    }
  } catch (err) {
    console.error("❌ releaseMeetingLink (interview) failed:", err.message);
  }
});

// ─── Prevent deleted from queries ───────────────────────────────────────────
InterviewSchema.pre("find", function () {
  this.where({ isDeleted: false });
});
InterviewSchema.pre("findOne", function () {
  this.where({ isDeleted: false });
});

// ─── Virtuals ───────────────────────────────────────────────────────────────
InterviewSchema.virtual("fullDateTime").get(function () {
  if (!this.scheduledDate || !this.startTime) return null;
  const d = new Date(this.scheduledDate);
  const [h, m] = this.startTime.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d;
});

if (process.env.NODE_ENV !== "production" && mongoose.models.Interview) {
  delete mongoose.models.Interview;
}

const Interview =
  mongoose.models.Interview || mongoose.model("Interview", InterviewSchema);

export default Interview;