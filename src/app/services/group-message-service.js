// src/app/services/group-message-service.js
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Group from "../models/Group.js";
import Session from "../models/Session.js";
import TemplateVariable from "../models/TemplateVariable.js";
import "../models/Course.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import wapilotService from "./wapilot-service.js";
import {
  ALL_DB_KEYS,
  AUDIENCE,
  AUDIENCE_TYPES,
  CHILD_TITLE_DB_KEYS,
  MAX_MESSAGE_LENGTH,
  RECIPIENT_TYPE,
  SALUTATION_DB_KEYS,
  composeMessage,
  fallbackChildTitle,
  fallbackSalutation,
  findInapplicableVariables,
  findUnknownVariables,
  getAllTemplateTexts,
  getCreditLevel,
  normalizeGender,
  normalizeLanguage,
  normalizeOverrides,
  selectRecipients,
} from "../../utils/groupMessageShared.js";
import { isStudentPausedInGroup } from "./holdGuard.js";

const SEND_DELAY_MS = 800; // فاصل بين الرسايل عشان نتجنب حظر واتساب

export class GroupMessageError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function assertNotArchived(group) {
  if (group.isArchived) {
    throw new GroupMessageError("الجروب مؤرشف — استرجعه من الأرشيف الأول", 403);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const firstWord = (s) => String(s || "").trim().split(/\s+/)[0] || "";
const namesOf = (nickname, fullName) => ({
  ar: nickname?.ar || firstWord(fullName),
  en: nickname?.en || firstWord(fullName),
});

// ─── Loading ─────────────────────────────────────────────────────────────────

async function loadGroup(groupId) {
  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    throw new GroupMessageError("Invalid group ID", 400);
  }
  await connectDB();

  const group = await Group.findOne({ _id: groupId, isDeleted: false })
    .populate("courseId", "title")
    .populate(
      "students",
      "personalInfo guardianInfo communicationPreferences studentType isDeleted creditSystem.currentPackage academicInfo.pausedGroups",
    )
    .populate("instructors.userId", "name gender language profile")
    .lean();

  if (!group) throw new GroupMessageError("Group not found", 404);
  return group;
}

const SESSION_FIELDS = "title scheduledDate sessionNumber meetingLink startTime endTime deliveryMode";

/**
 * سياق السيشنات للجروب:
 *  - nextSession: أقرب حصة لسه ماخلصتش (الجروب التعويضي: لو مفيش قادمة بناخد آخر سيشن ليه)
 *  - linkFallback: أي لينك ميتنج لقيناه في سيشنات الجروب لو الحصة القادمة معندهاش لينك
 */
async function loadSessionContext(group) {
  const empty = { nextSession: null, linkFallback: "" };
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const upcoming = await Session.find({
      groupId: group._id,
      isDeleted: false,
      status: { $in: ["scheduled", "postponed"] },
      scheduledDate: { $gte: startOfToday },
    })
      .sort({ scheduledDate: 1, startTime: 1 })
      .limit(8)
      .select(SESSION_FIELDS)
      .lean();

    // نتخطى حصة النهارده لو معادها خلص (نفس طريقة Session.fullDateTime)
    const now = new Date();
    let nextSession =
      upcoming.find((s) => {
        const [h, m] = String(s.endTime || s.startTime || "23:59").split(":").map(Number);
        const end = new Date(s.scheduledDate);
        end.setHours(h || 0, m || 0, 0, 0);
        return end > now;
      }) || null;
    let linkFallback = upcoming.find((s) => s.meetingLink)?.meetingLink || "";

    // الجروب التعويضي: سيشن واحدة — لو خلصت أو معندهاش لينك نقرا من السيشن نفسها
    if (group.isMakeupGroup && (!nextSession || !linkFallback)) {
      const own = await Session.find({
        groupId: group._id,
        isDeleted: false,
        status: { $ne: "cancelled" },
      })
        .sort({ scheduledDate: -1 })
        .limit(3)
        .select(SESSION_FIELDS)
        .lean();
      nextSession = nextSession || own[0] || null;
      linkFallback = linkFallback || own.find((s) => s.meetingLink)?.meetingLink || "";
    }

    return { nextSession, linkFallback };
  } catch (error) {
    console.warn("⚠️ group-message: could not load sessions:", error.message);
    return empty;
  }
}

