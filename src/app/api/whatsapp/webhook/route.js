// api/whatsapp/webhook/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '../../../models/Student';
import WhatsAppTemplate from '../../../models/WhatsAppTemplate';
import wapilotService from '../../../services/wapilot-service';

const ARABIC_TRIGGERS  = ['arabic_lang', 'عربي', 'عربية', 'arabic', '1'];
const ENGLISH_TRIGGERS = ['english_lang', 'english', 'انجليزي', 'إنجليزي', '2'];

// ============================================================
// ✅ Fallback: رسالة تأكيد الطالب
// ============================================================
function buildFallbackStudentMessage(selectedLanguage, salutationAr, salutationEn, nameAr, nameEn) {
  if (selectedLanguage === 'en') {
    return `✅ Language Preference Confirmed

${salutationEn},

Your preferred language has been set to *English*. All future messages will be sent in English.

Best regards,
The Code School Team 💻

🌍 Thank you for choosing Code School`;
  }

  return `✅ تم تأكيد اللغة المفضلة

${salutationAr}،

تم تعيين *اللغة العربية* كلغة التواصل الرسمية معك. جميع الرسائل القادمة ستكون بالعربية.

مع أطيب التحيات،
فريق Code School 💻

🌍 شكراً لاختيارك Code School`;
}

// ============================================================
// ✅ Fallback: رسالة تأكيد ولي الأمر
// ============================================================
function buildFallbackGuardianMessage(selectedLanguage, guardianSalAr, guardianSalEn, childTitleAr, childTitleEn, studentNameAr, studentNameEn) {
  if (selectedLanguage === 'en') {
    return `${guardianSalEn},

We are pleased to inform you that your ${childTitleEn} **${studentNameEn}** has successfully selected *English* as their preferred communication language.

All future messages will be sent in English.

Best regards,
The Code School Team 💻

🌍 Thank you for your continued trust in Code School`;
  }

  return `${guardianSalAr}،

يسعدنا إبلاغكم بأن ${childTitleAr} **${studentNameAr}** قام/ت باختيار *اللغة العربية* كلغة مفضلة للتواصل بنجاح.

جميع الرسائل القادمة ستكون باللغة العربية.

مع أطيب التحيات،
فريق Code School 💻

🌍 شكراً لثقتكم المستمرة في Code School`;
}

// ============================================================
// ✅ GET - التحقق من الـ webhook
// ============================================================
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get('hub.challenge');
  if (challenge) return new Response(challenge, { status: 200 });
  return NextResponse.json({ success: true, message: 'Webhook is active' });
}

