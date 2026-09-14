import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { refundInvoicePayment } from "@/lib/billing";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

export async function POST(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid invoice ID" },
        { status: 400 },
      );
    }

    const { amount, reason } = await req.json();

    await connectDB();

    const { invoice, refundRecord } = await refundInvoicePayment(id, {
      amount: Number(amount),
      reason,
      actedBy: authCheck.user.id,
    });

    return NextResponse.json({ success: true, data: { invoice, refundRecord } });
  } catch (error) {
    console.error("❌ POST /api/invoices/[id]/refund:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 },
    );
  }
}