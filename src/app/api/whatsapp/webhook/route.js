// /src/app/api/whatsapp/webhook/route.js
// ✅ يستقبل ردود الطلاب من wapilot ويعالج اختيار اللغة

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '../../../models/Student';
import wapilotService from '../../../services/wapilot-service';

// ✅ الكلمات المقبولة لاختيار اللغة
const ARABIC_TRIGGERS  = ['arabic_lang', 'عربي', 'عربية', 'arabic', '1', 'ع'];
const ENGLISH_TRIGGERS = ['english_lang', 'english', 'انجليزي', 'إنجليزي', 'انجليزية', '2', 'en'];

export async function POST(req) {
  try {
    const body = await req.json();
    console.log('📩 Webhook received:', JSON.stringify(body, null, 2));

    // ✅ wapilot بيبعت الرد في body.messages أو body.message
    const messages = body.messages || (body.message ? [body.message] : []);

    if (!messages.length) {
      return NextResponse.json({ success: true, message: 'No messages to process' });
    }

    await connectDB();

    const results = [];

    for (const msg of messages) {
      try {
        const result = await processIncomingMessage(msg);
        results.push(result);
      } catch (err) {
        console.error('❌ Error processing message:', err.message);
        results.push({ success: false, error: err.message });
      }
    }

    return NextResponse.json({ success: true, processed: results.length, results });

  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ✅ GET للتحقق من الـ webhook (بعض الـ providers بيطلبوه)
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get('hub.challenge');
  if (challenge) return new Response(challenge, { status: 200 });
  return NextResponse.json({ success: true, message: 'Webhook is active' });
}

// ============================================================
// ✅ معالجة الرسالة الواردة
// ============================================================
async function processIncomingMessage(msg) {
  // استخراج رقم الهاتف والنص من الرسالة
  const phoneRaw = msg.from || msg.chat_id || msg.sender || msg.phone || '';
  const textRaw  = (
    msg.text ||
    msg.body ||
    msg.message ||
    msg.interactive?.list_reply?.id ||
    msg.interactive?.button_reply?.id ||
    ''
  ).toString().trim().toLowerCase();

  if (!phoneRaw || !textRaw) {
    console.log('⚠️ Missing phone or text, skipping');
    return { success: false, reason: 'missing_data' };
  }

  console.log(`📱 From: ${phoneRaw} | Text: "${textRaw}"`);

  // ✅ تحديد اللغة المختارة
  const selectedLanguage = detectLanguage(textRaw);
  if (!selectedLanguage) {
    console.log(`⚠️ "${textRaw}" is not a language selection`);
    return { success: false, reason: 'not_language_selection', text: textRaw };
  }

  console.log(`🌍 Detected language: ${selectedLanguage}`);

  // ✅ البحث عن الطالب بالرقم
  const student = await findStudentByPhone(phoneRaw);
  if (!student) {
    console.log(`⚠️ No student found for phone: ${phoneRaw}`);
    return { success: false, reason: 'student_not_found', phone: phoneRaw };
  }

  console.log(`👤 Student found: ${student.personalInfo?.fullName} (${student._id})`);

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

  console.log(`✅ Language updated to "${selectedLanguage}" for student ${student._id}`);

  // ✅ إرسال رسالة التأكيد
  const confirmationResult = await sendConfirmationMessage(student, selectedLanguage);

  return {
    success: true,
    studentId: student._id,
    studentName: student.personalInfo?.fullName,
    selectedLanguage,
    confirmationSent: confirmationResult.success,
  };
}

// ============================================================
// ✅ تحديد اللغة من النص
// ============================================================
function detectLanguage(text) {
  const normalized = text.trim().toLowerCase();
  if (ARABIC_TRIGGERS.includes(normalized))  return 'ar';
  if (ENGLISH_TRIGGERS.includes(normalized)) return 'en';
  return null;
}

// ============================================================
// ✅ البحث عن الطالب بالرقم
// ============================================================
async function findStudentByPhone(phoneRaw) {
  // تنظيف الرقم
  let phone = phoneRaw.toString().replace(/\D/g, '');

  // إزالة كود مصر لو موجود في البداية
  if (phone.startsWith('20') && phone.length > 10) {
    phone = phone.substring(2);
  }

  // البحث بأشكال مختلفة للرقم
  const searchVariants = [
    phoneRaw,
    phone,
    `+20${phone}`,
    `20${phone}`,
    `0${phone}`,
  ];

  const student = await Student.findOne({
    $or: searchVariants.flatMap(p => [
      { 'personalInfo.whatsappNumber': { $regex: p.replace(/[+]/g, '\\+'), $options: 'i' } },
      { 'personalInfo.phone': { $regex: p.replace(/[+]/g, '\\+'), $options: 'i' } },
      { 'guardianInfo.whatsappNumber': { $regex: p.replace(/[+]/g, '\\+'), $options: 'i' } },
      { 'guardianInfo.phone': { $regex: p.replace(/[+]/g, '\\+'), $options: 'i' } },
    ]),
    isDeleted: false,
  });

  return student;
}

// ============================================================
// ✅ إرسال رسالة التأكيد
// ============================================================
async function sendConfirmationMessage(student, selectedLanguage) {
  try {
    const studentPhone   = student.personalInfo?.whatsappNumber || student.personalInfo?.phone;
    const guardianPhone  = student.guardianInfo?.whatsappNumber  || student.guardianInfo?.phone;
    const studentName    = student.personalInfo?.fullName || 'الطالب';
    const studentId      = student._id.toString();

    if (!studentPhone && !guardianPhone) {
      return { success: false, reason: 'no_phone' };
    }

    // ✅ بناء رسالة التأكيد
    const confirmationText = buildConfirmationMessage(student, selectedLanguage);

    // إرسال للطالب
    let studentResult = { success: false };
    if (studentPhone) {
      const preparedNumber = wapilotService.preparePhoneNumber(studentPhone);
      if (preparedNumber) {
        studentResult = await wapilotService.sendTextMessage(preparedNumber, confirmationText);

        // تسجيل في DB
        await wapilotService.logToStudentSchema(studentId, {
          messageType: 'bilingual_language_confirmation',
          messageContent: confirmationText,
          language: 'bilingual',
          status: studentResult.success ? 'sent' : 'failed',
          recipientNumber: preparedNumber,
          wapilotMessageId: studentResult.messageId || null,
          sentAt: new Date(),
          metadata: {
            selectedLanguage,
            automationType: 'language_selection_response',
            recipientType: 'student',
            isBilingual: true,
          },
        });
      }
    }

    console.log(`📤 Confirmation sent: ${studentResult.success ? '✅' : '❌'}`);

    return { success: studentResult.success };
  } catch (error) {
    console.error('❌ Error sending confirmation:', error.message);
    return { success: false, error: error.message };
  }
}

// ============================================================
// ✅ بناء نص رسالة التأكيد
// ============================================================
function buildConfirmationMessage(student, selectedLanguage) {
  const gender       = student.personalInfo?.gender || 'male';
  const nickname     = student.personalInfo?.nickname || null;
  const fullName     = student.personalInfo?.fullName || '';
  const nameAr       = nickname?.ar || fullName.split(' ')[0] || fullName;
  const nameEn       = nickname?.en || fullName.split(' ')[0] || fullName;

  const isMale = String(gender).toLowerCase() === 'male';

  if (selectedLanguage === 'en') {
    const salutation = isMale
      ? `Dear student ${nameEn}`
      : `Dear student ${nameEn}`;

    return `✅ Language Updated | تم تحديث اللغة

${salutation},

The language has been modified.
Your preferred language has been set to **English**.

📌 From now on:
• All messages will be sent to you in English
• Course updates and reminders will be in English

Thank you for being part of Code School! 🚀

Best regards,
The Code School Team 💻

🌍 Thank you for choosing Code School
🌍 شكراً لاختيارك Code School`;

  } else {
    const salutation = isMale
      ? `عزيزي الطالب ${nameAr}`
      : `عزيزتي الطالبة ${nameAr}`;

    return `✅ تم تحديث اللغة | Language Updated

${salutation}،

تم تعديل اللغه.
تم تعيين اللغة العربية كلغة التواصل الرسمية معك.

📌 من الآن فصاعداً:
• جميع الرسائل ستصلك باللغة العربية
• التحديثات والتذكيرات ستكون بالعربية

شكراً لكونك جزءاً من Code School! 🚀

مع أطيب التحيات،
فريق Code School 💻

🌍 شكراً لاختيارك Code School
🌍 Thank you for choosing Code School`;
  }
}