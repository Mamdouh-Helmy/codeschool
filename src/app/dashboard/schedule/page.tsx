"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/app/context/LocaleContext";
import { useI18n } from "@/i18n/I18nProvider";
import StudentSidebar from "../StudentSidebar";
import StudentHeader from "../StudentHeader";
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Play,
  CheckCircle,
  X,
  BookOpen,
  Video,
  ExternalLink,
  Filter,
  List,
  Grid3X3,
  CalendarDays,
  Loader2,
  AlertCircle,
  Sparkles,
  Users,
  LayoutGrid,
  Radio,
  Award,
  TrendingUp,
  Eye,
  RefreshCw,
  MapPin,
  Zap,
} from "lucide-react";

// ── Types ──
interface SessionColorScheme {
  gradient: string;
  bg: string;
  border: string;
  text: string;
  dot: string;
}

interface SessionItem {
  _id: string;
  title: string;
  courseTitle: string;
  groupName: string;
  groupCode: string;
  groupId: string;
  scheduledDate: string;
  dateStr: string;
  startTime: string;
  endTime: string;
  formattedDate: string;
  formattedDateAr: string;
  dayName: string;
  dayNameAr: string;
  status: "scheduled" | "completed" | "cancelled" | "postponed";
  attendanceTaken: boolean;
  attendanceStatus: "present" | "absent" | "late" | "excused" | null;
  meetingLink?: string;
  recordingLink?: string;
  moduleIndex: number;
  sessionNumber: number;
  meetingPlatform?: string;
  isToday: boolean;
  isPast: boolean;
  isUpcoming: boolean;
  colorScheme: SessionColorScheme;
  lessonIndexes: number[];
}

interface GroupFilter {
  _id: string;
  name: string;
  code: string;
  courseTitle: string;
  status: string;
}

interface Stats {
  total: number;
  completed: number;
  upcoming: number;
  today: number;
  cancelled: number;
}

interface ScheduleData {
  sessions: SessionItem[];
  groups: GroupFilter[];
  stats: Stats;
  dateRange: { start: string; end: string };
  view: string;
}

