import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "../../../models/BlogPost";

export async function GET() {
  try {
    await connectDB();

    // جلب جميع التاجات من المقالات المنشورة
    const posts = await BlogPost.find({ status: "published" });
    const allTags = posts.flatMap(post => post.tags || []);
    
    // إزالة التكرارات وترتيبها
    const uniqueTags = [...new Set(allTags)].sort();

    console.log(`✅ Found ${uniqueTags.length} unique tags`);

    return NextResponse.json({
      success: true,
      tags: uniqueTags,
    });
  } catch (error) {
    console.error("Tags fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}