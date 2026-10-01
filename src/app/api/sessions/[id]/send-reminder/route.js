import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin } from '@/utils/authMiddleware';
import { sendManualSessionReminder } from '../../../../services/groupAutomation';
import mongoose from 'mongoose';

export async function POST(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { id } = await params;

    let body = {};
    try {
      const text = await req.text();
      if (text?.trim()) {
        body = JSON.parse(text);
      }
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { reminderType = '24hours', metadata = {} } = body;

    // ✅ الأنواع المسموحة: 24hours | 15min | 1hour (legacy) | pre_attendance_ping (Offline فقط)
    const allowedTypes = ['24hours', '15min', '1hour', 'pre_attendance_ping'];
    if (!allowedTypes.includes(reminderType)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid reminder type. Use 24hours, 15min, 1hour, or pre_attendance_ping',
        },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid session ID format' },
        { status: 400 }
      );
    }

    const studentMsgsCount = metadata?.studentMessages
      ? Object.keys(metadata.studentMessages).length
      : 0;
    const guardianMsgsCount = metadata?.guardianMessages
      ? Object.keys(metadata.guardianMessages).length
      : 0;

    console.log(`\n📨 Manual reminder for session: ${id}`);
    console.log(`⏰ Type: ${reminderType}`);
    console.log(`📝 Per-student messages:  ${studentMsgsCount}`);
    console.log(`📝 Per-guardian messages: ${guardianMsgsCount}`);

    const result = await sendManualSessionReminder(
      id,
      reminderType,
      null,
      metadata
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.reason || 'Failed to send reminders' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${reminderType} reminders sent successfully`,
      data: {
        totalStudents:         result.totalStudents,
        successCount:          result.successCount,
        failCount:             result.failCount,
        reminderType:          result.reminderType,
        isOffline:             result.isOffline,
        isPrePing:             result.isPrePing,
        customMessageUsed:     result.customMessageUsed,
        studentMessagesCount:  studentMsgsCount,
        guardianMessagesCount: guardianMsgsCount,
        notificationResults:   result.notificationResults,
      },
    });
  } catch (error) {
    console.error('❌ Error sending manual reminder:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}