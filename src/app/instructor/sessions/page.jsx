"use client";
// src/app/instructor/sessions/page.jsx

import React, {
  createContext, memo, useCallback, useContext, useDeferredValue, useEffect, useMemo, useRef, useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/app/context/LocaleContext";
import InstructorSidebar from "../InstructorSidebar";
import InstructorHeader from "../InstructorHeader";
import {
  AlertCircle, ArrowRightCircle, BadgeAlert, BarChart3, BookMarked, BookOpen, Briefcase,
  Calendar, CalendarClock, CalendarDays, CheckCircle, ChevronDown, ChevronRight, ClipboardList,
  Clock, Copy, ExternalLink, Eye, EyeOff, FileText, FolderOpen, Gift, Globe, GraduationCap,
  Hourglass, Info, Layers, Link2, ListFilter, Lock, MapPin, MessageSquareWarning,
  Navigation, PaperPlaneTilt, PauseCircle, Play, Presentation, RefreshCw, Repeat, Search, Send,
  SkipForward, Sparkles, Star, Timer, User, UserCheck, Users, Video, X, Zap,
} from "@/components/icons";
import {
  INTERVIEW_DECISIONS, INTERVIEW_RATING_ROWS, dGrad,
  PaperPlane, PaperPlaneFlight, FlightStyles, PaperPlaneLoader,
} from "@/components/interviewShared";

// ═══════════════════════════════════════════════════════════════════════════
// Constants (برّه الـ components → بتتعمل مرة واحدة بس)
// ═══════════════════════════════════════════════════════════════════════════
const BRAND_GRAD = "linear-gradient(135deg, #004d59, #ff6700)";
const HERO_GRAD = "linear-gradient(135deg, #004d59 0%, #004d59cc 40%, #ff6700 100%)";
const CTA_GRAD = "linear-gradient(135deg, #ff6700, #feaf00)";
const TEAL_GRAD = "linear-gradient(135deg, #004d59, #0e7c8c)";
const DOTS_STYLE = {
  backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
  backgroundSize: "24px 24px",
};
const EMPTY_LIST = [];
const LIST_PAD_RTL = { paddingRight: "60px" };
const LIST_PAD_LTR = { paddingLeft: "60px" };
const EVAL_TRANSITION_MS = 2050;

// نص وأيقونة شاشة الانتقال حسب الوجهة
const TRANSITION_META = {
  eval: { icon: Star, ar: "جاري فتح التقييم", en: "Opening evaluation" },
  attendance: { icon: ClipboardList, ar: "جاري فتح الحضور", en: "Opening attendance" },
};

// دالة الانتقال بالطيارة للحضور بتتوفر من الصفحة الرئيسية للـ components اللي جواها
const noopFlight = () => {};
const AttendanceFlightContext = createContext(noopFlight);
const useAttendanceFlight = () => useContext(AttendanceFlightContext);



// content-visibility: المتصفح مبيرسمش الصفوف اللي برّه الشاشة
const ROW_BASE =
  "group relative overflow-hidden flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 ps-5 rounded-3xl border cursor-pointer transition-colors duration-200 hover:border-[#ff6700]/50 [content-visibility:auto] [contain-intrinsic-size:auto_92px]";
const FIELD_ROW =
  "flex items-center gap-2 p-2.5 rounded-xl bg-white/70 dark:bg-[#161b22]/50 border border-gray-200/60 dark:border-[#30363d]/60";
const OUTLINE_BTN =
  "w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm bg-white dark:bg-[#161b22] text-[#004d59] dark:text-teal-400 border border-[#004d59]/30 hover:bg-[#004d59]/5 dark:hover:bg-[#004d59]/10 transition-colors";

const STATUS_CFG = {
  completed: {
    labelEn: "Completed", labelAr: "مكتملة", dot: "bg-emerald-400",
    badge: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40",
  },
  scheduled: {
    labelEn: "Scheduled", labelAr: "مجدولة", dot: "bg-[#004d59]",
    badge: "bg-[#004d59]/10 dark:bg-[#004d59]/20 text-[#004d59] dark:text-teal-400 border border-[#004d59]/20 dark:border-[#004d59]/30",
  },
  cancelled: {
    labelEn: "Cancelled", labelAr: "ملغاة", dot: "bg-red-400",
    badge: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40",
  },
  postponed: {
    labelEn: "Postponed", labelAr: "مؤجلة", dot: "bg-[#feaf00]",
    badge: "bg-[#feaf00]/10 text-[#f67d00] dark:text-[#feaf00] border border-[#feaf00]/30 dark:border-[#feaf00]/20",
  },
};

const ATT_KEYS = [
  { key: "present", ar: "حاضر", en: "Present", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50/70 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/20" },
  { key: "absent", ar: "غائب", en: "Absent", color: "text-red-600 dark:text-red-400", bg: "bg-red-50/70 dark:bg-red-900/10 border-red-100 dark:border-red-800/20" },
  { key: "late", ar: "متأخر", en: "Late", color: "text-[#f67d00] dark:text-[#feaf00]", bg: "bg-[#feaf00]/10 dark:bg-[#feaf00]/5 border-[#feaf00]/20" },
  { key: "excused", ar: "معذور", en: "Excused", color: "text-[#004d59] dark:text-teal-400", bg: "bg-[#004d59]/5 dark:bg-[#004d59]/10 border-[#004d59]/15" },
];

// الفلاتر: الـ predicate لكل فلتر في مكان واحد
const FILTER_DEFS = [
  { id: "all", ar: "الكل", en: "All", test: () => true },
  { id: "interviews", ar: "المقابلات", en: "Interviews", interviewOnly: true, test: (s) => !!s.isInterview },
  { id: "needs_eval", ar: "تحتاج تقييم", en: "Need Evaluation", interviewOnly: true, test: (s) => !!s.isInterview && !!s.canEvaluate },
  { id: "upcoming", ar: "القادمة", en: "Upcoming", test: (s) => s.status === "scheduled" },
  { id: "completed", ar: "المكتملة", en: "Completed", test: (s) => s.status === "completed" },
  { id: "today", ar: "اليوم", en: "Today", test: (s, today) => s._dk === today },
  { id: "needs_att", ar: "تحتاج حضور", en: "Need Attendance", test: (s) => !s.isInterview && s.status === "completed" && !s.attendanceTaken },
  { id: "cancelled", ar: "ملغاة/مؤجلة", en: "Cancelled", test: (s) => s.status === "cancelled" || s.status === "postponed" },
];
const FILTER_BY_ID = Object.fromEntries(FILTER_DEFS.map((f) => [f.id, f]));

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════
const fetchJson = (url) => fetch(url, { credentials: "include" }).then((r) => r.json());

// Intl formatters بتتعمل مرة واحدة وتتخزن (إنشاءها غالي)
const DATE_FORMATS = {
  short: { month: "short", day: "numeric" },
  full: { weekday: "long", year: "numeric", month: "long", day: "numeric" },
  dateTime: { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
  weekday: { weekday: "long" },
  monthShort: { month: "short" },
  monthDay: { month: "long", day: "numeric" },
};
const dtfCache = new Map();
function fmtDate(kind, d, isAr) {
  if (!d) return "";
  const locale = isAr ? "ar-EG" : "en-US";
  const key = `${locale}:${kind}`;
  let f = dtfCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, DATE_FORMATS[kind]);
    dtfCache.set(key, f);
  }
  return f.format(new Date(d));
}

function fmtTime(time, isAr) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? (isAr ? "م" : "PM") : (isAr ? "ص" : "AM");
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
}

const fmtDateKey = (d) => new Date(d).toISOString().slice(0, 10);

function getAttendanceBreakdown(list) {
  if (!list?.length) return null;
  const b = { present: 0, absent: 0, late: 0, excused: 0, total: list.length };
  for (const a of list) if (a.status in b) b[a.status]++;
  return b;
}

function getAttendanceRate(session) {
  const b = getAttendanceBreakdown(session.attendance);
  return b ? Math.round(((b.present + b.late) / b.total) * 100) : null;
}

function deduplicateLessons(lessons = []) {
  const seen = new Set();
  return lessons.filter((l) => {
    if (seen.has(l.title)) return false;
    seen.add(l.title);
    return true;
  });
}

const getSessionNum = (s) => (s.moduleIndex ?? 0) * 3 + (s.sessionNumber ?? 1);
const interviewEvalHref = (iv) => `/instructor/evaluation?interview=${iv._id}`;

function sessionGradient(session, { isToday = false, locked = false } = {}) {
  if (locked && session.status !== "completed") return "linear-gradient(135deg, #f59e0b, #d97706)";
  switch (session.status) {
    case "completed": return "linear-gradient(135deg, #10b981, #14b8a6)";
    case "cancelled": return "linear-gradient(135deg, #f87171, #ef4444)";
    case "postponed": return "linear-gradient(135deg, #feaf00, #f67d00)";
    default: return isToday ? CTA_GRAD : TEAL_GRAD;
  }
}

// ─── Hooks ──────────────────────────────────────────────────────────────────
function useBodyLock(onEscape) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onEscape?.(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onEscape]);
}

function useCopied() {
  const [copied, setCopied] = useState(null);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = useCallback((text, field) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(field);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(null), 2000);
    }).catch(() => { });
  }, []);
  return [copied, copy];
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared UI blocks
// ═══════════════════════════════════════════════════════════════════════════
const MODAL_SIZES = { lg: "sm:max-w-lg", xl: "sm:max-w-2xl" };

function ModalShell({ onClose, isAr, size = "xl", children }) {
  useBodyLock(onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" dir={isAr ? "rtl" : "ltr"}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={`relative w-full ${MODAL_SIZES[size]} max-h-[94vh] overflow-y-auto bg-white dark:bg-[#0d1117] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col border border-gray-100 dark:border-[#21262d]`}>
        {children}
      </div>
    </div>
  );
}

