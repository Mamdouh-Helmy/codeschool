// app/api/groups/route.js - UPDATED WITH FLEXIBLE DAY VALIDATION
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Group from '../../models/Group';
import Student from '../../models/Student';
import Session from '../../models/Session';
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
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
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
      createdBy: group.createdBy,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt
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

// POST: Create new group - UPDATED WITH FLEXIBLE DAY VALIDATION
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

    // ✅ UPDATED: Validate 1-3 days (instead of exactly 3)
    if (!schedule.daysOfWeek || schedule.daysOfWeek.length === 0 || schedule.daysOfWeek.length > 3) {
      return NextResponse.json(
        {
          success: false,
          error: 'Schedule must have between 1 and 3 days selected'
        },
        { status: 400 }
      );
    }

    // Validate unique days
    const uniqueDays = [...new Set(schedule.daysOfWeek)];
    if (uniqueDays.length !== schedule.daysOfWeek.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'Schedule days must be unique (no duplicates)'
        },
        { status: 400 }
      );
    }

    // ✅ UPDATED: Validate first day matches start date
    const startDate = new Date(schedule.startDate);
    const startDayName = startDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    if (!schedule.daysOfWeek.includes(startDayName)) {
      return NextResponse.json(
        {
          success: false,
          error: `First selected day must be ${startDayName} (based on start date ${schedule.startDate})`
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

    // Generate group code
    const groupCode = `GRP-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 4)
      .toUpperCase()}`;

    // Create group
    const groupData = {
      name,
      code: groupCode,
      courseId,
      courseSnapshot,
      instructors: instructors || [],
      students: [],
      maxStudents: parseInt(maxStudents),
      currentStudentsCount: 0,
      schedule: {
        startDate: new Date(schedule.startDate),
        daysOfWeek: schedule.daysOfWeek, // ✅ Now 1-3 days allowed
        timeFrom: schedule.timeFrom,
        timeTo: schedule.timeTo,
        timezone: schedule.timezone || 'Africa/Cairo'
      },
      pricing: {
        price: parseFloat(pricing.price),
        paymentType: pricing.paymentType || 'full',
        installmentPlan: pricing.installmentPlan || {
          numberOfInstallments: 0,
          amountPerInstallment: 0
        }
      },
      automation: automation || {
        whatsappEnabled: true,
        welcomeMessage: true,
        reminderEnabled: true,
        reminderBeforeHours: 24,
        notifyGuardianOnAbsence: true,
        notifyOnSessionUpdate: true,
        completionMessage: true
      },
      status: 'draft',
      sessionsGenerated: false,
      totalSessionsCount: totalSessions,
      createdBy: adminUser.id,
      updatedAt: new Date()
    };

    console.log('📦 Group data to create:', JSON.stringify(groupData, null, 2));

    const group = await Group.create(groupData);

    const populatedGroup = await Group.findById(group._id)
      .populate('courseId', 'title level')
      .populate('instructors', 'name email')
      .populate('createdBy', 'name email')
      .lean();

    console.log('✅ Group created:', group.code);
    console.log(`📅 Schedule: ${schedule.daysOfWeek.length} day(s) per week - ${schedule.daysOfWeek.join(', ')}`);

    return NextResponse.json(
      {
        success: true,
        data: populatedGroup,
        message: 'Group created successfully',
        sessionDistribution: getSessionDistributionSummary(course.curriculum),
        scheduleInfo: {
          daysPerWeek: schedule.daysOfWeek.length,
          selectedDays: schedule.daysOfWeek,
          estimatedWeeks: Math.ceil(totalSessions / schedule.daysOfWeek.length)
        }
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

    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Group code already exists. Please try again.',
          details: 'Duplicate group code'
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create group',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}