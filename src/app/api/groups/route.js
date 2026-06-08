// app/api/groups/route.js
// ✅ متوافق مع هيكل instructors الجديد: [{userId: ObjectId, countTime: Number}]
// ✅ محسّن بفلاتر متقدمة

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../models/Group";
import Student from "../../models/Student";
import Session from "../../models/Session";
import Course from "../../models/Course";
import { requireAdmin } from "@/utils/authMiddleware";
import {
  calculateTotalSessions,
  getSessionDistributionSummary,
} from "@/utils/sessionGenerator";

// ─── Helper: Check instructor schedule conflicts ──────────────────────────────
async function checkInstructorConflicts(
  instructors,
  schedule,
  excludeGroupId = null,
) {
  if (!instructors || instructors.length === 0 || !schedule) return [];

  const scheduleDays = schedule.daysOfWeek || [];
  const timeFrom = schedule.timeFrom;
  const timeTo = schedule.timeTo;
  const conflicts = [];

  for (const instructorId of instructors) {
    const userId = instructorId?.userId || instructorId;

    const query = {
      "instructors.userId": userId,
      isDeleted: false,
      status: { $in: ["draft", "active"] },
    };
    if (excludeGroupId) query._id = { $ne: excludeGroupId };

    const conflictingGroups = await Group.find(query)
      .populate("instructors.userId", "name")
      .lean();

    for (const existingGroup of conflictingGroups) {
      const es = existingGroup.schedule;
      if (!es) continue;

      const dayOverlap = scheduleDays.some((day) =>
        es.daysOfWeek?.includes(day),
      );
      if (!dayOverlap) continue;

      const newFrom = timeFrom.replace(":", "");
      const newTo = timeTo.replace(":", "");
      const existFrom = es.timeFrom?.replace(":", "") || "0000";
      const existTo = es.timeTo?.replace(":", "") || "2359";
      const hasTimeConflict = !(newTo <= existFrom || newFrom >= existTo);
      if (!hasTimeConflict) continue;

      const instructorEntry = existingGroup.instructors?.find(
        (i) => (i.userId?._id || i.userId)?.toString() === userId.toString(),
      );
      const instructorName = instructorEntry?.userId?.name || "المدرب";

      const overlapDays = scheduleDays.filter((day) =>
        es.daysOfWeek?.includes(day),
      );

      conflicts.push({
        instructorId: userId,
        instructorName,
        conflictGroupName: existingGroup.name,
        conflictGroupCode: existingGroup.code,
        conflictDays: overlapDays,
        conflictTime: `${es.timeFrom} - ${es.timeTo}`,
      });
    }
  }

  return conflicts;
}

