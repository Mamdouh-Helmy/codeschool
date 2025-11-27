// models/Webinar.js
import mongoose from "mongoose";

const WebinarSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    date: { type: String, required: true }, 
    time: { type: String, required: true },
    duration: { type: Number, default: 60 },
    image: { type: String, default: "" },
    crmRegistrationUrl: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    maxAttendees: { type: Number, default: 100 },
    currentAttendees: { type: Number, default: 0 },
    tags: [{ type: String }],
    instructor: { type: String, required: true },
    instructorImage: { type: String, default: "" },
    speakers: [{ 
      name: String, 
      role: String, 
      image: String 
    }],
    registrationStart: { type: Date },
    registrationEnd: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// إصلاح الـ virtual fields
WebinarSchema.virtual('formattedDate').get(function() {
  if (!this.date) return '';
  try {
    const date = new Date(this.date);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return this.date;
  }
});

WebinarSchema.virtual('formattedTime').get(function() {
  if (!this.time) return '';
  try {
    const [hours, minutes] = this.time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch (error) {
    return this.time;
  }
});

// إضافة virtual field للتحقق إذا كان الويبنار قادم
WebinarSchema.virtual('isUpcoming').get(function() {
  const now = new Date();
  const webinarDateTime = new Date(`${this.date}T${this.time}`);
  return webinarDateTime > now;
});

export default mongoose.models.Webinar ||
  mongoose.model("Webinar", WebinarSchema);