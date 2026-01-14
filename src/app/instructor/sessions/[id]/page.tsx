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
  BarChart3,
  BookOpen,
  GraduationCap,
  MessageSquare,
  Edit,
  RefreshCw,
  AlertTriangle,
  MoreVertical,
  Copy,
  ExternalLink,
  FileText,
  UserCheck,
  X,
  Save,
  Globe,
  Send,
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
    automation?: {
      whatsappEnabled: boolean;
      notifyGuardianOnAbsence: boolean;
      notifyOnSessionUpdate: boolean;
    };
  };
  courseId: {
    _id: string;
    title: string;
    level: string;
  };
  attendance?: Array<{
    _id: string;
    studentId: {
      _id: string;
      personalInfo: {
        fullName: string;
        email?: string;
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
  permissions?: {
    canEdit: boolean;
    canCancel: boolean;
    canPostpone: boolean;
    canTakeAttendance: boolean;
    canDelete: boolean;
  };
  automation?: {
    whatsappEnabled: boolean;
    notifyGuardianOnAbsence: boolean;
    notifyOnSessionUpdate: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface SessionResponse {
  success: boolean;
  data: {
    session: Session;
    studentAttendance: Array<{
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
    }>;
    attendanceStats: {
      total: number;
      present: number;
      absent: number;
      late: number;
      excused: number;
      pending: number;
    };
    navigation: {
      previousSessions: Array<{
        _id: string;
        title: string;
        scheduledDate: string;
        status: string;
      }>;
      nextSessions: Array<{
        _id: string;
        title: string;
        scheduledDate: string;
        status: string;
      }>;
    };
    permissions: {
      canTakeAttendance: boolean;
      canEdit: boolean;
      canCancel: boolean;
      canPostpone: boolean;
    };
  };
  error?: string;
}

export default function SessionDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [studentAttendance, setStudentAttendance] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<any>(null);
  const [navigation, setNavigation] = useState<any>(null);
  const [permissions, setPermissions] = useState<any>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  
  const [editForm, setEditForm] = useState({
    meetingLink: '',
    recordingLink: '',
    instructorNotes: '',
    customMessage: '',
    processedMessage: '',
  });
  
  const [selectedAction, setSelectedAction] = useState<'cancel' | 'postpone' | 'complete' | 'scheduled' | ''>('');

  useEffect(() => {
    if (sessionId) {
      fetchSessionDetails();
    }
  }, [sessionId]);

  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");

      console.log("🔄 [Session Details] Fetching session details...");

      const sessionRes = await fetch(`/api/instructor-dashboard/sessions/${sessionId}`, {
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const response: SessionResponse = await sessionRes.json();

      console.log("📥 [Session Details] API Response:", {
        success: response.success,
        status: sessionRes.status,
      });

      if (!sessionRes.ok || !response.success) {
        throw new Error(response.error || response.data?.session?.error || "فشل في تحميل تفاصيل الجلسة");
      }

      if (!response.data) {
        throw new Error("لا توجد بيانات في الاستجابة");
      }

      setSession(response.data.session);
      setStudentAttendance(response.data.studentAttendance || []);
      setAttendanceStats(response.data.attendanceStats || {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        pending: 0
      });
      setNavigation(response.data.navigation || {
        previousSessions: [],
        nextSessions: []
      });
      setPermissions(response.data.permissions || {
        canTakeAttendance: false,
        canEdit: false,
        canCancel: false,
        canPostpone: false
      });

      if (response.data.session) {
        setEditForm({
          meetingLink: response.data.session.meetingLink || '',
          recordingLink: response.data.session.recordingLink || '',
          instructorNotes: response.data.session.instructorNotes || '',
          customMessage: '',
          processedMessage: '',
        });
      }

    } catch (error: any) {
      console.error("❌ [Session Details] Error fetching session:", error);
      setError(error.message || "حدث خطأ أثناء تحميل تفاصيل الجلسة");

      if (error.message.includes("غير مصرح") || error.message.includes("UNAUTHORIZED")) {
        router.push("/signin");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMeeting = () => {
    if (session?.meetingLink && session.status === "scheduled") {
      window.open(session.meetingLink, "_blank");
    } else {
      alert("لا يوجد رابط للاجتماع متاح حالياً أو أن الجلسة لم تعد مجدولة");
    }
  };

  const handleWatchRecording = () => {
    if (session?.recordingLink) {
      window.open(session.recordingLink, "_blank");
    } else {
      alert("لا يوجد تسجيل متاح لهذه الجلسة");
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    alert("تم نسخ الرابط إلى الحافظة");
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

  const getStatusConfig = (status: string) => {
    const config = {
      scheduled: {
        bg: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        text: "مجدولة",
        icon: Calendar,
        color: "blue",
      },
      completed: {
        bg: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        text: "مكتملة",
        icon: CheckCircle,
        color: "green",
      },
      cancelled: {
        bg: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        text: "ملغاة",
        icon: XCircle,
        color: "red",
      },
      postponed: {
        bg: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
        text: "مؤجلة",
        icon: AlertCircle,
        color: "yellow",
      },
    };

    return config[status as keyof typeof config] || config.scheduled;
  };

  const getAttendanceStatusConfig = (status: string) => {
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
        icon: AlertCircle,
      },
      excused: {
        bg: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        text: "معذور",
        icon: AlertTriangle,
      },
      pending: {
        bg: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
        text: "بانتظار",
        icon: Clock,
      },
    };

    return config[status as keyof typeof config] || config.pending;
  };

  const getLessonsText = (lessonIndexes: number[]) => {
    if (!lessonIndexes || lessonIndexes.length === 0) return "لا توجد دروس";
    
    const lessons = lessonIndexes.map(index => `الدرس ${index + 1}`);
    return lessons.join("، ");
  };

  const calculateAttendancePercentage = () => {
    if (!attendanceStats || attendanceStats.total === 0) return 0;
    return Math.round((attendanceStats.present / attendanceStats.total) * 100);
  };

  const processMessageVariables = (message: string) => {
    if (!session) return message;
    
    const sessionDate = new Date(session.scheduledDate);
    const formattedDate = sessionDate.toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return message
      .replace(/\{studentName\}/g, 'الطالب')
      .replace(/\{sessionTitle\}/g, session.title)
      .replace(/\{sessionDate\}/g, formattedDate)
      .replace(/\{startTime\}/g, session.startTime)
      .replace(/\{endTime\}/g, session.endTime)
      .replace(/\{groupName\}/g, session.groupId.name)
      .replace(/\{groupCode\}/g, session.groupId.code)
      .replace(/\{courseName\}/g, session.courseId?.title || '');
  };

  const handleUpdateSession = async () => {
    try {
      setUpdating(true);
      setError("");
      setSuccessMessage("");

      let processedMessage = '';
      if ((selectedAction === 'cancel' || selectedAction === 'postpone' || selectedAction === 'scheduled') && editForm.customMessage) {
        processedMessage = processMessageVariables(editForm.customMessage);
      }

      let newStatus = session?.status;
      if (selectedAction === 'cancel') newStatus = 'cancelled';
      if (selectedAction === 'postpone') newStatus = 'postponed';
      if (selectedAction === 'complete') newStatus = 'completed';
      if (selectedAction === 'scheduled') newStatus = 'scheduled';

      const response = await fetch(`/api/instructor-dashboard/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          meetingLink: editForm.meetingLink,
          recordingLink: editForm.recordingLink,
          instructorNotes: editForm.instructorNotes,
          status: newStatus,
          customMessage: editForm.customMessage || undefined,
          processedMessage: processedMessage || undefined
        })
      });

      const result = await response.json();

      console.log("📥 [Update Session] Response:", {
        success: result.success,
        status: response.status,
        automation: result.automation
      });

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'فشل في تحديث الجلسة');
      }

      setSuccessMessage(result.message || 'تم تحديث الجلسة بنجاح');
      
      fetchSessionDetails();
      
      setShowEditModal(false);
      setShowStatusModal(false);
      setSelectedAction('');
      
    } catch (error: any) {
      console.error("❌ [Update Session] Error:", error);
      setError(error.message || 'حدث خطأ أثناء تحديث الجلسة');
    } finally {
      setUpdating(false);
    }
  };

  const openEditModal = () => {
    if (!session) return;
    
    setEditForm({
      meetingLink: session.meetingLink || '',
      recordingLink: session.recordingLink || '',
      instructorNotes: session.instructorNotes || '',
      customMessage: '',
      processedMessage: '',
    });
    
    setSelectedAction('');
    setShowEditModal(true);
  };

  const getStatusChangeButtons = () => {
    if (!session) return [];
    
    const buttons = [
      {
        id: 'scheduled',
        label: 'جدولة',
        icon: Calendar,
        bgColor: 'bg-blue-600',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200 dark:border-blue-800',
        hoverColor: 'hover:bg-blue-50 dark:hover:bg-blue-900/20',
        disabled: session.status === 'scheduled' || session.status === 'completed'
      },
      {
        id: 'complete',
        label: 'إكمال',
        icon: CheckCircle,
        bgColor: 'bg-green-600',
        textColor: 'text-green-700',
        borderColor: 'border-green-200 dark:border-green-800',
        hoverColor: 'hover:bg-green-50 dark:hover:bg-green-900/20',
        disabled: session.status === 'completed'
      },
      {
        id: 'cancel',
        label: 'إلغاء',
        icon: XCircle,
        bgColor: 'bg-red-600',
        textColor: 'text-red-700',
        borderColor: 'border-red-200 dark:border-red-800',
        hoverColor: 'hover:bg-red-50 dark:hover:bg-red-900/20',
        disabled: session.status === 'cancelled' || session.status === 'completed'
      },
      {
        id: 'postpone',
        label: 'تأجيل',
        icon: AlertCircle,
        bgColor: 'bg-yellow-600',
        textColor: 'text-yellow-700',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        hoverColor: 'hover:bg-yellow-50 dark:hover:bg-yellow-900/20',
        disabled: session.status === 'postponed' || session.status === 'completed'
      }
    ];
    
    return buttons;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            جاري تحميل تفاصيل الجلسة...
          </p>
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
            حدث خطأ
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {error || "لم يتم العثور على الجلسة"}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={fetchSessionDetails}
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

  const statusConfig = getStatusConfig(session.status);
  const StatusIcon = statusConfig.icon;
  const statusButtons = getStatusChangeButtons();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkmode">
      {/* Header */}
      <div className="bg-white dark:bg-secondary shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/instructor/sessions"
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  تفاصيل الجلسة
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  {session.title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={fetchSessionDetails}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                title="تحديث"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <Link
                href="/instructor/sessions"
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                جميع الجلسات
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* رسائل النجاح */}
      {successMessage && (
        <div className="container mx-auto px-4 py-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-green-800 dark:text-green-300">{successMessage}</span>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* الجانب الأيسر */}
          <div className="lg:col-span-2 space-y-6">
            {/* بطاقة الجلسة الرئيسية */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              {/* العنوان والحالة */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {session.title}
                  </h2>
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
                      {session.groupId?.name}
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
                  <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* الوصف */}
              {session.description && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    وصف الجلسة
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {session.description}
                  </p>
                </div>
              )}

              {/* معلومات الجلسة */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">الوحدة</p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {session.moduleIndex + 1}
                  </p>
                </div>

                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <GraduationCap className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">رقم الحصة</p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {session.sessionNumber}
                  </p>
                </div>

                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">الدروس</p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {session.lessonIndexes.length}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {getLessonsText(session.lessonIndexes)}
                  </p>
                </div>

                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">الحالة</p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {statusConfig.text}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {session.attendanceTaken ? "تم التسجيل" : "لم يتم التسجيل"}
                  </p>
                </div>
              </div>

              {/* الروابط */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {session.meetingLink && (
                  <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Video className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h4 className="font-medium text-blue-800 dark:text-blue-300">
                        رابط الاجتماع
                      </h4>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={session.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>انضم الآن</span>
                      </a>
                      <button
                        onClick={() => handleCopyLink(session.meetingLink)}
                        className="px-3 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {session.recordingLink && (
                  <div className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Video className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <h4 className="font-medium text-green-800 dark:text-green-300">
                        رابط التسجيل
                      </h4>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={session.recordingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>شاهد التسجيل</span>
                      </a>
                      <button
                        onClick={() => handleCopyLink(session.recordingLink)}
                        className="px-3 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ملاحظات المدرس */}
              {session.instructorNotes && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-5 h-5 text-gray-400" />
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      ملاحظات المدرس
                    </h4>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {session.instructorNotes}
                  </p>
                </div>
              )}
            </div>

            {/* إحصائيات الحضور */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    إحصائيات الحضور
                  </h3>
                </div>
                {permissions?.canTakeAttendance && !session.attendanceTaken && (
                  <Link
                    href={`/instructor/sessions/${session._id}/attendance`}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>تسجيل الحضور</span>
                  </Link>
                )}
                {session.attendanceTaken && (
                  <Link
                    href={`/instructor/sessions/${session._id}/attendance`}
                    className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>عرض التفاصيل</span>
                  </Link>
                )}
              </div>

              {attendanceStats ? (
                <div className="space-y-6">
                  {/* النسب المئوية */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="text-2xl font-bold text-green-700 dark:text-green-400 mb-1">
                        {attendanceStats.present}
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
                        {attendanceStats.absent}
                      </div>
                      <div className="text-sm text-red-600 dark:text-red-300">
                        غائب
                      </div>
                    </div>

                    <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400 mb-1">
                        {attendanceStats.late}
                      </div>
                      <div className="text-sm text-yellow-600 dark:text-yellow-300">
                        متأخر
                      </div>
                    </div>

                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-1">
                        {attendanceStats.excused}
                      </div>
                      <div className="text-sm text-blue-600 dark:text-blue-300">
                        معذور
                      </div>
                    </div>

                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-1">
                        {attendanceStats.total}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        إجمالي
                      </div>
                    </div>
                  </div>

                  {/* Progress Bars */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">الحاضرين</span>
                        <span className="text-green-600 dark:text-green-400">
                          {attendanceStats.present} ({calculateAttendancePercentage()}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${calculateAttendancePercentage()}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">الغائبين</span>
                        <span className="text-red-600 dark:text-red-400">
                          {attendanceStats.absent} ({Math.round((attendanceStats.absent / attendanceStats.total) * 100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-red-600 h-2 rounded-full"
                          style={{ width: `${(attendanceStats.absent / attendanceStats.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* قائمة الطلاب */}
                  {studentAttendance.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                        قائمة الطلاب ({studentAttendance.length})
                      </h4>
                      <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                                اسم الطالب
                              </th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                                حالة الحضور
                              </th>
                              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                                ملاحظات
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {studentAttendance.map((student) => {
                              const attendanceConfig = getAttendanceStatusConfig(student.attendance.status);
                              const AttendanceIcon = attendanceConfig.icon;

                              return (
                                <tr key={student.studentId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
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
                                    <div className="flex justify-center">
                                      <span
                                        className={`px-2 py-1 rounded-full text-xs ${attendanceConfig.bg} flex items-center gap-1`}
                                      >
                                        <AttendanceIcon className="w-3 h-3" />
                                        {attendanceConfig.text}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      {student.attendance.notes || "لا توجد ملاحظات"}
                                    </p>
                                    {student.attendance.markedAt && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {formatDate(student.attendance.markedAt)}
                                      </p>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {session.attendanceTaken 
                      ? "لا توجد بيانات حضور متاحة" 
                      : "لم يتم تسجيل الحضور بعد"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* الجانب الأيمن */}
          <div className="space-y-6">
            {/* معلومات المجموعة */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  معلومات المجموعة
                </h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">اسم المجموعة</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {session.groupId?.name}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">كود المجموعة</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {session.groupId?.code}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">الدورة</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {session.courseId?.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    مستوى: {session.courseId?.level}
                  </p>
                </div>

                {session.groupId?.automation && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      إعدادات الأوتوميشن
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">الواتساب</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${session.groupId.automation.whatsappEnabled ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                          {session.groupId.automation.whatsappEnabled ? "مفعل" : "معطل"}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">إشعارات أولياء الأمور</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${session.groupId.automation.notifyGuardianOnAbsence ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                          {session.groupId.automation.notifyGuardianOnAbsence ? "مفعل" : "معطل"}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">إشعارات التحديث</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${session.groupId.automation.notifyOnSessionUpdate ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                          {session.groupId.automation.notifyOnSessionUpdate ? "مفعل" : "معطل"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* الملاحة */}
            {(navigation?.previousSessions?.length > 0 || navigation?.nextSessions?.length > 0) && (
              <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    الملاحة بين الجلسات
                  </h3>
                </div>
                
                <div className="space-y-4">
                  {navigation.previousSessions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        الجلسات السابقة
                      </h4>
                      <div className="space-y-2">
                        {navigation.previousSessions.map((prevSession: any) => (
                          <Link
                            key={prevSession._id}
                            href={`/instructor/sessions/${prevSession._id}`}
                            className="block border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                          >
                            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                              {prevSession.title}
                            </p>
                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                              <span>{formatDate(prevSession.scheduledDate)}</span>
                              <span className={`px-2 py-1 rounded-full ${getStatusConfig(prevSession.status).bg}`}>
                                {getStatusConfig(prevSession.status).text}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {navigation.nextSessions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        الجلسات القادمة
                      </h4>
                      <div className="space-y-2">
                        {navigation.nextSessions.map((nextSession: any) => (
                          <Link
                            key={nextSession._id}
                            href={`/instructor/sessions/${nextSession._id}`}
                            className="block border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                          >
                            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                              {nextSession.title}
                            </p>
                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                              <span>{formatDate(nextSession.scheduledDate)}</span>
                              <span className={`px-2 py-1 rounded-full ${getStatusConfig(nextSession.status).bg}`}>
                                {getStatusConfig(nextSession.status).text}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* الإجراءات */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <Edit className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  الإجراءات
                </h3>
              </div>
              
              <div className="space-y-2">
                {permissions?.canEdit && (
                  <button
                    onClick={openEditModal}
                    className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span>تعديل الجلسة</span>
                  </button>
                )}
                
                
                  <Link
                    href={`/instructor/sessions/${session._id}/attendance`}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>تسجيل الحضور</span>
                  </Link>
                
                
                {session.attendanceTaken && (
                  <Link
                    href={`/instructor/sessions/${session._id}/attendance`}
                    className="w-full px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>عرض الحضور</span>
                  </Link>
                )}
                
                {session.meetingLink && session.status === "scheduled" && (
                  <button
                    onClick={handleJoinMeeting}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Video className="w-4 h-4" />
                    <span>انضم للاجتماع</span>
                  </button>
                )}
                
                {session.recordingLink && (
                  <button
                    onClick={handleWatchRecording}
                    className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <Video className="w-4 h-4" />
                    <span>شاهد التسجيل</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* مودال تعديل الجلسة */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-secondary rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-secondary border-b border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Edit className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    تعديل الجلسة
                  </h3>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {session.title}
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* معلومات الأساسية */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    رابط الاجتماع
                  </label>
                  <input
                    type="url"
                    value={editForm.meetingLink}
                    onChange={(e) => setEditForm({...editForm, meetingLink: e.target.value})}
                    placeholder="https://meet.google.com/..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    ستتم مشاركته مع الطلاب عبر الواتساب
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    رابط التسجيل
                  </label>
                  <input
                    type="url"
                    value={editForm.recordingLink}
                    onChange={(e) => setEditForm({...editForm, recordingLink: e.target.value})}
                    placeholder="https://youtube.com/..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    يتم إضافته بعد انتهاء الجلسة
                  </p>
                </div>
              </div>

              {/* ملاحظات المدرس */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ملاحظات المدرس
                </label>
                <textarea
                  value={editForm.instructorNotes}
                  onChange={(e) => setEditForm({...editForm, instructorNotes: e.target.value})}
                  placeholder="اكتب ملاحظاتك حول الجلسة..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* تغيير حالة الجلسة */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  تغيير حالة الجلسة
                </h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {statusButtons.map((button) => {
                    const ButtonIcon = button.icon;
                    return (
                      <button
                        key={button.id}
                        onClick={() => {
                          if (['cancel', 'postpone', 'scheduled'].includes(button.id)) {
                            setSelectedAction(button.id as any);
                            setShowStatusModal(true);
                          } else if (button.id === 'complete') {
                            setSelectedAction('complete');
                            handleUpdateSession();
                          }
                        }}
                        disabled={button.disabled}
                        className={`p-4 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${button.disabled 
                          ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600' 
                          : `${button.hoverColor} ${button.borderColor}`}`}
                      >
                        <ButtonIcon className={`w-6 h-6 ${button.disabled ? 'text-gray-400' : button.textColor}`} />
                        <span className={`font-medium ${button.disabled ? 'text-gray-500' : button.textColor}`}>
                          {button.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                
                <div className="mt-6">
                  <button
                    onClick={() => {
                      setSelectedAction('');
                      handleUpdateSession();
                    }}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    <span>حفظ التعديلات دون تغيير الحالة</span>
                  </button>
                </div>
              </div>

              {/* معلومات الأوتوميشن */}
              {session.groupId.automation?.whatsappEnabled && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h5 className="font-medium text-blue-800 dark:text-blue-300">
                      إعدادات الأوتوميشن
                    </h5>
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                    <p>✓ إشعارات الواتساب مفعلة</p>
                    <p>✓ سيتم إرسال إشعارات تلقائية للطلاب</p>
                    {selectedAction === 'cancel' || selectedAction === 'postpone' || selectedAction === 'scheduled' ? (
                      <p className="font-medium mt-2">
                        📝 يمكنك إضافة رسالة مخصصة في النافذة التالية
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-secondary border-t border-gray-200 dark:border-gray-700 p-6">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleUpdateSession}
                  disabled={updating}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {updating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>حفظ التغييرات</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* مودال تغيير حالة الجلسة مع رسالة مخصصة */}
      {showStatusModal && selectedAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-secondary rounded-xl shadow-xl max-w-lg w-full">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-secondary border-b border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedAction === 'cancel' ? (
                    <XCircle className="w-6 h-6 text-red-600" />
                  ) : selectedAction === 'postpone' ? (
                    <AlertCircle className="w-6 h-6 text-yellow-600" />
                  ) : (
                    <Calendar className="w-6 h-6 text-blue-600" />
                  )}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedAction === 'cancel' ? 'إلغاء الجلسة' : 
                     selectedAction === 'postpone' ? 'تأجيل الجلسة' : 
                     'جدولة الجلسة'}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setSelectedAction('');
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {selectedAction === 'cancel' 
                  ? 'ستتم إزالة الجلسة من الجدول وإعلام الطلاب'
                  : selectedAction === 'postpone'
                  ? 'سيتم تأجيل الجلسة إلى وقت آخر وإعلام الطلاب'
                  : 'ستتم إعادة جدولة الجلسة وإعلام الطلاب'}
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* الرسالة المخصصة */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  رسالة مخصصة للطلاب
                </label>
                <textarea
                  value={editForm.customMessage}
                  onChange={(e) => setEditForm({...editForm, customMessage: e.target.value})}
                  placeholder={selectedAction === 'cancel' 
                    ? `عزيزي الطالب، نود إعلامك بأن حصة ${session.title} قد تم إلغاؤها. سيتم إعلامكم بالجلسة البديلة قريباً.` 
                    : selectedAction === 'postpone'
                    ? `عزيزي الطالب، نود إعلامك بأن حصة ${session.title} قد تم تأجيلها. سيتم إعلامكم بالموعد الجديد قريباً.`
                    : `عزيزي الطالب، نود إعلامك بأن حصة ${session.title} قد تم جدولتها. نرجو الحضور في الموعد المحدد.`}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  يمكنك استخدام المتغيرات: {`{studentName}, {sessionTitle}, {sessionDate}, {startTime}, {endTime}, {groupName}, {groupCode}, {courseName}`}
                </p>
              </div>

              {/* معاينة الرسالة */}
              {editForm.customMessage && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-5 h-5 text-gray-400" />
                    <h5 className="font-medium text-gray-700 dark:text-gray-300">
                      معاينة الرسالة
                    </h5>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                    {processMessageVariables(editForm.customMessage)}
                  </p>
                </div>
              )}

              {/* معلومات الأوتوميشن */}
              {session.groupId.automation?.whatsappEnabled && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Send className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <h5 className="font-medium text-green-800 dark:text-green-300">
                      إشعارات الواتساب
                    </h5>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    سيتم إرسال هذه الرسالة تلقائياً إلى جميع الطلاب عبر الواتساب
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-secondary border-t border-gray-200 dark:border-gray-700 p-6">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setSelectedAction('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleUpdateSession}
                  disabled={updating}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {updating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : selectedAction === 'cancel' ? (
                    <XCircle className="w-4 h-4" />
                  ) : selectedAction === 'postpone' ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <Calendar className="w-4 h-4" />
                  )}
                  <span>
                    {selectedAction === 'cancel' ? 'تأكيد الإلغاء' : 
                     selectedAction === 'postpone' ? 'تأكيد التأجيل' : 
                     'تأكيد الجدولة'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}