// app/api/groups/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../models/Group";
import Course from "../../models/Course";
import { requireAdmin } from "@/utils/authMiddleware";
import { getSessionDistributionSummary } from "@/utils/sessionGenerator";
import { getSessionsLinkHealthForGroups } from "@/utils/checkMeetingLinks";
import {
  VALID_GROUP_TYPES,
  findDuplicateGroupName,
  checkInstructorConflicts,
  buildConflictResponseBody,
} from "@/utils/groupValidation";

// regex escape للبحث (search) بس — فحص الاسم المكرر بقى من غير regex
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req) {
  try {
    console.log("🔍 Fetching groups with advanced filters...");
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const search = searchParams.get("search");
    const courseId = searchParams.get("courseId");
    const instructorId = searchParams.get("instructorId");
    const statusParams = searchParams.getAll("status");
    const capacity = searchParams.get("capacity");
    const daysParams = searchParams.getAll("days");
    const startDateFrom = searchParams.get("startDateFrom");
    const startDateTo = searchParams.get("startDateTo");
    const createdAtFrom = searchParams.get("createdAtFrom");
    const createdAtTo = searchParams.get("createdAtTo");
    const studentsMin = searchParams.get("studentsMin");
    const studentsMax = searchParams.get("studentsMax");
    const sessionsGenerated = searchParams.get("sessionsGenerated");
    const tagsParam = searchParams.get("tags");
    const makeupFilter = searchParams.get("isMakeupGroup");
    const groupTypeFilter = searchParams.get("groupType");

    const query = { isDeleted: false };

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { code: { $regex: safeSearch, $options: "i" } },
      ];
    }
    if (courseId) query.courseId = courseId;
    if (instructorId) query["instructors.userId"] = instructorId;
    if (statusParams.length > 0) query.status = { $in: statusParams };
    if (capacity === "full") {
      query.$expr = { $gte: ["$currentStudentsCount", "$maxStudents"] };
    } else if (capacity === "available") {
      query.$expr = { $lt: ["$currentStudentsCount", "$maxStudents"] };
    }
    if (daysParams.length > 0) {
      query["schedule.daysOfWeek"] = { $in: daysParams };
    }
    if (startDateFrom || startDateTo) {
      query["schedule.startDate"] = {};
      if (startDateFrom)
        query["schedule.startDate"].$gte = new Date(startDateFrom);
      if (startDateTo) {
        const endDate = new Date(startDateTo);
        endDate.setHours(23, 59, 59, 999);
        query["schedule.startDate"].$lte = endDate;
      }
    }
    if (createdAtFrom || createdAtTo) {
      query.createdAt = {};
      if (createdAtFrom) query.createdAt.$gte = new Date(createdAtFrom);
      if (createdAtTo) {
        const endDate = new Date(createdAtTo);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }
    if (studentsMin || studentsMax) {
      query.currentStudentsCount = {};
      if (studentsMin) query.currentStudentsCount.$gte = parseInt(studentsMin);
      if (studentsMax) query.currentStudentsCount.$lte = parseInt(studentsMax);
    }
    if (sessionsGenerated === "true") query.sessionsGenerated = true;
    else if (sessionsGenerated === "false") query.sessionsGenerated = false;
    if (tagsParam) {
      const tagIds = tagsParam.split(",").filter(Boolean);
      if (tagIds.length) {
        query.tags = { $in: tagIds };
      }
    }
    if (makeupFilter === "true") {
      query.isMakeupGroup = true;
    } else if (makeupFilter === "false") {
      query.isMakeupGroup = { $ne: true };
    }
    if (groupTypeFilter && VALID_GROUP_TYPES.includes(groupTypeFilter)) {
      query.groupType = groupTypeFilter;
    }

    console.log("🔍 Query:", JSON.stringify(query, null, 2));

    const total = await Group.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const groups = await Group.find(query)
      .populate("courseId", "title level")
      .populate("instructors.userId", "name email")
      .populate("students", "personalInfo.fullName enrollmentNumber")
      .populate("createdBy", "name email")
      .populate("tags")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    console.log("✅ Groups fetched:", groups.length, "of", total);

    const groupIds = groups.map((g) => g._id);
    const linkHealthMap = await getSessionsLinkHealthForGroups(groupIds);

    const formattedGroups = groups.map((group) => {
      const health = linkHealthMap.get(group._id.toString()) || {
        missingCount: 0,
        orphanedCount: 0,
        hasIssue: false,
      };

      return {
        id: group._id,
        name: group.name,
        code: group.code,
        status: group.status,

        isMakeupGroup: !!group.isMakeupGroup,
        makeupInfo: group.makeupInfo
          ? {
              studentId: group.makeupInfo.studentId || null,
              originalSessionId: group.makeupInfo.originalSessionId || null,
              originalGroupId: group.makeupInfo.originalGroupId || null,
              originalSessionTitle: group.makeupInfo.originalSessionTitle || "",
              originalSessionDate: group.makeupInfo.originalSessionDate || null,
              createdAt: group.makeupInfo.createdAt || null,
            }
          : null,

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
        deliveryMode: group.deliveryMode || "online",
        groupType: VALID_GROUP_TYPES.includes(group.groupType)
          ? group.groupType
          : null,
        location: group.location || "",
        locationDetails: group.locationDetails || null,
        automation: group.automation,
        moduleSelection: group.moduleSelection,
        sessionsGenerated: group.sessionsGenerated,
        totalSessions: group.totalSessionsCount,
        createdBy: group.createdBy,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        tags: group.tags || [],
        linkHealth: {
          hasIssue: health.hasIssue,
          missingCount: health.missingCount,
          orphanedCount: health.orphanedCount,
        },

        isOnHold: !!group.hold?.isHeld,
        hold: group.hold
          ? {
              holdType: group.hold.holdType,
              holdDays: group.hold.holdDays,
              holdSessionsCount: group.hold.holdSessionsCount,
              holdSessionsConsumed: group.hold.holdSessionsConsumed,
              holdUntilSessionId: group.hold.holdUntilSessionId || null,
              holdStartDate: group.hold.holdStartDate,
              holdEndDate: group.hold.holdEndDate,
              holdReason: group.hold.holdReason,
            }
          : null,
      };
    });

    const stats = {
      total,
      active: await Group.countDocuments({ ...query, status: "active" }),
      draft: await Group.countDocuments({ ...query, status: "draft" }),
      completed: await Group.countDocuments({ ...query, status: "completed" }),
      cancelled: await Group.countDocuments({ ...query, status: "cancelled" }),
      onHold: await Group.countDocuments({
        ...query,
        status: "active",
        "hold.isHeld": true,
      }),
      makeup: await Group.countDocuments({
        ...query,
        isMakeupGroup: true,
      }),
      kids: await Group.countDocuments({ ...query, groupType: "kids" }),
      adults: await Group.countDocuments({ ...query, groupType: "adults" }),
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
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    console.log("🚀 Creating new group...");
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const adminUser = authCheck.user;
    await connectDB();

    const body = await req.json();
    if (process.env.NODE_ENV === "development") {
      console.log("📥 Received group data:", JSON.stringify(body, null, 2));
    }

    const {
      name,
      courseId,
      instructors,
      maxStudents,
      schedule,
      automation,
      moduleSelection,
      tags,
      deliveryMode,
      location,
      locationDetails,
      groupType,
    } = body;

    if (!name || !String(name).trim() || !courseId || !maxStudents || !schedule) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: name, courseId, maxStudents, schedule",
        },
        { status: 400 },
      );
    }

    if (!VALID_GROUP_TYPES.includes(groupType)) {
      return NextResponse.json(
        {
          success: false,
          error: "لازم تحدد نوع الجروب (أطفال أو بالغين)",
        },
        { status: 400 },
      );
    }

    const cleanName = String(name).trim();

    // ✅ المدرس إجباري — ممنوع إنشاء جروب من غير مدرس
    const normalizedInstructors = (instructors || [])
      .map((i) => ({
        userId: i?.userId || i,
        countTime: i?.countTime || 0,
      }))
      .filter((i) => !!i.userId);

    const instructorUserIds = normalizedInstructors.map((i) => i.userId);

    if (instructorUserIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "لازم تختار مدرس واحد على الأقل للجروب",
        },
        { status: 400 },
      );
    }

    // ✅ فحص الاسم المكرر (من غير regex — بيدعم أي رموز في الاسم)
    const existingGroupName = await findDuplicateGroupName(cleanName);
    if (existingGroupName) {
      return NextResponse.json(
        {
          success: false,
          error: `يوجد مجموعة بنفس الاسم "${cleanName}" بالفعل. الرجاء اختيار اسم مختلف.`,
        },
        { status: 409 },
      );
    }

    if (!schedule.daysOfWeek?.length || schedule.daysOfWeek.length > 3) {
      return NextResponse.json(
        {
          success: false,
          error: "Schedule must have between 1 and 3 days selected",
        },
        { status: 400 },
      );
    }
    const uniqueDays = [...new Set(schedule.daysOfWeek)];
    if (uniqueDays.length !== schedule.daysOfWeek.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Schedule days must be unique (no duplicates)",
        },
        { status: 400 },
      );
    }
    const startDate = new Date(schedule.startDate);
    const startDayName = startDate.toLocaleDateString("en-US", {
      weekday: "long",
    });
    if (!schedule.daysOfWeek.includes(startDayName)) {
      return NextResponse.json(
        {
          success: false,
          error: `First selected day must be ${startDayName} (based on start date ${schedule.startDate})`,
        },
        { status: 400 },
      );
    }
    if (
      moduleSelection?.mode === "specific" &&
      !moduleSelection.selectedModules?.length
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "When selecting specific modules, you must select at least one module",
        },
        { status: 400 },
      );
    }

    const normalizedDeliveryMode = ["online", "offline"].includes(deliveryMode)
      ? deliveryMode
      : "online";

    const hasLocationInfo =
      location?.trim() ||
      locationDetails?.placeName?.trim() ||
      (locationDetails?.lat && locationDetails?.lng);

    if (normalizedDeliveryMode === "offline" && !hasLocationInfo) {
      return NextResponse.json(
        {
          success: false,
          error: "لازم تحدد مكان الجروب على الماب في حالة الـ Offline",
        },
        { status: 400 },
      );
    }

    // ✅ تعارض المدرسين: لو أي مدرس محطوط في جروب تاني في نفس اليوم والوقت → رفض
    const conflicts = await checkInstructorConflicts(
      instructorUserIds,
      schedule,
    );
    if (conflicts.length > 0) {
      return NextResponse.json(buildConflictResponseBody(conflicts), {
        status: 409,
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 },
      );
    }

    let totalSessions;
    if (
      moduleSelection?.mode === "specific" &&
      moduleSelection.selectedModules.length > 0
    ) {
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
        lessons:
          m.lessons?.map((l) => ({
            title: l.title,
            order: l.order,
            sessionsCount: l.sessionsCount || 2,
          })) || [],
      })),
    };

    const groupCode = `GRP-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 4)
      .toUpperCase()}`;

    const groupData = {
      name: cleanName,
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
      deliveryMode: normalizedDeliveryMode,
      groupType,
      location:
        normalizedDeliveryMode === "offline" ? (location || "").trim() : "",
      locationDetails:
        normalizedDeliveryMode === "offline"
          ? {
              lat: locationDetails?.lat ?? null,
              lng: locationDetails?.lng ?? null,
              placeName: locationDetails?.placeName || "",
              country: locationDetails?.country || "",
              address: locationDetails?.address || "",
              extraDetails: locationDetails?.extraDetails || "",
            }
          : {
              lat: null,
              lng: null,
              placeName: "",
              country: "",
              address: "",
              extraDetails: "",
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
      tags: tags || [],
      isMakeupGroup: false,
    };

    const group = await Group.create(groupData);

    const populatedGroup = await Group.findById(group._id)
      .populate("courseId", "title level")
      .populate("instructors.userId", "name email")
      .populate("createdBy", "name email")
      .populate("tags")
      .lean();

    const responseData = {
      ...populatedGroup,
      isMakeupGroup: false,
      groupType: populatedGroup.groupType || null,
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
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}