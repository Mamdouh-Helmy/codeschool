// /src/app/services/groupAutomation.js
import mongoose from "mongoose";
import Group from "../models/Group";
import Student from "../models/Student";
import Session from "../models/Session";
import User from "../models/User";
import MessageTemplate from "../models/MessageTemplate";
import { wapilotService } from "./wapilot-service";

/**
 * ✅ التحقق من صلاحية الطالب لاستقبال الرسائل
 */
async function canSendMessage(student) {
  if (!student) return false;

  // ✅ التحقق من وجود حزمة ساعات
  if (!student.creditSystem?.currentPackage) {
    return false;
  }

  // ✅ التحقق من أن الرصيد أكبر من صفر
  const remainingHours =
    student.creditSystem.currentPackage.remainingHours || 0;
  if (remainingHours <= 0) {
    console.log(
      `🔕 Student ${student._id} has zero balance - notifications disabled`,
    );
    return false;
  }

  // ✅ التحقق من إعدادات الإشعارات
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
 * ✅ EVENT 1: Group Activated (for session generation)
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

    // ✅ UPDATED: التحقق من أن هناك 1-3 أيام مختارة
    if (
      !group.schedule.daysOfWeek ||
      group.schedule.daysOfWeek.length === 0 ||
      group.schedule.daysOfWeek.length > 3
    ) {
      throw new Error(
        `Group must have 1 to 3 days selected for schedule (currently has ${group.schedule.daysOfWeek?.length || 0} days)`,
      );
    }

    console.log(
      `✅ Schedule validated: ${group.schedule.daysOfWeek.length} day(s) selected - ${group.schedule.daysOfWeek.join(", ")}`,
    );

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

    // ✅ Generate Sessions
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

async function getMessageTemplate(
  templateType,
  language = "ar",
  recipientType = "guardian",
) {
  const validLanguage = ["ar", "en"].includes(language) ? language : "ar";

  try {
    // البحث عن القالب الافتراضي النشط
    const template = await MessageTemplate.findOne({
      templateType,
      recipientType,
      isActive: true,
      isDefault: true,
    }).lean();

    if (template) {
      // ✅ اختيار المحتوى حسب اللغة المطلوبة
      let content;
      
      if (validLanguage === "ar") {
        content = template.contentAr;
        console.log(`📋 Using Arabic content for ${templateType}`);
      } else {
        content = template.contentEn;
        console.log(`📋 Using English content for ${templateType}`);
      }
      
      // ✅ إذا كانت اللغة المطلوبة غير موجودة أو فارغة، نستخدم القالب الاحتياطي
      if (!content || content.trim() === '') {
        console.log(`⚠️ ${validLanguage} content empty, using fallback template`);
        
        // استخدام القالب الاحتياطي باللغة المطلوبة
        const fallbackContent = getFallbackTemplate(templateType, validLanguage, recipientType);
        
        return {
          content: fallbackContent,
          templateId: template._id,
          templateName: template.name,
          recipientType: template.recipientType,
          isCustom: false,
          isDefault: true,
          isFallback: true, // للإشارة أن هذا قالب احتياطي
        };
      }

      return {
        content: content || '',
        templateId: template._id,
        templateName: template.name,
        recipientType: template.recipientType,
        isCustom: false,
        isDefault: true,
      };
    }

    // لو مفيش قالب في DB، نستخدم القالب الاحتياطي
    console.log(`⚠️ No template found in DB for ${templateType}, using fallback`);
    return {
      content: getFallbackTemplate(templateType, validLanguage, recipientType),
      isCustom: false,
      isFallback: true,
      recipientType,
    };
  } catch (error) {
    console.error(`❌ Error fetching template [${templateType}]:`, error);
    return {
      content: getFallbackTemplate(templateType, validLanguage, recipientType),
      isCustom: false,
      isFallback: true,
      recipientType,
      error: error.message,
    };
  }
}

// ✅ دالة لجلب قوالب الغياب المناسبة
export async function getAttendanceTemplates(attendanceStatus, student) {
  try {
    const language =
      student.communicationPreferences?.preferredLanguage || "ar";

    // تحديد نوع القالب حسب حالة الغياب
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

    console.log(`🔍 Fetching template for student ${student._id}:`, {
      status: attendanceStatus,
      preferredLanguage: language,
      templateType: guardianTemplateType
    });

    // جلب القالب لولي الأمر
    const guardianTemplate = await getMessageTemplate(
      guardianTemplateType,
      language, // ✅ هذا هو المهم - نمرر اللغة المفضلة للطالب
      "guardian",
    );

    console.log(`✅ Attendance template fetched:`, {
      status: attendanceStatus,
      language,
      templateType: guardianTemplateType,
      hasContent: !!guardianTemplate?.content,
      contentPreview: guardianTemplate?.content?.substring(0, 100) + '...'
    });

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

// ✅ دالة لجلب قوالب الغياب للفرونت إند
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

    console.log(
      `📋 Fetching attendance template for student ${studentId}, status: ${attendanceStatus}`,
    );
    console.log(`   Student preferred language: ${student.communicationPreferences?.preferredLanguage || 'ar'}`);

    const templates = await getAttendanceTemplates(attendanceStatus, student);

    console.log(`✅ Templates ready:`, {
      hasGuardian: !!templates.guardian,
      guardianContentLanguage: student.communicationPreferences?.preferredLanguage || 'ar',
      guardianContentPreview: templates.guardian?.content?.substring(0, 100) + '...',
    });

    return templates;
  } catch (error) {
    console.error("❌ Error in getAttendanceTemplatesForFrontend:", error);
    throw error;
  }
}

/**
 * ✅ إرسال إشعارات الغياب (مع تصفية الطلاب ذوي الرصيد صفر)
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

    if (!session) {
      throw new Error("Session not found");
    }

    const group = session.groupId;

    // تجميع الطلاب الذين يحتاجون إشعارات
    const studentsNeedingNotifications = attendanceData.filter((record) =>
      ["absent", "late", "excused"].includes(record.status),
    );

    if (studentsNeedingNotifications.length === 0) {
      console.log("✅ No students need notifications");
      return { success: true, sentCount: 0, skippedCount: 0 };
    }

    console.log(
      `📊 Found ${studentsNeedingNotifications.length} students needing notifications`,
    );

    let sentCount = 0;
    let skippedCount = 0;
    const results = [];

    for (const record of studentsNeedingNotifications) {
      const student = await Student.findById(record.studentId);

      if (!student) {
        console.log(`❌ Student not found: ${record.studentId}`);
        skippedCount++;
        continue;
      }

      // ✅ التحقق من صلاحية الطالب لاستقبال الرسائل
      const canSend = await canSendMessage(student);

      if (!canSend) {
        console.log(
          `⏭️ Skipping student ${student._id} - not eligible (zero balance or notifications disabled)`,
        );
        skippedCount++;

        // تسجيل أنه تم تخطي هذا الطالب
        results.push({
          studentId: student._id,
          status: "skipped",
          reason: "zero_balance_or_disabled",
        });

        continue;
      }

      // الحصول على رقم ولي الأمر
      const guardianPhone =
        student.guardianInfo?.whatsappNumber || student.guardianInfo?.phone;

      if (!guardianPhone) {
        console.log(`⚠️ No guardian phone for student ${student._id}`);
        skippedCount++;
        continue;
      }

      // الحصول على القالب المناسب
      let messageContent = customMessages[student._id];

      if (!messageContent) {
        const templates = await getAttendanceTemplates(record.status, student);
        messageContent = templates.guardian?.content;
      }

      if (!messageContent) {
        console.log(`⚠️ No message content for student ${student._id}`);
        skippedCount++;
        continue;
      }

      // بناء المتغيرات
      const lang = student.communicationPreferences?.preferredLanguage || "ar";
      const gender = (student.personalInfo?.gender || "male")
        .toLowerCase()
        .trim();
      const relationship = (student.guardianInfo?.relationship || "father")
        .toLowerCase()
        .trim();

      const studentFirstName =
        lang === "ar"
          ? student.personalInfo?.nickname?.ar?.trim() ||
            student.personalInfo?.fullName?.split(" ")[0] ||
            "الطالب"
          : student.personalInfo?.nickname?.en?.trim() ||
            student.personalInfo?.fullName?.split(" ")[0] ||
            "Student";

      const guardianFirstName =
        lang === "ar"
          ? student.guardianInfo?.nickname?.ar?.trim() ||
            student.guardianInfo?.name?.split(" ")[0] ||
            "ولي الأمر"
          : student.guardianInfo?.nickname?.en?.trim() ||
            student.guardianInfo?.name?.split(" ")[0] ||
            "Guardian";

      let guardianSalutation = "";
      if (lang === "ar") {
        if (relationship === "mother") {
          guardianSalutation = `عزيزتي السيدة ${guardianFirstName}`;
        } else if (relationship === "father") {
          guardianSalutation = `عزيزي الأستاذ ${guardianFirstName}`;
        } else {
          guardianSalutation = `عزيزي/عزيزتي ${guardianFirstName}`;
        }
      } else {
        if (relationship === "mother") {
          guardianSalutation = `Dear Mrs. ${guardianFirstName}`;
        } else if (relationship === "father") {
          guardianSalutation = `Dear Mr. ${guardianFirstName}`;
        } else {
          guardianSalutation = `Dear ${guardianFirstName}`;
        }
      }

      const childTitle =
        lang === "ar"
          ? gender === "female"
            ? "ابنتك"
            : "ابنك"
          : gender === "female"
            ? "your daughter"
            : "your son";

      const statusText =
        record.status === "absent"
          ? lang === "ar"
            ? "غائب"
            : "absent"
          : record.status === "late"
            ? lang === "ar"
              ? "متأخر"
              : "late"
            : lang === "ar"
              ? "معتذر"
              : "excused";

      const sessionDate = session?.scheduledDate
        ? new Date(session.scheduledDate).toLocaleDateString(
            lang === "ar" ? "ar-EG" : "en-US",
            { weekday: "long", year: "numeric", month: "long", day: "numeric" },
          )
        : "";

      // استبدال المتغيرات
      let finalMessage = messageContent
        .replace(/{guardianSalutation}/g, guardianSalutation)
        .replace(/{guardianName}/g, guardianFirstName)
        .replace(/{studentName}/g, studentFirstName)
        .replace(/{childTitle}/g, childTitle)
        .replace(/{status}/g, statusText)
        .replace(/{sessionName}/g, session?.title || "")
        .replace(/{date}/g, sessionDate)
        .replace(
          /{time}/g,
          `${session?.startTime || ""} - ${session?.endTime || ""}`,
        )
        .replace(/{enrollmentNumber}/g, student.enrollmentNumber || "");

      // ✅ استخدام القيم الصحيحة من الـ enum
      let messageType = "";
      switch (record.status) {
        case "absent":
          messageType = "absence_notification";
          break;
        case "late":
          messageType = "late_notification";
          break;
        case "excused":
          messageType = "excused_notification";
          break;
        default:
          messageType = "absence_notification";
      }

      // ✅ استخدام sendAndLogMessage
      const sendResult = await wapilotService.sendAndLogMessage({
        studentId: student._id,
        phoneNumber: guardianPhone,
        messageContent: finalMessage,
        messageType: messageType, // ✅ استخدام القيمة الصحيحة
        language: lang,
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
        console.log(`❌ Failed to send message to student ${student._id}`);
        skippedCount++;
      }
    }

    console.log(
      `✅ Notifications sent: ${sentCount}, skipped: ${skippedCount}`,
    );

    return {
      success: true,
      sentCount,
      skippedCount,
      results,
    };
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
 * ✅ القوالب الاحتياطية - لو مفيش template في DB
 */
   function getFallbackTemplate(
  templateType,
  language = "ar",
  recipientType = "guardian",
) {
  const templates = {
    // ========== قوالب الطالب ==========
    reminder_24h_student: {
      ar: `{studentSalutation}،

هذا تذكير قبل 24 ساعة لجلستك القادمة:

📘 الجلسة: {sessionName}
📅 التاريخ: {date}
⏰ الوقت: {time}
🔗 رابط الاجتماع: {meetingLink}

استعد لجلسة رائعة! 🚀
فريق Code School 💻`,
      en: `{studentSalutation},

This is a 24-hour reminder for your upcoming session:

📘 Session: {sessionName}
📅 Date: {date}
⏰ Time: {time}
🔗 Meeting Link: {meetingLink}

Get ready for an amazing session! 🚀
Code School Team 💻`,
    },
    reminder_1h_student: {
      ar: `⏰ تذكير عاجل - بعد ساعة

{studentSalutation}،

جلستك ستبدأ بعد ساعة:

📘 الجلسة: {sessionName}
⏰ الوقت: {time}
🔗 رابط الاجتماع: {meetingLink}

يرجى الاستعداد الآن! 🚀
فريق Code School 💻`,
      en: `⏰ Urgent Reminder - In 1 Hour

{studentSalutation},

Your session starts in 1 hour:

📘 Session: {sessionName}
⏰ Time: {time}
🔗 Meeting Link: {meetingLink}

Please get ready now! 🚀
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

    // ========== قوالب ولي الأمر ==========
    reminder_24h_guardian: {
      ar: `{guardianSalutation}،

هذا تذكير قبل 24 ساعة لجلسة {childTitle} **{studentName}** القادمة:

📘 الجلسة: {sessionName}
📅 التاريخ: {date}
⏰ الوقت: {time}
🔗 رابط الاجتماع: {meetingLink}

نتطلع لرؤيتكم،
فريق Code School 💻`,
      en: `{guardianSalutation},

This is a 24-hour reminder for {childTitle} **{studentName}**'s upcoming session:

📘 Session: {sessionName}
📅 Date: {date}
⏰ Time: {time}
🔗 Meeting Link: {meetingLink}

We look forward to seeing you,
Code School Team 💻`,
    },
    reminder_1h_guardian: {
      ar: `⏰ تذكير عاجل - بعد ساعة

{guardianSalutation}،

جلسة {childTitle} **{studentName}** ستبدأ بعد ساعة:

📘 الجلسة: {sessionName}
⏰ الوقت: {time}
🔗 رابط الاجتماع: {meetingLink}

يرجى الاستعداد الآن! 🚀
فريق Code School 💻`,
      en: `⏰ Urgent Reminder - In 1 Hour

{guardianSalutation},

{childTitle} **{studentName}**'s session starts in 1 hour:

📘 Session: {sessionName}
⏰ Time: {time}
🔗 Meeting Link: {meetingLink}

Please get ready now! 🚀
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

    // ========== قوالب الغياب (بدون suffix) ==========
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
  };

  // ✅ الأنواع التي ليس لها _student أو _guardian suffix
  const noSuffixTypes = [
    "absence_notification",
    "late_notification",
    "excused_notification",
    "guardian_notification",
    "student_welcome",
  ];

  let templateKey;

  if (noSuffixTypes.includes(templateType)) {
    // استخدم المفتاح كما هو
    templateKey = templateType;
  } else {
    // أزل الـ suffix الموجود وأضف الصحيح
    const baseKey = templateType
      .replace(/_guardian$/, "")
      .replace(/_student$/, "");

    templateKey =
      recipientType === "student"
        ? `${baseKey}_student`
        : `${baseKey}_guardian`;
  }

  // ✅ التأكد من وجود القالب في اللغة المطلوبة، وإلا استخدام العربية كاحتياطي
  const template = templates[templateKey];
  if (!template) {
    console.log(`⚠️ No fallback template found for key: ${templateKey}`);
    return "";
  }

  // ✅ إرجاع المحتوى باللغة المطلوبة، أو العربية إذا لم توجد
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

  const studentFullName =
    student.personalInfo?.fullName ||
    (language === "ar" ? "الطالب" : "Student");
  const guardianFullName =
    student.guardianInfo?.name ||
    (language === "ar" ? "ولي الأمر" : "Guardian");

  // ✅ اسم الطالب المختصر حسب اللغة
  const studentFirstName =
    language === "ar"
      ? student.personalInfo?.nickname?.ar?.trim() ||
        studentFullName.split(" ")[0] ||
        "الطالب"
      : student.personalInfo?.nickname?.en?.trim() ||
        studentFullName.split(" ")[0] ||
        "Student";

  // ✅ اسم ولي الأمر المختصر حسب اللغة
  const guardianFirstName =
    language === "ar"
      ? student.guardianInfo?.nickname?.ar?.trim() ||
        guardianFullName.split(" ")[0] ||
        "ولي الأمر"
      : student.guardianInfo?.nickname?.en?.trim() ||
        guardianFullName.split(" ")[0] ||
        "Guardian";

  // ✅ تحية الطالب حسب الجنس واللغة
  let studentSalutation = "";
  if (language === "ar") {
    if (gender === "female") {
      studentSalutation = `عزيزتي ${studentFirstName}`;
    } else {
      // male أو أي قيمة أخرى
      studentSalutation = `عزيزي ${studentFirstName}`;
    }
  } else {
    // الإنجليزية: Dear بدون Mr/Ms للطالب (عادةً أطفال)
    studentSalutation = `Dear ${studentFirstName}`;
  }

  // ✅ تحية ولي الأمر حسب العلاقة واللغة
  let guardianSalutation = "";
  if (language === "ar") {
    if (relationship === "mother") {
      guardianSalutation = `عزيزتي السيدة ${guardianFirstName}`;
    } else if (relationship === "father") {
      guardianSalutation = `عزيزي الأستاذ ${guardianFirstName}`;
    } else {
      // guardian أو other
      guardianSalutation = `عزيزي/عزيزتي ${guardianFirstName}`;
    }
  } else {
    if (relationship === "mother") {
      guardianSalutation = `Dear Mrs. ${guardianFirstName}`;
    } else if (relationship === "father") {
      guardianSalutation = `Dear Mr. ${guardianFirstName}`;
    } else {
      guardianSalutation = `Dear ${guardianFirstName}`;
    }
  }

  // ✅ childTitle حسب الجنس واللغة
  const childTitle =
    language === "ar"
      ? gender === "female"
        ? "ابنتك"
        : "ابنك"
      : gender === "female"
        ? "your daughter"
        : "your son";

  // ✅ وصف جنس الطالب
  const studentGender =
    language === "ar"
      ? gender === "female"
        ? "الابنة"
        : "الابن"
      : gender === "female"
        ? "daughter"
        : "son";

  // ✅ تاريخ البداية
  const startDate = group?.schedule?.startDate
    ? new Date(group.schedule.startDate).toLocaleDateString(
        language === "ar" ? "ar-EG" : "en-US",
        { weekday: "long", year: "numeric", month: "long", day: "numeric" },
      )
    : "";

  // ✅ أسماء المدرسين
  const instructorNames = buildInstructorsNames(group?.instructors, language);

  // ✅ رابط أول جلسة
  const firstMeetingLink = await getFirstSessionMeetingLink(group?._id);

  const variables = {
    // تحيات
    studentSalutation,
    guardianSalutation,
    // للتوافق مع القوالب القديمة التي تستخدم {salutation}
    salutation: guardianSalutation,
    // أسماء
    studentName: studentFirstName,
    studentFullName,
    guardianName: guardianFirstName,
    guardianFullName,
    // أوصاف
    childTitle,
    studentGender,
    // المجموعة
    groupName: group?.name || "",
    groupCode: group?.code || "",
    courseName: group?.courseSnapshot?.title || group?.courseId?.title || "",
    // الجدول
    startDate,
    timeFrom: group?.schedule?.timeFrom || "",
    timeTo: group?.schedule?.timeTo || "",
    // المدرب/المدربين
    instructor: instructorNames,
    // رابط أول جلسة
    firstMeetingLink: firstMeetingLink || "",
    // الطالب
    enrollmentNumber: student.enrollmentNumber || "",
  };

  // ✅ بيانات الجلسة لو وجدت
  if (session) {
    const sessionDate = session.scheduledDate
      ? new Date(session.scheduledDate).toLocaleDateString(
          language === "ar" ? "ar-EG" : "en-US",
          { weekday: "long", year: "numeric", month: "long", day: "numeric" },
        )
      : language === "ar"
        ? "التاريخ"
        : "Date";

    Object.assign(variables, {
      sessionName: session.title || "",
      sessionNumber: session.sessionNumber || "",
      date: sessionDate,
      time: `${session.startTime || ""} - ${session.endTime || ""}`,
      meetingLink: session.meetingLink || firstMeetingLink || "",
    });
  }

  // ✅ متغيرات إضافية
  if (extra.newDate) {
    variables.newDate = new Date(extra.newDate).toLocaleDateString(
      language === "ar" ? "ar-EG" : "en-US",
      { weekday: "long", year: "numeric", month: "long", day: "numeric" },
    );
  }
  if (extra.newTime) variables.newTime = extra.newTime;
  if (extra.attendanceStatus) variables.status = extra.attendanceStatus;
  if (extra.attendanceNotes) variables.notes = extra.attendanceNotes;
  if (extra.feedbackLink) variables.feedbackLink = extra.feedbackLink;

  return { variables, language, gender, relationship };
}

/**
 * ✅ إرسال إشعارات الرصيد المنخفض (لطلاب متعددين)
 */
export async function sendLowBalanceAlerts(students) {
  try {
    console.log(`\n📤 Sending low balance alerts to ${students.length} students`);
    console.log(`📊 Students with low balance:`, students.map(s => ({
      id: s.studentId,
      remainingHours: s.remainingHours
    })));

    let successCount = 0;
    let failCount = 0;
    const results = [];

    for (const { student, remainingHours } of students) {
      try {
        // ✅ التحقق من صلاحية الطالب لاستقبال الرسائل (بدون شرط الرصيد)
        const canSend = await canSendMessageForLowBalance(student);

        if (!canSend) {
          console.log(`⏭️ Cannot send low balance alert to student ${student._id} - not eligible`);
          failCount++;
          results.push({
            studentId: student._id,
            status: "skipped",
            reason: "not_eligible",
          });
          continue;
        }

        const language = student.communicationPreferences?.preferredLanguage || "ar";
        const studentPhone = student.personalInfo?.whatsappNumber;
        const guardianPhone = student.guardianInfo?.whatsappNumber || student.guardianInfo?.phone;

        // ✅ الأسماء المختصرة حسب اللغة
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
          console.log(`⚠️ No WhatsApp numbers for student ${student._id}`);
          failCount++;
          results.push({
            studentId: student._id,
            status: "skipped",
            reason: "no_numbers",
          });
          continue;
        }

        // ✅ رسالة تحذير منخفضة الرصيد - تختلف حسب عدد الساعات المتبقية
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

        // ✅ إرسال للطالب
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

        // ✅ رسالة لولي الأمر
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

        // تسجيل إرسال الإشعار في إحصائيات الطالب
        await student.logLowBalanceAlert();
      } catch (error) {
        console.error(`❌ Error sending low balance alert to student ${student._id}:`, error);
        failCount++;
        results.push({
          studentId: student._id,
          status: "failed",
          error: error.message,
        });
      }
    }

    console.log(`✅ Low balance alerts sent: ${successCount}, failed: ${failCount}`);

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

  // ✅ التحقق من إعدادات الإشعارات
  const whatsappEnabled = student.communicationPreferences?.notificationChannels?.whatsapp;
  if (!whatsappEnabled) {
    return false;
  }

  // ✅ التحقق من وجود رقم واتساب صالح
  if (
    !student.personalInfo?.whatsappNumber &&
    !student.guardianInfo?.whatsappNumber &&
    !student.guardianInfo?.phone
  ) {
    return false;
  }

  return true;
}
/**
 * ✅ تعطيل إشعارات الطلاب ذوي الرصيد صفر
 */
export async function disableZeroBalanceNotifications(zeroBalanceStudents) {
  try {
    console.log(`\n🔕 Disabling notifications for ${zeroBalanceStudents.length} students with zero balance`);

    let successCount = 0;
    let failCount = 0;
    const results = [];

    for (const { student } of zeroBalanceStudents) {
      try {
        // تحديث حالة الطالب لمنع الإشعارات
        student.communicationPreferences.notificationChannels = {
          ...student.communicationPreferences.notificationChannels,
          whatsapp: false,
        };
        await student.save();

        // إرسال إشعار أخير بأن الرصيد صفر
        const language = student.communicationPreferences?.preferredLanguage || "ar";
        const studentPhone = student.personalInfo?.whatsappNumber;

        // ✅ الاسم المختصر حسب اللغة
        const studentFirstName =
          language === "ar"
            ? student.personalInfo?.nickname?.ar?.trim() ||
              student.personalInfo?.fullName?.split(" ")[0] ||
              "الطالب"
            : student.personalInfo?.nickname?.en?.trim() ||
              student.personalInfo?.fullName?.split(" ")[0] ||
              "Student";

        if (studentPhone) {
          // ✅ رسالة للطالب - تستخدم الاسم المختصر حسب اللغة
          const studentMessage =
            language === "ar"
              ? `❌ تم استنفاد رصيد الساعات الخاص بك. لن تتمكن من حضور الجلسات القادمة. يرجى التواصل مع الإدارة لتجديد الباقة.`
              : `❌ Your credit hours have been exhausted. You cannot attend future sessions. Please contact administration to renew your package.`;

          // ✅ استخدام sendAndLogMessage
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

        // ✅ رسالة لولي الأمر - تستخدم اسم الطالب المختصر
        const guardianPhone = student.guardianInfo?.whatsappNumber || student.guardianInfo?.phone;

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
        results.push({
          studentId: student._id,
          status: "disabled",
        });
      } catch (error) {
        console.error(`❌ Error disabling notifications for student ${student._id}:`, error);
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
/**
 * ✅ دالة رئيسية لجلب القوالب المناسبة لحدث معين
 */
export async function getTemplatesForEvent(eventType, student, extraData = {}) {
  try {
    const language =
      student.communicationPreferences?.preferredLanguage || "ar";
    const gender = student.personalInfo?.gender || "male";
    const relationship = student.guardianInfo?.relationship || "father";

    // تحديد أنواع القوالب المطلوبة حسب الحدث
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
      case "reminder_1h":
        studentTemplateType = "reminder_1h_student";
        guardianTemplateType = "reminder_1h_guardian";
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
        studentTemplateType = null; // لا نرسل للطالب
        guardianTemplateType = "absence_notification";
        break;
      case "late":
        studentTemplateType = null; // لا نرسل للطالب
        guardianTemplateType = "late_notification";
        break;
      case "excused":
        studentTemplateType = null; // لا نرسل للطالب
        guardianTemplateType = "excused_notification";
        break;
      default:
        throw new Error(`Unknown event type: ${eventType}`);
    }

    // جلب القوالب
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

/**
 * ✅ دالة لجلب القوالب لعرضها في الفرونت إند
 */
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
/**
 * ✅ EVENT: Send Instructor Welcome Messages
 */

export function replaceInstructorVariables(message, instructor, group) {
  console.log(
    "\n🔄 [REPLACE_INSTRUCTOR_VARS] Starting variable replacement...",
  );
  console.log("   Instructor:", instructor.name);
  console.log("   Gender:", instructor.gender || "NOT SET");
  console.log("   Group:", group.name);

  // ✅ Get instructor name
  const instructorName =
    instructor.name?.split(" ")[0] || instructor.name || "";

  // ✅ CRITICAL: استخدام gender من الباك إند (male/female)
  // القيمة الافتراضية: male إذا لم يُحدد
  const gender = instructor.gender || "male";

  console.log("   Instructor Name:", instructorName);
  console.log("   Gender (final):", gender);

  // ✅ التحية بناءً على النوع من الباك إند
  let salutation = "";

  if (gender === "male") {
    salutation = `عزيزي ${instructorName}`;
  } else if (gender === "female") {
    salutation = `عزيزتي ${instructorName}`;
  } else {
    // احتياطي في حالة وجود قيمة غير متوقعة
    salutation = `عزيزي/عزيزتي ${instructorName}`;
  }

  console.log("   ✅ Salutation:", salutation);

  // ✅ Group and course info
  const groupName = group.name || "{groupName}";
  const courseName =
    group.courseSnapshot?.title || group.courseId?.title || "{courseName}";

  // ✅ Date formatting
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

  // ✅ Student count
  const studentCount =
    group.currentStudentsCount || group.students?.length || 0;

  console.log("\n📝 [VARIABLES] Summary:");
  console.log("   {salutation} →", salutation);
  console.log("   {instructorName} →", instructorName);
  console.log("   {groupName} →", groupName);
  console.log("   {courseName} →", courseName);
  console.log("   {startDate} →", startDate);
  console.log("   {timeFrom} →", timeFrom);
  console.log("   {timeTo} →", timeTo);
  console.log("   {studentCount} →", studentCount);

  // ✅ Replace all variables
  const result = message
    .replace(/\{salutation\}/g, salutation)
    .replace(/\{instructorName\}/g, instructorName)
    .replace(/\{groupName\}/g, groupName)
    .replace(/\{courseName\}/g, courseName)
    .replace(/\{startDate\}/g, startDate)
    .replace(/\{timeFrom\}/g, timeFrom)
    .replace(/\{timeTo\}/g, timeTo)
    .replace(/\{studentCount\}/g, studentCount.toString());

  console.log("\n✅ [RESULT] Message after replacement (first 200 chars):");
  console.log(result.substring(0, 200) + "...");

  return result;
}

/**
 * ✅ EVENT: Send Instructor Welcome Messages - UPDATED VERSION
 * ✅ يعمل مع gender من User Schema الموجود
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

    // ✅ FIX: populate الصح للهيكل الجديد {userId, countTime}
    const group = await Group.findById(groupId)
      .populate("courseId", "title level")
      .populate("instructors.userId", "name email gender profile")
      .lean();

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

    // ✅ FIX: Log تفصيلي - نسحب البيانات من entry.userId
    group.instructors.forEach((entry, index) => {
      const inst = entry.userId;
      console.log(`\n👤 Instructor #${index + 1}:`);
      console.log(`   Name: ${inst?.name}`);
      console.log(`   Email: ${inst?.email}`);
      console.log(`   Gender: ${inst?.gender ?? "NOT SET IN DB"}`);
      console.log(`   Profile:`, JSON.stringify(inst?.profile));
      console.log(`   Phone (raw): "${inst?.profile?.phone}"`);
      console.log(`   Phone (trimmed): "${inst?.profile?.phone?.trim()}"`);
      console.log(`   countTime: ${entry.countTime}`);
    });

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

    // ✅ FIX: الـ loop يستخدم entry.userId
    for (const instructorEntry of group.instructors) {
      // ✅ استخراج بيانات المدرب من الهيكل الجديد
      const instructor = instructorEntry.userId;

      if (!instructor || !instructor._id) {
        console.log("⚠️ Skipping instructor entry - userId not populated");
        failCount++;
        notificationResults.push({
          status: "failed",
          reason: "Instructor userId not populated",
        });
        continue;
      }

      const instructorId = instructor._id.toString();

      // ✅ FIX: بعد lean() الـ profile plain object وبيشتغل صح
      const instructorPhone = instructor.profile?.phone?.trim() || null;

      console.log(`\n📱 Processing instructor: ${instructor.name}`);
      console.log(`   Email: ${instructor.email}`);
      console.log(
        `   Gender: ${instructor.gender ?? "NOT SET IN DB (will use default: male)"}`,
      );
      console.log(`   Phone (after trim): ${instructorPhone || "NOT SET"}`);

      if (!instructorPhone) {
        failCount++;
        notificationResults.push({
          instructorId,
          instructorName: instructor.name,
          instructorEmail: instructor.email,
          instructorGender: instructor.gender,
          status: "failed",
          reason: "No phone number registered",
          suggestion: "Please add phone number to instructor profile",
        });
        console.log(`⚠️ No phone number for ${instructor.name}`);
        continue;
      }

      let messageContent;

      if (instructorMessages && instructorMessages[instructorId]) {
        messageContent = instructorMessages[instructorId];
        console.log(`📝 Using custom message from admin (already processed)`);
      } else {
        console.log(`📝 Using default template`);

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
          instructor,  // ✅ instructor هنا هو الـ User object مباشرة
          group,
        );
        console.log(`✅ Variables replaced successfully`);
      }

      console.log(`📤 Message preview: ${messageContent.substring(0, 100)}...`);

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
          instructorEmail: instructor.email,
          instructorPhone,
          instructorGender: instructor.gender || "male (default)",
          status: "sent",
          customMessage: !!instructorMessages?.[instructorId],
          messagePreview: messageContent.substring(0, 100) + "...",
          sentAt: new Date(),
          wapilotResponse: sendResult,
        });

        console.log(`✅ Message sent successfully to ${instructor.name}`);

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
          instructorGender: instructor.gender,
          status: "failed",
          reason: error.message,
          error: error.toString(),
        });
        console.error(`❌ Failed to send to ${instructor.name}:`, error);
      }
    }

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
 */
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

    // إرسال لولي الأمر
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
        console.log(
          `✅ Guardian message sent to ${student.personalInfo?.fullName}`,
        );
      } catch (error) {
        results.guardianError = error.message;
        console.error(`❌ Failed to send guardian message:`, error);
      }
    }

    // إرسال للطالب
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
        console.log(
          `✅ Student message sent to ${student.personalInfo?.fullName}`,
        );
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

/**
 * ✅ Helper: Prepare group welcome message for student
 */
function prepareGroupWelcomeMessage(studentName, group, language = "ar") {
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
          {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          },
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
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      },
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
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      },
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
 * ✅ Get default guardian message template
 */
export function getDefaultGuardianMessage(language = "ar") {
  if (language === "ar") {
    return `{salutation}،

يسرنا إعلامكم بأنه تم تسجيل {childTitle} {studentName} بنجاح في Code School! 🎉

📘 البرنامج: {courseName}
👥 المجموعة: {groupName}
📅 تاريخ البدء: {startDate}
⏰ الموعد: {timeFrom} – {timeTo}
{instructor}

📌 ملاحظات هامة:
• يرجى التأكد من حضور {studentName} في الموعد المحدد
• تجهيز الجهاز (لابتوب/تابلت) مع شحن كامل
• الحضور المنتظم ضروري لتحقيق أفضل النتائج

نتطلع لرؤية تقدم {studentName} معنا! 🚀

في حالة وجود أي استفسار، نحن في الخدمة دائماً.

مع أطيب التحيات،
فريق Code School 💻`;
  } else {
    return `{salutation},

We are pleased to inform you that {childTitle} {studentName} has been successfully enrolled at Code School! 🎉

📘 Program: {courseName}
👥 Group: {groupName}
📅 Start Date: {startDate}
⏰ Schedule: {timeFrom} – {timeTo}
{instructor}

📌 Important Notes:
• Please ensure {studentName} attends on time
• Prepare the device (laptop/tablet) with full charge
• Regular attendance is essential for best results

We look forward to seeing {studentName}'s progress! 🚀

If you have any questions, we're always here to help.

Best regards,
Code School Team 💻`;
  }
}

/**
 * ✅ Get default student message template
 */
export function getDefaultStudentMessage(language = "ar") {
  if (language === "ar") {
    return `{salutation}،

يسرنا إعلامك بأنه تم تسجيلك بنجاح في Code School! 🎉

📘 البرنامج: {courseName}
👥 المجموعة: {groupName}
📅 تاريخ البدء: {startDate}
⏰ الموعد: {timeFrom} – {timeTo}
{instructor}

متحمسون لبدء رحلتك التعليمية معنا! 🚀

في حالة وجود أي استفسار، لا تتردد في التواصل معنا.

مع أطيب التحيات،
فريق Code School 💻`;
  } else {
    return `{salutation},

We are pleased to confirm that you have been successfully enrolled at Code School! 🎉

📘 Program: {courseName}
👥 Group: {groupName}
📅 Start Date: {startDate}
⏰ Schedule: {timeFrom} – {timeTo}
{instructor}

Excited to start your learning journey with us! 🚀

If you have any questions, feel free to contact us.

Best regards,
Code School Team 💻`;
  }
}

/**
 * ✅ EVENT 2: Student Added to Group
 */
function buildInstructorsNames(instructors, language = "ar") {
  if (!instructors || instructors.length === 0) return "";

  // ✅ FIX: دعم الهيكل الجديد {userId: {...}, countTime: N} والقديم مباشرة
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

export async function onStudentAddedToGroup(
  studentId,
  groupId,
  customMessages = { student: null, guardian: null },
  sendWhatsApp = true,
) {
  try {
    console.log(`\n🎯 EVENT: Student Added to Group ==========`);

    const [student, group] = await Promise.all([
      Student.findById(studentId),
      Group.findById(groupId)
        .populate("courseId")
        // ✅ FIX: populate الصح للهيكل الجديد
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

    console.log(
      `✅ Student ${student.personalInfo.fullName} added to group ${group.code}`,
    );

    let studentMessageSent = false;
    let guardianMessageSent = false;

    if (
      sendWhatsApp &&
      group.automation?.whatsappEnabled &&
      group.automation?.welcomeMessage
    ) {
      console.log("📱 Sending WhatsApp welcome messages...");

      const { variables, language } = await prepareStudentVariables(
        student,
        group,
      );

      console.log(
        `   Language: ${language} | Gender: ${student.personalInfo?.gender} | Relationship: ${student.guardianInfo?.relationship}`,
      );
      console.log(`   Student Salutation: ${variables.studentSalutation}`);
      console.log(`   Guardian Salutation: ${variables.guardianSalutation}`);
      console.log(`   Instructor: ${variables.instructor}`);
      console.log(`   Start Date: ${variables.startDate}`);
      console.log(`   First Meeting Link: ${variables.firstMeetingLink}`);

      // رسالة الطالب
      if (student.personalInfo?.whatsappNumber) {
        const template = await getMessageTemplate(
          "student_welcome",
          language,
          "student",
        );

        const studentVars = {
          ...variables,
          salutation: variables.studentSalutation,
        };
        const finalStudentMessage = customMessages.student
          ? replaceVariables(customMessages.student, studentVars)
          : replaceVariables(template.content, studentVars);

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
          console.log(`✅ Student message sent`);
        } catch (err) {
          console.error(`❌ Student message failed:`, err.message);
        }
      }

      // رسالة ولي الأمر
      if (student.guardianInfo?.whatsappNumber) {
        const template = await getMessageTemplate(
          "guardian_notification",
          language,
          "guardian",
        );

        const guardianVars = {
          ...variables,
          salutation: variables.guardianSalutation,
        };
        const finalGuardianMessage = customMessages.guardian
          ? replaceVariables(customMessages.guardian, guardianVars)
          : replaceVariables(template.content, guardianVars);

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
          console.log(`✅ Guardian message sent`);
        } catch (err) {
          console.error(`❌ Guardian message failed:`, err.message);
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
      },
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("❌ Error in onStudentAddedToGroup:", error);
    throw error;
  }
}


/**
 * ✅ Replace student variables in message
 */
export function replaceStudentVariables(
  message,
  student,
  group,
  language = "ar",
  recipientType = "student",
) {
  console.log("\n🔄 [REPLACE_VARS] Starting variable replacement...");
  console.log("   Recipient Type:", recipientType);
  console.log("   Language:", language);
  console.log("   Student:", student.personalInfo?.fullName);
  console.log("   Group:", group.name);

  // ✅ Get student nickname
  const studentNickname =
    language === "ar"
      ? student.personalInfo?.nickname?.ar ||
        student.personalInfo?.fullName?.split(" ")[0]
      : student.personalInfo?.nickname?.en ||
        student.personalInfo?.fullName?.split(" ")[0];

  // ✅ Get guardian nickname
  const guardianNickname =
    language === "ar"
      ? student.guardianInfo?.nickname?.ar ||
        student.guardianInfo?.name?.split(" ")[0]
      : student.guardianInfo?.nickname?.en ||
        student.guardianInfo?.name?.split(" ")[0];

  const gender = student.personalInfo?.gender || "Male";
  const relationship = student.guardianInfo?.relationship || "father";

  console.log("   Student Nickname:", studentNickname);
  console.log("   Guardian Nickname:", guardianNickname);
  console.log("   Gender:", gender);
  console.log("   Relationship:", relationship);

  // ✅ IMPROVED: Better salutation logic
  let salutation = "";

  if (recipientType === "student") {
    // For students: use gender-appropriate greeting
    if (language === "ar") {
      salutation =
        gender === "Male"
          ? `عزيزي ${studentNickname}`
          : `عزيزتي ${studentNickname}`;
    } else {
      salutation = `Dear ${studentNickname}`;
    }
  } else {
    // ✅ For guardian: use relationship-appropriate greeting
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

  console.log("   Salutation:", salutation);

  // ✅ Child title (ابنك/ابنتك based on gender)
  const childTitle =
    language === "ar"
      ? gender === "Male"
        ? "ابنك"
        : "ابنتك"
      : gender === "Male"
        ? "your son"
        : "your daughter";

  // ✅ Group and course info
  const groupName = group.name || "{groupName}";
  const groupCode = group.code || "{groupCode}";
  const courseName =
    group.courseSnapshot?.title || group.courseId?.title || "{courseName}";

  // ✅ Date formatting
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

  // ✅ CRITICAL FIX: اسم المدرب مع معالجة شاملة
  let instructorName = "";

  try {
    console.log("\n🔍 [INSTRUCTOR] Extracting instructor name...");
    console.log("   Group.instructors exists?", !!group.instructors);
    console.log("   Group.instructors type:", typeof group.instructors);
    console.log(
      "   Group.instructors is array?",
      Array.isArray(group.instructors),
    );
    console.log("   Group.instructors length:", group.instructors?.length || 0);

    if (group.instructors && group.instructors.length > 0) {
      console.log(
        "   First instructor object:",
        JSON.stringify(group.instructors[0], null, 2),
      );
    }

    // محاولة 1: من المصفوفة مباشرة
    if (
      group.instructors &&
      Array.isArray(group.instructors) &&
      group.instructors.length > 0
    ) {
      const instructor = group.instructors[0];

      // جرّب خصائص مختلفة
      instructorName =
        instructor.name ||
        instructor.profile?.name ||
        instructor.fullName ||
        instructor.personalInfo?.fullName ||
        (typeof instructor === "string" ? instructor : "");

      console.log("   ✅ Method 1 (instructors array):", instructorName);
    }

    // محاولة 2: من courseSnapshot
    if (!instructorName && group.courseSnapshot?.instructor) {
      instructorName = group.courseSnapshot.instructor;
      console.log("   ✅ Method 2 (courseSnapshot):", instructorName);
    }

    // محاولة 3: من metadata
    if (!instructorName && group.metadata?.primaryInstructor) {
      instructorName = group.metadata.primaryInstructor;
      console.log("   ✅ Method 3 (metadata):", instructorName);
    }

    // محاولة 4: من createdBy
    if (!instructorName && group.createdBy?.name) {
      instructorName = group.createdBy.name;
      console.log("   ✅ Method 4 (createdBy):", instructorName);
    }

    // تنظيف الاسم
    if (instructorName) {
      instructorName = instructorName.trim();
      console.log("   ✅ Final instructor name (cleaned):", instructorName);
    } else {
      console.warn("   ⚠️ No instructor name found!");
    }
  } catch (error) {
    console.error("   ❌ Error extracting instructor name:", error);
  }

  // افتراضي إذا لم يوجد
  if (!instructorName) {
    instructorName = "";
    console.log("   ℹ️ Using empty string for instructor");
  }

  console.log("\n📝 [VARIABLES] Summary:");
  console.log("   {salutation} →", salutation);
  console.log("   {studentName} →", studentNickname);
  console.log("   {guardianName} →", guardianNickname);
  console.log("   {childTitle} →", childTitle);
  console.log("   {groupName} →", groupName);
  console.log("   {courseName} →", courseName);
  console.log("   {startDate} →", startDate);
  console.log("   {timeFrom} →", timeFrom);
  console.log("   {timeTo} →", timeTo);
  console.log("   {instructor} →", instructorName || "(empty)");

  // ✅ Replace all variables
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

  console.log("\n✅ [RESULT] Message after replacement (first 200 chars):");
  console.log(result.substring(0, 200) + "...");

  return result;
}
/**
 * ✅ EVENT 4: Attendance Submitted
 */
export async function onAttendanceSubmitted(sessionId, customMessages = {}) {
  try {
    console.log(`\n🎯 EVENT: Attendance Submitted ==========`);
    console.log(`📋 Session ID: ${sessionId}`);

    const session = await Session.findById(sessionId)
      .populate("groupId")
      .lean();

    if (!session) {
      throw new Error("Session not found");
    }

    // إرسال إشعارات الغياب
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

/**
 * ✅ إرسال إشعارات الرصيد المنخفض (مع تصفية تلقائية)
 */
export async function sendLowBalanceAlert(student) {
  try {
    // ✅ التحقق من صلاحية الطالب لاستقبال الرسائل (بدون شرط الرصيد)
    const canSend = await canSendMessageForLowBalance(student);

    if (!canSend) {
      console.log(
        `⏭️ Cannot send low balance alert to student ${student._id} - not eligible`,
      );
      return { success: false, reason: "not_eligible" };
    }

    const language = student.communicationPreferences?.preferredLanguage || "ar";
    const studentPhone = student.personalInfo?.whatsappNumber;
    const guardianPhone = student.guardianInfo?.whatsappNumber || student.guardianInfo?.phone;
    const remainingHours = student.creditSystem?.currentPackage?.remainingHours || 0;

    // ✅ الأسماء المختصرة حسب اللغة
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
      console.log(`⚠️ No WhatsApp numbers for student ${student._id}`);
      return { success: false, reason: "no_numbers" };
    }

    // ✅ رسالة تحذير منخفضة الرصيد - تختلف حسب عدد الساعات المتبقية
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

    // إرسال للطالب
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

    // إرسال لولي الأمر
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
/**
 * ✅ EVENT 5: Session Status Changed
 */
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
    console.log(
      `📝 Student Msg: ${metadata?.studentMessage ? "Yes" : "No"} | Guardian Msg: ${metadata?.guardianMessage ? "Yes" : "No"}`,
    );

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

    console.log(`👨‍🎓 Total students: ${students.length}`);

    let successCount = 0;
    let failCount = 0;
    const notificationResults = [];

    const studentTemplateType =
      newStatus === "cancelled"
        ? "session_cancelled_student"
        : "session_postponed_student";
    const guardianTemplateType =
      newStatus === "cancelled"
        ? "session_cancelled_guardian"
        : "session_postponed_guardian";

    for (const student of students) {
      try {
        // ✅ FIX: await
        const { variables, language } = await prepareStudentVariables(
          student,
          group,
          session,
          { newDate, newTime },
        );

        console.log(
          `📤 ${student.personalInfo?.fullName} | ${language} | ${student.personalInfo?.gender} | ${student.guardianInfo?.relationship}`,
        );
        console.log(
          `   Student: ${variables.studentSalutation} | Guardian: ${variables.guardianSalutation}`,
        );

        let finalStudentMessage = "";
        if (metadata?.studentMessage) {
          finalStudentMessage = replaceVariables(
            metadata.studentMessage,
            variables,
          );
        } else {
          const template = await getMessageTemplate(
            studentTemplateType,
            language,
            "student",
          );
          finalStudentMessage = replaceVariables(template.content, variables);
        }

        let finalGuardianMessage = "";
        if (metadata?.guardianMessage) {
          finalGuardianMessage = replaceVariables(
            metadata.guardianMessage,
            variables,
          );
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
            oldStatus: session.status,
            newStatus,
            newDate,
            newTime,
            isCustomMessage: !!(
              metadata?.studentMessage || metadata?.guardianMessage
            ),
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
            guardianSalutation: variables.guardianSalutation,
            studentSalutation: variables.studentSalutation,
          });
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Error processing student:`, error);
        failCount++;
      }
    }

    console.log(`\n✅ Notifications sent: ${successCount}/${students.length}`);

    return {
      success: successCount > 0,
      totalStudents: students.length,
      successCount,
      failCount,
      notificationResults,
      customMessageUsed: !!(
        metadata?.studentMessage || metadata?.guardianMessage
      ),
    };
  } catch (error) {
    console.error(`❌ Error in onSessionStatusChanged:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * ✅ Prepare reminder messages for both guardian and student
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

  const guardianMessage = {};
  const studentMessage = {};

  if (language === "en") {
    if (reminderType === "1hour") {
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
    if (reminderType === "1hour") {
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
 * ✅ Prepare reminder message (for backward compatibility)
 */
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

/**
 * ✅ Send manual session reminder to both guardian and student
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
    console.log(
      `📝 Student Msg: ${metadata?.studentMessage ? "Yes" : "No"} | Guardian Msg: ${metadata?.guardianMessage ? "Yes" : "No"}`,
    );

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

    const guardianTemplateType =
      reminderType === "24hours"
        ? "reminder_24h_guardian"
        : "reminder_1h_guardian";
    const studentTemplateType =
      reminderType === "24hours"
        ? "reminder_24h_student"
        : "reminder_1h_student";

    for (const student of students) {
      try {
        const { variables, language } = await prepareStudentVariables(
          student,
          group,
          session,
        );

        console.log(`📤 ${student.personalInfo?.fullName} | ${language}`);
        console.log(
          `   Student: ${variables.studentSalutation} | Guardian: ${variables.guardianSalutation}`,
        );

        // ✅ FIX: جلب القوالب المناسبة لكل طالب حسب لغته
        let finalStudentMessage = "";
        let finalGuardianMessage = "";

        if (metadata?.studentMessage) {
          // إذا كان القالب من المودال، نستخدم rawContent (القالب الخام) ثم نستبدل المتغيرات
          const studentRawTemplate = metadata.studentMessage;

          if (language === "ar") {
            // ✅ للطلاب العرب: القالب من المودال عادة عربي، نستخدمه مباشرة
            finalStudentMessage = replaceVariables(
              studentRawTemplate,
              variables,
            );
          } else {
            // ✅ للطلاب الإنجليز: نجلب القالب الإنجليزي الافتراضي
            const template = await getMessageTemplate(
              studentTemplateType,
              "en",
              "student",
            );
            finalStudentMessage = replaceVariables(template.content, variables);
          }
        } else {
          // إذا مفيش قالب من المودال، نجيب الافتراضي
          const template = await getMessageTemplate(
            studentTemplateType,
            language,
            "student",
          );
          finalStudentMessage = replaceVariables(template.content, variables);
        }

        if (metadata?.guardianMessage) {
          const guardianRawTemplate = metadata.guardianMessage;

          if (language === "ar") {
            // ✅ للطلاب العرب: قالب ولي الأمر من المودال عربي
            finalGuardianMessage = replaceVariables(
              guardianRawTemplate,
              variables,
            );
          } else {
            // ✅ للطلاب الإنجليز: نجيب القالب الإنجليزي
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
            isCustomMessage: !!(
              metadata?.studentMessage || metadata?.guardianMessage
            ),
          },
        });

        if (result.success) {
          successCount++;
          notificationResults.push({
            ...result,
            language,
            guardianSalutation: variables.guardianSalutation,
            studentSalutation: variables.studentSalutation,
          });
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Error:`, error);
        failCount++;
      }
    }

    return {
      success: successCount > 0,
      totalStudents: students.length,
      successCount,
      failCount,
      reminderType,
      notificationResults,
      customMessageUsed: !!(
        metadata?.studentMessage || metadata?.guardianMessage
      ),
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
    console.log(`👥 Group: ${groupId}`);
    console.log(
      `📝 Per-student messages: ${Object.keys(customMessages).length}`,
    );

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

    console.log(`👨‍🎓 Total students: ${students.length}`);
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
          {
            feedbackLink: feedbackLink || "",
          },
        );

        const studentIdStr = student._id.toString();
        const perStudentMsgs = customMessages[studentIdStr];

        // ✅ رسالة الطالب
        let finalStudentMessage = "";
        if (perStudentMsgs?.student?.trim()) {
          finalStudentMessage = perStudentMsgs.student;
          console.log(
            `📝 Using pre-rendered student message for ${student.personalInfo?.fullName}`,
          );
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

        // ✅ رسالة ولي الأمر
        let finalGuardianMessage = "";
        if (perStudentMsgs?.guardian?.trim()) {
          finalGuardianMessage = perStudentMsgs.guardian;
          console.log(
            `📝 Using pre-rendered guardian message for ${student.personalInfo?.fullName}`,
          );
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

        // ✅ إضافة رابط التقييم لو موجود ومش موجود في الرسالة أصلاً
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
            isCustomMessage: !!(perStudentMsgs || customMessage),
            hasFeedbackLink: !!feedbackLink,
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
            guardianSalutation: variables.guardianSalutation,
            usedCustomMessage: !!perStudentMsgs,
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
      customMessageUsed: !!(
        customMessage || Object.keys(customMessages).length > 0
      ),
      feedbackLinkProvided: !!feedbackLink,
    };
  } catch (error) {
    console.error(`❌ Error in onGroupCompleted:`, error);
    return { success: false, error: error.message };
  }
}
/**
 * ✅ Process custom message with variables
 */
export function processCustomMessage(message, student, session, group, status) {
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

/**
 * ✅ Prepare default completion message
 */
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
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

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

/**
 * ✅ Get default completion message
 */
export function getDefaultCompletionMessage(language = "ar") {
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
