"use client";
// src/app/instructor/evaluation/page.jsx

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle2, X, AlertCircle, Loader2, Send, Eye,
  ChevronRight, ChevronLeft, CheckCheck, Users, Star,
  RotateCcw, BookOpen, Info, Phone, User, CreditCard,
  MessageCircle, PlayCircle, Zap, RefreshCw, ArrowRight,
  Video, Sparkles, TrendingUp, BarChart3, ClipboardList,
} from "lucide-react";
import { useLocale } from "@/app/context/LocaleContext";

// ─── Config ───────────────────────────────────────────────────────────────────
const DECISIONS = {
  pass: {
    ar: "ممتاز ✅", en: "Pass ✅",
    descAr: "فاهم المحتوى وأداؤه ممتاز",
    descEn: "Understands content, excellent performance",
    icon: CheckCircle2,
    bg: "bg-emerald-500",
    gradient: "from-emerald-400 to-teal-500",
    light: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-400 dark:border-emerald-600",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  review: {
    ar: "يحتاج مراجعة ⚠️", en: "Needs Review ⚠️",
    descAr: "أداؤه جيد لكن يحتاج تعزيز",
    descEn: "Good but needs reinforcement",
    icon: BookOpen,
    bg: "bg-amber-500",
    gradient: "from-amber-400 to-orange-500",
    light: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-400 dark:border-amber-600",
    text: "text-amber-700 dark:text-amber-400",
  },
  repeat: {
    ar: "يحتاج دعم إضافي 🔄", en: "Needs Support 🔄",
    descAr: "يحتاج وقتاً إضافياً لاستيعاب المحتوى",
    descEn: "Needs more time to absorb content",
    icon: RotateCcw,
    bg: "bg-red-500",
    gradient: "from-red-400 to-rose-500",
    light: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-400 dark:border-red-600",
    text: "text-red-700 dark:text-red-400",
  },
};

