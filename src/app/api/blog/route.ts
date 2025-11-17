import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "../../models/BlogPost";
import { verifyJwt } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export async function GET(req: Request) {
  try {
    await connectDB();

    const token = req.headers.get("authorization")?.split(" ")[1];
    if (token) {
      const user = verifyJwt(token);
      if (!user || !hasPermission(user.role, "blogs", "read")) {
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
    const status = url.searchParams.get("status") || "published"; // Default to published
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "100");

    const query: any = { status }; // Filter by status

    if (search) query.title = { $regex: search, $options: "i" };
    if (tag) query.tags = { $in: [tag] }; // Filter by tag
    if (category) query.category = category;

    console.log("🔍 Database Query:", query); // Debug log

    const total = await BlogPost.countDocuments(query);
    const posts = await BlogPost.find(query)
      .sort({ publishDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    console.log(`✅ Found ${posts.length} posts with query`); // Debug log

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
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const user = verifyJwt(token);
    if (!user || !hasPermission(user.role, "blogs", "create")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const data = await req.json();

    console.log("Received data:", data);

    let authorData;

    if (data.author && typeof data.author === "object") {
      authorData = {
        id: user.id,
        name: data.author.name || user.name || "Admin",
        email: data.author.email || user.email || "",
        avatar:
          data.author.avatar || user.image || "/images/default-avatar.jpg",
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