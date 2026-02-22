"use client";

import { useState, useEffect } from "react";
import {
  Users, BookOpen, Clock, GraduationCap, TrendingUp, AlertCircle,
  CheckCircle, Mail, Phone, Trash2, UserMinus, BarChart3, XCircle,
  ChevronDown, ChevronUp, Calendar, X, Link, FileText, Video
} from "lucide-react";
import toast from "react-hot-toast";
import { useI18n } from "@/i18n/I18nProvider";

// ─── helpers ─────────────────────────────────────────────────────────────────
const DAY_AR = {
  Sunday:"الأحد", Monday:"الاثنين", Tuesday:"الثلاثاء",
  Wednesday:"الأربعاء", Thursday:"الخميس", Friday:"الجمعة", Saturday:"السبت"
};

const DAY_EN = {
  Sunday:"Sunday", Monday:"Monday", Tuesday:"Tuesday",
  Wednesday:"Wednesday", Thursday:"Thursday", Friday:"Friday", Saturday:"Saturday"
};

const dayName = (day, lang) => {
  if (lang === 'ar') return DAY_AR[day] || day;
  return DAY_EN[day] || day;
};

// نسبة الحضور → classes
function rateInfo(r, t) {
  if (r >= 80) return {
    barCls:    "bg-green-500",
    trackCls:  "bg-green-100 dark:bg-green-900/30",
    badgeCls:  "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    avatarCls: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    label:     t("attendance.excellent"),
  };
  if (r >= 60) return {
    barCls:    "bg-yellow-400",
    trackCls:  "bg-yellow-100 dark:bg-yellow-900/30",
    badgeCls:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
    avatarCls: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
    label:     t("attendance.good"),
  };
  if (r >= 40) return {
    barCls:    "bg-orange-400",
    trackCls:  "bg-orange-100 dark:bg-orange-900/30",
    badgeCls:  "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    avatarCls: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
    label:     t("attendance.acceptable"),
  };
  return {
    barCls:    "bg-red-500",
    trackCls:  "bg-red-100 dark:bg-red-900/30",
    badgeCls:  "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    avatarCls: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    label:     t("attendance.poor"),
  };
}

