import mongoose from "mongoose";

// 🧠 دالة لتوليد slug من العنوان
function generateSlug(title) {
  if (!title) return "";
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// 🏗️ إنشاء الـ Schema
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

// 🪄 قبل الحفظ: توليد slug وexcerpt وreadTime
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
