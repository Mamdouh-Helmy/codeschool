//api/billing-alerts/[id]/resolve
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BillingAlert from "../../../../models/BillingAlert";
import Invoice from "../../../../models/Invoice";
import Student from "../../../../models/Student";
import { resolveEscrowAlert, addPaymentToInvoice } from "@/lib/billing";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

const OVERDUE_ACTIONS = ["pay", "extend", "suspend"];
const ESCROW_ACTIONS = ["recognize", "refund"];

const fail = (message, status = 400) =>
  NextResponse.json({ success: false, message }, { status });

const remainingOf = (invoice) =>
  Math.max(
    0,
    Number(invoice.totalAmount || 0) - Number(invoice.paidAmount || 0),
  );

export async function POST(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return fail("Invalid alert ID");
    }

    const body = await req.json();
    const { action, newDueDate, refundAmount, reason, amount, method } = body;

    await connectDB();

    const alert = await BillingAlert.findById(id);
    if (!alert || alert.status !== "open") {
      return fail("Alert not found or already resolved", 404);
    }

    // ─── تنبيه استحقاق متأخر (Due Date) ────────────────────────────────────
    if (alert.type === "overdue") {
      if (!OVERDUE_ACTIONS.includes(action)) {
        return fail(
          "action must be 'pay', 'extend' or 'suspend' for overdue alerts",
        );
      }

      const invoice = await Invoice.findById(alert.invoiceId);
      if (!invoice) return fail("Related invoice not found", 404);

      // ✅ لو الطالب سدد كل المتبقي، اقفل التنبيه من غير ما توقف الطالب أو تمدد
      if (
        remainingOf(invoice) <= 0 ||
        ["Paid", "Voided"].includes(invoice.status)
      ) {
        alert.status = "resolved";
        alert.resolution = {
          action: "paid",
          oldDueDate: alert.dueDateAtCreation,
          reason: "تم السداد بالكامل",
          actedBy: authCheck.user.id,
          actedAt: new Date(),
        };
        await alert.save();

        return NextResponse.json({
          success: true,
          data: { alert, invoice },
          message: "الفاتورة مسددة بالكامل، تم إغلاق التنبيه",
        });
      }

      const now = new Date();

      // ── 1) دفع المبلغ المستحق ───────────────────────────────────────────
      // addPaymentToInvoice بيسجل الدفعة ويحدّث الفاتورة، ولو اتسددت بالكامل
      // بيقفل التنبيه تلقائيًا (resolution.action = "paid").
      // لو الدفعة جزئية: التنبيه بيفضل مفتوح والأدمن يقرر (تمديد / إيقاف).
      if (action === "pay") {
        const payAmount = Number(amount);
        if (!Number.isFinite(payAmount) || payAmount <= 0) {
          return fail("amount must be a positive number for pay");
        }

        try {
          await addPaymentToInvoice(invoice._id, {
            amount: payAmount,
            method,
            notes: reason || "",
            recordedBy: authCheck.user.id,
          });
        } catch (payError) {
          // أخطاء التحقق (مبلغ أكبر من المتبقي / فاتورة ملغية...) → 400
          return fail(payError.message);
        }

        const [updatedInvoice, updatedAlert] = await Promise.all([
          Invoice.findById(invoice._id),
          BillingAlert.findById(id),
        ]);
        const remainingAfter = remainingOf(updatedInvoice);
        const fullySettled = remainingAfter <= 0;

        return NextResponse.json({
          success: true,
          data: { alert: updatedAlert, invoice: updatedInvoice },
          fullySettled,
          remainingAmount: remainingAfter,
          message: fullySettled
            ? "تم تسجيل الدفعة وإغلاق التنبيه — الفاتورة مسددة بالكامل"
            : `تم تسجيل الدفعة — متبقي ${remainingAfter.toLocaleString("en-US")} EGP، والتنبيه لسه مفتوح`,
        });
      }

      // ── 2) تمديد الموعد ─────────────────────────────────────────────────
      let parsedDueDate;
      if (action === "extend") {
        if (!newDueDate) return fail("newDueDate is required for extend");

        parsedDueDate = new Date(newDueDate);
        // 🆕 تاريخ قديم/النهارده كان هيعمل تنبيه overdue جديد تاني يوم
        if (isNaN(parsedDueDate.getTime()) || parsedDueDate <= now) {
          return fail("newDueDate must be a future date");
        }

        invoice.dueDate = parsedDueDate;
        invoice.status = "Pending";
        await invoice.save();
      }

      // ── 3) إيقاف الطالب ─────────────────────────────────────────────────
      if (action === "suspend") {
        await Student.findOneAndUpdate(
          { _id: invoice.studentId, isDeleted: false },
          {
            $set: {
              "enrollmentInfo.status": "Suspended",
              "metadata.lastModifiedBy": authCheck.user.id,
              "metadata.updatedAt": now,
            },
          },
        );
        invoice.status = "Suspended";
        await invoice.save();
      }

      alert.status = "resolved";
      alert.resolution = {
        action,
        oldDueDate: alert.dueDateAtCreation,
        newDueDate: action === "extend" ? parsedDueDate : undefined,
        reason: reason || "",
        actedBy: authCheck.user.id,
        actedAt: now,
      };
      await alert.save();

      return NextResponse.json({ success: true, data: { alert, invoice } });
    }

    // ─── تنبيه مراجعة الإسكرو (بعد 14 يوم) ──────────────────────────────────
    if (alert.type === "escrow_review") {
      if (!ESCROW_ACTIONS.includes(action)) {
        return fail(
          "action must be 'recognize' or 'refund' for escrow_review alerts",
        );
      }

      const result = await resolveEscrowAlert(id, {
        action,
        refundAmount,
        reason,
        actedBy: authCheck.user.id,
      });

      return NextResponse.json({ success: true, data: result });
    }

    return fail("Unknown alert type");
  } catch (error) {
    console.error("❌ POST /api/billing-alerts/[id]/resolve:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}