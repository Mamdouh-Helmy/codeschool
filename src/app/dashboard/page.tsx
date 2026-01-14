"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  BookOpen,
  Users,
  Clock,
  Award,
  AlertCircle,
  TrendingUp,
  MessageSquare,
  Bell,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronRight,
  Video,
  Download,
} from "lucide-react";

// أنواع البيانات
interface Session {
  _id: string;
  title: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: "scheduled" | "completed" | "cancelled" | "postponed";
  meetingLink?: string;
  recordingLink?: string;
  moduleIndex: number;
  sessionNumber: number;
  attendanceTaken: boolean;
  attendance?: Array<{
    studentId: string;
    status: "present" | "absent" | "late" | "excused";
    notes?: string;
  }>;
  group?: {
    id: string;
    name: string;
    code: string;
  };
  course?: {
    title: string;
  };
}

interface Group {
  _id: string;
  name: string;
  code: string;
  status: "active" | "completed" | "draft" | "cancelled";
  course?: {
    title?: string;
    level?: string;
  };
  instructors?: Array<{
    name: string;
    email: string;
  }>;
  currentStudentsCount: number;
  schedule: {
    startDate: string;
    daysOfWeek: string[];
    timeFrom: string;
    timeTo: string;
  };
  metadata?: {
    completionMessagesSent?: boolean;
  };
}

interface StudentStats {
  totalSessions: number;
  attendedSessions: number;
  attendanceRate: number;
  totalGroups: number;
  activeGroups: number;
  pendingAssignments: number;
  completedCourses: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  date: string;
  icon: string;
}

interface DashboardData {
  user: User;
  stats: StudentStats;
  nextSession: Session | null;
  groups: Group[];
  sessions: Session[];
  notifications: Notification[];
}

