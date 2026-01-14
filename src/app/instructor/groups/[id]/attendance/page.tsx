// app/instructor/groups/[id]/attendance/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Calendar,
  Clock,
  CheckSquare,
  BarChart3,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Download,
  Printer,
  Eye,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  CalendarDays,
  Layers,
  FileText,
  ArrowLeft,
  RefreshCw,
  Filter as FilterIcon,
  X,
  Plus,
  Edit,
  MoreVertical,
  MessageSquare,
  Phone,
  Mail,
} from "lucide-react";

// أنواع البيانات
interface StudentInfo {
  id: string;
  name: string;
  email?: string;
  enrollmentNumber?: string;
  guardianInfo?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
}

interface SessionAttendance {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  moduleIndex: number;
  sessionNumber: number;
  lessonIndexes: number[];
  attendanceTaken: boolean;
  studentAttendance?: {
    status: string;
    notes?: string;
    markedAt?: string;
    markedBy?: string;
  };
  studentAttendanceStatus: string;
  totalAttendance: number;
  presentCount: number;
  absentCount: number;
}

interface GroupStats {
  totalSessions: number;
  sessionsWithAttendance: number;
  totalAttendanceRecords: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
}

interface StudentStats {
  totalSessions: number;
  attended: number;
  attendanceRate: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  lastAttendance: string | null;
  consecutiveAbsences: number;
  attendanceRecords: Array<{
    sessionId: string;
    status: string;
    date: string;
    notes?: string;
  }>;
}

interface FilterOption {
  value: string;
  label: string;
}

