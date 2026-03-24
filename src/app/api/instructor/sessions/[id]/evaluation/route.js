// src/app/api/instructor/sessions/[id]/evaluation/route.js

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import Session from '../../../../../models/Session';
import Student from '../../../../../models/Student';
import Group from '../../../../../models/Group';
import StudentEvaluation from '../../../../../models/StudentEvaluation';
import MessageTemplate from '../../../../../models/MessageTemplate';

const EVALUATION_TEMPLATE_MAP = {
  pass:   'evaluation_pass',
  review: 'evaluation_review',
  repeat: 'evaluation_repeat',
};

// ─── Helper: نجوم من رقم ─────────────────────────────────────────────────────
function buildStars(score) {
  const n = Math.min(5, Math.max(1, Math.round(score || 3)));
  return '⭐'.repeat(n);
}

// ─── Helper: حالة الحضور بالعربي/إنجليزي ────────────────────────────────────
function localizeAttendance(status, lang) {
  const map = {
    ar: { present: 'حاضر', late: 'متأخر', absent: 'غائب', excused: 'بعذر', null: 'لم يُسجَّل' },
    en: { present: 'Present', late: 'Late', absent: 'Absent', excused: 'Excused', null: 'N/A' },
  };
  return (map[lang] || map.ar)[status] || (lang === 'ar' ? 'لم يُسجَّل' : 'N/A');
}

// ─── Helper: عدد الحصص المكتملة للطالب في الجروب ────────────────────────────
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

