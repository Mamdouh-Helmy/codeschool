"use client";
// src/app/instructor/groups/page.jsx
// Redesigned to match InstructorDashboard aesthetic

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/app/context/LocaleContext";
import InstructorSidebar from "../InstructorSidebar";
import InstructorHeader from "../InstructorHeader";
import {
  Users, BookOpen, Clock, CheckCircle, Calendar,
  ChevronRight, ChevronLeft, AlertCircle, Loader2,
  RefreshCw, Search, TrendingUp, BarChart3, Zap,
  GraduationCap, Star, Layers, Timer, Play,
  ClipboardList, Filter, Sparkles,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLevelGradient(level) {
  if (level === "advanced")     return "from-red-500 to-orange-500";
  if (level === "intermediate") return "from-blue-500 to-indigo-500";
  return "from-green-500 to-teal-500";
}

function getLevelLabel(level, isAr) {
  if (isAr) {
    if (level === "advanced")     return "متقدم";
    if (level === "intermediate") return "متوسط";
    return "مبتدئ";
  }
  return level ? level.charAt(0).toUpperCase() + level.slice(1) : "—";
}

function getStatusConfig(status) {
  const cfg = {
    active:    { labelAr: "نشط",   labelEn: "Active",    badge: "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400",   dot: "bg-green-400" },
    completed: { labelAr: "مكتمل", labelEn: "Completed", badge: "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400",       dot: "bg-blue-400" },
    draft:     { labelAr: "مسودة", labelEn: "Draft",     badge: "bg-gray-100 dark:bg-gray-500/10 text-gray-600 dark:text-gray-400",        dot: "bg-gray-400" },
    cancelled: { labelAr: "ملغي",  labelEn: "Cancelled", badge: "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400",           dot: "bg-red-400" },
  };
  return cfg[status] || cfg.draft;
}

// ─── AnimatedCounter ──────────────────────────────────────────────────────────

function AnimatedCounter({ value, duration = 1200 }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let st; let fr;
    const run = (ts) => {
      if (!st) st = ts;
      const p = Math.min((ts - st) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      setCount(Math.floor(eased * value));
      if (p < 1) fr = requestAnimationFrame(run);
    };
    fr = requestAnimationFrame(run);
    return () => cancelAnimationFrame(fr);
  }, [value, duration]);
  return <span>{count}</span>;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] shadow-lg dark:shadow-black/40 overflow-hidden animate-pulse"
        >
          <div className="h-1.5 bg-gray-200 dark:bg-[#30363d]" />
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gray-200 dark:bg-[#21262d]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-[#21262d] rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-[#21262d] rounded w-1/2" />
                <div className="flex gap-2">
                  <div className="h-5 w-14 bg-gray-200 dark:bg-[#21262d] rounded-full" />
                  <div className="h-5 w-14 bg-gray-200 dark:bg-[#21262d] rounded-full" />
                </div>
              </div>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-[#21262d] rounded-full" />
            <div className="grid grid-cols-3 gap-2">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-14 bg-gray-200 dark:bg-[#21262d] rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Group Card ───────────────────────────────────────────────────────────────

function GroupCard({ group, onClick, isAr, animateCards, index }) {
  const t = (ar, en) => isAr ? ar : en;
  const course   = group.course || {};
  const sc       = getStatusConfig(group.status);
  const lvlGrad  = getLevelGradient(course.level);
  const progress = group.progress || 0;

  return (
    <div
      onClick={onClick}
      className={`
        group/card relative bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d]
        overflow-hidden cursor-pointer shadow-lg dark:shadow-black/40
        transition-all duration-300 hover:shadow-xl hover:-translate-y-1 dark:hover:border-[#3d444d]
        ${animateCards ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}
      `}
      style={{ transitionDelay: `${index * 70}ms` }}
    >
      {/* Top gradient accent bar */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${lvlGrad}`} />

      {/* Hover glow overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-purple-600/0 group-hover/card:from-primary/5 group-hover/card:to-purple-600/5 rounded-2xl transition-all duration-300 pointer-events-none" />

      <div className="relative z-10 p-6">

        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${lvlGrad} flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20 group-hover/card:scale-110 transition-transform duration-300`}>
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-[#e6edf3] truncate mb-1 group-hover/card:text-primary transition-colors">
              {course.title || group.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-[#8b949e] truncate mb-2">
              {group.name} · <span className="font-mono text-[10px]">{group.code}</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {/* Status */}
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${sc.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${group.status === "active" ? "animate-pulse" : ""}`} />
                {isAr ? sc.labelAr : sc.labelEn}
              </span>
              {/* Level */}
              {course.level && (
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full text-white bg-gradient-to-r ${lvlGrad}`}>
                  {getLevelLabel(course.level, isAr)}
                </span>
              )}
              {/* Grade */}
              {course.grade && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium">
                  🎒 {course.grade}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-500 dark:text-[#8b949e]">{t("التقدم", "Progress")}</span>
            <span className="font-semibold text-gray-900 dark:text-[#e6edf3]">{progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${lvlGrad} rounded-full relative overflow-hidden transition-all duration-700`}
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
            </div>
          </div>
        </div>

        {/* Stats row — matches dashboard stats card mini style */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { icon: Users,    value: `${group.currentStudentsCount}/${group.maxStudents}`,                        label: t("طلاب",   "Students"), color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-100 dark:bg-blue-500/10" },
            { icon: BookOpen, value: `${group.sessions?.completed || 0}/${group.sessions?.total || 0}`,           label: t("جلسات",  "Sessions"), color: "text-green-600 dark:text-green-400",  bg: "bg-green-100 dark:bg-green-500/10" },
            { icon: Clock,    value: `${group.teachingHours}h`,                                                   label: t("ساعاتي", "Hours"),    color: "text-primary dark:text-primary",      bg: "bg-purple-100 dark:bg-purple-500/10" },
          ].map(({ icon: Icon, value, label, color, bg }, i) => (
            <div key={i} className={`flex flex-col items-center gap-1 py-3 px-1 rounded-xl ${bg}`}>
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span className={`text-xs font-semibold ${color}`}>{value}</span>
              <span className="text-[9px] text-gray-400 dark:text-[#6e7681]">{label}</span>
            </div>
          ))}
        </div>

        {/* Meta chips */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {course.subject && (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-[#8b949e]">
              📘 {course.subject}
            </span>
          )}
          {course.duration && (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-[#8b949e]">
              ⏱ {course.duration}
            </span>
          )}
          {course.totalModules > 0 && (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-[#8b949e] inline-flex items-center gap-1">
              <Layers className="w-2.5 h-2.5" />{course.totalModules} {t("وحدات", "modules")}
            </span>
          )}
          {course.totalLessons > 0 && (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-[#8b949e]">
              📖 {course.totalLessons} {t("درس", "lessons")}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#30363d]">
          <span className="text-xs">
            {group.sessions?.needsAttendance > 0 && (
              <span className="text-yellow-600 dark:text-yellow-400 font-semibold flex items-center gap-1">
                <ClipboardList className="w-3 h-3" />
                {group.sessions.needsAttendance} {t("تحتاج حضور", "need attendance")}
              </span>
            )}
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-primary group-hover/card:gap-2 transition-all">
            {t("التفاصيل", "Details")}
            {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InstructorGroupsPage() {
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const t = (ar, en) => isAr ? ar : en;
  const router = useRouter();

  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState("");
  const [groups, setGroups]           = useState([]);
  const [stats, setStats]             = useState(null);
  const [user, setUser]               = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch]           = useState("");
  const [filter, setFilter]           = useState("all");
  const [animateCards, setAnimateCards] = useState(false);

  const fetchData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const [grpRes, dashRes] = await Promise.all([
        fetch("/api/instructor/groups",    { credentials: "include" }).then((r) => r.json()),
        fetch("/api/instructor/dashboard", { credentials: "include" }).then((r) => r.json()),
      ]);

      if (grpRes.success) {
        setGroups(grpRes.data.groups || []);
        setStats(grpRes.data.stats || null);
        setTimeout(() => setAnimateCards(true), 200);
      } else {
        setError(grpRes.message || t("حدث خطأ", "Something went wrong"));
      }
      if (dashRes.success) setUser(dashRes.data.user);
    } catch {
      setError(t("فشل تحميل البيانات", "Failed to load data"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("token");
    router.push("/");
  };

  const filtered = groups.filter((g) => {
    const s = !search
      || g.name?.toLowerCase().includes(search.toLowerCase())
      || g.course?.title?.toLowerCase().includes(search.toLowerCase())
      || g.code?.toLowerCase().includes(search.toLowerCase());
    const f = filter === "all" || g.status === filter;
    return s && f;
  });

  const FILTERS = [
    { id: "all",       labelAr: "الكل",   labelEn: "All",       count: groups.length },
    { id: "active",    labelAr: "نشطة",   labelEn: "Active",    count: groups.filter((g) => g.status === "active").length },
    { id: "completed", labelAr: "مكتملة", labelEn: "Completed", count: groups.filter((g) => g.status === "completed").length },
    { id: "draft",     labelAr: "مسودة",  labelEn: "Draft",     count: groups.filter((g) => g.status === "draft").length },
  ];

  const totalStudents = groups.reduce((a, g) => a + (g.currentStudentsCount || 0), 0);
  const totalHours    = groups.reduce((a, g) => a + (g.teachingHours || 0), 0);
  const currentUser   = user || { name: isAr ? "مدرس" : "Instructor", email: "", role: "instructor" };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22] flex relative"
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Refresh indicator */}
      {refreshing && (
        <div className={`fixed top-4 ${isAr ? "left-4" : "right-4"} z-50 bg-primary text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2`}>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">{t("جاري التحديث...", "Refreshing...")}</span>
        </div>
      )}

      {/* Sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 ${isAr ? "right-0" : "left-0"} z-50 transform transition-all duration-500
          ${sidebarOpen ? "translate-x-0" : (isAr ? "translate-x-full" : "-translate-x-full") + " lg:translate-x-0"}
          flex-shrink-0`}
      >
        <InstructorSidebar user={currentUser} onLogout={handleLogout} />
      </div>

      <main className="flex-1 min-w-0 transition-all duration-300">
        <InstructorHeader
          user={currentUser}
          notifications={[]}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          onRefresh={() => fetchData(true)}
        />

        {/* ── Sticky toolbar ── */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md border-b border-gray-200 dark:border-[#30363d]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-md shadow-primary/20">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-gray-900 dark:text-[#e6edf3] leading-none">
                    {t("مجموعاتي", "My Groups")}
                  </h1>
                  {!loading && stats && (
                    <p className="text-xs text-gray-500 dark:text-[#8b949e] mt-0.5">
                      {stats.active} {t("نشطة", "active")} · {stats.total} {t("إجمالي", "total")}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className={`absolute ${isAr ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("بحث...", "Search...")}
                    className={`w-40 sm:w-52 bg-gray-100 dark:bg-[#21262d] border border-gray-200 dark:border-[#30363d] rounded-xl
                      ${isAr ? "pr-9 pl-4" : "pl-9 pr-4"} py-2 text-sm text-gray-900 dark:text-[#e6edf3]
                      placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60`}
                  />
                </div>
                <button
                  onClick={() => fetchData(true)}
                  className="p-2 rounded-xl bg-gray-100 dark:bg-[#21262d] text-gray-500 hover:text-primary transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 pb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {FILTERS.map(({ id, labelAr, labelEn, count }) => (
                <button
                  key={id}
                  onClick={() => setFilter(id)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-medium flex-shrink-0 transition-all
                    ${filter === id
                      ? "bg-gradient-to-r from-primary to-purple-600 text-white shadow-md shadow-primary/20"
                      : "bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-[#8b949e] hover:bg-gray-200 dark:hover:bg-[#30363d]"
                    }`}
                >
                  {isAr ? labelAr : labelEn}
                  <span className={`text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold
                    ${filter === id ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-[#30363d] text-gray-500"}`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">

          {/* ── Hero Banner — matches InstructorDashboard hero ── */}
          {!loading && groups.length > 0 && (
            <div className="relative group min-w-4xl mx-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-600 to-pink-600 rounded-3xl opacity-60 blur-md group-hover:opacity-80 transition-opacity duration-500" />
              <div className="relative bg-gradient-to-br from-primary via-purple-600 to-pink-600 rounded-3xl p-6 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse-slow" />
                <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slower" />

                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                      <span className="text-yellow-300 font-medium text-sm">
                        {t("مجموعاتك التعليمية", "Your Teaching Groups")}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">{t("مجموعاتي", "My Groups")}</h2>
                    <p className="text-blue-100 text-sm">
                      {t(
                        `${stats?.active || 0} مجموعة نشطة · ${totalStudents} طالب إجمالاً`,
                        `${stats?.active || 0} active groups · ${totalStudents} total students`
                      )}
                    </p>
                  </div>

                  <div className="flex gap-3 flex-shrink-0">
                    <div className="flex flex-col items-center bg-white/15 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/20">
                      <span className="text-2xl font-bold text-white">
                        <AnimatedCounter value={stats?.active || 0} />
                      </span>
                      <span className="text-blue-200 text-xs mt-0.5">{t("نشطة", "Active")}</span>
                    </div>
                    <div className="flex flex-col items-center bg-white/15 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/20">
                      <span className="text-2xl font-bold text-white">
                        <AnimatedCounter value={totalStudents} />
                      </span>
                      <span className="text-blue-200 text-xs mt-0.5">{t("طلاب", "Students")}</span>
                    </div>
                    <div className="flex flex-col items-center bg-white/15 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/20">
                      <span className="text-2xl font-bold text-white">
                        <AnimatedCounter value={totalHours} />
                      </span>
                      <span className="text-blue-200 text-xs mt-0.5">{t("ساعات", "Hours")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Stats Cards — matches dashboard Teaching Hours / Students / Attendance style ── */}
          {!loading && stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: Users,       value: stats.total,     label: t("إجمالي المجموعات", "Total Groups"),    badge: t("مجموعة",   "Groups"),    gradient: "from-primary to-purple-600",    badgeBg: "bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400", barWidth: "100%" },
                { icon: TrendingUp,  value: stats.active,    label: t("مجموعات نشطة",     "Active Groups"),    badge: t("نشطة",     "Active"),     gradient: "from-green-400 to-emerald-500",  badgeBg: "bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400",    barWidth: stats.total ? `${Math.round((stats.active / stats.total) * 100)}%` : "0%" },
                { icon: CheckCircle, value: stats.completed, label: t("مجموعات مكتملة",   "Completed"),        badge: t("مكتملة",   "Completed"),  gradient: "from-blue-400 to-indigo-500",    badgeBg: "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",        barWidth: stats.total ? `${Math.round((stats.completed / stats.total) * 100)}%` : "0%" },
                { icon: BarChart3,   value: stats.draft,     label: t("مسودات",           "Drafts"),           badge: t("مسودة",    "Draft"),      gradient: "from-yellow-400 to-amber-500",   badgeBg: "bg-yellow-100 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400", barWidth: stats.total ? `${Math.round((stats.draft / stats.total) * 100)}%` : "0%" },
              ].map(({ icon: Icon, value, label, badge, gradient, badgeBg, barWidth }, i) => (
                <div
                  key={i}
                  className={`
                    group/stats relative bg-white dark:bg-[#161b22] rounded-2xl p-5
                    shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d]
                    hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 transform hover:-translate-y-1
                    ${animateCards ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
                  `}
                  style={{ transitionDelay: `${i * 60}ms`, transition: "all 0.5s ease" }}
                >
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover/stats:opacity-100 transition-opacity duration-300"
                    style={{ background: "radial-gradient(circle at top right, rgba(140,82,255,0.05), transparent 60%)" }} />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover/stats:scale-110 transition-transform duration-300`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badgeBg}`}>
                        {badge}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-[#e6edf3] mb-1">
                      <AnimatedCounter value={value} />
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-[#8b949e]">{label}</p>
                    <div className="mt-3 h-1 w-full bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-1000`}
                        style={{ width: animateCards ? barWidth : "0%" }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Loading skeleton */}
          {loading && <Skeleton />}

          {/* Error */}
          {!loading && error && (
            <div className="flex items-center gap-3 p-6 bg-white dark:bg-[#161b22] rounded-2xl border border-red-200 dark:border-red-800/40 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400 flex-1">{error}</p>
              <button
                onClick={() => fetchData()}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline px-3 py-1.5 rounded-xl hover:bg-primary/5 transition-all"
              >
                <RefreshCw className="w-3 h-3" />{t("إعادة", "Retry")}
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && filtered.length === 0 && (
            <div className="text-center py-20 bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] shadow-lg">
              <div className="w-24 h-24 mx-auto bg-gray-100 dark:bg-[#21262d] rounded-full flex items-center justify-center mb-4">
                <Users className="w-12 h-12 text-gray-400 dark:text-[#6e7681]" />
              </div>
              <p className="text-gray-500 dark:text-[#8b949e] font-medium text-lg mb-3">
                {search ? t("لا نتائج للبحث", "No results found") : t("لا توجد مجموعات بعد", "No groups yet")}
              </p>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-sm text-primary hover:underline"
                >
                  {t("مسح البحث", "Clear search")}
                </button>
              )}
            </div>
          )}

          {/* ── Groups Grid ── */}
          {!loading && !error && filtered.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-[#e6edf3] flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    {filter === "all" ? t("جميع المجموعات", "All Groups") : FILTERS.find((f) => f.id === filter)?.[isAr ? "labelAr" : "labelEn"]}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-[#8b949e] mt-1">
                    {filtered.length} {t("مجموعة", "groups")}
                    {search && ` · ${t("نتائج البحث", "search results")}`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtered.map((group, i) => (
                  <GroupCard
                    key={group._id}
                    group={group}
                    isAr={isAr}
                    animateCards={animateCards}
                    index={i}
                    onClick={() => router.push(`/instructor/groups/${group._id}`)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      <style jsx>{`
        @keyframes shimmer       { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes pulse-slow    { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
        @keyframes pulse-slower  { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.4; } }
        .animate-shimmer         { animation: shimmer 2s infinite; }
        .animate-pulse-slow      { animation: pulse-slow 4s ease-in-out infinite; }
        .animate-pulse-slower    { animation: pulse-slower 6s ease-in-out infinite; }
      `}</style>
    </div>
  );
}