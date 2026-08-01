"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle2, X, Clock, AlertCircle, UserCheck, UserX,
  ChevronRight, ChevronLeft, Loader2,
  Users, Calendar, CheckCheck,
  ClipboardList, Zap, ArrowLeft, ArrowRight, RefreshCw, Info,
  Phone, CreditCard, AlertTriangle,
  BookOpen, ShieldCheck, Hash, Globe, Sparkles, TrendingUp,
  BarChart3, Bell, Star, ListChecks
} from "lucide-react";
import { useLocale } from "@/app/context/LocaleContext";

// ─── Status Config ──────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  present: {
    labelAr: "حاضر", labelEn: "Present", icon: CheckCircle2,
    color: "emerald", bg: "bg-emerald-500", gradient: "from-emerald-400 to-teal-500",
    lightBg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-400 dark:border-emerald-600",
    text: "text-emerald-700 dark:text-emerald-400", ring: "ring-emerald-400",
    sendMessage: false,
  },
  absent: {
    labelAr: "غائب", labelEn: "Absent", icon: UserX,
    color: "red", bg: "bg-red-500", gradient: "from-red-400 to-rose-500",
    lightBg: "bg-red-50 dark:bg-red-900/20", border: "border-red-400 dark:border-red-600",
    text: "text-red-700 dark:text-red-400", ring: "ring-red-400",
    sendMessage: true,
  },
  // ✅ "late" لسه موجودة عشان: (أ) خطوة الحضور المبدئي بتستخدمها، (ب) عرض
  // أي سجلات قديمة كانت اتسجلت "متأخر" قبل التحديث ده. مفيش زرار "متأخر" في
  // خطوة التأكيد النهائي دلوقتي — راجع FINAL_STATUS_ORDER تحت.
  late: {
    labelAr: "متأخر", labelEn: "Late", icon: Clock,
    color: "amber", bg: "bg-amber-500", gradient: "from-amber-400 to-orange-500",
    lightBg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-400 dark:border-amber-600",
    text: "text-amber-700 dark:text-amber-400", ring: "ring-amber-400",
    sendMessage: false,
  },
  excused: {
    labelAr: "معذور", labelEn: "Excused", icon: ShieldCheck,
    color: "blue", bg: "bg-blue-500", gradient: "from-blue-400 to-indigo-500",
    lightBg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-400 dark:border-blue-600",
    text: "text-blue-700 dark:text-blue-400", ring: "ring-blue-400",
    sendMessage: true,
  },
};

// 🆕 المرحلة النهائية (بعد "التالي") — 3 أزرار بس، ودول اللي بيخصموا الساعتين
// (الـ backend أصلاً بيخصم من present/absent/excused كلهم — مفيش تعديل لازم هناك)
const FINAL_STATUS_ORDER = ["present", "absent", "excused"];

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

