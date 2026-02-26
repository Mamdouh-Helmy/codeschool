import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Group from '../../../../models/Group';
import Session from '../../../../models/Session';
import Course from '../../../../models/Course';
import { requireAdmin } from '@/utils/authMiddleware';
import mongoose from 'mongoose';

// GET: Fetch all sessions for a group
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
        { success: false, error: 'Invalid group ID format' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const upcoming = searchParams.get('upcoming') === 'true';
    const past = searchParams.get('past') === 'true';

    // ✅ جلب المجموعة مع بيانات الكورس
    const group = await Group.findOne({ _id: id, isDeleted: false })
      .populate('courseId', 'title level')
      .lean();

    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    const query = { groupId: id, isDeleted: false };

    if (status) {
      query.status = status;
    }

    const now = new Date();
    if (upcoming) {
      query.scheduledDate = { $gte: now };
    } else if (past) {
      query.scheduledDate = { $lt: now };
    }

    const sessions = await Session.find(query)
      .populate('courseId', 'title')
      .sort({ scheduledDate: 1, startTime: 1 })
      .lean();

    const formattedSessions = sessions.map(session => ({
      id: session._id,
      _id: session._id,
      title: session.title,
      description: session.description,
      moduleIndex: session.moduleIndex,
      sessionNumber: session.sessionNumber,
      lessonIndexes: session.lessonIndexes,
      scheduledDate: session.scheduledDate,
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      meetingLink: session.meetingLink,
      recordingLink: session.recordingLink,
      attendanceTaken: session.attendanceTaken,
      attendance: session.attendance,
      automationEvents: session.automationEvents,
      instructorNotes: session.instructorNotes,
      metadata: session.metadata,
      isPast: new Date(session.scheduledDate) < now,
      isToday: new Date(session.scheduledDate).toDateString() === now.toDateString()
    }));

    const stats = {
      total: sessions.length,
      scheduled: sessions.filter(s => s.status === 'scheduled').length,
      completed: sessions.filter(s => s.status === 'completed').length,
      cancelled: sessions.filter(s => s.status === 'cancelled').length,
      postponed: sessions.filter(s => s.status === 'postponed').length,
      upcoming: sessions.filter(s => new Date(s.scheduledDate) >= now).length,
      past: sessions.filter(s => new Date(s.scheduledDate) < now).length
    };

    // ✅ بناء courseSnapshot من الداتا الموجودة
    const courseSnapshot = group.courseSnapshot || {
      title: group.courseId?.title || '',
      level: group.courseId?.level || '',
    };

    return NextResponse.json({
      success: true,
      data: formattedSessions,
      stats,
      group: {
        id: group._id,
        _id: group._id,
        code: group.code,
        name: group.name,
        courseSnapshot,
        courseId: group.courseId || null,
        schedule: group.schedule || {},
        automation: group.automation || {},
      }
    });

  } catch (error) {
    console.error('❌ Error fetching sessions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch sessions'
      },
      { status: 500 }
    );
  }
}