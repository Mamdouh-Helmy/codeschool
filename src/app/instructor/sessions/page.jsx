"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/app/context/LocaleContext";
import InstructorSidebar from "../InstructorSidebar";
import InstructorHeader from "../InstructorHeader";
import {
  Calendar, Clock, CheckCircle, X, Play, Video,
  AlertCircle, ChevronRight, BookOpen,
  Users, Timer, FileText, Info, Search,
  ClipboardList, ExternalLink,
  BarChart3, UserCheck, Loader2, RefreshCw,
  ChevronDown, Star, Zap,
  CalendarDays, ListFilter, GraduationCap, Globe,
  Presentation, FolderOpen, BookMarked,
  Layers, Copy, Eye, EyeOff, Lock, User, Link2,
  TrendingUp, Award, LayoutGrid, Shield,
  CalendarClock, Hourglass, SkipForward, ArrowRightCircle,
  Send, BadgeCheck, BadgeAlert, MessageSquareWarning,
} from "lucide-react";

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
  return new Date(d).toLocaleDateString(isAr ? "ar-EG" : "en-US", { month: "short", day: "numeric" });
}
function fmtDateFull(d, isAr) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}
function fmtDateKey(d) { return new Date(d).toISOString().split("T")[0]; }
function getAttendanceRate(session) {
  if (!session.attendance || session.attendance.length === 0) return null;
  const total = session.attendance.length;
  const present = session.attendance.filter(a => a.status === "present" || a.status === "late").length;
  return Math.round((present / total) * 100);
}
function deduplicateLessons(lessons = []) {
  const seen = new Set();
  return lessons.filter(l => {
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
    icon: CheckCircle, color: "emerald",
  },
  scheduled: {
    labelEn: "Scheduled", labelAr: "مجدولة",
    dot: "bg-[#004d59]",
    badge: "bg-[#004d59]/10 dark:bg-[#004d59]/20 text-[#004d59] dark:text-teal-400 border border-[#004d59]/20 dark:border-[#004d59]/30",
    icon: Clock, color: "teal",
  },
  cancelled: {
    labelEn: "Cancelled", labelAr: "ملغاة",
    dot: "bg-red-400",
    badge: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40",
    icon: X, color: "red",
  },
  postponed: {
    labelEn: "Postponed", labelAr: "مؤجلة",
    dot: "bg-[#feaf00]",
    badge: "bg-[#feaf00]/10 dark:bg-[#feaf00]/10 text-[#f67d00] dark:text-[#feaf00] border border-[#feaf00]/30 dark:border-[#feaf00]/20",
    icon: Clock, color: "amber",
  },
};

// ─── AnimatedCounter ──────────────────────────────────────────────────────────
function AnimatedCounter({ value, duration = 1200 }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start, frame;
    const run = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) frame = requestAnimationFrame(run);
    };
    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return <span>{count}</span>;
}

