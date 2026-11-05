// src/app/utils/groupMessageShared.js
// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers مشتركة بين السيرفر والـ UI.
// المعاينة في المودال بتستخدم نفس الكود اللي بيتبعت بيه فعلاً → مفيش اختلاف.
//
// ⚠️ التحيات (salutation) وعنوان الابن/الابنة مبقوش hardcoded هنا:
//    السيرفر بيجيبهم من TemplateVariable في الداتابيز ويحطهم على كل مستلم
//    (recipient.salutation / recipient.childTitle) — والـ fallback بيتستخدم
//    بس لو المتغير مش متسجل أو فاضي.
// ─────────────────────────────────────────────────────────────────────────────

export const RECIPIENT_TYPE = Object.freeze({
  STUDENT: "student",
  GUARDIAN: "guardian",
  INSTRUCTOR: "instructor",
});
const { STUDENT, GUARDIAN, INSTRUCTOR } = RECIPIENT_TYPE;
const ALL_TYPES = [STUDENT, GUARDIAN, INSTRUCTOR];

export const AUDIENCE = Object.freeze({
  ALL: "all",
  STUDENTS: "students",
  GUARDIANS: "guardians",
  INSTRUCTORS: "instructors",
  CUSTOM: "custom",
});

export const AUDIENCE_TYPES = Object.freeze({
  [AUDIENCE.ALL]: ALL_TYPES,
  [AUDIENCE.STUDENTS]: [STUDENT],
  [AUDIENCE.GUARDIANS]: [GUARDIAN],
  [AUDIENCE.INSTRUCTORS]: [INSTRUCTOR],
});

export const MAX_MESSAGE_LENGTH = 4000;

// ─── Normalizers ─────────────────────────────────────────────────────────────

export const normalizeGender = (g) =>
  String(g || "").toLowerCase().trim() === "female" ? "female" : "male";

export const normalizeLanguage = (l) => (l === "en" ? "en" : "ar");

// ─── Credit (رصيد الباقة) ────────────────────────────────────────────────────
// نفس العتبات المستخدمة في Student.getBalanceStatus
export const LOW_CREDIT_LEVELS = ["low", "critical", "zero"];

export const getCreditLevel = (remainingHours) => {
  const h = Number(remainingHours) || 0;
  if (h <= 0) return "zero";
  if (h <= 2) return "critical";
  if (h <= 5) return "low";
  return "good";
};

const hoursText = (h) => String(+Number(h || 0).toFixed(2));

// ─── Formatting ──────────────────────────────────────────────────────────────

const formatDate = (value, lang) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString(
    lang === "ar" ? "ar-EG-u-nu-latn" : "en-GB",
    { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Cairo" },
  );
};

const formatTime = (hhmm, lang) => {
  if (!hhmm || !String(hhmm).includes(":")) return "";
  const [h, m] = String(hhmm).split(":").map(Number);
  const suffix = h >= 12 ? (lang === "ar" ? "م" : "PM") : lang === "ar" ? "ص" : "AM";
  return `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`;
};

const DAY_NAMES = {
  ar: { Sunday: "الأحد", Monday: "الإثنين", Tuesday: "الثلاثاء", Wednesday: "الأربعاء", Thursday: "الخميس", Friday: "الجمعة", Saturday: "السبت" },
  en: { Sunday: "Sunday", Monday: "Monday", Tuesday: "Tuesday", Wednesday: "Wednesday", Thursday: "Thursday", Friday: "Friday", Saturday: "Saturday" },
};

// ─── DB-driven salutations ───────────────────────────────────────────────────
// المفاتيح اللي بتتقري من TemplateVariable (نفس اللي wapilot-service بيستخدمها)

export const SALUTATION_DB_KEYS = Object.freeze({
  [STUDENT]: { ar: "salutation_ar", en: "salutation_en" },
  [GUARDIAN]: { ar: "guardianSalutation_ar", en: "guardianSalutation_en" },
  [INSTRUCTOR]: { ar: "instructorSalutation", en: "instructorSalutation" },
});

export const CHILD_TITLE_DB_KEYS = Object.freeze({ ar: "studentGender_ar", en: "studentGender_en" });

export const ALL_DB_KEYS = [
  ...new Set([
    ...Object.values(SALUTATION_DB_KEYS).flatMap((o) => Object.values(o)),
    ...Object.values(CHILD_TITLE_DB_KEYS),
  ]),
];

