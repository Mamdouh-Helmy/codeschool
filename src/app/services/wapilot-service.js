/**
 * WhatsApp Automation Service using wapilot API
 * خدمة إرسال رسائل WhatsApp تلقائية مع النص بالعربية والإنجليزية معاً
 */

// 🔥 إجبار PRODUCTION إذا كان هناك Token
const FORCE_PRODUCTION = true;

class WapilotService {
  constructor() {
    console.log("🔍 WhatsApp Service Initialization:");
    console.log("- NODE_ENV:", process.env.NODE_ENV);
    console.log(
      "- WHATSAPP_API_TOKEN exists:",
      !!process.env.WHATSAPP_API_TOKEN
    );
    console.log("- WHATSAPP_INSTANCE_ID:", process.env.WHATSAPP_INSTANCE_ID);
    console.log("- WHATSAPP_API_URL:", process.env.WHATSAPP_API_URL);

    this.baseURL =
      process.env.WHATSAPP_API_URL || "https://api.wapilot.net/api/v2";
    this.apiToken = process.env.WHATSAPP_API_TOKEN;
    this.instanceId = process.env.WHATSAPP_INSTANCE_ID;

    // 🔥 الحل: اجبر PRODUCTION إذا كان هناك Token
    this.isEnabled = !!this.apiToken && !!this.instanceId;

    // 🔥 تحديد الوضع: PRODUCTION إذا كان هناك Token، وإلا SIMULATION
    this.mode =
      FORCE_PRODUCTION ||
      (this.isEnabled && process.env.NODE_ENV === "production")
        ? "PRODUCTION"
        : "SIMULATION";

    console.log("📱 Wapilot WhatsApp Service initialized:", {
      enabled: this.isEnabled,
      instance: this.instanceId ? "Configured" : "Not configured",
      mode: this.mode,
      tokenPreview: this.apiToken
        ? this.apiToken.substring(0, 10) + "..."
        : "No token",
      instanceId: this.instanceId,
    });
  }

  /**
   * إعداد رسالة الترحيب الأولى بالعربية والإنجليزية معاً
   */
  prepareFirstWelcomeMessage(studentName) {
    return `🎉 أهلاً وسهلاً بك في Code School! | Welcome to Code School!

مرحباً ${studentName} 👋 | Hello ${studentName} 👋

يسعدنا جداً انضمامك إلى مجتمع البرمجة لدينا! 🚀
We're thrilled to have you join our coding community! 🚀`;
  }

  /**
   * إعداد رسالة اختيار اللغة المفضلة
   */
  prepareLanguageSelectionMessage() {
    return `🌍 **اختر لغتك المفضلة | Choose Your Preferred Language:**

يرجى الرد برقم الخيار المفضل لديك:
Please reply with your preferred option number:

1. 🇸🇦 العربية (Arabic)
2. 🇺🇸 الإنجليزية (English)

سيتم تسجيل تفضيلك اللغوي تلقائياً في نظامنا.
Your language preference will be automatically recorded in our system.`;
  }

  /**
   * إعداد رسالة تأكيد اختيار اللغة
   */
  prepareLanguageConfirmationMessage(studentName, selectedLanguage) {
    if (selectedLanguage === "en") {
      return `✅ Language preference confirmed!\n\nDear ${studentName},\n\nYour language preference has been set to English.\n\nAll future communications will be in English.\n\nThank you for choosing Code School! 🚀\n\nBest regards,\nThe Code School Team 💻✨`;
    } else {
      return `✅ تم تأكيد تفضيل اللغة!\n\nعزيزي/عزيزتي ${studentName}،\n\nتم تعيين تفضيل لغتك إلى العربية.\n\nجميع المراسلات المستقبلية ستكون باللغة العربية.\n\nشكراً لاختيارك Code School! 🚀\n\nمع أطيب التحيات،\nفريق Code School 💻✨`;
    }
  }

  /**
   * تحضير رقم WhatsApp (مع إضافة كود الدولة)
   */
  preparePhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;

