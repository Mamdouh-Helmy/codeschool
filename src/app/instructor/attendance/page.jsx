"use client";
// src/app/instructor/attendance/page.jsx

import React, {
  memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle, BarChart3, CheckCheck, CheckCircle2, ChevronLeft, ChevronRight,
  ClipboardList, Clock, Gift, Info, ListChecks, Lock, RefreshCw,
  Search, Shield, Sparkles, TrendingUp, Users, X, Zap,
} from "@/components/icons";
import {
  dGrad, PaperPlane, PaperPlaneFlight, FlightStyles, PaperPlaneLoader,
} from "@/components/interviewShared";
import { useLocale } from "@/app/context/LocaleContext";

// ═══════════════════════════════════════════════════════════════════════════
// Constants (برّه الـ components → بتتعمل مرة واحدة بس، مش في كل render)
// ═══════════════════════════════════════════════════════════════════════════
const BRAND_GRAD = "linear-gradient(135deg, #004d59, #ff6700)";
const HERO_GRAD = "linear-gradient(135deg, #004d59 0%, #004d59dd 40%, #ff6700 100%)";
const SUCCESS_GRAD = "linear-gradient(135deg, #002a33 0%, #004d59 55%, #ff6700 100%)";
const DOTS_STYLE = {
  backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
  backgroundSize: "24px 24px",
};
const MAX_ANIMATED_CARDS = 8;
const REDIRECT_DELAY = 2200;

// أنيميشن خفيف one-shot (مفيش infinite animations ولا blur تقيل)
const KEYFRAMES = `
@keyframes attIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes attPop {
  0% { transform: scale(.4) rotate(-12deg); opacity: 0; }
  65% { transform: scale(1.12) rotate(4deg); opacity: 1; }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}`;

// الـ styles الثابتة لكل حالة بتتحسب مرة واحدة هنا
const buildStatus = (cfg) => ({
  ...cfg,
  grad: dGrad(cfg),
  activeStyle: { background: dGrad(cfg), boxShadow: `0 14px 28px -12px ${cfg.c1}99` },
  idleStyle: { borderColor: `${cfg.c1}45`, background: `${cfg.c1}0f`, color: cfg.c1 },
  iconIdleStyle: { background: dGrad(cfg) },
  rowBorderStyle: { borderColor: `${cfg.c1}40` },
});

const STATUS = {
  present: buildStatus({ ar: "حاضر", en: "Present", icon: CheckCircle2, c1: "#059669", c2: "#14b8a6" }),
  absent: buildStatus({ ar: "غائب", en: "Absent", icon: X, c1: "#e11d48", c2: "#ff6437" }),
  excused: buildStatus({ ar: "معذور", en: "Excused", icon: Shield, c1: "#0284c7", c2: "#6366f1" }),
  // "late" للحضور المبدئي بس — الخصم بيحصل من present/absent/excused في التأكيد النهائي
  late: buildStatus({ ar: "متأخر", en: "Late", icon: Clock, c1: "#f59e0b", c2: "#f67d00" }),
};

const FINAL_STATUSES = ["present", "absent", "excused"];
const ROLLCALL_STATUSES = ["present", "late"];

// ─── Helpers ────────────────────────────────────────────────────────────────
const cardAnim = (i) =>
  i < MAX_ANIMATED_CARDS ? { animation: `attIn .4s ${i * 0.05}s both ease-out` } : undefined;

const fmtDate = (d, isAr) =>
  d
    ? new Date(d).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    })
    : "";

