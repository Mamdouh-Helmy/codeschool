// app/instructor/sessions/[id]/attendance/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  Eye,
  Video,
  Download,
  BarChart3,
  BookOpen,
  GraduationCap,
  UserCheck,
  UserX,
  Clock as ClockIcon,
  MessageSquare,
  Send,
  RefreshCw,
  AlertTriangle,
  Save,
  MoreVertical,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Printer,
  Mail,
  Phone,
} from "lucide-react";

interface Session {
  _id: string;
  title: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: string;
  attendanceTaken: boolean;
  groupId: {
    _id: string;
    name: string;
    code: string;
    automation?: {
      whatsappEnabled: boolean;
      notifyGuardianOnAbsence: boolean;
    };
  };
  courseId?: {
    title: string;
  };
}

interface StudentAttendance {
  studentId: string;
  fullName: string;
  email: string;
  enrollmentNumber: string;
  whatsappNumber?: string;
  guardianInfo?: {
    name?: string;
    whatsappNumber?: string;
  };
  attendance: {
    status: "present" | "absent" | "late" | "excused" | "pending";
    notes: string;
    markedAt: string | null;
    markedBy: {
      name: string;
      email: string;
    } | null;
  };
}

interface AttendanceResponse {
  success: boolean;
  data: {
    session: Session;
    attendance: StudentAttendance[];
    stats: {
      total: number;
      present: number;
      absent: number;
      late: number;
      excused: number;
      pending: number;
    };
    canTakeAttendance: boolean;
    automation?: {
      whatsappEnabled: boolean;
      notifyGuardianOnAbsence: boolean;
    };
  };
}

