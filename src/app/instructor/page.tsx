"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
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
  BookOpen,
  BarChart3,
  Eye,
  AlertTriangle,
  FileText,
  GraduationCap,
  Zap,
} from "lucide-react";

// أنواع البيانات
interface Instructor {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Session {
  id: string;
  title: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: "scheduled" | "completed" | "cancelled" | "postponed";
  moduleIndex: number;
  sessionNumber: number;
  lessonIndexes: number[];
  attendanceTaken: boolean;
  attendanceCount: number;
  meetingLink: string;
  recordingLink: string;
  dayName: string;
  isToday: boolean;
  isUpcoming: boolean;
  canTakeAttendance: boolean;
  group: {
    id: string;
    name: string;
    code: string;
  };
  course: {
    title: string;
  };
}

interface Group {
  id: string;
  name: string;
  code: string;
  status: "active" | "completed" | "draft" | "cancelled";
  course: {
    title: string;
    level: string;
  };
  schedule: {
    startDate: string;
    daysOfWeek: string[];
    timeFrom: string;
    timeTo: string;
  };
  studentCount: number;
  maxStudents: number;
  totalSessions: number;
  progress: number;
  lastActivity: string;
}

interface DashboardStats {
  totalGroups: number;
  activeGroups: number;
  completedGroups: number;
  totalStudents: number;
  totalSessions: number;
  completedSessions: number;
  pendingSessions: number;
  attendanceStats: {
    totalSessionsWithAttendance: number;
    totalStudentsMarked: number;
  };
  todaySessionsCount: number;
  upcomingSessionsCount: number;
  sessionsNeedingAttendanceCount: number;
}

interface DashboardData {
  instructor: Instructor;
  stats: DashboardStats;
  todaySessions: Session[];
  upcomingSessions: Session[];
  sessionsNeedingAttendance: Session[];
  recentCompletedSessions: Session[];
  groups: Group[];
  metadata: {
    lastUpdated: string;
    groupsCount: number;
    totalDataPoints: {
      sessions: number;
      students: number;
      attendanceRecords: number;
    };
  };
}

export default function InstructorDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      console.log("🔄 [Instructor Dashboard] Fetching data...");
      
      const dashboardRes = await fetch(`/api/instructor-dashboard/dashboard`, {
        headers: { 
          "Content-Type": "application/json"
        },
        credentials: 'include'
      });

      const response = await dashboardRes.json();
      
      console.log("📥 [Instructor Dashboard] API Response:", {
        success: response.success,
        status: dashboardRes.status,
        data: response.data ? "found" : "not found"
      });

      if (!dashboardRes.ok || !response.success) {
        throw new Error(response.message || "فشل في تحميل بيانات لوحة التحكم");
      }

