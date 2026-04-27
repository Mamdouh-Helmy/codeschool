import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import {
  getAttendanceTemplatesForFrontend,
  sendAbsenceNotifications,
  sendLowBalanceAlerts,
  disableZeroBalanceNotifications,
} from '../../../../../services/groupAutomation';
import Session from '../../../../../models/Session';
import Student from '../../../../../models/Student';

// ─── Helpers ─────────────────────────────────────────────

const DEDUCT_STATUSES = ['present', 'late'];
const CREDIT_DEDUCTION = 2;

function getCreditAction(oldStatus, newStatus) {
  const wasDeducting = oldStatus && DEDUCT_STATUSES.includes(oldStatus);
  const willDeduct   = DEDUCT_STATUSES.includes(newStatus);

  if (!wasDeducting && willDeduct) return 'deduct';
  if (wasDeducting && !willDeduct) return 'refund';
  return 'nothing';
}

// ─── GET ────────────────────────────────────────────────
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
      return NextResponse.json({ success: false }, { status: 404 });
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
        _id: s._id,
        name: s.personalInfo?.fullName || 'بدون اسم',
        enrollmentNumber: s.enrollmentNumber || '',

        nicknameAr: s.personalInfo?.nickname?.ar?.trim() || '',
        nicknameEn: s.personalInfo?.nickname?.en?.trim() || '',

        guardianNicknameAr: s.guardianInfo?.nickname?.ar?.trim() || '',
        guardianNicknameEn: s.guardianInfo?.nickname?.en?.trim() || '',

        gender: s.personalInfo?.gender || 'male',

        guardianName: s.guardianInfo?.name || '',
        guardianPhone: s.guardianInfo?.phone || s.guardianInfo?.whatsappNumber || '',
        guardianRelationship: s.guardianInfo?.relationship || 'father',

        preferredLanguage: s.communicationPreferences?.preferredLanguage || 'ar',
        credits: s.creditSystem?.currentPackage?.remainingHours ?? 0,
        creditStatus: s.creditSystem?.status || 'no_package',

        absenceCount: absenceMessages.length,
        currentStatus: existingAttendance[s._id.toString()] || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        session,
        students: studentsWithAttendance,
      },
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── POST ───────────────────────────────────────────────
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
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const { attendanceStatus, studentId, extraData = {} } = body;

    const [student, session] = await Promise.all([
      Student.findById(studentId).select(
        'personalInfo guardianInfo communicationPreferences enrollmentNumber creditSystem'
      ).lean(),
      Session.findById(id).populate({ path: 'groupId', select: 'name code' }).lean(),
    ]);

    const templates = await getAttendanceTemplatesForFrontend(
      attendanceStatus,
      studentId,
      extraData
    );

    const metadata = {
      language: student.communicationPreferences?.preferredLanguage || 'ar',
      gender: student.personalInfo?.gender || 'male',
      relationship: student.guardianInfo?.relationship || 'father',

      studentFullName: student.personalInfo?.fullName || '',
      guardianFullName: student.guardianInfo?.name || '',

      studentNicknameAr: student.personalInfo?.nickname?.ar?.trim() || '',
      studentNicknameEn: student.personalInfo?.nickname?.en?.trim() || '',
      guardianNicknameAr: student.guardianInfo?.nickname?.ar?.trim() || '',
      guardianNicknameEn: student.guardianInfo?.nickname?.en?.trim() || '',

      enrollmentNumber: student.enrollmentNumber || '',

      sessionTitle: session?.title || '',
      scheduledDate: session?.scheduledDate || null,
      startTime: session?.startTime || '',
      endTime: session?.endTime || '',
      groupName: session?.groupId?.name || '',
      groupCode: session?.groupId?.code || '',
      meetingLink: session?.meetingLink || '',
    };

    return NextResponse.json({
      success: true,
      data: {
        guardian: templates?.guardian
          ? {
              content: templates.guardian.content,
              isFallback: templates.guardian.isFallback,
            }
          : null,
        metadata,
      },
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── PATCH (بدون تغيير منطقي كبير) ──────────────────────
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
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const { attendanceRecords } = body;

    const session = await Session.findById(id).populate({
      path: 'groupId',
      select: 'name instructors students',
    });

    const results = [];
    const notifyList = [];
    const lowBalanceList = [];
    const zeroBalanceList = [];

    for (const record of attendanceRecords) {
      const { studentId, status: newStatus } = record;

      const existing = session.attendance.find(
        a => a.studentId?.toString() === studentId
      );

      const oldStatus = existing?.status || null;
      const action = getCreditAction(oldStatus, newStatus);

      if (existing) {
        existing.status = newStatus;
      } else {
        session.attendance.push({ studentId, status: newStatus });
      }

      results.push({ studentId, oldStatus, newStatus, action });

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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
