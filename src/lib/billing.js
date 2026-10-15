// /lib/billing.js
import Invoice from "../app/models/Invoice";
import Payment from "../app/models/Payment";
import BillingAlert from "../app/models/BillingAlert";
import Student from "../app/models/Student";
import { sendDueDateReminders } from "./billing-reminders";

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
// ملحوظة: الدفعة بتتسجل escrow.status = not_started، و syncEscrowStarts
// (في الكرون اليومي) هي اللي بتدخلها الإسكرو لو الطالب ليه حضور فعلي بعد الفاتورة.
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
// ⚠️ ده مسار "سريع" بس — مش بيغطي التجديد/الأقساط/الفاتورة المتأخرة، ودي
// بتتغطى في syncEscrowStarts تحت.
//
// 🆕 FIX: لو مفيش فاتورة بنفس الجروب، ممكن تكون الفاتورة اتعملت وقت إضافة
// الباكدج (قبل ما الطالب يتحط في جروب) فـ groupId بتاعها null. وقتها بندوّر
// على فاتورة الباكدج الحالية (packageId) اللي من غير جروب ونربطها بالجروب ده.
export async function handleFirstSessionForBilling({ studentId, groupId }) {
  if (!groupId) return;

  let invoice = await Invoice.findOne({
    studentId,
    groupId,
    status: { $nin: ["Voided"] },
  }).sort({ createdAt: -1 });

  if (!invoice) {
    const student = await Student.findById(studentId)
      .select("creditSystem.currentPackage._id")
      .lean();
    const currentPackageId = student?.creditSystem?.currentPackage?._id;

    if (currentPackageId) {
      invoice = await Invoice.findOneAndUpdate(
        {
          studentId,
          packageId: currentPackageId,
          groupId: null,
          status: { $nin: ["Voided"] },
        },
        { $set: { groupId } },
        { sort: { createdAt: -1 }, new: true },
      );
    }
  }

  if (invoice) await startEscrowForInvoice(invoice._id);
}

// 🆕 شبكة أمان للكرون: لو الفاتورة من غير جروب، نحاول نستنتجه من أول خصم ساعات
// للطالب بعد إنشاء الفاتورة. بنربط بس لو فيه جروب واحد بالظبط — لو صفر أو أكتر
// من جروب، بنرجّع null وتفضل الفاتورة في noGroupInvoices للمراجعة اليدوية.
async function inferGroupForInvoice(invoice) {
  const student = await Student.findById(invoice.studentId)
    .select("creditSystem.usageHistory")
    .lean();

  const groups = new Map(); // String(groupId) → groupId الأصلي (ObjectId)
  for (const u of student?.creditSystem?.usageHistory || []) {
    if (!u.groupId) continue;
    if (!(u.hoursDeducted > 0)) continue;
    if (new Date(u.date) < new Date(invoice.createdAt)) continue;
    groups.set(String(u.groupId), u.groupId);
  }

  if (groups.size !== 1) return null;

  const [groupId] = groups.values();
  await Invoice.updateOne(
    { _id: invoice._id, groupId: null },
    { $set: { groupId } },
  );
  return groupId;
}

// ─── Cron: مزامنة بداية الإسكرو (Self-healing) ──────────────────────────────
// بتغطي الحالات اللي handleFirstSessionForBilling بتفوتها:
//   • أقساط اتضافت بعد بداية الإسكرو
//   • تجديد باقة في نفس الجروب (isFirstUsageForGroup بيبقى false)
//   • فاتورة اتعملت بعد أول خصم ساعات
// القاعدة: الدفعة not_started + فيه خصم ساعات فعلي (hoursDeducted > 0) في جروب
// الفاتورة بتاريخ >= تاريخ إنشاء الفاتورة → الإسكرو يبدأ من (أحدث تاريخ بين
// أول خصم وتاريخ الدفعة) + 14 يوم.
// 🆕 الفواتير من غير groupId: بنحاول نربطها تلقائيًا (لو الطالب أخد حصص في جروب
// واحد بس). اللي مينفعش يتربط بيرجع في النتيجة (noGroupInvoices) للمراجعة اليدوية.
export async function syncEscrowStarts() {
  const orphan = await Payment.find({
    type: "payment",
    status: "completed",
    "escrow.status": "not_started",
  }).select("_id invoiceId date createdAt");

  const byInvoice = new Map();
  for (const p of orphan) {
    const key = String(p.invoiceId);
    if (!byInvoice.has(key)) byInvoice.set(key, []);
    byInvoice.get(key).push(p);
  }

  let started = 0;
  let waitingFirstSession = 0;
  let noGroup = 0;
  let autoLinked = 0;
  let failedCount = 0;
  const noGroupInvoices = [];

  for (const [invoiceId, payments] of byInvoice) {
    try {
      const invoice = await Invoice.findById(invoiceId)
        .select("studentId groupId status createdAt")
        .lean();

      if (!invoice || invoice.status === "Voided") continue;

      if (!invoice.groupId) {
        const inferred = await inferGroupForInvoice(invoice);
        if (!inferred) {
          noGroup += payments.length;
          noGroupInvoices.push(invoice._id);
          continue;
        }
        invoice.groupId = inferred;
        autoLinked++;
      }

      // أول خصم ساعات فعلي في الجروب ده بعد إنشاء الفاتورة
      const studentDoc = await Student.findOne(
        {
          _id: invoice.studentId,
          "creditSystem.usageHistory": {
            $elemMatch: {
              groupId: invoice.groupId,
              hoursDeducted: { $gt: 0 },
              date: { $gte: invoice.createdAt },
            },
          },
        },
        { "creditSystem.usageHistory.$": 1 },
      ).lean();

      const firstUsage = studentDoc?.creditSystem?.usageHistory?.[0];
      if (!firstUsage) {
        waitingFirstSession += payments.length;
        continue;
      }

      for (const p of payments) {
        const startedAt = new Date(
          Math.max(
            new Date(firstUsage.date).getTime(),
            new Date(p.date || p.createdAt).getTime(),
          ),
        );
        const releaseAt = new Date(startedAt);
        releaseAt.setDate(releaseAt.getDate() + ESCROW_DAYS);

        const res = await Payment.updateOne(
          { _id: p._id, "escrow.status": "not_started" },
          {
            $set: {
              "escrow.status": "in_escrow",
              "escrow.startedAt": startedAt,
              "escrow.releaseAt": releaseAt,
            },
          },
        );
        if (res.modifiedCount > 0) started++;
      }
    } catch (err) {
      failedCount++;
      console.error(`⚠️ escrow sync failed for invoice ${invoiceId}:`, err.message);
    }
  }

  return {
    checked: orphan.length,
    started,
    waitingFirstSession,
    noGroup,
    autoLinked,
    noGroupInvoices,
    failed: failedCount,
  };
}

