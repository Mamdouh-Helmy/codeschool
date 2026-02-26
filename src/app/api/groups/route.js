// app/api/groups/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Group from '../../models/Group';
import Student from '../../models/Student';
import Session from '../../models/Session';
import Course from '../../models/Course';
import { requireAdmin } from '@/utils/authMiddleware';
import { calculateTotalSessions, getSessionDistributionSummary } from '@/utils/sessionGenerator';

// ─── GET: Fetch all groups ────────────────────────────────────────────────────
export async function GET(req) {
  try {
    console.log('🔍 Fetching groups...');

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const dbConnection = await connectDB();
    console.log('✅ Database connected:', dbConnection.connection.readyState);

    const { searchParams } = new URL(req.url);
    const page     = parseInt(searchParams.get('page')   || '1');
    const limit    = parseInt(searchParams.get('limit')  || '10');
    const status   = searchParams.get('status');
    const courseId = searchParams.get('courseId');
    const search   = searchParams.get('search');

    const query = { isDeleted: false };
    if (status)   query.status   = status;
    if (courseId) query.courseId = courseId;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }

    if (!Group?.countDocuments) {
      throw new Error('Group model not properly initialized');
    }

    const total      = await Group.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    const skip       = (page - 1) * limit;

    const groups = await Group.find(query)
      .populate('courseId',    'title level')
      .populate('instructors', 'name email')
      .populate('students',    'personalInfo.fullName enrollmentNumber')
      .populate('createdBy',   'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    console.log('✅ Groups fetched:', groups.length);

    const formattedGroups = groups.map(group => ({
      id:             group._id,
      name:           group.name,
      code:           group.code,
      status:         group.status,
      course: {
        id:    group.courseId?._id,
        title: group.courseId?.title,
        level: group.courseId?.level,
      },
      instructors:       group.instructors,
      studentsCount:     group.currentStudentsCount,
      maxStudents:       group.maxStudents,
      availableSeats:    group.maxStudents - group.currentStudentsCount,
      isFull:            group.currentStudentsCount >= group.maxStudents,
      schedule:          group.schedule,
      automation:        group.automation,
      moduleSelection:   group.moduleSelection,
      sessionsGenerated: group.sessionsGenerated,
      totalSessions:     group.totalSessionsCount,
      createdBy:         group.createdBy,
      createdAt:         group.createdAt,
      updatedAt:         group.updatedAt,
    }));

    const stats = {
      total,
      active:    await Group.countDocuments({ ...query, status: 'active'    }),
      draft:     await Group.countDocuments({ ...query, status: 'draft'     }),
      completed: await Group.countDocuments({ ...query, status: 'completed' }),
      cancelled: await Group.countDocuments({ ...query, status: 'cancelled' }),
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
        hasPrev: page > 1,
      },
    });

  } catch (error) {
    console.error('❌ Error fetching groups:', error);
    return NextResponse.json(
      {
        success: false,
        error:   error.message || 'Failed to fetch groups',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// ─── POST: Create new group ───────────────────────────────────────────────────
export async function POST(req) {
  try {
    console.log('🚀 Creating new group...');

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

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
      automation,
      moduleSelection,
    } = body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!name || !courseId || !maxStudents || !schedule) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, courseId, maxStudents, schedule' },
        { status: 400 }
      );
    }

    if (!schedule.daysOfWeek?.length || schedule.daysOfWeek.length > 3) {
      return NextResponse.json(
        { success: false, error: 'Schedule must have between 1 and 3 days selected' },
        { status: 400 }
      );
    }

    const uniqueDays = [...new Set(schedule.daysOfWeek)];
    if (uniqueDays.length !== schedule.daysOfWeek.length) {
      return NextResponse.json(
        { success: false, error: 'Schedule days must be unique (no duplicates)' },
        { status: 400 }
      );
    }

    const startDate    = new Date(schedule.startDate);
    const startDayName = startDate.toLocaleDateString('en-US', { weekday: 'long' });
    if (!schedule.daysOfWeek.includes(startDayName)) {
      return NextResponse.json(
        { success: false, error: `First selected day must be ${startDayName} (based on start date ${schedule.startDate})` },
        { status: 400 }
      );
    }

    if (
      moduleSelection?.mode === 'specific' &&
      (!moduleSelection.selectedModules?.length)
    ) {
      return NextResponse.json(
        { success: false, error: 'When selecting specific modules, you must select at least one module' },
        { status: 400 }
      );
    }

    // ── Fetch course ─────────────────────────────────────────────────────────
    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    console.log('📚 Course found:', course.title);
    console.log('📖 Curriculum modules:', course.curriculum?.length || 0);

    // ── Calculate total sessions ─────────────────────────────────────────────
    let totalSessions;
    if (moduleSelection?.mode === 'specific' && moduleSelection.selectedModules.length > 0) {
      totalSessions = moduleSelection.selectedModules.reduce(
        (sum, idx) => sum + (course.curriculum[idx]?.totalSessions || 3),
        0
      );
      console.log(`📊 Selected modules only: ${moduleSelection.selectedModules.length} modules, ${totalSessions} total sessions`);
    } else {
      totalSessions = course.curriculum.reduce(
        (sum, m) => sum + (m.totalSessions || 3),
        0
      );
      console.log(`📊 All modules: ${course.curriculum.length} modules, ${totalSessions} total sessions`);
    }

    // ── Build course snapshot ────────────────────────────────────────────────
    const courseSnapshot = {
      title:                 course.title,
      level:                 course.level,
      curriculumModulesCount: course.curriculum.length,
      totalLessons:          course.curriculum.reduce((sum, m) => sum + (m.lessons?.length || 0), 0),
      totalSessions,
      curriculum: course.curriculum.map(m => ({
        title:  m.title,
        order:  m.order,
        lessons: m.lessons?.map(l => ({
          title:         l.title,
          order:         l.order,
          sessionsCount: l.sessionsCount || 2,
        })) || [],
      })),
    };

    // ── Build group document ─────────────────────────────────────────────────
    const groupCode = `GRP-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 4)
      .toUpperCase()}`;

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
        startDate:  new Date(schedule.startDate),
        daysOfWeek: schedule.daysOfWeek,
        timeFrom:   schedule.timeFrom,
        timeTo:     schedule.timeTo,
        timezone:   schedule.timezone || 'Africa/Cairo',
      },
      // pricing kept with defaults — no longer required from the form
      pricing: {
        price:          0,
        paymentType:    'full',
        installmentPlan: {
          numberOfInstallments:  0,
          amountPerInstallment:  0,
        },
      },
      automation: automation || {
        whatsappEnabled:          true,
        welcomeMessage:           true,
        reminderEnabled:          true,
        reminderBeforeHours:      24,
        notifyGuardianOnAbsence:  true,
        notifyOnSessionUpdate:    true,
        completionMessage:        true,
      },
      moduleSelection: moduleSelection || { mode: 'all', selectedModules: [] },
      status:              'draft',
      sessionsGenerated:   false,
      totalSessionsCount:  totalSessions,
      createdBy:           adminUser.id,
      updatedAt:           new Date(),
    };

    console.log('📦 Group data to create:', JSON.stringify(groupData, null, 2));

    const group = await Group.create(groupData);

    const populatedGroup = await Group.findById(group._id)
      .populate('courseId',    'title level')
      .populate('instructors', 'name email')
      .populate('createdBy',   'name email')
      .lean();

    console.log('✅ Group created:', group.code);
    console.log(`📅 Schedule: ${schedule.daysOfWeek.length} day(s)/week — ${schedule.daysOfWeek.join(', ')}`);
    console.log(
      `📋 Module selection: ${group.moduleSelection.mode}`,
      group.moduleSelection.mode === 'specific'
        ? `— Modules: ${group.moduleSelection.selectedModules.map(i => i + 1).join(', ')}`
        : ''
    );

    return NextResponse.json(
      {
        success: true,
        data:    populatedGroup,
        message: 'Group created successfully',
        sessionDistribution: getSessionDistributionSummary(course.curriculum, moduleSelection),
        scheduleInfo: {
          daysPerWeek:     schedule.daysOfWeek.length,
          selectedDays:    schedule.daysOfWeek,
          estimatedWeeks:  Math.ceil(totalSessions / schedule.daysOfWeek.length),
        },
        moduleSelection: group.moduleSelection,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('❌ Error creating group:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors || {})
        .map(e => e.message)
        .join('; ');
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: messages },
        { status: 400 }
      );
    }

    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'Group code already exists. Please try again.', details: 'Duplicate group code' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:   error.message || 'Failed to create group',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// ─── PUT: Update group ────────────────────────────────────────────────────────
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    console.log(`✏️ Updating group: ${id}`);

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const body = await req.json();
    console.log('📥 Received update data:', JSON.stringify(body, null, 2));

    const {
      name,
      instructors,
      maxStudents,
      schedule,
      automation,
      moduleSelection,
    } = body;

    // ── Validate module selection ────────────────────────────────────────────
    if (
      moduleSelection?.mode === 'specific' &&
      (!moduleSelection.selectedModules?.length)
    ) {
      return NextResponse.json(
        { success: false, error: 'When selecting specific modules, you must select at least one module' },
        { status: 400 }
      );
    }

    const group = await Group.findById(id);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    // ── Recalculate total sessions if module selection changed ───────────────
    let totalSessionsCount = group.totalSessionsCount;
    if (moduleSelection && group.courseSnapshot?.curriculum) {
      if (moduleSelection.mode === 'specific' && moduleSelection.selectedModules.length > 0) {
        totalSessionsCount = moduleSelection.selectedModules.reduce(
          (sum, idx) => sum + (group.courseSnapshot.curriculum[idx]?.totalSessions || 3),
          0
        );
      } else {
        totalSessionsCount = group.courseSnapshot.curriculum.reduce(
          (sum, m) => sum + (m.totalSessions || 3),
          0
        );
      }
    }

    const updateData = {
      $set: {
        name,
        instructors:  instructors || [],
        maxStudents:  parseInt(maxStudents),
        schedule: {
          startDate:  new Date(schedule.startDate),
          daysOfWeek: schedule.daysOfWeek,
          timeFrom:   schedule.timeFrom,
          timeTo:     schedule.timeTo,
          timezone:   schedule.timezone || 'Africa/Cairo',
        },
        // pricing intentionally not updated — no longer part of the form
        automation,
        moduleSelection: moduleSelection || { mode: 'all', selectedModules: [] },
        totalSessionsCount,
        updatedAt: new Date(),
      },
    };

    const updatedGroup = await Group.findByIdAndUpdate(id, updateData, { new: true })
      .populate('courseId',    'title level')
      .populate('instructors', 'name email')
      .populate('createdBy',   'name email');

    console.log('✅ Group updated:', updatedGroup.code);
    console.log(
      `📋 Module selection: ${updatedGroup.moduleSelection.mode}`,
      updatedGroup.moduleSelection.mode === 'specific'
        ? `— Modules: ${updatedGroup.moduleSelection.selectedModules.map(i => i + 1).join(', ')}`
        : ''
    );

    return NextResponse.json({
      success: true,
      data:    updatedGroup,
      message: 'Group updated successfully',
    });

  } catch (error) {
    console.error('❌ Error updating group:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update group' },
      { status: 500 }
    );
  }
}