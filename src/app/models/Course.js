// models/Course.js - SUPER SIMPLIFIED VERSION (NO VALIDATIONS)
import mongoose from "mongoose";

// أبسط تعريف للدروس
const LessonSchema = new mongoose.Schema({
  title: String,
  description: String,
  order: Number,
  sessionNumber: Number
}, { _id: false });

// أبسط تعريف للوحدات
const ModuleSchema = new mongoose.Schema({
  title: String,
  description: String,
  order: Number,
  lessons: [LessonSchema],
  projects: [String],
  totalSessions: Number
});

// أبسط تعريف للكورس بدون أي validations
const CourseSchema = new mongoose.Schema({
  title: String,
  slug: String,
  description: String,
  level: String,
  curriculum: [ModuleSchema],
  projects: [String],
  instructors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  price: Number,
  isActive: Boolean,
  featured: Boolean,
  thumbnail: String,
  createdBy: {
    id: mongoose.Schema.Types.ObjectId,
    name: String,
    email: String,
    role: String
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// أبسط pre-save hook بدون أي تعقيدات
CourseSchema.pre("save", function(next) {
  try {
    // فقط إنشاء slug إذا لم يكن موجوداً
    if (!this.slug && this.title) {
      this.slug = this.title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]/g, '')
        .substring(0, 50) || `course-${Date.now()}`;
    }
    
    // ضمان وجود قيم افتراضية بسيطة
    if (!this.level) this.level = "beginner";
    if (!this.price) this.price = 0;
    if (this.isActive === undefined) this.isActive = true;
    if (this.featured === undefined) this.featured = false;
    
    next();
  } catch (error) {
    console.log("Note: Pre-save hook had minor issue, continuing...");
    next();
  }
});

// virtuals بسيطة
CourseSchema.virtual("totalLessons").get(function() {
  if (!this.curriculum) return 0;
  let total = 0;
  this.curriculum.forEach(module => {
    total += (module.lessons?.length || 0);
  });
  return total;
});

CourseSchema.virtual("totalModules").get(function() {
  return this.curriculum?.length || 0;
});

// أبسط index واحد فقط
CourseSchema.index({ slug: 1 }, { unique: true, sparse: true });

// تصدير النموذج بدون تعقيد
const Course = mongoose.models.Course || mongoose.model("Course", CourseSchema);
export default Course;