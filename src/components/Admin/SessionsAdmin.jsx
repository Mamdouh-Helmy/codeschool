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
  ClipboardCheck,
  Trophy,
  PauseCircle,
  Lock,
  ChevronLeft,
  ChevronRight,
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
// ✅ Hold Utilities — same logic as before, untouched
// ═══════════════════════════════════════════════════════════════════════════
function sortSessionsForHold(sessions) {
  return [...sessions].sort((a, b) => {
    if (a.moduleIndex !== b.moduleIndex) return a.moduleIndex - b.moduleIndex;
    if (a.sessionNumber !== b.sessionNumber) return a.sessionNumber - b.sessionNumber;
    return new Date(a.scheduledDate) - new Date(b.scheduledDate);
  });
}

function isSessionLockedByHold(session, group, allSessions) {
  if (!group?.isOnHold) return false;
  if (session.status === "completed") return false;

  const hold = group.hold;
  if (!hold) return false;

  if (hold.holdType === "indefinite" || hold.holdType === "duration") return true;

  const sorted = sortSessionsForHold(allSessions);
  const myIndex = sorted.findIndex((s) => String(s.id) === String(session.id));
  if (myIndex === -1) return false;

  if (hold.holdType === "sessions") {
    const consumed = hold.holdSessionsConsumed || 0;
    if (consumed === 0) return true;
    return myIndex < consumed;
  }

  if (hold.holdType === "until_session") {
    const targetId = hold.holdUntilSessionId;
    if (!targetId) return true;
    const targetIndex = sorted.findIndex((s) => String(s.id) === String(targetId) || String(s._id) === String(targetId));
    if (targetIndex === -1) return true;
    return myIndex <= targetIndex;
  }

  return false;
}

function areAllActiveSessionsLocked(group, allSessions) {
  if (!group?.isOnHold) return false;
  const active = allSessions.filter((s) => s.status !== "completed");
  if (active.length === 0) return false;
  return active.every((s) => isSessionLockedByHold(s, group, allSessions));
}

// ═══════════════════════════════════════════════════════════════════════════
// ✅ Design primitives
// ═══════════════════════════════════════════════════════════════════════════

