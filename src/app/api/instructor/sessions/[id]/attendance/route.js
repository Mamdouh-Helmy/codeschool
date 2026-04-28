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
const DEDUCT_STATUSES = ['present', 'late'];
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

// ─── POST (preview template) ──────────────────────────────
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

    const { attendanceStatus, studentId, extraData = {} } = body;

    if (!studentId || !attendanceStatus) {
      return NextResponse.json(
        { success: false, error: 'studentId and attendanceStatus are required' },
        { status: 400 }
      );
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

    // ── snapshot من old statuses قبل أي تعديل ────────────────
    // مهم: نحفظه قبل الـ loop عشان لو نفس الطالب اتبعت مرتين
    // الـ oldStatus يفضل الأصلي من DB مش المتغير
    const oldStatusSnapshot = {};
    session.attendance.forEach(a => {
      oldStatusSnapshot[a.studentId?.toString()] = a.status;
    });

    // ── جيب كل الـ students دفعة واحدة ──────────────────────
    const studentIds = attendanceRecords.map(r => r.studentId);
    const students   = await Student.find({ _id: { $in: studentIds } });
    const studentMap = {};
    students.forEach(s => { studentMap[s._id.toString()] = s; });

    const results    = [];
    const notifyList = [];

    for (const record of attendanceRecords) {
      const { studentId, status: newStatus } = record;

      // ── old status من الـ snapshot (الأصلي من DB) ────────────
      const oldStatus = oldStatusSnapshot[studentId] || null;

      // ── لو مفيش تغيير فعلي، تجاهل ───────────────────────────
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

      // ── حدّث attendance في الـ session ───────────────────────
      const existing = session.attendance.find(
        a => a.studentId?.toString() === studentId
      );
      if (existing) {
        existing.status = newStatus;
      } else {
        session.attendance.push({ studentId, status: newStatus });
      }

      // ── حسب credit action: old vs new فقط ────────────────────
      // المنطق:
      // null/غائب/معذور → حاضر/متأخر  = deduct 2
      // حاضر/متأخر      → غائب/معذور  = refund 2
      // حاضر             → متأخر       = nothing (الاتنين deducting)
      // غائب             → معذور       = nothing (الاتنين مش deducting)
      const wasDeducting = oldStatus !== null && DEDUCT_STATUSES.includes(oldStatus);
      const willDeduct   = DEDUCT_STATUSES.includes(newStatus);

      let creditAction = 'nothing';
      if (!wasDeducting && willDeduct)  creditAction = 'deduct';
      if (wasDeducting  && !willDeduct) creditAction = 'refund';

      // ── نفّذ الخصم أو الإرجاع ────────────────────────────────
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

      // ── إشعارات الغياب/التأخير/المعذور ───────────────────────
      if (['absent', 'late', 'excused'].includes(newStatus)) {
        notifyList.push({ studentId, status: newStatus });
      }
    }

    session.attendanceTaken = true;
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