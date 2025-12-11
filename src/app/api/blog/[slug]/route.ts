// app/api/blog/[slug]/route.ts - الحل النهائي
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "../../../models/BlogPost";
import mongoose from "mongoose";

// ==================== دوال المساعدة ====================

// دالة آمنة لتوليد slug
function generateSlug(title: string): string {
  if (!title || typeof title !== "string") {
    return `post-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  // أبسط regex ممكن
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

// ==================== API Routes ====================

// GET - جلب مقال واحد
export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    console.log("📖 GET /api/blog/[slug]");
    await connectDB();

    const { slug } = await context.params;
    
    if (!slug || slug.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Slug is required" },
        { status: 400 }
      );
    }

    // التحقق إذا كان ID أم slug
    const isObjectId = mongoose.Types.ObjectId.isValid(slug);
    const query = isObjectId ? { _id: slug } : { slug: slug.trim() };

    console.log("🔍 Searching for post with query:", query);
    const post = await BlogPost.findOne(query);

    if (!post) {
      console.log("❌ Post not found");
      return NextResponse.json(
        { success: false, message: "Blog post not found" },
        { status: 404 }
      );
    }

    console.log("✅ Post found:", post._id);
    return NextResponse.json({
      success: true,
      data: post
    });
  } catch (err: any) {
    console.error("❌ GET /api/blog/[slug] error:", err.message);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch blog post",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      },
      { status: 500 }
    );
  }
}

// PUT - تحديث مقال
export async function PUT(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    console.log("✏️ PUT /api/blog/[slug]");
    await connectDB();

    const { slug } = await context.params;
    const body = await req.json();

    if (!slug || slug.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Slug is required" },
        { status: 400 }
      );
    }

    // التحقق إذا كان ID أم slug
    const isObjectId = mongoose.Types.ObjectId.isValid(slug);
    const query = isObjectId ? { _id: slug } : { slug: slug.trim() };

    // إذا تم تحديث العنوان، نحدث الـ slug
    const updateData: any = { ...body, updatedAt: new Date() };
    if (body.title_en || body.title_ar) {
      const newTitle = body.title_en || body.title_ar;
      updateData.slug = generateSlug(newTitle);
    }

    console.log("🔄 Updating post with query:", query);
    const updated = await BlogPost.findOneAndUpdate(
      query,
      updateData,
      { 
        new: true, 
        runValidators: true,
        context: 'query' // إصلاح لبعض المشاكل في validators
      }
    );

    if (!updated) {
      console.log("❌ Post not found for update");
      return NextResponse.json(
        { success: false, message: "Blog post not found" },
        { status: 404 }
      );
    }

    console.log("✅ Post updated successfully:", updated._id);
    return NextResponse.json({
      success: true,
      data: updated,
      message: "Blog post updated successfully"
    });
  } catch (err: any) {
    console.error("❌ PUT /api/blog/[slug] error:", {
      name: err.name,
      message: err.message,
      code: err.code
    });

    if (err.code === 11000) {
      return NextResponse.json(
        { success: false, message: "A blog post with this title already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to update blog post",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE - حذف مقال
export async function DELETE(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    console.log("🗑️ DELETE /api/blog/[slug]");
    await connectDB();

    const { slug } = await context.params;

    if (!slug || slug.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Slug is required" },
        { status: 400 }
      );
    }

    // التحقق إذا كان ID أم slug
    const isObjectId = mongoose.Types.ObjectId.isValid(slug);
    const query = isObjectId ? { _id: slug } : { slug: slug.trim() };

    console.log("🗑️ Deleting post with query:", query);
    const deleted = await BlogPost.findOneAndDelete(query);

    if (!deleted) {
      console.log("❌ Post not found for deletion");
      return NextResponse.json(
        { success: false, message: "Blog post not found" },
        { status: 404 }
      );
    }

    console.log("✅ Post deleted successfully:", deleted._id);
    return NextResponse.json({
      success: true,
      message: "Blog post deleted successfully"
    });
  } catch (err: any) {
    console.error("❌ DELETE /api/blog/[slug] error:", err.message);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to delete blog post",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      },
      { status: 500 }
    );
  }
}