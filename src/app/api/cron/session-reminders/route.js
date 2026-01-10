// app/api/cron/session-reminders/route.js
/**
 * This endpoint should be called by a cron job (e.g., every hour)
 * to send session reminders to students X hours before their sessions.
 * 
 * Setup with Vercel Cron:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/session-reminders",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 * 
 * Or use external services like:
 * - EasyCron
 * - Cron-job.org
 * - AWS EventBridge
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Session from '../../../models/Session';
import Group from '../../../models/Group';
import { sendSessionReminders } from '@/app/services/groupAutomation';

export async function GET(req) {
  try {
    console.log('⏰ Starting session reminder cron job...');

    // Security: Verify cron secret (optional but recommended)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log('❌ Unauthorized cron request');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const now = new Date();

    // Find all active groups with reminder enabled
    const activeGroups = await Group.find({
      status: 'active',
      'automation.whatsappEnabled': true,
      'automation.reminderEnabled': true,
      isDeleted: false
    }).lean();

    console.log(`📊 Found ${activeGroups.length} active groups with reminders enabled`);

    let totalProcessed = 0;
    let totalSent = 0;
    let totalFailed = 0;

    for (const group of activeGroups) {
      const reminderHours = group.automation.reminderBeforeHours || 24;
      
      // Calculate time window
      const reminderTime = new Date(now);
      reminderTime.setHours(reminderTime.getHours() + reminderHours);

      const windowStart = new Date(reminderTime);
      windowStart.setMinutes(0, 0, 0);

      const windowEnd = new Date(reminderTime);
      windowEnd.setMinutes(59, 59, 999);

      // Find sessions that need reminders
      const sessionsNeedingReminders = await Session.find({
        groupId: group._id,
        status: 'scheduled',
        scheduledDate: {
          $gte: windowStart,
          $lte: windowEnd
        },
        'automationEvents.reminderSent': false,
        isDeleted: false
      });

      console.log(`📅 Group ${group.code}: ${sessionsNeedingReminders.length} sessions need reminders`);

      for (const session of sessionsNeedingReminders) {
        try {
          const result = await sendSessionReminders(session._id);
          
          if (result.success) {
            totalSent += result.successCount;
            totalFailed += result.failCount;
            console.log(`✅ Reminders sent for session: ${session.title}`);
          }

          totalProcessed++;

        } catch (error) {
          console.error(`❌ Failed to send reminders for session ${session._id}:`, error);
          totalFailed++;
        }
      }
    }

    console.log('✅ Cron job completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Session reminders processed',
      stats: {
        groupsChecked: activeGroups.length,
        sessionsProcessed: totalProcessed,
        remindersSent: totalSent,
        remindersFailed: totalFailed
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in session reminders cron:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process session reminders',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Allow POST as well (for manual triggering)
export async function POST(req) {
  return GET(req);
}