// src/app/api/instructor/sessions/[id]/evaluation/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import Session from '../../../../../models/Session';
import Student from '../../../../../models/Student';
import Group from '../../../../../models/Group';
import StudentEvaluation from '../../../../../models/StudentEvaluation';
import MessageTemplate from '../../../../../models/MessageTemplate';
import TemplateVariable from '../../../../../models/TemplateVariable';
import { resolveSessionLock } from '../../../../../services/holdGuard';
import { routeMessage } from '../../../../../services/messageRouting';

// ═══════════════════════════════════════════════════════════════════════════
// AUTH / OWNERSHIP HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const json = (body, status = 200) => NextResponse.json(body, { status });

function checkRole(user) {
  if (!user) return json({ success: false, message: 'غير مصرح بالوصول' }, 401);
  if (user.role !== 'instructor' && user.role !== 'admin') {
    return json({ success: false, message: 'مش مدرس' }, 403);
  }
  return null;
}

function checkGroupOwnership(user, group) {
  if (user.role === 'admin') return null;
  const isOwner = group?.instructors?.some(
    (i) => String(i.userId) === String(user.id),
  );
  return isOwner
    ? null
    : json({ success: false, message: 'مش مدرس هذا الجروب' }, 403);
}

function getGroupStudentIdSet(group) {
  return new Set((group?.students || []).map((s) => String(s.studentId || s)));
}

