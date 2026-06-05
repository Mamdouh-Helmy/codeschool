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
 * ✅ Assign meeting link to a session
 */
async function assignMeetingLinkToSession(sessionData, userId) {
  try {
    console.log(
      `🔗 Looking for meeting link for session: ${sessionData.title}`,
    );

    const startTime = new Date(sessionData.scheduledDate);
    const [hours, minutes] = sessionData.startTime.split(":").map(Number);
    startTime.setHours(hours, minutes, 0, 0);

    const endTime = new Date(startTime);
    const [endHours, endMinutes] = sessionData.endTime.split(":").map(Number);
    endTime.setHours(endHours, endMinutes, 0, 0);

    console.log(
      `  Session time: ${startTime.toISOString()} to ${endTime.toISOString()}`,
    );

    const availableLinks = await MeetingLink.findAvailableLinks(
      startTime,
      endTime,
      5,
    );

    if (!availableLinks || availableLinks.length === 0) {
      console.log("⚠️ No meeting links available for this time slot");
      return sessionData;
    }

    console.log(`📋 Found ${availableLinks.length} available links`);

    const bestLinkId = availableLinks[0]._id;
    const bestLink = await MeetingLink.findById(bestLinkId);

    if (!bestLink) {
      console.log("⚠️ Could not retrieve meeting link document");
      return sessionData;
    }

    console.log(`  📌 Selected link: ${bestLink.name}`);

    const reservationResult = await bestLink.reserveForSession(
      sessionData._id || new mongoose.Types.ObjectId(),
      sessionData.groupId,
      startTime,
      endTime,
      userId,
    );

    console.log(
      `✅ Link reserved: ${reservationResult.link.substring(0, 50)}...`,
    );

    return {
      ...sessionData,
      meetingLink: reservationResult.link,
      meetingCredentials: {
        username: bestLink.credentials?.username,
        password: bestLink.credentials?.password,
      },
      meetingLinkId: bestLink._id,
      meetingPlatform: bestLink.platform,
      automationEvents: {
        ...(sessionData.automationEvents || {}),
        meetingLinkAssigned: true,
        meetingLinkAssignedAt: new Date(),
      },
    };
  } catch (error) {
    console.error("❌ Error assigning meeting link:", error.message);
    console.error(error.stack);
    return sessionData;
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

    // ── ✅ Assign meeting links (modulo — no reservation) ─────────────────
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
 * ✅ Get available meeting links for manual assignment
 */
export async function getAvailableMeetingLinks(
  startTime,
  endTime,
  platform = null,
) {
  try {
    const links = await MeetingLink.findAvailableLinks(startTime, endTime, 10);

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