"use client";
import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Users, Plus, Edit, Trash2, Search,
  Phone, Calendar, GraduationCap, CheckCircle,
  Eye, RefreshCw, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight,
  AlertCircle, MoreHorizontal, UserPlus, Package,
  Zap, Snowflake, Ban, Award, Hash, User,
  X, ChevronDown, Layers, UserCheck, UserX,
  TrendingUp, Target,
} from "lucide-react";
import Modal from "./Modal";
import StudentForm from "./StudentForm";
import CreditHoursManager from "./CreditHoursManager";
import { useI18n } from "@/i18n/I18nProvider";

// ─── Debounce ──────────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Smart pagination helper ───────────────────────────────────────────────────
function smartPages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

// ─── Badge configs ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  Active:    { dot: "bg-emerald-400", badge: "bg-emerald-900/40 text-emerald-800 ring-1 ring-emerald-700/50 dark:bg-emerald-900/40 dark:text-emerald-400" },
  Suspended: { dot: "bg-amber-brand",  badge: "bg-amber-900/40 text-amber-800 ring-1 ring-amber-700/50 dark:bg-amber-900/40 dark:text-amber-400" },
  Graduated: { dot: "bg-teal-400",    badge: "bg-teal-900/40 text-teal-800 ring-1 ring-teal-700/50 dark:bg-teal-900/40 dark:text-teal-400" },
  Dropped:   { dot: "bg-rose-400",    badge: "bg-rose-900/40 text-rose-800 ring-1 ring-rose-700/50 dark:bg-rose-900/40 dark:text-rose-400" },
};

const LEVEL_CFG = {
  Beginner:     "bg-blue-900/40 text-blue-800 ring-1 ring-blue-700/50 dark:bg-blue-900/40 dark:text-blue-400",
  Intermediate: "bg-violet-900/40 text-violet-400 ring-1 ring-violet-700/50",
  Advanced:     "bg-teal-900/40 text-teal-400 ring-1 ring-teal-700/50",
};

// ─── Credit helper ─────────────────────────────────────────────────────────────
function getCreditInfo(student, t) {
  const cs        = student.creditSystem || {};
  const pkg       = cs.currentPackage;
  const status    = cs.status || "no_package";
  const remaining = pkg?.remainingHours || 0;
  const hasFreeze = (cs.exceptions || []).some(e => e.type === "freeze" && e.status === "active");

  if (hasFreeze)                        return { Icon: Snowflake,   colorClass: "text-sky-500",    bgClass: "bg-sky-50 dark:bg-sky-950/50",       label: t("credit.status.frozen"),     remaining };
  if (remaining <= 5 && remaining > 0)  return { Icon: AlertCircle, colorClass: "text-rose-500",   bgClass: "bg-rose-50 dark:bg-rose-950/50",     label: t("credit.status.low"),        remaining };
  if (status === "active" || remaining > 0) return { Icon: Zap,     colorClass: "text-emerald-500",bgClass: "bg-emerald-50 dark:bg-emerald-950/50",label: t("credit.status.active"),     remaining };
  if (status === "expired")             return { Icon: Ban,          colorClass: "text-rose-500",   bgClass: "bg-rose-50 dark:bg-rose-950/50",     label: t("credit.status.expired"),    remaining };
  if (status === "completed")           return { Icon: Award,        colorClass: "text-violet-500", bgClass: "bg-violet-50 dark:bg-violet-950/50", label: t("credit.status.completed"),  remaining };
  return                                       { Icon: Package,      colorClass: "text-gray-400",   bgClass: "bg-gray-100 dark:bg-gray-800/60",    label: t("credit.status.no_package"), remaining };
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, barColor = "bg-primary", onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col gap-2 p-4 rounded-2xl border text-left w-full overflow-hidden
        transition-all duration-200 group
        ${active
          ? "bg-white dark:bg-darklight border-primary/60 shadow-brand-sm"
          : "bg-white dark:bg-darklight border-gray-200 dark:border-dark_border hover:border-primary/40 dark:hover:border-primary/40"
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div className={`
          w-9 h-9 rounded-xl flex items-center justify-center transition-colors
          ${active
            ? "bg-primary/10"
            : "bg-gray-100 dark:bg-dark_input group-hover:bg-primary/10"
          }
        `}>
          <Icon className={`w-4 h-4 transition-colors ${active ? "text-primary" : "text-gray-500 dark:text-darktext group-hover:text-primary"}`} />
        </div>
        {active && <span className="w-2 h-2 rounded-full bg-primary mt-1 animate-pulse" />}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{value}</p>
        <p className="text-xs text-gray-500 dark:text-darkmuted mt-1 font-medium">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 dark:text-darksubtle mt-0.5">{sub}</p>}
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-[3px] transition-opacity ${barColor} ${active ? "opacity-100" : "opacity-40 group-hover:opacity-70"}`} />
    </button>
  );
}

// ─── Select Filter ─────────────────────────────────────────────────────────────
function SelectFilter({ id, label, value, options, onChange }) {
  const active = !!value;
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`
          appearance-none pl-3 pr-8 py-2 rounded-xl border text-sm font-medium cursor-pointer outline-none transition-all
          ${active
            ? "bg-primary/8 border-primary text-primary dark:bg-primary/10"
            : "bg-gray-50 dark:bg-dark_input border-gray-200 dark:border-dark_border text-gray-500 dark:text-darktext hover:border-primary/40"
          }
        `}
      >
        <option value="">{label}</option>
        {options.map(o => (
          <option key={o.value} value={o.value} className="bg-white dark:bg-darklight text-gray-800 dark:text-gray-200">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${active ? "text-primary" : "text-gray-400 dark:text-darksubtle"}`} />
    </div>
  );
}

