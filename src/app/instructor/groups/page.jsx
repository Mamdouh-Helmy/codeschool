"use client";
// src/app/instructor/groups/page.jsx

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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getLevelGradient(level) {
  if (level === "advanced")    return "from-red-500 to-orange-500";
  if (level === "intermediate") return "from-blue-500 to-indigo-500";
  return "from-green-500 to-teal-500";
}

function getLevelLabel(level, isAr) {
  if (isAr) {
    if (level === "advanced")    return "متقدم";
    if (level === "intermediate") return "متوسط";
    return "مبتدئ";
  }
  return level ? level.charAt(0).toUpperCase() + level.slice(1) : "—";
}

function getStatusConfig(status, isAr) {
  const cfg = {
    active:    { labelAr: "نشط",    labelEn: "Active",    badge: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40", dot: "bg-emerald-400" },
    completed: { labelAr: "مكتمل",  labelEn: "Completed", badge: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",           dot: "bg-blue-400" },
    draft:     { labelAr: "مسودة",  labelEn: "Draft",     badge: "bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700",               dot: "bg-gray-400" },
    cancelled: { labelAr: "ملغي",   labelEn: "Cancelled", badge: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/40",                  dot: "bg-red-400" },
  };
  return cfg[status] || cfg.draft;
}

// ─── AnimatedCounter ──────────────────────────────────────────────────────────
function AnimatedCounter({ value, duration = 900 }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime; let frame;
    const run = (ts) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) frame = requestAnimationFrame(run);
    };
    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return <span>{count}</span>;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] overflow-hidden animate-pulse">
          <div className="h-2 bg-gray-200 dark:bg-[#30363d]" />
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-xl bg-gray-200 dark:bg-[#21262d]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-[#21262d] rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-[#21262d] rounded w-1/2" />
              </div>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-[#21262d] rounded-full" />
            <div className="grid grid-cols-3 gap-2">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-12 bg-gray-200 dark:bg-[#21262d] rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Group Card ───────────────────────────────────────────────────────────────
function GroupCard({ group, onClick, isAr }) {
  const t = (ar, en) => isAr ? ar : en;
  const course = group.course || {};
  const sc     = getStatusConfig(group.status, isAr);
  const lvlGrad = getLevelGradient(course.level);
  const progress = group.progress || 0;

  return (
    <div
      onClick={onClick}
      className="group/card relative bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-gray-200 dark:hover:border-[#3d444d] shadow-sm"
    >
      {/* Top gradient bar */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${lvlGrad}`} />

      {/* Hover glow — pointer-events-none so clicks go through */}
      <div className={`absolute inset-0 bg-gradient-to-br ${lvlGrad} opacity-0 group-hover/card:opacity-5 transition-opacity duration-300 pointer-events-none`} />

      <div className="relative z-10 p-5">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${lvlGrad} flex items-center justify-center flex-shrink-0 shadow-lg group-hover/card:scale-110 transition-transform duration-300`}>
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-sm text-gray-900 dark:text-[#e6edf3] truncate mb-1 group-hover/card:text-primary transition-colors">
              {course.title || group.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-[#8b949e] truncate mb-2">
              {group.name} · <span className="font-mono text-[10px]">{group.code}</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {/* Status badge */}
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${sc.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {isAr ? sc.labelAr : sc.labelEn}
              </span>
              {/* Level badge */}
              {course.level && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold text-white bg-gradient-to-r ${lvlGrad}`}>
                  {getLevelLabel(course.level, isAr)}
                </span>
              )}
              {/* Grade */}
              {course.grade && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/30 font-medium">
                  🎒 {course.grade}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-500 dark:text-[#8b949e] font-medium">{t("التقدم", "Progress")}</span>
            <span className="font-black text-gray-900 dark:text-[#e6edf3]">{progress}%</span>
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

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { icon: Users,        value: `${group.currentStudentsCount}/${group.maxStudents}`, label: t("طلاب", "Students"),   color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-900/20" },
            { icon: BookOpen,     value: `${group.sessions?.completed || 0}/${group.sessions?.total || 0}`, label: t("جلسات", "Sessions"),   color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
            { icon: Clock,        value: `${group.teachingHours}h`,                           label: t("ساعاتي", "My Hours"), color: "text-primary dark:text-primary",     bg: "bg-primary/5" },
          ].map(({ icon: Icon, value, label, color, bg }, i) => (
            <div key={i} className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl ${bg} border border-gray-100 dark:border-[#30363d]`}>
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span className={`text-xs font-black ${color}`}>{value}</span>
              <span className="text-[9px] text-gray-400 dark:text-[#6e7681]">{label}</span>
            </div>
          ))}
        </div>

        {/* Course meta chips */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {course.subject && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-[#8b949e] border border-gray-200 dark:border-[#30363d]">
              📘 {course.subject}
            </span>
          )}
          {course.duration && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-[#8b949e] border border-gray-200 dark:border-[#30363d]">
              ⏱ {course.duration}
            </span>
          )}
          {course.totalModules > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-[#8b949e] border border-gray-200 dark:border-[#30363d]">
              <Layers className="w-2.5 h-2.5 inline mr-0.5" />{course.totalModules} {t("وحدات", "modules")}
            </span>
          )}
          {course.totalLessons > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-[#8b949e] border border-gray-200 dark:border-[#30363d]">
              📖 {course.totalLessons} {t("درس", "lessons")}
            </span>
          )}
        </div>

        {/* Footer CTA */}
        <div className={`flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#30363d]`}>
          <span className="text-xs text-gray-400 dark:text-[#6e7681]">
            {group.sessions?.needsAttendance > 0 && (
              <span className="text-amber-500 font-bold flex items-center gap-1">
                <ClipboardList className="w-3 h-3" />
                {group.sessions.needsAttendance} {t("تحتاج حضور", "need attendance")}
              </span>
            )}
          </span>
          <span className="flex items-center gap-1 text-xs font-bold text-primary group-hover/card:gap-2 transition-all">
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

  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState("");
  const [groups, setGroups]         = useState([]);
  const [stats, setStats]           = useState(null);
  const [user, setUser]             = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState("all");
  const [animateCards, setAnimateCards] = useState(false);

  const fetchData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const [grpRes, dashRes] = await Promise.all([
        fetch("/api/instructor/groups", { credentials: "include" }).then((r) => r.json()),
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
    const searchMatch = !search ||
      g.name?.toLowerCase().includes(search.toLowerCase()) ||
      g.course?.title?.toLowerCase().includes(search.toLowerCase()) ||
      g.code?.toLowerCase().includes(search.toLowerCase());
    const filterMatch = filter === "all" || g.status === filter;
    return searchMatch && filterMatch;
  });

  const FILTERS = [
    { id: "all",       labelAr: "الكل",    labelEn: "All",       count: groups.length },
    { id: "active",    labelAr: "نشطة",    labelEn: "Active",    count: groups.filter((g) => g.status === "active").length },
    { id: "completed", labelAr: "مكتملة",  labelEn: "Completed", count: groups.filter((g) => g.status === "completed").length },
    { id: "draft",     labelAr: "مسودة",   labelEn: "Draft",     count: groups.filter((g) => g.status === "draft").length },
  ];

  const currentUser = user || { name: isAr ? "مدرس" : "Instructor", email: "", role: "instructor" };

  const statCards = stats ? [
    { icon: Users,        value: stats.total,     label: t("إجمالي المجموعات", "Total Groups"),     grad: "from-primary to-purple-600" },
    { icon: TrendingUp,   value: stats.active,    label: t("مجموعات نشطة",     "Active Groups"),     grad: "from-emerald-400 to-teal-500" },
    { icon: CheckCircle,  value: stats.completed, label: t("مجموعات مكتملة",   "Completed Groups"),  grad: "from-blue-400 to-indigo-500" },
    { icon: BarChart3,    value: stats.draft,     label: t("مسودات",           "Drafts"),            grad: "from-amber-400 to-orange-500" },
  ] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22] flex" dir={isAr ? "rtl" : "ltr"}>

      {/* Refresh indicator */}
      {refreshing && (
        <div className={`fixed top-4 ${isAr ? "left-4" : "right-4"} z-50 bg-primary text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2`}>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">{t("جاري التحديث...", "Refreshing...")}</span>
        </div>
      )}

      {/* Sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed lg:static inset-y-0 ${isAr ? "right-0" : "left-0"} z-50 transform transition-all duration-500
        ${sidebarOpen ? "translate-x-0" : (isAr ? "translate-x-full" : "-translate-x-full") + " lg:translate-x-0"} flex-shrink-0`}>
        <InstructorSidebar user={currentUser} onLogout={handleLogout} />
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <InstructorHeader
          user={currentUser}
          notifications={[]}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          onRefresh={() => fetchData(true)}
        />

        {/* Sticky toolbar */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md border-b border-gray-200 dark:border-[#30363d]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-black text-gray-900 dark:text-[#e6edf3] leading-none">
                    {t("مجموعاتي", "My Groups")}
                  </h1>
                  {!loading && stats && (
                    <p className="text-xs text-gray-400 dark:text-[#6e7681] mt-0.5">
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
                    className={`w-40 sm:w-52 bg-gray-100 dark:bg-[#21262d] border border-gray-200 dark:border-[#30363d] rounded-xl ${isAr ? "pr-9 pl-4" : "pl-9 pr-4"} py-2 text-sm text-gray-900 dark:text-[#e6edf3] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60`}
                  />
                </div>
                <button onClick={() => fetchData(true)}
                  className="p-2 rounded-xl bg-gray-100 dark:bg-[#21262d] text-gray-500 hover:text-primary transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1.5 pb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {FILTERS.map(({ id, labelAr, labelEn, count }) => (
                <button key={id} onClick={() => setFilter(id)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all
                    ${filter === id
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
                      : "bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-[#8b949e] hover:bg-gray-200 dark:hover:bg-[#30363d]"}`}>
                  {isAr ? labelAr : labelEn}
                  <span className={`text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black
                    ${filter === id ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-[#30363d] text-gray-500"}`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* Hero Banner */}
          {!loading && groups.length > 0 && (
            <div className="relative group overflow-hidden rounded-3xl">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 opacity-60 blur-md group-hover:opacity-80 transition-opacity duration-500" />
              <div className="relative bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 rounded-3xl p-6 overflow-hidden shadow-lg">
                <div className="absolute top-0 right-0 w-56 h-56 bg-white/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl" />
                <div className="relative z-10 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-yellow-200 animate-pulse" />
                      <span className="text-yellow-200 text-xs font-medium">{t("مجموعاتك التعليمية", "Your Teaching Groups")}</span>
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">{t("مجموعاتي", "My Groups")}</h2>
                    <p className="text-pink-100 text-sm">
                      {t(`${stats?.active || 0} مجموعة نشطة · ${groups.reduce((a, g) => a + (g.currentStudentsCount || 0), 0)} طالب إجمالاً`,
                         `${stats?.active || 0} active groups · ${groups.reduce((a, g) => a + (g.currentStudentsCount || 0), 0)} total students`)}
                    </p>
                  </div>
                  <div className="flex gap-3 flex-shrink-0">
                    <div className="flex flex-col items-center bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
                      <span className="text-2xl font-black text-white"><AnimatedCounter value={stats?.active || 0} /></span>
                      <span className="text-white/70 text-[10px] font-medium mt-0.5">{t("نشطة", "Active")}</span>
                    </div>
                    <div className="flex flex-col items-center bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
                      <span className="text-2xl font-black text-white">
                        <AnimatedCounter value={groups.reduce((a, g) => a + (g.teachingHours || 0), 0)} />
                      </span>
                      <span className="text-white/70 text-[10px] font-medium mt-0.5">{t("ساعاتي", "My Hours")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stat Cards */}
          {!loading && stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {statCards.map(({ icon: Icon, value, label, grad }, i) => (
                <div key={i}
                  className={`group/stats relative bg-white dark:bg-[#161b22] rounded-2xl p-4 shadow-sm dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-md transition-all duration-300 ${animateCards ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
                  style={{ transitionDelay: `${i * 60}ms`, transition: "all 0.5s ease" }}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-md group-hover/stats:scale-110 transition-transform flex-shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-gray-900 dark:text-[#e6edf3]">
                        <AnimatedCounter value={value} />
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-[#8b949e]">{label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Loading */}
          {loading && <Skeleton />}

          {/* Error */}
          {!loading && error && (
            <div className="flex items-center gap-3 p-5 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800/40">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-red-700 dark:text-red-400">{error}</p>
              </div>
              <button onClick={() => fetchData()}
                className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:underline px-3 py-1.5 rounded-lg hover:bg-red-100 transition-all">
                <RefreshCw className="w-3 h-3" />{t("إعادة", "Retry")}
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && filtered.length === 0 && (
            <div className="text-center py-20 bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d]">
              <div className="w-24 h-24 mx-auto bg-gray-100 dark:bg-[#21262d] rounded-full flex items-center justify-center mb-4">
                <Users className="w-12 h-12 text-gray-300 dark:text-[#6e7681]" />
              </div>
              <p className="text-gray-500 dark:text-[#8b949e] font-medium text-lg mb-2">
                {search ? t("لا نتائج للبحث", "No results found") : t("لا توجد مجموعات بعد", "No groups yet")}
              </p>
              {search && (
                <button onClick={() => setSearch("")} className="text-xs text-primary hover:underline">
                  {t("مسح البحث", "Clear search")}
                </button>
              )}
            </div>
          )}

          {/* Groups Grid */}
          {!loading && !error && filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((group, i) => (
                <div
                  key={group._id}
                  className={`transition-all duration-500 ${animateCards ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
                  style={{ transitionDelay: `${i * 70}ms` }}
                >
                  <GroupCard
                    group={group}
                    isAr={isAr}
                    onClick={() => router.push(`/instructor/groups/${group._id}`)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-shimmer { animation: shimmer 2s infinite; }
      `}</style>
    </div>
  );
}