// models/BlogPost.js
import mongoose from "mongoose";

// دالة محسنة لتوليد slug تدعم جميع اللغات
function generateSlug(title) {
  if (!title || typeof title !== 'string') return "";
  
  // إنشاء slug أساسي باستخدام toLowerCase
  let slug = title
    .toLowerCase()
    .trim();
  
  // استبدال المسافات بشرطات
  slug = slug.replace(/\s+/g, '-');
  
  // إزالة الأحرف الخاصة باستثناء الشرطات
  slug = slug.replace(/[^a-z0-9\u0600-\u06FF\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af\-]/g, '');
  
  // إزالة الشرطات المتكررة
  slug = slug.replace(/-+/g, '-');
  
  // إزالة الشرطات من البداية والنهاية
  slug = slug.replace(/^-+|-+$/g, '');
  
  // إذا كان الناتج فارغاً، ننشئ slug عشوائي
  if (!slug) {
    slug = `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  return slug;
}

const BlogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, unique: true, sparse: true },
    body: { type: String, required: true },
    image: { type: String, default: "" },
    imageAlt: { type: String, default: "" },
    category: { type: String, default: "" },
    excerpt: { type: String, default: "" },
    publishDate: { type: Date, default: Date.now },
    author: {
      id: { type: String, required: false },
      name: { type: String, required: false },
      email: { type: String, required: false },
      avatar: { type: String, default: "/images/default-avatar.jpg" },
      role: { type: String, default: "Author" }, 
    },
    tags: [{ type: String }],
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

BlogPostSchema.pre("save", function (next) {
  try {
    if (!this.slug || this.isModified("title")) {
      this.slug = generateSlug(this.title);
    }

    if (!this.excerpt && this.body) {
      const plain = this.body.replace(/<[^>]*>/g, "");
      this.excerpt =
        plain.length > 150 ? plain.substring(0, 150) + "..." : plain;
    }

    if (!this.readTime && this.body) {
      const wordCount = this.body.replace(/<[^>]*>/g, "").split(/\s+/).length;
      this.readTime = Math.max(1, Math.ceil(wordCount / 200));
    }
  } catch (err) {
    console.error("Error generating slug/excerpt:", err);
  }
  next();
});

export default mongoose.models.BlogPost ||
  mongoose.model("BlogPost", BlogPostSchema);