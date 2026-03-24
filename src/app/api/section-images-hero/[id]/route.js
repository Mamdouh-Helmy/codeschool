import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SectionImageHero from "../../../models/SectionImageHero";
import mongoose from "mongoose";

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// GET
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    if (!isValidId(id)) return NextResponse.json({ success: false, message: "معرف غير صالح" }, { status: 400 });

    const record = await SectionImageHero.findById(id);
    if (!record) return NextResponse.json({ success: false, message: "السجل غير موجود" }, { status: 404 });

    return NextResponse.json({ success: true, data: record, timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ success: false, message: "فشل في الجلب", error: error.message }, { status: 500 });
  }
}

// PUT — تحديث كامل، لا قيود على أي حقل
export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    if (!isValidId(id)) return NextResponse.json({ success: false, message: "معرف غير صالح" }, { status: 400 });

    const body = await request.json();

    const existing = await SectionImageHero.findById(id);
    if (!existing) return NextResponse.json({ success: false, message: "السجل غير موجود" }, { status: 404 });

    const clean = (v) => (typeof v === "string" ? v.trim() : v);

    // بناء كائن التحديث — كل الحقول اختيارية
    const update = {};
    const fields = [
      "imageUrl", "secondImageUrl", "imageAlt", "secondImageAlt",
      "heroTitleAr", "heroDescriptionAr", "instructor1Ar", "instructor1RoleAr", "instructor2Ar", "instructor2RoleAr",
      "heroTitleEn", "heroDescriptionEn", "instructor1En", "instructor1RoleEn", "instructor2En", "instructor2RoleEn",
      "welcomeTitleAr", "welcomeSubtitle1Ar", "welcomeSubtitle2Ar",
      "welcomeFeature1Ar", "welcomeFeature2Ar", "welcomeFeature3Ar",
      "welcomeFeature4Ar", "welcomeFeature5Ar", "welcomeFeature6Ar",
      "welcomeTitleEn", "welcomeSubtitle1En", "welcomeSubtitle2En",
      "welcomeFeature1En", "welcomeFeature2En", "welcomeFeature3En",
      "welcomeFeature4En", "welcomeFeature5En", "welcomeFeature6En",
      "discount", "happyParents", "graduates", "isActive", "displayOrder",
    ];

    for (const f of fields) {
      if (body[f] !== undefined) update[f] = clean(body[f]);
    }

    const updated = await SectionImageHero.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true, context: "query" }
    );

    return NextResponse.json({
      success: true,
      data: updated,
      message: "تم التحديث بنجاح",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const errors = {};
      for (const f in error.errors) errors[f] = error.errors[f].message;
      return NextResponse.json({ success: false, message: "بيانات غير صالحة", errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: "فشل في التحديث", error: error.message }, { status: 500 });
  }
}

// PATCH — تحديث جزئي (نفس PUT)
export async function PATCH(request, { params }) {
  return PUT(request, { params });
}

// DELETE
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    if (!isValidId(id)) return NextResponse.json({ success: false, message: "معرف غير صالح" }, { status: 400 });

    const deleted = await SectionImageHero.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ success: false, message: "السجل غير موجود" }, { status: 404 });

    return NextResponse.json({
      success: true,
      message: "تم الحذف بنجاح",
      data: { id: deleted._id, deletedAt: new Date() },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: "فشل في الحذف", error: error.message }, { status: 500 });
  }
}