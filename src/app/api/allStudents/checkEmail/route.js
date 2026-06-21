// app/api/allStudents/checkEmail/route.js
import { NextResponse } from "next/server";
import User from "../../../models/User";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/utils/authMiddleware";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── GET /api/allStudents/checkEmail?email=...&excludeUserId=... ──────────────
// فحص سريع (للاستخدام الفوري في الفرونت) لمعرفة هل الإيميل ده مستخدم
// من يوزر تاني قبل ما الأدمن يحفظ. excludeUserId بيستبعد اليوزر الحالي
// نفسه (في حالة التعديل) عشان ميطلعله تحذير على إيميله بتاعه.
export async function GET(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const email          = (searchParams.get("email") || "").trim().toLowerCase();
    const excludeUserId  = searchParams.get("excludeUserId");

    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { success: true, exists: false, valid: false },
        { status: 200 }
      );
    }

    const query = { email };
    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }

    const existingUser = await User.findOne(query).select("_id").lean();

    return NextResponse.json(
      { success: true, exists: !!existingUser, valid: true },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ GET /api/allStudents/checkEmail:", error);
    return NextResponse.json(
      { success: false, message: "Failed to check email", error: error.message },
      { status: 500 }
    );
  }
}