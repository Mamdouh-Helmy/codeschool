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
    // function replacer — عشان لو القيمة فيها $& أو $1 (مثلاً في تعليق المدرس) ما تتفسرش
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

// ✅ نفس صيغة التاريخ القصير بتاعة تقرير السيشن (dd/mm/yyyy)
function formatShortDate(date, lang = "ar") {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString(
      lang === "ar" ? "ar-EG" : "en-US",
      { day: "2-digit", month: "2-digit", year: "numeric" },
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
        pass: isMale ? "ممتاز" : "ممتازة",
        review: "يحتاج مراجعة",
        repeat: "يحتاج دعم إضافي",
      }[decision] || ""
    );
  }
  return (
    {
      pass: "Excellent",
      review: "Needs Review",
      repeat: "Needs Support",
    }[decision] || ""
  );
}

// ✅ نجوم — نفس buildStars بتاعة السيشن
function buildStars(score) {
  const n = Math.min(5, Math.max(1, Math.round(Number(score) || 3)));
  return "⭐".repeat(n);
}

// ✅ تنضيف التقييمات (1..5، الافتراضي 3)
export function normalizeRatings(r = {}) {
  const clamp = (v) => {
    const n = Math.round(Number(v));
    if (!Number.isFinite(n)) return 3;
    return Math.min(5, Math.max(1, n));
  };
  return {
    commitment: clamp(r?.commitment ?? 3),
    understanding: clamp(r?.understanding ?? 3),
    taskExecution: clamp(r?.taskExecution ?? 3),
    participation: clamp(r?.participation ?? 3),
  };
}

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
  const studentNameFor = (l) =>
    l === "ar"
      ? student?.personalInfo?.nickname?.ar?.trim() ||
        student?.personalInfo?.fullName?.split(" ")[0] ||
        "الطالب"
      : student?.personalInfo?.nickname?.en?.trim() ||
        student?.personalInfo?.fullName?.split(" ")[0] ||
        "Student";

  const guardianNameFor = (l) =>
    l === "ar"
      ? student?.guardianInfo?.nickname?.ar?.trim() ||
        student?.guardianInfo?.name?.split(" ")[0] ||
        "ولي الأمر"
      : student?.guardianInfo?.nickname?.en?.trim() ||
        student?.guardianInfo?.name?.split(" ")[0] ||
        "Guardian";

  const studentFirstName = studentNameFor(lang);
  const guardianFirstName = guardianNameFor(lang);

  // ── {salutation_ar} / {salutation_en}: للقوالب القديمة (تذكيرات الطفل...)
  //    سيبناها زي ما هي عشان مايتكسرش حاجة ──
  const salutationBase_ar =
    resolveVar(dbVars, "salutation_ar", "ar", genderCtx) ||
    (isMale ? "عزيزي الطالب" : "عزيزتي الطالبة");
  const salutationBase_en =
    resolveVar(dbVars, "salutation_en", "en", genderCtx) || "Dear";

  const salutation_ar = `${salutationBase_ar} ${studentNameFor("ar")}`;
  const salutation_en = `${salutationBase_en} ${studentNameFor("en")}`;

  // ── {studentSalutation}: بيتقرا من المتغير المحفوظ باسم studentSalutation
  //    - لو القيمة فيها {studentName} → الاسم يتحط مكانها
  //    - لو مفيهاش → الاسم يتلزق في الآخر ──
  const buildStudentSal = (l) => {
    const name = studentNameFor(l);
    const fromDb = resolveVar(dbVars, "studentSalutation", l, genderCtx);

    if (fromDb) {
      return /\{(studentName|name)\}/.test(fromDb)
        ? fromDb.replace(/\{(studentName|name)\}/g, name)
        : `${fromDb} ${name}`;
    }

    // fallback لو المتغير مش موجود في الداتا بيز
    const base =
      resolveVar(dbVars, l === "ar" ? "salutation_ar" : "salutation_en", l, genderCtx) ||
      (l === "ar" ? (isMale ? "عزيزي الطالب" : "عزيزتي الطالبة") : "Dear");
    return `${base} ${name}`;
  };

  const studentSalutation_ar = buildStudentSal("ar");
  const studentSalutation_en = buildStudentSal("en");
  const studentSalutation =
    lang === "ar" ? studentSalutation_ar : studentSalutation_en;

  // ── {guardianSalutation}: من المتغير المحفوظ + استبدال {guardianName} ──
  const buildGuardianSal = (l) => {
    const name = guardianNameFor(l);
    const fromDb = resolveVar(dbVars, "guardianSalutation", l, genderCtx);
    if (fromDb) return fromDb.replace(/\{guardianName\}/g, name);

    return l === "ar"
      ? `${isFather ? "عزيزي الأستاذ" : "عزيزتي السيدة"} ${name}`
      : `${isFather ? "Dear Mr." : "Dear Mrs."} ${name}`;
  };

  const guardianSalutation_ar = buildGuardianSal("ar");
  const guardianSalutation_en = buildGuardianSal("en");

  const guardianSalutation = isAdult
    ? ""
    : lang === "ar"
      ? guardianSalutation_ar
      : guardianSalutation_en;

  // ── Child title ──
  const childTitleAr =
    resolveVar(dbVars, "childTitle", "ar", genderCtx) ||
    (isMale ? "ابنك" : "ابنتك");

  const childTitleEn =
    resolveVar(dbVars, "childTitle", "en", genderCtx) ||
    (isMale ? "your son" : "your daughter");

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
  const ratings = normalizeRatings(interview?.evaluation?.ratings || {});
  const interviewNumber = interview?.evaluation?.interviewNumber || 1;
  const isAr = lang === "ar";

  // المقابلة مفيهاش حضور — التقييم معناه إن الطالب حضر
  const attendanceStatusText = isAr
    ? isMale
      ? "حاضر"
      : "حاضرة"
    : "Present";

  // 🎥 لينك التسجيل بيتبعت في رسالة منفصلة — فهنا فاضي عشان مايتكررش
  const recordingLinkText = "";

  const evaluationDecisionText =
    getDecisionText(evalDecision, lang, isMale) ||
    resolveVar(dbVars, "evaluationDecision", lang, genderCtx) ||
    "";

  const supervisorName =
    resolveVar(dbVars, "supervisorName", lang, genderCtx) ||
    (isAr ? "المشرف الأكاديمي" : "Learning Supervisor");

  return {
    // ── Student ──
    salutation_ar,
    salutation_en,
    studentSalutation,
    studentSalutation_ar,
    studentSalutation_en,
    studentName: studentFirstName,
    studentFullName: student?.personalInfo?.fullName || "",
    enrollmentNumber: student?.enrollmentNumber || "",

    // ── Guardian (فاضية للبالغ) ──
    guardianSalutation,
    guardianSalutation_ar: isAdult ? "" : guardianSalutation_ar,
    guardianSalutation_en: isAdult ? "" : guardianSalutation_en,
    guardianName: isAdult ? "" : guardianFirstName,
    childTitle,
    salutation: isAdult ? studentSalutation : guardianSalutation,

    // ── Instructor ──
    instructorSalutation,
    instructorSalutation_ar,
    instructorSalutation_en,
    instructorName: instructorFirstName,
    instructorFullName: instructor?.name || "",

    // ── Interview ──
    sessionName: interview?.title || "",
    sessionDate: formatShortDate(interview?.scheduledDate, lang),
    sessionNumber: String(interviewNumber),
    date: dateStr,
    time: timeStr,
    meetingLink,
    placeName: isOffline ? loc.placeName || interview?.location || "" : "",
    address: isOffline ? loc.address || loc.extraDetails || "" : "",
    mapsLink: isOffline ? mapsLink : "",

    // ── Evaluation ──
    attendanceStatus: attendanceStatusText,
    starsCommitment: buildStars(ratings.commitment),
    starsUnderstanding: buildStars(ratings.understanding),
    starsTaskExecution: buildStars(ratings.taskExecution),
    starsParticipation: buildStars(ratings.participation),
    instructorComment: interview?.evaluation?.instructorComment?.trim() || "—",
    completedSessions: String(interviewNumber),
    recordingLink: recordingLinkText,
    evaluationDecision: evaluationDecisionText,
    decision: evaluationDecisionText,
    supervisorName,

    // ── خاص بالمقابلة ──
    interviewDate: dateStr,
    interviewNumber: String(interviewNumber),

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

  // ✅ ممنوع التكرار إلا لو resend صريح
  const dedupe = options.resend !== true;

  const vars = await buildInterviewVariables({
    student,
    interview,
    instructor,
    lang,
  });

  const results = { student: null, guardian: null, instructor: null };
  const meta = { interviewId: interview._id, title: interview.title, dedupe };

  // ── Student ──
  const studentPhone = student.personalInfo?.whatsappNumber;
  if (studentPhone && canSendToStudent(student)) {
    const templateType = isAdult
      ? `interview_welcome_adult_${suffix}`
      : `interview_welcome_child_${suffix}`;
    const template = await getTemplate(templateType, lang);
    const content = renderTemplate(template, vars);

    results.student = await wapilotService.sendAndLogMessage({
      studentId: student._id,
      phoneNumber: studentPhone,
      messageContent: content,
      messageType: templateType,
      language: lang,
      metadata: { ...meta, recipientType: "student", isAdult, isOffline },
    });
  }

  // ── Guardian (kids only) ──
  if (!isAdult) {
    const guardianPhone = pickPhone(student.guardianInfo);
    if (guardianPhone) {
      const templateType = `interview_welcome_guardian_${suffix}`;
      const template = await getTemplate(templateType, lang);
      const content = renderTemplate(template, vars);

      results.guardian = await wapilotService.sendAndLogMessage({
        studentId: student._id,
        phoneNumber: guardianPhone,
        messageContent: content,
        messageType: templateType,
        language: lang,
        metadata: { ...meta, recipientType: "guardian", isOffline },
      });
    }
  }

  // ── Instructor ──
  const instructorPhone =
    instructor.profile?.phone?.trim() || instructor.phone?.trim() || "";

  if (instructorPhone) {
    const templateType = `interview_welcome_instructor_${suffix}`;
    const template = await getTemplate(templateType, "ar");
    const content = renderTemplate(template, vars);

    results.instructor = await wapilotService.sendAndLogMessage({
      studentId: student._id,
      phoneNumber: instructorPhone,
      messageContent: content,
      messageType: templateType,
      language: "ar",
      metadata: { ...meta, recipientType: "instructor", isOffline },
    });
  } else {
    console.warn(
      `⚠️ [Interview Welcome] Instructor ${instructor.name} has no phone number — skipping instructor message`,
    );
  }

  // ✅ duplicate = اتبعتت قبل كده → تتحسب نجاح
  const ok = (r) => !!(r?.success || r?.duplicate);
  const anySent = ok(results.student) || ok(results.guardian) || ok(results.instructor);

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

export async function sendInterviewReminder(
  interviewId,
  reminderType,
  options = {},
) {
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

  // ✅ الافتراضي: ممنوع التكرار. لو إرسال يدوي متعمّد مرر { force: true }
  const dedupe = options.force !== true;

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
  let duplicates = 0;
  const results = { student: null, guardian: null, instructor: null };

  const baseMeta = { interviewId: interview._id, reminderType, dedupe };

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
    if (res?.duplicate) duplicates++;
    else if (res?.success) studentsNotified++;
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
      if (res?.duplicate) duplicates++;
      else if (res?.success) guardiansNotified++;
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
    if (res?.duplicate) duplicates++;
    else if (res?.success) instructorsNotified++;
  }

  const newlySent =
    studentsNotified + guardiansNotified + instructorsNotified;
  // ✅ اللي اتبعتله قبل كده يتحسب نجاح (عشان الـ cron مايعملش unlock ويعيد)
  const anySent = newlySent + duplicates > 0;

  // ── Flag update — بس لو فيه رسالة اتبعتت (جديدة أو سابقة) ──
  if (anySent) {
    const flagUpdate = {
      [flagField]: true,
      [`${flagField}At`]: new Date(),
    };

    // الإحصائيات بس لو في رسايل جديدة اتبعتت في الدورة دي
    if (newlySent > 0) {
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
    }

    await Interview.findByIdAndUpdate(interviewId, { $set: flagUpdate });
  }

  return {
    success: anySent,
    studentsNotified,
    guardiansNotified,
    instructorsNotified,
    duplicates,
    results,
  };
}

