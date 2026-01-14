"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Filter,
  Download,
  TrendingUp,
  Users,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Search,
  Eye,
  EyeOff,
  BarChart3,
  CalendarDays,
  Tag,
} from "lucide-react";

// ✅ تعريف الأنواع بشكل صحيح
interface AttendanceSession {
  id: string;
  title: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: "scheduled" | "completed";
  moduleIndex: number;
  sessionNumber: number;
  lessonIndexes: number[];
  attendanceStatus: "present" | "absent" | "late" | "excused" | "لم يبدأ بعد" | "لم يتم التسجيل";
  attendanceNotes?: string;
  markedAt?: string;
  meetingLink?: string;
  recordingLink?: string;
  group: {
    id: string;
    name: string;
    code: string;
  };
  course: {
    title: string;
  };
}

interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
  upcomingCount: number;
  groups: Array<{
    id: string;
    name: string;
    code: string;
    status: string;
  }>;
}

interface Warning {
  type: string;
  message: string;
  level: "warning" | "danger";
}

interface ApiResponse {
  success: boolean;
  data: AttendanceSession[];
  summary: AttendanceSummary;
  warnings: Warning[];
  metadata?: {
    message: string;
    filters?: {
      group: string;
      month: string;
      status: string;
    };
    stats?: {
      completed: number;
      upcoming: number;
      all: number;
    };
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export default function StudentAttendancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    attendanceRate: 0,
    upcomingCount: 0,
    groups: [],
  });
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedAttendance, setSelectedAttendance] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [showUpcoming, setShowUpcoming] = useState<boolean>(true);

  useEffect(() => {
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(currentMonth);
    fetchAttendance();
  }, []);

  const fetchAttendance = async (): Promise<void> => {
    try {
      setLoading(true);
      setError("");

      console.log("🔄 [Dashboard Attendance] Fetching attendance data...");
      
      // ✅ التصحيح: المسار الصحيح /api/dashboard/attendance
      let url = `/api/student/attendance`;
      const params = new URLSearchParams();
      
      if (selectedGroup !== "all") {
        params.append("groupId", selectedGroup);
      }
      
      if (selectedMonth && selectedMonth !== "all") {
        params.append("month", selectedMonth);
      }
      
      // ✅ إضافة فلتر حالة الجلسة للـ API
      if (selectedStatus !== "all") {
        params.append("status", selectedStatus);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      console.log("🔗 [Dashboard Attendance] API URL:", url);
      
      const attendanceRes = await fetch(url, {
        headers: { 
          "Content-Type": "application/json"
        },
        credentials: 'include',
        cache: 'no-store'
      });

      // ✅ التحقق من حالة الاستجابة أولاً
      if (!attendanceRes.ok) {
        const errorText = await attendanceRes.text();
        console.error("❌ [Dashboard Attendance] API Error Response:", {
          status: attendanceRes.status,
          statusText: attendanceRes.statusText,
          body: errorText.substring(0, 200)
        });
        
        if (attendanceRes.status === 404) {
          throw new Error("API endpoint not found. Please check server configuration.");
        }
        
        throw new Error(`HTTP error! status: ${attendanceRes.status}`);
      }

      const response: ApiResponse = await attendanceRes.json();
      
      console.log("📥 [Dashboard Attendance] API Response:", {
        success: response.success,
        status: attendanceRes.status,
        sessions: response.data?.length,
        summary: response.summary,
        metadata: response.metadata
      });

      

      // ✅ تطبيق الفلاتر المحلية
      let filteredSessions = response.data || [];
      
      // فلترة حسب حالة الحضور (إذا كان API مش بيدعمها)
      if (selectedAttendance !== "all") {
        if (selectedAttendance === "not_started") {
          filteredSessions = filteredSessions.filter(
            session => session.attendanceStatus === "لم يبدأ بعد"
          );
        } else {
          filteredSessions = filteredSessions.filter(
            session => session.attendanceStatus === selectedAttendance
          );
        }
      }
      
      // فلترة حسب البحث
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredSessions = filteredSessions.filter(
          session =>
            session.title.toLowerCase().includes(term) ||
            session.group.name.toLowerCase().includes(term) ||
            session.course.title.toLowerCase().includes(term) ||
            session.group.code.toLowerCase().includes(term)
        );
      }

      // ✅ إخفاء الجلسات المجدولة إذا كان الخيار غير مفعل
      if (!showUpcoming) {
        filteredSessions = filteredSessions.filter(
          session => session.status !== "scheduled"
        );
      }

      setSessions(filteredSessions);
      setSummary(response.summary || {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        attendanceRate: 0,
        upcomingCount: 0,
        groups: [],
      });
      setWarnings(response.warnings || []);

    } catch (error: any) {
      console.error("❌ [Dashboard Attendance] Error fetching attendance:", error);
      
      // عرض رسالة خطأ واضحة
      if (error.message.includes("API endpoint not found")) {
        setError("❌ خطأ في الاتصال بالخادم: لم يتم العثور على API. الرجاء التحقق من إعدادات الخادم.");
      } else if (error.message.includes("UNAUTHORIZED") || error.message.includes("غير مصرح")) {
        setError("❌ غير مصرح بالوصول. الرجاء تسجيل الدخول مرة أخرى.");
        setTimeout(() => router.push("/signin"), 2000);
      } else {
        setError(error.message || "حدث خطأ أثناء تحميل سجل الحضور");
      }
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedGroup, selectedMonth, selectedStatus, selectedAttendance, showUpcoming]);

  const formatDate = (dateString: string): string => {
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

  const formatTime = (dateString?: string): string => {
    if (!dateString) return "غير محدد";
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "وقت غير صالح";
      
      return date.toLocaleTimeString("ar-EG", {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getAttendanceColor = (status: AttendanceSession["attendanceStatus"]): string => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "absent":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "late":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "excused":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "لم يبدأ بعد":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "لم يتم التسجيل":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getAttendanceText = (status: AttendanceSession["attendanceStatus"]): string => {
    switch (status) {
      case "present": return "حاضر";
      case "absent": return "غائب";
      case "late": return "متأخر";
      case "excused": return "معذور";
      case "لم يبدأ بعد": return "لم يبدأ بعد";
      case "لم يتم التسجيل": return "لم يتم التسجيل";
      default: return status;
    }
  };

  const getStatusIcon = (status: AttendanceSession["attendanceStatus"]) => {
    switch (status) {
      case "present": return CheckCircle;
      case "absent": return XCircle;
      case "late": return Clock;
      case "excused": return AlertCircle;
      case "لم يبدأ بعد": return Clock;
      default: return AlertCircle;
    }
  };

  const getSessionStatusBadge = (status: AttendanceSession["status"]) => {
    switch (status) {
      case "completed":
        return {
          bg: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
          text: "مكتملة",
          icon: CheckCircle
        };
      case "scheduled":
        return {
          bg: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
          text: "مجدولة",
          icon: CalendarDays
        };
      default:
        return {
          bg: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
          text: status,
          icon: AlertCircle
        };
    }
  };

  const getLessonsText = (lessonIndexes: number[]): string => {
    if (!lessonIndexes || lessonIndexes.length === 0) return "";
    return lessonIndexes.map(idx => `الدرس ${idx + 1}`).join(" و ");
  };

  const handleExport = (): void => {
    if (sessions.length === 0) {
      alert("لا توجد بيانات للتصدير");
      return;
    }

    const data = sessions.map(session => ({
      "عنوان الجلسة": session.title,
      "التاريخ": formatDate(session.scheduledDate),
      "الوقت": `${session.startTime} - ${session.endTime}`,
      "حالة الجلسة": session.status === "completed" ? "مكتملة" : "مجدولة",
      "المجموعة": session.group.name,
      "الكود": session.group.code,
      "المادة": session.course.title,
      "حالة الحضور": getAttendanceText(session.attendanceStatus),
      "ملاحظات": session.attendanceNotes || "",
      "تاريخ التسجيل": session.markedAt ? formatTime(session.markedAt) : "",
    }));

    const csv = [
      Object.keys(data[0]).join(","),
      ...data.map(row => Object.values(row).map(v => `"${v}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `سجل_الحضور_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ✅ حساب صحيح للحضور في الواجهة
  const totalPresent = summary.present + summary.late + summary.excused;
  const correctAttendanceRate = summary.total > 0 
    ? Math.round((totalPresent / summary.total) * 100)
    : 0;

  console.log("📊 Attendance Calculation:", {
    totalCompleted: summary.total,
    present: summary.present,
    late: summary.late,
    excused: summary.excused,
    totalPresent,
    rate: correctAttendanceRate + "%",
    upcomingSessions: summary.upcomingCount,
    formula: "نسبة الحضور = (حاضر + متأخر + معذور) ÷ إجمالي الجلسات المكتملة"
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">جاري تحميل سجل الحضور...</p>
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
              onClick={fetchAttendance}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              حاول مرة أخرى
            </button>
            <Link
              href="/dashboard"
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
                href="/dashboard"
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  سجل الحضور
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  تتبع حضورك في جميع الجلسات
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>تصدير</span>
              </button>
              <Link
                href="/dashboard"
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
        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                إحصائيات الحضور
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* ✅ نسبة الحضور الصحيحة */}
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400 mb-1">
                    {correctAttendanceRate}%
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-300">نسبة الحضور</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    ({totalPresent}/{summary.total})
                  </div>
                </div>
                
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-1">
                    {summary.present}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-300">حاضر</div>
                </div>
                
                <div className="text-center p-4 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="text-2xl font-bold text-red-700 dark:text-red-400 mb-1">
                    {summary.absent}
                  </div>
                  <div className="text-sm text-red-600 dark:text-red-300">غياب</div>
                </div>
                
                <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400 mb-1">
                    {summary.total}
                  </div>
                  <div className="text-sm text-yellow-600 dark:text-yellow-300">المكتملة</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    +{summary.upcomingCount} مجدولة
                  </div>
                </div>
              </div>
            </div>

            {/* تحذيرات */}
            {warnings.length > 0 && (
              <div className="md:w-1/3">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">تحذيرات</h4>
                </div>
                <div className="space-y-2">
                  {warnings.map((warning, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg ${
                        warning.level === "danger" 
                          ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                          : "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                      }`}
                    >
                      <p className={`text-sm ${
                        warning.level === "danger" 
                          ? "text-red-700 dark:text-red-300"
                          : "text-yellow-700 dark:text-yellow-300"
                      }`}>
                        {warning.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* الفلاتر */}
        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            {/* بحث */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                البحث
              </label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="ابحث في الجلسات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>

            {/* تصفية حسب المجموعة */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                المجموعة
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              >
                <option value="all">جميع المجموعات</option>
                {summary.groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.code})
                  </option>
                ))}
              </select>
            </div>

            {/* تصفية حسب الشهر */}
            {/* <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                الشهر
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              >
                <option value="all">جميع الأشهر</option>
                <option value="2025-01">يناير 2025</option>
                <option value="2025-02">فبراير 2025</option>
                <option value="2025-03">مارس 2025</option>
                <option value="2025-04">أبريل 2025</option>
                <option value="2025-05">مايو 2025</option>
                <option value="2025-06">يونيو 2025</option>
                <option value="2025-07">يوليو 2025</option>
                <option value="2025-08">أغسطس 2025</option>
                <option value="2025-09">سبتمبر 2025</option>
                <option value="2025-10">أكتوبر 2025</option>
                <option value="2025-11">نوفمبر 2025</option>
                <option value="2025-12">ديسمبر 2025</option>
              </select>
            </div> */}

            {/* خيار عرض الجلسات المجدولة */}
            <div className="flex items-end">
              <button
                onClick={() => setShowUpcoming(!showUpcoming)}
                className={`w-full px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  showUpcoming 
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {showUpcoming ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span>{showUpcoming ? "إخفاء المجدولة" : "عرض المجدولة"}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* تصفية حسب حالة الجلسة */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                حالة الجلسة
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              >
                <option value="all">جميع الجلسات</option>
                <option value="completed">المكتملة فقط</option>
                <option value="scheduled">المجدولة فقط</option>
              </select>
            </div>

            {/* تصفية حسب حالة الحضور */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                حالة الحضور
              </label>
              <select
                value={selectedAttendance}
                onChange={(e) => setSelectedAttendance(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              >
                <option value="all">جميع الحالات</option>
                <option value="present">حاضر</option>
                <option value="absent">غائب</option>
                <option value="late">متأخر</option>
                <option value="excused">معذور</option>
                <option value="لم يبدأ بعد">لم يبدأ بعد</option>
                <option value="لم يتم التسجيل">لم يتم التسجيل</option>
              </select>
            </div>
          </div>
        </div>

        {/* معلومات النتائج */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                عرض {sessions.length} جلسة
              </span>
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">
              {summary.upcomingCount > 0 && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-4 h-4" />
                  {summary.upcomingCount} جلسة مجدولة
                </span>
              )}
            </div>
          </div>
        </div>

        {/* قائمة الحضور */}
        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    الجلسة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    التاريخ والوقت
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    المجموعة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    حالة الحضور
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    ملاحظات
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sessions.map((session) => {
                  const StatusIcon = getStatusIcon(session.attendanceStatus);
                  const sessionStatus = getSessionStatusBadge(session.status);
                  const SessionStatusIcon = sessionStatus.icon;
                  
                  return (
                    <tr 
                      key={session.id} 
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                        session.status === "scheduled" ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 rounded-full text-xs ${sessionStatus.bg}`}>
                              <SessionStatusIcon className="inline w-3 h-3 mr-1" />
                              {sessionStatus.text}
                            </span>
                          </div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {session.title}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            الموديول {session.moduleIndex + 1} • الجلسة {session.sessionNumber}
                          </div>
                          {session.lessonIndexes && session.lessonIndexes.length > 0 && (
                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {getLessonsText(session.lessonIndexes)}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {formatDate(session.scheduledDate)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {session.startTime} - {session.endTime}
                        </div>
                        {session.markedAt && session.status === "completed" && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            سجل في: {formatTime(session.markedAt)}
                          </div>
                        )}
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {session.group.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {session.course.title}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {session.group.code}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm inline-flex items-center gap-1 ${getAttendanceColor(session.attendanceStatus)}`}>
                          <StatusIcon className="w-3 h-3" />
                          {getAttendanceText(session.attendanceStatus)}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                          {session.attendanceNotes || "لا توجد ملاحظات"}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Link
                            href={`/dashboard/sessions/${session.id}`}
                            className="px-3 py-1 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors text-sm flex items-center gap-1"
                          >
                            التفاصيل
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {sessions.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                لا توجد جلسات
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm || selectedStatus !== "all" || selectedAttendance !== "all"
                  ? "لا توجد نتائج مطابقة للبحث"
                  : "لم يتم العثور على أي جلسات"}
              </p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedStatus("all");
                  setSelectedAttendance("all");
                  setSelectedGroup("all");
                }}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                إعادة تعيين الفلاتر
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}