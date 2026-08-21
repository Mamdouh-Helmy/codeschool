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

const EVALUATION_TEMPLATE_MAP = {
  pass:   'evaluation_pass',
  review: 'evaluation_review',
  repeat: 'evaluation_repeat',
};

// 🆕 الطلاب اللي حالة حضورهم من ضمن الـ array دي مايدخلوش خطوة التقييم خالص:
// مش بيظهروا في الـ GET، ومش بياخدوا أي تقييم/رسالة/لينك تسجيل/بلوج حتى لو
// اتبعتوا في الـ PATCH لأي سبب (تأمين مزدوج — الفرونت أصلاً مش هيبعتهم
// لأنهم مش هيظهروا، بس الـ backend بيتأكد بنفسه كمان).
const EXCLUDED_FROM_EVALUATION_STATUSES = ['absent', 'excused'];

// ─── Helper: resolve var from DB ─────────────────────────────────────────────
function resolveVar(dbVars, key, lang = 'ar', genderContext = {}) {
  const v = dbVars[key];
  if (!v) return null;

  const { studentGender = 'male', guardianType = 'father' } = genderContext;
  const isMale   = String(studentGender).toLowerCase() !== 'female';
  const isFather = String(guardianType).toLowerCase()  !== 'mother';

  if (v.hasGender) {
    if (v.genderType === 'student') {
      return lang === 'ar'
        ? (isMale ? v.valueMaleAr   : v.valueFemaleAr) || v.valueAr || null
        : (isMale ? v.valueMaleEn   : v.valueFemaleEn) || v.valueEn || null;
    }
    if (v.genderType === 'guardian') {
      return lang === 'ar'
        ? (isFather ? v.valueFatherAr : v.valueMotherAr) || v.valueAr || null
        : (isFather ? v.valueFatherEn : v.valueMotherEn) || v.valueEn || null;
    }
    if (v.genderType === 'instructor') {
      return lang === 'ar'
        ? (isMale ? v.valueMaleAr : v.valueFemaleAr) || v.valueAr || null
        : (isMale ? v.valueMaleEn : v.valueFemaleEn) || v.valueEn || null;
    }
  }

  return lang === 'ar' ? v.valueAr || null : v.valueEn || null;
}

// ─── Helper: load DB vars map ─────────────────────────────────────────────────
async function loadDbVars() {
  const list = await TemplateVariable.find({ isActive: true }).lean();
  const map = {};
  list.forEach(v => { map[v.key] = v; });
  return map;
}

// ─── Helper: نجوم من رقم ─────────────────────────────────────────────────────
function buildStars(score) {
  const n = Math.min(5, Math.max(1, Math.round(score || 3)));
  return '⭐'.repeat(n);
}

// ─── Helper: حالة الحضور ─────────────────────────────────────────────────────
function localizeAttendance(status, lang) {
  const map = {
    ar: { present: 'حاضر', late: 'متأخر', absent: 'غائب', excused: 'بعذر', null: 'لم يُسجَّل' },
    en: { present: 'Present', late: 'Late', absent: 'Absent', excused: 'Excused', null: 'N/A' },
  };
  return (map[lang] || map.ar)[status] || (lang === 'ar' ? 'لم يُسجَّل' : 'N/A');
}

// ─── Helper: عدد الحصص المكتملة ──────────────────────────────────────────────
async function getCompletedSessionsCount(groupId, studentId) {
  try {
    const count = await Session.countDocuments({
      groupId,
      status: 'completed',
      isDeleted: false,
      'attendance.studentId': studentId,
      'attendance.status': { $in: ['present', 'late'] },
    });
    return count;
  } catch { return 0; }
}

// ─── Helper: fallback يدوي لـ guardianSalutation لو DB فاضي ─────────────────
function buildGuardianSalutation(guardianFirstName, isFather, lang) {
  if (lang === 'ar') {
    return isFather
      ? `عزيزي الأستاذ ${guardianFirstName}`
      : `عزيزتي السيدة ${guardianFirstName}`;
  } else {
    return isFather
      ? `Dear Mr. ${guardianFirstName}`
      : `Dear Mrs. ${guardianFirstName}`;
  }
}

// ─── Helper: جيب بيانات الـ module من الـ group ──────────────────────────────
async function getModuleData(groupId, moduleIndex) {
  try {
    const group = await Group.findById(groupId)
      .populate('courseId', 'curriculum title')
      .lean();
    const moduleData = group?.courseId?.curriculum?.[moduleIndex] || {};
    return {
      moduleTitle:       moduleData.title       || '',
      moduleDescription: moduleData.description || '',
    };
  } catch (err) {
    console.warn('⚠️ Could not fetch module data:', err.message);
    return { moduleTitle: '', moduleDescription: '' };
  }
}

