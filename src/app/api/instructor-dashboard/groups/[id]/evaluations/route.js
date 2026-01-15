import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Group from "../../../../../models/Group";
import Student from "../../../../../models/Student";
import StudentEvaluation from "../../../../../models/StudentEvaluation";
import Session from "../../../../../models/Session";
import mongoose from "mongoose";

// دالة مساعدة لتحديث حالة المجموعة بناءً على الجلسات
async function updateGroupCompletionStatus(groupId) {
  try {
    console.log(`🔄 [updateGroupCompletionStatus] Checking group ${groupId}...`);
    
    const sessions = await Session.find({
      groupId: groupId,
      isDeleted: false,
    });

    // إذا لم يكن هناك جلسات، لا تفعل شيء
    if (sessions.length === 0) {
      console.log(`⚠️ [updateGroupCompletionStatus] No sessions found for group ${groupId}`);
      return "active";
    }

    const completedSessions = sessions.filter(s => s.status === "completed");
    const allSessionsCompleted = sessions.length === completedSessions.length;

    console.log(`📊 [updateGroupCompletionStatus] Sessions: ${completedSessions.length}/${sessions.length} completed`);

    const group = await Group.findById(groupId);
    
    if (!group) {
      console.error(`❌ [updateGroupCompletionStatus] Group ${groupId} not found`);
      return "error";
    }
    
    if (allSessionsCompleted && group.status !== "completed") {
      console.log(`✅ [updateGroupCompletionStatus] All ${sessions.length} sessions completed for group ${groupId}. Updating status to 'completed'`);
      
      group.status = "completed";
      group.metadata.completedAt = new Date();
      group.metadata.completedBy = group.metadata.createdBy || group.instructors[0];
      
      await group.save();
      
      console.log(`✅ [updateGroupCompletionStatus] Group ${groupId} status updated to 'completed'`);
      return "completed";
    } else if (!allSessionsCompleted && group.status === "completed") {
      // إذا كانت المجموعة مكتملة ولكن ليس كل الجلسات مكتملة
      console.log(`⚠️ [updateGroupCompletionStatus] Group ${groupId} is marked as 'completed' but not all sessions are completed. Reverting to 'active'`);
      
      group.status = "active";
      group.metadata.completedAt = null;
      group.metadata.completedBy = null;
      
      await group.save();
      return "active";
    }
    
    console.log(`📊 [updateGroupCompletionStatus] Group status remains: ${group.status}`);
    return group.status;
  } catch (error) {
    console.error("❌ [updateGroupCompletionStatus] Error:", error);
    throw error;
  }
}

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    console.log(`📥 [Group Evaluations GET] Request for group: ${id}`);

    // التحقق من المستخدم
    const user = await getUserFromRequest(req);
    if (!user || (user.role !== "instructor" && user.role !== "admin")) {
      console.log(`❌ [Group Evaluations GET] Unauthorized access attempt by user: ${user?.id}`);
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
    });

    if (!group) {
      console.log(`❌ [Group Evaluations GET] Group ${id} not found or user not instructor`);
      return NextResponse.json(
        { success: false, message: "المجموعة غير موجودة أو لا تملك صلاحية الوصول" },
        { status: 404 }
      );
    }

    console.log(`📊 [Group Evaluations GET] Current group status: ${group.status}`);

    // ⚠️ تحديث حالة المجموعة بناءً على الجلسات
    const updatedStatus = await updateGroupCompletionStatus(id);
    console.log(`🔄 [Group Evaluations GET] Group status after update: ${updatedStatus}`);

    // إعادة تحميل المجموعة بعد التحديث
    const updatedGroup = await Group.findById(id);
    
    if (!updatedGroup) {
      console.log(`❌ [Group Evaluations GET] Failed to reload group after update`);
      return NextResponse.json(
        { success: false, message: "خطأ في تحميل بيانات المجموعة" },
        { status: 500 }
      );
    }

    // ⚠️ التحقق من أن المجموعة مكتملة (بعد التحديث)
    if (updatedGroup.status !== "completed") {
      console.log(`❌ [Group Evaluations GET] Group not completed: ${updatedGroup.status}`);
      return NextResponse.json(
        {
          success: false,
          message: "لا يمكن تقييم الطلاب إلا بعد اكتمال المجموعة",
          details: `حالة المجموعة: ${updatedGroup.status}. يرجى إكمال جميع الجلسات أولاً.`,
          groupStatus: updatedGroup.status,
          sessionsInfo: await getSessionsInfo(id)
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");
    const decision = searchParams.get("decision");

    console.log(`🔍 [Group Evaluations GET] Filters - page: ${page}, limit: ${limit}, search: ${search}, decision: ${decision}`);

    let studentsQuery = {
      "academicInfo.groupIds": new mongoose.Types.ObjectId(id),
      isDeleted: false,
    };

    if (search) {
      studentsQuery.$or = [
        { "personalInfo.fullName": { $regex: search, $options: "i" } },
        { enrollmentNumber: { $regex: search, $options: "i" } },
        { "personalInfo.email": { $regex: search, $options: "i" } }
      ];
    }

    // جلب الطلاب
    const students = await Student.find(studentsQuery)
      .select(
        "personalInfo.fullName personalInfo.email enrollmentNumber guardianInfo academicInfo"
      )
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const totalStudents = await Student.countDocuments(studentsQuery);

    console.log(`👥 [Group Evaluations GET] Found ${students.length} students (total: ${totalStudents})`);

    // جلب تقييمات الطلاب الموجودة
    const existingEvaluations = await StudentEvaluation.find({
      groupId: id,
      studentId: { $in: students.map((s) => s._id) },
      isDeleted: false,
    }).lean();

    console.log(`📝 [Group Evaluations GET] Found ${existingEvaluations.length} existing evaluations`);

    const evaluationsMap = {};
    existingEvaluations.forEach((evaluation) => {
      evaluationsMap[evaluation.studentId.toString()] = evaluation;
    });

    // جلب إحصائيات الحضور لكل طالب
    const sessions = await Session.find({
      groupId: id,
      isDeleted: false,
    })
      .select("attendance scheduledDate status")
      .lean();

    console.log(`📅 [Group Evaluations GET] Found ${sessions.length} sessions for attendance`);

    // إعداد بيانات الطلاب مع التقييمات
    const studentsWithEvaluation = await Promise.all(
      students.map(async (student) => {
        // حساب إحصائيات الحضور
        let attended = 0;
        const completedSessions = sessions.filter(s => s.status === "completed");
        let totalSessions = completedSessions.length;

        completedSessions.forEach((session) => {
          if (session.attendance) {
            const attendanceRecord = session.attendance.find(
              (a) => a.studentId.toString() === student._id.toString()
            );
            if (
              attendanceRecord &&
              (attendanceRecord.status === "present" ||
                attendanceRecord.status === "late")
            ) {
              attended++;
            }
          }
        });

        const attendancePercentage =
          totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;

        const existingEvaluation = evaluationsMap[student._id.toString()];

        // تطبيق فلتر القرار إذا كان موجوداً
        if (decision && decision !== "all") {
          if (decision === "not_evaluated" && existingEvaluation) {
            return null;
          }
          if (decision !== "not_evaluated" && (!existingEvaluation || existingEvaluation.finalDecision !== decision)) {
            return null;
          }
        }

        return {
          id: student._id,
          name: student.personalInfo?.fullName || "غير معروف",
          email: student.personalInfo?.email,
          enrollmentNumber: student.enrollmentNumber,
          attendanceStats: {
            attended,
            totalSessions,
            percentage: attendancePercentage,
          },
          evaluation: existingEvaluation
            ? {
                id: existingEvaluation._id,
                criteria: existingEvaluation.criteria,
                finalDecision: existingEvaluation.finalDecision,
                notes: existingEvaluation.notes,
                calculatedStats: existingEvaluation.calculatedStats,
                evaluatedAt: existingEvaluation.metadata.evaluatedAt,
              }
            : null,
          isEvaluated: !!existingEvaluation,
        };
      })
    );

    // تصفية القيم null الناتجة عن التصفية
    const filteredStudents = studentsWithEvaluation.filter(s => s !== null);

    // إحصائيات التقييمات
    const evaluationStats = {
      totalStudents,
      evaluated: existingEvaluations.length,
      pending: totalStudents - existingEvaluations.length,
      decisions: {
        pass: existingEvaluations.filter((e) => e.finalDecision === "pass")
          .length,
        review: existingEvaluations.filter((e) => e.finalDecision === "review")
          .length,
        repeat: existingEvaluations.filter((e) => e.finalDecision === "repeat")
          .length,
      },
    };

    console.log(`📊 [Group Evaluations GET] Stats - total: ${evaluationStats.totalStudents}, evaluated: ${evaluationStats.evaluated}, pending: ${evaluationStats.pending}`);

    // التحقق من إعداد التقييمات في المجموعة
    const groupEvaluationStatus = {
      enabled: updatedGroup.metadata?.evaluationsEnabled || false,
      enabledAt: updatedGroup.metadata?.evaluationsEnabledAt,
      completed: updatedGroup.metadata?.evaluationsCompleted || false,
      completedAt: updatedGroup.metadata?.evaluationsCompletedAt,
    };

    const response = {
      success: true,
      data: {
        group: {
          id: updatedGroup._id,
          name: updatedGroup.name,
          code: updatedGroup.code,
          status: updatedGroup.status,
          evaluationStatus: groupEvaluationStatus,
          sessionsCompleted: sessions.filter(s => s.status === "completed").length,
          totalSessions: sessions.length,
        },
        students: filteredStudents,
        stats: evaluationStats,
        pagination: {
          page,
          limit,
          total: totalStudents,
          pages: Math.ceil(totalStudents / limit),
          hasNext: page * limit < totalStudents,
          hasPrev: page > 1,
        },
      },
    };

    console.log(`✅ [Group Evaluations GET] Successfully returned data for ${filteredStudents.length} students`);
    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ [Group Evaluations API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في تحميل بيانات التقييم",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(req, { params }) {
  try {
    const { id } = await params;

    console.log(`📥 [Group Evaluations POST] Request for group: ${id}`);

    // التحقق من المستخدم
    const user = await getUserFromRequest(req);
    if (!user || (user.role !== "instructor" && user.role !== "admin")) {
      console.log(`❌ [Group Evaluations POST] Unauthorized access attempt by user: ${user?.id}`);
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
    });

    if (!group) {
      console.log(`❌ [Group Evaluations POST] Group ${id} not found or user not instructor`);
      return NextResponse.json(
        { success: false, message: "المجموعة غير موجودة أو لا تملك صلاحية الوصول" },
        { status: 404 }
      );
    }

    // ⚠️ تحديث حالة المجموعة بناءً على الجلسات
    console.log(`🔄 [Group Evaluations POST] Checking group completion status...`);
    await updateGroupCompletionStatus(id);
    
    // إعادة تحميل المجموعة بعد التحديث
    const updatedGroup = await Group.findById(id);

    if (!updatedGroup) {
      console.log(`❌ [Group Evaluations POST] Failed to reload group after update`);
      return NextResponse.json(
        { success: false, message: "خطأ في تحميل بيانات المجموعة" },
        { status: 500 }
      );
    }

    // التحقق من أن المجموعة مكتملة
    if (updatedGroup.status !== "completed") {
      console.log(`❌ [Group Evaluations POST] Group not completed: ${updatedGroup.status}`);
      
      // جلب معلومات الجلسات لعرضها للمستخدم
      const sessions = await Session.find({
        groupId: id,
        isDeleted: false,
      });
      
      const incompleteSessions = sessions.filter(s => s.status !== "completed");
      
      return NextResponse.json(
        {
          success: false,
          message: "لا يمكن تقييم الطلاب إلا بعد اكتمال المجموعة",
          details: `حالة المجموعة: ${updatedGroup.status}`,
          sessionsInfo: {
            total: sessions.length,
            completed: sessions.filter(s => s.status === "completed").length,
            incomplete: incompleteSessions.length,
            incompleteSessions: incompleteSessions.map(s => ({
              title: s.title,
              status: s.status,
              date: s.scheduledDate,
            }))
          }
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { studentId, criteria, finalDecision, notes } = body;

    console.log(`📝 [Group Evaluations POST] Creating evaluation for student: ${studentId}`);

    // التحقق من الطالب
    const student = await Student.findOne({
      _id: studentId,
      "academicInfo.groupIds": new mongoose.Types.ObjectId(id),
      isDeleted: false,
    });

    if (!student) {
      console.log(`❌ [Group Evaluations POST] Student ${studentId} not found in group ${id}`);
      return NextResponse.json(
        { success: false, message: "الطالب غير موجود في المجموعة" },
        { status: 404 }
      );
    }

    // التحقق من صحة البيانات
    if (!criteria || !finalDecision) {
      console.log(`❌ [Group Evaluations POST] Incomplete evaluation data`);
      return NextResponse.json(
        { success: false, message: "بيانات التقييم غير مكتملة" },
        { status: 400 }
      );
    }

    // التحقق من صحة التقييمات
    const validScores = [
      "understanding",
      "commitment",
      "attendance",
      "participation",
    ];
    for (const score of validScores) {
      if (!criteria[score] || criteria[score] < 1 || criteria[score] > 5) {
        console.log(`❌ [Group Evaluations POST] Invalid ${score} score: ${criteria[score]}`);
        return NextResponse.json(
          { success: false, message: `تقييم ${score} غير صالح` },
          { status: 400 }
        );
      }
    }

    // التحقق من القرار النهائي
    if (!["pass", "review", "repeat"].includes(finalDecision)) {
      console.log(`❌ [Group Evaluations POST] Invalid final decision: ${finalDecision}`);
      return NextResponse.json(
        { success: false, message: "القرار النهائي غير صالح" },
        { status: 400 }
      );
    }

    // حساب المعدل العام
    const overallScore = (criteria.understanding + criteria.commitment + criteria.attendance + criteria.participation) / 4;

    // التحقق مما إذا كان هناك تقييم سابق
    const existingEvaluation = await StudentEvaluation.findOne({
      groupId: id,
      studentId,
      isDeleted: false,
    });

    let evaluation;

    if (existingEvaluation) {
      // تحديث التقييم الحالي
      console.log(`🔄 [Group Evaluations POST] Updating existing evaluation: ${existingEvaluation._id}`);
      existingEvaluation.criteria = criteria;
      existingEvaluation.finalDecision = finalDecision;
      existingEvaluation.notes = notes;
      existingEvaluation.calculatedStats = {
        overallScore: parseFloat(overallScore.toFixed(2)),
        lastUpdated: new Date(),
      };
      existingEvaluation.metadata.lastModifiedAt = new Date();
      existingEvaluation.metadata.lastModifiedBy = user.id;

      evaluation = await existingEvaluation.save();
      console.log(`✅ [Group Evaluations POST] Evaluation updated: ${evaluation._id}`);
    } else {
      // إنشاء تقييم جديد
      console.log(`🔄 [Group Evaluations POST] Creating new evaluation`);
      evaluation = await StudentEvaluation.create({
        groupId: id,
        studentId,
        instructorId: user.id,
        criteria,
        finalDecision,
        notes,
        calculatedStats: {
          overallScore: parseFloat(overallScore.toFixed(2)),
          createdAt: new Date(),
        },
        metadata: {
          evaluatedAt: new Date(),
          evaluatedBy: user.id,
          lastModifiedAt: new Date(),
          lastModifiedBy: user.id,
        },
      });

      console.log(`✅ [Group Evaluations POST] New evaluation created: ${evaluation._id}`);

      // تحديث المجموعة لتسجيل أن التقييمات قد بدأت
      if (!updatedGroup.metadata.evaluationsEnabled) {
        updatedGroup.metadata.evaluationsEnabled = true;
        updatedGroup.metadata.evaluationsEnabledAt = new Date();
        updatedGroup.metadata.evaluationsEnabledBy = user.id;
        await updatedGroup.save();
        console.log(`✅ [Group Evaluations POST] Group evaluations enabled`);
      }
    }

    // تحديث إحصائيات المجموعة
    await updateGroupEvaluationStats(id);

    return NextResponse.json({
      success: true,
      message: existingEvaluation
        ? "تم تحديث التقييم بنجاح"
        : "تم إضافة التقييم بنجاح",
      data: evaluation,
    });
  } catch (error) {
    console.error("❌ [Create Evaluation API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في حفظ التقييم",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

async function updateGroupEvaluationStats(groupId) {
  try {
    console.log(`🔄 [updateGroupEvaluationStats] Updating stats for group: ${groupId}`);
    
    const evaluations = await StudentEvaluation.find({
      groupId,
      isDeleted: false,
    });

    const totalStudents = await Student.countDocuments({
      "academicInfo.groupIds": new mongoose.Types.ObjectId(groupId),
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
      completedAt: evaluations.length === totalStudents ? new Date() : null,
      lastUpdated: new Date(),
    };

    const group = await Group.findByIdAndUpdate(
      groupId,
      {
        $set: {
          "metadata.evaluationSummary": stats,
          "metadata.evaluationsCompleted": stats.pendingStudents === 0,
          "metadata.evaluationsCompletedAt":
            stats.pendingStudents === 0 ? new Date() : null,
        },
      },
      { new: true }
    );

    console.log(`✅ [updateGroupEvaluationStats] Stats updated for group ${groupId}:`);
    console.log(`   Evaluated: ${stats.evaluatedStudents}/${stats.totalStudents}`);
    console.log(`   Pass: ${stats.passCount}, Review: ${stats.reviewCount}, Repeat: ${stats.repeatCount}`);
    
    return stats;
  } catch (error) {
    console.error("❌ [updateGroupEvaluationStats] Error:", error);
    throw error;
  }
}

// دالة مساعدة لجلب معلومات الجلسات
async function getSessionsInfo(groupId) {
  try {
    const sessions = await Session.find({
      groupId: groupId,
      isDeleted: false,
    }).sort({ scheduledDate: 1 });

    return {
      total: sessions.length,
      completed: sessions.filter(s => s.status === "completed").length,
      incomplete: sessions.filter(s => s.status !== "completed").map(s => ({
        id: s._id,
        title: s.title,
        sessionNumber: s.sessionNumber,
        status: s.status,
        scheduledDate: s.scheduledDate,
      })),
      allSessions: sessions.map(s => ({
        id: s._id,
        title: s.title,
        sessionNumber: s.sessionNumber,
        status: s.status,
        scheduledDate: s.scheduledDate,
      }))
    };
  } catch (error) {
    console.error("❌ [getSessionsInfo] Error:", error);
    return { error: error.message };
  }
}