// ─── Active Tag ────────────────────────────────────────────────────────────────
function ActiveTag({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/30 dark:border-primary/40">
      {label}
      <button onClick={onRemove} className="hover:opacity-70 ml-0.5 flex-shrink-0">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

// ─── Action Button ─────────────────────────────────────────────────────────────
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

// ─── Pagination Icon Button ────────────────────────────────────────────────────
function PaginationBtn({ onClick, disabled, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-8 h-8 rounded-lg border border-gray-200 dark:border-dark_border flex items-center justify-center text-gray-400 dark:text-darktext hover:bg-gray-100 dark:hover:bg-dark_input hover:text-gray-700 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function StudentAdmin() {
  const { t } = useI18n();

  const [students, setStudents]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent]               = useState(null);
  const [showCreditManager, setShowCreditManager]         = useState(false);
  const [selectedStudentForCredit, setSelectedStudentForCredit] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [refreshKey, setRefreshKey]   = useState(0);
  const [jumpValue, setJumpValue]     = useState("");
  const debouncedSearch = useDebounce(searchInput, 350);

  const [filters, setFilters] = useState({
    status: "", level: "", source: "", creditStatus: "", inGroup: "",
    page: 1, limit: 10,
  });

  const [pagination, setPagination] = useState({
    page: 1, limit: 10, totalStudents: 0, totalPages: 1,
  });
  const [creditStats, setCreditStats] = useState({
    totalWithPackage: 0, totalActive: 0, totalFrozen: 0,
    totalExpired: 0, totalNoPackage: 0, lowBalance: 0,
  });
  const [groupStats, setGroupStats] = useState({ inGroup: 0, notInGroup: 0 });

  // ─── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({
      page:  String(filters.page),
      limit: String(filters.limit),
      ...(debouncedSearch        && { search:      debouncedSearch }),
      ...(filters.status         && { status:       filters.status }),
      ...(filters.level          && { level:        filters.level }),
      ...(filters.source         && { source:       filters.source }),
      ...(filters.creditStatus   && { creditStatus: filters.creditStatus }),
      ...(filters.inGroup !== "" && { inGroup:      filters.inGroup }),
    });

    fetch(`/api/allStudents?${params}`, { cache: "no-store", headers: { "Cache-Control": "no-cache" } })
      .then(r => r.json())
      .then(json => {
        if (cancelled) return;
        if (json.success) {
          setStudents(json.data || []);
          if (json.pagination)  setPagination(json.pagination);
          if (json.creditStats) setCreditStats(json.creditStats);
          if (json.groupStats)  setGroupStats(json.groupStats);
        } else {
          toast.error(json.message || t("students.loadError"));
        }
      })
      .catch(() => { if (!cancelled) toast.error(t("students.loadError")); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [
    filters.page, filters.limit,
    filters.status, filters.level, filters.source,
    filters.creditStatus, filters.inGroup,
    debouncedSearch, refreshKey,
  ]);

  // Reset to page 1 when search changes
  useEffect(() => { setFilters(f => ({ ...f, page: 1 })); }, [debouncedSearch]);

  const setFilter    = (key, value) => setFilters(f => ({ ...f, [key]: value, page: 1 }));
  const loadStudents = () => setRefreshKey(k => k + 1);

  // ─── onSaved ───────────────────────────────────────────────────────────────
  const onSaved = useCallback((isNew = false) => {
    if (isNew) setFilters(f => ({ ...f, page: 1 }));
    setRefreshKey(k => k + 1);
    toast.success(isNew ? t("students.savedSuccess") : t("students.updatedSuccess") || t("students.savedSuccess"));
  }, [t]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingStudent(null);
  }, []);

  // ─── Jump to page handler ──────────────────────────────────────────────────
  const handleJump = () => {
    const v = parseInt(jumpValue);
    if (v >= 1 && v <= pagination.totalPages) {
      setFilters(f => ({ ...f, page: v }));
      setJumpValue("");
    }
  };

  // ─── Active filter chips ───────────────────────────────────────────────────
  const activeFilters = [
    filters.status         && { key: "status",       label: `Status: ${filters.status}` },
    filters.level          && { key: "level",        label: `Level: ${filters.level}` },
    filters.creditStatus   && { key: "creditStatus", label: `Credits: ${filters.creditStatus}` },
    filters.inGroup !== "" && { key: "inGroup",      label: filters.inGroup === "true" ? "In a Group" : "No Group" },
    debouncedSearch        && { key: "search",       label: `"${debouncedSearch}"` },
  ].filter(Boolean);

  const clearAll = () => {
    setSearchInput("");
    setFilters({ status: "", level: "", source: "", creditStatus: "", inGroup: "", page: 1, limit: filters.limit });
  };

  // ─── Row actions ───────────────────────────────────────────────────────────
  const onEdit = (s) => { setEditingStudent(s); setModalOpen(true); };

  const onView = async (id) => {
    try {
      const res  = await fetch(`/api/allStudents/${id}`);
      const json = await res.json();
      if (json.success) { setEditingStudent(json.data); setModalOpen(true); }
    } catch { toast.error(t("students.loadError")); }
  };

  const onDelete = (id, name) => {
    toast((ti) => (
      <div className="w-80 bg-white dark:bg-darklight rounded-2xl shadow-darkmd p-4 border border-gray-200 dark:border-dark_border">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shrink-0">!</div>
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white">{t("common.delete")} {t("common.student")}</p>
            <p className="text-xs text-gray-500 dark:text-darkmuted mt-1">
              {t("students.deleteConfirm")} <strong className="text-gray-900 dark:text-white">{name}</strong>?
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <button
            onClick={() => toast.dismiss(ti.id)}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-dark_border text-gray-500 dark:text-darktext hover:bg-gray-50 dark:hover:bg-dark_input"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={async () => {
              toast.dismiss(ti.id);
              try {
                const res = await fetch(`/api/allStudents/${id}`, { method: "DELETE" });
                if (res.ok) {
                  setStudents(prev => prev.filter(s => (s._id || s.id) !== id));
                  toast.success(t("students.deletedSuccess"));
                } else {
                  const e = await res.json();
                  toast.error(e.message || t("students.deleteFailed"));
                }
              } catch { toast.error(t("students.deleteError")); }
            }}
            className="px-3 py-1.5 text-xs rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium transition-colors"
          >
            {t("common.delete")}
          </button>
        </div>
      </div>
    ), { duration: Infinity, position: "top-center" });
  };

  const formatDate = (d) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return "—"; }
  };

  const activeCount    = students.filter(s => s.enrollmentInfo?.status === "Active").length;
  const graduatedCount = students.filter(s => s.enrollmentInfo?.status === "Graduated").length;

  // ─── Filter options ────────────────────────────────────────────────────────
  const statusOptions = [
    { value: "Active",    label: "Active" },
    { value: "Suspended", label: "Suspended" },
    { value: "Graduated", label: "Graduated" },
    { value: "Dropped",   label: "Dropped" },
  ];
  const levelOptions = [
    { value: "Beginner",     label: "Beginner" },
    { value: "Intermediate", label: "Intermediate" },
    { value: "Advanced",     label: "Advanced" },
  ];
  const creditOptions = [
    { value: "active",     label: "Active" },
    { value: "low",        label: "Low Balance" },
    { value: "frozen",     label: "Frozen" },
    { value: "expired",    label: "Expired" },
    { value: "completed",  label: "Completed" },
    { value: "no_package", label: "No Package" },
  ];
  const groupOptions = [
    { value: "true",  label: "In a Group" },
    { value: "false", label: "No Group" },
  ];

  // ─── Table column headers ──────────────────────────────────────────────────
  const columns = [
    { icon: User,           label: t("students.table.student") },
    { icon: Hash,           label: t("students.table.enrollment") },
    { icon: Target,         label: t("students.table.status") },
    { icon: TrendingUp,     label: t("students.table.level") },
    { icon: Layers,         label: "Group" },
    { icon: Package,        label: t("credit.hours") },
    { icon: Phone,          label: t("students.table.contact") },
    { icon: Calendar,       label: t("students.table.enrolled") },
    { icon: MoreHorizontal, label: t("students.table.actions") },
  ];

  // ─── Pagination helpers ────────────────────────────────────────────────────
  const paginationStart = (pagination.page - 1) * pagination.limit + 1;
  const paginationEnd   = Math.min(pagination.page * pagination.limit, pagination.totalStudents);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-darkmode">
      <div className="w-full px-4 md:px-6 lg:px-8 py-6 space-y-5">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              {t("students.management")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-darkmuted mt-0.5">
              {t("students.managementDescription")}
            </p>
          </div>
          <button
            onClick={() => { setEditingStudent(null); setModalOpen(true); }}
            className="
              flex items-center gap-2 px-5 py-2.5
              bg-primary hover:bg-orange-deep
              text-white rounded-xl font-semibold text-sm
              shadow-brand-sm hover:shadow-brand-md
              transition-all duration-200 hover:-translate-y-0.5 shrink-0
            "
          >
            <UserPlus className="w-4 h-4" />
            {t("students.addNew")}
          </button>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            icon={Users}
            label="Total Students"
            value={pagination.totalStudents}
            barColor="bg-primary"
          />
          <StatCard
            icon={CheckCircle}
            label="Active"
            value={creditStats.totalActive || activeCount}
            barColor="bg-emerald-500"
          />
          <StatCard
            icon={GraduationCap}
            label="Graduated"
            value={graduatedCount}
            barColor="bg-teal-500"
          />
          <StatCard
            icon={Package}
            label="With Package"
            value={creditStats.totalWithPackage}
            sub={`⚠ ${creditStats.lowBalance} low`}
            barColor="bg-amber-brand"
            onClick={() => setFilter("creditStatus", filters.creditStatus === "no_package" ? "" : "no_package")}
            active={filters.creditStatus === "no_package"}
          />
          <StatCard
            icon={UserCheck}
            label="In a Group"
            value={groupStats.inGroup}
            barColor="bg-violet-500"
            onClick={() => setFilter("inGroup", filters.inGroup === "true" ? "" : "true")}
            active={filters.inGroup === "true"}
          />
          <StatCard
            icon={UserX}
            label="No Group"
            value={groupStats.notInGroup}
            barColor="bg-rose-500"
            onClick={() => setFilter("inGroup", filters.inGroup === "false" ? "" : "false")}
            active={filters.inGroup === "false"}
          />
        </div>

        {/* ── Filters bar ── */}
        <div className="bg-white dark:bg-darklight rounded-2xl border border-gray-200 dark:border-dark_border p-3 md:p-4 space-y-3 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">

            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-darksubtle pointer-events-none" />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-darksubtle hover:text-gray-600 dark:hover:text-darktext transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder={t("students.searchPlaceholder")}
                className="
                  w-full pl-9 pr-9 py-2 text-sm rounded-xl
                  border border-gray-200 dark:border-dark_border
                  bg-gray-50 dark:bg-dark_input
                  text-gray-900 dark:text-white
                  placeholder:text-gray-400 dark:placeholder:text-darksubtle
                  focus:ring-2 focus:ring-primary/25 focus:border-primary
                  outline-none transition-all
                "
              />
            </div>

            {/* Select filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <SelectFilter id="f-status"  label="Status"  value={filters.status}       options={statusOptions}  onChange={v => setFilter("status", v)} />
              <SelectFilter id="f-level"   label="Level"   value={filters.level}        options={levelOptions}   onChange={v => setFilter("level", v)} />
              <SelectFilter id="f-credit"  label="Credits" value={filters.creditStatus} options={creditOptions}  onChange={v => setFilter("creditStatus", v)} />
              <SelectFilter id="f-group"   label="Group"   value={filters.inGroup}      options={groupOptions}   onChange={v => setFilter("inGroup", v)} />

              <button
                onClick={loadStudents}
                className="
                  flex items-center gap-1.5 px-3 py-2 rounded-xl
                  border border-gray-200 dark:border-dark_border
                  text-gray-500 dark:text-darktext
                  hover:border-primary/40 hover:text-primary
                  dark:hover:border-primary/40 dark:hover:text-primary
                  text-sm transition-colors
                "
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden md:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Active chips */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center pt-2.5 border-t border-gray-100 dark:border-dark_border">
              <span className="text-xs text-gray-400 dark:text-darksubtle font-medium">Active filters:</span>
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
              <button
                onClick={clearAll}
                className="text-xs text-rose-500 hover:text-rose-600 font-medium underline underline-offset-2 ml-1 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* ── Table ── */}
        <div className="bg-white dark:bg-darklight rounded-2xl border border-gray-200 dark:border-dark_border shadow-sm overflow-hidden">

          {/* Loading bar */}
          {loading && (
            <div className="h-0.5 bg-gray-100 dark:bg-dark_border overflow-hidden">
              <div className="h-full bg-primary w-1/3 animate-pulse" />
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-dark_border bg-gray-50 dark:bg-darkmode">
                  {columns.map(({ icon: Icon, label }) => (
                    <th key={label} className="px-4 py-3 text-left">
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 dark:text-darksubtle uppercase tracking-wider whitespace-nowrap">
                        <Icon className="w-3 h-3" />
                        {label}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50 dark:divide-dark_border/50">
                {students.map((student, idx) => {
                  const credit     = getCreditInfo(student, t);
                  const CreditIcon = credit.Icon;
                  const statusCfg  = STATUS_CFG[student.enrollmentInfo?.status] || { dot: "bg-gray-400", badge: "bg-gray-100 dark:bg-gray-800 text-gray-500" };
                  const levelCls   = LEVEL_CFG[student.academicInfo?.level]     || "bg-gray-100 dark:bg-gray-800 text-gray-500";
                  const inGroup    = student.inGroup;

                  return (
                    <tr
                      key={student._id || idx}
                      className="group hover:bg-gray-50 dark:hover:bg-darkmode/60 transition-colors duration-100"
                    >
                      {/* Student */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-primary/10 dark:bg-primary/15 flex items-center justify-center shrink-0 text-primary font-bold text-sm uppercase">
                            {student.personalInfo?.fullName?.[0] || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate max-w-[150px]">
                              {student.personalInfo?.fullName || "—"}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-darksubtle truncate max-w-[150px]">
                              {student.personalInfo?.email || t("students.table.noEmail")}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Enrollment # */}
                      <td className="px-4 py-3">
                        <code className="text-xs bg-gray-100 dark:bg-dark_input text-gray-500 dark:text-darktext px-2 py-0.5 rounded-md font-mono border border-gray-200 dark:border-dark_border">
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
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 ring-1 ring-violet-200 dark:ring-violet-700/50">
                            <UserCheck className="w-3 h-3" />
                            {student.groupCount > 1 ? `${student.groupCount} groups` : "1 group"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800/60 text-gray-400 dark:text-darksubtle ring-1 ring-gray-200 dark:ring-gray-700/50">
                            <UserX className="w-3 h-3" />
                            No group
                          </span>
                        )}
                      </td>

                      {/* Credit */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg ${credit.bgClass} flex items-center justify-center flex-shrink-0`}>
                            <CreditIcon className={`w-3.5 h-3.5 ${credit.colorClass}`} />
                          </div>
                          <div>
                            <p className={`text-xs font-semibold ${credit.colorClass}`}>{credit.label}</p>
                            {student.creditSystem?.currentPackage && (
                              <p className="text-[10px] text-gray-400 dark:text-darksubtle">{credit.remaining}h left</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                            <Phone className="w-3 h-3 text-gray-400 dark:text-darksubtle shrink-0" />
                            <span className="truncate max-w-[100px]">
                              {student.personalInfo?.phone || t("students.table.noPhone")}
                            </span>
                          </div>
                          {student.personalInfo?.whatsappNumber && (
                            <p className="text-[10px] text-emerald-500 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                              WhatsApp
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-400 dark:text-darksubtle whitespace-nowrap">
                          {formatDate(student.createdAt || student.metadata?.createdAt)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <ActionBtn onClick={() => onView(student._id || student.id)} icon={Eye}     color="text-sky-500"  title={t("common.view")} />
                          <ActionBtn onClick={() => onEdit(student)}                   icon={Edit}    color="text-primary"  title={t("common.edit")} />
                          <ActionBtn
                            onClick={() => { setSelectedStudentForCredit(student); setShowCreditManager(true); }}
                            icon={Package} color="text-amber-500" title={t("credit.manage")}
                          />
                          <ActionBtn
                            onClick={() => onDelete(student._id || student.id, student.personalInfo?.fullName || t("common.student"))}
                            icon={Trash2} color="text-rose-500" title={t("common.delete")}
                          />
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
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {activeFilters.length > 0 ? "No matching students" : t("students.noStudents")}
              </h3>
              <p className="text-sm text-gray-500 dark:text-darkmuted max-w-xs mb-6">
                {activeFilters.length > 0
                  ? "Try adjusting your filters or search term."
                  : t("students.noStudentsDescription")}
              </p>
              {activeFilters.length > 0 ? (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-dark_border text-sm text-gray-500 dark:text-darktext hover:border-primary/40 hover:text-primary transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Clear filters
                </button>
              ) : (
                <button
                  onClick={() => setModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-orange-deep text-white rounded-xl font-semibold text-sm shadow-brand-sm transition-all"
                >
                  <Plus className="w-4 h-4" /> {t("students.createFirstButton")}
                </button>
              )}
            </div>
          )}

          {/* ── Pagination Footer ── */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 border-t border-gray-100 dark:border-dark_border bg-white dark:bg-darklight">

            {/* Info */}
            <p className="text-xs text-gray-500 dark:text-darkmuted whitespace-nowrap">
              {pagination.totalStudents > 0 ? (
                <>
                  Showing{" "}
                  <span className="font-medium text-gray-900 dark:text-white">{paginationStart}</span>
                  {" – "}
                  <span className="font-medium text-gray-900 dark:text-white">{paginationEnd}</span>
                  {" of "}
                  <span className="font-medium text-gray-900 dark:text-white">{pagination.totalStudents}</span>
                  {" students"}
                </>
              ) : (
                "No students found"
              )}
            </p>

            {/* Smart page numbers */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center gap-1">
                {/* First */}
                <PaginationBtn
                  onClick={() => setFilters(f => ({ ...f, page: 1 }))}
                  disabled={pagination.page === 1}
                  icon={ChevronsLeft}
                  label="First page"
                />
                {/* Prev */}
                <PaginationBtn
                  onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                  disabled={pagination.page === 1}
                  icon={ChevronLeft}
                  label="Previous page"
                />

                {/* Page buttons with smart ellipsis */}
                {smartPages(pagination.page, pagination.totalPages).map((p, i) =>
                  p === "..." ? (
                    <span
                      key={`dot-${i}`}
                      className="w-8 h-8 flex items-center justify-center text-xs text-gray-400 dark:text-darksubtle tracking-widest select-none"
                    >
                      ···
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setFilters(f => ({ ...f, page: p }))}
                      className={`
                        w-8 h-8 rounded-lg text-xs font-medium transition-all
                        ${p === pagination.page
                          ? "bg-primary text-white shadow-brand-sm"
                          : "text-gray-500 dark:text-darktext hover:bg-gray-100 dark:hover:bg-dark_input hover:text-gray-900 dark:hover:text-white"
                        }
                      `}
                    >
                      {p}
                    </button>
                  )
                )}

                {/* Next */}
                <PaginationBtn
                  onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                  icon={ChevronRight}
                  label="Next page"
                />
                {/* Last */}
                <PaginationBtn
                  onClick={() => setFilters(f => ({ ...f, page: pagination.totalPages }))}
                  disabled={pagination.page === pagination.totalPages}
                  icon={ChevronsRight}
                  label="Last page"
                />
              </div>
            )}

            {/* Right side controls */}
            <div className="flex items-center gap-3 flex-wrap">

              {/* Divider */}
              <div className="hidden sm:block w-px h-5 bg-gray-200 dark:bg-dark_border" />

              {/* Rows per page */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 dark:text-darksubtle whitespace-nowrap">Rows</span>
                <select
                  value={filters.limit}
                  onChange={e => setFilters(f => ({ ...f, limit: Number(e.target.value), page: 1 }))}
                  className="
                    h-8 pl-2.5 pr-7 text-xs
                    border border-gray-200 dark:border-dark_border rounded-lg
                    bg-white dark:bg-dark_input
                    text-gray-700 dark:text-gray-300
                    focus:ring-2 focus:ring-primary/20 focus:border-primary
                    outline-none cursor-pointer appearance-none
                  "
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 8px center",
                  }}
                >
                  {[10, 25, 50, 100].map(n => (
                    <option key={n} value={n}>{n} / page</option>
                  ))}
                </select>
              </div>

              {/* Jump to page — only when totalPages > 5 */}
              {pagination.totalPages > 5 && (
                <>
                  {/* Divider */}
                  <div className="hidden sm:block w-px h-5 bg-gray-200 dark:bg-dark_border" />

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 dark:text-darksubtle whitespace-nowrap">Go to</span>
                    <input
                      type="number"
                      min={1}
                      max={pagination.totalPages}
                      value={jumpValue}
                      placeholder="1"
                      onChange={e => setJumpValue(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleJump(); }}
                      className="
                        w-14 h-8 px-2 text-xs text-center
                        border border-gray-200 dark:border-dark_border rounded-lg
                        bg-white dark:bg-dark_input
                        text-gray-700 dark:text-gray-300
                        focus:ring-2 focus:ring-primary/20 focus:border-primary
                        outline-none
                      "
                    />
                    <button
                      onClick={handleJump}
                      className="
                        h-8 px-3 text-xs rounded-lg
                        border border-gray-200 dark:border-dark_border
                        text-gray-600 dark:text-darktext
                        bg-gray-50 dark:bg-dark_input
                        hover:border-primary/40 hover:text-primary
                        dark:hover:border-primary/40 dark:hover:text-primary
                        transition-colors whitespace-nowrap
                      "
                    >
                      Go
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal ── */}
      <Modal
        open={modalOpen}
        title={editingStudent ? t("studentForm.updateStudent") : t("studentForm.createStudent")}
        onClose={closeModal}
        size="xl"
      >
        <StudentForm
          initial={editingStudent}
          onClose={closeModal}
          onSaved={(isNew) => {
            closeModal();
            setTimeout(() => onSaved(isNew), 80);
          }}
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
              setRefreshKey(k => k + 1);
            }
          }}
        />
      )}
    </div>
  );
}