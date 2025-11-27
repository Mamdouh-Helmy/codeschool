// models/BlogPost.js
import mongoose from "mongoose";

// دالة محسنة لتوليد slug تدعم جميع اللغات
function generateSlug(title) {
  if (!title || typeof title !== 'string') return "";
  
  let slug = title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u0600-\u06FF\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  if (!slug) {
    slug = `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  return slug;
}

const BlogPostSchema = new mongoose.Schema(
  {
    // البيانات بالعربية
    title_ar: { 
      type: String, 
      required: function() {
        // مطلوب إذا لم يكن title_en موجوداً
        return !this.title_en || this.title_en.trim() === "";
      } 
    },
    body_ar: { 
      type: String, 
      required: function() {
        // مطلوب إذا لم يكن body_en موجوداً
        return !this.body_en || this.body_en.trim() === "";
      } 
    },
    excerpt_ar: { type: String, default: "" },
    imageAlt_ar: { type: String, default: "" },
    
    // البيانات بالإنجليزية
    title_en: { 
      type: String, 
      required: function() {
        // مطلوب إذا لم يكن title_ar موجوداً
        return !this.title_ar || this.title_ar.trim() === "";
      } 
    },
    body_en: { 
      type: String, 
      required: function() {
        // مطلوب إذا لم يكن body_ar موجوداً
        return !this.body_ar || this.body_ar.trim() === "";
      } 
    },
    excerpt_en: { type: String, default: "" },
    imageAlt_en: { type: String, default: "" },
    
    // البيانات المشتركة
    slug: { type: String, unique: true, sparse: true },
    image: { type: String, default: "" },
    category_ar: { type: String, default: "" },
    category_en: { type: String, default: "" },
    publishDate: { type: Date, default: Date.now },
    author: {
      name_ar: { type: String, default: "" },
      name_en: { type: String, default: "" },
      email: { type: String, default: "" },
      avatar: { type: String, default: "/images/default-avatar.jpg" },
      role: { type: String, default: "Author" }, 
    },
    tags_ar: [{ type: String }],
    tags_en: [{ type: String }],
    featured: { type: Boolean, default: false },
    readTime: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// التحقق المخصص قبل الحفظ
BlogPostSchema.pre("save", function (next) {
  // التحقق من وجود عنوان في لغة واحدة على الأقل
  if ((!this.title_ar || this.title_ar.trim() === "") && 
      (!this.title_en || this.title_en.trim() === "")) {
    return next(new Error("Title is required in at least one language"));
  }

  // التحقق من وجود محتوى في لغة واحدة على الأقل
  if ((!this.body_ar || this.body_ar.trim() === "") && 
      (!this.body_en || this.body_en.trim() === "")) {
    return next(new Error("Content is required in at least one language"));
  }

  try {
    // توليد slug من العنوان الإنجليزي أو العربي
    if (!this.slug || this.isModified("title_en") || this.isModified("title_ar")) {
      const titleToUse = this.title_en || this.title_ar;
      this.slug = generateSlug(titleToUse);
    }

    // توليد excerpt تلقائي إذا لم يتم توفيره
    if (!this.excerpt_ar && this.body_ar) {
      const plain = this.body_ar.replace(/<[^>]*>/g, "");
      this.excerpt_ar = plain.length > 150 ? plain.substring(0, 150) + "..." : plain;
    }

    if (!this.excerpt_en && this.body_en) {
      const plain = this.body_en.replace(/<[^>]*>/g, "");
      this.excerpt_en = plain.length > 150 ? plain.substring(0, 150) + "..." : plain;
    }

    // حساب وقت القراءة
    if (!this.readTime && (this.body_ar || this.body_en)) {
      const content = this.body_ar || this.body_en;
      const wordCount = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
      this.readTime = Math.max(1, Math.ceil(wordCount / 200));
    }
  } catch (err) {
    console.error("Error generating slug/excerpt:", err);
  }
  next();
});

export default mongoose.models.BlogPost ||
  mongoose.model("BlogPost", BlogPostSchema);