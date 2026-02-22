// app/api/groups/[id]/complete/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../../models/Group";
import Session from "../../../../models/Session";
import Student from "../../../../models/Student";
import { requireAdmin } from "@/utils/authMiddleware";
import { wapilotService } from "@/app/services/wapilot-service";
import mongoose from "mongoose";

export async function POST(req, { params }) {
  try {
    const { id } = await params;

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const adminUser = authCheck.user;
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid group ID format" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      markOnly = false,
      singleStudent = null,
      feedbackLink = null,
      autoDetected = false,
    } = body;

    // ============================================================
    // MODE 1: إرسال لطالب واحد فقط - الباك مش بيعمل حاجة تانية
    // ============================================================
    if (singleStudent) {
      const { studentId, studentMessage, guardianMessage } = singleStudent;

      if (!studentId) {
        return NextResponse.json(
          { success: false, error: "studentId is required" },
          { status: 400 }
        );
      }

      if (!studentMessage && !guardianMessage) {
        return NextResponse.json(
          { success: false, error: "At least one message is required" },
          { status: 400 }
        );
      }

      // جيب الطالب ده بس
      const student = await Student.findById(studentId).lean();
      if (!student) {
        return NextResponse.json(
          { success: false, error: "Student not found" },
          { status: 404 }
        );
      }

      const language = student.communicationPreferences?.preferredLanguage || "ar";
      const sentTo = { student: false, guardian: false };
      const errors = {};

      // بعت للطالب لو عنده رقم ورسالة
      if (studentMessage?.trim() && student.personalInfo?.whatsappNumber) {
        try {
          await wapilotService.sendAndLogMessage({
            studentId,
            phoneNumber: student.personalInfo.whatsappNumber,
            messageContent: studentMessage.trim(),
            messageType: "group_completion",
            language,
            metadata: {
              groupId: id,
              recipientType: "student",
            },
          });
          sentTo.student = true;
          console.log(`✅ Student msg sent → ${student.personalInfo?.fullName}`);
        } catch (e) {
          errors.student = e.message;
          console.error(`❌ Student msg failed → ${student.personalInfo?.fullName}:`, e.message);
        }
      }

      // بعت لولي الأمر لو عنده رقم ورسالة
      if (guardianMessage?.trim() && student.guardianInfo?.whatsappNumber) {
        try {
          await wapilotService.sendAndLogMessage({
            studentId,
            phoneNumber: student.guardianInfo.whatsappNumber,
            messageContent: guardianMessage.trim(),
            messageType: "group_completion",
            language,
            metadata: {
              groupId: id,
              recipientType: "guardian",
              guardianName: student.guardianInfo?.name,
            },
          });
          sentTo.guardian = true;
          console.log(`✅ Guardian msg sent → ${student.guardianInfo?.name}`);
        } catch (e) {
          errors.guardian = e.message;
          console.error(`❌ Guardian msg failed → ${student.guardianInfo?.name}:`, e.message);
        }
      }

      return NextResponse.json({
        success: sentTo.student || sentTo.guardian,
        studentId,
        studentName: student.personalInfo?.fullName,
        sentTo,
        errors: Object.keys(errors).length > 0 ? errors : undefined,
      });
    }

    // ============================================================
    // MODE 2: تعليم الغروب كـ completed فقط (markOnly)
    // ============================================================
    const group = await Group.findById(id).populate("courseId", "title level").lean();

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    // التحقق من الجلسات
    const sessions = await Session.find({ groupId: id, isDeleted: false }).lean();
    const incompleteSessions = sessions.filter(
      (s) => s.status !== "completed" && s.status !== "cancelled"
    );

    if (incompleteSessions.length > 0 && !autoDetected) {
      return NextResponse.json(
        {
          success: false,
          error: "Not all sessions are completed or cancelled",
          incompleteSessions: incompleteSessions.map((s) => ({
            id: s._id,
            title: s.title,
            status: s.status,
          })),
        },
        { status: 400 }
      );
    }

    // عمل الغروب completed لو مش completed
    if (group.status !== "completed") {
      await Group.findByIdAndUpdate(id, {
        $set: {
          status: "completed",
          "metadata.updatedAt": new Date(),
          "metadata.completedAt": new Date(),
          "metadata.completedBy": adminUser.id,
        },
      });
      console.log(`✅ Group ${group.code} → 'completed'`);
    }

    return NextResponse.json({
      success: true,
      message: "Group marked as completed",
      data: {
        groupId: id,
        groupName: group.name,
        groupCode: group.code,
        status: "completed",
        completedAt: new Date(),
      },
    });
  } catch (error) {
    console.error(`❌ GROUP COMPLETION ERROR:`, error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed" },
      { status: 500 }
    );
  }
}

export async function GET(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid group ID format" },
        { status: 400 }
      );
    }

    const group = await Group.findById(id)
      .populate("courseId", "title level")
      .populate({
        path: "students",
        select: "personalInfo.fullName",
        match: { isDeleted: false },
      })
      .lean();

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    let studentsCount = group.students?.length || 0;
    if (studentsCount === 0) {
      studentsCount = await Student.countDocuments({
        "academicInfo.groupIds": new mongoose.Types.ObjectId(id),
        isDeleted: false,
      });
    }

    const sessions = await Session.find({ groupId: id, isDeleted: false }).lean();
    const doneSessions = sessions.filter(
      (s) => s.status === "completed" || s.status === "cancelled"
    ).length;
    const totalSessions = sessions.length;
    const allDone = doneSessions === totalSessions && totalSessions > 0;
    const incompleteSessions = sessions.filter(
      (s) => s.status !== "completed" && s.status !== "cancelled"
    );

    return NextResponse.json({
      success: true,
      data: {
        groupId: id,
        groupName: group.name,
        groupCode: group.code,
        currentStatus: group.status,
        canComplete: allDone && group.status !== "completed",
        alreadyCompleted: group.status === "completed",
        messagesSent: group.metadata?.completionMessagesSent || false,
        sentAt: group.metadata?.completionMessagesSentAt || null,
        totalStudents: studentsCount,
        sessions: {
          total: totalSessions,
          completed: sessions.filter((s) => s.status === "completed").length,
          cancelled: sessions.filter((s) => s.status === "cancelled").length,
          done: doneSessions,
          incomplete: incompleteSessions.length,
          allDone,
        },
        incompleteSessions: incompleteSessions.map((s) => ({
          id: s._id,
          title: s.title,
          status: s.status,
          scheduledDate: s.scheduledDate,
          moduleIndex: s.moduleIndex,
          sessionNumber: s.sessionNumber,
        })),
        automation: {
          enabled: group.automation?.whatsappEnabled || false,
          completionMessageEnabled: group.automation?.completionMessage || false,
        },
        summary: group.metadata?.completionMessagesSummary || null,
      },
    });
  } catch (error) {
    console.error("❌ Error checking group completion status:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to check completion status" },
      { status: 500 }
    );
  }
}