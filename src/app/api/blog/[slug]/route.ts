import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "../../../models/BlogPost";
import mongoose from "mongoose";

// دالة محسنة لتوليد slug تدعم جميع اللغات
function generateSlug(title) {
  if (!title || typeof title !== 'string') return "";
  
  let slug = title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u0600-\u06FF\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af\u0400-\u04FF\u0590-\u05FF\u0900-\u097F\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!slug) {
    slug = `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  return slug;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();

    const { slug } = await context.params;

    const isObjectId = mongoose.Types.ObjectId.isValid(slug);

    const post = await BlogPost.findOne(isObjectId ? { _id: slug } : { slug });

    if (!post) {
      return NextResponse.json(
        { success: false, message: "Blog post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: post });
  } catch (err) {
    console.error("Fetch single post error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch blog post" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await context.params;

    const body = await req.json();
    
    // إذا تم تغيير العنوان، نحدث الـ slug
    if (body.title) {
      body.slug = generateSlug(body.title);
    }
   
    const isObjectId = mongoose.Types.ObjectId.isValid(slug);
    const query = isObjectId ? { _id: slug } : { slug };
    
    const updated = await BlogPost.findOneAndUpdate(
      query, 
      { ...body, updatedAt: new Date() }, 
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Blog post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: updated,
      message: "Blog post updated successfully"
    });
  } catch (err: any) {
    console.error("Update error:", err);
    
    if (err.code === 11000) {
      return NextResponse.json(
        { success: false, message: "Blog post with this title already exists" },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: "Failed to update blog" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await context.params;

    const isObjectId = mongoose.Types.ObjectId.isValid(slug);
    const query = isObjectId ? { _id: slug } : { slug };
    
    const deleted = await BlogPost.findOneAndDelete(query);

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Blog post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: "Blog post deleted successfully" 
    });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to delete blog" },
      { status: 500 }
    );
  }
}