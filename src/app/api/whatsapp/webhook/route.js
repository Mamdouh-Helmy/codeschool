// /src/app/api/whatsapp/webhook/route.js

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '../../../models/Student';
import wapilotService from '../../../services/wapilot-service';

const ARABIC_TRIGGERS  = ['arabic_lang', 'عربي', 'عربية', 'arabic', '1'];
const ENGLISH_TRIGGERS = ['english_lang', 'english', 'انجليزي', 'إنجليزي', '2'];

export async function POST(req) {
  try {
    const body = await req.json();
    console.log('📩 Webhook received:', JSON.stringify(body, null, 2));

    let msg = null;

    if (body.payload && !body.payload.fromMe) {
      msg = body.payload;
    } else if (body.message && !body.message.fromMe) {
      msg = body.message;
    } else if (Array.isArray(body.messages)) {
      msg = body.messages.find(m => !m.fromMe) || null;
    }

    if (!msg) {
      console.log('⚠️ No valid incoming message found');
      return NextResponse.json({ success: true, message: 'No incoming message' });
    }

    const isListResponse = msg.mediaType === 'list_response' || !!msg.listResponse;
    const isTextMessage  = !msg.hasMedia && !!msg.body;

    if (!isListResponse && !isTextMessage) {
      console.log('⚠️ Not a list response or text, skipping');
      return NextResponse.json({ success: true, message: 'Not a language selection' });
    }

    await connectDB();

    const result = await processIncomingMessage(msg);
    console.log('📊 Processing result:', result);

    return NextResponse.json({ success: true, result });

  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get('hub.challenge');
  if (challenge) return new Response(challenge, { status: 200 });
  return NextResponse.json({ success: true, message: 'Webhook is active' });
}

// ============================================================
async function processIncomingMessage(msg) {
  const selectedRowID = msg.listResponse?.selectedRowID || null;
  const phoneRaw = (msg.from || '').replace(/@.*$/, '').trim();

  // ✅ تحديد اللغة
  let selectedLanguage = null;

  if (selectedRowID) {
    const id = selectedRowID.toLowerCase();
    if (ARABIC_TRIGGERS.includes(id))  selectedLanguage = 'ar';
    if (ENGLISH_TRIGGERS.includes(id)) selectedLanguage = 'en';
  } else if (msg.body) {
    const text = msg.body.trim().toLowerCase();
    if (ARABIC_TRIGGERS.includes(text))  selectedLanguage = 'ar';
    if (ENGLISH_TRIGGERS.includes(text)) selectedLanguage = 'en';
  }

  if (!selectedLanguage) {
    console.log(`⚠️ Not a language selection. rowID: "${selectedRowID}", body: "${msg.body}"`);
    return { success: false, reason: 'not_language_selection' };
  }

  console.log(`🌍 Language: ${selectedLanguage} | Phone: ${phoneRaw}`);

  // ✅ طريقة 1: ابحث بالـ stanzaID في whatsappMessages
  const originalMessageId = msg.listResponse?.stanzaID || msg.replyToId || msg.replyTo?.id || null;
  let student = null;

  if (originalMessageId) {
    console.log(`🔍 Searching by messageId: ${originalMessageId}`);
    student = await Student.findOne({
      'whatsappMessages.wapilotMessageId': originalMessageId,
      isDeleted: false,
    });
    if (student) {
      console.log(`✅ Found by messageId: ${originalMessageId}`);
    } else {
      console.log(`⚠️ Not found by messageId, trying phones...`);
    }
  }

  // ✅ طريقة 2: fallback - ابحث بكل الأرقام المتاحة في الـ payload
  if (!student) {
    const phonesToTry = [
      phoneRaw,
      (msg.listResponse?.participant || '').replace(/@.*$/, '').trim(),
      (msg.replyTo?.participant || '').replace(/@.*$/, '').trim(),
    ].filter(p => p && p.length > 0);

    console.log(`🔍 Trying phones:`, phonesToTry);

    for (const phone of phonesToTry) {
      const found = await findStudentByPhone(phone);
      if (found) {
        student = found;
        console.log(`✅ Found by phone: ${phone}`);
        break;
      }
    }
  }

  if (!student) {
    console.log(`⚠️ Student not found for phone: ${phoneRaw} | messageId: ${originalMessageId}`);
    return { success: false, reason: 'student_not_found', phone: phoneRaw };
  }

  console.log(`👤 Found: ${student.personalInfo?.fullName} (${student._id})`);

  // ✅ تحديث اللغة في DB
  await Student.updateOne(
    { _id: student._id },
    {
      $set: {
        'communicationPreferences.preferredLanguage': selectedLanguage,
        'metadata.whatsappLanguageSelected': true,
        'metadata.whatsappLanguageSelectedAt': new Date(),
        'metadata.whatsappLanguageConfirmed': true,
        'metadata.whatsappLanguageConfirmationAt': new Date(),
        'metadata.updatedAt': new Date(),
      }
    }
  );

  console.log(`✅ DB updated: preferredLanguage = "${selectedLanguage}"`);

  // ✅ إرسال رسالة التأكيد
  const confirmResult = await sendConfirmationMessage(student, selectedLanguage);

  return {
    success: true,
    studentId: student._id,
    studentName: student.personalInfo?.fullName,
    selectedLanguage,
    confirmationSent: confirmResult.success,
  };
}

// ============================================================
async function findStudentByPhone(phoneRaw) {
  if (!phoneRaw) return null;

  let digits = phoneRaw.replace(/\D/g, '');

  if (digits.startsWith('20') && digits.length > 10) {
    digits = digits.substring(2);
  }

  const variants = [digits, `+20${digits}`, `20${digits}`, `0${digits}`];

  console.log(`🔎 Phone variants to check:`, variants);

  for (const variant of variants) {
    const student = await Student.findOne({
      $or: [
        { 'personalInfo.whatsappNumber': variant },
        { 'personalInfo.phone': variant },
        { 'guardianInfo.whatsappNumber': variant },
        { 'guardianInfo.phone': variant },
      ],
      isDeleted: false,
    });
    if (student) return student;
  }

  return null;
}

// ============================================================
async function sendConfirmationMessage(student, selectedLanguage) {
  try {
    const studentPhone = student.personalInfo?.whatsappNumber || student.personalInfo?.phone;
    if (!studentPhone) return { success: false, reason: 'no_phone' };

    const preparedNumber = wapilotService.preparePhoneNumber(studentPhone);
    if (!preparedNumber) return { success: false, reason: 'invalid_phone' };

    const message = buildConfirmationMessage(student, selectedLanguage);
    const result  = await wapilotService.sendTextMessage(preparedNumber, message);

    await wapilotService.logToStudentSchema(student._id.toString(), {
      messageType: 'bilingual_language_confirmation',
      messageContent: message,
      language: 'bilingual',
      status: result.success ? 'sent' : 'failed',
      recipientNumber: preparedNumber,
      wapilotMessageId: result.messageId || null,
      sentAt: new Date(),
      metadata: {
        selectedLanguage,
        automationType: 'language_selection_response',
        recipientType: 'student',
        isBilingual: true,
      },
    });

    console.log(`📤 Confirmation: ${result.success ? '✅ sent' : '❌ failed'}`);
    return result;

  } catch (error) {
    console.error('❌ sendConfirmationMessage error:', error.message);
    return { success: false, error: error.message };
  }
}

// ============================================================
function buildConfirmationMessage(student, selectedLanguage) {
  const gender   = student.personalInfo?.gender || 'male';
  const nickname = student.personalInfo?.nickname || null;
  const fullName = student.personalInfo?.fullName || '';
  const nameAr   = nickname?.ar || fullName.split(' ')[0] || fullName;
  const nameEn   = nickname?.en || fullName.split(' ')[0] || fullName;
  const isMale   = String(gender).toLowerCase() === 'male';

  if (selectedLanguage === 'en') {
    return `✅ Language Updated

Dear student ${nameEn},

The language has been modified.
Your preferred language has been set to *English*.

📌 From now on:
- All messages will be sent to you in English
- Course updates and reminders will be in English

Thank you for being part of Code School! 🚀

Best regards,
The Code School Team 💻

🌍 Thank you for choosing Code School
🌍 شكراً لاختيارك Code School`;

  } else {
    const salutation = isMale
      ? `عزيزي الطالب ${nameAr}`
      : `عزيزتي الطالبة ${nameAr}`;

    return `✅ تم تحديث اللغة

${salutation}،

تم تعديل اللغه.
تم تعيين اللغة العربية كلغة التواصل الرسمية معك.

📌 من الآن فصاعداً:
- جميع الرسائل ستصلك باللغة العربية
- التحديثات والتذكيرات ستكون بالعربية

شكراً لكونك جزءاً من Code School! 🚀

مع أطيب التحيات،
فريق Code School 💻

🌍 شكراً لاختيارك Code School
🌍 Thank you for choosing Code School`;
  }
}