// ─── Build rendered message for one student ───────────────────────────────────
async function buildEvaluationMessage(student, decision, session, extra = {}) {
  // extra = { rawContent, ratings, comment, attendanceStatus, groupId }
  const lang         = student.communicationPreferences?.preferredLanguage || 'ar';
  const gender       = (student.personalInfo?.gender || 'male').toLowerCase();
  const relationship = (student.guardianInfo?.relationship || 'father').toLowerCase();

  const studentFirstName =
    lang === 'ar'
      ? student.personalInfo?.nickname?.ar?.trim()  || student.personalInfo?.fullName?.split(' ')[0] || 'الطالب'
      : student.personalInfo?.nickname?.en?.trim()  || student.personalInfo?.fullName?.split(' ')[0] || 'Student';

  const guardianFirstName =
    lang === 'ar'
      ? student.guardianInfo?.nickname?.ar?.trim()  || student.guardianInfo?.name?.split(' ')[0] || 'ولي الأمر'
      : student.guardianInfo?.nickname?.en?.trim()  || student.guardianInfo?.name?.split(' ')[0] || 'Guardian';

  let guardianSalutation = '';
  if (lang === 'ar') {
    if (relationship === 'mother')      guardianSalutation = `عزيزتي السيدة ${guardianFirstName}`;
    else if (relationship === 'father') guardianSalutation = `عزيزي الأستاذ ${guardianFirstName}`;
    else                                guardianSalutation = `عزيزي/عزيزتي ${guardianFirstName}`;
  } else {
    if (relationship === 'mother')      guardianSalutation = `Dear Mrs. ${guardianFirstName}`;
    else if (relationship === 'father') guardianSalutation = `Dear Mr. ${guardianFirstName}`;
    else                                guardianSalutation = `Dear ${guardianFirstName}`;
  }

  const childTitle = lang === 'ar'
    ? (gender === 'female' ? 'ابنتك' : 'ابنك')
    : (gender === 'female' ? 'your daughter' : 'your son');

  // ── تاريخ الجلسة ──────────────────────────────────────────────────────────
  const sessionDate = session?.scheduledDate
    ? new Date(session.scheduledDate).toLocaleDateString(
        lang === 'ar' ? 'ar-EG' : 'en-US',
        { day: '2-digit', month: '2-digit', year: 'numeric' }
      )
    : '';

  // ── رقم الجلسة ────────────────────────────────────────────────────────────
  const sessionNumber = session?.sessionNumber || '';

  // ── حالة الحضور ───────────────────────────────────────────────────────────
  const attendanceStatus = localizeAttendance(extra.attendanceStatus || null, lang);

  // ── النجوم ────────────────────────────────────────────────────────────────
  const ratings = extra.ratings || {};
  const starsCommitment    = buildStars(ratings.commitment    ?? 3);
  const starsUnderstanding = buildStars(ratings.understanding ?? 3);
  const starsTaskExecution = buildStars(ratings.taskExecution ?? 3);
  const starsParticipation = buildStars(ratings.participation ?? 3);

  // ── تعليق المدرس ──────────────────────────────────────────────────────────
  const instructorComment = extra.comment?.trim() || (lang === 'ar' ? '—' : '—');

  // ── رابط التسجيل ──────────────────────────────────────────────────────────
  const recordingLinkText = session?.recordingLink
    ? lang === 'ar'
      ? `🎥 رابط التسجيل: ${session.recordingLink}`
      : `🎥 Recording: ${session.recordingLink}`
    : '';

  // ── عدد الحصص المكتملة ────────────────────────────────────────────────────
  const completedSessions = extra.groupId
    ? await getCompletedSessionsCount(extra.groupId, student._id)
    : 0;

  // ── الـ template ──────────────────────────────────────────────────────────
  let template = extra.rawContent;
  let isFallback = false;

  if (!template) {
    const result = await MessageTemplate.getOrFallback(EVALUATION_TEMPLATE_MAP[decision], lang);
    template   = result.content;
    isFallback = result.isFallback;
  }

  const variables = {
    guardianSalutation,
    guardianName:        guardianFirstName,
    studentName:         studentFirstName,
    childTitle,
    sessionName:         session?.title || '',
    sessionDate,
    sessionNumber,
    attendanceStatus,
    starsCommitment,
    starsUnderstanding,
    starsTaskExecution,
    starsParticipation,
    instructorComment,
    completedSessions:   String(completedSessions),
    date:                sessionDate,
    time:                session ? `${session.startTime || ''} - ${session.endTime || ''}` : '',
    enrollmentNumber:    student.enrollmentNumber || '',
    recordingLink:       recordingLinkText,
    decision: lang === 'ar'
      ? (decision === 'pass' ? 'ممتاز' : decision === 'review' ? 'يحتاج مراجعة' : 'يحتاج دعم إضافي')
      : (decision === 'pass' ? 'Excellent' : decision === 'review' ? 'Needs Review' : 'Needs Support'),
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

  const studentFirstName =
    lang === 'ar'
      ? student.personalInfo?.nickname?.ar?.trim()  || student.personalInfo?.fullName?.split(' ')[0] || 'الطالب'
      : student.personalInfo?.nickname?.en?.trim()  || student.personalInfo?.fullName?.split(' ')[0] || 'Student';

  const guardianFirstName =
    lang === 'ar'
      ? student.guardianInfo?.nickname?.ar?.trim()  || student.guardianInfo?.name?.split(' ')[0] || 'ولي الأمر'
      : student.guardianInfo?.nickname?.en?.trim()  || student.guardianInfo?.name?.split(' ')[0] || 'Guardian';

  let guardianSalutation = '';
  if (lang === 'ar') {
    if (relationship === 'mother')      guardianSalutation = `عزيزتي السيدة ${guardianFirstName}`;
    else if (relationship === 'father') guardianSalutation = `عزيزي الأستاذ ${guardianFirstName}`;
    else                                guardianSalutation = `عزيزي/عزيزتي ${guardianFirstName}`;
  } else {
    if (relationship === 'mother')      guardianSalutation = `Dear Mrs. ${guardianFirstName}`;
    else if (relationship === 'father') guardianSalutation = `Dear Mr. ${guardianFirstName}`;
    else                                guardianSalutation = `Dear ${guardianFirstName}`;
  }

  const childTitle = lang === 'ar'
    ? (gender === 'female' ? 'ابنتك' : 'ابنك')
    : (gender === 'female' ? 'your daughter' : 'your son');

  const result   = await MessageTemplate.getOrFallback('session_recording', lang);
  let rendered   = result.content;

  const variables = {
    guardianSalutation,
    guardianName: guardianFirstName,
    studentName:  studentFirstName,
    childTitle,
    sessionName:  session?.title || '',
    recordingLink: recordingLink.trim(),
  };

  Object.entries(variables).forEach(([key, value]) => {
    rendered = rendered.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  });

  return { rendered, lang, isFallback: result.isFallback };
}

// ─── GET: جيب كل طلاب الجروب + حالة حضورهم + templates ──────────────────────
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

    const existingEvals = await StudentEvaluation.find({
      groupId:   session.groupId?._id,
      studentId: { $in: allStudentIds },
    }).lean();
    const existingEvalMap = {};
    existingEvals.forEach((e) => {
      existingEvalMap[e.studentId.toString()] = {
        decision:  e.finalDecision,
        ratings:   e.criteria,
        comment:   e.notes || '',
      };
    });

    const [passResult, reviewResult, repeatResult, recordingResult] = await Promise.all([
      MessageTemplate.getOrFallback('evaluation_pass',   'ar'),
      MessageTemplate.getOrFallback('evaluation_review', 'ar'),
      MessageTemplate.getOrFallback('evaluation_repeat', 'ar'),
      MessageTemplate.getOrFallback('session_recording', 'ar'),
    ]);

    const studentsForEval = students.map((s) => ({
      _id:               s._id,
      name:              s.personalInfo?.fullName || 'بدون اسم',
      enrollmentNumber:  s.enrollmentNumber || '',
      credits:           s.creditSystem?.currentPackage?.remainingHours ?? 0,
      guardianPhone:     s.guardianInfo?.whatsappNumber || s.guardianInfo?.phone || '',
      guardianName:      s.guardianInfo?.name || '',
      preferredLanguage: s.communicationPreferences?.preferredLanguage || 'ar',
      attendanceStatus:  attendanceMap[s._id.toString()] || null,
      currentDecision:   existingEvalMap[s._id.toString()]?.decision || null,
      currentRatings:    existingEvalMap[s._id.toString()]?.ratings || null,
      currentComment:    existingEvalMap[s._id.toString()]?.comment || '',
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

// ─── POST: معاينة رسالة طالب معين حسب القرار ─────────────────────────────────
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

    const [student, session] = await Promise.all([
      Student.findById(studentId).select('personalInfo guardianInfo communicationPreferences enrollmentNumber').lean(),
      Session.findById(id).lean(),
    ]);
    if (!student) return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });

    const { rendered, lang, isFallback, guardianPhone } = await buildEvaluationMessage(
      student,
      decision,
      session,
      {
        rawContent:       customContent || null,
        ratings:          ratings || {},
        comment:          comment || '',
        attendanceStatus: attendanceStatus || null,
        groupId:          session?.groupId,
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        content:      rendered,
        lang,
        isFallback,
        guardianPhone,
        guardianName: student.guardianInfo?.name || '',
        studentName:  student.personalInfo?.fullName || '',
      },
    });
  } catch (error) {
    console.error('❌ [Evaluation POST]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── PATCH: احفظ التقييمات + ابعت الرسائل + أكمل الجلسة + ساعتين للمدرس ──────
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

    const attendanceMap = {};
    (session.attendance || []).forEach((a) => { attendanceMap[a.studentId?.toString()] = a.status; });

    const results = [];

    for (const ev of evaluations) {
      // ev = { studentId, decision, notes, recordingLink, ratings, comment }
      const { studentId, decision, notes, recordingLink, ratings, comment } = ev;
      if (!['pass', 'review', 'repeat'].includes(decision)) continue;

      const student = await Student.findById(studentId)
        .select('personalInfo guardianInfo communicationPreferences enrollmentNumber creditSystem')
        .lean();
      if (!student) continue;

      const lang             = student.communicationPreferences?.preferredLanguage || 'ar';
      const attendanceStatus = attendanceMap[studentId?.toString()] || 'absent';

      // ── بناء الرسالة بالشكل الجديد ────────────────────────────────────────
      const { rendered, guardianPhone, isFallback } = await buildEvaluationMessage(
        student,
        decision,
        session,
        {
          rawContent:       null,
          ratings:          ratings || {},
          comment:          comment || notes || '',
          attendanceStatus,
          groupId:          session.groupId?._id,
        }
      );

      // ── احفظ في StudentEvaluation ─────────────────────────────────────────
      const attendanceScore = attendanceStatus === 'present' ? 5 : attendanceStatus === 'late' ? 3 : 1;

      // ✅ استخدم ratings لو موجودة، وإلا default حسب القرار
      const perfScore = decision === 'pass' ? 4 : decision === 'review' ? 3 : 2;
      const criteria = {
        understanding: ratings?.understanding ?? perfScore,
        commitment:    ratings?.commitment    ?? perfScore,
        attendance:    attendanceScore,
        participation: ratings?.participation ?? perfScore,
      };

      await StudentEvaluation.findOneAndUpdate(
        { groupId: session.groupId?._id, studentId },
        {
          groupId:       session.groupId?._id,
          studentId,
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

      // ── تحقق من الرصيد ────────────────────────────────────────────────────
      const remainingHours = student.creditSystem?.currentPackage?.remainingHours ?? 0;
      if (remainingHours <= 0) {
        console.log(`🔕 Student ${studentId} has zero balance — skipping messages`);
        results.push({ studentId, decision, attendanceStatus, messageSent: false, recordingLinkSent: false, skipped: true });
        continue;
      }

      let messageSent       = false;
      let recordingLinkSent = false;

      if (guardianPhone && rendered) {
        try {
          const { wapilotService } = await import('../../../../../services/wapilot-service');

          // ── رسالة 1: تقرير الحصة ─────────────────────────────────────────
          const evalResult = await wapilotService.sendAndLogMessage({
            studentId,
            phoneNumber:    guardianPhone,
            messageContent: rendered,
            messageType:    `evaluation_${decision}`,
            language:       lang,
            metadata: {
              sessionId:        id,
              sessionTitle:     session.title,
              decision,
              attendanceStatus,
              recipientType:    'guardian',
              remainingHours,
              isFallback,
            },
          });
          messageSent = evalResult?.success || false;

          // ── رسالة 2: رابط التسجيل لو موجود ──────────────────────────────
          if (recordingLink?.trim()) {
            const { rendered: recRendered } = await buildRecordingMessage(student, session, recordingLink);

            const linkResult = await wapilotService.sendAndLogMessage({
              studentId,
              phoneNumber:    guardianPhone,
              messageContent: recRendered,
              messageType:    'session_recording',
              language:       lang,
              metadata: {
                sessionId:     id,
                sessionTitle:  session.title,
                recipientType: 'guardian',
                remainingHours,
              },
            });
            recordingLinkSent = linkResult?.success || false;
            console.log(`🎥 Recording link sent to ${studentId}: ${recordingLinkSent}`);
          }

        } catch (err) {
          console.error(`⚠️ Eval messages failed (non-blocking):`, err.message);
        }
      }

      results.push({ studentId, decision, attendanceStatus, messageSent, recordingLinkSent });
    }

    // ✅ أكمل الجلسة
    session.status = 'completed';
    await session.save();

    // ✅ ساعتين للمدرسين (non-blocking)
    try {
      const group = await Group.findById(session.groupId?._id || session.groupId);
      if (group) {
        await group.addInstructorHours(2);
        console.log(`✅ Added 2h to instructors`);
      }
    } catch (err) {
      console.error('⚠️ addInstructorHours failed:', err.message);
    }

    const evalSent = results.filter((r) => r.messageSent).length;
    const linkSent = results.filter((r) => r.recordingLinkSent).length;
    const skipped  = results.filter((r) => r.skipped).length;

    return NextResponse.json({
      success: true,
      message: 'تم حفظ التقييمات وإكمال الجلسة بنجاح',
      data: {
        results,
        sessionCompleted: true,
        summary: { total: results.length, evalSent, linkSent, skipped },
      },
    });
  } catch (error) {
    console.error('❌ [Evaluation PATCH]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}