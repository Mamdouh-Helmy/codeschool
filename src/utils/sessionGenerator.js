// → utils/sessionGenerator.js  (استبدل الملف القديم بالكامل بده)
import mongoose from "mongoose";
import MeetingLink from "../app/models/MeetingLink.js";
import {
  buildSessionSlotsForModules,
  getModuleSessionSlots,
  resolveModulesToUse,
} from "./courseSessionSlots";

// Day mapping
const dayMap = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const dayMapReverse = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

/**
 * ✅ Calculate total sessions from course curriculum based on module selection
 * (ديناميك: بيحسب من الدروس الفعلية لكل موديول)
 */
export function calculateTotalSessions(
  curriculum,
  moduleSelection = { mode: "all", selectedModules: [] },
) {
  if (!curriculum || !Array.isArray(curriculum) || curriculum.length === 0) {
    console.log("⚠️ No curriculum provided or empty array");
    return 0;
  }

  const total = buildSessionSlotsForModules(curriculum, moduleSelection).length;
  console.log(
    `📊 ${moduleSelection?.mode === "all" ? "All" : "Selected"} modules → ${total} total sessions`,
  );
  return total;
}

/**
 * ✅ Get session distribution summary
 */
export function getSessionDistributionSummary(
  curriculum,
  moduleSelection = { mode: "all", selectedModules: [] },
) {
  if (!curriculum || !Array.isArray(curriculum)) {
    return {
      totalModules: 0,
      totalLessons: 0,
      totalSessions: 0,
      modules: [],
    };
  }

  const selection = moduleSelection || { mode: "all", selectedModules: [] };
  const selectedSet = new Set(
    resolveModulesToUse(curriculum, selection).map((x) => x.originalIndex),
  );

  const summary = {
    totalModules: curriculum.length,
    totalLessons: 0,
    totalSessions: 0,
    modules: [],
    selectedModules: selection,
  };

  curriculum.forEach((module, idx) => {
    const lessonsCount = module.lessons?.length || 0;
    const slots = getModuleSessionSlots(module);
    const sessionsCount = slots.length;
    const isSelected = selectedSet.has(idx);

    summary.totalLessons += lessonsCount;
    if (isSelected) summary.totalSessions += sessionsCount;

    summary.modules.push({
      index: idx,
      title: module.title,
      lessonsCount,
      sessionsCount,
      isSelected,
      distribution: slots
        .map(
          (s) =>
            `S${s.sessionNumber}: L${s.lessonIndexes.map((i) => i + 1).join("+")}`,
        )
        .join(" | "),
    });
  });

  return summary;
}

/**
 * ✅ Get day name from day number
 */
function getDayName(dayNumber) {
  return dayMapReverse[dayNumber] || "Unknown";
}

/**
 * ✅ Calculate day difference between two days relative to a start day
 */
function calculateDayDifference(startDay, targetDay) {
  return (targetDay - startDay + 7) % 7;
}

/**
 * ✅ Create weekly schedule for 1-3 days (FLEXIBLE)
 * Fix: sort days relative to startDate's day so the first session always falls on startDate
 *
 * ✅ exported عشان الـ preview في route التفعيل يستخدم نفس الدالة بالظبط
 * (فالتواريخ في المعاينة = التواريخ الفعلية)
 *
 * options.silent: يمنع اللوجز (للـ preview)
 */
export function createFlexibleWeeklySchedule(
  baseDate,
  scheduleDays,
  totalSessions,
  options = {},
) {
  const { silent = false } = options;
  const log = silent ? () => {} : console.log;
  const schedule = [];

  const startDate = new Date(baseDate);
  const startDayNumber = startDate.getDay();

  // Sort days starting from startDate's day, wrapping around the week.
  // e.g. startDate = Saturday (6) → order: 6, 0, 1 instead of 0, 1, 6
  const dayNumbers = scheduleDays
    .map((day) => dayMap[day])
    .sort((a, b) => {
      const aNorm = (a - startDayNumber + 7) % 7;
      const bNorm = (b - startDayNumber + 7) % 7;
      return aNorm - bNorm;
    });

  const daysPerWeek = dayNumbers.length;

  log(`📅 Creating flexible schedule:`);
  log(`  Total sessions needed: ${totalSessions}`);
  log(`  Days per week: ${daysPerWeek}`);
  log(`  Schedule days: ${scheduleDays} → ${dayNumbers}`);

  // startDate IS already the first selected day — use it directly
  const adjustedStartDate = new Date(startDate);

  log(
    `  Start date: ${adjustedStartDate.toISOString().split("T")[0]} (${getDayName(adjustedStartDate.getDay())})`,
  );

  for (let sessionIndex = 0; sessionIndex < totalSessions; sessionIndex++) {
    const dayInCycle = sessionIndex % daysPerWeek;
    const weeksElapsed = Math.floor(sessionIndex / daysPerWeek);

    const sessionDate = new Date(adjustedStartDate);
    sessionDate.setDate(adjustedStartDate.getDate() + weeksElapsed * 7);

    if (dayInCycle > 0) {
      const dayDifference = calculateDayDifference(
        dayNumbers[0],
        dayNumbers[dayInCycle],
      );
      sessionDate.setDate(sessionDate.getDate() + dayDifference);
    }

    schedule.push(sessionDate);

    if (!silent) {
      if (sessionIndex < 10 || sessionIndex >= totalSessions - 5) {
        log(
          `  Session ${sessionIndex + 1}: ${sessionDate.toISOString().split("T")[0]} (${getDayName(sessionDate.getDay())})`,
        );
      } else if (sessionIndex === 10) {
        log(`  ... (${totalSessions - 15} sessions omitted) ...`);
      }
    }
  }

  return schedule;
}

/**
 * ✅ Validate schedule days selection
 */
function validateScheduleDays(startDate, daysOfWeek) {
  if (
    !startDate ||
    !daysOfWeek ||
    daysOfWeek.length === 0 ||
    daysOfWeek.length > 3
  ) {
    return {
      valid: false,
      error: "Must select between 1 and 3 days for schedule",
    };
  }

  const startDayName = new Date(startDate).toLocaleDateString("en-US", {
    weekday: "long",
  });

  if (!daysOfWeek.includes(startDayName)) {
    return {
      valid: false,
      error: `First selected day must be ${startDayName} (based on start date)`,
    };
  }

  const uniqueDays = [...new Set(daysOfWeek)];
  if (uniqueDays.length !== daysOfWeek.length) {
    return {
      valid: false,
      error: "Duplicate days are not allowed",
    };
  }

  return {
    valid: true,
    startDayName,
    daysCount: daysOfWeek.length,
  };
}

/**
 * ✅ يسجل حجز فعلي (entry جوه reservations[]) على كل لينك اتحط على
 * سيشنات الجروب — من غير الخطوة دي اللينك بيفضل "available" في الداتابيز
 * حتى لو مستخدم فعلاً، وأي جروب تاني هيقدر ياخده على نفس الميعاد من غير
 * ما يتحذّر.
 *
 * ✅ daysOfWeek بتاعة كل لينك محسوبة من الأيام الفعلية اللي سيشنات الجروب
 * حطّت اللينك ده فيها بس.
 *
 * @param {Array}  sessionsWithLinks - سيشنات (فيها meetingLinkId + scheduledDate + _id)
 * @param {Object} group             - الجروب (فيه schedule.timeFrom/timeTo)
 * @param {String} userId
 */
