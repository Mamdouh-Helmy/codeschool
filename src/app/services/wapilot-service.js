/**
 * WhatsApp Automation Service using wapilot API
 * خدمة إرسال رسائل WhatsApp تلقائية مع النص بالعربية والإنجليزية معاً
 */

// 🔥 إجبار PRODUCTION إذا كان هناك Token
const FORCE_PRODUCTION = true;

class WapilotService {
  constructor() {
    console.log('🔍 DEBUG ENV VARIABLES:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- WHATSAPP_API_TOKEN exists:', !!process.env.WHATSAPP_API_TOKEN);
    console.log('- WHATSAPP_INSTANCE_ID:', process.env.WHATSAPP_INSTANCE_ID);
    console.log('- WHATSAPP_API_URL:', process.env.WHATSAPP_API_URL);
    
    this.baseURL = process.env.WHATSAPP_API_URL || 'https://api.wapilot.net/api/v2';
    this.apiToken = process.env.WHATSAPP_API_TOKEN;
    this.instanceId = process.env.WHATSAPP_INSTANCE_ID;
    
    // 🔥 الحل: اجبر PRODUCTION إذا كان هناك Token
    this.isEnabled = !!this.apiToken && !!this.instanceId;
    
    // 🔥 تحديد الوضع: PRODUCTION إذا كان هناك Token، وإلا SIMULATION
    this.mode = (FORCE_PRODUCTION || (this.isEnabled && process.env.NODE_ENV === 'production')) 
      ? 'PRODUCTION' 
      : 'SIMULATION';
    
    console.log('📱 Wapilot WhatsApp Service initialized:', {
      enabled: this.isEnabled,
      instance: this.instanceId ? 'Configured' : 'Not configured',
      mode: this.mode,
      tokenPreview: this.apiToken ? this.apiToken.substring(0, 10) + '...' : 'No token',
      instanceId: this.instanceId
    });
  }

  /**
   * إعداد رسالة الترحيب بالعربية والإنجليزية معاً
   */
  prepareWelcomeMessage(student) {
    const enrollmentDate = new Date().toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const englishDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `🎉 أهلاً وسهلاً بك في Code School! | Welcome to Code School!

مرحباً ${student.personalInfo.fullName} 👋 | Hello ${student.personalInfo.fullName} 👋

يسعدنا جداً انضمامك إلى مجتمع البرمجة لدينا! 🚀
We're thrilled to have you join our coding community! 🚀

🎯 **معلومات تسجيلك | Your Enrollment Info:**
• رقم التسجيل | Enrollment Number: ${student.enrollmentNumber}
• تاريخ التسجيل | Enrollment Date: ${enrollmentDate} | ${englishDate}
• المستوى | Level: ${student.academicInfo?.level || 'Beginner'}

📞 **للتواصل معنا | Contact Us:**
يمكنك التواصل مع فريق الدعم عبر واتساب هذا الرقم للرد على استفساراتك.
You can reach our support team via WhatsApp for any inquiries.

💻 **ما يمكنك توقعه | What to Expect:**
1. مواد تعليمية متكاملة | Comprehensive learning materials
2. مشاريع عملية حقيقية | Real-world practical projects
3. متابعة مستمرة من المدربين | Continuous guidance from instructors
4. شهادة معتمدة بعد الإنهاء | Accredited certificate upon completion

نتمنى لك رحلة تعلم ممتعة ومليئة بالإنجازات! 🌟
Wishing you an exciting and rewarding learning journey! 🌟

مع أطيب التحيات، | Best regards,
فريق Code School 💻✨ | The Code School Team 💻✨`;
  }

