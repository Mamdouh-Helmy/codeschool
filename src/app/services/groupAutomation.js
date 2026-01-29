"use strict";

import mongoose from "mongoose";
import Group from "../models/Group";
import Student from "../models/Student";
import Session from "../models/Session";
import User from "../models/User";
import { wapilotService } from "./wapilot-service";

/**
 * ✅ EVENT 1: Group Activated (for session generation)
 * EXISTING - NO CHANGES
 */
// services/groupAutomation.js - تحديث دالة onGroupActivated
export async function onGroupActivated(groupId, userId) {
  try {
    console.log(`\n🎯 EVENT: Group Activated ==========`);
    console.log(`👥 Group: ${groupId}`);
    console.log(`👤 Activated by: ${userId}`);

    const group = await Group.findById(groupId)
      .populate("courseId")
      .populate("instructors", "name email profile");

    if (!group) {
      throw new Error("Group not found");
    }

    console.log(`📊 Group status: ${group.status}`);
    console.log(`📚 Course: ${group.courseId?.title}`);
    console.log(
      `📖 Curriculum modules: ${group.courseId?.curriculum?.length || 0}`,
    );

    // ✅ التحقق من إعدادات الجدول
    console.log(`📅 Group Schedule:`);
    console.log(
      `   Start Date: ${
        new Date(group.schedule.startDate).toISOString().split("T")[0]
      }`,
    );
    console.log(`   Days of Week: ${group.schedule.daysOfWeek}`);
    console.log(
      `   Time: ${group.schedule.timeFrom} - ${group.schedule.timeTo}`,
    );

    // ✅ التحقق من أن هناك 3 أيام مختارة
    if (!group.schedule.daysOfWeek || group.schedule.daysOfWeek.length !== 3) {
      throw new Error("Group must have exactly 3 days selected for schedule");
    }

    // ✅ FIXED: التحقق مما إذا كانت الحصص موجودة مسبقاً
    const Session = (await import("../models/Session")).default;
    const existingSessionsCount = await Session.countDocuments({
      groupId: groupId,
      isDeleted: false,
    });

    console.log(`📊 Existing sessions count: ${existingSessionsCount}`);
    console.log(`📊 Group sessionsGenerated flag: ${group.sessionsGenerated}`);

    // ✅ FIXED: إعادة توليد الحصص إذا لزم الأمر
    if (group.sessionsGenerated || existingSessionsCount > 0) {
      console.log(`🔄 Regenerating sessions for group ${group.code}...`);

      // ✅ حذف جميع الحصص القديمة أولاً
      console.log("🗑️  Deleting existing sessions...");

      // Release meeting links first
      const existingSessions = await Session.find({
        groupId: groupId,
        isDeleted: false,
        meetingLinkId: { $ne: null },
      });

      for (const session of existingSessions) {
        try {
          // Import releaseMeetingLink function
          const { releaseMeetingLink } =
            await import("../../utils/sessionGenerator");
          await releaseMeetingLink(session._id);
        } catch (releaseError) {
          console.warn(
            `⚠️ Failed to release meeting link for session ${session._id}:`,
            releaseError.message,
          );
        }
      }

      // Delete sessions
      const deleteResult = await Session.deleteMany({
        groupId: groupId,
      });
      console.log(`✅ Deleted ${deleteResult.deletedCount} existing sessions`);

      // Reset group flag
      await Group.findByIdAndUpdate(groupId, {
        $set: {
          sessionsGenerated: false,
          totalSessionsCount: 0,
        },
      });
    }

    // ✅ Generate Sessions using the updated generateSessionsForGroup
    console.log("📅 Generating new sessions...");

    const { generateSessionsForGroup } =
      await import("../../utils/sessionGenerator");

    const sessionsResult = await generateSessionsForGroup(
      groupId,
      group,
      userId,
    );

    if (!sessionsResult.success) {
      throw new Error(sessionsResult.message || "Failed to generate sessions");
    }

    // ✅ التحقق من توزيع السيشنات
    console.log(`📊 Sessions Generation Result:`);
    console.log(`   Total Generated: ${sessionsResult.totalGenerated}`);
    console.log(`   Distribution:`, sessionsResult.distribution);

    // ✅ Save sessions to database
    if (sessionsResult.sessions && sessionsResult.sessions.length > 0) {
      console.log(
        `💾 Saving ${sessionsResult.sessions.length} sessions to database...`,
      );

      try {
        const insertResult = await Session.insertMany(sessionsResult.sessions, {
          ordered: false,
        });

        console.log(`✅ Successfully saved ${insertResult.length} sessions`);

        await Group.findByIdAndUpdate(groupId, {
          $set: {
            sessionsGenerated: true,
            totalSessionsCount: sessionsResult.totalGenerated,
            "metadata.updatedAt": new Date(),
            "metadata.sessionsGeneratedAt": new Date(),
            "metadata.lastSessionGeneration": {
              date: new Date(),
              sessionsCount: sessionsResult.totalGenerated,
              userId: userId,
            },
          },
        });

        console.log(
          `✅ Generated and saved ${sessionsResult.totalGenerated} sessions`,
        );
        console.log(`   First session: ${sessionsResult.startDate}`);
        console.log(`   Last session: ${sessionsResult.endDate}`);
      } catch (insertError) {
        console.error("❌ Error inserting sessions:", insertError);

        if (insertError.code === 11000) {
          console.log(
            "🔄 Trying to insert sessions individually with conflict resolution...",
          );

          let successCount = 0;
          let errorCount = 0;
          const errors = [];

          for (const sessionData of sessionsResult.sessions) {
            try {
              await Session.findOneAndUpdate(
                {
                  groupId: sessionData.groupId,
                  moduleIndex: sessionData.moduleIndex,
                  sessionNumber: sessionData.sessionNumber,
                },
                sessionData,
                {
                  upsert: true,
                  new: true,
                  setDefaultsOnInsert: true,
                },
              );

              successCount++;
            } catch (individualError) {
              errorCount++;
              errors.push(individualError.message);
            }
          }

          if (successCount > 0) {
            await Group.findByIdAndUpdate(groupId, {
              $set: {
                sessionsGenerated: true,
                totalSessionsCount: successCount,
                "metadata.updatedAt": new Date(),
              },
            });

            console.log(
              `✅ Saved ${successCount} sessions (${errorCount} failed)`,
            );
          } else {
            throw new Error(
              `Failed to save any sessions. All ${errorCount} attempts failed.`,
            );
          }
        } else {
          throw insertError;
        }
      }
    }

    // 2. Notify Instructors (if automation enabled)
    if (group.automation?.whatsappEnabled && group.instructors?.length > 0) {
      console.log("📱 Sending notifications to instructors...");

      for (const instructor of group.instructors) {
        console.log(
          `📤 Notify instructor: ${instructor.name} (${instructor.email})`,
        );
      }
    }

    return {
      success: true,
      sessionsGenerated: sessionsResult.totalGenerated,
      groupCode: group.code,
      groupName: group.name,
      distribution: sessionsResult.distribution,
      startDate: sessionsResult.startDate,
      endDate: sessionsResult.endDate,
      regeneration: existingSessionsCount > 0,
    };
  } catch (error) {
    console.error("❌ Error in onGroupActivated:", error);

    if (error.code === 11000) {
      try {
        await Session.syncIndexes();
        console.log("🔄 Attempted to sync indexes");
      } catch (syncError) {
        console.error("❌ Failed to sync indexes:", syncError.message);
      }
    }

    throw error;
  }
}

/**
 * ✅ EVENT: Send Instructor Welcome Messages
 * EXISTING - NO CHANGES
 */
