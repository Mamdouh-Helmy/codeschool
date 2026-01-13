"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Calendar,
  Clock,
  Users,
  BookOpen,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  Filter,
  Search,
  RefreshCw,
  PlayCircle,
  VideoIcon,
  ClipboardCheck,
  Link2,
  FileText,
  X,
  Save,
  UserCheck,
  UserX,
  Info,
  Mail,
  Phone,
  Hash,
  MessageCircle,
  Copy
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";

export default function SessionsAdmin() {
  const { t, language } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get('groupId');

  const [sessions, setSessions] = useState([]);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    upcoming: false,
    past: false
  });

  // Modal states
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [studentsModalOpen, setStudentsModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [groupStudents, setGroupStudents] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [savingSession, setSavingSession] = useState(false);

  const isRTL = language === "ar";

  const loadSessions = async () => {
    if (!groupId) return;

    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        ...(filters.status && { status: filters.status }),
        ...(filters.upcoming && { upcoming: 'true' }),
        ...(filters.past && { past: 'true' })
      });

      const res = await fetch(`/api/groups/${groupId}/sessions?${queryParams}`, {
        cache: "no-store"
      });

      const json = await res.json();

      if (json.success) {
        setSessions(json.data || []);
        setGroup(json.group);
      } else {
        toast.error(json.error || t("sessions.errors.loadFailed"));
      }
    } catch (err) {
      console.error("Error loading sessions:", err);
      toast.error(t("sessions.errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const loadGroupStudents = async () => {
    if (!groupId) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/students`, {
        cache: "no-store"
      });
      const json = await res.json();

      if (json.success && json.data) {
        let students = [];

        if (json.data.students && Array.isArray(json.data.students)) {
          students = json.data.students;
        }
        else if (json.data.populatedStudents && Array.isArray(json.data.populatedStudents)) {
          students = json.data.populatedStudents;
        }
        else if (json.data && Array.isArray(json.data)) {
          students = json.data;
        }

        students = students.filter(s => s !== null && s !== undefined);

        students = students.map(student => {
          if (!student._id && student.id) {
            student._id = student.id;
          }
          if (!student.personalInfo && student.fullName) {
            student.personalInfo = {
              fullName: student.fullName,
              email: student.email,
              phone: student.phone,
              enrollmentNumber: student.enrollmentNumber
            };
          }
          return student;
        });

        setGroupStudents(students);
      } else {
        setGroupStudents([]);
      }
    } catch (err) {
      console.error("❌ Error loading group students:", err);
      setGroupStudents([]);
    }
  };

  useEffect(() => {
    loadSessions();
    loadGroupStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, filters.status, filters.upcoming, filters.past]);

  // ================================================================
  // ✅ NEW: Auto Group Completion Functions
  // ================================================================

  /**
   * ✅ Check and auto-complete group when last session is completed
   */
  const checkAndCompleteGroup = async (sessionId, newStatus) => {
    // Only proceed if session is being marked as 'completed'
    if (newStatus !== 'completed') return;

    try {
      console.log(`🔍 Checking if this is the last session for group...`);

      // 1. Get all sessions for this group
      const allSessions = await fetch(`/api/groups/${groupId}/sessions`, {
        cache: "no-store"
      }).then(res => res.json());

      if (!allSessions.success) return;

      const allSessionsList = allSessions.data || [];

      // 2. Count completed sessions (including the one we just updated)
      const completedCount = allSessionsList.filter(s =>
        s.id === sessionId ? true : s.status === 'completed'
      ).length;

      const totalSessions = allSessionsList.length;

      console.log(`📊 Sessions: ${completedCount}/${totalSessions} completed`);

      // 3. If all sessions are now completed, trigger group completion
      if (completedCount === totalSessions && totalSessions > 0) {
        console.log(`🎉 All sessions completed! Triggering group completion...`);

        // Show confirmation toast
        toast((toastInstance) => (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="font-semibold">🎓 جميع الحصص اكتملت!</p>
            </div>
            <p className="text-sm text-gray-600">
              هل تريد إتمام المجموعة وإرسال رسائل التهنئة للطلاب؟
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => toast.dismiss(toastInstance.id)}
                className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
              >
                لاحقاً
              </button>
              <button
                onClick={async () => {
                  toast.dismiss(toastInstance.id);
                  await handleGroupCompletion();
                }}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                إتمام الآن
              </button>
            </div>
          </div>
        ), { duration: Infinity });
      }
    } catch (error) {
      console.error('Error checking group completion:', error);
    }
  };

  /**
   * ✅ Handle group completion with custom message modal
   */
  const handleGroupCompletion = async () => {
    // Show custom message modal
    toast((toastInstance) => (
      <div className="flex flex-col gap-3 w-full max-w-md">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">🎓 إتمام المجموعة</h3>
          <button
            onClick={() => toast.dismiss(toastInstance.id)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              رسالة مخصصة (اختياري)
            </label>
            <textarea
              id="completion-message"
              placeholder="اكتب رسالة تهنئة مخصصة أو اتركها فارغة لاستخدام الرسالة الافتراضية..."
              className="w-full px-3 py-2 border rounded-lg text-sm h-24 resize-none"
              dir="rtl"
            />
            <p className="text-xs text-gray-500 mt-1">
              يمكنك استخدام: {'{studentName}'}, {'{courseName}'}, {'{groupCode}'}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              رابط التقييم (اختياري)
            </label>
            <input
              id="feedback-link"
              type="url"
              placeholder="https://forms.google.com/..."
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => toast.dismiss(toastInstance.id)}
              className="flex-1 px-3 py-2 bg-gray-200 rounded text-sm hover:bg-gray-300"
            >
              إلغاء
            </button>
            <button
              onClick={async () => {
                const message = document.getElementById('completion-message')?.value || '';
                const feedbackLink = document.getElementById('feedback-link')?.value || '';

                toast.dismiss(toastInstance.id);
                await completeGroup(message, feedbackLink);
              }}
              className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              إرسال التهاني 🎉
            </button>
          </div>
        </div>
      </div>
    ), {
      duration: Infinity,
      style: { maxWidth: '500px' }
    });
  };

  /**
   * ✅ Complete group and send congratulations
   */
  const completeGroup = async (customMessage = '', feedbackLink = '') => {
    const loadingToast = toast.loading('جاري إتمام المجموعة وإرسال التهاني...');

    try {
      const res = await fetch(`/api/groups/${groupId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customMessage: customMessage.trim() || null,
          feedbackLink: feedbackLink.trim() || null,
          autoDetected: true
        })
      });

      const json = await res.json();

      if (json.success) {
        toast.success(
          `🎓 تم إتمام المجموعة! تم إرسال ${json.automation.successCount} رسالة تهنئة`,
          { id: loadingToast, duration: 5000 }
        );

        // Show detailed results
        if (json.automation.details?.length > 0) {
          const failed = json.automation.details.filter(d => d.status === 'failed');
          if (failed.length > 0) {
            toast((toastInstance) => (
              <div className="text-sm">
                <p className="font-semibold mb-2">⚠️ بعض الرسائل فشلت:</p>
                <ul className="space-y-1 text-xs">
                  {failed.slice(0, 5).map((f, i) => (
                    <li key={i}>• {f.studentName}: {f.reason}</li>
                  ))}
                </ul>
                <button
                  onClick={() => toast.dismiss(toastInstance.id)}
                  className="mt-2 text-xs text-blue-600 hover:underline"
                >
                  إغلاق
                </button>
              </div>
            ), { duration: 8000 });
          }
        }

        // Refresh sessions to show updated status
        loadSessions();

        // Navigate to groups page after 2 seconds
        setTimeout(() => {
          router.push('/admin/groups');
        }, 2000);

      } else {
        toast.error(json.error || 'فشل إتمام المجموعة', { id: loadingToast });
      }
    } catch (error) {
      console.error('Error completing group:', error);
      toast.error('حدث خطأ أثناء إتمام المجموعة', { id: loadingToast });
    }
  };

  // ================================================================
  // END: Auto Group Completion Functions
  // ================================================================

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'postponed': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'scheduled': return t("sessions.status.scheduled");
      case 'completed': return t("sessions.status.completed");
      case 'cancelled': return t("sessions.status.cancelled");
      case 'postponed': return t("sessions.status.postponed");
      default: return status;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
        weekday: isRTL ? 'short' : 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const openAttendanceModal = async (session) => {
    setSelectedSession(session);
    setLoadingAttendance(true);
    setAttendanceModalOpen(true);

    try {
      const res = await fetch(`/api/sessions/${session.id}/attendance`, {
        cache: "no-store"
      });
      const json = await res.json();

      if (json.success) {
        setAttendanceData(json.data);
      } else {
        toast.error(json.error || t("sessions.attendance.errors.loadFailed"));
        setAttendanceData({
          attendance: [],
          stats: { total: 0, present: 0, absent: 0, late: 0, excused: 0 },
          attendanceTaken: false
        });
      }
    } catch (err) {
      console.error("Error loading attendance:", err);
      toast.error(t("sessions.attendance.errors.loadFailed"));
      setAttendanceData({
        attendance: [],
        stats: { total: 0, present: 0, absent: 0, late: 0, excused: 0 },
        attendanceTaken: false
      });
    } finally {
      setLoadingAttendance(false);
    }
  };

  const openEditModal = (session) => {
    setSelectedSession(session);
    setEditModalOpen(true);
  };

  const openDetailsModal = async (session) => {
    setSelectedSession(session);
    setLoadingAttendance(true);
    setDetailsModalOpen(true);

    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        cache: "no-store"
      });
      const json = await res.json();

      if (json.success) {
        setSelectedSession(json.data);

        const attRes = await fetch(`/api/sessions/${session.id}/attendance`, {
          cache: "no-store"
        });
        const attJson = await attRes.json();
        if (attJson.success) {
          setAttendanceData(attJson.data);
        }
      } else {
        toast.error(json.error || t("sessions.errors.loadDetailsFailed"));
      }
    } catch (err) {
      console.error("Error loading session details:", err);
      toast.error(t("sessions.errors.loadDetailsFailed"));
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleSaveAttendance = async (customMessages) => {
    if (!selectedSession || !attendanceData) return;

    setSavingAttendance(true);
    try {
      const attendanceRecords = groupStudents.map(student => {
        const existingRecord = attendanceData.attendance?.find(
          a => (a.studentId?._id || a.studentId?.id || a.studentId)?.toString() === (student._id || student.id)?.toString()
        );
        return {
          studentId: student._id || student.id,
          status: existingRecord?.status || 'absent',
          notes: existingRecord?.notes || ''
        };
      });

      const res = await fetch(`/api/sessions/${selectedSession.id}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          attendance: attendanceRecords,
          customMessages: customMessages
        })
      });

      const json = await res.json();

      if (json.success) {
        toast.success(t("sessions.attendance.messages.saved"));
        setAttendanceModalOpen(false);
        loadSessions();

        // ✅ Check if this triggers group completion
        await checkAndCompleteGroup(selectedSession.id, 'completed');
      } else {
        toast.error(json.error || t("sessions.attendance.errors.saveFailed"));
      }
    } catch (err) {
      console.error("Error saving attendance:", err);
      toast.error(t("sessions.attendance.errors.saveFailed"));
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleSaveSession = async (formData) => {
    if (!selectedSession) return;

    setSavingSession(true);
    try {
      const res = await fetch(`/api/sessions/${selectedSession.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const json = await res.json();

      if (json.success) {
        toast.success(t("sessions.messages.updated"));
        setEditModalOpen(false);
        loadSessions();

        // ✅ Check if this completion triggers group completion
        await checkAndCompleteGroup(selectedSession.id, formData.status);
      } else {
        toast.error(json.error || t("sessions.errors.updateFailed"));
      }
    } catch (err) {
      console.error("Error updating session:", err);
      toast.error(t("sessions.errors.updateFailed"));
    } finally {
      setSavingSession(false);
    }
  };

  const updateAttendanceStatus = (studentId, status) => {
    if (!attendanceData) return;

    const updatedAttendance = [...(attendanceData.attendance || [])];
    const existingIndex = updatedAttendance.findIndex(
      a => (a.studentId?._id || a.studentId?.id || a.studentId)?.toString() === studentId?.toString()
    );

    if (existingIndex >= 0) {
      updatedAttendance[existingIndex] = {
        ...updatedAttendance[existingIndex],
        status,
        studentId: updatedAttendance[existingIndex].studentId
      };
    } else {
      updatedAttendance.push({
        studentId,
        status,
        notes: ''
      });
    }

    const stats = {
      total: updatedAttendance.length,
      present: updatedAttendance.filter(a => a.status === 'present').length,
      absent: updatedAttendance.filter(a => a.status === 'absent').length,
      late: updatedAttendance.filter(a => a.status === 'late').length,
      excused: updatedAttendance.filter(a => a.status === 'excused').length
    };

    setAttendanceData({
      ...attendanceData,
      attendance: updatedAttendance,
      stats
    });
  };

  const handleSendReminder = async (session, reminderType) => {
    const reminderLabel = reminderType === '24hours' ? '24 ساعة' : 'ساعة';

    toast((toastInstance) => (
      <div className="flex flex-col gap-3">
        <p className="font-semibold">إرسال تذكير {reminderLabel}؟</p>
        <p className="text-sm text-gray-600">
          سيتم إرسال التذكير لجميع الطلاب الذين لم يستلموه بعد
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => toast.dismiss(toastInstance.id)}
            className="px-3 py-1 bg-gray-200 rounded text-sm"
          >
            إلغاء
          </button>
          <button
            onClick={async () => {
              toast.dismiss(toastInstance.id);
              const loadingToast = toast.loading(`جاري إرسال تذكير ${reminderLabel}...`);

              try {
                const res = await fetch(`/api/sessions/${session.id}/send-reminder`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ reminderType })
                });

                const json = await res.json();

                if (json.success) {
                  toast.success(
                    `تم إرسال ${json.data.successCount} تذكير من أصل ${json.data.totalStudents}`,
                    { id: loadingToast }
                  );
                  loadSessions();
                } else {
                  toast.error(json.error || 'فشل الإرسال', { id: loadingToast });
                }
              } catch (error) {
                toast.error('حدث خطأ', { id: loadingToast });
              }
            }}
            className="px-3 py-1 bg-primary text-white rounded text-sm"
          >
            إرسال
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  if (!groupId) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold mb-2">{t("sessions.errors.noGroupSelected")}</h3>
        <p className="text-sm text-gray-600 mb-4">{t("sessions.errors.selectGroupFirst")}</p>
        <button
          onClick={() => router.push('/admin/groups')}
          className="bg-primary text-white px-6 py-2 rounded-lg"
        >
          {t("sessions.buttons.goToGroups")}
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-white dark:bg-darkmode rounded-xl shadow-sm p-6 border border-PowderBlueBorder dark:border-dark_border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-MidnightNavyText dark:text-white">
              {t("sessions.title")} - {group?.name}
            </h1>
            <p className="text-sm text-SlateBlueText dark:text-darktext">
              {t("sessions.groupCode")}: {group?.code}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStudentsModalOpen(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2 text-sm"
              title={t("sessions.buttons.viewStudents")}
            >
              <Users className="w-4 h-4" />
              {t("sessions.buttons.viewStudents")} ({groupStudents.length})
            </button>
            <button
              onClick={() => router.push('/admin/groups')}
              className="text-primary hover:underline text-sm"
            >
              {isRTL ? "→ " : "← "}{t("sessions.buttons.backToGroups")}
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border">
        <div className="flex items-center gap-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
          >
            <option value="">{t("sessions.filters.allStatuses")}</option>
            <option value="scheduled">{t("sessions.filters.scheduled")}</option>
            <option value="completed">{t("sessions.filters.completed")}</option>
            <option value="cancelled">{t("sessions.filters.cancelled")}</option>
            <option value="postponed">{t("sessions.filters.postponed")}</option>
          </select>

          <div className="flex gap-2">
            <button
              onClick={() => setFilters(prev => ({ ...prev, upcoming: !prev.upcoming, past: false }))}
              className={`px-3 py-2 text-sm rounded-lg ${filters.upcoming ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700'
                }`}
            >
              {t("sessions.filters.upcoming")}
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, past: !prev.past, upcoming: false }))}
              className={`px-3 py-2 text-sm rounded-lg ${filters.past ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700'
                }`}
            >
              {t("sessions.filters.past")}
            </button>
          </div>

          <button
            onClick={loadSessions}
            className="ml-auto px-3 py-2 bg-primary text-white rounded-lg flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {t("sessions.buttons.refresh")}
          </button>
        </div>
      </div>

      {/* Sessions List */}
      <div className="bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-PowderBlueBorder dark:divide-dark_border">
            <thead className="bg-gray-50 dark:bg-dark_input">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase">{t("sessions.table.session")}</th>
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase">{t("sessions.table.dateTime")}</th>
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase">{t("sessions.table.status")}</th>
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase">{t("sessions.table.attendance")}</th>
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase">{t("sessions.table.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-PowderBlueBorder dark:divide-dark_border">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-dark_input">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-sm">{session.title}</p>
                      <p className="text-xs text-gray-500">
                        {t("sessions.table.module")} {session.moduleIndex + 1} - {t("sessions.table.session")} {session.sessionNumber}
                        {session.lessonIndexes && ` (${t("sessions.table.lessons")} ${session.lessonIndexes.map(i => i + 1).join(', ')})`}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(session.scheduledDate)}
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Clock className="w-3 h-3" />
                        {session.startTime} - {session.endTime}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                      {getStatusText(session.status)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {session.attendanceTaken ? (
                      <div className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        {t("sessions.attendance.taken")}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        {t("sessions.attendance.notTaken")}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {session.status === 'scheduled' && (
                        <button
                          onClick={() => handleSendReminder(session, '24hours')}
                          className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                          title="إرسال تذكير 24 ساعة"
                        >
                          <Calendar className="w-4 h-4 text-blue-600" />
                        </button>
                      )}
                      {session.status === 'scheduled' && (
                        <button
                          onClick={() => handleSendReminder(session, '1hour')}
                          className="p-1.5 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded transition-colors"
                          title="إرسال تذكير ساعة"
                        >
                          <Clock className="w-4 h-4 text-orange-600" />
                        </button>
                      )}
                      <button
                        onClick={() => openDetailsModal(session)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title={t("sessions.buttons.viewDetails")}
                      >
                        <Eye className="w-4 h-4 text-blue-500" />
                      </button>
                      <button
                        onClick={() => openEditModal(session)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title={t("sessions.buttons.edit")}
                      >
                        <Edit className="w-4 h-4 text-primary" />
                      </button>
                      <button
                        onClick={() => openAttendanceModal(session)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title={t("sessions.buttons.manageAttendance")}
                      >
                        <ClipboardCheck className="w-4 h-4 text-green-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sessions.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">{t("sessions.errors.noSessionsFound")}</h3>
            <p className="text-sm text-gray-600">
              {filters.status || filters.upcoming || filters.past
                ? t("sessions.errors.noMatchingFilters")
                : t("sessions.errors.activateGroup")}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {attendanceModalOpen && selectedSession && (
        <AttendanceModal
          session={selectedSession}
          attendanceData={attendanceData}
          groupStudents={groupStudents}
          loading={loadingAttendance}
          saving={savingAttendance}
          onClose={() => setAttendanceModalOpen(false)}
          onSave={handleSaveAttendance}
          onUpdateStatus={updateAttendanceStatus}
          isRTL={isRTL}
          t={t}
        />
      )}

      {editModalOpen && selectedSession && (
        <EditSessionModal
          session={selectedSession}
          saving={savingSession}
          onClose={() => setEditModalOpen(false)}
          onSave={handleSaveSession}
          isRTL={isRTL}
          t={t}
        />
      )}

      {detailsModalOpen && selectedSession && (
        <SessionDetailsModal
          session={selectedSession}
          attendanceData={attendanceData}
          loading={loadingAttendance}
          onClose={() => setDetailsModalOpen(false)}
          isRTL={isRTL}
          t={t}
        />
      )}

      {studentsModalOpen && (
        <StudentsListModal
          groupStudents={groupStudents}
          sessions={sessions}
          group={group}
          onClose={() => setStudentsModalOpen(false)}
          isRTL={isRTL}
          t={t}
        />
      )}
    </div>
  );
}

// ✅ Attendance Modal Component
function AttendanceModal({ session, attendanceData, groupStudents, loading, saving, onClose, onSave, onUpdateStatus, isRTL, t }) {
  const [viewMode, setViewMode] = useState('all');
  const [customMessages, setCustomMessages] = useState({});
  const [showMessageEditor, setShowMessageEditor] = useState({});

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-darkmode rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  const stats = attendanceData?.stats || { total: 0, present: 0, absent: 0, late: 0, excused: 0 };
  const attendance = attendanceData?.attendance || [];
  const validStudents = Array.isArray(groupStudents) ? groupStudents : [];

  const getStudentAttendanceStatus = (studentId) => {
    const record = attendance.find(
      a => (a.studentId?._id || a.studentId?.id || a.studentId)?.toString() === (studentId?._id || studentId?.id)?.toString()
    );
    return record?.status || 'absent';
  };

  const filteredStudents = viewMode === 'all'
    ? validStudents
    : validStudents.filter(student => {
      const status = getStudentAttendanceStatus(student);
      if (viewMode === 'present') return status === 'present' || status === 'late';
      if (viewMode === 'absent') return status === 'absent' || status === 'excused';
      return true;
    });

  const shouldShowMessageEditor = (status) => {
    return status === 'absent' || status === 'late' || status === 'excused';
  };

  const updateCustomMessage = (studentId, message) => {
    setCustomMessages(prev => ({
      ...prev,
      [studentId]: message
    }));
  };

  const toggleMessageEditor = (studentId) => {
    setShowMessageEditor(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const getAvailableVariables = (student) => {
    const studentName = student.personalInfo?.fullName || t("sessions.attendance.defaults.studentName");
    const guardianName = student.guardianInfo?.name || t("sessions.attendance.defaults.guardianName");

    return {
      studentName,
      guardianName,
      sessionName: session?.title || t("sessions.attendance.defaults.sessionName"),
      sessionNumber: `${t("sessions.attendance.defaults.session")} ${session?.sessionNumber || 'N/A'}`,
      date: session?.scheduledDate
        ? new Date(session.scheduledDate).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
        : t("sessions.attendance.defaults.date"),
      time: `${session?.startTime} - ${session?.endTime}` || t("sessions.attendance.defaults.time"),
    };
  };

  const copyTemplate = (status) => {
    const template = status === 'absent'
      ? t("sessions.attendance.templates.absent")
      : status === 'late'
        ? t("sessions.attendance.templates.late")
        : t("sessions.attendance.templates.excused");

    navigator.clipboard.writeText(template);
    toast.success(t("sessions.attendance.messages.templateCopied"));
  };

  const getMessagePreview = (studentId, message) => {
    if (!message) return '';

    const student = validStudents.find(s => (s._id || s.id)?.toString() === studentId?.toString());
    if (!student) return message;

    const variables = getAvailableVariables(student);
    let preview = message;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      preview = preview.replace(regex, value);
    });

    return preview;
  };

  const handleSaveAttendance = () => {
    onSave(customMessages);
  };

  const formatDateHelper = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-darkmode rounded-xl shadow-lg max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col my-4" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="p-6 border-b border-PowderBlueBorder dark:border-dark_border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-MidnightNavyText dark:text-white">
              {t("sessions.attendance.title")} - {session?.title}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {formatDateHelper(session?.scheduledDate)} - {session?.startTime} {t("sessions.attendance.to")} {session?.endTime}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="p-6 border-b border-PowderBlueBorder dark:border-dark_border bg-gray-50 dark:bg-dark_input">
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total}</p>
              <p className="text-xs text-gray-500">{t("sessions.attendance.stats.total")}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.present}</p>
              <p className="text-xs text-gray-500">{t("sessions.attendance.stats.present")}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
              <p className="text-xs text-gray-500">{t("sessions.attendance.stats.absent")}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
              <p className="text-xs text-gray-500">{t("sessions.attendance.stats.late")}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.excused}</p>
              <p className="text-xs text-gray-500">{t("sessions.attendance.stats.excused")}</p>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1 text-sm rounded-lg ${viewMode === 'all' ? 'bg-primary text-white' : 'bg-white dark:bg-darkmode'
                }`}
            >
              {t("sessions.attendance.filters.allStudents")}
            </button>
            <button
              onClick={() => setViewMode('present')}
              className={`px-3 py-1 text-sm rounded-lg flex items-center gap-1 ${viewMode === 'present' ? 'bg-green-500 text-white' : 'bg-white dark:bg-darkmode'
                }`}
            >
              <UserCheck className="w-4 h-4" />
              {t("sessions.attendance.filters.present")} ({stats.present + stats.late})
            </button>
            <button
              onClick={() => setViewMode('absent')}
              className={`px-3 py-1 text-sm rounded-lg flex items-center gap-1 ${viewMode === 'absent' ? 'bg-red-500 text-white' : 'bg-white dark:bg-darkmode'
                }`}
            >
              <UserX className="w-4 h-4" />
              {t("sessions.attendance.filters.absent")} ({stats.absent + stats.excused})
            </button>
          </div>
        </div>

        {/* Students List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {filteredStudents.map((student) => {
              const studentId = student._id || student.id;
              const status = getStudentAttendanceStatus(student);
              const studentName = student.personalInfo?.fullName || student.enrollmentNumber || t("sessions.attendance.defaults.unknown");
              const enrollmentNumber = student.enrollmentNumber || student.personalInfo?.enrollmentNumber || 'N/A';
              const showEditor = shouldShowMessageEditor(status);
              const isEditorOpen = showMessageEditor[studentId];
              const variables = getAvailableVariables(student);

              return (
                <div
                  key={studentId}
                  className="border border-PowderBlueBorder dark:border-dark_border rounded-lg overflow-hidden"
                >
                  {/* Student Info & Status Selector */}
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-darkmode">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-MidnightNavyText dark:text-white">
                        {studentName}
                      </p>
                      <p className="text-xs text-gray-500">{t("sessions.attendance.id")}: {enrollmentNumber}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={status}
                        onChange={(e) => {
                          onUpdateStatus(studentId, e.target.value);
                          if (shouldShowMessageEditor(e.target.value)) {
                            setShowMessageEditor(prev => ({ ...prev, [studentId]: true }));
                          } else {
                            setShowMessageEditor(prev => ({ ...prev, [studentId]: false }));
                            setCustomMessages(prev => {
                              const newMessages = { ...prev };
                              delete newMessages[studentId];
                              return newMessages;
                            });
                          }
                        }}
                        className="px-3 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
                      >
                        <option value="present">{t("sessions.attendance.status.present")}</option>
                        <option value="absent">{t("sessions.attendance.status.absent")}</option>
                        <option value="late">{t("sessions.attendance.status.late")}</option>
                        <option value="excused">{t("sessions.attendance.status.excused")}</option>
                      </select>

                      {showEditor && (
                        <button
                          onClick={() => toggleMessageEditor(studentId)}
                          className={`p-2 rounded-lg transition-colors ${isEditorOpen
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600'
                            }`}
                          title={isEditorOpen ? t("sessions.attendance.hideEditor") : t("sessions.attendance.showEditor")}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Message Editor */}
                  {showEditor && isEditorOpen && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800 p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 space-y-3">
                          <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
                            📨 {t("sessions.attendance.message.toGuardian")} ({student.guardianInfo?.name || t("sessions.attendance.defaults.guardianName")})
                          </h4>

                          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-2">
                            <p className="text-xs text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                              <Info className="w-3 h-3 flex-shrink-0" />
                              <span>
                                <strong>{t("sessions.attendance.message.optional")}:</strong> {t("sessions.attendance.message.optionalDesc", { status })}
                              </span>
                            </p>
                          </div>

                          {/* Available Variables */}
                          <div className="bg-white dark:bg-gray-800 rounded p-3 border border-blue-200 dark:border-blue-700">
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                              <Info className="w-3 h-3" />
                              {t("sessions.attendance.message.availableVariables")}:
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {Object.entries(variables).map(([key, value]) => (
                                <div key={key} className="font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded">
                                  <div className="font-bold text-blue-600 dark:text-blue-400">{`{${key}}`}</div>
                                  <div className="text-gray-600 dark:text-gray-400 truncate">{String(value).substring(0, 20)}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Message Input */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t("sessions.attendance.message.writeCustom")}
                              </label>
                              <button
                                type="button"
                                onClick={() => copyTemplate(status)}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" />
                                {t("sessions.attendance.message.copyTemplate")}
                              </button>
                            </div>

                            <textarea
                              value={customMessages[studentId] || ''}
                              onChange={(e) => updateCustomMessage(studentId, e.target.value)}
                              placeholder={t(`sessions.attendance.placeholders.${status}`, { returnObjects: true })}
                              className="w-full px-3 py-2.5 border border-blue-300 dark:border-blue-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white resize-none h-32 font-mono text-sm"
                              dir={isRTL ? 'rtl' : 'ltr'}
                            />

                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-500">{(customMessages[studentId] || '').length} {t("sessions.attendance.message.characters")}</span>
                              {customMessages[studentId]?.trim() ? (
                                <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                                  ✓ {t("sessions.attendance.message.customReady")}
                                </span>
                              ) : (
                                <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                  ℹ️ {t("sessions.attendance.message.defaultWillBeUsed")}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Live Preview */}
                          {customMessages[studentId] && (
                            <div className="bg-white dark:bg-gray-800 rounded p-3 border border-blue-200 dark:border-blue-700">
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                📋 {t("sessions.attendance.message.preview")} <span className="text-gray-500">({t("sessions.attendance.message.whatGuardianWillReceive")})</span>
                              </p>
                              <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700 p-3 rounded border border-gray-200 dark:border-gray-600 max-h-48 overflow-y-auto">
                                {getMessagePreview(studentId, customMessages[studentId])}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 font-medium">{t("sessions.attendance.noStudentsFound")}</p>
              <p className="text-sm text-gray-400 mt-1">
                {validStudents.length === 0
                  ? t("sessions.attendance.addStudentsFirst")
                  : t("sessions.attendance.noMatchingFilter")}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-PowderBlueBorder dark:border-dark_border flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-gray-50 dark:hover:bg-dark_input"
          >
            {t("sessions.attendance.buttons.cancel")}
          </button>
          <button
            onClick={handleSaveAttendance}
            disabled={saving}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {t("sessions.attendance.buttons.saving")}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {t("sessions.attendance.buttons.saveAttendance")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Session Modal Component
function EditSessionModal({ session, saving, onClose, onSave, isRTL, t }) {
  const [formData, setFormData] = useState({
    meetingLink: session?.meetingLink || '',
    recordingLink: session?.recordingLink || '',
    instructorNotes: session?.instructorNotes || '',
    status: session?.status || 'scheduled',
    customMessage: ''
  });

  const [previewMessage, setPreviewMessage] = useState('');

  const showReasonField = formData.status === 'cancelled' || formData.status === 'postponed';

  const getAvailableVariables = () => {
    return {
      sessionName: session?.title || t("sessions.edit.defaults.sessionName"),
      sessionNumber: `${t("sessions.edit.defaults.session")} ${session?.sessionNumber || 'N/A'}`,
      lessonsCovered: session?.lessonIndexes?.map(i => `${t("sessions.edit.defaults.lesson")} ${i + 1}`).join(' & ') || 'N/A',
      date: session?.scheduledDate
        ? new Date(session.scheduledDate).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
        : t("sessions.edit.defaults.date"),
      time: `${session?.startTime} - ${session?.endTime}` || t("sessions.edit.defaults.time"),
      module: `${t("sessions.edit.defaults.module")} ${(session?.moduleIndex || 0) + 1}`,
      course: session?.courseSnapshot?.title || session?.course?.title || t("sessions.edit.defaults.course")
    };
  };

  const generatePreview = (message) => {
    if (!message) return '';

    const variables = getAvailableVariables();
    let preview = message;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      preview = preview.replace(regex, value);
    });

    return preview;
  };

  useEffect(() => {
    if (showReasonField && formData.customMessage) {
      const preview = generatePreview(formData.customMessage);
      setPreviewMessage(preview);
    } else {
      setPreviewMessage('');
    }
  }, [formData.customMessage, formData.status, session]);

  const copyToClipboard = () => {
    const template = formData.status === 'cancelled'
      ? t("sessions.edit.templates.cancelled")
      : t("sessions.edit.templates.postponed");

    navigator.clipboard.writeText(template);
    toast.success(t("sessions.edit.messages.templateCopied"));
  };

  const handleSave = () => {
    if (showReasonField && !formData.customMessage.trim()) {
      toast.error(t("sessions.edit.errors.writeMessage"));
      return;
    }

    const finalData = {
      ...formData,
      processedMessage: generatePreview(formData.customMessage)
    };

    onSave(finalData);
  };

  const variables = getAvailableVariables();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-darkmode rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="p-6 border-b border-PowderBlueBorder dark:border-dark_border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-MidnightNavyText dark:text-white">
              {t("sessions.edit.title")} - {session?.title}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {formatDateHelper(session?.scheduledDate)} - {session?.startTime} {t("sessions.edit.to")} {session?.endTime}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
              {t("sessions.edit.labels.status")}
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
            >
              <option value="scheduled">{t("sessions.edit.status.scheduled")}</option>
              <option value="completed">{t("sessions.edit.status.completed")}</option>
              <option value="cancelled">{t("sessions.edit.status.cancelled")}</option>
              <option value="postponed">{t("sessions.edit.status.postponed")}</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
              <Link2 className="w-4 h-4" />
              {t("sessions.edit.labels.meetingLink")}
            </label>
            <input
              type="url"
              value={formData.meetingLink}
              onChange={(e) => setFormData(prev => ({ ...prev, meetingLink: e.target.value }))}
              placeholder={t("sessions.edit.placeholders.meetingLink")}
              className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
              🎥 {t("sessions.edit.labels.recordingLink")}
            </label>
            <input
              type="url"
              value={formData.recordingLink}
              onChange={(e) => setFormData(prev => ({ ...prev, recordingLink: e.target.value }))}
              placeholder={t("sessions.edit.placeholders.recordingLink")}
              className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
            />
          </div>

          {showReasonField && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-4">
              <div className="flex items-start gap-3">
                <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
                    📨 {t("sessions.edit.notifyStudents.title")}
                  </h4>

                  <div className="bg-white dark:bg-gray-800 rounded p-3 mb-3 border border-blue-200 dark:border-blue-700">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <Info className="w-3 h-3" />
                      {t("sessions.edit.notifyStudents.availableVariables")}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(variables).map(([key, value]) => (
                        <div key={key} className="font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-800 dark:text-gray-200">
                          <div className="font-bold text-blue-600 dark:text-blue-400">{`{${key}}`}</div>
                          <div className="text-gray-600 dark:text-gray-400 text-xs mt-0.5 truncate">
                            {String(value).substring(0, 25)}
                            {String(value).length > 25 ? '...' : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t("sessions.edit.notifyStudents.writeMessage")} <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={copyToClipboard}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        {t("sessions.edit.notifyStudents.copyTemplate")}
                      </button>
                    </div>

                    <textarea
                      value={formData.customMessage}
                      onChange={(e) => setFormData(prev => ({ ...prev, customMessage: e.target.value }))}
                      placeholder={t(`sessions.edit.placeholders.${formData.status}`, { returnObjects: true })}
                      className="w-full px-3 py-2.5 border border-blue-300 dark:border-blue-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white resize-none h-32 font-mono text-sm"
                      required
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 dark:text-gray-400">
                        {formData.customMessage.length} {t("sessions.edit.notifyStudents.characters")}
                      </span>
                      {formData.customMessage.length > 0 && (
                        <span className="text-green-600 dark:text-green-400">✓ {t("sessions.edit.notifyStudents.messageReady")}</span>
                      )}
                    </div>
                  </div>

                  {previewMessage && (
                    <div className="bg-white dark:bg-gray-800 rounded p-3 border border-blue-200 dark:border-blue-700 mt-4">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        📋 {t("sessions.edit.notifyStudents.livePreview")}
                        <span className="text-gray-500">({t("sessions.edit.notifyStudents.whatStudentsWillSee")})</span>
                      </p>
                      <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words bg-gray-50 dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600 max-h-48 overflow-y-auto font-sans">
                        {previewMessage}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
              <FileText className="w-4 h-4" />
              {t("sessions.edit.labels.instructorNotes")}
            </label>
            <textarea
              value={formData.instructorNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, instructorNotes: e.target.value }))}
              placeholder={t("sessions.edit.placeholders.instructorNotes")}
              rows={4}
              className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white resize-none"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>
        </div>

        <div className="p-6 border-t border-PowderBlueBorder dark:border-dark_border flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-gray-50 dark:hover:bg-dark_input transition-colors"
          >
            {t("sessions.edit.buttons.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (showReasonField && !formData.customMessage.trim())}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {t("sessions.edit.buttons.saving")}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {t("sessions.edit.buttons.saveChanges")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function
const formatDateHelper = (dateString, isRTL = false) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'N/A';
  }
}

// Session Details Modal
function SessionDetailsModal({ session, attendanceData, loading, onClose, isRTL, t }) {
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-darkmode rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  const stats = attendanceData?.stats || { total: 0, present: 0, absent: 0, late: 0, excused: 0 };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-darkmode rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="p-6 border-b border-PowderBlueBorder dark:border-dark_border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-MidnightNavyText dark:text-white">
              {t("sessions.details.title")} - {session?.title}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t("sessions.details.module")} {session?.moduleIndex + 1} - {t("sessions.details.session")} {session?.sessionNumber}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white mb-4">
              {t("sessions.details.basicInfo")}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">{t("sessions.details.date")}</p>
                <p className="font-medium">{formatDateHelper(session?.scheduledDate, isRTL)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t("sessions.details.time")}</p>
                <p className="font-medium">{session?.startTime} - {session?.endTime}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t("sessions.details.status")}</p>
                <p className="font-medium">{session?.status}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t("sessions.details.attendanceTaken")}</p>
                <p className="font-medium">{session?.attendanceTaken ? t("sessions.details.yes") : t("sessions.details.no")}</p>
              </div>
            </div>
          </div>

          {(session?.meetingLink || session?.recordingLink) && (
            <div>
              <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white mb-4">
                {t("sessions.details.links")}
              </h3>
              <div className="space-y-2">
                {session?.meetingLink && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                      <Link2 className="w-4 h-4" />
                      {t("sessions.details.meetingLink")}
                    </p>
                    <a
                      href={session.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline break-all"
                    >
                      {session.meetingLink}
                    </a>
                  </div>
                )}
                {session?.recordingLink && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                      <VideoIcon className="w-4 h-4" />
                      {t("sessions.details.recordingLink")}
                    </p>
                    <a
                      href={session.recordingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline break-all"
                    >
                      {session.recordingLink}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {session?.instructorNotes && (
            <div>
              <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t("sessions.details.instructorNotes")}
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-dark_input p-4 rounded-lg">
                {session.instructorNotes}
              </p>
            </div>
          )}

          {attendanceData && (
            <div>
              <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white mb-4">
                {t("sessions.details.attendanceStats")}
              </h3>
              <div className="grid grid-cols-5 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-dark_input rounded-lg">
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total}</p>
                  <p className="text-xs text-gray-500">{t("sessions.details.stats.total")}</p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{stats.present}</p>
                  <p className="text-xs text-gray-500">{t("sessions.details.stats.present")}</p>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
                  <p className="text-xs text-gray-500">{t("sessions.details.stats.absent")}</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
                  <p className="text-xs text-gray-500">{t("sessions.details.stats.late")}</p>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{stats.excused}</p>
                  <p className="text-xs text-gray-500">{t("sessions.details.stats.excused")}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-PowderBlueBorder dark:border-dark_border flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            {t("sessions.details.buttons.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ✅ Students List Modal - بالضبط كما في الملف الأصلي
function StudentsListModal({ groupStudents, sessions, group, onClose, isRTL, t }) {
  const [viewMode, setViewMode] = useState('all'); // 'all', 'present', 'absent'
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionAttendance, setSessionAttendance] = useState({});
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const loadSessionAttendance = async (sessionId) => {
    setLoadingAttendance(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/attendance`, {
        cache: "no-store"
      });
      const json = await res.json();

      if (json.success && json.data.attendance) {
        const attendanceMap = {};
        json.data.attendance.forEach(record => {
          const studentId = (record.studentId?._id || record.studentId?.id || record.studentId)?.toString();
          if (studentId) {
            attendanceMap[studentId] = record.status;
          }
        });
        setSessionAttendance(prev => ({
          ...prev,
          [sessionId]: attendanceMap
        }));
      }
    } catch (err) {
      console.error("Error loading attendance:", err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  // Load attendance for selected session
  useEffect(() => {
    if (selectedSessionId) {
      loadSessionAttendance(selectedSessionId);
    }
  }, [selectedSessionId]);

  const getStudentStatusForSession = (studentId, sessionId) => {
    if (!sessionId || !sessionAttendance[sessionId]) return null;
    return sessionAttendance[sessionId][studentId?.toString()] || null;
  };

  const validStudents = Array.isArray(groupStudents) ? groupStudents : [];

  // Filter students based on view mode and selected session
  const filteredStudents = validStudents.filter(student => {
    if (viewMode === 'all') return true;
    if (!selectedSessionId) return true;

    const status = getStudentStatusForSession(student._id || student.id, selectedSessionId);
    if (!status) return viewMode === 'all';

    if (viewMode === 'present') return status === 'present' || status === 'late';
    if (viewMode === 'absent') return status === 'absent' || status === 'excused';
    return true;
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
        weekday: isRTL ? 'short' : 'short',
        year: 'numeric',
        month: isRTL ? 'short' : 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-darkmode rounded-xl shadow-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="p-6 border-b border-PowderBlueBorder dark:border-dark_border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t("sessions.students.title")} - {group?.name}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t("sessions.students.total")}: {validStudents.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Session Selector & Filters */}
        <div className="p-6 border-b border-PowderBlueBorder dark:border-dark_border bg-gray-50 dark:bg-dark_input">
          <div className="space-y-4">
            {/* Session Selector */}
            <div>
              <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
                {t("sessions.students.selectSession")}
              </label>
              <select
                value={selectedSessionId || ''}
                onChange={(e) => setSelectedSessionId(e.target.value || null)}
                className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-darkmode dark:text-white text-sm"
              >
                <option value="">{t("sessions.students.allSessions")}</option>
                {sessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {formatDate(session.scheduledDate)} - {session.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Buttons */}
            {selectedSessionId && (
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('all')}
                  className={`px-3 py-1 text-sm rounded-lg ${viewMode === 'all' ? 'bg-primary text-white' : 'bg-white dark:bg-darkmode'
                    }`}
                >
                  {t("sessions.students.filters.allStudents")}
                </button>
                <button
                  onClick={() => setViewMode('present')}
                  className={`px-3 py-1 text-sm rounded-lg flex items-center gap-1 ${viewMode === 'present' ? 'bg-green-500 text-white' : 'bg-white dark:bg-darkmode'
                    }`}
                >
                  <UserCheck className="w-4 h-4" />
                  {t("sessions.students.filters.present")}
                </button>
                <button
                  onClick={() => setViewMode('absent')}
                  className={`px-3 py-1 text-sm rounded-lg flex items-center gap-1 ${viewMode === 'absent' ? 'bg-red-500 text-white' : 'bg-white dark:bg-darkmode'
                    }`}
                >
                  <UserX className="w-4 h-4" />
                  {t("sessions.students.filters.absent")}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Students List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingAttendance && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">{t("sessions.students.loadingAttendance")}</p>
            </div>
          )}

          <div className="space-y-3">
            {filteredStudents.map((student) => {
              const studentId = student._id || student.id;
              const studentName = student.personalInfo?.fullName || student.enrollmentNumber || t("sessions.students.defaults.unknown");
              const enrollmentNumber = student.enrollmentNumber || student.personalInfo?.enrollmentNumber || 'N/A';
              const email = student.personalInfo?.email || 'N/A';
              const phone = student.personalInfo?.phone || 'N/A';
              const whatsappNumber = student.personalInfo?.whatsappNumber || null;

              const attendanceStatus = selectedSessionId
                ? getStudentStatusForSession(studentId, selectedSessionId)
                : null;

              return (
                <div
                  key={studentId}
                  className="p-4 border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-gray-50 dark:hover:bg-dark_input transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-MidnightNavyText dark:text-white">
                            {studentName}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Hash className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500 font-mono">{enrollmentNumber}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 ml-[52px]">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-600 dark:text-gray-300 truncate">{email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-600 dark:text-gray-300">{phone}</span>
                          {whatsappNumber && (
                            <span className="text-xs text-green-600 dark:text-green-400">(WhatsApp)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Attendance Status Badge */}
                    {selectedSessionId && attendanceStatus && (
                      <div className="ml-4 flex-shrink-0">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${attendanceStatus === 'present'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : attendanceStatus === 'late'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : attendanceStatus === 'excused'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                          {attendanceStatus === 'present' && <UserCheck className="w-3 h-3 inline mr-1" />}
                          {attendanceStatus === 'absent' && <UserX className="w-3 h-3 inline mr-1" />}
                          {attendanceStatus.charAt(0).toUpperCase() + attendanceStatus.slice(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">{t("sessions.students.noStudentsFound")}</p>
              <p className="text-sm text-gray-400 mt-1">
                {validStudents.length === 0
                  ? t("sessions.students.noStudentsInGroup")
                  : t("sessions.students.noMatchingFilter")}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-PowderBlueBorder dark:border-dark_border flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {t("sessions.students.showing")} {filteredStudents.length} {t("sessions.students.of")} {validStudents.length} {t("sessions.students.students")}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            {t("sessions.students.buttons.close")}
          </button>
        </div>
      </div>
    </div>
  );
}