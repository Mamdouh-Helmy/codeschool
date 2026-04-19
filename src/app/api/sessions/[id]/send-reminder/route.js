// /src/app/api/sessions/[id]/send-reminder/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin } from '@/utils/authMiddleware';
import { sendManualSessionReminder } from '@/app/services/groupAutomation';
import mongoose from 'mongoose';

export async function POST(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { id } = await params;

    // ── Parse body بأمان ────────────────────────────────────────────────────
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

    // ✅ FIX: استقبال metadata الصح من الفرونت
    // الفرونت بيبعت: { reminderType, metadata: { studentMessages, guardianMessages } }
    const { reminderType = '24hours', metadata = {} } = body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!['24hours', '1hour'].includes(reminderType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid reminder type. Use 24hours or 1hour' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid session ID format' },
        { status: 400 }
      );
    }

    // ── Logging ──────────────────────────────────────────────────────────────
    const studentMsgsCount  = metadata?.studentMessages
      ? Object.keys(metadata.studentMessages).length
      : 0;
    const guardianMsgsCount = metadata?.guardianMessages
      ? Object.keys(metadata.guardianMessages).length
      : 0;

    console.log(`\n📨 Manual reminder for session: ${id}`);
    console.log(`⏰ Type: ${reminderType}`);
    console.log(`📝 Per-student messages:  ${studentMsgsCount}`);
    console.log(`📝 Per-guardian messages: ${guardianMsgsCount}`);

    // ── Send ─────────────────────────────────────────────────────────────────
    // ✅ metadata بيوصل كامل لـ sendManualSessionReminder
    // اللي بيقرأ منه: metadata.studentMessages[studentId] و metadata.guardianMessages[studentId]
    const result = await sendManualSessionReminder(
      id,
      reminderType,
      null,       // customMessage — مش بنستخدمه لأن عندنا per-student messages
      metadata    // ✅ { studentMessages: { [sid]: renderedMsg }, guardianMessages: { [sid]: renderedMsg } }
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
        totalStudents:        result.totalStudents,
        successCount:         result.successCount,
        failCount:            result.failCount,
        reminderType:         result.reminderType,
        customMessageUsed:    result.customMessageUsed,
        studentMessagesCount: studentMsgsCount,
        guardianMessagesCount: guardianMsgsCount,
        notificationResults:  result.notificationResults,
      }
    });

  } catch (error) {
    console.error('❌ Error sending manual reminder:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}