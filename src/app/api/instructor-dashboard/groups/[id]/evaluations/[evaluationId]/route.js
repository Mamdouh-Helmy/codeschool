// app/api/instructor-dashboard/groups/[id]/evaluations/[evaluationId]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import StudentEvaluation from "../../../../../../models/StudentEvaluation";
import Group from "../../../../../../models/Group";

export async function DELETE(req, { params }) {
  try {
    const { id, evaluationId } = await params;

    // التحقق من المستخدم
    const user = await getUserFromRequest(req);
    if (!user || (user.role !== "instructor" && user.role !== "admin")) {
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 401 }
      );
    }

    await connectDB();

    // التحقق من التقييم
    const evaluation = await StudentEvaluation.findOne({
      _id: evaluationId,
      groupId: id,
      instructorId: user.id,
      isDeleted: false,
    });

    if (!evaluation) {
      return NextResponse.json(
        { success: false, message: "التقييم غير موجود" },
        { status: 404 }
      );
    }

    // حذف ناعم للتقييم
    await evaluation.softDelete(user.id);

    // تحديث إحصائيات المجموعة
    await updateGroupEvaluationStats(id);

    return NextResponse.json({
      success: true,
      message: "تم حذف التقييم بنجاح",
    });
  } catch (error) {
    console.error("❌ [Delete Evaluation API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في حذف التقييم",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(req, { params }) {
  try {
    const { id, evaluationId } = await params;

    // التحقق من المستخدم
    const user = await getUserFromRequest(req);
    if (!user || (user.role !== "instructor" && user.role !== "admin")) {
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 401 }
      );
    }

    await connectDB();

    // جلب التقييم
    const evaluation = await StudentEvaluation.findOne({
      _id: evaluationId,
      groupId: id,
      isDeleted: false,
    })
      .populate(
        "studentId",
        "personalInfo.fullName enrollmentNumber personalInfo.email"
      )
      .lean();

    if (!evaluation) {
      return NextResponse.json(
        { success: false, message: "التقييم غير موجود" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    console.error("❌ [Get Evaluation API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في جلب بيانات التقييم",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

async function updateGroupEvaluationStats(groupId) {
  try {
    const evaluations = await StudentEvaluation.find({
      groupId,
      isDeleted: false,
    });

    const totalStudents = await Student.countDocuments({
      "academicInfo.groupIds": groupId,
      isDeleted: false,
    });

    const stats = {
      totalStudents,
      evaluatedStudents: evaluations.length,
      pendingStudents: totalStudents - evaluations.length,
      passCount: evaluations.filter((e) => e.finalDecision === "pass").length,
      reviewCount: evaluations.filter((e) => e.finalDecision === "review")
        .length,
      repeatCount: evaluations.filter((e) => e.finalDecision === "repeat")
        .length,
      averageOverallScore:
        evaluations.length > 0
          ? parseFloat(
              (
                evaluations.reduce(
                  (sum, e) => sum + e.calculatedStats.overallScore,
                  0
                ) / evaluations.length
              ).toFixed(2)
            )
          : 0,
    };

    await Group.findByIdAndUpdate(groupId, {
      $set: {
        "metadata.evaluationSummary": stats,
        "metadata.evaluationsCompleted": stats.pendingStudents === 0,
      },
    });
  } catch (error) {
    console.error("❌ Error updating group evaluation stats:", error);
  }
}
