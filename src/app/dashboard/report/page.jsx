"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/app/context/LocaleContext";
import StudentSidebar from "../StudentSidebar";
import StudentHeader from "../StudentHeader";
import {
  Award, TrendingUp, Target, BookOpen, Calendar, Users,
  Star, AlertTriangle, CheckCircle, XCircle, RefreshCw,
  BarChart3, ChevronDown, FileText, Loader2, Sparkles, Clock,
} from "lucide-react";

const BRAND = { orange: "#ff6700", teal: "#004d59", gold: "#feaf00" };

const CRITERIA_META = {
  understanding: { en: "Understanding", ar: "الفهم",    color: "#ff6700" },
  commitment:    { en: "Commitment",    ar: "الالتزام", color: "#feaf00" },
  attendance:    { en: "Attendance",    ar: "الحضور",   color: "#0e8a9c" },
  participation: { en: "Participation", ar: "المشاركة", color: "#ff6437" },
};

const DECISION_STYLE = {
  pass:   { en: "Pass",   ar: "ناجح",   bg: "rgba(16,185,129,.12)", fg: "#10b981", border: "rgba(16,185,129,.28)", icon: CheckCircle },
  review: { en: "Review", ar: "مراجعة", bg: "rgba(245,158,11,.12)", fg: "#f59e0b", border: "rgba(245,158,11,.28)", icon: AlertTriangle },
  repeat: { en: "Repeat", ar: "إعادة",  bg: "rgba(239,68,68,.12)",  fg: "#ef4444", border: "rgba(239,68,68,.28)",  icon: XCircle },
};

function getLevel(score, isRTL) {
  if (score >= 4.5) return { text: isRTL ? "أداء ممتاز" : "Outstanding", color: "#10b981" };
  if (score >= 3.5) return { text: isRTL ? "جيد جداً" : "Very Good", color: "#0e8a9c" };
  if (score >= 2.5) return { text: isRTL ? "جيد" : "Good", color: "#f59e0b" };
  return { text: isRTL ? "يحتاج تحسين" : "Needs Improvement", color: "#ef4444" };
}

/* ───────────── Score Ring ───────────── */
function ScoreRing({ value, max = 5, size = 132 }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / max);
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }} dir="ltr">
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={BRAND.gold} />
            <stop offset="100%" stopColor={BRAND.orange} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="url(#ringGrad)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="text-3xl font-black leading-none">{value.toFixed(1)}</span>
        <span className="text-[11px] font-semibold text-white/60 mt-1">/ {max}</span>
      </div>
    </div>
  );
}

/* ───────────── Trend Sparkline ───────────── */
function TrendChart({ scores, isRTL }) {
  if (scores.length < 2) return null;
  const W = 300, H = 90, padX = 8, padY = 10;
  const stepX = (W - padX * 2) / (scores.length - 1);
  const y = (v) => H - padY - ((v - 1) / 4) * (H - padY * 2);
  const pts = scores.map((v, i) => [padX + i * stepX, y(v)]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z`;

  return (
    <div className="rounded-3xl bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] p-5 sm:p-6 shadow-sm">
      <h3 className="text-base font-black text-gray-900 dark:text-[#e6edf3] mb-1 flex items-center gap-2">
        <TrendingUp className="w-5 h-5" style={{ color: BRAND.orange }} />
        {isRTL ? "تطور مستواك" : "Your Progress"}
      </h3>
      <p className="text-[12px] text-gray-400 dark:text-[#6e7681] mb-4">
        {isRTL ? "المعدل العام في كل تقييم بالترتيب الزمني" : "Overall score per evaluation over time"}
      </p>
      <div dir="ltr">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24">
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND.orange} stopOpacity=".28" />
              <stop offset="100%" stopColor={BRAND.orange} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#trendFill)" />
          <path d={line} fill="none" stroke={BRAND.orange} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((p, i) => (
            <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="#fff" stroke={BRAND.orange} strokeWidth="2" />
          ))}
        </svg>
      </div>
    </div>
  );
}

/* ───────────── Score Bar ───────────── */
function ScoreBar({ label, value, max = 5, color }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-semibold text-gray-600 dark:text-[#8b949e] mb-1.5">
        <span>{label}</span>
        <span dir="ltr" className="font-black text-gray-900 dark:text-[#e6edf3]">
          {value.toFixed(1)} <span className="text-gray-400 font-semibold">/ {max}</span>
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}bb)` }}
        />
      </div>
    </div>
  );
}