const SESSION_META = (t) => ({
  present:   { label: t("session.present"),    cls:"bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-300"  },
  absent:    { label: t("session.absent"),     cls:"bg-red-100    text-red-700    dark:bg-red-900/40    dark:text-red-300"    },
  late:      { label: t("session.late"),       cls:"bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  excused:   { label: t("session.excused"),    cls:"bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-300"   },
  cancelled: { label: t("session.cancelled"),  cls:"bg-gray-100   text-gray-600   dark:bg-gray-700      dark:text-gray-300"   },
  postponed: { label: t("session.postponed"),  cls:"bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  upcoming:  { label: t("session.upcoming"),   cls:"bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
  scheduled: { label: t("session.scheduled"),  cls:"bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
  completed: { label: t("session.completed"),  cls:"bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-300"  },
});

const smeta = (s, t) => {
  const meta = SESSION_META(t)[s];
  return meta || { label: s, cls:"bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" };
};

const GROUP_STATUS_META = (t) => ({
  active:    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  draft:     "bg-gray-100  text-gray-600  dark:bg-gray-700     dark:text-gray-300",
  completed: "bg-blue-100  text-blue-700  dark:bg-blue-900/40  dark:text-blue-300",
  cancelled: "bg-red-100   text-red-700   dark:bg-red-900/40   dark:text-red-300",
});

const GROUP_STATUS_LABEL = (t) => ({
  active: t("group.status.active"),
  draft: t("group.status.draft"),
  completed: t("group.status.completed"),
  cancelled: t("group.status.cancelled"),
});

// platform icon helper
const platformIcon = p => {
  if (p === "zoom")            return "🔷";
  if (p === "google_meet")     return "🔴";
  if (p === "microsoft_teams") return "🔵";
  return "🔗";
};

// ─── Thin bar ─────────────────────────────────────────────────────────────────
function Bar({ value, barCls, trackCls }) {
  return (
    <div className={`w-full h-2 rounded-full overflow-hidden ${trackCls}`}>
      <div
        className={`h-full rounded-full transition-all duration-700 ${barCls}`}
        style={{ width:`${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

// ─── Attendance chip ──────────────────────────────────────────────────────────
function Chip({ icon:Icon, label, count, wrapCls, iconCls, textCls }) {
  return (
    <div className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl ${wrapCls} min-w-[64px]`}>
      <Icon size={14} className={iconCls} />
      <span className={`text-[20px] font-black leading-none ${textCls}`}>{count}</span>
      <span className={`text-[10px] font-semibold opacity-80 ${textCls}`}>{label}</span>
    </div>
  );
}

// ─── Sidebar card ─────────────────────────────────────────────────────────────
function SideCard({ headerCls, icon:Icon, title, children }) {
  return (
    <div className="bg-white dark:bg-darklight rounded-2xl overflow-hidden border border-gray-100 dark:border-dark_border shadow-darkmd">
      <div className={`flex items-center gap-2.5 px-5 py-4 ${headerCls}`}>
        <Icon size={18} className="text-white flex-shrink-0" />
        <h3 className="text-white font-bold text-[15px] m-0">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Sessions List ────────────────────────────────────────────────────────────
function SessionsList({ sessions, t, language }) {
  if (!sessions || sessions.length === 0) return null;

  return (
    <div className="mb-7">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-1 h-7 bg-violet-500 rounded-full" />
        <h2 className="text-xl font-black text-gray-900 dark:text-white">
          {t("sessions.title")}&nbsp;
          <span className="text-darktext font-medium text-base">({sessions.length})</span>
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        {sessions.map((sess, i) => {
          const sm  = smeta(sess.status, t);
          const dim = ["cancelled", "postponed"].includes(sess.status);

          return (
            <div
              key={sess.id || i}
              className={`
                bg-white dark:bg-darklight rounded-2xl border
                border-gray-100 dark:border-dark_border shadow-darkmd
                transition-opacity
                ${dim ? "opacity-60" : ""}
              `}
            >
              {/* ── row ── */}
              <div className="flex items-center gap-4 px-5 py-4">

                {/* module badge */}
                <div className={`
                  w-11 h-11 rounded-xl flex-shrink-0 flex items-center
                  justify-center font-black text-sm ${sm.cls}
                `}>
                  {sess.moduleNumber}
                </div>

                {/* info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[15px] text-gray-900 dark:text-white truncate">
                    {sess.title}
                  </p>
                  <p className="text-xs text-darktext mt-0.5">
                    {sess.date}
                    {sess.dayName   ? ` · ${dayName(sess.dayName, language)}`  : ""}
                    {sess.startTime ? ` · ${sess.startTime}` : ""}
                    {sess.endTime   ? ` — ${sess.endTime}`   : ""}
                  </p>
                </div>

                {/* status badge */}
                <span className={`
                  text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 ${sm.cls}
                `}>
                  {sm.label}
                </span>
              </div>

              {/* ── meeting link ── */}
              {sess.meetingLink && (
                <div className="mx-5 mb-3">
                  <a
                    href={sess.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      flex items-center gap-2.5 px-4 py-2.5 rounded-xl
                      bg-violet-50 dark:bg-primary/10
                      border border-violet-200 dark:border-primary/25
                      hover:bg-violet-100 dark:hover:bg-primary/20
                      transition-colors group
                    "
                  >
                    <span className="text-base leading-none flex-shrink-0">
                      {platformIcon(sess.meetingPlatform)}
                    </span>
                    <Link size={13} className="text-primary flex-shrink-0" />
                    <span className="text-primary font-semibold text-sm truncate flex-1">
                      {sess.meetingLink}
                    </span>
                    <span className="text-[10px] text-primary/60 font-bold flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {t("common.open")} ↗
                    </span>
                  </a>
                </div>
              )}

              {/* ── recording link ── */}
              {sess.recordingLink && (
                <div className="mx-5 mb-3">
                  <a
                    href={sess.recordingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      flex items-center gap-2.5 px-4 py-2.5 rounded-xl
                      bg-emerald-50 dark:bg-emerald-900/10
                      border border-emerald-200 dark:border-emerald-800/40
                      hover:bg-emerald-100 dark:hover:bg-emerald-900/20
                      transition-colors group
                    "
                  >
                    <Video size={13} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm truncate flex-1">
                      {t("session.recording")}
                    </span>
                    <span className="text-[10px] text-emerald-600/60 font-bold flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {t("common.open")} ↗
                    </span>
                  </a>
                </div>
              )}

              {/* ── instructor notes ── */}
              {sess.instructorNotes && (
                <div className="mx-5 mb-4">
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40">
                    <FileText size={13} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-800 dark:text-amber-300 text-sm leading-relaxed">
                      {sess.instructorNotes}
                    </p>
                  </div>
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function GroupDetailsPage({ groupId, onClose }) {
    const { t, language } = useI18n();
    const isRTL = language === "ar";

  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [expanded, setExpanded] = useState({});

  useEffect(() => { if (groupId) load(); }, [groupId]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`/api/groups/${groupId}/details`, { cache:"no-store" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || t("group.details.loadError"));
      setData(json.data);
    } catch (e) { setError(e.message); }
    finally     { setLoading(false); }
  }

  const toggle = id => setExpanded(p => ({ ...p, [id]:!p[id] }));

  async function removeStudent(studentId, name) {
    if (!confirm(t("group.student.removeConfirm", { name }))) return;
    const tid = toast.loading(t("common.removing"));
    try {
      const r = await fetch(`/api/groups/${groupId}/remove-student`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ studentId }),
      });
      const j = await r.json();
      if (r.ok && j.success) { toast.success(t("common.removed"), {id:tid}); load(); }
      else toast.error(j.error || t("common.error"), {id:tid});
    } catch { toast.error(t("common.error"), {id:tid}); }
  }

  async function removeInstructor(instructorId, name) {
    if (!confirm(t("group.instructor.removeConfirm", { name }))) return;
    const tid = toast.loading(t("common.removing"));
    try {
      const r = await fetch(`/api/groups/${groupId}/remove-instructor`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ instructorId }),
      });
      const j = await r.json();
      if (r.ok && j.success) { toast.success(t("common.removed"), {id:tid}); load(); }
      else toast.error(j.error || t("common.error"), {id:tid});
    } catch { toast.error(t("common.error"), {id:tid}); }
  }

  // ── loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-darkmode/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-darklight rounded-2xl p-10 flex flex-col items-center gap-4 shadow-darkmd border border-gray-100 dark:border-dark_border">
        <div className="w-14 h-14 border-4 border-gray-200 dark:border-gray-700 border-t-primary rounded-full animate-spin" />
        <p className="text-darktext text-sm font-medium">{t("common.loading")}</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-darkmode/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-darklight rounded-2xl p-10 flex flex-col items-center gap-4 shadow-darkmd border border-gray-100 dark:border-dark_border max-w-sm w-full mx-4">
        <AlertCircle size={56} className="text-red-500" />
        <p className="text-lg font-bold text-gray-900 dark:text-white text-center">{error || t("group.details.notFound")}</p>
        <button onClick={onClose}
          className="w-full py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors">
          {t("common.back")}
        </button>
      </div>
    </div>
  );

  const { group, stats, sessions, students } = data;
  const circ = 2 * Math.PI * 36;

  return (
    // ── OVERLAY ────────────────────────────────────────────────────────────────
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-darkmode/60 backdrop-blur-sm p-3 md:p-6"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ── POPUP ──────────────────────────────────────────────────────────────── */}
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className={`
          relative w-full max-w-[1400px] max-h-[95vh] overflow-y-auto
          bg-gray-50 dark:bg-darkmode
          rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,.45)]
          border border-gray-200 dark:border-dark_border
          flex flex-col
        `}
      >
        {/* ── sticky top bar ──────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4
          bg-gray-50/95 dark:bg-darkmode/95 backdrop-blur-sm
          border-b border-gray-200 dark:border-dark_border">
          <button onClick={onClose}
            className="flex items-center gap-2 text-darktext hover:text-primary font-semibold text-sm transition-colors">
            {isRTL ? "→" : "←"} {t("common.backToGroups")}
          </button>
          <button onClick={onClose}
            className="p-2 rounded-xl bg-gray-100 dark:bg-darklight hover:bg-gray-200 dark:hover:bg-dark_border text-darktext hover:text-gray-900 dark:hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* ── scrollable content ──────────────────────────────────────────────── */}
        <div className="flex-1 p-5 md:p-8 overflow-y-auto">

          {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
          <div
            className="relative rounded-3xl overflow-hidden mb-6"
            style={{
              background:"linear-gradient(135deg,#8c52ff 0%,#7c3aed 50%,#a78bfa 100%)",
              boxShadow:"0 20px 60px rgba(140,82,255,.4)"
            }}
          >
            {/* decorative blobs */}
            <div className="absolute -top-10 -left-10 w-44 h-44 rounded-full bg-white/[.06] pointer-events-none" />
            <div className="absolute -bottom-6 left-32 w-28 h-28 rounded-full bg-white/[.04] pointer-events-none" />

            <div className="relative z-[1] p-7 md:p-10">
              {/* top row */}
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="bg-white/20 text-white text-xs font-bold px-4 py-1.5 rounded-full tracking-wide">
                      {group.code}
                    </span>
                    <span className={`text-xs font-bold px-4 py-1.5 rounded-full
                      ${GROUP_STATUS_META(t)[group.status] || "bg-gray-100 text-gray-600"}`}>
                      {GROUP_STATUS_LABEL(t)[group.status] || group.status}
                    </span>
                  </div>
                  <h1 className="text-white text-3xl md:text-4xl font-black mb-1 leading-tight">
                    {group.name}
                  </h1>
                  <p className="text-white/75 text-sm">{group.course.title}</p>
                </div>

                {/* circular progress */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="relative w-24 h-24 md:w-28 md:h-28">
                    <svg width="100%" height="100%" viewBox="0 0 84 84"
                      style={{ transform:"rotate(-90deg)" }}>
                      <circle cx={42} cy={42} r={36} fill="none"
                        stroke="rgba(255,255,255,.2)" strokeWidth={8}/>
                      <circle cx={42} cy={42} r={36} fill="none" stroke="white" strokeWidth={8}
                        strokeDasharray={circ}
                        strokeDashoffset={circ * (1 - stats.sessions.progressPct / 100)}
                        strokeLinecap="round"
                        style={{ transition:"stroke-dashoffset 1.2s ease" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-xl font-black">
                        {stats.sessions.progressPct}%
                      </span>
                    </div>
                  </div>
                  <div className="text-white">
                    <p className="text-xs opacity-75 mb-1">{t("group.courseProgress")}</p>
                    <p className="text-3xl font-black">
                      {stats.sessions.completed}
                      <span className="text-white/60 text-xl">/{stats.sessions.total}</span>
                    </p>
                    <p className="text-xs opacity-60 mt-0.5">{t("sessions.completed")}</p>
                  </div>
                </div>
              </div>

              {/* main bar */}
              <div className="mt-7">
                <div className="flex justify-between text-white/85 text-sm mb-2.5">
                  <span className="font-semibold">{t("group.progress")}</span>
                  <span className="font-bold">
                    {stats.sessions.completed} {t("common.of")} {stats.sessions.total} {t("sessions.title")}
                  </span>
                </div>
                <div className="w-full h-3.5 rounded-full overflow-hidden bg-white/20">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width:`${stats.sessions.progressPct}%`,
                      background:"linear-gradient(90deg,rgba(255,255,255,.65),white)",
                      boxShadow:"0 0 18px rgba(255,255,255,.4)",
                    }}
                  />
                </div>

                {/* pills */}
                <div className="flex flex-wrap gap-2.5 mt-4">
                  {[
                    { l:t("sessions.completed"), v:stats.sessions.completed },
                    { l:t("sessions.scheduled"),  v:stats.sessions.scheduled },
                    { l:t("sessions.cancelled"),  v:stats.sessions.cancelled },
                    { l:t("sessions.postponed"), v:stats.sessions.postponed },
                  ].map(p => (
                    <div key={p.l}
                      className="flex items-center gap-2 bg-white/15 rounded-xl px-4 py-2 hover:bg-white/20 transition-colors">
                      <span className="text-white/85 text-sm">{p.l}</span>
                      <span className="text-white font-black text-base">{p.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ══ STAT CARDS ════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-7">
            {[
              {
                icon:Users, label:t("students.title"),
                val:`${stats.students.total}/${stats.students.maxSlots}`,
                iconBg:"bg-indigo-100 dark:bg-indigo-900/30",
                iconCl:"text-primary",
              },
              {
                icon:GraduationCap, label:t("instructors.title"),
                val:group.instructors.length,
                iconBg:"bg-sky-100 dark:bg-sky-900/30",
                iconCl:"text-sky-500 dark:text-sky-400",
              },
              {
                icon:Calendar, label:t("sessions.total"),
                val:stats.sessions.total,
                iconBg:"bg-violet-100 dark:bg-violet-900/30",
                iconCl:"text-violet-600 dark:text-violet-400",
              },
              {
                icon:CheckCircle, label:t("sessions.completed"),
                val:stats.sessions.completed,
                iconBg:"bg-green-100 dark:bg-green-900/30",
                iconCl:"text-green-600 dark:text-green-400",
              },
              {
                icon:TrendingUp, label:t("attendance.average"),
                val:`${stats.attendance.avgPct}%`,
                iconBg: stats.attendance.avgPct >= 80 ? "bg-green-100 dark:bg-green-900/30"
                      : stats.attendance.avgPct >= 60 ? "bg-yellow-100 dark:bg-yellow-900/30"
                      : "bg-red-100 dark:bg-red-900/30",
                iconCl: stats.attendance.avgPct >= 80 ? "text-green-600 dark:text-green-400"
                      : stats.attendance.avgPct >= 60 ? "text-yellow-600 dark:text-yellow-400"
                      : "text-red-600 dark:text-red-400",
              },
            ].map(({ icon:Icon, label, val, iconBg, iconCl }) => (
              <div key={label}
                className="bg-white dark:bg-darklight rounded-2xl p-5 border border-gray-100 dark:border-dark_border shadow-darkmd">
                <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center mb-3`}>
                  <Icon size={21} className={iconCl} />
                </div>
                <p className="text-xs text-darktext font-semibold mb-1">{label}</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white">{val}</p>
              </div>
            ))}
          </div>

          {/* ══ SESSIONS LIST ═════════════════════════════════════════════════════ */}
          <SessionsList sessions={sessions} t={t} language={language} />

          {/* ══ 2-COL LAYOUT ══════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">

            {/* ── STUDENTS ────────────────────────────────────────────────────── */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-1 h-7 bg-primary rounded-full" />
                <h2 className="text-xl font-black text-gray-900 dark:text-white">
                  {t("students.title")}&nbsp;
                  <span className="text-darktext font-medium text-base">({students.length})</span>
                </h2>
              </div>

              {students.length === 0 ? (
                <div className="bg-white dark:bg-darklight rounded-2xl p-16 text-center border border-gray-100 dark:border-dark_border shadow-darkmd">
                  <Users size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-darktext">{t("students.noStudents")}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {students.map((st, idx) => {
                    const ri     = rateInfo(st.attendance.attendancePct, t);
                    const isOpen = !!expanded[st.id];
                    const att    = st.attendance;

                    return (
                      <div key={st.id || idx}
                        className={`
                          bg-white dark:bg-darklight rounded-2xl overflow-hidden shadow-darkmd
                          border-[1.5px] transition-all duration-200
                          ${isOpen
                            ? "border-primary/40 dark:border-primary/40 shadow-[0_0_0_3px_rgba(140,82,255,.1)]"
                            : "border-gray-100 dark:border-dark_border"
                          }
                        `}>

                        {/* header */}
                        <div className="p-5 md:p-6">
                          <div className="flex items-center gap-4">

                            {/* avatar */}
                            <div className={`
                              w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center
                              text-2xl font-black ${ri.avatarCls}
                            `}>
                              {st.name.charAt(0)}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <p className="font-bold text-[15px] text-gray-900 dark:text-white">
                                  {st.name}
                                </p>
                                {att.totalDone > 0 && (
                                  <span className={`text-xs font-bold px-3 py-0.5 rounded-full ${ri.badgeCls}`}>
                                    {ri.label}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-darktext mb-3">{st.enrollment}</p>

                              {/* progress bar */}
                              <div className="flex items-center gap-3">
                                <div className="flex-1">
                                  <Bar value={att.attendancePct} barCls={ri.barCls} trackCls={ri.trackCls} />
                                </div>
                                <span className={`text-sm font-black min-w-[46px] text-left
                                  ${att.attendancePct >= 80 ? "text-green-600 dark:text-green-400"
                                  : att.attendancePct >= 60 ? "text-yellow-600 dark:text-yellow-400"
                                  : att.attendancePct >= 40 ? "text-orange-600 dark:text-orange-400"
                                  : "text-red-600 dark:text-red-400"}`}>
                                  {att.attendancePct}%
                                </span>
                              </div>
                            </div>

                            {/* remove btn */}
                            <button onClick={() => removeStudent(st.id, st.name)}
                              className="flex-shrink-0 p-2.5 rounded-xl
                                bg-red-50 dark:bg-red-900/20
                                border border-red-200 dark:border-red-800
                                text-red-500 dark:text-red-400
                                hover:bg-red-100 dark:hover:bg-red-900/40
                                transition-colors"
                              title={t("students.remove")}>
                              <UserMinus size={16} />
                            </button>
                          </div>

                          {/* chips */}
                          <div className="flex flex-wrap gap-2.5 mt-5">
                            <Chip icon={CheckCircle} label={t("attendance.present")} count={att.present}
                              wrapCls="bg-green-50 dark:bg-green-900/20"
                              iconCls="text-green-600 dark:text-green-400"
                              textCls="text-green-700 dark:text-green-300" />
                            <Chip icon={XCircle}     label={t("attendance.absent")} count={att.absent}
                              wrapCls="bg-red-50 dark:bg-red-900/20"
                              iconCls="text-red-600 dark:text-red-400"
                              textCls="text-red-700 dark:text-red-300" />
                            <Chip icon={Clock}       label={t("attendance.late")} count={att.late}
                              wrapCls="bg-orange-50 dark:bg-orange-900/20"
                              iconCls="text-orange-600 dark:text-orange-400"
                              textCls="text-orange-700 dark:text-orange-300" />
                            <Chip icon={AlertCircle} label={t("attendance.excused")} count={att.excused}
                              wrapCls="bg-blue-50 dark:bg-blue-900/20"
                              iconCls="text-blue-600 dark:text-blue-400"
                              textCls="text-blue-700 dark:text-blue-300" />
                            <Chip icon={BarChart3}   label={t("attendance.total")} count={att.totalDone}
                              wrapCls="bg-gray-100 dark:bg-gray-700/50"
                              iconCls="text-darktext"
                              textCls="text-gray-700 dark:text-gray-300" />
                          </div>

                          {/* dual attendance bar */}
                          {att.totalDone > 0 && (
                            <div className="mt-4 bg-gray-50 dark:bg-darkmode rounded-xl p-3.5 border border-gray-100 dark:border-dark_border">
                              <div className="flex justify-between text-xs text-darktext mb-2">
                                <span className="font-medium">{t("attendance.attendanceVsAbsence")}</span>
                                <span className="font-bold">
                                  {att.attended} {t("attendance.present")} · {att.absent} {t("attendance.absent")} · {att.excused} {t("attendance.excused")}
                                </span>
                              </div>
                              <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
                                <div className="bg-green-500 transition-all duration-700"
                                  style={{ width:`${(att.attended/att.totalDone)*100}%` }}/>
                                <div className="bg-red-500 transition-all duration-700"
                                  style={{ width:`${(att.absent/att.totalDone)*100}%` }}/>
                                <div className="bg-blue-400 transition-all duration-700"
                                  style={{ width:`${(att.excused/att.totalDone)*100}%` }}/>
                              </div>
                              <div className="flex gap-4 mt-2">
                                {[
                                  ["bg-green-500", t("attendance.present")],
                                  ["bg-red-500", t("attendance.absent")],
                                  ["bg-blue-400", t("attendance.excused")]
                                ].map(([c,l]) => (
                                  <div key={l} className="flex items-center gap-1.5">
                                    <div className={`w-2 h-2 rounded-sm ${c}`}/>
                                    <span className="text-[10px] text-darktext">{l}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* expand toggle */}
                          {st.log.length > 0 && (
                            <button onClick={() => toggle(st.id)}
                              className={`
                                flex items-center gap-2 mt-4 px-4 py-2 rounded-xl
                                text-xs font-bold transition-all border
                                ${isOpen
                                  ? "bg-indigo-50 dark:bg-primary/10 border-primary/30 text-primary"
                                  : "bg-gray-50 dark:bg-darkmode border-gray-200 dark:border-dark_border text-darktext hover:text-primary hover:border-primary/30"
                                }
                              `}>
                              {isOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                              {isOpen ? t("attendance.hideLog") : t("attendance.showLog", { count: st.log.length })}
                            </button>
                          )}
                        </div>

                        {/* session log */}
                        {isOpen && (
                          <div className="border-t border-gray-100 dark:border-dark_border p-5 md:p-6 bg-gray-50/60 dark:bg-darkmode">
                            <p className="text-[11px] font-black text-primary tracking-widest uppercase mb-4">
                              {t("attendance.sessionLog")}
                            </p>
                            <div className="flex flex-col gap-2">
                              {st.log.map((log, i) => {
                                const sm  = smeta(log.status, t);
                                const dim = ["cancelled","postponed","upcoming"].includes(log.status);
                                return (
                                  <div key={i}
                                    className={`
                                      flex items-center gap-3 px-4 py-3 rounded-xl
                                      border transition-opacity
                                      ${dim
                                        ? "bg-gray-50 dark:bg-darklight border-gray-100 dark:border-dark_border opacity-70"
                                        : "bg-white dark:bg-darklight border-gray-100 dark:border-dark_border"
                                      }
                                    `}>
                                    {/* module num */}
                                    <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center
                                      justify-center font-black text-sm ${sm.cls}`}>
                                      {log.moduleNumber}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                        {log.title}
                                      </p>
                                      <p className="text-xs text-darktext mt-0.5">
                                        {log.date}
                                        {log.dayName   ? ` · ${dayName(log.dayName, language)}`  : ""}
                                        {log.startTime ? ` · ${log.startTime}` : ""}
                                      </p>
                                    </div>
                                    <span className={`
                                      text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 ${sm.cls}
                                    `}>
                                      {sm.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-5">

              {/* Course */}
              <SideCard
                headerCls="bg-gradient-to-r from-sky-500 to-sky-400"
                icon={BookOpen} title={t("course.details")}>
                <p className="font-bold text-[15px] text-gray-900 dark:text-white mb-4">
                  {group.course.title}
                </p>
                {[
                  [t("course.level"),       group.course.level],
                  [t("course.modules"),       `${group.course.modulesCount} ${t("course.modulesUnit")}`],
                  [t("course.lessons"),        `${group.course.totalLessons} ${t("course.lessonsUnit")}`],
                  [t("course.totalSessions"), `${group.course.totalSessions} ${t("sessions.title")}`],
                ].map(([l, v]) => (
                  <div key={l}
                    className="flex justify-between border-t border-gray-50 dark:border-dark_border pt-3 mt-3">
                    <span className="text-sm text-darktext">{l}</span>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{v}</span>
                  </div>
                ))}
              </SideCard>

              {/* Schedule */}
              <SideCard
                headerCls="bg-gradient-to-r from-violet-600 to-primary"
                icon={Clock} title={t("schedule.title")}>
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-xs text-darktext font-semibold mb-1.5">{t("schedule.startDate")}</p>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">
                      {group.schedule.startDate
                        ? new Date(group.schedule.startDate).toLocaleDateString(language === 'ar' ? "ar-EG" : "en-US",
                            { weekday:"long", year:"numeric", month:"long", day:"numeric" })
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-darktext font-semibold mb-2">{t("schedule.days")}</p>
                    <div className="flex flex-wrap gap-2">
                      {group.schedule.daysOfWeek.map(d => (
                        <span key={d}
                          className="bg-indigo-50 dark:bg-primary/15 text-primary text-xs font-bold px-3 py-1.5 rounded-full">
                          {dayName(d, language)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 bg-violet-50 dark:bg-primary/10 rounded-xl px-4 py-3 border border-violet-100 dark:border-primary/20">
                    <Clock size={15} className="text-primary flex-shrink-0" />
                    <span className="font-bold text-primary text-sm">
                      {group.schedule.timeFrom} — {group.schedule.timeTo}
                    </span>
                  </div>
                </div>
              </SideCard>

              {/* Instructors */}
              <SideCard
                headerCls="bg-gradient-to-r from-emerald-500 to-green-400"
                icon={GraduationCap}
                title={`${t("instructors.title")} (${group.instructors.length})`}>
                {group.instructors.length === 0 ? (
                  <p className="text-darktext text-center py-6">{t("instructors.noInstructors")}</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {group.instructors.map((inst, i) => (
                      <div key={inst.id || i}
                        className="flex items-center gap-3 bg-gray-50 dark:bg-darkmode rounded-xl p-3.5 border border-gray-100 dark:border-dark_border">
                        <div className="w-12 h-12 rounded-xl flex-shrink-0 bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xl font-black text-green-600 dark:text-green-400">
                          {inst.name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-gray-900 dark:text-white">
                            {inst.name}
                          </p>
                          <p className="text-xs text-darktext">
                            {inst.gender === "male" ? t("instructors.male") : t("instructors.female")}
                          </p>
                          {inst.email && (
                            <div className="flex items-center gap-1 mt-1">
                              <Mail size={11} className="text-darktext flex-shrink-0"/>
                              <span className="text-xs text-darktext truncate">{inst.email}</span>
                            </div>
                          )}
                          {inst.phone && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Phone size={11} className="text-darktext flex-shrink-0"/>
                              <span className="text-xs text-darktext">{inst.phone}</span>
                            </div>
                          )}
                        </div>
                        <button onClick={() => removeInstructor(inst.id, inst.name)}
                          className="flex-shrink-0 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </SideCard>

            </div>
          </div>
        </div>{/* end scrollable */}
      </div>{/* end popup */}
    </div>  /* end overlay */
  );
}