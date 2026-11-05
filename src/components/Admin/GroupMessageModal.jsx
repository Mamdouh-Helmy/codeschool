// components/admin/GroupMessageModal.jsx
"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  CalendarDays,
  CheckCheck,
  CheckCircle,
  Clock,
  Globe,
  GraduationCap,
  Info,
  Loader2,
  MapPin,
  Search,
  Send,
  Sparkles,
  UserCheck,
  Users,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";
import {
  AUDIENCE,
  GENDER_INLINE_EXAMPLE,
  LOW_CREDIT_LEVELS,
  MAX_MESSAGE_LENGTH,
  RECIPIENT_TYPE,
  VARIABLES,
  VARIABLE_CATEGORIES,
  buildVariables,
  composeMessage,
  describeRouting,
  findEmptyVariableUsage,
  findInapplicableVariables,
  findUnknownVariables,
  getAllTemplateTexts,
  getVariableSupport,
  isVariableApplicable,
  selectRecipients,
} from "@/utils/groupMessageShared";

// ─── Constants ────────────────────────────────────────────────────────────────

const SEND_DELAY_SEC = 0.85; // تقريبي — نفس فاصل السيرفر

const TYPE_META = {
  [RECIPIENT_TYPE.STUDENT]: {
    label: "الطلبة",
    single: "طالب",
    grad: "from-sky-500 to-cyan-400",
    soft: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    Icon: GraduationCap,
  },
  [RECIPIENT_TYPE.GUARDIAN]: {
    label: "أولياء الأمور",
    single: "ولي أمر",
    grad: "from-violet-500 to-fuchsia-400",
    soft: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    Icon: Users,
  },
  [RECIPIENT_TYPE.INSTRUCTOR]: {
    label: "المدرسين",
    single: "مدرس",
    grad: "from-amber-500 to-orange-400",
    soft: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    Icon: UserCheck,
  },
};
const TYPE_ORDER = [RECIPIENT_TYPE.STUDENT, RECIPIENT_TYPE.GUARDIAN, RECIPIENT_TYPE.INSTRUCTOR];

const AUDIENCE_OPTIONS = [
  { id: AUDIENCE.ALL, label: "الكل", Icon: Users, grad: "from-primary to-orange-deep" },
  { id: AUDIENCE.STUDENTS, label: "الطلبة", Icon: TYPE_META.student.Icon, grad: TYPE_META.student.grad },
  { id: AUDIENCE.GUARDIANS, label: "أولياء الأمور", Icon: TYPE_META.guardian.Icon, grad: TYPE_META.guardian.grad },
  { id: AUDIENCE.INSTRUCTORS, label: "المدرسين", Icon: TYPE_META.instructor.Icon, grad: TYPE_META.instructor.grad },
  { id: AUDIENCE.CUSTOM, label: "تحديد يدوي", Icon: CheckCircle, grad: "from-emerald-500 to-teal-400" },
];