/* ───────────── Evaluation Card ───────────── */
function EvaluationCard({ ev, isRTL }) {
  const [open, setOpen] = useState(false);
  const dec = DECISION_STYLE[ev.finalDecision] || DECISION_STYLE.review;
  const DecIcon = dec.icon;
  const locale = isRTL ? "ar-EG" : "en-US";

  const dateStr = ev.sessionDate
    ? new Date(ev.sessionDate).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })
    : null;

  return (
    <div
      className="rounded-2xl bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
      style={{ borderInlineStart: `4px solid ${dec.fg}` }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 sm:p-5 text-start hover:bg-gray-50/60 dark:hover:bg-[#1c2128] transition-colors"
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-white shadow-md"
          style={{ background: `linear-gradient(135deg, ${BRAND.teal}, ${BRAND.orange})` }}
        >
          <BookOpen className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-[14px] sm:text-[15px] text-gray-900 dark:text-[#e6edf3] truncate">
            {ev.sessionTitle}
          </h4>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-[#8b949e] mt-1">
            {ev.groupName && (
              <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {ev.groupName}</span>
            )}
            {dateStr && (
              <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {dateStr}</span>
            )}
            {ev.instructorName && (
              <span className="inline-flex items-center gap-1"><Award className="w-3 h-3" /> {ev.instructorName}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span
            className="hidden sm:inline-flex text-[11px] font-bold px-2.5 py-1 rounded-full items-center gap-1"
            style={{ background: dec.bg, color: dec.fg, border: `1px solid ${dec.border}` }}
          >
            <DecIcon className="w-3 h-3" />
            {isRTL ? dec.ar : dec.en}
          </span>
          <div
            dir="ltr"
            className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center"
            style={{ background: "rgba(255,103,0,.08)", border: "1px solid rgba(255,103,0,.18)" }}
          >
            <span className="text-[15px] font-black leading-none" style={{ color: BRAND.orange }}>
              {ev.overallScore.toFixed(1)}
            </span>
            <span className="text-[9px] font-semibold text-gray-400 mt-0.5">/ 5</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-gray-100 dark:border-[#30363d] space-y-4">
          <span
            className="sm:hidden inline-flex mt-3 text-[11px] font-bold px-2.5 py-1 rounded-full items-center gap-1"
            style={{ background: dec.bg, color: dec.fg, border: `1px solid ${dec.border}` }}
          >
            <DecIcon className="w-3 h-3" />
            {isRTL ? dec.ar : dec.en}
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {Object.entries(CRITERIA_META).map(([key, meta]) => (
              <ScoreBar key={key} label={isRTL ? meta.ar : meta.en} value={ev.criteria[key] || 0} color={meta.color} />
            ))}
          </div>

          {ev.notes && (
            <div className="rounded-2xl p-4 bg-gray-50 dark:bg-[#0d1117] border border-gray-100 dark:border-[#21262d]">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-3.5 h-3.5" style={{ color: BRAND.orange }} />
                <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-[#8b949e]">
                  {isRTL ? "ملاحظات المدرس" : "Instructor Notes"}
                </span>
              </div>
              <p className="text-[13px] leading-relaxed text-gray-700 dark:text-[#c9d1d9] whitespace-pre-line">{ev.notes}</p>
            </div>
          )}

          {(ev.weakPoints.length > 0 || ev.strengths.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ev.weakPoints.length > 0 && (
                <div className="rounded-2xl p-4 border" style={{ background: "rgba(239,68,68,.05)", borderColor: "rgba(239,68,68,.18)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wide text-red-600 dark:text-red-400">
                      {isRTL ? "نقاط تحتاج تحسين" : "Areas to Improve"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ev.weakPoints.map((wp) => (
                      <span key={wp.key} className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300">
                        {isRTL ? wp.label.ar : wp.label.en}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {ev.strengths.length > 0 && (
                <div className="rounded-2xl p-4 border" style={{ background: "rgba(16,185,129,.05)", borderColor: "rgba(16,185,129,.18)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                      {isRTL ? "نقاط القوة" : "Strengths"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ev.strengths.map((st) => (
                      <span key={st.key} className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                        {isRTL ? st.label.ar : st.label.en}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-[#6e7681] pt-3 border-t border-gray-100 dark:border-[#21262d]">
            <Clock className="w-3 h-3" />
            {isRTL ? "تاريخ التقييم: " : "Evaluated on "}
            {new Date(ev.evaluatedAt).toLocaleString(isRTL ? "ar-EG" : "en-US")}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────── Page ───────────── */
export default function StudentReportPage() {
  const { locale } = useLocale();
  const isRTL = locale === "ar";
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [filter, setFilter] = useState("all");

  const fetchAll = async (silent = false) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError("");

      const dRes = await fetch("/api/student/dashboard", { credentials: "include" });
      const dJson = await dRes.json();
      if (dJson?.success) {
        setUser(dJson.data.user);
        setNotifications(dJson.data.notifications || []);
      }

      const rRes = await fetch("/api/student/report", { credentials: "include" });
      const rJson = await rRes.json();
      if (!rRes.ok || !rJson.success) throw new Error(rJson.message || "Failed to load report");
      setReportData(rJson.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("token");
    router.push("/");
  };

  const summary = reportData?.summary;
  const evaluations = reportData?.evaluations || [];

  const filtered = useMemo(
    () => (filter === "all" ? evaluations : evaluations.filter((e) => e.finalDecision === filter)),
    [evaluations, filter]
  );

  // ترتيب زمني تصاعدي للمنحنى
  const trendScores = useMemo(
    () =>
      [...evaluations]
        .sort((a, b) => new Date(a.evaluatedAt) - new Date(b.evaluatedAt))
        .map((e) => e.overallScore),
    [evaluations]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0d1117] flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
        <div className="text-center">
          <div
            className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center shadow-xl mb-4 animate-pulse"
            style={{ background: `linear-gradient(135deg, ${BRAND.orange}, ${BRAND.teal})` }}
          >
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <p className="text-sm text-gray-400 dark:text-[#6e7681]">
            {isRTL ? "جارٍ تحميل تقريرك..." : "Loading your report..."}
          </p>
        </div>
      </div>
    );
  }

  const isEmpty = !summary || summary.totalEvaluations === 0;
  const level = summary ? getLevel(summary.averages.overall, isRTL) : null;
  const total = summary?.totalEvaluations || 0;

  const distribution = summary
    ? [
        { key: "pass", value: summary.passCount },
        { key: "review", value: summary.reviewCount },
        { key: "repeat", value: summary.repeatCount },
      ]
    : [];

  const filterTabs = [
    { key: "all", label: isRTL ? "الكل" : "All", count: evaluations.length },
    { key: "pass", label: isRTL ? "ناجح" : "Pass", count: summary?.passCount || 0 },
    { key: "review", label: isRTL ? "مراجعة" : "Review", count: summary?.reviewCount || 0 },
    { key: "repeat", label: isRTL ? "إعادة" : "Repeat", count: summary?.repeatCount || 0 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0d1117] flex relative" dir={isRTL ? "rtl" : "ltr"}>
      {refreshing && (
        <div
          className={`fixed top-4 ${isRTL ? "left-4" : "right-4"} z-50 text-white px-4 py-2 rounded-xl shadow-xl flex items-center gap-2`}
          style={{ background: `linear-gradient(135deg, ${BRAND.teal}, ${BRAND.orange})` }}
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-bold">{isRTL ? "جاري التحديث..." : "Refreshing..."}</span>
        </div>
      )}

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      <div
        className={`fixed lg:static inset-y-0 ${isRTL ? "right-0" : "left-0"} z-50 transform transition-all duration-500 ${
          sidebarOpen ? "translate-x-0" : (isRTL ? "translate-x-full" : "-translate-x-full") + " lg:translate-x-0"
        } flex-shrink-0`}
      >
        <StudentSidebar user={user} onLogout={handleLogout} />
      </div>

      <main className="flex-1 min-w-0">
        <StudentHeader
          user={user || { _id: "", name: "", email: "", role: "student" }}
          notifications={notifications}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          onRefresh={() => fetchAll(true)}
        />

        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-6xl mx-auto">
          {/* Title row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${BRAND.orange}, ${BRAND.teal})`, boxShadow: "0 8px 20px -4px rgba(255,103,0,.35)" }}
              >
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-[#e6edf3]">
                  {isRTL ? "تقرير الأداء" : "Performance Report"}
                </h1>
                <p className="text-[12px] text-gray-400 dark:text-[#6e7681] mt-0.5">
                  {isRTL ? "كل تقييماتك من المدرسين في مكان واحد" : "All your instructor evaluations in one place"}
                </p>
              </div>
            </div>
            <button
              onClick={() => fetchAll(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium border transition-all bg-white dark:bg-[#161b22] border-gray-200 dark:border-[#30363d] text-gray-600 dark:text-[#8b949e] hover:border-[#ff6700]/40 hover:text-[#ff6700] disabled:opacity-50 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{isRTL ? "تحديث" : "Refresh"}</span>
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Empty state */}
          {!error && isEmpty && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div
                className="w-24 h-24 rounded-3xl flex items-center justify-center mb-5"
                style={{ background: "linear-gradient(135deg,rgba(255,103,0,.08),rgba(0,77,89,.08))", border: "1px solid rgba(255,103,0,.12)" }}
              >
                <BarChart3 className="w-10 h-10 text-[#ff6700]/40" />
              </div>
              <h3 className="text-[16px] font-bold text-gray-800 dark:text-[#e6edf3] mb-1.5">
                {isRTL ? "لا توجد تقييمات بعد" : "No evaluations yet"}
              </h3>
              <p className="text-[13px] text-gray-400 dark:text-[#6e7681] max-w-xs">
                {isRTL
                  ? "هيظهر هنا أول ما المدرس يعمل تقييم لسيشن من سيشناتك"
                  : "Evaluations will appear here once your instructor submits them"}
              </p>
            </div>
          )}

          {!isEmpty && (
            <>
              {/* Hero */}
              <div
                className="relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-xl"
                style={{ background: `linear-gradient(135deg, ${BRAND.teal} 0%, #003a43 60%, #002a31 100%)` }}
              >
                <div className="absolute -top-16 -end-16 w-64 h-64 rounded-full blur-3xl opacity-40" style={{ background: BRAND.orange }} />
                <div className="absolute -bottom-20 -start-10 w-56 h-56 rounded-full blur-3xl opacity-20" style={{ background: BRAND.gold }} />

                <div className="relative flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                  <ScoreRing value={summary.averages.overall} />
                  <div className="flex-1 text-center sm:text-start">
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-white/10 border border-white/15 mb-3">
                      <Sparkles className="w-3 h-3" style={{ color: BRAND.gold }} />
                      {level.text}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black leading-snug">
                      {reportData?.studentName
                        ? (isRTL ? `أهلاً ${reportData.studentName}` : `Hello, ${reportData.studentName}`)
                        : (isRTL ? "ملخص أدائك" : "Your Performance Summary")}
                    </h2>
                    <p className="text-[13px] text-white/70 mt-1.5 max-w-md">
                      {isRTL
                        ? `المعدل العام محسوب من ${total} تقييم من مدرسيك.`
                        : `Overall score calculated from ${total} instructor evaluations.`}
                    </p>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-4">
                      {distribution.map((d) => {
                        const st = DECISION_STYLE[d.key];
                        const I = st.icon;
                        return (
                          <span key={d.key} className="inline-flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-xl bg-white/10 border border-white/10">
                            <I className="w-3.5 h-3.5" style={{ color: st.fg }} />
                            {isRTL ? st.ar : st.en}
                            <span className="text-white/90">{d.value}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { label: isRTL ? "إجمالي التقييمات" : "Total Evaluations", value: summary.totalEvaluations, Icon: FileText, color: BRAND.orange },
                  { label: isRTL ? "المعدل العام" : "Overall Avg", value: summary.averages.overall.toFixed(1), Icon: TrendingUp, color: BRAND.teal },
                  { label: isRTL ? "ناجح" : "Passed", value: summary.passCount, Icon: CheckCircle, color: "#10b981" },
                  { label: isRTL ? "بحاجة إعادة" : "Need Repeat", value: summary.repeatCount, Icon: XCircle, color: "#ef4444" },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="group rounded-2xl bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] p-4 sm:p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md mb-3"
                      style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}bb)` }}
                    >
                      <s.Icon className="w-5 h-5" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-[#e6edf3] leading-tight">{s.value}</div>
                    <div className="text-[11px] font-semibold text-gray-500 dark:text-[#8b949e] mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Criteria + Trend */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-3xl bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] p-5 sm:p-6 shadow-sm">
                  <h3 className="text-base font-black text-gray-900 dark:text-[#e6edf3] mb-1 flex items-center gap-2">
                    <Target className="w-5 h-5" style={{ color: BRAND.orange }} />
                    {isRTL ? "متوسط المعايير" : "Criteria Averages"}
                  </h3>
                  <p className="text-[12px] text-gray-400 dark:text-[#6e7681] mb-5">
                    {isRTL ? "معدل أدائك في كل معيار على مدار كل التقييمات" : "Your average performance across all evaluations"}
                  </p>
                  <div className="space-y-4">
                    {Object.entries(CRITERIA_META).map(([key, meta]) => (
                      <ScoreBar key={key} label={isRTL ? meta.ar : meta.en} value={summary.averages[key] || 0} color={meta.color} />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <TrendChart scores={trendScores} isRTL={isRTL} />

                  <div className="rounded-3xl bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] p-5 sm:p-6 shadow-sm">
                    <h3 className="text-base font-black text-gray-900 dark:text-[#e6edf3] mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" style={{ color: BRAND.orange }} />
                      {isRTL ? "توزيع القرارات" : "Decision Breakdown"}
                    </h3>
                    <div className="h-3 rounded-full overflow-hidden flex bg-gray-100 dark:bg-[#21262d]">
                      {distribution.map((d) => (
                        <div
                          key={d.key}
                          className="h-full transition-all duration-1000"
                          style={{ width: `${(d.value / total) * 100}%`, background: DECISION_STYLE[d.key].fg }}
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                      {distribution.map((d) => (
                        <span key={d.key} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-gray-600 dark:text-[#8b949e]">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: DECISION_STYLE[d.key].fg }} />
                          {isRTL ? DECISION_STYLE[d.key].ar : DECISION_STYLE[d.key].en} ({d.value})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Strengths / Weak points */}
              {(summary.topWeakPoints.length > 0 || summary.topStrengths.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {summary.topStrengths.length > 0 && (
                    <div className="rounded-3xl bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] p-5 shadow-sm">
                      <h4 className="text-sm font-black text-gray-900 dark:text-[#e6edf3] mb-4 flex items-center gap-2">
                        <Star className="w-4 h-4 text-emerald-500" />
                        {isRTL ? "أبرز نقاط قوتك" : "Your Top Strengths"}
                      </h4>
                      <div className="space-y-2.5">
                        {summary.topStrengths.map((st) => (
                          <div key={st.key} className="flex items-center justify-between rounded-xl px-3 py-2 bg-emerald-50/60 dark:bg-emerald-500/5">
                            <span className="text-[13px] font-semibold text-gray-700 dark:text-[#c9d1d9]">{isRTL ? st.label.ar : st.label.en}</span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">×{st.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {summary.topWeakPoints.length > 0 && (
                    <div className="rounded-3xl bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] p-5 shadow-sm">
                      <h4 className="text-sm font-black text-gray-900 dark:text-[#e6edf3] mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        {isRTL ? "أكثر النقاط تكراراً للتحسين" : "Top Areas to Improve"}
                      </h4>
                      <div className="space-y-2.5">
                        {summary.topWeakPoints.map((wp) => (
                          <div key={wp.key} className="flex items-center justify-between rounded-xl px-3 py-2 bg-red-50/60 dark:bg-red-500/5">
                            <span className="text-[13px] font-semibold text-gray-700 dark:text-[#c9d1d9]">{isRTL ? wp.label.ar : wp.label.en}</span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300">×{wp.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Evaluations list */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <h3 className="text-base font-black text-gray-900 dark:text-[#e6edf3] flex items-center gap-2">
                    <FileText className="w-5 h-5" style={{ color: BRAND.orange }} />
                    {isRTL ? "تفاصيل التقييمات" : "Evaluation Details"}
                    <span className="text-[12px] font-semibold text-gray-400 dark:text-[#6e7681]">({filtered.length})</span>
                  </h3>

                  <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] shadow-sm overflow-x-auto">
                    {filterTabs.map((t) => {
                      const active = filter === t.key;
                      return (
                        <button
                          key={t.key}
                          onClick={() => setFilter(t.key)}
                          className={`px-3.5 py-1.5 rounded-xl text-[12px] font-bold whitespace-nowrap transition-all ${
                            active ? "text-white shadow-md" : "text-gray-500 dark:text-[#8b949e] hover:bg-gray-50 dark:hover:bg-[#1c2128]"
                          }`}
                          style={active ? { background: `linear-gradient(135deg, ${BRAND.orange}, ${BRAND.teal})` } : undefined}
                        >
                          {t.label} <span className={active ? "text-white/80" : "text-gray-400"}>{t.count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <div className="text-center py-12 text-[13px] text-gray-400 dark:text-[#6e7681] rounded-2xl bg-white dark:bg-[#161b22] border border-dashed border-gray-200 dark:border-[#30363d]">
                    {isRTL ? "لا توجد تقييمات بهذا القرار" : "No evaluations with this decision"}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filtered.map((ev) => (
                      <EvaluationCard key={ev._id} ev={ev} isRTL={isRTL} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}