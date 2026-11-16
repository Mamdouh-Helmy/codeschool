import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Invoice from "../../../../models/Invoice";
import Payment from "../../../../models/Payment";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

// POST /api/invoices/[id]/reverse-refund
// body: { paymentId: "<refund payment _id>", dueDate?: "YYYY-MM-DD", reason?: string }
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

    const { paymentId, dueDate, reason } = await req.json();
    if (!paymentId || !mongoose.Types.ObjectId.isValid(paymentId)) {
      return NextResponse.json(
        { success: false, message: "paymentId (refund record) is required" },
        { status: 400 },
      );
    }

    await connectDB();

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return NextResponse.json(
        { success: false, message: "Invoice not found" },
        { status: 404 },
      );
    }

    const refund = await Payment.findOne({ _id: paymentId, invoiceId: id });
    if (!refund) {
      return NextResponse.json(
        { success: false, message: "Refund record not found on this invoice" },
        { status: 404 },
      );
    }

    const isRefund = refund.type === "refund" || refund.amount < 0;
    if (!isRefund) {
      return NextResponse.json(
        { success: false, message: "السجل ده مش عملية استرجاع" },
        { status: 400 },
      );
    }
    if (refund.status === "voided") {
      return NextResponse.json(
        { success: false, message: "تم التراجع عن الاسترجاع ده بالفعل" },
        { status: 409 },
      );
    }

    const restoreAmount = Math.abs(refund.amount || 0);
    const newPaid = (invoice.paidAmount || 0) + restoreAmount;

    if (newPaid > invoice.totalAmount) {
      return NextResponse.json(
        {
          success: false,
          message: `المبلغ بعد التراجع (${newPaid}) أكبر من إجمالي الفاتورة (${invoice.totalAmount})`,
        },
        { status: 400 },
      );
    }

    const wasVoided = invoice.status === "Voided";
    const fullyPaid = invoice.totalAmount > 0 && newPaid >= invoice.totalAmount;

    // لو لسه فيه متبقي لازم يبقى فيه تاريخ استحقاق
    let finalDueDate = null;
    if (!fullyPaid) {
      finalDueDate = dueDate ? new Date(dueDate) : invoice.dueDate;
      if (!finalDueDate || isNaN(new Date(finalDueDate).getTime())) {
        return NextResponse.json(
          {
            success: false,
            code: "DUE_DATE_REQUIRED",
            message: "حدد تاريخ استحقاق باقي المبلغ",
          },
          { status: 400 },
        );
      }
    }

    // قفل ذري: يمنع التراجع مرتين لو الأدمن داس الزرار مرتين
    const locked = await Payment.findOneAndUpdate(
      { _id: paymentId, invoiceId: id, status: { $ne: "voided" } },
      {
        $set: {
          status: "voided",
          notes: `${refund.notes || ""}${refund.notes ? " | " : ""}تم التراجع عن الاسترجاع${
            reason ? `: ${reason}` : ""
          }`,
        },
      },
      { new: true },
    );

    if (!locked) {
      return NextResponse.json(
        { success: false, message: "تم التراجع عن الاسترجاع ده بالفعل" },
        { status: 409 },
      );
    }

    try {
      invoice.paidAmount = newPaid;
      invoice.dueDate = fullyPaid ? null : finalDueDate;

      if (wasVoided) invoice.status = "Pending"; // نفك الـ Voided الأول
      invoice.recalculateStatus(); // Paid لو اتسدد كله، غير كده Pending

      invoice.metadata.lastModifiedBy = authCheck.user.id;
      invoice.metadata.updatedAt = new Date();

      await invoice.save();
    } catch (innerError) {
      // rollback: رجّع سجل الاسترجاع لحالته الأصلية لو تحديث الفاتورة فشل
      await Payment.findByIdAndUpdate(paymentId, {
        $set: { status: "completed", notes: refund.notes || "" },
      });
      throw innerError;
    }

    // رجّع الإسكرو (الدفعات المسترجعة بالكامل بس، الأقدم أولًا)
    try {
      let remainingToRestore = restoreAmount;
      const refundedPayments = await Payment.find({
        invoiceId: id,
        type: "payment",
        status: "completed",
        "escrow.status": "refunded",
      }).sort({ date: 1 });

      for (const p of refundedPayments) {
        if (p.amount > remainingToRestore) break;
        p.escrow.status = p.escrow.startedAt ? "in_escrow" : "not_started";
        await p.save();
        remainingToRestore -= p.amount;
      }
    } catch (escrowError) {
      // مش حرج: syncEscrowStarts في الكرون بيصلّح not_started تلقائيًا
      console.error("⚠️ failed to restore escrow after reverse-refund:", escrowError.message);
    }

    const payments = await Payment.find({ invoiceId: id })
      .sort({ date: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      message: "تم التراجع عن الاسترجاع وإرجاع الفاتورة",
      data: { ...invoice.toObject(), payments },
    });
  } catch (error) {
    console.error("❌ POST /api/invoices/[id]/reverse-refund:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}