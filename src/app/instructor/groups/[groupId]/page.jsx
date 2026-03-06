"use client";
// src/app/instructor/groups/[groupId]/page.jsx
// Redesigned to match InstructorDashboard aesthetic

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/app/context/LocaleContext";
import InstructorSidebar from "../../InstructorSidebar";
import InstructorHeader from "../../InstructorHeader";
import {
  Users, BookOpen, Clock, CheckCircle, Calendar, X,
  ChevronRight, ChevronLeft, AlertCircle, Loader2,
  RefreshCw, TrendingUp, BarChart3, Layers, ExternalLink,
  Play, Video, ClipboardList, Globe, Presentation,
  FolderOpen, BookMarked, ChevronDown, Star, Zap,
  GraduationCap, Info, User, Phone, CreditCard,
  CheckCheck, Timer, Sparkles, ArrowLeft,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLevelGradient(level) {
  if (level === "advanced")     return "from-red-500 to-orange-500";
  if (level === "intermediate") return "from-blue-500 to-indigo-500";
  return "from-green-500 to-teal-500";
}

function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
function fmtTimeAr(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "م" : "ص"}`;
}
function fmtDate(d, isAr) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ─── AnimatedCounter ──────────────────────────────────────────────────────────

function AnimatedCounter({ value, duration = 1200 }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let st; let fr;
    const run = (ts) => {
      if (!st) st = ts;
      const p = Math.min((ts - st) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      setCount(Math.floor(eased * value));
      if (p < 1) fr = requestAnimationFrame(run);
    };
    fr = requestAnimationFrame(run);
    return () => cancelAnimationFrame(fr);
  }, [value, duration]);
  return <span>{count}</span>;
}

// ─── Status config ────────────────────────────────────────────────────────────

const SESSION_STATUS = {
  completed: {
    labelAr: "مكتملة", labelEn: "Completed",
    dot: "bg-emerald-400",
    badge: "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400",
    icon: CheckCircle,
    grad: "from-green-400 to-emerald-500",
  },
  scheduled: {
    labelAr: "مجدولة", labelEn: "Scheduled",
    dot: "bg-blue-400",
    badge: "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400",
    icon: Clock,
    grad: "from-blue-400 to-indigo-500",
  },
  cancelled: {
    labelAr: "ملغاة", labelEn: "Cancelled",
    dot: "bg-red-400",
    badge: "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400",
    icon: X,
    grad: "from-red-400 to-rose-500",
  },
  postponed: {
    labelAr: "مؤجلة", labelEn: "Postponed",
    dot: "bg-yellow-400",
    badge: "bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    icon: Clock,
    grad: "from-yellow-400 to-amber-500",
  },
};

// ─── Session Row ──────────────────────────────────────────────────────────────

function SessionRow({ session, isAr, lvlGrad }) {
  const t   = (ar, en) => isAr ? ar : en;
  const cfg = SESSION_STATUS[session.status] || SESSION_STATUS.scheduled;
  const Icon = cfg.icon;
  const fmt  = isAr ? fmtTimeAr : fmtTime;
  const isToday     = session.isToday;
  const isCompleted = session.status === "completed";

  return (
    <div
      className={`
        group/row flex items-center gap-3 p-4 rounded-2xl border bg-white dark:bg-[#161b22]
        transition-all duration-300 hover:shadow-md hover:-translate-y-0.5
        ${isToday
          ? "border-primary/30 ring-1 ring-primary/10 shadow-md"
          : "border-gray-100 dark:border-[#30363d] hover:border-gray-200 dark:hover:border-[#3d444d]"}
      `}
    >
      {/* Icon */}
      <div
        className={`
          w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm text-sm font-bold
          ${isCompleted
            ? `bg-gradient-to-br ${cfg.grad} text-white`
            : isToday
            ? "bg-gradient-to-br from-primary to-purple-600 text-white"
            : session.status === "cancelled"
            ? `bg-gradient-to-br ${cfg.grad} text-white`
            : "bg-gradient-to-br from-blue-400 to-indigo-500 text-white"}
        `}
      >
        {isCompleted ? <Icon className="w-5 h-5" /> : session.sessionNumber}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          {isToday && (
            <span className="text-[10px] font-semibold text-primary flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {t("اليوم", "Today")}
            </span>
          )}
          <p className="font-semibold text-sm text-gray-900 dark:text-[#e6edf3] truncate group-hover/row:text-primary transition-colors">
            {session.title}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-[#8b949e] flex-wrap">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(session.scheduledDate, isAr)}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmt(session.startTime)}</span>
          {session.lessons?.length > 0 && (
            <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{session.lessons.length} {t("درس", "lessons")}</span>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isCompleted && session.stats?.attRate !== null && (
          <span className={`text-xs font-semibold hidden sm:block
            ${session.stats.attRate >= 80 ? "text-green-500" : session.stats.attRate >= 60 ? "text-yellow-500" : "text-red-500"}`}>
            {session.stats.attRate}%
          </span>
        )}
        {session.showJoinButton && (
          <a
            href={session.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-primary to-purple-600 text-white shadow-md hover:shadow-lg hover:scale-105 transition-all"
          >
            <Video className="w-3.5 h-3.5" />{t("بدء", "Start")}
          </a>
        )}
        {isCompleted && !session.attendanceTaken && (
          <Link
            href={`/instructor/attendance?session=${session._id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/20 hover:bg-yellow-200 dark:hover:bg-yellow-500/20 transition-all"
          >
            <ClipboardList className="w-3 h-3" />{t("تسجيل", "Record")}
          </Link>
        )}
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
          {isAr ? cfg.labelAr : cfg.labelEn}
        </span>
      </div>
    </div>
  );
}

