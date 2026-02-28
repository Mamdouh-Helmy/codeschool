// /api/sessions/[id]/attendance/route.js
// ✅ منطق الخصم:
// - حاضر / متأخر  → خصم ساعتين (مرة واحدة فقط للسيشن)
// - غائب / معتذر  → مفيش خصم
// - لو رجع من حاضر → متأخر: مفيش خصم تاني
// - لو رجع من حاضر → غائب: إرجاع الساعتين
// - لو رجع من غايب → حاضر: خصم ساعتين

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Session from '../../../../models/Session';
import Student from '../../../../models/Student';
import Group from '../../../../models/Group';
import { requireAdmin } from '@/utils/authMiddleware';
import {
  onAttendanceSubmitted,
  sendLowBalanceAlerts,
  disableZeroBalanceNotifications
} from '../../../../services/groupAutomation';
import mongoose from 'mongoose';

// ✅ Helper: هل الحالة "يخصم" ساعات؟
const isDeductibleStatus = (status) => ['present', 'late'].includes(status);

// ✅ Helper: هل الحالة "ما تخصمش" ساعات؟
const isNonDeductibleStatus = (status) => ['absent', 'excused'].includes(status);

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    console.log(`\n🎯 ATTENDANCE SUBMISSION ==========`);
    console.log(`📋 Session ID: ${id}`);

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const adminUser = authCheck.user;
    await connectDB();

    const { attendance, customMessages } = await req.json();
    console.log(`📊 Attendance Records: ${attendance?.length || 0}`);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid session ID format' },
        { status: 400 }
      );
    }

    const session = await Session.findOne({ _id: id, isDeleted: false })
      .populate('groupId');

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    const group = session.groupId;

    // ✅ بناء Map للحضور السابق (الموجود في DB قبل هذه العملية)
    const previousAttendanceMap = new Map();
    (session.attendance || []).forEach(record => {
      previousAttendanceMap.set(
        record.studentId.toString(),
        record.status
      );
    });

    const creditDeductions = [];
    const lowBalanceStudents = [];
    const zeroBalanceStudents = [];

    for (const record of attendance) {
      const studentId = record.studentId?.toString();
      const newStatus = record.status;
      const previousStatus = previousAttendanceMap.get(studentId) || null;

      console.log(`\n👤 Student: ${studentId}`);
      console.log(`   Previous: ${previousStatus || 'none (first time)'} → New: ${newStatus}`);

      // ✅ لو الحالة ماتغيرتش خالص، skip
      if (previousStatus === newStatus) {
        console.log(`   ⏭️ No change, skipping`);
        continue;
      }

      // ✅ تحديد نوع التغيير المطلوب في الساعات
      let hoursChange = 0; // موجب = إضافة، سالب = خصم

      if (!previousStatus) {
        // ===== أول مرة تتسجل للسيشن دي =====
        if (isDeductibleStatus(newStatus)) {
          hoursChange = -2; // خصم ساعتين
        }
        // لو غايب أو معتذر من أول وهلة → مفيش خصم
      } else if (isNonDeductibleStatus(previousStatus) && isDeductibleStatus(newStatus)) {
        // ===== من (غايب/معتذر) → (حاضر/متأخر) =====
        // = بدأ يحضر بعد ما كان غايب → خصم ساعتين
        hoursChange = -2;
      } else if (isDeductibleStatus(previousStatus) && isNonDeductibleStatus(newStatus)) {
        // ===== من (حاضر/متأخر) → (غايب/معتذر) =====
        // = كان بيحضر والآن بقى غايب → رجّع الساعتين
        hoursChange = +2;
      } else if (isDeductibleStatus(previousStatus) && isDeductibleStatus(newStatus)) {
        // ===== من (حاضر → متأخر) أو (متأخر → حاضر) =====
        // = الاتنين بيخصموا → مفيش خصم إضافي
        hoursChange = 0;
        console.log(`   ✅ Both statuses deductible (present↔late), no extra charge`);
      } else if (isNonDeductibleStatus(previousStatus) && isNonDeductibleStatus(newStatus)) {
        // ===== من (غايب → معتذر) أو (معتذر → غايب) =====
        // = الاتنين ماتخصموش → مفيش تغيير
        hoursChange = 0;
        console.log(`   ✅ Both statuses non-deductible, no change`);
      }

      console.log(`   💰 Hours change: ${hoursChange > 0 ? '+' : ''}${hoursChange}`);

      if (hoursChange === 0) continue;

      // ✅ جيب الطالب من DB
      const student = await Student.findById(studentId);
      if (!student) {
        console.log(`   ❌ Student not found`);
        continue;
      }

      if (!student.creditSystem?.currentPackage) {
        console.log(`   ⚠️ No active package for student`);
        continue;
      }

      if (hoursChange < 0) {
        // ===== خصم ساعتين =====
        const hoursToDeduct = Math.abs(hoursChange);
        const effectiveRemaining = student.getEffectiveRemainingHours();

        console.log(`   📊 Effective remaining: ${effectiveRemaining}h`);

        if (effectiveRemaining < hoursToDeduct) {
          console.log(`   ⚠️ Insufficient hours (${effectiveRemaining}h < ${hoursToDeduct}h) - proceeding anyway with zero`);
        }

        const deductionResult = await student.deductCreditHours({
          hours: hoursToDeduct,
          sessionId: session._id,
          groupId: group._id,
          sessionTitle: session.title,
          groupName: group.name,
          attendanceStatus: newStatus,
          notes: `Attendance: ${previousStatus || 'first_time'} → ${newStatus}`
        });

        if (deductionResult.success) {
          const newRemaining = deductionResult.remainingHours;
          creditDeductions.push({
            studentId,
            action: 'deduct',
            hoursDeducted: hoursToDeduct,
            remainingHours: newRemaining,
            reason: `${previousStatus || 'new'} → ${newStatus}`
          });

          console.log(`   ✅ Deducted ${hoursToDeduct}h → remaining: ${newRemaining}h`);

          // ✅ تحذير رصيد منخفض
          if (newRemaining <= 5 && newRemaining > 0) {
            lowBalanceStudents.push({ studentId, student, remainingHours: newRemaining });
          }

          // ✅ تعطيل الإشعارات لو الرصيد صفر
          if (newRemaining <= 0) {
            zeroBalanceStudents.push({ studentId, student, remainingHours: 0 });
          }
        } else {
          console.log(`   ❌ Deduction failed: ${deductionResult.error}`);
        }

      } else {
        // ===== إرجاع ساعتين (كان حاضر والآن غايب) =====
        const hoursToReturn = hoursChange;
        const currentPkg = student.creditSystem.currentPackage;

        currentPkg.remainingHours += hoursToReturn;
        student.creditSystem.stats.totalHoursRemaining = student.getEffectiveRemainingHours();
        student.creditSystem.stats.totalHoursUsed = Math.max(
          0,
          (student.creditSystem.stats.totalHoursUsed || 0) - hoursToReturn
        );
        student.creditSystem.stats.totalSessionsAttended = Math.max(
          0,
          (student.creditSystem.stats.totalSessionsAttended || 0) - 1
        );

        // ✅ لو الرصيد عاد للحياة، فعّل الإشعارات
        if (currentPkg.remainingHours > 0 &&
          student.communicationPreferences?.notificationChannels) {
          student.communicationPreferences.notificationChannels.whatsapp = true;
          if (currentPkg.status === 'completed') {
            currentPkg.status = 'active';
            student.creditSystem.status = 'active';
          }
        }

        // ✅ سجّل في usageHistory
        if (!student.creditSystem.usageHistory) student.creditSystem.usageHistory = [];
        student.creditSystem.usageHistory.push({
          sessionId: session._id,
          groupId: group._id,
          date: new Date(),
          hoursDeducted: -hoursToReturn, // سالب = إرجاع
          sessionTitle: session.title,
          groupName: group.name,
          attendanceStatus: 'refund',
          notes: `Refund: ${previousStatus} → ${newStatus}`,
          deductedFromExceptions: 0,
          deductedFromPackage: hoursToReturn
        });

        await student.save();

        creditDeductions.push({
          studentId,
          action: 'refund',
          hoursReturned: hoursToReturn,
          remainingHours: currentPkg.remainingHours,
          reason: `${previousStatus} → ${newStatus}`
        });

        console.log(`   ✅ Returned ${hoursToReturn}h → remaining: ${currentPkg.remainingHours}h`);
      }
    }

    // ✅ تنبيهات رصيد منخفض
    if (lowBalanceStudents.length > 0) {
      console.log(`\n⚠️ Sending low balance alerts for ${lowBalanceStudents.length} students`);
      try {
        await sendLowBalanceAlerts(lowBalanceStudents);
      } catch (err) {
        console.error(`❌ Low balance alerts error:`, err);
      }
    }

    // ✅ تعطيل إشعارات الرصيد صفر
    if (zeroBalanceStudents.length > 0) {
      console.log(`\n🔕 Disabling notifications for ${zeroBalanceStudents.length} students`);
      try {
        await disableZeroBalanceNotifications(zeroBalanceStudents);
      } catch (err) {
        console.error(`❌ Disable notifications error:`, err);
      }
    }

    // ✅ حفظ الغياب في DB
    const attendanceRecords = attendance.map(record => ({
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

    console.log(`\n✅ Attendance saved successfully`);

    // ✅ إرسال إشعارات الغياب
    let automationResult = { successCount: 0, failCount: 0 };
    const studentsNeedingMessages = attendance.filter(r =>
      ['absent', 'late', 'excused'].includes(r.status)
    );

    if (studentsNeedingMessages.length > 0) {
      console.log(`📤 Triggering notifications for ${studentsNeedingMessages.length} students...`);
      try {
        automationResult = await onAttendanceSubmitted(id, customMessages || {});
      } catch (err) {
        console.error(`❌ Automation error:`, err);
      }
    }

    const stats = {
      total: attendanceRecords.length,
      present: attendanceRecords.filter(a => a.status === 'present').length,
      absent: attendanceRecords.filter(a => a.status === 'absent').length,
      late: attendanceRecords.filter(a => a.status === 'late').length,
      excused: attendanceRecords.filter(a => a.status === 'excused').length
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
    console.error('❌ Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    await connectDB();

    const { id } = await params;

    const session = await Session.findOne({ _id: id, isDeleted: false })
      .populate('groupId', 'name code')
      .lean();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // ✅ الطلاب من المجموعة مع الرصيد
    const groupStudents = await Student.find({
      'academicInfo.groupIds': session.groupId._id,
      isDeleted: false
    })
      .select('personalInfo guardianInfo communicationPreferences enrollmentNumber creditSystem')
      .lean();

    const fullSession = await Session.findOne({ _id: id, isDeleted: false })
      .populate({ path: 'attendance.studentId', select: '_id' })
      .lean();

    const attendanceMap = new Map();
    if (fullSession?.attendance) {
      fullSession.attendance.forEach(record => {
        if (record.studentId) {
          attendanceMap.set(record.studentId._id.toString(), {
            status: record.status,
            notes: record.notes || ''
          });
        }
      });
    }

    const students = groupStudents.map(student => {
      const attendanceRecord = attendanceMap.get(student._id.toString());

      if (!student.creditSystem) {
        student.creditSystem = {
          currentPackage: null,
          status: 'no_package',
          stats: { totalHoursPurchased: 0, totalHoursUsed: 0, totalHoursRemaining: 0 }
        };
      }

      if (!student.creditSystem.currentPackage) {
        student.creditSystem.currentPackage = {
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
        creditSystem: student.creditSystem,
        attendanceStatus: attendanceRecord?.status || null,
        attendanceNotes: attendanceRecord?.notes || ''
      };
    });

    const attendance = [];
    if (fullSession?.attendance) {
      fullSession.attendance.forEach(record => {
        if (record.studentId) {
          attendance.push({
            studentId: record.studentId._id,
            status: record.status,
            notes: record.notes || '',
            markedAt: record.markedAt,
            markedBy: record.markedBy
          });
        }
      });
    }

    const stats = {
      total: students.length,
      present: attendance.filter(a => a.status === 'present').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      late: attendance.filter(a => a.status === 'late').length,
      excused: attendance.filter(a => a.status === 'excused').length
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
    console.error('❌ Error fetching attendance:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}