export async function sendInstructorWelcomeMessages(
  groupId,
  instructorMessages = {},
) {
  try {
    console.log(`\n🎯 EVENT: Send Instructor Welcome Messages ==========`);
    console.log(`👥 Group: ${groupId}`);
    console.log(
      `📝 Custom Messages Provided: ${Object.keys(instructorMessages).length}`,
    );

    const group = await Group.findById(groupId)
      .populate("courseId", "title level")
      .populate("instructors", "name email profile");

    if (!group) {
      throw new Error("Group not found");
    }

    if (!group.instructors || group.instructors.length === 0) {
      console.log("⚠️ No instructors assigned to this group");
      return {
        success: true,
        message: "No instructors to notify",
        instructorsCount: 0,
        notificationsSent: 0,
      };
    }

    console.log(`📧 Found ${group.instructors.length} instructors`);

    if (!group.automation?.whatsappEnabled) {
      console.log("⚠️ WhatsApp notifications disabled for this group");
      return {
        success: false,
        message: "WhatsApp notifications disabled",
        instructorsCount: group.instructors.length,
        notificationsSent: 0,
      };
    }

    let successCount = 0;
    let failCount = 0;
    const notificationResults = [];

    // معالجة كل مدرس
    for (const instructor of group.instructors) {
      const instructorId = instructor._id.toString();

      // ✅ استخدام profile.phone فقط
      const instructorPhone = instructor.profile?.phone;

      console.log(`\n📱 Processing instructor: ${instructor.name}`);
      console.log(`   Email: ${instructor.email}`);
      console.log(`   Phone: ${instructorPhone || "Not found"}`);

      if (!instructorPhone) {
        failCount++;
        notificationResults.push({
          instructorId,
          instructorName: instructor.name,
          instructorEmail: instructor.email,
          status: "failed",
          reason: "No phone number registered",
          suggestion: "Please add phone number to instructor profile",
        });
        console.log(`⚠️ No phone number for ${instructor.name}`);
        continue;
      }

      // الحصول على الرسالة المخصصة أو استخدام الرسالة الافتراضية
      let messageContent;

      if (instructorMessages && instructorMessages[instructorId]) {
        // استخدام الرسالة المخصصة من الإدارة
        messageContent = instructorMessages[instructorId];
        console.log(`📝 Using custom message from admin`);
      } else {
        // استخدام الرسالة الافتراضية
        messageContent = prepareInstructorWelcomeMessage(
          instructor.name,
          group,
          "ar", // يمكن تحديد اللغة من instructor metadata لو موجودة
        );
        console.log(`📝 Using default message`);
      }

      console.log(`📤 Message preview: ${messageContent.substring(0, 50)}...`);

      try {
        // ✅ إرسال الرسالة عبر WhatsApp
        console.log(`📲 Sending WhatsApp to ${instructorPhone}...`);

        const sendResult = await wapilotService.sendTextMessage(
          wapilotService.preparePhoneNumber(instructorPhone),
          messageContent,
        );

        successCount++;
        notificationResults.push({
          instructorId,
          instructorName: instructor.name,
          instructorEmail: instructor.email,
          instructorPhone,
          status: "sent",
          customMessage: !!instructorMessages?.[instructorId],
          messagePreview: messageContent.substring(0, 50) + "...",
          sentAt: new Date(),
          wapilotResponse: sendResult,
        });

        console.log(`✅ Message sent successfully to ${instructor.name}`);

        // ✅ تحديث سجل المدرس
        try {
          await User.findByIdAndUpdate(instructor._id, {
            $set: {
              "metadata.lastGroupNotificationSent": new Date(),
              "metadata.lastNotificationGroupId": groupId,
            },
          });
          console.log(`📊 Updated instructor metadata`);
        } catch (updateError) {
          console.warn(
            `⚠️ Could not update instructor metadata:`,
            updateError.message,
          );
        }
      } catch (error) {
        failCount++;
        notificationResults.push({
          instructorId,
          instructorName: instructor.name,
          instructorEmail: instructor.email,
          instructorPhone,
          status: "failed",
          reason: error.message,
          error: error.toString(),
        });
        console.error(`❌ Failed to send to ${instructor.name}:`, error);
      }
    }

    // ✅ تحديث سجل الجروب
    try {
      await Group.findByIdAndUpdate(groupId, {
        $set: {
          "metadata.instructorNotificationsSent": true,
          "metadata.instructorNotificationsSentAt": new Date(),
          "metadata.instructorNotificationResults": notificationResults,
          "metadata.instructorNotificationsSummary": {
            total: group.instructors.length,
            succeeded: successCount,
            failed: failCount,
            timestamp: new Date(),
          },
        },
      });
      console.log(`📊 Updated group metadata`);
    } catch (updateError) {
      console.warn(`⚠️ Could not update group metadata:`, updateError.message);
    }

    console.log(`\n✅ Instructor notifications complete:`);
    console.log(`   Sent: ${successCount}/${group.instructors.length}`);
    console.log(`   Failed: ${failCount}`);

    return {
      success: successCount > 0,
      message: `${successCount} notifications sent, ${failCount} failed`,
      instructorsCount: group.instructors.length,
      notificationsSent: successCount,
      notificationsFailed: failCount,
      successRate: ((successCount / group.instructors.length) * 100).toFixed(1),
      notificationResults,
    };
  } catch (error) {
    console.error("❌ Error in sendInstructorWelcomeMessages:", error);
    throw error;
  }
}

/**
 * ✅ Helper: Send message to student with auto-logging
 * EXISTING - NO CHANGES
 */
async function sendToStudentWithLogging({
  studentId,
  student,
  messageContent,
  messageType,
  language,
  metadata,
}) {
  try {
    const whatsappNumber = student.personalInfo?.whatsappNumber;

    if (!whatsappNumber) {
      console.log(`⚠️ No WhatsApp for ${student.personalInfo?.fullName}`);
      return {
        success: false,
        reason: "No WhatsApp number",
        studentId,
        studentName: student.personalInfo?.fullName,
      };
    }

    await wapilotService.sendAndLogMessage({
      studentId,
      phoneNumber: whatsappNumber,
      messageContent,
      messageType,
      language,
      metadata,
    });

    return {
      success: true,
      studentId,
      studentName: student.personalInfo?.fullName,
      whatsappNumber,
    };
  } catch (error) {
    console.error(
      `❌ Failed to send to ${student.personalInfo?.fullName}:`,
      error,
    );
    return {
      success: false,
      error: error.message,
      studentId,
      studentName: student.personalInfo?.fullName,
    };
  }
}

/**
 * EVENT 2: Student Added to Group
 * EXISTING - NO CHANGES
 */
