// /src/app/services/messageRouting.js
// ═══════════════════════════════════════════════════════════════════════════
// ✅ تحديد الـ Template + الـ Recipient في مكان واحد
//    الأساس: event (attendance | evaluation | interview_evaluation)
//            + student type (Minor → Parent | Adult → Student)
// ═══════════════════════════════════════════════════════════════════════════

const MAP = {
  attendance: {
    absent: { kid: "absence_notification", adult: "absence_notification_adult" },
    late: { kid: "late_notification", adult: "late_notification_adult" },
    excused: { kid: "excused_notification", adult: "excused_notification_adult" },
  },
  evaluation: {
    pass: { kid: "evaluation_pass", adult: "evaluation_pass_adult" },
    review: { kid: "evaluation_review", adult: "evaluation_review_adult" },
    repeat: { kid: "evaluation_repeat", adult: "evaluation_repeat_adult" },
  },
  interview_evaluation: {
    kid: "interview_evaluation_guardian",
    adult: "interview_evaluation_adult",
  },
};

export function isAdultStudent(student) {
  return student?.studentType === "adults";
}

export function routeMessage({ event, status = null, student }) {
  const isAdult = isAdultStudent(student);
  const entry = event === "interview_evaluation" ? MAP[event] : MAP[event]?.[status];
  const src = isAdult ? student?.personalInfo : student?.guardianInfo;

  return {
    isAdult,
    templateType: entry?.[isAdult ? "adult" : "kid"] || null,
    recipientType: isAdult ? "student" : "guardian",
    recipientPhone: String(src?.whatsappNumber || src?.phone || "").trim(),
  };
}