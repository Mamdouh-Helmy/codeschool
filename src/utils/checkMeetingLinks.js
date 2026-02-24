// utils/checkMeetingLinks.js
import MeetingLink from "../app/models/MeetingLink";

/**
 * تحويل اسم اليوم إلى رقم
 */
const dayMap = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

/**
 * تحويل رقم اليوم إلى اسم
 */
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
 * حساب الفرق بين يومين في نفس الأسبوع
 */
function calculateDayDifference(startDay, targetDay) {
  if (targetDay >= startDay) {
    return targetDay - startDay;
  } else {
    return targetDay + 7 - startDay;
  }
}

/**
 * توليد تواريخ الجلسات للتحقق
 */
export function generateSessionDatesForCheck(group) {
  const { startDate, daysOfWeek, timeFrom, timeTo } = group.schedule;
  const totalSessions = group.totalSessionsCount || 
    (group.courseId?.curriculum?.length * 3 || 30);

  // تحويل أيام الأسبوع لأرقام وترتيبها
  const dayNumbers = daysOfWeek
    .map((day) => dayMap[day])
    .sort((a, b) => a - b);

  const daysPerWeek = dayNumbers.length;
  const startDateTime = new Date(startDate);
  
  // تعديل تاريخ البدء ليكون أول يوم محدد
  let adjustedStartDate = new Date(startDateTime);
  const currentDay = startDateTime.getDay();
  const firstSelectedDay = dayNumbers[0];
  
  let daysToAdd = firstSelectedDay - currentDay;
  if (daysToAdd < 0) {
    daysToAdd += 7;
  }
  
  adjustedStartDate.setDate(startDateTime.getDate() + daysToAdd);

  const sessions = [];

  // توليد تواريخ الجلسات
  for (let sessionIndex = 0; sessionIndex < totalSessions; sessionIndex++) {
    const dayInCycle = sessionIndex % daysPerWeek;
    const weeksElapsed = Math.floor(sessionIndex / daysPerWeek);
    
    const sessionDate = new Date(adjustedStartDate);
    sessionDate.setDate(adjustedStartDate.getDate() + (weeksElapsed * 7));
    
    if (dayInCycle > 0) {
      const dayDifference = calculateDayDifference(dayNumbers[0], dayNumbers[dayInCycle]);
      sessionDate.setDate(sessionDate.getDate() + dayDifference);
    }

    // إضافة وقت الجلسة
    const startDateTime = new Date(sessionDate);
    const [hours, minutes] = timeFrom.split(":").map(Number);
    startDateTime.setHours(hours, minutes, 0, 0);

    const endDateTime = new Date(sessionDate);
    const [endHours, endMinutes] = timeTo.split(":").map(Number);
    endDateTime.setHours(endHours, endMinutes, 0, 0);

    sessions.push({
      index: sessionIndex + 1,
      date: sessionDate,
      dayName: dayMapReverse[sessionDate.getDay()],
      startTime: startDateTime,
      endTime: endDateTime,
      timeFrom: timeFrom,
      timeTo: timeTo,
    });
  }

  return sessions;
}

/**
 * Helper function للتحقق من توفر رابط لوقت محدد
 */
async function checkLinkAvailability(link, startTime, endTime) {
  if (link.status === "available") {
    return true;
  }
  
  if (link.status === "reserved" && link.currentReservation) {
    const reservedStart = new Date(link.currentReservation.startTime);
    const reservedEnd = new Date(link.currentReservation.endTime);
    const now = new Date();
    
    // إذا انتهى الحجز، الرابط متاح
    if (reservedEnd < now) {
      return true;
    }
    
    // التحقق من عدم التعارض
    return !(startTime < reservedEnd && endTime > reservedStart);
  }
  
  return false;
}

/**
 * محاكاة توزيع الروابط بالترتيب (مع مراعاة الجروب)
 */
