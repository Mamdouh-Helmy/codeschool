import Invoice from "../app/models/Invoice";
import Payment from "../app/models/Payment";
import BillingAlert from "../app/models/BillingAlert";

const ESCROW_DAYS = 14;

// ─── إنشاء فاتورة جديدة عند إضافة باكدج ─────────────────────────────────────
// paymentOption: "full" | "none" | "partial"
//   - full:    الطالب دفع السعر بالكامل الآن → مفيش dueDate، الفاتورة Paid فورًا
//   - none:    الطالب مدفعش أي حاجة → لازم dueDate، الفاتورة Pending
//   - partial: الطالب دفع عربون/جزء → لازم dueDate، الفاتورة Pending
export async function createInvoiceForPackage({
  studentId,
  packageId,
  groupId = null,
  totalAmount,
  paymentOption,
  amountPaidNow = 0,
  dueDate = null,
  createdBy,
}) {
  if (!["full", "none", "partial"].includes(paymentOption)) {
    throw new Error("paymentOption must be 'full', 'none', or 'partial'");
  }

  let paidNow = 0;
  let status = "Pending";
  let finalDueDate = dueDate ? new Date(dueDate) : null;

  if (paymentOption === "full") {
    paidNow = totalAmount;
    status = "Paid";
    finalDueDate = null; // ✅ مفيش استحقاق لو مدفوعة بالكامل
  } else if (paymentOption === "partial") {
    paidNow = Math.min(Math.max(Number(amountPaidNow) || 0, 0), totalAmount);
    if (paidNow <= 0) {
      throw new Error("Partial payment requires an amount greater than 0");
    }
    if (paidNow >= totalAmount) {
      throw new Error("Partial payment amount cannot cover the full price — use 'full' instead");
    }
    status = "Pending";
  } else {
    // "none"
    paidNow = 0;
    status = "Pending";
  }

  if (status === "Pending" && !finalDueDate) {
    throw new Error("Due date is required when the package is not fully paid");
  }

  const invoice = await Invoice.create({
    studentId,
    packageId,
    groupId,
    totalAmount,
    paidAmount: paidNow,
    paymentOption,
    dueDate: finalDueDate,
    status,
    metadata: { createdBy, lastModifiedBy: createdBy },
  });

  if (paidNow > 0) {
    await Payment.create({
      invoiceId: invoice._id,
      studentId,
      amount: paidNow,
      type: "payment",
      status: "completed",
      recordedBy: createdBy,
      notes:
        paymentOption === "full"
          ? "دفع كامل عند إنشاء الباكدج"
          : "عربون عند إنشاء الباكدج",
    });
  }

  return invoice;
}

// ─── إضافة دفعة/قسط جديد على فاتورة موجودة ──────────────────────────────────
export async function addPaymentToInvoice(invoiceId, { amount, method, notes, recordedBy }) {
  if (!amount || amount <= 0) throw new Error("Payment amount must be positive");

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "Voided") throw new Error("Cannot add payment to a voided invoice");

  const remaining = (invoice.totalAmount || 0) - (invoice.paidAmount || 0);
  if (amount > remaining) {
    throw new Error(`Payment (${amount}) exceeds the remaining balance (${remaining})`);
  }

  const payment = await Payment.create({
    invoiceId,
    studentId: invoice.studentId,
    amount,
    method: method || "cash",
    notes: notes || "",
    type: "payment",
    status: "completed",
    recordedBy,
  });

  invoice.paidAmount += amount;
  invoice.recalculateStatus();
  // ✅ لو بقت مدفوعة بالكامل، مفيش داعي لـ dueDate تاني
  if (invoice.status === "Paid") invoice.dueDate = null;
  invoice.metadata.lastModifiedBy = recordedBy;
  invoice.metadata.updatedAt = new Date();
  await invoice.save();

  return { invoice, payment };
}

