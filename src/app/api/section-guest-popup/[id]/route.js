import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SectionGuestPopup from "../../../models/SectionGuestPopup";
import mongoose from "mongoose";

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ─── PUT ────────────────────────────────────────────────────────────────────
export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    if (!isValidId(id))
      return NextResponse.json({ success: false, message: "معرف غير صالح" }, { status: 400 });

    const body = await request.json();

    const existing = await SectionGuestPopup.findById(id);
    if (!existing)
      return NextResponse.json({ success: false, message: "السجل غير موجود" }, { status: 404 });

    const clean = (v) => (typeof v === "string" ? v.trim() : v);

    const fields = [
      "titleAr", "titleAccentAr", "subtitle1Ar", "subtitle2Ar",
      "point1TitleAr", "point1Ar", "point2TitleAr", "point2Ar",
      "ctaAr", "buttonAr", "tag1Ar", "tag2Ar", "tag3Ar", "liveAr",
      "titleEn", "titleAccentEn", "subtitle1En", "subtitle2En",
      "point1TitleEn", "point1En", "point2TitleEn", "point2En",
      "ctaEn", "buttonEn", "tag1En", "tag2En", "tag3En", "liveEn",
      "buttonLink", "stampLogoUrlLight", "stampLogoUrlDark", "isActive",
    ];

    const update = {};
    for (const f of fields) {
      if (body[f] !== undefined) update[f] = clean(body[f]);
    }

    const updated = await SectionGuestPopup.findByIdAndUpdate(
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

export async function PATCH(request, { params }) {
  return PUT(request, { params });
}