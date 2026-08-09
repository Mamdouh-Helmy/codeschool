// utils/sessionGenerator.js
import mongoose from "mongoose";
import MeetingLink from "../app/models/MeetingLink.js";

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
 */
export function calculateTotalSessions(
  curriculum,
  moduleSelection = { mode: "all", selectedModules: [] },
) {
  if (!curriculum || !Array.isArray(curriculum) || curriculum.length === 0) {
    console.log("⚠️ No curriculum provided or empty array");
    return 0;
  }

  let total = 0;

  if (moduleSelection.mode === "all") {
    curriculum.forEach((module) => {
      if (
        module.lessons &&
        Array.isArray(module.lessons) &&
        module.lessons.length > 0
      ) {
        total += module.totalSessions || 3;
      }
    });
    console.log(
      `📊 All modules: ${curriculum.length} modules, ${total} total sessions`,
    );
  } else {
    moduleSelection.selectedModules.forEach((moduleIndex) => {
      const module = curriculum[moduleIndex];
      if (
        module &&
        module.lessons &&
        Array.isArray(module.lessons) &&
        module.lessons.length > 0
      ) {
        total += module.totalSessions || 3;
      }
    });
    console.log(
      `📊 Selected modules: ${moduleSelection.selectedModules.length} modules, ${total} total sessions`,
    );
  }

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

  const summary = {
    totalModules: curriculum.length,
    totalLessons: 0,
    totalSessions: 0,
    modules: [],
    selectedModules: moduleSelection,
  };

  curriculum.forEach((module, idx) => {
    const lessonsCount = module.lessons?.length || 0;
    const sessionsCount = module.totalSessions || 3;

    summary.totalLessons += lessonsCount;

    if (
      moduleSelection.mode === "all" ||
      moduleSelection.selectedModules.includes(idx)
    ) {
      summary.totalSessions += sessionsCount;
    }

    summary.modules.push({
      index: idx,
      title: module.title,
      lessonsCount,
      sessionsCount,
      isSelected:
        moduleSelection.mode === "all" ||
        moduleSelection.selectedModules.includes(idx),
      distribution: "Lessons 1-2→S1, 3-4→S2, 5-6→S3",
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
 */
function createFlexibleWeeklySchedule(baseDate, scheduleDays, totalSessions) {
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

  console.log(`📅 Creating flexible schedule:`);
  console.log(`  Total sessions needed: ${totalSessions}`);
  console.log(`  Days per week: ${daysPerWeek}`);
  console.log(`  Schedule days: ${scheduleDays} → ${dayNumbers}`);

  // startDate IS already the first selected day — use it directly
  const adjustedStartDate = new Date(startDate);

  console.log(
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

    if (sessionIndex < 10 || sessionIndex >= totalSessions - 5) {
      console.log(
        `  Session ${sessionIndex + 1}: ${sessionDate.toISOString().split("T")[0]} (${getDayName(sessionDate.getDay())})`,
      );
    } else if (sessionIndex === 10) {
      console.log(`  ... (${totalSessions - 15} sessions omitted) ...`);
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
 * ✅ يسجل currentReservation فعليًا على كل لينك اتحط على سيشنات الجروب —
 * من غير الخطوة دي اللينك بيفضل "available" في الداتابيز حتى لو مستخدم
 * فعلاً، وأي جروب تاني هيقدر ياخده على نفس الميعاد من غير ما يتحذّر.
 *
 * الحجز بيمثّل النمط الأسبوعي المتكرر بتاع الجروب (daysOfWeek + timeFrom/
 * timeTo) — مش سيشن واحدة بعينها — فبيتسجل مرة واحدة لكل لينك مستخدم
 * (مش لكل سيشن على حدة). startTime/endTime المحفوظين للعرض بس (أول
 * سيشن → آخر سيشن)؛ الفحص الفعلي بيعتمد على daysOfWeek/timeFrom/timeTo.
 *
 * @param {Array}  sessionsWithLinks - سيشنات (فيها meetingLinkId + scheduledDate + _id)
 * @param {Object} group             - الجروب (فيه schedule.daysOfWeek/timeFrom/timeTo)
 * @param {String} userId
 */
async function persistLinkReservations(sessionsWithLinks, group, userId) {
  const { daysOfWeek, timeFrom, timeTo } = group.schedule;

  const byLink = new Map();

  for (const session of sessionsWithLinks) {
    if (!session.meetingLinkId) continue;
    const key = session.meetingLinkId.toString();
    const existing = byLink.get(key);

    if (!existing) {
      byLink.set(key, {
        minDate: session.scheduledDate,
        maxDate: session.scheduledDate,
        lastSessionId: session._id,
      });
    } else {
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

      await link.reserveForSession(
        entry.lastSessionId,
        group._id,
        startTime,
        endTime,
        userId,
        { daysOfWeek, timeFrom, timeTo },
      );

      console.log(`🔗 Reservation persisted on link ${link.name} for group ${group._id}`);
    } catch (error) {
      console.error(`⚠️ Failed to persist reservation for link ${linkId}:`, error.message);
    }
  }
}

/**
 * ✅ Generate sessions based on module selection
 */
export async function generateSessionsForGroup(
  groupId,
  group,
  userId,
  selectedLinkIds = [],
) {
  try {
    console.log(
      `\n🔄 ========== GENERATING SESSIONS (WITH MODULE SELECTION) ==========`,
    );
    console.log(`Group ID: ${groupId}`);
    console.log(`Group Name: ${group.name}`);
    console.log(`Group Status: ${group.status}`);
    console.log(
      `🔗 Selected Link IDs: ${selectedLinkIds.length > 0 ? selectedLinkIds.join(", ") : "none (no links)"}`,
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
    if (!course || !course.curriculum || course.curriculum.length === 0) {
      throw new Error("Course curriculum not found");
    }

    const moduleSelection = group.moduleSelection || {
      mode: "all",
      selectedModules: [],
    };
    console.log(`📋 Module Selection Mode: ${moduleSelection.mode}`);

    if (moduleSelection.mode === "specific") {
      console.log(
        `  Selected Modules: ${moduleSelection.selectedModules.map((i) => i + 1).join(", ")}`,
      );
    }

    let modulesToGenerate = [];
    if (moduleSelection.mode === "all") {
      modulesToGenerate = course.curriculum;
      console.log(
        `📚 Generating sessions for ALL ${modulesToGenerate.length} modules`,
      );
    } else {
      modulesToGenerate = moduleSelection.selectedModules
        .map((idx) => course.curriculum[idx])
        .filter((module) => module !== undefined);
      console.log(
        `📚 Generating sessions for ${modulesToGenerate.length} specific modules`,
      );
    }

    if (modulesToGenerate.length === 0)
      throw new Error("No modules selected for session generation");

    const { startDate, daysOfWeek, timeFrom, timeTo } = group.schedule;

    if (!startDate || !daysOfWeek || daysOfWeek.length === 0) {
      throw new Error(
        "Invalid schedule: Must have start date and at least 1 selected day",
      );
    }

    console.log("📅 Schedule configuration:", {
      startDate: new Date(startDate).toISOString().split("T")[0],
      daysOfWeek,
      daysPerWeek: daysOfWeek.length,
      timeFrom,
      timeTo,
    });

    const scheduleValidation = validateScheduleDays(startDate, daysOfWeek);
    if (!scheduleValidation.valid) throw new Error(scheduleValidation.error);

    console.log(
      `✅ Schedule validated. Start day: ${scheduleValidation.startDayName}, Days per week: ${scheduleValidation.daysCount}`,
    );

    let totalSessions = 0;
    modulesToGenerate.forEach((module) => {
      totalSessions += module.totalSessions || 3;
    });
    console.log(`📊 Total sessions to generate: ${totalSessions}`);

    const sessionDates = createFlexibleWeeklySchedule(
      startDate,
      daysOfWeek,
      totalSessions,
    );
    if (sessionDates.length === 0)
      throw new Error("Failed to create session dates");
    console.log(`\n📊 Generated ${sessionDates.length} session dates`);

    // ── Build session objects ─────────────────────────────────────────────
    const sessions = [];
    let sessionIndex = 0;

    for (let moduleIdx = 0; moduleIdx < modulesToGenerate.length; moduleIdx++) {
      const originalModuleIndex =
        moduleSelection.mode === "all"
          ? moduleIdx
          : moduleSelection.selectedModules[moduleIdx];

      const module = modulesToGenerate[moduleIdx];
      console.log(
        `\n📖 Processing Module ${originalModuleIndex + 1}: ${module.title}`,
      );

      if (!module.lessons || module.lessons.length !== 6) {
        console.warn(
          `⚠️ Module ${originalModuleIndex + 1} must have exactly 6 lessons (has ${module.lessons?.length || 0})`,
        );
        continue;
      }

      const sessionGroups = [
        {
          sessionNumber: 1,
          lessonIndexes: [0, 1],
          lessonNumbers: "1-2",
          lessons: [module.lessons[0], module.lessons[1]],
        },
        {
          sessionNumber: 2,
          lessonIndexes: [2, 3],
          lessonNumbers: "3-4",
          lessons: [module.lessons[2], module.lessons[3]],
        },
        {
          sessionNumber: 3,
          lessonIndexes: [4, 5],
          lessonNumbers: "5-6",
          lessons: [module.lessons[4], module.lessons[5]],
        },
      ];

      for (const sessionGroup of sessionGroups) {
        if (sessionIndex >= sessionDates.length) {
          console.error(
            `❌ Ran out of session dates at session ${sessionIndex + 1}`,
          );
          break;
        }

        const scheduledDate = sessionDates[sessionIndex];

        // ✅ FIX: لو الـ lessons بنفس الاسم اعرضه مرة واحدة بس
        const uniqueLessonTitles = sessionGroup.lessons?.[0]?.title?.trim()
          ? [sessionGroup.lessons[0].title.trim()]
          : [];

        const lessonTitles = uniqueLessonTitles;
        const sessionTitle = `Session ${sessionGroup.sessionNumber}: ${lessonTitles}`;

        // ✅ بناء الـ description من محتوى الـ lessons الفعلي
        const sessionDescription = sessionGroup.lessons[0]?.description || "";

        sessions.push({
          _id: new mongoose.Types.ObjectId(),
          groupId: group._id,
          courseId: course._id,
          moduleIndex: originalModuleIndex,
          sessionNumber: sessionGroup.sessionNumber,
          lessonIndexes: sessionGroup.lessonIndexes,
          title: sessionTitle,
          description: sessionDescription,
          scheduledDate,
          startTime: timeFrom,
          endTime: timeTo,
          status: "scheduled",
          attendanceTaken: false,
          attendance: [],
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

        sessionIndex++;

        console.log(
          `  ✅ Session ${sessionGroup.sessionNumber} (Lessons ${sessionGroup.lessonNumbers})`,
        );
        console.log(
          `    📅 ${scheduledDate.toISOString().split("T")[0]} (${getDayName(scheduledDate.getDay())})`,
        );
        console.log(`    🕐 ${timeFrom} - ${timeTo}`);
        console.log(`    📚 ${lessonTitles}`);
      }

      console.log(
        `  📊 Created 3 sessions for module ${originalModuleIndex + 1}`,
      );
    }

    // ── ✅ Assign meeting links (modulo distribution) ───────────────────────
    console.log(`\n🔗 Assigning meeting links to sessions...`);

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

      console.log(
        `📋 Using ${allAvailableLinks.length} user-selected meeting links`,
      );
    } else {
      console.log(`📋 No links selected — sessions will have no meeting links`);
    }

    // ✅ فحص تعارض: اللينكات المختارة لازم تكون فاضية فعليًا على جدول
    // الجروب الجديد (أيام + وقت) — مش بس "status: available" شكليًا.
    // من غير الفحص ده، اللينك ممكن يتحط على سيشنات الجروب ده وهو فعليًا
    // متحجز لجروب تاني في نفس الميعاد.
    if (allAvailableLinks.length > 0) {
      const { checkLinksConflictForSchedule } = await import("./checkMeetingLinks");
      const linkIdsToCheck = allAvailableLinks.map((l) => l._id.toString());
      const conflictCheck = await checkLinksConflictForSchedule(
        linkIdsToCheck,
        { daysOfWeek, timeFrom, timeTo },
        group._id,
      );

      if (conflictCheck.hasConflicts) {
        console.log(`❌ Link conflicts found: ${conflictCheck.conflicts.length}`);
        conflictCheck.conflicts.forEach((c) => {
          console.log(`   - ${c.linkName}: conflicts with group ${c.conflictingGroupId} (${c.conflictingDays?.join(", ")} ${c.conflictingTime || ""})`);
        });
        const error = new Error("اللينكات المختارة متعارضة مع جروب تاني في نفس الميعاد");
        error.code = "LINK_CONFLICT";
        error.linkConflicts = conflictCheck.conflicts;
        throw error;
      }
      console.log(`✅ No link conflicts found for selected links`);
    }

    const sessionsWithLinks = [];
    let linksAssigned = 0;
    let linksFailed = 0;

    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];

      if (allAvailableLinks.length === 0) {
        sessionsWithLinks.push(session);
        linksFailed++;
        continue;
      }

      const link = allAvailableLinks[i % allAvailableLinks.length];

      sessionsWithLinks.push({
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
      });

      linksAssigned++;
    }

    console.log(`\n🔗 Meeting Link Assignment Summary:`);
    console.log(`  Total Sessions:  ${sessions.length}`);
    console.log(`  Links Assigned:  ${linksAssigned}`);
    console.log(`  Links Failed:    ${linksFailed}`);

    // ✅ نسجل الحجز الفعلي على الـ MeetingLink documents نفسها — من غير
    // الخطوة دي اللينكات هتفضل "available" في الداتابيز حتى لو مستخدمة.
    if (linksAssigned > 0) {
      await persistLinkReservations(sessionsWithLinks, group, userId);
    }

    // ── Day distribution analysis ─────────────────────────────────────────
    const dayDistribution = {};
    const dateSet = new Set();

    sessionsWithLinks.forEach((session) => {
      const dayName = getDayName(new Date(session.scheduledDate).getDay());
      const dateStr = session.scheduledDate.toISOString().split("T")[0];
      dayDistribution[dayName] = (dayDistribution[dayName] || 0) + 1;
      dateSet.add(dateStr);
    });

    console.log(`\n📅 Session Distribution by Day:`);
    Object.entries(dayDistribution).forEach(([day, count]) => {
      console.log(`  ${day}: ${count} session(s)`);
    });
    console.log(`\n📅 Unique Dates Used: ${dateSet.size}`);

    if (sessionsWithLinks.length > 0) {
      console.log(
        `  Start Date: ${sessionsWithLinks[0].scheduledDate.toISOString().split("T")[0]}`,
      );
      console.log(
        `  End Date:   ${sessionsWithLinks[sessionsWithLinks.length - 1].scheduledDate.toISOString().split("T")[0]}`,
      );
    }

    console.log(`\n✅ Session Generation Completed Successfully!`);
    console.log(`========================================\n`);

    return {
      success: true,
      sessions: sessionsWithLinks,
      totalGenerated: sessionsWithLinks.length,
      startDate: sessionsWithLinks[0]?.scheduledDate,
      endDate: sessionsWithLinks[sessionsWithLinks.length - 1]?.scheduledDate,
      distribution: dayDistribution,
      uniqueDates: Array.from(dateSet).sort(),
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
        modulesProcessed: modulesToGenerate.length,
      },
      meetingLinks: {
        assigned: linksAssigned,
        failed: linksFailed,
        total: sessionsWithLinks.length,
      },
    };
  } catch (error) {
    console.error("❌ Error generating sessions:", error);
    throw error;
  }
}

/**
 * ✅ Release meeting link when session is completed/cancelled
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

    const sessionStart = new Date(session.scheduledDate);
    const [startHours, startMinutes] = session.startTime.split(":").map(Number);
    sessionStart.setHours(startHours, startMinutes, 0, 0);

    const sessionEnd = new Date(session.scheduledDate);
    const [endHours, endMinutes] = session.endTime.split(":").map(Number);
    sessionEnd.setHours(endHours, endMinutes, 0, 0);

    const actualDuration = (sessionEnd - sessionStart) / (1000 * 60);

    const result = await meetingLink.releaseLink(actualDuration);

    console.log(`✅ Released meeting link for session: ${sessionId}`);

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
 * — بدل التاريخ/الوقت المطلق. بتستخدم findAvailableLinksForSchedule بتاعة
 * الموديل (اللي فعليًا بتقارن على التكرار)، مش findAvailableLinks اللي
 * مش موجودة أصلاً في الموديل.
 *
 * @param {String[]} daysOfWeek
 * @param {String}   timeFrom
 * @param {String}   timeTo
 * @param {String}   [platform]
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
    // نفسها)، مش كل أيام الجروب، عشان مانقفلش اللينك على أيام تانية
    // الجروب بيستخدمها بلينكات مختلفة
    const scheduleInfo = {
      daysOfWeek: [session.dayName],
      timeFrom: session.startTime,
      timeTo: session.endTime,
    };

    // ✅ فحص تعارض دفاعي وقت الحفظ الفعلي — القايمة اللي اتعرضت للأدمن
    // ممكن تكون اتفلترت من شوية، فبنتأكد تاني قبل ما نحجز فعليًا
    const { checkLinksConflictForSchedule } = await import("./checkMeetingLinks");
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
 * ✅ Get module selection summary
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
  const totalSessions = curriculum.reduce(
    (sum, m) => sum + (m.totalSessions || 3),
    0,
  );

  let selectedCount = 0;
  let selectedSessions = 0;

  if (moduleSelection.mode === "all") {
    selectedCount = totalModules;
    selectedSessions = totalSessions;
  } else {
    selectedCount = moduleSelection.selectedModules.length;
    selectedSessions = moduleSelection.selectedModules.reduce(
      (sum, idx) => sum + (curriculum[idx]?.totalSessions || 3),
      0,
    );
  }

  return {
    hasSelection: true,
    mode: moduleSelection.mode,
    selectedModules: moduleSelection.selectedModules,
    totalModules,
    selectedCount,
    totalSessions,
    selectedSessions,
    selectedModuleNumbers: moduleSelection.selectedModules.map((i) => i + 1),
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
 *    الجروب (غير الـ completed) لسه متاحة على الميعاد الجديد (أيام + وقت) —
 *    لو أي لينك منهم متعارض مع حجز لجروب تاني، بيرمي error ويوقف قبل ما
 *    يلمس أي بيانات.
 *
 * @param {String}   groupId
 * @param {Object}   group          - populated (needs courseId.curriculum)
 * @param {Object}   newSchedule    - { effectiveFrom, daysOfWeek, timeFrom, timeTo, timezone? }
 * @param {String}   userId
 * @param {String[]} selectedLinkIds - ignored هنا (اللينكات بتفضل زي ما هي)
 */
export async function rescheduleGroupSessions(
  groupId,
  group,
  newSchedule,
  userId,
  selectedLinkIds = [],   // محتفظين بالـ signature بس مش بنستخدمه
) {
  const Session = (await import("../app/models/Session")).default;
  const Group   = (await import("../app/models/Group")).default;

  console.log(`\n🔄 ========== RESCHEDULING GROUP SESSIONS (DATE-ONLY UPDATE) ==========`);
  console.log(`Group ID: ${groupId}`);

  const { effectiveFrom, daysOfWeek, timeFrom, timeTo, timezone } = newSchedule;

  if (!effectiveFrom || !daysOfWeek?.length || daysOfWeek.length > 3) {
    throw new Error("Invalid schedule: effectiveFrom and 1-3 daysOfWeek are required");
  }

  // نفس فلسفة validateScheduleDays — effectiveFrom لازم يوافق أول يوم في daysOfWeek
  const scheduleValidation = validateScheduleDays(effectiveFrom, daysOfWeek);
  if (!scheduleValidation.valid) throw new Error(scheduleValidation.error);

  const uniqueDays = [...new Set(daysOfWeek)];
  if (uniqueDays.length !== daysOfWeek.length) {
    throw new Error("Duplicate days are not allowed");
  }

  const course = group.courseId;
  if (!course?.curriculum?.length) throw new Error("Course curriculum not found");

  // ── 0. ✅ فحص تعارض اللينكات المستخدمة مع الميعاد الجديد ──────────────────
  console.log(`\n🔗 Checking meeting link conflicts for new schedule...`);
  const { checkLinksForRescheduledSchedule } = await import("./checkMeetingLinks");
  const linkCheck = await checkLinksForRescheduledSchedule(groupId, {
    daysOfWeek,
    timeFrom,
    timeTo,
  });

  if (linkCheck.hasConflicts) {
    console.log(`❌ Link conflicts found: ${linkCheck.conflicts.length}`);
    linkCheck.conflicts.forEach((c) => {
      console.log(`   - ${c.linkName}: conflicts with group ${c.conflictingGroupId} (${c.conflictingDays?.join(", ")} ${c.conflictingTime || ""})`);
    });
    const error = new Error("فيه لينكات مستخدمة هتتعارض مع جروب تاني في الميعاد الجديد");
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
  const toReschedule      = allSessions.filter((s) => s.status !== "completed");

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
  // ترتيب toReschedule بالفعل { moduleIndex ASC, sessionNumber ASC }
  const newDates = createFlexibleWeeklySchedule(
    effectiveFrom,
    daysOfWeek,
    toReschedule.length,
  );

  console.log(`📅 Generated ${newDates.length} new dates starting ${effectiveFrom}`);

  // ── 3. Update كل سيشن بتاريخها الجديد + الوقت الجديد ──────────────────────
  // (اللينكات وباقي الحقول بتفضل زي ما هي تماماً)
  const bulkOps = toReschedule.map((session, i) => ({
    updateOne: {
      filter: { _id: session._id },
      update: {
        $set: {
          scheduledDate:          newDates[i],
          startTime:              timeFrom,
          endTime:                timeTo,
          "metadata.updatedAt":   new Date(),
          "metadata.lastModifiedBy": userId,
          // لو الـ status كان cancelled/postponed نرجعه scheduled
          ...(session.status !== "scheduled" ? { status: "scheduled" } : {}),
        },
      },
    },
  }));

  const bulkResult = await Session.bulkWrite(bulkOps);
  console.log(`✅ Updated ${bulkResult.modifiedCount} session(s) with new dates`);

  // ── 4. تحديث الـ Group schedule ───────────────────────────────────────────
  await Group.findByIdAndUpdate(groupId, {
    $set: {
      "schedule.daysOfWeek":           daysOfWeek,
      "schedule.timeFrom":             timeFrom,
      "schedule.timeTo":               timeTo,
      ...(timezone ? { "schedule.timezone": timezone } : {}),
      "metadata.lastModifiedBy":       userId,
      "metadata.updatedAt":            new Date(),
      "metadata.lastReschedule": {
        date:                 new Date(),
        effectiveFrom:        new Date(effectiveFrom),
        sessionsRescheduled:  bulkResult.modifiedCount,
        sessionsFrozen:       completedSessions.length,
        userId,
      },
    },
  });

  // ── 5. ✅ تحديث currentReservation.daysOfWeek/timeFrom/timeTo على اللينكات
  //    المستخدمة عشان تعكس الجدول الجديد (نفس اللينك لسه بيمثّل نفس السيشنات،
  //    بس بجدول متكرر مختلف دلوقتي) ────────────────────────────────────────
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
        "currentReservation.groupId": new mongoose.Types.ObjectId(groupId),
      },
      {
        $set: {
          "currentReservation.daysOfWeek": daysOfWeek,
          "currentReservation.timeFrom":   timeFrom,
          "currentReservation.timeTo":     timeTo,
          "metadata.updatedAt":            new Date(),
        },
      },
    );
    console.log(`🔗 Updated reservation schedule on ${usedLinkIds.length} link(s)`);
  }

  // ── 6. إعداد بيانات الإرجاع ───────────────────────────────────────────────
  const updatedSessions = await Session.find({
    _id: { $in: toReschedule.map((s) => s._id) },
    isDeleted: false,
  }).sort({ scheduledDate: 1 }).lean();

  const startDate = updatedSessions[0]?.scheduledDate;
  const endDate   = updatedSessions[updatedSessions.length - 1]?.scheduledDate;

  console.log(`  Start: ${startDate?.toISOString().split("T")[0]}`);
  console.log(`  End:   ${endDate?.toISOString().split("T")[0]}`);
  console.log(`========================================\n`);

  return {
    success:      true,
    message:      `Rescheduled ${bulkResult.modifiedCount} session(s); ${completedSessions.length} completed session(s) left untouched`,
    regenerated:  bulkResult.modifiedCount,   // نفس الـ key اللي الـ route بيقرأه
    frozen:       completedSessions.length,
    linksReleased: 0,                          // مفيش release في الـ flow ده
    startDate,
    endDate,
    sessions: updatedSessions,
  };
}

/**
 * ✅ Resync a group's module selection (add/remove modules) without
 * touching completed sessions or the ones staying in place.
 *
 * السبب الأصلي للمشكلة القديمة: زرار "🔄 مزامنة السيشنز" في الفرونت
 * (GroupForm.jsx) بيبعت moduleSelection بس، من غير selectedLinkIds خالص.
 * فكان selectedLinkIds بيوصل هنا دايمًا [] (فاضي)، وبالتالي allAvailableLinks
 * كانت بتفضل فاضية دايمًا — فأي "سلوت جديد تمامًا" (زي موديول 1 لما ترجع
 * تضيفه بعد ما كنت بادئ بموديول 2 بس) كان بياخد سيشن من غير meetingLink خالص.
 *
 * الحل: لو selectedLinkIds مبعتش صراحة، الفانكشن بتجيب اللينكات اللي
 * الجروب أصلًا بيستخدمها في باقي سيشناته (اللي مش هتتشال دلوقتي) وتعيد
 * استخدامها للسلوتات الجديدة، بنفس منطق التوزيع (modulo).
 *
 * ✅ NEW: قبل ما تستخدم أي لينك للسلوتات الجديدة، بتفحص إنه فعلاً فاضي على
 * جدول الجروب (أيام + وقت) — ولو حصل تعارض بترمي error وتوقف قبل أي تعديل.
 * وبعد ما تحجز السلوتات الجديدة فعليًا، بتسجل الحجز على الـ MeetingLink
 * نفسه (زي generateSessionsForGroup بالظبط) عشان يفضل معروف إن اللينك مشغول.
 */
export async function resyncGroupModuleSessions(
  groupId,
  group,
  newModuleSelection,
  userId,
  selectedLinkIds = [],
) {
  const Session = (await import("../app/models/Session")).default;
  const Group = (await import("../app/models/Group")).default;

  console.log(
    `\n🔁 ========== RESYNCING GROUP MODULE SELECTION (v2) ==========`,
  );
  console.log(`Group ID: ${groupId}`);

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

  // ── هدف الموديولات — مرتبة تصاعديًا دايمًا، ده أساس ضمان الترتيب الصحيح ──
  const targetModuleIndexes =
    newModuleSelection.mode === "all"
      ? course.curriculum.map((_, idx) => idx)
      : [...new Set(newModuleSelection.selectedModules || [])].sort(
          (a, b) => a - b,
        );

  if (targetModuleIndexes.length === 0) {
    throw new Error("لازم تختار موديول واحد على الأقل");
  }

  // ── كل السيشنز الحالية ─────────────────────────────────────────────────
  const allSessions = await Session.find({ groupId, isDeleted: false });

  const completedSessions = allSessions.filter((s) => s.status === "completed");
  const nonCompletedSessions = allSessions.filter(
    (s) => s.status !== "completed",
  );

  // ✅ (moduleIndex-sessionNumber) لأي سيشن مكتملة — ثابتة للأبد، بره أي منطق تاني
  const completedKeys = new Set(
    completedSessions.map((s) => `${s.moduleIndex}-${s.sessionNumber}`),
  );

  // ✅ خريطة (moduleIndex-sessionNumber) → السيشن الغير مكتملة الموجودة حاليًا،
  // عشان لو نفس السلوت هيفضل مطلوب، نقدر ننقل لينكها ونحافظ على نفس الـ _id
  const nonCompletedByKey = new Map();
  nonCompletedSessions.forEach((s) => {
    nonCompletedByKey.set(`${s.moduleIndex}-${s.sessionNumber}`, s);
  });

  // ── قائمة السلوتات المطلوبة (غير المكتملة) — بترتيب module ثم sessionNumber ──
  const requiredSlots = [];
  for (const moduleIndex of targetModuleIndexes) {
    const module = course.curriculum[moduleIndex];
    if (!module?.lessons || module.lessons.length !== 6) {
      console.warn(`⚠️ Module ${moduleIndex + 1} skipped — لازم 6 دروس بالظبط`);
      continue;
    }
    for (const sessionNumber of [1, 2, 3]) {
      const key = `${moduleIndex}-${sessionNumber}`;
      if (completedKeys.has(key)) continue; // ✅ مكتملة بالفعل — متتلمسش

      const lessonIndexes =
        sessionNumber === 1 ? [0, 1] : sessionNumber === 2 ? [2, 3] : [4, 5];

      requiredSlots.push({
        moduleIndex,
        sessionNumber,
        lessonIndexes,
        existing: nonCompletedByKey.get(key) || null,
      });
    }
  }

  const requiredKeys = new Set(
    requiredSlots.map((s) => `${s.moduleIndex}-${s.sessionNumber}`),
  );

  // ── سيشنز غير مكتملة موجودة دلوقتي بس موديولها اتشال من الاختيار الجديد ──
  const sessionsToRemove = nonCompletedSessions.filter(
    (s) => !requiredKeys.has(`${s.moduleIndex}-${s.sessionNumber}`),
  );

  console.log(
    `📊 Completed: ${completedSessions.length} | Required slots: ${requiredSlots.length} | To remove: ${sessionsToRemove.length}`,
  );

  // ── تواريخ جديدة لكل الـ requiredSlots سوا — بترتيبها الصحيح، بادئة دايمًا
  // من startDate الأصلي بتاع الجروب (مش من "آخر تاريخ مستخدم") ─────────────
  const newDates = createFlexibleWeeklySchedule(
    startDate,
    daysOfWeek,
    requiredSlots.length,
  );

  // ── فك حجز لينكات السيشنز اللي هتتشال فعلاً (موديولها بره الاختيار الجديد) ──
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

  // ── لينكات جديدة للسلوتات الجديدة تمامًا ──────────────────────────────
  // لو مفيش selectedLinkIds اتبعتت صراحة (زي زرار "مزامنة السيشنز" اللي
  // مفيهوش UI لاختيار لينكات أصلاً)، بدل ما نسيب السلوتات الجديدة من غير
  // أي لينك، بنجيب اللينكات اللي الجروب أصلًا بيستخدمها في باقي سيشناته
  // (اللي مش هتتشال) ونعيد استخدامها بنفس ترتيب ظهورها.
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

  // ✅ فحص تعارض: اللينكات اللي هتتستخدم للسلوتات الجديدة لازم تكون فاضية
  // فعليًا على جدول الجروب (أيام + وقت) — بنفس الفلسفة المستخدمة وقت
  // التوليد الأول، عشان مانحطش لينك مستخدم فعلاً في جروب تاني.
  if (allAvailableLinks.length > 0) {
    const { checkLinksConflictForSchedule } = await import("./checkMeetingLinks");
    const linkIdsToCheck = allAvailableLinks.map((l) => l._id.toString());
    const conflictCheck = await checkLinksConflictForSchedule(
      linkIdsToCheck,
      { daysOfWeek, timeFrom, timeTo },
      group._id,
    );

    if (conflictCheck.hasConflicts) {
      console.log(`❌ Link conflicts found: ${conflictCheck.conflicts.length}`);
      conflictCheck.conflicts.forEach((c) => {
        console.log(`   - ${c.linkName}: conflicts with group ${c.conflictingGroupId} (${c.conflictingDays?.join(", ")} ${c.conflictingTime || ""})`);
      });
      const error = new Error("اللينكات المتاحة للسلوتات الجديدة متعارضة مع جروب تاني في نفس الميعاد");
      error.code = "LINK_CONFLICT";
      error.linkConflicts = conflictCheck.conflicts;
      throw error;
    }
    console.log(`✅ No link conflicts found for resync links`);
  }

  let freshLinkCursor = 0;

  const bulkUpdateExisting = [];
  const newSessionsToInsert = [];

  requiredSlots.forEach((slot, i) => {
    const module = course.curriculum[slot.moduleIndex];
    const lessonTitle =
      module.lessons[slot.lessonIndexes[0]]?.title?.trim() || "";
    const title = `Session ${slot.sessionNumber}: ${lessonTitle}`;
    const description =
      module.lessons[slot.lessonIndexes[0]]?.description || "";
    const newDate = newDates[i];

    if (slot.existing) {
      // ✅ سيشن موجودة بالفعل لنفس (module, sessionNumber) — نحدّث بس تاريخها/
      // وقتها/عنوانها، ومنلمسش اللينك ولا الـ _id بتاعها خالص
      bulkUpdateExisting.push({
        updateOne: {
          filter: { _id: slot.existing._id },
          update: {
            $set: {
              scheduledDate: newDate,
              startTime: timeFrom,
              endTime: timeTo,
              title,
              description,
              status: "scheduled",
              "metadata.updatedAt": new Date(),
              "metadata.lastModifiedBy": userId,
            },
          },
        },
      });
      return;
    }

    // ✅ سلوت جديد تمامًا — سيشن جديدة، ولينك من allAvailableLinks لو موجود
    const base = {
      _id: new mongoose.Types.ObjectId(),
      groupId: group._id,
      courseId: course._id,
      moduleIndex: slot.moduleIndex,
      sessionNumber: slot.sessionNumber,
      lessonIndexes: slot.lessonIndexes,
      title,
      description,
      scheduledDate: newDate,
      startTime: timeFrom,
      endTime: timeTo,
      status: "scheduled",
      attendanceTaken: false,
      attendance: [],
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

    if (allAvailableLinks.length > 0) {
      const link =
        allAvailableLinks[freshLinkCursor % allAvailableLinks.length];
      freshLinkCursor++;
      newSessionsToInsert.push({
        ...base,
        meetingLink: link.link,
        meetingCredentials: {
          username: link.credentials?.username,
          password: link.credentials?.password,
        },
        meetingLinkId: link._id,
        meetingPlatform: link.platform,
        automationEvents: {
          ...base.automationEvents,
          meetingLinkAssigned: true,
          meetingLinkAssignedAt: new Date(),
        },
      });
    } else {
      newSessionsToInsert.push(base);
    }
  });

  if (bulkUpdateExisting.length > 0) {
    await Session.bulkWrite(bulkUpdateExisting);
  }
  if (newSessionsToInsert.length > 0) {
    await Session.insertMany(newSessionsToInsert);

    // ✅ نسجل الحجز الفعلي على الـ MeetingLink documents بتاعة السلوتات
    // الجديدة تمامًا — السيشنز اللي "kept in place" مالهاش داعي، لأنها
    // مستخدمة نفس اللينك من الأول وحجزه مسجل بالفعل بنفس daysOfWeek/
    // timeFrom/timeTo (مش متغيّرين هنا).
    const newSessionsWithLinks = newSessionsToInsert.filter((s) => s.meetingLinkId);
    if (newSessionsWithLinks.length > 0) {
      await persistLinkReservations(newSessionsWithLinks, group, userId);
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
    `✅ Resync v2 done: required=${requiredSlots.length} (kept-in-place=${bulkUpdateExisting.length}, new=${newSessionsToInsert.length}), removed=${sessionsToRemove.length} (links released=${linksReleased}), completed untouched=${completedSessions.length}`,
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
  };
}