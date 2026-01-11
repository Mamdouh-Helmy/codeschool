// services/groupAutomation.js
import Group from "../models/Group";
import Student from "../models/Student";
import Session from "../models/Session";
import { wapilotService } from "./wapilot-service";

/**
 * EVENT 2: Student Added to Group (مع الرسالة المخصصة)
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

    // 1. Update Student's groupIds
    console.log("📝 Updating student record...");

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

    console.log(
      `✅ Student ${student.personalInfo.fullName} added to group ${group.code}`
    );

    let welcomeMessageSent = false;
    let messageContent = "";

    // 2. Send Welcome Message (إما مخصصة أو افتراضية)
    if (
      sendWhatsApp &&
      group.automation?.whatsappEnabled &&
      group.automation?.welcomeMessage
    ) {
      console.log("📱 Sending WhatsApp welcome message...");

      const whatsappNumber = student.personalInfo?.whatsappNumber;

      if (whatsappNumber) {
        let finalMessage;

        if (customMessage) {
          // ✅ استخدم الرسالة المخصصة من المدير
          finalMessage = customMessage;
          console.log("📝 Using custom message from admin");
        } else {
          // استخدم الرسالة الافتراضية
          finalMessage = prepareGroupWelcomeMessage(
            student.personalInfo.fullName,
            group,
            student.communicationPreferences?.preferredLanguage || "ar"
          );
          console.log("📝 Using default welcome message");
        }

        messageContent = finalMessage;
        console.log(
          "📤 WhatsApp Message Content Preview:",
          finalMessage.substring(0, 100) + "..."
        );

        try {
          // إرسال الرسالة عبر واتساب
          const sendResult = await wapilotService.sendTextMessage(
            wapilotService.preparePhoneNumber(whatsappNumber),
            finalMessage
          );

          console.log("✅ Welcome message sent successfully");
          console.log("📊 Send Result:", sendResult);

          welcomeMessageSent = true;

          // تحديث سجل الطالب
          await Student.findByIdAndUpdate(studentId, {
            $set: {
              "metadata.whatsappGroupWelcomeSent": true,
              "metadata.whatsappGroupWelcomeSentAt": new Date(),
              "metadata.whatsappLastInteraction": new Date(),
              "metadata.lastMessageSent":
                finalMessage.substring(0, 200) +
                (finalMessage.length > 200 ? "..." : ""),
              "metadata.lastMessageGroup": groupId,
            },
          });
        } catch (whatsappError) {
          console.error("❌ Failed to send WhatsApp welcome:", whatsappError);
          throw new Error(`WhatsApp send failed: ${whatsappError.message}`);
        }
      } else {
        console.log("⚠️ Student has no WhatsApp number registered");
        return {
          success: false,
          message: "Student has no WhatsApp number",
          studentName: student.personalInfo.fullName,
        };
      }
    } else {
      console.log("⚠️ WhatsApp notifications disabled or sendWhatsApp = false");
      console.log("🔧 Automation settings:", {
        whatsappEnabled: group.automation?.whatsappEnabled,
        welcomeMessage: group.automation?.welcomeMessage,
        sendWhatsApp,
      });
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
 * تحضير رسالة الترحيب بالمجموعة مع دعم المتغيرات
 */
