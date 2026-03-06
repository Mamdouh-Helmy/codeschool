"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  Download,
  Filter,
  ChevronDown,
  Award,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
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
  late: number;
  excused: number;
  total: number;
  rate: number;
}

interface SessionReport {
  _id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
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
  email: string;
  gender: string;
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
const AnimatedCounter = ({ value, suffix = "", duration = 1500 }: { value: number; suffix?: string; duration?: number }) => {
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
  return <span>{count.toLocaleString()}{suffix}</span>;
};

// ── Custom Tooltip ──
const CustomTooltip = ({ active, payload, label, isRTL }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#1c2128] border border-gray-200 dark:border-[#30363d] rounded-xl p-3 shadow-xl text-xs">
      <p className="font-bold text-gray-900 dark:text-[#e6edf3] mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-gray-600 dark:text-[#8b949e]">{entry.name}:</span>
          <span className="font-semibold text-gray-900 dark:text-[#e6edf3]">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// ── Attendance Rate Badge ──
const RateBadge = ({ rate }: { rate: number }) => {
  const color = rate >= 80 ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10"
    : rate >= 60 ? "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10"
    : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10";
  const Icon = rate >= 80 ? ArrowUpRight : rate >= 60 ? Minus : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      <Icon className="w-3 h-3" />
      {rate}%
    </span>
  );
};

const ATTENDANCE_COLORS = {
  present: "#22c55e",
  absent: "#ef4444",
  late: "#f59e0b",
  excused: "#3b82f6",
};

// ── Skeleton ──
const ReportsSkeleton = () => (
  <div className="p-6 lg:p-8 space-y-6">
    <div className="h-10 w-48 bg-gray-200 dark:bg-[#21262d] rounded-xl animate-pulse" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-32 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="h-72 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse" />
      <div className="h-72 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse" />
    </div>
  </div>
);

// ── Tab Button ──
const TabBtn = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
      active
        ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/20"
        : "text-gray-600 dark:text-[#8b949e] hover:bg-gray-100 dark:hover:bg-[#21262d]"
    }`}
  >
    {children}
  </button>
);

// ── Export helper ──
const exportToCSV = (data: any[], filename: string) => {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(","), ...data.map((row) => keys.map((k) => `"${row[k] ?? ""}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// ══════════════════════════════════════════════════════════
// ── Main Page ──
// ══════════════════════════════════════════════════════════
export default function InstructorReports() {
  const { locale } = useLocale();
  const isRTL = locale === "ar";
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [reportsData, setReportsData] = useState<ReportsData | null>(null);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "groups" | "sessions" | "students">("overview");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [showGroupFilter, setShowGroupFilter] = useState(false);
  const [animateCharts, setAnimateCharts] = useState(false);

  const user = { id: "", name: "", email: "", role: "instructor" };

  const fetchData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      setAnimateCharts(false);

      const params = new URLSearchParams({ groupId: selectedGroup, period: selectedPeriod });
      const res = await fetch(`/api/instructor/reports?${params}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Error");
      setReportsData(json.data);
      setTimeout(() => setAnimateCharts(true), 200);
    } catch (err: any) {
      setError(err.message);
      if (err.message?.includes("UNAUTHORIZED")) router.push("/signin");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedGroup, selectedPeriod, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("token");
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22] flex" dir={isRTL ? "rtl" : "ltr"}>
        <div className="hidden lg:block flex-shrink-0">
          <InstructorSidebar user={null} onLogout={handleLogout} />
        </div>
        <main className="flex-1 min-w-0">
          <ReportsSkeleton />
        </main>
      </div>
    );
  }

  if (error && !reportsData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0d1117]">
        <div className="text-center max-w-md p-8">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4 animate-pulse" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-[#e6edf3] mb-2">{isRTL ? "حدث خطأ" : "Something went wrong"}</h3>
          <p className="text-gray-600 dark:text-[#8b949e] mb-4">{error}</p>
          <button onClick={() => fetchData()} className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-semibold">
            {isRTL ? "إعادة المحاولة" : "Try Again"}
          </button>
        </div>
      </div>
    );
  }

  const { overview, groups, monthlyTrend, sessionReports, studentReports, allGroups } = reportsData!;

  const pieData = [
    { name: isRTL ? "حاضر" : "Present", value: overview.totalPresent, color: ATTENDANCE_COLORS.present },
    { name: isRTL ? "غائب" : "Absent", value: overview.totalAbsent, color: ATTENDANCE_COLORS.absent },
    { name: isRTL ? "متأخر" : "Late", value: overview.totalLate, color: ATTENDANCE_COLORS.late },
    { name: isRTL ? "معذور" : "Excused", value: overview.totalExcused, color: ATTENDANCE_COLORS.excused },
  ].filter((d) => d.value > 0);

  const trendData = monthlyTrend.map((m) => ({
    ...m,
    label: isRTL ? m.monthAr : m.month,
    [isRTL ? "حاضر" : "Present"]: m.present,
    [isRTL ? "غائب" : "Absent"]: m.absent,
    [isRTL ? "متأخر" : "Late"]: m.late,
    [isRTL ? "معذور" : "Excused"]: m.excused,
    [isRTL ? "معدل الحضور" : "Rate"]: m.rate,
  }));

  const groupBarData = groups.map((g) => ({
    name: g.name.length > 12 ? g.name.slice(0, 12) + "…" : g.name,
    [isRTL ? "معدل الحضور" : "Attendance %"]: g.attendanceRate,
    [isRTL ? "اكتمال الجلسات" : "Completion %"]: g.progress,
  }));

  const PERIODS = [
    { value: "all", label: "All Time", labelAr: "الكل" },
    { value: "month", label: "Last Month", labelAr: "الشهر الماضي" },
    { value: "week", label: "Last Week", labelAr: "الأسبوع الماضي" },
  ];

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22] flex relative"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Refresh indicator */}
      {refreshing && (
        <div className={`fixed top-4 ${isRTL ? "left-4" : "right-4"} z-50 bg-teal-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2`}>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">{isRTL ? "جاري التحديث..." : "Refreshing..."}</span>
        </div>
      )}

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 ${isRTL ? "right-0" : "left-0"} z-50 transform transition-all duration-500
          ${sidebarOpen ? "translate-x-0" : (isRTL ? "translate-x-full" : "-translate-x-full") + " lg:translate-x-0"}
          flex-shrink-0`}
      >
        <InstructorSidebar user={user as any} onLogout={handleLogout} />
      </div>

      <main className="flex-1 min-w-0">
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
                {isRTL ? "تحليل شامل لأداء التدريس والحضور" : "Comprehensive analysis of teaching performance & attendance"}
              </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Period filter */}
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

              {/* Group filter */}
              <div className="relative">
                <button
                  onClick={() => setShowGroupFilter(!showGroupFilter)}
                  className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl text-sm text-gray-700 dark:text-[#8b949e] hover:border-teal-500 transition-all"
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {selectedGroup === "all"
                      ? (isRTL ? "كل المجموعات" : "All Groups")
                      : allGroups.find((g) => g._id === selectedGroup)?.name || "Group"}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showGroupFilter ? "rotate-180" : ""}`} />
                </button>
                {showGroupFilter && (
                  <div className={`absolute top-full mt-2 ${isRTL ? "left-0" : "right-0"} w-56 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl shadow-xl z-20 overflow-hidden`}>
                    <button
                      onClick={() => { setSelectedGroup("all"); setShowGroupFilter(false); }}
                      className={`w-full text-start px-4 py-2.5 text-sm transition-colors ${selectedGroup === "all" ? "bg-teal-50 dark:bg-teal-500/10 text-teal-600 font-semibold" : "text-gray-700 dark:text-[#8b949e] hover:bg-gray-50 dark:hover:bg-[#21262d]"}`}
                    >
                      {isRTL ? "كل المجموعات" : "All Groups"}
                    </button>
                    {allGroups.map((g) => (
                      <button
                        key={g._id}
                        onClick={() => { setSelectedGroup(g._id); setShowGroupFilter(false); }}
                        className={`w-full text-start px-4 py-2.5 text-sm transition-colors ${selectedGroup === g._id ? "bg-teal-50 dark:bg-teal-500/10 text-teal-600 font-semibold" : "text-gray-700 dark:text-[#8b949e] hover:bg-gray-50 dark:hover:bg-[#21262d]"}`}
                      >
                        <p className="font-medium truncate">{g.courseTitle}</p>
                        <p className="text-xs text-gray-400">{g.name}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Export */}
              <button
                onClick={() => {
                  if (activeTab === "students") exportToCSV(studentReports, "students-report.csv");
                  else if (activeTab === "sessions") exportToCSV(sessionReports, "sessions-report.csv");
                  else if (activeTab === "groups") exportToCSV(groups, "groups-report.csv");
                  else exportToCSV([overview], "overview-report.csv");
                }}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-teal-500/20 transition-all hover:scale-105"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">{isRTL ? "تصدير CSV" : "Export CSV"}</span>
              </button>
            </div>
          </div>

          {/* ── Overview Stats ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: isRTL ? "معدل الحضور" : "Attendance Rate",
                value: overview.overallAttendanceRate,
                suffix: "%",
                icon: CheckCircle,
                gradient: "from-teal-500 to-emerald-500",
                bg: "from-teal-500/0 to-emerald-500/0 hover:from-teal-500/10 hover:to-emerald-500/10",
                badge: "bg-teal-100 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400",
                badgeLabel: isRTL ? "حضور" : "Attendance",
                bar: overview.overallAttendanceRate,
              },
              {
                label: isRTL ? "إجمالي الجلسات" : "Total Sessions",
                value: overview.totalSessions,
                suffix: "",
                icon: BookOpen,
                gradient: "from-violet-500 to-purple-600",
                bg: "from-violet-500/0 to-purple-600/0 hover:from-violet-500/10 hover:to-purple-600/10",
                badge: "bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400",
                badgeLabel: isRTL ? "جلسات" : "Sessions",
                bar: overview.totalSessions > 0 ? Math.round((overview.completedSessions / overview.totalSessions) * 100) : 0,
              },
              {
                label: isRTL ? "إجمالي الطلاب" : "Total Students",
                value: overview.totalStudents,
                suffix: "",
                icon: Users,
                gradient: "from-blue-400 to-indigo-500",
                bg: "from-blue-400/0 to-indigo-500/0 hover:from-blue-400/10 hover:to-indigo-500/10",
                badge: "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
                badgeLabel: isRTL ? "طلاب" : "Students",
                bar: Math.min((overview.totalStudents / 30) * 100, 100),
              },
              {
                label: isRTL ? "ساعات التدريس" : "Teaching Hours",
                value: overview.totalTeachingHours,
                suffix: "h",
                icon: Clock,
                gradient: "from-amber-400 to-orange-500",
                bg: "from-amber-400/0 to-orange-500/0 hover:from-amber-400/10 hover:to-orange-500/10",
                badge: "bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
                badgeLabel: isRTL ? "ساعة" : "Hours",
                bar: Math.min((overview.totalTeachingHours / 100) * 100, 100),
              },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div
                  key={i}
                  className={`group relative bg-white dark:bg-[#161b22] rounded-2xl p-5 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 hover:-translate-y-1`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.bg} rounded-2xl transition-all duration-300`} />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${stat.badge}`}>
                        {stat.badgeLabel}
                      </span>
                    </div>
                    <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-[#e6edf3] mb-1">
                      {animateCharts ? <AnimatedCounter value={stat.value} suffix={stat.suffix} /> : `0${stat.suffix}`}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-[#8b949e]">{stat.label}</p>
                    <div className="mt-3 h-1 w-full bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${stat.gradient} rounded-full transition-all duration-1000 ease-out`}
                        style={{ width: animateCharts ? `${stat.bar}%` : "0%" }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Tabs ── */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { key: "overview", label: "Overview", labelAr: "نظرة عامة", icon: TrendingUp },
              { key: "groups", label: "Groups", labelAr: "المجموعات", icon: Users },
              { key: "sessions", label: "Sessions", labelAr: "الجلسات", icon: BookOpen },
              { key: "students", label: "Students", labelAr: "الطلاب", icon: Award },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    activeTab === tab.key
                      ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/20"
                      : "text-gray-600 dark:text-[#8b949e] hover:bg-gray-100 dark:hover:bg-[#21262d] bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {isRTL ? tab.labelAr : tab.label}
                </button>
              );
            })}
          </div>

          {/* ══════════════════════════════════════════════ */}
          {/* ── OVERVIEW TAB ── */}
          {/* ══════════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Attendance Trend Line Chart */}
                <div className="bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d]">
                  <h3 className="font-bold text-gray-900 dark:text-[#e6edf3] mb-1 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-teal-500" />
                    {isRTL ? "اتجاه الحضور (آخر 6 أشهر)" : "Attendance Trend (Last 6 Months)"}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-[#8b949e] mb-5">
                    {isRTL ? "معدل الحضور الشهري" : "Monthly attendance rate"}
                  </p>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-10" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} domain={[0, 100]} unit="%" />
                      <Tooltip content={<CustomTooltip isRTL={isRTL} />} />
                      <Area
                        type="monotone"
                        dataKey={isRTL ? "معدل الحضور" : "Rate"}
                        stroke="#14b8a6"
                        strokeWidth={3}
                        fill="url(#tealGrad)"
                        dot={{ fill: "#14b8a6", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Pie Chart - Attendance Breakdown */}
                <div className="bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d]">
                  <h3 className="font-bold text-gray-900 dark:text-[#e6edf3] mb-1 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-teal-500" />
                    {isRTL ? "توزيع الحضور" : "Attendance Distribution"}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-[#8b949e] mb-5">
                    {isRTL ? "تحليل حالات الحضور" : "Breakdown of attendance statuses"}
                  </p>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip isRTL={isRTL} />} />
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
                    <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
                      {isRTL ? "لا توجد بيانات" : "No data available"}
                    </div>
                  )}
                </div>
              </div>

              {/* Monthly Sessions Bar Chart */}
              <div className="bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d]">
                <h3 className="font-bold text-gray-900 dark:text-[#e6edf3] mb-1 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-500" />
                  {isRTL ? "الجلسات الشهرية حسب حالة الحضور" : "Monthly Sessions by Attendance Status"}
                </h3>
                <p className="text-xs text-gray-500 dark:text-[#8b949e] mb-5">
                  {isRTL ? "تفصيل سجلات الحضور لكل شهر" : "Attendance records breakdown per month"}
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={trendData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-10" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
                    <Tooltip content={<CustomTooltip isRTL={isRTL} />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(v) => <span className="text-xs text-gray-600 dark:text-[#8b949e]">{v}</span>}
                    />
                    <Bar dataKey={isRTL ? "حاضر" : "Present"} fill={ATTENDANCE_COLORS.present} radius={[4, 4, 0, 0]} maxBarSize={20} />
                    <Bar dataKey={isRTL ? "غائب" : "Absent"} fill={ATTENDANCE_COLORS.absent} radius={[4, 4, 0, 0]} maxBarSize={20} />
                    <Bar dataKey={isRTL ? "متأخر" : "Late"} fill={ATTENDANCE_COLORS.late} radius={[4, 4, 0, 0]} maxBarSize={20} />
                    <Bar dataKey={isRTL ? "معذور" : "Excused"} fill={ATTENDANCE_COLORS.excused} radius={[4, 4, 0, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Quick stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: isRTL ? "مكتملة" : "Completed", value: overview.completedSessions, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-500/10" },
                  { label: isRTL ? "مجدولة" : "Scheduled", value: overview.scheduledSessions, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
                  { label: isRTL ? "ملغية" : "Cancelled", value: overview.cancelledSessions, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10" },
                  { label: isRTL ? "مؤجلة" : "Postponed", value: overview.postponedSessions, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-500/10" },
                ].map((s, i) => (
                  <div key={i} className={`${s.bg} rounded-xl p-4 text-center`}>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500 dark:text-[#8b949e] mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════ */}
          {/* ── GROUPS TAB ── */}
          {/* ══════════════════════════════════════════════ */}
          {activeTab === "groups" && (
            <div className="space-y-6">
              {/* Bar chart */}
              {groupBarData.length > 0 && (
                <div className="bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d]">
                  <h3 className="font-bold text-gray-900 dark:text-[#e6edf3] mb-5 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-teal-500" />
                    {isRTL ? "مقارنة المجموعات" : "Groups Comparison"}
                  </h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={groupBarData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-10" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} domain={[0, 100]} unit="%" />
                      <Tooltip content={<CustomTooltip isRTL={isRTL} />} />
                      <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-gray-600 dark:text-[#8b949e]">{v}</span>} />
                      <Bar dataKey={isRTL ? "معدل الحضور" : "Attendance %"} fill="#14b8a6" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      <Bar dataKey={isRTL ? "اكتمال الجلسات" : "Completion %"} fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Groups table */}
              <div className="bg-white dark:bg-[#161b22] rounded-2xl shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-[#30363d] flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 dark:text-[#e6edf3] flex items-center gap-2">
                    <Users className="w-5 h-5 text-teal-500" />
                    {isRTL ? "تفاصيل المجموعات" : "Groups Details"}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-[#8b949e]">{groups.length} {isRTL ? "مجموعة" : "groups"}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-[#30363d]">
                        {[
                          isRTL ? "المجموعة" : "Group",
                          isRTL ? "الطلاب" : "Students",
                          isRTL ? "الجلسات" : "Sessions",
                          isRTL ? "الحضور" : "Attendance",
                          isRTL ? "التقدم" : "Progress",
                          isRTL ? "ساعاتي" : "My Hours",
                        ].map((h, i) => (
                          <th key={i} className="px-4 py-3 text-start text-xs font-semibold text-gray-500 dark:text-[#8b949e] uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((group, i) => (
                        <tr key={group._id} className={`border-b border-gray-50 dark:border-[#21262d] hover:bg-gray-50 dark:hover:bg-[#21262d] transition-colors ${i % 2 === 0 ? "" : "bg-gray-50/50 dark:bg-[#1c2128]/50"}`}>
                          <td className="px-4 py-3.5">
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-[#e6edf3] truncate max-w-[160px]">{group.courseTitle}</p>
                              <p className="text-xs text-gray-500 dark:text-[#8b949e]">{group.name} · <span className="font-mono">{group.code}</span></p>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-semibold text-gray-900 dark:text-[#e6edf3]">{group.currentStudentsCount}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-gray-700 dark:text-[#8b949e]">{group.completedSessions}/{group.totalSessions}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <RateBadge rate={group.attendanceRate} />
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-gray-200 dark:bg-[#30363d] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-700"
                                  style={{ width: animateCharts ? `${group.progress}%` : "0%" }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">{group.progress}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-semibold text-teal-600 dark:text-teal-400">{group.myTeachingHours}h</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {groups.length === 0 && (
                    <div className="text-center py-12 text-gray-400 dark:text-[#6e7681]">
                      {isRTL ? "لا توجد مجموعات" : "No groups found"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════ */}
          {/* ── SESSIONS TAB ── */}
          {/* ══════════════════════════════════════════════ */}
          {activeTab === "sessions" && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#161b22] rounded-2xl shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-[#30363d] flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 dark:text-[#e6edf3] flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-teal-500" />
                    {isRTL ? "سجل الجلسات المكتملة" : "Completed Sessions Log"}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-[#8b949e]">{sessionReports.length} {isRTL ? "جلسة" : "sessions"}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-[#30363d]">
                        {[
                          isRTL ? "الجلسة" : "Session",
                          isRTL ? "المجموعة" : "Group",
                          isRTL ? "التاريخ" : "Date",
                          isRTL ? "حاضر" : "Present",
                          isRTL ? "غائب" : "Absent",
                          isRTL ? "متأخر" : "Late",
                          isRTL ? "معذور" : "Excused",
                          isRTL ? "معدل" : "Rate",
                        ].map((h, i) => (
                          <th key={i} className="px-4 py-3 text-start text-xs font-semibold text-gray-500 dark:text-[#8b949e] uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sessionReports.map((session, i) => (
                        <tr key={session._id} className={`border-b border-gray-50 dark:border-[#21262d] hover:bg-gray-50 dark:hover:bg-[#21262d] transition-colors ${i % 2 === 0 ? "" : "bg-gray-50/50 dark:bg-[#1c2128]/50"}`}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900 dark:text-[#e6edf3] truncate max-w-[180px]">{session.title}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-500 dark:text-[#8b949e]">{session.groupName}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-600 dark:text-[#8b949e]">{session.date}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-green-600 dark:text-green-400">{session.present}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-red-500">{session.absent}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-yellow-600 dark:text-yellow-400">{session.late}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-blue-600 dark:text-blue-400">{session.excused}</span>
                          </td>
                          <td className="px-4 py-3">
                            <RateBadge rate={session.rate} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {sessionReports.length === 0 && (
                    <div className="text-center py-12 text-gray-400 dark:text-[#6e7681]">
                      {isRTL ? "لا توجد جلسات مكتملة" : "No completed sessions yet"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════ */}
          {/* ── STUDENTS TAB ── */}
          {/* ══════════════════════════════════════════════ */}
          {activeTab === "students" && (
            <div className="space-y-6">
              {/* Top/Bottom performers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Top attendees */}
                <div className="bg-white dark:bg-[#161b22] rounded-2xl p-5 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d]">
                  <h4 className="font-semibold text-gray-900 dark:text-[#e6edf3] mb-4 flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {isRTL ? "الأعلى حضوراً" : "Top Attendees"}
                  </h4>
                  <div className="space-y-2">
                    {studentReports.slice(0, 5).map((s, i) => (
                      <div key={s._id} className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br ${i === 0 ? "from-yellow-400 to-amber-500" : i === 1 ? "from-gray-300 to-gray-400" : i === 2 ? "from-amber-600 to-amber-700" : "from-teal-400 to-emerald-500"}`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-[#e6edf3] truncate">{s.name}</p>
                          <div className="w-full h-1 bg-gray-100 dark:bg-[#21262d] rounded-full mt-1">
                            <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full" style={{ width: `${s.attendanceRate}%` }} />
                          </div>
                        </div>
                        <RateBadge rate={s.attendanceRate} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Needs attention */}
                <div className="bg-white dark:bg-[#161b22] rounded-2xl p-5 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d]">
                  <h4 className="font-semibold text-gray-900 dark:text-[#e6edf3] mb-4 flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    {isRTL ? "يحتاج متابعة" : "Needs Attention"}
                  </h4>
                  <div className="space-y-2">
                    {[...studentReports].sort((a, b) => a.attendanceRate - b.attendanceRate).slice(0, 5).map((s) => (
                      <div key={s._id} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-[#e6edf3] truncate">{s.name}</p>
                          <p className="text-xs text-red-500">{s.absent} {isRTL ? "غيابات" : "absences"}</p>
                        </div>
                        <RateBadge rate={s.attendanceRate} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Full students table */}
              <div className="bg-white dark:bg-[#161b22] rounded-2xl shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-[#30363d] flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 dark:text-[#e6edf3] flex items-center gap-2">
                    <Users className="w-5 h-5 text-teal-500" />
                    {isRTL ? "تفاصيل الطلاب" : "Student Details"}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-[#8b949e]">{studentReports.length} {isRTL ? "طالب" : "students"}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-[#30363d]">
                        {[
                          isRTL ? "الطالب" : "Student",
                          isRTL ? "حاضر" : "Present",
                          isRTL ? "غائب" : "Absent",
                          isRTL ? "متأخر" : "Late",
                          isRTL ? "معذور" : "Excused",
                          isRTL ? "إجمالي" : "Total",
                          isRTL ? "معدل الحضور" : "Rate",
                        ].map((h, i) => (
                          <th key={i} className="px-4 py-3 text-start text-xs font-semibold text-gray-500 dark:text-[#8b949e] uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {studentReports.map((student, i) => (
                        <tr key={student._id} className={`border-b border-gray-50 dark:border-[#21262d] hover:bg-gray-50 dark:hover:bg-[#21262d] transition-colors ${i % 2 === 0 ? "" : "bg-gray-50/50 dark:bg-[#1c2128]/50"}`}>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-[#e6edf3]">{student.name}</p>
                                {student.enrollmentNumber && (
                                  <p className="text-xs text-gray-400 font-mono">{student.enrollmentNumber}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5"><span className="font-semibold text-green-600 dark:text-green-400">{student.present}</span></td>
                          <td className="px-4 py-3.5"><span className="font-semibold text-red-500">{student.absent}</span></td>
                          <td className="px-4 py-3.5"><span className="font-semibold text-yellow-600 dark:text-yellow-400">{student.late}</span></td>
                          <td className="px-4 py-3.5"><span className="font-semibold text-blue-600 dark:text-blue-400">{student.excused}</span></td>
                          <td className="px-4 py-3.5"><span className="text-gray-600 dark:text-[#8b949e]">{student.totalSessions}</span></td>
                          <td className="px-4 py-3.5"><RateBadge rate={student.attendanceRate} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {studentReports.length === 0 && (
                    <div className="text-center py-12 text-gray-400 dark:text-[#6e7681]">
                      {isRTL ? "لا توجد بيانات طلاب" : "No student data found"}
                    </div>
                  )}
                </div>
              </div>
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