  /**
   * إعداد رسالة ترحيب مخصصة (بدون إنشاء طالب)
   */
  prepareCustomWelcomeMessage(studentName, language = 'ar') {
    const currentDate = new Date();
    
    if (language === 'en') {
      const englishDate = currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      return `🎉 Welcome to Code School!\n\nHello ${studentName} 👋\n\nWe're thrilled to have you join our coding community! 🚀\n\n📅 Welcome Date: ${englishDate}\n\n💻 What to Expect:\n• Comprehensive learning materials\n• Real-world practical projects\n• Continuous guidance from instructors\n• Accredited certificate upon completion\n\n📞 Contact our support team via WhatsApp for any inquiries.\n\nWishing you an exciting and rewarding learning journey! 🌟\n\nBest regards,\nThe Code School Team 💻✨`;
    } else {
      const arabicDate = currentDate.toLocaleDateString('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      return `🎉 أهلاً وسهلاً بك في Code School!\n\nمرحباً ${studentName} 👋\n\nيسعدنا جداً انضمامك إلى مجتمع البرمجة لدينا! 🚀\n\n📅 تاريخ الترحيب: ${arabicDate}\n\n💻 ما يمكنك توقعه:\n• مواد تعليمية متكاملة\n• مشاريع عملية حقيقية\n• متابعة مستمرة من المدربين\n• شهادة معتمدة بعد الإنهاء\n\n📞 يمكنك التواصل مع فريق الدعم عبر واتساب للرد على استفساراتك.\n\nنتمنى لك رحلة تعلم ممتعة ومليئة بالإنجازات! 🌟\n\nمع أطيب التحيات،\nفريق Code School 💻✨`;
    }
  }

  /**
   * تحضير رقم WhatsApp (مع إضافة كود الدولة)
   */
  preparePhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;

    try {
      // تنظيف الرقم من المسافات والأصفار الزائدة
      let cleanNumber = phoneNumber.toString().replace(/\s+/g, '').replace(/^0+/, '');

      // إضافة كود الدولة المصري إذا لم يكن موجوداً
      if (!cleanNumber.startsWith('+')) {
        // إذا كان الرقم يبدأ بـ 1 (مصري بدون +20)
        if (cleanNumber.startsWith('1') && cleanNumber.length >= 10) {
          cleanNumber = '+20' + cleanNumber;
        } else if (cleanNumber.startsWith('01')) {
          // إذا كان الرقم يبدأ بـ 01 (التنسيق المصري الشائع)
          cleanNumber = '+20' + cleanNumber.substring(1);
        } else if (cleanNumber.length >= 10) {
          // افتراض أنه رقم مصري وإضافة +20
          cleanNumber = '+20' + cleanNumber;
        } else {
          // إذا كان الرقم قصيراً، إضافة +20 وإزالة أي أصفار في البداية
          cleanNumber = '+20' + cleanNumber.replace(/^0+/, '');
        }
      }

      // التحقق من صحة الرقم النهائي
      const whatsappRegex = /^\+[1-9]\d{1,14}$/;
      if (!whatsappRegex.test(cleanNumber)) {
        console.error('❌ Invalid WhatsApp number format:', cleanNumber);
        return null;
      }

      return cleanNumber;
    } catch (error) {
      console.error('❌ Error preparing phone number:', error);
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
        throw new Error('WhatsApp API Token or Instance ID not configured');
      }

      const apiUrl = `${this.baseURL}/${this.instanceId}/send-message`;
      
      console.log('📤 SENDING REAL WHATSAPP MESSAGE:', {
        url: apiUrl,
        to: phoneNumber,
        instance: this.instanceId,
        tokenPreview: this.apiToken.substring(0, 10) + '...',
        messageLength: messageText.length
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': this.apiToken
        },
        body: JSON.stringify({
          chat_id: phoneNumber.replace('+', ''), // wapilot يتطلب الرقم بدون +
          text: messageText,
          priority: 0 // أولوية عادية
        })
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ wapilot API error:', result);
        throw new Error(`WhatsApp API error: ${JSON.stringify(result)}`);
      }

      console.log('✅ WhatsApp message sent successfully via wapilot:', {
        messageId: result.id,
        status: 'sent',
        to: phoneNumber,
        mode: 'PRODUCTION'
      });

      return {
        success: true,
        messageId: result.id,
        data: result,
        sentVia: 'wapilot',
        simulated: false,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('❌ wapilot API error:', error);
      throw error;
    }
  }

  /**
   * محاكاة إرسال الرسالة (للاختبار والتطوير)
   */
  async simulateSendMessage(phoneNumber, messageText) {
    console.log('🔧 SIMULATION: Sending WhatsApp message');
    
    // محاكاة تأخير الشبكة
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const simulatedResponse = {
      success: true,
      simulated: true,
      messageId: `sim-${Date.now()}`,
      sentVia: 'simulation',
      timestamp: new Date(),
      debug: {
        to: phoneNumber,
        messageLength: messageText.length,
        hasArabic: messageText.includes('أهلاً'),
        hasEnglish: messageText.includes('Welcome'),
        timestamp: new Date().toISOString()
      }
    };

    console.log('✅ SIMULATION: Message sent successfully', simulatedResponse.debug);
    
    return simulatedResponse;
  }

