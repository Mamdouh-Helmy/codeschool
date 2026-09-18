// /src/app/api/cron/session-reminders/route.js

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Session from '../../../models/Session';
import {
  // ✅ ONLINE
  sendManualSessionReminder,
  sendInstructorSessionReminder,
  // ✅ OFFLINE
  sendOfflineLocationReminder,
  sendOfflineDropoffAlert,
  sendOfflinePreAttendancePing,
  sendInstructorOfflineReminder,
  // ✅ AUTOMATIONS
  checkAndSendGroupCompletionNotifications,
} from '../../../services/groupAutomation';

const CRON_SECRET = process.env.CRON_SECRET || 'your-secret-key-change-this';

// ============================================================
// ✅ WINDOWS — كل reminder ليه نافذة زمنية محددة
// ============================================================
const WINDOWS = {
  reminder24h:          { min: 23, max: 25, unit: 'hours' },
  reminder15min:        { min: 12, max: 18, unit: 'minutes' },
  reminder24hOffline:   { min: 23, max: 25, unit: 'hours' },
  reminder30minOffline: { min: 27, max: 33, unit: 'minutes' },
  preAttendancePing:    { min: 3,  max: 8,  unit: 'minutes' },
};

// ============================================================
// ✅ Helper: تحديد نوع الجلسة (offline / online)
// ============================================================
function getSessionDeliveryMode(session) {
  const sessionMode = session?.deliveryMode;

  if (sessionMode === 'offline' || sessionMode === 'online') {
    return sessionMode;
  }

  const groupMode = session?.groupId?.deliveryMode;

  if (groupMode === 'offline' || groupMode === 'online') {
    return groupMode;
  }

  return 'online';
}

// ============================================================
// ✅ Helper: Atomic lock — يمنع تكرار الإرسال نهائيًا
// ============================================================
async function lockSessionFlag(sessionId, flagField) {
  const result = await Session.findOneAndUpdate(
    {
      _id: sessionId,
      isDeleted: false,
      [flagField]: { $ne: true },
    },
    {
      $set: {
        [flagField]: true,
        [`${flagField}At`]: new Date(),
      },
    },
    { new: true },
  );

  return result;
}

// ============================================================
// ✅ Helper: يفتح الـ lock (في حالة الفشل الكامل)
// ============================================================
async function unlockSessionFlag(sessionId, flagField) {
  try {
    await Session.updateOne(
      { _id: sessionId },
      {
        $unset: { [flagField]: '' },
        $set: { [`${flagField}At`]: null },
      },
    );
  } catch (err) {
    console.error(
      `⚠️ Failed to unlock ${flagField} for ${sessionId}:`,
      err.message
    );
  }
}

