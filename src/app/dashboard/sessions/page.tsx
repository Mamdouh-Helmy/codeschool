"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Video,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Search,
  ChevronRight,
  BookOpen,
  Users,
  PlayCircle,
  Filter,
} from "lucide-react";

interface Session {
  id: string;
  title: string;
  description?: string;
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
  attendanceStatus?: string;
  instructorNotes?: string;
  group: {
    id: string;
    name: string;
    code: string;
  };
  course: {
    title: string;
  };
  metadata?: {
    createdAt: string;
    updatedAt: string;
  };
}

export default function StudentSessionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    filterSessions();
  }, [sessions, searchTerm, filterStatus, filterType]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError("");

      console.log("🔄 [Dashboard Sessions] Fetching sessions data...");
      
      // ✅ التصحيح: المسار الصحيح /api/dashboard/sessions
      const sessionsRes = await fetch(`/api/student/sessions`, {
        headers: { 
          "Content-Type": "application/json"
        },
        credentials: 'include'
      });

      const response = await sessionsRes.json();
      
      console.log("📥 [Dashboard Sessions] API Response:", {
        success: response.success,
        status: sessionsRes.status,
        count: response.data?.length
      });

      if (!sessionsRes.ok || !response.success) {
        throw new Error(response.message || "فشل في تحميل الجلسات");
      }

      setSessions(response.data || []);
      setFilteredSessions(response.data || []);

    } catch (error: any) {
      console.error("❌ [Dashboard Sessions] Error fetching sessions:", error);
      setError(error.message || "حدث خطأ أثناء تحميل الجلسات");
      
      if (error.message.includes("غير مصرح") || error.message.includes("UNAUTHORIZED")) {
        router.push("/signin");
      }
    } finally {
      setLoading(false);
    }
  };

  const filterSessions = () => {
    let filtered = [...sessions];

    // البحث
    if (searchTerm) {
      filtered = filtered.filter(
        (session) =>
          session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          session.group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          session.course.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // تصفية حسب الحالة
    if (filterStatus !== "all") {
      filtered = filtered.filter((session) => session.status === filterStatus);
    }

    // تصفية حسب النوع
    const now = new Date();
    if (filterType === "upcoming") {
      filtered = filtered.filter(
        (session) => new Date(session.scheduledDate) >= now && 
        (session.status === "scheduled" || session.status === "postponed")
      );
    } else if (filterType === "past") {
      filtered = filtered.filter(
        (session) => new Date(session.scheduledDate) < now
      );
    }

    setFilteredSessions(filtered);
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

  const getStatusBadge = (status: string) => {
    const config = {
      scheduled: {
        bg: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        text: "مجدولة",
        icon: Clock,
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

  const getAttendanceBadge = (status?: string) => {
    if (!status || status === "لم يتم التسجيل") {
      return {
        bg: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
        text: "لم يتم التسجيل",
        icon: AlertCircle,
      };
    }

    const config = {
      present: {
        bg: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        text: "حاضر",
        icon: CheckCircle,
      },
      absent: {
        bg: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        text: "غائب",
        icon: XCircle,
      },
      late: {
        bg: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
        text: "متأخر",
        icon: Clock,
      },
      excused: {
        bg: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        text: "معذور",
        icon: AlertCircle,
      },
    };

    return config[status as keyof typeof config] || config.absent;
  };

  const joinSession = (session: Session) => {
    if (session.meetingLink && session.status === 'scheduled') {
      window.open(session.meetingLink, "_blank");
    } else {
      alert("لا يوجد رابط للاجتماع متاح حالياً أو أن الجلسة لم تعد مجدولة");
    }
  };

  const getLessonsText = (lessonIndexes: number[]) => {
    if (!lessonIndexes || lessonIndexes.length === 0) return "";
    return lessonIndexes.map((idx) => `الدرس ${idx + 1}`).join(" و ");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">جاري تحميل الجلسات...</p>
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
              onClick={fetchSessions}
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                جميع الجلسات
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                تتبع جميع جلساتك ومحاضراتك
              </p>
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
        {/* فلتر وبحث */}
        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* بحث */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="ابحث عن جلسة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* تصفية حسب الحالة */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
            >
              <option value="all">جميع الحالات</option>
              <option value="scheduled">مجدولة</option>
              <option value="completed">مكتملة</option>
              <option value="cancelled">ملغاة</option>
              <option value="postponed">مؤجلة</option>
            </select>

            {/* تصفية حسب النوع */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
            >
              <option value="all">جميع الجلسات</option>
              <option value="upcoming">القادمة</option>
              <option value="past">السابقة</option>
            </select>
          </div>
        </div>

        {/* نتائج البحث */}
        <div className="mb-6 flex justify-between items-center">
          <p className="text-gray-600 dark:text-gray-300">
            عرض {filteredSessions.length} من {sessions.length} جلسة
          </p>
        </div>

        {/* قائمة الجلسات */}
        <div className="space-y-6">
          {filteredSessions.length > 0 ? (
            filteredSessions.map((session) => {
              const statusConfig = getStatusBadge(session.status);
              const StatusIcon = statusConfig.icon;
              const attendanceConfig = getAttendanceBadge(session.attendanceStatus);
              const AttendanceIcon = attendanceConfig.icon;

              return (
                <div
                  key={session.id} // ✅ التصحيح: استخدام session.id بدل session._id
                  className="bg-white dark:bg-secondary rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700"
                >
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                      <div className="flex-1">
                        {/* العنوان والحالة */}
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1 rounded-full text-sm ${statusConfig.bg}`}>
                            <StatusIcon className="inline w-4 h-4 mr-1 rtl:ml-1" />
                            {statusConfig.text}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            المجموعة: {session.group.name} ({session.group.code})
                          </span>
                        </div>

                        {/* عنوان الجلسة */}
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          {session.title}
                        </h3>

                        {/* تفاصيل الجلسة */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-300">
                              {formatDate(session.scheduledDate)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-300">
                              {session.startTime} - {session.endTime}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-300">
                              الموديول {session.moduleIndex + 1} • الجلسة {session.sessionNumber}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-300">
                              {getLessonsText(session.lessonIndexes)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* الأزرار */}
                      <div className="flex flex-col md:items-end gap-3 w-full md:w-auto">
                        {/* حالة الحضور */}
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${attendanceConfig.bg}`}>
                            <AttendanceIcon className="inline w-3 h-3 mr-1 rtl:ml-1" />
                            {attendanceConfig.text}
                          </span>
                        </div>

                        {/* أزرار الإجراءات */}
                        <div className="flex gap-2">
                          {session.status === "scheduled" && session.meetingLink && (
                            <button
                              onClick={() => joinSession(session)}
                              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                            >
                              <Video className="w-4 h-4" />
                              <span className="text-sm">انضم الآن</span>
                            </button>
                          )}

                          {session.status === "completed" && session.recordingLink && (
                            <button
                              onClick={() => window.open(session.recordingLink, "_blank")}
                              className="flex items-center justify-center gap-2 px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                            >
                              <PlayCircle className="w-4 h-4" />
                              <span className="text-sm">شاهد التسجيل</span>
                            </button>
                          )}

                          <Link
                            href={`/dashboard/sessions/${session.id}`} // ✅ التصحيح: المسار الصحيح
                            className="flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                          >
                            <span>التفاصيل</span>
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* وصف الجلسة */}
                    {session.description && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {session.description}
                        </p>
                      </div>
                    )}

                    {/* ملاحظات المدرس */}
                    {session.instructorNotes && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium text-gray-800 dark:text-gray-300">ملاحظات المدرس:</span> {session.instructorNotes}
                        </p>
                      </div>
                    )}
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
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm || filterStatus !== "all" || filterType !== "all"
                  ? "لا توجد نتائج مطابقة للبحث"
                  : "لم يتم العثور على أي جلسات"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}