// app/api/students/[id]/reminders/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '../../../../models/Student';

/**
 * ✅ GET /api/students/[id]/reminders
 * Get all session reminders for a student
 */
export async function GET(req, { params }) {
  try {
    await connectDB();

    const { id } = params;

    const student = await Student.findById(id)
      .populate('sessionReminders.sessionId', 'title scheduledDate startTime endTime status')
      .populate('sessionReminders.groupId', 'name code');

    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    // Sort reminders by date (newest first)
    const reminders = student.sessionReminders
      .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

    // Group by session
    const groupedBySession = {};
    reminders.forEach(reminder => {
      const sessionId = reminder.sessionId?._id?.toString();
      if (!sessionId) return;

      if (!groupedBySession[sessionId]) {
        groupedBySession[sessionId] = {
          session: reminder.sessionId,
          group: reminder.groupId,
          reminders: []
        };
      }

      groupedBySession[sessionId].reminders.push({
        type: reminder.reminderType,
        message: reminder.message,
        language: reminder.language,
        sentAt: reminder.sentAt,
        status: reminder.status,
        error: reminder.error
      });
    });

    // Stats
    const stats = {
      total: reminders.length,
      sent: reminders.filter(r => r.status === 'sent').length,
      failed: reminders.filter(r => r.status === 'failed').length,
      reminder24h: reminders.filter(r => r.reminderType === '24hours').length,
      reminder1h: reminders.filter(r => r.reminderType === '1hour').length,
      lastReminderDate: reminders.length > 0 ? reminders[0].sentAt : null
    };

    return NextResponse.json({
      success: true,
      data: {
        reminders: Object.values(groupedBySession),
        allReminders: reminders,
        stats
      }
    });

  } catch (error) {
    console.error('Error fetching student reminders:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}