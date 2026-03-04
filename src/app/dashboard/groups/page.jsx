"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StudentSidebar from "../StudentSidebar";
import StudentHeader from "../StudentHeader";
import {
    Users, BookOpen, Calendar, Clock, ChevronRight, Award,
    CheckCircle, TrendingUp, Zap, Sparkles, AlertCircle,
    Loader2, BarChart3, Star, GraduationCap, Hash,
    Play, Target, Layers, X, ArrowRight,
} from "lucide-react";
import { useLocale } from "@/app/context/LocaleContext";
import { useI18n } from "@/i18n/I18nProvider";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtTime = (t) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const fmtTimeAr = (t) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "م" : "ص"}`;
};

const DAY_EN = {
    Sunday: "Sun", Monday: "Mon", Tuesday: "Tue",
    Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat",
};

const DAY_AR = {
    Sunday: "أحد", Monday: "اثنين", Tuesday: "ثلاثاء",
    Wednesday: "أربعاء", Thursday: "خميس", Friday: "جمعة", Saturday: "سبت",
};

const LEVEL_CONFIG = {
    beginner: { 
        labelEn: "Beginner", 
        labelAr: "مبتدئ", 
        gradient: "from-emerald-400 to-teal-500", 
        bg: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300" 
    },
    intermediate: { 
        labelEn: "Intermediate", 
        labelAr: "متوسط", 
        gradient: "from-blue-400 to-indigo-500", 
        bg: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" 
    },
    advanced: { 
        labelEn: "Advanced", 
        labelAr: "متقدم", 
        gradient: "from-violet-400 to-purple-500", 
        bg: "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300" 
    },
};

const STATUS_CONFIG = {
    active: { 
        labelEn: "Active", 
        labelAr: "نشط", 
        dot: "bg-emerald-400", 
        badge: "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" 
    },
    completed: { 
        labelEn: "Completed", 
        labelAr: "مكتمل", 
        dot: "bg-blue-400", 
        badge: "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" 
    },
    draft: { 
        labelEn: "Draft", 
        labelAr: "مسودة", 
        dot: "bg-gray-400", 
        badge: "bg-gray-100 dark:bg-gray-900/20 text-gray-500 dark:text-gray-400" 
    },
    cancelled: { 
        labelEn: "Cancelled", 
        labelAr: "ملغي", 
        dot: "bg-red-400", 
        badge: "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400" 
    },
};

const CARD_GRADIENTS = [
    "from-primary to-purple-600",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-violet-500 to-fuchsia-500",
    "from-amber-500 to-orange-500",
    "from-rose-500 to-pink-500",
];

// ─── Animated Counter ─────────────────────────────────────────────────────────
const AnimatedCounter = ({ value, duration = 1500 }) => {
    const [count, setCount] = useState(0);
    const ran = useRef(false);

    useEffect(() => {
        if (ran.current || value === 0) { setCount(value); return; }
        ran.current = true;
        let startTime;
        let animationFrame;
        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 4);
            setCount(Math.floor(easeOut * value));
            if (progress < 1) animationFrame = requestAnimationFrame(animate);
        };
        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [value, duration]);

    return <span>{count}</span>;
};

// ─── Summary Stats Card ───────────────────────────────────────────────────────
const SummaryCard = ({ icon: Icon, label, value, suffix = "", gradient, delay = 0 }) => (
    <div
        className="group/stats relative bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
        style={{ animationDelay: `${delay}ms` }}
    >
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover/stats:opacity-5 transition-opacity duration-300 rounded-2xl`} />
        <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover/stats:scale-110 transition-transform duration-300`}>
                    <Icon className="w-7 h-7 text-white" />
                </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-[#e6edf3] mb-1">
                <AnimatedCounter value={typeof value === "number" ? value : 0} />
                {suffix && <span className="text-xl mr-1">{suffix}</span>}
            </h3>
            <p className="text-sm text-gray-500 dark:text-[#8b949e]">{label}</p>
            <div className="mt-4 h-1 w-full bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                <div className={`h-full bg-gradient-to-r ${gradient} rounded-full`} style={{ width: "100%" }} />
            </div>
        </div>
    </div>
);

// ─── Group Card ───────────────────────────────────────────────────────────────
function GroupCard({ group, index, onClick, locale }) {
    const { t } = useI18n();
    const lvl = LEVEL_CONFIG[group.course?.level] || LEVEL_CONFIG.beginner;
    const levelLabel = locale === 'ar' ? lvl.labelAr : lvl.labelEn;
    
    const sts = STATUS_CONFIG[group.status] || STATUS_CONFIG.active;
    const statusLabel = locale === 'ar' ? sts.labelAr : sts.labelEn;
    
    const grad = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
    const pct = group.stats.progressPercentage;
    
    const daysMap = locale === 'ar' ? DAY_AR : DAY_EN;
    const fmtTimeFn = locale === 'ar' ? fmtTimeAr : fmtTime;

    return (
        <div
            onClick={onClick}
            className="group/card relative bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] overflow-hidden cursor-pointer hover:shadow-xl dark:hover:border-[#3d444d] hover:-translate-y-1 transition-all duration-300"
        >
            {/* Hover glow */}
            <div className={`absolute inset-0 bg-gradient-to-br ${grad} opacity-0 group-hover/card:opacity-5 transition-opacity duration-300`} />

            {/* Top gradient banner */}
            <div className={`relative h-24 bg-gradient-to-br ${grad} p-4 overflow-hidden`}>
                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                <div className="relative z-10 flex items-start justify-between">
                    <span className={`inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full border border-white/20`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sts.dot} animate-pulse`} />
                        {statusLabel}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover/card:bg-white/40 transition-all">
                        <ChevronRight className={`w-4 h-4 text-white ${locale === 'ar' ? 'rotate-180' : ''}`} />
                    </div>
                </div>
                {/* Progress line at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                    <div className="h-full bg-white/60 transition-all duration-1000" style={{ width: `${pct}%` }} />
                </div>
            </div>

            {/* Card body */}
            <div className="p-5">
                {/* Title */}
                <div className="mb-3">
                    <h3 className="font-bold text-gray-900 dark:text-[#e6edf3] text-base leading-tight group-hover/card:text-primary transition-colors truncate">
                        {group.course?.title || group.name}
                    </h3>
                    <p className="text-xs text-gray-400 dark:text-[#6e7681] mt-0.5 flex items-center gap-1.5">
                        <Hash className="w-3 h-3" />
                        {group.name} · {group.code}
                    </p>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                        { 
                            label: locale === 'ar' ? "تقدم" : "Progress", 
                            val: pct, 
                            suffix: "%", 
                            icon: TrendingUp, 
                            color: "text-primary" 
                        },
                        { 
                            label: locale === 'ar' ? "حضور" : "Attendance", 
                            val: group.stats.attendanceRate, 
                            suffix: "%", 
                            icon: CheckCircle, 
                            color: "text-emerald-500" 
                        },
                        { 
                            label: locale === 'ar' ? "ساعات" : "Hours", 
                            val: group.stats.hoursCompleted, 
                            suffix: locale === 'ar' ? "س" : "h", 
                            icon: Zap, 
                            color: "text-amber-500" 
                        },
                    ].map(({ label, val, suffix, icon: Icon, color }) => (
                        <div key={label} className="text-center bg-gray-50 dark:bg-[#0d1117] rounded-xl p-2.5">
                            <Icon className={`w-3.5 h-3.5 mx-auto mb-1 ${color}`} />
                            <p className="text-sm font-bold text-gray-900 dark:text-[#e6edf3] tabular-nums">
                                {val}{suffix}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-[#6e7681]">{label}</p>
                        </div>
                    ))}
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-500 dark:text-[#8b949e] font-medium">
                            {group.stats.completedSessions} / {group.stats.totalSessions} {locale === 'ar' ? 'جلسة' : 'sessions'}
                        </span>
                        <span className="font-bold text-gray-900 dark:text-[#e6edf3]">{pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                        <div
                            className={`h-full bg-gradient-to-r ${grad} rounded-full transition-all duration-1000 ease-out relative overflow-hidden`}
                            style={{ width: `${pct}%` }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
                        </div>
                    </div>
                </div>

                {/* Completed + Remaining sessions */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/10 rounded-xl px-3 py-2 border border-green-100 dark:border-green-900/20">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-gray-900 dark:text-[#e6edf3]">{group.stats.completedSessions}</p>
                            <p className="text-[10px] text-gray-400 dark:text-[#6e7681]">
                                {locale === 'ar' ? 'مكتملة' : 'completed'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/10 rounded-xl px-3 py-2 border border-blue-100 dark:border-blue-900/20">
                        <Clock className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-gray-900 dark:text-[#e6edf3]">{group.stats.remainingSessions}</p>
                            <p className="text-[10px] text-gray-400 dark:text-[#6e7681]">
                                {locale === 'ar' ? 'متبقية' : 'remaining'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#21262d]">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${lvl.bg}`}>
                            {levelLabel}
                        </span>
                        {group.schedule?.daysOfWeek?.slice(0, 2).map((d) => (
                            <span key={d} className="text-xs bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-[#8b949e] px-2 py-0.5 rounded-full">
                                {daysMap[d] || d}
                            </span>
                        ))}
                        {group.schedule?.timeFrom && (
                            <span className="text-xs text-gray-400 dark:text-[#6e7681] flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {fmtTimeFn(group.schedule.timeFrom)}
                            </span>
                        )}
                    </div>
                    {group.instructors?.length > 0 && (
                        <div className="flex items-center -space-x-1.5 rtl:space-x-reverse">
                            {group.instructors.slice(0, 2).map((inst, i) => (
                                <div key={i} className={`w-7 h-7 rounded-full bg-gradient-to-br ${CARD_GRADIENTS[i]} flex items-center justify-center text-white text-xs font-bold ring-2 ring-white dark:ring-[#161b22]`}>
                                    {inst.avatar || inst.name?.charAt(0) || '👤'}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Next session hint */}
                {group.nextSession && group.status === "active" && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#21262d] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-xs text-gray-500 dark:text-[#8b949e]">
                            {locale === 'ar' ? 'الجلسة القادمة:' : 'Next session:'}{" "}
                            <span className="font-semibold text-primary">
                                {new Date(group.nextSession.scheduledDate).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
                                    weekday: "short", month: "short", day: "numeric",
                                })}
                            </span>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyGroups({ locale }) {
    const { t } = useI18n();
    
    return (
        <div className="text-center py-20">
            <div className="relative w-28 h-28 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-600/20 rounded-3xl rotate-6 animate-pulse" />
                <div className="relative w-full h-full bg-white dark:bg-[#161b22] rounded-3xl border border-gray-100 dark:border-[#30363d] flex items-center justify-center shadow-lg">
                    <Users className="w-14 h-14 text-primary/40" />
                </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-[#e6edf3] mb-2">
                {t("groups.noGroups")}
            </h3>
            <p className="text-gray-500 dark:text-[#8b949e] max-w-sm mx-auto">
                {t("groups.noGroupsMessage")}
            </p>
        </div>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function GroupSkeleton() {
    return (
        <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] overflow-hidden animate-pulse">
            <div className="h-24 bg-gradient-to-br from-gray-200 to-gray-100 dark:from-[#21262d] dark:to-[#1c2128]" />
            <div className="p-5 space-y-3">
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-[#21262d] rounded-full" />
                <div className="h-3 w-1/2 bg-gray-100 dark:bg-[#1c2128] rounded-full" />
                <div className="grid grid-cols-3 gap-2">
                    {[...Array(3)].map((_, j) => <div key={j} className="h-14 bg-gray-100 dark:bg-[#1c2128] rounded-xl" />)}
                </div>
                <div className="h-2 bg-gray-100 dark:bg-[#1c2128] rounded-full" />
                <div className="grid grid-cols-2 gap-2">
                    {[...Array(2)].map((_, j) => <div key={j} className="h-10 bg-gray-100 dark:bg-[#1c2128] rounded-xl" />)}
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MyGroupsPage() {
    const { t } = useI18n();
    const { locale, direction } = useLocale();
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("all");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [animateStats, setAnimateStats] = useState(false);

    useEffect(() => {
        Promise.all([
            fetch("/api/student/groups", { credentials: "include" }).then((r) => r.json()),
            fetch("/api/student/dashboard", { credentials: "include" }).then((r) => r.json()),
        ])
            .then(([groupsRes, dashRes]) => {
                if (groupsRes.success) setData(groupsRes.data);
                else setError(groupsRes.message || t("groups.error"));

                if (dashRes.success) {
                    setUser(dashRes.data?.user);
                    setNotifications(dashRes.data?.notifications || []);
                }
            })
            .catch(() => setError(t("groups.errorMessage")))
            .finally(() => {
                setLoading(false);
                setTimeout(() => setAnimateStats(true), 200);
            });
    }, [t]);

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        localStorage.removeItem("token");
        router.push("/");
    };

    const currentUser = user || { name: locale === 'ar' ? "طالب" : "Student", email: "", role: "student" };

    const filteredGroups = (data?.groups || []).filter((g) => {
        if (filter === "active") return g.status === "active";
        if (filter === "completed") return g.status === "completed";
        return true;
    });

    const stats = data?.stats || {
        total: 0, active: 0, completed: 0, totalHours: 0,
        totalSessions: 0, completedSessions: 0, overallProgress: 0, overallAttendance: 0,
    };

    return (
        <div
            className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22] flex relative`}
            dir={direction}
        >
            {/* Sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div
                className={`fixed lg:static inset-y-0 ${locale === 'ar' ? 'right-0' : 'left-0'} z-50 transform transition-all duration-500 ease-out-expo
          ${sidebarOpen 
            ? (locale === 'ar' ? 'translate-x-0' : 'translate-x-0') 
            : (locale === 'ar' ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0')
          } flex-shrink-0`}
            >
                <StudentSidebar user={currentUser} onLogout={handleLogout} />
            </div>

            <main className="flex-1 min-w-0">
                <StudentHeader
                    user={currentUser}
                    notifications={notifications}
                    onMenuClick={() => setSidebarOpen(!sidebarOpen)}
                    sidebarOpen={sidebarOpen}
                />

                <div className="p-4 sm:p-6 lg:p-8">

                    {/* Hero Banner */}
                    <div className="relative group/hero min-w-4xl mb-8">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-600 to-pink-600 rounded-3xl opacity-60 blur-md group-hover/hero:opacity-80 transition-opacity duration-500" />
                        <div className="relative bg-gradient-to-br from-primary via-purple-600 to-pink-600 rounded-3xl p-6 overflow-hidden shadow-lg">
                            <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse-slow" />
                            <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slower" />
                            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                                        <span className="text-yellow-300 font-medium text-sm">
                                            {t("groups.myGroups")}
                                        </span>
                                    </div>
                                    <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                                        {t("groups.educationalJourney")}
                                    </h2>
                                    <p className="text-blue-100 text-sm mb-4">
                                        {t("groups.trackProgress")}
                                    </p>
                                    <div className="flex flex-wrap gap-3">
                                        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20">
                                            <Users className="w-4 h-4 text-white" />
                                            <span className="text-white text-sm font-semibold">
                                                {stats.total} {t("groups.groups")}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20">
                                            <TrendingUp className="w-4 h-4 text-white" />
                                            <span className="text-white text-sm font-semibold">
                                                {stats.overallProgress}% {t("groups.overallProgress")}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="hidden lg:flex flex-col items-center justify-center w-32 h-32 relative">
                                    <svg width="128" height="128" className="-rotate-90">
                                        <circle cx="64" cy="64" r="54" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                                        <circle cx="64" cy="64" r="54" fill="none" stroke="white" strokeWidth="8"
                                            strokeLinecap="round"
                                            strokeDasharray={`${2 * Math.PI * 54}`}
                                            strokeDashoffset={`${2 * Math.PI * 54 * (1 - stats.overallProgress / 100)}`}
                                            style={{ transition: "stroke-dashoffset 1.5s ease-out" }}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-bold text-white">{stats.overallProgress}%</span>
                                        <span className="text-white/60 text-xs">{t("groups.progress")}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    {!loading && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            {/* Total Groups */}
                            <div className="group/stats relative bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-purple-600/0 group-hover/stats:from-primary/10 group-hover/stats:to-purple-600/10 rounded-2xl transition-all duration-300" />
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20 group-hover/stats:scale-110 transition-transform duration-300">
                                            <Users className="w-7 h-7 text-white" />
                                        </div>
                                        <span className="px-3 py-1 bg-primary/10 dark:bg-primary/10 text-primary rounded-full text-xs font-semibold">
                                            {t("groups.total")}
                                        </span>
                                    </div>
                                    <h3 className="text-3xl font-bold text-gray-900 dark:text-[#e6edf3] mb-1">
                                        {animateStats ? <AnimatedCounter value={stats.total} /> : 0}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-[#8b949e]">{t("groups.totalGroups")}</p>
                                    <div className="mt-4 h-1 w-full bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-primary to-purple-600 rounded-full" style={{ width: "100%" }} />
                                    </div>
                                </div>
                            </div>

                            {/* Active Groups */}
                            <div className="group/stats relative bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/0 to-teal-500/0 group-hover/stats:from-emerald-400/10 group-hover/stats:to-teal-500/10 rounded-2xl transition-all duration-300" />
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover/stats:scale-110 transition-transform duration-300">
                                            <Play className="w-7 h-7 text-white" />
                                        </div>
                                        <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-semibold">
                                            {t("groups.active")}
                                        </span>
                                    </div>
                                    <h3 className="text-3xl font-bold text-gray-900 dark:text-[#e6edf3] mb-1">
                                        {animateStats ? <AnimatedCounter value={stats.active} /> : 0}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-[#8b949e]">{t("groups.activeGroups")}</p>
                                    <div className="mt-4 h-1 w-full bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                                            style={{ width: stats.total > 0 ? `${(stats.active / stats.total) * 100}%` : "0%" }} />
                                    </div>
                                </div>
                            </div>

                            {/* Completed Groups */}
                            <div className="group/stats relative bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/0 to-indigo-500/0 group-hover/stats:from-blue-400/10 group-hover/stats:to-indigo-500/10 rounded-2xl transition-all duration-300" />
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover/stats:scale-110 transition-transform duration-300">
                                            <CheckCircle className="w-7 h-7 text-white" />
                                        </div>
                                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-semibold">
                                            {t("groups.completed")}
                                        </span>
                                    </div>
                                    <h3 className="text-3xl font-bold text-gray-900 dark:text-[#e6edf3] mb-1">
                                        {animateStats ? <AnimatedCounter value={stats.completed} /> : 0}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-[#8b949e]">{t("groups.completedGroups")}</p>
                                    <div className="mt-4 h-1 w-full bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full"
                                            style={{ width: stats.total > 0 ? `${(stats.completed / stats.total) * 100}%` : "0%" }} />
                                    </div>
                                </div>
                            </div>

                            {/* Learning Hours */}
                            <div className="group/stats relative bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-400/0 to-orange-500/0 group-hover/stats:from-amber-400/10 group-hover/stats:to-orange-500/10 rounded-2xl transition-all duration-300" />
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover/stats:scale-110 transition-transform duration-300">
                                            <Zap className="w-7 h-7 text-white" />
                                        </div>
                                        <span className="px-3 py-1 bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-semibold">
                                            {t("groups.hours")}
                                        </span>
                                    </div>
                                    <h3 className="text-3xl font-bold text-gray-900 dark:text-[#e6edf3] mb-1">
                                        {animateStats ? <AnimatedCounter value={stats.totalHours} /> : 0}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-[#8b949e]">{t("groups.learningHours")}</p>
                                    <div className="mt-4 h-1 w-full bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" style={{ width: "100%" }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Groups Header + Filter */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-[#e6edf3] flex items-center gap-2">
                                <Users className="w-6 h-6 text-primary" />
                                {t("groups.groups")}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-[#8b949e] mt-1">
                                {t("groups.clickToViewDetails")}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {[
                                { id: "all", label: t("groups.all") },
                                { id: "active", label: t("groups.activeFilter") },
                                { id: "completed", label: t("groups.completedFilter") },
                            ].map(({ id, label }) => (
                                <button
                                    key={id}
                                    onClick={() => setFilter(id)}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300
                    ${filter === id
                                            ? "bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg shadow-primary/30"
                                            : "bg-white dark:bg-[#161b22] text-gray-600 dark:text-[#8b949e] border border-gray-200 dark:border-[#30363d] hover:border-primary/50"
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {[...Array(6)].map((_, i) => <GroupSkeleton key={i} />)}
                        </div>
                    ) : error ? (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                                <AlertCircle className="w-10 h-10 text-red-500" />
                            </div>
                            <p className="text-gray-600 dark:text-[#8b949e] mb-4">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-3 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all"
                            >
                                {t("groups.retry")}
                            </button>
                        </div>
                    ) : filteredGroups.length === 0 ? (
                        <EmptyGroups locale={locale} />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredGroups.map((group, i) => (
                                <GroupCard
                                    key={group._id}
                                    group={group}
                                    index={i}
                                    locale={locale}
                                    onClick={() => router.push(`/dashboard/groups/${group._id}`)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        @keyframes pulse-slower {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
        .animate-pulse-slower { animation: pulse-slower 6s ease-in-out infinite; }
        .animate-shimmer { animation: shimmer 2s infinite; }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .ease-out-expo { transition-timing-function: cubic-bezier(0.19, 1, 0.22, 1); }
      `}</style>
        </div>
    );
}