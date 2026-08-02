// app/api/tags/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Tag from "../../models/Tag";
import { requireAdmin } from "@/utils/authMiddleware";

// ─── GET: جلب جميع الوسوم ─────────────────────────────────────────────────────
export async function GET() {
  try {
    await connectDB();
    const tags = await Tag.find().sort({ name: 1 }).lean();
    return NextResponse.json({ success: true, data: tags });
  } catch (error) {
    console.error("❌ Error fetching tags:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch tags" },
      { status: 500 }
    );
  }
}

// ─── POST: إنشاء وسم جديد ─────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const { name, color } = await req.json();

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Tag name must be at least 2 characters" },
        { status: 400 }
      );
    }

    await connectDB();

    // التحقق من عدم وجود وسم بنفس الاسم
    const existing = await Tag.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Tag name already exists" },
        { status: 409 }
      );
    }

    const tag = await Tag.create({
      name: name.trim(),
      color: color || "#3B82F6",
      createdBy: authCheck.user.id,
    });

    return NextResponse.json({ success: true, data: tag }, { status: 201 });
  } catch (error) {
    console.error("❌ Error creating tag:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create tag" },
      { status: 500 }
    );
  }
}