// ─── 🆕 Request Access Modal (replaces the old plain AccessDeniedModal) ───────
// لما المدرس يدوس على سيشن مش متاحة دلوقتي، بدل الرفض المباشر، نعرض عليه
// اختيارين لطلب فتحها من الأدمن، أو نعرض حالة الطلب لو فيه طلب pending شغال
// بالفعل على الجروب ده، أو سبب رفض آخر طلب لو كان فيه واحد على نفس السيشن.
function RequestAccessModal({ session, onClose, isAr, onSubmitted }) {
  const t = (ar, en) => isAr ? ar : en;
  const [checking, setChecking] = useState(true);
  const [statusInfo, setStatusInfo] = useState(null); // { status: "pending"|"rejected", reviewNotes, ... }
  const [selectedMode, setSelectedMode] = useState(null); // "single" | "withNext"
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState(null);
  const [success, setSuccess] = useState(null);
  // بعد ما يشوف سبب الرفض، يقدر يضغط "تقديم طلب جديد" فيرجع لاختيار الـ viewMode
  const [showOptionsAfterRejection, setShowOptionsAfterRejection] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // ── Check current request status for this session/group ────────────────
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setChecking(true);
        const res = await fetch(`/api/instructor/sessions/${session._id}/request-reschedule`, {
          credentials: "include",
        });
        const json = await res.json();
        if (active && json.success) {
          setStatusInfo(json.data);
        }
      } catch {
        // fail silently — instructor can still try to submit, server re-validates
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => { active = false; };
  }, [session._id]);

  const handleSubmit = async (viewMode) => {
    setSelectedMode(viewMode);
    setSubmitting(true);
    setError("");
    setErrorCode(null);
    try {
      const res = await fetch(`/api/instructor/sessions/${session._id}/request-reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ viewMode, shiftDays: 7 }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(json.data);
        onSubmitted?.(json.data);
      } else {
        setErrorCode(json.code || null);
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" dir={isAr ? "rtl" : "ltr"}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg max-h-[94vh] overflow-y-auto bg-white dark:bg-[#0d1117] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 dark:border-[#21262d]">

        {/* Header */}
        <div className="relative overflow-hidden flex-shrink-0 p-6" style={{ background: "linear-gradient(135deg, #004d59 0%, #004d59cc 40%, #ff6700 100%)" }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 flex-shrink-0">
                <CalendarClock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white leading-snug">
                  {t("طلب فتح الجلسة", "Request Session Access")}
                </h3>
                <p className="text-white/70 text-xs font-medium mt-0.5 truncate max-w-[260px]">
                  {session.title}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-all border border-white/20 flex-shrink-0">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">

          {checking && (
            <div className="flex items-center justify-center gap-2 py-6 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">{t("جاري التحقق...", "Checking...")}</span>
            </div>
          )}

          {!checking && success && (
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4 border border-emerald-200 dark:border-emerald-800/30">
                <Send className="w-8 h-8 text-emerald-500" />
              </div>
              <h4 className="text-base font-black text-gray-900 dark:text-[#e6edf3] mb-2">
                {t("تم إرسال الطلب", "Request Sent")}
              </h4>
              <p className="text-sm text-gray-500 dark:text-[#8b949e] leading-relaxed mb-1">
                {t(
                  "طلبك في انتظار موافقة الأدمن. ستظهر الجلسة هنا فور الموافقة.",
                  "Your request is awaiting admin approval. The session will open as soon as it's approved."
                )}
              </p>
              <p className="text-xs text-gray-400 dark:text-[#6e7681] mb-5">
                {t(
                  `سيتم ترحيل ${success.affectedCount} جلسة بمقدار أسبوع`,
                  `${success.affectedCount} session(s) will shift by one week`
                )}
              </p>
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-xl font-black text-white shadow-lg hover:shadow-xl transition-all"
                style={{ background: "linear-gradient(135deg, #ff6700, #feaf00)" }}
              >
                {t("تم", "Got it")}
              </button>
            </div>
          )}

          {!checking && !success && hasPending && (
            <div className="text-center py-2">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#feaf00]/10 dark:bg-[#feaf00]/10 flex items-center justify-center mb-4 border border-[#feaf00]/30 dark:border-[#feaf00]/20">
                <Hourglass className="w-8 h-8 text-[#f67d00] dark:text-[#feaf00]" />
              </div>
              <h4 className="text-base font-black text-gray-900 dark:text-[#e6edf3] mb-2">
                {t("يوجد طلب قيد المراجعة", "A Request Is Already Pending")}
              </h4>
              <p className="text-sm text-gray-500 dark:text-[#8b949e] leading-relaxed mb-5">
                {t(
                  "يوجد طلب فتح جلسة قيد المراجعة لهذا الجروب بالفعل. برجاء الانتظار حتى يرد الأدمن قبل تقديم طلب جديد.",
                  "There's already a pending access request for this group. Please wait for the admin's response before submitting a new one."
                )}
              </p>
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-xl font-black text-white shadow-lg hover:shadow-xl transition-all"
                style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}
              >
                {t("فهمت", "Got it")}
              </button>
            </div>
          )}

          {/* 🆕 حالة الرفض — تعرض السبب لو موجود، وتسمح بتقديم طلب جديد */}
          {!checking && !success && wasRejected && (
            <div className="text-center py-2">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 dark:bg-red-900/10 flex items-center justify-center mb-4 border border-red-200 dark:border-red-800/30">
                <BadgeAlert className="w-8 h-8 text-red-500" />
              </div>
              <h4 className="text-base font-black text-gray-900 dark:text-[#e6edf3] mb-2">
                {t("تم رفض طلبك السابق", "Your Previous Request Was Rejected")}
              </h4>
              <p className="text-sm text-gray-500 dark:text-[#8b949e] leading-relaxed mb-3">
                {t(
                  "راجع الأدمن طلب فتح هذه الجلسة ولم يوافق عليه.",
                  "The admin reviewed your request to open this session and did not approve it."
                )}
              </p>

              {statusInfo?.reviewNotes ? (
                <div className="text-start flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50/70 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 mb-5">
                  <MessageSquareWarning className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-black text-red-500 mb-0.5">
                      {t("سبب الرفض", "Rejection reason")}
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed">
                      {statusInfo.reviewNotes}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 dark:text-[#6e7681] mb-5">
                  {t("لم يترك الأدمن سببًا محددًا للرفض.", "The admin didn't leave a specific reason.")}
                </p>
              )}

              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={onClose}
                  className="px-5 py-3 rounded-xl font-bold text-gray-600 dark:text-[#8b949e] bg-gray-100 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] hover:bg-gray-200 dark:hover:bg-[#21262d] transition-all"
                >
                  {t("إغلاق", "Close")}
                </button>
                <button
                  onClick={() => setShowOptionsAfterRejection(true)}
                  className="px-5 py-3 rounded-xl font-black text-white shadow-lg hover:shadow-xl transition-all"
                  style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}
                >
                  {t("تقديم طلب جديد", "Submit a New Request")}
                </button>
              </div>
            </div>
          )}

          {!checking && !success && !hasPending && !wasRejected && (
            <>
              <p className="text-sm text-gray-500 dark:text-[#8b949e] leading-relaxed">
                {t(
                  "هذه الجلسة غير متاحة لأنها ليست في يومها. اختر كيف تريد طلب فتحها — سيتم إرسال طلبك للأدمن للموافقة.",
                  "This session isn't available because it's not on its scheduled day. Choose how you'd like to request access — your request will be sent to the admin for approval."
                )}
              </p>

              {/* Option 1: single */}
              <button
                onClick={() => handleSubmit("single")}
                disabled={submitting}
                className="w-full text-start p-4 rounded-2xl border-2 border-gray-100 dark:border-[#30363d] hover:border-[#ff6700]/50 dark:hover:border-[#ff6700]/40 transition-all bg-white dark:bg-[#161b22] disabled:opacity-60 group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff6700] to-[#feaf00] flex items-center justify-center shadow-md flex-shrink-0 group-hover:scale-105 transition-transform">
                    {submitting && selectedMode === "single"
                      ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                      : <ArrowRightCircle className="w-5 h-5 text-white" />}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-black text-sm text-gray-900 dark:text-[#e6edf3] mb-1">
                      {t("فتح هذه الجلسة فقط", "Open This Session Only")}
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-[#8b949e] leading-relaxed">
                      {t(
                        "هذه الجلسة تُفتح فورًا (رابط ميتنج + تسجيل حضور). باقي الجلسات بعدها تترحل أسبوعًا، وتبقى مقفولة حتى يحين معادها الجديد.",
                        "This session opens immediately (meeting link + attendance). All sessions after it shift by one week and stay locked until their new date arrives."
                      )}
                    </p>
                  </div>
                </div>
              </button>

              {/* Option 2: withNext */}
              <button
                onClick={() => handleSubmit("withNext")}
                disabled={submitting}
                className="w-full text-start p-4 rounded-2xl border-2 border-gray-100 dark:border-[#30363d] hover:border-[#004d59]/50 dark:hover:border-[#004d59]/40 transition-all bg-white dark:bg-[#161b22] disabled:opacity-60 group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#004d59] to-[#004d59]/70 flex items-center justify-center shadow-md flex-shrink-0 group-hover:scale-105 transition-transform">
                    {submitting && selectedMode === "withNext"
                      ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                      : <SkipForward className="w-5 h-5 text-white" />}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-black text-sm text-gray-900 dark:text-[#e6edf3] mb-1">
                      {t("فتح هذه الجلسة وما بعدها", "Open This Session and the Ones After")}
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-[#8b949e] leading-relaxed">
                      {t(
                        "هذه الجلسة تُفتح فورًا بكل شيء. الجلسات بعدها تترحل أسبوعًا وتظهر تفاصيلها العامة (المحتوى/الدروس)، لكن بدون رابط ميتنج أو تسجيل حضور حتى يحين معادها الجديد فعليًا.",
                        "This session opens immediately with everything. Sessions after it shift by one week and show general details (content/lessons), but without a meeting link or attendance until their new date actually arrives."
                      )}
                    </p>
                  </div>
                </div>
              </button>

              {/* 🆕 رسالة خاصة لو الحضور أُخذ فعليًا — مينفعش يطلب فتح خالص */}
              {error && errorCode === "ATTENDANCE_ALREADY_TAKEN" && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-gray-50 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d]">
                  <Lock className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-600 dark:text-[#8b949e] font-medium leading-relaxed">
                    {t(
                      "تم تسجيل الحضور على هذه الجلسة بالفعل، فهي مكتملة ولا يمكن طلب فتحها مرة أخرى.",
                      "Attendance was already taken for this session — it's complete and can't be reopened."
                    )}
                  </p>
                </div>
              )}

              {error && errorCode !== "ATTENDANCE_ALREADY_TAKEN" && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
                </div>
              )}

              <p className="text-[11px] text-gray-400 dark:text-[#6e7681] text-center pt-1">
                {t("سيتم إرسال طلبك للأدمن لمراجعته والموافقة عليه", "Your request will be sent to the admin for review and approval")}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Meeting Credentials Card ─────────────────────────────────────────────────
function MeetingCredentials({ session, isAr }) {
  const [showPass, setShowPass] = useState(false);
  const [copied, setCopied] = useState(null);
  const t = (ar, en) => isAr ? ar : en;

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  if (!session.meetingLink) return null;

  const hasUsername = session.meetingCredentials?.username;
  const hasPassword = session.meetingCredentials?.password;

  return (
    <div className="rounded-2xl overflow-hidden border border-[#ff6700]/30 dark:border-[#ff6700]/20 bg-gradient-to-br from-orange-50/80 to-amber-50/50 dark:from-[#ff6700]/5 dark:to-[#feaf00]/5">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#ff6700]/20 dark:border-[#ff6700]/10 bg-gradient-to-r from-[#ff6700]/10 to-transparent dark:from-[#ff6700]/10">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#ff6700] to-[#feaf00] flex items-center justify-center shadow-md">
          <Video className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="text-sm font-black text-gray-900 dark:text-[#e6edf3]">
            {t("بيانات الجلسة", "Session Access")}
          </span>
          {session.meetingPlatform && (
            <p className="text-[10px] text-[#ff6700] font-bold capitalize">{session.meetingPlatform}</p>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/70 dark:bg-[#161b22]/50 border border-gray-200/60 dark:border-[#30363d]/60">
          <Link2 className="w-4 h-4 text-[#004d59] dark:text-[#ff6437] flex-shrink-0" />
          <a
            href={session.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-xs text-[#004d59] dark:text-[#ff6437] font-semibold hover:underline truncate"
          >
            {session.meetingLink}
          </a>
          <button
            onClick={() => copyToClipboard(session.meetingLink, "link")}
            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[#ff6700]/10 transition-colors"
            title={t("نسخ", "Copy")}
          >
            {copied === "link"
              ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              : <Copy className="w-3.5 h-3.5 text-gray-400" />}
          </button>
        </div>

        {hasUsername && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/70 dark:bg-[#161b22]/50 border border-gray-200/60 dark:border-[#30363d]/60">
            <User className="w-4 h-4 text-[#004d59] dark:text-[#8b949e] flex-shrink-0" />
            <span className="flex-1 text-xs text-gray-700 dark:text-[#c9d1d9] font-mono">
              {session.meetingCredentials.username}
            </span>
            <button
              onClick={() => copyToClipboard(session.meetingCredentials.username, "user")}
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[#ff6700]/10 transition-colors"
            >
              {copied === "user"
                ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                : <Copy className="w-3.5 h-3.5 text-gray-400" />}
            </button>
          </div>
        )}

        {hasPassword && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/70 dark:bg-[#161b22]/50 border border-gray-200/60 dark:border-[#30363d]/60">
            <Lock className="w-4 h-4 text-[#004d59] dark:text-[#8b949e] flex-shrink-0" />
            <span className="flex-1 text-xs text-gray-700 dark:text-[#c9d1d9] font-mono tracking-widest">
              {showPass ? session.meetingCredentials.password : "••••••••"}
            </span>
            <button
              onClick={() => setShowPass(!showPass)}
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[#ff6700]/10 transition-colors"
            >
              {showPass
                ? <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                : <Eye className="w-3.5 h-3.5 text-gray-400" />}
            </button>
            {showPass && (
              <button
                onClick={() => copyToClipboard(session.meetingCredentials.password, "pass")}
                className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[#ff6700]/10 transition-colors"
              >
                {copied === "pass"
                  ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  : <Copy className="w-3.5 h-3.5 text-gray-400" />}
              </button>
            )}
          </div>
        )}

        <a
          href={session.meetingLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-black text-sm text-white bg-gradient-to-r from-[#ff6700] to-[#feaf00] shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
        >
          <Video className="w-4 h-4" />
          {t("ابدأ الجلسة الآن", "Start Session Now")}
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

// ─── Session Description Card ─────────────────────────────────────────────────
function SessionDescriptionCard({ session, isAr }) {
  const t = (ar, en) => isAr ? ar : en;
  const description = session.description;
  if (!description) return null;

  return (
    <div className="rounded-2xl border border-[#004d59]/20 dark:border-[#004d59]/30 bg-gradient-to-br from-[#004d59]/5 to-[#feaf00]/5 dark:from-[#004d59]/10 dark:to-transparent overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#004d59]/15 dark:border-[#004d59]/20">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#004d59] to-[#004d59]/70 flex items-center justify-center shadow-md">
          <FileText className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-black text-gray-900 dark:text-[#e6edf3]">
          {t("وصف الجلسة", "Session Description")}
        </span>
        <span className="mr-auto text-[10px] px-2 py-0.5 rounded-full bg-[#004d59]/10 dark:bg-[#004d59]/20 text-[#004d59] dark:text-teal-400 font-bold border border-[#004d59]/20">
          {t("ساعتان", "2 hours")}
        </span>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm text-gray-700 dark:text-[#c9d1d9] leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ─── Course Info Section ──────────────────────────────────────────────────────
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
      <div className="rounded-2xl border border-[#004d59]/20 dark:border-[#004d59]/30 bg-gradient-to-br from-[#004d59]/5 to-[#ff6700]/5 dark:from-[#004d59]/10 dark:to-[#ff6700]/5 overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#004d59]/15 dark:border-[#004d59]/20">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#004d59] to-[#ff6700] flex items-center justify-center shadow-md">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-black text-gray-900 dark:text-[#e6edf3]">
            {t("معلومات الكورس", "Course Info")}
          </span>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-black text-sm text-gray-900 dark:text-[#e6edf3] mb-2">{course.title}</h3>
            <div className="flex flex-wrap gap-1.5">
              {course.grade && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#004d59]/10 dark:bg-[#004d59]/20 text-[#004d59] dark:text-teal-300 font-medium border border-[#004d59]/20 dark:border-[#004d59]/30">
                  🎒 {course.grade}
                </span>
              )}
              {course.subject && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ff6700]/10 dark:bg-[#ff6700]/10 text-[#ff6700] dark:text-[#ff6437] font-medium border border-[#ff6700]/20 dark:border-[#ff6700]/20">
                  📘 {course.subject}
                </span>
              )}
              {course.level && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-200 dark:border-emerald-700/30">
                  📊 {course.level}
                </span>
              )}
              {course.duration && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#feaf00]/15 dark:bg-[#feaf00]/10 text-[#f67d00] dark:text-[#feaf00] font-medium border border-[#feaf00]/30 dark:border-[#feaf00]/20">
                  ⏱ {course.duration}
                </span>
              )}
            </div>
          </div>
          {course.description && (
            <p className="text-xs text-gray-600 dark:text-[#8b949e] leading-relaxed border-t border-[#004d59]/10 dark:border-[#004d59]/20 pt-3">{course.description}</p>
          )}
        </div>
      </div>

      {moduleData && (
        <div className="rounded-2xl border border-gray-100 dark:border-[#30363d] bg-gray-50 dark:bg-[#0d1117]/60 overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 dark:border-[#30363d]">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#004d59] to-[#ff6437] flex items-center justify-center shadow-md">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-black text-gray-900 dark:text-[#e6edf3]">{t("الوحدة الدراسية", "Module")}</span>
            <span className="mr-auto text-[10px] px-2 py-0.5 rounded-full bg-[#ff6700]/10 dark:bg-[#ff6700]/10 text-[#ff6700] dark:text-[#ff6437] font-black border border-[#ff6700]/20 dark:border-[#ff6700]/20">
              {t(`الوحدة ${(session.moduleIndex ?? 0) + 1}`, `Module ${(session.moduleIndex ?? 0) + 1}`)}
            </span>
          </div>
          <div className="p-4">
            <h4 className="font-black text-sm text-gray-900 dark:text-[#e6edf3] mb-1">{moduleData.title}</h4>
            {moduleData.description && <p className="text-xs text-gray-500 dark:text-[#8b949e] leading-relaxed">{moduleData.description}</p>}
            {moduleData.presentationUrl && (
              <a href={moduleData.presentationUrl} target="_blank" rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl text-xs font-bold text-gray-700 dark:text-[#8b949e] hover:border-[#ff6700]/50 hover:text-[#ff6700] transition-all">
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
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg text-[10px] font-medium text-gray-600 dark:text-[#8b949e] hover:border-[#ff6700]/50 hover:text-[#ff6700] transition-all">
                      <Globe className="w-2.5 h-2.5" />{t(`مشروع ${i + 1}`, `Project ${i + 1}`)}<ExternalLink className="w-2 h-2" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {hasBlog && (
        <div className="rounded-2xl border border-gray-100 dark:border-[#30363d] overflow-hidden">
          <button onClick={() => setShowBlog(!showBlog)}
            className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-[#0d1117]/60 hover:bg-gray-100 dark:hover:bg-[#0d1117]/80 transition-colors">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#ff6700] to-[#f67d00] flex items-center justify-center shadow-md">
              <BookMarked className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-black text-gray-900 dark:text-[#e6edf3] flex-1 text-start">{t("محتوى الوحدة التفصيلي", "Module Detailed Content")}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showBlog ? "rotate-180" : ""}`} />
          </button>
          {showBlog && (
            <div className="p-4 prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed bg-white dark:bg-[#0d1117]/30 border-t border-gray-100 dark:border-[#30363d] overflow-auto max-h-72"
              dangerouslySetInnerHTML={{ __html: blogBody }} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Session Detail Modal ─────────────────────────────────────────────────────
// يعمل في وضعين:
//  - full mode  (canViewDetails): كل المحتوى زي ما كان (لينك + حضور + كل حاجة)
//  - partial mode (canViewPartialDetails): نفس المودال بس بدون MeetingCredentials
//    وبدون زرارات تسجيل الحضور — وبانر يوضح إن الجلسة لسه مقفولة
function SessionModal({ session, onClose, isAr }) {
  const cfg = STATUS_CFG[session.status] || STATUS_CFG.scheduled;
  const isCompleted = session.status === "completed";
  const attRate = getAttendanceRate(session);
  const t = (ar, en) => isAr ? ar : en;
  const isActuallyToday = session.isEffectivelyToday ?? session.isToday;
  const isPartial = !!session.canViewPartialDetails;
  const formatTime = isAr ? fmtTimeAr : fmtTime;
  const lessons = deduplicateLessons(session.lessons || []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const attBreakdown = isCompleted && session.attendance?.length > 0 ? {
    present: session.attendance.filter(a => a.status === "present").length,
    absent: session.attendance.filter(a => a.status === "absent").length,
    late: session.attendance.filter(a => a.status === "late").length,
    excused: session.attendance.filter(a => a.status === "excused").length,
    total: session.attendance.length,
  } : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" dir={isAr ? "rtl" : "ltr"}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full sm:max-w-2xl max-h-[94vh] overflow-y-auto bg-white dark:bg-[#0d1117] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col border border-gray-100 dark:border-[#21262d]">

        {/* ── Modal Header ── */}
        <div className="relative overflow-hidden flex-shrink-0" style={{ background: "linear-gradient(135deg, #004d59 0%, #004d59cc 40%, #ff6700 100%)" }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full opacity-20" style={{ background: "#feaf00" }} />
          <div className="absolute top-0 left-1/2 w-32 h-32 rounded-full opacity-10" style={{ background: "#ff6437", filter: "blur(20px)" }} />

          <div className="relative z-10 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-black px-3 py-1 rounded-full border border-white/25 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />
                  {isAr ? cfg.labelAr : cfg.labelEn}
                </span>
                {isActuallyToday && !isPartial && (
                  <span className="bg-[#feaf00]/30 backdrop-blur-sm text-[#feaf00] text-xs font-black px-2.5 py-1 rounded-full border border-[#feaf00]/40">
                    ✨ {t("اليوم", "Today")}
                  </span>
                )}
                {isPartial && (
                  <span className="bg-white/15 backdrop-blur-sm text-white text-xs font-black px-2.5 py-1 rounded-full border border-white/25 flex items-center gap-1">
                    <Lock className="w-3 h-3" />{t("معاينة فقط", "Preview Only")}
                  </span>
                )}
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-all border border-white/20">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <h2 className="text-xl font-black text-white mb-1 leading-snug">{session.title}</h2>
            <p className="text-white/60 text-sm font-medium mb-5">
              {session.group?.name} · {t("الجلسة", "Session")} {session.sessionNumber} ·{" "}
              {t(`الوحدة ${(session.moduleIndex ?? 0) + 1}`, `Module ${(session.moduleIndex ?? 0) + 1}`)}
            </p>

            <div className="flex flex-wrap gap-2">
              {[
                { icon: Calendar, text: fmtDateFull(session.scheduledDate, isAr) },
                { icon: Clock, text: `${formatTime(session.startTime)} – ${formatTime(session.endTime)}` },
                { icon: Timer, text: t("ساعتان", "2 hours") },
              ].map(({ icon: Icon, text }, i) => (
                <span key={i} className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full border border-white/15">
                  <Icon className="w-3 h-3" />{text}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Modal Body ── */}
        <div className="p-5 space-y-4 bg-gray-50/50 dark:bg-[#0d1117]">

          {/* 🔓 Partial-preview notice — يوضح إن الجلسة لسه مقفولة عمليًا */}
          {isPartial && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#004d59]/5 dark:bg-[#004d59]/10 border border-[#004d59]/20 dark:border-[#004d59]/30">
              <div className="w-9 h-9 rounded-xl bg-[#004d59]/10 dark:bg-[#004d59]/20 flex items-center justify-center flex-shrink-0 border border-[#004d59]/20">
                <Lock className="w-4 h-4 text-[#004d59] dark:text-teal-400" />
              </div>
              <div>
                <p className="text-sm font-black text-[#004d59] dark:text-teal-400">
                  {t("هذه معاينة للمحتوى فقط", "This is a content preview only")}
                </p>
                <p className="text-xs text-[#004d59]/70 dark:text-teal-400/70 mt-0.5 leading-relaxed">
                  {t(
                    "رابط الميتنج وتسجيل الحضور سيكونان متاحين عند حلول معاد الجلسة الجديد فعليًا.",
                    "The meeting link and attendance will become available once this session's new date actually arrives."
                  )}
                </p>
              </div>
            </div>
          )}

          <SessionDescriptionCard session={session} isAr={isAr} />

          {!isPartial && isActuallyToday && session.meetingLink && (
            <MeetingCredentials session={session} isAr={isAr} />
          )}

          {!isPartial && isActuallyToday && !session.meetingLink && !session.attendanceTaken && session.status === "scheduled" && (
            <Link href={`/instructor/attendance?session=${session._id}`}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
              <ClipboardList className="w-5 h-5" />{t("تسجيل الحضور الآن", "Take Attendance Now")}
            </Link>
          )}

          {!isPartial && isActuallyToday && session.meetingLink && !session.attendanceTaken && session.status === "scheduled" && (
            <Link href={`/instructor/attendance?session=${session._id}`}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm bg-white dark:bg-[#161b22] text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all">
              <ClipboardList className="w-4 h-4" />{t("تسجيل الحضور", "Take Attendance")}
            </Link>
          )}

          {/* 🆕 سيشن خلص معادها (completed) بس الحضور لسه ما اتسجلش — بغض النظر عن isActuallyToday */}
          {!isPartial && session.status === "completed" && !session.attendanceTaken && (
            <Link href={`/instructor/attendance?session=${session._id}`}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
              <ClipboardList className="w-5 h-5" />{t("تسجيل الحضور", "Take Attendance")}
            </Link>
          )}

          {isCompleted && session.recordingLink && (
            <a href={session.recordingLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm border border-[#004d59]/30 dark:border-[#004d59]/30 bg-gradient-to-r from-[#004d59]/10 to-transparent dark:from-[#004d59]/10 text-[#004d59] dark:text-teal-400 hover:from-[#004d59]/15 transition-all">
              <Play className="w-4 h-4" />{t("مشاهدة التسجيل", "Watch Recording")}
            </a>
          )}

          {/* Attendance Breakdown */}
          {attBreakdown && (
            <div className="rounded-2xl border border-gray-100 dark:border-[#30363d] bg-white dark:bg-[#161b22] overflow-hidden shadow-sm">
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 dark:border-[#30363d] bg-gray-50/80 dark:bg-[#0d1117]/40">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#ff6700] to-[#feaf00] flex items-center justify-center shadow-md">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-black text-gray-900 dark:text-[#e6edf3]">{t("إحصائيات الحضور", "Attendance Stats")}</span>
                {attRate !== null && (
                  <span className={`ml-auto text-base font-black ${attRate >= 80 ? "text-emerald-500" : attRate >= 60 ? "text-[#feaf00]" : "text-red-500"}`}>
                    {attRate}%
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 divide-x dark:divide-[#30363d] rtl:divide-x-reverse">
                {[
                  { key: "present", label: t("حاضر", "Present"), color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50/60 dark:bg-emerald-900/10" },
                  { key: "absent", label: t("غائب", "Absent"), color: "text-red-600 dark:text-red-400", bg: "bg-red-50/60 dark:bg-red-900/10" },
                  { key: "late", label: t("متأخر", "Late"), color: "text-[#f67d00] dark:text-[#feaf00]", bg: "bg-[#feaf00]/10 dark:bg-[#feaf00]/5" },
                  { key: "excused", label: t("معذور", "Excused"), color: "text-[#004d59] dark:text-teal-400", bg: "bg-[#004d59]/5 dark:bg-[#004d59]/10" },
                ].map(({ key, label, color, bg }) => (
                  <div key={key} className={`p-3 text-center ${bg}`}>
                    <div className={`text-2xl font-black ${color}`}>{attBreakdown[key]}</div>
                    <div className="text-[10px] text-gray-500 dark:text-[#8b949e] font-medium mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 flex items-center gap-2 bg-gray-50/50 dark:bg-[#0d1117]/20">
                <div className="flex-1 h-2 bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${attRate || 0}%`, background: "linear-gradient(90deg, #004d59, #ff6700)" }} />
                </div>
                <span className="text-xs text-gray-400 dark:text-[#6e7681] font-medium whitespace-nowrap">
                  {attBreakdown.total} {t("طالب", "students")}
                </span>
              </div>
            </div>
          )}

          {/* Lessons */}
          {lessons.length > 0 && (
            <div className="rounded-2xl border border-gray-100 dark:border-[#30363d] bg-white dark:bg-[#161b22] overflow-hidden shadow-sm">
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 dark:border-[#30363d] bg-gray-50/80 dark:bg-[#0d1117]/40">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#004d59] to-[#004d59]/80 flex items-center justify-center shadow-md">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-black text-gray-900 dark:text-[#e6edf3]">{t("الدروس المغطاة", "Lessons Covered")}</span>
                <span className="mr-auto text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#21262d] text-gray-500 dark:text-[#8b949e] font-bold border border-gray-200 dark:border-[#30363d]">
                  {lessons.length} {t("درس", "lessons")}
                </span>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-[#21262d]">
                {lessons.map((lesson, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50/60 dark:hover:bg-[#0d1117]/30 transition-colors">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5 shadow-sm
                      ${isCompleted
                        ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white"
                        : "bg-gradient-to-br from-[#ff6700]/20 to-[#feaf00]/20 text-[#ff6700]"}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-[#c9d1d9] font-bold">{lesson.title}</p>
                      {lesson.description && (
                        <p className="text-xs text-gray-400 dark:text-[#6e7681] mt-0.5 leading-relaxed">{lesson.description}</p>
                      )}
                      {lesson.duration && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-gray-400 bg-gray-50 dark:bg-[#21262d] px-2 py-0.5 rounded-full border border-gray-100 dark:border-[#30363d]">
                          <Clock className="w-2.5 h-2.5" />{lesson.duration}
                        </span>
                      )}
                    </div>
                    {isCompleted && (
                      <div className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <CourseInfoSection session={session} isAr={isAr} />

          {session.instructorNotes && (
            <div className="bg-[#feaf00]/10 dark:bg-[#feaf00]/5 border border-[#feaf00]/30 dark:border-[#feaf00]/20 rounded-2xl p-4">
              <h4 className="text-xs font-black text-[#f67d00] dark:text-[#feaf00] mb-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />{t("ملاحظات الجلسة", "Session Notes")}
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
                  <a key={i} href={mat.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#21262d] border border-gray-200 dark:border-[#30363d] rounded-xl text-xs font-bold text-gray-700 dark:text-[#8b949e] hover:border-[#ff6700]/50 hover:text-[#ff6700] transition-all shadow-sm">
                    <FileText className="w-3.5 h-3.5" />{mat.name || `ملف ${i + 1}`}<ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Session Row ──────────────────────────────────────────────────────────────
// ─── Session Row ──────────────────────────────────────────────────────────────
function SessionRow({ session, onOpen, isAr, onRequestAccess }) {
  const cfg = STATUS_CFG[session.status] || STATUS_CFG.scheduled;
  const isCompleted = session.status === "completed";
  const isEffectivelyToday = session.isEffectivelyToday ?? session.isToday;
  const isToday = isEffectivelyToday && session.status === "scheduled";
  const attRate = getAttendanceRate(session);
  const formatTime = isAr ? fmtTimeAr : fmtTime;
  const t = (ar, en) => isAr ? ar : en;
  const sessionNum = (session.moduleIndex ?? 0) * 3 + (session.sessionNumber ?? 1);

  // ── Determine clickability: full access, partial preview, or needs a request ──
  const canOpenFull = session.canViewDetails;
  const canOpenPartial = session.canViewPartialDetails;
  // 🆕 السيشن المكتملة أو الملغاة تتفتح عادي دايمًا — مفيش معنى تطلب فتح
  // سيشن خلصت أو اتلغت أصلاً (الباك إند برضو برفض طلب الترحيل عليها)
  const isClickable =
    canOpenFull ||
    canOpenPartial ||
    session.status === "completed" ||
    session.status === "cancelled";
  const hasPendingReq = session.pendingReschedule?.status === "pending";

  const iconColors = {
    completed: "from-emerald-400 to-teal-500",
    scheduled: isToday ? "from-[#ff6700] to-[#feaf00]" : "from-[#004d59] to-[#004d59]/70",
    cancelled: "from-red-400 to-red-500",
    postponed: "from-[#feaf00] to-[#f67d00]",
  };

  const handleClick = () => {
    if (isClickable) {
      onOpen(session);
    } else {
      onRequestAccess(session);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl border bg-white dark:bg-[#161b22]
        transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg
        ${isClickable ? "cursor-pointer" : "cursor-pointer opacity-75 hover:opacity-100"}
        ${isToday
          ? "border-[#ff6700]/40 shadow-md shadow-[#ff6700]/10 ring-1 ring-[#ff6700]/20"
          : isCompleted
            ? "border-emerald-200/60 dark:border-emerald-800/30 hover:shadow-emerald-500/5"
            : "border-gray-100 dark:border-[#30363d] hover:border-[#004d59]/30 dark:hover:border-[#004d59]/40"}`}
    >
      {/* Icon */}
      <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 shadow-md bg-gradient-to-br ${iconColors[session.status] || iconColors.scheduled} text-white`}>
        {isCompleted
          ? <CheckCircle className="w-5 h-5" />
          : session.status === "cancelled"
            ? <X className="w-5 h-5" />
            : <span className="text-sm font-black">{sessionNum}</span>}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          {isToday && (
            <span className="text-[10px] font-black text-[#ff6700] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff6700] animate-pulse" />
              {t("اليوم", "Today")}
            </span>
          )}
          {!isToday && canOpenPartial && (
            <span className="text-[10px] font-black text-[#004d59] dark:text-teal-400 flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              {t("معاينة", "Preview")}
            </span>
          )}
          {hasPendingReq && (
            <span className="text-[10px] font-black text-[#f67d00] dark:text-[#feaf00] flex items-center gap-1">
              <Hourglass className="w-2.5 h-2.5" />
              {t("قيد المراجعة", "Pending Review")}
            </span>
          )}
          <h3 className="font-black text-sm truncate text-gray-900 dark:text-[#e6edf3] group-hover:text-[#ff6700] transition-colors duration-200">
            {session.title}
          </h3>
        </div>
        <div className="flex items-center gap-2.5 text-xs text-gray-400 dark:text-[#6e7681] flex-wrap">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDateShort(session.scheduledDate, isAr)}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(session.startTime)}</span>
          {session.group?.name && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{session.group.name}</span>}
          <span className="flex items-center gap-1 text-[#004d59] dark:text-teal-600 font-medium">
            <Timer className="w-3 h-3" />{t("ساعتان", "2h")}
          </span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isCompleted && attRate !== null && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gray-50 dark:bg-[#21262d] border border-gray-100 dark:border-[#30363d]">
            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span className={`text-xs font-black ${attRate >= 80 ? "text-emerald-600" : attRate >= 60 ? "text-[#f67d00]" : "text-red-600"}`}>
              {attRate}%
            </span>
          </div>
        )}

        {session.showJoinButton && (
          <a href={session.meetingLink} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-white shadow-md hover:shadow-lg hover:scale-105 transition-all"
            style={{ background: "linear-gradient(135deg, #ff6700, #feaf00)" }}>
            <Video className="w-3.5 h-3.5" />{t("ابدأ", "Start")}
          </a>
        )}

        {isCompleted && !session.attendanceTaken && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black bg-[#feaf00]/10 dark:bg-[#feaf00]/10 text-[#f67d00] dark:text-[#feaf00] border border-[#feaf00]/30 dark:border-[#feaf00]/20">
            <ClipboardList className="w-3 h-3" />{t("يحتاج حضور", "Needs Attendance")}
          </span>
        )}

        <span className={`text-[10px] px-2.5 py-1 rounded-full font-black hidden sm:flex items-center gap-1 ${cfg.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {isAr ? cfg.labelAr : cfg.labelEn}
        </span>

        <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors bg-gray-50 dark:bg-[#21262d] group-hover:bg-[#ff6700]/10">
          <ChevronRight className="w-4 h-4 transition-colors text-gray-300 dark:text-[#6e7681] group-hover:text-[#ff6700]" />
        </div>
      </div>
    </div>
  );
}

// ─── Date Header ──────────────────────────────────────────────────────────────
function DateHeader({ dateKey, sessions, isAr }) {
  const d = new Date(dateKey);
  const isToday = fmtDateKey(new Date()) === dateKey;
  const t = (ar, en) => isAr ? ar : en;

  return (
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 shadow-sm border
        ${isToday
          ? "border-transparent text-white shadow-md"
          : "bg-white dark:bg-[#161b22] border-gray-200 dark:border-[#30363d] text-gray-700 dark:text-[#8b949e]"}`}
        style={isToday ? { background: "linear-gradient(135deg, #004d59, #ff6700)" } : {}}>
        <span className="text-sm font-black leading-none">{d.getDate()}</span>
        <span className="text-[9px] leading-none mt-0.5 opacity-80">
          {d.toLocaleDateString(isAr ? "ar-EG" : "en-US", { month: "short" })}
        </span>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className={`font-black text-sm ${isToday ? "text-[#ff6700]" : "text-gray-900 dark:text-[#e6edf3]"}`}>
            {isToday ? t("اليوم", "Today") : d.toLocaleDateString(isAr ? "ar-EG" : "en-US", { weekday: "long" })}
          </span>
          {isToday && <span className="w-2 h-2 rounded-full bg-[#ff6700] animate-pulse" />}
        </div>
        <span className="text-xs text-gray-400 dark:text-[#6e7681]">
          {d.toLocaleDateString(isAr ? "ar-EG" : "en-US", { month: "long", day: "numeric" })} · {sessions.length} {t("جلسة", sessions.length === 1 ? "session" : "sessions")}
        </span>
      </div>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, rgba(0,77,89,0.3), transparent)" }} />
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, value, label, gradient }) {
  return (
    <div className="group relative bg-white dark:bg-[#161b22] rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-[#30363d] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-5 -translate-y-4 translate-x-4" style={{ background: gradient }} />
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300 flex-shrink-0"
          style={{ background: gradient }}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-[#e6edf3]">
            <AnimatedCounter value={typeof value === "number" ? value : 0} />
          </p>
          <p className="text-xs text-gray-500 dark:text-[#8b949e] font-medium mt-0.5">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-[72px] bg-white dark:bg-[#161b22] rounded-2xl animate-pulse border border-gray-100 dark:border-[#30363d]"
          style={{ opacity: 1 - i * 0.15 }} />
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

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [requestAccessSession, setRequestAccessSession] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [groupByDate, setGroupByDate] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [groups, setGroups] = useState([]);

  const fetchData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true); else setLoading(true);
      setError("");
      const [sessRes, dashRes] = await Promise.all([
        fetch("/api/instructor/sessions", { credentials: "include" }).then(r => r.json()),
        fetch("/api/instructor/dashboard", { credentials: "include" }).then(r => r.json()),
      ]);
      if (sessRes.success) {
        setSessions(sessRes.data.sessions || []);
        setStats(sessRes.data.stats || null);
        const groupMap = {};
        (sessRes.data.sessions || []).forEach(s => {
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

  const today = fmtDateKey(new Date());

  const filtered = sessions.filter(s => {
    const sDate = fmtDateKey(s.scheduledDate);
    const filterMatch =
      filter === "all" ? true :
        filter === "completed" ? s.status === "completed" :
          filter === "upcoming" ? s.status === "scheduled" :
            filter === "today" ? sDate === today :
              filter === "cancelled" ? s.status === "cancelled" || s.status === "postponed" :
                filter === "needs_att" ? s.status === "completed" && !s.attendanceTaken : true;
    const groupMatch = selectedGroup === "all" || s.group?._id === selectedGroup;
    const searchMatch = !search || s.title?.toLowerCase().includes(search.toLowerCase()) || s.group?.name?.toLowerCase().includes(search.toLowerCase());
    return filterMatch && groupMatch && searchMatch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.status === "scheduled" && b.status !== "scheduled") return -1;
    if (b.status === "scheduled" && a.status !== "scheduled") return 1;
    return new Date(a.scheduledDate) - new Date(b.scheduledDate);
  });

  const byDate = {};
  sorted.forEach(s => {
    const dk = fmtDateKey(s.scheduledDate);
    if (!byDate[dk]) byDate[dk] = [];
    byDate[dk].push(s);
  });
  const sortedDates = Object.keys(byDate).sort((a, b) => new Date(a) - new Date(b));

  const FILTERS = [
    { id: "all", labelAr: "الكل", labelEn: "All", count: sessions.length },
    { id: "upcoming", labelAr: "القادمة", labelEn: "Upcoming", count: sessions.filter(s => s.status === "scheduled").length },
    { id: "completed", labelAr: "المكتملة", labelEn: "Completed", count: sessions.filter(s => s.status === "completed").length },
    { id: "today", labelAr: "اليوم", labelEn: "Today", count: sessions.filter(s => fmtDateKey(s.scheduledDate) === today).length },
    { id: "needs_att", labelAr: "تحتاج حضور", labelEn: "Need Attendance", count: sessions.filter(s => s.status === "completed" && !s.attendanceTaken).length },
    { id: "cancelled", labelAr: "ملغاة/مؤجلة", labelEn: "Cancelled", count: sessions.filter(s => s.status === "cancelled" || s.status === "postponed").length },
  ];

  const todayJoinable = sessions.filter(s => s.showJoinButton);
  const currentUser = user || { name: isAr ? "مدرس" : "Instructor", email: "", role: "instructor" };

  const handleRequestSubmitted = useCallback(() => {
    // بعد التقديم بنجاح، نعمل refresh خفيف عشان الـ pendingReschedule badge يظهر فورًا
    fetchData(true);
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-[#0a0f17] flex" dir={isAr ? "rtl" : "ltr"}>

      {refreshing && (
        <div className={`fixed top-4 ${isAr ? "left-4" : "right-4"} z-50 text-white px-4 py-2 rounded-xl shadow-xl flex items-center gap-2`}
          style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-bold">{t("جاري التحديث...", "Refreshing...")}</span>
        </div>
      )}

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
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

        {/* ── Sticky Toolbar ── */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#0d1117]/95 backdrop-blur-xl border-b border-gray-200/80 dark:border-[#21262d]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}>
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
                    onChange={e => setSearch(e.target.value)}
                    placeholder={t("بحث...", "Search...")}
                    className={`w-44 bg-gray-100 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl ${isAr ? "pr-9 pl-4" : "pl-9 pr-4"} py-2 text-sm text-gray-900 dark:text-[#e6edf3] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff6700]/30 focus:border-[#ff6700]/50 transition-all`}
                  />
                </div>

                {groups.length > 1 && (
                  <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}
                    className="hidden sm:block bg-gray-100 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-[#8b949e] focus:outline-none focus:ring-2 focus:ring-[#ff6700]/30 transition-all">
                    <option value="all">{t("كل المجموعات", "All Groups")}</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                )}

                <div className="flex bg-gray-100 dark:bg-[#161b22] rounded-xl p-1 gap-0.5 border border-gray-200 dark:border-[#30363d]">
                  <button onClick={() => setGroupByDate(true)}
                    className={`p-1.5 rounded-lg transition-all ${groupByDate ? "bg-white dark:bg-[#21262d] shadow text-[#ff6700]" : "text-gray-400 hover:text-gray-600"}`}>
                    <CalendarDays className="w-4 h-4" />
                  </button>
                  <button onClick={() => setGroupByDate(false)}
                    className={`p-1.5 rounded-lg transition-all ${!groupByDate ? "bg-white dark:bg-[#21262d] shadow text-[#ff6700]" : "text-gray-400 hover:text-gray-600"}`}>
                    <ListFilter className="w-4 h-4" />
                  </button>
                </div>

                <button onClick={() => fetchData(true)}
                  className="p-2 rounded-xl bg-gray-100 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] text-gray-500 hover:text-[#ff6700] hover:border-[#ff6700]/30 transition-all">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1.5 pb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {FILTERS.map(({ id, labelAr, labelEn, count }) => (
                <button key={id} onClick={() => setFilter(id)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black flex-shrink-0 transition-all duration-200
                    ${filter === id
                      ? "text-white shadow-lg"
                      : "bg-gray-100 dark:bg-[#161b22] text-gray-600 dark:text-[#8b949e] hover:bg-gray-200 dark:hover:bg-[#21262d] border border-gray-200 dark:border-[#30363d]"}`}
                  style={filter === id ? { background: "linear-gradient(135deg, #004d59, #ff6700)", boxShadow: "0 4px 12px rgba(255,103,0,0.25)" } : {}}>
                  {isAr ? labelAr : labelEn}
                  <span className={`text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black
                    ${filter === id ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-[#21262d] text-gray-500 dark:text-[#6e7681]"}`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">

          {/* Stat Cards */}
          {!loading && stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <StatCard icon={Calendar} value={stats.total} label={t("إجمالي الجلسات", "Total Sessions")} gradient="linear-gradient(135deg, #004d59, #004d59aa)" />
              <StatCard icon={CheckCircle} value={stats.completed} label={t("مكتملة", "Completed")} gradient="linear-gradient(135deg, #10b981, #14b8a6)" />
              <StatCard icon={Clock} value={stats.scheduled} label={t("مجدولة", "Scheduled")} gradient="linear-gradient(135deg, #ff6700, #feaf00)" />
              <StatCard icon={ClipboardList} value={stats.needsAttendance || 0} label={t("تحتاج حضور", "Need Attendance")} gradient="linear-gradient(135deg, #feaf00, #ff6437)" />
            </div>
          )}

          {/* Today's Session Banner */}
          {todayJoinable.length > 0 && filter === "all" && (
            <div className="mb-5 rounded-2xl p-4 text-white relative overflow-hidden shadow-lg"
              style={{ background: "linear-gradient(135deg, #004d59 0%, #004d59dd 40%, #ff6700 100%)" }}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-[#feaf00]/20 rounded-full blur-2xl" />
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/20">
                  <Zap className="w-5 h-5 text-[#feaf00]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/60 font-bold">{t("جلسة اليوم جاهزة", "Today's Session Ready")}</p>
                  <p className="font-black text-sm truncate">{todayJoinable[0].title}</p>
                </div>
                <a href={todayJoinable[0].meetingLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white font-black text-xs px-4 py-2.5 rounded-xl hover:bg-orange-50 transition-all shadow-lg flex-shrink-0"
                  style={{ color: "#ff6700" }}>
                  <Video className="w-4 h-4" />{t("ابدأ الآن", "Start Now")}
                </a>
              </div>
            </div>
          )}

          {/* Needs Attendance Warning */}
          {filter === "all" && !loading && sessions.filter(s => s.status === "completed" && !s.attendanceTaken).length > 0 && (
            <div className="mb-5 bg-[#feaf00]/10 dark:bg-[#feaf00]/5 border border-[#feaf00]/30 dark:border-[#feaf00]/20 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#feaf00]/20 dark:bg-[#feaf00]/10 flex items-center justify-center flex-shrink-0 border border-[#feaf00]/30 dark:border-[#feaf00]/20">
                  <ClipboardList className="w-4 h-4 text-[#f67d00] dark:text-[#feaf00]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-[#f67d00] dark:text-[#feaf00]">
                    {sessions.filter(s => s.status === "completed" && !s.attendanceTaken).length}{" "}
                    {t("جلسة تحتاج تسجيل حضور", "sessions need attendance recording")}
                  </p>
                  <p className="text-xs text-[#f67d00]/70 dark:text-[#feaf00]/60 mt-0.5">
                    {t("انقر على الجلسة لتسجيل الحضور", "Click on a session to record attendance")}
                  </p>
                </div>
                <button onClick={() => setFilter("needs_att")}
                  className="text-xs font-black text-[#f67d00] dark:text-[#feaf00] hover:underline flex-shrink-0 px-3 py-1.5 rounded-lg bg-[#feaf00]/20 dark:bg-[#feaf00]/10 border border-[#feaf00]/30 dark:border-[#feaf00]/20 transition-colors hover:bg-[#feaf00]/30 dark:hover:bg-[#feaf00]/20">
                  {t("عرضها", "Show them")}
                </button>
              </div>
            </div>
          )}

          {loading && <Skeleton />}

          {!loading && error && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4 border border-red-200 dark:border-red-800/30">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-gray-500 mb-4">{error}</p>
              <button onClick={() => fetchData()}
                className="px-6 py-3 text-white rounded-xl font-black hover:shadow-lg transition-all"
                style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}>
                {t("إعادة المحاولة", "Try Again")}
              </button>
            </div>
          )}

          {!loading && !error && sorted.length === 0 && (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gray-100 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] flex items-center justify-center mb-4">
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
                {sortedDates.map(dk => (
                  <div key={dk}>
                    <DateHeader dateKey={dk} sessions={byDate[dk]} isAr={isAr} />
                    <div className="space-y-2.5" style={{ [isAr ? "paddingRight" : "paddingLeft"]: "60px" }}>
                      {byDate[dk].map(s => (
                        <SessionRow
                          key={s._id}
                          session={s}
                          onOpen={setModal}
                          onRequestAccess={setRequestAccessSession}
                          isAr={isAr}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {sorted.map(s => (
                  <SessionRow
                    key={s._id}
                    session={s}
                    onOpen={setModal}
                    onRequestAccess={setRequestAccessSession}
                    isAr={isAr}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </main>

      {modal && <SessionModal session={modal} onClose={() => setModal(null)} isAr={isAr} />}
      {requestAccessSession && (
        <RequestAccessModal
          session={requestAccessSession}
          onClose={() => setRequestAccessSession(null)}
          onSubmitted={handleRequestSubmitted}
          isAr={isAr}
        />
      )}
    </div>
  );
}