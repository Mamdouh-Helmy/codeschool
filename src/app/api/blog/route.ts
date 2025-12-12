import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "../../models/BlogPost";

// ==================== دوال المساعدة ====================

// دالة آمنة تماماً لتوليد slug
function generateSlug(title: string): string {
  if (!title || typeof title !== "string") {
    return `post-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  let slug = title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

  if (!slug || slug.length < 2) {
    return `post-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  return slug;
}

// دالة آمنة لتوليد excerpt
function generateExcerpt(content: string, maxLength: number = 150): string {
  if (!content || typeof content !== "string") {
    return "";
  }
  
  try {
    const plain = content.replace(/<[^>]*>/g, "").trim();
    return plain.length <= maxLength ? plain : plain.substring(0, maxLength).trim() + "...";
  } catch {
    return "";
  }
}

// دالة آمنة لحساب وقت القراءة
function calculateReadTime(content: string): number {
  if (!content || typeof content !== "string") {
    return 5;
  }
  
  try {
    const plain = content.replace(/<[^>]*>/g, "").trim();
    const words = plain.split(/\s+/).filter(word => word.length > 0);
    return Math.max(1, Math.ceil(words.length / 200));
  } catch {
    return 5;
  }
}

// دالة للتحقق من صحة البيانات
function validateBlogData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (
    (!data.title_ar || data.title_ar.trim() === "") &&
    (!data.title_en || data.title_en.trim() === "")
  ) {
    errors.push("Blog title is required in at least one language");
  }

  if (
    (!data.body_ar || data.body_ar.trim() === "") &&
    (!data.body_en || data.body_en.trim() === "")
  ) {
    errors.push("Blog content is required in at least one language");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ==================== POST - إنشاء مقال جديد ====================

export async function POST(req: Request) {
  console.log("🚀 POST /api/blog - Starting...");
  
  let requestData: any = null;
  let isConnected = false;

  try {
    // محاولة الاتصال بقاعدة البيانات
    try {
      await connectDB();
      isConnected = true;
      console.log("✅ Database connected successfully");
    } catch (dbError: any) {
      console.error("❌ Database connection failed:", dbError.message);
      return NextResponse.json(
        { 
          success: false, 
          message: "Database connection failed",
          error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        },
        { status: 500 }
      );
    }

    // قراءة البيانات
    try {
      requestData = await req.json();
      console.log("📥 Received blog data");
    } catch (parseError: any) {
      console.error("❌ Failed to parse request body:", parseError.message);
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid JSON data" 
        },
        { status: 400 }
      );
    }

    // التحقق من صحة البيانات
    const validation = validateBlogData(requestData);
    if (!validation.isValid) {
      console.log("❌ Validation failed:", validation.errors);
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: validation.errors
        },
        { status: 400 }
      );
    }

    // ========== إعداد البيانات النهائية ==========
    
    // 1. توليد slug آمن
    const titleToUse = requestData.title_en || requestData.title_ar || "Untitled Post";
    const slug = generateSlug(titleToUse);
    console.log("🔗 Generated slug:", slug);

    // 2. إعداد بيانات المؤلف
    const author = {
      name_ar: (requestData.author?.name_ar || "Admin").toString().trim(),
      name_en: (requestData.author?.name_en || "Admin").toString().trim(),
      email: (requestData.author?.email || "").toString().trim(),
      avatar: (requestData.author?.avatar || "/images/default-avatar.jpg").toString().trim(),
      role: (requestData.author?.role || "Author").toString().trim(),
    };

    // 3. إعداد tags
    const tags_ar = Array.isArray(requestData.tags_ar) 
      ? requestData.tags_ar.map((tag: any) => tag?.toString().trim()).filter(Boolean)
      : [];
    
    const tags_en = Array.isArray(requestData.tags_en) 
      ? requestData.tags_en.map((tag: any) => tag?.toString().trim()).filter(Boolean)
      : [];

    // 4. إعداد البيانات النهائية
    const blogData = {
      title_ar: (requestData.title_ar || "").toString().trim(),
      title_en: (requestData.title_en || "").toString().trim(),
      body_ar: (requestData.body_ar || "").toString().trim(),
      body_en: (requestData.body_en || "").toString().trim(),
      excerpt_ar: (requestData.excerpt_ar || generateExcerpt(requestData.body_ar || "", 150)).toString().trim(),
      excerpt_en: (requestData.excerpt_en || generateExcerpt(requestData.body_en || "", 150)).toString().trim(),
      imageAlt_ar: (requestData.imageAlt_ar || "").toString().trim(),
      imageAlt_en: (requestData.imageAlt_en || "").toString().trim(),
      category_ar: (requestData.category_ar || "").toString().trim(),
      category_en: (requestData.category_en || "").toString().trim(),
      image: (requestData.image || "").toString().trim(),
      publishDate: requestData.publishDate ? new Date(requestData.publishDate) : new Date(),
      author: author,
      tags_ar: tags_ar,
      tags_en: tags_en,
      featured: Boolean(requestData.featured),
      status: requestData.status === "published" ? "published" : "draft",
      slug: slug,
      readTime: calculateReadTime(requestData.body_ar || requestData.body_en || ""),
      viewCount: 0
    };

    console.log("📝 Creating blog post...");

    // ========== محاولة حفظ المقال ==========
    let newPost;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`🔄 Attempt ${attempts}/${maxAttempts}`);
      
      try {
        // محاولة مباشرة لإنشاء المقال
        const savedPost = new BlogPost(blogData);
        newPost = await savedPost.save();
        console.log("✅ Blog post created successfully!");
        break;
      } catch (createError: any) {
        console.log(`⚠️ Attempt ${attempts} failed:`, createError.message);
        
        // إذا كان الخطأ بسبب slug مكرر
        if (createError.code === 11000 && createError.keyPattern?.slug) {
          console.log("🔄 Duplicate slug, generating new one...");
          blogData.slug = `${slug}-${Date.now()}-${attempts}`;
          continue;
        }
        
        // إذا كان خطأ تحقق (validation)
        if (createError.name === "ValidationError") {
          const errors = Object.values(createError.errors).map((err: any) => err.message);
          return NextResponse.json(
            { 
              success: false, 
              message: "Validation error",
              errors
            },
            { status: 400 }
          );
        }
        
        // لأي خطأ آخر، أعد المحاولة
        if (attempts === maxAttempts) {
          throw createError;
        }
      }
    }

    if (!newPost) {
      throw new Error("Failed to create blog post after multiple attempts");
    }

    // ========== الرد الناجح ==========
    return NextResponse.json({
      success: true,
      data: {
        id: newPost._id,
        title_ar: newPost.title_ar,
        title_en: newPost.title_en,
        slug: newPost.slug,
        status: newPost.status,
        author: newPost.author,
        publishDate: newPost.publishDate,
        excerpt_ar: newPost.excerpt_ar,
        excerpt_en: newPost.excerpt_en
      },
      message: "Blog post created successfully",
    }, { status: 201 });

  } catch (err: any) {
    console.error("💥 POST /api/blog - Critical error:", {
      name: err.name,
      message: err.message,
      code: err.code,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

    // الرد حسب نوع الخطأ
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors || {}).map((error: any) => error.message);
      return NextResponse.json(
        { 
          success: false, 
          message: "Validation error",
          errors
        },
        { status: 400 }
      );
    }

    if (err.code === 11000) {
      return NextResponse.json(
        { 
          success: false, 
          message: "A blog post with this title or slug already exists"
        },
        { status: 409 }
      );
    }

    // رد عام للخطأ
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to create blog post",
        error: process.env.NODE_ENV === 'development' ? err.message : "Internal server error"
      },
      { status: 500 }
    );
  }
}

