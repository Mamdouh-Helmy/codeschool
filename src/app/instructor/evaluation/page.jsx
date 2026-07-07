"use client";
// src/app/instructor/evaluation/page.jsx

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle2, X, AlertCircle, Loader2, Send,
  ChevronRight, ChevronLeft, CheckCheck, Users, Star,
  RotateCcw, BookOpen, Info, User,
  Zap, RefreshCw,
  Video, Sparkles, TrendingUp, BarChart3,
  Pencil, MessageSquarePlus, Link2, Check,
} from "lucide-react";
import { useLocale } from "@/app/context/LocaleContext";

// ─── Config ───────────────────────────────────────────────────────────────────
const DECISIONS = {
  pass: {
    ar: "ممتاز ✅", en: "Pass ✅",
    descAr: "فاهم المحتوى وأداؤه ممتاز",
    descEn: "Understands content, excellent performance",
    icon: CheckCircle2,
    bg: "bg-[#004d59]",
    gradient: "from-[#004d59] to-[#ff6700]",
    light: "bg-[#004d5908] dark:bg-[#004d5915]",
    border: "border-[#004d5930] dark:border-[#004d5950]",
    text: "text-[#004d59] dark:text-[#ff6700]",
    solidColor: "#004d59",
    solidTo: "#ff6700",
  },
  review: {
    ar: "يحتاج مراجعة ⚠️", en: "Needs Review ⚠️",
    descAr: "أداؤه جيد لكن يحتاج تعزيز",
    descEn: "Good but needs reinforcement",
    icon: BookOpen,
    bg: "bg-[#feaf00]",
    gradient: "from-[#feaf00] to-[#f67d00]",
    light: "bg-[#feaf0008] dark:bg-[#feaf0015]",
    border: "border-[#feaf0040] dark:border-[#feaf0050]",
    text: "text-[#f67d00] dark:text-[#feaf00]",
    solidColor: "#feaf00",
    solidTo: "#f67d00",
  },
  repeat: {
    ar: "يحتاج دعم إضافي 🔄", en: "Needs Support 🔄",
    descAr: "يحتاج وقتاً إضافياً لاستيعاب المحتوى",
    descEn: "Needs more time to absorb content",
    icon: RotateCcw,
    bg: "bg-[#ff6437]",
    gradient: "from-[#ff6437] to-[#ff6700]",
    light: "bg-[#ff643708] dark:bg-[#ff643715]",
    border: "border-[#ff643730] dark:border-[#ff643750]",
    text: "text-[#ff6437] dark:text-[#ff6700]",
    solidColor: "#ff6437",
    solidTo: "#ff6700",
  },
};

