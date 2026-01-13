// ============================================
// services/groupAutomation.js - ENHANCED WITH GROUP COMPLETION
// ============================================

import Group from "../models/Group";
import Student from "../models/Student";
import Session from "../models/Session";
import User from "../models/User";
import { wapilotService } from "./wapilot-service";

/**
 * ✅ EVENT 1: Group Activated (for session generation)
 * EXISTING - NO CHANGES
 */
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
      `📖 Curriculum modules: ${group.courseId?.curriculum?.length || 0}`
    );

    // ✅ التحقق من إعدادات الجدول
    console.log(`📅 Group Schedule:`);
    console.log(
      `   Start Date: ${
        new Date(group.schedule.startDate).toISOString().split("T")[0]
      }`
    );
    console.log(`   Days of Week: ${group.schedule.daysOfWeek}`);
    console.log(
      `   Time: ${group.schedule.timeFrom} - ${group.schedule.timeTo}`
    );

    // ✅ التحقق من أن هناك 3 أيام مختارة
    if (!group.schedule.daysOfWeek || group.schedule.daysOfWeek.length !== 3) {
      throw new Error("Group must have exactly 3 days selected for schedule");
    }

    // ✅ FIX: حذف أي سيشنات قديمة أولاً قبل إنشاء جديدة
    console.log("🗑️  Hard deleting any existing sessions...");
    const deleteResult = await Session.deleteMany({
      groupId: groupId,
    });
    console.log(`✅ Deleted ${deleteResult.deletedCount} existing sessions`);

    // ✅ Generate Sessions using the updated generateSessionsForGroup
    console.log("📅 Generating new sessions...");

    const { generateSessionsForGroup } = await import(
      "@/utils/sessionGenerator"
    );

    const sessionsResult = await generateSessionsForGroup(
      groupId,
      group,
      userId
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
        `💾 Saving ${sessionsResult.sessions.length} sessions to database...`
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
          `✅ Generated and saved ${sessionsResult.totalGenerated} sessions`
        );
        console.log(`   First session: ${sessionsResult.startDate}`);
        console.log(`   Last session: ${sessionsResult.endDate}`);
      } catch (insertError) {
        console.error("❌ Error inserting sessions:", insertError);

        if (insertError.code === 11000) {
          console.log(
            "🔄 Trying to insert sessions individually with conflict resolution..."
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
                }
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
              `✅ Saved ${successCount} sessions (${errorCount} failed)`
            );
          } else {
            throw new Error(
              `Failed to save any sessions. All ${errorCount} attempts failed.`
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
          `📤 Notify instructor: ${instructor.name} (${instructor.email})`
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
  instructorMessages = {}
) {
  try {
    console.log(`\n🎯 EVENT: Send Instructor Welcome Messages ==========`);
    console.log(`👥 Group: ${groupId}`);
    console.log(
      `📝 Custom Messages Provided: ${Object.keys(instructorMessages).length}`
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
          "ar" // يمكن تحديد اللغة من instructor metadata لو موجودة
        );
        console.log(`📝 Using default message`);
      }

      console.log(`📤 Message preview: ${messageContent.substring(0, 50)}...`);

      try {
        // ✅ إرسال الرسالة عبر WhatsApp
        console.log(`📲 Sending WhatsApp to ${instructorPhone}...`);

        const sendResult = await wapilotService.sendTextMessage(
          wapilotService.preparePhoneNumber(instructorPhone),
          messageContent
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
            updateError.message
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
  metadata
}) {
  try {
    const whatsappNumber = student.personalInfo?.whatsappNumber;
    
    if (!whatsappNumber) {
      console.log(`⚠️ No WhatsApp for ${student.personalInfo?.fullName}`);
      return {
        success: false,
        reason: 'No WhatsApp number',
        studentId,
        studentName: student.personalInfo?.fullName
      };
    }

    await wapilotService.sendAndLogMessage({
      studentId,
      phoneNumber: whatsappNumber,
      messageContent,
      messageType,
      language,
      metadata
    });

    return {
      success: true,
      studentId,
      studentName: student.personalInfo?.fullName,
      whatsappNumber
    };

  } catch (error) {
    console.error(`❌ Failed to send to ${student.personalInfo?.fullName}:`, error);
    return {
      success: false,
      error: error.message,
      studentId,
      studentName: student.personalInfo?.fullName
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
  sendWhatsApp = true
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
      { new: true }
    );

    console.log(`✅ Student ${student.personalInfo.fullName} added to group ${group.code}`);

    let welcomeMessageSent = false;
    let messageContent = "";

    if (
      sendWhatsApp &&
      group.automation?.whatsappEnabled &&
      group.automation?.welcomeMessage
    ) {
      console.log("📱 Sending WhatsApp welcome message...");

      const language = student.communicationPreferences?.preferredLanguage || "ar";

      let finalMessage;
      if (customMessage) {
        finalMessage = customMessage;
        console.log("📝 Using custom message from admin");
      } else {
        finalMessage = prepareGroupWelcomeMessage(
          student.personalInfo.fullName,
          group,
          language
        );
        console.log("📝 Using default welcome message");
      }

      messageContent = finalMessage;

      const result = await sendToStudentWithLogging({
        studentId,
        student,
        messageContent: finalMessage,
        messageType: 'group_welcome',
        language,
        metadata: {
          groupId: group._id,
          groupName: group.name,
          groupCode: group.code,
          isCustomMessage: !!customMessage,
          automationType: 'group_enrollment'
        }
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
      messagePreview: messageContent ? messageContent.substring(0, 50) + "..." : null,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("❌ Error in onStudentAddedToGroup:", error);
    throw error;
  }
}

/**
 * EVENT 4: Attendance Submitted
 * EXISTING - NO CHANGES
 */
export async function onAttendanceSubmitted(sessionId, customMessages = {}) {
  try {
    console.log(`🎯 EVENT: Attendance Submitted - ${sessionId}`);
    console.log(`📝 Custom Messages Provided: ${Object.keys(customMessages).length}`);

    const session = await Session.findById(sessionId)
      .populate("groupId")
      .populate("courseId");

    if (!session) {
      throw new Error("Session not found");
    }

    const group = session.groupId;

    if (
      !group.automation?.whatsappEnabled ||
      !group.automation?.notifyGuardianOnAbsence
    ) {
      console.log("⚠️ Guardian notifications disabled");
      return { success: false, reason: "Notifications disabled" };
    }

    // ✅ REMOVED: التحقق من إرسال سابق - السماح بإعادة الإرسال
    console.log("📱 Guardian notifications enabled - proceeding...");

    const studentsNeedingNotification = session.attendance
      .filter((a) => ["absent", "late", "excused"].includes(a.status))
      .map((a) => a.studentId);

    if (studentsNeedingNotification.length === 0) {
      console.log("✅ No students needing guardian notification");

      // ✅ Reset the flag if no notifications needed
      await Session.findByIdAndUpdate(sessionId, {
        $set: {
          "automationEvents.absentNotificationsSent": false,
          "automationEvents.absentNotificationsSentAt": null,
        },
      });

      return { success: true, notificationCount: 0 };
    }

    console.log(`📤 Notifying guardians of ${studentsNeedingNotification.length} students...`);

    const students = await Student.find({
      _id: { $in: studentsNeedingNotification },
      isDeleted: false,
    });

    let successCount = 0;
    let failCount = 0;
    const notificationResults = [];

    for (const student of students) {
      const guardianWhatsApp = student.guardianInfo?.whatsappNumber;
      const studentId = student._id.toString();

      if (!guardianWhatsApp) {
        failCount++;
        notificationResults.push({
          studentId,
          studentName: student.personalInfo?.fullName,
          status: "failed",
          reason: "No guardian WhatsApp number",
        });
        console.log(
          `⚠️ No guardian WhatsApp for ${student.personalInfo?.fullName}`
        );
        continue;
      }

      const attendanceRecord = session.attendance.find(
        (a) => a.studentId.toString() === studentId
      );
      const studentStatus = attendanceRecord?.status || "absent";

      let messageContent;
      const language = student.communicationPreferences?.preferredLanguage || "ar";

      if (customMessages && customMessages[studentId]) {
        messageContent = processCustomMessage(
          customMessages[studentId],
          student,
          session,
          group,
          studentStatus
        );
        console.log(
          `📝 Using custom message for ${student.personalInfo?.fullName}`
        );
      } else {
        messageContent = prepareAbsenceNotificationMessage(
          student.guardianInfo?.name || "Guardian",
          student.personalInfo?.fullName,
          session,
          group,
          studentStatus,
          language
        );
        console.log(
          `📝 Using default message for ${student.personalInfo?.fullName}`
        );
      }

      try {
        // ✅ Send to guardian with logging (logged under student's record)
        await wapilotService.sendAndLogMessage({
          studentId: student._id,
          phoneNumber: guardianWhatsApp,
          messageContent,
          messageType: 'absence_notification',
          language,
          metadata: {
            sessionId: session._id,
            sessionTitle: session.title,
            groupId: group._id,
            groupName: group.name,
            attendanceStatus: studentStatus,
            isCustomMessage: !!customMessages[studentId],
            recipientType: 'guardian',
            guardianName: student.guardianInfo?.name,
            automationType: 'attendance_notification'
          }
        });

        successCount++;
        notificationResults.push({
          studentId,
          studentName: student.personalInfo?.fullName,
          guardianName: student.guardianInfo?.name,
          guardianWhatsApp,
          status: "sent",
          customMessage: !!customMessages[studentId],
          messagePreview: messageContent.substring(0, 50) + "...",
          sentAt: new Date(),
        });

        console.log(`✅ Notification sent to guardian of ${student.personalInfo?.fullName}`);

      } catch (error) {
        failCount++;
        notificationResults.push({
          studentId,
          studentName: student.personalInfo?.fullName,
          guardianWhatsApp,
          status: "failed",
          reason: error.message,
          error: error.toString(),
        });
        console.error(`❌ Failed to notify guardian:`, error);
      }
    }

    await Session.findByIdAndUpdate(sessionId, {
      $set: {
        "automationEvents.absentNotificationsSent": true,
        "automationEvents.absentNotificationsSentAt": new Date(),
        "automationEvents.customMessagesUsed": Object.keys(customMessages).length > 0,
        "automationEvents.notificationResults": notificationResults,
        "automationEvents.lastNotificationAttempt": new Date(),
      },
    });

    console.log(`✅ Notifications complete: ${successCount} sent, ${failCount} failed`);

    return {
      success: true,
      totalStudents: students.length,
      successCount,
      failCount,
      customMessagesUsed: Object.keys(customMessages).length,
      notificationResults,
    };
  } catch (error) {
    console.error("❌ Error in onAttendanceSubmitted:", error);
    throw error;
  }
}

/**
 * EVENT 5: Session Status Changed
 * EXISTING - NO CHANGES
 */
export async function onSessionStatusChanged(
  sessionId,
  newStatus,
  customMessage = ""
) {
  try {
    console.log(`🎯 EVENT: Session Status Changed - ${sessionId} to ${newStatus}`);

    if (newStatus !== "cancelled" && newStatus !== "postponed") {
      return { success: true, notificationRequired: false };
    }

    const session = await Session.findById(sessionId)
      .populate("groupId")
      .populate("courseId");

    if (!session) {
      throw new Error("Session not found");
    }

    const group = session.groupId;

    if (
      !group.automation?.whatsappEnabled ||
      !group.automation?.notifyOnSessionUpdate
    ) {
      console.log("⚠️ Notifications disabled for this group");
      return { success: false, reason: "Notifications disabled" };
    }

    const students = await Student.find({
      _id: { $in: group.students },
      isDeleted: false,
    });

    console.log(`📤 Sending ${newStatus} notifications to ${students.length} students...`);

    let successCount = 0;
    let failCount = 0;
    const failedStudents = [];

    for (const student of students) {
      const language = student.communicationPreferences?.preferredLanguage || "ar";

      const messageContent = customMessage
        ? customMessage
        : prepareSessionUpdateMessage(
            student.personalInfo.fullName,
            session,
            group,
            newStatus,
            language
          );

      try {
        // ✅ Send with auto-logging
        await sendToStudentWithLogging({
          studentId: student._id,
          student,
          messageContent,
          messageType: newStatus === 'cancelled' ? 'session_cancelled' : 'session_postponed',
          language,
          metadata: {
            sessionId: session._id,
            sessionTitle: session.title,
            groupId: group._id,
            groupName: group.name,
            oldStatus: session.status,
            newStatus,
            isCustomMessage: !!customMessage,
            automationType: 'session_status_change'
          }
        });

        successCount++;
        console.log(`✅ Message sent to ${student.personalInfo.fullName}`);

      } catch (error) {
        failCount++;
        failedStudents.push(student.personalInfo.fullName);
        console.error(`❌ Failed to send message to ${student.personalInfo.fullName}:`, error);
      }
    }

    const updateField =
      newStatus === "cancelled"
        ? "cancelNotificationSent"
        : "postponeNotificationSent";

    await Session.findByIdAndUpdate(sessionId, {
      $set: {
        [`automationEvents.${updateField}`]: true,
        [`automationEvents.${updateField}At`]: new Date(),
        "metadata.updatedAt": new Date(),
      },
    });

    console.log(`✅ Complete: ${successCount} sent, ${failCount} failed`);

    return {
      success: true,
      status: newStatus,
      totalStudents: students.length,
      successCount,
      failCount,
      failedStudents: failedStudents.length > 0 ? failedStudents : null,
      customMessageUsed: !!customMessage,
    };
  } catch (error) {
    console.error("❌ Error in onSessionStatusChanged:", error);
    throw error;
  }
}

/**
 * ✅ Prepare reminder message (used by both cron and manual)
 * EXISTING - NO CHANGES
 */
export function prepareReminderMessage(
  studentName,
  session,
  group,
  reminderType,
  language
) {
  const sessionDate = new Date(session.scheduledDate);
  const formattedDate = sessionDate.toLocaleDateString(
    language === "en" ? "en-US" : "ar-EG",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" }
  );

  const timeWindow =
    reminderType === "24hours"
      ? language === "en"
        ? "24 hours"
        : "24 ساعة"
      : language === "en"
      ? "1 hour"
      : "ساعة واحدة";

  if (language === "en") {
    return `⏰ Session Reminder (${timeWindow})

Hello ${studentName}!

Your upcoming session is in ${timeWindow}:

📚 Session: ${session.title}
📖 Module ${session.moduleIndex + 1} - Session ${session.sessionNumber}
👥 Group: ${group.code || group.name}
📅 Date: ${formattedDate}
⏰ Time: ${session.startTime} - ${session.endTime}

${session.meetingLink ? `🔗 Meeting Link: ${session.meetingLink}\n` : ""}
${reminderType === "24hours" ? "Be ready for tomorrow!" : "Session starts soon!"}

See you there! 🚀

Code School Team 💻`;
  } else {
    return `⏰ تذكير بالمحاضرة (خلال ${timeWindow})

مرحباً ${studentName}!

محاضرتك القادمة خلال ${timeWindow}:

📚 المحاضرة: ${session.title}
📖 الوحدة ${session.moduleIndex + 1} - الحصة ${session.sessionNumber}
👥 المجموعة: ${group.code || group.name}
📅 التاريخ: ${formattedDate}
⏰ الوقت: ${session.startTime} - ${session.endTime}

${session.meetingLink ? `🔗 رابط الاجتماع: ${session.meetingLink}\n` : ""}
${reminderType === "24hours" ? "كن مستقداً للغد!" : "المحاضرة ستبدأ قريباً!"}

نراك هناك! 🚀

فريق Code School 💻`;
  }
}

/**
 * ✅ Send manual session reminder
 * EXISTING - NO CHANGES
 */
export async function sendManualSessionReminder(sessionId, reminderType) {
  try {
    console.log(`\n🎯 EVENT: Manual Session Reminder ==========`);
    console.log(`📋 Session: ${sessionId}`);
    console.log(`⏰ Type: ${reminderType}`);

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

    // ✅ Get students who need this reminder
    const students = await Student.getStudentsForReminder(
      group._id,
      session._id,
      reminderType
    );

    console.log(`👥 Found ${students.length} students to notify`);

    if (students.length === 0) {
      return {
        success: false,
        reason: "All students already received this reminder",
        group: group.name,
        totalStudents: group.students?.length || 0,
      };
    }

    let successCount = 0;
    let failCount = 0;
    const notificationResults = [];

    for (const student of students) {
      try {
        const language = student.communicationPreferences?.preferredLanguage || "ar";

        const message = prepareReminderMessage(
          student.personalInfo?.fullName,
          session,
          group,
          reminderType,
          language
        );

        // ✅ Send with auto-logging
        await wapilotService.sendAndLogMessage({
          studentId: student._id,
          phoneNumber: student.personalInfo?.whatsappNumber,
          messageContent: message,
          messageType: 'session_reminder',
          language,
          metadata: {
            sessionId: session._id,
            sessionTitle: session.title,
            groupId: group._id,
            groupName: group.name,
            reminderType,
            automationType: 'session_reminder'
          }
        });

        // ✅ Also add to sessionReminders array
        await student.addSessionReminder({
          sessionId: session._id,
          groupId: group._id,
          reminderType,
          message,
          language,
          status: 'sent',
          sessionDetails: {
            title: session.title,
            scheduledDate: session.scheduledDate,
            startTime: session.startTime,
            endTime: session.endTime,
            moduleIndex: session.moduleIndex,
            sessionNumber: session.sessionNumber,
          },
        });

        successCount++;
        notificationResults.push({
          studentId: student._id,
          studentName: student.personalInfo?.fullName,
          whatsappNumber: student.personalInfo?.whatsappNumber,
          status: "sent",
          language,
          sentAt: new Date(),
        });

      } catch (studentError) {
        failCount++;
        notificationResults.push({
          studentId: student._id,
          studentName: student.personalInfo?.fullName,
          status: "failed",
          error: studentError.message,
        });
      }
    }

    console.log(`\n✅ Manual reminder complete: ${successCount} sent, ${failCount} failed`);

    return {
      success: successCount > 0,
      totalStudents: students.length,
      successCount,
      failCount,
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
export async function onGroupCompleted(groupId, customMessage = null, feedbackLink = null) {
  try {
    console.log(`\n🎯 EVENT: Group Completed ==========`);
    console.log(`👥 Group: ${groupId}`);
    console.log(`📝 Custom Message: ${customMessage ? "Yes" : "No"}`);
    console.log(`📋 Feedback Link: ${feedbackLink || "Not provided"}`);

    const group = await Group.findById(groupId)
      .populate("courseId", "title level")
      .populate("students");

    if (!group) {
      throw new Error("Group not found");
    }

    console.log(`✅ Group found: ${group.name} (${group.code})`);
    console.log(`📚 Course: ${group.courseId?.title}`);
    console.log(`👨‍🎓 Total students: ${group.students?.length || 0}`);

    // ✅ Check if automation is enabled
    if (!group.automation?.whatsappEnabled || !group.automation?.completionMessage) {
      console.log("⚠️ Completion messages disabled for this group");
      return {
        success: false,
        reason: "Completion messages disabled",
        groupName: group.name,
      };
    }

    // ✅ Check if already sent
    if (group.metadata?.completionMessagesSent) {
      console.log("⚠️ Completion messages already sent");
      return {
        success: false,
        reason: "Completion messages already sent",
        groupName: group.name,
        sentAt: group.metadata.completionMessagesSentAt,
      };
    }

    const students = await Student.find({
      _id: { $in: group.students },
      isDeleted: false,
    });

    console.log(`📤 Sending completion messages to ${students.length} students...`);

    let successCount = 0;
    let failCount = 0;
    const notificationResults = [];

    // ✅ Process each student
    for (const student of students) {
      const studentId = student._id.toString();
      const whatsappNumber = student.personalInfo?.whatsappNumber;
      const studentName = student.personalInfo?.fullName || student.enrollmentNumber;

      console.log(`\n📱 Processing student: ${studentName}`);
      console.log(`   WhatsApp: ${whatsappNumber || "Not found"}`);

      if (!whatsappNumber) {
        failCount++;
        notificationResults.push({
          studentId,
          studentName,
          status: "failed",
          reason: "No WhatsApp number",
        });
        console.log(`⚠️ No WhatsApp for ${studentName}`);
        continue;
      }

      const language = student.communicationPreferences?.preferredLanguage || "ar";

      // ✅ Prepare message content
      let messageContent;

      if (customMessage) {
        // Use custom message from admin with variable replacement
        messageContent = processCompletionMessage(
          customMessage,
          student,
          group,
          feedbackLink
        );
        console.log(`📝 Using custom message from admin`);
      } else {
        // Use default completion message
        messageContent = prepareCompletionMessage(
          studentName,
          group,
          feedbackLink,
          language
        );
        console.log(`📝 Using default completion message`);
      }

      console.log(`📤 Message preview: ${messageContent.substring(0, 50)}...`);

      try {
        // ✅ Send with auto-logging
        await wapilotService.sendAndLogMessage({
          studentId: student._id,
          phoneNumber: whatsappNumber,
          messageContent,
          messageType: 'group_completion',
          language,
          metadata: {
            groupId: group._id,
            groupName: group.name,
            groupCode: group.code,
            courseTitle: group.courseId?.title,
            isCustomMessage: !!customMessage,
            hasFeedbackLink: !!feedbackLink,
            feedbackLink: feedbackLink || null,
            automationType: 'group_completion'
          }
        });

        successCount++;
        notificationResults.push({
          studentId,
          studentName,
          whatsappNumber,
          status: "sent",
          customMessage: !!customMessage,
          hasFeedbackLink: !!feedbackLink,
          messagePreview: messageContent.substring(0, 50) + "...",
          sentAt: new Date(),
        });

        console.log(`✅ Completion message sent to ${studentName}`);

      } catch (error) {
        failCount++;
        notificationResults.push({
          studentId,
          studentName,
          whatsappNumber,
          status: "failed",
          reason: error.message,
          error: error.toString(),
        });
        console.error(`❌ Failed to send to ${studentName}:`, error);
      }
    }

    // ✅ Update group metadata
    try {
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
      console.log(`📊 Updated group metadata`);
    } catch (updateError) {
      console.warn(`⚠️ Could not update group metadata:`, updateError.message);
    }

    console.log(`\n✅ Completion messages complete:`);
    console.log(`   Sent: ${successCount}/${students.length}`);
    console.log(`   Failed: ${failCount}`);

    return {
      success: successCount > 0,
      message: `${successCount} completion messages sent, ${failCount} failed`,
      groupName: group.name,
      groupCode: group.code,
      courseName: group.courseId?.title,
      totalStudents: students.length,
      successCount,
      failCount,
      customMessageUsed: !!customMessage,
      feedbackLinkProvided: !!feedbackLink,
      successRate: ((successCount / students.length) * 100).toFixed(1),
      notificationResults,
    };

  } catch (error) {
    console.error("❌ Error in onGroupCompleted:", error);
    throw error;
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
        group.courseSnapshot?.title || group.courseId?.title || ""
      )
      .replace(
        /\{startDate\}/g,
        new Date(group.schedule?.startDate).toLocaleDateString(
          language === "en" ? "en-US" : "ar-EG"
        )
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
📅 Start Date: ${new Date(group.schedule?.startDate).toLocaleDateString("en-US")}
⏰ Time: ${group.schedule?.timeFrom} - ${group.schedule?.timeTo}
${group.instructors?.[0]?.name ? `👨‍🏫 Instructor: ${group.instructors[0].name}` : ""}

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
📅 تاريخ البدء: ${new Date(group.schedule?.startDate).toLocaleDateString("ar-EG")}
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
  language = "ar"
) {
  const startDate = new Date(group.schedule?.startDate).toLocaleDateString(
    language === "en" ? "en-US" : "ar-EG",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
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
  const courseName = group.courseId?.title || group.courseSnapshot?.title || "Course";

  const variables = {
    studentName,
    groupName: group.name,
    groupCode: group.code,
    courseName,
    feedbackLink: feedbackLink || "Contact admin for feedback form"
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
function prepareCompletionMessage(studentName, group, feedbackLink, language = "ar") {
  const courseName = group.courseId?.title || group.courseSnapshot?.title || "Course";

  if (language === "en") {
    return `🎓 Congratulations! You've Completed the Course!

Dear ${studentName},

Congratulations on successfully completing:
📚 ${courseName}
👥 Group: ${group.code}

We're proud of your achievement! 🎉

${feedbackLink ? `📋 Please share your feedback:\n${feedbackLink}\n\nYour opinion helps us improve! 💡\n` : ""}
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

${feedbackLink ? `📋 نرجو منك تقييم تجربتك:\n${feedbackLink}\n\nرأيك يساعدنا على التحسين! 💡\n` : ""}
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
  language = "ar"
) {
  const sessionDate = new Date(session.scheduledDate).toLocaleDateString(
    language === "en" ? "en-US" : "ar-EG"
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
function prepareSessionUpdateMessage(
  studentName,
  session,
  group,
  status,
  language = "ar"
) {
  const statusText =
    language === "en"
      ? status === "cancelled"
        ? "CANCELLED"
        : "POSTPONED"
      : status === "cancelled"
      ? "ملغاة"
      : "مؤجلة";

  if (language === "en") {
    return `⚠️ Session ${statusText}

Hello ${studentName},

The following session has been ${status}:

📚 Session: ${session.title}
👥 Group: ${group.code}
📅 Original Date: ${new Date(session.scheduledDate).toLocaleDateString("en-US")}
⏰ Time: ${session.startTime} - ${session.endTime}

We will notify you with updates.

Code School Team 💻`;
  } else {
    return `⚠️ المحاضرة ${statusText}

مرحباً ${studentName},

تم ${status === "cancelled" ? "إلغاء" : "تأجيل"} المحاضرة التالية:

📚 المحاضرة: ${session.title}
👥 المجموعة: ${group.code}
📅 التاريخ الأصلي: ${new Date(session.scheduledDate).toLocaleDateString("ar-EG")}
⏰ الوقت: ${session.startTime} - ${session.endTime}

سنوافيك بالتحديثات.

فريق Code School 💻`;
  }
}