function fmtTime(time, isAr) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? (isAr ? "م" : "PM") : (isAr ? "ص" : "AM");
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Small shared components
// ═══════════════════════════════════════════════════════════════════════════
const ProgressRing = memo(function ProgressRing({ value, total, id }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="relative w-11 h-11 flex-shrink-0">
      <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-100 dark:text-[#21262d]" />
        <circle cx="18" cy="18" r="15" fill="none" stroke={`url(#${id})`} strokeWidth="3"
          strokeDasharray={`${(pct / 100) * 94} 94`} strokeLinecap="round" />
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#004d59" />
            <stop offset="100%" stopColor="#ff6700" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-[#ff6700]">
        {pct}%
      </span>
    </div>
  );
});

const ProgressBar = memo(function ProgressBar({ pct }) {
  return (
    <div className="h-2.5 w-full bg-gray-100 dark:bg-[#21262d] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%`, background: BRAND_GRAD }} />
    </div>
  );
});

const SearchBox = memo(function SearchBox({ value, onChange, placeholder, isAr }) {
  return (
    <div className="relative flex-1">
      <Search className={`absolute ${isAr ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-2xl ${isAr ? "pr-9 pl-4" : "pl-9 pr-4"} py-3 text-sm text-gray-900 dark:text-[#e6edf3] placeholder:text-gray-400 focus:outline-none focus:border-[#ff6700]/60 transition-colors`}
      />
    </div>
  );
});

function BottomBar({ children }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 p-3 sm:p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-[#161b22] rounded-3xl border border-gray-200 dark:border-[#30363d] p-3.5 shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}

function InlineError({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 mb-3 p-2.5 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800/40">
      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
      <p className="text-xs font-bold text-red-600 dark:text-red-400">{message}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      <div className="h-24 bg-white dark:bg-[#161b22] rounded-3xl border border-gray-100 dark:border-[#30363d]" />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-[76px] bg-white dark:bg-[#161b22] rounded-3xl border border-gray-100 dark:border-[#30363d]"
          style={{ opacity: 1 - i * 0.13 }} />
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="text-center py-16 bg-white dark:bg-[#161b22] rounded-3xl border border-gray-100 dark:border-[#30363d] shadow-sm">
      <div className="w-20 h-20 mx-auto bg-gray-100 dark:bg-[#21262d] rounded-3xl flex items-center justify-center mb-4">
        <Icon className="w-10 h-10 text-gray-300 dark:text-[#6e7681]" />
      </div>
      <p className="text-gray-500 dark:text-[#8b949e] font-bold">{text}</p>
    </div>
  );
}

function AttendanceReveal() {
  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      <style>{`
        ${KEYFRAMES}
        @keyframes attRevealOut {
          from { clip-path: circle(150vmax at 100% 0%); }
          to   { clip-path: circle(0px at 100% 0%); }
        }
      `}</style>
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #004d59 0%, #004d59dd 35%, #ff6700 100%)",
          animation: "attRevealOut .95s .15s cubic-bezier(.7,0,.2,1) forwards",
        }}>
        <div className="absolute inset-0 opacity-10" style={DOTS_STYLE} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Header + Hero
// ═══════════════════════════════════════════════════════════════════════════
const PageHeader = memo(function PageHeader({
  loading, sessionData, groupName, error, isAr, phase, sessionLocked,
  isComplimentary, studentsCount, onBack, onRefresh,
}) {
  const t = (ar, en) => (isAr ? ar : en);
  const BackIcon = isAr ? ChevronRight : ChevronLeft;

  return (
    <div className="sticky top-0 z-30 bg-white dark:bg-[#161b22] border-b border-gray-200 dark:border-[#30363d] shadow-sm">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
        <button onClick={onBack}
          className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#21262d] flex items-center justify-center text-gray-500 hover:bg-[#ff670015] hover:text-[#ff6700] transition-colors flex-shrink-0">
          <BackIcon className="w-5 h-5" />
        </button>

        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md" style={{ background: BRAND_GRAD }}>
          <ClipboardList weight="fill" className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="space-y-1.5">
              <div className="h-4 w-40 bg-gray-200 dark:bg-[#30363d] rounded" />
              <div className="h-3 w-28 bg-gray-200 dark:bg-[#30363d] rounded" />
            </div>
          ) : sessionData ? (
            <>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-sm text-gray-900 dark:text-[#e6edf3] truncate leading-none">
                  {sessionData.title}
                </h1>
                {!sessionLocked && (
                  <span className="flex-shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full"
                    style={phase === "rollcall"
                      ? { background: "#f59e0b20", color: "#d97706" }
                      : { background: "#ff670020", color: "#ff6700" }}>
                    {phase === "rollcall" ? t("1/2 مبدئي", "1/2 Roll Call") : t("2/2 تأكيد نهائي", "2/2 Final")}
                  </span>
                )}
                {isComplimentary && (
                  <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-[#feaf00]/15 text-[#f67d00] dark:text-[#feaf00] border border-[#feaf00]/30">
                    <Gift weight="fill" className="w-3 h-3" />{t("تعويضية", "Make-up")}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 dark:text-[#6e7681] truncate mt-0.5">
                {groupName} · {fmtDate(sessionData.scheduledDate, isAr)}
              </p>
            </>
          ) : (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>

        {!loading && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border bg-[#feaf0010] border-[#feaf0040]">
              <Users className="w-4 h-4 text-[#f67d00]" />
              <span className="text-sm font-black text-[#f67d00]">{studentsCount}</span>
            </div>
            <button onClick={onRefresh}
              className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#21262d] flex items-center justify-center text-gray-500 hover:text-[#ff6700] transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

const HeroBanner = memo(function HeroBanner({
  sessionData, groupName, isAr, phase, marked, total, isComplimentary,
}) {
  const t = (ar, en) => (isAr ? ar : en);
  const pct = total > 0 ? Math.round((marked / total) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 pt-5" style={cardAnim(0)}>
      <div className="relative rounded-3xl p-5 overflow-hidden shadow-lg" style={{ background: HERO_GRAD }}>
        <div className="absolute inset-0 opacity-10" style={DOTS_STYLE} />
        <PaperPlane className="absolute -top-2 end-2 w-44 opacity-20 -rotate-12 pointer-events-none" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shadow-lg flex-shrink-0">
            {phase === "rollcall"
              ? <ListChecks weight="fill" className="w-8 h-8 text-white" />
              : <ClipboardList weight="fill" className="w-8 h-8 text-white" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="bg-white/20 text-white text-[10px] font-black px-2.5 py-1 rounded-full border border-white/30 flex items-center gap-1">
                <Sparkles weight="fill" className="w-3 h-3 text-[#feaf00]" />
                {phase === "rollcall" ? t("الحضور المبدئي", "Initial Roll Call") : t("تسجيل الحضور النهائي", "Final Attendance")}
              </span>
              {isComplimentary && (
                <span className="bg-white/20 text-white text-[10px] font-black px-2.5 py-1 rounded-full border border-white/30 flex items-center gap-1">
                  <Gift weight="fill" className="w-3 h-3" />{t("حصة تعويضية", "Make-up session")}
                </span>
              )}
            </div>
            <h2 className="text-xl font-black text-white truncate">{sessionData.title}</h2>
            <p className="text-white/70 text-sm truncate">
              {groupName} · {fmtTime(sessionData.startTime, isAr)} – {fmtTime(sessionData.endTime, isAr)}
            </p>
          </div>

          <div className="flex flex-col gap-2 flex-shrink-0">
            <div className="flex items-center gap-2 bg-white/15 rounded-2xl px-3 py-2 border border-white/20">
              <Users className="w-4 h-4 text-white" />
              <span className="text-white font-black text-sm">
                {marked}<span className="text-white/60 font-normal">/{total}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 bg-white/15 rounded-2xl px-3 py-2 border border-white/20">
              <TrendingUp className="w-4 h-4 text-white" />
              <span className="text-white font-black text-sm">{pct}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

const LateNotice = memo(function LateNotice({ status, isAr }) {
  const t = (ar, en) => (isAr ? ar : en);
  if (status === "sending") {
    return (
      <span className="flex items-center gap-1 text-amber-500">
        <PaperPlaneLoader inline size={14} />
        {t("جاري إرسال تنبيه التأخير...", "Sending late notice...")}
      </span>
    );
  }
  if (status === "sent") {
    return (
      <span className="flex items-center gap-1 text-emerald-500">
        <CheckCheck className="w-3 h-3" />{t("تم إرسال تنبيه التأخير", "Late notice sent")}
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1 text-red-500">
        <AlertCircle className="w-3 h-3" />{t("فشل الإرسال", "Send failed")}
      </span>
    );
  }
  return null;
});

const RollCallRow = memo(function RollCallRow({ student, status, sendStatus, isAr, onSet, index }) {
  const t = (ar, en) => (isAr ? ar : en);
  const cfg = status ? STATUS[status] : null;

  return (
    <div
      className="relative overflow-hidden flex items-center gap-3 p-3.5 ps-5 rounded-3xl border bg-white dark:bg-[#161b22] border-gray-100 dark:border-[#30363d]"
      style={{ ...(cfg ? cfg.rowBorderStyle : null), ...cardAnim(index) }}>
      <div className="absolute top-0 bottom-0 start-0 w-1.5" style={{ background: cfg ? cfg.grad : "transparent" }} />

      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg flex-shrink-0 shadow-md
          ${cfg ? "text-white" : "bg-gray-100 dark:bg-[#21262d] text-gray-400 dark:text-[#6e7681]"}`}
        style={cfg ? { background: cfg.grad } : undefined}>
        {(student.name?.[0] || "?").toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-black text-sm text-gray-900 dark:text-[#e6edf3] truncate">{student.name}</p>
        {status === "late" && sendStatus && (
          <p className="text-[10px] font-bold mt-0.5"><LateNotice status={sendStatus} isAr={isAr} /></p>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {ROLLCALL_STATUSES.map((key) => {
          const c = STATUS[key];
          const active = status === key;
          return (
            <button key={key} onClick={() => onSet(student._id, key)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95
                ${active
                  ? "text-white shadow-md"
                  : "bg-gray-100 dark:bg-[#21262d] text-gray-500 dark:text-[#8b949e] hover:bg-gray-200 dark:hover:bg-[#30363d]"}`}
              style={active ? c.activeStyle : undefined}>
              {t(c.ar, c.en)}
            </button>
          );
        })}
      </div>
    </div>
  );
});

const RollCallSummary = memo(function RollCallSummary({ present, late, total, isAr, isComplimentary }) {
  const t = (ar, en) => (isAr ? ar : en);
  const marked = present + late;
  const pct = total > 0 ? (marked / total) * 100 : 0;

  return (
    <div className="bg-white dark:bg-[#161b22] rounded-3xl border border-gray-100 dark:border-[#30363d] p-4 sm:p-5 shadow-sm" style={cardAnim(1)}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md" style={{ background: BRAND_GRAD }}>
          <ListChecks weight="fill" className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-black text-gray-900 dark:text-[#e6edf3]">{t("الحضور المبدئي", "Initial Roll Call")}</p>
          <p className="text-[11px] text-gray-400 dark:text-[#6e7681]">{marked}/{total} {t("طالب", "students")}</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-black">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 weight="fill" className="w-4 h-4" />{present}
          </span>
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <Clock weight="fill" className="w-4 h-4" />{late}
          </span>
        </div>
      </div>

      <ProgressBar pct={pct} />

      <p className="text-[11px] text-gray-400 dark:text-[#6e7681] mt-3 leading-relaxed">
        {isComplimentary
          ? t("حصة تعويضية — مفيش خصم ساعات في أي خطوة.", "Make-up session — no hours are deducted at any step.")
          : t(
            "دي خطوة سريعة بس للمتابعة — مفيش أي خصم ساعات هنا. الخصم بيحصل في خطوة تأكيد الحضور النهائي بعدها.",
            "This is just a quick tracking step — no hours are deducted here. Deduction happens in the final confirmation step next."
          )}
      </p>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// المرحلة 2: التأكيد النهائي (هنا بس بيحصل الخصم)
// ═══════════════════════════════════════════════════════════════════════════
const FinalStudentCard = memo(function FinalStudentCard({
  student, status, rollCallStatus, isAr, disabled, onSet, index,
}) {
  const t = (ar, en) => (isAr ? ar : en);
  const cfg = status ? STATUS[status] : null;
  const Icon = cfg?.icon;

  return (
    <div
      className="relative bg-white dark:bg-[#161b22] rounded-3xl border overflow-hidden transition-shadow duration-300 hover:shadow-xl border-gray-100 dark:border-[#30363d]"
      style={{ ...(cfg ? cfg.rowBorderStyle : null), ...cardAnim(index) }}>
      {cfg && <div className="h-1.5 w-full" style={{ background: cfg.grad }} />}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg flex-shrink-0 shadow-md
              ${cfg ? "text-white" : "bg-gray-100 dark:bg-[#21262d] text-gray-500 dark:text-[#8b949e]"}`}
            style={cfg ? { background: cfg.grad } : undefined}>
            {cfg ? <Icon weight="fill" className="w-7 h-7" /> : (student.name?.[0] || "?").toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-black text-sm text-gray-900 dark:text-[#e6edf3] truncate mb-1.5">{student.name}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {student.absenceCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border text-red-500 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/30">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {student.absenceCount}x {t("غياب", "absent")}
                </span>
              )}
              {rollCallStatus === "late" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/30">
                  <Clock className="w-3.5 h-3.5" />
                  {t("كان متأخرًا في الحضور المبدئي", "Was late at roll call")}
                </span>
              )}
              {cfg && (
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-white px-2.5 py-1 rounded-full shadow-sm" style={{ background: cfg.grad }}>
                  <Icon weight="fill" className="w-3.5 h-3.5" />{t(cfg.ar, cfg.en)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status buttons */}
        <div className="grid grid-cols-3 gap-2">
          {FINAL_STATUSES.map((key) => {
            const c = STATUS[key];
            const BtnIcon = c.icon;
            const active = status === key;
            return (
              <button key={key} type="button" disabled={disabled}
                onClick={() => onSet(student._id, key)}
                className={`flex flex-col items-center gap-1.5 py-3 px-1.5 rounded-2xl border-2 text-[11px] font-black transition-all duration-200 active:scale-95 disabled:opacity-60
                  ${active ? "text-white border-transparent -translate-y-0.5" : "hover:-translate-y-0.5 hover:shadow-md"}`}
                style={active ? c.activeStyle : c.idleStyle}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${active ? "bg-white/20" : ""}`}
                  style={active ? undefined : c.iconIdleStyle}>
                  <BtnIcon weight="fill" className="w-5 h-5 text-white" />
                </div>
                <span className="text-center leading-tight">{t(c.ar, c.en)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

const FinalSummary = memo(function FinalSummary({ counts, filled, total, isAr }) {
  const t = (ar, en) => (isAr ? ar : en);
  const pct = total > 0 ? (filled / total) * 100 : 0;
  const complete = total > 0 && filled === total;

  return (
    <div className="bg-white dark:bg-[#161b22] rounded-3xl border border-gray-100 dark:border-[#30363d] p-4 sm:p-5 shadow-sm" style={cardAnim(1)}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md" style={{ background: BRAND_GRAD }}>
          <BarChart3 weight="fill" className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-black text-gray-900 dark:text-[#e6edf3]">{t("تأكيد الحضور النهائي", "Final Attendance Confirmation")}</p>
          <p className="text-[11px] text-gray-400 dark:text-[#6e7681]">{filled}/{total} {t("طالب", "students")}</p>
        </div>
        <div className="text-sm font-black text-[#ff6700]">
          {complete
            ? <span className="flex items-center gap-1"><CheckCheck className="w-4 h-4" />{t("مكتمل", "Complete")}</span>
            : `${Math.round(pct)}%`}
        </div>
      </div>

      <div className="mb-5"><ProgressBar pct={pct} /></div>

      <div className="grid grid-cols-3 gap-3">
        {FINAL_STATUSES.map((key) => {
          const c = STATUS[key];
          const Ico = c.icon;
          return (
            <div key={key} className="flex flex-col items-center gap-2 p-3 rounded-3xl border"
              style={{ borderColor: `${c.c1}40`, background: `${c.c1}0f` }}>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md" style={c.iconIdleStyle}>
                <Ico weight="fill" className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-black" style={{ color: c.c1 }}>{counts[key]}</span>
              <span className="text-[10px] font-black opacity-80" style={{ color: c.c1 }}>{t(c.ar, c.en)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════
function InstructorAttendancePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session");
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const t = (ar, en) => (isAr ? ar : en);

  // ref للغة عشان تغيير اللغة ميعملش re-fetch للداتا
  const isArRef = useRef(isAr);
  isArRef.current = isAr;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // error = فشل التحميل (بيخفي الفورم) — submitError = فشل الحفظ (من غير ما يخفي الفورم)
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);
  const [fly, setFly] = useState({ w: 1200, h: 800 });

  const [sessionData, setSessionData] = useState(null);
  const [students, setStudents] = useState([]);
  const [sessionLocked, setSessionLocked] = useState(false);
  const [isComplimentary, setIsComplimentary] = useState(false);

  const [phase, setPhase] = useState("rollcall"); // "rollcall" | "final"
  const [rollCall, setRollCall] = useState({}); // محلي بس — مفيش خصم
  const [attendance, setAttendance] = useState({});
  const [lateSendStatus, setLateSendStatus] = useState({});
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const deferredSearch = useDeferredValue(search);

  const savedStatusRef = useRef({});
  // مرآة لـ rollCall نقرأ منها بره الـ setState updater (عشان الـ updater يفضل pure
  // وميحصلش إرسال مزدوج للرسالة في StrictMode)
  const rollCallRef = useRef({});
  rollCallRef.current = rollCall;
  // قفل يمنع إرسال مزدوج لنفس الطالب لو دبل-كليك سريع
  const notifyingRef = useRef(new Set());

  const groupName = sessionData?.group?.name || sessionData?.groupId?.name || "";
  const showPhases = !loading && !error && !sessionLocked;

  // ── Data loading ───────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    const tr = (ar, en) => (isArRef.current ? ar : en);

    if (!sessionId) {
      setError(tr("لا يوجد session محدد", "No session specified"));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSubmitError("");

      const res = await fetch(`/api/instructor/sessions/${sessionId}/attendance`, { credentials: "include" });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || data.message || tr("فشل تحميل البيانات", "Failed to load data"));
        return;
      }

      const list = data.data.students || [];
      setSessionData(data.data.session);
      setStudents(list);
      setSessionLocked(data.data.sessionLocked === true);
      setIsComplimentary(data.data.isComplimentary === true);

      const existing = {};
      for (const s of list) if (s.currentStatus) existing[s._id] = s.currentStatus;
      savedStatusRef.current = { ...existing };

      // لو الحضور متسجل قبل كده → نروح للتأكيد النهائي على طول
      if (Object.keys(existing).length > 0) {
        setAttendance(existing);
        setPhase("final");
      } else {
        setAttendance({});
        setRollCall({});
        setPhase("rollcall");
      }
    } catch {
      setError(tr("خطأ في الاتصال بالسيرفر", "Server connection error"));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // تحويل تلقائي بعد النجاح (مع cleanup)
  useEffect(() => {
    if (!success) return;
    const id = setTimeout(() => router.push(`/instructor/evaluation?session=${sessionId}`), REDIRECT_DELAY);
    return () => clearTimeout(id);
  }, [success, router, sessionId]);

  // ── Phase 1: roll call ─────────────────────────────────────────────────────
  const sendLateNotification = useCallback(async (studentId) => {
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

  const handleSetRollCall = useCallback((studentId, status) => {
    const wasLate = rollCallRef.current[studentId] === "late";

    // updater pure 100% — الـ side effect بره
    setRollCall((prev) => {
      if (prev[studentId] === status) {
        const { [studentId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [studentId]: status };
    });

    if (status === "late" && !wasLate) sendLateNotification(studentId);
  }, [sendLateNotification]);

  const markAllRollCallPresent = useCallback(() => {
    setRollCall(Object.fromEntries(students.map((s) => [s._id, "present"])));
  }, [students]);

  const clearRollCall = useCallback(() => setRollCall({}), []);

  // present/late → "حاضر" | غير محدد → "غايب" (نقطة بداية، المدرس يقدر يعدّل)
  const handleGoToFinal = useCallback(() => {
    const initial = {};
    for (const s of students) {
      const rc = rollCallRef.current[s._id];
      initial[s._id] = rc === "present" || rc === "late" ? "present" : "absent";
    }
    setAttendance(initial);
    setPhase("final");
  }, [students]);

  const handleBackToRollCall = useCallback(() => setPhase("rollcall"), []);

  // ── Phase 2: final confirmation ────────────────────────────────────────────
  const handleSetStatus = useCallback((studentId, status) => {
    setAttendance((prev) => {
      if (prev[studentId] === status) {
        const { [studentId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [studentId]: status };
    });
  }, []);

  const markAll = useCallback((status) => {
    setAttendance(Object.fromEntries(students.map((s) => [s._id, status])));
  }, [students]);

  const handleSubmit = useCallback(async () => {
    if (Object.keys(attendance).length === 0) return;

    const finish = () => {
      setFly({ w: window.innerWidth, h: window.innerHeight });
      setSuccess(true);
    };

    try {
      setSubmitting(true);
      setSubmitError("");

      const records = Object.entries(attendance)
        .filter(([id, status]) => (savedStatusRef.current[id] || null) !== status)
        .map(([studentId, status]) => ({ studentId, status }));

      if (records.length === 0) {
        finish();
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
        finish();
      } else {
        setSubmitError(data.error || t("فشل حفظ الحضور", "Failed to save attendance"));
      }
    } catch {
      setSubmitError(t("خطأ في الاتصال", "Connection error"));
    } finally {
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendance, sessionId, isAr]);

  const handleHeaderBack = useCallback(() => {
    if (phase === "final" && Object.keys(rollCallRef.current).length > 0 && !sessionData?.attendanceTaken) {
      setPhase("rollcall");
    } else {
      router.push("/instructor/sessions");
    }
  }, [phase, sessionData, router]);

  // ── Derived data (memoized) ────────────────────────────────────────────────
  const query = deferredSearch.trim().toLowerCase();

  const rollCallCounts = useMemo(() => {
    let present = 0;
    let late = 0;
    for (const s of Object.values(rollCall)) {
      if (s === "present") present++;
      else if (s === "late") late++;
    }
    return { present, late };
  }, [rollCall]);
  const rollCallMarked = rollCallCounts.present + rollCallCounts.late;

  const finalCounts = useMemo(() => {
    const counts = { present: 0, absent: 0, excused: 0 };
    for (const s of Object.values(attendance)) if (s in counts) counts[s]++;
    return counts;
  }, [attendance]);
  const filledCount = finalCounts.present + finalCounts.absent + finalCounts.excused;
  const allFilled = students.length > 0 && filledCount === students.length;

  const changedCount = useMemo(
    () => Object.entries(attendance).filter(([id, s]) => (savedStatusRef.current[id] || null) !== s).length,
    [attendance]
  );

  const rollCallStudents = useMemo(
    () => (query ? students.filter((s) => s.name?.toLowerCase().includes(query)) : students),
    [students, query]
  );

  const finalStudents = useMemo(
    () =>
      students.filter((s) => {
        if (query && !s.name?.toLowerCase().includes(query)) return false;
        if (filterStatus === "all") return true;
        if (filterStatus === "unset") return !attendance[s._id];
        return attendance[s._id] === filterStatus;
      }),
    [students, query, filterStatus, attendance]
  );

  const handleSearchChange = useCallback((e) => setSearch(e.target.value), []);

  // ─── No session ────────────────────────────────────────────────────────────
  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb] dark:bg-[#0a0f17]" dir={isAr ? "rtl" : "ltr"}>
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-500/10 rounded-3xl flex items-center justify-center mb-4">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-lg font-black text-gray-900 dark:text-[#e6edf3] mb-2">
            {t("لم يتم تحديد جلسة", "No session specified")}
          </h3>
          <button onClick={() => router.push("/instructor/sessions")}
            className="mt-2 px-6 py-3 text-white rounded-2xl font-black shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            style={{ background: BRAND_GRAD }}>
            {t("العودة للجلسات", "Back to Sessions")}
          </button>
        </div>
      </div>
    );
  }

  // ─── Success ───────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="fixed inset-0 overflow-hidden flex items-center justify-center" dir={isAr ? "rtl" : "ltr"}
        style={{ background: SUCCESS_GRAD }}>
        <FlightStyles />
        <style>{KEYFRAMES}</style>
        <div className="absolute inset-0 opacity-10" style={DOTS_STYLE} />
        <PaperPlaneFlight w={fly.w} h={fly.h} startX={fly.w / 2} startY={fly.h * 0.62} delay={0.5} duration={1.3} />
        <div className="relative z-10 text-center px-6 text-white">
          <div className="w-28 h-28 mx-auto mb-5 rounded-full bg-white/15 border border-white/30 flex items-center justify-center shadow-2xl"
            style={{ animation: "attPop .7s .1s both cubic-bezier(.2,.9,.3,1.3)" }}>
            <CheckCheck className="w-14 h-14 text-white" />
          </div>
          <h2 className="text-2xl font-black mb-1.5" style={{ animation: "ppFadeUp .5s .35s both" }}>
            {t("تم حفظ الحضور", "Attendance Saved")}
          </h2>
          <p className="text-sm text-white/80 font-bold" style={{ animation: "ppFadeUp .5s .5s both" }}>
            {sessionData?.title}
          </p>
          <p className="text-xs text-white/60 mt-4">{t("جاري التحويل للتقييم...", "Redirecting to evaluation...")}</p>
        </div>
      </div>
    );
  }

  // ─── Main render ───────────────────────────────────────────────────────────
  const hasStudents = students.length > 0;

  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-[#0a0f17]" dir={isAr ? "rtl" : "ltr"}>
      <style>{KEYFRAMES}</style>

      <PageHeader
        loading={loading}
        sessionData={sessionData}
        groupName={groupName}
        error={error}
        isAr={isAr}
        phase={phase}
        sessionLocked={sessionLocked}
        isComplimentary={isComplimentary}
        studentsCount={students.length}
        onBack={handleHeaderBack}
        onRefresh={fetchData}
      />

      {sessionData && !loading && (
        <HeroBanner
          sessionData={sessionData}
          groupName={groupName}
          isAr={isAr}
          phase={phase}
          marked={phase === "rollcall" ? rollCallMarked : filledCount}
          total={students.length}
          isComplimentary={isComplimentary}
        />
      )}

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-5 pb-40">
        {loading && <Skeleton />}

        {!loading && error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-3xl border border-red-200 dark:border-red-800/40 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <p className="flex-1 text-sm font-bold text-red-700 dark:text-red-400">{error}</p>
            <button onClick={fetchData}
              className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:underline px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors">
              <RefreshCw className="w-3 h-3" />{t("إعادة", "Retry")}
            </button>
          </div>
        )}

        {/* السيشن مقفولة بسبب الـ Hold */}
        {!loading && !error && sessionLocked && (
          <div className="text-center py-16 bg-white dark:bg-[#161b22] rounded-3xl border border-amber-200 dark:border-amber-500/20 shadow-sm">
            <div className="w-20 h-20 mx-auto bg-amber-100 dark:bg-amber-500/10 rounded-3xl flex items-center justify-center mb-4">
              <Lock weight="fill" className="w-10 h-10 text-amber-500" />
            </div>
            <p className="font-black text-gray-900 dark:text-[#e6edf3] mb-1">
              {t("السيشن دي مقفولة بسبب الـ Hold", "This session is on hold")}
            </p>
            <p className="text-xs text-gray-500 dark:text-[#8b949e] mb-5">
              {t("مينفعش تسجل حضور لحد ما يتفك الـ Hold.", "Attendance is unavailable until the hold is released.")}
            </p>
            <button onClick={() => router.push("/instructor/sessions")}
              className="px-6 py-3 text-white rounded-2xl font-black shadow-lg" style={{ background: BRAND_GRAD }}>
              {t("العودة للجلسات", "Back to sessions")}
            </button>
          </div>
        )}

        {/* ═════════ المرحلة 1: الحضور المبدئي ═════════ */}
        {showPhases && phase === "rollcall" && hasStudents && (
          <>
            <RollCallSummary
              present={rollCallCounts.present}
              late={rollCallCounts.late}
              total={students.length}
              isAr={isAr}
              isComplimentary={isComplimentary}
            />

            <div className="flex gap-2">
              <button onClick={markAllRollCallPresent}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black border hover:shadow-md transition-shadow"
                style={STATUS.present.idleStyle}>
                <CheckCircle2 weight="fill" className="w-4 h-4" />
                {t("تحديد الكل حاضر", "Mark all present")}
              </button>
              <button onClick={clearRollCall}
                className="px-5 py-3 rounded-2xl text-xs font-black bg-gray-100 dark:bg-[#21262d] text-gray-500 dark:text-[#8b949e] border border-gray-200 dark:border-[#30363d] hover:bg-gray-200 dark:hover:bg-[#30363d] transition-colors">
                {t("مسح الكل", "Clear all")}
              </button>
            </div>

            <div className="flex">
              <SearchBox value={search} onChange={handleSearchChange} isAr={isAr}
                placeholder={t("ابحث عن طالب...", "Search student...")} />
            </div>

            <div className="space-y-2.5">
              {rollCallStudents.length === 0 ? (
                <EmptyState icon={Users} text={t("لا نتائج", "No results")} />
              ) : (
                rollCallStudents.map((student, i) => (
                  <RollCallRow
                    key={student._id}
                    index={i}
                    student={student}
                    status={rollCall[student._id]}
                    sendStatus={lateSendStatus[student._id]}
                    isAr={isAr}
                    onSet={handleSetRollCall}
                  />
                ))
              )}
            </div>
          </>
        )}

        {/* ═════════ المرحلة 2: التأكيد النهائي ═════════ */}
        {showPhases && phase === "final" && hasStudents && (
          <>
            {rollCallMarked > 0 && !sessionData?.attendanceTaken && (
              <button onClick={handleBackToRollCall}
                className="flex items-center gap-1.5 text-xs font-black text-gray-500 dark:text-[#8b949e] hover:text-[#ff6700] transition-colors">
                {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                {t("رجوع للحضور المبدئي", "Back to roll call")}
              </button>
            )}

            {isComplimentary && (
              <div className="flex items-center gap-3 p-4 rounded-3xl bg-[#feaf00]/10 border border-[#feaf00]/30">
                <div className="w-10 h-10 rounded-2xl bg-[#feaf00]/20 flex items-center justify-center flex-shrink-0 border border-[#feaf00]/30">
                  <Gift weight="fill" className="w-5 h-5 text-[#f67d00] dark:text-[#feaf00]" />
                </div>
                <p className="text-xs font-bold text-[#f67d00] dark:text-[#feaf00] leading-relaxed">
                  {t(
                    "حصة تعويضية — بيتسجل الحضور من غير خصم ساعات ولا تنبيهات رصيد.",
                    "Make-up session — attendance is recorded with no deduction or balance alerts."
                  )}
                </p>
              </div>
            )}

            <FinalSummary counts={finalCounts} filled={filledCount} total={students.length} isAr={isAr} />

            {/* Quick mark all */}
            <div className="bg-white dark:bg-[#161b22] rounded-3xl border border-gray-100 dark:border-[#30363d] p-4 shadow-sm">
              <p className="text-xs font-black text-gray-500 dark:text-[#8b949e] mb-3 flex items-center gap-2">
                <Zap weight="fill" className="w-4 h-4 text-[#ff6700]" />
                {t("تحديد الكل كـ:", "Mark all as:")}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {FINAL_STATUSES.map((key) => {
                  const c = STATUS[key];
                  const Icon = c.icon;
                  return (
                    <button key={key} onClick={() => markAll(key)}
                      className="flex items-center justify-center gap-1.5 px-2 py-3 rounded-2xl border text-xs font-black hover:-translate-y-0.5 hover:shadow-md transition-all"
                      style={c.idleStyle}>
                      <Icon weight="fill" className="w-4 h-4" />{t(c.ar, c.en)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search + filter */}
            <div className="flex gap-2">
              <SearchBox value={search} onChange={handleSearchChange} isAr={isAr}
                placeholder={t("ابحث عن طالب...", "Search student...")} />
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-2xl px-3 py-3 text-sm font-bold text-gray-700 dark:text-[#8b949e] focus:outline-none">
                <option value="all">{t("الكل", "All")}</option>
                <option value="unset">{t("لم يُحدد", "Unset")}</option>
                {FINAL_STATUSES.map((key) => (
                  <option key={key} value={key}>{t(STATUS[key].ar, STATUS[key].en)}</option>
                ))}
              </select>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {finalStudents.length === 0 ? (
                <div className="col-span-full">
                  <EmptyState icon={Users} text={t("لا نتائج", "No results")} />
                </div>
              ) : (
                finalStudents.map((student, i) => (
                  <FinalStudentCard
                    key={student._id}
                    index={i}
                    student={student}
                    status={attendance[student._id]}
                    rollCallStatus={rollCall[student._id]}
                    isAr={isAr}
                    disabled={submitting}
                    onSet={handleSetStatus}
                  />
                ))
              )}
            </div>
          </>
        )}

        {showPhases && !hasStudents && (
          <EmptyState icon={Users} text={t("لا يوجد طلاب في هذه الجلسة", "No students in this session")} />
        )}
      </div>

      {/* ═════════ Bottom bars ═════════ */}
      {showPhases && hasStudents && phase === "rollcall" && (
        <BottomBar>
          {rollCallMarked < students.length && (
            <div className="flex items-center gap-2 mb-3 p-2.5 bg-gray-50 dark:bg-[#21262d] rounded-2xl border border-gray-100 dark:border-[#30363d]">
              <Info className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <p className="text-xs text-gray-500 dark:text-[#8b949e]">
                {students.length - rollCallMarked}{" "}
                {t(
                  "طالب لم يُحدد — هيبدأوا كـ«غايب» في التأكيد النهائي ويمكن تعديلهم",
                  "student(s) unmarked — will start as \"Absent\" in the final step and can be edited"
                )}
              </p>
            </div>
          )}
          <div className="flex items-center gap-3">
            <ProgressRing value={rollCallMarked} total={students.length} id="gradRollCall" />
            <button onClick={handleGoToFinal}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black text-white shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all"
              style={{ background: BRAND_GRAD }}>
              {t("التالي: تأكيد الحضور النهائي", "Next: Final Attendance Confirmation")}
              {isAr ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        </BottomBar>
      )}

      {showPhases && hasStudents && phase === "final" && (
        <BottomBar>
          <InlineError message={submitError} />
          <div className="flex items-center gap-3">
            <ProgressRing value={filledCount} total={students.length} id="gradFinal" />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-black">
                {changedCount > 0
                  ? <span className="text-[#ff6700]">{changedCount} {t("تغيير جديد", "new change(s)")}</span>
                  : <span className="text-gray-400 dark:text-[#6e7681]">{t("لا توجد تغييرات", "No changes")}</span>}
              </p>
              {!allFilled && filledCount > 0 && (
                <p className="text-[11px] mt-0.5 font-bold text-amber-500">
                  {students.length - filledCount} {t("طالب لم يُحدد", "student(s) unset")}
                </p>
              )}
            </div>

            <button onClick={handleSubmit} disabled={filledCount === 0 || submitting}
              className="flex items-center gap-2 px-5 sm:px-6 py-3.5 rounded-2xl text-sm font-black text-white shadow-lg transition-all flex-shrink-0 hover:shadow-xl hover:scale-[1.03] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ background: filledCount > 0 ? BRAND_GRAD : "#d1d5db" }}>
              {submitting
                ? <><PaperPlaneLoader inline tone="light" size={20} />{t("جاري الحفظ...", "Saving...")}</>
                : <><CheckCheck className="w-5 h-5" />{t("حفظ الحضور", "Save Attendance")}</>}
            </button>
          </div>
        </BottomBar>
      )}
    </div>
  );
}

export default function InstructorAttendanceEntry() {
  return (
    <>
      <AttendanceReveal />
      <div style={{ animation: "attIn .7s .45s backwards cubic-bezier(.2,.8,.2,1)" }}>
        <InstructorAttendancePage />
      </div>
    </>
  );
}