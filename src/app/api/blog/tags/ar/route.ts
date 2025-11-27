// app/api/blog/tags/ar/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "../../../../models/BlogPost";

export async function GET() {
  try {
    await connectDB();

    // جلب جميع التاجات العربية من المقالات المنشورة
    const posts = await BlogPost.find({ status: "published" });
    const allTags = posts.flatMap(post => post.tags_ar || []);
    
    // إزالة التكرارات وترتيبها
    const uniqueTags = [...new Set(allTags)].sort();

    console.log(`✅ Found ${uniqueTags.length} unique Arabic tags`);

    return NextResponse.json({
      success: true,
      tags: uniqueTags,
    });
  } catch (error) {
    console.error("Arabic tags fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch Arabic tags" },
      { status: 500 }
    );
  }
}