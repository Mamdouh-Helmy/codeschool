// app/instructor/groups/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Calendar,
  Clock,
  BookOpen,
  TrendingUp,
  Search,
  Filter,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  BarChart3,
  Eye,
  MoreVertical,
  Plus,
  Download,
  RefreshCw,
  Award,
  Star,
  ClipboardCheck,
  GraduationCap,
} from "lucide-react";

// أنواع البيانات
interface Group {
  id: string;
  name: string;
  code: string;
  status: "active" | "completed" | "draft" | "cancelled";
  course: {
    title: string;
    level: string;
  };
  instructors: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  schedule: {
    startDate: string;
    daysOfWeek: string[];
    timeFrom: string;
    timeTo: string;
    timezone: string;
  };
  studentCount: number;
  maxStudents: number;
  stats: {
    totalSessions: number;
    completedSessions: number;
    upcomingSessions: number;
    attendanceRate: number;
    studentsAtRisk: number;
    studentCapacity: string;
  };
  nextSession?: {
    title: string;
    date: string;
    time: string;
  };
  progress: number;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    evaluationsEnabled?: boolean;
    evaluationsCompleted?: boolean;
    evaluationSummary?: {
      totalStudents?: number;
      evaluatedStudents?: number;
      pendingStudents?: number;
    };
  };
}

interface GroupsResponse {
  success: boolean;
  data: Group[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  stats: {
    totalGroups: number;
    activeGroups: number;
    completedGroups: number;
    totalStudents: number;
    averageAttendance: number;
    totalStudentsAtRisk: number;
  };
  filters: {
    search: string;
    status: string;
    applied: {
      search: boolean;
      status: boolean;
    };
  };
}

export default function InstructorGroupsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false,
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      console.log("🔄 [Instructor Groups] Fetching groups...");

      let url = `/api/instructor-dashboard/groups?page=${page}&limit=${pagination.limit}`;
      
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      
      if (filterStatus !== "all") {
        url += `&status=${filterStatus}`;
      }

      const groupsRes = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const response: GroupsResponse = await groupsRes.json();

      console.log("📥 [Instructor Groups] API Response:", {
        success: response.success,
        status: groupsRes.status,
        count: response.data?.length,
      });

      if (!groupsRes.ok || !response.success) {
        throw new Error(response.message || "فشل في تحميل المجموعات");
      }

