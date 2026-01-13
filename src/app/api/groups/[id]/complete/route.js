// app/api/groups/[id]/complete/route.js - ✅ FIXED VERSION
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../../models/Group";
import Session from "../../../../models/Session";
import Student from "../../../../models/Student";
import { requireAdmin } from "@/utils/authMiddleware";
import { onGroupCompleted } from "@/app/services/groupAutomation";
import mongoose from "mongoose";

/**
 * POST: Complete a group and send completion messages
 */
export async function POST(req, { params }) {
  try {
    console.log(`\n🎯 ========== GROUP COMPLETION START ==========`);

    const { id } = await params;
    console.log(`👥 Group ID: ${id}`);

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const adminUser = authCheck.user;
    console.log(`👤 Admin: ${adminUser.email || adminUser.id}`);

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid group ID format" },
        { status: 400 }
      );
    }

    const { customMessage, feedbackLink, autoDetected } = await req.json();

    console.log(`📝 Custom Message: ${customMessage ? "Yes" : "No"}`);
    console.log(`📋 Feedback Link: ${feedbackLink || "Not provided"}`);
    console.log(`🤖 Auto-detected: ${autoDetected ? "Yes" : "No"}`);

    // ✅ FIX 1: Populate students AND get students from academicInfo.groupIds
    const group = await Group.findById(id)
      .populate("courseId", "title level")
      .populate({
        path: "students",
        select: "personalInfo.fullName personalInfo.whatsappNumber enrollmentNumber communicationPreferences guardianInfo.whatsappNumber guardianInfo.name",
        match: { isDeleted: false }
      })
      .lean();

    if (!group) {
      console.log(`❌ Group not found: ${id}`);
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    console.log(`✅ Group found: ${group.name} (${group.code})`);
    console.log(`📊 Current status: ${group.status}`);
    console.log(`👥 Students from group.students: ${group.students?.length || 0}`);

    // ✅ FIX 2: If no students from populate, fetch from Student collection
    let students = group.students || [];
    
    if (students.length === 0) {
      console.log(`⚠️ No students from populate, fetching from Student collection...`);
      
      students = await Student.find({
        'academicInfo.groupIds': new mongoose.Types.ObjectId(id),
        isDeleted: false
      })
      .select('personalInfo.fullName personalInfo.whatsappNumber enrollmentNumber communicationPreferences guardianInfo.whatsappNumber guardianInfo.name')
      .lean();
      
      console.log(`📊 Students from academicInfo.groupIds: ${students.length}`);
    }

    // ✅ Check if already completed
    if (
      group.status === "completed" &&
      group.metadata?.completionMessagesSent
    ) {
      console.log(`⚠️ Group already completed and messages sent`);
      return NextResponse.json(
        {
          success: false,
          error: "Completion messages already sent for this group",
          sentAt: group.metadata.completionMessagesSentAt,
          summary: group.metadata.completionMessagesSummary,
        },
        { status: 400 }
      );
    }

    // ✅ Verify all sessions are completed
    const sessions = await Session.find({
      groupId: id,
      isDeleted: false,
    }).lean();

    console.log(`📋 Total sessions: ${sessions.length}`);

    const incompleteSessions = sessions.filter((s) => s.status !== "completed");

    if (incompleteSessions.length > 0 && !autoDetected) {
      console.log(`⚠️ ${incompleteSessions.length} sessions not completed yet`);
      return NextResponse.json(
        {
          success: false,
          error: "Not all sessions are completed",
          totalSessions: sessions.length,
          completedSessions: sessions.length - incompleteSessions.length,
          incompleteSessions: incompleteSessions.map((s) => ({
            id: s._id,
            title: s.title,
            status: s.status,
            scheduledDate: s.scheduledDate,
          })),
        },
        { status: 400 }
      );
    }

    console.log(`✅ All sessions completed`);

    // ✅ Update group status to completed
    if (group.status !== "completed") {
      console.log(`🔄 Updating group status to 'completed'...`);

      await Group.findByIdAndUpdate(id, {
        $set: {
          status: "completed",
          "metadata.updatedAt": new Date(),
          "metadata.completedAt": new Date(),
          "metadata.completedBy": adminUser.id,
        },
      });

      console.log(`✅ Group status updated to 'completed'`);
    }

    // ✅ Trigger completion automation
    console.log(`\n📱 ========== TRIGGERING COMPLETION AUTOMATION ==========`);
    console.log(`👥 Total students for automation: ${students.length}`);

    const automationResult = await onGroupCompleted(
      id,
      customMessage || null,
      feedbackLink || null
    );

    console.log(`\n✅ Automation result:`, {
      success: automationResult.success,
      sent: automationResult.successCount,
      failed: automationResult.failCount,
    });

    console.log(`\n✅ ========== GROUP COMPLETION COMPLETE ==========\n`);

    return NextResponse.json({
      success: true,
      message: "Group completed successfully and students notified",
      data: {
        groupId: id,
        groupName: group.name,
        groupCode: group.code,
        courseName: group.courseId?.title,
        status: "completed",
        completedAt: new Date(),
        totalSessions: sessions.length,
        completedSessions: sessions.filter((s) => s.status === "completed")
          .length,
        totalStudents: students.length,
      },
      automation: {
        completed: automationResult.success,
        action: "Completion messages sent via WhatsApp",
        totalStudents: automationResult.totalStudents,
        successCount: automationResult.successCount,
        failCount: automationResult.failCount,
        customMessageUsed: automationResult.customMessageUsed,
        feedbackLinkProvided: automationResult.feedbackLinkProvided,
        successRate: automationResult.successRate,
        details: automationResult.notificationResults || [],
      },
    });
  } catch (error) {
    console.error(`\n❌ ========== GROUP COMPLETION ERROR ==========`);
    console.error("Error:", error);
    console.error("Stack:", error.stack);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to complete group",
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Check if group is ready for completion
 */
export async function GET(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid group ID format" },
        { status: 400 }
      );
    }

    // ✅ Populate students to get count
    const group = await Group.findById(id)
      .populate("courseId", "title level")
      .populate({
        path: "students",
        select: "personalInfo.fullName",
        match: { isDeleted: false }
      })
      .lean();

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    // ✅ Get students count from both sources
    let studentsCount = group.students?.length || 0;
    
    if (studentsCount === 0) {
      const students = await Student.find({
        'academicInfo.groupIds': new mongoose.Types.ObjectId(id),
        isDeleted: false
      }).countDocuments();
      
      studentsCount = students;
    }

    // Check sessions status
    const sessions = await Session.find({
      groupId: id,
      isDeleted: false,
    }).lean();

    const completedSessions = sessions.filter(
      (s) => s.status === "completed"
    ).length;
    const totalSessions = sessions.length;
    const allCompleted =
      completedSessions === totalSessions && totalSessions > 0;

    const incompleteSessions = sessions.filter((s) => s.status !== "completed");

    const canComplete = allCompleted && group.status !== "completed";
    const alreadyCompleted = group.status === "completed";
    const messagesSent = group.metadata?.completionMessagesSent || false;

    return NextResponse.json({
      success: true,
      data: {
        groupId: id,
        groupName: group.name,
        groupCode: group.code,
        currentStatus: group.status,
        canComplete,
        alreadyCompleted,
        messagesSent,
        sentAt: group.metadata?.completionMessagesSentAt || null,
        totalStudents: studentsCount,
        sessions: {
          total: totalSessions,
          completed: completedSessions,
          incomplete: incompleteSessions.length,
          allCompleted,
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
          completionMessageEnabled:
            group.automation?.completionMessage || false,
        },
        summary: group.metadata?.completionMessagesSummary || null,
      },
    });
  } catch (error) {
    console.error("❌ Error checking group completion status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to check completion status",
      },
      { status: 500 }
    );
  }
}