// app/instructor/sessions/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Search,
  Filter,
  ChevronRight,
  Eye,
  Video,
  BarChart3,
  CalendarDays,
  TrendingUp,
  RefreshCw,
  MoreVertical,
  BookOpen,
  GraduationCap,
} from "lucide-react";

interface Session {
  _id: string;
  title: string;
  description: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: "scheduled" | "completed" | "cancelled" | "postponed";
  moduleIndex: number;
  sessionNumber: number;
  lessonIndexes: number[];
  attendanceTaken: boolean;
  meetingLink: string;
  recordingLink: string;
  instructorNotes: string;
  groupId: {
    _id: string;
    name: string;
    code: string;
  };
  courseId: {
    title: string;
  };
  attendance?: Array<{
    _id: string;
    studentId: {
      _id: string;
      personalInfo: {
        fullName: string;
      };
      enrollmentNumber: string;
    };
    status: "present" | "absent" | "late" | "excused";
    notes: string;
    markedAt: string;
    markedBy: {
      name: string;
      email: string;
    };
  }>;
  metadata?: {
    isPast: boolean;
    isUpcoming: boolean;
    canTakeAttendance: boolean;
    attendanceStats: {
      total: number;
      present: number;
      absent: number;
      late: number;
      excused: number;
    };
  };
  createdAt: string;
  updatedAt: string;
}

interface SessionsResponse {
  success: boolean;
  data: Session[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    groups: Array<{
      id: string;
      name: string;
      code: string;
    }>;
    appliedFilters: {
      status?: string;
      groupId?: string;
      sortBy: string;
      sortOrder: string;
    };
  };
}

interface Group {
  id: string;
  name: string;
  code: string;
}