      setGroups(response.data || []);
      setStats(response.stats || {});
      setPagination(response.pagination || pagination);

    } catch (error: any) {
      console.error("❌ [Instructor Groups] Error fetching groups:", error);
      setError(error.message || "حدث خطأ أثناء تحميل المجموعات");

      if (error.message.includes("غير مصرح") || error.message.includes("UNAUTHORIZED")) {
        router.push("/signin");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGroups(1);
  };

  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
    setTimeout(() => fetchGroups(1), 100);
  };

  const handlePageChange = (page: number) => {
    fetchGroups(page);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "تاريخ غير صالح";

      return date.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getDaysInArabic = (days: string[]) => {
    const daysMap: Record<string, string> = {
      Sunday: "الأحد",
      Monday: "الاثنين",
      Tuesday: "الثلاثاء",
      Wednesday: "الأربعاء",
      Thursday: "الخميس",
      Friday: "الجمعة",
      Saturday: "السبت",
    };

    return days.map((day) => daysMap[day] || day).join("، ");
  };

  const getStatusBadge = (status: string) => {
    const config = {
      active: {
        bg: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        text: "نشط",
        icon: TrendingUp,
      },
      completed: {
        bg: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        text: "مكتمل",
        icon: CheckCircle,
      },
      draft: {
        bg: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
        text: "مسودة",
        icon: AlertCircle,
      },
      cancelled: {
        bg: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        text: "ملغي",
        icon: XCircle,
      },
    };

    return config[status as keyof typeof config] || config.active;
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "bg-green-600";
    if (progress >= 50) return "bg-yellow-600";
    return "bg-red-600";
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 80) return "text-green-600";
    if (rate >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getEvaluationStatusBadge = (group: Group) => {
    // ⚠️ تحديث: فقط المجموعات المكتملة يمكن تقييمها
    if (group.status !== "completed") return null;
    
    if (group.metadata?.evaluationsCompleted) {
      return {
        bg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
        text: "تم التقييم",
        icon: Award,
        progress: 100,
      };
    }
    
    if (group.metadata?.evaluationsEnabled) {
      const evaluated = group.metadata?.evaluationSummary?.evaluatedStudents || 0;
      const total = group.metadata?.evaluationSummary?.totalStudents || group.studentCount || 1;
      const progress = Math.round((evaluated / total) * 100);
      
      return {
        bg: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
        text: `جاري التقييم (${evaluated}/${total})`,
        icon: ClipboardCheck,
        progress,
      };
    }
    
    return {
      bg: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
      text: "يتطلب التقييم",
      icon: GraduationCap,
      progress: 0,
    };
  };

  const canShowEvaluationButton = (group: Group) => {
    // ⚠️ تحديث: فقط المجموعات المكتملة يمكن تقييمها
    return group.status === "completed";
  };

  if (loading && groups.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            جاري تحميل المجموعات...
          </p>
        </div>
      </div>
    );
  }

  if (error && groups.length === 0) {
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
              onClick={() => fetchGroups(1)}
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
                <ChevronRight className="w-5 h-5 rotate-180" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  مجموعاتي
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  إدارة ومراقبة جميع مجموعاتك
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => fetchGroups(1)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                title="تحديث"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <Link
                href="/instructor"
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                العودة للداشبورد
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* إحصائيات */}
        {stats && (
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              إحصائيات المجموعات
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-1">
                  {stats.totalGroups}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-300">
                  إجمالي المجموعات
                </div>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400 mb-1">
                  {stats.activeGroups}
                </div>
                <div className="text-sm text-green-600 dark:text-green-300">
                  مجموعات نشطة
                </div>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-400 mb-1">
                  {stats.totalStudents}
                </div>
                <div className="text-sm text-purple-600 dark:text-purple-300">
                  إجمالي الطلاب
                </div>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400 mb-1">
                  {Math.round(stats.averageAttendance)}%
                </div>
                <div className="text-sm text-yellow-600 dark:text-yellow-300">
                  متوسط الحضور
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {stats.totalStudentsAtRisk} يحتاجون متابعة
                </div>
              </div>
            </div>
          </div>
        )}

        {/* فلتر وبحث */}
        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* بحث */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <form onSubmit={handleSearch}>
                <input
                  type="text"
                  placeholder="ابحث عن مجموعة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
                />
              </form>
            </div>

            {/* تصفية حسب الحالة */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                حالة المجموعة
              </label>
              <select
                value={filterStatus}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              >
                <option value="all">جميع المجموعات</option>
                <option value="active">نشطة فقط</option>
                <option value="completed">مكتملة فقط</option>
                <option value="draft">مسودة فقط</option>
                <option value="cancelled">ملغية فقط</option>
              </select>
            </div>

            {/* إجراءات */}
            <div className="flex items-end gap-2">
              <button
                onClick={() => fetchGroups(1)}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <span>تحديث البيانات</span>
              </button>
            </div>
          </div>
        </div>

        {/* معلومات النتائج */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                عرض {groups.length} مجموعة من {pagination.total}
              </span>
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">
              الصفحة {pagination.page} من {pagination.pages}
            </div>
          </div>
        </div>

        {/* قائمة المجموعات */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {groups.map((group) => {
            const statusConfig = getStatusBadge(group.status);
            const StatusIcon = statusConfig.icon;
            const evaluationStatus = getEvaluationStatusBadge(group);
            const EvaluationIcon = evaluationStatus?.icon || Star;
            const canEvaluate = canShowEvaluationButton(group);

            return (
              <div
                key={group.id}
                className="bg-white dark:bg-secondary rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700"
              >
                <div className="p-6">
                  {/* العنوان والحالة */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {group.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {group.code} • {group.course.title}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${statusConfig.bg}`}
                      >
                        <StatusIcon className="inline w-4 h-4 mr-1 rtl:ml-1" />
                        {statusConfig.text}
                      </span>
                      
                      {evaluationStatus && (
                        <span
                          className={`px-3 py-1 rounded-full text-xs ${evaluationStatus.bg}`}
                        >
                          <EvaluationIcon className="inline w-3 h-3 mr-1 rtl:ml-1" />
                          {evaluationStatus.text}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* تفاصيل المجموعة */}
                  <div className="space-y-4">
                    {/* المدرس والوقت */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            المدرس
                          </p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {group.instructors[0]?.name || "بدون مدرس"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            الوقت
                          </p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {group.schedule.timeFrom} - {group.schedule.timeTo}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* الأيام والطلاب */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            الأيام
                          </p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {getDaysInArabic(group.schedule.daysOfWeek)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <BookOpen className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            الطلاب
                          </p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {group.stats.studentCapacity}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* الإحصائيات */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                          الحصص
                        </p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {group.stats.totalSessions}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {group.stats.completedSessions} مكتملة
                        </p>
                      </div>

                      <div className="text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                          الحضور
                        </p>
                        <p
                          className={`text-lg font-bold ${getAttendanceColor(
                            group.stats.attendanceRate
                          )}`}
                        >
                          {group.stats.attendanceRate}%
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {group.stats.studentsAtRisk} يحتاجون متابعة
                        </p>
                      </div>

                      <div className="text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                          التقدم
                        </p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {group.progress}%
                        </p>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                          <div
                            className={`h-1.5 rounded-full ${getProgressColor(
                              group.progress
                            )}`}
                            style={{ width: `${group.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* حالة التقييم */}
                    {evaluationStatus && evaluationStatus.progress > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            تقدم التقييمات
                          </span>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            {evaluationStatus.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600"
                            style={{ width: `${evaluationStatus.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* الجلسة التالية */}
                    {group.nextSession && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                              الجلسة التالية
                            </span>
                          </div>
                          <span className="text-xs text-blue-600 dark:text-blue-400">
                            {formatDate(group.nextSession.date)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          {group.nextSession.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {group.nextSession.time}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 dark:bg-gray-800 px-6 py-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <Calendar className="inline w-4 h-4 mr-1 rtl:ml-1" />
                      بدأت: {formatDate(group.schedule.startDate)}
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/instructor/groups/${group.id}`}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        <span>عرض التفاصيل</span>
                      </Link>
                      
                      {/* ⚠️ تحديث: زر التقييم يظهر فقط للمجموعات المكتملة */}
                      {canEvaluate && (
                        <Link
                          href={`/instructor/groups/${group.id}/evaluations`}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                        >
                          <Star className="w-4 h-4" />
                          <span>تقييم الطلاب</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-8 flex justify-center">
            <nav className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrev}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                السابق
              </button>

              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                let pageNum;
                if (pagination.pages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.pages - 2) {
                  pageNum = pagination.pages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-2 rounded-lg ${
                      pagination.page === pageNum
                        ? "bg-primary text-white"
                        : "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNext}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                التالي
              </button>
            </nav>
          </div>
        )}

        {groups.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-secondary rounded-xl shadow-lg">
            <Users className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              لا توجد مجموعات
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm || filterStatus !== "all"
                ? "لا توجد نتائج مطابقة للبحث"
                : "لم يتم تعيينك إلى أي مجموعة بعد"}
            </p>
            <div className="flex gap-3 justify-center">
              {searchTerm || filterStatus !== "all" ? (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setFilterStatus("all");
                    fetchGroups(1);
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  إعادة تعيين الفلاتر
                </button>
              ) : null}
              <Link
                href="/instructor"
                className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
              >
                العودة للداشبورد
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}