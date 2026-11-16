// components/admin/InstanceLogPanel.jsx
"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowsClockwise,
  CaretDown,
  ChalkboardTeacher,
  ChatCircleDots,
  Checks,
  CircleNotch,
  Clock,
  Copy,
  DeviceMobile,
  GraduationCap,
  MagnifyingGlass,
  Stack,
  Tray,
  UsersThree,
  Warning,
  X,
  XCircle,
} from "@phosphor-icons/react";
import { INSTANCE_META } from "./InstancePicker";

// ─── Constants ────────────────────────────────────────────────────────────────

const TZ = "Africa/Cairo";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

const WALLPAPER = {
  backgroundImage: "radial-gradient(rgba(0,77,89,0.06) 1.1px, transparent 1.1px)",
  backgroundSize: "20px 20px",
};

const ROLE_META = {
  student: { label: "طالب", Icon: GraduationCap, grad: "from-secondary to-teal-500" },
  guardian: { label: "ولي أمر", Icon: UsersThree, grad: "from-primary to-amber-brand" },
  instructor: { label: "مدرس", Icon: ChalkboardTeacher, grad: "from-teal-dark to-brand-coral" },
};

const ROLE_FILTERS = [
  { id: "student", label: "الطلبة", Icon: GraduationCap },
  { id: "guardian", label: "أولياء الأمور", Icon: UsersThree },
  { id: "instructor", label: "المدرسين", Icon: ChalkboardTeacher },
];

const INSTANCE_DOT = {
  main: "bg-sky-500",
  eval: "bg-violet-500",
  unknown: "bg-gray-400",
};

// تابات الرقم (الكل + الرئيسي + التقييم + القديمة)
const INSTANCE_TABS = [
  { id: "all", label: "الكل" },
  { id: "main", label: INSTANCE_META.main.label },
  { id: "eval", label: INSTANCE_META.eval.label },
  { id: "unknown", label: "قديمة" },
];

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const typeLabel = (type) => {
  const hit = TYPE_RULES.find(([re]) => re.test(String(type || "")));
  return hit ? hit[1] : "رسالة";
};

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

// ─── Small pieces ─────────────────────────────────────────────────────────────

function DatePill({ children }) {
  return (
    <div className="sticky top-1 z-[1] flex justify-center py-2.5">
      <span className="rounded-lg bg-white/95 px-3 py-1 text-[11.5px] font-medium text-secondary/80 shadow-[0_1px_1px_rgba(0,42,51,0.1)] dark:bg-darklight/95 dark:text-darkmuted">
        {children}
      </span>
    </div>
  );
}

function StatusTicks({ status }) {
  if (status === "failed") return <XCircle size={15} weight="fill" className="text-rose-500" />;
  if (status === "pending") return <Clock size={13} weight="bold" className="text-secondary/40 dark:text-darkmuted" />;
  return <Checks size={17} weight="bold" className="text-sky-500" />;
}

