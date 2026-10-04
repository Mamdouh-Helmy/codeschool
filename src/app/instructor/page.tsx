"use client";
// src/app/instructor/page.tsx

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import InstructorSidebar from "./InstructorSidebar";
import InstructorHeader from "./InstructorHeader";
import * as Icons from "@/components/icons";
import * as Shared from "@/components/interviewShared";
import { useLocale } from "@/app/context/LocaleContext";

// ── Typing لملفات الـ JSX (icons.jsx / interviewShared.jsx) ───────────────────
type IconWeight = "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
type IconType = React.ComponentType<{ className?: string; weight?: IconWeight; style?: React.CSSProperties }>;

const {
  AlertCircle, Award, BarChart3, BookOpen, Calendar, CheckCircle, ChevronLeft, ChevronRight,
  ClipboardList, Clock, PaperPlaneTilt, Play, Sparkles, Star, TrendingUp, Users, Video, X,
} = Icons as unknown as Record<string, IconType>;

const PaperPlane = Shared.PaperPlane as React.ComponentType<{
  className?: string; style?: React.CSSProperties; palette?: "white" | "brand";
}>;
const PaperPlaneLoader = Shared.PaperPlaneLoader as React.ComponentType<{
  size?: number; tone?: "brand" | "light"; label?: string; inline?: boolean; className?: string;
}>;

// ── Types ──────────────────────────────────────────────

interface InstructorUser { id: string; name: string; email: string; role: string }

interface Stats {
  totalTeachingMinutes: number; totalTeachingHours: number;
  totalGroups: number; activeGroups: number; completedGroups: number; totalStudents: number;
  totalSessions: number; completedSessions: number; scheduledSessions: number;
  cancelledSessions: number; postponedSessions: number;
  overallAttendanceRate: number; progressPercentage: number;
  totalPresent: number; totalAbsent: number; totalLate: number; totalExcused: number;
}

interface ProgressStage {
  id: string; label: string; labelAr: string; percentage: number;
  status: "pending" | "active" | "completed" | "almost_there";
  icon: string; gradient: string; color: string; isActive?: boolean;
}

interface ProgressSummaryCard {
  id: string; title: string; titleAr: string; value: string | number;
  icon: string; iconColor: string; bgColor: string; borderColor: string;
}

interface GroupProgress {
  _id: string; name: string; code: string; status: string;
  courseTitle: string; courseLevel: string; courseThumbnail: string;
  currentStudentsCount: number; maxStudents: number; schedule?: unknown;
  totalSessions: number; completedSessions: number; remainingSessions: number; progress: number;
  myTeachingMinutes: number; myTeachingHours: number;
}

interface UpcomingEvent {
  _id?: string; title: string; startTime: string; endTime: string;
  date?: string; formattedDate?: string; groupName?: string;
}

interface NextSession {
  _id?: string; title: string; date: string; time: string; isToday: boolean;
  meetingLink?: string; groupName?: string;
}

interface RecentSession {
  _id?: string; title: string; date: string; time: string; groupName?: string;
  presentCount: number; absentCount: number; totalAttendance: number;
}

interface DashboardData {
  user: InstructorUser; stats: Stats;
  progressData: { stages: ProgressStage[]; summaryCards: ProgressSummaryCard[] };
  nextSession?: NextSession; currentGroups: GroupProgress[];
  upcomingEvents: UpcomingEvent[]; recentSessions: RecentSession[];
}

interface ApiResponse { success: boolean; data: DashboardData; message?: string; error?: string }

