// /src/app/services/wapilot-service.js
import Student from "../models/Student.js";
import { connectDB } from "@/lib/mongodb";
import TemplateVariable from "../models/TemplateVariable.js";

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
    this.dbVars = null; // Cache for template variables
    this.lastVarsFetch = null;

    console.log("📱 Wapilot WhatsApp Service initialized:", {
      enabled: this.isEnabled,
      instance: this.instanceId ? "Configured" : "Not configured",
      mode: this.mode,
    });
  }

  // ============================================================
  // ✅ جلب المتغيرات من قاعدة البيانات
  // ============================================================

  async fetchDbVariables() {
    try {
      await connectDB();
      const vars = await TemplateVariable.find({ isActive: true }).lean();
      const varsMap = {};
      vars.forEach(v => {
        varsMap[v.key] = {
          valueAr: v.valueAr,
          valueEn: v.valueEn,
        };
      });
      this.dbVars = varsMap;
      this.lastVarsFetch = new Date();
      console.log(`✅ Fetched ${vars.length} template variables from DB`);
      return varsMap;
    } catch (error) {
      console.error("❌ Error fetching template variables:", error);
      return {};
    }
  }

  async getDbVariable(key, lang = "ar") {
    if (!this.dbVars) {
      await this.fetchDbVariables();
    }
    const v = this.dbVars?.[key];
    if (!v) return null;
    return lang === "ar" ? v.valueAr : v.valueEn;
  }

  // ============================================================
  // ✅ دوال بناء التحية - باستخدام المتغيرات من DB
  // ============================================================

  async getStudentSalutation(gender, language = "ar", arabicName = "", englishName = "") {
    const male = isMaleGender(gender);
    const displayNameAr = arabicName ? ` ${arabicName}` : "";
    const displayNameEn = englishName ? ` ${englishName}` : "";
    
    if (language === "ar") {
      // Try to get from DB first
      const dbSalutationAr = await this.getDbVariable("salutation_ar", "ar");
      if (dbSalutationAr) {
        return `${dbSalutationAr}${displayNameAr}`;
      }
      return male ? `عزيزي الطالب${displayNameAr}` : `عزيزتي الطالبة${displayNameAr}`;
    } else {
      const dbSalutationEn = await this.getDbVariable("salutation_en", "en");
      if (dbSalutationEn) {
        return `${dbSalutationEn}${displayNameEn}`;
      }
      return `Dear student${displayNameEn}`;
    }
  }

  async getGuardianSalutation(guardianName, relationship, guardianNickname = null, language = "ar") {
    const displayNameAr = guardianNickname?.ar || guardianName?.split(" ")[0] || guardianName || "";
    const displayNameEn = guardianNickname?.en || guardianName?.split(" ")[0] || guardianName || "";
    
    if (language === "ar") {
      const dbGuardianSalutationAr = await this.getDbVariable("guardianSalutation_ar", "ar");
      if (dbGuardianSalutationAr) {
        return `${dbGuardianSalutationAr} ${displayNameAr}`;
      }
      switch (relationship) {
        case "father": return `عزيزي الأستاذ ${displayNameAr}`;
        case "mother": return `عزيزتي السيدة ${displayNameAr}`;
        case "guardian": return `عزيزي السيد ${displayNameAr}`;
        default: return `عزيزي/عزيزتي ${displayNameAr}`;
      }
    } else {
      const dbGuardianSalutationEn = await this.getDbVariable("guardianSalutation_en", "en");
      if (dbGuardianSalutationEn) {
        return `${dbGuardianSalutationEn} ${displayNameEn}`;
      }
      switch (relationship) {
        case "father": return `Dear Mr. ${displayNameEn}`;
        case "mother": return `Dear Mrs. ${displayNameEn}`;
        case "guardian": return `Dear Mr./Mrs. ${displayNameEn}`;
        default: return `Dear ${displayNameEn}`;
      }
    }
  }

  async getStudentChildTitle(gender, language = "ar") {
    const male = isMaleGender(gender);
    if (language === "ar") {
      const dbStudentGenderAr = await this.getDbVariable("studentGender_ar", "ar");
      if (dbStudentGenderAr) return dbStudentGenderAr;
      return male ? "الابن" : "الابنة";
    } else {
      const dbStudentGenderEn = await this.getDbVariable("studentGender_en", "en");
      if (dbStudentGenderEn) return dbStudentGenderEn;
      return male ? "son" : "daughter";
    }
  }

  async getWelcomeMessage(language = "ar", gender = "male") {
    const male = isMaleGender(gender);
    if (language === "ar") {
      const dbWelcomeAr = await this.getDbVariable("welcome_ar", "ar");
      if (dbWelcomeAr) return dbWelcomeAr;
      return male ? "أهلاً بك" : "أهلاً بكِ";
    } else {
      return "Welcome";
    }
  }

  // ============================================================
  // ✅ رسالة اختيار اللغة للطالب (bilingual - رسالة ترحيب)
  // ============================================================

  async prepareBilingualLanguageSelectionMessage(studentName, gender, nickname = null) {
    const male = isMaleGender(gender);
    const arabicName = nickname?.ar || studentName.split(" ")[0] || studentName;
    const englishName = nickname?.en || studentName.split(" ")[0] || studentName;
    
    const salutationAr = await this.getStudentSalutation(gender, "ar", arabicName, englishName);
    const salutationEn = await this.getStudentSalutation(gender, "en", arabicName, englishName);
    const welcomeAr = await this.getWelcomeMessage("ar", gender);

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

  async prepareBilingualGuardianNotificationMessage(
    guardianName, studentName, studentGender, relationship,
    guardianNickname = null, studentNickname = null,
  ) {
    const guardianSalAr = await this.getGuardianSalutation(guardianName, relationship, guardianNickname, "ar");
    const guardianSalEn = await this.getGuardianSalutation(guardianName, relationship, guardianNickname, "en");
    const studentNameAr = studentNickname?.ar || studentName.split(" ")[0] || studentName;
    const studentNameEn = studentNickname?.en || studentName.split(" ")[0] || studentName;
    const titleAr = await this.getStudentChildTitle(studentGender, "ar");
    const titleEn = await this.getStudentChildTitle(studentGender, "en");
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

  async prepareLanguageConfirmationMessage(studentName, gender, selectedLanguage, nickname = null) {
    const arabicName = nickname?.ar || studentName.split(" ")[0] || studentName;
    const englishName = nickname?.en || studentName.split(" ")[0] || studentName;
    const salutation = await this.getStudentSalutation(gender, selectedLanguage, arabicName, englishName);

    if (selectedLanguage === "en") {
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

  async prepareGuardianLanguageConfirmationMessage(
    guardianName, studentName, studentGender, relationship, selectedLanguage,
    guardianNickname = null, studentNickname = null,
  ) {
    const studentNameAr = studentNickname?.ar || studentName.split(" ")[0] || studentName;
    const studentNameEn = studentNickname?.en || studentName.split(" ")[0] || studentName;
    const titleAr = await this.getStudentChildTitle(studentGender, "ar");
    const titleEn = await this.getStudentChildTitle(studentGender, "en");
    const salutation = await this.getGuardianSalutation(guardianName, relationship, guardianNickname, selectedLanguage);

    if (selectedLanguage === "en") {
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
              .replace(/{salutation_ar}/g, await this.getStudentSalutation(gender, "ar", studentNickname?.ar, studentNickname?.en))
              .replace(/{salutation_en}/g, await this.getStudentSalutation(gender, "en", studentNickname?.ar, studentNickname?.en))
              .replace(/{you_ar}/g, await this.getDbVariable("you_ar", "ar") || (male ? "أنت" : "أنتِ"))
              .replace(/{you_en}/g, "you")
              .replace(/{welcome_ar}/g, await this.getWelcomeMessage("ar", gender))
              .replace(/{welcome_en}/g, "Welcome");
          } else {
            languageMessage = await this.prepareBilingualLanguageSelectionMessage(studentName, gender, studentNickname);
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
              .replace(/{studentGender_ar}/g, await this.getStudentChildTitle(gender, "ar"))
              .replace(/{studentGender_en}/g, await this.getStudentChildTitle(gender, "en"))
              .replace(/{guardianSalutation_ar}/g, await this.getGuardianSalutation(guardianName, relationship, guardianNickname, "ar"))
              .replace(/{guardianSalutation_en}/g, await this.getGuardianSalutation(guardianName, relationship, guardianNickname, "en"));
          } else {
            guardianMessage = await this.prepareBilingualGuardianNotificationMessage(
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
          const studentMessage = await this.prepareLanguageConfirmationMessage(
            studentName, gender, selectedLanguage, studentNickname,
          );

          results.student = await this.sendAndLogMessage({
            studentId,
            phoneNumber: preparedStudentNumber,
            messageContent: studentMessage,
            messageType: "bilingual_language_confirmation",
            language: selectedLanguage,
            metadata: {
              selectedLanguage,
              automationType: "language_selection_response",
              recipientType: "student",
              studentGender: gender,
              studentNicknameAr: studentNickname?.ar || null,
              studentNicknameEn: studentNickname?.en || null,
              isBilingual: false,
            },
          });
        }
      }

      // ✅ رسالة ولي الأمر - باللغة المختارة فقط
      if (guardianPhone) {
        const preparedGuardianNumber = this.preparePhoneNumber(guardianPhone);
        if (preparedGuardianNumber) {
          const guardianMessage = await this.prepareGuardianLanguageConfirmationMessage(
            guardianName, studentName, gender, relationship, selectedLanguage,
            guardianNickname, studentNickname,
          );

          results.guardian = await this.sendAndLogMessage({
            studentId,
            phoneNumber: preparedGuardianNumber,
            messageContent: guardianMessage,
            messageType: "bilingual_language_confirmation_guardian",
            language: selectedLanguage,
            metadata: {
              selectedLanguage,
              automationType: "language_selection_response",
              recipientType: "guardian",
              guardianName,
              studentName,
              studentGender: gender,
              relationship,
              isBilingual: false,
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
      usesDbVariables: true,
    };
  }
}

export const wapilotService = new WapilotService();
export default wapilotService;