// ============================================================
// ✅ POST - استقبال الرسائل
// ============================================================
export async function POST(req) {
  try {
    const body = await req.json();
    console.log('📩 Webhook received:', JSON.stringify(body, null, 2));

    const msg = body.payload;
    if (!msg) return NextResponse.json({ success: true });

    await connectDB();

    if (msg.fromMe === true) {
      await handleOutgoingMessage(msg);
      return NextResponse.json({ success: true });
    }

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

// ============================================================
// ✅ حفظ الـ stanzaID للرسائل الصادرة
// ============================================================
async function handleOutgoingMessage(msg) {
  try {
    const msgId = msg.id || '';
    const parts = msgId.split('_');
    const stanzaId = parts[parts.length - 1];
    const chatId = (msg.to || '').replace(/@.*$/, '').trim();

    console.log(`📤 Outgoing - stanzaId: ${stanzaId} | chatId: ${chatId}`);
    if (!stanzaId || !chatId) return;

    const student = await Student.findOne({ 'metadata.whatsappChatId': chatId, isDeleted: false });
    if (student) {
      await Student.updateOne(
        { _id: student._id },
        { $set: { 'metadata.whatsappStanzaId': stanzaId } }
      );
      console.log(`💾 Saved stanzaId: ${stanzaId} → ${student.personalInfo?.fullName}`);
    } else {
      console.log(`⚠️ No student found for chatId: ${chatId}`);
    }
  } catch (error) {
    console.error('❌ handleOutgoingMessage error:', error.message);
  }
}

// ============================================================
// ✅ معالجة الرسائل الواردة
// ============================================================
async function processIncomingMessage(msg) {
  const selectedRowID = msg.listResponse?.selectedRowID || null;
  const phoneRaw = (msg.from || '').replace(/@.*$/, '').trim();
  const replyToId = msg.replyTo?.id || msg.replyToId || null;

  // تحديد اللغة المختارة
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
    console.log(`⚠️ Not a language selection message`);
    return { success: false, reason: 'not_language_selection' };
  }

  console.log(`🌍 Language selected: ${selectedLanguage} | Phone: ${phoneRaw}`);

  // ✅ البحث عن الطالب (4 طرق)
  let student = null;

  if (replyToId) {
    student = await Student.findOne({ 'metadata.whatsappStanzaId': replyToId, isDeleted: false });
    console.log(student ? `✅ Found by stanzaId` : `⚠️ Not found by stanzaId`);
  }

  if (!student && phoneRaw) {
    student = await Student.findOne({ 'metadata.whatsappChatId': phoneRaw, isDeleted: false });
    console.log(student ? `✅ Found by chatId` : `⚠️ Not found by chatId`);
  }

  if (!student) {
    student = await findStudentByPhone(phoneRaw);
    if (student) console.log(`✅ Found by phone number`);
  }

  if (!student) {
    student = await Student.findOne({
      'metadata.whatsappInteractiveSent': true,
      'metadata.whatsappLanguageSelected': false,
      isDeleted: false,
    }).sort({ 'metadata.whatsappSentAt': -1 });
    if (student) console.log(`✅ Found by pending status: ${student.personalInfo?.fullName}`);
    else console.log(`⚠️ Student not found for phone: ${phoneRaw}`);
  }

  if (!student) return { success: false, reason: 'student_not_found' };

  console.log(`👤 Processing for: ${student.personalInfo?.fullName}`);

  // ✅ تحديث اللغة في الـ DB
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

  console.log(`✅ DB updated - preferredLanguage: ${selectedLanguage}`);

  // ✅ إرسال رسائل التأكيد باللغة المختارة فقط
  const confirmResult = await sendConfirmationMessages(student, selectedLanguage);

  return {
    success: true,
    studentId: student._id,
    studentName: student.personalInfo?.fullName,
    selectedLanguage,
    confirmationSent: {
      student: confirmResult.student?.success || false,
      guardian: confirmResult.guardian?.success || false,
    },
  };
}

// ============================================================
// ✅ البحث عن الطالب بأرقام الهاتف
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
// ✅ جلب القالب من الـ DB
// ============================================================
async function getTemplateContent(templateType) {
  try {
    const template = await WhatsAppTemplate.findOne({
      templateType,
      isDefault: true,
      isActive: true,
    });

    if (template) {
      console.log(`📄 DB template found: ${templateType}`);
      // تحديث إحصائيات الاستخدام
      await WhatsAppTemplate.findByIdAndUpdate(template._id, {
        $inc: { 'usageStats.totalSent': 1 },
        $set: { 'usageStats.lastUsedAt': new Date() },
      });
      return template.content;
    }

    console.log(`⚠️ No DB template for: ${templateType} → using fallback`);
    return null;
  } catch (error) {
    console.error(`❌ getTemplateContent error (${templateType}):`, error.message);
    return null;
  }
}

// ============================================================
// ✅ استبدال متغيرات القالب
// ============================================================
function applyVars(content, vars) {
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(key, value ?? '');
  }
  return result;
}

// ============================================================
// ✅ بناء رسالة الطالب من القالب (مع تصفية اللغة)
// ============================================================
function buildStudentMessageFromTemplate(templateContent, selectedLanguage, vars) {
  // استبدل المتغيرات الأساسية أولاً
  let message = applyVars(templateContent, vars);

  // ✅ لو القالب bilingual وفيه sections لكل لغة، خد اللغة الصح فقط
  // القوالب عندنا بتحتوي على {lang:ar}...{/lang} أو بتبعت كلها - نحن هنا بنبني رسالة نقية باللغة المختارة
  // لو القالب مش structured → هنبعته كما هو (الـ fallback هو اللي بيكون monolingual)
  return message;
}

