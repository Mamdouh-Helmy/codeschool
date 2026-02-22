// /src/app/services/wapilot-service.js
import Student from "../models/Student.js";
import { connectDB } from "@/lib/mongodb";

const FORCE_PRODUCTION = true;

// ✅ دالة مساعدة مركزية لتوحيد قيمة الجنس
const isMaleGender = (gender) => {
  if (!gender) return true; // default male
  return String(gender).toLowerCase().trim() === "male";
};

class WapilotService {
  constructor() {
    console.log("🔍 WhatsApp Service Initialization:");

    this.baseURL =
      process.env.WHATSAPP_API_URL || "https://api.wapilot.net/api/v2";
    this.apiToken = process.env.WHATSAPP_API_TOKEN;
    this.instanceId = process.env.WHATSAPP_INSTANCE_ID;
    this.isEnabled = !!this.apiToken && !!this.instanceId;
    this.mode =
      FORCE_PRODUCTION ||
      (this.isEnabled && process.env.NODE_ENV === "production")
        ? "production"
        : "simulation";

    console.log("📱 Wapilot WhatsApp Service initialized:", {
      enabled: this.isEnabled,
      instance: this.instanceId ? "Configured" : "Not configured",
      mode: this.mode,
      recipients: "✅ Student + Guardian (Dual sending)",
      humanizedMessages: "✅ YES - Personalized with gender & relationship",
      languages: "✅ BILINGUAL - Arabic + English (Both languages sent together)",
      nameFormat: "✅ Arabic name for Arabic text, English name for English text",
    });
  }

  /**
   * ✅ الحصول على صيغة المخاطبة المناسبة للطالب حسب الجنس واللغة
   */
  getStudentSalutation(gender, language = "ar", arabicName = "", englishName = "") {
    // ✅ FIX: استخدام isMaleGender بدلاً من المقارنة المباشرة
    const male = isMaleGender(gender);

    if (language === "ar") {
      const displayName = arabicName ? ` ${arabicName}` : "";
      return male
        ? `عزيزي الطالب${displayName}`
        : `عزيزتي الطالبة${displayName}`;
    } else {
      const displayName = englishName ? ` ${englishName}` : "";
      return `Dear student${displayName}`;
    }
  }

  /**
   * ✅ الحصول على صيغة المخاطبة المناسبة لولي الأمر حسب العلاقة
   */
  getGuardianSalutation(guardianName, relationship, guardianNickname = null, language = "ar") {
    if (language === "ar") {
      const displayName =
        guardianNickname?.ar ||
        guardianName?.split(" ")[0] ||
        guardianName ||
        "";

      switch (relationship) {
        case "father":
          return `عزيزي الأستاذ ${displayName}`;
        case "mother":
          return `عزيزتي السيدة ${displayName}`;
        case "guardian":
          return `عزيزي السيد ${displayName}`;
        default:
          return `عزيزي/عزيزتي ${displayName}`;
      }
    } else {
      const displayName =
        guardianNickname?.en ||
        guardianName?.split(" ")[0] ||
        guardianName ||
        "";

      switch (relationship) {
        case "father":
          return `Dear Mr. ${displayName}`;
        case "mother":
          return `Dear Mrs. ${displayName}`;
        case "guardian":
          return `Dear Mr./Mrs. ${displayName}`;
        default:
          return `Dear ${displayName}`;
      }
    }
  }

  /**
   * ✅ الحصول على صيغة "ابن / ابنة" حسب الجنس
   */
  getStudentChildTitle(gender, language = "ar") {
    // ✅ FIX: استخدام isMaleGender
    const male = isMaleGender(gender);
    if (language === "ar") {
      return male ? "الابن" : "الابنة";
    } else {
      return male ? "son" : "daughter";
    }
  }

