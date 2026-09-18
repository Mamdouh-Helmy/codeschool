// app/api/payroll/[id]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import PayrollEntry from "../../../models/PayrollEntry";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

const ALLOWED_STATUSES = ["pending", "approved", "paid", "cancelled"];

export async function PATCH(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid entry ID" },
        { status: 400 },
      );
    }

    const { status, notes } = await req.json();

    if (status && !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, message: `status لازم يكون واحد من: ${ALLOWED_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }

    await connectDB();

    const entry = await PayrollEntry.findOne({ _id: id, isDeleted: false });
    if (!entry) {
      return NextResponse.json(
        { success: false, message: "السطر غير موجود" },
        { status: 404 },
      );
    }

    const now = new Date();

    if (status) {
      entry.status = status;
      if (status === "approved") {
        entry.metadata.approvedBy = authCheck.user.id;
        entry.metadata.approvedAt = now;
      }
      if (status === "paid") entry.metadata.paidAt = now;
    }

    if (notes !== undefined) entry.notes = notes;

    entry.metadata.updatedAt = now;
    await entry.save();

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    console.error("❌ PATCH /api/payroll/[id]:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}