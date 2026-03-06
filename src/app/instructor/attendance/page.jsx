"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle2, X, Clock, AlertCircle, UserCheck, UserX,
  Send, Eye, ChevronRight, ChevronLeft, Loader2,
  MessageSquare, Users, Calendar, CheckCheck,
  ClipboardList, Zap, ArrowLeft, RefreshCw, Info,
  Phone, User, CreditCard, AlertTriangle, MessageCircle,
  BookOpen, ShieldCheck, Hash, Globe, Sparkles, TrendingUp,
  BarChart3, Bell, Star
} from "lucide-react";
import { useLocale } from "@/app/context/LocaleContext";

// ─── Status Config ──────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  present: {
    labelAr: "حاضر",
    labelEn: "Present",
    icon: CheckCircle2,
    color: "emerald",
    bg: "bg-emerald-500",
    gradient: "from-emerald-400 to-teal-500",
    lightBg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-400 dark:border-emerald-600",
    text: "text-emerald-700 dark:text-emerald-400",
    ring: "ring-emerald-400",
    deductCredits: true,
    sendMessage: false,
  },
  absent: {
    labelAr: "غائب",
    labelEn: "Absent",
    icon: UserX,
    color: "red",
    bg: "bg-red-500",
    gradient: "from-red-400 to-rose-500",
    lightBg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-400 dark:border-red-600",
    text: "text-red-700 dark:text-red-400",
    ring: "ring-red-400",
    deductCredits: false,
    sendMessage: true,
  },
  late: {
    labelAr: "متأخر",
    labelEn: "Late",
    icon: Clock,
    color: "amber",
    bg: "bg-amber-500",
    gradient: "from-amber-400 to-orange-500",
    lightBg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-400 dark:border-amber-600",
    text: "text-amber-700 dark:text-amber-400",
    ring: "ring-amber-400",
    deductCredits: true,
    sendMessage: true,
  },
  excused: {
    labelAr: "معذور",
    labelEn: "Excused",
    icon: ShieldCheck,
    color: "blue",
    bg: "bg-blue-500",
    gradient: "from-blue-400 to-indigo-500",
    lightBg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-400 dark:border-blue-600",
    text: "text-blue-700 dark:text-blue-400",
    ring: "ring-blue-400",
    deductCredits: false,
    sendMessage: true,
  },
};

const STATUS_ORDER = ["present", "absent", "late", "excused"];
const SEND_STATUSES = ["absent", "late", "excused"];

// ─── Helpers ────────────────────────────────────────────────────────────────
const t = (ar, en, isAr) => (isAr ? ar : en);

function fmtDate(d, isAr) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function fmtTime(time, isAr) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? (isAr ? "م" : "PM") : (isAr ? "ص" : "AM");
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
}

// ─── Animated Counter ────────────────────────────────────────────────────────
const AnimatedCounter = ({ value, duration = 800 }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime;
    let frame;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * value));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return <span>{count}</span>;
};

