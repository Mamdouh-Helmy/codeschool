// app/api/sessions/[id]/attendance/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Session from '../../../../models/Session';
import Student from '../../../../models/Student';
import Group from '../../../../models/Group';
import { requireAdmin } from '@/utils/authMiddleware';
import { onAttendanceSubmitted } from '../../../../services/groupAutomation';
import mongoose from 'mongoose';

// /src/app/api/sessions/[id]/attendance/route.js - الجزء المعدل

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
      .populate('attendance.studentId', 'personalInfo.fullName personalInfo.email enrollmentNumber guardianInfo.name guardianInfo.whatsappNumber guardianInfo.relationship personalInfo.gender communicationPreferences')
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
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}