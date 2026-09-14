import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import PackagePlan from "../../models/PackagePlan";
import { requireAdmin } from "@/utils/authMiddleware";

// GET /api/package-plans?activeOnly=true
export async function GET(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const query = activeOnly ? { isActive: true } : {};

    const plans = await PackagePlan.find(query).sort({ order: 1, months: 1 }).lean();

    return NextResponse.json({ success: true, data: plans });
  } catch (error) {
    console.error("❌ GET /api/package-plans:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

// POST /api/package-plans — إنشاء باقة جديدة
export async function POST(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const body = await req.json();
    const { name, slug, months, totalHours, price, order } = body;

    if (!name || !slug || !months || totalHours === undefined || price === undefined) {
      return NextResponse.json(
        { success: false, message: "name, slug, months, totalHours, price are required" },
        { status: 400 },
      );
    }

    const plan = await PackagePlan.create({
      name,
      slug: String(slug).trim().toLowerCase(),
      months: Number(months),
      totalHours: Number(totalHours),
      price: Number(price),
      order: order !== undefined ? Number(order) : 0,
      metadata: {
        createdBy: authCheck.user.id,
        lastModifiedBy: authCheck.user.id,
      },
    });

    return NextResponse.json({ success: true, data: plan }, { status: 201 });
  } catch (error) {
    console.error("❌ POST /api/package-plans:", error);
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: "يوجد باقة بنفس الـ slug بالفعل" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}