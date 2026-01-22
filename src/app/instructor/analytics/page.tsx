"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Calendar,
  Award,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  Download,
  Filter,
  RefreshCw,
  PieChart,
  LineChart,
  BarChart,
  Target,
  Star,
  Clock,
  BookOpen,
  GraduationCap,
  Eye,
  FileText,
  ChevronLeft,
  TrendingUp as ArrowUp,
  TrendingDown as ArrowDown,
  Activity,
  Percent,
  Target as Bullseye,
  Zap,
  Shield,
  Trophy,
  Crown,
  UserCheck,
  Users as UsersIcon,
  CalendarDays,
  ChartBar,
  ChartLine,
  ChartPie,
} from "lucide-react";

// أنواع البيانات
interface AnalyticsData {
  overview: {
    totalGroups: number;
    activeGroups: number;
    completedGroups: number;
    totalStudents: number;
    totalSessions: number;
    completedSessions: number;
    completionRate: number;
    averageAttendance: number;
    studentsAtRisk: number;
    evaluatedStudents: number;
    evaluationRate: number;
    monthlyPerformance: {
      sessionsCompleted: number;
      totalSessions: number;
      attendanceRate: number;
      evaluationsCompleted: number;
      successRate: number;
    };
  };
  groups: {
    byLevel: Record<string, { count: number; students: number; sessions: number; attendance: number }>;
    byStatus: Record<string, { count: number; students: number; sessions: number; attendance: number }>;
    topGroupsByAttendance: Array<{
      id: string;
      name: string;
      code: string;
      level: string;
      status: string;
      students: number;
      sessions: number;
      attendanceRate: number;
    }>;
    distribution: {
      beginner: number;
      intermediate: number;
      advanced: number;
    };
  };
  students: {
    total: number;
    topStudentsByAttendance: Array<{
      id: string;
      name: string;
      enrollmentNumber: string;
      groupsCount: number;
      attendanceRate: number;
      totalSessions: number;
      attendedSessions: number;
      evaluation: {
        score: number;
        decision: string;
      } | null;
    }>;
    topStudentsByEvaluation: Array<any>;
    studentsNeedingAttention: Array<any>;
    attendanceDistribution: {
      excellent: number;
      good: number;
      average: number;
      poor: number;
      noData: number;
    };
    averageAttendance: number;
    evaluatedCount: number;
    evaluationRate: number;
  };
  attendance: {
    monthly: Array<{
      month: string;
      attendanceRate: number;
      present: number;
      total: number;
    }>;
    daily: Array<{
      day: string;
      attendanceRate: number;
      present: number;
      total: number;
    }>;
    timeSlots: Array<{
      slot: string;
      attendanceRate: number;
      present: number;
      total: number;
    }>;
    reasons: {
      present: number;
      absent: number;
      late: number;
      excused: number;
    };
    trends: {
      trend: "improving" | "declining" | "stable";
      percentage: number;
    };
  };
  evaluations: {
    totalEvaluations: number;
    decisionDistribution: {
      pass: number;
      review: number;
      repeat: number;
    };
    criteriaAverages: {
      understanding: number;
      commitment: number;
      attendance: number;
      participation: number;
      overall: number;
    };
    evaluationsByGroup: Record<string, any>;
    topEvaluations: Array<any>;
    bottomEvaluations: Array<any>;
    completionRate: number;
  };
  timeSeries: {
    sessions: Array<{
      month: string;
      sessions: number;
      completed: number;
    }>;
    attendance: Array<{
      month: string;
      attendanceRate: number;
      records: number;
    }>;
    evaluations: Array<{
      month: string;
      evaluations: number;
      averageScore: number;
    }>;
    cumulative: {
      totalSessions: number;
      completedSessions: number;
      completionRate: number;
      totalAttendance: number;
      presentAttendance: number;
      attendanceRate: number;
      totalEvaluations: number;
      averageEvaluationScore: number;
      passRate: number;
    };
  };
}