function ModalHero({ blob = true, children }) {
  return (
    <div className="relative overflow-hidden flex-shrink-0" style={{ background: HERO_GRAD }}>
      <div className="absolute inset-0 opacity-10" style={DOTS_STYLE} />
      {blob && <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full opacity-20 bg-[#feaf00]" />}
      <PaperPlane className="absolute top-3 end-14 w-40 opacity-20 -rotate-12 pointer-events-none" />
      <div className="relative z-10 p-6">{children}</div>
    </div>
  );
}

function CloseButton({ onClick }) {
  return (
    <button onClick={onClick}
      className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors border border-white/20 flex-shrink-0">
      <X className="w-4 h-4 text-white" />
    </button>
  );
}

function HeroBadge({ icon: Icon, className = "bg-white/20 text-white border-white/25", children }) {
  return (
    <span className={`${className} text-xs font-black px-2.5 py-1 rounded-full border flex items-center gap-1`}>
      {Icon && <Icon weight="fill" className="w-3.5 h-3.5" />}
      {children}
    </span>
  );
}

function StatusHeroBadge({ cfg, isAr }) {
  return (
    <span className="bg-white/20 text-white text-xs font-black px-3 py-1 rounded-full border border-white/25 flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {isAr ? cfg.labelAr : cfg.labelEn}
    </span>
  );
}

function HeroAvatar({ children }) {
  return (
    <div className="w-16 h-16 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-2xl font-black text-white flex-shrink-0 shadow-lg">
      {children}
    </div>
  );
}

const InfoTile = memo(function InfoTile({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] shadow-sm">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md" style={{ background: TEAL_GRAD }}>
        <Icon weight="fill" className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-gray-400 dark:text-[#6e7681]">{label}</p>
        <p className="text-xs font-black text-gray-900 dark:text-[#e6edf3] truncate">{value}</p>
      </div>
    </div>
  );
});

function AccentCard({ icon: Icon, title, subtitle, badge, children }) {
  return (
    <div className="rounded-3xl overflow-hidden border border-[#ff6700]/30 dark:border-[#ff6700]/20 bg-gradient-to-br from-orange-50/80 to-amber-50/50 dark:from-[#ff6700]/5 dark:to-[#feaf00]/5">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#ff6700]/20 dark:border-[#ff6700]/10 bg-gradient-to-r from-[#ff6700]/10 to-transparent">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ background: CTA_GRAD }}>
          <Icon weight="fill" className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-black text-gray-900 dark:text-[#e6edf3]">{title}</span>
          {subtitle && <p className="text-[10px] text-[#ff6700] font-bold capitalize">{subtitle}</p>}
        </div>
        {badge}
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

function CtaAnchor({ href, icon: Icon, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-black text-sm text-white shadow-lg hover:shadow-xl transition-shadow"
      style={{ background: CTA_GRAD }}>
      <Icon weight="fill" className="w-4 h-4" />
      {children}
      <ExternalLink className="w-3.5 h-3.5" />
    </a>
  );
}

function IconButton({ onClick, title, children }) {
  return (
    <button onClick={onClick} title={title} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[#ff6700]/10 transition-colors">
      {children}
    </button>
  );
}

function Chip({ icon: Icon, className, children }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border ${className}`}>
      <Icon className="w-3 h-3" />{children}
    </span>
  );
}

function SectionCard({ icon: Icon, iconGrad = TEAL_GRAD, title, aside, children, className = "" }) {
  return (
    <div className={`rounded-3xl border border-gray-100 dark:border-[#30363d] bg-white dark:bg-[#161b22] overflow-hidden shadow-sm ${className}`}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-[#30363d] bg-gray-50/80 dark:bg-[#0d1117]/40">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ background: iconGrad }}>
          <Icon weight="fill" className="w-5 h-5 text-white" />
        </div>
        <span className="text-sm font-black text-gray-900 dark:text-[#e6edf3]">{title}</span>
        {aside && <span className="ms-auto">{aside}</span>}
      </div>
      {children}
    </div>
  );
}

function NoticeCard({ icon: Icon, iconGrad, title, text, className, titleClass, textClass }) {
  return (
    <div className={`flex items-start gap-3 p-4 rounded-3xl border ${className}`}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md" style={{ background: iconGrad }}>
        <Icon weight="fill" className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className={`text-sm font-black ${titleClass}`}>{title}</p>
        <p className={`text-xs mt-0.5 leading-relaxed ${textClass}`}>{text}</p>
      </div>
    </div>
  );
}

const ReadOnlyStars = memo(function ReadOnlyStars({ value = 0, color = "#feaf00" }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} weight={n <= value ? "fill" : "regular"}
          className={`w-4 h-4 ${n <= value ? "" : "text-gray-300 dark:text-[#3d444d]"}`}
          style={n <= value ? { color } : undefined} />
      ))}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// Hold banner
// ═══════════════════════════════════════════════════════════════════════════
const HoldBanner = memo(function HoldBanner({ isAr, lockedCount, totalActive }) {
  const t = (ar, en) => (isAr ? ar : en);
  const message = lockedCount === totalActive
    ? t("كل جلساتك المتاحة متوقفة مؤقتًا. هتقدر تشتغل عليها بعد فكّ الـ Hold.",
      "All your active sessions are paused. You can work on them once the hold is released.")
    : t(`${lockedCount} جلسة من ${totalActive} متوقفة حاليًا. الجلسات التانية شغالة عادي.`,
      `${lockedCount} of ${totalActive} sessions are paused. The rest are working normally.`);

  return (
    <div className="mb-5 rounded-3xl p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-md">
          <PauseCircle weight="fill" className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm text-amber-900 dark:text-amber-300">
            {t("فيه جلسات متوقفة مؤقتًا (Hold)", "Some sessions are temporarily on hold")}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">{message}</p>
        </div>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// Request Access Modal
// ═══════════════════════════════════════════════════════════════════════════
const TONES = {
  green: { box: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30", icon: "text-emerald-500" },
  amber: { box: "bg-[#feaf00]/10 border-[#feaf00]/30 dark:border-[#feaf00]/20", icon: "text-[#f67d00] dark:text-[#feaf00]" },
  red: { box: "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30", icon: "text-red-500" },
};

const OPTION_STYLES = {
  orange: { hover: "hover:border-[#ff6700]/50", grad: "from-[#ff6700] to-[#feaf00]" },
  teal: { hover: "hover:border-[#004d59]/50", grad: "from-[#004d59] to-[#0e7c8c]" },
};

function StatusPanel({ tone, icon: Icon, title, children }) {
  const c = TONES[tone];
  return (
    <div className="text-center py-2">
      <div className={`w-16 h-16 mx-auto rounded-3xl flex items-center justify-center mb-4 border ${c.box}`}>
        <Icon className={`w-8 h-8 ${c.icon}`} />
      </div>
      <h4 className="text-base font-black text-gray-900 dark:text-[#e6edf3] mb-2">{title}</h4>
      {children}
    </div>
  );
}

function GradientButton({ onClick, grad = BRAND_GRAD, children }) {
  return (
    <button onClick={onClick}
      className="px-6 py-3 rounded-xl font-black text-white shadow-lg hover:shadow-xl transition-shadow"
      style={{ background: grad }}>
      {children}
    </button>
  );
}

function OptionButton({ variant, icon: Icon, title, desc, busy, disabled, onClick }) {
  const s = OPTION_STYLES[variant];
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-full text-start p-4 rounded-3xl border-2 border-gray-100 dark:border-[#30363d] ${s.hover} transition-colors bg-white dark:bg-[#161b22] disabled:opacity-60`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.grad} flex items-center justify-center shadow-md flex-shrink-0 overflow-hidden`}>
          {busy ? <PaperPlaneLoader inline tone="light" size={18} /> : <Icon className="w-5 h-5 text-white" />}
        </div>
        <div className="flex-1">
          <h5 className="font-black text-sm text-gray-900 dark:text-[#e6edf3] mb-1">{title}</h5>
          <p className="text-xs text-gray-500 dark:text-[#8b949e] leading-relaxed">{desc}</p>
        </div>
      </div>
    </button>
  );
}

function RequestAccessModal({ session, onClose, isAr, onSubmitted }) {
  const t = (ar, en) => (isAr ? ar : en);
  const [checking, setChecking] = useState(true);
  const [statusInfo, setStatusInfo] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [showOptionsAfterRejection, setShowOptionsAfterRejection] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const json = await fetchJson(`/api/instructor/sessions/${session._id}/request-reschedule`);
        if (active && json.success) setStatusInfo(json.data);
      } catch {
        // fail silently
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => { active = false; };
  }, [session._id]);

  const handleSubmit = async (mode) => {
    setSelectedMode(mode);
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/instructor/sessions/${session._id}/request-reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ viewMode: mode === "withNext" ? "withNext" : "single", shiftDays: 7 }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(json.data);
        onSubmitted?.(json.data);
      } else {
        setError(json.message || t("حدث خطأ، حاول مرة أخرى", "Something went wrong, please try again"));
      }
    } catch {
      setError(t("فشل الاتصال بالخادم", "Failed to connect to the server"));
    } finally {
      setSubmitting(false);
    }
  };

  const hasPending = statusInfo?.status === "pending";
  const wasRejected = statusInfo?.status === "rejected" && !showOptionsAfterRejection;
  const swapCandidate = !hasPending && !wasRejected ? statusInfo?.swapCandidate || null : null;

  const openNowDesc = t(
    "هذه الجلسة تُفتح فورًا (رابط ميتنج + تسجيل حضور). باقي جلسات الجروب اللي لسه مش مكتملة هتترحل أسبوعًا، وتبقى مقفولة حتى يحين معادها الجديد.",
    "This session opens immediately (meeting link + attendance). Every other non-completed session in this group shifts by one week and stays locked until its new date arrives."
  );

  let body;
  if (checking) {
    body = (
      <div className="flex items-center justify-center py-6">
        <PaperPlaneLoader label={t("جاري التحقق...", "Checking...")} />
      </div>
    );
  } else if (success) {
    body = (
      <StatusPanel tone="green" icon={Send} title={t("تم إرسال الطلب", "Request Sent")}>
        <p className="text-sm text-gray-500 dark:text-[#8b949e] leading-relaxed mb-1">
          {t("طلبك في انتظار موافقة الأدمن. ستظهر الجلسة هنا فور الموافقة.",
            "Your request is awaiting admin approval. The session will open as soon as it's approved.")}
        </p>
        <p className="text-xs text-gray-400 dark:text-[#6e7681] mb-5">
          {t(`سيتم ترحيل ${success.affectedCount} جلسة بمقدار أسبوع`,
            `${success.affectedCount} session(s) will shift by one week`)}
        </p>
        <GradientButton onClick={onClose} grad={CTA_GRAD}>{t("تم", "Got it")}</GradientButton>
      </StatusPanel>
    );
  } else if (hasPending) {
    body = (
      <StatusPanel tone="amber" icon={Hourglass} title={t("يوجد طلب قيد المراجعة", "A Request Is Already Pending")}>
        <p className="text-sm text-gray-500 dark:text-[#8b949e] leading-relaxed mb-5">
          {t("يوجد طلب فتح جلسة قيد المراجعة لهذا الجروب بالفعل. برجاء الانتظار حتى يرد الأدمن قبل تقديم طلب جديد.",
            "There's already a pending access request for this group. Please wait for the admin's response before submitting a new one.")}
        </p>
        <GradientButton onClick={onClose}>{t("فهمت", "Got it")}</GradientButton>
      </StatusPanel>
    );
  } else if (wasRejected) {
    body = (
      <StatusPanel tone="red" icon={BadgeAlert} title={t("تم رفض طلبك السابق", "Your Previous Request Was Rejected")}>
        <p className="text-sm text-gray-500 dark:text-[#8b949e] leading-relaxed mb-3">
          {t("راجع الأدمن طلب فتح هذه الجلسة ولم يوافق عليه.",
            "The admin reviewed your request to open this session and did not approve it.")}
        </p>
        {statusInfo?.reviewNotes ? (
          <div className="text-start flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-50/70 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 mb-5">
            <MessageSquareWarning className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-black text-red-500 mb-0.5">{t("سبب الرفض", "Rejection reason")}</p>
              <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed">{statusInfo.reviewNotes}</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 dark:text-[#6e7681] mb-5">
            {t("لم يترك الأدمن سببًا محددًا للرفض.", "The admin didn't leave a specific reason.")}
          </p>
        )}
        <div className="flex items-center justify-center gap-2">
          <button onClick={onClose}
            className="px-5 py-3 rounded-xl font-bold text-gray-600 dark:text-[#8b949e] bg-gray-100 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] hover:bg-gray-200 dark:hover:bg-[#21262d] transition-colors">
            {t("إغلاق", "Close")}
          </button>
          <GradientButton onClick={() => setShowOptionsAfterRejection(true)}>
            {t("تقديم طلب جديد", "Submit a New Request")}
          </GradientButton>
        </div>
      </StatusPanel>
    );
  } else {
    body = (
      <>
        {swapCandidate ? (
          <>
            <p className="text-sm text-gray-500 dark:text-[#8b949e] leading-relaxed">
              {t(`عندك جلسة "${swapCandidate.title}" هي المتاحة فعليًا النهاردة في هذا الجروب. تقدر تطلب استبدالها بهذه الجلسة.`,
                `"${swapCandidate.title}" is the session currently open today for this group. You can request to swap it with this session.`)}
            </p>
            <OptionButton variant="orange" icon={Repeat}
              title={t("استبدال جلسة اليوم بهذه الجلسة", "Swap Today's Session With This One")}
              desc={openNowDesc}
              busy={submitting && selectedMode === "swap"} disabled={submitting}
              onClick={() => handleSubmit("swap")} />
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500 dark:text-[#8b949e] leading-relaxed">
              {t("هذه الجلسة غير متاحة لأنها ليست في يومها. اختر كيف تريد طلب فتحها — سيتم إرسال طلبك للأدمن للموافقة.",
                "This session isn't available because it's not on its scheduled day. Choose how you'd like to request access — your request will be sent to the admin for approval.")}
            </p>
            <OptionButton variant="orange" icon={ArrowRightCircle}
              title={t("فتح هذه الجلسة فقط", "Open This Session Only")}
              desc={openNowDesc}
              busy={submitting && selectedMode === "single"} disabled={submitting}
              onClick={() => handleSubmit("single")} />
            <OptionButton variant="teal" icon={SkipForward}
              title={t("فتح هذه الجلسة وما بعدها", "Open This Session and the Ones After")}
              desc={t(
                "هذه الجلسة تُفتح فورًا بكل شيء. باقي جلسات الجروب اللي لسه مش مكتملة تترحل أسبوعًا وتظهر تفاصيلها العامة (المحتوى/الدروس)، لكن بدون رابط ميتنج أو تسجيل حضور حتى يحين معادها الجديد فعليًا.",
                "This session opens immediately with everything. Every other non-completed session in this group shifts by one week and shows general details (content/lessons), but without a meeting link or attendance until its new date actually arrives."
              )}
              busy={submitting && selectedMode === "withNext"} disabled={submitting}
              onClick={() => handleSubmit("withNext")} />
          </>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
          </div>
        )}
        <p className="text-[11px] text-gray-400 dark:text-[#6e7681] text-center pt-1">
          {t("سيتم إرسال طلبك للأدمن لمراجعته والموافقة عليه", "Your request will be sent to the admin for review and approval")}
        </p>
      </>
    );
  }

  return (
    <ModalShell onClose={onClose} isAr={isAr} size="lg">
      <ModalHero blob={false}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center border border-white/20 flex-shrink-0">
              <CalendarClock weight="fill" className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white leading-snug">{t("طلب فتح الجلسة", "Request Session Access")}</h3>
              <p className="text-white/70 text-xs font-medium mt-0.5 truncate max-w-[260px]">{session.title}</p>
            </div>
          </div>
          <CloseButton onClick={onClose} />
        </div>
      </ModalHero>
      <div className="p-5 space-y-4">{body}</div>
    </ModalShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Session modal pieces
// ═══════════════════════════════════════════════════════════════════════════
function LocationCard({ session, isAr }) {
  const loc = session.locationInfo;
  if (!loc || !(loc.placeName || loc.address || loc.mapsLink)) return null;
  const t = (ar, en) => (isAr ? ar : en);

  return (
    <AccentCard
      icon={MapPin}
      title={session.isInterview ? t("موقع المقابلة", "Interview Location") : t("موقع الجلسة", "Session Location")}
      subtitle={session.isInterview ? "Offline Interview" : "Offline Session"}
      badge={
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ff6700]/15 text-[#ff6700] border border-[#ff6700]/30 font-black inline-flex items-center gap-1">
          <MapPin weight="fill" className="w-3 h-3" />{t("حضوري", "On-site")}
        </span>
      }>
      {loc.placeName && (
        <div className={FIELD_ROW}>
          <MapPin className="w-4 h-4 text-[#004d59] dark:text-[#ff6437] flex-shrink-0" />
          <span className="flex-1 text-xs text-gray-700 dark:text-[#c9d1d9] font-bold truncate">{loc.placeName}</span>
        </div>
      )}
      {loc.address && (
        <div className={`${FIELD_ROW} items-start`}>
          <Navigation className="w-4 h-4 text-[#004d59] dark:text-[#8b949e] flex-shrink-0 mt-0.5" />
          <span className="flex-1 text-xs text-gray-700 dark:text-[#c9d1d9] leading-relaxed">{loc.address}</span>
        </div>
      )}
      {loc.mapsLink && (
        <CtaAnchor href={loc.mapsLink} icon={MapPin}>
          {t("افتح الموقع على الخريطة", "Open Location on Maps")}
        </CtaAnchor>
      )}
    </AccentCard>
  );
}

function MeetingCredentials({ session, isAr }) {
  const [showPass, setShowPass] = useState(false);
  const [copied, copy] = useCopied();
  const t = (ar, en) => (isAr ? ar : en);
  if (!session.meetingLink) return null;

  const { username, password } = session.meetingCredentials || {};
  const copyIcon = (field) =>
    copied === field
      ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
      : <Copy className="w-3.5 h-3.5 text-gray-400" />;

  return (
    <AccentCard
      icon={Video}
      title={session.isInterview ? t("بيانات المقابلة", "Interview Access") : t("بيانات الجلسة", "Session Access")}
      subtitle={session.meetingPlatform}>
      <div className={FIELD_ROW}>
        <Link2 className="w-4 h-4 text-[#004d59] dark:text-[#ff6437] flex-shrink-0" />
        <a href={session.meetingLink} target="_blank" rel="noopener noreferrer"
          className="flex-1 text-xs text-[#004d59] dark:text-[#ff6437] font-semibold hover:underline truncate">
          {session.meetingLink}
        </a>
        <IconButton onClick={() => copy(session.meetingLink, "link")} title={t("نسخ", "Copy")}>{copyIcon("link")}</IconButton>
      </div>

      {username && (
        <div className={FIELD_ROW}>
          <User className="w-4 h-4 text-[#004d59] dark:text-[#8b949e] flex-shrink-0" />
          <span className="flex-1 text-xs text-gray-700 dark:text-[#c9d1d9] font-mono">{username}</span>
          <IconButton onClick={() => copy(username, "user")}>{copyIcon("user")}</IconButton>
        </div>
      )}

      {password && (
        <div className={FIELD_ROW}>
          <Lock className="w-4 h-4 text-[#004d59] dark:text-[#8b949e] flex-shrink-0" />
          <span className="flex-1 text-xs text-gray-700 dark:text-[#c9d1d9] font-mono tracking-widest">
            {showPass ? password : "••••••••"}
          </span>
          <IconButton onClick={() => setShowPass((v) => !v)}>
            {showPass ? <EyeOff className="w-3.5 h-3.5 text-gray-400" /> : <Eye className="w-3.5 h-3.5 text-gray-400" />}
          </IconButton>
          {showPass && <IconButton onClick={() => copy(password, "pass")}>{copyIcon("pass")}</IconButton>}
        </div>
      )}

      <CtaAnchor href={session.meetingLink} icon={Video}>
        {session.isInterview ? t("ابدأ المقابلة الآن", "Start Interview Now") : t("ابدأ الجلسة الآن", "Start Session Now")}
      </CtaAnchor>
    </AccentCard>
  );
}

function CourseInfoSection({ session, isAr }) {
  // الـ hooks فوق أي early return (كانت مخالفة لقواعد React في النسخة القديمة)
  const [showBlog, setShowBlog] = useState(false);
  const t = (ar, en) => (isAr ? ar : en);
  const course = session.courseInfo;
  if (!course) return null;

  const moduleData = course.moduleData;
  const blogBody = isAr ? moduleData?.blogBodyAr : moduleData?.blogBodyEn;
  const hasBlog = !!blogBody?.trim();
  const moduleNum = (session.moduleIndex ?? 0) + 1;

  return (
    <div className="space-y-3">
      <div className="rounded-3xl border border-[#004d59]/20 dark:border-[#004d59]/30 bg-gradient-to-br from-[#004d59]/5 to-[#ff6700]/5 dark:from-[#004d59]/10 dark:to-[#ff6700]/5 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#004d59]/15 dark:border-[#004d59]/20">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ background: BRAND_GRAD }}>
            <GraduationCap weight="fill" className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm font-black text-gray-900 dark:text-[#e6edf3]">{t("معلومات الكورس", "Course Info")}</span>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-black text-sm text-gray-900 dark:text-[#e6edf3] mb-2">{course.title}</h3>
            <div className="flex flex-wrap gap-1.5">
              {course.grade && <Chip icon={GraduationCap} className="bg-[#004d59]/10 text-[#004d59] dark:text-teal-300 border-[#004d59]/20">{course.grade}</Chip>}
              {course.subject && <Chip icon={BookOpen} className="bg-[#ff6700]/10 text-[#ff6700] dark:text-[#ff6437] border-[#ff6700]/20">{course.subject}</Chip>}
              {course.level && <Chip icon={BarChart3} className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/30">{course.level}</Chip>}
              {course.duration && <Chip icon={Timer} className="bg-[#feaf00]/15 text-[#f67d00] dark:text-[#feaf00] border-[#feaf00]/30">{course.duration}</Chip>}
            </div>
          </div>
          {course.description && (
            <p className="text-xs text-gray-600 dark:text-[#8b949e] leading-relaxed border-t border-[#004d59]/10 dark:border-[#004d59]/20 pt-3">
              {course.description}
            </p>
          )}
        </div>
      </div>

      {moduleData && (
        <SectionCard
          icon={Layers} iconGrad="linear-gradient(135deg, #004d59, #ff6437)" title={t("الوحدة الدراسية", "Module")}
          aside={
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ff6700]/10 text-[#ff6700] dark:text-[#ff6437] font-black border border-[#ff6700]/20">
              {t(`الوحدة ${moduleNum}`, `Module ${moduleNum}`)}
            </span>
          }>
          <div className="p-4">
            <h4 className="font-black text-sm text-gray-900 dark:text-[#e6edf3] mb-1">{moduleData.title}</h4>
            {moduleData.description && <p className="text-xs text-gray-500 dark:text-[#8b949e] leading-relaxed">{moduleData.description}</p>}
            {moduleData.presentationUrl && (
              <a href={moduleData.presentationUrl} target="_blank" rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl text-xs font-bold text-gray-700 dark:text-[#8b949e] hover:border-[#ff6700]/50 hover:text-[#ff6700] transition-colors">
                <Presentation className="w-3.5 h-3.5" />{t("عرض البريزنتيشن", "View Presentation")}<ExternalLink className="w-3 h-3" />
              </a>
            )}
            {moduleData.projects?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#21262d]">
                <p className="text-[10px] font-black text-gray-500 dark:text-[#6e7681] mb-2 flex items-center gap-1">
                  <FolderOpen className="w-3 h-3" />{t("مشاريع الوحدة", "Module Projects")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {moduleData.projects.map((url, i) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg text-[10px] font-medium text-gray-600 dark:text-[#8b949e] hover:border-[#ff6700]/50 hover:text-[#ff6700] transition-colors">
                      <Globe className="w-2.5 h-2.5" />{t(`مشروع ${i + 1}`, `Project ${i + 1}`)}<ExternalLink className="w-2 h-2" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {hasBlog && (
        <div className="rounded-3xl border border-gray-100 dark:border-[#30363d] overflow-hidden">
          <button onClick={() => setShowBlog((v) => !v)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-[#0d1117]/60 hover:bg-gray-100 dark:hover:bg-[#0d1117]/80 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff6700] to-[#f67d00] flex items-center justify-center shadow-md">
              <BookMarked weight="fill" className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-black text-gray-900 dark:text-[#e6edf3] flex-1 text-start">
              {t("محتوى الوحدة التفصيلي", "Module Detailed Content")}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showBlog ? "rotate-180" : ""}`} />
          </button>
          {/* ملحوظة: المحتوى ده HTML جاي من الأدمن — يفضّل تعمله sanitize (DOMPurify) */}
          {showBlog && (
            <div className="p-4 prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed bg-white dark:bg-[#0d1117]/30 border-t border-gray-100 dark:border-[#30363d] overflow-auto max-h-72"
              dangerouslySetInnerHTML={{ __html: blogBody }} />
          )}
        </div>
      )}
    </div>
  );
}

// زرار الحضور: 3 أشكال حسب نوع الجلسة
const AttendanceCta = memo(function AttendanceCta({ session, isAr }) {
  const t = (ar, en) => (isAr ? ar : en);
  const flyToAttendance = useAttendanceFlight();
  const taken = session.attendanceTaken;
  const href = `/instructor/attendance?session=${session._id}`;
  const compact = !session.isOffline && !!session.meetingLink;
  const onClick = (e) => flyToAttendance(e, href, session.title);

  const label = compact
    ? (taken ? t("إعادة تسجيل الحضور", "Re-take Attendance") : t("تسجيل الحضور", "Take Attendance"))
    : (taken ? t("إعادة تسجيل الحضور الآن", "Re-take Attendance Now") : t("تسجيل الحضور الآن", "Take Attendance Now"));

  if (compact) {
    return (
      <Link href={href} onClick={onClick}
        className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm bg-white dark:bg-[#161b22] text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors">
        <ClipboardList weight="fill" className="w-4 h-4" />{label}
      </Link>
    );
  }

  const bg = session.isOffline ? BRAND_GRAD : "linear-gradient(135deg, #10b981, #14b8a6)";
  return (
    <Link href={href} onClick={onClick}
      className="flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-sm text-white shadow-lg hover:shadow-xl transition-shadow"
      style={{ background: bg }}>
      <ClipboardList weight="fill" className="w-5 h-5" />{label}
    </Link>
  );
});

const AttendanceStats = memo(function AttendanceStats({ breakdown, rate, isAr }) {
  const t = (ar, en) => (isAr ? ar : en);
  return (
    <div className="rounded-3xl border bg-white dark:bg-[#161b22] overflow-hidden shadow-sm" style={{ borderColor: "#10b98140" }}>
      <div className="relative p-4 flex items-center gap-3 text-white overflow-hidden" style={{ background: "linear-gradient(135deg, #10b981, #14b8a6)" }}>
        <div className="relative w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shadow-lg flex-shrink-0">
          <BarChart3 weight="fill" className="w-8 h-8 text-white" />
        </div>
        <div className="relative flex-1 min-w-0">
          <p className="text-[11px] font-bold text-white/75">{t("نسبة الحضور", "Attendance rate")}</p>
          <p className="text-lg font-black leading-tight">{breakdown.total} {t("طالب", "students")}</p>
        </div>
        {rate !== null && (
          <div className="relative flex items-center gap-1 px-3 py-2 rounded-2xl bg-white/20 border border-white/30 font-black text-base">
            <UserCheck weight="fill" className="w-4 h-4" />{rate}%
          </div>
        )}
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-4 gap-2">
          {ATT_KEYS.map(({ key, ar, en, color, bg }) => (
            <div key={key} className={`p-3 text-center rounded-2xl border ${bg}`}>
              <div className={`text-2xl font-black ${color}`}>{breakdown[key]}</div>
              <div className="text-[10px] text-gray-500 dark:text-[#8b949e] font-bold mt-0.5">{t(ar, en)}</div>
            </div>
          ))}
        </div>
        <div className="h-2 bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${rate || 0}%`, background: BRAND_GRAD }} />
        </div>
      </div>
    </div>
  );
});

const LessonsList = memo(function LessonsList({ lessons, isCompleted, isAr }) {
  const t = (ar, en) => (isAr ? ar : en);
  return (
    <SectionCard
      icon={BookOpen} title={t("الدروس المغطاة", "Lessons Covered")}
      aside={
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#21262d] text-gray-500 dark:text-[#8b949e] font-bold border border-gray-200 dark:border-[#30363d]">
          {lessons.length} {t("درس", "lessons")}
        </span>
      }>
      <div className="divide-y divide-gray-50 dark:divide-[#21262d]">
        {lessons.map((lesson, i) => (
          <div key={lesson.title} className="flex items-start gap-3 px-4 py-3.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5 shadow-sm
              ${isCompleted ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white" : "bg-gradient-to-br from-[#ff6700]/20 to-[#feaf00]/20 text-[#ff6700]"}`}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 dark:text-[#c9d1d9] font-bold">{lesson.title}</p>
              {lesson.description && <p className="text-xs text-gray-400 dark:text-[#6e7681] mt-0.5 leading-relaxed">{lesson.description}</p>}
              {lesson.duration && (
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-gray-400 bg-gray-50 dark:bg-[#21262d] px-2 py-0.5 rounded-full border border-gray-100 dark:border-[#30363d]">
                  <Clock className="w-2.5 h-2.5" />{lesson.duration}
                </span>
              )}
            </div>
            {isCompleted && <CheckCircle weight="fill" className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-1.5" />}
          </div>
        ))}
      </div>
    </SectionCard>
  );
});

function SessionModal({ session, onClose, isAr, onRequestAccess }) {
  const t = (ar, en) => (isAr ? ar : en);
  const cfg = STATUS_CFG[session.status] || STATUS_CFG.scheduled;
  const isCompleted = session.status === "completed";
  const isActuallyToday = session.isEffectivelyToday ?? session.isToday;
  const isPartial = !!session.canViewPartialDetails;
  const hasEarlyAccess = !!session.hasActiveEarlyAccess;
  const sessionIsLocked = !!session.sessionIsLocked;
  const showLockedState = sessionIsLocked && !isCompleted;
  const hasPendingReopen = session.pendingReschedule?.status === "pending";
  const attendanceLocked = session.attendanceTaken && !hasEarlyAccess && !session.isToday;
  const showAttendanceActions = !isPartial && isActuallyToday && !attendanceLocked && !sessionIsLocked;
  const showLive = !isPartial && isActuallyToday && !sessionIsLocked;

  const lessons = useMemo(() => deduplicateLessons(session.lessons), [session.lessons]);
  const breakdown = useMemo(
    () => (isCompleted ? getAttendanceBreakdown(session.attendance) : null),
    [isCompleted, session.attendance]
  );
  const attRate = breakdown ? Math.round(((breakdown.present + breakdown.late) / breakdown.total) * 100) : null;
  const moduleNum = (session.moduleIndex ?? 0) + 1;

  return (
    <ModalShell onClose={onClose} isAr={isAr}>
      <ModalHero>
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusHeroBadge cfg={cfg} isAr={isAr} />
            <HeroBadge icon={BookOpen}>{t("جلسة", "Session")}</HeroBadge>
            {showLockedState && <HeroBadge icon={Lock} className="bg-amber-500/30 text-white border-amber-400/40">{t("مقفولة", "Locked")}</HeroBadge>}
            {showLive && <HeroBadge icon={Sparkles} className="bg-[#feaf00]/30 text-[#feaf00] border-[#feaf00]/40">{t("اليوم", "Today")}</HeroBadge>}
            <HeroBadge icon={session.isOffline ? MapPin : Video} className="bg-white/15 text-white border-white/25">
              {session.isOffline ? t("حضوري", "On-site") : t("أونلاين", "Online")}
            </HeroBadge>
            {session.isComplimentary && <HeroBadge icon={Gift}>{t("حصة تعويضية", "Make-up")}</HeroBadge>}
            {isPartial && <HeroBadge icon={Lock} className="bg-white/15 text-white border-white/25">{t("معاينة فقط", "Preview Only")}</HeroBadge>}
          </div>
          <CloseButton onClick={onClose} />
        </div>

        <div className="flex items-center gap-4">
          <HeroAvatar>
            {showLockedState ? <Lock weight="fill" className="w-7 h-7" />
              : isCompleted ? <CheckCircle weight="fill" className="w-8 h-8" />
                : session.status === "cancelled" ? <X className="w-7 h-7" />
                  : getSessionNum(session)}
          </HeroAvatar>
          <div className="min-w-0">
            <h2 className="text-xl font-black text-white leading-snug truncate">{session.title}</h2>
            <p className="text-white/70 text-sm font-medium truncate">
              {session.group?.name} · {t("الجلسة", "Session")} {session.sessionNumber} · {t(`الوحدة ${moduleNum}`, `Module ${moduleNum}`)}
            </p>
          </div>
        </div>
      </ModalHero>

      <div className="p-5 space-y-4 bg-gray-50/50 dark:bg-[#0d1117]">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <InfoTile icon={Calendar} label={t("التاريخ", "Date")} value={fmtDate("full", session.scheduledDate, isAr)} />
          <InfoTile icon={Clock} label={t("الوقت", "Time")} value={`${fmtTime(session.startTime, isAr)} – ${fmtTime(session.endTime, isAr)}`} />
          <InfoTile icon={Timer} label={t("المدة", "Duration")} value={t("ساعتان", "2 hours")} />
        </div>

        {showLockedState && (
          <NoticeCard icon={Lock} iconGrad="linear-gradient(135deg, #fbbf24, #f59e0b)"
            className="bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20"
            titleClass="text-amber-800 dark:text-amber-300" textClass="text-amber-700 dark:text-amber-400"
            title={t("الجلسة مقفولة مؤقتًا", "Session is on hold")}
            text={t("هذه الجلسة غير متاحة حاليًا. الحضور والرابط سيكونان متاحين بعد فكّ الـ Hold.",
              "This session is not available right now. Attendance and link will be available once the hold is released.")} />
        )}

        {isPartial && !sessionIsLocked && (
          <NoticeCard icon={Lock} iconGrad={TEAL_GRAD}
            className="bg-[#004d59]/5 dark:bg-[#004d59]/10 border-[#004d59]/20 dark:border-[#004d59]/30"
            titleClass="text-[#004d59] dark:text-teal-400" textClass="text-[#004d59]/70 dark:text-teal-400/70"
            title={t("هذه معاينة للمحتوى فقط", "This is a content preview only")}
            text={t("رابط الميتنج وتسجيل الحضور سيكونان متاحين عند حلول معاد الجلسة الجديد فعليًا.",
              "The meeting link and attendance will become available once this session's new date actually arrives.")} />
        )}

        {hasPendingReopen && (
          <NoticeCard icon={Hourglass} iconGrad="linear-gradient(135deg, #feaf00, #f67d00)"
            className="bg-[#feaf00]/10 border-[#feaf00]/30 dark:border-[#feaf00]/20"
            titleClass="text-[#f67d00] dark:text-[#feaf00]" textClass="text-[#f67d00]/70 dark:text-[#feaf00]/70"
            title={t("طلب إعادة الفتح قيد المراجعة", "Reopen Request Pending Review")}
            text={t("في انتظار موافقة الأدمن على طلبك.", "Awaiting admin approval for your request.")} />
        )}

        {isPartial && !isCompleted && !hasPendingReopen && !sessionIsLocked && onRequestAccess && (
          <button onClick={() => onRequestAccess(session)} className={OUTLINE_BTN}>
            <CalendarClock weight="fill" className="w-4 h-4" />{t("طلب فتح الجلسة", "Request Session Access")}
          </button>
        )}

        {session.description && (
          <SectionCard icon={FileText} title={t("وصف الجلسة", "Session Description")}
            aside={<span className="text-[10px] px-2 py-0.5 rounded-full bg-[#004d59]/10 text-[#004d59] dark:text-teal-400 font-bold border border-[#004d59]/20">{t("ساعتان", "2 hours")}</span>}>
            <p className="px-4 py-3 text-sm text-gray-700 dark:text-[#c9d1d9] leading-relaxed">{session.description}</p>
          </SectionCard>
        )}

        {showLive && !session.isOffline && session.meetingLink && <MeetingCredentials session={session} isAr={isAr} />}
        {showLive && session.isOffline && session.locationInfo && <LocationCard session={session} isAr={isAr} />}

        {showAttendanceActions && <AttendanceCta session={session} isAr={isAr} />}

        {isCompleted && !hasEarlyAccess && !hasPendingReopen && !sessionIsLocked && onRequestAccess && (
          <button onClick={() => onRequestAccess(session)} className={OUTLINE_BTN}>
            <RefreshCw className="w-4 h-4" />{t("طلب إعادة فتح الجلسة", "Request to Reopen Session")}
          </button>
        )}

        {isCompleted && session.recordingLink && !session.isOffline && (
          <a href={session.recordingLink} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm border border-[#004d59]/30 bg-gradient-to-r from-[#004d59]/10 to-transparent text-[#004d59] dark:text-teal-400 hover:from-[#004d59]/15 transition-colors">
            <Play weight="fill" className="w-4 h-4" />{t("مشاهدة التسجيل", "Watch Recording")}
          </a>
        )}

        {breakdown && <AttendanceStats breakdown={breakdown} rate={attRate} isAr={isAr} />}
        {lessons.length > 0 && <LessonsList lessons={lessons} isCompleted={isCompleted} isAr={isAr} />}

        <CourseInfoSection session={session} isAr={isAr} />

        {session.instructorNotes && (
          <div className="bg-[#feaf00]/10 dark:bg-[#feaf00]/5 border border-[#feaf00]/30 dark:border-[#feaf00]/20 rounded-3xl p-4">
            <h4 className="text-xs font-black text-[#f67d00] dark:text-[#feaf00] mb-2 flex items-center gap-1.5">
              <Info className="w-4 h-4" />{t("ملاحظات الجلسة", "Session Notes")}
            </h4>
            <p className="text-sm text-[#f67d00]/80 dark:text-[#feaf00]/70 leading-relaxed">{session.instructorNotes}</p>
          </div>
        )}

        {!isPartial && session.materials?.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-black text-gray-500 dark:text-[#6e7681] flex items-center gap-1.5 px-1">
              <FileText className="w-3.5 h-3.5" />{t("المواد التعليمية", "Materials")}
            </h4>
            <div className="flex flex-wrap gap-2">
              {session.materials.map((mat, i) => (
                <a key={mat.url || i} href={mat.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#21262d] border border-gray-200 dark:border-[#30363d] rounded-xl text-xs font-bold text-gray-700 dark:text-[#8b949e] hover:border-[#ff6700]/50 hover:text-[#ff6700] transition-colors shadow-sm">
                  <FileText className="w-3.5 h-3.5" />{mat.name || `ملف ${i + 1}`}<ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Interview modal
// ═══════════════════════════════════════════════════════════════════════════
function InterviewModal({ interview, onClose, isAr, onEvaluate }) {
  const t = (ar, en) => (isAr ? ar : en);
  const cfg = STATUS_CFG[interview.status] || STATUS_CFG.scheduled;
  const dec = interview.evaluation?.decision ? INTERVIEW_DECISIONS[interview.evaluation.decision] : null;
  const ratings = interview.evaluation?.ratings;
  const DecIcon = dec?.icon;
  const href = interviewEvalHref(interview);
  const avgRating = ratings
    ? Math.round((INTERVIEW_RATING_ROWS.reduce((s, r) => s + (ratings[r.key] || 0), 0) / INTERVIEW_RATING_ROWS.length) * 10) / 10
    : null;
  const handleEval = (e) => onEvaluate(e, href, interview.title);

  return (
    <ModalShell onClose={onClose} isAr={isAr}>
      <ModalHero>
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusHeroBadge cfg={cfg} isAr={isAr} />
            <HeroBadge icon={Briefcase}>{t("مقابلة", "Interview")}</HeroBadge>
            {interview.isToday && interview.status === "scheduled" && (
              <HeroBadge icon={Sparkles} className="bg-[#feaf00]/30 text-[#feaf00] border-[#feaf00]/40">{t("اليوم", "Today")}</HeroBadge>
            )}
            <HeroBadge icon={interview.isOffline ? MapPin : Video} className="bg-white/15 text-white border-white/25">
              {interview.isOffline ? t("حضوري", "On-site") : t("أونلاين", "Online")}
            </HeroBadge>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        <div className="flex items-center gap-4">
          <HeroAvatar>{(interview.student?.name?.[0] || "?").toUpperCase()}</HeroAvatar>
          <div className="min-w-0">
            <h2 className="text-xl font-black text-white leading-snug truncate">{interview.student?.name || t("بدون اسم", "No name")}</h2>
            <p className="text-white/70 text-sm font-medium truncate">
              {interview.title}
              {interview.student?.enrollmentNumber && <span className="opacity-60"> · #{interview.student.enrollmentNumber}</span>}
            </p>
            <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-black text-white/90 bg-white/10 px-2 py-0.5 rounded-full border border-white/15">
              <User className="w-3 h-3" />{interview.isAdult ? t("طالب بالغ", "Adult student") : t("طفل", "Kid")}
            </span>
          </div>
        </div>
      </ModalHero>

      <div className="p-5 space-y-4 bg-gray-50/50 dark:bg-[#0d1117]">
        <div className="grid grid-cols-2 gap-2.5">
          <InfoTile icon={Calendar} label={t("التاريخ", "Date")} value={fmtDate("full", interview.scheduledDate, isAr)} />
          <InfoTile icon={Clock} label={t("الوقت", "Time")} value={`${fmtTime(interview.startTime, isAr)} – ${fmtTime(interview.endTime, isAr)}`} />
        </div>

        {interview.canViewDetails && !interview.isOffline && interview.meetingLink && <MeetingCredentials session={interview} isAr={isAr} />}
        {interview.canViewDetails && interview.isOffline && interview.locationInfo && <LocationCard session={interview} isAr={isAr} />}

        {interview.canEvaluate && (
          <Link href={href} onClick={handleEval}
            className="group/cta flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-sm text-white shadow-lg hover:shadow-xl transition-shadow"
            style={{ background: BRAND_GRAD }}>
            <PaperPlaneTilt weight="fill" className="w-5 h-5 transition-transform duration-300 group-hover/cta:translate-x-1 group-hover/cta:-translate-y-1" />
            {t("ابدأ تقييم المقابلة", "Start evaluating")}
          </Link>
        )}

        {interview.evaluationCompleted && interview.evaluation && dec && (
          <div className="rounded-3xl border bg-white dark:bg-[#161b22] overflow-hidden shadow-sm" style={{ borderColor: `${dec.c1}40` }}>
            <div className="relative p-4 flex items-center gap-3 text-white overflow-hidden" style={{ background: dGrad(dec) }}>
              <div className="relative w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shadow-lg flex-shrink-0">
                <DecIcon weight="fill" className="w-8 h-8 text-white" />
              </div>
              <div className="relative flex-1 min-w-0">
                <p className="text-[11px] font-bold text-white/75">{t("نتيجة المقابلة", "Interview result")}</p>
                <p className="text-lg font-black leading-tight">{isAr ? dec.ar : dec.en}</p>
              </div>
              {avgRating !== null && (
                <div className="relative flex items-center gap-1 px-3 py-2 rounded-2xl bg-white/20 border border-white/30 font-black text-base">
                  <Star weight="fill" className="w-4 h-4 text-[#feaf00]" />{avgRating}
                </div>
              )}
            </div>

            <div className="p-4 space-y-4">
              {ratings && (
                <div className="space-y-2">
                  {INTERVIEW_RATING_ROWS.map((r) => {
                    const RIco = r.icon;
                    return (
                      <div key={r.key} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-[#21262d] border border-gray-100 dark:border-[#30363d]">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${dec.c1}1a`, color: dec.c1 }}>
                          <RIco className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-[#8b949e] flex-1 truncate">{isAr ? r.ar : r.en}</span>
                        <ReadOnlyStars value={ratings[r.key] || 0} color={dec.c1} />
                      </div>
                    );
                  })}
                </div>
              )}

              {interview.evaluation.instructorComment && (
                <div className="p-3.5 rounded-2xl border" style={{ background: `${dec.c1}0d`, borderColor: `${dec.c1}30` }}>
                  <p className="text-[10px] font-black mb-1 flex items-center gap-1" style={{ color: dec.c1 }}>
                    <FileText className="w-3.5 h-3.5" />{t("تعليق المُقابِل", "Interviewer comment")}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-[#c9d1d9] leading-relaxed">{interview.evaluation.instructorComment}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                {interview.evaluation.completedAt ? (
                  <span className="text-[11px] text-gray-400 dark:text-[#6e7681] flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />{fmtDate("dateTime", interview.evaluation.completedAt, isAr)}
                  </span>
                ) : <span />}
                <Link href={href} onClick={handleEval}
                  className="inline-flex items-center gap-1.5 text-xs font-black hover:underline" style={{ color: dec.c1 }}>
                  <RefreshCw className="w-3.5 h-3.5" />{t("تعديل التقييم", "Edit evaluation")}
                </Link>
              </div>
            </div>
          </div>
        )}

        {interview.instructorNotes && (
          <div className="bg-[#feaf00]/10 dark:bg-[#feaf00]/5 border border-[#feaf00]/30 dark:border-[#feaf00]/20 rounded-2xl p-4">
            <h4 className="text-xs font-black text-[#f67d00] dark:text-[#feaf00] mb-2 flex items-center gap-1.5">
              <Info className="w-4 h-4" />{t("ملاحظات", "Notes")}
            </h4>
            <p className="text-sm text-[#f67d00]/80 dark:text-[#feaf00]/70 leading-relaxed">{interview.instructorNotes}</p>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// List rows (memo → الصف بيتعمله render بس لو الداتا بتاعته اتغيرت)
// ═══════════════════════════════════════════════════════════════════════════
const RowAvatar = memo(function RowAvatar({ grad, isOffline, children }) {
  return (
    <div className="relative flex-shrink-0">
      <div className="w-[52px] h-[52px] sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-md"
        style={{ background: grad }}>
        {children}
      </div>
      <span className="absolute -bottom-1 -end-1 w-6 h-6 rounded-full bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] flex items-center justify-center shadow-sm">
        {isOffline
          ? <MapPin weight="fill" className="w-3.5 h-3.5 text-[#f67d00]" />
          : <Video weight="fill" className="w-3.5 h-3.5 text-[#004d59] dark:text-teal-400" />}
      </span>
    </div>
  );
});

function RowTail({ cfg, isAr, children }) {
  return (
    <div className="relative flex items-center gap-2 flex-shrink-0">
      {children}
      <span className={`text-[10px] px-2.5 py-1 rounded-full font-black hidden md:flex items-center gap-1 ${cfg.badge}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {isAr ? cfg.labelAr : cfg.labelEn}
      </span>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-[#21262d] group-hover:bg-[#ff6700]/10 transition-colors">
        <ChevronRight className="w-4 h-4 text-gray-300 dark:text-[#6e7681] group-hover:text-[#ff6700] rtl:rotate-180" />
      </div>
    </div>
  );
}

const stop = (e) => e.stopPropagation();

const InterviewRow = memo(function InterviewRow({ interview, onOpen, isAr, onEvaluate }) {
  const t = (ar, en) => (isAr ? ar : en);
  const cfg = STATUS_CFG[interview.status] || STATUS_CFG.scheduled;
  const isCompleted = interview.status === "completed";
  const isToday = interview.isToday && interview.status === "scheduled";
  const dec = interview.evaluation?.decision ? INTERVIEW_DECISIONS[interview.evaluation.decision] : null;
  const DecIcon = dec?.icon;
  const grad = dec ? dGrad(dec) : isToday ? CTA_GRAD : TEAL_GRAD;
  const href = interviewEvalHref(interview);

  return (
    <div onClick={() => onOpen(interview)}
      className={`${ROW_BASE} bg-white dark:bg-[#161b22] ${isToday ? "border-[#ff6700]/50" : "border-gray-100 dark:border-[#30363d]"}`}
      style={dec ? { borderColor: `${dec.c1}40` } : undefined}>
      <div className="absolute top-0 bottom-0 start-0 w-1.5" style={{ background: grad }} />

      <RowAvatar grad={grad} isOffline={interview.isOffline}>
        {isCompleted && !dec ? <CheckCircle weight="fill" className="w-6 h-6" /> : (interview.student?.name?.[0] || "?").toUpperCase()}
      </RowAvatar>

      <div className="relative flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: BRAND_GRAD }}>
            <Briefcase weight="fill" className="w-3 h-3" />{t("مقابلة", "Interview")}
          </span>
          {isToday && (
            <span className="text-[10px] font-black text-[#ff6700] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff6700]" />{t("اليوم", "Today")}
            </span>
          )}
          <span className="text-[10px] font-black text-[#004d59] dark:text-teal-500">
            {interview.isAdult ? t("بالغ", "Adult") : t("طفل", "Kid")}
          </span>
        </div>

        <h3 className="font-black text-sm truncate text-gray-900 dark:text-[#e6edf3] group-hover:text-[#ff6700] transition-colors">
          {interview.student?.name || interview.title}
        </h3>

        <div className="flex items-center gap-2.5 text-xs text-gray-400 dark:text-[#6e7681] flex-wrap mt-0.5">
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{fmtDate("short", interview.scheduledDate, isAr)}</span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fmtTime(interview.startTime, isAr)}</span>
        </div>

        {dec && (
          <span className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-black text-white px-2.5 py-1 rounded-full shadow-sm" style={{ background: grad }}>
            <DecIcon weight="fill" className="w-3.5 h-3.5" />{isAr ? dec.ar : dec.en}
          </span>
        )}
      </div>

      <RowTail cfg={cfg} isAr={isAr}>
        {interview.canEvaluate && (
          <Link href={href} onClick={(e) => onEvaluate(e, href, interview.title)}
            className="group/btn inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black text-white shadow-md hover:shadow-lg transition-shadow"
            style={{ background: BRAND_GRAD }}>
            <PaperPlaneTilt weight="fill" className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
            {t("قيّم", "Evaluate")}
          </Link>
        )}
        {interview.showJoinButton && !interview.isOffline && (
          <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer" onClick={stop}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black text-white shadow-md hover:shadow-lg transition-shadow"
            style={{ background: CTA_GRAD }}>
            <Video weight="fill" className="w-4 h-4" />{t("ابدأ", "Start")}
          </a>
        )}
      </RowTail>
    </div>
  );
});

const SessionRow = memo(function SessionRow({ session, onOpen, isAr, onRequestAccess }) {
  const t = (ar, en) => (isAr ? ar : en);
  const flyToAttendance = useAttendanceFlight();
  const cfg = STATUS_CFG[session.status] || STATUS_CFG.scheduled;
  const isCompleted = session.status === "completed";
  const isEffectivelyToday = session.isEffectivelyToday ?? session.isToday;
  const isToday = isEffectivelyToday && (session.status === "scheduled" || session.status === "cancelled" || session.status === "postponed");
  const sessionIsLocked = !!session.sessionIsLocked;
  const showLockedState = sessionIsLocked && !isCompleted;
  const showJoin = session.showJoinButton && !sessionIsLocked;
  const showAttendance = session.showAttendanceButton && !sessionIsLocked;
  const canOpenPartial = session.canViewPartialDetails;
  const isClickable = session.canViewDetails || canOpenPartial || isCompleted || (isToday && !sessionIsLocked);
  const hasPendingReq = session.pendingReschedule?.status === "pending";
  const attRate = isCompleted ? getAttendanceRate(session) : null;
  const grad = sessionGradient(session, { isToday: isToday && !sessionIsLocked, locked: sessionIsLocked });
  const attendanceHref = `/instructor/attendance?session=${session._id}`;

  const handleClick = () => {
    if ((sessionIsLocked && !isCompleted) || isClickable) onOpen(session);
    else onRequestAccess(session);
  };

  const tone = showLockedState
    ? "border-amber-300/60 dark:border-amber-500/30 bg-amber-50 dark:bg-[#1c1a12]"
    : isToday
      ? "border-[#ff6700]/50 bg-white dark:bg-[#161b22]"
      : isCompleted
        ? "border-emerald-200/60 dark:border-emerald-800/30 bg-white dark:bg-[#161b22]"
        : "border-gray-100 dark:border-[#30363d] bg-white dark:bg-[#161b22]";

  return (
    <div onClick={handleClick}
      className={`${ROW_BASE} ${tone} ${isClickable || sessionIsLocked ? "" : "opacity-75 hover:opacity-100"}`}>
      <div className="absolute top-0 bottom-0 start-0 w-1.5" style={{ background: grad }} />

      <RowAvatar grad={grad} isOffline={session.isOffline}>
        {showLockedState ? <Lock weight="fill" className="w-6 h-6" />
          : isCompleted ? <CheckCircle weight="fill" className="w-6 h-6" />
            : session.status === "cancelled" ? <X className="w-6 h-6" />
              : getSessionNum(session)}
      </RowAvatar>

      <div className="relative flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: BRAND_GRAD }}>
            <BookOpen weight="fill" className="w-3 h-3" />{t("جلسة", "Session")}
          </span>
          {showLockedState && (
            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Lock weight="fill" className="w-3 h-3" />{t("مقفولة", "Locked")}
            </span>
          )}
          {isToday && !sessionIsLocked && (
            <span className="text-[10px] font-black text-[#ff6700] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff6700]" />{t("اليوم", "Today")}
            </span>
          )}
          {!isToday && canOpenPartial && !sessionIsLocked && (
            <span className="text-[10px] font-black text-[#004d59] dark:text-teal-400 flex items-center gap-1">
              <Lock weight="fill" className="w-3 h-3" />{t("معاينة", "Preview")}
            </span>
          )}
          {hasPendingReq && (
            <span className="text-[10px] font-black text-[#f67d00] dark:text-[#feaf00] flex items-center gap-1">
              <Hourglass weight="fill" className="w-3 h-3" />{t("قيد المراجعة", "Pending Review")}
            </span>
          )}
          {session.isComplimentary && (
            <span className="text-[10px] font-black text-[#004d59] dark:text-teal-400 flex items-center gap-1">
              <Gift weight="fill" className="w-3 h-3" />{t("تعويضية", "Make-up")}
            </span>
          )}
        </div>

        <h3 className="font-black text-sm truncate text-gray-900 dark:text-[#e6edf3] group-hover:text-[#ff6700] transition-colors">
          {session.title}
        </h3>

        <div className="flex items-center gap-2.5 text-xs text-gray-400 dark:text-[#6e7681] flex-wrap mt-0.5">
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{fmtDate("short", session.scheduledDate, isAr)}</span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fmtTime(session.startTime, isAr)}</span>
          {session.group?.name && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{session.group.name}</span>}
          <span className="flex items-center gap-1 text-[#004d59] dark:text-teal-600 font-medium">
            <Timer className="w-3.5 h-3.5" />{t("ساعتان", "2h")}
          </span>
        </div>

        {attRate !== null && (
          <span className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-black text-white px-2.5 py-1 rounded-full shadow-sm"
            style={{ background: attRate >= 80 ? "linear-gradient(135deg, #10b981, #14b8a6)" : attRate >= 60 ? "linear-gradient(135deg, #feaf00, #f67d00)" : "linear-gradient(135deg, #f87171, #ef4444)" }}>
            <UserCheck weight="fill" className="w-3.5 h-3.5" />{t("الحضور", "Attendance")} {attRate}%
          </span>
        )}
        {isCompleted && !session.attendanceTaken && (
          <span className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-black px-2.5 py-1 rounded-full bg-[#feaf00]/10 text-[#f67d00] dark:text-[#feaf00] border border-[#feaf00]/30 dark:border-[#feaf00]/20">
            <ClipboardList weight="fill" className="w-3.5 h-3.5" />{t("يحتاج حضور", "Needs Attendance")}
          </span>
        )}
      </div>

      <RowTail cfg={cfg} isAr={isAr}>
        {showAttendance && (
          <Link href={attendanceHref} onClick={(e) => flyToAttendance(e, attendanceHref, session.title)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black text-white shadow-md hover:shadow-lg transition-shadow"
            style={{ background: BRAND_GRAD }}>
            <ClipboardList weight="fill" className="w-4 h-4" />{t("حضور", "Attendance")}
          </Link>
        )}
        {showJoin && !session.isOffline && (
          <a href={session.meetingLink} target="_blank" rel="noopener noreferrer" onClick={stop}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black text-white shadow-md hover:shadow-lg transition-shadow"
            style={{ background: CTA_GRAD }}>
            <Video weight="fill" className="w-4 h-4" />{t("ابدأ", "Start")}
          </a>
        )}
      </RowTail>
    </div>
  );
});

const ItemList = memo(function ItemList({ items, isAr, onOpenSession, onOpenInterview, onRequestAccess, onEvaluate }) {
  return items.map((s) =>
    s.isInterview ? (
      <InterviewRow key={`iv-${s._id}`} interview={s} isAr={isAr} onOpen={onOpenInterview} onEvaluate={onEvaluate} />
    ) : (
      <SessionRow key={s._id} session={s} isAr={isAr} onOpen={onOpenSession} onRequestAccess={onRequestAccess} />
    )
  );
});

const DateHeader = memo(function DateHeader({ dateKey, count, isToday, isAr }) {
  const t = (ar, en) => (isAr ? ar : en);
  const d = new Date(dateKey);
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 shadow-sm border
        ${isToday ? "border-transparent text-white" : "bg-white dark:bg-[#161b22] border-gray-200 dark:border-[#30363d] text-gray-700 dark:text-[#8b949e]"}`}
        style={isToday ? { background: BRAND_GRAD } : undefined}>
        <span className="text-sm font-black leading-none">{d.getDate()}</span>
        <span className="text-[9px] leading-none mt-0.5 opacity-80">{fmtDate("monthShort", d, isAr)}</span>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className={`font-black text-sm ${isToday ? "text-[#ff6700]" : "text-gray-900 dark:text-[#e6edf3]"}`}>
            {isToday ? t("اليوم", "Today") : fmtDate("weekday", d, isAr)}
          </span>
          {isToday && <span className="w-2 h-2 rounded-full bg-[#ff6700]" />}
        </div>
        <span className="text-xs text-gray-400 dark:text-[#6e7681]">
          {fmtDate("monthDay", d, isAr)} · {count} {t("موعد", count === 1 ? "item" : "items")}
        </span>
      </div>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, rgba(0,77,89,0.3), transparent)" }} />
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// Banners + stats
// ═══════════════════════════════════════════════════════════════════════════
function BannerShell({ icon: Icon, children }) {
  return (
    <div className="mb-5 rounded-3xl p-4 text-white relative overflow-hidden shadow-lg"
      style={{ background: "linear-gradient(135deg, #004d59 0%, #004d59dd 40%, #ff6700 100%)" }}>
      <div className="absolute inset-0 opacity-10" style={DOTS_STYLE} />
      <PaperPlane className="absolute -top-2 end-24 w-24 opacity-20 -rotate-12 pointer-events-none" />
      <div className="relative z-10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 border border-white/20">
          <Icon weight="fill" className="w-5 h-5 text-[#feaf00]" />
        </div>
        {children}
      </div>
    </div>
  );
}

const WHITE_BTN = "flex items-center gap-2 bg-white font-black text-xs px-4 py-2.5 rounded-xl hover:bg-orange-50 transition-colors shadow-lg flex-shrink-0 text-[#ff6700]";

const InterviewsBanner = memo(function InterviewsBanner({ list, isAr, onEvaluate, onShow }) {
  const t = (ar, en) => (isAr ? ar : en);
  const single = list.length === 1 ? list[0] : null;
  return (
    <BannerShell icon={Briefcase}>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/60 font-bold">{t("مقابلات", "Interviews")}</p>
        <p className="font-black text-sm truncate">
          {list.length} {t("مقابلة جاهزة للتقييم", list.length === 1 ? "interview ready for evaluation" : "interviews ready for evaluation")}
        </p>
        <p className="text-[11px] text-white/70 truncate mt-0.5">{t("من غير حضور — روح للتقييم على طول", "No attendance — go straight to evaluation")}</p>
      </div>
      {single ? (
        <Link href={interviewEvalHref(single)} onClick={(e) => onEvaluate(e, interviewEvalHref(single), single.title)} className={WHITE_BTN}>
          <PaperPlaneTilt weight="fill" className="w-4 h-4" />{t("قيّم الآن", "Evaluate Now")}
        </Link>
      ) : (
        <button onClick={onShow} className={WHITE_BTN}>{t("عرضها", "Show them")}</button>
      )}
    </BannerShell>
  );
});

const TodayBanner = memo(function TodayBanner({ session, isAr }) {
  const t = (ar, en) => (isAr ? ar : en);
  const flyToAttendance = useAttendanceFlight();
  const attendanceHref = `/instructor/attendance?session=${session._id}`;

  return (
    <BannerShell icon={Zap}>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/60 font-bold">
          {session.isOffline ? t("جلسة اليوم (Offline)", "Today's Session (Offline)") : t("جلسة اليوم جاهزة", "Today's Session Ready")}
        </p>
        <p className="font-black text-sm truncate">{session.title}</p>
        {session.isOffline && session.locationInfo?.placeName && (
          <p className="text-[11px] text-white/70 truncate mt-0.5 flex items-center gap-1">
            <MapPin weight="fill" className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{session.locationInfo.placeName}</span>
          </p>
        )}
      </div>
      {!session.isOffline && session.meetingLink && (
        <a href={session.meetingLink} target="_blank" rel="noopener noreferrer" className={WHITE_BTN}>
          <Video weight="fill" className="w-4 h-4" />{t("ابدأ الآن", "Start Now")}
        </a>
      )}
      {session.isOffline && (
        <Link href={attendanceHref} onClick={(e) => flyToAttendance(e, attendanceHref, session.title)} className={WHITE_BTN}>
          <ClipboardList weight="fill" className="w-4 h-4" />{t("تسجيل الحضور", "Attendance")}
        </Link>
      )}
    </BannerShell>
  );
});

const NeedsAttendanceBanner = memo(function NeedsAttendanceBanner({ count, isAr, onShow }) {
  const t = (ar, en) => (isAr ? ar : en);
  return (
    <div className="mb-5 bg-[#feaf00]/10 dark:bg-[#feaf00]/5 border border-[#feaf00]/30 dark:border-[#feaf00]/20 rounded-3xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#feaf00] to-[#f67d00] flex items-center justify-center flex-shrink-0 shadow-md">
          <ClipboardList weight="fill" className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-black text-[#f67d00] dark:text-[#feaf00]">
            {count} {t("جلسة تحتاج تسجيل حضور", "sessions need attendance recording")}
          </p>
          <p className="text-xs text-[#f67d00]/70 dark:text-[#feaf00]/60 mt-0.5">
            {t("انقر على الجلسة لتسجيل الحضور", "Click on a session to record attendance")}
          </p>
        </div>
        <button onClick={onShow}
          className="text-xs font-black text-[#f67d00] dark:text-[#feaf00] flex-shrink-0 px-3 py-1.5 rounded-lg bg-[#feaf00]/20 dark:bg-[#feaf00]/10 border border-[#feaf00]/30 dark:border-[#feaf00]/20 hover:bg-[#feaf00]/30 transition-colors">
          {t("عرضها", "Show them")}
        </button>
      </div>
    </div>
  );
});

const StatCard = memo(function StatCard({ icon: Icon, value, label, gradient }) {
  return (
    <div className="bg-white dark:bg-[#161b22] rounded-3xl p-4 sm:p-5 border border-gray-100 dark:border-[#30363d]">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0" style={{ background: gradient }}>
          <Icon weight="fill" className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-[#e6edf3]">{value}</p>
          <p className="text-xs text-gray-500 dark:text-[#8b949e] font-medium mt-0.5">{label}</p>
        </div>
      </div>
    </div>
  );
});

const StatsRow = memo(function StatsRow({ stats, isAr }) {
  const t = (ar, en) => (isAr ? ar : en);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
      <StatCard icon={Calendar} value={stats.total ?? 0} label={t("إجمالي الجلسات", "Total Sessions")} gradient={TEAL_GRAD} />
      <StatCard icon={CheckCircle} value={stats.completed ?? 0} label={t("مكتملة", "Completed")} gradient="linear-gradient(135deg, #10b981, #14b8a6)" />
      <StatCard icon={Clock} value={stats.scheduled ?? 0} label={t("مجدولة", "Scheduled")} gradient={CTA_GRAD} />
      <StatCard icon={ClipboardList} value={stats.needsAttendance || 0} label={t("تحتاج حضور", "Need Attendance")} gradient="linear-gradient(135deg, #feaf00, #ff6437)" />
    </div>
  );
});

function Skeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-[84px] bg-white dark:bg-[#161b22] rounded-3xl animate-pulse border border-gray-100 dark:border-[#30363d]"
          style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Toolbar
// ═══════════════════════════════════════════════════════════════════════════
const FilterTabs = memo(function FilterTabs({ tabs, counts, active, onChange, isAr }) {
  return (
    <div className="flex gap-1.5 pb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
      {tabs.map(({ id, ar, en }) => {
        const on = active === id;
        return (
          <button key={id} onClick={() => onChange(id)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black flex-shrink-0 transition-colors
              ${on ? "text-white shadow-md" : "bg-gray-100 dark:bg-[#161b22] text-gray-600 dark:text-[#8b949e] hover:bg-gray-200 dark:hover:bg-[#21262d] border border-gray-200 dark:border-[#30363d]"}`}
            style={on ? { background: BRAND_GRAD } : undefined}>
            {isAr ? ar : en}
            <span className={`text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black
              ${on ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-[#21262d] text-gray-500 dark:text-[#6e7681]"}`}>
              {counts[id]}
            </span>
          </button>
        );
      })}
    </div>
  );
});

const Toolbar = memo(function Toolbar({
  isAr, loading, stats, interviewsCount, search, onSearch, groups, selectedGroup, onGroup,
  groupByDate, onGroupByDate, onRefresh, tabs, counts, filter, onFilter,
}) {
  const t = (ar, en) => (isAr ? ar : en);
  const toggleOn = "bg-white dark:bg-[#21262d] shadow text-[#ff6700]";
  const toggleOff = "text-gray-400 hover:text-gray-600";

  return (
    <div className="sticky top-0 z-20 bg-white dark:bg-[#0d1117] border-b border-gray-200/80 dark:border-[#21262d]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md flex-shrink-0" style={{ background: BRAND_GRAD }}>
              <Calendar weight="fill" className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black text-gray-900 dark:text-[#e6edf3] leading-none">{t("جلساتي", "My Sessions")}</h1>
              {!loading && stats && (
                <p className="text-xs text-gray-400 dark:text-[#6e7681] mt-0.5">
                  {stats.completed} {t("مكتملة", "completed")} · {stats.scheduled} {t("مجدولة", "scheduled")} · {stats.total} {t("إجمالي", "total")}
                  {interviewsCount > 0 && <> · {interviewsCount} {t("مقابلة", interviewsCount === 1 ? "interview" : "interviews")}</>}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className={`absolute ${isAr ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
              <input value={search} onChange={onSearch} placeholder={t("بحث...", "Search...")}
                className={`w-44 bg-gray-100 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl ${isAr ? "pr-9 pl-4" : "pl-9 pr-4"} py-2 text-sm text-gray-900 dark:text-[#e6edf3] placeholder:text-gray-400 focus:outline-none focus:border-[#ff6700]/50 transition-colors`} />
            </div>

            {groups.length > 1 && (
              <select value={selectedGroup} onChange={onGroup}
                className="hidden sm:block bg-gray-100 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-[#8b949e] focus:outline-none">
                <option value="all">{t("كل المجموعات", "All Groups")}</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            )}

            <div className="flex bg-gray-100 dark:bg-[#161b22] rounded-xl p-1 gap-0.5 border border-gray-200 dark:border-[#30363d]">
              <button onClick={() => onGroupByDate(true)} className={`p-1.5 rounded-lg transition-colors ${groupByDate ? toggleOn : toggleOff}`}>
                <CalendarDays className="w-4 h-4" />
              </button>
              <button onClick={() => onGroupByDate(false)} className={`p-1.5 rounded-lg transition-colors ${!groupByDate ? toggleOn : toggleOff}`}>
                <ListFilter className="w-4 h-4" />
              </button>
            </div>

            <button onClick={onRefresh}
              className="p-2 rounded-xl bg-gray-100 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] text-gray-500 hover:text-[#ff6700] hover:border-[#ff6700]/30 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <FilterTabs tabs={tabs} counts={counts} active={filter} onChange={onFilter} isAr={isAr} />
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// Evaluation transition overlay (one-shot، من غير blur ولا infinite animations)
// ═══════════════════════════════════════════════════════════════════════════
const OVERLAY_KEYFRAMES = `
@keyframes evalExpand { from { clip-path: circle(0px at var(--x) var(--y)); } to { clip-path: circle(150vmax at var(--x) var(--y)); } }
@keyframes sheetFold {
  0%   { transform: scale(0) rotate(-24deg); opacity: 0; }
  30%  { transform: scale(1.12) rotate(7deg); opacity: 1; }
  55%  { transform: scale(1) rotate(-3deg); opacity: 1; }
  85%  { transform: scale(.35, .6) rotate(28deg) skewX(-18deg); opacity: .9; }
  100% { transform: scale(.05) rotate(40deg); opacity: 0; }
}
@keyframes evalTextIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes evalTextOut { to { opacity: 0; transform: translateY(-10px); } }`;

const PageTransitionOverlay = memo(function PageTransitionOverlay({ data, isAr }) {
  if (!data) return null;
  const { x, y, w, h, kind } = data;
  const meta = TRANSITION_META[kind] || TRANSITION_META.eval;
  const MetaIcon = meta.icon;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden" dir={isAr ? "rtl" : "ltr"}>
      <FlightStyles />
      <style>{OVERLAY_KEYFRAMES}</style>

      <div className="absolute inset-0 overflow-hidden"
        style={{
          "--x": `${x}px`, "--y": `${y}px`,
          background: "linear-gradient(135deg, #004d59 0%, #004d59dd 35%, #ff6700 100%)",
          animation: "evalExpand .7s cubic-bezier(.7,0,.2,1) forwards",
        }}>
        <div className="absolute inset-0 opacity-10" style={DOTS_STYLE} />
      </div>

      <div className="absolute rounded-xl bg-white shadow-2xl overflow-hidden"
        style={{
          left: x, top: y, width: 70, height: 90, marginLeft: -35, marginTop: -45,
          animation: "sheetFold 1s .15s both cubic-bezier(.3,.7,.3,1)",
        }}>
        <div className="p-3 space-y-1.5 pt-5">
          <div className="h-1.5 rounded-full bg-[#004d59]/80 w-4/5" />
          <div className="h-1.5 rounded-full bg-gray-200 w-full" />
          <div className="h-1.5 rounded-full bg-gray-200 w-3/5" />
          <div className="h-1.5 rounded-full bg-[#ff6700]/70 w-2/5" />
        </div>
      </div>

      <PaperPlaneFlight w={w} h={h} startX={x} startY={y} delay={0.85} duration={1.15} size={Math.min(170, w * 0.4)} />

      <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-6 text-center pointer-events-none"
        style={{ animation: "evalTextOut .35s 1.7s both" }}>
        <div className="w-20 h-20 rounded-3xl bg-white/15 border border-white/25 flex items-center justify-center shadow-2xl mb-5"
          style={{ animation: "evalTextIn .5s .5s both" }}>
          <MetaIcon weight="fill" className="w-10 h-10 text-[#feaf00]" />
        </div>
        <h3 className="text-2xl font-black mb-1.5" style={{ animation: "evalTextIn .5s .6s both" }}>
          {isAr ? meta.ar : meta.en}
        </h3>
        <p className="text-sm text-white/75 font-medium" style={{ animation: "evalTextIn .5s .75s both" }}>{data.title}</p>
      </div>
    </div>
  );
});

export default function InstructorSessionsPage() {
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const t = (ar, en) => (isAr ? ar : en);
  const router = useRouter();

  // ref للغة → تغيير اللغة مبقاش بيعمل re-fetch
  const isArRef = useRef(isAr);
  isArRef.current = isAr;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState(EMPTY_LIST);
  const [interviews, setInterviews] = useState(EMPTY_LIST);
  const [stats, setStats] = useState(null);
  const [user, setUser] = useState(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [interviewModal, setInterviewModal] = useState(null);
  const [requestAccessSession, setRequestAccessSession] = useState(null);
  const [transition, setTransition] = useState(null);

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [groupByDate, setGroupByDate] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState("all");

  // البحث بيتأجل → الكتابة سلسة حتى لو القائمة كبيرة
  const deferredSearch = useDeferredValue(search);
  const today = useMemo(() => fmtDateKey(new Date()), []);

  // ── Data ───────────────────────────────────────────────────────────────────
  const load = useCallback(async (silent = false) => {
    try {
      if (silent) setRefreshing(true); else setLoading(true);
      setError("");

      const [sessRes, dashRes] = await Promise.all([
        fetchJson("/api/instructor/sessions"),
        fetchJson("/api/instructor/dashboard").catch(() => null),
      ]);

      if (sessRes.success) {
        setSessions(sessRes.data.sessions || EMPTY_LIST);
        setInterviews(sessRes.data.interviews || EMPTY_LIST);
        setStats(sessRes.data.stats || null);
      } else {
        setError(sessRes.message || (isArRef.current ? "حدث خطأ" : "Something went wrong"));
      }
      if (dashRes?.success) setUser(dashRes.data.user);
    } catch {
      setError(isArRef.current ? "فشل تحميل البيانات" : "Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => load(true), [load]);
  const reload = useCallback(() => load(), [load]);

  // ── Derived data (كله memoized) ────────────────────────────────────────────
  // الـ dateKey والـ timestamp بيتحسبوا مرة واحدة هنا بدل ما يتحسبوا في كل filter/sort
  const items = useMemo(
    () => [...sessions, ...interviews].map((s) => ({
      ...s,
      _dk: fmtDateKey(s.scheduledDate),
      _ts: new Date(s.scheduledDate).getTime(),
    })),
    [sessions, interviews]
  );

  const groups = useMemo(() => {
    const map = new Map();
    for (const s of sessions) if (s.group?._id) map.set(s.group._id, s.group.name);
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [sessions]);

  // كل الـ counts في loop واحد بدل 8 filter() منفصلة
  const counts = useMemo(() => {
    const c = Object.fromEntries(FILTER_DEFS.map((f) => [f.id, 0]));
    for (const s of items) {
      for (const f of FILTER_DEFS) if (f.test(s, today)) c[f.id]++;
    }
    return c;
  }, [items, today]);

  const hasInterviews = interviews.length > 0;
  const tabs = useMemo(() => FILTER_DEFS.filter((f) => !f.interviewOnly || hasInterviews), [hasInterviews]);

  const { byDate, sortedDates, sorted } = useMemo(() => {
    const test = (FILTER_BY_ID[filter] || FILTER_BY_ID.all).test;
    const q = deferredSearch.trim().toLowerCase();

    const filtered = items.filter((s) => {
      if (!test(s, today)) return false;
      // المقابلات مش تبع جروب — بتتخفي لو المدرس فلتر على جروب معين
      if (selectedGroup !== "all" && (s.isInterview || s.group?._id !== selectedGroup)) return false;
      if (!q) return true;
      return (
        s.title?.toLowerCase().includes(q) ||
        s.group?.name?.toLowerCase().includes(q) ||
        s.student?.name?.toLowerCase().includes(q)
      );
    });

    filtered.sort((a, b) => {
      const as = a.status === "scheduled";
      const bs = b.status === "scheduled";
      return as !== bs ? (as ? -1 : 1) : a._ts - b._ts;
    });

    const byDate = {};
    for (const s of filtered) (byDate[s._dk] ||= []).push(s);
    return { byDate, sortedDates: Object.keys(byDate).sort(), sorted: filtered };
  }, [items, filter, selectedGroup, deferredSearch, today]);

  const interviewsNeedEval = useMemo(() => interviews.filter((i) => i.canEvaluate), [interviews]);
  const todayJoinable = useMemo(
    () => sessions.find((s) => (s.showJoinButton || s.showAttendanceButton) && !s.sessionIsLocked) || null,
    [sessions]
  );
  const { lockedCount, totalActive } = useMemo(() => {
    let locked = 0;
    let active = 0;
    for (const s of sessions) {
      if (s.status === "completed") continue;
      active++;
      if (s.sessionIsLocked) locked++;
    }
    return { lockedCount: locked, totalActive: active };
  }, [sessions]);

  // ── Page transition (الطيارة) — للتقييم والحضور ────────────────────────────
  const flightBusyRef = useRef(false);
  const flightTimerRef = useRef();
  useEffect(() => () => clearTimeout(flightTimerRef.current), []);

  // لو المدرس رجع بالـ back والصفحة جت من الـ bfcache → نقفل الغطا ونفتح القفل
  useEffect(() => {
    const onPageShow = (e) => {
      if (!e.persisted) return;
      clearTimeout(flightTimerRef.current);
      flightBusyRef.current = false;
      setTransition(null);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const startPageTransition = useCallback((e, href, title = "", kind = "eval") => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (flightBusyRef.current) return;
    flightBusyRef.current = true;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const hasPoint = e && (e.clientX || e.clientY);
    try { router.prefetch(href); } catch { }
    setTransition({ x: hasPoint ? e.clientX : w / 2, y: hasPoint ? e.clientY : h / 2, w, h, href, title, kind });
    flightTimerRef.current = setTimeout(() => router.push(href), EVAL_TRANSITION_MS);
  }, [router]);

  const startEvalTransition = useCallback(
    (e, href, title) => startPageTransition(e, href, title, "eval"),
    [startPageTransition]
  );
  const startAttendanceTransition = useCallback(
    (e, href, title) => startPageTransition(e, href, title, "attendance"),
    [startPageTransition]
  );

  // ── Stable handlers ────────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("token");
    router.push("/");
  }, [router]);

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const closeModal = useCallback(() => setModal(null), []);
  const closeInterviewModal = useCallback(() => setInterviewModal(null), []);
  const closeRequestAccess = useCallback(() => setRequestAccessSession(null), []);
  const handleSearch = useCallback((e) => setSearch(e.target.value), []);
  const handleGroup = useCallback((e) => setSelectedGroup(e.target.value), []);
  const showNeedsAtt = useCallback(() => setFilter("needs_att"), []);
  const showNeedsEval = useCallback(() => setFilter("needs_eval"), []);
  const handleRequestAccessFromModal = useCallback((session) => {
    setModal(null);
    setRequestAccessSession(session);
  }, []);

  const currentUser = user || { name: t("مدرس", "Instructor"), email: "", role: "instructor" };
  const showBanners = filter === "all" && !loading;

  const listProps = {
    isAr,
    onOpenSession: setModal,
    onOpenInterview: setInterviewModal,
    onRequestAccess: setRequestAccessSession,
    onEvaluate: startEvalTransition,
  };

  return (
    <AttendanceFlightContext.Provider value={startAttendanceTransition}>
      <div className="min-h-screen bg-[#f8f9fb] dark:bg-[#0a0f17] flex" dir={isAr ? "rtl" : "ltr"}>
        {refreshing && (
          <div className={`fixed top-4 ${isAr ? "left-4" : "right-4"} z-50 text-white ps-3 pe-4 py-2 rounded-xl shadow-xl flex items-center gap-1`}
            style={{ background: BRAND_GRAD }}>
            <PaperPlaneLoader inline tone="light" size={18} />
            <span className="text-sm font-bold">{t("جاري التحديث...", "Refreshing...")}</span>
          </div>
        )}

        {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={closeSidebar} />}

        <div className={`fixed lg:static inset-y-0 ${isAr ? "right-0" : "left-0"} z-50 transform transition-transform duration-300 flex-shrink-0
          ${sidebarOpen ? "translate-x-0" : (isAr ? "translate-x-full" : "-translate-x-full") + " lg:translate-x-0"}`}>
          <InstructorSidebar user={currentUser} onLogout={handleLogout} />
        </div>

        <main className="flex-1 min-w-0 flex flex-col">
          <InstructorHeader
            user={currentUser}
            notifications={EMPTY_LIST}
            onMenuClick={toggleSidebar}
            sidebarOpen={sidebarOpen}
            onRefresh={refresh}
          />

          <Toolbar
            isAr={isAr} loading={loading} stats={stats} interviewsCount={interviews.length}
            search={search} onSearch={handleSearch}
            groups={groups} selectedGroup={selectedGroup} onGroup={handleGroup}
            groupByDate={groupByDate} onGroupByDate={setGroupByDate}
            onRefresh={refresh} tabs={tabs} counts={counts} filter={filter} onFilter={setFilter}
          />

          <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
            {!loading && stats && <StatsRow stats={stats} isAr={isAr} />}

            {showBanners && lockedCount > 0 && <HoldBanner isAr={isAr} lockedCount={lockedCount} totalActive={totalActive} />}
            {showBanners && interviewsNeedEval.length > 0 && (
              <InterviewsBanner list={interviewsNeedEval} isAr={isAr} onEvaluate={startEvalTransition} onShow={showNeedsEval} />
            )}
            {showBanners && todayJoinable && <TodayBanner session={todayJoinable} isAr={isAr} />}
            {showBanners && counts.needs_att > 0 && (
              <NeedsAttendanceBanner count={counts.needs_att} isAr={isAr} onShow={showNeedsAtt} />
            )}

            {loading && <Skeleton />}

            {!loading && error && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-3xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4 border border-red-200 dark:border-red-800/30">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-gray-500 mb-4">{error}</p>
                <GradientButton onClick={reload}>{t("إعادة المحاولة", "Try Again")}</GradientButton>
              </div>
            )}

            {!loading && !error && sorted.length === 0 && (
              <div className="text-center py-20">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-gray-100 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] flex items-center justify-center mb-4">
                  <Calendar className="w-10 h-10 text-gray-300 dark:text-[#6e7681]" />
                </div>
                <p className="text-gray-500 dark:text-[#8b949e] font-bold">
                  {t("لا توجد جلسات في هذا الفلتر", "No sessions found for this filter")}
                </p>
              </div>
            )}

            {!loading && !error && sorted.length > 0 && (
              groupByDate ? (
                <div className="space-y-7">
                  {sortedDates.map((dk) => (
                    <div key={dk}>
                      <DateHeader dateKey={dk} count={byDate[dk].length} isToday={dk === today} isAr={isAr} />
                      <div className="space-y-2.5" style={isAr ? LIST_PAD_RTL : LIST_PAD_LTR}>
                        <ItemList items={byDate[dk]} {...listProps} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  <ItemList items={sorted} {...listProps} />
                </div>
              )
            )}
          </div>
        </main>

        {modal && (
          <SessionModal session={modal} onClose={closeModal} onRequestAccess={handleRequestAccessFromModal} isAr={isAr} />
        )}
        {interviewModal && (
          <InterviewModal interview={interviewModal} onClose={closeInterviewModal} onEvaluate={startEvalTransition} isAr={isAr} />
        )}
        {requestAccessSession && (
          <RequestAccessModal session={requestAccessSession} onClose={closeRequestAccess} onSubmitted={refresh} isAr={isAr} />
        )}
        <PageTransitionOverlay data={transition} isAr={isAr} />
      </div>
    </AttendanceFlightContext.Provider>
  );
}