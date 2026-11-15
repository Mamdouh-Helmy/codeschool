// components/admin/InstanceLogPanel.jsx
"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  CheckCheck,
  ChevronDown,
  Clock,
  Copy,
  GraduationCap,
  Inbox,
  Layers,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Smartphone,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { INSTANCE_META } from "./InstancePicker";

// ─── Constants ────────────────────────────────────────────────────────────────

const TZ = "Africa/Cairo";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

const WALLPAPER = {
  backgroundImage: "radial-gradient(rgba(0,77,89,0.07) 1.2px, transparent 1.2px)",
  backgroundSize: "22px 22px",
};

const ROLE_META = {
  student: { label: "طالب", Icon: GraduationCap, grad: "from-secondary to-teal-500" },
  guardian: { label: "ولي أمر", Icon: Users, grad: "from-primary to-amber-brand" },
  instructor: { label: "مدرس", Icon: UserCheck, grad: "from-teal-dark to-brand-coral" },
};

const ROLE_FILTERS = [
  { id: "all", label: "الكل" },
  { id: "student", label: "الطلبة" },
  { id: "guardian", label: "أولياء الأمور" },
  { id: "instructor", label: "المدرسين" },
];

// كروت الـ Instances (الكل + الرئيسي + التقييم + القديمة)
const INSTANCE_TABS = [
  { id: "all", label: "الكل", Icon: Layers, grad: "from-primary to-orange-deep" },
  { id: "main", label: INSTANCE_META.main.label, Icon: Smartphone, grad: INSTANCE_META.main.grad },
  { id: "eval", label: INSTANCE_META.eval.label, Icon: Smartphone, grad: INSTANCE_META.eval.grad },
  { id: "unknown", label: "قديمة", Icon: Clock, grad: INSTANCE_META.unknown.grad },
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
    <div className="sticky top-1 z-[1] flex justify-center py-2">
      <span className="rounded-lg bg-white/90 px-3 py-1 text-[11.5px] font-medium text-secondary/80 shadow-sm backdrop-blur dark:bg-darklight/90 dark:text-darkmuted">
        {children}
      </span>
    </div>
  );
}

function StatusTicks({ status }) {
  if (status === "failed") return <XCircle className="h-4 w-4 text-rose-500" />;
  if (status === "pending") return <Clock className="h-3.5 w-3.5 text-secondary/50 dark:text-darkmuted" />;
  return <CheckCheck className="h-4 w-4 text-sky-500" />;
}