// ─── Module Card ──────────────────────────────────────────────────────────────

function ModuleCard({ module, isAr, lvlGrad, defaultOpen = false }) {
  const t = (ar, en) => isAr ? ar : en;
  const [open, setOpen]     = useState(defaultOpen);
  const [showBlog, setShowBlog] = useState(false);

  const completedSessions = module.sessions.filter((s) => s.status === "completed").length;
  const totalSessions     = module.sessions.length;
  const progress          = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  const blogBody = isAr ? module.blogBodyAr : module.blogBodyEn;
  const hasBlog  = blogBody && blogBody.trim().length > 0;

  return (
    <div
      className={`
        bg-white dark:bg-[#161b22] rounded-2xl border overflow-hidden
        shadow-lg dark:shadow-black/40 transition-all duration-300
        ${open
          ? "border-gray-200 dark:border-[#3d444d] shadow-xl"
          : "border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d]"}
      `}
    >
      {/* Module Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-gray-50 dark:hover:bg-[#1c2128] transition-colors"
      >
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${lvlGrad} flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20`}>
          <Layers className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
              {t(`الوحدة ${module.moduleNumber}`, `Module ${module.moduleNumber}`)}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
              ${progress === 100
                ? "bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400"
                : progress > 0
                ? "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                : "bg-gray-100 dark:bg-[#21262d] text-gray-500 dark:text-[#8b949e]"}`}>
              {completedSessions}/{totalSessions} {t("جلسة", "sessions")}
            </span>
          </div>
          <p className="font-semibold text-sm text-gray-900 dark:text-[#e6edf3] truncate">{module.title}</p>
        </div>

        {/* Progress bar mini */}
        <div className="hidden sm:flex flex-col items-end gap-1.5 flex-shrink-0 w-24">
          <span className="text-xs font-semibold text-gray-700 dark:text-[#8b949e]">{progress}%</span>
          <div className="w-full h-1.5 bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${lvlGrad} rounded-full transition-all duration-700`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-[#30363d]">
          {module.description && (
            <p className="px-6 py-3 text-sm text-gray-600 dark:text-[#8b949e] leading-relaxed bg-gray-50/50 dark:bg-[#0d1117]/40">
              {module.description}
            </p>
          )}

          {/* Links row */}
          {(module.presentationUrls?.length > 0 || module.projects?.length > 0) && (
            <div className="px-6 py-3 flex flex-wrap gap-2 border-b border-gray-100 dark:border-[#30363d]">
              {module.presentationUrls?.map((p, i) => (
                <a
                  key={i}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 dark:bg-purple-500/10 rounded-xl text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-500/20 transition-all"
                >
                  <Presentation className="w-3 h-3" />
                  {t(`عرض ${p.sessionNumber}`, `Presentation ${p.sessionNumber}`)}
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              ))}
              {module.projects?.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-500/10 rounded-xl text-xs font-semibold text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/20 transition-all"
                >
                  <Globe className="w-3 h-3" />
                  {t(`مشروع ${i + 1}`, `Project ${i + 1}`)}
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              ))}
            </div>
          )}

          {/* Sessions */}
          <div className="p-4 space-y-2">
            {module.sessions.map((session) => (
              <SessionRow key={session._id} session={session} isAr={isAr} lvlGrad={lvlGrad} />
            ))}
          </div>

          {/* Blog */}
          {hasBlog && (
            <div className="border-t border-gray-100 dark:border-[#30363d]">
              <button
                onClick={() => setShowBlog(!showBlog)}
                className="w-full flex items-center gap-2 px-6 py-3 hover:bg-gray-50 dark:hover:bg-[#1c2128] transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
                  <BookMarked className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-xs font-semibold text-gray-700 dark:text-[#8b949e] flex-1 text-start">
                  {t("محتوى الوحدة التفصيلي", "Module Detailed Content")}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showBlog ? "rotate-180" : ""}`} />
              </button>
              {showBlog && (
                <div
                  className="px-6 py-4 prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed bg-white dark:bg-[#0d1117]/30 overflow-auto max-h-80"
                  dangerouslySetInnerHTML={{ __html: blogBody }}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Course Full View ─────────────────────────────────────────────────────────

function CourseFullView({ course, group, lvlGrad, isAr }) {
  const t = (ar, en) => isAr ? ar : en;
  const levelLabel = {
    advanced:     isAr ? "متقدم"   : "Advanced",
    intermediate: isAr ? "متوسط"   : "Intermediate",
    beginner:     isAr ? "مبتدئ"   : "Beginner",
  }[course.level] || course.level;

  const modules = course.curriculum || [];

  return (
    <div className="space-y-6">

      {/* Course Info Card — matches dashboard "Teaching Journey" hero style */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-600 to-pink-600 rounded-3xl opacity-60 blur-md group-hover:opacity-80 transition-opacity duration-500" />
        <div className="relative bg-gradient-to-br from-primary via-purple-600 to-pink-600 rounded-3xl p-6 overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slower" />

          <div className="relative z-10">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/30 shadow-lg">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-2 mb-2">
                  {course.grade   && <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 text-white border border-white/20">🎒 {course.grade}</span>}
                  {course.subject && <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 text-white border border-white/20">📘 {course.subject}</span>}
                  {course.level   && <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/30 text-white border border-white/30">{levelLabel}</span>}
                </div>
                <h2 className="text-xl font-bold text-white mb-1 leading-tight">{course.title}</h2>
                <p className="text-blue-100 text-sm leading-relaxed">{course.description}</p>
              </div>
            </div>

            {/* Stats row — same style as dashboard hero */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Layers,   value: course.totalModules,  label: t("وحدات", "Modules") },
                { icon: BookOpen, value: course.totalLessons,  label: t("دروس", "Lessons") },
                { icon: Calendar, value: course.totalSessions, label: t("جلسات", "Sessions") },
              ].map(({ icon: Icon, value, label }, i) => (
                <div key={i} className="flex flex-col items-center py-3 bg-white/15 backdrop-blur-sm rounded-2xl border border-white/20">
                  <Icon className="w-4 h-4 text-white mb-1" />
                  <span className="font-bold text-xl text-white">{value}</span>
                  <span className="text-blue-200 text-[10px] mt-0.5">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Card — matches dashboard stats card style */}
      {group.schedule && (
        <div className="group/stats relative bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-[#e6edf3]">{t("جدول المجموعة", "Group Schedule")}</h3>
              <p className="text-xs text-gray-500 dark:text-[#8b949e]">{t("مواعيد الجلسات الأسبوعية", "Weekly session times")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {group.schedule.daysOfWeek?.map((day) => (
              <span key={day} className="text-xs px-3 py-1.5 rounded-xl bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium">{day}</span>
            ))}
            <span className="text-xs px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-[#21262d] text-gray-700 dark:text-[#8b949e] font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {fmtTime(group.schedule.timeFrom)} – {fmtTime(group.schedule.timeTo)}
            </span>
            {group.schedule.startDate && (
              <span className="text-xs px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-[#21262d] text-gray-700 dark:text-[#8b949e] font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3" />{fmtDate(group.schedule.startDate, isAr)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Curriculum */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-[#e6edf3] flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              {t("المنهج الدراسي", "Curriculum")}
            </h3>
            <p className="text-sm text-gray-500 dark:text-[#8b949e] mt-1">
              {modules.length} {t("وحدة", "modules")}
            </p>
          </div>
        </div>
        <div className="space-y-4">
          {modules.map((mod, mIdx) => (
            <CurriculumModuleCard
              key={mIdx}
              mod={mod}
              mIdx={mIdx}
              lvlGrad={lvlGrad}
              isAr={isAr}
              defaultOpen={mIdx === 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Curriculum Module Card ───────────────────────────────────────────────────

function CurriculumModuleCard({ mod, mIdx, lvlGrad, isAr, defaultOpen }) {
  const t = (ar, en) => isAr ? ar : en;
  const [open, setOpen]     = useState(defaultOpen);
  const [showBlog, setShowBlog] = useState(false);

  const sessionGroups = {};
  (mod.lessons || []).forEach((l) => {
    const sn = l.sessionNumber || 1;
    if (!sessionGroups[sn]) sessionGroups[sn] = [];
    sessionGroups[sn].push(l);
  });
  const dedupedGroups = {};
  Object.entries(sessionGroups).forEach(([sn, lessons]) => {
    const seen = new Set();
    dedupedGroups[sn] = lessons.filter((l) => {
      if (seen.has(l.title)) return false;
      seen.add(l.title);
      return true;
    });
  });
  const sessionNumbers = Object.keys(dedupedGroups).map(Number).sort((a, b) => a - b);

  const presentationMap = {};
  (mod.sessions || []).forEach((s) => {
    if (s.presentationUrl) presentationMap[s.sessionNumber] = s.presentationUrl;
  });

  const totalUniqueLessons = Object.values(dedupedGroups).reduce((a, ls) => a + ls.length, 0);
  const blogBody = isAr ? mod.blogBodyAr : mod.blogBodyEn;
  const hasBlog  = blogBody && blogBody.trim().length > 0;

  return (
    <div
      className={`
        bg-white dark:bg-[#161b22] rounded-2xl border overflow-hidden
        shadow-lg dark:shadow-black/40 transition-all duration-300
        ${open
          ? "border-gray-200 dark:border-[#3d444d] shadow-xl"
          : "border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d]"}
      `}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-gray-50 dark:hover:bg-[#1c2128] transition-colors"
      >
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${lvlGrad} flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20 font-bold text-white text-sm`}>
          {mIdx + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
              {t(`الوحدة ${mIdx + 1}`, `Module ${mIdx + 1}`)}
            </span>
            <span className="text-xs text-gray-500 dark:text-[#8b949e]">
              {sessionNumbers.length} {t("جلسات", "sessions")} · {totalUniqueLessons} {t("درس", "lessons")}
            </span>
          </div>
          <p className="font-semibold text-sm text-gray-900 dark:text-[#e6edf3] truncate">{mod.title}</p>
          {mod.description && !open && (
            <p className="text-xs text-gray-400 dark:text-[#6e7681] truncate mt-0.5">{mod.description}</p>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-[#30363d]">
          {mod.description && (
            <p className="px-6 py-3 text-sm text-gray-600 dark:text-[#8b949e] leading-relaxed bg-gray-50/50 dark:bg-[#0d1117]/40 border-b border-gray-100 dark:border-[#30363d]">
              {mod.description}
            </p>
          )}

          <div className="p-4 space-y-4">
            {sessionNumbers.map((sn) => {
              const lessons = dedupedGroups[sn] || [];
              const presUrl = presentationMap[sn];
              return (
                <div key={sn} className="rounded-2xl border border-gray-100 dark:border-[#30363d] overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 dark:bg-[#0d1117]/40">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${lvlGrad} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                        <span className="text-white text-xs font-bold">{sn}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-[#e6edf3]">
                          {t(`الجلسة ${sn}`, `Session ${sn}`)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-[#8b949e]">
                          {lessons.length} {t("درس", "lessons")}
                        </p>
                      </div>
                    </div>
                    {presUrl && (
                      <a
                        href={presUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl text-xs font-semibold text-gray-700 dark:text-[#8b949e] hover:border-primary/50 hover:text-primary transition-all shadow-sm flex-shrink-0"
                      >
                        <Presentation className="w-3 h-3" />
                        {t("العرض", "Slides")}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>

                  <div className="divide-y divide-gray-50 dark:divide-[#21262d]">
                    {lessons.map((lesson, li) => (
                      <div key={li} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#0d1117]/30 transition-colors">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 mt-0.5 bg-gradient-to-br ${lvlGrad} text-white shadow-sm`}>
                          {li + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-[#c9d1d9]">{lesson.title}</p>
                          {lesson.description && (
                            <p className="text-xs text-gray-400 dark:text-[#6e7681] mt-0.5 leading-relaxed">{lesson.description}</p>
                          )}
                          {lesson.duration && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-gray-400 dark:text-[#6e7681]">
                              <Clock className="w-2.5 h-2.5" />{lesson.duration}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {mod.projects?.length > 0 && (
            <div className="px-6 pb-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-[#6e7681] mb-2 flex items-center gap-1">
                <FolderOpen className="w-3 h-3" />{t("مشاريع الوحدة", "Module Projects")}
              </p>
              <div className="flex flex-wrap gap-2">
                {mod.projects.map((url, pi) => (
                  <a
                    key={pi}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-500/10 rounded-xl text-xs font-semibold text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/20 transition-all"
                  >
                    <Globe className="w-3 h-3" />{t(`مشروع ${pi + 1}`, `Project ${pi + 1}`)}<ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {hasBlog && (
            <div className="border-t border-gray-100 dark:border-[#30363d]">
              <button
                onClick={() => setShowBlog(!showBlog)}
                className="w-full flex items-center gap-2 px-6 py-3 hover:bg-gray-50 dark:hover:bg-[#1c2128] transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
                  <BookMarked className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-xs font-semibold text-gray-700 dark:text-[#8b949e] flex-1 text-start">
                  {t("محتوى الوحدة التفصيلي", "Module Detailed Content")}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showBlog ? "rotate-180" : ""}`} />
              </button>
              {showBlog && (
                <div
                  className="px-6 py-4 prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed bg-white dark:bg-[#0d1117]/30 overflow-auto max-h-80 border-t border-gray-100 dark:border-[#30363d]"
                  dangerouslySetInnerHTML={{ __html: blogBody }}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="h-56 bg-white dark:bg-[#161b22] rounded-3xl animate-pulse border border-gray-100 dark:border-[#30363d] shadow-lg" />
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse border border-gray-100 dark:border-[#30363d] shadow-lg" />
        ))}
      </div>
      {/* Cards */}
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse border border-gray-100 dark:border-[#30363d] shadow-lg" />
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InstructorGroupDetailPage() {
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const t = (ar, en) => isAr ? ar : en;
  const router = useRouter();
  const params = useParams();
  const groupId = params?.groupId;

  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [data, setData]               = useState(null);
  const [user, setUser]               = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab]     = useState("sessions"); // sessions | students | course
  const [animateStats, setAnimateStats] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [grpRes, dashRes] = await Promise.all([
        fetch(`/api/instructor/groups/${groupId}`, { credentials: "include" }).then((r) => r.json()),
        fetch("/api/instructor/dashboard",         { credentials: "include" }).then((r) => r.json()),
      ]);
      if (grpRes.success) setData(grpRes.data);
      else setError(grpRes.message || t("حدث خطأ", "Something went wrong"));
      if (dashRes.success) setUser(dashRes.data.user);
    } catch {
      setError(t("فشل التحميل", "Failed to load"));
    } finally {
      setLoading(false);
    }
  }, [groupId, isAr]);

  useEffect(() => { if (groupId) fetchData(); }, [fetchData]);
  useEffect(() => {
    if (data) setTimeout(() => setAnimateStats(true), 300);
  }, [data]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("token");
    router.push("/");
  };

  const currentUser = user || { name: isAr ? "مدرس" : "Instructor", email: "", role: "instructor" };

  if (!groupId) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0d1117]" dir={isAr ? "rtl" : "ltr"}>
      <div className="text-center max-w-md p-8">
        <div className="w-24 h-24 mx-auto bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="h-12 w-12 text-red-500 animate-pulse" />
        </div>
        <button
          onClick={() => router.push("/instructor/groups")}
          className="px-6 py-3 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
        >
          {t("العودة", "Back")}
        </button>
      </div>
    </div>
  );

  const group    = data?.group;
  const course   = data?.course;
  const sessions = data?.sessions;
  const students = data?.students || [];
  const lvlGrad  = getLevelGradient(course?.level);

  const TABS = [
    { id: "sessions", labelAr: "الجلسات", labelEn: "Sessions", count: sessions?.stats?.total || 0 },
    { id: "students", labelAr: "الطلاب",  labelEn: "Students", count: students.length },
    { id: "course",   labelAr: "الكورس",  labelEn: "Course",   count: null },
  ];

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22] flex relative"
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 ${isAr ? "right-0" : "left-0"} z-50 transform transition-all duration-500
          ${sidebarOpen ? "translate-x-0" : (isAr ? "translate-x-full" : "-translate-x-full") + " lg:translate-x-0"}
          flex-shrink-0`}
      >
        <InstructorSidebar user={currentUser} onLogout={handleLogout} />
      </div>

      <main className="flex-1 min-w-0 transition-all duration-300">
        <InstructorHeader
          user={currentUser}
          notifications={[]}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          onRefresh={fetchData}
        />

        {/* ── Sticky top bar ── */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md border-b border-gray-200 dark:border-[#30363d]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 py-3">
              {/* Back */}
              <button
                onClick={() => router.push("/instructor/groups")}
                className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#21262d] flex items-center justify-center text-gray-500 hover:text-primary hover:bg-primary/10 transition-all group flex-shrink-0"
              >
                {isAr
                  ? <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                  : <ChevronLeft  className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />}
              </button>

              {/* Icon */}
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${lvlGrad} flex items-center justify-center flex-shrink-0 shadow-md`}>
                <Users className="w-4 h-4 text-white" />
              </div>

              {/* Title */}
              <div className="flex-1 min-w-0">
                {loading ? (
                  <div className="space-y-1.5">
                    <div className="h-4 w-40 bg-gray-200 dark:bg-[#30363d] rounded animate-pulse" />
                    <div className="h-3 w-28 bg-gray-200 dark:bg-[#30363d] rounded animate-pulse" />
                  </div>
                ) : group ? (
                  <>
                    <h1 className="font-semibold text-sm text-gray-900 dark:text-[#e6edf3] truncate leading-none mb-0.5">{group.name}</h1>
                    <p className="text-xs text-gray-500 dark:text-[#8b949e] truncate">{course?.title} · <span className="font-mono">{group.code}</span></p>
                  </>
                ) : null}
              </div>

              {/* Refresh */}
              <button
                onClick={fetchData}
                className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#21262d] flex items-center justify-center text-gray-500 hover:text-primary transition-all flex-shrink-0"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            {!loading && group && (
              <div className="flex gap-2 pb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {TABS.map(({ id, labelAr, labelEn, count }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-medium flex-shrink-0 transition-all
                      ${activeTab === id
                        ? "bg-gradient-to-r from-primary to-purple-600 text-white shadow-md shadow-primary/20"
                        : "bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-[#8b949e] hover:bg-gray-200 dark:hover:bg-[#30363d]"
                      }`}
                  >
                    {isAr ? labelAr : labelEn}
                    {count !== null && (
                      <span className={`text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold
                        ${activeTab === id ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-[#30363d] text-gray-500"}`}>
                        {count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">

          {loading && <Skeleton />}

          {!loading && error && (
            <div className="flex items-center gap-3 p-6 bg-white dark:bg-[#161b22] rounded-2xl border border-red-200 dark:border-red-800/40 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400 flex-1">{error}</p>
              <button
                onClick={fetchData}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />{t("إعادة", "Retry")}
              </button>
            </div>
          )}

          {!loading && !error && group && (
            <>
              {/* ── Hero Banner — matches InstructorDashboard hero exactly ── */}
              <div className="relative group min-w-4xl mx-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-600 to-pink-600 rounded-3xl opacity-60 blur-md group-hover:opacity-80 transition-opacity duration-500" />
                <div className="relative bg-gradient-to-br from-primary via-purple-600 to-pink-600 rounded-3xl p-6 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse-slow" />
                  <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slower" />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                          <span className="text-yellow-300 font-medium text-sm">{course?.subject} · {course?.grade}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-1 leading-tight">{group.name}</h2>
                        <p className="text-blue-100 text-sm">{course?.title}</p>
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/30 shadow-lg">
                        <BookOpen className="w-7 h-7 text-white" />
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-5">
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-blue-100">{t("تقدم الجلسات", "Session Progress")}</span>
                        <span className="text-white font-semibold">{group.progress}%</span>
                      </div>
                      <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white/80 rounded-full relative overflow-hidden transition-all duration-700"
                          style={{ width: `${group.progress}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-40 animate-shimmer" />
                        </div>
                      </div>
                    </div>

                    {/* Quick actions */}
                    {/* <div className="flex flex-wrap gap-3">
                      <Link
                        href="/instructor/attendance"
                        className="group/btn relative px-5 py-2.5 bg-white text-primary rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm overflow-hidden"
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          <ClipboardList className="w-4 h-4" />
                          {t("تسجيل الحضور", "Take Attendance")}
                        </span>
                      </Link>
                      <Link
                        href="/instructor/sessions"
                        className="px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/20 transition-all duration-300 border border-white/20 text-sm"
                      >
                        {t("الجلسات", "Sessions")}
                      </Link>
                    </div> */}
                  </div>
                </div>
              </div>

              {/* ── Stats Cards — same style as dashboard Teaching Hours / Students / Attendance ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  {
                    icon: Users,
                    value: `${group.currentStudentsCount}/${group.maxStudents}`,
                    rawValue: group.currentStudentsCount,
                    label: t("الطلاب", "Students"),
                    badge: t("مسجل", "Enrolled"),
                    gradient: "from-blue-400 to-indigo-500",
                    badgeBg: "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
                    barColor: "from-blue-400 to-indigo-500",
                    barWidth: `${Math.min((group.currentStudentsCount / group.maxStudents) * 100, 100)}%`,
                  },
                  {
                    icon: BookOpen,
                    value: `${sessions?.stats?.completed || 0}/${sessions?.stats?.total || 0}`,
                    rawValue: sessions?.stats?.completed || 0,
                    label: t("الجلسات", "Sessions"),
                    badge: t("مكتملة", "Completed"),
                    gradient: "from-green-400 to-emerald-500",
                    badgeBg: "bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400",
                    barColor: "from-green-400 to-emerald-500",
                    barWidth: sessions?.stats?.total ? `${Math.round((sessions.stats.completed / sessions.stats.total) * 100)}%` : "0%",
                  },
                  {
                    icon: Clock,
                    value: `${group.teachingHours}h`,
                    rawValue: group.teachingHours,
                    label: t("ساعات التدريس", "Teaching Hours"),
                    badge: t("ساعات", "Hours"),
                    gradient: "from-primary to-purple-600",
                    badgeBg: "bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400",
                    barColor: "from-primary to-purple-600",
                    barWidth: "75%",
                  },
                  {
                    icon: TrendingUp,
                    value: `${group.progress}%`,
                    rawValue: group.progress,
                    label: t("التقدم", "Progress"),
                    badge: t("إنجاز", "Done"),
                    gradient: "from-yellow-400 to-amber-500",
                    badgeBg: "bg-yellow-100 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
                    barColor: "from-yellow-400 to-amber-500",
                    barWidth: `${group.progress}%`,
                  },
                ].map(({ icon: Icon, value, label, badge, gradient, badgeBg, barColor, barWidth }, i) => (
                  <div
                    key={i}
                    className="group/stats relative bg-white dark:bg-[#161b22] rounded-2xl p-5 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover/stats:opacity-100 transition-opacity duration-300"
                      style={{ background: "radial-gradient(circle at top right, rgba(140,82,255,0.05), transparent 60%)" }} />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover/stats:scale-110 transition-transform duration-300`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badgeBg}`}>
                          {badge}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-[#e6edf3] mb-1">{value}</h3>
                      <p className="text-xs text-gray-500 dark:text-[#8b949e]">{label}</p>
                      <div className="mt-3 h-1 w-full bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-1000`}
                          style={{ width: animateStats ? barWidth : "0%" }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Sessions Tab ── */}
              {activeTab === "sessions" && (
                <div className="space-y-6">
                  {/* Session breakdown cards — like attendance overview */}
                  <div className="group/progress relative bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl transition-all duration-300">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-[#e6edf3] flex items-center gap-2 mb-5">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      {t("إحصائيات الجلسات", "Session Overview")}
                    </h3>
                    <div className="space-y-3">
                      {[
                        { label: t("مكتملة", "Completed"),  value: sessions?.stats?.completed || 0, color: "from-green-400 to-emerald-500", text: "text-green-600 dark:text-green-400" },
                        { label: t("مجدولة", "Scheduled"),  value: sessions?.stats?.scheduled || 0, color: "from-blue-400 to-indigo-500",   text: "text-blue-600 dark:text-blue-400" },
                        { label: t("ملغاة",  "Cancelled"),  value: sessions?.stats?.cancelled || 0, color: "from-red-400 to-rose-500",      text: "text-red-600 dark:text-red-400" },
                        { label: t("مؤجلة",  "Postponed"),  value: sessions?.stats?.postponed || 0, color: "from-yellow-400 to-amber-500",  text: "text-yellow-600 dark:text-yellow-400" },
                      ].map((item) => {
                        const total = sessions?.stats?.total || 1;
                        const pct   = Math.round((item.value / total) * 100);
                        return (
                          <div key={item.label} className="flex items-center gap-3">
                            <span className={`text-xs font-medium w-16 flex-shrink-0 ${item.text}`}>{item.label}</span>
                            <div className="flex-1 h-2 bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                              <div
                                className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-1000`}
                                style={{ width: animateStats ? `${pct}%` : "0%" }}
                              />
                            </div>
                            <span className={`text-xs font-bold w-6 text-right flex-shrink-0 ${item.text}`}>{item.value}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Needs attendance alert */}
                  {sessions?.stats?.needsAttendance > 0 && (
                    <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-500/10 rounded-2xl border border-yellow-200 dark:border-yellow-500/20">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-yellow-500/20">
                        <ClipboardList className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                          {t(
                            `${sessions.stats.needsAttendance} جلسة تحتاج تسجيل حضور`,
                            `${sessions.stats.needsAttendance} session(s) need attendance`
                          )}
                        </p>
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">
                          {t("سجّل الحضور للجلسات المكتملة", "Record attendance for completed sessions")}
                        </p>
                      </div>
                      <Link
                        href="/instructor/attendance"
                        className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-xl text-xs font-semibold hover:shadow-lg transition-all transform hover:scale-105"
                      >
                        {t("تسجيل", "Record")}
                      </Link>
                    </div>
                  )}

                  {/* Modules */}
                  {sessions?.byModule?.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-[#e6edf3] flex items-center gap-2">
                          <Layers className="w-5 h-5 text-primary" />
                          {t("الوحدات والجلسات", "Modules & Sessions")}
                        </h3>
                      </div>
                      {sessions.byModule.map((module, i) => (
                        <ModuleCard
                          key={module.moduleIndex}
                          module={module}
                          isAr={isAr}
                          lvlGrad={lvlGrad}
                          defaultOpen={i === 0}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] shadow-lg">
                      <div className="w-20 h-20 mx-auto bg-gray-100 dark:bg-[#21262d] rounded-full flex items-center justify-center mb-4">
                        <Calendar className="w-10 h-10 text-gray-400 dark:text-[#6e7681]" />
                      </div>
                      <p className="text-gray-500 dark:text-[#8b949e]">{t("لا توجد جلسات بعد", "No sessions yet")}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Students Tab ── */}
              {activeTab === "students" && (
                <div className="space-y-6">
                  {/* Header card */}
                  <div className="relative bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d]">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Users className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-[#e6edf3]">
                          {t("قائمة الطلاب", "Student Roster")}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-[#8b949e] mt-1">
                          <AnimatedCounter value={students.length} /> {t("طالب مسجل", "students enrolled")}
                        </p>
                      </div>
                      <div className="ms-auto h-1 w-32 bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all duration-1000"
                          style={{ width: animateStats ? `${Math.min((students.length / group.maxStudents) * 100, 100)}%` : "0%" }}
                        />
                      </div>
                    </div>
                  </div>

                  {students.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] shadow-lg">
                      <div className="w-20 h-20 mx-auto bg-gray-100 dark:bg-[#21262d] rounded-full flex items-center justify-center mb-4">
                        <Users className="w-10 h-10 text-gray-400 dark:text-[#6e7681]" />
                      </div>
                      <p className="text-gray-500 dark:text-[#8b949e]">{t("لا يوجد طلاب بعد", "No students yet")}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {students.map((student) => (
                        <div
                          key={student._id}
                          className="group/stu relative bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] p-5 shadow-lg dark:shadow-black/40 hover:shadow-xl dark:hover:border-[#3d444d] transition-all duration-300 transform hover:-translate-y-1"
                        >
                          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover/stu:opacity-100 transition-opacity duration-300"
                            style={{ background: "radial-gradient(circle at top right, rgba(140,82,255,0.05), transparent 60%)" }} />
                          <div className="relative z-10 flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${lvlGrad} flex items-center justify-center font-bold text-white text-lg flex-shrink-0 shadow-lg group-hover/stu:scale-110 transition-transform`}>
                              {(student.name?.[0] || "?").toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-gray-900 dark:text-[#e6edf3] truncate">{student.name}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {student.phone && (
                                  <span className="text-xs text-gray-500 dark:text-[#8b949e] flex items-center gap-1">
                                    <Phone className="w-3 h-3" />{student.phone}
                                  </span>
                                )}
                                {student.guardian && (
                                  <span className="text-xs text-gray-500 dark:text-[#8b949e] flex items-center gap-1">
                                    <User className="w-3 h-3" />{student.guardian}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full
                                ${student.status === "Active"
                                  ? "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400"
                                  : "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400"}`}>
                                {student.status}
                              </span>
                              {student.credits !== null && (
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1
                                  ${student.credits <= 0
                                    ? "bg-gray-100 dark:bg-[#21262d] text-gray-500"
                                    : student.credits <= 2
                                    ? "bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                                    : student.credits <= 5
                                    ? "bg-yellow-100 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                                    : "bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400"}`}>
                                  <CreditCard className="w-2.5 h-2.5" />{student.credits} {t("ساعة", "hrs")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Course Tab ── */}
              {activeTab === "course" && course && (
                <CourseFullView course={course} group={group} lvlGrad={lvlGrad} isAr={isAr} />
              )}
            </>
          )}
        </div>
      </main>

      <style jsx>{`
        @keyframes shimmer       { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes pulse-slow    { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
        @keyframes pulse-slower  { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.4; } }
        .animate-shimmer         { animation: shimmer 2s infinite; }
        .animate-pulse-slow      { animation: pulse-slow 4s ease-in-out infinite; }
        .animate-pulse-slower    { animation: pulse-slower 6s ease-in-out infinite; }
      `}</style>
    </div>
  );
}