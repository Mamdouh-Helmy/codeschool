//api/instructor/sessions/[id]/attendance/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import {
  getAttendanceTemplatesForFrontend,
  sendAbsenceNotifications,
} from '../../../../../services/groupAutomation';
import Session from '../../../../../models/Session';
import Student from '../../../../../models/Student';

// ─── Constants ───────────────────────────────────────────
// ⚠️ مهم جدًا: present / late / absent / excused كلهم في نفس الـ array دي —
// يعني كلهم "معدودين" بنفس المستوى بالنسبة لمنطق الخصم تحت. الأثر العملي:
// لو الطالب اتسجل بأي حالة منهم قبل كده وبعدين اتغيرت لحالة تانية من نفس
// الـ array (مثلاً من "حاضر" لـ "غايب" أو العكس)، مفيش أي خصم إضافي ولا
// استرجاع بيحصل — لأنه أصلاً كان "محسوب" وبقى "محسوب"، بس بقيمة مختلفة.
// الخصم بيحصل مرة واحدة بس: أول مرة تتسجل حالة للطالب في الجلسة دي
// (null → أي حالة من دول). لو حبيت مستقبلاً تضيف status جديد لازم يترسم
// بوضوح هل هو "محسوب" (يتضاف هنا) ولا لأ، وإلا هتفتح باب لخصم/استرجاع غير
// متوقع.
const DEDUCT_STATUSES = ['present', 'late', 'absent', 'excused'];
const CREDIT_DEDUCTION = 2;

