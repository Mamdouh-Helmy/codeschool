// src/app/api/instructor/interviews/[id]/evaluation/route.js
// ═══════════════════════════════════════════════════════════════════════════
// تقييم المقابلة — مفيش تسجيل حضور للمقابلات: المدرس بيروح للتقييم على طول.
//   - طفل (kids)    → الرسالة لولي الأمر بقالب interview_evaluation_guardian
//   - بالغ (adults) → الرسالة للطالب نفسه بقالب interview_evaluation_adult
//   - حساب مرتب المدرس بيتم في كل الحالات (من sendInterviewEvaluation)
// ═══════════════════════════════════════════════════════════════════════════
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Interview from "../../../../../models/Interview";
import Student from "../../../../../models/Student";
import {
  buildInterviewEvaluationMessage,
  sendInterviewEvaluation,
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

// ─── GET: بيانات التقييم (من غير حضور) ────────────────────────────────────
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const { user, interview, error } = await loadAuthorizedInterview(req, id);
    if (error) return error;

    const student = await Student.findById(interview.studentId).select(STUDENT_SELECT).lean();
    if (!student) return json({ success: false, message: "الطالب غير موجود" }, 404);

    const isAdult = student.studentType === "adults";
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
          isOffline: interview.deliveryMode === "offline",
        },
        student: {
          _id: student._id,
          name: student.personalInfo?.fullName || "بدون اسم",
          enrollmentNumber: student.enrollmentNumber || "",
          studentType: student.studentType || "kids",
          isAdult,
          preferredLanguage: student.communicationPreferences?.preferredLanguage || "ar",
          // ✅ المستلم الصح حسب نوع الطالب
          recipientType: isAdult ? "student" : "guardian",
          recipientName: isAdult ? "" : student.guardianInfo?.name || "",
          hasRecipientPhone: isAdult
            ? !!(student.personalInfo?.whatsappNumber || student.personalInfo?.phone)
            : !!(student.guardianInfo?.whatsappNumber || student.guardianInfo?.phone),
        },
        attendanceRequired: false, // ✅ المقابلات مفيهاش حضور
        canEvaluate: evaluable,
        evaluation: interview.evaluation || null,
        evaluationSent: !!interview.automationEvents?.evaluationSent,
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

    const { decision, customContent, comment, instructorComment } = body;
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
        recipientType: built.recipientType, // 'student' | 'guardian'
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

// ─── PATCH: احفظ التقييم + احسب المدرس + ابعت الرسالة للمستلم الصح ─────────
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
      customContent,
      resend,
      actualStartTime,
      actualEndTime,
    } = body;
    if (!decision || !VALID_INTERVIEW_DECISIONS.includes(decision)) {
      return json({ success: false, error: "decision is required (pass | review | repeat)" }, 400);
    }

    const result = await sendInterviewEvaluation(
      id,
      {
        decision,
        instructorComment: instructorComment ?? comment ?? notes ?? "",
        completedBy: user.id,
        // ✅ الوقت الفعلي (اختياري) — لو مش مبعوت الـ payroll بيستخدم الوقت المجدول
        actualStartTime: actualStartTime || null,
        actualEndTime: actualEndTime || null,
      },
      { rawContent: customContent || null, resend: resend === true },
    );

    if (!result.success) {
      return json({ success: false, error: result.error || "Failed to save evaluation" }, 400);
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
        recipientType: result.recipientType || null, // 'student' | 'guardian'
        isAdult: !!result.isAdult,
        skipReason: result.messageSent ? null : result.reason || null,
        payroll: result.payroll || null, // { processed }
      },
    });
  } catch (error) {
    console.error("❌ [Interview Evaluation PATCH]:", error);
    return json({ success: false, error: error.message }, 500);
  }
}