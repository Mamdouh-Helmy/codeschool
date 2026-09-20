// components/admin/GroupDetailsPage.jsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Users, BookOpen, Clock, GraduationCap, TrendingUp, AlertCircle,
  CheckCircle, Mail, Phone, Trash2, UserMinus, BarChart3, XCircle,
  ChevronDown, ChevronUp, Calendar, X, Link as LinkIcon, FileText, Video,
  UserPlus, Package, Wallet, Timer, Settings2, Gift, Plus, Search, Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useI18n } from "@/i18n/I18nProvider";
import AddStudentsToGroup from "./AddStudentsToGroup";
import StudentPackageModal from "./StudentPackageModal";
import InstructorNotificationModal from "./InstructorNotificationModal";

// ─── helpers ─────────────────────────────────────────────────────────────────
const DAY_AR = {
  Sunday: "الأحد", Monday: "الاثنين", Tuesday: "الثلاثاء",
  Wednesday: "الأربعاء", Thursday: "الخميس", Friday: "الجمعة", Saturday: "السبت",
};
const dayName = (day, lang) => (lang === "ar" ? DAY_AR[day] || day : day);

const fmtDuration = (mins, isRTL) => {
  const h = Math.floor((mins || 0) / 60);
  const m = Math.round((mins || 0) % 60);
  return isRTL ? `${h} س ${m} د` : `${h}h ${m}m`;
};
const fmtMoney = (n, cur, isRTL) =>
  `${Number(n || 0).toLocaleString(isRTL ? "ar-EG" : "en-US", { maximumFractionDigits: 2 })} ${cur || "EGP"}`;

function rateInfo(r, t) {
  if (r >= 80) return { barCls: "bg-emerald-500", trackCls: "bg-emerald-100 dark:bg-emerald-900/30", badgeCls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", avatarCls: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400", label: t("attendance.excellent") };
  if (r >= 60) return { barCls: "bg-amber-400", trackCls: "bg-amber-100 dark:bg-amber-900/30", badgeCls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", avatarCls: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400", label: t("attendance.good") };
  if (r >= 40) return { barCls: "bg-orange-400", trackCls: "bg-orange-100 dark:bg-orange-900/30", badgeCls: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", avatarCls: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400", label: t("attendance.acceptable") };
  return { barCls: "bg-red-500", trackCls: "bg-red-100 dark:bg-red-900/30", badgeCls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", avatarCls: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400", label: t("attendance.poor") };
}