function Chip({ active, onClick, children, count, failed }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[12.5px] font-semibold transition active:scale-95 ${FOCUS} ${
        active
          ? "bg-secondary text-white dark:bg-primary"
          : "bg-white text-secondary/80 hover:bg-PaleCyan dark:bg-dark_input dark:text-darkmuted dark:hover:bg-darkhover"
      }`}
    >
      {children}
      {count !== undefined && count !== null && (
        <span className="text-[10.5px] tabular-nums opacity-70">{count}</span>
      )}
      {failed > 0 && (
        <span className="inline-flex min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9.5px] font-bold text-white">
          {failed}
        </span>
      )}
    </button>
  );
}

const Divider = () => <span className="mx-0.5 h-4 w-px shrink-0 bg-secondary/15 dark:bg-dark_border" />;

// ─── Row (شكل ليستة الشات) + فقاعة الرسالة عند الفتح ─────────────────────────────

function LogRow({ m, expanded, onToggle }) {
  const role = ROLE_META[m.role] || ROLE_META.student;
  const inst = INSTANCE_META[m.instance] || INSTANCE_META.unknown;
  const ik = m.instance === "main" || m.instance === "eval" ? m.instance : "unknown";
  const failed = m.status === "failed";
  const RoleIcon = role.Icon;
  const isRtl = m.language !== "en";

  const copy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(m.content || "");
      toast.success("اتنسخت");
    } catch {
      toast.error("مقدرتش أنسخ");
    }
  };

  return (
    <li className={`transition-colors ${expanded ? "bg-white dark:bg-white/[0.04]" : "hover:bg-PaleSkyBlu/70 dark:hover:bg-white/[0.04]"}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`flex w-full items-start gap-3 px-4 py-3 text-start ${FOCUS}`}
      >
        {/* avatar + نقطة لون الرقم */}
        <div className="relative shrink-0">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-white ${role.grad}`}
          >
            <RoleIcon size={22} weight="duotone" />
          </span>
          <span
            className={`absolute -bottom-0.5 -end-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-white dark:ring-darkmode ${INSTANCE_DOT[ik]}`}
          />
        </div>

        {/* content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[15px] font-semibold text-brand-deep dark:text-white">
              {m.recipientName || role.label}
            </p>
            <span className="shrink-0 text-[11.5px] tabular-nums text-secondary/60 dark:text-darkmuted">
              {fmtTime(m.sentAt)}
            </span>
          </div>

          <div className="mt-0.5 flex items-center gap-1.5">
            <StatusTicks status={m.status} />
            <p className="min-w-0 flex-1 truncate text-sm text-secondary/70 dark:text-darkmuted">
              {expanded ? typeLabel(m.type) : m.content || "—"}
            </p>
            <CaretDown
              size={14}
              weight="bold"
              className={`shrink-0 text-secondary/40 transition-transform dark:text-darkmuted ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${inst.soft}`}>
              <DeviceMobile size={11} weight="fill" />
              {m.instance && m.instance !== "unknown" ? inst.label : "قديمة"}
            </span>
            <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-semibold text-secondary dark:bg-white/10 dark:text-darkmuted">
              {role.label}
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-orange-deep dark:text-amber-brand">
              {typeLabel(m.type)}
            </span>
            {m.isCustom && (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                مخصصة
              </span>
            )}
            {failed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-300">
                <Warning size={11} weight="fill" /> فشلت
              </span>
            )}
          </div>
        </div>
      </button>

      {/* الفقاعة */}
      {expanded && (
        <div className="px-4 pb-4 ps-[76px]">
          <div className="flex">
            <div
              className={`relative ms-auto max-w-full rounded-2xl rounded-tl-none px-3 pb-1.5 pt-2 shadow-[0_1px_1px_rgba(0,42,51,0.12)] ${
                failed
                  ? "bg-rose-50 ring-1 ring-rose-300 dark:bg-rose-950/50 dark:ring-rose-500/40"
                  : "bg-PaleCyan dark:bg-teal-brand"
              }`}
            >
              <span className="absolute -left-[7px] top-0 h-3 w-2 bg-inherit [clip-path:polygon(100%_0,0_0,100%_100%)]" />

              <p
                dir={isRtl ? "rtl" : "ltr"}
                className="whitespace-pre-wrap break-words text-[14.5px] leading-relaxed text-brand-deep dark:text-white"
              >
                {m.content || "—"}
              </p>

              {failed && m.error && (
                <p dir="ltr" className="mt-2 rounded-lg bg-rose-500/10 px-2 py-1 text-[11px] text-rose-700 dark:text-rose-300">
                  {m.error}
                </p>
              )}

              <div className="mt-0.5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={copy}
                  title="نسخ"
                  className={`rounded-full p-1.5 text-secondary/70 hover:bg-secondary/10 dark:text-darkmuted dark:hover:bg-white/10 ${FOCUS}`}
                >
                  <Copy size={14} weight="bold" />
                </button>
                <div className="flex items-center gap-1.5 text-[11px] text-secondary/55 dark:text-darkmuted">
                  {m.number && (
                    <span dir="ltr" className="tabular-nums">
                      {m.number}
                    </span>
                  )}
                  <span className="font-semibold">{langChip(m.language)}</span>
                  <span className="tabular-nums">{fmtTime(m.sentAt)}</span>
                  <StatusTicks status={m.status} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function InstanceLogPanel({ groupId }) {
  const [filter, setFilter] = useState("all"); // all | main | eval | unknown
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [state, setState] = useState({ loading: true, error: null, counts: null, messages: [] });
  const [expandedId, setExpandedId] = useState(null);

  const reqId = useRef(0);

  const load = useCallback(async () => {
    const myReq = ++reqId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch(`/api/groups/${groupId}/instance-log?instance=${filter}`, { cache: "no-store" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل السجل");
      if (myReq !== reqId.current) return; // رد قديم، تجاهله
      setState({ loading: false, error: null, counts: json.data.counts, messages: json.data.messages });
    } catch (err) {
      if (myReq !== reqId.current) return;
      setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  }, [groupId, filter]);

  useEffect(() => {
    load();
  }, [load]);

  // لما تغيّر الفلتر اقفل أي رسالة مفتوحة
  useEffect(() => {
    setExpandedId(null);
  }, [filter, roleFilter, search]);

  const { loading, error, counts, messages } = state;

  const totalAll = counts ? (counts.main?.total || 0) + (counts.eval?.total || 0) + (counts.unknown?.total || 0) : null;
  const failedAll = counts ? (counts.main?.failed || 0) + (counts.eval?.failed || 0) + (counts.unknown?.failed || 0) : 0;

  const countFor = (id) => (id === "all" ? totalAll : counts?.[id]?.total ?? 0);
  const failedFor = (id) => (id === "all" ? failedAll : counts?.[id]?.failed ?? 0);

  // "قديمة" تظهر بس لو فيه رسائل قديمة أو هي المختارة
  const visibleTabs = INSTANCE_TABS.filter(
    (t) => t.id !== "unknown" || (counts?.unknown?.total || 0) > 0 || filter === "unknown",
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter((m) => {
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      if (!q) return true;
      return (
        String(m.recipientName || "").toLowerCase().includes(q) ||
        String(m.content || "").toLowerCase().includes(q) ||
        typeLabel(m.type).includes(q)
      );
    });
  }, [messages, roleFilter, search]);

  const timeline = useMemo(() => {
    const out = [];
    let last = null;
    visible.forEach((m) => {
      const k = dayKey(m.sentAt);
      if (k !== last) {
        out.push({ type: "day", key: `day-${k}-${m.role}-${m.id}`, label: dayLabel(m.sentAt) });
        last = k;
      }
      out.push({ type: "msg", key: `${m.role}-${m.id}`, m });
    });
    return out;
  }, [visible]);

  const activeTab = INSTANCE_TABS.find((t) => t.id === filter);

  return (
    <div
      dir="rtl"
      className="overflow-hidden rounded-2xl border border-PowderBlueBorder bg-white shadow-[0_6px_24px_rgba(0,42,51,0.08)] dark:border-dark_border dark:bg-darkmode"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3 bg-secondary px-4 py-3 text-white dark:bg-darklight">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
          <DeviceMobile size={22} weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold leading-tight">سجل الرسائل حسب الرقم</h3>
          <p className="truncate text-xs text-white/70">
            {activeTab?.label}
            {counts && <span> · {countFor(filter)} رسالة</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          title="تحديث"
          className={`rounded-full p-2.5 text-white/85 transition hover:bg-white/10 ${FOCUS}`}
        >
          <ArrowsClockwise size={20} weight="bold" className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ── Search + filters ── */}
      <div className="space-y-2 bg-PaleSkyBlu px-3 py-2.5 dark:bg-darklight md:px-4">
        <div className="relative">
          <MagnifyingGlass
            size={16}
            weight="bold"
            className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-secondary/40 dark:text-darkmuted"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو نص الرسالة…"
            className="w-full rounded-full bg-white py-2.5 pe-10 ps-10 text-sm text-brand-deep outline-none transition placeholder:text-secondary/40 focus:ring-2 focus:ring-primary/30 dark:bg-dark_input dark:text-white dark:placeholder:text-darkmuted"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              title="مسح"
              className={`absolute start-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-secondary/50 hover:bg-black/5 dark:hover:bg-white/10 ${FOCUS}`}
            >
              <X size={14} weight="bold" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleTabs.map((tab) => (
            <Chip
              key={tab.id}
              active={filter === tab.id}
              onClick={() => setFilter(tab.id)}
              count={countFor(tab.id)}
              failed={failedFor(tab.id)}
            >
              {tab.id === "all" ? (
                <Stack size={14} weight="duotone" />
              ) : (
                <span className={`h-2 w-2 rounded-full ${INSTANCE_DOT[tab.id]}`} />
              )}
              {tab.label}
            </Chip>
          ))}

          <Divider />
          {ROLE_FILTERS.map(({ id, label, Icon }) => (
            <Chip
              key={id}
              active={roleFilter === id}
              onClick={() => setRoleFilter((r) => (r === id ? "all" : id))}
            >
              <Icon size={14} weight="duotone" />
              {label}
            </Chip>
          ))}
        </div>
      </div>

      {/* progress line */}
      <div className="h-0.5 w-full overflow-hidden">
        {loading && messages.length > 0 && <div className="h-full w-full animate-pulse bg-primary/70" />}
      </div>

      {/* ── List ── */}
      <div className="max-h-[620px] min-h-[260px] overflow-y-auto" style={WALLPAPER}>
        {error ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10">
              <Warning size={30} weight="duotone" className="text-rose-500" />
            </span>
            <p className="text-sm text-rose-600">{error}</p>
            <button
              type="button"
              onClick={load}
              className={`rounded-full bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-accent-hover ${FOCUS}`}
            >
              حاول تاني
            </button>
          </div>
        ) : loading && messages.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20">
            <CircleNotch size={32} weight="bold" className="animate-spin text-primary" />
            <p className="text-xs text-secondary/70 dark:text-darkmuted">جاري تحميل السجل…</p>
          </div>
        ) : timeline.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 dark:bg-white/5">
              {search || roleFilter !== "all" ? (
                <Tray size={38} weight="duotone" className="text-primary/70" />
              ) : (
                <ChatCircleDots size={38} weight="duotone" className="text-primary/70" />
              )}
            </span>
            <p className="rounded-lg bg-white/90 px-4 py-1.5 text-sm text-secondary/80 dark:bg-darklight dark:text-darkmuted">
              مفيش رسائل في الفلتر ده
            </p>
            {(filter !== "all" || roleFilter !== "all" || search) && (
              <button
                type="button"
                onClick={() => {
                  setFilter("all");
                  setRoleFilter("all");
                  setSearch("");
                }}
                className={`rounded text-xs font-bold text-orange-deep hover:underline dark:text-amber-brand ${FOCUS}`}
              >
                اعرض كل الرسائل
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-secondary/5 bg-white/70 dark:divide-dark_border dark:bg-transparent">
            {timeline.map((row) =>
              row.type === "day" ? (
                <li key={row.key} className="bg-transparent">
                  <DatePill>{row.label}</DatePill>
                </li>
              ) : (
                <LogRow
                  key={row.key}
                  m={row.m}
                  expanded={expandedId === row.key}
                  onToggle={() => setExpandedId((cur) => (cur === row.key ? null : row.key))}
                />
              ),
            )}
          </ul>
        )}
      </div>

      {/* ── Footer ── */}
      {counts && (counts.unknown?.total || 0) > 0 && (
        <p className="bg-PaleSkyBlu px-4 py-2.5 text-center text-[11px] text-secondary/60 dark:bg-darklight/60 dark:text-darkmuted">
          الرسائل "القديمة" اتبعتت قبل ما النظام يبدأ يسجّل الرقم اللي بعت.
        </p>
      )}
    </div>
  );
}