export default function InstructorAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState("");
  const [timeRange, setTimeRange] = useState("last30days");
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError("");

      console.log("📊 [Analytics] Fetching analytics data...");

      const response = await fetch(`/api/instructor-dashboard/analytics`, {
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const result = await response.json();

      console.log("📥 [Analytics] API Response:", {
        success: result.success,
        status: response.status,
      });

      if (!response.ok || !result.success) {
        throw new Error(result.message || "فشل في تحميل البيانات الإحصائية");
      }

      setAnalytics(result.data);

    } catch (error: any) {
      console.error("❌ [Analytics] Error:", error);
      setError(error.message || "حدث خطأ أثناء تحميل البيانات الإحصائية");

      if (error.message.includes("غير مصرح") || error.message.includes("UNAUTHORIZED")) {
        router.push("/signin");
      }
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "declining":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-gradient-to-r from-green-500 to-emerald-600";
    if (percentage >= 60) return "bg-gradient-to-r from-yellow-500 to-amber-600";
    return "bg-gradient-to-r from-red-500 to-rose-600";
  };

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600 dark:text-green-400";
    if (percentage >= 80) return "text-green-500 dark:text-green-300";
    if (percentage >= 70) return "text-yellow-600 dark:text-yellow-400";
    if (percentage >= 60) return "text-yellow-500 dark:text-yellow-300";
    return "text-red-600 dark:text-red-400";
  };

  const getEvaluationColor = (score: number) => {
    if (score >= 4) return "text-green-600 dark:text-green-400";
    if (score >= 3) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString("ar-EG");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            جاري تحميل البيانات الإحصائية...
          </p>
        </div>
      </div>
    );
  }

  if (error && !analytics) {
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
              onClick={fetchAnalytics}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              حاول مرة أخرى
            </button>
            <Link
              href="/instructor"
              className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
            >
              العودة للداشبورد
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const data = analytics || {
    overview: {
      totalGroups: 0,
      activeGroups: 0,
      completedGroups: 0,
      totalStudents: 0,
      totalSessions: 0,
      completedSessions: 0,
      completionRate: 0,
      averageAttendance: 0,
      studentsAtRisk: 0,
      evaluatedStudents: 0,
      evaluationRate: 0,
      monthlyPerformance: {
        sessionsCompleted: 0,
        totalSessions: 0,
        attendanceRate: 0,
        evaluationsCompleted: 0,
        successRate: 0,
      },
    },
    groups: {
      byLevel: {},
      byStatus: {},
      topGroupsByAttendance: [],
      distribution: { beginner: 0, intermediate: 0, advanced: 0 },
    },
    students: {
      total: 0,
      topStudentsByAttendance: [],
      topStudentsByEvaluation: [],
      studentsNeedingAttention: [],
      attendanceDistribution: { excellent: 0, good: 0, average: 0, poor: 0, noData: 0 },
      averageAttendance: 0,
      evaluatedCount: 0,
      evaluationRate: 0,
    },
    attendance: {
      monthly: [],
      daily: [],
      timeSlots: [],
      reasons: { present: 0, absent: 0, late: 0, excused: 0 },
      trends: { trend: "stable", percentage: 0 },
    },
    evaluations: {
      totalEvaluations: 0,
      decisionDistribution: { pass: 0, review: 0, repeat: 0 },
      criteriaAverages: { understanding: 0, commitment: 0, attendance: 0, participation: 0, overall: 0 },
      evaluationsByGroup: {},
      topEvaluations: [],
      bottomEvaluations: [],
      completionRate: 0,
    },
    timeSeries: {
      sessions: [],
      attendance: [],
      evaluations: [],
      cumulative: {
        totalSessions: 0,
        completedSessions: 0,
        completionRate: 0,
        totalAttendance: 0,
        presentAttendance: 0,
        attendanceRate: 0,
        totalEvaluations: 0,
        averageEvaluationScore: 0,
        passRate: 0,
      },
    },
  };

  const sections = [
    { id: "overview", name: "نظرة عامة", icon: BarChart3 },
    { id: "groups", name: "المجموعات", icon: Users },
    { id: "students", name: "الطلاب", icon: GraduationCap },
    { id: "attendance", name: "الحضور", icon: CheckCircle },
    { id: "evaluations", name: "التقييمات", icon: Award },
    { id: "trends", name: "الاتجاهات", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkmode">
      {/* Header */}
      <div className="bg-white dark:bg-secondary shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/instructor"
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-primary to-primary/80 rounded-lg">
                    <ChartLine className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    الإحصائيات والتقارير
                  </h1>
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  تحليل شامل لأداء مجموعاتك وطلابك
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchAnalytics}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                title="تحديث البيانات"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={() => window.print()}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                title="تصدير التقرير"
              >
                <Download className="w-5 h-5" />
              </button>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white text-sm"
              >
                <option value="last7days">آخر 7 أيام</option>
                <option value="last30days">آخر 30 يوم</option>
                <option value="last3months">آخر 3 أشهر</option>
                <option value="last6months">آخر 6 أشهر</option>
                <option value="lastyear">آخر سنة</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white dark:bg-secondary border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4">
          <nav className="flex overflow-x-auto">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all whitespace-nowrap ${isActive
                      ? "border-primary text-primary font-semibold"
                      : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{section.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* نظرة عامة */}
        {activeSection === "overview" && (
          <div className="space-y-6">
            {/* بطاقات الإحصائيات الرئيسية */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      {getTrendIcon("improving")}
                      <span className="text-xs text-green-600 dark:text-green-400">+12%</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                  {formatNumber(data.overview.totalStudents)}
                </h3>
                <p className="text-blue-700 dark:text-blue-400 font-medium">إجمالي الطلاب</p>
                <div className="mt-4 text-sm text-blue-600 dark:text-blue-300">
                  <span className="font-semibold">{data.overview.activeGroups}</span> مجموعة نشطة
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      {getTrendIcon(data.attendance.trends.trend)}
                      <span className={`text-xs ${data.attendance.trends.trend === "improving"
                          ? "text-green-600 dark:text-green-400"
                          : data.attendance.trends.trend === "declining"
                            ? "text-red-600 dark:text-red-400"
                            : "text-gray-600 dark:text-gray-400"
                        }`}>
                        {data.attendance.trends.trend === "improving" ? "+" : ""}{data.attendance.trends.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                <h3 className={`text-2xl font-bold ${getAttendanceColor(data.overview.averageAttendance)}`}>
                  {formatPercentage(data.overview.averageAttendance)}
                </h3>
                <p className="text-green-700 dark:text-green-400 font-medium">متوسط الحضور</p>
                <div className="mt-4 text-sm text-green-600 dark:text-green-300">
                  <span className="font-semibold">{data.overview.completedSessions}</span> جلسة مكتملة
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      {getTrendIcon("improving")}
                      <span className="text-xs text-green-600 dark:text-green-400">+8%</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-purple-800 dark:text-purple-300">
                  {formatPercentage(data.evaluations.criteriaAverages.overall * 20)}
                </h3>
                <p className="text-purple-700 dark:text-purple-400 font-medium">متوسط التقييم</p>
                <div className="mt-4 text-sm text-purple-600 dark:text-purple-300">
                  <span className="font-semibold">{data.evaluations.totalEvaluations}</span> تقييم مكتمل
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-6 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <Target className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      {getTrendIcon("improving")}
                      <span className="text-xs text-green-600 dark:text-green-400">+15%</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-amber-800 dark:text-amber-300">
                  {formatPercentage(data.overview.monthlyPerformance.successRate)}
                </h3>
                <p className="text-amber-700 dark:text-amber-400 font-medium">معدل النجاح</p>
                <div className="mt-4 text-sm text-amber-600 dark:text-amber-300">
                  <span className="font-semibold">{data.overview.studentsAtRisk}</span> طالب يحتاج متابعة
                </div>
              </div>
            </div>

            {/* أداء الشهر الماضي */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                    <Activity className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    أداء الشهر الماضي
                  </h3>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  مقارنة بالأشهر السابقة
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="text-2xl font-bold text-primary mb-2">
                    {data.overview.monthlyPerformance.sessionsCompleted}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">جلسات مكتملة</p>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-primary to-primary/80"
                        style={{ width: `${(data.overview.monthlyPerformance.sessionsCompleted / data.overview.monthlyPerformance.totalSessions) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {data.overview.monthlyPerformance.totalSessions} إجمالي الجلسات
                    </div>
                  </div>
                </div>

                <div className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className={`text-2xl font-bold ${getAttendanceColor(data.overview.monthlyPerformance.attendanceRate)} mb-2`}>
                    {formatPercentage(data.overview.monthlyPerformance.attendanceRate)}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">معدل الحضور</p>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getProgressColor(data.overview.monthlyPerformance.attendanceRate)}`}
                        style={{ width: `${data.overview.monthlyPerformance.attendanceRate}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatPercentage(data.overview.averageAttendance)} متوسط العام
                    </div>
                  </div>
                </div>

                <div className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                    {data.overview.monthlyPerformance.evaluationsCompleted}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">تقييمات مكتملة</p>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-purple-600"
                        style={{ width: `${data.overview.evaluationRate}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatPercentage(data.overview.evaluationRate)} من إجمالي الطلاب
                    </div>
                  </div>
                </div>

                <div className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                    {formatPercentage(data.overview.monthlyPerformance.successRate)}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">معدل النجاح</p>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600"
                        style={{ width: `${data.overview.monthlyPerformance.successRate}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      في التقييمات الشهرية
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* مؤشرات الأداء */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    تقدم المجموعات
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-sm">
                      {data.overview.activeGroups} نشطة
                    </span>
                    <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full text-sm">
                      {data.overview.completedGroups} مكتملة
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        نسبة إكمال الجلسات
                      </span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {formatPercentage(data.overview.completionRate)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-primary to-primary/80"
                        style={{ width: `${data.overview.completionRate}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        نسبة تقييم الطلاب
                      </span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {formatPercentage(data.overview.evaluationRate)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-600"
                        style={{ width: `${data.overview.evaluationRate}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        متوسط حضور الطلاب
                      </span>
                      <span className={`text-sm font-medium ${getAttendanceColor(data.overview.averageAttendance)}`}>
                        {formatPercentage(data.overview.averageAttendance)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${getProgressColor(data.overview.averageAttendance)}`}
                        style={{ width: `${data.overview.averageAttendance}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    حالة الطلاب
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-full text-sm">
                      {data.overview.studentsAtRisk} يحتاجون متابعة
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="text-xl font-bold text-green-600 dark:text-green-400">
                        {formatPercentage((data.students.attendanceDistribution.excellent / data.students.total) * 100)}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">ممتازون</p>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {data.students.attendanceDistribution.excellent} طالب
                      </div>
                    </div>
                    <div className="text-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                        {formatPercentage((data.students.attendanceDistribution.good / data.students.total) * 100)}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">جيدون</p>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {data.students.attendanceDistribution.good} طالب
                      </div>
                    </div>
                    <div className="text-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                        {formatPercentage((data.students.attendanceDistribution.average / data.students.total) * 100)}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">متوسطون</p>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {data.students.attendanceDistribution.average} طالب
                      </div>
                    </div>
                    <div className="text-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="text-xl font-bold text-red-600 dark:text-red-400">
                        {formatPercentage((data.students.attendanceDistribution.poor / data.students.total) * 100)}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">ضعاف</p>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {data.students.attendanceDistribution.poor} طالب
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* المجموعات */}
        {activeSection === "groups" && (
          <div className="space-y-6">
            {/* توزيع المجموعات */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                    <ChartPie className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    توزيع المجموعات حسب المستوى
                  </h3>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {data.overview.totalGroups} مجموعة
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(data.groups.distribution).map(([level, count]) => (
                  <div key={level} className="text-center p-6 border border-gray-200 dark:border-gray-700 rounded-xl">
                    <div className={`text-4xl font-bold mb-3 ${level === "beginner" ? "text-blue-600 dark:text-blue-400" :
                        level === "intermediate" ? "text-green-600 dark:text-green-400" :
                          "text-purple-600 dark:text-purple-400"
                      }`}>
                      {count}
                    </div>
                    <p className="text-lg font-medium text-gray-900 dark:text-white capitalize">
                      {level === "beginner" ? "مبتدئ" : level === "intermediate" ? "متوسط" : "متقدم"}
                    </p>
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${level === "beginner" ? "bg-blue-500" :
                              level === "intermediate" ? "bg-green-500" :
                                "bg-purple-500"
                            }`}
                          style={{ width: `${(count / data.overview.totalGroups) * 100}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {formatPercentage((count / data.overview.totalGroups) * 100)} من إجمالي المجموعات
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* أفضل المجموعات حسب الحضور */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    أفضل المجموعات حسب الحضور
                  </h3>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  أعلى 5 مجموعات
                </div>
              </div>

              <div className="space-y-4">
                {data.groups.topGroupsByAttendance.length > 0 ? (
                  data.groups.topGroupsByAttendance.map((group, index) => (
                    <div
                      key={group.id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10">
                          <Crown className={`w-5 h-5 ${index === 0 ? "text-yellow-500" :
                              index === 1 ? "text-gray-400" :
                                index === 2 ? "text-amber-600" : "text-gray-300"
                            }`} />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {group.name}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {group.code} • {group.level === "beginner" ? "مبتدئ" : group.level === "intermediate" ? "متوسط" : "متقدم"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className={`text-lg font-bold ${getAttendanceColor(group.attendanceRate)}`}>
                            {formatPercentage(group.attendanceRate)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            معدل الحضور
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {group.students}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            طالب
                          </div>
                        </div>
                        <Link
                          href={`/instructor/groups/${group.id}`}
                          className="p-2 text-gray-500 hover:text-primary transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      لا توجد بيانات عن المجموعات
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* إحصائيات المجموعات حسب الحالة */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  المجموعات النشطة
                </h3>
                <div className="space-y-4">
                  {data.groups.byStatus.active && (
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          عدد المجموعات
                        </span>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {data.groups.byStatus.active.count}
                        </span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          عدد الطلاب
                        </span>
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                          {data.groups.byStatus.active.students}
                        </span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          عدد الجلسات
                        </span>
                        <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                          {data.groups.byStatus.active.sessions}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          متوسط الحضور
                        </span>
                        <span className={`text-sm font-bold ${getAttendanceColor(data.groups.byStatus.active.attendance)}`}>
                          {formatPercentage(data.groups.byStatus.active.attendance)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  المجموعات المكتملة
                </h3>
                <div className="space-y-4">
                  {data.groups.byStatus.completed && (
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          عدد المجموعات
                        </span>
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                          {data.groups.byStatus.completed.count}
                        </span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          عدد الطلاب
                        </span>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {data.groups.byStatus.completed.students}
                        </span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          عدد الجلسات
                        </span>
                        <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                          {data.groups.byStatus.completed.sessions}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          متوسط الحضور
                        </span>
                        <span className={`text-sm font-bold ${getAttendanceColor(data.groups.byStatus.completed.attendance)}`}>
                          {formatPercentage(data.groups.byStatus.completed.attendance)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* الطلاب */}
        {activeSection === "students" && (
          <div className="space-y-6">
            {/* أفضل الطلاب حسب الحضور */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                    <UserCheck className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    أفضل الطلاب حسب الحضور
                  </h3>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  أعلى 10 طلاب
                </div>
              </div>

              <div className="space-y-3">
                {data.students.topStudentsByAttendance.length > 0 ? (
                  data.students.topStudentsByAttendance.map((student, index) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/20 dark:to-green-800/10">
                          <div className={`font-bold ${index === 0 ? "text-yellow-500" :
                              index === 1 ? "text-gray-400" :
                                index === 2 ? "text-amber-600" : "text-gray-600 dark:text-gray-400"
                            }`}>
                            #{index + 1}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {student.name}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {student.enrollmentNumber} • {student.groupsCount} مجموعة
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className={`text-lg font-bold ${getAttendanceColor(student.attendanceRate)}`}>
                            {formatPercentage(student.attendanceRate)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            حضور
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {student.attendedSessions}/{student.totalSessions}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            جلسات
                          </div>
                        </div>
                        {student.evaluation && (
                          <div className="text-right">
                            <div className={`text-lg font-bold ${getEvaluationColor(student.evaluation.score)}`}>
                              {student.evaluation.score.toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              تقييم
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <UsersIcon className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      لا توجد بيانات عن الطلاب
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* الطلاب المحتاجين متابعة */}
            {data.students.studentsNeedingAttention.length > 0 && (
              <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      الطلاب المحتاجين متابعة
                    </h3>
                  </div>
                  <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-full text-sm">
                    {data.students.studentsNeedingAttention.length} طالب
                  </span>
                </div>

                <div className="space-y-3">
                  {data.students.studentsNeedingAttention.slice(0, 5).map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30">
                          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {student.name}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {student.enrollmentNumber}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-lg font-bold text-red-600 dark:text-red-400">
                            {formatPercentage(student.attendanceRate)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            حضور
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {student.attendedSessions}/{student.totalSessions}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            جلسات
                          </div>
                        </div>
                        <button
                          onClick={() => router.push(`/instructor/students/${student.id}`)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          متابعة
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* توزيع الطلاب حسب مستوى الحضور */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  توزيع الطلاب حسب مستوى الحضور
                </h3>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  إجمالي: {data.students.total} طالب
                </div>
              </div>

              <div className="space-y-4">
                {Object.entries(data.students.attendanceDistribution).map(([level, count]) => {
                  const percentage = (count / data.students.total) * 100;
                  const color = level === "excellent" ? "bg-green-500" :
                    level === "good" ? "bg-green-400" :
                      level === "average" ? "bg-yellow-500" :
                        level === "poor" ? "bg-red-500" : "bg-gray-400";
                  const text = level === "excellent" ? "ممتاز (90%+)" :
                    level === "good" ? "جيد (70-89%)" :
                      level === "average" ? "متوسط (60-69%)" :
                        level === "poor" ? "ضعيف (أقل من 60%)" : "لا توجد بيانات";

                  return (
                    <div key={level} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {text}
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {count} طالب ({formatPercentage(percentage)})
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${color}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* الحضور */}
        {activeSection === "attendance" && (
          <div className="space-y-6">
            {/* معدل الحضور الشهري */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                    <ChartBar className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    معدل الحضور الشهري
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(data.attendance.trends.trend)}
                  <span className={`text-sm ${data.attendance.trends.trend === "improving"
                      ? "text-green-600 dark:text-green-400"
                      : data.attendance.trends.trend === "declining"
                        ? "text-red-600 dark:text-red-400"
                        : "text-gray-600 dark:text-gray-400"
                    }`}>
                    {data.attendance.trends.trend === "improving" ? "+" : ""}{data.attendance.trends.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {data.attendance.monthly.slice(-6).map((month) => (
                  <div key={month.month} className="text-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      {formatPercentage(month.attendanceRate)}
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-32 relative">
                      <div
                        className={`absolute bottom-0 left-0 right-0 rounded-full ${getProgressColor(month.attendanceRate)}`}
                        style={{ height: `${month.attendanceRate}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {month.month}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {month.present}/{month.total}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* الحضور حسب اليوم */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                الحضور حسب اليوم
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                  { ar: "الأحد", en: "Sunday" },
                  { ar: "الاثنين", en: "Monday" },
                  { ar: "الثلاثاء", en: "Tuesday" },
                  { ar: "الأربعاء", en: "Wednesday" },
                  { ar: "الخميس", en: "Thursday" },
                  { ar: "الجمعة", en: "Friday" },
                  { ar: "السبت", en: "Saturday" },
                ].map((day) => {
                  const dayData = data.attendance.daily.find(d => d.day.includes(day.en));
                  const attendanceRate = dayData?.attendanceRate || 0;

                  return (
                    <div key={day.ar} className="text-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {day.ar}
                      </div>
                      <div className={`text-xl font-bold ${getAttendanceColor(attendanceRate)}`}>
                        {formatPercentage(attendanceRate)}
                      </div>
                      {dayData && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {dayData.present}/{dayData.total}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* أسباب الحضور */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  أسباب الحضور
                </h3>
                <div className="space-y-4">
                  {Object.entries(data.attendance.reasons).map(([reason, count]) => {
                    const total = Object.values(data.attendance.reasons).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? (count / total) * 100 : 0;
                    const color = reason === "present" ? "bg-green-500" :
                      reason === "late" ? "bg-yellow-500" :
                        reason === "excused" ? "bg-blue-500" : "bg-red-500";
                    const text = reason === "present" ? "حاضر" :
                      reason === "late" ? "متأخر" :
                        reason === "excused" ? "معذور" : "غائب";

                    return (
                      <div key={reason} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {text}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {count} ({formatPercentage(percentage)})
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${color}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  الحضور حسب الوقت
                </h3>
                <div className="space-y-4">
                  {data.attendance.timeSlots.map((slot) => {
                    const slotText = slot.slot === "morning" ? "الصباح" :
                      slot.slot === "afternoon" ? "الظهر" : "المساء";

                    return (
                      <div key={slot.slot} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {slotText}
                          </span>
                          <span className={`text-sm font-medium ${getAttendanceColor(slot.attendanceRate)}`}>
                            {formatPercentage(slot.attendanceRate)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getProgressColor(slot.attendanceRate)}`}
                            style={{ width: `${slot.attendanceRate}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {slot.present}/{slot.total} طالب
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* التقييمات */}
        {activeSection === "evaluations" && (
          <div className="space-y-6">
            {/* متوسط التقييم حسب المعيار */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    متوسط التقييم حسب المعيار
                  </h3>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  من 5 نقاط
                </div>
              </div>

              <div className="space-y-4">
                {Object.entries(data.evaluations.criteriaAverages).map(([criterion, score]) => {
                  const percentage = (score / 5) * 100;
                  const criterionText = criterion === "understanding" ? "مستوى الفهم" :
                    criterion === "commitment" ? "الالتزام" :
                      criterion === "attendance" ? "الحضور" :
                        criterion === "participation" ? "المشاركة" : "المعدل العام";

                  return (
                    <div key={criterion} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {criterionText}
                        </span>
                        <span className={`text-sm font-bold ${getEvaluationColor(score)}`}>
                          {score.toFixed(1)} / 5
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${getProgressColor(percentage)}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* توزيع القرارات النهائية */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                توزيع القرارات النهائية
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(data.evaluations.decisionDistribution).map(([decision, count]) => {
                  const total = data.evaluations.totalEvaluations;
                  const percentage = total > 0 ? (count / total) * 100 : 0;
                  const color = decision === "pass" ? "bg-gradient-to-br from-green-500 to-emerald-600" :
                    decision === "review" ? "bg-gradient-to-br from-yellow-500 to-amber-600" :
                      "bg-gradient-to-br from-red-500 to-rose-600";
                  const text = decision === "pass" ? "ناجح" :
                    decision === "review" ? "قيد المراجعة" : "يعيد";
                  const icon = decision === "pass" ? CheckCircle :
                    decision === "review" ? AlertCircle : AlertCircle;

                  const Icon = icon;

                  return (
                    <div key={decision} className="text-center p-6 border border-gray-200 dark:border-gray-700 rounded-xl">
                      <div className={`w-16 h-16 rounded-full ${color} flex items-center justify-center mx-auto mb-4`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {count}
                      </h4>
                      <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
                        {text}
                      </p>
                      <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        {formatPercentage(percentage)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        من إجمالي التقييمات
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* أفضل التقييمات */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    أفضل التقييمات
                  </h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    أعلى 5 تقييمات
                  </div>
                </div>

                <div className="space-y-3">
                  {data.evaluations.topEvaluations.slice(0, 5).map((evaluation, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/20 dark:to-green-800/10">
                          <span className="font-bold text-green-600 dark:text-green-400">
                            {evaluation.score?.toFixed(1)}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                            {evaluation.studentName}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {evaluation.groupName}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${evaluation.decision === "pass" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" :
                          evaluation.decision === "review" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" :
                            "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                        }`}>
                        {evaluation.decision === "pass" ? "ناجح" :
                          evaluation.decision === "review" ? "مراجعة" : "يعيد"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    نسبة إكمال التقييمات
                  </h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatPercentage(data.evaluations.completionRate)}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        التقييمات المكتملة
                      </span>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">
                        {data.evaluations.totalEvaluations}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-600"
                        style={{ width: `${data.evaluations.completionRate}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        الطلاب المقيمين
                      </span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {data.students.evaluatedCount}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                        style={{ width: `${data.students.evaluationRate}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        معدل النجاح
                      </span>
                      <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                        {formatPercentage((data.evaluations.decisionDistribution.pass / data.evaluations.totalEvaluations) * 100)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-600"
                        style={{ width: `${(data.evaluations.decisionDistribution.pass / data.evaluations.totalEvaluations) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* الاتجاهات */}
        {activeSection === "trends" && (
          <div className="space-y-6">
            {/* الاتجاهات الشهرية */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-primary to-primary/80 rounded-lg">
                    <ChartLine className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    الاتجاهات الشهرية
                  </h3>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  آخر 12 شهر
                </div>
              </div>

              <div className="space-y-8">
                {/* الجلسات */}
                <div>
                  <div className="flex justify-between mb-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      الجلسات الشهرية
                    </h4>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      إجمالي: {data.timeSeries.cumulative.totalSessions} جلسة
                    </div>
                  </div>
                  <div className="flex items-end gap-2 h-32">
                    {data.timeSeries.sessions.slice(-6).map((month) => (
                      <div key={month.month} className="flex-1 flex flex-col items-center">
                        <div className="w-full flex items-end gap-1">
                          <div
                            className="w-1/2 bg-blue-500 rounded-t"
                            style={{ height: `${(month.sessions / Math.max(...data.timeSeries.sessions.map(s => s.sessions))) * 80}%` }}
                          ></div>
                          <div
                            className="w-1/2 bg-green-500 rounded-t"
                            style={{ height: `${(month.completed / Math.max(...data.timeSeries.sessions.map(s => s.completed))) * 80}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 truncate w-full text-center">
                          {month.month}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">المجموع</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">مكتملة</span>
                    </div>
                  </div>
                </div>

                {/* الحضور */}
                <div>
                  <div className="flex justify-between mb-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      معدل الحضور الشهري
                    </h4>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      متوسط: {formatPercentage(data.timeSeries.cumulative.attendanceRate)}
                    </div>
                  </div>
                  <div className="flex items-end gap-2 h-32">
                    {data.timeSeries.attendance.slice(-6).map((month) => (
                      <div key={month.month} className="flex-1 flex flex-col items-center">
                        <div
                          className={`w-3/4 ${getProgressColor(month.attendanceRate)} rounded-t`}
                          style={{ height: `${month.attendanceRate}%` }}
                        ></div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 truncate w-full text-center">
                          {month.month}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* التقييمات */}
                <div>
                  <div className="flex justify-between mb-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      التقييمات الشهرية
                    </h4>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      متوسط: {data.timeSeries.cumulative.averageEvaluationScore.toFixed(1)} / 5
                    </div>
                  </div>
                  <div className="flex items-end gap-2 h-32">
                    {data.timeSeries.evaluations.slice(-6).map((month) => (
                      <div key={month.month} className="flex-1 flex flex-col items-center">
                        <div className="w-full flex items-end gap-1">
                          <div
                            className="w-1/2 bg-purple-500 rounded-t"
                            style={{ height: `${(month.evaluations / Math.max(...data.timeSeries.evaluations.map(e => e.evaluations))) * 80}%` }}
                          ></div>
                          <div
                            className="w-1/2 bg-pink-500 rounded-t"
                            style={{ height: `${(month.averageScore / 5) * 80}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 truncate w-full text-center">
                          {month.month}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">العدد</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-pink-500 rounded"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">المعدل</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* الإحصائيات التراكمية */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                الإحصائيات التراكمية
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    title: "إجمالي الجلسات",
                    value: data.timeSeries.cumulative.totalSessions,
                    icon: CalendarDays,
                    color: "bg-gradient-to-br from-blue-500 to-blue-600",
                  },
                  {
                    title: "الجلسات المكتملة",
                    value: data.timeSeries.cumulative.completedSessions,
                    icon: CheckCircle,
                    color: "bg-gradient-to-br from-green-500 to-emerald-600",
                  },
                  {
                    title: "معدل إكمال الجلسات",
                    value: formatPercentage(data.timeSeries.cumulative.completionRate),
                    icon: Percent,
                    color: "bg-gradient-to-br from-teal-500 to-teal-600",
                  },
                  {
                    title: "إجمالي سجلات الحضور",
                    value: data.timeSeries.cumulative.totalAttendance,
                    icon: UsersIcon,
                    color: "bg-gradient-to-br from-purple-500 to-purple-600",
                  },
                  {
                    title: "الحضور الحاضر",
                    value: data.timeSeries.cumulative.presentAttendance,
                    icon: UserCheck,
                    color: "bg-gradient-to-br from-green-500 to-green-600",
                  },
                  {
                    title: "معدل الحضور العام",
                    value: formatPercentage(data.timeSeries.cumulative.attendanceRate),
                    icon: TrendingUp,
                    color: "bg-gradient-to-br from-amber-500 to-amber-600",
                  },
                  {
                    title: "إجمالي التقييمات",
                    value: data.timeSeries.cumulative.totalEvaluations,
                    icon: Award,
                    color: "bg-gradient-to-br from-pink-500 to-pink-600",
                  },
                  {
                    title: "معدل النجاح",
                    value: formatPercentage(data.timeSeries.cumulative.passRate),
                    icon: Trophy,
                    color: "bg-gradient-to-br from-red-500 to-rose-600",
                  },
                ].map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={index}
                      className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className={`w-12 h-12 rounded-full ${stat.color} flex items-center justify-center mx-auto mb-3`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                        {stat.value}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {stat.title}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}