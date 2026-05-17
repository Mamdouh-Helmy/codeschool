// /src/app/api/cron/session-reminders/route.js

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Session from '../../../models/Session';
import {
  sendManualSessionReminder,
  sendInstructorSessionReminder,
} from '../../../services/groupAutomation';

const CRON_SECRET = process.env.CRON_SECRET || 'your-secret-key-change-this';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const secret     = searchParams.get('secret');
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
    console.log(`\n🕐 Cron running at UTC: ${now.toISOString()}`);
    console.log(`🕐 Cairo time: ${now.toLocaleString('en-EG', { timeZone: 'Africa/Cairo' })}`);

    const results = {
      timestamp:     now.toISOString(),
      cairoTime:     now.toLocaleString('en-EG', { timeZone: 'Africa/Cairo' }),
      reminder24h:   { checked: 0, sent: 0, skipped: 0, failed: 0, sessions: [], instructorsSent: 0 },
      reminder15min: { checked: 0, sent: 0, skipped: 0, failed: 0, sessions: [], instructorsSent: 0 },
    };

    // ── نافذة 3 أيام ─────────────────────────────────────────────────────
    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);

    const dayEnd = new Date(now);
    dayEnd.setDate(dayEnd.getDate() + 3);
    dayEnd.setUTCHours(23, 59, 59, 999);

    // ============================================================
    // 1) تذكير 24 ساعة — نافذة 23-25 ساعة
    // ============================================================
    const sessions24h = await Session.find({
      status:        'scheduled',
      isDeleted:     false,
      scheduledDate: { $gte: dayStart, $lte: dayEnd },
      'automationEvents.reminder24hSent': { $ne: true },
    }).lean();

    results.reminder24h.checked = sessions24h.length;
    console.log(`\n⏰ [24h] Candidates: ${sessions24h.length}`);

    for (const session of sessions24h) {
      try {
        const sessionDateTime = buildSessionDateTime(session);
        const diffHours       = (sessionDateTime - now) / (1000 * 60 * 60);

        console.log(`   Session: "${session.title}"`);
        console.log(`   sessionDateTime (UTC): ${sessionDateTime.toISOString()}`);
        console.log(`   diff: ${diffHours.toFixed(2)}h`);

        if (diffHours < 23 || diffHours > 25) {
          results.reminder24h.skipped++;
          console.log(`   ⏭️ Skipped (outside 23-25h window)`);
          continue;
        }

        await Session.findByIdAndUpdate(session._id, {
          $set: {
            'automationEvents.reminder24hSent':   true,
            'automationEvents.reminder24hSentAt': new Date(),
          },
        });
        console.log(`   🔒 Marked reminder24hSent = true`);

        // ── طلاب وأولياء الأمور ──
        const result = await sendManualSessionReminder(
          session._id.toString(),
          '24hours',
          null,
          { automatedCron: true }
        );

        if (result.success) {
          results.reminder24h.sent++;
          results.reminder24h.sessions.push({
            id:               session._id,
            title:            session.title,
            scheduledDate:    session.scheduledDate,
            studentsNotified: result.successCount,
          });
          console.log(`   ✅ 24h students sent: ${result.successCount}`);

          await Session.findByIdAndUpdate(session._id, {
            $set: {
              'automationEvents.reminder24hStudentsNotified': result.successCount,
            },
          });
        } else {
          results.reminder24h.failed++;
          console.log(`   ❌ 24h students send failed`);
        }

        // ── المدرسين ──
        try {
          const instructorResult = await sendInstructorSessionReminder(
            session._id.toString(),
            '24hours',
            { automatedCron: true }
          );
          results.reminder24h.instructorsSent += instructorResult.successCount || 0;
          console.log(`   👨‍🏫 24h instructors sent: ${instructorResult.successCount || 0}`);
        } catch (instrErr) {
          console.error(`   ❌ 24h instructor reminder error:`, instrErr.message);
        }

      } catch (err) {
        results.reminder24h.failed++;
        console.error(`   ❌ 24h error for ${session._id}:`, err.message);
      }
    }

    // ============================================================
    // 2) تذكير 15 دقيقة — نافذة 12-18 دقيقة
    // ============================================================
    const sessions15min = await Session.find({
      status:        'scheduled',
      isDeleted:     false,
      scheduledDate: { $gte: dayStart, $lte: dayEnd },
      'automationEvents.reminder15minSent': { $ne: true },
    }).lean();

    results.reminder15min.checked = sessions15min.length;
    console.log(`\n⏰ [15min] Candidates: ${sessions15min.length}`);

    for (const session of sessions15min) {
      try {
        const sessionDateTime = buildSessionDateTime(session);
        const diffMinutes     = (sessionDateTime - now) / (1000 * 60);

        console.log(`   Session: "${session.title}"`);
        console.log(`   sessionDateTime (UTC): ${sessionDateTime.toISOString()}`);
        console.log(`   diff: ${diffMinutes.toFixed(1)}min`);

        if (diffMinutes < 12 || diffMinutes > 18) {
          results.reminder15min.skipped++;
          console.log(`   ⏭️ Skipped (outside 12-18min window)`);
          continue;
        }

        await Session.findByIdAndUpdate(session._id, {
          $set: {
            'automationEvents.reminder15minSent':   true,
            'automationEvents.reminder15minSentAt': new Date(),
            'automationEvents.reminder1hSent':      true,
            'automationEvents.reminder1hSentAt':    new Date(),
          },
        });
        console.log(`   🔒 Marked reminder15minSent = true`);

        // ── طلاب وأولياء الأمور ──
        const result = await sendManualSessionReminder(
          session._id.toString(),
          '15min',
          null,
          { automatedCron: true }
        );

        if (result.success) {
          results.reminder15min.sent++;
          results.reminder15min.sessions.push({
            id:               session._id,
            title:            session.title,
            scheduledDate:    session.scheduledDate,
            studentsNotified: result.successCount,
          });
          console.log(`   ✅ 15min students sent: ${result.successCount}`);

          await Session.findByIdAndUpdate(session._id, {
            $set: {
              'automationEvents.reminder15minStudentsNotified': result.successCount,
            },
          });
        } else {
          results.reminder15min.failed++;
          console.log(`   ❌ 15min students send failed`);
        }

        // ── المدرسين ──
        try {
          const instructorResult = await sendInstructorSessionReminder(
            session._id.toString(),
            '15min',
            { automatedCron: true }
          );
          results.reminder15min.instructorsSent += instructorResult.successCount || 0;
          console.log(`   👨‍🏫 15min instructors sent: ${instructorResult.successCount || 0}`);
        } catch (instrErr) {
          console.error(`   ❌ 15min instructor reminder error:`, instrErr.message);
        }

      } catch (err) {
        results.reminder15min.failed++;
        console.error(`   ❌ 15min error for ${session._id}:`, err.message);
      }
    }

    console.log('\n📊 Cron Summary:', JSON.stringify(results, null, 2));
    return NextResponse.json({ success: true, data: results });

  } catch (error) {
    console.error('❌ Cron job error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// buildSessionDateTime
// ─────────────────────────────────────────────────────────────────────────────
function buildSessionDateTime(session) {
  try {
    const date = new Date(session.scheduledDate);

    if (!session.startTime) return date;

    const [hours, minutes] = session.startTime.split(':').map(Number);

    const cairoDateStr = date.toLocaleDateString('en-CA', {
      timeZone: 'Africa/Cairo',
    });

    const cairoOffset = getCairoUTCOffset();
    const sign        = cairoOffset >= 0 ? '+' : '-';
    const absOffset   = Math.abs(cairoOffset);
    const offsetStr   = `${sign}${String(absOffset).padStart(2, '0')}:00`;

    const isoString = `${cairoDateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00${offsetStr}`;

    const result = new Date(isoString);

    console.log(`   [buildSessionDateTime] cairoDateStr: ${cairoDateStr}`);
    console.log(`   [buildSessionDateTime] cairoOffset: UTC${offsetStr}`);
    console.log(`   [buildSessionDateTime] isoString: ${isoString}`);
    console.log(`   [buildSessionDateTime] result UTC: ${result.toISOString()}`);

    return result;
  } catch (err) {
    console.error('❌ buildSessionDateTime error:', err.message);
    return new Date(session.scheduledDate);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getCairoUTCOffset
// ─────────────────────────────────────────────────────────────────────────────
function getCairoUTCOffset() {
  try {
    const now      = new Date();
    const utcStr   = now.toLocaleString('en-US', { timeZone: 'UTC' });
    const cairoStr = now.toLocaleString('en-US', { timeZone: 'Africa/Cairo' });

    const utcDate   = new Date(utcStr);
    const cairoDate = new Date(cairoStr);

    const diffMs    = cairoDate - utcDate;
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    return diffHours;
  } catch {
    return 2;
  }
}