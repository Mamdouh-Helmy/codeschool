import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Invoice from "../../../models/Invoice";
import Payment from "../../../models/Payment";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

export async function GET(req, { params }) {
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

    await connectDB();

    const invoice = await Invoice.findById(id).lean();
    if (!invoice) {
      return NextResponse.json(
        { success: false, message: "Invoice not found" },
        { status: 404 },
      );
    }

    const payments = await Payment.find({ invoiceId: id }).sort({ date: -1 }).lean();

    return NextResponse.json({ success: true, data: { ...invoice, payments } });
  } catch (error) {
    console.error("❌ GET /api/invoices/[id]:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}