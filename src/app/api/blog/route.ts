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
  return !!user && typeof user === 'object' && 'id' in user && 'role' in user;
}

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
  // نضيف نطاقات Unicode للغات المختلفة:
  // - العربية: \u0600-\u06FF
  // - الصينية/اليابانية/الكورية: \u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af
  // - السيريلية: \u0400-\u04FF
  // - العبرية: \u0590-\u05FF
  // - الهندية: \u0900-\u097F
  slug = slug.replace(/[^a-z0-9\u0600-\u06FF\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af\u0400-\u04FF\u0590-\u05FF\u0900-\u097F\-]/g, '');
  
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

export async function GET(req: Request) {
  try {
    await connectDB();

    const token = req.headers.get("authorization")?.split(" ")[1];
    
    // إذا كان هناك token، تحقق من الصلاحيات
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
    const limit = parseInt(url.searchParams.get("limit") || "100");

    const query: any = { status };

    if (search) query.title = { $regex: search, $options: "i" };
    if (tag) query.tags = { $in: [tag] };
    if (category) query.category = category;

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
    console.log("Received data:", data);

    // تحقق من أن العنوان غير فارغ
    if (!data.title || data.title.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Blog title is required" },
        { status: 400 }
      );
    }

    let authorData;

    if (data.author && typeof data.author === "object") {
      authorData = {
        id: user.id,
        name: data.author.name || user.name || "Admin",
        email: data.author.email || user.email || "",
        avatar: data.author.avatar || user.image || "/images/default-avatar.jpg",
        role: data.author.role || user.role || "Author",
      };
    } else {
      authorData = {
        id: user.id,
        name: data.author || user.name || "Admin",
        email: user.email || "",
        avatar: user.image || "/images/default-avatar.jpg",
        role: user.role || "Author",
      };
    }

    // تنظيف وتحقق من البيانات
    const authorName = authorData.name?.trim();
    if (!authorName) {
      return NextResponse.json(
        { success: false, message: "Author name is required" },
        { status: 400 }
      );
    }

    // تحديث الاسم بعد التنظيف
    authorData.name = authorName;

    // إنشاء slug باستخدام الدالة المحسنة
    const slug = generateSlug(data.title);

    const newPost = await BlogPost.create({
      ...data,
      author: authorData,
      slug: slug,
    });

    return NextResponse.json({
      success: true,
      data: newPost,
      message: "Blog post created successfully",
    });
  } catch (err: any) {
    console.error("Create blog error:", err);

    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map(
        (error: any) => error.message
      );
      return NextResponse.json(
        { success: false, message: "Validation error", errors },
        { status: 400 }
      );
    }

    if (err.code === 11000) {
      // إذا كان الخطأ بسبب slug مكرر، أنشئ slug جديد
      if (err.keyPattern && err.keyPattern.slug) {
        const newSlug = `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        try {
          // أعد المحاولة مع slug جديد
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
            { success: false, message: "Failed to create blog post after retry" },
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