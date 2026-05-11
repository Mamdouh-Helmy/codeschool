// /src/app/api/cron/session-reminders/route.js

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Session from '../../../models/Session';
import { sendManualSessionReminder } from '../../../services/groupAutomation';

const CRON_SECRET = process.env.CRON_SECRET || 'your-secret-key-change-this';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    const authHeader = req.headers.get('authorization');

    const isAuthorized =
      secret === CRON_SECRET ||
      authHeader === `Bearer ${CRON_SECRET}`;

    if (!isAuthorized) {
      console.warn('⛔ Unauthorized cron request');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const now = new Date();
    const results = {
      timestamp: now.toISOString(),
      reminder24h:  { checked: 0, sent: 0, skipped: 0, failed: 0, sessions: [] },
      reminder15min: { checked: 0, sent: 0, skipped: 0, failed: 0, sessions: [] },
    };

    // ============================================================
    // ✅ نافذة يومين عشان scheduledDate بيتخزن كـ 00:00 بدون وقت
    // ============================================================
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(now);
    dayEnd.setDate(dayEnd.getDate() + 2);
    dayEnd.setHours(23, 59, 59, 999);

    // ============================================================
    // ✅ 1) تذكير 24 ساعة
    // ============================================================
    const sessions24h = await Session.find({
      status: 'scheduled',
      isDeleted: false,
      scheduledDate: { $gte: dayStart, $lte: dayEnd },
      'automationEvents.reminder24hSent': { $ne: true },
    }).lean();

    results.reminder24h.checked = sessions24h.length;
    console.log(`\n⏰ [24h] Candidates: ${sessions24h.length}`);

    for (const session of sessions24h) {
      try {
        const sessionDateTime = buildSessionDateTime(session);
        const diffHours = (sessionDateTime - now) / (1000 * 60 * 60);

        console.log(`   Session: ${session.title} | diff: ${diffHours.toFixed(2)}h`);

        if (diffHours < 23 || diffHours > 26) {
          results.reminder24h.skipped++;
          continue;
        }

        const result = await sendManualSessionReminder(
          session._id.toString(),
          '24hours',
          null,
          { automatedCron: true }
        );

        if (result.success) {
          results.reminder24h.sent++;
          results.reminder24h.sessions.push({
            id: session._id,
            title: session.title,
            scheduledDate: session.scheduledDate,
            studentsNotified: result.successCount,
          });
          console.log(`✅ 24h sent: ${result.successCount} students`);
        } else {
          results.reminder24h.failed++;
        }
      } catch (err) {
        results.reminder24h.failed++;
        console.error(`❌ 24h error for ${session._id}:`, err.message);
      }
    }

    // ============================================================
    // ✅ 2) تذكير 15 دقيقة (بديل الـ 1 ساعة)
    //    نافذة: من 10 دقايق لـ 20 دقيقة قبل الحصة
    //    يعني لو الـ cron بيشتغل كل 5 دقايق، هيلتقطه مرة واحدة بس
    // ============================================================
    const sessions15min = await Session.find({
      status: 'scheduled',
      isDeleted: false,
      scheduledDate: { $gte: dayStart, $lte: dayEnd },
      'automationEvents.reminder15minSent': { $ne: true },
    }).lean();

    results.reminder15min.checked = sessions15min.length;
    console.log(`\n⏰ [15min] Candidates: ${sessions15min.length}`);

    for (const session of sessions15min) {
      try {
        const sessionDateTime = buildSessionDateTime(session);
        const diffMinutes = (sessionDateTime - now) / (1000 * 60);

        console.log(`   Session: ${session.title} | diff: ${diffMinutes.toFixed(1)}min`);

        // نافذة 10-20 دقيقة قبل الحصة
        if (diffMinutes < 10 || diffMinutes > 20) {
          results.reminder15min.skipped++;
          continue;
        }

        const result = await sendManualSessionReminder(
          session._id.toString(),
          '15min',
          null,
          { automatedCron: true, reminderType: '15min' }
        );

        if (result.success) {
          results.reminder15min.sent++;
          results.reminder15min.sessions.push({
            id: session._id,
            title: session.title,
            scheduledDate: session.scheduledDate,
            studentsNotified: result.successCount,
          });
          console.log(`✅ 15min sent: ${result.successCount} students`);
        } else {
          results.reminder15min.failed++;
        }
      } catch (err) {
        results.reminder15min.failed++;
        console.error(`❌ 15min error for ${session._id}:`, err.message);
      }
    }

    console.log('\n📊 Cron Summary:', JSON.stringify(results, null, 2));
    return NextResponse.json({ success: true, data: results });

  } catch (error) {
    console.error('❌ Cron job error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function buildSessionDateTime(session) {
  // scheduledDate محفوظ كـ 00:00 UTC
  // startTime محفوظ كـ "18:00" بتوقيت القاهرة (UTC+2)
  // فلازم نطرح 2 ساعة عشان نحوله لـ UTC

  const date = new Date(session.scheduledDate);

  if (session.startTime) {
    const [hours, minutes] = session.startTime.split(':').map(Number);
    // Cairo = UTC+2, فنحط الوقت كـ UTC بطرح 2 ساعة
    date.setUTCHours(hours - 2, minutes, 0, 0);
  }

  return date;
}