// ─── Helper: جيب بيانات البلوج الخاصة بالسيشن دي من الكورس ───────────────────
// بيدور على السيشن المطابقة (بنفس sessionNumber) جوه curriculum[moduleIndex].sessions
// ولو مفيش محتوى بلوج خالص (لا عربي ولا إنجليزي) بيرجع null — يعني مفيش
// أي رسالة بلوج هتتبعت أصلاً.
async function getSessionBlogInfo(session) {
  try {
    console.log('🔍 [BlogInfo] session.courseId:', session?.courseId, '| moduleIndex:', session?.moduleIndex, '| sessionNumber:', session?.sessionNumber);

    if (!session?.courseId || session.moduleIndex === undefined || !session.sessionNumber) {
      console.log('🔍 [BlogInfo] Missing courseId/moduleIndex/sessionNumber — returning null');
      return null;
    }

    const Course = (await import('../../../../../models/Course')).default;
    const course = await Course.findById(session.courseId)
      .select('curriculum')
      .lean();

    if (!course) {
      console.log('🔍 [BlogInfo] Course not found for id:', session.courseId);
      return null;
    }

    const moduleData = course.curriculum?.[session.moduleIndex];
    console.log('🔍 [BlogInfo] moduleData found:', !!moduleData, '| sessions count in module:', moduleData?.sessions?.length || 0);
    if (moduleData?.sessions?.length) {
      console.log('🔍 [BlogInfo] sessionNumbers available in module:', moduleData.sessions.map(s => s.sessionNumber));
    }

    const sessionBlog = (moduleData?.sessions || []).find(
      (s) => Number(s.sessionNumber) === Number(session.sessionNumber)
    );

    if (!sessionBlog) {
      console.log('🔍 [BlogInfo] No matching sub-session found for sessionNumber:', session.sessionNumber);
      return null;
    }

    const hasAr = !!sessionBlog.blogBodyAr?.trim();
    const hasEn = !!sessionBlog.blogBodyEn?.trim();
    console.log('🔍 [BlogInfo] Found sessionBlog — hasAr:', hasAr, '| hasEn:', hasEn);

    // ✅ لو مفيش محتوى بلوج خالص (مش عربي ومش إنجليزي) — من غير رسالة
    if (!hasAr && !hasEn) return null;

    return { hasAr, hasEn };
  } catch (err) {
    console.warn('⚠️ Could not fetch session blog info:', err.message);
    return null;
  }
}

