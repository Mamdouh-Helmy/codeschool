"use client";

import { useEffect, useState, Fragment } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Users,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Search,
  Filter,
  RefreshCw,
  ArrowLeft,
  Eye,
  Phone,
  Mail,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Download,
  MoreVertical,
  Shield,
  AlertTriangle,
  Award,
  Calendar,
  Clock,
  User,
  GraduationCap,
  Hash,
  PieChart,
  Target,
  Star,
  BookOpen,
  Home,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// أنواع البيانات للطلاب
interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  enrollmentNumber: string;
  guardianInfo: {
    name: string;
    relationship: string;
    phone: string;
    whatsappNumber: string;
    email: string;
  };
  communicationPreferences: {
    preferredLanguage: string;
    notificationChannels: {
      email: boolean;
      whatsapp: boolean;
      sms: boolean;
    };
  };
  enrollmentInfo: {
    enrollmentDate: string;
    status: string;
    source: string;
  };
  attendance: {
    rate: number;
    attended: number;
    totalSessions: number;
    lastAttendance: string;
    consecutiveAbsences: number;
    records: Array<{
      date: string;
      status: string;
      notes: string;
    }>;
    performance: "good" | "warning" | "danger";
    needsAttention: "normal" | "warning" | "urgent";
  };
  metadata: {
    lastUpdated: string;
  };
}

interface GroupInfo {
  id: string;
  name: string;
  code: string;
  totalSessions: number;
}

