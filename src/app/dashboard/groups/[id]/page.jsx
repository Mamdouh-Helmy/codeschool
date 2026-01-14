"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Users,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  TrendingUp,
  CheckCircle,
  XCircle,
  Video,
  PlayCircle,
  Award,
  DollarSign,
} from "lucide-react";

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id;

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (groupId) {
      fetchGroupDetail();
    }
  }, [groupId]);

  const fetchGroupDetail = async () => {
    try {
      setLoading(true);
      setError("");

      const groupRes = await fetch(`/api/student/groups/${groupId}`, {
        headers: { "Content-Type": "application/json" },
        credentials: 'include'
      });

      const response = await groupRes.json();

      if (!groupRes.ok || !response.success) {
        throw new Error(response.message || "فشل في تحميل تفاصيل المجموعة");
      }

      setGroup(response.data);
    } catch (error) {
      console.error("❌ Error fetching group:", error);
      setError(error.message || "حدث خطأ أثناء تحميل تفاصيل المجموعة");
      
      if (error.message.includes("غير مصرح") || error.message.includes("UNAUTHORIZED")) {
        router.push("/signin");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
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

  const getDaysInArabic = (days) => {
    const daysMap = {
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

  const getStatusColor = (status) => {
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

  const getStatusText = (status) => {
    switch (status) {
      case "scheduled": return "مجدولة";
      case "completed": return "مكتملة";
      case "cancelled": return "ملغاة";
      case "postponed": return "مؤجلة";
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">جاري تحميل تفاصيل المجموعة...</p>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {error ? "حدث خطأ" : "المجموعة غير موجودة"}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {error || "لم يتم العثور على المجموعة المطلوبة"}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={fetchGroupDetail}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              حاول مرة أخرى
            </button>
            <button
              onClick={() => router.push("/dashboard/groups")}
              className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
            >
              جميع المجموعات
            </button>
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
                href="/dashboard/groups"
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {group.name}
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  {group.course.title} • {group.code}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              العودة للداشبورد
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">نسبة الحضور</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {group.stats.attendanceRate}%
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {group.stats.attendedSessions} من {group.stats.totalSessionsWithAttendance} جلسة
            </p>
          </div>

          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">إجمالي الجلسات</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {group.stats.totalSessions}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {group.stats.completedSessions} مكتملة
            </p>
          </div>

          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">الجلسات القادمة</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {group.stats.upcomingSessions}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              في المستقبل
            </p>
          </div>

          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">عدد الطلاب</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {group.stats.currentStudentsCount}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              من {group.stats.maxStudents} طالب
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Next Session */}
            {group.nextSession && (
              <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  الجلسة التالية
                </h3>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                    {group.nextSession.title}
                  </h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">التاريخ</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatDate(group.nextSession.scheduledDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">الوقت</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {group.nextSession.startTime} - {group.nextSession.endTime}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {group.nextSession.meetingLink && (
                      <button
                        onClick={() => window.open(group.nextSession.meetingLink, "_blank")}
                        className="flex-1 bg-primary text-white py-2 rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                      >
                        <Video className="w-4 h-4" />
                        انضم للجلسة
                      </button>
                    )}
                    <Link
                      href={`/dashboard/sessions/${group.nextSession.id}`}
                      className="flex-1 border-2 border-primary text-primary py-2 rounded-lg hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                    >
                      <BookOpen className="w-4 h-4" />
                      التفاصيل
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Modules and Sessions */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                الموديولات والجلسات
              </h3>
              <div className="space-y-6">
                {group.modules.map((module) => (
                  <div key={module.moduleIndex} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                      الموديول {module.moduleNumber}
                    </h4>
                    <div className="space-y-2">
                      {module.sessions.map((session) => (
                        <Link
                          key={session.id}
                          href={`/dashboard/sessions/${session.id}`}
                          className="block p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900 dark:text-white group-hover:text-primary transition-colors mb-1">
                                {session.title}
                              </h5>
                              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <Calendar className="w-3 h-3" />
                                <span>{formatDate(session.scheduledDate)}</span>
                                <span>•</span>
                                <Clock className="w-3 h-3" />
                                <span>{session.startTime}</span>
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(session.status)}`}>
                              {getStatusText(session.status)}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Group Info */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                معلومات المجموعة
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">الكود</p>
                  <p className="font-medium text-gray-900 dark:text-white">{group.code}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">أيام الدراسة</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {getDaysInArabic(group.schedule.daysOfWeek)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">الوقت</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {group.schedule.timeFrom} - {group.schedule.timeTo}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">المدرسون</p>
                  {group.instructors.map((instructor, idx) => (
                    <p key={idx} className="font-medium text-gray-900 dark:text-white">
                      {instructor.name}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                إجراءات سريعة
              </h3>
              <div className="space-y-2">
                <Link
                  href="/dashboard/sessions"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-gray-700 dark:text-gray-300 group-hover:text-primary">جميع الجلسات</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary" />
                </Link>
                <Link
                  href="/dashboard/attendance"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-gray-700 dark:text-gray-300 group-hover:text-primary">سجل الحضور</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}