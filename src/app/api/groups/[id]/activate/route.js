// app/api/groups/[id]/activate/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Group from '../../../../models/Group';
import Session from '../../../../models/Session';
import { requireAdmin } from '@/utils/authMiddleware';
import { onGroupActivated } from '../../../../services/groupAutomation';
import mongoose from 'mongoose';

export async function POST(req, { params }) {
  try {
    // ✅ FIX: Await params أولاً
    const { id } = await params;
    
    console.log(`🎯 Activating group: ${id}`);

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const adminUser = authCheck.user;

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid group ID format' },
        { status: 400 }
      );
    }

    const group = await Group.findOne({ _id: id, isDeleted: false })
      .populate('courseId');

    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    if (group.status === 'active') {
      return NextResponse.json(
        {
          success: false,
          error: 'Group is already active'
        },
        { status: 400 }
      );
    }

    if (group.status === 'completed') {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot activate a completed group'
        },
        { status: 400 }
      );
    }

    if (!group.courseId || !group.courseId.curriculum || group.courseId.curriculum.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot activate group: Course has no curriculum'
        },
        { status: 400 }
      );
    }

    // ✅ التحقق من جدول المجموعة
    if (!group.schedule || !group.schedule.startDate || !group.schedule.daysOfWeek || group.schedule.daysOfWeek.length !== 3) {
      return NextResponse.json(
        {
          success: false,
          error: 'Group must have a valid schedule with exactly 3 days selected'
        },
        { status: 400 }
      );
    }

    // Update group status to active FIRST
    await Group.findByIdAndUpdate(
      id,
      {
        $set: {
          status: 'active',
          'metadata.activatedAt': new Date(),
          'metadata.lastModifiedBy': adminUser.id,
          'metadata.updatedAt': new Date()
        }
      }
    );

    // ✅ Now fetch the updated group for automation
    const updatedGroup = await Group.findById(id)
      .populate('courseId', 'title level curriculum')
      .populate('instructors', 'name email');

    console.log(`✅ Group activated: ${updatedGroup.code}`);

    // ✅ محاولة إصلاح الفهارس أولاً
    try {
      console.log("🛠️  Attempting to fix database indexes...");
      await Session.syncIndexes();
      console.log("✅ Database indexes synced");
    } catch (indexError) {
      console.warn("⚠️  Could not sync indexes:", indexError.message);
    }

    // Trigger automation (session generation + notifications)
    try {
      console.log('🔄 Starting automation for activated group...');
      const automationResult = await onGroupActivated(id, adminUser.id);
      console.log('✅ Automation completed:', automationResult);
      
      return NextResponse.json({
        success: true,
        message: 'Group activated successfully',
        data: {
          id: updatedGroup._id,
          code: updatedGroup.code,
          name: updatedGroup.name,
          status: updatedGroup.status,
          activatedAt: updatedGroup.metadata.activatedAt,
          course: updatedGroup.courseId,
          instructors: updatedGroup.instructors,
          sessionsGenerated: true,
          totalSessions: automationResult.sessionsGenerated
        },
        automation: {
          triggered: true,
          actions: [
            'Generating sessions from course curriculum',
            'Notifying instructors (if automation enabled)'
          ],
          status: 'completed',
          details: automationResult
        }
      });
      
    } catch (automationError) {
      console.error('❌ Automation failed:', automationError);
      
      // Rollback group status if automation fails
      await Group.findByIdAndUpdate(id, {
        $set: {
          status: 'draft',
          'metadata.updatedAt': new Date()
        }
      });
      
      return NextResponse.json(
        {
          success: false,
          error: `Automation failed: ${automationError.message}`,
          suggestion: 'Group status reverted to draft. Please check the schedule and try again.'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Error activating group:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to activate group'
      },
      { status: 500 }
    );
  }
}