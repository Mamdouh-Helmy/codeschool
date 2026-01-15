// app/api/instructor-dashboard/groups/[id]/evaluations/settings/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Group from "../../../../../../models/Group";
import Student from "../../../../../../models/Student";
import StudentEvaluation from "../../../../../../models/StudentEvaluation";

export async function PATCH(req, { params }) {
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
      isDeleted: false
    });

    if (!group) {
      return NextResponse.json(
        { success: false, message: "المجموعة غير موجودة" },
        { status: 404 }
      );
    }

    // التحقق من أن المجموعة مكتملة
    if (group.status !== "completed") {
      return NextResponse.json(
        { 
          success: false, 
          message: "لا يمكن تفعيل التقييمات إلا بعد اكتمال المجموعة" 
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { action } = body;

    let updateData = {};
    let message = "";

    switch (action) {
      case "enable":
        if (group.metadata?.evaluationsEnabled) {
          return NextResponse.json(
            { success: false, message: "التقييمات مفعلة بالفعل" },
            { status: 400 }
          );
        }
        updateData = {
          "metadata.evaluationsEnabled": true,
          "metadata.evaluationsEnabledAt": new Date(),
          "metadata.evaluationsEnabledBy": user.id
        };
        message = "تم تفعيل نظام التقييمات للمجموعة";
        break;

      case "disable":
        if (!group.metadata?.evaluationsEnabled) {
          return NextResponse.json(
            { success: false, message: "التقييمات غير مفعلة بالفعل" },
            { status: 400 }
          );
        }
        updateData = {
          "metadata.evaluationsEnabled": false,
          "metadata.evaluationsEnabledAt": null,
          "metadata.evaluationsEnabledBy": null
        };
        message = "تم تعطيل نظام التقييمات للمجموعة";
        break;

      case "mark_completed":
        if (group.metadata?.evaluationsCompleted) {
          return NextResponse.json(
            { success: false, message: "التقييمات مكتملة بالفعل" },
            { status: 400 }
          );
        }

        // التحقق من أن جميع الطلاب تم تقييمهم
        const totalStudents = await Student.countDocuments({
          "academicInfo.groupIds": group._id,
          isDeleted: false
        });

        const evaluatedCount = await StudentEvaluation.countDocuments({
          groupId: group._id,
          isDeleted: false
        });

        if (evaluatedCount < totalStudents) {
          return NextResponse.json(
            { 
              success: false, 
              message: `لم يتم تقييم جميع الطلاب. تم تقييم ${evaluatedCount} من ${totalStudents} طالب` 
            },
            { status: 400 }
          );
        }

        updateData = {
          "metadata.evaluationsCompleted": true,
          "metadata.evaluationsCompletedAt": new Date(),
          "metadata.evaluationsCompletedBy": user.id
        };
        message = "تم إتمام تقييم جميع طلاب المجموعة";
        break;

      default:
        return NextResponse.json(
          { success: false, message: "إجراء غير صالح" },
          { status: 400 }
        );
    }

    const updatedGroup = await Group.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message,
      data: {
        evaluationStatus: {
          enabled: updatedGroup.metadata?.evaluationsEnabled,
          enabledAt: updatedGroup.metadata?.evaluationsEnabledAt,
          completed: updatedGroup.metadata?.evaluationsCompleted,
          completedAt: updatedGroup.metadata?.evaluationsCompletedAt
        }
      }
    });

  } catch (error) {
    console.error("❌ [Evaluation Settings API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في تحديث إعدادات التقييم",
        error: error.message
      },
      { status: 500 }
    );
  }
}

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
      isDeleted: false
    }).lean();

    if (!group) {
      return NextResponse.json(
        { success: false, message: "المجموعة غير موجودة" },
        { status: 404 }
      );
    }

    // جلب إحصائيات التقييمات
    const stats = {
      evaluationStatus: {
        enabled: group.metadata?.evaluationsEnabled || false,
        enabledAt: group.metadata?.evaluationsEnabledAt,
        completed: group.metadata?.evaluationsCompleted || false,
        completedAt: group.metadata?.evaluationsCompletedAt
      },
      summary: group.metadata?.evaluationSummary || {
        totalStudents: 0,
        evaluatedStudents: 0,
        pendingStudents: 0,
        passCount: 0,
        reviewCount: 0,
        repeatCount: 0,
        averageOverallScore: 0
      }
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error("❌ [Evaluation Settings GET API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في جلب إعدادات التقييم",
        error: error.message
      },
      { status: 500 }
    );
  }
}