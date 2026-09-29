// /app/api/student/report/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Student from "../../../models/Student";
import StudentEvaluation from "../../../models/StudentEvaluation";

const WEAK_LABELS = {
  understanding: { en: "Understanding", ar: "الفهم" },
  practice:      { en: "Practice",      ar: "الممارسة" },
  attendance:    { en: "Attendance",    ar: "الحضور" },
  participation: { en: "Participation", ar: "المشاركة" },
  homework:      { en: "Homework",      ar: "الواجبات" },
  projects:      { en: "Projects",      ar: "المشاريع" },
};

const STRENGTH_LABELS = {
  fast_learner:   { en: "Fast Learner",   ar: "سريع التعلم" },
  hard_worker:    { en: "Hard Worker",    ar: "مجتهد" },
  team_player:    { en: "Team Player",    ar: "متعاون" },
  creative:       { en: "Creative",       ar: "مبدع" },
  problem_solver: { en: "Problem Solver", ar: "حلّال مشاكل" },
  consistent:     { en: "Consistent",     ar: "منتظم" },
};

const DECISION_LABELS = {
  pass:   { en: "Pass",   ar: "ناجح" },
  review: { en: "Review", ar: "مراجعة" },
  repeat: { en: "Repeat", ar: "إعادة" },
};

// ✅ المعدل بيتحسب من المعايير مباشرة (مش من calculatedStats اللي ممكن تبقى 0)
const computeOverall = (c = {}) => {
  const vals = [c.understanding, c.commitment, c.attendance, c.participation]
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);
  if (vals.length === 0) return 0;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
};

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غير مصرح بالوصول", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    await connectDB();

    const student = await Student.findOne({ authUserId: user.id })
      .select("_id personalInfo.fullName")
      .lean();

    if (!student) {
      return NextResponse.json({
        success: true,
        data: { studentName: "", summary: null, evaluations: [] },
      });
    }

    const rawEvaluations = await StudentEvaluation.find({
      studentId: student._id,
      isDeleted: false,
    })
      // ✅ الـ match بيخلي الـ populate يرجّع null لو السيشن/الجروب محذوف
      .populate({
        path: "sessionId",
        match: { isDeleted: false },
        select: "title scheduledDate moduleIndex sessionNumber startTime endTime",
      })
      .populate({
        path: "groupId",
        match: { isDeleted: false },
        select: "name code",
      })
      .populate({ path: "instructorId", select: "name email" })
      .sort({ "metadata.evaluatedAt": -1 })
      .lean();

    // ✅ نستبعد أي تقييم السيشن أو الجروب بتاعه اتمسح
    const evaluations = rawEvaluations.filter((e) => e.sessionId && e.groupId);

    const totals = {
      count: evaluations.length,
      sumOverall: 0,
      sumUnderstanding: 0,
      sumCommitment: 0,
      sumAttendance: 0,
      sumParticipation: 0,
      pass: 0,
      review: 0,
      repeat: 0,
    };

    const weakPointsCount = {};
    const strengthsCount = {};

    evaluations.forEach((e) => {
      totals.sumOverall += computeOverall(e.criteria);
      totals.sumUnderstanding += e.criteria?.understanding || 0;
      totals.sumCommitment += e.criteria?.commitment || 0;
      totals.sumAttendance += e.criteria?.attendance || 0;
      totals.sumParticipation += e.criteria?.participation || 0;

      if (e.finalDecision === "pass") totals.pass++;
      else if (e.finalDecision === "review") totals.review++;
      else if (e.finalDecision === "repeat") totals.repeat++;

      (e.weakPoints || []).forEach((wp) => {
        weakPointsCount[wp] = (weakPointsCount[wp] || 0) + 1;
      });
      (e.strengths || []).forEach((st) => {
        strengthsCount[st] = (strengthsCount[st] || 0) + 1;
      });
    });

    const avg = (sum) =>
      totals.count > 0 ? Math.round((sum / totals.count) * 10) / 10 : 0;

    const averages = {
      overall: avg(totals.sumOverall),
      understanding: avg(totals.sumUnderstanding),
      commitment: avg(totals.sumCommitment),
      attendance: avg(totals.sumAttendance),
      participation: avg(totals.sumParticipation),
    };

    const topWeakPoints = Object.entries(weakPointsCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => ({
        key,
        count,
        label: WEAK_LABELS[key] || { en: key, ar: key },
      }));

    const topStrengths = Object.entries(strengthsCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => ({
        key,
        count,
        label: STRENGTH_LABELS[key] || { en: key, ar: key },
      }));

    const formatted = evaluations.map((e) => ({
      _id: e._id,
      groupName: e.groupId?.name || "",
      groupCode: e.groupId?.code || "",
      sessionTitle: e.sessionId?.title || "",
      sessionNumber: e.sessionId?.sessionNumber || null,
      moduleIndex: e.sessionId?.moduleIndex ?? null,
      sessionDate: e.sessionId?.scheduledDate || null,
      startTime: e.sessionId?.startTime || null,
      endTime: e.sessionId?.endTime || null,
      instructorName: e.instructorId?.name || "",
      criteria: {
        understanding: e.criteria?.understanding ?? 0,
        commitment: e.criteria?.commitment ?? 0,
        attendance: e.criteria?.attendance ?? 0,
        participation: e.criteria?.participation ?? 0,
      },
      finalDecision: e.finalDecision,
      finalDecisionLabel: DECISION_LABELS[e.finalDecision] || { en: e.finalDecision, ar: e.finalDecision },
      notes: e.notes || "",
      weakPoints: (e.weakPoints || []).map((wp) => ({
        key: wp,
        label: WEAK_LABELS[wp] || { en: wp, ar: wp },
      })),
      strengths: (e.strengths || []).map((st) => ({
        key: st,
        label: STRENGTH_LABELS[st] || { en: st, ar: st },
      })),
      overallScore: computeOverall(e.criteria),
      evaluatedAt: e.metadata?.evaluatedAt || e.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        studentName: student.personalInfo?.fullName || user.name || "",
        summary: {
          totalEvaluations: totals.count,
          passCount: totals.pass,
          reviewCount: totals.review,
          repeatCount: totals.repeat,
          averages,
          topWeakPoints,
          topStrengths,
        },
        evaluations: formatted,
      },
    });
  } catch (error) {
    console.error("❌ [Student Report]", error);
    return NextResponse.json(
      { success: false, message: "فشل في تحميل التقرير", error: error.message },
      { status: 500 }
    );
  }
}