// /src/app/services/makeupAutomation.js
import Group from "../models/Group";
import Student from "../models/Student";
import Session from "../models/Session";
import User from "../models/User";
import MessageTemplate from "../models/MessageTemplate";
import WhatsAppTemplateInstructor from "../models/WhatsAppTemplateInstructor";
import { wapilotService } from "./wapilot-service";
import {
  activateGroupSessionsCore,
  prepareStudentVariables,
  prepareInstructorVariables,
  replaceVariables,
} from "./groupAutomation";

// ═══════════════════════════════════════════════════════════════════════════
// 🎁 MAKE-UP SESSION — Automation
// ═══════════════════════════════════════════════════════════════════════════
//
// ⚙️ الفكرة:
//   - الملف ده مسؤول عن الحصة التعويضية فقط.
//   - بيعتمد على activateGroupSessionsCore لتوليد السيشن وحجز اللينك.
//   - المتغيرات اللي بتتبعت للقوالب بتتبني في buildMakeupVariables() — مكان واحد
//     واضح، عشان تقدر تعدّل/تضيف براحتك من غير ما تلمس منطق الإرسال.
//   - القوالب بتتقرا من الداتا بيس فقط (مفيش fallback في الكود).
//
// 📌 المتغيرات المتاحة في القوالب (راجع buildMakeupVariables):
//
//   للطالب:
//     {studentSalutation} {studentName}
//     {courseName} {groupName} {groupCode}
//     {originalDate} {originalTime} {originalSessionTitle}
//     {newDate} {newTime} {newSessionTitle}
//     {meetingLink} {instructorName}
//     {sessionLocationBlock} {placeName} {address} {mapsLink}
//
//   لولي الأمر: زي الطالب + {guardianSalutation} {guardianName} {childTitle}
//
//   للمدرس:
//     {instructorSalutation} {instructorName} {studentName}
//     {courseName} {groupName} {groupCode}
//     {originalDate} {originalTime} {originalSessionTitle}
//     {newDate} {newTime}
//     {sessionLocationBlock} {placeName} {address} {mapsLink}
//
// لو محتاج متغير جديد، ضيفه في buildMakeupVariables() بس — مش في أي مكان تاني.
// ═══════════════════════════════════════════════════════════════════════════

const MAKEUP_TEMPLATE_TYPES = {
  student:    { online: "makeup_session_student",     offline: "makeup_session_student_offline" },
  guardian:   { online: "makeup_session_guardian",    offline: "makeup_session_guardian_offline" },
  instructor: { online: "makeup_session_instructor",  offline: "makeup_session_instructor_offline" },
};

