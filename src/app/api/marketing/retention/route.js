import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import StudentEvaluation from "../../../models/StudentEvaluation";
import Student from "../../../models/Student";
import Group from "../../../models/Group";
import Session from "../../../models/Session";

export async function GET(req) {
  try {
    console.log("📊 [Marketing Retention API] Request received");

    // التحقق من المستخدم
    const user = await getUserFromRequest(req);

    if (!user || (user.role !== "marketing" && user.role !== "admin")) {
      return NextResponse.json(
        {
          success: false,
          message: "غير مصرح بالوصول",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get("timeframe") || "month";
    const groupId = searchParams.get("groupId");
    const riskLevel = searchParams.get("riskLevel");

    // بناء الاستعلام
    const query = {
      isDeleted: false,
      "metadata.evaluatedAt": getDateFilter(timeframe),
    };

    if (groupId) {
      query.groupId = groupId;
    }

    if (riskLevel) {
      query["marketing.studentCategory"] = riskLevel;
    }

    // جلب الطلاب المعرضين للخطر
    const atRiskStudents = await getAtRiskStudents(query);

    // جلب إحصائيات الاحتفاظ
    const retentionStats = await getRetentionStats(timeframe);

    // جلب مجموعات بها مشاكل
    const problematicGroups = await getProblematicGroups(timeframe);

    const response = {
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
        },
        timeframe,
        filters: {
          groupId,
          riskLevel,
        },
        atRiskStudents,
        retentionStats,
        problematicGroups,
        summary: {
          totalAtRisk: atRiskStudents.length,
          highRiskCount: atRiskStudents.filter((s) => s.riskLevel === "high")
            .length,
          mediumRiskCount: atRiskStudents.filter(
            (s) => s.riskLevel === "medium"
          ).length,
          retentionRate: retentionStats.retentionRate,
          dropRate: retentionStats.dropRate,
        },
      },
    };

    console.log(
      `✅ [Marketing Retention] Returned ${atRiskStudents.length} at-risk students`
    );
    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ [Marketing Retention API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في تحميل بيانات الاحتفاظ",
        error: error.message,
        code: "RETENTION_ERROR",
      },
      { status: 500 }
    );
  }
}

// Helper: Get at-risk students
async function getAtRiskStudents(query) {
  const evaluations = await StudentEvaluation.find(query)
    .populate(
      "studentId",
      "personalInfo.fullName personalInfo.whatsappNumber personalInfo.email enrollmentNumber"
    )
    .populate("groupId", "name code courseId")
    .populate({
      path: "groupId",
      populate: {
        path: "courseId",
        select: "title level",
      },
    })
    .lean();

  const atRiskStudents = await Promise.all(
    evaluations.map(async (evaluation) => {
      const student = evaluation.studentId;
      const group = evaluation.groupId;
      const course = group.courseId;

      // حساب مستوى الخطورة
      const riskScore = calculateRiskScore(evaluation);
      const riskLevel = getRiskLevel(riskScore);
      const riskReasons = getRiskReasons(evaluation, student, group);

      // جلب بيانات الحضور
      const attendanceData = await getAttendanceData(student._id, group._id);

      return {
        studentId: student._id,
        studentName: student.personalInfo?.fullName,
        whatsappNumber: student.personalInfo?.whatsappNumber,
        email: student.personalInfo?.email,
        enrollmentNumber: student.enrollmentNumber,
        groupId: group._id,
        groupName: group.name,
        groupCode: group.code,
        courseId: course?._id,
        courseName: course?.title,
        evaluationId: evaluation._id,
        finalDecision: evaluation.finalDecision,
        studentCategory: evaluation.marketing?.studentCategory,
        overallScore: evaluation.calculatedStats?.overallScore,
        attendancePercentage: attendanceData.attendancePercentage,
        completedSessions: attendanceData.completedSessions,
        totalSessions: attendanceData.totalSessions,
        lastSessionDate: attendanceData.lastSessionDate,
        daysSinceLastSession: attendanceData.daysSinceLastSession,
        riskScore,
        riskLevel,
        riskReasons,
        weakPoints: evaluation.weakPoints || [],
        strengths: evaluation.strengths || [],
        aiAnalysis: evaluation.marketing?.aiAnalysis,
        suggestedActions: getSuggestedActions(
          riskLevel,
          evaluation,
          attendanceData
        ),
        nextSteps: evaluation.marketing?.nextSteps || [],
      };
    })
  );

  // ترتيب حسب مستوى الخطورة
  return atRiskStudents.sort((a, b) => b.riskScore - a.riskScore);
}

