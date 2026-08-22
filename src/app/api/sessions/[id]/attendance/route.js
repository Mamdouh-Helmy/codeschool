// /api/sessions/[id]/attendance/route.js
// ✅ منطق الخصم (الجديد - أبسط):
// - أول ما تتسجل حالة حضور لطالب في السيشن دي (أي حالة: حاضر/غايب/متأخر/معتذر)
//   → يتخصم ساعتين مرة واحدة بس.
// - أي تعديل بعد كده على نفس الطالب في نفس السيشن (يقلبها لأي حالة تانية)
//   → مفيش أي خصم أو إرجاع تاني. الساعتين ثابتة زي ما هي.
// - يعني الخصم مربوط بـ"هل الطالب متسجل له حضور في السيشن دي قبل كده ولا لأ"
//   مش مربوط بالحالة نفسها.

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Session from '../../../../models/Session';
import Student from '../../../../models/Student';
import Group from '../../../../models/Group'; // مطلوب لتسجيل الـ schema عشان الـ populate يشتغل
import { requireAdmin } from '@/utils/authMiddleware';
import {
  onAttendanceSubmitted,
  sendLowBalanceAlerts,
  disableZeroBalanceNotifications
} from '../../../../services/groupAutomation';
import mongoose from 'mongoose';

// ✅ مهم جدًا: يمنع Next.js من عمل cache للراوت ده (GET أو POST).
// من غيره، ممكن ترجع بيانات قديمة بعد الحفظ لحد ما الـ cache ينتهي لوحده.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const HOURS_PER_SESSION = 2;

