// /lib/billing-reminders.js
// ✅ تذكير السداد على الواتساب — بيتبعت من الرقم الرئيسي
// (WHATSAPP_INSTANCE_ID) عبر wapilotService.sendAndLogMessage زي أي رسالة عادية.
//
// ⛔️ فرق مهم عن checkOverdueInvoices اللي في billing.js:
//   - checkOverdueInvoices → تنبيه داخلي للأدمن (BillingAlert)
//   - الملف ده        → رسالة واتساب فعلية لولي الأمر
//
// 🆕 المخاطب هنا هو ولي الأمر فقط. لو مفيش رقم لولي الأمر، الفاتورة بتتخطى
// (skipped) ومبنبعتش للطالب نهائيًا.
//
// ⚠️ مفيش فحص على canReceiveMessages()/رصيد الساعات هنا عمدًا — الرسالة دي
// تحصيل مش تسويق، ولازم توصل حتى لو رصيد الطالب صفر أو الإشعارات متوقفة.
import Invoice from "../app/models/Invoice";
import Student from "../app/models/Student";
import Group from "../app/models/Group";
import BillingReminder from "../app/models/BillingReminder";
import wapilotService from "../app/services/wapilot-service";

const CAIRO_TZ = "Africa/Cairo";

// ✅ مراحل التذكير — قبل الاستحقاق (موجب)، يوم الاستحقاق (0)، بعده (سالب)
const STAGES = [
  { key: "due_in_7", daysUntilDue: 7, reminderType: "upcoming" },
  { key: "due_in_3", daysUntilDue: 3, reminderType: "upcoming" },
  { key: "due_in_1", daysUntilDue: 1, reminderType: "upcoming" },
  { key: "due_today", daysUntilDue: 0, reminderType: "due_today" },
  { key: "overdue_1", daysUntilDue: -1, reminderType: "overdue" },
  { key: "overdue_3", daysUntilDue: -3, reminderType: "overdue" },
  { key: "overdue_7", daysUntilDue: -7, reminderType: "overdue" },
];

const WINDOW_DAYS = 8;

// ─── Helpers ────────────────────────────────────────────────────────────────

