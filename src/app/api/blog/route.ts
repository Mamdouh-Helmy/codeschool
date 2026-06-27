import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "../../models/BlogPost";

// ==================== دوال المساعدة ====================

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

function generateExcerpt(content: string, maxLength: number = 150): string {
  if (!content || typeof content !== "string") {
    return "";
  }

  try {
    const plain = content.replace(/<[^>]*>/g, "").trim();
    return plain.length <= maxLength
      ? plain
      : plain.substring(0, maxLength).trim() + "...";
  } catch {
    return "";
  }
}

function calculateReadTime(content: string): number {
  if (!content || typeof content !== "string") {
    return 5;
  }

  try {
    const plain = content.replace(/<[^>]*>/g, "").trim();
    const words = plain.split(/\s+/).filter((word) => word.length > 0);
    return Math.max(1, Math.ceil(words.length / 200));
  } catch {
    return 5;
  }
}

// ==================== POST - إنشاء مقال جديد ====================

export async function POST(req: Request) {
  console.log("🚀 POST /api/blog - Starting...");

  try {
    await connectDB();
    console.log("✅ Database connected successfully");

    let requestData: any;
    try {
      const contentType = req.headers.get("content-type") || "";

      if (contentType.includes("multipart/form-data")) {
        const formData = await req.formData();
        requestData = Object.fromEntries(formData.entries());

        if (typeof requestData.data === "string") {
          try {
            const parsedData = JSON.parse(requestData.data);
            requestData = { ...requestData, ...parsedData };
          } catch {
            console.log("⚠️ Could not parse 'data' field as JSON");
          }
        }
      } else {
        requestData = await req.json();
      }

      console.log("📥 Received blog data:", {
        hasViewCount: requestData.viewCount !== undefined,
        viewCount: requestData.viewCount,
        viewCountType: typeof requestData.viewCount,
      });
    } catch (parseError: any) {
      console.error("❌ Failed to parse request:", parseError.message);
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request data format",
          error: parseError.message,
        },
        { status: 400 },
      );
    }

    let viewCountValue = 0;
    if (requestData.viewCount !== undefined && requestData.viewCount !== null) {
      const parsed = parseInt(requestData.viewCount.toString());
      viewCountValue = isNaN(parsed) ? 0 : Math.max(0, parsed);
    }
    console.log("✅ Parsed viewCount for saving:", viewCountValue);

    if (
      (!requestData.title_ar || requestData.title_ar.trim() === "") &&
      (!requestData.title_en || requestData.title_en.trim() === "")
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Blog title is required in at least one language",
        },
        { status: 400 },
      );
    }

    if (
      (!requestData.body_ar || requestData.body_ar.trim() === "") &&
      (!requestData.body_en || requestData.body_en.trim() === "")
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Blog content is required in at least one language",
        },
        { status: 400 },
      );
    }

    const titleToUse = requestData.title_en || requestData.title_ar || "Untitled Post";
    const slug = generateSlug(titleToUse);
    console.log("🔗 Generated slug:", slug);

    let imageUrl = (requestData.image || "").toString().trim();
    if (imageUrl.endsWith("/")) {
      imageUrl = imageUrl.slice(0, -1);
    }
    if (imageUrl === "/uploads/") {
      imageUrl = "";
      console.log("⚠️ Fixed empty image URL");
    }

    let authorAvatar = (requestData.author?.avatar || "").toString().trim();
    if (authorAvatar.endsWith("/")) {
      authorAvatar = authorAvatar.slice(0, -1);
    }
    if (authorAvatar === "/uploads/") {
      authorAvatar = "/images/default-avatar.jpg";
    }

    // ✅ تنظيف التاجات بشكل موحّد: trim + إزالة الفاضي + إزالة التكرار
    const cleanTags = (tags: any): string[] => {
      if (!Array.isArray(tags)) return [];
      const cleaned = tags
        .map((tag: any) => tag?.toString().trim())
        .filter((tag: string) => Boolean(tag));
      return [...new Set(cleaned)];
    };

    const blogData = {
      title_ar: (requestData.title_ar || "").toString().trim(),
      title_en: (requestData.title_en || "").toString().trim(),
      body_ar: (requestData.body_ar || "").toString().trim(),
      body_en: (requestData.body_en || "").toString().trim(),
      excerpt_ar: (
        requestData.excerpt_ar || generateExcerpt(requestData.body_ar || "", 150)
      ).toString().trim(),
      excerpt_en: (
        requestData.excerpt_en || generateExcerpt(requestData.body_en || "", 150)
      ).toString().trim(),
      imageAlt_ar: (requestData.imageAlt_ar || "").toString().trim(),
      imageAlt_en: (requestData.imageAlt_en || "").toString().trim(),
      category_ar: (requestData.category_ar || "").toString().trim(),
      category_en: (requestData.category_en || "").toString().trim(),
      image: imageUrl,
      publishDate: requestData.publishDate
        ? new Date(requestData.publishDate)
        : new Date(),
      author: {
        name_ar: (requestData.author?.name_ar || "Admin").toString().trim(),
        name_en: (requestData.author?.name_en || "Admin").toString().trim(),
        email: (requestData.author?.email || "").toString().trim(),
        avatar: authorAvatar,
        role: (requestData.author?.role || "Author").toString().trim(),
      },
      tags_ar: cleanTags(requestData.tags_ar),
      tags_en: cleanTags(requestData.tags_en),
      featured: Boolean(requestData.featured),
      status: requestData.status === "published" ? "published" : "draft",
      slug: slug,
      readTime: calculateReadTime(requestData.body_ar || requestData.body_en || ""),
      viewCount: viewCountValue,
    };

    console.log("📝 Creating blog post with tags:", {
      tags_ar: blogData.tags_ar,
      tags_en: blogData.tags_en,
    });

    const newPost = await BlogPost.create(blogData);

    console.log("✅ Blog post created successfully!", {
      id: newPost._id,
      title: newPost.title_ar || newPost.title_en,
      viewCount: newPost.viewCount,
    });

    return NextResponse.json(
      {
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
          image: newPost.image,
          viewCount: newPost.viewCount,
        },
        message: "Blog post created successfully",
      },
      { status: 201 },
    );
  } catch (err: any) {
    console.error("💥 POST /api/blog - Error:", err.message);

    if (err.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message: "A blog post with this title or slug already exists",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create blog post",
        error: err.message || "Internal server error",
      },
      { status: 500 },
    );
  }
}

