// app/api/blog/[slug]/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "../../../models/BlogPost";
import PostView from "../../../models/PostView";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SIGN_SECRET || process.env.NEXTAUTH_SECRET || "change_this";

// تعريف الأنواع
interface JwtPayload {
  id?: string;
  _id?: string;
}

// دالة لاستخراج userId من التوكن
function getUserIdFromToken(req: Request): string | null {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) return null;

    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return payload.id || payload._id || null;
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
}

// دالة لاستخراج IP المستخدم
function getUserIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIP = req.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return realIP || "unknown";
}

// دالة محسنة لتوليد slug تدعم جميع اللغات
function generateSlug(title: string): string {
  if (!title || typeof title !== "string") return "";

  let slug = title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(
      // 🔥 إصلاح الـ regex - إزالة النطاقات المسببة للمشكلة
      /[^a-z0-9\u0600-\u06FF\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7a3\u0400-\u04FF\u0590-\u05FF\u0900-\u097F\-]/g,
      ""
    )
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    slug = `post-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  return slug;
}

// app/api/blog/[slug]/route.ts
export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();

    const { slug } = await context.params;

    const isObjectId = mongoose.Types.ObjectId.isValid(slug);

    // 🔥 أولاً: جلب المقال بدون زيادة المشاهدات
    let post = await BlogPost.findOne(isObjectId ? { _id: slug } : { slug });

    if (!post) {
      return NextResponse.json(
        { success: false, message: "Blog post not found" },
        { status: 404 }
      );
    }

    // 🔥 ثانياً: التحقق من المشاهدة وزيادة العدد إذا لزم
    let userIdentifier: string | null = null;
    const userId = getUserIdFromToken(req);

    if (userId) {
      userIdentifier = `user_${userId}`;
    } else {
      userIdentifier = `ip_${getUserIP(req)}`;
    }

    let shouldIncrementView = false;

    if (userIdentifier && userIdentifier !== "ip_unknown") {
      try {
        const existingView = await PostView.findOne({
          postId: post._id,
          userId: userIdentifier,
        });

        if (!existingView) {
          shouldIncrementView = true;

          // 🔥 محاولة إنشاء سجل المشاهدة مع معالجة الخطأ
          try {
            await PostView.create({
              postId: post._id,
              userId: userIdentifier,
            });
            console.log(`✅ New view from: ${userIdentifier}`);
          } catch (createError: any) {
            // إذا كان الخطأ بسبب التكرار، تجاهله
            if (createError.code === 11000) {
              console.log(`⏩ Duplicate view prevented: ${userIdentifier}`);
              shouldIncrementView = false;
            } else {
              throw createError;
            }
          }
        } else {
          console.log(`⏩ User already viewed: ${userIdentifier}`);
        }
      } catch (viewError) {
        console.error("Error checking post view:", viewError);
        // نستمر حتى لو فشل التحقق من المشاهدة
      }
    }

    // 🔥 ثالثاً: إذا كان يجب زيادة المشاهدات، نزيدها ونعيد جلب المقال
    if (shouldIncrementView) {
      try {
        await BlogPost.findByIdAndUpdate(post._id, {
          $inc: { viewCount: 1 },
        });

        // إعادة جلب المقال للحصول على العدد المحدث
        post = await BlogPost.findOne(isObjectId ? { _id: slug } : { slug });
      } catch (updateError) {
        console.error("Error updating view count:", updateError);
      }
    }

    return NextResponse.json({
      success: true,
      data: post,
      isNewView: shouldIncrementView,
    });
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
    if (body.title_en || body.title_ar) {
      body.slug = generateSlug(body.title_en || body.title_ar);
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
      message: "Blog post updated successfully",
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
      message: "Blog post deleted successfully",
    });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to delete blog" },
      { status: 500 }
    );
  }
}
