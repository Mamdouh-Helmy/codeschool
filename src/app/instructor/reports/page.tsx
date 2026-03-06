"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import InstructorSidebar from "../InstructorSidebar";
import InstructorHeader from "../InstructorHeader";
import {
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  CheckCircle,
  X,
  Clock,
  AlertCircle,
  Loader2,
  Filter,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Calendar,
  Award,
} from "lucide-react";
import { useLocale } from "@/app/context/LocaleContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ── Types ──────────────────────────────────────────────

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

// ── Animated Counter ──
const AnimatedCounter = ({
  value,
  suffix = "",
  duration = 1400,
}: {
  value: number;
  suffix?: string;
  duration?: number;
}) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime: number;
    let frame: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * value));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
};

// ── Custom Tooltip ──
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#1c2128] border border-gray-200 dark:border-[#30363d] rounded-xl p-3 shadow-xl text-xs">
      <p className="font-bold text-gray-900 dark:text-[#e6edf3] mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.fill || entry.color }} />
          <span className="text-gray-600 dark:text-[#8b949e]">{entry.name}:</span>
          <span className="font-semibold text-gray-900 dark:text-[#e6edf3]">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// ── Rate Badge ──
const RateBadge = ({ rate }: { rate: number }) => {
  const color =
    rate >= 80
      ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10"
      : rate >= 60
      ? "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10"
      : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10";
  const Icon = rate >= 80 ? ArrowUpRight : rate >= 60 ? Minus : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      <Icon className="w-3 h-3" />
      {rate}%
    </span>
  );
};

const COLORS = {
  present: "#22c55e",
  absent: "#ef4444",
  late: "#f59e0b",
  excused: "#3b82f6",
  teal: "#14b8a6",
  purple: "#8b5cf6",
};

