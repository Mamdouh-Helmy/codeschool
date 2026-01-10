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

// services/groupAutomation.js - داخل دالة onGroupActivated

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
      // محاولة حذف الفهرس المسبب للمشكلة
      await Session.collection.dropIndex(
        "groupId_1_moduleIndex_1_lessonIndex_1_sessionIndex_1"
      );
      console.log("✅ Deleted problematic duplicate index");
    } catch (dropError) {
      // الفهرس قد لا يكون موجوداً، هذا مقبول
      console.log("ℹ️  Index not found or already deleted");
    }

    // ✅ FIX: حذف أي سيشنات قديمة أولاً قبل إنشاء جديدة (حذف فعلي، ليس soft delete)
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

        // حفظ السيشنات الجديدة
        const insertResult = await Session.insertMany(sessionsResult.sessions, {
          ordered: false, // Continue on duplicate errors
        });

        console.log(`✅ Successfully saved ${insertResult.length} sessions`);

        // ✅ Update group with sessions info
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
        console.error("❌ Error details:", {
          code: insertError.code,
          message: insertError.message,
          keyPattern: insertError.keyPattern,
          keyValue: insertError.keyValue,
        });

        // إذا كان خطأ مكرر، حاول إدراج السيشنات بشكل منفرد
        if (insertError.code === 11000) {
          console.log(
            "🔄 Trying to insert sessions individually with conflict resolution..."
          );

          let successCount = 0;
          let errorCount = 0;
          const errors = [];

          for (const sessionData of sessionsResult.sessions) {
            try {
              // ✅ FIX: استخدم findOneAndUpdate مع upsert
              const result = await Session.findOneAndUpdate(
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
              console.log(
                `✅ Session ${sessionData.sessionNumber} saved/updated`
              );
            } catch (individualError) {
              errorCount++;
              errors.push(individualError.message);
              console.error(
                `❌ Failed to save session ${sessionData.sessionNumber}:`,
                individualError.message
              );
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

            if (errorCount > 0) {
              console.log("❌ Errors:", errors.slice(0, 3));
            }
          } else {
            throw new Error(
              `Failed to save any sessions. All ${errorCount} attempts failed. Errors: ${errors.join(
                "; "
              )}`
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
        // TODO: Implement instructor notification via WhatsApp
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

    // Log specific error details
    if (error.code === 11000) {
      console.error("Duplicate key error details:");
      console.error("Error code:", error.code);
      console.error("Error pattern:", error.keyPattern);
      console.error("Error value:", error.keyValue);

      // ✅ محاولة إصلاح الفهارس
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
 * EVENT 4: Attendance Submitted
 */
export async function onAttendanceSubmitted(sessionId) {
  try {
    console.log(`🎯 EVENT: Attendance Submitted - ${sessionId}`);

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

    if (session.automationEvents?.absentNotificationsSent) {
      console.log("⚠️ Absence notifications already sent");
      return { success: false, reason: "Already sent" };
    }

    const absentStudentIds = session.attendance
      .filter((a) => a.status === "absent")
      .map((a) => a.studentId);

    if (absentStudentIds.length === 0) {
      console.log("✅ No absent students");
      return { success: true, absentCount: 0 };
    }

    console.log(
      `📤 Notifying guardians of ${absentStudentIds.length} absent students...`
    );

    const absentStudents = await Student.find({
      _id: { $in: absentStudentIds },
      isDeleted: false,
    });

    let successCount = 0;
    let failCount = 0;

    for (const student of absentStudents) {
      const guardianWhatsApp = student.guardianInfo?.whatsappNumber;

      if (!guardianWhatsApp) {
        failCount++;
        continue;
      }

      const absenceMessage = prepareAbsenceNotificationMessage(
        student.guardianInfo.name || "Guardian",
        student.personalInfo.fullName,
        session,
        group,
        student.communicationPreferences?.preferredLanguage || "ar"
      );

      try {
        await wapilotService.sendTextMessage(
          wapilotService.preparePhoneNumber(guardianWhatsApp),
          absenceMessage
        );

        successCount++;
      } catch (error) {
        failCount++;
        console.error(`❌ Failed to notify guardian:`, error);
      }
    }

    await Session.findByIdAndUpdate(sessionId, {
      $set: {
        "automationEvents.absentNotificationsSent": true,
        "automationEvents.absentNotificationsSentAt": new Date(),
      },
    });

    return {
      success: true,
      absentCount: absentStudents.length,
      successCount,
      failCount,
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
  reason = ""
) {
  try {
    console.log(
      `🎯 EVENT: Session Status Changed - ${sessionId} to ${newStatus}`
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
      return { success: false, reason: "Notifications disabled" };
    }

    const students = await Student.find({
      _id: { $in: group.students },
      isDeleted: false,
    });

    let successCount = 0;
    let failCount = 0;

    for (const student of students) {
      const whatsappNumber = student.personalInfo.whatsappNumber;

      if (!whatsappNumber) {
        failCount++;
        continue;
      }

      const updateMessage = prepareSessionUpdateMessage(
        student.personalInfo.fullName,
        session,
        group,
        newStatus,
        reason,
        student.communicationPreferences?.preferredLanguage || "ar"
      );

      try {
        await wapilotService.sendTextMessage(
          wapilotService.preparePhoneNumber(whatsappNumber),
          updateMessage
        );

        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    const updateField =
      newStatus === "cancelled"
        ? "cancelNotificationSent"
        : "postponeNotificationSent";

    await Session.findByIdAndUpdate(sessionId, {
      $set: {
        [`automationEvents.${updateField}`]: true,
      },
    });

    return {
      success: true,
      totalStudents: students.length,
      successCount,
      failCount,
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

function prepareAbsenceNotificationMessage(
  guardianName,
  studentName,
  session,
  group,
  language
) {
  if (language === "en") {
    return `📢 Absence Notification

Dear ${guardianName},

We noticed that ${studentName} was absent from today's session:

📚 Session: ${session.title}
👥 Group: ${group.code}
📅 Date: ${new Date(session.scheduledDate).toLocaleDateString("en-US")}

Please contact us if you have any questions.

Code School Team 💻`;
  } else {
    return `📢 إشعار غياب

عزيزي/عزيزتي ${guardianName},

لاحظنا أن ${studentName} كان/ت غائب/ة عن محاضرة اليوم:

📚 المحاضرة: ${session.title}
👥 المجموعة: ${group.code}
📅 التاريخ: ${new Date(session.scheduledDate).toLocaleDateString("ar-EG")}

يرجى التواصل معنا في حال وجود أي استفسارات.

فريق Code School 💻`;
  }
}

function prepareSessionUpdateMessage(
  studentName,
  session,
  group,
  status,
  reason,
  language
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

${reason ? `Reason: ${reason}` : ""}

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

${reason ? `السبب: ${reason}` : ""}

سنوافيك بالتحديثات.

فريق Code School 💻`;
  }
}
