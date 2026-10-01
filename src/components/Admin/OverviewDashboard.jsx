"use client";
// components/Admin/OverviewDashboard.jsx
// ✅ صفحة نظرة عامة على المدرسين والطلاب وساعاتهم

import React, { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import {
  Users,
  GraduationCap,
  Package,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Snowflake,
  Zap,
  Ban,
  Award,
  Search,
  RefreshCw,
  ChevronDown,
  BookOpen,
  History,
  X,
} from "lucide-react";
import StudentHistoryModal from "./StudentHistoryModal";
import InstructorHistoryModal from "./InstructorHistoryModal";
import {
  formatHM,
  formatDate,
  Avatar,
  ProgressBar,
  StatTile,
  Segmented,
  PACKAGE_LABELS,
  balanceTone,
} from "./OverviewShared";

// ─── Config ───────────────────────────────────────────────────────────────────
const CREDIT = {
  active: {
    icon: Zap,
    label: "نشط",
    pill: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  low: {
    icon: AlertCircle,
    label: "رصيد منخفض",
    pill: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  expired: {
    icon: Ban,
    label: "منتهي",
    pill: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    dot: "bg-rose-500",
  },
  frozen: {
    icon: Snowflake,
    label: "مجمد",
    pill: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  no_package: {
    icon: Package,
    label: "بدون باقة",
    pill: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-darkmuted",
    dot: "bg-slate-400",
  },
  completed: {
    icon: Award,
    label: "مكتمل",
    pill: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
    dot: "bg-violet-500",
  },
};

const STUDENT_FILTERS = ["active", "low", "expired", "frozen", "no_package", "completed"];

const GROUP_STATUS = {
  active: { label: "نشطة", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" },
  completed: { label: "مكتملة", cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300" },
  draft: { label: "مسودة", cls: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-darkmuted" },
};

const ATTENDANCE_DOT = {
  present: "bg-emerald-500",
  absent: "bg-rose-500",
  refund: "bg-sky-500",
};

const INST_GRID =
  "lg:grid lg:grid-cols-[minmax(0,1.3fr)_130px_minmax(0,1.2fr)_minmax(0,1.1fr)_auto] lg:items-center lg:gap-5";
const STU_GRID =
  "lg:grid lg:grid-cols-[minmax(0,1.2fr)_140px_minmax(0,1.3fr)_minmax(0,1fr)_auto] lg:items-center lg:gap-5";

// ─── Small pieces ─────────────────────────────────────────────────────────────
function CreditBadge({ level }) {
  const cfg = CREDIT[level] || CREDIT.no_package;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.pill}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}

function CellLabel({ children }) {
  return (
    <p className="mb-1 text-[11px] font-medium text-slate-400 dark:text-darksubtle lg:hidden">
      {children}
    </p>
  );
}

function HistoryButton({ onClick }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <History className="h-3.5 w-3.5" />
      السجل الكامل
    </button>
  );
}

function ListHeader({ cols, grid }) {
  return (
    <div
      className={`hidden border-b border-slate-100 bg-slate-50 px-5 py-2.5 text-xs font-semibold text-slate-500 dark:border-dark_border dark:bg-white/[0.02] dark:text-darkmuted ${grid}`}
    >
      {cols.map((c, i) => (
        <span key={i}>{c}</span>
      ))}
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-dark_border dark:bg-dark_input dark:text-white"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="مسح البحث"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function EmptyRow({ text }) {
  return (
    <li className="px-6 py-14 text-center text-sm text-slate-400 dark:text-darksubtle">
      {text}
    </li>
  );
}

// ─── Instructor row ───────────────────────────────────────────────────────────
function InstructorRow({ instructor, idx, onOpenHistory }) {
  const [expanded, setExpanded] = useState(false);
  const toggle = () => setExpanded((v) => !v);

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        className={`flex cursor-pointer flex-col gap-4 px-4 py-4 transition-colors hover:bg-brand-soft/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary dark:hover:bg-white/[0.03] sm:px-5 ${INST_GRID}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={instructor.name} idx={idx} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
              {instructor.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-darkmuted">
              {instructor.gender === "female" ? "مدرسة" : "مدرس"} · {instructor.groups.length} مجموعة
            </p>
          </div>
        </div>

        <div>
          <CellLabel>ساعات التدريس</CellLabel>
          <p className="text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">
            {formatHM(instructor.totalMinutes)}
          </p>
          <p className="text-xs text-slate-500 dark:text-darkmuted">
            {instructor.totalSessions} جلسة مكتملة
          </p>
        </div>

        <div className="min-w-0">
          <CellLabel>المجموعات</CellLabel>
          {instructor.groups.length === 0 ? (
            <span className="text-xs text-slate-400">مفيش مجموعات</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {instructor.groups.slice(0, 2).map((g, i) => (
                <span
                  key={i}
                  className="inline-flex max-w-full items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-white/5 dark:text-slate-300"
                >
                  <BookOpen className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{g.groupName}</span>
                </span>
              ))}
              {instructor.groups.length > 2 && (
                <span className="px-1 py-1 text-xs font-semibold text-slate-500 dark:text-darkmuted">
                  +{instructor.groups.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <CellLabel>آخر جلسة</CellLabel>
          {instructor.lastSession ? (
            <>
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                {instructor.lastSession.title}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-darkmuted">
                {formatDate(instructor.lastSession.date)} · {instructor.lastSession.groupName}
              </p>
            </>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </div>

        <div className="flex items-center gap-2 lg:justify-end">
          <HistoryButton onClick={() => onOpenHistory(instructor)} />
          <span
            className="rounded-lg p-2 text-slate-400"
            title={expanded ? "إخفاء المجموعات" : "عرض المجموعات"}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-180 text-primary" : ""}`}
            />
          </span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-4 dark:border-dark_border dark:bg-white/[0.02] sm:px-5">
          <p className="mb-3 text-xs font-bold text-slate-500 dark:text-darkmuted">
            المجموعات اللي بيدرّسها ({instructor.groups.length})
          </p>
          {instructor.groups.length === 0 ? (
            <p className="text-sm text-slate-400">مفيش مجموعات.</p>
          ) : (
            <ul className="space-y-2">
              {instructor.groups.map((g, gi) => {
                const st = GROUP_STATUS[g.groupStatus];
                return (
                  <li
                    key={gi}
                    className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-dark_border dark:bg-darklight"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <BookOpen className="h-4 w-4 flex-shrink-0 text-primary" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                            {g.groupName}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-darkmuted">
                            {g.courseName} · {g.groupCode}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-darkmuted">
                        <span>
                          ساعاته فيها:{" "}
                          <b className="text-sm text-primary">{formatHM(g.hoursInGroupMinutes)}</b>
                        </span>
                        <span>{g.sessionsCount} جلسة مكتملة</span>
                        <span>{g.studentsCount} طالب</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            st?.cls || "bg-slate-100 text-slate-600 dark:bg-white/5"
                          }`}
                        >
                          {st?.label || g.groupStatus}
                        </span>
                      </div>
                    </div>
                    {g.recentSessions?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3 dark:border-dark_border">
                        <span className="text-[11px] text-slate-400">آخر الجلسات:</span>
                        {g.recentSessions.map((sess, si) => (
                          <span
                            key={si}
                            className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-white/5 dark:text-slate-300"
                          >
                            {sess.title} · {formatDate(sess.date)}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

// ─── Student row ──────────────────────────────────────────────────────────────
function usageChange(h) {
  if (h > 0)
    return { text: `خُصم ${Math.abs(h)} س`, cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" };
  if (h < 0)
    return { text: `أُضيف ${Math.abs(h)} س`, cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" };
  return { text: "بدون خصم", cls: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-darkmuted" };
}

function StudentRow({ student, idx, onOpenHistory }) {
  const [expanded, setExpanded] = useState(false);
  const toggle = () => setExpanded((v) => !v);
  const c = student.credit;
  const tone = balanceTone(c.remainingHours);
  const remainingPct =
    c.totalHours > 0
      ? Math.max(0, 100 - Math.round((c.usedHours / c.totalHours) * 100))
      : 0;

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        className={`flex cursor-pointer flex-col gap-4 px-4 py-4 transition-colors hover:bg-brand-soft/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary dark:hover:bg-white/[0.03] sm:px-5 ${STU_GRID}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={student.name} idx={idx} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
              {student.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-darkmuted">
              {student.enrollmentNumber}
            </p>
          </div>
        </div>

        <div>
          <CellLabel>الحالة</CellLabel>
          <CreditBadge level={c.status} />
          {c.hasActiveFreeze && (
            <p className="mt-1 text-[11px] text-sky-600 dark:text-sky-400">حسابه مجمّد دلوقتي</p>
          )}
        </div>

        <div className="min-w-0">
          <CellLabel>رصيد الساعات</CellLabel>
          <p className="flex items-baseline gap-1.5">
            <span className={`text-xl font-extrabold tabular-nums ${tone.text}`}>
              {c.remainingHours}
            </span>
            <span className="text-xs text-slate-500 dark:text-darkmuted">
              ساعة متبقية من {c.totalHours}
            </span>
          </p>
          <ProgressBar pct={remainingPct} tone={tone.bar} className="mt-1.5 max-w-[220px]" />
          <p className="mt-1 text-[11px] text-slate-400 dark:text-darksubtle">
            استُخدم {c.usedHours} ساعة · حضر {c.totalSessionsAttended} جلسة
          </p>
        </div>

        <div className="min-w-0">
          <CellLabel>الباقة</CellLabel>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">
            {c.packageType ? PACKAGE_LABELS[c.packageType] || c.packageType : "—"}
          </p>
          <p className="text-xs text-slate-500 dark:text-darkmuted">
            ينتهي {formatDate(c.packageEndDate)}
          </p>
        </div>

        <div className="flex items-center gap-2 lg:justify-end">
          <HistoryButton onClick={() => onOpenHistory(student)} />
          <span
            className="rounded-lg p-2 text-slate-400"
            title={expanded ? "إخفاء آخر الاستخدامات" : "عرض آخر الاستخدامات"}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-180 text-primary" : ""}`}
            />
          </span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-4 dark:border-dark_border dark:bg-white/[0.02] sm:px-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-slate-500 dark:text-darkmuted">
              آخر 5 حركات على الساعات
            </p>
            <button
              onClick={() => onOpenHistory(student)}
              className="text-xs font-bold text-primary hover:underline"
            >
              كل السجل
            </button>
          </div>
          {c.recentUsage?.length > 0 ? (
            <ul className="space-y-1.5">
              {c.recentUsage.map((u, ui) => {
                const ch = usageChange(u.hoursDeducted);
                return (
                  <li
                    key={ui}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs dark:border-dark_border dark:bg-darklight"
                  >
                    <span
                      className={`h-2 w-2 flex-shrink-0 rounded-full ${
                        ATTENDANCE_DOT[u.attendanceStatus] || "bg-slate-400"
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate font-semibold text-slate-800 dark:text-white">
                      {u.sessionTitle}
                    </span>
                    <span className="text-slate-500 dark:text-darkmuted">{u.groupName}</span>
                    <span className="text-slate-400">{formatDate(u.date)}</span>
                    <span className={`rounded-full px-2 py-0.5 font-bold ${ch.cls}`}>{ch.text}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">لسه مفيش استخدام للساعات.</p>
          )}
        </div>
      )}
    </li>
  );
}

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-16 w-80 rounded-xl bg-slate-100 dark:bg-darklight" />
      <div className="h-11 w-64 rounded-xl bg-slate-100 dark:bg-darklight" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-darklight" />
        ))}
      </div>
      <div className="h-80 rounded-2xl bg-slate-100 dark:bg-darklight" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OverviewDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [activeTab, setActiveTab] = useState("instructors");
  const [instSearch, setInstSearch] = useState("");
  const [stuSearch, setStuSearch] = useState("");
  const [stuFilter, setStuFilter] = useState("");

  const [historyInstructor, setHistoryInstructor] = useState(null);
  const [historyStudent, setHistoryStudent] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/overview", { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setUpdatedAt(new Date());
      } else {
        toast.error(json.message || "فشل في تحميل البيانات");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطأ في الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredInstructors = useMemo(() => {
    if (!data?.instructors) return [];
    if (!instSearch.trim()) return data.instructors;
    const q = instSearch.toLowerCase();
    return data.instructors.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.groups.some(
          (g) =>
            g.groupName.toLowerCase().includes(q) ||
            g.courseName.toLowerCase().includes(q)
        )
    );
  }, [data, instSearch]);

  const filteredStudents = useMemo(() => {
    if (!data?.students) return [];
    let list = data.students;
    if (stuSearch.trim()) {
      const q = stuSearch.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.enrollmentNumber?.toLowerCase().includes(q)
      );
    }
    if (stuFilter) list = list.filter((s) => s.credit.status === stuFilter);
    return list;
  }, [data, stuSearch, stuFilter]);

  // عدد الطلاب في كل حالة (للأزرار اللي بتفلتر)
  const statusCounts = useMemo(() => {
    const counts = {};
    (data?.students || []).forEach((s) => {
      counts[s.credit.status] = (counts[s.credit.status] || 0) + 1;
    });
    return counts;
  }, [data]);

  if (loading && !data) return <PageSkeleton />;

  if (!data) {
    return (
      <div className="py-24 text-center" dir="rtl">
        <p className="text-slate-500 dark:text-darkmuted">مقدرناش نحمّل البيانات.</p>
        <button
          onClick={loadData}
          className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-accent-hover"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const { stats } = data;

  return (
    <div className="space-y-5" dir="rtl">
      {/* ═══ Header ═══ */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-secondary dark:text-white">
            نظرة عامة
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-darkmuted">
            ساعات تدريس المدرسين، وأرصدة ساعات الطلاب.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {updatedAt && (
            <span className="text-xs text-slate-400 dark:text-darksubtle">
              آخر تحديث{" "}
              {updatedAt.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            aria-label="تحديث"
            title="تحديث"
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 dark:border-dark_border dark:bg-darklight dark:text-darkmuted"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ═══ Main tabs ═══ */}
      <Segmented
        value={activeTab}
        onChange={setActiveTab}
        label="القسم"
        options={[
          { value: "instructors", label: "المدرسون", icon: GraduationCap, count: data.instructors.length },
          { value: "students", label: "الطلاب", icon: Users, count: data.students.length },
        ]}
      />

      <div className={`space-y-5 transition-opacity ${loading ? "opacity-60" : ""}`}>
        {/* ══════════ INSTRUCTORS ══════════ */}
        {activeTab === "instructors" && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatTile
                label="عدد المدرسين"
                value={stats.instructors.total}
                icon={GraduationCap}
                tone="bg-secondary/10 text-secondary dark:bg-cyan-400/10 dark:text-cyan-300"
              />
              <StatTile
                label="جلسات مكتملة"
                value={stats.sessions.totalCompleted}
                sub={`مدتها ${formatHM(stats.sessions.totalMinutes)}`}
                icon={CheckCircle}
                tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
              />
              <StatTile
                label="ساعات تدريس المدرسين"
                value={formatHM(stats.instructors.totalMinutes)}
                sub="مجموع اللي درّسه كل المدرسين"
                icon={Clock}
              />
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-dark_border dark:bg-darklight">
              <div className="border-b border-slate-100 p-3 dark:border-dark_border sm:p-4">
                <SearchBox
                  value={instSearch}
                  onChange={setInstSearch}
                  placeholder="ابحث باسم المدرس أو المجموعة أو الكورس"
                />
              </div>

              <ListHeader
                grid={INST_GRID}
                cols={["المدرس", "ساعات التدريس", "المجموعات", "آخر جلسة", ""]}
              />

              <ul className="divide-y divide-slate-100 dark:divide-dark_border">
                {filteredInstructors.length > 0 ? (
                  filteredInstructors.map((inst, idx) => (
                    <InstructorRow
                      key={inst._id}
                      instructor={inst}
                      idx={idx}
                      onOpenHistory={setHistoryInstructor}
                    />
                  ))
                ) : (
                  <EmptyRow text="مفيش مدرسين مطابقين للبحث" />
                )}
              </ul>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs dark:border-dark_border dark:bg-white/[0.02]">
                <p className="text-slate-500 dark:text-darkmuted">
                  {filteredInstructors.length} مدرس ·{" "}
                  {filteredInstructors.reduce((s, i) => s + i.totalSessions, 0)} جلسة مكتملة
                </p>
                <p className="font-bold text-primary">
                  إجمالي الساعات:{" "}
                  {formatHM(
                    filteredInstructors.reduce((s, i) => s + (i.totalMinutes || 0), 0)
                  )}
                </p>
              </div>
            </div>
          </>
        )}

        {/* ══════════ STUDENTS ══════════ */}
        {activeTab === "students" && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatTile
                label="عدد الطلاب"
                value={stats.students.total}
                sub={`${stats.credit.totalWithPackage} منهم لهم باقة`}
                icon={Users}
              />
              <StatTile
                label="ساعات متبقية عند الطلاب"
                value={stats.credit.totalRemainingHours}
                sub="مجموع الرصيد الحالي"
                icon={Clock}
                tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
              />
              <StatTile
                label="ساعات اتستخدمت"
                value={stats.credit.totalUsedHours}
                sub="من أول الباقات"
                icon={TrendingUp}
                tone="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"
              />
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-dark_border dark:bg-darklight">
              <div className="space-y-3 border-b border-slate-100 p-3 dark:border-dark_border sm:p-4">
                <SearchBox
                  value={stuSearch}
                  onChange={setStuSearch}
                  placeholder="ابحث باسم الطالب أو رقم القيد"
                />

                {/* فلتر الحالة: الأزرار نفسها بتعرض العدد */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setStuFilter("")}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                      stuFilter === ""
                        ? "border-primary bg-primary text-white"
                        : "border-slate-200 text-slate-600 hover:border-primary/50 dark:border-dark_border dark:text-darkmuted"
                    }`}
                  >
                    الكل · {data.students.length}
                  </button>
                  {STUDENT_FILTERS.map((key) => {
                    const count = statusCounts[key] || 0;
                    if (key === "completed" && count === 0) return null;
                    const cfg = CREDIT[key];
                    const active = stuFilter === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setStuFilter(active ? "" : key)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                          active
                            ? "border-primary bg-primary text-white"
                            : "border-slate-200 text-slate-600 hover:border-primary/50 dark:border-dark_border dark:text-darkmuted"
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${active ? "bg-white" : cfg.dot}`} />
                        {cfg.label} · {count}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 dark:text-darksubtle">
                  شريط الرصيد: أخضر = أكتر من 5 ساعات، أصفر = 5 ساعات أو أقل، أحمر = الرصيد خلص.
                </p>
              </div>

              <ListHeader
                grid={STU_GRID}
                cols={["الطالب", "الحالة", "رصيد الساعات", "الباقة", ""]}
              />

              <ul className="divide-y divide-slate-100 dark:divide-dark_border">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((stu, idx) => (
                    <StudentRow
                      key={stu._id}
                      student={stu}
                      idx={idx}
                      onOpenHistory={setHistoryStudent}
                    />
                  ))
                ) : (
                  <EmptyRow text="مفيش طلاب مطابقين للبحث أو الفلتر" />
                )}
              </ul>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs dark:border-dark_border dark:bg-white/[0.02]">
                <p className="text-slate-500 dark:text-darkmuted">
                  {filteredStudents.length} طالب معروض
                </p>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    متبقي: {filteredStudents.reduce((s, st) => s + st.credit.remainingHours, 0)} ساعة
                  </span>
                  <span className="text-slate-500 dark:text-darkmuted">
                    مستخدم: {filteredStudents.reduce((s, st) => s + st.credit.usedHours, 0)} ساعة
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ═══ History modals ═══ */}
      {historyInstructor && (
        <InstructorHistoryModal
          instructorId={historyInstructor._id}
          instructorName={historyInstructor.name}
          onClose={() => setHistoryInstructor(null)}
        />
      )}
      {historyStudent && (
        <StudentHistoryModal
          studentId={historyStudent._id}
          studentName={historyStudent.name}
          onClose={() => setHistoryStudent(null)}
        />
      )}
    </div>
  );
}