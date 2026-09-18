// app/api/instructor-rates/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "../../models/User";
import InstructorRate from "../../models/InstructorRate";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

// ─── GET: كل المدرسين + سعر كل واحد الحالي ────────────────────────────────
export async function GET(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const missingOnly = searchParams.get("missingOnly") === "true";

    const userQuery = { role: "instructor" };
    if (search) {
      userQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const instructors = await User.find(userQuery)
      .select("name email image profile.phone")
      .sort({ name: 1 })
      .lean();

    const rates = await InstructorRate.find({
      instructorId: { $in: instructors.map((i) => i._id) },
    }).lean();

    const rateMap = {};
    rates.forEach((r) => {
      rateMap[r.instructorId.toString()] = r;
    });

    let data = instructors.map((i) => {
      const rate = rateMap[i._id.toString()] || null;
      return {
        instructorId: i._id,
        name: i.name,
        email: i.email,
        image: i.image,
        phone: i.profile?.phone || "",
        hasRate: !!rate,
        hourlyRate: rate?.hourlyRate ?? 0,
        transportationAllowance: rate?.transportationAllowance ?? 0,
        currency: rate?.currency || "EGP",
        isActive: rate?.isActive ?? false,
        effectiveFrom:
          rate?.history?.filter((h) => !h.effectiveTo)?.[0]?.effectiveFrom || null,
        changesCount: rate?.history?.length || 0,
        updatedAt: rate?.metadata?.updatedAt || null,
      };
    });

    if (missingOnly) data = data.filter((d) => !d.hasRate);

    return NextResponse.json({
      success: true,
      data,
      stats: {
        total: data.length,
        configured: data.filter((d) => d.hasRate).length,
        missing: data.filter((d) => !d.hasRate).length,
      },
    });
  } catch (error) {
    console.error("❌ GET /api/instructor-rates:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

// ─── POST: تحديد/تعديل سعر مدرس (بيفتح فترة سريان جديدة) ──────────────────
export async function POST(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const body = await req.json();
    const {
      instructorId,
      hourlyRate,
      transportationAllowance = 0,
      effectiveFrom,
      note = "",
    } = body;

    if (!instructorId || !mongoose.Types.ObjectId.isValid(instructorId)) {
      return NextResponse.json(
        { success: false, message: "instructorId مطلوب وصالح" },
        { status: 400 },
      );
    }

    if (hourlyRate === undefined || Number(hourlyRate) < 0) {
      return NextResponse.json(
        { success: false, message: "hourlyRate مطلوب ولازم يكون >= 0" },
        { status: 400 },
      );
    }

    await connectDB();

    const instructor = await User.findOne({ _id: instructorId, role: "instructor" })
      .select("_id name")
      .lean();

    if (!instructor) {
      return NextResponse.json(
        { success: false, message: "المدرس غير موجود" },
        { status: 404 },
      );
    }

    const rate = await InstructorRate.setRate(instructorId, {
      hourlyRate: Number(hourlyRate),
      transportationAllowance: Number(transportationAllowance) || 0,
      effectiveFrom,
      changedBy: authCheck.user.id,
      note,
    });

    return NextResponse.json({
      success: true,
      data: rate,
      message: `تم حفظ سعر ${instructor.name} بنجاح`,
    });
  } catch (error) {
    console.error("❌ POST /api/instructor-rates:", error);
    const status = error.code === "INVALID_EFFECTIVE_FROM" ? 400 : 500;
    return NextResponse.json(
      { success: false, message: error.message },
      { status },
    );
  }
}