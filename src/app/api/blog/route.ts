// app/api/blog/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "../../models/BlogPost";
import { verifyJwt } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

// Type Guard للتحقق من أن token صالحة
function isValidToken(token: string | undefined): token is string {
  return !!token && token.trim().length > 0;
}

// تحديث Type Guard لتشمل جميع الخصائص المطلوبة
function isValidUser(user: any): user is {
  id: string;
  role: string;
  name?: string;
  email?: string;
  image?: string;
} {
  return !!user && typeof user === "object" && "id" in user && "role" in user;
}

// دالة محسنة لتوليد slug تدعم جميع اللغات
function generateSlug(title: string): string {
  if (!title || typeof title !== "string") return "";

  let slug = title.toLowerCase().trim();
  slug = slug.replace(/\s+/g, "-");
  slug = slug.replace(
    /[^a-z0-9\u0600-\u06FF\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af\u0400-\u04FF\u0590-\u05FF\u0900-\u097F\-]/g,
    ""
  );
  slug = slug.replace(/-+/g, "-");
  slug = slug.replace(/^-+|-+$/g, "");

  if (!slug) {
    slug = `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  return slug;
}

export async function GET(req: Request) {
  try {
    await connectDB();

    const token = req.headers.get("authorization")?.split(" ")[1];

    if (isValidToken(token)) {
      const user = verifyJwt(token);
      if (!isValidUser(user) || !hasPermission(user.role, "blogs", "read")) {
        return NextResponse.json(
          { success: false, message: "Unauthorized" },
          { status: 403 }
        );
      }
    }

    const url = new URL(req.url);
    const search = url.searchParams.get("search");
    const tag = url.searchParams.get("tag");
    const category = url.searchParams.get("category");
    const status = url.searchParams.get("status") || "published";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "1000");

    const query: any = { status };

    // تحديث الاستعلام للبحث في الحقول الجديدة
    if (search) {
      query.$or = [
        { title_ar: { $regex: search, $options: "i" } },
        { title_en: { $regex: search, $options: "i" } },
        { excerpt_ar: { $regex: search, $options: "i" } },
        { excerpt_en: { $regex: search, $options: "i" } }
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

    console.log("🔍 Database Query:", query);

    const total = await BlogPost.countDocuments(query);
    const posts = await BlogPost.find(query)
      .sort({ publishDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    console.log(`✅ Found ${posts.length} posts with query`);

    return NextResponse.json({
      success: true,
      data: posts,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("Fetch blogs error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to load blogs" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const token = req.headers.get("authorization")?.split(" ")[1];

    if (!isValidToken(token)) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const user = verifyJwt(token);
    if (!isValidUser(user) || !hasPermission(user.role, "blogs", "create")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const data = await req.json();
    console.log("📥 Received data for blog creation:", data);

    // تحقق من أن العنوان غير فارغ في كلا اللغتين
    if (
      (!data.title_ar || data.title_ar.trim() === "") &&
      (!data.title_en || data.title_en.trim() === "")
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Blog title is required in at least one language",
        },
        { status: 400 }
      );
    }

    // تحقق من أن المحتوى غير فارغ في كلا اللغتين
    if (
      (!data.body_ar || data.body_ar.trim() === "") &&
      (!data.body_en || data.body_en.trim() === "")
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Blog content is required in at least one language",
        },
        { status: 400 }
      );
    }

    let authorData;

    if (data.author && typeof data.author === "object") {
      authorData = {
        id: user.id,
        name_ar: data.author.name_ar || user.name || "Admin",
        name_en: data.author.name_en || user.name || "Admin",
        email: data.author.email || user.email || "",
        avatar: data.author.avatar || user.image || "/images/default-avatar.jpg",
        role: data.author.role || user.role || "Author",
      };
    } else {
      authorData = {
        id: user.id,
        name_ar: data.author || user.name || "Admin",
        name_en: data.author || user.name || "Admin",
        email: user.email || "",
        avatar: user.image || "/images/default-avatar.jpg",
        role: user.role || "Author",
      };
    }

    // تنظيف وتحقق من البيانات
    const authorNameAr = authorData.name_ar?.trim();
    const authorNameEn = authorData.name_en?.trim();

    if (!authorNameAr && !authorNameEn) {
      return NextResponse.json(
        {
          success: false,
          message: "Author name is required in at least one language",
        },
        { status: 400 }
      );
    }

    // تحديث الاسم بعد التنظيف
    authorData.name_ar = authorNameAr;
    authorData.name_en = authorNameEn;

    // إنشاء slug باستخدام العنوان الإنجليزي أو العربي
    const slug = generateSlug(data.title_en || data.title_ar);

    // إعداد البيانات للمقال
    const blogData = {
      title_ar: data.title_ar || "",
      title_en: data.title_en || "",
      body_ar: data.body_ar || "",
      body_en: data.body_en || "",
      excerpt_ar: data.excerpt_ar || "",
      excerpt_en: data.excerpt_en || "",
      imageAlt_ar: data.imageAlt_ar || "",
      imageAlt_en: data.imageAlt_en || "",
      category_ar: data.category_ar || "",
      category_en: data.category_en || "",
      image: data.image || "",
      publishDate: data.publishDate ? new Date(data.publishDate) : new Date(),
      author: authorData,
      tags_ar: data.tags_ar || [],
      tags_en: data.tags_en || [],
      featured: data.featured || false,
      status: data.status || "draft",
      slug: slug,
    };

    console.log("📝 Creating blog with data:", blogData);

    const newPost = await BlogPost.create(blogData);

    return NextResponse.json({
      success: true,
      data: newPost,
      message: "Blog post created successfully",
    });
  } catch (err: any) {
    console.error("❌ Create blog error:", err);

    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map(
        (error: any) => error.message
      );
      console.error("Validation errors:", errors);
      return NextResponse.json(
        { 
          success: false, 
          message: "Validation error", 
          errors,
          details: err.errors 
        },
        { status: 400 }
      );
    }

    if (err.code === 11000) {
      if (err.keyPattern && err.keyPattern.slug) {
        const newSlug = `post-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        try {
          const data = await req.json();
          const newPost = await BlogPost.create({
            ...data,
            slug: newSlug,
          });
          return NextResponse.json({
            success: true,
            data: newPost,
            message: "Blog post created successfully",
          });
        } catch (retryError) {
          return NextResponse.json(
            {
              success: false,
              message: "Failed to create blog post after retry",
            },
            { status: 500 }
          );
        }
      }
      return NextResponse.json(
        { success: false, message: "Blog post with this title already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to create blog" },
      { status: 500 }
    );
  }
}