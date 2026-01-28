// app/api/groups/[id]/activate/route.js - النسخة المحدثة
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../../models/Group";
import Session from "../../../../models/Session";
import { requireAdmin } from "@/utils/authMiddleware";
import {
  onGroupActivated,
  sendInstructorWelcomeMessages,
} from "../../../../services/groupAutomation";
import mongoose from "mongoose";

export async function POST(req, { params }) {
  try {
    const { id } = await params;

    console.log(`🎯 Activating group: ${id}`);

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const adminUser = authCheck.user;

    // ✅ استقبال رسائل المدرسين المخصصة
    const body = await req.json();
    const { instructorMessages = {} } = body;

    console.log(
      `📝 Instructor messages received:`,
      Object.keys(instructorMessages).length
    );

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid group ID format" },
        { status: 400 }
      );
    }

    const group = await Group.findOne({ _id: id, isDeleted: false })
      .populate("courseId")
      .populate("instructors", "name email profile");

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    // ✅ FIXED: التحقق مما إذا كانت المجموعة لها حصص مسبقاً
    const existingSessionsCount = await Session.countDocuments({
      groupId: id,
      isDeleted: false,
    });

    console.log(`📊 Existing sessions: ${existingSessionsCount}`);

    // ✅ FIXED: السماح بإعادة التفعيل حتى لو كانت المجموعة مفعلة مسبقاً
    if (group.status === "active") {
      console.log(`🔄 Group is already active, regenerating sessions...`);
      
      // ❌ لا نعيد تعيين status إلى draft
      // ❌ لا نرمي خطأ، بل نستمر في عملية إعادة التوليد
    }

    if (group.status === "completed") {
      return NextResponse.json(
        { success: false, error: "Cannot activate a completed group" },
        { status: 400 }
      );
    }

    if (
      !group.courseId ||
      !group.courseId.curriculum ||
      group.courseId.curriculum.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot activate group: Course has no curriculum",
        },
        { status: 400 }
      );
    }

    if (
      !group.schedule ||
      !group.schedule.startDate ||
      !group.schedule.daysOfWeek ||
      group.schedule.daysOfWeek.length !== 3
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Group must have a valid schedule with exactly 3 days selected",
        },
        { status: 400 }
      );
    }

    // ✅ تحديث الـ status إلى active (إذا لم يكن active مسبقاً)
    if (group.status !== "active") {
      await Group.findByIdAndUpdate(id, {
        $set: {
          status: "active",
          "metadata.activatedAt": new Date(),
          "metadata.lastModifiedBy": adminUser.id,
          "metadata.updatedAt": new Date(),
        },
      });
    } else {
      console.log(`✅ Group is already active, updating metadata only`);
      await Group.findByIdAndUpdate(id, {
        $set: {
          "metadata.reactivatedAt": new Date(),
          "metadata.lastModifiedBy": adminUser.id,
          "metadata.updatedAt": new Date(),
          "metadata.lastRegeneration": new Date(),
        },
      });
    }

    const updatedGroup = await Group.findById(id)
      .populate("courseId", "title level curriculum")
      .populate("instructors", "name email profile");

    console.log(`✅ Group ${updatedGroup.code} ready for session generation`);

    // محاولة إصلاح الفهارس
    try {
      console.log("🛠️  Attempting to fix database indexes...");
      await Session.syncIndexes();
      console.log("✅ Database indexes synced");
    } catch (indexError) {
      console.warn("⚠️  Could not sync indexes:", indexError.message);
    }

    // Trigger automation (session generation + instructor notifications)
    try {
      console.log("🔄 Starting automation for activated group...");
      
      // 1️⃣ توليد الحصص أولاً
      const automationResult = await onGroupActivated(id, adminUser.id);
      console.log("✅ Sessions generated:", automationResult);

      // 2️⃣ إرسال الرسائل للمدرسين
      let instructorNotificationResult = null;

      if (updatedGroup.instructors && updatedGroup.instructors.length > 0) {
        console.log(
          `📱 Sending welcome messages to ${updatedGroup.instructors.length} instructors...`
        );

        try {
          instructorNotificationResult = await sendInstructorWelcomeMessages(
            id,
            instructorMessages // الرسائل المخصصة من الـ Modal
          );

          console.log(
            "✅ Instructor notifications sent:",
            instructorNotificationResult
          );
        } catch (instructorError) {
          console.error(
            "❌ Failed to send instructor notifications:",
            instructorError
          );
          instructorNotificationResult = {
            success: false,
            error: instructorError.message,
          };
        }
      } else {
        console.log("⚠️ No instructors assigned to this group");
        instructorNotificationResult = {
          success: true,
          message: "No instructors to notify",
          instructorsCount: 0,
          notificationsSent: 0,
        };
      }

      return NextResponse.json({
        success: true,
        message: "Group activated successfully",
        data: {
          id: updatedGroup._id,
          code: updatedGroup.code,
          name: updatedGroup.name,
          status: updatedGroup.status,
          activatedAt: updatedGroup.metadata.activatedAt,
          reactivatedAt: updatedGroup.metadata.reactivatedAt,
          course: updatedGroup.courseId,
          instructors: updatedGroup.instructors,
          sessionsGenerated: true,
          totalSessions: automationResult.sessionsGenerated,
        },
        automation: {
          sessions: {
            triggered: true,
            status: "completed",
            generated: automationResult.sessionsGenerated,
            details: automationResult,
            regeneration: automationResult.regeneration || false,
          },
          instructorNotifications: {
            triggered: updatedGroup.instructors?.length > 0,
            status: instructorNotificationResult?.success ? "sent" : "failed",
            customMessagesUsed: Object.keys(instructorMessages).length,
            notificationsSent: instructorNotificationResult?.notificationsSent || 0,
            notificationsFailed: instructorNotificationResult?.notificationsFailed || 0,
            successRate: instructorNotificationResult?.successRate || 0,
            results: instructorNotificationResult,
          },
        },
      });
    } catch (automationError) {
      console.error("❌ Automation failed:", automationError);

      // Rollback group status only if it was newly activated
      if (group.status !== "active") {
        await Group.findByIdAndUpdate(id, {
          $set: {
            status: "draft",
            "metadata.updatedAt": new Date(),
          },
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: `Automation failed: ${automationError.message}`,
          suggestion:
            "Group status reverted to draft. Please check the schedule and try again.",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Error activating group:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to activate group" },
      { status: 500 }
    );
  }
}