// utils/courseSessionSlots.js
//
// ✅ مصدر الحقيقة الوحيد لتحديد "سيشنات" أي موديول.
//   - كل lesson عنده sessionNumber (بيتحط من فورم الكورس)
//   - بنجمع الدروس حسب sessionNumber → كل مجموعة = سيشن واحدة
//   - لو الداتا قديمة / ناقصة → fallback لتوزيع كل درسين في سيشن
//
// الترتيب دايمًا: الموديولات بترتيب الكاريكولم الأصلي (تصاعدي)،
// وجوه كل موديول السيشنز بترتيب sessionNumber تصاعدي.

const FALLBACK_LESSONS_PER_SESSION = 2;

/**
 * يرجّع سيشنات الموديول: [{ sessionNumber, lessonIndexes }]
 * lessonIndexes = أماكن الدروس جوه module.lessons[] (مش lesson.order)
 */
export function getModuleSessionSlots(module) {
  const lessons = Array.isArray(module?.lessons) ? module.lessons : [];
  if (lessons.length === 0) return [];

  const rawNumbers = lessons.map((l) => Math.floor(Number(l?.sessionNumber)));

  // الداتا القديمة ممكن يكون كل الدروس sessionNumber = 1 (default الـ schema)
  // وهما أكتر من درسين → نعتبر الداتا مش موثوقة ونرجع للتوزيع الافتراضي
  const allOnes = rawNumbers.every((n) => n === 1);
  const hasInvalid = rawNumbers.some((n) => !Number.isFinite(n) || n < 1);
  const useFallback =
    hasInvalid || (allOnes && lessons.length > FALLBACK_LESSONS_PER_SESSION);

  const bySession = new Map();

  lessons.forEach((_, idx) => {
    const sessionNumber = useFallback
      ? Math.floor(idx / FALLBACK_LESSONS_PER_SESSION) + 1
      : rawNumbers[idx];

    if (!bySession.has(sessionNumber)) bySession.set(sessionNumber, []);
    bySession.get(sessionNumber).push(idx);
  });

  // (اتشال تحذير totalSessions: القيمة القديمة مبقتش مصدر حقيقة
  //  وكان بيعمل زحمة logs)
  return [...bySession.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([sessionNumber, lessonIndexes]) => ({
      sessionNumber,
      lessonIndexes: lessonIndexes.sort((a, b) => a - b),
    }));
}

export function countModuleSessions(module) {
  return getModuleSessionSlots(module).length;
}

/**
 * الموديولات المختارة بترتيب الكاريكولم (تصاعدي + من غير تكرار).
 * [{ module, originalIndex }]
 */
export function resolveModulesToUse(
  curriculum,
  moduleSelection = { mode: "all", selectedModules: [] },
) {
  if (!Array.isArray(curriculum)) return [];

  const selection = moduleSelection || { mode: "all", selectedModules: [] };

  const indexes =
    selection.mode === "all"
      ? curriculum.map((_, i) => i)
      : [...new Set((selection.selectedModules || []).map(Number))]
          .filter((i) => Number.isInteger(i) && i >= 0 && i < curriculum.length)
          .sort((a, b) => a - b);

  return indexes.map((i) => ({ module: curriculum[i], originalIndex: i }));
}

/**
 * القايمة الكاملة المرتبة لكل السيشنات المطلوبة:
 * [{ module, moduleIndex, sessionNumber, lessonIndexes }]
 * الموديولات اللي مفيهاش دروس بتتخطى.
 */
export function buildSessionSlotsForModules(
  curriculum,
  moduleSelection = { mode: "all", selectedModules: [] },
) {
  const result = [];

  for (const { module, originalIndex } of resolveModulesToUse(
    curriculum,
    moduleSelection,
  )) {
    const slots = getModuleSessionSlots(module);

    if (slots.length === 0) {
      console.warn(
        `⚠️ Module ${originalIndex + 1} ("${module?.title}") has no lessons — skipped`,
      );
      continue;
    }

    for (const slot of slots) {
      result.push({
        module,
        moduleIndex: originalIndex,
        sessionNumber: slot.sessionNumber,
        lessonIndexes: slot.lessonIndexes,
      });
    }
  }

  return result;
}