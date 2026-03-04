"use client";

import React, {
  useEffect, useState, useCallback, useMemo, useRef,
} from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/app/context/LocaleContext";
import StudentSidebar from "../StudentSidebar";
import StudentHeader from "../StudentHeader";
import {
  Bell, Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw,
  Search, Star, Award, Globe, MessageSquare, AlertCircle,
  ChevronDown, ChevronUp, Calendar, BookOpen, Wallet, BellOff,
  Trash2, X, Check,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────
interface MsgMeta {
  groupName?: string | null;
  groupCode?: string | null;
  sessionTitle?: string | null;
  attendanceStatus?: string | null;
  remainingHours?: number | null;
  alertType?: string | null;
}
interface Msg {
  _id: string;
  messageType: string;
  content: string;
  language: string;
  sentAt: string;
  label: { en: string; ar: string };
  icon: string;
  color: string;
  filterGroup: string;
  metadata: MsgMeta;
}
interface Stats {
  all: number; reminder: number; attendance: number;
  session: number; group: number; credit: number; system: number;
}

// ─── Color palette ──────────────────────────────────────────────────────────
// [gradientFrom, gradientTo, softBg, softBgDark, textColor, textColorDark, borderColor, borderColorDark, glowColor]
const PALETTE: Record<string, string[]> = {
  blue:    ["#3b82f6","#06b6d4", "rgba(59,130,246,.08)","rgba(59,130,246,.12)", "#1d4ed8","#93c5fd", "rgba(59,130,246,.2)","rgba(59,130,246,.25)", "rgba(59,130,246,.15)"],
  cyan:    ["#06b6d4","#0ea5e9", "rgba(6,182,212,.08)","rgba(6,182,212,.12)",  "#0e7490","#67e8f9",  "rgba(6,182,212,.2)","rgba(6,182,212,.25)",  "rgba(6,182,212,.15)"],
  red:     ["#ef4444","#f97316","rgba(239,68,68,.08)","rgba(239,68,68,.12)",   "#b91c1c","#fca5a5", "rgba(239,68,68,.2)","rgba(239,68,68,.25)",   "rgba(239,68,68,.15)"],
  amber:   ["#f59e0b","#f97316","rgba(245,158,11,.08)","rgba(245,158,11,.12)", "#92400e","#fcd34d", "rgba(245,158,11,.2)","rgba(245,158,11,.25)", "rgba(245,158,11,.15)"],
  green:   ["#10b981","#34d399","rgba(16,185,129,.08)","rgba(16,185,129,.12)", "#065f46","#6ee7b7", "rgba(16,185,129,.2)","rgba(16,185,129,.25)", "rgba(16,185,129,.15)"],
  purple:  ["#8b5cf6","#a78bfa","rgba(139,92,246,.08)","rgba(139,92,246,.12)", "#5b21b6","#c4b5fd", "rgba(139,92,246,.2)","rgba(139,92,246,.25)", "rgba(139,92,246,.15)"],
  primary: ["#8c52ff","#a855f7","rgba(140,82,255,.08)","rgba(140,82,255,.12)", "#5b21b6","#c084fc", "rgba(140,82,255,.2)","rgba(140,82,255,.25)", "rgba(140,82,255,.15)"],
  gray:    ["#94a3b8","#cbd5e1","rgba(148,163,184,.08)","rgba(148,163,184,.12)","#475569","#94a3b8","rgba(148,163,184,.2)","rgba(148,163,184,.25)","rgba(148,163,184,.1)"],
};

const ICON_EL: Record<string, React.ReactNode> = {
  clock:   <Clock   className="w-4 h-4" />,
  check:   <CheckCircle className="w-4 h-4" />,
  x:       <XCircle className="w-4 h-4" />,
  cancel:  <XCircle className="w-4 h-4" />,
  warning: <AlertTriangle className="w-4 h-4" />,
  refresh: <RefreshCw className="w-4 h-4" />,
  star:    <Star    className="w-4 h-4" />,
  award:   <Award   className="w-4 h-4" />,
  globe:   <Globe   className="w-4 h-4" />,
  msg:     <MessageSquare className="w-4 h-4" />,
  bell:    <Bell    className="w-4 h-4" />,
};

const TABS = [
  { key: "all",        en: "All",        ar: "الكل",     Icon: Bell },
  { key: "reminder",   en: "Reminders",  ar: "تذكيرات",  Icon: Clock },
  { key: "attendance", en: "Attendance", ar: "الحضور",   Icon: CheckCircle },
  { key: "session",    en: "Sessions",   ar: "الجلسات",  Icon: Calendar },
  { key: "group",      en: "Courses",    ar: "الدورات",  Icon: BookOpen },
  { key: "credit",     en: "Credit",     ar: "الرصيد",   Icon: Wallet },
  { key: "system",     en: "System",     ar: "النظام",   Icon: Globe },
];

const FILTER_GROUPS: Record<string, string[]> = {
  reminder:   ["session_reminder","session_reminder_student","reminder_24h_student","reminder_1h_student"],
  attendance: ["absence_notification","late_notification","excused_notification"],
  session:    ["session_cancelled","session_cancelled_student","session_postponed","session_postponed_student"],
  group:      ["group_welcome","group_welcome_student","welcome","group_completion","group_completion_student"],
  credit:     ["credit_alert","credit_exhausted"],
  system:     ["language_selection","language_confirmation","bilingual_language_selection","bilingual_language_confirmation","custom","other"],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(d: string, ar: boolean) {
  const diff = Date.now() - +new Date(d);
  const m = Math.floor(diff/60000), h = Math.floor(diff/3600000), days = Math.floor(diff/86400000);
  if (m < 1)   return ar ? "الآن"        : "Just now";
  if (m < 60)  return ar ? `${m} د`      : `${m}m ago`;
  if (h < 24)  return ar ? `${h} س`      : `${h}h ago`;
  if (days===1)return ar ? "أمس"         : "Yesterday";
  if (days < 7)return ar ? `${days} أيام`: `${days}d ago`;
  return new Date(d).toLocaleDateString(ar?"ar-EG":"en-US",{month:"short",day:"numeric"});
}
function fullDate(d: string, ar: boolean) {
  return new Date(d).toLocaleString(ar?"ar-EG":"en-US",{weekday:"short",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
}
function groupByDate(msgs: Msg[], ar: boolean) {
  const map = new Map<string,Msg[]>();
  const today = new Date(); today.setHours(0,0,0,0);
  const yest  = new Date(today); yest.setDate(today.getDate()-1);
  msgs.forEach(m => {
    const d = new Date(m.sentAt); d.setHours(0,0,0,0);
    const key = +d===+today ? (ar?"اليوم":"Today")
              : +d===+yest  ? (ar?"أمس":"Yesterday")
              : d.toLocaleDateString(ar?"ar-EG":"en-US",{weekday:"long",month:"long",day:"numeric"});
    if (!map.has(key)) map.set(key,[]);
    map.get(key)!.push(m);
  });
  return [...map.entries()].map(([label,items])=>({label,items}));
}

// ─── Message Card ────────────────────────────────────────────────────────────
const MsgCard = React.memo(({ msg, isRTL, onDelete, deleting, idx }: {
  msg: Msg; 
  isRTL: boolean; 
  onDelete: (id:string)=>void; 
  deleting: boolean; 
  idx: number;
}) => {
  const [expanded,    setExpanded]    = useState(false);
  const [confirmDel,  setConfirmDel]  = useState(false);
  const [hovered,     setHovered]     = useState(false);
  
  // ✅ التصحيح: في المتصفح setTimeout يعيد number
  const timerRef = useRef<number>(undefined);
  
  const p = PALETTE[msg.color] || PALETTE.gray;
  const icon = ICON_EL[msg.icon] || ICON_EL.bell;
  const label = isRTL ? msg.label.ar : msg.label.en;

  const paras = msg.content.split("\n").filter(Boolean);
  const needsMore = paras.length > 2 || msg.content.length > 180;

  const onDelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDel) { 
      clearTimeout(timerRef.current); 
      onDelete(msg._id); 
    }
    else { 
      setConfirmDel(true); 
      // ✅ استخدام window.setTimeout صراحة
      timerRef.current = window.setTimeout(() => setConfirmDel(false), 3000); 
    }
  };

  // staggered entrance delay
  const delay = `${Math.min(idx * 40, 300)}ms`;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); }}
      style={{
        animationDelay: delay,
        opacity: deleting ? 0 : 1,
        transform: deleting ? "scale(0.96) translateY(-4px)" : "scale(1) translateY(0)",
        transition: deleting
          ? "opacity 0.28s ease, transform 0.28s ease"
          : "box-shadow 0.2s ease, transform 0.18s ease, opacity 0.28s ease",
        boxShadow: hovered && !deleting
          ? `0 8px 30px -6px ${p[8]}, 0 2px 8px -2px rgba(0,0,0,.06)`
          : "0 1px 4px -1px rgba(0,0,0,.06)",
        pointerEvents: deleting ? "none" : "auto",
      }}
      className="relative rounded-2xl overflow-hidden bg-white dark:bg-[#161b22] border border-gray-100/80 dark:border-[#30363d] animate-fadeInUp"
    >
      {/* ── Gradient top bar ── */}
      <div
        style={{ background: `linear-gradient(90deg, ${p[0]}, ${p[1]})`, height: "3px" }}
      />

      <div className="p-4 sm:p-5">
        {/* ── Row 1: icon + label + time + delete ── */}
        <div className="flex items-start gap-3">

          {/* Icon bubble */}
          <div
            style={{
              background: `linear-gradient(135deg, ${p[0]}, ${p[1]})`,
              boxShadow: `0 4px 12px -2px ${p[8]}`,
            }}
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-white"
          >
            {icon}
          </div>

          {/* Middle block */}
          <div className="flex-1 min-w-0">
            {/* label pill + group chip */}
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span
                style={{
                  background: `linear-gradient(135deg, ${p[0]}22, ${p[1]}22)`,
                  color: p[4],
                  border: `1px solid ${p[6]}`,
                }}
                className="dark:hidden text-[11px] font-bold px-2.5 py-0.5 rounded-full"
              >
                {label}
              </span>
              <span
                style={{
                  background: `linear-gradient(135deg, ${p[0]}30, ${p[1]}30)`,
                  color: p[5],
                  border: `1px solid ${p[7]}`,
                }}
                className="hidden dark:inline text-[11px] font-bold px-2.5 py-0.5 rounded-full"
              >
                {label}
              </span>

              {msg.metadata.groupName && (
                <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 dark:text-[#6e7681] bg-gray-50 dark:bg-[#21262d] px-2 py-0.5 rounded-full border border-gray-100 dark:border-[#30363d]">
                  <BookOpen className="w-2.5 h-2.5" />
                  {msg.metadata.groupName}
                  {msg.metadata.groupCode && <span className="opacity-60">· {msg.metadata.groupCode}</span>}
                </span>
              )}

              {msg.metadata.remainingHours != null && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20">
                  <Wallet className="w-2.5 h-2.5" />
                  {isRTL ? `${msg.metadata.remainingHours}س متبقية` : `${msg.metadata.remainingHours}h left`}
                </span>
              )}
            </div>

            {/* Session title chip */}
            {msg.metadata.sessionTitle && (
              <div className="flex items-center gap-1.5 mb-2">
                <Calendar className="w-3 h-3 text-gray-400 dark:text-[#6e7681] flex-shrink-0" />
                <span className="text-[12px] text-gray-500 dark:text-[#8b949e] truncate">
                  {msg.metadata.sessionTitle}
                </span>
              </div>
            )}
          </div>

          {/* Right: time + delete */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <span className="text-[11px] text-gray-400 dark:text-[#484f58] whitespace-nowrap font-medium">
              {timeAgo(msg.sentAt, isRTL)}
            </span>

            <button
              onClick={onDelClick}
              title={confirmDel ? (isRTL?"اضغط للتأكيد":"Confirm delete") : (isRTL?"حذف":"Delete")}
              style={confirmDel ? { background: "linear-gradient(135deg,#ef4444,#f97316)" } : {}}
              className={`
                flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold
                transition-all duration-200
                ${confirmDel
                  ? "text-white shadow-md scale-105"
                  : "opacity-0 group-hover:opacity-100 bg-gray-50 dark:bg-[#21262d] text-gray-400 dark:text-[#6e7681] hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 border border-gray-100 dark:border-[#30363d] hover:border-red-200 dark:hover:border-red-500/30"
                }
                ${hovered && !confirmDel ? "opacity-100" : ""}
              `}
            >
              {confirmDel
                ? <><Check className="w-3 h-3" />{isRTL?"تأكيد؟":"Sure?"}</>
                : <Trash2 className="w-3.5 h-3.5" />
              }
            </button>
          </div>
        </div>

        {/* ── Message body ── */}
        <div className="mt-3">
          <p
            className={`text-[13.5px] leading-[1.75] text-gray-700 dark:text-[#c9d1d9] whitespace-pre-line ${!expanded ? "line-clamp-3" : ""}`}
          >
            {msg.content}
          </p>

          {needsMore && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="mt-2 flex items-center gap-1 text-[12px] font-semibold transition-colors"
              style={{ color: p[0] }}
            >
              {expanded
                ? <><ChevronUp className="w-3 h-3" />{isRTL?"عرض أقل":"Show less"}</>
                : <><ChevronDown className="w-3 h-3" />{isRTL?"اقرأ المزيد":"Read more"}</>
              }
            </button>
          )}
        </div>

        {/* ── Footer: full date ── */}
        <div className="mt-3 pt-3 border-t border-gray-50 dark:border-[#21262d] flex items-center justify-between">
          <span className="text-[11px] text-gray-300 dark:text-[#484f58]">
            {fullDate(msg.sentAt, isRTL)}
          </span>
          <div
            style={{ background: `linear-gradient(90deg, ${p[0]}40, ${p[1]}40)` }}
            className="h-px flex-1 mx-3 rounded-full"
          />
          <span
            style={{ color: p[0] }}
            className="text-[10px] font-bold uppercase tracking-wider opacity-60"
          >
            {msg.filterGroup}
          </span>
        </div>
      </div>
    </div>
  );
});
MsgCard.displayName = "MsgCard";

