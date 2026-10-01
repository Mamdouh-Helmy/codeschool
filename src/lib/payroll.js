// lib/payroll.js
// ⚠️ لو الـ alias بتاعك للموديلز مختلف غيّر المسارات دي بس.
import mongoose from "mongoose";
import Session from "../app/models/Session";
import Group from "../app/models/Group";
import Interview from "../app/models/Interview";
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
 * القاعدة: بدل المواصلات لأول سيشن/مقابلة offline في اليوم بس.
 * بنستثني الـ entry بتاعة السيشن/المقابلة الحالية نفسها (لو بنعيد الحساب).
 *
 * @param {Object} [exclude] { sessionId?, interviewId? }
 */
async function hasTransportationToday(instructorId, sessionDate, exclude = {}) {
  const { start, end } = getDayRange(sessionDate);

  const query = {
    instructorId,
    isDeleted: false,
    status: { $ne: "cancelled" },
    transportationApplied: true,
    sessionDate: { $gte: start, $lte: end },
  };
  if (exclude.sessionId) query.sessionId = { $ne: exclude.sessionId };
  if (exclude.interviewId) query.interviewId = { $ne: exclude.interviewId };

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
    return {
      success: true,
      skipped: true,
      reason: "already_processed",
      fullyProcessed: true,
      entries: [],
    };
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
    return {
      success: true,
      skipped: true,
      reason: "no_instructors",
      fullyProcessed: false,
      entries: [],
    };
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

    // 3) بدل المواصلات — offline بس، وأول سيشن/مقابلة في اليوم بس
    let transportationAllowance = 0;
    let transportationApplied = false;
    let transportationSkipReason = "";

    if (deliveryMode !== "offline") {
      transportationSkipReason = "online_session";
    } else if (!rate.transportationAllowance) {
      transportationSkipReason = "no_allowance_configured";
    } else {
      const alreadyPaid = await hasTransportationToday(instructorId, sessionDate, {
        sessionId: session._id,
      });
      if (alreadyPaid) {
        transportationSkipReason = "already_paid_today";
      } else {
        transportationAllowance = round2(rate.transportationAllowance);
        transportationApplied = true;
      }
    }

    const sessionAmount = calculateSessionAmount(durationMinutes, rate.hourlyRate);

    // ✅ الـ findOne فوق مش atomic — لو نفس السيشن اتعالجت مرتين في نفس
    // اللحظة (مثلاً complete من الأدمن + evaluation من المدرس)، ممكن الـ
    // create يرمي duplicate key error (unique index instructorId+sessionId).
    // بنمسك الحالة دي لوحدها لكل مدرس عشان error واحد مايوقفش باقي المدرسين
    // في نفس اللوب.
    try {
      const entry = await PayrollEntry.create({
        sourceType: "session",
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

// =============================================
// ✅ MAIN: تسجيل مرتب مقابلة
// =============================================

/**
 * بيتنده أول ما تقييم المقابلة يتحفظ (من interviewAutomation.sendInterviewEvaluation).
 * نفس منطق processSessionPayroll بالظبط (نفس الـ rates ونفس بدل المواصلات)،
 * بس لمدرس واحد (interview.instructorId) وبدون group/course.
 * idempotent: لو فيه entry للمقابلة دي → بتتخطى.
 *
 * @param {Object} opts
 * @param {String} opts.interviewId
 * @param {String} [opts.actedBy] user id
 * @param {String} [opts.source] "interview_evaluation" | "manual"
 * @param {Boolean} [opts.force] يتجاهل فلاج processed ويحاول تاني
 */
export async function processInterviewPayroll({
  interviewId,
  actedBy = null,
  source = "interview_evaluation",
  force = false,
}) {
  if (!interviewId || !mongoose.Types.ObjectId.isValid(interviewId)) {
    throw new Error("Invalid interviewId");
  }

  const interview = await Interview.findOne({ _id: interviewId, isDeleted: false });
  if (!interview) {
    const error = new Error("Interview not found");
    error.code = "INTERVIEW_NOT_FOUND";
    throw error;
  }

  if (interview.payroll?.processed && !force) {
    return {
      success: true,
      skipped: true,
      reason: "already_processed",
      fullyProcessed: true,
      entries: [],
    };
  }

  const instructorId = interview.instructorId;
  if (!instructorId) {
    return {
      success: true,
      skipped: true,
      reason: "no_instructor",
      fullyProcessed: false,
      entries: [],
    };
  }

  const deliveryMode = interview.deliveryMode || "online";
  const startTime = interview.actualStartTime || interview.startTime || "";
  const endTime = interview.actualEndTime || interview.endTime || "";
  const usedActual = !!(interview.actualStartTime && interview.actualEndTime);
  const durationMinutes = minutesBetween(startTime, endTime);

  if (durationMinutes <= 0) {
    const error = new Error("مدة المقابلة غير صالحة — راجع وقت البداية والنهاية");
    error.code = "INVALID_DURATION";
    throw error;
  }

  const sessionDate = new Date(interview.scheduledDate);
  const entries = [];
  const skipped = [];

  const existing = await PayrollEntry.findOne({
    instructorId,
    interviewId: interview._id,
    isDeleted: false,
  }).select("_id").lean();

  if (existing) {
    skipped.push({ instructorId, reason: "entry_exists", entryId: existing._id });
  } else {
    const rate = await InstructorRate.getEffectiveRate(instructorId, sessionDate);
    if (!rate || !rate.hourlyRate) {
      skipped.push({ instructorId, reason: "no_rate_configured" });
    } else {
      let transportationAllowance = 0;
      let transportationApplied = false;
      let transportationSkipReason = "";

      if (deliveryMode !== "offline") {
        transportationSkipReason = "online_session";
      } else if (!rate.transportationAllowance) {
        transportationSkipReason = "no_allowance_configured";
      } else if (
        await hasTransportationToday(instructorId, sessionDate, {
          interviewId: interview._id,
        })
      ) {
        transportationSkipReason = "already_paid_today";
      } else {
        transportationAllowance = round2(rate.transportationAllowance);
        transportationApplied = true;
      }

      const sessionAmount = calculateSessionAmount(durationMinutes, rate.hourlyRate);

      try {
        const entry = await PayrollEntry.create({
          sourceType: "interview",
          instructorId,
          interviewId: interview._id,
          sessionTitle: interview.title || "",
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
        if (err?.code === 11000) skipped.push({ instructorId, reason: "entry_exists" });
        else throw err;
      }
    }
  }

  const allDone = skipped.every((s) => s.reason === "entry_exists");

  interview.payroll = {
    processed: allDone,
    processedAt: new Date(),
    durationMinutes,
    lastError: allDone ? "" : "المدرس ليس له سعر ساعة مسجّل",
  };
  await interview.save();

  return {
    success: true,
    interviewId: interview._id,
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

/**
 * ✅ إلغاء سطور مرتب مقابلة — نفس فكرة cancelSessionPayroll.
 */
export async function cancelInterviewPayroll(interviewId, { actedBy, reason = "" } = {}) {
  const result = await PayrollEntry.updateMany(
    { interviewId, isDeleted: false, status: { $in: ["pending", "approved"] } },
    {
      $set: {
        status: "cancelled",
        notes: reason,
        "metadata.lastModifiedBy": actedBy,
        "metadata.updatedAt": new Date(),
      },
    },
  );

  await Interview.updateOne(
    { _id: interviewId },
    { $set: { "payroll.processed": false } },
  );

  return { cancelledCount: result.modifiedCount };
}