export async function POST(req, { params }) {
  try {
    const { id } = await params;

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;
    const adminUser = authCheck.user;

    await connectDB();

    const { attendance, customMessages } = await req.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid session ID format' },
        { status: 400 }
      );
    }

    const session = await Session.findOne({ _id: id, isDeleted: false }).populate('groupId');
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    const group = session.groupId;

    // ── مين اللي أصلاً متسجل له حضور في السيشن دي قبل الحفظة الحالية ─────────
    const alreadyRecordedStudentIds = new Set(
      (session.attendance || []).map((record) => record.studentId.toString())
    );

    const creditDeductions = [];
    const lowBalanceStudents = [];
    const zeroBalanceStudents = [];

    for (const record of attendance) {
      const studentId = record.studentId?.toString();
      const newStatus = record.status;

      // ✅ لو الطالب ده أصلاً متسجل له حضور في السيشن دي من قبل، يبقى اتخصم
      // منه فعلاً ساعتين مهما كانت الحالة القديمة أو الجديدة → متلمسش الرصيد
      if (alreadyRecordedStudentIds.has(studentId)) continue;

      // ✅ أول مرة يتسجل له حضور في السيشن دي → اخصم ساعتين، مهما كانت الحالة
      const student = await Student.findById(studentId);
      if (!student?.creditSystem?.currentPackage) continue;

      const deductionResult = await student.deductCreditHours({
        hours: HOURS_PER_SESSION,
        sessionId: session._id,
        groupId: group._id,
        sessionTitle: session.title,
        groupName: group.name,
        attendanceStatus: newStatus,
        notes: `Attendance recorded: ${newStatus}`
      });

      if (!deductionResult.success) continue;

      const remainingHours = deductionResult.remainingHours;
      creditDeductions.push({
        studentId,
        action: 'deduct',
        hoursDeducted: HOURS_PER_SESSION,
        remainingHours,
        reason: `First record for this session: ${newStatus}`
      });

      if (remainingHours <= 5 && remainingHours > 0) {
        lowBalanceStudents.push({ studentId, student, remainingHours });
      }
      if (remainingHours <= 0) {
        zeroBalanceStudents.push({ studentId, student, remainingHours: 0 });
      }
    }

    if (lowBalanceStudents.length > 0) {
      try {
        await sendLowBalanceAlerts(lowBalanceStudents);
      } catch (err) {
        console.error('Low balance alerts error:', err);
      }
    }

    if (zeroBalanceStudents.length > 0) {
      try {
        await disableZeroBalanceNotifications(zeroBalanceStudents);
      } catch (err) {
        console.error('Disable notifications error:', err);
      }
    }

    // ── حفظ الحضور الجديد على الجلسة (الحالة نفسها بتتحدث دايمًا حتى لو
    //    الرصيد متلمسش) ────────────────────────────────────────────────────
    const attendanceRecords = attendance.map((record) => ({
      studentId: record.studentId,
      status: record.status,
      notes: record.notes || '',
      markedAt: new Date(),
      markedBy: adminUser.id
    }));

    const updatedSession = await Session.findByIdAndUpdate(
      id,
      {
        $set: {
          attendance: attendanceRecords,
          attendanceTaken: true,
          'metadata.updatedBy': adminUser.id,
          'metadata.updatedAt': new Date()
        }
      },
      { new: true }
    );

    // ── إشعارات الغياب/التأخير/الاعتذار ─────────────────────────────────────
    let automationResult = { successCount: 0, failCount: 0 };
    const studentsNeedingMessages = attendance.filter((r) =>
      ['absent', 'late', 'excused'].includes(r.status)
    );

    if (studentsNeedingMessages.length > 0) {
      try {
        automationResult = await onAttendanceSubmitted(id, customMessages || {});
      } catch (err) {
        console.error('Automation error:', err);
      }
    }

    const stats = {
      total: attendanceRecords.length,
      present: attendanceRecords.filter((a) => a.status === 'present').length,
      absent: attendanceRecords.filter((a) => a.status === 'absent').length,
      late: attendanceRecords.filter((a) => a.status === 'late').length,
      excused: attendanceRecords.filter((a) => a.status === 'excused').length
    };

    return NextResponse.json({
      success: true,
      message: 'Attendance submitted successfully',
      data: {
        sessionId: updatedSession._id,
        sessionTitle: updatedSession.title,
        stats
      },
      creditUpdates: {
        deductions: creditDeductions,
        lowBalanceAlerts: lowBalanceStudents.length,
        zeroBalanceAlerts: zeroBalanceStudents.length
      },
      automation: {
        completed: automationResult.success !== false,
        notificationsSent: automationResult.successCount || 0,
        notificationsFailed: automationResult.failCount || 0,
        customMessagesUsed: Object.keys(customMessages || {}).length
      }
    });
  } catch (error) {
    console.error('Attendance POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { id } = await params;

    // ── جلسة واحدة بس، بكل الـ populate اللي محتاجينه ─────────────────────────
    const session = await Session.findOne({ _id: id, isDeleted: false })
      .populate('groupId', 'name code')
      .populate('attendance.studentId', '_id')
      .lean();

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    const groupStudents = await Student.find({
      'academicInfo.groupIds': session.groupId._id,
      isDeleted: false
    })
      .select('personalInfo guardianInfo communicationPreferences enrollmentNumber creditSystem')
      .lean();

    const attendanceMap = new Map();
    const attendance = [];
    (session.attendance || []).forEach((record) => {
      if (!record.studentId) return;
      const studentId = record.studentId._id.toString();
      attendanceMap.set(studentId, { status: record.status, notes: record.notes || '' });
      attendance.push({
        studentId: record.studentId._id,
        status: record.status,
        notes: record.notes || '',
        markedAt: record.markedAt,
        markedBy: record.markedBy
      });
    });

    const students = groupStudents.map((student) => {
      const attendanceRecord = attendanceMap.get(student._id.toString());

      const creditSystem = student.creditSystem || {
        currentPackage: null,
        status: 'no_package',
        stats: { totalHoursPurchased: 0, totalHoursUsed: 0, totalHoursRemaining: 0 }
      };
      if (!creditSystem.currentPackage) {
        creditSystem.currentPackage = {
          remainingHours: 0,
          totalHours: 0,
          packageType: null,
          status: 'inactive'
        };
      }

      return {
        _id: student._id,
        id: student._id,
        enrollmentNumber: student.enrollmentNumber || '',
        personalInfo: student.personalInfo || {},
        guardianInfo: student.guardianInfo || {},
        communicationPreferences: student.communicationPreferences || { preferredLanguage: 'ar' },
        creditSystem,
        attendanceStatus: attendanceRecord?.status || null,
        attendanceNotes: attendanceRecord?.notes || ''
      };
    });

    const stats = {
      total: students.length,
      present: attendance.filter((a) => a.status === 'present').length,
      absent: attendance.filter((a) => a.status === 'absent').length,
      late: attendance.filter((a) => a.status === 'late').length,
      excused: attendance.filter((a) => a.status === 'excused').length
    };

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session._id,
        sessionTitle: session.title,
        scheduledDate: session.scheduledDate,
        attendanceTaken: session.attendanceTaken || false,
        attendance,
        students,
        stats,
        group: session.groupId
      }
    });
  } catch (error) {
    console.error('Attendance GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}