// Helper: Calculate risk score
function calculateRiskScore(evaluation) {
  let score = 0;

  // عامل: القرار النهائي
  const decisionScores = {
    pass: 10,
    review: 60,
    repeat: 80,
  };
  score += decisionScores[evaluation.finalDecision] || 50;

  // عامل: النتيجة العامة
  if (evaluation.calculatedStats?.overallScore <= 2.5) score += 30;
  else if (evaluation.calculatedStats?.overallScore <= 3.5) score += 15;

  // عامل: نقاط الضعف
  const weakPointCount = evaluation.weakPoints?.length || 0;
  score += weakPointCount * 10;

  // عامل: فئة الطالب
  const categoryScores = {
    star_student: 10,
    ready_for_next_level: 20,
    needs_support: 50,
    needs_repeat: 70,
    at_risk: 90,
  };
  score += categoryScores[evaluation.marketing?.studentCategory] || 50;

  return Math.min(score, 100);
}

// Helper: Get risk level
function getRiskLevel(score) {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
}

// Helper: Get risk reasons
function getRiskReasons(evaluation, student, group) {
  const reasons = [];

  if (evaluation.finalDecision === "repeat") {
    reasons.push("محتاج إعادة الكورس");
  }

  if (evaluation.finalDecision === "review") {
    reasons.push("يحتاج مراجعة وتدعيم");
  }

  if (evaluation.calculatedStats?.overallScore <= 2.5) {
    reasons.push("نتيجة ضعيفة جداً");
  }

  if (evaluation.weakPoints?.length >= 3) {
    reasons.push("نقاط ضعف متعددة");
  }

  if (evaluation.marketing?.studentCategory === "at_risk") {
    reasons.push("مصنف كطالب معرض للخطر");
  }

  if (evaluation.marketing?.studentCategory === "needs_repeat") {
    reasons.push("يحتاج إعادة");
  }

  return reasons;
}

// Helper: Get attendance data
async function getAttendanceData(studentId, groupId) {
  try {
    const sessions = await Session.find({
      groupId,
      isDeleted: false,
      status: "completed",
    }).lean();

    const attendanceRecords = sessions.flatMap(
      (session) =>
        session.attendance?.filter(
          (att) => att.studentId.toString() === studentId.toString()
        ) || []
    );

    const presentCount = attendanceRecords.filter(
      (att) => att.status === "present"
    ).length;
    const totalSessions = sessions.length;
    const attendancePercentage =
      totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

    // آخر سيشن
    const lastSession = sessions.sort(
      (a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate)
    )[0];

    return {
      attendancePercentage,
      completedSessions: presentCount,
      totalSessions,
      lastSessionDate: lastSession?.scheduledDate,
      daysSinceLastSession: lastSession
        ? Math.floor(
            (new Date() - new Date(lastSession.scheduledDate)) /
              (1000 * 60 * 60 * 24)
          )
        : null,
    };
  } catch (error) {
    console.error("❌ Error getting attendance data:", error);
    return {
      attendancePercentage: 0,
      completedSessions: 0,
      totalSessions: 0,
      lastSessionDate: null,
      daysSinceLastSession: null,
    };
  }
}

// Helper: Get suggested actions
function getSuggestedActions(riskLevel, evaluation, attendanceData) {
  const actions = [];

  if (riskLevel === "high") {
    actions.push({
      action: "مكالمة هاتفية فورية",
      priority: "urgent",
      reason: "طالب معرض للخروج من البرنامج",
    });

    actions.push({
      action: "عرض دعم مكثف",
      priority: "high",
      reason: "يحتاج تدخل سريع",
    });
  }

  if (attendanceData.attendancePercentage < 70) {
    actions.push({
      action: "رسالة تحفيزية للحضور",
      priority: "medium",
      reason: `نسبة الحضور ${attendanceData.attendancePercentage}%`,
    });
  }

  if (evaluation.finalDecision === "review") {
    actions.push({
      action: "جلسات دعم مجانية",
      priority: "medium",
      reason: "يحتاج مراجعة المواد",
    });
  }

  if (evaluation.finalDecision === "repeat") {
    actions.push({
      action: "عرض إعادة الكورس بخصم",
      priority: "high",
      reason: "محاولة الاحتفاظ بالطالب",
    });
  }

  if (evaluation.weakPoints?.includes("understanding")) {
    actions.push({
      action: "جلسة شرح إضافية",
      priority: "medium",
      reason: "ضعف في الفهم النظري",
    });
  }

  if (evaluation.weakPoints?.includes("practice")) {
    actions.push({
      action: "تمارين إضافية",
      priority: "medium",
      reason: "حاجة للممارسة العملية",
    });
  }

  // إضافة إجراء افتراضي
  if (actions.length === 0) {
    actions.push({
      action: "متابعة دورية",
      priority: "low",
      reason: "متابعة الأداء",
    });
  }

  return actions;
}

