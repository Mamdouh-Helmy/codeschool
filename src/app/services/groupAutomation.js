// /src/app/services/groupAutomation.js
import mongoose from "mongoose";
import Group from "../models/Group";
import Student from "../models/Student";
import Session from "../models/Session";
import User from "../models/User";
import MessageTemplate from "../models/MessageTemplate";
import { wapilotService } from "./wapilot-service";

// ── Fetch TemplateVariable map from DB ────────────────────────────────────
async function fetchDbVars(genderContext = {}) {
  try {
    const TemplateVariable = (await import("../models/TemplateVariable"))
      .default;
    const vars = await TemplateVariable.find({ isActive: true }).lean();
    const map = {};
    vars.forEach((v) => {
      map[v.key] = v;
    });
    return map;
  } catch (err) {
    console.warn("⚠️ Could not load TemplateVariable:", err.message);
    return {};
  }
}

// ============================================================
// ✅ NEW: استخراج الاسم المختصر للحصة من الـ title
// title بيكون مثلاً:
//   "Introduction to Computer Basics - Session 1: Getting Started with Computers & Getting Started with Computers"
// المطلوب: الجزء اللي بعد ":" بس
//   "Getting Started with Computers"
// ============================================================
function extractSessionShortName(title) {
  if (!title) return "";
  if (title.includes(":")) {
    const afterColon = title.split(":").slice(1).join(":").trim();
    if (afterColon.includes("&")) {
      return afterColon.split("&")[0].trim();
    }
    return afterColon;
  }
  if (title.includes(" - ")) {
    return title.split(" - ").slice(1).join(" - ").trim();
  }
  return title;
}

/**
 * ✅ التحقق من صلاحية الطالب لاستقبال الرسائل
 */
async function canSendMessage(student) {
  if (!student) return false;

  if (!student.creditSystem?.currentPackage) {
    return false;
  }

  const remainingHours =
    student.creditSystem.currentPackage.remainingHours || 0;
  if (remainingHours <= 0) {
    console.log(
      `🔕 Student ${student._id} has zero balance - notifications disabled`,
    );
    return false;
  }

  const whatsappEnabled =
    student.communicationPreferences?.notificationChannels?.whatsapp;
  if (!whatsappEnabled) {
    return false;
  }

  return true;
}

/**
 * ✅ تصفية الطلاب الصالحين لاستقبال الرسائل
 */
async function filterEligibleStudents(students) {
  const eligibleStudents = [];

  for (const student of students) {
    const canSend = await canSendMessage(student);
    if (canSend) {
      eligibleStudents.push(student);
    } else {
      console.log(
        `⏭️ Skipping student ${student._id} - not eligible for messages`,
      );
    }
  }

  return eligibleStudents;
}

/**
 * ✅ EVENT 1: Group Activated
 */
