// app/api/instructor/sessions/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Session from '../../../models/Session';
import Group from '../../../models/Group';
import Course from "../../../models/Course";
import { getUserFromRequest } from '@/lib/auth';
import mongoose from 'mongoose';

// GET: Get all sessions for instructor's groups
export async function GET(req) {
  try {
    console.log(`\n📋 ========== INSTRUCTOR SESSIONS REQUEST ==========`);

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
    }).select('_id name code');

    console.log(`👥 Found ${groups.length} groups for instructor`);

    if (!groups || groups.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'لا توجد مجموعات نشطة للمدرس',
      });
    }

    const groupIds = groups.map((group) => group._id);

    // الحصول على query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const groupId = searchParams.get('groupId');
    const sortBy = searchParams.get('sortBy') || 'scheduledDate';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // بناء query
    let query = {
      groupId: { $in: groupIds },
      isDeleted: false,
    };

    // تطبيق الفلاتر
    if (status && status !== 'all') {
      query.status = status;
      console.log(`🔍 Filter: status = ${status}`);
    }

    if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
      const groupExists = groups.some(g => g._id.toString() === groupId);
      if (groupExists) {
        query.groupId = new mongoose.Types.ObjectId(groupId);
        console.log(`🔍 Filter: groupId = ${groupId}`);
      }
    }

    if (fromDate) {
      const from = new Date(fromDate);
      if (!isNaN(from.getTime())) {
        query.scheduledDate = { ...query.scheduledDate, $gte: from };
        console.log(`🔍 Filter: fromDate = ${fromDate}`);
      }
    }

    if (toDate) {
      const to = new Date(toDate);
      if (!isNaN(to.getTime())) {
        query.scheduledDate = { ...query.scheduledDate, $lte: to };
        console.log(`🔍 Filter: toDate = ${toDate}`);
      }
    }

    // تحديد ترتيب الفرز
    const sortOptions = {};
    if (sortBy === 'title') {
      sortOptions.title = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'status') {
      sortOptions.status = sortOrder === 'desc' ? -1 : 1;
    } else {
      sortOptions.scheduledDate = sortOrder === 'desc' ? -1 : 1;
      sortOptions.startTime = sortOrder === 'desc' ? -1 : 1;
    }

    console.log(`📊 Query:`, JSON.stringify(query, null, 2));

    // جلب الجلسات مع تعداد
    const [sessions, total] = await Promise.all([
      Session.find(query)
        .populate('groupId', 'name code')
        .populate('courseId', 'title')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Session.countDocuments(query)
    ]);

    console.log(`✅ Found ${sessions.length} sessions (total: ${total})`);

    // إضافة معلومات إضافية
    const enrichedSessions = sessions.map(session => {
      const sessionDate = new Date(session.scheduledDate);
      const [hours, minutes] = session.startTime.split(':').map(Number);
      sessionDate.setHours(hours, minutes, 0, 0);
      
      const now = new Date();
      const isPast = sessionDate < now;
      const hoursUntil = (sessionDate - now) / (1000 * 60 * 60);
      const isUpcoming = hoursUntil > 0 && hoursUntil <= 48;
      
      // التحقق إذا كان يمكن أخذ الحضور
      const thirtyMinutesBefore = new Date(sessionDate.getTime() - 30 * 60000);
      const twoHoursAfter = new Date(sessionDate.getTime() + 2 * 60 * 60000);
      const canTakeAttendance = 
        (session.status === 'scheduled' || session.status === 'completed') &&
        now >= thirtyMinutesBefore && now <= twoHoursAfter &&
        !session.attendanceTaken;

      return {
        ...session,
        isPast,
        isUpcoming,
        canTakeAttendance,
        canEdit: canEditSession(session, user),
        canCancel: canCancelSession(session, user),
        canPostpone: canPostponeSession(session, user),
        attendanceStats: {
          total: session.attendance?.length || 0,
          present: session.attendance?.filter(a => a.status === 'present').length || 0,
          absent: session.attendance?.filter(a => a.status === 'absent').length || 0,
          late: session.attendance?.filter(a => a.status === 'late').length || 0,
          excused: session.attendance?.filter(a => a.status === 'excused').length || 0
        }
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedSessions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        groups: groups.map(g => ({ id: g._id, name: g.name, code: g.code })),
        appliedFilters: {
          status,
          fromDate,
          toDate,
          groupId,
          sortBy,
          sortOrder
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching instructor sessions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'فشل في جلب الجلسات',
      },
      { status: 500 }
    );
  }
}

// Helper functions for permissions
function canEditSession(session, user) {
  if (session.status === 'completed' || session.status === 'cancelled') {
    return false;
  }

  const now = new Date();
  const sessionDate = new Date(session.scheduledDate);
  const [hours, minutes] = session.startTime.split(':').map(Number);
  sessionDate.setHours(hours, minutes, 0, 0);
  
  const hoursBefore = (sessionDate - now) / (1000 * 60 * 60);
  return hoursBefore > 24;
}

function canCancelSession(session, user) {
  if (session.status === 'completed' || session.status === 'cancelled') {
    return false;
  }

  const now = new Date();
  const sessionDate = new Date(session.scheduledDate);
  const [hours, minutes] = session.startTime.split(':').map(Number);
  sessionDate.setHours(hours, minutes, 0, 0);
  
  const hoursBefore = (sessionDate - now) / (1000 * 60 * 60);
  return hoursBefore > 24;
}

function canPostponeSession(session, user) {
  if (session.status === 'completed' || session.status === 'cancelled') {
    return false;
  }

  const now = new Date();
  const sessionDate = new Date(session.scheduledDate);
  const [hours, minutes] = session.startTime.split(':').map(Number);
  sessionDate.setHours(hours, minutes, 0, 0);
  
  const hoursBefore = (sessionDate - now) / (1000 * 60 * 60);
  return hoursBefore > 24;
}