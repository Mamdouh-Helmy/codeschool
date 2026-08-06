// app/api/referral-sources/route.js
import { NextResponse } from "next/server";
import ReferralSource from "../../models/ReferralSource";
import { connectDB } from "@/lib/mongodb";

// ✅ Public endpoint: بيرجع بس المصادر المفعّلة، مرتبة حسب order
// ده اللي فورم التسجيل هيستخدمه لملء الـ select
export async function GET() {
  try {
    await connectDB();

    const sources = await ReferralSource.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .select("label value")
      .lean();

    return NextResponse.json({ success: true, sources });
  } catch (error) {
    console.error("❌ Get referral sources error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}