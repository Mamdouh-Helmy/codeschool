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

// ═══════════════════════════════════════════════════════════════════════════
// ✅ HOLD HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function sortSessionsForHold(sessions) {
  return [...sessions].sort((a, b) => {
    if (a.moduleIndex !== b.moduleIndex) return a.moduleIndex - b.moduleIndex;
    if (a.sessionNumber !== b.sessionNumber) return a.sessionNumber - b.sessionNumber;
    return new Date(a.scheduledDate) - new Date(b.scheduledDate);
  });
}

function isSessionLockedByHold(session, group, allGroupSessions) {
  if (!group?.hold?.isHeld) return false;
  if (session?.status === 'completed') return false;

  const hold = group.hold;

  if (hold.holdType === 'indefinite' || hold.holdType === 'duration') return true;
  if (!Array.isArray(allGroupSessions) || allGroupSessions.length === 0) return true;

  const sorted = sortSessionsForHold(allGroupSessions);
  const myIndex = sorted.findIndex((s) => String(s._id) === String(session._id));
  if (myIndex === -1) return false;

  if (hold.holdType === 'sessions') {
    const consumed = hold.holdSessionsConsumed || 0;
    if (consumed === 0) return true;
    return myIndex < consumed;
  }

  if (hold.holdType === 'until_session') {
    const targetId = hold.holdUntilSessionId;
    if (!targetId) return true;
    const targetIndex = sorted.findIndex((s) => String(s._id) === String(targetId));
    if (targetIndex === -1) return true;
    return myIndex <= targetIndex;
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// ✅ AUTH / OWNERSHIP HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const json = (body, status = 200) => NextResponse.json(body, { status });

/** بيرجع response لو المستخدم مش مصرح له، وإلا null */
function checkRole(user) {
  if (!user) return json({ success: false, message: 'غير مصرح بالوصول' }, 401);
  if (user.role !== 'instructor' && user.role !== 'admin') {
    return json({ success: false, message: 'مش مدرس' }, 403);
  }
  return null;
}

/** الأدمن يعدّي دايمًا، المدرس لازم يكون مسؤول عن الجروب */
function checkGroupOwnership(user, group) {
  if (user.role === 'admin') return null;
  const isOwner = group?.instructors?.some(
    (i) => String(i.userId) === String(user.id),
  );
  return isOwner
    ? null
    : json({ success: false, message: 'مش مدرس هذا الجروب' }, 403);
}

/** مجموعة IDs الطلاب اللي في الجروب (بتدعم الشكلين: ObjectId أو { studentId }) */
function getGroupStudentIdSet(group) {
  return new Set((group?.students || []).map((s) => String(s.studentId || s)));
}

async function parseBody(req) {
  const text = await req.text();
  return text?.trim() ? JSON.parse(text) : {};
}

// ═══════════════════════════════════════════════════════════════════════════
// ✅ CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const EVALUATION_TEMPLATE_MAP = {
  pass: 'evaluation_pass',
  review: 'evaluation_review',
  repeat: 'evaluation_repeat',
};

const VALID_DECISIONS = Object.keys(EVALUATION_TEMPLATE_MAP);
const EXCLUDED_FROM_EVALUATION_STATUSES = ['absent', 'late', 'excused'];

// ✅ الـ select الموحد لبيانات الجروب في كل الـ handlers.
// deliveryMode لازم يكون موجود عشان الـ fallback (session.deliveryMode || group.deliveryMode) يشتغل.
const GROUP_POPULATE_SELECT = 'name code students instructors hold status deliveryMode';

/** ✅ مصدر واحد لتحديد نوع السيشن (بيدعم الـ fallback على الجروب) */
function resolveDeliveryMode(session) {
  return session?.deliveryMode || session?.groupId?.deliveryMode || 'online';
}

// ═══════════════════════════════════════════════════════════════════════════
// ✅ TEMPLATE HELPERS
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

/**
 * ✅ كل اللي الرسائل التلاتة محتاجاه من بيانات الطالب/ولي الأمر في مكان واحد
 * (كان متكرر حرفيًا في 3 دوال).
 */
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

  const childTitle =
    resolveVar(dbVars, 'childTitle', lang, genderCtx) ||
    (isAr ? (isMale ? 'ابنك' : 'ابنتك') : isMale ? 'your son' : 'your daughter');

  return {
    lang,
    genderCtx,
    studentFirstName,
    guardianFirstName,
    guardianSalutation,
    childTitle,
  };
}

