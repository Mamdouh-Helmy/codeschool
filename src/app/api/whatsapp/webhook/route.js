// app/api/whatsapp/webhook/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '../../../models/Student';
import { wapilotService } from '../../../services/wapilot-service';

export async function POST(req) {
  try {
    console.log('📱 WhatsApp Webhook Received');
    
    const body = await req.json();
    console.log('📥 Webhook data:', JSON.stringify(body, null, 2));
    
    // ✅ استخراج رقم الهاتف والرسالة من List Message
    const phoneNumber = body.from || body.sender || body.phone || body.chat_id;
    let messageText = '';
    let isListSelection = false;
    
    // ✅ معالجة List Message Response
    if (body.list_response) {
      // Wapilot يرسل list_response عند اختيار من القائمة
      messageText = body.list_response.id || body.list_response.rowId || body.list_response.title;
      isListSelection = true;
      console.log('📋 List selection detected:', messageText);
    } else if (body.interactive?.list_reply) {
      // تنسيق بديل
      messageText = body.interactive.list_reply.id;
      isListSelection = true;
      console.log('📋 Interactive list reply detected:', messageText);
    } else if (body.message?.text) {
      // رسالة نصية عادية (fallback)
      messageText = body.message.text;
    } else if (body.text) {
      messageText = body.text;
    } else if (body.body) {
      messageText = body.body;
    }
    
    console.log('🔍 Parsed data:', { 
      phoneNumber, 
      messageText,
      isListSelection,
      rawBody: body 
    });
    
    // تنظيف رقم الهاتف
    let cleanPhone = phoneNumber?.toString().replace(/\s+/g, '');
    
    // ✅ التحقق من أن الرسالة هي اختيار لغة
    const isLanguageSelection = messageText && (
      // List Message Response IDs
      messageText === 'arabic_lang' ||
      messageText === 'english_lang' ||
      // Fallback text responses
      messageText.trim() === '1' || 
      messageText.trim() === '2' ||
      messageText.includes('العربية') ||
      messageText.includes('English') ||
      messageText.toLowerCase().includes('arabic') ||
      messageText.toLowerCase().includes('english')
    );
    
    if (isLanguageSelection) {
      console.log('🎯 Language selection detected:', {
        message: messageText,
        type: isListSelection ? 'List Selection' : 'Text Reply'
      });
      
      await connectDB();
      
      // البحث عن الطالب
      const student = await Student.findOne({
        $or: [
          { 'personalInfo.whatsappNumber': { $regex: cleanPhone, $options: 'i' } },
          { 'personalInfo.whatsappNumber': { $regex: `\\+${cleanPhone}`, $options: 'i' } },
          { 'personalInfo.whatsappNumber': { $regex: cleanPhone.replace(/^\+/, ''), $options: 'i' } }
        ],
        isDeleted: false
      });
      
      if (student) {
        console.log('✅ Student found:', {
          id: student._id,
          name: student.personalInfo.fullName,
          currentLanguage: student.communicationPreferences?.preferredLanguage,
          whatsappNumber: student.personalInfo.whatsappNumber
        });
        
        // معالجة اختيار اللغة
        const result = await wapilotService.processLanguageSelection(
          cleanPhone,
          messageText.trim()
        );
        
        if (result.success) {
          console.log('✅ Language selection processed successfully');
          
          return NextResponse.json({
            success: true,
            message: 'Language preference updated successfully',
            data: {
              studentId: result.studentId,
              studentName: result.studentName,
              selectedLanguage: result.selectedLanguage,
              selectedLanguageText: result.selectedLanguage === 'ar' ? 'العربية' : 'English',
              response: result.response,
              responseType: isListSelection ? 'list_selection' : 'text_reply',
              confirmationSent: result.confirmationSent,
              timestamp: new Date()
            }
          });
        } else {
          console.log('⚠️ Language selection processing failed:', result.message);
          
          return NextResponse.json({
            success: false,
            message: result.message || 'Failed to process language selection'
          }, { status: 400 });
        }
        
      } else {
        console.log('⚠️ Student not found for phone:', cleanPhone);
        console.log('🔍 Tried searching with patterns:', [
          cleanPhone,
          `+${cleanPhone}`,
          cleanPhone.replace(/^\+/, '')
        ]);
        
        return NextResponse.json({
          success: false,
          message: 'Student not found',
          debug: {
            phoneNumber: cleanPhone,
            searchPatterns: [
              cleanPhone,
              `+${cleanPhone}`,
              cleanPhone.replace(/^\+/, '')
            ]
          }
        }, { status: 404 });
      }
    }
    
    // إذا كانت رسالة أخرى
    console.log('📨 Other message received (not language selection):', {
      message: messageText,
      isList: isListSelection
    });
    
    return NextResponse.json({
      success: true,
      message: 'Message received',
      note: 'This message is not a language selection. Expecting list selection or 1/2.',
      received: {
        phoneNumber: cleanPhone,
        message: messageText,
        isListSelection: isListSelection
      }
    });
    
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json({
      success: false,
      message: 'Webhook processing error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'WhatsApp Webhook is active with Interactive List Support',
    endpoint: '/api/whatsapp/webhook',
    method: 'POST',
    supported_responses: {
      list_messages: [
        { rowId: 'arabic_lang', title: '🇸🇦 العربية', sets: 'ar' },
        { rowId: 'english_lang', title: '🇺🇸 English', sets: 'en' }
      ],
      text_fallback: [
        '1 (للعربية / for Arabic)',
        '2 (للإنجليزية / for English)'
      ]
    },
    flow: [
      'Step 1: Student receives welcome message (plain text)',
      'Step 2: Student receives interactive List Message',
      'Step 3: Student clicks on list option (arabic_lang or english_lang) ✅ PREFERRED',
      'Step 4: OR student replies with text (1 or 2) as fallback',
      'Step 5: Webhook receives response and updates database',
      'Step 6: System sends confirmation in selected language'
    ],
    expectedPayloads: {
      listSelection: {
        description: 'When user selects from interactive list',
        examples: [
          { list_response: { id: 'arabic_lang', title: '🇸🇦 العربية' } },
          { interactive: { list_reply: { id: 'english_lang' } } }
        ]
      },
      textReply: {
        description: 'When user sends text message (fallback)',
        examples: [
          { from: '201234567890', message: { text: '1' } },
          { sender: '201234567890', text: '2' }
        ]
      }
    },
    features: [
      '✅ Interactive List Messages',
      '✅ Text fallback support (1 or 2)',
      '✅ Automatic language detection',
      '✅ Database auto-update',
      '✅ Confirmation message in selected language'
    ],
    timestamp: new Date().toISOString()
  });
}