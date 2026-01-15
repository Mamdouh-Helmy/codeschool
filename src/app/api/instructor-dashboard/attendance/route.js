// app/api/instructor-dashboard/attendance/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Session from '../../../models/Session';
import Group from '../../../models/Group';
import Student from '../../../models/Student';
import { getUserFromRequest } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET(req) {
  try {
    console.log(`\n📋 ========== INSTRUCTOR ATTENDANCE REQUEST ==========`);

    // تحقق من المصادقة
    const user = await getUserFromRequest(req);
    
    if (!user) {
      console.log(`❌ Unauthorized: No user found`);
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بالوصول' },
        { status: 401 }
      );
    }

    if (user.role !== 'instructor') {
      console.log(`❌ Forbidden: User role is ${user.role}, expected instructor`);
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بالوصول. يجب أن تكون مدرساً' },
        { status: 403 }
      );
    }

    console.log(`👤 Instructor: ${user.name} (${user.email})`);

    await connectDB();

    // الحصول على جميع المجموعات التي يدرسها المدرس
    const groups = await Group.find({
      instructors: user.id,
      isDeleted: false,
      status: { $in: ['active', 'completed'] }
    }).select('_id name code').lean();

    console.log(`👥 Found ${groups.length} groups for instructor`);

    if (!groups || groups.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          attendanceRecords: [],
          studentAttendanceSummary: [],
          statistics: {
            totalSessions: 0,
            totalAttendanceRecords: 0,
            totalPresent: 0,
            totalAbsent: 0,
            totalLate: 0,
            totalExcused: 0,
            attendanceRate: 0
          },
          groups: []
        },
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false
        },
        filters: {
          groups: [],
          applied: {}
        },
        message: 'لا توجد مجموعات نشطة للمدرس',
      });
    }

    const groupIds = groups.map(group => group._id);

    // الحصول على query parameters
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId');
    const statusFilter = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    console.log('📊 Query Parameters:', {
      groupId,
      statusFilter,
      page,
      limit,
      skip
    });

    // بناء query للجلسات
    let sessionQuery = {
      groupId: { $in: groupIds },
      isDeleted: false,
      attendanceTaken: true
    };

    if (groupId && groupId !== 'all' && mongoose.Types.ObjectId.isValid(groupId)) {
      const groupExists = groups.some(g => g._id.toString() === groupId);
      if (groupExists) {
        sessionQuery.groupId = new mongoose.Types.ObjectId(groupId);
        console.log(`🔍 Filter: groupId = ${groupId}`);
      }
    }

    // جلب الجلسات مع الحضور
    const sessions = await Session.find(sessionQuery)
      .populate('groupId', 'name code')
      .populate('courseId', 'title')
      .populate({
        path: 'attendance.studentId',
        select: 'personalInfo.fullName enrollmentNumber',
      })
      .sort({ scheduledDate: -1, startTime: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    console.log(`📅 Found ${sessions.length} sessions with attendance`);

    // جمع سجلات الحضور
    let allAttendanceRecords = [];
    let studentStats = new Map();

    sessions.forEach(session => {
      if (session.attendance && session.attendance.length > 0) {
        session.attendance.forEach(att => {
          if (att.studentId) {
            const studentId = att.studentId._id.toString();
            const studentName = att.studentId.personalInfo?.fullName || 'غير معروف';
            const enrollmentNumber = att.studentId.enrollmentNumber || 'غير معروف';

            // تسجيل الحضور
            allAttendanceRecords.push({
              sessionId: session._id.toString(),
              sessionTitle: session.title,
              sessionDate: session.scheduledDate,
              sessionTime: `${session.startTime} - ${session.endTime}`,
              groupId: session.groupId._id.toString(),
              groupName: session.groupId.name,
              groupCode: session.groupId.code,
              courseTitle: session.courseId?.title || 'غير معروف',
              studentId: studentId,
              studentName: studentName,
              enrollmentNumber: enrollmentNumber,
              status: att.status,
              notes: att.notes || '',
              markedAt: att.markedAt,
              markedBy: att.markedBy || { name: 'نظام', email: '' }
            });

            // تحديث إحصائيات الطالب
            if (!studentStats.has(studentId)) {
              studentStats.set(studentId, {
                studentId: studentId,
                studentName: studentName,
                enrollmentNumber: enrollmentNumber,
                totalSessions: 0,
                present: 0,
                absent: 0,
                late: 0,
                excused: 0,
                attendanceRate: 0
              });
            }

            const studentStat = studentStats.get(studentId);
            studentStat.totalSessions++;
            
            if (att.status === 'present') studentStat.present++;
            else if (att.status === 'absent') studentStat.absent++;
            else if (att.status === 'late') studentStat.late++;
            else if (att.status === 'excused') studentStat.excused++;
          }
        });
      }
    });

    // حساب نسبة الحضور لكل طالب
    studentStats.forEach(student => {
      if (student.totalSessions > 0) {
        student.attendanceRate = Math.round((student.present / student.totalSessions) * 100);
      }
    });

    // تطبيق فلتر الحالة على الطلاب
    let studentAttendanceSummary = Array.from(studentStats.values());
    
    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'good') {
        studentAttendanceSummary = studentAttendanceSummary.filter(student => student.attendanceRate >= 70);
      } else if (statusFilter === 'poor') {
        studentAttendanceSummary = studentAttendanceSummary.filter(student => student.attendanceRate < 70);
      }
    }

    // حساب الإحصائيات الإجمالية
    let totalSessions = sessions.length;
    let totalAttendanceRecords = allAttendanceRecords.length;
    let totalPresent = allAttendanceRecords.filter(a => a.status === 'present').length;
    let totalAbsent = allAttendanceRecords.filter(a => a.status === 'absent').length;
    let totalLate = allAttendanceRecords.filter(a => a.status === 'late').length;
    let totalExcused = allAttendanceRecords.filter(a => a.status === 'excused').length;
    let attendanceRate = totalAttendanceRecords > 0 ? 
      Math.round((totalPresent / totalAttendanceRecords) * 100) : 0;

    // الحصول على العدد الإجمالي للجلسات مع الحضور
    const totalSessionsCount = await Session.countDocuments(sessionQuery);

    return NextResponse.json({
      success: true,
      data: {
        attendanceRecords: allAttendanceRecords,
        studentAttendanceSummary: studentAttendanceSummary,
        statistics: {
          totalSessions: totalSessions,
          totalAttendanceRecords: totalAttendanceRecords,
          totalPresent: totalPresent,
          totalAbsent: totalAbsent,
          totalLate: totalLate,
          totalExcused: totalExcused,
          attendanceRate: attendanceRate
        },
        groups: groups.map(g => ({ 
          id: g._id.toString(), 
          name: g.name, 
          code: g.code 
        }))
      },
      pagination: {
        page,
        limit,
        total: totalSessionsCount,
        pages: Math.ceil(totalSessionsCount / limit),
        hasNext: page < Math.ceil(totalSessionsCount / limit),
        hasPrev: page > 1,
      },
      filters: {
        applied: {
          group: groupId || 'all',
          statusFilter: statusFilter || 'all'
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching instructor attendance:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'فشل في جلب سجل الحضور',
      },
      { status: 500 }
    );
  }
}