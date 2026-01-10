// app/api/groups/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Group from '../../models/Group';
import Course from '../../models/Course';
import { requireAdmin } from '@/utils/authMiddleware';
import { calculateTotalSessions, getSessionDistributionSummary } from '@/utils/sessionGenerator';

// GET: Fetch all groups with pagination and filters
export async function GET(req) {
  try {
    console.log('🔍 Fetching groups...');
    
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    // ✅ تأكد من الاتصال بقاعدة البيانات
    const dbConnection = await connectDB();
    console.log('✅ Database connected:', dbConnection.connection.readyState);

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const courseId = searchParams.get('courseId');
    const search = searchParams.get('search');

    const query = { isDeleted: false };

    if (status) query.status = status;
    if (courseId) query.courseId = courseId;
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    console.log('📊 Query:', query);

    // ✅ تحقق من وجود النموذج
    if (!Group || !Group.countDocuments) {
      console.error('❌ Group model not properly initialized');
      throw new Error('Group model not properly initialized');
    }

    const total = await Group.countDocuments(query);
    console.log('📈 Total groups:', total);

    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const groups = await Group.find(query)
      .populate('courseId', 'title level')
      .populate('instructors', 'name email')
      .populate('students', 'personalInfo.fullName enrollmentNumber')
      .populate('metadata.createdBy', 'name email')
      .sort({ 'metadata.createdAt': -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    console.log('✅ Groups fetched:', groups.length);

    const formattedGroups = groups.map(group => ({
      id: group._id,
      name: group.name,
      code: group.code,
      status: group.status,
      course: {
        id: group.courseId?._id,
        title: group.courseId?.title,
        level: group.courseId?.level
      },
      instructors: group.instructors,
      studentsCount: group.currentStudentsCount,
      maxStudents: group.maxStudents,
      availableSeats: group.maxStudents - group.currentStudentsCount,
      isFull: group.currentStudentsCount >= group.maxStudents,
      schedule: group.schedule,
      pricing: group.pricing,
      automation: group.automation,
      sessionsGenerated: group.sessionsGenerated,
      totalSessions: group.totalSessionsCount,
      metadata: group.metadata
    }));

    const stats = {
      total,
      active: await Group.countDocuments({ ...query, status: 'active' }),
      draft: await Group.countDocuments({ ...query, status: 'draft' }),
      completed: await Group.countDocuments({ ...query, status: 'completed' }),
      cancelled: await Group.countDocuments({ ...query, status: 'cancelled' })
    };

    return NextResponse.json({
      success: true,
      data: formattedGroups,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('❌ Error fetching groups:', error);
    console.error('❌ Error stack:', error.stack);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch groups',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// POST: Create new group
export async function POST(req) {
  try {
    console.log('🚀 Creating new group...');

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const adminUser = authCheck.user;

    await connectDB();

    const body = await req.json();
    console.log('📥 Received group data:', JSON.stringify(body, null, 2));

    const {
      name,
      courseId,
      instructors,
      maxStudents,
      schedule,
      pricing,
      automation
    } = body;

    // Validation
    if (!name || !courseId || !maxStudents || !schedule || !pricing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, courseId, maxStudents, schedule, pricing'
        },
        { status: 400 }
      );
    }

    // Validate course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json(
        {
          success: false,
          error: 'Course not found'
        },
        { status: 404 }
      );
    }

    console.log('📚 Course found:', course.title);
    console.log('📖 Curriculum modules:', course.curriculum?.length || 0);

    // Create course snapshot
    const totalSessions = calculateTotalSessions(course.curriculum);
    console.log('✅ Total sessions calculated:', totalSessions);

    const courseSnapshot = {
      title: course.title,
      level: course.level,
      curriculumModulesCount: course.curriculum.length,
      totalLessons: course.curriculum.reduce((sum, m) => sum + (m.lessons?.length || 0), 0),
      totalSessions,
      curriculum: course.curriculum.map(m => ({
        title: m.title,
        order: m.order,
        lessons: m.lessons?.map(l => ({
          title: l.title,
          order: l.order,
          sessionsCount: l.sessionsCount || 2
        })) || []
      }))
    };

    // Create group
    const groupData = {
      name,
      courseId,
      courseSnapshot,
      instructors: instructors || [],
      students: [],
      maxStudents,
      currentStudentsCount: 0,
      schedule,
      pricing,
      automation: automation || {},
      status: 'draft',
      sessionsGenerated: false,
      totalSessionsCount: 0,
      metadata: {
        createdBy: adminUser.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };

    const group = await Group.create(groupData);

    const populatedGroup = await Group.findById(group._id)
      .populate('courseId', 'title level')
      .populate('instructors', 'name email')
      .populate('metadata.createdBy', 'name email');

    console.log('✅ Group created:', group.code);

    return NextResponse.json(
      {
        success: true,
        data: populatedGroup,
        message: 'Group created successfully',
        sessionDistribution: getSessionDistributionSummary(course.curriculum)
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('❌ Error creating group:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack
    });

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
        error: error.message || 'Failed to create group'
      },
      { status: 500 }
    );
  }
}