// models/BlogPost.js
import mongoose from "mongoose";

const BlogPostSchema = new mongoose.Schema(
  {
    // البيانات بالعربية
    title_ar: { 
      type: String, 
      default: "",
      trim: true
    },
    body_ar: { 
      type: String, 
      default: "",
      trim: true
    },
    excerpt_ar: { 
      type: String, 
      default: "",
      trim: true
    },
    imageAlt_ar: { 
      type: String, 
      default: "",
      trim: true
    },
    
    // البيانات بالإنجليزية
    title_en: { 
      type: String, 
      default: "",
      trim: true
    },
    body_en: { 
      type: String, 
      default: "",
      trim: true
    },
    excerpt_en: { 
      type: String, 
      default: "",
      trim: true
    },
    imageAlt_en: { 
      type: String, 
      default: "",
      trim: true
    },
    
    // البيانات المشتركة
    slug: { 
      type: String, 
      unique: true,
      index: true,
      trim: true
    },
    image: { 
      type: String, 
      default: "",
      trim: true
    },
    category_ar: { 
      type: String, 
      default: "",
      trim: true
    },
    category_en: { 
      type: String, 
      default: "",
      trim: true
    },
    publishDate: { 
      type: Date, 
      default: Date.now 
    },
    author: {
      name_ar: { 
        type: String, 
        default: "Admin",
        trim: true
      },
      name_en: { 
        type: String, 
        default: "Admin",
        trim: true
      },
      email: { 
        type: String, 
        default: "",
        trim: true,
        lowercase: true
      },
      avatar: { 
        type: String, 
        default: "/images/default-avatar.jpg",
        trim: true
      },
      role: { 
        type: String, 
        default: "Author",
        trim: true
      }, 
    },
    tags_ar: [{ 
      type: String,
      trim: true
    }],
    tags_en: [{ 
      type: String,
      trim: true
    }],
    featured: { 
      type: Boolean, 
      default: false 
    },
    readTime: { 
      type: Number, 
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    viewCount: { 
      type: Number, 
      default: 0,
      min: 0
    },
  },
  { 
    timestamps: true,
    // تعطيل virtuals
    toJSON: { 
      virtuals: false,
      transform: function(doc, ret) {
        delete ret.__v;
        delete ret.updatedAt;
        return ret;
      }
    },
    toObject: { 
      virtuals: false,
      transform: function(doc, ret) {
        delete ret.__v;
        delete ret.updatedAt;
        return ret;
      }
    }
  }
);

// NO MIDDLEWARE AT ALL - تعليق مؤقت لأي middleware
// BlogPostSchema.pre('save', async function(next) {
//   console.log('Middleware disabled');
//   next();
// });

console.log("✅ BlogPost Schema loaded (CLEAN - NO MIDDLEWARE)");

// التحقق من وجود الموديل مسبقاً لتجنب إعادة التسجيل
if (mongoose.models && mongoose.models.BlogPost) {
  delete mongoose.models.BlogPost;
}

export default mongoose.model("BlogPost", BlogPostSchema);