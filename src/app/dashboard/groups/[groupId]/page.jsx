"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, Calendar, Clock, Users, BookOpen, ChevronRight,
  ChevronDown, ChevronUp, CheckCircle, Play, TrendingUp,
  Target, BarChart3, GraduationCap, Star, Zap, AlertCircle,
  Hash, Layers, Sparkles,
} from "lucide-react";
import { useLocale } from "@/app/context/LocaleContext";
import { useI18n } from "@/i18n/I18nProvider";

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

const DAY_EN = {
  Sunday: "Sun", Monday: "Mon", Tuesday: "Tue",
  Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat",
};

const DAY_AR = {
  Sunday: "الأحد", Monday: "الاثنين", Tuesday: "الثلاثاء",
  Wednesday: "الأربعاء", Thursday: "الخميس", Friday: "الجمعة", Saturday: "السبت",
};

const LEVEL_CFG = {
  beginner: { labelEn: "Beginner", labelAr: "مبتدئ" },
  intermediate: { labelEn: "Intermediate", labelAr: "متوسط" },
  advanced: { labelEn: "Advanced", labelAr: "متقدم" },
};

const STATUS_CFG = {
  active:    { labelEn: "Active",   labelAr: "نشط",   dot: "bg-emerald-400", cls: "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" },
  completed: { labelEn: "Completed", labelAr: "مكتمل", dot: "bg-blue-400",    cls: "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20" },
  draft:     { labelEn: "Draft", labelAr: "مسودة", dot: "bg-gray-400",    cls: "bg-gray-100 dark:bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-500/20" },
  cancelled: { labelEn: "Cancelled",  labelAr: "ملغي",  dot: "bg-red-400",     cls: "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20" },
};

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ value = 0, duration = 1500 }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!value) return;
    let startTime;
    let raf;
    const animate = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(ease * value));
      if (progress < 1) raf = requestAnimationFrame(animate);
      else setCount(value);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span>{count}</span>;
}

// ─── Circular Progress Ring ───────────────────────────────────────────────────
function ProgressRing({ value = 0, size = 140, stroke = 10 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <defs>
        <linearGradient id="pg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#8c52ff" />
        </linearGradient>
      </defs>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="rgba(255,255,255,0.15)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="url(#pg-grad)" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(.4,0,.2,1)" }} />
    </svg>
  );
}

// ─── Stats Card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, suffix = "", gradient, shadowColor, delay = 0 }) {
  return (
    <div
      className="group/stats relative bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover/stats:opacity-10 rounded-2xl transition-all duration-300`} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg ${shadowColor} group-hover/stats:scale-110 transition-transform duration-300`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
        </div>
        <h3 className="text-3xl font-bold text-gray-900 dark:text-[#e6edf3] mb-1 tabular-nums">
          <AnimatedCounter value={typeof value === "number" ? value : 0} />
          <span className="text-xl">{suffix}</span>
        </h3>
        <p className="text-sm text-gray-500 dark:text-[#8b949e]">{label}</p>
        <div className="mt-3 h-1 w-full bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
          <div className={`h-full bg-gradient-to-r ${gradient} rounded-full w-2/3`} />
        </div>
      </div>
    </div>
  );
}

