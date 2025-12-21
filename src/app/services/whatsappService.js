/**
 * WhatsApp Automation Service
 * خدمة حقيقية قابلة للتطوير مع إمكانية الاختبار
 */

class WhatsAppService {
  constructor() {
    this.isEnabled = process.env.WHATSAPP_API_KEY ? true : false;
    this.templateName = process.env.WHATSAPP_TEMPLATE_NAME || 'student_welcome';
    
    console.log('📱 WhatsApp Service initialized:', {
      enabled: this.isEnabled,
      template: this.templateName
    });
  }

  /**
   * إعداد رسالة الترحيب للطالب
   */
  prepareWelcomeMessage(student) {
    if (!student) {
      throw new Error('Student data is required');
    }

    const messageData = {
      messaging_product: 'whatsapp',
      to: student.personalInfo.whatsappNumber,
      type: 'template',
      template: {
        name: this.templateName,
        language: {
          code: student.communicationPreferences?.preferredLanguage || 'ar'
        },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: student.personalInfo.fullName },
              { type: 'text', text: student.enrollmentNumber },
              { type: 'text', text: new Date().toLocaleDateString('ar-SA') }
            ]
          }
        ]
      }
    };

    console.log('📝 Prepared WhatsApp message:', {
      to: messageData.to,
      studentName: student.personalInfo.fullName,
      enrollmentNumber: student.enrollmentNumber
    });

    return messageData;
  }

  /**
   * إعداد رسالة تحديث البيانات
   */
  prepareUpdateMessage(student) {
    if (!student) {
      throw new Error('Student data is required');
    }

    const messageData = {
      messaging_product: 'whatsapp',
      to: student.personalInfo.whatsappNumber,
      type: 'template',
      template: {
        name: 'student_update',
        language: {
          code: student.communicationPreferences?.preferredLanguage || 'ar'
        },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: student.personalInfo.fullName },
              { type: 'text', text: 'تم تحديث بياناتك بنجاح في النظام' },
              { type: 'text', text: new Date().toLocaleDateString('ar-SA') }
            ]
          }
        ]
      }
    };

    console.log('📝 Prepared WhatsApp update message:', {
      to: messageData.to,
      studentName: student.personalInfo.fullName
    });

    return messageData;
  }

  /**
   * إعداد رسالة حذف الحساب
   */
  prepareDeletionMessage(student) {
    if (!student) {
      throw new Error('Student data is required');
    }

    const messageData = {
      messaging_product: 'whatsapp',
      to: student.personalInfo.whatsappNumber,
      type: 'template',
      template: {
        name: 'student_deletion',
        language: {
          code: student.communicationPreferences?.preferredLanguage || 'ar'
        },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: student.personalInfo.fullName },
              { type: 'text', text: student.enrollmentNumber },
              { type: 'text', text: 'تم تعليق حسابك في النظام' }
            ]
          }
        ]
      }
    };

    console.log('📝 Prepared WhatsApp deletion message:', {
      to: messageData.to,
      studentName: student.personalInfo.fullName,
      enrollmentNumber: student.enrollmentNumber
    });

    return messageData;
  }

  /**
   * إرسال رسالة عبر WhatsApp API الحقيقي
   */
  async sendMessage(messageData) {
    try {
      if (!this.isEnabled) {
        console.log('📵 WhatsApp API is not enabled - running in simulation mode');
        return this.simulateSendMessage(messageData);
      }

      const apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0';
      const apiKey = process.env.WHATSAPP_API_KEY;
      
      if (!apiKey) {
        throw new Error('WhatsApp API key is not configured');
      }

      const response = await fetch(`${apiUrl}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${JSON.stringify(result)}`);
      }

      console.log('✅ WhatsApp message sent successfully:', result);
      
      // تسجيل النجاح
      await this.logMessage({
        status: 'sent',
        messageId: result.messages?.[0]?.id,
        recipient: messageData.to,
        studentName: messageData.template.components[0].parameters[0].text,
        timestamp: new Date()
      });

      return {
        success: true,
        messageId: result.messages?.[0]?.id,
        data: result
      };

    } catch (error) {
      console.error('❌ WhatsApp API error:', error);
      
      // تسجيل الفشل
      await this.logMessage({
        status: 'failed',
        recipient: messageData.to,
        error: error.message,
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * محاكاة إرسال الرسالة (للاختبار والتطوير)
   */
  async simulateSendMessage(messageData) {
    console.log('🔧 SIMULATION: Sending WhatsApp message');
    
    // محاكاة تأخير الشبكة
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const simulatedResponse = {
      success: true,
      simulated: true,
      messageId: `sim-${Date.now()}`,
      data: {
        messaging_product: 'whatsapp',
        contacts: [{ input: messageData.to, wa_id: messageData.to }],
        messages: [{ id: `wamid.${Date.now()}` }]
      },
      debug: {
        templateUsed: messageData.template.name,
        studentName: messageData.template.components[0].parameters[0].text,
        enrollmentNumber: messageData.template.components[1]?.text || 'N/A',
        timestamp: new Date().toISOString()
      }
    };

    console.log('✅ SIMULATION: Message sent successfully', simulatedResponse.debug);
    
    // تسجيل المحاكاة
    await this.logMessage({
      status: 'simulated',
      messageId: simulatedResponse.messageId,
      recipient: messageData.to,
      studentName: messageData.template.components[0].parameters[0].text,
      simulated: true,
      timestamp: new Date()
    });

    return simulatedResponse;
  }

  /**
   * إرسال رسالة ترحيب للطالب الجديد
   */
  async sendWelcomeMessage(student) {
    try {
      console.log('🎯 Starting WhatsApp welcome for student:', {
        enrollmentNumber: student.enrollmentNumber,
        whatsappNumber: student.personalInfo?.whatsappNumber,
        name: student.personalInfo?.fullName
      });

      // التحقق الأساسي
      if (!student) {
        throw new Error('Student data is required');
      }

      if (!student.personalInfo?.whatsappNumber) {
        console.log('⚠️ WhatsApp number not provided, skipping...');
        return {
          success: false,
          skipped: true,
          reason: 'WhatsApp number not provided'
        };
      }

      // التحقق من تفضيلات التواصل
      const whatsappEnabled = student.communicationPreferences?.notificationChannels?.whatsapp;
      if (whatsappEnabled === false) {
        console.log('⚠️ WhatsApp notifications disabled by student preference');
        return {
          success: false,
          skipped: true,
          reason: 'WhatsApp notifications disabled in preferences'
        };
      }

      // إعداد الرسالة
      const messageData = this.prepareWelcomeMessage(student);
      
      // إرسال الرسالة
      const result = await this.sendMessage(messageData);
      
      return {
        ...result,
        studentId: student._id,
        enrollmentNumber: student.enrollmentNumber,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('❌ Error in sendWelcomeMessage:', error);
      
      // تسجيل الخطأ
      await this.logMessage({
        status: 'error',
        recipient: student?.personalInfo?.whatsappNumber,
        error: error.message,
        studentId: student?._id,
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * إرسال إشعار تحديث البيانات
   */
  async sendUpdateNotification(student) {
    try {
      console.log('🔄 Starting WhatsApp update notification for student:', {
        enrollmentNumber: student.enrollmentNumber,
        name: student.personalInfo?.fullName
      });

      // التحقق الأساسي
      if (!student) {
        throw new Error('Student data is required');
      }

      if (!student.personalInfo?.whatsappNumber) {
        console.log('⚠️ WhatsApp number not provided, skipping update notification...');
        return {
          success: false,
          skipped: true,
          reason: 'WhatsApp number not provided'
        };
      }

      // التحقق من تفضيلات التواصل
      const whatsappEnabled = student.communicationPreferences?.notificationChannels?.whatsapp;
      if (whatsappEnabled === false) {
        console.log('⚠️ WhatsApp notifications disabled by student preference');
        return {
          success: false,
          skipped: true,
          reason: 'WhatsApp notifications disabled in preferences'
        };
      }

      // إعداد الرسالة
      const messageData = this.prepareUpdateMessage(student);
      
      // إرسال الرسالة
      const result = await this.sendMessage(messageData);
      
      return {
        ...result,
        studentId: student._id,
        enrollmentNumber: student.enrollmentNumber,
        type: 'update_notification',
        timestamp: new Date()
      };

    } catch (error) {
      console.error('❌ Error in sendUpdateNotification:', error);
      
      // تسجيل الخطأ
      await this.logMessage({
        status: 'error',
        recipient: student?.personalInfo?.whatsappNumber,
        error: error.message,
        studentId: student?._id,
        type: 'update_notification',
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * إرسال إشعار حذف الحساب
   */
  async sendDeletionNotification(student) {
    try {
      console.log('🗑️ Starting WhatsApp deletion notification for student:', {
        enrollmentNumber: student.enrollmentNumber,
        name: student.personalInfo?.fullName
      });

      // التحقق الأساسي
      if (!student) {
        throw new Error('Student data is required');
      }

      if (!student.personalInfo?.whatsappNumber) {
        console.log('⚠️ WhatsApp number not provided, skipping deletion notification...');
        return {
          success: false,
          skipped: true,
          reason: 'WhatsApp number not provided'
        };
      }

      // التحقق من تفضيلات التواصل
      const whatsappEnabled = student.communicationPreferences?.notificationChannels?.whatsapp;
      if (whatsappEnabled === false) {
        console.log('⚠️ WhatsApp notifications disabled by student preference');
        return {
          success: false,
          skipped: true,
          reason: 'WhatsApp notifications disabled in preferences'
        };
      }

      // إعداد الرسالة
      const messageData = this.prepareDeletionMessage(student);
      
      // إرسال الرسالة
      const result = await this.sendMessage(messageData);
      
      return {
        ...result,
        studentId: student._id,
        enrollmentNumber: student.enrollmentNumber,
        type: 'deletion_notification',
        timestamp: new Date()
      };

    } catch (error) {
      console.error('❌ Error in sendDeletionNotification:', error);
      
      // تسجيل الخطأ
      await this.logMessage({
        status: 'error',
        recipient: student?.personalInfo?.whatsappNumber,
        error: error.message,
        studentId: student?._id,
        type: 'deletion_notification',
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * تسجيل محاولات الإرسال (يمكن حفظها في MongoDB)
   */
  async logMessage(logData) {
    try {
      const logEntry = {
        ...logData,
        service: 'whatsapp',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      };

      // هنا يمكنك حفظ السجلات في MongoDB
      // await WhatsAppLog.create(logEntry);
      
      console.log('📝 WhatsApp Log:', JSON.stringify(logEntry, null, 2));
      
      return logEntry;
    } catch (error) {
      console.error('❌ Error logging message:', error);
      // لا ترمي خطأ تؤثر على العملية الرئيسية
    }
  }

  /**
   * التحقق من حالة الخدمة
   */
  async getServiceStatus() {
    return {
      enabled: this.isEnabled,
      lastChecked: new Date(),
      template: this.templateName,
      apiConfigured: !!process.env.WHATSAPP_API_KEY,
      templatesAvailable: ['student_welcome', 'student_update', 'student_deletion']
    };
  }
}

// تصدير نسخة واحدة من الخدمة (Singleton)
export const whatsappService = new WhatsAppService();
export default whatsappService;