// ── Constants (برّه الـ components → بتتعمل مرة واحدة) ──────────────────────
const BRAND_GRAD = "linear-gradient(135deg, #004d59, #ff6700)";
const CTA_GRAD = "linear-gradient(135deg, #ff6700, #feaf00)";
const TEAL_GRAD = "linear-gradient(135deg, #004d59, #0e7c8c)";
const GREEN_GRAD = "linear-gradient(135deg, #10b981, #14b8a6)";
// حط الصورة هنا: public/images/instructor-hero.webp (لو مش موجودة بيظهر الجرادينت لوحده)
const HERO_IMAGE = "/images/instructor-hero.webp";
// نسخة مقلوبة أفقيًا للعربي (الفراغ على اليمين عشان النص)
const HERO_IMAGE_RTL = "/images/instructor-hero-rtl.webp";
const CARD = "rounded-3xl bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d]";

const CSS = `
@keyframes dashRise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes pulseRing { 0% { box-shadow: 0 0 0 0 rgba(255,103,0,.4); } 70% { box-shadow: 0 0 0 10px rgba(255,103,0,0); } 100% { box-shadow: 0 0 0 0 rgba(255,103,0,0); } }
@keyframes planeDrift { 0%,100% { transform: translate(0,0) rotate(-12deg); } 50% { transform: translate(8px,-10px) rotate(-8deg); } }
.dash-rise { animation: dashRise .7s cubic-bezier(.2,.8,.2,1) backwards; }
.pulse-ring { animation: pulseRing 2s infinite; }
.plane-drift { animation: planeDrift 7s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .dash-rise, .pulse-ring, .plane-drift { animation: none; } }`;

// ── Helpers ────────────────────────────────────────────

// بيحول الدقايق الخام لنص "ساعة ودقيقة" بدل الساعة العشرية
const formatDuration = (totalMinutes: number, isRTL: boolean) => {
  const mins = Math.max(0, Math.round(totalMinutes || 0));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (isRTL) return h === 0 ? `${m}د` : m === 0 ? `${h}س` : `${h}س ${m}د`;
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
};

const levelGrad = (level: string) =>
  level === "advanced" ? "linear-gradient(135deg, #ff6700, #f67d00)"
    : level === "intermediate" ? "linear-gradient(135deg, #004d59, #ff6437)"
      : "linear-gradient(135deg, #004d59, #0e7c8c)";

const STAGE_ICONS: Record<string, IconType> = { Play, BookOpen, Award, CheckCircle, BarChart3, ClipboardList };
const STAT_ICONS: Record<string, IconType> = { CheckCircle, Clock, Award, TrendingUp, Star, X, BarChart3, ClipboardList };

// ── Small components ───────────────────────────────────

const AnimatedCounter = ({ value, duration = 1500, formatter }: {
  value: number; duration?: number; formatter?: (n: number) => string;
}) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start: number | undefined;
    let frame = 0;
    const tick = (ts: number) => {
      if (start === undefined) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 4)) * value));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return <span>{formatter ? formatter(count) : count.toLocaleString()}</span>;
};

const SectionHead = ({ icon: Icon, title, sub }: { icon: IconType; title: string; sub?: string }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md flex-shrink-0" style={{ background: BRAND_GRAD }}>
      <Icon weight="fill" className="w-5 h-5 text-white" />
    </div>
    <div className="min-w-0">
      <h3 className="text-lg font-black text-gray-900 dark:text-[#e6edf3] leading-tight">{title}</h3>
      {sub && <p className="text-xs text-gray-500 dark:text-[#8b949e] mt-0.5">{sub}</p>}
    </div>
  </div>
);

const Ring = ({ pct, animate }: { pct: number; animate: boolean }) => {
  const r = 24;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="6" className="stroke-gray-100 dark:stroke-[#21262d]" />
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="6" strokeLinecap="round" stroke="#feaf00"
          strokeDasharray={`${animate ? (Math.min(pct, 100) / 100) * c : 0} ${c}`}
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.2,.8,.2,1)" }} />
      </svg>
      <CheckCircle weight="fill" className="absolute inset-0 m-auto w-6 h-6 text-[#f67d00]" />
    </div>
  );
};