// ==================== GET - جلب جميع المقالات ====================

export async function GET(req: Request) {
  try {
    console.log("📚 GET /api/blog - Fetching posts");
    
    // محاولة الاتصال بقاعدة البيانات
    try {
      await connectDB();
    } catch (dbError: any) {
      console.error("❌ Database connection failed:", dbError.message);
      return NextResponse.json(
        { 
          success: false, 
          message: "Database connection failed",
          data: []
        },
        { status: 200 } // نرجع 200 مع بيانات فارغة بدلاً من 500
      );
    }

    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const tag = url.searchParams.get("tag");
    const category = url.searchParams.get("category");
    const status = url.searchParams.get("status") || "published";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 1000);

    // بناء query آمن
    const query: any = { status: status };

    if (search) {
      query.$or = [
        { title_ar: { $regex: search, $options: "i" } },
        { title_en: { $regex: search, $options: "i" } }
      ];
    }

    if (tag) {
      query.$or = [
        { tags_ar: { $in: [tag] } },
        { tags_en: { $in: [tag] } }
      ];
    }

    if (category) {
      query.$or = [
        { category_ar: category },
        { category_en: category }
      ];
    }

    const total = await BlogPost.countDocuments(query);
    const posts = await BlogPost.find(query)
      .sort({ publishDate: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    console.log(`✅ Found ${posts.length} blog posts`);

    return NextResponse.json({
      success: true,
      data: posts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (err: any) {
    console.error("❌ GET /api/blog error:", err.message);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to load blog posts",
        data: [],
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      },
      { status: 200 } // نرجع 200 مع بيانات فارغة
    );
  }
}