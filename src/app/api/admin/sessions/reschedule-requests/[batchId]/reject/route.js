// app/api/admin/sessions/reschedule-requests/[batchId]/reject/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Session from "../../../../../../models/Session";
import { requireAdmin } from "@/utils/authMiddleware";

// ─────────────────────────────────────────────────────────────────────────────
// POST: الأدمن يرفض batch كامل — مفيش أي تعديل على scheduledDate أو earlyAccess،
// كل حاجة تفضل زي ما هي بالضبط، وبس بيتسجل سبب الرفض (اختياري)
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req, { params }) {
  try {
    const { batchId } = await params;

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const adminUser = authCheck.user;
    const body = await req.json().catch(() => ({}));
    const reviewNotes = body.reviewNotes || "";

    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      return NextResponse.json(
        { success: false, error: "رقم الطلب غير صالح" },
        { status: 400 }
      );
    }

    await connectDB();

    try {
      const result = await Session.rejectRescheduleBatch(batchId, adminUser.id, reviewNotes);

      return NextResponse.json({
        success: true,
        message: `تم رفض طلب الترحيل (${result.updatedCount} جلسة) — لم يتم تغيير أي شيء`,
        data: result,
      });
    } catch (err) {
      if (err.code === "BATCH_NOT_FOUND") {
        return NextResponse.json(
          { success: false, error: err.message, code: err.code },
          { status: 404 }
        );
      }
      throw err;
    }
  } catch (error) {
    console.error("❌ [Reject Reschedule Batch] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "فشل في رفض طلب الترحيل" },
      { status: 500 }
    );
  }
}