/** الجروب الأصلي للجروب التعويضي (مصدر احتياطي للمكان/الخريطة) */
async function loadOriginalGroup(group) {
  const originalId = group.isMakeupGroup ? group.makeupInfo?.originalGroupId : null;
  if (!originalId) return null;
  try {
    return await Group.findById(originalId)
      .select("deliveryMode location locationDetails firstMeetingLink")
      .lean();
  } catch (error) {
    console.warn("⚠️ group-message: could not load original group:", error.message);
    return null;
  }
}

/** متغيرات التحية المسجلة في الداتابيز (TemplateVariable) */
async function loadTemplateDocs() {
  try {
    const docs = await TemplateVariable.find({ isActive: true, key: { $in: ALL_DB_KEYS } }).lean();
    return new Map(docs.map((d) => [d.key, d]));
  } catch (error) {
    console.warn("⚠️ group-message: could not load template variables:", error.message);
    return new Map();
  }
}

async function loadContext(groupId) {
  const group = await loadGroup(groupId);
  const [sessionCtx, docs, originalGroup] = await Promise.all([
    loadSessionContext(group),
    loadTemplateDocs(),
    loadOriginalGroup(group),
  ]);
  return { group, docs, originalGroup, ...sessionCtx };
}

// ─── DB-driven wording (التحية وعنوان الابن/الابنة) ──────────────────────────

/** القيمة المناسبة من TemplateVariable حسب اللغة والجنس (نفس منطق getVarsMap) */
function dbValue(doc, lang, gender) {
  if (!doc) return "";
  const L = lang === "ar" ? "Ar" : "En";
  let value = "";
  if (doc.hasGender) {
    const female = gender === "female";
    value =
      doc.genderType === "guardian"
        ? doc[`value${female ? "Mother" : "Father"}${L}`]
        : doc[`value${female ? "Female" : "Male"}${L}`];
  }
  return String(value || doc[`value${L}`] || "").trim();
}

function createResolvers(docs) {
  const fallbackKeys = new Set();

  const resolve = (key, lang, gender, fallback) => {
    const value = dbValue(docs.get(key), lang, gender);
    if (value) return value;
    fallbackKeys.add(key);
    return fallback();
  };

  const salutation = (type, gender) => ({
    ar: resolve(SALUTATION_DB_KEYS[type].ar, "ar", gender, () => fallbackSalutation(type, "ar", gender)),
    en: resolve(SALUTATION_DB_KEYS[type].en, "en", gender, () => fallbackSalutation(type, "en", gender)),
  });

  const childTitle = (studentGender) => ({
    ar: resolve(CHILD_TITLE_DB_KEYS.ar, "ar", studentGender, () => fallbackChildTitle("ar", studentGender)),
    en: resolve(CHILD_TITLE_DB_KEYS.en, "en", studentGender, () => fallbackChildTitle("en", studentGender)),
  });

  return { salutation, childTitle, fallbackKeys };
}

// ─── Mappers: DB → recipient (شكل موحد لكل الأنواع) ──────────────────────────

const withPhone = (recipient, rawPhone) => ({
  ...recipient,
  phone: wapilotService.preparePhoneNumber(rawPhone) || "",
});

function creditOf(student) {
  const pkg = student.creditSystem?.currentPackage;
  if (!pkg) return { hasPackage: false, level: "none" };
  const remainingHours = pkg.remainingHours ?? 0;
  return {
    hasPackage: true,
    remainingHours,
    totalHours: pkg.totalHours ?? 0,
    packageName: pkg.packageName || "",
    endDate: pkg.endDate || null,
    level: getCreditLevel(remainingHours),
  };
}

function studentRecipient(s, res) {
  const info = s.personalInfo || {};
  const names = namesOf(info.nickname, info.fullName);
  const gender = normalizeGender(info.gender);
  return withPhone(
    {
      key: `${RECIPIENT_TYPE.STUDENT}:${s._id}`,
      type: RECIPIENT_TYPE.STUDENT,
      refId: String(s._id),
      studentId: String(s._id),
      gender,
      language: normalizeLanguage(s.communicationPreferences?.preferredLanguage),
      names,
      fullName: info.fullName || "",
      studentNames: names,
      studentGender: gender,
      salutation: res.salutation(RECIPIENT_TYPE.STUDENT, gender),
      childTitle: null,
      credit: creditOf(s),
    },
    info.whatsappNumber || info.phone,
  );
}

