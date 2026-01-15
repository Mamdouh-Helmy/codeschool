// app/instructor/attendance/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Filter,
  ChevronRight,
  Eye,
  BarChart3,
  BookOpen,
  GraduationCap,
  TrendingUp,
  RefreshCw,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";

interface AttendanceRecord {
  sessionId: string;
  sessionTitle: string;
  sessionDate: string;
  sessionTime: string;
  groupId: string;
  groupName: string;
  groupCode: string;
  courseTitle: string;
  studentId: string;
  studentName: string;
  enrollmentNumber: string;
  status: "present" | "absent" | "late" | "excused";
  notes: string;
  markedAt: string;
  markedBy: {
    name: string;
    email: string;
  };
}

interface StudentAttendanceSummary {
  studentId: string;
  studentName: string;
  enrollmentNumber: string;
  totalSessions: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
}

interface GroupsResponse {
  success: boolean;
  data: {
    attendanceRecords: AttendanceRecord[];
    studentAttendanceSummary: StudentAttendanceSummary[];
    statistics: {
      totalSessions: number;
      totalAttendanceRecords: number;
      totalPresent: number;
      totalAbsent: number;
      totalLate: number;
      totalExcused: number;
      attendanceRate: number;
    };
    groups: Array<{
      id: string;
      name: string;
      code: string;
    }>;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    applied: {
      group: string;
      statusFilter: string;
    };
  };
}

