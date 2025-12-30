import { NextResponse } from 'next/server';
import { wapilotService } from '@/app/services/wapilot-service';
import { requireAdmin } from '@/utils/authMiddleware';

export async function POST(req) {
  try {
    console.log('📱 WhatsApp welcome message endpoint called');
    
    // التحقق من صلاحية الأدمن
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      console.log('❌ Admin authorization failed for WhatsApp API');
      return authCheck.response;
    }

    const body = await req.json();
    const { phoneNumber, message, studentName, studentEmail, language } = body;

    // التحقق من البيانات
    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, message: 'Phone number is required' },
        { status: 400 }
      );
    }

    // التحقق من حالة الخدمة
    const serviceStatus = await wapilotService.getServiceStatus();
    console.log('🔍 WhatsApp service status:', serviceStatus);

    let result;
    
    if (studentName) {
      // إرسال رسالة ترحيب مخصصة
      result = await wapilotService.sendCustomWelcomeMessage(
        phoneNumber, 
        studentName, 
        language || 'ar'
      );
    } else if (message) {
      // إرسال رسالة نصية مخصصة
      result = await wapilotService.sendCustomMessage(phoneNumber, message);
    } else {
      return NextResponse.json(
        { success: false, message: 'Either message or studentName is required' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'WhatsApp message sent successfully',
      data: {
        studentName,
        studentEmail,
        phoneNumber,
        language,
        mode: serviceStatus.mode,
        messageId: result.messageId,
        sentAt: new Date().toISOString(),
        simulated: result.simulated || false
      }
    });

  } catch (error) {
    console.error('❌ Error in WhatsApp endpoint:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to send WhatsApp message',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// GET: التحقق من حالة الخدمة
export async function GET(req) {
  try {
    // التحقق من صلاحية الأدمن
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const status = await wapilotService.getServiceStatus();
    
    return NextResponse.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error checking service status:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to check service status' },
      { status: 500 }
    );
  }
}

// 🔥 POST: اختبار مباشر
export async function PUT(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const body = await req.json();
    const { phoneNumber, testMessage } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, message: 'Phone number required for test' },
        { status: 400 }
      );
    }

    const result = await wapilotService.directTest(
      phoneNumber, 
      testMessage || '🧪 Test message from Code School WhatsApp API'
    );

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Test completed successfully' : 'Test failed',
      data: result
    });
  } catch (error) {
    console.error('❌ Error in test endpoint:', error);
    return NextResponse.json(
      { success: false, message: 'Test failed', error: error.message },
      { status: 500 }
    );
  }
}