const CREDIT_STYLE = {
  good: { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-300", chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  low: { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-300", chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  critical: { bar: "bg-orange-500", text: "text-orange-600 dark:text-orange-300", chip: "bg-orange-500/10 text-orange-700 dark:text-orange-300" },
  zero: { bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-300", chip: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  none: { bar: "bg-gray-300", text: "text-gray-500", chip: "bg-gray-500/10 text-gray-500 dark:text-gray-300" },
};

const SKIP_REASONS = {
  no_phone: "مفيش رقم واتساب",
  duplicate: "نفس الرسالة اتبعتت لنفس الرقم",
  empty_message: "مفيش نص بلغة المستلم",
};

const GROUP_TYPE_LABEL = { kids: "🧒 أطفال", adults: "🧑 بالغين" };

const CARD = "rounded-2xl border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-darkmode";
const INPUT =
  "w-full px-3 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all bg-white dark:bg-dark_input dark:text-white";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

// قوالب جاهزة — بتتبني حسب نوع الجروب عشان متغيرات المكان تبقى مضبوطة
function buildQuickTemplates(mode) {
  const offline = mode === "offline";
  const locAr = offline ? "📍 {placeName}\n📌 {address}\n🗺️ {mapsLink}" : "🔗 رابط الحصة: {meetingLink}";
  const locEn = offline ? "📍 {placeName}\n📌 {address}\n🗺️ {mapsLink}" : "🔗 Session link: {meetingLink}";
  return [
    {
      id: "reminder",
      icon: "⏰",
      label: "تذكير بالحصة",
      ar: `{salutation}،\nتذكير بحصة {sessionName} ضمن مجموعة {groupName}.\n📅 {sessionDate}\n🕒 {sessionTime}\n${locAr}`,
      en: `{salutation},\nA reminder about the session "{sessionName}" in {groupName}.\n📅 {sessionDate}\n🕒 {sessionTime}\n${locEn}`,
    },
    {
      id: "credit",
      icon: "🔋",
      label: "تنبيه الرصيد",
      ar: "{salutation}،\nرصيد باقة {packageName} المتبقي {remainingHours} ساعة. يرجى التجديد في أقرب وقت لضمان استمرار الحصص.",
      en: "{salutation},\nThe remaining balance on your {packageName} package is {remainingHours} hours. Please renew soon to keep your sessions running.",
    },
    {
      id: "announce",
      icon: "📣",
      label: "إعلان عام",
      ar: "{salutation}،\nاكتب إعلانك هنا بخصوص مجموعة {groupName}.\n\nفريق Code School 💻",
      en: "{salutation},\nWrite your announcement for {groupName} here.\n\nThe Code School Team 💻",
    },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const clamp = (n) => Math.min(100, Math.max(0, n));
const fmtHours = (h) => String(+Number(h || 0).toFixed(2));
const displayName = (r) => r.names[r.language] || r.fullName || "—";
const hasLowCredit = (r) => !!r.credit && LOW_CREDIT_LEVELS.includes(r.credit.level);

const roleLabel = (r) =>
  r.type === RECIPIENT_TYPE.GUARDIAN ? (r.gender === "female" ? "أم" : "أب") : TYPE_META[r.type].single;

const rowSubtitle = (r) => {
  const parts = [r.gender === "female" ? "♀ أنثى" : "♂ ذكر", r.language === "ar" ? "عربي" : "English"];
  if (r.type === RECIPIENT_TYPE.GUARDIAN) parts.unshift(`${roleLabel(r)} ${r.studentNames.ar || ""}`.trim());
  return parts.join(" · ");
};

const nowLabel = () => new Date().toLocaleTimeString("ar-EG-u-nu-latn", { hour: "2-digit", minute: "2-digit" });

// ─── Data hook ────────────────────────────────────────────────────────────────

function useGroupRecipients(groupId) {
  const [state, setState] = useState({ loading: true, error: null, group: null, recipients: [], fallbackKeys: [] });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}/send-message`, { cache: "no-store" });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "فشل تحميل المستلمين");
        if (!cancelled) setState({ loading: false, error: null, fallbackKeys: [], ...json.data });
      } catch (err) {
        if (!cancelled) setState({ loading: false, error: err.message, group: null, recipients: [], fallbackKeys: [] });
      }
    })();
    return () => { cancelled = true; };
  }, [groupId]);

  return state;
}

// ─── Small UI pieces ──────────────────────────────────────────────────────────

const Avatar = ({ type, name, size = "h-9 w-9" }) => (
  <span
    className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-sm ${TYPE_META[type].grad}`}
  >
    {(name || "?").charAt(0)}
  </span>
);

function StepHeader({ n, title, hint, aside }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-orange-deep text-xs font-bold text-white shadow-md shadow-primary/25">
        {n}
      </span>
      <h3 className="text-sm font-bold text-MidnightNavyText dark:text-white">{title}</h3>
      {hint && <span className="hidden text-xs text-gray-400 sm:inline">{hint}</span>}
      {aside && <div className="mr-auto">{aside}</div>}
    </div>
  );
}

function Alert({ tone = "amber", icon: Icon = AlertTriangle, children }) {
  const tones = {
    amber: "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-200",
    rose: "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-200",
    sky: "border-sky-500/25 bg-sky-500/10 text-sky-800 dark:text-sky-200",
  };
  return (
    <div className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs leading-relaxed ${tones[tone]}`}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function BalanceMeter({ credit }) {
  if (!credit) return null;
  const style = CREDIT_STYLE[credit.level] || CREDIT_STYLE.none;

  if (!credit.hasPackage) {
    return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.chip}`}>بدون باقة</span>;
  }

  const pct = credit.totalHours > 0 ? clamp((credit.remainingHours / credit.totalHours) * 100) : 0;
  const title = [
    credit.packageName,
    credit.endDate && `تنتهي ${new Date(credit.endDate).toLocaleDateString("ar-EG-u-nu-latn")}`,
  ].filter(Boolean).join(" — ");

  return (
    <div title={title} className="w-28 shrink-0">
      <div className="flex items-baseline justify-between gap-1">
        <span className={`text-xs font-bold tabular-nums ${style.text}`}>
          {fmtHours(credit.remainingHours)} <span className="font-medium">ساعة</span>
        </span>
        <span className="text-[10px] tabular-nums text-gray-400">من {fmtHours(credit.totalHours)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div className={`h-full rounded-full transition-all ${style.bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function GroupHero({ group, counts }) {
  const offline = group.deliveryMode === "offline";
  const next = group.nextSession;
  const nextLabel = next?.date
    ? new Date(next.date).toLocaleDateString("ar-EG-u-nu-latn", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Cairo" })
    : null;

  const Chip = ({ children }) => (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/90 ring-1 ring-inset ring-white/15">
      {children}
    </span>
  );

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 text-white md:p-5">
      <div className="pointer-events-none absolute -left-10 -top-16 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 right-10 h-40 w-40 rounded-full bg-sky-500/20 blur-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2.5">
          <div>
            <h2 className="truncate text-lg font-bold md:text-xl">{group.name}</h2>
            {group.courseName && <p className="text-xs text-white/60">{group.courseName}</p>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Chip>
              {offline ? <MapPin className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
              {offline ? "أوفلاين" : "أونلاين"}
            </Chip>
            {GROUP_TYPE_LABEL[group.groupType] && <Chip>{GROUP_TYPE_LABEL[group.groupType]}</Chip>}
            {group.isMakeup && <Chip>🎁 تعويضية</Chip>}
            {group.timeFrom && (
              <Chip>
                <Clock className="h-3 w-3" />
                <span dir="ltr" className="tabular-nums">{group.timeFrom} – {group.timeTo}</span>
              </Chip>
            )}
            {next && (
              <Chip>
                <CalendarDays className="h-3 w-3" />
                {next.title ? `${next.title} · ` : ""}{nextLabel}
              </Chip>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {TYPE_ORDER.map((t) => {
            const { Icon, label } = TYPE_META[t];
            return (
              <div key={t} className="min-w-[72px] rounded-xl bg-white/10 px-3 py-2 text-center ring-1 ring-inset ring-white/10">
                <Icon className="mx-auto mb-1 h-3.5 w-3.5 text-white/60" />
                <p className="text-lg font-bold leading-none tabular-nums">{counts[t]}</p>
                <p className="mt-1 text-[10px] text-white/60">{label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: audience + recipients ────────────────────────────────────────────

function AudiencePicker({ value, onChange, recipients, selectedCount, lowCount, onPickLow }) {
  const countFor = (id) => (id === AUDIENCE.CUSTOM ? selectedCount : selectRecipients(recipients, id).length);
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {AUDIENCE_OPTIONS.map(({ id, label, Icon, grad }) => {
          const active = value === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(id)}
              className={`group relative overflow-hidden rounded-xl border p-3 text-right transition-all ${FOCUS} ${
                active
                  ? "border-primary bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/30"
                  : "border-PowderBlueBorder bg-white hover:border-primary/40 dark:border-dark_border dark:bg-darkmode"
              }`}
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm ${grad}`}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="mt-2 text-xs font-bold text-MidnightNavyText dark:text-white">{label}</div>
              <div className="text-[11px] tabular-nums text-gray-400">{countFor(id)} شخص</div>
              {active && <CheckCircle className="absolute left-2 top-2 h-4 w-4 text-primary" />}
            </button>
          );
        })}
      </div>

      {lowCount > 0 && (
        <button
          type="button"
          onClick={onPickLow}
          className={`inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-500/25 transition hover:bg-amber-500/20 dark:text-amber-300 ${FOCUS}`}
        >
          <Wallet className="h-3.5 w-3.5" />
          حدد أصحاب الرصيد المنخفض فقط ({lowCount})
        </button>
      )}
    </div>
  );
}

