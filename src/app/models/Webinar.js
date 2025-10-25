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

// Virtual for formatted date
WebinarSchema.virtual('formattedDate').get(function() {
  return this.date ? new Date(this.date).toLocaleDateString('en-US') : '';
});

// Virtual for formatted time
WebinarSchema.virtual('formattedTime').get(function() {
  if (!this.time) return '';
  const [hours, minutes] = this.time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
});

export default mongoose.models.Webinar ||
  mongoose.model("Webinar", WebinarSchema);