const SESSION_META = (t) => ({
  present: { label: t("session.present"), cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  absent: { label: t("session.absent"), cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  late: { label: t("session.late"), cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  excused: { label: t("session.excused"), cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
  cancelled: { label: t("session.cancelled"), cls: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" },
  postponed: { label: t("session.postponed"), cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  upcoming: { label: t("session.upcoming"), cls: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
  scheduled: { label: t("session.scheduled"), cls: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
  completed: { label: t("session.completed"), cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
});
const smeta = (s, t) => SESSION_META(t)[s] || { label: s, cls: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" };

const GROUP_STATUS_CLS = {
  active: "bg-emerald-400/20 text-emerald-100",
  draft: "bg-white/15 text-white/80",
  completed: "bg-sky-400/20 text-sky-100",
  cancelled: "bg-red-400/20 text-red-100",
};

const platformIcon = (p) => ({ zoom: "🔷", google_meet: "🔴", microsoft_teams: "🔵" }[p] || "🔗");

const CARD = "bg-white dark:bg-darklight rounded-2xl border border-gray-100 dark:border-dark_border shadow-sm";

// ─── small pieces ────────────────────────────────────────────────────────────
function Bar({ value, barCls, trackCls }) {
  return (
    <div className={`w-full h-2 rounded-full overflow-hidden ${trackCls}`}>
      <div className={`h-full rounded-full transition-all duration-700 ${barCls}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

function Chip({ icon: Icon, label, count, wrapCls, iconCls, textCls }) {
  return (
    <div className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl ${wrapCls} min-w-[60px]`}>
      <Icon size={13} className={iconCls} />
      <span className={`text-lg font-black leading-none ${textCls}`}>{count}</span>
      <span className={`text-[10px] font-semibold opacity-80 ${textCls}`}>{label}</span>
    </div>
  );
}

function SectionTitle({ color = "bg-primary", title, count, right }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
      <div className="flex items-center gap-3">
        <div className={`w-1 h-6 rounded-full ${color}`} />
        <h2 className="text-lg font-black text-gray-900 dark:text-white">
          {title}
          {count !== undefined && <span className="text-darktext font-medium text-sm ms-2">({count})</span>}
        </h2>
      </div>
      {right}
    </div>
  );
}

function SideCard({ headerCls, icon: Icon, title, children }) {
  return (
    <div className={`${CARD} overflow-hidden`}>
      <div className={`flex items-center gap-2.5 px-5 py-3.5 ${headerCls}`}>
        <Icon size={17} className="text-white flex-shrink-0" />
        <h3 className="text-white font-bold text-sm m-0">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Sessions (scrollable + filter + polished) ───────────────────────────────
function SessionsList({ sessions, t, language, tx }) {
  const [filter, setFilter] = useState("all");
  const boxRef = useRef(null);
  const nextRef = useRef(null);

  const counts = useMemo(() => ({
    all: sessions.length,
    scheduled: sessions.filter((s) => s.status === "scheduled").length,
    completed: sessions.filter((s) => s.status === "completed").length,
    other: sessions.filter((s) => ["cancelled", "postponed"].includes(s.status)).length,
  }), [sessions]);

  const visible = useMemo(() => {
    if (filter === "all") return sessions;
    if (filter === "other") return sessions.filter((s) => ["cancelled", "postponed"].includes(s.status));
    return sessions.filter((s) => s.status === filter);
  }, [sessions, filter]);

  const nextId = useMemo(() => sessions.find((s) => s.status === "scheduled")?.id, [sessions]);

  // اسكرول تلقائي لأول سيشن جاية أول ما تفتح
  useEffect(() => {
    if (filter !== "all" || !boxRef.current || !nextRef.current) return;
    boxRef.current.scrollTop = Math.max(0, nextRef.current.offsetTop - 12);
  }, [filter, nextId]);

  // زرار "روح للحصة الجاية" — بيرجع الفلتر لـ all ويعمل سكرول smooth
  const scrollToNext = () => {
    if (filter !== "all") setFilter("all");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (boxRef.current && nextRef.current) {
          boxRef.current.scrollTo({ top: Math.max(0, nextRef.current.offsetTop - 12), behavior: "smooth" });
        }
      });
    });
  };

  if (!sessions.length) return null;

  const tabs = [
    ["all", tx("الكل", "All")],
    ["scheduled", t("sessions.scheduled")],
    ["completed", t("sessions.completed")],
    ["other", tx("ملغاة/مؤجلة", "Cancelled/Postponed")],
  ];

  return (
    <div className="mb-7">
      <SectionTitle
        color="bg-secondary"
        title={t("sessions.title")}
        count={sessions.length}
        right={
          nextId ? (
            <button
              onClick={scrollToNext}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary/15 active:scale-95 transition-all"
            >
              <Calendar size={13} /> {tx("روح للحصة الجاية", "Jump to next session")}
            </button>
          ) : null
        }
      />

      <div className={`${CARD} overflow-hidden`}>
        {/* filter bar */}
        <div className="flex flex-wrap gap-1.5 p-3 border-b border-gray-100 dark:border-dark_border bg-gradient-to-r from-gray-50 to-white dark:from-darkmode/50 dark:to-darkmode/20">
          {tabs.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                filter === k
                  ? "bg-secondary text-white shadow-md shadow-secondary/25"
                  : "text-gray-500 dark:text-darkmuted hover:bg-white dark:hover:bg-dark_input"
              }`}
            >
              {label} <span className="opacity-70 tabular-nums">{counts[k]}</span>
            </button>
          ))}
        </div>

        {/* ✅ scrollable area — max height ثابت + fade عشان يبان إن فيه أكتر تحت */}
        <div className="relative">
          <div
            ref={boxRef}
            className="sessions-scroll relative max-h-[560px] overflow-y-auto p-3.5 space-y-2.5 scroll-smooth"
          >
            {visible.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-14">
                <Calendar size={32} className="text-gray-300 dark:text-gray-600" />
                <p className="text-center text-sm text-gray-400">{tx("لا توجد حصص", "No sessions")}</p>
              </div>
            )}
            {visible.map((sess, i) => {
              const sm = smeta(sess.status, t);
              const dim = ["cancelled", "postponed"].includes(sess.status);
              const isNext = sess.id === nextId;
              return (
                <div
                  key={sess.id || i}
                  ref={isNext ? nextRef : null}
                  className={`relative overflow-hidden rounded-xl border transition-all duration-200 ${
                    dim ? "opacity-60" : "hover:-translate-y-0.5 hover:shadow-md"
                  } ${
                    isNext
                      ? "border-primary/50 bg-gradient-to-r from-primary/[0.06] to-transparent dark:from-primary/[0.09] shadow-[0_0_0_1px_rgba(255,103,0,.15)]"
                      : "border-gray-100 dark:border-dark_border bg-white dark:bg-darklight"
                  }`}
                >
                  {isNext && <div className="absolute inset-y-0 start-0 w-1 bg-primary" />}
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-sm ring-2 ring-white dark:ring-darklight ${sm.cls}`}>
                      {sess.moduleNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                        {sess.title}
                        {sess.isComplimentary && <Gift size={12} className="text-primary flex-shrink-0" />}
                        {isNext && (
                          <span className="text-[9px] font-black bg-primary text-white px-1.5 py-0.5 rounded-full animate-pulse">
                            {tx("الجاية", "NEXT")}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-darktext mt-0.5 flex items-center gap-1 flex-wrap">
                        <span>{sess.date}</span>
                        {sess.dayName ? <span>· {dayName(sess.dayName, language)}</span> : null}
                        {sess.startTime ? (
                          <span>· {sess.startTime}{sess.endTime ? ` — ${sess.endTime}` : ""}</span>
                        ) : null}
                      </p>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${sm.cls}`}>{sm.label}</span>
                  </div>

                  {(sess.meetingLink || sess.recordingLink || sess.instructorNotes) && (
                    <div className="px-4 pb-3.5 flex flex-wrap gap-2">
                      {sess.meetingLink && (
                        <a href={sess.meetingLink} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary/5 text-secondary dark:bg-primary/10 dark:text-primary hover:bg-secondary/10 transition max-w-full">
                          <span>{platformIcon(sess.meetingPlatform)}</span>
                          <LinkIcon size={11} />
                          <span className="truncate max-w-[220px]">{sess.meetingLink}</span>
                        </a>
                      )}
                      {sess.recordingLink && (
                        <a href={sess.recordingLink} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/15 dark:text-emerald-300 hover:bg-emerald-100 transition">
                          <Video size={11} /> {t("session.recording")}
                        </a>
                      )}
                      {sess.instructorNotes && (
                        <div className="flex items-start gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-300 text-xs w-full">
                          <FileText size={12} className="mt-0.5 flex-shrink-0" />
                          <p className="leading-relaxed">{sess.instructorNotes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* fade في الأعلى والأسفل عشان يبان إن الليستة فيها سكرول */}
          <div className="pointer-events-none absolute top-0 inset-x-0 h-5 bg-gradient-to-b from-white dark:from-darklight to-transparent rounded-t-2xl" />
          <div className="pointer-events-none absolute bottom-0 inset-x-0 h-5 bg-gradient-to-t from-white dark:from-darklight to-transparent rounded-b-2xl" />
        </div>
      </div>

      <style jsx>{`
        .sessions-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 0, 0, 0.18) transparent;
        }
        .sessions-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .sessions-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sessions-scroll::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.18);
          border-radius: 999px;
        }
        .sessions-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }
        :global(.dark) .sessions-scroll {
          scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
        }
        :global(.dark) .sessions-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.18);
        }
        :global(.dark) .sessions-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}

// ─── Package strip inside student card ───────────────────────────────────────
function PackageStrip({ credit, tx, isRTL, onManage }) {
  if (!credit.hasPackage) {
    return (
      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-dashed border-gray-200 dark:border-dark_border px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Package size={14} /> {tx("لا توجد باقة ساعات", "No credit package")}
        </div>
        <button onClick={onManage} className="text-xs font-bold text-primary hover:underline">
          + {tx("إضافة باقة", "Add package")}
        </button>
      </div>
    );
  }
  const pct = credit.totalHours > 0 ? Math.min(100, (credit.remainingHours / credit.totalHours) * 100) : 0;
  const low = credit.remainingHours <= 2;
  const mid = credit.remainingHours <= 5;
  const barCls = low ? "bg-red-500" : mid ? "bg-amber-brand" : "bg-secondary dark:bg-emerald-400";

  return (
    <div className="mt-4 rounded-xl bg-gray-50 dark:bg-darkmode/60 border border-gray-100 dark:border-dark_border p-3.5">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Package size={14} className="text-primary flex-shrink-0" />
          <span className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">{credit.packageName || "—"}</span>
          {credit.isExpired && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300">
              {tx("منتهية", "Expired")}
            </span>
          )}
        </div>
        <button
          onClick={onManage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-primary/10 text-primary hover:bg-primary/15 transition flex-shrink-0"
        >
          <Settings2 size={12} /> {tx("إدارة", "Manage")}
        </button>
      </div>
      <div className="h-2 rounded-full bg-gray-200 dark:bg-dark_border overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${barCls}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-[11px] text-gray-500 dark:text-darkmuted">
        <span>
          {tx("متبقي", "Left")}{" "}
          <b className={low ? "text-red-500" : "text-gray-800 dark:text-white"}>{credit.remainingHours}</b>
          {" / "}{credit.totalHours} {tx("ساعة", "h")}
        </span>
        <span>
          {tx("ينتهي", "Ends")}{" "}
          {credit.endDate ? new Date(credit.endDate).toLocaleDateString(isRTL ? "ar-EG" : "en-GB") : "—"}
        </span>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function GroupDetailsPage({ groupId, onClose }) {
  const { t, language } = useI18n();
  const isRTL = language === "ar";
  const tx = (ar, en) => (isRTL ? ar : en);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [addOpen, setAddOpen] = useState(false);
  const [pkgStudentId, setPkgStudentId] = useState(null);

  // ── إضافة مدرس ──
  const [instrPickerOpen, setInstrPickerOpen] = useState(false);
  const [instrList, setInstrList] = useState([]);
  const [instrLoading, setInstrLoading] = useState(false);
  const [instrSearch, setInstrSearch] = useState("");
  const [instrBusyId, setInstrBusyId] = useState(null);
  // instructors لازم يفضل array ثابت في الـ state (المودال بيعمل reset لو الـ reference اتغير)
  const [instrNotify, setInstrNotify] = useState({ open: false, instructors: [], groupData: null });

  const availableInstructors = useMemo(() => {
    const inGroup = new Set((data?.group?.instructors || []).map((i) => String(i.id)));
    const q = instrSearch.trim().toLowerCase();
    return instrList.filter((u) => {
      if (inGroup.has(String(u._id || u.id))) return false;
      if (!q) return true;
      return `${u.name || ""} ${u.email || ""}`.toLowerCase().includes(q);
    });
  }, [instrList, instrSearch, data]);

  useEffect(() => { if (groupId) load(true); }, [groupId]);

  // silent = true → ما يقلبش الشاشة كلها لودينج (بعد التعديلات)
  async function load(initial = false) {
    if (initial) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/details`, { cache: "no-store" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || t("group.details.loadError"));
      setData(json.data);
    } catch (e) { setError(e.message); }
    finally { if (initial) setLoading(false); }
  }

  const toggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  // ── Add instructor ─────────────────────────────────────────────────────────
  async function openInstructorPicker() {
    setInstrPickerOpen(true);
    setInstrSearch("");
    if (instrList.length) return;
    setInstrLoading(true);
    try {
      const res = await fetch("/api/users?role=instructor&limit=1000");
      const json = await res.json();
      if (json.success) setInstrList(json.data || []);
      else toast.error(json.error || t("common.error"));
    } catch { toast.error(t("common.error")); }
    finally { setInstrLoading(false); }
  }

  // POST → بيرمي error لو فشل (المودال بتاع الإشعار بيعرض الـ toast)
  async function submitAddInstructor(user, instructorMessages) {
    const res = await fetch(`/api/groups/${groupId}/add-instructor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instructorId: user._id || user.id, instructorMessages }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || t("common.error"));
    await load();
    return json;
  }

  // إضافة عادية بس — من غير إشعار
  async function addInstructorOnly(user) {
    const uid = user._id || user.id;
    setInstrBusyId(uid);
    try {
      await submitAddInstructor(user);
      toast.success(tx("تمت إضافة المدرس", "Instructor added"));
      setInstrPickerOpen(false);
    } catch (e) { toast.error(e.message); }
    finally { setInstrBusyId(null); }
  }

  // إضافة + فتح مودال الإشعار (الإضافة الفعلية بتحصل وقت الإرسال)
  async function startAddWithNotify(user) {
    const uid = user._id || user.id;
    setInstrBusyId(uid);
    try {
      const r = await fetch(`/api/groups/${groupId}`, { cache: "no-store" });
      const j = await r.json();
      if (!j.success || !j.data) throw new Error(j.error || t("common.error"));
      setInstrNotify({
        open: true,
        instructors: [{ ...user, _id: uid }],
        groupData: j.data,
      });
      setInstrPickerOpen(false);
    } catch (e) { toast.error(e.message); }
    finally { setInstrBusyId(null); }
  }

  // بيتنادى من InstructorNotificationModal لما تدوس "إرسال"
  async function sendNotifyAndAdd(instructorMessages) {
    const user = instrNotify.instructors[0];
    const json = await submitAddInstructor(user, instructorMessages);
    if (json.notification && json.notification.success === false) {
      throw new Error(
        tx(
          `اتضاف المدرس لكن فشل إرسال الإشعار: ${json.notification.error || ""}`,
          `Instructor added but notification failed: ${json.notification.error || ""}`,
        ),
      );
    }
  }

  async function removeStudent(studentId, name) {
    if (!confirm(t("group.student.removeConfirm", { name }))) return;
    const tid = toast.loading(t("common.removing"));
    try {
      const r = await fetch(`/api/groups/${groupId}/remove-student`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      const j = await r.json();
      if (r.ok && j.success) { toast.success(t("common.removed"), { id: tid }); load(); }
      else toast.error(j.error || t("common.error"), { id: tid });
    } catch { toast.error(t("common.error"), { id: tid }); }
  }

  async function removeInstructor(instructorId, name) {
    if (!confirm(t("group.instructor.removeConfirm", { name }))) return;
    const tid = toast.loading(t("common.removing"));
    try {
      const r = await fetch(`/api/groups/${groupId}/remove-instructor`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructorId }),
      });
      const j = await r.json();

      if (j.requiresConfirmation) {
        toast.dismiss(tid);
        const confirmed = confirm(
          t("group.instructor.lastInstructorWarning", {
            name,
            fallback: `"${name}" هو آخر مدرب في هذه المجموعة النشطة. هل أنت متأكد من الحذف؟`,
          }),
        );
        if (!confirmed) { toast.error(t("common.cancelled", { fallback: "تم الإلغاء" })); return; }

        const r2 = await fetch(`/api/groups/${groupId}/remove-instructor`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instructorId, forceRemove: true }),
        });
        const j2 = await r2.json();
        if (r2.ok && j2.success) { toast.success(t("common.removed")); load(); }
        else toast.error(j2.error || t("common.error"));
        return;
      }

      if (r.ok && j.success) { toast.success(t("common.removed"), { id: tid }); load(); }
      else toast.error(j.error || t("common.error"), { id: tid });
    } catch { toast.error(t("common.error"), { id: tid }); }
  }

  // ── loading / error ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-darkmode/60 backdrop-blur-sm">
      <div className={`${CARD} p-10 flex flex-col items-center gap-4`}>
        <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-primary rounded-full animate-spin" />
        <p className="text-darktext text-sm font-medium">{t("common.loading")}</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-darkmode/60 backdrop-blur-sm">
      <div className={`${CARD} p-10 flex flex-col items-center gap-4 max-w-sm w-full mx-4`}>
        <AlertCircle size={52} className="text-red-500" />
        <p className="text-base font-bold text-gray-900 dark:text-white text-center">{error || t("group.details.notFound")}</p>
        <button onClick={onClose} className="w-full py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors">
          {t("common.back")}
        </button>
      </div>
    </div>
  );

  const { group, stats, sessions, students } = data;
  const circ = 2 * Math.PI * 36;
  const isFull = students.length >= group.maxStudents;
  const pkgStudent = pkgStudentId ? students.find((s) => s.id === pkgStudentId) : null;

  const statCards = [
    { icon: Users, label: t("students.title"), val: `${stats.students.total}/${stats.students.maxSlots}`, bg: "bg-primary/10", cl: "text-primary" },
    { icon: GraduationCap, label: t("instructors.title"), val: group.instructors.length, bg: "bg-sky-100 dark:bg-sky-900/30", cl: "text-sky-600 dark:text-sky-400" },
    { icon: Calendar, label: t("sessions.total"), val: stats.sessions.total, bg: "bg-secondary/10 dark:bg-teal-900/30", cl: "text-secondary dark:text-teal-300" },
    { icon: CheckCircle, label: t("sessions.completed"), val: stats.sessions.completed, bg: "bg-emerald-100 dark:bg-emerald-900/30", cl: "text-emerald-600 dark:text-emerald-400" },
    {
      icon: TrendingUp, label: t("attendance.average"), val: `${stats.attendance.avgPct}%`,
      bg: stats.attendance.avgPct >= 80 ? "bg-emerald-100 dark:bg-emerald-900/30" : stats.attendance.avgPct >= 60 ? "bg-amber-100 dark:bg-amber-900/30" : "bg-red-100 dark:bg-red-900/30",
      cl: stats.attendance.avgPct >= 80 ? "text-emerald-600 dark:text-emerald-400" : stats.attendance.avgPct >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-darkmode/60 backdrop-blur-sm p-3 md:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="relative w-full max-w-[1400px] max-h-[95vh] flex flex-col overflow-hidden bg-gray-50 dark:bg-darkmode rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,.45)] border border-gray-200 dark:border-dark_border"
      >
        {/* top bar */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-white/80 dark:bg-darklight/80 backdrop-blur border-b border-gray-200 dark:border-dark_border">
          <button onClick={onClose} className="flex items-center gap-2 text-darktext hover:text-primary font-semibold text-sm transition-colors">
            {isRTL ? "→" : "←"} {t("common.backToGroups")}
          </button>
          <button onClick={onClose} className="p-2 rounded-xl bg-gray-100 dark:bg-dark_input hover:bg-gray-200 dark:hover:bg-dark_border text-darktext hover:text-gray-900 dark:hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 md:p-8">

          {/* ══ HERO ══ */}
          <div className="relative rounded-3xl overflow-hidden mb-6 bg-gradient-to-br from-secondary via-[#00606d] to-teal-dark shadow-brand-lg">
            <div className="absolute -top-12 -end-12 w-48 h-48 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 start-24 w-40 h-40 rounded-full bg-white/[.05] pointer-events-none" />

            <div className="relative z-[1] p-6 md:p-9">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="bg-white/15 text-white text-xs font-bold px-3.5 py-1.5 rounded-full tracking-wide">{group.code}</span>
                    <span className={`text-xs font-bold px-3.5 py-1.5 rounded-full ${GROUP_STATUS_CLS[group.status] || GROUP_STATUS_CLS.draft}`}>
                      {t(`group.status.${group.status}`)}
                    </span>
                    {group.deliveryMode === "offline" && (
                      <span className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-amber-brand/25 text-amber-100">
                        {tx("أوفلاين", "Offline")}
                      </span>
                    )}
                  </div>
                  <h1 className="text-white text-3xl md:text-4xl font-black mb-1 leading-tight">{group.name}</h1>
                  <p className="text-white/70 text-sm">{group.course.title}</p>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="relative w-24 h-24 md:w-28 md:h-28">
                    <svg width="100%" height="100%" viewBox="0 0 84 84" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx={42} cy={42} r={36} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth={8} />
                      <circle cx={42} cy={42} r={36} fill="none" stroke="#feaf00" strokeWidth={8}
                        strokeDasharray={circ} strokeDashoffset={circ * (1 - stats.sessions.progressPct / 100)}
                        strokeLinecap="round" style={{ transition: "stroke-dashoffset 1.2s ease" }} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-xl font-black">{stats.sessions.progressPct}%</span>
                    </div>
                  </div>
                  <div className="text-white">
                    <p className="text-xs opacity-70 mb-1">{t("group.courseProgress")}</p>
                    <p className="text-3xl font-black">
                      {stats.sessions.completed}<span className="text-white/50 text-xl">/{stats.sessions.total}</span>
                    </p>
                    <p className="text-xs opacity-60 mt-0.5">{t("sessions.completed")}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5 mt-6">
                {[
                  { l: t("sessions.completed"), v: stats.sessions.completed },
                  { l: t("sessions.scheduled"), v: stats.sessions.scheduled },
                  { l: t("sessions.cancelled"), v: stats.sessions.cancelled },
                  { l: t("sessions.postponed"), v: stats.sessions.postponed },
                ].map((p) => (
                  <div key={p.l} className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2 hover:bg-white/15 transition-colors">
                    <span className="text-white/80 text-sm">{p.l}</span>
                    <span className="text-white font-black">{p.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ══ STAT CARDS ══ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-7">
            {statCards.map(({ icon: Icon, label, val, bg, cl }) => (
              <div key={label} className={`${CARD} p-4`}>
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                  <Icon size={19} className={cl} />
                </div>
                <p className="text-xs text-darktext font-semibold mb-1">{label}</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{val}</p>
              </div>
            ))}
          </div>

          {/* ══ SESSIONS (scrollable) ══ */}
          <SessionsList sessions={sessions} t={t} language={language} tx={tx} />

          {/* ══ 2-COL ══ */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">

            {/* ── STUDENTS ── */}
            <div>
              <SectionTitle
                title={t("students.title")}
                count={students.length}
                right={
                  <button
                    onClick={() => setAddOpen(true)}
                    disabled={isFull}
                    title={isFull ? tx("المجموعة مكتملة", "Group is full") : ""}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-brand-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <UserPlus size={15} /> {tx("إضافة طالب", "Add student")}
                  </button>
                }
              />

              {students.length === 0 ? (
                <div className={`${CARD} p-14 text-center`}>
                  <Users size={44} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-darktext">{t("students.noStudents")}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {students.map((st, idx) => {
                    const ri = rateInfo(st.attendance.attendancePct, t);
                    const isOpen = !!expanded[st.id];
                    const att = st.attendance;
                    return (
                      <div key={st.id || idx} className={`${CARD} overflow-hidden transition-all duration-200 ${isOpen ? "border-primary/40 shadow-[0_0_0_3px_rgba(255,103,0,.08)]" : ""}`}>
                        <div className="p-5">
                          <div className="flex items-center gap-4">
                            <div className={`w-[52px] h-[52px] rounded-2xl flex-shrink-0 flex items-center justify-center text-xl font-black ${ri.avatarCls}`}>
                              {st.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <p className="font-bold text-[15px] text-gray-900 dark:text-white">{st.name}</p>
                                {att.totalDone > 0 && (
                                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${ri.badgeCls}`}>{ri.label}</span>
                                )}
                              </div>
                              <p className="text-xs text-darktext mb-2.5">{st.enrollment}</p>
                              <div className="flex items-center gap-3">
                                <div className="flex-1"><Bar value={att.attendancePct} barCls={ri.barCls} trackCls={ri.trackCls} /></div>
                                <span className="text-sm font-black min-w-[44px] text-gray-700 dark:text-gray-200 tabular-nums">{att.attendancePct}%</span>
                              </div>
                            </div>
                            <button onClick={() => removeStudent(st.id, st.name)} title={t("students.remove")}
                              className="flex-shrink-0 p-2.5 rounded-xl bg-red-50 dark:bg-red-900/15 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                              <UserMinus size={16} />
                            </button>
                          </div>

                          {/* ✅ package */}
                          <PackageStrip credit={st.credit} tx={tx} isRTL={isRTL} onManage={() => setPkgStudentId(st.id)} />

                          {/* chips */}
                          <div className="flex flex-wrap gap-2 mt-4">
                            <Chip icon={CheckCircle} label={t("attendance.present")} count={att.present} wrapCls="bg-emerald-50 dark:bg-emerald-900/15" iconCls="text-emerald-600 dark:text-emerald-400" textCls="text-emerald-700 dark:text-emerald-300" />
                            <Chip icon={XCircle} label={t("attendance.absent")} count={att.absent} wrapCls="bg-red-50 dark:bg-red-900/15" iconCls="text-red-600 dark:text-red-400" textCls="text-red-700 dark:text-red-300" />
                            <Chip icon={Clock} label={t("attendance.late")} count={att.late} wrapCls="bg-orange-50 dark:bg-orange-900/15" iconCls="text-orange-600 dark:text-orange-400" textCls="text-orange-700 dark:text-orange-300" />
                            <Chip icon={AlertCircle} label={t("attendance.excused")} count={att.excused} wrapCls="bg-sky-50 dark:bg-sky-900/15" iconCls="text-sky-600 dark:text-sky-400" textCls="text-sky-700 dark:text-sky-300" />
                            <Chip icon={BarChart3} label={t("attendance.total")} count={att.totalDone} wrapCls="bg-gray-100 dark:bg-gray-700/40" iconCls="text-darktext" textCls="text-gray-700 dark:text-gray-300" />
                          </div>

                          {st.log.length > 0 && (
                            <button onClick={() => toggle(st.id)}
                              className={`flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                isOpen
                                  ? "bg-primary/5 border-primary/30 text-primary"
                                  : "bg-gray-50 dark:bg-darkmode border-gray-200 dark:border-dark_border text-darktext hover:text-primary hover:border-primary/30"
                              }`}>
                              {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              {isOpen ? t("attendance.hideLog") : t("attendance.showLog", { count: st.log.length })}
                            </button>
                          )}
                        </div>

                        {isOpen && (
                          <div className="border-t border-gray-100 dark:border-dark_border p-5 bg-gray-50/60 dark:bg-darkmode/60">
                            <p className="text-[11px] font-black text-primary tracking-widest uppercase mb-3">{t("attendance.sessionLog")}</p>
                            {/* ✅ scrollable log */}
                            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pe-1">
                              {st.log.map((log, i) => {
                                const sm = smeta(log.status, t);
                                const dim = ["cancelled", "postponed", "upcoming"].includes(log.status);
                                return (
                                  <div key={i} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border bg-white dark:bg-darklight border-gray-100 dark:border-dark_border ${dim ? "opacity-70" : ""}`}>
                                    <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-black text-xs ${sm.cls}`}>{log.moduleNumber}</div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{log.title}</p>
                                      <p className="text-xs text-darktext mt-0.5">
                                        {log.date}
                                        {log.dayName ? ` · ${dayName(log.dayName, language)}` : ""}
                                        {log.startTime ? ` · ${log.startTime}` : ""}
                                      </p>
                                    </div>
                                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${sm.cls}`}>{sm.label}</span>
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

            {/* ── SIDEBAR ── */}
            <div className="flex flex-col gap-5">
              {/* Instructors first: أهم حاجة للأدمن هنا */}
              <SideCard headerCls="bg-gradient-to-r from-secondary to-[#0a7686]" icon={GraduationCap}
                title={`${t("instructors.title")} (${group.instructors.length})`}>
                <button
                  onClick={openInstructorPicker}
                  className="w-full flex items-center justify-center gap-2 py-2.5 mb-3.5 rounded-xl border border-dashed border-secondary/30 dark:border-teal-700 text-secondary dark:text-teal-300 text-xs font-bold hover:bg-secondary/5 dark:hover:bg-teal-900/20 transition"
                >
                  <Plus size={14} /> {tx("إضافة مدرس", "Add instructor")}
                </button>

                {group.instructors.length === 0 ? (
                  <p className="text-darktext text-center py-6 text-sm">{t("instructors.noInstructors")}</p>
                ) : (
                  <div className="flex flex-col gap-3.5">
                    {group.instructors.map((inst, i) => {
                      const s = inst.stats;
                      return (
                        <div key={inst.id || i} className="rounded-xl bg-gray-50 dark:bg-darkmode/60 border border-gray-100 dark:border-dark_border p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl flex-shrink-0 bg-secondary/10 dark:bg-teal-900/30 flex items-center justify-center text-lg font-black text-secondary dark:text-teal-300">
                              {inst.name?.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{inst.name}</p>
                              {inst.email && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Mail size={10} className="text-darktext flex-shrink-0" />
                                  <span className="text-[11px] text-darktext truncate">{inst.email}</span>
                                </div>
                              )}
                              {inst.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone size={10} className="text-darktext flex-shrink-0" />
                                  <span className="text-[11px] text-darktext">{inst.phone}</span>
                                </div>
                              )}
                            </div>
                            <button onClick={() => removeInstructor(inst.id, inst.name)}
                              className="flex-shrink-0 p-2 rounded-lg bg-red-50 dark:bg-red-900/15 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {/* ✅ hours + money */}
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <div className="rounded-lg bg-white dark:bg-darklight border border-gray-100 dark:border-dark_border px-3 py-2">
                              <div className="flex items-center gap-1 text-[10px] font-semibold text-darktext mb-0.5">
                                <Timer size={11} /> {tx("الوقت المنجز", "Time worked")}
                              </div>
                              <p className="text-sm font-black text-gray-900 dark:text-white tabular-nums">{fmtDuration(s.minutes, isRTL)}</p>
                              <p className="text-[10px] text-gray-400">{s.sessionsCount} {tx("حصة", "sessions")}</p>
                            </div>
                            <div className="rounded-lg bg-white dark:bg-darklight border border-gray-100 dark:border-dark_border px-3 py-2">
                              <div className="flex items-center gap-1 text-[10px] font-semibold text-darktext mb-0.5">
                                <Wallet size={11} /> {tx("الحساب لحد دلوقتي", "Earned so far")}
                              </div>
                              {s.hasRate ? (
                                <>
                                  <p className="text-sm font-black text-primary tabular-nums">{fmtMoney(s.totalEarnings, s.currency, isRTL)}</p>
                                  <p className="text-[10px] text-gray-400">
                                    {fmtMoney(s.hourlyRate, s.currency, isRTL)}/{tx("ساعة", "h")}
                                    {s.transportation > 0 && ` · +${fmtMoney(s.transportation, s.currency, isRTL)} ${tx("انتقال", "transp.")}`}
                                  </p>
                                </>
                              ) : (
                                <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 leading-snug">
                                  {tx("لم يتم تحديد سعر", "No rate set")}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SideCard>

              <SideCard headerCls="bg-gradient-to-r from-primary to-orange-deep" icon={Clock} title={t("schedule.title")}>
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-xs text-darktext font-semibold mb-1.5">{t("schedule.startDate")}</p>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">
                      {group.schedule.startDate
                        ? new Date(group.schedule.startDate).toLocaleDateString(isRTL ? "ar-EG" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-darktext font-semibold mb-2">{t("schedule.days")}</p>
                    <div className="flex flex-wrap gap-2">
                      {group.schedule.daysOfWeek.map((d) => (
                        <span key={d} className="bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-full">{dayName(d, language)}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 bg-secondary/5 dark:bg-white/5 rounded-xl px-4 py-3 border border-secondary/10 dark:border-dark_border">
                    <Clock size={15} className="text-secondary dark:text-teal-300 flex-shrink-0" />
                    <span className="font-bold text-secondary dark:text-teal-300 text-sm">{group.schedule.timeFrom} — {group.schedule.timeTo}</span>
                  </div>
                </div>
              </SideCard>

              <SideCard headerCls="bg-gradient-to-r from-sky-600 to-sky-500" icon={BookOpen} title={t("course.details")}>
                <p className="font-bold text-sm text-gray-900 dark:text-white mb-3">{group.course.title}</p>
                {[
                  [t("course.level"), group.course.level],
                  [t("course.modules"), `${group.course.modulesCount} ${t("course.modulesUnit")}`],
                  [t("course.lessons"), `${group.course.totalLessons} ${t("course.lessonsUnit")}`],
                  [t("course.totalSessions"), `${group.course.totalSessions} ${t("sessions.title")}`],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between border-t border-gray-100 dark:border-dark_border pt-2.5 mt-2.5">
                    <span className="text-sm text-darktext">{l}</span>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{v}</span>
                  </div>
                ))}
              </SideCard>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Add student — نفس AddStudentsToGroup بالظبط ══ */}
      {addOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-darkmode/60 backdrop-blur-sm p-3"
          onClick={(e) => e.target === e.currentTarget && setAddOpen(false)}
        >
          <div
            dir={isRTL ? "rtl" : "ltr"}
            className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-darklight border border-gray-100 dark:border-dark_border shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 bg-white/90 dark:bg-darklight/90 backdrop-blur border-b border-gray-100 dark:border-dark_border">
              <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2">
                <UserPlus size={18} className="text-primary" /> {t("groups.actions.addStudents") || tx("إضافة طالب", "Add student")}
              </h3>
              <button onClick={() => setAddOpen(false)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-dark_input transition">
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              <AddStudentsToGroup groupId={groupId} onClose={() => setAddOpen(false)} onStudentAdded={() => load()} />
            </div>
          </div>
        </div>
      )}

      {/* ══ Add instructor: picker ══ */}
      {instrPickerOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-darkmode/60 backdrop-blur-sm p-3"
          onClick={(e) => e.target === e.currentTarget && !instrBusyId && setInstrPickerOpen(false)}
        >
          <div
            dir={isRTL ? "rtl" : "ltr"}
            className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl bg-white dark:bg-darklight border border-gray-100 dark:border-dark_border shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-dark_border">
              <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2">
                <GraduationCap size={18} className="text-secondary dark:text-teal-300" />
                {tx("إضافة مدرس للجروب", "Add instructor to group")}
              </h3>
              <button onClick={() => setInstrPickerOpen(false)} disabled={!!instrBusyId}
                className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-dark_input transition">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 border-b border-gray-100 dark:border-dark_border">
              <div className="relative">
                <Search size={15} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRTL ? "right-3.5" : "left-3.5"}`} />
                <input
                  value={instrSearch}
                  onChange={(e) => setInstrSearch(e.target.value)}
                  placeholder={tx("ابحث بالاسم أو الإيميل...", "Search by name or email...")}
                  className={`w-full py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark_border bg-gray-50 dark:bg-dark_input text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/25 ${isRTL ? "pr-10 pl-4" : "pl-10 pr-4"}`}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {instrLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
              ) : availableInstructors.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-12">{tx("لا يوجد مدرسين متاحين", "No available instructors")}</p>
              ) : (
                availableInstructors.map((u) => {
                  const uid = u._id || u.id;
                  const busy = instrBusyId === uid;
                  return (
                    <div key={uid} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-dark_border bg-gray-50/60 dark:bg-darkmode/40">
                      <div className="w-10 h-10 rounded-xl flex-shrink-0 bg-secondary/10 dark:bg-teal-900/30 flex items-center justify-center font-black text-secondary dark:text-teal-300">
                        {u.name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{u.name}</p>
                        <p className="text-[11px] text-darktext truncate">{u.email}</p>
                      </div>
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        {/* الإشعار بيتعرض بس للجروب الـ Active (اللي فيه حصص) */}
                        {group.status === "active" && (
                          <button disabled={!!instrBusyId} onClick={() => startAddWithNotify(u)}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition flex items-center justify-center gap-1">
                            {busy && <Loader2 size={11} className="animate-spin" />} {tx("إضافة + إشعار", "Add + notify")}
                          </button>
                        )}
                        <button disabled={!!instrBusyId} onClick={() => addInstructorOnly(u)}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-gray-100 dark:bg-dark_input text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-dark_border disabled:opacity-50 transition">
                          {tx("إضافة فقط", "Add only")}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ Add instructor: notification (نفس InstructorNotificationModal) ══ */}
      <InstructorNotificationModal
        isOpen={instrNotify.open}
        onClose={() => setInstrNotify({ open: false, instructors: [], groupData: null })}
        instructors={instrNotify.instructors}
        groupData={instrNotify.groupData}
        onSendNotifications={sendNotifyAndAdd}
      />

      {/* ══ Package management ══ */}
      {pkgStudent && (
        <StudentPackageModal
          student={pkgStudent}
          isRTL={isRTL}
          onClose={() => setPkgStudentId(null)}
          onChanged={() => load()}
        />
      )}
    </div>
  );
}