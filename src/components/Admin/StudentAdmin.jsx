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

// ─── Debounce ─────────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Badge configs ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  Active:    { dot: "bg-emerald-400", badge: "bg-emerald-950/60 text-emerald-400 ring-1 ring-emerald-800" },
  Suspended: { dot: "bg-amber-400",   badge: "bg-amber-950/60 text-amber-400 ring-1 ring-amber-800" },
  Graduated: { dot: "bg-teal-400",    badge: "bg-teal-950/60 text-teal-400 ring-1 ring-teal-800" },
  Dropped:   { dot: "bg-rose-400",    badge: "bg-rose-950/60 text-rose-400 ring-1 ring-rose-800" },
};

const LEVEL_CFG = {
  Beginner:     "bg-blue-950/60 text-blue-400 ring-1 ring-blue-800",
  Intermediate: "bg-violet-950/60 text-violet-400 ring-1 ring-violet-800",
  Advanced:     "bg-teal-950/60 text-teal-400 ring-1 ring-teal-800",
};

// ─── Credit helper ────────────────────────────────────────────────────────────
function getCreditInfo(student, t) {
  const cs        = student.creditSystem || {};
  const pkg       = cs.currentPackage;
  const status    = cs.status || "no_package";
  const remaining = pkg?.remainingHours || 0;
  const hasFreeze = (cs.exceptions || []).some(e => e.type === "freeze" && e.status === "active");

  if (hasFreeze)                       return { Icon: Snowflake,   color: "text-sky-400",     bg: "bg-sky-950/50",      label: t("credit.status.frozen"),     remaining };
  if (remaining <= 5 && remaining > 0) return { Icon: AlertCircle, color: "text-rose-400",    bg: "bg-rose-950/50",     label: t("credit.status.low"),        remaining };
  if (status === "active" || remaining > 0) return { Icon: Zap,   color: "text-emerald-400",  bg: "bg-emerald-950/50",  label: t("credit.status.active"),     remaining };
  if (status === "expired")            return { Icon: Ban,          color: "text-rose-400",    bg: "bg-rose-950/50",     label: t("credit.status.expired"),    remaining };
  if (status === "completed")          return { Icon: Award,        color: "text-purple-400",  bg: "bg-purple-950/50",   label: t("credit.status.completed"),  remaining };
  return                                      { Icon: Package,      color: "text-slate-400",   bg: "bg-slate-800/60",    label: t("credit.status.no_package"), remaining };
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent = "bg-[#ff6700]", onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col gap-2 p-4 rounded-2xl border text-left w-full overflow-hidden transition-all duration-200
        ${active
          ? "bg-[#1a1f2e] border-[#ff6700]/60 shadow-lg shadow-[#ff6700]/10"
          : "bg-[#1a1f2e] border-[#2a3047] hover:border-[#ff6700]/40"
        }`}
    >
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
          <Icon className="w-4 h-4 text-slate-300" />
        </div>
        {active && <span className="w-2 h-2 rounded-full bg-[#ff6700] mt-1" />}
      </div>
      <div>
        <p className="text-2xl font-bold text-white leading-none">{value}</p>
        <p className="text-xs text-slate-400 mt-1 font-medium">{label}</p>
        {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-[3px] ${accent}`} />
    </button>
  );
}