// ─── GET: Fetch all groups with advanced filters ─────────────────────────────
export async function GET(req) {
  try {
    console.log("🔍 Fetching groups with advanced filters...");

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    
    // ✅ الفلاتر الأساسية
    const search = searchParams.get("search");
    const courseId = searchParams.get("courseId");
    const instructorId = searchParams.get("instructorId");
    
    // ✅ فلتر الحالة (multi-select)
    const statusParams = searchParams.getAll("status");
    
    // ✅ فلتر السعة
    const capacity = searchParams.get("capacity");
    
    // ✅ فلتر الأيام
    const daysParams = searchParams.getAll("days");
    
    // ✅ فلتر التواريخ
    const startDateFrom = searchParams.get("startDateFrom");
    const startDateTo = searchParams.get("startDateTo");
    const createdAtFrom = searchParams.get("createdAtFrom");
    const createdAtTo = searchParams.get("createdAtTo");
    
    // ✅ فلتر عدد الطلاب
    const studentsMin = searchParams.get("studentsMin");
    const studentsMax = searchParams.get("studentsMax");
    
    // ✅ فلتر السيشنات
    const sessionsGenerated = searchParams.get("sessionsGenerated");

    // ── Build query ─────────────────────────────────────────────────────────
    const query = { isDeleted: false };

    // Search (name or code)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    // Course filter
    if (courseId) {
      query.courseId = courseId;
    }

    // Instructor filter
    if (instructorId) {
      query["instructors.userId"] = instructorId;
    }

    // Status filter (multi-select)
    if (statusParams.length > 0) {
      query.status = { $in: statusParams };
    }

    // Capacity filter
    if (capacity === "full") {
      query.$expr = { $gte: ["$currentStudentsCount", "$maxStudents"] };
    } else if (capacity === "available") {
      query.$expr = { $lt: ["$currentStudentsCount", "$maxStudents"] };
    }

    // Days of week filter
    if (daysParams.length > 0) {
      query["schedule.daysOfWeek"] = { $in: daysParams };
    }

    // Start date range
    if (startDateFrom || startDateTo) {
      query["schedule.startDate"] = {};
      if (startDateFrom) {
        query["schedule.startDate"].$gte = new Date(startDateFrom);
      }
      if (startDateTo) {
        // Set to end of day
        const endDate = new Date(startDateTo);
        endDate.setHours(23, 59, 59, 999);
        query["schedule.startDate"].$lte = endDate;
      }
    }

    // Created at range
    if (createdAtFrom || createdAtTo) {
      query.createdAt = {};
      if (createdAtFrom) {
        query.createdAt.$gte = new Date(createdAtFrom);
      }
      if (createdAtTo) {
        const endDate = new Date(createdAtTo);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    // Students count range
    if (studentsMin || studentsMax) {
      query.currentStudentsCount = {};
      if (studentsMin) {
        query.currentStudentsCount.$gte = parseInt(studentsMin);
      }
      if (studentsMax) {
        query.currentStudentsCount.$lte = parseInt(studentsMax);
      }
    }

    // Sessions generated filter
    if (sessionsGenerated === "true") {
      query.sessionsGenerated = true;
    } else if (sessionsGenerated === "false") {
      query.sessionsGenerated = false;
    }

    console.log("🔍 Query:", JSON.stringify(query, null, 2));

    // ── Pagination ──────────────────────────────────────────────────────────
    const total = await Group.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    // ── Fetch groups ─────────────────────────────────────────────────────────
    const groups = await Group.find(query)
      .populate("courseId", "title level")
      .populate("instructors.userId", "name email")
      .populate("students", "personalInfo.fullName enrollmentNumber")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    console.log("✅ Groups fetched:", groups.length, "of", total);

    const formattedGroups = groups.map((group) => ({
      id: group._id,
      name: group.name,
      code: group.code,
      status: group.status,
      course: {
        id: group.courseId?._id,
        title: group.courseId?.title,
        level: group.courseId?.level,
      },
      instructors: (group.instructors || []).map((i) => ({
        _id: i.userId?._id || i.userId,
        id: i.userId?._id || i.userId,
        name: i.userId?.name || "",
        email: i.userId?.email || "",
        countTime: i.countTime || 0,
      })),
      studentsCount: group.currentStudentsCount,
      maxStudents: group.maxStudents,
      availableSeats: group.maxStudents - group.currentStudentsCount,
      isFull: group.currentStudentsCount >= group.maxStudents,
      schedule: group.schedule,
      automation: group.automation,
      moduleSelection: group.moduleSelection,
      sessionsGenerated: group.sessionsGenerated,
      totalSessions: group.totalSessionsCount,
      createdBy: group.createdBy,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }));

    // ── Stats (based on same query without pagination) ───────────────────────
    const statsQuery = { ...query };
    delete statsQuery.$or; // Remove search for stats to get accurate counts

    const stats = {
      total,
      active: await Group.countDocuments({ ...query, status: "active" }),
      draft: await Group.countDocuments({ ...query, status: "draft" }),
      completed: await Group.countDocuments({ ...query, status: "completed" }),
      cancelled: await Group.countDocuments({ ...query, status: "cancelled" }),
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
    console.error("❌ Error fetching groups:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch groups",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}

// ─── POST: Create new group ───────────────────────────────────────────────────
export async function POST(req) {
  try {
    console.log("🚀 Creating new group...");

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const adminUser = authCheck.user;
    await connectDB();

    const body = await req.json();
    console.log("📥 Received group data:", JSON.stringify(body, null, 2));

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
        {
          success: false,
          error: "Missing required fields: name, courseId, maxStudents, schedule",
        },
        { status: 400 },
      );
    }

    // ✅ Normalize instructors
    const normalizedInstructors = (instructors || []).map((i) => ({
      userId: i?.userId || i,
      countTime: i?.countTime || 0,
    }));

    const instructorUserIds = normalizedInstructors.map((i) => i.userId);

    // CHECK 1: Duplicate group name
    const existingGroupName = await Group.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
      isDeleted: false,
    });
    if (existingGroupName) {
      return NextResponse.json(
        {
          success: false,
          error: `يوجد مجموعة بنفس الاسم "${name.trim()}" بالفعل. الرجاء اختيار اسم مختلف.`,
        },
        { status: 409 },
      );
    }

    if (!schedule.daysOfWeek?.length || schedule.daysOfWeek.length > 3) {
      return NextResponse.json(
        { success: false, error: "Schedule must have between 1 and 3 days selected" },
        { status: 400 },
      );
    }

    const uniqueDays = [...new Set(schedule.daysOfWeek)];
    if (uniqueDays.length !== schedule.daysOfWeek.length) {
      return NextResponse.json(
        { success: false, error: "Schedule days must be unique (no duplicates)" },
        { status: 400 },
      );
    }

    const startDate = new Date(schedule.startDate);
    const startDayName = startDate.toLocaleDateString("en-US", { weekday: "long" });
    if (!schedule.daysOfWeek.includes(startDayName)) {
      return NextResponse.json(
        {
          success: false,
          error: `First selected day must be ${startDayName} (based on start date ${schedule.startDate})`,
        },
        { status: 400 },
      );
    }

    if (moduleSelection?.mode === "specific" && !moduleSelection.selectedModules?.length) {
      return NextResponse.json(
        { success: false, error: "When selecting specific modules, you must select at least one module" },
        { status: 400 },
      );
    }

    // CHECK 2: Instructor schedule conflicts
    if (instructorUserIds.length > 0) {
      const conflicts = await checkInstructorConflicts(instructorUserIds, schedule);
      if (conflicts.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "تعارض في مواعيد المدربين",
            conflictType: "instructor_schedule",
            conflicts,
            conflictMessage: conflicts
              .map(
                (c) =>
                  `المدرب "${c.instructorName}" موجود بالفعل في مجموعة "${c.conflictGroupName}" في نفس الموعد (${c.conflictDays.join("، ")} - ${c.conflictTime})`,
              )
              .join("\n"),
          },
          { status: 409 },
        );
      }
    }

    // ── Fetch course ─────────────────────────────────────────────────────────
    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 },
      );
    }

    // ── Calculate total sessions ─────────────────────────────────────────────
    let totalSessions;
    if (moduleSelection?.mode === "specific" && moduleSelection.selectedModules.length > 0) {
      totalSessions = moduleSelection.selectedModules.reduce(
        (sum, idx) => sum + (course.curriculum[idx]?.totalSessions || 3),
        0,
      );
    } else {
      totalSessions = course.curriculum.reduce(
        (sum, m) => sum + (m.totalSessions || 3),
        0,
      );
    }

    // ── Build course snapshot ────────────────────────────────────────────────
    const courseSnapshot = {
      title: course.title,
      level: course.level,
      curriculumModulesCount: course.curriculum.length,
      totalLessons: course.curriculum.reduce(
        (sum, m) => sum + (m.lessons?.length || 0),
        0,
      ),
      totalSessions,
      curriculum: course.curriculum.map((m) => ({
        title: m.title,
        order: m.order,
        lessons: m.lessons?.map((l) => ({
          title: l.title,
          order: l.order,
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
      instructors: normalizedInstructors,
      students: [],
      maxStudents: parseInt(maxStudents),
      currentStudentsCount: 0,
      schedule: {
        startDate: new Date(schedule.startDate),
        daysOfWeek: schedule.daysOfWeek,
        timeFrom: schedule.timeFrom,
        timeTo: schedule.timeTo,
        timezone: schedule.timezone || "Africa/Cairo",
      },
      pricing: {
        price: 0,
        paymentType: "full",
        installmentPlan: { numberOfInstallments: 0, amountPerInstallment: 0 },
      },
      automation: automation || {
        whatsappEnabled: true,
        welcomeMessage: true,
        reminderEnabled: true,
        reminderBeforeHours: 24,
        notifyGuardianOnAbsence: true,
        notifyOnSessionUpdate: true,
        completionMessage: true,
      },
      moduleSelection: moduleSelection || { mode: "all", selectedModules: [] },
      status: "draft",
      sessionsGenerated: false,
      totalSessionsCount: totalSessions,
      createdBy: adminUser.id,
      updatedAt: new Date(),
    };

    const group = await Group.create(groupData);

    const populatedGroup = await Group.findById(group._id)
      .populate("courseId", "title level")
      .populate("instructors.userId", "name email")
      .populate("createdBy", "name email")
      .lean();

    const responseData = {
      ...populatedGroup,
      instructors: (populatedGroup.instructors || []).map((i) => ({
        _id: i.userId?._id || i.userId,
        name: i.userId?.name || "",
        email: i.userId?.email || "",
        countTime: i.countTime || 0,
      })),
    };

    console.log("✅ Group created:", group.code);

    return NextResponse.json(
      {
        success: true,
        data: responseData,
        message: "Group created successfully",
        sessionDistribution: getSessionDistributionSummary(
          course.curriculum,
          moduleSelection,
        ),
        scheduleInfo: {
          daysPerWeek: schedule.daysOfWeek.length,
          selectedDays: schedule.daysOfWeek,
          estimatedWeeks: Math.ceil(totalSessions / schedule.daysOfWeek.length),
        },
        moduleSelection: group.moduleSelection,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("❌ Error creating group:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors || {})
        .map((e) => e.message)
        .join("; ");
      return NextResponse.json(
        { success: false, error: "Validation failed", details: messages },
        { status: 400 },
      );
    }

    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          error: "Group code already exists. Please try again.",
          details: "Duplicate group code",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create group",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
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

    const { name, instructors, maxStudents, schedule, automation, moduleSelection } = body;

    // ✅ Normalize instructors
    const normalizedInstructors = (instructors || []).map((i) => ({
      userId: i?.userId || i,
      countTime: i?.countTime || 0,
    }));
    const instructorUserIds = normalizedInstructors.map((i) => i.userId);

    // CHECK 1: Duplicate group name (exclude current group)
    if (name) {
      const duplicateGroup = await Group.findOne({
        name: { $regex: `^${name.trim()}$`, $options: "i" },
        isDeleted: false,
        _id: { $ne: id },
      });
      if (duplicateGroup) {
        return NextResponse.json(
          {
            success: false,
            error: `يوجد مجموعة بنفس الاسم "${name.trim()}" بالفعل. الرجاء اختيار اسم مختلف.`,
          },
          { status: 409 },
        );
      }
    }

    if (moduleSelection?.mode === "specific" && !moduleSelection.selectedModules?.length) {
      return NextResponse.json(
        { success: false, error: "When selecting specific modules, you must select at least one module" },
        { status: 400 },
      );
    }

    // CHECK 2: Instructor conflicts (exclude current group)
    if (instructorUserIds.length > 0 && schedule) {
      const conflicts = await checkInstructorConflicts(instructorUserIds, schedule, id);
      if (conflicts.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "تعارض في مواعيد المدربين",
            conflictType: "instructor_schedule",
            conflicts,
            conflictMessage: conflicts
              .map(
                (c) =>
                  `المدرب "${c.instructorName}" موجود بالفعل في مجموعة "${c.conflictGroupName}" في نفس الموعد (${c.conflictDays.join("، ")} - ${c.conflictTime})`,
              )
              .join("\n"),
          },
          { status: 409 },
        );
      }
    }

    const group = await Group.findById(id);
    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 },
      );
    }

    // ── Recalculate total sessions if module selection changed ───────────────
    let totalSessionsCount = group.totalSessionsCount;
    if (moduleSelection && group.courseSnapshot?.curriculum) {
      if (moduleSelection.mode === "specific" && moduleSelection.selectedModules.length > 0) {
        totalSessionsCount = moduleSelection.selectedModules.reduce(
          (sum, idx) =>
            sum + (group.courseSnapshot.curriculum[idx]?.totalSessions || 3),
          0,
        );
      } else {
        totalSessionsCount = group.courseSnapshot.curriculum.reduce(
          (sum, m) => sum + (m.totalSessions || 3),
          0,
        );
      }
    }

    // ✅ احتفظ بـ countTime الموجود للمدربين القدامى
    const mergedInstructors = normalizedInstructors.map((newInstructor) => {
      const existingEntry = group.instructors?.find(
        (e) => (e.userId?.toString() || e.userId) === (newInstructor.userId?.toString() || newInstructor.userId)
      );
      return {
        userId: newInstructor.userId,
        countTime: existingEntry?.countTime || 0,
      };
    });

    const updateData = {
      $set: {
        name,
        instructors: mergedInstructors,
        maxStudents: parseInt(maxStudents),
        schedule: {
          startDate: new Date(schedule.startDate),
          daysOfWeek: schedule.daysOfWeek,
          timeFrom: schedule.timeFrom,
          timeTo: schedule.timeTo,
          timezone: schedule.timezone || "Africa/Cairo",
        },
        automation,
        moduleSelection: moduleSelection || { mode: "all", selectedModules: [] },
        totalSessionsCount,
        updatedAt: new Date(),
      },
    };

    const updatedGroup = await Group.findByIdAndUpdate(id, updateData, { new: true })
      .populate("courseId", "title level")
      .populate("instructors.userId", "name email")
      .populate("createdBy", "name email")
      .lean();

    const responseData = {
      ...updatedGroup,
      instructors: (updatedGroup.instructors || []).map((i) => ({
        _id: i.userId?._id || i.userId,
        name: i.userId?.name || "",
        email: i.userId?.email || "",
        countTime: i.countTime || 0,
      })),
    };

    console.log("✅ Group updated:", updatedGroup.code);

    return NextResponse.json({
      success: true,
      data: responseData,
      message: "Group updated successfully",
    });
  } catch (error) {
    console.error("❌ Error updating group:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update group" },
      { status: 500 },
    );
  }
}