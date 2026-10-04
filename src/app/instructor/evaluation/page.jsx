"use client";
// src/app/instructor/evaluation/page.jsx

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle2, X, AlertCircle, Send,
  ChevronRight, ChevronLeft, CheckCheck, Users, Star,
  RotateCcw, BookOpen, Info, User,
  Zap, RefreshCw,
  Video, Sparkles, TrendingUp, BarChart3,
  Pencil, MessageSquarePlus, Link2, Check,
  MapPin, Briefcase, PaperPlaneTilt, Calendar, Clock,
} from "@/components/icons";
import {
  INTERVIEW_DECISIONS, INTERVIEW_RATING_ROWS, RATING_WORDS, dGrad,
  PaperPlane, PaperPlaneFlight, FlightStyles, PaperPlaneLoader,
} from "@/components/interviewShared";
import { useLocale } from "@/app/context/LocaleContext";

// ─── Shared: keyframes + stagger ──────────────────────────────────────────────
const stagger = (i) => ({ animation: `evalCard .65s ${0.15 + i * 0.08}s cubic-bezier(.2,.8,.2,1) both` });

function EvalKeyframes() {
  return (
    <style>{`
      @keyframes evalIn { from { opacity: 0; transform: translateY(14px) scale(.99); } to { opacity: 1; transform: none; } }
      @keyframes evalCard {
        from { opacity: 0; transform: translateY(26px) rotateX(-10deg) scale(.97); }
        to   { opacity: 1; transform: none; }
      }
      @keyframes evalPop {
        0% { transform: scale(.4) rotate(-12deg); opacity: 0; }
        65% { transform: scale(1.12) rotate(4deg); opacity: 1; }
        100% { transform: scale(1) rotate(0); opacity: 1; }
      }
      @keyframes slideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    `}</style>
  );
}

// ─── Config (الألوان والأيقونات من نفس مصدر المقابلات) ───────────────────────────
const DECISIONS = {
  pass: {
    ...INTERVIEW_DECISIONS.pass,
    ar: "ممتاز", en: "Pass",
    descAr: "فاهم المحتوى وأداؤه ممتاز",
    descEn: "Understands content, excellent performance",
  },
  review: {
    ...INTERVIEW_DECISIONS.review,
    ar: "يحتاج مراجعة", en: "Needs Review",
    descAr: "أداؤه جيد لكن يحتاج تعزيز",
    descEn: "Good but needs reinforcement",
  },
  repeat: {
    ...INTERVIEW_DECISIONS.repeat,
    ar: "يحتاج دعم إضافي", en: "Needs Support",
    descAr: "يحتاج وقتاً إضافياً لاستيعاب المحتوى",
    descEn: "Needs more time to absorb content",
  },
};

