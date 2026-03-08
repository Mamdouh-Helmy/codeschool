// /src/app/services/wapilot-service.js
import Student from "../models/Student.js";
import { connectDB } from "@/lib/mongodb";

const FORCE_PRODUCTION = true;

const isMaleGender = (gender) => {
  if (!gender) return true;
  return String(gender).toLowerCase().trim() === "male";
};

class WapilotService {
  constructor() {
    this.baseURL = process.env.WHATSAPP_API_URL || "https://api.wapilot.net/api/v2";
    this.apiToken = process.env.WHATSAPP_API_TOKEN;
    this.instanceId = process.env.WHATSAPP_INSTANCE_ID;
    this.isEnabled = !!this.apiToken && !!this.instanceId;
    this.mode =
      FORCE_PRODUCTION || (this.isEnabled && process.env.NODE_ENV === "production")
        ? "production"
        : "simulation";

    console.log("📱 Wapilot WhatsApp Service initialized:", {
      enabled: this.isEnabled,
      instance: this.instanceId ? "Configured" : "Not configured",
      mode: this.mode,
    });
  }

  // ============================================================
  // ✅ دوال بناء التحية - مشتركة
  // ============================================================

  getStudentSalutation(gender, language = "ar", arabicName = "", englishName = "") {
    const male = isMaleGender(gender);
    if (language === "ar") {
      const displayName = arabicName ? ` ${arabicName}` : "";
      return male ? `عزيزي الطالب${displayName}` : `عزيزتي الطالبة${displayName}`;
    } else {
      const displayName = englishName ? ` ${englishName}` : "";
      return `Dear student${displayName}`;
    }
  }

  getGuardianSalutation(guardianName, relationship, guardianNickname = null, language = "ar") {
    if (language === "ar") {
      const displayName = guardianNickname?.ar || guardianName?.split(" ")[0] || guardianName || "";
      switch (relationship) {
        case "father": return `عزيزي الأستاذ ${displayName}`;
        case "mother": return `عزيزتي السيدة ${displayName}`;
        case "guardian": return `عزيزي السيد ${displayName}`;
        default: return `عزيزي/عزيزتي ${displayName}`;
      }
    } else {
      const displayName = guardianNickname?.en || guardianName?.split(" ")[0] || guardianName || "";
      switch (relationship) {
        case "father": return `Dear Mr. ${displayName}`;
        case "mother": return `Dear Mrs. ${displayName}`;
        case "guardian": return `Dear Mr./Mrs. ${displayName}`;
        default: return `Dear ${displayName}`;
      }
    }
  }

  getStudentChildTitle(gender, language = "ar") {
    const male = isMaleGender(gender);
    if (language === "ar") return male ? "الابن" : "الابنة";
    return male ? "son" : "daughter";
  }

  // ============================================================
  // ✅ رسالة اختيار اللغة للطالب (bilingual - رسالة ترحيب)
  // ============================================================

  prepareBilingualLanguageSelectionMessage(studentName, gender, nickname = null) {
    const male = isMaleGender(gender);
    const arabicName = nickname?.ar || studentName.split(" ")[0] || studentName;
    const englishName = nickname?.en || studentName.split(" ")[0] || studentName;
    const salutationAr = this.getStudentSalutation(gender, "ar", arabicName, englishName);
    const salutationEn = this.getStudentSalutation(gender, "en", arabicName, englishName);
    const welcomeAr = male ? "أهلاً بك" : "أهلاً بكِ";

    return `${salutationAr}
${salutationEn}

${welcomeAr} في Code School! 🌟
Welcome to Code School! 🌟

🌍 اختر لغتك المفضلة
حتى نتمكن من التواصل معك بسهولة وراحة، من فضلك أخبرنا باللغة التي تفضل استقبال رسائلنا بها:

🌍 Choose your preferred language
To ensure smooth and comfortable communication, please tell us which language you prefer to receive our messages in:

➡️ اللغة العربية
➡️ English

مع خالص التحية،
فريق Code School 💻

Best regards,
The Code School Team 💻

🌍 شكراً لثقتكم في Code School
🌍 Thank you for trusting Code School`;
  }

  // ============================================================
  // ✅ رسالة إشعار ولي الأمر (bilingual - رسالة ترحيب)
  // ============================================================

