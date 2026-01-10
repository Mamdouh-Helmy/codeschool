import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Session from '../../../models/Session';
import { requireAdmin } from '@/utils/authMiddleware';
import { onSessionStatusChanged } from '@/app/services/groupAutomation';
import mongoose from 'mongoose';

// GET: Fetch single session
export async function GET(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    await connectDB();

    const { id } = await params; // ✅ await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid session ID format' },
        { status: 400 }
      );
    }

    const session = await Session.findOne({ _id: id, isDeleted: false })
      .populate('groupId', 'name code')
      .populate('courseId', 'title')
      .populate('attendance.studentId', 'personalInfo.fullName enrollmentNumber')
      .populate('attendance.markedBy', 'name email')
      .populate('metadata.createdBy', 'name email');

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: session
    });

  } catch (error) {
    console.error('❌ Error fetching session:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch session'
      },
      { status: 500 }
    );
  }
}

// PUT: Update session
export async function PUT(req, { params }) {
  try {
    const { id } = await params; // ✅ await params
    console.log(`✏️ Updating session: ${id}`);

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const adminUser = authCheck.user;

    await connectDB();

    const updateData = await req.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid session ID format' },
        { status: 400 }
      );
    }

    const existingSession = await Session.findOne({ _id: id, isDeleted: false });

    if (!existingSession) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    const oldStatus = existingSession.status;
    const newStatus = updateData.status;

    const updatePayload = {
      ...updateData,
      'metadata.updatedBy': adminUser.id,
      'metadata.updatedAt': new Date()
    };

    const updatedSession = await Session.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      {
        new: true,
        runValidators: true
      }
    )
      .populate('groupId', 'name code')
      .populate('courseId', 'title');

    console.log(`✅ Session updated: ${updatedSession.title}`);

    // Trigger automation if status changed
    if (newStatus && oldStatus !== newStatus && (newStatus === 'cancelled' || newStatus === 'postponed')) {
      setTimeout(async () => {
        try {
          console.log('🔄 Starting automation for status change...');
          const automationResult = await onSessionStatusChanged(
            id,
            newStatus,
            updateData.reason || ''
          );
          console.log('✅ Automation completed:', automationResult);
        } catch (automationError) {
          console.error('❌ Automation failed:', automationError);
        }
      }, 1000);
    }

    return NextResponse.json({
      success: true,
      message: 'Session updated successfully',
      data: updatedSession,
      automation: (newStatus && oldStatus !== newStatus && (newStatus === 'cancelled' || newStatus === 'postponed')) ? {
        triggered: true,
        action: `Broadcasting ${newStatus} notification to all students`,
        status: 'processing'
      } : null
    });

  } catch (error) {
    console.error('❌ Error updating session:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors || {})
        .map(err => err.message)
        .join('; ');
      
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: messages
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update session'
      },
      { status: 500 }
    );
  }
}

// DELETE: Soft delete session
export async function DELETE(req, { params }) {
  try {
    const { id } = await params; // ✅ await params
    console.log(`🗑️ Soft deleting session: ${id}`);

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid session ID format' },
        { status: 400 }
      );
    }

    const deletedSession = await Session.findByIdAndUpdate(
      id,
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          status: 'cancelled'
        }
      },
      { new: true }
    );

    if (!deletedSession) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Session deleted: ${deletedSession.title}`);

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully (soft delete)',
      data: {
        id: deletedSession._id,
        title: deletedSession.title,
        deletedAt: deletedSession.deletedAt
      }
    });

  } catch (error) {
    console.error('❌ Error deleting session:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete session'
      },
      { status: 500 }
    );
  }
}