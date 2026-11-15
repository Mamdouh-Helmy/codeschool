// components/admin/MemberMessagesModal.jsx
"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowCounterClockwise,
  ArrowsClockwise,
  ChalkboardTeacher,
  ChatCircleDots,
  Check,
  Checks,
  CircleNotch,
  Clock,
  Copy,
  DeviceMobile,
  GraduationCap,
  Info,
  Lightning,
  MagnifyingGlass,
  PaperPlaneRight,
  SlidersHorizontal,
  Sparkle,
  UsersThree,
  Warning,
  X,
  XCircle,
} from "@phosphor-icons/react";
import {
  GENDER_INLINE_EXAMPLE,
  MAX_MESSAGE_LENGTH,
  RECIPIENT_TYPE,
  VARIABLES,
  VARIABLE_CATEGORIES,
  composeMessage,
  findInapplicableVariables,
  findUnknownVariables,
  getVariableSupport,
  isVariableApplicable,
} from "@/utils/groupMessageShared";
import { INSTANCE_META } from "./InstancePicker";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_META = {
  [RECIPIENT_TYPE.STUDENT]: {
    label: "الطالب",
    grad: "from-secondary to-teal-500",
    soft: "bg-secondary/10 text-secondary dark:bg-teal-400/10 dark:text-teal-300",
    text: "text-secondary dark:text-teal-300",
    Icon: GraduationCap,
  },
  [RECIPIENT_TYPE.GUARDIAN]: {
    label: "ولي الأمر",
    grad: "from-primary to-amber-brand",
    soft: "bg-primary/10 text-orange-deep dark:bg-primary/15 dark:text-amber-brand",
    text: "text-orange-deep dark:text-amber-brand",
    Icon: UsersThree,
  },
  [RECIPIENT_TYPE.INSTRUCTOR]: {
    label: "المدرس",
    grad: "from-teal-dark to-brand-coral",
    soft: "bg-brand-coral/10 text-brand-coral",
    text: "text-brand-coral",
    Icon: ChalkboardTeacher,
  },
};

// لون اسم الرقم فوق الفقاعة (زي اسم المرسل في جروبات واتساب)
const INSTANCE_TEXT = {
  main: "text-sky-600 dark:text-sky-300",
  eval: "text-violet-600 dark:text-violet-300",
  unknown: "text-gray-500 dark:text-gray-400",
};

const INSTANCE_BAR = {
  main: "bg-sky-500",
  eval: "bg-violet-500",
  unknown: "bg-gray-400",
};

const EMPTY_OVERRIDES = {
  student: { ar: "", en: "" },
  guardian: { ar: "", en: "" },
  instructor: { ar: "", en: "" },
};

const LANG_OPTIONS = [
  { id: "auto", label: "تلقائي" },
  { id: "ar", label: "🇸🇦 عربي" },
  { id: "en", label: "🇬🇧 English" },
];

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

const WALLPAPER = {
  backgroundImage: "radial-gradient(rgba(0,77,89,0.07) 1.2px, transparent 1.2px)",
  backgroundSize: "22px 22px",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_RULES = [
  [/^custom$|^group_custom_message$/, "رسالة مخصصة"],
  [/reminder_24h/, "تذكير قبل 24 ساعة"],
  [/reminder_15min|reminder_1h/, "تذكير قبل 15 دقيقة"],
  [/reminder_30min/, "تذكير قبل 30 دقيقة"],
  [/pre_attendance/, "تأكيد الحضور"],
  [/absence/, "إشعار غياب"],
  [/late_notification/, "إشعار تأخير"],
  [/excused/, "غياب بعذر"],
  [/evaluation/, "تقرير / تقييم"],
  [/credit/, "تنبيه رصيد"],
  [/welcome|language_selection|language_confirmation/, "ترحيب / اللغة"],
  [/cancelled/, "إلغاء حصة"],
  [/postponed/, "تأجيل حصة"],
  [/completion/, "إتمام الكورس"],
  [/makeup/, "حصة تعويضية"],
  [/module_overview/, "نظرة على الموديول"],
  [/recording/, "تسجيل الحصة"],
  [/supervisor/, "تعريف بالمشرف"],
];

const typeLabel = (type) => {
  const hit = TYPE_RULES.find(([re]) => re.test(String(type || "")));
  return hit ? hit[1] : String(type || "رسالة");
};

const TZ = "Africa/Cairo";

const fmtTime = (d) => {
  if (!d) return "";
  try {
    return new Date(d).toLocaleTimeString("ar-EG-u-nu-latn", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: TZ,
    });
  } catch {
    return "";
  }
};

const dayKey = (d) => {
  if (!d) return "unknown";
  try {
    return new Date(d).toLocaleDateString("en-CA", { timeZone: TZ });
  } catch {
    return "unknown";
  }
};

const dayLabel = (d) => {
  if (!d) return "—";
  const now = new Date();
  const k = dayKey(d);
  if (k === dayKey(now)) return "النهارده";
  if (k === dayKey(new Date(now.getTime() - 86400000))) return "امبارح";
  try {
    return new Date(d).toLocaleDateString("ar-EG-u-nu-latn", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: TZ,
    });
  } catch {
    return "—";
  }
};

const langChip = (l) => (l === "en" ? "EN" : l === "bilingual" ? "عربي + EN" : "عربي");
const recipientName = (r) => r.names?.[r.language] || r.fullName || "—";
const langName = (l) => (l === "en" ? "English" : "عربي");
const instanceMeta = (key) => INSTANCE_META[key] || INSTANCE_META.unknown;
const instKey = (k) => (k === "main" || k === "eval" ? k : "unknown");

// ─── Small pieces ─────────────────────────────────────────────────────────────

