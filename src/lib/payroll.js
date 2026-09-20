// lib/payroll.js
// ⚠️ لو الـ alias بتاعك للموديلز مختلف غيّر المسارات دي بس.
import mongoose from "mongoose";
import Session from "../app/models/Session";
import Group from "../app/models/Group";
import InstructorRate from "../app/models/InstructorRate";
import PayrollEntry from "../app/models/PayrollEntry";

// =============================================
// ✅ HELPERS
// =============================================

const toMinutes = (time) => {
  if (!time || typeof time !== "string" || !time.includes(":")) return null;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

/** ✅ الفرق بالدقايق بين وقتين — بيتعامل مع السيشن اللي بتعدي نص الليل */
export function minutesBetween(startTime, endTime) {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (start === null || end === null) return 0;
  const diff = end - start;
  return diff >= 0 ? diff : diff + 24 * 60;
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** ✅ الحسبة الأساسية: الدقايق ÷ 60 × سعر الساعة */
export function calculateSessionAmount(durationMinutes, hourlyRate) {
  return round2((Number(durationMinutes) / 60) * Number(hourlyRate));
}

/** ✅ حدود اليوم (بتوقيت السيرفر) — مستخدمة في فحص بدل المواصلات */
function getDayRange(date) {
  const d = new Date(date);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return { start, end };
}

/**
 * ✅ هل المدرس ده خد بدل مواصلات النهاردة بالفعل؟
 * القاعدة: بدل المواصلات لأول سيشن offline في اليوم بس.
 * بنستثني الـ entry بتاعة السيشن الحالية نفسها (لو بنعيد الحساب).
 */
async function hasTransportationToday(instructorId, sessionDate, excludeSessionId = null) {
  const { start, end } = getDayRange(sessionDate);

  const query = {
    instructorId,
    isDeleted: false,
    status: { $ne: "cancelled" },
    transportationApplied: true,
    sessionDate: { $gte: start, $lte: end },
  };
  if (excludeSessionId) query.sessionId = { $ne: excludeSessionId };

  const existing = await PayrollEntry.findOne(query).select("_id").lean();
  return !!existing;
}

// =============================================
// ✅ MAIN: تسجيل مرتب سيشن
// =============================================

/**
 * بيتنده أول ما السيشن تكتمل — من الأدمن (PUT /api/sessions/[id]) أو من
 * المدرس (PATCH .../evaluation). العملية idempotent تمامًا:
 *   - لو فيه entry موجودة للمدرس ده في السيشن دي → بتتخطى (مش بتتضاعف)
 *   - لو المدرس مالوش سعر متسجل → بيتخطى ويترجع في skipped، والسيشن مبتتقفلش
 *     على إنها processed عشان الأدمن يظبط السعر ويشغّل إعادة الحساب.
 *
 * @param {Object} opts
 * @param {String} opts.sessionId
 * @param {String} [opts.actualStartTime] "19:00" — الوقت الفعلي لو متوفر
 * @param {String} [opts.actualEndTime]   "20:30"
 * @param {String} [opts.actedBy] user id
 * @param {String} [opts.source] "admin_complete" | "instructor_evaluation" | "manual"
 * @param {Boolean} [opts.force] يتجاهل فلاج processed ويحاول تاني
 */
export async function processSessionPayroll({
  sessionId,
  actualStartTime = null,
  actualEndTime = null,
  actedBy = null,
  source = "manual",
  force = false,
}) {
  if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new Error("Invalid sessionId");
  }

  const session = await Session.findOne({ _id: sessionId, isDeleted: false });
  if (!session) {
    const error = new Error("Session not found");
    error.code = "SESSION_NOT_FOUND";
    throw error;
  }

  if (session.payroll?.processed && !force) {
    return { success: true, skipped: true, reason: "already_processed", entries: [] };
  }

  const group = await Group.findById(session.groupId)
    .select("name instructors deliveryMode")
    .lean();

  if (!group) {
    const error = new Error("Group not found for this session");
    error.code = "GROUP_NOT_FOUND";
    throw error;
  }

  const instructors = (group.instructors || [])
    .map((i) => i?.userId)
    .filter(Boolean);

  if (instructors.length === 0) {
    return { success: true, skipped: true, reason: "no_instructors", entries: [] };
  }

  // ── نوع السيشن: snapshot السيشن أولًا، وإلا نوع الجروب، وإلا online ────
  const deliveryMode = session.deliveryMode || group.deliveryMode || "online";

  // ── الوقت الفعلي: المبعوت → المحفوظ على السيشن → الوقت المجدول ────────
  const startTime =
    actualStartTime || session.actualStartTime || session.startTime || "";
  const endTime = actualEndTime || session.actualEndTime || session.endTime || "";

  // ✅ usedActual بيبقى true بس لو في وقت فعلي *حقيقي* اتسجل (مبعوت دلوقتي
  // أو محفوظ من قبل على السيشن) — مش لو رجعنا لـ fallback الجدول
  const usedActual = !!(
    (actualStartTime && actualEndTime) ||
    (session.actualStartTime && session.actualEndTime)
  );

  const durationMinutes = minutesBetween(startTime, endTime);

  if (durationMinutes <= 0) {
    const error = new Error("مدة السيشن غير صالحة — راجع وقت البداية والنهاية");
    error.code = "INVALID_DURATION";
    throw error;
  }

  const sessionDate = new Date(session.scheduledDate);
  const entries = [];
  const skipped = [];

  for (const instructorId of instructors) {
    // 1) مفيش تكرار
    const existing = await PayrollEntry.findOne({
      instructorId,
      sessionId: session._id,
      isDeleted: false,
    }).select("_id").lean();

    if (existing) {
      skipped.push({ instructorId, reason: "entry_exists", entryId: existing._id });
      continue;
    }

    // 2) السعر السارِي وقت السيشن (snapshot)
    const rate = await InstructorRate.getEffectiveRate(instructorId, sessionDate);
    if (!rate || !rate.hourlyRate) {
      skipped.push({ instructorId, reason: "no_rate_configured" });
      continue;
    }

    // 3) بدل المواصلات — offline بس، وأول سيشن في اليوم بس
    let transportationAllowance = 0;
    let transportationApplied = false;
    let transportationSkipReason = "";

    if (deliveryMode !== "offline") {
      transportationSkipReason = "online_session";
    } else if (!rate.transportationAllowance) {
      transportationSkipReason = "no_allowance_configured";
    } else {
      const alreadyPaid = await hasTransportationToday(
        instructorId,
        sessionDate,
        session._id,
      );
      if (alreadyPaid) {
        transportationSkipReason = "already_paid_today";
      } else {
        transportationAllowance = round2(rate.transportationAllowance);
        transportationApplied = true;
      }
    }

    const sessionAmount = calculateSessionAmount(durationMinutes, rate.hourlyRate);

    // ✅ FIX: الـ findOne فوق مش atomic — لو نفس السيشن اتعالجت مرتين في نفس
    // اللحظة (مثلاً complete من الأدمن + evaluation من المدرس)، ممكن الـ
    // create يرمي duplicate key error (unique index instructorId+sessionId).
    // بنمسك الحالة دي لوحدها لكل مدرس عشان error واحد مايوقفش باقي المدرسين
    // في نفس اللوب.
    try {
      const entry = await PayrollEntry.create({
        instructorId,
        sessionId: session._id,
        groupId: session.groupId,
        courseId: session.courseId,
        sessionTitle: session.title || "",
        groupName: group.name || "",
        sessionDate,
        deliveryMode,
        actualStartTime: startTime,
        actualEndTime: endTime,
        durationMinutes,
        durationSource: usedActual ? "actual" : "scheduled",
        hourlyRateSnapshot: rate.hourlyRate,
        rateHistoryId: rate.historyId,
        sessionAmount,
        transportationAllowance,
        transportationApplied,
        transportationSkipReason,
        totalAmount: round2(sessionAmount + transportationAllowance),
        currency: rate.currency,
        status: "pending",
        metadata: { createdBy: actedBy, source },
      });

      entries.push(entry);
    } catch (err) {
      if (err?.code === 11000) {
        skipped.push({ instructorId, reason: "entry_exists" });
      } else {
        throw err;
      }
    }
  }

  // ✅ مبنقفلش السيشن على processed غير لما كل المدرسين ياخدوا سطورهم —
  // كده لو مدرس مالوش سعر، الأدمن يظبطه ويشغّل إعادة الحساب عادي.
  const allDone = skipped.every((s) => s.reason === "entry_exists");

  // ✅ FIX: نحدّث actualStartTime/actualEndTime على السيشن بس لو فعلاً في
  // وقت فعلي حقيقي اتسجل (usedActual). لو استخدمنا الجدول كـ fallback بس،
  // نسيب الحقلين زي ما هما (فاضيين) عشان مايبانش إن فيه check-in فعلي حصل
  // مع إنه مجرد قيمة افتراضية من الجدول.
  if (usedActual) {
    session.actualStartTime = startTime;
    session.actualEndTime = endTime;
  }

  session.payroll = {
    processed: allDone,
    processedAt: new Date(),
    durationMinutes,
    entriesCount: (session.payroll?.entriesCount || 0) + entries.length,
    lastError: allDone ? "" : "بعض المدرسين ليس لهم سعر ساعة مسجّل",
  };
  await session.save();

  return {
    success: true,
    sessionId: session._id,
    deliveryMode,
    durationMinutes,
    createdCount: entries.length,
    entries,
    skipped,
    fullyProcessed: allDone,
  };
}

/**
 * ✅ إلغاء سطور مرتب سيشن (لو الأدمن ألغى السيشن بعد ما اكتملت بالغلط).
 * مبنحذفش — بنعمل cancelled عشان الـ audit trail يفضل موجود.
 */
export async function cancelSessionPayroll(sessionId, { actedBy, reason = "" } = {}) {
  const result = await PayrollEntry.updateMany(
    { sessionId, isDeleted: false, status: { $in: ["pending", "approved"] } },
    {
      $set: {
        status: "cancelled",
        notes: reason,
        "metadata.lastModifiedBy": actedBy,
        "metadata.updatedAt": new Date(),
      },
    },
  );

  await Session.updateOne(
    { _id: sessionId },
    { $set: { "payroll.processed": false, "payroll.entriesCount": 0 } },
  );

  return { cancelledCount: result.modifiedCount };
}