// ============================================================
// ✅ GET — نقطة الدخول للكرون
// ============================================================
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

      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        {
          status: 401,
        }
      );
    }

    await connectDB();

    const now = new Date();

    console.log(`\n🕐 Cron running at UTC: ${now.toISOString()}`);

    console.log(
      `🕐 Cairo time: ${now.toLocaleString('en-EG', {
        timeZone: 'Africa/Cairo',
      })}`
    );

    const results = {
      timestamp: now.toISOString(),

      cairoTime: now.toLocaleString('en-EG', {
        timeZone: 'Africa/Cairo',
      }),

      // 🌐 ONLINE
      reminder24h: {
        checked: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
        duplicates: 0,
        sessions: [],
        instructorsSent: 0,
      },

      reminder15min: {
        checked: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
        duplicates: 0,
        sessions: [],
        instructorsSent: 0,
      },

      // 📍 OFFLINE
      reminder24hOffline: {
        checked: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
        duplicates: 0,
        sessions: [],
        instructorsSent: 0,
      },

      reminder30minOffline: {
        checked: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
        duplicates: 0,
        sessions: [],
        instructorsSent: 0,
      },

      preAttendancePing: {
        checked: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
        duplicates: 0,
        sessions: [],
        instructorsSent: 0,
      },

      // ✅ AUTOMATIONS
      groupCompletion: {
        processed: 0,
        sent: 0,
        groups: [],
      },
    };

    // ============================================================
    // ✅ نافذة 3 أيام — نجيب كل المرشحين مرة واحدة
    // ============================================================
    const dayStart = new Date(now);

    dayStart.setUTCHours(0, 0, 0, 0);

    const dayEnd = new Date(now);

    dayEnd.setDate(dayEnd.getDate() + 3);

    dayEnd.setUTCHours(23, 59, 59, 999);

    const allCandidates = await Session.find({
      status: { $ne: 'completed' },
      isDeleted: false,
      scheduledDate: {
        $gte: dayStart,
        $lte: dayEnd,
      },
    })
      .populate(
        'groupId',
        'deliveryMode location locationDetails name code'
      )
      .lean();

    console.log(
      `\n📋 Total candidates in window: ${allCandidates.length}`
    );

    // ============================================================
    // ✅ نقسم المرشحين: Online / Offline
    // ============================================================
    const onlineSessions = [];
    const offlineSessions = [];

    for (const s of allCandidates) {
      if (getSessionDeliveryMode(s) === 'offline') {
        offlineSessions.push(s);
      } else {
        onlineSessions.push(s);
      }
    }

    console.log(`   🌐 Online: ${onlineSessions.length}`);
    console.log(`   📍 Offline: ${offlineSessions.length}`);

    // ============================================================
    // 🌐 ONLINE FLOW — 24h
    // ============================================================
    await processReminder({
      label: 'ONLINE 24h',
      sessions: onlineSessions,
      now,
      window: WINDOWS.reminder24h,
      flagField: 'automationEvents.reminder24hSent',
      resultsBucket: results.reminder24h,

      sendFn: async (session) => {
        return await sendManualSessionReminder(
          session._id.toString(),
          '24hours',
          null,
          {
            automatedCron: true,
          }
        );
      },

      instructorFn: async (session) => {
        return await sendInstructorSessionReminder(
          session._id.toString(),
          '24hours',
          {
            automatedCron: true,
          }
        );
      },

      studentsCountField:
        'automationEvents.reminder24hStudentsNotified',

      instructorsCountField: null,

      extraFields: {
        'automationEvents.reminderSent': true,
        'automationEvents.reminderSentAt': new Date(),
      },
    });

    // ============================================================
    // 🌐 ONLINE FLOW — 15min
    // ============================================================
    await processReminder({
      label: 'ONLINE 15min',
      sessions: onlineSessions,
      now,
      window: WINDOWS.reminder15min,
      flagField: 'automationEvents.reminder15minSent',
      resultsBucket: results.reminder15min,

      sendFn: async (session) => {
        return await sendManualSessionReminder(
          session._id.toString(),
          '15min',
          null,
          {
            automatedCron: true,
          }
        );
      },

      instructorFn: async (session) => {
        return await sendInstructorSessionReminder(
          session._id.toString(),
          '15min',
          {
            automatedCron: true,
          }
        );
      },

      studentsCountField:
        'automationEvents.reminder15minStudentsNotified',

      instructorsCountField: null,

      extraFields: {
        'automationEvents.reminder1hSent': true,
        'automationEvents.reminder1hSentAt': new Date(),
      },
    });

    // ============================================================
    // 📍 OFFLINE FLOW — 24h (Maps / Location)
    // ============================================================
    await processReminder({
      label: 'OFFLINE 24h',
      sessions: offlineSessions,
      now,
      window: WINDOWS.reminder24hOffline,
      flagField: 'automationEvents.reminder24hOfflineSent',
      resultsBucket: results.reminder24hOffline,

      sendFn: async (session) => {
        return await sendOfflineLocationReminder(
          session._id.toString(),
          {
            automatedCron: true,
          }
        );
      },

      instructorFn: async (session) => {
        return await sendInstructorOfflineReminder(
          session._id.toString(),
          '24hours_offline',
          {
            automatedCron: true,
          }
        );
      },

      studentsCountField:
        'automationEvents.reminder24hOfflineStudentsNotified',

      instructorsCountField:
        'automationEvents.reminder24hOfflineInstructorsNotified',
    });

    // ============================================================
    // 📍 OFFLINE FLOW — 30min (Drop-off Alert)
    // ============================================================
    await processReminder({
      label: 'OFFLINE 30min',
      sessions: offlineSessions,
      now,
      window: WINDOWS.reminder30minOffline,
      flagField: 'automationEvents.reminder30minOfflineSent',
      resultsBucket: results.reminder30minOffline,

      sendFn: async (session) => {
        return await sendOfflineDropoffAlert(
          session._id.toString(),
          {
            automatedCron: true,
          }
        );
      },

      instructorFn: async (session) => {
        return await sendInstructorOfflineReminder(
          session._id.toString(),
          '30min_offline',
          {
            automatedCron: true,
          }
        );
      },

      studentsCountField:
        'automationEvents.reminder30minOfflineStudentsNotified',

      instructorsCountField:
        'automationEvents.reminder30minOfflineInstructorsNotified',
    });

    // ============================================================
    // 📍 OFFLINE FLOW — Pre-Attendance Ping
    // ============================================================
    await processReminder({
      label: 'OFFLINE Ping',
      sessions: offlineSessions,
      now,
      window: WINDOWS.preAttendancePing,
      flagField: 'automationEvents.preAttendancePingSent',
      resultsBucket: results.preAttendancePing,

      sendFn: async (session) => {
        return await sendOfflinePreAttendancePing(
          session._id.toString(),
          {
            automatedCron: true,
          }
        );
      },

      instructorFn: async (session) => {
        return await sendInstructorOfflineReminder(
          session._id.toString(),
          'pre_attendance_ping',
          {
            automatedCron: true,
          }
        );
      },

      studentsCountField:
        'automationEvents.preAttendancePingStudentsNotified',

      instructorsCountField:
        'automationEvents.preAttendancePingInstructorsNotified',
    });

    // ============================================================
    // ✅ GROUP COMPLETION — يفحص كل الجروبات اللي خلصت
    // ============================================================
    try {
      const completionResult =
        await checkAndSendGroupCompletionNotifications();

      results.groupCompletion = {
        processed: completionResult.processed || 0,
        sent: completionResult.sent || 0,
        groups: completionResult.results || [],
      };

      console.log(
        `\n🎓 GROUP COMPLETION: processed ${completionResult.processed}, sent ${completionResult.sent}`
      );
    } catch (completionErr) {
      console.error(
        '❌ Group completion cron error:',
        completionErr.message
      );

      results.groupCompletion = {
        error: completionErr.message,
      };
    }

    console.log(
      '\n📊 Cron Summary:',
      JSON.stringify(results, null, 2)
    );

    return NextResponse.json({
      success: true,
      data: results,
    });

  } catch (error) {
    console.error('❌ Cron job error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}

// ============================================================
// ✅ processReminder — دالة موحدة لكل الأنواع
// ============================================================
async function processReminder({
  label,
  sessions,
  now,
  window,
  flagField,
  resultsBucket,
  sendFn,
  instructorFn,
  studentsCountField,
  instructorsCountField,
  extraFields = {},
}) {
  const flagKey = flagField.split('.').pop();

  const candidates = sessions.filter(
    (s) => s.automationEvents?.[flagKey] !== true
  );

  resultsBucket.checked = candidates.length;

  console.log(
    `\n⏰ [${label}] Candidates: ${candidates.length}`
  );

  for (const session of candidates) {
    try {
      const sessionDateTime =
        buildSessionDateTime(session);

      const diff = computeDiff(
        sessionDateTime,
        now,
        window.unit
      );

      if (
        diff < window.min ||
        diff > window.max
      ) {
        resultsBucket.skipped++;
        continue;
      }

      const locked = await lockSessionFlag(
        session._id,
        flagField
      );

      if (!locked) {
        resultsBucket.duplicates++;

        console.log(
          `   🔒 Already locked by another run — skipping`
        );

        continue;
      }

      console.log(
        `   🔒 Locked: ${session.title} | diff: ${diff.toFixed(
          2
        )} ${window.unit}`
      );

      // ── إرسال للطلاب ──
      let studentResult = null;

      try {
        studentResult = await sendFn(session);
      } catch (err) {
        console.error(
          `   ❌ Student send error:`,
          err.message
        );

        studentResult = {
          success: false,
          error: err.message,
        };
      }

      // ── إرسال للمدرس ──
      let instructorResult = null;

      try {
        instructorResult = await instructorFn(session);
      } catch (err) {
        console.error(
          `   ❌ Instructor send error:`,
          err.message
        );

        instructorResult = {
          success: false,
          error: err.message,
        };
      }

      const studentsSent =
        studentResult?.successCount || 0;

      const instructorsSent =
        instructorResult?.successCount || 0;

      const anySuccess =
        studentResult?.success === true ||
        instructorsSent > 0;

      if (anySuccess) {
        resultsBucket.sent++;

        resultsBucket.instructorsSent +=
          instructorsSent;

        resultsBucket.sessions.push({
          id: session._id,
          title: session.title,
          status: session.status,
          scheduledDate: session.scheduledDate,
          deliveryMode:
            getSessionDeliveryMode(session),
          studentsNotified: studentsSent,
          instructorsNotified: instructorsSent,
        });

        await Session.findByIdAndUpdate(
          session._id,
          {
            $set: {
              [studentsCountField]: studentsSent,

              ...(instructorsCountField
                ? {
                    [instructorsCountField]:
                      instructorsSent,
                  }
                : {}),

              ...extraFields,
            },
          }
        );

        console.log(
          `   ✅ ${label} — students: ${studentsSent} | instructors: ${instructorsSent}`
        );

      } else {
        resultsBucket.failed++;

        await unlockSessionFlag(
          session._id,
          flagField
        );

        console.log(
          `   ❌ ${label} — total failure, unlocked for retry`
        );
      }

    } catch (err) {
      resultsBucket.failed++;

      console.error(
        `   ❌ ${label} error for ${session._id}:`,
        err.message
      );

      try {
        await unlockSessionFlag(
          session._id,
          flagField
        );
      } catch (_) {}
    }
  }
}

// ============================================================
// ✅ computeDiff — بيحسب الفرق بوحدات (hours/minutes)
// ============================================================
function computeDiff(
  sessionDateTime,
  now,
  unit
) {
  const diffMs =
    sessionDateTime - now;

  if (unit === 'hours') {
    return diffMs / (1000 * 60 * 60);
  }

  return diffMs / (1000 * 60);
}

// ============================================================
// buildSessionDateTime
// ============================================================
function buildSessionDateTime(session) {
  try {
    const date =
      new Date(session.scheduledDate);

    if (!session.startTime) {
      return date;
    }

    const [hours, minutes] =
      session.startTime
        .split(':')
        .map(Number);

    const cairoDateStr =
      date.toLocaleDateString('en-CA', {
        timeZone: 'Africa/Cairo',
      });

    const cairoOffset =
      getCairoUTCOffset();

    const sign =
      cairoOffset >= 0 ? '+' : '-';

    const absOffset =
      Math.abs(cairoOffset);

    const offsetStr =
      `${sign}${String(absOffset).padStart(
        2,
        '0'
      )}:00`;

    const isoString =
      `${cairoDateStr}T${String(hours).padStart(
        2,
        '0'
      )}:${String(minutes).padStart(
        2,
        '0'
      )}:00${offsetStr}`;

    return new Date(isoString);

  } catch (err) {
    console.error(
      '❌ buildSessionDateTime error:',
      err.message
    );

    return new Date(
      session.scheduledDate
    );
  }
}

// ============================================================
// getCairoUTCOffset
// ============================================================
function getCairoUTCOffset() {
  try {
    const now = new Date();

    const utcStr =
      now.toLocaleString('en-US', {
        timeZone: 'UTC',
      });

    const cairoStr =
      now.toLocaleString('en-US', {
        timeZone: 'Africa/Cairo',
      });

    const utcDate =
      new Date(utcStr);

    const cairoDate =
      new Date(cairoStr);

    const diffMs =
      cairoDate - utcDate;

    const diffHours =
      Math.round(
        diffMs / (1000 * 60 * 60)
      );

    return diffHours;

  } catch {
    return 2;
  }
}