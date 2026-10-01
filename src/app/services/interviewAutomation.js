// /src/app/services/interviewAutomation.js
import mongoose from "mongoose";
import Interview from "../models/Interview";
import Student from "../models/Student";
import User from "../models/User";
import MessageTemplate from "../models/MessageTemplate";
import { wapilotService } from "./wapilot-service";
import { routeMessage } from "./messageRouting";

export const VALID_INTERVIEW_DECISIONS = ["pass", "review", "repeat"];

// ═══════════════════════════════════════════════════════════════════════════
// ✅ TemplateVariable — بنقرا المتغيرات من الداتا بيز
// ═══════════════════════════════════════════════════════════════════════════
let _dbVarsCache = null;
let _dbVarsCacheTime = 0;
const DB_VARS_CACHE_TTL = 60 * 1000; // دقيقة واحدة

async function fetchDbVars() {
  const now = Date.now();
  if (_dbVarsCache && now - _dbVarsCacheTime < DB_VARS_CACHE_TTL) {
    return _dbVarsCache;
  }
  try {
    const TemplateVariable = (await import("../models/TemplateVariable"))
      .default;
    const vars = await TemplateVariable.find({ isActive: true }).lean();
    const map = {};
    vars.forEach((v) => {
      map[v.key] = v;
    });
    _dbVarsCache = map;
    _dbVarsCacheTime = now;
    return map;
  } catch (err) {
    console.warn("⚠️ Could not load TemplateVariable:", err.message);
    return {};
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ✅ resolveVar — يحل قيمة متغير واحد حسب اللغة والجنس
// ═══════════════════════════════════════════════════════════════════════════
function resolveVar(dbVars, key, lang = "ar", genderContext = {}) {
  const v = dbVars[key];
  if (!v) return null;

  const {
    studentGender = "male",
    guardianType = "father",
    instructorGender = "male",
    ownerGender = "male",
  } = genderContext;

  const isMale = String(studentGender).toLowerCase() !== "female";
  const isFather = String(guardianType).toLowerCase() !== "mother";
  const isMaleInstructor = String(instructorGender).toLowerCase() !== "female";
  const isMaleOwner = String(ownerGender).toLowerCase() !== "female";

  if (v.hasGender) {
    if (v.genderType === "student") {
      return lang === "ar"
        ? (isMale ? v.valueMaleAr : v.valueFemaleAr) || v.valueAr || null
        : (isMale ? v.valueMaleEn : v.valueFemaleEn) || v.valueEn || null;
    }
    if (v.genderType === "guardian") {
      return lang === "ar"
        ? (isFather ? v.valueFatherAr : v.valueMotherAr) || v.valueAr || null
        : (isFather ? v.valueFatherEn : v.valueMotherEn) || v.valueEn || null;
    }
    if (v.genderType === "instructor") {
      return lang === "ar"
        ? (isMaleInstructor ? v.valueMaleAr : v.valueFemaleAr) ||
            v.valueAr ||
            null
        : (isMaleInstructor ? v.valueMaleEn : v.valueFemaleEn) ||
            v.valueEn ||
            null;
    }
    if (v.genderType === "portfolio_owner") {
      return lang === "ar"
        ? (isMaleOwner ? v.valueMaleAr : v.valueFemaleAr) || v.valueAr || null
        : (isMaleOwner ? v.valueMaleEn : v.valueFemaleEn) || v.valueEn || null;
    }
  }
  return lang === "ar" ? v.valueAr || null : v.valueEn || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function renderTemplate(template, vars) {
  if (!template) return "";
  let out = template;
  // الأطول أولاً عشان مايحصلش تعارض ({studentName} vs {studentName_ar})
  const keys = Object.keys(vars).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    const v = vars[k];
    if (v === undefined || v === null) continue;
    // ✅ FIX: function replacer — عشان لو القيمة فيها $& أو $1 (مثلاً في تعليق المدرس) ما تتفسرش
    out = out.replace(new RegExp(`\\{${k}\\}`, "g"), () => String(v));
  }
  return out;
}

function formatDate(date, lang = "ar") {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString(
      lang === "ar" ? "ar-EG" : "en-US",
      { weekday: "long", year: "numeric", month: "long", day: "numeric" },
    );
  } catch {
    return "";
  }
}

// ✅ رقم الواتساب (واتساب أولاً ثم الهاتف العادي)
function pickPhone(obj) {
  return String(obj?.whatsappNumber || obj?.phone || "").trim();
}

// ✅ نص القرار حسب اللغة والجنس
function getDecisionText(decision, lang = "ar", isMale = true) {
  if (lang === "ar") {
    return (
      {
        pass: isMale ? "مقبول" : "مقبولة",
        review: "يحتاج مراجعة",
        repeat: "يحتاج مقابلة إضافية",
      }[decision] || ""
    );
  }
  return (
    {
      pass: "Accepted",
      review: "Needs Review",
      repeat: "Needs Another Interview",
    }[decision] || ""
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// buildInterviewVariables
// ═══════════════════════════════════════════════════════════════════════════
async function buildInterviewVariables({
  student,
  interview,
  instructor,
  lang = "ar",
}) {
  const dbVars = await fetchDbVars();

  const gender = (student?.personalInfo?.gender || "male").toLowerCase();
  const isMale = gender !== "female";
  const relationship = (
    student?.guardianInfo?.relationship || "father"
  ).toLowerCase();
  const isFather = relationship !== "mother";
  const isAdult = student?.studentType === "adults";

  const genderCtx = { studentGender: gender, guardianType: relationship };

  // ── الأسماء ──
  const studentFirstName =
    lang === "ar"
      ? student?.personalInfo?.nickname?.ar?.trim() ||
        student?.personalInfo?.fullName?.split(" ")[0] ||
        "الطالب"
      : student?.personalInfo?.nickname?.en?.trim() ||
        student?.personalInfo?.fullName?.split(" ")[0] ||
        "Student";

  const guardianFirstName =
    lang === "ar"
      ? student?.guardianInfo?.nickname?.ar?.trim() ||
        student?.guardianInfo?.name?.split(" ")[0] ||
        "ولي الأمر"
      : student?.guardianInfo?.nickname?.en?.trim() ||
        student?.guardianInfo?.name?.split(" ")[0] ||
        "Guardian";

  // ── Salutations من DB (أو fallback) ──
  const salutationBase_ar =
    resolveVar(dbVars, "salutation_ar", "ar", genderCtx) ||
    (isMale ? "عزيزي الطالب" : "عزيزتي الطالبة");

  const salutationBase_en =
    resolveVar(dbVars, "salutation_en", "en", genderCtx) || "Dear";

  const guardianSalBase_ar =
    resolveVar(dbVars, "guardianSalutation_ar", "ar", genderCtx) ||
    (isFather ? "عزيزي الأستاذ" : "عزيزتي السيدة");

  const guardianSalBase_en =
    resolveVar(dbVars, "guardianSalutation_en", "en", genderCtx) ||
    (isFather ? "Dear Mr." : "Dear Mrs.");

  const childTitleAr =
    resolveVar(dbVars, "childTitle", "ar", genderCtx) ||
    (isMale ? "ابنك" : "ابنتك");

  const childTitleEn =
    resolveVar(dbVars, "childTitle", "en", genderCtx) ||
    (isMale ? "your son" : "your daughter");

  const studentSalutation_ar = `${salutationBase_ar} ${studentFirstName}`;
  const studentSalutation_en = `${salutationBase_en} ${studentFirstName}`;
  const guardianSalutation_ar = `${guardianSalBase_ar} ${guardianFirstName}`;
  const guardianSalutation_en = `${guardianSalBase_en} ${guardianFirstName}`;

  const studentSalutation =
    lang === "ar" ? studentSalutation_ar : studentSalutation_en;
  const guardianSalutation = isAdult
    ? ""
    : lang === "ar"
      ? guardianSalutation_ar
      : guardianSalutation_en;
  const childTitle = isAdult ? "" : lang === "ar" ? childTitleAr : childTitleEn;

  // ── Instructor ──
  const instructorGender = (instructor?.gender || "male").toLowerCase();
  const isMaleInstructor = instructorGender !== "female";

  const instructorFirstName =
    instructor?.name?.split(" ")[0] ||
    (lang === "ar" ? "المدرس" : "Instructor");

  const instructorSalBase_ar =
    resolveVar(dbVars, "instructorSalutation", "ar", { instructorGender }) ||
    (isMaleInstructor ? "عزيزي الأستاذ" : "عزيزتي الأستاذة");

  const instructorSalBase_en =
    resolveVar(dbVars, "instructorSalutation", "en", { instructorGender }) ||
    (isMaleInstructor ? "Dear Mr." : "Dear Ms.");

  const instructorSalutation_ar = `${instructorSalBase_ar} ${instructorFirstName}`;
  const instructorSalutation_en = `${instructorSalBase_en} ${instructorFirstName}`;
  const instructorSalutation =
    lang === "ar" ? instructorSalutation_ar : instructorSalutation_en;

  // ── Location / Meeting ──
  const loc = interview?.locationDetails || {};
  const isOffline = interview?.deliveryMode === "offline";
  const meetingLink = !isOffline ? interview?.meetingLink || "" : "";

  let mapsLink = "";
  if (isOffline) {
    if (loc.lat != null && loc.lng != null) {
      mapsLink = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
    } else if (loc.address) {
      mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`;
    } else if (loc.placeName) {
      mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.placeName)}`;
    }
  }

  const dateStr = formatDate(interview?.scheduledDate, lang);
  const timeStr = `${interview?.startTime || ""} - ${interview?.endTime || ""}`;

  // ── Evaluation ──
  const evalDecision = interview?.evaluation?.decision || "";

  return {
    // ── Student ──
    salutation_ar: studentSalutation_ar,
    salutation_en: studentSalutation_en,
    studentSalutation,
    studentSalutation_ar,
    studentSalutation_en,
    studentName: studentFirstName,
    studentFullName: student?.personalInfo?.fullName || "",

    // ── Guardian (فاضية للبالغ) ──
    guardianSalutation,
    guardianSalutation_ar: isAdult ? "" : guardianSalutation_ar,
    guardianSalutation_en: isAdult ? "" : guardianSalutation_en,
    guardianName: isAdult ? "" : guardianFirstName,
    childTitle,

    // ── Instructor ──
    instructorSalutation,
    instructorSalutation_ar,
    instructorSalutation_en,
    instructorName: instructorFirstName,
    instructorFullName: instructor?.name || "",

    // ── Interview ──
    sessionName: interview?.title || "",
    date: dateStr,
    time: timeStr,
    meetingLink,
    placeName: isOffline ? loc.placeName || interview?.location || "" : "",
    address: isOffline ? loc.address || loc.extraDetails || "" : "",
    mapsLink: isOffline ? mapsLink : "",

    // ── Evaluation ──
    // ✅ FIX: تاريخ المقابلة الفعلي (مش وقت إكمال التقييم)
    interviewDate: formatDate(interview?.scheduledDate, lang),
    interviewNumber: String(interview?.evaluation?.interviewNumber || 1),
    instructorComment: interview?.evaluation?.instructorComment?.trim() || "—",
    // ✅ FIX: نص مترجم بدل pass/review/repeat الخام
    evaluationDecision: getDecisionText(evalDecision, lang, isMale),

    isAdult,
    isOffline,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// getTemplate
// ═══════════════════════════════════════════════════════════════════════════
async function getTemplate(templateType, lang = "ar") {
  const result = await MessageTemplate.getOrFallback(templateType, lang);
  return result?.content || "";
}

// ═══════════════════════════════════════════════════════════════════════════
// canSendToStudent
// ═══════════════════════════════════════════════════════════════════════════
function canSendToStudent(student) {
  if (!student) return false;
  const whatsappEnabled =
    student.communicationPreferences?.notificationChannels?.whatsapp;
  if (whatsappEnabled === false) return false;
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEND WELCOME
// ═══════════════════════════════════════════════════════════════════════════
export async function sendInterviewWelcome(interviewId, options = {}) {
  await (await import("@/lib/mongodb")).connectDB();

  const interview = await Interview.findById(interviewId).lean();
  if (!interview) return { success: false, error: "Interview not found" };

  const student = await Student.findById(interview.studentId).lean();
  if (!student) return { success: false, error: "Student not found" };

  const instructor = await User.findById(interview.instructorId)
    .select("name email gender profile")
    .lean();
  if (!instructor) return { success: false, error: "Instructor not found" };

  const isAdult = student.studentType === "adults";
  const isOffline = interview.deliveryMode === "offline";
  const suffix = isOffline ? "offline" : "online";
  const lang = student.communicationPreferences?.preferredLanguage || "ar";

  const vars = await buildInterviewVariables({
    student,
    interview,
    instructor,
    lang,
  });

  const results = { student: null, guardian: null, instructor: null };
  const meta = { interviewId: interview._id, title: interview.title };

  // ── Student ──
  const studentPhone = student.personalInfo?.whatsappNumber;
  if (studentPhone && canSendToStudent(student)) {
    const templateType = isAdult
      ? `interview_welcome_adult_${suffix}`
      : `interview_welcome_child_${suffix}`;
    const template = await getTemplate(templateType, lang);
    const content = renderTemplate(template, vars);

    const res = await wapilotService.sendAndLogMessage({
      studentId: student._id,
      phoneNumber: studentPhone,
      messageContent: content,
      messageType: templateType,
      language: lang,
      metadata: { ...meta, recipientType: "student", isAdult, isOffline },
    });
    results.student = res;
  }

  // ── Guardian (kids only) ──
  if (!isAdult) {
    const guardianPhone = pickPhone(student.guardianInfo);
    if (guardianPhone) {
      const templateType = `interview_welcome_guardian_${suffix}`;
      const template = await getTemplate(templateType, lang);
      const content = renderTemplate(template, vars);

      const res = await wapilotService.sendAndLogMessage({
        studentId: student._id,
        phoneNumber: guardianPhone,
        messageContent: content,
        messageType: templateType,
        language: lang,
        metadata: { ...meta, recipientType: "guardian", isOffline },
      });
      results.guardian = res;
    }
  }

  // ── Instructor ──
  const instructorPhone =
    instructor.profile?.phone?.trim() || instructor.phone?.trim() || "";

  if (instructorPhone) {
    const templateType = `interview_welcome_instructor_${suffix}`;
    const template = await getTemplate(templateType, "ar");
    const content = renderTemplate(template, vars);

    const res = await wapilotService.sendAndLogMessage({
      studentId: student._id,
      phoneNumber: instructorPhone,
      messageContent: content,
      messageType: templateType,
      language: "ar",
      metadata: { ...meta, recipientType: "instructor", isOffline },
    });
    results.instructor = res;
  } else {
    console.warn(
      `⚠️ [Interview Welcome] Instructor ${instructor.name} has no phone number — skipping instructor message`,
    );
  }

  const anySent =
    results.student?.success ||
    results.guardian?.success ||
    results.instructor?.success;

  if (anySent) {
    await Interview.findByIdAndUpdate(interviewId, {
      $set: {
        "automationEvents.welcomeSent": true,
        "automationEvents.welcomeSentAt": new Date(),
      },
    });
  }

  return {
    success: anySent,
    results,
    notificationResults: results,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SEND REMINDER (24h / 15min / 30min / pre-ping)
// ✅ FIX: guards للـ online/offline، رقم ولي الأمر بـ fallback، ولي الأمر
//         بيتحسب في النجاح، والـ flag بيتعمل بس لو فيه رسالة اتبعتت فعلاً
// ═══════════════════════════════════════════════════════════════════════════
export async function sendInterviewReminder(interviewId, reminderType) {
  await (await import("@/lib/mongodb")).connectDB();

  const interview = await Interview.findById(interviewId).lean();
  if (!interview) return { success: false, error: "Interview not found" };

  if (interview.status !== "scheduled") {
    return {
      success: false,
      reason: "not_scheduled",
      error: "Interview is not scheduled",
    };
  }

  const student = await Student.findById(interview.studentId).lean();
  if (!student) return { success: false, error: "Student not found" };

  const instructor = await User.findById(interview.instructorId)
    .select("name email gender profile")
    .lean();

  const isAdult = student.studentType === "adults";
  const isOffline = interview.deliveryMode === "offline";
  const lang = student.communicationPreferences?.preferredLanguage || "ar";

  // ✅ guards: 15min للأونلاين بس — 30min و pre_ping للأوفلاين بس
  if (reminderType === "15min" && isOffline) {
    return {
      success: false,
      reason: "online_only",
      error: "15min reminder is online-only",
    };
  }
  if ((reminderType === "30min" || reminderType === "pre_ping") && !isOffline) {
    return {
      success: false,
      reason: "offline_only",
      error: `${reminderType} reminder is offline-only`,
    };
  }

  let templatePrefix = "";
  let flagField = "";

  if (reminderType === "24h") {
    templatePrefix = isOffline
      ? "interview_reminder_24h_offline"
      : "interview_reminder_24h_online";
    flagField = "automationEvents.reminder24hSent";
  } else if (reminderType === "15min") {
    templatePrefix = "interview_reminder_15min_online";
    flagField = "automationEvents.reminder15minSent";
  } else if (reminderType === "30min") {
    templatePrefix = "interview_reminder_30min_offline";
    flagField = "automationEvents.reminder30minOfflineSent";
  } else if (reminderType === "pre_ping") {
    templatePrefix = "interview_pre_ping_offline";
    flagField = "automationEvents.prePingOfflineSent";
  } else {
    return { success: false, error: "Invalid reminder type" };
  }

  const vars = await buildInterviewVariables({
    student,
    interview,
    instructor,
    lang,
  });

  let studentsNotified = 0;
  let guardiansNotified = 0;
  let instructorsNotified = 0;
  const results = { student: null, guardian: null, instructor: null };

  const baseMeta = { interviewId: interview._id, reminderType };

  // ── Student ──
  const studentPhone = isAdult
    ? pickPhone(student.personalInfo)
    : String(student.personalInfo?.whatsappNumber || "").trim();
  if (studentPhone && canSendToStudent(student)) {
    const templateType = isAdult
      ? `${templatePrefix}_adult`
      : `${templatePrefix}_child`;
    const template = await getTemplate(templateType, lang);
    const content = renderTemplate(template, vars);

    const res = await wapilotService.sendAndLogMessage({
      studentId: student._id,
      phoneNumber: studentPhone,
      messageContent: content,
      messageType: templateType,
      language: lang,
      metadata: { ...baseMeta, recipientType: "student" },
    });
    results.student = res;
    if (res?.success) studentsNotified++;
  }

  // ── Guardian (kids only) ──
  if (!isAdult) {
    const guardianPhone = pickPhone(student.guardianInfo);
    if (guardianPhone) {
      const templateType = `${templatePrefix}_guardian`;
      const template = await getTemplate(templateType, lang);
      const content = renderTemplate(template, vars);

      const res = await wapilotService.sendAndLogMessage({
        studentId: student._id,
        phoneNumber: guardianPhone,
        messageContent: content,
        messageType: templateType,
        language: lang,
        metadata: { ...baseMeta, recipientType: "guardian" },
      });
      results.guardian = res;
      if (res?.success) guardiansNotified++;
    }
  }

  // ── Instructor ──
  const instructorPhone =
    instructor?.profile?.phone?.trim() || instructor?.phone?.trim() || "";

  if (instructorPhone) {
    const templateType = `${templatePrefix}_instructor`;
    const template = await getTemplate(templateType, "ar");
    const content = renderTemplate(template, vars);

    const res = await wapilotService.sendAndLogMessage({
      studentId: student._id,
      phoneNumber: instructorPhone,
      messageContent: content,
      messageType: templateType,
      language: "ar",
      metadata: { ...baseMeta, recipientType: "instructor" },
    });
    results.instructor = res;
    if (res?.success) instructorsNotified++;
  }

  const anySent =
    studentsNotified + guardiansNotified + instructorsNotified > 0;

  // ── Flag update — بس لو فيه رسالة اتبعتت فعلاً ──
  if (anySent) {
    const flagUpdate = {
      [flagField]: true,
      [`${flagField}At`]: new Date(),
    };
    // الطالب + ولي الأمر بيتحسبوا مع بعض كـ "students notified"
    const recipientsNotified = studentsNotified + guardiansNotified;

    if (reminderType === "24h") {
      flagUpdate["automationEvents.reminder24hStudentsNotified"] =
        recipientsNotified;
      flagUpdate["automationEvents.reminder24hInstructorsNotified"] =
        instructorsNotified;
    } else if (reminderType === "15min") {
      flagUpdate["automationEvents.reminder15minStudentsNotified"] =
        recipientsNotified;
      flagUpdate["automationEvents.reminder15minInstructorsNotified"] =
        instructorsNotified;
    } else if (reminderType === "30min") {
      flagUpdate["automationEvents.reminder30minOfflineStudentsNotified"] =
        recipientsNotified;
      flagUpdate["automationEvents.reminder30minOfflineInstructorsNotified"] =
        instructorsNotified;
    } else if (reminderType === "pre_ping") {
      flagUpdate["automationEvents.prePingOfflineStudentsNotified"] =
        recipientsNotified;
      flagUpdate["automationEvents.prePingOfflineInstructorsNotified"] =
        instructorsNotified;
    }

    await Interview.findByIdAndUpdate(interviewId, { $set: flagUpdate });
  }

  return {
    success: anySent,
    studentsNotified,
    guardiansNotified,
    instructorsNotified,
    results,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ✅ INTERVIEW EVALUATION
// ─────────────────────────────────────────────────────────────────────────
// - المقابلة مفيهاش تسجيل حضور: المدرس بيروح للتقييم على طول.
// - طفل (kids)   → الرسالة لولي الأمر بقالب interview_evaluation_guardian
// - بالغ (adults) → الرسالة للطالب نفسه بقالب interview_evaluation_adult
// - مرتب المدرس بيتحسب في كل الحالات (حتى لو الرسالة مابعتتش)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * يبني رسالة التقييم (للمعاينة أو للإرسال) — من غير ما يحفظ أو يبعت حاجة.
 * تحديد القالب والمستلم بيتم من messageRouting (مصدر واحد).
 */
export async function buildInterviewEvaluationMessage({
  student,
  interview,
  decision,
  comment = "",
  interviewNumber = 1,
  rawContent = null,
}) {
  const { isAdult, templateType, recipientType, recipientPhone } = routeMessage(
    { event: "interview_evaluation", student },
  );
  const lang = student?.communicationPreferences?.preferredLanguage || "ar";

  const interviewForVars = {
    ...interview,
    evaluation: {
      decision,
      instructorComment: comment || "",
      interviewNumber: interviewNumber || 1,
      completedAt: interview?.evaluation?.completedAt || new Date(),
    },
  };

  const vars = await buildInterviewVariables({
    student,
    interview: interviewForVars,
    instructor: null,
    lang,
  });

  let template = rawContent;
  let isFallback = false;
  if (!template) {
    const result = await MessageTemplate.getOrFallback(templateType, lang);
    template = result.content;
    isFallback = result.isFallback;
  }

  return {
    rendered: renderTemplate(template, vars),
    lang,
    isFallback,
    isAdult,
    templateType,
    recipientType,
    recipientPhone,
  };
}

/**
 * ✅ حساب مرتب المدرس للمقابلة.
 * كل المنطق (المدة، السعر، بدل المواصلات، منع التكرار) جوه
 * processInterviewPayroll في lib/payroll.js — هنا wrapper رفيع بس،
 * وأي خطأ بيتسجل ومبيوقفش التقييم ولا الرسالة.
 */
async function runInterviewPayroll(interview, completedBy) {
  try {
    const { processInterviewPayroll } = await import("@/lib/payroll");
    return await processInterviewPayroll({
      interviewId: interview._id,
      actedBy: completedBy,
      source: "interview_evaluation",
    });
  } catch (err) {
    console.error("⚠️ Interview payroll failed:", err.message);
    try {
      await Interview.updateOne(
        { _id: interview._id },
        { $set: { "payroll.lastError": err.message } },
      );
    } catch (updateErr) {
      console.error(
        "⚠️ Could not save interview payroll error:",
        updateErr.message,
      );
    }
    return { success: false, error: err.message };
  }
}

export async function sendInterviewEvaluation(
  interviewId,
  evaluationData,
  options = {},
) {
  await (await import("@/lib/mongodb")).connectDB();

  const {
    decision,
    instructorComment = "",
    completedBy = null,
    actualStartTime = null,
    actualEndTime = null,
  } = evaluationData || {};

  if (!VALID_INTERVIEW_DECISIONS.includes(decision)) {
    return { success: false, error: "Invalid decision" };
  }

  const interview = await Interview.findById(interviewId);
  if (!interview) return { success: false, error: "Interview not found" };

  const student = await Student.findById(interview.studentId).lean();
  if (!student) return { success: false, error: "Student not found" };

  const alreadySent = !!interview.automationEvents?.evaluationSent;

  let interviewNumber =
    evaluationData.interviewNumber || interview.evaluation?.interviewNumber;
  if (!interviewNumber) {
    const previousCompleted = await Interview.countDocuments({
      studentId: interview.studentId,
      status: "completed",
      isDeleted: false,
      _id: { $ne: interview._id },
    });
    interviewNumber = previousCompleted + 1;
  }

  // ── 1) حفظ التقييم (من غير أي حضور) ──
  interview.evaluation = {
    decision,
    instructorComment: instructorComment || "",
    interviewNumber,
    completedAt: new Date(),
    completedBy: completedBy || null,
  };
  interview.status = "completed";
  if (completedBy) interview.metadata.lastModifiedBy = completedBy;
  if (actualStartTime && actualEndTime) {
    interview.actualStartTime = actualStartTime;
    interview.actualEndTime = actualEndTime;
  }
  await interview.save();

  // ── 1.5) حساب المدرس — مستقل عن الرسالة، idempotent ──
  const payroll = await runInterviewPayroll(interview, completedBy);
  const payrollInfo = { processed: !!payroll?.fullyProcessed };

  // ── 2) اتبعتت قبل كده ومفيش resend → نكتفي بالحفظ ──
  if (alreadySent && !options.resend) {
    return {
      success: true,
      saved: true,
      messageSent: false,
      alreadySent: true,
      reason: "already_sent",
      payroll: payrollInfo,
    };
  }

  // ── 3) بناء الرسالة + تحديد المستلم ──
  const built = await buildInterviewEvaluationMessage({
    student,
    interview: interview.toObject(),
    decision,
    comment: instructorComment,
    interviewNumber,
    rawContent: options.rawContent || null,
  });

  const base = {
    success: true,
    saved: true,
    messageSent: false,
    isAdult: built.isAdult,
    recipientType: built.recipientType,
    templateType: built.templateType,
    payroll: payrollInfo,
  };

  if (!built.recipientPhone) {
    return {
      ...base,
      reason: built.isAdult ? "no_student_phone" : "no_guardian_phone",
    };
  }
  if (!canSendToStudent(student)) {
    return { ...base, reason: "whatsapp_disabled" };
  }

  // ── 3.5) Single-send: claim ذري قبل الإرسال عشان طلبين متزامنين مايبعتوش رسالتين ──
  let claimed = false;
  if (!options.resend) {
    const won = await Interview.findOneAndUpdate(
      { _id: interviewId, "automationEvents.evaluationSent": { $ne: true } },
      {
        $set: {
          "automationEvents.evaluationSent": true,
          "automationEvents.evaluationSentAt": new Date(),
        },
      },
    );
    if (!won) {
      return { ...base, alreadySent: true, reason: "already_sent" };
    }
    claimed = true;
  }

  const releaseClaim = async () => {
    if (!claimed) return;
    try {
      await Interview.updateOne(
        { _id: interviewId },
        { $set: { "automationEvents.evaluationSent": false } },
      );
    } catch (e) {
      console.error("⚠️ Could not release evaluation claim:", e.message);
    }
  };

  // ── 4) الإرسال (نفس instance التقييمات) ──
  let sendResult = null;
  try {
    sendResult = await wapilotService.sendAndLogEvalMessage({
      studentId: student._id,
      phoneNumber: built.recipientPhone,
      messageContent: built.rendered,
      messageType: built.templateType,
      language: built.lang,
      metadata: {
        interviewId: interview._id,
        recipientType: built.recipientType,
        isAdult: built.isAdult,
        decision,
        isFallback: built.isFallback,
      },
    });
  } catch (err) {
    console.error("❌ [Interview Evaluation] send error:", err.message);
    await releaseClaim();
    return { ...base, reason: "send_failed", error: err.message };
  }

  const messageSent = !!sendResult?.success;

  if (!messageSent) {
    await releaseClaim();
  } else if (!claimed) {
    // حالة resend صريح: نعلّم الـ flag بعد النجاح
    await Interview.findByIdAndUpdate(interviewId, {
      $set: {
        "automationEvents.evaluationSent": true,
        "automationEvents.evaluationSentAt": new Date(),
      },
    });
  }

  return {
    ...base,
    messageSent,
    reason: messageSent ? null : "send_failed",
    results: { [built.recipientType]: sendResult },
  };
}