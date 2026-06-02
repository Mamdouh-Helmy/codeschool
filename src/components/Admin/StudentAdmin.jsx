"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import {
  Users, Plus, Edit, Trash2, Search, Download,
  Phone, Calendar, GraduationCap, CheckCircle,
  Eye, RefreshCw, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, BookOpen,
  AlertCircle, MoreHorizontal, UserPlus, Package,
  Zap, Snowflake, Ban, Award, Hash, User,
  Filter, X, ChevronDown, Layers, UserCheck, UserX,
  TrendingUp, Target, BarChart2, SlidersHorizontal
} from "lucide-react";
import Modal from "./Modal";
import StudentForm from "./StudentForm";
import CreditHoursManager from "./CreditHoursManager";
import { useI18n } from "@/i18n/I18nProvider";

// ─── Debounce hook ────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Status / Level badge configs ────────────────────────────────────────────
const STATUS_CFG = {
  Active:    { dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800" },
  Suspended: { dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800" },
  Graduated: { dot: "bg-sky-400",     badge: "bg-sky-50 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-800" },
  Dropped:   { dot: "bg-rose-400",    badge: "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-800" },
};

const LEVEL_CFG = {
  Beginner:     "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800",
  Intermediate: "bg-violet-50 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-800",
  Advanced:     "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-800",
};

// ─── Credit status helper ─────────────────────────────────────────────────────
function getCreditInfo(student, t) {
  const cs = student.creditSystem || {};
  const pkg = cs.currentPackage;
  const status = cs.status || "no_package";
  const remaining = pkg?.remainingHours || 0;
  const hasFreeze = (cs.exceptions || []).some(e => e.type === "freeze" && e.status === "active");

  if (hasFreeze)              return { Icon: Snowflake, color: "text-sky-500",    bg: "bg-sky-50 dark:bg-sky-900/30",     label: t("credit.status.frozen"),     remaining };
  if (remaining <= 5 && remaining > 0) return { Icon: AlertCircle, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-900/30",  label: t("credit.status.low"),        remaining };
  if (status === "active" || remaining > 0) return { Icon: Zap,       color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/30", label: t("credit.status.active"), remaining };
  if (status === "expired")   return { Icon: Ban,       color: "text-rose-500",   bg: "bg-rose-50 dark:bg-rose-900/30",   label: t("credit.status.expired"),    remaining };
  if (status === "completed") return { Icon: Award,     color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/30", label: t("credit.status.completed"), remaining };
  return                             { Icon: Package,   color: "text-slate-400",  bg: "bg-slate-50 dark:bg-slate-800",    label: t("credit.status.no_package"), remaining };
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, iconBg, iconColor, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col gap-2 p-4 rounded-2xl border transition-all duration-200 text-left w-full
        ${active
          ? "bg-primary/5 border-primary/40 shadow-md shadow-primary/10"
          : "bg-white dark:bg-darkmode border-PowderBlueBorder dark:border-dark_border hover:border-primary/30 hover:shadow-sm"
        }`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        {active && <span className="w-2 h-2 rounded-full bg-primary mt-1" />}
      </div>
      <div>
        <p className="text-2xl font-bold text-MidnightNavyText dark:text-white leading-none">{value}</p>
        <p className="text-xs text-SlateBlueText dark:text-darktext mt-1 font-medium">{label}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </button>
  );
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────
function FilterChip({ label, value, options, onChange, icon: Icon }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const active = !!value;
  const selected = options.find(o => o.value === value);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all
          ${active
            ? "bg-primary text-white border-primary shadow-sm shadow-primary/30"
            : "bg-white dark:bg-dark_input border-PowderBlueBorder dark:border-dark_border text-SlateBlueText dark:text-darktext hover:border-primary/40"
          }`}
      >
        {Icon && <Icon className="w-3.5 h-3.5" />}
        <span>{active ? selected?.label : label}</span>
        {active
          ? <X className="w-3 h-3 ml-0.5" onClick={(e) => { e.stopPropagation(); onChange(""); }} />
          : <ChevronDown className="w-3 h-3 ml-0.5" />
        }
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-50 min-w-[160px] bg-white dark:bg-darkmode border border-PowderBlueBorder dark:border-dark_border rounded-xl shadow-xl shadow-black/10 overflow-hidden">
          <div className="py-1">
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors
                  ${value === opt.value
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-MidnightNavyText dark:text-white hover:bg-gray-50 dark:hover:bg-dark_input"
                  }`}
              >
                {opt.dot && <span className={`w-2 h-2 rounded-full ${opt.dot}`} />}
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Active filter tags ───────────────────────────────────────────────────────
function ActiveTag({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-primary/70"><X className="w-3 h-3" /></button>
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StudentAdmin() {
  const { t } = useI18n();

  // State
  const [students, setStudents]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent]   = useState(null);
  const [showCreditManager, setShowCreditManager] = useState(false);
  const [selectedStudentForCredit, setSelectedStudentForCredit] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 350);

  const [filters, setFilters] = useState({
    status: "", level: "", source: "", creditStatus: "", inGroup: "",
    page: 1, limit: 10,
  });

  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalStudents: 0, totalPages: 1 });
  const [creditStats, setCreditStats] = useState({ totalWithPackage: 0, totalActive: 0, totalFrozen: 0, totalExpired: 0, totalNoPackage: 0, lowBalance: 0 });
  const [groupStats, setGroupStats]   = useState({ inGroup: 0, notInGroup: 0 });

  // Load
  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page:   filters.page,
        limit:  filters.limit,
        ...(debouncedSearch       && { search:       debouncedSearch }),
        ...(filters.status        && { status:        filters.status }),
        ...(filters.level         && { level:         filters.level }),
        ...(filters.source        && { source:        filters.source }),
        ...(filters.creditStatus  && { creditStatus:  filters.creditStatus }),
        ...(filters.inGroup !== "" && { inGroup:       filters.inGroup }),
      });

      const res  = await fetch(`/api/allStudents?${params}`, { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
      const json = await res.json();

      if (json.success) {
        setStudents(json.data || []);
        if (json.pagination) setPagination(json.pagination);
        if (json.creditStats)  setCreditStats(json.creditStats);
        if (json.groupStats)   setGroupStats(json.groupStats);
      } else {
        toast.error(json.message || t("students.loadError"));
      }
    } catch (err) {
      console.error(err);
      toast.error(t("students.loadError"));
    } finally {
      setLoading(false);
    }
  }, [filters, debouncedSearch, t]);

  // Trigger on filter / search changes
  useEffect(() => { loadStudents(); }, [filters.page, filters.status, filters.level, filters.source, filters.creditStatus, filters.inGroup, debouncedSearch]);

  // When search text changes, reset to page 1
  useEffect(() => { setFilters(f => ({ ...f, page: 1 })); }, [debouncedSearch]);

  const setFilter = (key, value) => setFilters(f => ({ ...f, [key]: value, page: 1 }));

  // Active filters list
  const activeFilters = [
    filters.status       && { key: "status",       label: `Status: ${filters.status}` },
    filters.level        && { key: "level",        label: `Level: ${filters.level}` },
    filters.source       && { key: "source",       label: `Source: ${filters.source}` },
    filters.creditStatus && { key: "creditStatus", label: `Credits: ${filters.creditStatus}` },
    filters.inGroup !== "" && { key: "inGroup",    label: filters.inGroup === "true" ? "In a Group" : "No Group" },
    debouncedSearch      && { key: "search",       label: `"${debouncedSearch}"` },
  ].filter(Boolean);

  const clearAll = () => {
    setSearchInput("");
    setFilters({ status: "", level: "", source: "", creditStatus: "", inGroup: "", page: 1, limit: 10 });
  };

  // Actions
  const onEdit = (s)    => { setEditingStudent(s); setModalOpen(true); };
  const onView = async (id) => {
    try {
      const res  = await fetch(`/api/allStudents/${id}`);
      const json = await res.json();
      if (json.success) { setEditingStudent(json.data); setModalOpen(true); }
    } catch { toast.error(t("students.loadError")); }
  };

  const onDelete = (id, name) => {
    toast((toastInstance) => (
      <div className="w-80 bg-white dark:bg-darkmode rounded-2xl shadow-2xl p-4">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold shrink-0">!</div>
          <div>
            <p className="font-semibold text-sm text-MidnightNavyText dark:text-white">{t("common.delete")} {t("common.student")}</p>
            <p className="text-xs text-slate-500 dark:text-darktext mt-1">
              {t("students.deleteConfirm")} <strong>{name}</strong>?
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={() => toast.dismiss(toastInstance.id)} className="px-3 py-1.5 text-xs rounded-lg border border-PowderBlueBorder dark:border-dark_border text-SlateBlueText dark:text-darktext hover:bg-gray-50 dark:hover:bg-dark_input">
            {t("common.cancel")}
          </button>
          <button onClick={async () => {
            toast.dismiss(toastInstance.id);
            try {
              const res = await fetch(`/api/allStudents/${id}`, { method: "DELETE" });
              if (res.ok) { await loadStudents(); toast.success(t("students.deletedSuccess")); }
              else { const e = await res.json(); toast.error(e.message || t("students.deleteFailed")); }
            } catch { toast.error(t("students.deleteError")); }
          }} className="px-3 py-1.5 text-xs rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium">
            {t("common.delete")}
          </button>
        </div>
      </div>
    ), { duration: Infinity, position: "top-center" });
  };

  const onSaved = async () => { await loadStudents(); toast.success(t("students.savedSuccess")); };

  const formatDate = (d) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return "—"; }
  };

  // Active counts from current page (approximate, server has real totals)
  const activeCount    = students.filter(s => s.enrollmentInfo?.status === "Active").length;
  const graduatedCount = students.filter(s => s.enrollmentInfo?.status === "Graduated").length;

  // ─── Filter option lists ────────────────────────────────────────
  const statusOptions = [
    { value: "",          label: "All Statuses" },
    { value: "Active",    label: "Active",    dot: "bg-emerald-400" },
    { value: "Suspended", label: "Suspended", dot: "bg-amber-400" },
    { value: "Graduated", label: "Graduated", dot: "bg-sky-400" },
    { value: "Dropped",   label: "Dropped",   dot: "bg-rose-400" },
  ];
  const levelOptions = [
    { value: "",             label: "All Levels" },
    { value: "Beginner",     label: "Beginner" },
    { value: "Intermediate", label: "Intermediate" },
    { value: "Advanced",     label: "Advanced" },
  ];
  const creditOptions = [
    { value: "",          label: "All Credits" },
    { value: "active",    label: "Active" },
    { value: "low",       label: "Low Balance" },
    { value: "frozen",    label: "Frozen" },
    { value: "expired",   label: "Expired" },
    { value: "completed", label: "Completed" },
    { value: "no_package",label: "No Package" },
  ];
  const groupOptions = [
    { value: "",      label: "All Students" },
    { value: "true",  label: "In a Group" },
    { value: "false", label: "No Group" },
  ];

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div className="space-y-5 p-1 md:p-0">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-MidnightNavyText dark:text-white tracking-tight">
            {t("students.management")}
          </h1>
          <p className="text-sm text-SlateBlueText dark:text-darktext mt-0.5">
            {t("students.managementDescription")}
          </p>
        </div>
        <button
          onClick={() => { setEditingStudent(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold text-sm shadow-lg shadow-primary/25 transition-all duration-200 hover:shadow-primary/40 hover:-translate-y-0.5 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          {t("students.addNew")}
        </button>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Users}        label="Total Students"  value={pagination.totalStudents}       iconBg="bg-primary/10"          iconColor="text-primary"        />
        <StatCard icon={CheckCircle}  label="Active"          value={creditStats.totalActive || activeCount} iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600 dark:text-emerald-400" />
        <StatCard icon={GraduationCap}label="Graduated"       value={graduatedCount}                 iconBg="bg-sky-100 dark:bg-sky-900/30"     iconColor="text-sky-600 dark:text-sky-400" />
        <StatCard icon={Package}      label="With Package"    value={creditStats.totalWithPackage}   sub={`⚠ ${creditStats.lowBalance} low`}   iconBg="bg-amber-100 dark:bg-amber-900/30"  iconColor="text-amber-600 dark:text-amber-400"
          onClick={() => setFilter("creditStatus", filters.creditStatus === "no_package" ? "" : "no_package")}
          active={filters.inGroup === ""} />
        <StatCard icon={UserCheck}    label="In a Group"      value={groupStats.inGroup}             iconBg="bg-violet-100 dark:bg-violet-900/30" iconColor="text-violet-600 dark:text-violet-400"
          onClick={() => setFilter("inGroup", filters.inGroup === "true" ? "" : "true")}
          active={filters.inGroup === "true"} />
        <StatCard icon={UserX}        label="No Group"        value={groupStats.notInGroup}          iconBg="bg-rose-100 dark:bg-rose-900/30"    iconColor="text-rose-600 dark:text-rose-400"
          onClick={() => setFilter("inGroup", filters.inGroup === "false" ? "" : "false")}
          active={filters.inGroup === "false"} />
      </div>

      {/* ── Filters bar ── */}
      <div className="bg-white dark:bg-darkmode rounded-2xl border border-PowderBlueBorder dark:border-dark_border shadow-sm p-3 md:p-4 space-y-3">
        {/* Search + chips */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            {searchInput && (
              <button onClick={() => setSearchInput("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder={t("students.searchPlaceholder")}
              className="w-full pl-9 pr-9 py-2.5 text-sm  dark:placeholder:text-white rounded-xl border border-PowderBlueBorder dark:border-dark_border bg-transparent dark:bg-dark_input dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
            />
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-2 items-center">
            <FilterChip label="Status"  value={filters.status}       options={statusOptions} onChange={v => setFilter("status",  v)} icon={Target} />
            <FilterChip label="Level"   value={filters.level}        options={levelOptions}  onChange={v => setFilter("level",   v)} icon={TrendingUp} />
            <FilterChip label="Credits" value={filters.creditStatus} options={creditOptions} onChange={v => setFilter("creditStatus", v)} icon={Package} />
            <FilterChip label="Group"   value={filters.inGroup}      options={groupOptions}  onChange={v => setFilter("inGroup", v)} icon={Layers} />

            <button
              onClick={loadStudents}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-PowderBlueBorder dark:border-dark_border text-SlateBlueText dark:text-darktext hover:border-primary/40 hover:text-primary text-sm transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden md:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Active tags row */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center pt-1 border-t border-PowderBlueBorder/50 dark:border-dark_border/50">
            <span className="text-xs text-SlateBlueText dark:text-darktext font-medium">Active filters:</span>
            {activeFilters.map(f => (
              <ActiveTag
                key={f.key}
                label={f.label}
                onRemove={() => {
                  if (f.key === "search") setSearchInput("");
                  else setFilter(f.key, "");
                }}
              />
            ))}
            <button onClick={clearAll} className="text-xs text-rose-500 hover:text-rose-700 font-medium underline underline-offset-2">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-white dark:bg-darkmode rounded-2xl border border-PowderBlueBorder dark:border-dark_border shadow-sm overflow-hidden">
        {/* Loading overlay */}
        {loading && (
          <div className="relative">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-100 dark:bg-dark_border overflow-hidden rounded-t-2xl">
              <div className="h-full bg-primary animate-[shimmer_1.2s_ease-in-out_infinite] w-1/3" style={{ animation: "progress 1s ease-in-out infinite" }} />
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full">
            {/* Head */}
            <thead>
              <tr className="border-b border-PowderBlueBorder dark:border-dark_border bg-slate-50/60 dark:bg-dark_input/40">
                {[
                  { icon: User,          label: t("students.table.student") },
                  { icon: Hash,          label: t("students.table.enrollment") },
                  { icon: Target,        label: t("students.table.status") },
                  { icon: TrendingUp,    label: t("students.table.level") },
                  { icon: Layers,        label: "Group" },
                  { icon: Package,       label: t("credit.hours") },
                  { icon: Phone,         label: t("students.table.contact") },
                  { icon: Calendar,      label: t("students.table.enrolled") },
                  { icon: MoreHorizontal,label: t("students.table.actions") },
                ].map(({ icon: Icon, label }) => (
                  <th key={label} className="px-4 py-3 text-left">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-SlateBlueText dark:text-darktext uppercase tracking-wider whitespace-nowrap">
                      <Icon className="w-3 h-3" />
                      {label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-PowderBlueBorder/60 dark:divide-dark_border/60">
              {students.map((student, idx) => {
                const credit = getCreditInfo(student, t);
                const CreditIcon = credit.Icon;
                const statusCfg  = STATUS_CFG[student.enrollmentInfo?.status] || { dot: "bg-gray-400", badge: "bg-gray-100 text-gray-600" };
                const levelCls   = LEVEL_CFG[student.academicInfo?.level] || "bg-gray-100 text-gray-600";
                const inGroup    = student.inGroup;

                return (
                  <tr
                    key={student._id || idx}
                    className="group hover:bg-slate-50/80 dark:hover:bg-dark_input/40 transition-colors duration-100"
                  >
                    {/* Student */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm uppercase">
                          {student.personalInfo?.fullName?.[0] || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-MidnightNavyText dark:text-white truncate max-w-[150px]">
                            {student.personalInfo?.fullName || "—"}
                          </p>
                          <p className="text-xs text-SlateBlueText dark:text-darktext truncate max-w-[150px]">
                            {student.personalInfo?.email || t("students.table.noEmail")}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Enrollment # */}
                    <td className="px-4 py-3">
                      <code className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-mono">
                        {student.enrollmentNumber || "—"}
                      </code>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusCfg.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {student.enrollmentInfo?.status || "—"}
                      </span>
                    </td>

                    {/* Level */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${levelCls}`}>
                        {student.academicInfo?.level || "—"}
                      </span>
                    </td>

                    {/* Group */}
                    <td className="px-4 py-3">
                      {inGroup ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-800">
                          <UserCheck className="w-3 h-3" />
                          {student.groupCount > 1 ? `${student.groupCount} groups` : "1 group"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700">
                          <UserX className="w-3 h-3" />
                          No group
                        </span>
                      )}
                    </td>

                    {/* Credit */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg ${credit.bg} flex items-center justify-center`}>
                          <CreditIcon className={`w-3.5 h-3.5 ${credit.color}`} />
                        </div>
                        <div>
                          <p className={`text-xs font-semibold ${credit.color}`}>{credit.label}</p>
                          {student.creditSystem?.currentPackage && (
                            <p className="text-[10px] text-SlateBlueText dark:text-darktext">
                              {credit.remaining}h left
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-xs text-MidnightNavyText dark:text-white">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[100px]">
                            {student.personalInfo?.phone || t("students.table.noPhone")}
                          </span>
                        </div>
                        {student.personalInfo?.whatsappNumber && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                            WhatsApp
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-SlateBlueText dark:text-darktext whitespace-nowrap">
                        {formatDate(student.createdAt || student.metadata?.createdAt)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                        <ActionBtn onClick={() => onView(student._id || student.id)} icon={Eye}     color="text-sky-600"   title={t("common.view")} />
                        <ActionBtn onClick={() => onEdit(student)}                   icon={Edit}    color="text-primary"  title={t("common.edit")} />
                        <ActionBtn onClick={() => { setSelectedStudentForCredit(student); setShowCreditManager(true); }}
                          icon={Package} color="text-amber-500" title={t("credit.manage")} />
                        <ActionBtn onClick={() => onDelete(student._id || student.id, student.personalInfo?.fullName || t("common.student"))}
                          icon={Trash2}  color="text-rose-500"  title={t("common.delete")} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {!loading && students.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-2">
              {activeFilters.length > 0 ? "No matching students" : t("students.noStudents")}
            </h3>
            <p className="text-sm text-SlateBlueText dark:text-darktext max-w-xs mb-6">
              {activeFilters.length > 0
                ? "Try adjusting your filters or search term."
                : t("students.noStudentsDescription")}
            </p>
            {activeFilters.length > 0
              ? <button onClick={clearAll} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-PowderBlueBorder dark:border-dark_border text-sm text-SlateBlueText dark:text-darktext hover:border-primary/40 transition">
                  <X className="w-3.5 h-3.5" /> Clear filters
                </button>
              : <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold text-sm shadow-md shadow-primary/20 transition">
                  <Plus className="w-4 h-4" /> {t("students.createFirstButton")}
                </button>
            }
          </div>
        )}

        {/* ── Pagination ── */}
        {pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-PowderBlueBorder dark:border-dark_border bg-slate-50/40 dark:bg-dark_input/20">
            {/* Info */}
            <p className="text-xs text-SlateBlueText dark:text-darktext">
              Showing{" "}
              <span className="font-semibold text-MidnightNavyText dark:text-white">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{" "}–{" "}
              <span className="font-semibold text-MidnightNavyText dark:text-white">
                {Math.min(pagination.page * pagination.limit, pagination.totalStudents)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-MidnightNavyText dark:text-white">{pagination.totalStudents}</span>{" "}
              students
            </p>

            {/* Page controls */}
            <div className="flex items-center gap-1">
              <PaginationBtn onClick={() => setFilter("page", 1)}                             disabled={pagination.page === 1}              icon={ChevronsLeft}  />
              <PaginationBtn onClick={() => setFilter("page", pagination.page - 1)}           disabled={pagination.page === 1}              icon={ChevronLeft}   />

              {/* Page pills */}
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let p;
                if (pagination.totalPages <= 5) p = i + 1;
                else if (pagination.page <= 3)  p = i + 1;
                else if (pagination.page >= pagination.totalPages - 2) p = pagination.totalPages - 4 + i;
                else p = pagination.page - 2 + i;
                return (
                  <button
                    key={p}
                    onClick={() => setFilter("page", p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                      p === pagination.page
                        ? "bg-primary text-white shadow-sm shadow-primary/30"
                        : "text-SlateBlueText dark:text-darktext hover:bg-gray-100 dark:hover:bg-dark_input"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              <PaginationBtn onClick={() => setFilter("page", pagination.page + 1)}           disabled={pagination.page === pagination.totalPages} icon={ChevronRight}  />
              <PaginationBtn onClick={() => setFilter("page", pagination.totalPages)}          disabled={pagination.page === pagination.totalPages} icon={ChevronsRight} />
            </div>

            {/* Per page */}
            <select
              value={filters.limit}
              onChange={e => setFilters(f => ({ ...f, limit: Number(e.target.value), page: 1 }))}
              className="text-xs border border-PowderBlueBorder dark:border-dark_border rounded-lg px-2 py-1.5 bg-white dark:bg-dark_input dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <Modal
        open={modalOpen}
        title={editingStudent ? t("studentForm.updateStudent") : t("studentForm.createStudent")}
        onClose={() => { setModalOpen(false); setEditingStudent(null); }}
        size="xl"
      >
        <StudentForm
          initial={editingStudent}
          onClose={() => { setModalOpen(false); setEditingStudent(null); }}
          onSaved={onSaved}
        />
      </Modal>

      {showCreditManager && selectedStudentForCredit && (
        <CreditHoursManager
          student={selectedStudentForCredit}
          onClose={() => { setShowCreditManager(false); setSelectedStudentForCredit(null); }}
          onUpdate={(updated) => {
            if (updated) {
              setStudents(prev => prev.map(s => s._id === updated._id ? { ...s, ...updated } : s));
              setSelectedStudentForCredit(updated);
            } else {
              loadStudents();
            }
          }}
        />
      )}
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function ActionBtn({ onClick, icon: Icon, color, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark_input transition-colors ${color}`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

function PaginationBtn({ onClick, disabled, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-8 h-8 rounded-lg border border-PowderBlueBorder dark:border-dark_border flex items-center justify-center text-SlateBlueText dark:text-darktext hover:bg-gray-100 dark:hover:bg-dark_input disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}