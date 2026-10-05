// app/api/blog/[slug]/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "../../../models/BlogPost";

// ==================== دوال المساعدة ====================

// ✅ ObjectId حقيقي = 24 حرف hex بالظبط.
// (mongoose.Types.ObjectId.isValid بترجّع true لأي string طوله 12 حرف،
//  فأي slug طوله 12 حرف كان بيتعامل كأنه ID ومبيلاقيش المقال)
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

function buildQuery(slugOrId: string) {
  const value = slugOrId.trim();
  return OBJECT_ID_RE.test(value) ? { _id: value } : { slug: value };
}

// بيشيل <style> و <script> وكل الـ tags عشان الملخص ووقت القراءة
// ميتحسبوش على كود CSS/JS
function stripCode(content: string): string {
  return content
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function generateExcerpt(content: string, maxLength: number = 150): string {
  if (!content || typeof content !== "string") return "";
  try {
    const plain = stripCode(content);
    return plain.length <= maxLength
      ? plain
      : plain.substring(0, maxLength).trim() + "...";
  } catch {
    return "";
  }
}

function calculateReadTime(content: string): number {
  if (!content || typeof content !== "string") return 5;
  try {
    const words = stripCode(content)
      .split(/\s+/)
      .filter((word) => word.length > 0);
    return Math.max(1, Math.ceil(words.length / 200));
  } catch {
    return 5;
  }
}

// حقول مينفعش تتعدّل من الـ body
const PROTECTED_FIELDS = ["_id", "__v", "slug", "createdAt", "updatedAt"];

// ==================== API Routes ====================

// GET - جلب مقال واحد
export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();

    const { slug } = await context.params;

    if (!slug || slug.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Slug is required" },
        { status: 400 }
      );
    }

    const post = await BlogPost.findOne(buildQuery(slug));

    if (!post) {
      return NextResponse.json(
        { success: false, message: "Blog post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: post });
  } catch (err: any) {
    console.error("❌ GET /api/blog/[slug] error:", err.message);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch blog post",
        error: process.env.NODE_ENV === "development" ? err.message : undefined,
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
    await connectDB();

    const { slug } = await context.params;
    const body = await req.json();

    if (!slug || slug.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Slug is required" },
        { status: 400 }
      );
    }

    // ✅ نسخ الحقول المسموحة بس (من غير _id / slug / createdAt ...)
    const updateData: any = {};
    for (const [key, val] of Object.entries(body)) {
      if (!PROTECTED_FIELDS.includes(key)) updateData[key] = val;
    }

    // ✅ الـ slug بيفضل ثابت بعد الإنشاء.
    // قبل كده كان بيتولّد من جديد مع كل تعديل، والعناوين العربي (اللي مفيهاش
    // حروف إنجليزي) كانت بتاخد slug عشوائي جديد كل مرة فاللينكات القديمة بتموت.

    // ✅ viewCount رقم صحيح وغير سالب
    if ("viewCount" in updateData) {
      const parsed = parseInt(String(updateData.viewCount));
      updateData.viewCount = isNaN(parsed) ? 0 : Math.max(0, parsed);
    }

    // ✅ readTime والملخص بيتحدّثوا لما المحتوى يتغير
    if ("body_ar" in updateData || "body_en" in updateData) {
      updateData.readTime = calculateReadTime(
        updateData.body_ar || updateData.body_en || ""
      );
      if ("body_ar" in updateData && !updateData.excerpt_ar) {
        updateData.excerpt_ar = generateExcerpt(updateData.body_ar || "");
      }
      if ("body_en" in updateData && !updateData.excerpt_en) {
        updateData.excerpt_en = generateExcerpt(updateData.body_en || "");
      }
    }

    const updated = await BlogPost.findOneAndUpdate(buildQuery(slug), updateData, {
      new: true,
      runValidators: true,
      context: "query",
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Blog post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Blog post updated successfully",
    });
  } catch (err: any) {
    console.error("❌ PUT /api/blog/[slug] error:", {
      name: err.name,
      message: err.message,
      code: err.code,
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
        error: process.env.NODE_ENV === "development" ? err.message : undefined,
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
    await connectDB();

    const { slug } = await context.params;

    if (!slug || slug.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Slug is required" },
        { status: 400 }
      );
    }

    const deleted = await BlogPost.findOneAndDelete(buildQuery(slug));

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Blog post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Blog post deleted successfully",
    });
  } catch (err: any) {
    console.error("❌ DELETE /api/blog/[slug] error:", err.message);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete blog post",
        error: process.env.NODE_ENV === "development" ? err.message : undefined,
      },
      { status: 500 }
    );
  }
}