// ─── Build rendered evaluation message ───────────────────────────────────────
// ⛔️ ملحوظة مهمة: الرسالة دي بقت مالهاش أي علاقة بلينك البلوج خالص —
// اللينك بقى جوه رسالة مستقلة تمامًا (buildBlogMessage تحت).
async function buildEvaluationMessage(student, decision, session, extra = {}) {
  const lang         = student.communicationPreferences?.preferredLanguage || 'ar';
  const gender       = (student.personalInfo?.gender || 'male').toLowerCase();
  const relationship = (student.guardianInfo?.relationship || 'father').toLowerCase();
  const isMale       = gender !== 'female';
  const isFather     = relationship !== 'mother';
  const genderCtx    = { studentGender: gender, guardianType: relationship };

  const dbVars = await loadDbVars();

  // ── اسم الطالب حسب اللغة ────────────────────────────────────────────────
  const studentFirstName =
    lang === 'ar'
      ? student.personalInfo?.nickname?.ar?.trim()  || student.personalInfo?.fullName?.split(' ')[0] || 'الطالب'
      : student.personalInfo?.nickname?.en?.trim()  || student.personalInfo?.fullName?.split(' ')[0] || 'Student';

  // ── اسم ولي الأمر حسب اللغة ─────────────────────────────────────────────
  // لازم يتحدد الأول عشان يتستخدم في بناء guardianSalutation
  const guardianFirstName =
    lang === 'ar'
      ? student.guardianInfo?.nickname?.ar?.trim()  || student.guardianInfo?.name?.split(' ')[0] || 'ولي الأمر'
      : student.guardianInfo?.nickname?.en?.trim()  || student.guardianInfo?.name?.split(' ')[0] || 'Guardian';

  // ── guardianSalutation من DB أولاً ──────────────────────────────────────
  // القيمة في DB بتكون: "عزيزي الأستاذ {guardianName}" أو "Dear Mr. {guardianName}"
  // بعد ما نجيبها نعمل replace بـ guardianFirstName الصح حسب اللغة والجنس
  const guardianSalutationFromDB = resolveVar(dbVars, 'guardianSalutation', lang, genderCtx);
  const guardianSalutation = guardianSalutationFromDB
    ? guardianSalutationFromDB.replace(/\{guardianName\}/g, guardianFirstName)
    : buildGuardianSalutation(guardianFirstName, isFather, lang);

  // ── childTitle حسب اللغة والجنس ──────────────────────────────────────────
  const childTitle =
    resolveVar(dbVars, 'childTitle', lang, genderCtx) ||
    (lang === 'ar'
      ? (isMale ? 'ابنك' : 'ابنتك')
      : (isMale ? 'your son' : 'your daughter'));

  // ── evaluationDecision حسب اللغة والقرار ────────────────────────────────
  const decisionFromDB = resolveVar(dbVars, 'evaluationDecision', lang, genderCtx);
  const decisionText = decisionFromDB || (
    lang === 'ar'
      ? (decision === 'pass' ? 'ممتاز' : decision === 'review' ? 'يحتاج مراجعة' : 'يحتاج دعم إضافي')
      : (decision === 'pass' ? 'Excellent' : decision === 'review' ? 'Needs Review' : 'Needs Support')
  );

  // ── supervisorName من DB vars ────────────────────────────────────────────
  const supervisorName =
    resolveVar(dbVars, 'supervisorName', lang, genderCtx) ||
    (lang === 'ar' ? 'المشرف الأكاديمي' : 'Learning Supervisor');

  // ── تاريخ الجلسة حسب اللغة ──────────────────────────────────────────────
  const sessionDate = session?.scheduledDate
    ? new Date(session.scheduledDate).toLocaleDateString(
        lang === 'ar' ? 'ar-EG' : 'en-US',
        { day: '2-digit', month: '2-digit', year: 'numeric' }
      )
    : '';

  const sessionNumber      = session?.sessionNumber || '';
  const attendanceStatus   = localizeAttendance(extra.attendanceStatus || null, lang);
  const ratings            = extra.ratings || {};
  const starsCommitment    = buildStars(ratings.commitment    ?? 3);
  const starsUnderstanding = buildStars(ratings.understanding ?? 3);
  const starsTaskExecution = buildStars(ratings.taskExecution ?? 3);
  const starsParticipation = buildStars(ratings.participation ?? 3);
  const instructorComment  = extra.comment?.trim() || (lang === 'ar' ? '—' : '—');

  // ── رابط التسجيل حسب اللغة ──────────────────────────────────────────────
  const recordingLinkText = session?.recordingLink
    ? lang === 'ar'
      ? `🎥 رابط التسجيل: ${session.recordingLink}`
      : `🎥 Recording: ${session.recordingLink}`
    : '';

  const completedSessions = extra.groupId
    ? await getCompletedSessionsCount(extra.groupId, student._id)
    : 0;

  // ── moduleTitle و moduleDescription ─────────────────────────────────────
  const moduleTitle =
    extra.moduleTitle ||
    resolveVar(dbVars, 'moduleTitle', lang, genderCtx) ||
    '';

  const moduleDescription =
    extra.moduleDescription ||
    resolveVar(dbVars, 'moduleDescription', lang, genderCtx) ||
    '';

  // ── جيب القالب من DB ─────────────────────────────────────────────────────
  let template   = extra.rawContent;
  let isFallback = false;

  if (!template) {
    const result = await MessageTemplate.getOrFallback(EVALUATION_TEMPLATE_MAP[decision], lang);
    template   = result.content;
    isFallback = result.isFallback;
  }

  // ── بناء جدول المتغيرات ───────────────────────────────────────────────────
  const variables = {
    guardianSalutation,   // ✅ جاية من DB + replace بالاسم الصح حسب اللغة
    guardianName:        guardianFirstName,
    studentName:         studentFirstName,
    childTitle,
    sessionName:         session?.title || '',
    sessionDate,
    sessionNumber,
    date:                sessionDate,
    time:                session ? `${session.startTime || ''} - ${session.endTime || ''}` : '',
    attendanceStatus,
    starsCommitment,
    starsUnderstanding,
    starsTaskExecution,
    starsParticipation,
    instructorComment,
    completedSessions:   String(completedSessions),
    enrollmentNumber:    student.enrollmentNumber || '',
    recordingLink:       recordingLinkText,
    evaluationDecision:  decisionText,
    decision:            decisionText,
    moduleTitle,
    moduleDescription,
    supervisorName,
  };

  let rendered = template;
  Object.entries(variables).forEach(([key, value]) => {
    rendered = rendered.replace(new RegExp(`\\{${key}\\}`, 'g'), value ?? '');
  });

  return {
    rendered,
    lang,
    isFallback,
    guardianPhone: student.guardianInfo?.whatsappNumber || student.guardianInfo?.phone || '',
  };
}

