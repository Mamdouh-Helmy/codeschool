import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BillingAlert from "../../../../models/BillingAlert";
import Invoice from "../../../../models/Invoice";
import Student from "../../../../models/Student";
import { resolveEscrowAlert } from "@/lib/billing";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

export async function POST(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid alert ID" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { action, newDueDate, refundAmount, reason } = body;

    await connectDB();

    const alert = await BillingAlert.findById(id);
    if (!alert || alert.status !== "open") {
      return NextResponse.json(
        { success: false, message: "Alert not found or already resolved" },
        { status: 404 },
      );
    }

    // ─── تنبيه استحقاق متأخر (Due Date) ────────────────────────────────────
    if (alert.type === "overdue") {
      if (!["suspend", "extend"].includes(action)) {
        return NextResponse.json(
          { success: false, message: "action must be 'suspend' or 'extend' for overdue alerts" },
          { status: 400 },
        );
      }

      const invoice = await Invoice.findById(alert.invoiceId);
      if (!invoice) {
        return NextResponse.json(
          { success: false, message: "Related invoice not found" },
          { status: 404 },
        );
      }

      const now = new Date();

      if (action === "suspend") {
        // ✅ نفس suspension logic الموجود بالظبط
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
      } else {
        if (!newDueDate) {
          return NextResponse.json(
            { success: false, message: "newDueDate is required for extend" },
            { status: 400 },
          );
        }
        invoice.dueDate = new Date(newDueDate);
        invoice.status = "Pending";
        await invoice.save();
      }

      alert.status = "resolved";
      alert.resolution = {
        action,
        oldDueDate: alert.dueDateAtCreation,
        newDueDate: action === "extend" ? new Date(newDueDate) : undefined,
        reason: reason || "",
        actedBy: authCheck.user.id,
        actedAt: now,
      };
      await alert.save();

      return NextResponse.json({ success: true, data: { alert, invoice } });
    }

    // ─── تنبيه مراجعة الإسكرو (بعد 14 يوم) ──────────────────────────────────
    if (alert.type === "escrow_review") {
      if (!["recognize", "refund"].includes(action)) {
        return NextResponse.json(
          { success: false, message: "action must be 'recognize' or 'refund' for escrow_review alerts" },
          { status: 400 },
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

    return NextResponse.json(
      { success: false, message: "Unknown alert type" },
      { status: 400 },
    );
  } catch (error) {
    console.error("❌ POST /api/billing-alerts/[id]/resolve:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}