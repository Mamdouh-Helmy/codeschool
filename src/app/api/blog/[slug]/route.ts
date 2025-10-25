import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "../../../models/BlogPost";
import mongoose from "mongoose";

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