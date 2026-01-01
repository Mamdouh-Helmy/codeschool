// app/api/whatsapp/webhook/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '../../../models/Student';
import { wapilotService } from '@/app/services/wapilot-service';

export async function POST(req) {
  try {
    console.log('📱 WhatsApp Webhook Received');
    
    // استقبل البيانات من wapilot
    const body = await req.json();
    console.log('📥 Raw webhook data:', JSON.stringify(body, null, 2));
    
    // البيانات الحقيقية من wapilot بتكون عادة بهذا الشكل:
    // {
    //   "from": "201159074994",
    //   "message": { "text": "1" },
    //   "timestamp": "2024-01-01T12:00:00Z"
    // }
    
    const phoneNumber = body.from; // بيكون الرقم بدون +
    const messageText = body.message?.text;
    
    console.log('🔍 Parsed data:', { phoneNumber, messageText });
    
    // تحقق إذا كانت الرسالة 1 أو 2
    if (messageText === '1' || messageText === '2') {
      console.log('🎯 Language selection detected:', messageText);
      
      await connectDB();
      
      // البحث عن الطالب - الرقم بيكون بدون + في wapilot
      const student = await Student.findOne({
        $or: [
          { 'personalInfo.whatsappNumber': { $regex: phoneNumber, $options: 'i' } },
          { 'personalInfo.whatsappNumber': { $regex: `+${phoneNumber}`, $options: 'i' } }
        ],
        isDeleted: false
      });
      
      if (student) {
        console.log('✅ Student found:', {
          id: student._id,
          name: student.personalInfo.fullName,
          currentLanguage: student.communicationPreferences?.preferredLanguage
        });
        
        // تحديث اللغة في قاعدة البيانات
        const newLanguage = messageText === '1' ? 'ar' : 'en';
        
        await Student.findByIdAndUpdate(student._id, {
          $set: {
            'communicationPreferences.preferredLanguage': newLanguage,
            'metadata.updatedAt': new Date(),
            'metadata.whatsappLanguageSelected': true,
            'metadata.whatsappLanguageSelection': messageText,
            'metadata.whatsappLanguageSelectedAt': new Date()
          }
        });
        
        console.log('✅ Language updated in database:', newLanguage);
        
        // إرسال رسالة تأكيد
        try {
          const phoneWithPlus = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
          
          const confirmationResult = await wapilotService.sendLanguageConfirmationMessage(
            phoneWithPlus,
            student.personalInfo.fullName,
            newLanguage
          );
          
          if (confirmationResult.success) {
            console.log('✅ Confirmation message sent successfully');
            
            // تحديث حالة التأكيد
            await Student.findByIdAndUpdate(student._id, {
              $set: {
                'metadata.whatsappConfirmationSent': true,
                'metadata.whatsappConfirmationSentAt': new Date(),
                'metadata.whatsappMessagesCount': 3
              }
            });
          }
          
        } catch (confirmationError) {
          console.error('❌ Error sending confirmation:', confirmationError);
        }
        
        return NextResponse.json({
          success: true,
          message: 'Language preference updated successfully',
          data: {
            studentId: student._id,
            studentName: student.personalInfo.fullName,
            selectedLanguage: newLanguage,
            timestamp: new Date()
          }
        });
        
      } else {
        console.log('⚠️ Student not found for phone:', phoneNumber);
        return NextResponse.json({
          success: false,
          message: 'Student not found'
        }, { status: 404 });
      }
    }
    
    // إذا كانت الرسالة ليست 1 أو 2
    console.log('📨 Non-language message:', messageText);
    return NextResponse.json({
      success: true,
      message: 'Message received (not a language selection)'
    });
    
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json({
      success: false,
      message: 'Webhook processing error',
      error: error.message
    }, { status: 500 });
  }
}

// GET للتحقق من أن webhook شغال
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'WhatsApp Webhook is active',
    endpoint: '/api/whatsapp/webhook',
    method: 'POST',
    supported_responses: ['1', '2'],
    description: 'Receives WhatsApp responses and updates language preference',
    timestamp: new Date().toISOString()
  });
}