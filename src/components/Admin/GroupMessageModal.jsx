// components/admin/GroupMessageModal.jsx
"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Alarm,
  ArrowLeft,
  ArrowRight,
  Baby,
  BatteryLow,
  BookOpen,
  CalendarBlank,
  ChalkboardTeacher,
  ChatCircleDots,
  Check,
  Checks,
  CheckCircle,
  CircleNotch,
  ClockCounterClockwise,
  Clock,
  Copy,
  Envelope,
  Eraser,
  Gift,
  GenderIntersex,
  Globe,
  GraduationCap,
  HandWaving,
  Hourglass,
  Info,
  LinkSimple,
  MagnifyingGlass,
  MapPin,
  Megaphone,
  PaperPlaneRight,
  Phone,
  Plus,
  Presentation,
  Receipt,
  Star,
  Tag,
  Translate,
  User,
  Users,
  UsersThree,
  VideoCamera,
  Wallet,
  Warning,
  X,
  XCircle,
  DeviceMobile,
  Notebook,
  Sparkle,
} from "@phosphor-icons/react";
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
import InstancePicker, { INSTANCE_META } from "./InstancePicker";
import InstanceLogPanel from "./InstanceLogPanel";

// ─── Constants ────────────────────────────────────────────────────────────────

const SEND_DELAY_SEC = 0.85; // تقريبي — نفس فاصل السيرفر
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

const TYPE_META = {
  [RECIPIENT_TYPE.STUDENT]: { label: "الطلبة", single: "طالب", grad: "from-secondary to-teal-500", Icon: GraduationCap },
  [RECIPIENT_TYPE.GUARDIAN]: { label: "أولياء الأمور", single: "ولي أمر", grad: "from-primary to-amber-brand", Icon: UsersThree },
  [RECIPIENT_TYPE.INSTRUCTOR]: { label: "المدرسين", single: "مدرس", grad: "from-teal-dark to-brand-coral", Icon: ChalkboardTeacher },
};
const TYPE_ORDER = [RECIPIENT_TYPE.STUDENT, RECIPIENT_TYPE.GUARDIAN, RECIPIENT_TYPE.INSTRUCTOR];

