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

const SEND_DELAY_MS = 800; // فاصل بين الرسايل عشان نتجنب حظر واتساب

export class GroupMessageError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
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
    .populate("students", "personalInfo guardianInfo communicationPreferences studentType isDeleted creditSystem.currentPackage")
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

function buildRecipients(group, res) {
  const students = (group.students || []).filter((s) => s && !s.isDeleted);
  const instructors = (group.instructors || []).map((i) => i.userId).filter((u) => u?._id);

  return [
    ...students.map((s) => studentRecipient(s, res)),
    // البالغين مفيش ليهم ولي أمر
    ...students.filter((s) => s.studentType !== "adults").map((s) => guardianRecipient(s, res)),
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

  return {
    group: buildGroupInfo(ctx.group, ctx),
    // الرقم نفسه مبيروحش للـ client، بس hasPhone
    recipients: recipients.map(({ phone, ...rest }) => ({ ...rest, hasPhone: !!phone })),
    // متغيرات التحية اللي مش متسجلة في الداتابيز (بيتستخدم بدالها النص الافتراضي)
    fallbackKeys: [...res.fallbackKeys],
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

// ─── Delivery ────────────────────────────────────────────────────────────────

function dispatch(recipient, { text, language }, groupInfo, extra = {}) {
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
    });
  }

  // طالب أو ولي أمر → بيتسجل على الـ Student (recipientType بيفرّق بينهم)
  return wapilotService.sendAndLogMessage({
    studentId: recipient.studentId,
    phoneNumber: recipient.phone,
    messageContent: text,
    messageType: "custom",
    language,
    metadata: {
      ...groupMeta,
      isCustomMessage: true,
      recipientType: recipient.type,
      automationType: "group_custom_message",
      ...extra,
    },
  });
}

async function deliver(recipient, groupInfo, templates, seen) {
  const base = { key: recipient.key, type: recipient.type, name: recipient.names[recipient.language] };

  if (!recipient.phone) return { ...base, status: "skipped", reason: "no_phone" };

  const message = composeMessage(recipient, groupInfo, templates);
  if (!message) return { ...base, status: "skipped", reason: "empty_message" };

  // نفس النص لنفس الرقم مرتين (مثلاً الأب والطالب بنفس الرقم) → مرة واحدة
  const fingerprint = `${recipient.phone}::${message.text}`;
  if (seen.has(fingerprint)) return { ...base, status: "skipped", reason: "duplicate" };
  seen.add(fingerprint);

  try {
    const result = await dispatch(recipient, message, groupInfo);
    return result?.success
      ? { ...base, status: "sent", language: message.language }
      : { ...base, status: "failed", error: result?.error || "Unknown error" };
  } catch (error) {
    return { ...base, status: "failed", error: error.message };
  }
}

const countBy = (results, status) => results.filter((r) => r.status === status).length;

// ─── Public: send ────────────────────────────────────────────────────────────

export async function sendGroupMessage({
  groupId,
  audience,
  selectedKeys = [],
  contentAr = "",
  contentEn = "",
  overrides = {},
}) {
  const templates = { contentAr, contentEn, overrides: normalizeOverrides(overrides) };
  validateRequest({ audience, selectedKeys, templates });

  const ctx = await loadContext(groupId);
  const groupInfo = buildGroupInfo(ctx.group, ctx);
  validateAgainstGroup(templates, groupInfo);

  const res = createResolvers(ctx.docs);
  const targets = selectRecipients(buildRecipients(ctx.group, res), audience, selectedKeys);

  if (!targets.length) throw new GroupMessageError("مفيش مستلمين مطابقين للاختيار");

  const seen = new Set();
  const results = [];

  for (const [index, recipient] of targets.entries()) {
    results.push(await deliver(recipient, groupInfo, templates, seen));
    if (index < targets.length - 1) await sleep(SEND_DELAY_MS);
  }

  return {
    total: results.length,
    sent: countBy(results, "sent"),
    failed: countBy(results, "failed"),
    skipped: countBy(results, "skipped"),
    results,
  };
}


// ═════════════════════════════════════════════════════════════════════════════
// ✅ رسائل عضو واحد (طالب + ولي أمر / مدرس): السجل + الإرسال المباشر
// ═════════════════════════════════════════════════════════════════════════════

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
  const everyone = buildRecipients(ctx.group, res);

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
  };
}

/**
 * إرسال رسالة لمستلم واحد.
 *  - raw=false: النص بيعدّي على المتغيرات ({salutation}, {studentName}...) حسب المستلم
 *  - raw=true : النص بيتبعت زي ما هو (إعادة إرسال رسالة قديمة)
 *  - language: auto = لغة المستلم | ar | en (إجبار لغة معينة)
 */
export async function sendDirectMessage({
  groupId,
  recipientKey,
  content = "",
  language = "auto",
  raw = false,
}) {
  const text = String(content || "").trim();
  if (!text) throw new GroupMessageError("اكتب نص الرسالة");
  if (text.length > MAX_MESSAGE_LENGTH) {
    throw new GroupMessageError(`الرسالة أطول من ${MAX_MESSAGE_LENGTH} حرف`);
  }
  const forced = ["ar", "en"].includes(language) ? language : "auto";

  const ctx = await loadContext(groupId);
  const groupInfo = buildGroupInfo(ctx.group, ctx);
  const res = createResolvers(ctx.docs);

  const base = buildRecipients(ctx.group, res).find((r) => r.key === recipientKey);
  if (!base) throw new GroupMessageError("المستلم مش موجود في الجروب ده", 404);
  if (!base.phone) throw new GroupMessageError("المستلم ده معندوش رقم واتساب");

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
    result = await dispatch(recipient, message, groupInfo, {
      automationType: raw ? "member_message_resend" : "member_direct_message",
    });
  } catch (error) {
    throw new GroupMessageError(error.message || "فشل الإرسال", 502);
  }
  if (!result?.success) throw new GroupMessageError(result?.error || "فشل الإرسال", 502);

  return {
    status: "sent",
    key: recipient.key,
    name: recipient.names[recipient.language],
    language: message.language,
    text: message.text,
  };
}