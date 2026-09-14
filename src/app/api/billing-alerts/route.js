import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BillingAlert from "../../models/BillingAlert";
import "../../models/Invoice";
import "../../models/Student";
import "../../models/Payment";
import { requireAdmin } from "@/utils/authMiddleware";

export async function GET(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "open";
    const type = searchParams.get("type"); // "overdue" | "escrow_review" | null (الاتنين)

    const query = { status };
    if (type) query.type = type;

    const alerts = await BillingAlert.find(query)
      .populate("invoiceId")
      .populate("paymentId")
      .populate("studentId", "personalInfo.fullName enrollmentNumber")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: alerts });
  } catch (error) {
    console.error("❌ GET /api/billing-alerts:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}