// ─── استرجاع مبلغ — بيرفض أي مبلغ أكبر من المدفوع فعليًا، أو أكبر من الجزء
// اللي لسه مش Recognized Revenue ────────────────────────────────────────────
export async function refundInvoicePayment(invoiceId, { amount, reason, actedBy }) {
  if (!amount || amount <= 0) throw new Error("Refund amount must be positive");

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new Error("Invoice not found");

  if (amount > invoice.paidAmount) {
    throw new Error(
      `Refund (${amount}) cannot exceed the actually paid amount (${invoice.paidAmount})`,
    );
  }

  const recognizedAgg = await Payment.aggregate([
    {
      $match: {
        invoiceId: invoice._id,
        type: "payment",
        status: "completed",
        "escrow.status": "recognized",
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const recognizedSum = recognizedAgg[0]?.total || 0;
  const refundableSum = invoice.paidAmount - recognizedSum;

  if (amount > refundableSum) {
    throw new Error(
      `Only ${refundableSum} EGP is still refundable (the rest is already recognized revenue)`,
    );
  }

  const refundRecord = await Payment.create({
    invoiceId,
    studentId: invoice.studentId,
    amount: -amount,
    type: "refund",
    status: "completed",
    recordedBy: actedBy,
    notes: reason || "",
  });

  // ✅ نقفل إسكرو أقدم دفعات لسه not_started/in_escrow بمبلغ يعادل المسترد
  let remainingToVoid = amount;
  const escrowedPayments = await Payment.find({
    invoiceId,
    type: "payment",
    status: "completed",
    "escrow.status": { $in: ["not_started", "in_escrow"] },
  }).sort({ date: 1 });

  for (const p of escrowedPayments) {
    if (remainingToVoid <= 0) break;
    p.escrow.status = "refunded";
    await p.save();
    remainingToVoid -= p.amount;
  }

  invoice.paidAmount -= amount;
  invoice.status = "Voided";
  // 🆕 FIX: فاتورة ملغية مفيهاش معنى لاستحقاق (dueDate) — بنمسحها هنا صراحة
  // عشان متتعارضش مع required() في Invoice.js حتى لو الفاتورة كانت أصلاً
  // "Paid" (dueDate = null) قبل الإلغاء.
  invoice.dueDate = null;
  invoice.metadata.lastModifiedBy = actedBy;
  invoice.metadata.updatedAt = new Date();
  await invoice.save();

  return { invoice, refundRecord };
}

// ─── بداية فترة الإسكرو على كل دفعات فاتورة معينة ───────────────────────────
export async function startEscrowForInvoice(invoiceId) {
  const now = new Date();
  const releaseAt = new Date(now);
  releaseAt.setDate(releaseAt.getDate() + ESCROW_DAYS);

  await Payment.updateMany(
    { invoiceId, type: "payment", status: "completed", "escrow.status": "not_started" },
    { $set: { "escrow.status": "in_escrow", "escrow.startedAt": now, "escrow.releaseAt": releaseAt } },
  );
}

// ✅ بيتنادى من Student.deductCreditHours() أول ما يتاخد أول خصم ساعات فعلي
// للطالب في جروب معين — بغض النظر عن حالة الحضور (present/absent/late/excused).
// الطالب ممكن يكون في أكتر من جروب في نفس الوقت، فكل جروب بيتفعّل الإسكرو
// بتاعه بشكل مستقل تمامًا (بيدور بس على فاتورة نفس الـstudentId+groupId).
export async function handleFirstSessionForBilling({ studentId, groupId }) {
  if (!groupId) return;

  const invoice = await Invoice.findOne({
    studentId,
    groupId,
    status: { $nin: ["Voided"] },
  }).sort({ createdAt: -1 });

  if (invoice) await startEscrowForInvoice(invoice._id);
}

// ─── Cron: تنبيهات الاستحقاق المتأخر (Due Date) ────────────────────────────
export async function checkOverdueInvoices() {
  const now = new Date();
  const overdue = await Invoice.find({
    dueDate: { $ne: null, $lte: now },
    status: "Pending",
  }).select("_id studentId dueDate");

  let created = 0;
  for (const inv of overdue) {
    try {
      await BillingAlert.create({
        invoiceId: inv._id,
        studentId: inv.studentId,
        type: "overdue",
        status: "open",
        dueDateAtCreation: inv.dueDate,
      });
      created++;
    } catch (err) {
      if (err.code !== 11000) throw err; // 11000 = فيه تيكت open بالفعل، متوقع
    }
  }
  return { checked: overdue.length, alertsCreated: created };
}

// ─── Cron: تنبيهات مراجعة الإسكرو بعد 14 يوم ────────────────────────────────
// ✅ مهم: الدالة دي مبتحسبش الفلوس تلقائيًا خالص — بس بتعمل تنبيه (Alert) للأدمن
// إن دفعة معينة عدى عليها 14 يوم، وبتستنى قراره (احسبها/رجّعها) عبر
// resolveEscrowAlert تحت. لو الأدمن ماعملش حاجة، الدفعة تفضل "in_escrow" لحد
// ما هو يتحرك.
export async function flagDueEscrowsForReview() {
  const now = new Date();

  const duePayments = await Payment.find({
    "escrow.status": "in_escrow",
    "escrow.releaseAt": { $lte: now },
  });

  let created = 0;
  for (const payment of duePayments) {
    try {
      await BillingAlert.create({
        invoiceId: payment.invoiceId,
        studentId: payment.studentId,
        paymentId: payment._id,
        type: "escrow_review",
        status: "open",
        dueDateAtCreation: payment.escrow.releaseAt,
      });
      created++;
    } catch (err) {
      if (err.code !== 11000) throw err; // فيه alert مفتوح بالفعل لنفس الدفعة
    }
  }

  return { checked: duePayments.length, alertsCreated: created };
}

// ✅ ينفذ قرار الأدمن على تنبيه escrow_review: "recognize" (تتحول لإيراد
// معترف به) أو "refund" (استرجاع المبلغ للطالب)
export async function resolveEscrowAlert(alertId, { action, refundAmount, reason, actedBy }) {
  const alert = await BillingAlert.findById(alertId);
  if (!alert || alert.status !== "open" || alert.type !== "escrow_review") {
    throw new Error("Escrow alert not found or already resolved");
  }

  const payment = await Payment.findById(alert.paymentId);
  if (!payment) throw new Error("Related payment not found");

  const now = new Date();

  if (action === "recognize") {
    payment.escrow.status = "recognized";
    payment.escrow.recognizedAt = now;
    await payment.save();
  } else if (action === "refund") {
    const amount = Math.min(Number(refundAmount) || payment.amount, payment.amount);
    await refundInvoicePayment(alert.invoiceId, {
      amount,
      reason: reason || "استرجاع بعد مراجعة الإسكرو",
      actedBy,
    });
  } else {
    throw new Error("action must be 'recognize' or 'refund'");
  }

  alert.status = "resolved";
  alert.resolution = {
    action,
    refundAmount: action === "refund" ? Math.min(Number(refundAmount) || payment.amount, payment.amount) : undefined,
    reason: reason || "",
    actedBy,
    actedAt: now,
  };
  await alert.save();

  return { alert };
}

// ─── الكرون اليومي الموحّد ───────────────────────────────────────────────────
export async function runDailyBillingCron() {
  const escrowResult = await flagDueEscrowsForReview();
  const overdueResult = await checkOverdueInvoices();
  return { escrowResult, overdueResult };
}