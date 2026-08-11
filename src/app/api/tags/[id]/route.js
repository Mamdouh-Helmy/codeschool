// app/api/tags/[id]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Tag from "../../../models/Tag";
import Group from "../../../models/Group";     // ✅ لإزالة الإشارات من المجموعات
import Student from "../../../models/Student"; // ✅ لإزالة الإشارات من الطلاب
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

// ─── GET: جلب وسم واحد ─────────────────────────────────────────────────────────
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid tag ID" },
        { status: 400 }
      );
    }

    await connectDB();
    const tag = await Tag.findById(id);
    if (!tag) {
      return NextResponse.json(
        { success: false, error: "Tag not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: tag });
  } catch (error) {
    console.error("❌ Error fetching tag:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ─── PUT: تحديث وسم ────────────────────────────────────────────────────────────
export async function PUT(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid tag ID" },
        { status: 400 }
      );
    }

    const { name, color } = await req.json();

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Tag name must be at least 2 characters" },
        { status: 400 }
      );
    }

    await connectDB();

    // التحقق من عدم وجود وسم آخر بنفس الاسم
    const existing = await Tag.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
      _id: { $ne: id },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Tag name already exists" },
        { status: 409 }
      );
    }

    const tag = await Tag.findByIdAndUpdate(
      id,
      { name: name.trim(), color: color || "#3B82F6" },
      { new: true, runValidators: true }
    );

    if (!tag) {
      return NextResponse.json(
        { success: false, error: "Tag not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: tag });
  } catch (error) {
    console.error("❌ Error updating tag:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ─── DELETE: حذف وسم نهائياً (Hard Delete) وإزالة الإشارات من المجموعات والطلاب ─
export async function DELETE(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid tag ID" },
        { status: 400 }
      );
    }

    await connectDB();

    // 1. حذف التاج نفسه
    const tag = await Tag.findByIdAndDelete(id);
    if (!tag) {
      return NextResponse.json(
        { success: false, error: "Tag not found" },
        { status: 404 }
      );
    }

    // 2. إزالة الإشارة إلى هذا التاج من جميع المجموعات والطلاب
    await Promise.all([
      Group.updateMany({ tags: id }, { $pull: { tags: id } }),
      Student.updateMany({ tags: id }, { $pull: { tags: id } }), // ✅
    ]);

    console.log(`✅ Tag "${tag.name}" permanently deleted and removed from all groups and students.`);

    return NextResponse.json({
      success: true,
      message: "Tag permanently deleted and removed from all groups and students",
      data: tag,
    });
  } catch (error) {
    console.error("❌ Error deleting tag:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete tag" },
      { status: 500 }
    );
  }
}