  /**
   * إرسال رسالة ترحيب للطالب الجديد
   */
  async sendWelcomeMessage(student) {
    try {
      console.log('🎯 WhatsApp automation for student:', {
        enrollmentNumber: student.enrollmentNumber,
        name: student.personalInfo?.fullName,
        whatsappNumber: student.personalInfo?.whatsappNumber,
        mode: this.mode
      });

      // التحقق الأساسي
      if (!student) {
        throw new Error('Student data is required');
      }

      // التحقق من وجود رقم WhatsApp
      if (!student.personalInfo?.whatsappNumber) {
        console.log('⚠️ WhatsApp number not provided, skipping...');
        return {
          success: false,
          skipped: true,
          reason: 'WhatsApp number not provided'
        };
      }

      // تحضير الرقم
      const preparedNumber = this.preparePhoneNumber(student.personalInfo.whatsappNumber);
      if (!preparedNumber) {
        console.error('❌ Could not prepare WhatsApp number');
        return {
          success: false,
          reason: 'Invalid WhatsApp number format'
        };
      }

      // إعداد الرسالة (عربي + إنجليزي معاً)
      const messageText = this.prepareWelcomeMessage(student);
      
      console.log('📝 Prepared dual-language message:', {
        to: preparedNumber,
        length: messageText.length,
        preview: messageText.substring(0, 150) + '...',
        mode: this.mode
      });

      // 🔥 إرسال الرسالة بناءً على الوضع
      let sendResult;
      if (this.mode === 'PRODUCTION') {
        console.log('🚀 SENDING REAL MESSAGE (PRODUCTION MODE)');
        sendResult = await this.sendMessageViaWapilot(preparedNumber, messageText);
      } else {
        console.log('🔧 SIMULATING MESSAGE (SIMULATION MODE)');
        sendResult = await this.simulateSendMessage(preparedNumber, messageText);
      }

      // تسجيل النجاح
      await this.logMessage({
        status: 'sent',
        messageId: sendResult.messageId,
        recipient: preparedNumber,
        studentName: student.personalInfo.fullName,
        enrollmentNumber: student.enrollmentNumber,
        dualLanguage: true,
        simulated: sendResult.simulated || false,
        mode: this.mode,
        timestamp: new Date()
      });

      return {
        ...sendResult,
        studentId: student._id,
        enrollmentNumber: student.enrollmentNumber,
        studentName: student.personalInfo.fullName,
        whatsappNumber: preparedNumber,
        mode: this.mode,
        messagePreview: messageText.substring(0, 150) + '...'
      };

    } catch (error) {
      console.error('❌ Error in sendWelcomeMessage:', error);
      
      // تسجيل الخطأ
      await this.logMessage({
        status: 'error',
        recipient: student?.personalInfo?.whatsappNumber,
        error: error.message,
        studentId: student?._id,
        enrollmentNumber: student?.enrollmentNumber,
        mode: this.mode,
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * إرسال رسالة ترحيب مخصصة (بدون إنشاء طالب)
   */
  async sendCustomWelcomeMessage(phoneNumber, studentName, language = 'ar') {
    try {
      console.log('🎯 Sending custom welcome message:', {
        phoneNumber,
        studentName,
        language,
        mode: this.mode
      });

      // تحضير الرقم
      const preparedNumber = this.preparePhoneNumber(phoneNumber);
      if (!preparedNumber) {
        throw new Error('Invalid phone number format');
      }

      // إعداد الرسالة بناءً على اللغة
      const messageText = this.prepareCustomWelcomeMessage(studentName, language);

      console.log('📝 Prepared message:', {
        length: messageText.length,
        preview: messageText.substring(0, 150) + '...',
        mode: this.mode
      });

      // 🔥 إرسال الرسالة بناءً على الوضع
      let sendResult;
      if (this.mode === 'PRODUCTION') {
        sendResult = await this.sendMessageViaWapilot(preparedNumber, messageText);
      } else {
        sendResult = await this.simulateSendMessage(preparedNumber, messageText);
      }

      // تسجيل النجاح
      await this.logMessage({
        status: 'sent',
        messageId: sendResult.messageId,
        recipient: preparedNumber,
        studentName: studentName,
        language: language,
        simulated: sendResult.simulated || false,
        mode: this.mode,
        timestamp: new Date()
      });

      return {
        ...sendResult,
        studentName,
        whatsappNumber: preparedNumber,
        language,
        mode: this.mode,
        messagePreview: messageText.substring(0, 150) + '...'
      };

    } catch (error) {
      console.error('❌ Error in sendCustomWelcomeMessage:', error);
      
      // تسجيل الخطأ
      await this.logMessage({
        status: 'error',
        recipient: phoneNumber,
        error: error.message,
        mode: this.mode,
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * إرسال رسالة مخصصة
   */
  async sendCustomMessage(phoneNumber, messageText) {
    try {
      const preparedNumber = this.preparePhoneNumber(phoneNumber);
      if (!preparedNumber) {
        throw new Error('Invalid phone number format');
      }

      let sendResult;
      if (this.mode === 'PRODUCTION') {
        sendResult = await this.sendMessageViaWapilot(preparedNumber, messageText);
      } else {
        sendResult = await this.simulateSendMessage(preparedNumber, messageText);
      }

      return sendResult;
    } catch (error) {
      console.error('❌ Error sending custom message:', error);
      throw error;
    }
  }

  /**
   * التحقق من حالة الخدمة
   */
  async checkServiceStatus() {
    try {
      if (!this.isEnabled) {
        return {
          enabled: false,
          status: 'NOT_CONFIGURED',
          message: 'Service not configured. Check environment variables.',
          timestamp: new Date()
        };
      }

      // محاولة جلب حالة الـ instance
      const statusUrl = `${this.baseURL}/instances/${this.instanceId}/status`;
      
      const response = await fetch(statusUrl, {
        headers: {
          'token': this.apiToken
        }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          enabled: true,
          status: 'ACTIVE',
          instanceStatus: data,
          timestamp: new Date()
        };
      } else {
        return {
          enabled: false,
          status: 'ERROR',
          error: `API returned ${response.status}`,
          timestamp: new Date()
        };
      }
    } catch (error) {
      return {
        enabled: false,
        status: 'ERROR',
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * تسجيل محاولات الإرسال
   */
  async logMessage(logData) {
    try {
      const logEntry = {
        ...logData,
        service: 'wapilot-whatsapp',
        environment: this.mode,
        timestamp: new Date().toISOString()
      };

      console.log('📝 WhatsApp Log:', {
        status: logEntry.status,
        recipient: logEntry.recipient,
        studentName: logEntry.studentName,
        simulated: logEntry.simulated || false,
        mode: this.mode,
        timestamp: logEntry.timestamp
      });
      
      return logEntry;
    } catch (error) {
      console.error('❌ Error logging message:', error);
    }
  }

  /**
   * التحقق من تكوين الخدمة
   */
  async getServiceStatus() {
    const serviceStatus = await this.checkServiceStatus();
    
    return {
      enabled: this.isEnabled,
      configured: !!this.apiToken && !!this.instanceId,
      instanceId: this.instanceId,
      apiToken: this.apiToken ? '***' + this.apiToken.slice(-4) : 'Not set',
      mode: this.mode,
      serviceStatus: serviceStatus,
      lastChecked: new Date(),
      features: ['dual-language', 'auto-format-numbers', 'simulation-mode', 'production-mode']
    };
  }

  /**
   * 🔥 اختبار مباشر للخدمة
   */
  async directTest(phoneNumber, message = 'Test from Code School WhatsApp Service') {
    try {
      console.log('🧪 DIRECT TEST:', {
        phoneNumber,
        mode: this.mode,
        hasToken: !!this.apiToken,
        hasInstance: !!this.instanceId
      });

      const preparedNumber = this.preparePhoneNumber(phoneNumber);
      if (!preparedNumber) {
        throw new Error('Invalid phone number');
      }

      let result;
      if (this.mode === 'PRODUCTION') {
        result = await this.sendMessageViaWapilot(preparedNumber, message);
      } else {
        result = await this.simulateSendMessage(preparedNumber, message);
      }

      return {
        success: true,
        test: 'direct',
        result,
        mode: this.mode,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Direct test failed:', error);
      return {
        success: false,
        error: error.message,
        mode: this.mode
      };
    }
  }
}

// تصدير نسخة واحدة من الخدمة (Singleton)
export const wapilotService = new WapilotService();
export default wapilotService;