// ─── Skeleton loader ─────────────────────────────────────────────────────────
const SkeletonCard = ({ idx }: { idx: number }) => (
  <div
    className="rounded-2xl bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] overflow-hidden animate-pulse"
    style={{ animationDelay: `${idx * 80}ms` }}
  >
    <div className="h-[3px] bg-gradient-to-r from-gray-200 to-gray-100 dark:from-[#21262d] dark:to-[#30363d]" />
    <div className="p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-[#21262d] flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <div className="h-5 w-20 bg-gray-100 dark:bg-[#21262d] rounded-full" />
            <div className="h-5 w-28 bg-gray-50 dark:bg-[#1c2128] rounded-full" />
          </div>
          <div className="h-3.5 w-3/4 bg-gray-100 dark:bg-[#21262d] rounded-full" />
          <div className="h-3.5 w-1/2 bg-gray-50 dark:bg-[#1c2128] rounded-full" />
        </div>
        <div className="h-4 w-10 bg-gray-100 dark:bg-[#21262d] rounded-full" />
      </div>
      <div className="h-px bg-gray-50 dark:bg-[#21262d]" />
      <div className="h-3 w-1/3 bg-gray-50 dark:bg-[#1c2128] rounded-full" />
    </div>
  </div>
);

// ═══════════════ MAIN PAGE ═══════════════════════════════════════════════════
export default function MessagesPage() {
  const { locale } = useLocale();
  const isRTL = locale === "ar";
  const router = useRouter();

  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError]             = useState("");
  const [user, setUser]               = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [allMsgs, setAllMsgs]         = useState<Msg[]>([]);
  const [stats, setStats]             = useState<Stats | null>(null);
  const [fetching, setFetching]       = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch]           = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [page, setPage]               = useState(1);
  
  // ✅ التصحيح هنا أيضاً
  const debRef = useRef<number>(undefined);
  const PAGE_SIZE = 25;

  // ── Fetch ──
  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setPageLoading(true); else setFetching(true);
    try {
      if (!user) {
        const d = await fetch("/api/student/dashboard", { credentials: "include" });
        const dj = await d.json();
        if (dj.success) { setUser(dj.data.user); setNotifications(dj.data.notifications||[]); }
      }
      const res  = await fetch("/api/student/messages?filter=all&page=1&limit=200", { credentials: "include" });
      const json = await res.json();
      if (json.success) { setAllMsgs(json.data.messages||[]); setStats(json.data.stats||null); }
      else setError(json.message||"Failed");
    } catch (e: any) { setError(e.message); }
    finally { setPageLoading(false); setFetching(false); }
  }, [user]);

  useEffect(() => { fetchAll(); }, []);

  // ── Debounced search ──
  const onSearchInput = (v: string) => {
    setSearchInput(v);
    clearTimeout(debRef.current);
    // ✅ استخدام window.setTimeout
    debRef.current = window.setTimeout(() => { setSearch(v); setPage(1); }, 220);
  };
  const clearSearch = () => { setSearchInput(""); setSearch(""); setPage(1); };

  // ── Filter ──
  const filtered = useMemo(() => {
    let msgs = allMsgs;
    if (activeFilter !== "all") {
      const allowed = FILTER_GROUPS[activeFilter] || [];
      msgs = msgs.filter(m => allowed.includes(m.messageType));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      msgs = msgs.filter(m =>
        m.content.toLowerCase().includes(q) ||
        m.metadata.groupName?.toLowerCase().includes(q) ||
        m.metadata.sessionTitle?.toLowerCase().includes(q) ||
        m.label.ar.includes(q) || m.label.en.toLowerCase().includes(q)
      );
    }
    return msgs;
  }, [allMsgs, activeFilter, search]);

  const paginated   = filtered.slice(0, page * PAGE_SIZE);
  const showMore    = paginated.length < filtered.length;
  const grouped     = useMemo(() => groupByDate(paginated, isRTL), [paginated, isRTL]);

  // ── Delete ──
  const handleDelete = useCallback(async (id: string) => {
    setDeletingIds(prev => new Set([...prev, id]));
    try {
      await fetch("/api/student/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "delete", id }),
      });
    } catch (e) { console.error(e); }
    
    // ✅ استخدام window.setTimeout
    window.setTimeout(() => {
      setAllMsgs(prev => prev.filter(m => m._id !== id));
      setStats(prev => prev ? { ...prev, all: Math.max(0, prev.all-1) } : prev);
      setDeletingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }, 320);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("token");
    router.push("/");
  };

  // ── Loading screen ──
  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0d1117] flex items-center justify-center" dir={isRTL?"rtl":"ltr"}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center shadow-xl mb-4 animate-pulse"
            style={{ background: "linear-gradient(135deg,#8c52ff,#06b6d4)", boxShadow: "0 16px 40px -8px rgba(140,82,255,.4)" }}>
            <Bell className="w-8 h-8 text-white" />
          </div>
          <p className="text-sm text-gray-400 dark:text-[#6e7681]">
            {isRTL ? "جارٍ تحميل الرسائل..." : "Loading messages..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0d1117] flex relative" dir={isRTL?"rtl":"ltr"}>

      {/* ── Mobile sidebar backdrop ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <div className={`fixed lg:static inset-y-0 ${isRTL?"right-0":"left-0"} z-50 transform transition-all duration-500 ${
        sidebarOpen ? "translate-x-0" : (isRTL?"translate-x-full":"-translate-x-full") + " lg:translate-x-0"
      } flex-shrink-0`}>
        <StudentSidebar user={user} onLogout={handleLogout} />
      </div>

      {/* ── Main ── */}
      <main className="flex-1 min-w-0 flex flex-col">
        <StudentHeader
          user={user || { _id:"", name:"", email:"", role:"student" }}
          notifications={notifications}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          onRefresh={() => fetchAll(true)}
        />

        {/* ── Hero bar ── */}
        <div
          style={{ background: "linear-gradient(135deg, rgba(140,82,255,.06) 0%, rgba(6,182,212,.04) 100%)" }}
          className="border-b border-gray-100 dark:border-[#21262d] px-4 sm:px-6 lg:px-8 py-5"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#8c52ff,#06b6d4)", boxShadow: "0 8px 20px -4px rgba(140,82,255,.35)" }}
              >
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-[#e6edf3] leading-tight">
                  {isRTL ? "الرسائل والإشعارات" : "Messages & Notifications"}
                  {stats && (
                    <span className="ms-2 text-sm font-medium text-gray-400 dark:text-[#6e7681]">
                      ({stats.all})
                    </span>
                  )}
                </h1>
                <p className="text-[12px] text-gray-400 dark:text-[#6e7681] mt-0.5">
                  {isRTL ? "كل الإشعارات المرسلة إليك عبر واتساب" : "All WhatsApp notifications sent to you"}
                </p>
              </div>
            </div>

            <button
              onClick={() => fetchAll(true)}
              disabled={fetching}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium border transition-all duration-200 bg-white dark:bg-[#161b22] border-gray-200 dark:border-[#30363d] text-gray-600 dark:text-[#8b949e] hover:border-primary/40 hover:text-primary disabled:opacity-50 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{isRTL ? "تحديث" : "Refresh"}</span>
            </button>
          </div>

          {/* ── Search bar ── */}
          <div className="mt-4 relative">
            <Search className={`absolute ${isRTL?"right-4":"left-4"} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none`} />
            <input
              type="text"
              value={searchInput}
              onChange={e => onSearchInput(e.target.value)}
              placeholder={isRTL ? "ابحث في الرسائل..." : "Search messages..."}
              className={`w-full ${isRTL?"pr-11 pl-11":"pl-11 pr-11"} py-3 rounded-2xl text-[13.5px] bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] text-gray-900 dark:text-[#e6edf3] placeholder:text-gray-400 dark:placeholder:text-[#6e7681] focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary dark:focus:border-primary transition-all shadow-sm`}
            />
            {searchInput && (
              <button
                onClick={clearSearch}
                className={`absolute ${isRTL?"left-3.5":"right-3.5"} top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-100 dark:bg-[#30363d] rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[#3d444d] transition-colors`}
              >
                <X className="w-3 h-3 text-gray-500 dark:text-[#8b949e]" />
              </button>
            )}
          </div>

          {/* ── Filter tabs ── */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {TABS.map(tab => {
              const count = stats ? (stats[tab.key as keyof Stats] ?? 0) : 0;
              const active = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setActiveFilter(tab.key); setPage(1); }}
                  style={active ? { background: "linear-gradient(135deg,#8c52ff,#7c3aed)", boxShadow: "0 4px 14px -3px rgba(140,82,255,.35)" } : {}}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12.5px] font-medium transition-all duration-200 whitespace-nowrap
                    ${active
                      ? "text-white border border-transparent"
                      : "bg-white dark:bg-[#161b22] text-gray-500 dark:text-[#6e7681] border border-gray-200 dark:border-[#30363d] hover:border-primary/40 hover:text-primary dark:hover:text-primary"
                    }`}
                >
                  <tab.Icon className="w-3.5 h-3.5" />
                  {isRTL ? tab.ar : tab.en}
                  {count > 0 && (
                    <span className={`text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full inline-flex items-center justify-center
                      ${active ? "bg-white/25 text-white" : "bg-gray-100 dark:bg-[#21262d] text-gray-500 dark:text-[#6e7681]"}`}>
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Content area ── */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6">

          {/* Search result bar */}
          {search && (
            <div className="flex items-center justify-between mb-4 px-1">
              <span className="text-[13px] text-gray-500 dark:text-[#8b949e]">
                {isRTL
                  ? `${filtered.length} نتيجة لـ "${search}"`
                  : `${filtered.length} result${filtered.length!==1?"s":""} for "${search}"`}
              </span>
              <button onClick={clearSearch} className="text-[13px] font-semibold text-primary hover:underline">
                {isRTL ? "مسح" : "Clear"}
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 p-4 mb-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Skeleton while loading more */}
          {fetching && allMsgs.length === 0 && (
            <div className="space-y-3">
              {[0,1,2,3].map(i => <SkeletonCard key={i} idx={i} />)}
            </div>
          )}

          {/* Empty state */}
          {!fetching && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div
                className="w-24 h-24 rounded-3xl flex items-center justify-center mb-5"
                style={{ background: "linear-gradient(135deg,rgba(140,82,255,.08),rgba(6,182,212,.08))", border: "1px solid rgba(140,82,255,.12)" }}
              >
                {search
                  ? <Search className="w-10 h-10 text-primary/30" />
                  : <BellOff className="w-10 h-10 text-primary/30" />
                }
              </div>
              <h3 className="text-[16px] font-bold text-gray-800 dark:text-[#e6edf3] mb-1.5">
                {search ? (isRTL?"لا توجد نتائج":"No results found") : (isRTL?"لا توجد رسائل بعد":"No messages yet")}
              </h3>
              <p className="text-[13px] text-gray-400 dark:text-[#6e7681] max-w-xs">
                {search
                  ? (isRTL?"جرب كلمة بحث مختلفة":"Try a different search keyword")
                  : (isRTL?"ستظهر إشعاراتك هنا فور إرسالها":"Your notifications will appear here once sent")}
              </p>
            </div>
          )}

          {/* Grouped messages */}
          {grouped.length > 0 && (
            <div className="space-y-8">
              {grouped.map(group => (
                <div key={group.label}>

                  {/* Date header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-[#30363d] to-transparent" />
                    <span className="text-[11px] font-bold text-gray-400 dark:text-[#484f58] uppercase tracking-widest px-3 py-1 bg-gray-50 dark:bg-[#0d1117] rounded-full border border-gray-100 dark:border-[#21262d] whitespace-nowrap">
                      {group.label}
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-[#30363d] to-transparent" />
                  </div>

                  {/* Cards */}
                  <div className="space-y-3 group">
                    {group.items.map((msg, i) => (
                      <MsgCard
                        key={msg._id}
                        msg={msg}
                        isRTL={isRTL}
                        onDelete={handleDelete}
                        deleting={deletingIds.has(msg._id)}
                        idx={i}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Load more */}
              {showMore && (
                <div className="flex flex-col items-center gap-2 pt-2 pb-6">
                  <button
                    onClick={() => setPage(p => p+1)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[13px] font-semibold border transition-all duration-200 bg-white dark:bg-[#161b22] border-gray-200 dark:border-[#30363d] text-gray-600 dark:text-[#8b949e] hover:border-primary/50 hover:text-primary shadow-sm hover:shadow-md"
                  >
                    <ChevronDown className="w-4 h-4" />
                    {isRTL
                      ? `تحميل ${Math.min(PAGE_SIZE, filtered.length - paginated.length)} رسالة أخرى`
                      : `Load ${Math.min(PAGE_SIZE, filtered.length - paginated.length)} more`}
                  </button>
                  <span className="text-[11px] text-gray-300 dark:text-[#484f58]">
                    {isRTL ? `${paginated.length} من ${filtered.length}` : `${paginated.length} of ${filtered.length}`}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display:none; }
        .no-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }

        @keyframes fadeInUp {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.35s ease both;
        }
      `}</style>
    </div>
  );
}