function RecipientRow({ recipient: r, selectable, checked, onToggle }) {
  const interactive = selectable && r.hasPhone;
  const Wrapper = interactive ? "label" : "div";
  return (
    <Wrapper
      className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
        interactive ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-dark_input/60" : ""
      } ${checked ? "bg-primary/[0.05]" : ""} ${!r.hasPhone ? "opacity-60" : ""}`}
    >
      {selectable && (
        <input
          type="checkbox"
          disabled={!r.hasPhone}
          checked={checked}
          onChange={(e) => onToggle([r.key], e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
      )}
      <Avatar type={r.type} name={displayName(r)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-MidnightNavyText dark:text-white">{displayName(r)}</p>
        <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">{rowSubtitle(r)}</p>
      </div>
      {!r.hasPhone && (
        <span className="shrink-0 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-300">
          بدون رقم
        </span>
      )}
      <BalanceMeter credit={r.credit} />
    </Wrapper>
  );
}

function RecipientPanel({ recipients, audience, selected, onToggle }) {
  const [query, setQuery] = useState("");
  const selectable = audience === AUDIENCE.CUSTOM;

  const visible = useMemo(() => {
    const base = selectable ? recipients : selectRecipients(recipients, audience);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((r) =>
      [r.fullName, r.names.ar, r.names.en, r.studentNames.ar].some((v) => v && v.toLowerCase().includes(q)),
    );
  }, [recipients, audience, selectable, query]);

  return (
    <div className={`${CARD} overflow-hidden`}>
      <div className="flex items-center gap-2 border-b border-PowderBlueBorder p-2.5 dark:border-dark_border">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث بالاسم…"
            className={`${INPUT} py-1.5 pr-9`}
          />
        </div>
        <span className="shrink-0 text-xs tabular-nums text-gray-400">{visible.length} شخص</span>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {TYPE_ORDER.map((type) => {
          const items = visible.filter((r) => r.type === type);
          if (!items.length) return null;
          const meta = TYPE_META[type];
          const pickable = items.filter((r) => r.hasPhone);
          const allOn = pickable.length > 0 && pickable.every((r) => selected.has(r.key));
          const low = items.filter(hasLowCredit).length;
          return (
            <section key={type}>
              <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-PowderBlueBorder bg-gray-50/95 px-3 py-1.5 text-xs font-bold text-gray-600 backdrop-blur dark:border-dark_border dark:bg-dark_input/95 dark:text-gray-300">
                {selectable && (
                  <input
                    type="checkbox"
                    checked={allOn}
                    onChange={(e) => onToggle(pickable.map((r) => r.key), e.target.checked)}
                    className="h-4 w-4 accent-primary"
                    aria-label={`تحديد كل ${meta.label}`}
                  />
                )}
                <span className={`flex h-5 w-5 items-center justify-center rounded-md ${meta.soft}`}>
                  <meta.Icon className="h-3 w-3" />
                </span>
                {meta.label}
                <span className="font-normal text-gray-400">({items.length})</span>
                {low > 0 && (
                  <span className="mr-auto rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                    {low} رصيد منخفض
                  </span>
                )}
              </header>
              <div className="divide-y divide-PowderBlueBorder dark:divide-dark_border">
                {items.map((r) => (
                  <RecipientRow
                    key={r.key}
                    recipient={r}
                    selectable={selectable}
                    checked={selected.has(r.key)}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            </section>
          );
        })}
        {visible.length === 0 && <p className="py-10 text-center text-xs text-gray-400">مفيش نتائج</p>}
      </div>
    </div>
  );
}

// ─── Step 2: editor ───────────────────────────────────────────────────────────

const hasT = (s) => !!String(s || "").trim();

function LangTabs({ lang, onChange, counts, missing, scopeIsAll }) {
  const tabs = [
    { id: "ar", label: "🇸🇦 عربي" },
    { id: "en", label: "🇬🇧 English" },
  ];
  return (
    <div className="inline-flex rounded-xl bg-gray-100 p-0.5 dark:bg-dark_input">
      {tabs.map(({ id, label }) => {
        const isMissing = counts[id] > 0 && missing[id];
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-bold transition ${FOCUS} ${
              lang === id ? "bg-white text-MidnightNavyText shadow-sm dark:bg-gray-600 dark:text-white" : "text-gray-500"
            }`}
          >
            {label}
            <span
              title={
                isMissing
                  ? "فيه مستلمين بالغة دي ومفيش نص ليها"
                  : scopeIsAll
                    ? "مستلمين بالغة دي هياخدوا النص العام"
                    : "عدد المستلمين بالغة دي في الفئة دي"
              }
              className={`rounded-full px-1.5 text-[10px] tabular-nums ${
                isMissing ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-gray-200 text-gray-500 dark:bg-gray-500/40 dark:text-gray-200"
              }`}
            >
              {counts[id]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// نص عام + نص مخصص لكل فئة (طالب / ولي أمر / مدرس)
function RoleScopeTabs({ scope, onChange, drafts, counts, visibleTypes }) {
  const tabs = [
    { id: "all", label: "النص العام", Icon: Sparkles },
    ...visibleTypes.map((t) => ({ id: t, label: TYPE_META[t].label, Icon: TYPE_META[t].Icon })),
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map(({ id, label, Icon }) => {
        const active = scope === id;
        const custom = id !== "all" && (hasT(drafts[id].ar) || hasT(drafts[id].en));
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(id)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${FOCUS} ${
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-PowderBlueBorder bg-white text-gray-600 hover:border-primary/40 dark:border-dark_border dark:bg-dark_input dark:text-gray-200"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {custom && <span title="فيه نص مخصص للفئة دي" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
            <span className="text-[10px] font-normal tabular-nums opacity-60">{counts[id]}</span>
          </button>
        );
      })}
    </div>
  );
}

