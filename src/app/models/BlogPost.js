// models/BlogPost.js
import mongoose from "mongoose";

function generateSlug(title) {
  if (!title || title.trim() === "") {
    // إذا كان العنوان فارغاً، نستخدم timestamp كـ slug مؤقت
    return `post-${Date.now()}`;
  }
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const BlogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { 
      type: String, 
      unique: true, 
      required: true,
      default: function() {
        return generateSlug(this.title);
      }
    },
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
    // التأكد من أن slug ليس فارغاً
    if (!this.slug || this.slug.trim() === "" || this.isModified("title")) {
      this.slug = generateSlug(this.title);
    }

    // التأكد من أن slug فريد
    if (this.isModified("slug")) {
      const BlogPost = mongoose.model("BlogPost");
      const self = this;
      
      BlogPost.findOne({ slug: this.slug, _id: { $ne: this._id } })
        .then((existing) => {
          if (existing) {
            // إذا كان slug موجوداً، نضيف timestamp
            self.slug = `${self.slug}-${Date.now()}`;
          }
          next();
        })
        .catch(next);
    } else {
      next();
    }

    if (!this.excerpt && this.body) {
      const plain = this.body.replace(/<[^>]*>/g, "");
      this.excerpt = plain.length > 150 ? plain.substring(0, 150) + "..." : plain;
    }

    if (!this.readTime && this.body) {
      const wordCount = this.body.replace(/<[^>]*>/g, "").split(/\s+/).length;
      this.readTime = Math.max(1, Math.ceil(wordCount / 200));
    }
  } catch (err) {
    console.error("Error generating slug/excerpt:", err);
    next(err);
  }
});

export default mongoose.models.BlogPost ||
  mongoose.model("BlogPost", BlogPostSchema);