function prepareGroupWelcomeMessage(studentName, group, language) {
  // استبدال المتغيرات في القالب
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
📅 Start Date: ${new Date(group.schedule?.startDate).toLocaleDateString(
      "en-US"
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
      "ar-EG"
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
 * EVENT 1: Group Activated
 * Triggers: Session generation + Instructor notification
 */
export async function onGroupActivated(groupId, userId) {
  try {
    console.log(`🎯 EVENT: Group Activated - ${groupId}`);

    // ✅ Re-fetch group to ensure we have the ACTIVE status
    const group = await Group.findById(groupId)
      .populate("courseId")
      .populate("instructors", "name email");

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

    // ✅ FIX: حذف الفهرس القديم أولاً إذا كان موجوداً
    try {
      await Session.collection.dropIndex(
        "groupId_1_moduleIndex_1_lessonIndex_1_sessionIndex_1"
      );
      console.log("✅ Deleted problematic duplicate index");
    } catch (dropError) {
      console.log("ℹ️  Index not found or already deleted");
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
        // ✅ FIX: إعادة إنشاء الفهرس الصحيح أولاً
        try {
          await Session.collection.createIndex(
            { groupId: 1, moduleIndex: 1, sessionNumber: 1 },
            {
              unique: true,
              name: "unique_session_per_group_module",
              background: true,
            }
          );
          console.log("✅ Created correct unique index");
        } catch (indexError) {
          console.log("ℹ️  Index may already exist:", indexError.message);
        }

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
 * EVENT 3: Session Reminder
 */
export async function sendSessionReminders(sessionId) {
  try {
    console.log(`🎯 EVENT: Sending Session Reminders - ${sessionId}`);

    const session = await Session.findById(sessionId)
      .populate("groupId")
      .populate("courseId");

    if (!session) {
      throw new Error("Session not found");
    }

    const group = session.groupId;

    if (
      !group.automation?.whatsappEnabled ||
      !group.automation?.reminderEnabled
    ) {
      console.log("⚠️ Reminders disabled for this group");
      return { success: false, reason: "Reminders disabled" };
    }

    if (session.automationEvents?.reminderSent) {
      console.log("⚠️ Reminder already sent for this session");
      return { success: false, reason: "Already sent" };
    }

    const students = await Student.find({
      _id: { $in: group.students },
      isDeleted: false,
    });

    console.log(`📤 Sending reminders to ${students.length} students...`);

    let successCount = 0;
    let failCount = 0;

    for (const student of students) {
      const whatsappNumber = student.personalInfo.whatsappNumber;

      if (!whatsappNumber) {
        failCount++;
        continue;
      }

      const reminderMessage = prepareSessionReminderMessage(
        student.personalInfo.fullName,
        session,
        group,
        student.communicationPreferences?.preferredLanguage || "ar"
      );

      try {
        await wapilotService.sendTextMessage(
          wapilotService.preparePhoneNumber(whatsappNumber),
          reminderMessage
        );

        successCount++;
      } catch (error) {
        failCount++;
        console.error(
          `❌ Failed to send reminder to ${student.personalInfo.fullName}:`,
          error
        );
      }
    }

    await Session.findByIdAndUpdate(sessionId, {
      $set: {
        "automationEvents.reminderSent": true,
        "automationEvents.reminderSentAt": new Date(),
        "metadata.updatedAt": new Date(),
      },
    });

    console.log(
      `✅ Reminders complete: ${successCount} sent, ${failCount} failed`
    );

    return {
      success: true,
      totalStudents: students.length,
      successCount,
      failCount,
    };
  } catch (error) {
    console.error("❌ Error in sendSessionReminders:", error);
    throw error;
  }
}

/**
 * EVENT 4: Attendance Submitted - ✅ FIXED VERSION
 * يسمح بإعادة إرسال الرسائل عند تحديث الحضور
 */
export async function onAttendanceSubmitted(sessionId, customMessages = {}) {
  try {
    console.log(`🎯 EVENT: Attendance Submitted - ${sessionId}`);
    console.log(`📝 Custom Messages Provided: ${Object.keys(customMessages).length}`);

    const session = await Session.findById(sessionId)
      .populate('groupId')
      .populate('courseId');

    if (!session) {
      throw new Error('Session not found');
    }

    const group = session.groupId;

    if (
      !group.automation?.whatsappEnabled ||
      !group.automation?.notifyGuardianOnAbsence
    ) {
      console.log('⚠️ Guardian notifications disabled');
      return { success: false, reason: 'Notifications disabled' };
    }

    // ✅ REMOVED: التحقق من إرسال سابق - السماح بإعادة الإرسال
    console.log('📱 Guardian notifications enabled - proceeding...');

    // ✅ Get students who need notifications (absent, late, or excused)
    const studentsNeedingNotification = session.attendance
      .filter((a) => ["absent", "late", "excused"].includes(a.status))
      .map((a) => a.studentId);

    if (studentsNeedingNotification.length === 0) {
      console.log('✅ No students needing guardian notification');
      
      // ✅ Reset the flag if no notifications needed
      await Session.findByIdAndUpdate(sessionId, {
        $set: {
          "automationEvents.absentNotificationsSent": false,
          "automationEvents.absentNotificationsSentAt": null,
        },
      });
      
      return { success: true, notificationCount: 0 };
    }

    console.log(
      `📤 Notifying guardians of ${studentsNeedingNotification.length} students...`
    );

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
        console.log(`⚠️ No guardian WhatsApp for ${student.personalInfo?.fullName}`);
        continue;
      }

      // ✅ الحصول على حالة الطالب
      const attendanceRecord = session.attendance.find(
        (a) => a.studentId.toString() === studentId
      );
      const studentStatus = attendanceRecord?.status || "absent";

      // ✅ استخدام الرسالة المخصصة إذا كانت موجودة
      let messageContent;

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
          student.communicationPreferences?.preferredLanguage || "ar"
        );
        console.log(
          `📝 Using default message for ${student.personalInfo?.fullName}`
        );
      }

      try {
        console.log(`📱 Sending WhatsApp to guardian of ${student.personalInfo?.fullName}...`);
        console.log(`   Guardian: ${student.guardianInfo?.name}`);
        console.log(`   WhatsApp: ${guardianWhatsApp}`);
        console.log(`   Status: ${studentStatus}`);
        console.log(`   Message Preview: ${messageContent.substring(0, 100)}...`);
        
        const sendResult = await wapilotService.sendTextMessage(
          wapilotService.preparePhoneNumber(guardianWhatsApp),
          messageContent
        );

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
          wapilotResponse: sendResult
        });

        console.log(
          `✅ Notification sent to guardian of ${student.personalInfo?.fullName}`
        );
        
      } catch (error) {
        failCount++;
        notificationResults.push({
          studentId,
          studentName: student.personalInfo?.fullName,
          guardianWhatsApp,
          status: "failed",
          reason: error.message,
          error: error.toString()
        });
        console.error(`❌ Failed to notify guardian:`, error);
        console.error(`   Student: ${student.personalInfo?.fullName}`);
        console.error(`   Guardian WhatsApp: ${guardianWhatsApp}`);
      }
    }

    // ✅ تحديث السيشن
    await Session.findByIdAndUpdate(sessionId, {
      $set: {
        "automationEvents.absentNotificationsSent": true,
        "automationEvents.absentNotificationsSentAt": new Date(),
        "automationEvents.customMessagesUsed":
          Object.keys(customMessages).length > 0,
        "automationEvents.notificationResults": notificationResults,
        "automationEvents.lastNotificationAttempt": new Date(),
      },
    });

    console.log(
      `✅ Notifications complete: ${successCount} sent, ${failCount} failed`
    );
    console.log(`📊 Success rate: ${((successCount / students.length) * 100).toFixed(1)}%`);

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
 */
export async function onSessionStatusChanged(
  sessionId,
  newStatus,
  customMessage = ""
) {
  try {
    console.log(
      `🎯 EVENT: Session Status Changed - ${sessionId} to ${newStatus}`
    );
    console.log(
      `📝 Custom Message: ${customMessage ? "Yes" : "No (using default)"}`
    );

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

    console.log(
      `📤 Sending ${newStatus} notifications to ${students.length} students...`
    );

    let successCount = 0;
    let failCount = 0;
    const failedStudents = [];

    for (const student of students) {
      const whatsappNumber = student.personalInfo.whatsappNumber;

      if (!whatsappNumber) {
        failCount++;
        failedStudents.push(student.personalInfo.fullName);
        continue;
      }

      const messageContent = customMessage
        ? customMessage
        : prepareSessionUpdateMessage(
            student.personalInfo.fullName,
            session,
            group,
            newStatus,
            student.communicationPreferences?.preferredLanguage || "ar"
          );

      try {
        console.log(`📤 Sending to ${student.personalInfo.fullName}...`);

        await wapilotService.sendTextMessage(
          wapilotService.preparePhoneNumber(whatsappNumber),
          messageContent
        );

        successCount++;
        console.log(`✅ Message sent to ${student.personalInfo.fullName}`);
      } catch (error) {
        failCount++;
        failedStudents.push(student.personalInfo.fullName);
        console.error(
          `❌ Failed to send message to ${student.personalInfo.fullName}:`,
          error
        );
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

    const resultMessage = `${
      newStatus === "cancelled" ? "Cancellation" : "Postponement"
    } notifications sent`;

    console.log(`✅ Complete: ${successCount} sent, ${failCount} failed`);

    return {
      success: true,
      status: newStatus,
      totalStudents: students.length,
      successCount,
      failCount,
      failedStudents: failedStudents.length > 0 ? failedStudents : null,
      message: resultMessage,
      customMessageUsed: !!customMessage,
    };
  } catch (error) {
    console.error("❌ Error in onSessionStatusChanged:", error);
    throw error;
  }
}

// ============================================
// MESSAGE TEMPLATES
// ============================================

function prepareSessionReminderMessage(studentName, session, group, language) {
  const sessionDate = new Date(session.scheduledDate).toLocaleDateString(
    language === "en" ? "en-US" : "ar-EG"
  );

  if (language === "en") {
    return `⏰ Session Reminder

Hello ${studentName}!

📚 Session: ${session.title}
👥 Group: ${group.code}
📅 Date: ${sessionDate}
⏰ Time: ${session.startTime} - ${session.endTime}

${session.meetingLink ? `🔗 Meeting Link: ${session.meetingLink}` : ""}

See you soon! 🚀`;
  } else {
    return `⏰ تذكير بالمحاضرة

مرحباً ${studentName}!

📚 المحاضرة: ${session.title}
👥 المجموعة: ${group.code}
📅 التاريخ: ${sessionDate}
⏰ الوقت: ${session.startTime} - ${session.endTime}

${session.meetingLink ? `🔗 رابط الاجتماع: ${session.meetingLink}` : ""}

نراك قريباً! 🚀`;
  }
}

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

  // ✅ استبدال جميع المتغيرات
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, "g");
    processedMessage = processedMessage.replace(regex, value);
  });

  return processedMessage;
}

/**
 * ✅ الرسالة الافتراضية - محدثة لدعم جميع الحالات
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

  // ✅ رسائل مختلفة حسب الحالة
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
    // Arabic messages
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
📅 التاريخ الأصلي: ${new Date(session.scheduledDate).toLocaleDateString(
      "ar-EG"
    )}
⏰ الوقت: ${session.startTime} - ${session.endTime}

سنوافيك بالتحديثات.

فريق Code School 💻`;
  }
}