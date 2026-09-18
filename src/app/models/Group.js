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

    // Instructors with countTime
    instructors: [
      {
        _id: false,
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        countTime: {
          type: Number,
          default: 0,
        },
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

    // Schedule
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

    firstMeetingLink: {
      type: String,
      default: "",
    },

    // ✅ نوع الجروب: أونلاين ولا أوفلاين
    deliveryMode: {
      type: String,
      enum: ["online", "offline"],
      default: "online",
    },
    location: {
      type: String,
      default: "",
    },
    locationDetails: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      placeName: { type: String, default: "" },
      country: { type: String, default: "" },
      address: { type: String, default: "" },
      extraDetails: { type: String, default: "" },
    },

    // Pricing
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
    metadata: {
      updatedAt: Date,
      sessionsGeneratedAt: Date,
      lastSessionGeneration: {
        date: Date,
        sessionsCount: Number,
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
      instructorNotificationsSent: Boolean,
      instructorNotificationsSentAt: Date,
      instructorNotificationResults: Array,
      instructorNotificationsSummary: Object,

      // ✅ جديد — إتمام الدورة
      completionNotification: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        studentsNotified: { type: Number, default: 0 },
        studentsFailed: { type: Number, default: 0 },
        feedbackLink: { type: String, default: "" },
        results: { type: Array, default: [] },
      },
      completionNotifiedAt: Date,

      // ✅ وقت ما الأدمن علّم الجروب كـ completed
      completedAt: Date,
      completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

      // ✅ لينك الاستبيان الافتراضي للجروب
      feedbackLink: { type: String, default: "" },
    },

    // ✅ الحقل الجديد: الوسوم
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tag",
      },
    ],

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

// ✅ بقت بتاخد المدة الفعلية بالدقايق بدل رقم ساعات ثابت
groupSchema.methods.addInstructorHours = async function (durationMinutes = 0) {
  if (!this.instructors || this.instructors.length === 0) {
    console.log("⚠️ No instructors in group to add hours to");
    return { success: false, reason: "no_instructors" };
  }

  const hoursToAdd = Math.round(((Number(durationMinutes) || 0) / 60) * 100) / 100;

  if (hoursToAdd <= 0) {
    return { success: false, reason: "invalid_duration" };
  }

  for (const instructor of this.instructors) {
    instructor.countTime =
      Math.round(((instructor.countTime || 0) + hoursToAdd) * 100) / 100;
  }

  await this.save();
  return {
    success: true,
    instructorsUpdated: this.instructors.length,
    hoursAdded: hoursToAdd,
    durationMinutes,
  };
};

groupSchema.methods.getInstructorHours = function (userId) {
  const instructor = this.instructors.find(
    (i) => i.userId.toString() === userId.toString()
  );
  return instructor?.countTime || 0;
};

// ==================== STATIC METHODS ====================

groupSchema.statics.findActive = function () {
  return this.find({
    status: "active",
    isDeleted: false,
  })
    .populate("courseId")
    .populate("instructors.userId", "name email gender profile")
    .populate("tags");
};

groupSchema.statics.findByCourse = function (courseId) {
  return this.find({
    courseId,
    isDeleted: false,
  })
    .populate("instructors.userId", "name email")
    .populate("tags");
};

const Group = mongoose.models.Group || mongoose.model("Group", groupSchema);

export default Group;