import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import PackagePlan from "../../../models/PackagePlan";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

export async function PUT(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid plan ID" },
        { status: 400 },
      );
    }

    await connectDB();

    const body = await req.json();
    const update = {};

    if (body.name !== undefined) update.name = body.name;
    if (body.months !== undefined) update.months = Number(body.months);
    if (body.totalHours !== undefined) update.totalHours = Number(body.totalHours);
    if (body.price !== undefined) update.price = Number(body.price);
    if (body.order !== undefined) update.order = Number(body.order);
    if (body.isActive !== undefined) update.isActive = !!body.isActive;
    // ✅ ملحوظة: الـ slug مش بيتغير بعد الإنشاء عمدًا — لأنه محفوظ كـ snapshot
    // (packageType) في باكدجات طلاب قدامى، تغييره ممكن يلخبط العرض التاريخي

    update["metadata.lastModifiedBy"] = authCheck.user.id;
    update["metadata.updatedAt"] = new Date();

    const plan = await PackagePlan.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });

    if (!plan) {
      return NextResponse.json(
        { success: false, message: "Plan not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    console.error("❌ PUT /api/package-plans/[id]:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

// ✅ حذف "منطقي" — بيقفل الباقة (isActive:false) بدل الحذف الفعلي، عشان
// الباكدجات القديمة اللي بتشاور عليها بالـ packagePlanId تفضل سليمة تاريخيًا
export async function DELETE(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid plan ID" },
        { status: 400 },
      );
    }

    await connectDB();

    const plan = await PackagePlan.findByIdAndUpdate(
      id,
      {
        $set: {
          isActive: false,
          "metadata.lastModifiedBy": authCheck.user.id,
          "metadata.updatedAt": new Date(),
        },
      },
      { new: true },
    );

    if (!plan) {
      return NextResponse.json(
        { success: false, message: "Plan not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, message: "Plan disabled successfully", data: plan });
  } catch (error) {
    console.error("❌ DELETE /api/package-plans/[id]:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}