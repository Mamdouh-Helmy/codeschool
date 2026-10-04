"use client";
// src/app/admin/payroll/page.jsx

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import {
  Coins, RefreshCw, Loader2, Clock, Bus, Users, Globe, MapPin,
  CheckCircle2, BadgeCheck, XCircle, Wallet, ChevronLeft, ChevronRight,
  Calendar, ListFilter, AlertTriangle, RotateCcw, ArrowLeft,
} from "lucide-react";

// ─── Formatters ───────────────────────────────────────────────────────────────
const num = (n) =>
  Number(n || 0).toLocaleString("ar-EG", { maximumFractionDigits: 2 });
const EGP = (n) => `${num(n)} ج.م`;

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("ar-EG", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

const fmtDuration = (mins) => {
  const h = Math.floor((mins || 0) / 60);
  const m = (mins || 0) % 60;
  if (!h) return `${m} د`;
  return m ? `${h} س ${m} د` : `${h} س`;
};

// Local-time yyyy-mm-dd (toISOString() is UTC and shifts the day in Cairo)
const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const firstDayOfMonth = () => {
  const n = new Date();
  return ymd(new Date(n.getFullYear(), n.getMonth(), 1));
};
const today = () => ymd(new Date());

const defaultFilters = () => ({
  instructorId: "",
  status: "",
  deliveryMode: "",
  sourceType: "",
  from: firstDayOfMonth(),
  to: today(),
  page: 1,
  limit: 50,
});

const PRESETS = [
  {
    id: "month",
    label: "الشهر ده",
    range: () => [firstDayOfMonth(), today()],
  },
  {
    id: "last",
    label: "الشهر اللي فات",
    range: () => {
      const n = new Date();
      return [
        ymd(new Date(n.getFullYear(), n.getMonth() - 1, 1)),
        ymd(new Date(n.getFullYear(), n.getMonth(), 0)),
      ];
    },
  },
  {
    id: "7d",
    label: "آخر ٧ أيام",
    range: () => {
      const s = new Date();
      s.setDate(s.getDate() - 6);
      return [ymd(s), today()];
    },
  },
];

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  pending: {
    label: "قيد المراجعة",
    pill: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  approved: {
    label: "معتمد",
    pill: "bg-secondary/10 text-secondary dark:bg-cyan-400/10 dark:text-cyan-300",
    dot: "bg-secondary dark:bg-cyan-300",
  },
  paid: {
    label: "مدفوع",
    pill: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  cancelled: {
    label: "ملغي",
    pill: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    dot: "bg-rose-500",
  },
};

const STATUS_TABS = [
  { value: "", label: "الكل" },
  { value: "pending", label: "قيد المراجعة" },
  { value: "approved", label: "معتمد" },
  { value: "paid", label: "مدفوع" },
  { value: "cancelled", label: "ملغي" },
];

const VIEW_TABS = [
  { value: "summary", label: "حسب المدرس", icon: Users },
  { value: "entries", label: "تفاصيل الجلسات", icon: ListFilter },
];

const DONE_TOAST = {
  approved: "تم اعتماد السطر",
  paid: "تم تسجيل الدفع",
  cancelled: "تم إلغاء السطر",
};

const INPUT =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-dark_border dark:bg-dark_input dark:text-white [color-scheme:light] dark:[color-scheme:dark]";

const SUMMARY_GRID =
  "lg:grid lg:grid-cols-[minmax(0,1.5fr)_110px_120px_120px_130px_auto] lg:items-center lg:gap-5";
const ENTRY_GRID =
  "lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center lg:gap-5";

// ─── Small pieces ─────────────────────────────────────────────────────────────
function Money({ value, className = "" }) {
  return (
    <span className={`tabular-nums ${className}`}>
      {num(value)}
      <span className="ms-1 text-[0.65em] font-medium opacity-70">ج.م</span>
    </span>
  );
}

function Segmented({ value, onChange, options, label }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-darklight"
    >
      {options.map((o) => {
        const active = value === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value || "all"}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              active
                ? "bg-white text-secondary shadow-sm dark:bg-dark_input dark:text-primary"
                : "text-slate-500 hover:text-slate-800 dark:text-darkmuted dark:hover:text-white"
            }`}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function StatusPill({ status }) {
  const s = STATUS_CFG[status] || STATUS_CFG.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function DeliveryChip({ mode }) {
  const offline = mode === "offline";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        offline ? "text-amber-600 dark:text-amber-400" : "text-secondary dark:text-cyan-300"
      }`}
    >
      {offline ? <MapPin className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
      {offline ? "حضوري" : "أونلاين"}
    </span>
  );
}

const ACTION_STYLES = {
  teal: "bg-secondary text-white hover:bg-teal-dark dark:bg-cyan-700 dark:hover:bg-cyan-600",
  orange: "bg-primary text-white hover:bg-accent-hover",
  outline:
    "border border-slate-200 text-slate-700 hover:border-primary/50 hover:text-primary dark:border-dark_border dark:text-white",
  danger:
    "text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-darkmuted dark:hover:bg-rose-500/10",
};

function ActionBtn({ onClick, icon: Icon, label, variant, loading, iconOnly }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title={iconOnly ? label : undefined}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-lg text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 ${
        iconOnly ? "p-2" : "px-3 py-2"
      } ${ACTION_STYLES[variant]}`}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}
      {!iconOnly && label}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-darkmuted">
        {label}
      </label>
      {children}
    </div>
  );
}

function Avatar({ name }) {
  return (
    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-sm font-bold text-secondary dark:bg-cyan-400/10 dark:text-cyan-300">
      {(name?.[0] || "؟").toUpperCase()}
    </span>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────
function SummaryCard({ totals, from, to }) {
  const total = Number(totals.totalAmount || 0);
  const sessionPct =
    total > 0
      ? Math.min(100, Math.max(0, (Number(totals.totalSessionAmount || 0) / total) * 100))
      : 0;

  const metrics = [
    { label: "أجر الجلسات", value: <Money value={totals.totalSessionAmount} />, icon: Wallet, dot: "bg-secondary dark:bg-cyan-400" },
    { label: "بدل المواصلات", value: <Money value={totals.totalTransportation} />, icon: Bus, dot: "bg-amber-400" },
    { label: "إجمالي الساعات", value: fmtDuration(totals.totalMinutes), icon: Clock },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-dark_border dark:bg-darklight lg:grid lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]">
      <div className="p-5 sm:p-6">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-darkmuted">
          <Coins className="h-4 w-4 text-primary" />
          إجمالي المستحق
        </p>
        <p className="mt-2 text-4xl font-extrabold text-primary">
          <Money value={totals.totalAmount} />
        </p>
        <p className="mt-1 text-xs text-slate-400 dark:text-darksubtle">
          عن الفترة من {fmtDate(from)} إلى {fmtDate(to)} حسب الفلاتر الحالية
        </p>

        {/* composition bar */}
        <div
          className="mt-4 flex h-2 overflow-hidden rounded-full bg-amber-300/80"
          role="img"
          aria-label={`أجر الجلسات ${Math.round(sessionPct)}٪ والمواصلات ${Math.round(100 - sessionPct)}٪`}
        >
          <div
            className="h-full bg-secondary dark:bg-cyan-500"
            style={{ width: `${sessionPct}%` }}
          />
        </div>
      </div>

      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <div
            key={m.label}
            className="border-t border-slate-100 p-5 dark:border-dark_border sm:p-6 lg:border-r lg:border-t-0"
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-darkmuted">
              {m.dot ? (
                <span className={`h-2.5 w-2.5 rounded-full ${m.dot}`} />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              {m.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              {m.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Instructor summary row ───────────────────────────────────────────────────
function InstructorRow({ i, share, onOpen }) {
  const cell = (label, value, strong) => (
    <div className="min-w-0">
      <p className="text-[11px] text-slate-400 dark:text-darksubtle lg:hidden">{label}</p>
      <p
        className={`text-sm tabular-nums ${
          strong ? "font-extrabold text-primary" : "font-semibold text-slate-800 dark:text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );

  return (
    <li
      className={`flex flex-col gap-4 px-4 py-4 transition-colors hover:bg-brand-soft/70 dark:hover:bg-white/[0.03] sm:px-5 ${SUMMARY_GRID}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={i.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
            {i.name || "—"}
          </p>
          <div
            className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-dark_input"
            title={`${Math.round(share)}٪ من إجمالي المدرسين`}
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:contents">
        {cell(
          "الجلسات",
          `${num(i.sessionsCount)}${
            i.interviewsCount ? ` (منها ${num(i.interviewsCount)} مقابلة)` : ""
          } · ${fmtDuration(i.totalMinutes)}`
        )}
        {cell("أجر الجلسات", EGP(i.totalSessionAmount))}
        {cell("المواصلات", EGP(i.totalTransportation))}
        {cell("الإجمالي", EGP(i.totalAmount), true)}
      </div>

      <button
        onClick={() => onOpen(i)}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-primary/50 hover:text-primary dark:border-dark_border dark:text-white"
      >
        عرض الجلسات
        <ArrowLeft className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

// ─── Entry row ────────────────────────────────────────────────────────────────
function EntryRow({ e, busy, onAction }) {
  const offline = e.deliveryMode === "offline";
  const isInterview = e.sourceType === "interview";
  const groupLabel = e.groupId?.name || e.groupName;

  return (
    <li
      className={`flex flex-col gap-4 px-4 py-4 transition-colors hover:bg-brand-soft/70 dark:hover:bg-white/[0.03] sm:px-5 ${ENTRY_GRID}`}
    >
      {/* who / what */}
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={e.instructorId?.name} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
            {e.instructorId?.name || "—"}
          </p>
          <p className="flex items-center gap-1.5 truncate text-xs text-slate-500 dark:text-darkmuted">
            {isInterview && (
              <span className="flex-shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                مقابلة
              </span>
            )}
            <span className="truncate">
              {e.sessionTitle}
              {!isInterview && groupLabel ? ` · ${groupLabel}` : ""}
            </span>
          </p>
          <div className="mt-1">
            <DeliveryChip mode={e.deliveryMode} />
          </div>
        </div>
      </div>

      {/* when */}
      <div className="text-xs text-slate-500 dark:text-darkmuted">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-white">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          {fmtDate(e.sessionDate)}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <bdi dir="ltr">
              {e.actualStartTime} – {e.actualEndTime}
            </bdi>
          </span>
          <span className="font-semibold">{fmtDuration(e.durationMinutes)}</span>
          {e.durationSource === "scheduled" && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] dark:bg-dark_input">
              وقت مجدول
            </span>
          )}
        </p>
      </div>

      {/* how much */}
      <div>
        <p className="text-lg font-extrabold text-primary">
          <Money value={e.totalAmount} />
        </p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-darkmuted">
          {EGP(e.hourlyRateSnapshot)}/س × {fmtDuration(e.durationMinutes)}
          {e.transportationApplied && ` + ${EGP(e.transportationAllowance)} مواصلات`}
        </p>
        {offline && !e.transportationApplied && (
          <p className="mt-1 text-[11px] text-slate-400 dark:text-darksubtle">
            {e.transportationSkipReason === "already_paid_today"
              ? "بدل المواصلات اتصرف في جلسة قبلها اليوم"
              : "مفيش بدل مواصلات محدد"}
          </p>
        )}
      </div>

      {/* status + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 lg:flex-col lg:items-end">
        <StatusPill status={e.status} />
        <div className="flex items-center gap-1.5">
          {e.status === "pending" && (
            <ActionBtn
              loading={busy}
              onClick={() => onAction(e, "approved")}
              icon={BadgeCheck}
              label="اعتماد"
              variant="teal"
            />
          )}
          {["pending", "approved"].includes(e.status) && (
            <ActionBtn
              loading={busy}
              onClick={() => onAction(e, "paid")}
              icon={CheckCircle2}
              label="تم الدفع"
              variant={e.status === "approved" ? "orange" : "outline"}
            />
          )}
          {e.status !== "cancelled" && e.status !== "paid" && (
            <ActionBtn
              loading={busy}
              onClick={() => onAction(e, "cancelled")}
              icon={XCircle}
              label="إلغاء السطر"
              variant="danger"
              iconOnly
            />
          )}
        </div>
      </div>
    </li>
  );
}

function SkeletonRows() {
  return Array.from({ length: 5 }).map((_, i) => (
    <li key={i} className="flex animate-pulse items-center gap-4 px-5 py-5">
      <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-dark_input" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-40 rounded bg-slate-100 dark:bg-dark_input" />
        <div className="h-3 w-24 rounded bg-slate-100 dark:bg-dark_input" />
      </div>
      <div className="h-5 w-24 rounded bg-slate-100 dark:bg-dark_input" />
    </li>
  ));
}

function EmptyState({ filtered, onReset }) {
  return (
    <li className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Users className="h-7 w-7" />
      </span>
      <p className="mt-4 text-base font-bold text-slate-800 dark:text-white">
        {filtered ? "مفيش نتايج بالفلاتر دي" : "مفيش سطور مرتبات في الفترة دي"}
      </p>
      <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-darkmuted">
        {filtered
          ? "جرّب توسّع الفترة أو تشيل فلتر المدرس أو الحالة."
          : "السطور بتظهر هنا أول ما تتسجّل جلسات ومقابلات منتهية للمدرسين."}
      </p>
      {filtered && (
        <button
          onClick={onReset}
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-primary/50 hover:text-primary dark:border-dark_border dark:text-white"
        >
          <RotateCcw className="h-4 w-4" />
          إعادة ضبط الفلاتر
        </button>
      )}
    </li>
  );
}

function ConfirmDialog({ confirm, busy, onCancel, onConfirm }) {
  if (!confirm || typeof document === "undefined") return null;
  const { entry, status } = confirm;
  const isPay = status === "paid";

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="payroll-confirm-title"
      dir="rtl"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:border dark:border-dark_border dark:bg-darklight">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            isPay
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"
              : "bg-rose-50 text-rose-600 dark:bg-rose-500/10"
          }`}
        >
          {isPay ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
        </span>
        <h2
          id="payroll-confirm-title"
          className="mt-4 text-base font-bold text-slate-900 dark:text-white"
        >
          {isPay ? "تأكيد دفع المرتب" : "إلغاء سطر المرتب"}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-darkmuted">
          {isPay
            ? `هتتسجّل ${EGP(entry.totalAmount)} كمدفوعة للمدرس ${entry.instructorId?.name || ""}، ولا يمكن التراجع عن ده.`
            : `السطر بتاع ${entry.instructorId?.name || "المدرس"} بقيمة ${EGP(entry.totalAmount)} هيتشال من المستحق.`}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-dark_border dark:text-white dark:hover:bg-white/5"
          >
            رجوع
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-60 ${
              isPay ? "bg-primary hover:bg-accent-hover" : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPay ? "تأكيد الدفع" : "إلغاء السطر"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PayrollPage() {
  const DEFAULTS = useRef(defaultFilters()).current;

  const [entries, setEntries] = useState([]);
  const [byInstructor, setByInstructor] = useState([]);
  const [totals, setTotals] = useState({
    totalMinutes: 0,
    totalSessionAmount: 0,
    totalTransportation: 0,
    totalAmount: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [view, setView] = useState("summary"); // summary | entries
  const [filters, setFilters] = useState(DEFAULTS);

  // ── قائمة المدرسين للفلتر ──
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/instructor-rates", { credentials: "include" });
        const json = await res.json();
        if (json.success) setInstructors(json.data || []);
      } catch {
        /* best-effort */
      }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });

      const res = await fetch(`/api/payroll?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success) {
        setEntries(json.data || []);
        setByInstructor(json.byInstructor || []);
        setTotals(json.totals || {});
        setPagination(json.pagination || { page: 1, totalPages: 1, total: 0 });
      } else {
        toast.error(json.message || "فشل التحميل");
      }
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (key, value) =>
    setFilters((p) => ({ ...p, [key]: value, page: 1 }));
  const setRange = (from, to) => setFilters((p) => ({ ...p, from, to, page: 1 }));
  const resetFilters = () => setFilters(defaultFilters());

  const updateStatus = async (entryId, status) => {
    setUpdatingId(entryId);
    try {
      const res = await fetch(`/api/payroll/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(DONE_TOAST[status] || "تم التحديث");
        setEntries((prev) =>
          filters.status && filters.status !== status
            ? prev.filter((e) => e._id !== entryId)
            : prev.map((e) => (e._id === entryId ? { ...e, status } : e))
        );
        return true;
      }
      toast.error(json.message || "فشل التحديث");
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setUpdatingId(null);
    }
    return false;
  };

  // approve directly; paid / cancelled ask first
  const handleAction = (entry, status) => {
    if (status === "approved") updateStatus(entry._id, status);
    else setConfirm({ entry, status });
  };

  const runConfirmed = async () => {
    if (!confirm) return;
    const ok = await updateStatus(confirm.entry._id, confirm.status);
    if (ok) setConfirm(null);
  };

  const openInstructor = (i) => {
    setFilters((p) => ({ ...p, instructorId: i.instructorId, page: 1 }));
    setView("entries");
  };

  const hasActiveFilters =
    !!filters.instructorId ||
    !!filters.status ||
    !!filters.deliveryMode ||
    !!filters.sourceType ||
    filters.from !== DEFAULTS.from ||
    filters.to !== DEFAULTS.to;

  const instructorsTotal = useMemo(
    () => byInstructor.reduce((s, i) => s + Number(i.totalAmount || 0), 0),
    [byInstructor]
  );

  const rangeInvalid = filters.from && filters.to && filters.from > filters.to;
  const from = (pagination.page - 1) * filters.limit + 1;
  const to = Math.min(pagination.page * filters.limit, pagination.total);

  return (
    <div className="space-y-5" dir="rtl">
      {/* ═══ Header ═══ */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-secondary dark:text-white">
            كشف مرتبات المدرسين
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-darkmuted">
            الحساب بالدقيقة من سعر الساعة وقت الجلسة أو المقابلة، مضاف له بدل المواصلات.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          aria-label="تحديث"
          title="تحديث"
          className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 dark:border-dark_border dark:bg-darklight dark:text-darkmuted"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ═══ Totals ═══ */}
      <SummaryCard totals={totals} from={filters.from} to={filters.to} />

      {/* ═══ Filters ═══ */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-dark_border dark:bg-darklight sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="المدرس">
            <select
              value={filters.instructorId}
              onChange={(e) => setFilter("instructorId", e.target.value)}
              className={INPUT}
            >
              <option value="">كل المدرسين</option>
              {instructors.map((i) => (
                <option key={i.instructorId} value={i.instructorId}>
                  {i.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="النوع">
            <select
              value={filters.sourceType}
              onChange={(e) => setFilter("sourceType", e.target.value)}
              className={INPUT}
            >
              <option value="">جلسات ومقابلات</option>
              <option value="session">جلسات فقط</option>
              <option value="interview">مقابلات فقط</option>
            </select>
          </Field>

          <Field label="نوع الحضور">
            <select
              value={filters.deliveryMode}
              onChange={(e) => setFilter("deliveryMode", e.target.value)}
              className={INPUT}
            >
              <option value="">أونلاين وحضوري</option>
              <option value="online">أونلاين</option>
              <option value="offline">حضوري</option>
            </select>
          </Field>

          <Field label="من تاريخ">
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilter("from", e.target.value)}
              className={INPUT}
            />
          </Field>

          <Field label="إلى تاريخ">
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilter("to", e.target.value)}
              className={INPUT}
            />
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">الفترة:</span>
          {PRESETS.map((p) => {
            const [f, t] = p.range();
            const active = filters.from === f && filters.to === t;
            return (
              <button
                key={p.id}
                onClick={() => setRange(f, t)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  active
                    ? "border-primary bg-primary text-white"
                    : "border-slate-200 text-slate-600 hover:border-primary/50 hover:text-primary dark:border-dark_border dark:text-darkmuted"
                }`}
              >
                {p.label}
              </button>
            );
          })}
          {rangeInvalid && (
            <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
              تاريخ البداية بعد تاريخ النهاية
            </span>
          )}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="ms-auto inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary dark:text-darkmuted"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              إعادة ضبط
            </button>
          )}
        </div>
      </div>

      {/* ═══ View + status tabs ═══ */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Segmented value={view} onChange={setView} options={VIEW_TABS} label="طريقة العرض" />
        <Segmented
          value={filters.status}
          onChange={(v) => setFilter("status", v)}
          options={STATUS_TABS}
          label="فلترة بالحالة"
        />
      </div>

      {/* ═══ Content ═══ */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-dark_border dark:bg-darklight">
        {view === "summary" && !loading && byInstructor.length > 0 && (
          <div
            className={`hidden border-b border-slate-100 bg-slate-50 px-5 py-2.5 text-xs font-semibold text-slate-500 dark:border-dark_border dark:bg-white/[0.02] dark:text-darkmuted ${SUMMARY_GRID}`}
          >
            <span>المدرس</span>
            <span>الجلسات</span>
            <span>أجر الجلسات</span>
            <span>المواصلات</span>
            <span>الإجمالي</span>
            <span />
          </div>
        )}

        <ul
          className={`divide-y divide-slate-100 transition-opacity dark:divide-dark_border ${
            loading && (view === "summary" ? byInstructor : entries).length > 0
              ? "opacity-60"
              : ""
          }`}
        >
          {loading && (view === "summary" ? byInstructor : entries).length === 0 ? (
            <SkeletonRows />
          ) : view === "summary" ? (
            byInstructor.length === 0 ? (
              <EmptyState filtered={hasActiveFilters} onReset={resetFilters} />
            ) : (
              byInstructor.map((i) => (
                <InstructorRow
                  key={i.instructorId}
                  i={i}
                  share={
                    instructorsTotal > 0
                      ? Math.min(100, (Number(i.totalAmount || 0) / instructorsTotal) * 100)
                      : 0
                  }
                  onOpen={openInstructor}
                />
              ))
            )
          ) : entries.length === 0 ? (
            <EmptyState filtered={hasActiveFilters} onReset={resetFilters} />
          ) : (
            entries.map((e) => (
              <EntryRow
                key={e._id}
                e={e}
                busy={updatingId === e._id}
                onAction={handleAction}
              />
            ))
          )}
        </ul>
      </div>

      {/* ═══ Pagination ═══ */}
      {view === "entries" && pagination.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            disabled={pagination.page <= 1}
            onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-dark_border dark:text-white"
          >
            <ChevronRight className="h-4 w-4" />
            السابق
          </button>
          <span className="text-sm text-slate-500 dark:text-darkmuted">
            {num(from)}–{num(to)} من {num(pagination.total)}
          </span>
          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-dark_border dark:text-white"
          >
            التالي
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      )}

      <ConfirmDialog
        confirm={confirm}
        busy={!!confirm && updatingId === confirm.entry._id}
        onCancel={() => setConfirm(null)}
        onConfirm={runConfirmed}
      />
    </div>
  );
}