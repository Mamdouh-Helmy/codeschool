// utils/sessionGenerator.js
// ✅ إزالة import mongoose من هنا لأننا نستورده مرة واحدة فقط

/**
 * ✅ Calculate total sessions from course curriculum
 * NEW: Each 6 lessons = 3 sessions (2 lessons per session)
 */
export function calculateTotalSessions(curriculum) {
  if (!curriculum || !Array.isArray(curriculum) || curriculum.length === 0) {
    console.log('⚠️ No curriculum provided or empty array');
    return 0;
  }

  let total = 0;
  curriculum.forEach((module) => {
    if (module.lessons && Array.isArray(module.lessons) && module.lessons.length > 0) {
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
      modules: []
    };
  }

  const summary = {
    totalModules: curriculum.length,
    totalLessons: 0,
    totalSessions: 0,
    modules: []
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
      distribution: 'Lessons 1-2→S1, 3-4→S2, 5-6→S3'
    });
  });

  return summary;
}

/**
 * ✅ تحويل أسماء الأيام إلى أرقام
 */
const dayMap = {
  'Sunday': 0,
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6
};

const dayMapReverse = {
  0: 'Sunday',
  1: 'Monday', 
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday'
};

/**
 * ✅ الحصول على اسم اليوم من رقمه
 */
function getDayName(dayNumber) {
  return dayMapReverse[dayNumber] || 'Unknown';
}

/**
 * ✅ حساب الفرق بين يومين في نفس الأسبوع
 */
function calculateDayDifference(startDay, targetDay) {
  if (targetDay >= startDay) {
    return targetDay - startDay;
  } else {
    return (targetDay + 7) - startDay;
  }
}

/**
 * ✅ ضبط التاريخ ليصبح في اليوم المطلوب
 */
function adjustDateToTargetDay(date, targetDay) {
  const currentDay = date.getDay();
  const diff = calculateDayDifference(currentDay, targetDay);
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + diff);
  return newDate;
}

/**
 * ✅ إنشاء جدول أسبوعي لـ 3 أيام بشكل صحيح
 */