async function simulateLinkAssignmentInOrder(sessions, availableLinks, groupId) {
  const usedLinkIds = new Set();
  const sessionsNeedingLinks = [];
  const sessionsWithConflicts = [];
  const assignments = [];

  // ترتيب الجلسات حسب التاريخ
  const sortedSessions = [...sessions].sort((a, b) => a.startTime - b.startTime);

  console.log(`\n📋 Simulating link assignment in order (Group: ${groupId}):`);
  
  for (let i = 0; i < sortedSessions.length; i++) {
    const session = sortedSessions[i];
    const sessionStart = session.startTime;
    const sessionEnd = session.endTime;
    
    let foundLink = false;
    
    // نجرب الروابط بالترتيب
    for (const link of availableLinks) {
      const linkId = link._id.toString();
      
      // لو الرابط مستخدم قبل كده، نتخطاه (مش هنستخدم نفس الرابط لجلسات مختلفة)
      if (usedLinkIds.has(linkId)) continue;
      
      // التحقق من توفر الرابط للوقت ده
      const isAvailable = await checkLinkAvailability(link, sessionStart, sessionEnd);
      
      if (isAvailable) {
        foundLink = true;
        usedLinkIds.add(linkId);
        assignments.push({
          sessionIndex: i + 1,
          sessionDate: session.date,
          sessionDay: session.dayName,
          sessionTime: `${session.timeFrom} - ${session.timeTo}`,
          linkName: link.name,
          linkId: linkId
        });
        console.log(`   Session ${i + 1} (${session.date.toLocaleDateString()}) → ${link.name}`);
        break;
      } else {
        // سجل التعارض
        sessionsWithConflicts.push({
          session: session,
          link: link,
          reason: "conflict"
        });
        console.log(`   ⚠️ Session ${i + 1} - ${link.name} not available (conflict)`);
      }
    }
    
    if (!foundLink) {
      console.log(`   ❌ Session ${i + 1} (${session.date.toLocaleDateString()}) → NO LINK AVAILABLE`);
      sessionsNeedingLinks.push(session);
    }
  }

  console.log(`   📊 Links needed: ${Math.ceil(sortedSessions.length / 4)} (one link per 4 sessions max)`);
  console.log(`   📊 Links available: ${availableLinks.length}`);

  return {
    sessionsNeedingLinks,
    sessionsWithConflicts,
    assignments
  };
}

/**
 * ✅ التحقق من توفر الروابط لجدول الجروب (محسّن)
 */