// ── Calendar helpers ──
const DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_AR = ["أحد", "إث", "ثل", "أرب", "خم", "جم", "سب"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

// ── Status Badge ──
const StatusBadge = ({ status, isRTL }: { status: string; isRTL: boolean }) => {
  const config: Record<string, { label: string; labelAr: string; cls: string }> = {
    scheduled:  { label: "Upcoming",  labelAr: "قادمة",    cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20" },
    completed:  { label: "Done",      labelAr: "مكتملة",   cls: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 border border-green-200 dark:border-green-500/20" },
    cancelled:  { label: "Cancelled", labelAr: "ملغاة",    cls: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20" },
    postponed:  { label: "Postponed", labelAr: "مؤجلة",   cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20" },
  };
  const c = config[status] || config.scheduled;
  return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.cls}`}>{isRTL ? c.labelAr : c.label}</span>;
};

// ── Attendance Badge ──
const AttendanceBadge = ({ status, isRTL }: { status: string | null; isRTL: boolean }) => {
  if (!status) return null;
  const config: Record<string, { label: string; labelAr: string; cls: string }> = {
    present:  { label: "Present",  labelAr: "حاضر",    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" },
    absent:   { label: "Absent",   labelAr: "غائب",    cls: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400" },
    late:     { label: "Late",     labelAr: "متأخر",   cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" },
    excused:  { label: "Excused",  labelAr: "معذور",   cls: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400" },
  };
  const c = config[status] || config.present;
  return <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium ${c.cls}`}>{isRTL ? c.labelAr : c.label}</span>;
};

// ── Session Card (List View) ──
const SessionCard = ({ session, isRTL }: { session: SessionItem; isRTL: boolean }) => {
  const [expanded, setExpanded] = useState(false);
  const cs = session.colorScheme;

  return (
    <div
      className={`group relative scrollbar-hide bg-white dark:bg-[#161b22] rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-xl dark:hover:border-[#3d444d] cursor-pointer ${
        session.isToday
          ? "border-primary shadow-lg shadow-primary/10 dark:border-primary/50"
          : "border-gray-100 dark:border-[#30363d] hover:shadow-md"
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Left accent bar */}
      <div className={`absolute top-0 ${isRTL ? "right-0" : "left-0"} w-1 h-full bg-gradient-to-b ${cs.gradient}`} />

      {/* Today pulse */}
      {session.isToday && (
        <div className={`absolute top-3 ${isRTL ? "left-3" : "right-3"}`}>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
          </span>
        </div>
      )}

      <div className={`p-4 ${isRTL ? "pr-5" : "pl-5"}`}>
        <div className="flex items-start justify-between gap-3">
          {/* Main info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cs.gradient} flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform`}>
              {session.status === "completed" ? (
                <CheckCircle className="w-5 h-5 text-white" />
              ) : session.status === "cancelled" ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h4 className="font-bold text-gray-900 dark:text-[#e6edf3] text-sm truncate max-w-xs">
                  {session.title}
                </h4>
                {session.isToday && (
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full border border-primary/20 animate-pulse">
                    {isRTL ? "اليوم" : "TODAY"}
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-500 dark:text-[#8b949e] mb-2 flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                {session.courseTitle} · {isRTL ? session.groupName : session.groupName}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-[#8b949e]">
                  <Calendar className="w-3 h-3" />
                  {isRTL ? session.formattedDateAr : session.formattedDate}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-[#8b949e]">
                  <Clock className="w-3 h-3" />
                  {session.startTime} - {session.endTime}
                </span>
                <StatusBadge status={session.status} isRTL={isRTL} />
                <AttendanceBadge status={session.attendanceStatus} isRTL={isRTL} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={`flex items-center gap-2 flex-shrink-0`} onClick={e => e.stopPropagation()}>
            {session.meetingLink && session.status === "scheduled" && session.isToday && (
              <a
                href={session.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary to-purple-600 text-white text-xs font-semibold rounded-lg hover:shadow-lg hover:shadow-primary/30 transition-all hover:scale-105"
              >
                <Video className="w-3 h-3" />
                {isRTL ? "انضم" : "Join"}
              </a>
            )}
            {session.recordingLink && session.status === "completed" && (
              <a
                href={session.recordingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-[#21262d] text-gray-700 dark:text-[#8b949e] text-xs font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-[#30363d] transition-all"
              >
                <Play className="w-3 h-3" />
                {isRTL ? "تسجيل" : "Replay"}
              </a>
            )}
            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${expanded ? "rotate-90" : ""}`} />
          </div>
        </div>

        {/* Expanded details */}
        <div className={`overflow-hidden transition-all duration-300 ${expanded ? "max-h-40 mt-4" : "max-h-0"}`}>
          <div className="pt-3 border-t border-gray-100 dark:border-[#30363d] grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-[10px] text-gray-400 dark:text-[#6e7681] mb-0.5">{isRTL ? "الوحدة" : "Module"}</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-[#e6edf3]">
                {isRTL ? `وحدة ${session.moduleIndex + 1}` : `Module ${session.moduleIndex + 1}`}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 dark:text-[#6e7681] mb-0.5">{isRTL ? "الجلسة" : "Session"}</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-[#e6edf3]">
                {isRTL ? `جلسة ${session.sessionNumber}` : `Session ${session.sessionNumber}`}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 dark:text-[#6e7681] mb-0.5">{isRTL ? "الدروس" : "Lessons"}</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-[#e6edf3]">
                {session.lessonIndexes.map(i => i + 1).join(" & ") || "-"}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 dark:text-[#6e7681] mb-0.5">{isRTL ? "الحضور" : "Attendance"}</p>
              <AttendanceBadge status={session.attendanceStatus} isRTL={isRTL} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Month Calendar ──
const MonthCalendar = ({
  currentDate,
  sessions,
  isRTL,
  onDayClick,
  selectedDay,
}: {
  currentDate: Date;
  sessions: SessionItem[];
  isRTL: boolean;
  onDayClick: (day: number) => void;
  selectedDay: number | null;
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const days = isRTL ? DAYS_AR : DAYS_EN;

  // Group sessions by date
  const sessionsByDate: Record<string, SessionItem[]> = {};
  sessions.forEach(s => {
    if (!sessionsByDate[s.dateStr]) sessionsByDate[s.dateStr] = [];
    sessionsByDate[s.dateStr].push(s);
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] overflow-hidden shadow-lg dark:shadow-black/40">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-100 dark:border-[#30363d]">
        {days.map(d => (
          <div key={d} className="py-3 text-center text-xs font-semibold text-gray-500 dark:text-[#8b949e]">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} className="h-20 sm:h-24 border-b border-r border-gray-50 dark:border-[#21262d]" />;

          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const daySessions = sessionsByDate[dateStr] || [];
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
          const isSelected = selectedDay === day;

          return (
            <button
              key={idx}
              onClick={() => onDayClick(day)}
              className={`h-20 sm:h-24 p-1.5 sm:p-2 border-b border-r border-gray-50 dark:border-[#21262d] text-left transition-all duration-200 group ${
                isSelected
                  ? "bg-primary/5 dark:bg-primary/10"
                  : "hover:bg-gray-50 dark:hover:bg-[#1c2128]"
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold mb-1 transition-colors ${
                isToday
                  ? "bg-gradient-to-br from-primary to-purple-600 text-white shadow-md shadow-primary/30"
                  : isSelected
                    ? "bg-primary/15 text-primary"
                    : "text-gray-700 dark:text-[#8b949e] group-hover:bg-gray-200 dark:group-hover:bg-[#30363d]"
              }`}>
                {day}
              </div>

              <div className="space-y-0.5 overflow-hidden">
                {daySessions.slice(0, 2).map(s => (
                  <div
                    key={s._id}
                    className={`text-[10px] font-medium truncate px-1 py-0.5 rounded ${s.colorScheme.bg} ${s.colorScheme.text} dark:bg-opacity-20`}
                  >
                    {s.startTime} {s.title.substring(0, 12)}
                  </div>
                ))}
                {daySessions.length > 2 && (
                  <div className="text-[10px] text-gray-400 dark:text-[#6e7681] px-1">
                    +{daySessions.length - 2} {isRTL ? "أكثر" : "more"}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── Week View ──
const WeekView = ({ sessions, currentDate, isRTL }: { sessions: SessionItem[]; currentDate: Date; isRTL: boolean }) => {
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentDate);
    d.setDate(currentDate.getDate() - currentDate.getDay() + i);
    return d;
  });

  const today = new Date().toDateString();

  return (
    <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] overflow-hidden shadow-lg">
      <div className="grid grid-cols-7 border-b border-gray-100 dark:border-[#30363d]">
        {weekDays.map((d, i) => {
          const isToday = d.toDateString() === today;
          return (
            <div key={i} className={`p-3 text-center ${isToday ? "bg-primary/5 dark:bg-primary/10" : ""}`}>
              <p className="text-xs text-gray-500 dark:text-[#8b949e] mb-1">
                {(isRTL ? DAYS_AR : DAYS_EN)[d.getDay()]}
              </p>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mx-auto ${
                isToday ? "bg-gradient-to-br from-primary to-purple-600 text-white shadow-md" : "text-gray-700 dark:text-[#e6edf3]"
              }`}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-7 min-h-64">
        {weekDays.map((d, i) => {
          const dateStr = d.toISOString().split("T")[0];
          const daySessions = sessions.filter(s => s.dateStr === dateStr);
          const isToday = d.toDateString() === today;

          return (
            <div key={i} className={`p-2 border-r border-gray-50 dark:border-[#21262d] last:border-r-0 ${isToday ? "bg-primary/5 dark:bg-primary/5" : ""}`}>
              {daySessions.map(s => (
                <div
                  key={s._id}
                  className={`mb-2 p-2 rounded-xl text-[10px] font-medium bg-gradient-to-br ${s.colorScheme.gradient} text-white shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
                >
                  <p className="font-bold truncate">{s.startTime}</p>
                  <p className="truncate opacity-90 mt-0.5">{s.title.substring(0, 15)}</p>
                  {s.meetingLink && s.status === "scheduled" && s.isToday && (
                    <a href={s.meetingLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      className="mt-1 flex items-center gap-0.5 opacity-80 hover:opacity-100">
                      <Video className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ══════════════ MAIN COMPONENT ══════════════
export default function SchedulePage() {
  const { locale } = useLocale();
  const isRTL = locale === "ar";
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ScheduleData | null>(null);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [view, setView] = useState<"month" | "week" | "list">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedDaySessions, setSelectedDaySessions] = useState<SessionItem[]>([]);

  const fetchSchedule = useCallback(async (showRefresh = false) => {
    try {
      if (!showRefresh) setLoading(true);
      setError("");

      // Fetch user data
      const dashRes = await fetch("/api/student/dashboard", { credentials: "include" });
      const dashData = await dashRes.json();
      if (dashData.success) {
        setUser(dashData.data.user);
        setNotifications(dashData.data.notifications || []);
      }

      const params = new URLSearchParams({
        view,
        date: currentDate.toISOString(),
        group: groupFilter,
        status: statusFilter,
      });

      const res = await fetch(`/api/student/schedule?${params}`, { credentials: "include" });
      const json = await res.json();

      if (!res.ok || !json.success) throw new Error(json.message || "فشل في تحميل الجدول");
      setData(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [view, currentDate, groupFilter, statusFilter]);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

  // When a day is clicked in month view
  const handleDayClick = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const daySessions = data?.sessions.filter(s => s.dateStr === dateStr) || [];
    setSelectedDay(day);
    setSelectedDaySessions(daySessions);
  };

  const navigatePrev = () => {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() - 1);
    else if (view === "week") d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
    setSelectedDay(null);
  };

  const navigateNext = () => {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() + 1);
    else if (view === "week") d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
    setSelectedDay(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(new Date().getDate());
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("token");
    router.push("/");
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0d1117] flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-primary/30 mb-4 animate-pulse">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-500 dark:text-[#8b949e] text-sm">{isRTL ? "جارٍ تحميل الجدول..." : "Loading schedule..."}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0d1117]" dir={isRTL ? "rtl" : "ltr"}>
        <div className="text-center p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-[#8b949e] mb-4">{error}</p>
          <button onClick={() => fetchSchedule()} className="px-6 py-3 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl font-semibold">
            {isRTL ? "إعادة المحاولة" : "Try Again"}
          </button>
        </div>
      </div>
    );
  }

  const { sessions = [], groups = [], stats } = data || {};
  const months = isRTL ? MONTHS_AR : MONTHS_EN;

  // Sessions to show in the side panel (month/week view)
  const listSessions = selectedDay
    ? selectedDaySessions
    : sessions.filter(s => {
        const d = new Date(s.scheduledDate);
        return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
      });

  const statsCards = [
    { icon: CalendarDays, label: isRTL ? "إجمالي الجلسات" : "Total Sessions",  value: stats?.total || 0,     gradient: "from-blue-400 to-cyan-500",   shadow: "shadow-blue-500/20" },
    { icon: CheckCircle,  label: isRTL ? "مكتملة"          : "Completed",       value: stats?.completed || 0, gradient: "from-green-400 to-emerald-500",shadow: "shadow-green-500/20" },
    { icon: Zap,          label: isRTL ? "قادمة"            : "Upcoming",        value: stats?.upcoming || 0,  gradient: "from-purple-400 to-pink-500",  shadow: "shadow-purple-500/20" },
    { icon: Radio,        label: isRTL ? "اليوم"            : "Today",           value: stats?.today || 0,     gradient: "from-primary to-violet-600",  shadow: "shadow-primary/20" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22] flex relative" dir={isRTL ? "rtl" : "ltr"}>
      {/* Sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed lg:static inset-y-0 ${isRTL ? "right-0" : "left-0"} z-50 transform transition-all duration-500 ${
        sidebarOpen ? "translate-x-0" : (isRTL ? "translate-x-full" : "-translate-x-full") + " lg:translate-x-0"
      } flex-shrink-0`}>
        <StudentSidebar user={user} onLogout={handleLogout} />
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <StudentHeader
          user={user || { _id: "", name: "", email: "", role: "student" }}
          notifications={notifications}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          onRefresh={() => fetchSchedule(true)}
        />

        <div className="p-4 sm:p-6 lg:p-8 space-y-6">

          {/* ── Page Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-[#e6edf3] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                {isRTL ? "جدولي الدراسي" : "My Schedule"}
              </h1>
              <p className="text-sm text-gray-500 dark:text-[#8b949e] mt-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                {isRTL ? "تابع جلساتك ومواعيدك الدراسية" : "Track your sessions and study appointments"}
              </p>
            </div>

            {/* View switcher */}
            <div className="flex items-center gap-2 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl p-1 shadow-sm">
              {([
                { key: "month", icon: Grid3X3,  labelEn: "Month",  labelAr: "شهر" },
                { key: "week",  icon: CalendarDays, labelEn: "Week", labelAr: "أسبوع" },
                { key: "list",  icon: List,     labelEn: "List",   labelAr: "قائمة" },
              ] as const).map(({ key, icon: Icon, labelEn, labelAr }) => (
                <button
                  key={key}
                  onClick={() => { setView(key); setSelectedDay(null); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    view === key
                      ? "bg-gradient-to-r from-primary to-purple-600 text-white shadow-md"
                      : "text-gray-500 dark:text-[#8b949e] hover:bg-gray-100 dark:hover:bg-[#21262d]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{isRTL ? labelAr : labelEn}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Stats Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statsCards.map(({ icon: Icon, label, value, gradient, shadow }) => (
              <div key={label} className={`group relative bg-white dark:bg-[#161b22] rounded-2xl p-5 border border-gray-100 dark:border-[#30363d] shadow-lg dark:shadow-black/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5`}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg ${shadow} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-[#e6edf3]">{value}</p>
                <p className="text-xs text-gray-500 dark:text-[#8b949e] mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* ── Filters Row ── */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Navigation */}
            <div className="flex items-center gap-2 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl px-2 py-1.5 shadow-sm">
              <button onClick={navigatePrev} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded-lg transition-colors">
                {isRTL ? <ChevronRight className="w-4 h-4 text-gray-600 dark:text-[#8b949e]" /> : <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-[#8b949e]" />}
              </button>
              <span className="text-sm font-semibold text-gray-900 dark:text-[#e6edf3] min-w-32 text-center">
                {view === "week"
                  ? `${isRTL ? "أسبوع" : "Week of"} ${currentDate.getDate()} ${months[currentDate.getMonth()]}`
                  : `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
              </span>
              <button onClick={navigateNext} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded-lg transition-colors">
                {isRTL ? <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-[#8b949e]" /> : <ChevronRight className="w-4 h-4 text-gray-600 dark:text-[#8b949e]" />}
              </button>
            </div>

            <button
              onClick={goToToday}
              className="px-3 py-2 bg-primary/10 text-primary text-sm font-semibold rounded-xl hover:bg-primary/20 transition-colors border border-primary/20"
            >
              {isRTL ? "اليوم" : "Today"}
            </button>

            {/* Group filter */}
            {groups.length > 1 && (
              <select
                value={groupFilter}
                onChange={e => setGroupFilter(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl text-sm text-gray-700 dark:text-[#e6edf3] focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
              >
                <option value="all">{isRTL ? "كل المجموعات" : "All Groups"}</option>
                {groups.map(g => (
                  <option key={g._id} value={g._id}>{g.name}</option>
                ))}
              </select>
            )}

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl text-sm text-gray-700 dark:text-[#e6edf3] focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
            >
              <option value="all">{isRTL ? "كل الحالات" : "All Status"}</option>
              <option value="scheduled">{isRTL ? "قادمة" : "Upcoming"}</option>
              <option value="completed">{isRTL ? "مكتملة" : "Completed"}</option>
              <option value="cancelled">{isRTL ? "ملغاة" : "Cancelled"}</option>
            </select>

            <button onClick={() => fetchSchedule(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded-xl transition-colors ml-auto">
              <RefreshCw className="w-4 h-4 text-gray-500 dark:text-[#8b949e]" />
            </button>
          </div>

          {/* ── Main Grid ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Calendar / Week view */}
            <div className={view === "list" ? "xl:col-span-3" : "xl:col-span-2"}>
              {view === "month" && (
                <MonthCalendar
                  currentDate={currentDate}
                  sessions={sessions}
                  isRTL={isRTL}
                  onDayClick={handleDayClick}
                  selectedDay={selectedDay}
                />
              )}
              {view === "week" && (
                <WeekView
                  sessions={sessions}
                  currentDate={currentDate}
                  isRTL={isRTL}
                />
              )}
              {view === "list" && (
                <div className="space-y-3">
                  {sessions.length > 0 ? (
                    sessions.map(s => <SessionCard key={s._id} session={s} isRTL={isRTL} />)
                  ) : (
                    <div className="text-center py-16 bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d]">
                      <Calendar className="w-16 h-16 text-gray-300 dark:text-[#6e7681] mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-[#8b949e]">{isRTL ? "لا توجد جلسات في هذه الفترة" : "No sessions in this period"}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Side Panel (month/week view) */}
            {view !== "list" && (
              <div className="xl:col-span-1 space-y-4">
                {/* Selected day sessions */}
                <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] shadow-lg dark:shadow-black/40 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 dark:border-[#30363d] bg-gradient-to-r from-primary/5 to-purple-600/5">
                    <h3 className="font-bold text-gray-900 dark:text-[#e6edf3] flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-primary" />
                      {selectedDay
                        ? `${isRTL ? "" : ""}${selectedDay} ${months[currentDate.getMonth()]}`
                        : (isRTL ? "جلسات الشهر" : "Month Sessions")}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-[#8b949e] mt-0.5">
                      {listSessions.length} {isRTL ? "جلسة" : "sessions"}
                    </p>
                  </div>

                  <div className="p-3 space-y-2 max-h-96 overflow-y-auto scrollbar-hide">
                    {listSessions.length > 0 ? (
                      listSessions.map(s => <SessionCard key={s._id} session={s} isRTL={isRTL} />)
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="w-10 h-10 text-gray-300 dark:text-[#6e7681] mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-[#8b949e]">
                          {isRTL ? "لا توجد جلسات" : "No sessions"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Groups summary */}
                {groups.length > 0 && (
                  <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] shadow-lg dark:shadow-black/40 p-4">
                    <h3 className="font-bold text-gray-900 dark:text-[#e6edf3] mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      {isRTL ? "مجموعاتي" : "My Groups"}
                    </h3>
                    <div className="space-y-2">
                      {groups.map((g, idx) => {
                        const colors = [
                          "from-blue-500 to-cyan-500",
                          "from-green-400 to-emerald-500",
                          "from-pink-500 to-rose-500",
                          "from-amber-400 to-orange-500",
                          "from-purple-500 to-indigo-600",
                        ];
                        return (
                          <div key={g._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-[#1c2128] transition-colors">
                            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${colors[idx % colors.length]} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                              <Users className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-[#e6edf3] truncate">{g.name}</p>
                              <p className="text-xs text-gray-500 dark:text-[#8b949e] truncate">{g.courseTitle}</p>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              g.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400" : "bg-gray-100 text-gray-600 dark:bg-[#21262d] dark:text-[#8b949e]"
                            }`}>
                              {g.status === "active" ? (isRTL ? "نشط" : "Active") : (isRTL ? "مكتمل" : "Done")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .animate-ping {
          animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}