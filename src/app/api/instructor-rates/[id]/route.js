// app/api/instructor-rates/[id]/route.js
// [id] = instructorId (مش id بتاع الـ rate document)
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import InstructorRate from "../../../models/InstructorRate";
import PayrollEntry from "../../../models/PayrollEntry";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

// ─── GET: السعر الحالي + تاريخ التغييرات + ملخص المرتب ────────────────────
export async function GET(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid instructor ID" },
        { status: 400 },
      );
    }

    await connectDB();

    const rate = await InstructorRate.findOne({ instructorId: id })
      .populate("instructorId", "name email image")
      .populate("history.changedBy", "name")
      .lean();

    const summary = await PayrollEntry.getInstructorSummary(id);

    return NextResponse.json({
      success: true,
      data: {
        rate: rate || null,
        history: (rate?.history || []).sort(
          (a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom),
        ),
        summary,
      },
    });
  } catch (error) {
    console.error("❌ GET /api/instructor-rates/[id]:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

// ─── PATCH: تفعيل/إيقاف السعر بدون ما نلمس الـ history ────────────────────
export async function PATCH(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid instructor ID" },
        { status: 400 },
      );
    }

    const { isActive } = await req.json();

    await connectDB();

    const rate = await InstructorRate.findOneAndUpdate(
      { instructorId: id },
      {
        $set: {
          isActive: !!isActive,
          "metadata.lastModifiedBy": authCheck.user.id,
          "metadata.updatedAt": new Date(),
        },
      },
      { new: true },
    );

    if (!rate) {
      return NextResponse.json(
        { success: false, message: "لا يوجد سعر مسجّل لهذا المدرس" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: rate });
  } catch (error) {
    console.error("❌ PATCH /api/instructor-rates/[id]:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}