interface AttendanceData {
  groupInfo: {
    id: string;
    name: string;
    code: string;
    course: {
      title: string;
      level: string;
    } | null;
  };
  student: StudentInfo | null;
  sessions: SessionAttendance[];
  groupStats: GroupStats;
  studentStats: StudentStats | null;
  filters: {
    current: {
      student: string | null;
      filterType: string;
      moduleFilter: string;
      statusFilter: string;
      dateFrom: string | null;
      dateTo: string | null;
    };
    availableModules: Array<{
      moduleIndex: number;
      moduleNumber: number;
      sessionCount: number;
    }>;
    availableStatuses: FilterOption[];
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export default function GroupAttendancePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const groupId = params.id as string;
  const studentId = searchParams.get("student");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AttendanceData | null>(null);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    module: "all",
    status: "all",
    dateFrom: "",
    dateTo: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  useEffect(() => {
    fetchAttendanceData();
  }, [groupId, studentId, currentPage, filters]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      setError("");

      const queryParams = new URLSearchParams();
      if (studentId) queryParams.set("student", studentId);
      if (filters.module !== "all") queryParams.set("module", filters.module);
      if (filters.status !== "all") queryParams.set("status", filters.status);
      if (filters.dateFrom) queryParams.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) queryParams.set("dateTo", filters.dateTo);
      queryParams.set("page", currentPage.toString());

      const response = await fetch(
        `/api/instructor-dashboard/groups/${groupId}/attendance?${queryParams}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "فشل في تحميل بيانات الحضور");
      }

      setData(result.data);
    } catch (error: any) {
      console.error("❌ [Attendance Page] Error:", error);
      setError(error.message || "حدث خطأ أثناء تحميل البيانات");

      if (error.message.includes("غير مصرح") || error.message.includes("UNAUTHORIZED")) {
        router.push("/signin");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "تاريخ غير صالح";

      return date.toLocaleDateString("ar-EG", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    return timeString || "غير محدد";
  };

  const getStatusColor = (status: string) => {
    const colors = {
      present: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      absent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      late: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      excused: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      not_marked: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
      not_recorded: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    };
    return colors[status as keyof typeof colors] || colors.not_marked;
  };

  const getStatusText = (status: string) => {
    const texts = {
      present: "حاضر",
      absent: "غائب",
      late: "متأخر",
      excused: "معذور",
      not_marked: "لم يتم التسجيل",
      not_recorded: "لم يسجل في الجلسة",
    };
    return texts[status as keyof typeof texts] || status;
  };

  const getSessionStatusColor = (status: string) => {
    const colors = {
      scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      postponed: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    };
    return colors[status as keyof typeof colors] || colors.scheduled;
  };

  const getSessionStatusText = (status: string) => {
    const texts = {
      scheduled: "مجدولة",
      completed: "مكتملة",
      cancelled: "ملغاة",
      postponed: "مؤجلة",
    };
    return texts[status as keyof typeof texts] || status;
  };

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      module: "all",
      status: "all",
      dateFrom: "",
      dateTo: "",
    });
    setCurrentPage(1);
  };

  const handleExport = () => {
    if (!data) return;
    
    const exportData = {
      groupInfo: data.groupInfo,
      student: data.student,
      sessions: data.sessions,
      groupStats: data.groupStats,
      studentStats: data.studentStats,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${data.groupInfo.code}-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            جاري تحميل بيانات الحضور...
          </p>
        </div>
      </div>
    );
  }

  if (error && !data) {
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
              onClick={fetchAttendanceData}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              حاول مرة أخرى
            </button>
            <Link
              href={`/instructor/groups/${groupId}`}
              className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
            >
              العودة للمجموعة
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { groupInfo, student, sessions, groupStats, studentStats, filters: filterData, pagination } = data!;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkmode">
      {/* Header */}
      <div className="bg-white dark:bg-secondary shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <Link
                href={`/instructor/groups/${groupId}${student ? `/students/${student.id}` : ""}`}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CheckSquare className="w-6 h-6 text-primary" />
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    سجل الحضور
                  </h1>
                  {student && (
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                      {student.name}
                    </span>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  {groupInfo.name} • {groupInfo.code}
                  {groupInfo.course && ` • ${groupInfo.course.title}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchAttendanceData}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                title="تحديث البيانات"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                title="عرض/إخفاء الفلاتر"
              >
                <FilterIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleExport}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                title="تصدير البيانات"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={handlePrint}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                title="طباعة"
              >
                <Printer className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-secondary border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-gray-900 dark:text-white">فلاتر البحث</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Module Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الموديول
                </label>
                <select
                  value={filters.module}
                  onChange={(e) => handleFilterChange("module", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
                >
                  <option value="all">جميع الموديولات</option>
                  {filterData.availableModules.map((module) => (
                    <option key={module.moduleIndex} value={module.moduleIndex}>
                      الموديول {module.moduleNumber} ({module.sessionCount} جلسة)
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  حالة الجلسة
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
                >
                  {filterData.availableStatuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  من تاريخ
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  إلى تاريخ
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
              >
                إعادة تعيين الفلاتر
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Group Stats Card */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-gray-900 dark:text-white">إحصائيات المجموعة</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">إجمالي الجلسات</span>
                <span className="font-medium text-gray-900 dark:text-white">{groupStats.totalSessions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">جلسات تم تسجيل الحضور</span>
                <span className="font-medium text-green-600 dark:text-green-400">{groupStats.sessionsWithAttendance}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">إجمالي تسجيلات الحضور</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">{groupStats.totalAttendanceRecords}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">نسبة الحضور العامة</span>
                <span className={`font-medium ${
                  groupStats.totalAttendanceRecords > 0 
                    ? (groupStats.presentCount / groupStats.totalAttendanceRecords) >= 0.8 
                      ? "text-green-600 dark:text-green-400" 
                      : (groupStats.presentCount / groupStats.totalAttendanceRecords) >= 0.6 
                        ? "text-yellow-600 dark:text-yellow-400" 
                        : "text-red-600 dark:text-red-400"
                    : "text-gray-600 dark:text-gray-400"
                }`}>
                  {groupStats.totalAttendanceRecords > 0 
                    ? Math.round((groupStats.presentCount / groupStats.totalAttendanceRecords) * 100) 
                    : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Student Stats Card (if student selected) */}
          {studentStats && (
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <User className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">إحصائيات الطالب</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">نسبة الحضور</span>
                  <span className={`font-medium ${
                    studentStats.attendanceRate >= 80 
                      ? "text-green-600 dark:text-green-400" 
                      : studentStats.attendanceRate >= 60 
                        ? "text-yellow-600 dark:text-yellow-400" 
                        : "text-red-600 dark:text-red-400"
                  }`}>
                    {studentStats.attendanceRate}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">حضر / إجمالي</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {studentStats.attended} / {studentStats.totalSessions}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">الغياب المتتالي</span>
                  <span className={`font-medium ${
                    studentStats.consecutiveAbsences >= 3 
                      ? "text-red-600 dark:text-red-400" 
                      : studentStats.consecutiveAbsences >= 2 
                        ? "text-yellow-600 dark:text-yellow-400" 
                        : "text-gray-900 dark:text-white"
                  }`}>
                    {studentStats.consecutiveAbsences}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">آخر حضور</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {studentStats.lastAttendance ? formatDate(studentStats.lastAttendance) : "لم يحضر بعد"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Distribution Card */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h3 className="font-semibold text-gray-900 dark:text-white">توزيع الحضور</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-gray-600 dark:text-gray-400">حاضر</span>
                </div>
                <span className="font-medium text-gray-900 dark:text-white">{studentStats?.presentCount || groupStats.presentCount}</span>
              </div>
              <div className="flex justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-gray-600 dark:text-gray-400">غائب</span>
                </div>
                <span className="font-medium text-gray-900 dark:text-white">{studentStats?.absentCount || groupStats.absentCount}</span>
              </div>
              <div className="flex justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-gray-600 dark:text-gray-400">متأخر</span>
                </div>
                <span className="font-medium text-gray-900 dark:text-white">{studentStats?.lateCount || groupStats.lateCount}</span>
              </div>
              <div className="flex justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-gray-600 dark:text-gray-400">معذور</span>
                </div>
                <span className="font-medium text-gray-900 dark:text-white">{studentStats?.excusedCount || groupStats.excusedCount}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <h3 className="font-semibold text-gray-900 dark:text-white">إجراءات سريعة</h3>
            </div>
            <div className="space-y-3">
              {student && (
                <>
                  {student.email && (
                    <button
                      onClick={() => window.open(`mailto:${student.email}`, "_blank")}
                      className="w-full px-3 py-2 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      إرسال بريد إلكتروني
                    </button>
                  )}
                  <Link
                    href={`/instructor/groups/${groupId}/students/${student.id}`}
                    className="block w-full px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-center"
                  >
                    عرض ملف الطالب
                  </Link>
                </>
              )}
              <Link
                href={`/instructor/groups/${groupId}`}
                className="block w-full px-3 py-2 text-sm border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors text-center"
              >
                العودة للمجموعة
              </Link>
            </div>
          </div>
        </div>

        {/* Sessions Table */}
        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  جلسات المجموعة ({pagination.total})
                </h3>
                {student && (
                  <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                    {student.name}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                صفحة {pagination.page} من {pagination.pages}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">الجلسة</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">التاريخ والوقت</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">الموديول</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">حالة الجلسة</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {student ? "حضور الطالب" : "إحصائيات الحضور"}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length > 0 ? (
                  sessions.map((session) => (
                    <>
                      <tr
                        key={session.id}
                        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{session.title}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              الجلسة {session.sessionNumber}
                              {session.lessonIndexes.length > 0 && (
                                <> • الحصص {session.lessonIndexes.map(i => i + 1).join(', ')}</>
                              )}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-gray-900 dark:text-white">{formatDate(session.date)}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {formatTime(session.startTime)} - {formatTime(session.endTime)}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900 dark:text-white">
                              الموديول {session.moduleIndex + 1}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${getSessionStatusColor(session.status)}`}>
                            {getSessionStatusText(session.status)}
                          </span>
                          {!session.attendanceTaken && session.status === "completed" && (
                            <span className="inline-block ml-2 px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                              يحتاج تسجيل حضور
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {student ? (
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(session.studentAttendanceStatus)}`}>
                                {getStatusText(session.studentAttendanceStatus)}
                              </span>
                              {session.studentAttendance?.notes && (
                                <button
                                  onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                                  className="text-xs text-primary hover:text-primary/80"
                                >
                                  {expandedSession === session.id ? "إخفاء الملاحظات" : "عرض الملاحظات"}
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">{session.presentCount}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <XCircle className="w-4 h-4 text-red-500" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">{session.absentCount}</span>
                              </div>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {session.totalAttendance} طالب
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/instructor/sessions/${session.id}`}
                              className="p-1 text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors"
                              title="عرض تفاصيل الجلسة"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            {session.attendanceTaken && (
                              <Link
                                href={`/instructor/sessions/${session.id}/attendance`}
                                className="p-1 text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors"
                                title="عرض الحضور"
                              >
                                <CheckSquare className="w-4 h-4" />
                              </Link>
                            )}
                            {!session.attendanceTaken && session.status === "completed" && (
                              <Link
                                href={`/instructor/sessions/${session.id}/attendance`}
                                className="p-1 text-red-600 hover:text-red-800 transition-colors"
                                title="تسجيل الحضور"
                              >
                                <Edit className="w-4 h-4" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedSession === session.id && session.studentAttendance?.notes && (
                        <tr className="bg-gray-50 dark:bg-gray-800">
                          <td colSpan={6} className="py-3 px-4">
                            <div className="p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                              <h4 className="font-medium text-gray-900 dark:text-white mb-2">ملاحظات الحضور</h4>
                              <p className="text-gray-600 dark:text-gray-400 text-sm">
                                {session.studentAttendance.notes}
                              </p>
                              {session.studentAttendance.markedAt && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                  مسجل في: {formatDate(session.studentAttendance.markedAt)}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center">
                      <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">لا توجد جلسات تطابق معايير البحث</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  عرض {Math.min(sessions.length, pagination.limit)} من {pagination.total} جلسة
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={!pagination.hasPrev}
                    className={`p-2 rounded-lg ${pagination.hasPrev
                        ? "text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-primary"
                        : "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                      }`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                      let pageNum;
                      if (pagination.pages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= pagination.pages - 2) {
                        pageNum = pagination.pages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 rounded-lg ${currentPage === pageNum
                              ? "bg-primary text-white"
                              : "text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-primary"
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                    disabled={!pagination.hasNext}
                    className={`p-2 rounded-lg ${pagination.hasNext
                        ? "text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-primary"
                        : "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                      }`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}