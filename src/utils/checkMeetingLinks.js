// → utils/checkMeetingLinks.js  (استبدل الملف القديم بالكامل بده)
import MeetingLink from "../app/models/MeetingLink";
import {
  calculateTotalSessions,
  createFlexibleWeeklySchedule,
} from "./sessionGenerator";

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
 * ✅ عدد السيشنات المطلوبة للجروب — ديناميك من دروس الكورس الفعلية
 * (نفس الدالة اللي بيستخدمها الـ generator). لو الكورس مش populated
 * بنرجع لـ totalSessionsCount المخزّن على الجروب.
 */
function resolveTotalSessions(group) {
  const curriculum = group?.courseId?.curriculum;

  if (Array.isArray(curriculum) && curriculum.length > 0) {
    const calculated = calculateTotalSessions(
      curriculum,
      group.moduleSelection || { mode: "all", selectedModules: [] },
    );
    if (calculated > 0) return calculated;
  }

  return group?.totalSessionsCount || 0;
}

/**
 * ✅ توليد تواريخ الجلسات للتحقق
 * بيستخدم createFlexibleWeeklySchedule عشان التواريخ تبقى مطابقة 100%
 * للتواريخ اللي هتتولد فعليًا عند التفعيل.
 */
export function generateSessionDatesForCheck(group) {
  const { startDate, daysOfWeek, timeFrom, timeTo } = group.schedule;
  const totalSessions = resolveTotalSessions(group);

  if (totalSessions <= 0) return [];

  const dates = createFlexibleWeeklySchedule(
    startDate,
    daysOfWeek,
    totalSessions,
    { silent: true },
  );

  const [fromHours, fromMinutes] = timeFrom.split(":").map(Number);
  const [toHours, toMinutes] = timeTo.split(":").map(Number);

  return dates.map((sessionDate, i) => {
    const startDateTime = new Date(sessionDate);
    startDateTime.setHours(fromHours, fromMinutes, 0, 0);

    const endDateTime = new Date(sessionDate);
    endDateTime.setHours(toHours, toMinutes, 0, 0);

    return {
      index: i + 1,
      date: sessionDate,
      dayName: dayMapReverse[sessionDate.getDay()],
      startTime: startDateTime,
      endTime: endDateTime,
      timeFrom,
      timeTo,
    };
  });
}

/**
 * ✅ Helper function للتحقق من توفر رابط لوقت محدد — بيلف على كل
 * الحجوزات النشطة على اللينك (reservations array)، مش حجز واحد بس
 */
async function checkLinkAvailability(link, startTime, endTime) {
  if (link.status === "available") {
    return true;
  }

  if (link.status !== "reserved") {
    return false;
  }

  const now = new Date();
  const dayName = startTime.toLocaleDateString("en-US", { weekday: "long" });
  const newFrom = `${startTime.getHours().toString().padStart(2, "0")}${startTime.getMinutes().toString().padStart(2, "0")}`;
  const newTo = `${endTime.getHours().toString().padStart(2, "0")}${endTime.getMinutes().toString().padStart(2, "0")}`;

  for (const res of link.reservations || []) {
    if (res.endTime && new Date(res.endTime) < now) continue; // الحجز ده انتهى فعليًا

    // ✅ لو فيه بيانات تكرار (الأيام + الوقت) - استخدمها للمقارنة الصحيحة
    if (res.daysOfWeek?.length && res.timeFrom && res.timeTo) {
      if (!res.daysOfWeek.includes(dayName)) continue; // يوم مختلف - مفيش تعارض مع الحجز ده

      const existFrom = res.timeFrom.replace(":", "");
      const existTo = res.timeTo.replace(":", "");
      const hasTimeConflict = !(newTo <= existFrom || newFrom >= existTo);
      if (hasTimeConflict) return false;
      continue;
    }

    // fallback لحجوزات قديمة بدون بيانات تكرار (قبل التحديث)
    if (res.startTime && res.endTime) {
      const reservedStart = new Date(res.startTime);
      const reservedEnd = new Date(res.endTime);
      if (startTime < reservedEnd && endTime > reservedStart) return false;
    }
  }

  return true;
}

