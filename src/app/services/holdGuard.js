// /src/app/services/holdGuard.js
// ═══════════════════════════════════════════════════════════════════════════
// ✅ مصدر واحد للـ Hold (كان منسوخ في 4 ملفات)
// الـ Hold بيمنع الرسائل/الحضور بس — مش حساب مستحقات المدرس.
// ═══════════════════════════════════════════════════════════════════════════
import Session from "../models/Session";

export function sortSessionsForHold(sessions) {
  return [...sessions].sort((a, b) => {
    if (a.moduleIndex !== b.moduleIndex) return a.moduleIndex - b.moduleIndex;
    if (a.sessionNumber !== b.sessionNumber) return a.sessionNumber - b.sessionNumber;
    return new Date(a.scheduledDate) - new Date(b.scheduledDate);
  });
}

export function isSessionLockedByHold(session, group, allGroupSessions) {
  if (!group?.hold?.isHeld) return false;
  if (session?.status === "completed") return false;

  const hold = group.hold;

  // A/B/C: indefinite (permanent) + duration → كل سيشنات الجروب مقفولة
  if (hold.holdType === "indefinite" || hold.holdType === "duration") return true;
  if (!Array.isArray(allGroupSessions) || allGroupSessions.length === 0) return true;

  const sorted = sortSessionsForHold(allGroupSessions);
  const myIndex = sorted.findIndex((s) => String(s._id) === String(session._id));
  if (myIndex === -1) return false;

  // legacy: N سيشنات أولى
  if (hold.holdType === "sessions") {
    const consumed = hold.holdSessionsConsumed || 0;
    if (consumed === 0) return true;
    return myIndex < consumed;
  }

  // until_session: من أول الترتيب لحد السيشن المستهدفة (شاملة)
  if (hold.holdType === "until_session") {
    const targetId = hold.holdUntilSessionId;
    if (!targetId) return true;
    const targetIndex = sorted.findIndex((s) => String(s._id) === String(targetId));
    if (targetIndex === -1) return true;
    return myIndex <= targetIndex;
  }

  return false;
}

/** بيجيب سيشنات الجروب ويحدد هل السيشن دي مقفولة (boolean) */
export async function resolveSessionLock(session, group) {
  if (!group?.hold?.isHeld) return false;

  const allGroupSessions = await Session.find({
    groupId: group._id,
    isDeleted: false,
  })
    .select("_id moduleIndex sessionNumber scheduledDate status")
    .lean();

  return isSessionLockedByHold(
    {
      _id: session._id,
      moduleIndex: session.moduleIndex,
      sessionNumber: session.sessionNumber,
      status: session.status,
    },
    group,
    allGroupSessions,
  );
}