export async function onGroupActivated(groupId, userId, selectedLinkIds = []) {
  try {
    console.log(`\n🎯 EVENT: Group Activated ==========`);
    console.log(`👥 Group: ${groupId}`);
    console.log(`👤 Activated by: ${userId}`);
    console.log(
      `🔗 Selected Link IDs: ${selectedLinkIds.length > 0 ? selectedLinkIds.join(", ") : "none"}`,
    );

    const group = await Group.findById(groupId)
      .populate("courseId")
      .populate("instructors", "name email profile");

    if (!group) throw new Error("Group not found");

    console.log(`📊 Group status: ${group.status}`);
    console.log(`📚 Course: ${group.courseId?.title}`);
    console.log(
      `📖 Curriculum modules: ${group.courseId?.curriculum?.length || 0}`,
    );
    console.log(
      `📅 Schedule: ${group.schedule.daysOfWeek} | ${group.schedule.timeFrom} - ${group.schedule.timeTo}`,
    );

    if (
      !group.schedule.daysOfWeek ||
      group.schedule.daysOfWeek.length === 0 ||
      group.schedule.daysOfWeek.length > 3
    ) {
      throw new Error(
        `Group must have 1 to 3 days selected for schedule (currently has ${group.schedule.daysOfWeek?.length || 0} days)`,
      );
    }

    const Session = (await import("../models/Session")).default;
    const existingSessionsCount = await Session.countDocuments({
      groupId: groupId,
      isDeleted: false,
    });

    console.log(`📊 Existing sessions count: ${existingSessionsCount}`);

    if (group.sessionsGenerated || existingSessionsCount > 0) {
      console.log(`🔄 Regenerating sessions for group ${group.code}...`);

      const existingSessions = await Session.find({
        groupId: groupId,
        isDeleted: false,
        meetingLinkId: { $ne: null },
      });

      for (const session of existingSessions) {
        try {
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

      const deleteResult = await Session.deleteMany({ groupId: groupId });
      console.log(`✅ Deleted ${deleteResult.deletedCount} existing sessions`);

      await Group.findByIdAndUpdate(groupId, {
        $set: { sessionsGenerated: false, totalSessionsCount: 0 },
      });
    }

    console.log("📅 Generating new sessions...");

    const { generateSessionsForGroup } =
      await import("../../utils/sessionGenerator");

    const sessionsResult = await generateSessionsForGroup(
      groupId,
      group,
      userId,
      selectedLinkIds,
    );

    if (!sessionsResult.success) {
      throw new Error(sessionsResult.message || "Failed to generate sessions");
    }

    console.log(`📊 Sessions Generation Result:`);
    console.log(`   Total Generated: ${sessionsResult.totalGenerated}`);
    console.log(`   Distribution:`, sessionsResult.distribution);

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

        if (selectedLinkIds.length > 0) {
          console.log(
            `\n🔒 Reserving ${selectedLinkIds.length} selected meeting link(s)...`,
          );

          const MeetingLink = (await import("../models/MeetingLink")).default;

          for (const linkId of selectedLinkIds) {
            try {
              const link = await MeetingLink.findById(linkId);
              if (!link) {
                console.warn(`⚠️ Link ${linkId} not found, skipping`);
                continue;
              }

              const sessionsUsingLink = sessionsResult.sessions.filter(
                (s) => s.meetingLinkId?.toString() === linkId.toString(),
              );

              if (sessionsUsingLink.length === 0) continue;

              const firstSession = sessionsUsingLink[0];
              const lastSession =
                sessionsUsingLink[sessionsUsingLink.length - 1];

              const startTime = new Date(firstSession.scheduledDate);
              const [sh, sm] = firstSession.startTime.split(":").map(Number);
              startTime.setHours(sh, sm, 0, 0);

              const endTime = new Date(lastSession.scheduledDate);
              const [eh, em] = lastSession.endTime.split(":").map(Number);
              endTime.setHours(eh, em, 0, 0);

              await link.reserveForSession(
  lastSession._id,
  groupId,
  startTime,
  endTime,
  userId,
  {
    daysOfWeek: group.schedule.daysOfWeek,
    timeFrom: group.schedule.timeFrom,
    timeTo: group.schedule.timeTo,
  },
);

              console.log(
                `✅ Reserved "${link.name}" — ${sessionsUsingLink.length} sessions` +
                  ` (${startTime.toISOString().split("T")[0]} → ${endTime.toISOString().split("T")[0]})`,
              );
            } catch (reserveError) {
              console.warn(
                `⚠️ Could not reserve link ${linkId}:`,
                reserveError.message,
              );
            }
          }
        }
      } catch (insertError) {
        console.error("❌ Error inserting sessions:", insertError);

        if (insertError.code === 11000) {
          console.log(
            "🔄 Trying to insert sessions individually with conflict resolution...",
          );

          let successCount = 0;
          let errorCount = 0;

          for (const sessionData of sessionsResult.sessions) {
            try {
              await Session.findOneAndUpdate(
                {
                  groupId: sessionData.groupId,
                  moduleIndex: sessionData.moduleIndex,
                  sessionNumber: sessionData.sessionNumber,
                },
                sessionData,
                { upsert: true, new: true, setDefaultsOnInsert: true },
              );
              successCount++;
            } catch (individualError) {
              errorCount++;
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
        const Session = (await import("../models/Session")).default;
        await Session.syncIndexes();
        console.log("🔄 Attempted to sync indexes");
      } catch (syncError) {
        console.error("❌ Failed to sync indexes:", syncError.message);
      }
    }

    throw error;
  }
}

async function getMessageTemplate(
  templateType,
  language = "ar",
  recipientType = "guardian",
) {
  const validLanguage = ["ar", "en"].includes(language) ? language : "ar";

  try {
    const template = await MessageTemplate.findOne({
      templateType,
      recipientType,
      isActive: true,
      isDefault: true,
    }).lean();

    if (template) {
      let content = "";

      if (validLanguage === "ar") {
        content = template.contentAr;
      } else {
        content = template.contentEn;
      }

      console.log(`📋 Using ${validLanguage} content for ${templateType}`);
      console.log(`   Content preview: ${content?.substring(0, 100)}...`);

      if (!content || content.trim() === "") {
        console.log(`⚠️ ${validLanguage} content empty, trying other language`);

        if (validLanguage === "ar") {
          content = template.contentEn;
        } else {
          content = template.contentAr;
        }

        if (!content || content.trim() === "") {
          console.log(`⚠️ Both languages empty, using fallback template`);
          const fallbackContent = getFallbackTemplate(
            templateType,
            validLanguage,
            recipientType,
          );

          return {
            content: fallbackContent,
            templateId: template._id,
            templateName: template.name,
            recipientType: template.recipientType,
            isCustom: false,
            isDefault: true,
            isFallback: true,
          };
        }
      }

      return {
        content: content || "",
        templateId: template._id,
        templateName: template.name,
        recipientType: template.recipientType,
        isCustom: false,
        isDefault: true,
      };
    }

    console.log(
      `⚠️ No template found in DB for ${templateType}, using fallback`,
    );
    const fallbackContent = getFallbackTemplate(
      templateType,
      validLanguage,
      recipientType,
    );

    return {
      content: fallbackContent,
      isCustom: false,
      isFallback: true,
      recipientType,
    };
  } catch (error) {
    console.error(`❌ Error fetching template [${templateType}]:`, error);
    const fallbackContent = getFallbackTemplate(
      templateType,
      validLanguage,
      recipientType,
    );

    return {
      content: fallbackContent,
      isCustom: false,
      isFallback: true,
      recipientType,
      error: error.message,
    };
  }
}

export async function getAttendanceTemplates(attendanceStatus, student) {
  try {
    const language =
      student.communicationPreferences?.preferredLanguage || "ar";

    let guardianTemplateType = "";

    switch (attendanceStatus) {
      case "absent":
        guardianTemplateType = "absence_notification";
        break;
      case "late":
        guardianTemplateType = "late_notification";
        break;
      case "excused":
        guardianTemplateType = "excused_notification";
        break;
      default:
        throw new Error(`Unknown attendance status: ${attendanceStatus}`);
    }

    const guardianTemplate = await getMessageTemplate(
      guardianTemplateType,
      language,
      "guardian",
    );

    return {
      guardian: guardianTemplate,
      metadata: {
        language,
        gender: student.personalInfo?.gender || "male",
        relationship: student.guardianInfo?.relationship || "father",
        studentName: student.personalInfo?.fullName?.split(" ")[0] || "الطالب",
        guardianName: student.guardianInfo?.name?.split(" ")[0] || "ولي الأمر",
      },
    };
  } catch (error) {
    console.error("❌ Error in getAttendanceTemplates:", error);
    throw error;
  }
}

export async function getAttendanceTemplatesForFrontend(
  attendanceStatus,
  studentId,
  extraData = {},
) {
  try {
    const student = await Student.findById(studentId).lean();
    if (!student) {
      throw new Error("Student not found");
    }

    const templates = await getAttendanceTemplates(attendanceStatus, student);
    return templates;
  } catch (error) {
    console.error("❌ Error in getAttendanceTemplatesForFrontend:", error);
    throw error;
  }
}

/**
 * ✅ إرسال إشعارات الغياب
 */
export async function sendAbsenceNotifications(
  sessionId,
  attendanceData,
  customMessages = {},
) {
  try {
    console.log(`\n📤 Sending absence notifications for session ${sessionId}`);

    const session = await Session.findById(sessionId)
      .populate("groupId")
      .lean();

    if (!session) throw new Error("Session not found");

    const group = session.groupId;

    const studentsNeedingNotifications = attendanceData.filter((record) =>
      ["absent", "late", "excused"].includes(record.status),
    );

    if (studentsNeedingNotifications.length === 0) {
      console.log("✅ No students need notifications");
      return { success: true, sentCount: 0, skippedCount: 0 };
    }

    let sentCount = 0;
    let skippedCount = 0;
    const results = [];

    for (const record of studentsNeedingNotifications) {
      const student = await Student.findById(record.studentId);

      if (!student) {
        skippedCount++;
        continue;
      }

      const canSend = await canSendMessage(student);
      if (!canSend) {
        skippedCount++;
        results.push({
          studentId: student._id,
          status: "skipped",
          reason: "zero_balance_or_disabled",
        });
        continue;
      }

      const guardianPhone =
        student.guardianInfo?.whatsappNumber || student.guardianInfo?.phone;
      if (!guardianPhone) {
        skippedCount++;
        continue;
      }

      let messageContent = customMessages[student._id.toString()];

      if (!messageContent) {
        const templates = await getAttendanceTemplates(record.status, student);
        messageContent = templates.guardian?.content;
      }

      if (!messageContent) {
        skippedCount++;
        continue;
      }

      const { variables, language } = await prepareStudentVariables(
        student,
        group,
        session,
        { attendanceStatus: record.status },
      );

      let finalMessage = replaceVariables(messageContent, variables);

      const messageTypeMap = {
        absent: "absence_notification",
        late: "late_notification",
        excused: "excused_notification",
      };
      const messageType =
        messageTypeMap[record.status] || "absence_notification";

      const sendResult = await wapilotService.sendAndLogMessage({
        studentId: student._id,
        phoneNumber: guardianPhone,
        messageContent: finalMessage,
        messageType,
        language,
        metadata: {
          sessionId: session._id,
          sessionTitle: session.title,
          attendanceStatus: record.status,
          recipientType: "guardian",
          remainingHours: student.creditSystem?.currentPackage?.remainingHours,
        },
      });

      if (sendResult.success) {
        sentCount++;
        results.push({
          studentId: student._id,
          status: "sent",
          messageId: sendResult.messageId,
        });
      } else {
        skippedCount++;
      }
    }

    console.log(
      `✅ Notifications sent: ${sentCount}, skipped: ${skippedCount}`,
    );
    return { success: true, sentCount, skippedCount, results };
  } catch (error) {
    console.error("❌ Error sending absence notifications:", error);
    return {
      success: false,
      error: error.message,
      sentCount: 0,
      skippedCount: 0,
    };
  }
}

/**
 * ✅ القوالب الاحتياطية
 */
function getFallbackTemplate(
  templateType,
  language = "ar",
  recipientType = "guardian",
) {
  const templates = {
    // ========== قوالب الطالب ==========
    reminder_24h_student: {
      ar: `{salutation_ar} 👋
حبيت أفكرك إن ميعادنا بكرة إن شاء الله ✨
📘 الـ Session: {sessionName}
📅 التاريخ: {date}
⏰ الوقت: {time}
🔗 لينك الحصة:
{meetingLink}
💡 ياريت تتأكد إن اللاب مشحون، النت مستقر، والكاميرا جاهزة عشان تكون مستعد بنسبة 100% 👍
متحمسين نشوفك بكرة 💻🚀
نور ✨
فريق المتابعة`,
      en: `{salutation_en} 👋
Just a reminder that our session is tomorrow, God willing ✨
📘 Session: {sessionName}
📅 Date: {date}
⏰ Time: {time}
🔗 Meeting Link:
{meetingLink}
💡 Please make sure your laptop is charged, internet is stable, and camera is ready 👍
Excited to see you tomorrow 💻🚀
Nour ✨
Follow-up Team`,
    },
    reminder_15min_student: {
      ar: `{salutation_ar} 👋
فاضل ربع ساعة بالظبط ونبدأ session {sessionName} ✨
🔗 لينك الدخول:
{meetingLink}
يلا استعد من دلوقتي! خليك جاهز قبلها بـ 5 دقايق، واتأكد إن اللاب مشحون، النت مستقر، والكاميرا جاهزة 👍
مستنيينك 💻🚀
نور ✨
فريق المتابعة`,
      en: `{salutation_en} 👋
Session {sessionName} starts in 15 minutes ✨
🔗 Join Link:
{meetingLink}
Get ready now! Be there 5 minutes early, make sure your laptop is charged, internet is stable, and camera is ready 👍
We're waiting for you 💻🚀
Nour ✨
Follow-up Team`,
    },
    // للتوافق مع الكود القديم
    reminder_1h_student: {
      ar: `{salutation_ar} 👋
فاضل ربع ساعة بالظبط ونبدأ session {sessionName} ✨
🔗 لينك الدخول:
{meetingLink}
يلا استعد من دلوقتي! خليك جاهز قبلها بـ 5 دقايق، واتأكد إن اللاب مشحون، النت مستقر، والكاميرا جاهزة 👍
مستنيينك 💻🚀
نور ✨
فريق المتابعة`,
      en: `{salutation_en} 👋
Session {sessionName} starts in 15 minutes ✨
🔗 Join Link:
{meetingLink}
Get ready now! Be there 5 minutes early, make sure your laptop is charged, internet is stable, and camera is ready 👍
We're waiting for you 💻🚀
Nour ✨
Follow-up Team`,
    },

    // ========== قوالب ولي الأمر ==========
    reminder_24h_guardian: {
      ar: `{guardianSalutation} 👋
بفكر حضرتك بميعاد حصة {childTitle} {studentName} بكرة إن شاء الله ✨
📘 الـ Session: {sessionName}
📅 التاريخ: {date}
⏰ الوقت: {time}
🔗 لينك الحصة:
{meetingLink}
علشان نضمن لـ {studentName} أفضل تركيز، ياريت نتأكد قبل الـ session إن اللاب مشحون، والإنترنت مستقر، والكاميرا جاهزة 👍
إن شاء الله تكون حصة ممتعة ومفيدة 💻🚀
نور ✨
فريق المتابعة`,
      en: `{guardianSalutation} 👋
Just a reminder about {childTitle} {studentName}'s session tomorrow, God willing ✨
📘 Session: {sessionName}
📅 Date: {date}
⏰ Time: {time}
🔗 Meeting Link:
{meetingLink}
To ensure {studentName}'s best focus, please make sure the laptop is charged, internet is stable, and camera is ready 👍
Hope it's a fun and productive session 💻🚀
Nour ✨
Follow-up Team`,
    },
    reminder_15min_guardian: {
      ar: `{guardianSalutation} 👋
بفكّر حضرتك إن حصة {childTitle} {studentName} في {sessionName} هتبدأ بعد ربع ساعة بالظبط ✨
🔗 لينك الحصة:
{meetingLink}
علشان يبدأ الحصة بتركيز، ياريت نتأكد إن اللاب مشحون، والإنترنت مستقر، والكاميرا جاهزة قبل الميعاد بدقايق 👍
نور ✨
فريق المتابعة`,
      en: `{guardianSalutation} 👋
Reminding you that {childTitle} {studentName}'s session in {sessionName} starts in exactly 15 minutes ✨
🔗 Meeting Link:
{meetingLink}
To start the session focused, please make sure the laptop is charged, internet is stable, and camera is ready 👍
Nour ✨
Follow-up Team`,
    },
    // للتوافق مع الكود القديم
    reminder_1h_guardian: {
      ar: `{guardianSalutation} 👋
بفكّر حضرتك إن حصة {childTitle} {studentName} في {sessionName} هتبدأ بعد ربع ساعة بالظبط ✨
🔗 لينك الحصة:
{meetingLink}
علشان يبدأ الحصة بتركيز، ياريت نتأكد إن اللاب مشحون، والإنترنت مستقر، والكاميرا جاهزة قبل الميعاد بدقايق 👍
نور ✨
فريق المتابعة`,
      en: `{guardianSalutation} 👋
Reminding you that {childTitle} {studentName}'s session in {sessionName} starts in exactly 15 minutes ✨
🔗 Meeting Link:
{meetingLink}
To start the session focused, please make sure the laptop is charged, internet is stable, and camera is ready 👍
Nour ✨
Follow-up Team`,
    },
    session_cancelled_student: {
      ar: `{studentSalutation}،

نود إعلامك بأنه تم إلغاء جلستك:

📘 الجلسة: {sessionName}
📅 التاريخ: {date}
⏰ الوقت: {time}

📌 ملاحظات هامة:
- هذه الجلسة لن تحسب من باقتك.
- سيتم إعلامك بموعد الجلسة التعويضية قريباً.

نعتذر عن أي إزعاج،
فريق Code School 💻`,
      en: `{studentSalutation},

We would like to inform you that your session has been cancelled:

📘 Session: {sessionName}
📅 Date: {date}
⏰ Time: {time}

📌 Important Notes:
- This session will not be counted from your package.
- We will inform you about the makeup session soon.

We apologize for any inconvenience,
Code School Team 💻`,
    },
    session_cancelled_guardian: {
      ar: `{guardianSalutation}،

نود إعلامكم بأنه تم إلغاء جلسة {childTitle} **{studentName}**:

📘 الجلسة: {sessionName}
📅 التاريخ: {date}
⏰ الوقت: {time}

📌 ملاحظات هامة:
- هذه الجلسة لن تحسب من الباقة.
- سيتم إعلامكم بموعد الجلسة التعويضية قريباً.

نعتذر عن أي إزعاج،
فريق Code School 💻`,
      en: `{guardianSalutation},

We would like to inform you that {childTitle} **{studentName}**'s session has been cancelled:

📘 Session: {sessionName}
📅 Date: {date}
⏰ Time: {time}

📌 Important Notes:
- This session will not be counted from your package.
- We will inform you about the makeup session soon.

We apologize for any inconvenience,
Code School Team 💻`,
    },
    session_postponed_student: {
      ar: `{studentSalutation}،

نود إعلامك بأنه تم تأجيل جلستك:

📘 الجلسة: {sessionName}
📅 التاريخ الأصلي: {date}
⏰ الوقت الأصلي: {time}

📌 الموعد الجديد:
📅 {newDate}
⏰ {newTime}
🔗 رابط الاجتماع: {meetingLink}

شكراً لتفهمك،
فريق Code School 💻`,
      en: `{studentSalutation},

We would like to inform you that your session has been postponed:

📘 Session: {sessionName}
📅 Original Date: {date}
⏰ Original Time: {time}

📌 New Schedule:
📅 {newDate}
⏰ {newTime}
🔗 Meeting Link: {meetingLink}

Thank you for your understanding,
Code School Team 💻`,
    },
    session_postponed_guardian: {
      ar: `{guardianSalutation}،

نود إعلامكم بأنه تم تأجيل جلسة {childTitle} **{studentName}**:

📘 الجلسة: {sessionName}
📅 التاريخ الأصلي: {date}
⏰ الوقت الأصلي: {time}

📌 الموعد الجديد:
📅 {newDate}
⏰ {newTime}
🔗 رابط الاجتماع: {meetingLink}

شكراً لتفهمكم،
فريق Code School 💻`,
      en: `{guardianSalutation},

We would like to inform you that {childTitle} **{studentName}**'s session has been postponed:

📘 Session: {sessionName}
📅 Original Date: {date}
⏰ Original Time: {time}

📌 New Schedule:
📅 {newDate}
⏰ {newTime}
🔗 Meeting Link: {meetingLink}

Thank you for your understanding,
Code School Team 💻`,
    },
    group_completion_student: {
      ar: `{studentSalutation}،

مبروك على إتمام دورة **{courseName}** بنجاح! 🎓🎉

نحن فخورون بإنجازك وتفانيك طوال الرحلة التعليمية.

📚 المجموعة: {groupName} ({groupCode})

نتمنى لك التوفيق في مسيرتك! 🚀

فريق Code School 💻`,
      en: `{studentSalutation},

Congratulations on successfully completing **{courseName}**! 🎓🎉

We are proud of your achievement and dedication.

📚 Group: {groupName} ({groupCode})

We wish you success in your journey! 🚀

Code School Team 💻`,
    },
    group_completion_guardian: {
      ar: `{guardianSalutation}،

يسرنا إعلامكم بأن {childTitle} **{studentName}** قد أتم بنجاح دورة **{courseName}**! 🎓🎉

نحن فخورون بإنجازه وتفانيه طوال الرحلة التعليمية.

📚 المجموعة: {groupName} ({groupCode})

نتطلع لرؤية المزيد من النجاحات! 🚀

فريق Code School 💻`,
      en: `{guardianSalutation},

We are pleased to inform you that {childTitle} **{studentName}** has successfully completed **{courseName}**! 🎓🎉

We are proud of their achievement and dedication.

📚 Group: {groupName} ({groupCode})

We look forward to seeing more successes! 🚀

Code School Team 💻`,
    },
    absence_notification: {
      ar: `{guardianSalutation}،

نود إعلامكم بأن {childTitle} **{studentName}** كان غائباً عن الجلسة:

📘 الجلسة: {sessionName}
📅 التاريخ: {date}
⏰ الوقت: {time}

يرجى التواصل معنا في حال وجود أي استفسار.
فريق Code School 💻`,
      en: `{guardianSalutation},

We noticed that {childTitle} **{studentName}** was absent from the session:

📘 Session: {sessionName}
📅 Date: {date}
⏰ Time: {time}

Please contact us if you have any questions.
Code School Team 💻`,
    },
    late_notification: {
      ar: `{guardianSalutation}،

نود إعلامكم بأن {childTitle} **{studentName}** وصل متأخراً للجلسة:

📘 الجلسة: {sessionName}
📅 التاريخ: {date}

يرجى الحرص على المواعيد في المرات القادمة.
فريق Code School 💻`,
      en: `{guardianSalutation},

{childTitle} **{studentName}** arrived late to the session:

📘 Session: {sessionName}
📅 Date: {date}

Please ensure punctuality in future sessions.
Code School Team 💻`,
    },
    excused_notification: {
      ar: `{guardianSalutation}،

تم تسجيل غياب {childTitle} **{studentName}** بعذر عن الجلسة:

📘 الجلسة: {sessionName}
📅 التاريخ: {date}

فريق Code School 💻`,
      en: `{guardianSalutation},

{childTitle} **{studentName}**'s absence has been recorded as excused:

📘 Session: {sessionName}
📅 Date: {date}

Code School Team 💻`,
    },
    student_welcome: {
      ar: `{studentSalutation}،

يسرنا إعلامك بأنه تم تسجيلك بنجاح في Code School! 🎉

📘 البرنامج: {courseName}
👥 المجموعة: {groupName} ({groupCode})

رحلتك التعليمية ستبدأ قريباً! 🚀

فريق Code School 💻`,
      en: `{studentSalutation},

We are pleased to confirm your enrollment at Code School! 🎉

📘 Program: {courseName}
👥 Group: {groupName} ({groupCode})

Your learning journey starts soon! 🚀

Code School Team 💻`,
    },
    guardian_notification: {
      ar: `{guardianSalutation}،

يسرنا إعلامكم بأنه تم تسجيل {childTitle} **{studentName}** بنجاح في Code School! 🎉

📘 البرنامج: {courseName}
👥 المجموعة: {groupName} ({groupCode})

نتطلع لرؤية تقدم {studentName} معنا! 🚀

فريق Code School 💻`,
      en: `{guardianSalutation},

We are pleased to inform you that {childTitle} **{studentName}** has been successfully enrolled at Code School! 🎉

📘 Program: {courseName}
👥 Group: {groupName} ({groupCode})

We look forward to seeing {studentName}'s progress! 🚀

Code School Team 💻`,
    },
  };

  const noSuffixTypes = [
    "absence_notification",
    "late_notification",
    "excused_notification",
    "guardian_notification",
    "student_welcome",
  ];

  let templateKey;

  if (noSuffixTypes.includes(templateType)) {
    templateKey = templateType;
  } else {
    const baseKey = templateType
      .replace(/_guardian$/, "")
      .replace(/_student$/, "");

    templateKey =
      recipientType === "student"
        ? `${baseKey}_student`
        : `${baseKey}_guardian`;
  }

  const template = templates[templateKey];

  if (!template) {
    console.log(`⚠️ No fallback template found for key: ${templateKey}`);
    return "";
  }

  return template[language] || template.ar || "";
}

async function prepareStudentVariables(
  student,
  group,
  session = null,
  extra = {},
) {
  const language = student.communicationPreferences?.preferredLanguage || "ar";
  const gender = (student.personalInfo?.gender || "male").toLowerCase().trim();
  const relationship = (student.guardianInfo?.relationship || "father")
    .toLowerCase()
    .trim();
  const isMale = gender !== "female";
  const isFather = relationship !== "mother";
  const genderCtx = { studentGender: gender, guardianType: relationship };

  const dbVars = await fetchDbVars(genderCtx);

  function resolveVar(key, lang) {
    const v = dbVars[key];
    if (!v) return null;
    if (v.hasGender) {
      if (v.genderType === "student") {
        return lang === "ar"
          ? (isMale ? v.valueMaleAr : v.valueFemaleAr) || v.valueAr || null
          : (isMale ? v.valueMaleEn : v.valueFemaleEn) || v.valueEn || null;
      }
      if (v.genderType === "guardian") {
        return lang === "ar"
          ? (isFather ? v.valueFatherAr : v.valueMotherAr) || v.valueAr || null
          : (isFather ? v.valueFatherEn : v.valueMotherEn) || v.valueEn || null;
      }
      if (v.genderType === "instructor") {
        return lang === "ar"
          ? (isMale ? v.valueMaleAr : v.valueFemaleAr) || v.valueAr || null
          : (isMale ? v.valueMaleEn : v.valueFemaleEn) || v.valueEn || null;
      }
    }
    return lang === "ar" ? v.valueAr || null : v.valueEn || null;
  }

  const studentFirstName =
    language === "ar"
      ? student.personalInfo?.nickname?.ar?.trim() ||
        student.personalInfo?.fullName?.split(" ")[0] ||
        "الطالب"
      : student.personalInfo?.nickname?.en?.trim() ||
        student.personalInfo?.fullName?.split(" ")[0] ||
        "Student";

  const guardianFirstName =
    language === "ar"
      ? student.guardianInfo?.nickname?.ar?.trim() ||
        student.guardianInfo?.name?.split(" ")[0] ||
        "ولي الأمر"
      : student.guardianInfo?.nickname?.en?.trim() ||
        student.guardianInfo?.name?.split(" ")[0] ||
        "Guardian";

  const salutationBase_ar =
    resolveVar("salutation_ar", "ar") ||
    (isMale ? "عزيزي الطالب" : "عزيزتي الطالبة");

  const salutationBase_en = resolveVar("salutation_en", "en") || "Dear";

  const guardianSalBase_ar =
    resolveVar("guardianSalutation_ar", "ar") ||
    (isFather ? "عزيزي الأستاذ" : "عزيزتي السيدة");

  const guardianSalBase_en =
    resolveVar("guardianSalutation_en", "en") ||
    (isFather ? "Dear Mr." : "Dear Mrs.");

  const childTitleAr =
    resolveVar("childTitle", "ar") || (isMale ? "ابنك" : "ابنتك");

  const childTitleEn =
    resolveVar("childTitle", "en") || (isMale ? "your son" : "your daughter");

  const studentSalutation_ar = `${salutationBase_ar} ${studentFirstName}`;
  const studentSalutation_en = `${salutationBase_en} ${studentFirstName}`;
  const guardianSalutation_ar = `${guardianSalBase_ar} ${guardianFirstName}`;
  const guardianSalutation_en = `${guardianSalBase_en} ${guardianFirstName}`;

  const studentSalutation =
    language === "ar" ? studentSalutation_ar : studentSalutation_en;
  const guardianSalutation =
    language === "ar" ? guardianSalutation_ar : guardianSalutation_en;
  const childTitle = language === "ar" ? childTitleAr : childTitleEn;

  const sessionDate = session?.scheduledDate
    ? new Date(session.scheduledDate).toLocaleDateString(
        language === "ar" ? "ar-EG" : "en-US",
        { weekday: "long", year: "numeric", month: "long", day: "numeric" },
      )
    : language === "ar"
      ? "التاريخ"
      : "Date";

  const startDate = group?.schedule?.startDate
    ? new Date(group.schedule.startDate).toLocaleDateString(
        language === "ar" ? "ar-EG" : "en-US",
        { weekday: "long", year: "numeric", month: "long", day: "numeric" },
      )
    : "";

  const instructorNames = buildInstructorsNames(group?.instructors, language);
  const firstMeetingLink = await getFirstSessionMeetingLink(group?._id);

  const sessionShortName = session
    ? extractSessionShortName(session.title)
    : "";

  const variables = {
    studentSalutation,
    studentSalutation_ar,
    studentSalutation_en,
    salutation_ar: studentSalutation_ar,
    salutation_en: studentSalutation_en,
    guardianSalutation,
    guardianSalutation_ar,
    guardianSalutation_en,
    salutation: guardianSalutation,
    studentName: studentFirstName,
    studentFullName: student.personalInfo?.fullName || "",
    guardianName: guardianFirstName,
    guardianFullName: student.guardianInfo?.name || "",
    childTitle,
    studentGender:
      language === "ar"
        ? isMale
          ? "الابن"
          : "الابنة"
        : isMale
          ? "son"
          : "daughter",
    groupName: group?.name || "",
    groupCode: group?.code || "",
    courseName: group?.courseSnapshot?.title || group?.courseId?.title || "",
    startDate,
    timeFrom: group?.schedule?.timeFrom || "",
    timeTo: group?.schedule?.timeTo || "",
    instructor: instructorNames,
    firstMeetingLink: firstMeetingLink || "",
    enrollmentNumber: student.enrollmentNumber || "",
  };

  if (session) {
    Object.assign(variables, {
      sessionName: sessionShortName || session.title || "",
      sessionFullTitle: session.title || "",
      sessionDescription: session.description || "",
      sessionNumber: session.sessionNumber || "",
      date: sessionDate,
      time: `${session.startTime || ""} - ${session.endTime || ""}`,
      meetingLink: session.meetingLink || firstMeetingLink || "",
    });
  }

  if (extra.newDate) {
    variables.newDate = new Date(extra.newDate).toLocaleDateString(
      language === "ar" ? "ar-EG" : "en-US",
      { weekday: "long", year: "numeric", month: "long", day: "numeric" },
    );
  }
  if (extra.newTime) variables.newTime = extra.newTime;

  // ✅ status مع gender-aware
  if (extra.attendanceStatus) {
    const statusTextMap = {
      ar: {
        absent:  isMale ? "غائب"  : "غائبة",
        late:    isMale ? "متأخر" : "متأخرة",
        excused: isMale ? "معذور" : "معذورة",
        present: isMale ? "حاضر"  : "حاضرة",
      },
      en: {
        absent: "Absent",
        late: "Late",
        excused: "Excused",
        present: "Present",
      },
    };
    const statusText =
      (statusTextMap[language] || statusTextMap.ar)[extra.attendanceStatus] ||
      extra.attendanceStatus;

    variables.status = statusText;
    variables.attendanceStatus = statusText;
  }

  if (extra.attendanceNotes) variables.notes = extra.attendanceNotes;
  if (extra.feedbackLink) variables.feedbackLink = extra.feedbackLink;
  if (extra.moduleTitle) variables.moduleTitle = extra.moduleTitle;
  if (extra.moduleDescription)
    variables.moduleDescription = extra.moduleDescription;

  return { variables, language, gender, relationship };
}

async function prepareInstructorVariables(instructor, group, session = null) {
  const lang = instructor.language || "ar";
  const gender = instructor.gender || "male";
  const isMale = gender !== "female";

  const dbVars = await fetchDbVars({
    instructorGender: gender,
    studentGender: "male",
    guardianType: "father",
  });

  function resolveVar(key) {
    const v = dbVars[key];
    if (!v) return null;
    if (v.hasGender && v.genderType === "instructor") {
      return lang === "ar"
        ? (isMale ? v.valueMaleAr : v.valueFemaleAr) || v.valueAr || null
        : (isMale ? v.valueMaleEn : v.valueFemaleEn) || v.valueEn || null;
    }
    return lang === "ar" ? v.valueAr || null : v.valueEn || null;
  }

  const instructorFirstName = instructor.name?.split(" ")[0] || "";

  const salutationBase =
    resolveVar("instructorSalutation") ||
    (lang === "ar"
      ? isMale
        ? "عزيزي الأستاذ"
        : "عزيزتي الأستاذة"
      : isMale
        ? "Dear Mr."
        : "Dear Ms.");

  const instructorSalutation = `${salutationBase} ${instructorFirstName}`;

  const sessionDate = session?.scheduledDate
    ? new Date(session.scheduledDate).toLocaleDateString(
        lang === "ar" ? "ar-EG" : "en-US",
        { weekday: "long", year: "numeric", month: "long", day: "numeric" },
      )
    : "";

  const sessionShortName = session
    ? extractSessionShortName(session.title)
    : "";

  const variables = {
    instructorSalutation,
    salutation: instructorSalutation,
    instructorName: instructorFirstName,
    instructorFullName: instructor.name || "",
    groupName: group?.name || "",
    groupCode: group?.code || "",
    courseName: group?.courseSnapshot?.title || group?.courseId?.title || "",
    startDate: group?.schedule?.startDate
      ? new Date(group.schedule.startDate).toLocaleDateString(
          lang === "ar" ? "ar-EG" : "en-US",
          { weekday: "long", year: "numeric", month: "long", day: "numeric" },
        )
      : "",
    timeFrom: group?.schedule?.timeFrom || "",
    timeTo: group?.schedule?.timeTo || "",
    studentCount: group?.currentStudentsCount || group?.students?.length || 0,
  };

  if (session) {
    Object.assign(variables, {
      sessionName: sessionShortName || session.title || "",
      sessionFullTitle: session.title || "",
      sessionDescription: session.description || "",
      sessionNumber: session.sessionNumber || "",
      date: sessionDate,
      time: `${session.startTime || ""} - ${session.endTime || ""}`,
      meetingLink: session.meetingLink || "",
      username: session.meetingCredentials?.username || "", // ✅ للمدرب بس
      password: session.meetingCredentials?.password || "", // ✅ للمدرب بس
    });
  }

  return { variables, language: lang, gender };
}

export async function sendInstructorSessionReminder(
  sessionId,
  reminderType,
  metadata = {},
) {
  try {
    console.log(`\n🎯 Instructor Session Reminder ==========`);
    console.log(`📋 Session: ${sessionId} | Type: ${reminderType}`);

    const session = await Session.findById(sessionId)
      .populate("groupId")
      .lean();
    if (!session) throw new Error("Session not found");

    const group = await Group.findById(session.groupId._id || session.groupId)
      .populate("instructors.userId", "name email gender language profile")
      .lean();

    if (!group) throw new Error("Group not found");

    if (!group.instructors || group.instructors.length === 0) {
      console.log("⚠️ No instructors in group");
      return { success: false, reason: "no_instructors" };
    }

    const WhatsAppTemplateInstructor = (
      await import("../models/WhatsAppTemplateInstructor")
    ).default;

    const is24h = reminderType === "24hours";
    const dbTemplateType = is24h ? "reminder_24h" : "reminder_15min";

    const dbTemplate = await WhatsAppTemplateInstructor.findOne({
      templateType: dbTemplateType,
      isActive: true,
    }).lean();

    let successCount = 0;
    let failCount = 0;
    const results = [];

    for (const instructorEntry of group.instructors) {
      const instructor = instructorEntry.userId;

      if (!instructor?._id) {
        failCount++;
        continue;
      }

      const instructorPhone = instructor.profile?.phone?.trim();
      if (!instructorPhone) {
        console.log(`⚠️ No phone for instructor ${instructor.name}`);
        failCount++;
        results.push({
          instructorId: instructor._id,
          status: "skipped",
          reason: "no_phone",
        });
        continue;
      }

      try {
        const { variables, language } = await prepareInstructorVariables(
          instructor,
          group,
          session,
        );

        let messageContent = "";

        if (dbTemplate) {
          messageContent =
            language === "ar"
              ? dbTemplate.contentAr || dbTemplate.content || ""
              : dbTemplate.contentEn || dbTemplate.contentAr || "";
        } else {
          // fallback
          if (is24h) {
            messageContent =
              language === "ar"
                ? `{instructorSalutation} 👋\nحبيت أفكرك إن ميعادنا بكرة إن شاء الله ✨\n\n📘 الـ Session: {sessionName}\n📝 وصف السيشن: {sessionDescription}\n📅 التاريخ: {date}\n⏰ الوقت: {time}\n🔗 لينك الحصة:\n{meetingLink}\n\n🔐 بيانات الدخول:\n👤 Username: {username}\n🔑 Password: {password}\n\n👥 المجموعة: {groupName}\n🔢 عدد الطلاب: {studentCount}\n\nمتحمسين نشوفك بكرة 💻🚀\nفريق Code School`
                : `{instructorSalutation} 👋\nJust a reminder that our session is tomorrow, God willing ✨\n\n📘 Session: {sessionName}\n📝 Overview: {sessionDescription}\n📅 Date: {date}\n⏰ Time: {time}\n🔗 Meeting Link:\n{meetingLink}\n\n🔐 Login Details:\n👤 Username: {username}\n🔑 Password: {password}\n\n👥 Group: {groupName}\n🔢 Students: {studentCount}\n\nCan't wait to see you tomorrow 💻🚀\nCode School Team`;
          } else {
            messageContent =
              language === "ar"
                ? `{instructorSalutation} 👋\nحبيت أفكرك إن ميعادنا هيبدأ خلال *15 دقيقة* إن شاء الله ✨\n\n📘 الـ Session: {sessionName}\n📝 وصف السيشن: {sessionDescription}\n⏰ الوقت: {time}\n🔗 لينك الحصة:\n{meetingLink}\n\n🔐 بيانات الدخول:\n👤 Username: {username}\n🔑 Password: {password}\n\n👥 المجموعة: {groupName}\n\nمتحمسين نشوفك دلوقتي 💻🚀\nفريق Code School`
                : `{instructorSalutation} 👋\nJust a reminder that our session starts in *15 minutes*, God willing ✨\n\n📘 Session: {sessionName}\n📝 Overview: {sessionDescription}\n⏰ Time: {time}\n🔗 Meeting Link:\n{meetingLink}\n\n🔐 Login Details:\n👤 Username: {username}\n🔑 Password: {password}\n\n👥 Group: {groupName}\n\nCan't wait to see you now 💻🚀\nCode School Team`;
          }
        }

        const finalMessage = replaceVariables(messageContent, variables);

        const preparedPhone =
          wapilotService.preparePhoneNumber(instructorPhone);
        if (!preparedPhone) throw new Error("Invalid phone number");

        const sendResult = await wapilotService.sendTextMessage(
          preparedPhone,
          finalMessage,
        );

        if (sendResult) {
          successCount++;
          results.push({
            instructorId: instructor._id,
            instructorName: instructor.name,
            status: "sent",
            language,
          });
          console.log(`✅ Sent to instructor ${instructor.name} [${language}]`);
        } else {
          throw new Error("Send failed");
        }
      } catch (err) {
        failCount++;
        results.push({
          instructorId: instructor._id,
          instructorName: instructor.name,
          status: "failed",
          reason: err.message,
        });
        console.error(`❌ Failed for ${instructor.name}:`, err.message);
      }
    }

    return {
      success: successCount > 0,
      successCount,
      failCount,
      results,
    };
  } catch (error) {
    console.error("❌ Error in sendInstructorSessionReminder:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ✅ إرسال إشعارات الرصيد المنخفض
 */
export async function sendLowBalanceAlerts(students) {
  try {
    console.log(
      `\n📤 Sending low balance alerts to ${students.length} students`,
    );

    let successCount = 0;
    let failCount = 0;
    const results = [];

    for (const { student, remainingHours } of students) {
      try {
        const canSend = await canSendMessageForLowBalance(student);

        if (!canSend) {
          failCount++;
          results.push({
            studentId: student._id,
            status: "skipped",
            reason: "not_eligible",
          });
          continue;
        }

        const language =
          student.communicationPreferences?.preferredLanguage || "ar";
        const studentPhone = student.personalInfo?.whatsappNumber;
        const guardianPhone =
          student.guardianInfo?.whatsappNumber || student.guardianInfo?.phone;

        const studentFirstName =
          language === "ar"
            ? student.personalInfo?.nickname?.ar?.trim() ||
              student.personalInfo?.fullName?.split(" ")[0] ||
              "الطالب"
            : student.personalInfo?.nickname?.en?.trim() ||
              student.personalInfo?.fullName?.split(" ")[0] ||
              "Student";

        const guardianFirstName =
          language === "ar"
            ? student.guardianInfo?.nickname?.ar?.trim() ||
              student.guardianInfo?.name?.split(" ")[0] ||
              "ولي الأمر"
            : student.guardianInfo?.nickname?.en?.trim() ||
              student.guardianInfo?.name?.split(" ")[0] ||
              "Guardian";

        if (!studentPhone && !guardianPhone) {
          failCount++;
          results.push({
            studentId: student._id,
            status: "skipped",
            reason: "no_numbers",
          });
          continue;
        }

        let alertMessage = "";
        if (remainingHours <= 2) {
          alertMessage =
            language === "ar"
              ? `⚠️ تنبيه عاجل: رصيد الساعات الخاص بك على وشك النفاذ. الساعات المتبقية: ${remainingHours} ساعة فقط. يرجى التواصل مع الإدارة فوراً لتجديد الباقة.`
              : `⚠️ Urgent Alert: Your credit hours are almost exhausted. Remaining hours: ${remainingHours} only. Please contact administration immediately to renew your package.`;
        } else {
          alertMessage =
            language === "ar"
              ? `⚠️ تنبيه: رصيد الساعات الخاص بك على وشك النفاذ. الساعات المتبقية: ${remainingHours} ساعة. يرجى التواصل مع الإدارة لتجديد الباقة.`
              : `⚠️ Alert: Your credit hours are running low. Remaining hours: ${remainingHours}. Please contact administration to renew your package.`;
        }

        if (studentPhone) {
          await wapilotService.sendAndLogMessage({
            studentId: student._id,
            phoneNumber: studentPhone,
            messageContent: alertMessage,
            messageType: "credit_alert",
            language: language,
            metadata: {
              remainingHours,
              alertType: remainingHours <= 2 ? "critical" : "low_balance",
              recipientType: "student",
              studentName: studentFirstName,
            },
          });
        }

        if (guardianPhone) {
          const guardianMessage =
            language === "ar"
              ? `⚠️ تنبيه: رصيد ساعات ${studentFirstName} على وشك النفاذ. الساعات المتبقية: ${remainingHours} ساعة. يرجى التواصل مع الإدارة لتجديد الباقة.`
              : `⚠️ Alert: ${studentFirstName}'s credit hours are running low. Remaining hours: ${remainingHours}. Please contact administration to renew the package.`;

          await wapilotService.sendAndLogMessage({
            studentId: student._id,
            phoneNumber: guardianPhone,
            messageContent: guardianMessage,
            messageType: "credit_alert",
            language: language,
            metadata: {
              remainingHours,
              alertType: remainingHours <= 2 ? "critical" : "low_balance",
              recipientType: "guardian",
              studentName: studentFirstName,
              guardianName: guardianFirstName,
            },
          });
        }

        successCount++;
        results.push({
          studentId: student._id,
          status: "sent",
          remainingHours,
        });

        await student.logLowBalanceAlert();
      } catch (error) {
        console.error(
          `❌ Error sending low balance alert to student ${student._id}:`,
          error,
        );
        failCount++;
        results.push({
          studentId: student._id,
          status: "failed",
          error: error.message,
        });
      }
    }

    return {
      success: successCount > 0,
      sentCount: successCount,
      failCount,
      results,
    };
  } catch (error) {
    console.error("❌ Error in sendLowBalanceAlerts:", error);
    return {
      success: false,
      error: error.message,
      sentCount: 0,
      failCount: students.length,
    };
  }
}

export async function canSendMessageForLowBalance(student) {
  if (!student) return false;

  const whatsappEnabled =
    student.communicationPreferences?.notificationChannels?.whatsapp;
  if (!whatsappEnabled) {
    return false;
  }

  if (
    !student.personalInfo?.whatsappNumber &&
    !student.guardianInfo?.whatsappNumber &&
    !student.guardianInfo?.phone
  ) {
    return false;
  }

  return true;
}

export async function disableZeroBalanceNotifications(zeroBalanceStudents) {
  try {
    console.log(
      `\n🔕 Disabling notifications for ${zeroBalanceStudents.length} students with zero balance`,
    );

    let successCount = 0;
    let failCount = 0;
    const results = [];

    for (const { student } of zeroBalanceStudents) {
      try {
        student.communicationPreferences.notificationChannels = {
          ...student.communicationPreferences.notificationChannels,
          whatsapp: false,
        };
        await student.save();

        const language =
          student.communicationPreferences?.preferredLanguage || "ar";
        const studentPhone = student.personalInfo?.whatsappNumber;

        const studentFirstName =
          language === "ar"
            ? student.personalInfo?.nickname?.ar?.trim() ||
              student.personalInfo?.fullName?.split(" ")[0] ||
              "الطالب"
            : student.personalInfo?.nickname?.en?.trim() ||
              student.personalInfo?.fullName?.split(" ")[0] ||
              "Student";

        if (studentPhone) {
          const studentMessage =
            language === "ar"
              ? `❌ تم استنفاد رصيد الساعات الخاص بك. لن تتمكن من حضور الجلسات القادمة. يرجى التواصل مع الإدارة لتجديد الباقة.`
              : `❌ Your credit hours have been exhausted. You cannot attend future sessions. Please contact administration to renew your package.`;

          await wapilotService.sendAndLogMessage({
            studentId: student._id,
            phoneNumber: studentPhone,
            messageContent: studentMessage,
            messageType: "credit_exhausted",
            language: language,
            metadata: {
              alertType: "zero_balance",
              notificationsDisabled: true,
              recipientType: "student",
              studentName: studentFirstName,
            },
          });
        }

        const guardianPhone =
          student.guardianInfo?.whatsappNumber || student.guardianInfo?.phone;

        if (guardianPhone) {
          const guardianFirstName =
            language === "ar"
              ? student.guardianInfo?.nickname?.ar?.trim() ||
                student.guardianInfo?.name?.split(" ")[0] ||
                "ولي الأمر"
              : student.guardianInfo?.nickname?.en?.trim() ||
                student.guardianInfo?.name?.split(" ")[0] ||
                "Guardian";

          const guardianMessage =
            language === "ar"
              ? `❌ تم استنفاد رصيد ساعات ${studentFirstName}. لن يتمكن من حضور الجلسات القادمة. يرجى التواصل مع الإدارة لتجديد الباقة.`
              : `❌ ${studentFirstName}'s credit hours have been exhausted. They cannot attend future sessions. Please contact administration to renew the package.`;

          await wapilotService.sendAndLogMessage({
            studentId: student._id,
            phoneNumber: guardianPhone,
            messageContent: guardianMessage,
            messageType: "credit_exhausted",
            language: language,
            metadata: {
              alertType: "zero_balance",
              notificationsDisabled: true,
              recipientType: "guardian",
              studentName: studentFirstName,
              guardianName: guardianFirstName,
            },
          });
        }

        successCount++;
        results.push({ studentId: student._id, status: "disabled" });
      } catch (error) {
        console.error(
          `❌ Error disabling notifications for student ${student._id}:`,
          error,
        );
        failCount++;
        results.push({
          studentId: student._id,
          status: "failed",
          error: error.message,
        });
      }
    }

    return {
      success: successCount > 0,
      disabledCount: successCount,
      failCount,
      results,
    };
  } catch (error) {
    console.error("❌ Error in disableZeroBalanceNotifications:", error);
    return {
      success: false,
      error: error.message,
      disabledCount: 0,
      failCount: zeroBalanceStudents.length,
    };
  }
}

/**
 * ✅ استبدال المتغيرات في الرسالة
 */
function replaceVariables(message, variables) {
  if (!message) return message;
  let result = message;
  Object.entries(variables).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      const regex = new RegExp(`\\{${key}\\}`, "g");
      result = result.replace(regex, String(value));
    }
  });
  return result;
}

export async function getTemplatesForEvent(eventType, student, extraData = {}) {
  try {
    const language =
      student.communicationPreferences?.preferredLanguage || "ar";
    const gender = student.personalInfo?.gender || "male";
    const relationship = student.guardianInfo?.relationship || "father";

    let studentTemplateType = "";
    let guardianTemplateType = "";

    switch (eventType) {
      case "session_cancelled":
        studentTemplateType = "session_cancelled_student";
        guardianTemplateType = "session_cancelled_guardian";
        break;
      case "session_postponed":
        studentTemplateType = "session_postponed_student";
        guardianTemplateType = "session_postponed_guardian";
        break;
      case "reminder_24h":
        studentTemplateType = "reminder_24h_student";
        guardianTemplateType = "reminder_24h_guardian";
        break;
      case "reminder_15min":
      case "reminder_1h":
        studentTemplateType = "reminder_15min_student";
        guardianTemplateType = "reminder_15min_guardian";
        break;
      case "student_welcome":
        studentTemplateType = "student_welcome";
        guardianTemplateType = "guardian_notification";
        break;
      case "group_completion":
        studentTemplateType = "group_completion_student";
        guardianTemplateType = "group_completion_guardian";
        break;
      case "absence":
        studentTemplateType = null;
        guardianTemplateType = "absence_notification";
        break;
      case "late":
        studentTemplateType = null;
        guardianTemplateType = "late_notification";
        break;
      case "excused":
        studentTemplateType = null;
        guardianTemplateType = "excused_notification";
        break;
      default:
        throw new Error(`Unknown event type: ${eventType}`);
    }

    const [studentTemplate, guardianTemplate] = await Promise.all([
      studentTemplateType
        ? getMessageTemplate(studentTemplateType, language, "student")
        : Promise.resolve(null),
      guardianTemplateType
        ? getMessageTemplate(guardianTemplateType, language, "guardian")
        : Promise.resolve(null),
    ]);

    return {
      student: studentTemplate,
      guardian: guardianTemplate,
      metadata: {
        language,
        gender,
        relationship,
        studentName: student.personalInfo?.fullName?.split(" ")[0] || "الطالب",
        guardianName: student.guardianInfo?.name?.split(" ")[0] || "ولي الأمر",
      },
    };
  } catch (error) {
    console.error("❌ Error in getTemplatesForEvent:", error);
    throw error;
  }
}

export async function getTemplatesForFrontend(
  eventType,
  studentId,
  extraData = {},
) {
  try {
    const student = await Student.findById(studentId).lean();
    if (!student) {
      throw new Error("Student not found");
    }

    return await getTemplatesForEvent(eventType, student, extraData);
  } catch (error) {
    console.error("❌ Error in getTemplatesForFrontend:", error);
    throw error;
  }
}

export function replaceInstructorVariables(message, instructor, group) {
  const instructorName =
    instructor.name?.split(" ")[0] || instructor.name || "";

  const gender = instructor.gender || "male";

  let salutation = "";

  if (gender === "male") {
    salutation = `عزيزي ${instructorName}`;
  } else if (gender === "female") {
    salutation = `عزيزتي ${instructorName}`;
  } else {
    salutation = `عزيزي/عزيزتي ${instructorName}`;
  }

  const groupName = group.name || "{groupName}";
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
  const studentCount =
    group.currentStudentsCount || group.students?.length || 0;

  const result = message
    .replace(/\{salutation\}/g, salutation)
    .replace(/\{instructorName\}/g, instructorName)
    .replace(/\{groupName\}/g, groupName)
    .replace(/\{courseName\}/g, courseName)
    .replace(/\{startDate\}/g, startDate)
    .replace(/\{timeFrom\}/g, timeFrom)
    .replace(/\{timeTo\}/g, timeTo)
    .replace(/\{studentCount\}/g, studentCount.toString());

  return result;
}

export async function sendInstructorWelcomeMessages(
  groupId,
  instructorMessages = {},
) {
  try {
    console.log(`\n🎯 EVENT: Send Instructor Welcome Messages ==========`);

    const group = await Group.findById(groupId)
      .populate("courseId", "title level")
      .populate("instructors.userId", "name email gender profile")
      .lean();

    if (!group) throw new Error("Group not found");

    if (!group.instructors || group.instructors.length === 0) {
      return {
        success: true,
        message: "No instructors to notify",
        instructorsCount: 0,
        notificationsSent: 0,
      };
    }

    if (!group.automation?.whatsappEnabled) {
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

    for (const instructorEntry of group.instructors) {
      const instructor = instructorEntry.userId;

      if (!instructor || !instructor._id) {
        failCount++;
        notificationResults.push({
          status: "failed",
          reason: "Instructor userId not populated",
        });
        continue;
      }

      const instructorId = instructor._id.toString();
      const instructorPhone = instructor.profile?.phone?.trim() || null;

      if (!instructorPhone) {
        failCount++;
        notificationResults.push({
          instructorId,
          instructorName: instructor.name,
          status: "failed",
          reason: "No phone number registered",
        });
        continue;
      }

      let messageContent;
      let messageLang = "ar";

      const frontendMsg = instructorMessages[instructorId];

      if (frontendMsg) {
        if (typeof frontendMsg === "object" && frontendMsg.message) {
          messageContent = frontendMsg.message;
          messageLang = frontendMsg.language || "ar";
        } else if (typeof frontendMsg === "string") {
          messageContent = frontendMsg;
          messageLang = "ar";
        }
      } else {
        messageLang = "ar";

        const defaultTemplate = `{salutation}،

يسرنا إعلامك بأن مجموعة جديدة قد تم تعيينها وتفعيلها بنجاح تحت إشرافك بالتفاصيل التالية:

📘 البرنامج: {courseName}
👥 المجموعة: {groupName}
📅 تاريخ الحصة الأولى: {startDate}
⏰ الموعد: {timeFrom} – {timeTo}
👦👧 عدد الطلاب: {studentCount}

📌 يرجى التأكد من التالي:
- مراجعة المنهج وخطة الجلسة قبل الحصة الأولى
- فتح رابط الاجتماع قبل ١٠-١٥ دقيقة على الأقل
- التأكد من جاهزية جميع الأدوات والمواد المطلوبة
- تسجيل الحضور وتقييم الجلسة بعد كل حصة

نقدر التزامك واحترافيتك ونتمنى لك رحلة تعليمية ناجحة ومؤثرة مع طلابك 🚀

مع أطيب التحيات،
إدارة Code School 💻`;

        messageContent = replaceInstructorVariables(
          defaultTemplate,
          instructor,
          group,
        );
      }

      try {
        const preparedPhone =
          wapilotService.preparePhoneNumber(instructorPhone);

        if (!preparedPhone) {
          throw new Error(`Invalid phone number format: ${instructorPhone}`);
        }

        const sendResult = await wapilotService.sendTextMessage(
          preparedPhone,
          messageContent,
        );

        successCount++;
        notificationResults.push({
          instructorId,
          instructorName: instructor.name,
          status: "sent",
          language: messageLang,
        });

        try {
          await User.findByIdAndUpdate(instructor._id, {
            $set: {
              "metadata.lastGroupNotificationSent": new Date(),
              "metadata.lastNotificationGroupId": group._id,
            },
            $push: {
              notificationHistory: {
                groupId: group._id,
                groupName: group.name,
                courseName:
                  group.courseSnapshot?.title || group.courseId?.title || "",
                messageContent: messageContent,
                language: messageLang,
                sentAt: new Date(),
                status: "sent",
                failureReason: "",
              },
            },
          });
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
          status: "failed",
          reason: error.message,
        });
      }
    }

    return {
      success: successCount > 0,
      message: `${successCount} notifications sent, ${failCount} failed`,
      instructorsCount: group.instructors.length,
      notificationsSent: successCount,
      notificationsFailed: failCount,
      notificationResults,
    };
  } catch (error) {
    console.error("❌ Error in sendInstructorWelcomeMessages:", error);
    throw error;
  }
}

async function sendToStudentWithLogging({
  studentId,
  student,
  studentMessage,
  guardianMessage,
  messageType,
  metadata = {},
}) {
  try {
    const studentWhatsApp = student.personalInfo?.whatsappNumber;
    const guardianWhatsApp = student.guardianInfo?.whatsappNumber;
    const language =
      student.communicationPreferences?.preferredLanguage || "ar";

    const results = {
      guardian: false,
      student: false,
      guardianError: null,
      studentError: null,
    };

    if (guardianWhatsApp && guardianMessage) {
      try {
        await wapilotService.sendAndLogMessage({
          studentId,
          phoneNumber: guardianWhatsApp,
          messageContent: guardianMessage,
          messageType,
          language,
          metadata: {
            ...metadata,
            recipientType: "guardian",
            guardianName: student.guardianInfo?.name,
          },
        });
        results.guardian = true;
      } catch (error) {
        results.guardianError = error.message;
        console.error(`❌ Failed to send guardian message:`, error);
      }
    }

    if (studentWhatsApp && studentMessage) {
      try {
        await wapilotService.sendAndLogMessage({
          studentId,
          phoneNumber: studentWhatsApp,
          messageContent: studentMessage,
          messageType,
          language,
          metadata: { ...metadata, recipientType: "student" },
        });
        results.student = true;
      } catch (error) {
        results.studentError = error.message;
        console.error(`❌ Failed to send student message:`, error);
      }
    }

    return {
      success: results.guardian || results.student,
      studentId,
      studentName: student.personalInfo?.fullName,
      sentTo: { guardian: results.guardian, student: results.student },
      errors: {
        guardian: results.guardianError,
        student: results.studentError,
      },
    };
  } catch (error) {
    console.error(`❌ Critical error in sendToStudentWithLogging:`, error);
    return { success: false, error: error.message, studentId };
  }
}

export async function onStudentAddedToGroup(
  studentId,
  groupId,
  customMessages = { student: null, guardian: null, moduleOverview: null },
  sendWhatsApp = true,
  moduleData = {}, // ✅ جديد
) {
  try {
    console.log(`\n🎯 EVENT: Student Added to Group ==========`);

    const [student, group] = await Promise.all([
      Student.findById(studentId),
      Group.findById(groupId)
        .populate("courseId")
        .populate("instructors.userId", "name email gender profile"),
    ]);

    if (!student || !group) throw new Error("Student or Group not found");

    await Student.findByIdAndUpdate(
      studentId,
      {
        $addToSet: { "academicInfo.groupIds": groupId },
        $set: { "metadata.updatedAt": new Date() },
      },
      { new: true },
    );

    let studentMessageSent = false;
    let guardianMessageSent = false;
    let moduleOverviewSent = false;

    if (
      sendWhatsApp &&
      group.automation?.whatsappEnabled &&
      group.automation?.welcomeMessage
    ) {
      // ✅ مرّر moduleData لـ prepareStudentVariables
      const { variables, language } = await prepareStudentVariables(
        student,
        group,
        null,
        {
          moduleTitle: moduleData.moduleTitle || "",
          moduleDescription: moduleData.moduleDescription || "",
        },
      );

      if (student.personalInfo?.whatsappNumber) {
        let finalStudentMessage = "";

        if (customMessages.student) {
          finalStudentMessage = customMessages.student;
        } else {
          const template = await getMessageTemplate(
            "student_welcome",
            language,
            "student",
          );
          const studentVars = {
            ...variables,
            salutation: variables.studentSalutation,
          };
          finalStudentMessage = replaceVariables(template.content, studentVars);
        }

        try {
          await wapilotService.sendAndLogMessage({
            studentId,
            phoneNumber: student.personalInfo.whatsappNumber,
            messageContent: finalStudentMessage,
            messageType: "group_welcome_student",
            language,
            metadata: {
              groupId: group._id,
              groupName: group.name,
              groupCode: group.code,
              isCustomMessage: !!customMessages.student,
              automationType: "group_enrollment",
              recipientType: "student",
            },
          });
          studentMessageSent = true;
        } catch (err) {
          console.error("   ❌ Student message failed:", err.message);
        }
      }

      if (student.guardianInfo?.whatsappNumber) {
        let finalGuardianMessage = "";

        if (customMessages.guardian) {
          finalGuardianMessage = customMessages.guardian;
        } else {
          const template = await getMessageTemplate(
            "guardian_notification",
            language,
            "guardian",
          );
          const guardianVars = {
            ...variables,
            salutation: variables.guardianSalutation,
          };
          finalGuardianMessage = replaceVariables(
            template.content,
            guardianVars,
          );
        }

        try {
          await wapilotService.sendAndLogMessage({
            studentId,
            phoneNumber: student.guardianInfo.whatsappNumber,
            messageContent: finalGuardianMessage,
            messageType: "group_welcome_guardian",
            language,
            metadata: {
              groupId: group._id,
              groupName: group.name,
              groupCode: group.code,
              isCustomMessage: !!customMessages.guardian,
              automationType: "group_enrollment",
              recipientType: "guardian",
              guardianName: student.guardianInfo?.name,
            },
          });
          guardianMessageSent = true;
        } catch (err) {
          console.error("   ❌ Guardian message failed:", err.message);
        }
      }

      if (
        customMessages.moduleOverview &&
        customMessages.moduleOverview.trim()
      ) {
        if (student.guardianInfo?.whatsappNumber) {
          try {
            await wapilotService.sendAndLogEvalMessage({
              studentId,
              phoneNumber: student.guardianInfo.whatsappNumber,
              messageContent: customMessages.moduleOverview,
              messageType: "guardian_notification",
              language,
              metadata: {
                groupId: group._id,
                groupName: group.name,
                groupCode: group.code,
                isCustomMessage: true,
                automationType: "group_enrollment",
                recipientType: "guardian",
                guardianName: student.guardianInfo?.name,
                messageSubType: "module_overview",
              },
            });
            moduleOverviewSent = true;
          } catch (err) {
            console.error("   ❌ Module overview message failed:", err.message);
          }
        }
      }
    }

    return {
      success: true,
      studentId,
      groupId,
      groupCode: group.code,
      studentName: student.personalInfo.fullName,
      messagesSent: {
        student: studentMessageSent,
        guardian: guardianMessageSent,
        moduleOverview: moduleOverviewSent,
      },
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("❌ Error in onStudentAddedToGroup:", error);
    throw error;
  }
}

export function replaceStudentVariables(
  message,
  student,
  group,
  language = "ar",
  recipientType = "student",
) {
  const studentNickname =
    language === "ar"
      ? student.personalInfo?.nickname?.ar ||
        student.personalInfo?.fullName?.split(" ")[0]
      : student.personalInfo?.nickname?.en ||
        student.personalInfo?.fullName?.split(" ")[0];

  const guardianNickname =
    language === "ar"
      ? student.guardianInfo?.nickname?.ar ||
        student.guardianInfo?.name?.split(" ")[0]
      : student.guardianInfo?.nickname?.en ||
        student.guardianInfo?.name?.split(" ")[0];

  const gender = student.personalInfo?.gender || "Male";
  const relationship = student.guardianInfo?.relationship || "father";

  let salutation = "";

  if (recipientType === "student") {
    if (language === "ar") {
      salutation =
        gender === "Male"
          ? `عزيزي ${studentNickname}`
          : `عزيزتي ${studentNickname}`;
    } else {
      salutation = `Dear ${studentNickname}`;
    }
  } else {
    if (language === "ar") {
      if (relationship === "father") {
        salutation = `عزيزي الأستاذ ${guardianNickname}`;
      } else if (relationship === "mother") {
        salutation = `عزيزتي السيدة ${guardianNickname}`;
      } else {
        salutation = `عزيزي/عزيزتي ${guardianNickname}`;
      }
    } else {
      if (relationship === "father") {
        salutation = `Dear Mr. ${guardianNickname}`;
      } else if (relationship === "mother") {
        salutation = `Dear Mrs. ${guardianNickname}`;
      } else {
        salutation = `Dear ${guardianNickname}`;
      }
    }
  }

  const childTitle =
    language === "ar"
      ? gender === "Male"
        ? "ابنك"
        : "ابنتك"
      : gender === "Male"
        ? "your son"
        : "your daughter";

  const groupName = group.name || "{groupName}";
  const groupCode = group.code || "{groupCode}";
  const courseName =
    group.courseSnapshot?.title || group.courseId?.title || "{courseName}";

  const startDate = group.schedule?.startDate
    ? new Date(group.schedule.startDate).toLocaleDateString(
        language === "ar" ? "ar-EG" : "en-US",
        {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        },
      )
    : "{startDate}";

  const timeFrom = group.schedule?.timeFrom || "{timeFrom}";
  const timeTo = group.schedule?.timeTo || "{timeTo}";

  let instructorName = "";

  if (
    group.instructors &&
    Array.isArray(group.instructors) &&
    group.instructors.length > 0
  ) {
    const instructor = group.instructors[0];
    instructorName =
      instructor.name ||
      instructor.profile?.name ||
      instructor.fullName ||
      (typeof instructor === "string" ? instructor : "");
  }

  if (!instructorName && group.courseSnapshot?.instructor) {
    instructorName = group.courseSnapshot.instructor;
  }

  if (instructorName) {
    instructorName = instructorName.trim();
  }

  const result = message
    .replace(/\{salutation\}/g, salutation)
    .replace(/\{studentName\}/g, studentNickname)
    .replace(/\{guardianName\}/g, guardianNickname)
    .replace(/\{childTitle\}/g, childTitle)
    .replace(/\{groupName\}/g, groupName)
    .replace(/\{groupCode\}/g, groupCode)
    .replace(/\{courseName\}/g, courseName)
    .replace(/\{startDate\}/g, startDate)
    .replace(/\{timeFrom\}/g, timeFrom)
    .replace(/\{timeTo\}/g, timeTo)
    .replace(/\{instructor\}/g, instructorName);

  return result;
}

export async function onAttendanceSubmitted(sessionId, customMessages = {}) {
  try {
    console.log(`\n🎯 EVENT: Attendance Submitted ==========`);

    const session = await Session.findById(sessionId)
      .populate("groupId")
      .lean();

    if (!session) {
      throw new Error("Session not found");
    }

    const notificationResult = await sendAbsenceNotifications(
      sessionId,
      session.attendance || [],
      customMessages,
    );

    return {
      success: true,
      successCount: notificationResult.sentCount,
      failCount: notificationResult.skippedCount,
      details: notificationResult,
    };
  } catch (error) {
    console.error("❌ Error in onAttendanceSubmitted:", error);
    return {
      success: false,
      error: error.message,
      successCount: 0,
      failCount: 0,
    };
  }
}

export async function sendLowBalanceAlert(student) {
  try {
    const canSend = await canSendMessageForLowBalance(student);

    if (!canSend) {
      return { success: false, reason: "not_eligible" };
    }

    const language =
      student.communicationPreferences?.preferredLanguage || "ar";
    const studentPhone = student.personalInfo?.whatsappNumber;
    const guardianPhone =
      student.guardianInfo?.whatsappNumber || student.guardianInfo?.phone;
    const remainingHours =
      student.creditSystem?.currentPackage?.remainingHours || 0;

    const studentFirstName =
      language === "ar"
        ? student.personalInfo?.nickname?.ar?.trim() ||
          student.personalInfo?.fullName?.split(" ")[0] ||
          "الطالب"
        : student.personalInfo?.nickname?.en?.trim() ||
          student.personalInfo?.fullName?.split(" ")[0] ||
          "Student";

    const guardianFirstName =
      language === "ar"
        ? student.guardianInfo?.nickname?.ar?.trim() ||
          student.guardianInfo?.name?.split(" ")[0] ||
          "ولي الأمر"
        : student.guardianInfo?.nickname?.en?.trim() ||
          student.guardianInfo?.name?.split(" ")[0] ||
          "Guardian";

    if (!studentPhone && !guardianPhone) {
      return { success: false, reason: "no_numbers" };
    }

    let alertMessage = "";
    if (remainingHours <= 2) {
      alertMessage =
        language === "ar"
          ? `⚠️ تنبيه عاجل: رصيد الساعات الخاص بك على وشك النفاذ. الساعات المتبقية: ${remainingHours} ساعة فقط. يرجى التواصل مع الإدارة فوراً لتجديد الباقة.`
          : `⚠️ Urgent Alert: Your credit hours are almost exhausted. Remaining hours: ${remainingHours} only. Please contact administration immediately to renew your package.`;
    } else {
      alertMessage =
        language === "ar"
          ? `⚠️ تنبيه: رصيد الساعات الخاص بك على وشك النفاذ. الساعات المتبقية: ${remainingHours} ساعة. يرجى التواصل مع الإدارة لتجديد الباقة.`
          : `⚠️ Alert: Your credit hours are running low. Remaining hours: ${remainingHours}. Please contact administration to renew your package.`;
    }

    const results = [];

    if (studentPhone) {
      const studentResult = await wapilotService.sendAndLogMessage({
        studentId: student._id,
        phoneNumber: studentPhone,
        messageContent: alertMessage,
        messageType: "credit_alert",
        language: language,
        metadata: {
          remainingHours,
          alertType: remainingHours <= 2 ? "critical" : "low_balance",
          recipientType: "student",
          studentName: studentFirstName,
        },
      });

      if (studentResult.success) {
        results.push({ recipient: "student", success: true });
      }
    }

    if (guardianPhone) {
      const guardianMessage =
        language === "ar"
          ? `⚠️ تنبيه: رصيد ساعات ${studentFirstName} على وشك النفاذ. الساعات المتبقية: ${remainingHours} ساعة. يرجى التواصل مع الإدارة لتجديد الباقة.`
          : `⚠️ Alert: ${studentFirstName}'s credit hours are running low. Remaining hours: ${remainingHours}. Please contact administration to renew the package.`;

      const guardianResult = await wapilotService.sendAndLogMessage({
        studentId: student._id,
        phoneNumber: guardianPhone,
        messageContent: guardianMessage,
        messageType: "credit_alert",
        language: language,
        metadata: {
          remainingHours,
          alertType: remainingHours <= 2 ? "critical" : "low_balance",
          recipientType: "guardian",
          studentName: studentFirstName,
          guardianName: guardianFirstName,
        },
      });

      if (guardianResult.success) {
        results.push({ recipient: "guardian", success: true });
      }
    }

    return {
      success: results.length > 0,
      results,
    };
  } catch (error) {
    console.error(`❌ Error sending low balance alert:`, error);
    return { success: false, error: error.message };
  }
}

export async function onSessionStatusChanged(
  sessionId,
  newStatus,
  customMessage = null,
  newDate = null,
  newTime = null,
  metadata = {},
) {
  try {
    console.log(`\n🔄 SESSION STATUS CHANGE ==========`);
    console.log(`📋 Session: ${sessionId} | Status: ${newStatus}`);

    if (newStatus !== "cancelled" && newStatus !== "postponed") {
      return { success: true, message: "No notifications needed" };
    }

    const session = await Session.findById(sessionId)
      .populate("groupId")
      .lean();
    if (!session) return { success: false, error: "Session not found" };

    const group = session.groupId;

    const students = await Student.find({
      "academicInfo.groupIds": group._id,
      isDeleted: false,
    }).lean();

    let successCount = 0;
    let failCount = 0;
    const notificationResults = [];

    for (const student of students) {
      try {
        const { variables, language } = await prepareStudentVariables(
          student,
          group,
          session,
          { newDate, newTime },
        );

        const studentIdStr = student._id.toString();

        let finalStudentMessage = "";

        const perStudentMsg = metadata?.studentMessages?.[studentIdStr];
        const sharedStudentMsg = metadata?.studentMessage;

        if (perStudentMsg) {
          finalStudentMessage = perStudentMsg;
        } else if (sharedStudentMsg) {
          finalStudentMessage = replaceVariables(sharedStudentMsg, variables);
        } else {
          const templateType =
            newStatus === "cancelled"
              ? "session_cancelled_student"
              : "session_postponed_student";
          const template = await getMessageTemplate(
            templateType,
            language,
            "student",
          );
          finalStudentMessage = replaceVariables(template.content, variables);
        }

        let finalGuardianMessage = "";

        const perGuardianMsg = metadata?.guardianMessages?.[studentIdStr];
        const sharedGuardianMsg = metadata?.guardianMessage;

        if (perGuardianMsg) {
          finalGuardianMessage = perGuardianMsg;
        } else if (sharedGuardianMsg) {
          finalGuardianMessage = replaceVariables(sharedGuardianMsg, variables);
        } else {
          const templateType =
            newStatus === "cancelled"
              ? "session_cancelled_guardian"
              : "session_postponed_guardian";
          const template = await getMessageTemplate(
            templateType,
            language,
            "guardian",
          );
          finalGuardianMessage = replaceVariables(template.content, variables);
        }

        const result = await sendToStudentWithLogging({
          studentId: student._id,
          student,
          studentMessage: finalStudentMessage,
          guardianMessage: finalGuardianMessage,
          messageType:
            newStatus === "cancelled"
              ? "session_cancelled"
              : "session_postponed",
          metadata: {
            sessionId,
            sessionTitle: session.title,
            groupId: group._id,
            oldStatus: session.status,
            newStatus,
            newDate,
            newTime,
          },
        });

        if (result.success) {
          successCount++;
          notificationResults.push({
            studentId: student._id,
            studentName: student.personalInfo?.fullName,
            status: "sent",
            sentTo: result.sentTo,
            language,
          });
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Error processing student ${student._id}:`, error);
        failCount++;
      }
    }

    return {
      success: successCount > 0,
      totalStudents: students.length,
      successCount,
      failCount,
      notificationResults,
    };
  } catch (error) {
    console.error(`❌ Error in onSessionStatusChanged:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * ✅ Send manual session reminder
 * ✅ يدعم: 24hours | 15min (و 1hour للتوافق مع الكود القديم)
 */
export async function sendManualSessionReminder(
  sessionId,
  reminderType,
  customMessage = null,
  metadata = {},
) {
  try {
    console.log(`\n🎯 Manual Session Reminder ==========`);
    console.log(`📋 Session: ${sessionId} | Type: ${reminderType}`);
    console.log(`🤖 Automated Cron: ${metadata?.automatedCron ? "Yes" : "No"}`);

    const session = await Session.findById(sessionId)
      .populate("groupId")
      .lean();
    if (!session) throw new Error("Session not found");

    const group = session.groupId;

    const students = await Student.find({
      "academicInfo.groupIds": group._id,
      isDeleted: false,
    }).lean();

    console.log(`👥 Found ${students.length} students`);
    if (students.length === 0)
      return { success: false, reason: "No students found" };

    let successCount = 0;
    let failCount = 0;
    const notificationResults = [];

    // ✅ تحديد نوع القالب
    // 15min و 1hour بيستخدموا نفس القالب (reminder_15min)
    const is24h = reminderType === "24hours";
    const guardianTemplateType = is24h
      ? "reminder_24h_guardian"
      : "reminder_15min_guardian";
    const studentTemplateType = is24h
      ? "reminder_24h_student"
      : "reminder_15min_student";

    for (const student of students) {
      try {
        const { variables, language } = await prepareStudentVariables(
          student,
          group,
          session,
        );

        const studentIdStr = student._id.toString();

        console.log(`📤 ${student.personalInfo?.fullName} | ${language}`);

        // ── رسالة الطالب ──────────────────────────────────────────────────
        let finalStudentMessage = "";

        const perStudentTemplate = metadata?.studentMessages?.[studentIdStr];
        const sharedStudentTemplate = metadata?.studentMessage;

        if (perStudentTemplate) {
          finalStudentMessage = replaceVariables(perStudentTemplate, variables);
        } else if (sharedStudentTemplate) {
          if (language === "ar") {
            finalStudentMessage = replaceVariables(
              sharedStudentTemplate,
              variables,
            );
          } else {
            const template = await getMessageTemplate(
              studentTemplateType,
              "en",
              "student",
            );
            finalStudentMessage = replaceVariables(template.content, variables);
          }
        } else {
          const template = await getMessageTemplate(
            studentTemplateType,
            language,
            "student",
          );
          finalStudentMessage = replaceVariables(template.content, variables);
        }

        // ── رسالة ولي الأمر ───────────────────────────────────────────────
        let finalGuardianMessage = "";

        const perGuardianTemplate = metadata?.guardianMessages?.[studentIdStr];
        const sharedGuardianTemplate = metadata?.guardianMessage;

        if (perGuardianTemplate) {
          finalGuardianMessage = replaceVariables(
            perGuardianTemplate,
            variables,
          );
        } else if (sharedGuardianTemplate) {
          if (language === "ar") {
            finalGuardianMessage = replaceVariables(
              sharedGuardianTemplate,
              variables,
            );
          } else {
            const template = await getMessageTemplate(
              guardianTemplateType,
              "en",
              "guardian",
            );
            finalGuardianMessage = replaceVariables(
              template.content,
              variables,
            );
          }
        } else {
          const template = await getMessageTemplate(
            guardianTemplateType,
            language,
            "guardian",
          );
          finalGuardianMessage = replaceVariables(template.content, variables);
        }

        const result = await sendToStudentWithLogging({
          studentId: student._id,
          student,
          studentMessage: finalStudentMessage,
          guardianMessage: finalGuardianMessage,
          messageType: guardianTemplateType,
          metadata: {
            sessionId,
            sessionTitle: session.title,
            groupId: group._id,
            reminderType,
          },
        });

        if (result.success) {
          successCount++;
          notificationResults.push({
            ...result,
            language,
          });
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Error processing student ${student._id}:`, error);
        failCount++;
      }
    }

    // ============================================================
    // ✅ تعليم الـ DB بعد إرسال الـ cron التلقائي
    // ============================================================
    if (metadata?.automatedCron && successCount > 0) {
      try {
        let updateField = {};

        if (reminderType === "24hours") {
          updateField = {
            "automationEvents.reminder24hSent": true,
            "automationEvents.reminder24hSentAt": new Date(),
            "automationEvents.reminder24hStudentsNotified": successCount,
            "automationEvents.reminderSent": true,
            "automationEvents.reminderSentAt": new Date(),
            "automationEvents.reminderStats.total24hSent": successCount,
            "automationEvents.reminderStats.total24hFailed": failCount,
          };
        } else {
          // 15min أو 1hour
          updateField = {
            "automationEvents.reminder15minSent": true,
            "automationEvents.reminder15minSentAt": new Date(),
            "automationEvents.reminder15minStudentsNotified": successCount,
            // للتوافق مع الكود القديم
            "automationEvents.reminder1hSent": true,
            "automationEvents.reminder1hSentAt": new Date(),
            "automationEvents.reminder1hStudentsNotified": successCount,
            "automationEvents.reminderSent": true,
            "automationEvents.reminderSentAt": new Date(),
            "automationEvents.reminderStats.total1hSent": successCount,
            "automationEvents.reminderStats.total1hFailed": failCount,
          };
        }

        await Session.findByIdAndUpdate(sessionId, { $set: updateField });
        console.log(
          `✅ [CRON] Marked ${reminderType} reminder as sent in DB for session ${sessionId}`,
        );
      } catch (markError) {
        console.error(
          "⚠️ Failed to mark reminder as sent in DB (non-critical):",
          markError.message,
        );
      }
    }

    console.log(
      `\n✅ Reminder complete: ${successCount} sent, ${failCount} failed`,
    );

    return {
      success: successCount > 0,
      totalStudents: students.length,
      successCount,
      failCount,
      reminderType,
      notificationResults,
    };
  } catch (error) {
    console.error("❌ Error in sendManualSessionReminder:", error);
    throw error;
  }
}

export async function onGroupCompleted(
  groupId,
  customMessage = null,
  feedbackLink = null,
  customMessages = {},
) {
  try {
    console.log(`\n🎯 Group Completed ==========`);

    const group = await Group.findById(groupId)
      .populate("courseId", "title level")
      .lean();
    if (!group) return { success: false, error: "Group not found" };

    const students = await Student.find({
      "academicInfo.groupIds": new mongoose.Types.ObjectId(groupId),
      isDeleted: false,
    })
      .select(
        "personalInfo guardianInfo communicationPreferences enrollmentNumber",
      )
      .lean();

    if (students.length === 0)
      return { success: false, error: "No students in group" };

    let successCount = 0;
    let failCount = 0;
    const notificationResults = [];

    for (const student of students) {
      try {
        const { variables, language } = await prepareStudentVariables(
          student,
          group,
          null,
          { feedbackLink: feedbackLink || "" },
        );

        const studentIdStr = student._id.toString();
        const perStudentMsgs = customMessages[studentIdStr];

        let finalStudentMessage = "";
        if (perStudentMsgs?.student?.trim()) {
          finalStudentMessage = perStudentMsgs.student;
        } else if (customMessage) {
          finalStudentMessage = replaceVariables(customMessage, variables);
        } else {
          const template = await getMessageTemplate(
            "group_completion_student",
            language,
            "student",
          );
          finalStudentMessage = replaceVariables(template.content, variables);
        }

        let finalGuardianMessage = "";
        if (perStudentMsgs?.guardian?.trim()) {
          finalGuardianMessage = perStudentMsgs.guardian;
        } else if (customMessage) {
          finalGuardianMessage = replaceVariables(customMessage, variables);
        } else {
          const template = await getMessageTemplate(
            "group_completion_guardian",
            language,
            "guardian",
          );
          finalGuardianMessage = replaceVariables(template.content, variables);
        }

        if (feedbackLink) {
          const feedbackSuffix =
            language === "ar"
              ? `\n\n📋 نرجو منك تقييم الدورة:\n${feedbackLink}`
              : `\n\n📋 Please rate the course:\n${feedbackLink}`;

          if (!finalStudentMessage.includes(feedbackLink)) {
            finalStudentMessage += feedbackSuffix;
          }
          if (!finalGuardianMessage.includes(feedbackLink)) {
            finalGuardianMessage += feedbackSuffix;
          }
        }

        const result = await sendToStudentWithLogging({
          studentId: student._id,
          student,
          studentMessage: finalStudentMessage,
          guardianMessage: finalGuardianMessage,
          messageType: "group_completion",
          metadata: {
            groupId: group._id,
            groupName: group.name,
            groupCode: group.code,
          },
        });

        if (result.success) {
          successCount++;
          notificationResults.push({
            studentId: student._id,
            studentName: student.personalInfo?.fullName,
            status: "sent",
            sentTo: result.sentTo,
            language,
          });
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Error processing student:`, error);
        failCount++;
      }
    }

    return {
      success: successCount > 0,
      totalStudents: students.length,
      successCount,
      failCount,
      successRate: ((successCount / students.length) * 100).toFixed(1),
      notificationResults,
    };
  } catch (error) {
    console.error(`❌ Error in onGroupCompleted:`, error);
    return { success: false, error: error.message };
  }
}

export function processCustomMessage(message, student, session, group, status) {
  const guardianName = student.guardianInfo?.name || "Guardian";
  const studentName = student.personalInfo?.fullName || "Student";

  const variables = {
    guardianName,
    studentName,
    sessionName:
      extractSessionShortName(session.title) || session.title || "Session",
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

export function processCompletionMessage(
  message,
  student,
  group,
  feedbackLink,
) {
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

export function prepareCompletionMessage(
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

${feedbackLink ? `📋 Please share your feedback:\n${feedbackLink}\n\n` : ""}
Code School Team 💻`;
  } else {
    return `🎓 مبروك! أتممت الكورس بنجاح!

عزيزي/عزيزتي ${studentName},

مبروك على إتمامك:
📚 ${courseName}
👥 المجموعة: ${group.code}

نحن فخورون بإنجازك! 🎉

${feedbackLink ? `📋 نرجو منك تقييم تجربتك:\n${feedbackLink}\n\n` : ""}
فريق Code School 💻`;
  }
}

export function prepareAbsenceNotificationMessage(
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
  const shortName = extractSessionShortName(session.title) || session.title;

  if (language === "en") {
    if (status === "absent") {
      return `📢 Absence Notification

Dear ${guardianName},

${studentName} was absent from today's session:

📚 Session: ${shortName}
👥 Group: ${group.code}
📅 Date: ${sessionDate}
⏰ Time: ${session.startTime} - ${session.endTime}

Code School Team 💻`;
    } else if (status === "late") {
      return `⏰ Late Arrival Notification

Dear ${guardianName},

${studentName} arrived late to today's session:

📚 Session: ${shortName}
👥 Group: ${group.code}
📅 Date: ${sessionDate}

Code School Team 💻`;
    } else if (status === "excused") {
      return `ℹ️ Excused Absence

Dear ${guardianName},

${studentName} was excused from today's session:

📚 Session: ${shortName}
📅 Date: ${sessionDate}

Code School Team 💻`;
    }
  } else {
    if (status === "absent") {
      return `📢 إشعار غياب

عزيزي/عزيزتي ${guardianName},

لاحظنا أن ${studentName} كان/ت غائب/ة عن محاضرة اليوم:

📚 المحاضرة: ${shortName}
👥 المجموعة: ${group.code}
📅 التاريخ: ${sessionDate}
⏰ الوقت: ${session.startTime} - ${session.endTime}

فريق Code School 💻`;
    } else if (status === "late") {
      return `⏰ إشعار تأخير

عزيزي/عزيزتي ${guardianName},

${studentName} وصل/ت متأخر/ة إلى محاضرة اليوم:

📚 المحاضرة: ${shortName}
📅 التاريخ: ${sessionDate}

فريق Code School 💻`;
    } else if (status === "excused") {
      return `ℹ️ إشعار غياب بعذر

عزيزي/عزيزتي ${guardianName},

${studentName} كان/ت غائب/ة بعذر:

📚 المحاضرة: ${shortName}
📅 التاريخ: ${sessionDate}

فريق Code School 💻`;
    }
  }

  return `Notification for ${studentName} - Status: ${status}`;
}

export function prepareSessionUpdateMessage(
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
    { weekday: "long", year: "numeric", month: "long", day: "numeric" },
  );
  const shortName = extractSessionShortName(session.title) || session.title;

  if (language === "en") {
    if (status === "cancelled") {
      return `ℹ️ Session Cancellation – Code School

Dear ${guardianName},

Today's session has been cancelled:

📘 Session: ${shortName}
👨‍🎓 Student: ${studentName} (ID: ${enrollmentNumber})
📅 Date: ${formattedDate}
⏰ Time: ${session.startTime} - ${session.endTime}

This session will NOT be counted from your package.
A makeup session will be arranged soon.

Code School Team 💻`;
    } else {
      return `📅 Session Rescheduling – Code School

Dear ${guardianName},

The upcoming session has been rescheduled:

📘 Session: ${shortName}
👨‍🎓 Student: ${studentName} (ID: ${enrollmentNumber})
📅 Original Date: ${formattedDate}
⏰ Time: ${session.startTime} - ${session.endTime}

This session will NOT be lost from your package.

Code School Team 💻`;
    }
  } else {
    if (status === "cancelled") {
      return `ℹ️ إشعار إلغاء الجلسة – Code School

عزيزي/عزيزتي ${guardianName}،

تم إلغاء جلسة اليوم:

📘 الجلسة: ${shortName}
👨‍🎓 الطالب: ${studentName} (الرقم: ${enrollmentNumber})
📅 التاريخ: ${formattedDate}
⏰ الوقت: ${session.startTime} - ${session.endTime}

هذه الجلسة لن تحسب من الباقة.
سيتم ترتيب جلسة تعويضية قريباً.

إدارة Code School 💻`;
    } else {
      return `📅 إشعار إعادة جدولة – Code School

عزيزي/عزيزتي ${guardianName}،

تمت إعادة جدولة الجلسة القادمة:

📘 الجلسة: ${shortName}
👨‍🎓 الطالب: ${studentName} (الرقم: ${enrollmentNumber})
📅 التاريخ الأصلي: ${formattedDate}
⏰ الوقت: ${session.startTime} - ${session.endTime}

هذه الجلسة لن تضيع من الباقة.

إدارة Code School 💻`;
    }
  }
}

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
  const shortName = extractSessionShortName(session.title) || session.title;

  const guardianMessage = {};
  const studentMessage = {};

  const is15min = reminderType === "15min" || reminderType === "1hour";

  if (language === "en") {
    if (!is15min) {
      // 24h
      guardianMessage.content = `📅 Session Reminder – Code School

Dear ${guardianName},

24-hour reminder for ${studentName} (ID: ${enrollmentNumber}):

📘 Session: ${shortName}
👥 Group: ${group.name || group.code}
📅 Date: ${formattedDate}
⏰ Time: ${session.startTime} – ${session.endTime}

Code School Team 💻`;

      studentMessage.content = `📅 Session Reminder – Code School

Hello ${studentName},

Your session is tomorrow:

📘 Session: ${shortName}
👥 Group: ${group.name || group.code}
📅 Date: ${formattedDate}
⏰ Time: ${session.startTime} – ${session.endTime}
${session.meetingLink ? `🔗 Meeting Link: ${session.meetingLink}` : ""}

Code School Team 💻`;
    } else {
      // 15min
      guardianMessage.content = `⏰ Session Starting in 15 Minutes – Code School

Dear ${guardianName},

${studentName}'s session starts in 15 minutes:

📘 Session: ${shortName}
⏰ Time: ${session.startTime} – ${session.endTime}
${session.meetingLink ? `🔗 Join Link: ${session.meetingLink}` : ""}

Code School Team 💻`;

      studentMessage.content = `⏰ Session Starting in 15 Minutes!

Hello ${studentName},

Your session starts in 15 minutes:

📘 Session: ${shortName}
⏰ Time: ${session.startTime} – ${session.endTime}
${session.meetingLink ? `🔗 Join Link: ${session.meetingLink}` : ""}

Get ready now! 🚀
Code School Team 💻`;
    }
  } else {
    if (!is15min) {
      // 24h
      guardianMessage.content = `📅 تذكير الجلسة – Code School

عزيزي/عزيزتي ${guardianName}،

تذكير قبل 24 ساعة لحصة ${studentName}:

📘 الجلسة: ${shortName}
👥 المجموعة: ${group.name || group.code}
📅 التاريخ: ${formattedDate}
⏰ الوقت: ${session.startTime} – ${session.endTime}

فريق Code School 💻`;

      studentMessage.content = `📅 تذكير الجلسة – Code School

مرحباً ${studentName}،

جلستك بكرة:

📘 الجلسة: ${shortName}
📅 التاريخ: ${formattedDate}
⏰ الوقت: ${session.startTime} – ${session.endTime}

فريق Code School 💻`;
    } else {
      // 15min
      guardianMessage.content = `⏰ الحصة هتبدأ بعد ربع ساعة – Code School

عزيزي/عزيزتي ${guardianName}،

حصة ${studentName} هتبدأ بعد 15 دقيقة:

📘 الجلسة: ${shortName}
⏰ الوقت: ${session.startTime} – ${session.endTime}
${session.meetingLink ? `🔗 رابط الدخول: ${session.meetingLink}` : ""}

فريق Code School 💻`;

      studentMessage.content = `⏰ الحصة هتبدأ بعد ربع ساعة!

مرحباً ${studentName}،

جلستك هتبدأ بعد 15 دقيقة:

📘 الجلسة: ${shortName}
⏰ الوقت: ${session.startTime} – ${session.endTime}
${session.meetingLink ? `🔗 رابط الدخول: ${session.meetingLink}` : ""}

استعد دلوقتي! 🚀
فريق Code School 💻`;
    }
  }

  guardianMessage.recipientType = "guardian";
  studentMessage.recipientType = "student";

  return { guardianMessage, studentMessage };
}

export function prepareReminderMessage(
  studentName,
  session,
  group,
  reminderType,
  language = "ar",
) {
  const messages = prepareReminderMessages(
    studentName,
    session,
    group,
    reminderType,
    language,
    "ولي الأمر",
    "",
  );

  return messages.studentMessage.content;
}

export function getDefaultGuardianMessage(language = "ar") {
  if (language === "ar") {
    return `{salutation}،

يسرنا إعلامكم بأنه تم تسجيل {childTitle} {studentName} بنجاح في Code School! 🎉

📘 البرنامج: {courseName}
👥 المجموعة: {groupName}
📅 تاريخ البدء: {startDate}
⏰ الموعد: {timeFrom} – {timeTo}
{instructor}

نتطلع لرؤية تقدم {studentName} معنا! 🚀

فريق Code School 💻`;
  } else {
    return `{salutation},

We are pleased to inform you that {childTitle} {studentName} has been successfully enrolled at Code School! 🎉

📘 Program: {courseName}
👥 Group: {groupName}
📅 Start Date: {startDate}
⏰ Schedule: {timeFrom} – {timeTo}
{instructor}

We look forward to seeing {studentName}'s progress! 🚀

Code School Team 💻`;
  }
}

export function getDefaultStudentMessage(language = "ar") {
  if (language === "ar") {
    return `{salutation}،

يسرنا إعلامك بأنه تم تسجيلك بنجاح في Code School! 🎉

📘 البرنامج: {courseName}
👥 المجموعة: {groupName}
📅 تاريخ البدء: {startDate}
⏰ الموعد: {timeFrom} – {timeTo}
{instructor}

فريق Code School 💻`;
  } else {
    return `{salutation},

We are pleased to confirm your enrollment at Code School! 🎉

📘 Program: {courseName}
👥 Group: {groupName}
📅 Start Date: {startDate}
⏰ Schedule: {timeFrom} – {timeTo}
{instructor}

Code School Team 💻`;
  }
}

export function getDefaultCompletionMessage(language = "ar") {
  if (language === "ar") {
    return `🎓 مبروك {studentName}!

تهانينا على إتمام دورة {courseName} بنجاح! 🎉

📚 المجموعة: {groupName} ({groupCode})

مع أطيب التمنيات،
فريق Code School`;
  } else {
    return `🎓 Congratulations {studentName}!

Congratulations on successfully completing {courseName}! 🎉

📚 Group: {groupName} ({groupCode})

Best regards,
Code School Team`;
  }
}

function buildInstructorsNames(instructors, language = "ar") {
  if (!instructors || instructors.length === 0) return "";

  const names = instructors
    .map((i) => i.userId?.name || i.name)
    .filter(Boolean);

  if (names.length === 0) return "";
  if (names.length === 1) return names[0];

  if (language === "ar") {
    if (names.length === 2) return `${names[0]} و ${names[1]}`;
    return names.slice(0, -1).join(" / ") + " / " + names[names.length - 1];
  } else {
    if (names.length === 2) return `${names[0]} & ${names[1]}`;
    return names.slice(0, -1).join(", ") + " & " + names[names.length - 1];
  }
}

async function getFirstSessionMeetingLink(groupId) {
  try {
    const firstSession = await Session.findOne({
      groupId: groupId,
      isDeleted: false,
      status: { $in: ["scheduled", "completed"] },
      meetingLink: { $exists: true, $ne: null, $ne: "" },
    })
      .sort({ scheduledDate: 1 })
      .select("meetingLink")
      .lean();
    return firstSession?.meetingLink || "";
  } catch (error) {
    console.error("❌ Error fetching first session meeting link:", error);
    return "";
  }
}
