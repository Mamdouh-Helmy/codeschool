// app/api/all-users/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "../../models/User";

const ROLES = ["admin", "marketing", "student", "instructor", "guest"];

// ✅ بيهرّب رموز الـ regex الخاصة عشان البحث يشتغل صح مع قيم فيها
// + . * ? ^ $ إلخ (زي إيميلات الـ Gmail aliases user+test@gmail.com)
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search        = searchParams.get("search")       || "";
    const role          = searchParams.get("role")         || "";
    const authProvider  = searchParams.get("authProvider") || "";
    const status        = searchParams.get("status")       || ""; // "active" | "inactive"
    const language      = searchParams.get("language")     || "";
    const page          = parseInt(searchParams.get("page")  || "1");
    const limit         = parseInt(searchParams.get("limit") || "10");

    const query = {};

    if (ROLES.includes(role)) query.role = role;

    // ✅ الإصلاح 1: تهريب الـ regex قبل استخدامه في البحث
    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name:     { $regex: safeSearch, $options: "i" } },
        { email:    { $regex: safeSearch, $options: "i" } },
        { username: { $regex: safeSearch, $options: "i" } },
      ];
    }

    // ✅ الإصلاح 2: يوزرز credentials القدام اتسجلوا قبل ما authProvider
    // يتضاف للسكيما — الحقل مش موجود عندهم خالص (مش null، مش موجود أصلاً).
    // $in بيطابق null والحقل الغير موجود مع بعض في مونجو.
    if (["credentials", "google", "github"].includes(authProvider)) {
      query.authProvider =
        authProvider === "credentials"
          ? { $in: ["credentials", null] }
          : authProvider;
    }

    if (status === "active")   query.isActive = true;
    if (status === "inactive") query.isActive = false;
    if (["ar", "en"].includes(language)) query.language = language;

    const filteredCount = await User.countDocuments(query);
    const users = await User.find(query)
      .select("_id name email username image gender language authProvider role profile isActive createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // ✅ إحصائيات عامة لكل اليوزرز (مش بس نتيجة الفلتر الحالي)
    const [globalTotal, activeCount, roleAgg] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isActive: true }),
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
    ]);

    const byRole = { admin: 0, marketing: 0, student: 0, instructor: 0, guest: 0 };
    roleAgg.forEach((r) => {
      if (r._id && byRole[r._id] !== undefined) byRole[r._id] = r.count;
    });

    return NextResponse.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        totalUsers: filteredCount,
        totalPages: Math.ceil(filteredCount / limit),
      },
      stats: {
        total:    globalTotal,
        active:   activeCount,
        inactive: globalTotal - activeCount,
        byRole,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch users", error: error.message },
      { status: 500 }
    );
  }
}