const ATTENDANCE_BADGE = {
  present:  { ar: "حاضر",       en: "Present",  color: "text-[#004d59] bg-[#004d5908] border-[#004d5930] dark:bg-[#004d5920] dark:border-[#004d5940]" },
  late:     { ar: "متأخر",      en: "Late",     color: "text-[#f67d00] bg-[#feaf0008] border-[#feaf0040] dark:bg-[#feaf0020] dark:border-[#feaf0050]" },
  absent:   { ar: "غائب",       en: "Absent",   color: "text-[#ff6437] bg-[#ff643708] border-[#ff643730] dark:bg-[#ff643720] dark:border-[#ff643750]" },
  excused:  { ar: "بعذر",       en: "Excused",  color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/40" },
  null:     { ar: "لم يُسجَّل", en: "N/A",      color: "text-gray-500 bg-gray-50 border-gray-200 dark:bg-[#21262d] dark:border-[#30363d]" },
};

const RATING_CRITERIA = [
  { key: "commitment",    labelAr: "الالتزام والتركيز",      labelEn: "Commitment & Focus" },
  { key: "understanding", labelAr: "مستوى الاستيعاب",        labelEn: "Understanding Level" },
  { key: "taskExecution", labelAr: "تنفيذ المهام",           labelEn: "Task Execution" },
  { key: "participation", labelAr: "المشاركة داخل الحصة",    labelEn: "Class Participation" },
];

const MAX_COMMENT_LENGTH = 500;

// ─── Star Rating Component ────────────────────────────────────────────────────
function StarRating({ value, onChange, disabled, size = "md" }) {
  const [hovered, setHovered] = useState(0);
  const stars = [1, 2, 3, 4, 5];
  const sz = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    <div className="flex items-center gap-0.5">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange && onChange(star)}
          onMouseEnter={() => !disabled && setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className={`transition-all duration-100 disabled:cursor-default ${!disabled ? "hover:scale-110 cursor-pointer" : ""}`}
        >
          <Star
            className={`${sz} transition-colors duration-100 ${
              star <= (hovered || value)
                ? "fill-[#feaf00] text-[#feaf00]"
                : "fill-gray-200 text-gray-200 dark:fill-[#30363d] dark:text-[#30363d]"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ value, duration = 800 }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime; let frame;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const p = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return <span>{count}</span>;
}

// ─── Comment Editor Modal (يفتح لما تدوس على تعليق المدرس) ───────────────────
function CommentEditorModal({ student, decision, initialValue, isAr, onClose, onSave }) {
  const [value, setValue] = useState(initialValue || "");
  const textareaRef = useRef(null);
  const cfg = DECISIONS[decision] || DECISIONS.pass;
  const t = (ar, en) => isAr ? ar : en;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const id = setTimeout(() => textareaRef.current?.focus(), 150);
    return () => { document.body.style.overflow = ""; clearTimeout(id); };
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSave(value.trim()); }
  };

  const remaining = MAX_COMMENT_LENGTH - value.length;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" dir={isAr ? "rtl" : "ltr"}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white dark:bg-[#161b22] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-[slideUp_0.25s_ease-out]">

        {/* Header */}
        <div className="relative p-5 overflow-hidden flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${cfg.solidColor}, ${cfg.solidTo})` }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center flex-shrink-0 shadow-lg">
              <MessageSquarePlus className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white">{t("تعليق المدرس", "Instructor Comment")}</p>
              <p className="text-xs text-white/70 truncate">{student?.name}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all flex-shrink-0">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
            onKeyDown={handleKeyDown}
            rows={7}
            placeholder={t("اكتب تعليقك عن أداء الطالب هنا...", "Write your comment about the student's performance...")}
            dir={isAr ? "rtl" : "ltr"}
            className="w-full text-sm rounded-2xl border-2 px-4 py-3.5 resize-none outline-none transition-all bg-gray-50 dark:bg-[#21262d] text-gray-800 dark:text-[#e6edf3] placeholder-gray-400 font-medium leading-relaxed border-gray-100 dark:border-[#30363d] focus:border-[#ff670060]"
          />
          <div className="flex items-center justify-between mt-2 px-1">
            <span className="text-[11px] text-gray-400 dark:text-[#6e7681]">
              {t("Ctrl/Cmd + Enter للحفظ السريع", "Ctrl/Cmd + Enter to save quickly")}
            </span>
            <span className={`text-[11px] font-bold ${remaining < 30 ? "text-[#ff6437]" : "text-gray-400 dark:text-[#6e7681]"}`}>
              {value.length}/{MAX_COMMENT_LENGTH}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-gray-100 dark:border-[#30363d]">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-bold bg-gray-100 dark:bg-[#21262d] text-gray-700 dark:text-[#8b949e] hover:bg-gray-200 dark:hover:bg-[#30363d] transition-all">
            {t("إلغاء", "Cancel")}
          </button>
          <button
            onClick={() => onSave(value.trim())}
            className="flex-1 py-3 rounded-xl text-sm font-black text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${cfg.solidColor}, ${cfg.solidTo})` }}>
            <Check className="w-4 h-4" />
            {t("حفظ التعليق", "Save Comment")}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}

// ─── Student Eval Card ────────────────────────────────────────────────────────
function StudentEvalCard({
  student, decision, onSetDecision, submitting,
  ratings, onRatingChange,
  comment, onOpenComment,
  isAr,
}) {
  const cfg = decision ? DECISIONS[decision] : null;
  const Icon = cfg?.icon;
  const att = ATTENDANCE_BADGE[student.attendanceStatus] || ATTENDANCE_BADGE[null];
  const t = (ar, en) => isAr ? ar : en;

  return (
    <div className={`group/card relative bg-white dark:bg-[#161b22] rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5
      ${cfg ? `${cfg.border} shadow-lg` : "border-gray-100 dark:border-[#30363d] shadow-sm hover:border-gray-200 dark:hover:border-[#3d444d]"}`}>

      {cfg && (
        <div className="h-1 w-full"
          style={{ background: `linear-gradient(90deg, ${cfg.solidColor}, ${cfg.solidTo})` }} />
      )}

      <div className="absolute inset-0 opacity-0 group-hover/card:opacity-5 transition-opacity duration-300 pointer-events-none"
        style={{ background: cfg ? `linear-gradient(135deg, ${cfg.solidColor}, ${cfg.solidTo})` : "linear-gradient(135deg, #004d59, #ff6700)" }} />

      <div className="relative z-10 p-4">
        {/* Student info row */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-base flex-shrink-0 shadow-md transition-transform duration-300 group-hover/card:scale-110"
            style={cfg
              ? { background: `linear-gradient(135deg, ${cfg.solidColor}, ${cfg.solidTo})`, color: "white" }
              : { background: "linear-gradient(135deg, #f3f4f6, #e5e7eb)", color: "#6b7280" }
            }>
            {cfg ? <Icon className="w-5 h-5" /> : (student.name?.[0] || "?").toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-black text-sm text-gray-900 dark:text-[#e6edf3] truncate mb-1.5">{student.name}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${att.color}`}>
                {isAr ? att.ar : att.en}
              </span>
            </div>
          </div>

          {cfg && (
            <span className={`text-[10px] font-black px-2.5 py-1.5 rounded-xl flex-shrink-0 ${cfg.light} ${cfg.text} border ${cfg.border}`}>
              {isAr ? cfg.ar : cfg.en}
            </span>
          )}
        </div>

        {/* Decision buttons */}
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(DECISIONS).map(([key, c]) => {
            const BtnIcon = c.icon;
            const isActive = decision === key;
            return (
              <button
                key={key}
                disabled={submitting}
                onClick={() => onSetDecision(student._id, key)}
                className={`relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-[11px] font-bold transition-all duration-200 disabled:opacity-50 active:scale-95 overflow-hidden
                  ${isActive
                    ? "text-white shadow-lg scale-[0.97]"
                    : `${c.light} ${c.text} border ${c.border} hover:shadow-md hover:-translate-y-0.5`}`}
                style={isActive
                  ? { background: `linear-gradient(135deg, ${c.solidColor}, ${c.solidTo})` }
                  : {}}>
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-10 animate-shimmer" />
                )}
                <BtnIcon className="w-4 h-4" />
                <span className="text-center leading-tight">{isAr ? c.ar : c.en}</span>
              </button>
            );
          })}
        </div>

        {/* Star Ratings */}
        {cfg && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-[#21262d] rounded-xl border border-gray-100 dark:border-[#30363d] space-y-2">
            <p className="text-[10px] font-black text-gray-500 dark:text-[#6e7681] uppercase tracking-wide mb-2">
              {t("تقييم الأداء", "Performance Rating")}
            </p>
            {RATING_CRITERIA.map((criterion) => (
              <div key={criterion.key} className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-gray-600 dark:text-[#8b949e] flex-1 truncate">
                  {isAr ? criterion.labelAr : criterion.labelEn}
                </span>
                <StarRating
                  value={ratings[criterion.key] || 3}
                  onChange={(val) => onRatingChange(student._id, criterion.key, val)}
                  disabled={submitting}
                  size="sm"
                />
              </div>
            ))}
          </div>
        )}

        {/* تعليق المدرس — يفتح مودال واسع بدل ما يكتب في مكان ضيق */}
        {cfg && (
          <button
            type="button"
            disabled={submitting}
            onClick={() => onOpenComment(student, decision)}
            className={`mt-2.5 w-full text-start rounded-xl border px-3 py-2.5 transition-all group/comment disabled:opacity-50
              ${comment?.trim()
                ? "border-[#004d5940] dark:border-[#ff670040] bg-[#004d5905] dark:bg-[#ff670005]"
                : "border-gray-100 dark:border-[#30363d] bg-gray-50 dark:bg-[#21262d] hover:border-[#ff670040]"}`}
          >
            <div className="flex items-start gap-2">
              <Pencil className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${comment?.trim() ? "text-[#ff6700]" : "text-gray-400"}`} />
              <p className={`text-xs leading-relaxed line-clamp-2 flex-1 ${comment?.trim() ? "text-gray-700 dark:text-[#c9d1d9] font-medium" : "text-gray-400 dark:text-[#6e7681]"}`}>
                {comment?.trim() || t("اضغط لإضافة تعليق المدرس (اختياري)...", "Tap to add instructor comment (optional)...")}
              </p>
            </div>
          </button>
        )}

        {cfg && (student.credits ?? 0) <= 0 && (
          <div className="mt-2.5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs bg-gray-50 dark:bg-[#21262d] text-gray-400 border border-gray-100 dark:border-[#30363d]">
            🔕 {t("لن تُرسل رسالة — رصيد صفر", "No message — zero credits")}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Global Recording Link Card (لينك واحد بيتبعت لكل الطلاب) ────────────────
function GlobalRecordingLinkCard({ value, onChange, isAr, disabled }) {
  const t = (ar, en) => isAr ? ar : en;
  const hasValue = !!value?.trim();

  return (
    <div className={`bg-white dark:bg-[#161b22] rounded-2xl border p-4 shadow-sm transition-all
      ${hasValue ? "border-[#004d5940] dark:border-[#ff670040]" : "border-gray-100 dark:border-[#30363d]"}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #004d59, #ff6437)" }}>
          <Link2 className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-gray-900 dark:text-[#e6edf3]">
            {t("لينك تسجيل الجلسة", "Session Recording Link")}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-[#6e7681]">
            {t("لينك واحد بيتبعت لكل الطلاب المقيَّمين تلقائياً", "One link sent automatically to all evaluated students")}
          </p>
        </div>
        {hasValue && (
          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#004d5910] dark:bg-[#ff670015] text-[#004d59] dark:text-[#ff6700] border border-[#004d5930] dark:border-[#ff670030] flex-shrink-0">
            {t("جاهز", "Ready")}
          </span>
        )}
      </div>

      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all
        ${hasValue
          ? "border-[#004d5940] dark:border-[#ff670040] bg-[#004d5905] dark:bg-[#ff670005]"
          : "border-gray-100 dark:border-[#30363d] bg-gray-50 dark:bg-[#21262d]"}`}>
        <Video className={`w-4 h-4 flex-shrink-0 ${hasValue ? "text-[#ff6700]" : "text-gray-400"}`} />
        <input
          type="url"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={t("الصق لينك التسجيل هنا...", "Paste recording link here...")}
          dir="ltr"
          className="flex-1 bg-transparent text-sm text-gray-700 dark:text-[#c9d1d9] placeholder-gray-400 outline-none min-w-0 font-mono"
        />
        {hasValue && (
          <button
            onClick={() => onChange("")}
            disabled={disabled}
            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-[#ff6437] flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="h-36 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse border border-gray-100 dark:border-[#30363d]" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-48 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse border border-gray-100 dark:border-[#30363d]" />
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InstructorEvaluationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session");
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const t = (ar, en) => isAr ? ar : en;

  const [loading, setLoading]           = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState(false);
  const [sessionData, setSessionData]   = useState(null);
  const [students, setStudents]         = useState([]);
  const [decisions, setDecisions]       = useState({});
  const [commentModal, setCommentModal] = useState(null); // { student, decision }
  const [recordingLink, setRecordingLink] = useState(""); // لينك واحد للكل
  const [submitSummary, setSubmitSummary]   = useState(null);
  const [animateProgress, setAnimateProgress] = useState(false);
  const [ratings, setRatings]   = useState({});
  const [comments, setComments] = useState({});

  const [moduleTitle, setModuleTitle]           = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [supervisorName, setSupervisorName]     = useState("");

  const fetchData = useCallback(async () => {
    if (!sessionId) { setError(t("لم يتم تحديد جلسة", "No session specified")); setLoading(false); return; }
    try {
      setLoading(true); setError("");
      const res = await fetch(`/api/instructor/sessions/${sessionId}/evaluation`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setSessionData(data.data.session);
        setStudents(data.data.students || []);

        setModuleTitle(data.data.session?.moduleTitle       || "");
        setModuleDescription(data.data.session?.moduleDescription || "");
        setSupervisorName(data.data.supervisorName           || "");

        setRecordingLink(data.data.session?.recordingLink || "");

        const existingDecisions = {};
        const existingRatings   = {};
        const existingComments  = {};
        (data.data.students || []).forEach((s) => {
          if (s.currentDecision) existingDecisions[s._id] = s.currentDecision;
          if (s.currentRatings)  existingRatings[s._id]   = {
            commitment:    s.currentRatings.commitment    || 3,
            understanding: s.currentRatings.understanding || 3,
            taskExecution: s.currentRatings.taskExecution || 3,
            participation: s.currentRatings.participation || 3,
          };
          if (s.currentComment)  existingComments[s._id]  = s.currentComment;
        });
        setDecisions(existingDecisions);
        setRatings(existingRatings);
        setComments(existingComments);
        setTimeout(() => setAnimateProgress(true), 300);
      } else {
        setError(data.message || data.error || t("فشل التحميل", "Failed to load"));
      }
    } catch { setError(t("خطأ في الاتصال", "Connection error")); }
    finally { setLoading(false); }
  }, [sessionId, isAr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSetDecision = useCallback((studentId, decision) => {
    setDecisions((prev) => {
      if (prev[studentId] === decision) { const n = { ...prev }; delete n[studentId]; return n; }
      return { ...prev, [studentId]: decision };
    });
    setRatings((prev) => prev[studentId] ? prev : {
      ...prev,
      [studentId]: { commitment: 3, understanding: 3, taskExecution: 3, participation: 3 },
    });
  }, []);

  const handleRatingChange = useCallback((studentId, criterion, value) => {
    setRatings((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [criterion]: value },
    }));
  }, []);

  const handleOpenComment = useCallback((student, decision) => {
    setCommentModal({ student, decision });
  }, []);

  const handleSaveComment = useCallback((value) => {
    if (commentModal?.student?._id) {
      setComments((prev) => ({ ...prev, [commentModal.student._id]: value }));
    }
    setCommentModal(null);
  }, [commentModal]);

  const handleSubmit = async () => {
    const filled = Object.keys(decisions);
    if (filled.length === 0) return;
    try {
      setSubmitting(true);
      const evaluations = filled.map((studentId) => ({
        studentId,
        decision:      decisions[studentId],
        recordingLink: recordingLink?.trim() || null,
        ratings:       ratings[studentId] || { commitment: 3, understanding: 3, taskExecution: 3, participation: 3 },
        comment:       comments[studentId] || '',
      }));
      const res = await fetch(`/api/instructor/sessions/${sessionId}/evaluation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ evaluations }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitSummary(data.data?.summary || null);
        setSuccess(true);
        setTimeout(() => router.push("/instructor/sessions"), 3000);
      } else {
        setError(data.error || data.message || t("فشل الحفظ", "Failed to save"));
      }
    } catch { setError(t("خطأ في الاتصال", "Connection error")); }
    finally { setSubmitting(false); }
  };

  const filledCount = Object.keys(decisions).length;
  const stats = { pass: 0, review: 0, repeat: 0 };
  Object.values(decisions).forEach((d) => { if (stats[d] !== undefined) stats[d]++; });

  // ── No session ──
  if (!sessionId) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb] dark:bg-[#0a0f17]" dir={isAr ? "rtl" : "ltr"}>
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-10 h-10 text-red-500 animate-pulse" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-[#e6edf3] mb-2">{t("لم يتم تحديد جلسة", "No session specified")}</h3>
        <button onClick={() => router.push("/instructor/sessions")}
          className="mt-2 px-6 py-3 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105"
          style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}>
          {t("العودة للجلسات", "Back to Sessions")}
        </button>
      </div>
    </div>
  );

  // ── Success ──
  if (success) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb] dark:bg-[#0a0f17]" dir={isAr ? "rtl" : "ltr"}>
      <div className="text-center px-6 max-w-sm w-full">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full opacity-20 blur-xl animate-pulse"
            style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }} />
          <div className="relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl"
            style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}>
            <CheckCheck className="w-12 h-12 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-[#e6edf3] mb-2">
          {t("تم إكمال الجلسة! 🎉", "Session Completed! 🎉")}
        </h2>
        {submitSummary && (
          <div className="mt-4 mb-4 grid grid-cols-3 gap-3">
            {[
              { value: submitSummary.evalSent, label: t("رسائل التقييم", "Eval Messages"), color: "#ff6700" },
              { value: submitSummary.linkSent, label: t("روابط التسجيل", "Recording Links"), color: "#004d59" },
              { value: submitSummary.skipped,  label: t("تم تخطيه", "Skipped"),           color: "#8b949e" },
            ].map((item, i) => (
              <div key={i} className="bg-white dark:bg-[#161b22] rounded-2xl p-4 border border-gray-100 dark:border-[#30363d] shadow-sm">
                <p className="text-2xl font-black" style={{ color: item.color }}>{item.value}</p>
                <p className="text-[10px] text-gray-400 dark:text-[#6e7681] mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        )}
        <p className="text-sm text-gray-400 dark:text-[#8b949e]">{t("جاري التحويل...", "Redirecting...")}</p>
      </div>
    </div>
  );

  // ── Main ──
  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-[#0a0f17]" dir={isAr ? "rtl" : "ltr"}>

      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md border-b border-gray-200 dark:border-[#30363d] shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/instructor/sessions")}
              className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#21262d] flex items-center justify-center text-gray-500 transition-all flex-shrink-0 group hover:bg-[#ff670015] hover:text-[#ff6700]">
              {isAr
                ? <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                : <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />}
            </button>

            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
              style={{ background: "linear-gradient(135deg, #feaf00, #f67d00)" }}>
              <Star className="w-4 h-4 text-white" />
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
                    {t("تقييم الطلاب", "Student Evaluation")} — {sessionData.title}
                  </h1>
                  <p className="text-xs text-gray-400 dark:text-[#6e7681] truncate">
                    {sessionData.group?.name}
                    {moduleTitle && <span className="mx-1 opacity-50">·</span>}
                    {moduleTitle && <span className="opacity-70">{moduleTitle}</span>}
                  </p>
                </>
              ) : (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>

            {!loading && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border"
                  style={{ background: "#feaf0010", borderColor: "#feaf0040" }}>
                  <Users className="w-4 h-4" style={{ color: "#f67d00" }} />
                  <span className="text-sm font-black" style={{ color: "#f67d00" }}>{students.length}</span>
                </div>
                <button onClick={() => fetchData()}
                  className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#21262d] flex items-center justify-center text-gray-500 hover:text-[#ff6700] transition-all">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hero Banner */}
      {sessionData && !loading && (
        <div className="max-w-4xl mx-auto px-4 pt-5">
          <div className="relative group">
            <div className="absolute inset-0 rounded-3xl opacity-60 blur-md group-hover:opacity-80 transition-opacity duration-500"
              style={{ background: "linear-gradient(135deg, #004d59, #ff6700, #feaf00)" }} />
            <div className="relative rounded-3xl p-5 overflow-hidden shadow-lg"
              style={{ background: "linear-gradient(135deg, #004d59 0%, #004d59dd 40%, #ff6700 100%)" }}>
              <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl animate-pulse"
                style={{ background: "#feaf00", opacity: 0.15 }} />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full blur-3xl"
                style={{ background: "#ff6437", opacity: 0.1 }} />
              <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="w-4 h-4 text-[#feaf00] animate-pulse" />
                    <span className="text-[#feaf00] font-medium text-xs">{t("تقييم الأداء", "Performance Evaluation")}</span>
                  </div>
                  <h2 className="text-xl font-black text-white mb-1 truncate">{sessionData.title}</h2>
                  <p className="text-white/70 text-sm truncate">{sessionData.group?.name}</p>
                  {moduleTitle && (
                    <p className="text-white/50 text-xs mt-1 truncate">
                      📚 {moduleTitle}
                    </p>
                  )}
                  {supervisorName && (
                    <p className="text-white/50 text-xs truncate">
                      👨‍🏫 {supervisorName}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20">
                    <Users className="w-4 h-4 text-white" />
                    <span className="text-white font-black text-sm">
                      {filledCount}<span className="text-white/60 font-normal">/{students.length}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20">
                    <TrendingUp className="w-4 h-4 text-white" />
                    <span className="text-white font-black text-sm">
                      {students.length > 0 ? Math.round((filledCount / students.length) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-5 space-y-5 pb-36">

        {loading && <Skeleton />}

        {!loading && error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800/40 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-sm font-bold text-red-700 dark:text-red-400 flex-1">{error}</p>
            <button onClick={fetchData}
              className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:underline px-3 py-1.5 rounded-lg hover:bg-red-100 transition-all">
              <RefreshCw className="w-3 h-3" />{t("إعادة", "Retry")}
            </button>
          </div>
        )}

        {!loading && !error && students.length > 0 && (
          <>
            {/* Progress Summary */}
            <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] p-5 shadow-lg dark:shadow-black/40">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md"
                  style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}>
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-gray-900 dark:text-[#e6edf3]">{t("ملخص التقييم", "Evaluation Summary")}</p>
                  <p className="text-xs text-gray-500 dark:text-[#8b949e]">{filledCount}/{students.length} {t("طالب", "students")}</p>
                </div>
                <div className="text-sm font-black">
                  {filledCount === students.length && students.length > 0
                    ? <span className="flex items-center gap-1" style={{ color: "#ff6700" }}>
                        <CheckCheck className="w-4 h-4" />{t("مكتمل", "Complete")}
                      </span>
                    : <span style={{ color: "#ff6700" }}>
                        {`${Math.round(students.length > 0 ? (filledCount / students.length) * 100 : 0)}%`}
                      </span>
                  }
                </div>
              </div>

              <div className="h-2.5 bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden mb-5">
                <div className="h-full rounded-full relative overflow-hidden transition-all duration-700"
                  style={{
                    width: `${students.length > 0 ? (filledCount / students.length) * 100 : 0}%`,
                    background: "linear-gradient(90deg, #004d59, #ff6700)",
                  }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {Object.entries(DECISIONS).map(([key, c], idx) => {
                  const Icon = c.icon;
                  return (
                    <div key={key}
                      className={`group/stat flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-500 hover:shadow-md hover:-translate-y-0.5
                        ${animateProgress ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
                        ${c.light} ${c.border}`}
                      style={{ transitionDelay: `${idx * 80}ms` }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm group-hover/stat:scale-110 transition-transform"
                        style={{ background: `linear-gradient(135deg, ${c.solidColor}, ${c.solidTo})` }}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className={`text-2xl font-black ${c.text}`}><AnimatedCounter value={stats[key]} /></span>
                      <span className={`text-[9px] font-bold ${c.text} opacity-80 text-center`}>{isAr ? c.ar : c.en}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Global Recording Link — لينك واحد بيتبعت لكل الطلاب */}
            <GlobalRecordingLinkCard
              value={recordingLink}
              onChange={setRecordingLink}
              isAr={isAr}
              disabled={submitting}
            />

            {/* Student cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {students.map((student) => (
                <StudentEvalCard
                  key={student._id}
                  student={student}
                  decision={decisions[student._id] || null}
                  onSetDecision={handleSetDecision}
                  submitting={submitting}
                  ratings={ratings[student._id] || { commitment: 3, understanding: 3, taskExecution: 3, participation: 3 }}
                  onRatingChange={handleRatingChange}
                  comment={comments[student._id] || ""}
                  onOpenComment={handleOpenComment}
                  isAr={isAr}
                />
              ))}
            </div>
          </>
        )}

        {!loading && !error && students.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] shadow-sm">
            <div className="w-24 h-24 mx-auto bg-gray-100 dark:bg-[#21262d] rounded-full flex items-center justify-center mb-4">
              <Users className="w-12 h-12 text-gray-300 dark:text-[#6e7681]" />
            </div>
            <p className="text-gray-500 dark:text-[#8b949e] font-medium">{t("لا يوجد طلاب في هذا الجروب", "No students in this group")}</p>
          </div>
        )}
      </div>

      {/* Sticky Submit Bar */}
      {!loading && !error && students.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-3 sm:p-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-[#30363d] p-4 shadow-xl">
              <div className="flex items-center gap-4" dir={isAr ? "rtl" : "ltr"}>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-[#e6edf3]">
                    {filledCount > 0
                      ? <span style={{ color: "#ff6700" }}>{filledCount} {t("طالب مقيَّم", "student(s) evaluated")}</span>
                      : <span className="text-gray-400 dark:text-[#6e7681]">{t("لا توجد تقييمات", "No evaluations yet")}</span>
                    }
                  </p>
                  {filledCount < students.length && filledCount > 0 && (
                    <p className="text-xs mt-0.5" style={{ color: "#ff6700" }}>
                      {students.length - filledCount} {t("لم يُقيَّموا بعد", "not evaluated yet")}
                    </p>
                  )}
                </div>

                <div className="relative w-10 h-10 flex-shrink-0">
                  <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-100 dark:text-[#21262d]" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke="url(#gradEval)" strokeWidth="3"
                      strokeDasharray={`${students.length > 0 ? (filledCount / students.length) * 94 : 0} 94`}
                      strokeLinecap="round" />
                    <defs>
                      <linearGradient id="gradEval" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#004d59" />
                        <stop offset="100%" stopColor="#ff6700" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black" style={{ color: "#ff6700" }}>
                    {students.length > 0 ? Math.round((filledCount / students.length) * 100) : 0}%
                  </span>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={filledCount === 0 || submitting}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black text-white shadow-lg transition-all flex-shrink-0 hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={filledCount > 0 && !submitting
                    ? { background: "linear-gradient(135deg, #004d59, #ff6700)" }
                    : { background: "#d1d5db" }}>
                  {submitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" />{t("جاري الإرسال...", "Sending...")}</>
                    : <><Zap className="w-4 h-4" />{t("إكمال الجلسة وإرسال", "Complete & Send")}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comment Editor Modal */}
      {commentModal && (
        <CommentEditorModal
          student={commentModal.student}
          decision={commentModal.decision}
          initialValue={comments[commentModal.student._id] || ""}
          isAr={isAr}
          onClose={() => setCommentModal(null)}
          onSave={handleSaveComment}
        />
      )}

      <style jsx>{`
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-shimmer { animation: shimmer 2s infinite; }
      `}</style>
    </div>
  );
}