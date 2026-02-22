"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StudentSidebar from "./StudentSidebar";
import {
  Calendar,
  BookOpen,
  Users,
  Clock,
  Award,
  AlertCircle,
  Loader2,
  ChevronRight,
  Play,
  CheckCircle,
  Bell,
  Menu,
} from "lucide-react";

// ============ Type Definitions ============
interface StudentUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  studentId?: string;
}

interface SystemStats {
  totalStudents?: number;
  totalActiveCourses?: number;
  systemCompletionRate?: number;
  [key: string]: any;
}

interface Stats {
  [key: string]: any;
}

interface ProgressStage {
  id: string;
  label: string;
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
  value: string | number;
  icon: string;
  bgColor: string;
  borderColor: string;
  iconColor: string;
}

interface ProgressData {
  stages: ProgressStage[];
  statsCards: ProgressStatsCard[];
  [key: string]: any;
}

interface Course {
  _id: string;
  title: string;
  description: string;
  progress: number;
  totalLessons?: number;
  hoursLeft?: number;
  gradient: string;
  icon: string;
}

interface UpcomingEvent {
  title: string;
  startTime: string;
  endTime: string;
  date?: string;
  type?: string;
}

interface NextSession {
  title: string;
  date: string;
  time: string;
  isToday: boolean;
  meetingLink?: string;
  groupId?: string;
  sessionId?: string;
}

interface Notification {
  id?: string;
  title: string;
  message?: string;
  time: string;
  type?: string;
  isRead?: boolean;
}

interface DashboardData {
  user: StudentUser;
  stats?: Stats;
  systemStats?: SystemStats;
  progressData?: ProgressData;
  nextSession?: NextSession;
  currentCourses?: Course[];
  upcomingEvents?: UpcomingEvent[];
  notifications?: Notification[];
  [key: string]: any;
}

interface ApiResponse {
  success: boolean;
  data: DashboardData;
  message?: string;
  error?: string;
}

