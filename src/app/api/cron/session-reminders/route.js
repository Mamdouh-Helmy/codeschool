// /src/app/api/cron/session-reminders/route.js

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Session from '../../../models/Session';
import { sendManualSessionReminder } from '../../../services/groupAutomation';

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
      reminder24h:   { checked: 0, sent: 0, skipped: 0, failed: 0, sessions: [] },
      reminder15min: { checked: 0, sent: 0, skipped: 0, failed: 0, sessions: [] },
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

        // ✅ خارج النافذة — skip بدون flag
        if (diffHours < 23 || diffHours > 25) {
          results.reminder24h.skipped++;
          console.log(`   ⏭️ Skipped (outside 23-25h window)`);
          continue;
        }

        // ✅ داخل النافذة — نعمل flag أولاً عشان نضمن إرسال مرة واحدة بس
        // حتى لو فشل الإرسال مش هيبعت تاني
        await Session.findByIdAndUpdate(session._id, {
          $set: {
            'automationEvents.reminder24hSent':   true,
            'automationEvents.reminder24hSentAt': new Date(),
          },
        });
        console.log(`   🔒 Marked reminder24hSent = true`);

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
          console.log(`   ✅ 24h sent: ${result.successCount} students`);

          // ✅ بنحدث عدد الطلاب اللي اتبعتلهم
          await Session.findByIdAndUpdate(session._id, {
            $set: {
              'automationEvents.reminder24hStudentsNotified': result.successCount,
            },
          });
        } else {
          results.reminder24h.failed++;
          console.log(`   ❌ 24h send failed — flag already set, won't retry`);
        }

      } catch (err) {
        results.reminder24h.failed++;
        console.error(`   ❌ 24h error for ${session._id}:`, err.message);

        // ✅ حتى لو حصل error — الـ flag اتعمل فوق، مش هيبعت تاني
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

        // ✅ خارج النافذة — skip بدون flag
        if (diffMinutes < 12 || diffMinutes > 18) {
          results.reminder15min.skipped++;
          console.log(`   ⏭️ Skipped (outside 12-18min window)`);
          continue;
        }

        // ✅ داخل النافذة — نعمل flag أولاً عشان نضمن إرسال مرة واحدة بس
        await Session.findByIdAndUpdate(session._id, {
          $set: {
            'automationEvents.reminder15minSent':   true,
            'automationEvents.reminder15minSentAt': new Date(),
            // للتوافق مع الكود القديم
            'automationEvents.reminder1hSent':   true,
            'automationEvents.reminder1hSentAt': new Date(),
          },
        });
        console.log(`   🔒 Marked reminder15minSent = true`);

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
          console.log(`   ✅ 15min sent: ${result.successCount} students`);

          // ✅ بنحدث عدد الطلاب اللي اتبعتلهم
          await Session.findByIdAndUpdate(session._id, {
            $set: {
              'automationEvents.reminder15minStudentsNotified': result.successCount,
            },
          });
        } else {
          results.reminder15min.failed++;
          console.log(`   ❌ 15min send failed — flag already set, won't retry`);
        }

      } catch (err) {
        results.reminder15min.failed++;
        console.error(`   ❌ 15min error for ${session._id}:`, err.message);

        // ✅ حتى لو حصل error — الـ flag اتعمل فوق، مش هيبعت تاني
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
// scheduledDate بيتخزن كـ 00:00 UTC
// startTime بيتخزن كـ "08:40" بتوقيت القاهرة
// ─────────────────────────────────────────────────────────────────────────────
function buildSessionDateTime(session) {
  try {
    const date = new Date(session.scheduledDate);

    if (!session.startTime) return date;

    const [hours, minutes] = session.startTime.split(':').map(Number);

    // ✅ بناخد التاريخ بتوقيت القاهرة
    const cairoDateStr = date.toLocaleDateString('en-CA', {
      timeZone: 'Africa/Cairo',
    });

    // ✅ بنحسب الـ offset الحالي لـ Cairo (UTC+2 شتاء أو UTC+3 صيف)
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
// مصر: UTC+2 شتاء، UTC+3 صيف
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

    return diffHours; // +2 أو +3
  } catch {
    return 2; // fallback
  }
}