// ══════════════════════════════════════════════════════════════════════════
// 🆕 المرحلة 1: الحضور المبدئي — design مختلف تمامًا (list بسيط، زرارين بس)
// مفيش أي اتصال بالـ backend هنا، ومفيش أي خصم — تسجيل سريع محلي بس
// ══════════════════════════════════════════════════════════════════════════
function RollCallCard({ student, status, onSetStatus, isAr, sendStatus }) {
  const isPresent = status === "present";
  const isLate = status === "late";

  return (
    <div className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-200
      ${isPresent
        ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/40"
        : isLate
          ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/40"
          : "bg-white dark:bg-[#161b22] border-gray-100 dark:border-[#30363d]"}`}>

      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 transition-colors
        ${isPresent
          ? "bg-emerald-500 text-white"
          : isLate
            ? "bg-amber-500 text-white"
            : "bg-gray-100 dark:bg-[#21262d] text-gray-400 dark:text-[#6e7681]"}`}>
        {(student.name?.[0] || "?").toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-gray-900 dark:text-[#e6edf3] truncate">
          {student.name}
        </p>
        {/* 🆕 مؤشر إرسال رسالة التأخير */}
        {isLate && sendStatus && (
          <p className="text-[10px] font-bold flex items-center gap-1 mt-0.5">
            {sendStatus === "sending" && (
              <span className="flex items-center gap-1 text-amber-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                {t("جاري إرسال تنبيه التأخير...", "Sending late notice...", isAr)}
              </span>
            )}
            {sendStatus === "sent" && (
              <span className="flex items-center gap-1 text-emerald-500">
                <CheckCheck className="w-3 h-3" />
                {t("تم إرسال تنبيه التأخير", "Late notice sent", isAr)}
              </span>
            )}
            {sendStatus === "error" && (
              <span className="flex items-center gap-1 text-red-500">
                <AlertCircle className="w-3 h-3" />
                {t("فشل الإرسال", "Send failed", isAr)}
              </span>
            )}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={() => onSetStatus(student._id, "present")}
          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all
            ${isPresent
              ? "bg-emerald-500 text-white shadow-md scale-105"
              : "bg-gray-100 dark:bg-[#21262d] text-gray-500 dark:text-[#8b949e] hover:bg-emerald-100 dark:hover:bg-emerald-900/20"}`}>
          {t("حاضر", "Present", isAr)}
        </button>
        <button
          onClick={() => onSetStatus(student._id, "late")}
          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all
            ${isLate
              ? "bg-amber-500 text-white shadow-md scale-105"
              : "bg-gray-100 dark:bg-[#21262d] text-gray-500 dark:text-[#8b949e] hover:bg-amber-100 dark:hover:bg-amber-900/20"}`}>
          {t("متأخر", "Late", isAr)}
        </button>
      </div>
    </div>
  );
}

function RollCallSummaryBar({ rollCall, total, isAr }) {
  const presentCount = Object.values(rollCall).filter((s) => s === "present").length;
  const lateCount = Object.values(rollCall).filter((s) => s === "late").length;
  const markedCount = presentCount + lateCount;
  const pct = total > 0 ? (markedCount / total) * 100 : 0;

  return (
    <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] p-4 shadow-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}>
            <ListChecks className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-[#e6edf3]">
              {t("الحضور المبدئي", "Initial Roll Call", isAr)}
            </p>
            <p className="text-xs text-gray-400 dark:text-[#6e7681]">
              {markedCount}/{total} {t("طالب", "students", isAr)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs font-black">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />{presentCount}
          </span>
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <Clock className="w-3.5 h-3.5" />{lateCount}
          </span>
        </div>
      </div>
      <div className="h-2 w-full bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg, #004d59, #ff6700)" }} />
      </div>
      <p className="text-[11px] text-gray-400 dark:text-[#6e7681] mt-2.5 leading-relaxed">
        {t(
          "دي خطوة سريعة بس للمتابعة — مفيش أي خصم ساعات هنا. الخصم بيحصل في خطوة تأكيد الحضور النهائي بعدها.",
          "This is just a quick tracking step — no hours are deducted here. Deduction happens in the final confirmation step next.",
          isAr
        )}
      </p>
    </div>
  );
}