// "2026-09-20" بتوقيت القاهرة — عشان الحسبة تبقى بالأيام التقويمية مش بالساعات
function cairoDateKey(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CAIRO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

function daysUntilDueCairo(now, dueDate) {
  const a = new Date(`${cairoDateKey(now)}T00:00:00Z`).getTime();
  const b = new Date(`${cairoDateKey(dueDate)}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

function formatDueDate(date, language = "ar") {
  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "ar-EG", {
    timeZone: CAIRO_TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function formatArabicDays(n) {
  const abs = Math.abs(Number(n) || 0);
  if (abs === 1) return "يوم واحد";
  if (abs === 2) return "يومين";
  if (abs <= 10) return `${abs} أيام`;
  return `${abs} يومًا`;
}

function stageFor(daysUntilDue) {
  return STAGES.find((s) => s.daysUntilDue === daysUntilDue) || null;
}

// ─── بناء نص الرسالة ────────────────────────────────────────────────────────
// ✅ الرسالة موجّهة لولي الأمر دائمًا — بتستخدم نفس دوال التحية الموجودة في
// wapilotService (نفس الـ DB variables).
async function buildReminderMessage({
  reminderType,
  language,
  student,
  amountRemaining,
  currency,
  dueDate,
  daysUntilDue,
  groupName,
}) {
  const studentName = student.personalInfo?.fullName || "";
  const studentGender = student.personalInfo?.gender || "male";
  const studentNickname = student.personalInfo?.nickname || null;
  const guardianName = student.guardianInfo?.name || "";
  const guardianNickname = student.guardianInfo?.nickname || null;
  const relationship = student.guardianInfo?.relationship || "father";

  const studentNameAr =
    studentNickname?.ar || studentName.split(" ")[0] || studentName;
  const studentNameEn =
    studentNickname?.en || studentName.split(" ")[0] || studentName;

  const amountText = `${Number(amountRemaining || 0).toLocaleString("en-US")} ${currency}`;
  const dueDateText = formatDueDate(dueDate, language);

  if (language === "en") {
    const salutation = await wapilotService.getGuardianSalutation(
      guardianName,
      relationship,
      guardianNickname,
      "en",
    );
    const childTitle = await wapilotService.getStudentChildTitle(
      studentGender,
      "en",
    );
    const subject = `your ${childTitle} **${studentNameEn}**`;

    const header =
      reminderType === "overdue"
        ? "🔴 Payment Overdue"
        : reminderType === "due_today"
          ? "⏰ Payment Due Today"
          : "⚠️ Upcoming Payment Reminder";

    const body =
      reminderType === "overdue"
        ? `This is a notice that the payment for ${subject} was due ${Math.abs(daysUntilDue)} day(s) ago and has not been received yet.`
        : reminderType === "due_today"
          ? `This is a reminder that the payment for ${subject} is due today.`
          : `This is a friendly reminder that the next payment for ${subject} is due in ${Math.abs(daysUntilDue)} day(s).`;

    return `${salutation},

${header}

${body}

💰 Amount due: *${amountText}*
📅 Due date: *${dueDateText}*${groupName ? `\n👥 Group: ${groupName}` : ""}

For any questions or to arrange the payment, please reply directly to this message.

Best regards,
The Code School Team 💻`;
  }

  const salutation = await wapilotService.getGuardianSalutation(
    guardianName,
    relationship,
    guardianNickname,
    "ar",
  );
  const childTitle = await wapilotService.getStudentChildTitle(
    studentGender,
    "ar",
  );
  const subjectAr = `الخاصة بـ${childTitle} **${studentNameAr}**`;

  const headerAr =
    reminderType === "overdue"
      ? "🔴 تنبيه: تأخر في السداد"
      : reminderType === "due_today"
        ? "⏰ اليوم هو موعد السداد"
        : "⚠️ تذكير: موعد سداد الدفعة القادمة";

  const bodyAr =
    reminderType === "overdue"
      ? `نود تنبيهكم بأن موعد سداد الدفعة ${subjectAr} قد مر عليه ${formatArabicDays(daysUntilDue)} ولم يتم استلامها حتى الآن.`
      : reminderType === "due_today"
        ? `نود تذكيركم بأن اليوم هو موعد سداد الدفعة ${subjectAr}.`
        : `نود تذكيركم بأن موعد سداد الدفعة القادمة ${subjectAr} بعد ${formatArabicDays(daysUntilDue)}.`;

  return `${salutation}،

${headerAr}

${bodyAr}

💰 المبلغ المستحق: *${amountText}*
📅 تاريخ الاستحقاق: *${dueDateText}*${groupName ? `\n👥 المجموعة: ${groupName}` : ""}

لأي استفسار أو لترتيب عملية السداد، يمكنكم الرد على هذه الرسالة مباشرة.

مع خالص التحية،
فريق Code School 💻`;
}

// ─── الدالة الرئيسية — بتتنادى من الكرون اليومي ─────────────────────────────
export async function sendDueDateReminders({ now = new Date() } = {}) {
  const from = new Date(now);
  from.setDate(from.getDate() - (WINDOW_DAYS + 1));
  const to = new Date(now);
  to.setDate(to.getDate() + (WINDOW_DAYS + 1));

  const invoices = await Invoice.find({
    status: "Pending",
    dueDate: { $ne: null, $gte: from, $lte: to },
  }).select("_id studentId groupId totalAmount paidAmount dueDate status");

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const details = [];
  // ✅ فواتير اتخطت لأن مفيش رقم لولي الأمر — مفيدة للأدمن يراجعها
  const missingGuardianPhone = [];

  for (const invoice of invoices) {
    try {
      const daysUntilDue = daysUntilDueCairo(now, invoice.dueDate);
      const stage = stageFor(daysUntilDue);
      if (!stage) {
        skipped++;
        continue;
      }

      const amountRemaining = Math.max(
        (invoice.totalAmount || 0) - (invoice.paidAmount || 0),
        0,
      );
      if (amountRemaining <= 0) {
        skipped++;
        continue;
      }

      const student = await Student.findById(invoice.studentId).select(
        "personalInfo guardianInfo communicationPreferences isDeleted",
      );
      if (!student || student.isDeleted) {
        skipped++;
        continue;
      }

      // ✅ ولي الأمر فقط هو المخاطب في رسائل التحصيل — مفيش fallback للطالب
      const guardianPhone =
        student.guardianInfo?.whatsappNumber || student.guardianInfo?.phone;

      if (!guardianPhone) {
        skipped++;
        missingGuardianPhone.push({
          invoiceId: invoice._id,
          studentId: student._id,
        });
        continue;
      }

      const target = { recipientType: "guardian", phone: guardianPhone };

      const dueDateKey = cairoDateKey(invoice.dueDate);

      // ✅ بنحجز المرحلة الأول (unique index) عشان لو الكرون اشتغل مرتين
      // بالغلط ما تتبعتش الرسالة مرتين
      let reminder;
      try {
        reminder = await BillingReminder.create({
          invoiceId: invoice._id,
          studentId: student._id,
          groupId: invoice.groupId || null,
          stageKey: stage.key,
          reminderType: stage.reminderType,
          dueDate: invoice.dueDate,
          dueDateKey,
          daysUntilDue,
          amountRemaining,
          status: "pending",
          recipients: [],
        });
      } catch (err) {
        if (err.code === 11000) {
          skipped++; // اتبعت قبل كده
          continue;
        }
        throw err;
      }

      let groupName = "";
      if (invoice.groupId) {
        const group = await Group.findById(invoice.groupId)
          .select("name")
          .lean();
        groupName = group?.name || "";
      }

      const language =
        student.communicationPreferences?.preferredLanguage || "ar";

      const messageContent = await buildReminderMessage({
        reminderType: stage.reminderType,
        language,
        student,
        amountRemaining,
        currency: "EGP",
        dueDate: invoice.dueDate,
        daysUntilDue,
        groupName,
      });

      let result;
      try {
        result = await wapilotService.sendAndLogMessage({
          studentId: student._id,
          phoneNumber: target.phone,
          messageContent,
          messageType: "custom",
          language,
          metadata: {
            recipientType: "guardian",
            automationType: "billing_reminder",
            alertType: stage.key,
            groupId: invoice.groupId || undefined,
            groupName,
          },
        });
      } catch (sendError) {
        result = { success: false, error: sendError.message };
      }

      reminder.recipients = [
        {
          recipientType: "guardian",
          phone: target.phone,
          status: result?.success ? "sent" : "failed",
          messageId: result?.messageId || "",
          error: result?.success ? "" : result?.error || "Unknown error",
        },
      ];

      if (result?.success) {
        reminder.status = "sent";
        await reminder.save();
        sent++;
      } else {
        // ✅ فشل الإرسال → نمسح السجل عشان الكرون يعيد المحاولة بكرة
        failed++;
        await BillingReminder.deleteOne({ _id: reminder._id });
      }

      details.push({
        invoiceId: invoice._id,
        studentId: student._id,
        stage: stage.key,
        daysUntilDue,
        amountRemaining,
        recipientType: "guardian",
        success: !!result?.success,
      });
    } catch (error) {
      failed++;
      console.error(
        `⚠️ Failed to send due-date reminder for invoice ${invoice._id}:`,
        error.message,
      );
    }
  }

  return {
    checked: invoices.length,
    sent,
    failed,
    skipped,
    missingGuardianPhone,
    details,
  };
}