async function parseBody(req) {
  const text = await req.text();
  return text?.trim() ? JSON.parse(text) : {};
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const VALID_DECISIONS = ['pass', 'review', 'repeat'];
const EXCLUDED_FROM_EVALUATION_STATUSES = ['absent', 'late', 'excused'];

// كل أنواع رسائل التقييم — الـ dedupe بيطابق أي واحد منهم
const EVAL_MESSAGE_TYPES = VALID_DECISIONS.flatMap((d) => [
  `evaluation_${d}`,
  `evaluation_${d}_adult`,
]);

const GROUP_POPULATE_SELECT = 'name code students instructors hold status deliveryMode';

function resolveDeliveryMode(session) {
  return session?.deliveryMode || session?.groupId?.deliveryMode || 'online';
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function resolveVar(dbVars, key, lang = 'ar', genderContext = {}) {
  const v = dbVars[key];
  if (!v) return null;

  const { studentGender = 'male', guardianType = 'father' } = genderContext;
  const isMale = String(studentGender).toLowerCase() !== 'female';
  const isFather = String(guardianType).toLowerCase() !== 'mother';
  const isAr = lang === 'ar';

  if (v.hasGender) {
    if (v.genderType === 'student' || v.genderType === 'instructor') {
      return isAr
        ? (isMale ? v.valueMaleAr : v.valueFemaleAr) || v.valueAr || null
        : (isMale ? v.valueMaleEn : v.valueFemaleEn) || v.valueEn || null;
    }
    if (v.genderType === 'guardian') {
      return isAr
        ? (isFather ? v.valueFatherAr : v.valueMotherAr) || v.valueAr || null
        : (isFather ? v.valueFatherEn : v.valueMotherEn) || v.valueEn || null;
    }
  }

  return isAr ? v.valueAr || null : v.valueEn || null;
}

async function loadDbVars() {
  const list = await TemplateVariable.find({ isActive: true }).lean();
  return Object.fromEntries(list.map((v) => [v.key, v]));
}

function buildStars(score) {
  const n = Math.min(5, Math.max(1, Math.round(score || 3)));
  return '⭐'.repeat(n);
}

function localizeAttendance(status, lang) {
  const map = {
    ar: { present: 'حاضر', late: 'متأخر', absent: 'غائب', excused: 'بعذر' },
    en: { present: 'Present', late: 'Late', absent: 'Absent', excused: 'Excused' },
  };
  const fallback = lang === 'ar' ? 'لم يُسجَّل' : 'N/A';
  return (map[lang] || map.ar)[status] || fallback;
}

async function getCompletedSessionsCount(groupId, studentId) {
  try {
    return await Session.countDocuments({
      groupId,
      status: 'completed',
      isDeleted: false,
      'attendance.studentId': studentId,
      'attendance.status': { $in: ['present', 'late'] },
    });
  } catch {
    return 0;
  }
}

function buildGuardianSalutation(guardianFirstName, isFather, lang) {
  if (lang === 'ar') {
    return isFather
      ? `عزيزي الأستاذ ${guardianFirstName}`
      : `عزيزتي السيدة ${guardianFirstName}`;
  }
  return isFather ? `Dear Mr. ${guardianFirstName}` : `Dear Mrs. ${guardianFirstName}`;
}

function buildRecipientContext(student, dbVars) {
  const lang = student.communicationPreferences?.preferredLanguage || 'ar';
  const isAr = lang === 'ar';
  const gender = (student.personalInfo?.gender || 'male').toLowerCase();
  const relationship = (student.guardianInfo?.relationship || 'father').toLowerCase();
  const isMale = gender !== 'female';
  const isFather = relationship !== 'mother';
  const genderCtx = { studentGender: gender, guardianType: relationship };

  const studentFirstName = isAr
    ? student.personalInfo?.nickname?.ar?.trim() || student.personalInfo?.fullName?.split(' ')[0] || 'الطالب'
    : student.personalInfo?.nickname?.en?.trim() || student.personalInfo?.fullName?.split(' ')[0] || 'Student';

  const guardianFirstName = isAr
    ? student.guardianInfo?.nickname?.ar?.trim() || student.guardianInfo?.name?.split(' ')[0] || 'ولي الأمر'
    : student.guardianInfo?.nickname?.en?.trim() || student.guardianInfo?.name?.split(' ')[0] || 'Guardian';

  const salutationFromDb = resolveVar(dbVars, 'guardianSalutation', lang, genderCtx);
  const guardianSalutation = salutationFromDb
    ? salutationFromDb.replace(/\{guardianName\}/g, guardianFirstName)
    : buildGuardianSalutation(guardianFirstName, isFather, lang);

  const salutationBaseAr =
    resolveVar(dbVars, 'salutation_ar', 'ar', genderCtx) ||
    (isMale ? 'عزيزي الطالب' : 'عزيزتي الطالبة');
  const salutationBaseEn = resolveVar(dbVars, 'salutation_en', 'en', genderCtx) || 'Dear';
  const studentSalutationAr = `${salutationBaseAr} ${studentFirstName}`;
  const studentSalutationEn = `${salutationBaseEn} ${studentFirstName}`;
  const studentSalutation = isAr ? studentSalutationAr : studentSalutationEn;

  const childTitle =
    resolveVar(dbVars, 'childTitle', lang, genderCtx) ||
    (isAr ? (isMale ? 'ابنك' : 'ابنتك') : isMale ? 'your son' : 'your daughter');

  return {
    lang,
    genderCtx,
    isMale,
    isFather,
    studentFirstName,
    studentSalutation,
    studentSalutationAr,
    studentSalutationEn,
    guardianFirstName,
    guardianSalutation,
    childTitle,
  };
}

function renderTemplate(template, variables) {
  let rendered = template || '';
  Object.entries(variables).forEach(([key, value]) => {
    // function replacer عشان $& و $1 في القيمة (مثلاً تعليق المدرس) ما تتفسرش
    rendered = rendered.replace(
      new RegExp(`\\{${key}\\}`, 'g'),
      () => String(value ?? ''),
    );
  });
  return rendered;
}

async function getModuleData(groupId, moduleIndex) {
  try {
    const group = await Group.findById(groupId)
      .populate('courseId', 'curriculum title')
      .lean();
    const moduleData = group?.courseId?.curriculum?.[moduleIndex] || {};
    return {
      moduleTitle: moduleData.title || '',
      moduleDescription: moduleData.description || '',
    };
  } catch (err) {
    console.warn('⚠️ Could not fetch module data:', err.message);
    return { moduleTitle: '', moduleDescription: '' };
  }
}

async function getSessionBlogInfo(session) {
  try {
    if (!session?.courseId || session.moduleIndex === undefined || !session.sessionNumber) {
      return null;
    }

    const Course = (await import('../../../../../models/Course')).default;
    const course = await Course.findById(session.courseId).select('curriculum').lean();
    if (!course) return null;

    const moduleData = course.curriculum?.[session.moduleIndex];
    const sessionBlog = (moduleData?.sessions || []).find(
      (s) => Number(s.sessionNumber) === Number(session.sessionNumber),
    );
    if (!sessionBlog) return null;

    const hasAr = !!sessionBlog.blogBodyAr?.trim();
    const hasEn = !!sessionBlog.blogBodyEn?.trim();
    return hasAr || hasEn ? { hasAr, hasEn } : null;
  } catch (err) {
    console.warn('⚠️ Could not fetch session blog info:', err.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Evaluation message — الـ template والـ recipient من routeMessage
//    Minor → قالب ولي الأمر + ولي الأمر | Adult → قالب _adult + الطالب
// ═══════════════════════════════════════════════════════════════════════════
async function buildEvaluationMessage(student, decision, session, extra = {}) {
  const dbVars = await loadDbVars();
  const ctx = buildRecipientContext(student, dbVars);
  const { lang, genderCtx } = ctx;
  const isAr = lang === 'ar';

  const { isAdult, templateType, recipientType, recipientPhone } = routeMessage({
    event: 'evaluation',
    status: decision,
    student,
  });

  const decisionText =
    resolveVar(dbVars, 'evaluationDecision', lang, genderCtx) ||
    (isAr
      ? { pass: 'ممتاز', review: 'يحتاج مراجعة', repeat: 'يحتاج دعم إضافي' }[decision]
      : { pass: 'Excellent', review: 'Needs Review', repeat: 'Needs Support' }[decision]);

  const supervisorName =
    resolveVar(dbVars, 'supervisorName', lang, genderCtx) ||
    (isAr ? 'المشرف الأكاديمي' : 'Learning Supervisor');

  const sessionDate = session?.scheduledDate
    ? new Date(session.scheduledDate).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';

  const ratings = extra.ratings || {};

  const isSessionOffline = resolveDeliveryMode(session) === 'offline';
  const recordingLinkText =
    session?.recordingLink && !isSessionOffline
      ? `${isAr ? '🎥 رابط التسجيل' : '🎥 Recording'}: ${session.recordingLink}`
      : '';

  const completedSessions = extra.groupId
    ? await getCompletedSessionsCount(extra.groupId, student._id)
    : 0;

  let template = extra.rawContent;
  let isFallback = false;
  if (!template) {
    // ✅ بنمرر recipientType عشان قالب البالغ (student) ما يتلخبطش مع قالب ولي الأمر
    const result = await MessageTemplate.getOrFallback(templateType, lang, recipientType);
    template = result.content;
    isFallback = result.isFallback;
  }

  const variables = {
    studentSalutation: ctx.studentSalutation,
    studentSalutation_ar: ctx.studentSalutationAr,
    studentSalutation_en: ctx.studentSalutationEn,
    studentName: ctx.studentFirstName,

    guardianSalutation: isAdult ? '' : ctx.guardianSalutation,
    guardianName: isAdult ? '' : ctx.guardianFirstName,
    childTitle: isAdult ? '' : ctx.childTitle,
    salutation: isAdult ? ctx.studentSalutation : ctx.guardianSalutation,

    sessionName: session?.title || '',
    sessionDate,
    sessionNumber: session?.sessionNumber || '',
    date: sessionDate,
    time: session ? `${session.startTime || ''} - ${session.endTime || ''}` : '',
    attendanceStatus: localizeAttendance(extra.attendanceStatus || null, lang),
    starsCommitment: buildStars(ratings.commitment ?? 3),
    starsUnderstanding: buildStars(ratings.understanding ?? 3),
    starsTaskExecution: buildStars(ratings.taskExecution ?? 3),
    starsParticipation: buildStars(ratings.participation ?? 3),
    instructorComment: extra.comment?.trim() || '—',
    completedSessions: String(completedSessions),
    enrollmentNumber: student.enrollmentNumber || '',
    recordingLink: recordingLinkText,
    evaluationDecision: decisionText,
    decision: decisionText,
    moduleTitle: extra.moduleTitle || resolveVar(dbVars, 'moduleTitle', lang, genderCtx) || '',
    moduleDescription:
      extra.moduleDescription || resolveVar(dbVars, 'moduleDescription', lang, genderCtx) || '',
    supervisorName,

    isAdult,
  };

  return {
    rendered: renderTemplate(template, variables),
    lang,
    isFallback,
    recipientPhone,
    recipientType,
    isAdult,
    templateType,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── Recording message ─────────────────────────────────────────────────────
// ✅ NEW:
//   - Child  → قالب session_recording (موجّه لولي الأمر) + الرقم اللي في recipientPhone
//   - Adult  → قالب session_recording_adult (موجّه للطالب) + رقم الطالب
//   - sessionIsOffline → مفيش تسجيل (ما بيتحسبش مشكلة، بس بيتخطى)
//
// ⚠️ المستلم (recipientPhone) بيتحدد مسبقًا في buildEvaluationMessage
//    عن طريق routeMessage — نفس المنطق:
//      kids  → رقم ولي الأمر
//      adults → رقم الطالب
//    فبنستخدم نفس المستلم هنا عشان يفضل "تناسق كامل" بين التقييم والتسجيل.
// ────────────────────────────────────────────────────────────────────────────
async function buildRecordingMessage(student, session, recordingLink) {
  const dbVars = await loadDbVars();
  const ctx = buildRecipientContext(student, dbVars);
  const isAdult = student.studentType === 'adults';

  const templateType = isAdult
    ? 'session_recording_adult'
    : 'session_recording';

  const result = await MessageTemplate.getOrFallback(
    templateType,
    ctx.lang,
    isAdult ? 'student' : 'guardian',
  );

  // ✅ متغيرات البالغ مختلفة عن متغيرات الطفل
  const vars = isAdult
    ? {
        studentSalutation: ctx.studentSalutation,
        studentName: ctx.studentFirstName,
        sessionName: session?.title || '',
        recordingLink: recordingLink.trim(),
      }
    : {
        guardianSalutation: ctx.guardianSalutation,
        guardianName: ctx.guardianFirstName,
        studentName: ctx.studentFirstName,
        childTitle: ctx.childTitle,
        sessionName: session?.title || '',
        recordingLink: recordingLink.trim(),
      };

  const rendered = renderTemplate(result.content, vars);

  return {
    rendered,
    lang: ctx.lang,
    isFallback: result.isFallback,
    isAdult,
    templateType,
  };
}

// ─── Session blog message (للكل: الطفل → ولي الأمر | البالغ → الطالب) ─────
// ✅ مشترك بين الأونلاين والأوفلاين
async function buildBlogMessage(student, session, blogInfo) {
  const lang = student.communicationPreferences?.preferredLanguage || 'ar';
  const hasContentForLang = lang === 'ar' ? blogInfo?.hasAr : blogInfo?.hasEn;
  if (!hasContentForLang) return null;

  const dbVars = await loadDbVars();
  const ctx = buildRecipientContext(student, dbVars);
  const isAdult = student.studentType === 'adults';
  const salutation = isAdult ? ctx.studentSalutation : ctx.guardianSalutation;

  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
  const blogUrl = `${baseUrl}/session-blog/${session._id}`;

  const rendered =
    lang === 'ar'
      ? `${salutation}،\n\n📝 ${isAdult ? 'تقدر تقرا' : 'تقدروا تقروا'} ملخص الجلسة كامل من هنا:\n${blogUrl}`
      : `${salutation},\n\n📝 You can read the full session summary here:\n${blogUrl}`;

  return { rendered, lang };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOLD — بيرجّع true لو السيشن دي مقفولة.
//    GET مبيرفضش (بيمنع الرسائل بس). POST (المعاينة) بيرفض بـ 403.
// ═══════════════════════════════════════════════════════════════════════════
async function isSessionOnHold(session) {
  const group = session?.groupId;
  if (!group?.hold?.isHeld) return false;
  return resolveSessionLock(session, group);
}

const holdBlockedResponse = () =>
  json(
    {
      success: false,
      error: 'السيشن دي مقفولة بسبب الـ Hold — التقييم مش متاح',
      code: 'SESSION_ON_HOLD',
    },
    403,
  );

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    const roleError = checkRole(user);
    if (roleError) return roleError;

    await connectDB();
    const { id } = await params;

    const session = await Session.findById(id)
      .populate({ path: 'groupId', select: GROUP_POPULATE_SELECT })
      .lean();
    if (!session) return json({ success: false, message: 'الجلسة غير موجودة' }, 404);

    const ownershipError = checkGroupOwnership(user, session.groupId);
    if (ownershipError) return ownershipError;

    const messagesSuppressed = await isSessionOnHold(session);

    if (!session.attendanceTaken) {
      return json({ success: false, message: 'سجّل الحضور أولاً قبل التقييم' }, 400);
    }

    const allStudentIds = (session.groupId?.students || []).map((s) => s.studentId || s);

    const students = await Student.find({ _id: { $in: allStudentIds }, isDeleted: false })
      .select(
        '_id personalInfo guardianInfo communicationPreferences enrollmentNumber creditSystem studentType',
      )
      .lean();

    const attendanceMap = {};
    (session.attendance || []).forEach((a) => {
      attendanceMap[a.studentId?.toString()] = a.status;
    });

    const existingEvals = await StudentEvaluation.find({
      groupId: session.groupId?._id,
      sessionId: session._id,
      studentId: { $in: allStudentIds },
    }).lean();

    const existingEvalMap = {};
    existingEvals.forEach((e) => {
      existingEvalMap[e.studentId.toString()] = {
        decision: e.finalDecision,
        ratings: e.criteria,
        comment: e.notes || '',
      };
    });

    const [passResult, reviewResult, repeatResult, recordingResult] = await Promise.all([
      MessageTemplate.getOrFallback('evaluation_pass', 'ar'),
      MessageTemplate.getOrFallback('evaluation_review', 'ar'),
      MessageTemplate.getOrFallback('evaluation_repeat', 'ar'),
      MessageTemplate.getOrFallback('session_recording', 'ar'),
    ]);

    const studentsForEval = students
      .filter((s) => {
        const status = attendanceMap[s._id.toString()] || null;
        return !EXCLUDED_FROM_EVALUATION_STATUSES.includes(status);
      })
      .map((s) => {
        const sid = s._id.toString();
        const isAdult = s.studentType === 'adults';
        const studentPhone = s.personalInfo?.whatsappNumber || s.personalInfo?.phone || '';
        const guardianPhone = isAdult
          ? ''
          : (s.guardianInfo?.whatsappNumber || s.guardianInfo?.phone || '');
        return {
          _id: s._id,
          name: s.personalInfo?.fullName || 'بدون اسم',
          enrollmentNumber: s.enrollmentNumber || '',
          credits: s.creditSystem?.currentPackage?.remainingHours ?? 0,
          studentType: s.studentType || 'kids',
          isAdult,
          studentPhone,
          guardianPhone,
          guardianName: isAdult ? '' : (s.guardianInfo?.name || ''),
          // ✅ للواجهة: تنبيه لو مفيش رقم للمستلم
          hasRecipientPhone: !!(isAdult ? studentPhone : guardianPhone),
          preferredLanguage: s.communicationPreferences?.preferredLanguage || 'ar',
          attendanceStatus: attendanceMap[sid] || null,
          currentDecision: existingEvalMap[sid]?.decision || null,
          currentRatings: existingEvalMap[sid]?.ratings || null,
          currentComment: existingEvalMap[sid]?.comment || '',
        };
      });

    const deliveryMode = resolveDeliveryMode(session);
    const isOffline = deliveryMode === 'offline';

    return json({
      success: true,
      data: {
        session: {
          _id: session._id,
          title: session.title,
          scheduledDate: session.scheduledDate,
          startTime: session.startTime,
          endTime: session.endTime,
          sessionNumber: session.sessionNumber,
          moduleIndex: session.moduleIndex,
          recordingLink: isOffline ? '' : (session.recordingLink || ''),
          deliveryMode,
          isOffline,
          isComplimentary: session.isComplimentary === true,
          messagesSuppressed,
          allStudentsExcluded: studentsForEval.length === 0 && students.length > 0,
          group: {
            _id: session.groupId?._id,
            name: session.groupId?.name,
            code: session.groupId?.code,
          },
        },
        students: studentsForEval,
        templates: {
          pass: { contentAr: passResult.content, isFallback: passResult.isFallback },
          review: { contentAr: reviewResult.content, isFallback: reviewResult.isFallback },
          repeat: { contentAr: repeatResult.content, isFallback: repeatResult.isFallback },
          recording: { contentAr: recordingResult.content, isFallback: recordingResult.isFallback },
        },
      },
    });
  } catch (error) {
    console.error('❌ [Evaluation GET]:', error);
    return json({ success: false, error: error.message }, 500);
  }
}

// ─── POST: معاينة رسالة ───────────────────────────────────────────────────────
export async function POST(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    const roleError = checkRole(user);
    if (roleError) return roleError;

    await connectDB();
    const { id } = await params;

    let body;
    try {
      body = await parseBody(req);
    } catch {
      return json({ success: false, error: 'Invalid JSON' }, 400);
    }

    const { studentId, decision, customContent, ratings, comment, attendanceStatus } = body;
    if (!studentId || !decision) {
      return json({ success: false, error: 'studentId and decision required' }, 400);
    }
    if (!VALID_DECISIONS.includes(decision)) {
      return json({ success: false, error: 'Invalid decision' }, 400);
    }
    if (EXCLUDED_FROM_EVALUATION_STATUSES.includes(attendanceStatus)) {
      return json({ success: false, error: 'الطالب غايب أو معذور — لا يدخل خطوة التقييم' }, 400);
    }

    const [student, session] = await Promise.all([
      Student.findById(studentId)
        .select('personalInfo guardianInfo communicationPreferences enrollmentNumber studentType')
        .lean(),
      Session.findById(id)
        .populate({ path: 'groupId', select: GROUP_POPULATE_SELECT })
        .lean(),
    ]);

    if (!session) return json({ success: false, error: 'Session not found' }, 404);
    if (!student) return json({ success: false, error: 'Student not found' }, 404);

    const ownershipError = checkGroupOwnership(user, session.groupId);
    if (ownershipError) return ownershipError;

    if (!getGroupStudentIdSet(session.groupId).has(String(studentId))) {
      return json({ success: false, error: 'الطالب ده مش في جروب السيشن' }, 403);
    }

    if (await isSessionOnHold(session)) return holdBlockedResponse();

    const groupId = session.groupId?._id;
    const { moduleTitle, moduleDescription } = groupId
      ? await getModuleData(groupId, session.moduleIndex ?? 0)
      : { moduleTitle: '', moduleDescription: '' };

    const blogInfo = await getSessionBlogInfo(session);

    const { rendered, lang, isFallback, recipientPhone, recipientType, isAdult } =
      await buildEvaluationMessage(student, decision, session, {
        rawContent: customContent || null,
        ratings: ratings || {},
        comment: comment || '',
        attendanceStatus: attendanceStatus || null,
        groupId,
        moduleTitle,
        moduleDescription,
      });

    // ✅ الملخص للكل (طفل → ولي أمر | بالغ → الطالب)
    const blogMessage = await buildBlogMessage(student, session, blogInfo);

    return json({
      success: true,
      data: {
        content: rendered,
        blogContent: blogMessage?.rendered || null,
        lang,
        isFallback,
        recipientPhone,
        recipientType, // 'student' أو 'guardian'
        isAdult,
        // legacy
        guardianPhone: recipientType === 'guardian' ? recipientPhone : '',
        guardianName: isAdult ? '' : (student.guardianInfo?.name || ''),
        studentName: student.personalInfo?.fullName || '',
      },
    });
  } catch (error) {
    console.error('❌ [Evaluation POST]:', error);
    return json({ success: false, error: error.message }, 500);
  }
}

// ─── PATCH: احفظ التقييمات + ابعت الرسائل + احسب مرتب المدرس ─────────────────
export async function PATCH(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    const roleError = checkRole(user);
    if (roleError) return roleError;

    await connectDB();
    const { id } = await params;

    let body;
    try {
      body = await parseBody(req);
    } catch {
      return json({ success: false, error: 'Invalid JSON' }, 400);
    }

    const { evaluations = [], actualStartTime, actualEndTime, resend = false } = body;
    if (!Array.isArray(evaluations)) {
      return json({ success: false, error: 'evaluations must be an array' }, 400);
    }

    const session = await Session.findById(id)
      .populate({ path: 'groupId', select: GROUP_POPULATE_SELECT })
      .select('+recordingLink');
    if (!session) return json({ success: false, message: 'الجلسة غير موجودة' }, 404);

    const ownershipError = checkGroupOwnership(user, session.groupId);
    if (ownershipError) return ownershipError;

    // كل الطلاب غايبين/معذورين → evaluations فاضية مسموحة والسيشن بتكمل
    if (evaluations.length === 0) {
      const attendance = session.attendance || [];
      const allExcluded =
        session.attendanceTaken &&
        attendance.length > 0 &&
        attendance.every((a) => EXCLUDED_FROM_EVALUATION_STATUSES.includes(a.status));
      if (!allExcluded) {
        return json({ success: false, error: 'evaluations array required' }, 400);
      }
    }

    // الـ Hold بيمنع الرسائل بس
    const messagesSuppressed = await isSessionOnHold(session);

    const wasAlreadyCompleted = session.status === 'completed';
    const isComplimentary = session.isComplimentary === true;
    const sessionIsOffline = resolveDeliveryMode(session) === 'offline';

    const groupId = session.groupId?._id;
    const groupStudentIds = getGroupStudentIdSet(session.groupId);

    const { moduleTitle, moduleDescription } = groupId
      ? await getModuleData(groupId, session.moduleIndex ?? 0)
      : { moduleTitle: '', moduleDescription: '' };

    const blogInfo = await getSessionBlogInfo(session);

    const attendanceMap = {};
    (session.attendance || []).forEach((a) => {
      attendanceMap[a.studentId?.toString()] = a.status;
    });

    const results = [];
    const skippedResult = (studentId, decision, attendanceStatus, skipReason) => ({
      studentId,
      decision,
      attendanceStatus,
      messageSent: false,
      recordingLinkSent: false,
      blogSent: false,
      skipped: true,
      skipReason,
    });

    for (const ev of evaluations) {
      const { studentId, decision, notes, recordingLink, ratings, comment } = ev;
      if (!VALID_DECISIONS.includes(decision)) continue;

      if (!groupStudentIds.has(String(studentId))) {
        results.push(skippedResult(studentId, decision, null, 'student_not_in_group'));
        continue;
      }

      const attendanceStatus = attendanceMap[String(studentId)] || 'absent';

      if (EXCLUDED_FROM_EVALUATION_STATUSES.includes(attendanceStatus)) {
        results.push(
          skippedResult(studentId, decision, attendanceStatus, 'excluded_attendance_status'),
        );
        continue;
      }

      const student = await Student.findById(studentId)
        .select(
          'personalInfo guardianInfo communicationPreferences enrollmentNumber creditSystem studentType',
        )
        .lean();
      if (!student) continue;

      const lang = student.communicationPreferences?.preferredLanguage || 'ar';

      const { rendered, recipientPhone, recipientType, isAdult, isFallback, templateType } =
        await buildEvaluationMessage(student, decision, session, {
          rawContent: null,
          ratings: ratings || {},
          comment: comment || notes || '',
          attendanceStatus,
          groupId,
          moduleTitle,
          moduleDescription,
        });

      console.log(
        `🧪 [Eval] student=${studentId} adult=${isAdult} type=${recipientType} ` +
          `template=${templateType} phone=${recipientPhone ? 'yes' : 'NO'} ` +
          `rendered=${rendered?.trim() ? rendered.length : 'EMPTY'} ` +
          `hold=${messagesSuppressed} dedupe=${resend !== true} fallback=${isFallback}`,
      );

      const attendanceScore = { present: 5, late: 3 }[attendanceStatus] ?? 1;
      const perfScore = { pass: 4, review: 3, repeat: 2 }[decision];
      const criteria = {
        understanding: ratings?.understanding ?? perfScore,
        commitment: ratings?.commitment ?? perfScore,
        attendance: attendanceScore,
        participation: ratings?.participation ?? perfScore,
      };

      // التقييم بيتحفظ دايمًا (حتى مع الـ Hold)
      await StudentEvaluation.findOneAndUpdate(
        { groupId, studentId, sessionId: session._id },
        {
          groupId,
          studentId,
          sessionId: session._id,
          instructorId: user.id,
          finalDecision: decision,
          notes: comment || notes || '',
          criteria,
          'metadata.evaluatedAt': new Date(),
          'metadata.evaluatedBy': user.id,
          'metadata.lastModifiedAt': new Date(),
          'metadata.lastModifiedBy': user.id,
        },
        { upsert: true, returnDocument: 'after' },
      );

      // Hold → مفيش أي رسالة
      if (messagesSuppressed) {
        results.push(skippedResult(studentId, decision, attendanceStatus, 'session_on_hold'));
        continue;
      }

      // فحص الرصيد الصفري (مش بيتطبق على الحصة التعويضية)
      const remainingHours = student.creditSystem?.currentPackage?.remainingHours ?? 0;
      if (!isComplimentary && remainingHours <= 0) {
        results.push(skippedResult(studentId, decision, attendanceStatus, 'zero_balance'));
        continue;
      }

      // ✅ مفيش رقم للمستلم → skip بسبب واضح
      if (!recipientPhone) {
        console.warn(
          `⏭️ [Eval] ${studentId} skipped — no phone (adult: ${isAdult}, recipient: ${recipientType})`,
        );
        results.push(
          skippedResult(
            studentId,
            decision,
            attendanceStatus,
            isAdult ? 'no_student_phone' : 'no_guardian_phone',
          ),
        );
        continue;
      }

      // ✅ القالب فاضي → skip بسبب واضح
      if (!rendered?.trim()) {
        console.warn(`⏭️ [Eval] ${studentId} skipped — empty template ${templateType}`);
        results.push(skippedResult(studentId, decision, attendanceStatus, 'empty_template'));
        continue;
      }

      let messageSent = false;
      let recordingLinkSent = false;
      let blogSent = false;
      let duplicate = false;
      let sendError = null;

      try {
        const { wapilotService } = await import('../../../../../services/wapilot-service');

        // dedupe: نفس الحدث مايتبعتش مرتين (إلا لو resend صريح)
        const dedupe = resend !== true;

        const baseMeta = {
          sessionId: id,
          sessionTitle: session.title,
          recipientType,
          remainingHours,
          isComplimentary,
          isAdult,
          dedupe,
        };

        const evalResult = await wapilotService.sendAndLogEvalMessage({
          studentId,
          phoneNumber: recipientPhone,
          messageContent: rendered,
          messageType: `evaluation_${decision}${isAdult ? '_adult' : ''}`,
          language: lang,
          metadata: {
            ...baseMeta,
            decision,
            attendanceStatus,
            isFallback,
            moduleTitle,
            dedupeTypes: EVAL_MESSAGE_TYPES,
          },
        });

        messageSent = evalResult?.success || false;
        duplicate = evalResult?.duplicate === true;
        if (!messageSent && !duplicate) sendError = evalResult?.error || 'send_failed';

        console.log(
          `🧪 [Eval] result:`,
          JSON.stringify({
            success: evalResult?.success,
            duplicate: evalResult?.duplicate,
            error: evalResult?.error,
          }),
        );

        if (!duplicate) {
          // ═══════════════════════════════════════════════════════════════════════
          // ✅ Recording link — للطالب وولي الأمر (على حسب النوع)
          //    - Online فقط (الـ Offline مفيش تسجيل)
          //    - نفس المستلم بتاع التقييم (recipientPhone):
          //        kids   → رقم ولي الأمر
          //        adults → رقم الطالب
          // ═══════════════════════════════════════════════════════════════════════
          if (recordingLink?.trim() && !sessionIsOffline) {
            try {
              const recBuilt = await buildRecordingMessage(
                student,
                session,
                recordingLink,
              );

              if (recBuilt?.rendered?.trim()) {
                const linkResult = await wapilotService.sendAndLogMessage({
                  studentId,
                  phoneNumber: recipientPhone,
                  messageContent: recBuilt.rendered,
                  // ✅ session_recording للطفل | session_recording_adult للبالغ
                  messageType: recBuilt.templateType,
                  language: lang,
                  metadata: {
                    ...baseMeta,
                    isAdult: recBuilt.isAdult,
                    isFallback: recBuilt.isFallback,
                  },
                });
                recordingLinkSent = linkResult?.success || false;
              }
            } catch (recErr) {
              console.error('❌ RECORDING SEND ERROR:', recErr);
            }
          }

          // ═══════════════════════════════════════════════════════════════════════
          // ✅ Session blog (ملخص الجلسة) — مشترك بين الأطفال والبالغين
          //    يتبعت للأونلاين والأوفلاين — نفس المستلم (recipientPhone)
          // ═══════════════════════════════════════════════════════════════════════
          const blogMessage = await buildBlogMessage(student, session, blogInfo);
          if (blogMessage?.rendered) {
            try {
              const blogResult = await wapilotService.sendAndLogMessage({
                studentId,
                phoneNumber: recipientPhone,
                messageContent: blogMessage.rendered,
                messageType: 'session_blog',
                language: blogMessage.lang,
                metadata: baseMeta,
              });
              blogSent = blogResult?.success || false;
            } catch (blogErr) {
              console.error('❌ BLOG SEND ERROR:', blogErr);
            }
          }
        }
      } catch (err) {
        console.error('❌ SEND ERROR:', err);
        sendError = err.message;
      }

      results.push({
        studentId,
        decision,
        attendanceStatus,
        recipientType,
        isAdult,
        messageSent,
        recordingLinkSent,
        blogSent,
        ...(duplicate ? { duplicate: true } : {}),
        ...(sendError ? { error: sendError } : {}),
      });
    }

    // ── إكمال السيشن (مرة واحدة بس) ───────────────────────────────────────
    if (!wasAlreadyCompleted) {
      session.status = 'completed';
      if (actualStartTime) session.actualStartTime = actualStartTime;
      if (actualEndTime) session.actualEndTime = actualEndTime;
      await session.save();
    }

    // ── المرتب — بيتحاول في كل مرة طالما مش processed ─────────────────────
    let payrollResult = null;
    if (!session.payroll?.processed) {
      try {
        const { processSessionPayroll } = await import('@/lib/payroll');
        payrollResult = await processSessionPayroll({
          sessionId: id,
          actualStartTime: actualStartTime || null,
          actualEndTime: actualEndTime || null,
          actedBy: user.id,
          source: 'instructor_evaluation',
        });
      } catch (payrollError) {
        console.error('⚠️ Payroll processing failed:', payrollError.message);
        payrollResult = { success: false, error: payrollError.message };
      }
    } else {
      console.log('⏭️ Session payroll already processed — skipping');
    }

    // ── ساعات المدرس — مرة واحدة بس، عند الإكمال الأول ─────────────────────
    if (!wasAlreadyCompleted) {
      try {
        const group = await Group.findById(groupId || session.groupId);
        if (group) {
          await group.addInstructorHours(
            payrollResult?.durationMinutes || session.payroll?.durationMinutes || 0,
          );
        }
      } catch (err) {
        console.error('⚠️ addInstructorHours failed:', err.message);
      }
    }

    return json({
      success: true,
      message: 'تم حفظ التقييمات بنجاح',
      data: {
        results,
        sessionCompleted: true,
        alreadyWasCompleted: wasAlreadyCompleted,
        isComplimentary,
        messagesSuppressedByHold: messagesSuppressed,
        payroll: payrollResult
          ? {
              processed: !!payrollResult.fullyProcessed,
              skipped: payrollResult.skipped || [],
              durationMinutes: payrollResult.durationMinutes || 0,
              entriesCount: payrollResult.createdCount || 0,
              deliveryMode: payrollResult.deliveryMode || null,
              error: payrollResult.error || null,
            }
          : null,
        summary: {
          total: results.length,
          evalSent: results.filter((r) => r.messageSent).length,
          linkSent: results.filter((r) => r.recordingLinkSent).length,
          blogSent: results.filter((r) => r.blogSent).length,
          skipped: results.filter((r) => r.skipped).length,
          duplicates: results.filter((r) => r.duplicate).length,
        },
      },
    });
  } catch (error) {
    console.error('❌ [Evaluation PATCH]:', error);
    return json({ success: false, error: error.message }, 500);
  }
}