// /src/app/admin/sessions/page.jsx
"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  PauseCircle,
  Lock,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import EditSessionModal from "./sessions/EditSessionModal";
import ReminderModal from "./sessions/ReminderModal";
import AttendanceModal from "./sessions/AttendanceModal";
import SessionDetailsModal from "./sessions/SessionDetailsModal";
import StudentsListModal from "./sessions/StudentsListModal";
import GroupCompletionModal from "./sessions/GroupCompletionModal";

// ═══════════════════════════════════════════════════════════════════════════
// ✅ Hold Utilities — منطق مركزي واحد لكل الصفحة
// ═══════════════════════════════════════════════════════════════════════════

/**
 * بيرتّب السيشنات بنفس ترتيب الباك اند (cascade):
 *   moduleIndex ASC → sessionNumber ASC → scheduledDate ASC
 */
function sortSessionsForHold(sessions) {
  return [...sessions].sort((a, b) => {
    if (a.moduleIndex !== b.moduleIndex) return a.moduleIndex - b.moduleIndex;
    if (a.sessionNumber !== b.sessionNumber) return a.sessionNumber - b.sessionNumber;
    return new Date(a.scheduledDate) - new Date(b.scheduledDate);
  });
}

/**
 * 🔒 يحدد هل السيشن دي مقفولة بسبب الـ Hold؟
 *
 * @param {Object} session — السيشن الحالية
 * @param {Object} group   — الجروب (فيه .hold)
 * @param {Array}  allSessions — كل سيشنات الجروب (للترتيب)
 * @returns {boolean}
 */
function isSessionLockedByHold(session, group, allSessions) {
  if (!group?.isOnHold) return false;
  if (session.status === "completed") return false; // تاريخية

  const hold = group.hold;
  if (!hold) return false;

  // indefinite / duration → كل الجلسات مقفولة
  if (hold.holdType === "indefinite" || hold.holdType === "duration") {
    return true;
  }

  // باقي الأنواع بتعتمد على ترتيب السيشنات
  const sorted = sortSessionsForHold(allSessions);
  const myIndex = sorted.findIndex((s) => s.id === session.id);
  if (myIndex === -1) return false;

  // sessions: N سيشنات الأولى (0..N-1)
  if (hold.holdType === "sessions") {
    const consumed = hold.holdSessionsConsumed || 0;
    // ✅ لو لسه مفيش أي سيشن اتاستهلكت → كل السيشنات مقفولة لحد ما التقدم يحصل
    return myIndex < Math.max(consumed, 0) || consumed === 0;
  }

  // until_session: من أول الترتيب لحد السيشن المستهدفة (شاملة)
  if (hold.holdType === "until_session") {
    const targetId = hold.holdUntilSessionId;
    if (!targetId) return true;
    const targetIndex = sorted.findIndex((s) => s.id === String(targetId) || s._id === String(targetId));
    if (targetIndex === -1) return true;
    return myIndex <= targetIndex;
  }

  return false;
}

/**
 * 🔒 هل الـ Hold يقفل الجروب بالكامل؟ (indefinite أو duration)
 * مفيد لعرض Banner بشكل مختلف، ولحساب إتمام المجموعة.
 */
function isFullGroupHold(group) {
  if (!group?.isOnHold) return false;
  const t = group.hold?.holdType;
  return t === "indefinite" || t === "duration";
}

/**
 * 🔒 هل كل السيشنات اللي مش مكتملة مقفولة بسبب الـ Hold؟
 * (يستخدم لمنع "إتمام المجموعة" في كل الحالات.)
 */
function areAllActiveSessionsLocked(group, allSessions) {
  if (!group?.isOnHold) return false;
  const active = allSessions.filter((s) => s.status !== "completed");
  if (active.length === 0) return false;
  return active.every((s) => isSessionLockedByHold(s, group, allSessions));
}

