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

    const { amount, reason, dueDate } = await req.json();

    await connectDB();

    const { invoice, refundRecord } = await refundInvoicePayment(id, {
      amount: Number(amount),
      reason,
      dueDate,
      actedBy: authCheck.user.id,
    });

    return NextResponse.json({ success: true, data: { invoice, refundRecord } });
  } catch (error) {
    console.error("❌ POST /api/invoices/[id]/refund:", error);
    const isDueDateErr = String(error.message).startsWith("DUE_DATE_REQUIRED");
    return NextResponse.json(
      {
        success: false,
        code: isDueDateErr ? "DUE_DATE_REQUIRED" : undefined,
        message: isDueDateErr ? "حدد تاريخ استحقاق باقي المبلغ" : error.message,
      },
      { status: 400 },
    );
  }
}