// ─── Cron: تنبيهات الاستحقاق المتأخر (Due Date) ────────────────────────────
export async function checkOverdueInvoices() {
  const now = new Date();
  const overdue = await Invoice.find({
    dueDate: { $ne: null, $lte: now },
    status: "Pending",
  }).select("_id studentId dueDate");

  let created = 0;
  let failedCount = 0;

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
      if (err.code === 11000) continue; // فيه تنبيه open بالفعل، متوقع
      failedCount++;
      console.error(`⚠️ overdue alert failed for invoice ${inv._id}:`, err.message);
    }
  }

  return { checked: overdue.length, alertsCreated: created, failed: failedCount };
}

// ─── Cron: تنبيهات مراجعة الإسكرو بعد 14 يوم ────────────────────────────────
// ✅ مهم: الدالة دي مبتحسبش الفلوس تلقائيًا خالص — بس بتعمل تنبيه (Alert) للأدمن
// إن دفعة معينة عدى عليها 14 يوم، وبتستنى قراره (احسبها/رجّعها) عبر
// resolveEscrowAlert تحت. لو الأدمن ماعملش حاجة، الدفعة تفضل "in_escrow" لحد
// ما هو يتحرك.
export async function flagDueEscrowsForReview() {
  const now = new Date();

  const duePayments = await Payment.find({
    type: "payment",
    status: "completed",
    "escrow.status": "in_escrow",
    "escrow.releaseAt": { $lte: now },
  });

  let created = 0;
  let failedCount = 0;

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
      if (err.code === 11000) continue; // فيه alert مفتوح بالفعل لنفس الدفعة
      failedCount++;
      console.error(`⚠️ escrow alert failed for payment ${payment._id}:`, err.message);
    }
  }

  return { checked: duePayments.length, alertsCreated: created, failed: failedCount };
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

  // ✅ بنحسب المبلغ مرة واحدة بس ونستخدمه في التنفيذ وفي التسجيل
  const resolvedRefundAmount = Math.min(
    Number(refundAmount) || payment.amount,
    payment.amount,
  );

  if (action === "recognize") {
    payment.escrow.status = "recognized";
    payment.escrow.recognizedAt = now;
    await payment.save();
  } else if (action === "refund") {
    await refundInvoicePayment(alert.invoiceId, {
      amount: resolvedRefundAmount,
      reason: reason || "استرجاع بعد مراجعة الإسكرو",
      actedBy,
    });
  } else {
    throw new Error("action must be 'recognize' or 'refund'");
  }

  alert.status = "resolved";
  alert.resolution = {
    action,
    refundAmount: action === "refund" ? resolvedRefundAmount : undefined,
    reason: reason || "",
    actedBy,
    actedAt: now,
  };
  await alert.save();

  return { alert };
}

// ─── الكرون اليومي الموحّد ───────────────────────────────────────────────────
// 🆕 كل خطوة مستقلة: لو واحدة وقعت، الباقي يكمّل (خصوصًا رسايل الواتساب).
// الترتيب مهم: syncEscrowStarts الأول عشان flagDueEscrowsForReview تشوف
// الدفعات اللي لسه متفعّلة.
async function safeStep(name, fn) {
  try {
    return await fn();
  } catch (err) {
    console.error(`❌ billing cron step "${name}" failed:`, err.message);
    return { error: err.message };
  }
}

export async function runDailyBillingCron() {
  const escrowSyncResult = await safeStep("escrowSync", syncEscrowStarts);
  const escrowResult = await safeStep("escrow", flagDueEscrowsForReview);
  const overdueResult = await safeStep("overdue", checkOverdueInvoices);
  const reminderResult = await safeStep("reminders", sendDueDateReminders);
  return { escrowSyncResult, escrowResult, overdueResult, reminderResult };
}