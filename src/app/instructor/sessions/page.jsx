"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/app/context/LocaleContext";
import InstructorSidebar from "../InstructorSidebar";
import InstructorHeader from "../InstructorHeader";
import {
  Calendar, Clock, CheckCircle, X, Play, Video,
  AlertCircle, ChevronRight, ChevronLeft, BookOpen,
  Users, Timer, FileText, Info, Search, Filter,
  ClipboardList, TrendingUp, Layers, ExternalLink,
  BarChart3, UserCheck, UserX, Loader2, RefreshCw,
  Eye, Edit3, Plus, Lock, Unlock, ArrowRight,
  ChevronDown, MoreHorizontal, Star, Zap,
  CalendarDays, ListFilter, GraduationCap, Globe,
  Presentation, FolderOpen, BookMarked,
} from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const PRIMARY_GRAD = "from-primary to-purple-600";
const PRIMARY_TEXT = "text-primary";
const PRIMARY_BG   = "bg-primary";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
}

function fmtTimeAr(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "م" : "ص"}`;
}

function fmtDateShort(d, isAr) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
    month: "short", day: "numeric",
  });
}

function fmtDateFull(d, isAr) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function fmtDateKey(d) {
  return new Date(d).toISOString().split("T")[0];
}

function getAttendanceRate(session) {
  const total = session.attendance?.length || 0;
  if (!total) return null;
  const present = session.attendance.filter(
    (a) => a.status === "present" || a.status === "late"
  ).length;
  return Math.round((present / total) * 100);
}

// ✅ FIX 1: Deduplicate lessons by title
function deduplicateLessons(lessons = []) {
  const seen = new Set();
  return lessons.filter((l) => {
    if (seen.has(l.title)) return false;
    seen.add(l.title);
    return true;
  });
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  completed: {
    labelEn: "Completed", labelAr: "مكتملة",
    dot: "bg-emerald-400",
    badge: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40",
    icon: CheckCircle,
  },
  scheduled: {
    labelEn: "Scheduled", labelAr: "مجدولة",
    dot: "bg-blue-400",
    badge: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40",
    icon: Clock,
  },
  cancelled: {
    labelEn: "Cancelled", labelAr: "ملغاة",
    dot: "bg-red-400",
    badge: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40",
    icon: X,
  },
  postponed: {
    labelEn: "Postponed", labelAr: "مؤجلة",
    dot: "bg-amber-400",
    badge: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40",
    icon: Clock,
  },
};

// ─── AnimatedCounter ──────────────────────────────────────────────────────────
function AnimatedCounter({ value, duration = 1200 }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start; let frame;
    const run = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(eased * value));
      if (p < 1) frame = requestAnimationFrame(run);
    };
    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return <span>{count}</span>;
}

// ─── Course Info Section (new) ────────────────────────────────────────────────
function CourseInfoSection({ session, isAr }) {
  const t = (ar, en) => isAr ? ar : en;
  const course = session.courseInfo;
  if (!course) return null;

  const moduleData = course.moduleData;
  const blogBody = isAr ? moduleData?.blogBodyAr : moduleData?.blogBodyEn;
  const hasBlog = blogBody && blogBody.trim().length > 0;

  const [showBlog, setShowBlog] = useState(false);

  return (
    <div className="space-y-3">

      {/* Course header card */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/30 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-indigo-100 dark:border-indigo-800/30">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-indigo-900 dark:text-indigo-300">
            {t("معلومات الكورس", "Course Info")}
          </span>
        </div>

        <div className="p-4 space-y-3">
          {/* Course title + meta chips */}
          <div>
            <h3 className="font-black text-sm text-gray-900 dark:text-[#e6edf3] mb-2">{course.title}</h3>
            <div className="flex flex-wrap gap-1.5">
              {course.grade && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-200 dark:border-indigo-700/30">
                  🎒 {course.grade}
                </span>
              )}
              {course.subject && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium border border-purple-200 dark:border-purple-700/30">
                  📘 {course.subject}
                </span>
              )}
              {course.level && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-200 dark:border-emerald-700/30">
                  📊 {course.level}
                </span>
              )}
              {course.duration && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium border border-amber-200 dark:border-amber-700/30">
                  ⏱ {course.duration}
                </span>
              )}
            </div>
          </div>

          {/* Course description */}
          {course.description && (
            <p className="text-xs text-gray-600 dark:text-[#8b949e] leading-relaxed border-t border-indigo-100 dark:border-indigo-800/30 pt-3">
              {course.description}
            </p>
          )}
        </div>
      </div>

      {/* Module info */}
      {moduleData && (
        <div className="bg-gray-50 dark:bg-[#0d1117]/60 rounded-2xl border border-gray-100 dark:border-[#30363d] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-[#30363d]">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center flex-shrink-0">
              <Layers className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-[#e6edf3]">
              {t("الوحدة الدراسية", "Module")}
            </span>
            <span className="mr-auto text-[10px] px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 font-bold border border-sky-200 dark:border-sky-800/30">
              {t(`الوحدة ${(session.moduleIndex ?? 0) + 1}`, `Module ${(session.moduleIndex ?? 0) + 1}`)}
            </span>
          </div>
          <div className="p-4">
            <h4 className="font-bold text-sm text-gray-900 dark:text-[#e6edf3] mb-1">{moduleData.title}</h4>
            {moduleData.description && (
              <p className="text-xs text-gray-500 dark:text-[#8b949e] leading-relaxed">{moduleData.description}</p>
            )}

            {/* Presentation link */}
            {moduleData.presentationUrl && (
              <a
                href={moduleData.presentationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl text-xs font-semibold text-gray-700 dark:text-[#8b949e] hover:border-primary/50 hover:text-primary transition-all"
              >
                <Presentation className="w-3.5 h-3.5" />
                {t("عرض البريزنتيشن", "View Presentation")}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {/* Projects */}
            {moduleData.projects?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#21262d]">
                <p className="text-[10px] font-bold text-gray-500 dark:text-[#6e7681] mb-2 flex items-center gap-1">
                  <FolderOpen className="w-3 h-3" />{t("مشاريع الوحدة", "Module Projects")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {moduleData.projects.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg text-[10px] font-medium text-gray-600 dark:text-[#8b949e] hover:border-primary/50 hover:text-primary transition-all">
                      <Globe className="w-2.5 h-2.5" />{t(`مشروع ${i + 1}`, `Project ${i + 1}`)}
                      <ExternalLink className="w-2 h-2" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Blog body toggle */}
      {hasBlog && (
        <div className="rounded-2xl border border-gray-100 dark:border-[#30363d] overflow-hidden">
          <button
            onClick={() => setShowBlog(!showBlog)}
            className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-[#0d1117]/60 hover:bg-gray-100 dark:hover:bg-[#0d1117]/80 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center flex-shrink-0">
              <BookMarked className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-[#e6edf3] flex-1 text-start">
              {t("محتوى الوحدة التفصيلي", "Module Detailed Content")}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showBlog ? "rotate-180" : ""}`} />
          </button>
          {showBlog && (
            <div
              className="p-4 prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed bg-white dark:bg-[#0d1117]/30 border-t border-gray-100 dark:border-[#30363d] overflow-auto max-h-72"
              dangerouslySetInnerHTML={{ __html: blogBody }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Session Detail Modal ─────────────────────────────────────────────────────
function SessionModal({ session, onClose, isAr }) {
  const cfg = STATUS_CFG[session.status] || STATUS_CFG.scheduled;
  const isCompleted = session.status === "completed";
  const attRate = getAttendanceRate(session);
  const t = (ar, en) => isAr ? ar : en;

  // ✅ FIX 2: only show action buttons if session is TODAY
  const isActuallyToday = session.isToday;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const formatTime = isAr ? fmtTimeAr : fmtTime;

  const attBreakdown = isCompleted && session.attendance?.length > 0
    ? {
        present: session.attendance.filter((a) => a.status === "present").length,
        absent:  session.attendance.filter((a) => a.status === "absent").length,
        late:    session.attendance.filter((a) => a.status === "late").length,
        excused: session.attendance.filter((a) => a.status === "excused").length,
        total:   session.attendance.length,
      }
    : null;

  // ✅ FIX 1: deduplicate lessons
  const lessons = deduplicateLessons(session.lessons || []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" dir={isAr ? "rtl" : "ltr"}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-[#161b22] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col">

        {/* Modal Header */}
        <div className="relative bg-gradient-to-br from-primary via-purple-600 to-pink-600 p-6 rounded-t-3xl sm:rounded-t-3xl overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {isAr ? cfg.labelAr : cfg.labelEn}
                </span>
                {isActuallyToday && (
                  <span className="bg-yellow-400/30 text-yellow-100 text-xs font-bold px-2.5 py-1 rounded-full border border-yellow-300/30">
                    ✨ {t("اليوم", "Today")}
                  </span>
                )}
              </div>
              <button onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all flex-shrink-0">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <h2 className="text-xl font-black text-white mb-1 leading-snug">{session.title}</h2>
            <p className="text-white/60 text-sm font-medium mb-4">
              {session.group?.name} · {t("الجلسة", "Session")} {session.sessionNumber} ·{" "}
              {t(`الوحدة ${(session.moduleIndex ?? 0) + 1}`, `Module ${(session.moduleIndex ?? 0) + 1}`)}
            </p>

            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 bg-white/15 text-white text-xs px-3 py-1.5 rounded-full border border-white/20">
                <Calendar className="w-3 h-3" />{fmtDateFull(session.scheduledDate, isAr)}
              </span>
              <span className="flex items-center gap-1.5 bg-white/15 text-white text-xs px-3 py-1.5 rounded-full border border-white/20">
                <Clock className="w-3 h-3" />{formatTime(session.startTime)} – {formatTime(session.endTime)}
              </span>
              <span className="flex items-center gap-1.5 bg-white/15 text-white text-xs px-3 py-1.5 rounded-full border border-white/20">
                <Timer className="w-3 h-3" />{t("ساعتان", "2 hours")}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">

          {/* ✅ FIX 2: Action Buttons — only show if TODAY */}
          {isActuallyToday && (
            <div className="grid grid-cols-2 gap-3">
              {session.meetingLink && (
                <a href={session.meetingLink} target="_blank" rel="noopener noreferrer"
                  className="col-span-2 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-black text-sm bg-gradient-to-r from-primary to-purple-600 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
                  <Video className="w-5 h-5" />{t("بدء الجلسة الآن", "Start Session Now")}<ExternalLink className="w-4 h-4" />
                </a>
              )}
              {!session.attendanceTaken && session.status === "scheduled" && (
                <Link href={`/instructor/attendance?session=${session._id}`}
                  className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/40 hover:bg-green-100 transition-all">
                  <ClipboardList className="w-4 h-4" />{t("تسجيل الحضور", "Take Attendance")}
                </Link>
              )}
            </div>
          )}

          {/* Recording link — always visible when completed */}
          {isCompleted && session.recordingLink && (
            <a href={session.recordingLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40 hover:bg-purple-100 transition-all">
              <Play className="w-4 h-4" />{t("مشاهدة التسجيل", "Watch Recording")}
            </a>
          )}

          {/* Attendance Breakdown (completed only) */}
          {attBreakdown && (
            <div className="bg-gray-50 dark:bg-[#0d1117]/60 rounded-2xl border border-gray-100 dark:border-[#30363d] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-[#30363d]">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                  <BarChart3 className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-[#e6edf3]">
                  {t("إحصائيات الحضور", "Attendance Stats")}
                </span>
                {attRate !== null && (
                  <span className={`ml-auto text-sm font-black ${attRate >= 80 ? "text-emerald-500" : attRate >= 60 ? "text-amber-500" : "text-red-500"}`}>
                    {attRate}%
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 divide-x dark:divide-[#30363d]">
                {[
                  { key: "present", label: t("حاضر",  "Present"), color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
                  { key: "absent",  label: t("غائب",  "Absent"),  color: "text-red-600 dark:text-red-400",         bg: "bg-red-50 dark:bg-red-900/20" },
                  { key: "late",    label: t("متأخر", "Late"),    color: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-50 dark:bg-amber-900/20" },
                  { key: "excused", label: t("معذور", "Excused"), color: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-50 dark:bg-blue-900/20" },
                ].map(({ key, label, color, bg }) => (
                  <div key={key} className={`p-3 text-center ${bg}`}>
                    <div className={`text-2xl font-black ${color}`}>{attBreakdown[key]}</div>
                    <div className="text-[10px] text-gray-500 dark:text-[#8b949e] font-medium">{label}</div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 dark:bg-[#21262d] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-purple-600 rounded-full"
                    style={{ width: `${attRate || 0}%` }} />
                </div>
                <span className="text-xs text-gray-500 dark:text-[#8b949e]">
                  {attBreakdown.total} {t("طالب", "students")}
                </span>
              </div>
            </div>
          )}

          {/* ✅ FIX 1: Lessons — deduplicated */}
          {lessons.length > 0 && (
            <div className="bg-gray-50 dark:bg-[#0d1117]/60 rounded-2xl border border-gray-100 dark:border-[#30363d] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-[#30363d]">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                  <BookOpen className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-[#e6edf3]">
                  {t("الدروس المغطاة", "Lessons Covered")}
                </span>
                <span className="mr-auto text-[10px] text-gray-400">{lessons.length} {t("درس", "lessons")}</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-[#21262d]">
                {lessons.map((lesson, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5
                      ${isCompleted ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" : "bg-primary/10 text-primary"}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-[#c9d1d9] font-medium">{lesson.title}</p>
                      {lesson.description && (
                        <p className="text-xs text-gray-400 dark:text-[#6e7681] mt-0.5 leading-relaxed">{lesson.description}</p>
                      )}
                      {lesson.duration && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                          <Clock className="w-2.5 h-2.5" />{lesson.duration}
                        </span>
                      )}
                    </div>
                    {isCompleted && <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ✅ FIX 3: Course Info (new section) */}
          <CourseInfoSection session={session} isAr={isAr} />

          {/* Notes */}
          {session.instructorNotes && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />{t("ملاحظات الجلسة", "Session Notes")}
              </h4>
              <p className="text-sm text-amber-800 dark:text-amber-300/80 leading-relaxed">{session.instructorNotes}</p>
            </div>
          )}

          {/* Materials */}
          {session.materials && session.materials.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-[#e6edf3] mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />{t("المواد التعليمية", "Materials")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {session.materials.map((mat, i) => (
                  <a key={i} href={mat.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#21262d] border border-gray-200 dark:border-[#30363d] rounded-xl text-xs font-medium text-gray-700 dark:text-[#8b949e] hover:border-primary/50 hover:text-primary transition-all">
                    <FileText className="w-3.5 h-3.5" />{mat.name || `ملف ${i + 1}`}<ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions footer */}
          <div className="flex gap-2 pt-2">
            <Link href={`/instructor/attendance?session=${session._id}`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-gray-100 dark:bg-[#21262d] text-gray-700 dark:text-[#8b949e] hover:bg-gray-200 dark:hover:bg-[#30363d] transition-all">
              <ClipboardList className="w-4 h-4" />{t("الحضور", "Attendance")}
            </Link>
            <Link href={`/instructor/groups/${session.group?._id}`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-gray-100 dark:bg-[#21262d] text-gray-700 dark:text-[#8b949e] hover:bg-gray-200 dark:hover:bg-[#30363d] transition-all">
              <Users className="w-4 h-4" />{t("المجموعة", "Group")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Session Row ──────────────────────────────────────────────────────────────
function SessionRow({ session, onOpen, isAr }) {
  const cfg = STATUS_CFG[session.status] || STATUS_CFG.scheduled;
  const isCompleted = session.status === "completed";
  const isToday = session.isToday && session.status === "scheduled";
  const attRate = getAttendanceRate(session);
  const formatTime = isAr ? fmtTimeAr : fmtTime;
  const t = (ar, en) => isAr ? ar : en;
  const sessionNum = (session.moduleIndex ?? 0) * 3 + (session.sessionNumber ?? 1);

  return (
    <div
      onClick={() => onOpen(session)}
      className={`group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border bg-white dark:bg-[#161b22]
        cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md
        ${isToday
          ? "border-primary/40 shadow-md shadow-primary/10 ring-1 ring-primary/20"
          : isCompleted
            ? "border-emerald-200/60 dark:border-emerald-800/30 hover:shadow-emerald-500/5"
            : "border-gray-100 dark:border-[#30363d] hover:border-gray-200 dark:hover:border-[#3d444d]"}`}
    >
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 shadow-sm
        ${isCompleted
          ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white"
          : isToday
            ? "bg-gradient-to-br from-primary to-purple-600 text-white"
            : session.status === "cancelled"
              ? "bg-gradient-to-br from-red-400 to-red-500 text-white"
              : session.status === "postponed"
                ? "bg-gradient-to-br from-amber-400 to-orange-400 text-white"
                : "bg-gradient-to-br from-blue-400 to-indigo-500 text-white"}`}>
        {isCompleted
          ? <CheckCircle className="w-5 h-5" />
          : session.status === "cancelled"
            ? <X className="w-5 h-5" />
            : <span className="text-sm">{sessionNum}</span>}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          {isToday && (
            <span className="text-[10px] font-black text-primary flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {t("اليوم", "Today")}
            </span>
          )}
          <h3 className="font-bold text-sm truncate transition-colors text-gray-900 dark:text-[#e6edf3] group-hover:text-primary">
            {session.title}
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-[#6e7681] flex-wrap">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDateShort(session.scheduledDate, isAr)}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(session.startTime)}</span>
          {session.group?.name && (
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{session.group.name}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isCompleted && attRate !== null && (
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 dark:bg-[#21262d] border border-gray-100 dark:border-[#30363d]">
            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span className={`text-xs font-bold ${attRate >= 80 ? "text-emerald-600" : attRate >= 60 ? "text-amber-600" : "text-red-600"}`}>
              {attRate}%
            </span>
          </div>
        )}

        {/* ✅ FIX 2: Join button only when session.showJoinButton (already computed by API as today+scheduled+time) */}
        {session.showJoinButton && (
          <a href={session.meetingLink} target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-primary to-purple-600 text-white shadow-md hover:shadow-lg hover:scale-105 transition-all">
            <Video className="w-3.5 h-3.5" />{t("بدء", "Start")}
          </a>
        )}

        {isCompleted && !session.attendanceTaken && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-600 border border-amber-200 dark:border-amber-800/40">
            <ClipboardList className="w-3 h-3" />{t("يحتاج حضور", "Needs Attendance")}
          </span>
        )}

        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${cfg.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {isAr ? cfg.labelAr : cfg.labelEn}
        </span>

        <ChevronRight className={`w-4 h-4 text-gray-300 dark:text-[#6e7681] group-hover:text-primary transition-all ${isAr ? "rotate-180" : ""}`} />
      </div>
    </div>
  );
}

// ─── Date Header ──────────────────────────────────────────────────────────────
function DateHeader({ dateKey, sessions, isAr }) {
  const d = new Date(dateKey);
  const isToday = fmtDateKey(new Date()) === dateKey;
  const count = sessions.length;
  const t = (ar, en) => isAr ? ar : en;

  return (
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 shadow-sm
        ${isToday ? "bg-gradient-to-br from-primary to-purple-600 text-white" : "bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] text-gray-700 dark:text-[#8b949e]"}`}>
        <span className="text-xs font-black leading-none">{d.getDate()}</span>
        <span className="text-[9px] leading-none mt-0.5 opacity-80">
          {d.toLocaleDateString(isAr ? "ar-EG" : "en-US", { month: "short" })}
        </span>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className={`font-black text-sm ${isToday ? "text-primary" : "text-gray-900 dark:text-[#e6edf3]"}`}>
            {isToday ? t("اليوم", "Today") : d.toLocaleDateString(isAr ? "ar-EG" : "en-US", { weekday: "long" })}
          </span>
          {isToday && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
        </div>
        <span className="text-xs text-gray-400 dark:text-[#6e7681]">
          {d.toLocaleDateString(isAr ? "ar-EG" : "en-US", { month: "long", day: "numeric" })} · {count} {t("جلسة", count === 1 ? "session" : "sessions")}
        </span>
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent dark:from-[#30363d]" />
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, value, label, grad, animate = true }) {
  return (
    <div className="group/stats relative bg-white dark:bg-[#161b22] rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-md transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-md group-hover/stats:scale-110 transition-transform duration-300 flex-shrink-0`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-[#e6edf3]">
            {animate ? <AnimatedCounter value={value} /> : value}
          </p>
          <p className="text-xs text-gray-500 dark:text-[#8b949e] font-medium">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-16 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse border border-gray-100 dark:border-[#30363d]" />
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InstructorSessionsPage() {
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const router = useRouter();
  const t = (ar, en) => isAr ? ar : en;

  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState("");
  const [sessions, setSessions]       = useState([]);
  const [stats, setStats]             = useState(null);
  const [user, setUser]               = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modal, setModal]             = useState(null);

  const [filter, setFilter]             = useState("all");
  const [search, setSearch]             = useState("");
  const [groupByDate, setGroupByDate]   = useState(true);
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [groups, setGroups]             = useState([]);

  const fetchData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const [sessRes, dashRes] = await Promise.all([
        fetch("/api/instructor/sessions", { credentials: "include" }).then((r) => r.json()),
        fetch("/api/instructor/dashboard", { credentials: "include" }).then((r) => r.json()),
      ]);

      if (sessRes.success) {
        setSessions(sessRes.data.sessions || []);
        setStats(sessRes.data.stats || null);

        const groupMap = {};
        (sessRes.data.sessions || []).forEach((s) => {
          if (s.group?._id) groupMap[s.group._id] = s.group.name;
        });
        setGroups(Object.entries(groupMap).map(([id, name]) => ({ id, name })));
      } else {
        setError(sessRes.message || t("حدث خطأ", "Something went wrong"));
      }

      if (dashRes.success) setUser(dashRes.data.user);
    } catch {
      setError(t("فشل تحميل البيانات", "Failed to load data"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("token");
    router.push("/");
  };

  const filtered = sessions.filter((s) => {
    const today = fmtDateKey(new Date());
    const sDate = fmtDateKey(s.scheduledDate);

    const filterMatch =
      filter === "all"       ? true :
      filter === "completed" ? s.status === "completed" :
      filter === "upcoming"  ? s.status === "scheduled" :
      filter === "today"     ? sDate === today :
      filter === "cancelled" ? s.status === "cancelled" || s.status === "postponed" :
      filter === "needs_att" ? s.status === "completed" && !s.attendanceTaken :
      true;

    const groupMatch = selectedGroup === "all" || s.group?._id === selectedGroup;
    const searchMatch = !search ||
      s.title?.toLowerCase().includes(search.toLowerCase()) ||
      s.group?.name?.toLowerCase().includes(search.toLowerCase());

    return filterMatch && groupMatch && searchMatch;
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

  const today = fmtDateKey(new Date());
  const FILTERS = [
    { id: "all",       labelAr: "الكل",        labelEn: "All",              count: sessions.length },
    { id: "upcoming",  labelAr: "القادمة",      labelEn: "Upcoming",         count: sessions.filter((s) => s.status === "scheduled").length },
    { id: "completed", labelAr: "المكتملة",     labelEn: "Completed",        count: sessions.filter((s) => s.status === "completed").length },
    { id: "today",     labelAr: "اليوم",        labelEn: "Today",            count: sessions.filter((s) => fmtDateKey(s.scheduledDate) === today).length },
    { id: "needs_att", labelAr: "تحتاج حضور",  labelEn: "Need Attendance",  count: sessions.filter((s) => s.status === "completed" && !s.attendanceTaken).length },
    { id: "cancelled", labelAr: "ملغاة/مؤجلة", labelEn: "Cancelled",        count: sessions.filter((s) => s.status === "cancelled" || s.status === "postponed").length },
  ];

  const todayJoinable = sessions.filter((s) => s.showJoinButton);
  const currentUser = user || { name: isAr ? "مدرس" : "Instructor", email: "", role: "instructor" };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22] flex" dir={isAr ? "rtl" : "ltr"}>

      {refreshing && (
        <div className={`fixed top-4 ${isAr ? "left-4" : "right-4"} z-50 bg-primary text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2`}>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">{t("جاري التحديث...", "Refreshing...")}</span>
        </div>
      )}

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`fixed lg:static inset-y-0 ${isAr ? "right-0" : "left-0"} z-50 transform transition-all duration-500
        ${sidebarOpen ? "translate-x-0" : (isAr ? "translate-x-full" : "-translate-x-full") + " lg:translate-x-0"} flex-shrink-0`}>
        <InstructorSidebar user={currentUser} onLogout={handleLogout} />
      </div>

      <main className="flex-1 min-w-0 flex flex-col">
        <InstructorHeader
          user={currentUser}
          notifications={[]}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          onRefresh={() => fetchData(true)}
        />

        {/* Sticky Toolbar */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md border-b border-gray-200 dark:border-[#30363d]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-black text-gray-900 dark:text-[#e6edf3] leading-none">
                    {t("جلساتي", "My Sessions")}
                  </h1>
                  {!loading && stats && (
                    <p className="text-xs text-gray-400 dark:text-[#6e7681] mt-0.5">
                      {stats.completed} {t("مكتملة", "completed")} · {stats.scheduled} {t("مجدولة", "scheduled")} · {stats.total} {t("إجمالي", "total")}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative hidden sm:block">
                  <Search className={`absolute ${isAr ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("بحث...", "Search...")}
                    className={`w-44 bg-gray-100 dark:bg-[#21262d] border border-gray-200 dark:border-[#30363d] rounded-xl ${isAr ? "pr-9 pl-4" : "pl-9 pr-4"} py-2 text-sm text-gray-900 dark:text-[#e6edf3] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60`}
                  />
                </div>

                {groups.length > 1 && (
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="hidden sm:block bg-gray-100 dark:bg-[#21262d] border border-gray-200 dark:border-[#30363d] rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-[#8b949e] focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="all">{t("كل المجموعات", "All Groups")}</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                )}

                <div className="flex bg-gray-100 dark:bg-[#21262d] rounded-xl p-1 gap-0.5">
                  <button onClick={() => setGroupByDate(true)}
                    className={`p-1.5 rounded-lg transition-all ${groupByDate ? `bg-white dark:bg-[#161b22] shadow text-primary` : "text-gray-400"}`}>
                    <CalendarDays className="w-4 h-4" />
                  </button>
                  <button onClick={() => setGroupByDate(false)}
                    className={`p-1.5 rounded-lg transition-all ${!groupByDate ? `bg-white dark:bg-[#161b22] shadow text-primary` : "text-gray-400"}`}>
                    <ListFilter className="w-4 h-4" />
                  </button>
                </div>

                <button onClick={() => fetchData(true)}
                  className="p-2 rounded-xl bg-gray-100 dark:bg-[#21262d] text-gray-500 hover:text-primary transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-1.5 pb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {FILTERS.map(({ id, labelAr, labelEn, count }) => (
                <button key={id} onClick={() => setFilter(id)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all
                    ${filter === id
                      ? "bg-primary text-white shadow-md shadow-primary/30"
                      : "bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-[#8b949e] hover:bg-gray-200 dark:hover:bg-[#30363d]"}`}>
                  {isAr ? labelAr : labelEn}
                  <span className={`text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black
                    ${filter === id ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-[#30363d] text-gray-500"}`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">

          {!loading && stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <StatCard icon={Calendar}      value={stats.total}               label={t("إجمالي الجلسات", "Total Sessions")}    grad="from-primary to-purple-600" />
              <StatCard icon={CheckCircle}   value={stats.completed}           label={t("مكتملة", "Completed")}                grad="from-emerald-400 to-teal-500" />
              <StatCard icon={Clock}         value={stats.scheduled}           label={t("مجدولة", "Scheduled")}                grad="from-blue-400 to-indigo-500" />
              <StatCard icon={ClipboardList} value={stats.needsAttendance || 0} label={t("تحتاج حضور", "Need Attendance")}    grad="from-amber-400 to-orange-500" />
            </div>
          )}

          {todayJoinable.length > 0 && filter === "all" && (
            <div className="mb-5 bg-gradient-to-r from-primary to-purple-600 rounded-2xl p-4 text-white relative overflow-hidden">
              <div className="absolute -top-6 -left-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/70 font-medium">{t("جلسة اليوم جاهزة", "Today's Session Ready")}</p>
                  <p className="font-bold text-sm truncate">{todayJoinable[0].title}</p>
                </div>
                <a href={todayJoinable[0].meetingLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white text-primary font-bold text-xs px-4 py-2 rounded-xl hover:bg-purple-50 transition-all shadow-lg flex-shrink-0">
                  <Video className="w-4 h-4" />{t("ابدأ الآن", "Start Now")}
                </a>
              </div>
            </div>
          )}

          {filter === "all" && !loading && sessions.filter((s) => s.status === "completed" && !s.attendanceTaken).length > 0 && (
            <div className="mb-5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                    {sessions.filter((s) => s.status === "completed" && !s.attendanceTaken).length}{" "}
                    {t("جلسة تحتاج تسجيل حضور", "sessions need attendance recording")}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                    {t("انقر على الجلسة لتسجيل الحضور", "Click on a session to record attendance")}
                  </p>
                </div>
                <button onClick={() => setFilter("needs_att")}
                  className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline flex-shrink-0">
                  {t("عرضها", "Show them")}
                </button>
              </div>
            </div>
          )}

          {loading && <Skeleton />}

          {!loading && error && (
            <div className="text-center py-16">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">{error}</p>
              <button onClick={() => fetchData()}
                className="px-6 py-3 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all">
                {t("إعادة المحاولة", "Try Again")}
              </button>
            </div>
          )}

          {!loading && !error && sorted.length === 0 && (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto bg-gray-100 dark:bg-[#21262d] rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-10 h-10 text-gray-300 dark:text-[#6e7681]" />
              </div>
              <p className="text-gray-500 dark:text-[#8b949e] font-medium">
                {t("لا توجد جلسات في هذا الفلتر", "No sessions found for this filter")}
              </p>
            </div>
          )}

          {!loading && !error && sorted.length > 0 && (
            groupByDate ? (
              <div className="space-y-7">
                {sortedDates.map((dk) => (
                  <div key={dk}>
                    <DateHeader dateKey={dk} sessions={byDate[dk]} isAr={isAr} />
                    <div className="space-y-2.5" style={{ [isAr ? "paddingRight" : "paddingLeft"]: "60px" }}>
                      {byDate[dk].map((s) => (
                        <SessionRow key={s._id} session={s} onOpen={setModal} isAr={isAr} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {sorted.map((s) => (
                  <SessionRow key={s._id} session={s} onOpen={setModal} isAr={isAr} />
                ))}
              </div>
            )
          )}
        </div>
      </main>

      {modal && <SessionModal session={modal} onClose={() => setModal(null)} isAr={isAr} />}
    </div>
  );
}