export default function StudentDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      setError("");

      console.log("🔄 [Dashboard] Fetching student data...");
      
      const dashboardRes = await fetch(`/api/student/dashboard`, {
        headers: { 
          "Content-Type": "application/json"
        },
        credentials: 'include'
      });

      const response = await dashboardRes.json();
      
      console.log("📥 [Dashboard] API Response:", {
        success: response.success,
        status: dashboardRes.status,
        data: response.data ? {
          user: response.data.user,
          stats: response.data.stats,
          groups: response.data.groups?.length,
          sessions: response.data.sessions?.length
        } : null
      });

      if (!dashboardRes.ok || !response.success) {
        throw new Error(response.message || "فشل في تحميل بيانات الداشبورد");
      }

      setDashboardData(response.data);

    } catch (error: any) {
      console.error("❌ [Dashboard] Error fetching student data:", error);
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
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getAttendanceStatus = (session: Session) => {
    if (!session.attendance || session.attendance.length === 0) {
      return "لم يتم تسجيل الحضور";
    }
    
    const attendanceRecord = session.attendance[0];
    const statusMap: Record<string, string> = {
      present: "حاضر",
      absent: "غائب",
      late: "متأخر",
      excused: "معذور",
    };
    return attendanceRecord ? statusMap[attendanceRecord.status] || "غير معروف" : "غير مسجل";
  };

  const getAttendanceColor = (status?: string) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "absent":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "late":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "excused":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "postponed":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "scheduled": return "مجدولة";
      case "completed": return "مكتملة";
      case "cancelled": return "ملغاة";
      case "postponed": return "مؤجلة";
      default: return status;
    }
  };

  const joinSession = (session: Session) => {
    if (session.meetingLink && session.status === 'scheduled') {
      window.open(session.meetingLink, "_blank");
    } else {
      alert("لا يوجد رابط للاجتماع متاح حالياً أو أن الجلسة لم تعد مجدولة");
    }
  };

  const getDaysInArabic = (days: string[]) => {
    const daysMap: Record<string, string> = {
      "Sunday": "الأحد",
      "Monday": "الاثنين",
      "Tuesday": "الثلاثاء",
      "Wednesday": "الأربعاء",
      "Thursday": "الخميس",
      "Friday": "الجمعة",
      "Saturday": "السبت",
    };
    
    return days.map(day => daysMap[day] || day).join("، ");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">جاري تحميل بيانات الداشبورد...</p>
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
            <button
              onClick={() => router.push("/signin")}
              className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
            >
              تسجيل الدخول
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { user, stats, nextSession, groups = [], sessions = [], notifications = [] } = dashboardData || {
    user: { id: "", name: "طالب", email: "", role: "student" },
    stats: {
      totalSessions: 0,
      attendedSessions: 0,
      attendanceRate: 0,
      totalGroups: 0,
      activeGroups: 0,
      pendingAssignments: 0,
      completedCourses: 0,
    },
    nextSession: null,
    groups: [],
    sessions: [],
    notifications: []
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkmode">
      {/* Header */}
      <div className="bg-white dark:bg-secondary shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                لوحة تحكم الطالب
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                مرحباً بك، {user?.name || "طالبنا العزيز"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {notifications.length > 0 && (
                <Link
                  href="/dashboard/notifications"
                  className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                >
                  <Bell className="w-6 h-6" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                </Link>
              )}
              <Link
                href="/"
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                العودة للرئيسية
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* بطاقة نسبة الحضور */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">نسبة الحضور</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.attendanceRate}%
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">الحضور</span>
                <span className="font-medium">{stats.attendedSessions}/{stats.totalSessions}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.attendanceRate}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* بطاقة المجموعات النشطة */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">المجموعات النشطة</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.activeGroups}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              من إجمالي {stats.totalGroups} مجموعة
            </p>
          </div>

          {/* بطاقة الجلسات القادمة */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">الجلسات القادمة</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {sessions.length}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              خلال الأيام القادمة
            </p>
          </div>

          {/* بطاقة الدورات المكتملة */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">الدورات المكتملة</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.completedCourses}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Award className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              مبروك على إنجازاتك!
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* الجانب الأيسر */}
          <div className="lg:col-span-2 space-y-6">
            {/* الجلسة التالية */}
            {nextSession ? (
              <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      الجلسة التالية
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{formatDate(nextSession.scheduledDate)}</span>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 mb-6 border border-blue-100 dark:border-blue-800">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                    {nextSession.title}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">الوقت</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {nextSession.startTime} - {nextSession.endTime}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">المجموعة</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {nextSession.group?.name || "غير محدد"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">رقم الجلسة</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {nextSession.sessionNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">الحالة</p>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(nextSession.status)}`}>
                        {getStatusText(nextSession.status)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  {nextSession.meetingLink && nextSession.status === 'scheduled' && (
                    <button
                      onClick={() => joinSession(nextSession)}
                      className="flex-1 bg-gradient-to-r from-primary to-purple-600 text-white py-3 rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>انضم للجلسة</span>
                    </button>
                  )}
                  {nextSession.recordingLink && nextSession.status === 'completed' && (
                    <button
                      onClick={() => window.open(nextSession.recordingLink, "_blank")}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                    >
                      <Download className="w-4 h-4" />
                      <span>شاهد التسجيل</span>
                    </button>
                  )}
                  <Link
                    href={`/dashboard/sessions/${nextSession._id}`}
                    className="flex-1 border-2 border-primary text-primary py-3 rounded-lg hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>عرض التفاصيل</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    لا توجد جلسات قادمة
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    لا توجد جلسات مجدولة في الوقت الحالي
                  </p>
                </div>
              </div>
            )}

            {/* المجموعات */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    مجموعاتي
                  </h3>
                </div>
                <Link
                  href="/dashboard/groups"
                  className="text-primary hover:text-primary/80 text-sm flex items-center gap-1 transition-colors"
                >
                  عرض الكل
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="space-y-4">
                {groups.length > 0 ? (
                  groups.slice(0, 3).map((group) => (
                    <div
                      key={group._id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all hover:border-primary/50 group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                              {group.name}
                            </h4>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              group.status === 'active' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : group.status === 'completed'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                            }`}>
                              {group.status === 'active' ? 'نشط' : 
                               group.status === 'completed' ? 'مكتمل' : 'مسودة'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                            {/* FIX: Added safe check for course.title */}
                            {group.code} • {group.course?.title || "دورة تدريبية"}
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {group.instructors?.[0]?.name || "بدون مدرس"}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {group.currentStudentsCount} طالب
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {group.schedule.daysOfWeek && getDaysInArabic(group.schedule.daysOfWeek)}
                            </span>
                          </div>
                        </div>
                        <Link
                          href={`/dashboard/groups/${group._id}`}
                          className="text-primary hover:text-primary/80 text-sm flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-primary/10 transition-all"
                        >
                          دخول
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      لم يتم إضافتك إلى أي مجموعة بعد
                    </p>
                    <Link
                      href="/courses"
                      className="inline-block mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      تصفح الدورات
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* الجانب الأيمن */}
          <div className="space-y-6">
            {/* الجلسات القادمة */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  الجلسات القادمة
                </h3>
              </div>
              
              <div className="space-y-3">
                {sessions.length > 0 ? (
                  sessions.slice(0, 5).map((session) => (
                    <Link
                      key={session._id}
                      href={`/dashboard/sessions/${session._id}`}
                      className="block border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all hover:border-primary/50 group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1 group-hover:text-primary transition-colors line-clamp-1">
                            {session.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <span>{session.startTime}</span>
                            <span>•</span>
                            <span className="line-clamp-1">{formatDate(session.scheduledDate)}</span>
                          </div>
                          {session.group && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {session.group.name}
                            </p>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs flex-shrink-0 ${getStatusColor(session.status)}`}>
                          {getStatusText(session.status)}
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <Calendar className="w-8 h-8 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      لا توجد جلسات قادمة
                    </p>
                  </div>
                )}
                
                {sessions.length > 5 && (
                  <Link
                    href="/dashboard/sessions"
                    className="block text-center text-sm text-primary hover:text-primary/80 pt-2 border-t border-gray-200 dark:border-gray-700"
                  >
                    عرض جميع الجلسات
                  </Link>
                )}
              </div>
            </div>

            {/* الحضور */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  حالة الحضور
                </h3>
              </div>
              
              <div className="space-y-4">
                {stats.attendanceRate < 80 && (
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-300">
                          انتبه! نسبة حضورك منخفضة
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          نسبة الحضور: {stats.attendanceRate}% - يجب أن تكون 80% على الأقل
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-3 text-center border border-green-200 dark:border-green-800">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-green-800 dark:text-green-300">
                      {stats.attendedSessions}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">حضور</p>
                  </div>
                  <div className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-lg p-3 text-center border border-red-200 dark:border-red-800">
                    <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-red-800 dark:text-red-300">
                      {(stats.totalSessions - stats.attendedSessions)}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">غياب</p>
                  </div>
                </div>

                <Link
                  href="/dashboard/attendance"
                  className="block w-full text-center py-2.5 border-2 border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-all font-medium"
                >
                  عرض سجل الحضور الكامل
                </Link>
              </div>
            </div>

            {/* إجراءات سريعة */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  إجراءات سريعة
                </h3>
              </div>
              
              <div className="space-y-2">
                <Link
                  href="/dashboard/sessions"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">جميع الجلسات</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                </Link>
                
                <Link
                  href="/dashboard/groups"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">المجموعات</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                </Link>
                
                <Link
                  href="/dashboard/profile"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                      <Award className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">الملف الشخصي</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                </Link>
                
                <Link
                  href="/dashboard/notifications"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Bell className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">الإشعارات</span>
                    {notifications.length > 0 && (
                      <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {notifications.length}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}