// Helper: Get retention statistics
async function getRetentionStats(timeframe) {
  const dateFilter = getDateFilter(timeframe);

  const stats = await StudentEvaluation.aggregate([
    {
      $match: {
        "metadata.evaluatedAt": dateFilter,
        isDeleted: false,
      },
    },
    {
      $lookup: {
        from: "students",
        localField: "studentId",
        foreignField: "_id",
        as: "student",
      },
    },
    {
      $unwind: "$student",
    },
    {
      $group: {
        _id: {
          month: { $month: "$metadata.evaluatedAt" },
          decision: "$finalDecision",
        },
        count: { $sum: 1 },
        students: { $addToSet: "$studentId" },
      },
    },
  ]);

  const totalEvaluations = stats.reduce((sum, stat) => sum + stat.count, 0);
  const totalStudents = new Set(stats.flatMap((stat) => stat.students)).size;

  const decisions = {
    pass: stats.find((s) => s._id.decision === "pass")?.count || 0,
    review: stats.find((s) => s._id.decision === "review")?.count || 0,
    repeat: stats.find((s) => s._id.decision === "repeat")?.count || 0,
  };

  const retentionRate =
    totalEvaluations > 0
      ? parseFloat(
          (
            ((decisions.pass + decisions.review) / totalEvaluations) *
            100
          ).toFixed(2)
        )
      : 0;

  const dropRate =
    totalEvaluations > 0
      ? parseFloat(((decisions.repeat / totalEvaluations) * 100).toFixed(2))
      : 0;

  return {
    totalEvaluations,
    totalStudents,
    decisions,
    retentionRate,
    dropRate,
    completionRate: parseFloat((100 - dropRate).toFixed(2)),
  };
}

// Helper: Get problematic groups
async function getProblematicGroups(timeframe) {
  const dateFilter = getDateFilter(timeframe);

  const groups = await StudentEvaluation.aggregate([
    {
      $match: {
        "metadata.evaluatedAt": dateFilter,
        isDeleted: false,
        finalDecision: { $in: ["review", "repeat"] },
      },
    },
    {
      $group: {
        _id: "$groupId",
        totalStudents: { $sum: 1 },
        reviewCount: {
          $sum: { $cond: [{ $eq: ["$finalDecision", "review"] }, 1, 0] },
        },
        repeatCount: {
          $sum: { $cond: [{ $eq: ["$finalDecision", "repeat"] }, 1, 0] },
        },
        avgScore: { $avg: "$calculatedStats.overallScore" },
        students: {
          $push: {
            studentId: "$studentId",
            decision: "$finalDecision",
            score: "$calculatedStats.overallScore",
          },
        },
      },
    },
    {
      $lookup: {
        from: "groups",
        localField: "_id",
        foreignField: "_id",
        as: "group",
      },
    },
    {
      $unwind: "$group",
    },
    {
      $project: {
        groupId: "$_id",
        groupName: "$group.name",
        groupCode: "$group.code",
        totalStudents: 1,
        reviewCount: 1,
        repeatCount: 1,
        problemRate: {
          $multiply: [
            {
              $divide: [
                { $add: ["$reviewCount", "$repeatCount"] },
                "$totalStudents",
              ],
            },
            100,
          ],
        },
        avgScore: { $round: ["$avgScore", 2] },
        students: { $slice: ["$students", 5] },
      },
    },
    {
      $match: {
        problemRate: { $gte: 30 }, // مجموعات بها 30% مشاكل أو أكثر
      },
    },
    {
      $sort: { problemRate: -1 },
    },
    {
      $limit: 10,
    },
  ]);

  return groups;
}

// Helper function for date filtering
function getDateFilter(timeframe) {
  const now = new Date();
  let startDate;

  switch (timeframe) {
    case "day":
      startDate = new Date(now.setDate(now.getDate() - 1));
      break;
    case "week":
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case "month":
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case "quarter":
      startDate = new Date(now.setMonth(now.getMonth() - 3));
      break;
    case "year":
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      startDate = new Date(now.setMonth(now.getMonth() - 1));
  }

  return { $gte: startDate };
}