interface StudentsResponse {
  success: boolean;
  data: Student[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    filteredTotal: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  stats: {
    total: number;
    filtered: number;
    attendanceBreakdown: {
      excellent: number;
      good: number;
      warning: number;
      danger: number;
    };
    attentionBreakdown: {
      normal: number;
      warning: number;
      urgent: number;
    };
    averageAttendance: number;
  };
  filters: {
    search: string;
    status: string;
    applied: {
      search: boolean;
      status: boolean;
    };
  };
  groupInfo: GroupInfo;
}

export default function GroupStudentsPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    filteredTotal: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
  }, [groupId]);

  const fetchStudents = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      console.log(`👨‍🎓 [Group Students] Fetching students for group: ${groupId}`);

      let url = `/api/instructor-dashboard/groups/${groupId}/students?page=${page}&limit=${pagination.limit}`;
      
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      
      if (filterStatus !== "all") {
        url += `&status=${filterStatus}`;
      }

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const data: StudentsResponse = await response.json();

      console.log("📥 [Group Students] API Response:", {
        success: data.success,
        status: response.status,
        count: data.data?.length,
      });

      setStudents(data.data || []);
      setGroupInfo(data.groupInfo || null);
      setStats(data.stats || {});
      setPagination(data.pagination || pagination);

    } catch (error: any) {
      console.error("❌ [Group Students] Error:", error);
      setError(error.message || "حدث خطأ أثناء تحميل الطلاب");

      if (error.message.includes("غير مصرح") || error.message.includes("UNAUTHORIZED")) {
        router.push("/signin");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudents(1);
  };

  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
    setTimeout(() => fetchStudents(1), 100);
  };

  const handlePageChange = (page: number) => {
    fetchStudents(page);
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

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "وقت غير صالح";

      return date.toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 80) return "text-green-600 dark:text-green-400";
    if (rate >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getAttendanceBgColor = (rate: number) => {
    if (rate >= 80) return "bg-green-100 dark:bg-green-900/20";
    if (rate >= 60) return "bg-yellow-100 dark:bg-yellow-900/20";
    return "bg-red-100 dark:bg-red-900/20";
  };

  const getPerformanceBadge = (performance: string) => {
    const config = {
      good: {
        bg: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        text: "ممتاز",
        icon: CheckCircle,
      },
      warning: {
        bg: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
        text: "مقبول",
        icon: AlertTriangle,
      },
      danger: {
        bg: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        text: "محفوف بالمخاطر",
        icon: AlertCircle,
      },
    };

    return config[performance as keyof typeof config] || config.good;
  };

  const getAttentionBadge = (attention: string) => {
    const config = {
      normal: {
        bg: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        text: "طبيعي",
        icon: UserCheck,
      },
      warning: {
        bg: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
        text: "يحتاج متابعة",
        icon: AlertTriangle,
      },
      urgent: {
        bg: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        text: "مستعجل",
        icon: AlertCircle,
      },
    };

    return config[attention as keyof typeof config] || config.normal;
  };

  const toggleStudent = (studentId: string) => {
    setExpandedStudent(expandedStudent === studentId ? null : studentId);
  };

  const exportToCSV = () => {
    // TODO: Implement CSV export
    alert("تصدير البيانات إلى CSV - قيد التطوير");
  };

  if (loading && students.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            جاري تحميل الطلاب...
          </p>
        </div>
      </div>
    );
  }

  if (error && students.length === 0) {
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
              onClick={() => fetchStudents(1)}
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkmode">
      {/* Header */}
      <div className="bg-white dark:bg-secondary shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <Link
                href={`/instructor/groups/${groupId}`}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    طلاب المجموعة
                  </h1>
                  {groupInfo && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-sm">
                      {groupInfo.name} ({groupInfo.code})
                    </span>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  إدارة ومتابعة طلاب المجموعة
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchStudents(1)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                title="تحديث البيانات"
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
      <div className="container mx-auto px-4 py-6">
        {/* إحصائيات */}
        {stats && (
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              إحصائيات الطلاب
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-1">
                  {stats.total}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-300">
                  إجمالي الطلاب
                </div>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400 mb-1">
                  {stats.attendanceBreakdown.excellent + stats.attendanceBreakdown.good}
                </div>
                <div className="text-sm text-green-600 dark:text-green-300">
                  ممتازين وجيدين
                </div>
                <div className="text-xs text-green-500 dark:text-green-400 mt-1">
                  (80%+ حضور)
                </div>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400 mb-1">
                  {stats.attentionBreakdown.warning + stats.attentionBreakdown.urgent}
                </div>
                <div className="text-sm text-yellow-600 dark:text-yellow-300">
                  يحتاجون متابعة
                </div>
                <div className="text-xs text-yellow-500 dark:text-yellow-400 mt-1">
                  {stats.attentionBreakdown.urgent} مستعجل
                </div>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="text-2xl font-bold text-red-700 dark:text-red-400 mb-1">
                  {stats.attendanceBreakdown.danger}
                </div>
                <div className="text-sm text-red-600 dark:text-red-300">
                  محفوفين بالمخاطر
                </div>
                <div className="text-xs text-red-500 dark:text-red-400 mt-1">
                  (أقل من 60% حضور)
                </div>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-400 mb-1">
                  {stats.averageAttendance}%
                </div>
                <div className="text-sm text-purple-600 dark:text-purple-300">
                  متوسط الحضور
                </div>
                <div className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                  {groupInfo?.totalSessions} جلسة
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
                  placeholder="ابحث عن طالب بالاسم، البريد، الرقم..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
                />
              </form>
            </div>

            {/* تصفية حسب الحالة */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                حالة الطالب
              </label>
              <select
                value={filterStatus}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              >
                <option value="all">جميع الطلاب</option>
                <option value="excellent">ممتازين فقط (90%+)</option>
                <option value="good">جيدين فقط (80-90%)</option>
                <option value="warning">مقبولين فقط (60-80%)</option>
                <option value="danger">محفوفين بالمخاطر (أقل من 60%)</option>
                <option value="at-risk">في خطر (أداء منخفض)</option>
                <option value="needs-followup">يحتاجون متابعة</option>
              </select>
            </div>

            {/* إجراءات */}
            <div className="flex items-end gap-2">
              <button
                onClick={() => fetchStudents(1)}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>تحديث البيانات</span>
              </button>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>تصدير</span>
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
                عرض {students.length} طالب من {pagination.filteredTotal}
                {pagination.filteredTotal !== pagination.total && ` (من إجمالي ${pagination.total})`}
              </span>
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">
              الصفحة {pagination.page} من {pagination.pages}
            </div>
          </div>
        </div>

        {/* قائمة الطلاب */}
        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-right py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                    الطالب
                  </th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                    الحضور
                  </th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                    الأداء
                  </th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                    المتابعة
                  </th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                    آخر حضور
                  </th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.length > 0 ? (
                  students.map((student) => {
                    const performanceConfig = getPerformanceBadge(student.attendance.performance);
                    const attentionConfig = getAttentionBadge(student.attendance.needsAttention);
                    const PerformanceIcon = performanceConfig.icon;
                    const AttentionIcon = attentionConfig.icon;
                    
                    return (
                      <Fragment key={student.id}>
                        {/* الصف الرئيسي للطالب */}
                        <tr 
                          className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleStudent(student.id)}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                              >
                                {expandedStudent === student.id ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                              <div>
                                <div className="flex items-center gap-2">
                                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="w-5 h-5 text-primary" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-white">
                                      {student.name}
                                    </h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      {student.enrollmentNumber}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                          
                          <td className="py-4 px-6">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold ${getAttendanceColor(student.attendance.rate)}`}>
                                  {student.attendance.rate}%
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  ({student.attendance.attended}/{student.attendance.totalSessions})
                                </span>
                              </div>
                              <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${getAttendanceBgColor(student.attendance.rate).replace('bg-', 'bg-').split(' ')[0]}`}
                                  style={{ width: `${student.attendance.rate}%` }}
                                ></div>
                              </div>
                              {student.attendance.consecutiveAbsences > 0 && (
                                <div className="text-xs text-red-600 dark:text-red-400">
                                  {student.attendance.consecutiveAbsences} غياب متتالي
                                </div>
                              )}
                            </div>
                          </td>
                          
                          <td className="py-4 px-6">
                            <span className={`px-3 py-1 rounded-full text-sm inline-flex items-center gap-1 ${performanceConfig.bg}`}>
                              <PerformanceIcon className="w-4 h-4" />
                              {performanceConfig.text}
                            </span>
                          </td>
                          
                          <td className="py-4 px-6">
                            <span className={`px-3 py-1 rounded-full text-sm inline-flex items-center gap-1 ${attentionConfig.bg}`}>
                              <AttentionIcon className="w-4 h-4" />
                              {attentionConfig.text}
                            </span>
                          </td>
                          
                          <td className="py-4 px-6">
                            <div className="space-y-1">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {student.attendance.lastAttendance ? formatDate(student.attendance.lastAttendance) : "لم يحضر بعد"}
                              </div>
                              {student.attendance.lastAttendance && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatTime(student.attendance.lastAttendance)}
                                </div>
                              )}
                            </div>
                          </td>
                          
                          <td className="py-4 px-6">
                            <div className="flex gap-2">
                              <Link
                                href={`/instructor/groups/${groupId}/students/${student.id}`}
                                className="p-2 text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors"
                                title="عرض التفاصيل"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                              <Link
                                href={`/instructor/groups/${groupId}/attendance?student=${student.id}`}
                                className="p-2 text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors"
                                title="سجل الحضور"
                              >
                                <Calendar className="w-4 h-4" />
                              </Link>
                            
                            </div>
                          </td>
                        </tr>
                        
                        {/* تفاصيل إضافية للطالب */}
                        {expandedStudent === student.id && (
                          <tr className="bg-gray-50 dark:bg-gray-800/50">
                            <td colSpan={6} className="py-4 px-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* معلومات الاتصال */}
                                <div className="space-y-3">
                                  <h5 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    معلومات الاتصال
                                  </h5>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-500 dark:text-gray-400">البريد:</span>
                                      <a 
                                        href={`mailto:${student.email}`}
                                        className="text-primary hover:underline"
                                      >
                                        {student.email}
                                      </a>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-500 dark:text-gray-400">الهاتف:</span>
                                      <a 
                                        href={`tel:${student.phone}`}
                                        className="text-gray-900 dark:text-white"
                                      >
                                        {student.phone}
                                      </a>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-500 dark:text-gray-400">واتساب:</span>
                                      <a 
                                        href={`https://wa.me/${student.whatsapp}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-green-600 dark:text-green-400 hover:underline"
                                      >
                                        {student.whatsapp}
                                      </a>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* ولي الأمر */}
                                {student.guardianInfo?.name && (
                                  <div className="space-y-3">
                                    <h5 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                      <Shield className="w-4 h-4" />
                                      ولي الأمر
                                    </h5>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex items-center justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">الاسم:</span>
                                        <span className="text-gray-900 dark:text-white">{student.guardianInfo.name}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">العلاقة:</span>
                                        <span className="text-gray-900 dark:text-white">{student.guardianInfo.relationship}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">الهاتف:</span>
                                        <a 
                                          href={`tel:${student.guardianInfo.phone}`}
                                          className="text-gray-900 dark:text-white"
                                        >
                                          {student.guardianInfo.phone}
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* معلومات التسجيل */}
                                <div className="space-y-3">
                                  <h5 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                    <GraduationCap className="w-4 h-4" />
                                    معلومات التسجيل
                                  </h5>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-500 dark:text-gray-400">رقم القيد:</span>
                                      <span className="font-mono text-gray-900 dark:text-white">{student.enrollmentNumber}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-500 dark:text-gray-400">تاريخ التسجيل:</span>
                                      <span className="text-gray-900 dark:text-white">{formatDate(student.enrollmentInfo.enrollmentDate)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-500 dark:text-gray-400">الحالة:</span>
                                      <span className={`px-2 py-1 rounded-full text-xs ${
                                        student.enrollmentInfo.status === 'Active' 
                                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                      }`}>
                                        {student.enrollmentInfo.status}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* سجل الحضور الأخير */}
                                <div className="space-y-3">
                                  <h5 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                    <BookOpen className="w-4 h-4" />
                                    آخر 5 حصص
                                  </h5>
                                  <div className="space-y-2">
                                    {student.attendance.records.length > 0 ? (
                                      student.attendance.records.map((record, index) => (
                                        <div 
                                          key={`${student.id}-record-${index}`}
                                          className="flex items-center justify-between text-sm"
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${
                                              record.status === 'present' ? 'bg-green-500' :
                                              record.status === 'absent' ? 'bg-red-500' :
                                              record.status === 'late' ? 'bg-yellow-500' : 'bg-blue-500'
                                            }`}></span>
                                            <span className="text-gray-900 dark:text-white">
                                              {record.status === 'present' ? 'حاضر' :
                                               record.status === 'absent' ? 'غائب' :
                                               record.status === 'late' ? 'متأخر' : 'معذور'}
                                            </span>
                                          </div>
                                          <div className="text-gray-500 dark:text-gray-400">
                                            {formatDate(record.date)}
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                                        لا توجد سجلات حضور
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                ) : (
                  <tr key="no-students">
                    <td colSpan={6} className="py-12 text-center">
                      <Users className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        لا توجد طلاب
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {searchTerm || filterStatus !== "all"
                          ? "لا توجد نتائج مطابقة للبحث"
                          : "لا توجد طلاب في هذه المجموعة"}
                      </p>
                      <div className="flex gap-3 justify-center">
                        {(searchTerm || filterStatus !== "all") && (
                          <button
                            onClick={() => {
                              setSearchTerm("");
                              setFilterStatus("all");
                              fetchStudents(1);
                            }}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                          >
                            إعادة تعيين الفلاتر
                          </button>
                        )}
                        <Link
                          href={`/instructor/groups/${groupId}`}
                          className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          العودة للمجموعة
                        </Link>
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
                    key={`page-${pageNum}`}
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
      </div>
    </div>
  );
}