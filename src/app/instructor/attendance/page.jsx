"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle2, X, Clock, AlertCircle, UserCheck, UserX,
  Send, Eye, ChevronRight, ChevronLeft, Loader2,
  MessageSquare, Users, Calendar, CheckCheck,
  ClipboardList, Zap, ArrowLeft, RefreshCw, Info,
  Phone, User, CreditCard, AlertTriangle, MessageCircle,
  BookOpen, ShieldCheck, Hash, Globe
} from "lucide-react";

// ─── Status Config ──────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  present: {
    labelAr: "حاضر",
    labelEn: "Present",
    icon: CheckCircle2,
    color: "emerald",
    bg: "bg-emerald-500",
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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg max-h-[90vh] bg-white dark:bg-[#161b22] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className={`flex items-center gap-3 p-4 border-b border-gray-100 dark:border-[#30363d] ${cfg.lightBg}`}>
          <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0 shadow`}>
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-black ${cfg.text}`}>
              {t("معاينة الرسالة", "Message Preview", isAr)}
            </p>
            <p className="text-xs text-gray-500 dark:text-[#8b949e] truncate">
              {student.name} · {t(cfg.labelAr, cfg.labelEn, isAr)}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${cfg.lightBg} ${cfg.text} ${cfg.border} border`}>
              {lang === "ar" ? "🇸🇦 عربي" : "🇬🇧 English"}
            </span>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#21262d] flex items-center justify-center hover:bg-gray-200 transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-gray-400">{t("جاري تحميل القالب...", "Loading template...", isAr)}</p>
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
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-700 dark:text-[#c9d1d9]">
                    {t("إلى: ولي الأمر", "To: Guardian", isAr)}
                  </p>
                  {student.guardianPhone && (
                    <p className="text-xs text-gray-400 dark:text-[#6e7681] flex items-center gap-1">
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
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">{t("لا توجد رسالة لهذا الطالب", "No message for this student", isAr)}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-gray-100 dark:border-[#30363d]">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gray-100 dark:bg-[#21262d] text-gray-700 dark:text-[#8b949e] hover:bg-gray-200 transition-colors">
            {t("إلغاء", "Cancel", isAr)}
          </button>
          <button
            onClick={() => onConfirm(student._id, attendanceStatus)}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-black text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${cfg.bg}`}>
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
    <div className={`relative bg-white dark:bg-[#161b22] rounded-2xl border transition-all duration-200 overflow-hidden
      ${isSet
        ? `${cfg.border} shadow-md`
        : "border-gray-100 dark:border-[#30363d] hover:border-gray-200 dark:hover:border-[#3d444d]"}`}>

      {isSet && <div className={`h-1 w-full ${cfg.bg}`} />}

      <div className="p-3.5">
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 shadow-sm
            ${isSet ? `${cfg.bg} text-white` : "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-[#21262d] dark:to-[#30363d] text-gray-500 dark:text-[#8b949e]"}`}>
            {isSet
              ? React.createElement(cfg.icon, { className: "w-4 h-4" })
              : (student.name?.[0] || "?").toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-gray-900 dark:text-[#e6edf3] truncate">{student.name}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {student.credits !== undefined && (
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full
                  ${student.credits <= 2
                    ? "bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-200 dark:border-red-800/40"
                    : student.credits <= 5
                      ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 border border-amber-200 dark:border-amber-800/40"
                      : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-200 dark:border-emerald-800/40"}`}>
                  <CreditCard className="w-3 h-3" />
                  {student.credits} {t("ساعة", "hrs", isAr)}
                </span>
              )}
              {student.absenceCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-red-500 dark:text-red-400 font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  {student.absenceCount}x
                </span>
              )}
            </div>
          </div>

          {isSet && (
            <span className={`text-[10px] font-black px-2 py-1 rounded-full flex-shrink-0 ${cfg.lightBg} ${cfg.text}`}>
              {t(cfg.labelAr, cfg.labelEn, isAr)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {STATUS_ORDER.map((status) => {
            const c = STATUS_CONFIG[status];
            const Icon = c.icon;
            const isActive = currentStatus === status;
            return (
              <button
                key={status}
                disabled={submitting}
                onClick={() => onSetStatus(student._id, status)}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-[10px] font-bold transition-all duration-150 disabled:opacity-50
                  ${isActive
                    ? `${c.bg} text-white shadow-md scale-[0.97]`
                    : `bg-gray-50 dark:bg-[#21262d] ${c.text} hover:${c.lightBg} border border-gray-100 dark:border-[#30363d] hover:border-opacity-60`}`}>
                <Icon className="w-3.5 h-3.5" />
                <span>{t(c.labelAr, c.labelEn, isAr)}</span>
              </button>
            );
          })}
        </div>

        {isSet && SEND_STATUSES.includes(currentStatus) && (
          <button
            onClick={() => onPreview(student, currentStatus)}
            disabled={submitting}
            className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold bg-gray-50 dark:bg-[#21262d] text-gray-600 dark:text-[#8b949e] border border-gray-100 dark:border-[#30363d] hover:border-primary/40 hover:text-primary transition-all disabled:opacity-50">
            <Eye className="w-3.5 h-3.5" />
            {t("معاينة رسالة ولي الأمر", "Preview Parent Message", isAr)}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Summary Bar ─────────────────────────────────────────────────────────────
function SummaryBar({ attendance, total, isAr }) {
  const counts = { present: 0, absent: 0, late: 0, excused: 0 };
  Object.values(attendance).forEach((s) => { if (counts[s] !== undefined) counts[s]++; });
  const filled = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-600 dark:text-[#8b949e]">
          {filled}/{total} {t("طالب", "students", isAr)}
        </span>
        <span className={`text-xs font-black ${filled === total ? "text-emerald-500" : "text-primary"}`}>
          {filled === total ? t("✓ اكتمل", "✓ Complete", isAr) : `${Math.round((filled / total) * 100)}%`}
        </span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-primary to-purple-600"
          style={{ width: `${total > 0 ? (filled / total) * 100 : 0}%` }}
        />
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {STATUS_ORDER.map((s) => {
          const c = STATUS_CONFIG[s];
          const Icon = c.icon;
          return (
            <div key={s} className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl ${c.lightBg} border ${c.border}`}>
              <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${c.text}`} />
              <span className={`text-sm font-black ${c.text}`}>{counts[s]}</span>
              <span className={`text-[10px] font-medium ${c.text} opacity-70 hidden sm:block`}>
                {t(c.labelAr, c.labelEn, isAr)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function InstructorAttendancePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session");
  const isAr = true;

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

  // ✅ الحالة المحفوظة في DB — بنستخدمها لمقارنة التغييرات قبل الإرسال
  const savedStatusRef = useRef({});

  // ── Fetch session data ──
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

        // ✅ بنحفظ الحالة الموجودة في DB في ref
        const existing = {};
        (data.data.students || []).forEach((s) => {
          if (s.currentStatus) existing[s._id] = s.currentStatus;
        });

        savedStatusRef.current = { ...existing };
        setAttendance(existing);
      } else {
        setError(data.message || t("فشل تحميل البيانات", "Failed to load data", isAr));
      }
    } catch {
      setError(t("خطأ في الاتصال بالسيرفر", "Server connection error", isAr));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Set status for a student ──
  const handleSetStatus = useCallback((studentId, status) => {
    setAttendance((prev) => {
      // لو ضغط على نفس الحالة المختارة حالياً → شيل الاختيار
      if (prev[studentId] === status) {
        const next = { ...prev };
        delete next[studentId];
        return next;
      }
      return { ...prev, [studentId]: status };
    });
  }, []);

  // ── Open preview modal ──
  const handlePreview = useCallback((student, status) => {
    setPreviewModal({ student, status });
  }, []);

  // ── Confirm single student from modal ──
  const handleConfirmSingle = useCallback(async (studentId, status) => {
    setPreviewModal(null);
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  }, []);

  // ── Submit attendance ──
  const handleSubmit = async () => {
    if (Object.keys(attendance).length === 0) return;

    try {
      setSubmitting(true);

      // ✅ FIX: بنبعت بس الطلاب اللي حالتهم اتغيرت فعلاً عن اللي محفوظ في DB
      // ده بيمنع الـ refund الخطأ لما المدرس يفتح سيشن تانية ويعمل غائب لطالب
      // كان حاضر في سيشن قبلها (لأن الـ backend كان بيشوف present→absent = refund)
      const records = Object.entries(attendance)
        .filter(([studentId, status]) => {
          const savedStatus = savedStatusRef.current[studentId] || null;
          // بعت الطالب بس لو:
          // 1. حالته اتغيرت عن اللي في DB
          // 2. أو مفيش له record في DB أصلاً وعايز تسجله
          return savedStatus !== status;
        })
        .map(([studentId, status]) => ({ studentId, status }));

      console.log(`📤 Sending ${records.length} changed records (out of ${Object.keys(attendance).length} total)`);

      // لو مفيش تغييرات حقيقية — اعتبرها نجاح وروّح
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
        // ✅ بعد النجاح، حدّث الـ savedStatusRef بالحالة الجديدة
        // عشان لو المدرس بعت تاني يبقى الـ diff صح
        savedStatusRef.current = { ...attendance };
        setSuccess(true);
        setTimeout(() => {
          router.push(`/instructor/evaluation?session=${sessionId}`);
        }, 2000);
      } else {
        setError(data.error || t("فشل حفظ الحضور", "Failed to save attendance", isAr));
      }
    } catch {
      setError(t("خطأ في الاتصال", "Connection error", isAr));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Mark all ──
  const markAll = (status) => {
    const next = {};
    students.forEach((s) => { next[s._id] = status; });
    setAttendance(next);
  };

  // ── Filtered students ──
  const filteredStudents = students.filter((s) => {
    const matchSearch = !search || s.name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filterStatus === "all" ||
      attendance[s._id] === filterStatus ||
      (filterStatus === "unset" && !attendance[s._id]);
    return matchSearch && matchFilter;
  });

  // ✅ عدد التغييرات الحقيقية (مش كل الـ attendance)
  const changedCount = Object.entries(attendance).filter(
    ([studentId, status]) => (savedStatusRef.current[studentId] || null) !== status
  ).length;

  const filledCount = Object.keys(attendance).length;
  const allFilled = filledCount === students.length && students.length > 0;

  // ── Render ──
  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0d1117]" dir="rtl">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-gray-500">لم يتم تحديد جلسة</p>
          <button onClick={() => router.push("/instructor/sessions")}
            className="mt-4 px-6 py-2.5 bg-primary text-white rounded-xl font-bold">
            العودة للجلسات
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0d1117]" dir={isAr ? "rtl" : "ltr"}>
        <div className="text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mb-4 shadow-xl">
            <CheckCheck className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-[#e6edf3] mb-2">
            {t("تم حفظ الحضور!", "Attendance Saved!", isAr)}
          </h2>
          <p className="text-sm text-gray-400">
            {t("جاري التحويل...", "Redirecting...", isAr)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22]" dir={isAr ? "rtl" : "ltr"}>

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md border-b border-gray-200 dark:border-[#30363d] shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/instructor/sessions")}
              className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#21262d] flex items-center justify-center text-gray-500 hover:text-primary hover:bg-gray-200 transition-colors flex-shrink-0">
              {isAr ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>

            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="h-4 w-40 bg-gray-200 dark:bg-[#30363d] rounded animate-pulse" />
              ) : sessionData ? (
                <>
                  <h1 className="font-black text-sm text-gray-900 dark:text-[#e6edf3] truncate flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-primary flex-shrink-0" />
                    {sessionData.title}
                  </h1>
                  <p className="text-xs text-gray-400 dark:text-[#6e7681] truncate">
                    {sessionData.group?.name} · {fmtDate(sessionData.scheduledDate, isAr)} · {fmtTime(sessionData.startTime, isAr)}
                  </p>
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

      {/* ── Main Content ── */}
      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">

        {loading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse border border-gray-100 dark:border-[#30363d]" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800/40">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-700 dark:text-red-400">{error}</p>
            </div>
            <button onClick={fetchData} className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />{t("إعادة", "Retry", isAr)}
            </button>
          </div>
        )}

        {!loading && !error && students.length > 0 && (
          <>
            <SummaryBar attendance={attendance} total={students.length} isAr={isAr} />

            {/* Quick actions */}
            <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] p-3">
              <p className="text-xs font-bold text-gray-500 dark:text-[#8b949e] mb-2 px-1">
                {t("تحديد الكل كـ:", "Mark all as:", isAr)}
              </p>
              <div className="flex gap-2 flex-wrap">
                {STATUS_ORDER.map((s) => {
                  const c = STATUS_CONFIG[s];
                  const Icon = c.icon;
                  return (
                    <button
                      key={s}
                      onClick={() => markAll(s)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${c.lightBg} ${c.text} border ${c.border} hover:opacity-80 transition-opacity`}>
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
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("ابحث عن طالب...", "Search student...", isAr)}
                  className={`w-full bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl ${isAr ? "pr-4 pl-4" : "pl-4 pr-4"} py-2.5 text-sm text-gray-900 dark:text-[#e6edf3] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60`}
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl px-3 py-2.5 text-sm text-gray-700 dark:text-[#8b949e] focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="all">{t("الكل", "All", isAr)}</option>
                <option value="unset">{t("لم يُحدد", "Unset", isAr)}</option>
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>{t(STATUS_CONFIG[s].labelAr, STATUS_CONFIG[s].labelEn, isAr)}</option>
                ))}
              </select>
            </div>

            {/* Credit deduction notice */}
            <div className="flex items-start gap-2.5 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800/30">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                {t(
                  "الحاضر والمتأخر: يُخصم ساعتان من الرصيد. الغائب والمعذور: لا خصم. رسائل WhatsApp تُرسل تلقائياً للغائب والمتأخر والمعذور.",
                  "Present & Late: 2 hours deducted. Absent & Excused: no deduction. WhatsApp sent automatically for Absent, Late, and Excused.",
                  isAr
                )}
              </p>
            </div>

            {/* Student cards */}
            <div className="space-y-3">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8 bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d]">
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

            {/* Submit button */}
            <div className="sticky bottom-0 pt-3 pb-4">
              <div className="bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-[#30363d] p-3 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-[#8b949e]">
                      {/* ✅ بنعرض عدد التغييرات الحقيقية مش كل الـ attendance */}
                      {changedCount > 0
                        ? `${changedCount} ${t("تغيير جديد", "new change(s)", isAr)}`
                        : t("لا توجد تغييرات", "No changes", isAr)
                      }
                    </p>
                    {!allFilled && filledCount > 0 && (
                      <p className="text-[11px] text-amber-500">
                        {students.length - filledCount} {t("لم يُحدد", "unset", isAr)}
                      </p>
                    )}
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
          <div className="text-center py-16 bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d]">
            <Users className="w-16 h-16 text-gray-300 dark:text-[#6e7681] mx-auto mb-4" />
            <p className="text-gray-500 font-medium">{t("لا يوجد طلاب في هذه الجلسة", "No students in this session", isAr)}</p>
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
    </div>
  );
}