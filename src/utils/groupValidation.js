// utils/groupValidation.js
import Group from "../app/models/Group";

// ✅ الجروب إما أطفال أو بالغين
export const VALID_GROUP_TYPES = ["kids", "adults"];

// ─────────────────────────────────────────────────────────────────────────────
// ✅ فحص الاسم المكرر — من غير regex خالص.
// بنستخدم Collation (strength: 2) يعني المقارنة case-insensitive ومطابقة تامة،
// وأي رموز زي \ | _ - + = ( ) * & ^ % $ # @ ! بتتعامل كنص عادي.
// ─────────────────────────────────────────────────────────────────────────────
export async function findDuplicateGroupName(name, excludeId = null) {
  const cleanName = String(name ?? "").trim();
  if (!cleanName) return null;

  const query = { name: cleanName, isDeleted: false };
  if (excludeId) query._id = { $ne: excludeId };

  return Group.findOne(query)
    .collation({ locale: "en", strength: 2 })
    .select("_id name code")
    .lean();
}

// ─── Time helpers ────────────────────────────────────────────────────────────
const toMinutes = (hhmm) => {
  if (!hhmm || typeof hhmm !== "string") return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

// ─────────────────────────────────────────────────────────────────────────────
// ✅ تعارض المدرسين — بيرفض بس لو نفس المدرس موجود في جروب تاني
// في نفس اليوم ونفس الوقت (تداخل فعلي). جروبين بنفس الميعاد ومدرسين
// مختلفين (أو من غير مدرسين) = مفيش تعارض.
// ─────────────────────────────────────────────────────────────────────────────
export async function checkInstructorConflicts(
  instructors,
  schedule,
  excludeGroupId = null,
) {
  if (!instructors || instructors.length === 0 || !schedule) return [];

  const newDays = schedule.daysOfWeek || [];
  const newFrom = toMinutes(schedule.timeFrom);
  const newTo = toMinutes(schedule.timeTo);
  if (!newDays.length || newFrom === null || newTo === null) return [];

  const instructorIds = [
    ...new Set(
      instructors
        .map((i) => (i?.userId?._id || i?.userId || i)?.toString())
        .filter(Boolean),
    ),
  ];
  if (!instructorIds.length) return [];

  const query = {
    "instructors.userId": { $in: instructorIds },
    isDeleted: false,
    status: { $in: ["draft", "active"] },
  };
  if (excludeGroupId) query._id = { $ne: excludeGroupId };

  const candidates = await Group.find(query)
    .populate("instructors.userId", "name")
    .select("name code schedule instructors")
    .lean();

  const conflicts = [];

  for (const g of candidates) {
    const es = g.schedule;
    if (!es) continue;

    const overlapDays = newDays.filter((d) => es.daysOfWeek?.includes(d));
    if (!overlapDays.length) continue;

    const existFrom = toMinutes(es.timeFrom) ?? 0;
    const existTo = toMinutes(es.timeTo) ?? 24 * 60;
    const timeOverlap = newFrom < existTo && existFrom < newTo;
    if (!timeOverlap) continue;

    // المدرسين المشتركين بس هما اللي فيهم تعارض
    for (const entry of g.instructors || []) {
      const entryId = (entry.userId?._id || entry.userId)?.toString();
      if (!entryId || !instructorIds.includes(entryId)) continue;

      conflicts.push({
        instructorId: entryId,
        instructorName: entry.userId?.name || "المدرب",
        conflictGroupName: g.name,
        conflictGroupCode: g.code,
        conflictDays: overlapDays,
        conflictTime: `${es.timeFrom} - ${es.timeTo}`,
      });
    }
  }

  return conflicts;
}

export function buildConflictResponseBody(conflicts) {
  return {
    success: false,
    error: "تعارض في مواعيد المدربين",
    conflictType: "instructor_schedule",
    conflicts,
    conflictMessage: conflicts
      .map(
        (c) =>
          `المدرب "${c.instructorName}" موجود بالفعل في مجموعة "${c.conflictGroupName}" في نفس الموعد (${c.conflictDays.join("، ")} - ${c.conflictTime})`,
      )
      .join("\n"),
  };
}