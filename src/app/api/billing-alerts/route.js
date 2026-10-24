//api/billing-alerts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BillingAlert from "../../models/BillingAlert";
import "../../models/Invoice";
import "../../models/Student";
import "../../models/Payment";
import { requireAdmin } from "@/utils/authMiddleware";

// المتبقي الفعلي للفاتورة (lean مبيرجعش virtuals)
const remainingOf = (inv) =>
  Math.max(0, Number(inv?.totalAmount || 0) - Number(inv?.paidAmount || 0));

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

    // ✅ لو الطالب دفع كل اللي عليه، تنبيه "overdue" المفتوح ملوش لازمة
    const filtered =
      status === "open"
        ? alerts.filter((a) => {
            if (a.type !== "overdue") return true; // escrow_review مالوش علاقة بالمتبقي
            const inv = a.invoiceId;
            if (!inv) return false;
            if (["Paid", "Voided"].includes(inv.status)) return false;
            return remainingOf(inv) > 0;
          })
        : alerts; // تبويب "تمت المعالجة" زي ما هو

    return NextResponse.json({ success: true, data: filtered });
  } catch (error) {
    console.error("❌ GET /api/billing-alerts:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}