  prepareBilingualGuardianNotificationMessage(
    guardianName, studentName, studentGender, relationship,
    guardianNickname = null, studentNickname = null,
  ) {
    const guardianSalAr = this.getGuardianSalutation(guardianName, relationship, guardianNickname, "ar");
    const guardianSalEn = this.getGuardianSalutation(guardianName, relationship, guardianNickname, "en");
    const studentNameAr = studentNickname?.ar || studentName.split(" ")[0] || studentName;
    const studentNameEn = studentNickname?.en || studentName.split(" ")[0] || studentName;
    const titleAr = this.getStudentChildTitle(studentGender, "ar");
    const titleEn = this.getStudentChildTitle(studentGender, "en");
    const enrolledVerb = isMaleGender(studentGender) ? "انضم" : "انضمت";

    return `${guardianSalAr}
${guardianSalEn}

تحية طيبة وبعد،
Greetings,

يسعدنا إبلاغكم بأن ${titleAr} **${studentNameAr}** قد ${enrolledVerb} رسمياً إلى عائلتنا التعليمية اليوم. 🎉
We are pleased to inform you that your ${titleEn} **${studentNameEn}** has officially joined our educational family today. 🎉

سأكون متاحاً شخصياً للرد على أي استفسارات لديكم في أي وقت.
I will personally be available to answer any questions you may have at any time.

مع خالص الاحترام والتقدير،
فريق Code School 💻

Best regards,
The Code School Team 💻

🌍 شكراً لثقتكم في Code School
🌍 Thank you for trusting Code School`;
  }

  // ============================================================
  // ✅ رسالة تأكيد اللغة للطالب - باللغة المختارة فقط
  // ============================================================

  prepareLanguageConfirmationMessage(studentName, gender, selectedLanguage, nickname = null) {
    const arabicName = nickname?.ar || studentName.split(" ")[0] || studentName;
    const englishName = nickname?.en || studentName.split(" ")[0] || studentName;

    if (selectedLanguage === "en") {
      const salutation = this.getStudentSalutation(gender, "en", arabicName, englishName);
      return `✅ Language Preference Confirmed

${salutation},

Thank you for choosing your preferred language. Your communication language has been successfully set to *English*.

📌 What happens next?
- All future messages and notifications will be sent to you in English
- Your course materials and support will be provided in English

We're excited to have you on board and can't wait to see you grow with us! 🚀

Best regards,
The Code School Team 💻

🌍 Thank you for choosing Code School`;
    }

    // ✅ عربي
    const salutation = this.getStudentSalutation(gender, "ar", arabicName, englishName);
    return `✅ تم تأكيد اللغة المفضلة

${salutation}،

شكراً لاختيارك لغتك المفضلة. تم تعيين *اللغة العربية* كلغة التواصل الرسمية معك.

📌 ماذا يحدث الآن؟
- جميع الرسائل والإشعارات القادمة ستكون باللغة العربية
- المحتوى التعليمي والدعم الفني سيكون متاحاً بالعربية

نحن متحمسون لوجودك معنا، ونتطلع لرؤية تطورك وإبداعك! 🚀

مع أطيب التحيات،
فريق Code School 💻

🌍 شكراً لاختيارك Code School`;
  }

  // ============================================================
  // ✅ رسالة تأكيد اللغة لولي الأمر - باللغة المختارة فقط
  // ============================================================

  prepareGuardianLanguageConfirmationMessage(
    guardianName, studentName, studentGender, relationship, selectedLanguage,
    guardianNickname = null, studentNickname = null,
  ) {
    const studentNameAr = studentNickname?.ar || studentName.split(" ")[0] || studentName;
    const studentNameEn = studentNickname?.en || studentName.split(" ")[0] || studentName;
    const titleAr = this.getStudentChildTitle(studentGender, "ar");
    const titleEn = this.getStudentChildTitle(studentGender, "en");

    if (selectedLanguage === "en") {
      const salutation = this.getGuardianSalutation(guardianName, relationship, guardianNickname, "en");
      return `${salutation},

We are pleased to inform you that your ${titleEn} **${studentNameEn}** has successfully selected *English* as their preferred communication language.

📌 What this means?
- All future messages will be sent in English
- Course materials and support will be provided in English

Thank you for your continued trust in Code School.

Best regards,
The Code School Team 💻`;
    }

    // ✅ عربي
    const salutation = this.getGuardianSalutation(guardianName, relationship, guardianNickname, "ar");
    const enrolledVerb = isMaleGender(studentGender) ? "قام" : "قامت";
    return `${salutation}،

يسعدنا إبلاغكم بأن ${titleAr} **${studentNameAr}** ${enrolledVerb} باختيار *اللغة العربية* كلغة مفضلة للتواصل بنجاح.

📌 ماذا يعني هذا؟
- جميع الرسائل القادمة لـ${titleAr} ستكون باللغة العربية
- المحتوى التعليمي والدعم سيكون متاحاً بالعربية

شكراً لثقتكم المستمرة في Code School.

مع أطيب التحيات،
فريق Code School 💻`;
  }

