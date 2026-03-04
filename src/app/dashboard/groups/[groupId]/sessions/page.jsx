"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowRight, Calendar, Clock, CheckCircle, Lock, Play,
    Video, FileText, ChevronDown, ChevronUp, AlertCircle,
    BookOpen, ExternalLink, BadgeCheck, Target, ChevronRight,
    X, Info, Layers, Timer, Award, Users, Hash,
} from "lucide-react";
import { useLocale } from "@/app/context/LocaleContext";
import { useI18n } from "@/i18n/I18nProvider";

// ─── Design tokens — لون أساسي بنفسجي ──────────────────────────────────────
const C = {
    primary: "#8c52ff",
    primaryDark: "#7a3ff0",
    primaryBg: "bg-[#8c52ff]",
    primaryText: "text-[#8c52ff]",
    primaryBorder: "border-[#8c52ff]",
    primaryLight: "bg-[#8c52ff]/10",
    primaryGrad: "from-[#8c52ff] to-[#6c3be8]",
    primaryGrad2: "from-[#8c52ff] via-[#7a3ff0] to-[#6c3be8]",
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

const fmtDate = (d, short = false, locale = 'ar') => {
    if (!d) return "";
    return new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US',
        short
            ? { month: "short", day: "numeric" }
            : { weekday: "long", year: "numeric", month: "long", day: "numeric" }
    );
};

const STATUS_CFG = (locale = 'ar') => ({
    completed: {
        label: locale === 'ar' ? "مكتملة" : "Completed",
        badge: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40",
        dot: "bg-emerald-400",
        icon: CheckCircle,
        cardBg: "border-emerald-200/60 dark:border-emerald-800/30",
    },
    scheduled: {
        label: locale === 'ar' ? "مجدولة" : "Scheduled",
        badge: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40",
        dot: "bg-blue-400",
        icon: Clock,
        cardBg: "border-gray-100 dark:border-[#30363d]",
    },
    cancelled: {
        label: locale === 'ar' ? "ملغاة" : "Cancelled",
        badge: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40",
        dot: "bg-red-400",
        icon: X,
        cardBg: "border-red-100/60 dark:border-red-900/20",
    },
    postponed: {
        label: locale === 'ar' ? "مؤجلة" : "Postponed",
        badge: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40",
        dot: "bg-amber-400",
        icon: Clock,
        cardBg: "border-amber-100/60 dark:border-amber-900/20",
    },
});