const StatBlock = ({ lead, value, label, hint, edge }: {
  lead: React.ReactNode; value: React.ReactNode; label: string; hint?: string; edge?: boolean;
}) => (
  <div className={`flex items-center gap-4 p-6 ${edge ? "sm:border-s border-gray-100 dark:border-[#30363d]" : ""}`}>
    {lead}
    <div className="min-w-0">
      <p className="text-xs font-bold text-gray-500 dark:text-[#8b949e]">{label}</p>
      <p className="text-3xl font-black text-gray-900 dark:text-[#e6edf3] leading-tight">{value}</p>
      {hint && <p className="text-[11px] text-gray-400 dark:text-[#6e7681] mt-0.5">{hint}</p>}
    </div>
  </div>
);

const IconTile = ({ icon: Icon, grad }: { icon: IconType; grad: string }) => (
  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0" style={{ background: grad }}>
    <Icon weight="fill" className="w-7 h-7 text-white" />
  </div>
);

// ── Hero: صورة + شريط الجلسة الجاية (العنصر الأساسي في الصفحة) ──────────────
const Hero = ({ user, stats, nextSession, isRTL, greeting }: {
  user: InstructorUser; stats: Stats; nextSession?: NextSession; isRTL: boolean; greeting: string;
}) => {
  const t = (ar: string, en: string) => (isRTL ? ar : en);
  const [imgOk, setImgOk] = useState(true);
  const name = user?.name?.split(" ")[0] || t("مدرس", "Instructor");
  const Chevron = isRTL ? ChevronLeft : ChevronRight;
  const attendanceHref = `/instructor/attendance${nextSession?._id ? `?session=${nextSession._id}` : ""}`;
  const actionCls = "inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-black text-sm text-white shadow-lg flex-shrink-0";

  return (
    <section className="relative overflow-hidden rounded-[2rem] min-h-[400px] flex shadow-lg dash-rise" style={{ background: BRAND_GRAD }}>
      {imgOk && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={isRTL ? HERO_IMAGE_RTL : HERO_IMAGE} alt="" onError={() => setImgOk(false)}
          className={`absolute inset-0 w-full h-full object-cover ${isRTL ? "object-left" : "object-right"}`} />
      )}
      <div className="absolute inset-0"
        style={{ background: `linear-gradient(${isRTL ? 270 : 90}deg, rgba(0,50,60,.95) 0%, rgba(0,77,89,.8) 45%, rgba(0,77,89,.05) 100%)` }} />
      <div className="absolute inset-0 bg-[#004d59]/50 sm:hidden" />
      {!imgOk && <PaperPlane className="absolute top-8 end-10 w-56 opacity-20 plane-drift pointer-events-none" />}

      <div className="relative z-10 flex flex-col justify-between w-full p-6 sm:p-10 gap-8">
        <div className="max-w-lg">
          <p className="flex items-center gap-2 text-[#feaf00] font-bold text-sm mb-3">
            <Sparkles weight="fill" className="w-4 h-4" />{greeting}, {name}
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-3">
            {t(`${stats?.scheduledSessions || 0} جلسة جاية مع ${stats?.totalStudents || 0} طالب`,
              `${stats?.scheduledSessions || 0} upcoming sessions, ${stats?.totalStudents || 0} students`)}
          </h2>
          <Link href="/instructor/sessions"
            className="inline-flex items-center gap-2 mt-2 px-5 py-3 rounded-xl bg-white font-black text-sm text-[#ff6700] shadow-lg hover:bg-orange-50 transition-colors">
            {t("كل الجلسات", "All sessions")}<Chevron className="w-4 h-4" />
          </Link>
        </div>

        {nextSession && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-3xl bg-white/12 border border-white/25 backdrop-blur-md">
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/25 flex items-center justify-center flex-shrink-0">
              <Clock weight="fill" className="w-6 h-6 text-[#feaf00]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white/70">
                {nextSession.isToday ? t("جلسة النهارده", "Today's session") : t("الجلسة الجاية", "Next session")}
              </p>
              <p className="font-black text-white truncate">{nextSession.title}</p>
              <p className="text-xs text-white/75 truncate">
                {nextSession.date} · {nextSession.time}{nextSession.groupName ? ` · ${nextSession.groupName}` : ""}
              </p>
            </div>
            {nextSession.isToday && (nextSession.meetingLink ? (
              <a href={nextSession.meetingLink} target="_blank" rel="noopener noreferrer" className={actionCls} style={{ background: CTA_GRAD }}>
                <Video weight="fill" className="w-4 h-4" />{t("ابدأ الجلسة", "Start session")}
              </a>
            ) : (
              <Link href={attendanceHref} className={actionCls} style={{ background: CTA_GRAD }}>
                <ClipboardList weight="fill" className="w-4 h-4" />{t("سجّل الحضور", "Take attendance")}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

// ── Calendar (الأسبوع بيبدأ من الأحد في العربي ومن الإثنين في الإنجليزي) ─────
const MiniCalendar = ({ isRTL }: { isRTL: boolean }) => {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const offset = isRTL ? first : (first + 6) % 7;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const cells = Math.ceil((offset + daysInMonth) / 7) * 7;
  const labels = isRTL ? ["ح", "ن", "ث", "ر", "خ", "ج", "س"] : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  return (
    <div>
      <p className="text-sm font-black text-gray-900 dark:text-[#e6edf3] mb-3">
        {now.toLocaleDateString(isRTL ? "ar-EG" : "en-US", { month: "long", year: "numeric" })}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] mb-1">
        {labels.map((d) => <span key={d} className="text-gray-400 dark:text-[#6e7681] font-bold py-1">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {Array.from({ length: cells }, (_, i) => {
          const day = i - offset + 1;
          const valid = day > 0 && day <= daysInMonth;
          const today = valid && day === now.getDate();
          return (
            <span key={i}
              className={`aspect-square rounded-lg flex items-center justify-center font-black ${today ? "text-white shadow-md" : valid ? "text-gray-700 dark:text-[#8b949e]" : ""}`}
              style={today ? { background: BRAND_GRAD } : undefined}>
              {valid ? day : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
};

const DashboardSkeleton = () => (
  <div className="min-h-screen bg-[#f8f9fb] dark:bg-[#0a0f17] flex items-center justify-center">
    <PaperPlaneLoader size={56} />
  </div>
);

// ── Main Component ─────────────────────────────────────

export default function InstructorDashboard() {
  const { locale } = useLocale();
  const isRTL = locale === "ar";
  const t = (ar: string, en: string) => (isRTL ? ar : en);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [animateProgress, setAnimateProgress] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true); else setLoading(true);
      setError("");
      const res = await fetch("/api/instructor/dashboard", {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const response: ApiResponse = await res.json();
      if (!res.ok || !response.success) throw new Error(response.message || response.error || "Error");
      setDashboardData(response.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error";
      setError(message);
      if (message.includes("UNAUTHORIZED")) router.push("/signin");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!dashboardData) return;
    const id = setTimeout(() => setAnimateProgress(true), 300);
    return () => clearTimeout(id);
  }, [dashboardData]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("token");
      router.push("/");
    } catch { }
  };

  const getLevelLabel = (level: string) =>
    isRTL ? (level === "advanced" ? "متقدم" : level === "intermediate" ? "متوسط" : "مبتدئ")
      : level.charAt(0).toUpperCase() + level.slice(1);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return t("صباح الخير", "Good morning");
    if (h < 18) return t("مساء الخير", "Good afternoon");
    return t("مساء الخير", "Good evening");
  })();

  if (loading) return <DashboardSkeleton />;

  if (error && !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb] dark:bg-[#0a0f17]" dir={isRTL ? "rtl" : "ltr"}>
        <div className="text-center max-w-md p-8">
          <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-500/10 rounded-3xl flex items-center justify-center mb-5">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h3 className="text-xl font-black text-gray-900 dark:text-[#e6edf3] mb-2">{t("حصلت مشكلة", "Something went wrong")}</h3>
          <p className="text-gray-600 dark:text-[#8b949e] mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => fetchData()} className="px-6 py-3 text-white rounded-xl font-black shadow-lg" style={{ background: BRAND_GRAD }}>
              {t("حاول تاني", "Try again")}
            </button>
            <button onClick={() => router.push("/")}
              className="px-6 py-3 bg-gray-200 dark:bg-[#21262d] text-gray-700 dark:text-[#8b949e] rounded-xl font-bold">
              {t("الرئيسية", "Home")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const {
    user, stats, progressData, nextSession,
    currentGroups = [], upcomingEvents = [], recentSessions = [],
  } = dashboardData!;

  const stages = progressData?.stages || [];
  const attendanceTotal = (stats?.totalPresent || 0) + (stats?.totalAbsent || 0) + (stats?.totalLate || 0) + (stats?.totalExcused || 0);
  const attendanceRows = [
    { label: t("حاضر", "Present"), value: stats?.totalPresent || 0, bar: "linear-gradient(90deg, #004d59, #0e7c8c)", color: "#004d59" },
    { label: t("غايب", "Absent"), value: stats?.totalAbsent || 0, bar: "linear-gradient(90deg, #ef4444, #f87171)", color: "#ef4444" },
    { label: t("متأخر", "Late"), value: stats?.totalLate || 0, bar: "linear-gradient(90deg, #feaf00, #f67d00)", color: "#f67d00" },
    { label: t("معذور", "Excused"), value: stats?.totalExcused || 0, bar: "linear-gradient(90deg, #ff6437, #ff6700)", color: "#ff6437" },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-[#0a0f17] flex relative" dir={isRTL ? "rtl" : "ltr"}>
      <style>{CSS}</style>

      {refreshing && (
        <div className={`fixed top-4 ${isRTL ? "left-4" : "right-4"} z-50 text-white ps-3 pe-4 py-2 rounded-xl shadow-xl flex items-center gap-1`}
          style={{ background: BRAND_GRAD }}>
          <PaperPlaneLoader inline tone="light" size={18} />
          <span className="text-sm font-bold">{t("جاري التحديث...", "Refreshing...")}</span>
        </div>
      )}

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className={`fixed lg:static inset-y-0 ${isRTL ? "right-0" : "left-0"} z-50 transform transition-transform duration-300 flex-shrink-0
        ${sidebarOpen ? "translate-x-0" : (isRTL ? "translate-x-full" : "-translate-x-full") + " lg:translate-x-0"}`}>
        <InstructorSidebar user={user} onLogout={handleLogout} />
      </div>

      <main className="flex-1 min-w-0">
        <InstructorHeader
          user={user}
          notifications={[]}
          onMenuClick={() => setSidebarOpen((v) => !v)}
          sidebarOpen={sidebarOpen}
          onRefresh={() => fetchData(true)}
        />

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">

            {/* ── Main column ── */}
            <div className="lg:col-span-2 space-y-6 lg:space-y-8 min-w-0">
              <Hero user={user} stats={stats} nextSession={nextSession} isRTL={isRTL} greeting={greeting} />

              {/* Stats: سطح واحد بدل 3 كروت متطابقة */}
              <section className={`${CARD} grid grid-cols-1 sm:grid-cols-3 shadow-sm overflow-hidden`}>
                <StatBlock
                  lead={<IconTile icon={Clock} grad={BRAND_GRAD} />}
                  label={t("ساعات التدريس", "Teaching hours")}
                  value={<AnimatedCounter value={stats?.totalTeachingMinutes || 0} formatter={(m) => formatDuration(m, isRTL)} />}
                  hint={t(`${stats?.completedSessions || 0} جلسة مكتملة`, `${stats?.completedSessions || 0} sessions completed`)} />
                <StatBlock edge
                  lead={<IconTile icon={Users} grad={TEAL_GRAD} />}
                  label={t("إجمالي الطلاب", "Total students")}
                  value={<AnimatedCounter value={stats?.totalStudents || 0} />}
                  hint={t(`${stats?.activeGroups || 0} مجموعة نشطة`, `${stats?.activeGroups || 0} active groups`)} />
                <StatBlock edge
                  lead={<Ring pct={stats?.overallAttendanceRate || 0} animate={animateProgress} />}
                  label={t("معدل الحضور", "Attendance rate")}
                  value={<><AnimatedCounter value={stats?.overallAttendanceRate || 0} />%</>}
                  hint={t(`${attendanceTotal} تسجيل حضور`, `${attendanceTotal} records`)} />
              </section>

              {/* Progress */}
              <section className={`${CARD} p-6 lg:p-8 shadow-sm`}>
                <SectionHead icon={TrendingUp} title={t("تقدم التدريس", "Teaching progress")}
                  sub={t("إنجازاتك مرحلة بمرحلة", "Your milestones, stage by stage")} />

                <div className="flex w-full items-stretch mb-8 overflow-x-auto pb-2">
                  {stages.map((stage, index) => {
                    const StageIcon = STAGE_ICONS[stage.icon] || BookOpen;
                    const done = stage.status === "completed";
                    const active = stage.isActive || stage.status === "active";
                    const soon = stage.status === "almost_there";
                    const pending = stage.status === "pending";
                    const nextStage = stages[index + 1];
                    let line = 0;
                    if (done) line = 100;
                    else if (active && nextStage) {
                      const cur = stage.percentage || 0;
                      const nxt = nextStage.percentage || 0;
                      line = cur > 0 && nxt > 0 ? Math.min((cur / nxt) * 100, 100) : 0;
                    }
                    const bg = done ? BRAND_GRAD : active ? CTA_GRAD : soon ? "linear-gradient(135deg, #004d59, #ff6437)" : undefined;
                    const badge = done ? t("مكتمل", "Done") : active ? t("شغّال", "Active") : soon ? t("قرّب", "Soon") : t("جاي", "Pending");
                    const last = index === stages.length - 1;

                    return (
                      <div key={stage.id} className={`flex items-start ${last ? "flex-none" : "flex-1"} min-w-[84px]`}>
                        <div className="flex flex-col items-center w-20 flex-shrink-0">
                          <div className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-md mb-2 transition-all duration-700
                            ${animateProgress ? "scale-100 opacity-100" : "scale-50 opacity-0"}
                            ${pending ? "bg-gray-100 dark:bg-[#21262d] border-2 border-gray-200 dark:border-[#30363d]" : ""}
                            ${active ? "pulse-ring" : ""}`}
                            style={{ background: bg, opacity: soon && animateProgress ? 0.75 : undefined, transitionDelay: `${index * 120}ms` }}>
                            <StageIcon weight="fill" className={`w-6 h-6 ${pending ? "text-gray-300 dark:text-[#6e7681]" : "text-white"}`} />
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black mb-1"
                            style={done ? { background: "#004d5915", color: "#004d59" }
                              : active ? { background: "#ff670015", color: "#ff6700" }
                                : soon ? { background: "#feaf0015", color: "#f67d00" }
                                  : { background: "#f3f4f6", color: "#9ca3af" }}>
                            {badge}
                          </span>
                          <p className={`font-black text-xs text-center ${pending ? "text-gray-500 dark:text-[#8b949e]" : "text-gray-900 dark:text-[#e6edf3]"}`}>
                            {isRTL ? stage.labelAr : stage.label}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-[#6e7681]">{stage.percentage}%</p>
                        </div>
                        {!last && (
                          <div className="flex-1 h-2 relative overflow-hidden rounded-full mt-6 mx-1 bg-gray-200 dark:bg-[#30363d]">
                            <div className="absolute top-0 start-0 h-full rounded-full transition-all duration-1000"
                              style={{ width: animateProgress ? `${line}%` : "0%", background: BRAND_GRAD, transitionDelay: `${index * 120 + 250}ms` }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {progressData?.summaryCards && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {progressData.summaryCards.map((card) => {
                      const Icon = STAT_ICONS[card.icon] || CheckCircle;
                      const value = card.id === "teaching_hours"
                        ? formatDuration(stats?.totalTeachingMinutes || 0, isRTL)
                        : card.value;
                      return (
                        <div key={card.id} className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-[#0d1117]/60">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${card.iconColor}`}>
                            <Icon weight="fill" className="w-6 h-6" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-2xl font-black text-gray-900 dark:text-[#e6edf3] leading-tight">{value}</p>
                            <p className="text-xs text-gray-500 dark:text-[#8b949e] truncate">{isRTL ? card.titleAr : card.title}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Groups */}
              <section>
                <SectionHead icon={Users} title={t("مجموعاتي", "My groups")} sub={t("المجموعات اللي بتدرّسها دلوقتي", "The groups you're teaching now")} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {currentGroups.length > 0 ? currentGroups.map((g) => (
                    <article key={g._id} className={`${CARD} overflow-hidden shadow-sm`}>
                      <div className="relative h-28" style={{ background: levelGrad(g.courseLevel) }}>
                        {g.courseThumbnail
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={g.courseThumbnail} alt="" className="absolute inset-0 w-full h-full object-cover" />
                          : <PaperPlane className="absolute -bottom-2 end-3 w-24 opacity-25 -rotate-12" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                        <div className="absolute bottom-3 start-4 end-4 flex items-end justify-between gap-2">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black text-white bg-white/20 border border-white/30 backdrop-blur-sm">
                            {getLevelLabel(g.courseLevel)}
                          </span>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${g.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}`}>
                            {g.status === "active" ? t("نشط", "Active") : g.status}
                          </span>
                        </div>
                      </div>
                      <div className="p-5">
                        <h4 className="font-black text-gray-900 dark:text-[#e6edf3] line-clamp-1">{g.courseTitle}</h4>
                        <p className="text-xs text-gray-500 dark:text-[#8b949e] mt-0.5 mb-4">
                          {g.name} · <span className="font-mono">{g.code}</span>
                        </p>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-gray-500 dark:text-[#8b949e]">{t("التقدم", "Progress")}</span>
                          <span className="font-black text-gray-900 dark:text-[#e6edf3]">{g.progress}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden mb-4">
                          <div className="h-full rounded-full transition-all duration-1000"
                            style={{ width: animateProgress ? `${g.progress}%` : "0%", background: levelGrad(g.courseLevel) }} />
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-[#8b949e]">
                          <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{g.currentStudentsCount}/{g.maxStudents}</span>
                          <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" />{g.completedSessions}/{g.totalSessions}</span>
                          <span className="flex items-center gap-1.5 font-black text-[#ff6700]">
                            <Clock weight="fill" className="w-4 h-4" />{formatDuration(g.myTeachingMinutes || 0, isRTL)}
                          </span>
                        </div>
                      </div>
                    </article>
                  )) : (
                    <div className={`${CARD} col-span-full text-center py-12`}>
                      <Users className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-[#6e7681]" />
                      <p className="text-gray-500 dark:text-[#8b949e] font-bold">{t("مفيش مجموعات نشطة دلوقتي", "No active groups yet")}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Recent sessions */}
              {recentSessions.length > 0 && (
                <section>
                  <SectionHead icon={ClipboardList} title={t("آخر الجلسات", "Recent sessions")} />
                  <div className="space-y-2.5">
                    {recentSessions.map((s, i) => {
                      const total = s.totalAttendance || s.presentCount + s.absentCount;
                      const pct = total > 0 ? Math.round((s.presentCount / total) * 100) : 0;
                      return (
                        <div key={s._id || i} className={`${CARD} flex items-center gap-4 p-4`}>
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: GREEN_GRAD }}>
                            <CheckCircle weight="fill" className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-sm text-gray-900 dark:text-[#e6edf3] truncate">{s.title}</p>
                            <p className="text-xs text-gray-500 dark:text-[#8b949e] truncate">{s.groupName} · {s.date}</p>
                          </div>
                          <div className="w-28 flex-shrink-0">
                            <div className="flex justify-between text-[11px] font-black mb-1">
                              <span className="text-[#004d59] dark:text-teal-400">{s.presentCount} {t("حاضر", "in")}</span>
                              <span className="text-red-500">{s.absentCount} {t("غايب", "out")}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-red-100 dark:bg-red-900/30 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: GREEN_GRAD }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>

            {/* ── Side column ── */}
            <aside className="lg:col-span-1 space-y-6 lg:sticky lg:top-24 min-w-0">
              <section className={`${CARD} p-6 shadow-sm`}>
                <SectionHead icon={Calendar} title={t("التقويم", "Calendar")} />
                <MiniCalendar isRTL={isRTL} />

                <div className="mt-6 pt-5 border-t border-gray-100 dark:border-[#30363d]">
                  <h4 className="text-sm font-black text-gray-700 dark:text-[#8b949e] mb-3">{t("الجلسات الجاية", "Upcoming sessions")}</h4>
                  {upcomingEvents.length > 0 ? (
                    <div className="space-y-2.5">
                      {upcomingEvents.slice(0, 3).map((ev, i) => (
                        <div key={ev._id || i} className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-[#0d1117]/60">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: i === 2 ? CTA_GRAD : i === 1 ? TEAL_GRAD : BRAND_GRAD }}>
                            <Calendar weight="fill" className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-sm text-gray-900 dark:text-[#e6edf3] truncate">{ev.title}</p>
                            <p className="text-xs text-gray-500 dark:text-[#8b949e]">{ev.formattedDate || ev.date} · {ev.startTime} - {ev.endTime}</p>
                            {ev.groupName && <p className="text-xs font-black text-[#ff6700] mt-0.5 truncate">{ev.groupName}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <Calendar className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-[#6e7681]" />
                      <p className="text-sm text-gray-500 dark:text-[#8b949e]">{t("مفيش جلسات جاية", "No upcoming sessions")}</p>
                    </div>
                  )}
                </div>
              </section>

              <section className={`${CARD} p-6 shadow-sm`}>
                <SectionHead icon={BarChart3} title={t("إحصائيات الحضور", "Attendance overview")} />
                <div className="space-y-3.5">
                  {attendanceRows.map((row) => {
                    const pct = attendanceTotal > 0 ? Math.round((row.value / attendanceTotal) * 100) : 0;
                    return (
                      <div key={row.label} className="flex items-center gap-3">
                        <span className="text-xs font-black w-14 flex-shrink-0" style={{ color: row.color }}>{row.label}</span>
                        <div className="flex-1 h-2 bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-1000"
                            style={{ width: animateProgress ? `${pct}%` : "0%", background: row.bar }} />
                        </div>
                        <span className="text-xs font-black w-8 text-end flex-shrink-0" style={{ color: row.color }}>{row.value}</span>
                      </div>
                    );
                  })}
                </div>
                <Link href="/instructor/reports"
                  className="mt-5 flex items-center justify-center gap-2 text-sm text-white px-4 py-3 rounded-xl font-black shadow-md"
                  style={{ background: BRAND_GRAD }}>
                  <PaperPlaneTilt weight="fill" className="w-4 h-4" />{t("التقارير بالتفصيل", "Detailed reports")}
                </Link>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}