export async function onStudentAddedToGroup(
  studentId,
  groupId,
  customMessage = null,
  sendWhatsApp = true,
) {
  try {
    console.log(`\n🎯 EVENT: Student Added to Group ==========`);
    console.log(`👤 Student: ${studentId}`);
    console.log(`👥 Group: ${groupId}`);
    console.log(`📝 Custom Message: ${customMessage ? "Yes" : "No"}`);
    console.log(`📱 Send WhatsApp: ${sendWhatsApp}`);

    const [student, group] = await Promise.all([
      Student.findById(studentId),
      Group.findById(groupId).populate("courseId"),
    ]);

    if (!student || !group) {
      throw new Error("Student or Group not found");
    }

    await Student.findByIdAndUpdate(
      studentId,
      {
        $addToSet: { "academicInfo.groupIds": groupId },
        $set: {
          "metadata.updatedAt": new Date(),
          "metadata.lastGroupAdded": new Date(),
        },
      },
      { new: true },
    );

    console.log(
      `✅ Student ${student.personalInfo.fullName} added to group ${group.code}`,
    );

    let welcomeMessageSent = false;
    let messageContent = "";

    if (
      sendWhatsApp &&
      group.automation?.whatsappEnabled &&
      group.automation?.welcomeMessage
    ) {
      console.log("📱 Sending WhatsApp welcome message...");

      const language =
        student.communicationPreferences?.preferredLanguage || "ar";

      let finalMessage;
      if (customMessage) {
        // ✅ التصحيح: استبدال المتغيرات في الرسالة المخصصة
        finalMessage = replaceStudentVariables(customMessage, student, group);
        console.log("📝 Using custom message from admin (variables replaced)");
      } else {
        // ✅ استخدام الرسالة الافتراضية مع اسم الطالب
        finalMessage = prepareGroupWelcomeMessage(
          student.personalInfo.fullName,
          group,
          language,
        );
        console.log("📝 Using default group welcome message");
      }

      messageContent = finalMessage;

      const result = await sendToStudentWithLogging({
        studentId,
        student,
        messageContent: finalMessage,
        messageType: "group_welcome",
        language,
        metadata: {
          groupId: group._id,
          groupName: group.name,
          groupCode: group.code,
          isCustomMessage: !!customMessage,
          automationType: "group_enrollment",
        },
      });

      if (result.success) {
        welcomeMessageSent = true;
        console.log(`✅ Welcome message sent to ${result.studentName}`);
      } else {
        console.log(`⚠️ ${result.reason || result.error}`);
        return {
          success: false,
          message: result.reason || result.error,
          studentName: student.personalInfo.fullName,
        };
      }
    }

    return {
      success: true,
      studentId,
      groupId,
      groupCode: group.code,
      studentName: student.personalInfo.fullName,
      whatsappNumber: student.personalInfo?.whatsappNumber,
      welcomeMessageSent,
      customMessageUsed: !!customMessage,
      messagePreview: messageContent
        ? messageContent.substring(0, 50) + "..."
        : null,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("❌ Error in onStudentAddedToGroup:", error);
    throw error;
  }
}

/**
 * ✅ دالة مساعدة لاستبدال متغيرات الطالب في الرسالة
 */
function replaceStudentVariables(message, student, group) {
  const studentName = student.personalInfo?.fullName || "{studentName}";
  const groupName = group.name || "{groupName}";
  const groupCode = group.code || "{groupCode}";
  const courseName =
    group.courseSnapshot?.title || group.courseId?.title || "{courseName}";

  const startDate = group.schedule?.startDate
    ? new Date(group.schedule.startDate).toLocaleDateString("ar-EG", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "{startDate}";

  const timeFrom = group.schedule?.timeFrom || "{timeFrom}";
  const timeTo = group.schedule?.timeTo || "{timeTo}";

  const instructor = group.instructors?.[0]?.name;
  const instructorText = instructor
    ? `👨‍🏫 المدرب: ${instructor}`
    : "{instructor}";

  return message
    .replace(/\{studentName\}/g, studentName)
    .replace(/\{groupName\}/g, groupName)
    .replace(/\{groupCode\}/g, groupCode)
    .replace(/\{courseName\}/g, courseName)
    .replace(/\{startDate\}/g, startDate)
    .replace(/\{timeFrom\}/g, timeFrom)
    .replace(/\{timeTo\}/g, timeTo)
    .replace(/\{instructor\}/g, instructorText);
}

/**
 * EVENT 4: Attendance Submitted
 * EXISTING - NO CHANGES
 */
export async function onAttendanceSubmitted(sessionId, customMessages = {}) {
  try {
    console.log(`\n📋 ATTENDANCE SUBMITTED ==========`);
    console.log(`📋 Session: ${sessionId}`);
    console.log(`💬 Custom Messages: ${Object.keys(customMessages).length}`);

    const session = await Session.findById(sessionId)
      .populate({
        path: "groupId",
        select: "name code automation",
      })
      .lean();

    if (!session || !session.groupId) {
      return { success: false, error: "Session or group not found" };
    }

    const group = session.groupId;

    if (!group.automation?.notifyGuardianOnAbsence) {
      console.log(`ℹ️ Guardian notifications disabled for this group`);
      return { success: true, message: "Notifications disabled" };
    }

    // Get students who need guardian notification
    const studentsToNotify = session.attendance.filter((record) =>
      ["absent", "late", "excused"].includes(record.status),
    );

    console.log(`👨‍🎓 Students needing notification: ${studentsToNotify.length}`);

    if (studentsToNotify.length === 0) {
      return { success: true, message: "No notifications needed" };
    }

    let successCount = 0;
    let failCount = 0;
    const notificationResults = [];

    for (const record of studentsToNotify) {
      try {
        const student = await Student.findById(record.studentId)
          .select("personalInfo.fullName guardianInfo communicationPreferences")
          .lean();

        if (!student) {
          failCount++;
          continue;
        }

        const guardianWhatsApp = student.guardianInfo?.whatsappNumber;

        if (!guardianWhatsApp) {
          failCount++;
          notificationResults.push({
            studentId: student._id,
            studentName: student.personalInfo?.fullName,
            status: "failed",
            reason: "No guardian WhatsApp number",
          });
          continue;
        }

        // Use custom message if provided, otherwise use default
        let message = customMessages[student._id.toString()];

        if (!message) {
          const statusAr = {
            absent: "غائب",
            late: "متأخر",
            excused: "معذور",
          };

          message = `عزيزي ولي الأمر ${student.guardianInfo?.name || ""},

نود إعلامكم بأن الطالب ${student.personalInfo?.fullName} كان ${
            statusAr[record.status]
          } في حصة ${session.title}.

📅 التاريخ: ${new Date(session.scheduledDate).toLocaleDateString("ar-EG")}
⏰ الوقت: ${session.startTime}

${record.notes ? `\n📝 ملاحظات: ${record.notes}` : ""}

للاستفسار، يرجى التواصل معنا.

مع التحية،
فريق Code School`;
        }

        const result = await wapilotService.sendAndLogMessage({
          studentId: student._id,
          phoneNumber: guardianWhatsApp,
          messageContent: message,
          messageType: "absence_notification",
          language: student.communicationPreferences?.preferredLanguage || "ar",
          metadata: {
            sessionId: session._id,
            sessionTitle: session.title,
            attendanceStatus: record.status,
            recipientType: "guardian",
            guardianName: student.guardianInfo?.name,
            isCustomMessage: !!customMessages[student._id.toString()],
          },
        });

        if (result.success) {
          successCount++;
          notificationResults.push({
            studentId: student._id,
            studentName: student.personalInfo?.fullName,
            status: "sent",
          });
        } else {
          failCount++;
          notificationResults.push({
            studentId: student._id,
            studentName: student.personalInfo?.fullName,
            status: "failed",
            reason: result.error,
          });
        }
      } catch (error) {
        console.error(`Error notifying guardian:`, error);
        failCount++;
      }
    }

    console.log(
      `✅ Guardian notifications: ${successCount}/${studentsToNotify.length}`,
    );

    return {
      success: successCount > 0,
      totalNotifications: studentsToNotify.length,
      successCount,
      failCount,
      notificationResults,
    };
  } catch (error) {
    console.error(`❌ Error in onAttendanceSubmitted:`, error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * EVENT 5: Session Status Changed
 * EXISTING - NO CHANGES
 */
/**
 * EVENT 5: Session Status Changed
 * ✅ FIXED: Variable replacement for guardian/student names
 */
export async function onSessionStatusChanged(
  sessionId,
  newStatus,
  customMessage = null,
) {
  try {
    console.log(`\n🔄 SESSION STATUS CHANGE ==========`);
    console.log(`📋 Session: ${sessionId}`);
    console.log(`📊 New Status: ${newStatus}`);
    console.log(`💬 Custom Message: ${customMessage ? "Yes" : "No"}`);

    if (newStatus !== "cancelled" && newStatus !== "postponed") {
      console.log(`ℹ️ Status ${newStatus} does not trigger notifications`);
      return { success: true, message: "No notifications needed" };
    }

    // Fetch session with group details
    const session = await Session.findById(sessionId)
      .populate({
        path: "groupId",
        populate: {
          path: "students",
          select:
            "personalInfo.fullName personalInfo.whatsappNumber guardianInfo communicationPreferences enrollmentNumber",
          match: { isDeleted: false },
        },
      })
      .lean();

    if (!session) {
      console.log(`❌ Session not found`);
      return { success: false, error: "Session not found" };
    }

    const group = session.groupId;

    // ✅ Get students from both sources
    let students = group?.students || [];

    if (students.length === 0 && group?._id) {
      students = await Student.find({
        "academicInfo.groupIds": group._id,
        isDeleted: false,
      })
        .select(
          "personalInfo.fullName personalInfo.whatsappNumber guardianInfo communicationPreferences enrollmentNumber",
        )
        .lean();
    }

    console.log(`👨‍🎓 Total students: ${students.length}`);

    if (students.length === 0) {
      console.log(`⚠️ No students to notify`);
      return { success: false, error: "No students in group" };
    }

    // Send notifications to all students/guardians
    let successCount = 0;
    let failCount = 0;
    const notificationResults = [];

    for (const student of students) {
      try {
        const studentName = student.personalInfo?.fullName || "الطالب";
        const guardianName = student.guardianInfo?.name || "ولي الأمر";
        const guardianWhatsApp = student.guardianInfo?.whatsappNumber;
        const studentWhatsApp = student.personalInfo?.whatsappNumber;
        const enrollmentNumber = student.enrollmentNumber || "N/A";

        console.log(`\n📱 Processing: ${studentName}`);
        console.log(`   Guardian: ${guardianName}`);
        console.log(`   Guardian WhatsApp: ${guardianWhatsApp || "NOT SET"}`);
        console.log(`   Student WhatsApp: ${studentWhatsApp || "NOT SET"}`);

        // ✅ Determine recipient (prefer guardian for cancellation/postponement)
        const recipientWhatsApp = guardianWhatsApp || studentWhatsApp;
        const recipientType = guardianWhatsApp ? "guardian" : "student";
        const recipientName = guardianWhatsApp ? guardianName : studentName;

        if (!recipientWhatsApp) {
          failCount++;
          notificationResults.push({
            studentId: student._id,
            studentName,
            guardianName,
            status: "failed",
            reason: "No WhatsApp number available",
          });
          continue;
        }

        // ✅ Prepare message with all variables
        let finalMessage = customMessage;

        if (!finalMessage) {
          // Use default template
          const language =
            student.communicationPreferences?.preferredLanguage || "ar";
          finalMessage = prepareSessionUpdateMessage(
            recipientName,
            session,
            group,
            newStatus,
            language,
            guardianName,
            studentName,
            enrollmentNumber,
          );
        } else {
          // ✅ Replace ALL variables in custom message
          const sessionDate = new Date(session.scheduledDate);
          const formattedDate = sessionDate.toLocaleDateString("ar-EG", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });

          const variables = {
            guardianName,
            studentName,
            enrollmentNumber,
            sessionName: session.title || "الجلسة",
            sessionNumber: `الجلسة ${session.sessionNumber || "N/A"}`,
            date: formattedDate,
            time: `${session.startTime} - ${session.endTime}`,
            module: `الوحدة ${(session.moduleIndex || 0) + 1}`,
            groupCode: group.code || "N/A",
            groupName: group.name || "N/A",
            courseName:
              group.courseId?.title || group.courseSnapshot?.title || "الكورس",
            newDate: "{newDate}", // Placeholder
            newTime: "{newTime}", // Placeholder
          };

          // Replace all variables
          Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`\\{${key}\\}`, "g");
            finalMessage = finalMessage.replace(regex, value);
          });

          console.log(`✅ Variables replaced in custom message`);
        }

        console.log(`📤 Sending to ${recipientType}: ${recipientName}`);
        console.log(`   Message preview: ${finalMessage.substring(0, 100)}...`);

        const result = await wapilotService.sendAndLogMessage({
          studentId: student._id,
          phoneNumber: recipientWhatsApp,
          messageContent: finalMessage,
          messageType: "session_" + newStatus,
          language: student.communicationPreferences?.preferredLanguage || "ar",
          metadata: {
            sessionId: session._id,
            sessionTitle: session.title,
            groupId: group._id,
            oldStatus: session.status,
            newStatus,
            isCustomMessage: !!customMessage,
            recipientType,
            guardianName,
            studentName,
            enrollmentNumber,
          },
        });

        if (result.success) {
          successCount++;
          notificationResults.push({
            studentId: student._id,
            studentName,
            guardianName,
            recipientType,
            recipientName,
            whatsappNumber: recipientWhatsApp,
            status: "sent",
            sentAt: new Date(),
          });
          console.log(`✅ Message sent successfully`);
        } else {
          failCount++;
          notificationResults.push({
            studentId: student._id,
            studentName,
            guardianName,
            status: "failed",
            reason: result.error,
          });
          console.log(`❌ Failed: ${result.error}`);
        }
      } catch (error) {
        console.error(`Error notifying student:`, error);
        failCount++;
        notificationResults.push({
          studentId: student._id,
          studentName: student.personalInfo?.fullName || "Unknown",
          status: "failed",
          error: error.message,
        });
      }
    }

    console.log(`✅ Notifications sent: ${successCount}/${students.length}`);

    return {
      success: successCount > 0,
      totalStudents: students.length,
      successCount,
      failCount,
      notificationResults,
    };
  } catch (error) {
    console.error(`❌ Error in onSessionStatusChanged:`, error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * ✅ NEW: Prepare reminder messages for both guardian and student
 */
export function prepareReminderMessages(
  studentName,
  session,
  group,
  reminderType,
  language,
  guardianName,
  enrollmentNumber = "",
) {
  const sessionDate = new Date(session.scheduledDate);
  const formattedDate = sessionDate.toLocaleDateString(
    language === "en" ? "en-US" : "ar-EG",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" },
  );

  // الرسالة لولي الأمر
  const guardianMessage = {};

  // الرسالة للطالب
  const studentMessage = {};

  if (language === "en") {
    if (reminderType === "1hour") {
      // رسالة ولي الأمر (ساعة واحدة)
      guardianMessage.content = `⏰ Session Reminder – Code School

Dear ${guardianName},

This is a reminder for the upcoming session for ${studentName} (ID: ${enrollmentNumber}) at Code School:

📘 Session: ${session.title}
📚 Module: ${session.moduleIndex + 1} – Session ${session.sessionNumber}
👥 Group: ${group.name || group.code}
📅 Date: ${formattedDate}
⏰ Time: ${session.startTime} – ${session.endTime}
${session.meetingLink ? `🔗 Meeting Link: ${session.meetingLink}\n` : ""}

📌 Important Notes:
- Please make sure your child attends on time.
- His laptop is ready & charged.
- In case of absence, please inform us in advance.
- Regular attendance is essential for maintaining learning progress.

We look forward to seeing ${studentName} in the session.
Best regards,
Code School Team 💻`;

      // رسالة الطالب (ساعة واحدة)
      studentMessage.content = `⏰ Session Reminder – Code School

Hello ${studentName},

This is a reminder for your upcoming session at Code School:

📘 Session: ${session.title}
📚 Module: ${session.moduleIndex + 1} – Session ${session.sessionNumber}
👥 Group: ${group.name || group.code}
📅 Date: ${formattedDate}
⏰ Time: ${session.startTime} – ${session.endTime}
${session.meetingLink ? `🔗 Meeting Link: ${session.meetingLink}\n` : ""}

📌 Please prepare:
- Your laptop/device is ready & charged.
- Complete any required pre-work.
- Join the session 5 minutes early.

See you in class! 🚀
Code School Team 💻`;
    } else if (reminderType === "24hours") {
      // رسالة ولي الأمر (24 ساعة)
      guardianMessage.content = `📅 Session Reminder – Code School

Dear ${guardianName},

This is a 24-hour reminder for the upcoming session for ${studentName} (ID: ${enrollmentNumber}) at Code School:

📘 Session: ${session.title}
📚 Module: ${session.moduleIndex + 1} – Session ${session.sessionNumber}
👥 Group: ${group.name || group.code}
📅 Date: ${formattedDate}
⏰ Time: ${session.startTime} – ${session.endTime}

📌 Please note:
- Please confirm your child's attendance.
- Ensure all required materials are prepared.
- Contact us if there are any scheduling conflicts.

Thank you for your cooperation.
Best regards,
Code School Team 💻`;

      // رسالة الطالب (24 ساعة)
      studentMessage.content = `📅 Session Reminder – Code School

Hello ${studentName},

This is a 24-hour reminder for your upcoming session:

📘 Session: ${session.title}
📚 Module: ${session.moduleIndex + 1} – Session ${session.sessionNumber}
👥 Group: ${group.name || group.code}
📅 Date: ${formattedDate}
⏰ Time: ${session.startTime} – ${session.endTime}

📌 Preparation checklist:
- Review previous session materials
- Complete any pending assignments
- Prepare questions for the instructor
- Test your equipment/connection

Get ready for an amazing learning session! 🎯
Code School Team 💻`;
    }
  } else {
    // اللغة العربية
    if (reminderType === "1hour") {
      // رسالة ولي الأمر (ساعة واحدة)
      guardianMessage.content = `⏰ تذكير الجلسة – Code School

عزيزي/عزيزتي ${guardianName}،

هذا تذكير للجلسة القادمة لـ${studentName} (الرقم الجامعي: ${enrollmentNumber}) في Code School:

📘 الجلسة: ${session.title}
📚 الوحدة: ${session.moduleIndex + 1} – الجلسة ${session.sessionNumber}
👥 المجموعة: ${group.name || group.code}
📅 التاريخ: ${formattedDate}
⏰ الوقت: ${session.startTime} – ${session.endTime}
${session.meetingLink ? `🔗 رابط الاجتماع: ${session.meetingLink}\n` : ""}

📌 ملاحظات هامة:
- الرجاء التأكد من حضور طفلك في الوقت المحدد.
- جهازه اللوحي/الكمبيوتر المحمول جاهز ومشحون.
- في حال الغياب، يرجى إبلاغنا مسبقاً.
- الحضور المنتظم ضروري للحفاظ على تقدم التعلم.

نتطلع لرؤية ${studentName} في الجلسة.
أطيب التحيات،
فريق Code School 💻`;

      // رسالة الطالب (ساعة واحدة)
      studentMessage.content = `⏰ تذكير الجلسة – Code School

مرحباً ${studentName}،

هذا تذكير لجلستك القادمة في Code School:

📘 الجلسة: ${session.title}
📚 الوحدة: ${session.moduleIndex + 1} – الجلسة ${session.sessionNumber}
👥 المجموعة: ${group.name || group.code}
📅 التاريخ: ${formattedDate}
⏰ الوقت: ${session.startTime} – ${session.endTime}
${session.meetingLink ? `🔗 رابط الاجتماع: ${session.meetingLink}\n` : ""}

📌 الرجاء التحضير:
- تأكد من جاهزية جهازك وشحن البطارية.
- أكمل أي واجبات مطلوبة مسبقاً.
- انضم للجلسة قبل 5 دقائق من بدايتها.

نراكم في الفصل! 🚀
فريق Code School 💻`;
    } else if (reminderType === "24hours") {
      // رسالة ولي الأمر (24 ساعة)
      guardianMessage.content = `📅 تذكير الجلسة – Code School

عزيزي/عزيزتي ${guardianName}،

هذا تذكير قبل 24 ساعة للجلسة القادمة لـ${studentName} (الرقم الجامعي: ${enrollmentNumber}) في Code School:

📘 الجلسة: ${session.title}
📚 الوحدة: ${session.moduleIndex + 1} – الجلسة ${session.sessionNumber}
👥 المجموعة: ${group.name || group.code}
📅 التاريخ: ${formattedDate}
⏰ الوقت: ${session.startTime} – ${session.endTime}

📌 يرجى ملاحظة:
- الرجاء تأكيد حضور طفلك.
- التأكد من تجهيز جميع المواد المطلوبة.
- التواصل معنا في حال وجود أي تعارض في الجدول.

شكراً لتعاونكم.
أطيب التحيات،
فريق Code School 💻`;

      // رسالة الطالب (24 ساعة)
      studentMessage.content = `📅 تذكير الجلسة – Code School

مرحباً ${studentName}،

هذا تذكير قبل 24 ساعة لجلستك القادمة:

📘 الجلسة: ${session.title}
📚 الوحدة: ${session.moduleIndex + 1} – الجلسة ${session.sessionNumber}
👥 المجموعة: ${group.name || group.code}
📅 التاريخ: ${formattedDate}
⏰ الوقت: ${session.startTime} – ${session.endTime}

📌 قائمة التحضير:
- راجع مواد الجلسة السابقة
- أكمل أي مهام معلقة
- جهز أسئلتك للمدرب
- اختبر جهازك/اتصالك بالإنترنت

استعد لجلسة تعليمية رائعة! 🎯
فريق Code School 💻`;
    }
  }

  guardianMessage.recipientType = "guardian";
  studentMessage.recipientType = "student";

  return { guardianMessage, studentMessage };
}

/**
 * ✅ NEW: Send manual session reminder to both guardian and student
 */
export async function sendManualSessionReminder(sessionId, reminderType) {
  try {
    console.log(`\n🎯 EVENT: Manual Session Reminder ==========`);
    console.log(`📋 Session: ${sessionId}`);
    console.log(`⏰ Type: ${reminderType}`);

    // ✅ استيراد Session هنا فقط
    const Session = (await import("../models/Session")).default;

    const session = await Session.findById(sessionId)
      .populate("groupId")
      .populate("courseId");

    if (!session) {
      throw new Error("Session not found");
    }

    const group = session.groupId;

    if (!group.automation?.whatsappEnabled) {
      return {
        success: false,
        reason: "WhatsApp notifications disabled",
        group: group.name,
      };
    }

    // ✅ استيراد Student هنا فقط
    const Student = (await import("../models/Student")).default;

    // ✅ Get students who need this reminder
    const students = await Student.find({
      "academicInfo.groupIds": group._id,
      isDeleted: false,
    })
      .select(
        "personalInfo.fullName personalInfo.whatsappNumber communicationPreferences guardianInfo enrollmentNumber",
      )
      .lean();

    console.log(`👥 Found ${students.length} students to notify`);

    if (students.length === 0) {
      return {
        success: false,
        reason: "No students found in group",
        group: group.name,
        totalStudents: group.students?.length || 0,
      };
    }

    let guardianSuccessCount = 0;
    let guardianFailCount = 0;
    let studentSuccessCount = 0;
    let studentFailCount = 0;
    const notificationResults = [];

    for (const student of students) {
      try {
        const language =
          student.communicationPreferences?.preferredLanguage || "ar";
        const studentName = student.personalInfo?.fullName || "Student";
        const enrollmentNumber = student.enrollmentNumber || "";

        // ✅ الحصول على معلومات ولي الأمر
        const guardianName = student.guardianInfo?.name || "Guardian";
        const guardianWhatsapp = student.guardianInfo?.whatsappNumber || null;
        const studentWhatsapp = student.personalInfo?.whatsappNumber;

        // ✅ تحضير رسالتي التذكير
        const messages = prepareReminderMessages(
          studentName,
          session,
          group,
          reminderType,
          language,
          guardianName,
          enrollmentNumber,
        );

        console.log(`\n📱 Processing: ${studentName}`);
        console.log(`   📞 Student WhatsApp: ${studentWhatsapp || "NOT SET"}`);
        console.log(
          `   👨‍👦 Guardian WhatsApp: ${guardianWhatsapp || "NOT SET"}`,
        );

        // ✅ إرسال الرسالة لولي الأمر (إذا كان رقم WhatsApp متوفر)
        if (guardianWhatsapp) {
          try {
            await wapilotService.sendAndLogMessage({
              studentId: student._id,
              phoneNumber: guardianWhatsapp,
              messageContent: messages.guardianMessage.content,
              messageType: "session_reminder_guardian",
              language,
              metadata: {
                sessionId: session._id,
                sessionTitle: session.title,
                groupId: group._id,
                groupName: group.name,
                reminderType,
                automationType: "session_reminder",
                recipientType: "guardian",
                guardianName,
              },
            });

            guardianSuccessCount++;
            notificationResults.push({
              studentId: student._id,
              studentName,
              recipientType: "guardian",
              whatsappNumber: guardianWhatsapp,
              status: "sent",
              language,
              sentAt: new Date(),
            });

            console.log(`   ✅ Guardian message sent successfully`);
          } catch (guardianError) {
            guardianFailCount++;
            notificationResults.push({
              studentId: student._id,
              studentName,
              recipientType: "guardian",
              status: "failed",
              error: guardianError.message,
            });
            console.log(
              `   ❌ Guardian message failed: ${guardianError.message}`,
            );
          }
        } else {
          guardianFailCount++;
          notificationResults.push({
            studentId: student._id,
            studentName,
            recipientType: "guardian",
            status: "skipped",
            reason: "No guardian WhatsApp number",
          });
          console.log(`   ⚠️ Guardian message skipped (no WhatsApp number)`);
        }

        // ✅ إرسال الرسالة للطالب (إذا كان رقم WhatsApp متوفر)
        if (studentWhatsapp) {
          try {
            await wapilotService.sendAndLogMessage({
              studentId: student._id,
              phoneNumber: studentWhatsapp,
              messageContent: messages.studentMessage.content,
              messageType: "session_reminder_student",
              language,
              metadata: {
                sessionId: session._id,
                sessionTitle: session.title,
                groupId: group._id,
                groupName: group.name,
                reminderType,
                automationType: "session_reminder",
                recipientType: "student",
              },
            });

            studentSuccessCount++;
            notificationResults.push({
              studentId: student._id,
              studentName,
              recipientType: "student",
              whatsappNumber: studentWhatsapp,
              status: "sent",
              language,
              sentAt: new Date(),
            });

            console.log(`   ✅ Student message sent successfully`);
          } catch (studentError) {
            studentFailCount++;
            notificationResults.push({
              studentId: student._id,
              studentName,
              recipientType: "student",
              status: "failed",
              error: studentError.message,
            });
            console.log(
              `   ❌ Student message failed: ${studentError.message}`,
            );
          }
        } else {
          studentFailCount++;
          notificationResults.push({
            studentId: student._id,
            studentName,
            recipientType: "student",
            status: "skipped",
            reason: "No student WhatsApp number",
          });
          console.log(`   ⚠️ Student message skipped (no WhatsApp number)`);
        }
      } catch (studentError) {
        console.error(`   ❌ Error processing student:`, studentError);
        guardianFailCount++;
        studentFailCount++;
        notificationResults.push({
          studentId: student._id,
          studentName: student.personalInfo?.fullName || "Unknown",
          status: "failed",
          error: studentError.message,
        });
      }
    }

    console.log(`\n📊 Manual reminder summary:`);
    console.log(
      `   📞 Guardian messages: ${guardianSuccessCount} sent, ${guardianFailCount} failed/skipped`,
    );
    console.log(
      `   👨‍🎓 Student messages: ${studentSuccessCount} sent, ${studentFailCount} failed/skipped`,
    );

    return {
      success: guardianSuccessCount > 0 || studentSuccessCount > 0,
      totalStudents: students.length,
      guardian: {
        successCount: guardianSuccessCount,
        failCount: guardianFailCount,
      },
      student: {
        successCount: studentSuccessCount,
        failCount: studentFailCount,
      },
      reminderType,
      sessionTitle: session.title,
      group: group.name,
      notificationResults,
    };
  } catch (error) {
    console.error("❌ Error in sendManualSessionReminder:", error);
    throw error;
  }
}

/**
 * ✅ NEW EVENT 6: Group Completed
 * Triggered when the last session is completed and group status changes to 'completed'
 */
export async function onGroupCompleted(
  groupId,
  customMessage = null,
  feedbackLink = null,
) {
  try {
    console.log(`\n🎯 EVENT: Group Completed ==========`);
    console.log(`👥 Group: ${groupId}`);
    console.log(`📝 Custom Message: ${customMessage ? "Yes" : "No"}`);
    console.log(`📋 Feedback Link: ${feedbackLink || "Not provided"}`);

    // ✅ Fetch group with proper populate
    const group = await Group.findById(groupId)
      .populate("courseId", "title level")
      .populate({
        path: "students",
        select:
          "personalInfo.fullName personalInfo.whatsappNumber enrollmentNumber communicationPreferences guardianInfo",
        match: { isDeleted: false },
      })
      .lean();

    if (!group) {
      console.log(`❌ Group not found: ${groupId}`);
      return {
        success: false,
        error: "Group not found",
        totalStudents: 0,
        successCount: 0,
        failCount: 0,
        notificationResults: [],
      };
    }

    console.log(`✅ Group found: ${group.name} (${group.code})`);
    console.log(`📚 Course: ${group.courseId?.title}`);

    // ✅ Get students from BOTH sources
    let students = group.students || [];
    console.log(`👥 Students from populate: ${students.length}`);

    // ✅ Fallback: If no students from populate, fetch from Student collection
    if (students.length === 0) {
      console.log(
        `⚠️ No students from populate, fetching from Student.academicInfo.groupIds...`,
      );

      students = await Student.find({
        "academicInfo.groupIds": new mongoose.Types.ObjectId(groupId),
        isDeleted: false,
      })
        .select(
          "personalInfo.fullName personalInfo.whatsappNumber enrollmentNumber communicationPreferences guardianInfo",
        )
        .lean();

      console.log(`👥 Students from academicInfo.groupIds: ${students.length}`);
    }

    console.log(`👨‍🎓 Total students: ${students.length}`);

    if (students.length === 0) {
      console.log(`⚠️ No students in group - skipping notifications`);

      // Still update group metadata
      await Group.findByIdAndUpdate(groupId, {
        $set: {
          "metadata.completionMessagesSent": true,
          "metadata.completionMessagesSentAt": new Date(),
          "metadata.completionMessagesSummary": {
            total: 0,
            succeeded: 0,
            failed: 0,
            customMessageUsed: !!customMessage,
            feedbackLinkProvided: !!feedbackLink,
            timestamp: new Date(),
          },
        },
      });

      return {
        success: false,
        error: "No students in group",
        totalStudents: 0,
        successCount: 0,
        failCount: 0,
        customMessageUsed: !!customMessage,
        feedbackLinkProvided: !!feedbackLink,
        successRate: "0%",
        notificationResults: [],
      };
    }

    console.log(
      `📤 Sending completion messages to ${students.length} students...`,
    );

    // ✅ Send messages to all students
    const notificationResults = [];
    let successCount = 0;
    let failCount = 0;

    for (const student of students) {
      try {
        const studentName =
          student.personalInfo?.fullName ||
          student.enrollmentNumber ||
          "Student";
        const whatsappNumber = student.personalInfo?.whatsappNumber;

        console.log(`\n📱 Processing: ${studentName}`);
        console.log(`   WhatsApp: ${whatsappNumber || "NOT SET"}`);

        if (!whatsappNumber) {
          console.log(`   ⚠️ Skipping - no WhatsApp number`);
          failCount++;
          notificationResults.push({
            studentId: student._id,
            studentName,
            whatsappNumber: null,
            status: "failed",
            reason: "No WhatsApp number",
            customMessage: !!customMessage,
            hasFeedbackLink: !!feedbackLink,
          });
          continue;
        }

        // ✅ Prepare message with variable replacement
        let finalMessage =
          customMessage ||
          getDefaultCompletionMessage(
            student.communicationPreferences?.preferredLanguage || "ar",
          );

        // Replace variables
        const variables = {
          studentName,
          courseName: group.courseId?.title || "the course",
          groupCode: group.code,
          groupName: group.name,
        };

        Object.entries(variables).forEach(([key, value]) => {
          const regex = new RegExp(`\\{${key}\\}`, "g");
          finalMessage = finalMessage.replace(regex, value);
        });

        // Add feedback link if provided
        if (feedbackLink) {
          finalMessage += `\n\n📋 نرجو منك تقييم الدورة:\n${feedbackLink}`;
        }

        console.log(`   📤 Sending message (${finalMessage.length} chars)`);

        // ✅ FIXED: Use wapilotService instead of sendWhatsAppMessage
        const result = await wapilotService.sendAndLogMessage({
          studentId: student._id,
          phoneNumber: whatsappNumber,
          messageContent: finalMessage,
          messageType: "custom",
          language: student.communicationPreferences?.preferredLanguage || "ar",
          metadata: {
            groupId: group._id,
            groupName: group.name,
            groupCode: group.code,
            isCustomMessage: !!customMessage,
            hasFeedbackLink: !!feedbackLink,
            automationType: "group_completion",
            recipientType: "student",
          },
        });

        if (result.success) {
          console.log(`   ✅ Message sent successfully`);
          successCount++;
          notificationResults.push({
            studentId: student._id,
            studentName,
            whatsappNumber,
            status: "sent",
            customMessage: !!customMessage,
            hasFeedbackLink: !!feedbackLink,
            messagePreview: finalMessage.substring(0, 100) + "...",
            sentAt: new Date(),
          });
        } else {
          console.log(`   ❌ Failed: ${result.error}`);
          failCount++;
          notificationResults.push({
            studentId: student._id,
            studentName,
            whatsappNumber,
            status: "failed",
            reason: result.error,
            error: result.error,
            customMessage: !!customMessage,
            hasFeedbackLink: !!feedbackLink,
          });
        }
      } catch (error) {
        console.error(`   ❌ Error processing student:`, error);
        failCount++;
        notificationResults.push({
          studentId: student._id,
          studentName: student.personalInfo?.fullName || "Unknown",
          status: "failed",
          error: error.message,
        });
      }
    }

    console.log(`\n📊 Updated group metadata`);

    // ✅ Update group metadata with results
    await Group.findByIdAndUpdate(groupId, {
      $set: {
        "metadata.completionMessagesSent": true,
        "metadata.completionMessagesSentAt": new Date(),
        "metadata.completionMessagesResults": notificationResults,
        "metadata.completionMessagesSummary": {
          total: students.length,
          succeeded: successCount,
          failed: failCount,
          customMessageUsed: !!customMessage,
          feedbackLinkProvided: !!feedbackLink,
          timestamp: new Date(),
        },
      },
    });

    const successRate =
      students.length > 0
        ? `${Math.round((successCount / students.length) * 100)}%`
        : "0%";

    console.log(`\n✅ Completion messages complete:`);
    console.log(`   Sent: ${successCount}/${students.length}`);
    console.log(`   Failed: ${failCount}`);

    return {
      success: successCount > 0,
      totalStudents: students.length,
      successCount,
      failCount,
      customMessageUsed: !!customMessage,
      feedbackLinkProvided: !!feedbackLink,
      successRate,
      notificationResults,
    };
  } catch (error) {
    console.error(`\n❌ Error in onGroupCompleted:`, error);
    return {
      success: false,
      error: error.message,
      totalStudents: 0,
      successCount: 0,
      failCount: 0,
      notificationResults: [],
    };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * ✅ تحضير رسالة الترحيب بالمجموعة مع دعم المتغيرات
 */
function prepareGroupWelcomeMessage(studentName, group, language) {
  const replaceVariables = (template) => {
    return template
      .replace(/\{studentName\}/g, studentName)
      .replace(/\{groupName\}/g, group.name)
      .replace(/\{groupCode\}/g, group.code)
      .replace(
        /\{courseName\}/g,
        group.courseSnapshot?.title || group.courseId?.title || "",
      )
      .replace(
        /\{startDate\}/g,
        new Date(group.schedule?.startDate).toLocaleDateString(
          language === "en" ? "en-US" : "ar-EG",
        ),
      )
      .replace(/\{timeFrom\}/g, group.schedule?.timeFrom || "")
      .replace(/\{timeTo\}/g, group.schedule?.timeTo || "")
      .replace(/\{instructor\}/g, group.instructors?.[0]?.name || "");
  };

  if (language === "en") {
    const defaultTemplate = `🎉 Welcome to ${group.name}!

Dear ${studentName},

You have been enrolled in:
📚 Course: ${group.courseSnapshot?.title || group.courseId?.title}
👥 Group: ${group.code}
📅 Start Date: ${new Date(group.schedule?.startDate).toLocaleDateString(
      "en-US",
    )}
⏰ Time: ${group.schedule?.timeFrom} - ${group.schedule?.timeTo}
${
  group.instructors?.[0]?.name
    ? `👨‍🏫 Instructor: ${group.instructors[0].name}`
    : ""
}

Your learning journey starts soon! 🚀

Best regards,
Code School Team 💻`;

    return replaceVariables(defaultTemplate);
  } else {
    const defaultTemplate = `🎉 مرحباً بك في ${group.name}!

عزيزي/عزيزتي ${studentName},

تم تسجيلك في:
📚 الكورس: ${group.courseSnapshot?.title || group.courseId?.title}
👥 المجموعة: ${group.code}
📅 تاريخ البدء: ${new Date(group.schedule?.startDate).toLocaleDateString(
      "ar-EG",
    )}
⏰ الوقت: ${group.schedule?.timeFrom} - ${group.schedule?.timeTo}
${group.instructors?.[0]?.name ? `👨‍🏫 المدرب: ${group.instructors[0].name}` : ""}

رحلتك التعليمية ستبدأ قريباً! 🚀

مع أطيب التحيات،
فريق Code School 💻`;

    return replaceVariables(defaultTemplate);
  }
}

/**
 * ✅ تحضير رسالة الترحيب الافتراضية للمدرس
 */
function prepareInstructorWelcomeMessage(
  instructorName,
  group,
  language = "ar",
) {
  const startDate = new Date(group.schedule?.startDate).toLocaleDateString(
    language === "en" ? "en-US" : "ar-EG",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

  const studentCount = group.currentStudentsCount || 0;

  if (language === "en") {
    return `🎉 Welcome to Your New Group!

Hello ${instructorName},

Your group has been activated successfully! Here's what you need to know:

📚 Course: ${group.courseSnapshot?.title || group.courseId?.title || "Course"}
👥 Group: ${group.code}
👨‍🎓 Students Enrolled: ${studentCount}

🎬 First Session Details:
📅 Date: ${startDate}
⏰ Time: ${group.schedule?.timeFrom} - ${group.schedule?.timeTo}
📍 Total Sessions: ${group.totalSessionsCount || "N/A"}

Your students are ready and waiting! Let's make this an amazing learning experience. 🚀

Questions? Feel free to reach out to the admin team.

Best regards,
Code School Team 💻`;
  } else {
    return `🎉 مرحباً بك في المجموعة الجديدة!

مرحباً ${instructorName},

تم تفعيل مجموعتك بنجاح! إليك المعلومات الأساسية:

📚 الكورس: ${group.courseSnapshot?.title || group.courseId?.title || "كورس"}
👥 المجموعة: ${group.code}
👨‍🎓 عدد الطلاب: ${studentCount}

🎬 تفاصيل أول حصة:
📅 التاريخ: ${startDate}
⏰ الوقت: ${group.schedule?.timeFrom} - ${group.schedule?.timeTo}
📍 إجمالي الحصص: ${group.totalSessionsCount || "N/A"}

طلابك جاهزين في الانتظار! دعنا نجعل هذه تجربة تعليمية رائعة. 🚀

إذا كان لديك أي أسئلة، لا تتردد في التواصل مع فريق الإدارة.

مع أطيب التحيات،
فريق Code School 💻`;
  }
}

/**
 * ✅ Process custom message with variables
 */
function processCustomMessage(message, student, session, group, status) {
  const guardianName = student.guardianInfo?.name || "Guardian";
  const studentName = student.personalInfo?.fullName || "Student";

  const variables = {
    guardianName,
    studentName,
    sessionName: session.title || "Session",
    sessionNumber: `Session ${session.sessionNumber || "N/A"}`,
    date: session.scheduledDate
      ? new Date(session.scheduledDate).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "N/A",
    time: `${session.startTime} - ${session.endTime}` || "N/A",
    status: status.charAt(0).toUpperCase() + status.slice(1),
    groupCode: group.code || "N/A",
    groupName: group.name || "N/A",
  };

  let processedMessage = message;

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, "g");
    processedMessage = processedMessage.replace(regex, value);
  });

  return processedMessage;
}

/**
 * ✅ Process completion message with variables
 */
function processCompletionMessage(message, student, group, feedbackLink) {
  const studentName = student.personalInfo?.fullName || "Student";
  const courseName =
    group.courseId?.title || group.courseSnapshot?.title || "Course";

  const variables = {
    studentName,
    groupName: group.name,
    groupCode: group.code,
    courseName,
    feedbackLink: feedbackLink || "Contact admin for feedback form",
  };

  let processedMessage = message;

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, "g");
    processedMessage = processedMessage.replace(regex, value);
  });

  return processedMessage;
}

/**
 * ✅ Prepare default completion message
 */
function prepareCompletionMessage(
  studentName,
  group,
  feedbackLink,
  language = "ar",
) {
  const courseName =
    group.courseId?.title || group.courseSnapshot?.title || "Course";

  if (language === "en") {
    return `🎓 Congratulations! You've Completed the Course!

Dear ${studentName},

Congratulations on successfully completing:
📚 ${courseName}
👥 Group: ${group.code}

We're proud of your achievement! 🎉

${
  feedbackLink
    ? `📋 Please share your feedback:\n${feedbackLink}\n\nYour opinion helps us improve! 💡\n`
    : ""
}
📞 Stay in touch for future courses and opportunities!

Thank you for choosing Code School! 🚀

Best regards,
Code School Team 💻`;
  } else {
    return `🎓 مبروك! أتممت الكورس بنجاح!

عزيزي/عزيزتي ${studentName},

مبروك على إتمامك:
📚 ${courseName}
👥 المجموعة: ${group.code}

نحن فخورون بإنجازك! 🎉

${
  feedbackLink
    ? `📋 نرجو منك تقييم تجربتك:\n${feedbackLink}\n\nرأيك يساعدنا على التحسين! 💡\n`
    : ""
}
📞 ابقَ على تواصل للحصول على فرص ودورات جديدة!

شكراً لاختيارك Code School! 🚀

مع أطيب التحيات،
فريق Code School 💻`;
  }
}

/**
 * ✅ Prepare absence notification message
 */
function prepareAbsenceNotificationMessage(
  guardianName,
  studentName,
  session,
  group,
  status = "absent",
  language = "ar",
) {
  const sessionDate = new Date(session.scheduledDate).toLocaleDateString(
    language === "en" ? "en-US" : "ar-EG",
  );

  if (language === "en") {
    if (status === "absent") {
      return `📢 Absence Notification

Dear ${guardianName},

We noticed that ${studentName} was absent from today's session:

📚 Session: ${session.title}
👥 Group: ${group.code}
📅 Date: ${sessionDate}
⏰ Time: ${session.startTime} - ${session.endTime}

Please contact us if you have any questions.

Code School Team 💻`;
    } else if (status === "late") {
      return `⏰ Late Arrival Notification

Dear ${guardianName},

${studentName} arrived late to today's session:

📚 Session: ${session.title}
👥 Group: ${group.code}
📅 Date: ${sessionDate}
⏰ Time: ${session.startTime} - ${session.endTime}

Please ensure punctuality in future sessions.

Code School Team 💻`;
    } else if (status === "excused") {
      return `ℹ️ Excused Absence Notification

Dear ${guardianName},

${studentName} was excused from today's session:

📚 Session: ${session.title}
👥 Group: ${group.code}
📅 Date: ${sessionDate}
⏰ Time: ${session.startTime} - ${session.endTime}

Code School Team 💻`;
    }
  } else {
    if (status === "absent") {
      return `📢 إشعار غياب

عزيزي/عزيزتي ${guardianName},

لاحظنا أن ${studentName} كان/ت غائب/ة عن محاضرة اليوم:

📚 المحاضرة: ${session.title}
👥 المجموعة: ${group.code}
📅 التاريخ: ${sessionDate}
⏰ الوقت: ${session.startTime} - ${session.endTime}

يرجى التواصل معنا في حال وجود أي استفسارات.

فريق Code School 💻`;
    } else if (status === "late") {
      return `⏰ إشعار تأخير

عزيزي/عزيزتي ${guardianName},

${studentName} وصل/ت متأخر/ة إلى محاضرة اليوم:

📚 المحاضرة: ${session.title}
👥 المجموعة: ${group.code}
📅 التاريخ: ${sessionDate}
⏰ الوقت: ${session.startTime} - ${session.endTime}

يرجى الحرص على المواعيد في المحاضرات القادمة.

فريق Code School 💻`;
    } else if (status === "excused") {
      return `ℹ️ إشعار غياب بعذر

عزيزي/عزيزتي ${guardianName},

${studentName} كان/ت غائب/ة بعذر عن محاضرة اليوم:

📚 المحاضرة: ${session.title}
👥 المجموعة: ${group.code}
📅 التاريخ: ${sessionDate}
⏰ الوقت: ${session.startTime} - ${session.endTime}

فريق Code School 💻`;
    }
  }

  return `Notification for ${studentName} - Status: ${status}`;
}

/**
 * ✅ Prepare session update message
 */
/**
 * ✅ Prepare session update message with ALL variables
 */
function prepareSessionUpdateMessage(
  recipientName,
  session,
  group,
  status,
  language = "ar",
  guardianName = "ولي الأمر",
  studentName = "الطالب",
  enrollmentNumber = "N/A",
) {
  const sessionDate = new Date(session.scheduledDate);
  const formattedDate = sessionDate.toLocaleDateString(
    language === "en" ? "en-US" : "ar-EG",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

  const statusText =
    language === "en"
      ? status === "cancelled"
        ? "CANCELLED"
        : "POSTPONED"
      : status === "cancelled"
        ? "ملغاة"
        : "مؤجلة";

  if (language === "en") {
    if (status === "cancelled") {
      return `ℹ️ Session Cancellation Notice – Code School

Dear ${guardianName},

We would like to inform you that today's session has been cancelled by Code School for the following reason:

📘 Session: ${session.title}
👨‍🎓 Student: ${studentName} (ID: ${enrollmentNumber})
📅 Date: ${formattedDate}
⏰ Time: ${session.startTime} - ${session.endTime}

📌 Important Notes:
- This session will NOT be counted against your child's package.
- A makeup session/alternate date will be arranged, and our team will contact you shortly with details.

We apologize for any inconvenience this may cause and appreciate your understanding.

Thank you for trusting Code School.
Best regards,
Code School Team 💻`;
    } else {
      return `📅 Session Rescheduling Notice – Code School

Dear ${guardianName},

We would like to inform you that the upcoming session has been rescheduled by Code School:

📘 Session: ${session.title}
👨‍🎓 Student: ${studentName} (ID: ${enrollmentNumber})
📅 Original Date: ${formattedDate}
⏰ Time: ${session.startTime} - ${session.endTime}

📌 Please Note:
- This session will NOT be lost or deducted from your child's package.
- The full session will be delivered on the new scheduled date.
- No action required from your side.

We apologize for any inconvenience and appreciate your understanding.
Thank you for your continued trust in Code School.
Best regards,
Code School Team 💻`;
    }
  } else {
    // Arabic messages
    if (status === "cancelled") {
      return `ℹ️ إشعار إلغاء الجلسة – Code School

عزيزي/عزيزتي ${guardianName}،

نود إعلامك بأن جلسة اليوم قد تم إلغاؤها من قبل Code School:

📘 الجلسة: ${session.title}
👨‍🎓 الطالب: ${studentName} (الرقم: ${enrollmentNumber})
📅 التاريخ: ${formattedDate}
⏰ الوقت: ${session.startTime} - ${session.endTime}

📌 ملاحظات هامة:
- هذه الجلسة لن تحسب من باقة طفلك.
- سيتم ترتيب جلسة تعويضية / تاريخ بديل، وسيتواصل فريقنا معكم قريباً بالتفاصيل.

نعتذر عن أي إزعاج قد يسببه ذلك ونقدر تفهمكم.

شكراً لثقتكم في Code School.
أطيب التحيات،
إدارة Code School 💻`;
    } else {
      return `📅 إشعار إعادة جدولة الجلسة – Code School

عزيزي/عزيزتي ${guardianName}،

نود إعلامكم بأن الجلسة القادمة تمت إعادة جدولتها من قبل Code School:

📘 الجلسة: ${session.title}
👨‍🎓 الطالب: ${studentName} (الرقم: ${enrollmentNumber})
📅 التاريخ الأصلي: ${formattedDate}
⏰ الوقت: ${session.startTime} - ${session.endTime}

📌 يرجى ملاحظة:
- هذه الجلسة لن تضيع أو تخصم من باقة طفلك.
- سيتم تقديم الجلسة كاملة في التاريخ الجديد المحدد.
- لا يلزم اتخاذ أي إجراء من جانبكم.

نعتذر عن أي إزعاج ونقدر تفهمكم.
شكراً لثقتكم المستمرة في Code School.
أطيب التحيات،
إدارة Code School 💻`;
    }
  }
}

function getDefaultCompletionMessage(language = "ar") {
  if (language === "ar") {
    return `🎓 مبروك {studentName}!

تهانينا على إتمام دورة {courseName} بنجاح! 🎉

نحن فخورون بإنجازك وتفانيك طوال الرحلة التعليمية.

📚 المجموعة: {groupName} ({groupCode})

نتمنى لك التوفيق والنجاح في مسيرتك المهنية! 🚀

مع أطيب التمنيات،
فريق Code School`;
  } else {
    return `🎓 Congratulations {studentName}!

Congratulations on successfully completing {courseName}! 🎉

We are proud of your achievement and dedication throughout the learning journey.

📚 Group: {groupName} ({groupCode})

We wish you success in your professional career! 🚀

Best regards,
Code School Team`;
  }
}