const AUDIENCE_OPTIONS = [
  { id: AUDIENCE.ALL, label: "الكل", Icon: Users },
  { id: AUDIENCE.STUDENTS, label: "الطلبة", Icon: GraduationCap },
  { id: AUDIENCE.GUARDIANS, label: "أولياء الأمور", Icon: UsersThree },
  { id: AUDIENCE.INSTRUCTORS, label: "المدرسين", Icon: ChalkboardTeacher },
  { id: AUDIENCE.CUSTOM, label: "تحديد يدوي", Icon: CheckCircle },
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

const GROUP_TYPE_META = { kids: { label: "أطفال", Icon: Baby }, adults: { label: "بالغين", Icon: User } };

// خلفية الشات: نقط خفيفة بألوان البراند
const WALLPAPER = {
  backgroundImage: "radial-gradient(rgba(0,77,89,0.08) 1.2px, transparent 1.2px)",
  backgroundSize: "22px 22px",
};

// ─── Icons: كلها Phosphor ─────────────────────────────────────────────────────

// أي إيموجي جاي من الداتا بنشيله — الأيقونة الوحيدة هي Phosphor
const clean = (s) =>
  String(s || "")
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const VAR_ICON_RULES = [
  [/gender|جنس/i, GenderIntersex],
  [/greet|salut|honorific|تحية/i, HandWaving],
  [/guardian|parent|ولي/i, UsersThree],
  [/instructor|teacher|مدرس/i, ChalkboardTeacher],
  [/student|طالب/i, GraduationCap],
  [/meet|zoom|video|online/i, VideoCamera],
  [/map|place|address|location|room|مكان|عنوان/i, MapPin],
  [/link|url|join|رابط/i, LinkSimple],
  [/phone|mobile|whatsapp|number/i, Phone],
  [/mail/i, Envelope],
  [/remaining|hours|duration|ساعة/i, Hourglass],
  [/credit|balance|price|fee|amount|paid|package|رصيد|باقة/i, Wallet],
  [/invoice|receipt|payment/i, Receipt],
  [/date|day|month|weekday|تاريخ/i, CalendarBlank],
  [/time|start|end|minute|وقت/i, Clock],
  [/session|lesson|class|makeup|حصة/i, Presentation],
  [/course|module|level|program|track|group|كورس|مجموعة/i, BookOpen],
  [/grade|score|eval|rating|star|تقييم/i, Star],
  [/lang|لغة/i, Translate],
  [/name|اسم/i, User],
];

const CAT_ICON_RULES = [
  [/person|people|user|member|name|identity|recipient/i, User],
  [/group/i, UsersThree],
  [/session|lesson|class|schedule/i, Presentation],
  [/course|module|program/i, BookOpen],
  [/date|time|calendar/i, CalendarBlank],
  [/place|location|link|contact|url/i, LinkSimple],
  [/credit|money|payment|fee|finance|package/i, Wallet],
  [/eval|grade|report/i, Star],
  [/gender|greet/i, HandWaving],
];

const pickIcon = (str, rules) => {
  const hit = rules.find(([re]) => re.test(String(str || "")));
  return hit ? hit[1] : Tag;
};

// ألوان دواير قايمة المرفقات (زي واتساب لكن بألوان البراند)
const BUBBLE_GRADS = [
  "from-primary to-amber-brand",
  "from-secondary to-teal-500",
  "from-brand-coral to-primary",
  "from-teal-dark to-secondary",
];

const QUICK_ICONS = { reminder: Alarm, credit: BatteryLow, announce: Megaphone };

function buildQuickTemplates(mode) {
  const offline = mode === "offline";
  const locAr = offline ? "📍 {placeName}\n📌 {address}\n🗺️ {mapsLink}" : "🔗 رابط الحصة: {meetingLink}";
  const locEn = offline ? "📍 {placeName}\n📌 {address}\n🗺️ {mapsLink}" : "🔗 Session link: {meetingLink}";
  return [
    {
      id: "reminder",
      label: "تذكير بالحصة",
      ar: `{salutation}،\nتذكير بحصة {sessionName} ضمن مجموعة {groupName}.\n📅 {sessionDate}\n🕒 {sessionTime}\n${locAr}`,
      en: `{salutation},\nA reminder about the session "{sessionName}" in {groupName}.\n📅 {sessionDate}\n🕒 {sessionTime}\n${locEn}`,
    },
    {
      id: "credit",
      label: "تنبيه الرصيد",
      ar: "{salutation}،\nرصيد باقة {packageName} المتبقي {remainingHours} ساعة. يرجى التجديد في أقرب وقت لضمان استمرار الحصص.",
      en: "{salutation},\nThe remaining balance on your {packageName} package is {remainingHours} hours. Please renew soon to keep your sessions running.",
    },
    {
      id: "announce",
      label: "إعلان عام",
      ar: "{salutation}،\nاكتب إعلانك هنا بخصوص مجموعة {groupName}.\n\nفريق Code School 💻",
      en: "{salutation},\nWrite your announcement for {groupName} here.\n\nThe Code School Team 💻",
    },
  ].map((t) => ({ ...t, Icon: QUICK_ICONS[t.id] }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const clamp = (n) => Math.min(100, Math.max(0, n));
const fmtHours = (h) => String(+Number(h || 0).toFixed(2));
const displayName = (r) => r.names[r.language] || r.fullName || "—";
const hasLowCredit = (r) => !!r.credit && LOW_CREDIT_LEVELS.includes(r.credit.level);
const hasT = (s) => !!String(s || "").trim();

const roleLabel = (r) =>
  r.type === RECIPIENT_TYPE.GUARDIAN ? (r.gender === "female" ? "أم" : "أب") : TYPE_META[r.type].single;

const rowSubtitle = (r) => {
  const parts = [r.gender === "female" ? "أنثى" : "ذكر", r.language === "ar" ? "عربي" : "English"];
  if (r.type === RECIPIENT_TYPE.GUARDIAN) parts.unshift(`${roleLabel(r)} ${r.studentNames.ar || ""}`.trim());
  return parts.join(" · ");
};

const nowLabel = () => new Date().toLocaleTimeString("ar-EG-u-nu-latn", { hour: "2-digit", minute: "2-digit" });

// ─── Data hook ────────────────────────────────────────────────────────────────

function useGroupRecipients(groupId) {
  const [state, setState] = useState({ loading: true, error: null, group: null, recipients: [], fallbackKeys: [], instances: [] });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}/send-message`, { cache: "no-store" });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "فشل تحميل المستلمين");
        if (!cancelled) setState({ loading: false, error: null, fallbackKeys: [], instances: [], ...json.data });
      } catch (err) {
        if (!cancelled) setState({ loading: false, error: err.message, group: null, recipients: [], fallbackKeys: [], instances: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  return state;
}

// ─── Small UI pieces ──────────────────────────────────────────────────────────

const Avatar = ({ type, name, size = "h-11 w-11", text = "text-[15px]" }) => (
  <span className={`flex ${size} ${text} shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white ${TYPE_META[type].grad}`}>
    {(name || "?").charAt(0)}
  </span>
);

// إشعار وسط الشات (زي رسائل النظام في واتساب)
function SystemPill({ tone = "plain", icon: Icon, children, onClick }) {
  const tones = {
    plain: "bg-white/95 text-secondary/80 dark:bg-darklight/95 dark:text-darkmuted",
    amber: "bg-[#fff1c9] text-orange-deep dark:bg-amber-brand/20 dark:text-amber-brand",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200",
    sky: "bg-[#e3f4f6] text-secondary dark:bg-teal-400/10 dark:text-teal-200",
  };
  const El = onClick ? "button" : "div";
  return (
    <div className="flex justify-center">
      <El
        type={onClick ? "button" : undefined}
        onClick={onClick}
        className={`flex max-w-[92%] items-start gap-2 rounded-xl px-3 py-1.5 text-center text-[11.5px] leading-relaxed shadow-[0_1px_1px_rgba(0,42,51,0.1)] ${tones[tone]} ${onClick ? `hover:brightness-95 ${FOCUS}` : ""}`}
      >
        {Icon && <Icon size={14} weight="duotone" className="mt-0.5 shrink-0" />}
        <span className="min-w-0">{children}</span>
      </El>
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
  const title = [credit.packageName, credit.endDate && `تنتهي ${new Date(credit.endDate).toLocaleDateString("ar-EG-u-nu-latn")}`]
    .filter(Boolean)
    .join(" — ");
  return (
    <div title={title} className="w-16 shrink-0 text-end">
      <span className={`text-[11px] font-bold tabular-nums ${style.text}`}>
        {fmtHours(credit.remainingHours)} <span className="font-medium">س</span>
      </span>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-secondary/10 dark:bg-white/10">
        <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Sheet({ title, onClose, locked, children }) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button type="button" aria-label="إغلاق" onClick={locked ? undefined : onClose} className="absolute inset-0 bg-black/45" />
      <div className="relative max-h-[84%] w-full overflow-y-auto rounded-t-3xl bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.2)] dark:bg-darklight md:mx-auto md:mb-4 md:max-w-xl md:rounded-3xl">
        <div className="sticky top-0 z-10 bg-white px-4 pb-2 pt-2.5 dark:bg-darklight">
          <span className="mx-auto mb-2 block h-1 w-10 rounded-full bg-secondary/15 dark:bg-white/15" />
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-brand-deep dark:text-white">{title}</h3>
            {!locked && (
              <button type="button" onClick={onClose} aria-label="تم" className={`rounded-full p-1.5 text-secondary/60 hover:bg-secondary/10 ${FOCUS}`}>
                <X size={18} weight="bold" />
              </button>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Home header (تابات زي واتساب) ─────────────────────────────────────────────

function HomeHeader({ group, tab, onTab }) {
  const offline = group.deliveryMode === "offline";
  const gt = GROUP_TYPE_META[group.groupType];
  const bits = [
    { Icon: offline ? MapPin : Globe, text: offline ? "أوفلاين" : "أونلاين" },
    gt && { Icon: gt.Icon, text: gt.label },
    group.isMakeup && { Icon: Gift, text: "تعويضية" },
    group.timeFrom && { Icon: Clock, text: `${group.timeFrom} – ${group.timeTo}`, ltr: true },
  ].filter(Boolean);

  return (
    <div className="bg-secondary text-white dark:bg-darklight md:flex md:items-stretch">
      <div className="flex items-center gap-3 px-4 pb-2.5 pt-3.5 md:flex-1 md:py-2.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary shadow-brand-sm">
          <ChatCircleDots size={24} weight="fill" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[17px] font-bold leading-tight">{group.name}</h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11.5px] text-white/65">
            {bits.map(({ Icon, text, ltr }) => (
              <span key={text} className="inline-flex items-center gap-1">
                <Icon size={12} weight="duotone" />
                <span dir={ltr ? "ltr" : undefined} className="tabular-nums">
                  {text}
                </span>
              </span>
            ))}
          </p>
        </div>
      </div>
      <div className="flex md:w-80 md:shrink-0">
        {[
          { id: "people", label: "رسالة جديدة", Icon: PaperPlaneRight },
          { id: "log", label: "السجل", Icon: ClockCounterClockwise },
        ].map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              className={`relative flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-bold transition ${FOCUS} ${on ? "text-white" : "text-white/55 hover:text-white/80"}`}
            >
              <t.Icon size={16} weight={on ? "fill" : "bold"} mirrored={t.id === "people"} />
              {t.label}
              {on && <span className="absolute inset-x-6 bottom-0 h-[3px] rounded-t-full bg-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Screen 1: اختار المستلمين ────────────────────────────────────────────────

function RecipientRow({ recipient: r, selectable, checked, onToggle }) {
  const interactive = selectable && r.hasPhone;
  const Wrapper = interactive ? "label" : "div";
  return (
    <Wrapper
      className={`flex items-center gap-3 px-4 py-2.5 transition-colors has-[:focus-visible]:bg-PaleSkyBlu ${
        interactive ? "cursor-pointer active:bg-PaleSkyBlu" : ""
      } ${checked ? "bg-primary/[0.07]" : ""} ${!r.hasPhone ? "opacity-55" : ""}`}
    >
      {interactive && <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onToggle([r.key], e.target.checked)} />}
      <span className="relative shrink-0">
        <Avatar type={r.type} name={displayName(r)} />
        {checked && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-primary text-white">
            <Check size={22} weight="bold" />
          </span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-brand-deep dark:text-white">{displayName(r)}</p>
        <p className="truncate text-xs text-secondary/60 dark:text-darkmuted">
          {!r.hasPhone ? <span className="font-semibold text-rose-600 dark:text-rose-300">مفيش رقم واتساب</span> : rowSubtitle(r)}
        </p>
      </div>
      <BalanceMeter credit={r.credit} />
    </Wrapper>
  );
}

function PeopleScreen({ recipients, audience, onAudience, selected, onToggle, lowCount, onPickLow, sendableCount, noPhoneCount, onNext }) {
  const [query, setQuery] = useState("");
  const selectable = audience === AUDIENCE.CUSTOM;
  const countFor = (id) => (id === AUDIENCE.CUSTOM ? selected.size : selectRecipients(recipients, id).length);

  const visible = useMemo(() => {
    const base = selectable ? recipients : selectRecipients(recipients, audience);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((r) => [r.fullName, r.names.ar, r.names.en, r.studentNames.ar].some((v) => v && v.toLowerCase().includes(q)));
  }, [recipients, audience, selectable, query]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-white dark:bg-darkmode">
      <div className="space-y-2.5 px-3 pb-2 pt-3">
        <div className="relative">
          <MagnifyingGlass size={17} weight="bold" className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-secondary/40 dark:text-darksubtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن اسم"
            className="w-full rounded-full bg-PaleSkyBlu py-2.5 pe-11 ps-4 text-sm text-brand-deep outline-none placeholder:text-secondary/40 focus:ring-2 focus:ring-primary/30 dark:bg-dark_input dark:text-white dark:placeholder:text-darksubtle"
          />
        </div>

        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {AUDIENCE_OPTIONS.map(({ id, label, Icon }) => {
            const active = audience === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => onAudience(id)}
                className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition active:scale-95 ${FOCUS} ${
                  active ? "bg-primary text-white" : "bg-PaleSkyBlu text-secondary/80 dark:bg-dark_input dark:text-darkmuted"
                }`}
              >
                <Icon size={15} weight={active ? "fill" : "duotone"} />
                {label}
                <span className="text-[11px] font-normal tabular-nums opacity-75">{countFor(id)}</span>
              </button>
            );
          })}
          {lowCount > 0 && (
            <button
              type="button"
              onClick={onPickLow}
              className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-brand/15 px-3.5 py-1.5 text-[13px] font-semibold text-orange-deep active:scale-95 dark:text-amber-brand ${FOCUS}`}
            >
              <Wallet size={15} weight="duotone" />
              رصيد منخفض
              <span className="text-[11px] tabular-nums">{lowCount}</span>
            </button>
          )}
        </div>

        <p className="flex items-center gap-1.5 px-1 text-xs text-secondary/60 dark:text-darkmuted">
          <Info size={13} weight="fill" className="shrink-0 text-primary" />
          {selectable ? "علّم على اللي عايز تبعتلهم" : "هتتبعت للكل — اختار «تحديد يدوي» لو عايز تحدد بنفسك"}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {TYPE_ORDER.map((type) => {
          const items = visible.filter((r) => r.type === type);
          if (!items.length) return null;
          const meta = TYPE_META[type];
          const pickable = items.filter((r) => r.hasPhone);
          const allOn = pickable.length > 0 && pickable.every((r) => selected.has(r.key));
          return (
            <div key={type}>
              <div className="sticky top-0 z-10 flex items-center gap-2 bg-white/95 px-4 py-2 text-[13px] font-bold text-primary backdrop-blur dark:bg-darkmode/95">
                <meta.Icon size={15} weight="duotone" />
                {meta.label}
                <span className="font-normal text-secondary/50 dark:text-darkmuted">{items.length}</span>
                {selectable && (
                  <button
                    type="button"
                    onClick={() => onToggle(pickable.map((r) => r.key), !allOn)}
                    className={`ms-auto rounded-full px-2.5 py-0.5 text-xs font-bold text-secondary hover:bg-secondary/10 dark:text-darkmuted ${FOCUS}`}
                  >
                    {allOn ? "إلغاء الكل" : "تحديد الكل"}
                  </button>
                )}
              </div>
              <div className="divide-y divide-secondary/5 dark:divide-dark_border">
                {items.map((r) => (
                  <RecipientRow key={r.key} recipient={r} selectable={selectable} checked={selected.has(r.key)} onToggle={onToggle} />
                ))}
              </div>
            </div>
          );
        })}
        {visible.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-20 text-secondary/50 dark:text-darksubtle">
            <MagnifyingGlass size={34} weight="duotone" />
            <p className="text-sm">{selectable && !query ? "لسه مفيش حد متحدد" : "مفيش نتائج"}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-PowderBlueBorder bg-PaleSkyBlu px-4 py-2.5 dark:border-dark_border dark:bg-darklight">
        <div className="min-w-0 flex-1 text-xs">
          <p className="font-bold text-brand-deep dark:text-white">
            هتبعت لـ <span className="tabular-nums text-primary">{sendableCount}</span> شخص
          </p>
          {noPhoneCount > 0 && <p className="text-rose-600 dark:text-rose-300">{noPhoneCount} بدون رقم — مش هيتبعتلهم</p>}
        </div>
        <button
          type="button"
          onClick={onNext}
          disabled={sendableCount === 0}
          aria-label="التالي: اكتب الرسالة"
          className={`flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-white shadow-brand-sm transition hover:bg-accent-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none md:hidden ${FOCUS}`}
        >
          اكتب الرسالة
          <ArrowLeft size={18} weight="bold" />
        </button>
      </div>
    </div>
  );
}

// ─── Screen 2: الشات ──────────────────────────────────────────────────────────

function ChatHeader({ sendable, audienceLabel, instanceLabel, instanceOk, onBack, onInfo }) {
  const shown = sendable.slice(0, 3);
  return (
    <div className="flex items-center gap-1 bg-secondary px-2 py-2 text-white dark:bg-darklight">
      <button type="button" onClick={onBack} aria-label="رجوع" className={`flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 md:hidden ${FOCUS}`}>
        <ArrowRight size={22} weight="bold" />
      </button>
      <button type="button" onClick={onInfo} className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl py-0.5 text-start ${FOCUS}`}>
        <span className="flex shrink-0 items-center">
          {shown.map((r, i) => (
            <span key={r.key} className={`rounded-full ring-2 ring-secondary dark:ring-darklight ${i ? "-ms-4" : ""}`}>
              <Avatar type={r.type} name={displayName(r)} size="h-10 w-10" text="text-sm" />
            </span>
          ))}
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[15px] font-bold">رسالة لـ {sendable.length} مستلم</span>
          <span className="flex items-center gap-1.5 truncate text-[11.5px] text-white/65">
            {audienceLabel} ·
            <DeviceMobile size={12} weight="duotone" />
            {instanceLabel}
            {!instanceOk && <Warning size={12} weight="fill" className="text-amber-brand" />}
          </span>
        </span>
      </button>
      <button type="button" onClick={onInfo} aria-label="تفاصيل الإرسال" className={`flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 ${FOCUS}`}>
        <Info size={22} weight="duotone" />
      </button>
    </div>
  );
}