async function persistLinkReservations(sessionsWithLinks, group, userId) {
  const { timeFrom, timeTo } = group.schedule;

  const byLink = new Map();

  for (const session of sessionsWithLinks) {
    if (!session.meetingLinkId) continue;
    const key = session.meetingLinkId.toString();
    const dayName = dayMapReverse[new Date(session.scheduledDate).getDay()];
    const existing = byLink.get(key);

    if (!existing) {
      byLink.set(key, {
        minDate: session.scheduledDate,
        maxDate: session.scheduledDate,
        lastSessionId: session._id,
        days: new Set([dayName]),
      });
    } else {
      existing.days.add(dayName);
      if (session.scheduledDate < existing.minDate) {
        existing.minDate = session.scheduledDate;
      }
      if (session.scheduledDate > existing.maxDate) {
        existing.maxDate = session.scheduledDate;
        existing.lastSessionId = session._id;
      }
    }
  }

  for (const [linkId, entry] of byLink) {
    try {
      const link = await MeetingLink.findById(linkId);
      if (!link) continue;

      const startTime = new Date(entry.minDate);
      const [fromHours, fromMinutes] = timeFrom.split(":").map(Number);
      startTime.setHours(fromHours, fromMinutes, 0, 0);

      const endTime = new Date(entry.maxDate);
      const [toHours, toMinutes] = timeTo.split(":").map(Number);
      endTime.setHours(toHours, toMinutes, 0, 0);

      const daysOfWeek = Array.from(entry.days);

      await link.reserveForSession(
        entry.lastSessionId,
        group._id,
        startTime,
        endTime,
        userId,
        { daysOfWeek, timeFrom, timeTo },
      );

      console.log(
        `🔗 Reservation persisted on link ${link.name} for group ${group._id} (days: ${daysOfWeek.join(", ")})`,
      );
    } catch (error) {
      console.error(
        `⚠️ Failed to persist reservation for link ${linkId}:`,
        error.message,
      );
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔗 LINK ASSIGNMENT
// ═══════════════════════════════════════════════════════════════════════════
export const LINK_ASSIGNMENT_MODES = Object.freeze({
  FIRST_AVAILABLE: "first_available", // لينك واحد بس يغطي كل الجدول (الافتراضي)
  ROUND_ROBIN: "round_robin", // توزيع بالتناوب على اللينكات المختارة
});

const getSessionDayName = (session) =>
  dayMapReverse[new Date(session.scheduledDate).getDay()];

function createLinkError(code, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

function attachMeetingLink(session, link) {
  return {
    ...session,
    meetingLink: link.link,
    meetingCredentials: {
      username: link.credentials?.username,
      password: link.credentials?.password,
    },
    meetingLinkId: link._id,
    meetingPlatform: link.platform,
    automationEvents: {
      ...(session.automationEvents || {}),
      meetingLinkAssigned: true,
      meetingLinkAssignedAt: new Date(),
    },
  };
}

/** يجيب اللينكات المختارة بنفس ترتيب اختيار الأدمن، بعد تنضيف الحجوزات اليتيمة */
async function loadSelectedLinks(selectedLinkIds) {
  if (!selectedLinkIds?.length) return [];

  const { pruneOrphanedReservations } = await import("./checkMeetingLinks");
  const order = selectedLinkIds.map(String);

  const links = await MeetingLink.find({
    _id: { $in: selectedLinkIds },
    isDeleted: false,
  }).lean();

  links.sort(
    (a, b) => order.indexOf(a._id.toString()) - order.indexOf(b._id.toString()),
  );

  return pruneOrphanedReservations(links);
}

/**
 * ✅ الوضع الافتراضي: لكل يوم من أيام جدول الجروب بشكل مستقل، بيدور على
 * أول لينك (بترتيب اختيار الأدمن) يكون فاضي في اليوم ده تحديدًا:
 *   - فاضي؟ → يتاخد هو بس لكل سيشنات اليوم ده.
 *   - مشغول؟ → يتجاهل، وننتقل للي بعده على نفس اليوم.
 *
 * لو أي يوم منهم مالوش أي لينك فاضي، منحجزش حاجة جزئيًا خالص — بنجمع كل
 * الأيام المتأثرة ونرمي error واحد في الآخر.
 */
async function assignFirstAvailable(sessions, links, schedule, groupId) {
  const { findScheduleConflict } = await import("./checkMeetingLinks");
  const { timeFrom, timeTo } = schedule;

  // كل الأيام المطلوبة، بترتيب أول ظهور ليها في السيشنات
  const requiredDays = [...new Set(sessions.map(getSessionDayName))];

  // نحدد لكل يوم أول لينك فاضي فيه — مستقل تمامًا عن باقي الأيام
  const linkByDay = new Map();
  const uncoveredDays = [];

  for (const day of requiredDays) {
    const daySchedule = { daysOfWeek: [day], timeFrom, timeTo };
    const chosenLink = links.find(
      (link) => !findScheduleConflict(link, daySchedule, groupId),
    );

    if (chosenLink) {
      linkByDay.set(day, chosenLink);
    } else {
      uncoveredDays.push(day);
    }
  }

  if (uncoveredDays.length > 0) {
    const affectedSessions = sessions.filter((s) =>
      uncoveredDays.includes(getSessionDayName(s)),
    ).length;

    throw createLinkError(
      "NO_AVAILABLE_LINK",
      `مفيش لينك فاضي من اللينكات المختارة (${links.map((l) => l.name).join("، ")}) ` +
        `في الأيام دي (${uncoveredDays.join("، ")}) في الميعاد ده (${timeFrom} - ${timeTo}) — ` +
        `${affectedSessions} سيشن هتفضل من غير لينك`,
      { uncoveredDays, affectedSessions },
    );
  }

  return sessions.map((s) =>
    attachMeetingLink(s, linkByDay.get(getSessionDayName(s))),
  );
}

/** الوضع القديم: توزيع بالتناوب، بعد التأكد إن كل اللينكات المختارة فاضية على الجدول */
async function assignRoundRobin(sessions, links, schedule, groupId) {
  const { checkLinksConflictForSchedule } = await import("./checkMeetingLinks");

  const { hasConflicts, conflicts } = await checkLinksConflictForSchedule(
    links.map((l) => l._id.toString()),
    schedule,
    groupId,
  );

  if (hasConflicts) {
    throw createLinkError(
      "LINK_CONFLICT",
      "اللينكات المختارة متعارضة مع جروب تاني في نفس الميعاد",
      { linkConflicts: conflicts },
    );
  }

  return sessions.map((s, i) => attachMeetingLink(s, links[i % links.length]));
}

/**
 * نقطة الدخول الوحيدة لتوزيع اللينكات (الحصة التعويضية + الجروب العادي).
 * schedule = { daysOfWeek, timeFrom, timeTo }
 */
async function assignLinksToSessions(
  sessions,
  links,
  { mode, schedule, groupId },
) {
  if (links.length === 0) {
    return { sessions, assigned: 0, failed: sessions.length, linksUsed: [] };
  }

  const assign =
    mode === LINK_ASSIGNMENT_MODES.ROUND_ROBIN
      ? assignRoundRobin
      : assignFirstAvailable;

  const assignedSessions = await assign(sessions, links, schedule, groupId);
  const linksUsed = [
    ...new Set(assignedSessions.map((s) => s.meetingLinkId.toString())),
  ];

  return {
    sessions: assignedSessions,
    assigned: assignedSessions.length,
    failed: 0,
    linksUsed,
  };
}

function summarizeDistribution(sessions) {
  const distribution = {};
  const dateSet = new Set();

  for (const s of sessions) {
    const day = getSessionDayName(s);
    distribution[day] = (distribution[day] || 0) + 1;
    dateSet.add(new Date(s.scheduledDate).toISOString().split("T")[0]);
  }

  return { distribution, uniqueDates: Array.from(dateSet).sort() };
}

/**
 * ✅ Generate sessions based on module selection
 *
 * ✅ عدد السيشنات لكل موديول ديناميك (من دروس الموديول الفعلية).
 * ✅ الترتيب: الموديولات بترتيب الكاريكولم، وجوه كل موديول بـ sessionNumber
 *    تصاعدي، والتواريخ بتتوزع بالتسلسل ده بالظبط على أيام الجروب.
 *
 * 🆕 دعم الحصص التعويضية:
 * لو group.isMakeupGroup === true → بنولّد سيشن واحدة بس (مش الجدول الكامل)،
 * مربوطة بالسيشن الأصلية اللي الأدمن اختارها، وعليها isComplimentary: true.
 */
export async function generateSessionsForGroup(
  groupId,
  group,
  userId,
  selectedLinkIds = [],
  options = {},
) {
  const linkMode =
    options.linkAssignmentMode || LINK_ASSIGNMENT_MODES.FIRST_AVAILABLE;

  try {
    console.log(`\n🔄 ========== GENERATING SESSIONS ==========`);
    console.log(`Group: ${group?.name} (${groupId}) | Status: ${group?.status}`);
    console.log(
      `Makeup: ${group?.isMakeupGroup ? "YES" : "NO"} | Link mode: ${linkMode} | Selected links: ${selectedLinkIds.length}`,
    );

    if (!group) throw new Error("Group not found");

    if (group.status !== "active") {
      throw new Error(`Group must be active. Current status: ${group.status}`);
    }

    if (group.sessionsGenerated) {
      console.log("⚠️ Sessions already generated for this group");
      return {
        success: false,
        message: "Sessions already generated",
        totalGenerated: 0,
      };
    }

    const course = group.courseId;
    if (!course?.curriculum?.length) {
      throw new Error("Course curriculum not found");
    }

    const { startDate, daysOfWeek, timeFrom, timeTo } = group.schedule;

    if (!startDate || !daysOfWeek?.length) {
      throw new Error(
        "Invalid schedule: Must have start date and at least 1 selected day",
      );
    }

    const linkSchedule = { daysOfWeek, timeFrom, timeTo };

    // ✅ نوع التسليم من الجروب (Source of Truth) — بيتحط صراحةً على كل سيشن
    const groupDeliveryMode =
      group.deliveryMode === "offline" ? "offline" : "online";
    const isOfflineGroup = groupDeliveryMode === "offline";

    console.log(`📍 Delivery mode: ${groupDeliveryMode}`);

    // ═══════════════════════════════════════════════════════════════════
    // 🎯 MAKE-UP GROUP FLOW — سيشن واحدة بس
    // ═══════════════════════════════════════════════════════════════════
    if (group.isMakeupGroup === true) {
      const originalSessionId = group.makeupInfo?.originalSessionId;
      if (!originalSessionId) {
        throw new Error(
          "Make-up group is missing originalSessionId in makeupInfo",
        );
      }

      const OriginalSession = (await import("../app/models/Session")).default;
      const originalSession = await OriginalSession.findById(originalSessionId)
        .select(
          "title description moduleIndex sessionNumber lessonIndexes groupId scheduledDate startTime endTime",
        )
        .lean();

      if (!originalSession) throw new Error("Original session not found");

      const moduleData = course.curriculum[originalSession.moduleIndex];
      if (!moduleData?.lessons?.length) {
        throw new Error(
          `Module ${originalSession.moduleIndex + 1} is invalid (no lessons found)`,
        );
      }

      // ✅ نفس الدروس بتاعة السيشن الأصلية — ولو مش موجودة نجيبها من سلوتات الموديول
      const lessonIndexes = originalSession.lessonIndexes?.length
        ? originalSession.lessonIndexes
        : getModuleSessionSlots(moduleData).find(
            (s) => s.sessionNumber === originalSession.sessionNumber,
          )?.lessonIndexes || [0];

      const firstLesson = moduleData.lessons[lessonIndexes[0]];
      const lessonTitle = firstLesson?.title?.trim() || "";

      const sessionDoc = {
        _id: new mongoose.Types.ObjectId(),
        groupId: group._id,
        courseId: course._id,
        moduleIndex: originalSession.moduleIndex,
        sessionNumber: originalSession.sessionNumber,
        lessonIndexes,
        title: `Make-up Session ${originalSession.sessionNumber}: ${lessonTitle}`,
        description:
          firstLesson?.description || originalSession.description || "",
        scheduledDate: new Date(startDate),
        startTime: timeFrom,
        endTime: timeTo,
        status: "scheduled",
        attendanceTaken: false,
        attendance: [],

        // ✅ نوع التسليم صريح من الجروب
        deliveryMode: groupDeliveryMode,

        // ✅ العلامة المهمة جدًا
        isComplimentary: true,
        makeupInfo: {
          originalSessionId: originalSession._id,
          originalGroupId: originalSession.groupId,
          originalSessionTitle: originalSession.title || "",
          originalSessionDate: originalSession.scheduledDate || null,
          createdBy: userId,
          createdAt: new Date(),
        },

        automationEvents: {
          reminderSent: false,
          absentNotificationsSent: false,
          postponeNotificationSent: false,
          cancelNotificationSent: false,
          meetingLinkAssigned: false,
        },
        metadata: {
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isDeleted: false,
      };

      // 🔗 اللينكات — الأوفلاين مبيحتاجش لينكات خالص
      const links = isOfflineGroup
        ? []
        : await loadSelectedLinks(selectedLinkIds);
      const {
        sessions: sessionsWithLinks,
        assigned,
        failed,
        linksUsed,
      } = await assignLinksToSessions([sessionDoc], links, {
        mode: linkMode,
        schedule: linkSchedule,
        groupId: group._id,
      });

      if (assigned > 0) {
        await persistLinkReservations(sessionsWithLinks, group, userId);
      }

      const { distribution, uniqueDates } =
        summarizeDistribution(sessionsWithLinks);

      console.log(`✅ Make-up session generated: ${sessionDoc.title}`);

      return {
        success: true,
        sessions: sessionsWithLinks,
        totalGenerated: sessionsWithLinks.length,
        startDate: sessionsWithLinks[0]?.scheduledDate,
        endDate: sessionsWithLinks[0]?.scheduledDate,
        distribution,
        uniqueDates,
        schedule: {
          daysOfWeek,
          daysPerWeek: daysOfWeek.length,
          startDate: new Date(startDate),
          timeFrom,
          timeTo,
        },
        moduleSelection: {
          mode: "single",
          selectedModules: [originalSession.moduleIndex],
          modulesProcessed: 1,
        },
        meetingLinks: {
          assigned,
          failed,
          total: sessionsWithLinks.length,
          mode: linkMode,
          linksUsed,
        },
        deliveryMode: groupDeliveryMode,
        isMakeupGroup: true,
      };
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📚 NORMAL GROUP FLOW
    // ═══════════════════════════════════════════════════════════════════
    const moduleSelection = group.moduleSelection || {
      mode: "all",
      selectedModules: [],
    };

    const scheduleValidation = validateScheduleDays(startDate, daysOfWeek);
    if (!scheduleValidation.valid) throw new Error(scheduleValidation.error);

    // ✅ كل السيشنات المطلوبة بالترتيب الصحيح (module ↑ ثم sessionNumber ↑)
    const slots = buildSessionSlotsForModules(
      course.curriculum,
      moduleSelection,
    );

    if (slots.length === 0) {
      throw new Error("No modules/sessions selected for session generation");
    }

    const totalSessions = slots.length;
    const modulesProcessed = new Set(slots.map((s) => s.moduleIndex)).size;

    console.log(
      `📚 Modules: ${modulesProcessed} | Sessions: ${totalSessions} | Days/week: ${scheduleValidation.daysCount}`,
    );

    // ✅ التواريخ بنفس عدد السيشنات بالظبط (مفيش فرق بين الحساب والتوليد)
    const sessionDates = createFlexibleWeeklySchedule(
      startDate,
      daysOfWeek,
      totalSessions,
    );
    if (sessionDates.length !== totalSessions) {
      throw new Error("Failed to create session dates");
    }

    // ── Build session objects ─────────────────────────────────────────────
    const sessions = slots.map((slot, i) => {
      const firstLesson = slot.module.lessons[slot.lessonIndexes[0]];
      const lessonTitle = firstLesson?.title?.trim() || "";

      return {
        _id: new mongoose.Types.ObjectId(),
        groupId: group._id,
        courseId: course._id,
        moduleIndex: slot.moduleIndex,
        sessionNumber: slot.sessionNumber,
        lessonIndexes: slot.lessonIndexes,
        title: `Session ${slot.sessionNumber}: ${lessonTitle}`,
        description: firstLesson?.description || "",
        scheduledDate: sessionDates[i],
        startTime: timeFrom,
        endTime: timeTo,
        status: "scheduled",
        attendanceTaken: false,
        attendance: [],

        // ✅ نوع التسليم صريح من الجروب
        deliveryMode: groupDeliveryMode,

        isComplimentary: false,
        automationEvents: {
          reminderSent: false,
          absentNotificationsSent: false,
          postponeNotificationSent: false,
          cancelNotificationSent: false,
          meetingLinkAssigned: false,
        },
        metadata: {
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isDeleted: false,
      };
    });

    // ── ✅ Assign meeting links (الأوفلاين مبياخدش لينكات) ─────────────────
    const links = isOfflineGroup
      ? []
      : await loadSelectedLinks(selectedLinkIds);
    console.log(
      `🔗 Mode: ${linkMode} | Available selected links: ${links.length}`,
    );

    const {
      sessions: sessionsWithLinks,
      assigned: linksAssigned,
      failed: linksFailed,
      linksUsed,
    } = await assignLinksToSessions(sessions, links, {
      mode: linkMode,
      schedule: linkSchedule,
      groupId: group._id,
    });

    if (linksAssigned > 0) {
      await persistLinkReservations(sessionsWithLinks, group, userId);
    }

    const { distribution, uniqueDates } =
      summarizeDistribution(sessionsWithLinks);

    console.log(
      `✅ Generated ${sessionsWithLinks.length} sessions | mode: ${groupDeliveryMode} | links assigned: ${linksAssigned} | links used: ${linksUsed.length}`,
    );

    return {
      success: true,
      sessions: sessionsWithLinks,
      totalGenerated: sessionsWithLinks.length,
      startDate: sessionsWithLinks[0]?.scheduledDate,
      endDate: sessionsWithLinks[sessionsWithLinks.length - 1]?.scheduledDate,
      distribution,
      uniqueDates,
      schedule: {
        daysOfWeek,
        daysPerWeek: daysOfWeek.length,
        startDate: new Date(startDate),
        timeFrom,
        timeTo,
      },
      moduleSelection: {
        mode: moduleSelection.mode,
        selectedModules: moduleSelection.selectedModules,
        modulesProcessed,
      },
      meetingLinks: {
        assigned: linksAssigned,
        failed: linksFailed,
        total: sessionsWithLinks.length,
        mode: linkMode,
        linksUsed,
      },
      deliveryMode: groupDeliveryMode,
    };
  } catch (error) {
    console.error("❌ Error generating sessions:", error);
    throw error;
  }
}

/**
 * ✅ Release meeting link when session is completed/cancelled
 *
 * قبل ما نفك حجز الجروب بالكامل من على اللينك، بنتأكد الأول مفيش
 * سيشنات تانية لنفس الجروب لسه بتستخدم نفس اللينك. لو لسه فيه، بنفصل
 * السيشن دي بس عن اللينك من غير ما نلمس حجز الجروب نفسه.
 */
export async function releaseMeetingLink(sessionId) {
  try {
    const Session = (await import("../app/models/Session")).default;

    const session = await Session.findById(sessionId);

    if (!session) {
      console.log(`ℹ️ Session not found: ${sessionId}`);
      return { success: false, error: "Session not found" };
    }

    if (!session.meetingLinkId) {
      console.log(`ℹ️ No meeting link to release for session: ${sessionId}`);
      return { success: true, message: "No meeting link associated" };
    }

    const meetingLink = await MeetingLink.findById(session.meetingLinkId);

    if (!meetingLink) {
      console.warn(`⚠️ Meeting link not found: ${session.meetingLinkId}`);
      return { success: false, error: "Meeting link not found" };
    }

    const otherActiveSessions = await Session.countDocuments({
      groupId: session.groupId,
      meetingLinkId: session.meetingLinkId,
      _id: { $ne: session._id },
      isDeleted: false,
      status: { $ne: "cancelled" },
    });

    let result;

    if (otherActiveSessions > 0) {
      console.log(
        `ℹ️ Link ${meetingLink.name} still used by ${otherActiveSessions} other session(s) of group ${session.groupId} — keeping the group's reservation, only unlinking this session.`,
      );
      result = {
        success: true,
        message:
          "Session unlinked; group reservation kept (other sessions still use this link)",
        status: meetingLink.status,
      };
    } else {
      const sessionStart = new Date(session.scheduledDate);
      const [startHours, startMinutes] = session.startTime
        .split(":")
        .map(Number);
      sessionStart.setHours(startHours, startMinutes, 0, 0);

      const sessionEnd = new Date(session.scheduledDate);
      const [endHours, endMinutes] = session.endTime.split(":").map(Number);
      sessionEnd.setHours(endHours, endMinutes, 0, 0);

      const actualDuration = (sessionEnd - sessionStart) / (1000 * 60);

      result = await meetingLink.releaseReservation(
        session.groupId,
        actualDuration,
      );

      console.log(
        `✅ Released meeting link reservation for group ${session.groupId} (session: ${sessionId})`,
      );
    }

    await Session.findByIdAndUpdate(sessionId, {
      $set: {
        meetingLink: null,
        meetingLinkId: null,
        meetingCredentials: null,
        meetingPlatform: null,
        "automationEvents.meetingLinkAssigned": false,
      },
    });

    return result;
  } catch (error) {
    console.error("❌ Error releasing meeting link:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Regenerate sessions for a group (delete old + create new)
 */
export async function regenerateSessionsForGroup(groupId, group, userId) {
  try {
    console.log(`🔄 Regenerating sessions for group: ${groupId}`);

    const Session = (await import("../app/models/Session")).default;

    const existingSessions = await Session.find({
      groupId: groupId,
      isDeleted: false,
      meetingLinkId: { $ne: null },
    });

    for (const session of existingSessions) {
      try {
        await releaseMeetingLink(session._id);
      } catch (releaseError) {
        console.error(
          `⚠️ Failed to release meeting link for session ${session._id}:`,
          releaseError.message,
        );
      }
    }

    await Session.updateMany(
      { groupId: groupId, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          status: "cancelled",
        },
      },
    );

    console.log(`🗑️ Marked existing sessions as deleted`);

    const result = await generateSessionsForGroup(groupId, group, userId);

    if (result.success) {
      console.log(
        `✅ Regenerated ${result.totalGenerated} sessions for group ${groupId}`,
      );
    }

    return result;
  } catch (error) {
    console.error("❌ Error regenerating sessions:", error);
    throw error;
  }
}

/**
 * Get session distribution for display purposes
 */
export function getSessionDisplayInfo(sessions) {
  if (!sessions || sessions.length === 0) {
    return {
      total: 0,
      byDay: {},
      byModule: {},
      timeline: [],
    };
  }

  const byDay = {};
  const byModule = {};
  const timeline = [];

  sessions.forEach((session) => {
    const day = new Date(session.scheduledDate).toLocaleDateString("en-US", {
      weekday: "long",
    });
    const date = session.scheduledDate.toISOString().split("T")[0];

    if (!byDay[day]) {
      byDay[day] = {
        day: day,
        count: 0,
        sessions: [],
      };
    }
    byDay[day].count++;
    byDay[day].sessions.push({
      id: session._id || session.id,
      title: session.title,
      time: `${session.startTime} - ${session.endTime}`,
      module: session.moduleIndex + 1,
      sessionNumber: session.sessionNumber,
      hasMeetingLink: !!session.meetingLink,
    });

    const moduleKey = `Module ${session.moduleIndex + 1}`;
    if (!byModule[moduleKey]) {
      byModule[moduleKey] = {
        module: session.moduleIndex + 1,
        count: 0,
        sessions: [],
      };
    }
    byModule[moduleKey].count++;
    byModule[moduleKey].sessions.push({
      id: session._id || session.id,
      sessionNumber: session.sessionNumber,
      date: date,
      day: day,
      time: `${session.startTime} - ${session.endTime}`,
      hasMeetingLink: !!session.meetingLink,
    });

    timeline.push({
      date: date,
      day: day,
      time: `${session.startTime} - ${session.endTime}`,
      title: session.title,
      module: session.moduleIndex + 1,
      sessionNumber: session.sessionNumber,
      hasMeetingLink: !!session.meetingLink,
      meetingLink: session.meetingLink,
    });
  });

  timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

  return {
    total: sessions.length,
    byDay: byDay,
    byModule: byModule,
    timeline: timeline,
    summary: {
      daysCount: Object.keys(byDay).length,
      modulesCount: Object.keys(byModule).length,
      firstDate: timeline[0]?.date,
      lastDate: timeline[timeline.length - 1]?.date,
      sessionsWithLinks: timeline.filter((s) => s.hasMeetingLink).length,
    },
  };
}

/**
 * Validate if session dates are correctly distributed
 */
export function validateSessionDistribution(sessions, expectedDaysOfWeek) {
  if (!sessions || sessions.length === 0) {
    return {
      valid: false,
      error: "No sessions to validate",
    };
  }

  if (
    !expectedDaysOfWeek ||
    expectedDaysOfWeek.length === 0 ||
    expectedDaysOfWeek.length > 3
  ) {
    return {
      valid: false,
      error: "Expected 1-3 days of week",
    };
  }

  const expectedDayNumbers = expectedDaysOfWeek.map((day) => dayMap[day]);
  const usedDayNumbers = new Set();
  const issues = [];

  sessions.forEach((session, index) => {
    const sessionDay = new Date(session.scheduledDate).getDay();
    usedDayNumbers.add(sessionDay);

    if (!expectedDayNumbers.includes(sessionDay)) {
      issues.push(
        `Session ${index + 1} (${session.title}) is on day ${sessionDay} which is not in expected days`,
      );
    }
  });

  const missingDays = expectedDayNumbers.filter(
    (day) => !usedDayNumbers.has(day),
  );

  if (missingDays.length > 0) {
    missingDays.forEach((day) => {
      issues.push(`Day ${getDayName(day)} is not used in any session`);
    });
  }

  return {
    valid: issues.length === 0,
    issues: issues,
    usedDays: Array.from(usedDayNumbers).map((day) => getDayName(day)),
    expectedDays: expectedDaysOfWeek,
  };
}

/**
 * ✅ Get available meeting links للجدول الأسبوعي المتكرر (أيام + من/لـ)
 */
export async function getAvailableMeetingLinks(
  daysOfWeek,
  timeFrom,
  timeTo,
  platform = null,
) {
  try {
    const links = await MeetingLink.findAvailableLinksForSchedule({
      daysOfWeek,
      timeFrom,
      timeTo,
    });

    if (platform) {
      return links.filter((link) => link.platform === platform);
    }

    return links;
  } catch (error) {
    console.error("❌ Error getting available meeting links:", error);
    return [];
  }
}

/**
 * ✅ Manually assign meeting link to a session
 */
export async function manuallyAssignMeetingLink(
  sessionId,
  meetingLinkId,
  userId,
) {
  try {
    const Session = (await import("../app/models/Session")).default;

    const session = await Session.findById(sessionId);

    if (!session) {
      throw new Error("Session not found");
    }

    if (session.meetingLinkId) {
      await releaseMeetingLink(sessionId);
    }

    const meetingLink = await MeetingLink.findById(meetingLinkId);

    if (!meetingLink) {
      throw new Error("Meeting link not found");
    }

    // ✅ الجدول المتكرر اللي السيشن دي بتمثله — يوم واحد بس (يوم السيشن
    // نفسها)، مش كل أيام الجروب
    const scheduleInfo = {
      daysOfWeek: [session.dayName],
      timeFrom: session.startTime,
      timeTo: session.endTime,
    };

    // ✅ فحص تعارض دفاعي وقت الحفظ الفعلي
    const { checkLinksConflictForSchedule } = await import(
      "./checkMeetingLinks"
    );
    const conflictCheck = await checkLinksConflictForSchedule(
      [meetingLinkId],
      scheduleInfo,
      session.groupId,
    );

    if (conflictCheck.hasConflicts) {
      const error = new Error("اللينك ده متعارض مع جروب تاني في نفس الميعاد");
      error.code = "LINK_CONFLICT";
      error.linkConflicts = conflictCheck.conflicts;
      throw error;
    }

    const startTime = new Date(session.scheduledDate);
    const [hours, minutes] = session.startTime.split(":").map(Number);
    startTime.setHours(hours, minutes, 0, 0);

    const endTime = new Date(startTime);
    const [endHours, endMinutes] = session.endTime.split(":").map(Number);
    endTime.setHours(endHours, endMinutes, 0, 0);

    const reservationResult = await meetingLink.reserveForSession(
      sessionId,
      session.groupId,
      startTime,
      endTime,
      userId,
      scheduleInfo,
    );

    await Session.findByIdAndUpdate(sessionId, {
      $set: {
        meetingLink: reservationResult.link,
        meetingCredentials: {
          username: meetingLink.credentials?.username,
          password: meetingLink.credentials?.password,
        },
        meetingLinkId: meetingLinkId,
        meetingPlatform: meetingLink.platform,
        "automationEvents.meetingLinkAssigned": true,
        "automationEvents.meetingLinkAssignedAt": new Date(),
      },
    });

    return {
      success: true,
      message: "Meeting link assigned successfully",
      link: reservationResult.link,
      credentials: reservationResult.credentials,
      meetingLinkId: meetingLinkId,
    };
  } catch (error) {
    console.error("❌ Error manually assigning meeting link:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * ✅ Get module selection summary (ديناميك)
 */
export function getModuleSelectionSummary(group) {
  if (!group || !group.courseId || !group.courseId.curriculum) {
    return {
      hasSelection: false,
      mode: "all",
      selectedModules: [],
      totalModules: 0,
      selectedCount: 0,
      totalSessions: 0,
      selectedSessions: 0,
    };
  }

  const moduleSelection = group.moduleSelection || {
    mode: "all",
    selectedModules: [],
  };
  const curriculum = group.courseId.curriculum;

  const totalModules = curriculum.length;
  const totalSessions = buildSessionSlotsForModules(curriculum, {
    mode: "all",
    selectedModules: [],
  }).length;

  const selected = resolveModulesToUse(curriculum, moduleSelection);
  const selectedCount = selected.length;
  const selectedSessions = buildSessionSlotsForModules(
    curriculum,
    moduleSelection,
  ).length;

  return {
    hasSelection: true,
    mode: moduleSelection.mode,
    selectedModules: moduleSelection.selectedModules,
    totalModules,
    selectedCount,
    totalSessions,
    selectedSessions,
    selectedModuleNumbers: selected.map((x) => x.originalIndex + 1),
  };
}

/**
 * ✅ Reschedule a group's NON-completed sessions.
 *
 * Rules:
 *  - completed sessions  → untouched (status, date, link — كل حاجة فاضية)
 *  - scheduled / cancelled / postponed → بيتحدثلهم scheduledDate + startTime + endTime فقط
 *    اللينكات، الـ meetingLinkId، credentials كلها بتفضل زي ما هي.
 *  - مفيش حذف، مفيش إنشاء جديد.
 *  - ✅ قبل أي تعديل فعلي، بيتأكد إن اللينكات المستخدمة حاليًا في سيشنات
 *    الجروب (غير الـ completed) لسه متاحة على الميعاد الجديد.
 *
 * (مفيش تعديل مطلوب هنا للسيشنات الديناميك — الترتيب على moduleIndex/sessionNumber)
 */
export async function rescheduleGroupSessions(
  groupId,
  group,
  newSchedule,
  userId,
  selectedLinkIds = [], // محتفظين بالـ signature بس مش بنستخدمه
) {
  const Session = (await import("../app/models/Session")).default;
  const Group = (await import("../app/models/Group")).default;

  console.log(
    `\n🔄 ========== RESCHEDULING GROUP SESSIONS (DATE-ONLY UPDATE) ==========`,
  );
  console.log(`Group ID: ${groupId}`);

  const { effectiveFrom, daysOfWeek, timeFrom, timeTo, timezone } = newSchedule;

  if (!effectiveFrom || !daysOfWeek?.length || daysOfWeek.length > 3) {
    throw new Error(
      "Invalid schedule: effectiveFrom and 1-3 daysOfWeek are required",
    );
  }

  const scheduleValidation = validateScheduleDays(effectiveFrom, daysOfWeek);
  if (!scheduleValidation.valid) throw new Error(scheduleValidation.error);

  const uniqueDays = [...new Set(daysOfWeek)];
  if (uniqueDays.length !== daysOfWeek.length) {
    throw new Error("Duplicate days are not allowed");
  }

  const course = group.courseId;
  if (!course?.curriculum?.length)
    throw new Error("Course curriculum not found");

  // ── 0. ✅ فحص تعارض اللينكات المستخدمة مع الميعاد الجديد ──────────────────
  console.log(`\n🔗 Checking meeting link conflicts for new schedule...`);
  const { checkLinksForRescheduledSchedule } = await import(
    "./checkMeetingLinks"
  );
  const linkCheck = await checkLinksForRescheduledSchedule(groupId, {
    daysOfWeek,
    timeFrom,
    timeTo,
  });

  if (linkCheck.hasConflicts) {
    console.log(`❌ Link conflicts found: ${linkCheck.conflicts.length}`);
    linkCheck.conflicts.forEach((c) => {
      console.log(
        `   - ${c.linkName}: conflicts with group ${c.conflictingGroupId} (${c.conflictingDays?.join(", ")} ${c.conflictingTime || ""})`,
      );
    });
    const error = new Error(
      "فيه لينكات مستخدمة هتتعارض مع جروب تاني في الميعاد الجديد",
    );
    error.code = "LINK_CONFLICT";
    error.linkConflicts = linkCheck.conflicts;
    throw error;
  }
  console.log(`✅ No link conflicts found`);

  // ── 1. جلب كل السيشن الموجودة ──────────────────────────────────────────────
  const allSessions = await Session.find({
    groupId,
    isDeleted: false,
  }).sort({ moduleIndex: 1, sessionNumber: 1 });

  const completedSessions = allSessions.filter((s) => s.status === "completed");
  const toReschedule = allSessions.filter((s) => s.status !== "completed");

  console.log(`📊 Existing sessions: ${allSessions.length}`);
  console.log(`  ✅ Completed (frozen): ${completedSessions.length}`);
  console.log(`  🔄 To reschedule:      ${toReschedule.length}`);

  if (toReschedule.length === 0) {
    return {
      success: true,
      message: "No sessions to reschedule — all sessions are completed",
      regenerated: 0,
      frozen: completedSessions.length,
      linksReleased: 0,
    };
  }

  // ── 2. بناء التواريخ الجديدة بنفس ترتيب الـ moduleIndex/sessionNumber ──────
  const newDates = createFlexibleWeeklySchedule(
    effectiveFrom,
    daysOfWeek,
    toReschedule.length,
  );

  console.log(
    `📅 Generated ${newDates.length} new dates starting ${effectiveFrom}`,
  );

  // ── 3. Update كل سيشن بتاريخها الجديد + الوقت الجديد ──────────────────────
  const bulkOps = toReschedule.map((session, i) => ({
    updateOne: {
      filter: { _id: session._id },
      update: {
        $set: {
          scheduledDate: newDates[i],
          startTime: timeFrom,
          endTime: timeTo,
          "metadata.updatedAt": new Date(),
          "metadata.lastModifiedBy": userId,
          ...(session.status !== "scheduled" ? { status: "scheduled" } : {}),
        },
      },
    },
  }));

  const bulkResult = await Session.bulkWrite(bulkOps);
  console.log(
    `✅ Updated ${bulkResult.modifiedCount} session(s) with new dates`,
  );

  // ── 4. تحديث الـ Group schedule ───────────────────────────────────────────
  await Group.findByIdAndUpdate(groupId, {
    $set: {
      "schedule.daysOfWeek": daysOfWeek,
      "schedule.timeFrom": timeFrom,
      "schedule.timeTo": timeTo,
      ...(timezone ? { "schedule.timezone": timezone } : {}),
      "metadata.lastModifiedBy": userId,
      "metadata.updatedAt": new Date(),
      "metadata.lastReschedule": {
        date: new Date(),
        effectiveFrom: new Date(effectiveFrom),
        sessionsRescheduled: bulkResult.modifiedCount,
        sessionsFrozen: completedSessions.length,
        userId,
      },
    },
  });

  // ── 5. ✅ تحديث reservations[] على اللينكات المستخدمة ─────────────────────
  const MeetingLinkModel = (await import("../app/models/MeetingLink")).default;
  const usedLinkIds = [
    ...new Set(
      toReschedule
        .filter((s) => s.meetingLinkId)
        .map((s) => s.meetingLinkId.toString()),
    ),
  ];

  if (usedLinkIds.length > 0) {
    await MeetingLinkModel.updateMany(
      {
        _id: { $in: usedLinkIds },
        "reservations.groupId": new mongoose.Types.ObjectId(groupId),
      },
      {
        $set: {
          "reservations.$[elem].daysOfWeek": daysOfWeek,
          "reservations.$[elem].timeFrom": timeFrom,
          "reservations.$[elem].timeTo": timeTo,
          "metadata.updatedAt": new Date(),
        },
      },
      {
        arrayFilters: [
          { "elem.groupId": new mongoose.Types.ObjectId(groupId) },
        ],
      },
    );
    console.log(`🔗 Updated reservation schedule on ${usedLinkIds.length} link(s)`);
  }

  // ── 6. إعداد بيانات الإرجاع ───────────────────────────────────────────────
  const updatedSessions = await Session.find({
    _id: { $in: toReschedule.map((s) => s._id) },
    isDeleted: false,
  })
    .sort({ scheduledDate: 1 })
    .lean();

  const startDate = updatedSessions[0]?.scheduledDate;
  const endDate = updatedSessions[updatedSessions.length - 1]?.scheduledDate;

  console.log(`  Start: ${startDate?.toISOString().split("T")[0]}`);
  console.log(`  End:   ${endDate?.toISOString().split("T")[0]}`);
  console.log(`========================================\n`);

  return {
    success: true,
    message: `Rescheduled ${bulkResult.modifiedCount} session(s); ${completedSessions.length} completed session(s) left untouched`,
    regenerated: bulkResult.modifiedCount,
    frozen: completedSessions.length,
    linksReleased: 0,
    startDate,
    endDate,
    sessions: updatedSessions,
  };
}

/**
 * ✅ Resync a group's module selection (add/remove modules) without
 * touching completed sessions or the ones staying in place.
 *
 * ✅ ديناميك: السيشنات لكل موديول من دروسه الفعلية (مش 1/2/3 ثابتة).
 *
 * ✅ ترتيب التواريخ: بنبني القايمة الكاملة المرتبة (المكتملة + المتبقية)،
 *    ونحسب تواريخ كل المواقع من startDate، والسيشنات المتبقية بتاخد تاريخ
 *    "مكانها" في التسلسل الكامل — عشان ماتتكررش تواريخ السيشنات المكتملة.
 *
 * options.linkAssignmentMode: "first_available" (default) | "round_robin"
 */
export async function resyncGroupModuleSessions(
  groupId,
  group,
  newModuleSelection,
  userId,
  selectedLinkIds = [],
  linkAssignmentMode = LINK_ASSIGNMENT_MODES.FIRST_AVAILABLE,
) {
  const Session = (await import("../app/models/Session")).default;
  const Group = (await import("../app/models/Group")).default;

  console.log(
    `\n🔁 ========== RESYNCING GROUP MODULE SELECTION (v3 dynamic) ==========`,
  );
  console.log(`Group ID: ${groupId} | Link mode: ${linkAssignmentMode}`);

  if (!group.sessionsGenerated) {
    throw new Error(
      "الجروب لسه معندوش سيشنز متولدة — استخدم التوليد العادي الأول",
    );
  }

  const course = group.courseId;
  if (!course?.curriculum?.length)
    throw new Error("Course curriculum not found");

  const { startDate, daysOfWeek, timeFrom, timeTo } = group.schedule;
  if (!daysOfWeek?.length) throw new Error("جدول الجروب ناقصه أيام");
  if (!startDate) throw new Error("جدول الجروب ناقصه تاريخ البداية");

  const groupDeliveryMode =
    group.deliveryMode === "offline" ? "offline" : "online";

  // ── كل السلوتات المطلوبة بالترتيب الصحيح (module ↑ ثم sessionNumber ↑) ──
  const targetSlots = buildSessionSlotsForModules(
    course.curriculum,
    newModuleSelection,
  );

  if (targetSlots.length === 0) {
    throw new Error("لازم تختار موديول واحد على الأقل (فيه دروس)");
  }

  // ── كل السيشنز الحالية ─────────────────────────────────────────────────
  const allSessions = await Session.find({ groupId, isDeleted: false });

  const completedSessions = allSessions.filter((s) => s.status === "completed");
  const nonCompletedSessions = allSessions.filter(
    (s) => s.status !== "completed",
  );

  // ✅ (moduleIndex-sessionNumber) لأي سيشن مكتملة — ثابتة للأبد
  const completedKeys = new Set(
    completedSessions.map((s) => `${s.moduleIndex}-${s.sessionNumber}`),
  );

  const nonCompletedByKey = new Map();
  nonCompletedSessions.forEach((s) => {
    nonCompletedByKey.set(`${s.moduleIndex}-${s.sessionNumber}`, s);
  });

  // ── تواريخ كل المواقع في التسلسل الكامل (المكتملة + المتبقية) ──────────
  const allDates = createFlexibleWeeklySchedule(
    startDate,
    daysOfWeek,
    targetSlots.length,
  );

  // ── السلوتات المطلوبة (غير المكتملة) — كل واحدة بتاخد تاريخ مكانها ──────
  const requiredSlots = [];
  targetSlots.forEach((slot, position) => {
    const key = `${slot.moduleIndex}-${slot.sessionNumber}`;
    if (completedKeys.has(key)) return; // ✅ مكتملة بالفعل — متتلمسش

    requiredSlots.push({
      moduleIndex: slot.moduleIndex,
      sessionNumber: slot.sessionNumber,
      lessonIndexes: slot.lessonIndexes,
      module: slot.module,
      date: allDates[position],
      existing: nonCompletedByKey.get(key) || null,
    });
  });

  const requiredKeys = new Set(
    requiredSlots.map((s) => `${s.moduleIndex}-${s.sessionNumber}`),
  );

  // ── سيشنز غير مكتملة موجودة دلوقتي بس موديولها/سيشنها اتشال ─────────────
  const sessionsToRemove = nonCompletedSessions.filter(
    (s) => !requiredKeys.has(`${s.moduleIndex}-${s.sessionNumber}`),
  );

  console.log(
    `📊 Completed: ${completedSessions.length} | Required slots: ${requiredSlots.length} | To remove: ${sessionsToRemove.length}`,
  );

  // ── فك حجز لينكات السيشنز اللي هتتشال فعلاً ────────────────────────────
  for (const s of sessionsToRemove) {
    if (s.meetingLinkId) {
      try {
        await releaseMeetingLink(s._id);
      } catch (e) {
        console.error("⚠️ release link failed:", e.message);
      }
    }
  }

  if (sessionsToRemove.length > 0) {
    await Session.updateMany(
      { _id: { $in: sessionsToRemove.map((s) => s._id) } },
      { $set: { isDeleted: true, deletedAt: new Date(), status: "cancelled" } },
    );
  }

  // ── لينكات مرشحة للسلوتات الجديدة تمامًا ──────────────────────────────
  const sessionsToRemoveIds = new Set(
    sessionsToRemove.map((s) => s._id.toString()),
  );

  let allAvailableLinks = [];
  if (selectedLinkIds.length > 0) {
    allAvailableLinks = await MeetingLink.find({
      _id: { $in: selectedLinkIds },
      isDeleted: false,
    }).lean();
    allAvailableLinks.sort(
      (a, b) =>
        selectedLinkIds.indexOf(a._id.toString()) -
        selectedLinkIds.indexOf(b._id.toString()),
    );
  } else {
    const usedLinkIds = [
      ...new Set(
        allSessions
          .filter(
            (s) =>
              s.meetingLinkId && !sessionsToRemoveIds.has(s._id.toString()),
          )
          .map((s) => s.meetingLinkId.toString()),
      ),
    ];

    if (usedLinkIds.length > 0) {
      allAvailableLinks = await MeetingLink.find({
        _id: { $in: usedLinkIds },
        isDeleted: false,
      }).lean();
      allAvailableLinks.sort(
        (a, b) =>
          usedLinkIds.indexOf(a._id.toString()) -
          usedLinkIds.indexOf(b._id.toString()),
      );
      console.log(
        `📋 مفيش لينكات محددة — بنعيد استخدام ${allAvailableLinks.length} لينك مستخدم بالفعل في الجروب`,
      );
    } else {
      console.log(
        `📋 مفيش لينكات محددة ولا لينكات مستخدمة بالفعل في الجروب — السلوتات الجديدة هتتعمل من غير لينك`,
      );
    }
  }

  // ── بناء السلوتات: تحديث الموجود + سيشنز جديدة من غير لينك لسه ──────────
  const bulkUpdateExisting = [];
  const newSlotBases = [];

  requiredSlots.forEach((slot) => {
    const firstLesson = slot.module.lessons[slot.lessonIndexes[0]];
    const lessonTitle = firstLesson?.title?.trim() || "";
    const title = `Session ${slot.sessionNumber}: ${lessonTitle}`;
    const description = firstLesson?.description || "";

    if (slot.existing) {
      // ✅ سيشن موجودة بالفعل لنفس (module, sessionNumber) — نحدّث بس تاريخها/
      // وقتها/عنوانها/دروسها، ومنلمسش اللينك ولا الـ _id بتاعها خالص
      bulkUpdateExisting.push({
        updateOne: {
          filter: { _id: slot.existing._id },
          update: {
            $set: {
              scheduledDate: slot.date,
              startTime: timeFrom,
              endTime: timeTo,
              title,
              description,
              lessonIndexes: slot.lessonIndexes,
              status: "scheduled",
              "metadata.updatedAt": new Date(),
              "metadata.lastModifiedBy": userId,
            },
          },
        },
      });
      return;
    }

    // ✅ سلوت جديد تمامًا — لسه من غير لينك
    newSlotBases.push({
      _id: new mongoose.Types.ObjectId(),
      groupId: group._id,
      courseId: course._id,
      moduleIndex: slot.moduleIndex,
      sessionNumber: slot.sessionNumber,
      lessonIndexes: slot.lessonIndexes,
      title,
      description,
      scheduledDate: slot.date,
      startTime: timeFrom,
      endTime: timeTo,
      status: "scheduled",
      attendanceTaken: false,
      attendance: [],
      deliveryMode: groupDeliveryMode,
      isComplimentary: false,
      automationEvents: {
        reminderSent: false,
        absentNotificationsSent: false,
        postponeNotificationSent: false,
        cancelNotificationSent: false,
        meetingLinkAssigned: false,
      },
      metadata: {
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      isDeleted: false,
    });
  });

  // ── ✅ توزيع اللينكات على السلوتات الجديدة ───────────────────────────────
  let newSessionsToInsert = newSlotBases;

  if (newSlotBases.length > 0 && allAvailableLinks.length > 0) {
    const { sessions: assignedNewSlots } = await assignLinksToSessions(
      newSlotBases,
      allAvailableLinks,
      {
        mode: linkAssignmentMode,
        schedule: { daysOfWeek, timeFrom, timeTo },
        groupId: group._id,
      },
    );
    newSessionsToInsert = assignedNewSlots;
  }

  if (bulkUpdateExisting.length > 0) {
    await Session.bulkWrite(bulkUpdateExisting);
  }

  const newLinksAssigned = newSessionsToInsert.filter((s) => s.meetingLinkId);

  if (newSessionsToInsert.length > 0) {
    await Session.insertMany(newSessionsToInsert);

    if (newLinksAssigned.length > 0) {
      await persistLinkReservations(newLinksAssigned, group, userId);
    }
  }

  // ── تحديث بيانات الجروب ──────────────────────────────────────────────────
  const finalCount = await Session.countDocuments({
    groupId,
    isDeleted: false,
  });

  await Group.findByIdAndUpdate(groupId, {
    $set: {
      moduleSelection: newModuleSelection,
      totalSessionsCount: finalCount,
      "metadata.lastModifiedBy": userId,
      "metadata.updatedAt": new Date(),
    },
  });

  const linksReleased = sessionsToRemove.filter((s) => s.meetingLinkId).length;

  console.log(
    `✅ Resync done: required=${requiredSlots.length} (kept-in-place=${bulkUpdateExisting.length}, new=${newSessionsToInsert.length}), removed=${sessionsToRemove.length} (links released=${linksReleased}), completed untouched=${completedSessions.length}`,
  );
  console.log(`========================================\n`);

  return {
    success: true,
    message: `تمت المزامنة: ${requiredSlots.length} سيشن بالترتيب الصحيح، اتشال ${sessionsToRemove.length}، اللينكات المرتبطة اتنقلت زي ما هي`,
    totalRequired: requiredSlots.length,
    keptInPlaceCount: bulkUpdateExisting.length,
    addedCount: newSessionsToInsert.length,
    removedCount: sessionsToRemove.length,
    completedCount: completedSessions.length,
    linksReleased,
    meetingLinks: {
      assigned: newLinksAssigned.length,
      mode: linkAssignmentMode,
      linksUsed: [
        ...new Set(newLinksAssigned.map((s) => s.meetingLinkId.toString())),
      ],
    },
  };
}