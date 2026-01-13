// app/api/sessions/[id]/send-reminder/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { sendManualSessionReminder } from '@/app/services/groupAutomation';

/**
 * ✅ POST /api/sessions/[id]/send-reminder
 * Manually trigger a session reminder (for testing or admin action)
 * 
 * Body: { reminderType: '24hours' | '1hour' }
 */
export async function POST(req, { params }) {
  try {
    await connectDB();

    const { id } = params;
    const body = await req.json();
    const { reminderType = '24hours' } = body;

    if (!['24hours', '1hour'].includes(reminderType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid reminder type. Must be "24hours" or "1hour"' },
        { status: 400 }
      );
    }

    console.log(`\n📨 Manual reminder trigger for session: ${id}`);
    console.log(`⏰ Reminder type: ${reminderType}`);

    const result = await sendManualSessionReminder(id, reminderType);

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.reason || 'Failed to send reminders',
          group: result.group 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${reminderType} reminders sent successfully`,
      data: result
    });

  } catch (error) {
    console.error('❌ Error sending manual reminder:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}