// ============ Component ============
export default function StudentDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string>("");
  const [animateProgress, setAnimateProgress] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    fetchStudentData();
  }, []);

  useEffect(() => {
    if (dashboardData) {
      setTimeout(() => setAnimateProgress(true), 300);
    }
  }, [dashboardData]);

  const fetchStudentData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError("");

      const dashboardRes = await fetch(`/api/student/dashboard`, {
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const response: ApiResponse = await dashboardRes.json();

      if (!dashboardRes.ok || !response.success) {
        throw new Error(response.message || response.error || "فشل في تحميل بيانات الداشبورد");
      }

      setDashboardData(response.data);
    } catch (error: any) {
      console.error("❌ Error fetching student data:", error);
      setError(error.message || "حدث خطأ أثناء تحميل البيانات");

      if (
        error.message?.includes("غير مصرح") ||
        error.message?.includes("UNAUTHORIZED")
      ) {
        router.push("/signin");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/signin");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getCourseIcon = (iconType: string): React.ReactNode => {
    const icons: Record<string, React.ReactNode> = {
      code: (
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
      ),
      design: (
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
          />
        </svg>
      ),
      database: (
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
          />
        </svg>
      ),
      smartphone: (
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
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
    };
    return icons[iconName] || BookOpen;
  };

  const getStatIcon = (iconName: string): any => {
    const icons: Record<string, any> = {
      CheckCircle: CheckCircle,
      Clock: Clock,
      Award: Award,
    };
    return icons[iconName] || CheckCircle;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            جاري تحميل بيانات الداشبورد...
          </p>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            حدث خطأ
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={fetchStudentData}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              حاول مرة أخرى
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
    progressData,
    nextSession,
    currentCourses = [],
    upcomingEvents = [],
    notifications = [],
  } = dashboardData || {};

  const defaultUser: StudentUser = {
    _id: "",
    name: "Student",
    email: "",
    role: "student"
  };

  const currentUser = user || defaultUser;

  const defaultSystemStats: SystemStats = {
    totalStudents: 0,
    totalActiveCourses: 0,
    systemCompletionRate: 0
  };

  const currentSystemStats = systemStats || defaultSystemStats;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkmode flex relative">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar – fixed on mobile, static on desktop */}
      <div
        className={`
          fixed lg:static inset-y-0 right-0 z-50 transform transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
          flex-shrink-0
        `}
      >
        <StudentSidebar user={currentUser} onLogout={handleLogout} />
      </div>

      {/* Main Content */}
      <main className="flex-1 min-w-0 transition-all duration-300">
        {/* Header with mobile menu button */}
        <div className="bg-white dark:bg-secondary shadow-sm border-b border-gray-200 dark:border-dark_border sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
            <div className="flex items-center justify-between gap-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-darklight"
                aria-label="Toggle sidebar"
              >
                <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </button>

              {/* Title */}
              <div className="flex-1">
                <h1 className="text-xl lg:text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  Welcome back, {currentUser?.name?.split(" ")[0] || "Student"}! 👋
                </h1>
                <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400 mt-0.5 lg:mt-1">
                  Here's what's happening with your learning journey today
                </p>
              </div>

              {/* Search & Notifications */}
              <div className="flex items-center gap-2 lg:gap-4">
                <div className="relative hidden sm:block">
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-48 lg:w-64 px-4 pl-8 py-2 lg:py-2.5 pr-10 rounded-xl bg-gray-50 dark:bg-darklight border border-gray-200 dark:border-dark_border focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  />
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>

                {notifications && notifications.length > 0 && (
                  <button className="relative p-2 lg:p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-darklight transition-colors">
                    <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {notifications.length}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Main Grid - 2/3 + 1/3 on large screens */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
            {/* Left Column - spans 2 columns */}
            <div className="lg:col-span-2 space-y-6 lg:space-y-8">
              {/* Hero Banner */}
              <div className="bg-gradient-to-br from-primary via-lightblue to-lightcyan rounded-3xl p-6 lg:p-8 overflow-hidden relative">
                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
                  <div className="max-w-xl text-center lg:text-right">
                    <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">
                      Start Your Learning Journey
                    </h2>
                    <p className="text-blue-100 mb-6">
                      Track progress, engage with courses, and achieve
                      educational excellence
                    </p>
                    <div className="flex gap-3 justify-center lg:justify-start">
                      <Link
                        href="/dashboard/courses"
                        className="px-6 py-3 bg-white text-primary rounded-xl font-semibold hover:bg-blue-50 transition-all shadow-lg"
                      >
                        View Courses
                      </Link>
                      <button className="px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/20 transition-all border border-white/20">
                        Learn More
                      </button>
                    </div>
                  </div>
                  <div className="relative w-48 h-48 lg:w-64 lg:h-64 hidden lg:block">
                    <img
                      src="https://storage.googleapis.com/uxpilot-auth.appspot.com/cc128e889c-1e79b7c5933da33a6e8e.png"
                      alt="Learning"
                      className="w-full h-full object-contain drop-shadow-2xl"
                    />
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-secondary rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-dark_border hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      Active
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {currentSystemStats?.totalStudents?.toLocaleString() || "0"}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Total Students
                  </p>
                </div>

                <div className="bg-white dark:bg-secondary rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-dark_border hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      Available
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {currentSystemStats?.totalActiveCourses || "0"}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Active Courses
                  </p>
                </div>

                <div className="bg-white dark:bg-secondary rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-dark_border hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                      Excellent
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {currentSystemStats?.systemCompletionRate || "0"}%
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Completion Rate
                  </p>
                </div>
              </div>

              {/* ========== PROGRESS SECTION - FULLY MODIFIED ========== */}
              <div className="bg-white dark:bg-secondary rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100 dark:border-dark_border">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      Student Learning Progress
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Track your students' journey to success
                    </p>
                  </div>
                  <Link
                    href="/dashboard/progress"
                    className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1"
                  >
                    View All
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* Progress Timeline - No gaps, full width */}
                {progressData?.stages && progressData.stages.length > 0 && (
                  <div className="relative mb-8 w-full">
                    <div className="flex w-full items-stretch">
                      {progressData.stages.map((stage: ProgressStage, index: number) => {
                        const StageIcon = getStageIcon(stage.icon);
                        const isCompleted = stage.status === "completed";
                        const isActive = stage.isActive || stage.status === "active";
                        const isPending = stage.status === "pending";
                        const isAlmostThere = stage.status === "almost_there";

                        const nextStage = progressData.stages[index + 1];
                        let lineProgress = 0;

                        if (isCompleted) {
                          lineProgress = 100;
                        } else if (isActive && nextStage) {
                          const currentPercentage = stage.percentage || 0;
                          const nextPercentage = nextStage.percentage || 0;
                          lineProgress =
                            currentPercentage > 0 && nextPercentage > 0
                              ? Math.min((currentPercentage / nextPercentage) * 100, 100)
                              : 0;
                        }

                        return (
                          <div
                            key={stage.id}
                            className={`flex items-center ${index === progressData.stages.length - 1
                              ? "flex-none"
                              : "flex-1"
                              }`}
                          >
                            {/* Stage Circle - fixed width */}
                            <div className="flex flex-col items-center w-16">
                              <div
                                className={`
                                  w-12 h-12 rounded-full flex items-center justify-center shadow-lg mb-2 relative
                                  transition-all duration-700 ease-out mx-auto
                                  ${animateProgress ? "scale-100 opacity-100" : "scale-50 opacity-0"}
                                  ${isCompleted ? `bg-gradient-to-br ${stage.gradient}` : ""}
                                  ${isActive
                                    ? `bg-gradient-to-br ${stage.gradient} ring-4 ring-${stage.color}-200 dark:ring-${stage.color}-900/30`
                                    : ""
                                  }
                                  ${isAlmostThere
                                    ? `bg-gradient-to-br ${stage.gradient} opacity-60`
                                    : ""
                                  }
                                  ${isPending
                                    ? "bg-gray-100 dark:bg-darklight border-2 border-gray-200 dark:border-dark_border"
                                    : ""
                                  }
                                `}
                                style={{
                                  transitionDelay: `${index * 150}ms`,
                                }}
                              >
                                <StageIcon
                                  className={`
                                    w-6 h-6 transition-all duration-500
                                    ${isPending ? "text-gray-300 dark:text-gray-600" : "text-white"}
                                    ${isActive ? "animate-bounce" : ""}
                                  `}
                                />

                                {isActive && (
                                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-4 border-white dark:border-secondary flex items-center justify-center animate-ping">
                                    <span className="text-white text-[10px] font-bold">!</span>
                                  </div>
                                )}

                                {isCompleted && (
                                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-secondary flex items-center justify-center">
                                    <CheckCircle className="w-2.5 h-2.5 text-white" />
                                  </div>
                                )}
                              </div>

                              <div className="text-center w-full">
                                <span
                                  className={`
                                    inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold mb-1
                                    transition-all duration-500
                                    ${animateProgress ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
                                    ${isCompleted ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : ""}
                                    ${isActive ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : ""}
                                    ${isAlmostThere ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" : ""}
                                    ${isPending ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400" : ""}
                                  `}
                                  style={{ transitionDelay: `${index * 150 + 100}ms` }}
                                >
                                  {isCompleted && "Completed"}
                                  {isActive && "In Progress"}
                                  {isAlmostThere && "Almost There"}
                                  {isPending && "Pending"}
                                </span>
                                <p
                                  className={`
                                    font-semibold text-xs transition-all duration-500 truncate px-1
                                    ${animateProgress ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
                                    ${isPending ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-white"}
                                  `}
                                  style={{ transitionDelay: `${index * 150 + 150}ms` }}
                                >
                                  {stage.label}
                                </p>
                                <p
                                  className={`
                                    text-[10px] transition-all duration-500
                                    ${animateProgress ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
                                    ${isPending ? "text-gray-400 dark:text-gray-500" : "text-gray-500 dark:text-gray-400"}
                                  `}
                                  style={{ transitionDelay: `${index * 150 + 200}ms` }}
                                >
                                  {stage.percentage}%
                                </p>
                              </div>
                            </div>

                            {/* Progress Line - only if not last item */}
                            {index < progressData.stages.length - 1 && (
                              <div className="flex-1 h-1.5 relative overflow-hidden mx-0.5">
                                <div className="absolute inset-0 bg-gray-200 dark:bg-darklight rounded-full"></div>
                                <div
                                  className={`
                                    absolute left-0 top-0 h-full rounded-full
                                    transition-all duration-1000 ease-out
                                    bg-gradient-to-r ${stage.gradient}
                                  `}
                                  style={{
                                    width: animateProgress ? `${lineProgress}%` : "0%",
                                    transitionDelay: `${index * 150 + 300}ms`,
                                  }}
                                >
                                  {(isCompleted || isActive) && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
                                  )}
                                </div>
                                {isActive && lineProgress > 0 && lineProgress < 100 && (
                                  <div
                                    className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-lg transition-all duration-1000 ease-out"
                                    style={{
                                      left: animateProgress ? `${lineProgress}%` : "0%",
                                      transitionDelay: `${index * 150 + 300}ms`,
                                    }}
                                  >
                                    <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Stats Cards - smaller and centered */}
                {progressData?.statsCards && progressData.statsCards.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 justify-items-center">
                    {progressData.statsCards.map((card: ProgressStatsCard, idx: number) => {
                      const StatIcon = getStatIcon(card.icon);
                      return (
                        <div
                          key={card.id}
                          className={`
                            flex items-start gap-2 p-4 rounded-xl border 
                            ${card.bgColor} ${card.borderColor}
                            transition-all duration-500 w-auto
                            ${animateProgress ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}
                            hover:shadow-md hover:scale-105
                          `}
                          style={{ transitionDelay: `${600 + idx * 100}ms` }}
                        >
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${card.iconColor}`}
                          >
                            <StatIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">
                              {card.value}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {card.title}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Current Courses */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Current Courses
                  </h3>
                  <Link
                    href="/dashboard/courses"
                    className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1"
                  >
                    View All
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentCourses && currentCourses.length > 0 ? (
                    currentCourses.map((course: Course) => (
                      <div
                        key={course._id}
                        className="bg-white dark:bg-secondary rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-dark_border hover:shadow-md transition-all group cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div
                            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${course.gradient} flex items-center justify-center flex-shrink-0`}
                          >
                            {getCourseIcon(course.icon)}
                          </div>
                          <span className="px-3 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded-full text-xs font-semibold">
                            In Progress
                          </span>
                        </div>

                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary transition-colors">
                          {course.title}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                          {course.description}
                        </p>

                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-600 dark:text-gray-400">
                              Progress
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {course.progress}%
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-gray-200 dark:bg-darklight rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${course.gradient} rounded-full transition-all duration-1000 ease-out`}
                              style={{ width: `${course.progress}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            <BookOpen className="w-4 h-4" />
                            <span>{course.totalLessons || 0} Lessons</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span>{course.hoursLeft || 0}h left</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400">
                        No courses enrolled yet
                      </p>
                      <Link
                        href="/dashboard/courses"
                        className="inline-block mt-2 text-primary hover:underline"
                      >
                        Browse Courses
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Sticky, filled with widgets */}
            <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24 lg:self-start">
              {/* Calendar & Upcoming Events */}
              <div className="bg-white dark:bg-secondary rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-dark_border">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Calendar
                </h3>

                <div className="text-center mb-4">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    {new Date()
                      .toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })
                      .toUpperCase()}
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-xs mb-2">
                    {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day: string) => (
                      <div
                        key={day}
                        className="text-gray-500 dark:text-gray-400 font-medium py-1"
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-sm">
                    {Array.from({ length: 21 }, (_, i) => {
                      const today = new Date().getDate();
                      const day = i + today - 10;
                      const isToday = day === today;

                      return (
                        <button
                          key={i}
                          className={`
                            aspect-square rounded-lg flex items-center justify-center font-medium transition-all
                            ${isToday
                              ? "bg-primary text-white shadow-md"
                              : day < today
                                ? "text-gray-400 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-darklight"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-darklight"
                            }
                          `}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Upcoming Events
                  </h4>
                  {upcomingEvents && upcomingEvents.length > 0 ? (
                    upcomingEvents.slice(0, 2).map((event: UpcomingEvent, idx: number) => (
                      <div
                        key={idx}
                        className={`
                          flex items-start gap-3 p-3 rounded-xl border
                          ${idx === 0
                            ? "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30"
                            : "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30"
                          }
                        `}
                      >
                        <div
                          className={`
                            w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                            ${idx === 0
                              ? "bg-gradient-to-br from-green-400 to-emerald-500"
                              : "bg-gradient-to-br from-blue-400 to-cyan-500"
                            }
                          `}
                        >
                          <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                            {event.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {event.startTime} - {event.endTime}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                      No upcoming events
                    </p>
                  )}
                </div>

                {/* Next Session Widget - expects date and time from backend */}
                {nextSession && (
                  <div className="mt-6 pt-6 border-t border-gray-100 dark:border-dark_border">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {nextSession.isToday ? "Today's Session" : "Next Session"}
                    </h4>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {nextSession.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {nextSession.date} · {nextSession.time}
                      </p>

                      {nextSession.isToday && nextSession.meetingLink && (
                        <a
                          href={nextSession.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center text-sm text-primary font-medium hover:underline"
                        >
                          Join now
                          <ChevronRight className="w-4 h-4 mr-1" />
                        </a>
                      )}

                      {nextSession.isToday && !nextSession.meetingLink && (
                        <p className="mt-3 text-xs text-yellow-600 dark:text-yellow-400">
                          Meeting link will be available soon
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Notifications Widget */}
              {notifications && notifications.length > 0 && (
                <div className="bg-white dark:bg-secondary rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-dark_border">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      Notifications
                    </h4>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {notifications.length} new
                    </span>
                  </div>
                  <div className="space-y-3">
                    {notifications.slice(0, 3).map((note: Notification, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-darklight transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Bell className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {note.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {note.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/dashboard/notifications"
                    className="mt-4 block text-center text-sm text-primary hover:text-primary/80 font-medium"
                  >
                    View all notifications
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}