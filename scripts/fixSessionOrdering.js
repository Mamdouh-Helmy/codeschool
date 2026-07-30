// scripts/fixSessionOrdering.js
//
// يصلح ترتيب تواريخ السيشنز اللي اتلخبطت بسبب postpone/reschedule فردي
// من غير ما فيه validation على الترتيب.
//
// - بيعيد ترتيب تواريخ السيشنز الـ NON-completed لكل جروب، بالترتيب الصح
//   (moduleIndex, sessionNumber) وبنفس الجدول الأسبوعي بتاع الجروب.
// - مبيلمسش السيشنز اللي status = completed (دي حصلت فعليًا، منقدرش نغير تاريخها).
// - بينضف الـ pendingReschedule القديمة المتلخبطة من كل السيشنز.
// - بيعمل log تحذيري لو لقى completed sessions ترتيبها غلط تاريخيًا (يدوي المراجعة).
//
// شغّله بـ: node scripts/fixSessionOrdering.js
// ⚠️ جرب أول حاجة على نسخة/بيئة staging، أو خد backup للـ sessions collection قبل ما تشغله على production.

import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb.js";
import Group from "../app/models/Group.js";
import Session from "../app/models/Session.js";
import { rescheduleGroupSessions } from "../utils/sessionGenerator.js";

const dayMap = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

// ✏️ حط هنا ObjectId بتاع أدمن حقيقي عشان يتسجل في metadata.lastModifiedBy
const SYSTEM_ADMIN_ID = "REPLACE_WITH_REAL_ADMIN_OBJECT_ID";

function nextOccurrence(daysOfWeek, from = new Date()) {
  const wanted = daysOfWeek.map((d) => dayMap[d]);
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 8; i++) {
    if (wanted.includes(d.getDay())) return d;
    d.setDate(d.getDate() + 1);
  }
  return from;
}

async function main() {
  await connectDB();

  const groups = await Group.find({
    isDeleted: false,
    status: { $in: ["active"] },
  }).populate("courseId");

  console.log(`🔍 هفحص ${groups.length} جروب active`);

  let fixedGroups = 0;
  let flaggedCompleted = 0;
  let skipped = 0;

  for (const group of groups) {
    const sessions = await Session.find({
      groupId: group._id,
      isDeleted: false,
    }).sort({ moduleIndex: 1, sessionNumber: 1 });

    if (sessions.length === 0) continue;

    // 1) هل الترتيب فعلاً متلخبط؟ (تاريخ السيشن اللي بعده لازم يكون بعد اللي قبله)
    let broken = false;
    for (let i = 1; i < sessions.length; i++) {
      if (
        new Date(sessions[i].scheduledDate) <
        new Date(sessions[i - 1].scheduledDate)
      ) {
        broken = true;
        break;
      }
    }

    // 2) نعلّم على الـ completed اللي ترتيبها غلط (من غير ما نغيرها)
    const completed = sessions.filter((s) => s.status === "completed");
    for (let i = 1; i < completed.length; i++) {
      if (
        new Date(completed[i].scheduledDate) <
        new Date(completed[i - 1].scheduledDate)
      ) {
        flaggedCompleted++;
        console.warn(
          `⚠️ [${group.name}] completed session ترتيبها غلط: "${completed[i].title}" ` +
            `(${completed[i].scheduledDate.toISOString().split("T")[0]}) قبل ` +
            `"${completed[i - 1].title}" (${completed[i - 1].scheduledDate.toISOString().split("T")[0]})`,
        );
      }
    }

    if (!broken) {
      console.log(`✅ [${group.name}] الترتيب سليم، هتخطاه`);
      skipped++;
    } else {
      // 3) نصلح الـ non-completed: نرتبهم من جديد بالتسلسل الصح
      const effectiveFrom = nextOccurrence(group.schedule.daysOfWeek, new Date());

      const result = await rescheduleGroupSessions(
        group._id,
        group,
        {
          effectiveFrom,
          daysOfWeek: group.schedule.daysOfWeek,
          timeFrom: group.schedule.timeFrom,
          timeTo: group.schedule.timeTo,
          timezone: group.schedule.timezone,
        },
        SYSTEM_ADMIN_ID,
      );

      console.log(
        `🔧 [${group.name}] اتصلح ترتيب ${result.regenerated} سيشن (${completed.length} completed اتسابوا زي ما هما)`,
      );
      fixedGroups++;
    }

    // 4) ننضف الـ pendingReschedule القديمة المتلخبطة من كل سيشنز الجروب
    await Session.updateMany(
      { groupId: group._id, isDeleted: false, pendingReschedule: { $exists: true } },
      { $unset: { pendingReschedule: "" } },
    );
  }

  console.log(`\n✅ خلصنا.`);
  console.log(`   🔧 اتصلح ترتيبهم: ${fixedGroups} جروب`);
  console.log(`   ✅ كانوا سليمين: ${skipped} جروب`);
  if (flaggedCompleted > 0) {
    console.log(
      `   ⚠️ ${flaggedCompleted} completed session(s) ترتيبها غلط تاريخيًا — دول محتاجين مراجعة يدوية، السكريبت ماعدلهمش.`,
    );
  }

  await mongoose.connection.close();
}

main().catch((e) => {
  console.error("❌ فشل السكريبت:", e);
  process.exit(1);
});