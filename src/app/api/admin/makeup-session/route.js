// app/api/admin/makeup-session/route.js
// ═══════════════════════════════════════════════════════════════════════════
// ✅ ADMIN — إنشاء حصة تعويضية (Make-up Session)
// ═══════════════════════════════════════════════════════════════════════════
//
// GET                       → جيب قائمة الطلاب (أول 50 طالب)
// GET  ?search=xxx          → ابحث عن طالب
// GET  ?studentId=xxx       → جيب جروبات الطالب + المدرسين بتوعهم
// GET  ?groupId=xxx         → جيب سيشنز الجروب ده بحالاتها
// GET  ?action=available-links  → جيب اللينكات المتاحة للجدول الجديد
//                                  (days, timeFrom, timeTo)
// POST                      → أنشئ جروب تعويضي وفعّله فورًا
//
// الجروب التعويضي بيتعمل ويتفعّل في نفس الـ request (مفيش خطوة Activate تانية):
//   1. إنشاء الجروب
//   2. توليد السيشن + حجز اللينك        (onMakeupGroupActivated)
//   3. إرسال 3 رسائل (طالب / ولي أمر / مدرس) من قوالب الداتا بيس بس
//
// ✅ دعم Online / Offline:
//   - Online: الأدمن يختار لينكات اجتماع للجدول الجديد
//     (بيتم فحصها ضد reservations الموجودة مسبقًا)
//   - Offline: مفيش لينكات — بنعتمد على locationDetails

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../models/Group";
import Student from "../../../models/Student";
import Session from "../../../models/Session";
import Course from "../../../models/Course";
import MeetingLink from "../../../models/MeetingLink";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";
import { findScheduleConflict } from "@/utils/checkMeetingLinks";
// ✅ اتغير الـ import — بقى من makeupAutomation بدل groupAutomation
import { onMakeupGroupActivated } from "../../../services/makeupAutomation";