function PreviewBubble({ preview }) {
  const dir = preview?.language === "en" ? "ltr" : "rtl";
  const time = useMemo(nowLabel, [preview?.text]);
  if (!preview) return null;
  return (
    <div className="relative max-w-[88%] rounded-2xl rounded-tr-none md:max-w-[65%] bg-PaleCyan px-3 pb-1.5 pt-2 shadow-[0_1px_1px_rgba(0,42,51,0.12)] dark:bg-teal-brand">
      <span className="absolute -right-[7px] top-0 h-3 w-2 bg-inherit [clip-path:polygon(0_0,100%_0,0_100%)]" />
      <p dir={dir} className="whitespace-pre-wrap break-words text-[14.5px] leading-relaxed text-brand-deep dark:text-white">
        {preview.text}
      </p>
      <div dir="ltr" className="mt-0.5 flex items-center justify-end gap-1 text-[10.5px] text-secondary/55 dark:text-darkmuted">
        <span className="tabular-nums">{time}</span>
        <Checks size={16} weight="bold" className="text-sky-500" />
      </div>
    </div>
  );
}

const SOURCE_STYLE = {
  role: { label: "نص مخصص", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  general: { label: "النص العام", cls: "bg-secondary/10 text-secondary dark:bg-teal-400/10 dark:text-teal-200" },
  fallback: { label: "لغة تانية", cls: "bg-amber-brand/15 text-orange-deep dark:text-amber-brand" },
  none: { label: "مفيش نص", cls: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
};

function RoutingMatrix({ cells }) {
  if (!cells.length) return <p className="px-1 text-xs text-secondary/50">اكتب نص الأول.</p>;
  const types = TYPE_ORDER.filter((t) => cells.some((c) => c.type === t));
  const cellOf = (type, language) => cells.find((c) => c.type === type && c.language === language);
  const cols = "grid-cols-[104px_1fr_1fr]";
  return (
    <div className="overflow-hidden rounded-2xl border border-PowderBlueBorder text-xs dark:border-dark_border">
      <div className={`grid ${cols} gap-2 bg-PaleSkyBlu px-3 py-1.5 text-[11px] font-bold text-secondary/60 dark:bg-dark_input dark:text-darkmuted`}>
        <span />
        <span>عربي</span>
        <span>English</span>
      </div>
      <div className="divide-y divide-secondary/5 dark:divide-dark_border">
        {types.map((type) => {
          const TIcon = TYPE_META[type].Icon;
          return (
            <div key={type} className={`grid ${cols} items-center gap-2 px-3 py-2`}>
              <span className="flex items-center gap-1.5 font-semibold text-brand-deep dark:text-white">
                <TIcon size={14} weight="duotone" className="text-primary" />
                {TYPE_META[type].label}
              </span>
              {["ar", "en"].map((language) => {
                const cell = cellOf(type, language);
                if (!cell) return <span key={language} className="text-secondary/25">—</span>;
                const style = SOURCE_STYLE[cell.source];
                return (
                  <span key={language} className="flex items-center gap-1.5">
                    <span className="tabular-nums text-secondary/60 dark:text-darkmuted">{cell.count}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.cls}`}>{style.label}</span>
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// قايمة المرفقات: قوالب + متغيرات كدواير ملونة بأيقونات Phosphor
function AttachSheet({ group, activeTypes, values, quickTemplates, onInsert, onTemplate, onClose }) {
  const applicable = VARIABLES.filter((v) => isVariableApplicable(v, group));
  const hiddenCount = VARIABLES.length - applicable.length;
  const hiddenMode = group.deliveryMode === "offline" ? "الأونلاين" : "الأوفلاين";

  const sections = VARIABLE_CATEGORIES.map((cat) => ({
    cat,
    items: applicable
      .filter((v) => v.category === cat.id)
      .map((v) => ({ v, support: getVariableSupport(v, activeTypes) }))
      .filter(({ support }) => support !== "none"),
  })).filter((s) => s.items.length);

  const tabs = [
    { id: "tpl", label: "قوالب جاهزة", Icon: Sparkle },
    ...sections.map(({ cat }) => ({ id: cat.id, label: clean(cat.label), Icon: pickIcon(cat.id, CAT_ICON_RULES) })),
    { id: "gender", label: "الجنس", Icon: GenderIntersex },
  ];
  const [tab, setTab] = useState("tpl");

  const Item = ({ Icon, label, grad, onClick, title, warn }) => (
    <button type="button" onClick={onClick} title={title} className={`group flex flex-col items-center gap-1.5 rounded-xl p-1 ${FOCUS}`}>
      <span className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-[0_3px_8px_rgba(0,42,51,0.18)] transition group-active:scale-90 ${grad}`}>
        <Icon size={26} weight="duotone" />
        {warn && (
          <span className="absolute -end-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-amber-500 shadow">
            <Warning size={12} weight="fill" />
          </span>
        )}
      </span>
      <span className="line-clamp-2 text-center text-[11.5px] font-medium leading-tight text-brand-deep dark:text-white">{label}</span>
    </button>
  );

  const current = sections.find((s) => s.cat.id === tab);

  return (
    <Sheet title="أضف للرسالة" onClose={onClose}>
      <div className="flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${FOCUS} ${
              tab === id ? "bg-secondary text-white dark:bg-primary" : "bg-PaleSkyBlu text-secondary/80 dark:bg-dark_input dark:text-darkmuted"
            }`}
          >
            <Icon size={14} weight="duotone" />
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-x-2 gap-y-4 px-4 py-4 md:grid-cols-5">
        {tab === "tpl" &&
          quickTemplates.map((tpl, i) => (
            <Item key={tpl.id} Icon={tpl.Icon} label={tpl.label} grad={BUBBLE_GRADS[i % 4]} onClick={() => onTemplate(tpl)} />
          ))}

        {current &&
          current.items.map(({ v, support }, i) => {
            const sample = values[v.key];
            return (
              <Item
                key={v.key}
                Icon={pickIcon(`${v.key} ${v.category || ""}`, VAR_ICON_RULES)}
                label={clean(v.label)}
                grad={BUBBLE_GRADS[i % 4]}
                warn={support === "partial"}
                title={`{${v.key}}${sample ? ` — مثال: ${sample}` : ""}${support === "partial" ? "\n(مش هيظهر لبعض المستلمين)" : ""}`}
                onClick={() => onInsert(`{${v.key}}`)}
              />
            );
          })}

        {tab === "gender" && <Item Icon={GenderIntersex} label="كلمة حسب الجنس" grad={BUBBLE_GRADS[0]} onClick={() => onInsert(GENDER_INLINE_EXAMPLE)} />}
      </div>

      <div className="px-4 pb-4 text-[11.5px] leading-relaxed text-secondary/60 dark:text-darkmuted">
        {tab === "tpl" && "القالب بيحط نص جاهز بالعربي والإنجليزي، وتقدر تعدّله بعدها."}
        {tab === "gender" && "بيختار الكلمة المناسبة لجنس كل مستلم: {كلمة للذكر|كلمة للأنثى}."}
        {tab !== "tpl" && tab !== "gender" && "اضغط على أي متغير وهيتحط مكان المؤشر — وبيتبدل باسم/بيانات كل مستلم وقت الإرسال."}
        {hiddenCount > 0 && (
          <span className="mt-1 flex items-center gap-1">
            <Info size={12} weight="fill" /> متغيرات {hiddenMode} ({hiddenCount}) مخفية لأن الجروب {group.deliveryMode === "offline" ? "أوفلاين" : "أونلاين"}.
          </span>
        )}
      </div>
    </Sheet>
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
    { value: skipped, color: "#feaf00" },
  ];
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" className="h-32 w-32 -rotate-90" role="img" aria-label={`اتبعتت ${sent} من ${total}`}>
      <circle cx="50" cy="50" r={R} fill="none" strokeWidth="10" className="stroke-secondary/10 dark:stroke-white/10" />
      {segments.map((s, i) => {
        const len = (s.value / total) * C;
        const el = <circle key={i} cx="50" cy="50" r={R} fill="none" strokeWidth="10" stroke={s.color} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />;
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
    { label: "اتخطت", value: result.skipped, dot: "bg-amber-brand" },
  ];
  return (
    <div className="mx-auto w-full max-w-[520px] space-y-5 p-4 md:p-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-center gap-6">
        <div className="relative">
          <Donut sent={result.sent} failed={result.failed} skipped={result.skipped} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums text-brand-deep dark:text-white">{result.sent}</span>
            <span className="text-[11px] text-secondary/60 dark:text-darkmuted">من {result.total}</span>
          </div>
        </div>
        <div className="space-y-2">
          {items.map((i) => (
            <div key={i.label} className="flex items-center gap-2.5 text-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${i.dot}`} />
              <span className="w-14 text-secondary/70 dark:text-darkmuted">{i.label}</span>
              <span className="font-bold tabular-nums text-brand-deep dark:text-white">{i.value}</span>
            </div>
          ))}
        </div>
      </div>

      {problems.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-PowderBlueBorder bg-white dark:border-dark_border dark:bg-darklight">
          <p className="bg-PaleSkyBlu px-3 py-2 text-xs font-bold text-secondary dark:bg-dark_input dark:text-darkmuted">محتاجة مراجعة ({problems.length})</p>
          <ul className="max-h-52 divide-y divide-secondary/5 overflow-y-auto text-xs dark:divide-dark_border">
            {problems.map((r) => (
              <li key={r.key} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="flex items-center gap-2 font-semibold text-brand-deep dark:text-white">
                  {TYPE_META[r.type] && <Avatar type={r.type} name={r.name} size="h-6 w-6" text="text-[11px]" />}
                  {r.name || r.key}
                </span>
                <span className={r.status === "failed" ? "text-rose-600" : "text-orange-deep dark:text-amber-brand"}>
                  {r.status === "failed" ? r.error : SKIP_REASONS[r.reason] || r.reason}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" onClick={onClose} className={`w-full rounded-full bg-primary py-3 text-sm font-semibold text-white shadow-brand-md transition hover:bg-accent-hover active:scale-[0.99] ${FOCUS}`}>
        تم
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const makeDrafts = () => ({
  all: { ar: "", en: "" },
  student: { ar: "", en: "" },
  guardian: { ar: "", en: "" },
  instructor: { ar: "", en: "" },
});

export default function GroupMessageModal({ groupId, onClose, className = "" }) {
  const { loading, error, group, recipients, fallbackKeys, instances } = useGroupRecipients(groupId);

  const [screen, setScreen] = useState("people"); // people | chat | log
  const [sheet, setSheet] = useState(null); // null | attach | info | confirm
  const [audience, setAudience] = useState(AUDIENCE.ALL);
  const [selected, setSelected] = useState(() => new Set());
  const [scope, setScope] = useState("all"); // all | student | guardian | instructor
  const [lang, setLang] = useState("ar");
  const [drafts, setDrafts] = useState(makeDrafts);
  const [previewKey, setPreviewKey] = useState("");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [instance, setInstance] = useState("main");
  const [instanceByType, setInstanceByType] = useState({});
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

  const targets = useMemo(() => selectRecipients(recipients, audience, selectedKeys), [recipients, audience, selectedKeys]);
  const sendable = useMemo(() => targets.filter((r) => r.hasPhone), [targets]);
  const noPhoneCount = targets.length - sendable.length;
  const activeTypes = useMemo(() => [...new Set(sendable.map((r) => r.type))], [sendable]);

  const visibleTypes = useMemo(
    () => TYPE_ORDER.filter((t) => activeTypes.includes(t) || hasT(drafts[t].ar) || hasT(drafts[t].en)),
    [activeTypes, drafts],
  );
  useEffect(() => {
    if (scope !== "all" && !visibleTypes.includes(scope)) setScope("all");
  }, [scope, visibleTypes]);

  const scopeCounts = useMemo(
    () => ({ all: sendable.length, ...Object.fromEntries(TYPE_ORDER.map((t) => [t, sendable.filter((r) => r.type === t).length])) }),
    [sendable],
  );

  const langCounts = useMemo(() => {
    const countFor = (language) =>
      scope === "all"
        ? sendable.filter((r) => r.language === language && !hasT(drafts[r.type][language])).length
        : sendable.filter((r) => r.type === scope && r.language === language).length;
    return { ar: countFor("ar"), en: countFor("en") };
  }, [sendable, scope, drafts]);

  const missingByLang = useMemo(() => {
    const miss = (language) => (scope === "all" ? !hasT(drafts.all[language]) : !hasT(drafts[scope][language]) && !hasT(drafts.all[language]));
    return { ar: miss("ar"), en: miss("en") };
  }, [scope, drafts]);

  const lowKeys = useMemo(() => recipients.filter((r) => r.hasPhone && hasLowCredit(r)).map((r) => r.key), [recipients]);
  const quickTemplates = useMemo(() => buildQuickTemplates(group?.deliveryMode), [group?.deliveryMode]);

  const previewRecipient = sendable.find((r) => r.key === previewKey) || sendable[0] || null;
  const preview = previewRecipient && group ? composeMessage(previewRecipient, group, templates) : null;
  const previewValues = previewRecipient && group ? buildVariables(previewRecipient, group, lang) : {};

  const allTexts = useMemo(() => getAllTemplateTexts(templates), [templates]);
  const allText = allTexts.join(" ");
  const unknownVars = useMemo(() => findUnknownVariables(allText), [allText]);
  const inapplicableVars = useMemo(() => (group ? findInapplicableVariables(allText, group) : []), [allText, group]);
  const emptyUsage = useMemo(() => (group ? findEmptyVariableUsage(sendable, group, templates) : []), [sendable, group, templates]);
  const routing = useMemo(() => describeRouting(sendable, templates), [sendable, templates]);
  const noTextCount = routing.filter((c) => c.source === "none").reduce((n, c) => n + c.count, 0);
  const fallbackLangCount = routing.filter((c) => c.source === "fallback").reduce((n, c) => n + c.count, 0);

  const current = drafts[scope][lang];
  const hasContent = allTexts.length > 0;
  const varsOk = unknownVars.length === 0 && inapplicableVars.length === 0;

  const usedInstances = useMemo(() => [...new Set(sendable.map((r) => instanceByType[r.type] || instance))], [sendable, instanceByType, instance]);
  const instanceOk = usedInstances.every((k) => instances.find((i) => i.key === k)?.configured !== false);
  const instanceLabel = usedInstances.map((k) => INSTANCE_META[k]?.label || k).join(" + ");

  const canSend = hasContent && sendable.length > 0 && varsOk && instanceOk && !sending;
  const blocker = !sendable.length
    ? "اختار مستلمين عندهم أرقام الأول"
    : !hasContent
      ? "اكتب نص الرسالة الأول"
      : !varsOk
        ? "صلّح المتغيرات المعلّمة قبل الإرسال"
        : !instanceOk
          ? "الرقم المختار مش متضبط — غيّره من تفاصيل الإرسال"
          : null;

  const etaSec = Math.max(1, Math.round(sendable.length * SEND_DELAY_SEC));
  const recipientsToSend = sendable.length - noTextCount;
  const scopeLabel = scope === "all" ? null : TYPE_META[scope].label;
  const showScope = visibleTypes.length > 1 || scope !== "all";
  const audienceLabel = AUDIENCE_OPTIONS.find((a) => a.id === audience)?.label;
  const hasScopeDraft = hasT(drafts[scope].ar) || hasT(drafts[scope].en);
  const hasGeneral = hasT(drafts.all.ar) || hasT(drafts.all.en);

  useEffect(() => {
    if (!sending) {
      setProgress(0);
      return undefined;
    }
    const total = Math.max(2000, sendable.length * SEND_DELAY_SEC * 1000);
    const start = Date.now();
    const id = setInterval(() => setProgress(Math.min(94, ((Date.now() - start) / total) * 100)), 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sending]);

  // الـ textarea بيكبر مع الكتابة (لحد حد أقصى) بدل ما ياخد مساحة فاضية
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [current, screen]);

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
    if (next !== "all") {
      const first = sendable.find((r) => r.type === next);
      if (first) setPreviewKey(first.key);
    }
  };

  const setDraft = (value) => setDrafts((d) => ({ ...d, [scope]: { ...d[scope], [lang]: value } }));

  const insertText = (text) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? start;
    setDraft(current.slice(0, start) + text + current.slice(end));
    requestAnimationFrame(() => el?.setSelectionRange(start + text.length, start + text.length));
  };

  const applyTemplate = (tpl) => {
    const cur = drafts[scope];
    if ((hasT(cur.ar) || hasT(cur.en)) && !window.confirm("هيتم استبدال النص الحالي بالقالب. متأكد؟")) return;
    setDrafts((d) => ({ ...d, [scope]: { ar: tpl.ar, en: tpl.en } }));
    setSheet(null);
  };

  const copyFromGeneral = () => setDrafts((d) => ({ ...d, [scope]: { ...d.all } }));
  const clearScope = () => setDrafts((d) => ({ ...d, [scope]: { ar: "", en: "" } }));

  const onSendTap = () => {
    if (!canSend) return toast.error(blocker || "مش جاهز للإرسال");
    setSheet("confirm");
  };

  const handleSend = async () => {
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
          instance,
          instanceByType,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل الإرسال");
      setProgress(100);
      setResult(json.data);
      toast.success(`اتبعتت لـ ${json.data.sent} مستلم`);
    } catch (err) {
      toast.error(err.message);
      setSheet(null);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 p-20">
        <CircleNotch size={30} weight="bold" className="animate-spin text-primary" />
        <p className="text-xs text-secondary/60 dark:text-darkmuted">جاري تحميل المستلمين…</p>
      </div>
    );
  }
  if (error) return <p className="p-10 text-center text-sm text-rose-600">{error}</p>;
  if (result) return <SendResult result={result} onClose={onClose} />;

  const homeTab = screen === "log" ? "log" : "people";

  return (
    <div
      dir="rtl"
      className={`relative flex w-full flex-col overflow-hidden bg-white dark:bg-darkmode ${className} [&_*]:[scrollbar-width:none] [&_*::-webkit-scrollbar]:hidden`}
    >
        {/* الهيدر: على الموبايل بيختفي جوه الشات (الشات ليه هيدر خاص) */}
        <div className={screen === "chat" ? "hidden md:block" : ""}>
          <HomeHeader group={group} tab={homeTab} onTab={(t) => setScreen(t === "log" ? "log" : "people")} />
        </div>

        {screen === "log" && (
          <div className="min-h-0 flex-1 overflow-y-auto bg-PaleSkyBlu/50 dark:bg-darkmode">
            <div className="mx-auto w-full max-w-3xl p-3 md:p-5">
              <InstanceLogPanel groupId={groupId} />
            </div>
          </div>
        )}

        <div className={`${screen === "log" ? "hidden" : "flex"} max-h-[calc(100dvh-17rem)] min-h-[380px]`}>
          {/* ── اللوح الأول: المستلمين ── */}
          <div
            className={`${screen === "chat" ? "hidden md:flex" : "flex"} min-h-0 w-full shrink-0 flex-col border-PowderBlueBorder dark:border-dark_border md:w-[340px] md:border-e lg:w-[400px]`}
          >
            <PeopleScreen
              recipients={recipients}
              audience={audience}
              onAudience={setAudience}
              selected={selected}
              onToggle={toggleKeys}
              lowCount={lowKeys.length}
              onPickLow={pickLowBalance}
              sendableCount={sendable.length}
              noPhoneCount={noPhoneCount}
              onNext={() => setScreen("chat")}
            />
          </div>

          {/* ── اللوح التاني: الشات ── */}
          <div className={`${screen === "chat" ? "flex" : "hidden md:flex"} relative min-h-0 min-w-0 flex-1 flex-col`}>
            <ChatHeader
              sendable={sendable}
              audienceLabel={audienceLabel}
              instanceLabel={instanceLabel}
              instanceOk={instanceOk}
              onBack={() => setScreen("people")}
              onInfo={() => setSheet("info")}
            />

            {showScope && (
              <div className="flex items-center gap-1.5 overflow-x-auto bg-PaleSkyBlu px-3 py-2 [scrollbar-width:none] dark:bg-darklight [&::-webkit-scrollbar]:hidden">
                {[{ id: "all", label: "نص للجميع", Icon: Users }, ...visibleTypes.map((t) => ({ id: t, label: TYPE_META[t].label, Icon: TYPE_META[t].Icon }))].map(
                  ({ id, label, Icon }) => {
                    const on = scope === id;
                    const custom = id !== "all" && (hasT(drafts[id].ar) || hasT(drafts[id].en));
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => changeScope(id)}
                        className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${FOCUS} ${
                          on ? "bg-secondary text-white dark:bg-primary" : "bg-white text-secondary/80 dark:bg-dark_input dark:text-darkmuted"
                        }`}
                      >
                        <Icon size={14} weight={on ? "fill" : "duotone"} />
                        {label}
                        {custom && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="فيه نص مخصص" />}
                        <span className="text-[10px] font-normal tabular-nums opacity-70">{scopeCounts[id]}</span>
                      </button>
                    );
                  },
                )}
              </div>
            )}

            {/* messages */}
            <div className="min-h-[180px] flex-1 space-y-3 overflow-y-auto bg-brand-soft px-3 py-3 md:px-5 dark:bg-darkmode" style={WALLPAPER}>
              {previewRecipient && (
                <div className="relative flex justify-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-[11.5px] font-medium text-secondary shadow-[0_1px_1px_rgba(0,42,51,0.1)] dark:bg-darklight dark:text-darkmuted">
                    <User size={13} weight="duotone" className="text-primary" />
                    معاينة كـ {displayName(previewRecipient)} ({roleLabel(previewRecipient)})
                    <span className="text-secondary/40">▾</span>
                  </span>
                  <select
                    value={previewRecipient.key}
                    onChange={(e) => setPreviewKey(e.target.value)}
                    aria-label="معاينة كـ"
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  >
                    {sendable.map((r) => (
                      <option key={r.key} value={r.key}>
                        {displayName(r)} ({roleLabel(r)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {hasContent ? (
                <PreviewBubble preview={preview} />
              ) : (
                <>
                  <SystemPill icon={ChatCircleDots} tone="sky">
                    اكتب رسالتك تحت، أو ابدأ بقالب جاهز
                  </SystemPill>
                  <div className="flex flex-wrap justify-center gap-2">
                    {quickTemplates.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => applyTemplate(tpl)}
                        className={`inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-secondary shadow-[0_1px_2px_rgba(0,42,51,0.12)] transition hover:text-primary active:scale-95 dark:bg-darklight dark:text-darkmuted ${FOCUS}`}
                      >
                        <tpl.Icon size={16} weight="duotone" className="text-primary" />
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {inapplicableVars.length > 0 && (
                <SystemPill tone="rose" icon={XCircle}>
                  متغيرات مش مناسبة لجروب {group.deliveryMode === "offline" ? "أوفلاين" : "أونلاين"}:{" "}
                  <span dir="ltr" className="font-mono">
                    {inapplicableVars.join(" ")}
                  </span>{" "}
                  — شيلها قبل الإرسال.
                </SystemPill>
              )}
              {unknownVars.length > 0 && (
                <SystemPill tone="rose" icon={XCircle}>
                  متغيرات غير معروفة:{" "}
                  <span dir="ltr" className="font-mono">
                    {unknownVars.join(" ")}
                  </span>
                </SystemPill>
              )}
              {emptyUsage.length > 0 && (
                <SystemPill tone="amber" icon={Warning}>
                  متغيرات هتطلع فاضية عند بعض المستلمين: {emptyUsage.map((e) => `${clean(e.label)} (${e.count})`).join("، ")} — اكتب نص مخصص للفئة دي.
                </SystemPill>
              )}
              {noTextCount > 0 && hasContent && (
                <SystemPill tone="rose" icon={XCircle} onClick={() => setSheet("info")}>
                  {noTextCount} مستلم مفيش نص ليهم وهيتخطوا — اضغط للتفاصيل
                </SystemPill>
              )}
              {fallbackLangCount > 0 && (
                <SystemPill tone="amber" icon={Translate} onClick={() => setSheet("info")}>
                  {fallbackLangCount} مستلم هيستلموا اللغة التانية لأن مفيش نص بلغتهم
                </SystemPill>
              )}
            </div>

            {/* composer */}
            <div className="relative space-y-2 bg-PaleSkyBlu px-2.5 pb-2.5 pt-2 dark:bg-darklight md:px-4">
              {sending && <div className="absolute inset-x-0 top-0 h-0.5 bg-primary/70 transition-all" style={{ width: `${progress}%` }} />}

              <div className="flex items-center gap-2 px-1">
                <div className="inline-flex rounded-full bg-white p-0.5 dark:bg-dark_input">
                  {[
                    { id: "ar", label: "عربي" },
                    { id: "en", label: "English" },
                  ].map(({ id, label }) => {
                    const isMissing = langCounts[id] > 0 && missingByLang[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setLang(id)}
                        title={isMissing ? "فيه مستلمين بالغة دي ومفيش نص ليها" : `${langCounts[id]} مستلم بالغة دي`}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${FOCUS} ${lang === id ? "bg-secondary text-white dark:bg-primary" : "text-secondary/60 dark:text-darkmuted"}`}
                      >
                        {label}
                        <span className={`rounded-full px-1.5 text-[10px] tabular-nums ${isMissing ? "bg-amber-brand text-white" : lang === id ? "bg-white/25" : "bg-secondary/10"}`}>{langCounts[id]}</span>
                      </button>
                    );
                  })}
                </div>

                {scope !== "all" && !hasScopeDraft && hasGeneral && (
                  <button type="button" onClick={copyFromGeneral} className={`inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-secondary dark:bg-dark_input dark:text-darkmuted ${FOCUS}`}>
                    <Copy size={12} weight="duotone" /> من النص العام
                  </button>
                )}
                {scope !== "all" && hasScopeDraft && (
                  <button type="button" onClick={clearScope} className={`inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-600 ${FOCUS}`}>
                    <Eraser size={12} weight="duotone" /> مسح
                  </button>
                )}
                {blocker ? (
                  <span className="ms-auto flex min-w-0 items-center gap-1 truncate text-[11px] text-orange-deep dark:text-amber-brand">
                    <Hourglass size={12} weight="duotone" className="shrink-0" />
                    <span className="truncate">{blocker}</span>
                  </span>
                ) : (
                  <span className="ms-auto text-[11px] tabular-nums text-secondary/50 dark:text-darkmuted">
                    {current.length}/{MAX_MESSAGE_LENGTH}
                  </span>
                )}
              </div>

              <div className="flex items-end gap-2">
                <div className="flex min-w-0 flex-1 items-end gap-1 rounded-3xl bg-white px-1.5 py-1 focus-within:ring-2 focus-within:ring-primary/30 dark:bg-dark_input">
                  <button
                    type="button"
                    onClick={() => setSheet("attach")}
                    aria-label="أضف متغير أو قالب"
                    title="متغيرات وقوالب"
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary transition hover:bg-primary/10 active:scale-90 ${FOCUS}`}
                  >
                    <Plus size={24} weight="bold" />
                  </button>
                  <textarea
                    ref={textareaRef}
                    value={current}
                    onChange={(e) => setDraft(e.target.value)}
                    dir={lang === "ar" ? "rtl" : "ltr"}
                    maxLength={MAX_MESSAGE_LENGTH}
                    rows={1}
                    placeholder={lang === "ar" ? `اكتب الرسالة العربية${scopeLabel ? ` لـ ${scopeLabel}` : ""}` : `Write the English message${scopeLabel ? ` for ${TYPE_META[scope].single}s` : ""}`}
                    className="max-h-32 min-h-[40px] w-full flex-1 resize-none bg-transparent px-1 py-2 text-[15px] leading-6 text-brand-deep outline-none placeholder:text-secondary/40 dark:text-white dark:placeholder:text-darksubtle"
                  />
                </div>

                <button
                  type="button"
                  onClick={onSendTap}
                  aria-label="إرسال"
                  aria-disabled={!canSend}
                  className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-brand-md transition hover:bg-accent-hover active:scale-90 ${canSend ? "" : "opacity-45 shadow-none"} ${FOCUS}`}
                >
                  {sending ? <CircleNotch size={22} weight="bold" className="animate-spin" /> : <PaperPlaneRight size={22} weight="fill" mirrored />}
                </button>
              </div>

            </div>

            {/* ───── Sheets ───── */}
            {sheet === "attach" && (
              <AttachSheet
                group={group}
                activeTypes={scope === "all" ? activeTypes : [scope]}
                values={previewValues}
                quickTemplates={quickTemplates}
                onInsert={insertText}
                onTemplate={applyTemplate}
                onClose={() => setSheet(null)}
              />
            )}

            {sheet === "info" && (
              <Sheet title="تفاصيل الإرسال" onClose={() => setSheet(null)}>
                <div className="space-y-5 px-4 pb-6 pt-1">
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-secondary dark:text-white">
                      <Users size={15} weight="duotone" className="text-primary" /> المستلمين
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {TYPE_ORDER.map((t) => {
                        const { Icon, label } = TYPE_META[t];
                        return (
                          <div key={t} className="rounded-2xl bg-PaleSkyBlu py-3 text-center dark:bg-dark_input">
                            <Icon size={20} weight="duotone" className="mx-auto text-primary" />
                            <p className="mt-1 text-lg font-bold tabular-nums text-brand-deep dark:text-white">{scopeCounts[t]}</p>
                            <p className="text-[11px] text-secondary/60 dark:text-darkmuted">{label}</p>
                          </div>
                        );
                      })}
                    </div>
                    {noPhoneCount > 0 && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-300">
                        <Phone size={13} weight="duotone" /> {noPhoneCount} بدون رقم واتساب ومش هيتبعتلهم
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-secondary dark:text-white">
                      <Notebook size={15} weight="duotone" className="text-primary" /> مين هياخد أنهي نص؟
                    </p>
                    <RoutingMatrix cells={routing} />
                  </div>

                  <InstancePicker
                    instances={instances}
                    value={instance}
                    onChange={setInstance}
                    byType={instanceByType}
                    onByTypeChange={setInstanceByType}
                    activeTypes={activeTypes}
                  />

                  {fallbackKeys.length > 0 && (
                    <p className="flex items-start gap-1.5 text-[11.5px] text-secondary/60 dark:text-darkmuted">
                      <Info size={13} weight="fill" className="mt-0.5 shrink-0" />
                      <span>
                        متغيرات مش متسجلة بتستخدم نص افتراضي:{" "}
                        <span dir="ltr" className="font-mono">
                          {fallbackKeys.join(", ")}
                        </span>
                      </span>
                    </p>
                  )}
                </div>
              </Sheet>
            )}

            {sheet === "confirm" && (
              <Sheet title="تأكيد الإرسال" onClose={() => setSheet(null)} locked={sending}>
                <div className="space-y-4 px-4 pb-6 pt-1">
                  <div className="flex items-center gap-3 rounded-2xl bg-PaleSkyBlu p-3 dark:bg-dark_input">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white">
                      <PaperPlaneRight size={24} weight="fill" mirrored />
                    </span>
                    <div className="min-w-0 text-sm">
                      <p className="font-bold text-brand-deep dark:text-white">هتبعت لـ {recipientsToSend} مستلم</p>
                      <p className="text-xs text-secondary/60 dark:text-darkmuted">
                        من رقم {instanceLabel} · حوالي {etaSec} ثانية
                      </p>
                    </div>
                  </div>

                  {sending ? (
                    <div className="space-y-2">
                      <div className="h-2 overflow-hidden rounded-full bg-secondary/10">
                        <div className="h-full rounded-full bg-primary transition-all duration-200" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="text-center text-xs font-semibold text-primary">جاري الإرسال… {Math.round(progress)}% — متقفلش النافذة</p>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setSheet(null)} className={`rounded-full bg-PaleSkyBlu px-6 py-3 text-sm font-semibold text-secondary dark:bg-dark_input dark:text-darkmuted ${FOCUS}`}>
                        رجوع
                      </button>
                      <button type="button" onClick={handleSend} className={`flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-white shadow-brand-md hover:bg-accent-hover ${FOCUS}`}>
                        <PaperPlaneRight size={18} weight="fill" mirrored /> أكّد الإرسال
                      </button>
                    </div>
                  )}
                </div>
              </Sheet>
            )}
          </div>
        </div>
    </div>
  );
}