      setDashboardData(response.data);

    } catch (error: any) {
      console.error("❌ [Instructor Dashboard] Error fetching data:", error);
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

  const formatTime = (timeString: string) => {
    return timeString || "غير محدد";
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

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "bg-green-600";
    if (progress >= 50) return "bg-yellow-600";
    return "bg-red-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">جاري تحميل لوحة التحكم...</p>
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
              onClick={fetchDashboardData}
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

  const { instructor, stats, todaySessions, upcomingSessions, sessionsNeedingAttendance, recentCompletedSessions, groups } = dashboardData || {
    instructor: { id: "", name: "مدرس", email: "", role: "instructor" },
    stats: {
      totalGroups: 0,
      activeGroups: 0,
      completedGroups: 0,
      totalStudents: 0,
      totalSessions: 0,
      completedSessions: 0,
      pendingSessions: 0,
      attendanceStats: { totalSessionsWithAttendance: 0, totalStudentsMarked: 0 },
      todaySessionsCount: 0,
      upcomingSessionsCount: 0,
      sessionsNeedingAttendanceCount: 0
    },
    todaySessions: [],
    upcomingSessions: [],
    sessionsNeedingAttendance: [],
    recentCompletedSessions: [],
    groups: []
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkmode">
      {/* Header */}
      <div className="bg-white dark:bg-secondary shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                لوحة تحكم المدرس
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                مرحباً بك، {instructor?.name || "أستاذنا العزيز"}
              </p>
            </div>
            <div className="flex items-center gap-4">
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
            <div className="mt-4 flex items-center gap-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ 
                    width: `${stats.totalGroups > 0 ? (stats.activeGroups / stats.totalGroups) * 100 : 0}%` 
                  }}
                ></div>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {stats.totalGroups > 0 ? Math.round((stats.activeGroups / stats.totalGroups) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* بطاقة عدد الطلاب */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">إجمالي الطلاب</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.totalStudents}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              في جميع المجموعات
            </p>
            <div className="mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium text-green-600 dark:text-green-400">
                  {stats.attendanceStats.totalStudentsMarked}
                </span> تم تسجيل حضورهم
              </p>
            </div>
          </div>

          {/* بطاقة الجلسات اليوم */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">جلسات اليوم</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.todaySessionsCount}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {stats.sessionsNeedingAttendanceCount} تحتاج تسجيل حضور
            </p>
            {stats.todaySessionsCount > 0 && (
              <div className="mt-4">
                <Link
                  href="/instructor/sessions"
                  className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 flex items-center gap-1"
                >
                  <span>عرض جميع جلسات اليوم</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>

          {/* بطاقة الجلسات القادمة */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">الجلسات القادمة</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.upcomingSessionsCount}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              خلال الأيام القادمة
            </p>
            {stats.upcomingSessionsCount > 0 && (
              <div className="mt-4">
                <Link
                  href="/instructor/sessions?filter=upcoming"
                  className="text-sm text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300 flex items-center gap-1"
                >
                  <span>عرض الجدول الكامل</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* الجانب الأيسر */}
          <div className="lg:col-span-2 space-y-6">
            {/* جلسات اليوم */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    جلسات اليوم
                  </h3>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(new Date().toISOString())}
                </div>
              </div>

              <div className="space-y-4">
                {todaySessions.length > 0 ? (
                  todaySessions.map((session) => (
                    <div
                      key={session.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(session.status)}`}>
                              {getStatusText(session.status)}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {session.group.name} ({session.group.code})
                            </span>
                          </div>
                          
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            {session.title}
                          </h4>
                          
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{session.startTime} - {session.endTime}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <BookOpen className="w-4 h-4" />
                              <span>الوحدة {session.moduleIndex + 1} • الحصة {session.sessionNumber}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{session.attendanceCount} من {session.group.students || 0}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          {session.status === "scheduled" && session.meetingLink && (
                            <button
                              onClick={() => joinSession(session)}
                              className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1 text-sm"
                            >
                              <Video className="w-4 h-4" />
                              <span>انضم</span>
                            </button>
                          )}
                          
                          {session.canTakeAttendance && !session.attendanceTaken && (
                            <Link
                              href={`/instructor/sessions/${session.id}/attendance`}
                              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1 text-sm"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>تسجيل حضور</span>
                            </Link>
                          )}
                          
                          {session.attendanceTaken && (
                            <Link
                              href={`/instructor/sessions/${session.id}/attendance`}
                              className="px-3 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center gap-1 text-sm"
                            >
                              <Eye className="w-4 h-4" />
                              <span>عرض الحضور</span>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      لا توجد جلسات اليوم
                    </h4>
                    <p className="text-gray-500 dark:text-gray-400">
                      استمتع بيومك! لا توجد جلسات مجدولة اليوم
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* تحتاج لتسجيل حضور */}
            {sessionsNeedingAttendance.length > 0 && (
              <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      تحتاج لتسجيل حضور
                    </h3>
                  </div>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                    {sessionsNeedingAttendance.length} جلسة
                  </span>
                </div>

                <div className="space-y-3">
                  {sessionsNeedingAttendance.map((session) => (
                    <Link
                      key={session.id}
                      href={`/instructor/sessions/${session.id}/attendance`}
                      className="block border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-all group"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-yellow-700 transition-colors mb-1">
                            {session.title}
                          </h4>
                          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                            <span>{formatDate(session.scheduledDate)}</span>
                            <span>•</span>
                            <span>{session.startTime}</span>
                            <span>•</span>
                            <span>{session.group.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {session.studentsMarked || 0}/{session.totalStudents}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-yellow-600 transition-colors" />
                        </div>
                      </div>
                    </Link>
                  ))}
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
                  href="/instructor/groups"
                  className="text-primary hover:text-primary/80 text-sm flex items-center gap-1 transition-colors"
                >
                  عرض الكل
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groups.length > 0 ? (
                  groups.slice(0, 4).map((group) => (
                    <Link
                      key={group.id}
                      href={`/instructor/groups/${group.id}`}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all hover:border-primary/50 group"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                            {group.name}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {group.code} • {group.status === 'active' ? 'نشط' : 'مكتمل'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">الطلاب</span>
                          <span className="font-medium">{group.studentCount}/{group.maxStudents}</span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">الحصص</span>
                          <span className="font-medium">{group.totalSessions}</span>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-500 dark:text-gray-400">التقدم</span>
                            <span className="font-medium">{group.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getProgressColor(group.progress)}`}
                              style={{ width: `${group.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      لم يتم تعيينك إلى أي مجموعة بعد
                    </p>
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
                <Clock className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  الجلسات القادمة
                </h3>
              </div>
              
              <div className="space-y-3">
                {upcomingSessions.length > 0 ? (
                  upcomingSessions.slice(0, 5).map((session) => (
                    <Link
                      key={session.id}
                      href={`/instructor/sessions/${session.id}`}
                      className="block border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all hover:border-primary/50 group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1 group-hover:text-primary transition-colors line-clamp-1">
                            {session.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            <span>{formatDate(session.scheduledDate)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <span>{session.startTime}</span>
                            <span>•</span>
                            <span className="line-clamp-1">{session.group.name}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs flex-shrink-0 ${getStatusColor(session.status)}`}>
                          {getStatusText(session.status)}
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <Clock className="w-8 h-8 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      لا توجد جلسات قادمة
                    </p>
                  </div>
                )}
                
                {upcomingSessions.length > 5 && (
                  <Link
                    href="/instructor/sessions?filter=upcoming"
                    className="block text-center text-sm text-primary hover:text-primary/80 pt-2 border-t border-gray-200 dark:border-gray-700"
                  >
                    عرض جميع الجلسات القادمة
                  </Link>
                )}
              </div>
            </div>

            {/* جلسات مكتملة حديثاً */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  جلسات مكتملة
                </h3>
              </div>
              
              <div className="space-y-3">
                {recentCompletedSessions.length > 0 ? (
                  recentCompletedSessions.map((session) => (
                    <Link
                      key={session.id}
                      href={`/instructor/sessions/${session.id}`}
                      className="block border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1 group-hover:text-primary transition-colors line-clamp-1">
                            {session.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(session.scheduledDate)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <Users className="w-3 h-3" />
                            <span>{session.attendanceCount} حضور</span>
                          </div>
                        </div>
                        {session.recordingLink && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              window.open(session.recordingLink, "_blank");
                            }}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            title="شاهد التسجيل"
                          >
                            <Video className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <CheckCircle className="w-8 h-8 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      لا توجد جلسات مكتملة حديثاً
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* إجراءات سريعة */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  إجراءات سريعة
                </h3>
              </div>
              
              <div className="space-y-2">
                <Link
                  href="/instructor/sessions"
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
                  href="/instructor/groups"
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
                  href="/instructor/attendance"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">سجل الحضور</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                </Link>
                
                <Link
                  href="/instructor/analytics"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">الإحصائيات</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                </Link>
              </div>
            </div>

            {/* معلومات سريعة */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-xl shadow-lg p-6 border border-primary/20">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  معلومات سريعة
                </h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">الجلسات المكتملة</span>
                  <span className="font-medium">{stats.completedSessions}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">جلسات بانتظار</span>
                  <span className="font-medium">{stats.pendingSessions}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">نسبة الحضور</span>
                  <span className="font-medium">
                    {stats.attendanceStats.totalSessionsWithAttendance > 0 
                      ? `${Math.round((stats.attendanceStats.totalStudentsMarked / (stats.attendanceStats.totalSessionsWithAttendance * 25)) * 100)}%`
                      : "0%"}
                  </span>
                </div>
                
                <div className="pt-3 border-t border-primary/20">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    آخر تحديث: {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}