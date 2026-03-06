"use client";
// src/app/instructor/evaluation/page.jsx

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle2, X, AlertCircle, Loader2, Send, Eye,
  ChevronRight, ChevronLeft, CheckCheck, Users, Star,
  RotateCcw, BookOpen, Info, Phone, User, CreditCard,
  MessageCircle, PlayCircle, Zap, RefreshCw, ArrowRight,
  Link, Video,
} from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────
const DECISIONS = {
  pass: {
    ar: "ممتاز ✅", en: "Pass ✅",
    descAr: "فاهم المحتوى وأداؤه ممتاز",
    descEn: "Understands content, excellent performance",
    icon: CheckCircle2,
    bg: "bg-emerald-500",
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
    light: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-400 dark:border-red-600",
    text: "text-red-700 dark:text-red-400",
  },
};

const ATTENDANCE_BADGE = {
  present:  { ar: "حاضر",    en: "Present",  color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  late:     { ar: "متأخر",   en: "Late",     color: "text-amber-600 bg-amber-50 border-amber-200" },
  absent:   { ar: "غائب",    en: "Absent",   color: "text-red-600 bg-red-50 border-red-200" },
  excused:  { ar: "بعذر",    en: "Excused",  color: "text-blue-600 bg-blue-50 border-blue-200" },
  null:     { ar: "لم يُسجَّل", en: "N/A",  color: "text-gray-500 bg-gray-50 border-gray-200" },
};

// ─── Message Preview Modal ────────────────────────────────────────────────────
function MessagePreviewModal({ student, decision, sessionId, onClose, onConfirm }) {
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const cfg = DECISIONS[decision];

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
        else setError(data.error || "فشل تحميل الرسالة");
      } catch { setError("خطأ في الاتصال"); }
      finally { setLoading(false); }
    })();
  }, [student._id, decision, sessionId]);

  const lang = preview?.lang || "ar";
  const isAr = lang === "ar";

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" dir={isAr ? "rtl" : "ltr"}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[90vh] bg-white dark:bg-[#161b22] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className={`flex items-center gap-3 p-4 border-b border-gray-100 dark:border-[#30363d] ${cfg.light}`}>
          <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0 shadow`}>
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-black ${cfg.text}`}>معاينة رسالة التقييم</p>
            <p className="text-xs text-gray-500 dark:text-[#8b949e] truncate">{student.name} · {isAr ? cfg.ar : cfg.en}</p>
          </div>
          <div className="flex items-center gap-2">
            {preview && (
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${cfg.light} ${cfg.text} ${cfg.border} border`}>
                {lang === "ar" ? "🇸🇦 عربي" : "🇬🇧 English"}
              </span>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#21262d] flex items-center justify-center">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-gray-400">جاري تحميل الرسالة...</p>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
          {!loading && !error && preview && (
            <>
              {/* To */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-[#21262d] rounded-xl">
                <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-700 dark:text-[#c9d1d9]">
                    {isAr ? "إلى: ولي الأمر" : "To: Guardian"} — {preview.guardianName || student.guardianPhone}
                  </p>
                  {preview.guardianPhone && (
                    <p className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {preview.guardianPhone}
                    </p>
                  )}
                </div>
              </div>

              {/* WhatsApp bubble */}
              <div className="bg-[#dcf8c6] dark:bg-[#1a3a2a] rounded-2xl rounded-tl-sm p-4 shadow-sm border border-[#c5e8a3] dark:border-[#2d5a3d]">
                <p className="text-[13px] text-gray-800 dark:text-[#d1fae5] leading-relaxed whitespace-pre-wrap" dir={isAr ? "rtl" : "ltr"}>
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
                    قالب افتراضي — لا يوجد قالب مخصص في الداتابيز
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-gray-100 dark:border-[#30363d]">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gray-100 dark:bg-[#21262d] text-gray-700 dark:text-[#8b949e]">
            إلغاء
          </button>
          <button
            onClick={() => onConfirm(student._id, decision)}
            disabled={loading || !!error}
            className={`flex-1 py-2.5 rounded-xl text-sm font-black text-white shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 ${cfg.bg}`}>
            <Send className="w-4 h-4" />
            تأكيد القرار
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Student Card ─────────────────────────────────────────────────────────────
function StudentEvalCard({ student, decision, onSetDecision, onPreview, submitting, recordingLink, onRecordingLinkChange }) {
  const cfg = decision ? DECISIONS[decision] : null;
  const Icon = cfg?.icon;
  const att = ATTENDANCE_BADGE[student.attendanceStatus] || ATTENDANCE_BADGE[null];

  return (
    <div className={`bg-white dark:bg-[#161b22] rounded-2xl border overflow-hidden transition-all duration-200
      ${cfg ? `${cfg.border} shadow-md` : "border-gray-100 dark:border-[#30363d]"}`}>
      {/* Decision color bar */}
      {cfg && <div className={`h-1 w-full ${cfg.bg}`} />}

      <div className="p-4">
        {/* Student info row */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-base flex-shrink-0 shadow-sm
            ${cfg ? `${cfg.bg} text-white` : "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-[#21262d] dark:to-[#30363d] text-gray-500"}`}>
            {cfg ? <Icon className="w-5 h-5" /> : (student.name?.[0] || "?").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm text-gray-900 dark:text-[#e6edf3] truncate">{student.name}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {/* Attendance badge */}
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${att.color}`}>
                {att.ar}
              </span>
              {/* Credits */}
              {student.credits !== undefined && (
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border
                  ${student.credits <= 0   ? "text-gray-400 bg-gray-50 border-gray-200 dark:bg-[#21262d] dark:border-[#30363d]" :
                    student.credits <= 2   ? "text-red-600 bg-red-50 border-red-200" :
                    student.credits <= 5   ? "text-amber-600 bg-amber-50 border-amber-200" :
                    "text-emerald-600 bg-emerald-50 border-emerald-200"}`}>
                  <CreditCard className="w-3 h-3" />
                  {student.credits <= 0 ? "رصيد صفر" : `${student.credits} ساعة`}
                </span>
              )}
              {/* تحذير: رصيد صفر → الرسالة لن تُرسل */}
              {(student.credits ?? 0) <= 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#21262d] text-gray-400 border border-gray-200 dark:border-[#30363d]">
                  🔕 لن تُرسل رسالة
                </span>
              )}
            </div>
          </div>
          {cfg && (
            <span className={`text-[10px] font-black px-2.5 py-1.5 rounded-xl flex-shrink-0 ${cfg.light} ${cfg.text}`}>
              {cfg.ar}
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
                className={`flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl text-[11px] font-bold transition-all disabled:opacity-50 active:scale-95
                  ${isActive
                    ? `${c.bg} text-white shadow-md`
                    : `${c.light} ${c.text} border ${c.border} hover:shadow-sm`}`}>
                <BtnIcon className="w-4 h-4" />
                <span className="text-center leading-tight">{c.ar}</span>
              </button>
            );
          })}
        </div>

        {/* Preview button — مخفي لو رصيد صفر */}
        {cfg && (student.credits ?? 0) > 0 && (
          <button
            onClick={() => onPreview(student, decision)}
            disabled={submitting}
            className="mt-2.5 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold
              bg-gray-50 dark:bg-[#21262d] text-gray-600 dark:text-[#8b949e] border border-gray-100 dark:border-[#30363d]
              hover:border-primary/40 hover:text-primary transition-all disabled:opacity-50">
            <Eye className="w-3.5 h-3.5" />
            معاينة رسالة ولي الأمر
          </button>
        )}
        {cfg && (student.credits ?? 0) <= 0 && (
          <div className="mt-2.5 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs
            bg-gray-50 dark:bg-[#21262d] text-gray-400 border border-gray-100 dark:border-[#30363d]">
            🔕 لن تُرسل رسالة — رصيد صفر
          </div>
        )}

        {/* Recording link input — يظهر دايماً لو اتاخد قرار */}
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
                placeholder="رابط التسجيل (اختياري) — سيُرسَل كرسالة منفصلة"
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
                ✓ سيُرسَل اللينك كرسالة منفصلة بعد رسالة التقييم
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InstructorEvaluationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session");

  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [students, setStudents]     = useState([]);
  const [decisions, setDecisions]   = useState({}); // { studentId: 'pass'|'review'|'repeat' }
  const [previewModal, setPreviewModal] = useState(null); // { student, decision }
  const [recordingLinks, setRecordingLinks] = useState({}); // { studentId: url }
  const [submitSummary, setSubmitSummary] = useState(null); // { evalSent, linkSent, skipped }

  // ── Load data ──
  const fetchData = useCallback(async () => {
    if (!sessionId) { setError("لم يتم تحديد جلسة"); setLoading(false); return; }
    try {
      setLoading(true); setError("");
      const res = await fetch(`/api/instructor/sessions/${sessionId}/evaluation`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setSessionData(data.data.session);
        setStudents(data.data.students || []);
        // pre-fill existing decisions
        const existing = {};
        (data.data.students || []).forEach((s) => { if (s.currentDecision) existing[s._id] = s.currentDecision; });
        setDecisions(existing);
      } else {
        setError(data.message || data.error || "فشل التحميل");
      }
    } catch { setError("خطأ في الاتصال"); }
    finally { setLoading(false); }
  }, [sessionId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Handlers ──
  const handleSetDecision = useCallback((studentId, decision) => {
    setDecisions((prev) => {
      // click same → unset
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
        setError(data.error || data.message || "فشل الحفظ");
      }
    } catch { setError("خطأ في الاتصال"); }
    finally { setSubmitting(false); }
  };

  // ── Derived stats ──
  const filledCount = Object.keys(decisions).length;
  const stats = { pass: 0, review: 0, repeat: 0 };
  Object.values(decisions).forEach((d) => { if (stats[d] !== undefined) stats[d]++; });

  // ─── Empty/no session ──────────────────────────────────────────────────────
  if (!sessionId) return (
    <div className="min-h-screen flex items-center justify-center" dir="rtl">
      <div className="text-center">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <p className="text-gray-500 font-medium">لم يتم تحديد جلسة</p>
        <button onClick={() => router.push("/instructor/sessions")}
          className="mt-4 px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm">
          العودة للجلسات
        </button>
      </div>
    </div>
  );

  // ─── Success screen ────────────────────────────────────────────────────────
  if (success) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0d1117]" dir="rtl">
      <div className="text-center px-6 max-w-sm w-full">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mb-5 shadow-xl">
          <CheckCheck className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-xl font-black text-gray-900 dark:text-[#e6edf3] mb-2">تم إكمال الجلسة! 🎉</h2>
        {submitSummary && (
          <div className="mt-3 mb-4 grid grid-cols-3 gap-2">
            <div className="bg-white dark:bg-[#161b22] rounded-xl p-3 border border-gray-100 dark:border-[#30363d]">
              <p className="text-lg font-black text-emerald-500">{submitSummary.evalSent}</p>
              <p className="text-[10px] text-gray-400">رسائل التقييم</p>
            </div>
            <div className="bg-white dark:bg-[#161b22] rounded-xl p-3 border border-gray-100 dark:border-[#30363d]">
              <p className="text-lg font-black text-blue-500">{submitSummary.linkSent}</p>
              <p className="text-[10px] text-gray-400">روابط التسجيل</p>
            </div>
            <div className="bg-white dark:bg-[#161b22] rounded-xl p-3 border border-gray-100 dark:border-[#30363d]">
              <p className="text-lg font-black text-gray-400">{submitSummary.skipped}</p>
              <p className="text-[10px] text-gray-400">تم تخطيه</p>
            </div>
          </div>
        )}
        <p className="text-xs text-gray-400">جاري التحويل...</p>
      </div>
    </div>
  );

  // ─── Main ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22]" dir="rtl">

      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md border-b border-gray-200 dark:border-[#30363d] shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/instructor/sessions")}
              className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#21262d] flex items-center justify-center text-gray-500 hover:text-primary transition-colors flex-shrink-0">
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="h-4 w-48 bg-gray-200 dark:bg-[#30363d] rounded animate-pulse" />
              ) : sessionData ? (
                <>
                  <h1 className="font-black text-sm text-gray-900 dark:text-[#e6edf3] truncate flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    تقييم الطلاب — {sessionData.title}
                  </h1>
                  <p className="text-xs text-gray-400 dark:text-[#6e7681]">{sessionData.group?.name}</p>
                </>
              ) : (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>
            {!loading && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-[#21262d] rounded-xl flex-shrink-0">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm font-black text-gray-700 dark:text-[#c9d1d9]">{students.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4 pb-36">

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-40 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse border border-gray-100 dark:border-[#30363d]" />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm font-bold text-red-700 dark:text-red-400 flex-1">{error}</p>
            <button onClick={fetchData} className="flex items-center gap-1 text-xs font-bold text-red-600 hover:underline">
              <RefreshCw className="w-3 h-3" /> إعادة
            </button>
          </div>
        )}

        {!loading && !error && students.length > 0 && (
          <>
            {/* Progress summary */}
            <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 dark:text-[#8b949e]">
                  {filledCount}/{students.length} طالب
                </span>
                <span className={`text-xs font-black ${filledCount === students.length ? "text-emerald-500" : "text-primary"}`}>
                  {filledCount === students.length ? "✓ اكتمل التقييم" : `${Math.round((filledCount / students.length) * 100)}%`}
                </span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden mb-3">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                  style={{ width: `${students.length > 0 ? (filledCount / students.length) * 100 : 0}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(DECISIONS).map(([key, c]) => {
                  const Icon = c.icon;
                  return (
                    <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${c.light} border ${c.border}`}>
                      <Icon className={`w-4 h-4 flex-shrink-0 ${c.text}`} />
                      <span className={`text-base font-black ${c.text}`}>{stats[key]}</span>
                      <span className={`text-[10px] ${c.text} opacity-70 hidden sm:block truncate`}>{c.ar}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recording link */}
            {sessionData?.recordingLink && (
              <div className="flex items-center gap-2.5 p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-200 dark:border-emerald-800/30">
                <PlayCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <p className="text-xs text-emerald-700 dark:text-emerald-400 flex-1">
                  رابط التسجيل سيُضاف تلقائياً في كل رسالة تلخيص أداء
                </p>
                <a href={sessionData.recordingLink} target="_blank" rel="noreferrer"
                  className="text-xs font-bold text-emerald-600 hover:underline flex-shrink-0">
                  معاينة
                </a>
              </div>
            )}

            {/* Info */}
            <div className="flex items-start gap-2.5 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800/30">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                اختر قرار لكل طالب — ستُرسَل رسالة تلخيص أداء تلقائياً لولي أمره عند الحفظ، وستُكتمل الجلسة وتُضاف ساعتان لرصيدك.
              </p>
            </div>

            {/* Student cards */}
            <div className="space-y-3">
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
                />
              ))}
            </div>
          </>
        )}

        {/* Empty */}
        {!loading && !error && students.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d]">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">لا يوجد طلاب في هذا الجروب</p>
          </div>
        )}
      </div>

      {/* Sticky submit bar */}
      {!loading && !error && students.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-3 sm:p-4">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-[#30363d] p-3 shadow-xl" dir="rtl">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-700 dark:text-[#c9d1d9]">
                    {filledCount}/{students.length} طالب مقيَّم
                  </p>
                  {filledCount < students.length && filledCount > 0 && (
                    <p className="text-[11px] text-amber-500">
                      {students.length - filledCount} لم يُقيَّموا بعد
                    </p>
                  )}
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={filledCount === 0 || submitting}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black text-white shadow-lg transition-all flex-shrink-0
                    ${filledCount > 0 && !submitting
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-xl hover:scale-[1.02] active:scale-95"
                      : "bg-gray-300 dark:bg-[#30363d] cursor-not-allowed"}`}>
                  {submitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</>
                    : <><Zap className="w-4 h-4" /> إكمال الجلسة وإرسال</>}
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
          onClose={() => setPreviewModal(null)}
          onConfirm={handleConfirmFromModal}
        />
      )}
    </div>
  );
}