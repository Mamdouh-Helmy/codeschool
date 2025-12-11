// models/BlogPost.js - الحل النهائي
import mongoose from "mongoose";

const BlogPostSchema = new mongoose.Schema(
  {
    // البيانات بالعربية
    title_ar: { type: String, default: "" },
    body_ar: { type: String, default: "" },
    excerpt_ar: { type: String, default: "" },
    imageAlt_ar: { type: String, default: "" },
    
    // البيانات بالإنجليزية
    title_en: { type: String, default: "" },
    body_en: { type: String, default: "" },
    excerpt_en: { type: String, default: "" },
    imageAlt_en: { type: String, default: "" },
    
    // البيانات المشتركة
    slug: { type: String, unique: true },
    image: { type: String, default: "" },
    category_ar: { type: String, default: "" },
    category_en: { type: String, default: "" },
    publishDate: { type: Date, default: Date.now },
    author: {
      name_ar: { type: String, default: "Admin" },
      name_en: { type: String, default: "Admin" },
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

console.log("✅ BlogPost Schema loaded (NO MIDDLEWARE)");
export default mongoose.models.BlogPost || mongoose.model("BlogPost", BlogPostSchema);