function renderTemplate(template, variables) {
  let rendered = template;
  Object.entries(variables).forEach(([key, value]) => {
    rendered = rendered.replace(new RegExp(`\\{${key}\\}`, 'g'), value ?? '');
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

// ─── Evaluation message ──────────────────────────────────────────────────────
async function buildEvaluationMessage(student, decision, session, extra = {}) {
  const dbVars = await loadDbVars();
  const ctx = buildRecipientContext(student, dbVars);
  const { lang, genderCtx } = ctx;
  const isAr = lang === 'ar';

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

  // ✅ مينفعش نحط لينك تسجيل في رسالة سيشن Offline حتى لو كان
  // session.recordingLink متسجل بطريقة تانية على السيشن نفسها
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
    const result = await MessageTemplate.getOrFallback(EVALUATION_TEMPLATE_MAP[decision], lang);
    template = result.content;
    isFallback = result.isFallback;
  }

  const variables = {
    guardianSalutation: ctx.guardianSalutation,
    guardianName: ctx.guardianFirstName,
    studentName: ctx.studentFirstName,
    childTitle: ctx.childTitle,
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
  };

  return {
    rendered: renderTemplate(template, variables),
    lang,
    isFallback,
    guardianPhone: student.guardianInfo?.whatsappNumber || student.guardianInfo?.phone || '',
  };
}

// ─── Recording message ───────────────────────────────────────────────────────
async function buildRecordingMessage(student, session, recordingLink) {
  const dbVars = await loadDbVars();
  const ctx = buildRecipientContext(student, dbVars);

  const result = await MessageTemplate.getOrFallback('session_recording', ctx.lang);

  const rendered = renderTemplate(result.content, {
    guardianSalutation: ctx.guardianSalutation,
    guardianName: ctx.guardianFirstName,
    studentName: ctx.studentFirstName,
    childTitle: ctx.childTitle,
    sessionName: session?.title || '',
    recordingLink: recordingLink.trim(),
  });

  return { rendered, lang: ctx.lang, isFallback: result.isFallback };
}

// ─── Session blog message ────────────────────────────────────────────────────
async function buildBlogMessage(student, session, blogInfo) {
  const lang = student.communicationPreferences?.preferredLanguage || 'ar';
  const hasContentForLang = lang === 'ar' ? blogInfo?.hasAr : blogInfo?.hasEn;
  if (!hasContentForLang) return null;

  const dbVars = await loadDbVars();
  const { guardianSalutation } = buildRecipientContext(student, dbVars);

  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
  const blogUrl = `${baseUrl}/session-blog/${session._id}`;

  const rendered =
    lang === 'ar'
      ? `${guardianSalutation}،\n\n📝 تقدروا تقروا ملخص الجلسة كامل من هنا:\n${blogUrl}`
      : `${guardianSalutation},\n\n📝 You can read the full session summary here:\n${blogUrl}`;

  return { rendered, lang };
}

// ═══════════════════════════════════════════════════════════════════════════
// ✅ HOLD GUARD
// ═══════════════════════════════════════════════════════════════════════════
async function checkGroupHoldResponse(session) {
  if (!session?.groupId?.hold?.isHeld) return null;

  const groupId = session.groupId._id || session.groupId;
  const allGroupSessions = await Session.find({ groupId, isDeleted: false })
    .select('_id moduleIndex sessionNumber scheduledDate status')
    .lean();

  const locked = isSessionLockedByHold(
    {
      _id: session._id,
      moduleIndex: session.moduleIndex,
      sessionNumber: session.sessionNumber,
      status: session.status,
    },
    session.groupId,
    allGroupSessions,
  );

  if (!locked) return null;

  return json(
    {
      success: false,
      error: 'السيشن دي مقفولة بسبب الـ Hold — التقييم مش متاح',
      code: 'SESSION_ON_HOLD',
    },
    403,
  );
}

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

    // ✅ الملكية الأول (قبل أي معلومة تانية)
    const ownershipError = checkGroupOwnership(user, session.groupId);
    if (ownershipError) return ownershipError;

    const holdResponse = await checkGroupHoldResponse(session);
    if (holdResponse) return holdResponse;

    if (!session.attendanceTaken) {
      return json({ success: false, message: 'سجّل الحضور أولاً قبل التقييم' }, 400);
    }

    const allStudentIds = (session.groupId?.students || []).map((s) => s.studentId || s);

    const students = await Student.find({ _id: { $in: allStudentIds }, isDeleted: false })
      .select('_id personalInfo guardianInfo communicationPreferences enrollmentNumber creditSystem')
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
        return {
          _id: s._id,
          name: s.personalInfo?.fullName || 'بدون اسم',
          enrollmentNumber: s.enrollmentNumber || '',
          credits: s.creditSystem?.currentPackage?.remainingHours ?? 0,
          guardianPhone: s.guardianInfo?.whatsappNumber || s.guardianInfo?.phone || '',
          guardianName: s.guardianInfo?.name || '',
          preferredLanguage: s.communicationPreferences?.preferredLanguage || 'ar',
          attendanceStatus: attendanceMap[sid] || null,
          currentDecision: existingEvalMap[sid]?.decision || null,
          currentRatings: existingEvalMap[sid]?.ratings || null,
          currentComment: existingEvalMap[sid]?.comment || '',
        };
      });

    // ✅ نوع السيشن (مع fallback على الجروب) — الفرونت بيعتمد عليه لإخفاء لينك التسجيل
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
          // ✅ سياسة: السيشنات الـ offline معندهاش تسجيل — حتى لو فيه قيمة قديمة مخزنة
          recordingLink: isOffline ? '' : (session.recordingLink || ''),
          deliveryMode,
          isOffline,
          // ✅ عشان الفرونت يعرض بادج "حصة تعويضية"
          isComplimentary: session.isComplimentary === true,
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
        .select('personalInfo guardianInfo communicationPreferences enrollmentNumber')
        .lean(),
      Session.findById(id)
        .populate({ path: 'groupId', select: GROUP_POPULATE_SELECT })
        .lean(),
    ]);

    if (!session) return json({ success: false, error: 'Session not found' }, 404);
    if (!student) return json({ success: false, error: 'Student not found' }, 404);

    // ✅ المدرس لازم يكون مسؤول عن الجروب والطالب لازم يكون فيه
    const ownershipError = checkGroupOwnership(user, session.groupId);
    if (ownershipError) return ownershipError;

    if (!getGroupStudentIdSet(session.groupId).has(String(studentId))) {
      return json({ success: false, error: 'الطالب ده مش في جروب السيشن' }, 403);
    }

    const holdResponse = await checkGroupHoldResponse(session);
    if (holdResponse) return holdResponse;

    const groupId = session.groupId?._id;
    const { moduleTitle, moduleDescription } = groupId
      ? await getModuleData(groupId, session.moduleIndex ?? 0)
      : { moduleTitle: '', moduleDescription: '' };

    const blogInfo = await getSessionBlogInfo(session);

    const { rendered, lang, isFallback, guardianPhone } = await buildEvaluationMessage(
      student,
      decision,
      session,
      {
        rawContent: customContent || null,
        ratings: ratings || {},
        comment: comment || '',
        attendanceStatus: attendanceStatus || null,
        groupId,
        moduleTitle,
        moduleDescription,
      },
    );

    const blogMessage = await buildBlogMessage(student, session, blogInfo);

    return json({
      success: true,
      data: {
        content: rendered,
        blogContent: blogMessage?.rendered || null,
        lang,
        isFallback,
        guardianPhone,
        guardianName: student.guardianInfo?.name || '',
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

    const { evaluations, actualStartTime, actualEndTime } = body;
    if (!Array.isArray(evaluations) || evaluations.length === 0) {
      return json({ success: false, error: 'evaluations array required' }, 400);
    }

    const session = await Session.findById(id)
      .populate({ path: 'groupId', select: GROUP_POPULATE_SELECT })
      .select('+recordingLink');
    if (!session) return json({ success: false, message: 'الجلسة غير موجودة' }, 404);

    const ownershipError = checkGroupOwnership(user, session.groupId);
    if (ownershipError) return ownershipError;

    const holdResponse = await checkGroupHoldResponse(session);
    if (holdResponse) return holdResponse;

    const wasAlreadyCompleted = session.status === 'completed';

    // ✅ الحصة التعويضية: الرسايل بتتبعت حتى لو رصيد الطالب صفر (مفيش خصم أصلاً)
    const isComplimentary = session.isComplimentary === true;

    // ✅ السيشن الـ Offline معندهاش لينك تسجيل أصلاً — الفرونت بيخفي
    // الحقل، لكن لازم نمنعه من الباك كمان لو حد بعت request مباشر
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

      // ✅ مينفعش نقيّم/نبعت لطالب مش في جروب السيشن
      if (!groupStudentIds.has(String(studentId))) {
        results.push(skippedResult(studentId, decision, null, 'student_not_in_group'));
        continue;
      }

      const attendanceStatus = attendanceMap[String(studentId)] || 'absent';

      if (EXCLUDED_FROM_EVALUATION_STATUSES.includes(attendanceStatus)) {
        results.push(skippedResult(studentId, decision, attendanceStatus, 'excluded_attendance_status'));
        continue;
      }

      const student = await Student.findById(studentId)
        .select('personalInfo guardianInfo communicationPreferences enrollmentNumber creditSystem')
        .lean();
      if (!student) continue;

      const lang = student.communicationPreferences?.preferredLanguage || 'ar';

      const { rendered, guardianPhone, isFallback } = await buildEvaluationMessage(
        student,
        decision,
        session,
        {
          rawContent: null,
          ratings: ratings || {},
          comment: comment || notes || '',
          attendanceStatus,
          groupId,
          moduleTitle,
          moduleDescription,
        },
      );

      const attendanceScore = { present: 5, late: 3 }[attendanceStatus] ?? 1;
      const perfScore = { pass: 4, review: 3, repeat: 2 }[decision];
      const criteria = {
        understanding: ratings?.understanding ?? perfScore,
        commitment: ratings?.commitment ?? perfScore,
        attendance: attendanceScore,
        participation: ratings?.participation ?? perfScore,
      };

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
        { upsert: true, new: true },
      );

      // ✅ فحص الرصيد الصفري بيتطبق على الحصص العادية بس.
      // الحصة التعويضية غالبًا بتتعمل لطالب رصيده خلص، فمينفعش نمنع عنه الرسالة.
      const remainingHours = student.creditSystem?.currentPackage?.remainingHours ?? 0;
      if (!isComplimentary && remainingHours <= 0) {
        results.push(skippedResult(studentId, decision, attendanceStatus, 'zero_balance'));
        continue;
      }

      let messageSent = false;
      let recordingLinkSent = false;
      let blogSent = false;

      if (guardianPhone && rendered) {
        try {
          const { wapilotService } = await import('../../../../../services/wapilot-service');

          const baseMeta = {
            sessionId: id,
            sessionTitle: session.title,
            recipientType: 'guardian',
            remainingHours,
            isComplimentary,
          };

          const evalResult = await wapilotService.sendAndLogEvalMessage({
            studentId,
            phoneNumber: guardianPhone,
            messageContent: rendered,
            messageType: `evaluation_${decision}`,
            language: lang,
            metadata: { ...baseMeta, decision, attendanceStatus, isFallback, moduleTitle },
          });
          messageSent = evalResult?.success || false;

          if (recordingLink?.trim() && !sessionIsOffline) {
            const { rendered: recRendered } = await buildRecordingMessage(student, session, recordingLink);
            const linkResult = await wapilotService.sendAndLogMessage({
              studentId,
              phoneNumber: guardianPhone,
              messageContent: recRendered,
              messageType: 'session_recording',
              language: lang,
              metadata: baseMeta,
            });
            recordingLinkSent = linkResult?.success || false;
          }

          const blogMessage = await buildBlogMessage(student, session, blogInfo);
          if (blogMessage?.rendered) {
            try {
              const blogResult = await wapilotService.sendAndLogMessage({
                studentId,
                phoneNumber: guardianPhone,
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
        } catch (err) {
          console.error('❌ SEND ERROR:', err);
        }
      }

      results.push({ studentId, decision, attendanceStatus, messageSent, recordingLinkSent, blogSent });
    }

    // ── إكمال السيشن + ساعات المدرس + المرتب ────────────────────────────────
    let payrollResult = null;

    if (!wasAlreadyCompleted) {
      session.status = 'completed';
      if (actualStartTime) session.actualStartTime = actualStartTime;
      if (actualEndTime) session.actualEndTime = actualEndTime;
      await session.save();

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

      try {
        const group = await Group.findById(groupId || session.groupId);
        if (group) await group.addInstructorHours(payrollResult?.durationMinutes || 0);
      } catch (err) {
        console.error('⚠️ addInstructorHours failed:', err.message);
      }
    } else {
      console.log('⏭️ Session already completed — skipping status, hours and payroll');
    }

    return json({
      success: true,
      message: 'تم حفظ التقييمات بنجاح',
      data: {
        results,
        sessionCompleted: true,
        alreadyWasCompleted: wasAlreadyCompleted,
        isComplimentary,
        payroll: payrollResult
          ? {
              processed: !!payrollResult.success,
              durationMinutes: payrollResult.durationMinutes || 0,
              entriesCount: payrollResult.createdCount || 0,
              deliveryMode: payrollResult.deliveryMode || null,
            }
          : null,
        summary: {
          total: results.length,
          evalSent: results.filter((r) => r.messageSent).length,
          linkSent: results.filter((r) => r.recordingLinkSent).length,
          blogSent: results.filter((r) => r.blogSent).length,
          skipped: results.filter((r) => r.skipped).length,
        },
      },
    });
  } catch (error) {
    console.error('❌ [Evaluation PATCH]:', error);
    return json({ success: false, error: error.message }, 500);
  }
}