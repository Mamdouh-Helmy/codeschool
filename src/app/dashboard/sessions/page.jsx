"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import StudentSidebar from "../StudentSidebar";
import StudentHeader from "../StudentHeader";
import {
  Calendar, Clock, CheckCircle, Lock, Play, Video,
  AlertCircle, ChevronRight, X, BookOpen, Layers,
  Target, ExternalLink, BadgeCheck, Search, Users,
  Timer, FileText, Info,
} from "lucide-react";
import { useLocale } from "@/app/context/LocaleContext";
import { useI18n } from "@/i18n/I18nProvider";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  primaryGrad: "from-[#8c52ff] to-[#6c3be8]",
  primaryGrad2: "from-[#8c52ff] via-[#7a3ff0] to-[#6c3be8]",
  primaryText: "text-[#8c52ff]",
  primaryBg: "bg-[#8c52ff]",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtTime = (t, locale = 'ar') => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  if (locale === 'ar') {
    return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "م" : "ص"}`;
  } else {
    return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  }
};

const fmtDateShort = (d, locale = 'ar') => {
  if (!d) return "";
  return new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { month: "short", day: "numeric" });
};

const fmtDateFull = (d, locale = 'ar') => {
  if (!d) return "";
  return new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { 
    weekday: "long", year: "numeric", month: "long", day: "numeric" 
  });
};

const fmtDateKey = (d) => new Date(d).toISOString().split("T")[0];

const STATUS = (locale = 'ar') => ({
  completed: { 
    label: locale === 'ar' ? "مكتملة" : "Completed", 
    dot: "bg-emerald-400", 
    badge: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40", 
    icon: CheckCircle 
  },
  scheduled: { 
    label: locale === 'ar' ? "مجدولة" : "Scheduled", 
    dot: "bg-blue-400", 
    badge: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40", 
    icon: Clock 
  },
  cancelled: { 
    label: locale === 'ar' ? "ملغاة" : "Cancelled", 
    dot: "bg-red-400", 
    badge: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40", 
    icon: X 
  },
  postponed: { 
    label: locale === 'ar' ? "مؤجلة" : "Postponed", 
    dot: "bg-amber-400", 
    badge: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40", 
    icon: Clock 
  },
});

const ATT = (locale = 'ar') => ({
  present: { 
    label: locale === 'ar' ? "حاضر" : "Present", 
    color: "text-emerald-600 dark:text-emerald-400", 
    bg: "bg-emerald-50 dark:bg-emerald-900/20", 
    icon: CheckCircle 
  },
  late: { 
    label: locale === 'ar' ? "متأخر" : "Late", 
    color: "text-amber-600 dark:text-amber-400", 
    bg: "bg-amber-50 dark:bg-amber-900/20", 
    icon: Clock 
  },
  excused: { 
    label: locale === 'ar' ? "معذور" : "Excused", 
    color: "text-blue-600 dark:text-blue-400", 
    bg: "bg-blue-50 dark:bg-blue-900/20", 
    icon: BadgeCheck 
  },
  absent: { 
    label: locale === 'ar' ? "غائب" : "Absent", 
    color: "text-red-600 dark:text-red-400", 
    bg: "bg-red-50 dark:bg-red-900/20", 
    icon: X 
  },
});

const PLAT = (locale = 'ar') => ({
  zoom: { 
    label: locale === 'ar' ? "Zoom" : "Zoom", 
    icon: "🔷", 
    grad: "from-blue-500 to-blue-600" 
  },
  google_meet: { 
    label: locale === 'ar' ? "Meet" : "Meet", 
    icon: "🔴", 
    grad: "from-green-500 to-emerald-600" 
  },
  microsoft_teams: { 
    label: locale === 'ar' ? "Teams" : "Teams", 
    icon: "🔵", 
    grad: "from-purple-500 to-indigo-600" 
  },
  other: { 
    label: locale === 'ar' ? "رابط" : "Link", 
    icon: "🔗", 
    grad: C.primaryGrad 
  },
});

// ─── Session Detail Modal ─────────────────────────────────────────────────────
function SessionModal({ session, onClose, locale }) {
  const { t } = useI18n();
  const cfg = STATUS(locale)[session.status] || STATUS(locale).scheduled;
  const att = session.studentAttendance ? ATT(locale)[session.studentAttendance] : null;
  const AttIcon = att?.icon;
  const plat = PLAT(locale)[session.meetingPlatform] || PLAT(locale).other;
  const isCompleted = session.status === "completed";

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4`} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-xl max-h-[92vh] overflow-y-auto bg-white dark:bg-[#161b22] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col">

        {/* Header */}
        <div className={`relative bg-gradient-to-br ${C.primaryGrad} p-6 rounded-t-3xl sm:rounded-t-3xl overflow-hidden flex-shrink-0`}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
          <div className="absolute -top-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
                {att && isCompleted && (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${att.bg} ${att.color} flex items-center gap-1`}>
                    <AttIcon className="w-3 h-3" />{att.label}
                  </span>
                )}
              </div>
              <button onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all flex-shrink-0">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <h2 className="text-lg font-black text-white mb-0.5 leading-snug">{session.title}</h2>
            {session.group?.name && (
              <p className="text-white/60 text-xs font-medium mb-3">{session.group.name}</p>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              <span className="flex items-center gap-1.5 bg-white/15 text-white text-xs px-3 py-1.5 rounded-full border border-white/20">
                <Calendar className="w-3 h-3" />{fmtDateFull(session.scheduledDate, locale)}
              </span>
              <span className="flex items-center gap-1.5 bg-white/15 text-white text-xs px-3 py-1.5 rounded-full border border-white/20">
                <Clock className="w-3 h-3" />{fmtTime(session.startTime, locale)} – {fmtTime(session.endTime, locale)}
              </span>
              <span className="flex items-center gap-1.5 bg-white/15 text-white text-xs px-3 py-1.5 rounded-full border border-white/20">
                <Timer className="w-3 h-3" />{locale === 'ar' ? 'ساعتان' : '2 hours'}
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">

          {/* Join button */}
          {session.showJoinButton && (
            <a href={session.meetingLink} target="_blank" rel="noopener noreferrer"
              className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white font-black text-sm bg-gradient-to-r ${plat.grad} shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all`}>
              <Video className="w-5 h-5" />{t("allSessions.modal.joinMeeting")}<ExternalLink className="w-4 h-4" />
            </a>
          )}

          {/* Recording */}
          {isCompleted && session.recordingLink && (
            <a href={session.recordingLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100 transition-all">
              <Play className="w-4 h-4" />{t("allSessions.modal.watchRecording")}
            </a>
          )}

          {/* Lessons */}
          {session.lessons && session.lessons.length > 0 && (
            <div className="bg-gray-50 dark:bg-[#0d1117]/60 rounded-2xl border border-gray-100 dark:border-[#30363d] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#30363d]">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${C.primaryGrad} flex items-center justify-center`}>
                    <BookOpen className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-[#e6edf3]">{t("allSessions.modal.lessonsCovered")}</span>
                </div>
                <span className={`text-xs font-bold ${C.primaryText} flex items-center gap-1`}>
                  <Timer className="w-3 h-3" />{locale === 'ar' ? 'ساعتان' : '2 hours'}
                </span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-[#21262d]">
                {session.lessons.slice(0, 1).map((lesson, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0
      ${isCompleted
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                          : "bg-[#8c52ff]/10 text-[#8c52ff]"
                        }`}
                    >
                      {i + 1}
                    </div>

                    <span className="flex-1 text-sm text-gray-800 dark:text-[#c9d1d9] font-medium">
                      {lesson.title}
                    </span>

                    {isCompleted && (
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#8c52ff]/5 dark:bg-[#8c52ff]/10 border-t border-[#8c52ff]/20">
                <span className="text-xs text-gray-500 dark:text-[#8b949e]">{t("allSessions.modal.totalDuration")}</span>
                <span className={`text-sm font-black ${C.primaryText}`}>{t("allSessions.modal.duration")}</span>
              </div>
            </div>
          )}

          {/* Materials */}
          {session.materials && session.materials.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-[#e6edf3] mb-2 flex items-center gap-2">
                <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${C.primaryGrad} flex items-center justify-center`}>
                  <FileText className="w-3 h-3 text-white" />
                </div>
                {t("allSessions.modal.materials")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {session.materials.map((mat, i) => (
                  <a key={i} href={mat.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#21262d] border border-gray-200 dark:border-[#30363d] rounded-xl text-xs font-medium text-gray-700 dark:text-[#8b949e] hover:border-[#8c52ff]/50 hover:text-[#8c52ff] transition-all">
                    <FileText className="w-3.5 h-3.5" />{mat.name || `${t("allSessions.modal.file")} ${i + 1}`}<ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {session.instructorNotes && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />{t("allSessions.modal.instructorNotes")}
              </h4>
              <p className="text-sm text-amber-800 dark:text-amber-300/80 leading-relaxed">{session.instructorNotes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Session Row ──────────────────────────────────────────────────────────────
function SessionRow({ session, onOpen, locale }) {
  const { t } = useI18n();
  const cfg = STATUS(locale)[session.status] || STATUS(locale).scheduled;
  const att = session.studentAttendance ? ATT(locale)[session.studentAttendance] : null;
  const AttIcon = att?.icon;
  const plat = PLAT(locale)[session.meetingPlatform] || PLAT(locale).other;

  // Locked = not accessible + scheduled (not completed)
  const isLocked = !session.canAccess && session.status === "scheduled";
  const isCompleted = session.status === "completed";
  const isToday = session.isToday && session.status === "scheduled";

  const handleClick = () => {
    // Locked sessions are not clickable
    if (isLocked) return;
    onOpen(session);
  };

  return (
    <div
      onClick={handleClick}
      className={`group flex items-center gap-3 p-4 rounded-2xl border bg-white dark:bg-[#161b22]
        transition-all duration-200
        ${isLocked
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer hover:-translate-y-0.5 hover:shadow-md"}
        ${isToday
          ? "border-[#8c52ff]/40 shadow-md shadow-[#8c52ff]/10 ring-1 ring-[#8c52ff]/20"
          : isCompleted
            ? "border-emerald-200/60 dark:border-emerald-800/30 hover:shadow-emerald-500/5"
            : "border-gray-100 dark:border-[#30363d] hover:border-gray-200 dark:hover:border-[#3d444d]"}`}
    >
      {/* Bubble */}
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 shadow-sm
        ${isLocked
          ? "bg-gray-100 dark:bg-[#21262d] text-gray-400 dark:text-[#6e7681]"
          : isCompleted
            ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white"
            : isToday
              ? `bg-gradient-to-br ${C.primaryGrad} text-white`
              : "bg-gradient-to-br from-blue-400 to-indigo-500 text-white"}`}>
        {isLocked
          ? <Lock className="w-4 h-4" />
          : isCompleted
            ? <CheckCircle className="w-4 h-4" />
            : session.status === "cancelled"
              ? <X className="w-4 h-4" />
              : <span className="text-xs">{(session.moduleIndex ?? 0) * 3 + (session.sessionNumber ?? 1)}</span>}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          {isToday && (
            <span className={`text-[10px] font-black ${C.primaryText} flex items-center gap-1`}>
              <span className="w-1 h-1 rounded-full bg-[#8c52ff] animate-pulse" />{t("allSessions.today")}
            </span>
          )}
          <h3 className={`font-bold text-sm truncate transition-colors
            ${isLocked ? "text-gray-400 dark:text-[#6e7681]" : `text-gray-900 dark:text-[#e6edf3] ${!isLocked ? "group-hover:text-[#8c52ff]" : ""}`}`}>
            {session.title}
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-[#6e7681] flex-wrap">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDateShort(session.scheduledDate, locale)}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtTime(session.startTime, locale)}</span>
          <span className="flex items-center gap-1"><Timer className="w-3 h-3" />{locale === 'ar' ? 'ساعتان' : '2h'}</span>
          {session.group?.name && (
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{session.group.name}</span>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {att && isCompleted && (
          <span className={`hidden sm:flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${att.bg} ${att.color}`}>
            <AttIcon className="w-3 h-3" />{att.label}
          </span>
        )}
        {session.showJoinButton && (
          <a href={session.meetingLink} target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r ${plat.grad} text-white shadow-md hover:shadow-lg hover:scale-105 transition-all`}>
            <Video className="w-3.5 h-3.5" />{t("allSessions.join")}
          </a>
        )}
        {isCompleted && session.recordingLink && (
          <a href={session.recordingLink} target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100 transition-all">
            <Play className="w-3 h-3" />{t("allSessions.recording")}
          </a>
        )}
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${cfg.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
        </span>
        {!isLocked && (
          <ChevronRight className={`w-4 h-4 text-gray-300 dark:text-[#6e7681] group-hover:text-[#8c52ff] transition-all ${locale === 'ar' ? 'rotate-180' : ''}`} />
        )}
      </div>
    </div>
  );
}

// ─── Date Group Header ────────────────────────────────────────────────────────
function DateHeader({ dateKey, count, locale }) {
  const { t } = useI18n();
  const d = new Date(dateKey);
  const isToday = fmtDateKey(new Date()) === dateKey;
  
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 shadow-sm
        ${isToday ? `bg-gradient-to-br ${C.primaryGrad} text-white` : "bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] text-gray-700 dark:text-[#8b949e]"}`}>
        <span className="text-xs font-black leading-none">{d.getDate()}</span>
        <span className="text-[9px] leading-none mt-0.5 opacity-80">
          {d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { month: "short" })}
        </span>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className={`font-black text-sm ${isToday ? "text-[#8c52ff]" : "text-gray-900 dark:text-[#e6edf3]"}`}>
            {isToday ? t("allSessions.date.today") : d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { weekday: "long" })}
          </span>
          {isToday && <span className="w-2 h-2 rounded-full bg-[#8c52ff] animate-pulse" />}
        </div>
        <span className="text-xs text-gray-400 dark:text-[#6e7681]">
          {d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { month: "long", day: "numeric" })} · {count} {count === 1 ? t("allSessions.date.sessions") : t("allSessions.date.sessions_plural")}
        </span>
      </div>
      <div className="flex-1 h-px bg-gradient-to-l from-gray-200 to-transparent dark:from-[#30363d]" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AllSessionsPage() {
  const { t } = useI18n();
  const { locale, direction } = useLocale();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [groupByDate, setGroupByDate] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [modal, setModal] = useState(null); // selected session for modal

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([
      fetch("/api/student/sessions", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/student/dashboard", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([sessRes, dashRes]) => {
        if (sessRes.success) setData(sessRes.data);
        else setError(sessRes.message || t("allSessions.error"));
        
        if (dashRes.success) {
          setUser(dashRes.data?.user);
          setNotifications(dashRes.data?.notifications || []);
        }
      })
      .catch(() => setError(t("allSessions.errorMessage")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("token");
    router.push("/");
  };

  const currentUser = user || { name: locale === 'ar' ? "طالب" : "Student", email: "", role: "student" };

  const filtered = (data?.sessions || []).filter((s) => {
    const mf =
      filter === "all" ? true :
        filter === "completed" ? s.status === "completed" :
          filter === "upcoming" ? s.status === "scheduled" && s.canAccess :
            filter === "locked" ? !s.canAccess && s.status === "scheduled" :
              filter === "today" ? s.isToday : true;
    const ms = !search ||
      (s.title && s.title.toLowerCase().includes(search.toLowerCase())) ||
      (s.group?.name && s.group.name.toLowerCase().includes(search.toLowerCase()));
    return mf && ms;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.status === "scheduled" && b.status !== "scheduled") return -1;
    if (b.status === "scheduled" && a.status !== "scheduled") return 1;
    return new Date(a.scheduledDate) - new Date(b.scheduledDate);
  });

  const byDate = {};
  sorted.forEach((s) => {
    const dk = fmtDateKey(s.scheduledDate);
    if (!byDate[dk]) byDate[dk] = [];
    byDate[dk].push(s);
  });
  const sortedDates = Object.keys(byDate).sort((a, b) => new Date(a) - new Date(b));

  const joinNow = (data?.sessions || []).filter((s) => s.showJoinButton);

  const sessions = data?.sessions || [];
  const FILTERS = [
    { id: "all", label: t("allSessions.filters.all"), count: data?.stats?.total ?? 0 },
    { id: "upcoming", label: t("allSessions.filters.upcoming"), count: sessions.filter(s => s.canAccess && s.status === "scheduled").length },
    { id: "completed", label: t("allSessions.filters.completed"), count: data?.stats?.completed ?? 0 },
    { id: "today", label: t("allSessions.filters.today"), count: sessions.filter(s => s.isToday).length },
    { id: "locked", label: t("allSessions.filters.locked"), count: sessions.filter(s => !s.canAccess && s.status === "scheduled").length },
  ];

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-[#0d1117] flex`} dir={direction}>

      {/* Sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}
      <div className={`fixed lg:static inset-y-0 ${locale === 'ar' ? 'right-0' : 'left-0'} z-50 transform transition-all duration-500
        ${sidebarOpen 
          ? (locale === 'ar' ? 'translate-x-0' : 'translate-x-0') 
          : (locale === 'ar' ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0')
        } flex-shrink-0`}>
        <StudentSidebar user={currentUser} onLogout={handleLogout} />
      </div>

      <main className="flex-1 min-w-0 flex flex-col">
        <StudentHeader 
          user={currentUser} 
          notifications={notifications}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)} 
          sidebarOpen={sidebarOpen} 
        />

        {/* Sticky toolbar */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md border-b border-gray-200 dark:border-[#30363d]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4 gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${C.primaryGrad} flex items-center justify-center flex-shrink-0`}>
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-black text-gray-900 dark:text-[#e6edf3] leading-none">{t("allSessions.pageTitle")}</h1>
                  {!loading && data && (
                    <p className="text-xs text-gray-400 dark:text-[#6e7681] mt-0.5">
                      {data.stats.completed} {t("allSessions.completed")} · {data.stats.scheduled} {t("allSessions.scheduled")} · {data.stats.total} {t("allSessions.total")}
                    </p>
                  )}
                </div>
              </div>

              {/* Search */}
              <div className="relative hidden sm:block">
                <Search className={`absolute ${locale === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
                <input 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  placeholder={t("allSessions.search")}
                  className={`w-48 bg-gray-100 dark:bg-[#21262d] border border-gray-200 dark:border-[#30363d] rounded-xl ${locale === 'ar' ? 'pr-9 pl-4' : 'pl-9 pr-4'} py-2 text-sm text-gray-900 dark:text-[#e6edf3] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8c52ff]/30 focus:border-[#8c52ff]/60`} />
              </div>

              {/* View toggle */}
              <div className="flex bg-gray-100 dark:bg-[#21262d] rounded-xl p-1 gap-0.5">
                <button onClick={() => setGroupByDate(true)}
                  className={`p-1.5 rounded-lg transition-all ${groupByDate ? `bg-white dark:bg-[#161b22] shadow ${C.primaryText}` : "text-gray-400"}`}
                  title={t("allSessions.view.byDate")}>
                  <Calendar className="w-4 h-4" />
                </button>
                <button onClick={() => setGroupByDate(false)}
                  className={`p-1.5 rounded-lg transition-all ${!groupByDate ? `bg-white dark:bg-[#161b22] shadow ${C.primaryText}` : "text-gray-400"}`}
                  title={t("allSessions.view.list")}>
                  <BookOpen className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-1.5 pb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {FILTERS.map(({ id, label, count }) => (
                <button key={id} onClick={() => setFilter(id)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all
                    ${filter === id
                      ? `bg-[#8c52ff] text-white shadow-md shadow-[#8c52ff]/30`
                      : "bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-[#8b949e] hover:bg-gray-200 dark:hover:bg-[#30363d]"}`}>
                  {label}
                  <span className={`text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-black
                    ${filter === id ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-[#30363d] text-gray-500"}`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">

          {/* Join Now Banner */}
          {joinNow.length > 0 && filter === "all" && (
            <div className={`mb-5 bg-gradient-to-r ${C.primaryGrad} rounded-2xl p-4 text-white relative overflow-hidden`}>
              <div className="absolute -top-6 -left-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Video className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/70 font-medium">{t("allSessions.activeNow")}</p>
                  <p className="font-bold text-sm truncate">{joinNow[0].title}</p>
                </div>
                <a href={joinNow[0].meetingLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white text-[#8c52ff] font-bold text-xs px-4 py-2 rounded-xl hover:bg-purple-50 transition-all shadow-lg flex-shrink-0">
                  <Video className="w-4 h-4" />{t("allSessions.joinNow")}
                </a>
              </div>
            </div>
          )}

          {loading && (
            <div className="space-y-3">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="h-20 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse border border-gray-100 dark:border-[#30363d]" />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-16">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">{error}</p>
              <button onClick={load} className={`px-6 py-3 bg-gradient-to-r ${C.primaryGrad} text-white rounded-xl font-bold hover:shadow-lg transition-all`}>
                {t("allSessions.retry")}
              </button>
            </div>
          )}

          {!loading && !error && sorted.length === 0 && (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto bg-gray-100 dark:bg-[#21262d] rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-10 h-10 text-gray-300 dark:text-[#6e7681]" />
              </div>
              <p className="text-gray-500 dark:text-[#8b949e] font-medium">{t("allSessions.noSessions")}</p>
            </div>
          )}

          {!loading && !error && sorted.length > 0 && (
            groupByDate ? (
              <div className="space-y-7">
                {sortedDates.map((dk) => (
                  <div key={dk}>
                    <DateHeader dateKey={dk} count={byDate[dk].length} locale={locale} />
                    <div className="space-y-2.5" style={{ paddingRight: locale === 'ar' ? "60px" : "0", paddingLeft: locale === 'en' ? "60px" : "0" }}>
                      {byDate[dk].map((s) => (
                        <SessionRow key={s._id} session={s} onOpen={setModal} locale={locale} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {sorted.map((s) => (
                  <SessionRow key={s._id} session={s} onOpen={setModal} locale={locale} />
                ))}
              </div>
            )
          )}
        </div>
      </main>

      {/* Session Detail Modal */}
      {modal && <SessionModal session={modal} onClose={() => setModal(null)} locale={locale} />}
    </div>
  );
}