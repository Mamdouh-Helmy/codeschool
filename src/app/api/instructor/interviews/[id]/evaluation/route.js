// src/app/api/instructor/interviews/[id]/evaluation/route.js
// ═══════════════════════════════════════════════════════════════════════════
// تقييم المقابلة — بنفس طريقة تقييم السيشن العادية بالظبط.
// مفيش تسجيل حضور للمقابلات: المدرس بيروح للتقييم على طول.
//   - طفل (kids)    → قوالب ولي الأمر  evaluation_pass | review | repeat
//   - بالغ (adults) → قوالب البالغ     evaluation_*_adult  (للطالب نفسه)
//   - نفس متغيرات الداتا بيز + النجوم (ratings) + تعليق المدرس
//   - لينك التسجيل (Online فقط، اختياري):
//       طفل  → session_recording        → ولي الأمر
//       بالغ → session_recording_adult  → الطالب
//   - Offline → مفيش تسجيل، التقييم بس
// ═══════════════════════════════════════════════════════════════════════════
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Interview from "../../../../../models/Interview";
import Student from "../../../../../models/Student";
import MessageTemplate from "../../../../../models/MessageTemplate";
import TemplateVariable from "../../../../../models/TemplateVariable";
import {
  buildInterviewEvaluationMessage,
  sendInterviewEvaluation,
  normalizeRatings,
  VALID_INTERVIEW_DECISIONS,
} from "../../../../../services/interviewAutomation";

const json = (body, status = 200) => NextResponse.json(body, { status });

const STUDENT_SELECT =
  "personalInfo guardianInfo communicationPreferences enrollmentNumber studentType";

