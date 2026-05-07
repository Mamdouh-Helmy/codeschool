"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { useLocale } from "@/app/context/LocaleContext";
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
  progressData?: {
    stages: ProgressStage[];
    summaryCards: ProgressSummaryCard[];
  };
  nextSession?: NextSession;
  currentCourses?: Course[];
  upcomingEvents?: UpcomingEvent[];
  notifications?: Notification[];
}

interface ApiResponse {
  success: boolean;
  data: DashboardData;
  message?: string;
  error?: string;
}

// ============ Animated Counter ============
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

// ============ Skeleton ============
const DashboardSkeleton = ({ isRTL }: { isRTL: boolean }) => (
  <div className="min-h-screen bg-[#f8f9fb] dark:bg-[#0a0f17]">
    <div className="flex">
      <div className="w-64 h-screen bg-white dark:bg-[#161b22] border-l border-gray-200 dark:border-[#30363d] hidden lg:block">
        <div className="p-6 border-b border-gray-200 dark:border-[#30363d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff6700]/20 animate-pulse" />
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
          <div className="rounded-3xl p-8 mb-8 animate-pulse h-48"
            style={{ background: "linear-gradient(135deg, #004d5933 0%, #ff670033 100%)" }} />
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

// ============ Main Component ============
export default function StudentDashboard() {
  const { t } = useI18n();
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

      const res = await fetch("/api/student/dashboard", {
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
      Play, BookOpen, Award, CheckCircle, Brain, Rocket,
    };
    return icons[iconName] || BookOpen;
  };

  const getStatIcon = (iconName: string): any => {
    const icons: Record<string, any> = {
      CheckCircle, Clock, Award, TrendingUp, Target, Star, X, BarChart3,
    };
    return icons[iconName] || CheckCircle;
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

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return isRTL ? "صباح الخير" : "Good Morning";
    if (h < 18) return isRTL ? "مساء الخير" : "Good Afternoon";
    return isRTL ? "مساء الخير" : "Good Evening";
  };

  if (loading) return <DashboardSkeleton isRTL={isRTL} />;

  if (error && !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb] dark:bg-[#0a0f17]" dir={isRTL ? "rtl" : "ltr"}>
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
              className="px-6 py-3 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}
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
    currentCourses = [],
    upcomingEvents = [],
    notifications = [],
  } = dashboardData || {};

  const currentUser = user || { _id: "", name: isRTL ? "طالب" : "Student", email: "", role: "student", image: null };
  
  const attendedSessionsCount = stats?.attendedSessions || 0;
  const absentSessionsCount = stats?.absentSessions || 0;
  const totalSessionsCount = stats?.totalSessions || 1;
  const completedSessionsCount = stats?.completedSessions || 0;
  const achievementsCount = Math.min(Math.floor(completedSessionsCount / 5), 20);
  const progressPercentage = stats?.progressPercentage || 
    (totalSessionsCount > 0 ? Math.round((completedSessionsCount / totalSessionsCount) * 100) : 0);

  const progressStages = progressData?.stages || [
    {
      id: "start",
      label: "Start",
      labelAr: "البداية",
      percentage: 100,
      status: "completed",
      icon: "Play",
      gradient: "from-[#004d59] to-[#ff6700]",
      color: "green"
    },
    {
      id: "current",
      label: "Current Level",
      labelAr: "المستوى الحالي",
      percentage: progressPercentage,
      status: progressPercentage >= 100 ? "completed" : progressPercentage >= 80 ? "almost_there" : "active",
      icon: "BookOpen",
      gradient: "from-[#ff6700] to-[#feaf00]",
      color: "blue",
      isActive: progressPercentage < 100
    },
    {
      id: "target",
      label: "Next Target",
      labelAr: "الهدف التالي",
      percentage: Math.min(progressPercentage + 25, 100),
      status: progressPercentage >= 75 ? "almost_there" : "pending",
      icon: "Award",
      gradient: "from-[#004d59] to-[#ff6437]",
      color: "purple"
    },
    {
      id: "completion",
      label: "Completion",
      labelAr: "الإكمال",
      percentage: progressPercentage >= 100 ? 100 : 0,
      status: progressPercentage >= 100 ? "completed" : "pending",
      icon: "CheckCircle",
      gradient: "from-[#004d59] to-[#004d59]/70",
      color: "gray"
    }
  ];

  return (
    <div
      className="min-h-screen bg-[#f8f9fb] dark:bg-[#0a0f17] flex relative"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Refresh indicator */}
      {refreshing && (
        <div className={`fixed top-4 ${isRTL ? "left-4" : "right-4"} z-50 text-white px-4 py-2 rounded-xl shadow-xl flex items-center gap-2`}
          style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-bold">{isRTL ? "جاري التحديث..." : "Refreshing..."}</span>
        </div>
      )}

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 ${isRTL ? "right-0" : "left-0"} z-50 transform transition-all duration-500
          ${sidebarOpen ? "translate-x-0" : (isRTL ? "translate-x-full" : "-translate-x-full") + " lg:translate-x-0"}
          flex-shrink-0`}
      >
        <StudentSidebar user={currentUser} onLogout={handleLogout} />
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 transition-all duration-300">
        <StudentHeader
          user={currentUser}
          notifications={notifications}
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
                <div className="absolute inset-0 rounded-3xl opacity-60 blur-md group-hover:opacity-80 transition-opacity duration-500"
                  style={{ background: "linear-gradient(135deg, #004d59, #ff6700, #feaf00)" }} />
                <div className="relative rounded-3xl p-6 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
                  style={{ background: "linear-gradient(135deg, #004d59 0%, #004d59dd 40%, #ff6700 100%)" }}>

                  {/* dot pattern */}
                  <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
                  <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl animate-pulse-slow"
                    style={{ background: "#feaf00", opacity: 0.15 }} />
                  <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full blur-3xl animate-pulse-slower"
                    style={{ background: "#ff6437", opacity: 0.1 }} />

                  <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
                    <div className="max-w-xl text-center lg:text-right">
                      <div className="flex items-center gap-2 justify-center lg:justify-start mb-2">
                        <Sparkles className="w-4 h-4 text-[#feaf00] animate-pulse" />
                        <span className="text-[#feaf00] font-bold text-sm">
                          {getGreeting()}, {currentUser?.name?.split(" ")[0] || (isRTL ? "طالب" : "Student")}!
                        </span>
                      </div>

                      <h2 className="text-2xl lg:text-3xl font-black text-white mb-3">
                        {isRTL ? "رحلتك التعليمية" : "Your Learning Journey"}
                      </h2>

                      <p className="text-white/70 mb-6 text-base">
                        {isRTL
                          ? `لديك ${stats?.totalSessions || 0} جلسة إجمالية و ${stats?.attendedSessions || 0} جلسة حضرتها`
                          : `You have ${stats?.totalSessions || 0} total sessions and attended ${stats?.attendedSessions || 0}`}
                      </p>

                      <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                        <Link
  href="/dashboard/sessions"
  className="
    group/btn relative px-6 py-3 rounded-xl font-black
    text-white text-sm overflow-hidden
    transition-all duration-300
    shadow-[0_10px_30px_rgba(255,103,0,0.25)]
    hover:shadow-[0_15px_40px_rgba(0,77,89,0.35)]
    hover:-translate-y-1
    bg-gradient-to-r from-[#004d59] via-[#ff6700] to-[#feaf00]
    bg-[length:200%_200%]
    hover:bg-right
  "
>
  {/* Glow Effect */}
  <span className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />

  {/* Shine Effect */}
  <span className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover/btn:left-full transition-all duration-700" />

  <span className="relative z-10 flex items-center gap-2">
    {isRTL ? "جلساتي" : "My Sessions"}
    <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
  </span>
</Link>
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

              {/* Stats Cards: Attended, Absent, Achievements */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

                {/* Attended Sessions */}
                <div className="group/stats relative bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-5 -translate-y-4 translate-x-4"
                    style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }} />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg group-hover/stats:scale-110 transition-transform duration-300"
                        style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}>
                        <CheckCircle className="w-7 h-7 text-white" />
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold"
                        style={{ background: "#ff670015", color: "#ff6700", border: "1px solid #ff670025" }}>
                        {isRTL ? "حضور" : "Attended"}
                      </span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 dark:text-[#e6edf3] mb-1">
                      <AnimatedCounter value={attendedSessionsCount} />
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-[#8b949e]">
                      {isRTL ? "الجلسات التي حضرتها" : "Sessions Attended"}
                    </p>
                    <div className="mt-4 h-1.5 w-full bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{ width: `${(attendedSessionsCount / totalSessionsCount) * 100}%`, background: "linear-gradient(90deg, #004d59, #ff6700)" }} />
                    </div>
                  </div>
                </div>

                {/* Absent Sessions */}
                <div className="group/stats relative bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-5 -translate-y-4 translate-x-4"
                    style={{ background: "linear-gradient(135deg, #ef4444, #f87171)" }} />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg group-hover/stats:scale-110 transition-transform duration-300"
                        style={{ background: "linear-gradient(135deg, #ef4444, #f87171)" }}>
                        <X className="w-7 h-7 text-white" />
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold"
                        style={{ background: "#ef444415", color: "#ef4444", border: "1px solid #ef444425" }}>
                        {isRTL ? "غياب" : "Absent"}
                      </span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 dark:text-[#e6edf3] mb-1">
                      <AnimatedCounter value={absentSessionsCount} />
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-[#8b949e]">
                      {isRTL ? "الجلسات التي غاب عنها" : "Sessions Absent"}
                    </p>
                    <div className="mt-4 h-1.5 w-full bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{ width: `${(absentSessionsCount / totalSessionsCount) * 100}%`, background: "linear-gradient(90deg, #ef4444, #f87171)" }} />
                    </div>
                  </div>
                </div>

                {/* Achievements */}
                <div className="group/stats relative bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-5 -translate-y-4 translate-x-4"
                    style={{ background: "linear-gradient(135deg, #feaf00, #f67d00)" }} />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg group-hover/stats:scale-110 transition-transform duration-300"
                        style={{ background: "linear-gradient(135deg, #feaf00, #f67d00)" }}>
                        <Award className="w-7 h-7 text-white" />
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold"
                        style={{ background: "#feaf0015", color: "#f67d00", border: "1px solid #feaf0030" }}>
                        {isRTL ? "إنجازات" : "Achievements"}
                      </span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 dark:text-[#e6edf3] mb-1">
                      <AnimatedCounter value={achievementsCount} />
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-[#8b949e]">
                      {isRTL ? "الإنجازات التي حققتها" : "Achievements Earned"}
                    </p>
                    <div className="mt-4 h-1.5 w-full bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{ width: `${(achievementsCount / 20) * 100}%`, background: "linear-gradient(90deg, #feaf00, #f67d00)" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Section */}
              <div className="group/progress relative bg-white dark:bg-[#161b22] rounded-2xl p-6 lg:p-8 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl transition-all duration-300">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 dark:text-[#e6edf3] mb-2 flex items-center gap-2">
                        <TrendingUp className="w-6 h-6" style={{ color: "#ff6700" }} />
                        {isRTL ? "تقدم التعلم" : "Learning Progress"}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-[#8b949e]">
                        {isRTL ? "تتبع إنجازاتك التعليمية" : "Track your learning achievements"}
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

                        const stageStyle = isCompleted
                          ? { background: "linear-gradient(135deg, #004d59, #ff6700)" }
                          : isActive
                          ? { background: "linear-gradient(135deg, #ff6700, #feaf00)" }
                          : isAlmostThere
                          ? { background: "linear-gradient(135deg, #004d59, #ff6437)", opacity: 0.6 }
                          : {};

                        return (
                          <div key={stage.id} className={`flex items-center ${index === progressStages.length - 1 ? "flex-none" : "flex-1"}`}>
                            <div className="flex flex-col items-center w-16">
                              <div
                                className={`
                                  relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg mb-2 mx-auto
                                  transition-all duration-700
                                  ${animateProgress ? "scale-100 opacity-100" : "scale-50 opacity-0"}
                                  ${isPending ? "bg-gray-100 dark:bg-[#21262d] border-2 border-gray-200 dark:border-[#30363d]" : ""}
                                  ${isActive ? "ring-4 ring-[#ff6700]/20 animate-pulse-ring" : ""}
                                `}
                                style={{
                                  ...(isPending ? {} : stageStyle),
                                  transitionDelay: `${index * 150}ms`,
                                }}
                              >
                                <StageIcon
                                  className={`w-6 h-6 transition-all duration-500 ${isPending ? "text-gray-300 dark:text-[#6e7681]" : "text-white"} ${isActive ? "animate-bounce" : ""}`}
                                />
                                {isActive && (
                                  <>
                                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full border-4 border-white dark:border-[#161b22] animate-ping"
                                      style={{ background: "#ff6700" }} />
                                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full border-4 border-white dark:border-[#161b22]"
                                      style={{ background: "#ff6700" }} />
                                  </>
                                )}
                                {isCompleted && (
                                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-[#161b22] flex items-center justify-center"
                                    style={{ background: "#004d59" }}>
                                    <CheckCircle className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </div>

                              <div className="text-center w-full">
                                <span
                                  className={`
                                    inline-block px-2 py-0.5 rounded-full text-[10px] font-black mb-1
                                    transition-all duration-500
                                    ${animateProgress ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
                                  `}
                                  style={{
                                    ...(isCompleted ? { background: "#004d5915", color: "#004d59", border: "1px solid #004d5925" }
                                      : isActive ? { background: "#ff670015", color: "#ff6700", border: "1px solid #ff670025" }
                                      : isAlmostThere ? { background: "#feaf0015", color: "#f67d00", border: "1px solid #feaf0025" }
                                      : { background: "#f3f4f6", color: "#9ca3af", border: "1px solid #e5e7eb" }),
                                    transitionDelay: `${index * 150 + 100}ms`,
                                  }}
                                >
                                  {isCompleted && (isRTL ? "مكتمل" : "Done")}
                                  {isActive && (isRTL ? "جارٍ" : "Active")}
                                  {isAlmostThere && (isRTL ? "قريباً" : "Soon")}
                                  {isPending && (isRTL ? "قادم" : "Pending")}
                                </span>

                                <p
                                  className={`font-black text-xs transition-all duration-500 truncate px-1 ${animateProgress ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"} ${isPending ? "text-gray-500 dark:text-[#8b949e]" : "text-gray-900 dark:text-[#e6edf3]"}`}
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
                                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000"
                                  style={{
                                    width: animateProgress ? `${lineProgress}%` : "0%",
                                    background: "linear-gradient(90deg, #004d59, #ff6700)",
                                    transitionDelay: `${index * 150 + 300}ms`,
                                  }}
                                >
                                  {(isCompleted || isActive) && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
                                  )}
                                </div>
                                {isActive && lineProgress > 0 && lineProgress < 100 && (
                                  <div
                                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg transition-all duration-1000"
                                    style={{ left: animateProgress ? `${lineProgress}%` : "0%", transitionDelay: `${index * 150 + 300}ms` }}
                                  >
                                    <div className="absolute inset-0 rounded-full animate-ping opacity-75"
                                      style={{ background: "#ff6700" }} />
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
                              bg-white dark:bg-[#161b22]
                            `}
                            style={{
                              borderColor: "#004d5920",
                              transitionDelay: `${600 + idx * 100}ms`,
                            }}
                          >
                            <div className={`relative z-10 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${card.iconColor}`}>
                              <StatIcon className="w-6 h-6" />
                            </div>
                            <div className="relative z-10 flex-1 min-w-0">
                              <h4 className="text-3xl font-black text-gray-900 dark:text-[#e6edf3] mb-0.5">
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

              {/* Current Courses */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-[#e6edf3] flex items-center gap-2">
                      <BookOpen className="w-6 h-6" style={{ color: "#ff6700" }} />
                      {isRTL ? "دوراتي الحالية" : "My Current Courses"}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-[#8b949e] mt-1">
                      {isRTL ? "الدورات التي تدرسها حالياً" : "Your current enrolled courses"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                  {currentCourses && currentCourses.length > 0 ? (
                    currentCourses.map((course) => (
                      <div
                        key={course._id}
                        className="group/card relative bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 transform hover:-translate-y-1 cursor-pointer overflow-hidden"
                      >
                        <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"
                          style={{ background: "linear-gradient(135deg, #ff670020, #feaf0020)" }} />

                        <div className="relative z-10">
                          <div className="flex items-start justify-between mb-4">
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover/card:scale-110 transition-transform`}
                              style={{ background: `linear-gradient(135deg, ${course.gradient})` }}>
                              {getCourseIcon(course.icon)}
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs font-black bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400">
                              {isRTL ? "قيد التقدم" : "In Progress"}
                            </span>
                          </div>

                          <h4 className="text-lg font-black text-gray-900 dark:text-[#e6edf3] mb-1 transition-colors line-clamp-1"
                            onMouseEnter={e => (e.currentTarget.style.color = "#ff6700")}
                            onMouseLeave={e => (e.currentTarget.style.color = "")}>
                            {course.title}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-[#8b949e] mb-4 line-clamp-2">
                            {course.description}
                          </p>

                          {course.instructor && (
                            <p className="text-xs text-gray-400 dark:text-[#6e7681] mb-3">
                              {isRTL ? "المدرس" : "Instructor"}: {course.instructor}
                            </p>
                          )}

                          {/* Progress bar */}
                          <div className="mb-4">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-gray-600 dark:text-[#8b949e]">
                                {isRTL ? "التقدم" : "Progress"}
                              </span>
                              <span className="font-black text-gray-900 dark:text-[#e6edf3]">
                                {course.progress}%
                              </span>
                            </div>
                            <div className="w-full h-2.5 bg-gray-200 dark:bg-[#21262d] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full relative overflow-hidden"
                                style={{
                                  width: `${course.progress}%`,
                                  background: `linear-gradient(90deg, ${course.gradient})`,
                                }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
                              </div>
                            </div>
                          </div>

                          {/* Stats row */}
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1.5 text-gray-500 dark:text-[#8b949e]">
                              <BookOpen className="w-4 h-4" />
                              <span>{course.completedSessions || 0}/{course.totalSessions || 0} {isRTL ? "جلسة" : "sessions"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 font-black" style={{ color: "#ff6700" }}>
                              <Clock className="w-4 h-4" />
                              <span>{course.hoursLeft || 0}{isRTL ? "ساعة متبقية" : "h left"}</span>
                            </div>
                          </div>

                          {course.nextLesson && (
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#30363d]">
                              <p className="text-xs text-gray-500 dark:text-[#8b949e] flex items-center gap-1">
                                <Play className="w-3 h-3" style={{ color: "#ff6700" }} />
                                {isRTL ? "التالي" : "Next"}: {course.nextLesson}
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
                      <p className="text-gray-500 dark:text-[#8b949e]">
                        {isRTL ? "لا توجد دورات حالية" : "No current courses"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Right Column ── */}
            <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24 lg:self-start">

              {/* Calendar & Upcoming Events */}
              <div className="relative group/calendar bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl transition-all duration-300">
                <div className="relative z-10">
                  <h3 className="text-lg font-black text-gray-900 dark:text-[#e6edf3] mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" style={{ color: "#ff6700" }} />
                    {isRTL ? "التقويم" : "Calendar"}
                  </h3>

                  {/* Mini Calendar */}
                  <div className="text-center mb-6">
                    <div className="text-sm font-black text-gray-900 dark:text-[#e6edf3] mb-4">
                      {new Date().toLocaleDateString(isRTL ? "ar-EG" : "en-US", { month: "long", year: "numeric" }).toUpperCase()}
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-xs mb-2">
                      {(isRTL ? ["ح", "ن", "ث", "ر", "خ", "ج", "س"] : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]).map((day) => (
                        <div key={day} className="text-gray-500 dark:text-[#6e7681] font-bold py-1">{day}</div>
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
                              aspect-square rounded-lg flex items-center justify-center font-black transition-all text-xs
                              ${isToday && isValidDay
                                ? "text-white shadow-md transform scale-105"
                                : isValidDay
                                  ? "text-gray-700 dark:text-[#8b949e] hover:bg-gray-100 dark:hover:bg-[#21262d]"
                                  : "text-gray-300 dark:text-[#6e7681]"
                              }
                            `}
                            style={isToday && isValidDay ? { background: "linear-gradient(135deg, #004d59, #ff6700)" } : {}}
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
                    <h4 className="text-sm font-black text-gray-700 dark:text-[#8b949e] flex items-center gap-2">
                      <span className="w-1 h-4 rounded-full" style={{ background: "#ff6700" }} />
                      {isRTL ? "الأحداث القادمة" : "Upcoming Events"}
                    </h4>

                    {upcomingEvents && upcomingEvents.length > 0 ? (
                      upcomingEvents.slice(0, 3).map((event, idx) => {
                        const eventBg = [
                          { bg: "#ff670008", border: "#ff670020", iconBg: "linear-gradient(135deg, #004d59, #ff6700)" },
                          { bg: "#004d5908", border: "#004d5920", iconBg: "linear-gradient(135deg, #004d59, #ff6437)" },
                          { bg: "#feaf0008", border: "#feaf0025", iconBg: "linear-gradient(135deg, #feaf00, #f67d00)" },
                        ][idx] || { bg: "#f9fafb", border: "#e5e7eb", iconBg: "linear-gradient(135deg, #004d59, #ff6700)" };

                        return (
                          <div
                            key={idx}
                            className="flex items-start gap-3 p-3 rounded-xl border transition-all hover:shadow-md cursor-pointer"
                            style={{ background: eventBg.bg, borderColor: eventBg.border }}
                          >
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: eventBg.iconBg }}>
                              <Calendar className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-sm text-gray-900 dark:text-[#e6edf3] truncate">
                                {event.title}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-[#8b949e]">
                                {event.formattedDate || event.date} · {event.startTime} - {event.endTime}
                              </p>
                              {event.groupName && (
                                <p className="text-xs mt-0.5 font-black" style={{ color: "#ff6700" }}>
                                  {event.groupName}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-6">
                        <Calendar className="w-12 h-12 text-gray-300 dark:text-[#6e7681] mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-[#8b949e]">
                          {isRTL ? "لا توجد أحداث قادمة" : "No upcoming events"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Next Session Card */}
                  {nextSession && (
                    <div className="mt-6 pt-6 border-t border-gray-100 dark:border-[#30363d]">
                      <h4 className="text-sm font-black text-gray-700 dark:text-[#8b949e] mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4" style={{ color: "#ff6700" }} />
                        {nextSession.isToday
                          ? (isRTL ? "جلسة اليوم" : "Today's Session")
                          : (isRTL ? "الجلسة القادمة" : "Next Session")}
                      </h4>

                      <div className="relative rounded-xl p-4 border border-[#004d59]/20 dark:border-[#004d59]/30"
                        style={{ background: "linear-gradient(135deg, #004d5908, #ff670008)" }}>
                        <p className="font-black text-gray-900 dark:text-[#e6edf3]">
                          {nextSession.title}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-[#8b949e] mt-2 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {nextSession.date} · {nextSession.time}
                        </p>
                        {nextSession.groupName && (
                          <p className="text-xs mt-1 font-black" style={{ color: "#ff6700" }}>{nextSession.groupName}</p>
                        )}
                        {nextSession.isToday && (
                          <div className="mt-3">
                            {nextSession.meetingLink ? (
                              <a
                                href={nextSession.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-white px-4 py-2 rounded-xl font-black hover:shadow-lg transition-all transform hover:scale-105"
                                style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}
                              >
                                {isRTL ? "انضمام" : "Join Session"}
                                {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </a>
                            ) : (
                              <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                                <Clock className="w-3 h-3 animate-pulse" />
                                {isRTL ? "رابط الجلسة قريباً" : "Meeting link coming soon"}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notifications */}
              {notifications && notifications.length > 0 && (
                <div className="bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d]">
                  <h4 className="font-black text-gray-900 dark:text-[#e6edf3] mb-4 flex items-center gap-2 text-base">
                    <Bell className="w-5 h-5" style={{ color: "#ff6700" }} />
                    {isRTL ? "الإشعارات" : "Notifications"}
                  </h4>

                  <div className="space-y-3">
                    {notifications.slice(0, 3).map((note, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#1c2128]">
                        <div className="w-8 h-8 rounded-lg bg-[#ff6700]/10 flex items-center justify-center flex-shrink-0">
                          <Bell className="w-4 h-4 text-[#ff6700]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 dark:text-[#e6edf3] truncate">
                            {isRTL ? (note.titleAr || note.title) : note.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-[#8b949e] mt-0.5">
                            {note.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Link
                    href="/dashboard/messages"
                    className="mt-4 block text-center text-sm text-white px-4 py-2.5 rounded-xl font-black hover:shadow-lg transition-all hover:scale-105"
                    style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}
                  >
                    {isRTL ? "عرض كل الإشعارات" : "View All Notifications"}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
        @keyframes pulse-slow { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
        @keyframes pulse-slower { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.4; } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(255,103,0,0.4); } 70% { box-shadow: 0 0 0 10px rgba(255,103,0,0); } 100% { box-shadow: 0 0 0 0 rgba(255,103,0,0); } }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
        .animate-pulse-slower { animation: pulse-slower 6s ease-in-out infinite; }
        .animate-shimmer { animation: shimmer 2s infinite; }
        .animate-pulse-ring { animation: pulse-ring 2s infinite; }
      `}</style>
    </div>
  );
}