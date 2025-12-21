import { NextResponse } from 'next/server';

// يمكنك استبدال هذه الدالة بخدمة الواتساب التي تستخدمها
async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    // هنا يمكنك استخدام أي خدمة WhatsApp مثل:
    // 1. Twilio
    // 2. WhatsApp Business API
    // 3. أي خدمة أخرى
    
    // مثال باستخدام Twilio (افتراضي)
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const twilioResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(
              `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
            ).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886'}`,
            To: `whatsapp:${phoneNumber}`,
            Body: message
          })
        }
      );
      
      return await twilioResponse.json();
    }
    
    // إذا لم يتم تكوين Twilio، نستخدم محاكاة للاختبار
    console.log('📱 Simulating WhatsApp message to:', phoneNumber);
    console.log('📝 Message:', message);
    
    return { 
      success: true, 
      sid: 'simulated_' + Date.now(),
      status: 'sent',
      message: 'Message simulated (configure WhatsApp service for real sending)'
    };
    
  } catch (error) {
    console.error('Error in WhatsApp service:', error);
    throw error;
  }
}

export async function POST(req) {
  try {
    const { phoneNumber, message, studentName, studentEmail, language } = await req.json();

    console.log('📱 WhatsApp API called with:', {
      phoneNumber,
      studentName,
      studentEmail,
      language,
      messageLength: message.length
    });

    // التحقق من البيانات المطلوبة
    if (!phoneNumber || !message) {
      return NextResponse.json({
        success: false,
        message: 'Phone number and message are required'
      }, { status: 400 });
    }

    // تنظيف وتنسيق رقم الهاتف
    const cleanPhoneNumber = phoneNumber.trim();
    
    // التحقق من صحة الرقم
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(cleanPhoneNumber)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid phone number format',
        providedNumber: cleanPhoneNumber,
        expectedFormat: 'International format starting with +'
      }, { status: 400 });
    }

    // إرسال الرسالة
    console.log('🚀 Sending WhatsApp message to:', cleanPhoneNumber);
    const result = await sendWhatsAppMessage(cleanPhoneNumber, message);

    // تسجيل النتيجة
    const logData = {
      timestamp: new Date().toISOString(),
      studentName,
      studentEmail,
      phoneNumber: cleanPhoneNumber,
      language,
      messageLength: message.length,
      result: result.success ? 'sent' : 'failed',
      details: result
    };

    console.log('📝 WhatsApp message log:', logData);

    if (result.success || result.sid) {
      return NextResponse.json({
        success: true,
        message: 'WhatsApp welcome message sent successfully',
        data: {
          studentName,
          phoneNumber: cleanPhoneNumber,
          language,
          timestamp: new Date().toISOString(),
          messagePreview: message.substring(0, 50) + '...',
          serviceResponse: result
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to send WhatsApp message',
        error: result.error || result.message || 'Unknown error',
        details: result
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error in WhatsApp API:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error while sending WhatsApp message',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'WhatsApp API is running',
    endpoints: {
      POST: '/api/whatsapp/send-welcome'
    },
    configuration: {
      hasTwilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      environment: process.env.NODE_ENV
    }
  });
}