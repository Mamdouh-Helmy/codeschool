// ============================================
// services/wapilot-service.js - Fixed Logging
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

  async sendWelcomeMessages(
    studentId,
    studentName,
    phoneNumber,
    customFirstMessage,
    customSecondMessage,
  ) {
    try {
      console.log("🎯 WhatsApp automation for student:", {
        studentId,
        name: studentName,
        whatsappNumber: phoneNumber,
        mode: this.mode,
        hasCustomMessages: !!(customFirstMessage || customSecondMessage),
      });

      if (!phoneNumber) {
        console.log("⚠️ WhatsApp number not provided, skipping...");
        return {
          success: false,
          skipped: true,
          reason: "WhatsApp number not provided",
        };
      }

      const preparedNumber = this.preparePhoneNumber(phoneNumber);
      if (!preparedNumber) {
        console.error("❌ Could not prepare WhatsApp number");
        return {
          success: false,
          reason: "Invalid WhatsApp number format",
        };
      }

      // ✅ الرسالة الأولى تم إزالتها تمامًا
      // ✅ نبدأ مباشرة برسالة اختيار اللغة
      const languageMessage =
        customSecondMessage ||
        `Welcome to Code School, please select your preferred language so we can communicate with you comfortably:

أهلا بك في كود سكول، من فضلك اختر اللغة المفضلة للتواصل معنا:
➡️ العربية
➡️ English`;

      let languageResult;

      // ✅ إرسال رسالة اختيار اللغة (قائمة تفاعلية أو نصية)
      if (this.mode === "production") {
        languageResult = await this.sendListMessage(
          preparedNumber,
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
        languageResult = await this.simulateSendMessage(
          preparedNumber,
          languageMessage,
          true,
        );
      }

      // ✅ تسجيل رسالة اختيار اللغة
      if (studentId) {
        await this.logToStudentSchema(studentId, {
          messageType: "language_selection",
          messageContent: languageMessage,
          language: "ar",
          status: languageResult.success ? "sent" : "failed",
          recipientNumber: preparedNumber,
          wapilotMessageId: languageResult.messageId || null,
          sentAt: new Date(),
          metadata: {
            isCustomMessage: !!customSecondMessage,
            interactive: true,
            automationType: "student_creation",
            recipientType: "student",
            isFirstMessage: true, // ✅ إضافة علامة أن هذه هي الرسالة الأولى
          },
          error: languageResult.success
            ? null
            : languageResult.error || "Unknown error",
        });
      }

      return {
        success: true,
        messages: [{ type: "language_selection", result: languageResult }],
        studentId,
        studentName: studentName,
        whatsappNumber: preparedNumber,
        mode: this.mode,
        totalMessages: 1, // ✅ تم تغيير العدد إلى 1 فقط
        interactive: true,
        messageType: "list_message",
        nextStep: "Waiting for list selection (arabic_lang or english_lang)",
        webhookEndpoint: "/api/whatsapp/webhook",
        notes:
          "First welcome message removed - starting with language selection directly", // ✅ إضافة ملاحظة
      };
    } catch (error) {
      console.error("❌ Error in sendWelcomeMessages:", error.message);
      throw error;
    }
  }

  async sendLanguageConfirmationMessage(
    studentId,
    phoneNumber,
    studentName,
    selectedLanguage,
  ) {
    try {
      console.log("📱 Sending language confirmation:", {
        studentId,
        phoneNumber,
        studentName,
        selectedLanguage,
        mode: this.mode,
      });

      let preparedNumber = phoneNumber;
      if (!preparedNumber.startsWith("+")) {
        preparedNumber = `+${preparedNumber}`;
      }
      if (!preparedNumber.startsWith("+20")) {
        preparedNumber = `+20${preparedNumber.replace(/^\+/, "")}`;
      }

      const messageText = this.prepareLanguageConfirmationMessage(
        studentName,
        selectedLanguage,
      );

      const sendResult = await this.sendAndLogMessage({
        studentId,
        phoneNumber: preparedNumber,
        messageContent: messageText,
        messageType: "language_confirmation",
        language: selectedLanguage,
        metadata: {
          selectedLanguage,
          automationType: "language_selection_response",
          recipientType: "student",
        },
      });

      return sendResult;
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
        "dual-language-welcome",
        "interactive-list-messages",
        "auto-confirmation",
        "webhook-processing",
        "database-sync",
        "custom-messages",
      ],
      currentFlow: "Direct language selection (no initial welcome message)", // ✅ تحديث وصف سير العمل
    };
  }
}

export const wapilotService = new WapilotService();
export default wapilotService;
