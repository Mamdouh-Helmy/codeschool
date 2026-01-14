// app/api/instructor/sessions/[id]/attendance/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Session from '../../../../../models/Session';
import Student from '../../../../../models/Student';
import User from '../../../../../models/User';
import Group from '../../../../../models/Group';
import { getUserFromRequest } from '@/lib/auth';
import { onAttendanceSubmitted } from '@/app/services/groupAutomation';
import mongoose from 'mongoose';

// POST: Submit attendance for a session with custom messages
export async function POST(req, { params }) {
  try {
    const { id } = await params;
    console.log(`\n🎯 ========== ATTENDANCE SUBMISSION START ==========`);
    console.log(`📋 Session ID: ${id}`);

    const user = await getUserFromRequest(req);
    
    if (!user || user.role !== 'instructor') {
      console.log(`❌ Unauthorized: User role is ${user?.role || 'none'}`);
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بتسجيل الحضور. يجب أن تكون مدرساً' },
        { status: 403 }
      );
    }

    console.log(`👤 Instructor: ${user.name} (${user.email})`);

    await connectDB();

    const { attendance, customMessages } = await req.json();
    console.log(`📊 Attendance Records: ${attendance?.length || 0}`);
    console.log(`💬 Custom Messages: ${customMessages ? Object.keys(customMessages).length : 0}`);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'معرف الجلسة غير صالح' },
        { status: 400 }
      );
    }

    if (!attendance || !Array.isArray(attendance)) {
      return NextResponse.json(
        {
          success: false,
          error: 'بيانات الحضور يجب أن تكون مصفوفة',
          example: [
            { studentId: '...', status: 'present' },
            { studentId: '...', status: 'absent', notes: 'سائح' }
          ]
        },
        { status: 400 }
      );
    }

    const session = await Session.findOne({ _id: id, isDeleted: false })
      .populate('groupId', 'name code instructors automation');

    if (!session) {
      console.log(`❌ Session not found: ${id}`);
      return NextResponse.json(
        { success: false, error: 'الجلسة غير موجودة' },
        { status: 404 }
      );
    }

    console.log(`✅ Session found: ${session.title}`);
    const group = session.groupId;
    console.log(`👥 Group: ${group.name} (${group.code})`);

    // التحقق إذا كان المدرس يدرس هذه المجموعة
    const isInstructorOfGroup = group.instructors.some(
      instructor => instructor.toString() === user.id
    );

    if (!isInstructorOfGroup) {
      console.log(`❌ Instructor not authorized for this group`);
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بتسجيل حضور لهذه الجلسة' },
        { status: 403 }
      );
    }

    // التحقق إذا كان يمكن أخذ الحضور
    const now = new Date();
    const sessionDate = new Date(session.scheduledDate);
    const [hours, minutes] = session.startTime.split(':').map(Number);
    sessionDate.setHours(hours, minutes, 0, 0);
    
    const thirtyMinutesBefore = new Date(sessionDate.getTime() - 30 * 60000);
    const twoHoursAfter = new Date(sessionDate.getTime() + 2 * 60 * 60000);
    
    const canTakeAttendance = 
      (session.status === 'scheduled' || session.status === 'completed') &&
      now >= thirtyMinutesBefore && now <= twoHoursAfter;

    if (!canTakeAttendance) {
      console.log(`❌ Cannot take attendance at this time`);
      console.log(`   Session date: ${sessionDate}`);
      console.log(`   Current time: ${now}`);
      console.log(`   Time window: ${thirtyMinutesBefore} to ${twoHoursAfter}`);
      return NextResponse.json(
        { success: false, error: 'لا يمكن أخذ الحضور في هذا الوقت' },
        { status: 400 }
      );
    }

    // التحقق إذا كان الحضور مأخوذ بالفعل
    if (session.attendanceTaken) {
      console.log(`❌ Attendance already taken for this session`);
      return NextResponse.json(
        { success: false, error: 'تم أخذ الحضور لهذه الجلسة بالفعل' },
        { status: 400 }
      );
    }

    // Validate all student IDs belong to the group
    const studentIds = attendance.map(a => a.studentId);
    const validStudents = await Student.find({
      _id: { $in: studentIds },
      'academicInfo.groupIds': group._id,
      isDeleted: false
    });

    console.log(`🔍 Validating students: ${validStudents.length}/${studentIds.length}`);

    if (validStudents.length !== studentIds.length) {
      const invalidIds = studentIds.filter(
        studentId => !validStudents.some(s => s._id.toString() === studentId.toString())
      );
      
      return NextResponse.json(
        {
          success: false,
          error: 'بعض الطلاب لا ينتمون لهذه المجموعة',
          validCount: validStudents.length,
          providedCount: studentIds.length,
          invalidStudentIds: invalidIds
        },
        { status: 400 }
      );
    }

    // ✅ التحقق من الطلاب الذين يحتاجون رسائل
    const studentsNeedingMessages = attendance.filter(record => 
      ['absent', 'late', 'excused'].includes(record.status)
    );

    console.log(`📱 Students needing guardian notification: ${studentsNeedingMessages.length}`);

    // ✅ التحقق من أرقام أولياء الأمور فقط إذا كان الأوتوميشن مفعل
    if (group.automation?.whatsappEnabled && group.automation?.notifyGuardianOnAbsence) {
      console.log(`🔔 Guardian notifications are enabled for this group`);
      
      for (const record of studentsNeedingMessages) {
        const student = validStudents.find(s => s._id.toString() === record.studentId.toString());
        
        if (!student) {
          console.log(`⚠️ Student not found in valid students: ${record.studentId}`);
          continue;
        }

        const guardianWhatsApp = student.guardianInfo?.whatsappNumber;
        const studentName = student.personalInfo?.fullName || student.enrollmentNumber;

        console.log(`   📞 ${studentName}: Guardian WhatsApp = ${guardianWhatsApp || 'NOT SET'}`);

        if (!guardianWhatsApp) {
          console.log(`❌ Missing guardian WhatsApp for: ${studentName}`);
          return NextResponse.json(
            {
              success: false,
              error: `لا يمكن إرسال إشعار: الطالب ${studentName} ليس لديه رقم واتساب لولي الأمر`,
              studentId: student._id,
              studentName: studentName
            },
            { status: 400 }
          );
        }
      }

      console.log(`✅ All guardians have WhatsApp numbers`);
    } else {
      console.log(`ℹ️ Guardian notifications are disabled for this group`);
    }

    // Prepare attendance records
    const attendanceRecords = attendance.map(record => ({
      studentId: record.studentId,
      status: record.status,
      notes: record.notes || '',
      markedAt: new Date(),
      markedBy: user.id
    }));

    console.log(`💾 Saving attendance to database...`);

    // Update session with attendance
    const updatedSession = await Session.findByIdAndUpdate(
      id,
      {
        $set: {
          attendance: attendanceRecords,
          attendanceTaken: true,
          status: 'completed', // تحديث الحالة إلى مكتملة بعد أخذ الحضور
          'metadata.updatedBy': user.id,
          'metadata.updatedAt': new Date()
        }
      },
      { new: true }
    )
      .populate('attendance.studentId', 'personalInfo.fullName enrollmentNumber')
      .populate('attendance.markedBy', 'name email');

    console.log(`✅ Attendance saved successfully for ${attendanceRecords.length} students`);

    // ✅ إرسال الرسائل عبر الأوتوميشن
    console.log(`\n📱 ========== WHATSAPP NOTIFICATIONS ==========`);
    
    let automationResult = {
      successCount: 0,
      failCount: 0,
      notificationResults: []
    };

    if (studentsNeedingMessages.length > 0 && 
        group.automation?.whatsappEnabled && 
        group.automation?.notifyGuardianOnAbsence) {
      
      console.log(`📤 Triggering automation for ${studentsNeedingMessages.length} notifications...`);
      
      try {
        automationResult = await onAttendanceSubmitted(id, customMessages || {});
        console.log(`✅ Automation completed:`, {
          success: automationResult.success,
          sent: automationResult.successCount,
          failed: automationResult.failCount
        });
      } catch (automationError) {
        console.error(`❌ Automation error:`, automationError);
        automationResult = {
          success: false,
          error: automationError.message,
          successCount: 0,
          failCount: studentsNeedingMessages.length,
          notificationResults: []
        };
      }
    } else {
      console.log(`ℹ️ No students need guardian notifications or automation is disabled`);
    }

    const stats = {
      total: attendanceRecords.length,
      present: attendanceRecords.filter(a => a.status === 'present').length,
      absent: attendanceRecords.filter(a => a.status === 'absent').length,
      late: attendanceRecords.filter(a => a.status === 'late').length,
      excused: attendanceRecords.filter(a => a.status === 'excused').length
    };

    console.log(`📊 Attendance Stats:`, stats);

    const customMessagesInfo = customMessages 
      ? Object.keys(customMessages).length 
      : 0;

    console.log(`\n✅ ========== ATTENDANCE SUBMISSION COMPLETE ==========\n`);

    return NextResponse.json({
      success: true,
      message: 'تم تسجيل الحضور بنجاح وإرسال الإشعارات',
      data: {
        sessionId: updatedSession._id,
        sessionTitle: updatedSession.title,
        attendance: updatedSession.attendance,
        stats
      },
      automation: {
        completed: automationResult.success !== false,
        action: 'تم إرسال إشعارات لأولياء الأمور عبر الواتساب',
        customMessagesUsed: customMessagesInfo,
        notificationsSent: automationResult.successCount || 0,
        notificationsFailed: automationResult.failCount || 0,
        details: automationResult.notificationResults || [],
        error: automationResult.error || null
      }
    });

  } catch (error) {
    console.error(`\n❌ ========== ATTENDANCE SUBMISSION ERROR ==========`);
    console.error('Error:', error);
    console.error('Stack:', error.stack);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors || {})
        .map(err => err.message)
        .join('; ');
      
      return NextResponse.json(
        {
          success: false,
          error: 'فشل في التحقق من البيانات',
          details: messages
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'فشل في تسجيل الحضور'
      },
      { status: 500 }
    );
  }
}

