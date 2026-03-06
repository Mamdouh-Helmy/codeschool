"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import InstructorSidebar from "./InstructorSidebar";
import InstructorHeader from "./InstructorHeader";
import {
  Calendar,
  BookOpen,
  Users,
  Clock,
  Award,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Play,
  CheckCircle,
  Bell,
  TrendingUp,
  Sparkles,
  BarChart3,
  X,
  ClipboardList,
  Star,
} from "lucide-react";
import { useLocale } from "@/app/context/LocaleContext";

// ── Types ──────────────────────────────────────────────

interface InstructorUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Stats {
  totalTeachingHours: number;
  totalGroups: number;
  activeGroups: number;
  completedGroups: number;
  totalStudents: number;
  totalSessions: number;
  completedSessions: number;
  scheduledSessions: number;
  cancelledSessions: number;
  postponedSessions: number;
  overallAttendanceRate: number;
  progressPercentage: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalExcused: number;
}

interface ProgressStage {
  id: string;
  label: string;
  labelAr: string;
  percentage: number;
  status: "pending" | "active" | "completed" | "almost_there";
  icon: string;
  gradient: string;
  color: string;
  isActive?: boolean;
}

interface ProgressSummaryCard {
  id: string;
  title: string;
  titleAr: string;
  value: string | number;
  icon: string;
  iconColor: string;
  bgColor: string;
  borderColor: string;
}

interface GroupProgress {
  _id: string;
  name: string;
  code: string;
  status: string;
  courseTitle: string;
  courseLevel: string;
  courseThumbnail: string;
  currentStudentsCount: number;
  maxStudents: number;
  schedule?: any;
  totalSessions: number;
  completedSessions: number;
  remainingSessions: number;
  progress: number;
  myTeachingHours: number;
}

interface UpcomingEvent {
  _id?: string;
  title: string;
  startTime: string;
  endTime: string;
  date?: string;
  formattedDate?: string;
  groupName?: string;
}

interface NextSession {
  _id?: string;
  title: string;
  date: string;
  time: string;
  isToday: boolean;
  meetingLink?: string;
  groupName?: string;
}

interface RecentSession {
  _id?: string;
  title: string;
  date: string;
  time: string;
  groupName?: string;
  presentCount: number;
  absentCount: number;
  totalAttendance: number;
}

interface DashboardData {
  user: InstructorUser;
  stats: Stats;
  progressData: {
    stages: ProgressStage[];
    summaryCards: ProgressSummaryCard[];
  };
  nextSession?: NextSession;
  currentGroups: GroupProgress[];
  upcomingEvents: UpcomingEvent[];
  recentSessions: RecentSession[];
}

interface ApiResponse {
  success: boolean;
  data: DashboardData;
  message?: string;
  error?: string;
}

// ── Animated Counter ──

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

// ── Skeleton ──

const DashboardSkeleton = ({ isRTL }: { isRTL: boolean }) => (
  <div className="min-h-screen bg-gray-50 dark:bg-[#0d1117]">
    <div className="flex">
      <div className="w-64 h-screen bg-white dark:bg-[#161b22] border-l border-gray-200 dark:border-[#30363d] hidden lg:block">
        <div className="p-6 border-b border-gray-200 dark:border-[#30363d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 dark:bg-primary/20 animate-pulse" />
            <div className="flex-1">
              <div className="h-5 w-32 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse mb-2" />
              <div className="h-3 w-24 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="p-3 space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <div className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-[#21262d] animate-pulse" />
              <div className="flex-1 h-4 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <main className="flex-1 min-w-0">
        <div className="h-16 bg-white dark:bg-[#161b22] border-b border-gray-200 dark:border-[#30363d] px-6 flex items-center justify-between">
          <div className="w-8 h-8 bg-gray-200 dark:bg-[#21262d] rounded-lg animate-pulse lg:hidden" />
          <div className={`flex items-center gap-4 ${isRTL ? "mr-auto" : "ml-auto"}`}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-8 h-8 bg-gray-200 dark:bg-[#21262d] rounded-full animate-pulse" />
            ))}
          </div>
        </div>
        <div className="p-6 lg:p-8">
          <div className="bg-gradient-to-br from-primary/20 to-purple-600/20 rounded-3xl p-8 mb-8 animate-pulse h-48" />
          <div className="grid grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-[#161b22] rounded-2xl p-6 h-32 animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    </div>
  </div>
);