// ─── Message Preview Modal ───────────────────────────────────────────────────
function MessagePreviewModal({ student, attendanceStatus, sessionId, isAr, onClose, onConfirm }) {
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/instructor/sessions/${sessionId}/attendance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ attendanceStatus, studentId: student._id }),
        });
        const data = await res.json();
        if (data.success) {
          setTemplate(data.data);
        } else {
          setError(data.error || t("فشل تحميل القالب", "Failed to load template", isAr));
        }
      } catch {
        setError(t("خطأ في الاتصال", "Connection error", isAr));
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [student._id, attendanceStatus, sessionId]);

  const cfg = STATUS_CONFIG[attendanceStatus];
  const lang = template?.metadata?.language || "ar";

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" dir={isAr ? "rtl" : "ltr"}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg max-h-[90vh] bg-white dark:bg-[#161b22] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header — gradient matching dashboard style */}
        <div className={`relative bg-gradient-to-br ${cfg.gradient} p-5 overflow-hidden flex-shrink-0`}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center flex-shrink-0 shadow-lg">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white">
                {t("معاينة الرسالة", "Message Preview", isAr)}
              </p>
              <p className="text-xs text-white/70 truncate">
                {student.name} · {t(cfg.labelAr, cfg.labelEn, isAr)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 text-white border border-white/20">
                {lang === "ar" ? "🇸🇦 عربي" : "🇬🇧 English"}
              </span>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
                <Loader2 className="w-7 h-7 text-white animate-spin" />
              </div>
              <p className="text-sm text-gray-400 dark:text-[#8b949e]">{t("جاري تحميل القالب...", "Loading template...", isAr)}</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800/40">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {!loading && !error && template?.guardian?.content && (
            <>
              <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 dark:bg-[#21262d] rounded-xl border border-gray-100 dark:border-[#30363d]">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shadow-sm">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-700 dark:text-[#c9d1d9]">
                    {t("إلى: ولي الأمر", "To: Guardian", isAr)}
                  </p>
                  {student.guardianPhone && (
                    <p className="text-xs text-gray-400 dark:text-[#6e7681] flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" /> {student.guardianPhone}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-[#dcf8c6] dark:bg-[#1a3a2a] rounded-2xl rounded-tl-sm p-4 shadow-sm border border-[#c5e8a3] dark:border-[#2d5a3d]">
                <p className="text-[13px] text-gray-800 dark:text-[#d1fae5] leading-relaxed whitespace-pre-wrap font-medium" dir={lang === "ar" ? "rtl" : "ltr"}>
                  {template.guardian.content}
                </p>
                <div className="flex items-center justify-end gap-1 mt-2 opacity-60">
                  <span className="text-[10px] text-gray-500 dark:text-[#6b7280]">WhatsApp</span>
                  <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                </div>
              </div>

              {template.guardian.isFallback && (
                <div className="flex items-center gap-2 mt-3 p-2.5 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800/30">
                  <Info className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    {t("قالب افتراضي (لم يُضبط قالب خاص في الداتابيز)", "Default template (no custom template in DB)", isAr)}
                  </p>
                </div>
              )}
            </>
          )}

          {!loading && !error && !template?.guardian?.content && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-[#21262d] rounded-2xl flex items-center justify-center mb-3">
                <MessageSquare className="w-8 h-8 text-gray-300 dark:text-[#6e7681]" />
              </div>
              <p className="text-sm text-gray-400">{t("لا توجد رسالة لهذا الطالب", "No message for this student", isAr)}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-gray-100 dark:border-[#30363d]">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-bold bg-gray-100 dark:bg-[#21262d] text-gray-700 dark:text-[#8b949e] hover:bg-gray-200 dark:hover:bg-[#30363d] transition-all">
            {t("إلغاء", "Cancel", isAr)}
          </button>
          <button
            onClick={() => onConfirm(student._id, attendanceStatus)}
            disabled={loading}
            className={`flex-1 py-3 rounded-xl text-sm font-black text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r ${cfg.gradient}`}>
            <Send className="w-4 h-4" />
            {t("تأكيد وإرسال", "Confirm & Send", isAr)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Student Card ────────────────────────────────────────────────────────────
function StudentCard({ student, attendance, onSetStatus, onPreview, isAr, submitting }) {
  const currentStatus = attendance[student._id] || null;
  const cfg = currentStatus ? STATUS_CONFIG[currentStatus] : null;
  const isSet = !!currentStatus;

  return (
    <div className={`group/card relative bg-white dark:bg-[#161b22] rounded-2xl border transition-all duration-300 overflow-hidden hover:shadow-xl hover:-translate-y-0.5
      ${isSet
        ? `${cfg.border} shadow-lg`
        : "border-gray-100 dark:border-[#30363d] hover:border-gray-200 dark:hover:border-[#3d444d] shadow-sm"}`}>

      {/* Top accent bar — gradient like dashboard cards */}
      {isSet && (
        <div className={`h-1 w-full bg-gradient-to-r ${cfg.gradient}`} />
      )}

      {/* Hover glow effect */}
      {isSet && (
        <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover/card:opacity-5 transition-opacity duration-300 pointer-events-none ${cfg.gradient}`} />
      )}

      <div className="p-4">
        {/* Student info row */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-base flex-shrink-0 shadow-md transition-transform duration-300 group-hover/card:scale-110
            ${isSet
              ? `bg-gradient-to-br ${cfg.gradient} text-white`
              : "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-[#21262d] dark:to-[#30363d] text-gray-500 dark:text-[#8b949e]"}`}>
            {isSet
              ? React.createElement(cfg.icon, { className: "w-5 h-5" })
              : (student.name?.[0] || "?").toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-gray-900 dark:text-[#e6edf3] truncate mb-1.5">{student.name}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {student.credits !== undefined && (
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border
                  ${student.credits <= 2
                    ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40"
                    : student.credits <= 5
                      ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40"
                      : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40"}`}>
                  <CreditCard className="w-3 h-3" />
                  {student.credits} {t("ساعة", "hrs", isAr)}
                </span>
              )}
              {student.absenceCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-xs text-red-500 dark:text-red-400 font-medium border border-red-100 dark:border-red-800/30">
                  <AlertTriangle className="w-3 h-3" />
                  {student.absenceCount}x {t("غياب", "absent", isAr)}
                </span>
              )}
            </div>
          </div>

          {isSet && (
            <span className={`text-[10px] font-black px-2.5 py-1.5 rounded-xl flex-shrink-0 ${cfg.lightBg} ${cfg.text} border ${cfg.border}`}>
              {t(cfg.labelAr, cfg.labelEn, isAr)}
            </span>
          )}
        </div>

        {/* Status buttons — styled like dashboard action buttons */}
        <div className="grid grid-cols-4 gap-2">
          {STATUS_ORDER.map((status) => {
            const c = STATUS_CONFIG[status];
            const Icon = c.icon;
            const isActive = currentStatus === status;
            return (
              <button
                key={status}
                disabled={submitting}
                onClick={() => onSetStatus(student._id, status)}
                className={`relative flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl text-[10px] font-bold transition-all duration-200 disabled:opacity-50 overflow-hidden
                  ${isActive
                    ? `bg-gradient-to-br ${c.gradient} text-white shadow-lg scale-[0.97]`
                    : `bg-gray-50 dark:bg-[#21262d] ${c.text} hover:shadow-md border border-gray-100 dark:border-[#30363d] hover:border-opacity-60 hover:-translate-y-0.5`}`}>
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-10 animate-shimmer" />
                )}
                <Icon className="w-4 h-4" />
                <span>{t(c.labelAr, c.labelEn, isAr)}</span>
              </button>
            );
          })}
        </div>

        {/* Preview message button */}
        {isSet && SEND_STATUSES.includes(currentStatus) && (
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(student, currentStatus); }}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-gray-50 dark:bg-[#21262d] text-gray-600 dark:text-[#8b949e] border border-gray-100 dark:border-[#30363d] hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all group/preview">
            <Eye className="w-3.5 h-3.5 group-hover/preview:scale-110 transition-transform" />
            {t("معاينة رسالة ولي الأمر", "Preview Parent Message", isAr)}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Summary Bar ─────────────────────────────────────────────────────────────
function SummaryBar({ attendance, total, isAr, animateProgress }) {
  const counts = { present: 0, absent: 0, late: 0, excused: 0 };
  Object.values(attendance).forEach((s) => { if (counts[s] !== undefined) counts[s]++; });
  const filled = Object.values(counts).reduce((a, b) => a + b, 0);
  const pct = total > 0 ? (filled / total) * 100 : 0;

  const statItems = [
    { key: "present", grad: "from-emerald-400 to-teal-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800/40", icon: CheckCircle2 },
    { key: "absent",  grad: "from-red-400 to-rose-500",    bg: "bg-red-50 dark:bg-red-900/20",          text: "text-red-600 dark:text-red-400",          border: "border-red-200 dark:border-red-800/40",     icon: UserX },
    { key: "late",    grad: "from-amber-400 to-orange-500", bg: "bg-amber-50 dark:bg-amber-900/20",     text: "text-amber-600 dark:text-amber-400",      border: "border-amber-200 dark:border-amber-800/40", icon: Clock },
    { key: "excused", grad: "from-blue-400 to-indigo-500", bg: "bg-blue-50 dark:bg-blue-900/20",        text: "text-blue-600 dark:text-blue-400",        border: "border-blue-200 dark:border-blue-800/40",   icon: ShieldCheck },
  ];

  return (
    <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] p-5 shadow-lg dark:shadow-black/40">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-md">
            <BarChart3 className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-[#e6edf3]">{t("ملخص الحضور", "Attendance Summary", isAr)}</p>
            <p className="text-xs text-gray-500 dark:text-[#8b949e]">{filled}/{total} {t("طالب", "students", isAr)}</p>
          </div>
        </div>
        <div className={`text-xl font-black ${filled === total && total > 0 ? "text-emerald-500" : "text-primary"}`}>
          {filled === total && total > 0
            ? <span className="flex items-center gap-1 text-sm"><CheckCheck className="w-4 h-4" />{t("مكتمل", "Complete", isAr)}</span>
            : `${Math.round(pct)}%`
          }
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 w-full bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-gradient-to-r from-primary to-purple-600 rounded-full relative overflow-hidden transition-all duration-700"
          style={{ width: `${pct}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
        </div>
      </div>

      {/* Stat cards — same pattern as dashboard stats */}
      <div className="grid grid-cols-4 gap-3">
        {statItems.map(({ key, grad, bg, text, border, icon: Icon }, idx) => (
          <div
            key={key}
            className={`group/stat relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-500 hover:shadow-md hover:-translate-y-0.5
              ${animateProgress ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
              ${bg} ${border}`}
            style={{ transitionDelay: `${idx * 80}ms` }}
          >
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${grad} flex items-center justify-center shadow-sm group-hover/stat:scale-110 transition-transform`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <span className={`text-2xl font-black ${text}`}>{counts[key]}</span>
            <span className={`text-[9px] font-bold ${text} opacity-80`}>
              {t(STATUS_CONFIG[key].labelAr, STATUS_CONFIG[key].labelEn, isAr)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="h-44 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse border border-gray-100 dark:border-[#30363d]" />
      <div className="h-16 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse border border-gray-100 dark:border-[#30363d]" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-36 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse border border-gray-100 dark:border-[#30363d]" />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function InstructorAttendancePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session");
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [previewModal, setPreviewModal] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [animateProgress, setAnimateProgress] = useState(false);

  const savedStatusRef = useRef({});

  const fetchData = useCallback(async () => {
    if (!sessionId) {
      setError(t("لا يوجد session محدد", "No session specified", isAr));
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/instructor/sessions/${sessionId}/attendance`, {
        credentials: "include",
      });
      const data = await res.json();

      if (data.success) {
        setSessionData(data.data.session);
        setStudents(data.data.students || []);
        const existing = {};
        (data.data.students || []).forEach((s) => {
          if (s.currentStatus) existing[s._id] = s.currentStatus;
        });
        savedStatusRef.current = { ...existing };
        setAttendance(existing);
        setTimeout(() => setAnimateProgress(true), 300);
      } else {
        setError(data.message || t("فشل تحميل البيانات", "Failed to load data", isAr));
      }
    } catch {
      setError(t("خطأ في الاتصال بالسيرفر", "Server connection error", isAr));
    } finally {
      setLoading(false);
    }
  }, [sessionId, isAr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSetStatus = useCallback((studentId, status) => {
    setAttendance((prev) => {
      if (prev[studentId] === status) {
        const next = { ...prev };
        delete next[studentId];
        return next;
      }
      return { ...prev, [studentId]: status };
    });
  }, []);

  const handlePreview = useCallback((student, status) => {
    setPreviewModal({ student, status });
  }, []);

  const handleConfirmSingle = useCallback(async (studentId, status) => {
    setPreviewModal(null);
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  }, []);

  const handleSubmit = async () => {
    if (Object.keys(attendance).length === 0) return;
    try {
      setSubmitting(true);
      const records = Object.entries(attendance)
        .filter(([studentId, status]) => {
          const savedStatus = savedStatusRef.current[studentId] || null;
          return savedStatus !== status;
        })
        .map(([studentId, status]) => ({ studentId, status }));

      if (records.length === 0) {
        setSuccess(true);
        setTimeout(() => router.push(`/instructor/evaluation?session=${sessionId}`), 2000);
        return;
      }

      const res = await fetch(`/api/instructor/sessions/${sessionId}/attendance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ attendanceRecords: records }),
      });
      const data = await res.json();

      if (data.success) {
        savedStatusRef.current = { ...attendance };
        setSuccess(true);
        setTimeout(() => router.push(`/instructor/evaluation?session=${sessionId}`), 2000);
      } else {
        setError(data.error || t("فشل حفظ الحضور", "Failed to save attendance", isAr));
      }
    } catch {
      setError(t("خطأ في الاتصال", "Connection error", isAr));
    } finally {
      setSubmitting(false);
    }
  };

  const markAll = (status) => {
    const next = {};
    students.forEach((s) => { next[s._id] = status; });
    setAttendance(next);
  };

  const filteredStudents = students.filter((s) => {
    const matchSearch = !search || s.name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filterStatus === "all" ||
      attendance[s._id] === filterStatus ||
      (filterStatus === "unset" && !attendance[s._id]);
    return matchSearch && matchFilter;
  });

  const changedCount = Object.entries(attendance).filter(
    ([studentId, status]) => (savedStatusRef.current[studentId] || null) !== status
  ).length;

  const filledCount = Object.keys(attendance).length;
  const allFilled = filledCount === students.length && students.length > 0;

  // ── No session id ──
  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22]" dir="rtl">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-10 h-10 text-red-500 animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-[#e6edf3] mb-2">لم يتم تحديد جلسة</h3>
          <button onClick={() => router.push("/instructor/sessions")}
            className="mt-2 px-6 py-3 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105">
            العودة للجلسات
          </button>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22]" dir={isAr ? "rtl" : "ltr"}>
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full opacity-20 blur-xl animate-pulse" />
            <div className="relative w-24 h-24 mx-auto bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-2xl">
              <CheckCheck className="w-12 h-12 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-[#e6edf3] mb-2">
            {t("تم حفظ الحضور!", "Attendance Saved!", isAr)}
          </h2>
          <p className="text-sm text-gray-400 dark:text-[#8b949e]">
            {t("جاري التحويل...", "Redirecting...", isAr)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22]" dir={isAr ? "rtl" : "ltr"}>

      {/* ── Sticky Header — same style as dashboard header ── */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md border-b border-gray-200 dark:border-[#30363d] shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/instructor/sessions")}
              className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#21262d] flex items-center justify-center text-gray-500 hover:text-primary hover:bg-primary/10 transition-all flex-shrink-0 group">
              {isAr
                ? <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                : <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              }
            </button>

            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
              <ClipboardList className="w-4.5 h-4.5 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="space-y-1.5">
                  <div className="h-4 w-40 bg-gray-200 dark:bg-[#30363d] rounded animate-pulse" />
                  <div className="h-3 w-28 bg-gray-200 dark:bg-[#30363d] rounded animate-pulse" />
                </div>
              ) : sessionData ? (
                <>
                  <h1 className="font-black text-sm text-gray-900 dark:text-[#e6edf3] truncate leading-none mb-0.5">
                    {sessionData.title}
                  </h1>
                  <p className="text-xs text-gray-400 dark:text-[#6e7681] truncate">
                    {sessionData.group?.name} · {fmtDate(sessionData.scheduledDate, isAr)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>

            {!loading && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 dark:bg-primary/10 rounded-xl border border-primary/20">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm font-black text-primary">{students.length}</span>
                </div>
                <button onClick={() => fetchData()}
                  className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#21262d] flex items-center justify-center text-gray-500 hover:text-primary transition-all">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Hero Banner — same as dashboard ── */}
      {sessionData && !loading && (
        <div className="max-w-4xl mx-auto px-4 pt-5">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-600 to-pink-600 rounded-3xl opacity-60 blur-md group-hover:opacity-80 transition-opacity duration-500" />
            <div className="relative bg-gradient-to-br from-primary via-purple-600 to-pink-600 rounded-3xl p-5 overflow-hidden shadow-lg">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl" />

              <div className="relative z-10 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                    <span className="text-yellow-300 font-medium text-xs">{t("تسجيل الحضور", "Attendance Recording", isAr)}</span>
                  </div>
                  <h2 className="text-xl font-black text-white mb-1">{sessionData.title}</h2>
                  <p className="text-blue-100 text-sm">
                    {sessionData.group?.name} · {fmtTime(sessionData.startTime, isAr)} – {fmtTime(sessionData.endTime, isAr)}
                  </p>
                </div>

                {/* Mini stats in hero */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20">
                    <Users className="w-4 h-4 text-white" />
                    <span className="text-white font-black text-sm">{filledCount}<span className="text-white/60 font-normal">/{students.length}</span></span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20">
                    <TrendingUp className="w-4 h-4 text-white" />
                    <span className="text-white font-black text-sm">{students.length > 0 ? Math.round((filledCount / students.length) * 100) : 0}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="max-w-4xl mx-auto px-4 py-5 space-y-5">

        {loading && <Skeleton />}

        {!loading && error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800/40 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-red-700 dark:text-red-400">{error}</p>
            </div>
            <button onClick={fetchData} className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:underline px-3 py-1.5 rounded-lg hover:bg-red-100 transition-all">
              <RefreshCw className="w-3 h-3" />{t("إعادة", "Retry", isAr)}
            </button>
          </div>
        )}

        {!loading && !error && students.length > 0 && (
          <>
            {/* Summary */}
            <SummaryBar attendance={attendance} total={students.length} isAr={isAr} animateProgress={animateProgress} />

            {/* Quick mark all */}
            <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] p-4 shadow-lg dark:shadow-black/40">
              <p className="text-xs font-bold text-gray-500 dark:text-[#8b949e] mb-3 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-primary" />
                {t("تحديد الكل كـ:", "Mark all as:", isAr)}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {STATUS_ORDER.map((s) => {
                  const c = STATUS_CONFIG[s];
                  const Icon = c.icon;
                  return (
                    <button
                      key={s}
                      onClick={() => markAll(s)}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${c.lightBg} ${c.text} border ${c.border}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {t(c.labelAr, c.labelEn, isAr)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search + Filter */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <div className={`absolute ${isAr ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                </div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("ابحث عن طالب...", "Search student...", isAr)}
                  className={`w-full bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl ${isAr ? "pr-9 pl-4" : "pl-9 pr-4"} py-2.5 text-sm text-gray-900 dark:text-[#e6edf3] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 shadow-sm transition-all`}
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl px-3 py-2.5 text-sm text-gray-700 dark:text-[#8b949e] focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm">
                <option value="all">{t("الكل", "All", isAr)}</option>
                <option value="unset">{t("لم يُحدد", "Unset", isAr)}</option>
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>{t(STATUS_CONFIG[s].labelAr, STATUS_CONFIG[s].labelEn, isAr)}</option>
                ))}
              </select>
            </div>

            {/* Student cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredStudents.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] shadow-sm">
                  <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-[#21262d] rounded-full flex items-center justify-center mb-3">
                    <Users className="w-8 h-8 text-gray-300 dark:text-[#6e7681]" />
                  </div>
                  <p className="text-gray-400 text-sm">{t("لا نتائج", "No results", isAr)}</p>
                </div>
              ) : (
                filteredStudents.map((student) => (
                  <StudentCard
                    key={student._id}
                    student={student}
                    attendance={attendance}
                    onSetStatus={handleSetStatus}
                    onPreview={handlePreview}
                    isAr={isAr}
                    submitting={submitting}
                  />
                ))
              )}
            </div>

            {/* Submit sticky button — styled like dashboard CTA */}
            <div className="sticky bottom-0 pt-3 pb-4">
              <div className="bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-[#30363d] p-4 shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-[#e6edf3]">
                      {changedCount > 0
                        ? <span className="text-primary">{changedCount} {t("تغيير جديد", "new change(s)", isAr)}</span>
                        : <span className="text-gray-400 dark:text-[#6e7681]">{t("لا توجد تغييرات", "No changes", isAr)}</span>
                      }
                    </p>
                    {!allFilled && filledCount > 0 && (
                      <p className="text-xs text-amber-500 mt-0.5">
                        {students.length - filledCount} {t("طالب لم يُحدد", "student(s) unset", isAr)}
                      </p>
                    )}
                  </div>

                  {/* Progress mini ring */}
                  <div className="relative w-10 h-10 flex-shrink-0">
                    <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-100 dark:text-[#21262d]" />
                      <circle cx="18" cy="18" r="15" fill="none" stroke="url(#grad)" strokeWidth="3"
                        strokeDasharray={`${students.length > 0 ? (filledCount / students.length) * 94 : 0} 94`}
                        strokeLinecap="round" />
                      <defs>
                        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#8c52ff" />
                          <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-primary">
                      {students.length > 0 ? Math.round((filledCount / students.length) * 100) : 0}%
                    </span>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={filledCount === 0 || submitting}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black text-white shadow-lg transition-all
                      ${filledCount > 0 && !submitting
                        ? "bg-gradient-to-r from-primary to-purple-600 hover:shadow-xl hover:scale-[1.02]"
                        : "bg-gray-300 dark:bg-[#30363d] cursor-not-allowed"}`}>
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />{t("جاري الحفظ...", "Saving...", isAr)}</>
                    ) : (
                      <><CheckCheck className="w-4 h-4" />{t("حفظ الحضور", "Save Attendance", isAr)}</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {!loading && !error && students.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] shadow-sm">
            <div className="w-24 h-24 mx-auto bg-gray-100 dark:bg-[#21262d] rounded-full flex items-center justify-center mb-4">
              <Users className="w-12 h-12 text-gray-300 dark:text-[#6e7681]" />
            </div>
            <p className="text-gray-500 dark:text-[#8b949e] font-medium">{t("لا يوجد طلاب في هذه الجلسة", "No students in this session", isAr)}</p>
          </div>
        )}
      </div>

      {/* ── Preview Modal ── */}
      {previewModal && (
        <MessagePreviewModal
          student={previewModal.student}
          attendanceStatus={previewModal.status}
          sessionId={sessionId}
          isAr={isAr}
          onClose={() => setPreviewModal(null)}
          onConfirm={handleConfirmSingle}
        />
      )}

      <style jsx>{`
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-shimmer { animation: shimmer 2s infinite; }
      `}</style>
    </div>
  );
}