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
    console.log(`💬 Custom Messages: ${customMessages ? Object.keys(customMessages).length : 0}`);

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

    // ✅ التحقق من وجود attendance سابق لهذه الجلسة
    const previousAttendance = session.attendance || [];
    
    // ✅ إنشاء Map للحضور السابق للوصول السريع
    const previousAttendanceMap = new Map();
    previousAttendance.forEach(record => {
      previousAttendanceMap.set(
        record.studentId.toString(), 
        record.status
      );
    });

    // ✅ معالجة الساعات للطلاب
    const creditDeductions = [];
    const lowBalanceStudents = [];
    const zeroBalanceStudents = [];

    for (const record of attendance) {
      const studentId = record.studentId;
      const newStatus = record.status;
      const previousStatus = previousAttendanceMap.get(studentId);

      // ✅ التحقق من وجود تغيير في الحالة
      if (previousStatus && previousStatus === newStatus) {
        console.log(`⏭️ No change for student ${studentId}: ${previousStatus} -> ${newStatus}`);
        continue;
      }

      console.log(`🔄 Status change for student ${studentId}: ${previousStatus || 'new'} -> ${newStatus}`);

      // ✅ جلب الطالب من قاعدة البيانات
      const student = await Student.findById(studentId);
      if (!student) {
        console.log(`❌ Student not found: ${studentId}`);
        continue;
      }

      // ✅ التحقق من وجود حزمة ساعات نشطة
      if (!student.creditSystem?.currentPackage) {
        console.log(`⚠️ Student ${studentId} has no active package`);
        continue;
      }

      // ✅ حساب الرصيد الفعلي قبل التغيير
      const effectiveRemaining = student.getEffectiveRemainingHours();
      console.log(`💰 Student ${studentId} effective balance before change: ${effectiveRemaining}h`);

      // ✅ حساب التغيير في الساعات
      let hoursChange = 0;

      // الحالات التي تخصم ساعات (حاضر، متأخر)
      if (newStatus === 'present' || newStatus === 'late') {
        // إذا كان الطالب غائب سابقاً والآن حاضر، نخصم ساعتين
        if (previousStatus === 'absent' || previousStatus === 'excused') {
          hoursChange = -2;
        }
        // إذا كان جديد (مافيش حالة سابقة)
        else if (!previousStatus) {
          hoursChange = -2;
        }
      }
      
      // الحالات التي لا تخصم ساعات (غائب، معذور)
      else if (newStatus === 'absent' || newStatus === 'excused') {
        // إذا كان الطالب حاضر سابقاً والآن غائب، نرجع الساعات
        if (previousStatus === 'present' || previousStatus === 'late') {
          hoursChange = 2;
        }
        // إذا كان جديد - مافيش خصم
        else if (!previousStatus) {
          hoursChange = 0;
        }
      }

      // ✅ تطبيق التغيير على الساعات
      if (hoursChange !== 0) {
        console.log(`💰 Hours change for ${studentId}: ${hoursChange > 0 ? '+' : ''}${hoursChange}`);

        if (hoursChange < 0) {
          // خصم ساعات
          const deductionResult = await student.deductCreditHours({
            hours: Math.abs(hoursChange),
            sessionId: session._id,
            groupId: group._id,
            sessionTitle: session.title,
            groupName: group.name,
            attendanceStatus: newStatus,
            notes: `Attendance changed from ${previousStatus || 'new'} to ${newStatus}`
          });

          if (deductionResult.success) {
            creditDeductions.push({
              studentId,
              hoursDeducted: Math.abs(hoursChange),
              remainingHours: deductionResult.remainingHours
            });

            // ✅ بعد الخصم، نتحقق من الرصيد الجديد
            const newRemaining = deductionResult.remainingHours;
            
            // ✅ تحذير للرصيد المنخفض (أقل من أو يساوي 5 ساعات)
            if (newRemaining <= 5 && newRemaining > 0) {
              lowBalanceStudents.push({
                studentId,
                student,
                remainingHours: newRemaining
              });
            }
            
            // ✅ تعطيل الإشعارات للرصيد صفر
            if (newRemaining === 0) {
              zeroBalanceStudents.push({
                studentId,
                student,
                remainingHours: 0
              });
            }
          }
        } else {
          // إضافة ساعات (استرجاع)
          const currentPackage = student.creditSystem.currentPackage;
          currentPackage.remainingHours += hoursChange;
          student.creditSystem.stats.totalHoursRemaining += hoursChange;
          student.creditSystem.stats.totalHoursUsed -= hoursChange;
          student.creditSystem.stats.totalSessionsAttended -= 1;
          await student.save();

          creditDeductions.push({
            studentId,
            hoursAdded: hoursChange,
            remainingHours: currentPackage.remainingHours
          });
        }

        await student.save();
      }
    }

    // ✅ إرسال إشعارات للطلاب ذوي الرصيد المنخفض (أقل من أو يساوي 5 ساعات)
    if (lowBalanceStudents.length > 0) {
      console.log(`⚠️ Triggering low balance alerts for ${lowBalanceStudents.length} students via automation`);
      
      try {
        const alertResult = await sendLowBalanceAlerts(lowBalanceStudents);
        console.log(`✅ Low balance alerts completed: ${alertResult.sentCount} sent, ${alertResult.failCount} failed`);
      } catch (alertError) {
        console.error(`❌ Error sending low balance alerts:`, alertError);
      }
    }

    // ✅ تعطيل الإشعارات للطلاب ذوي الرصيد صفر
    if (zeroBalanceStudents.length > 0) {
      console.log(`🔕 Disabling notifications for ${zeroBalanceStudents.length} students via automation`);
      
      try {
        const disableResult = await disableZeroBalanceNotifications(zeroBalanceStudents);
        console.log(`✅ Notifications disabled for ${disableResult.disabledCount} students`);
      } catch (disableError) {
        console.error(`❌ Error disabling notifications:`, disableError);
      }
    }

    // حفظ الغياب
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

    console.log(`✅ Attendance saved successfully`);

    // إرسال الإشعارات
    let automationResult = {
      successCount: 0,
      failCount: 0
    };

    const studentsNeedingMessages = attendance.filter(record => 
      ['absent', 'late', 'excused'].includes(record.status)
    );

    if (studentsNeedingMessages.length > 0) {
      console.log(`📤 Triggering automation for ${studentsNeedingMessages.length} notifications...`);
      
      try {
        automationResult = await onAttendanceSubmitted(id, customMessages || {});
        console.log(`✅ Automation completed: ${automationResult.successCount} sent`);
      } catch (automationError) {
        console.error(`❌ Automation error:`, automationError);
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

    // ✅ جلب الجلسة مع البيانات الأساسية
    const session = await Session.findOne({ _id: id, isDeleted: false })
      .populate('groupId', 'name code')
      .lean();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // ✅ جلب كل طلاب المجموعة من قاعدة البيانات مباشرة
    const groupStudents = await Student.find({
      'academicInfo.groupIds': session.groupId._id,
      isDeleted: false
    })
    .select('personalInfo guardianInfo communicationPreferences enrollmentNumber creditSystem')
    .lean();

    console.log(`📊 Found ${groupStudents.length} students in group`);

    // ✅ جلب بيانات الحضور المسجلة مسبقاً (لو موجودة)
    const fullSession = await Session.findOne({ _id: id, isDeleted: false })
      .populate({
        path: 'attendance.studentId',
        select: '_id'
      })
      .lean();

    // ✅ إنشاء Map للحضور المسجل
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

    // ✅ إنشاء قائمة students كاملة مع بيانات الحضور والرصيد
    const students = groupStudents.map(student => {
      const attendanceRecord = attendanceMap.get(student._id.toString());
      
      // ✅ التأكد من وجود creditSystem
      if (!student.creditSystem) {
        student.creditSystem = {
          currentPackage: null,
          status: 'no_package',
          stats: {
            totalHoursPurchased: 0,
            totalHoursUsed: 0,
            totalHoursRemaining: 0,
            totalSessionsAttended: 0
          }
        };
      }
      
      // ✅ التأكد من وجود currentPackage
      if (!student.creditSystem.currentPackage) {
        student.creditSystem.currentPackage = {
          remainingHours: 0,
          totalHours: 0,
          packageType: null,
          startDate: null,
          endDate: null,
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

    // ✅ بناء قائمة attendance من البيانات المسجلة فقط
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
        students, // ✅ كل طلاب المجموعة مع الرصيد
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