// ============================================================
// ✅ إرسال رسائل التأكيد - باللغة المختارة فقط
// ============================================================
async function sendConfirmationMessages(student, selectedLanguage) {
  const results = { student: null, guardian: null };

  // ✅ تجهيز البيانات
  const gender = student.personalInfo?.gender || 'male';
  const nickname = student.personalInfo?.nickname || null;
  const fullName = student.personalInfo?.fullName || '';
  const nameAr = nickname?.ar || fullName.split(' ')[0] || fullName;
  const nameEn = nickname?.en || fullName.split(' ')[0] || fullName;

  // التحية بناءً على اللغة المختارة فقط
  const salutationAr = wapilotService.getStudentSalutation(gender, 'ar', nameAr, nameEn);
  const salutationEn = wapilotService.getStudentSalutation(gender, 'en', nameAr, nameEn);

  const guardianName = student.guardianInfo?.name || '';
  const guardianNickname = student.guardianInfo?.nickname || null;
  const relationship = student.guardianInfo?.relationship || 'father';
  const childTitleAr = wapilotService.getStudentChildTitle(gender, 'ar');
  const childTitleEn = wapilotService.getStudentChildTitle(gender, 'en');
  const guardianSalAr = wapilotService.getGuardianSalutation(guardianName, relationship, guardianNickname, 'ar');
  const guardianSalEn = wapilotService.getGuardianSalutation(guardianName, relationship, guardianNickname, 'en');

  // ✅ القيم حسب اللغة المختارة
  const isArabic = selectedLanguage === 'ar';
  const langLabel = isArabic ? 'العربية' : 'English';

  // ============================================================
  // 1. رسالة الطالب
  // ============================================================
  const studentPhone = student.personalInfo?.whatsappNumber || student.personalInfo?.phone;

  if (studentPhone) {
    const preparedNumber = wapilotService.preparePhoneNumber(studentPhone);

    if (preparedNumber) {
      const templateContent = await getTemplateContent('student_language_confirmation');

      let studentMessage;

      if (templateContent) {
        // ✅ القالب موجود في الـ DB - استبدل المتغيرات باللغة المختارة فقط
        studentMessage = applyVars(templateContent, {
          // اللغة العربية
          '{salutation_ar}': isArabic ? salutationAr : '',
          '{name_ar}': isArabic ? nameAr : '',
          '{you_ar}': isArabic ? (String(gender).toLowerCase() === 'male' ? 'أنت' : 'أنتِ') : '',
          // اللغة الإنجليزية
          '{salutation_en}': isArabic ? '' : salutationEn,
          '{name_en}': isArabic ? '' : nameEn,
          // مشترك
          '{fullName}': isArabic ? nameAr : nameEn,
          '{selectedLanguage_ar}': isArabic ? 'العربية' : 'الإنجليزية',
          '{selectedLanguage_en}': isArabic ? 'Arabic' : 'English',
          '{selectedLanguage}': langLabel,
        });

        // نظف الأسطر الفاضية الزيادة (ناتجة عن المتغيرات اللي اتمسحت)
        studentMessage = studentMessage.replace(/\n{3,}/g, '\n\n').trim();
      } else {
        // ✅ Fallback - رسالة نقية باللغة المختارة
        studentMessage = buildFallbackStudentMessage(
          selectedLanguage, salutationAr, salutationEn, nameAr, nameEn
        );
      }

      const sendResult = await wapilotService.sendTextMessage(preparedNumber, studentMessage);

      await wapilotService.logToStudentSchema(student._id.toString(), {
        messageType: 'bilingual_language_confirmation',
        messageContent: studentMessage,
        language: selectedLanguage, // ✅ اللغة المختارة فعلاً
        status: sendResult.success ? 'sent' : 'failed',
        recipientNumber: preparedNumber,
        wapilotMessageId: sendResult.messageId || null,
        sentAt: new Date(),
        metadata: {
          selectedLanguage,
          automationType: 'language_selection_response',
          recipientType: 'student',
          studentGender: gender,
          usedDbTemplate: !!templateContent,
          isBilingual: false, // ✅ مش bilingual - رسالة باللغة المختارة بس
        },
      });

      results.student = sendResult;
      console.log(`📤 Student confirmation [${selectedLanguage}]: ${sendResult.success ? '✅' : '❌'}`);
    }
  }

  // ============================================================
  // 2. رسالة ولي الأمر
  // ============================================================
  const guardianPhone = student.guardianInfo?.whatsappNumber || student.guardianInfo?.phone;

  if (guardianPhone) {
    const preparedNumber = wapilotService.preparePhoneNumber(guardianPhone);

    if (preparedNumber) {
      const templateContent = await getTemplateContent('guardian_language_confirmation');

      let guardianMessage;

      if (templateContent) {
        // ✅ القالب موجود في الـ DB - استبدل المتغيرات باللغة المختارة فقط
        guardianMessage = applyVars(templateContent, {
          // اللغة العربية
          '{guardianSalutation_ar}': isArabic ? guardianSalAr : '',
          '{guardianName_ar}': isArabic ? (guardianNickname?.ar || guardianName.split(' ')[0] || guardianName) : '',
          '{studentName_ar}': isArabic ? nameAr : '',
          '{studentGender_ar}': isArabic ? childTitleAr : '',
          '{relationship_ar}': isArabic ? (relationship === 'father' ? 'الأب' : relationship === 'mother' ? 'الأم' : 'الوصي') : '',
          // اللغة الإنجليزية
          '{guardianSalutation_en}': isArabic ? '' : guardianSalEn,
          '{guardianName_en}': isArabic ? '' : (guardianNickname?.en || guardianName.split(' ')[0] || guardianName),
          '{studentName_en}': isArabic ? '' : nameEn,
          '{studentGender_en}': isArabic ? '' : childTitleEn,
          // مشترك
          '{fullStudentName}': isArabic ? nameAr : nameEn,
          '{selectedLanguage_ar}': isArabic ? 'العربية' : 'الإنجليزية',
          '{selectedLanguage_en}': isArabic ? 'Arabic' : 'English',
          '{selectedLanguage}': langLabel,
        });

        // نظف الأسطر الفاضية الزيادة
        guardianMessage = guardianMessage.replace(/\n{3,}/g, '\n\n').trim();
      } else {
        // ✅ Fallback - رسالة نقية باللغة المختارة
        guardianMessage = buildFallbackGuardianMessage(
          selectedLanguage,
          guardianSalAr, guardianSalEn,
          childTitleAr, childTitleEn,
          nameAr, nameEn
        );
      }

      const sendResult = await wapilotService.sendTextMessage(preparedNumber, guardianMessage);

      await wapilotService.logToStudentSchema(student._id.toString(), {
        messageType: 'bilingual_language_confirmation_guardian',
        messageContent: guardianMessage,
        language: selectedLanguage, // ✅ اللغة المختارة فعلاً
        status: sendResult.success ? 'sent' : 'failed',
        recipientNumber: preparedNumber,
        wapilotMessageId: sendResult.messageId || null,
        sentAt: new Date(),
        metadata: {
          selectedLanguage,
          automationType: 'language_selection_response',
          recipientType: 'guardian',
          guardianName,
          studentName: fullName,
          studentGender: gender,
          relationship,
          usedDbTemplate: !!templateContent,
          isBilingual: false, // ✅ مش bilingual - رسالة باللغة المختارة بس
        },
      });

      results.guardian = sendResult;
      console.log(`📤 Guardian confirmation [${selectedLanguage}]: ${sendResult.success ? '✅' : '❌'}`);
    }
  } else {
    console.log(`⚠️ No guardian phone - skipping guardian confirmation`);
  }

  return results;
}