export async function checkMeetingLinksAvailability(group) {
  try {
    console.log(`\n🔍 ========== CHECKING MEETING LINKS AVAILABILITY ==========`);
    console.log(`Group: ${group.name} (${group.code})`);
    console.log(`Group ID: ${group._id}`);
    console.log(`Schedule: ${group.schedule.daysOfWeek.length} day(s) per week - ${group.schedule.daysOfWeek.join(', ')}`);
    console.log(`Start Date: ${new Date(group.schedule.startDate).toLocaleDateString()}`);
    console.log(`Time: ${group.schedule.timeFrom} - ${group.schedule.timeTo}`);
    
    const totalSessionsNeeded = group.totalSessionsCount || 
      (group.courseId?.curriculum?.length * 3 || 0);
    
    console.log(`Total Sessions Needed: ${totalSessionsNeeded}`);

    // 1. توليد تواريخ الجلسات
    const sessions = generateSessionDatesForCheck(group);
    console.log(`\n📅 Generated ${sessions.length} session dates for checking`);

    // 2. جلب جميع الروابط
    const allLinks = await MeetingLink.find({
      isDeleted: false,
      status: { $in: ["available", "reserved"] }
    }).sort({ name: 1 }).lean(); // مرتبة حسب الاسم

    console.log(`\n📊 Total Links in System: ${allLinks.length}`);
    
    // 3. تحليل كل رابط
    const linksAnalysis = {
      available: [],
      reserved: [],
      maintenance: []
    };

    allLinks.forEach(link => {
      if (link.status === "available") {
        linksAnalysis.available.push(link);
      } else if (link.status === "reserved") {
        linksAnalysis.reserved.push(link);
      } else {
        linksAnalysis.maintenance.push(link);
      }
    });

    console.log(`   Available: ${linksAnalysis.available.length}`);
    console.log(`   Reserved: ${linksAnalysis.reserved.length}`);
    
    if (linksAnalysis.available.length > 0) {
      console.log(`   Available links in order: ${linksAnalysis.available.map(l => l.name).join(' → ')}`);
    }

    // 4. محاكاة توزيع الروابط بالترتيب مع مراعاة أن نفس الجروب يقدر يستخدم نفس الرابط
    console.log(`\n📊 Simulating link distribution in order (allowing same group to reuse links)...`);
    
    // نحتاج فقط روابط كافية بحيث كل 4 جلسات تأخذ رابط مختلف (تقريباً)
    const linksNeeded = Math.ceil(sessions.length / 4); // رابط واحد يكفي 4 جلسات
    const hasMinimumLinks = linksAnalysis.available.length >= linksNeeded;

    // محاكاة أكثر واقعية: كل جلسة محتاجة لينك مختلف في وقتها
    const usedLinks = new Set();
    const sessionsWithLinks = [];
    const sessionsNeedingLinks = [];

    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      let foundLink = false;
      
      for (const link of linksAnalysis.available) {
        const linkId = link._id.toString();
        
        // التحقق من توفر الرابط للوقت ده
        const isAvailable = await checkLinkAvailability(link, session.startTime, session.endTime);
        
        if (isAvailable) {
          foundLink = true;
          usedLinks.add(linkId);
          sessionsWithLinks.push({
            session: i + 1,
            link: link.name
          });
          break;
        }
      }
      
      if (!foundLink) {
        sessionsNeedingLinks.push(session);
      }
    }

    console.log(`\n📋 Detailed Analysis:`);
    console.log(`   Sessions needing unique links: ${sessionsNeedingLinks.length}/${sessions.length}`);
    console.log(`   Links needed (minimum): ${linksNeeded}`);
    console.log(`   Links available: ${linksAnalysis.available.length}`);
    console.log(`   Has minimum links: ${hasMinimumLinks ? '✅ YES' : '❌ NO'}`);
    console.log(`   Note: Same group can reuse the same link for different sessions`);

    const hasEnoughLinks = sessionsNeedingLinks.length === 0;

    const result = {
      success: true,
      summary: {
        totalSessions: sessions.length,
        sessionsNeedingLinks: sessionsNeedingLinks.length,
        sessionsWithConflicts: 0,
        hasEnoughLinks: hasEnoughLinks,
        canProceed: hasEnoughLinks || hasMinimumLinks, // نسمح بالتفعيل لو عنده الحد الأدنى من الروابط
        linksNeeded: linksNeeded,
        linksAvailable: linksAnalysis.available.length,
        linksReserved: linksAnalysis.reserved.length,
        hasMinimumLinks: hasMinimumLinks,
        note: "Same group can reuse the same link for different sessions"
      },
      links: {
        total: allLinks.length,
        available: linksAnalysis.available.length,
        reserved: linksAnalysis.reserved.length,
        availableLinks: linksAnalysis.available.map(l => ({
          id: l._id,
          name: l.name,
          platform: l.platform,
          link: l.link,
        })),
      },
      sessions: {
        needingLinks: sessionsNeedingLinks.slice(0, 10).map(s => ({
          number: s.index,
          date: s.date.toLocaleDateString(),
          day: s.dayName,
          time: `${s.timeFrom} - ${s.timeTo}`,
        })),
      },
      assignments: sessionsWithLinks.slice(0, 10),
    };

    console.log(`\n📋 Final Analysis:`);
    console.log(`   ${result.summary.hasEnoughLinks ? '✅ ENOUGH LINKS' : '⚠️ NEED AT LEAST ' + linksNeeded + ' LINKS'}`);

    return result;
  } catch (error) {
    console.error("❌ Error checking meeting links:", error);
    return {
      success: false,
      error: error.message,
      summary: {
        hasEnoughLinks: false,
        canProceed: false,
      },
    };
  }
}

/**
 * الحصول على جميع الحجوزات القادمة
 */
export async function getUpcomingReservations(days = 7) {
  try {
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + days);

    const reservedLinks = await MeetingLink.find({
      isDeleted: false,
      status: "reserved",
      "currentReservation.startTime": { $gte: now, $lte: future },
    }).sort({ "currentReservation.startTime": 1 }).lean();

    const reservations = reservedLinks
      .map(link => ({
        linkName: link.name,
        platform: link.platform,
        sessionId: link.currentReservation?.sessionId,
        groupId: link.currentReservation?.groupId,
        startTime: link.currentReservation?.startTime,
        endTime: link.currentReservation?.endTime,
        reservedAt: link.currentReservation?.reservedAt,
      }))
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    return {
      success: true,
      total: reservations.length,
      reservations,
    };
  } catch (error) {
    console.error("❌ Error getting upcoming reservations:", error);
    return {
      success: false,
      error: error.message,
      total: 0,
      reservations: [],
    };
  }
}