const SOURCE_STYLE = {
  role: { label: "نص مخصص", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  general: { label: "النص العام", cls: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  fallback: { label: "لغة تانية", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  none: { label: "مفيش نص", cls: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
};

// خريطة التوزيع: كل فئة × لغة → هتاخد أنهي نص
function RoutingMatrix({ cells }) {
  if (!cells.length) return null;
  const types = TYPE_ORDER.filter((t) => cells.some((c) => c.type === t));
  const cellOf = (type, language) => cells.find((c) => c.type === type && c.language === language);

  return (
    <div className="overflow-hidden rounded-xl border border-PowderBlueBorder dark:border-dark_border">
      <p className="border-b border-PowderBlueBorder bg-gray-50 px-3 py-2 text-xs font-bold text-gray-600 dark:border-dark_border dark:bg-dark_input dark:text-gray-300">
        مين هياخد أنهي نص
      </p>
      <div className="divide-y divide-PowderBlueBorder text-xs dark:divide-dark_border">
        <div className="grid grid-cols-[110px_1fr_1fr] gap-2 px-3 py-1.5 text-[11px] font-bold text-gray-400">
          <span />
          <span>🇸🇦 عربي</span>
          <span>🇬🇧 English</span>
        </div>
        {types.map((type) => (
          <div key={type} className="grid grid-cols-[110px_1fr_1fr] items-center gap-2 px-3 py-2">
            <span className="flex items-center gap-1.5 font-semibold text-MidnightNavyText dark:text-white">
              <span className={`flex h-5 w-5 items-center justify-center rounded-md ${TYPE_META[type].soft}`}>
                {React.createElement(TYPE_META[type].Icon, { className: "h-3 w-3" })}
              </span>
              {TYPE_META[type].label}
            </span>
            {["ar", "en"].map((language) => {
              const cell = cellOf(type, language);
              if (!cell) return <span key={language} className="text-gray-300">—</span>;
              const style = SOURCE_STYLE[cell.source];
              return (
                <span key={language} className="flex items-center gap-1.5">
                  <span className="tabular-nums text-gray-500">{cell.count}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.cls}`}>{style.label}</span>
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickTemplates({ templates, onApply }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="flex items-center gap-1 text-[11px] font-bold text-gray-500">
        <Sparkles className="h-3.5 w-3.5 text-primary" /> ابدأ من قالب:
      </span>
      {templates.map((tpl) => (
        <button
          key={tpl.id}
          type="button"
          onClick={() => onApply(tpl)}
          className={`rounded-full border border-PowderBlueBorder bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 transition hover:border-primary/50 hover:bg-primary/5 dark:border-dark_border dark:bg-dark_input dark:text-gray-200 ${FOCUS}`}
        >
          {tpl.icon} {tpl.label}
        </button>
      ))}
    </div>
  );
}

function VariablePalette({ group, activeTypes, values, onInsert }) {
  const applicable = VARIABLES.filter((v) => isVariableApplicable(v, group));
  const hiddenMode = group.deliveryMode === "offline" ? "الأونلاين" : "الأوفلاين";
  const hiddenCount = VARIABLES.length - applicable.length;

  const sections = VARIABLE_CATEGORIES.map((cat) => ({
    cat,
    items: applicable
      .filter((v) => v.category === cat.id)
      .map((v) => ({ v, support: getVariableSupport(v, activeTypes) }))
      .filter(({ support }) => support !== "none"),
  })).filter((s) => s.items.length);

  return (
    <div className="space-y-2.5">
      {sections.map(({ cat, items }) => (
        <div key={cat.id} className="flex flex-wrap items-center gap-1.5">
          <span className="w-24 shrink-0 text-[11px] font-bold text-gray-400">
            {cat.icon} {cat.label}
          </span>
          {items.map(({ v, support }) => {
            const sample = values[v.key];
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => onInsert(`{${v.key}}`)}
                title={`{${v.key}}${sample ? ` — مثال: ${sample}` : ""}${support === "partial" ? "\n(مش هيظهر لبعض المستلمين)" : ""}`}
                className={`inline-flex items-center gap-1.5 rounded-lg border border-PowderBlueBorder bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:border-primary/40 hover:bg-primary/5 active:scale-95 dark:border-dark_border dark:bg-dark_input dark:text-gray-200 ${FOCUS}`}
              >
                <span>{v.icon}</span>
                {v.label}
                {support === "partial" && <AlertTriangle className="h-3 w-3 text-amber-500" />}
              </button>
            );
          })}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="w-24 shrink-0 text-[11px] font-bold text-gray-400">⚧ الجنس</span>
        <button
          type="button"
          onClick={() => onInsert(GENDER_INLINE_EXAMPLE)}
          title="بيختار الكلمة حسب جنس المستلم: {كلمة للذكر|كلمة للأنثى}"
          className={`inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary ${FOCUS}`}
        >
          {GENDER_INLINE_EXAMPLE}
        </button>
        <span className="text-[11px] text-gray-400">بيختار الكلمة حسب جنس كل مستلم</span>
      </div>

      {hiddenCount > 0 && (
        <p className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <Info className="h-3 w-3" />
          متغيرات {hiddenMode} ({hiddenCount}) مخفية لأن الجروب ده {group.deliveryMode === "offline" ? "أوفلاين" : "أونلاين"}.
        </p>
      )}
    </div>
  );
}

// ─── Preview (العنصر المميز: واتساب حقيقي بنفس بيانات الإرسال) ────────────────

function PhonePreview({ recipient, preview }) {
  const dir = preview?.language === "ar" || !preview ? "rtl" : "ltr";
  const time = useMemo(nowLabel, [preview?.text]);
  return (
    <div className="overflow-hidden rounded-[22px] border border-PowderBlueBorder shadow-lg shadow-black/5 dark:border-dark_border">
      <div className="flex items-center gap-2.5 bg-[#075e54] px-3 py-2.5 text-white dark:bg-[#202c33]">
        {recipient ? (
          <Avatar type={recipient.type} name={displayName(recipient)} size="h-9 w-9" />
        ) : (
          <span className="h-9 w-9 rounded-full bg-white/20" />
        )}
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[13px] font-bold">{recipient ? displayName(recipient) : "—"}</p>
          <p className="truncate text-[11px] text-white/70">
            {recipient ? `${roleLabel(recipient)} · ${recipient.language === "ar" ? "عربي" : "English"}` : "اختار مستلم للمعاينة"}
          </p>
        </div>
      </div>

      <div
        className="min-h-[200px] bg-[#efeae2] p-3 dark:bg-[#0b141a]"
        style={{ backgroundImage: "radial-gradient(rgba(120,120,120,0.12) 1px, transparent 1px)", backgroundSize: "16px 16px" }}
      >
        {preview ? (
          <div
            dir={dir}
            className={`relative max-w-[94%] rounded-xl bg-white px-3 pb-5 pt-2 text-[13px] leading-relaxed text-[#111b21] shadow-[0_1px_1px_rgba(11,20,26,0.15)] dark:bg-[#005c4b] dark:text-[#e9edef] ${
              dir === "rtl" ? "rounded-tr-sm" : "rounded-tl-sm"
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{preview.text}</p>
            <span className="absolute bottom-1 left-2 flex items-center gap-1 text-[10px] text-[#667781] dark:text-[#ffffff99]" dir="ltr">
              {time}
              <CheckCheck className="h-3.5 w-3.5 text-sky-500" />
            </span>
          </div>
        ) : (
          <p className="py-16 text-center text-xs text-gray-500">اكتب الرسالة عشان تظهر المعاينة</p>
        )}
      </div>
    </div>
  );
}

// ─── Result ───────────────────────────────────────────────────────────────────

function Donut({ sent, failed, skipped }) {
  const total = Math.max(1, sent + failed + skipped);
  const R = 42;
  const C = 2 * Math.PI * R;
  const segments = [
    { value: sent, color: "#10b981" },
    { value: failed, color: "#f43f5e" },
    { value: skipped, color: "#f59e0b" },
  ];
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" className="h-32 w-32 -rotate-90" role="img" aria-label={`اتبعتت ${sent} من ${total}`}>
      <circle cx="50" cy="50" r={R} fill="none" strokeWidth="10" className="stroke-gray-200 dark:stroke-gray-700" />
      {segments.map((s, i) => {
        const len = (s.value / total) * C;
        const el = (
          <circle
            key={i}
            cx="50" cy="50" r={R} fill="none" strokeWidth="10" stroke={s.color}
            strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset}
          />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}

function SendResult({ result, onClose }) {
  const problems = result.results.filter((r) => r.status !== "sent");
  const items = [
    { label: "اتبعتت", value: result.sent, dot: "bg-emerald-500" },
    { label: "فشلت", value: result.failed, dot: "bg-rose-500" },
    { label: "اتخطت", value: result.skipped, dot: "bg-amber-500" },
  ];
  return (
    <div className="space-y-5 p-4 md:p-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-center gap-6">
        <div className="relative">
          <Donut sent={result.sent} failed={result.failed} skipped={result.skipped} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums text-MidnightNavyText dark:text-white">{result.sent}</span>
            <span className="text-[11px] text-gray-500">من {result.total}</span>
          </div>
        </div>
        <div className="space-y-2">
          {items.map((i) => (
            <div key={i.label} className="flex items-center gap-2.5 text-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${i.dot}`} />
              <span className="w-14 text-gray-500">{i.label}</span>
              <span className="font-bold tabular-nums text-MidnightNavyText dark:text-white">{i.value}</span>
            </div>
          ))}
        </div>
      </div>

      {problems.length > 0 && (
        <div className={`${CARD} overflow-hidden`}>
          <p className="border-b border-PowderBlueBorder bg-gray-50 px-3 py-2 text-xs font-bold text-gray-600 dark:border-dark_border dark:bg-dark_input dark:text-gray-300">
            محتاجة مراجعة ({problems.length})
          </p>
          <ul className="max-h-52 divide-y divide-PowderBlueBorder overflow-y-auto text-xs dark:divide-dark_border">
            {problems.map((r) => (
              <li key={r.key} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="flex items-center gap-2 font-semibold text-MidnightNavyText dark:text-white">
                  {TYPE_META[r.type] && <Avatar type={r.type} name={r.name} size="h-6 w-6" />}
                  {r.name || r.key}
                </span>
                <span className={r.status === "failed" ? "text-rose-600" : "text-amber-600"}>
                  {r.status === "failed" ? r.error : SKIP_REASONS[r.reason] || r.reason}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        className={`w-full rounded-xl bg-gradient-to-r from-primary to-orange-deep py-3 text-sm font-semibold text-white shadow-md shadow-primary/25 transition active:scale-[0.99] ${FOCUS}`}
      >
        تم
      </button>
    </div>
  );
}

// ─── Review panel ─────────────────────────────────────────────────────────────

function Checklist({ items }) {
  return (
    <ul className="space-y-1.5">
      {items.map(({ ok, text }) => (
        <li key={text} className="flex items-center gap-2 text-xs">
          {ok ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />}
          <span className={ok ? "text-gray-700 dark:text-gray-200" : "text-gray-400"}>{text}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const makeDrafts = () => ({
  all: { ar: "", en: "" },
  student: { ar: "", en: "" },
  guardian: { ar: "", en: "" },
  instructor: { ar: "", en: "" },
});

export default function GroupMessageModal({ groupId, onClose }) {
  const { loading, error, group, recipients, fallbackKeys } = useGroupRecipients(groupId);

  const [audience, setAudience] = useState(AUDIENCE.ALL);
  const [selected, setSelected] = useState(() => new Set());
  const [scope, setScope] = useState("all"); // "all" | student | guardian | instructor
  const [lang, setLang] = useState("ar");
  const [drafts, setDrafts] = useState(makeDrafts);
  const [previewKey, setPreviewKey] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const textareaRef = useRef(null);

  const templates = useMemo(
    () => ({
      contentAr: drafts.all.ar,
      contentEn: drafts.all.en,
      overrides: { student: drafts.student, guardian: drafts.guardian, instructor: drafts.instructor },
    }),
    [drafts],
  );
  const selectedKeys = useMemo(() => [...selected], [selected]);

  const targets = useMemo(
    () => selectRecipients(recipients, audience, selectedKeys),
    [recipients, audience, selectedKeys],
  );
  const sendable = useMemo(() => targets.filter((r) => r.hasPhone), [targets]);
  const noPhoneCount = targets.length - sendable.length;
  const activeTypes = useMemo(() => [...new Set(sendable.map((r) => r.type))], [sendable]);

  // التابات: الفئات الموجودة في الجمهور (أو اللي ليها نص مخصص مكتوب فعلاً)
  const visibleTypes = useMemo(
    () => TYPE_ORDER.filter((t) => activeTypes.includes(t) || hasT(drafts[t].ar) || hasT(drafts[t].en)),
    [activeTypes, drafts],
  );
  useEffect(() => {
    if (scope !== "all" && !visibleTypes.includes(scope)) setScope("all");
  }, [scope, visibleTypes]);

  const scopeCounts = useMemo(
    () => ({
      all: sendable.length,
      ...Object.fromEntries(TYPE_ORDER.map((t) => [t, sendable.filter((r) => r.type === t).length])),
    }),
    [sendable],
  );

  // عدد المستلمين بكل لغة في النطاق الحالي (العام: اللي هياخدوا النص العام بس)
  const langCounts = useMemo(() => {
    const countFor = (language) =>
      scope === "all"
        ? sendable.filter((r) => r.language === language && !hasT(drafts[r.type][language])).length
        : sendable.filter((r) => r.type === scope && r.language === language).length;
    return { ar: countFor("ar"), en: countFor("en") };
  }, [sendable, scope, drafts]);

  const missingByLang = useMemo(() => {
    const miss = (language) =>
      scope === "all"
        ? !hasT(drafts.all[language])
        : !hasT(drafts[scope][language]) && !hasT(drafts.all[language]);
    return { ar: miss("ar"), en: miss("en") };
  }, [scope, drafts]);

  const lowKeys = useMemo(() => recipients.filter((r) => r.hasPhone && hasLowCredit(r)).map((r) => r.key), [recipients]);
  const typeCounts = useMemo(
    () => Object.fromEntries(TYPE_ORDER.map((t) => [t, recipients.filter((r) => r.type === t).length])),
    [recipients],
  );
  const quickTemplates = useMemo(() => buildQuickTemplates(group?.deliveryMode), [group?.deliveryMode]);

  const previewRecipient = sendable.find((r) => r.key === previewKey) || sendable[0] || null;
  const preview = previewRecipient && group ? composeMessage(previewRecipient, group, templates) : null;
  const previewValues = previewRecipient && group ? buildVariables(previewRecipient, group, lang) : {};

  const allTexts = useMemo(() => getAllTemplateTexts(templates), [templates]);
  const allText = allTexts.join(" ");
  const unknownVars = useMemo(() => findUnknownVariables(allText), [allText]);
  const inapplicableVars = useMemo(
    () => (group ? findInapplicableVariables(allText, group) : []),
    [allText, group],
  );
  const emptyUsage = useMemo(
    () => (group ? findEmptyVariableUsage(sendable, group, templates) : []),
    [sendable, group, templates],
  );
  const routing = useMemo(() => describeRouting(sendable, templates), [sendable, templates]);
  const noTextCount = routing.filter((c) => c.source === "none").reduce((n, c) => n + c.count, 0);
  const fallbackLangCount = routing.filter((c) => c.source === "fallback").reduce((n, c) => n + c.count, 0);

  const current = drafts[scope][lang];
  const hasContent = allTexts.length > 0;
  const varsOk = unknownVars.length === 0 && inapplicableVars.length === 0;
  const canSend = hasContent && sendable.length > 0 && varsOk && !sending;
  const etaSec = Math.max(1, Math.round(sendable.length * SEND_DELAY_SEC));
  const paletteTypes = scope === "all" ? activeTypes : [scope];
  const scopeLabel = scope === "all" ? null : TYPE_META[scope].label;

  // شريط تقدّم تقديري أثناء الإرسال (السيرفر بيبعت واحد واحد)
  useEffect(() => {
    if (!sending) { setProgress(0); return undefined; }
    const total = Math.max(2000, sendable.length * SEND_DELAY_SEC * 1000);
    const start = Date.now();
    const id = setInterval(() => setProgress(Math.min(94, ((Date.now() - start) / total) * 100)), 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sending]);

  const toggleKeys = useCallback((keys, on) => {
    setSelected((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => (on ? next.add(k) : next.delete(k)));
      return next;
    });
  }, []);

  const pickLowBalance = useCallback(() => {
    setAudience(AUDIENCE.CUSTOM);
    setSelected(new Set(lowKeys));
  }, [lowKeys]);

  const changeScope = (next) => {
    setScope(next);
    // المعاينة تتحول لأول مستلم من الفئة دي
    if (next !== "all") {
      const first = sendable.find((r) => r.type === next);
      if (first) setPreviewKey(first.key);
    }
  };

  const setDraft = (value) =>
    setDrafts((d) => ({ ...d, [scope]: { ...d[scope], [lang]: value } }));

  const insertText = (text) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? start;
    setDraft(current.slice(0, start) + text + current.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + text.length, start + text.length);
    });
  };

  const applyTemplate = (tpl) => {
    const cur = drafts[scope];
    if ((hasT(cur.ar) || hasT(cur.en)) && !window.confirm("هيتم استبدال النص الحالي بالقالب. متأكد؟")) return;
    setDrafts((d) => ({ ...d, [scope]: { ar: tpl.ar, en: tpl.en } }));
  };

  const copyFromGeneral = () => setDrafts((d) => ({ ...d, [scope]: { ...d.all } }));
  const clearScope = () => setDrafts((d) => ({ ...d, [scope]: { ar: "", en: "" } }));

  const handleSend = async () => {
    setConfirming(false);
    setSending(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          selectedKeys,
          contentAr: drafts.all.ar,
          contentEn: drafts.all.en,
          overrides: { student: drafts.student, guardian: drafts.guardian, instructor: drafts.instructor },
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل الإرسال");
      setProgress(100);
      setResult(json.data);
      toast.success(`اتبعتت لـ ${json.data.sent} مستلم`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 p-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-xs text-gray-400">جاري تحميل المستلمين…</p>
      </div>
    );
  }
  if (error) return <p className="p-10 text-center text-sm text-rose-600">{error}</p>;
  if (result) return <SendResult result={result} onClose={onClose} />;

  return (
    <div className="space-y-4" dir="rtl">
      <GroupHero group={group} counts={typeCounts} />

      {fallbackKeys.length > 0 && (
        <Alert tone="sky" icon={Info}>
          المتغيرات دي مش متسجلة (أو فاضية) في إعدادات المتغيرات فبيتستخدم نص افتراضي بدالها:{" "}
          <span dir="ltr" className="font-mono text-[11px]">{fallbackKeys.join(", ")}</span>
        </Alert>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ── Left ── */}
        <div className="min-w-0 space-y-6">
          <section>
            <StepHeader n={1} title="هتبعت لمين؟" hint="الرصيد المتبقي من الباقة ظاهر جنب كل اسم" />
            <div className="space-y-3">
              <AudiencePicker
                value={audience}
                onChange={setAudience}
                recipients={recipients}
                selectedCount={selected.size}
                lowCount={lowKeys.length}
                onPickLow={pickLowBalance}
              />
              <RecipientPanel recipients={recipients} audience={audience} selected={selected} onToggle={toggleKeys} />
            </div>
          </section>

          <section>
            <StepHeader n={2} title="اكتب الرسالة" hint="كل فئة وكل لغة بتاخد النص المناسب ليها" />
            <div className={`${CARD} space-y-3 p-3 md:p-4`}>
              <div className="space-y-2">
                <RoleScopeTabs
                  scope={scope}
                  onChange={changeScope}
                  drafts={drafts}
                  counts={scopeCounts}
                  visibleTypes={visibleTypes}
                />
                <p className="text-[11px] leading-relaxed text-gray-400">
                  {scope === "all"
                    ? "النص العام بيروح لأي فئة معندهاش نص مخصص. لو بتبعت لأكتر من فئة (طلبة + أولياء أمور + مدرسين) اكتب نص مخصص لكل فئة من التابات اللي فوق."
                    : `النص ده بيروح لـ ${scopeLabel} بس، وبيستبدل النص العام لهم.`}
                </p>
                {scope !== "all" && (
                  <div className="flex flex-wrap gap-1.5">
                    {!hasT(drafts[scope].ar) && !hasT(drafts[scope].en) && (hasT(drafts.all.ar) || hasT(drafts.all.en)) && (
                      <button
                        type="button"
                        onClick={copyFromGeneral}
                        className={`rounded-full border border-PowderBlueBorder px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:border-primary/40 dark:border-dark_border dark:text-gray-200 ${FOCUS}`}
                      >
                        ابدأ من النص العام
                      </button>
                    )}
                    {(hasT(drafts[scope].ar) || hasT(drafts[scope].en)) && (
                      <button
                        type="button"
                        onClick={clearScope}
                        className={`rounded-full border border-rose-500/30 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-500/10 ${FOCUS}`}
                      >
                        امسح النص المخصص (يرجعوا للعام)
                      </button>
                    )}
                  </div>
                )}
              </div>

              <QuickTemplates templates={quickTemplates} onApply={applyTemplate} />

              <div className="flex items-center justify-between gap-2">
                <LangTabs
                  lang={lang}
                  onChange={setLang}
                  counts={langCounts}
                  missing={missingByLang}
                  scopeIsAll={scope === "all"}
                />
                <div className="w-28">
                  <div className="text-left text-[11px] tabular-nums text-gray-400">
                    {current.length}/{MAX_MESSAGE_LENGTH}
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${clamp((current.length / MAX_MESSAGE_LENGTH) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <textarea
                ref={textareaRef}
                value={current}
                onChange={(e) => setDraft(e.target.value)}
                dir={lang === "ar" ? "rtl" : "ltr"}
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder={
                  lang === "ar"
                    ? `اكتب الرسالة العربية${scopeLabel ? ` لـ ${scopeLabel}` : ""} هنا…`
                    : `Write the English message${scopeLabel ? ` for ${TYPE_META[scope].single}s` : ""} here…`
                }
                className={`${INPUT} h-44 resize-y leading-7`}
              />

              {inapplicableVars.length > 0 && (
                <Alert tone="rose" icon={XCircle}>
                  متغيرات مش مناسبة لجروب {group.deliveryMode === "offline" ? "أوفلاين" : "أونلاين"}:{" "}
                  <span dir="ltr" className="font-mono">{inapplicableVars.join(" ")}</span> — شيلها قبل الإرسال.
                </Alert>
              )}
              {unknownVars.length > 0 && (
                <Alert tone="rose" icon={XCircle}>
                  متغيرات غير معروفة: <span dir="ltr" className="font-mono">{unknownVars.join(" ")}</span>
                </Alert>
              )}
              {emptyUsage.length > 0 && (
                <Alert tone="amber">
                  متغيرات هتطلع فاضية عند بعض المستلمين:{" "}
                  {emptyUsage.map((e) => `${e.label} (${e.count})`).join("، ")}
                  {" — "}اكتب نص مخصص للفئة اللي المتغير مش مناسب ليها.
                </Alert>
              )}

              <div className="border-t border-PowderBlueBorder pt-3 dark:border-dark_border">
                <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-gray-500">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  {scopeLabel ? `متغيرات مناسبة لـ ${scopeLabel}` : "اضغط على متغير لإدراجه"}
                </p>
                <VariablePalette group={group} activeTypes={paletteTypes} values={previewValues} onInsert={insertText} />
              </div>

              <RoutingMatrix cells={routing} />
            </div>
          </section>
        </div>

        {/* ── Right ── */}
        <aside className="min-w-0 space-y-3 lg:sticky lg:top-0">
          <StepHeader n={3} title="راجع وابعت" />

          <select
            value={previewRecipient?.key || ""}
            onChange={(e) => setPreviewKey(e.target.value)}
            disabled={!sendable.length}
            aria-label="معاينة كـ"
            className={INPUT}
          >
            {sendable.map((r) => (
              <option key={r.key} value={r.key}>
                معاينة كـ {displayName(r)} ({roleLabel(r)})
              </option>
            ))}
          </select>

          <PhonePreview recipient={previewRecipient} preview={preview} />

          <div className={`${CARD} space-y-3 p-4`}>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-primary/5 py-2.5">
                <p className="text-xl font-bold tabular-nums text-primary">{sendable.length}</p>
                <p className="text-[11px] text-gray-500">هيوصل لهم</p>
              </div>
              <div className={`rounded-xl py-2.5 ${noPhoneCount ? "bg-rose-500/10" : "bg-gray-50 dark:bg-dark_input"}`}>
                <p className={`text-xl font-bold tabular-nums ${noPhoneCount ? "text-rose-600" : "text-gray-400"}`}>{noPhoneCount}</p>
                <p className="text-[11px] text-gray-500">بدون رقم</p>
              </div>
            </div>

            <Checklist
              items={[
                { ok: sendable.length > 0, text: "فيه مستلمين عندهم أرقام" },
                { ok: hasContent, text: "نص الرسالة مكتوب" },
                { ok: hasContent && noTextCount === 0, text: "كل مستلم ليه نص مناسب" },
                { ok: varsOk, text: "المتغيرات سليمة ومناسبة للجروب" },
              ]}
            />

            {noTextCount > 0 && hasContent && (
              <Alert tone="rose" icon={XCircle}>
                {noTextCount} مستلم مفيش نص ليهم وهيتخطوا — شوف "مين هياخد أنهي نص".
              </Alert>
            )}
            {fallbackLangCount > 0 && (
              <Alert>{fallbackLangCount} مستلم هيستلموا اللغة التانية لأن مفيش نص بلغتهم.</Alert>
            )}

            {confirming ? (
              <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
                <p className="text-sm font-bold text-MidnightNavyText dark:text-white">
                  هتبعت لـ {sendable.length - noTextCount} مستلم
                </p>
                <p className="text-xs text-gray-500">الإرسال بياخد تقريبًا {etaSec} ثانية — متقفلش النافذة.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSend}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-bold text-white ${FOCUS}`}
                  >
                    <Send className="h-3.5 w-3.5" /> أكّد الإرسال
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className={`rounded-lg bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-600 dark:bg-dark_input dark:text-gray-200 ${FOCUS}`}
                  >
                    رجوع
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={!canSend}
                className={`relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-primary to-orange-deep py-3 text-sm font-semibold text-white shadow-md shadow-primary/25 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`}
              >
                {sending && (
                  <span
                    className="absolute inset-y-0 right-0 bg-white/25 transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sending ? `جاري الإرسال… ${Math.round(progress)}%` : `إرسال لـ ${sendable.length} مستلم`}
                </span>
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}