  // ============================================================
  // ✅ إرسال وتسجيل رسالة
  // ============================================================

  async sendAndLogMessage({ studentId, phoneNumber, messageContent, messageType, language = "ar", metadata = {} }) {
    try {
      const preparedNumber = this.preparePhoneNumber(phoneNumber);
      if (!preparedNumber) throw new Error("Invalid phone number format");

      let sendResult;
      if (this.mode === "production") {
        sendResult = await this.sendTextMessage(preparedNumber, messageContent);
      } else {
        sendResult = await this.simulateSendMessage(preparedNumber, messageContent);
      }

      if (studentId) {
        await this.logToStudentSchema(studentId, {
          messageType,
          messageContent,
          language,
          status: sendResult.success ? "sent" : "failed",
          recipientNumber: preparedNumber,
          wapilotMessageId: sendResult.messageId || null,
          sentAt: new Date(),
          metadata: {
            ...metadata,
            recipientType: metadata.recipientType || "student",
          },
          error: sendResult.success ? null : sendResult.error || "Unknown error",
        });
      }

      return sendResult;
    } catch (error) {
      console.error(`❌ Error in sendAndLogMessage:`, error.message);
      throw error;
    }
  }

  async logToStudentSchema(studentId, messageData) {
    try {
      await connectDB();
      const student = await Student.findById(studentId);
      if (!student) {
        console.error(`⚠️ Student ${studentId} not found for logging`);
        return false;
      }
      await student.logWhatsAppMessage(messageData);
      return true;
    } catch (error) {
      console.error(`❌ [LOG] Error logging to student schema:`, error.message);
      return false;
    }
  }

  // ============================================================
  // ✅ تجهيز رقم الهاتف
  // ============================================================

  preparePhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;
    try {
      let cleanNumber = phoneNumber.toString().replace(/\s+/g, "").replace(/^0+/, "");

      if (!cleanNumber.startsWith("+")) {
        if (cleanNumber.startsWith("1") && cleanNumber.length >= 10) {
          cleanNumber = "+20" + cleanNumber;
        } else if (cleanNumber.startsWith("01")) {
          cleanNumber = "+20" + cleanNumber.substring(1);
        } else if (cleanNumber.length >= 10) {
          cleanNumber = "+20" + cleanNumber;
        } else {
          cleanNumber = "+20" + cleanNumber.replace(/^0+/, "");
        }
      }

      const whatsappRegex = /^\+[1-9]\d{1,14}$/;
      if (!whatsappRegex.test(cleanNumber)) {
        console.error("❌ Invalid WhatsApp number format:", cleanNumber);
        return null;
      }

      return cleanNumber;
    } catch (error) {
      console.error("❌ Error preparing phone number:", error);
      return null;
    }
  }

  // ============================================================
  // ✅ إرسال رسالة نصية
  // ============================================================

  async sendTextMessage(phoneNumber, messageText) {
    try {
      if (!this.apiToken || !this.instanceId) {
        throw new Error("WhatsApp API Token or Instance ID not configured");
      }

      const apiUrl = `${this.baseURL}/${this.instanceId}/send-message`;
      const messagePayload = {
        chat_id: phoneNumber.replace("+", ""),
        text: messageText,
        priority: 0,
      };

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: this.apiToken },
        body: JSON.stringify(messagePayload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(`WhatsApp API error: ${JSON.stringify(result)}`);

      return {
        success: true,
        messageId: result.message_id || result.id || result.messageId || result.data?.id,
        chatId: messagePayload.chat_id,
        data: result,
        sentVia: "wapilot",
        simulated: false,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("❌ wapilot API error:", error.message);
      return { success: false, error: error.message, sentVia: "wapilot", simulated: false, timestamp: new Date() };
    }
  }

  // ============================================================
  // ✅ إرسال رسالة قائمة تفاعلية
  // ============================================================

  async sendListMessage(phoneNumber, title, description, buttonText, sections) {
    try {
      if (!this.apiToken || !this.instanceId) {
        throw new Error("WhatsApp API Token or Instance ID not configured");
      }

      const apiUrl = `${this.baseURL}/${this.instanceId}/send-list`;
      const messagePayload = {
        chat_id: phoneNumber.replace("+", ""),
        priority: 0,
        interactive: { title, description, footer: "Code School 💻", button: buttonText, sections },
      };

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: this.apiToken },
        body: JSON.stringify(messagePayload),
      });

      const result = await response.json();
      console.log("📦 sendListMessage API response:", JSON.stringify(result, null, 2));

      if (!response.ok) throw new Error(`WhatsApp API error: ${JSON.stringify(result)}`);

      return {
        success: true,
        messageId: result.message_id || result.id || result.messageId || result.data?.id,
        chatId: messagePayload.chat_id,
        data: result,
        sentVia: "wapilot",
        simulated: false,
        interactive: true,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("❌ List Message error:", error.message);
      return { success: false, error: error.message, sentVia: "wapilot", simulated: false, interactive: true, timestamp: new Date() };
    }
  }

  async simulateSendMessage(phoneNumber, messageText, isInteractive = false) {
    console.log("🔧 SIMULATION: Sending WhatsApp message");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return {
      success: true, simulated: true, messageId: `sim-${Date.now()}`,
      chatId: phoneNumber.replace("+", ""), sentVia: "simulation",
      interactive: isInteractive, timestamp: new Date(),
    };
  }

  // ============================================================
  // ✅ إرسال رسائل الترحيب (bilingual - رسالة أولى)
  // ============================================================

  async sendWelcomeMessages(
    studentId, studentName, studentPhone, guardianPhone,
    customFirstMessage, customSecondMessage,
  ) {
    try {
      await connectDB();
      const student = await Student.findById(studentId);
      if (!student) return { success: false, skipped: true, reason: "Student not found" };

      const gender = student.personalInfo?.gender || "male";
      const male = isMaleGender(gender);
      const studentNickname = student.personalInfo?.nickname || null;
      const guardianName = student.guardianInfo?.name || "";
      const guardianNickname = student.guardianInfo?.nickname || null;
      const relationship = student.guardianInfo?.relationship || "father";

      if (!studentPhone && !guardianPhone) {
        return { success: false, skipped: true, reason: "No WhatsApp numbers provided" };
      }

      const results = { student: null, guardian: null };

      // ✅ 1. رسالة الطالب (bilingual - لاختيار اللغة)
      if (studentPhone) {
        const preparedStudentNumber = this.preparePhoneNumber(studentPhone);
        if (preparedStudentNumber) {
          let languageMessage;

          if (customSecondMessage) {
            languageMessage = customSecondMessage
              .replace(/{name_ar}/g, studentNickname?.ar || studentName.split(" ")[0] || studentName)
              .replace(/{name_en}/g, studentNickname?.en || studentName.split(" ")[0] || studentName)
              .replace(/{fullName}/g, studentName)
              .replace(/{gender}/g, male ? "ولد" : "بنت")
              .replace(/{salutation_ar}/g, this.getStudentSalutation(gender, "ar", studentNickname?.ar, studentNickname?.en))
              .replace(/{salutation_en}/g, this.getStudentSalutation(gender, "en", studentNickname?.ar, studentNickname?.en))
              .replace(/{you_ar}/g, male ? "أنت" : "أنتِ")
              .replace(/{you_en}/g, "you")
              .replace(/{welcome_ar}/g, male ? "أهلاً بك" : "أهلاً بكِ")
              .replace(/{welcome_en}/g, "Welcome");
          } else {
            languageMessage = this.prepareBilingualLanguageSelectionMessage(studentName, gender, studentNickname);
          }

          const listTitle = male
            ? "🌍 مرحباً بك في Code School | 🌍 Welcome to Code School"
            : "🌍 مرحباً بكِ في Code School | 🌍 Welcome to Code School";

          if (this.mode === "production") {
            results.student = await this.sendListMessage(
              preparedStudentNumber, listTitle, languageMessage, "اختر | Choose",
              [{
                title: "اللغات المتاحة | Available Languages",
                rows: [
                  { rowId: "arabic_lang", title: "➡️ العربية", description: "اختر العربية كلغة مفضلة - Choose Arabic" },
                  { rowId: "english_lang", title: "➡️ English", description: "Choose English as preferred language - اختر الإنجليزية" },
                ],
              }],
            );
          } else {
            results.student = await this.simulateSendMessage(preparedStudentNumber, languageMessage, true);
          }

          if (studentId) {
            await this.logToStudentSchema(studentId, {
              messageType: "bilingual_language_selection",
              messageContent: languageMessage,
              language: "bilingual",
              status: results.student.success ? "sent" : "failed",
              recipientNumber: preparedStudentNumber,
              wapilotMessageId: results.student.messageId || null,
              sentAt: new Date(),
              metadata: {
                isCustomMessage: !!customSecondMessage,
                interactive: true,
                automationType: "student_creation",
                recipientType: "student",
                studentGender: gender,
                studentNicknameAr: studentNickname?.ar || null,
                studentNicknameEn: studentNickname?.en || null,
                isBilingual: true,
                languages: ["ar", "en"],
              },
            });

            if (results.student.chatId) {
              await Student.updateOne(
                { _id: studentId },
                { $set: { "metadata.whatsappChatId": results.student.chatId } }
              );
              console.log(`💾 Saved chatId: ${results.student.chatId}`);
            }
          }
        }
      }

      // ✅ 2. رسالة ولي الأمر (bilingual - رسالة ترحيب)
      if (guardianPhone) {
        const preparedGuardianNumber = this.preparePhoneNumber(guardianPhone);
        if (preparedGuardianNumber) {
          let guardianMessage;

          if (customFirstMessage) {
            guardianMessage = customFirstMessage
              .replace(/{guardianName_ar}/g, guardianNickname?.ar || guardianName.split(" ")[0] || guardianName)
              .replace(/{guardianName_en}/g, guardianNickname?.en || guardianName.split(" ")[0] || guardianName)
              .replace(/{studentName_ar}/g, studentNickname?.ar || studentName.split(" ")[0] || studentName)
              .replace(/{studentName_en}/g, studentNickname?.en || studentName.split(" ")[0] || studentName)
              .replace(/{fullStudentName}/g, studentName)
              .replace(/{relationship_ar}/g, relationship === "father" ? "الأب" : relationship === "mother" ? "الأم" : "الوصي")
              .replace(/{relationship_en}/g, relationship === "father" ? "father" : relationship === "mother" ? "mother" : "guardian")
              .replace(/{studentGender_ar}/g, male ? "الابن" : "الابنة")
              .replace(/{studentGender_en}/g, male ? "son" : "daughter")
              .replace(/{guardianSalutation_ar}/g, this.getGuardianSalutation(guardianName, relationship, guardianNickname, "ar"))
              .replace(/{guardianSalutation_en}/g, this.getGuardianSalutation(guardianName, relationship, guardianNickname, "en"));
          } else {
            guardianMessage = this.prepareBilingualGuardianNotificationMessage(
              guardianName, studentName, gender, relationship, guardianNickname, studentNickname,
            );
          }

          if (this.mode === "production") {
            results.guardian = await this.sendTextMessage(preparedGuardianNumber, guardianMessage);
          } else {
            results.guardian = await this.simulateSendMessage(preparedGuardianNumber, guardianMessage);
          }

          if (studentId) {
            await this.logToStudentSchema(studentId, {
              messageType: "bilingual_guardian_notification",
              messageContent: guardianMessage,
              language: "bilingual",
              status: results.guardian.success ? "sent" : "failed",
              recipientNumber: preparedGuardianNumber,
              wapilotMessageId: results.guardian.messageId || null,
              sentAt: new Date(),
              metadata: {
                automationType: "student_creation",
                recipientType: "guardian",
                guardianName,
                guardianNicknameAr: guardianNickname?.ar || null,
                guardianNicknameEn: guardianNickname?.en || null,
                studentName,
                studentNicknameAr: studentNickname?.ar || null,
                studentNicknameEn: studentNickname?.en || null,
                studentGender: gender,
                relationship,
                isBilingual: true,
                languages: ["ar", "en"],
              },
            });
          }
        }
      }

      return {
        success: results.student?.success || results.guardian?.success || false,
        results, studentId, studentName, studentGender: gender,
        guardianName, relationship,
        whatsappNumbers: { student: studentPhone, guardian: guardianPhone },
        mode: this.mode,
        totalMessages: (studentPhone ? 1 : 0) + (guardianPhone ? 1 : 0),
        interactive: true,
        messageType: "bilingual_dual_messages",
        nextStep: "Waiting for student language selection",
        webhookEndpoint: "/api/whatsapp/webhook",
      };
    } catch (error) {
      console.error("❌ Error in sendWelcomeMessages:", error.message);
      throw error;
    }
  }

  // ============================================================
  // ✅ إرسال رسائل تأكيد اللغة - باللغة المختارة فقط
  // ============================================================

  async sendLanguageConfirmationMessage(
    studentId, studentPhone, guardianPhone, studentName, selectedLanguage,
  ) {
    try {
      await connectDB();
      const student = await Student.findById(studentId);
      if (!student) return { success: false, skipped: true, reason: "Student not found" };

      const gender = student.personalInfo?.gender || "male";
      const studentNickname = student.personalInfo?.nickname || null;
      const guardianName = student.guardianInfo?.name || "";
      const guardianNickname = student.guardianInfo?.nickname || null;
      const relationship = student.guardianInfo?.relationship || "father";

      const results = { student: null, guardian: null };

      // ✅ رسالة الطالب - باللغة المختارة فقط
      if (studentPhone) {
        const preparedStudentNumber = this.preparePhoneNumber(studentPhone);
        if (preparedStudentNumber) {
          const studentMessage = this.prepareLanguageConfirmationMessage(
            studentName, gender, selectedLanguage, studentNickname,
          );

          results.student = await this.sendAndLogMessage({
            studentId,
            phoneNumber: preparedStudentNumber,
            messageContent: studentMessage,
            messageType: "bilingual_language_confirmation",
            language: selectedLanguage, // ✅ اللغة المختارة فعلاً
            metadata: {
              selectedLanguage,
              automationType: "language_selection_response",
              recipientType: "student",
              studentGender: gender,
              studentNicknameAr: studentNickname?.ar || null,
              studentNicknameEn: studentNickname?.en || null,
              isBilingual: false, // ✅ مش bilingual
            },
          });
        }
      }

      // ✅ رسالة ولي الأمر - باللغة المختارة فقط
      if (guardianPhone) {
        const preparedGuardianNumber = this.preparePhoneNumber(guardianPhone);
        if (preparedGuardianNumber) {
          const guardianMessage = this.prepareGuardianLanguageConfirmationMessage(
            guardianName, studentName, gender, relationship, selectedLanguage,
            guardianNickname, studentNickname,
          );

          results.guardian = await this.sendAndLogMessage({
            studentId,
            phoneNumber: preparedGuardianNumber,
            messageContent: guardianMessage,
            messageType: "bilingual_language_confirmation_guardian",
            language: selectedLanguage, // ✅ اللغة المختارة فعلاً
            metadata: {
              selectedLanguage,
              automationType: "language_selection_response",
              recipientType: "guardian",
              guardianName,
              studentName,
              studentGender: gender,
              relationship,
              isBilingual: false, // ✅ مش bilingual
            },
          });
        }
      }

      return {
        success: results.student?.success || results.guardian?.success || false,
        results,
        summary: {
          studentConfirmed: !!results.student?.success,
          guardianNotified: !!results.guardian?.success,
          language: selectedLanguage,
          studentName,
          studentGender: gender,
          isBilingual: false,
        },
      };
    } catch (error) {
      console.error("❌ Error sending language confirmation:", error.message);
      throw error;
    }
  }

  async getServiceStatus() {
    return {
      enabled: this.isEnabled,
      configured: !!this.apiToken && !!this.instanceId,
      instanceId: this.instanceId,
      mode: this.mode,
      lastChecked: new Date(),
      genderHandling: "✅ Case-insensitive (male/Male/MALE all work correctly)",
    };
  }
}

export const wapilotService = new WapilotService();
export default wapilotService;