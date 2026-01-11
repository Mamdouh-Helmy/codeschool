// app/api/sessions/[id]/attendance/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Session from '../../../../models/Session';
import Student from '../../../../models/Student';
import User from '../../../../models/User';
import Group from '../../../../models/Group';
import { requireAdmin } from '@/utils/authMiddleware';
import { onAttendanceSubmitted } from '@/app/services/groupAutomation';
import mongoose from 'mongoose';

// POST: Submit attendance for a session with custom messages
export async function POST(req, { params }) {
  try {
    const { id } = await params;
    console.log(`\n🎯 ========== ATTENDANCE SUBMISSION START ==========`);
    console.log(`📋 Session ID: ${id}`);

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const adminUser = authCheck.user;
    console.log(`👤 Admin User: ${adminUser.email || adminUser.id}`);

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

    if (!attendance || !Array.isArray(attendance)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Attendance data must be an array',
          example: [
            { studentId: '...', status: 'present' },
            { studentId: '...', status: 'absent', notes: 'Sick' }
          ]
        },
        { status: 400 }
      );
    }

    const session = await Session.findOne({ _id: id, isDeleted: false })
      .populate('groupId');

    if (!session) {
      console.log(`❌ Session not found: ${id}`);
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Session found: ${session.title}`);
    const group = session.groupId;
    console.log(`👥 Group: ${group.name} (${group.code})`);

    // Validate all student IDs belong to the group
    const studentIds = attendance.map(a => a.studentId);
    const validStudents = await Student.find({
      _id: { $in: studentIds },
      'academicInfo.groupIds': group._id,
      isDeleted: false
    });

    console.log(`🔍 Validating students: ${validStudents.length}/${studentIds.length}`);

    if (validStudents.length !== studentIds.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'Some students do not belong to this group',
          validCount: validStudents.length,
          providedCount: studentIds.length
        },
        { status: 400 }
      );
    }

    // ✅ التحقق من الطلاب الذين يحتاجون رسائل
    const studentsNeedingMessages = attendance.filter(record => 
      ['absent', 'late', 'excused'].includes(record.status)
    );

    console.log(`📱 Students needing guardian notification: ${studentsNeedingMessages.length}`);

    // ✅ التحقق من أرقام أولياء الأمور
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
            error: `Cannot send notification: Student ${studentName} has no guardian WhatsApp number`,
            studentId: student._id,
            studentName: studentName
          },
          { status: 400 }
        );
      }
    }

    console.log(`✅ All guardians have WhatsApp numbers`);

    // Prepare attendance records
    const attendanceRecords = attendance.map(record => ({
      studentId: record.studentId,
      status: record.status,
      notes: record.notes || '',
      markedAt: new Date(),
      markedBy: adminUser.id
    }));

    console.log(`💾 Saving attendance to database...`);

    // Update session with attendance
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

    if (studentsNeedingMessages.length > 0) {
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
      console.log(`ℹ️ No students need guardian notifications (all present)`);
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
      message: 'Attendance submitted successfully and notifications sent',
      data: {
        sessionId: updatedSession._id,
        sessionTitle: updatedSession.title,
        attendance: updatedSession.attendance,
        stats
      },
      automation: {
        completed: automationResult.success !== false,
        action: 'Guardians notified via WhatsApp',
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
          error: 'Validation failed',
          details: messages
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to submit attendance'
      },
      { status: 500 }
    );
  }
}

// GET: Get attendance for a session
export async function GET(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid session ID format' },
        { status: 400 }
      );
    }

    const session = await Session.findOne({ _id: id, isDeleted: false })
      .populate('attendance.studentId', 'personalInfo.fullName personalInfo.email enrollmentNumber guardianInfo.name guardianInfo.whatsappNumber')
      .populate('attendance.markedBy', 'name email')
      .populate('groupId', 'name code')
      .lean();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    const stats = {
      total: session.attendance?.length || 0,
      present: session.attendance?.filter(a => a.status === 'present').length || 0,
      absent: session.attendance?.filter(a => a.status === 'absent').length || 0,
      late: session.attendance?.filter(a => a.status === 'late').length || 0,
      excused: session.attendance?.filter(a => a.status === 'excused').length || 0
    };

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session._id,
        sessionTitle: session.title,
        scheduledDate: session.scheduledDate,
        attendanceTaken: session.attendanceTaken,
        attendance: session.attendance || [],
        stats,
        group: session.groupId
      }
    });

  } catch (error) {
    console.error('❌ Error fetching attendance:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch attendance'
      },
      { status: 500 }
    );
  }
}