    try {
      // تنظيف الرقم من المسافات والأصفار الزائدة
      let cleanNumber = phoneNumber
        .toString()
        .replace(/\s+/g, "")
        .replace(/^0+/, "");

      // إضافة كود الدولة المصري إذا لم يكن موجوداً
      if (!cleanNumber.startsWith("+")) {
        // إذا كان الرقم يبدأ بـ 1 (مصري بدون +20)
        if (cleanNumber.startsWith("1") && cleanNumber.length >= 10) {
          cleanNumber = "+20" + cleanNumber;
        } else if (cleanNumber.startsWith("01")) {
          // إذا كان الرقم يبدأ بـ 01 (التنسيق المصري الشائع)
          cleanNumber = "+20" + cleanNumber.substring(1);
        } else if (cleanNumber.length >= 10) {
          // افتراض أنه رقم مصري وإضافة +20
          cleanNumber = "+20" + cleanNumber;
        } else {
          // إذا كان الرقم قصيراً، إضافة +20 وإزالة أي أصفار في البداية
          cleanNumber = "+20" + cleanNumber.replace(/^0+/, "");
        }
      }

      // التحقق من صحة الرقم النهائي
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

  /**
   * إرسال رسالة عبر wapilot API
   */
  async sendMessageViaWapilot(phoneNumber, messageText) {
    try {
      // 🔥 التحقق من Token و Instance
      if (!this.apiToken || !this.instanceId) {
        throw new Error("WhatsApp API Token or Instance ID not configured");
      }

      const apiUrl = `${this.baseURL}/${this.instanceId}/send-message`;

      console.log("📤 SENDING REAL WHATSAPP MESSAGE:", {
        url: apiUrl,
        to: phoneNumber,
        instance: this.instanceId,
        tokenPreview: this.apiToken.substring(0, 10) + "...",
        messageLength: messageText.length,
      });

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: this.apiToken,
        },
        body: JSON.stringify({
          chat_id: phoneNumber.replace("+", ""), // wapilot يتطلب الرقم بدون +
          text: messageText,
          priority: 0, // أولوية عادية
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("❌ wapilot API error:", result);
        throw new Error(`WhatsApp API error: ${JSON.stringify(result)}`);
      }

      console.log("✅ WhatsApp message sent successfully via wapilot:", {
        messageId: result.id,
        status: "sent",
        to: phoneNumber,
        mode: "PRODUCTION",
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
   * محاكاة إرسال الرسالة (للاختبار والتطوير)
   */
  async simulateSendMessage(phoneNumber, messageText) {
    console.log("🔧 SIMULATION: Sending WhatsApp message");

    // محاكاة تأخير الشبكة
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const simulatedResponse = {
      success: true,
      simulated: true,
      messageId: `sim-${Date.now()}`,
      sentVia: "simulation",
      timestamp: new Date(),
      debug: {
        to: phoneNumber,
        messageLength: messageText.length,
        hasArabic: messageText.includes("أهلاً"),
        hasEnglish: messageText.includes("Welcome"),
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
   * إرسال رسائل الترحيب الثلاثة (ترحيب + اختيار اللغة)
   */
  async sendWelcomeMessages(studentName, phoneNumber) {
    try {
      console.log("🎯 WhatsApp automation for student:", {
        name: studentName,
        whatsappNumber: phoneNumber,
        mode: this.mode,
      });

      // التحقق من وجود رقم WhatsApp
      if (!phoneNumber) {
        console.log("⚠️ WhatsApp number not provided, skipping...");
        return {
          success: false,
          skipped: true,
          reason: "WhatsApp number not provided",
        };
      }

      // تحضير الرقم
      const preparedNumber = this.preparePhoneNumber(phoneNumber);
      if (!preparedNumber) {
        console.error("❌ Could not prepare WhatsApp number");
        return {
          success: false,
          reason: "Invalid WhatsApp number format",
        };
      }

      // إعداد الرسالة الأولى (ترحيب)
      const firstMessage = this.prepareFirstWelcomeMessage(studentName);

      // إعداد الرسالة الثانية (اختيار اللغة)
      const secondMessage = this.prepareLanguageSelectionMessage();

      console.log("📝 Prepared dual-language welcome messages:", {
        to: preparedNumber,
        studentName: studentName,
        firstMessageLength: firstMessage.length,
        secondMessageLength: secondMessage.length,
        mode: this.mode,
      });

      // 🔥 إرسال الرسالتين بناءً على الوضع
      let firstResult, secondResult;

      if (this.mode === "PRODUCTION") {
        console.log("🚀 SENDING REAL MESSAGES (PRODUCTION MODE)");

        // إرسال الرسالة الأولى
        firstResult = await this.sendMessageViaWapilot(
          preparedNumber,
          firstMessage
        );

        // انتظار 2 ثانية ثم إرسال الرسالة الثانية
        await new Promise((resolve) => setTimeout(resolve, 2000));
        secondResult = await this.sendMessageViaWapilot(
          preparedNumber,
          secondMessage
        );
      } else {
        console.log("🔧 SIMULATING MESSAGES (SIMULATION MODE)");

        // محاكاة إرسال الرسالة الأولى
        firstResult = await this.simulateSendMessage(
          preparedNumber,
          firstMessage
        );

        // محاكاة إرسال الرسالة الثانية بعد تأخير
        await new Promise((resolve) => setTimeout(resolve, 2000));
        secondResult = await this.simulateSendMessage(
          preparedNumber,
          secondMessage
        );
      }

      // تسجيل النجاح
      await this.logMessage({
        status: "sent",
        messageId: secondResult.messageId,
        recipient: preparedNumber,
        studentName: studentName,
        messagesSent: 2,
        firstMessagePreview: firstMessage.substring(0, 50) + "...",
        secondMessagePreview: secondMessage.substring(0, 50) + "...",
        simulated: secondResult.simulated || false,
        mode: this.mode,
        timestamp: new Date(),
      });

      return {
        success: true,
        messages: [
          { type: "welcome", result: firstResult },
          { type: "language_selection", result: secondResult },
        ],
        studentName: studentName,
        whatsappNumber: preparedNumber,
        mode: this.mode,
        totalMessages: 2,
      };
    } catch (error) {
      console.error("❌ Error in sendWelcomeMessages:", error);

      // تسجيل الخطأ
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

  /**
   * إرسال رسالة تأكيد اللغة
   */
  async sendLanguageConfirmationMessage(
    phoneNumber,
    studentName,
    selectedLanguage
  ) {
    try {
      console.log("📱 Sending language confirmation on SERVER:", {
        phoneNumber,
        studentName,
        selectedLanguage,
        mode: this.mode,
      });

      // تأكد من أن الرقم بصيغة +20
      let preparedNumber = phoneNumber;
      if (!preparedNumber.startsWith("+")) {
        preparedNumber = `+${preparedNumber}`;
      }

      if (!preparedNumber.startsWith("+20")) {
        preparedNumber = `+20${preparedNumber.replace(/^\+/, "")}`;
      }

      // رسالة التأكيد
      let messageText;
      if (selectedLanguage === "en") {
        messageText = `✅ Language preference confirmed!\n\nDear ${studentName},\n\nYour language preference has been set to English.\n\nAll future communications will be in English.\n\nThank you for choosing Code School! 🚀\n\nBest regards,\nThe Code School Team 💻✨`;
      } else {
        messageText = `✅ تم تأكيد تفضيل اللغة!\n\nعزيزي/عزيزتي ${studentName}،\n\nتم تعيين تفضيل لغتك إلى العربية.\n\nجميع المراسلات المستقبلية ستكون باللغة العربية.\n\nشكراً لاختيارك Code School! 🚀\n\nمع أطيب التحيات،\nفريق Code School 💻✨`;
      }

      console.log("📝 Message prepared:", {
        to: preparedNumber,
        length: messageText.length,
      });

      // الإرسال الفعلي
      let sendResult;
      if (this.mode === "PRODUCTION" && this.apiToken && this.instanceId) {
        console.log("🚀 SENDING REAL MESSAGE TO:", preparedNumber);

        const apiUrl = `${this.baseURL}/${this.instanceId}/send-message`;

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            token: this.apiToken,
          },
          body: JSON.stringify({
            chat_id: preparedNumber.replace("+", ""),
            text: messageText,
            priority: 0,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(`WhatsApp API error: ${JSON.stringify(result)}`);
        }

        sendResult = {
          success: true,
          messageId: result.id,
          simulated: false,
        };
      } else {
        console.log("🔧 SIMULATION MODE (not sending real message)");
        sendResult = {
          success: true,
          messageId: `sim-${Date.now()}`,
          simulated: true,
        };
      }

      return sendResult;
    } catch (error) {
      console.error("❌ Error sending confirmation:", error);
      throw error;
    }
  }

  /**
   * تسجيل محاولات الإرسال
   */
  async logMessage(logData) {
    try {
      const logEntry = {
        ...logData,
        service: "wapilot-whatsapp",
        environment: this.mode,
        timestamp: new Date().toISOString(),
      };

      console.log("📝 WhatsApp Log:", {
        status: logEntry.status,
        recipient: logEntry.recipient,
        studentName: logEntry.studentName,
        simulated: logEntry.simulated || false,
        mode: this.mode,
        timestamp: logEntry.timestamp,
      });

      return logEntry;
    } catch (error) {
      console.error("❌ Error logging message:", error);
    }
  }

  /**
   * التحقق من تكوين الخدمة
   */
  async getServiceStatus() {
    const serviceStatus = {
      enabled: this.isEnabled,
      configured: !!this.apiToken && !!this.instanceId,
      instanceId: this.instanceId,
      apiToken: this.apiToken ? "***" + this.apiToken.slice(-4) : "Not set",
      mode: this.mode,
      lastChecked: new Date(),
      features: [
        "dual-language",
        "language-selection",
        "language-confirmation",
        "auto-format-numbers",
        "simulation-mode",
        "production-mode",
      ],
    };

    return serviceStatus;
  }

  /**
   * معالجة رد الطالب على اختيار اللغة
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

      // استيراد النماذج والمكتبات المطلوبة
      const { connectDB } = await import("@/lib/mongodb");
      const Student = (await import("@/models/Student")).default;

      await connectDB();

      // البحث عن الطالب برقم WhatsApp
      const student = await Student.findOne({
        "personalInfo.whatsappNumber": {
          $regex: preparedNumber.replace("+", ""),
          $options: "i",
        },
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

      const selectedLanguage = response === "1" ? "ar" : "en";
      const studentName = student.personalInfo.fullName;

      console.log("📊 Processing for student:", {
        studentId: student._id,
        studentName,
        currentLanguage: student.communicationPreferences?.preferredLanguage,
        newLanguage: selectedLanguage,
        response,
      });

      // 1. تحديث قاعدة البيانات
      const updateResult = await Student.findByIdAndUpdate(
        student._id,
        {
          $set: {
            "communicationPreferences.preferredLanguage": selectedLanguage,
            "metadata.updatedAt": new Date(),
            "metadata.whatsappLanguageSelected": true,
            "metadata.whatsappLanguageSelection": response,
            "metadata.whatsappLanguageSelectedAt": new Date(),
            "metadata.whatsappLanguageConfirmed": true,
            "metadata.whatsappLanguageConfirmationAt": new Date(),
            "metadata.whatsappConfirmationSent": false,
          },
        },
        { new: true }
      );

      console.log("✅ Database updated successfully:", {
        studentId: student._id,
        oldLanguage: student.communicationPreferences?.preferredLanguage,
        newLanguage: selectedLanguage,
        updatedAt: new Date(),
      });

      // 2. إرسال رسالة تأكيد
      const confirmationResult = await this.sendLanguageConfirmationMessage(
        phoneNumber,
        studentName,
        selectedLanguage
      );

      // 3. تحديث قاعدة البيانات بإرسال التأكيد
      if (confirmationResult.success) {
        await Student.findByIdAndUpdate(student._id, {
          $set: {
            "metadata.whatsappConfirmationSent": true,
            "metadata.whatsappConfirmationSentAt": new Date(),
            "metadata.whatsappMessagesCount": 3,
          },
        });
      }

      return {
        success: true,
        studentId: student._id,
        studentName,
        selectedLanguage,
        response,
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
}

// تصدير نسخة واحدة من الخدمة (Singleton)
export const wapilotService = new WapilotService();
export default wapilotService;
