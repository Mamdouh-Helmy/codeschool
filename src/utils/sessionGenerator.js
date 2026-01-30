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
 * ✅ Calculate total sessions from course curriculum
 * NEW: Each 6 lessons = 3 sessions (2 lessons per session)
 */
export function calculateTotalSessions(curriculum) {
  if (!curriculum || !Array.isArray(curriculum) || curriculum.length === 0) {
    console.log("⚠️ No curriculum provided or empty array");
    return 0;
  }

  let total = 0;
  curriculum.forEach((module) => {
    if (
      module.lessons &&
      Array.isArray(module.lessons) &&
      module.lessons.length > 0
    ) {
      // ✅ Each module has 6 lessons = 3 sessions
      total += module.totalSessions || 3;
    }
  });

  console.log(`📊 Calculated total sessions: ${total}`);
  return total;
}

/**
 * ✅ Get session distribution summary
 */
export function getSessionDistributionSummary(curriculum) {
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
  };

  curriculum.forEach((module, idx) => {
    const lessonsCount = module.lessons?.length || 0;
    const sessionsCount = module.totalSessions || 3;

    summary.totalLessons += lessonsCount;
    summary.totalSessions += sessionsCount;

    summary.modules.push({
      index: idx,
      title: module.title,
      lessonsCount,
      sessionsCount,
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
 * ✅ Calculate day difference between two days in the same week
 */
function calculateDayDifference(startDay, targetDay) {
  if (targetDay >= startDay) {
    return targetDay - startDay;
  } else {
    return targetDay + 7 - startDay;
  }
}

/**
 * ✅ Adjust date to target day of week
 */
function adjustDateToTargetDay(date, targetDay) {
  const currentDay = date.getDay();
  const diff = calculateDayDifference(currentDay, targetDay);
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + diff);
  return newDate;
}

/**
 * ✅ Create weekly schedule for 3 days correctly
 */
function createWeeklySchedule(baseDate, scheduleDays, totalWeeks) {
  const weeklySchedule = [];

  // Convert day names to numbers
  const dayNumbers = scheduleDays.map((day) => dayMap[day]);

  console.log(`📅 Creating schedule for ${totalWeeks} weeks`);
  console.log(`  Schedule days: ${scheduleDays} → ${dayNumbers}`);

  // Start date
  const startDate = new Date(baseDate);

  // ✅ Adjust start date to be the first day of the schedule
  let adjustedStartDate = new Date(startDate);

  // Calculate offset to reach the first schedule day
  const currentDay = startDate.getDay();
  const targetDay = dayNumbers[0];
  let daysToAdd = targetDay - currentDay;
  if (daysToAdd < 0) {
    daysToAdd += 7;
  }

  adjustedStartDate.setDate(startDate.getDate() + daysToAdd);

  console.log(
    `  Original start date: ${startDate.toISOString().split("T")[0]} (${getDayName(startDate.getDay())})`
  );
  console.log(
    `  Adjusted start date: ${adjustedStartDate.toISOString().split("T")[0]} (${getDayName(adjustedStartDate.getDay())})`
  );

  // For each week
  for (let week = 0; week < totalWeeks; week++) {
    const weekDays = [];

    // For each of the three days
    for (let i = 0; i < 3; i++) {
      const date = new Date(adjustedStartDate);

      // Calculate offset: (week × 7 days) + day difference
      const weekOffset = week * 7;

      if (i === 0) {
        // First day: adjusted start date + week offset
        date.setDate(adjustedStartDate.getDate() + weekOffset);
      } else {
        // For other days: calculate difference between first day and current day
        const dayDifference = calculateDayDifference(dayNumbers[0], dayNumbers[i]);
        date.setDate(adjustedStartDate.getDate() + weekOffset + dayDifference);
      }

      weekDays.push(new Date(date));
    }

    weeklySchedule.push(weekDays);

    console.log(`  🗓️ Week ${week + 1}:`);
    weekDays.forEach((date, idx) => {
      console.log(
        `    Day ${idx + 1}: ${date.toISOString().split("T")[0]} (${getDayName(date.getDay())})`
      );
    });
  }

  return weeklySchedule;
}

/**
 * ✅ Validate schedule days selection
 */
function validateScheduleDays(startDate, daysOfWeek) {
  if (!startDate || !daysOfWeek || daysOfWeek.length !== 3) {
    return {
      valid: false,
      error: "Must select exactly 3 days for schedule",
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

  // Check for duplicate days
  const uniqueDays = [...new Set(daysOfWeek)];
  if (uniqueDays.length !== 3) {
    return {
      valid: false,
      error: "Duplicate days are not allowed",
    };
  }

  return {
    valid: true,
    startDayName,
  };
}

/**
 * ✅ Assign meeting link to a session
 */
async function assignMeetingLinkToSession(sessionData, userId) {
  try {
    console.log(`🔗 Looking for meeting link for session: ${sessionData.title}`);

    // Create date objects for the session time
    const startTime = new Date(sessionData.scheduledDate);
    const [hours, minutes] = sessionData.startTime.split(":").map(Number);
    startTime.setHours(hours, minutes, 0, 0);

    const endTime = new Date(startTime);
    const [endHours, endMinutes] = sessionData.endTime.split(":").map(Number);
    endTime.setHours(endHours, endMinutes, 0, 0);

    console.log(
      `  Session time: ${startTime.toISOString()} to ${endTime.toISOString()}`
    );

    // ✅ Find available links using the static method
    const availableLinks = await MeetingLink.findAvailableLinks(
      startTime,
      endTime,
      5
    );

    if (!availableLinks || availableLinks.length === 0) {
      console.log("⚠️ No meeting links available for this time slot");
      return sessionData;
    }

    console.log(`📋 Found ${availableLinks.length} available links`);

    // Get the first available link (full document, not lean)
    const bestLinkId = availableLinks[0]._id;
    const bestLink = await MeetingLink.findById(bestLinkId);

    if (!bestLink) {
      console.log("⚠️ Could not retrieve meeting link document");
      return sessionData;
    }

    console.log(`  📌 Selected link: ${bestLink.name}`);

    // ✅ Reserve the link using instance method
    const reservationResult = await bestLink.reserveForSession(
      sessionData._id || new mongoose.Types.ObjectId(),
      sessionData.groupId,
      startTime,
      endTime,
      userId
    );

    console.log(`✅ Link reserved: ${reservationResult.link.substring(0, 50)}...`);

    // Return updated session data
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
    // Don't fail session creation if link assignment fails
    return sessionData;
  }
}

/**
 * ✅ Generate all sessions for a group based on course curriculum
 * NEW SYSTEM: 3 sessions per module (2 lessons per session)
 * Distribution: The three sessions are distributed over the three selected days
 */
export async function generateSessionsForGroup(groupId, group, userId) {
  try {
    console.log(
      `\n🔄 ========== GENERATING SESSIONS (3 SESSIONS SYSTEM) ==========`
    );
    console.log(`Group ID: ${groupId}`);
    console.log(`Group Name: ${group.name}`);
    console.log(`Group Status: ${group.status}`);

    if (!group) {
      throw new Error("Group not found");
    }

    // ✅ Check status
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

    console.log("📚 Course curriculum loaded:", {
      courseId: course._id,
      courseName: course.title,
      modulesCount: course.curriculum.length,
      totalSessions: course.curriculum.length * 3,
    });

    // Parse schedule
    const { startDate, daysOfWeek, timeFrom, timeTo } = group.schedule;

    if (!startDate || !daysOfWeek || daysOfWeek.length !== 3) {
      throw new Error(
        "Invalid schedule: Must have start date and exactly 3 days selected"
      );
    }

    console.log("📅 Schedule configuration:", {
      startDate: new Date(startDate).toISOString().split("T")[0],
      daysOfWeek: daysOfWeek,
      timeFrom: timeFrom,
      timeTo: timeTo,
    });

    // ✅ Validate schedule days
    const scheduleValidation = validateScheduleDays(startDate, daysOfWeek);
    if (!scheduleValidation.valid) {
      throw new Error(scheduleValidation.error);
    }

    console.log(
      `✅ Schedule validated. Start day: ${scheduleValidation.startDayName}`
    );

    // Convert day names to numbers
    const scheduleDayNumbers = daysOfWeek.map((day) => dayMap[day]);
    console.log("📅 Days as numbers:", scheduleDayNumbers);

    // Calculate required weeks (each module needs one full week)
    const totalWeeks = Math.ceil(course.curriculum.length / 1);
    console.log(`📅 Total weeks required: ${totalWeeks}`);

    // Create weekly schedule
    const weeklySchedule = createWeeklySchedule(
      startDate,
      daysOfWeek,
      totalWeeks
    );

    if (weeklySchedule.length === 0) {
      throw new Error("Failed to create weekly schedule");
    }

    // ✅ Generate sessions
    const sessions = [];

    // For each module
    for (
      let moduleIdx = 0;
      moduleIdx < course.curriculum.length;
      moduleIdx++
    ) {
      const module = course.curriculum[moduleIdx];

      console.log(`\n📖 Processing Module ${moduleIdx + 1}: ${module.title}`);

      if (!module.lessons || module.lessons.length !== 6) {
        console.warn(
          `⚠️ Module ${moduleIdx + 1} must have exactly 6 lessons (has ${module.lessons?.length || 0})`
        );
        continue;
      }

      // Determine the week for this module
      const weekIndex = moduleIdx;
      const weekDays = weeklySchedule[weekIndex];

      if (!weekDays || weekDays.length !== 3) {
        console.error(
          `❌ Error: No valid week days for module ${moduleIdx + 1}`
        );
        continue;
      }

      // ✅ Sort dates chronologically
      const sortedWeekDays = [...weekDays].sort((a, b) => {
        return new Date(a) - new Date(b);
      });

      console.log(`  🗓️ Week ${weekIndex + 1} dates (sorted by date):`);
      sortedWeekDays.forEach((date, idx) => {
        console.log(
          `    Day ${idx + 1}: ${date.toISOString().split("T")[0]} (${getDayName(date.getDay())}) - Session ${idx + 1}`
        );
      });

      // ✅ Create 3 sessions for this module
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

      // For each of the 3 sessions
      for (const sessionGroup of sessionGroups) {
        const dayIndex = sessionGroup.sessionNumber - 1;
        const scheduledDate = new Date(sortedWeekDays[dayIndex]);

        const lessonTitles = sessionGroup.lessons.map((l) => l.title).join(" & ");

        const sessionTitle = `${module.title} - Session ${sessionGroup.sessionNumber}: ${lessonTitles}`;

        const session = {
          _id: new mongoose.Types.ObjectId(),
          groupId: group._id,
          courseId: course._id,
          moduleIndex: moduleIdx,
          sessionNumber: sessionGroup.sessionNumber,
          lessonIndexes: sessionGroup.lessonIndexes,
          title: sessionTitle,
          description: `Covers Lessons ${sessionGroup.lessonNumbers}`,
          scheduledDate: scheduledDate,
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

        sessions.push(session);

        console.log(
          `  ✅ Session ${sessionGroup.sessionNumber} (Lessons ${sessionGroup.lessonNumbers})`
        );
        console.log(
          `    📅 ${scheduledDate.toISOString().split("T")[0]} (${getDayName(scheduledDate.getDay())})`
        );
        console.log(`    🕐 ${timeFrom} - ${timeTo}`);
        console.log(`    📚 ${lessonTitles}`);
      }

      console.log(`  📊 Created 3 sessions for module ${moduleIdx + 1}`);
    }

    console.log(`\n📊 Generation Summary:`);
    console.log(`  Total Modules: ${course.curriculum.length}`);
    console.log(`  Total Sessions Generated: ${sessions.length}`);
    console.log(`  Expected Sessions: ${course.curriculum.length * 3}`);
    console.log(`  Sessions per Module: 3`);

    // ✅ Assign meeting links to sessions
    console.log(`\n🔗 Assigning meeting links to sessions...`);

    const sessionsWithLinks = [];
    let linksAssigned = 0;
    let linksFailed = 0;

    for (const session of sessions) {
      try {
        const sessionWithLink = await assignMeetingLinkToSession(session, userId);
        sessionsWithLinks.push(sessionWithLink);

        if (sessionWithLink.meetingLink) {
          linksAssigned++;
          console.log(
            `  ✅ Link assigned to Session ${session.sessionNumber} of Module ${session.moduleIndex + 1}`
          );
        } else {
          linksFailed++;
          console.log(
            `  ⚠️ No link assigned to Session ${session.sessionNumber} of Module ${session.moduleIndex + 1}`
          );
        }
      } catch (linkError) {
        console.error(`  ❌ Failed to assign link: ${linkError.message}`);
        sessionsWithLinks.push(session);
        linksFailed++;
      }
    }

    console.log(`\n🔗 Meeting Link Assignment Summary:`);
    console.log(`  Total Sessions: ${sessions.length}`);
    console.log(`  Links Assigned: ${linksAssigned}`);
    console.log(`  Links Failed: ${linksFailed}`);

    // Analyze day distribution
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
    Array.from(dateSet)
      .sort()
      .forEach((date) => {
        console.log(`  ${date}`);
      });

    if (sessionsWithLinks.length > 0) {
      console.log(
        `  Start Date: ${sessionsWithLinks[0].scheduledDate.toISOString().split("T")[0]}`
      );
      console.log(
        `  End Date: ${sessionsWithLinks[sessionsWithLinks.length - 1].scheduledDate.toISOString().split("T")[0]}`
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
        daysOfWeek: daysOfWeek,
        startDate: new Date(startDate),
        timeFrom: timeFrom,
        timeTo: timeTo,
      },
      meetingLinks: {
        assigned: linksAssigned,
        failed: linksFailed,
        total: sessionsWithLinks.length,
      },
    };
  } catch (error) {
    console.error("❌ Error generating sessions:", error);
    console.error("❌ Error details:", {
      message: error.message,
      stack: error.stack,
    });
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

    // Calculate actual duration
    const sessionStart = new Date(session.scheduledDate);
    const [startHours, startMinutes] = session.startTime.split(":").map(Number);
    sessionStart.setHours(startHours, startMinutes, 0, 0);

    const sessionEnd = new Date(session.scheduledDate);
    const [endHours, endMinutes] = session.endTime.split(":").map(Number);
    sessionEnd.setHours(endHours, endMinutes, 0, 0);

    const actualDuration = (sessionEnd - sessionStart) / (1000 * 60);

    const result = await meetingLink.releaseLink(actualDuration);

    console.log(`✅ Released meeting link for session: ${sessionId}`);

    // Update session to remove meeting link info
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

    // First, release any meeting links from existing sessions
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
          releaseError.message
        );
      }
    }

    // Then, mark all existing sessions as deleted
    await Session.updateMany(
      { groupId: groupId, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          status: "cancelled",
        },
      }
    );

    console.log(`🗑️ Marked existing sessions as deleted`);

    // Then generate new sessions
    const result = await generateSessionsForGroup(groupId, group, userId);

    if (result.success) {
      console.log(
        `✅ Regenerated ${result.totalGenerated} sessions for group ${groupId}`
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

    // Group by day
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

    // Group by module
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

    // Timeline
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

  // Sort timeline by date
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

  if (!expectedDaysOfWeek || expectedDaysOfWeek.length !== 3) {
    return {
      valid: false,
      error: "Expected exactly 3 days of week",
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
        `Session ${index + 1} (${session.title}) is on day ${sessionDay} which is not in expected days`
      );
    }

    const expectedDayIndex = (session.sessionNumber - 1) % 3;
    const expectedDayNumber = expectedDayNumbers[expectedDayIndex];

    if (sessionDay !== expectedDayNumber) {
      issues.push(
        `Session ${session.sessionNumber} should be on ${getDayName(expectedDayNumber)} but is on ${getDayName(sessionDay)}`
      );
    }
  });

  const missingDays = expectedDayNumbers.filter(
    (day) => !usedDayNumbers.has(day)
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
  platform = null
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
  userId
) {
  try {
    const Session = (await import("../app/models/Session")).default;

    const session = await Session.findById(sessionId);

    if (!session) {
      throw new Error("Session not found");
    }

    // Release existing meeting link if any
    if (session.meetingLinkId) {
      await releaseMeetingLink(sessionId);
    }

    const meetingLink = await MeetingLink.findById(meetingLinkId);

    if (!meetingLink) {
      throw new Error("Meeting link not found");
    }

    // Create date objects for the session time
    const startTime = new Date(session.scheduledDate);
    const [hours, minutes] = session.startTime.split(":").map(Number);
    startTime.setHours(hours, minutes, 0, 0);

    const endTime = new Date(startTime);
    const [endHours, endMinutes] = session.endTime.split(":").map(Number);
    endTime.setHours(endHours, endMinutes, 0, 0);

    // Reserve the link
    const reservationResult = await meetingLink.reserveForSession(
      sessionId,
      session.groupId,
      startTime,
      endTime,
      userId
    );

    // Update session with meeting link
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