// Fallback — بيتستخدم بس لو المتغير مش متسجل في الداتابيز
const FALLBACK_SALUTATIONS = {
  [STUDENT]: {
    ar: { male: "عزيزي الطالب", female: "عزيزتي الطالبة" },
    en: { male: "Dear student", female: "Dear student" },
  },
  [GUARDIAN]: {
    ar: { male: "عزيزي الأستاذ", female: "عزيزتي السيدة" },
    en: { male: "Dear Mr.", female: "Dear Mrs." },
  },
  [INSTRUCTOR]: {
    ar: { male: "عزيزي الأستاذ", female: "عزيزتي الأستاذة" },
    en: { male: "Dear Mr.", female: "Dear Ms." },
  },
};

export const fallbackSalutation = (type, lang, gender) => FALLBACK_SALUTATIONS[type][lang][gender];

export const fallbackChildTitle = (lang, gender) => {
  const female = gender === "female";
  return lang === "ar" ? (female ? "الابنة" : "الابن") : female ? "daughter" : "son";
};

/** التحية + الاسم. لو قيمة المتغير في الداتابيز فيها الاسم أصلاً مبنكررهوش. */
const joinSalutation = (prefix, name) => {
  const p = String(prefix || "").trim();
  const n = String(name || "").trim();
  if (!n || p.includes(n)) return p;
  return `${p} ${n}`.trim();
};

// ─── Variables (مصدر الحقيقة الوحيد: الـ UI والسيرفر الاتنين بيقروا منه) ─────
// resolve({ recipient, group, lang, name }) → string
// types: الأنواع اللي المتغير بيشتغل معاها (غير كده بيرجع "")
// mode:  "online" | "offline" → المتغير بيشتغل بس مع النوع ده من الجروبات

export const VARIABLE_CATEGORIES = [
  { id: "person", icon: "👤", label: "المستلم" },
  { id: "group", icon: "👥", label: "المجموعة" },
  { id: "schedule", icon: "🗓️", label: "المواعيد" },
  { id: "session", icon: "📘", label: "الحصة القادمة" },
  { id: "location", icon: "📍", label: "المكان / الرابط" },
  { id: "credit", icon: "🔋", label: "الرصيد" },
];

export const VARIABLES = [
  // ── المستلم ──
  {
    key: "salutation", icon: "👋", label: "التحية + الاسم", category: "person", types: ALL_TYPES,
    resolve: ({ recipient, lang, name }) => joinSalutation(recipient.salutation?.[lang], name),
  },
  { key: "name", icon: "👤", label: "اسم المستلم", category: "person", types: ALL_TYPES, resolve: ({ name }) => name },
  {
    key: "fullName", icon: "📝", label: "الاسم الكامل", category: "person", types: ALL_TYPES,
    resolve: ({ recipient, name }) => recipient.fullName || name,
  },
  {
    key: "studentName", icon: "🎓", label: "اسم الطالب", category: "person", types: [STUDENT, GUARDIAN],
    resolve: ({ recipient, lang }) => recipient.studentNames?.[lang] || recipient.studentNames?.ar || "",
  },
  {
    key: "childTitle", icon: "👶", label: "الابن / الابنة", category: "person", types: [GUARDIAN],
    resolve: ({ recipient, lang }) => recipient.childTitle?.[lang] || "",
  },

  // ── المجموعة ──
  { key: "groupName", icon: "👥", label: "اسم المجموعة", category: "group", types: ALL_TYPES, resolve: ({ group }) => group.name },
  { key: "groupCode", icon: "🔤", label: "كود المجموعة", category: "group", types: ALL_TYPES, resolve: ({ group }) => group.code },
  { key: "courseName", icon: "📚", label: "اسم الكورس", category: "group", types: ALL_TYPES, resolve: ({ group }) => group.courseName },
  { key: "instructorNames", icon: "👨‍🏫", label: "المدرسين", category: "group", types: ALL_TYPES, resolve: ({ group }) => group.instructorNames },

  // ── المواعيد ──
  {
    key: "startDate", icon: "📅", label: "تاريخ بدء المجموعة", category: "schedule", types: ALL_TYPES,
    resolve: ({ group, lang }) => formatDate(group.startDate, lang),
  },
  {
    key: "daysOfWeek", icon: "🗓️", label: "أيام المجموعة", category: "schedule", types: ALL_TYPES,
    resolve: ({ group, lang }) =>
      (group.daysOfWeek || []).map((d) => DAY_NAMES[lang][d] || d).join(lang === "ar" ? "، " : ", "),
  },
  {
    key: "timeFrom", icon: "⏰", label: "وقت بداية الحصة", category: "schedule", types: ALL_TYPES,
    resolve: ({ group, lang }) => formatTime(group.timeFrom, lang),
  },
  {
    key: "timeTo", icon: "⏰", label: "وقت نهاية الحصة", category: "schedule", types: ALL_TYPES,
    resolve: ({ group, lang }) => formatTime(group.timeTo, lang),
  },

  // ── الحصة القادمة (من السيشنز الفعلية) ──
  {
    key: "sessionName", icon: "📘", label: "اسم الحصة القادمة", category: "session", types: ALL_TYPES,
    resolve: ({ group }) => group.nextSession?.title || "",
  },
  {
    key: "sessionDate", icon: "📆", label: "تاريخ الحصة القادمة", category: "session", types: ALL_TYPES,
    resolve: ({ group, lang }) => formatDate(group.nextSession?.date, lang),
  },
  {
    key: "sessionTime", icon: "🕒", label: "وقت الحصة القادمة", category: "session", types: ALL_TYPES,
    resolve: ({ group, lang }) => {
      const s = group.nextSession;
      if (!s) return "";
      const from = formatTime(s.timeFrom, lang);
      const to = formatTime(s.timeTo, lang);
      return from && to ? `${from} - ${to}` : from || "";
    },
  },

  // ── المكان / الرابط ──
  {
    key: "meetingLink", icon: "🔗", label: "رابط الحصة (Online)", category: "location", mode: "online", types: ALL_TYPES,
    resolve: ({ group }) => group.meetingLink,
  },
  { key: "placeName", icon: "📍", label: "اسم المكان (Offline)", category: "location", mode: "offline", types: ALL_TYPES, resolve: ({ group }) => group.placeName },
  { key: "address", icon: "📌", label: "العنوان (Offline)", category: "location", mode: "offline", types: ALL_TYPES, resolve: ({ group }) => group.address },
  { key: "mapsLink", icon: "🗺️", label: "رابط الخريطة (Offline)", category: "location", mode: "offline", types: ALL_TYPES, resolve: ({ group }) => group.mapsLink },

  // ── الرصيد ──
  {
    key: "remainingHours", icon: "🔋", label: "الساعات المتبقية", category: "credit", types: [STUDENT, GUARDIAN],
    resolve: ({ recipient }) => (recipient.credit?.hasPackage ? hoursText(recipient.credit.remainingHours) : ""),
  },
  {
    key: "packageName", icon: "📦", label: "اسم الباقة", category: "credit", types: [STUDENT, GUARDIAN],
    resolve: ({ recipient }) => recipient.credit?.packageName || "",
  },
];

