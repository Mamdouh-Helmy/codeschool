// app/api/blog/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "../../models/BlogPost";

// =============== GET - جلب جميع المقالات ===============
export async function GET(req: Request) {
  try {
    console.log("📚 GET /api/blog - Fetching blog posts");
    
    await connectDB();
    console.log("✅ Database connected");

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const tag = searchParams.get("tag");
    const category = searchParams.get("category");
    const status = searchParams.get("status") || "published";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const skip = (page - 1) * limit;

    // بناء query آمن
    const query: any = {};
    
    // فلتر الحالة
    if (status === "published" || status === "draft") {
      query.status = status;
    }

    // البحث
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { title_ar: { $regex: searchRegex } },
        { title_en: { $regex: searchRegex } },
        { body_ar: { $regex: searchRegex } },
        { body_en: { $regex: searchRegex } },
        { excerpt_ar: { $regex: searchRegex } },
        { excerpt_en: { $regex: searchRegex } }
      ];
    }

    // فلتر التاج
    if (tag && tag.trim() !== "") {
      query.$or = [
        { tags_ar: { $in: [tag.trim()] } },
        { tags_en: { $in: [tag.trim()] } }
      ];
    }

    // فلتر التصنيف
    if (category && category.trim() !== "") {
      query.$or = [
        { category_ar: category.trim() },
        { category_en: category.trim() }
      ];
    }

    console.log("🔍 Query:", JSON.stringify(query, null, 2));

    // الحصول على العدد الكلي
    const total = await BlogPost.countDocuments(query);
    
    // جلب البيانات مع الباجينيش
    const posts = await BlogPost.find(query)
      .sort({ publishDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // استخدام lean() للحصول على كائنات JavaScript عادية

    console.log(`✅ Found ${posts.length} blog posts out of ${total} total`);

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
    console.error("❌ GET /api/blog error:", {
      message: err.message,
      stack: err.stack
    });
    
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

// =============== POST - إنشاء مقال جديد ===============
export async function POST(req: Request) {
  console.log("🚀 POST /api/blog - Starting...");
  
  let requestData: any = null;
  
  try {
    // محاولة الاتصال بقاعدة البيانات
    try {
      await connectDB();
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

    // قراءة البيانات من الطلب
    try {
      requestData = await req.json();
      console.log("📥 Received data. Keys:", Object.keys(requestData));
    } catch (parseError: any) {
      console.error("❌ Failed to parse request body:", parseError.message);
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid JSON data",
          error: process.env.NODE_ENV === 'development' ? parseError.message : undefined
        },
        { status: 400 }
      );
    }

    // ============ التحقق من البيانات الأساسية ============
    const errors: string[] = [];
    
    // تحقق من العنوان (يجب أن يكون أحدهما على الأقل)
    if (
      (!requestData.title_ar || requestData.title_ar.trim() === "") &&
      (!requestData.title_en || requestData.title_en.trim() === "")
    ) {
      errors.push("Title is required in at least one language (Arabic or English)");
    }

    // تحقق من المحتوى (يجب أن يكون أحدهما على الأقل)
    if (
      (!requestData.body_ar || requestData.body_ar.trim() === "") &&
      (!requestData.body_en || requestData.body_en.trim() === "")
    ) {
      errors.push("Content is required in at least one language (Arabic or English)");
    }

    // تحقق من المؤلف
    if (!requestData.author) {
      errors.push("Author information is required");
    } else if (
      (!requestData.author.name_ar || requestData.author.name_ar.trim() === "") &&
      (!requestData.author.name_en || requestData.author.name_en.trim() === "")
    ) {
      errors.push("Author name is required in at least one language");
    }

    if (errors.length > 0) {
      console.log("❌ Validation errors:", errors);
      return NextResponse.json(
        { 
          success: false, 
          message: "Validation failed",
          errors 
        },
        { status: 400 }
      );
    }

    // ============ توليد SLUG آمن ============
    const generateSlug = (): string => {
      // استخدام عنوان المقال أو إنشاء slug عشوائي
      const titleToUse = requestData.title_en || requestData.title_ar || "untitled-post";
      
      // تحويل إلى slug بشكل آمن
      let slug = titleToUse
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // مسافات إلى شرطات
        .replace(/[^\w\-]/g, '')        // إزالة الرموز غير المرغوبة
        .replace(/\-\-+/g, '-')         // شرطات متعددة إلى واحدة
        .replace(/^-+/, '')             // إزالة الشرطات من البداية
        .replace(/-+$/, '');            // إزالة الشرطات من النهاية

      // إذا كان Slug قصير جداً، نضيف جزءاً عشوائياً
      if (slug.length < 3) {
        const random = Math.random().toString(36).substring(2, 7);
        slug = slug + '-' + random;
      }

      // إضافة timestamp لضمان التفرد
      const timestamp = Date.now().toString(36);
      slug = `${slug}-${timestamp}`;
      
      console.log("🔗 Generated slug:", slug);
      return slug;
    };

    // ============ توليد EXCERPT إذا لم يكن موجوداً ============
    const generateExcerpt = (content: string, maxLength: number = 150): string => {
      if (!content || content.trim() === "") return "";
      
      // إزالة أي tags HTML
      const plainText = content.replace(/<[^>]*>/g, '').trim();
      
      if (plainText.length <= maxLength) {
        return plainText;
      }
      
      // قص النص مع الحفاظ على الكلمات
      const trimmed = plainText.substr(0, maxLength);
      return trimmed.substr(0, Math.min(trimmed.length, trimmed.lastIndexOf(' '))) + '...';
    };

    // ============ حساب وقت القراءة ============
    const calculateReadTime = (content: string): number => {
      if (!content || content.trim() === "") return 5;
      
      const words = content.trim().split(/\s+/).length;
      const minutes = Math.max(1, Math.ceil(words / 200));
      return minutes;
    };

    // ============ إعداد بيانات المؤلف ============
    const authorData = {
      name_ar: (requestData.author?.name_ar || "Admin").trim(),
      name_en: (requestData.author?.name_en || "Admin").trim(),
      email: (requestData.author?.email || "").trim().toLowerCase(),
      avatar: (requestData.author?.avatar || "/images/default-avatar.jpg").trim(),
      role: (requestData.author?.role || "Author").trim(),
    };

    // ============ إعداد بيانات المقال الكاملة ============
    const blogData = {
      title_ar: (requestData.title_ar || "").trim(),
      title_en: (requestData.title_en || "").trim(),
      body_ar: (requestData.body_ar || "").trim(),
      body_en: (requestData.body_en || "").trim(),
      excerpt_ar: (requestData.excerpt_ar || generateExcerpt(requestData.body_ar || "")).trim(),
      excerpt_en: (requestData.excerpt_en || generateExcerpt(requestData.body_en || "")).trim(),
      imageAlt_ar: (requestData.imageAlt_ar || "").trim(),
      imageAlt_en: (requestData.imageAlt_en || "").trim(),
      category_ar: (requestData.category_ar || "").trim(),
      category_en: (requestData.category_en || "").trim(),
      image: (requestData.image || "").trim(),
      publishDate: requestData.publishDate ? new Date(requestData.publishDate) : new Date(),
      author: authorData,
      tags_ar: Array.isArray(requestData.tags_ar) 
        ? requestData.tags_ar.map((tag: any) => tag.toString().trim()).filter(Boolean)
        : [],
      tags_en: Array.isArray(requestData.tags_en) 
        ? requestData.tags_en.map((tag: any) => tag.toString().trim()).filter(Boolean)
        : [],
      featured: Boolean(requestData.featured),
      status: requestData.status === "published" ? "published" : "draft",
      slug: generateSlug(),
      readTime: calculateReadTime(requestData.body_ar || requestData.body_en || ""),
      viewCount: 0
    };

    console.log("📝 Prepared blog data:", {
      title_ar: blogData.title_ar.substring(0, 50),
      title_en: blogData.title_en.substring(0, 50),
      slug: blogData.slug,
      status: blogData.status,
      author: blogData.author.name_ar
    });

    // ============ محاولة حفظ المقال ============
    console.log("💾 Attempting to save blog post to database...");
    
    let newPost;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`🔄 Attempt ${attempts}/${maxAttempts}`);
        
        newPost = await BlogPost.create(blogData);
        console.log("✅ Blog post created successfully!");
        break;
        
      } catch (createError: any) {
        console.error(`❌ Attempt ${attempts} failed:`, createError.message);
        
        // إذا كان الخطأ بسبب slug مكرر
        if (createError.code === 11000 && createError.keyPattern?.slug) {
          console.log("🔄 Duplicate slug detected, generating new one...");
          
          // إضافة جزء عشوائي للـ slug
          const randomSuffix = Math.random().toString(36).substring(2, 6);
          blogData.slug = `${blogData.slug.split('-').slice(0, -1).join('-')}-${randomSuffix}`;
          console.log("🔗 New slug:", blogData.slug);
          
          continue;
        }
        
        // إذا كان خطأ آخر، نرمي الخطأ
        throw createError;
      }
    }

    if (!newPost) {
      throw new Error("Failed to create blog post after multiple attempts");
    }

    // ============ الرد الناجح ============
    console.log("🎉 Blog post created successfully! ID:", newPost._id);
    
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
        excerpt_en: newPost.excerpt_en,
        featured: newPost.featured,
        readTime: newPost.readTime
      },
      message: "Blog post created successfully",
    }, { 
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });

  } catch (err: any) {
    console.error("💥 POST /api/blog - Critical error:", {
      name: err.name,
      message: err.message,
      code: err.code,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      dataReceived: requestData ? {
        hasTitleAr: !!requestData.title_ar,
        hasTitleEn: !!requestData.title_en,
        hasAuthor: !!requestData.author,
        keys: Object.keys(requestData)
      } : "No data received"
    });

    // معالجة أنواع الأخطاء المختلفة
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors || {}).map((error: any) => ({
        field: error.path,
        message: error.message
      }));
      
      return NextResponse.json(
        { 
          success: false, 
          message: "Data validation failed",
          errors 
        },
        { status: 400 }
      );
    }

    if (err.code === 11000) {
      const duplicateField = Object.keys(err.keyPattern || {})[0];
      return NextResponse.json(
        { 
          success: false, 
          message: `Duplicate value found for ${duplicateField}`,
          field: duplicateField
        },
        { status: 409 }
      );
    }

    // خطأ عام
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