const ATTENDANCE_BADGE = {
  present: { ar: "حاضر", en: "Present", color: "text-[#004d59] bg-[#004d5908] border-[#004d5930] dark:bg-[#004d5920] dark:border-[#004d5940]" },
  late: { ar: "متأخر", en: "Late", color: "text-[#f67d00] bg-[#feaf0008] border-[#feaf0040] dark:bg-[#feaf0020] dark:border-[#feaf0050]" },
  absent: { ar: "غائب", en: "Absent", color: "text-[#ff6437] bg-[#ff643708] border-[#ff643730] dark:bg-[#ff643720] dark:border-[#ff643750]" },
  excused: { ar: "بعذر", en: "Excused", color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/40" },
  null: { ar: "لم يُسجَّل", en: "N/A", color: "text-gray-500 bg-gray-50 border-gray-200 dark:bg-[#21262d] dark:border-[#30363d]" },
};

// نفس معايير المقابلة (بنفس الأيقونات) مع تسمية "داخل الحصة" للمشاركة
const SESSION_RATING_ROWS = INTERVIEW_RATING_ROWS.map((r) =>
  r.key === "participation"
    ? { ...r, ar: "المشاركة داخل الحصة", en: "Class Participation" }
    : r
);

const DEFAULT_RATINGS = { commitment: 3, understanding: 3, taskExecution: 3, participation: 3 };
const MAX_COMMENT_LENGTH = 500;

// ─── نجوم ملوّنة بلون النتيجة ────────────────────────────────────────────────
function ColorStars({ value, onChange, color, disabled, size = "lg" }) {
  const [hov, setHov] = useState(0);
  const sz = size === "sm" ? "w-5 h-5" : "w-7 h-7";
  return (
    <div className={`flex items-center ${size === "sm" ? "gap-0.5" : "gap-1"}`} onMouseLeave={() => setHov(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= (hov || value);
        return (
          <button key={n} type="button" disabled={disabled}
            onClick={() => onChange(n)}
            onMouseEnter={() => !disabled && setHov(n)}
            className="transition-transform duration-150 hover:scale-125 active:scale-90 disabled:cursor-default">
            <Star weight={on ? "fill" : "regular"}
              className={`${sz} transition-colors duration-150 ${on ? "" : "text-gray-300 dark:text-[#3d444d]"}`}
              style={on ? { color } : undefined} />
          </button>
        );
      })}
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

// ─── Hold Notice ──────────────────────────────────────────────────────────────
function HoldNotice({ isAr, style }) {
  const t = (ar, en) => isAr ? ar : en;
  return (
    <div className="flex items-center gap-3 p-4 rounded-3xl bg-[#ff6437]/10 dark:bg-[#ff6437]/5 border border-[#ff6437]/30 dark:border-[#ff6437]/20" style={style}>
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md"
        style={{ background: "linear-gradient(135deg, #ff6437, #ff6700)" }}>
        <AlertCircle className="w-5 h-5 text-white" />
      </div>
      <p className="text-xs font-bold text-[#ff6437] leading-relaxed">
        {t(
          "الجروب على Hold — التقييم وإكمال الجلسة شغالين، لكن الرسائل مش هتتبعت.",
          "Group is on hold — evaluation and completion work, but messages won't be sent."
        )}
      </p>
    </div>
  );
}

function CommentEditorModal({ student, decision, initialValue, isAr, onClose, onSave }) {
  const [value, setValue] = useState(initialValue || "");
  const textareaRef = useRef(null);
  const cfg = DECISIONS[decision] || DECISIONS.pass;
  const t = (ar, en) => isAr ? ar : en;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = setTimeout(() => textareaRef.current?.focus(), 150);
    return () => { document.body.style.overflow = prev; clearTimeout(id); };
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSave(value.trim()); }
  };

  const remaining = MAX_COMMENT_LENGTH - value.length;

  if (typeof document === "undefined") return null;

  // Portal على document.body → fixed بالنسبة للشاشة مهما كان الـ parent (transform/animation/filter)
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" dir={isAr ? "rtl" : "ltr"}>
      <EvalKeyframes />
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-[#161b22] rounded-3xl shadow-2xl flex flex-col border border-gray-100 dark:border-[#30363d]"
        style={{ animation: "slideUp .25s ease-out" }}>

        <div className="relative p-5 overflow-hidden flex-shrink-0" style={{ background: dGrad(cfg) }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <PaperPlane className="absolute -top-2 end-10 w-28 opacity-20 -rotate-12 pointer-events-none" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center flex-shrink-0 shadow-lg">
              <MessageSquarePlus weight="fill" className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white">{t("تعليق المدرس", "Instructor Comment")}</p>
              <p className="text-xs text-white/75 truncate">{student?.name}</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all flex-shrink-0 border border-white/25">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

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
            <span className={`text-[11px] font-black ${remaining < 30 ? "text-[#e11d48]" : "text-gray-400 dark:text-[#6e7681]"}`}>
              {value.length}/{MAX_COMMENT_LENGTH}
            </span>
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-gray-100 dark:border-[#30363d]">
          <button onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl text-sm font-bold bg-gray-100 dark:bg-[#21262d] text-gray-700 dark:text-[#8b949e] hover:bg-gray-200 dark:hover:bg-[#30363d] transition-all">
            {t("إلغاء", "Cancel")}
          </button>
          <button
            onClick={() => onSave(value.trim())}
            className="flex-1 py-3.5 rounded-2xl text-sm font-black text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            style={{ background: dGrad(cfg) }}>
            <Check className="w-4 h-4" />
            {t("حفظ التعليق", "Save Comment")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function BusyLabel() {
  return (
    <>
      <PaperPlaneLoader inline tone="light" size={40} />
    </>
  );
}

// ─── Student Eval Card ────────────────────────────────────────────────────────
function StudentEvalCard({
  student, decision, onSetDecision, submitting,
  ratings, onRatingChange,
  comment, onOpenComment,
  isComplimentary,
  isAr,
  index = 0,
}) {
  const cfg = decision ? DECISIONS[decision] : null;
  const Icon = cfg?.icon;
  const att = ATTENDANCE_BADGE[student.attendanceStatus] || ATTENDANCE_BADGE[null];
  const t = (ar, en) => isAr ? ar : en;
  const grad = cfg ? dGrad(cfg) : "linear-gradient(135deg, #004d59, #0e7c8c)";
  const avg = cfg
    ? Math.round((SESSION_RATING_ROWS.reduce((s, r) => s + (ratings[r.key] || 3), 0) / SESSION_RATING_ROWS.length) * 10) / 10
    : null;
  const hasComment = !!comment?.trim();

  return (
    <div
      className={`group/card relative bg-white dark:bg-[#161b22] rounded-3xl border overflow-hidden transition-shadow duration-300 hover:shadow-xl
        ${cfg ? "shadow-lg" : "border-gray-100 dark:border-[#30363d] shadow-sm"}`}
      style={{ ...stagger(Math.min(index, 8)), ...(cfg ? { borderColor: `${cfg.c1}45` } : {}) }}>

      {cfg && <div className="h-1.5 w-full" style={{ background: grad }} />}

      {/* طيارة ورق خفيفة في الخلفية */}
      <PaperPlane className="absolute -end-4 -top-1 w-24 opacity-[.06] group-hover/card:opacity-[.14] -rotate-12 transition-opacity duration-500 pointer-events-none"
        style={{ filter: "grayscale(.2) brightness(.55)" }} />

      <div className="relative z-10 p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg flex-shrink-0 shadow-md text-white transition-transform duration-300 group-hover/card:scale-105"
            style={{ background: grad }}>
            {cfg ? <Icon weight="fill" className="w-7 h-7" /> : (student.name?.[0] || "?").toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-black text-sm text-gray-900 dark:text-[#e6edf3] truncate mb-1.5">{student.name}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${att.color}`}>
                {isAr ? att.ar : att.en}
              </span>
              {cfg && (
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-white px-2.5 py-1 rounded-full shadow-sm" style={{ background: grad }}>
                  <Icon weight="fill" className="w-3.5 h-3.5" />{isAr ? cfg.ar : cfg.en}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Decision buttons */}
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(DECISIONS).map(([key, c]) => {
            const BtnIcon = c.icon;
            const isActive = decision === key;
            return (
              <button
                key={key}
                type="button"
                disabled={submitting}
                onClick={() => onSetDecision(student._id, key)}
                className={`relative flex flex-col items-center gap-1.5 py-3 px-1.5 rounded-2xl border-2 text-[11px] font-black transition-all duration-300 overflow-hidden active:scale-95 disabled:opacity-60
                  ${isActive ? "text-white border-transparent -translate-y-0.5" : "hover:-translate-y-0.5 hover:shadow-md"}`}
                style={isActive
                  ? { background: dGrad(c), boxShadow: `0 14px 28px -12px ${c.c1}99` }
                  : { borderColor: `${c.c1}45`, background: `${c.c1}0f`, color: c.c1 }}>
                {isActive && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-10 animate-shimmer" />}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${isActive ? "bg-white/20" : ""}`}
                  style={isActive ? undefined : { background: dGrad(c) }}>
                  <BtnIcon weight="fill" className="w-5 h-5 text-white" />
                </div>
                <span className="text-center leading-tight">{isAr ? c.ar : c.en}</span>
              </button>
            );
          })}
        </div>

        {/* Ratings */}
        {cfg && (
          <div className="mt-3 p-3 rounded-2xl border space-y-2"
            style={{ borderColor: `${cfg.c1}30`, background: `${cfg.c1}0a`, animation: "evalCard .45s both cubic-bezier(.2,.8,.2,1)" }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style={{ background: grad }}>
                <Star weight="fill" className="w-4 h-4 text-white" />
              </div>
              <p className="flex-1 text-xs font-black text-gray-800 dark:text-[#e6edf3]">{t("تقييم الأداء", "Performance Rating")}</p>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-white text-xs font-black shadow-sm" style={{ background: grad }}>
                <Star weight="fill" className="w-3 h-3" />{avg}
              </span>
            </div>

            {SESSION_RATING_ROWS.map((r) => {
              const RIco = r.icon;
              const v = ratings[r.key] || 3;
              return (
                <div key={r.key} className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white/80 dark:bg-[#21262d] border border-gray-100 dark:border-[#30363d]">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${cfg.c1}1a`, color: cfg.c1 }}>
                    <RIco className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-gray-700 dark:text-[#c9d1d9] truncate">{isAr ? r.ar : r.en}</p>
                    <p className="text-[10px] font-bold" style={{ color: cfg.c1 }}>{RATING_WORDS[isAr ? "ar" : "en"][v]}</p>
                  </div>
                  <ColorStars size="sm" value={v} color={cfg.c1} disabled={submitting}
                    onChange={(val) => onRatingChange(student._id, r.key, val)} />
                </div>
              );
            })}
          </div>
        )}

        {/* Comment */}
        {cfg && (
          <button
            type="button"
            disabled={submitting}
            onClick={() => onOpenComment(student, decision)}
            className={`mt-2.5 w-full text-start rounded-2xl border px-3 py-3 transition-all disabled:opacity-60
              ${hasComment ? "" : "border-gray-100 dark:border-[#30363d] bg-gray-50 dark:bg-[#21262d] hover:border-[#ff670040]"}`}
            style={hasComment ? { borderColor: `${cfg.c1}40`, background: `${cfg.c1}0d` } : undefined}
          >
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={hasComment ? { background: grad } : { background: "#f3f4f6" }}>
                <Pencil className={`w-4 h-4 ${hasComment ? "text-white" : "text-gray-400"}`} />
              </div>
              <p className={`text-xs leading-relaxed line-clamp-2 flex-1 pt-1.5 ${hasComment ? "text-gray-700 dark:text-[#c9d1d9] font-medium" : "text-gray-400 dark:text-[#6e7681]"}`}>
                {hasComment ? comment.trim() : t("اضغط لإضافة تعليق المدرس (اختياري)...", "Tap to add instructor comment (optional)...")}
              </p>
            </div>
          </button>
        )}

        {/* رسالة "رصيد صفر" مبتنطبقش على الحصة التعويضية — الباك بيبعت فيها الرسايل عادي */}
        {cfg && !isComplimentary && (student.credits ?? 0) <= 0 && (
          <div className="mt-2.5 w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs bg-gray-50 dark:bg-[#21262d] text-gray-400 border border-gray-100 dark:border-[#30363d]">
            <X className="w-3.5 h-3.5" />
            {t("لن تُرسل رسالة — رصيد صفر", "No message — zero credits")}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Global Recording Link Card ────────────────────────────────────────────────
function GlobalRecordingLinkCard({ value, onChange, isAr, disabled, style }) {
  const t = (ar, en) => isAr ? ar : en;
  const hasValue = !!value?.trim();

  return (
    <div className={`bg-white dark:bg-[#161b22] rounded-3xl border p-4 sm:p-5 shadow-sm transition-all
      ${hasValue ? "border-[#004d5950] dark:border-[#ff670050]" : "border-gray-100 dark:border-[#30363d]"}`}
      style={style}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #004d59, #0e7c8c)" }}>
          <Link2 weight="bold" className="w-5 h-5 text-white" />
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
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 flex-shrink-0">
            <Check className="w-3 h-3" />{t("جاهز", "Ready")}
          </span>
        )}
      </div>

      <div className={`flex items-center gap-2 px-3 py-3 rounded-2xl border transition-all
        ${hasValue
          ? "border-[#004d5940] dark:border-[#ff670040] bg-[#004d5905] dark:bg-[#ff670005]"
          : "border-gray-100 dark:border-[#30363d] bg-gray-50 dark:bg-[#21262d]"}`}>
        <Video className={`w-5 h-5 flex-shrink-0 ${hasValue ? "text-[#ff6700]" : "text-gray-400"}`} />
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
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-[#e11d48] flex-shrink-0">
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
      <div className="h-36 bg-white dark:bg-[#161b22] rounded-3xl animate-pulse border border-gray-100 dark:border-[#30363d]" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-56 bg-white dark:bg-[#161b22] rounded-3xl animate-pulse border border-gray-100 dark:border-[#30363d]" />
        ))}
      </div>
    </div>
  );
}

function SessionEvaluationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session");
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const t = (ar, en) => isAr ? ar : en;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // error = فشل التحميل (بيخفي الفورم) — submitError = فشل الحفظ (بيتعرض فوق زرار الإرسال من غير ما يخفي الفورم)
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [students, setStudents] = useState([]);
  const [decisions, setDecisions] = useState({});
  const [commentModal, setCommentModal] = useState(null);
  const [recordingLink, setRecordingLink] = useState("");
  const [submitSummary, setSubmitSummary] = useState(null);
  const [animateProgress, setAnimateProgress] = useState(false);
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [fly, setFly] = useState({ w: 1200, h: 800 });

  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [supervisorName, setSupervisorName] = useState("");

  // هل السيشن Offline؟ (الباك بيرجّع isOffline + deliveryMode بعد الـ fallback على الجروب)
  const isOfflineSession =
    sessionData?.isOffline === true ||
    sessionData?.deliveryMode === "offline";

  // هل هي حصة تعويضية؟
  const isComplimentary = sessionData?.isComplimentary === true;

  // الجروب على Hold → الرسائل متوقفة (التقييم والإكمال شغالين)
  const messagesSuppressed = sessionData?.messagesSuppressed === true;

  // كل الطلاب غايبين/معذورين → مفيش تقييمات، بس المدرس يقدر يكمّل الجلسة
  const allStudentsExcluded = sessionData?.allStudentsExcluded === true;

  const fetchData = useCallback(async () => {
    if (!sessionId) { setError(t("لم يتم تحديد جلسة", "No session specified")); setLoading(false); return; }
    try {
      setLoading(true); setError(""); setSubmitError("");
      const res = await fetch(`/api/instructor/sessions/${sessionId}/evaluation`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setSessionData(data.data.session);
        setStudents(data.data.students || []);

        setModuleTitle(data.data.session?.moduleTitle || "");
        setModuleDescription(data.data.session?.moduleDescription || "");
        setSupervisorName(data.data.supervisorName || "");

        setRecordingLink(data.data.session?.recordingLink || "");

        const existingDecisions = {};
        const existingRatings = {};
        const existingComments = {};
        (data.data.students || []).forEach((s) => {
          if (s.currentDecision) existingDecisions[s._id] = s.currentDecision;
          if (s.currentRatings) existingRatings[s._id] = {
            commitment: s.currentRatings.commitment || 3,
            understanding: s.currentRatings.understanding || 3,
            taskExecution: s.currentRatings.taskExecution || 3,
            participation: s.currentRatings.participation || 3,
          };
          if (s.currentComment) existingComments[s._id] = s.currentComment;
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
      [studentId]: { ...DEFAULT_RATINGS },
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
    // لو كل الطلاب غايبين/معذورين، الإرسال بـ evaluations فاضية مسموح (الباك بيقبلها في الحالة دي بس)
    if (filled.length === 0 && !allStudentsExcluded) return;
    try {
      setSubmitting(true);
      setSubmitError("");
      const evaluations = filled.map((studentId) => ({
        studentId,
        decision: decisions[studentId],
        // الباك بيتجاهله للـ offline، بس مفيش داعي نبعته
        recordingLink: isOfflineSession ? null : (recordingLink?.trim() || null),
        ratings: ratings[studentId] || { ...DEFAULT_RATINGS },
        comment: comments[studentId] || '',
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
        setFly({ w: window.innerWidth, h: window.innerHeight });
        setSuccess(true);
        setTimeout(() => router.push("/instructor/sessions"), 3000);
      } else {
        // فشل الحفظ مايخفيش الفورم ومايضيعش التقييمات اللي المدرس عملها
        setSubmitError(data.error || data.message || t("فشل الحفظ", "Failed to save"));
      }
    } catch { setSubmitError(t("خطأ في الاتصال", "Connection error")); }
    finally { setSubmitting(false); }
  };

  const filledCount = Object.keys(decisions).length;
  const stats = { pass: 0, review: 0, repeat: 0 };
  Object.values(decisions).forEach((d) => { if (stats[d] !== undefined) stats[d]++; });
  const progressPct = students.length > 0 ? Math.round((filledCount / students.length) * 100) : 0;

  // ── No session ──
  if (!sessionId) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb] dark:bg-[#0a0f17]" dir={isAr ? "rtl" : "ltr"}>
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-500/10 rounded-3xl flex items-center justify-center mb-4">
          <AlertCircle className="w-10 h-10 text-red-500 animate-pulse" />
        </div>
        <h3 className="text-lg font-black text-gray-900 dark:text-[#e6edf3] mb-2">{t("لم يتم تحديد جلسة", "No session specified")}</h3>
        <button onClick={() => router.push("/instructor/sessions")}
          className="mt-2 px-6 py-3 text-white rounded-2xl font-black shadow-lg hover:shadow-xl transition-all hover:scale-105"
          style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}>
          {t("العودة للجلسات", "Back to Sessions")}
        </button>
      </div>
    </div>
  );

  // ── Success: الطيارة بتطير والملخص في كروت زجاجية ──
  if (success) return (
    <div className="fixed inset-0 overflow-hidden flex items-center justify-center" dir={isAr ? "rtl" : "ltr"}
      style={{ background: "linear-gradient(135deg, #002a33 0%, #004d59 55%, #ff6700 100%)" }}>
      <FlightStyles />
      <EvalKeyframes />
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
      <PaperPlaneFlight w={fly.w} h={fly.h} startX={fly.w / 2} startY={fly.h * 0.62} delay={0.5} duration={1.3} />
      <div className="relative z-10 text-center px-6 text-white max-w-sm w-full">
        <div className="w-28 h-28 mx-auto mb-5 rounded-full bg-white/15 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-2xl"
          style={{ animation: "evalPop .7s .1s both cubic-bezier(.2,.9,.3,1.3)" }}>
          <CheckCheck className="w-14 h-14 text-white" />
        </div>
        <h2 className="text-2xl font-black mb-1.5" style={{ animation: "ppFadeUp .5s .35s both" }}>
          {t("تم إكمال الجلسة", "Session Completed")}
        </h2>
        <p className="text-sm text-white/80 font-bold" style={{ animation: "ppFadeUp .5s .5s both" }}>
          {sessionData?.title}
        </p>
        {submitSummary && (
          <div className="mt-5 grid grid-cols-3 gap-3" style={{ animation: "ppFadeUp .5s .65s both" }}>
            {[
              { value: submitSummary.evalSent, label: t("رسائل التقييم", "Eval Messages") },
              // الـ offline مفيهاش روابط تسجيل — بنعرض بدالها عدد ملخصات الجلسة
              {
                value: isOfflineSession ? submitSummary.blogSent : submitSummary.linkSent,
                label: isOfflineSession
                  ? t("ملخصات الجلسة", "Session Summaries")
                  : t("روابط التسجيل", "Recording Links"),
              },
              { value: submitSummary.skipped, label: t("تم تخطيه", "Skipped") },
            ].map((item, i) => (
              <div key={i} className="bg-white/15 backdrop-blur-sm rounded-3xl p-4 border border-white/25 shadow-lg">
                <p className="text-2xl font-black">{item.value}</p>
                <p className="text-[10px] text-white/75 font-bold mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-white/60 mt-5">{t("جاري التحويل...", "Redirecting...")}</p>
      </div>
    </div>
  );

  // ── Main ──
  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-[#0a0f17]" dir={isAr ? "rtl" : "ltr"}
      style={{ animation: "evalIn .6s backwards cubic-bezier(.2,.8,.2,1)" }}>
      <EvalKeyframes />

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
              style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}>
              <Star weight="fill" className="w-5 h-5 text-white" />
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
          <div className="relative group" style={stagger(0)}>
            <div className="absolute inset-0 rounded-3xl opacity-50 blur-md group-hover:opacity-75 transition-opacity duration-500"
              style={{ background: "linear-gradient(135deg, #004d59, #ff6700, #feaf00)" }} />
            <div className="relative rounded-3xl p-5 overflow-hidden shadow-lg"
              style={{ background: "linear-gradient(135deg, #004d59 0%, #004d59dd 40%, #ff6700 100%)" }}>
              <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
              <PaperPlane className="absolute -top-2 end-2 w-44 opacity-20 rotate-[-14deg] pointer-events-none" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-lg flex-shrink-0">
                  <BookOpen weight="fill" className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <span className="bg-white/20 text-white text-[10px] font-black px-2.5 py-1 rounded-full border border-white/30 flex items-center gap-1">
                      <Sparkles weight="fill" className="w-3 h-3 text-[#feaf00]" />{t("تقييم الأداء", "Performance Evaluation")}
                    </span>
                    <span className="bg-white/20 text-white text-[10px] font-black px-2.5 py-1 rounded-full border border-white/30 flex items-center gap-1">
                      {isOfflineSession ? <MapPin weight="fill" className="w-3 h-3" /> : <Video weight="fill" className="w-3 h-3" />}
                      {isOfflineSession ? t("حضوري", "On-site") : t("أونلاين", "Online")}
                    </span>
                    {isComplimentary && (
                      <span className="bg-white/20 text-white text-[10px] font-black px-2.5 py-1 rounded-full border border-white/30 flex items-center gap-1">
                        <Sparkles weight="fill" className="w-3 h-3" />{t("حصة تعويضية", "Make-up session")}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-black text-white truncate">{sessionData.title}</h2>
                  <p className="text-white/70 text-sm truncate">{sessionData.group?.name}</p>
                  {moduleTitle && (
                    <p className="text-white/60 text-xs mt-1 truncate flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />{moduleTitle}
                    </p>
                  )}
                  {supervisorName && (
                    <p className="text-white/60 text-xs truncate flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 flex-shrink-0" />{supervisorName}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-2xl px-3 py-2 border border-white/20">
                    <Users className="w-4 h-4 text-white" />
                    <span className="text-white font-black text-sm">
                      {filledCount}<span className="text-white/60 font-normal">/{students.length}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-2xl px-3 py-2 border border-white/20">
                    <TrendingUp className="w-4 h-4 text-white" />
                    <span className="text-white font-black text-sm">{progressPct}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-5 space-y-5 pb-40">

        {loading && <Skeleton />}

        {!loading && error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-3xl border border-red-200 dark:border-red-800/40 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
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
            <div className="bg-white dark:bg-[#161b22] rounded-3xl border border-gray-100 dark:border-[#30363d] p-4 sm:p-5 shadow-sm" style={stagger(1)}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md"
                  style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}>
                  <BarChart3 weight="fill" className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-gray-900 dark:text-[#e6edf3]">{t("ملخص التقييم", "Evaluation Summary")}</p>
                  <p className="text-[11px] text-gray-400 dark:text-[#6e7681]">{filledCount}/{students.length} {t("طالب", "students")}</p>
                </div>
                <div className="text-sm font-black">
                  {filledCount === students.length && students.length > 0
                    ? <span className="flex items-center gap-1" style={{ color: "#ff6700" }}>
                      <CheckCheck className="w-4 h-4" />{t("مكتمل", "Complete")}
                    </span>
                    : <span style={{ color: "#ff6700" }}>{progressPct}%</span>
                  }
                </div>
              </div>

              <div className="h-2.5 bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden mb-5">
                <div className="h-full rounded-full relative overflow-hidden transition-all duration-700"
                  style={{
                    width: `${progressPct}%`,
                    background: "linear-gradient(90deg, #004d59, #ff6700)",
                  }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {Object.entries(DECISIONS).map(([key, c], idx) => {
                  const Ico = c.icon;
                  return (
                    <div key={key}
                      className={`group/stat flex flex-col items-center gap-2 p-3 rounded-3xl border transition-all duration-500 hover:shadow-md hover:-translate-y-0.5
                        ${animateProgress ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
                      style={{ transitionDelay: `${idx * 80}ms`, borderColor: `${c.c1}40`, background: `${c.c1}0f` }}>
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md group-hover/stat:scale-110 transition-transform"
                        style={{ background: dGrad(c) }}>
                        <Ico weight="fill" className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-2xl font-black" style={{ color: c.c1 }}><AnimatedCounter value={stats[key]} /></span>
                      <span className="text-[10px] font-black text-center opacity-80" style={{ color: c.c1 }}>{isAr ? c.ar : c.en}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* تنبيه الـ Hold */}
            {messagesSuppressed && <HoldNotice isAr={isAr} style={stagger(2)} />}

            {/* Recording Link — للأونلاين بس (الـ Offline مفيش تسجيل) */}
            {!isOfflineSession && (
              <GlobalRecordingLinkCard
                value={recordingLink}
                onChange={setRecordingLink}
                isAr={isAr}
                disabled={submitting}
                style={stagger(2)}
              />
            )}

            {/* بادج لو السيشن Offline */}
            {isOfflineSession && (
              <div className="flex items-center gap-3 p-4 rounded-3xl bg-[#feaf00]/10 dark:bg-[#feaf00]/5 border border-[#feaf00]/30 dark:border-[#feaf00]/20" style={stagger(2)}>
                <div className="w-10 h-10 rounded-2xl bg-[#feaf00]/20 dark:bg-[#feaf00]/10 flex items-center justify-center flex-shrink-0 border border-[#feaf00]/30 dark:border-[#feaf00]/20">
                  <MapPin weight="fill" className="w-5 h-5 text-[#f67d00] dark:text-[#feaf00]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-[#f67d00] dark:text-[#feaf00]">
                    {t("جلسة Offline (حضورية)", "Offline Session")}
                  </p>
                  <p className="text-xs text-[#f67d00]/80 dark:text-[#feaf00]/70 mt-0.5 leading-relaxed">
                    {t(
                      "دي جلسة حضورية — مفيش لينك تسجيل، بس التقييم والرسائل شغالين عادي.",
                      "This is an on-site session — no recording link, but evaluation & messages work normally."
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Student cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {students.map((student, idx) => (
                <StudentEvalCard
                  key={student._id}
                  index={idx}
                  student={student}
                  decision={decisions[student._id] || null}
                  onSetDecision={handleSetDecision}
                  submitting={submitting}
                  ratings={ratings[student._id] || DEFAULT_RATINGS}
                  onRatingChange={handleRatingChange}
                  comment={comments[student._id] || ""}
                  onOpenComment={handleOpenComment}
                  isComplimentary={isComplimentary}
                  isAr={isAr}
                />
              ))}
            </div>
          </>
        )}

        {/* مفيش طلاب للتقييم — يا كل الطلاب غايبين/معذورين (يقدر يكمّل الجلسة) يا الجروب فاضي */}
        {!loading && !error && students.length === 0 && (
          <div className="space-y-4">
            {messagesSuppressed && <HoldNotice isAr={isAr} />}

            <div className="text-center py-16 bg-white dark:bg-[#161b22] rounded-3xl border border-gray-100 dark:border-[#30363d] shadow-sm" style={stagger(1)}>
              <div className="w-24 h-24 mx-auto bg-gray-100 dark:bg-[#21262d] rounded-3xl flex items-center justify-center mb-4">
                <Users className="w-12 h-12 text-gray-300 dark:text-[#6e7681]" />
              </div>
              <p className="text-gray-500 dark:text-[#8b949e] font-bold mb-4 px-4">
                {allStudentsExcluded
                  ? t("كل الطلاب غايبين أو معذورين — مفيش تقييمات", "All students absent/excused — nothing to evaluate")
                  : t("لا يوجد طلاب في هذا الجروب", "No students in this group")}
              </p>

              {allStudentsExcluded && (
                <>
                  {submitError && (
                    <div className="flex items-center justify-center gap-2 mx-auto mb-4 max-w-sm p-2.5 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800/40">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-xs font-bold text-red-600 dark:text-red-400">{submitError}</p>
                    </div>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="group/send inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-black text-white shadow-lg hover:shadow-xl hover:scale-[1.03] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}>
                    {submitting
                      ? <BusyLabel text={t("جاري الإكمال...", "Completing...")} />
                      : <><CheckCheck className="w-5 h-5" />{t("إكمال الجلسة", "Complete Session")}</>}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Submit Bar */}
      {!loading && !error && students.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-3 sm:p-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md rounded-3xl border border-gray-200 dark:border-[#30363d] p-3.5 shadow-2xl">
              {/* خطأ الحفظ — بيظهر هنا من غير ما يخفي الفورم */}
              {submitError && (
                <div className="flex items-center gap-2 mb-3 p-2.5 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800/40">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">{submitError}</p>
                </div>
              )}

              <div className="flex items-center gap-3" dir={isAr ? "rtl" : "ltr"}>
                <div className="relative w-11 h-11 flex-shrink-0">
                  <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
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
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black" style={{ color: "#ff6700" }}>
                    {progressPct}%
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-900 dark:text-[#e6edf3]">
                    {filledCount > 0
                      ? <span style={{ color: "#ff6700" }}>{filledCount} {t("طالب مقيَّم", "student(s) evaluated")}</span>
                      : <span className="text-gray-400 dark:text-[#6e7681] font-bold">{t("لا توجد تقييمات", "No evaluations yet")}</span>
                    }
                  </p>
                  {filledCount < students.length && filledCount > 0 && (
                    <p className="text-[11px] mt-0.5 font-bold text-gray-400 dark:text-[#6e7681]">
                      {students.length - filledCount} {t("لم يُقيَّموا بعد", "not evaluated yet")}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={filledCount === 0 || submitting}
                  className="group/send flex items-center gap-2 px-5 sm:px-6 py-3.5 rounded-2xl text-sm font-black text-white shadow-lg transition-all flex-shrink-0 hover:shadow-xl hover:scale-[1.03] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{ background: filledCount > 0 ? "linear-gradient(135deg, #004d59, #ff6700)" : "#d1d5db" }}>
                  {submitting
                    ? <BusyLabel text={t("جاري الإرسال...", "Sending...")} />
                    : <><PaperPlaneTilt weight="fill" className="w-5 h-5 transition-transform duration-300 group-hover/send:translate-x-1 group-hover/send:-translate-y-1" />{t("إكمال الجلسة وإرسال", "Complete & Send")}</>}
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

// ─── Interview evaluation ────────────────────────────────────────────────────

// ─── Reveal: الغطا بيتقفل ناحية الركن اللي الطيارة خرجت منه ──────────────────
function EvalReveal() {
  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      <style>{`
        @keyframes evalRevealOut {
          from { clip-path: circle(150vmax at 100% 0%); }
          to   { clip-path: circle(0px at 100% 0%); }
        }
        @keyframes evalIn { from { opacity: 0; transform: translateY(14px) scale(.99); } to { opacity: 1; transform: none; } }
        @keyframes evalCard {
          from { opacity: 0; transform: translateY(26px) rotateX(-10deg) scale(.97); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes evalPop {
          0% { transform: scale(.4) rotate(-12deg); opacity: 0; }
          65% { transform: scale(1.12) rotate(4deg); opacity: 1; }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
      `}</style>
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #004d59 0%, #004d59dd 35%, #ff6700 100%)",
          animation: "evalRevealOut .95s .15s cubic-bezier(.7,0,.2,1) forwards",
        }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
      </div>
    </div>
  );
}

// الـ stagger بتاع المقابلة (أبطأ شوية عشان الغطا بيتقفل الأول)
const ivStagger = (i) => ({ animation: `evalCard .65s ${0.55 + i * 0.09}s cubic-bezier(.2,.8,.2,1) both` });

function InterviewEvaluation({ interviewId }) {
  const router = useRouter();
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const t = (ar, en) => (isAr ? ar : en);
  const url = `/api/instructor/interviews/${interviewId}/evaluation`;

  const call = (method, body) =>
    fetch(url, {
      method, credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }).then((r) => r.json());

  const [info, setInfo] = useState(null);
  const [decision, setDecision] = useState(null);
  const [ratings, setRatings] = useState(DEFAULT_RATINGS);
  const [comment, setComment] = useState("");
  const [recordingLink, setRecordingLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [fly, setFly] = useState({ w: 1200, h: 800 });

  useEffect(() => {
    call("GET")
      .then((d) => {
        if (!d.success) return setErr(d.message || d.error || "Error");
        setInfo(d.data);
        if (d.data.evaluation) {
          setDecision(d.data.evaluation.decision);
          setComment(d.data.evaluation.instructorComment || "");
          const r = d.data.evaluation.ratings;
          if (r) setRatings({
            commitment: r.commitment || 3, understanding: r.understanding || 3,
            taskExecution: r.taskExecution || 3, participation: r.participation || 3,
          });
        }
        setRecordingLink(d.data.interview?.recordingLink || "");
      })
      .catch(() => setErr(t("خطأ في الاتصال", "Connection error")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId]);

  const handleRatingChange = (key, value) => setRatings((p) => ({ ...p, [key]: value }));

  const iv = info?.interview || {};
  const isOffline = iv.isOffline === true || iv.deliveryMode === "offline";
  const cfg = decision ? INTERVIEW_DECISIONS[decision] : null;
  const avg = Math.round(
    (INTERVIEW_RATING_ROWS.reduce((s, r) => s + (ratings[r.key] || 3), 0) / INTERVIEW_RATING_ROWS.length) * 10
  ) / 10;

  const submit = async () => {
    if (!decision) return;
    setBusy(true); setErr("");
    try {
      const payload = { decision, instructorComment: comment, ratings };
      if (!isOffline && recordingLink.trim()) payload.recordingLink = recordingLink.trim();
      const d = await call("PATCH", payload);
      if (d.success) {
        setFly({ w: window.innerWidth, h: window.innerHeight });
        setDone(true);
        setTimeout(() => router.push("/instructor/sessions"), 3000);
      } else {
        setErr(d.error || d.message || t("فشل الحفظ", "Failed to save"));
      }
    } catch {
      setErr(t("خطأ في الاتصال", "Connection error"));
    } finally {
      setBusy(false);
    }
  };

  // ── Loading / error ──
  if (!info) {
    return (
      <>
        <EvalReveal />
        <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb] dark:bg-[#0a0f17]" dir={isAr ? "rtl" : "ltr"}>
          {err ? (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800/40">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm font-bold text-red-700 dark:text-red-400">{err}</p>
            </div>
          ) : (
            <PaperPlaneLoader />
          )}
        </div>
      </>
    );
  }

  const hasLink = !!recordingLink.trim();
  const canSubmit = !!decision && !busy && info.canEvaluate;

  // ── Success: الطيارة بتطير بلون النتيجة ──
  if (done && cfg) {
    const SuccessIcon = cfg.icon;
    return (
      <div className="fixed inset-0 overflow-hidden flex items-center justify-center" dir={isAr ? "rtl" : "ltr"}
        style={{ background: `linear-gradient(135deg, #002a33 0%, ${cfg.c1} 70%, ${cfg.c2} 100%)` }}>
        <FlightStyles />
        <style>{`@keyframes evalPop { 0%{transform:scale(.4) rotate(-12deg);opacity:0} 65%{transform:scale(1.12) rotate(4deg);opacity:1} 100%{transform:scale(1) rotate(0);opacity:1} }`}</style>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <PaperPlaneFlight w={fly.w} h={fly.h} startX={fly.w / 2} startY={fly.h * 0.62} delay={0.5} duration={1.3} />
        <div className="relative z-10 text-center px-6 text-white">
          <div className="w-28 h-28 mx-auto mb-5 rounded-full bg-white/15 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-2xl"
            style={{ animation: "evalPop .7s .1s both cubic-bezier(.2,.9,.3,1.3)" }}>
            <SuccessIcon weight="fill" className="w-14 h-14 text-white" />
          </div>
          <h2 className="text-2xl font-black mb-1.5" style={{ animation: "ppFadeUp .5s .35s both" }}>
            {t("تم إرسال التقييم", "Evaluation sent")}
          </h2>
          <p className="text-sm text-white/80 font-bold" style={{ animation: "ppFadeUp .5s .5s both" }}>
            {isAr ? cfg.ar : cfg.en} · {info.student?.name}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <EvalReveal />
      <div className="min-h-screen bg-[#f8f9fb] dark:bg-[#0a0f17]" dir={isAr ? "rtl" : "ltr"}
        style={{ animation: "evalIn .7s .45s backwards cubic-bezier(.2,.8,.2,1)" }}>
        <FlightStyles />

        {/* Sticky Header */}
        <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md border-b border-gray-200 dark:border-[#30363d] shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => router.push("/instructor/sessions")}
              className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#21262d] flex items-center justify-center text-gray-500 transition-all flex-shrink-0 group hover:bg-[#ff670015] hover:text-[#ff6700]">
              {isAr
                ? <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                : <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />}
            </button>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
              style={{ background: cfg ? dGrad(cfg) : "linear-gradient(135deg, #004d59, #ff6700)" }}>
              <Briefcase weight="fill" className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-black text-sm text-gray-900 dark:text-[#e6edf3] truncate leading-none mb-0.5">
                {t("تقييم المقابلة", "Interview Evaluation")}
              </h1>
              <p className="text-xs text-gray-400 dark:text-[#6e7681] truncate">{info.student?.name}</p>
            </div>
            {cfg && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-black text-white px-3 py-1.5 rounded-xl shadow-md"
                style={{ background: dGrad(cfg) }}>
                <cfg.icon weight="fill" className="w-4 h-4" />{isAr ? cfg.ar : cfg.en}
              </span>
            )}
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 pt-5 pb-44 space-y-5">

          {/* Hero */}
          <div className="relative group" style={ivStagger(0)}>
            <div className="absolute inset-0 rounded-3xl opacity-50 blur-md group-hover:opacity-75 transition-opacity duration-500"
              style={{ background: "linear-gradient(135deg, #004d59, #ff6700, #feaf00)" }} />
            <div className="relative rounded-3xl p-5 overflow-hidden shadow-lg"
              style={{ background: "linear-gradient(135deg, #004d59 0%, #004d59dd 40%, #ff6700 100%)" }}>
              <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
              <PaperPlane className="absolute -top-2 end-2 w-44 opacity-20 rotate-[-14deg] pointer-events-none" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center text-2xl font-black text-white shadow-lg flex-shrink-0">
                  {(info.student?.name?.[0] || "?").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <span className="bg-white/20 text-white text-[10px] font-black px-2.5 py-1 rounded-full border border-white/30 flex items-center gap-1">
                      <Sparkles weight="fill" className="w-3 h-3 text-[#feaf00]" />{t("مقابلة", "Interview")}
                    </span>
                    <span className="bg-white/20 text-white text-[10px] font-black px-2.5 py-1 rounded-full border border-white/30 flex items-center gap-1">
                      {isOffline ? <MapPin className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                      {isOffline ? t("حضوري", "On-site") : t("أونلاين", "Online")}
                    </span>
                    <span className="bg-white/20 text-white text-[10px] font-black px-2.5 py-1 rounded-full border border-white/30 flex items-center gap-1">
                      <User className="w-3 h-3" />{info.student?.isAdult ? t("بالغ", "Adult") : t("طفل", "Kid")}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white truncate">{info.student?.name}</h2>
                  <p className="text-white/70 text-sm truncate">{iv.title}</p>
                </div>
              </div>
              {iv.scheduledDate && (
                <div className="relative z-10 flex flex-wrap gap-2 mt-4">
                  <span className="flex items-center gap-1.5 bg-white/10 text-white text-xs px-3 py-1.5 rounded-full border border-white/15">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(iv.scheduledDate).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                      weekday: "long", year: "numeric", month: "long", day: "numeric",
                    })}
                  </span>
                  {iv.startTime && (
                    <span className="flex items-center gap-1.5 bg-white/10 text-white text-xs px-3 py-1.5 rounded-full border border-white/15">
                      <Clock className="w-3.5 h-3.5" />{iv.startTime}{iv.endTime ? ` – ${iv.endTime}` : ""}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {!info.canEvaluate && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800/40">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-xs font-bold text-red-700 dark:text-red-400">
                {t("المقابلة دي مش متاحة للتقييم حاليًا", "This interview can't be evaluated right now")}
              </p>
            </div>
          )}

          {/* 1) النتيجة */}
          <div className="bg-white dark:bg-[#161b22] rounded-3xl border border-gray-100 dark:border-[#30363d] p-4 sm:p-5 shadow-sm" style={ivStagger(1)}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md"
                style={{ background: cfg ? dGrad(cfg) : "linear-gradient(135deg, #004d59, #ff6700)" }}>
                <BarChart3 weight="fill" className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-gray-900 dark:text-[#e6edf3]">{t("نتيجة المقابلة", "Interview result")}</p>
                <p className="text-[11px] text-gray-400 dark:text-[#6e7681]">{t("اختار نتيجة واحدة", "Pick one outcome")}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.entries(INTERVIEW_DECISIONS).map(([key, c]) => {
                const Ico = c.icon;
                const active = decision === key;
                return (
                  <button key={key} type="button" disabled={busy}
                    onClick={() => setDecision(active ? null : key)}
                    className={`relative flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2.5 p-4 rounded-3xl border-2 text-start transition-all duration-300 overflow-hidden active:scale-[.97] disabled:opacity-60
                      ${active ? "text-white border-transparent -translate-y-1 scale-[1.02]" : "hover:-translate-y-0.5 hover:shadow-lg"}`}
                    style={active
                      ? { background: dGrad(c), boxShadow: `0 18px 36px -12px ${c.c1}99` }
                      : { borderColor: `${c.c1}45`, background: `${c.c1}0f` }}>
                    {active && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-10 animate-shimmer" />}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md ${active ? "bg-white/20" : ""}`}
                      style={active ? undefined : { background: dGrad(c) }}>
                      <Ico weight="fill" className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 sm:flex-none min-w-0">
                      <p className="text-sm font-black leading-tight" style={active ? undefined : { color: c.c1 }}>
                        {isAr ? c.ar : c.en}
                      </p>
                      <p className={`text-[11px] mt-1 leading-snug ${active ? "text-white/85" : "text-gray-500 dark:text-[#8b949e]"}`}>
                        {isAr ? c.descAr : c.descEn}
                      </p>
                    </div>
                    {active && <CheckCircle2 weight="fill" className="w-5 h-5 flex-shrink-0 sm:absolute sm:top-2.5 sm:end-2.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2) تقييم الأداء */}
          {cfg && (
            <div className="bg-white dark:bg-[#161b22] rounded-3xl border overflow-hidden shadow-sm"
              style={{ borderColor: `${cfg.c1}40`, animation: "evalCard .5s both cubic-bezier(.2,.8,.2,1)" }}>
              <div className="h-1.5 w-full" style={{ background: dGrad(cfg) }} />
              <div className="p-4 sm:p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md" style={{ background: dGrad(cfg) }}>
                    <Star weight="fill" className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-gray-900 dark:text-[#e6edf3]">{t("تقييم الأداء", "Performance rating")}</p>
                    <p className="text-[11px] text-gray-400 dark:text-[#6e7681]">{t("من 1 لـ 5 لكل معيار", "1 to 5 for each criterion")}</p>
                  </div>
                  <div className="flex flex-col items-center px-3.5 py-1.5 rounded-2xl text-white shadow-md" style={{ background: dGrad(cfg) }}>
                    <span className="text-lg font-black leading-none">{avg}</span>
                    <span className="text-[9px] font-bold opacity-80">{t("المتوسط", "avg")}</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {INTERVIEW_RATING_ROWS.map((r) => {
                    const RIco = r.icon;
                    const v = ratings[r.key] || 3;
                    return (
                      <div key={r.key} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-[#21262d] border border-gray-100 dark:border-[#30363d]">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: `${cfg.c1}1a`, color: cfg.c1 }}>
                          <RIco className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-gray-700 dark:text-[#c9d1d9] truncate">{isAr ? r.ar : r.en}</p>
                          <p className="text-[11px] font-bold" style={{ color: cfg.c1 }}>{RATING_WORDS[isAr ? "ar" : "en"][v]}</p>
                        </div>
                        <ColorStars value={v} color={cfg.c1} disabled={busy} onChange={(val) => handleRatingChange(r.key, val)} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 3) التعليق */}
          <div className="bg-white dark:bg-[#161b22] rounded-3xl border border-gray-100 dark:border-[#30363d] p-4 sm:p-5 shadow-sm" style={ivStagger(2)}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md"
                style={{ background: "linear-gradient(135deg, #feaf00, #f67d00)" }}>
                <MessageSquarePlus weight="fill" className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-gray-900 dark:text-[#e6edf3]">{t("تعليق المُقابِل", "Interviewer comment")}</p>
                <p className="text-[11px] text-gray-400 dark:text-[#6e7681]">{t("اختياري", "Optional")}</p>
              </div>
              <span className={`text-[11px] font-black ${500 - comment.length < 30 ? "text-[#e11d48]" : "text-gray-400 dark:text-[#6e7681]"}`}>
                {comment.length}/500
              </span>
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              rows={5} disabled={busy} dir={isAr ? "rtl" : "ltr"}
              placeholder={t("اكتب ملاحظاتك عن المقابلة هنا...", "Write your notes about the interview...")}
              className="w-full text-sm rounded-2xl border-2 px-4 py-3.5 resize-none outline-none transition-all bg-gray-50 dark:bg-[#21262d] text-gray-800 dark:text-[#e6edf3] placeholder-gray-400 font-medium leading-relaxed border-gray-100 dark:border-[#30363d] focus:border-[#ff670060]"
            />
          </div>

          {/* 4) لينك التسجيل */}
          {!isOffline ? (
            <div className={`bg-white dark:bg-[#161b22] rounded-3xl border p-4 sm:p-5 shadow-sm transition-all ${hasLink ? "border-[#004d5950] dark:border-[#ff670050]" : "border-gray-100 dark:border-[#30363d]"}`}
              style={ivStagger(3)}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #004d59, #0e7c8c)" }}>
                  <Link2 weight="bold" className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-900 dark:text-[#e6edf3]">{t("لينك تسجيل المقابلة", "Interview recording link")}</p>
                  <p className="text-[11px] text-gray-400 dark:text-[#6e7681]">{t("اختياري", "Optional")}</p>
                </div>
                {hasLink && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                    <Check className="w-3 h-3" />{t("جاهز", "Ready")}
                  </span>
                )}
              </div>
              <div className={`flex items-center gap-2 px-3 py-3 rounded-2xl border transition-all ${hasLink ? "border-[#004d5940] dark:border-[#ff670040] bg-[#004d5905]" : "border-gray-100 dark:border-[#30363d] bg-gray-50 dark:bg-[#21262d]"}`}>
                <Video className={`w-5 h-5 flex-shrink-0 ${hasLink ? "text-[#ff6700]" : "text-gray-400"}`} />
                <input type="url" value={recordingLink} onChange={(e) => setRecordingLink(e.target.value)}
                  disabled={busy} dir="ltr" placeholder={t("الصق لينك التسجيل هنا...", "Paste recording link here...")}
                  className="flex-1 bg-transparent text-sm text-gray-700 dark:text-[#c9d1d9] placeholder-gray-400 outline-none min-w-0 font-mono" />
                {hasLink && (
                  <button onClick={() => setRecordingLink("")} disabled={busy}
                    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-[#e11d48] flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-3xl bg-[#feaf00]/10 border border-[#feaf00]/30" style={ivStagger(3)}>
              <div className="w-10 h-10 rounded-2xl bg-[#feaf00]/20 flex items-center justify-center flex-shrink-0 border border-[#feaf00]/30">
                <MapPin weight="fill" className="w-5 h-5 text-[#f67d00] dark:text-[#feaf00]" />
              </div>
              <div>
                <p className="text-sm font-black text-[#f67d00] dark:text-[#feaf00]">{t("مقابلة حضورية", "On-site interview")}</p>
                <p className="text-xs text-[#f67d00]/80 dark:text-[#feaf00]/70 mt-0.5">{t("مفيش لينك تسجيل — التقييم بس.", "No recording link — evaluation only.")}</p>
              </div>
            </div>
          )}

          {err && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800/40">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-xs font-bold text-red-600 dark:text-red-400">{err}</p>
            </div>
          )}
        </div>

        {/* Sticky submit bar */}
        <div className="fixed bottom-0 left-0 right-0 z-30 p-3 sm:p-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md rounded-3xl border border-gray-200 dark:border-[#30363d] p-3.5 shadow-2xl flex items-center gap-3">
              <div className="flex-1 min-w-0">
                {cfg ? (
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0" style={{ background: dGrad(cfg) }}>
                      <cfg.icon weight="fill" className="w-6 h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black truncate" style={{ color: cfg.c1 }}>{isAr ? cfg.ar : cfg.en}</p>
                      <p className="text-[11px] text-gray-400 dark:text-[#6e7681] flex items-center gap-1">
                        <Star weight="fill" className="w-3 h-3 text-[#feaf00]" />{avg} / 5
                      </p>
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400 dark:text-[#6e7681] font-bold">{t("اختار النتيجة الأول", "Pick a result first")}</span>
                )}
              </div>
              <button onClick={submit} disabled={!canSubmit}
                className="group/send flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-black text-white shadow-lg transition-all flex-shrink-0 hover:shadow-xl hover:scale-[1.03] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ background: cfg && !!decision && info.canEvaluate ? dGrad(cfg) : "#d1d5db" }}>
                {busy
                  ? <BusyLabel text={t("جاري الإرسال...", "Sending...")} />
                  : <><PaperPlaneTilt weight="fill" className="w-5 h-5 transition-transform duration-300 group-hover/send:translate-x-1 group-hover/send:-translate-y-1" />{t("حفظ وإرسال التقييم", "Save & send")}</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Entry ───────────────────────────────────────────────────────────────────
export default function InstructorEvaluationPage() {
  const sp = useSearchParams();
  const interviewId = sp.get("interview");
  return interviewId
    ? <InterviewEvaluation interviewId={interviewId} />
    : <SessionEvaluationPage />;
}