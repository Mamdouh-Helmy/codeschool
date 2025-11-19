// app/api/blog/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "../../models/BlogPost";
import { verifyJwt } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

interface SafeUser {
  id: string;
  role?: string;
  name?: string;
  email?: string;
  image?: string;
}

interface AuthorData {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
}

// دالة محسنة لإنشاء slug فريد
function createSlug(title: string): string {
  if (!title || title.trim() === "") {
    return `post-${Date.now()}`;
  }
  
  let slug = title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  // إذا أصبح slug فارغاً بعد التنظيف
  if (slug === "") {
    return `post-${Date.now()}`;
  }

  return slug;
}

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await connectDB();

    const token = req.headers.get("authorization")?.split(" ")[1];
    if (token) {
      const user = verifyJwt(token);
      if (!user || !user.role || !hasPermission(user.role, "blogs", "read")) {
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
  } catch (err: any) {
    console.error("Fetch blogs error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to load blogs" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    await connectDB();

    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const user = verifyJwt(token);
    if (!user || !user.role || !hasPermission(user.role, "blogs", "create")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const data = await req.json();
    console.log("Received data:", data);

    // التحقق من المحتوى المطلوب
    if (!data.body || data.body.trim() === "" || data.body === "<p></p>" || data.body === "<p><br></p>") {
      return NextResponse.json(
        { success: false, message: "Blog content is required" },
        { status: 400 }
      );
    }

    if (!data.title || data.title.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Blog title is required" },
        { status: 400 }
      );
    }

    // التحقق من عدم وجود مقال بنفس العنوان
    const existingPost = await BlogPost.findOne({ 
      title: { $regex: new RegExp(`^${data.title}$`, 'i') } 
    });

    if (existingPost) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Blog post with this title already exists",
          existingPostId: existingPost._id
        },
        { status: 400 }
      );
    }

    // إنشاء slug فريد
    let slug = createSlug(data.title);
    let counter = 1;
    const originalSlug = slug;

    while (await BlogPost.findOne({ slug })) {
      slug = `${originalSlug}-${counter}`;
      counter++;
      
      // لمنع loop لا نهائي
      if (counter > 100) {
        slug = `${originalSlug}-${Date.now()}`;
        break;
      }
    }

    let authorData: AuthorData;

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

    if (!authorData.name || authorData.name.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Author name is required" },
        { status: 400 }
      );
    }

    const newPost = await BlogPost.create({
      ...data,
      slug,
      author: authorData,
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
      // تنظيف الـ slug الفارغ في قاعدة البيانات
      try {
        await BlogPost.deleteMany({ slug: "" });
        console.log("✅ Cleaned empty slugs from database");
      } catch (cleanupError) {
        console.error("Error cleaning empty slugs:", cleanupError);
      }
      
      return NextResponse.json(
        { success: false, message: "Blog post with this slug already exists. Please try again." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to create blog" },
      { status: 500 }
    );
  }
}