export default function InstructorSessionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState("");
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState(searchParams.get("status") || "all");
  const [filterGroup, setFilterGroup] = useState(searchParams.get("groupId") || "all");
  const [sortOrder] = useState("desc"); // دائمًا تنازلي (من الأحدث)
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Debounce للبحث
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterGroup]);

  const fetchSessions = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      console.log("🔄 [Instructor Sessions] Fetching sessions...");

      let url = `/api/instructor-dashboard/sessions?page=${page}&limit=${pagination.limit}&sortBy=scheduledDate&sortOrder=${sortOrder}`;
      
      if (filterStatus !== "all") {
        url += `&status=${filterStatus}`;
      }
      
      if (filterGroup !== "all") {
        url += `&groupId=${filterGroup}`;
      }
      
      if (searchTerm.trim()) {
        url += `&search=${encodeURIComponent(searchTerm.trim())}`;
      }

      console.log("🌐 Fetching from URL:", url);

      const sessionsRes = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const response: SessionsResponse = await sessionsRes.json();

      console.log("📥 [Instructor Sessions] API Response:", {
        success: response.success,
        status: sessionsRes.status,
        count: response.data?.length,
      });

      if (!sessionsRes.ok || !response.success) {
        throw new Error(response.error || "فشل في تحميل الجلسات");
      }

      setSessions(response.data || []);
      setGroups(response.filters?.groups || []);
      setPagination(response.pagination || pagination);

    } catch (error: any) {
      console.error("❌ [Instructor Sessions] Error fetching sessions:", error);
      setError(error.message || "حدث خطأ أثناء تحميل الجلسات");

      if (error.message.includes("غير مصرح") || error.message.includes("UNAUTHORIZED")) {
        router.push("/signin");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSessions(1);
  };

  const handleSearchInputChange = (value: string) => {
    setSearchTerm(value);
    
    // Debounce للبحث
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      if (value.trim() === "" || value.length >= 2) {
        fetchSessions(1);
      }
    }, 500);
    
    setSearchTimeout(timeout);
  };

  const handleFilterChange = (type: 'status' | 'group', value: string) => {
    if (type === 'status') {
      setFilterStatus(value);
    } else {
      setFilterGroup(value);
    }
    // الـ useEffect سيتحقق من التغيير ويقوم بالبحث
  };

  const handlePageChange = (page: number) => {
    fetchSessions(page);
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
      scheduled: {
        bg: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        text: "مجدولة",
        icon: Calendar,
      },
      completed: {
        bg: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        text: "مكتملة",
        icon: CheckCircle,
      },
      cancelled: {
        bg: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        text: "ملغاة",
        icon: XCircle,
      },
      postponed: {
        bg: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
        text: "مؤجلة",
        icon: AlertCircle,
      },
    };

    return config[status as keyof typeof config] || config.scheduled;
  };

  const getAttendanceColor = (count: number, total: number) => {
    if (total === 0) return "text-gray-500";
    const percentage = (count / total) * 100;
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getLessonsText = (lessonIndexes: number[]) => {
    if (!lessonIndexes || lessonIndexes.length === 0) return "لا توجد دروس";
    
    const lessons = lessonIndexes.map(index => `الدرس ${index + 1}`);
    return lessons.join("، ");
  };

  const getAttendanceStats = (session: Session) => {
    // أولاً: جلب الإحصائيات من metadata إذا وجدت
    if (session.metadata?.attendanceStats) {
      return session.metadata.attendanceStats;
    }
    
    // ثانياً: حساب الإحصائيات من attendance array إذا وجد
    if (session.attendance && session.attendance.length > 0) {
      const attendance = session.attendance;
      return {
        total: attendance.length,
        present: attendance.filter(a => a.status === 'present').length,
        absent: attendance.filter(a => a.status === 'absent').length,
        late: attendance.filter(a => a.status === 'late').length,
        excused: attendance.filter(a => a.status === 'excused').length
      };
    }
    
    // ثالثاً: إرجاع إحصائيات صفرية إذا لم يكن هناك بيانات
    return {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0
    };
  };

  const resetFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
    setFilterGroup("all");
    // الـ useEffect سيتحقق من التغييرات تلقائياً
  };

  if (loading && sessions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            جاري تحميل الجلسات...
          </p>
        </div>
      </div>
    );
  }

  if (error && sessions.length === 0) {
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
              onClick={() => fetchSessions(1)}
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
                  جميع الجلسات
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  إدارة ومراقبة جميع جلساتك
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => fetchSessions(1)}
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
        {/* فلتر وبحث */}
        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* بحث */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <form onSubmit={handleSearch}>
                <input
                  type="text"
                  placeholder="ابحث عن جلسة..."
                  value={searchTerm}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  className="w-full pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
                />
              </form>
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    fetchSessions(1);
                  }}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* تصفية حسب الحالة */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                حالة الجلسة
              </label>
              <select
                value={filterStatus}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              >
                <option value="all">جميع الحالات</option>
                <option value="scheduled">مجدولة فقط</option>
                <option value="completed">مكتملة فقط</option>
                <option value="cancelled">ملغاة فقط</option>
                <option value="postponed">مؤجلة فقط</option>
              </select>
            </div>

            {/* تصفية حسب المجموعة */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                المجموعة
              </label>
              <select
                value={filterGroup}
                onChange={(e) => handleFilterChange('group', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              >
                <option value="all">جميع المجموعات</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.code})
                  </option>
                ))}
              </select>
            </div>

            {/* زر إعادة التعيين */}
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                إعادة التعيين
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium">الترتيب:</span> من الأحدث إلى الأقدم
          </div>
        </div>

        {/* معلومات النتائج */}
        {(searchTerm || filterStatus !== "all" || filterGroup !== "all") && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  {searchTerm && `بحث: "${searchTerm}"`}
                  {searchTerm && (filterStatus !== "all" || filterGroup !== "all") && " | "}
                  {filterStatus !== "all" && `حالة: ${filterStatus === 'scheduled' ? 'مجدولة' : 
                    filterStatus === 'completed' ? 'مكتملة' : 
                    filterStatus === 'cancelled' ? 'ملغاة' : 'مؤجلة'}`}
                  {filterStatus !== "all" && filterGroup !== "all" && " | "}
                  {filterGroup !== "all" && `مجموعة: ${groups.find(g => g.id === filterGroup)?.name || filterGroup}`}
                </span>
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                عرض {sessions.length} جلسة من {pagination.total}
              </div>
            </div>
          </div>
        )}

        {/* Pagination Top */}
        {pagination.pages > 1 && (
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                الصفحة {pagination.page} من {pagination.pages}
              </div>
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
          </div>
        )}

        {/* قائمة الجلسات */}
        <div className="space-y-4">
          {sessions.length > 0 ? (
            sessions.map((session) => {
              const statusConfig = getStatusConfig(session.status);
              const StatusIcon = statusConfig.icon;
              const attendanceStats = getAttendanceStats(session);
              const canTakeAttendance = session.metadata?.canTakeAttendance || false;

              return (
                <div
                  key={session._id}
                  className="bg-white dark:bg-secondary rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700"
                >
                  <div className="p-6">
                    {/* العنوان والحالة */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {session.title}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(session.scheduledDate)}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {session.startTime} - {session.endTime}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {session.groupId?.name || "بدون مجموعة"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-sm ${statusConfig.bg} flex items-center gap-1`}
                        >
                          <StatusIcon className="w-4 h-4" />
                          {statusConfig.text}
                        </span>
                      </div>
                    </div>

                    {/* تفاصيل الجلسة */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* معلومات الدورة */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">الدورة</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {session.courseId?.title || "بدون دورة"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">الوحدة والحصة</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              الوحدة {session.moduleIndex + 1} • الحصة {session.sessionNumber}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">الدروس المشمولة</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {getLessonsText(session.lessonIndexes)}
                          </p>
                        </div>
                      </div>

                      {/* معلومات الحضور */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <BarChart3 className="w-5 h-5 text-gray-400" />
                          <h4 className="font-medium text-gray-900 dark:text-white">إحصائيات الحضور</h4>
                        </div>
                        
                        {attendanceStats.total > 0 ? (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500 dark:text-gray-400">الحاضرين</span>
                              <span className={`font-medium ${getAttendanceColor(attendanceStats.present, attendanceStats.total)}`}>
                                {attendanceStats.present} ({Math.round((attendanceStats.present / attendanceStats.total) * 100)}%)
                              </span>
                            </div>
                            
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500 dark:text-gray-400">الغائبين</span>
                              <span className="font-medium text-red-600">
                                {attendanceStats.absent} ({Math.round((attendanceStats.absent / attendanceStats.total) * 100)}%)
                              </span>
                            </div>
                            
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500 dark:text-gray-400">المتأخرين</span>
                              <span className="font-medium text-yellow-600">
                                {attendanceStats.late} ({Math.round((attendanceStats.late / attendanceStats.total) * 100)}%)
                              </span>
                            </div>
                            
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500 dark:text-gray-400">المعذورين</span>
                              <span className="font-medium text-blue-600">
                                {attendanceStats.excused} ({Math.round((attendanceStats.excused / attendanceStats.total) * 100)}%)
                              </span>
                            </div>
                            
                            <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium text-gray-500 dark:text-gray-400">إجمالي الحضور</span>
                                <span className="font-medium text-primary">
                                  {attendanceStats.total} طالب
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <BarChart3 className="w-8 h-8 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {session.attendanceTaken ? "لا توجد بيانات حضور" : "لم يتم تسجيل الحضور بعد"}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* روابط وملاحظات */}
                      <div className="space-y-4">
                        {/* روابط */}
                        <div className="space-y-2">
                          {session.meetingLink && (
                            <a
                              href={session.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <Video className="w-4 h-4" />
                              <span>انضم للاجتماع</span>
                            </a>
                          )}
                          
                          {session.recordingLink && (
                            <a
                              href={session.recordingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            >
                              <Video className="w-4 h-4" />
                              <span>شاهد التسجيل</span>
                            </a>
                          )}
                        </div>

                        {/* ملاحظات */}
                        {session.instructorNotes && (
                          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">ملاحظات المدرس</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                              {session.instructorNotes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>
                          <CalendarDays className="inline w-4 h-4 mr-1 rtl:ml-1" />
                          أنشئت: {formatDate(session.createdAt)}
                        </span>
                        <span>•</span>
                        <span>
                          <TrendingUp className="inline w-4 h-4 mr-1 rtl:ml-1" />
                          معدلة: {formatDate(session.updatedAt)}
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        <Link
                          href={`/instructor/sessions/${session._id}`}
                          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          <span>عرض التفاصيل</span>
                        </Link>
                        
                        {canTakeAttendance && !session.attendanceTaken && (
                          <Link
                            href={`/instructor/sessions/${session._id}/attendance`}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>تسجيل حضور</span>
                          </Link>
                        )}
                        
                        {session.attendanceTaken && (
                          <Link
                            href={`/instructor/sessions/${session._id}/attendance`}
                            className="px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center gap-2"
                          >
                            <BarChart3 className="w-4 h-4" />
                            <span>عرض الحضور</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-white dark:bg-secondary rounded-xl shadow-lg">
              <Calendar className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                لا توجد جلسات
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm || filterStatus !== "all" || filterGroup !== "all"
                  ? "لا توجد نتائج مطابقة للبحث"
                  : "لم يتم تعيينك إلى أي جلسات بعد"}
              </p>
              <div className="flex gap-3 justify-center">
                {(searchTerm || filterStatus !== "all" || filterGroup !== "all") ? (
                  <button
                    onClick={resetFilters}
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

        {/* Pagination Bottom */}
        {pagination.pages > 1 && (
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                الصفحة {pagination.page} من {pagination.pages}
              </div>
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
          </div>
        )}
      </div>
    </div>
  );
}