// ── Skeleton ──
const Skeleton = () => (
  <div className="p-6 lg:p-8 space-y-6 animate-pulse">
    <div className="h-8 w-44 bg-gray-200 dark:bg-[#21262d] rounded-xl" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-28 bg-white dark:bg-[#161b22] rounded-2xl" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="h-64 bg-white dark:bg-[#161b22] rounded-2xl" />
      <div className="h-64 bg-white dark:bg-[#161b22] rounded-2xl" />
    </div>
  </div>
);

// ══════════════════════════════════════════════════════
// ── Main Page ──
// ══════════════════════════════════════════════════════
export default function InstructorReports() {
  const { locale } = useLocale();
  const isRTL = locale === "ar";
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportsData | null>(null);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState<"overview" | "groups" | "sessions" | "students">("overview");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [showGroupFilter, setShowGroupFilter] = useState(false);
  const [animateCharts, setAnimateCharts] = useState(false);

  // dummy user – the real one comes from InstructorHeader's own logic
  const user = { id: "", name: "", email: "", role: "instructor" };

  const fetchData = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);
        setError("");
        setAnimateCharts(false);

        const params = new URLSearchParams({ groupId: selectedGroup, period: selectedPeriod });
        const res = await fetch(`/api/instructor/reports?${params}`, { credentials: "include" });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || "Error");
        setData(json.data);
        setTimeout(() => setAnimateCharts(true), 200);
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("token");
    router.push("/");
  };

  // ── Render: loading ──
  if (loading) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22] flex"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="hidden lg:block flex-shrink-0">
          <InstructorSidebar user={null} onLogout={handleLogout} />
        </div>
        <main className="flex-1 min-w-0">
          <Skeleton />
        </main>
      </div>
    );
  }

  // ── Render: error ──
  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0d1117]">
        <div className="text-center max-w-md p-8">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4 animate-pulse" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-[#e6edf3] mb-2">
            {isRTL ? "حدث خطأ" : "Something went wrong"}
          </h3>
          <p className="text-gray-600 dark:text-[#8b949e] mb-4">{error}</p>
          <button
            onClick={() => fetchData()}
            className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            {isRTL ? "إعادة المحاولة" : "Try Again"}
          </button>
        </div>
      </div>
    );
  }

  const { overview, groups, monthlyTrend, sessionReports, studentReports, allGroups } = data!;

  // ── Chart data ──
  const pieData = [
    { name: isRTL ? "حاضر" : "Present", value: overview.totalPresent, color: COLORS.present },
    { name: isRTL ? "غائب" : "Absent", value: overview.totalAbsent, color: COLORS.absent },
    { name: isRTL ? "متأخر" : "Late", value: overview.totalLate, color: COLORS.late },
    { name: isRTL ? "معذور" : "Excused", value: overview.totalExcused, color: COLORS.excused },
  ].filter((d) => d.value > 0);

  const barTrendData = monthlyTrend.map((m) => ({
    name: isRTL ? m.monthAr : m.month,
    [isRTL ? "حاضر" : "Present"]: m.present,
    [isRTL ? "غائب" : "Absent"]: m.absent,
  }));

  const groupBarData = groups.map((g) => ({
    name: g.name.length > 10 ? g.name.slice(0, 10) + "…" : g.name,
    [isRTL ? "معدل الحضور" : "Attendance %"]: g.attendanceRate,
  }));

  const PERIODS = [
    { value: "all", label: "All Time", labelAr: "الكل" },
    { value: "month", label: "Last Month", labelAr: "شهر" },
    { value: "week", label: "Last Week", labelAr: "أسبوع" },
  ];

  const TABS = [
    { key: "overview", label: "Overview", labelAr: "نظرة عامة", icon: TrendingUp },
    { key: "groups", label: "Groups", labelAr: "المجموعات", icon: Users },
    { key: "sessions", label: "Sessions", labelAr: "الجلسات", icon: BookOpen },
    { key: "students", label: "Students", labelAr: "الطلاب", icon: Award },
  ] as const;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22] flex relative"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Refresh pill */}
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
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
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

      {/* Main */}
      <main className="flex-1 min-w-0">
        <InstructorHeader
          user={user as any}
          notifications={[]}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          onRefresh={() => fetchData(true)}
        />

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">

          {/* ── Page header ── */}
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

            {/* Filter controls */}
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
                    className={`w-4 h-4 transition-transform ${showGroupFilter ? "rotate-180" : ""}`}
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

          {/* ── Overview stat cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: isRTL ? "معدل الحضور" : "Attendance Rate",
                value: overview.overallAttendanceRate,
                suffix: "%",
                icon: CheckCircle,
                gradient: "from-teal-500 to-emerald-500",
                hoverBg: "group-hover:from-teal-500/10 group-hover:to-emerald-500/10",
                badge: "bg-teal-100 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400",
                badgeLabel: isRTL ? "حضور" : "Attendance",
                barWidth: overview.overallAttendanceRate,
              },
              {
                label: isRTL ? "إجمالي الجلسات" : "Total Sessions",
                value: overview.totalSessions,
                suffix: "",
                icon: BookOpen,
                gradient: "from-violet-500 to-purple-600",
                hoverBg: "group-hover:from-violet-500/10 group-hover:to-purple-600/10",
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
                gradient: "from-blue-400 to-indigo-500",
                hoverBg: "group-hover:from-blue-400/10 group-hover:to-indigo-500/10",
                badge: "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
                badgeLabel: isRTL ? "طلاب" : "Students",
                barWidth: Math.min((overview.totalStudents / 30) * 100, 100),
              },
              {
                label: isRTL ? "ساعات التدريس" : "Teaching Hours",
                value: overview.totalTeachingHours,
                suffix: "h",
                icon: Clock,
                gradient: "from-amber-400 to-orange-500",
                hoverBg: "group-hover:from-amber-400/10 group-hover:to-orange-500/10",
                badge: "bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
                badgeLabel: isRTL ? "ساعة" : "Hours",
                barWidth: Math.min((overview.totalTeachingHours / 100) * 100, 100),
              },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div
                  key={i}
                  className="group relative bg-white dark:bg-[#161b22] rounded-2xl p-5 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br from-transparent to-transparent ${stat.hoverBg} rounded-2xl transition-all duration-300`}
                  />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${stat.badge}`}>
                        {stat.badgeLabel}
                      </span>
                    </div>
                    <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-[#e6edf3] mb-1">
                      {animateCharts ? (
                        <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                      ) : (
                        `0${stat.suffix}`
                      )}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-[#8b949e]">{stat.label}</p>
                    <div className="mt-3 h-1 w-full bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${stat.gradient} rounded-full transition-all duration-1000 ease-out`}
                        style={{ width: animateCharts ? `${stat.barWidth}%` : "0%" }}
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
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
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

          {/* ════════════════════════════════════════ */}
          {/* OVERVIEW TAB                            */}
          {/* ════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <div className="space-y-6">

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Attendance distribution pie */}
                <div className="bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d]">
                  <h3 className="font-bold text-gray-900 dark:text-[#e6edf3] mb-1 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-teal-500" />
                    {isRTL ? "توزيع الحضور" : "Attendance Distribution"}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-[#8b949e] mb-4">
                    {isRTL ? "إجمالي سجلات الحضور" : "Total attendance records breakdown"}
                  </p>

                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={210}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          formatter={(value) => (
                            <span className="text-xs text-gray-600 dark:text-[#8b949e]">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[210px] flex flex-col items-center justify-center gap-2 text-gray-400">
                      <BarChart3 className="w-10 h-10 opacity-30" />
                      <p className="text-sm">{isRTL ? "لا توجد بيانات بعد" : "No data yet"}</p>
                    </div>
                  )}
                </div>

                {/* Monthly sessions bar chart */}
                <div className="bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d]">
                  <h3 className="font-bold text-gray-900 dark:text-[#e6edf3] mb-1 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-teal-500" />
                    {isRTL ? "الحضور الشهري" : "Monthly Attendance"}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-[#8b949e] mb-4">
                    {isRTL ? "آخر 6 أشهر" : "Last 6 months"}
                  </p>
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={barTrendData} barGap={3}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-10" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        formatter={(v) => (
                          <span className="text-xs text-gray-600 dark:text-[#8b949e]">{v}</span>
                        )}
                      />
                      <Bar
                        dataKey={isRTL ? "حاضر" : "Present"}
                        fill={COLORS.present}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={22}
                      />
                      <Bar
                        dataKey={isRTL ? "غائب" : "Absent"}
                        fill={COLORS.absent}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={22}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Sessions status mini cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  {
                    label: isRTL ? "مكتملة" : "Completed",
                    value: overview.completedSessions,
                    color: "text-green-600 dark:text-green-400",
                    bg: "bg-green-50 dark:bg-green-500/10 border-green-100 dark:border-green-500/20",
                    icon: CheckCircle,
                  },
                  {
                    label: isRTL ? "مجدولة" : "Scheduled",
                    value: overview.scheduledSessions,
                    color: "text-blue-600 dark:text-blue-400",
                    bg: "bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20",
                    icon: Calendar,
                  },
                  {
                    label: isRTL ? "ملغية" : "Cancelled",
                    value: overview.cancelledSessions,
                    color: "text-red-600 dark:text-red-400",
                    bg: "bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20",
                    icon: X,
                  },
                  {
                    label: isRTL ? "مؤجلة" : "Postponed",
                    value: overview.postponedSessions,
                    color: "text-yellow-600 dark:text-yellow-400",
                    bg: "bg-yellow-50 dark:bg-yellow-500/10 border-yellow-100 dark:border-yellow-500/20",
                    icon: Clock,
                  },
                ].map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className={`${s.bg} border rounded-2xl p-4 flex items-center gap-3`}>
                      <Icon className={`w-5 h-5 flex-shrink-0 ${s.color}`} />
                      <div>
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-gray-500 dark:text-[#8b949e]">{s.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Attendance breakdown bars */}
              <div className="bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d]">
                <h3 className="font-bold text-gray-900 dark:text-[#e6edf3] mb-5 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-teal-500" />
                  {isRTL ? "تفاصيل سجلات الحضور" : "Attendance Records Detail"}
                </h3>
                <div className="space-y-4">
                  {[
                    { label: isRTL ? "حاضر" : "Present", value: overview.totalPresent, color: "from-green-400 to-emerald-500", text: "text-green-600 dark:text-green-400" },
                    { label: isRTL ? "غائب" : "Absent", value: overview.totalAbsent, color: "from-red-400 to-red-500", text: "text-red-600 dark:text-red-400" },
                    { label: isRTL ? "متأخر" : "Late", value: overview.totalLate, color: "from-yellow-400 to-amber-500", text: "text-yellow-600 dark:text-yellow-400" },
                    { label: isRTL ? "معذور" : "Excused", value: overview.totalExcused, color: "from-blue-400 to-cyan-500", text: "text-blue-600 dark:text-blue-400" },
                  ].map((item) => {
                    const pct =
                      overview.totalRecords > 0
                        ? Math.round((item.value / overview.totalRecords) * 100)
                        : 0;
                    return (
                      <div key={item.label} className="flex items-center gap-4">
                        <span className={`text-sm font-semibold w-16 flex-shrink-0 ${item.text}`}>
                          {item.label}
                        </span>
                        <div className="flex-1 h-2.5 bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-1000 ease-out`}
                            style={{ width: animateCharts ? `${pct}%` : "0%" }}
                          />
                        </div>
                        <div className="flex items-center gap-2 w-20 flex-shrink-0">
                          <span className={`text-sm font-bold ${item.text}`}>{item.value}</span>
                          <span className="text-xs text-gray-400">({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════ */}
          {/* GROUPS TAB                              */}
          {/* ════════════════════════════════════════ */}
          {activeTab === "groups" && (
            <div className="space-y-6">

              {/* Groups bar chart */}
              {groupBarData.length > 0 && (
                <div className="bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d]">
                  <h3 className="font-bold text-gray-900 dark:text-[#e6edf3] mb-1 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-teal-500" />
                    {isRTL ? "معدل حضور المجموعات" : "Groups Attendance Rate"}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-[#8b949e] mb-5">
                    {isRTL ? "مقارنة بين المجموعات" : "Comparison across groups"}
                  </p>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={groupBarData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-10" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} domain={[0, 100]} unit="%" />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey={isRTL ? "معدل الحضور" : "Attendance %"}
                        fill={COLORS.teal}
                        radius={[6, 6, 0, 0]}
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Groups cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {groups.map((group) => (
                  <div
                    key={group._id}
                    className="bg-white dark:bg-[#161b22] rounded-2xl p-5 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 dark:text-[#e6edf3] truncate">
                          {group.courseTitle}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-[#8b949e] mt-0.5">
                          {group.name} · <span className="font-mono">{group.code}</span>
                        </p>
                      </div>
                      <RateBadge rate={group.attendanceRate} />
                    </div>

                    {/* Progress bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-500 dark:text-[#8b949e] mb-1.5">
                        <span>{isRTL ? "اكتمال الجلسات" : "Session Completion"}</span>
                        <span className="font-semibold text-gray-900 dark:text-[#e6edf3]">
                          {group.completedSessions}/{group.totalSessions}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-700"
                          style={{ width: animateCharts ? `${group.progress}%` : "0%" }}
                        />
                      </div>
                    </div>

                    {/* Attendance mini bars */}
                    <div className="space-y-2 mb-4">
                      {[
                        { label: isRTL ? "حاضر" : "Present", value: group.present, color: "bg-green-400" },
                        { label: isRTL ? "غائب" : "Absent", value: group.absent, color: "bg-red-400" },
                        { label: isRTL ? "متأخر" : "Late", value: group.late, color: "bg-yellow-400" },
                      ].map((item) => {
                        const pct =
                          group.totalRecords > 0
                            ? Math.round((item.value / group.totalRecords) * 100)
                            : 0;
                        return (
                          <div key={item.label} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-[#8b949e] w-14 flex-shrink-0">
                              {item.label}
                            </span>
                            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                              <div
                                className={`h-full ${item.color} rounded-full transition-all duration-700`}
                                style={{ width: animateCharts ? `${pct}%` : "0%" }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 dark:text-[#8b949e] w-6 text-end">
                              {item.value}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer stats */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#30363d] text-xs text-gray-500 dark:text-[#8b949e]">
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        <span>{group.currentStudentsCount} {isRTL ? "طالب" : "students"}</span>
                      </div>
                      <div className="flex items-center gap-1 text-teal-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-semibold">{group.myTeachingHours}h</span>
                      </div>
                    </div>
                  </div>
                ))}

                {groups.length === 0 && (
                  <div className="col-span-full text-center py-16">
                    <Users className="w-12 h-12 text-gray-300 dark:text-[#6e7681] mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-[#8b949e]">
                      {isRTL ? "لا توجد مجموعات" : "No groups found"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════ */}
          {/* SESSIONS TAB                            */}
          {/* ════════════════════════════════════════ */}
          {activeTab === "sessions" && (
            <div className="space-y-4">
              {sessionReports.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d]">
                  <BookOpen className="w-12 h-12 text-gray-300 dark:text-[#6e7681] mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-[#8b949e]">
                    {isRTL ? "لا توجد جلسات مكتملة بعد" : "No completed sessions yet"}
                  </p>
                </div>
              ) : (
                sessionReports.map((session) => (
                  <div
                    key={session._id}
                    className="bg-white dark:bg-[#161b22] rounded-2xl p-5 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-md hover:dark:border-[#3d444d] transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 dark:text-[#e6edf3] truncate">
                          {session.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-[#8b949e] mt-0.5">
                          {session.groupName} · {session.date}
                        </p>
                      </div>
                      <RateBadge rate={session.rate} />
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: isRTL ? "حاضر" : "Present", value: session.present, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-500/10" },
                        { label: isRTL ? "غائب" : "Absent", value: session.absent, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10" },
                        { label: isRTL ? "متأخر" : "Late", value: session.late, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-500/10" },
                        { label: isRTL ? "معذور" : "Excused", value: session.excused, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
                      ].map((s, i) => (
                        <div key={i} className={`${s.bg} rounded-xl p-2.5 text-center`}>
                          <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                          <p className="text-[10px] text-gray-500 dark:text-[#8b949e]">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Attendance bar */}
                    <div className="mt-3 h-1.5 bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden flex gap-0.5">
                      {session.total > 0 && (
                        <>
                          <div
                            className="h-full bg-green-400 transition-all duration-700"
                            style={{ width: animateCharts ? `${(session.present / session.total) * 100}%` : "0%" }}
                          />
                          <div
                            className="h-full bg-red-400 transition-all duration-700"
                            style={{ width: animateCharts ? `${(session.absent / session.total) * 100}%` : "0%" }}
                          />
                          <div
                            className="h-full bg-yellow-400 transition-all duration-700"
                            style={{ width: animateCharts ? `${(session.late / session.total) * 100}%` : "0%" }}
                          />
                          <div
                            className="h-full bg-blue-400 transition-all duration-700"
                            style={{ width: animateCharts ? `${(session.excused / session.total) * 100}%` : "0%" }}
                          />
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ════════════════════════════════════════ */}
          {/* STUDENTS TAB                            */}
          {/* ════════════════════════════════════════ */}
          {activeTab === "students" && (
            <div className="space-y-6">

              {/* Top / bottom performers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                {/* Top attendees */}
                <div className="bg-white dark:bg-[#161b22] rounded-2xl p-5 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d]">
                  <h4 className="font-bold text-gray-900 dark:text-[#e6edf3] mb-4 flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {isRTL ? "الأعلى حضوراً" : "Top Attendees"}
                  </h4>
                  <div className="space-y-3">
                    {studentReports.slice(0, 5).map((s, i) => (
                      <div key={s._id} className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 ${
                            i === 0
                              ? "bg-gradient-to-br from-yellow-400 to-amber-500"
                              : i === 1
                              ? "bg-gradient-to-br from-gray-300 to-gray-400"
                              : i === 2
                              ? "bg-gradient-to-br from-amber-600 to-amber-700"
                              : "bg-gradient-to-br from-teal-400 to-emerald-500"
                          }`}
                        >
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-[#e6edf3] truncate">
                            {s.name}
                          </p>
                          <div className="h-1 bg-gray-100 dark:bg-[#21262d] rounded-full mt-1 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-700"
                              style={{ width: animateCharts ? `${s.attendanceRate}%` : "0%" }}
                            />
                          </div>
                        </div>
                        <RateBadge rate={s.attendanceRate} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Needs attention */}
                <div className="bg-white dark:bg-[#161b22] rounded-2xl p-5 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d]">
                  <h4 className="font-bold text-gray-900 dark:text-[#e6edf3] mb-4 flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    {isRTL ? "يحتاج متابعة" : "Needs Attention"}
                  </h4>
                  <div className="space-y-3">
                    {[...studentReports]
                      .sort((a, b) => a.attendanceRate - b.attendanceRate)
                      .slice(0, 5)
                      .map((s) => (
                        <div key={s._id} className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-[#e6edf3] truncate">
                              {s.name}
                            </p>
                            <p className="text-xs text-red-500">
                              {s.absent} {isRTL ? "غيابات" : "absences"}
                            </p>
                          </div>
                          <RateBadge rate={s.attendanceRate} />
                        </div>
                      ))}
                    {studentReports.length === 0 && (
                      <p className="text-sm text-gray-400 dark:text-[#6e7681] text-center py-4">
                        {isRTL ? "لا توجد بيانات" : "No data"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* All students list */}
              <div className="bg-white dark:bg-[#161b22] rounded-2xl shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-[#30363d] flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 dark:text-[#e6edf3] flex items-center gap-2">
                    <Users className="w-5 h-5 text-teal-500" />
                    {isRTL ? "جميع الطلاب" : "All Students"}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-[#8b949e]">
                    {studentReports.length} {isRTL ? "طالب" : "students"}
                  </span>
                </div>

                <div className="divide-y divide-gray-50 dark:divide-[#21262d]">
                  {studentReports.map((student) => (
                    <div
                      key={student._id}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-[#1c2128] transition-colors"
                    >
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {student.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-[#e6edf3] truncate">
                          {student.name}
                        </p>
                        {student.enrollmentNumber && (
                          <p className="text-xs text-gray-400 font-mono">{student.enrollmentNumber}</p>
                        )}
                      </div>

                      {/* Attendance pills */}
                      <div className="hidden sm:flex items-center gap-2 text-xs">
                        <span className="text-green-600 dark:text-green-400 font-semibold">
                          {student.present}✓
                        </span>
                        <span className="text-red-500 font-semibold">{student.absent}✗</span>
                        <span className="text-yellow-600 dark:text-yellow-400 font-semibold">
                          {student.late}~
                        </span>
                      </div>

                      {/* Rate */}
                      <RateBadge rate={student.attendanceRate} />
                    </div>
                  ))}

                  {studentReports.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="w-10 h-10 text-gray-300 dark:text-[#6e7681] mx-auto mb-2" />
                      <p className="text-sm text-gray-400 dark:text-[#6e7681]">
                        {isRTL ? "لا توجد بيانات طلاب" : "No student data found"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}