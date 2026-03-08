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

    const msg = body.payload;
    if (!msg) return NextResponse.json({ success: true });

    await connectDB();

    // ✅ لو رسالة بعتناها احنا - نحفظ الـ stanzaID
    if (msg.fromMe === true) {
      await handleOutgoingMessage(msg);
      return NextResponse.json({ success: true });
    }

    // ✅ لو رسالة واردة من الطالب
    if (msg.fromMe === false) {
      const result = await processIncomingMessage(msg);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ success: true });

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
// ✅ لما بنبعت رسالة - نحفظ الـ stanzaID
// ============================================================
async function handleOutgoingMessage(msg) {
  try {
    // الـ id بييجي بالشكل ده: "true_201123324153@c.us_3EB0E67C89D1931A52F7F6"
    const msgId = msg.id || '';
    const parts = msgId.split('_');
    const stanzaId = parts[parts.length - 1]; // آخر جزء هو الـ stanzaID
    const chatId = (msg.to || '').replace(/@.*$/, '').trim();

    console.log(`📤 Outgoing message - stanzaId: ${stanzaId} | chatId: ${chatId}`);

    if (!stanzaId || !chatId) return;

    // ابحث عن الطالب بالـ chatId وحفظ الـ stanzaID
    const student = await Student.findOne({
      'metadata.whatsappChatId': chatId,
      isDeleted: false,
    });

    if (student) {
      await Student.updateOne(
        { _id: student._id },
        { $set: { 'metadata.whatsappStanzaId': stanzaId } }
      );
      console.log(`💾 Saved stanzaId: ${stanzaId} for student: ${student.personalInfo?.fullName}`);
    } else {
      console.log(`⚠️ No student found for chatId: ${chatId}`);
    }
  } catch (error) {
    console.error('❌ handleOutgoingMessage error:', error.message);
  }
}

// ============================================================
async function processIncomingMessage(msg) {
  const selectedRowID = msg.listResponse?.selectedRowID || null;
  const phoneRaw = (msg.from || '').replace(/@.*$/, '').trim();
  const replyToId = msg.replyTo?.id || msg.replyToId || null;

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
    console.log(`⚠️ Not a language selection`);
    return { success: false, reason: 'not_language_selection' };
  }

  console.log(`🌍 Language: ${selectedLanguage} | Phone: ${phoneRaw} | replyToId: ${replyToId}`);

  let student = null;

  // ✅ طريقة 1: ابحث بالـ stanzaID المحفوظ
  if (replyToId) {
    console.log(`🔍 Searching by stanzaId: ${replyToId}`);
    student = await Student.findOne({
      'metadata.whatsappStanzaId': replyToId,
      isDeleted: false,
    });
    if (student) console.log(`✅ Found by stanzaId`);
    else console.log(`⚠️ Not found by stanzaId`);
  }

  // ✅ طريقة 2: ابحث بالـ chatId
  if (!student && phoneRaw) {
    console.log(`🔍 Searching by chatId: ${phoneRaw}`);
    student = await Student.findOne({
      'metadata.whatsappChatId': phoneRaw,
      isDeleted: false,
    });
    if (student) console.log(`✅ Found by chatId`);
    else console.log(`⚠️ Not found by chatId`);
  }

  // ✅ طريقة 3: ابحث بالأرقام
  if (!student) {
    student = await findStudentByPhone(phoneRaw);
    if (student) console.log(`✅ Found by phone`);
  }

  if (!student) {
    console.log(`⚠️ Student not found`);
    return { success: false, reason: 'student_not_found' };
  }

  console.log(`👤 Found: ${student.personalInfo?.fullName}`);

  // ✅ تحديث DB
  await Student.updateOne(
    { _id: student._id },
    {
      $set: {
        'communicationPreferences.preferredLanguage': selectedLanguage,
        'metadata.whatsappLanguageSelected': true,
        'metadata.whatsappLanguageSelectedAt': new Date(),
        'metadata.whatsappLanguageConfirmed': true,
        'metadata.whatsappLanguageConfirmationAt': new Date(),
        'metadata.whatsappChatId': phoneRaw,
        'metadata.updatedAt': new Date(),
      }
    }
  );

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
  if (digits.startsWith('20') && digits.length > 10) digits = digits.substring(2);
  const variants = [digits, `+20${digits}`, `20${digits}`, `0${digits}`];
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
    if (!studentPhone) return { success: false };
    const preparedNumber = wapilotService.preparePhoneNumber(studentPhone);
    if (!preparedNumber) return { success: false };
    const message = buildConfirmationMessage(student, selectedLanguage);
    const result = await wapilotService.sendTextMessage(preparedNumber, message);
    await wapilotService.logToStudentSchema(student._id.toString(), {
      messageType: 'bilingual_language_confirmation',
      messageContent: message,
      language: 'bilingual',
      status: result.success ? 'sent' : 'failed',
      recipientNumber: preparedNumber,
      wapilotMessageId: result.messageId || null,
      sentAt: new Date(),
      metadata: { selectedLanguage, automationType: 'language_selection_response', recipientType: 'student', isBilingual: true },
    });
    console.log(`📤 Confirmation: ${result.success ? '✅ sent' : '❌ failed'}`);
    return result;
  } catch (error) {
    console.error('❌ sendConfirmationMessage error:', error.message);
    return { success: false };
  }
}

// ============================================================
function buildConfirmationMessage(student, selectedLanguage) {
  const gender = student.personalInfo?.gender || 'male';
  const nickname = student.personalInfo?.nickname || null;
  const fullName = student.personalInfo?.fullName || '';
  const nameAr = nickname?.ar || fullName.split(' ')[0] || fullName;
  const nameEn = nickname?.en || fullName.split(' ')[0] || fullName;
  const isMale = String(gender).toLowerCase() === 'male';

  if (selectedLanguage === 'en') {
    return `✅ Language Updated\n\nDear student ${nameEn},\n\nYour preferred language has been set to *English*.\n\nBest regards,\nCode School Team 💻`;
  } else {
    const salutation = isMale ? `عزيزي الطالب ${nameAr}` : `عزيزتي الطالبة ${nameAr}`;
    return `✅ تم تحديث اللغة\n\n${salutation}،\n\nتم تعيين اللغة العربية كلغة التواصل الرسمية معك.\n\nمع أطيب التحيات،\nفريق Code School 💻`;
  }
}