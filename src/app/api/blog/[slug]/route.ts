// app/api/blog/[slug]/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "../../../models/BlogPost";
import mongoose from "mongoose";

// =============== GET - جلب مقال واحد ===============
export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    console.log("📖 GET /api/blog/[slug] - Starting...");
    
    const { slug } = await context.params;
    
    if (!slug || slug.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Slug parameter is required" },
        { status: 400 }
      );
    }

    await connectDB();
    console.log("✅ Database connected");

    // تنظيف الـ slug
    const cleanSlug = slug.trim();
    
    // البحث بالـ slug
    const post = await BlogPost.findOne({ slug: cleanSlug });
    
    if (!post) {
      console.log("❌ Post not found with slug:", cleanSlug);
      return NextResponse.json(
        { success: false, message: "Blog post not found" },
        { status: 404 }
      );
    }

    console.log("✅ Post found:", post._id);
    
    // زيادة عدد المشاهدات
    await BlogPost.updateOne(
      { _id: post._id },
      { $inc: { viewCount: 1 } }
    );

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

// =============== PUT - تحديث مقال ===============
export async function PUT(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    console.log("✏️ PUT /api/blog/[slug] - Starting...");
    
    const { slug } = await context.params;
    const requestData = await req.json();
    
    if (!slug || slug.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Slug parameter is required" },
        { status: 400 }
      );
    }

    await connectDB();
    console.log("✅ Database connected");

    const cleanSlug = slug.trim();
    
    // تحضير بيانات التحديث
    const updateData: any = { ...requestData };
    
    // إذا تم تحديث العنوان، نولد slug جديد
    if (updateData.title_ar || updateData.title_en) {
      const titleToUse = updateData.title_en || updateData.title_ar || "untitled";
      const newSlug = titleToUse
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
      
      updateData.slug = `${newSlug}-${Date.now().toString(36)}`;
    }

    // إضافة timestamp للتحديث
    updateData.updatedAt = new Date();

    console.log("🔄 Updating post with slug:", cleanSlug);
    console.log("📝 Update data:", Object.keys(updateData));

    // البحث والتحديث
    const updatedPost = await BlogPost.findOneAndUpdate(
      { slug: cleanSlug },
      updateData,
      { 
        new: true, // إرجاع الوثيقة المحدثة
        runValidators: true // تشغيل validators
      }
    );

    if (!updatedPost) {
      console.log("❌ Post not found for update");
      return NextResponse.json(
        { success: false, message: "Blog post not found" },
        { status: 404 }
      );
    }

    console.log("✅ Post updated successfully:", updatedPost._id);
    
    return NextResponse.json({
      success: true,
      data: updatedPost,
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
        { 
          success: false, 
          message: "A blog post with this slug already exists"
        },
        { status: 409 }
      );
    }

    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors || {}).map((error: any) => ({
        field: error.path,
        message: error.message
      }));
      
      return NextResponse.json(
        { 
          success: false, 
          message: "Validation failed",
          errors 
        },
        { status: 400 }
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

// =============== DELETE - حذف مقال ===============
export async function DELETE(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    console.log("🗑️ DELETE /api/blog/[slug] - Starting...");
    
    const { slug } = await context.params;
    
    if (!slug || slug.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Slug parameter is required" },
        { status: 400 }
      );
    }

    await connectDB();
    console.log("✅ Database connected");

    const cleanSlug = slug.trim();
    
    console.log("🗑️ Deleting post with slug:", cleanSlug);
    
    const deletedPost = await BlogPost.findOneAndDelete({ slug: cleanSlug });
    
    if (!deletedPost) {
      console.log("❌ Post not found for deletion");
      return NextResponse.json(
        { success: false, message: "Blog post not found" },
        { status: 404 }
      );
    }

    console.log("✅ Post deleted successfully:", deletedPost._id);
    
    return NextResponse.json({
      success: true,
      message: "Blog post deleted successfully",
      data: {
        id: deletedPost._id,
        title_ar: deletedPost.title_ar,
        title_en: deletedPost.title_en
      }
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