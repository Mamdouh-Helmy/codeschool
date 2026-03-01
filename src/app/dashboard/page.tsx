"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/app/context/LocaleContext";
import StudentSidebar from "./StudentSidebar";
import StudentHeader from "./StudentHeader";
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
  Menu,
  TrendingUp,
  Target,
  Sparkles,
  Star,
  Zap,
  Brain,
  Rocket,
  BarChart3,
  X,
  GraduationCap,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

// ============ Type Definitions ============
interface StudentUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  studentId?: string;
  image?: string | null;
}

interface SystemStats {
  totalStudents?: number;
  totalActiveCourses?: number;
  systemCompletionRate?: number;
  [key: string]: any;
}

interface AttendanceBreakdown {
  attended: number;
  absent: number;
  late: number;
  excused: number;
  completed: number;
  total: number;
}

interface Stats {
  totalSessions?: number;
  completedSessions?: number;
  remainingSessions?: number;
  attendedSessions?: number;
  absentSessions?: number;
  lateSessions?: number;
  excusedSessions?: number;
  attendanceRate?: number;
  progressPercentage?: number;
  totalGroups?: number;
  activeGroups?: number;
  pendingAssignments?: number;
  completedCourses?: number;
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

interface ProgressStatsCard {
  id: string;
  title: string;
  titleAr: string;
  value: string | number;
  icon: string;
  bgColor: string;
  borderColor: string;
  iconColor: string;
}

interface ProgressData {
  stages: ProgressStage[];
  statsCards: ProgressStatsCard[];
  summaryCards?: ProgressStatsCard[];
  [key: string]: any;
}

interface Course {
  _id: string;
  title: string;
  description: string;
  progress: number;
  totalSessions?: number;
  completedSessions?: number;
  remainingSessions?: number;
  totalLessons?: number;
  hoursLeft?: number;
  gradient: string;
  icon: string;
  instructor?: string;
  nextLesson?: string;
  groupName?: string;
  groupCode?: string;
  level?: string;
  status?: string;
}

interface UpcomingEvent {
  _id?: string;
  title: string;
  startTime: string;
  endTime: string;
  date?: string;
  formattedDate?: string;
  type?: string;
  location?: string;
  groupName?: string;
  color?: string;
  icon?: string;
}

interface NextSession {
  _id?: string;
  title: string;
  date: string;
  time: string;
  isToday: boolean;
  meetingLink?: string;
  groupId?: string;
  sessionId?: string;
  groupName?: string;
}

interface Notification {
  id?: string;
  title: string;
  titleAr?: string;
  message?: string;
  time: string;
  type?: string;
  isRead?: boolean;
}

interface DashboardData {
  user: StudentUser;
  stats?: Stats;
  systemStats?: SystemStats;
  attendanceBreakdown?: AttendanceBreakdown;
  progressData?: ProgressData;
  nextSession?: NextSession;
  currentCourses?: Course[];
  upcomingEvents?: UpcomingEvent[];
  notifications?: Notification[];
  groups?: any[];
  sessions?: any[];
  [key: string]: any;
}

interface ApiResponse {
  success: boolean;
  data: DashboardData;
  message?: string;
  error?: string;
}

// ============ Loading Skeleton Component ============
const DashboardSkeleton = () => {
  const { locale } = useLocale();
  const isRTL = locale === "ar";
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0d1117]">
      <div className="flex">
        {/* Sidebar Skeleton */}
        <div className="w-64 h-screen bg-white dark:bg-[#161b22] border-l border-gray-200 dark:border-[#30363d] hidden lg:block">
          <div className="p-6 border-b border-gray-200 dark:border-[#30363d]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/50 to-purple-600/50 animate-pulse" />
              <div className="flex-1">
                <div className="h-5 w-32 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse mb-2" />
                <div className="h-3 w-24 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse" />
              </div>
            </div>
          </div>
          <div className="p-3 space-y-2">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <div className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-[#21262d] animate-pulse" />
                <div className="flex-1 h-4 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Skeleton */}
        <main className="flex-1 min-w-0">
          {/* Header Skeleton */}
          <div className="h-16 bg-white dark:bg-[#161b22] border-b border-gray-200 dark:border-[#30363d] px-6 flex items-center justify-between">
            <div className="w-8 h-8 bg-gray-200 dark:bg-[#21262d] rounded-lg animate-pulse lg:hidden" />
            <div className={`flex items-center gap-4 ${isRTL ? 'mr-auto' : 'ml-auto'}`}>
              <div className="w-8 h-8 bg-gray-200 dark:bg-[#21262d] rounded-full animate-pulse" />
              <div className="w-8 h-8 bg-gray-200 dark:bg-[#21262d] rounded-full animate-pulse" />
              <div className="w-10 h-10 bg-gray-200 dark:bg-[#21262d] rounded-full animate-pulse" />
            </div>
          </div>

          {/* Content Skeletons */}
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Hero Skeleton */}
            <div className="bg-gradient-to-br from-primary/30 via-lightblue/30 to-lightcyan/30 rounded-3xl p-8 mb-8">
              <div className="max-w-xl">
                <div className="h-8 w-64 bg-white/30 rounded animate-pulse mb-4" />
                <div className="h-4 w-96 bg-white/30 rounded animate-pulse mb-6" />
                <div className="flex gap-3">
                  <div className="h-12 w-32 bg-white/30 rounded-xl animate-pulse" />
                  <div className="h-12 w-32 bg-white/20 rounded-xl animate-pulse" />
                </div>
              </div>
            </div>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-[#161b22] rounded-2xl p-6 border border-gray-100 dark:border-[#30363d]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-[#21262d] animate-pulse" />
                    <div className="w-16 h-6 bg-gray-200 dark:bg-[#21262d] rounded-full animate-pulse" />
                  </div>
                  <div className="h-8 w-24 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse mb-2" />
                  <div className="h-4 w-32 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse" />
                </div>
              ))}
            </div>

            {/* Progress Section Skeleton */}
            <div className="bg-white dark:bg-[#161b22] rounded-2xl p-6 lg:p-8 mb-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="h-6 w-48 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse mb-2" />
                  <div className="h-4 w-64 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse" />
                </div>
                <div className="h-4 w-20 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse" />
              </div>
              <div className="flex justify-between mb-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-[#21262d] animate-pulse mb-2 mx-auto" />
                    <div className="h-3 w-16 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse mb-1 mx-auto" />
                    <div className="h-3 w-12 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse mx-auto" />
                  </div>
                ))}
              </div>
            </div>

            {/* Courses Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-[#161b22] rounded-2xl p-6 border border-gray-100 dark:border-[#30363d]">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-[#21262d] animate-pulse" />
                    <div className="w-20 h-6 bg-gray-200 dark:bg-[#21262d] rounded-full animate-pulse" />
                  </div>
                  <div className="h-5 w-40 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse mb-2" />
                  <div className="h-4 w-full bg-gray-200 dark:bg-[#21262d] rounded animate-pulse mb-2" />
                  <div className="h-4 w-3/4 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse mb-4" />
                  <div className="mb-4">
                    <div className="flex justify-between mb-2">
                      <div className="h-3 w-16 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse" />
                      <div className="h-3 w-8 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse" />
                    </div>
                    <div className="h-2 w-full bg-gray-200 dark:bg-[#21262d] rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// ============ Animated Counter Component ============
const AnimatedCounter = ({ value, duration = 2000 }: { value: number; duration?: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{count.toLocaleString()}</span>;
};

// ============ Main Component ============
export default function StudentDashboard() {
  const { t } = useI18n();
  const { locale } = useLocale();
  const isRTL = locale === "ar";
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string>("");
  const [animateProgress, setAnimateProgress] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    fetchStudentData();
  }, []);

  useEffect(() => {
    if (dashboardData) {
      setTimeout(() => setAnimateProgress(true), 300);
    }
  }, [dashboardData]);

  const fetchStudentData = async (showRefresh = false): Promise<void> => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      const dashboardRes = await fetch(`/api/student/dashboard`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const response: ApiResponse = await dashboardRes.json();

      if (!dashboardRes.ok || !response.success) {
        throw new Error(response.message || response.error || t("common.error"));
      }

      setDashboardData(response.data);
    } catch (error: any) {
      console.error("❌ Error fetching student data:", error);
      setError(error.message || t("common.error"));
      if (error.message?.includes("غير مصرح") || error.message?.includes("UNAUTHORIZED")) {
        router.push("/signin");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      localStorage.removeItem("token");
      router.push("/");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const getCourseIcon = (iconType: string): React.ReactNode => {
    const icons: Record<string, React.ReactNode> = {
      code: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      design: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
      database: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      ),
      smartphone: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    };
    return icons[iconType] || icons.code;
  };

  const getStageIcon = (iconName: string): any => {
    const icons: Record<string, any> = {
      Play: Play,
      BookOpen: BookOpen,
      Award: Award,
      CheckCircle: CheckCircle,
      Brain: Brain,
      Rocket: Rocket,
    };
    return icons[iconName] || BookOpen;
  };

  const getStatIcon = (iconName: string): any => {
    const icons: Record<string, any> = {
      CheckCircle: CheckCircle,
      Clock: Clock,
      Award: Award,
      TrendingUp: TrendingUp,
      Target: Target,
      Star: Star,
      X: X,
      BarChart3: BarChart3,
    };
    return icons[iconName] || CheckCircle;
  };

  // ── Loading State with Skeleton ──
  if (loading) {
    return <DashboardSkeleton />;
  }

  // ── Error State with Better Design ──
  if (error && !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22]" dir={isRTL ? "rtl" : "ltr"}>
        <div className="text-center max-w-md mx-auto p-8">
          <div className="relative mb-6">
            <div className="w-24 h-24 mx-auto bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center">
              <AlertCircle className="h-12 w-12 text-red-500 animate-pulse" />
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-spin-slow" />
          </div>

          <h3 className="text-2xl font-bold text-gray-900 dark:text-[#e6edf3] mb-3">
            {t("common.error")}
          </h3>

          <p className="text-gray-600 dark:text-[#8b949e] mb-6">
            {error}
          </p>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => fetchStudentData()}
              className="px-6 py-3 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 transform hover:scale-105"
            >
              {t("common.tryAgain")}
            </button>

            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-gray-200 dark:bg-[#21262d] text-gray-700 dark:text-[#8b949e] rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-[#30363d] transition-all duration-300"
            >
              {t("common.home")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const {
    user,
    stats,
    systemStats,
    attendanceBreakdown,
    progressData,
    nextSession,
    currentCourses = [],
    upcomingEvents = [],
    notifications = [],
  } = dashboardData || {};

  const currentUser = user || { _id: "", name: t("common.student"), email: "", role: "student", image: null };
  const currentSystemStats = systemStats || { totalStudents: 0, totalActiveCourses: 0, systemCompletionRate: 87 };
  const currentStats = stats || { 
    totalSessions: 0, 
    completedSessions: 0,
    attendedSessions: 0, 
    lateSessions: 0, 
    excusedSessions: 0,
    absentSessions: 0,
    attendanceRate: 0,
    progressPercentage: 0,
    totalGroups: 0,
    activeGroups: 0 
  };

  // ✅ حساب القيم الصحيحة
  const completedSessionsCount = currentStats.completedSessions || 0;
  const totalSessionsCount = currentStats.totalSessions || 0;
  const progressPercentage = currentStats.progressPercentage || 
    (totalSessionsCount > 0 ? Math.round((completedSessionsCount / totalSessionsCount) * 100) : 0);
  
  const attendedSessionsCount = currentStats.attendedSessions || 0;
  const absentSessionsCount = currentStats.absentSessions || 0;
  const lateSessionsCount = currentStats.lateSessions || 0;
  
  // ✅ كل جلسة = ساعتين
  const hoursLearnedCount = completedSessionsCount * 2;
  
  // ✅ الإنجازات (1 لكل 5 جلسات)
  const achievementsCount = Math.min(Math.floor(completedSessionsCount / 5), 20);

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("common.goodMorning");
    if (hour < 18) return t("common.goodAfternoon");
    return t("common.goodEvening");
  };

  // Prepare progress stages from API or use defaults
  const progressStages = progressData?.stages || [
    {
      id: "start",
      label: "Start",
      labelAr: "البداية",
      percentage: 100,
      status: "completed",
      icon: "Play",
      color: "green",
      gradient: "from-green-400 to-emerald-500"
    },
    {
      id: "current",
      label: "Current Level",
      labelAr: "المستوى الحالي",
      percentage: progressPercentage,
      status: progressPercentage >= 100 ? "completed" : 
              progressPercentage >= 80 ? "almost_there" : "active",
      icon: "BookOpen",
      color: "blue",
      gradient: "from-blue-400 to-cyan-500",
      isActive: progressPercentage < 100
    },
    {
      id: "target",
      label: "Next Target",
      labelAr: "الهدف التالي",
      percentage: Math.min(progressPercentage + 25, 100),
      status: progressPercentage >= 75 ? "almost_there" : "pending",
      icon: "Award",
      color: "purple",
      gradient: "from-purple-400 to-pink-500"
    },
    {
      id: "completion",
      label: "Completion",
      labelAr: "الإكمال",
      percentage: progressPercentage >= 100 ? 100 : 0,
      status: progressPercentage >= 100 ? "completed" : "pending",
      icon: "CheckCircle",
      color: "gray",
      gradient: "from-gray-400 to-slate-400"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22] flex relative" dir={isRTL ? "rtl" : "ltr"}>
      {/* Refresh indicator */}
      {refreshing && (
        <div className={`fixed top-4 ${isRTL ? 'left-4' : 'right-4'} z-50 bg-primary text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-slide-down`}>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">{t("common.refreshing")}</span>
        </div>
      )}

      {/* Mobile sidebar backdrop with blur */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 lg:hidden backdrop-blur-sm animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 ${isRTL ? "right-0" : "left-0"} z-50 transform transition-all duration-500 ease-out-expo
          ${sidebarOpen 
            ? (isRTL ? "translate-x-0" : "translate-x-0") 
            : (isRTL ? "translate-x-full" : "-translate-x-full") + " lg:translate-x-0"
          }
          flex-shrink-0
        `}
      >
        <StudentSidebar user={currentUser} onLogout={handleLogout} />
      </div>

      {/* Main Content */}
      <main className="flex-1 min-w-0 transition-all duration-300">
        <StudentHeader
          user={currentUser}
          notifications={notifications}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          onRefresh={() => fetchStudentData(true)}
        />

        {/* Content Area */}
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">

            {/* ══════════════ Left Column ══════════════ */}
            <div className="lg:col-span-2 space-y-6 lg:space-y-8">

              {/* Hero Banner - مصغر */}
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
                          {getGreeting()}, {currentUser.name?.split(' ')[0] || t("common.student")}!
                        </span>
                      </div>

                      <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">
                        {t("dashboard.continueJourney")}
                      </h2>

                      <p className="text-blue-100 mb-6 text-base">
                        {t("dashboard.progressMessage")}
                      </p>

                      <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                        <Link
                          href="/dashboard/courses"
                          className="group/btn relative px-6 py-3 bg-white text-primary rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-1 overflow-hidden text-sm"
                        >
                          <span className="relative z-10">{t("dashboard.browseCourses")}</span>
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-white opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                        </Link>

                        <button className="group/btn relative px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/20 transition-all duration-300 border border-white/20 overflow-hidden shadow-sm hover:shadow-md text-sm">
                          <span className="relative z-10 flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            {t("dashboard.quickStart")}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="relative w-40 h-40 lg:w-48 lg:h-48 hidden lg:block group-hover:scale-105 transition-transform duration-500">
                      <img
                        src="https://storage.googleapis.com/uxpilot-auth.appspot.com/cc128e889c-1e79b7c5933da33a6e8e.png"
                        alt="Learning"
                        className="w-full h-full object-contain drop-shadow-lg animate-float"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Cards - Attendance مع Achievements (حضور, غياب, إنجازات) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Attended Card */}
                <div className="group/stats relative bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 transform hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400/0 to-emerald-500/0 group-hover/stats:from-green-400/10 group-hover/stats:to-emerald-500/10 rounded-2xl transition-all duration-300" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover/stats:scale-110 transition-transform duration-300">
                        <CheckCircle className="w-7 h-7 text-white" />
                      </div>
                      <span className="px-3 py-1 bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-semibold">
                        {t("dashboard.attended")}
                      </span>
                    </div>

                    <h3 className="text-3xl font-bold text-gray-900 dark:text-[#e6edf3] mb-1">
                      <AnimatedCounter value={attendedSessionsCount} />
                    </h3>

                    <p className="text-sm text-gray-500 dark:text-[#8b949e]">
                      {t("dashboard.attendedSessions")}
                    </p>

                    <div className="mt-4 h-1 w-full bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full" 
                        style={{ width: `${totalSessionsCount > 0 ? (attendedSessionsCount / totalSessionsCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Absent Card */}
                <div className="group/stats relative bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 transform hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-400/0 to-red-500/0 group-hover/stats:from-red-400/10 group-hover/stats:to-red-500/10 rounded-2xl transition-all duration-300" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center shadow-lg shadow-red-500/20 group-hover/stats:scale-110 transition-transform duration-300">
                        <X className="w-7 h-7 text-white" />
                      </div>
                      <span className="px-3 py-1 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-full text-xs font-semibold">
                        {t("dashboard.absent")}
                      </span>
                    </div>

                    <h3 className="text-3xl font-bold text-gray-900 dark:text-[#e6edf3] mb-1">
                      <AnimatedCounter value={absentSessionsCount} />
                    </h3>

                    <p className="text-sm text-gray-500 dark:text-[#8b949e]">
                      {t("dashboard.absentSessions")}
                    </p>

                    <div className="mt-4 h-1 w-full bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full" 
                        style={{ width: `${totalSessionsCount > 0 ? (absentSessionsCount / totalSessionsCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Achievements Card */}
                <div className="group/stats relative bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 transform hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400/0 to-pink-500/0 group-hover/stats:from-purple-400/10 group-hover/stats:to-pink-500/10 rounded-2xl transition-all duration-300" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover/stats:scale-110 transition-transform duration-300">
                        <Award className="w-7 h-7 text-white" />
                      </div>
                      <span className="px-3 py-1 bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full text-xs font-semibold">
                        {t("dashboard.achievements")}
                      </span>
                    </div>

                    <h3 className="text-3xl font-bold text-gray-900 dark:text-[#e6edf3] mb-1">
                      <AnimatedCounter value={achievementsCount} />
                    </h3>

                    <p className="text-sm text-gray-500 dark:text-[#8b949e]">
                      {t("dashboard.achievements")}
                    </p>

                    <div className="mt-4 h-1 w-full bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-400 to-pink-500 rounded-full" 
                        style={{ width: `${achievementsCount > 0 ? Math.min((achievementsCount / 20) * 100, 100) : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>          

              {/* Progress Section with improved design */}
              <div className="group/progress relative bg-white dark:bg-[#161b22] rounded-2xl p-6 lg:p-8 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-purple-600/0 group-hover/progress:from-primary/5 group-hover/progress:to-purple-600/5 rounded-2xl transition-all duration-300" />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-[#e6edf3] mb-2 flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-primary" />
                        {t("dashboard.learningProgress")}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-[#8b949e]">
                        {t("dashboard.trackJourney")}
                      </p>
                    </div>
                    <Link
                      href="/dashboard/progress"
                      className="group/link text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1 px-4 py-2 rounded-lg hover:bg-primary/5 transition-all"
                    >
                      {t("dashboard.viewDetails")}
                      {isRTL ? (
                        <ChevronLeft className="w-4 h-4 group-hover/link:-translate-x-1 transition-transform" />
                      ) : (
                        <ChevronRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                      )}
                    </Link>
                  </div>

                  {/* Progress Timeline */}
                  <div className="relative mb-8 w-full">
                    <div className="flex w-full items-stretch">
                      {progressStages.map((stage: ProgressStage, index: number) => {
                        const StageIcon = getStageIcon(stage.icon);
                        const isCompleted = stage.status === "completed";
                        const isActive = stage.isActive || stage.status === "active";
                        const isPending = stage.status === "pending";
                        const isAlmostThere = stage.status === "almost_there";

                        const nextStage = progressStages[index + 1];
                        let lineProgress = 0;
                        if (isCompleted) {
                          lineProgress = 100;
                        } else if (isActive && nextStage) {
                          const cur = stage.percentage || 0;
                          const nxt = nextStage.percentage || 0;
                          lineProgress = cur > 0 && nxt > 0 ? Math.min((cur / nxt) * 100, 100) : 0;
                        }

                        return (
                          <div
                            key={stage.id}
                            className={`flex items-center ${index === progressStages.length - 1 ? "flex-none" : "flex-1"}`}
                          >
                            {/* Stage Circle */}
                            <div className="flex flex-col items-center w-16">
                              <div
                                className={`
                                  relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg mb-2
                                  transition-all duration-700 ease-out-expo mx-auto
                                  ${animateProgress ? "scale-100 opacity-100" : "scale-50 opacity-0"}
                                  ${isCompleted ? `bg-gradient-to-br ${stage.gradient}` : ""}
                                  ${isActive ? `bg-gradient-to-br ${stage.gradient} ring-4 ring-${stage.color}-200 dark:ring-${stage.color}-500/20 animate-pulse-ring` : ""}
                                  ${isAlmostThere ? `bg-gradient-to-br ${stage.gradient} opacity-60` : ""}
                                  ${isPending ? "bg-gray-100 dark:bg-[#21262d] border-2 border-gray-200 dark:border-[#30363d]" : ""}
                                `}
                                style={{ transitionDelay: `${index * 150}ms` }}
                              >
                                <StageIcon
                                  className={`
                                    w-6 h-6 transition-all duration-500
                                    ${isPending ? "text-gray-300 dark:text-[#6e7681]" : "text-white"}
                                    ${isActive ? "animate-bounce" : ""}
                                  `}
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
                                  {isCompleted && t("dashboard.completed")}
                                  {isActive && t("dashboard.inProgress")}
                                  {isAlmostThere && t("dashboard.almostThere")}
                                  {isPending && t("dashboard.pending")}
                                </span>

                                <p
                                  className={`
                                    font-semibold text-xs transition-all duration-500 truncate px-1
                                    ${animateProgress ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
                                    ${isPending ? "text-gray-500 dark:text-[#8b949e]" : "text-gray-900 dark:text-[#e6edf3]"}
                                  `}
                                  style={{ transitionDelay: `${index * 150 + 150}ms` }}
                                >
                                  {isRTL ? stage.labelAr : stage.label}
                                </p>

                                <p
                                  className={`
                                    text-[10px] transition-all duration-500
                                    ${animateProgress ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
                                    ${isPending ? "text-gray-400 dark:text-[#6e7681]" : "text-gray-500 dark:text-[#8b949e]"}
                                  `}
                                  style={{ transitionDelay: `${index * 150 + 200}ms` }}
                                >
                                  {stage.percentage}%
                                </p>
                              </div>
                            </div>

                            {/* Progress Line */}
                            {index < progressStages.length - 1 && (
                              <div className="flex-1 h-2 relative overflow-hidden mx-0.5">
                                <div className="absolute inset-0 bg-gray-200 dark:bg-[#30363d] rounded-full" />
                                <div
                                  className={`
                                    absolute left-0 top-0 h-full rounded-full
                                    transition-all duration-1000 ease-out-expo
                                    bg-gradient-to-r ${stage.gradient}
                                  `}
                                  style={{
                                    width: animateProgress ? `${lineProgress}%` : "0%",
                                    transitionDelay: `${index * 150 + 300}ms`,
                                  }}
                                >
                                  {(isCompleted || isActive) && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
                                  )}
                                </div>

                                {isActive && lineProgress > 0 && lineProgress < 100 && (
                                  <div
                                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg transition-all duration-1000 ease-out-expo"
                                    style={{
                                      left: animateProgress ? `${lineProgress}%` : "0%",
                                      transitionDelay: `${index * 150 + 300}ms`,
                                    }}
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

                  {/* Progress Stats Cards - إذا كانت موجودة في API */}
                  {progressData?.summaryCards && progressData.summaryCards.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 justify-items-center mt-6">
                      {progressData.summaryCards.map((card: ProgressStatsCard, idx: number) => {
                        const StatIcon = getStatIcon(card.icon);
                        
                        // ✅ لو الـ card هي achievements، بنحولها لـ completion rate
                        if (card.id === "achievements" || card.title === "Achievements" || card.titleAr === "الإنجازات") {
                          return (
                            <div
                              key={card.id}
                              className={`
                                relative group/card flex items-start gap-3 p-5 rounded-xl border w-full
                                transition-all duration-500 hover:shadow-xl hover:scale-105 cursor-pointer
                                ${animateProgress ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}
                                bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800
                              `}
                              style={{ transitionDelay: `${600 + idx * 100}ms` }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/10 rounded-xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />

                              <div className="absolute inset-0 rounded-xl overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-blue-400/20 to-cyan-400/20 transition-all duration-1000"
                                  style={{ width: `${progressPercentage}%` }}
                                />
                              </div>

                              <div className="relative z-10 w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center flex-shrink-0">
                                <BarChart3 className="w-6 h-6 text-white" />
                              </div>

                              <div className="relative z-10 flex-1 min-w-0">
                                <h4 className="text-3xl font-bold text-gray-900 dark:text-[#e6edf3] mb-0.5">
                                  {progressPercentage}%
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-[#8b949e]">
                                  {isRTL ? "نسبة الإكمال" : "Completion Rate"}
                                </p>
                              </div>

                              <Sparkles className="absolute -top-2 -right-2 w-4 h-4 text-yellow-400 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
                            </div>
                          );
                        }

                        // ✅ باقي الكاردز (Attended, Absent) تفضل زي ما هي
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
                            <div className={`absolute inset-0 bg-gradient-to-br from-white/0 to-white/10 rounded-xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-300`} />

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

                            <Sparkles className="absolute -top-2 -right-2 w-4 h-4 text-yellow-400 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Current Courses with improved design */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-[#e6edf3] flex items-center gap-2">
                      <BookOpen className="w-6 h-6 text-primary" />
                      {t("dashboard.currentCourses")}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-[#8b949e] mt-1">
                      {t("dashboard.continueWhereLeft")}
                    </p>
                  </div>
                  <Link
                    href="/dashboard/courses"
                    className="group/link text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1 px-4 py-2 rounded-lg hover:bg-primary/5 transition-all"
                  >
                    {t("dashboard.viewAll")}
                    {isRTL ? (
                      <ChevronLeft className="w-4 h-4 group-hover/link:-translate-x-1 transition-transform" />
                    ) : (
                      <ChevronRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                    )}
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentCourses && currentCourses.length > 0 ? (
                    currentCourses.map((course: Course) => (
                      <div
                        key={course._id}
                        className="group/course relative bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 transform hover:-translate-y-1 cursor-pointer overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-primary/5 opacity-0 group-hover/course:opacity-100 transition-opacity duration-300" />

                        {/* Decorative elements */}
                        <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-primary/10 to-purple-600/10 rounded-full blur-2xl opacity-0 group-hover/course:opacity-100 transition-opacity duration-500" />

                        <div className="relative z-10">
                          <div className="flex items-start justify-between mb-4">
                            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${course.gradient} flex items-center justify-center flex-shrink-0 shadow-lg group-hover/course:scale-110 transition-transform duration-300`}>
                              {getCourseIcon(course.icon)}
                            </div>
                            <span className="px-3 py-1 bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 rounded-full text-xs font-semibold border border-transparent dark:border-cyan-500/20">
                              {t("dashboard.inProgress")}
                            </span>
                          </div>

                          <h4 className="text-xl font-bold text-gray-900 dark:text-[#e6edf3] mb-2 group-hover/course:text-primary transition-colors">
                            {course.title}
                          </h4>

                          <p className="text-sm text-gray-500 dark:text-[#8b949e] mb-4 line-clamp-2">
                            {course.description}
                          </p>

                          {course.instructor && (
                            <p className="text-xs text-gray-400 dark:text-[#6e7681] mb-3">
                              {t("dashboard.instructor")}: {course.instructor}
                            </p>
                          )}

                          <div className="mb-4">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-gray-600 dark:text-[#8b949e]">{t("dashboard.progress")}</span>
                              <span className="font-semibold text-gray-900 dark:text-[#e6edf3]">
                                {course.progress}%
                              </span>
                            </div>
                            <div className="w-full h-2.5 bg-gray-200 dark:bg-[#21262d] rounded-full overflow-hidden">
                              <div
                                className={`h-full bg-gradient-to-r ${course.gradient} rounded-full transition-all duration-1000 ease-out-expo relative overflow-hidden`}
                                style={{ width: `${course.progress}%` }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1.5 text-gray-500 dark:text-[#8b949e]">
                              <BookOpen className="w-4 h-4" />
                              <span>{course.completedSessions || 0} / {course.totalSessions || 0} {t("dashboard.sessions")}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500 dark:text-[#8b949e]">
                              <Clock className="w-4 h-4" />
                              <span>{course.hoursLeft || 0}{t("dashboard.hoursLeft")}</span>
                            </div>
                          </div>

                          {course.nextLesson && (
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#30363d]">
                              <p className="text-xs text-gray-500 dark:text-[#8b949e] flex items-center gap-1">
                                <Play className="w-3 h-3" />
                                {t("dashboard.next")}: {course.nextLesson}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12">
                      <div className="w-24 h-24 mx-auto bg-gray-100 dark:bg-[#21262d] rounded-full flex items-center justify-center mb-4">
                        <BookOpen className="w-12 h-12 text-gray-400 dark:text-[#6e7681]" />
                      </div>
                      <p className="text-gray-500 dark:text-[#8b949e] mb-4">
                        {t("dashboard.noCourses")}
                      </p>
                      <Link
                        href="/dashboard/courses"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 transform hover:scale-105"
                      >
                        {t("dashboard.browseCourses")}
                        {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ══════════════ Right Column ══════════════ */}
            <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24 lg:self-start">

              {/* Calendar & Upcoming Events with improved design */}
              <div className="relative group/calendar bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-purple-600/0 group-hover/calendar:from-primary/5 group-hover/calendar:to-purple-600/5 rounded-2xl transition-all duration-300" />

                <div className="relative z-10">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-[#e6edf3] mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    {t("dashboard.calendar")}
                  </h3>

                  <div className="text-center mb-6">
                    <div className="text-sm font-semibold text-gray-900 dark:text-[#e6edf3] mb-4">
                      {new Date().toLocaleDateString(isRTL ? "ar-EG" : "en-US", { month: "long", year: "numeric" }).toUpperCase()}
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-xs mb-2">
                      {(isRTL ? ["ح", "ن", "ث", "ر", "خ", "ج", "س"] : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]).map((day: string) => (
                        <div key={day} className="text-gray-500 dark:text-[#6e7681] font-medium py-1">
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-sm">
                      {Array.from({ length: 35 }, (_, i) => {
                        const today = new Date().getDate();
                        const currentMonth = new Date().getMonth();
                        const firstDay = new Date(new Date().getFullYear(), currentMonth, 1).getDay();
                        // Adjust for Arabic (Friday = 0 in Arabic calendar)
                        const adjustedFirstDay = isRTL ? (firstDay === 0 ? 6 : firstDay - 1) : firstDay;
                        const day = i - (adjustedFirstDay === 0 ? 6 : adjustedFirstDay - 1) + 1;
                        const isToday = day === today;
                        const isValidDay = day > 0 && day <= new Date(new Date().getFullYear(), currentMonth + 1, 0).getDate();

                        return (
                          <button
                            key={i}
                            className={`
                              aspect-square rounded-lg flex items-center justify-center font-medium transition-all
                              ${isToday && isValidDay
                                ? "bg-gradient-to-br from-primary to-purple-600 text-white shadow-md shadow-primary/30 transform scale-105"
                                : isValidDay
                                  ? "text-gray-700 dark:text-[#8b949e] hover:bg-gray-100 dark:hover:bg-[#21262d]"
                                  : "text-gray-300 dark:text-[#6e7681]"
                              }
                            `}
                            disabled={!isValidDay}
                          >
                            {isValidDay ? day : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-[#8b949e] flex items-center gap-2">
                      <span className="w-1 h-4 bg-primary rounded-full" />
                      {t("dashboard.upcomingEvents")}
                    </h4>

                    {upcomingEvents && upcomingEvents.length > 0 ? (
                      upcomingEvents.slice(0, 3).map((event: UpcomingEvent, idx: number) => (
                        <div
                          key={idx}
                          className={`
                            group/event flex items-start gap-3 p-3 rounded-xl border transition-all duration-300 hover:shadow-md cursor-pointer
                            ${idx === 0
                              ? "bg-green-50 dark:bg-green-500/5 border-green-100 dark:border-green-500/15 hover:bg-green-100 dark:hover:bg-green-500/10"
                              : idx === 1
                                ? "bg-blue-50 dark:bg-blue-500/5 border-blue-100 dark:border-blue-500/15 hover:bg-blue-100 dark:hover:bg-blue-500/10"
                                : "bg-purple-50 dark:bg-purple-500/5 border-purple-100 dark:border-purple-500/15 hover:bg-purple-100 dark:hover:bg-purple-500/10"
                            }
                          `}
                        >
                          <div className={`
                            w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                            ${idx === 0
                              ? "bg-gradient-to-br from-green-400 to-emerald-500"
                              : idx === 1
                                ? "bg-gradient-to-br from-blue-400 to-cyan-500"
                                : "bg-gradient-to-br from-purple-400 to-pink-500"
                            }
                          `}>
                            <Calendar className="w-5 h-5 text-white" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 dark:text-[#e6edf3] truncate">
                              {event.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-[#8b949e]">
                              {event.formattedDate || event.date} · {event.startTime} - {event.endTime}
                            </p>
                            {event.location && (
                              <p className="text-xs text-gray-400 dark:text-[#6e7681] mt-1">
                                📍 {event.location}
                              </p>
                            )}
                          </div>

                          {isRTL ? (
                            <ChevronLeft className="w-4 h-4 text-gray-400 opacity-0 group-hover/event:opacity-100 transition-opacity" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover/event:opacity-100 transition-opacity" />
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6">
                        <Calendar className="w-12 h-12 text-gray-300 dark:text-[#6e7681] mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-[#8b949e]">
                          {t("dashboard.noUpcomingEvents")}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Next Session */}
                  {nextSession && (
                    <div className="mt-6 pt-6 border-t border-gray-100 dark:border-[#30363d]">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-[#8b949e] mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        {nextSession.isToday 
                          ? t("dashboard.todaysSession")
                          : t("dashboard.nextSession")}
                      </h4>

                      <div className="relative group/session overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-xl blur-xl opacity-0 group-hover/session:opacity-100 transition-opacity duration-500" />

                        <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-[#1c2128] dark:to-[#1c2128] dark:border dark:border-[#30363d] rounded-xl p-4">
                          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-full blur-2xl" />

                          <div className="relative z-10">
                            <p className="font-semibold text-gray-900 dark:text-[#e6edf3]">
                              {nextSession.title}
                            </p>

                            <p className="text-sm text-gray-600 dark:text-[#8b949e] mt-2 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {nextSession.date} · {nextSession.time}
                            </p>

                            {nextSession.isToday && (
                              <div className="mt-4">
                                {nextSession.meetingLink ? (
                                  <a
                                    href={nextSession.meetingLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-sm bg-gradient-to-r from-primary to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 transform hover:scale-105"
                                  >
                                    {t("dashboard.joinMeeting")}
                                    {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </a>
                                ) : (
                                  <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3 animate-pulse" />
                                    {t("dashboard.meetingLinkSoon")}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notifications Widget with improved design */}
              {notifications && notifications.length > 0 && (
                <div className="relative group/notif bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-purple-600/0 group-hover/notif:from-primary/5 group-hover/notif:to-purple-600/5 rounded-2xl transition-all duration-300" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900 dark:text-[#e6edf3] flex items-center gap-2">
                        <Bell className="w-4 h-4 text-primary" />
                        {t("dashboard.notifications")}
                      </h4>
                      <span className="text-xs bg-gradient-to-r from-primary to-purple-600 text-white px-2 py-1 rounded-full font-medium animate-pulse">
                        {notifications.length} {t("dashboard.new")}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {notifications.slice(0, 4).map((note: Notification, idx: number) => (
                        <div
                          key={idx}
                          className="group/item flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#1c2128] transition-all duration-300 cursor-pointer"
                        >
                          <div className="relative">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-purple-600/10 flex items-center justify-center flex-shrink-0">
                              <Bell className="w-5 h-5 text-primary" />
                            </div>
                            {!note.isRead && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-[#161b22]" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-[#e6edf3] truncate">
                              {isRTL ? (note.titleAr || note.title) : note.title}
                            </p>
                            {note.message && (
                              <p className="text-xs text-gray-500 dark:text-[#8b949e] mt-0.5 line-clamp-1">
                                {note.message}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 dark:text-[#6e7681] mt-1">
                              {note.time}
                            </p>
                          </div>

                          {isRTL ? (
                            <ChevronLeft className="w-4 h-4 text-gray-400 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                          )}
                        </div>
                      ))}
                    </div>

                    <Link
                      href="/dashboard/notifications"
                      className="mt-4 block text-center text-sm bg-gradient-to-r from-primary to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 transform hover:scale-105"
                    >
                      {t("dashboard.viewAllNotifications")}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Add custom CSS for animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        
        @keyframes pulse-slower {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes slide-down {
          0% { transform: translateY(-100%); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(139, 92, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        
        .animate-pulse-slower {
          animation: pulse-slower 6s ease-in-out infinite;
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        
        .animate-slide-down {
          animation: slide-down 0.5s ease-out;
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .animate-pulse-ring {
          animation: pulse-ring 2s infinite;
        }
        
        .ease-out-expo {
          transition-timing-function: cubic-bezier(0.19, 1, 0.22, 1);
        }
      `}</style>
    </div>
  );
}