// ═══════════════════════════════════════════════════════════════════════════
// ✅ HoldBanner — للأدمن
// ═══════════════════════════════════════════════════════════════════════════
function HoldBanner({ group, isRTL, t, lockedCount = 0, totalActive = 0 }) {
  const hold = group?.hold;
  if (!group?.isOnHold || !hold) return null;

  const isFull = hold.holdType === "indefinite" || hold.holdType === "duration";

  const holdLabel = (() => {
    if (hold.holdType === "indefinite") {
      return isRTL ? "مفتوح لحد ما تفكّه يدويًا" : "Indefinite — release manually";
    }
    if (hold.holdType === "sessions") {
      return isRTL
        ? `لعدد ${hold.holdSessionsCount} سيشنات (اتستهلك ${hold.holdSessionsConsumed || 0})`
        : `For ${hold.holdSessionsCount} sessions (${hold.holdSessionsConsumed || 0} consumed)`;
    }
    if (hold.holdType === "until_session") {
      return isRTL ? "لحد سيشن محددة" : "Until a specific session";
    }
    return isRTL
      ? `لمدة ${hold.holdDays || 0} يوم`
      : `For ${hold.holdDays || 0} days`;
  })();

  const endDate = hold.holdEndDate
    ? new Date(hold.holdEndDate).toLocaleDateString(isRTL ? "ar-EG" : "en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : null;

  return (
    <div className="rounded-xl p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <PauseCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-black text-sm text-amber-900 dark:text-amber-300">
              {isRTL ? "الجروب على Hold حاليًا" : "Group is currently on hold"}
            </p>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200 font-bold">
              {holdLabel}
            </span>
            {/* ✅ لو مش full hold، نبين عدد السيشنات المقفولة */}
            {!isFull && totalActive > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold">
                {isRTL
                  ? `${lockedCount} من ${totalActive} سيشن مقفولة`
                  : `${lockedCount} of ${totalActive} sessions locked`}
              </span>
            )}
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
            {isFull
              ? (isRTL
                  ? "كل جلسات الجروب معلّقة — مفيش رسائل بتتبعت، ومفيش ساعات بتتخصم. هتقدر تعدّل بيانات الجلسات، بس مش هتقدر تحدّدها كمكتملة أو تبعت تذكيرات."
                  : "All sessions are paused — no messages sent, no credits deducted. You can edit sessions, but can't mark them as completed or send reminders.")
              : (isRTL
                  ? `عدد محدود من الجلسات مقفول حاليًا (${lockedCount}). الجلسات المقفولة مش هتقدر تبعت تذكيراتها ولا تحدّدها كمكتملة.`
                  : `${lockedCount} session(s) are paused. Locked sessions can't have reminders sent or be marked as completed.`)}
          </p>
          {endDate && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5">
              {isRTL ? `مجدول ينتهي: ${endDate}` : `Scheduled to end: ${endDate}`}
            </p>
          )}
          {hold.holdReason && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 italic">
              {isRTL ? "السبب" : "Reason"}: {hold.holdReason}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ✅ SessionRowHoldBadge — Badge صغير على السيشن المقفولة
// ═══════════════════════════════════════════════════════════════════════════
function SessionHoldBadge({ isRTL }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
      <Lock className="w-2.5 h-2.5" />
      {isRTL ? "مقفولة" : "Locked"}
    </span>
  );
}

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

  const checkSessionsLocally = useCallback((sessionsList) => {
    if (!sessionsList || sessionsList.length === 0) return false;
    return sessionsList.every(s => s.status === 'completed' || s.status === 'cancelled');
  }, []);

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

        const groupData = json.group || {};
        setGroup({
          ...groupData,
          _id: groupData._id || groupData.id || groupId,
        });

        // ✅ Auto-detect group completion — مع Hold Guard
        const groupIsOnHold = !!groupData?.hold?.isHeld;
        const groupIsFullHold =
          groupData?.hold?.holdType === "indefinite" ||
          groupData?.hold?.holdType === "duration";

        const canAutoComplete =
          loadedSessions.length > 0 &&
          !filters.status &&
          !filters.upcoming &&
          !filters.past &&
          !groupIsOnHold && // ✅ HOLD GUARD: مش بنفتح المودال لو الجروب على Hold
          !groupIsFullHold;

        if (canAutoComplete) {
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
  // ✅ HOLD STATE — ميمو مركزي واحد
  // ================================================================

  // هل الجروب على Hold؟
  const groupIsOnHold = !!group?.hold?.isHeld;

  // مجموعة الـ IDs المقفولة (Set للبحث السريع O(1))
  const lockedSessionIds = useMemo(() => {
    if (!groupIsOnHold || !sessions.length) return new Set();
    const set = new Set();
    sessions.forEach((s) => {
      if (isSessionLockedByHold(s, group, sessions)) {
        set.add(String(s.id));
      }
    });
    return set;
  }, [groupIsOnHold, group, sessions]);

  // هل كل السيشنات النشطة مقفولة؟ (لمنع إتمام المجموعة)
  const allActiveLocked = useMemo(
    () => areAllActiveSessionsLocked(group, sessions),
    [group, sessions]
  );

  // إحصائيات
  const totalActiveSessions = sessions.filter((s) => s.status !== "completed").length;
  const lockedSessionsCount = lockedSessionIds.size;

  // Helper: هل السيشن دي مقفولة؟
  const isLocked = useCallback(
    (session) => lockedSessionIds.has(String(session.id)),
    [lockedSessionIds]
  );

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
    // ✅ HOLD GUARD
    if (isLocked(session)) {
      toast.error(
        isRTL
          ? "السيشن دي مقفولة بسبب الـ Hold — مينفعش تبعت تذكيرات"
          : "This session is locked due to hold — can't send reminders"
      );
      return;
    }
    setSelectedSession(session);
    setSelectedReminderType(reminderType);
    setReminderModalOpen(true);
  }, [isLocked, isRTL]);

  // ================================================================
  // Completion stats
  // ================================================================
  const completedCount = sessions.filter(s => s.status === 'completed').length;
  const cancelledCount = sessions.filter(s => s.status === 'cancelled').length;
  const totalDone = completedCount + cancelledCount;
  const allDone = sessions.length > 0 && totalDone === sessions.length;

  // ✅ هل نعرض زر إتمام المجموعة؟
  //    - كل الجلسات خلصت (completed/cancelled)
  //    - ومفيش أي سيشن نشطة مقفولة (Hold Guard)
  const canCompleteGroup = allDone && !allActiveLocked && !groupIsOnHold;

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

      {/* ✅ Hold Banner — فيه عدد السيشنات المقفولة */}
      <HoldBanner
        group={group}
        isRTL={isRTL}
        t={t}
        lockedCount={lockedSessionsCount}
        totalActive={totalActiveSessions}
      />

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
            {/* ✅ زر إتمام المجموعة — بس لو كل الجلسات خلصت ومفيش أي Hold نشط */}
            {canCompleteGroup && (
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

        {/* ✅ Progress bar لو كل الجلسات خلصت ومفيش Hold */}
        {allDone && canCompleteGroup && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg flex items-center gap-3">
            <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
              {isRTL
                ? `🎉 تم إنهاء جميع الجلسات (${completedCount} مكتملة، ${cancelledCount} ملغاة)! يمكنك الآن إرسال رسائل إتمام المجموعة.`
                : `🎉 All sessions finished (${completedCount} completed, ${cancelledCount} cancelled)! You can now send group completion messages.`}
            </p>
          </div>
        )}

        {/* ✅ لو كل الجلسات خلصت بس فيه Hold */}
        {allDone && !canCompleteGroup && groupIsOnHold && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center gap-3">
            <PauseCircle className="w-5 h-5 text-gray-400 shrink-0" />
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {isRTL
                ? `الجلسات كلها خلصت (${completedCount} مكتملة، ${cancelledCount} ملغاة)، بس الجروب على Hold — مش هينفع إتمام المجموعة لحد ما تفك الـ Hold.`
                : `All sessions finished (${completedCount} completed, ${cancelledCount} cancelled), but the group is on hold — group completion is disabled until the hold is released.`}
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
              {sessions.map((session) => {
                const sessionIsLocked = isLocked(session);

                return (
                  <tr
                    key={session.id}
                    className={`hover:bg-gray-50 dark:hover:bg-dark_input ${
                      sessionIsLocked ? "bg-amber-50/40 dark:bg-amber-500/5" : ""
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{session.title}</p>
                          {/* ✅ Badge على السيشن المقفولة */}
                          {sessionIsLocked && <SessionHoldBadge isRTL={isRTL} />}
                        </div>
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
                        {/* ✅ زراير التذكيرات — تظهر بس لو السيشن مش مقفولة */}
                        {session.status === 'scheduled' && !sessionIsLocked && (
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
                        {session.status === 'scheduled' && sessionIsLocked && (
                          <span
                            className="p-1.5 rounded opacity-40 cursor-not-allowed"
                            title={isRTL ? 'التذكيرات مقفولة بسبب الـ Hold' : 'Reminders locked due to hold'}
                          >
                            <Lock className="w-4 h-4 text-amber-600" />
                          </span>
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
                );
              })}
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

      {editModalOpen && selectedSession && (
        <EditSessionModal
          session={selectedSession}
          groupStudents={groupStudents}
          allSessions={sessions}
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

      {completionModalOpen && (
        <GroupCompletionModal
          group={group || {
            _id: groupId,
            name: group?.name || '',
            code: group?.code || '',
            courseSnapshot: group?.courseSnapshot || null,
            courseId: group?.courseId || null
          }}
          groupId={groupId}
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