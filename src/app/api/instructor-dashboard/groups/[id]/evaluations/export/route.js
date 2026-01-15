// app/api/instructor-dashboard/groups/[id]/evaluations/export/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Group from "../../../../../../models/Group";
import Student from "../../../../../../models/Student";
import StudentEvaluation from "../../../../../../models/StudentEvaluation";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    // التحقق من المستخدم
    const user = await getUserFromRequest(req);
    if (!user || (user.role !== "instructor" && user.role !== "admin")) {
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 401 }
      );
    }

    await connectDB();

    // التحقق من المجموعة
    const group = await Group.findOne({
      _id: id,
      instructors: user.id,
      isDeleted: false,
    }).lean();

    if (!group) {
      return NextResponse.json(
        { success: false, message: "المجموعة غير موجودة" },
        { status: 404 }
      );
    }

    // جلب جميع التقييمات
    const evaluations = await StudentEvaluation.find({
      groupId: id,
      isDeleted: false,
    })
      .populate(
        "studentId",
        "personalInfo.fullName enrollmentNumber personalInfo.email"
      )
      .populate("instructorId", "name email")
      .sort({ "metadata.evaluatedAt": 1 })
      .lean();

    // تنسيق البيانات للتصدير
    const exportData = {
      group: {
        name: group.name,
        code: group.code,
        status: group.status,
      },
      exportDate: new Date().toISOString(),
      evaluations: evaluations.map((eval) => ({
        student: {
          name: eval.studentId?.personalInfo?.fullName || "غير معروف",
          enrollmentNumber: eval.studentId?.enrollmentNumber,
          email: eval.studentId?.personalInfo?.email,
        },
        evaluation: {
          criteria: {
            understanding: eval.criteria.understanding,
            commitment: eval.criteria.commitment,
            attendance: eval.criteria.attendance,
            participation: eval.criteria.participation,
          },
          finalDecision: getDecisionArabic(eval.finalDecision),
          finalDecisionCode: eval.finalDecision,
          overallScore: eval.calculatedStats?.overallScore || 0,
          notes: eval.notes || "",
        },
        evaluator: {
          name: eval.instructorId?.name || "غير معروف",
          email: eval.instructorId?.email,
        },
        evaluatedAt: eval.metadata.evaluatedAt,
      })),
      summary: {
        totalEvaluations: evaluations.length,
        decisions: {
          pass: evaluations.filter((e) => e.finalDecision === "pass").length,
          review: evaluations.filter((e) => e.finalDecision === "review")
            .length,
          repeat: evaluations.filter((e) => e.finalDecision === "repeat")
            .length,
        },
        averageScores: {
          understanding: parseFloat(
            (
              evaluations.reduce(
                (sum, e) => sum + e.criteria.understanding,
                0
              ) / evaluations.length
            ).toFixed(2)
          ),
          commitment: parseFloat(
            (
              evaluations.reduce((sum, e) => sum + e.criteria.commitment, 0) /
              evaluations.length
            ).toFixed(2)
          ),
          attendance: parseFloat(
            (
              evaluations.reduce((sum, e) => sum + e.criteria.attendance, 0) /
              evaluations.length
            ).toFixed(2)
          ),
          participation: parseFloat(
            (
              evaluations.reduce(
                (sum, e) => sum + e.criteria.participation,
                0
              ) / evaluations.length
            ).toFixed(2)
          ),
          overall: parseFloat(
            (
              evaluations.reduce(
                (sum, e) => sum + (e.calculatedStats?.overallScore || 0),
                0
              ) / evaluations.length
            ).toFixed(2)
          ),
        },
      },
    };

    // إنشاء CSV content
    const csvContent = generateCSV(exportData);

    // إنشاء JSON content
    const jsonContent = JSON.stringify(exportData, null, 2);

    return NextResponse.json({
      success: true,
      data: {
        csv: csvContent,
        json: jsonContent,
        stats: exportData.summary,
      },
    });
  } catch (error) {
    console.error("❌ [Export Evaluations API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في تصدير التقييمات",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

function getDecisionArabic(decision) {
  const decisions = {
    pass: "ناجح",
    review: "قيد المراجعة",
    repeat: "يعيد",
  };
  return decisions[decision] || decision;
}

function generateCSV(data) {
  let csv =
    "الطالب,رقم القيد,البريد الإلكتروني,مستوى الفهم,الالتزام,الحضور,المشاركة,المعدل العام,القرار النهائي,ملاحظات,تم التقييم في,المقيِّم\n";

  data.evaluations.forEach((eval) => {
    const row = [
      `"${eval.student.name}"`,
      eval.student.enrollmentNumber || "",
      eval.student.email || "",
      eval.evaluation.criteria.understanding,
      eval.evaluation.criteria.commitment,
      eval.evaluation.criteria.attendance,
      eval.evaluation.criteria.participation,
      eval.evaluation.overallScore,
      eval.evaluation.finalDecision,
      `"${eval.evaluation.notes.replace(/"/g, '""')}"`,
      new Date(eval.evaluatedAt).toLocaleString("ar-EG"),
      `"${eval.evaluator.name}"`,
    ];

    csv += row.join(",") + "\n";
  });

  return csv;
}