// ─── GET ─────────────────────────────────────────────────
export async function GET(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ success: false }, { status: 401 });

    await connectDB();
    const { id } = await params;

    const session = await Session.findById(id)
      .populate({ path: 'groupId', select: 'name code students instructors' })
      .lean();

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    const studentIds = (session.groupId?.students || []).map(s => s.studentId || s);

    const students = await Student.find({ _id: { $in: studentIds } })
      .select(
        '_id enrollmentNumber personalInfo.fullName personalInfo.gender personalInfo.nickname ' +
        'guardianInfo.name guardianInfo.phone guardianInfo.whatsappNumber guardianInfo.relationship guardianInfo.nickname ' +
        'communicationPreferences.preferredLanguage creditSystem.currentPackage.remainingHours creditSystem.status whatsappMessages'
      )
      .lean();

    const existingAttendance = {};
    (session.attendance || []).forEach(a => {
      existingAttendance[a.studentId?.toString()] = a.status;
    });

    const studentsWithAttendance = students.map(s => {
      const absenceMessages = (s.whatsappMessages || []).filter(
        m => m.messageType === 'absence_notification'
      );

      return {
        _id:                s._id,
        name:               s.personalInfo?.fullName || 'بدون اسم',
        enrollmentNumber:   s.enrollmentNumber || '',

        nicknameAr:         s.personalInfo?.nickname?.ar?.trim() || '',
        nicknameEn:         s.personalInfo?.nickname?.en?.trim() || '',

        guardianNicknameAr: s.guardianInfo?.nickname?.ar?.trim() || '',
        guardianNicknameEn: s.guardianInfo?.nickname?.en?.trim() || '',

        gender:             s.personalInfo?.gender || 'male',

        guardianName:         s.guardianInfo?.name || '',
        guardianPhone:        s.guardianInfo?.phone || s.guardianInfo?.whatsappNumber || '',
        guardianRelationship: s.guardianInfo?.relationship || 'father',

        preferredLanguage: s.communicationPreferences?.preferredLanguage || 'ar',
        credits:           s.creditSystem?.currentPackage?.remainingHours ?? 0,
        creditStatus:      s.creditSystem?.status || 'no_package',

        absenceCount:  absenceMessages.length,
        currentStatus: existingAttendance[s._id.toString()] || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: { session, students: studentsWithAttendance },
    });

  } catch (error) {
    console.error('❌ GET attendance error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── POST (preview template أو إرسال فوري) ────────────────
export async function POST(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ success: false }, { status: 401 });

    await connectDB();
    const { id } = await params;

    let body = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const { attendanceStatus, studentId, extraData = {}, sendNow = false } = body;

    if (!studentId || !attendanceStatus) {
      return NextResponse.json(
        { success: false, error: 'studentId and attendanceStatus are required' },
        { status: 400 }
      );
    }

    // 🆕 sendNow: إرسال فوري لرسالة الواتساب بس — بدون أي لمس لـ attendance
    // بتاع السيشن ولا لأي ساعات credits. مستخدم في خطوة "الحضور المبدئي" لما
    // المدرس يحدد طالب "متأخر": الرسالة تتبعت فورًا لولي الأمر، وفي نفس
    // الوقت "متأخر" هنا مابيتسجلش خالص في الـ DB ولا بيخصم أي ساعات — الخصم
    // بيحصل بس في خطوة التأكيد النهائي (present/absent/excused) عبر الـ
    // PATCH تحت. ✅ ده هو الضمان إن "الحضور المبدئي" مش بيحسب ساعات خالص.
    if (sendNow) {
      try {
        await sendAbsenceNotifications(id, [{ studentId, status: attendanceStatus }]);
        return NextResponse.json({ success: true, data: { sent: true } });
      } catch (sendError) {
        console.error('❌ [sendNow] notification error:', sendError);
        return NextResponse.json(
          { success: false, error: sendError.message || 'Failed to send notification' },
          { status: 500 }
        );
      }
    }

    const [student, session] = await Promise.all([
      Student.findById(studentId)
        .select('personalInfo guardianInfo communicationPreferences enrollmentNumber creditSystem')
        .lean(),
      Session.findById(id)
        .populate({ path: 'groupId', select: 'name code' })
        .lean(),
    ]);

    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const templates = await getAttendanceTemplatesForFrontend(
      attendanceStatus,
      studentId,
      extraData
    );

    const metadata = {
      language:     student.communicationPreferences?.preferredLanguage || 'ar',
      gender:       student.personalInfo?.gender || 'male',
      relationship: student.guardianInfo?.relationship || 'father',

      studentFullName:  student.personalInfo?.fullName || '',
      guardianFullName: student.guardianInfo?.name || '',

      studentNicknameAr:  student.personalInfo?.nickname?.ar?.trim() || '',
      studentNicknameEn:  student.personalInfo?.nickname?.en?.trim() || '',
      guardianNicknameAr: student.guardianInfo?.nickname?.ar?.trim() || '',
      guardianNicknameEn: student.guardianInfo?.nickname?.en?.trim() || '',

      enrollmentNumber: student.enrollmentNumber || '',

      sessionTitle:  session?.title || '',
      scheduledDate: session?.scheduledDate || null,
      startTime:     session?.startTime || '',
      endTime:       session?.endTime || '',
      groupName:     session?.groupId?.name || '',
      groupCode:     session?.groupId?.code || '',
      meetingLink:   session?.meetingLink || '',
    };

    return NextResponse.json({
      success: true,
      data: {
        guardian: templates?.guardian
          ? {
              content:    templates.guardian.content,
              isFallback: templates.guardian.isFallback,
            }
          : null,
        metadata,
      },
    });

  } catch (error) {
    console.error('❌ POST attendance preview error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── PATCH (save attendance + credits) ───────────────────
// 🔒 ضمان "خصم مرة واحدة بس": الخصم/الاسترجاع بيتحدد بمقارنة oldStatus
// (المسجل فعليًا في الـ DB قبل الطلب ده) مع newStatus. بما إن present/late/
// absent/excused كلهم موجودين في DEDUCT_STATUSES، فالتبديل بينهم (حاضر ↔
// غايب ↔ معذور) — حتى لو حصل كذا مرة عبر submits مختلفة — بيدي creditAction
// = 'nothing' كل مرة، لأن "كان محسوب" و"لسه محسوب" في الحالتين. الخصم بيحصل
// مرة واحدة بس لما الحالة تتسجل لأول مرة (من null). شوف مثال:
//   1) submit "غايب" (oldStatus=null)      → deduct (خصم -2)
//   2) submit "حاضر" (oldStatus="absent")  → nothing (مفيش تغيير في الساعات)
//   3) submit "معذور" (oldStatus="present")→ nothing (برضو مفيش تغيير)
// الساعات المخصومة فضلت 2 بس طول الوقت، مهما اتبدلت الحالة بين التلاتة دول.
export async function PATCH(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ success: false }, { status: 401 });

    await connectDB();
    const { id } = await params;

    let body = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const { attendanceRecords } = body;

    if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'attendanceRecords array is required' },
        { status: 400 }
      );
    }

    const session = await Session.findById(id).populate({
      path: 'groupId',
      select: 'name instructors students',
    });

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    // 📌 oldStatusSnapshot بيتبنى من الـ DB الفعلي (مش من أي حاجة جايه من
    // الفرونت إند) — ده اللي بيمنع أي تلاعب أو تضارب لو الفرونت إند بعت
    // بيانات قديمة أو المستخدم فتح تابين اتنين.
    const oldStatusSnapshot = {};
    session.attendance.forEach(a => {
      oldStatusSnapshot[a.studentId?.toString()] = a.status;
    });

    const studentIds = attendanceRecords.map(r => r.studentId);
    const students   = await Student.find({ _id: { $in: studentIds } });
    const studentMap = {};
    students.forEach(s => { studentMap[s._id.toString()] = s; });

    const results    = [];
    const notifyList = [];

    for (const record of attendanceRecords) {
      const { studentId, status: newStatus } = record;
      const oldStatus = oldStatusSnapshot[studentId] || null;

      // ✅ لو الحالة متغيرتش، منعملش أي حاجة خالص — لا تسجيل ولا خصم/استرجاع.
      if (oldStatus === newStatus) {
        results.push({
          studentId,
          oldStatus,
          newStatus,
          action: 'no_change',
          creditAction: 'nothing',
        });
        continue;
      }

      const existing = session.attendance.find(
        a => a.studentId?.toString() === studentId
      );
      if (existing) {
        existing.status = newStatus;
      } else {
        session.attendance.push({ studentId, status: newStatus });
      }

      // 🔒 هنا بالظبط بيتحدد هل نخصم ساعتين، نرجعهم، ولا مفيش أي تغيير.
      // present/absent/excused (الحالات التلاتة المتاحة في التأكيد النهائي)
      // كلهم في DEDUCT_STATUSES، فالتبديل بينهم دايمًا بيدي 'nothing'.
      const wasDeducting = oldStatus !== null && DEDUCT_STATUSES.includes(oldStatus);
      const willDeduct   = DEDUCT_STATUSES.includes(newStatus);

      let creditAction = 'nothing';
      if (!wasDeducting && willDeduct)  creditAction = 'deduct';   // أول تسجيل بس (null → حالة)
      if (wasDeducting  && !willDeduct) creditAction = 'refund';   // مش وارد يحصل من واجهة التأكيد النهائي حاليًا

      const student = studentMap[studentId];
      if (student && creditAction !== 'nothing') {
        if (creditAction === 'deduct') {
          await student.deductCreditHours({
            hours:            CREDIT_DEDUCTION,
            sessionId:        id,
            sessionTitle:     session.title || '',
            groupId:          session.groupId?._id,
            groupName:        session.groupId?.name || '',
            attendanceStatus: newStatus,
            notes:            `Attendance: ${oldStatus || 'none'} → ${newStatus}`,
          });
        } else {
          await student.addCreditHours({
            hours:        CREDIT_DEDUCTION,
            sessionId:    id,
            sessionTitle: session.title || '',
            groupId:      session.groupId?._id,
            groupName:    session.groupId?.name || '',
            reason:       `Attendance changed: ${oldStatus} → ${newStatus}`,
          });
        }
      }

      results.push({ studentId, oldStatus, newStatus, action: 'updated', creditAction });

      if (['absent', 'late', 'excused'].includes(newStatus)) {
        notifyList.push({ studentId, status: newStatus });
      }
    }

    session.attendanceTaken = true;

    if (session.earlyAccess?.enabled && !session.earlyAccess?.consumedAt) {
      session.earlyAccess.consumedAt = new Date();
    }

    await session.save();

    if (notifyList.length) {
      await sendAbsenceNotifications(id, notifyList);
    }

    return NextResponse.json({
      success: true,
      data: { results },
    });

  } catch (error) {
    console.error('❌ PATCH attendance error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}