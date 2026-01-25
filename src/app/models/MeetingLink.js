// models/MeetingLink.js - SUPER SIMPLIFIED VERSION
import mongoose from "mongoose";

// أبسط schema ممكن بدون أي تعقيدات
const meetingLinkSchema = new mongoose.Schema({
  // Basic Information
  name: String,
  link: String,
  
  // Credentials
  credentials: {
    username: String,
    password: String
  },
  
  // Platform
  platform: String,
  
  // Status
  status: String,
  
  // Settings
  capacity: Number,
  durationLimit: Number,
  
  // Scheduling
  allowedDays: [String],
  allowedTimeSlots: [{
    startTime: String,
    endTime: String
  }],
  
  // Usage Tracking
  usageHistory: [{
    sessionId: mongoose.Schema.Types.ObjectId,
    groupId: mongoose.Schema.Types.ObjectId,
    startTime: Date,
    endTime: Date,
    duration: Number,
    usedAt: Date
  }],
  
  // Current Reservation
  currentReservation: {
    sessionId: mongoose.Schema.Types.ObjectId,
    groupId: mongoose.Schema.Types.ObjectId,
    startTime: Date,
    endTime: Date,
    reservedAt: Date,
    reservedBy: mongoose.Schema.Types.ObjectId
  },
  
  // Statistics
  stats: {
    totalUses: Number,
    totalHours: Number,
    lastUsed: Date,
    averageUsageDuration: Number
  },
  
  // Metadata
  metadata: {
    createdBy: mongoose.Schema.Types.ObjectId,
    createdAt: Date,
    updatedAt: Date,
    notes: String
  },
  
  // Soft Delete
  isDeleted: Boolean,
  deletedAt: Date
}, {
  timestamps: true
});

// إزالة جميع الـ pre-save hooks المشكلة
// إزالة جميع الـ virtual properties المشكلة
// إزالة جميع الـ methods المشكلة
// إزالة جميع الـ static methods المشكلة

// أبسط index فقط
meetingLinkSchema.index({ link: 1 }, { unique: true, sparse: true });

// تصدير النموذج بدون تعقيد
const MeetingLink = mongoose.models.MeetingLink || mongoose.model("MeetingLink", meetingLinkSchema);
export default MeetingLink;