// ─── Build recording message ──────────────────────────────────────────────────
async function buildRecordingMessage(student, session, recordingLink) {
  const lang         = student.communicationPreferences?.preferredLanguage || 'ar';
  const gender       = (student.personalInfo?.gender || 'male').toLowerCase();
  const relationship = (student.guardianInfo?.relationship || 'father').toLowerCase();
  const isMale       = gender !== 'female';
  const isFather     = relationship !== 'mother';
  const genderCtx    = { studentGender: gender, guardianType: relationship };

  const dbVars = await loadDbVars();

  const studentFirstName =
    lang === 'ar'
      ? student.personalInfo?.nickname?.ar?.trim()  || student.personalInfo?.fullName?.split(' ')[0] || 'الطالب'
      : student.personalInfo?.nickname?.en?.trim()  || student.personalInfo?.fullName?.split(' ')[0] || 'Student';

  // ── اسم ولي الأمر حسب اللغة ─────────────────────────────────────────────
  const guardianFirstName =
    lang === 'ar'
      ? student.guardianInfo?.nickname?.ar?.trim()  || student.guardianInfo?.name?.split(' ')[0] || 'ولي الأمر'
      : student.guardianInfo?.nickname?.en?.trim()  || student.guardianInfo?.name?.split(' ')[0] || 'Guardian';

  // ── guardianSalutation من DB أولاً ──────────────────────────────────────
  const guardianSalutationFromDB = resolveVar(dbVars, 'guardianSalutation', lang, genderCtx);
  const guardianSalutation = guardianSalutationFromDB
    ? guardianSalutationFromDB.replace(/\{guardianName\}/g, guardianFirstName)
    : buildGuardianSalutation(guardianFirstName, isFather, lang);

  const childTitle =
    resolveVar(dbVars, 'childTitle', lang, genderCtx) ||
    (lang === 'ar'
      ? (isMale ? 'ابنك' : 'ابنتك')
      : (isMale ? 'your son' : 'your daughter'));

  const result = await MessageTemplate.getOrFallback('session_recording', lang);
  let rendered = result.content;

  const variables = {
    guardianSalutation,   // ✅ نفس الـ pattern — من DB + replace بالاسم الصح
    guardianName:  guardianFirstName,
    studentName:   studentFirstName,
    childTitle,
    sessionName:   session?.title || '',
    recordingLink: recordingLink.trim(),
  };

  Object.entries(variables).forEach(([key, value]) => {
    rendered = rendered.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  });

  return { rendered, lang, isFallback: result.isFallback };
}

