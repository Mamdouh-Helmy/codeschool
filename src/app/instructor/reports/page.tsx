"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import InstructorSidebar from "../InstructorSidebar";
import InstructorHeader from "../InstructorHeader";
import {
  BarChart3, TrendingUp, Users, BookOpen, CheckCircle,
  X, Clock, AlertCircle, Loader2, Filter, ChevronDown,
  ArrowUpRight, ArrowDownRight, Minus, Calendar, Award,
} from "lucide-react";
import { useLocale } from "@/app/context/LocaleContext";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
interface GroupReport {
  _id: string;
  name: string;
  code: string;
  status: string;
  courseTitle: string;
  courseLevel: string;
  currentStudentsCount: number;
  totalSessions: number;
  completedSessions: number;
  scheduledSessions: number;
  cancelledSessions: number;
  attendanceRate: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  totalRecords: number;
  progress: number;
  myTeachingHours: number;
}
interface MonthlyTrend {
  month: string;
  monthAr: string;
  sessions: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  rate: number;
}
interface SessionReport {
  _id: string;
  title: string;
  date: string;
  groupName: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  rate: number;
}
interface StudentReport {
  _id: string;
  name: string;
  enrollmentNumber: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  totalSessions: number;
  attendanceRate: number;
}
interface Overview {
  totalGroups: number;
  activeGroups: number;
  totalSessions: number;
  completedSessions: number;
  scheduledSessions: number;
  cancelledSessions: number;
  postponedSessions: number;
  totalStudents: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalExcused: number;
  totalRecords: number;
  overallAttendanceRate: number;
  totalTeachingHours: number;
}
interface ReportsData {
  groups: GroupReport[];
  allGroups: { _id: string; name: string; code: string; courseTitle: string }[];
  overview: Overview;
  monthlyTrend: MonthlyTrend[];
  sessionReports: SessionReport[];
  studentReports: StudentReport[];
}

// ─────────────────────────────────────────────────────────
// AnimatedCounter — exact copy from InstructorDashboard
// ─────────────────────────────────────────────────────────
const AnimatedCounter = ({ value, duration = 1800 }: { value: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime: number;
    let frame: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(eased * value));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return <span>{count.toLocaleString()}</span>;
};

// ─────────────────────────────────────────────────────────
// RateBadge
// ─────────────────────────────────────────────────────────
const RateBadge = ({ rate }: { rate: number }) => {
  const cls =
    rate >= 80
      ? "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-500/10"
      : rate >= 60
      ? "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-500/10"
      : "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/10";
  const Icon = rate >= 80 ? ArrowUpRight : rate >= 60 ? Minus : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      <Icon className="w-3 h-3" />
      {rate}%
    </span>
  );
};

// ─────────────────────────────────────────────────────────
// Level helpers — exact copy from InstructorDashboard
// ─────────────────────────────────────────────────────────
const getLevelGradient = (level: string) => {
  if (level === "advanced") return "from-red-500 to-orange-500";
  if (level === "intermediate") return "from-blue-500 to-indigo-500";
  return "from-green-500 to-teal-500";
};
const getLevelLabel = (level: string, isRTL: boolean) => {
  if (isRTL) {
    if (level === "advanced") return "متقدم";
    if (level === "intermediate") return "متوسط";
    return "مبتدئ";
  }
  return level.charAt(0).toUpperCase() + level.slice(1);
};

// ─────────────────────────────────────────────────────────
// Skeleton — same pattern as DashboardSkeleton
// ─────────────────────────────────────────────────────────
const DashboardSkeleton = () => (
  <div className="p-6 lg:p-8 space-y-6">
    <div className="h-8 w-44 bg-gray-200 dark:bg-[#21262d] rounded-xl animate-pulse" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-32 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="h-64 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse" />
      <div className="h-64 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse" />
    </div>
  </div>
);

