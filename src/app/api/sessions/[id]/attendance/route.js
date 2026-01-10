// app/api/sessions/[id]/attendance/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Session from '../../../../models/Session';
import Student from '../../../../models/Student';
import Group from '../../../../models/Group';
import { requireAdmin } from '@/utils/authMiddleware';
import { onAttendanceSubmitted } from '@/app/services/groupAutomation';
import mongoose from 'mongoose';

// POST: Submit attendance for a session
export async function POST(req, { params }) {
  try {
    const { id } = await params; // ✅ await params
    console.log(`✅ Submitting attendance for session: ${id}`);

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const adminUser = authCheck.user;

    await connectDB();

    const { attendance } = await req.json();

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
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    const group = session.groupId;

    // Validate all student IDs belong to the group
    const studentIds = attendance.map(a => a.studentId);
    const validStudents = await Student.find({
      _id: { $in: studentIds },
      'academicInfo.groupIds': group._id,
      isDeleted: false
    });

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

    // Prepare attendance records
    const attendanceRecords = attendance.map(record => ({
      studentId: record.studentId,
      status: record.status,
      notes: record.notes || '',
      markedAt: new Date(),
      markedBy: adminUser.id
    }));

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

    console.log(`✅ Attendance submitted for ${attendanceRecords.length} students`);

    // Trigger automation (notify guardians of absent students)
    setTimeout(async () => {
      try {
        console.log('🔄 Starting automation for attendance...');
        const automationResult = await onAttendanceSubmitted(id);
        console.log('✅ Automation completed:', automationResult);
      } catch (automationError) {
        console.error('❌ Automation failed:', automationError);
      }
    }, 1000);

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
        attendance: updatedSession.attendance,
        stats
      },
      automation: {
        triggered: true,
        action: 'Notifying guardians of absent students (if automation enabled)',
        status: 'processing'
      }
    });

  } catch (error) {
    console.error('❌ Error submitting attendance:', error);

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

    const { id } = await params; // ✅ await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid session ID format' },
        { status: 400 }
      );
    }

    const session = await Session.findOne({ _id: id, isDeleted: false })
      .populate('attendance.studentId', 'personalInfo.fullName personalInfo.email enrollmentNumber')
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