const STATUS_STYLES = {
  scheduled: { dot: "bg-sky-500", text: "text-sky-700 dark:text-sky-300", bg: "bg-sky-50 dark:bg-sky-500/10" },
  completed: { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
  cancelled: { dot: "bg-rose-500", text: "text-rose-700 dark:text-rose-300", bg: "bg-rose-50 dark:bg-rose-500/10" },
  postponed: { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-500/10" },
};

function StatusChip({ status, label }) {
  const s = STATUS_STYLES[status] || { dot: "bg-slate-400", text: "text-slate-600 dark:text-slate-300", bg: "bg-slate-100 dark:bg-white/5" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {label}
    </span>
  );
}

function SessionHoldBadge({ isRTL }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
      <Lock className="h-2.5 w-2.5" />
      {isRTL ? "مقفولة" : "Locked"}
    </span>
  );
}

function HoldBanner({ group, isRTL, lockedCount = 0, totalActive = 0 }) {
  const hold = group?.hold;
  if (!group?.isOnHold || !hold) return null;

  const isFull = hold.holdType === "indefinite" || hold.holdType === "duration";

  const holdLabel = (() => {
    if (hold.holdType === "indefinite") return isRTL ? "مفتوح لحد ما تفكّه يدويًا" : "Indefinite — release manually";
    if (hold.holdType === "sessions")
      return isRTL
        ? `لعدد ${hold.holdSessionsCount} سيشنات (اتستهلك ${hold.holdSessionsConsumed || 0})`
        : `${hold.holdSessionsCount} sessions (${hold.holdSessionsConsumed || 0} used)`;
    if (hold.holdType === "until_session") return isRTL ? "لحد سيشن محددة" : "Until a specific session";
    return isRTL ? `لمدة ${hold.holdDays || 0} يوم` : `${hold.holdDays || 0} days`;
  })();

  const endDate = hold.holdEndDate
    ? new Date(hold.holdEndDate).toLocaleDateString(isRTL ? "ar-EG" : "en-US", { weekday: "short", day: "numeric", month: "short" })
    : null;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/20">
        <PauseCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-amber-900 dark:text-amber-300">
            {isRTL ? "الجروب على Hold حاليًا" : "Group is currently on hold"}
          </p>
          <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
            {holdLabel}
          </span>
          {!isFull && totalActive > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              {isRTL ? `${lockedCount} من ${totalActive} سيشن مقفولة` : `${lockedCount} of ${totalActive} locked`}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
          {isFull
            ? (isRTL
                ? "كل جلسات الجروب معلّقة — مفيش رسائل بتتبعت، ومفيش ساعات بتتخصم."
                : "All sessions are paused — no messages sent, no credits deducted.")
            : (isRTL
                ? `عدد محدود من الجلسات مقفول حاليًا (${lockedCount}). الجلسات المقفولة مش هتقدر تبعت تذكيراتها ولا تحدّدها كمكتملة.`
                : `${lockedCount} session(s) are paused — they can't send reminders or be marked complete.`)}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-x-4 text-[11px] text-amber-600 dark:text-amber-400">
          {endDate && <span>{isRTL ? `مجدول ينتهي: ${endDate}` : `Ends: ${endDate}`}</span>}
          {hold.holdReason && <span className="italic">{isRTL ? "السبب" : "Reason"}: {hold.holdReason}</span>}
        </div>
      </div>
    </div>
  );
}

function StatPill({ icon: Icon, label, value, tone }) {
  const tones = {
    slate:   "bg-slate-50 text-slate-700 dark:bg-white/5 dark:text-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    rose:    "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    amber:   "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  };
  return (
    <div className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 ${tones[tone] || tones.slate}`}>
      <Icon className="h-4 w-4 shrink-0 opacity-70" />
      <div>
        <p className="text-base font-bold leading-none tabular-nums">{value}</p>
        <p className="mt-0.5 text-[11px] opacity-80">{label}</p>
      </div>
    </div>
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
  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

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

      const res = await fetch(`/api/groups/${groupId}/sessions?${queryParams}`, { cache: "no-store" });
      const json = await res.json();

      if (json.success) {
        const loadedSessions = json.data || [];
        setSessions(loadedSessions);

        const groupData = json.group || {};
        setGroup({ ...groupData, _id: groupData._id || groupData.id || groupId });

        const groupIsOnHold = !!groupData?.hold?.isHeld;

        const canAutoComplete =
          loadedSessions.length > 0 &&
          !filters.status &&
          !filters.upcoming &&
          !filters.past &&
          !groupIsOnHold;

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
      const res = await fetch(`/api/groups/${groupId}/students`, { cache: "no-store" });
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

  const groupIsOnHold = !!group?.hold?.isHeld;

  const lockedSessionIds = useMemo(() => {
    if (!groupIsOnHold || !sessions.length) return new Set();
    const set = new Set();
    sessions.forEach((s) => {
      const locked = s.sessionIsLocked !== undefined ? s.sessionIsLocked : isSessionLockedByHold(s, group, sessions);
      if (locked) set.add(String(s.id));
    });
    return set;
  }, [groupIsOnHold, group, sessions]);

  const allActiveLocked = useMemo(() => areAllActiveSessionsLocked(group, sessions), [group, sessions]);

  const totalActiveSessions = sessions.filter((s) => s.status !== "completed").length;
  const lockedSessionsCount = lockedSessionIds.size;

  const isLocked = useCallback((session) => lockedSessionIds.has(String(session.id)), [lockedSessionIds]);

  const openAttendanceModal = useCallback(async (session) => {
    if (isLocked(session)) {
      toast.error(isRTL ? "السيشن دي مقفولة بسبب الـ Hold — مينفعش تسجل حضور" : "This session is locked due to hold — can't take attendance");
      return;
    }

    setSelectedSession(session);
    setLoadingAttendance(true);
    setAttendanceModalOpen(true);

    try {
      const res = await fetch(`/api/sessions/${session.id}/attendance`, { cache: "no-store" });
      const json = await res.json();

      if (json.success) {
        setAttendanceData(json.data);
      } else {
        toast.error(json.error || t("sessions.attendance.errors.loadFailed"));
        setAttendanceData({ attendance: [], stats: { total: 0, present: 0, absent: 0, late: 0, excused: 0 }, attendanceTaken: false });
      }
    } catch (err) {
      console.error("Error loading attendance:", err);
      toast.error(t("sessions.attendance.errors.loadFailed"));
      setAttendanceData({ attendance: [], stats: { total: 0, present: 0, absent: 0, late: 0, excused: 0 }, attendanceTaken: false });
    } finally {
      setLoadingAttendance(false);
    }
  }, [t, isLocked, isRTL]);

  const openEditModal = useCallback((session) => {
    setSelectedSession(session);
    setEditModalOpen(true);
  }, []);

  const openDetailsModal = useCallback(async (session) => {
    setSelectedSession(session);
    setLoadingAttendance(true);
    setDetailsModalOpen(true);

    try {
      const res = await fetch(`/api/sessions/${session.id}`, { cache: "no-store" });
      const json = await res.json();

      if (json.success) {
        setSelectedSession(json.data);
        const attRes = await fetch(`/api/sessions/${session.id}/attendance`, { cache: "no-store" });
        const attJson = await attRes.json();
        if (attJson.success) setAttendanceData(attJson.data);
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
    if (isLocked(session)) {
      toast.error(isRTL ? "السيشن دي مقفولة بسبب الـ Hold — مينفعش تبعت تذكيرات" : "This session is locked due to hold — can't send reminders");
      return;
    }
    setSelectedSession(session);
    setSelectedReminderType(reminderType);
    setReminderModalOpen(true);
  }, [isLocked, isRTL]);

  const completedCount = sessions.filter(s => s.status === 'completed').length;
  const cancelledCount = sessions.filter(s => s.status === 'cancelled').length;
  const totalDone = completedCount + cancelledCount;
  const allDone = sessions.length > 0 && totalDone === sessions.length;
  const canCompleteGroup = allDone && !groupIsOnHold;

  if (!groupId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-500/10">
          <AlertCircle className="h-7 w-7 text-rose-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t("sessions.errors.noGroupSelected")}</h3>
        <p className="max-w-sm text-sm text-slate-500">{t("sessions.errors.selectGroupFirst")}</p>
        <button onClick={() => router.push('/admin/groups')} className="mt-2 rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900">
          {t("sessions.buttons.goToGroups")}
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5" dir={isRTL ? 'rtl' : 'ltr'}>

      <HoldBanner group={group} isRTL={isRTL} lockedCount={lockedSessionsCount} totalActive={totalActiveSessions} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#12141c] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <button
              onClick={() => router.push('/admin/groups')}
              className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              <BackIcon className="h-3.5 w-3.5" />
              {t("sessions.buttons.backToGroups")}
            </button>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              {t("sessions.title")} — {group?.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t("sessions.groupCode")}: <span className="font-mono">{group?.code}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canCompleteGroup && (
              <button
                onClick={() => setCompletionModalOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-amber-500/20 transition-transform hover:scale-[1.02]"
              >
                <Trophy className="h-4 w-4" />
                {isRTL ? 'إتمام المجموعة' : 'Complete Group'}
              </button>
            )}
            <button
              onClick={() => setStudentsModalOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
            >
              <Users className="h-4 w-4" />
              {t("sessions.buttons.viewStudents")}
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold dark:bg-white/10">{groupStudents.length}</span>
            </button>
          </div>
        </div>

        {/* stat pills */}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatPill icon={Calendar} label={isRTL ? "الإجمالي" : "Total"} value={sessions.length} tone="slate" />
          <StatPill icon={CheckCircle} label={isRTL ? "مكتملة" : "Completed"} value={completedCount} tone="emerald" />
          <StatPill icon={XCircle} label={isRTL ? "ملغاة" : "Cancelled"} value={cancelledCount} tone="rose" />
          <StatPill icon={Lock} label={isRTL ? "مقفولة" : "Locked"} value={lockedSessionsCount} tone="amber" />
        </div>

        {allDone && canCompleteGroup && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-700/40 dark:bg-amber-900/20">
            <Trophy className="h-5 w-5 shrink-0 text-amber-500" />
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {isRTL
                ? `🎉 تم إنهاء جميع الجلسات (${completedCount} مكتملة، ${cancelledCount} ملغاة)! يمكنك الآن إرسال رسائل إتمام المجموعة.`
                : `🎉 All sessions finished (${completedCount} completed, ${cancelledCount} cancelled)! You can now send group completion messages.`}
            </p>
          </div>
        )}

        {allDone && !canCompleteGroup && groupIsOnHold && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.02]">
            <PauseCircle className="h-5 w-5 shrink-0 text-slate-400" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {isRTL
                ? `الجلسات كلها خلصت، بس الجروب على Hold — مش هينفع إتمام المجموعة لحد ما تفك الـ Hold.`
                : `All sessions finished, but the group is on hold — completion is disabled until it's released.`}
            </p>
          </div>
        )}
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-white/10 dark:bg-[#12141c]">
        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          <option value="">{t("sessions.filters.allStatuses")}</option>
          <option value="scheduled">{t("sessions.filters.scheduled")}</option>
          <option value="completed">{t("sessions.filters.completed")}</option>
          <option value="cancelled">{t("sessions.filters.cancelled")}</option>
          <option value="postponed">{t("sessions.filters.postponed")}</option>
        </select>

        <div className="flex gap-1.5 rounded-lg bg-slate-100 p-1 dark:bg-white/5">
          <button
            onClick={() => setFilters(prev => ({ ...prev, upcoming: !prev.upcoming, past: false }))}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${filters.upcoming ? 'bg-white text-indigo-600 shadow-sm dark:bg-white/10 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
          >
            {t("sessions.filters.upcoming")}
          </button>
          <button
            onClick={() => setFilters(prev => ({ ...prev, past: !prev.past, upcoming: false }))}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${filters.past ? 'bg-white text-indigo-600 shadow-sm dark:bg-white/10 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
          >
            {t("sessions.filters.past")}
          </button>
        </div>

        <button
          onClick={loadSessions}
          className="ms-auto flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("sessions.buttons.refresh")}
        </button>
      </div>

      {/* ── Sessions List ───────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-white/10">
            <thead className="bg-slate-50 dark:bg-white/[0.03]">
              <tr>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-slate-500">{t("sessions.table.session")}</th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-slate-500">{t("sessions.table.dateTime")}</th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-slate-500">{t("sessions.table.status")}</th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-slate-500">{t("sessions.table.attendance")}</th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-slate-500">{t("sessions.table.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-white/5 dark:bg-transparent">
              {sessions.map((session) => {
                const sessionIsLocked = session.sessionIsLocked !== undefined ? session.sessionIsLocked : isLocked(session);

                return (
                  <tr key={session.id} className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03] ${sessionIsLocked ? "bg-amber-50/30 dark:bg-amber-500/[0.03]" : ""}`}>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white">{session.title}</p>
                        {sessionIsLocked && <SessionHoldBadge isRTL={isRTL} />}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {t("sessions.table.module")} {session.moduleIndex + 1} · {t("sessions.table.session")} {session.sessionNumber}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {formatDate(session.scheduledDate, isRTL)}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock className="h-3 w-3" />
                        {session.startTime} – {session.endTime}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusChip status={session.status} label={getStatusText(session.status, t)} />
                    </td>
                    <td className="px-4 py-3.5">
                      {session.attendanceTaken ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="h-4 w-4" /> {t("sessions.attendance.taken")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm text-slate-400">
                          <XCircle className="h-4 w-4" /> {t("sessions.attendance.notTaken")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50/60 p-1 dark:border-white/5 dark:bg-white/[0.02] w-fit">
                        {session.status === 'scheduled' && !sessionIsLocked && (
                          <>
                            <button onClick={() => openReminderModal(session, '24hours')} className="rounded-md p-1.5 text-sky-600 transition-colors hover:bg-sky-100 dark:text-sky-400 dark:hover:bg-sky-500/20" title={isRTL ? 'إرسال تذكير 24 ساعة' : 'Send 24h reminder'}>
                              <Calendar className="h-4 w-4" />
                            </button>
                            <button onClick={() => openReminderModal(session, '1hour')} className="rounded-md p-1.5 text-amber-600 transition-colors hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-500/20" title={isRTL ? 'إرسال تذكير ساعة' : 'Send 1h reminder'}>
                              <Clock className="h-4 w-4" />
                            </button>
                          </>
                        )}

                        {session.status === 'scheduled' && sessionIsLocked && (
                          <span className="cursor-not-allowed rounded-md p-1.5 opacity-40" title={isRTL ? 'التذكيرات مقفولة بسبب الـ Hold' : 'Reminders locked due to hold'}>
                            <Lock className="h-4 w-4 text-amber-600" />
                          </span>
                        )}

                        <button onClick={() => openDetailsModal(session)} className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-white/10" title={t("sessions.buttons.viewDetails")}>
                          <Eye className="h-4 w-4" />
                        </button>

                        <button onClick={() => openEditModal(session)} className="rounded-md p-1.5 text-indigo-600 transition-colors hover:bg-indigo-100 dark:text-indigo-400 dark:hover:bg-indigo-500/20" title={t("sessions.buttons.edit")}>
                          <Edit className="h-4 w-4" />
                        </button>

                        {!sessionIsLocked ? (
                          <button onClick={() => openAttendanceModal(session)} className="rounded-md p-1.5 text-emerald-600 transition-colors hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-500/20" title={t("sessions.buttons.manageAttendance")}>
                            <ClipboardCheck className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="cursor-not-allowed rounded-md p-1.5 opacity-40" title={isRTL ? 'الحضور مقفول بسبب الـ Hold' : 'Attendance locked due to hold'}>
                            <ClipboardCheck className="h-4 w-4 text-amber-600" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sessions.length === 0 && (
          <div className="py-14 text-center">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <h3 className="text-base font-semibold text-slate-700 dark:text-white">{t("sessions.errors.noSessionsFound")}</h3>
            <p className="mt-1 text-sm text-slate-400">
              {filters.status || filters.upcoming || filters.past ? t("sessions.errors.noMatchingFilters") : t("sessions.errors.activateGroup")}
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
    return date.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return 'N/A';
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