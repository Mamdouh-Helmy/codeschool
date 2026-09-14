import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Invoice from "../../models/Invoice";
import { requireAdmin } from "@/utils/authMiddleware";

export async function GET(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const status = searchParams.get("status");

    const query = {};
    if (studentId) query.studentId = studentId;
    if (status) query.status = status;

    const invoices = await Invoice.find(query).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ success: true, data: invoices });
  } catch (error) {
    console.error("❌ GET /api/invoices:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}