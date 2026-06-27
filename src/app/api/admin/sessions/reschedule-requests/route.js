// app/api/admin/sessions/reschedule-requests/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Session from "../../../../models/Session";
import { requireAdmin } from "@/utils/authMiddleware";

// ─────────────────────────────────────────────────────────────────────────────
// GET: قائمة كل طلبات الترحيل المعلقة (pending) مجمعة بالـ batchId — للأدمن
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const batches = await Session.getPendingRescheduleBatches();

    return NextResponse.json({
      success: true,
      data: { batches, total: batches.length },
    });
  } catch (error) {
    console.error("❌ [Reschedule Requests List] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "فشل في تحميل طلبات الترحيل" },
      { status: 500 }
    );
  }
}