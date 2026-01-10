/**
 * WhatsApp Automation Service using Wapilot API
 * ✅ UPDATED: Accepts custom messages from form
 */

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
        ? "PRODUCTION"
        : "SIMULATION";

    console.log("📱 Wapilot WhatsApp Service initialized:", {
      enabled: this.isEnabled,
      instance: this.instanceId ? "Configured" : "Not configured",
      mode: this.mode,
      interactiveSupport: "✅ YES - List Messages Enabled",
    });
  }

  prepareFirstWelcomeMessage(studentName) {
    return `🎉 أهلاً وسهلاً بك في Code School! | Welcome to Code School!

مرحباً ${studentName} 👋 | Hello ${studentName} 👋

يسعدنا جداً انضمامك إلى مجتمع البرمجة لدينا! 🚀
We're thrilled to have you join our coding community! 🚀

**ماذا تتعلم معنا؟ | What will you learn with us?**
🔹 برمجة الويب | Web Development
🔹 تطبيقات الجوال | Mobile Applications
🔹 الذكاء الاصطناعي | Artificial Intelligence
🔹 قواعد البيانات | Databases

📅 ستصلك جدول الحصص في أقرب وقت.
Your class schedule will be sent to you soon.`;
  }

  prepareLanguageConfirmationMessage(studentName, selectedLanguage) {
    if (selectedLanguage === "en") {
      return `✅ *Language Preference Confirmed!*

Dear ${studentName},

Thank you for choosing *English* as your preferred language.

📋 *What's next?*
• All future communications will be in English
• Course materials will be provided in English
• Support will be available in English

💡 *Quick tip:* You can change your language preference anytime by contacting our support team.

Thank you for choosing Code School! 🚀

Best regards,
*The Code School Team* 💻✨`;
    } else {
      return `✅ *تم تأكيد تفضيل اللغة!*

عزيزي/عزيزتي ${studentName},

شكراً لك على اختيار *العربية* كلغتك المفضلة.

📋 *ماذا بعد؟*
• جميع المراسلات المستقبلية ستكون باللغة العربية
• المواد التعليمية ستكون باللغة العربية
• الدعم الفني سيكون متاحاً باللغة العربية

💡 *نصيحة سريعة:* يمكنك تغيير تفضيل اللغة في أي وقت من خلال التواصل مع فريق الدعم.

شكراً لاختيارك Code School! 🚀

مع أطيب التحيات،
*فريق Code School* 💻✨`;
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
      console.error("❌ wapilot API error:", error);
      throw error;
    }
  }

  /**
   * ✅ إرسال List Message (القائمة التفاعلية)
   */
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
        payload: JSON.stringify(messagePayload, null, 2),
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
      console.error("❌ List Message error:", error);
      throw error;
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
      simulatedResponse.debug
    );

    return simulatedResponse;
  }

  /**
   * ✅ إرسال رسائل الترحيب مع List Message للتفاعل
   * @param {string} studentName - اسم الطالب
   * @param {string} phoneNumber - رقم الجوال
   * @param {string} customFirstMessage - الرسالة الأولى المخصصة من المستخدم
   * @param {string} customSecondMessage - الرسالة الثانية المخصصة من المستخدم
   */
  async sendWelcomeMessages(studentName, phoneNumber, customFirstMessage, customSecondMessage) {
    try {
      console.log("🎯 WhatsApp automation for student:", {
        name: studentName,
        whatsappNumber: phoneNumber,
        mode: this.mode,
        interactive: true,
        messageType: "list_message",
        hasCustomMessages: !!(customFirstMessage || customSecondMessage)
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

      // استخدام الرسائل المخصصة أو الافتراضية
      const firstMessage = customFirstMessage || this.prepareFirstWelcomeMessage(studentName);
      const secondMessage = customSecondMessage || "اختر اللغة المفضلة / Choose your preferred language";

      console.log("📝 Prepared welcome messages:", {
        to: preparedNumber,
        studentName: studentName,
        firstMessageLength: firstMessage.length,
        secondMessageLength: secondMessage.length,
        messageType: "list_message",
        mode: this.mode,
      });

      let firstResult, secondResult;

      if (this.mode === "PRODUCTION") {
        console.log("🚀 SENDING REAL MESSAGES WITH LIST INTERACTION");

        // الرسالة الأولى: ترحيب (نص عادي)
        firstResult = await this.sendTextMessage(preparedNumber, firstMessage);

        // انتظار 3 ثوانٍ ثم إرسال List Message
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // ✅ List Message مع خيارات اللغة
        secondResult = await this.sendListMessage(
          preparedNumber,
          "🌍 Language | اللغة",
          secondMessage,
          "Choose | اختر",
          [
            {
              title: "Available Languages",
              rows: [
                {
                  rowId: "arabic_lang",
                  title: "🇸🇦 العربية",
                  description:
                    "اختر العربية كلغة مفضلة | Choose Arabic as preferred language",
                },
                {
                  rowId: "english_lang",
                  title: "🇺🇸 English",
                  description:
                    "Choose English as preferred language | اختر الإنجليزية كلغة مفضلة",
                },
              ],
            },
          ]
        );
      } else {
        console.log("🔧 SIMULATING MESSAGES WITH LIST INTERACTION");

        firstResult = await this.simulateSendMessage(
          preparedNumber,
          firstMessage
        );
        await new Promise((resolve) => setTimeout(resolve, 3000));
        secondResult = await this.simulateSendMessage(
          preparedNumber,
          secondMessage,
          true
        );
      }

      await this.logMessage({
        status: "sent",
        messageId: secondResult.messageId,
        recipient: preparedNumber,
        studentName: studentName,
        messagesSent: 2,
        firstMessageType: "welcome",
        secondMessageType: "interactive_list",
        interactive: true,
        simulated: secondResult.simulated || false,
        mode: this.mode,
        hasCustomMessages: !!(customFirstMessage || customSecondMessage),
        timestamp: new Date(),
      });

      return {
        success: true,
        messages: [
          { type: "welcome", result: firstResult },
          { type: "interactive_list", result: secondResult },
        ],
        studentName: studentName,
        whatsappNumber: preparedNumber,
        mode: this.mode,
        totalMessages: 2,
        interactive: true,
        messageType: "list_message",
        nextStep: "Waiting for list selection (arabic_lang or english_lang)",
        webhookEndpoint: "/api/whatsapp/webhook",
      };
    } catch (error) {
      console.error("❌ Error in sendWelcomeMessages:", error);

      await this.logMessage({
        status: "error",
        recipient: phoneNumber,
        error: error.message,
        studentName: studentName,
        mode: this.mode,
        timestamp: new Date(),
      });

      throw error;
    }
  }

  async sendLanguageConfirmationMessage(
    phoneNumber,
    studentName,
    selectedLanguage
  ) {
    try {
      console.log("📱 Sending language confirmation:", {
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
        selectedLanguage
      );

      let sendResult;
      if (this.mode === "PRODUCTION" && this.apiToken && this.instanceId) {
        console.log("🚀 SENDING REAL CONFIRMATION TO:", preparedNumber);
        sendResult = await this.sendTextMessage(preparedNumber, messageText);
      } else {
        console.log("🔧 SIMULATION MODE (not sending real message)");
        sendResult = {
          success: true,
          messageId: `sim-confirm-${Date.now()}`,
          simulated: true,
        };
      }

      return sendResult;
    } catch (error) {
      console.error("❌ Error sending confirmation:", error);
      throw error;
    }
  }

  async logMessage(logData) {
    try {
      const logEntry = {
        ...logData,
        service: "wapilot-whatsapp",
        environment: this.mode,
        timestamp: new Date().toISOString(),
      };

      console.log("📝 WhatsApp Log:", logEntry);

      return logEntry;
    } catch (error) {
      console.error("❌ Error logging message:", error);
    }
  }

  /**
   * معالجة رد الطالب على List Message
   */
  async processLanguageSelection(phoneNumber, response) {
    try {
      console.log("🎯 Processing language selection response:", {
        phoneNumber,
        response,
      });

      const preparedNumber = this.preparePhoneNumber(phoneNumber);
      if (!preparedNumber) {
        throw new Error("Invalid phone number format");
      }

      const { connectDB } = await import("@/lib/mongodb");
      const Student = (await import("../models/Student")).default;

      await connectDB();

      const student = await Student.findOne({
        $or: [
          {
            "personalInfo.whatsappNumber": {
              $regex: preparedNumber.replace("+", ""),
              $options: "i",
            },
          },
          {
            "personalInfo.whatsappNumber": {
              $regex: preparedNumber,
              $options: "i",
            },
          },
        ],
        isDeleted: false,
      });

      if (!student) {
        console.log(
          "⚠️ Student not found with WhatsApp number:",
          preparedNumber
        );
        return {
          success: false,
          message: "Student not found",
        };
      }

      let selectedLanguage;
      let responseText = response.toString().trim();

      // معالجة ردود List Message
      if (
        responseText === "arabic_lang" ||
        responseText === "1" ||
        responseText.includes("العربية") ||
        responseText.toLowerCase().includes("arabic")
      ) {
        selectedLanguage = "ar";
      } else if (
        responseText === "english_lang" ||
        responseText === "2" ||
        responseText.includes("English") ||
        responseText.toLowerCase().includes("english")
      ) {
        selectedLanguage = "en";
      } else {
        return {
          success: false,
          message:
            "اختيار غير صحيح. اختر من القائمة.\nInvalid selection. Choose from the list.",
        };
      }

      const studentName = student.personalInfo.fullName;

      console.log("📊 Processing language selection for student:", {
        studentId: student._id,
        studentName,
        currentLanguage: student.communicationPreferences?.preferredLanguage,
        newLanguage: selectedLanguage,
        response: responseText,
        via: "list_message",
      });

      await Student.findByIdAndUpdate(
        student._id,
        {
          $set: {
            "communicationPreferences.preferredLanguage": selectedLanguage,
            "metadata.updatedAt": new Date(),
            "metadata.whatsappLanguageSelected": true,
            "metadata.whatsappLanguageSelection": responseText,
            "metadata.whatsappLanguageSelectedAt": new Date(),
            "metadata.whatsappLanguageConfirmed": true,
            "metadata.whatsappLanguageConfirmationAt": new Date(),
            "metadata.whatsappResponseReceived": true,
            "metadata.whatsappResponse": responseText,
            "metadata.whatsappResponseAt": new Date(),
            "metadata.whatsappButtonSelected": responseText,
            "metadata.whatsappButtonSelectedAt": new Date(),
          },
        },
        { new: true }
      );

      console.log("✅ Database updated successfully");

      const confirmationResult = await this.sendLanguageConfirmationMessage(
        preparedNumber,
        studentName,
        selectedLanguage
      );

      if (confirmationResult.success) {
        await Student.findByIdAndUpdate(student._id, {
          $set: {
            "metadata.whatsappConfirmationSent": true,
            "metadata.whatsappConfirmationSentAt": new Date(),
            "metadata.whatsappMessagesCount": 3,
            "metadata.whatsappTotalMessages": 3,
            "metadata.whatsappLastInteraction": new Date(),
          },
        });
      }

      return {
        success: true,
        studentId: student._id,
        studentName,
        selectedLanguage,
        response: responseText,
        confirmationSent: true,
        confirmationResult,
      };
    } catch (error) {
      console.error("❌ Error processing language selection:", error);
      return {
        success: false,
        error: error.message,
      };
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
        "dual-language-welcome",
        "✅ INTERACTIVE-LIST-MESSAGES (Wapilot native support)",
        "auto-confirmation",
        "webhook-processing",
        "database-sync",
        "✅ CUSTOM-MESSAGES (User-defined content)",
      ],
      messageFlow: [
        "Message 1: Welcome (custom or default text)",
        "Message 2: Language selection with Interactive List (custom or default)",
        "Student clicks on list option",
        "Message 3: Confirmation in selected language",
      ],
      listOptions: [
        { rowId: "arabic_lang", title: "🇸🇦 العربية", sets: "ar" },
        { rowId: "english_lang", title: "🇺🇸 English", sets: "en" },
      ],
    };
  }
}

export const wapilotService = new WapilotService();
export default wapilotService;