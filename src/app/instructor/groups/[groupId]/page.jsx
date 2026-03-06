"use client";
// src/app/instructor/groups/[groupId]/page.jsx

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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getLevelGradient(level) {
  if (level === "advanced")    return "from-red-500 to-orange-500";
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
  return new Date(d).toLocaleDateString(isAr ? "ar-EG" : "en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── AnimatedCounter ──────────────────────────────────────────────────────────
function AnimatedCounter({ value, duration = 800 }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let st; let fr;
    const run = (ts) => {
      if (!st) st = ts;
      const p = Math.min((ts - st) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) fr = requestAnimationFrame(run);
    };
    fr = requestAnimationFrame(run);
    return () => cancelAnimationFrame(fr);
  }, [value, duration]);
  return <span>{count}</span>;
}

// ─── Status config ────────────────────────────────────────────────────────────
const SESSION_STATUS = {
  completed: { labelAr: "مكتملة", labelEn: "Completed", dot: "bg-emerald-400", badge: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40", icon: CheckCircle, grad: "from-emerald-400 to-teal-500" },
  scheduled: { labelAr: "مجدولة", labelEn: "Scheduled", dot: "bg-blue-400",    badge: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",             icon: Clock,        grad: "from-blue-400 to-indigo-500" },
  cancelled: { labelAr: "ملغاة",  labelEn: "Cancelled", dot: "bg-red-400",     badge: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/40",                     icon: X,            grad: "from-red-400 to-rose-500" },
  postponed: { labelAr: "مؤجلة",  labelEn: "Postponed", dot: "bg-amber-400",   badge: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",         icon: Clock,        grad: "from-amber-400 to-orange-500" },
};

// ─── Session Row ──────────────────────────────────────────────────────────────
function SessionRow({ session, isAr, lvlGrad }) {
  const t    = (ar, en) => isAr ? ar : en;
  const cfg  = SESSION_STATUS[session.status] || SESSION_STATUS.scheduled;
  const Icon = cfg.icon;
  const fmt  = isAr ? fmtTimeAr : fmtTime;
  const isToday    = session.isToday;
  const isCompleted = session.status === "completed";

  return (
    <div className={`group/row flex items-center gap-3 p-3.5 rounded-xl border bg-white dark:bg-[#161b22] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5
      ${isToday ? "border-primary/40 ring-1 ring-primary/20 shadow-md" : "border-gray-100 dark:border-[#30363d] hover:border-gray-200 dark:hover:border-[#3d444d]"}`}>

      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm text-sm font-black
        ${isCompleted ? `bg-gradient-to-br ${cfg.grad} text-white`
          : isToday   ? "bg-gradient-to-br from-primary to-purple-600 text-white"
          : session.status === "cancelled" ? `bg-gradient-to-br ${cfg.grad} text-white`
          : "bg-gradient-to-br from-blue-400 to-indigo-500 text-white"}`}>
        {isCompleted ? <Icon className="w-5 h-5" /> : session.sessionNumber}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          {isToday && <span className="text-[10px] font-black text-primary flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />{t("اليوم", "Today")}</span>}
          <p className="font-bold text-sm text-gray-900 dark:text-[#e6edf3] truncate group-hover/row:text-primary transition-colors">{session.title}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-[#6e7681] flex-wrap">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(session.scheduledDate, isAr)}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmt(session.startTime)}</span>
          {session.lessons?.length > 0 && (
            <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{session.lessons.length} {t("درس", "lessons")}</span>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isCompleted && session.stats?.attRate !== null && (
          <span className={`text-xs font-black hidden sm:block
            ${session.stats.attRate >= 80 ? "text-emerald-500" : session.stats.attRate >= 60 ? "text-amber-500" : "text-red-500"}`}>
            {session.stats.attRate}%
          </span>
        )}
        {session.showJoinButton && (
          <a href={session.meetingLink} target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-primary to-purple-600 text-white shadow-md hover:shadow-lg hover:scale-105 transition-all">
            <Video className="w-3.5 h-3.5" />{t("بدء", "Start")}
          </a>
        )}
        {isCompleted && !session.attendanceTaken && (
          <Link href={`/instructor/attendance?session=${session._id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-600 border border-amber-200 dark:border-amber-800/40 hover:bg-amber-100 transition-all">
            <ClipboardList className="w-3 h-3" />{t("تسجيل", "Record")}
          </Link>
        )}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
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
    <div className={`bg-white dark:bg-[#161b22] rounded-2xl border overflow-hidden shadow-sm transition-all duration-300
      ${open ? "border-primary/30 shadow-md" : "border-gray-100 dark:border-[#30363d] hover:border-gray-200 dark:hover:border-[#3d444d]"}`}>

      {/* Module Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-[#1c2128] transition-colors"
      >
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${lvlGrad} flex items-center justify-center flex-shrink-0 shadow-md`}>
          <Layers className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-gradient-to-r ${lvlGrad}`}>
              {t(`الوحدة ${module.moduleNumber}`, `Module ${module.moduleNumber}`)}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
              ${progress === 100 ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                : progress > 0  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                : "bg-gray-50 dark:bg-[#21262d] text-gray-500 dark:text-[#8b949e]"}`}>
              {completedSessions}/{totalSessions} {t("جلسة", "sessions")}
            </span>
          </div>
          <p className="font-black text-sm text-gray-900 dark:text-[#e6edf3] truncate">{module.title}</p>
        </div>

        {/* Progress mini ring */}
        <div className="relative w-8 h-8 flex-shrink-0">
          <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-100 dark:text-[#21262d]" />
            <circle cx="16" cy="16" r="12" fill="none" strokeWidth="3"
              stroke={progress === 100 ? "#10b981" : "#6366f1"}
              strokeDasharray={`${progress * 0.754} 75.4`}
              strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black text-gray-600 dark:text-[#8b949e]">{progress}%</span>
        </div>

        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-[#30363d]">
          {/* Description */}
          {module.description && (
            <p className="px-5 py-3 text-xs text-gray-600 dark:text-[#8b949e] leading-relaxed bg-gray-50 dark:bg-[#0d1117]/40">
              {module.description}
            </p>
          )}

          {/* Presentations + Projects */}
          {(module.presentationUrls?.length > 0 || module.projects?.length > 0) && (
            <div className="px-5 py-3 flex flex-wrap gap-2 border-b border-gray-100 dark:border-[#30363d]">
              {module.presentationUrls?.map((p, i) => (
                <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/30 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 transition-all">
                  <Presentation className="w-3 h-3" />
                  {t(`عرض ${p.sessionNumber}`, `Presentation ${p.sessionNumber}`)}
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              ))}
              {module.projects?.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-all">
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

          {/* Blog toggle */}
          {hasBlog && (
            <div className="border-t border-gray-100 dark:border-[#30363d]">
              <button
                onClick={() => setShowBlog(!showBlog)}
                className="w-full flex items-center gap-2 px-5 py-3 bg-rose-50/50 dark:bg-rose-900/5 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors"
              >
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                  <BookMarked className="w-3 h-3 text-white" />
                </div>
                <span className="text-xs font-bold text-rose-700 dark:text-rose-400 flex-1 text-start">
                  {t("محتوى الوحدة التفصيلي", "Module Detailed Content")}
                </span>
                <ChevronDown className={`w-4 h-4 text-rose-400 transition-transform ${showBlog ? "rotate-180" : ""}`} />
              </button>
              {showBlog && (
                <div
                  className="px-5 py-4 prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed bg-white dark:bg-[#0d1117]/30 overflow-auto max-h-80"
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

// ─── Course Full View (Course Tab) ───────────────────────────────────────────
function CourseFullView({ course, group, lvlGrad, isAr }) {
  const t = (ar, en) => isAr ? ar : en;
  const levelLabel = { advanced: isAr ? "متقدم" : "Advanced", intermediate: isAr ? "متوسط" : "Intermediate", beginner: isAr ? "مبتدئ" : "Beginner" }[course.level] || course.level;

  // The curriculum comes from the API's `data.course` — but we need the raw
  // curriculum array (modules with lessons/sessions/projects/blog).
  // The API sends it via data.sessions.byModule (has module data already) BUT
  // for the Course tab we need the FULL raw curriculum from the course object.
  // We enrich it from sessions.byModule which already has deduplicated lessons.
  const modules = course.curriculum || [];

  return (
    <div className="space-y-5">

      {/* ── Course Hero Card ── */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 p-6 shadow-lg`}>
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-pink-500/20 rounded-full blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/30 shadow-lg">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {course.grade   && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/20 text-white border border-white/20">🎒 {course.grade}</span>}
                {course.subject && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/20 text-white border border-white/20">📘 {course.subject}</span>}
                {course.level   && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/30 text-white border border-white/30">{levelLabel}</span>}
                {course.duration && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/20 text-white border border-white/20">⏱ {course.duration}</span>}
              </div>
              <h2 className="text-xl font-black text-white mb-1 leading-tight">{course.title}</h2>
              <p className="text-white/70 text-sm leading-relaxed">{course.description}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { icon: Layers,   value: course.totalModules,  label: t("وحدات", "Modules") },
              { icon: BookOpen, value: course.totalLessons,  label: t("دروس", "Lessons") },
              { icon: Calendar, value: course.totalSessions, label: t("جلسات", "Sessions") },
            ].map(({ icon: Icon, value, label }, i) => (
              <div key={i} className="flex flex-col items-center py-3 bg-white/15 backdrop-blur-sm rounded-2xl border border-white/20">
                <Icon className="w-4 h-4 text-white mb-1" />
                <span className="font-black text-xl text-white">{value}</span>
                <span className="text-white/60 text-[10px] mt-0.5">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Schedule Card ── */}
      {group.schedule && (
        <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-[#30363d] bg-sky-50/50 dark:bg-sky-900/5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-sm text-gray-900 dark:text-[#e6edf3]">{t("جدول المجموعة", "Group Schedule")}</span>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {group.schedule.daysOfWeek?.map((day) => (
              <span key={day} className="text-xs px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/30 font-medium">{day}</span>
            ))}
            <span className="text-xs px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-[#21262d] text-gray-700 dark:text-[#8b949e] border border-gray-200 dark:border-[#30363d] font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {fmtTime(group.schedule.timeFrom)} – {fmtTime(group.schedule.timeTo)}
              <span className="mx-1 text-gray-300 dark:text-[#30363d]">·</span>
              {t("ساعتان لكل جلسة", "2 hrs / session")}
            </span>
            {group.schedule.startDate && (
              <span className="text-xs px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-[#21262d] text-gray-700 dark:text-[#8b949e] border border-gray-200 dark:border-[#30363d] font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3" />{fmtDate(group.schedule.startDate, isAr)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Curriculum Modules ── */}
      <div>
        <h3 className="text-sm font-black text-gray-900 dark:text-[#e6edf3] mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />{t("المنهج الدراسي", "Curriculum")}
          <span className="text-[10px] font-medium text-gray-400 dark:text-[#6e7681]">({modules.length} {t("وحدة", "modules")})</span>
        </h3>
        <div className="space-y-3">
          {modules.map((mod, mIdx) => (
            <CurriculumModuleCard key={mIdx} mod={mod} mIdx={mIdx} lvlGrad={lvlGrad} isAr={isAr} defaultOpen={mIdx === 0} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Curriculum Module Card (for Course tab) ──────────────────────────────────
function CurriculumModuleCard({ mod, mIdx, lvlGrad, isAr, defaultOpen }) {
  const t = (ar, en) => isAr ? ar : en;
  const [open, setOpen]     = useState(defaultOpen);
  const [showBlog, setShowBlog] = useState(false);

  // Group lessons by sessionNumber, deduplicate by title within each group
  const sessionGroups = {};
  (mod.lessons || []).forEach((l) => {
    const sn = l.sessionNumber || 1;
    if (!sessionGroups[sn]) sessionGroups[sn] = [];
    sessionGroups[sn].push(l);
  });
  // Deduplicate: keep only unique titles per session
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

  // Find presentation URL per session
  const presentationMap = {};
  (mod.sessions || []).forEach((s) => {
    if (s.presentationUrl) presentationMap[s.sessionNumber] = s.presentationUrl;
  });

  const totalUniqueLessons = Object.values(dedupedGroups).reduce((a, ls) => a + ls.length, 0);

  const blogBody = isAr ? mod.blogBodyAr : mod.blogBodyEn;
  const hasBlog  = blogBody && blogBody.trim().length > 0;

  return (
    <div className={`bg-white dark:bg-[#161b22] rounded-2xl border overflow-hidden shadow-sm transition-all duration-300
      ${open ? "border-primary/30 shadow-md" : "border-gray-100 dark:border-[#30363d] hover:border-gray-200 dark:hover:border-[#3d444d]"}`}>

      {/* Header */}
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-[#1c2128] transition-colors">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${lvlGrad} flex items-center justify-center flex-shrink-0 shadow-md font-black text-white text-sm`}>
          {mIdx + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-gradient-to-r ${lvlGrad}`}>
              {t(`الوحدة ${mIdx + 1}`, `Module ${mIdx + 1}`)}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-[#6e7681] font-medium">
              {sessionNumbers.length} {t("جلسات", "sessions")} · {totalUniqueLessons} {t("درس", "lessons")} · {sessionNumbers.length * 2} {t("ساعة", "hrs")}
            </span>
          </div>
          <p className="font-black text-sm text-gray-900 dark:text-[#e6edf3] truncate">{mod.title}</p>
          {mod.description && !open && (
            <p className="text-xs text-gray-400 dark:text-[#6e7681] truncate mt-0.5">{mod.description}</p>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-[#30363d]">

          {/* Description */}
          {mod.description && (
            <p className="px-5 py-3 text-xs text-gray-600 dark:text-[#8b949e] leading-relaxed bg-gray-50 dark:bg-[#0d1117]/40 border-b border-gray-100 dark:border-[#30363d]">
              {mod.description}
            </p>
          )}

          {/* Sessions with lessons */}
          <div className="p-4 space-y-4">
            {sessionNumbers.map((sn) => {
              const lessons = dedupedGroups[sn] || [];
              const presUrl = presentationMap[sn];
              return (
                <div key={sn} className="rounded-xl border border-gray-100 dark:border-[#30363d] overflow-hidden">
                  {/* Session header */}
                  <div className={`flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r ${lvlGrad} bg-opacity-10`}
                    style={{ background: "" }}>
                    <div className="px-4 py-2.5 flex items-center justify-between gap-3 bg-gray-50 dark:bg-[#0d1117]/60 w-full rounded-none" style={{margin: 0}}>
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${lvlGrad} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-white text-[10px] font-black">{sn}</span>
                        </div>
                        <div>
                          <p className="font-black text-xs text-gray-900 dark:text-[#e6edf3]">
                            {t(`الجلسة ${sn}`, `Session ${sn}`)}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-[#6e7681]">
                            {lessons.length} {t("درس", "lessons")} · {t("ساعتان", "2 hours")}
                          </p>
                        </div>
                      </div>
                      {presUrl && (
                        <a href={presUrl} target="_blank" rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl text-[10px] font-bold text-gray-700 dark:text-[#8b949e] hover:border-primary/50 hover:text-primary transition-all shadow-sm flex-shrink-0">
                          <Presentation className="w-3 h-3" />
                          {t("العرض", "Slides")}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Lessons list */}
                  <div className="divide-y divide-gray-50 dark:divide-[#21262d]">
                    {lessons.map((lesson, li) => (
                      <div key={li} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#0d1117]/30 transition-colors">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5 bg-gradient-to-br ${lvlGrad} text-white shadow-sm`}>
                          {li + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 dark:text-[#c9d1d9]">{lesson.title}</p>
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

          {/* Projects */}
          {mod.projects?.length > 0 && (
            <div className="px-5 pb-4">
              <p className="text-[10px] font-black text-gray-500 dark:text-[#6e7681] mb-2 flex items-center gap-1 uppercase tracking-wide">
                <FolderOpen className="w-3 h-3" />{t("مشاريع الوحدة", "Module Projects")}
              </p>
              <div className="flex flex-wrap gap-2">
                {mod.projects.map((url, pi) => (
                  <a key={pi} href={url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-all">
                    <Globe className="w-3 h-3" />{t(`مشروع ${pi + 1}`, `Project ${pi + 1}`)}<ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Blog toggle */}
          {hasBlog && (
            <div className="border-t border-gray-100 dark:border-[#30363d]">
              <button onClick={() => setShowBlog(!showBlog)}
                className="w-full flex items-center gap-2 px-5 py-3 bg-rose-50/50 dark:bg-rose-900/5 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                  <BookMarked className="w-3 h-3 text-white" />
                </div>
                <span className="text-xs font-bold text-rose-700 dark:text-rose-400 flex-1 text-start">
                  {t("محتوى الوحدة التفصيلي", "Module Detailed Content")}
                </span>
                <ChevronDown className={`w-4 h-4 text-rose-400 transition-transform ${showBlog ? "rotate-180" : ""}`} />
              </button>
              {showBlog && (
                <div
                  className="px-5 py-4 prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed bg-white dark:bg-[#0d1117]/30 overflow-auto max-h-80 border-t border-gray-100 dark:border-[#30363d]"
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
    <div className="space-y-5">
      <div className="h-52 bg-white dark:bg-[#161b22] rounded-3xl animate-pulse border border-gray-100 dark:border-[#30363d]" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse border border-gray-100 dark:border-[#30363d]" />)}
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse border border-gray-100 dark:border-[#30363d]" />)}
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

  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [data, setData]             = useState(null);
  const [user, setUser]             = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab]   = useState("sessions"); // sessions | students | course

  const fetchData = useCallback(async () => {
    try {
      setLoading(true); setError("");
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

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("token");
    router.push("/");
  };

  const currentUser = user || { name: isAr ? "مدرس" : "Instructor", email: "", role: "instructor" };

  if (!groupId) return (
    <div className="min-h-screen flex items-center justify-center" dir={isAr ? "rtl" : "ltr"}>
      <div className="text-center">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <button onClick={() => router.push("/instructor/groups")}
          className="px-6 py-3 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl font-bold">
          {t("العودة", "Back")}
        </button>
      </div>
    </div>
  );

  const group   = data?.group;
  const course  = data?.course;
  const sessions = data?.sessions;
  const students = data?.students || [];
  const lvlGrad  = getLevelGradient(course?.level);

  const TABS = [
    { id: "sessions", labelAr: "الجلسات",  labelEn: "Sessions",  count: sessions?.stats?.total || 0 },
    { id: "students", labelAr: "الطلاب",   labelEn: "Students",  count: students.length },
    { id: "course",   labelAr: "الكورس",   labelEn: "Course",    count: null },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22] flex" dir={isAr ? "rtl" : "ltr"}>

      {/* Sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`fixed lg:static inset-y-0 ${isAr ? "right-0" : "left-0"} z-50 transform transition-all duration-500
        ${sidebarOpen ? "translate-x-0" : (isAr ? "translate-x-full" : "-translate-x-full") + " lg:translate-x-0"} flex-shrink-0`}>
        <InstructorSidebar user={currentUser} onLogout={handleLogout} />
      </div>

      <main className="flex-1 min-w-0">
        <InstructorHeader
          user={currentUser}
          notifications={[]}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          onRefresh={fetchData}
        />

        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md border-b border-gray-200 dark:border-[#30363d]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 py-3">
              <button onClick={() => router.push("/instructor/groups")}
                className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#21262d] flex items-center justify-center text-gray-500 hover:text-primary hover:bg-primary/10 transition-all group flex-shrink-0">
                {isAr ? <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                       : <ChevronLeft  className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />}
              </button>
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${lvlGrad} flex items-center justify-center flex-shrink-0 shadow-md`}>
                <Users className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                {loading ? (
                  <div className="space-y-1.5">
                    <div className="h-4 w-40 bg-gray-200 dark:bg-[#30363d] rounded animate-pulse" />
                    <div className="h-3 w-28 bg-gray-200 dark:bg-[#30363d] rounded animate-pulse" />
                  </div>
                ) : group ? (
                  <>
                    <h1 className="font-black text-sm text-gray-900 dark:text-[#e6edf3] truncate leading-none mb-0.5">{group.name}</h1>
                    <p className="text-xs text-gray-400 dark:text-[#6e7681] truncate">{course?.title} · <span className="font-mono">{group.code}</span></p>
                  </>
                ) : null}
              </div>
              <button onClick={fetchData}
                className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#21262d] flex items-center justify-center text-gray-500 hover:text-primary transition-all flex-shrink-0">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            {!loading && group && (
              <div className="flex gap-1.5 pb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {TABS.map(({ id, labelAr, labelEn, count }) => (
                  <button key={id} onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all
                      ${activeTab === id
                        ? `bg-gradient-to-r ${lvlGrad} text-white shadow-md`
                        : "bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-[#8b949e] hover:bg-gray-200 dark:hover:bg-[#30363d]"}`}>
                    {isAr ? labelAr : labelEn}
                    {count !== null && (
                      <span className={`text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black
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

        {/* Content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

          {loading && <Skeleton />}

          {!loading && error && (
            <div className="flex items-center gap-3 p-5 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800/40">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm font-bold text-red-700 dark:text-red-400 flex-1">{error}</p>
              <button onClick={fetchData} className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />{t("إعادة", "Retry")}
              </button>
            </div>
          )}

          {!loading && !error && group && (
            <>
              {/* ── Hero Banner ── */}
              <div className="relative group overflow-hidden rounded-3xl">
                <div className={`absolute inset-0 bg-gradient-to-r ${lvlGrad} opacity-60 blur-md group-hover:opacity-80 transition-opacity`} />
                <div className={`relative bg-gradient-to-br ${lvlGrad} rounded-3xl p-6 overflow-hidden shadow-lg`}>
                  <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-pulse" />
                  <div className="absolute bottom-0 left-0 w-36 h-36 bg-black/10 rounded-full blur-3xl" />
                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-yellow-200 animate-pulse" />
                          <span className="text-white/70 text-xs font-medium">{course?.subject} · {course?.grade}</span>
                        </div>
                        <h2 className="text-2xl font-black text-white mb-1 leading-tight">{group.name}</h2>
                        <p className="text-white/70 text-sm">{course?.title}</p>
                      </div>
                      <div className={`w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/30 shadow-lg`}>
                        <BookOpen className="w-7 h-7 text-white" />
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-white/70">{t("تقدم الجلسات", "Session Progress")}</span>
                        <span className="text-white font-black">{group.progress}%</span>
                      </div>
                      <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white/80 rounded-full relative overflow-hidden transition-all duration-700"
                          style={{ width: `${group.progress}%` }}>
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-40 animate-shimmer" />
                        </div>
                      </div>
                    </div>

                    {/* Mini stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { icon: Users,        value: `${group.currentStudentsCount}/${group.maxStudents}`, label: t("طلاب", "Students") },
                        { icon: BookOpen,     value: `${sessions?.stats?.completed || 0}/${sessions?.stats?.total || 0}`, label: t("جلسات", "Sessions") },
                        { icon: Clock,        value: `${group.teachingHours}h`,  label: t("ساعاتي", "My Hours") },
                        { icon: TrendingUp,   value: `${group.progress}%`,       label: t("التقدم", "Progress") },
                      ].map(({ icon: Icon, value, label }, i) => (
                        <div key={i} className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20">
                          <Icon className="w-4 h-4 text-white flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-black text-white text-sm leading-none">{value}</p>
                            <p className="text-white/60 text-[9px] mt-0.5">{label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Sessions Tab ── */}
              {activeTab === "sessions" && (
                <div className="space-y-4">
                  {/* Session stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { icon: Calendar,     value: sessions?.stats?.total || 0,     label: t("إجمالي", "Total"),     grad: "from-primary to-purple-600" },
                      { icon: CheckCircle,  value: sessions?.stats?.completed || 0, label: t("مكتملة", "Completed"), grad: "from-emerald-400 to-teal-500" },
                      { icon: Clock,        value: sessions?.stats?.scheduled || 0, label: t("مجدولة", "Scheduled"), grad: "from-blue-400 to-indigo-500" },
                      { icon: ClipboardList,value: sessions?.stats?.needsAttendance || 0, label: t("تحتاج حضور", "Need Att."), grad: "from-amber-400 to-orange-500" },
                    ].map(({ icon: Icon, value, label, grad }, i) => (
                      <div key={i} className="group/s bg-white dark:bg-[#161b22] rounded-2xl p-4 border border-gray-100 dark:border-[#30363d] shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-sm group-hover/s:scale-110 transition-transform flex-shrink-0`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-xl font-black text-gray-900 dark:text-[#e6edf3]"><AnimatedCounter value={value} /></p>
                            <p className="text-[10px] text-gray-400 dark:text-[#6e7681]">{label}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Modules with sessions */}
                  {sessions?.byModule?.length > 0 ? (
                    <div className="space-y-3">
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
                    <div className="text-center py-16 bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d]">
                      <Calendar className="w-12 h-12 text-gray-300 dark:text-[#6e7681] mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-[#8b949e]">{t("لا توجد جلسات بعد", "No sessions yet")}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Students Tab ── */}
              {activeTab === "students" && (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center gap-3 p-4 bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] shadow-sm">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${lvlGrad} flex items-center justify-center flex-shrink-0`}>
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-black text-sm text-gray-900 dark:text-[#e6edf3]">{t("قائمة الطلاب", "Student Roster")}</p>
                      <p className="text-xs text-gray-400 dark:text-[#6e7681]">{students.length} {t("طالب مسجل", "students enrolled")}</p>
                    </div>
                  </div>

                  {students.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d]">
                      <Users className="w-12 h-12 text-gray-300 dark:text-[#6e7681] mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-[#8b949e]">{t("لا يوجد طلاب بعد", "No students yet")}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {students.map((student, i) => (
                        <div key={student._id}
                          className="group/stu bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                          <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${lvlGrad} flex items-center justify-center font-black text-white text-base flex-shrink-0 shadow-md group-hover/stu:scale-110 transition-transform`}>
                              {(student.name?.[0] || "?").toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-gray-900 dark:text-[#e6edf3] truncate">{student.name}</p>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {student.phone && (
                                  <span className="text-[10px] text-gray-400 dark:text-[#6e7681] flex items-center gap-1">
                                    <Phone className="w-2.5 h-2.5" />{student.phone}
                                  </span>
                                )}
                                {student.guardian && (
                                  <span className="text-[10px] text-gray-400 dark:text-[#6e7681] flex items-center gap-1">
                                    <User className="w-2.5 h-2.5" />{student.guardian}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border
                                ${student.status === "Active"
                                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40"
                                  : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40"}`}>
                                {student.status}
                              </span>
                              {student.credits !== null && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1
                                  ${student.credits <= 0 ? "bg-gray-50 dark:bg-[#21262d] text-gray-400 border-gray-200 dark:border-[#30363d]"
                                    : student.credits <= 2 ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40"
                                    : student.credits <= 5 ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40"
                                    : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40"}`}>
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
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-shimmer { animation: shimmer 2s infinite; }
      `}</style>
    </div>
  );
}