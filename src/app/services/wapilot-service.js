// ============================================
// services/wapilot-service.js - Send to Student & Guardian
// ============================================

import Student from "../models/Student.js";
import { connectDB } from "@/lib/mongodb";

const FORCE_PRODUCTION = true;

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
        ? "production" // ✅ lowercase!
        : "simulation";

    console.log("📱 Wapilot WhatsApp Service initialized:", {
      enabled: this.isEnabled,
      instance: this.instanceId ? "Configured" : "Not configured",
      mode: this.mode,
      recipients: "✅ Student + Guardian (Dual sending)",
      autoLogging:
        "✅ ENABLED - All messages logged to Student.whatsappMessages",
    });
  }

  async sendAndLogMessage({
    studentId,
    phoneNumber,
    messageContent,
    messageType,
    language = "ar",
    metadata = {},
  }) {
    try {
      console.log(`📤 Sending ${messageType} to ${phoneNumber}...`);

      const preparedNumber = this.preparePhoneNumber(phoneNumber);
      if (!preparedNumber) {
        throw new Error("Invalid phone number format");
      }

      let sendResult;

      if (this.mode === "production") {
        sendResult = await this.sendTextMessage(preparedNumber, messageContent);
      } else {
        sendResult = await this.simulateSendMessage(
          preparedNumber,
          messageContent,
        );
      }

      // ✅ Auto-log to student schema
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
          error: sendResult.success
            ? null
            : sendResult.error || "Unknown error",
          errorDetails: !sendResult.success
            ? {
                message: sendResult.error || "Failed to send",
                code: "WAPILOT_ERROR",
                timestamp: new Date(),
              }
            : null,
        });
      }

      return sendResult;
    } catch (error) {
      console.error(`❌ Error in sendAndLogMessage:`, error.message);

      if (studentId) {
        try {
          await this.logToStudentSchema(studentId, {
            messageType,
            messageContent,
            language,
            status: "failed",
            recipientNumber: phoneNumber,
            sentAt: new Date(),
            metadata: {
              ...metadata,
              recipientType: metadata.recipientType || "student",
            },
            error: error.message,
            errorDetails: {
              message: error.message,
              code: "EXCEPTION_ERROR",
              stack: error.stack,
            },
          });
        } catch (logError) {
          console.error("❌ Failed to log error:", logError.message);
        }
      }

      throw error;
    }
  }

  /**
   * ✅ Log message directly to Student using the schema method
   */
  async logToStudentSchema(studentId, messageData) {
    try {
      console.log(`💾 [LOG] Recording message for student ${studentId}`);
      console.log(`   Type: ${messageData.messageType}`);
      console.log(`   Status: ${messageData.status}`);
      console.log(`   To: ${messageData.recipientNumber}`);
      console.log(
        `   Recipient Type: ${messageData.metadata?.recipientType || "student"}`,
      );

      // ✅ Ensure DB connection
      await connectDB();

      // ✅ Find student
      const student = await Student.findById(studentId);
      if (!student) {
        console.error(`⚠️ Student ${studentId} not found for logging`);
        return false;
      }

      console.log(`🔧 Calling logWhatsAppMessage method...`);

      // ✅ Pass raw messageData - method will handle field mapping
      await student.logWhatsAppMessage(messageData);

      console.log(`✅ [LOG] Message logged successfully`);
      console.log(
        `   Total messages: ${student.whatsappMessages?.length || 0}`,
      );

      return true;
    } catch (error) {
      console.error(`❌ [LOG] Error logging to student schema:`, error.message);

      // ✅ Log validation errors more clearly
      if (error.name === "ValidationError") {
        console.error(`   Validation Error Details:`);
        Object.entries(error.errors).forEach(([field, err]) => {
          console.error(`   - ${field}: ${err.message}`);
        });
      }

      return false;
    }
  }

  preparePhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;

    try {
      let cleanNumber = phoneNumber
        .toString()
        .replace(/\s+/g, "")
        .replace(/^0+/, "");

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

      console.log("📤 Sending text message:", {
        url: apiUrl,
        to: phoneNumber,
        messageLength: messageText.length,
      });

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
        console.error("❌ wapilot API error:", result);
        throw new Error(`WhatsApp API error: ${JSON.stringify(result)}`);
      }

      console.log("✅ Text message sent successfully:", {
        messageId: result.id,
        status: "sent",
        to: phoneNumber,
      });

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
          title: title,
          description: description,
          footer: "Code School 💻",
          button: buttonText,
          sections: sections,
        },
      };

      console.log("📤 Sending List Message:", {
        url: apiUrl,
        to: phoneNumber,
        title: title,
        sections: sections.length,
      });

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
        console.error("❌ Wapilot List Message error:", result);
        throw new Error(`WhatsApp API error: ${JSON.stringify(result)}`);
      }

      console.log("✅ List Message sent successfully:", {
        messageId: result.id,
        status: "sent",
        to: phoneNumber,
        interactive: true,
      });

      return {
        success: true,
        messageId: result.id,
        data: result,
        sentVia: "wapilot",
        simulated: false,
        interactive: true,
        listType: "interactive_list",
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
        listType: "interactive_list",
        timestamp: new Date(),
      };
    }
  }

  async simulateSendMessage(phoneNumber, messageText, isInteractive = false) {
    console.log("🔧 SIMULATION: Sending WhatsApp message");

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const simulatedResponse = {
      success: true,
      simulated: true,
      messageId: `sim-${Date.now()}`,
      sentVia: "simulation",
      interactive: isInteractive,
      timestamp: new Date(),
      debug: {
        to: phoneNumber,
        messageLength: messageText.length,
        isInteractive,
        timestamp: new Date().toISOString(),
      },
    };

    console.log(
      "✅ SIMULATION: Message sent successfully",
      simulatedResponse.debug,
    );

    return simulatedResponse;
  }

  /**
   * إرسال رسائل الترحيب للطالب وولي الأمر
   */
  async sendWelcomeMessages(
    studentId,
    studentName,
    studentPhone,
    guardianPhone,
    customFirstMessage,
    customSecondMessage,
  ) {
    try {
      console.log("🎯 WhatsApp automation for student & guardian:", {
        studentId,
        name: studentName,
        studentWhatsapp: studentPhone,
        guardianWhatsapp: guardianPhone,
        mode: this.mode,
        hasCustomMessages: !!(customFirstMessage || customSecondMessage),
      });

      // ✅ التحقق من وجود أرقام WhatsApp
      if (!studentPhone && !guardianPhone) {
        console.log("⚠️ No WhatsApp numbers provided, skipping...");
        return {
          success: false,
          skipped: true,
          reason: "No WhatsApp numbers provided",
        };
      }

      const results = {
        student: null,
        guardian: null,
      };

      // ✅ 1. إرسال رسالة اختيار اللغة للطالب فقط (قائمة تفاعلية)
      if (studentPhone) {
        const preparedStudentNumber = this.preparePhoneNumber(studentPhone);
        if (preparedStudentNumber) {
          // ✅ رسالة اختيار اللغة (الرسالة الأولى والوحيدة)
          const languageMessage =
            customSecondMessage ||
            `Welcome to Code School, please select your preferred language so we can communicate with you comfortably:

أهلا بك في كود سكول، من فضلك اختر اللغة المفضلة للتواصل معنا:
➡️ العربية
➡️ English`;

          if (this.mode === "production") {
            results.student = await this.sendListMessage(
              preparedStudentNumber,
              "🌍 Language | اللغة",
              languageMessage,
              "Choose | اختر",
              [
                {
                  title: "Available Languages",
                  rows: [
                    {
                      rowId: "arabic_lang",
                      title: "➡️ العربية",
                      description: "اختر العربية كلغة مفضلة",
                    },
                    {
                      rowId: "english_lang",
                      title: "➡️ English",
                      description: "Choose English as preferred language",
                    },
                  ],
                },
              ],
            );
          } else {
            results.student = await this.simulateSendMessage(
              preparedStudentNumber,
              languageMessage,
              true,
            );
          }

          // ✅ تسجيل رسالة اختيار اللغة للطالب
          if (studentId) {
            await this.logToStudentSchema(studentId, {
              messageType: "language_selection",
              messageContent: languageMessage,
              language: "ar",
              status: results.student.success ? "sent" : "failed",
              recipientNumber: preparedStudentNumber,
              wapilotMessageId: results.student.messageId || null,
              sentAt: new Date(),
              metadata: {
                isCustomMessage: !!customSecondMessage,
                interactive: true,
                automationType: "student_creation",
                recipientType: "student",
                isFirstMessage: true,
              },
              error: results.student.success
                ? null
                : results.student.error || "Unknown error",
            });
          }
        }
      }

      // ✅ 2. إرسال رسالة إعلامية لولي الأمر (بدون قائمة تفاعلية)
      if (guardianPhone) {
        const preparedGuardianNumber = this.preparePhoneNumber(guardianPhone);
        if (preparedGuardianNumber) {
          const guardianMessage = ` 🌟 Welcome to Code School! We're excited to welcome ${studentName} to our learning community.

🌟 أهلاً بك في Code School! يسعدنا ترحيب ${studentName} في مجتمعنا التعليمي.

📌 **Registration Confirmed | تأكيد التسجيل**
✅ ${studentName} has been successfully enrolled in Code School.
✅ تم تسجيل ${studentName} بنجاح في Code School.

🌐 **Language Selection | اختيار اللغة**
The student will receive a WhatsApp message to select their preferred language (Arabic or English) for all future communication.
سيستلم الطالب رسالة على الواتساب لاختيار اللغة المفضلة (العربية أو الإنجليزية) لجميع التواصل المستقبلي.

مع أطيب التحيات،
فريق Code School 💻`;

          if (this.mode === "production") {
            results.guardian = await this.sendTextMessage(
              preparedGuardianNumber,
              guardianMessage,
            );
          } else {
            results.guardian = await this.simulateSendMessage(
              preparedGuardianNumber,
              guardianMessage,
            );
          }

          // ✅ تسجيل رسالة ولي الأمر
          if (studentId) {
            await this.logToStudentSchema(studentId, {
              messageType: "guardian_notification",
              messageContent: guardianMessage,
              language: "ar",
              status: results.guardian.success ? "sent" : "failed",
              recipientNumber: preparedGuardianNumber,
              wapilotMessageId: results.guardian.messageId || null,
              sentAt: new Date(),
              metadata: {
                automationType: "student_creation",
                recipientType: "guardian",
                guardianName: "Guardian",
                studentName: studentName,
              },
              error: results.guardian.success
                ? null
                : results.guardian.error || "Unknown error",
            });
          }
        }
      }

      return {
        success: results.student?.success || results.guardian?.success || false,
        results,
        studentId,
        studentName: studentName,
        whatsappNumbers: {
          student: studentPhone,
          guardian: guardianPhone,
        },
        mode: this.mode,
        totalMessages: (studentPhone ? 1 : 0) + (guardianPhone ? 1 : 0),
        interactive: true,
        messageType: "dual_messages",
        nextStep: "Waiting for student language selection",
        webhookEndpoint: "/api/whatsapp/webhook",
        notes: "Sent language selection to student + notification to guardian",
      };
    } catch (error) {
      console.error("❌ Error in sendWelcomeMessages:", error.message);
      throw error;
    }
  }

  /**
   * إرسال تأكيد اللغة للطالب وولي الأمر
   */
  async sendLanguageConfirmationMessage(
    studentId,
    studentPhone,
    guardianPhone,
    studentName,
    selectedLanguage,
  ) {
    try {
      console.log("📱 Sending language confirmation to student & guardian:", {
        studentId,
        studentPhone,
        guardianPhone,
        studentName,
        selectedLanguage,
        mode: this.mode,
      });

      const results = {
        student: null,
        guardian: null,
      };

      // ✅ 1. إرسال تأكيد اللغة للطالب
      if (studentPhone) {
        let preparedStudentNumber = studentPhone;
        if (!preparedStudentNumber.startsWith("+")) {
          preparedStudentNumber = `+${preparedStudentNumber}`;
        }
        if (!preparedStudentNumber.startsWith("+20")) {
          preparedStudentNumber = `+20${preparedStudentNumber.replace(/^\+/, "")}`;
        }

        const studentMessageText = this.prepareLanguageConfirmationMessage(
          studentName,
          selectedLanguage,
        );

        results.student = await this.sendAndLogMessage({
          studentId,
          phoneNumber: preparedStudentNumber,
          messageContent: studentMessageText,
          messageType: "language_confirmation",
          language: selectedLanguage,
          metadata: {
            selectedLanguage,
            automationType: "language_selection_response",
            recipientType: "student",
          },
        });
      }

      // ✅ 2. إرسال إعلام لولي الأمر
      if (guardianPhone) {
        let preparedGuardianNumber = guardianPhone;
        if (!preparedGuardianNumber.startsWith("+")) {
          preparedGuardianNumber = `+${preparedGuardianNumber}`;
        }
        if (!preparedGuardianNumber.startsWith("+20")) {
          preparedGuardianNumber = `+20${preparedGuardianNumber.replace(/^\+/, "")}`;
        }

        const guardianMessage =
          selectedLanguage === "en"
            ? `Language Preference Confirmed

${studentName} has selected English as their preferred language for communication.

All future communication with the student will be in English.

Code School Team 💻`
            : `تم تأكيد تفضيل اللغة

${studentName} قام باختيار اللغة العربية كلغة التواصل المفضلة.

سيتم التواصل مع الطالب باللغة العربية مستقبلاً.

فريق Code School 💻`;

        results.guardian = await this.sendAndLogMessage({
          studentId,
          phoneNumber: preparedGuardianNumber,
          messageContent: guardianMessage,
          messageType: "language_confirmation_guardian",
          language: selectedLanguage,
          metadata: {
            selectedLanguage,
            automationType: "language_selection_response",
            recipientType: "guardian",
            guardianName: "Guardian",
            studentName: studentName,
          },
        });
      }

      return {
        success: results.student?.success || results.guardian?.success || false,
        results,
        summary: {
          studentConfirmed: !!results.student?.success,
          guardianNotified: !!results.guardian?.success,
          language: selectedLanguage,
        },
      };
    } catch (error) {
      console.error("❌ Error sending confirmation:", error.message);
      throw error;
    }
  }

  prepareLanguageConfirmationMessage(studentName, selectedLanguage) {
    if (selectedLanguage === "en") {
      return `✅ Language Preference Confirmed

${studentName},
Thank you. Your preferred communication language has been set to English.

📌 From now on:
- All messages and notifications will be sent in English
- Course-related communication and support will be provided in English

If you wish to change this preference at any time, please contact our support team.

Thank you for choosing Code School.
Best regards,
Code School Team 💻`;
    } else {
      return `✅ تم تأكيد تفضيل اللغة

${studentName}،
شكراً لك. تم تعيين اللغة العربية كلغة التواصل المفضلة لديك.

📌 من الآن فصاعداً:
- سيتم إرسال جميع الرسائل والإشعارات باللغة العربية
- سيتم توفير التواصل والدعم الفني المتعلق بالدورات باللغة العربية

إذا كنت ترغب في تغيير هذا التفضيل في أي وقت، يرجى التواصل مع فريق الدعم لدينا.

شكراً لاختيارك Code School.
مع أطيب التحيات،
فريق Code School 💻`;
    }
  }

  async getServiceStatus() {
    return {
      enabled: this.isEnabled,
      configured: !!this.apiToken && !!this.instanceId,
      instanceId: this.instanceId,
      mode: this.mode,
      lastChecked: new Date(),
      features: [
        "✅ AUTO-LOGGING (All messages logged to Student.whatsappMessages)",
        "✅ DUAL RECIPIENTS (Student + Guardian)",
        "dual-language-welcome",
        "interactive-list-messages",
        "auto-confirmation",
        "webhook-processing",
        "database-sync",
        "custom-messages",
      ],
      currentFlow: "Direct language selection + Guardian notification",
    };
  }
}

export const wapilotService = new WapilotService();
export default wapilotService;