// ─── Session Row (inside Module) ──────────────────────────────────────────────
function SessionItem({ session, sessionNumber, moduleCompleted, locale }) {
  const { t } = useI18n();
  const isDone = session.isCompleted || moduleCompleted;
  const isActive = session.isActive && !moduleCompleted;

  return (
    <div className={`flex items-center gap-4 py-3 px-2 rounded-xl group/session transition-colors
      hover:bg-gray-50 dark:hover:bg-white/[0.03]`}>

      {/* Session number badge */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0
        ${isDone
          ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-sm"
          : isActive
            ? "text-white shadow-sm"
            : "bg-gray-100 dark:bg-[#21262d] text-gray-400 dark:text-[#6e7681]"}`}
        style={isActive && !isDone ? { background: "linear-gradient(135deg, #8c52ff, #a855f7)" } : {}}>
        {isDone ? <CheckCircle className="w-4 h-4" /> : `${locale === 'ar' ? 'ج' : 'S'}${sessionNumber}`}
      </div>

      {/* Session info */}
      <div className="flex-1 min-w-0 text-right">
        <p className={`text-sm font-semibold truncate
          ${isDone ? "text-gray-500 dark:text-[#8b949e]" : "text-gray-900 dark:text-[#e6edf3]"}`}>
          {session.title || session.lessonTitle || `${locale === 'ar' ? `جلسة ${sessionNumber}` : `Session ${sessionNumber}`}`}
        </p>
        {isActive && (
          <span className="text-[10px] text-purple-500 dark:text-purple-400 font-semibold">
            {t("groupDetails.status.inProgress")}
          </span>
        )}
      </div>

      {/* Duration — always 2 hours */}
      <div className="flex items-center gap-1 flex-shrink-0 text-gray-400 dark:text-[#6e7681]">
        <Clock className="w-3 h-3" />
        <span className="text-xs font-medium">{locale === 'ar' ? 'ساعتان' : '2h'}</span>
      </div>
    </div>
  );
}

// ─── Module Accordion ─────────────────────────────────────────────────────────
function ModuleRow({ mod, index, locale }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(index === 0);
  const done = mod.isCompleted;
  const active = mod.isActive;

  // Build sessions from lessons
  const buildSessionsFromLessons = () => {
    if (mod.sessions?.length > 0) return mod.sessions;
    
    if (mod.lessons?.length > 0) {
      const sessions = [];
      const totalLessons = mod.lessons.length;
      const totalSessions = Math.ceil(totalLessons / 2);
      
      for (let i = 0; i < totalSessions; i++) {
        const lessonIndex1 = i * 2;
        const lessonIndex2 = i * 2 + 1;
        const title = mod.lessons[lessonIndex1]?.title || `${t("groupDetails.curriculum.session")} ${i + 1}`;
        
        sessions.push({
          _id: `session-${i}`,
          title: title,
          isCompleted: done || (i < (mod.completedSessions || 0)),
          isActive: !done && active && i === (mod.completedSessions || 0),
        });
      }
      return sessions;
    }
    
    return Array.from({ length: mod.totalSessions || 0 }, (_, i) => ({
      _id: i,
      title: mod.title,
      isCompleted: done || (i < (mod.completedSessions || 0)),
      isActive: !done && active && i === (mod.completedSessions || 0),
    }));
  };

  const displaySessions = buildSessionsFromLessons();

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all duration-300
      ${done   ? "border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-900/5"
      : active ? "border-purple-200 dark:border-purple-800/40 bg-purple-50/30 dark:bg-purple-900/5"
               : "border-gray-100 dark:border-[#30363d] bg-white dark:bg-[#161b22]"}`}>

      {/* Module Header */}
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-5 text-right hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 shadow-md
            ${done ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white"
                   : active ? "text-white"
                            : "bg-gray-100 dark:bg-[#21262d] text-gray-400 dark:text-[#6e7681]"}`}
          style={active && !done ? { background: "linear-gradient(135deg, #8c52ff, #a855f7)" } : {}}>
          {done ? <CheckCircle className="w-5 h-5" /> : index + 1}
        </div>

        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center gap-2 justify-end mb-2">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex-shrink-0
              ${done   ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
              : active ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                       : "bg-gray-100 dark:bg-[#21262d] text-gray-500 dark:text-[#6e7681]"}`}>
              {done ? t("groupDetails.status.completedBadge") : active ? t("groupDetails.status.inProgress") : t("groupDetails.status.upcoming")}
            </span>
            <h3 className="font-bold text-gray-900 dark:text-[#e6edf3] text-sm truncate">{mod.title}</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-gray-100 dark:bg-[#21262d]">
              <div
                className={`h-full rounded-full transition-all duration-700 relative overflow-hidden
                  ${done ? "bg-gradient-to-r from-emerald-400 to-teal-500" : ""}`}
                style={{
                  width: `${mod.progressPercentage || 0}%`,
                  background: !done && active ? "linear-gradient(90deg, #8c52ff, #a855f7)" : undefined,
                }}>
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              </div>
            </div>
            <span className="text-[11px] text-gray-400 dark:text-[#6e7681] flex-shrink-0 tabular-nums">
              {mod.completedSessions}/{mod.totalSessions} {locale === 'ar' ? 'جلسة' : 'sess'}
            </span>
          </div>
        </div>

        <div className="flex-shrink-0 text-gray-300 dark:text-[#6e7681]">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Sessions List */}
      {open && (
        <div className="border-t border-gray-100 dark:border-[#30363d] px-4 pb-3 pt-2">
          {displaySessions.length > 0 ? (
            displaySessions.map((s, si) => (
              <SessionItem
                key={s._id ?? si}
                session={s}
                sessionNumber={si + 1}
                moduleCompleted={done}
                locale={locale}
              />
            ))
          ) : (
            <p className="text-sm text-gray-400 dark:text-[#6e7681] text-center py-4">
              {t("groupDetails.curriculum.noSessions")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Instructor Card ──────────────────────────────────────────────────────────
function InstructorCard({ inst, index, locale }) {
  const { t } = useI18n();
  const grads = [
    "from-violet-500 to-purple-600",
    "from-purple-500 to-fuchsia-600",
    "from-indigo-500 to-violet-600",
    "from-fuchsia-500 to-pink-600",
  ];
  return (
    <div className="group/inst relative bg-white dark:bg-[#161b22] rounded-2xl p-5 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-purple-600/0 group-hover/inst:from-purple-400/5 group-hover/inst:to-purple-600/5 rounded-2xl transition-all duration-300" />
      <div className="relative z-10 flex items-center gap-4">
        <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${grads[index % grads.length]} flex items-center justify-center text-white text-2xl font-black shadow-lg flex-shrink-0 group-hover/inst:scale-110 transition-transform duration-300`}>
          {inst.avatar || inst.name?.charAt(0) || '👤'}
          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white dark:border-[#161b22]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-[#e6edf3] text-base">{inst.name}</h3>
          {inst.email && <p className="text-xs text-gray-400 dark:text-[#6e7681] truncate mt-0.5">{inst.email}</p>}
          <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20">
            <GraduationCap className="w-3 h-3" />
            {t("groupDetails.team.instructor")}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StudentGroupDetailPage() {
  const { t } = useI18n();
  const { locale, direction } = useLocale();
  const { groupId } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const [animateProgress, setAnimateProgress] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    fetch(`/api/student/groups/${groupId}`, { credentials: "include" })
      .then(r => r.json())
      .then(res => {
        if (res.success) { setData(res.data); setTimeout(() => setAnimateProgress(true), 300); }
        else setError(res.message || t("groupDetails.error"));
      })
      .catch(() => setError(t("groupDetails.errorMessage")))
      .finally(() => setLoading(false));
  }, [groupId, t]);

  if (loading) return <LoadingState locale={locale} />;
  if (error || !data) return <ErrorState message={error} onRetry={() => { setLoading(true); setError(""); }} locale={locale} />;

  const { group, course, instructors, modules, stats, nextSession } = data;
  const level = LEVEL_CFG[course?.level] || LEVEL_CFG.beginner;
  const levelLabel = locale === 'ar' ? level.labelAr : level.labelEn;
  const status = STATUS_CFG[group.status] || STATUS_CFG.active;
  const statusLabel = locale === 'ar' ? status.labelAr : status.labelEn;

  const TABS = [
    { id: "overview",   label: t("groupDetails.tabs.overview"), icon: BarChart3 },
    { id: "curriculum", label: t("groupDetails.tabs.curriculum"), icon: BookOpen },
    { id: "team",       label: t("groupDetails.tabs.team"), icon: Users },
  ];

  const daysMap = locale === 'ar' ? DAY_AR : DAY_EN;

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22]`} dir={direction}>

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <div className="relative">
        <div className="absolute inset-0 opacity-60 blur-md"
          style={{ background: "linear-gradient(135deg, #8c52ff, #a855f7, #ec4899)" }} />
        <div className="relative overflow-hidden shadow-lg"
          style={{ background: "linear-gradient(135deg, #8c52ff 0%, #a855f7 50%, #ec4899 100%)" }}>

          {/* Blobs */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slower" />
          <div className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

            {/* Back */}
            <button onClick={() => router.back()}
              className={`flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-6 group/back`}>
              <div className={`w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center group-hover/back:bg-white/25 transition-colors`}>
                <ArrowRight className={`w-3.5 h-3.5 ${locale === 'ar' ? '' : 'rotate-180'}`} />
              </div>
              <span className="text-sm font-medium">{t("groupDetails.backToHome")}</span>
            </button>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="max-w-2xl">
                {/* Spark */}
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                  <span className="text-yellow-300 font-medium text-sm">{t("groupDetails.groupDetails")}</span>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2.5 mb-4 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${status.cls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot} animate-pulse`} />
                    {statusLabel}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/15 text-white border border-white/20">
                    <GraduationCap className="w-3 h-3" />{levelLabel}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/15 text-white border border-white/20">
                    <Hash className="w-3 h-3" />{group.code}
                  </span>
                </div>

                <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2 leading-tight">
                  {course?.title || group.name}
                </h1>
                <p className="text-lg text-blue-100 font-medium mb-3">{group.name}</p>
                {course?.description && (
                  <p className="text-white/70 text-sm max-w-lg leading-relaxed line-clamp-2 mb-5">
                    {course.description}
                  </p>
                )}

                {/* Schedule chips */}
                <div className="flex flex-wrap gap-2">
                  {group.schedule?.daysOfWeek?.map(d => (
                    <span key={d} className="flex items-center gap-1.5 bg-white/15 text-white text-xs px-3 py-1.5 rounded-full border border-white/20 font-medium">
                      <Calendar className="w-3 h-3" />{daysMap[d] || d}
                    </span>
                  ))}
                  {group.schedule?.timeFrom && (
                    <span className="flex items-center gap-1.5 bg-white/15 text-white text-xs px-3 py-1.5 rounded-full border border-white/20 font-medium">
                      <Clock className="w-3 h-3" />
                      {fmtTime(group.schedule.timeFrom, locale)} – {fmtTime(group.schedule.timeTo, locale)}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Ring */}
              <div className="flex-shrink-0 flex flex-col items-center gap-3">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <ProgressRing value={stats.progressPercentage} size={144} stroke={10} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-4xl font-bold text-white tabular-nums leading-none">
                      {stats.progressPercentage}%
                    </span>
                    <span className="text-white/70 text-xs font-medium mt-1">{t("groupDetails.yourProgress")}</span>
                  </div>
                </div>
                <p className="text-white/60 text-xs">{stats.completedSessions} {t("groupDetails.of")} {stats.totalSessions} {t("groupDetails.sessions")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ STATS CARDS ═══════════════════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            icon={CheckCircle} 
            label={t("groupDetails.stats.completedSessions")} 
            value={stats.completedSessions}
            gradient="from-green-400 to-emerald-500" 
            shadowColor="shadow-emerald-500/20" 
            delay={0} 
          />
          <StatCard 
            icon={Clock} 
            label={t("groupDetails.stats.remainingSessions")} 
            value={stats.remainingSessions}
            gradient="from-blue-400 to-cyan-500" 
            shadowColor="shadow-blue-500/20" 
            delay={80} 
          />
          <StatCard 
            icon={Target} 
            label={t("groupDetails.stats.attendanceRate")} 
            value={stats.attendanceRate} 
            suffix="%"
            gradient="from-violet-400 to-purple-500" 
            shadowColor="shadow-purple-500/20" 
            delay={160} 
          />
          <StatCard 
            icon={Zap} 
            label={t("groupDetails.stats.learningHours")} 
            value={stats.hoursCompleted} 
            suffix={locale === 'ar' ? 'س' : 'h'}
            gradient="from-amber-400 to-orange-500" 
            shadowColor="shadow-amber-500/20" 
            delay={240} 
          />
        </div>
      </div>

      {/* ══ CONTENT ═══════════════════════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">

        {/* Tab Bar */}
        <div className="flex gap-1 p-1.5 rounded-2xl w-fit mb-8 bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] shadow-sm">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                ${tab === id
                  ? "text-white shadow-md"
                  : "text-gray-500 dark:text-[#8b949e] hover:text-gray-900 dark:hover:text-[#e6edf3]"}`}
              style={tab === id ? { background: "linear-gradient(135deg, #8c52ff, #a855f7)", boxShadow: "0 4px 14px rgba(140,82,255,0.4)" } : {}}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* LEFT */}
            <div className="lg:col-span-2 space-y-6">

              {/* Next Session */}
              {nextSession && (
                <div className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lg"
                  style={{ background: "linear-gradient(135deg, #8c52ff 0%, #a855f7 60%, #ec4899 100%)" }}>
                  <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-pulse-slow" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-300/20 rounded-full blur-3xl animate-pulse-slower" />
                  <div className="absolute inset-0 opacity-[0.06]"
                    style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="relative flex w-2 h-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                      </span>
                      <span className="text-white/70 text-xs font-semibold">{t("groupDetails.nextSession")}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-4">{nextSession.title}</h3>
                    <div className="flex flex-wrap gap-5">
                      <span className="flex items-center gap-2 text-white/70 text-sm">
                        <Calendar className="w-4 h-4" />
                        {new Date(nextSession.scheduledDate).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { 
                          weekday: "long", month: "long", day: "numeric" 
                        })}
                      </span>
                      <span className="flex items-center gap-2 text-white/70 text-sm">
                        <Clock className="w-4 h-4" />
                        {fmtTime(nextSession.startTime, locale)} – {fmtTime(nextSession.endTime, locale)}
                      </span>
                    </div>
                    <Link href={`/dashboard/groups/${groupId}/sessions`}
                      className={`inline-flex items-center gap-2 mt-5 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all border border-white/20`}>
                      <Play className="w-3.5 h-3.5" /> {t("groupDetails.viewSessions")} 
                      <ChevronRight className={`w-3.5 h-3.5 ${locale === 'ar' ? '' : 'rotate-180'}`} />
                    </Link>
                  </div>
                </div>
              )}

              {/* Attendance Card */}
              <div className="group/progress relative bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 from-purple-400/0 to-purple-600/0 group-hover/progress:from-purple-400/5 group-hover/progress:to-purple-600/5 bg-gradient-to-br rounded-2xl transition-all duration-300" />
                <div className="relative z-10">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-[#e6edf3] mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" style={{ color: "#8c52ff" }} />
                    {t("groupDetails.attendanceDetails")}
                  </h2>

                  {/* Big 4 tiles */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: t("groupDetails.attendance.present"),  value: stats.attendedSessions,  bg: "bg-emerald-50 dark:bg-emerald-900/20",  text: "text-emerald-700 dark:text-emerald-400" },
                      { label: t("groupDetails.attendance.late"), value: stats.lateSessions,      bg: "bg-amber-50 dark:bg-amber-900/20",      text: "text-amber-700 dark:text-amber-400" },
                      { label: t("groupDetails.attendance.excused"), value: stats.excusedSessions,   bg: "bg-blue-50 dark:bg-blue-900/20",        text: "text-blue-700 dark:text-blue-400" },
                      { label: t("groupDetails.attendance.absent"),  value: stats.absentSessions,    bg: "bg-red-50 dark:bg-red-900/20",          text: "text-red-700 dark:text-red-400" },
                    ].map(({ label, value, bg, text }) => (
                      <div key={label} className={`${bg} rounded-xl p-4 text-center`}>
                        <p className={`text-2xl font-bold ${text} tabular-nums`}>
                          <AnimatedCounter value={value || 0} />
                        </p>
                        <p className={`text-xs font-semibold ${text} mt-1`}>{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Progress bars */}
                  <div className="space-y-4">
                    {[
                      { label: t("groupDetails.attendance.present"),  count: stats.attendedSessions,  color: "from-emerald-400 to-teal-500",  pillCls: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" },
                      { label: t("groupDetails.attendance.late"), count: stats.lateSessions,      color: "from-amber-400 to-orange-400",  pillCls: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" },
                      { label: t("groupDetails.attendance.excused"), count: stats.excusedSessions,   color: "from-blue-400 to-cyan-500",    pillCls: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
                      { label: t("groupDetails.attendance.absent"),  count: stats.absentSessions,    color: "from-red-400 to-rose-500",     pillCls: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" },
                    ].map(({ label, count, color, pillCls }) => {
                      const total = stats.completedSessions || 0;
                      const pct = total > 0 ? Math.round(((count || 0) / total) * 100) : 0;
                      return (
                        <div key={label}>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pillCls}`}>{label}</span>
                            <span className="text-sm font-bold text-gray-900 dark:text-[#e6edf3] tabular-nums">
                              {count || 0}<span className="text-gray-300 dark:text-[#6e7681] font-normal"> / {total}</span>
                            </span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-[#21262d] relative">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${color} relative overflow-hidden`}
                              style={{ width: `${animateProgress ? pct : 0}%`, transition: "width 1.2s cubic-bezier(.4,0,.2,1)" }}>
                              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Sessions CTA */}
              <Link href={`/dashboard/groups/${groupId}/sessions`}
                className="group/cta relative flex items-center justify-between p-5 rounded-2xl border hover:shadow-md transition-all overflow-hidden"
                style={{ background: "rgba(140,82,255,0.06)", borderColor: "rgba(140,82,255,0.2)" }}>
                <div className="absolute inset-0 opacity-0 group-hover/cta:opacity-100 transition-opacity duration-300 rounded-2xl"
                  style={{ background: "rgba(140,82,255,0.08)" }} />
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                    style={{ background: "linear-gradient(135deg, #8c52ff, #a855f7)", boxShadow: "0 4px 14px rgba(140,82,255,0.3)" }}>
                    <Play className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-[#e6edf3]">{t("groupDetails.viewAllSessions")}</p>
                    <p className="text-sm text-gray-500 dark:text-[#8b949e]">
                      {stats.completedSessions} {t("groupDetails.completed")} · {stats.remainingSessions} {t("groupDetails.remaining")}
                    </p>
                  </div>
                </div>
                <ChevronRight className={`relative z-10 w-5 h-5 group-hover/cta:-translate-x-1 transition-transform ${locale === 'ar' ? '' : 'rotate-180'}`}
                  style={{ color: "#8c52ff" }} />
              </Link>
            </div>

            {/* RIGHT */}
            <div className="space-y-5">

              {/* Schedule */}
              <div className="group/card relative bg-white dark:bg-[#161b22] rounded-2xl p-5 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 from-purple-400/0 to-purple-600/0 group-hover/card:from-purple-400/5 group-hover/card:to-purple-600/5 bg-gradient-to-br rounded-2xl transition-all duration-300" />
                <div className="relative z-10">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-[#e6edf3] mb-4 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center">
                      <Calendar className="w-3.5 h-3.5" style={{ color: "#8c52ff" }} />
                    </div>
                    {t("groupDetails.schedule.title")}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] text-gray-400 dark:text-[#6e7681] mb-2 font-medium">{t("groupDetails.schedule.days")}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.schedule?.daysOfWeek?.map(d => (
                          <span key={d} className="text-xs px-2.5 py-1 rounded-lg font-semibold bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20">
                            {daysMap[d] || d}
                          </span>
                        ))}
                      </div>
                    </div>
                    {group.schedule?.timeFrom && (
                      <div>
                        <p className="text-[11px] text-gray-400 dark:text-[#6e7681] mb-1 font-medium">{t("groupDetails.schedule.time")}</p>
                        <p className="text-sm font-bold text-gray-800 dark:text-[#e6edf3]">
                          {fmtTime(group.schedule.timeFrom, locale)} – {fmtTime(group.schedule.timeTo, locale)}
                        </p>
                      </div>
                    )}
                    {group.schedule?.startDate && (
                      <div>
                        <p className="text-[11px] text-gray-400 dark:text-[#6e7681] mb-1 font-medium">{t("groupDetails.schedule.startDate")}</p>
                        <p className="text-sm font-bold text-gray-800 dark:text-[#e6edf3]">
                          {new Date(group.schedule.startDate).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Course Info */}
              {course && (
                <div className="group/card relative bg-white dark:bg-[#161b22] rounded-2xl p-5 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 overflow-hidden">
                  <div className="absolute inset-0 from-purple-400/0 to-purple-600/0 group-hover/card:from-purple-400/5 group-hover/card:to-purple-600/5 bg-gradient-to-br rounded-2xl transition-all duration-300" />
                  <div className="relative z-10">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-[#e6edf3] mb-4 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center">
                        <BookOpen className="w-3.5 h-3.5" style={{ color: "#8c52ff" }} />
                      </div>
                      {t("groupDetails.courseInfo.title")}
                    </h3>
                    {[
                      { icon: Layers,       label: t("groupDetails.courseInfo.modules"), val: `${course.totalModules} ${locale === 'ar' ? 'وحدة' : 'units'}` },
                      { icon: Play,         label: t("groupDetails.courseInfo.sessions"), val: `${course.totalSessions ?? stats.totalSessions} ${locale === 'ar' ? 'جلسة' : 'sessions'}` },
                      { icon: Star,         label: t("groupDetails.courseInfo.level"),     val: levelLabel },
                      course.grade   ? { icon: GraduationCap, label: t("groupDetails.courseInfo.grade"),   val: course.grade }   : null,
                      course.subject ? { icon: BookOpen,      label: t("groupDetails.courseInfo.subject"),  val: course.subject } : null,
                    ].filter(Boolean).map(({ icon: Icon, label, val }) => (
                      <div key={label} className="flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-[#21262d] last:border-0">
                        <span className="text-xs text-gray-400 dark:text-[#6e7681] flex items-center gap-1.5 font-medium">
                          <Icon className="w-3.5 h-3.5" />{label}
                        </span>
                        <span className="text-xs font-bold text-gray-800 dark:text-[#e6edf3]">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Students */}
              <div className="group/card relative bg-white dark:bg-[#161b22] rounded-2xl p-5 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 from-purple-400/0 to-purple-600/0 group-hover/card:from-purple-400/5 group-hover/card:to-purple-600/5 bg-gradient-to-br rounded-2xl transition-all duration-300" />
                <div className="relative z-10">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-[#e6edf3] mb-3 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center">
                      <Users className="w-3.5 h-3.5" style={{ color: "#8c52ff" }} />
                    </div>
                    {t("groupDetails.students.title")}
                  </h3>
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className="flex-1 h-2.5 rounded-full overflow-hidden bg-gray-100 dark:bg-[#21262d]">
                      <div className="h-full rounded-full relative overflow-hidden"
                        style={{
                          width: `${Math.min((group.currentStudentsCount / group.maxStudents) * 100, 100)}%`,
                          background: "linear-gradient(90deg, #8c52ff, #a855f7)",
                          transition: "width 1.2s cubic-bezier(.4,0,.2,1)"
                        }}>
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-gray-600 dark:text-[#8b949e] flex-shrink-0 tabular-nums">
                      {group.currentStudentsCount}/{group.maxStudents}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-[#6e7681]">
                    {group.maxStudents - group.currentStudentsCount} {t("groupDetails.students.seatsAvailable")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CURRICULUM ── */}
        {tab === "curriculum" && (
          <div className="max-w-3xl space-y-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-[#6e7681]">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />{t("groupDetails.curriculum.completed")}</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "#8c52ff" }} />{t("groupDetails.curriculum.inProgress")}</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-[#8b949e]">
                {modules.filter(m => m.isCompleted).length} / {modules.length} {t("groupDetails.curriculum.modulesCompleted")}
              </p>
            </div>
            {modules.map((mod, i) => <ModuleRow key={mod._id || i} mod={mod} index={i} locale={locale} />)}
          </div>
        )}

        {/* ── TEAM ── */}
        {tab === "team" && (
          <div className="max-w-2xl">
            {instructors.length > 0 ? (
              <div className="space-y-4">
                {instructors.map((inst, i) => <InstructorCard key={i} inst={inst} index={i} locale={locale} />)}
              </div>
            ) : (
              <div className="text-center py-20 text-gray-300 dark:text-[#6e7681]">
                <Users className="w-14 h-14 mx-auto mb-4 opacity-40" />
                <p className="text-sm font-medium">{t("groupDetails.team.noInstructors")}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        @keyframes pulse-slow { 0%,100%{opacity:.3} 50%{opacity:.6} }
        @keyframes pulse-slower { 0%,100%{opacity:.2} 50%{opacity:.4} }
        .animate-shimmer { animation: shimmer 2s linear infinite; }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
        .animate-pulse-slower { animation: pulse-slower 6s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ─── Loading ──────────────────────────────────────────────────────────────────
function LoadingState({ locale }) {
  const { t } = useI18n();
  
  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22]`} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="h-72 animate-pulse" style={{ background: "linear-gradient(135deg, #8c52ff, #a855f7, #ec4899)" }} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse border border-gray-100 dark:border-[#30363d]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-36 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse" />)}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse" />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Error ────────────────────────────────────────────────────────────────────
function ErrorState({ message, onRetry, locale }) {
  const { t } = useI18n();
  
  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22]`} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-10 h-10 text-red-500 animate-pulse" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-[#e6edf3] mb-2">{t("groupDetails.error")}</h3>
        <p className="text-gray-500 dark:text-[#8b949e] mb-6">{message || t("groupDetails.errorMessage")}</p>
        <button onClick={onRetry}
          className="px-6 py-3 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
          style={{ background: "linear-gradient(135deg, #8c52ff, #a855f7)", boxShadow: "0 4px 14px rgba(140,82,255,0.4)" }}>
          {t("groupDetails.retry")}
        </button>
      </div>
    </div>
  );
}