// ─── Select Filter ────────────────────────────────────────────────────────────
function SelectFilter({ id, label, value, options, onChange }) {
  const active = !!value;
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`appearance-none pl-3 pr-8 py-2 rounded-xl border text-sm font-medium cursor-pointer outline-none transition-all
          ${active
            ? "bg-[#ff6700]/10 border-[#ff6700] text-[#ff6700]"
            : "bg-[#151929] border-[#2a3047] text-slate-400 hover:border-[#ff6700]/40"
          }`}
      >
        <option value="">{label}</option>
        {options.map(o => (
          <option key={o.value} value={o.value} className="bg-[#1a1f2e] text-slate-200">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${active ? "text-[#ff6700]" : "text-slate-500"}`} />
    </div>
  );
}

// ─── Active Tag ───────────────────────────────────────────────────────────────
function ActiveTag({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ff6700]/15 text-[#ff6700] text-xs font-medium border border-[#ff6700]/40">
      {label}
      <button onClick={onRemove} className="hover:opacity-70 ml-0.5">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

// ─── Action Button ────────────────────────────────────────────────────────────
function ActionBtn({ onClick, icon: Icon, color, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg hover:bg-[#252b3d] transition-colors ${color}`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

// ─── Pagination Button ────────────────────────────────────────────────────────
function PaginationBtn({ onClick, disabled, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-8 h-8 rounded-lg border border-[#2a3047] flex items-center justify-center text-slate-400 hover:bg-[#1e2638] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StudentAdmin() {
  const { t } = useI18n();

  const [students, setStudents]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent]               = useState(null);
  const [showCreditManager, setShowCreditManager]         = useState(false);
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

  // ─── Load ─────────────────────────────────────────────────────────────────
  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page:  String(filters.page),
        limit: String(filters.limit),
        ...(debouncedSearch        && { search:       debouncedSearch }),
        ...(filters.status         && { status:        filters.status }),
        ...(filters.level          && { level:         filters.level }),
        ...(filters.source         && { source:        filters.source }),
        ...(filters.creditStatus   && { creditStatus:  filters.creditStatus }),
        ...(filters.inGroup !== "" && { inGroup:        filters.inGroup }),
      });

      const res  = await fetch(`/api/allStudents?${params}`, { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
      const json = await res.json();

      if (json.success) {
        setStudents(json.data || []);
        if (json.pagination)  setPagination(json.pagination);
        if (json.creditStats) setCreditStats(json.creditStats);
        if (json.groupStats)  setGroupStats(json.groupStats);
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

  useEffect(() => {
    loadStudents();
  }, [filters.page, filters.status, filters.level, filters.source, filters.creditStatus, filters.inGroup, debouncedSearch]);

  useEffect(() => { setFilters(f => ({ ...f, page: 1 })); }, [debouncedSearch]);

  const setFilter = (key, value) => setFilters(f => ({ ...f, [key]: value, page: 1 }));

  // ─── Active filter chips ──────────────────────────────────────────────────
  const activeFilters = [
    filters.status         && { key: "status",       label: `Status: ${filters.status}` },
    filters.level          && { key: "level",        label: `Level: ${filters.level}` },
    filters.creditStatus   && { key: "creditStatus", label: `Credits: ${filters.creditStatus}` },
    filters.inGroup !== "" && { key: "inGroup",      label: filters.inGroup === "true" ? "In a Group" : "No Group" },
    debouncedSearch        && { key: "search",       label: `"${debouncedSearch}"` },
  ].filter(Boolean);

  const clearAll = () => {
    setSearchInput("");
    setFilters({ status: "", level: "", source: "", creditStatus: "", inGroup: "", page: 1, limit: 10 });
  };

  // ─── Row actions ──────────────────────────────────────────────────────────
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
      <div className="w-80 bg-[#1a1f2e] rounded-2xl shadow-2xl p-4 border border-[#2a3047]">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-950 text-rose-400 flex items-center justify-center font-bold shrink-0">!</div>
          <div>
            <p className="font-semibold text-sm text-white">{t("common.delete")} {t("common.student")}</p>
            <p className="text-xs text-slate-400 mt-1">{t("students.deleteConfirm")} <strong className="text-white">{name}</strong>?</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <button
            onClick={() => toast.dismiss(ti.id)}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#2a3047] text-slate-400 hover:bg-white/5"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={async () => {
              toast.dismiss(ti.id);
              try {
                const res = await fetch(`/api/allStudents/${id}`, { method: "DELETE" });
                if (res.ok) { await loadStudents(); toast.success(t("students.deletedSuccess")); }
                else { const e = await res.json(); toast.error(e.message || t("students.deleteFailed")); }
              } catch { toast.error(t("students.deleteError")); }
            }}
            className="px-3 py-1.5 text-xs rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium"
          >
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

  const activeCount    = students.filter(s => s.enrollmentInfo?.status === "Active").length;
  const graduatedCount = students.filter(s => s.enrollmentInfo?.status === "Graduated").length;

  // ─── Filter options ───────────────────────────────────────────────────────
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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0f1117] p-4 md:p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {t("students.management")}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {t("students.managementDescription")}
          </p>
        </div>
        <button
          onClick={() => { setEditingStudent(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#ff6700] hover:bg-[#ff6700]/90 text-white rounded-xl font-semibold text-sm shadow-lg shadow-[#ff6700]/25 transition-all duration-200 hover:-translate-y-0.5 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          {t("students.addNew")}
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Users}         label="Total Students" value={pagination.totalStudents}                   accent="bg-[#ff6700]" />
        <StatCard icon={CheckCircle}   label="Active"         value={creditStats.totalActive || activeCount}     accent="bg-emerald-500" />
        <StatCard icon={GraduationCap} label="Graduated"      value={graduatedCount}                             accent="bg-teal-500" />
        <StatCard
          icon={Package} label="With Package" value={creditStats.totalWithPackage}
          sub={`⚠ ${creditStats.lowBalance} low`} accent="bg-amber-500"
          onClick={() => setFilter("creditStatus", filters.creditStatus === "no_package" ? "" : "no_package")}
          active={filters.creditStatus === "no_package"}
        />
        <StatCard
          icon={UserCheck} label="In a Group" value={groupStats.inGroup} accent="bg-violet-500"
          onClick={() => setFilter("inGroup", filters.inGroup === "true" ? "" : "true")}
          active={filters.inGroup === "true"}
        />
        <StatCard
          icon={UserX} label="No Group" value={groupStats.notInGroup} accent="bg-rose-500"
          onClick={() => setFilter("inGroup", filters.inGroup === "false" ? "" : "false")}
          active={filters.inGroup === "false"}
        />
      </div>

      {/* ── Filters bar ── */}
      <div className="bg-[#1a1f2e] rounded-2xl border border-[#2a3047] p-3 md:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            {searchInput && (
              <button onClick={() => setSearchInput("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder={t("students.searchPlaceholder")}
              className="w-full pl-9 pr-9 py-2 text-sm rounded-xl border border-[#2a3047] bg-[#151929] text-white placeholder:text-slate-500 focus:ring-2 focus:ring-[#ff6700]/30 focus:border-[#ff6700] outline-none transition-all"
            />
          </div>

          {/* Select filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <SelectFilter
              id="f-status"
              label="Status"
              value={filters.status}
              options={statusOptions}
              onChange={v => setFilter("status", v)}
            />
            <SelectFilter
              id="f-level"
              label="Level"
              value={filters.level}
              options={levelOptions}
              onChange={v => setFilter("level", v)}
            />
            <SelectFilter
              id="f-credit"
              label="Credits"
              value={filters.creditStatus}
              options={creditOptions}
              onChange={v => setFilter("creditStatus", v)}
            />
            <SelectFilter
              id="f-group"
              label="Group"
              value={filters.inGroup}
              options={groupOptions}
              onChange={v => setFilter("inGroup", v)}
            />

            <button
              onClick={loadStudents}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#2a3047] text-slate-400 hover:border-[#ff6700]/40 hover:text-[#ff6700] text-sm transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden md:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Active tags */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-[#2a3047]">
            <span className="text-xs text-slate-500 font-medium">Active filters:</span>
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
            <button onClick={clearAll} className="text-xs text-rose-400 hover:text-rose-300 font-medium underline underline-offset-2 ml-1">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-[#1a1f2e] rounded-2xl border border-[#2a3047] overflow-hidden">

        {/* Loading bar */}
        {loading && (
          <div className="h-0.5 bg-[#2a3047] overflow-hidden">
            <div className="h-full bg-[#ff6700] w-1/3 animate-pulse" />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-[#2a3047] bg-[#151929]">
                {[
                  { icon: User,           label: t("students.table.student") },
                  { icon: Hash,           label: t("students.table.enrollment") },
                  { icon: Target,         label: t("students.table.status") },
                  { icon: TrendingUp,     label: t("students.table.level") },
                  { icon: Layers,         label: "Group" },
                  { icon: Package,        label: t("credit.hours") },
                  { icon: Phone,          label: t("students.table.contact") },
                  { icon: Calendar,       label: t("students.table.enrolled") },
                  { icon: MoreHorizontal, label: t("students.table.actions") },
                ].map(({ icon: Icon, label }) => (
                  <th key={label} className="px-4 py-3 text-left">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      <Icon className="w-3 h-3" />
                      {label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#1e2638]">
              {students.map((student, idx) => {
                const credit     = getCreditInfo(student, t);
                const CreditIcon = credit.Icon;
                const statusCfg  = STATUS_CFG[student.enrollmentInfo?.status] || { dot: "bg-slate-500", badge: "bg-slate-800 text-slate-400" };
                const levelCls   = LEVEL_CFG[student.academicInfo?.level] || "bg-slate-800 text-slate-400";
                const inGroup    = student.inGroup;

                return (
                  <tr key={student._id || idx} className="group hover:bg-[#1e2638] transition-colors duration-100">

                    {/* Student */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#ff6700]/15 flex items-center justify-center shrink-0 text-[#ff6700] font-bold text-sm uppercase">
                          {student.personalInfo?.fullName?.[0] || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-white truncate max-w-[150px]">
                            {student.personalInfo?.fullName || "—"}
                          </p>
                          <p className="text-xs text-slate-500 truncate max-w-[150px]">
                            {student.personalInfo?.email || t("students.table.noEmail")}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Enrollment # */}
                    <td className="px-4 py-3">
                      <code className="text-xs bg-[#151929] text-slate-400 px-2 py-0.5 rounded-md font-mono border border-[#2a3047]">
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
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-950/60 text-violet-400 ring-1 ring-violet-800">
                          <UserCheck className="w-3 h-3" />
                          {student.groupCount > 1 ? `${student.groupCount} groups` : "1 group"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/60 text-slate-500 ring-1 ring-slate-700">
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
                            <p className="text-[10px] text-slate-500">{credit.remaining}h left</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-xs text-slate-300">
                          <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate max-w-[100px]">
                            {student.personalInfo?.phone || t("students.table.noPhone")}
                          </span>
                        </div>
                        {student.personalInfo?.whatsappNumber && (
                          <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                            WhatsApp
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(student.createdAt || student.metadata?.createdAt)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
                        <ActionBtn onClick={() => onView(student._id || student.id)} icon={Eye}     color="text-sky-400"    title={t("common.view")} />
                        <ActionBtn onClick={() => onEdit(student)}                   icon={Edit}    color="text-[#ff6700]" title={t("common.edit")} />
                        <ActionBtn
                          onClick={() => { setSelectedStudentForCredit(student); setShowCreditManager(true); }}
                          icon={Package} color="text-amber-400" title={t("credit.manage")}
                        />
                        <ActionBtn
                          onClick={() => onDelete(student._id || student.id, student.personalInfo?.fullName || t("common.student"))}
                          icon={Trash2} color="text-rose-400" title={t("common.delete")}
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
            <div className="w-16 h-16 rounded-2xl bg-[#ff6700]/10 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-[#ff6700]" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {activeFilters.length > 0 ? "No matching students" : t("students.noStudents")}
            </h3>
            <p className="text-sm text-slate-400 max-w-xs mb-6">
              {activeFilters.length > 0
                ? "Try adjusting your filters or search term."
                : t("students.noStudentsDescription")}
            </p>
            {activeFilters.length > 0 ? (
              <button onClick={clearAll} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#2a3047] text-sm text-slate-400 hover:border-[#ff6700]/40 transition">
                <X className="w-3.5 h-3.5" /> Clear filters
              </button>
            ) : (
              <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[#ff6700] hover:bg-[#ff6700]/90 text-white rounded-xl font-semibold text-sm transition">
                <Plus className="w-4 h-4" /> {t("students.createFirstButton")}
              </button>
            )}
          </div>
        )}

        {/* ── Pagination ── */}
        {pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-[#2a3047] bg-[#151929]">
            <p className="text-xs text-slate-500">
              Showing{" "}
              <span className="font-semibold text-white">{(pagination.page - 1) * pagination.limit + 1}</span>
              {" "}–{" "}
              <span className="font-semibold text-white">{Math.min(pagination.page * pagination.limit, pagination.totalStudents)}</span>
              {" "}of{" "}
              <span className="font-semibold text-white">{pagination.totalStudents}</span> students
            </p>

            <div className="flex items-center gap-1">
              <PaginationBtn onClick={() => setFilter("page", 1)}                             disabled={pagination.page === 1}                icon={ChevronsLeft}  />
              <PaginationBtn onClick={() => setFilter("page", pagination.page - 1)}           disabled={pagination.page === 1}                icon={ChevronLeft}   />

              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let p;
                if (pagination.totalPages <= 5)                        p = i + 1;
                else if (pagination.page <= 3)                         p = i + 1;
                else if (pagination.page >= pagination.totalPages - 2) p = pagination.totalPages - 4 + i;
                else                                                   p = pagination.page - 2 + i;
                return (
                  <button
                    key={p}
                    onClick={() => setFilter("page", p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                      p === pagination.page
                        ? "bg-[#ff6700] text-white shadow-sm shadow-[#ff6700]/30"
                        : "text-slate-400 hover:bg-[#1e2638] hover:text-white"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              <PaginationBtn onClick={() => setFilter("page", pagination.page + 1)}           disabled={pagination.page === pagination.totalPages} icon={ChevronRight}  />
              <PaginationBtn onClick={() => setFilter("page", pagination.totalPages)}          disabled={pagination.page === pagination.totalPages} icon={ChevronsRight} />
            </div>

            <select
              value={filters.limit}
              onChange={e => setFilters(f => ({ ...f, limit: Number(e.target.value), page: 1 }))}
              className="text-xs border border-[#2a3047] rounded-lg px-2 py-1.5 bg-[#151929] text-slate-300 focus:ring-2 focus:ring-[#ff6700]/20 focus:border-[#ff6700] outline-none"
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