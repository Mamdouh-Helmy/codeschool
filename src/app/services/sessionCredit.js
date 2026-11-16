// services/sessionCredit.js
// ✅ حساب مدة السيشن وتوقيت تنبيهات الرصيد بشكل Dynamic

const DEFAULT_SESSION_HOURS = 2; // fallback أخير لو مفيش أي أوقات صالحة
const EPS = 0.001;

function toMinutes(t) {
  if (typeof t !== "string") return null;
  const [h, m] = t.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

/**
 * مدة السيشن بالساعات = To - From
 * الأولوية: startTime/endTime بتاع السيشن، ثم schedule.timeFrom/timeTo بتاع الجروب
 */
export function getSessionHours(session) {
  const group = session?.groupId;
  const pairs = [
    [session?.startTime, session?.endTime],
    [group?.schedule?.timeFrom, group?.schedule?.timeTo],
  ];

  for (const [from, to] of pairs) {
    const a = toMinutes(from);
    const b = toMinutes(to);
    if (a === null || b === null) continue;

    let diff = b - a;
    if (diff < 0) diff += 24 * 60; // سيشن بتعدي نص الليل
    if (diff > 0) return Math.round((diff / 60) * 100) / 100;
  }

  return DEFAULT_SESSION_HOURS;
}

/**
 * عدد السيشنات المتبقية (بالتقريب لأعلى لو فيه جزء من سيشن)
 */
export function getSessionsLeft(remainingHours, sessionHours) {
  if (!sessionHours || sessionHours <= 0) return 0;
  if (remainingHours <= EPS) return 0;
  return Math.ceil(remainingHours / sessionHours - EPS);
}

/**
 * نوع التنبيه بعد الخصم:
 *   "4h" → باقي سيشن واحدة (بتتبعت مرة واحدة بس، لحظة الانتقال من 2+ إلى 1)
 *   "2h" → الباقة خلصت (بعد آخر سيشن)
 *   null → مفيش تنبيه
 */
export function getBalanceAlertType({ previousBalance, remainingHours, sessionHours }) {
  if (remainingHours <= EPS) return "2h";

  const leftNow = getSessionsLeft(remainingHours, sessionHours);
  const leftBefore = getSessionsLeft(previousBalance, sessionHours);

  if (leftNow === 1 && leftBefore > 1) return "4h";
  return null;
}