const VARIABLE_BY_KEY = Object.fromEntries(VARIABLES.map((v) => [v.key, v]));
const KNOWN_KEYS = new Set(VARIABLES.map((v) => v.key));
const VARIABLE_PATTERN = /\{([a-zA-Z][a-zA-Z0-9_]*)\}/g;
// {ذكر|أنثى} → بيختار النص حسب جنس المستلم نفسه
const GENDER_INLINE_PATTERN = /\{([^{}|]+)\|([^{}|]+)\}/g;

export const GENDER_INLINE_EXAMPLE = "{ذكر|أنثى}";

const groupMode = (group) => (group?.deliveryMode === "offline" ? "offline" : "online");

/** المتغير مناسب لنوع الجروب (أونلاين / أوفلاين)؟ */
export const isVariableApplicable = (variable, group) => !variable.mode || variable.mode === groupMode(group);

/** "full" لو المتغير بيشتغل مع كل الأنواع المختارة، "partial" مع بعضها، "none" مع ولا واحد */
export function getVariableSupport(variable, types) {
  const hits = types.filter((t) => variable.types.includes(t)).length;
  if (hits === 0) return "none";
  return hits === types.length ? "full" : "partial";
}

export function findUnknownVariables(text) {
  const unknown = new Set();
  for (const [, key] of String(text || "").matchAll(VARIABLE_PATTERN)) {
    if (!KNOWN_KEYS.has(key)) unknown.add(`{${key}}`);
  }
  return [...unknown];
}

/** متغيرات موجودة في النص بس مش مناسبة لنوع الجروب (مثلاً {mapsLink} في جروب أونلاين) */
export function findInapplicableVariables(text, group) {
  const bad = new Set();
  for (const [, key] of String(text || "").matchAll(VARIABLE_PATTERN)) {
    const v = VARIABLE_BY_KEY[key];
    if (v && !isVariableApplicable(v, group)) bad.add(`{${key}}`);
  }
  return [...bad];
}

export function buildVariables(recipient, group, lang) {
  const name = recipient.names?.[lang] || recipient.names?.ar || "";
  const ctx = { recipient, group, lang, name };
  return Object.fromEntries(
    VARIABLES.map((v) => [
      v.key,
      v.types.includes(recipient.type) && isVariableApplicable(v, group) ? String(v.resolve(ctx) ?? "") : "",
    ]),
  );
}

export function renderTemplate(template, variables, gender) {
  return String(template || "")
    .replace(GENDER_INLINE_PATTERN, (_, male, female) => (gender === "female" ? female : male).trim())
    .replace(VARIABLE_PATTERN, (match, key) => (key in variables ? variables[key] : match));
}