export default function SessionAttendancePage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [canTakeAttendance, setCanTakeAttendance] = useState(false);
  const [automation, setAutomation] = useState<any>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  const [selectedStatus, setSelectedStatus] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCustomMessages, setShowCustomMessages] = useState(false);
  const [customMessages, setCustomMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (sessionId) {
      fetchAttendanceData();
    }
  }, [sessionId]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      setError("");

      console.log("🔄 [Session Attendance] Fetching attendance data...");

      const attendanceRes = await fetch(`/api/instructor/sessions/${sessionId}/attendance`, {
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const response: AttendanceResponse = await attendanceRes.json();

      console.log("📥 [Session Attendance] API Response:", {
        success: response.success,
        status: attendanceRes.status,
        attendanceCount: response.data?.attendance?.length,
      });

      if (!attendanceRes.ok || !response.success) {
        throw new Error(response.data?.session?.error || "فشل في تحميل بيانات الحضور");
      }

      setSession(response.data.session);
      setAttendance(response.data.attendance || []);
      setStats(response.data.stats);
      setCanTakeAttendance(response.data.canTakeAttendance);
      setAutomation(response.data.automation);

      // تهيئة الحالة المحددة والملاحظات
      const initialStatus: Record<string, string> = {};
      const initialNotes: Record<string, string> = {};
      
      response.data.attendance.forEach((item: StudentAttendance) => {
        initialStatus[item.studentId] = item.attendance.status;
        initialNotes[item.studentId] = item.attendance.notes || "";
      });
      
      setSelectedStatus(initialStatus);
      setNotes(initialNotes);

    } catch (error: any) {
      console.error("❌ [Session Attendance] Error fetching attendance:", error);
      setError(error.message || "حدث خطأ أثناء تحميل بيانات الحضور");

      if (error.message.includes("غير مصرح") || error.message.includes("UNAUTHORIZED")) {
        router.push("/signin");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId: string, status: string) => {
    setSelectedStatus(prev => ({
      ...prev,
      [studentId]: status
    }));

    // إذا تم اختيار حالة تحتاج لإشعار ولي الأمر، نعرض حقل الرسالة المخصصة
    if (['absent', 'late', 'excused'].includes(status)) {
      setShowCustomMessages(true);
    }
  };

  const handleNotesChange = (studentId: string, note: string) => {
    setNotes(prev => ({
      ...prev,
      [studentId]: note
    }));
  };

  const handleCustomMessageChange = (studentId: string, message: string) => {
    setCustomMessages(prev => ({
      ...prev,
      [studentId]: message
    }));
  };

  const handleSubmitAttendance = async () => {
    try {
      setSubmitting(true);
      setError("");
      setSuccessMessage("");

      // تحضير بيانات الحضور
      const attendanceData = Object.entries(selectedStatus).map(([studentId, status]) => ({
        studentId,
        status,
        notes: notes[studentId] || ''
      }));

      console.log("📤 [Session Attendance] Submitting attendance:", {
        sessionId,
        attendanceCount: attendanceData.length,
        customMessages: Object.keys(customMessages).length
      });

      const submitRes = await fetch(`/api/instructor-dashboard/sessions/${sessionId}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          attendance: attendanceData,
          customMessages: Object.keys(customMessages).length > 0 ? customMessages : undefined
        })
      });

      const response = await submitRes.json();

      console.log("📥 [Session Attendance] Submit Response:", {
        success: response.success,
        status: submitRes.status,
        automation: response.automation
      });

      if (!submitRes.ok || !response.success) {
        throw new Error(response.error || "فشل في تسجيل الحضور");
      }

      setSuccessMessage(response.message || "تم تسجيل الحضور بنجاح");
      
      // تحديث البيانات بعد التسجيل الناجح
      setTimeout(() => {
        fetchAttendanceData();
      }, 2000);

    } catch (error: any) {
      console.error("❌ [Session Attendance] Error submitting attendance:", error);
      setError(error.message || "حدث خطأ أثناء تسجيل الحضور");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAll = (status: "present" | "absent" | "late" | "excused") => {
    const newStatus: Record<string, string> = {};
    attendance.forEach(student => {
      newStatus[student.studentId] = status;
    });
    setSelectedStatus(newStatus);
    
    if (['absent', 'late', 'excused'].includes(status)) {
      setShowCustomMessages(true);
    }
  };

  const handleSendTestNotification = (studentId: string) => {
    const student = attendance.find(s => s.studentId === studentId);
    if (!student) return;

    const whatsappNumber = student.guardianInfo?.whatsappNumber;
    if (!whatsappNumber) {
      alert("لا يوجد رقم واتساب لولي أمر هذا الطالب");
      return;
    }

    // هنا يمكنك إضافة منطق إرسال رسالة تجريبية
    alert(`سيتم إرسال إشعار تجريبي إلى ولي أمر ${student.fullName}`);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "تاريخ غير صالح";

      return date.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
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
        icon: AlertTriangle,
        color: "blue",
      },
      pending: {
        bg: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
        text: "بانتظار",
        icon: ClockIcon,
        color: "gray",
      },
    };

    return config[status as keyof typeof config] || config.pending;
  };

  const filteredAttendance = attendance.filter(student => {
    // تصفية حسب حالة البحث
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        student.fullName.toLowerCase().includes(searchLower) ||
        student.enrollmentNumber.toLowerCase().includes(searchLower) ||
        student.email.toLowerCase().includes(searchLower)
      );
    }

    // تصفية حسب حالة الحضور
    if (filterStatus !== "all") {
      const currentStatus = selectedStatus[student.studentId] || student.attendance.status;
      return currentStatus === filterStatus;
    }

    return true;
  });

  const calculateAttendancePercentage = () => {
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.present / stats.total) * 100);
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

  if (error && !session) {
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
              href="/instructor/sessions"
              className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
            >
              العودة للجلسات
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
                href={`/instructor/sessions/${sessionId}`}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  تسجيل الحضور
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  {session?.title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={fetchAttendanceData}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                title="تحديث"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <Link
                href={`/instructor/sessions/${sessionId}`}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                تفاصيل الجلسة
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* معلومات الجلسة */}
        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {session?.title}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(session?.scheduledDate || "")}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {session?.startTime} - {session?.endTime}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {session?.groupId?.name}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  {session?.courseId?.title}
                </span>
              </div>
            </div>
            
            {session?.attendanceTaken ? (
              <div className="px-4 py-2 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full text-sm">
                تم تسجيل الحضور
              </div>
            ) : (
              <div className="px-4 py-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full text-sm">
                {canTakeAttendance ? "جاهز للتسجيل" : "غير جاهز للتسجيل"}
              </div>
            )}
          </div>

          {/* إحصائيات الحضور */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400 mb-1">
                  {stats.present}
                </div>
                <div className="text-sm text-green-600 dark:text-green-300">
                  حاضر
                </div>
                <div className="text-xs text-green-500 dark:text-green-400">
                  {calculateAttendancePercentage()}%
                </div>
              </div>

              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="text-2xl font-bold text-red-700 dark:text-red-400 mb-1">
                  {stats.absent}
                </div>
                <div className="text-sm text-red-600 dark:text-red-300">
                  غائب
                </div>
              </div>

              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400 mb-1">
                  {stats.late}
                </div>
                <div className="text-sm text-yellow-600 dark:text-yellow-300">
                  متأخر
                </div>
              </div>

              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-1">
                  {stats.excused}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-300">
                  معذور
                </div>
              </div>

              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {stats.pending}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  بانتظار
                </div>
              </div>

              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-400 mb-1">
                  {stats.total}
                </div>
                <div className="text-sm text-purple-600 dark:text-purple-300">
                  إجمالي
                </div>
              </div>
            </div>
          )}

          {/* معلومات الأوتوميشن */}
          {automation && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Send className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h4 className="font-medium text-blue-800 dark:text-blue-300">
                  إعدادات الأوتوميشن
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">إشعارات الواتساب:</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${automation.whatsappEnabled ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                    {automation.whatsappEnabled ? "مفعلة" : "معطلة"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">إشعارات أولياء الأمور:</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${automation.notifyGuardianOnAbsence ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                    {automation.notifyGuardianOnAbsence ? "مفعلة" : "معطلة"}
                  </span>
                </div>
              </div>
              {automation.whatsappEnabled && automation.notifyGuardianOnAbsence && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  سيتم إرسال إشعارات تلقائية لأولياء أمور الطلاب الغائبين والمتأخرين والمعذورين
                </p>
              )}
            </div>
          )}
        </div>

        {/* فلتر وبحث */}
        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* بحث */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="ابحث عن طالب..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* تصفية حسب الحالة */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                حالة الحضور
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              >
                <option value="all">جميع الحالات</option>
                <option value="present">حاضر فقط</option>
                <option value="absent">غائب فقط</option>
                <option value="late">متأخر فقط</option>
                <option value="excused">معذور فقط</option>
                <option value="pending">بانتظار فقط</option>
              </select>
            </div>

            {/* أزرار تحديد الكل */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                تحديد الكل
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleMarkAll("present")}
                  className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  حاضرين
                </button>
                <button
                  onClick={() => handleMarkAll("absent")}
                  className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  غائبين
                </button>
              </div>
            </div>

            {/* إجراءات */}
            <div className="flex items-end">
              <button
                onClick={handleSubmitAttendance}
                disabled={submitting || !canTakeAttendance || session?.attendanceTaken}
                className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>
                  {submitting ? "جاري الحفظ..." : session?.attendanceTaken ? "تم التسجيل" : "حفظ الحضور"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* رسائل النجاح والخطأ */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-green-800 dark:text-green-300">{successMessage}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-red-800 dark:text-red-300">{error}</span>
            </div>
          </div>
        )}

        {/* قائمة الطلاب */}
        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                قائمة الطلاب ({filteredAttendance.length})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCustomMessages(!showCustomMessages)}
                  className="px-3 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-sm flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>رسائل مخصصة</span>
                </button>
                <button className="px-3 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm flex items-center gap-2">
                  <Printer className="w-4 h-4" />
                  <span>طباعة</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                      #
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                      اسم الطالب
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                      معلومات التواصل
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                      حالة الحضور
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                      ملاحظات
                    </th>
                    {showCustomMessages && (
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                        رسالة مخصصة
                      </th>
                    )}
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                      إجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAttendance.length > 0 ? (
                    filteredAttendance.map((student, index) => {
                      const currentStatus = selectedStatus[student.studentId] || student.attendance.status;
                      const statusConfig = getStatusConfig(currentStatus);
                      const StatusIcon = statusConfig.icon;
                      
                      const needsNotification = ['absent', 'late', 'excused'].includes(currentStatus);
                      const hasGuardianWhatsApp = student.guardianInfo?.whatsappNumber;

                      return (
                        <tr key={student.studentId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                            {index + 1}
                          </td>
                          
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {student.fullName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {student.enrollmentNumber}
                              </p>
                            </div>
                          </td>
                          
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[120px]">
                                  {student.email}
                                </span>
                              </div>
                              {student.guardianInfo?.whatsappNumber && (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-gray-400" />
                                  <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[120px]">
                                    {student.guardianInfo.whatsappNumber}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          
                          <td className="px-4 py-3">
                            <div className="flex justify-center">
                              <select
                                value={currentStatus}
                                onChange={(e) => handleStatusChange(student.studentId, e.target.value)}
                                disabled={session?.attendanceTaken}
                                className={`px-3 py-1 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent text-sm ${statusConfig.bg} ${session?.attendanceTaken ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                              >
                                <option value="present" className="bg-white dark:bg-gray-800">حاضر</option>
                                <option value="absent" className="bg-white dark:bg-gray-800">غائب</option>
                                <option value="late" className="bg-white dark:bg-gray-800">متأخر</option>
                                <option value="excused" className="bg-white dark:bg-gray-800">معذور</option>
                                <option value="pending" className="bg-white dark:bg-gray-800">بانتظار</option>
                              </select>
                            </div>
                          </td>
                          
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={notes[student.studentId] || ""}
                              onChange={(e) => handleNotesChange(student.studentId, e.target.value)}
                              disabled={session?.attendanceTaken}
                              placeholder="أضف ملاحظة..."
                              className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </td>
                          
                          {showCustomMessages && (
                            <td className="px-4 py-3">
                              {needsNotification ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={customMessages[student.studentId] || ""}
                                    onChange={(e) => handleCustomMessageChange(student.studentId, e.target.value)}
                                    disabled={session?.attendanceTaken}
                                    placeholder={`رسالة مخصصة لولي أمر ${student.fullName}`}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                                    rows={2}
                                  />
                                  {automation?.whatsappEnabled && automation?.notifyGuardianOnAbsence && (
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs ${hasGuardianWhatsApp ? 'text-green-600' : 'text-red-600'}`}>
                                        {hasGuardianWhatsApp ? '✓ رقم واتساب متوفر' : '⚠️ لا يوجد رقم واتساب'}
                                      </span>
                                      {hasGuardianWhatsApp && (
                                        <button
                                          onClick={() => handleSendTestNotification(student.studentId)}
                                          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                        >
                                          إرسال تجريبي
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                                  غير مطلوب
                                </div>
                              )}
                            </td>
                          )}
                          
                          <td className="px-4 py-3">
                            <div className="flex justify-center gap-2">
                              {student.attendance.markedAt && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatDate(student.attendance.markedAt)}
                                </span>
                              )}
                              <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={showCustomMessages ? 7 : 6} className="px-4 py-12 text-center">
                        <Users className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">
                          {searchTerm || filterStatus !== "all"
                            ? "لا توجد نتائج مطابقة للبحث"
                            : "لا توجد بيانات حضور"}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                عرض {filteredAttendance.length} من {attendance.length} طالب
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedStatus({});
                    setNotes({});
                    setCustomMessages({});
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  إعادة تعيين
                </button>
                
                <button
                  onClick={handleSubmitAttendance}
                  disabled={submitting || !canTakeAttendance || session?.attendanceTaken}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{session?.attendanceTaken ? "تم التسجيل" : "حفظ الحضور"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ملاحظات هامة */}
        {canTakeAttendance && !session?.attendanceTaken && (
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                  ملاحظات هامة
                </h4>
                <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                  <li>• يمكنك تغيير حالة الحضور لأي طالب من القائمة المنسدلة</li>
                  <li>• إضافة ملاحظات اختيارية لتوضيح سبب الغياب أو التأخير</li>
                  <li>• سيتم إرسال إشعارات تلقائية لأولياء أمور الطلاب الغائبين والمتأخرين والمعذورين إذا كان الأوتوميشن مفعل</li>
                  <li>• يمكنك إرسال رسائل مخصصة لكل ولي أمر عن طريق تفعيل خيار "رسائل مخصصة"</li>
                  <li>• بعد الحفظ، لا يمكن تعديل الحضور إلا من قبل الإدارة</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}