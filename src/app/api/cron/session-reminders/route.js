import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Session from "../../../models/Session";
import Group from "../../../models/Group";
import Student from "../../../models/Student";
import { wapilotService } from "../../../services/wapilot-service";
import { prepareReminderMessage } from "../../../services/groupAutomation";

/**
 * ✅ Cron Job: Session Reminders
 * يشتغل تلقائياً كل ساعة (0 * * * *)
 * يرسل تذكيرات 24 ساعة و 1 ساعة قبل المحاضرات
 */
export async function GET(req) {
  try {
    console.log("⏰ Starting session reminder cron job...");

    // Security check
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log("❌ Unauthorized cron request");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    await connectDB();

    const now = new Date();
    console.log(`📅 Current time: ${now.toISOString()}`);

    // Find active groups with reminders enabled
    const activeGroups = await Group.find({
      status: "active",
      "automation.whatsappEnabled": true,
      "automation.reminderEnabled": true,
      isDeleted: false,
    }).lean();

    console.log(
      `📊 Found ${activeGroups.length} groups with reminders enabled`,
    );

    let stats = {
      groupsChecked: activeGroups.length,
      sessionsProcessed: 0,
      reminders24h: { sent: 0, failed: 0, skipped: 0 },
      reminders1h: { sent: 0, failed: 0, skipped: 0 },
    };

    for (const group of activeGroups) {
      console.log(`\n📁 Processing group: ${group.code}`);

      // ✅ Find sessions needing 24-hour reminder
      const reminder24hTime = new Date(now);
      reminder24hTime.setHours(reminder24hTime.getHours() + 24);

      const sessions24h = await Session.find({
        groupId: group._id,
        status: "scheduled",
        scheduledDate: {
          $gte: new Date(reminder24hTime.getTime() - 30 * 60000), // 30 min before
          $lte: new Date(reminder24hTime.getTime() + 30 * 60000), // 30 min after
        },
        "automationEvents.reminder24hSent": { $ne: true }, // لم يتم إرساله
        isDeleted: false,
      });

      console.log(
        `📅 Found ${sessions24h.length} sessions needing 24h reminder`,
      );

      // ✅ Find sessions needing 1-hour reminder
      const reminder1hTime = new Date(now);
      reminder1hTime.setHours(reminder1hTime.getHours() + 1);

      const sessions1h = await Session.find({
        groupId: group._id,
        status: "scheduled",
        scheduledDate: {
          $gte: new Date(reminder1hTime.getTime() - 15 * 60000), // 15 min before
          $lte: new Date(reminder1hTime.getTime() + 15 * 60000), // 15 min after
        },
        "automationEvents.reminder1hSent": { $ne: true }, // لم يتم إرساله
        isDeleted: false,
      });

      console.log(`⏰ Found ${sessions1h.length} sessions needing 1h reminder`);

      // ✅ Process 24-hour reminders
      for (const session of sessions24h) {
        const result = await sendSessionReminderInternal(
          session,
          group,
          "24hours",
        );
        stats.sessionsProcessed++;
        stats.reminders24h.sent += result.sent;
        stats.reminders24h.failed += result.failed;
        stats.reminders24h.skipped += result.skipped;

        // ✅ Update session
        if (result.sent > 0) {
          await Session.findByIdAndUpdate(session._id, {
            $set: {
              "automationEvents.reminder24hSent": true,
              "automationEvents.reminder24hSentAt": new Date(),
              "automationEvents.reminder24hStudentsNotified": result.sent,
              "automationEvents.reminderStats.total24hSent": result.sent,
              "automationEvents.reminderStats.total24hFailed": result.failed,
            },
          });
        }
      }

      // ✅ Process 1-hour reminders
      for (const session of sessions1h) {
        const result = await sendSessionReminderInternal(
          session,
          group,
          "1hour",
        );
        stats.sessionsProcessed++;
        stats.reminders1h.sent += result.sent;
        stats.reminders1h.failed += result.failed;
        stats.reminders1h.skipped += result.skipped;

        // ✅ Update session
        if (result.sent > 0) {
          await Session.findByIdAndUpdate(session._id, {
            $set: {
              "automationEvents.reminder1hSent": true,
              "automationEvents.reminder1hSentAt": new Date(),
              "automationEvents.reminder1hStudentsNotified": result.sent,
              "automationEvents.reminderStats.total1hSent": result.sent,
              "automationEvents.reminderStats.total1hFailed": result.failed,
            },
          });
        }
      }
    }

    console.log("\n✅ Cron job completed");
    console.log("📊 Stats:", stats);

    return NextResponse.json({
      success: true,
      message: "Session reminders processed",
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in cron job:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * ✅ Internal: Send reminder for a specific session
 */
async function sendSessionReminderInternal(session, group, reminderType) {
  console.log(`\n📤 Sending ${reminderType} for: ${session.title}`);

  const result = { sent: 0, failed: 0, skipped: 0 };

  try {
    const students = await Student.getStudentsForReminder(
      group._id,
      session._id,
      reminderType,
    );

    console.log(`👥 ${students.length} students to notify`);

    for (const student of students) {
      try {
        const whatsappNumber = student.personalInfo?.whatsappNumber;

        if (!whatsappNumber) {
          result.skipped++;
          continue;
        }

        const language =
          student.communicationPreferences?.preferredLanguage || "ar";

        const message = prepareReminderMessage(
          student.personalInfo?.fullName,
          session,
          group,
          reminderType,
          language,
        );

        await wapilotService.sendTextMessage(
          wapilotService.preparePhoneNumber(whatsappNumber),
          message,
        );

        await student.addSessionReminder({
          sessionId: session._id,
          groupId: group._id,
          reminderType,
          message,
          language,
          status: "sent",
          sessionDetails: {
            title: session.title,
            scheduledDate: session.scheduledDate,
            startTime: session.startTime,
            endTime: session.endTime,
            moduleIndex: session.moduleIndex,
            sessionNumber: session.sessionNumber,
          },
        });

        result.sent++;
      } catch (studentError) {
        console.error(`❌ Failed:`, studentError.message);

        try {
          await student.addSessionReminder({
            sessionId: session._id,
            groupId: group._id,
            reminderType,
            message: "Failed",
            language: "ar",
            status: "failed",
            error: studentError.message,
            sessionDetails: {
              title: session.title,
              scheduledDate: session.scheduledDate,
              startTime: session.startTime,
              endTime: session.endTime,
              moduleIndex: session.moduleIndex,
              sessionNumber: session.sessionNumber,
            },
          });
        } catch {}

        result.failed++;
      }
    }
  } catch (error) {
    console.error(`❌ Error:`, error);
  }

  console.log(
    `📊 ${reminderType}: ${result.sent} sent, ${result.failed} failed`,
  );
  return result;
}

export async function POST(req) {
  return GET(req);
}