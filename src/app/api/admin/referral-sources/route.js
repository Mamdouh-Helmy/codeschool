// app/api/admin/referral-sources/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import ReferralSource from "../../../models/ReferralSource";
import { connectDB } from "@/lib/mongodb";
// ⚠️ استبدل الـ import والاستدعاء دول بنظام التحقق من صلاحية الأدمن المستخدم فعليًا عندك
// import { requireAdmin } from "@/lib/auth";

// GET: عرض كل المصادر (المفعّلة والموقوفة) للوحة تحكم الأدمن
export async function GET(req) {
  try {
    await connectDB();
    // await requireAdmin(req);

    const sources = await ReferralSource.find({}).sort({
      order: 1,
      createdAt: 1,
    });

    return NextResponse.json({ success: true, sources });
  } catch (error) {
    console.error("❌ Admin get referral sources error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: إضافة مصدر جديد
export async function POST(req) {
  try {
    await connectDB();
    // await requireAdmin(req);

    const body = await req.json();
    const { label, value, order, isActive } = body;

    if (!label?.trim() || !value?.trim()) {
      return NextResponse.json(
        { success: false, message: "Label and value are required" },
        { status: 400 }
      );
    }

    const source = await ReferralSource.create({
      label: label.trim(),
      value: value.trim().toLowerCase(),
      order: order ?? 0,
      isActive: isActive ?? true,
    });

    return NextResponse.json({ success: true, source }, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: "This value already exists" },
        { status: 409 }
      );
    }
    console.error("❌ Create referral source error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}