// ==================== GET - جلب جميع المقالات ====================

export async function GET(req: Request) {
  try {
    console.log("📚 GET /api/blog - Fetching posts");

    await connectDB();

    const url = new URL(req.url);
    const search = (url.searchParams.get("search") || "").trim();
    // ✅ فك الـ encoding وتنظيف الـ tag (مسافات/علامات اقتباس غير مقصودة)
    const tagParam = url.searchParams.get("tag");
    const tag = tagParam ? decodeURIComponent(tagParam).trim() : "";
    const category = (url.searchParams.get("category") || "").trim();
    const status = url.searchParams.get("status") || "published";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 1000);

    // ✅ بناء الـ query بشكل صحيح: كل شرط بييجمع مع الباقي بـ $and
    // عشان منوقعش في مشكلة إن آخر $or بيمسح اللي قبله
    const andConditions: any[] = [{ status }];

    if (search) {
      andConditions.push({
        $or: [
          { title_ar: { $regex: search, $options: "i" } },
          { title_en: { $regex: search, $options: "i" } },
        ],
      });
    }

    if (tag) {
      // ✅ مطابقة case-insensitive وتتجاهل أي مسافات زيادة، باستخدام regex بدل $in
      // ده بيحل مشكلة عدم التطابق الدقيق بين التاج المخزن والتاج القادم من الـ URL
      const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      andConditions.push({
        $or: [
          { tags_ar: { $elemMatch: { $regex: `^${escapedTag}$`, $options: "i" } } },
          { tags_en: { $elemMatch: { $regex: `^${escapedTag}$`, $options: "i" } } },
        ],
      });
    }

    if (category) {
      andConditions.push({
        $or: [{ category_ar: category }, { category_en: category }],
      });
    }

    const query: any = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    console.log("🔍 Final MongoDB query:", JSON.stringify(query));

    const total = await BlogPost.countDocuments(query);
    const posts = await BlogPost.find(query)
      .sort({ publishDate: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    console.log(`✅ Found ${posts.length} blog posts (tag filter: "${tag || "none"}")`);

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
        error: err.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}

// ==================== OPTIONS - دعم CORS ====================

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    },
  );
}