// ─── Compose (بيستخدمه الإرسال والمعاينة) ────────────────────────────────────
//
// الرسالة ليها مستويين:
//   1) نص عام (contentAr / contentEn) → بيروح لأي فئة معندهاش نص مخصص
//   2) نص مخصص لكل فئة (overrides.student / guardian / instructor) { ar, en }
//      → بيستبدل النص العام للفئة دي بس
// وكل مستلم بياخد لغته المفضلة، ولو مفيش نص بلغته بياخد اللغة التانية.

const hasText = (s) => !!String(s || "").trim();

export const ROLE_TYPES = ALL_TYPES;

/** بيضمن شكل overrides ويشيل الفئات الفاضية */
export function normalizeOverrides(raw) {
  const out = {};
  for (const type of ALL_TYPES) {
    const ar = String(raw?.[type]?.ar ?? "");
    const en = String(raw?.[type]?.en ?? "");
    if (hasText(ar) || hasText(en)) out[type] = { ar, en };
  }
  return out;
}

/** كل النصوص المكتوبة (العام + المخصصة) — للفحص والتحقق */
export function getAllTemplateTexts(templates) {
  const texts = [templates?.contentAr, templates?.contentEn];
  for (const type of ALL_TYPES) {
    texts.push(templates?.overrides?.[type]?.ar, templates?.overrides?.[type]?.en);
  }
  return texts.map((t) => String(t ?? "")).filter(hasText);
}

function effectiveText(templates, type, lang) {
  const custom = templates?.overrides?.[type]?.[lang];
  if (hasText(custom)) return { text: custom, scope: "role" };
  const general = lang === "ar" ? templates?.contentAr : templates?.contentEn;
  return hasText(general) ? { text: general, scope: "general" } : null;
}

/** النص + اللغة المناسبين للمستلم ده (أو null لو مفيش) */
export function resolveTemplate(recipient, templates) {
  const preferred = recipient.language === "en" ? "en" : "ar";
  const other = preferred === "ar" ? "en" : "ar";
  for (const language of [preferred, other]) {
    const hit = effectiveText(templates, recipient.type, language);
    if (hit) return { language, ...hit };
  }
  return null;
}

/** لغة المستلم لو في نص ليها، وإلا اللغة التانية، وإلا null */
export function pickLanguage(preferred, templates, type) {
  const other = preferred === "ar" ? "en" : "ar";
  for (const language of [preferred, other]) {
    if (effectiveText(templates, type, language)) return language;
  }
  return null;
}

export function composeMessage(recipient, group, templates) {
  const hit = resolveTemplate(recipient, templates);
  if (!hit) return null;
  const text = renderTemplate(hit.text, buildVariables(recipient, group, hit.language), recipient.gender).trim();
  return text ? { language: hit.language, text, scope: hit.scope } : null;
}

/**
 * خريطة التوزيع: لكل (فئة × لغة) مين هيستلم أنهي نص.
 * source: "role" نص مخصص | "general" نص عام | "fallback" اللغة التانية | "none" مفيش نص
 */
export function describeRouting(recipients, templates) {
  const cells = new Map();
  for (const r of recipients) {
    const key = `${r.type}|${r.language}`;
    const hit = resolveTemplate(r, templates);
    const source = !hit ? "none" : hit.language !== r.language ? "fallback" : hit.scope;
    const cell = cells.get(key) || { type: r.type, language: r.language, count: 0, source };
    cell.count += 1;
    cells.set(key, cell);
  }
  return [...cells.values()];
}

/**
 * المتغيرات المستخدمة في الرسالة وقيمتها فاضية عند بعض المستلمين
 * (مثلاً {remainingHours} لمدرس، أو {sessionName} ومفيش حصة قادمة).
 * → [{ key, label, count }]
 */
export function findEmptyVariableUsage(recipients, group, templates) {
  const counts = new Map();
  for (const r of recipients) {
    const hit = resolveTemplate(r, templates);
    if (!hit) continue;
    const used = new Set([...hit.text.matchAll(VARIABLE_PATTERN)].map((m) => m[1]));
    if (!used.size) continue;
    const vars = buildVariables(r, group, hit.language);
    for (const key of used) {
      if (KNOWN_KEYS.has(key) && !vars[key]) counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return [...counts].map(([key, count]) => ({ key, count, label: VARIABLE_BY_KEY[key].label }));
}

// ─── Recipient selection ─────────────────────────────────────────────────────

export function selectRecipients(recipients, audience, selectedKeys = []) {
  if (audience === AUDIENCE.CUSTOM) {
    const keys = new Set(selectedKeys);
    return recipients.filter((r) => keys.has(r.key));
  }
  const types = AUDIENCE_TYPES[audience] || [];
  return recipients.filter((r) => types.includes(r.type));
}