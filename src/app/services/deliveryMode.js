// /src/app/services/deliveryMode.js
// ═══════════════════════════════════════════════════════════════════════════
// ✅ مصدر واحد لتحديد نوع التسليم (online / offline)
// الأولوية: الجروب ← السيشن ← "online"
// الجروب هو الـ Source of Truth، والسيشن مجرد snapshot ممكن يبقى قديم.
// ═══════════════════════════════════════════════════════════════════════════

const VALID = ["online", "offline"];

export function normalizeDeliveryMode(mode) {
  return VALID.includes(mode) ? mode : null;
}

/**
 * @param {Object} session - السيشن (lean أو document)
 * @param {Object} [group] - الجروب (لو مش متبعت بنقراه من session.groupId لو populated)
 */
export function resolveDeliveryMode(session, group) {
  const g = group ?? session?.groupId;

  // لو groupId لسه ObjectId (مش populated) مفيهوش deliveryMode فهنكمل للسيشن
  const fromGroup = normalizeDeliveryMode(g?.deliveryMode);
  if (fromGroup) return fromGroup;

  const fromSession = normalizeDeliveryMode(session?.deliveryMode);
  if (fromSession) return fromSession;

  return "online";
}

export function isOfflineDelivery(session, group) {
  return resolveDeliveryMode(session, group) === "offline";
}