// ═════════════════════════════════════════════════════════
// Main Page
// ═════════════════════════════════════════════════════════
export default function InstructorReports() {
  const { locale } = useLocale();
  const isRTL = locale === "ar";
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportsData | null>(null);
  const [error, setError] = useState("");
  const [animateProgress, setAnimateProgress] = useState(false); // same name as InstructorDashboard
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [activeTab, setActiveTab] = useState<"overview" | "groups" | "sessions" | "students">("overview");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [showGroupFilter, setShowGroupFilter] = useState(false);

  // same dummy pattern as InstructorDashboard — real user shown by Header/Sidebar
  const user = { id: "", name: "", email: "", role: "instructor" };

  const fetchData = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);
        setError("");
        setAnimateProgress(false);

        const params = new URLSearchParams({ groupId: selectedGroup, period: selectedPeriod });
        const res = await fetch(`/api/instructor/reports?${params}`, { credentials: "include" });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || "Error");
        setData(json.data);
        setTimeout(() => setAnimateProgress(true), 300); // same delay as InstructorDashboard
      } catch (err: any) {
        setError(err.message);
        if (err.message?.includes("UNAUTHORIZED")) router.push("/signin");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedGroup, selectedPeriod, router]
  );

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("token");
    router.push("/");
  };

  // ── Loading
  if (loading)
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22] flex"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="hidden lg:block flex-shrink-0">
          <InstructorSidebar user={null} onLogout={handleLogout} />
        </div>
        <main className="flex-1 min-w-0">
          <DashboardSkeleton />
        </main>
      </div>
    );

  // ── Error
  if (error && !data)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0d1117]">
        <div className="text-center max-w-md p-8">
          <div className="w-24 h-24 mx-auto bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="h-12 w-12 text-red-500 animate-pulse" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-[#e6edf3] mb-3">
            {isRTL ? "حدث خطأ" : "Something went wrong"}
          </h3>
          <p className="text-gray-600 dark:text-[#8b949e] mb-6">{error}</p>
          <button
            onClick={() => fetchData()}
            className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            {isRTL ? "إعادة المحاولة" : "Try Again"}
          </button>
        </div>
      </div>
    );

  const { overview, groups, monthlyTrend, sessionReports, studentReports, allGroups } = data!;

  const PERIODS = [
    { value: "all",   label: "All Time",   labelAr: "الكل"   },
    { value: "month", label: "Last Month", labelAr: "شهر"    },
    { value: "week",  label: "Last Week",  labelAr: "أسبوع"  },
  ];

  const TABS = [
    { key: "overview",  label: "Overview",  labelAr: "نظرة عامة", icon: TrendingUp },
    { key: "groups",    label: "Groups",    labelAr: "المجموعات", icon: Users      },
    { key: "sessions",  label: "Sessions",  labelAr: "الجلسات",   icon: BookOpen   },
    { key: "students",  label: "Students",  labelAr: "الطلاب",    icon: Award      },
  ] as const;

  // monthly chart — find max for scaling bars
  const monthlyMax = Math.max(...monthlyTrend.flatMap((m) => [m.present, m.absent]), 1);

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22] flex relative"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Refresh indicator — same as InstructorDashboard */}
      {refreshing && (
        <div
          className={`fixed top-4 ${isRTL ? "left-4" : "right-4"} z-50 bg-teal-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2`}
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">{isRTL ? "جاري التحديث..." : "Refreshing..."}</span>
        </div>
      )}

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 ${isRTL ? "right-0" : "left-0"} z-50 transform transition-all duration-500
          ${sidebarOpen ? "translate-x-0" : (isRTL ? "translate-x-full" : "-translate-x-full") + " lg:translate-x-0"}
          flex-shrink-0`}
      >
        <InstructorSidebar user={user as any} onLogout={handleLogout} />
      </div>

      <main className="flex-1 min-w-0 transition-all duration-300">
        {/* InstructorHeader — exact same props as InstructorDashboard */}
        <InstructorHeader
          user={user as any}
          notifications={[]}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          onRefresh={() => fetchData(true)}
        />

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">

          {/* ── Page Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-[#e6edf3] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                {isRTL ? "التقارير" : "Reports"}
              </h1>
              <p className="text-sm text-gray-500 dark:text-[#8b949e] mt-1">
                {isRTL
                  ? "تحليل شامل لأداء التدريس والحضور"
                  : "Comprehensive overview of teaching performance & attendance"}
              </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Period pills */}
              <div className="flex items-center gap-1 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl p-1">
                {PERIODS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setSelectedPeriod(p.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedPeriod === p.value
                        ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-sm"
                        : "text-gray-600 dark:text-[#8b949e] hover:bg-gray-100 dark:hover:bg-[#21262d]"
                    }`}
                  >
                    {isRTL ? p.labelAr : p.label}
                  </button>
                ))}
              </div>

              {/* Group dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowGroupFilter(!showGroupFilter)}
                  className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl text-sm text-gray-700 dark:text-[#8b949e] hover:border-teal-500 transition-all"
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline max-w-[120px] truncate">
                    {selectedGroup === "all"
                      ? isRTL ? "كل المجموعات" : "All Groups"
                      : allGroups.find((g) => g._id === selectedGroup)?.name || "Group"}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-300 ${showGroupFilter ? "rotate-180" : ""}`}
                  />
                </button>
                {showGroupFilter && (
                  <div
                    className={`absolute top-full mt-2 ${isRTL ? "left-0" : "right-0"} w-60 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl shadow-xl z-20 overflow-hidden`}
                  >
                    <button
                      onClick={() => { setSelectedGroup("all"); setShowGroupFilter(false); }}
                      className={`w-full text-start px-4 py-2.5 text-sm transition-colors ${
                        selectedGroup === "all"
                          ? "bg-teal-50 dark:bg-teal-500/10 text-teal-600 font-semibold"
                          : "text-gray-700 dark:text-[#8b949e] hover:bg-gray-50 dark:hover:bg-[#21262d]"
                      }`}
                    >
                      {isRTL ? "كل المجموعات" : "All Groups"}
                    </button>
                    {allGroups.map((g) => (
                      <button
                        key={g._id}
                        onClick={() => { setSelectedGroup(g._id); setShowGroupFilter(false); }}
                        className={`w-full text-start px-4 py-2.5 text-sm transition-colors ${
                          selectedGroup === g._id
                            ? "bg-teal-50 dark:bg-teal-500/10 text-teal-600 font-semibold"
                            : "text-gray-700 dark:text-[#8b949e] hover:bg-gray-50 dark:hover:bg-[#21262d]"
                        }`}
                      >
                        <p className="font-medium truncate">{g.courseTitle}</p>
                        <p className="text-xs text-gray-400">{g.name}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Stats Cards — exact same as InstructorDashboard ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                label: isRTL ? "معدل الحضور" : "Attendance Rate",
                value: overview.overallAttendanceRate,
                suffix: "%",
                icon: CheckCircle,
                grad: "from-teal-500 to-emerald-500",
                shadow: "shadow-teal-500/20",
                hoverGrad: "group-hover/stats:from-teal-500/10 group-hover/stats:to-emerald-500/10",
                badge: "bg-teal-100 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400",
                badgeLabel: isRTL ? "حضور" : "Attendance",
                barWidth: overview.overallAttendanceRate,
              },
              {
                label: isRTL ? "إجمالي الجلسات" : "Total Sessions",
                value: overview.totalSessions,
                suffix: "",
                icon: BookOpen,
                grad: "from-violet-500 to-purple-600",
                shadow: "shadow-violet-500/20",
                hoverGrad: "group-hover/stats:from-violet-500/10 group-hover/stats:to-purple-600/10",
                badge: "bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400",
                badgeLabel: isRTL ? "جلسات" : "Sessions",
                barWidth:
                  overview.totalSessions > 0
                    ? Math.round((overview.completedSessions / overview.totalSessions) * 100)
                    : 0,
              },
              {
                label: isRTL ? "إجمالي الطلاب" : "Total Students",
                value: overview.totalStudents,
                suffix: "",
                icon: Users,
                grad: "from-blue-400 to-indigo-500",
                shadow: "shadow-blue-500/20",
                hoverGrad: "group-hover/stats:from-blue-400/10 group-hover/stats:to-indigo-500/10",
                badge: "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
                badgeLabel: isRTL ? "طلاب" : "Students",
                barWidth: Math.min((overview.totalStudents / 30) * 100, 100),
              },
              {
                label: isRTL ? "ساعات التدريس" : "Teaching Hours",
                value: overview.totalTeachingHours,
                suffix: "h",
                icon: Clock,
                grad: "from-amber-400 to-orange-500",
                shadow: "shadow-amber-500/20",
                hoverGrad: "group-hover/stats:from-amber-400/10 group-hover/stats:to-orange-500/10",
                badge: "bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
                badgeLabel: isRTL ? "ساعة" : "Hours",
                barWidth: Math.min((overview.totalTeachingHours / 100) * 100, 100),
              },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={i}
                  className="group/stats relative bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br from-transparent to-transparent ${s.hoverGrad} rounded-2xl transition-all duration-300`}
                  />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${s.grad} flex items-center justify-center shadow-lg ${s.shadow} group-hover/stats:scale-110 transition-transform duration-300`}
                      >
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${s.badge}`}>
                        {s.badgeLabel}
                      </span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-[#e6edf3] mb-1">
                      {animateProgress ? (
                        <><AnimatedCounter value={s.value} />{s.suffix}</>
                      ) : (
                        `0${s.suffix}`
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-[#8b949e]">{s.label}</p>
                    <div className="mt-4 h-1 w-full bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${s.grad} rounded-full transition-all duration-1000`}
                        style={{ width: animateProgress ? `${s.barWidth}%` : "0%" }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Tabs ── */}
          <div className="flex items-center gap-2 flex-wrap">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    activeTab === tab.key
                      ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/20"
                      : "bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] text-gray-600 dark:text-[#8b949e] hover:bg-gray-50 dark:hover:bg-[#21262d]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {isRTL ? tab.labelAr : tab.label}
                </button>
              );
            })}
          </div>

          {/* ══════════════════ OVERVIEW ══════════════════ */}
          {activeTab === "overview" && (
            <div className="space-y-6">

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Attendance Distribution — CSS conic-gradient donut, same card as InstructorDashboard */}
                <div className="group/progress relative bg-white dark:bg-[#161b22] rounded-2xl p-6 lg:p-8 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl transition-all duration-300">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-[#e6edf3] mb-1 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-teal-500" />
                    {isRTL ? "توزيع الحضور" : "Attendance Distribution"}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-[#8b949e] mb-6">
                    {isRTL ? "إجمالي سجلات الحضور" : "Total attendance records breakdown"}
                  </p>

                  {overview.totalRecords > 0 ? (() => {
                    const pP = (overview.totalPresent  / overview.totalRecords) * 100;
                    const pA = (overview.totalAbsent   / overview.totalRecords) * 100;
                    const pL = (overview.totalLate     / overview.totalRecords) * 100;
                    const gradient = animateProgress
                      ? `conic-gradient(#22c55e 0% ${pP.toFixed(1)}%, #ef4444 ${pP.toFixed(1)}% ${(pP+pA).toFixed(1)}%, #f59e0b ${(pP+pA).toFixed(1)}% ${(pP+pA+pL).toFixed(1)}%, #3b82f6 ${(pP+pA+pL).toFixed(1)}% 100%)`
                      : "conic-gradient(#e5e7eb 0% 100%)";
                    return (
                      <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="relative flex-shrink-0 w-36 h-36">
                          <div
                            className="w-36 h-36 rounded-full transition-all duration-1000"
                            style={{
                              background: gradient,
                              mask: "radial-gradient(circle, transparent 42%, black 43%)",
                              WebkitMask: "radial-gradient(circle, transparent 42%, black 43%)",
                            }}
                          />
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xl font-bold text-gray-900 dark:text-[#e6edf3]">
                              {overview.totalRecords}
                            </span>
                            <span className="text-[10px] text-gray-400">{isRTL ? "سجل" : "records"}</span>
                          </div>
                        </div>
                        <div className="space-y-2.5 flex-1 w-full">
                          {[
                            { label: isRTL ? "حاضر"  : "Present", value: overview.totalPresent,  color: "#22c55e", text: "text-green-600 dark:text-green-400" },
                            { label: isRTL ? "غائب"  : "Absent",  value: overview.totalAbsent,   color: "#ef4444", text: "text-red-600 dark:text-red-400" },
                            { label: isRTL ? "متأخر" : "Late",    value: overview.totalLate,     color: "#f59e0b", text: "text-yellow-600 dark:text-yellow-400" },
                            { label: isRTL ? "معذور" : "Excused", value: overview.totalExcused,  color: "#3b82f6", text: "text-blue-600 dark:text-blue-400" },
                          ].map((d) => (
                            <div key={d.label} className="flex items-center gap-2.5">
                              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                              <span className="text-sm text-gray-600 dark:text-[#8b949e] flex-1">{d.label}</span>
                              <span className={`text-sm font-bold ${d.text}`}>{d.value}</span>
                              <span className="text-xs text-gray-400 w-10 text-end">
                                ({Math.round((d.value / overview.totalRecords) * 100)}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="flex flex-col items-center justify-center h-36 text-gray-300 dark:text-[#6e7681]">
                      <BarChart3 className="w-10 h-10 opacity-30 mb-2" />
                      <p className="text-sm">{isRTL ? "لا توجد بيانات بعد" : "No data yet"}</p>
                    </div>
                  )}
                </div>

                {/* Monthly Attendance — CSS bar chart, same card style */}
                <div className="group/progress relative bg-white dark:bg-[#161b22] rounded-2xl p-6 lg:p-8 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl transition-all duration-300">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-[#e6edf3] mb-1 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-teal-500" />
                    {isRTL ? "الحضور الشهري" : "Monthly Attendance"}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-[#8b949e] mb-6">
                    {isRTL ? "آخر 6 أشهر" : "Last 6 months — present vs absent"}
                  </p>
                  <div className="flex items-end gap-1.5 h-40 mb-3">
                    {monthlyTrend.map((m, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className="w-full flex items-end gap-0.5 h-32">
                          <div className="flex-1 flex items-end h-full">
                            <div
                              className="w-full rounded-t-md bg-gradient-to-t from-green-500 to-green-400 transition-all duration-700"
                              style={{
                                height: animateProgress ? `${Math.max((m.present / monthlyMax) * 100, m.present > 0 ? 5 : 0)}%` : "0%",
                                transitionDelay: `${i * 60}ms`,
                              }}
                            />
                          </div>
                          <div className="flex-1 flex items-end h-full">
                            <div
                              className="w-full rounded-t-md bg-gradient-to-t from-red-500 to-red-400 transition-all duration-700"
                              style={{
                                height: animateProgress ? `${Math.max((m.absent / monthlyMax) * 100, m.absent > 0 ? 5 : 0)}%` : "0%",
                                transitionDelay: `${i * 60 + 80}ms`,
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-400 dark:text-[#6e7681] text-center truncate w-full">
                          {isRTL ? m.monthAr : m.month}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                      <span className="text-xs text-gray-500 dark:text-[#8b949e]">{isRTL ? "حاضر" : "Present"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <span className="text-xs text-gray-500 dark:text-[#8b949e]">{isRTL ? "غائب" : "Absent"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Session status mini cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: isRTL ? "مكتملة" : "Completed", value: overview.completedSessions, icon: CheckCircle, grad: "from-green-400 to-emerald-500",  bg: "bg-green-50 dark:bg-green-500/10 border-green-100 dark:border-green-500/20"    },
                  { label: isRTL ? "مجدولة" : "Scheduled", value: overview.scheduledSessions, icon: Calendar,    grad: "from-blue-400 to-indigo-500",    bg: "bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20"      },
                  { label: isRTL ? "ملغية"  : "Cancelled", value: overview.cancelledSessions, icon: X,           grad: "from-red-400 to-red-500",        bg: "bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20"          },
                  { label: isRTL ? "مؤجلة"  : "Postponed", value: overview.postponedSessions, icon: Clock,       grad: "from-yellow-400 to-amber-500",   bg: "bg-yellow-50 dark:bg-yellow-500/10 border-yellow-100 dark:border-yellow-500/20" },
                ].map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className={`${s.bg} border rounded-2xl p-5 flex items-center gap-3`}>
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.grad} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-[#e6edf3]">{s.value}</p>
                        <p className="text-xs text-gray-500 dark:text-[#8b949e]">{s.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Attendance breakdown — exact same widget as InstructorDashboard "Attendance Overview" */}
              <div className="bg-white dark:bg-[#161b22] rounded-2xl p-6 lg:p-8 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d]">
                <h4 className="font-bold text-gray-900 dark:text-[#e6edf3] mb-5 flex items-center gap-2 text-base">
                  <BarChart3 className="w-5 h-5 text-teal-500" />
                  {isRTL ? "تفاصيل سجلات الحضور" : "Attendance Records Detail"}
                </h4>
                <div className="space-y-3">
                  {[
                    { label: isRTL ? "حاضر"  : "Present", value: overview.totalPresent,  color: "from-green-400 to-emerald-500", text: "text-green-600 dark:text-green-400" },
                    { label: isRTL ? "غائب"  : "Absent",  value: overview.totalAbsent,   color: "from-red-400 to-red-500",       text: "text-red-600 dark:text-red-400" },
                    { label: isRTL ? "متأخر" : "Late",    value: overview.totalLate,     color: "from-yellow-400 to-amber-500",  text: "text-yellow-600 dark:text-yellow-400" },
                    { label: isRTL ? "معذور" : "Excused", value: overview.totalExcused,  color: "from-blue-400 to-cyan-500",     text: "text-blue-600 dark:text-blue-400" },
                  ].map((item) => {
                    const pct = overview.totalRecords > 0 ? Math.round((item.value / overview.totalRecords) * 100) : 0;
                    return (
                      <div key={item.label} className="flex items-center gap-3">
                        <span className={`text-xs font-medium w-16 flex-shrink-0 ${item.text}`}>{item.label}</span>
                        <div className="flex-1 h-2 bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-1000`}
                            style={{ width: animateProgress ? `${pct}%` : "0%" }}
                          />
                        </div>
                        <span className={`text-xs font-bold w-8 text-end flex-shrink-0 ${item.text}`}>{item.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════ GROUPS ══════════════════ */}
          {activeTab === "groups" && (
            <div className="space-y-6">

              {/* Horizontal bar comparison — same progress-bar style */}
              {groups.length > 0 && (
                <div className="bg-white dark:bg-[#161b22] rounded-2xl p-6 lg:p-8 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d]">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-[#e6edf3] mb-1 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-teal-500" />
                    {isRTL ? "مقارنة معدل الحضور" : "Attendance Rate Comparison"}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-[#8b949e] mb-6">
                    {isRTL ? "مقارنة بين المجموعات" : "Side-by-side comparison across groups"}
                  </p>
                  <div className="space-y-3">
                    {groups.map((g) => {
                      const color = g.attendanceRate >= 80 ? "from-green-400 to-emerald-500"
                        : g.attendanceRate >= 60 ? "from-yellow-400 to-amber-500"
                        : "from-red-400 to-red-500";
                      const text = g.attendanceRate >= 80 ? "text-green-600 dark:text-green-400"
                        : g.attendanceRate >= 60 ? "text-yellow-600 dark:text-yellow-400"
                        : "text-red-600 dark:text-red-400";
                      return (
                        <div key={g._id} className="flex items-center gap-3">
                          <span className="text-xs font-medium w-28 flex-shrink-0 text-gray-500 dark:text-[#8b949e] truncate text-end">
                            {g.name}
                          </span>
                          <div className="flex-1 h-3 bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-1000`}
                              style={{ width: animateProgress ? `${g.attendanceRate}%` : "0%" }}
                            />
                          </div>
                          <span className={`text-xs font-bold w-9 flex-shrink-0 ${text}`}>{g.attendanceRate}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Group cards — exact same as InstructorDashboard "My Groups" */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {groups.map((group) => (
                  <div
                    key={group._id}
                    className="group/card relative bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
                  >
                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-primary/10 to-purple-600/10 rounded-full blur-2xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getLevelGradient(group.courseLevel)} flex items-center justify-center flex-shrink-0 shadow-lg group-hover/card:scale-110 transition-transform`}>
                          <BookOpen className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            group.status === "active"
                              ? "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400"
                              : "bg-gray-100 dark:bg-gray-500/10 text-gray-700 dark:text-gray-400"
                          }`}>
                            {group.status === "active" ? (isRTL ? "نشط" : "Active") : group.status}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium bg-gradient-to-r ${getLevelGradient(group.courseLevel)} text-white`}>
                            {getLevelLabel(group.courseLevel, isRTL)}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-lg font-bold text-gray-900 dark:text-[#e6edf3] mb-1 group-hover/card:text-teal-500 transition-colors line-clamp-1">
                        {group.courseTitle}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-[#8b949e] mb-4">
                        {group.name} · <span className="font-mono text-xs">{group.code}</span>
                      </p>

                      {/* Progress bar — exact same as InstructorDashboard */}
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600 dark:text-[#8b949e]">{isRTL ? "التقدم" : "Progress"}</span>
                          <span className="font-semibold text-gray-900 dark:text-[#e6edf3]">{group.progress}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-200 dark:bg-[#21262d] rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${getLevelGradient(group.courseLevel)} rounded-full relative overflow-hidden transition-all duration-1000`}
                            style={{ width: animateProgress ? `${group.progress}%` : "0%" }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
                          </div>
                        </div>
                      </div>

                      {/* Attendance segmented bar */}
                      {group.totalRecords > 0 && (
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs text-gray-500 dark:text-[#8b949e]">{isRTL ? "توزيع الحضور" : "Attendance"}</span>
                            <RateBadge rate={group.attendanceRate} />
                          </div>
                          <div className="w-full h-2.5 bg-gray-200 dark:bg-[#21262d] rounded-full overflow-hidden flex">
                            {[
                              { v: group.present,  c: "bg-green-400"  },
                              { v: group.late,     c: "bg-yellow-400" },
                              { v: group.excused,  c: "bg-blue-400"   },
                              { v: group.absent,   c: "bg-red-400"    },
                            ].map((seg, j) => (
                              <div key={j} className={`h-full ${seg.c} transition-all duration-1000`}
                                style={{ width: animateProgress ? `${(seg.v / group.totalRecords) * 100}%` : "0%", transitionDelay: `${j * 100}ms` }} />
                            ))}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            {[
                              { v: group.present, c: "bg-green-400",  l: isRTL ? "حاضر"  : "Present"  },
                              { v: group.absent,  c: "bg-red-400",    l: isRTL ? "غائب"  : "Absent"   },
                              { v: group.late,    c: "bg-yellow-400", l: isRTL ? "متأخر" : "Late"     },
                              { v: group.excused, c: "bg-blue-400",   l: isRTL ? "معذور" : "Excused"  },
                            ].map((seg, j) => (
                              <div key={j} className="flex items-center gap-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${seg.c}`} />
                                <span className="text-[10px] text-gray-500 dark:text-[#8b949e]">
                                  {seg.l}: <strong className="text-gray-700 dark:text-[#c9d1d9]">{seg.v}</strong>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Stats row — exact same as InstructorDashboard */}
                      <div className="flex items-center justify-between text-sm border-t border-gray-100 dark:border-[#30363d] pt-4">
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-[#8b949e]">
                          <Users className="w-4 h-4" /><span>{group.currentStudentsCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-[#8b949e]">
                          <BookOpen className="w-4 h-4" /><span>{group.completedSessions}/{group.totalSessions}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-teal-500">
                          <Clock className="w-4 h-4" /><span className="font-semibold">{group.myTeachingHours}h</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {groups.length === 0 && (
                  <div className="col-span-full text-center py-16">
                    <div className="w-24 h-24 mx-auto bg-gray-100 dark:bg-[#21262d] rounded-full flex items-center justify-center mb-4">
                      <Users className="w-12 h-12 text-gray-400 dark:text-[#6e7681]" />
                    </div>
                    <p className="text-gray-500 dark:text-[#8b949e]">{isRTL ? "لا توجد مجموعات" : "No groups found"}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════ SESSIONS ══════════════════ */}
          {activeTab === "sessions" && (
            <div className="space-y-4">
              {sessionReports.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d]">
                  <div className="w-20 h-20 mx-auto bg-gray-100 dark:bg-[#21262d] rounded-full flex items-center justify-center mb-4">
                    <BookOpen className="w-10 h-10 text-gray-400 dark:text-[#6e7681]" />
                  </div>
                  <p className="text-gray-500 dark:text-[#8b949e]">{isRTL ? "لا توجد جلسات مكتملة بعد" : "No completed sessions yet"}</p>
                </div>
              ) : sessionReports.map((session) => (
                /* Same card as InstructorDashboard "Recent Sessions" */
                <div key={session._id} className="flex items-start gap-4 p-5 bg-white dark:bg-[#161b22] rounded-xl border border-gray-100 dark:border-[#30363d] hover:shadow-md transition-all">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-[#e6edf3] truncate">{session.title}</p>
                        <p className="text-xs text-gray-500 dark:text-[#8b949e]">{session.groupName} · {session.date}</p>
                      </div>
                      <RateBadge rate={session.rate} />
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {[
                        { l: isRTL ? "حاضر"  : "Present", v: session.present, c: "text-green-600 dark:text-green-400",  bg: "bg-green-50 dark:bg-green-500/10"   },
                        { l: isRTL ? "غائب"  : "Absent",  v: session.absent,  c: "text-red-600 dark:text-red-400",      bg: "bg-red-50 dark:bg-red-500/10"       },
                        { l: isRTL ? "متأخر" : "Late",    v: session.late,    c: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-500/10" },
                        { l: isRTL ? "معذور" : "Excused", v: session.excused, c: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-500/10"     },
                      ].map((s, j) => (
                        <div key={j} className={`${s.bg} rounded-lg p-2 text-center`}>
                          <p className={`text-base font-bold ${s.c}`}>{s.v}</p>
                          <p className="text-[10px] text-gray-500 dark:text-[#8b949e]">{s.l}</p>
                        </div>
                      ))}
                    </div>
                    {session.total > 0 && (
                      <div className="h-1.5 rounded-full overflow-hidden flex bg-gray-100 dark:bg-[#21262d]">
                        {[session.present, session.absent, session.late, session.excused].map((v, j) => (
                          <div key={j}
                            className={`h-full transition-all duration-700 ${["bg-green-400","bg-red-400","bg-yellow-400","bg-blue-400"][j]}`}
                            style={{ width: animateProgress ? `${(v / session.total) * 100}%` : "0%", transitionDelay: `${j * 60}ms` }} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ══════════════════ STUDENTS ══════════════════ */}
          {activeTab === "students" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                {/* Top Attendees */}
                <div className="bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d]">
                  <h4 className="font-bold text-gray-900 dark:text-[#e6edf3] mb-5 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {isRTL ? "الأعلى حضوراً" : "Top Attendees"}
                  </h4>
                  <div className="space-y-4">
                    {studentReports.slice(0, 5).map((s, i) => (
                      <div key={s._id} className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 ${
                          i === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-500"
                          : i === 1 ? "bg-gradient-to-br from-gray-300 to-gray-400"
                          : i === 2 ? "bg-gradient-to-br from-amber-600 to-amber-700"
                          : "bg-gradient-to-br from-teal-400 to-emerald-500"
                        }`}>{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-[#e6edf3] truncate">{s.name}</p>
                          <div className="h-1.5 bg-gray-100 dark:bg-[#21262d] rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-700"
                              style={{ width: animateProgress ? `${s.attendanceRate}%` : "0%" }} />
                          </div>
                        </div>
                        <RateBadge rate={s.attendanceRate} />
                      </div>
                    ))}
                    {studentReports.length === 0 && <p className="text-sm text-gray-400 text-center py-4">{isRTL ? "لا توجد بيانات" : "No data"}</p>}
                  </div>
                </div>

                {/* Needs Attention */}
                <div className="bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d]">
                  <h4 className="font-bold text-gray-900 dark:text-[#e6edf3] mb-5 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    {isRTL ? "يحتاج متابعة" : "Needs Attention"}
                  </h4>
                  <div className="space-y-4">
                    {[...studentReports].sort((a, b) => a.attendanceRate - b.attendanceRate).slice(0, 5).map((s) => (
                      <div key={s._id} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-[#e6edf3] truncate">{s.name}</p>
                          <p className="text-xs text-red-500">{s.absent} {isRTL ? "غيابات" : "absences"}</p>
                        </div>
                        <RateBadge rate={s.attendanceRate} />
                      </div>
                    ))}
                    {studentReports.length === 0 && <p className="text-sm text-gray-400 text-center py-4">{isRTL ? "لا توجد بيانات" : "No data"}</p>}
                  </div>
                </div>
              </div>

              {/* All Students — same list pattern as InstructorDashboard "Recent Sessions" */}
              <div className="bg-white dark:bg-[#161b22] rounded-2xl shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-[#30363d] flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 dark:text-[#e6edf3] flex items-center gap-2">
                    <Users className="w-5 h-5 text-teal-500" />
                    {isRTL ? "جميع الطلاب" : "All Students"}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-[#8b949e]">{studentReports.length} {isRTL ? "طالب" : "students"}</span>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-[#21262d]">
                  {studentReports.map((student) => (
                    <div key={student._id} className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-[#1c2128] transition-colors">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-[#e6edf3] truncate">{student.name}</p>
                        {student.enrollmentNumber && <p className="text-xs text-gray-400 font-mono">{student.enrollmentNumber}</p>}
                      </div>
                      <div className="hidden sm:flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                          <CheckCircle className="w-3 h-3" />{student.present}
                        </span>
                        <span className="flex items-center gap-1 text-red-500 font-medium">
                          <X className="w-3 h-3" />{student.absent}
                        </span>
                      </div>
                      <RateBadge rate={student.attendanceRate} />
                    </div>
                  ))}
                  {studentReports.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="w-10 h-10 text-gray-300 dark:text-[#6e7681] mx-auto mb-2" />
                      <p className="text-sm text-gray-400 dark:text-[#6e7681]">{isRTL ? "لا توجد بيانات طلاب" : "No student data found"}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* same keyframes as InstructorDashboard */}
      <style jsx>{`
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-shimmer { animation: shimmer 2s infinite; }
      `}</style>
    </div>
  );
}