const EMPTY_LOCATION = { placeName: "", address: "", mapsLink: "" };

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatLongDate(date, lang) {
  if (!date) return "";
  return new Date(date).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function formatTimeRange(session) {
  return session ? `${session.startTime} - ${session.endTime}` : "";
}

function getMakeupLocation(group) {
  const loc = group.locationDetails || {};
  return {
    placeName: loc.placeName || group.location || "",
    address: loc.address || loc.extraDetails || "",
    mapsLink: buildMapsLink(group),
  };
}

function buildMapsLink(group) {
  const loc = group?.locationDetails || {};
  if (loc.lat != null && loc.lng != null) {
    return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
  }
  if (loc.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`;
  }
  if (loc.placeName || group?.location) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.placeName || group.location)}`;
  }
  return "";
}

function buildSessionLocationBlock({ isOffline, meetingLink, location, lang }) {
  const ar = lang === "ar";
  if (!isOffline) {
    return meetingLink ? `🔗 ${ar ? "رابط الحصة" : "Meeting Link"}: ${meetingLink}` : "";
  }
  return [
    location.placeName && `📍 ${ar ? "المكان" : "Location"}: ${location.placeName}`,
    location.address   && `📌 ${ar ? "العنوان" : "Address"}: ${location.address}`,
    location.mapsLink  && `🗺️ ${ar ? "اللوكيشن" : "Maps"}: ${location.mapsLink}`,
  ].filter(Boolean).join("\n");
}

async function resolveMakeupSession(groupId, generatedSessions) {
  const saved = await Session.findOne({ groupId, isDeleted: false })
    .sort({ scheduledDate: 1 }).lean();
  return saved || generatedSessions[0] || null;
}

async function findMakeupInstructor(group) {
  const entry = group.instructors?.[0];
  const id = entry?.userId?._id || entry?.userId;
  if (!id) return null;
  return User.findById(id).select("name email gender language profile").lean();
}

// ─── 🎯 بناء المتغيرات (مكان واحد — عدّل هنا بس) ─────────────────────────
//
// ملاحظة مهمة: salutations بتاعة الطالب/ولي الأمر/المدرس بتتبني من
// prepareStudentVariables / prepareInstructorVariables لأنها بتسحب قيمها من
// TemplateVariable في الداتا بيس (مع قواعد الجنس/صلة القرابة). بعد كده
// بنضيف متغيرات الحصة التعويضية الخاصة فوقهم.
//
// لو لقيت متغير في قالبك مش موجود هنا، ضيفه هنا.
// ─────────────────────────────────────────────────────────────────────────

async function buildMakeupVariables({
  group,
  newSession,
  originalSession,
  student,
  instructor,
  lang,
  isOffline,
}) {
  const location = isOffline ? getMakeupLocation(group) : EMPTY_LOCATION;

  // ── Salutations + الأسماء (من TemplateVariable DB) ─────────────
  const studentPrep = await prepareStudentVariables(
    student,
    group,
    newSession,
    { isOffline, ...location },
  );
  const sv = studentPrep.variables;

  let instructorSalutation = "";
  let instructorFirstName = "";
  if (instructor) {
    const instructorPrep = await prepareInstructorVariables(
      instructor,
      group,
      newSession,
    );
    instructorSalutation = instructorPrep.variables.instructorSalutation || "";
    instructorFirstName = instructorPrep.variables.instructorName || "";
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ✅ Fix: نقرا {studentSalutation} و {guardianSalutation} مباشرة من
  //    TemplateVariable DB بدل ما نبنيهم من salutation_ar + الاسم
  // ═══════════════════════════════════════════════════════════════════════
    // ═══════════════════════════════════════════════════════════════════════
  // ✅ Fix: نقرا {studentSalutation} و {guardianSalutation} مباشرة من
  //    TemplateVariable DB، ونضيف اسم الطالب/ولي الأمر بعد التحية
  // ═══════════════════════════════════════════════════════════════════════
  const TemplateVariable = (await import("../models/TemplateVariable")).default;

  const studentGender = (student.personalInfo?.gender || "male")
    .toLowerCase()
    .trim();
  const guardianRelation = (student.guardianInfo?.relationship || "father")
    .toLowerCase()
    .trim();

  const varsMap = await TemplateVariable.getVarsMap(lang, {
    studentGender,
    guardianType: guardianRelation,
    instructorGender: instructor?.gender || "male",
  });

  // القيم الأساسية من DB (زي: "السلام عليكم")
  const studentSalutationBase = (varsMap["{studentSalutation}"] || "").trim();
  const guardianSalutationBase = (varsMap["{guardianSalutation}"] || "").trim();

  // الاسم اللي هنضيفه بعد التحية
  const studentNameForSalutation = sv.studentName || "";
  const guardianNameForSalutation = sv.guardianName || "";

  // ✅ التحية النهائية = القيمة من DB + الاسم
  const studentSalutationFromDB = studentSalutationBase
    ? `${studentSalutationBase} ${studentNameForSalutation}`.trim()
    : "";
  const guardianSalutationFromDB = guardianSalutationBase
    ? `${guardianSalutationBase} ${guardianNameForSalutation}`.trim()
    : "";

  // ── القاموس النهائي ────────────────────────────────────────────
  return {
    // Student — ✅ من DB مباشرة، ولو مش موجودة نرجع للقيمة المحسوبة
    studentSalutation:
      studentSalutationFromDB || sv.studentSalutation || sv.salutation_ar || "",
    studentName: sv.studentName || "",

    // Guardian — ✅ نفس المنطق
    guardianSalutation:
      guardianSalutationFromDB || sv.guardianSalutation || "",
    guardianName: sv.guardianName || "",
    childTitle: sv.childTitle || "",

    // Instructor
    instructorSalutation,
    instructorName: instructorFirstName || instructor?.name?.split(" ")[0] || "",

    // Group / Course — ✅ مفيش groupCode خالص في القاموس
    groupName: group.name || "",
    courseName: group.courseSnapshot?.title || group.courseId?.title || "",

    // Original session
    originalDate: formatLongDate(originalSession?.scheduledDate, lang),
    originalTime: formatTimeRange(originalSession),
    originalSessionTitle: originalSession?.title || "",

    // New (make-up) session
    newDate: formatLongDate(newSession.scheduledDate, lang),
    newTime: formatTimeRange(newSession),
    newSessionTitle: newSession.title || "",

    // Location / Meeting link
    meetingLink: isOffline ? "" : newSession.meetingLink || "",
    placeName: isOffline ? location.placeName : "",
    address: isOffline ? location.address : "",
    mapsLink: isOffline ? location.mapsLink : "",
    sessionLocationBlock: buildSessionLocationBlock({
      isOffline,
      meetingLink: newSession.meetingLink,
      location,
      lang,
    }),
  };
}

// ─── Template loading & rendering ──────────────────────────────────────────

/**
 * بيجيب القالب من الداتا بيس (مفيش fallback في الكود):
 *   - role = "instructor" → WhatsAppTemplateInstructor (وبعدين MessageTemplate)
 *   - role = "student" / "guardian" → MessageTemplate
 *   - isActive: true، والأولوية للـ default، وبعده الأحدث
 *   - لو محتوى اللغة فاضي بنستخدم اللغة التانية من نفس القالب
 */
async function loadMakeupTemplate(templateType, role, lang) {
  // قوالب المدرس
  if (role === "instructor") {
    try {
      const doc = await WhatsAppTemplateInstructor.findOne({
        templateType,
        isActive: true,
      })
        .sort({ isDefault: -1, updatedAt: -1 })
        .lean();

      if (doc) {
        const [preferred, other] =
          lang === "ar"
            ? [doc.contentAr, doc.contentEn]
            : [doc.contentEn, doc.contentAr];
        const content = preferred?.trim() ? preferred : other;
        if (content?.trim()) return { id: doc._id, content };
      }
    } catch (err) {
      console.warn(`⚠️ [Make-up] WhatsAppTemplateInstructor read failed:`, err.message);
    }
  }

  // student / guardian (وممكن instructor كـ fallback)
  const tpl = await MessageTemplate.findOne({
    templateType,
    recipientType: role,
    isActive: true,
  })
    .sort({ isDefault: -1, updatedAt: -1 })
    .lean();

  if (!tpl) return null;

  const [preferred, other] =
    lang === "ar"
      ? [tpl.contentAr, tpl.contentEn]
      : [tpl.contentEn, tpl.contentAr];
  const content = preferred?.trim() ? preferred : other;

  return content?.trim() ? { id: tpl._id, content } : null;
}

async function renderMakeupTemplate({ templateType, role, lang, variables }) {
  const template = await loadMakeupTemplate(templateType, role, lang);
  if (!template) return null;

  // ✅ نشيل {groupCode} من المحتوى — عشان الاسم بس هو اللي يظهر، مش الكود
  let content = template.content.replace(/\{groupCode\}/g, "");

  let text = replaceVariables(content, variables).trim();

  // ✅ نضّف الأقواس الفاضية اللي بتنتج من شيل الـ groupCode
  text = text
    .replace(/\(\s*\)/g, "")   // ()
    .replace(/\[\s*\]/g, "")   // []
    .replace(/[ \t]{2,}/g, " ") // مسافات متكررة
    .trim();

  const unresolved = text.match(/\{\w+\}/g);
  if (unresolved) {
    console.warn(
      `⚠️ [Make-up] Unresolved placeholders in ${templateType} [${lang}]:`,
      [...new Set(unresolved)].join(", "),
    );
  }
  return { text, templateId: template.id };
}

// ─── Sending ──────────────────────────────────────────────────────────────

async function sendMakeupMessage(ctx, { role, phone, lang, vars }) {
  if (!phone) return { sent: false, error: "no_phone" };

  const { group, student, instructor, newSession, originalSessionId, isOffline } = ctx;
  const messageType = MAKEUP_TEMPLATE_TYPES[role][isOffline ? "offline" : "online"];

  try {
    const rendered = await renderMakeupTemplate({
      templateType: messageType,
      role,
      lang,
      variables: vars,
    });

    if (!rendered) {
      console.error(
        `❌ [Make-up] Template "${messageType}" (${role}) missing/empty in DB`,
      );
      return { sent: false, error: `template_missing:${messageType}` };
    }

    const payload = {
      phoneNumber: phone,
      messageContent: rendered.text,
      messageType,
      language: lang,
      metadata: {
        groupId: group._id,
        groupName: group.name,
        sessionId: newSession._id,
        originalSessionId,
        templateId: rendered.templateId,
        recipientType: role,
        automationType: "makeup_session",
        isOffline,
      },
    };

    const result =
      role === "instructor"
        ? await wapilotService.sendAndLogUserMessage({ userId: instructor._id, ...payload })
        : await wapilotService.sendAndLogMessage({ studentId: student._id, ...payload });

    return result?.success
      ? { sent: true, error: null, templateId: rendered.templateId }
      : { sent: false, error: result?.error || "send_failed" };
  } catch (err) {
    console.error(`❌ [Make-up] ${role} message failed:`, err.message);
    return { sent: false, error: err.message };
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────

/**
 * 🎁 الدالة الرئيسية للحصة التعويضية:
 *   1. توليد السيشن + حجز اللينك (activateGroupSessionsCore)
 *   2. بناء المتغيرات وقراءة القوالب من DB
 *   3. إرسال 3 رسائل (طالب / ولي أمر / مدرس) — Online أو Offline
 */
export async function sendMakeupGroupNotifications(group, generatedSessions = []) {
  const { studentId, originalSessionId } = group.makeupInfo || {};
  if (!studentId) {
    return { success: false, reason: "no_student", results: {} };
  }

  const newSession = await resolveMakeupSession(group._id, generatedSessions);
  if (!newSession) {
    return { success: false, reason: "no_session", results: {} };
  }

  const [student, originalSession, instructor] = await Promise.all([
    Student.findById(studentId).lean(),
    originalSessionId
      ? Session.findById(originalSessionId)
          .select("title scheduledDate startTime endTime")
          .lean()
      : null,
    findMakeupInstructor(group),
  ]);

  if (!student) {
    return { success: false, reason: "student_not_found", results: {} };
  }

  const isOffline =
    group.deliveryMode === "offline" || newSession.deliveryMode === "offline";

  console.log(
    `\n🎁 [Make-up] ${group.name} (${isOffline ? "OFFLINE" : "ONLINE"}) → ${newSession.title}`,
  );

  // لغات المستلمين
  const studentLang = student.communicationPreferences?.preferredLanguage || "ar";
  const instructorLang = instructor?.language || "ar";

  // متغيرات الطالب/ولي الأمر — بنبنيها مرة واحدة (نفس اللغة عادةً)
  const learnerVars = await buildMakeupVariables({
    group,
    newSession,
    originalSession,
    student,
    instructor,
    lang: studentLang,
    isOffline,
  });

  // متغيرات المدرس — لو لغته مختلفة، بنبنيها بلغته
  let instructorVars = {};
  if (instructor) {
    if (instructorLang === studentLang) {
      instructorVars = learnerVars; // نفس اللغة → نفس المتغيرات
    } else {
      instructorVars = await buildMakeupVariables({
        group,
        newSession,
        originalSession,
        student,
        instructor,
        lang: instructorLang,
        isOffline,
      });
    }
  }

  const ctx = {
    group,
    student,
    instructor,
    newSession,
    originalSessionId,
    isOffline,
  };

  const recipients = [
    {
      role: "student",
      phone: student.personalInfo?.whatsappNumber,
      lang: studentLang,
      vars: learnerVars,
    },
    {
      role: "guardian",
      phone: student.guardianInfo?.whatsappNumber || student.guardianInfo?.phone,
      lang: studentLang,
      vars: learnerVars,
    },
    {
      role: "instructor",
      phone: instructor?.profile?.phone?.trim(),
      lang: instructorLang,
      vars: instructorVars,
    },
  ];

  const results = {};
  for (const recipient of recipients) {
    results[recipient.role] = await sendMakeupMessage(ctx, recipient);
    const { sent, error, templateId } = results[recipient.role];
    console.log(
      `   ${recipient.role.padEnd(10)} ${sent ? `✅ sent (template ${templateId})` : `❌ ${error}`}`,
    );
  }

  return {
    success: Object.values(results).some((r) => r.sent),
    isOffline,
    results,
  };
}

/**
 * 🎯 الدالة اللي الـ route بينادي عليها للحصة التعويضية.
 *    - بتولّد السيشن + تحجز اللينك (نفس core الجروبات العادية)
 *    - بعدين تبعت الـ 3 رسائل
 */
export async function onMakeupGroupActivated(groupId, userId, selectedLinkIds = []) {
  console.log(`\n🎁 [Make-up] Activating makeup group: ${groupId}`);

  const { group, sessionsResult } = await activateGroupSessionsCore(
    groupId,
    userId,
    selectedLinkIds,
  );

  let makeupNotifications;
  try {
    makeupNotifications = await sendMakeupGroupNotifications(
      group,
      sessionsResult.sessions || [],
    );
  } catch (err) {
    console.error(`⚠️ [Make-up] notifications failed:`, err.message);
    makeupNotifications = {
      success: false,
      reason: "exception",
      error: err.message,
      results: {},
    };
  }

  return {
    success: true,
    sessionsGenerated: sessionsResult.totalGenerated,
    groupCode: group.code,
    groupName: group.name,
    distribution: sessionsResult.distribution,
    startDate: sessionsResult.startDate,
    endDate: sessionsResult.endDate,
    makeupNotifications,
  };
}