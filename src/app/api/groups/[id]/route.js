// app/api/groups/[id]/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Group from '../../../models/Group';
import Session from '../../../models/Session';
import { requireAdmin } from '@/utils/authMiddleware';
import mongoose from 'mongoose';

// GET: Fetch single group by ID
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
        { success: false, error: 'Invalid group ID format' },
        { status: 400 }
      );
    }

    const group = await Group.findOne({ _id: id, isDeleted: false })
      .populate('courseId')
      .populate('instructors', 'name email phone')
      .populate('students', 'personalInfo.fullName personalInfo.email enrollmentNumber')
      .populate('metadata.createdBy', 'name email');

    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    // Get sessions count by status
    const sessionsStats = await Session.aggregate([
      { $match: { groupId: group._id, isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statsMap = {};
    sessionsStats.forEach(s => {
      statsMap[s._id] = s.count;
    });

    const formattedGroup = {
      id: group._id,
      name: group.name,
      code: group.code,
      status: group.status,
      course: group.courseId,
      courseSnapshot: group.courseSnapshot,
      instructors: group.instructors,
      students: group.students,
      studentsCount: group.currentStudentsCount,
      maxStudents: group.maxStudents,
      availableSeats: group.maxStudents - group.currentStudentsCount,
      isFull: group.currentStudentsCount >= group.maxStudents,
      schedule: group.schedule,
      pricing: group.pricing,
      automation: group.automation,
      sessionsGenerated: group.sessionsGenerated,
      totalSessions: group.totalSessionsCount,
      sessionsStats: {
        scheduled: statsMap.scheduled || 0,
        completed: statsMap.completed || 0,
        cancelled: statsMap.cancelled || 0,
        postponed: statsMap.postponed || 0
      },
      metadata: group.metadata
    };

    return NextResponse.json({
      success: true,
      data: formattedGroup
    });

  } catch (error) {
    console.error('❌ Error fetching group:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch group'
      },
      { status: 500 }
    );
  }
}

// PUT: Update group
export async function PUT(req, { params }) {
  try {
    const { id } = await params; // ✅ await params
    console.log(`✏️ Updating group: ${id}`);

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

    const updateData = await req.json();
    console.log('📥 Update data:', JSON.stringify(updateData, null, 2));

    const existingGroup = await Group.findOne({ _id: id, isDeleted: false });

    if (!existingGroup) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    // Prevent updating if sessions are generated and group is active
    if (existingGroup.sessionsGenerated && existingGroup.status === 'active') {
      const restrictedFields = ['schedule', 'courseId'];
      const hasRestrictedChanges = restrictedFields.some(field => 
        updateData[field] !== undefined
      );

      if (hasRestrictedChanges) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot modify schedule or course for active groups with generated sessions',
            suggestion: 'Cancel and recreate the group, or regenerate sessions'
          },
          { status: 400 }
        );
      }
    }

    // ✅ Build update payload correctly (without nested metadata fields)
    const updatePayload = {
      ...updateData,
      metadata: {
        ...existingGroup.metadata.toObject(),
        updatedBy: adminUser.id,
        updatedAt: new Date()
      }
    };

    const updatedGroup = await Group.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: updatePayload },
      {
        new: true,
        runValidators: true
      }
    )
      .populate('courseId', 'title level')
      .populate('instructors', 'name email')
      .populate('students', 'personalInfo.fullName enrollmentNumber');

    if (!updatedGroup) {
      return NextResponse.json(
        { success: false, error: 'Failed to update group' },
        { status: 500 }
      );
    }

    console.log(`✅ Group updated: ${updatedGroup.code}`);

    return NextResponse.json({
      success: true,
      message: 'Group updated successfully',
      data: updatedGroup
    });

  } catch (error) {
    console.error('❌ Error updating group:', error);

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
        error: error.message || 'Failed to update group'
      },
      { status: 500 }
    );
  }
}

// DELETE: Soft delete group
export async function DELETE(req, { params }) {
  try {
    const { id } = await params; // ✅ await params
    console.log(`🗑️ Soft deleting group: ${id}`);

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

    const existingGroup = await Group.findOne({ _id: id, isDeleted: false });

    if (!existingGroup) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    // Soft delete the group
    const deletedGroup = await Group.findOneAndUpdate(
      { _id: id, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          status: 'cancelled',
          'metadata.updatedBy': adminUser.id,
          'metadata.updatedAt': new Date()
        }
      },
      { new: true }
    );

    // Also soft delete all related sessions
    await Session.updateMany(
      { groupId: id, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          status: 'cancelled'
        }
      }
    );

    console.log(`✅ Group deleted: ${deletedGroup.code}`);

    return NextResponse.json({
      success: true,
      message: 'Group deleted successfully (soft delete)',
      data: {
        id: deletedGroup._id,
        code: deletedGroup.code,
        name: deletedGroup.name,
        deletedAt: deletedGroup.deletedAt
      }
    });

  } catch (error) {
    console.error('❌ Error deleting group:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete group'
      },
      { status: 500 }
    );
  }
}