async function parseBody(req) {
  const text = await req.text();
  return text?.trim() ? JSON.parse(text) : {};
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function isValidHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * ✅ تحميل المقابلة + التأكد من الصلاحيات.
 * بيرجع { user, interview } أو { error: NextResponse }
 */
async function loadAuthorizedInterview(req, id) {
  const user = await getUserFromRequest(req);
  if (!user) return { error: json({ success: false, message: "غير مصرح بالوصول" }, 401) };
  if (user.role !== "instructor" && user.role !== "admin") {
    return { error: json({ success: false, message: "هذه الصفحة للمدرسين فقط", code: "FORBIDDEN" }, 403) };
  }

  if (!mongoose.isValidObjectId(id)) {
    return { error: json({ success: false, message: "معرّف المقابلة غير صالح" }, 400) };
  }

  await connectDB();

  const interview = await Interview.findById(id).lean();
  if (!interview) return { error: json({ success: false, message: "المقابلة غير موجودة" }, 404) };

  if (user.role !== "admin" && String(interview.instructorId) !== String(user.id)) {
    return { error: json({ success: false, message: "دي مش مقابلتك", code: "FORBIDDEN_INTERVIEW" }, 403) };
  }

  return { user, interview };
}

/** المقابلة الملغية/المؤجلة مينفعش تتقيّم، والمقابلة لسه معادها ماجاش برضو (لغير الأدمن) */
function checkEvaluable(user, interview) {
  if (interview.status === "cancelled" || interview.status === "postponed") {
    return json(
      { success: false, message: "المقابلة دي ملغية أو مؤجلة — مينفعش تتقيّم", code: "INTERVIEW_NOT_ACTIVE" },
      400,
    );
  }
  if (user.role !== "admin" && new Date(interview.scheduledDate) > endOfToday()) {
    return json(
      { success: false, message: "معاد المقابلة لسه ماجاش", code: "INTERVIEW_NOT_YET" },
      400,
    );
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// RECORDING MESSAGE (طفل → ولي الأمر | بالغ → الطالب)
// ═══════════════════════════════════════════════════════════════════════════

function resolveVar(v, lang, { isMale, isFather }) {
  if (!v) return null;
  const isAr = lang === "ar";
  if (v.hasGender) {
    if (v.genderType === "student" || v.genderType === "instructor") {
      return isAr
        ? (isMale ? v.valueMaleAr : v.valueFemaleAr) || v.valueAr || null
        : (isMale ? v.valueMaleEn : v.valueFemaleEn) || v.valueEn || null;
    }
    if (v.genderType === "guardian") {
      return isAr
        ? (isFather ? v.valueFatherAr : v.valueMotherAr) || v.valueAr || null
        : (isFather ? v.valueFatherEn : v.valueMotherEn) || v.valueEn || null;
    }
  }
  return isAr ? v.valueAr || null : v.valueEn || null;
}

function renderTemplate(template, variables) {
  let out = template || "";
  Object.entries(variables).forEach(([key, value]) => {
    out = out.replace(new RegExp(`\\{${key}\\}`, "g"), () => String(value ?? ""));
  });
  return out;
}

async function buildRecordingMessage(student, interview, recordingLink) {
  const lang = student.communicationPreferences?.preferredLanguage || "ar";
  const isAr = lang === "ar";
  const isAdult = student.studentType === "adults";

  const gender = String(student.personalInfo?.gender || "male").toLowerCase();
  const relationship = String(student.guardianInfo?.relationship || "father").toLowerCase();
  const ctxFlags = { isMale: gender !== "female", isFather: relationship !== "mother" };

  const list = await TemplateVariable.find({ isActive: true }).lean();
  const dbVars = Object.fromEntries(list.map((v) => [v.key, v]));

  const studentFirstName = isAr
    ? student.personalInfo?.nickname?.ar?.trim() || student.personalInfo?.fullName?.split(" ")[0] || "الطالب"
    : student.personalInfo?.nickname?.en?.trim() || student.personalInfo?.fullName?.split(" ")[0] || "Student";

  const templateType = isAdult ? "session_recording_adult" : "session_recording";
  const recipientType = isAdult ? "student" : "guardian";

  const result = await MessageTemplate.getOrFallback(templateType, lang, recipientType);

  let vars;
  if (isAdult) {
    // ✅ التحية من المتغير المحفوظ studentSalutation
    const salFromDb = resolveVar(dbVars.studentSalutation, lang, ctxFlags);
    let studentSalutation;
    if (salFromDb) {
      studentSalutation = /\{(studentName|name)\}/.test(salFromDb)
        ? salFromDb.replace(/\{(studentName|name)\}/g, studentFirstName)
        : `${salFromDb} ${studentFirstName}`;
    } else {
      const base =
        resolveVar(dbVars[isAr ? "salutation_ar" : "salutation_en"], lang, ctxFlags) ||
        (isAr ? (ctxFlags.isMale ? "عزيزي الطالب" : "عزيزتي الطالبة") : "Dear");
      studentSalutation = `${base} ${studentFirstName}`;
    }

    vars = {
      studentSalutation,
      studentName: studentFirstName,
      sessionName: interview.title || "",
      recordingLink: recordingLink.trim(),
    };
  } else {
    const guardianFirstName = isAr
      ? student.guardianInfo?.nickname?.ar?.trim() || student.guardianInfo?.name?.split(" ")[0] || "ولي الأمر"
      : student.guardianInfo?.nickname?.en?.trim() || student.guardianInfo?.name?.split(" ")[0] || "Guardian";

    const salFromDb = resolveVar(dbVars.guardianSalutation, lang, ctxFlags);
    const guardianSalutation = salFromDb
      ? salFromDb.replace(/\{guardianName\}/g, guardianFirstName)
      : isAr
        ? `${ctxFlags.isFather ? "عزيزي الأستاذ" : "عزيزتي السيدة"} ${guardianFirstName}`
        : `${ctxFlags.isFather ? "Dear Mr." : "Dear Mrs."} ${guardianFirstName}`;

    const childTitle =
      resolveVar(dbVars.childTitle, lang, ctxFlags) ||
      (isAr ? (ctxFlags.isMale ? "ابنك" : "ابنتك") : ctxFlags.isMale ? "your son" : "your daughter");

    vars = {
      guardianSalutation,
      guardianName: guardianFirstName,
      studentName: studentFirstName,
      childTitle,
      sessionName: interview.title || "",
      recordingLink: recordingLink.trim(),
    };
  }

  const recipientPhone = isAdult
    ? student.personalInfo?.whatsappNumber || student.personalInfo?.phone || ""
    : student.guardianInfo?.whatsappNumber || student.guardianInfo?.phone || "";

  return {
    rendered: renderTemplate(result.content, vars),
    lang,
    isFallback: result.isFallback,
    isAdult,
    templateType,
    recipientType,
    recipientPhone,
  };
}

/**
 * ✅ يبعت لينك التسجيل بعد التقييم (Online فقط).
 * بيرجّع { sent, skipReason }
 */
async function sendRecordingLink({ interview, student, recordingLink, resend }) {
  const link = recordingLink.trim();

  // نفس اللينك اتبعت قبل كده → مانكررش إلا لو resend صريح
  if (
    !resend &&
    interview.automationEvents?.recordingSent &&
    interview.automationEvents?.recordingSentLink === link
  ) {
    return { sent: false, skipReason: "already_sent" };
  }

  const built = await buildRecordingMessage(student, interview, link);

  if (!built.recipientPhone) {
    return { sent: false, skipReason: built.isAdult ? "no_student_phone" : "no_guardian_phone" };
  }
  if (!built.rendered?.trim()) {
    return { sent: false, skipReason: "empty_template" };
  }

  const { wapilotService } = await import("../../../../../services/wapilot-service");
  const res = await wapilotService.sendAndLogMessage({
    studentId: student._id,
    phoneNumber: built.recipientPhone,
    messageContent: built.rendered,
    messageType: built.templateType, // session_recording | session_recording_adult
    language: built.lang,
    metadata: {
      interviewId: interview._id,
      sessionTitle: interview.title,
      recipientType: built.recipientType,
      isAdult: built.isAdult,
      isFallback: built.isFallback,
      automationType: "interview_recording",
    },
  });

  if (!res?.success) {
    return { sent: false, skipReason: res?.error || "send_failed" };
  }

  await Interview.updateOne(
    { _id: interview._id },
    {
      $set: {
        "automationEvents.recordingSent": true,
        "automationEvents.recordingSentAt": new Date(),
        "automationEvents.recordingSentLink": link,
      },
    },
  );

  return { sent: true, skipReason: null };
}

// ─── GET: بيانات التقييم (من غير حضور) ────────────────────────────────────
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const { user, interview, error } = await loadAuthorizedInterview(req, id);
    if (error) return error;

    const student = await Student.findById(interview.studentId).select(STUDENT_SELECT).lean();
    if (!student) return json({ success: false, message: "الطالب غير موجود" }, 404);

    const isAdult = student.studentType === "adults";
    const isOffline = interview.deliveryMode === "offline";
    const evaluable = !checkEvaluable(user, interview);

    return json({
      success: true,
      data: {
        interview: {
          _id: interview._id,
          title: interview.title,
          status: interview.status,
          scheduledDate: interview.scheduledDate,
          startTime: interview.startTime,
          endTime: interview.endTime,
          actualStartTime: interview.actualStartTime || "",
          actualEndTime: interview.actualEndTime || "",
          deliveryMode: interview.deliveryMode,
          isOffline,
          // ✅ الأوفلاين مفيهوش تسجيل
          recordingLink: isOffline ? "" : interview.recordingLink || "",
        },
        student: {
          _id: student._id,
          name: student.personalInfo?.fullName || "بدون اسم",
          enrollmentNumber: student.enrollmentNumber || "",
          studentType: student.studentType || "kids",
          isAdult,
          preferredLanguage: student.communicationPreferences?.preferredLanguage || "ar",
          recipientType: isAdult ? "student" : "guardian",
          recipientName: isAdult ? "" : student.guardianInfo?.name || "",
          hasRecipientPhone: isAdult
            ? !!(student.personalInfo?.whatsappNumber || student.personalInfo?.phone)
            : !!(student.guardianInfo?.whatsappNumber || student.guardianInfo?.phone),
        },
        attendanceRequired: false,
        canEvaluate: evaluable,
        // ✅ فيها decision + instructorComment + ratings
        evaluation: interview.evaluation || null,
        evaluationSent: !!interview.automationEvents?.evaluationSent,
        recordingSent: !!interview.automationEvents?.recordingSent,
        payrollProcessed: !!interview.payroll?.processed,
      },
    });
  } catch (error) {
    console.error("❌ [Interview Evaluation GET]:", error);
    return json({ success: false, error: error.message }, 500);
  }
}

// ─── POST: معاينة رسالة التقييم (من غير حفظ ولا إرسال) ────────────────────
export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const { user, interview, error } = await loadAuthorizedInterview(req, id);
    if (error) return error;

    const notEvaluable = checkEvaluable(user, interview);
    if (notEvaluable) return notEvaluable;

    let body;
    try {
      body = await parseBody(req);
    } catch {
      return json({ success: false, error: "Invalid JSON" }, 400);
    }

    const { decision, customContent, comment, instructorComment, ratings, recordingLink } = body;
    if (!decision || !VALID_INTERVIEW_DECISIONS.includes(decision)) {
      return json({ success: false, error: "decision is required (pass | review | repeat)" }, 400);
    }

    const student = await Student.findById(interview.studentId).select(STUDENT_SELECT).lean();
    if (!student) return json({ success: false, error: "Student not found" }, 404);

    const built = await buildInterviewEvaluationMessage({
      student,
      interview,
      decision,
      comment: instructorComment ?? comment ?? "",
      interviewNumber: interview.evaluation?.interviewNumber || 1,
      ratings: normalizeRatings(ratings || interview.evaluation?.ratings || {}),
      rawContent: customContent || null,
    });

    return json({
      success: true,
      data: {
        content: built.rendered,
        lang: built.lang,
        isFallback: built.isFallback,
        templateType: built.templateType,
        isAdult: built.isAdult,
        recipientType: built.recipientType,
        recipientPhone: built.recipientPhone,
        guardianName: built.isAdult ? "" : student.guardianInfo?.name || "",
        studentName: student.personalInfo?.fullName || "",
      },
    });
  } catch (error) {
    console.error("❌ [Interview Evaluation POST]:", error);
    return json({ success: false, error: error.message }, 500);
  }
}

