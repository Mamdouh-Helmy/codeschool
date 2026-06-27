// app/api/admin/sessions/reschedule-requests/[batchId]/approve/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Session from "../../../../../../models/Session";
import { requireAdmin } from "@/utils/authMiddleware";

// ─────────────────────────────────────────────────────────────────────────────
// POST: الأدمن يوافق على batch كامل
//  - بيرحّل كل سيشن في الباتش بمقدار shiftDays المحفوظ في الطلب
//  - السيشن اللي المدرس بدأ منها الطلب (trigger) تتفتح فورًا (earlyAccess)
//  - باقي السيشنات بتفضل تتبع منطق canViewDetails العادي في API الجلسات،
//    اللي بيقرأ viewMode المحفوظ على كل سيشن عشان يقرر تفاصيلها العامة
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req, { params }) {
  try {
    const { batchId } = await params;

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const adminUser = authCheck.user;

    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      return NextResponse.json(
        { success: false, error: "رقم الطلب غير صالح" },
        { status: 400 }
      );
    }

    await connectDB();

    try {
      const result = await Session.approveRescheduleBatch(batchId, adminUser.id);

      return NextResponse.json({
        success: true,
        message: `تمت الموافقة على ترحيل ${result.updatedCount} جلسة بنجاح`,
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
    console.error("❌ [Approve Reschedule Batch] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "فشل في الموافقة على طلب الترحيل" },
      { status: 500 }
    );
  }
}