function createWeeklySchedule(baseDate, scheduleDays, totalWeeks) {
  const weeklySchedule = [];
  
  // تحويل أسماء الأيام إلى أرقام
  const dayNumbers = scheduleDays.map(day => dayMap[day]);
  
  console.log(`📅 إنشاء جدول لـ ${totalWeeks} أسابيع`);
  console.log(`   أيام الجدول: ${scheduleDays} → ${dayNumbers}`);
  
  // تاريخ البداية
  const startDate = new Date(baseDate);
  
  // ✅ ضبط تاريخ البداية ليكون في اليوم الأول من الجدول
  let adjustedStartDate = new Date(startDate);
  
  // احسب الإزاحة للوصول إلى اليوم الأول من الجدول
  const currentDay = startDate.getDay();
  const targetDay = dayNumbers[0];
  
  let daysToAdd = targetDay - currentDay;
  if (daysToAdd < 0) {
    daysToAdd += 7;
  }
  
  adjustedStartDate.setDate(startDate.getDate() + daysToAdd);
  
  console.log(`   تاريخ البداية: ${startDate.toISOString().split('T')[0]} (${getDayName(startDate.getDay())})`);
  console.log(`   تاريخ البداية المعدل: ${adjustedStartDate.toISOString().split('T')[0]} (${getDayName(adjustedStartDate.getDay())})`);
  
  // لكل أسبوع
  for (let week = 0; week < totalWeeks; week++) {
    const weekDays = [];
    
    // لكل يوم من الأيام الثلاثة
    for (let i = 0; i < 3; i++) {
      const date = new Date(adjustedStartDate);
      
      // حساب الإزاحة: (أسبوع × 7 أيام) + الفرق بين الأيام
      const weekOffset = week * 7;
      
      if (i === 0) {
        // اليوم الأول: تاريخ البداية المعدل + إزاحة الأسبوع
        date.setDate(adjustedStartDate.getDate() + weekOffset);
      } else {
        // للأيام الأخرى: احسب الفرق بين اليوم الأول واليوم الحالي
        const dayDifference = calculateDayDifference(dayNumbers[0], dayNumbers[i]);
        date.setDate(adjustedStartDate.getDate() + weekOffset + dayDifference);
      }
      
      weekDays.push(new Date(date));
    }
    
    weeklySchedule.push(weekDays);
    
    console.log(`   🗓️  الأسبوع ${week + 1}:`);
    weekDays.forEach((date, idx) => {
      console.log(`      اليوم ${idx + 1}: ${date.toISOString().split('T')[0]} (${getDayName(date.getDay())})`);
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
      error: 'Must select exactly 3 days for schedule'
    };
  }

  const startDayName = new Date(startDate).toLocaleDateString('en-US', { weekday: 'long' });
  
  if (!daysOfWeek.includes(startDayName)) {
    return {
      valid: false,
      error: `First selected day must be ${startDayName} (based on start date)`
    };
  }

  // Check for duplicate days
  const uniqueDays = [...new Set(daysOfWeek)];
  if (uniqueDays.length !== 3) {
    return {
      valid: false,
      error: 'Duplicate days are not allowed'
    };
  }

  return {
    valid: true,
    startDayName
  };
}

/**
 * ✅ Generate all sessions for a group based on course curriculum
 * النظام الجديد: 3 سيشنات لكل وحدة (2 حصة لكل سيشن)
 * التوزيع: السيشنات الثلاثة تتوزع على الأيام الثلاثة المختارة
 */
export async function generateSessionsForGroup(groupId, group, userId) {
  try {
    console.log(`\n🔄 ========== GENERATING SESSIONS (3 SESSIONS SYSTEM) ==========`);
    console.log(`Group ID: ${groupId}`);
    console.log(`Group Name: ${group.name}`);
    console.log(`Group Status: ${group.status}`);

    if (!group) {
      throw new Error('Group not found');
    }

    // ✅ Check status
    if (group.status !== 'active') {
      throw new Error(`Group must be active. Current status: ${group.status}`);
    }

    if (group.sessionsGenerated) {
      console.log('⚠️ Sessions already generated for this group');
      return {
        success: false,
        message: 'Sessions already generated',
        totalGenerated: 0
      };
    }

    const course = group.courseId;
    if (!course || !course.curriculum || course.curriculum.length === 0) {
      throw new Error('Course curriculum not found');
    }

    console.log('📚 Course curriculum loaded:', {
      courseId: course._id,
      courseName: course.title,
      modulesCount: course.curriculum.length,
      totalSessions: course.curriculum.length * 3
    });

    // Parse schedule
    const { startDate, daysOfWeek, timeFrom, timeTo } = group.schedule;

    if (!startDate || !daysOfWeek || daysOfWeek.length !== 3) {
      throw new Error('Invalid schedule: Must have start date and exactly 3 days selected');
    }

    console.log('📅 Schedule configuration:', {
      startDate: new Date(startDate).toISOString().split('T')[0],
      daysOfWeek: daysOfWeek,
      timeFrom: timeFrom,
      timeTo: timeTo
    });

    // ✅ Validate schedule days
    const scheduleValidation = validateScheduleDays(startDate, daysOfWeek);
    if (!scheduleValidation.valid) {
      throw new Error(scheduleValidation.error);
    }

    console.log(`✅ Schedule validated. Start day: ${scheduleValidation.startDayName}`);

    // تحويل أسماء الأيام إلى أرقام
    const scheduleDayNumbers = daysOfWeek.map(day => dayMap[day]);
    console.log('📅 Days as numbers:', scheduleDayNumbers);

    // حساب عدد الأسابيع المطلوبة (كل وحدة تحتاج أسبوعاً كاملاً)
    const totalWeeks = Math.ceil(course.curriculum.length / 1); // وحدة واحدة في الأسبوع
    console.log(`📅 إجمالي الأسابيع المطلوبة: ${totalWeeks}`);

    // إنشاء الجدول الأسبوعي
    const weeklySchedule = createWeeklySchedule(startDate, daysOfWeek, totalWeeks);
    
    if (weeklySchedule.length === 0) {
      throw new Error('Failed to create weekly schedule');
    }

    // ✅ Generate sessions
    const sessions = [];

    // لكل وحدة دراسية
    for (let moduleIdx = 0; moduleIdx < course.curriculum.length; moduleIdx++) {
      const module = course.curriculum[moduleIdx];
      
      console.log(`\n📖 Processing Module ${moduleIdx + 1}: ${module.title}`);

      if (!module.lessons || module.lessons.length !== 6) {
        console.warn(`⚠️ Module ${moduleIdx + 1} must have exactly 6 lessons (has ${module.lessons?.length || 0})`);
        continue;
      }

      // تحديد الأسبوع لهذه الوحدة
      const weekIndex = moduleIdx; // كل وحدة في أسبوع مختلف
      const weekDays = weeklySchedule[weekIndex];
      
      if (!weekDays || weekDays.length !== 3) {
        console.error(`❌ Error: No valid week days for module ${moduleIdx + 1}`);
        continue;
      }

      console.log(`   🗓️  Week ${weekIndex + 1} dates:`);
      weekDays.forEach((date, idx) => {
        console.log(`      Day ${idx + 1}: ${date.toISOString().split('T')[0]} (${getDayName(date.getDay())})`);
      });

      // ✅ إنشاء 3 سيشنات لهذه الوحدة
      const sessionGroups = [
        {
          sessionNumber: 1,
          lessonIndexes: [0, 1],
          lessonNumbers: "1-2",
          lessons: [module.lessons[0], module.lessons[1]]
        },
        {
          sessionNumber: 2,
          lessonIndexes: [2, 3],
          lessonNumbers: "3-4",
          lessons: [module.lessons[2], module.lessons[3]]
        },
        {
          sessionNumber: 3,
          lessonIndexes: [4, 5],
          lessonNumbers: "5-6",
          lessons: [module.lessons[4], module.lessons[5]]
        }
      ];

      // لكل سيشن من الـ 3 سيشنات
      for (const sessionGroup of sessionGroups) {
        // التاريخ المناسب لهذا السيشن (اليوم المناسب)
        const dayIndex = sessionGroup.sessionNumber - 1; // 0, 1, 2
        const scheduledDate = new Date(weekDays[dayIndex]);
        
        // تحضير عنوان السيشن
        const lessonTitles = sessionGroup.lessons.map(l => l.title).join(' & ');
        const sessionTitle = `${module.title} - Session ${sessionGroup.sessionNumber}: ${lessonTitles}`;

        // إنشاء كائن السيشن
        const session = {
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
          status: 'scheduled',
          attendanceTaken: false,
          attendance: [],
          automationEvents: {
            reminderSent: false,
            absentNotificationsSent: false,
            postponeNotificationSent: false,
            cancelNotificationSent: false
          },
          metadata: {
            createdBy: userId,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          isDeleted: false
        };

        sessions.push(session);

        console.log(`   ✅ Session ${sessionGroup.sessionNumber} (Lessons ${sessionGroup.lessonNumbers})`);
        console.log(`      📅 ${scheduledDate.toISOString().split('T')[0]} (${getDayName(scheduledDate.getDay())})`);
        console.log(`      🕐 ${timeFrom} - ${timeTo}`);
        console.log(`      📚 ${lessonTitles}`);
      }
      
      console.log(`   📊 Created 3 sessions for module ${moduleIdx + 1}`);
    }

    console.log(`\n📊 Generation Summary:`);
    console.log(`   Total Modules: ${course.curriculum.length}`);
    console.log(`   Total Sessions Generated: ${sessions.length}`);
    console.log(`   Expected Sessions: ${course.curriculum.length * 3}`);
    console.log(`   Sessions per Module: 3`);

    // تحليل توزيع الأيام
    const dayDistribution = {};
    const dateSet = new Set();
    
    sessions.forEach(session => {
      const dayName = getDayName(new Date(session.scheduledDate).getDay());
      const dateStr = session.scheduledDate.toISOString().split('T')[0];
      
      dayDistribution[dayName] = (dayDistribution[dayName] || 0) + 1;
      dateSet.add(dateStr);
    });

    console.log(`\n📅 Session Distribution by Day:`);
    Object.entries(dayDistribution).forEach(([day, count]) => {
      console.log(`   ${day}: ${count} session(s)`);
    });

    console.log(`\n📅 Unique Dates Used: ${dateSet.size}`);
    Array.from(dateSet).sort().forEach(date => {
      console.log(`   ${date}`);
    });

    if (sessions.length > 0) {
      console.log(`   Start Date: ${sessions[0].scheduledDate.toISOString().split('T')[0]}`);
      console.log(`   End Date: ${sessions[sessions.length - 1].scheduledDate.toISOString().split('T')[0]}`);
    }

    // ✅ التحقق من التوزيع الصحيح
    const expectedDayCount = Math.ceil(sessions.length / 3); // كل يوم يجب أن يكون له نفس العدد تقريباً
    const dayCounts = Object.values(dayDistribution);
    const isBalanced = dayCounts.every(count => 
      count >= expectedDayCount - 1 && count <= expectedDayCount + 1
    );

    if (!isBalanced) {
      console.warn(`⚠️  WARNING: Session distribution may not be balanced properly`);
      console.warn(`   Expected ~${expectedDayCount} sessions per day`);
      console.warn(`   Actual distribution:`, dayDistribution);
    }

    // ✅ Validation check
    const expectedTotal = course.curriculum.length * 3;
    if (sessions.length !== expectedTotal) {
      console.warn(`⚠️ WARNING: Expected ${expectedTotal} sessions but generated ${sessions.length}`);
    }

    console.log(`\n✅ Session Generation Completed Successfully!`);
    console.log(`========================================\n`);

    return {
      success: true,
      sessions: sessions,
      totalGenerated: sessions.length,
      startDate: sessions[0]?.scheduledDate,
      endDate: sessions[sessions.length - 1]?.scheduledDate,
      distribution: dayDistribution,
      uniqueDates: Array.from(dateSet).sort(),
      schedule: {
        daysOfWeek: daysOfWeek,
        startDate: new Date(startDate),
        timeFrom: timeFrom,
        timeTo: timeTo
      }
    };

  } catch (error) {
    console.error('❌ Error generating sessions:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Regenerate sessions for a group (delete old + create new)
 */
export async function regenerateSessionsForGroup(groupId, group, userId) {
  try {
    console.log(`🔄 Regenerating sessions for group: ${groupId}`);
    
    // ✅ FIX: استيراد صحيح من المسار الصحيح
    const Session = (await import('@/models/Session')).default;
    
    // First, mark all existing sessions as deleted
    await Session.updateMany(
      { groupId: groupId, isDeleted: false },
      { 
        $set: { 
          isDeleted: true, 
          deletedAt: new Date(),
          status: 'cancelled'
        } 
      }
    );
    
    console.log(`🗑️  Marked existing sessions as deleted`);
    
    // Then generate new sessions
    const result = await generateSessionsForGroup(groupId, group, userId);
    
    if (result.success) {
      console.log(`✅ Regenerated ${result.totalGenerated} sessions for group ${groupId}`);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Error regenerating sessions:', error);
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
      timeline: []
    };
  }

  const byDay = {};
  const byModule = {};
  const timeline = [];

  sessions.forEach(session => {
    const day = new Date(session.scheduledDate).toLocaleDateString('en-US', { weekday: 'long' });
    const date = session.scheduledDate.toISOString().split('T')[0];
    
    // Group by day
    if (!byDay[day]) {
      byDay[day] = {
        day: day,
        count: 0,
        sessions: []
      };
    }
    byDay[day].count++;
    byDay[day].sessions.push({
      id: session._id || session.id,
      title: session.title,
      time: `${session.startTime} - ${session.endTime}`,
      module: session.moduleIndex + 1,
      sessionNumber: session.sessionNumber
    });

    // Group by module
    const moduleKey = `Module ${session.moduleIndex + 1}`;
    if (!byModule[moduleKey]) {
      byModule[moduleKey] = {
        module: session.moduleIndex + 1,
        count: 0,
        sessions: []
      };
    }
    byModule[moduleKey].count++;
    byModule[moduleKey].sessions.push({
      id: session._id || session.id,
      sessionNumber: session.sessionNumber,
      date: date,
      day: day,
      time: `${session.startTime} - ${session.endTime}`
    });

    // Timeline
    timeline.push({
      date: date,
      day: day,
      time: `${session.startTime} - ${session.endTime}`,
      title: session.title,
      module: session.moduleIndex + 1,
      sessionNumber: session.sessionNumber
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
      lastDate: timeline[timeline.length - 1]?.date
    }
  };
}

/**
 * Validate if session dates are correctly distributed
 */
export function validateSessionDistribution(sessions, expectedDaysOfWeek) {
  if (!sessions || sessions.length === 0) {
    return {
      valid: false,
      error: 'No sessions to validate'
    };
  }

  if (!expectedDaysOfWeek || expectedDaysOfWeek.length !== 3) {
    return {
      valid: false,
      error: 'Expected exactly 3 days of week'
    };
  }

  const dayMap = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6
  };

  const expectedDayNumbers = expectedDaysOfWeek.map(day => dayMap[day]);
  const usedDayNumbers = new Set();
  const issues = [];

  sessions.forEach((session, index) => {
    const sessionDay = new Date(session.scheduledDate).getDay();
    usedDayNumbers.add(sessionDay);

    // Check if this session's day is in expected days
    if (!expectedDayNumbers.includes(sessionDay)) {
      issues.push(`Session ${index + 1} (${session.title}) is on day ${sessionDay} which is not in expected days`);
    }

    // Check session number corresponds to correct day index
    const expectedDayIndex = (session.sessionNumber - 1) % 3;
    const expectedDayNumber = expectedDayNumbers[expectedDayIndex];
    
    if (sessionDay !== expectedDayNumber) {
      issues.push(`Session ${session.sessionNumber} should be on ${getDayName(expectedDayNumber)} but is on ${getDayName(sessionDay)}`);
    }
  });

  // Check all expected days are used
  const missingDays = expectedDayNumbers.filter(day => !usedDayNumbers.has(day));
  if (missingDays.length > 0) {
    missingDays.forEach(day => {
      issues.push(`Day ${getDayName(day)} is not used in any session`);
    });
  }

  return {
    valid: issues.length === 0,
    issues: issues,
    usedDays: Array.from(usedDayNumbers).map(day => getDayName(day)),
    expectedDays: expectedDaysOfWeek
  };
}