  /**
   * ✅ رسالة اختيار اللغة - ثنائية اللغة
   */
  prepareBilingualLanguageSelectionMessage(studentName, gender, nickname = null) {
    // ✅ FIX: استخدام isMaleGender
    const male = isMaleGender(gender);

    const arabicName = nickname?.ar || studentName.split(" ")[0] || studentName;
    const englishName = nickname?.en || studentName.split(" ")[0] || studentName;

    const studentSalutationAr = this.getStudentSalutation(gender, "ar", arabicName, englishName);
    const studentSalutationEn = this.getStudentSalutation(gender, "en", arabicName, englishName);

    // ✅ FIX: استخدام male بدلاً من gender === "Male"
    const welcomeAr = male ? "أهلاً بك" : "أهلاً بكِ";

    return `
${studentSalutationAr}
${studentSalutationEn}

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

  /**
   * ✅ رسالة إشعار ولي الأمر - ثنائية اللغة
   */
  prepareBilingualGuardianNotificationMessage(
    guardianName, studentName, studentGender, relationship,
    guardianNickname = null, studentNickname = null,
  ) {
    const guardianSalutationAr = this.getGuardianSalutation(guardianName, relationship, guardianNickname, "ar");
    const guardianSalutationEn = this.getGuardianSalutation(guardianName, relationship, guardianNickname, "en");

    const displayStudentNameAr = studentNickname?.ar || studentName.split(" ")[0] || studentName;
    const displayStudentNameEn = studentNickname?.en || studentName.split(" ")[0] || studentName;

    const studentTitleAr = this.getStudentChildTitle(studentGender, "ar");
    const studentTitleEn = this.getStudentChildTitle(studentGender, "en");

    // ✅ FIX: استخدام isMaleGender
    const enrolledVerb = isMaleGender(studentGender) ? "انضم" : "انضمت";

    return `${guardianSalutationAr}
${guardianSalutationEn}

تحية طيبة وبعد،
Greetings,

يسعدنا إبلاغكم بأن ${studentTitleAr} **${displayStudentNameAr}** قد ${enrolledVerb} رسمياً إلى عائلتنا التعليمية اليوم. 🎉
We are pleased to inform you that your ${studentTitleEn} **${displayStudentNameEn}** has officially joined our educational family today. 🎉

سأكون متاحاً شخصياً للرد على أي استفسارات لديكم في أي وقت.
I will personally be available to answer any questions you may have at any time.

مع خالص الاحترام والتقدير،
فريق Code School 💻

Best regards,
The Code School Team 💻

🌍 شكراً لثقتكم في Code School
🌍 Thank you for trusting Code School`;
  }

  /**
   * ✅ رسالة تأكيد اللغة - ثنائي اللغة
   */
  prepareBilingualLanguageConfirmationMessage(studentName, gender, selectedLanguage, nickname = null) {
    const arabicName = nickname?.ar || studentName.split(" ")[0] || studentName;
    const englishName = nickname?.en || studentName.split(" ")[0] || studentName;

    const studentSalutationAr = this.getStudentSalutation(gender, "ar", arabicName, englishName);
    const studentSalutationEn = this.getStudentSalutation(gender, "en", arabicName, englishName);

    if (selectedLanguage === "en") {
      return `✅ Language Preference Confirmed

${studentSalutationAr}
${studentSalutationEn},

Thank you for choosing your preferred language. Your communication language has been successfully set to **English**.

📌 **What happens next?**
• All future messages and notifications will be sent to you in English
• Your course materials and support will be provided in English
• You can change this preference anytime through your profile

We're excited to have you on board and can't wait to see you grow with us!

Warm regards,
Code School Team 💻

P.S. ${englishName}, your learning journey starts now! 🚀

🌍 Thank you for choosing Code School
🌍 شكراً لاختيارك Code School`;
    } else {
      return `✅ تم تأكيد اللغة المفضلة

${studentSalutationAr}
${studentSalutationEn}،

شكراً لاختيارك لغتك المفضلة. تم تعيين اللغة العربية كلغة التواصل الرسمية معك.

📌 **ماذا يحدث الآن؟**
• جميع الرسائل والإشعارات القادمة ستكون باللغة العربية
• المحتوى التعليمي والدعم الفني سيكون متاحاً بالعربية
• يمكنك تغيير هذا التفضيل في أي وقت من خلال ملفك الشخصي

نحن متحمسون لوجودك معنا، ونتطلع لرؤية تطورك وإبداعك!

مع أطيب التحيات،
فريق Code School 💻

P.S. ${arabicName}، رحلتك التعليمية تبدأ من هنا! 🚀

🌍 شكراً لاختيارك Code School
🌍 Thank you for choosing Code School`;
    }
  }

  async sendAndLogMessage({ studentId, phoneNumber, messageContent, messageType, language = "bilingual", metadata = {} }) {
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
            isBilingual: true,
            languages: ["ar", "en"],
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
        headers: {
          "Content-Type": "application/json",
          token: this.apiToken,
        },
        body: JSON.stringify(messagePayload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${JSON.stringify(result)}`);
      }

      return {
        success: true,
        messageId: result.id,
        data: result,
        sentVia: "wapilot",
        simulated: false,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("❌ wapilot API error:", error.message);
      return {
        success: false,
        error: error.message,
        sentVia: "wapilot",
        simulated: false,
        timestamp: new Date(),
      };
    }
  }

  async sendListMessage(phoneNumber, title, description, buttonText, sections) {
    try {
      if (!this.apiToken || !this.instanceId) {
        throw new Error("WhatsApp API Token or Instance ID not configured");
      }

      const apiUrl = `${this.baseURL}/${this.instanceId}/send-list`;

      const messagePayload = {
        chat_id: phoneNumber.replace("+", ""),
        priority: 0,
        interactive: {
          title,
          description,
          footer: "Code School 💻",
          button: buttonText,
          sections,
        },
      };

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: this.apiToken,
        },
        body: JSON.stringify(messagePayload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${JSON.stringify(result)}`);
      }

      return {
        success: true,
        messageId: result.id,
        data: result,
        sentVia: "wapilot",
        simulated: false,
        interactive: true,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("❌ List Message error:", error.message);
      return {
        success: false,
        error: error.message,
        sentVia: "wapilot",
        simulated: false,
        interactive: true,
        timestamp: new Date(),
      };
    }
  }

  async simulateSendMessage(phoneNumber, messageText, isInteractive = false) {
    console.log("🔧 SIMULATION: Sending bilingual WhatsApp message");
    await new Promise((resolve) => setTimeout(resolve, 1500));

    return {
      success: true,
      simulated: true,
      messageId: `sim-${Date.now()}`,
      sentVia: "simulation",
      interactive: isInteractive,
      timestamp: new Date(),
    };
  }

  /**
   * ✅ إرسال رسائل الترحيب
   */
  async sendWelcomeMessages(
    studentId, studentName, studentPhone, guardianPhone,
    customFirstMessage, customSecondMessage,
  ) {
    try {
      await connectDB();
      const student = await Student.findById(studentId);

      if (!student) {
        return { success: false, skipped: true, reason: "Student not found" };
      }

      // ✅ FIX: جلب الـ gender من الـ DB مباشرة وتوحيده
      const rawGender = student.personalInfo?.gender || "male";
      const gender = rawGender; // الـ model بيرجعه lowercase بسبب getter
      const male = isMaleGender(gender);

      console.log(`👤 Student gender from DB: "${rawGender}" → isMale: ${male}`);

      const studentNickname = student.personalInfo?.nickname || null;
      const guardianName = student.guardianInfo?.name || "";
      const guardianNickname = student.guardianInfo?.nickname || null;
      const relationship = student.guardianInfo?.relationship || "father";

      if (!studentPhone && !guardianPhone) {
        return { success: false, skipped: true, reason: "No WhatsApp numbers provided" };
      }

      const results = { student: null, guardian: null };

      // ✅ 1. رسالة الطالب
      if (studentPhone) {
        const preparedStudentNumber = this.preparePhoneNumber(studentPhone);
        if (preparedStudentNumber) {
          let languageMessage;

          if (customSecondMessage) {
            // ✅ FIX: استخدام isMaleGender في كل استبدالات المتغيرات
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
            languageMessage = this.prepareBilingualLanguageSelectionMessage(
              studentName, gender, studentNickname,
            );
          }

          // ✅ FIX: استخدام male بدلاً من gender === "Male"
          const listTitle = male
            ? "🌍 مرحباً بك في Code School | 🌍 Welcome to Code School"
            : "🌍 مرحباً بكِ في Code School | 🌍 Welcome to Code School";

          if (this.mode === "production") {
            results.student = await this.sendListMessage(
              preparedStudentNumber,
              listTitle,
              languageMessage,
              "اختر | Choose",
              [
                {
                  title: "اللغات المتاحة | Available Languages",
                  rows: [
                    { rowId: "arabic_lang", title: "➡️ العربية", description: "اختر العربية كلغة مفضلة - Choose Arabic" },
                    { rowId: "english_lang", title: "➡️ English", description: "Choose English as preferred language - اختر الإنجليزية" },
                  ],
                },
              ],
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
          }
        }
      }

      // ✅ 2. رسالة ولي الأمر
      if (guardianPhone) {
        const preparedGuardianNumber = this.preparePhoneNumber(guardianPhone);
        if (preparedGuardianNumber) {
          let guardianMessage;

          if (customFirstMessage) {
            // ✅ FIX: استخدام isMaleGender في كل استبدالات المتغيرات
            guardianMessage = customFirstMessage
              .replace(/{guardianName_ar}/g, guardianNickname?.ar || guardianName.split(" ")[0] || guardianName)
              .replace(/{guardianName_en}/g, guardianNickname?.en || guardianName.split(" ")[0] || guardianName)
              .replace(/{studentName_ar}/g, studentNickname?.ar || studentName.split(" ")[0] || studentName)
              .replace(/{studentName_en}/g, studentNickname?.en || studentName.split(" ")[0] || studentName)
              .replace(/{fullStudentName}/g, studentName)
              .replace(/{relationship_ar}/g, relationship === "father" ? "الأب" : relationship === "mother" ? "الأم" : relationship === "guardian" ? "الوصي" : "ولي الأمر")
              .replace(/{relationship_en}/g, relationship === "father" ? "father" : relationship === "mother" ? "mother" : "guardian")
              // ✅ FIX: استخدام male بدلاً من gender === "Male"
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
        results,
        studentId,
        studentName,
        studentGender: gender,
        guardianName,
        relationship,
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

  /**
   * ✅ إرسال تأكيد اللغة
   */
  async sendLanguageConfirmationMessage(
    studentId, studentPhone, guardianPhone, studentName, selectedLanguage,
  ) {
    try {
      await connectDB();
      const student = await Student.findById(studentId);

      if (!student) {
        return { success: false, skipped: true, reason: "Student not found" };
      }

      const gender = student.personalInfo?.gender || "male";
      const male = isMaleGender(gender);
      const studentNickname = student.personalInfo?.nickname || null;
      const guardianName = student.guardianInfo?.name || "";
      const guardianNickname = student.guardianInfo?.nickname || null;
      const relationship = student.guardianInfo?.relationship || "father";

      const results = { student: null, guardian: null };

      if (studentPhone) {
        const preparedStudentNumber = this.preparePhoneNumber(studentPhone);
        if (preparedStudentNumber) {
          const studentMessageText = this.prepareBilingualLanguageConfirmationMessage(
            studentName, gender, selectedLanguage, studentNickname,
          );

          results.student = await this.sendAndLogMessage({
            studentId,
            phoneNumber: preparedStudentNumber,
            messageContent: studentMessageText,
            messageType: "bilingual_language_confirmation",
            language: "bilingual",
            metadata: {
              selectedLanguage,
              automationType: "language_selection_response",
              recipientType: "student",
              studentGender: gender,
              studentNicknameAr: studentNickname?.ar || null,
              studentNicknameEn: studentNickname?.en || null,
              isBilingual: true,
              languages: ["ar", "en"],
            },
          });
        }
      }

      if (guardianPhone) {
        const preparedGuardianNumber = this.preparePhoneNumber(guardianPhone);
        if (preparedGuardianNumber) {
          const displayStudentNameAr = studentNickname?.ar || studentName.split(" ")[0] || studentName;
          const displayStudentNameEn = studentNickname?.en || studentName.split(" ")[0] || studentName;

          const studentTitleAr = this.getStudentChildTitle(gender, "ar");
          const studentTitleEn = this.getStudentChildTitle(gender, "en");

          const guardianSalutationAr = this.getGuardianSalutation(guardianName, relationship, guardianNickname, "ar");
          const guardianSalutationEn = this.getGuardianSalutation(guardianName, relationship, guardianNickname, "en");

          const guardianMessage = `${guardianSalutationAr}
${guardianSalutationEn}

يسعدني أن أبلغكم بأن ${studentTitleAr} **${displayStudentNameAr}** قام/ت بتأكيد اللغة المفضلة للتواصل بنجاح.
I am pleased to inform you that your ${studentTitleEn} **${displayStudentNameEn}** has successfully confirmed their preferred language for communication.

🌐 **تفضيل اللغة | Language Preference:**
${
  selectedLanguage === "en"
    ? "تم اختيار **الإنجليزية** كلغة مفضلة للتواصل | **English** has been selected as the preferred language"
    : "تم اختيار **العربية** كلغة مفضلة للتواصل | **Arabic** has been selected as the preferred language"
}

📌 **ماذا يعني هذا؟ | What this means:**
• جميع الرسائل القادمة ستكون باللغة ${selectedLanguage === "en" ? "الإنجليزية" : "العربية"}
• All future messages will be sent in ${selectedLanguage === "en" ? "English" : "Arabic"}

شكراً لثقتكم المستمرة في Code School.
Thank you for your continued trust in Code School.

مع أطيب التحيات،
فريق Code School 💻

Best regards,
The Code School Team 💻`;

          results.guardian = await this.sendAndLogMessage({
            studentId,
            phoneNumber: preparedGuardianNumber,
            messageContent: guardianMessage,
            messageType: "bilingual_language_confirmation_guardian",
            language: "bilingual",
            metadata: {
              selectedLanguage,
              automationType: "language_selection_response",
              recipientType: "guardian",
              guardianName,
              studentName,
              studentGender: gender,
              relationship,
              isBilingual: true,
              languages: ["ar", "en"],
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
          isBilingual: true,
        },
      };
    } catch (error) {
      console.error("❌ Error sending bilingual confirmation:", error.message);
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