// ─── PATCH: احفظ التقييم + احسب المدرس + ابعت الرسالة (+ التسجيل لو Online) ─
export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const { user, interview, error } = await loadAuthorizedInterview(req, id);
    if (error) return error;

    const notEvaluable = checkEvaluable(user, interview);
    if (notEvaluable) return notEvaluable;

    let body;
    try {
      body = await parseBody(req);
    } catch {
      return json({ success: false, error: "Invalid JSON" }, 400);
    }

    const {
      decision,
      instructorComment,
      comment,
      notes,
      ratings,
      customContent,
      resend,
      actualStartTime,
      actualEndTime,
      recordingLink,
    } = body;
    if (!decision || !VALID_INTERVIEW_DECISIONS.includes(decision)) {
      return json({ success: false, error: "decision is required (pass | review | repeat)" }, 400);
    }

    const isOffline = interview.deliveryMode === "offline";

    // ✅ لينك التسجيل: Online فقط، ولازم يكون URL صالح
    let cleanRecordingLink = "";
    if (!isOffline && typeof recordingLink === "string" && recordingLink.trim()) {
      cleanRecordingLink = recordingLink.trim();
      if (!isValidHttpUrl(cleanRecordingLink)) {
        return json({ success: false, error: "لينك التسجيل مش صالح — لازم يبدأ بـ http:// أو https://" }, 400);
      }
    }

    const result = await sendInterviewEvaluation(
      id,
      {
        decision,
        instructorComment: instructorComment ?? comment ?? notes ?? "",
        ratings: normalizeRatings(ratings || {}),
        completedBy: user.id,
        actualStartTime: actualStartTime || null,
        actualEndTime: actualEndTime || null,
      },
      { rawContent: customContent || null, resend: resend === true },
    );

    if (!result.success) {
      return json({ success: false, error: result.error || "Failed to save evaluation" }, 400);
    }

    // ── لينك التسجيل (Online فقط) — بيتبعت بعد نجاح التقييم ──
    let recordingLinkSent = false;
    let recordingSkipReason = null;

    // اللينك بيتحفظ دايمًا (حتى لو اتمسح) — والرسالة منفصلة عن التقييم
    if (!isOffline && typeof recordingLink === "string") {
      try {
        await Interview.updateOne({ _id: id }, { $set: { recordingLink: cleanRecordingLink } });
      } catch (saveErr) {
        console.error("❌ [Interview Recording Save]:", saveErr);
      }
    }

    if (!isOffline && cleanRecordingLink) {
      try {
        const student = await Student.findById(interview.studentId).select(STUDENT_SELECT).lean();
        if (!student) {
          recordingSkipReason = "student_not_found";
        } else {
          // نقرا نسخة حديثة من المقابلة عشان automationEvents تبقى محدّثة
          const fresh = await Interview.findById(id).lean();
          const rec = await sendRecordingLink({
            interview: fresh || interview,
            student,
            recordingLink: cleanRecordingLink,
            resend: resend === true,
          });
          recordingLinkSent = rec.sent;
          recordingSkipReason = rec.skipReason;
        }
      } catch (recErr) {
        console.error("❌ [Interview Recording]:", recErr);
        recordingSkipReason = recErr.message;
      }
    }

    return json({
      success: true,
      message: "تم حفظ تقييم المقابلة بنجاح",
      data: {
        interviewId: id,
        decision,
        saved: !!result.saved,
        messageSent: !!result.messageSent,
        alreadySent: !!result.alreadySent,
        recipientType: result.recipientType || null,
        templateType: result.templateType || null,
        isAdult: !!result.isAdult,
        skipReason: result.messageSent ? null : result.reason || null,
        recordingLinkSent,
        recordingSkipReason,
        payroll: result.payroll || null,
      },
    });
  } catch (error) {
    console.error("❌ [Interview Evaluation PATCH]:", error);
    return json({ success: false, error: error.message }, 500);
  }
}