const ATT_CFG = (locale = 'ar') => ({
    present: { label: locale === 'ar' ? "حاضر" : "Present", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", icon: CheckCircle },
    late: { label: locale === 'ar' ? "متأخر" : "Late", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20", icon: Clock },
    excused: { label: locale === 'ar' ? "معذور" : "Excused", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", icon: BadgeCheck },
    absent: { label: locale === 'ar' ? "غائب" : "Absent", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20", icon: X },
});

const PLAT_CFG = (locale = 'ar') => ({
    zoom: { label: locale === 'ar' ? "Zoom" : "Zoom", icon: "🔷", grad: "from-blue-500 to-blue-600" },
    google_meet: { label: locale === 'ar' ? "Meet" : "Meet", icon: "🔴", grad: "from-green-500 to-emerald-600" },
    microsoft_teams: { label: locale === 'ar' ? "Teams" : "Teams", icon: "🔵", grad: "from-purple-500 to-indigo-600" },
    other: { label: locale === 'ar' ? "رابط" : "Link", icon: "🔗", grad: C.primaryGrad },
});

// ─── Session Detail Modal ─────────────────────────────────────────────────────
function SessionDetailModal({ session, onClose, locale }) {
    const { t } = useI18n();
    const cfg = STATUS_CFG(locale)[session.status] || STATUS_CFG(locale).scheduled;
    const att = session.studentAttendance ? ATT_CFG(locale)[session.studentAttendance] : null;
    const AttIcon = att?.icon;
    const plat = PLAT_CFG(locale)[session.meetingPlatform] || PLAT_CFG(locale).other;
    const isLocked = !session.canAccess;
    const isCompleted = session.status === "completed";

    // Prevent body scroll
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    return (
        <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4`} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-[#161b22] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col">

                {/* ── Header ── */}
                <div className={`relative bg-gradient-to-br ${C.primaryGrad} p-6 rounded-t-3xl sm:rounded-t-3xl overflow-hidden flex-shrink-0`}>
                    {/* pattern */}
                    <div className="absolute inset-0 opacity-10"
                        style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
                    <div className="absolute -top-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

                    <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20 flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                    {cfg.label}
                                </span>
                                {att && isCompleted && (
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${att.bg} ${att.color} flex items-center gap-1`}>
                                        <AttIcon className="w-3 h-3" />
                                        {att.label}
                                    </span>
                                )}
                            </div>
                            <button onClick={onClose}
                                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all">
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>

                        <h2 className="text-xl font-black text-white mb-1 leading-snug">{session.title}</h2>
                        <p className="text-white/70 text-sm font-medium">
                            {session.moduleName} · {t("sessions.modal.session")} {session.sessionNumber}
                        </p>

                        {/* Meta chips */}
                        <div className="flex flex-wrap gap-2 mt-4">
                            <span className="flex items-center gap-1.5 bg-white/15 text-white text-xs px-3 py-1.5 rounded-full border border-white/20">
                                <Calendar className="w-3 h-3" />
                                {fmtDate(session.scheduledDate, false, locale)}
                            </span>
                            <span className="flex items-center gap-1.5 bg-white/15 text-white text-xs px-3 py-1.5 rounded-full border border-white/20">
                                <Clock className="w-3 h-3" />
                                {fmtTime(session.startTime, locale)} – {fmtTime(session.endTime, locale)}
                            </span>
                            {/* Duration - 2 hours */}
                            <span className="flex items-center gap-1.5 bg-white/15 text-white text-xs px-3 py-1.5 rounded-full border border-white/20">
                                <Timer className="w-3 h-3" />
                                {locale === 'ar' ? 'ساعتان (120 دقيقة)' : '2 hours (120 min)'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="p-5 space-y-5 flex-1">

                    {/* Join button */}
                    {session.showJoinButton && (
                        <a
                            href={session.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white font-black text-base bg-gradient-to-r ${plat.grad} shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all`}
                        >
                            <Video className="w-5 h-5" />
                            {t("sessions.modal.joinMeeting")}
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    )}

                    {/* Recording */}
                    {isCompleted && session.recordingLink && (
                        <a
                            href={session.recordingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all"
                        >
                            <Play className="w-4 h-4" />
                            {t("sessions.modal.watchRecording")}
                        </a>
                    )}

                    {/* Lock message */}
                    {isLocked && session.status !== "cancelled" && (
                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-[#21262d] rounded-2xl border border-gray-200 dark:border-[#30363d]">
                            <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-[#30363d] flex items-center justify-center flex-shrink-0">
                                <Lock className="w-5 h-5 text-gray-500 dark:text-[#8b949e]" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-700 dark:text-[#e6edf3] text-sm">{t("sessions.modal.lockedTitle")}</p>
                                <p className="text-xs text-gray-500 dark:text-[#8b949e] mt-0.5">{t("sessions.modal.lockedMessage")}</p>
                            </div>
                        </div>
                    )}

                    {/* Lessons covered */}
                    {session.lessons && session.lessons.length > 0 && (
                        <div className="bg-gray-50 dark:bg-[#0d1117]/60 rounded-2xl border border-gray-100 dark:border-[#30363d] overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#30363d]">
                                <div className="flex items-center gap-2">
                                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${C.primaryGrad} flex items-center justify-center`}>
                                        <BookOpen className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <span className="text-sm font-bold text-gray-900 dark:text-[#e6edf3]">{t("sessions.modal.lessonsCovered")}</span>
                                </div>
                                {/* Total duration */}
                                <span className={`text-xs font-bold ${C.primaryText} flex items-center gap-1`}>
                                    <Timer className="w-3 h-3" />
                                    {locale === 'ar' ? 'ساعتان' : '2 hours'}
                                </span>
                            </div>

                            {/* Lessons list */}
                            <div className="divide-y divide-gray-100 dark:divide-[#21262d]">
                                {session.lessons.slice(0, 1).map((lesson, i) => (
                                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                                        {/* Number */}
                                        <div
                                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0
        ${isCompleted
                                                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                                                    : "bg-[#8c52ff]/10 text-[#8c52ff]"
                                                }`}
                                        >
                                            {i + 1}
                                        </div>

                                        {/* Title */}
                                        <span className="flex-1 text-sm text-gray-800 dark:text-[#c9d1d9] font-medium leading-snug">
                                            {lesson.title}
                                        </span>

                                        {/* Completed check */}
                                        {isCompleted && (
                                            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Total row */}
                            <div className={`flex items-center justify-between px-4 py-2.5 bg-[#8c52ff]/5 dark:bg-[#8c52ff]/10 border-t border-[#8c52ff]/20`}>
                                <span className="text-xs font-bold text-gray-500 dark:text-[#8b949e]">{t("sessions.modal.totalDuration")}</span>
                                <span className={`text-sm font-black ${C.primaryText}`}>
                                    {session.lessons.length * 60} {locale === 'ar' ? 'دقيقة = ساعتان' : 'min = 2 hours'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Materials */}
                    {session.materials && session.materials.length > 0 && (
                        <div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-[#e6edf3] mb-3 flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${C.primaryGrad} flex items-center justify-center`}>
                                    <FileText className="w-3 h-3 text-white" />
                                </div>
                                {t("sessions.modal.materials")}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {session.materials.map((mat, i) => (
                                    <a key={i} href={mat.url} target="_blank" rel="noopener noreferrer"
                                        className={`inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#21262d] border border-gray-200 dark:border-[#30363d] rounded-xl text-xs font-medium text-gray-700 dark:text-[#8b949e] hover:border-[#8c52ff]/50 hover:text-[#8c52ff] transition-all`}>
                                        <FileText className="w-3.5 h-3.5" />
                                        {mat.name || `${t("sessions.modal.file")} ${i + 1}`}
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Instructor Notes */}
                    {session.instructorNotes && (
                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-4">
                            <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                                <Info className="w-3.5 h-3.5" />
                                {t("sessions.modal.instructorNotes")}
                            </h4>
                            <p className="text-sm text-amber-800 dark:text-amber-300/80 leading-relaxed">{session.instructorNotes}</p>
                        </div>
                    )}

                    {/* Description */}
                    {session.description && (
                        <div className="bg-gray-50 dark:bg-[#0d1117]/40 rounded-2xl p-4 border border-gray-100 dark:border-[#30363d]">
                            <p className="text-sm text-gray-600 dark:text-[#8b949e] leading-relaxed">{session.description}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Session Card ─────────────────────────────────────────────────────────────
function SessionCard({ session, onClick, locale }) {
    const { t } = useI18n();
    const cfg = STATUS_CFG(locale)[session.status] || STATUS_CFG(locale).scheduled;
    const att = session.studentAttendance ? ATT_CFG(locale)[session.studentAttendance] : null;
    const AttIcon = att?.icon;
    const plat = PLAT_CFG(locale)[session.meetingPlatform] || PLAT_CFG(locale).other;

    // Locked = scheduled + not accessible (not completed)
    const isLocked = !session.canAccess && session.status === "scheduled";
    const isCompleted = session.status === "completed";
    const isScheduled = session.status === "scheduled";
    const isToday = session.isToday && isScheduled;

    const handleClick = () => {
        if (isLocked) return;
        onClick();
    };

    return (
        <div
            onClick={handleClick}
            className={`group relative rounded-2xl border bg-white dark:bg-[#161b22] overflow-hidden
        transition-all duration-200
        ${isLocked
                    ? "border-gray-100 dark:border-[#21262d] opacity-50 cursor-not-allowed"
                    : isCompleted
                        ? "cursor-pointer hover:-translate-y-0.5 border-emerald-200/60 dark:border-emerald-800/30 hover:shadow-lg"
                        : isToday
                            ? "cursor-pointer hover:-translate-y-0.5 border-[#8c52ff]/40 shadow-lg shadow-[#8c52ff]/10 ring-1 ring-[#8c52ff]/20"
                            : "cursor-pointer hover:-translate-y-0.5 border-gray-100 dark:border-[#30363d] hover:shadow-md hover:border-gray-200 dark:hover:border-[#3d444d]"}`}
        >
            {/* Today top ribbon */}
            {isToday && (
                <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${C.primaryGrad2}`} />
            )}

            <div className="flex items-center gap-4 p-4">
                {/* Number bubble */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shadow-sm flex-shrink-0
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
                            : session.order + 1}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        {isToday && (
                            <span className={`text-[10px] font-black ${C.primaryText} flex items-center gap-1`}>
                                <span className="w-1 h-1 rounded-full bg-[#8c52ff] animate-pulse" /> {t("sessions.today")}
                            </span>
                        )}
                        <h3 className={`font-bold text-sm truncate transition-colors
              ${isLocked
                                ? "text-gray-400 dark:text-[#6e7681]"
                                : `text-gray-900 dark:text-[#e6edf3] group-hover:${C.primaryText}`}`}>
                            {session.title}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-[#6e7681] flex-wrap">
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {fmtDate(session.scheduledDate, true, locale)}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {fmtTime(session.startTime, locale)}
                        </span>
                        {/* Duration - 2 hours */}
                        <span className="flex items-center gap-1">
                            <Timer className="w-3 h-3" /> {locale === 'ar' ? 'ساعتان' : '2h'}
                        </span>
                        <span className="text-[10px]">{session.moduleName}</span>
                    </div>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Attendance */}
                    {att && isCompleted && (
                        <span className={`hidden sm:flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${att.bg} ${att.color}`}>
                            <AttIcon className="w-3 h-3" /> {att.label}
                        </span>
                    )}

                    {/* Join button */}
                    {session.showJoinButton && (
                        <a
                            href={session.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r ${plat.grad} text-white shadow-md hover:shadow-lg hover:scale-105 transition-all`}
                        >
                            <Video className="w-3.5 h-3.5" /> {t("sessions.join")}
                        </a>
                    )}

                    {/* Recording */}
                    {isCompleted && session.recordingLink && (
                        <a
                            href={session.recordingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100 transition-all"
                        >
                            <Play className="w-3 h-3" /> {t("sessions.recording")}
                        </a>
                    )}

                    {/* Status */}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${cfg.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {cfg.label}
                    </span>

                    {/* Arrow */}
                    <ChevronRight className={`w-4 h-4 text-gray-300 dark:text-[#6e7681] group-hover:${C.primaryText} group-hover:-translate-x-0.5 transition-all ${locale === 'ar' ? 'rotate-180' : ''}`} />
                </div>
            </div>
        </div>
    );
}

// ─── Module Group ─────────────────────────────────────────────────────────────
function ModuleGroup({ moduleData, children, locale }) {
    const { t } = useI18n();
    const [collapsed, setCollapsed] = useState(false);
    const isComplete = moduleData.isCompleted;
    const pct = moduleData.progressPercentage || 0;

    return (
        <div className="space-y-3">
            <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center gap-3 group">
                <div className={`h-px flex-1 ${isComplete ? "bg-gradient-to-r from-emerald-300 to-transparent dark:from-emerald-700/50" : "bg-gradient-to-r from-gray-200 to-transparent dark:from-[#30363d]"}`} />
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold flex-shrink-0 transition-all
          ${isComplete
                        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400"
                        : `bg-white dark:bg-[#161b22] border-gray-200 dark:border-[#30363d] text-gray-600 dark:text-[#8b949e] group-hover:border-[#8c52ff]/40 group-hover:text-[#8c52ff]`}`}>
                    {isComplete ? <CheckCircle className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                    <span className="max-w-[160px] truncate">{moduleData.moduleName}</span>
                    <span className="opacity-60">{moduleData.completedSessions}/{moduleData.totalSessions}</span>
                    {collapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                </div>
                <div className={`h-px flex-1 ${isComplete ? "bg-gradient-to-l from-emerald-300 to-transparent dark:from-emerald-700/50" : "bg-gradient-to-l from-gray-200 to-transparent dark:from-[#30363d]"}`} />
            </button>

            {!collapsed && <div className="space-y-2.5">{children}</div>}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StudentSessionsPage() {
    const { t } = useI18n();
    const { locale, direction } = useLocale();
    const { groupId } = useParams();
    const router = useRouter();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("all");
    const [groupView, setGroupView] = useState(true);
    const [selectedSession, setSelectedSession] = useState(null);

    const load = useCallback(() => {
        if (!groupId) return;
        setLoading(true);
        setError("");
        fetch(`/api/student/groups/${groupId}/sessions`, { credentials: "include" })
            .then((r) => r.json())
            .then((res) => {
                if (res.success) setData(res.data);
                else setError(res.message || t("sessions.error"));
            })
            .catch(() => setError(t("sessions.errorMessage")))
            .finally(() => setLoading(false));
    }, [groupId, t]);

    useEffect(() => { load(); }, [load]);

    if (loading) return <Skeleton locale={locale} />;
    if (error || !data) return <ErrorState message={error} onRetry={load} locale={locale} />;

    const { sessions, sessionsByModule, stats } = data;

    const filtered = sessions.filter((s) => {
        if (filter === "completed") return s.status === "completed";
        if (filter === "upcoming") return s.status === "scheduled" && s.canAccess;
        if (filter === "locked") return !s.canAccess && s.status === "scheduled";
        return true;
    });

    const filteredByModule = sessionsByModule
        .map((mod) => ({
            ...mod,
            sessions: mod.sessions.filter((s) => {
                if (filter === "completed") return s.status === "completed";
                if (filter === "upcoming") return s.status === "scheduled" && s.canAccess;
                if (filter === "locked") return !s.canAccess && s.status === "scheduled";
                return true;
            }),
        }))
        .filter((m) => m.sessions.length > 0);

    const nextAccessible = sessions.find((s) => s.canAccess && s.status === "scheduled");

    const FILTERS = [
        { id: "all", label: t("sessions.filters.all"), count: sessions.length },
        { id: "upcoming", label: t("sessions.filters.upcoming"), count: sessions.filter(s => s.canAccess && s.status === "scheduled").length },
        { id: "completed", label: t("sessions.filters.completed"), count: stats.completed },
        { id: "locked", label: t("sessions.filters.locked"), count: sessions.filter(s => !s.canAccess && s.status === "scheduled").length },
    ];

    return (
        <div className={`min-h-screen bg-gray-50 dark:bg-[#0d1117]`} dir={direction}>

            {/* ── Sticky Header ─────────────────────────────────────────────────── */}
            <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md border-b border-gray-200 dark:border-[#30363d]">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3 py-4">
                        <button onClick={() => router.back()}
                            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#21262d] transition-colors group flex-shrink-0">
                            <ArrowRight className={`w-5 h-5 text-gray-600 dark:text-[#8b949e] ${locale === 'ar' ? '' : 'rotate-180'}`} />
                        </button>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-base font-black text-gray-900 dark:text-[#e6edf3]">{t("sessions.pageTitle")}</h1>
                            <p className="text-xs text-gray-400 dark:text-[#6e7681]">
                                {stats.completed} {t("sessions.completed")} · {stats.scheduled} {t("sessions.scheduled")} · {stats.total} {t("sessions.total")}
                            </p>
                        </div>

                        {/* Progress */}
                        <div className="flex items-center gap-2 bg-[#8c52ff]/10 border border-[#8c52ff]/20 px-3 py-1.5 rounded-xl flex-shrink-0">
                            <div className="w-14 h-1.5 bg-gray-200 dark:bg-[#21262d] rounded-full overflow-hidden">
                                <div className={`h-full bg-gradient-to-r ${C.primaryGrad} rounded-full transition-all duration-1000`}
                                    style={{ width: `${stats.progressPercentage}%` }} />
                            </div>
                            <span className={`text-xs font-bold ${C.primaryText}`}>{stats.progressPercentage}%</span>
                        </div>

                        {/* View toggle */}
                        <div className="flex bg-gray-100 dark:bg-[#21262d] rounded-xl p-1 gap-0.5 flex-shrink-0">
                            <button onClick={() => setGroupView(true)}
                                className={`p-1.5 rounded-lg transition-all ${groupView ? `bg-white dark:bg-[#161b22] shadow ${C.primaryText}` : "text-gray-400"}`}
                                title={t("sessions.view.group")}>
                                <Layers className="w-4 h-4" />
                            </button>
                            <button onClick={() => setGroupView(false)}
                                className={`p-1.5 rounded-lg transition-all ${!groupView ? `bg-white dark:bg-[#161b22] shadow ${C.primaryText}` : "text-gray-400"}`}
                                title={t("sessions.view.list")}>
                                <BookOpen className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Filter tabs */}
                    <div className="flex gap-1 pb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
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

            {/* ── Content ─────────────────────────────────────────────────────────── */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

                {/* Next session banner */}
                {nextAccessible && filter === "all" && (
                    <div className={`mb-5 bg-gradient-to-r ${C.primaryGrad} rounded-2xl p-5 text-white relative overflow-hidden`}>
                        <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                        <div className="relative z-10 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                                <Target className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-white/70 font-medium">{t("sessions.nextAvailable")}</p>
                                <p className="font-bold text-sm truncate">{nextAccessible.title}</p>
                                <p className="text-xs text-white/60 mt-0.5">
                                    {fmtDate(nextAccessible.scheduledDate, false, locale)} · {fmtTime(nextAccessible.startTime, locale)} · {locale === 'ar' ? 'ساعتان' : '2 hours'}
                                </p>
                            </div>
                            {nextAccessible.showJoinButton && (
                                <a href={nextAccessible.meetingLink} target="_blank" rel="noopener noreferrer"
                                    className="flex-shrink-0 flex items-center gap-1.5 bg-white text-[#8c52ff] font-black text-xs px-3 py-2 rounded-xl hover:bg-purple-50 transition-all shadow-lg">
                                    <Video className="w-3.5 h-3.5" /> {t("sessions.joinNow")}
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {/* Sessions */}
                {filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 mx-auto bg-gray-100 dark:bg-[#21262d] rounded-full flex items-center justify-center mb-4">
                            <BookOpen className="w-10 h-10 text-gray-300 dark:text-[#6e7681]" />
                        </div>
                        <p className="text-gray-500 dark:text-[#8b949e] font-medium">{t("sessions.noSessions")}</p>
                    </div>
                ) : groupView ? (
                    <div className="space-y-7">
                        {filteredByModule.map((mod) => (
                            <ModuleGroup key={mod.moduleIndex} moduleData={mod} locale={locale}>
                                {mod.sessions.map((s) => (
                                    <SessionCard key={s._id} session={s} onClick={() => setSelectedSession(s)} locale={locale} />
                                ))}
                            </ModuleGroup>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {filtered.map((s) => (
                            <SessionCard key={s._id} session={s} onClick={() => setSelectedSession(s)} locale={locale} />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Session Detail Modal ─────────────────────────────────────────── */}
            {selectedSession && (
                <SessionDetailModal
                    session={selectedSession}
                    onClose={() => setSelectedSession(null)}
                    locale={locale}
                />
            )}
        </div>
    );
}

// ─── Loading & Error ──────────────────────────────────────────────────────────
function Skeleton({ locale }) {
    return (
        <div className={`min-h-screen bg-gray-50 dark:bg-[#0d1117]`} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            <div className="h-20 bg-white dark:bg-[#161b22] border-b border-gray-200 dark:border-[#30363d] animate-pulse" />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-3">
                {[...Array(7)].map((_, i) => (
                    <div key={i} className="h-20 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse border border-gray-100 dark:border-[#30363d]" />
                ))}
            </div>
        </div>
    );
}

function ErrorState({ message, onRetry, locale }) {
    const { t } = useI18n();
    
    return (
        <div className={`min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0d1117]`} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            <div className="text-center max-w-sm px-4">
                <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <h3 className="text-lg font-black text-gray-900 dark:text-[#e6edf3] mb-2">{t("sessions.error")}</h3>
                <p className="text-gray-500 dark:text-[#8b949e] mb-5 text-sm">{message}</p>
                <button onClick={onRetry}
                    className={`px-6 py-3 bg-gradient-to-r ${C.primaryGrad} text-white rounded-xl font-bold hover:shadow-lg transition-all`}>
                    {t("sessions.retry")}
                </button>
            </div>
        </div>
    );
}