// ── Main Component ──

export default function InstructorDashboard() {
  const { locale } = useLocale();
  const isRTL = locale === "ar";
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [animateProgress, setAnimateProgress] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    if (dashboardData) setTimeout(() => setAnimateProgress(true), 300);
  }, [dashboardData]);

  const fetchData = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const res = await fetch("/api/instructor/dashboard", {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const response: ApiResponse = await res.json();

      if (!res.ok || !response.success) throw new Error(response.message || response.error || "Error");
      setDashboardData(response.data);
    } catch (err: any) {
      setError(err.message);
      if (err.message?.includes("UNAUTHORIZED")) router.push("/signin");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("token");
      router.push("/");
    } catch (e) {}
  };

  const getStageIcon = (iconName: string): any => {
    const icons: Record<string, any> = {
      Play, BookOpen, Award, CheckCircle, BarChart3, ClipboardList,
    };
    return icons[iconName] || BookOpen;
  };

  const getStatIcon = (iconName: string): any => {
    const icons: Record<string, any> = {
      CheckCircle, Clock, Award, TrendingUp, Star, X, BarChart3, ClipboardList,
    };
    return icons[iconName] || CheckCircle;
  };

  const getLevelGradient = (level: string) => {
    if (level === "advanced") return "from-red-500 to-orange-500";
    if (level === "intermediate") return "from-blue-500 to-indigo-500";
    return "from-green-500 to-teal-500";
  };

  const getLevelLabel = (level: string) => {
    if (isRTL) {
      if (level === "advanced") return "متقدم";
      if (level === "intermediate") return "متوسط";
      return "مبتدئ";
    }
    return level.charAt(0).toUpperCase() + level.slice(1);
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return isRTL ? "صباح الخير" : "Good Morning";
    if (h < 18) return isRTL ? "مساء الخير" : "Good Afternoon";
    return isRTL ? "مساء الخير" : "Good Evening";
  };

  if (loading) return <DashboardSkeleton isRTL={isRTL} />;

  if (error && !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0d1117]" dir={isRTL ? "rtl" : "ltr"}>
        <div className="text-center max-w-md p-8">
          <div className="w-24 h-24 mx-auto bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="h-12 w-12 text-red-500 animate-pulse" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-[#e6edf3] mb-3">
            {isRTL ? "حدث خطأ" : "Something went wrong"}
          </h3>
          <p className="text-gray-600 dark:text-[#8b949e] mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => fetchData()}
              className="px-6 py-3 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              {isRTL ? "إعادة المحاولة" : "Try Again"}
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-gray-200 dark:bg-[#21262d] text-gray-700 dark:text-[#8b949e] rounded-xl font-semibold transition-all"
            >
              {isRTL ? "الرئيسية" : "Home"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const {
    user,
    stats,
    progressData,
    nextSession,
    currentGroups = [],
    upcomingEvents = [],
    recentSessions = [],
  } = dashboardData!;

  const progressStages = progressData?.stages || [];
  const progressPercentage = stats?.progressPercentage || 0;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22] flex relative"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Refresh indicator */}
      {refreshing && (
        <div className={`fixed top-4 ${isRTL ? "left-4" : "right-4"} z-50 bg-primary text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2`}>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">{isRTL ? "جاري التحديث..." : "Refreshing..."}</span>
        </div>
      )}

      {/* Mobile sidebar backdrop */}
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
        <InstructorSidebar user={user} onLogout={handleLogout} />
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 transition-all duration-300">
        <InstructorHeader
          user={user}
          notifications={[]}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          onRefresh={() => fetchData(true)}
        />

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">

            {/* ── Left Column ── */}
            <div className="lg:col-span-2 space-y-6 lg:space-y-8">

              {/* Hero Banner */}
              <div className="relative group max-w-4xl mx-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-600 to-pink-600 rounded-3xl opacity-60 blur-md group-hover:opacity-80 transition-opacity duration-500" />
                <div className="relative bg-gradient-to-br from-primary via-purple-600 to-pink-600 rounded-3xl p-6 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse-slow" />
                  <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slower" />

                  <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
                    <div className="max-w-xl text-center lg:text-right">
                      <div className="flex items-center gap-2 justify-center lg:justify-start mb-2">
                        <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                        <span className="text-yellow-300 font-medium text-sm">
                          {getGreeting()}, {user?.name?.split(" ")[0] || (isRTL ? "مدرس" : "Instructor")}!
                        </span>
                      </div>

                      <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">
                        {isRTL ? "رحلتك التعليمية" : "Your Teaching Journey"}
                      </h2>

                      <p className="text-blue-100 mb-6 text-base">
                        {isRTL
                          ? `لديك ${stats?.scheduledSessions || 0} جلسة قادمة و ${stats?.totalStudents || 0} طالب`
                          : `You have ${stats?.scheduledSessions || 0} upcoming sessions and ${stats?.totalStudents || 0} students`}
                      </p>

                      <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                        <Link
                          href="/instructor/sessions"
                          className="group/btn relative px-6 py-3 bg-white text-primary rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-1 overflow-hidden text-sm"
                        >
                          <span className="relative z-10">{isRTL ? "الجلسات" : "My Sessions"}</span>
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-white opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                        </Link>
                        <Link
                          href="/instructor/attendance"
                          className="px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/20 transition-all duration-300 border border-white/20 text-sm"
                        >
                          {isRTL ? "تسجيل الحضور" : "Take Attendance"}
                        </Link>
                      </div>
                    </div>

                    <div className="relative w-40 h-40 lg:w-48 lg:h-48 hidden lg:block group-hover:scale-105 transition-transform duration-500">
                      <img
                        src="https://storage.googleapis.com/uxpilot-auth.appspot.com/cc128e889c-1e79b7c5933da33a6e8e.png"
                        alt="Teaching"
                        className="w-full h-full object-contain drop-shadow-lg animate-float"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Cards: Teaching Hours, Students, Attendance Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

                {/* Teaching Hours */}
                <div className="group/stats relative bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 transform hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-purple-600/0 group-hover/stats:from-primary/10 group-hover/stats:to-purple-600/10 rounded-2xl transition-all duration-300" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20 group-hover/stats:scale-110 transition-transform duration-300">
                        <Clock className="w-7 h-7 text-white" />
                      </div>
                      <span className="px-3 py-1 bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full text-xs font-semibold">
                        {isRTL ? "ساعات" : "Hours"}
                      </span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-[#e6edf3] mb-1">
                      <AnimatedCounter value={stats?.totalTeachingHours || 0} />
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-[#8b949e]">
                      {isRTL ? "إجمالي ساعات التدريس" : "Total Teaching Hours"}
                    </p>
                    <div className="mt-4 h-1 w-full bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-purple-600 rounded-full w-3/4" />
                    </div>
                  </div>
                </div>

                {/* Total Students */}
                <div className="group/stats relative bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 transform hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400/0 to-indigo-500/0 group-hover/stats:from-blue-400/10 group-hover/stats:to-indigo-500/10 rounded-2xl transition-all duration-300" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover/stats:scale-110 transition-transform duration-300">
                        <Users className="w-7 h-7 text-white" />
                      </div>
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-semibold">
                        {isRTL ? "طلاب" : "Students"}
                      </span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-[#e6edf3] mb-1">
                      <AnimatedCounter value={stats?.totalStudents || 0} />
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-[#8b949e]">
                      {isRTL ? "إجمالي الطلاب" : "Total Students"}
                    </p>
                    <div className="mt-4 h-1 w-full bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full" style={{ width: `${Math.min((stats?.totalStudents || 0) * 4, 100)}%` }} />
                    </div>
                  </div>
                </div>

                {/* Attendance Rate */}
                <div className="group/stats relative bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 transform hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400/0 to-emerald-500/0 group-hover/stats:from-green-400/10 group-hover/stats:to-emerald-500/10 rounded-2xl transition-all duration-300" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover/stats:scale-110 transition-transform duration-300">
                        <CheckCircle className="w-7 h-7 text-white" />
                      </div>
                      <span className="px-3 py-1 bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-semibold">
                        {isRTL ? "حضور" : "Attendance"}
                      </span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-[#e6edf3] mb-1">
                      <AnimatedCounter value={stats?.overallAttendanceRate || 0} />%
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-[#8b949e]">
                      {isRTL ? "معدل الحضور الإجمالي" : "Overall Attendance Rate"}
                    </p>
                    <div className="mt-4 h-1 w-full bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full" style={{ width: `${stats?.overallAttendanceRate || 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Section */}
              <div className="group/progress relative bg-white dark:bg-[#161b22] rounded-2xl p-6 lg:p-8 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl transition-all duration-300">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-[#e6edf3] mb-2 flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-primary" />
                        {isRTL ? "تقدم التدريس" : "Teaching Progress"}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-[#8b949e]">
                        {isRTL ? "تتبع إنجازاتك التعليمية" : "Track your teaching achievements"}
                      </p>
                    </div>
                  </div>

                  {/* Progress Timeline */}
                  <div className="relative mb-8 w-full">
                    <div className="flex w-full items-stretch">
                      {progressStages.map((stage, index) => {
                        const StageIcon = getStageIcon(stage.icon);
                        const isCompleted = stage.status === "completed";
                        const isActive = stage.isActive || stage.status === "active";
                        const isPending = stage.status === "pending";
                        const isAlmostThere = stage.status === "almost_there";

                        const nextStage = progressStages[index + 1];
                        let lineProgress = 0;
                        if (isCompleted) lineProgress = 100;
                        else if (isActive && nextStage) {
                          const cur = stage.percentage || 0;
                          const nxt = nextStage.percentage || 0;
                          lineProgress = cur > 0 && nxt > 0 ? Math.min((cur / nxt) * 100, 100) : 0;
                        }

                        return (
                          <div key={stage.id} className={`flex items-center ${index === progressStages.length - 1 ? "flex-none" : "flex-1"}`}>
                            <div className="flex flex-col items-center w-16">
                              <div
                                className={`
                                  relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg mb-2 mx-auto
                                  transition-all duration-700 ease-out-expo
                                  ${animateProgress ? "scale-100 opacity-100" : "scale-50 opacity-0"}
                                  ${isCompleted ? `bg-gradient-to-br ${stage.gradient}` : ""}
                                  ${isActive ? `bg-gradient-to-br ${stage.gradient} ring-4 ring-blue-200 dark:ring-blue-500/20 animate-pulse-ring` : ""}
                                  ${isAlmostThere ? `bg-gradient-to-br ${stage.gradient} opacity-60` : ""}
                                  ${isPending ? "bg-gray-100 dark:bg-[#21262d] border-2 border-gray-200 dark:border-[#30363d]" : ""}
                                `}
                                style={{ transitionDelay: `${index * 150}ms` }}
                              >
                                <StageIcon
                                  className={`w-6 h-6 transition-all duration-500 ${isPending ? "text-gray-300 dark:text-[#6e7681]" : "text-white"} ${isActive ? "animate-bounce" : ""}`}
                                />
                                {isActive && (
                                  <>
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-4 border-white dark:border-[#161b22] animate-ping" />
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-4 border-white dark:border-[#161b22]" />
                                  </>
                                )}
                                {isCompleted && (
                                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-[#161b22] flex items-center justify-center">
                                    <CheckCircle className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </div>

                              <div className="text-center w-full">
                                <span
                                  className={`
                                    inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold mb-1
                                    transition-all duration-500
                                    ${animateProgress ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
                                    ${isCompleted ? "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400" : ""}
                                    ${isActive ? "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400" : ""}
                                    ${isAlmostThere ? "bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400" : ""}
                                    ${isPending ? "bg-gray-100 dark:bg-[#21262d] text-gray-500 dark:text-[#6e7681]" : ""}
                                  `}
                                  style={{ transitionDelay: `${index * 150 + 100}ms` }}
                                >
                                  {isCompleted && (isRTL ? "مكتمل" : "Done")}
                                  {isActive && (isRTL ? "جارٍ" : "Active")}
                                  {isAlmostThere && (isRTL ? "قريباً" : "Soon")}
                                  {isPending && (isRTL ? "قادم" : "Pending")}
                                </span>

                                <p
                                  className={`font-semibold text-xs transition-all duration-500 truncate px-1 ${animateProgress ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"} ${isPending ? "text-gray-500 dark:text-[#8b949e]" : "text-gray-900 dark:text-[#e6edf3]"}`}
                                  style={{ transitionDelay: `${index * 150 + 150}ms` }}
                                >
                                  {isRTL ? stage.labelAr : stage.label}
                                </p>

                                <p
                                  className={`text-[10px] transition-all duration-500 ${animateProgress ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"} ${isPending ? "text-gray-400 dark:text-[#6e7681]" : "text-gray-500 dark:text-[#8b949e]"}`}
                                  style={{ transitionDelay: `${index * 150 + 200}ms` }}
                                >
                                  {stage.percentage}%
                                </p>
                              </div>
                            </div>

                            {index < progressStages.length - 1 && (
                              <div className="flex-1 h-2 relative overflow-hidden mx-0.5">
                                <div className="absolute inset-0 bg-gray-200 dark:bg-[#30363d] rounded-full" />
                                <div
                                  className={`absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out-expo bg-gradient-to-r ${stage.gradient}`}
                                  style={{ width: animateProgress ? `${lineProgress}%` : "0%", transitionDelay: `${index * 150 + 300}ms` }}
                                >
                                  {(isCompleted || isActive) && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
                                  )}
                                </div>
                                {isActive && lineProgress > 0 && lineProgress < 100 && (
                                  <div
                                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg transition-all duration-1000 ease-out-expo"
                                    style={{ left: animateProgress ? `${lineProgress}%` : "0%", transitionDelay: `${index * 150 + 300}ms` }}
                                  >
                                    <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75" />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary Cards */}
                  {progressData?.summaryCards && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                      {progressData.summaryCards.map((card, idx) => {
                        const StatIcon = getStatIcon(card.icon);
                        return (
                          <div
                            key={card.id}
                            className={`
                              relative group/card flex items-start gap-3 p-5 rounded-xl border w-full
                              transition-all duration-500 hover:shadow-xl hover:scale-105 cursor-pointer
                              ${animateProgress ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}
                              ${card.bgColor} ${card.borderColor}
                            `}
                            style={{ transitionDelay: `${600 + idx * 100}ms` }}
                          >
                            <div className={`relative z-10 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${card.iconColor}`}>
                              <StatIcon className="w-6 h-6" />
                            </div>
                            <div className="relative z-10 flex-1 min-w-0">
                              <h4 className="text-3xl font-bold text-gray-900 dark:text-[#e6edf3] mb-0.5">
                                {card.value}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-[#8b949e]">
                                {isRTL ? card.titleAr : card.title}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* My Groups */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-[#e6edf3] flex items-center gap-2">
                      <Users className="w-6 h-6 text-primary" />
                      {isRTL ? "مجموعاتي" : "My Groups"}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-[#8b949e] mt-1">
                      {isRTL ? "المجموعات النشطة الخاصة بك" : "Your active teaching groups"}
                    </p>
                  </div>
                  <Link
                    href="/instructor/groups"
                    className="group/link text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1 px-4 py-2 rounded-lg hover:bg-primary/5 transition-all"
                  >
                    {isRTL ? "عرض الكل" : "View All"}
                    {isRTL ? (
                      <ChevronLeft className="w-4 h-4 group-hover/link:-translate-x-1 transition-transform" />
                    ) : (
                      <ChevronRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                    )}
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                  {currentGroups && currentGroups.length > 0 ? (
                    currentGroups.map((group) => (
                      <div
                        key={group._id}
                        className="group/card relative bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 transform hover:-translate-y-1 cursor-pointer overflow-hidden"
                      >
                        <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-primary/10 to-purple-600/10 rounded-full blur-2xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />

                        <div className="relative z-10">
                          <div className="flex items-start justify-between mb-4">
                            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getLevelGradient(group.courseLevel)} flex items-center justify-center flex-shrink-0 shadow-lg group-hover/card:scale-110 transition-transform`}>
                              <BookOpen className="w-7 h-7 text-white" />
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                group.status === "active"
                                  ? "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400"
                                  : "bg-gray-100 dark:bg-gray-500/10 text-gray-700 dark:text-gray-400"
                              }`}>
                                {group.status === "active" ? (isRTL ? "نشط" : "Active") : group.status}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium bg-gradient-to-r ${getLevelGradient(group.courseLevel)} text-white`}>
                                {getLevelLabel(group.courseLevel)}
                              </span>
                            </div>
                          </div>

                          <h4 className="text-lg font-bold text-gray-900 dark:text-[#e6edf3] mb-1 group-hover/card:text-primary transition-colors line-clamp-1">
                            {group.courseTitle}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-[#8b949e] mb-4">
                            {group.name} · <span className="font-mono text-xs">{group.code}</span>
                          </p>

                          {/* Progress bar */}
                          <div className="mb-4">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-gray-600 dark:text-[#8b949e]">
                                {isRTL ? "التقدم" : "Progress"}
                              </span>
                              <span className="font-semibold text-gray-900 dark:text-[#e6edf3]">
                                {group.progress}%
                              </span>
                            </div>
                            <div className="w-full h-2.5 bg-gray-200 dark:bg-[#21262d] rounded-full overflow-hidden">
                              <div
                                className={`h-full bg-gradient-to-r ${getLevelGradient(group.courseLevel)} rounded-full relative overflow-hidden`}
                                style={{ width: `${group.progress}%` }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
                              </div>
                            </div>
                          </div>

                          {/* Stats row */}
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1.5 text-gray-500 dark:text-[#8b949e]">
                              <Users className="w-4 h-4" />
                              <span>{group.currentStudentsCount}/{group.maxStudents}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500 dark:text-[#8b949e]">
                              <BookOpen className="w-4 h-4" />
                              <span>{group.completedSessions}/{group.totalSessions} {isRTL ? "جلسة" : "sessions"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-primary">
                              <Clock className="w-4 h-4" />
                              <span className="font-semibold">{group.myTeachingHours}h</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12">
                      <div className="w-24 h-24 mx-auto bg-gray-100 dark:bg-[#21262d] rounded-full flex items-center justify-center mb-4">
                        <Users className="w-12 h-12 text-gray-400 dark:text-[#6e7681]" />
                      </div>
                      <p className="text-gray-500 dark:text-[#8b949e]">
                        {isRTL ? "لا توجد مجموعات نشطة" : "No active groups"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Sessions */}
              {recentSessions && recentSessions.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-[#e6edf3] flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-primary" />
                      {isRTL ? "الجلسات الأخيرة" : "Recent Sessions"}
                    </h3>
                    <Link href="/instructor/sessions" className="text-primary text-sm hover:underline">
                      {isRTL ? "عرض الكل" : "View all"}
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {recentSessions.map((session) => (
                      <div
                        key={session._id}
                        className="flex items-center gap-4 p-4 bg-white dark:bg-[#161b22] rounded-xl border border-gray-100 dark:border-[#30363d] hover:shadow-md transition-all"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 dark:text-[#e6edf3] truncate">
                            {session.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-[#8b949e]">
                            {session.groupName} · {session.date}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                            <CheckCircle className="w-3 h-3" />
                            {session.presentCount}
                          </span>
                          <span className="flex items-center gap-1 text-red-500 font-medium">
                            <X className="w-3 h-3" />
                            {session.absentCount}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right Column ── */}
            <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24 lg:self-start">

              {/* Calendar & Upcoming Events */}
              <div className="relative group/calendar bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl transition-all duration-300">
                <div className="relative z-10">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-[#e6edf3] mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    {isRTL ? "التقويم" : "Calendar"}
                  </h3>

                  {/* Mini Calendar */}
                  <div className="text-center mb-6">
                    <div className="text-sm font-semibold text-gray-900 dark:text-[#e6edf3] mb-4">
                      {new Date().toLocaleDateString(isRTL ? "ar-EG" : "en-US", { month: "long", year: "numeric" }).toUpperCase()}
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-xs mb-2">
                      {(isRTL ? ["ح", "ن", "ث", "ر", "خ", "ج", "س"] : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]).map((day) => (
                        <div key={day} className="text-gray-500 dark:text-[#6e7681] font-medium py-1">{day}</div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-sm">
                      {Array.from({ length: 35 }, (_, i) => {
                        const today = new Date().getDate();
                        const currentMonth = new Date().getMonth();
                        const firstDay = new Date(new Date().getFullYear(), currentMonth, 1).getDay();
                        const adjustedFirstDay = isRTL ? (firstDay === 0 ? 6 : firstDay - 1) : firstDay;
                        const day = i - (adjustedFirstDay === 0 ? 6 : adjustedFirstDay - 1) + 1;
                        const isToday = day === today;
                        const isValidDay = day > 0 && day <= new Date(new Date().getFullYear(), currentMonth + 1, 0).getDate();

                        return (
                          <button
                            key={i}
                            className={`
                              aspect-square rounded-lg flex items-center justify-center font-medium transition-all text-xs
                              ${isToday && isValidDay
                                ? "bg-gradient-to-br from-primary to-purple-600 text-white shadow-md transform scale-105"
                                : isValidDay
                                  ? "text-gray-700 dark:text-[#8b949e] hover:bg-gray-100 dark:hover:bg-[#21262d]"
                                  : "text-gray-300 dark:text-[#6e7681]"
                              }
                            `}
                            disabled={!isValidDay}
                          >
                            {isValidDay ? day : ""}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Upcoming Events */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-[#8b949e] flex items-center gap-2">
                      <span className="w-1 h-4 bg-primary rounded-full" />
                      {isRTL ? "الجلسات القادمة" : "Upcoming Sessions"}
                    </h4>

                    {upcomingEvents && upcomingEvents.length > 0 ? (
                      upcomingEvents.slice(0, 3).map((event, idx) => (
                        <div
                          key={idx}
                          className={`
                            flex items-start gap-3 p-3 rounded-xl border transition-all hover:shadow-md cursor-pointer
                            ${idx === 0
                              ? "bg-purple-50 dark:bg-primary/5 border-purple-100 dark:border-purple-500/15"
                              : idx === 1
                                ? "bg-blue-50 dark:bg-blue-500/5 border-blue-100 dark:border-blue-500/15"
                                : "bg-green-50 dark:bg-green-500/5 border-green-100 dark:border-green-500/15"
                            }
                          `}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            idx === 0
                              ? "bg-gradient-to-br from-primary to-purple-600"
                              : idx === 1
                                ? "bg-gradient-to-br from-blue-400 to-cyan-500"
                                : "bg-gradient-to-br from-green-400 to-emerald-500"
                          }`}>
                            <Calendar className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 dark:text-[#e6edf3] truncate">
                              {event.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-[#8b949e]">
                              {event.formattedDate || event.date} · {event.startTime} - {event.endTime}
                            </p>
                            {event.groupName && (
                              <p className="text-xs text-primary dark:text-primary mt-0.5 font-medium">
                                {event.groupName}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6">
                        <Calendar className="w-12 h-12 text-gray-300 dark:text-[#6e7681] mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-[#8b949e]">
                          {isRTL ? "لا توجد جلسات قادمة" : "No upcoming sessions"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Next Session Card */}
                  {nextSession && (
                    <div className="mt-6 pt-6 border-t border-gray-100 dark:border-[#30363d]">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-[#8b949e] mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        {nextSession.isToday
                          ? (isRTL ? "جلسة اليوم" : "Today's Session")
                          : (isRTL ? "الجلسة القادمة" : "Next Session")}
                      </h4>

                      <div className="relative bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-[#1c2128] dark:to-[#1c2128] dark:border dark:border-[#30363d] rounded-xl p-4">
                        <p className="font-semibold text-gray-900 dark:text-[#e6edf3]">
                          {nextSession.title}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-[#8b949e] mt-2 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {nextSession.date} · {nextSession.time}
                        </p>
                        {nextSession.groupName && (
                          <p className="text-xs text-primary mt-1 font-medium">{nextSession.groupName}</p>
                        )}
                        {nextSession.isToday && (
                          <div className="mt-3">
                            {nextSession.meetingLink ? (
                              <a
                                href={nextSession.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm bg-gradient-to-r from-primary to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all transform hover:scale-105"
                              >
                                {isRTL ? "بدء الجلسة" : "Start Session"}
                                {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </a>
                            ) : (
                              <Link
                                href="/instructor/attendance"
                                className="inline-flex items-center gap-2 text-sm bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all"
                              >
                                <ClipboardList className="w-4 h-4" />
                                {isRTL ? "تسجيل الحضور" : "Take Attendance"}
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Attendance breakdown quick view */}
              <div className="bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d]">
                <h4 className="font-bold text-gray-900 dark:text-[#e6edf3] mb-4 flex items-center gap-2 text-base">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  {isRTL ? "إحصائيات الحضور" : "Attendance Overview"}
                </h4>

                <div className="space-y-3">
                  {[
                    { label: isRTL ? "حاضر" : "Present", value: stats?.totalPresent || 0, color: "from-green-400 to-emerald-500", bg: "bg-green-100 dark:bg-green-500/10", text: "text-green-600 dark:text-green-400" },
                    { label: isRTL ? "غائب" : "Absent", value: stats?.totalAbsent || 0, color: "from-red-400 to-red-500", bg: "bg-red-100 dark:bg-red-500/10", text: "text-red-600 dark:text-red-400" },
                    { label: isRTL ? "متأخر" : "Late", value: stats?.totalLate || 0, color: "from-yellow-400 to-amber-500", bg: "bg-yellow-100 dark:bg-yellow-500/10", text: "text-yellow-600 dark:text-yellow-400" },
                    { label: isRTL ? "معذور" : "Excused", value: stats?.totalExcused || 0, color: "from-blue-400 to-cyan-500", bg: "bg-blue-100 dark:bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
                  ].map((item) => {
                    const total = (stats?.totalPresent || 0) + (stats?.totalAbsent || 0) + (stats?.totalLate || 0) + (stats?.totalExcused || 0);
                    const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                    return (
                      <div key={item.label} className="flex items-center gap-3">
                        <span className={`text-xs font-medium w-16 flex-shrink-0 ${item.text}`}>{item.label}</span>
                        <div className="flex-1 h-2 bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-1000`}
                            style={{ width: animateProgress ? `${pct}%` : "0%" }}
                          />
                        </div>
                        <span className={`text-xs font-bold w-8 text-right flex-shrink-0 ${item.text}`}>{item.value}</span>
                      </div>
                    );
                  })}
                </div>

                <Link
                  href="/instructor/reports"
                  className="mt-4 block text-center text-sm bg-gradient-to-r from-primary to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all hover:scale-105"
                >
                  {isRTL ? "تقارير مفصلة" : "Detailed Reports"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
        @keyframes pulse-slow { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
        @keyframes pulse-slower { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.4; } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(249,115,22,0.4); } 70% { box-shadow: 0 0 0 10px rgba(249,115,22,0); } 100% { box-shadow: 0 0 0 0 rgba(249,115,22,0); } }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
        .animate-pulse-slower { animation: pulse-slower 6s ease-in-out infinite; }
        .animate-shimmer { animation: shimmer 2s infinite; }
        .animate-pulse-ring { animation: pulse-ring 2s infinite; }
        .ease-out-expo { transition-timing-function: cubic-bezier(0.19, 1, 0.22, 1); }
      `}</style>
    </div>
  );
}