function guardianRecipient(s, res) {
  const info = s.personalInfo || {};
  const guardian = s.guardianInfo || {};
  const gender = guardian.relationship === "mother" ? "female" : "male";
  const studentGender = normalizeGender(info.gender);
  return withPhone(
    {
      key: `${RECIPIENT_TYPE.GUARDIAN}:${s._id}`,
      type: RECIPIENT_TYPE.GUARDIAN,
      refId: String(s._id),
      studentId: String(s._id),
      gender,
      language: normalizeLanguage(s.communicationPreferences?.preferredLanguage),
      names: namesOf(guardian.nickname, guardian.name),
      fullName: guardian.name || "",
      studentNames: namesOf(info.nickname, info.fullName),
      studentGender,
      salutation: res.salutation(RECIPIENT_TYPE.GUARDIAN, gender),
      childTitle: res.childTitle(studentGender),
      credit: creditOf(s), // رصيد الابن/الطالب
    },
    guardian.whatsappNumber || guardian.phone,
  );
}

function instructorRecipient(user, res) {
  const gender = normalizeGender(user.gender);
  return withPhone(
    {
      key: `${RECIPIENT_TYPE.INSTRUCTOR}:${user._id}`,
      type: RECIPIENT_TYPE.INSTRUCTOR,
      refId: String(user._id),
      studentId: null,
      gender,
      language: normalizeLanguage(user.language),
      names: { ar: firstWord(user.name), en: firstWord(user.name) },
      fullName: user.name || "",
      studentNames: { ar: "", en: "" },
      studentGender: "male",
      salutation: res.salutation(RECIPIENT_TYPE.INSTRUCTOR, gender),
      childTitle: null,
      credit: null,
    },
    user.profile?.phone,
  );
}

function buildRecipients(group, res, { includePaused = false } = {}) {
  const all = (group.students || []).filter((s) => s && !s.isDeleted);
  const isPaused = (s) => isStudentPausedInGroup(s, group._id);

  // ✅ الطالب الموقوف في الجروب ده مخفي: لا هو ولا ولي أمره
  const students = includePaused ? all : all.filter((s) => !isPaused(s));
  const instructors = (group.instructors || []).map((i) => i.userId).filter((u) => u?._id);

  return [
    ...students.map((s) => ({ ...studentRecipient(s, res), paused: isPaused(s) })),
    // البالغين مفيش ليهم ولي أمر
    ...students
      .filter((s) => s.studentType !== "adults")
      .map((s) => ({ ...guardianRecipient(s, res), paused: isPaused(s) })),
    ...instructors.map((u) => instructorRecipient(u, res)),
  ];
}

/** المكان: الجروب أولاً، وللتعويضي الجروب الأصلي، وآخر حاجة بحث جوجل ماب بالاسم/العنوان */
function resolveLocation(group, original) {
  const read = (g) => {
    const d = g?.locationDetails || {};
    return {
      placeName: d.placeName || g?.location || "",
      address: d.address || d.extraDetails || "",
      lat: d.lat ?? null,
      lng: d.lng ?? null,
    };
  };
  const own = read(group);
  const orig = original ? read(original) : null;

  const placeName = own.placeName || orig?.placeName || "";
  const address = own.address || orig?.address || "";
  const coords = [own, orig].find((l) => l && l.lat != null && l.lng != null);
  const query = [placeName, address].filter(Boolean).join(" ");

  let mapsLink = "";
  if (coords) mapsLink = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
  else if (query) mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return { placeName, address, mapsLink };
}