const ATTENDANCE_BADGE = {
  present:  { ar: "حاضر",       en: "Present",  color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/40" },
  late:     { ar: "متأخر",      en: "Late",     color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/40" },
  absent:   { ar: "غائب",       en: "Absent",   color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/40" },
  excused:  { ar: "بعذر",       en: "Excused",  color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/40" },
  null:     { ar: "لم يُسجَّل", en: "N/A",      color: "text-gray-500 bg-gray-50 border-gray-200 dark:bg-[#21262d] dark:border-[#30363d]" },
};

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

// ─── Message Preview Modal ────────────────────────────────────────────────────
function MessagePreviewModal({ student, decision, sessionId, isAr, onClose, onConfirm }) {
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const cfg = DECISIONS[decision];
  const t = (ar, en) => isAr ? ar : en;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/instructor/sessions/${sessionId}/evaluation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ studentId: student._id, decision }),
        });
        const data = await res.json();
        if (data.success) setPreview(data.data);
        else setError(data.error || t("فشل تحميل الرسالة", "Failed to load message"));
      } catch { setError(t("خطأ في الاتصال", "Connection error")); }
      finally { setLoading(false); }
    })();
  }, [student._id, decision, sessionId]);

  const lang = preview?.lang || "ar";
  const msgIsAr = lang === "ar";

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" dir={isAr ? "rtl" : "ltr"}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[90vh] bg-white dark:bg-[#161b22] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header — gradient like dashboard */}
        <div className={`relative bg-gradient-to-br ${cfg.gradient} p-5 overflow-hidden flex-shrink-0`}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center flex-shrink-0 shadow-lg">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white">{t("معاينة رسالة التقييم", "Evaluation Message Preview")}</p>
              <p className="text-xs text-white/70 truncate">{student.name} · {isAr ? cfg.ar : cfg.en}</p>
            </div>
            <div className="flex items-center gap-2">
              {preview && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 text-white border border-white/20">
                  {lang === "ar" ? "🇸🇦 عربي" : "🇬🇧 English"}
                </span>
              )}
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
                <Loader2 className="w-7 h-7 text-white animate-spin" />
              </div>
              <p className="text-sm text-gray-400 dark:text-[#8b949e]">{t("جاري تحميل الرسالة...", "Loading message...")}</p>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800/40">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
          {!loading && !error && preview && (
            <>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#21262d] rounded-xl border border-gray-100 dark:border-[#30363d]">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shadow-sm">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-700 dark:text-[#c9d1d9]">
                    {t("إلى: ولي الأمر", "To: Guardian")} — {preview.guardianName || preview.guardianPhone}
                  </p>
                  {preview.guardianPhone && (
                    <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" /> {preview.guardianPhone}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-[#dcf8c6] dark:bg-[#1a3a2a] rounded-2xl rounded-tl-sm p-4 shadow-sm border border-[#c5e8a3] dark:border-[#2d5a3d]">
                <p className="text-[13px] text-gray-800 dark:text-[#d1fae5] leading-relaxed whitespace-pre-wrap font-medium" dir={msgIsAr ? "rtl" : "ltr"}>
                  {preview.content}
                </p>
                <div className="flex items-center justify-end gap-1 mt-2 opacity-60">
                  <span className="text-[10px] text-gray-500">WhatsApp</span>
                  <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                </div>
              </div>

              {preview.isFallback && (
                <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800/30">
                  <Info className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    {t("قالب افتراضي — لا يوجد قالب مخصص في الداتابيز", "Default template — no custom template in DB")}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-gray-100 dark:border-[#30363d]">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-bold bg-gray-100 dark:bg-[#21262d] text-gray-700 dark:text-[#8b949e] hover:bg-gray-200 dark:hover:bg-[#30363d] transition-all">
            {t("إلغاء", "Cancel")}
          </button>
          <button
            onClick={() => onConfirm(student._id, decision)}
            disabled={loading || !!error}
            className={`flex-1 py-3 rounded-xl text-sm font-black text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r ${cfg.gradient}`}>
            <Send className="w-4 h-4" />
            {t("تأكيد القرار", "Confirm Decision")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Student Eval Card ────────────────────────────────────────────────────────
function StudentEvalCard({ student, decision, onSetDecision, onPreview, submitting, recordingLink, onRecordingLinkChange, isAr }) {
  const cfg = decision ? DECISIONS[decision] : null;
  const Icon = cfg?.icon;
  const att = ATTENDANCE_BADGE[student.attendanceStatus] || ATTENDANCE_BADGE[null];
  const t = (ar, en) => isAr ? ar : en;

  return (
    <div className={`group/card relative bg-white dark:bg-[#161b22] rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5
      ${cfg ? `${cfg.border} shadow-lg` : "border-gray-100 dark:border-[#30363d] shadow-sm hover:border-gray-200 dark:hover:border-[#3d444d]"}`}>

      {/* Top gradient bar */}
      {cfg && <div className={`h-1 w-full bg-gradient-to-r ${cfg.gradient}`} />}

      {/* Hover glow — pointer-events-none so buttons stay clickable */}
      <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover/card:opacity-5 transition-opacity duration-300 pointer-events-none
        ${cfg ? cfg.gradient : "from-primary to-purple-600"}`} />

      <div className="relative z-10 p-4">
        {/* Student info row */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-base flex-shrink-0 shadow-md transition-transform duration-300 group-hover/card:scale-110
            ${cfg ? `bg-gradient-to-br ${cfg.gradient} text-white` : "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-[#21262d] dark:to-[#30363d] text-gray-500 dark:text-[#8b949e]"}`}>
            {cfg ? <Icon className="w-5 h-5" /> : (student.name?.[0] || "?").toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-black text-sm text-gray-900 dark:text-[#e6edf3] truncate mb-1.5">{student.name}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${att.color}`}>
                {isAr ? att.ar : att.en}
              </span>
              {student.credits !== undefined && (
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border
                  ${student.credits <= 0   ? "text-gray-400 bg-gray-50 border-gray-200 dark:bg-[#21262d] dark:border-[#30363d]" :
                    student.credits <= 2   ? "text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/40" :
                    student.credits <= 5   ? "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/40" :
                    "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/40"}`}>
                  <CreditCard className="w-3 h-3" />
                  {student.credits <= 0 ? t("رصيد صفر", "Zero Credits") : `${student.credits} ${t("ساعة", "hrs")}`}
                </span>
              )}
              {(student.credits ?? 0) <= 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#21262d] text-gray-400 border border-gray-200 dark:border-[#30363d]">
                  🔕 {t("لن تُرسل رسالة", "No message")}
                </span>
              )}
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
                    ? `bg-gradient-to-br ${c.gradient} text-white shadow-lg scale-[0.97]`
                    : `${c.light} ${c.text} border ${c.border} hover:shadow-md hover:-translate-y-0.5`}`}>
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-10 animate-shimmer" />
                )}
                <BtnIcon className="w-4 h-4" />
                <span className="text-center leading-tight">{isAr ? c.ar : c.en}</span>
              </button>
            );
          })}
        </div>

        {/* Preview button */}
        {cfg && (student.credits ?? 0) > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(student, decision); }}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-gray-50 dark:bg-[#21262d] text-gray-600 dark:text-[#8b949e] border border-gray-100 dark:border-[#30363d] hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all group/preview">
            <Eye className="w-3.5 h-3.5 group-hover/preview:scale-110 transition-transform" />
            {t("معاينة رسالة ولي الأمر", "Preview Parent Message")}
          </button>
        )}

        {cfg && (student.credits ?? 0) <= 0 && (
          <div className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs bg-gray-50 dark:bg-[#21262d] text-gray-400 border border-gray-100 dark:border-[#30363d]">
            🔕 {t("لن تُرسل رسالة — رصيد صفر", "No message — zero credits")}
          </div>
        )}

        {/* Recording link input */}
        {cfg && (student.credits ?? 0) > 0 && (
          <div className="mt-2.5">
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all
              ${recordingLink
                ? "border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/10"
                : "border-gray-100 dark:border-[#30363d] bg-gray-50 dark:bg-[#21262d]"}`}>
              <Video className={`w-3.5 h-3.5 flex-shrink-0 ${recordingLink ? "text-blue-500" : "text-gray-400"}`} />
              <input
                type="url"
                value={recordingLink || ""}
                onChange={(e) => onRecordingLinkChange(student._id, e.target.value)}
                disabled={submitting}
                placeholder={t("رابط التسجيل (اختياري)", "Recording link (optional)")}
                dir="ltr"
                className="flex-1 bg-transparent text-xs text-gray-700 dark:text-[#c9d1d9] placeholder-gray-400 outline-none min-w-0 font-mono"
              />
              {recordingLink && (
                <button
                  onClick={() => onRecordingLinkChange(student._id, "")}
                  className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-red-400 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {recordingLink && (
              <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-1 px-1">
                ✓ {t("سيُرسَل اللينك كرسالة منفصلة بعد رسالة التقييم", "Link will be sent separately after evaluation message")}
              </p>
            )}
          </div>
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
  const [previewModal, setPreviewModal] = useState(null);
  const [recordingLinks, setRecordingLinks] = useState({});
  const [submitSummary, setSubmitSummary]   = useState(null);
  const [animateProgress, setAnimateProgress] = useState(false);

  const fetchData = useCallback(async () => {
    if (!sessionId) { setError(t("لم يتم تحديد جلسة", "No session specified")); setLoading(false); return; }
    try {
      setLoading(true); setError("");
      const res = await fetch(`/api/instructor/sessions/${sessionId}/evaluation`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setSessionData(data.data.session);
        setStudents(data.data.students || []);
        const existing = {};
        (data.data.students || []).forEach((s) => { if (s.currentDecision) existing[s._id] = s.currentDecision; });
        setDecisions(existing);
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
  }, []);

  const handlePreview = useCallback((student, decision) => setPreviewModal({ student, decision }), []);
  const handleRecordingLinkChange = useCallback((studentId, url) => {
    setRecordingLinks((prev) => ({ ...prev, [studentId]: url }));
  }, []);
  const handleConfirmFromModal = useCallback((studentId, decision) => {
    setDecisions((prev) => ({ ...prev, [studentId]: decision }));
    setPreviewModal(null);
  }, []);

  const handleSubmit = async () => {
    const filled = Object.keys(decisions);
    if (filled.length === 0) return;
    try {
      setSubmitting(true);
      const evaluations = filled.map((studentId) => ({
        studentId,
        decision: decisions[studentId],
        recordingLink: recordingLinks[studentId] || null,
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22]" dir={isAr ? "rtl" : "ltr"}>
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-10 h-10 text-red-500 animate-pulse" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-[#e6edf3] mb-2">{t("لم يتم تحديد جلسة", "No session specified")}</h3>
        <button onClick={() => router.push("/instructor/sessions")}
          className="mt-2 px-6 py-3 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105">
          {t("العودة للجلسات", "Back to Sessions")}
        </button>
      </div>
    </div>
  );

  // ── Success ──
  if (success) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22]" dir={isAr ? "rtl" : "ltr"}>
      <div className="text-center px-6 max-w-sm w-full">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full opacity-20 blur-xl animate-pulse" />
          <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-2xl">
            <CheckCheck className="w-12 h-12 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-[#e6edf3] mb-2">
          {t("تم إكمال الجلسة! 🎉", "Session Completed! 🎉")}
        </h2>
        {submitSummary && (
          <div className="mt-4 mb-4 grid grid-cols-3 gap-3">
            {[
              { value: submitSummary.evalSent, label: t("رسائل التقييم", "Eval Messages"), color: "text-emerald-500" },
              { value: submitSummary.linkSent, label: t("روابط التسجيل", "Recording Links"), color: "text-blue-500" },
              { value: submitSummary.skipped,  label: t("تم تخطيه", "Skipped"),           color: "text-gray-400" },
            ].map((item, i) => (
              <div key={i} className="bg-white dark:bg-[#161b22] rounded-2xl p-4 border border-gray-100 dark:border-[#30363d] shadow-sm">
                <p className={`text-2xl font-black ${item.color}`}>{item.value}</p>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22]" dir={isAr ? "rtl" : "ltr"}>

      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md border-b border-gray-200 dark:border-[#30363d] shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/instructor/sessions")}
              className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#21262d] flex items-center justify-center text-gray-500 hover:text-primary hover:bg-primary/10 transition-all flex-shrink-0 group">
              {isAr
                ? <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                : <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />}
            </button>

            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-md">
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
                  <p className="text-xs text-gray-400 dark:text-[#6e7681] truncate">{sessionData.group?.name}</p>
                </>
              ) : (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>

            {!loading && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800/30">
                  <Users className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-black text-amber-600 dark:text-amber-400">{students.length}</span>
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

      {/* Hero Banner */}
      {sessionData && !loading && (
        <div className="max-w-4xl mx-auto px-4 pt-5">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 rounded-3xl opacity-60 blur-md group-hover:opacity-80 transition-opacity duration-500" />
            <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-pink-500 rounded-3xl p-5 overflow-hidden shadow-lg">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl" />
              <div className="relative z-10 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="w-4 h-4 text-yellow-200 animate-pulse" />
                    <span className="text-yellow-200 font-medium text-xs">{t("تقييم الأداء", "Performance Evaluation")}</span>
                  </div>
                  <h2 className="text-xl font-black text-white mb-1">{sessionData.title}</h2>
                  <p className="text-orange-100 text-sm">{sessionData.group?.name}</p>
                </div>
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
            {/* Progress Summary — same style as attendance SummaryBar */}
            <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] p-5 shadow-lg dark:shadow-black/40">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-[#e6edf3]">{t("ملخص التقييم", "Evaluation Summary")}</p>
                  <p className="text-xs text-gray-500 dark:text-[#8b949e]">{filledCount}/{students.length} {t("طالب", "students")}</p>
                </div>
                <div className={`text-sm font-black ${filledCount === students.length && students.length > 0 ? "text-emerald-500" : "text-primary"}`}>
                  {filledCount === students.length && students.length > 0
                    ? <span className="flex items-center gap-1"><CheckCheck className="w-4 h-4" />{t("مكتمل", "Complete")}</span>
                    : `${Math.round(students.length > 0 ? (filledCount / students.length) * 100 : 0)}%`
                  }
                </div>
              </div>

              <div className="h-2.5 bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden mb-5">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 relative overflow-hidden transition-all duration-700"
                  style={{ width: `${students.length > 0 ? (filledCount / students.length) * 100 : 0}%` }}>
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
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${c.gradient} flex items-center justify-center shadow-sm group-hover/stat:scale-110 transition-transform`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className={`text-2xl font-black ${c.text}`}><AnimatedCounter value={stats[key]} /></span>
                      <span className={`text-[9px] font-bold ${c.text} opacity-80 text-center`}>{isAr ? c.ar : c.en}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recording link notice */}
            {sessionData?.recordingLink && (
              <div className="flex items-center gap-3 p-4 bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md flex-shrink-0">
                  <PlayCircle className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs text-gray-600 dark:text-[#8b949e] flex-1 leading-relaxed">
                  {t("رابط التسجيل سيُضاف تلقائياً في كل رسالة تلخيص أداء", "Recording link will be added automatically to each message")}
                </p>
                <a href={sessionData.recordingLink} target="_blank" rel="noreferrer"
                  className="text-xs font-bold text-emerald-600 hover:underline flex-shrink-0 px-2 py-1 rounded-lg hover:bg-emerald-50 transition-all">
                  {t("معاينة", "Preview")}
                </a>
              </div>
            )}

            {/* Student cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {students.map((student) => (
                <StudentEvalCard
                  key={student._id}
                  student={student}
                  decision={decisions[student._id] || null}
                  onSetDecision={handleSetDecision}
                  onPreview={handlePreview}
                  submitting={submitting}
                  recordingLink={recordingLinks[student._id] || ""}
                  onRecordingLinkChange={handleRecordingLinkChange}
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
                      ? <span className="text-amber-500">{filledCount} {t("طالب مقيَّم", "student(s) evaluated")}</span>
                      : <span className="text-gray-400 dark:text-[#6e7681]">{t("لا توجد تقييمات", "No evaluations yet")}</span>
                    }
                  </p>
                  {filledCount < students.length && filledCount > 0 && (
                    <p className="text-xs text-amber-500 mt-0.5">
                      {students.length - filledCount} {t("لم يُقيَّموا بعد", "not evaluated yet")}
                    </p>
                  )}
                </div>

                {/* Progress ring */}
                <div className="relative w-10 h-10 flex-shrink-0">
                  <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-100 dark:text-[#21262d]" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke="url(#gradEval)" strokeWidth="3"
                      strokeDasharray={`${students.length > 0 ? (filledCount / students.length) * 94 : 0} 94`}
                      strokeLinecap="round" />
                    <defs>
                      <linearGradient id="gradEval" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#f97316" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-amber-500">
                    {students.length > 0 ? Math.round((filledCount / students.length) * 100) : 0}%
                  </span>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={filledCount === 0 || submitting}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black text-white shadow-lg transition-all flex-shrink-0
                    ${filledCount > 0 && !submitting
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-xl hover:scale-[1.02]"
                      : "bg-gray-300 dark:bg-[#30363d] cursor-not-allowed"}`}>
                  {submitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" />{t("جاري الإرسال...", "Sending...")}</>
                    : <><Zap className="w-4 h-4" />{t("إكمال الجلسة وإرسال", "Complete & Send")}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewModal && (
        <MessagePreviewModal
          student={previewModal.student}
          decision={previewModal.decision}
          sessionId={sessionId}
          isAr={isAr}
          onClose={() => setPreviewModal(null)}
          onConfirm={handleConfirmFromModal}
        />
      )}

      <style jsx>{`
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-shimmer { animation: shimmer 2s infinite; }
      `}</style>
    </div>
  );
}