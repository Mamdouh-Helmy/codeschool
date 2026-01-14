"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Video,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Users,
  MessageSquare,
  PlayCircle,
  FileText,
} from "lucide-react";

// تعريف الأنواط
interface SessionDetail {
  id: string;
  title: string;
  description: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: "scheduled" | "completed" | "cancelled" | "postponed";
  meetingLink?: string;
  recordingLink?: string;
  moduleIndex: number;
  sessionNumber: number;
  lessonIndexes: number[];
  attendanceTaken: boolean;
  attendanceRecord?: {
    status: string;
    notes?: string;
    markedAt?: string;
  };
  instructorNotes?: string;
  group: {
    id: string;
    name: string;
    code: string;
  };
  course: {
    title: string;
  };
  navigation?: {
    previous?: {
      id: string;
      title: string;
      date: string;
      time: string;
      status: string;
    };
    next?: {
      id: string;
      title: string;
      date: string;
      time: string;
      status: string;
    };
  };
  whatsappMessages?: Array<{
    id: string;
    type: string;
    content: string;
    status: string;
    sentAt: string;
    language: string;
  }>;
  metadata?: {
    createdAt: string;
    updatedAt: string;
  };
}

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (sessionId) {
      fetchSessionDetail();
    }
  }, [sessionId]);

  const fetchSessionDetail = async (): Promise<void> => {
    try {
      setLoading(true);
      setError("");

      console.log("🔄 [Session Detail] Fetching session data...");
      
      const sessionRes = await fetch(`/api/student/sessions/${sessionId}`, {
        headers: { 
          "Content-Type": "application/json"
        },
        credentials: 'include'
      });

      const response = await sessionRes.json();
      
      console.log("📥 [Session Detail] API Response:", {
        success: response.success,
        status: sessionRes.status,
        data: response.data ? "found" : "not found"
      });

      if (!sessionRes.ok || !response.success) {
        throw new Error(response.message || "فشل في تحميل تفاصيل الجلسة");
      }

      setSession(response.data);

    } catch (error: any) {
      console.error("❌ [Session Detail] Error fetching session:", error);
      setError(error.message || "حدث خطأ أثناء تحميل تفاصيل الجلسة");
      
      if (error.message.includes("غير مصرح") || error.message.includes("UNAUTHORIZED")) {
        router.push("/signin");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
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

  const getStatusColor = (status: string): string => {
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

  const getStatusText = (status: string): string => {
    switch (status) {
      case "scheduled": return "مجدولة";
      case "completed": return "مكتملة";
      case "cancelled": return "ملغاة";
      case "postponed": return "مؤجلة";
      default: return status;
    }
  };

  const getAttendanceColor = (status?: string): string => {
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

  const getAttendanceText = (status?: string): string => {
    switch (status) {
      case "present": return "حاضر";
      case "absent": return "غائب";
      case "late": return "متأخر";
      case "excused": return "معذور";
      default: return "لم يتم التسجيل";
    }
  };

  const getAttendanceIcon = (status?: string): React.ComponentType<{ className?: string }> => {
    switch (status) {
      case "present": return CheckCircle;
      case "absent": return XCircle;
      case "late": return Clock;
      case "excused": return AlertCircle;
      default: return AlertCircle;
    }
  };

  const getLessonsText = (lessonIndexes: number[]): string => {
    if (!lessonIndexes || lessonIndexes.length === 0) return "";
    return lessonIndexes.map(idx => `الدرس ${idx + 1}`).join(" و ");
  };

  const joinSession = (): void => {
    if (session?.meetingLink && session?.status === 'scheduled') {
      window.open(session.meetingLink, "_blank");
    } else {
      alert("لا يوجد رابط للاجتماع متاح حالياً أو أن الجلسة لم تعد مجدولة");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">جاري تحميل تفاصيل الجلسة...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {error ? "حدث خطأ" : "الجلسة غير موجودة"}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {error || "لم يتم العثور على الجلسة المطلوبة"}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={fetchSessionDetail}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              حاول مرة أخرى
            </button>
            <button
              onClick={() => router.push("/dashboard/sessions")}
              className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
            >
              جميع الجلسات
            </button>
          </div>
        </div>
      </div>
    );
  }

  const AttendanceIcon = getAttendanceIcon(session.attendanceRecord?.status);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkmode">
      {/* Header */}
      <div className="bg-white dark:bg-secondary shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/sessions"
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  تفاصيل الجلسة
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  {session.group.name} • {session.course.title}
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* الجانب الأيسر */}
          <div className="lg:col-span-2 space-y-6">
            {/* العنوان والحالة */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {session.title}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(session.status)}`}>
                      {getStatusText(session.status)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      الموديول {session.moduleIndex + 1} • الجلسة {session.sessionNumber}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  {session.status === "scheduled" && session.meetingLink && (
                    <button
                      onClick={joinSession}
                      className="px-4 py-2 bg-gradient-to-r from-primary to-purple-600 text-white rounded-lg hover:opacity-90 transition-all flex items-center gap-2"
                    >
                      <Video className="w-4 h-4" />
                      <span>انضم للجلسة</span>
                    </button>
                  )}
                  
                  {session.status === "completed" && session.recordingLink && (
                    <button
                      onClick={() => window.open(session.recordingLink, "_blank")}
                      className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:opacity-90 transition-all flex items-center gap-2"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>شاهد التسجيل</span>
                    </button>
                  )}
                </div>
              </div>

              {/* التفاصيل الرئيسية */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">التاريخ</span>
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatDate(session.scheduledDate)}
                  </p>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">الوقت</span>
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {session.startTime} - {session.endTime}
                  </p>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">الدروس</span>
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {getLessonsText(session.lessonIndexes)}
                  </p>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">المجموعة</span>
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {session.group.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {session.group.code}
                  </p>
                </div>
              </div>

              {/* وصف الجلسة */}
              {session.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    وصف الجلسة
                  </h3>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                      {session.description}
                    </p>
                  </div>
                </div>
              )}

              {/* حالة الحضور */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  حالة الحضور
                </h3>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getAttendanceColor(session.attendanceRecord?.status)}`}>
                        <AttendanceIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {getAttendanceText(session.attendanceRecord?.status)}
                        </p>
                        {session.attendanceRecord?.markedAt && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            سجل في: {formatTime(session.attendanceRecord.markedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {session.attendanceRecord?.notes && (
                      <div className="text-right">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">ملاحظات:</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {session.attendanceRecord.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ملاحظات المدرس */}
              {session.instructorNotes && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    ملاحظات المدرس
                  </h3>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                        {session.instructorNotes}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* رسائل الواتساب */}
            {session.whatsappMessages && session.whatsappMessages.length > 0 && (
              <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  رسائل التذكير
                </h3>
                <div className="space-y-4">
                  {session.whatsappMessages.map((message) => (
                    <div
                      key={message.id}
                      className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {message.type === 'session_reminder' ? 'تذكير جلسة' :
                             message.type === 'absence_notification' ? 'تنبيه غياب' :
                             message.type === 'session_cancelled' ? 'إلغاء جلسة' :
                             message.type === 'session_postponed' ? 'تأجيل جلسة' : 'رسالة'}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            message.status === 'sent' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : message.status === 'failed'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          }`}>
                            {message.status === 'sent' ? 'مرسل' : 'فشل'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(message.sentAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {message.content}
                      </p>
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        اللغة: {message.language === 'ar' ? 'العربية' : 'الإنجليزية'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* الجانب الأيمن */}
          <div className="space-y-6">
            {/* التنقل بين الجلسات */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                التنقل بين الجلسات
              </h3>
              
              <div className="space-y-4">
                {session.navigation?.previous && (
                  <Link
                    href={`/dashboard/sessions/${session.navigation.previous.id}`}
                    className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">السابقة</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(session.navigation.previous.status)}`}>
                        {getStatusText(session.navigation.previous.status)}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-primary transition-colors mb-1">
                      {session.navigation.previous.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(session.navigation.previous.date)}</span>
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      <span>{session.navigation.previous.time}</span>
                    </div>
                  </Link>
                )}

                {session.navigation?.next && (
                  <Link
                    href={`/dashboard/sessions/${session.navigation.next.id}`}
                    className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">التالية</span>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(session.navigation.next.status)}`}>
                        {getStatusText(session.navigation.next.status)}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-primary transition-colors mb-1">
                      {session.navigation.next.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(session.navigation.next.date)}</span>
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      <span>{session.navigation.next.time}</span>
                    </div>
                  </Link>
                )}

                {!session.navigation?.previous && !session.navigation?.next && (
                  <div className="text-center py-4">
                    <Calendar className="w-8 h-8 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      لا توجد جلسات أخرى في هذه المجموعة
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* معلومات المجموعة */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                معلومات المجموعة
              </h3>
              
              <div className="space-y-3">
                <Link
                  href={`/dashboard/groups/${session.group.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                        {session.group.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {session.group.code}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                </Link>
                
                <Link
                  href="/dashboard/sessions"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">
                      جميع جلسات المجموعة
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                </Link>
                
                <Link
                  href="/dashboard/attendance"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">
                      سجل الحضور الكامل
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                </Link>
              </div>
            </div>

            {/* روابط سريعة */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                روابط سريعة
              </h3>
              
              <div className="space-y-2">
                {session.meetingLink && session.status === "scheduled" && (
                  <button
                    onClick={joinSession}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
                  >
                    <span>انضم للجلسة الآن</span>
                    <Video className="w-4 h-4" />
                  </button>
                )}
                
                {session.recordingLink && session.status === "completed" && (
                  <button
                    onClick={() => window.open(session.recordingLink, "_blank")}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    <span>شاهد تسجيل الجلسة</span>
                    <PlayCircle className="w-4 h-4" />
                  </button>
                )}
                
                <button
                  onClick={() => router.push("/dashboard/sessions")}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-primary text-primary hover:bg-primary/5 transition-colors"
                >
                  <span>العودة لجميع الجلسات</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}