function Avatar({ role, name, size = "h-9 w-9", text = "text-sm" }) {
  const meta = ROLE_META[role] || ROLE_META.student;
  return (
    <span
      className={`flex ${size} ${text} shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shadow-sm ${meta.grad}`}
    >
      {(name || "?").charAt(0)}
    </span>
  );
}

function Ticks({ status }) {
  if (status === "failed") return <XCircle size={15} weight="fill" className="text-rose-500" />;
  if (status === "pending") return <Clock size={13} weight="bold" className="text-secondary/50 dark:text-darkmuted" />;
  return <Checks size={17} weight="bold" className="text-sky-500" />;
}

function DatePill({ children }) {
  return (
    <div className="sticky top-1 z-[1] flex justify-center py-2">
      <span className="rounded-lg bg-white/90 px-3 py-1 text-[11.5px] font-medium text-secondary/80 shadow-sm backdrop-blur dark:bg-darklight/90 dark:text-darkmuted">
        {children}
      </span>
    </div>
  );
}

function ChatBubble({ item, onResend, showRole }) {
  const [open, setOpen] = useState(false);
  const meta = ROLE_META[item.role] || ROLE_META.student;
  const RoleIcon = meta.Icon;
  const ik = instKey(item.instance);
  const inst = instanceMeta(ik);
  const long = item.content.length > 320 || item.content.split("\n").length > 8;
  const isRtl = item.language !== "en";
  const failed = item.status === "failed";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.content);
      toast.success("اتنسخت");
    } catch {
      toast.error("مقدرتش أنسخ");
    }
  };

  return (
    <div className="group/msg flex">
      <div
        className={`relative ms-auto max-w-[90%] overflow-hidden rounded-2xl rounded-tl-none pb-1.5 pe-3.5 ps-4 pt-2 shadow-[0_1px_0.5px_rgba(0,42,51,0.15)] sm:max-w-[80%] ${
          failed
            ? "bg-rose-50 ring-1 ring-rose-300 dark:bg-rose-950/40 dark:ring-rose-500/40"
            : "bg-PaleCyan dark:bg-teal-brand"
        }`}
      >
        {/* شريط جانبي بلون الرقم */}
        <span className={`absolute inset-y-0 start-0 w-1 ${INSTANCE_BAR[ik]}`} />

        {/* سطر المرسل: الرقم + النوع */}
        <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] font-bold">
          <span className={`inline-flex items-center gap-1 ${INSTANCE_TEXT[ik]}`}>
            <DeviceMobile size={13} weight="fill" />
            {item.instance ? inst.label : "قديمة"}
          </span>
          {showRole && (
            <span className={`inline-flex items-center gap-1 ${meta.text}`}>
              <RoleIcon size={13} weight="duotone" />
              {meta.label}
            </span>
          )}
          <span className="font-semibold text-orange-deep/80 dark:text-amber-brand/90">{typeLabel(item.type)}</span>
        </div>

        {/* content */}
        <div
          dir={isRtl ? "rtl" : "ltr"}
          className={`relative text-[15px] leading-relaxed text-brand-deep dark:text-white ${
            !open && long ? "max-h-52 overflow-hidden" : ""
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{item.content || "—"}</p>
          {!open && long && (
            <span
              className={`pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t ${
                failed ? "from-rose-50 dark:from-rose-950/40" : "from-PaleCyan dark:from-teal-brand"
              } to-transparent`}
            />
          )}
        </div>

        {long && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`mt-0.5 rounded text-[12.5px] font-semibold text-secondary underline-offset-2 hover:underline dark:text-amber-brand ${FOCUS}`}
          >
            {open ? "إخفاء" : "اقرأ المزيد"}
          </button>
        )}

        {failed && item.error && (
          <p className="mt-1 flex items-start gap-1 text-[11.5px] font-medium text-rose-600 dark:text-rose-300">
            <Warning size={13} weight="fill" className="mt-0.5 shrink-0" />
            <span dir="auto">سبب الفشل: {item.error}</span>
          </p>
        )}

        {/* footer */}
        <div className="mt-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-0.5 opacity-50 transition-opacity group-hover/msg:opacity-100">
            <button
              type="button"
              onClick={copy}
              title="نسخ"
              className={`rounded-full p-1.5 text-secondary/70 hover:bg-secondary/10 dark:text-darkmuted dark:hover:bg-white/10 ${FOCUS}`}
            >
              <Copy size={15} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => onResend(item)}
              disabled={!item.content}
              title="إعادة إرسال"
              className={`rounded-full p-1.5 text-secondary/70 hover:bg-secondary/10 disabled:opacity-40 dark:text-darkmuted dark:hover:bg-white/10 ${FOCUS}`}
            >
              <ArrowCounterClockwise size={15} weight="bold" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-secondary/60 dark:text-darkmuted">
            {item.number && (
              <span dir="ltr" className="hidden sm:inline">
                {item.number}
              </span>
            )}
            <span className="rounded bg-secondary/10 px-1 font-semibold dark:bg-white/10">{langChip(item.language)}</span>
            <span className="tabular-nums">{fmtTime(item.sentAt)}</span>
            <Ticks status={item.status} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Notice({ tone = "amber", children }) {
  const tones = {
    amber: "border-amber-brand/30 bg-amber-brand/10 text-orange-deep dark:text-amber-brand",
    rose: "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-200",
    sky: "border-secondary/25 bg-secondary/10 text-secondary dark:border-teal-400/25 dark:bg-teal-400/10 dark:text-teal-200",
  };
  const Icon = tone === "sky" ? Info : Warning;
  return (
    <div className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs leading-relaxed ${tones[tone]}`}>
      <Icon size={15} weight="fill" className="mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function FilterChip({ active, onClick, children, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition active:scale-95 ${FOCUS} ${
        active
          ? "bg-primary/15 text-orange-deep ring-1 ring-inset ring-primary/40 dark:bg-primary/20 dark:text-amber-brand dark:ring-primary/40"
          : "bg-white text-secondary/80 hover:bg-PaleCyan dark:bg-dark_input dark:text-darkmuted dark:hover:bg-darkhover"
      }`}
    >
      {children}
      {count !== undefined && <span className="text-[11px] tabular-nums opacity-60">{count}</span>}
    </button>
  );
}

// ─── Variables side panel ─────────────────────────────────────────────────────

function VariablesPanel({
  recipient,
  effectiveLang,
  sections,
  values,
  raw,
  search,
  setSearch,
  cat,
  setCat,
  onInsert,
  onInsertGender,
  onDisableRaw,
  onClose,
}) {
  const meta = recipient ? ROLE_META[recipient.type] : null;
  const MetaIcon = meta?.Icon;
  const q = search.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      sections
        .filter((s) => cat === "all" || s.cat.id === cat)
        .map((s) => ({
          ...s,
          items: s.items.filter((v) => {
            if (!q) return true;
            return (
              String(v.label || "").toLowerCase().includes(q) ||
              String(v.key || "").toLowerCase().includes(q) ||
              String(values[v.key] || "").toLowerCase().includes(q)
            );
          }),
        }))
        .filter((s) => s.items.length),
    [sections, cat, q, values],
  );

  const totalCount = sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <>
      <div className="flex items-center gap-2 border-b border-secondary/10 bg-white px-4 py-3 dark:border-dark_border dark:bg-darklight">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkle size={19} weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-black text-brand-deep dark:text-white">المتغيرات</h4>
          <p className="text-[11px] text-secondary/60 dark:text-darkmuted">{totalCount} متغير مناسب للمستلم ده</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`rounded-full p-2 text-secondary/70 hover:bg-secondary/10 dark:text-darkmuted dark:hover:bg-white/10 lg:hidden ${FOCUS}`}
        >
          <X size={20} weight="bold" />
        </button>
      </div>

      {recipient && meta && (
        <div className="mx-3 mt-3 flex items-center gap-3 rounded-2xl border border-secondary/5 bg-white p-3 shadow-sm dark:border-dark_border dark:bg-darklight">
          <Avatar role={recipient.type} name={recipientName(recipient)} size="h-11 w-11" text="text-base" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-brand-deep dark:text-white">{recipientName(recipient)}</p>
            <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-secondary/60 dark:text-darkmuted">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${meta.soft}`}>
                <MetaIcon size={12} weight="duotone" />
                {meta.label}
              </span>
              <span>{langName(effectiveLang)}</span>
              {recipient.hasPhone && (
                <span dir="ltr" className="text-darksubtle">
                  {recipient.phoneHint}
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {raw ? (
        <div className="m-3 space-y-3 rounded-2xl border border-secondary/25 bg-secondary/10 p-4 text-center dark:border-teal-400/25 dark:bg-teal-400/10">
          <Info size={26} weight="duotone" className="mx-auto text-secondary dark:text-teal-300" />
          <p className="text-xs leading-relaxed text-secondary dark:text-teal-200">
            وضع "إرسال النص كما هو" شغال — المتغيرات متوقفة.
          </p>
          <button
            type="button"
            onClick={onDisableRaw}
            className={`rounded-full bg-secondary px-4 py-1.5 text-xs font-bold text-white hover:bg-teal-dark ${FOCUS}`}
          >
            ارجع لوضع المتغيرات
          </button>
        </div>
      ) : (
        <>
          <div className="relative mx-3 mt-3">
            <MagnifyingGlass
              size={16}
              weight="bold"
              className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-secondary/40 dark:text-darksubtle"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن متغير…"
              className="w-full rounded-xl border border-transparent bg-white py-2.5 pe-9 ps-3 text-sm text-brand-deep outline-none transition placeholder:text-secondary/40 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 dark:bg-dark_input dark:text-white dark:placeholder:text-darksubtle"
            />
          </div>

          <div className="mt-2.5 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setCat("all")}
              className={`shrink-0 rounded-full px-3 py-1 text-[11.5px] font-semibold transition ${FOCUS} ${
                cat === "all"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white text-secondary/80 hover:bg-PaleCyan dark:bg-dark_input dark:text-darkmuted dark:hover:bg-darkhover"
              }`}
            >
              الكل
            </button>
            {sections.map(({ cat: c }) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.id)}
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[11.5px] font-semibold transition ${FOCUS} ${
                  cat === c.id
                    ? "bg-primary text-white shadow-sm"
                    : "bg-white text-secondary/80 hover:bg-PaleCyan dark:bg-dark_input dark:text-darkmuted dark:hover:bg-darkhover"
                }`}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-3 pt-2">
            {filtered.length === 0 ? (
              <p className="py-10 text-center text-xs text-secondary/50 dark:text-darksubtle">مفيش متغيرات مطابقة</p>
            ) : (
              filtered.map(({ cat: c, items }) => (
                <div key={c.id}>
                  <p className="mb-1.5 px-1 text-[11px] font-black tracking-wide text-secondary/60 dark:text-darkmuted">
                    {c.icon} {c.label}
                  </p>
                  <div className="space-y-1.5">
                    {items.map((v) => {
                      const val = values[v.key];
                      const empty = !val;
                      return (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => onInsert(`{${v.key}}`)}
                          title={`{${v.key}}`}
                          className={`group/var flex w-full items-center gap-2.5 rounded-xl border border-transparent bg-white p-2.5 text-start shadow-[0_1px_0_rgba(0,42,51,0.06)] transition hover:-translate-y-px hover:border-primary/30 hover:shadow-md active:scale-[0.98] dark:bg-dark_input dark:hover:border-primary/40 ${FOCUS}`}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-PaleSkyBlu text-base dark:bg-darkmode">
                            {v.icon}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-bold text-brand-deep dark:text-white">
                              {v.label}
                            </span>
                            {empty ? (
                              <span className="block text-[11px] font-medium text-amber-600 dark:text-amber-brand">
                                مفيش بيانات للمستلم ده
                              </span>
                            ) : (
                              <span dir="auto" className="block truncate text-[11.5px] text-orange-deep dark:text-amber-brand">
                                {val}
                              </span>
                            )}
                          </span>
                          <span
                            dir="ltr"
                            className="shrink-0 rounded-md bg-PaleSkyBlu px-1.5 py-0.5 font-mono text-[10px] text-secondary/70 opacity-0 transition group-hover/var:opacity-100 dark:bg-darkmode dark:text-darkmuted"
                          >
                            {`{${v.key}}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}

            <button
              type="button"
              onClick={onInsertGender}
              title="بيختار الكلمة حسب جنس المستلم"
              className={`flex w-full items-center gap-2.5 rounded-xl border border-dashed border-primary/50 bg-primary/5 p-2.5 text-start transition hover:bg-primary/10 ${FOCUS}`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-base">⚧</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold text-orange-deep dark:text-amber-brand">كلمة حسب الجنس</span>
                <span dir="ltr" className="block truncate font-mono text-[10.5px] text-secondary/60 dark:text-darkmuted">
                  {GENDER_INLINE_EXAMPLE}
                </span>
              </span>
            </button>
          </div>

          <p className="border-t border-secondary/10 bg-white/60 px-4 py-2 text-[10.5px] leading-relaxed text-secondary/60 dark:border-dark_border dark:bg-darklight/60 dark:text-darkmuted">
            القيم بتتحسب للمستلم المختار، والمتغيرات بتتغير تلقائي لما تغيّر المستلم أو اللغة.
          </p>
        </>
      )}
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * kind: "student" | "instructor"
 * memberId: studentId أو userId للمدرس
 */
export default function MemberMessagesModal({ groupId, kind, memberId, memberName, onClose }) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    group: null,
    recipients: [],
    messages: [],
    total: 0,
    instances: [],
  });
  const [refreshing, setRefreshing] = useState(false);
  const [scope, setScope] = useState("group"); // group | all
  const [roleFilter, setRoleFilter] = useState("all");
  const [instFilter, setInstFilter] = useState("all"); // all | main | eval | unknown

  const [recipientKey, setRecipientKey] = useState("");
  const [lang, setLang] = useState("auto");
  const [text, setText] = useState("");
  const [raw, setRaw] = useState(false);
  const [instance, setInstance] = useState("main");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  const [varsOpen, setVarsOpen] = useState(false);
  const [optsOpen, setOptsOpen] = useState(false);
  const [varSearch, setVarSearch] = useState("");
  const [varCat, setVarCat] = useState("all");

  const chatRef = useRef(null);
  const textareaRef = useRef(null);
  const optsRef = useRef(null);
  const firstLoad = useRef(true);

  const load = useCallback(
    async (nextScope) => {
      if (firstLoad.current) setState((s) => ({ ...s, loading: true }));
      else setRefreshing(true);
      try {
        const qs = new URLSearchParams({ kind, id: memberId, scope: nextScope });
        const res = await fetch(`/api/groups/${groupId}/member-messages?${qs}`, { cache: "no-store" });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "فشل تحميل الرسائل");
        setState({
          loading: false,
          error: null,
          group: json.data.group,
          recipients: json.data.recipients,
          messages: json.data.messages,
          total: json.data.totalMessages,
          instances: json.data.instances || [],
        });
        setRecipientKey(
          (cur) => cur || json.data.recipients.find((r) => r.hasPhone)?.key || json.data.recipients[0]?.key || "",
        );
      } catch (err) {
        setState((s) => ({ ...s, loading: false, error: err.message }));
      } finally {
        firstLoad.current = false;
        setRefreshing(false);
      }
    },
    [groupId, kind, memberId],
  );

  useEffect(() => {
    load(scope);
  }, [load, scope]);

  const { group, recipients, messages, instances } = state;
  const hasGuardian = recipients.some((r) => r.type === RECIPIENT_TYPE.GUARDIAN);

  const recipient = recipients.find((r) => r.key === recipientKey) || null;
  const effectiveLang = recipient ? (lang === "auto" ? recipient.language : lang) : "ar";

  const instanceConfigured = (key) =>
    !instances.length || instances.find((i) => i.key === key)?.configured !== false;

  // عدّادات الرقم (على الرسائل المحمّلة)
  const instCounts = useMemo(() => {
    const c = { all: messages.length, main: 0, eval: 0, unknown: 0 };
    messages.forEach((m) => {
      c[instKey(m.instance)] += 1;
    });
    return c;
  }, [messages]);

  // الأقدم فوق والأحدث تحت
  const chatMessages = useMemo(() => {
    let list = messages;
    if (roleFilter !== "all") list = list.filter((m) => m.role === roleFilter);
    if (instFilter !== "all") list = list.filter((m) => instKey(m.instance) === instFilter);
    return [...list].sort((a, b) => {
      const ta = a.sentAt ? new Date(a.sentAt).getTime() : 0;
      const tb = b.sentAt ? new Date(b.sentAt).getTime() : 0;
      return ta - tb;
    });
  }, [messages, roleFilter, instFilter]);

  const templates = useMemo(() => ({ contentAr: text, contentEn: text, overrides: EMPTY_OVERRIDES }), [text]);

  const preview = useMemo(() => {
    if (!recipient || !group || !text.trim()) return null;
    if (raw) return { text, language: effectiveLang };
    try {
      return composeMessage({ ...recipient, language: effectiveLang }, group, templates);
    } catch {
      return null;
    }
  }, [recipient, group, text, raw, effectiveLang, templates]);

  const unknownVars = useMemo(() => (raw ? [] : findUnknownVariables(text)), [raw, text]);
  const inapplicableVars = useMemo(
    () => (raw || !group ? [] : findInapplicableVariables(text, group)),
    [raw, text, group],
  );

  const canSend =
    !!recipient?.hasPhone &&
    !!text.trim() &&
    unknownVars.length === 0 &&
    inapplicableVars.length === 0 &&
    instanceConfigured(instance) &&
    !sending;

  const sections = useMemo(() => {
    if (!group || !recipient) return [];
    return VARIABLE_CATEGORIES.map((cat) => ({
      cat,
      items: VARIABLES.filter((v) => v.category === cat.id && isVariableApplicable(v, group)).filter(
        (v) => getVariableSupport(v, [recipient.type]) !== "none",
      ),
    })).filter((s) => s.items.length);
  }, [group, recipient]);

  const varValues = useMemo(() => {
    if (!group || !recipient) return {};
    const out = {};
    const target = { ...recipient, language: effectiveLang };
    sections.forEach(({ items }) =>
      items.forEach((v) => {
        try {
          const tpl = `{${v.key}}`;
          const r = composeMessage(target, group, { contentAr: tpl, contentEn: tpl, overrides: EMPTY_OVERRIDES });
          out[v.key] = String(r?.text ?? "").trim();
        } catch {
          out[v.key] = "";
        }
      }),
    );
    return out;
  }, [sections, group, recipient, effectiveLang]);

  useEffect(() => {
    if (varCat !== "all" && !sections.some((s) => s.cat.id === varCat)) setVarCat("all");
  }, [sections, varCat]);

  // ── effects ──
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMessages.length, scope, roleFilter, instFilter, state.loading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [text, state.loading]);

  useEffect(() => {
    if (!optsOpen) return;
    const handler = (e) => {
      if (optsRef.current && !optsRef.current.contains(e.target)) setOptsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [optsOpen]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && !sending) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, sending]);

  const insertText = (snippet) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? start;
    setRaw(false);
    setText(text.slice(0, start) + snippet + text.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + snippet.length, start + snippet.length);
    });
  };

  const handleResend = (item) => {
    const target = recipients.find((r) => r.type === item.role) || recipients[0];
    if (target) setRecipientKey(target.key);
    setText(item.content);
    setRaw(true);
    setLang("auto");
    if ((item.instance === "main" || item.instance === "eval") && instanceConfigured(item.instance)) {
      setInstance(item.instance);
    }
    setConfirming(false);
    toast("اتحطت الرسالة في المحرر — راجعها وابعتها", { icon: "✏️" });
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleSend = async () => {
    setConfirming(false);
    setSending(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/member-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientKey, content: text, language: lang, raw, instance }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل الإرسال");
      toast.success(`اتبعتت لـ ${json.data.name || recipientName(recipient)} من ${instanceMeta(instance).label}`);
      setText("");
      setRaw(false);
      setVarsOpen(false);
      await load(scope);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && canSend) {
      e.preventDefault();
      setConfirming(true);
    }
  };

  const kindRole = kind === "instructor" ? RECIPIENT_TYPE.INSTRUCTOR : RECIPIENT_TYPE.STUDENT;
  const kindMeta = ROLE_META[kindRole];
  const showRoleInBubble = kind === "student" && hasGuardian;

  const timeline = useMemo(() => {
    const out = [];
    let last = null;
    chatMessages.forEach((m) => {
      const k = dayKey(m.sentAt);
      if (k !== last) {
        out.push({ type: "day", key: `day-${k}-${m.id}`, label: dayLabel(m.sentAt) });
        last = k;
      }
      out.push({ type: "msg", key: m.id, item: m });
    });
    return out;
  }, [chatMessages]);

  const instTabs = [
    { id: "all", label: "كل الأرقام" },
    { id: "main", label: INSTANCE_META.main.label },
    { id: "eval", label: INSTANCE_META.eval.label },
    ...(instCounts.unknown > 0 ? [{ id: "unknown", label: "قديمة" }] : []),
  ];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-teal-deeper/70 p-0 backdrop-blur-sm sm:p-5"
      onClick={(e) => e.target === e.currentTarget && !sending && onClose()}
    >
      <div
        dir="rtl"
        className="relative flex h-full w-full max-w-[1280px] flex-col overflow-hidden bg-brand-soft shadow-[0_32px_90px_rgba(0,26,31,0.55)] dark:bg-darkmode sm:h-[96vh] sm:rounded-3xl sm:border sm:border-secondary/15 dark:sm:border-dark_border"
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3.5 border-b-2 border-primary bg-secondary px-5 py-3 text-white dark:bg-darklight">
          <div className="relative">
            <Avatar role={kindRole} name={memberName} size="h-12 w-12" text="text-lg" />
            <span className="absolute -bottom-0.5 -left-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-secondary dark:ring-darklight" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold leading-tight sm:text-[17px]">{memberName}</h3>
            <p className="truncate text-xs text-white/75">
              {kindMeta.label}
              {group && <span> · {group.name}</span>}
              {!state.loading && <span> · {state.total} رسالة</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={() => load(scope)}
            disabled={refreshing}
            title="تحديث"
            className={`rounded-full p-2.5 text-white/85 transition hover:bg-white/10 ${FOCUS}`}
          >
            <ArrowsClockwise size={21} weight="bold" className={refreshing ? "animate-spin" : ""} />
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            title="إغلاق (Esc)"
            className={`rounded-full p-2.5 text-white/85 transition hover:bg-white/10 ${FOCUS}`}
          >
            <X size={21} weight="bold" />
          </button>
        </div>

        {/* ── Body ── */}
        {state.loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3" style={WALLPAPER}>
            <CircleNotch size={34} weight="bold" className="animate-spin text-primary" />
            <p className="text-xs text-secondary/70 dark:text-darkmuted">جاري تحميل الرسائل…</p>
          </div>
        ) : state.error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center" style={WALLPAPER}>
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10">
              <Warning size={30} weight="duotone" className="text-rose-500" />
            </span>
            <p className="text-sm text-rose-600">{state.error}</p>
            <button
              type="button"
              onClick={() => load(scope)}
              className={`rounded-full bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-accent-hover ${FOCUS}`}
            >
              حاول تاني
            </button>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_380px]">
            {/* ═══ Chat column ═══ */}
            <div className="flex min-h-0 min-w-0 flex-col">
              {/* filters */}
              <div className="space-y-2 bg-PaleSkyBlu px-4 py-2.5 dark:bg-darklight">
                <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <FilterChip active={scope === "group"} onClick={() => setScope("group")}>
                    الجروب ده
                  </FilterChip>
                  <FilterChip active={scope === "all"} onClick={() => setScope("all")}>
                    كل الرسائل
                  </FilterChip>
                  {kind === "student" && hasGuardian && (
                    <>
                      <span className="mx-0.5 h-5 w-px shrink-0 bg-secondary/20 dark:bg-dark_border" />
                      <FilterChip active={roleFilter === "all"} onClick={() => setRoleFilter("all")}>
                        الكل
                      </FilterChip>
                      <FilterChip
                        active={roleFilter === RECIPIENT_TYPE.STUDENT}
                        onClick={() => setRoleFilter(RECIPIENT_TYPE.STUDENT)}
                      >
                        الطالب
                      </FilterChip>
                      <FilterChip
                        active={roleFilter === RECIPIENT_TYPE.GUARDIAN}
                        onClick={() => setRoleFilter(RECIPIENT_TYPE.GUARDIAN)}
                      >
                        ولي الأمر
                      </FilterChip>
                    </>
                  )}
                </div>

                {/* ✅ فلتر الرقم اللي بعت */}
                <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-secondary/60 dark:text-darkmuted">
                    <DeviceMobile size={15} weight="duotone" />
                    المُرسِل
                  </span>
                  {instTabs.map((t) => (
                    <FilterChip
                      key={t.id}
                      active={instFilter === t.id}
                      onClick={() => setInstFilter(t.id)}
                      count={instCounts[t.id]}
                    >
                      {t.id !== "all" && (
                        <span className={`h-2 w-2 rounded-full ${INSTANCE_BAR[t.id]}`} />
                      )}
                      {t.label}
                    </FilterChip>
                  ))}
                </div>
              </div>

              {/* chat area */}
              <div ref={chatRef} className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 sm:px-8" style={WALLPAPER}>
                {state.total > state.messages.length && (
                  <div className="flex justify-center pt-3">
                    <span className="rounded-lg bg-amber-brand/20 px-3 py-1 text-[11.5px] font-medium text-orange-deep shadow-sm dark:bg-amber-brand/10 dark:text-amber-brand">
                      معروض آخر {state.messages.length} رسالة من {state.total}
                    </span>
                  </div>
                )}

                {timeline.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
                    <span className="flex h-24 w-24 items-center justify-center rounded-full bg-white/80 shadow-sm dark:bg-white/5">
                      <ChatCircleDots size={44} weight="duotone" className="text-primary/70" />
                    </span>
                    <p className="rounded-lg bg-white/80 px-4 py-1.5 text-sm text-secondary/80 shadow-sm dark:bg-darklight dark:text-darkmuted">
                      مفيش رسائل {scope === "group" ? "للجروب ده" : ""} لحد دلوقتي
                    </p>
                    {instFilter !== "all" ? (
                      <button
                        type="button"
                        onClick={() => setInstFilter("all")}
                        className={`rounded text-xs font-bold text-orange-deep hover:underline dark:text-amber-brand ${FOCUS}`}
                      >
                        اعرض كل الأرقام
                      </button>
                    ) : (
                      scope === "group" && (
                        <button
                          type="button"
                          onClick={() => setScope("all")}
                          className={`rounded text-xs font-bold text-orange-deep hover:underline dark:text-amber-brand ${FOCUS}`}
                        >
                          اعرض كل رسائله
                        </button>
                      )
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {timeline.map((row) =>
                      row.type === "day" ? (
                        <DatePill key={row.key}>{row.label}</DatePill>
                      ) : (
                        <ChatBubble key={row.key} item={row.item} onResend={handleResend} showRole={showRoleInBubble} />
                      ),
                    )}
                  </div>
                )}
              </div>

              {/* ── Composer ── */}
              <div className="space-y-2.5 border-t border-secondary/10 bg-PaleSkyBlu px-3 pb-3.5 pt-2.5 dark:border-dark_border dark:bg-darklight sm:px-5">
                {unknownVars.length > 0 && (
                  <Notice tone="rose">
                    متغيرات غير معروفة: <span dir="ltr" className="font-mono">{unknownVars.join(" ")}</span>
                  </Notice>
                )}
                {inapplicableVars.length > 0 && (
                  <Notice tone="rose">
                    متغيرات مش مناسبة لنوع الجروب: <span dir="ltr" className="font-mono">{inapplicableVars.join(" ")}</span>
                  </Notice>
                )}
                {!instanceConfigured(instance) && (
                  <Notice tone="rose">
                    الرقم "{instanceMeta(instance).label}" مش متضبط في الـ env — اختار رقم تاني من خيارات الإرسال.
                  </Notice>
                )}
                {raw && text.trim() && (
                  <Notice tone="sky">
                    النص هيتبعت بالظبط زي ما هو. لو بتبعته لشخص تاني (مثلًا من الطالب لولي الأمر) راجع التحية والأسماء.
                  </Notice>
                )}

                {preview && (
                  <div className="rounded-2xl bg-white/70 p-3 dark:bg-darkmode/70">
                    <p className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-secondary/60 dark:text-darkmuted">
                      معاينة — هتوصل كده
                      {recipient && <span className="font-medium">· {recipientName(recipient)}</span>}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${instanceMeta(instance).soft}`}
                      >
                        <DeviceMobile size={11} weight="fill" />
                        من {instanceMeta(instance).label}
                      </span>
                    </p>
                    <div className="flex">
                      <div
                        dir={preview.language === "en" ? "ltr" : "rtl"}
                        className="relative ms-auto max-h-40 max-w-[92%] overflow-y-auto rounded-2xl rounded-tl-none border border-dashed border-primary/50 bg-PaleCyan/70 px-3.5 py-2.5 text-[14.5px] leading-relaxed text-brand-deep dark:bg-teal-brand/60 dark:text-white"
                      >
                        <p className="whitespace-pre-wrap break-words">{preview.text}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* recipient chips */}
                <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <span className="shrink-0 text-xs font-bold text-secondary/60 dark:text-darkmuted">إلى</span>
                  {recipients.map((r) => {
                    const meta = ROLE_META[r.type];
                    const active = r.key === recipientKey;
                    return (
                      <button
                        key={r.key}
                        type="button"
                        disabled={!r.hasPhone}
                        onClick={() => setRecipientKey(r.key)}
                        title={r.hasPhone ? r.phoneHint : "بدون رقم"}
                        className={`flex shrink-0 items-center gap-2 rounded-full py-1 pe-3.5 ps-1 text-[13px] font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS} ${
                          active
                            ? "bg-primary/15 text-orange-deep ring-1 ring-primary/50 dark:bg-primary/20 dark:text-amber-brand"
                            : "bg-white text-secondary hover:bg-PaleCyan dark:bg-dark_input dark:text-darkmuted dark:hover:bg-darkhover"
                        }`}
                      >
                        <Avatar role={r.type} name={recipientName(r)} size="h-7 w-7" text="text-xs" />
                        <span className="max-w-[140px] truncate">{recipientName(r)}</span>
                        <span className="text-[10.5px] font-medium opacity-60">{meta.label}</span>
                        {!r.hasPhone && (
                          <span className="rounded-full bg-rose-500/10 px-1.5 text-[9px] font-bold text-rose-600">بدون رقم</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* instance quick picker */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-secondary/60 dark:text-darkmuted">
                    <DeviceMobile size={15} weight="duotone" />
                    من رقم
                  </span>
                  {["main", "eval"].map((key) => {
                    const info = instances.find((i) => i.key === key);
                    const ok = instanceConfigured(key);
                    const active = instance === key;
                    const meta = INSTANCE_META[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={!ok}
                        onClick={() => setInstance(key)}
                        title={ok ? `Instance ${info?.idHint || ""}` : "مش متضبط في الـ env"}
                        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS} ${
                          active
                            ? "bg-primary/15 text-orange-deep ring-1 ring-primary/50 dark:bg-primary/20 dark:text-amber-brand"
                            : "bg-white text-secondary hover:bg-PaleCyan dark:bg-dark_input dark:text-darkmuted dark:hover:bg-darkhover"
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-500"}`} />
                        {meta.label}
                        {info?.idHint && (
                          <span dir="ltr" className="text-[10px] font-normal opacity-60">
                            {info.idHint}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* input row / confirm */}
                {confirming ? (
                  <div className="flex items-center gap-2 rounded-3xl bg-white p-2.5 ps-5 shadow-sm dark:bg-dark_input">
                    <p className="min-w-0 flex-1 truncate text-sm font-bold text-brand-deep dark:text-white">
                      هتبعت لـ {recipient ? recipientName(recipient) : "—"} ({recipient ? ROLE_META[recipient.type].label : ""}) من{" "}
                      {instanceMeta(instance).label}؟
                    </p>
                    <button
                      type="button"
                      onClick={() => setConfirming(false)}
                      className={`rounded-full bg-PaleSkyBlu px-5 py-2.5 text-xs font-semibold text-secondary hover:bg-PaleCyan dark:bg-darklight dark:text-darkmuted dark:hover:bg-darkhover ${FOCUS}`}
                    >
                      رجوع
                    </button>
                    <button
                      type="button"
                      onClick={handleSend}
                      className={`flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-brand-sm hover:bg-accent-hover ${FOCUS}`}
                    >
                      <PaperPlaneRight size={15} weight="fill" mirrored /> أكّد الإرسال
                    </button>
                  </div>
                ) : (
                  <div className="flex items-end gap-2.5">
                    <div className="flex min-w-0 flex-1 items-end gap-1 rounded-3xl bg-white px-2.5 py-2 shadow-sm dark:bg-dark_input">
                      <button
                        type="button"
                        onClick={() => setVarsOpen((v) => !v)}
                        title="المتغيرات"
                        className={`mb-0.5 shrink-0 rounded-full p-2 text-secondary/70 transition hover:bg-secondary/10 dark:text-darkmuted dark:hover:bg-white/10 lg:hidden ${FOCUS}`}
                      >
                        <Lightning size={21} weight="duotone" />
                      </button>

                      <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={onKeyDown}
                        rows={1}
                        dir={effectiveLang === "ar" ? "rtl" : "ltr"}
                        maxLength={MAX_MESSAGE_LENGTH}
                        placeholder={
                          effectiveLang === "ar"
                            ? "اكتب رسالة… واختار المتغيرات من الجنب"
                            : "Type a message… pick variables from the side"
                        }
                        className="max-h-44 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] leading-6 text-brand-deep outline-none placeholder:text-secondary/40 dark:text-white dark:placeholder:text-darksubtle"
                      />

                      {/* options popover */}
                      <div className="relative mb-0.5 shrink-0" ref={optsRef}>
                        <button
                          type="button"
                          onClick={() => setOptsOpen((v) => !v)}
                          title="خيارات الإرسال"
                          className={`relative rounded-full p-2 transition ${FOCUS} ${
                            optsOpen
                              ? "bg-secondary/10 text-brand-deep dark:bg-white/10 dark:text-white"
                              : "text-secondary/70 hover:bg-secondary/10 dark:text-darkmuted dark:hover:bg-white/10"
                          }`}
                        >
                          <SlidersHorizontal size={21} weight="duotone" />
                          {(raw || lang !== "auto" || instance !== "main") && (
                            <span className="absolute end-1 top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-white dark:ring-dark_input" />
                          )}
                        </button>

                        {optsOpen && (
                          <div className="absolute bottom-full start-0 z-10 mb-2 w-72 space-y-3 rounded-2xl border border-secondary/10 bg-white p-3.5 shadow-brand-lg animate-in fade-in zoom-in-95 duration-100 dark:border-dark_border dark:bg-darklight">
                            <div>
                              <p className="mb-1.5 text-[11px] font-bold text-secondary/70 dark:text-darkmuted">يبعت من أنهي رقم؟</p>
                              <div className="flex rounded-xl bg-PaleSkyBlu p-0.5 dark:bg-darkmode">
                                {["main", "eval"].map((key) => {
                                  const info = instances.find((i) => i.key === key);
                                  const ok = instanceConfigured(key);
                                  return (
                                    <button
                                      key={key}
                                      type="button"
                                      disabled={!ok}
                                      onClick={() => setInstance(key)}
                                      className={`flex-1 rounded-[10px] px-2 py-1.5 text-[11px] font-bold transition disabled:opacity-30 ${FOCUS} ${
                                        instance === key
                                          ? "bg-white text-orange-deep shadow-sm dark:bg-dark_input dark:text-amber-brand"
                                          : "text-secondary/60 dark:text-darkmuted"
                                      }`}
                                    >
                                      {INSTANCE_META[key].label}
                                      {info?.idHint ? (
                                        <span dir="ltr" className="ms-1 font-normal opacity-60">
                                          {info.idHint}
                                        </span>
                                      ) : null}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div>
                              <p className="mb-1.5 text-[11px] font-bold text-secondary/70 dark:text-darkmuted">لغة الرسالة</p>
                              <div className="flex rounded-xl bg-PaleSkyBlu p-0.5 dark:bg-darkmode">
                                {LANG_OPTIONS.map((o) => (
                                  <button
                                    key={o.id}
                                    type="button"
                                    onClick={() => setLang(o.id)}
                                    className={`flex-1 rounded-[10px] px-2 py-1.5 text-[11px] font-bold transition ${FOCUS} ${
                                      lang === o.id
                                        ? "bg-white text-orange-deep shadow-sm dark:bg-dark_input dark:text-amber-brand"
                                        : "text-secondary/60 dark:text-darkmuted"
                                    }`}
                                  >
                                    {o.label}
                                  </button>
                                ))}
                              </div>
                              <p className="mt-1.5 text-[10px] leading-relaxed text-secondary/50 dark:text-darksubtle">
                                اللغة بتحدد التحية والاسم وعنوان الابن/الابنة، مش بتترجم النص.
                              </p>
                            </div>

                            <label className="flex cursor-pointer items-start gap-2 text-[12px] text-secondary dark:text-darkmuted">
                              <input
                                type="checkbox"
                                checked={raw}
                                onChange={(e) => setRaw(e.target.checked)}
                                className="mt-0.5 h-3.5 w-3.5 accent-primary"
                              />
                              إرسال النص كما هو (من غير تعويض المتغيرات)
                            </label>

                            <p className="text-end text-[10px] tabular-nums text-secondary/50 dark:text-darksubtle">
                              {text.length}/{MAX_MESSAGE_LENGTH}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* send button */}
                    <button
                      type="button"
                      onClick={() => setConfirming(true)}
                      disabled={!canSend}
                      title="إرسال (Ctrl + Enter)"
                      className={`mb-0.5 flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-brand-md transition hover:bg-accent-hover active:scale-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${FOCUS}`}
                    >
                      {sending ? (
                        <CircleNotch size={22} weight="bold" className="animate-spin" />
                      ) : (
                        <PaperPlaneRight size={22} weight="fill" mirrored />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ═══ Variables panel ═══ */}
            <aside
              className={`${varsOpen ? "flex" : "hidden"} min-h-0 flex-col bg-PaleSkyBlu dark:bg-darkmode lg:flex lg:border-s lg:border-secondary/10 dark:lg:border-dark_border max-lg:absolute max-lg:inset-x-0 max-lg:bottom-0 max-lg:top-[76px] max-lg:z-20 max-lg:rounded-t-3xl max-lg:shadow-[0_-12px_40px_rgba(0,26,31,0.35)]`}
            >
              <VariablesPanel
                recipient={recipient}
                effectiveLang={effectiveLang}
                sections={sections}
                values={varValues}
                raw={raw}
                search={varSearch}
                setSearch={setVarSearch}
                cat={varCat}
                setCat={setVarCat}
                onInsert={(snippet) => {
                  insertText(snippet);
                  setVarsOpen(false);
                }}
                onInsertGender={() => {
                  insertText(GENDER_INLINE_EXAMPLE);
                  setVarsOpen(false);
                }}
                onDisableRaw={() => setRaw(false)}
                onClose={() => setVarsOpen(false)}
              />
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}