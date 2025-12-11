// app/api/blog/route.ts - الحل النهائي الكامل
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "../../models/BlogPost";

// ==================== دوال المساعدة ====================

// دالة آمنة تماماً لتوليد slug
function generateSlug(title: string): string {
  if (!title || typeof title !== "string") {
    return `post-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  // أبسط regex ممكن - فقط الحروف والأرقام والشرطات
  let slug = title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")           // مسافات إلى شرطات
    .replace(/[^\w\-]/g, "")        // إزالة كل شيء غير حروف وأرقام وشرطات
    .replace(/-+/g, "-")            // شرطات متعددة إلى واحدة
    .replace(/^-+/, "")             // إزالة الشرطات من البداية
    .replace(/-+$/, "");            // إزالة الشرطات من النهاية

  // إذا لم يتبق شيء، نولد slug عشوائي
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
    // إزالة HTML tags بطريقة آمنة
    const plain = content.replace(/<[^>]*>/g, "").trim();
    
    if (plain.length <= maxLength) {
      return plain;
    }
    
    // قص النص مع إضافة ...
    return plain.substring(0, maxLength).trim() + "...";
  } catch {
    // في حالة أي خطأ، نرجع سلسلة فارغة
    return "";
  }
}

// دالة آمنة لحساب وقت القراءة
function calculateReadTime(content: string): number {
  if (!content || typeof content !== "string") {
    return 5; // وقت افتراضي
  }
  
  try {
    const plain = content.replace(/<[^>]*>/g, "").trim();
    const words = plain.split(/\s+/).filter(word => word.length > 0);
    const minutes = Math.max(1, Math.ceil(words.length / 200));
    return minutes;
  } catch {
    return 5; // وقت افتراضي في حالة الخطأ
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

  if (data.author) {
    if (
      (!data.author.name_ar || data.author.name_ar.trim() === "") &&
      (!data.author.name_en || data.author.name_en.trim() === "")
    ) {
      errors.push("Author name is required in at least one language");
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ==================== API Routes ====================

// GET - جلب جميع المقالات
export async function GET(req: Request) {
  try {
    console.log("📚 GET /api/blog - Fetching blog posts");
    await connectDB();

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
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      },
      { status: 500 }
    );
  }
}

// POST - إنشاء مقال جديد
export async function POST(req: Request) {
  let requestData: any = null;

  try {
    console.log("🚀 POST /api/blog - Creating new blog post");
    await connectDB();

    // قراءة البيانات مرة واحدة فقط
    requestData = await req.json();
    
    console.log("📥 Received blog data:", {
      title_ar: requestData.title_ar?.substring(0, 30) || "(empty)",
      title_en: requestData.title_en?.substring(0, 30) || "(empty)"
    });

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
    let slug = generateSlug(titleToUse);
    console.log("🔗 Generated slug (attempt 1):", slug);

    // 2. توليد excerpts إذا لم تكن موجودة
    const excerpt_ar = requestData.excerpt_ar || generateExcerpt(requestData.body_ar || "", 150);
    const excerpt_en = requestData.excerpt_en || generateExcerpt(requestData.body_en || "", 150);

    // 3. حساب وقت القراءة
    const readTime = calculateReadTime(requestData.body_ar || requestData.body_en || "");

    // 4. إعداد بيانات المؤلف
    const author = {
      name_ar: requestData.author?.name_ar?.trim() || "Admin",
      name_en: requestData.author?.name_en?.trim() || "Admin",
      email: requestData.author?.email?.trim() || "",
      avatar: requestData.author?.avatar?.trim() || "/images/default-avatar.jpg",
      role: requestData.author?.role?.trim() || "Author",
    };

    // 5. إعداد البيانات النهائية للمقال
    const blogData = {
      title_ar: requestData.title_ar?.trim() || "",
      title_en: requestData.title_en?.trim() || "",
      body_ar: requestData.body_ar?.trim() || "",
      body_en: requestData.body_en?.trim() || "",
      excerpt_ar: excerpt_ar,
      excerpt_en: excerpt_en,
      imageAlt_ar: requestData.imageAlt_ar?.trim() || "",
      imageAlt_en: requestData.imageAlt_en?.trim() || "",
      category_ar: requestData.category_ar?.trim() || "",
      category_en: requestData.category_en?.trim() || "",
      image: requestData.image?.trim() || "",
      publishDate: requestData.publishDate ? new Date(requestData.publishDate) : new Date(),
      author: author,
      tags_ar: Array.isArray(requestData.tags_ar) ? requestData.tags_ar.map((tag: any) => tag?.toString().trim()).filter(Boolean) : [],
      tags_en: Array.isArray(requestData.tags_en) ? requestData.tags_en.map((tag: any) => tag?.toString().trim()).filter(Boolean) : [],
      featured: Boolean(requestData.featured),
      status: requestData.status === "published" ? "published" : "draft",
      slug: slug,
      readTime: readTime,
      viewCount: 0
    };

    console.log("📝 Creating blog post with sanitized data");

    // ========== محاولة حفظ المقال ==========
    let newPost;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`🔄 Attempt ${attempts}/${maxAttempts} to create blog post`);
        
        newPost = await BlogPost.create(blogData);
        console.log("✅ Blog post created successfully! ID:", newPost._id);
        break; // نجح، نخرج من الحلقة
      } catch (createError: any) {
        console.log(`⚠️ Attempt ${attempts} failed:`, createError.message);
        
        // إذا كان الخطأ بسبب slug مكرر
        if (createError.code === 11000 && createError.keyPattern?.slug) {
          console.log("🔄 Duplicate slug detected, generating new one...");
          // توليد slug جديد مع محاولة فريدة
          blogData.slug = `post-${Date.now()}-${attempts}-${Math.random().toString(36).substring(2, 9)}`;
          console.log("🔗 New slug:", blogData.slug);
          continue; // جرب مرة أخرى
        }
        
        // إذا كان خطأ آخر غير التكرار، أعد الخطأ
        throw createError;
      }
    }

    // إذا فشلت جميع المحاولات
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
      dataReceived: requestData ? {
        title_ar: requestData.title_ar?.substring(0, 20),
        title_en: requestData.title_en?.substring(0, 20)
      } : "No data received"
    });

    // الرد حسب نوع الخطأ
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors || {}).map((error: any) => error.message);
      return NextResponse.json(
        { 
          success: false, 
          message: "Mongoose validation error",
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
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      },
      { status: 500 }
    );
  }
}