// GET: Get attendance for a session
// GET: Get attendance for a session
export async function GET(req, { params }) {
  try {
    console.log(`\n📋 ========== GET ATTENDANCE FOR SESSION ==========`);

    const user = await getUserFromRequest(req);
    
    if (!user || user.role !== 'instructor') {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بالوصول. يجب أن تكون مدرساً' },
        { status: 403 }
      );
    }

    console.log(`👤 Instructor: ${user.name}`);

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'معرف الجلسة غير صالح' },
        { status: 400 }
      );
    }

    const session = await Session.findOne({ _id: id, isDeleted: false })
      .populate('attendance.studentId', 'personalInfo.fullName personalInfo.email enrollmentNumber guardianInfo.name guardianInfo.whatsappNumber')
      .populate('attendance.markedBy', 'name email')
      .populate('groupId', 'name code instructors automation')
      .lean();

    if (!session) {
      console.log(`❌ Session not found: ${id}`);
      return NextResponse.json(
        { success: false, error: 'الجلسة غير موجودة' },
        { status: 404 }
      );
    }

    console.log(`✅ Session found: ${session.title}`);
    console.log(`📅 Session Date: ${session.scheduledDate}`);
    console.log(`⏰ Session Time: ${session.startTime} - ${session.endTime}`);
    console.log(`📊 Session Status: ${session.status}`);
    console.log(`🎯 Attendance Taken: ${session.attendanceTaken}`);

    // التحقق إذا كان المدرس يدرس هذه المجموعة
    const isInstructorOfGroup = session.groupId.instructors.some(
      instructor => instructor.toString() === user.id
    );

    if (!isInstructorOfGroup) {
      console.log(`❌ Instructor not authorized for this group`);
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بالوصول إلى حضور هذه الجلسة' },
        { status: 403 }
      );
    }

    // جلب جميع الطلاب في المجموعة
    const students = await Student.find({
      'academicInfo.groupIds': session.groupId._id,
      isDeleted: false,
      'enrollmentInfo.status': 'Active'
    })
      .select('personalInfo.fullName personalInfo.email enrollmentNumber guardianInfo')
      .lean();

    console.log(`👥 Total students in group: ${students.length}`);

    // إنشاء map للحضور الحالي
    const attendanceMap = {};
    if (session.attendance && session.attendance.length > 0) {
      session.attendance.forEach(record => {
        if (record.studentId) {
          attendanceMap[record.studentId._id.toString()] = {
            status: record.status,
            notes: record.notes,
            markedAt: record.markedAt,
            markedBy: record.markedBy
          };
        }
      });
    }

    // دمج معلومات الطلاب مع الحضور
    const attendanceRecords = students.map(student => {
      const existingAttendance = attendanceMap[student._id.toString()];
      
      return {
        studentId: student._id,
        fullName: student.personalInfo?.fullName,
        email: student.personalInfo?.email,
        enrollmentNumber: student.enrollmentNumber,
        guardianInfo: student.guardianInfo,
        attendance: existingAttendance || {
          status: 'pending',
          notes: '',
          markedAt: null,
          markedBy: null
        }
      };
    });

    const stats = {
      total: attendanceRecords.length,
      present: attendanceRecords.filter(s => s.attendance.status === 'present').length,
      absent: attendanceRecords.filter(s => s.attendance.status === 'absent').length,
      late: attendanceRecords.filter(s => s.attendance.status === 'late').length,
      excused: attendanceRecords.filter(s => s.attendance.status === 'excused').length,
      pending: attendanceRecords.filter(s => s.attendance.status === 'pending').length
    };

    // التحقق إذا كان يمكن أخذ الحضور
    const now = new Date();
    
    // ✅ إصلاح: تحويل session.scheduledDate إلى Date object
    const sessionDate = new Date(session.scheduledDate);
    console.log(`📅 Parsed Session Date: ${sessionDate}`);
    console.log(`📅 Is Valid Date: ${!isNaN(sessionDate.getTime())}`);
    
    if (isNaN(sessionDate.getTime())) {
      console.log(`❌ Invalid session date format: ${session.scheduledDate}`);
      return NextResponse.json(
        {
          success: false,
          error: 'تاريخ الجلسة غير صالح',
          scheduledDate: session.scheduledDate
        },
        { status: 400 }
      );
    }
    
    const [hours, minutes] = session.startTime.split(':').map(Number);
    console.log(`⏰ Parsed Time: ${hours}:${minutes}`);
    
    sessionDate.setHours(hours, minutes, 0, 0);
    console.log(`🕒 Full Session DateTime: ${sessionDate}`);
    
    const thirtyMinutesBefore = new Date(sessionDate.getTime() - 30 * 60000);
    const twoHoursAfter = new Date(sessionDate.getTime() + 2 * 60 * 60000);
    
    console.log(`🕒 Time Windows:`);
    console.log(`   Session: ${sessionDate}`);
    console.log(`   Now: ${now}`);
    console.log(`   30 Min Before: ${thirtyMinutesBefore}`);
    console.log(`   2 Hours After: ${twoHoursAfter}`);
    console.log(`   Is Now >= 30 Min Before: ${now >= thirtyMinutesBefore}`);
    console.log(`   Is Now <= 2 Hours After: ${now <= twoHoursAfter}`);
    console.log(`   Valid Status: ${session.status === 'scheduled' || session.status === 'completed'}`);
    console.log(`   Not Taken: ${!session.attendanceTaken}`);
    
    const canTakeAttendance = 
      (session.status === 'scheduled' || session.status === 'completed') &&
      now >= thirtyMinutesBefore && now <= twoHoursAfter &&
      !session.attendanceTaken;

    console.log(`📊 Attendance Stats:`, stats);
    console.log(`🎯 Can take attendance: ${canTakeAttendance}`);

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session._id,
        sessionTitle: session.title,
        scheduledDate: session.scheduledDate,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        attendanceTaken: session.attendanceTaken,
        attendance: attendanceRecords,
        stats,
        group: session.groupId,
        canTakeAttendance,
        automation: {
          whatsappEnabled: session.groupId.automation?.whatsappEnabled || false,
          notifyGuardianOnAbsence: session.groupId.automation?.notifyGuardianOnAbsence || false
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching attendance:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'فشل في جلب سجل الحضور',
      },
      { status: 500 }
    );
  }
}