// ─── Helper: التحقق من تعارض المدرس ────────────────────────────────────────
async function checkInstructorConflicts(
  instructorIds,
  schedule,
  excludeGroupId = null,
) {
  if (!instructorIds?.length || !schedule) return [];

  const scheduleDays = schedule.daysOfWeek || [];
  const timeFrom = schedule.timeFrom;
  const timeTo = schedule.timeTo;
  const conflicts = [];

  for (const instructorId of instructorIds) {
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

// ═══════════════════════════════════════════════════════════════════════════
// GET — جلب بيانات للـForm
// ═══════════════════════════════════════════════════════════════════════════
export async function GET(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const groupId = searchParams.get("groupId");
    const searchQuery = searchParams.get("search");
    const action = searchParams.get("action");

    // ═══════════════════════════════════════════════════════════════════
    // 0. ✅ action=available-links
    //    → جيب اللينكات المتاحة للجدول الجديد (مع فحص التعارض)
    //    Query params: days (comma-separated), timeFrom, timeTo
    // ═══════════════════════════════════════════════════════════════════
    if (action === "available-links") {
      const daysParam = searchParams.get("days");
      const timeFrom = searchParams.get("timeFrom");
      const timeTo = searchParams.get("timeTo");

      if (!daysParam || !timeFrom || !timeTo) {
        return NextResponse.json(
          {
            success: false,
            error: "Missing required params: days, timeFrom, timeTo",
          },
          { status: 400 },
        );
      }

      const daysOfWeek = daysParam.split(",").map((d) => d.trim()).filter(Boolean);

      const newSchedule = { daysOfWeek, timeFrom, timeTo };

      // جيب كل اللينكات الفعّالة (مش محذوفة)
      const allLinks = await MeetingLink.find({
        isDeleted: false,
        status: { $in: ["available", "reserved", "in_use"] },
      })
        .sort({ "stats.totalUses": 1 })
        .lean();

      const availableLinks = [];
      const reservedLinks = [];

      for (const link of allLinks) {
        // ✅ استخدم الدالة الموحدة في checkMeetingLinks
        const conflict = findScheduleConflict(link, newSchedule, null);

        if (conflict) {
          reservedLinks.push({
            _id: link._id,
            id: link._id,
            name: link.name,
            platform: link.platform,
            link: link.link,
            reservedDays: conflict.conflictingDays || [],
            reservedTime: conflict.conflictingTime || "",
            conflictingGroupId: conflict.conflictingGroupId,
          });
        } else {
          availableLinks.push({
            _id: link._id,
            id: link._id,
            name: link.name,
            platform: link.platform,
            link: link.link,
          });
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          totalLinks: allLinks.length,
          availableLinksCount: availableLinks.length,
          reservedLinksCount: reservedLinks.length,
          hasNoLinks: allLinks.length === 0,
          hasAvailableLinks: availableLinks.length > 0,
          availableLinks,
          reservedLinks,
        },
      });
    }

    // ─── 1. قايمة الطلاب (بحث + قايمة افتراضية) ───
    if (!studentId && !groupId) {
      const q = (searchQuery || "").trim();

      const filter = {
        isDeleted: false,
      };

      if (q.length >= 2) {
        filter.$or = [
          { "personalInfo.fullName": { $regex: q, $options: "i" } },
          { enrollmentNumber: { $regex: q, $options: "i" } },
          { "personalInfo.phone": { $regex: q, $options: "i" } },
          { "personalInfo.whatsappNumber": { $regex: q, $options: "i" } },
        ];
      }

      const limit = q.length >= 2 ? 30 : 50;
      const sortBy = q.length >= 2
        ? { "personalInfo.fullName": 1 }
        : { createdAt: -1 };

      const students = await Student.find(filter)
        .select(
          "_id enrollmentNumber personalInfo.fullName personalInfo.phone personalInfo.whatsappNumber personalInfo.gender personalInfo.nickname createdAt",
        )
        .sort(sortBy)
        .limit(limit)
        .lean();

      return NextResponse.json({
        success: true,
        data: students.map((s) => ({
          _id: s._id,
          name: s.personalInfo?.fullName || "",
          enrollmentNumber: s.enrollmentNumber || "",
          phone: s.personalInfo?.phone || "",
          whatsappNumber: s.personalInfo?.whatsappNumber || "",
          gender: s.personalInfo?.gender || "male",
          nickname: s.personalInfo?.nickname || null,
        })),
        meta: {
          count: students.length,
          mode: q.length >= 2 ? "search" : "list",
          query: q,
        },
      });
    }

    // ─── 2. جيب جروبات الطالب + المدرسين ───
    if (studentId) {
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return NextResponse.json(
          { success: false, error: "Invalid studentId" },
          { status: 400 },
        );
      }

      const groups = await Group.find({
        students: studentId,
        isDeleted: false,
        status: { $in: ["active", "completed"] },
      })
        .populate({
          path: "courseId",
          select: "title level curriculum",
        })
        .populate({
          path: "instructors.userId",
          select: "name email gender profile",
        })
        .select(
          "_id name code courseId instructors deliveryMode location locationDetails schedule totalSessionsCount status",
        )
        .lean();

      return NextResponse.json({
        success: true,
        data: groups.map((g) => ({
          _id: g._id,
          name: g.name,
          code: g.code,
          status: g.status,
          deliveryMode: g.deliveryMode || "online",
          location: g.location || "",
          locationDetails: g.locationDetails || null,
          schedule: g.schedule,
          totalSessionsCount: g.totalSessionsCount,
          course: g.courseId
            ? {
                _id: g.courseId._id,
                title: g.courseId.title,
                level: g.courseId.level,
              }
            : null,
          instructors: (g.instructors || []).map((i) => ({
            _id: i.userId?._id || i.userId,
            name: i.userId?.name || "",
            email: i.userId?.email || "",
            gender: i.userId?.gender || "",
          })),
        })),
      });
    }

    // ─── 3. جيب سيشنز الجروب + حالة الطالب في كل سيشن ───
    if (groupId) {
      if (!mongoose.Types.ObjectId.isValid(groupId)) {
        return NextResponse.json(
          { success: false, error: "Invalid groupId" },
          { status: 400 },
        );
      }

      const group = await Group.findById(groupId)
        .select("students")
        .lean();

      const sessions = await Session.find({
        groupId,
        isDeleted: false,
      })
        .select(
          "_id title moduleIndex sessionNumber lessonIndexes scheduledDate startTime endTime status attendanceTaken attendance",
        )
        .sort({ moduleIndex: 1, sessionNumber: 1 })
        .lean();

      const studentIds = (group?.students || []).map((s) =>
        (s.studentId || s).toString(),
      );

      const sessionsWithStatus = sessions.map((s) => {
        const studentAttendance = (s.attendance || []).filter((a) =>
          studentIds.includes(a.studentId?.toString()),
        );

        return {
          _id: s._id,
          title: s.title,
          moduleIndex: s.moduleIndex,
          sessionNumber: s.sessionNumber,
          lessonIndexes: s.lessonIndexes,
          scheduledDate: s.scheduledDate,
          startTime: s.startTime,
          endTime: s.endTime,
          status: s.status,
          attendanceTaken: s.attendanceTaken,
          studentAttendanceStatuses: studentAttendance.map((a) => ({
            studentId: a.studentId,
            status: a.status,
          })),
        };
      });

      return NextResponse.json({
        success: true,
        data: sessionsWithStatus,
      });
    }

    return NextResponse.json(
      { success: false, error: "Provide search, studentId, groupId, or action" },
      { status: 400 },
    );
  } catch (error) {
    console.error("❌ [Make-up GET]:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST — إنشاء جروب تعويضي + تفعيله + إرسال الرسائل (request واحد)
// ═══════════════════════════════════════════════════════════════════════════
export async function POST(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const adminUser = authCheck.user;
    await connectDB();

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON" },
        { status: 400 },
      );
    }

    const {
      studentId,
      groupId, // الجروب الأصلي
      sessionId, // السيشن الأصلية
      instructorId, // المدرس المختار
      scheduledDate, // تاريخ الحصة التعويضية
      startTime,
      endTime,
      newGroupName,
      deliveryMode, // "online" | "offline"
      location, // لو offline
      locationDetails, // لو offline
      maxStudents = 1,
      // اللينكات المختارة (للـ Online بس)
      selectedLinkIds = [],
    } = body;

    // ─── Validation ─────────────────────────────────────────────────────
    if (!studentId || !groupId || !sessionId || !instructorId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: studentId, groupId, sessionId, instructorId",
        },
        { status: 400 },
      );
    }

    if (!scheduledDate || !startTime || !endTime) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: scheduledDate, startTime, endTime",
        },
        { status: 400 },
      );
    }

    if (!newGroupName || !newGroupName.trim()) {
      return NextResponse.json(
        { success: false, error: "Group name is required" },
        { status: 400 },
      );
    }

    if (!["online", "offline"].includes(deliveryMode)) {
      return NextResponse.json(
        {
          success: false,
          error: "deliveryMode must be 'online' or 'offline'",
        },
        { status: 400 },
      );
    }

    // ─── 1. تحقق من وجود الطالب ─────────────────────────────────────────
    const student = await Student.findById(studentId).lean();
    if (!student) {
      return NextResponse.json(
        { success: false, error: "Student not found" },
        { status: 404 },
      );
    }

    // ─── 2. تحقق من وجود الجروب الأصلي ──────────────────────────────────
    const originalGroup = await Group.findById(groupId)
      .populate({ path: "courseId", select: "title level curriculum" })
      .lean();

    if (!originalGroup) {
      return NextResponse.json(
        { success: false, error: "Original group not found" },
        { status: 404 },
      );
    }

    // ─── 3. تحقق إن الطالب فعلاً في الجروب الأصلي ───────────────────────
    const studentIdsInOriginal = (originalGroup.students || []).map((s) =>
      (s.studentId || s).toString(),
    );

    if (!studentIdsInOriginal.includes(studentId.toString())) {
      return NextResponse.json(
        { success: false, error: "Student is not enrolled in this group" },
        { status: 400 },
      );
    }

    // ─── 4. تحقق إن المدرس في الجروب الأصلي ─────────────────────────────
    const instructorEntry = (originalGroup.instructors || []).find(
      (i) =>
        (i.userId?._id || i.userId)?.toString() === instructorId.toString(),
    );

    if (!instructorEntry) {
      return NextResponse.json(
        {
          success: false,
          error: "Instructor is not assigned to this group",
        },
        { status: 400 },
      );
    }

    // ─── 5. تحقق من وجود السيشن الأصلية ─────────────────────────────────
    const originalSession = await Session.findOne({
      _id: sessionId,
      groupId,
      isDeleted: false,
    }).lean();

    if (!originalSession) {
      return NextResponse.json(
        { success: false, error: "Original session not found in this group" },
        { status: 404 },
      );
    }

    // ─── 6. تحقق من تفرد اسم الجروب الجديد ──────────────────────────────
    const trimmedName = newGroupName.trim();
    const duplicateName = await Group.findOne({
      name: { $regex: `^${trimmedName}$`, $options: "i" },
      isDeleted: false,
    });
    if (duplicateName) {
      return NextResponse.json(
        {
          success: false,
          error: `يوجد مجموعة بنفس الاسم "${trimmedName}" بالفعل. اختر اسم مختلف.`,
        },
        { status: 409 },
      );
    }

    // ─── 7. امنع تكرار حصة تعويضية لنفس السيشن الأصلية ──────────────────
    const existingMakeup = await Group.findOne({
      isMakeupGroup: true,
      "makeupInfo.originalSessionId": sessionId,
      isDeleted: false,
    }).lean();

    if (existingMakeup) {
      return NextResponse.json(
        {
          success: false,
          error: `يوجد حصة تعويضية بالفعل لهذه السيشن (${existingMakeup.name})`,
          existingGroupId: existingMakeup._id,
        },
        { status: 409 },
      );
    }

    // ─── 8. تحقق من مكان الجروب لو Offline ──────────────────────────────
    if (deliveryMode === "offline") {
      const hasLocationInfo =
        location?.trim() ||
        locationDetails?.placeName?.trim() ||
        (locationDetails?.lat && locationDetails?.lng);

      if (!hasLocationInfo) {
        return NextResponse.json(
          {
            success: false,
            error: "لازم تحدد مكان الجروب على الماب في حالة الأوفلاين",
          },
          { status: 400 },
        );
      }
    }

    // ─── 9. بناء schedule للجروب الجديد (يوم واحد بس) ───────────────────
    const scheduledDateObj = new Date(scheduledDate);
    const dayName = scheduledDateObj.toLocaleDateString("en-US", {
      weekday: "long",
    });

    const newSchedule = {
      startDate: scheduledDateObj,
      daysOfWeek: [dayName],
      timeFrom: startTime,
      timeTo: endTime,
      timezone: "Africa/Cairo",
    };

    // ─── 10. تحقق من تعارض المدرس ──────────────────────────────────────
    const conflicts = await checkInstructorConflicts(
      [instructorId],
      newSchedule,
    );

    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "تعارض في مواعيد المدرب",
          conflictType: "instructor_schedule",
          conflicts,
          conflictMessage: conflicts
            .map(
              (c) =>
                `المدرب "${c.instructorName}" مشغول بالفعل في مجموعة "${c.conflictGroupName}" في نفس الموعد (${c.conflictDays.join("، ")} - ${c.conflictTime})`,
            )
            .join("\n"),
        },
        { status: 409 },
      );
    }

    // ─── 11. تحقق من اللينكات للـ Online ────────────────────────────────
    let validatedLinkIds = [];

    if (deliveryMode === "online") {
      if (!Array.isArray(selectedLinkIds) || selectedLinkIds.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              "لازم تختار لينك واحد على الأقل للجروب الأونلاين، أو غيّر النوع لأوفلاين",
          },
          { status: 400 },
        );
      }

      const validLinkIds = selectedLinkIds.filter((id) =>
        mongoose.Types.ObjectId.isValid(id),
      );

      if (validLinkIds.length === 0) {
        return NextResponse.json(
          { success: false, error: "Invalid link IDs" },
          { status: 400 },
        );
      }

      // ✅ افحص كل لينك ضد التعارضات الفعلية
      const linksToCheck = await MeetingLink.find({
        _id: { $in: validLinkIds },
        isDeleted: false,
      }).lean();

      if (linksToCheck.length === 0) {
        return NextResponse.json(
          { success: false, error: "اللينكات المختارة مش موجودة" },
          { status: 404 },
        );
      }

      const conflictingLinks = [];
      for (const link of linksToCheck) {
        const conflict = findScheduleConflict(link, newSchedule, null);
        if (conflict) {
          conflictingLinks.push({
            linkId: link._id,
            linkName: link.name,
            conflictingGroupId: conflict.conflictingGroupId,
            conflictingDays: conflict.conflictingDays || [],
            conflictingTime: conflict.conflictingTime || "",
          });
        }
      }

      if (conflictingLinks.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "بعض اللينكات المختارة متعارضة مع جروبات تانية",
            linkConflicts: conflictingLinks,
          },
          { status: 409 },
        );
      }

      validatedLinkIds = linksToCheck.map((l) => l._id.toString());
    }

    // ─── 12. ابني courseSnapshot ────────────────────────────────────────
    const course = originalGroup.courseId;
    const courseSnapshot = {
      title: course?.title || "",
      level: course?.level || "",
      curriculumModulesCount: course?.curriculum?.length || 0,
      totalLessons:
        course?.curriculum?.reduce(
          (sum, m) => sum + (m.lessons?.length || 0),
          0,
        ) || 0,
      totalSessions: 1,
      curriculum:
        course?.curriculum?.map((m) => ({
          title: m.title,
          order: m.order,
          lessons:
            m.lessons?.map((l) => ({
              title: l.title,
              order: l.order,
              sessionsCount: l.sessionsCount || 2,
            })) || [],
        })) || [],
    };

    // ─── 13. كود الجروب ──────────────────────────────────────────────────
    const groupCode = `MAKEUP-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 4)
      .toUpperCase()}`;

    // ─── 14. نظّف locationDetails لو online ─────────────────────────────
    const normalizedLocationDetails =
      deliveryMode === "offline"
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
          };

    // ─── 15. أنشئ الجروب الجديد (draft لحد ما التفعيل ينجح) ─────────────
    const newGroupData = {
      name: trimmedName,
      code: groupCode,
      courseId: course._id || originalGroup.courseId,
      courseSnapshot,
      instructors: [
        {
          userId: instructorId,
          countTime: 0,
        },
      ],
      students: [studentId],
      maxStudents: Math.max(1, parseInt(maxStudents) || 1),
      currentStudentsCount: 1,
      schedule: newSchedule,
      deliveryMode,
      location:
        deliveryMode === "offline"
          ? (location || "").trim()
          : "",
      locationDetails: normalizedLocationDetails,
      pricing: {
        price: 0,
        paymentType: "full",
        installmentPlan: { numberOfInstallments: 0, amountPerInstallment: 0 },
      },
      automation: {
        whatsappEnabled: true,
        welcomeMessage: true,
        reminderEnabled: true,
        reminderBeforeHours: 24,
        notifyGuardianOnAbsence: true,
        notifyOnSessionUpdate: true,
        completionMessage: false,
      },
      moduleSelection: {
        mode: "specific",
        selectedModules: [originalSession.moduleIndex],
      },
      status: "draft",
      sessionsGenerated: false,
      totalSessionsCount: 1,

      // ✅ العلامات المميزة للحصة التعويضية
      isMakeupGroup: true,
      makeupInfo: {
        studentId,
        originalSessionId: sessionId,
        originalGroupId: groupId,
        originalSessionTitle: originalSession.title || "",
        originalSessionDate: originalSession.scheduledDate || null,
        createdBy: adminUser.id,
        createdAt: new Date(),
      },

      // اللينكات المختارة (بتتقرا وقت التفعيل)
      metadata: {
        selectedLinkIds: validatedLinkIds,
      },

      createdBy: adminUser.id,
      updatedAt: new Date(),
      tags: [],
    };

    const newGroup = await Group.create(newGroupData);

    // ─── 16. فعّل الجروب: توليد السيشن + حجز اللينك + إرسال الـ 3 رسائل ───
    // ✅ اتغير النداء — بقى onMakeupGroupActivated من makeupAutomation
    await Group.findByIdAndUpdate(newGroup._id, {
      $set: {
        status: "active",
        "metadata.activatedAt": new Date(),
        "metadata.lastModifiedBy": adminUser.id,
        "metadata.updatedAt": new Date(),
      },
    });

    let activation;
    try {
      activation = await onMakeupGroupActivated(
        newGroup._id,
        adminUser.id,
        deliveryMode === "online" ? validatedLinkIds : [],
      );
    } catch (activationError) {
      console.error(
        "❌ [Make-up] Activation failed — rolling back:",
        activationError,
      );

      // رجّع كل حاجة زي ما كانت عشان الأدمن يقدر يحاول تاني بنفس الاسم/السيشن
      await Session.deleteMany({ groupId: newGroup._id });
      await Group.findByIdAndUpdate(newGroup._id, {
        $set: { isDeleted: true, status: "draft" },
      });

      return NextResponse.json(
        {
          success: false,
          error: `فشل توليد الحصة التعويضية: ${activationError.message}`,
        },
        { status: 500 },
      );
    }

    // ─── 17. رجّع التفاصيل ─────────────────────────────────────────────
    const populatedGroup = await Group.findById(newGroup._id)
      .populate("courseId", "title level")
      .populate("instructors.userId", "name email")
      .populate("createdBy", "name email")
      .lean();

    const notifications = activation.makeupNotifications || {
      success: false,
      reason: "not_triggered",
      results: {},
    };

    console.log(
      `✅ [Make-up] Group created & activated: ${newGroup.code} for student ${student.personalInfo?.fullName} (${deliveryMode})`,
    );

    return NextResponse.json(
      {
        success: true,
        message: "تم إنشاء الحصة التعويضية وتفعيلها بنجاح",
        // نتيجة كل رسالة: { student | guardian | instructor: { sent, error } }
        notifications: {
          success: notifications.success,
          reason: notifications.reason || null,
          results: notifications.results || {},
        },
        data: {
          group: {
            _id: populatedGroup._id,
            name: populatedGroup.name,
            code: populatedGroup.code,
            status: populatedGroup.status,
            isMakeupGroup: true,
            deliveryMode: populatedGroup.deliveryMode,
            course: populatedGroup.courseId,
            instructors: (populatedGroup.instructors || []).map((i) => ({
              _id: i.userId?._id || i.userId,
              name: i.userId?.name || "",
              email: i.userId?.email || "",
            })),
            schedule: populatedGroup.schedule,
            selectedLinkIds:
              populatedGroup.metadata?.selectedLinkIds || [],
            sessionsGenerated: activation.sessionsGenerated,
          },
          student: {
            _id: student._id,
            name: student.personalInfo?.fullName || "",
            enrollmentNumber: student.enrollmentNumber || "",
          },
          originalSession: {
            _id: originalSession._id,
            title: originalSession.title,
            moduleIndex: originalSession.moduleIndex,
            sessionNumber: originalSession.sessionNumber,
            scheduledDate: originalSession.scheduledDate,
          },
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("❌ [Make-up POST]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create make-up group",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}