function buildGroupInfo(group, { nextSession = null, linkFallback = "", originalGroup = null } = {}) {
  // التعويضي: لو السيشن نفسها أوفلاين نعتبر الجروب أوفلاين
  const isOffline =
    group.deliveryMode === "offline" || (!!group.isMakeupGroup && nextSession?.deliveryMode === "offline");
  const timeFrom = group.schedule?.timeFrom || "";
  const timeTo = group.schedule?.timeTo || "";
  const location = isOffline ? resolveLocation(group, originalGroup) : { placeName: "", address: "", mapsLink: "" };

  return {
    id: String(group._id),
    name: group.name,
    code: group.code,
    courseName: group.courseId?.title || group.courseSnapshot?.title || "",
    deliveryMode: isOffline ? "offline" : "online",
    groupType: group.groupType || null,
    isMakeup: !!group.isMakeupGroup,
    isArchived: !!group.isArchived, // ✅ NEW
    startDate: group.schedule?.startDate || null,
    daysOfWeek: group.schedule?.daysOfWeek || [],
    timeFrom,
    timeTo,
    instructorNames: (group.instructors || []).map((i) => i.userId?.name).filter(Boolean).join("، "),

    // الحصة القادمة (من السيشنز الفعلية)
    nextSession: nextSession
      ? {
          title: nextSession.title || "",
          date: nextSession.scheduledDate || null,
          timeFrom: nextSession.startTime || timeFrom,
          timeTo: nextSession.endTime || timeTo,
        }
      : null,

    // أونلاين فقط: لينك الحصة القادمة ← أي سيشن للجروب ← firstMeetingLink
    meetingLink: isOffline ? "" : nextSession?.meetingLink || linkFallback || group.firstMeetingLink || "",

    // أوفلاين فقط
    ...location,
  };
}

// ─── Public: recipients for the UI ───────────────────────────────────────────