/**
 * ✅ التحقق من توفر الروابط لجدول الجروب (محسّن)
 */
export async function checkMeetingLinksAvailability(group) {
  try {
    console.log(`\n🔍 ========== CHECKING MEETING LINKS AVAILABILITY ==========`);
    console.log(`Group: ${group.name} (${group.code})`);
    console.log(`Group ID: ${group._id}`);
    console.log(
      `Schedule: ${group.schedule.daysOfWeek.length} day(s) per week - ${group.schedule.daysOfWeek.join(", ")}`,
    );
    console.log(
      `Start Date: ${new Date(group.schedule.startDate).toLocaleDateString()}`,
    );
    console.log(`Time: ${group.schedule.timeFrom} - ${group.schedule.timeTo}`);

    // 1. توليد تواريخ الجلسات (نفس تواريخ الـ generator)
    const sessions = generateSessionDatesForCheck(group);
    console.log(`Total Sessions Needed: ${sessions.length}`);
    console.log(`\n📅 Generated ${sessions.length} session dates for checking`);

    // 2. جلب جميع الروابط
    const allLinks = await MeetingLink.find({
      isDeleted: false,
      status: { $in: ["available", "reserved"] },
    })
      .sort({ name: 1 })
      .lean();

    console.log(`\n📊 Total Links in System: ${allLinks.length}`);

    // 3. تحليل كل رابط
    const linksAnalysis = {
      available: [],
      reserved: [],
      maintenance: [],
    };

    allLinks.forEach((link) => {
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
      console.log(
        `   Available links in order: ${linksAnalysis.available.map((l) => l.name).join(" → ")}`,
      );
    }

    // 4. محاكاة توزيع الروابط (نفس الجروب يقدر يعيد استخدام نفس اللينك)
    console.log(
      `\n📊 Simulating link distribution (same group may reuse links)...`,
    );

    // تقدير تقريبي: لينك واحد يكفي 4 جلسات (ديناميك على عدد السيشنات الفعلي)
    const linksNeeded = Math.max(1, Math.ceil(sessions.length / 4));
    const hasMinimumLinks = linksAnalysis.available.length >= linksNeeded;

    const sessionsWithLinks = [];
    const sessionsNeedingLinks = [];

    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      let foundLink = false;

      for (const link of linksAnalysis.available) {
        const isAvailable = await checkLinkAvailability(
          link,
          session.startTime,
          session.endTime,
        );

        if (isAvailable) {
          foundLink = true;
          sessionsWithLinks.push({
            session: i + 1,
            link: link.name,
          });
          break;
        }
      }

      if (!foundLink) {
        sessionsNeedingLinks.push(session);
      }
    }

    console.log(`\n📋 Detailed Analysis:`);
    console.log(
      `   Sessions needing links: ${sessionsNeedingLinks.length}/${sessions.length}`,
    );
    console.log(`   Links needed (minimum): ${linksNeeded}`);
    console.log(`   Links available: ${linksAnalysis.available.length}`);
    console.log(`   Has minimum links: ${hasMinimumLinks ? "✅ YES" : "❌ NO"}`);

    const hasEnoughLinks = sessionsNeedingLinks.length === 0;

    const result = {
      success: true,
      summary: {
        totalSessions: sessions.length,
        sessionsNeedingLinks: sessionsNeedingLinks.length,
        sessionsWithConflicts: 0,
        hasEnoughLinks,
        canProceed: hasEnoughLinks || hasMinimumLinks,
        linksNeeded,
        linksAvailable: linksAnalysis.available.length,
        linksReserved: linksAnalysis.reserved.length,
        hasMinimumLinks,
        note: "Same group can reuse the same link for different sessions",
      },
      links: {
        total: allLinks.length,
        available: linksAnalysis.available.length,
        reserved: linksAnalysis.reserved.length,
        availableLinks: linksAnalysis.available.map((l) => ({
          id: l._id,
          name: l.name,
          platform: l.platform,
          link: l.link,
        })),
      },
      sessions: {
        needingLinks: sessionsNeedingLinks.slice(0, 10).map((s) => ({
          number: s.index,
          date: s.date.toLocaleDateString(),
          day: s.dayName,
          time: `${s.timeFrom} - ${s.timeTo}`,
        })),
      },
      assignments: sessionsWithLinks.slice(0, 10),
    };

    console.log(`\n📋 Final Analysis:`);
    console.log(
      `   ${result.summary.hasEnoughLinks ? "✅ ENOUGH LINKS" : "⚠️ NEED AT LEAST " + linksNeeded + " LINKS"}`,
    );

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
 * ✅ الحصول على جميع الحجوزات القادمة — بيلف على reservations array بتاعة
 * كل اللينكات (مش currentReservation object واحد)
 */
export async function getUpcomingReservations(days = 7) {
  try {
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + days);

    const links = await MeetingLink.find({
      isDeleted: false,
      "reservations.0": { $exists: true },
    }).lean();

    const reservations = [];

    for (const link of links) {
      for (const res of link.reservations || []) {
        if (!res.startTime) continue;
        const start = new Date(res.startTime);
        if (start >= now && start <= future) {
          reservations.push({
            linkName: link.name,
            platform: link.platform,
            sessionId: res.sessionId,
            groupId: res.groupId,
            startTime: res.startTime,
            endTime: res.endTime,
            reservedAt: res.reservedAt,
          });
        }
      }
    }

    reservations.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

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

// ════════════════════════════════════════════════════════════════════════
// ✅ SHARED CORE: فحص تعارض جدول أسبوعي جديد (أيام + من/لـ) مع أي حجز
// موجود على لينك معين. الدالة دي هي المصدر الوحيد لمنطق المقارنة — أي مكان
// في المشروع محتاج يفحص "هل اللينك ده هيتعارض مع الميعاد الجديد" لازم
// يمر من هنا، بدل ما يكرر نفس المقارنة تاني في مكان تاني.
// ════════════════════════════════════════════════════════════════════════

/**
 * ✅ يفحص هل أي حجز في reservations بتاعة لينك معيّن بيتعارض مع جدول
 * أسبوعي جديد. بيدور على كل الحجوزات النشطة (مش حجز واحد بس) ويرجّع أول
 * تعارض بيلاقيه.
 *
 * @param {Object} link            - وثيقة MeetingLink (أو lean object)
 * @param {Object} newSchedule     - { daysOfWeek: string[], timeFrom: "HH:MM", timeTo: "HH:MM" }
 * @param {String} [excludeGroupId] - لو الحجز الحالي لنفس الجروب ده، منعتبروش تعارض
 * @returns {Object|null} تفاصيل التعارض، أو null لو مفيش تعارض
 */
export function findScheduleConflict(link, newSchedule, excludeGroupId = null) {
  const now = new Date();

  for (const res of link.reservations || []) {
    if (!res?.groupId) continue;

    if (
      excludeGroupId &&
      res.groupId?.toString() === excludeGroupId.toString()
    ) {
      continue; // الحجز ده لنفس الجروب اللي بنفحصله — مش تعارض
    }

    if (res.endTime && new Date(res.endTime) < now) continue; // الحجز ده انتهى فعليًا

    const dayOverlap = (newSchedule.daysOfWeek || []).some((d) =>
      (res.daysOfWeek || []).includes(d),
    );
    if (!dayOverlap) continue; // مفيش يوم مشترك مع الحجز ده

    if (!res.timeFrom || !res.timeTo) {
      // حجز قديم من غير بيانات تكرار — نتعامل بحذر ونعتبره تعارض
      return {
        conflictingGroupId: res.groupId,
        conflictingDays: res.daysOfWeek,
        conflictingTime: null,
        reason: "missing_time_data",
      };
    }

    const newFrom = newSchedule.timeFrom.replace(":", "");
    const newTo = newSchedule.timeTo.replace(":", "");
    const existFrom = res.timeFrom.replace(":", "");
    const existTo = res.timeTo.replace(":", "");
    const timeOverlaps = !(newTo <= existFrom || newFrom >= existTo);
    if (!timeOverlaps) continue;

    return {
      conflictingGroupId: res.groupId,
      conflictingDays: res.daysOfWeek,
      conflictingTime: `${res.timeFrom} - ${res.timeTo}`,
    };
  }

  return null;
}

/**
 * ✅ ينضف الحجوزات اليتيمة (orphaned) اللي بتشاور على جروب اتمسح فعليًا من
 * الداتابيز — بيحصل لو جروب اتشال (hard delete) من غير ما حد يفك حجز
 * اللينكات المرتبطة بسيشناته الأول. من غير التنضيف ده، اللينك بيفضل شكله
 * "محجوز" لجروب مبقاش موجود، ويمنع جروبات تانية محتاجة نفس الميعاد فعليًا.
 * بيرجع نسخة منضّفة من نفس الـ links array (وبيحفظ التنضيف في الداتابيز
 * كمان — self-healing).
 */
export async function pruneOrphanedReservations(links) {
  const allGroupIds = [
    ...new Set(
      links.flatMap((l) =>
        (l.reservations || [])
          .map((r) => r.groupId?.toString())
          .filter(Boolean),
      ),
    ),
  ];
  if (allGroupIds.length === 0) return links;

  const GroupModel = (await import("../app/models/Group")).default;
  const liveGroups = await GroupModel.find({
    _id: { $in: allGroupIds },
    isDeleted: false,
  })
    .select("_id")
    .lean();
  const liveGroupIds = new Set(liveGroups.map((g) => g._id.toString()));

  const cleaned = [];
  for (const link of links) {
    const hasOrphan = (link.reservations || []).some(
      (r) => r.groupId && !liveGroupIds.has(r.groupId.toString()),
    );

    if (hasOrphan) {
      try {
        const doc = await MeetingLink.findById(link._id);
        if (doc) {
          const before = doc.reservations.length;
          doc.reservations = doc.reservations.filter(
            (r) => !r.groupId || liveGroupIds.has(r.groupId.toString()),
          );
          doc.status = doc.reservations.length > 0 ? "reserved" : "available";
          doc.metadata.updatedAt = new Date();
          await doc.save();
          console.log(
            `🧹 Pruned ${before - doc.reservations.length} orphaned reservation(s) on link ${link.name}`,
          );
        }
      } catch (e) {
        console.error("⚠️ prune orphaned reservations failed:", e.message);
      }
    }

    cleaned.push({
      ...link,
      reservations: (link.reservations || []).filter(
        (r) => !r.groupId || liveGroupIds.has(r.groupId.toString()),
      ),
    });
  }
  return cleaned;
}

/**
 * ✅ يفحص صحة اللينكات لمجموعة جروبات دفعة واحدة (query واحد على Session
 * وواحد على MeetingLink، مش N+1) — بيرجع Map<groupId, {missingCount,
 * orphanedCount, hasIssue}>. بيتستخدم في شاشة الليستة (GroupsAdmin) عشان
 * نعرض تحذير على الجروب اللي فيه سيشن من غير لينك، أو سيشن لينكها اتمسح.
 */
export async function getSessionsLinkHealthForGroups(groupIds) {
  if (!groupIds?.length) return new Map();

  const Session = (await import("../app/models/Session")).default;

  const sessions = await Session.find({
    groupId: { $in: groupIds },
    isDeleted: false,
    status: { $ne: "completed" },
    deliveryMode: { $ne: "offline" }, // ✅ الأوفلاين مالوش لينكات أصلاً
  })
    .select("groupId meetingLink meetingLinkId")
    .lean();

  const referencedLinkIds = [
    ...new Set(
      sessions
        .filter((s) => s.meetingLinkId)
        .map((s) => s.meetingLinkId.toString()),
    ),
  ];

  const existingLinkIds = referencedLinkIds.length
    ? new Set(
        (
          await MeetingLink.find({
            _id: { $in: referencedLinkIds },
            isDeleted: false,
          })
            .select("_id")
            .lean()
        ).map((l) => l._id.toString()),
      )
    : new Set();

  const health = new Map();

  for (const s of sessions) {
    const gid = s.groupId.toString();
    if (!health.has(gid))
      health.set(gid, { missingCount: 0, orphanedCount: 0, hasIssue: false });
    const entry = health.get(gid);

    if (s.meetingLinkId) {
      if (!existingLinkIds.has(s.meetingLinkId.toString())) {
        entry.orphanedCount++;
        entry.hasIssue = true;
      }
    } else if (!s.meetingLink) {
      entry.missingCount++;
      entry.hasIssue = true;
    }
  }

  return health;
}

/**
 * ✅ يفحص مجموعة لينكات (بالـ id) قبل ما تتحجز/تتستخدم لجروب على جدول
 * جديد. بيتستخدم في أي حالة عاوزين نتأكد فيها إن اللينكات دي فاضية فعليًا
 * على الأيام/الأوقات دي — سواء وقت توليد سيشنز جديدة، resync الموديولات،
 * أو أي تعديل تاني على جدول الجروب.
 *
 * @param {String[]} linkIds
 * @param {Object}   newSchedule    - { daysOfWeek, timeFrom, timeTo }
 * @param {String}   [excludeGroupId] - جروب مستثنى من الفحص (بيستخدم نفس اللينكات أصلاً)
 * @returns {{hasConflicts: boolean, conflicts: Array}}
 */
export async function checkLinksConflictForSchedule(
  linkIds,
  newSchedule,
  excludeGroupId = null,
) {
  if (!linkIds?.length) return { hasConflicts: false, conflicts: [] };

  const MeetingLinkModel = (await import("../app/models/MeetingLink")).default;
  const links = await MeetingLinkModel.find({
    _id: { $in: linkIds },
    isDeleted: false,
  }).lean();

  const conflicts = [];
  for (const link of links) {
    const conflict = findScheduleConflict(link, newSchedule, excludeGroupId);
    if (conflict) {
      conflicts.push({
        linkId: link._id,
        linkName: link.name,
        ...conflict,
      });
    }
  }

  return { hasConflicts: conflicts.length > 0, conflicts };
}

/**
 * ✅ فحص هل اللينكات المستخدمة حاليًا في سيشنات الجروب (غير الـ completed)
 * لسه متاحة للجدول الجديد (daysOfWeek/timeFrom/timeTo).
 * بيبني قائمة اللينكات من سيشنات الجروب نفسها، وبعدين بيمرر الفحص الفعلي
 * لـ checkLinksConflictForSchedule (نفس المصدر اللي بيستخدمه أي فحص تاني).
 */
export async function checkLinksForRescheduledSchedule(groupId, newSchedule) {
  const Session = (await import("../app/models/Session")).default;

  const sessions = await Session.find({
    groupId,
    isDeleted: false,
    status: { $ne: "completed" },
    meetingLinkId: { $ne: null },
  })
    .select("_id title moduleIndex sessionNumber meetingLinkId")
    .lean();

  if (sessions.length === 0) {
    return { hasConflicts: false, conflicts: [] };
  }

  const linkIds = [...new Set(sessions.map((s) => s.meetingLinkId.toString()))];

  const { conflicts: rawConflicts } = await checkLinksConflictForSchedule(
    linkIds,
    newSchedule,
    groupId, // الحجز الحالي بتاع نفس الجروب ده مش تعارض
  );

  const conflicts = rawConflicts.map((c) => ({
    ...c,
    affectedSessions: sessions
      .filter((s) => s.meetingLinkId.toString() === c.linkId.toString())
      .map((s) => ({ sessionId: s._id, title: s.title })),
  }));

  return { hasConflicts: conflicts.length > 0, conflicts };
}