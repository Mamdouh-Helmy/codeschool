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
  Search,
  Filter,
  ChevronRight,
  Eye,
  Download,
  BarChart3,
  BookOpen,
  GraduationCap,
  TrendingUp,
  RefreshCw,
  MoreVertical,
  FileText,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Printer,
  ExternalLink,
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
    type: string;
    sessions: Array<{
      _id: string;
      title: string;
      date: string;
      time: string;
      group: string;
      attendanceCount: number;
    }>;
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
    fromDate?: string;
    toDate?: string;
    groupId?: string;
    status?: string;
    applied: {
      dateRange: string;
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
  const [groups, setGroups] = useState<any[]>([]);
  const [error, setError] = useState("");
  
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterStudent, setFilterStudent] = useState("");
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
  }, []);

  const fetchAttendanceData = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      console.log("🔄 [Instructor Attendance] Fetching attendance data...");

      let url = `/api/instructor-dashboard/attendance?page=${page}&limit=${pagination.limit}`;
      
      if (filterFromDate) {
        url += `&fromDate=${filterFromDate}`;
      }
      
      if (filterToDate) {
        url += `&toDate=${filterToDate}`;
      }
      
      if (filterGroup !== "all") {
        url += `&groupId=${filterGroup}`;
      }
      
      if (filterStatus !== "all") {
        url += `&status=${filterStatus}`;
      }
      
      if (filterStudent) {
        url += `&studentId=${filterStudent}`;
      }

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
        throw new Error(response.data?.error || "فشل في تحميل سجل الحضور");
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

  const handleFilterChange = () => {
    fetchAttendanceData(1);
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

  const exportToCSV = () => {
    let csvContent = "";
    
    if (viewType === "detailed") {
      const headers = [
        "تاريخ الجلسة",
        "وقت الجلسة",
        "عنوان الجلسة",
        "المجموعة",
        "اسم الطالب",
        "رقم القيد",
        "حالة الحضور",
        "ملاحظات",
        "تاريخ التسجيل",
        "مسجل بواسطة"
      ];

      const data = attendanceRecords.map(record => [
        formatDate(record.sessionDate),
        record.sessionTime,
        record.sessionTitle,
        record.groupName,
        record.studentName,
        record.enrollmentNumber,
        getStatusConfig(record.status).text,
        record.notes || "لا توجد",
        formatDate(record.markedAt),
        record.markedBy?.name || "غير معروف"
      ]);

      csvContent = [
        headers.join(","),
        ...data.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");
    } else {
      const headers = [
        "اسم الطالب",
        "رقم القيد",
        "إجمالي الجلسات",
        "عدد الحضور",
        "عدد الغياب",
        "عدد التأخير",
        "عدد المعذورين",
        "نسبة الحضور %"
      ];

      const data = studentSummary.map(student => [
        student.studentName,
        student.enrollmentNumber,
        student.totalSessions,
        student.present,
        student.absent,
        student.late,
        student.excused,
        student.attendanceRate
      ]);

      csvContent = [
        headers.join(","),
        ...data.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `سجل_الحضور_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportStudentReport = async (studentId: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/instructor/attendance?studentId=${studentId}&export=true`, {
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `تقرير_الحضور_${studentId}_${new Date().toISOString().split('T')[0]}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('فشل في تصدير تقرير الطالب');
      }
    } catch (error: any) {
      console.error('❌ Error exporting student report:', error);
      setError(error.message || 'حدث خطأ أثناء تصدير التقرير');
    } finally {
      setLoading(false);
    }
  };

  const notifyPoorAttendance = async (studentId: string) => {
    if (!confirm('هل تريد إرسال تنبيه بضعف الحضور لهذا الطالب؟')) return;
    
    try {
      setLoading(true);
      
      const response = await fetch(`/api/instructor/students/${studentId}/notify-poor-attendance`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('✅ تم إرسال التنبيه بنجاح');
      } else {
        throw new Error(data.error || 'فشل في إرسال التنبيه');
      }
    } catch (error: any) {
      console.error('❌ Error notifying poor attendance:', error);
      alert(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const printAttendanceReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('الرجاء السماح بالنوافذ المنبثقة لطباعة التقرير');
      return;
    }
    
    const reportContent = `
      <html>
        <head>
          <title>تقرير الحضور - ${new Date().toLocaleDateString('ar-EG')}</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              direction: rtl;
              padding: 20px;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #2c3e50;
              margin-bottom: 5px;
            }
            .header .date {
              color: #7f8c8d;
              font-size: 14px;
            }
            .stats {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            .stat-box {
              text-align: center;
              padding: 15px;
              border-radius: 8px;
              color: white;
              font-weight: bold;
            }
            .stat-box.total { background: #3498db; }
            .stat-box.present { background: #27ae60; }
            .stat-box.absent { background: #e74c3c; }
            .stat-box.late { background: #f39c12; }
            .stat-box.excused { background: #9b59b6; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background: #2c3e50;
              color: white;
              padding: 12px;
              text-align: right;
            }
            td {
              padding: 10px 12px;
              border-bottom: 1px solid #ddd;
            }
            tr:nth-child(even) {
              background: #f8f9fa;
            }
            .present-status { color: #27ae60; font-weight: bold; }
            .absent-status { color: #e74c3c; font-weight: bold; }
            .late-status { color: #f39c12; font-weight: bold; }
            .excused-status { color: #9b59b6; font-weight: bold; }
            .footer {
              margin-top: 40px;
              text-align: center;
              color: #7f8c8d;
              font-size: 12px;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>تقرير الحضور الشامل</h1>
            <div class="date">تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}</div>
            <div class="date">المدرس: نظام إدارة التعلم</div>
          </div>
          
          <div class="stats">
            <div class="stat-box total">
              <div style="font-size: 24px">${stats?.totalSessions || 0}</div>
              <div>إجمالي الجلسات</div>
            </div>
            <div class="stat-box present">
              <div style="font-size: 24px">${stats?.totalPresent || 0}</div>
              <div>حضور</div>
            </div>
            <div class="stat-box absent">
              <div style="font-size: 24px">${stats?.totalAbsent || 0}</div>
              <div>غياب</div>
            </div>
            <div class="stat-box late">
              <div style="font-size: 24px">${stats?.totalLate || 0}</div>
              <div>تأخير</div>
            </div>
            <div class="stat-box excused">
              <div style="font-size: 24px">${stats?.totalExcused || 0}</div>
              <div>معذور</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>الطالب</th>
                <th>المجموعة</th>
                <th>الجلسة</th>
                <th>التاريخ</th>
                <th>حالة الحضور</th>
              </tr>
            </thead>
            <tbody>
              ${attendanceRecords.map(record => `
                <tr>
                  <td>${record.studentName}<br><small>${record.enrollmentNumber}</small></td>
                  <td>${record.groupName}<br><small>${record.groupCode}</small></td>
                  <td>${record.sessionTitle}</td>
                  <td>${formatDate(record.sessionDate)}<br><small>${record.sessionTime}</small></td>
                  <td class="${record.status}-status">${getStatusConfig(record.status).text}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>تم إنشاء التقرير تلقائياً من نظام إدارة التعلم</p>
            <p>© ${new Date().getFullYear()} جميع الحقوق محفوظة</p>
          </div>
          
          <div class="no-print" style="margin-top: 20px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
              طباعة التقرير
            </button>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(reportContent);
    printWindow.document.close();
    printWindow.focus();
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
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>تصدير CSV</span>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* نطاق التواريخ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                من تاريخ
              </label>
              <input
                type="date"
                value={filterFromDate}
                onChange={(e) => setFilterFromDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                إلى تاريخ
              </label>
              <input
                type="date"
                value={filterToDate}
                onChange={(e) => setFilterToDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              />
            </div>

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
                {groups.map(group => (
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
          </div>

          {/* نوع العرض */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="flex items-end gap-2">
              <button
                onClick={() => handleFilterChange()}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Filter className="w-4 h-4" />
                <span>تطبيق الفلاتر</span>
              </button>
              <button
                onClick={() => {
                  setFilterFromDate("");
                  setFilterToDate("");
                  setFilterGroup("all");
                  setFilterStatus("all");
                  setFilterStudent("");
                  fetchAttendanceData(1);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                إعادة تعيين
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
                {viewType === "detailed" 
                  ? `عرض ${attendanceRecords.length} سجل حضور من ${pagination.total}`
                  : `عرض ${studentSummary.length} طالب من ${pagination.total}`
                }
              </span>
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">
              الصفحة {pagination.page} من {pagination.pages}
            </div>
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
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        إجراءات
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
                            
                            <td className="px-4 py-3">
                              <div className="flex justify-center gap-2">
                                <Link
                                  href={`/instructor/sessions/${record.sessionId}`}
                                  className="p-1 text-gray-400 hover:text-primary transition-colors"
                                  title="عرض الجلسة"
                                >
                                  <Eye className="w-4 h-4" />
                                </Link>
                                <Link
                                  href={`/instructor/students/${record.studentId}`}
                                  className="p-1 text-gray-400 hover:text-primary transition-colors"
                                  title="عرض الطالب"
                                >
                                  <Users className="w-4 h-4" />
                                </Link>
                                <button
                                  onClick={() => exportStudentReport(record.studentId)}
                                  className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                                  title="تصدير تقرير الطالب"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
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
                            <AlertCircle className="w-12 h-12 text-gray-400" />
                            <p className="text-lg font-medium">لا توجد سجلات حضور</p>
                            <p className="text-sm">
                              لم يتم العثور على سجلات حضور تطابق معايير البحث
                            </p>
                            <button
                              onClick={() => {
                                setFilterFromDate("");
                                setFilterToDate("");
                                setFilterGroup("all");
                                setFilterStatus("all");
                                setFilterStudent("");
                                fetchAttendanceData(1);
                              }}
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
            {attendanceRecords.length > 0 && (
              <div className="mt-6 p-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    عرض {attendanceRecords.length} من {pagination.total} سجل
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
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        إجراءات
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
                            
                            <td className="px-4 py-3">
                              <div className="flex justify-center gap-2">
                                <Link
                                  href={`/instructor/students/${student.studentId}`}
                                  className="p-1 text-gray-400 hover:text-primary transition-colors"
                                  title="عرض الطالب"
                                >
                                  <Eye className="w-4 h-4" />
                                </Link>
                                <Link
                                  href={`/instructor/students/${student.studentId}/attendance`}
                                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                  title="سجل الحضور التفصيلي"
                                >
                                  <BarChart3 className="w-4 h-4" />
                                </Link>
                                <button
                                  onClick={() => exportStudentReport(student.studentId)}
                                  className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                                  title="تصدير تقرير"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                                {student.attendanceRate < 70 && (
                                  <button
                                    onClick={() => notifyPoorAttendance(student.studentId)}
                                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                    title="تنبيه بضعف الحضور"
                                  >
                                    <AlertCircle className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={9}
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
            {studentSummary.length > 0 && (
              <div className="mt-6 p-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    عرض {studentSummary.length} من {pagination.total} طالب
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

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={exportToCSV}
            className="p-4 bg-white dark:bg-secondary rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex flex-col items-center gap-3"
          >
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Download className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900 dark:text-white">تصدير إلى CSV</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                تصدير جميع سجلات الحضور
              </p>
            </div>
          </button>
          
          <Link
            href="/instructor/attendance/report"
            className="p-4 bg-white dark:bg-secondary rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex flex-col items-center gap-3"
          >
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900 dark:text-white">التقارير المتقدمة</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                تحليلات وتقارير مفصلة
              </p>
            </div>
          </Link>
          
          <button
            onClick={printAttendanceReport}
            className="p-4 bg-white dark:bg-secondary rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex flex-col items-center gap-3"
          >
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Printer className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900 dark:text-white">طباعة التقرير</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                طباعة سجل الحضور بتنسيق PDF
              </p>
            </div>
          </button>
        </div>

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