export default function InstructorAttendancePage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [studentSummary, setStudentSummary] = useState<StudentAttendanceSummary[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [groups, setGroups] = useState<Array<{id: string; name: string; code: string}>>([]);
  const [error, setError] = useState("");
  
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewType, setViewType] = useState<"detailed" | "summary">("detailed");
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false,
  });

  useEffect(() => {
    fetchAttendanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterGroup, filterStatus]);

  const fetchAttendanceData = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      console.log("🔄 [Instructor Attendance] Fetching attendance data...");

      let url = `/api/instructor-dashboard/attendance?page=${page}&limit=${pagination.limit}`;
      
      if (filterGroup !== "all") {
        url += `&groupId=${filterGroup}`;
      }
      
      if (filterStatus !== "all") {
        url += `&status=${filterStatus}`;
      }

      console.log("🌐 Fetching from URL:", url);

      const attendanceRes = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const response: GroupsResponse = await attendanceRes.json();

      console.log("📥 [Instructor Attendance] API Response:", {
        success: response.success,
        status: attendanceRes.status,
        records: response.data?.attendanceRecords?.length,
        students: response.data?.studentAttendanceSummary?.length,
      });

      if (!attendanceRes.ok || !response.success) {
        throw new Error(response.error || "فشل في تحميل سجل الحضور");
      }

      setAttendanceRecords(response.data.attendanceRecords || []);
      setStudentSummary(response.data.studentAttendanceSummary || []);
      setStats(response.data.statistics);
      setGroups(response.data.groups || []);
      setPagination(response.pagination || pagination);

    } catch (error: any) {
      console.error("❌ [Instructor Attendance] Error fetching attendance:", error);
      setError(error.message || "حدث خطأ أثناء تحميل سجل الحضور");

      if (error.message.includes("غير مصرح") || error.message.includes("UNAUTHORIZED")) {
        router.push("/signin");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    fetchAttendanceData(page);
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

  const getStatusConfig = (status: string) => {
    const config = {
      present: {
        bg: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        text: "حاضر",
        icon: CheckCircle,
        color: "green",
      },
      absent: {
        bg: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        text: "غائب",
        icon: XCircle,
        color: "red",
      },
      late: {
        bg: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
        text: "متأخر",
        icon: AlertCircle,
        color: "yellow",
      },
      excused: {
        bg: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        text: "معذور",
        icon: AlertCircle,
        color: "blue",
      },
    };

    return config[status as keyof typeof config] || config.present;
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 80) return "text-green-600 dark:text-green-400";
    if (rate >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getAttendanceBg = (rate: number) => {
    if (rate >= 80) return "bg-green-100 dark:bg-green-900/30";
    if (rate >= 60) return "bg-yellow-100 dark:bg-yellow-900/30";
    return "bg-red-100 dark:bg-red-900/30";
  };

  const resetFilters = () => {
    setFilterGroup("all");
    setFilterStatus("all");
    // الـ useEffect سيتحقق من التغييرات تلقائياً
  };

  if (loading && attendanceRecords.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            جاري تحميل سجل الحضور...
          </p>
        </div>
      </div>
    );
  }

  if (error && attendanceRecords.length === 0) {
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
              onClick={() => fetchAttendanceData(1)}
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
                  سجل الحضور الكامل
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  عرض وتحليل جميع سجلات الحضور
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => fetchAttendanceData(1)}
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
        {/* الإحصائيات */}
        {stats && (
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              إحصائيات الحضور
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-1">
                  {stats.totalSessions}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-300">
                  إجمالي الجلسات
                </div>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400 mb-1">
                  {stats.totalPresent}
                </div>
                <div className="text-sm text-green-600 dark:text-green-300">
                  حضور
                </div>
                <div className="text-xs text-green-500 dark:text-green-400">
                  {stats.attendanceRate}%
                </div>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="text-2xl font-bold text-red-700 dark:text-red-400 mb-1">
                  {stats.totalAbsent}
                </div>
                <div className="text-sm text-red-600 dark:text-red-300">
                  غياب
                </div>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400 mb-1">
                  {stats.totalLate}
                </div>
                <div className="text-sm text-yellow-600 dark:text-yellow-300">
                  تأخير
                </div>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-400 mb-1">
                  {stats.totalExcused}
                </div>
                <div className="text-sm text-purple-600 dark:text-purple-300">
                  معذور
                </div>
              </div>
            </div>
          </div>
        )}

        {/* فلتر وبحث */}
        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* تصفية حسب المجموعة */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                المجموعة
              </label>
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              >
                <option value="all">جميع المجموعات</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.code})
                  </option>
                ))}
              </select>
            </div>

            {/* تصفية حسب الحالة */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                حالة الطالب
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              >
                <option value="all">جميع الطلاب</option>
                <option value="good">حضور جيد (≥70%)</option>
                <option value="poor">حضور ضعيف (&lt;70%)</option>
              </select>
            </div>

            {/* نوع العرض */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                نوع العرض
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewType("detailed")}
                  className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                    viewType === "detailed"
                      ? "bg-primary text-white border-primary"
                      : "border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  تفاصيل الحضور
                </button>
                <button
                  onClick={() => setViewType("summary")}
                  className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                    viewType === "summary"
                      ? "bg-primary text-white border-primary"
                      : "border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  ملخص الطلاب
                </button>
              </div>
            </div>
          </div>

          {/* أزرار التطبيق */}
          <div className="flex items-center gap-2">
            <button
              onClick={resetFilters}
              className="px-4 py-2 border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              إعادة تعيين الفلاتر
            </button>
          </div>
        </div>

        {/* معلومات النتائج */}
        {(filterGroup !== "all" || filterStatus !== "all") && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                {filterGroup !== "all" && `مجموعة: ${groups.find(g => g.id === filterGroup)?.name || filterGroup}`}
                {filterGroup !== "all" && filterStatus !== "all" && " | "}
                {filterStatus !== "all" && `حالة: ${filterStatus === 'good' ? 'حضور جيد (≥70%)' : 'حضور ضعيف (<70%)'}`}
              </span>
            </div>
          </div>
        )}

        {/* معلومات النتائج */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                {viewType === "detailed" 
                  ? `عرض ${attendanceRecords.length} سجل حضور`
                  : `عرض ${studentSummary.length} طالب`
                }
              </span>
            </div>
            {pagination.pages > 1 && (
              <div className="text-sm text-blue-600 dark:text-blue-400">
                الصفحة {pagination.page} من {pagination.pages}
              </div>
            )}
          </div>
        </div>

        {/* محتوى حسب نوع العرض */}
        {viewType === "detailed" ? (
          /* عرض تفاصيل الحضور */
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                        التاريخ
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                        الجلسة
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                        المجموعة
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                        الطالب
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        حالة الحضور
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                        ملاحظات
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                        مسجل بواسطة
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {attendanceRecords.length > 0 ? (
                      attendanceRecords.map((record, index) => {
                        const statusConfig = getStatusConfig(record.status);
                        const StatusIcon = statusConfig.icon;

                        return (
                          <tr key={`${record.sessionId}-${record.studentId}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {formatDate(record.sessionDate)}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {record.sessionTime}
                                </p>
                              </div>
                            </td>
                            
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {record.sessionTitle}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {record.courseTitle}
                                </p>
                              </div>
                            </td>
                            
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {record.groupName}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {record.groupCode}
                                </p>
                              </div>
                            </td>
                            
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {record.studentName}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {record.enrollmentNumber}
                                </p>
                              </div>
                            </td>
                            
                            <td className="px-4 py-3">
                              <div className="flex justify-center">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs ${statusConfig.bg} flex items-center gap-1`}
                                >
                                  <StatusIcon className="w-3 h-3" />
                                  {statusConfig.text}
                                </span>
                              </div>
                            </td>
                            
                            <td className="px-4 py-3">
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {record.notes || "لا توجد ملاحظات"}
                              </p>
                            </td>
                            
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {record.markedBy?.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatDate(record.markedAt)}
                                </p>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                        >
                          <div className="flex flex-col items-center gap-3">
                            <AlertCircle className="w-12 h-12 text-gray-400" />
                            <p className="text-lg font-medium">لا توجد سجلات حضور</p>
                            <p className="text-sm">
                              لم يتم العثور على سجلات حضور تطابق معايير البحث
                            </p>
                            <button
                              onClick={resetFilters}
                              className="mt-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                            >
                              إعادة تعيين الفلاتر
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="mt-6 p-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    الصفحة {pagination.page} من {pagination.pages}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={!pagination.hasPrev}
                      className={`px-3 py-1.5 rounded-lg border ${
                        pagination.hasPrev
                          ? "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                          : "border-gray-200 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:text-gray-500"
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <div className="flex items-center gap-1">
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
                            className={`px-3 py-1.5 rounded-lg border text-sm ${
                              pagination.page === pageNum
                                ? "bg-primary border-primary text-white"
                                : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={!pagination.hasNext}
                      className={`px-3 py-1.5 rounded-lg border ${
                        pagination.hasNext
                          ? "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                          : "border-gray-200 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:text-gray-500"
                      }`}
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* عرض ملخص الطلاب */
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                        الطالب
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                        المجموعة
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        إجمالي الجلسات
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        الحضور
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        الغياب
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        التأخير
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        المعذورين
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        نسبة الحضور
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {studentSummary.length > 0 ? (
                      studentSummary.map((student) => {
                        const attendanceColor = getAttendanceColor(student.attendanceRate);
                        const attendanceBg = getAttendanceBg(student.attendanceRate);
                        
                        return (
                          <tr key={student.studentId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {student.studentName}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {student.enrollmentNumber}
                                </p>
                              </div>
                            </td>
                            
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {groups.filter(g => 
                                  attendanceRecords.some(record => 
                                    record.studentId === student.studentId && 
                                    record.groupId === g.id
                                  )
                                ).map(group => (
                                  <span
                                    key={group.id}
                                    className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full"
                                  >
                                    {group.name}
                                  </span>
                                ))}
                              </div>
                            </td>
                            
                            <td className="px-4 py-3 text-center">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {student.totalSessions}
                              </span>
                            </td>
                            
                            <td className="px-4 py-3 text-center">
                              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                {student.present}
                              </span>
                            </td>
                            
                            <td className="px-4 py-3 text-center">
                              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                {student.absent}
                              </span>
                            </td>
                            
                            <td className="px-4 py-3 text-center">
                              <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                                {student.late}
                              </span>
                            </td>
                            
                            <td className="px-4 py-3 text-center">
                              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                {student.excused}
                              </span>
                            </td>
                            
                            <td className="px-4 py-3 text-center">
                              <div className="flex flex-col items-center">
                                <span className={`text-sm font-bold ${attendanceColor}`}>
                                  {student.attendanceRate}%
                                </span>
                                <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
                                  <div
                                    className={`h-full ${attendanceBg}`}
                                    style={{ width: `${Math.min(student.attendanceRate, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                        >
                          <div className="flex flex-col items-center gap-3">
                            <Users className="w-12 h-12 text-gray-400" />
                            <p className="text-lg font-medium">لا توجد بيانات طلاب</p>
                            <p className="text-sm">
                              لم يتم العثور على طلاب تطابق معايير البحث
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="mt-6 p-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    الصفحة {pagination.page} من {pagination.pages}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={!pagination.hasPrev}
                      className={`px-3 py-1.5 rounded-lg border ${
                        pagination.hasPrev
                          ? "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                          : "border-gray-200 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:text-gray-500"
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <div className="flex items-center gap-1">
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
                            className={`px-3 py-1.5 rounded-lg border text-sm ${
                              pagination.page === pageNum
                                ? "bg-primary border-primary text-white"
                                : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={!pagination.hasNext}
                      className={`px-3 py-1.5 rounded-lg border ${
                        pagination.hasNext
                          ? "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                          : "border-gray-200 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:text-gray-500"
                      }`}
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ملاحظات وإحصائات إضافية */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
          <h4 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-3">
            ملاحظات حول سجل الحضور
          </h4>
          <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-400">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 text-green-600" />
              <span>الحضور الجيد: نسبة حضور 80% أو أعلى</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 text-yellow-600" />
              <span>تحتاج لمتابعة: نسبة حضور بين 60% و 79%</span>
            </li>
            <li className="flex items-start gap-2">
              <XCircle className="w-4 h-4 mt-0.5 text-red-600" />
              <span>ضعف الحضور: نسبة حضور أقل من 60%</span>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="w-4 h-4 mt-0.5 text-blue-600" />
              <span>يتم تحديث سجلات الحضور تلقائياً عند تسجيل الحضور في الجلسات</span>
            </li>
          </ul>
        </div>
      </div>
      
      {/* Loading overlay */}
      {loading && attendanceRecords.length > 0 && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-secondary rounded-xl p-6 shadow-2xl">
            <div className="flex items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  جاري تحديث البيانات...
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  يرجى الانتظار قليلاً
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}