// دايرة الـ Instance (زي ستوريز الواتس)
function InstanceStory({ tab, count, failed, active, onClick }) {
  const { Icon } = tab;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group/story flex shrink-0 flex-col items-center gap-1.5 transition-transform active:scale-95 ${FOCUS} rounded-2xl`}
    >
      <div className="relative">
        <div
          className={`rounded-full bg-gradient-to-tr p-[3px] transition-all group-hover/story:scale-105 ${tab.grad} ${
            active ? "" : "opacity-50 grayscale-[40%]"
          }`}
        >
          <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full border-[3px] border-white bg-white dark:border-darkmode dark:bg-darkmode md:h-16 md:w-16">
            <span className="text-xl font-extrabold tabular-nums text-brand-deep dark:text-white">
              {count ?? "—"}
            </span>
          </div>
        </div>
        <span
          className={`absolute -bottom-0.5 -end-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br text-white shadow ring-2 ring-PaleSkyBlu dark:ring-darklight ${tab.grad}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        {failed > 0 && (
          <span className="absolute -top-1 -start-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-PaleSkyBlu dark:ring-darklight">
            {failed}
          </span>
        )}
      </div>
      <span
        className={`max-w-[76px] truncate text-xs ${
          active ? "font-bold text-brand-deep dark:text-white" : "font-medium text-secondary/70 dark:text-darkmuted"
        }`}
      >
        {tab.label}
      </span>
    </button>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition active:scale-95 ${FOCUS} ${
        active
          ? "bg-primary/15 text-orange-deep ring-1 ring-inset ring-primary/40 dark:bg-primary/20 dark:text-amber-brand"
          : "bg-white text-secondary/80 hover:bg-PaleCyan dark:bg-dark_input dark:text-darkmuted dark:hover:bg-darkhover"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Row (شكل ليستة الشات) + فقاعة الرسالة عند الفتح ─────────────────────────────

function LogRow({ m, expanded, onToggle }) {
  const role = ROLE_META[m.role] || ROLE_META.student;
  const inst = INSTANCE_META[m.instance] || INSTANCE_META.unknown;
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
    <li className={`transition-colors ${expanded ? "bg-white dark:bg-white/[0.04]" : "hover:bg-[#f5f6f6] dark:hover:bg-white/[0.04]"}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`flex w-full items-start gap-3 px-4 py-3 text-start ${FOCUS}`}
      >
        {/* avatar + instance ring */}
        <div className="relative shrink-0">
          <div className={`rounded-full bg-gradient-to-tr p-[2.5px] ${inst.grad}`}>
            <div className="rounded-full bg-white p-[2px] dark:bg-darkmode">
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-inner ${role.grad}`}
              >
                <RoleIcon className="h-5 w-5" />
              </span>
            </div>
          </div>
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
            <p
              className={`min-w-0 flex-1 text-sm text-secondary/70 dark:text-darkmuted ${
                expanded ? "hidden" : "truncate"
              }`}
            >
              {m.content || "—"}
            </p>
            {expanded && (
              <p className="min-w-0 flex-1 truncate text-sm text-secondary/70 dark:text-darkmuted">
                {typeLabel(m.type)}
              </p>
            )}
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-secondary/40 transition-transform dark:text-darkmuted ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${inst.soft}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
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
                <AlertTriangle className="h-3 w-3" /> فشلت
              </span>
            )}
          </div>
        </div>
      </button>

      {/* الفقاعة */}
      {expanded && (
        <div className="px-4 pb-4 ps-[76px]">
          <div
            className={`relative ms-auto max-w-full rounded-2xl rounded-tl-none px-3.5 pb-1.5 pt-2.5 shadow-[0_1px_0.5px_rgba(0,42,51,0.15)] ${
              failed
                ? "bg-rose-50 ring-1 ring-rose-300 dark:bg-rose-950/40 dark:ring-rose-500/40"
                : "bg-PaleCyan dark:bg-teal-brand"
            }`}
          >
            <span
              className={`absolute top-0 -left-[7px] h-3 w-2 ${
                failed ? "bg-rose-50 dark:bg-rose-950/40" : "bg-PaleCyan dark:bg-teal-brand"
              }`}
              style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
            />

            <p
              dir={isRtl ? "rtl" : "ltr"}
              className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-brand-deep dark:text-white"
            >
              {m.content || "—"}
            </p>

            {failed && m.error && (
              <p dir="ltr" className="mt-2 rounded-lg bg-rose-500/10 px-2 py-1 text-[11px] text-rose-700 dark:text-rose-300">
                {m.error}
              </p>
            )}

            <div className="mt-1 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={copy}
                title="نسخ"
                className={`rounded-full p-1.5 text-secondary/70 hover:bg-secondary/10 dark:text-darkmuted dark:hover:bg-white/10 ${FOCUS}`}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-center gap-1.5 text-[11px] text-secondary/60 dark:text-darkmuted">
                {m.number && (
                  <span dir="ltr" className="tabular-nums">
                    {m.number}
                  </span>
                )}
                <span className="rounded bg-secondary/10 px-1 font-semibold dark:bg-white/10">{langChip(m.language)}</span>
                <span className="tabular-nums">{fmtTime(m.sentAt)}</span>
                <StatusTicks status={m.status} />
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
  const visibleTabs = INSTANCE_TABS.filter((t) => t.id !== "unknown" || (counts?.unknown?.total || 0) > 0 || filter === "unknown");

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
    <div className="overflow-hidden rounded-2xl border border-PowderBlueBorder bg-white shadow-[0_6px_24px_rgba(11,20,26,0.08)] dark:border-dark_border dark:bg-darkmode">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 border-b-2 border-primary bg-secondary px-4 py-3 text-white dark:bg-darklight">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
          <Smartphone className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold leading-tight">سجل الرسائل حسب الرقم</h3>
          <p className="truncate text-xs text-white/75">
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
          <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ── Instance stories ── */}
      <div className="bg-PaleSkyBlu px-4 py-3 dark:bg-darklight">
        <div className="flex items-start justify-center gap-5 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-8">
          {visibleTabs.map((tab) => (
            <InstanceStory
              key={tab.id}
              tab={tab}
              count={countFor(tab.id)}
              failed={failedFor(tab.id)}
              active={filter === tab.id}
              onClick={() => setFilter(tab.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Search + role chips ── */}
      <div className="space-y-2.5 border-b border-PowderBlueBorder/70 px-3 py-3 dark:border-dark_border md:px-4">
        <div className="relative">
          <Search className="pointer-events-none absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary/40 dark:text-darkmuted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو نص الرسالة…"
            className="w-full rounded-xl border border-transparent bg-[#f0f2f5] py-2.5 pe-10 ps-9 text-sm text-brand-deep outline-none transition placeholder:text-secondary/40 focus:border-primary/40 focus:bg-white focus:ring-2 focus:ring-primary/20 dark:bg-dark_input dark:text-white dark:placeholder:text-darkmuted"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className={`absolute start-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-secondary/50 hover:bg-black/5 dark:hover:bg-white/10 ${FOCUS}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ROLE_FILTERS.map((r) => (
            <FilterChip key={r.id} active={roleFilter === r.id} onClick={() => setRoleFilter(r.id)}>
              {r.label}
            </FilterChip>
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
              <AlertTriangle className="h-7 w-7 text-rose-500" />
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
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-secondary/70 dark:text-darkmuted">جاري تحميل السجل…</p>
          </div>
        ) : timeline.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
            <span className="flex h-24 w-24 items-center justify-center rounded-full bg-white/80 shadow-sm dark:bg-white/5">
              {search || roleFilter !== "all" ? (
                <Inbox className="h-10 w-10 text-primary/60" />
              ) : (
                <MessageSquare className="h-10 w-10 text-primary/60" />
              )}
            </span>
            <p className="rounded-lg bg-white/80 px-4 py-1.5 text-sm text-secondary/80 shadow-sm dark:bg-darklight dark:text-darkmuted">
              مفيش رسائل في الفلتر ده
            </p>
            {filter !== "all" && (
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
          <ul className="divide-y divide-gray-100 bg-white/60 dark:divide-dark_border dark:bg-transparent">
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
        <p className="border-t border-PowderBlueBorder/70 bg-[#f0f2f5]/70 px-4 py-2.5 text-center text-[11px] text-secondary/60 dark:border-dark_border dark:bg-darklight/60 dark:text-darkmuted">
          الرسائل "القديمة" اتبعتت قبل ما النظام يبدأ يسجّل الرقم اللي بعت.
        </p>
      )}
    </div>
  );
}