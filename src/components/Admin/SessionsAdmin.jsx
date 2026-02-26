// /src/app/admin/sessions/page.jsx
"use client";
import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Edit,
  RefreshCw,
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
  Zap,
  Send,
  User,
  Trophy,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import EditSessionModal from "./sessions/EditSessionModal";
import ReminderModal from "./sessions/ReminderModal";
import AttendanceModal from "./sessions/AttendanceModal";
import SessionDetailsModal from "./sessions/SessionDetailsModal";
import StudentsListModal from "./sessions/StudentsListModal";
import GroupCompletionModal from "./sessions/GroupCompletionModal";

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
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);

  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedReminderType, setSelectedReminderType] = useState('24hours');
  const [attendanceData, setAttendanceData] = useState(null);
  const [groupStudents, setGroupStudents] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const isRTL = language === "ar";

  // ================================================================
  // Data Loading Functions
  // ================================================================

  // ✅ Helper: check if all sessions are done (completed or cancelled)
  const checkSessionsLocally = useCallback((sessionsList) => {
    if (!sessionsList || sessionsList.length === 0) return false;
    return sessionsList.every(s => s.status === 'completed' || s.status === 'cancelled');
  }, []);

  // ✅ Helper: verify group completion eligibility via API
  const checkIfGroupComplete = useCallback(async (gId) => {
    try {
      const res = await fetch(`/api/groups/${gId}/complete`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        return {
          shouldComplete: json.data?.canComplete,
          alreadyCompleted: json.data?.alreadyCompleted,
          messagesSent: json.data?.messagesSent,
          data: json.data,
        };
      }
    } catch (err) {
      console.error('Error checking group completion:', err);
    }
    return { shouldComplete: false, alreadyCompleted: false };
  }, []);

  const loadSessions = useCallback(async () => {
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
        const loadedSessions = json.data || [];
        setSessions(loadedSessions);

        // ✅ التأكد من أن الـ group object يحتوي على _id
        const groupData = json.group || {};
        console.log('📦 Group data from API:', groupData);

        // تحويل group data للتأكد من وجود _id
        setGroup({
          ...groupData,
          _id: groupData._id || groupData.id || groupId, // ✅ التأكد من وجود _id
        });

        // ✅ Auto-detect group completion after loading sessions
        if (loadedSessions.length > 0 && !filters.status && !filters.upcoming && !filters.past) {
          const allDone = checkSessionsLocally(loadedSessions);
          if (allDone) {
            const result = await checkIfGroupComplete(groupId);
            if (result.shouldComplete && !result.messagesSent) {
              setTimeout(() => setCompletionModalOpen(true), 800);
            }
          }
        }
      } else {
        toast.error(json.error || t("sessions.errors.loadFailed"));
      }
    } catch (err) {
      console.error("Error loading sessions:", err);
      toast.error(t("sessions.errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [groupId, filters.status, filters.upcoming, filters.past, t, checkSessionsLocally, checkIfGroupComplete]);

  const loadGroupStudents = useCallback(async () => {
    if (!groupId) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/students`, {
        cache: "no-store"
      });
      const json = await res.json();

      if (json.success && json.data) {
        const students = json.data.map(student => ({
          ...student,
          _id: student._id || student.id,
          personalInfo: {
            fullName: student.personalInfo?.fullName || student.fullName || 'Unknown',
            gender: student.personalInfo?.gender || 'male',
            whatsappNumber: student.personalInfo?.whatsappNumber || student.whatsappNumber || '',
            enrollmentNumber: student.personalInfo?.enrollmentNumber || student.enrollmentNumber || 'N/A',
            nickname: student.personalInfo?.nickname || { ar: '', en: '' }
          },
          guardianInfo: {
            name: student.guardianInfo?.name || student.guardianName || 'Guardian',
            relationship: student.guardianInfo?.relationship || 'father',
            whatsappNumber: student.guardianInfo?.whatsappNumber || student.guardianWhatsapp || '',
            nickname: student.guardianInfo?.nickname || { ar: '', en: '' }
          },
          communicationPreferences: {
            preferredLanguage: student.communicationPreferences?.preferredLanguage || 'ar'
          },
          enrollmentNumber: student.enrollmentNumber || ''
        }));
        setGroupStudents(students);
      } else {
        setGroupStudents([]);
      }
    } catch (err) {
      console.error("❌ Error loading group students:", err);
      setGroupStudents([]);
    }
  }, [groupId]);

  useEffect(() => {
    loadSessions();
    loadGroupStudents();
  }, [loadSessions, loadGroupStudents]);

  // ================================================================
  // Modal Open Functions
  // ================================================================

  const openAttendanceModal = useCallback(async (session) => {
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
  }, [t]);

  const openEditModal = useCallback((session) => {
    setSelectedSession(session);
    setEditModalOpen(true);
  }, []);

  const openDetailsModal = useCallback(async (session) => {
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
  }, [t]);

  const openReminderModal = useCallback((session, reminderType) => {
    setSelectedSession(session);
    setSelectedReminderType(reminderType);
    setReminderModalOpen(true);
  }, []);

  // ================================================================
  // Completion stats
  // ================================================================
  const completedCount = sessions.filter(s => s.status === 'completed').length;
  const cancelledCount = sessions.filter(s => s.status === 'cancelled').length;
  const totalDone = completedCount + cancelledCount;
  const allDone = sessions.length > 0 && totalDone === sessions.length;

  // ================================================================
  // Render
  // ================================================================

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

      {/* ── Header ─────────────────────────────────────────────────────────── */}
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
            {/* ✅ زر إتمام المجموعة - يظهر فقط لو كل الجلسات خلصت */}
            {allDone && (
              <button
                onClick={() => setCompletionModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 flex items-center gap-2 text-sm font-semibold shadow-md"
              >
                <Trophy className="w-4 h-4" />
                {isRTL ? 'إتمام المجموعة' : 'Complete Group'}
              </button>
            )}
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

        {/* ✅ Progress bar لو كل الجلسات خلصت */}
        {allDone && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg flex items-center gap-3">
            <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
              {isRTL
                ? `🎉 تم إنهاء جميع الجلسات (${completedCount} مكتملة، ${cancelledCount} ملغاة)! يمكنك الآن إرسال رسائل إتمام المجموعة.`
                : `🎉 All sessions finished (${completedCount} completed, ${cancelledCount} cancelled)! You can now send group completion messages.`}
            </p>
          </div>
        )}
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
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
              className={`px-3 py-2 text-sm rounded-lg ${filters.upcoming ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
            >
              {t("sessions.filters.upcoming")}
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, past: !prev.past, upcoming: false }))}
              className={`px-3 py-2 text-sm rounded-lg ${filters.past ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
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

      {/* ── Sessions List ───────────────────────────────────────────────────── */}
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
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(session.scheduledDate, isRTL)}
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Clock className="w-3 h-3" />
                        {session.startTime} - {session.endTime}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                      {getStatusText(session.status, t)}
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
                        <>
                          <button
                            onClick={() => openReminderModal(session, '24hours')}
                            className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                            title={isRTL ? 'إرسال تذكير 24 ساعة' : 'Send 24h reminder'}
                          >
                            <Calendar className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => openReminderModal(session, '1hour')}
                            className="p-1.5 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded transition-colors"
                            title={isRTL ? 'إرسال تذكير ساعة' : 'Send 1h reminder'}
                          >
                            <Clock className="w-4 h-4 text-orange-600" />
                          </button>
                        </>
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

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {attendanceModalOpen && selectedSession && (
        <AttendanceModal
          session={selectedSession}
          attendanceData={attendanceData}
          groupStudents={attendanceData?.students || groupStudents}
          loading={loadingAttendance}
          onClose={() => setAttendanceModalOpen(false)}
          onRefresh={loadSessions}
          isRTL={isRTL}
          t={t}
        />
      )}

      {attendanceData && console.log('📦 Attendance data students:', attendanceData.students)}

      {editModalOpen && selectedSession && (
        <EditSessionModal
          session={selectedSession}
          groupStudents={groupStudents}
          onClose={() => setEditModalOpen(false)}
          onRefresh={loadSessions}
          isRTL={isRTL}
          t={t}
        />
      )}

      {reminderModalOpen && selectedSession && (
        <ReminderModal
          session={selectedSession}
          groupStudents={groupStudents}
          reminderType={selectedReminderType}
          onClose={() => setReminderModalOpen(false)}
          onRefresh={loadSessions}
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

      {/* ✅ Group Completion Modal - مع تمرير groupId بشكل صريح */}
      {completionModalOpen && (
        <GroupCompletionModal
          group={group || {
            _id: groupId,
            name: group?.name || '',
            code: group?.code || '',
            courseSnapshot: group?.courseSnapshot || null,
            courseId: group?.courseId || null
          }}
          groupId={groupId} // ✅ تمرير groupId مباشرة
          groupStudents={groupStudents}
          onClose={() => setCompletionModalOpen(false)}
          onRefresh={loadSessions}
          isRTL={isRTL}
          t={t}
        />
      )}
    </div>
  );
}

// ── Helper functions ────────────────────────────────────────────────────────
function formatDate(dateString, isRTL) {
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

function getStatusColor(status) {
  switch (status) {
    case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    case 'postponed': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
}

function getStatusText(status, t) {
  switch (status) {
    case 'scheduled': return t("sessions.status.scheduled");
    case 'completed': return t("sessions.status.completed");
    case 'cancelled': return t("sessions.status.cancelled");
    case 'postponed': return t("sessions.status.postponed");
    default: return status;
  }
}