export async function buildInterviewEvaluationMessage({
  student,
  interview,
  decision,
  comment = "",
  interviewNumber = 1,
  ratings = null,
  rawContent = null,
}) {
  // طفل  → interview_evaluation_guardian (ولي الأمر)
  // بالغ → interview_evaluation_adult   (الطالب)
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
      ratings: normalizeRatings(ratings || interview?.evaluation?.ratings),
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
    // templateType فريد لكل مستلم، فمش محتاجين نفلتر بـ recipientType
    // (ده بيمنع أي اختلاف في الحقل ده في الداتا بيز من إنه يوقعنا في الـ fallback)
    const result = await MessageTemplate.getOrFallback(templateType, lang, null);
    template = result.content;
    isFallback = result.isFallback;

    if (isFallback) {
      console.warn(
        `⚠️ [Interview Eval] fallback used: type=${templateType} lang=${lang} — راجع القالب في الداتا بيز (isDefault / isActive / المحتوى)`,
      );
    }
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
    ratings = null,
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

  const cleanRatings = normalizeRatings(ratings || {});

  // ── 1) حفظ التقييم (من غير أي حضور) ──
  interview.evaluation = {
    decision,
    instructorComment: instructorComment || "",
    ratings: cleanRatings,
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
    ratings: cleanRatings,
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
  if (!built.rendered?.trim()) {
    return { ...base, reason: "empty_template" };
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
      // ✅ evaluation_pass | evaluation_pass_adult ... (نفس السيشن)
      messageType: built.templateType,
      language: built.lang,
      metadata: {
        interviewId: interview._id,
        sessionTitle: interview.title,
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