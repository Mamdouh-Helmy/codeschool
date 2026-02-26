// models/Group.js
import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      unique: true,
      default: function () {
        return `GRP-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 4)
          .toUpperCase()}`;
      },
    },

    // Course Information
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    courseSnapshot: {
      type: Object,
      required: true,
    },

    // Module Selection for Sessions
    moduleSelection: {
      mode: {
        type: String,
        enum: ["all", "specific"],
        default: "all",
      },
      selectedModules: {
        type: [Number],
        default: [],
      },
    },

    // People
    instructors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
      },
    ],

    // Capacity
    maxStudents: {
      type: Number,
      required: true,
      min: 1,
      default: 25,
    },
    currentStudentsCount: {
      type: Number,
      default: 0,
    },

    // Schedule - 1-3 days allowed
    schedule: {
      startDate: {
        type: Date,
        required: true,
      },
      daysOfWeek: [
        {
          type: String,
          enum: [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ],
        },
      ],
      timeFrom: {
        type: String,
        required: true,
        match: /^([01]\d|2[0-3]):([0-5]\d)$/,
      },
      timeTo: {
        type: String,
        required: true,
        match: /^([01]\d|2[0-3]):([0-5]\d)$/,
      },
      timezone: {
        type: String,
        default: "Africa/Cairo",
      },
    },

    // Pricing (optional - kept for backward compatibility)
    pricing: {
      price: {
        type: Number,
        min: 0,
        default: 0,
      },
      paymentType: {
        type: String,
        enum: ["full", "installments"],
        default: "full",
      },
      installmentPlan: {
        numberOfInstallments: {
          type: Number,
          default: 0,
          min: 0,
        },
        amountPerInstallment: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    },

    // Automation Settings
    automation: {
      whatsappEnabled: {
        type: Boolean,
        default: true,
      },
      welcomeMessage: {
        type: Boolean,
        default: true,
      },
      reminderEnabled: {
        type: Boolean,
        default: true,
      },
      reminderBeforeHours: {
        type: Number,
        default: 24,
        min: 1,
        max: 168,
      },
      notifyGuardianOnAbsence: {
        type: Boolean,
        default: true,
      },
      notifyOnSessionUpdate: {
        type: Boolean,
        default: true,
      },
      completionMessage: {
        type: Boolean,
        default: true,
      },
    },

    // Status
    status: {
      type: String,
      enum: ["draft", "active", "completed", "cancelled"],
      default: "draft",
    },

    // Sessions
    sessionsGenerated: {
      type: Boolean,
      default: false,
    },
    totalSessionsCount: {
      type: Number,
      default: 0,
    },

    // Soft Delete
    isDeleted: {
      type: Boolean,
      default: false,
    },

    // Marketing Automation Metadata
    marketing: {
      enabled: {
        type: Boolean,
        default: true,
      },
      evaluationFollowup: {
        type: Boolean,
        default: true,
      },
      completionFollowup: {
        type: Boolean,
        default: true,
      },
    },

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ==================== VIRTUAL PROPERTIES ====================

groupSchema.virtual("capacityPercentage").get(function () {
  if (this.maxStudents === 0) return 0;
  return Math.round((this.currentStudentsCount / this.maxStudents) * 100);
});

groupSchema.virtual("daysRemaining").get(function () {
  if (!this.schedule?.startDate || this.totalSessionsCount === 0) return 0;

  const daysPerWeek = this.schedule.daysOfWeek?.length || 1;
  const totalWeeks = Math.ceil(this.totalSessionsCount / daysPerWeek);
  const daysRequired = totalWeeks * 7;

  const startDate = new Date(this.schedule.startDate);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + daysRequired);

  const today = new Date();
  const diffTime = endDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, daysRemaining);
});

// ==================== METHODS ====================

groupSchema.methods.addStudent = function (studentId) {
  if (!this.students.includes(studentId)) {
    this.students.push(studentId);
    this.currentStudentsCount = this.students.length;
  }
  return this.save();
};

groupSchema.methods.removeStudent = function (studentId) {
  const index = this.students.indexOf(studentId);
  if (index > -1) {
    this.students.splice(index, 1);
    this.currentStudentsCount = this.students.length;
  }
  return this.save();
};

groupSchema.methods.isFull = function () {
  return this.currentStudentsCount >= this.maxStudents;
};

// ==================== STATIC METHODS ====================

groupSchema.statics.findActive = function () {
  return this.find({
    status: "active",
    isDeleted: false,
  }).populate("courseId instructors");
};

groupSchema.statics.findByCourse = function (courseId) {
  return this.find({
    courseId,
    isDeleted: false,
  }).populate("instructors");
};

const Group = mongoose.models.Group || mongoose.model("Group", groupSchema);

export default Group;