export async function getGroupRecipients(groupId) {
  const ctx = await loadContext(groupId);
  const res = createResolvers(ctx.docs);
  const recipients = buildRecipients(ctx.group, res);

  const pausedCount = (ctx.group.students || []).filter(
    (s) => s && !s.isDeleted && isStudentPausedInGroup(s, ctx.group._id),
  ).length;

  return {
    group: buildGroupInfo(ctx.group, ctx),
    // الرقم نفسه مبيروحش للـ client، بس hasPhone
    recipients: recipients.map(({ phone, ...rest }) => ({ ...rest, hasPhone: !!phone })),
    // متغيرات التحية اللي مش متسجلة في الداتابيز (بيتستخدم بدالها النص الافتراضي)
    fallbackKeys: [...res.fallbackKeys],
    // عدد الطلبة الموقوفين (مخفيين من القايمة)
    pausedCount,
    // ✅ NEW: حالة الـ instances (متضبط ولا لأ)
    instances: wapilotService.getInstancesInfo(),
  };
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateRequest({ audience, selectedKeys, templates }) {
  if (audience !== AUDIENCE.CUSTOM && !AUDIENCE_TYPES[audience]) {
    throw new GroupMessageError("نوع المستلمين غير صالح");
  }
  if (audience === AUDIENCE.CUSTOM && !selectedKeys.length) {
    throw new GroupMessageError("اختار مستلم واحد على الأقل");
  }
  const texts = getAllTemplateTexts(templates);
  if (!texts.length) {
    throw new GroupMessageError("اكتب نص الرسالة");
  }
  if (texts.some((t) => t.length > MAX_MESSAGE_LENGTH)) {
    throw new GroupMessageError(`الرسالة أطول من ${MAX_MESSAGE_LENGTH} حرف`);
  }
  const unknown = findUnknownVariables(texts.join(" "));
  if (unknown.length) {
    throw new GroupMessageError(`متغيرات غير معروفة: ${unknown.join(" ")}`);
  }
}

/** متغيرات أوفلاين في جروب أونلاين (أو العكس) */
function validateAgainstGroup(templates, groupInfo) {
  const bad = findInapplicableVariables(getAllTemplateTexts(templates).join(" "), groupInfo);
  if (bad.length) {
    const mode = groupInfo.deliveryMode === "offline" ? "أوفلاين" : "أونلاين";
    throw new GroupMessageError(`المتغيرات دي مش مناسبة لجروب ${mode}: ${bad.join(" ")}`);
  }
}

// ─── Instances (main / eval) ─────────────────────────────────────────────────

const normalizeInstance = (v) => (v === "eval" ? "eval" : "main");

function normalizeInstanceByType(raw) {
  const out = {};
  for (const type of Object.values(RECIPIENT_TYPE)) {
    if (raw && (raw[type] === "main" || raw[type] === "eval")) {
      out[type] = raw[type];
    }
  }
  return out;
}

function assertInstancesAvailable(keys) {
  const info = wapilotService.getInstancesInfo();
  for (const key of keys) {
    if (!info.find((i) => i.key === key)?.configured) {
      const label = key === "eval" ? "التقييم" : "الرئيسي";
      throw new GroupMessageError(`إنستانس "${label}" مش متضبط في الـ env`, 400);
    }
  }
}

// ─── Delivery ────────────────────────────────────────────────────────────────
function dispatch(recipient, { text, language }, groupInfo, extra = {}, instance = "main") {
  const groupMeta = {
    groupId: groupInfo.id,
    groupName: groupInfo.name,
    groupCode: groupInfo.code,
  };

  if (recipient.type === RECIPIENT_TYPE.INSTRUCTOR) {
    return wapilotService.sendAndLogUserMessage({
      userId: recipient.refId,
      phoneNumber: recipient.phone,
      messageContent: text,
      messageType: "group_custom_message",
      language,
      metadata: groupMeta,
      instance,
    });
  }

  // طالب أو ولي أمر → بيتسجل على الـ Student (recipientType بيفرّق بينهم)
  return wapilotService.sendAndLogMessage({
    studentId: recipient.studentId,
    phoneNumber: recipient.phone,
    messageContent: text,
    messageType: "custom",
    language,
    instance,
    metadata: {
      ...groupMeta,
      isCustomMessage: true,
      recipientType: recipient.type,
      automationType: "group_custom_message",
      ...extra,
    },
  });
}

async function deliver(recipient, groupInfo, templates, seen, instance = "main") {
  const base = {
    key: recipient.key,
    type: recipient.type,
    name: recipient.names[recipient.language],
    instance,
  };

  if (!recipient.phone) return { ...base, status: "skipped", reason: "no_phone" };

  const message = composeMessage(recipient, groupInfo, templates);
  if (!message) return { ...base, status: "skipped", reason: "empty_message" };

  // نفس النص لنفس الرقم مرتين (مثلاً الأب والطالب بنفس الرقم) → مرة واحدة
  const fingerprint = `${recipient.phone}::${message.text}`;
  if (seen.has(fingerprint)) return { ...base, status: "skipped", reason: "duplicate" };
  seen.add(fingerprint);

  try {
    const result = await dispatch(recipient, message, groupInfo, {}, instance);
    return result?.success
      ? { ...base, status: "sent", language: message.language }
      : { ...base, status: "failed", error: result?.error || "Unknown error" };
  } catch (error) {
    return { ...base, status: "failed", error: error.message };
  }
}
const countBy = (results, status) => results.filter((r) => r.status === status).length;

export async function sendGroupMessage({
  groupId,
  audience,
  selectedKeys = [],
  contentAr = "",
  contentEn = "",
  overrides = {},
  instance = "main", // الافتراضي لكل المستلمين
  instanceByType = {}, // تخصيص لكل فئة { student|guardian|instructor: "main"|"eval" }
}) {
  const templates = { contentAr, contentEn, overrides: normalizeOverrides(overrides) };
  validateRequest({ audience, selectedKeys, templates });

  const ctx = await loadContext(groupId);
  assertNotArchived(ctx.group);

  const groupInfo = buildGroupInfo(ctx.group, ctx);
  validateAgainstGroup(templates, groupInfo);

  const res = createResolvers(ctx.docs);
  // ✅ buildRecipients بيستبعد الطلبة الموقوفين (وأولياء أمورهم) تلقائيًا
  const targets = selectRecipients(buildRecipients(ctx.group, res), audience, selectedKeys);

  if (!targets.length) throw new GroupMessageError("مفيش مستلمين مطابقين للاختيار");

  const defaultInstance = normalizeInstance(instance);
  const byType = normalizeInstanceByType(instanceByType);
  const pick = (r) => byType[r.type] || defaultInstance;

  // نتأكد إن كل instance هيتستخدم متضبط فعلاً قبل ما نبدأ نبعت
  assertInstancesAvailable([...new Set(targets.map(pick))]);

  const seen = new Set();
  const results = [];

  for (const [index, recipient] of targets.entries()) {
    results.push(await deliver(recipient, groupInfo, templates, seen, pick(recipient)));
    if (index < targets.length - 1) await sleep(SEND_DELAY_MS);
  }

  const sentBy = (key) =>
    results.filter((r) => r.status === "sent" && r.instance === key).length;

  return {
    total: results.length,
    sent: countBy(results, "sent"),
    failed: countBy(results, "failed"),
    skipped: countBy(results, "skipped"),
    byInstance: { main: sentBy("main"), eval: sentBy("eval") },
    results,
  };
}


// ═════════════════════════════════════════════════════════════════════════════
// ✅ رسائل عضو واحد (طالب + ولي أمر / مدرس): السجل + الإرسال المباشر
// ═════════════════════════════════════════════════════════════════════════════

// ✅ بيحدد الـ instance: الأول instanceKey، وبعدين مقارنة الـ id الفعلي
const resolveInstance = (md = {}) =>
  ["main", "eval"].includes(md?.instanceKey)
    ? md.instanceKey
    : wapilotService.instanceKeyFromId(md?.sentFromInstance);

const maskPhone = (n) => (n ? `••••${String(n).slice(-4)}` : "");

async function loadGroupSessionIds(groupId) {
  const sessions = await Session.find({ groupId, isDeleted: false }).select("_id").lean();
  return new Set(sessions.map((s) => String(s._id)));
}

function studentHistory(student, groupId, sessionIds, scope) {
  return (student?.whatsappMessages || [])
    .filter((m) => {
      if (scope === "all") return true;
      const md = m.metadata || {};
      return (
        (md.groupId && String(md.groupId) === String(groupId)) ||
        (md.sessionId && sessionIds.has(String(md.sessionId)))
      );
    })
    .map((m) => ({
      id: String(m._id),
      type: m.messageType,
      content: m.messageContent || "",
      language: m.language || "ar",
      status: m.status || "sent",
      error: m.error || "",
      sentAt: m.sentAt || m.createdAt || null,
      role: m.metadata?.recipientType === "guardian" ? "guardian" : "student",
      number: maskPhone(m.recipientNumber),
      sessionTitle: m.metadata?.sessionTitle || "",
      groupName: m.metadata?.groupName || "",
      isCustom: !!m.metadata?.isCustomMessage,
      instance: resolveInstance(m.metadata), // ✅ مع fallback
    }));
}

function instructorHistory(user, groupId, scope) {
  return (user?.notificationHistory || [])
    .filter((m) => scope === "all" || (m.groupId && String(m.groupId) === String(groupId)))
    .map((m) => ({
      id: String(m._id || `${m.messageType}-${new Date(m.sentAt).getTime()}`),
      type: m.messageType || "group_custom_message",
      content: m.messageContent || "",
      language: m.language || "ar",
      status: m.status || "sent",
      error: m.failureReason || "",
      sentAt: m.sentAt || null,
      role: "instructor",
      number: "",
      sessionTitle: "",
      groupName: m.groupName || "",
      isCustom: true,
      instance: m.instanceKey || "", // ✅ NEW
    }));
}

/** سجل رسائل عضو + مستلميه (الطالب وولي أمره، أو المدرس) */
export async function getMemberMessages(groupId, { kind, id, scope = "group" } = {}) {
  if (!["student", "instructor"].includes(kind)) {
    throw new GroupMessageError("نوع العضو غير صالح");
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new GroupMessageError("Invalid member ID", 400);
  }

  const ctx = await loadContext(groupId);
  const res = createResolvers(ctx.docs);
  // ✅ includePaused: السجل بيتعرض حتى للطالب الموقوف
  const everyone = buildRecipients(ctx.group, res, { includePaused: true });

  const recipients = everyone.filter((r) =>
    kind === "instructor"
      ? r.type === RECIPIENT_TYPE.INSTRUCTOR && r.refId === String(id)
      : r.type !== RECIPIENT_TYPE.INSTRUCTOR && r.studentId === String(id),
  );
  if (!recipients.length) throw new GroupMessageError("العضو مش موجود في الجروب ده", 404);

  const effectiveScope = scope === "all" ? "all" : "group";
  let messages = [];

  if (kind === "student") {
    const [student, sessionIds] = await Promise.all([
      Student.findById(id).select("whatsappMessages").lean(),
      effectiveScope === "group" ? loadGroupSessionIds(groupId) : Promise.resolve(new Set()),
    ]);
    messages = studentHistory(student, groupId, sessionIds, effectiveScope);
  } else {
    const user = await User.findById(id).select("notificationHistory").lean();
    messages = instructorHistory(user, groupId, effectiveScope);
  }

  messages.sort((a, b) => new Date(b.sentAt || 0) - new Date(a.sentAt || 0));

    return {
    group: buildGroupInfo(ctx.group, ctx),
    recipients: recipients.map(({ phone, ...rest }) => ({
      ...rest,
      hasPhone: !!phone,
      phoneHint: maskPhone(phone),
    })),
    messages: messages.slice(0, 150),
    totalMessages: messages.length,
    scope: effectiveScope,
    instances: wapilotService.getInstancesInfo(), // ✅ NEW
  };
}

export async function sendDirectMessage({
  groupId,
  recipientKey,
  content = "",
  language = "auto",
  raw = false,
  instance = "main", // ✅ NEW
}) {
  const text = String(content || "").trim();
  if (!text) throw new GroupMessageError("اكتب نص الرسالة");
  if (text.length > MAX_MESSAGE_LENGTH) {
    throw new GroupMessageError(`الرسالة أطول من ${MAX_MESSAGE_LENGTH} حرف`);
  }
  const forced = ["ar", "en"].includes(language) ? language : "auto";
  const chosenInstance = normalizeInstance(instance);

  const ctx = await loadContext(groupId);
  assertNotArchived(ctx.group);

  const groupInfo = buildGroupInfo(ctx.group, ctx);
  const res = createResolvers(ctx.docs);

  // ✅ includePaused عشان نقدر نرد برسالة واضحة بدل "المستلم مش موجود"
  const base = buildRecipients(ctx.group, res, { includePaused: true }).find(
    (r) => r.key === recipientKey,
  );
  if (!base) throw new GroupMessageError("المستلم مش موجود في الجروب ده", 404);
  if (base.paused) {
    throw new GroupMessageError("الطالب ده موقوف في الجروب — شغّله الأول عشان تبعتله", 403);
  }
  if (!base.phone) throw new GroupMessageError("المستلم ده معندوش رقم واتساب");

  assertInstancesAvailable([chosenInstance]); // ✅ NEW

  const recipient = forced === "auto" ? base : { ...base, language: forced };

  let message;
  if (raw) {
    message = { text, language: recipient.language };
  } else {
    const templates = { contentAr: text, contentEn: text, overrides: normalizeOverrides({}) };
    const unknown = findUnknownVariables(text);
    if (unknown.length) throw new GroupMessageError(`متغيرات غير معروفة: ${unknown.join(" ")}`);
    validateAgainstGroup(templates, groupInfo);

    message = composeMessage(recipient, groupInfo, templates);
    if (!message?.text?.trim()) {
      throw new GroupMessageError("الرسالة طلعت فاضية بعد تعويض المتغيرات");
    }
  }

  let result;
  try {
    result = await dispatch(
      recipient,
      message,
      groupInfo,
      { automationType: raw ? "member_message_resend" : "member_direct_message" },
      chosenInstance,
    );
  } catch (error) {
    throw new GroupMessageError(error.message || "فشل الإرسال", 502);
  }
  if (!result?.success) throw new GroupMessageError(result?.error || "فشل الإرسال", 502);

  return {
    status: "sent",
    key: recipient.key,
    name: recipient.names[recipient.language],
    language: message.language,
    instance: chosenInstance,
    text: message.text,
  };
}


// ═════════════════════════════════════════════════════════════════════════════
// ✅ سجل الجروب حسب الـ Instance
// ═════════════════════════════════════════════════════════════════════════════

export async function getGroupInstanceLog(groupId, { instance = "all", limit = 300 } = {}) {
  const group = await loadGroup(groupId);
  const gid = new mongoose.Types.ObjectId(String(groupId));
  const cap = Math.min(Math.max(parseInt(limit) || 300, 1), 500);

  const studentIds = (group.students || []).filter((s) => s && !s.isDeleted).map((s) => s._id);
  const instructorIds = (group.instructors || []).map((i) => i.userId?._id).filter(Boolean);

  const sessions = await Session.find({ groupId, isDeleted: false }).select("_id").lean();
  const sessionIds = sessions.map((s) => s._id);

  const KNOWN = ["main", "eval"];

  // ✅ ids الفعلية للـ instances (للـ fallback لو instanceKey مش متسجل)
  const mainId = String(wapilotService.instanceId || "__none_main__");
  const evalId =
    wapilotService.evalInstanceId && wapilotService.evalInstanceId !== wapilotService.instanceId
      ? String(wapilotService.evalInstanceId)
      : "__none_eval__";

  const instanceMatch =
    instance === "all" ? null : { "msg.resolvedInstance": instance };

  // ── الطلبة وأولياء الأمور (Student.whatsappMessages) ──
  const [facet] = studentIds.length
    ? await Student.aggregate([
        { $match: { _id: { $in: studentIds } } },
        { $project: { fullName: "$personalInfo.fullName", msg: "$whatsappMessages" } },
        { $unwind: "$msg" },
        {
          $match: {
            $or: [
              { "msg.metadata.groupId": gid },
              { "msg.metadata.sessionId": { $in: sessionIds } },
            ],
          },
        },
        {
          $addFields: {
            "msg.resolvedInstance": {
              $switch: {
                branches: [
                  {
                    case: { $in: ["$msg.metadata.instanceKey", KNOWN] },
                    then: "$msg.metadata.instanceKey",
                  },
                  {
                    case: { $eq: ["$msg.metadata.sentFromInstance", evalId] },
                    then: "eval",
                  },
                  {
                    case: { $eq: ["$msg.metadata.sentFromInstance", mainId] },
                    then: "main",
                  },
                ],
                default: "unknown",
              },
            },
          },
        },
        {
          $facet: {
            counts: [
              {
                $group: {
                  _id: "$msg.resolvedInstance",
                  total: { $sum: 1 },
                  failed: { $sum: { $cond: [{ $eq: ["$msg.status", "failed"] }, 1, 0] } },
                },
              },
            ],
            items: [
              ...(instanceMatch ? [{ $match: instanceMatch }] : []),
              { $sort: { "msg.sentAt": -1 } },
              { $limit: cap },
            ],
          },
        },
      ])
    : [{ counts: [], items: [] }];

  const counts = {
    main: { total: 0, failed: 0 },
    eval: { total: 0, failed: 0 },
    unknown: { total: 0, failed: 0 },
  };
  (facet?.counts || []).forEach((c) => {
    counts[c._id] = { total: c.total, failed: c.failed };
  });

  const messages = (facet?.items || []).map(({ _id, fullName, msg: m }) => {
    const role = m.metadata?.recipientType === "guardian" ? "guardian" : "student";
    return {
      id: String(m._id),
      type: m.messageType,
      content: m.messageContent || "",
      language: m.language || "ar",
      status: m.status || "sent",
      error: m.error || "",
      sentAt: m.sentAt || null,
      role,
      recipientName: role === "guardian" ? `ولي أمر ${fullName || ""}`.trim() : fullName || "",
      number: maskPhone(m.recipientNumber),
      instance: m.resolvedInstance || "unknown",
      isCustom: !!m.metadata?.isCustomMessage,
    };
  });

  // ── المدرسين (User.notificationHistory) ──
  if (instructorIds.length) {
    const users = await User.find({ _id: { $in: instructorIds } })
      .select("name notificationHistory")
      .lean();

    for (const u of users) {
      for (const m of u.notificationHistory || []) {
        if (!m.groupId || String(m.groupId) !== String(groupId)) continue;

        const key = KNOWN.includes(m.instanceKey) ? m.instanceKey : "unknown";
        counts[key].total += 1;
        if (m.status === "failed") counts[key].failed += 1;

        if (instance !== "all" && instance !== key) continue;

        messages.push({
          id: String(m._id || `${u._id}-${new Date(m.sentAt).getTime()}`),
          type: m.messageType || "group_custom_message",
          content: m.messageContent || "",
          language: m.language || "ar",
          status: m.status || "sent",
          error: m.failureReason || "",
          sentAt: m.sentAt || null,
          role: "instructor",
          recipientName: u.name || "",
          number: "",
          instance: key,
          isCustom: true,
        });
      }
    }
  }

  messages.sort((a, b) => new Date(b.sentAt || 0) - new Date(a.sentAt || 0));

  return {
    instances: wapilotService.getInstancesInfo(),
    counts,
    messages: messages.slice(0, cap),
  };
}