// ─── Student Card (المرحلة النهائية) ─────────────────────────────────────────
function StudentCard({ student, attendance, onSetStatus, isAr, submitting }) {
  const currentStatus = attendance[student._id] || null;
  const cfg = currentStatus ? STATUS_CONFIG[currentStatus] : null;
  const isSet = !!currentStatus;

  return (
    <div className={`group/card relative bg-white dark:bg-[#161b22] rounded-2xl border transition-all duration-300 overflow-hidden hover:shadow-xl hover:-translate-y-0.5
      ${isSet
        ? `${cfg.border} shadow-lg`
        : "border-gray-100 dark:border-[#30363d] hover:border-gray-200 dark:hover:border-[#3d444d] shadow-sm"}`}>

      {isSet && <div className={`h-1 w-full bg-gradient-to-r ${cfg.gradient}`} />}

      {isSet && (
        <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover/card:opacity-5 transition-opacity duration-300 pointer-events-none ${cfg.gradient}`} />
      )}

      <div className="p-4">
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
              {student.absenceCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-xs text-red-500 dark:text-red-400 font-medium border border-red-100 dark:border-red-800/30">
                  <AlertTriangle className="w-3 h-3" />
                  {student.absenceCount}x {t("غياب", "absent", isAr)}
                </span>
              )}
              {student.rollCallStatus === "late" && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-600 dark:text-amber-400 font-medium border border-amber-100 dark:border-amber-800/30">
                  <Clock className="w-3 h-3" />
                  {t("كان متأخرًا في الحضور المبدئي", "Was late at roll call", isAr)}
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

        {/* ── أزرار الحالة: 3 بس (حاضر/غايب/معذور) ─────────────────────── */}
        <div className="grid grid-cols-3 gap-1.5">
          {FINAL_STATUS_ORDER.map((status) => {
            const c = STATUS_CONFIG[status];
            const Icon = c.icon;
            const isActive = currentStatus === status;
            return (
              <button
                key={status}
                disabled={submitting}
                onClick={() => onSetStatus(student._id, status)}
                title={t(c.labelAr, c.labelEn, isAr)}
                className={`relative flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-[10px] font-bold transition-all duration-200 disabled:opacity-50 overflow-hidden
                  ${isActive
                    ? `bg-gradient-to-br ${c.gradient} text-white shadow-lg scale-[0.97]`
                    : `bg-gray-50 dark:bg-[#21262d] ${c.text} hover:shadow-md border border-gray-100 dark:border-[#30363d] hover:border-opacity-60 hover:-translate-y-0.5`}`}>
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-10 animate-shimmer" />
                )}
                <Icon className="w-4 h-4" />
                <span className="leading-none text-center">{t(c.labelAr, c.labelEn, isAr)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Summary Bar (المرحلة النهائية) ──────────────────────────────────────────
function SummaryBar({ attendance, total, isAr, animateProgress }) {
  const counts = { present: 0, absent: 0, excused: 0 };
  Object.values(attendance).forEach((s) => {
    if (counts[s] !== undefined) counts[s]++;
  });
  const filled = Object.values(counts).reduce((a, b) => a + b, 0);
  const pct = total > 0 ? (filled / total) * 100 : 0;

  const statItems = [
    { key: "present", grad: "from-emerald-400 to-teal-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800/40", icon: CheckCircle2 },
    { key: "absent", grad: "from-red-400 to-rose-500", bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-600 dark:text-red-400", border: "border-red-200 dark:border-red-800/40", icon: UserX },
    { key: "excused", grad: "from-blue-400 to-indigo-500", bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-600 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800/40", icon: ShieldCheck },
  ];

  return (
    <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] p-5 shadow-lg dark:shadow-black/40">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md"
            style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}>
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-[#e6edf3]">{t("تأكيد الحضور النهائي", "Final Attendance Confirmation", isAr)}</p>
            <p className="text-xs text-gray-500 dark:text-[#8b949e]">{filled}/{total} {t("طالب", "students", isAr)}</p>
          </div>
        </div>
        <div className={`text-xl font-black ${filled === total && total > 0 ? "text-emerald-500" : "text-[#ff6700]"}`}>
          {filled === total && total > 0
            ? <span className="flex items-center gap-1 text-sm"><CheckCheck className="w-4 h-4" />{t("مكتمل", "Complete", isAr)}</span>
            : `${Math.round(pct)}%`
          }
        </div>
      </div>

      <div className="h-2.5 w-full bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden mb-5">
        <div
          className="h-full rounded-full relative overflow-hidden transition-all duration-700"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg, #004d59, #ff6700)" }}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {statItems.map(({ key, grad, bg, text, border, icon: Icon }, idx) => (
          <div
            key={key}
            className={`group/stat relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-500 hover:shadow-md hover:-translate-y-0.5
              ${animateProgress ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
              ${bg} ${border}`}
            style={{ transitionDelay: `${idx * 80}ms` }}>
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
      <div className="h-24 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse border border-gray-100 dark:border-[#30363d]" />
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-16 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse border border-gray-100 dark:border-[#30363d]" />
      ))}
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

  // 🆕 المرحلة: "rollcall" (الحضور المبدئي) أو "final" (التأكيد النهائي)
  const [phase, setPhase] = useState("rollcall");
  // 🆕 تسجيل الحضور المبدئي — محلي بس، مفيش خصم، مفيش إرسال للـ backend
  const [rollCall, setRollCall] = useState({});

  const [attendance, setAttendance] = useState({});
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [animateProgress, setAnimateProgress] = useState(false);
  const [lateSendStatus, setLateSendStatus] = useState({});

  const savedStatusRef = useRef({});

  // 🩹 FIX (double-send bug): مرآة لحالة rollCall نقرأها بره الـ setState updater.
  // السبب الأصلي للمشكلة: كنا بننادي sendLateNotification (اللي فيها fetch)
  // من *جوه* الـ updater function اللي بتتبعت لـ setRollCall. React (خصوصًا
  // في StrictMode وقت التطوير) بينادي updater functions مرتين عمدًا عشان
  // يتأكد إنها pure — فلو فيها side effect زي API call، الـ side effect ده
  // بيتنفذ مرتين والرسالة بتتبعت مرتين. الحل: نخلي الـ updater pure 100%
  // ونقرأ الحالة القديمة من ref، وننادي sendLateNotification من بره setState.
  const rollCallRef = useRef({});
  useEffect(() => {
    rollCallRef.current = rollCall;
  }, [rollCall]);

  // 🩹 قفل إضافي يمنع إرسال مزدوج لنفس الطالب لو حصل دبل-كليك سريع
  // قبل ما الـ state يتحدث (race condition بسيطة، مش مرتبطة بـ StrictMode)
  const notifyingRef = useRef(new Set());

  const fetchData = useCallback(async () => {
    if (!sessionId) {
      setError(t("لا يوجد session محدد", "No session specified", isAr));
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/instructor/sessions/${sessionId}/attendance`, { credentials: "include" });
      const data = await res.json();

      if (data.success) {
        setSessionData(data.data.session);
        setStudents(data.data.students || []);

        const existing = {};
        (data.data.students || []).forEach((s) => {
          if (s.currentStatus) existing[s._id] = s.currentStatus;
        });
        savedStatusRef.current = { ...existing };

        // 🆕 لو الجلسة دي أصلًا مسجّل عليها حضور من قبل، نروح على طول للتأكيد
        // النهائي (نتخطى خطوة الحضور المبدئي، مالهاش لازمة هنا)
        const hasExistingAttendance = Object.keys(existing).length > 0;
        if (hasExistingAttendance) {
          setAttendance(existing);
          setPhase("final");
          setTimeout(() => setAnimateProgress(true), 300);
        } else {
          setAttendance({});
          setRollCall({});
          setPhase("rollcall");
        }
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

  const sendLateNotification = useCallback(async (studentId) => {
    // 🩹 لو فيه نداء شغال بالفعل لنفس الطالب، متعملش نداء تاني
    if (notifyingRef.current.has(studentId)) return;
    notifyingRef.current.add(studentId);

    setLateSendStatus((prev) => ({ ...prev, [studentId]: "sending" }));
    try {
      const res = await fetch(`/api/instructor/sessions/${sessionId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ attendanceStatus: "late", studentId, sendNow: true }),
      });
      const data = await res.json();
      setLateSendStatus((prev) => ({ ...prev, [studentId]: data.success ? "sent" : "error" }));
    } catch {
      setLateSendStatus((prev) => ({ ...prev, [studentId]: "error" }));
    } finally {
      notifyingRef.current.delete(studentId);
    }
  }, [sessionId]);

  // ── المرحلة 1: الحضور المبدئي ────────────────────────────────────────────
  // 🩹 الـ side effect (sendLateNotification) بقى برة الـ setState updater
  // خالص. بنقرأ الحالة القديمة (wasLate) من rollCallRef قبل ما نعمل setState،
  // والـ updater اللي بيتبعت لـ setRollCall بقى pure function بحتة.
  const handleSetRollCallStatus = useCallback((studentId, status) => {
    const wasLate = rollCallRef.current[studentId] === "late";

    setRollCall((prev) => {
      if (prev[studentId] === status) {
        const next = { ...prev };
        delete next[studentId];
        return next;
      }
      return { ...prev, [studentId]: status };
    });

    // 🆕 لو دوس "متأخر" ومكانش متأخر قبل كده، ابعت رسالة التأخير فورًا
    // لولي الأمر — الإرسال هنا مستقل تمامًا عن الساعات: مفيش أي خصم أو
    // حفظ حضور في الخطوة دي، هي بس تنبيه فوري. وبيتنفذ مرة واحدة بس دلوقتي.
    if (status === "late" && !wasLate) {
      sendLateNotification(studentId);
    }
  }, [sendLateNotification]);

  const rollCallMarkAll = (status) => {
    const next = {};
    students.forEach((s) => { next[s._id] = status; });
    setRollCall(next);
  };

  // 🆕 الانتقال من الحضور المبدئي للتأكيد النهائي:
  //   - present/late في المبدئي → يبدأ "حاضر" في النهائي (نقطة بداية بس، المدرس يقدر يعدّل)
  //   - محددش حاجة في المبدئي → يبدأ "غايب" في النهائي (افتراضي، المدرس يقدر يعدّل)
  const handleGoToFinal = () => {
    const initial = {};
    students.forEach((s) => {
      const rc = rollCall[s._id];
      initial[s._id] = rc === "present" || rc === "late" ? "present" : "absent";
    });
    setAttendance(initial);
    setPhase("final");
    setAnimateProgress(false);
    setTimeout(() => setAnimateProgress(true), 300);
  };

  const handleBackToRollCall = () => {
    setPhase("rollcall");
  };

  // ── المرحلة 2: التأكيد النهائي (هنا بس بيتم الخصم) ──────────────────────
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

  // 🆕 rollCall status متاح جوه StudentCard كـ badge توضيحي بس
  const studentsWithRollCall = students.map((s) => ({
    ...s,
    rollCallStatus: rollCall[s._id] || null,
  }));

  const filteredRollCallStudents = studentsWithRollCall.filter((s) =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredStudents = studentsWithRollCall.filter((s) => {
    const matchSearch = !search || s.name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filterStatus === "all" ? true :
        filterStatus === "unset" ? !attendance[s._id] :
          attendance[s._id] === filterStatus;
    return matchSearch && matchFilter;
  });

  const changedCount = Object.entries(attendance).filter(([studentId, status]) => {
    return (savedStatusRef.current[studentId] || null) !== status;
  }).length;

  const filledCount = Object.keys(attendance).length;
  const allFilled = filledCount === students.length && students.length > 0;

  const rollCallMarkedCount = Object.keys(rollCall).length;

  // ─── No session ──────────────────────────────────────────────────────────
  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22]" dir="rtl">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-10 h-10 text-red-500 animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-[#e6edf3] mb-2">لم يتم تحديد جلسة</h3>
          <button onClick={() => router.push("/instructor/sessions")}
            className="mt-2 px-6 py-3 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}>
            العودة للجلسات
          </button>
        </div>
      </div>
    );
  }

  // ─── Success ─────────────────────────────────────────────────────────────
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

  // ─── Main Render ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d1117] dark:to-[#161b22]" dir={isAr ? "rtl" : "ltr"}>

      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md border-b border-gray-200 dark:border-[#30363d] shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (phase === "final" && rollCallMarkedCount > 0 && !sessionData?.attendanceTaken) {
                  handleBackToRollCall();
                } else {
                  router.push("/instructor/sessions");
                }
              }}
              className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#21262d] flex items-center justify-center text-gray-500 hover:text-[#ff6700] hover:bg-[#ff6700]/10 transition-all flex-shrink-0 group">
              {isAr
                ? <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                : <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />}
            </button>

            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
              style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}>
              <ClipboardList className="w-4 h-4 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="space-y-1.5">
                  <div className="h-4 w-40 bg-gray-200 dark:bg-[#30363d] rounded animate-pulse" />
                  <div className="h-3 w-28 bg-gray-200 dark:bg-[#30363d] rounded animate-pulse" />
                </div>
              ) : sessionData ? (
                <>
                  <div className="flex items-center gap-2">
                    <h1 className="font-black text-sm text-gray-900 dark:text-[#e6edf3] truncate leading-none">
                      {sessionData.title}
                    </h1>
                    <span className="flex-shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full"
                      style={phase === "rollcall"
                        ? { background: "#f59e0b20", color: "#d97706" }
                        : { background: "#ff670020", color: "#ff6700" }}>
                      {phase === "rollcall"
                        ? t("1/2 مبدئي", "1/2 Roll Call", isAr)
                        : t("2/2 تأكيد نهائي", "2/2 Final", isAr)}
                    </span>
                  </div>
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
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border"
                  style={{ background: "#ff670015", borderColor: "#ff670025" }}>
                  <Users className="w-4 h-4" style={{ color: "#ff6700" }} />
                  <span className="text-sm font-black" style={{ color: "#ff6700" }}>{students.length}</span>
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
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="w-4 h-4 text-[#feaf00] animate-pulse" />
                    <span className="font-medium text-xs" style={{ color: "#feaf00" }}>
                      {phase === "rollcall"
                        ? t("الحضور المبدئي", "Initial Roll Call", isAr)
                        : t("تسجيل الحضور النهائي", "Final Attendance", isAr)}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white mb-1">{sessionData.title}</h2>
                  <p className="text-white/70 text-sm">
                    {sessionData.group?.name} · {fmtTime(sessionData.startTime, isAr)} – {fmtTime(sessionData.endTime, isAr)}
                  </p>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20">
                    <Users className="w-4 h-4 text-white" />
                    <span className="text-white font-black text-sm">
                      {phase === "rollcall" ? rollCallMarkedCount : filledCount}
                      <span className="text-white/60 font-normal">/{students.length}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
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

        {/* ══════════════════════════════════════════════════════════════
            المرحلة 1: الحضور المبدئي — design بسيط ومختلف (list)
            ══════════════════════════════════════════════════════════════ */}
        {!loading && !error && phase === "rollcall" && students.length > 0 && (
          <>
            <RollCallSummaryBar rollCall={rollCall} total={students.length} isAr={isAr} />

            <div className="flex gap-2">
              <button onClick={() => rollCallMarkAll("present")}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 hover:shadow-md transition-all">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t("تحديد الكل حاضر", "Mark all present", isAr)}
              </button>
              <button onClick={() => setRollCall({})}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gray-100 dark:bg-[#21262d] text-gray-500 dark:text-[#8b949e] border border-gray-200 dark:border-[#30363d] hover:bg-gray-200 dark:hover:bg-[#30363d] transition-all">
                {t("مسح الكل", "Clear all", isAr)}
              </button>
            </div>

            <div className="relative">
              <div className={`absolute ${isAr ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("ابحث عن طالب...", "Search student...", isAr)}
                className={`w-full bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl ${isAr ? "pr-9 pl-4" : "pl-9 pr-4"} py-2.5 text-sm text-gray-900 dark:text-[#e6edf3] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-[#ff6700]/60 shadow-sm transition-all`}
              />
            </div>

            <div className="space-y-2">
              {filteredRollCallStudents.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] shadow-sm">
                  <p className="text-gray-400 text-sm">{t("لا نتائج", "No results", isAr)}</p>
                </div>
              ) : (
                filteredRollCallStudents.map((student) => (
                  <RollCallCard
                    key={student._id}
                    student={student}
                    status={rollCall[student._id] || null}
                    onSetStatus={handleSetRollCallStatus}
                    sendStatus={lateSendStatus[student._id] || null}
                    isAr={isAr}
                  />
                ))
              )}
            </div>

            {/* Sticky Next bar */}
            <div className="sticky bottom-0 pt-3 pb-4">
              <div className="bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-[#30363d] p-4 shadow-xl">
                {rollCallMarkedCount < students.length && (
                  <div className="flex items-center gap-2 mb-3 p-2.5 bg-gray-50 dark:bg-[#21262d] rounded-xl border border-gray-100 dark:border-[#30363d]">
                    <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <p className="text-xs text-gray-500 dark:text-[#8b949e]">
                      {students.length - rollCallMarkedCount} {t(
                        "طالب لم يُحدد — هيبدأوا كـ«غايب» في التأكيد النهائي ويمكن تعديلهم",
                        "student(s) unmarked — will start as \"Absent\" in the final step and can be edited",
                        isAr
                      )}
                    </p>
                  </div>
                )}
                <button
                  onClick={handleGoToFinal}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black text-white shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all"
                  style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}>
                  {t("التالي: تأكيد الحضور النهائي", "Next: Final Attendance Confirmation", isAr)}
                  {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            المرحلة 2: التأكيد النهائي — هنا بس بيتم الخصم (present/absent/excused)
            ══════════════════════════════════════════════════════════════ */}
        {!loading && !error && phase === "final" && students.length > 0 && (
          <>
            {rollCallMarkedCount > 0 && !sessionData?.attendanceTaken && (
              <button
                onClick={handleBackToRollCall}
                className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-[#8b949e] hover:text-[#ff6700] transition-colors">
                {isAr ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                {t("رجوع للحضور المبدئي", "Back to roll call", isAr)}
              </button>
            )}

            <SummaryBar attendance={attendance} total={students.length} isAr={isAr} animateProgress={animateProgress} />

            {/* Quick mark all */}
            <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] p-4 shadow-lg dark:shadow-black/40">
              <p className="text-xs font-bold text-gray-500 dark:text-[#8b949e] mb-3 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" style={{ color: "#ff6700" }} />
                {t("تحديد الكل كـ:", "Mark all as:", isAr)}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {FINAL_STATUS_ORDER.map((s) => {
                  const c = STATUS_CONFIG[s];
                  const Icon = c.icon;
                  return (
                    <button key={s} onClick={() => markAll(s)}
                      className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${c.lightBg} ${c.text} border ${c.border}`}>
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
                  className={`w-full bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl ${isAr ? "pr-9 pl-4" : "pl-9 pr-4"} py-2.5 text-sm text-gray-900 dark:text-[#e6edf3] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-[#ff6700]/60 shadow-sm transition-all`}
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl px-3 py-2.5 text-sm text-gray-700 dark:text-[#8b949e] focus:outline-none shadow-sm">
                <option value="all">{t("الكل", "All", isAr)}</option>
                <option value="unset">{t("لم يُحدد", "Unset", isAr)}</option>
                {FINAL_STATUS_ORDER.map((s) => (
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
                    isAr={isAr}
                    submitting={submitting}
                  />
                ))
              )}
            </div>

            {/* Submit sticky bar */}
            <div className="sticky bottom-0 pt-3 pb-4">
              <div className="bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-[#30363d] p-4 shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-[#e6edf3]">
                      {changedCount > 0
                        ? <span style={{ color: "#ff6700" }}>{changedCount} {t("تغيير جديد", "new change(s)", isAr)}</span>
                        : <span className="text-gray-400 dark:text-[#6e7681]">{t("لا توجد تغييرات", "No changes", isAr)}</span>
                      }
                    </p>
                    {!allFilled && filledCount > 0 && (
                      <p className="text-xs text-amber-500 mt-0.5">
                        {students.length - filledCount} {t("طالب لم يُحدد", "student(s) unset", isAr)}
                      </p>
                    )}
                  </div>

                  <div className="relative w-10 h-10 flex-shrink-0">
                    <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-100 dark:text-[#21262d]" />
                      <circle cx="18" cy="18" r="15" fill="none" stroke="url(#brandGrad)" strokeWidth="3"
                        strokeDasharray={`${students.length > 0 ? (filledCount / students.length) * 94 : 0} 94`}
                        strokeLinecap="round" />
                      <defs>
                        <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
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
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black text-white shadow-lg transition-all
                      ${filledCount > 0 && !submitting
                        ? "hover:shadow-xl hover:scale-[1.02]"
                        : "bg-gray-300 dark:bg-[#30363d] cursor-not-allowed"}`}
                    style={filledCount > 0 && !submitting
                      ? { background: "linear-gradient(135deg, #004d59, #ff6700)" }
                      : {}}>
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
            <p className="text-gray-500 dark:text-[#8b949e] font-medium">
              {t("لا يوجد طلاب في هذه الجلسة", "No students in this session", isAr)}
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-shimmer { animation: shimmer 2s infinite; }
      `}</style>
    </div>
  );
}