// ─── 🆕 Build session blog (summary) message — رسالة مستقلة تمامًا ──────────
// دي رسالة منفصلة بالكامل عن رسالة التقييم ورسالة التسجيل — بتحتوي بس على
// تحية لولي الأمر + لينك ملخص الجلسة. بترجع null لو مفيش محتوى بلوج فعلاً
// باللغة اللي هتتبعت بيها الرسالة (عربي/إنجليزي) عشان مفيش رسالة فاضية تتبعت.
async function buildBlogMessage(student, session, blogInfo) {
  const lang = student.communicationPreferences?.preferredLanguage || 'ar';

  console.log('🔍 [BlogMessage] lang:', lang, '| blogInfo:', blogInfo);

  if (!blogInfo || !((lang === 'ar' && blogInfo.hasAr) || (lang === 'en' && blogInfo.hasEn))) {
    console.log('🔍 [BlogMessage] No matching blog content for this language — skipping');
    return null;
  }

  const dbVars       = await loadDbVars();
  const gender       = (student.personalInfo?.gender || 'male').toLowerCase();
  const relationship = (student.guardianInfo?.relationship || 'father').toLowerCase();
  const isFather     = relationship !== 'mother';
  const genderCtx    = { studentGender: gender, guardianType: relationship };

  const guardianFirstName =
    lang === 'ar'
      ? student.guardianInfo?.nickname?.ar?.trim()  || student.guardianInfo?.name?.split(' ')[0] || 'ولي الأمر'
      : student.guardianInfo?.nickname?.en?.trim()  || student.guardianInfo?.name?.split(' ')[0] || 'Guardian';

  const guardianSalutationFromDB = resolveVar(dbVars, 'guardianSalutation', lang, genderCtx);
  const guardianSalutation = guardianSalutationFromDB
    ? guardianSalutationFromDB.replace(/\{guardianName\}/g, guardianFirstName)
    : buildGuardianSalutation(guardianFirstName, isFather, lang);

  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
  const blogUrl = `${baseUrl}/session-blog/${session._id}`;

  const rendered =
    lang === 'ar'
      ? `${guardianSalutation}،\n\n📝 تقدروا تقروا ملخص الجلسة كامل من هنا:\n${blogUrl}`
      : `${guardianSalutation},\n\n📝 You can read the full session summary here:\n${blogUrl}`;

  console.log('✅ [BlogMessage] Built standalone blog message');

  return { rendered, lang };
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ success: false, message: 'غير مصرح بالوصول' }, { status: 401 });
    if (user.role !== 'instructor' && user.role !== 'admin') return NextResponse.json({ success: false, message: 'مش مدرس' }, { status: 403 });

    await connectDB();
    const { id } = await params;

    const session = await Session.findById(id)
      .populate({ path: 'groupId', select: 'name code students instructors' })
      .lean();

    if (!session) return NextResponse.json({ success: false, message: 'الجلسة غير موجودة' }, { status: 404 });
    if (!session.attendanceTaken) {
      return NextResponse.json({ success: false, message: 'سجّل الحضور أولاً قبل التقييم' }, { status: 400 });
    }

    if (user.role === 'instructor') {
      const isInstructor = session.groupId?.instructors?.some(
        (i) => i.userId?.toString() === user.id?.toString()
      );
      if (!isInstructor) return NextResponse.json({ success: false, message: 'مش مدرس هذا الجروب' }, { status: 403 });
    }

    const allStudentIds = (session.groupId?.students || []).map((s) => s.studentId || s);

    const students = await Student.find({ _id: { $in: allStudentIds }, isDeleted: false })
      .select('_id personalInfo guardianInfo communicationPreferences enrollmentNumber creditSystem')
      .lean();

    const attendanceMap = {};
    (session.attendance || []).forEach((a) => {
      attendanceMap[a.studentId?.toString()] = a.status;
    });

    // ✅ FIX: التقييمات لازم تتفلتر بالسيشن الحالية (sessionId: session._id)
    // مش بس بالجروب والطالب — قبل كده كانت الكويري بتجيب "آخر تقييم اتعمل
    // للطالب ده في الجروب كله" بغض النظر عن أي سيشن كان، فلو الطالب اتقيّم
    // في سيشن سابقة وكُتب تعليق طويل، التعليق ده كان بيظهر تلقائيًا كـ
    // "currentComment" في أي سيشن جديدة تانية لنفس الطالب — وده سبب ظهور
    // التقرير القديم جوه الـ textarea بدل ما يكون فاضي.
    const existingEvals = await StudentEvaluation.find({
      groupId:   session.groupId?._id,
      sessionId: session._id,
      studentId: { $in: allStudentIds },
    }).lean();
    const existingEvalMap = {};
    existingEvals.forEach((e) => {
      existingEvalMap[e.studentId.toString()] = {
        decision: e.finalDecision,
        ratings:  e.criteria,
        comment:  e.notes || '',
      };
    });

    const [passResult, reviewResult, repeatResult, recordingResult] = await Promise.all([
      MessageTemplate.getOrFallback('evaluation_pass',   'ar'),
      MessageTemplate.getOrFallback('evaluation_review', 'ar'),
      MessageTemplate.getOrFallback('evaluation_repeat', 'ar'),
      MessageTemplate.getOrFallback('session_recording', 'ar'),
    ]);

    // 🆕 الطلاب اللي "غايب" أو "معذور" في الحضور مايدخلوش خطوة التقييم خالص —
    // بيتفلتروا هنا قبل ما يترجعوا للفرونت، فمش هيظهروا في الصفحة أصلاً
    // ومش هياخدوا أي تقييم أو رسالة أو لينك تسجيل أو بلوج.
    const studentsForEval = students
      .filter((s) => {
        const status = attendanceMap[s._id.toString()] || null;
        return !EXCLUDED_FROM_EVALUATION_STATUSES.includes(status);
      })
      .map((s) => ({
        _id:               s._id,
        name:              s.personalInfo?.fullName || 'بدون اسم',
        enrollmentNumber:  s.enrollmentNumber || '',
        credits:           s.creditSystem?.currentPackage?.remainingHours ?? 0,
        guardianPhone:     s.guardianInfo?.whatsappNumber || s.guardianInfo?.phone || '',
        guardianName:      s.guardianInfo?.name || '',
        preferredLanguage: s.communicationPreferences?.preferredLanguage || 'ar',
        attendanceStatus:  attendanceMap[s._id.toString()] || null,
        currentDecision:   existingEvalMap[s._id.toString()]?.decision || null,
        currentRatings:    existingEvalMap[s._id.toString()]?.ratings  || null,
        currentComment:    existingEvalMap[s._id.toString()]?.comment  || '',
      }));

    return NextResponse.json({
      success: true,
      data: {
        session: {
          _id:           session._id,
          title:         session.title,
          scheduledDate: session.scheduledDate,
          startTime:     session.startTime,
          endTime:       session.endTime,
          sessionNumber: session.sessionNumber,
          moduleIndex:   session.moduleIndex,
          recordingLink: session.recordingLink || '',
          group: { _id: session.groupId?._id, name: session.groupId?.name, code: session.groupId?.code },
        },
        students: studentsForEval,
        templates: {
          pass:      { contentAr: passResult.content,      isFallback: passResult.isFallback      },
          review:    { contentAr: reviewResult.content,    isFallback: reviewResult.isFallback    },
          repeat:    { contentAr: repeatResult.content,    isFallback: repeatResult.isFallback    },
          recording: { contentAr: recordingResult.content, isFallback: recordingResult.isFallback },
        },
      },
    });
  } catch (error) {
    console.error('❌ [Evaluation GET]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── POST: معاينة رسالة ───────────────────────────────────────────────────────
export async function POST(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ success: false, message: 'غير مصرح بالوصول' }, { status: 401 });
    if (user.role !== 'instructor' && user.role !== 'admin') return NextResponse.json({ success: false, message: 'مش مدرس' }, { status: 403 });

    await connectDB();
    const { id } = await params;

    let body = {};
    try { const t = await req.text(); if (t?.trim()) body = JSON.parse(t); }
    catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 }); }

    const { studentId, decision, customContent, ratings, comment, attendanceStatus } = body;
    if (!studentId || !decision) return NextResponse.json({ success: false, error: 'studentId and decision required' }, { status: 400 });
    if (!['pass', 'review', 'repeat'].includes(decision)) return NextResponse.json({ success: false, error: 'Invalid decision' }, { status: 400 });

    // 🆕 نفس القاعدة هنا: مايتعملش preview لرسالة تقييم لطالب غايب/معذور
    if (EXCLUDED_FROM_EVALUATION_STATUSES.includes(attendanceStatus)) {
      return NextResponse.json(
        { success: false, error: 'الطالب غايب أو معذور — لا يدخل خطوة التقييم' },
        { status: 400 }
      );
    }

    const [student, session] = await Promise.all([
      Student.findById(studentId).select('personalInfo guardianInfo communicationPreferences enrollmentNumber').lean(),
      Session.findById(id).lean(),
    ]);
    if (!student) return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });

    const { moduleTitle, moduleDescription } = session?.groupId
      ? await getModuleData(session.groupId, session.moduleIndex ?? 0)
      : { moduleTitle: '', moduleDescription: '' };

    // ✅ نفس بيانات البلوج اللي هتتستخدم فعليًا في الرسالة الحقيقية — عشان
    // المعاينة تبقى مطابقة تمامًا لما هيتبعت فعليًا بعد الحفظ
    const blogInfo = session ? await getSessionBlogInfo(session) : null;

    const { rendered, lang, isFallback, guardianPhone } = await buildEvaluationMessage(
      student, decision, session,
      {
        rawContent:        customContent || null,
        ratings:           ratings       || {},
        comment:           comment       || '',
        attendanceStatus:  attendanceStatus || null,
        groupId:           session?.groupId,
        moduleTitle,
        moduleDescription,
      }
    );

    // 🆕 معاينة رسالة ملخص الجلسة (البلوج) كرسالة مستقلة تمامًا في response منفصل
    const blogMessage = session ? await buildBlogMessage(student, session, blogInfo) : null;

    return NextResponse.json({
      success: true,
      data: {
        content:      rendered,
        blogContent:  blogMessage?.rendered || null,   // 🆕 رسالة الملخص المستقلة
        lang,
        isFallback,
        guardianPhone,
        guardianName: student.guardianInfo?.name     || '',
        studentName:  student.personalInfo?.fullName || '',
      },
    });
  } catch (error) {
    console.error('❌ [Evaluation POST]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── PATCH: احفظ التقييمات + ابعت الرسائل ────────────────────────────────────
export async function PATCH(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ success: false, message: 'غير مصرح بالوصول' }, { status: 401 });
    if (user.role !== 'instructor' && user.role !== 'admin') return NextResponse.json({ success: false, message: 'مش مدرس' }, { status: 403 });

    await connectDB();
    const { id } = await params;

    let body = {};
    try { const t = await req.text(); if (t?.trim()) body = JSON.parse(t); }
    catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 }); }

    const { evaluations } = body;
    if (!Array.isArray(evaluations) || evaluations.length === 0) {
      return NextResponse.json({ success: false, error: 'evaluations array required' }, { status: 400 });
    }

    const session = await Session.findById(id)
      .populate({ path: 'groupId', select: 'name instructors' })
      .select('+recordingLink');
    if (!session) return NextResponse.json({ success: false, message: 'الجلسة غير موجودة' }, { status: 404 });

    if (user.role === 'instructor') {
      const isInstructor = session.groupId?.instructors?.some(
        (i) => i.userId?.toString() === user.id?.toString()
      );
      if (!isInstructor) return NextResponse.json({ success: false, message: 'مش مدرس هذا الجروب' }, { status: 403 });
    }

    // ✅ احفظ الحالة القديمة قبل أي تعديل
    const wasAlreadyCompleted = session.status === 'completed';

    const { moduleTitle, moduleDescription } = session.groupId?._id
      ? await getModuleData(session.groupId._id, session.moduleIndex ?? 0)
      : { moduleTitle: '', moduleDescription: '' };

    // ✅ جيب بيانات البلوج مرة واحدة بس لكل السيشن دي (نفسها لكل الطلاب)
    // بدل ما تتجاب من جديد جوه الـ loop لكل طالب — نفس السيشن يعني نفس البلوج.
    const blogInfo = await getSessionBlogInfo(session);

    const attendanceMap = {};
    (session.attendance || []).forEach((a) => { attendanceMap[a.studentId?.toString()] = a.status; });

    const results = [];

    for (const ev of evaluations) {
      const { studentId, decision, notes, recordingLink, ratings, comment } = ev;
      if (!['pass', 'review', 'repeat'].includes(decision)) continue;

      const attendanceStatus = attendanceMap[studentId?.toString()] || 'absent';

      // 🆕 تأمين مزدوج: لو الطالب غايب أو معذور، اتخطاه تمامًا — مفيش تقييم
      // يتسجل، مفيش رسالة تقييم، ومفيش لينك تسجيل ولا رسالة بلوج تتبعت له،
      // حتى لو وصل ضمن الـ evaluations array لأي سبب (مثلاً تاب قديم مفتوح
      // في الفرونت).
      if (EXCLUDED_FROM_EVALUATION_STATUSES.includes(attendanceStatus)) {
        results.push({
          studentId,
          decision,
          attendanceStatus,
          messageSent: false,
          recordingLinkSent: false,
          blogSent: false,
          skipped: true,
          skipReason: 'excluded_attendance_status',
        });
        continue;
      }

      const student = await Student.findById(studentId)
        .select('personalInfo guardianInfo communicationPreferences enrollmentNumber creditSystem')
        .lean();
      if (!student) continue;

      const lang = student.communicationPreferences?.preferredLanguage || 'ar';

      const { rendered, guardianPhone, isFallback } = await buildEvaluationMessage(
        student, decision, session,
        {
          rawContent:        null,
          ratings:           ratings || {},
          comment:           comment || notes || '',
          attendanceStatus,
          groupId:           session.groupId?._id,
          moduleTitle,
          moduleDescription,
        }
      );

      const attendanceScore = attendanceStatus === 'present' ? 5 : attendanceStatus === 'late' ? 3 : 1;
      const perfScore       = decision === 'pass' ? 4 : decision === 'review' ? 3 : 2;
      const criteria = {
        understanding: ratings?.understanding ?? perfScore,
        commitment:    ratings?.commitment    ?? perfScore,
        attendance:    attendanceScore,
        participation: ratings?.participation ?? perfScore,
      };

      // ✅ FIX: الـ upsert بقى بمفتاح { groupId, studentId, sessionId } بدل
      // { groupId, studentId } بس — قبل كده أي تقييم جديد لنفس الطالب في
      // نفس الجروب كان بيدهس (overwrite) تقييم أي سيشن سابقة لنفس الطالب،
      // فكان فعليًا بيتسجل تقييم واحد بس لكل (جروب+طالب) بدل تقييم منفصل
      // لكل سيشن. دلوقتي كل سيشن ليها تقييمها المستقل الخاص بيها.
      await StudentEvaluation.findOneAndUpdate(
        { groupId: session.groupId?._id, studentId, sessionId: session._id },
        {
          groupId:       session.groupId?._id,
          studentId,
          sessionId:     session._id,
          instructorId:  user.id,
          finalDecision: decision,
          notes:         comment || notes || '',
          criteria,
          'metadata.evaluatedAt':    new Date(),
          'metadata.evaluatedBy':    user.id,
          'metadata.lastModifiedAt': new Date(),
          'metadata.lastModifiedBy': user.id,
        },
        { upsert: true, new: true }
      );

      const remainingHours = student.creditSystem?.currentPackage?.remainingHours ?? 0;
      if (remainingHours <= 0) {
        results.push({ studentId, decision, attendanceStatus, messageSent: false, recordingLinkSent: false, blogSent: false, skipped: true });
        continue;
      }

      let messageSent       = false;
      let recordingLinkSent = false;
      let blogSent          = false; // 🆕

      if (guardianPhone && rendered) {
        let evalResult = null;

        try {
          const { wapilotService } = await import(
            "../../../../../services/wapilot-service"
          );

          evalResult = await wapilotService.sendAndLogEvalMessage({
            studentId,
            phoneNumber: guardianPhone,
            messageContent: rendered,
            messageType: `evaluation_${decision}`,
            language: lang,
            metadata: {
              sessionId: id,
              sessionTitle: session.title,
              decision,
              attendanceStatus,
              recipientType: "guardian",
              remainingHours,
              isFallback,
              moduleTitle,
            },
          });

          messageSent = evalResult?.success || false;

          if (recordingLink?.trim()) {
            const { rendered: recRendered } = await buildRecordingMessage(
              student,
              session,
              recordingLink
            );

            const linkResult = await wapilotService.sendAndLogMessage({
              studentId,
              phoneNumber: guardianPhone,
              messageContent: recRendered,
              messageType: "session_recording",
              language: lang,
              metadata: {
                sessionId: id,
                sessionTitle: session.title,
                recipientType: "guardian",
                remainingHours,
              },
            });

            recordingLinkSent = linkResult?.success || false;
          }

          // 🆕 رسالة ملخص الجلسة (البلوج) — مستقلة تمامًا عن رسالة التقييم،
          // بتتبعت هنا جنب لينك التسجيل (مش شرط وجود recordingLink)، وبس
          // لو فيه محتوى بلوج فعلاً باللغة اللي بيتكلمها ولي الأمر.
          const blogMessage = await buildBlogMessage(student, session, blogInfo);
          if (blogMessage?.rendered) {
            try {
              const blogResult = await wapilotService.sendAndLogMessage({
                studentId,
                phoneNumber: guardianPhone,
                messageContent: blogMessage.rendered,
                messageType: "session_blog",
                language: blogMessage.lang,
                metadata: {
                  sessionId: id,
                  sessionTitle: session.title,
                  recipientType: "guardian",
                  remainingHours,
                },
              });

              blogSent = blogResult?.success || false;
            } catch (blogErr) {
              console.error("❌ BLOG SEND ERROR:", blogErr);
            }
          }
        } catch (err) {
          console.error("❌ SEND ERROR:", err);
        }
      }

      results.push({ studentId, decision, attendanceStatus, messageSent, recordingLinkSent, blogSent });
    }

    // ✅ حدّث الـ status بس لو مش completed
    if (!wasAlreadyCompleted) {
      session.status = 'completed';
      await session.save();

      // ✅ ضيف ساعتين للمدرس مرة واحدة بس
      try {
        const group = await Group.findById(session.groupId?._id || session.groupId);
        if (group) {
          await group.addInstructorHours(2);
          console.log(`✅ Added 2h to instructors (first completion)`);
        }
      } catch (err) {
        console.error('⚠️ addInstructorHours failed:', err.message);
      }
    } else {
      console.log(`⏭️ Session already completed — skipping status update and instructor hours`);
    }

    const evalSent      = results.filter((r) => r.messageSent).length;
    const linkSent      = results.filter((r) => r.recordingLinkSent).length;
    const blogSentCount = results.filter((r) => r.blogSent).length; // 🆕
    const skipped       = results.filter((r) => r.skipped).length;

    return NextResponse.json({
      success: true,
      message: 'تم حفظ التقييمات بنجاح',
      data: {
        results,
        sessionCompleted: true,
        alreadyWasCompleted: wasAlreadyCompleted,
        summary: { total: results.length, evalSent, linkSent, blogSent: blogSentCount, skipped },
      },
    });

  } catch (error) {
    console.error('❌ [Evaluation PATCH]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}