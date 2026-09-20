// components/admin/MakeupSessionForm.jsx
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  X, Search, User, Users, BookOpen, Calendar, Clock,
  CheckCircle, AlertCircle, Loader2, ChevronRight, ChevronLeft,
  Gift, UserCheck, MapPin, Globe,
  Link2, Layers, Check, ChevronDown, ChevronUp,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { useI18n } from "@/i18n/I18nProvider";
import MapLocationPicker from "./MapLocationPicker";
import MakeupLinksPicker from "./MakeupLinksPicker";

// ─── Constants ────────────────────────────────────────────────────────────────
const STEPS = [
  { id: "student",    icon: User,         titleAr: "اختيار الطالب",       titleEn: "Select Student" },
  { id: "group",      icon: Users,        titleAr: "اختيار الجروب",       titleEn: "Select Group" },
  { id: "session",    icon: BookOpen,     titleAr: "اختيار السيشن",       titleEn: "Select Session" },
  { id: "instructor", icon: UserCheck,    titleAr: "اختيار المدرس",       titleEn: "Select Instructor" },
  { id: "details",    icon: Calendar,     titleAr: "تفاصيل الحصة",        titleEn: "Session Details" },
  { id: "link",       icon: Link2,        titleAr: "اختيار اللينك",       titleEn: "Select Link" },
  { id: "review",     icon: CheckCircle,  titleAr: "مراجعة وتأكيد",       titleEn: "Review & Confirm" },
];

// الرسائل الـ 3 اللي بتتبعت بعد الإنشاء (بنفس مفاتيح results اللي راجعة من الـ API)
const NOTIFY_ROLES = [
  { key: "student",    ar: "الطالب",    en: "Student" },
  { key: "guardian",   ar: "ولي الأمر", en: "Guardian" },
  { key: "instructor", ar: "المدرس",    en: "Instructor" },
];

const inputCls =
  "w-full px-3.5 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary dark:bg-dark_input dark:text-white placeholder:text-gray-400 dark:placeholder:text-darksubtle text-sm transition-all shadow-sm";

const labelCls =
  "block text-13 font-semibold text-MidnightNavyText dark:text-white mb-1.5";

const cardCls =
  "rounded-2xl border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-darklight shadow-sm";

const pickerRowCls = (isSelected) =>
  `group relative w-full flex items-start gap-3 p-3.5 rounded-2xl border text-start transition-all duration-200 ${
    isSelected
      ? "border-primary/40 bg-gradient-to-br from-primary/[0.06] to-orange-deep/[0.04] dark:from-primary/15 dark:to-orange-deep/10 ring-1 ring-primary/15"
      : "border-PowderBlueBorder dark:border-dark_border hover:border-primary/25 hover:bg-gray-50/80 dark:hover:bg-dark_input"
  }`;

const pickerIconWrapCls = (isSelected) =>
  `w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
    isSelected
      ? "bg-gradient-to-br from-primary to-orange-deep shadow-sm shadow-primary/30"
      : "bg-primary/10 dark:bg-primary/15 group-hover:bg-primary/15"
  }`;

const STATUS_META = {
  completed:  { ar: "مكتملة",  en: "Completed",  cls: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20" },
  scheduled:  { ar: "مجدولة",  en: "Scheduled",  cls: "bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/20" },
  cancelled:  { ar: "ملغية",   en: "Cancelled",  cls: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20" },
  postponed:  { ar: "مؤجلة",   en: "Postponed",  cls: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20" },
};

const ATTENDANCE_META = {
  present: { ar: "حاضر",  en: "Present", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" },
  absent:  { ar: "غائب",  en: "Absent",  cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" },
  late:    { ar: "متأخر", en: "Late",    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" },
  excused: { ar: "بعذر",  en: "Excused", cls: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" },
};

// ─── Radial progress ──────────────────────────────────────────────────────────
function RadialProgress({ percent, size = 96, stroke = 9, label, sub, gradientId = "makeupRadialGrad" }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, percent)) / 100) * c;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" className="text-primary [stop-color:currentColor]" />
            <stop offset="100%" className="text-orange-deep [stop-color:currentColor]" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-gray-100 dark:stroke-dark_input" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          stroke={`url(#${gradientId})`} strokeDasharray={c} strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {label !== "" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-MidnightNavyText dark:text-white leading-none">{label}</span>
          {sub && <span className="text-[10px] text-SlateBlueText dark:text-darktext mt-1">{sub}</span>}
        </div>
      )}
    </div>
  );
}

// ─── Timeline row ─────────────────────────────────────────────────────────────
function TimelineRow({ icon: Icon, label, value, done, isLast }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${done ? "bg-emerald-500 text-white" : "bg-gray-100 dark:bg-dark_input text-gray-300 dark:text-darkmuted"}`}>
          {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3 h-3" />}
        </span>
        {!isLast && <span className={`w-px flex-1 min-h-[18px] mt-1 ${done ? "bg-emerald-200 dark:bg-emerald-500/30" : "bg-gray-100 dark:bg-dark_input"}`} />}
      </div>
      <div className="pb-4 min-w-0">
        <p className="text-[11px] text-SlateBlueText dark:text-darktext">{label}</p>
        <p className={`text-xs font-semibold truncate ${done ? "text-MidnightNavyText dark:text-white" : "text-gray-300 dark:text-darkmuted"}`}>{value || "—"}</p>
      </div>
    </div>
  );
}

// ─── Summary panel ────────────────────────────────────────────────────────────
function SummaryPanel({ student, group, session, instructor, details, selectedLinkIds, step, isAr }) {
  const t = (ar, en) => (isAr ? ar : en);

  const rows = [
    { icon: User,        label: t("الطالب", "Student"),        value: student?.name,      done: !!student },
    { icon: Users,       label: t("الجروب الأصلي", "Original Group"), value: group?.name,  done: !!group },
    { icon: BookOpen,    label: t("السيشن", "Session"),        value: session?.title,     done: !!session },
    { icon: UserCheck,   label: t("المدرس", "Instructor"),     value: instructor?.name,   done: !!instructor },
    {
      icon: Calendar,
      label: t("الميعاد", "Schedule"),
      value: details.scheduledDate
        ? `${new Date(details.scheduledDate).toLocaleDateString(isAr ? "ar-EG" : "en-US", { month: "short", day: "numeric" })} · ${details.startTime}-${details.endTime}`
        : "",
      done: !!(details.scheduledDate && details.startTime && details.endTime),
    },
    {
      icon: details.deliveryMode === "offline" ? MapPin : Globe,
      label: t("النوع", "Mode"),
      value: details.deliveryMode === "offline" ? t("أوفلاين", "Offline") : t("أونلاين", "Online"),
      done: step >= 4,
    },
    ...(details.deliveryMode === "online"
      ? [{
          icon: Link2,
          label: t("اللينك", "Link"),
          value: selectedLinkIds?.length > 0 ? `${selectedLinkIds.length} ${t("مختار", "selected")}` : "",
          done: step >= 5 && selectedLinkIds?.length > 0,
        }]
      : []),
  ];

  const doneCount = rows.filter((r) => r.done).length;
  const percent = Math.round((doneCount / rows.length) * 100);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-gradient-to-br from-IcyBreeze to-PaleCyan dark:from-primary/10 dark:to-orange-deep/10 border border-primary/15">
        <RadialProgress percent={percent} size={64} stroke={6} label={`${doneCount}/${rows.length}`} />
        <div>
          <p className="text-sm font-bold text-MidnightNavyText dark:text-white">{t("ملخص الحصة", "Session Summary")}</p>
          <p className="text-[11px] text-SlateBlueText dark:text-darktext">
            {percent === 100 ? t("كل حاجة جاهزة للمراجعة", "Everything's ready to review") : t("بيتبني أول ما تختار", "Fills in as you choose")}
          </p>
        </div>
      </div>

      <div className="mt-5 flex-1">
        {rows.map((r, i) => (
          <TimelineRow key={`${r.label}-${i}`} {...r} isLast={i === rows.length - 1} />
        ))}
      </div>
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionHeading({ icon: Icon, title, badge, badgeTone = "primary" }) {
  const toneCls = badgeTone === "primary" ? "bg-primary/10 text-primary" : "bg-gray-100 dark:bg-dark_input text-SlateBlueText dark:text-darktext";
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {Icon && (
          <span className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-primary" />
          </span>
        )}
        <h4 className="text-sm font-semibold text-MidnightNavyText dark:text-white">{title}</h4>
      </div>
      {badge != null && <span className={`text-xs px-2 py-1 rounded-full font-medium ${toneCls}`}>{badge}</span>}
    </div>
  );
}

// ─── Student Search ───────────────────────────────────────────────────────────
function StudentSearch({ onSelect, isAr }) {
  const [query, setQuery] = useState("");
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const timeoutRef = useRef(null);
  const t = (ar, en) => (isAr ? ar : en);

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/makeup-session")
      .then((r) => r.json())
      .then((json) => { if (json.success) setAllStudents(json.data || []); })
      .catch(() => toast.error(t("فشل تحميل الطلاب", "Failed to load students")))
      .finally(() => setLoading(false));
  }, [isAr]);

  const doSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) { setSearchLoading(false); return; }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/admin/makeup-session?search=${encodeURIComponent(q.trim())}`);
      const json = await res.json();
      if (json.success) setAllStudents(json.data || []);
    } catch { toast.error(t("فشل البحث", "Search failed")); }
    finally { setSearchLoading(false); }
  }, [isAr]);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => doSearch(v), 400);
  };

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const filtered = useMemo(() => {
    if (!query || query.trim().length < 2) return allStudents;
    const q = query.trim().toLowerCase();
    return allStudents.filter((s) => {
      const name = (s.name || "").toLowerCase();
      const enrollment = (s.enrollmentNumber || "").toLowerCase();
      const phone = (s.phone || "").toLowerCase();
      const whatsapp = (s.whatsappNumber || "").toLowerCase();
      return name.includes(q) || enrollment.includes(q) || phone.includes(q) || whatsapp.includes(q);
    });
  }, [query, allStudents]);

  const isLoading = loading || searchLoading;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-gray-400" />
        <input type="text" value={query} onChange={handleChange} placeholder={t("ابحث أو اختر من القائمة...", "Search or pick from list...")} className={`${inputCls} ps-9`} autoFocus />
        {isLoading && <Loader2 className="absolute top-1/2 -translate-y-1/2 end-3 w-4 h-4 text-primary animate-spin" />}
      </div>

      {!isLoading && filtered.length > 0 && (
        <div className="flex items-center justify-between px-1 text-[11px] text-SlateBlueText dark:text-darktext">
          <span>{query.trim().length >= 2 ? t("نتائج البحث", "Search results") : t("كل الطلاب", "All students")}</span>
          <span className="font-semibold tabular-nums">{filtered.length}</span>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="max-h-80 overflow-y-auto space-y-2 custom-scrollbar pe-0.5">
          {filtered.map((s) => (
            <button key={s._id} type="button" onClick={() => onSelect(s)}
              className="group w-full flex items-center gap-3 p-3 rounded-xl border border-PowderBlueBorder dark:border-dark_border hover:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all text-start">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center flex-shrink-0 group-hover:from-primary group-hover:to-orange-deep transition-all duration-200">
                <User className="w-4 h-4 text-primary group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-MidnightNavyText dark:text-white truncate">{s.name}</p>
                <p className="text-xs text-SlateBlueText dark:text-darktext truncate">
                  {s.enrollmentNumber || "—"}{s.phone ? ` · ${s.phone}` : ""}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:rotate-180 transition-all flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && query.trim().length >= 2 && (
        <div className="text-center py-10">
          <div className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-dark_input flex items-center justify-center mx-auto mb-3">
            <Search className="w-4.5 h-4.5 text-gray-300 dark:text-darkmuted" />
          </div>
          <p className="text-xs text-SlateBlueText dark:text-darktext">{t("لا نتائج مطابقة", "No matching results")}</p>
        </div>
      )}

      {!isLoading && allStudents.length === 0 && !query && (
        <div className="text-center py-10">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-4.5 h-4.5 text-amber-500" />
          </div>
          <p className="text-xs text-SlateBlueText dark:text-darktext">{t("مفيش طلاب مسجلين في النظام", "No students registered in the system")}</p>
        </div>
      )}
    </div>
  );
}

// ─── Empty & Loading states ───────────────────────────────────────────────────
function EmptyState({ icon: Icon, message }) {
  return (
    <div className="text-center py-10 px-4">
      <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-5 h-5 text-amber-500" />
      </div>
      <p className="text-sm text-SlateBlueText dark:text-darktext max-w-xs mx-auto">{message}</p>
    </div>
  );
}

function LoadingRows({ message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-10 text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin text-primary" />
      <span className="text-xs">{message}</span>
    </div>
  );
}

// ─── Group Picker ─────────────────────────────────────────────────────────────
function GroupPicker({ student, groups, loading, selected, onSelect, isAr }) {
  const t = (ar, en) => (isAr ? ar : en);
  if (loading) return <LoadingRows message={t("جاري تحميل الجروبات...", "Loading groups...")} />;
  if (!groups.length) return <EmptyState icon={AlertCircle} message={t("الطالب ده مش مسجل في أي جروب نشط", "This student is not enrolled in any active group")} />;

  return (
    <div className="space-y-2">
      {groups.map((g) => {
        const isSelected = selected?._id === g._id;
        return (
          <button key={g._id} type="button" onClick={() => onSelect(g)} className={pickerRowCls(isSelected)}>
            <div className={pickerIconWrapCls(isSelected)}>
              <Users className={`w-4 h-4 ${isSelected ? "text-white" : "text-primary"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-MidnightNavyText dark:text-white">{g.name}</p>
              <p className="text-xs text-SlateBlueText dark:text-darktext mt-0.5">{g.course?.title || "—"} · {g.code}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {g.deliveryMode === "offline" ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 font-medium flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" />{t("أوفلاين", "Offline")}
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300 font-medium flex items-center gap-1">
                    <Globe className="w-2.5 h-2.5" />{t("أونلاين", "Online")}
                  </span>
                )}
                {g.instructors?.length > 0 && (
                  <span className="text-[10px] text-SlateBlueText dark:text-darktext">{g.instructors.map((i) => i.name).join("، ")}</span>
                )}
              </div>
            </div>
            {isSelected && (
              <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-white" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Session Picker ───────────────────────────────────────────────────────────
function SessionPicker({ sessions, loading, selected, onSelect, studentId, isAr }) {
  const t = (ar, en) => (isAr ? ar : en);
  if (loading) return <LoadingRows message={t("جاري تحميل السيشنز...", "Loading sessions...")} />;
  if (!sessions.length) return <EmptyState icon={AlertCircle} message={t("مفيش سيشنز في الجروب ده", "No sessions in this group")} />;

  return (
    <div className="space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar pe-0.5">
      {sessions.map((s) => {
        const statusMeta = STATUS_META[s.status] || STATUS_META.scheduled;
        const studentAttStatus = (s.studentAttendanceStatuses || []).find((a) => String(a.studentId) === String(studentId))?.status;
        const attMeta = studentAttStatus ? ATTENDANCE_META[studentAttStatus] : null;
        const isSelected = selected?._id === s._id;

        return (
          <button key={s._id} type="button" onClick={() => onSelect(s)} className={pickerRowCls(isSelected)}>
            <div className={pickerIconWrapCls(isSelected)}>
              <BookOpen className={`w-4 h-4 ${isSelected ? "text-white" : "text-primary"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-MidnightNavyText dark:text-white truncate">{s.title}</p>
              <p className="text-xs text-SlateBlueText dark:text-darktext mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>{new Date(s.scheduledDate).toLocaleDateString(isAr ? "ar-EG" : "en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</span>
                <span className="text-gray-300 dark:text-darkmuted">·</span>
                <span>{s.startTime} - {s.endTime}</span>
              </p>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ring-1 ring-inset ${statusMeta.cls}`}>
                  {isAr ? statusMeta.ar : statusMeta.en}
                </span>
                {attMeta && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${attMeta.cls}`}>
                    {t("الطالب:", "Student:")} {isAr ? attMeta.ar : attMeta.en}
                  </span>
                )}
                <span className="text-[10px] text-SlateBlueText dark:text-darktext">
                  {t("موديول", "Module")} {s.moduleIndex + 1} · {t("سيشن", "S")}{s.sessionNumber}
                </span>
              </div>
            </div>
            {isSelected && (
              <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-white" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Instructor Picker ────────────────────────────────────────────────────────
function InstructorPicker({ instructors, selected, onSelect, isAr }) {
  const t = (ar, en) => (isAr ? ar : en);
  if (!instructors.length) return <EmptyState icon={AlertCircle} message={t("مفيش مدرسين مسجلين في الجروب ده", "No instructors in this group")} />;

  return (
    <div className="space-y-2">
      {instructors.map((i) => {
        const isSelected = String(selected?._id) === String(i._id);
        return (
          <button key={i._id} type="button" onClick={() => onSelect(i)} className={pickerRowCls(isSelected)}>
            <div className={pickerIconWrapCls(isSelected)}>
              <UserCheck className={`w-4 h-4 ${isSelected ? "text-white" : "text-primary"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-MidnightNavyText dark:text-white">{i.name}</p>
              <p className="text-xs text-SlateBlueText dark:text-darktext truncate">{i.email || "—"}</p>
            </div>
            {isSelected && (
              <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-white" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Details Form ─────────────────────────────────────────────────────────────
function DetailsForm({ form, onChange, isAr }) {
  const t = (ar, en) => (isAr ? ar : en);

  return (
    <div className="space-y-5">
      <div>
        <label className={labelCls}>{t("اسم الجروب الجديد", "New Group Name")} *</label>
        <input type="text" value={form.newGroupName} onChange={(e) => onChange("newGroupName", e.target.value)}
          placeholder={t("مثال: حصة تعويضية - أحمد - 25 سبتمبر", "e.g. Make-up - Ahmed - Sep 25")} className={inputCls} />
        <p className="text-[11px] text-SlateBlueText dark:text-darktext mt-1.5">
          {t("لازم يكون اسم مختلف عن أي جروب موجود", "Must be different from any existing group")}
        </p>
      </div>

      <div className="rounded-2xl border border-PowderBlueBorder dark:border-dark_border p-3.5 space-y-3.5 bg-gray-50/50 dark:bg-dark_input/30">
        <div className="flex items-center gap-2 text-xs font-semibold text-SlateBlueText dark:text-darktext">
          <Clock className="w-3.5 h-3.5 text-primary" />{t("الميعاد", "Schedule")}
        </div>
        <div>
          <label className={labelCls}>{t("تاريخ الحصة", "Session Date")} *</label>
          <input type="date" value={form.scheduledDate} onChange={(e) => onChange("scheduledDate", e.target.value)}
            min={new Date().toISOString().split("T")[0]} className={`${inputCls} bg-white dark:bg-dark_input`} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t("من", "From")} *</label>
            <input type="time" value={form.startTime} onChange={(e) => onChange("startTime", e.target.value)} className={`${inputCls} bg-white dark:bg-dark_input`} />
          </div>
          <div>
            <label className={labelCls}>{t("إلى", "To")} *</label>
            <input type="time" value={form.endTime} onChange={(e) => onChange("endTime", e.target.value)} className={`${inputCls} bg-white dark:bg-dark_input`} />
          </div>
        </div>
      </div>

      <div>
        <label className={labelCls}>{t("نوع الجروب", "Delivery Mode")} *</label>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { value: "online",  icon: Globe,  labelAr: "أونلاين",         labelEn: "Online" },
            { value: "offline", icon: MapPin, labelAr: "أوفلاين (حضوري)", labelEn: "Offline" },
          ].map((m) => {
            const Icon = m.icon;
            const active = form.deliveryMode === m.value;
            return (
              <button key={m.value} type="button" onClick={() => onChange("deliveryMode", m.value)}
                className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all duration-200 ${
                  active
                    ? "border-primary/40 bg-gradient-to-br from-primary/[0.06] to-orange-deep/[0.04] dark:from-primary/15 dark:to-orange-deep/10 ring-1 ring-primary/15"
                    : "border-PowderBlueBorder dark:border-dark_border hover:border-primary/25 hover:bg-gray-50 dark:hover:bg-dark_input"
                }`}>
                <div className={pickerIconWrapCls(active) + " w-8 h-8 rounded-lg"}>
                  <Icon className={`w-3.5 h-3.5 ${active ? "text-white" : "text-primary"}`} />
                </div>
                <span className="text-sm font-medium text-MidnightNavyText dark:text-white">
                  {isAr ? m.labelAr : m.labelEn}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {form.deliveryMode === "offline" && (
        <div className="pt-1 border-t border-PowderBlueBorder dark:border-dark_border">
          <label className={`${labelCls} mt-4`}>{t("مكان الجروب", "Location")} *</label>
          <MapLocationPicker value={form.locationDetails} onChange={(v) => onChange("locationDetails", v)} t={t} />
        </div>
      )}
    </div>
  );
}

// ─── Review Step ──────────────────────────────────────────────────────────────
function ReviewStep({ data, isAr }) {
  const t = (ar, en) => (isAr ? ar : en);
  const isOnline = data.details.deliveryMode === "online";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.07] to-orange-deep/[0.05] dark:from-primary/15 dark:to-orange-deep/10 p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-orange-deep flex items-center justify-center">
            <Gift className="w-3.5 h-3.5 text-white" />
          </span>
          <h4 className="text-sm font-bold text-MidnightNavyText dark:text-white">{t("جاهزين للإنشاء", "Ready to create")}</h4>
        </div>
        <p className="text-xs text-SlateBlueText dark:text-darktext ps-9">
          {t("راجع الملخص على الجنب، ولو كل حاجة تمام اضغط إنشاء الحصة التعويضية.",
             "Check the summary on the side — if it all looks right, hit Create Make-up Session.")}
        </p>
      </div>

      {isOnline && data.selectedLinkIds?.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              {t(`اللينكات المختارة (${data.selectedLinkIds.length})`, `Selected Links (${data.selectedLinkIds.length})`)}
            </p>
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
            {t("اللينكات دي هتتحجز للسيشن الجديدة أول ما تنشئ الحصة.",
               "These links will be reserved for the new session as soon as you create it.")}
          </p>
        </div>
      )}

      <div className="rounded-2xl p-3.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
        <div className="flex items-start gap-2.5">
          <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
            {t("بالضغط على \"إنشاء الحصة التعويضية\" — السيشن هتتولّد واللينكات هتتحجز والرسائل هتتبعت للطالب وولي الأمر والمدرس فورًا.",
               "By clicking \"Create Make-up Session\" — the session will be generated, links reserved, and messages sent to the student, guardian, and instructor immediately.")}
          </p>
        </div>
      </div>

      <div className={`${cardCls} p-4 lg:hidden`}>
        <SectionHeading icon={Layers} title={t("الملخص", "Summary")} badgeTone="muted" />
        <div className="space-y-2 text-xs">
          <div className="flex justify-between"><span className="text-SlateBlueText dark:text-darktext">{t("الطالب", "Student")}</span><span className="font-semibold text-MidnightNavyText dark:text-white">{data.student?.name || "—"}</span></div>
          <div className="flex justify-between"><span className="text-SlateBlueText dark:text-darktext">{t("الجروب", "Group")}</span><span className="font-semibold text-MidnightNavyText dark:text-white">{data.group?.name || "—"}</span></div>
          <div className="flex justify-between"><span className="text-SlateBlueText dark:text-darktext">{t("المدرس", "Instructor")}</span><span className="font-semibold text-MidnightNavyText dark:text-white">{data.instructor?.name || "—"}</span></div>
          <div className="flex justify-between"><span className="text-SlateBlueText dark:text-darktext">{t("الميعاد", "Schedule")}</span><span className="font-semibold text-MidnightNavyText dark:text-white">{data.details.scheduledDate ? `${data.details.scheduledDate} · ${data.details.startTime}-${data.details.endTime}` : "—"}</span></div>
          {isOnline && (
            <div className="flex justify-between"><span className="text-SlateBlueText dark:text-darktext">{t("اللينك", "Link")}</span><span className="font-semibold text-MidnightNavyText dark:text-white">{data.selectedLinkIds?.length || 0} {t("مختار", "selected")}</span></div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function MakeupSessionForm({ onClose, onSaved }) {
  const { t, language } = useI18n();
  const isAr = language === "ar";

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  const [student, setStudent] = useState(null);
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [group, setGroup] = useState(null);

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [session, setSession] = useState(null);

  const [instructor, setInstructor] = useState(null);

  const [details, setDetails] = useState({
    newGroupName: "",
    scheduledDate: "",
    startTime: "17:00",
    endTime: "19:00",
    deliveryMode: "online",
    locationDetails: {
      lat: null, lng: null, placeName: "", country: "", address: "", extraDetails: "",
    },
  });

  const [selectedLinkIds, setSelectedLinkIds] = useState([]);
  const [forceActivate, setForceActivate] = useState(false);
  const [releaseReserved, setReleaseReserved] = useState(false);

  // ═════════════════════════════════════════════════════════════════════════
  // ✅ schedule object memoized — لمنع الـ infinite loop
  // ═════════════════════════════════════════════════════════════════════════
  const scheduleForPicker = useMemo(() => {
    if (!details.scheduledDate) return null;
    return {
      daysOfWeek: [
        new Date(details.scheduledDate).toLocaleDateString("en-US", {
          weekday: "long",
        }),
      ],
      timeFrom: details.startTime,
      timeTo: details.endTime,
    };
  }, [details.scheduledDate, details.startTime, details.endTime]);

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleSelectStudent = (s) => {
    setStudent(s);
    setGroup(null); setSession(null); setInstructor(null);
    setGroups([]); setSessions([]);
    setSelectedLinkIds([]);
    setGroupsLoading(true);

    fetch(`/api/admin/makeup-session?studentId=${s._id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setGroups(json.data || []);
        else toast.error(json.error || "Failed to load groups");
      })
      .catch(() => toast.error(t("فشل تحميل جروبات الطالب", "Failed to load student groups")))
      .finally(() => setGroupsLoading(false));

    setStep(1);
  };

  const handleSelectGroup = (g) => {
    setGroup(g);
    setSession(null); setInstructor(null);
    setSessions([]); setSelectedLinkIds([]);
    setSessionsLoading(true);

    if (!details.newGroupName) {
      const studentFirst = student?.name?.split(" ")[0] || "Student";
      const dateStr = new Date().toISOString().split("T")[0];
      setDetails((d) => ({
        ...d,
        newGroupName: `Make-up - ${studentFirst} - ${dateStr}`,
        deliveryMode: g.deliveryMode || "online",
      }));
    }

    setInstructor(g.instructors?.length === 1 ? g.instructors[0] : null);

    fetch(`/api/admin/makeup-session?groupId=${g._id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setSessions(json.data || []);
        else toast.error(json.error || "Failed to load sessions");
      })
      .catch(() => toast.error(t("فشل تحميل سيشنز الجروب", "Failed to load sessions")))
      .finally(() => setSessionsLoading(false));

    setStep(2);
  };

  const handleSelectSession = (s) => { setSession(s); setStep(3); };
  const handleSelectInstructor = (i) => { setInstructor(i); setStep(4); };

  const handleChangeDetail = useCallback((key, value) => {
    setDetails((prev) => ({ ...prev, [key]: value }));
    if (key === "deliveryMode") {
      setSelectedLinkIds([]);
      setForceActivate(false);
      setReleaseReserved(false);
    }
    if (["scheduledDate", "startTime", "endTime"].includes(key)) {
      setSelectedLinkIds([]);
      setForceActivate(false);
    }
  }, []);

  // ── canProceed ─────────────────────────────────────────────────────────
  const canProceed = useMemo(() => {
    if (step === 0) return !!student;
    if (step === 1) return !!group;
    if (step === 2) return !!session;
    if (step === 3) return !!instructor;
    if (step === 4) {
      if (!details.newGroupName?.trim()) return false;
      if (!details.scheduledDate) return false;
      if (!details.startTime || !details.endTime) return false;
      if (details.deliveryMode === "offline") {
        const loc = details.locationDetails;
        return !!(loc?.placeName?.trim() || (loc?.lat && loc?.lng));
      }
      return true;
    }
    if (step === 5) {
      if (details.deliveryMode === "offline") return true;
      return forceActivate || selectedLinkIds.length > 0;
    }
    return true;
  }, [step, student, group, session, instructor, details, selectedLinkIds, forceActivate]);

  const next = () => { if (!canProceed) return; setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  // ═════════════════════════════════════════════════════════════════════════
  // ✅ SUBMIT — إنشاء + تفعيل + إرسال الرسائل في request واحد
  //    على /api/admin/makeup-session (من غير ما نناديه /api/groups/[id]/activate)
  // ═════════════════════════════════════════════════════════════════════════
  const handleSubmit = async () => {
    if (!student || !group || !session || !instructor) {
      toast.error(t("فيه بيانات ناقصة", "Missing data"));
      return;
    }
    if (details.deliveryMode === "online" && !forceActivate && selectedLinkIds.length === 0) {
      toast.error(t("اختر لينك أو فعّل خيار الإنشاء من غير لينك", "Choose a link or enable create-without-link"));
      return;
    }

    setLoading(true);
    const toastId = toast.loading(
      t("جاري إنشاء الحصة التعويضية وإرسال الرسائل...", "Creating make-up session and sending messages..."),
    );

    try {
      const payload = {
        studentId: student._id,
        groupId: group._id,
        sessionId: session._id,
        instructorId: instructor._id,
        scheduledDate: details.scheduledDate,
        startTime: details.startTime,
        endTime: details.endTime,
        newGroupName: details.newGroupName.trim(),
        deliveryMode: details.deliveryMode,
        location: details.deliveryMode === "offline"
          ? [details.locationDetails?.extraDetails, details.locationDetails?.placeName, details.locationDetails?.country]
              .filter(Boolean).join(" — ")
          : "",
        locationDetails: details.deliveryMode === "offline" ? details.locationDetails : null,
        selectedLinkIds: details.deliveryMode === "online" ? selectedLinkIds : [],
      };

      const res = await fetch("/api/admin/makeup-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      // ❌ فشل الإنشاء
      if (!res.ok || !json.success) {
        if (json.linkConflicts?.length) {
          toast.error(
            t("فيه لينكات متعارضة — ارجع لخطوة اللينك واختار تاني", "Some links conflict — go back to the link step and re-select"),
            { id: toastId, duration: 7000 },
          );
          setStep(5);
          setSelectedLinkIds([]);
        } else {
          const msg = json.conflictMessage || json.error || t("فشل الإنشاء", "Creation failed");
          toast.error(msg, { id: toastId, duration: 7000 });
        }
        return;
      }

      // ✅ اتعمل — نشوف مين من الـ 3 رسائل ما اتبعتش
      const notif = json.notifications || {};
      const failed = NOTIFY_ROLES.filter(({ key }) => !notif.results?.[key]?.sent);

      if (failed.length === 0) {
        toast.success(
          t("🎉 تم إنشاء الحصة التعويضية وإرسال الرسائل للطالب وولي الأمر والمدرس",
            "🎉 Make-up session created and all 3 messages sent"),
          { id: toastId, duration: 6000 },
        );
      } else {
        const failedText = failed
          .map(({ key, ar, en }) => `${isAr ? ar : en}: ${notif.results?.[key]?.error || notif.reason || "not_sent"}`)
          .join(" • ");
        toast(
          t(`تم إنشاء الحصة، لكن فيه رسايل ماتبعتتش — ${failedText}`,
            `Session created, but some messages were not sent — ${failedText}`),
          { id: toastId, icon: "⚠️", duration: 10000 },
        );
      }

      onSaved?.();
      onClose?.();
    } catch (err) {
      toast.error(err.message || t("خطأ في الاتصال", "Connection error"), { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const currentStep = STEPS[step];
  const StepIcon = currentStep.icon;
  const isOnline = details.deliveryMode === "online";

  const summaryDoneCount = [
    !!student, !!group, !!session, !!instructor,
    !!(details.scheduledDate && details.startTime),
    step >= 5 && (!isOnline || selectedLinkIds.length > 0 || forceActivate),
    step >= 6,
  ].filter(Boolean).length;

  const isLastStep = step === STEPS.length - 1;
  const linkReady = !isOnline || forceActivate || selectedLinkIds.length > 0;
  const canSubmit = isLastStep && !loading && linkReady;

  return (
    <div className="flex flex-col h-full bg-gray-50/60 dark:bg-darkmode" dir={isAr ? "rtl" : "ltr"}>

      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-darkmode">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-orange-deep flex items-center justify-center shadow-md shadow-primary/25">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-MidnightNavyText dark:text-white">
                {t("إنشاء حصة تعويضية", "Create Make-up Session")}
              </h2>
              <p className="text-xs text-SlateBlueText dark:text-darktext flex items-center gap-1.5">
                <StepIcon className="w-3 h-3 text-primary" />
                {isAr ? currentStep.titleAr : currentStep.titleEn}
                <span className="text-gray-300 dark:text-darkmuted">·</span>
                {step + 1}/{STEPS.length}
              </p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading} className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-dark_input flex items-center justify-center text-gray-500 hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-50">
            <X className="w-4 h-4" />
          </button>
        </div>

        <button type="button" onClick={() => setMobileSummaryOpen((o) => !o)}
          className="lg:hidden mt-4 w-full flex items-center justify-between gap-3 p-2.5 rounded-xl border border-PowderBlueBorder dark:border-dark_border bg-gray-50/60 dark:bg-dark_input/40">
          <div className="flex items-center gap-2.5">
            <RadialProgress percent={(summaryDoneCount / 7) * 100} size={32} stroke={4} label="" gradientId="makeupRadialGradMobile" />
            <span className="text-xs font-semibold text-MidnightNavyText dark:text-white">
              {t("ملخص الحصة", "Session summary")} · {summaryDoneCount}/7
            </span>
          </div>
          {mobileSummaryOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {mobileSummaryOpen && (
          <div className="lg:hidden mt-3 p-3.5 rounded-2xl border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-darklight">
            <SummaryPanel student={student} group={group} session={session} instructor={instructor} details={details} selectedLinkIds={selectedLinkIds} step={step} isAr={isAr} />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-5 p-4 rounded-2xl bg-gradient-to-br from-IcyBreeze to-PaleCyan dark:from-primary/10 dark:to-orange-deep/10 border border-primary/15">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-orange-deep flex items-center justify-center shadow-md shadow-primary/25 flex-shrink-0">
                <StepIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-MidnightNavyText dark:text-white">
                  {isAr ? currentStep.titleAr : currentStep.titleEn}
                </h3>
                <p className="text-xs text-SlateBlueText dark:text-darktext">
                  {step === 0 && t("ابحث واختر الطالب اللي عايز تعمله حصة تعويضية", "Search and pick the student")}
                  {step === 1 && t("اختر الجروب من جروبات الطالب", "Pick one of the student's groups")}
                  {step === 2 && t("اختر السيشن اللي عايز تعوّضها", "Pick the session to compensate")}
                  {step === 3 && t("اختر المدرس المسؤول", "Pick the responsible instructor")}
                  {step === 4 && t("حدد تفاصيل الحصة التعويضية", "Set the make-up session details")}
                  {step === 5 && (isOnline
                    ? t("اختر لينك الاجتماع للحصة الجديدة", "Pick a meeting link for the new session")
                    : t("الحصة أوفلاين — مش محتاجة لينك", "Offline session — no link needed"))}
                  {step === 6 && t("راجع كل حاجة قبل الإنشاء", "Review before creating")}
                </p>
              </div>
            </div>

            {step === 0 && <StudentSearch onSelect={handleSelectStudent} isAr={isAr} />}
            {step === 1 && <GroupPicker student={student} groups={groups} loading={groupsLoading} selected={group} onSelect={handleSelectGroup} isAr={isAr} />}
            {step === 2 && <SessionPicker sessions={sessions} loading={sessionsLoading} selected={session} onSelect={handleSelectSession} studentId={student?._id} isAr={isAr} />}
            {step === 3 && <InstructorPicker instructors={group?.instructors || []} selected={instructor} onSelect={handleSelectInstructor} isAr={isAr} />}
            {step === 4 && <DetailsForm form={details} onChange={handleChangeDetail} isAr={isAr} />}

            {step === 5 && (
              isOnline ? (
                <MakeupLinksPicker
                  schedule={scheduleForPicker}
                  selectedLinks={selectedLinkIds}
                  setSelectedLinks={setSelectedLinkIds}
                  forceActivate={forceActivate}
                  setForceActivate={setForceActivate}
                  releaseReserved={releaseReserved}
                  setReleaseReserved={setReleaseReserved}
                  isAr={isAr}
                />
              ) : (
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-5 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto mb-3">
                    <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                    {t("الحصة أوفلاين — مش محتاجة لينك اجتماع", "Offline session — no meeting link needed")}
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1.5">
                    {t("الطلاب والمدرس هيستقبلوا اسم المكان والعنوان ولينك الخريطة في الرسائل.",
                       "Students and instructor will receive the location name, address, and maps link in messages.")}
                  </p>
                </div>
              )
            )}

            {step === 6 && (
              <ReviewStep
                data={{ student, group, session, instructor, details, selectedLinkIds }}
                isAr={isAr}
              />
            )}
          </div>
        </div>

        <aside className="hidden lg:block w-[280px] flex-shrink-0 border-s border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-darkmode overflow-y-auto custom-scrollbar">
          <div className="p-5">
            <SummaryPanel student={student} group={group} session={session} instructor={instructor} details={details} selectedLinkIds={selectedLinkIds} step={step} isAr={isAr} />
          </div>
        </aside>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-white dark:bg-darkmode border-t border-PowderBlueBorder dark:border-dark_border px-5 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
        <div className="flex gap-3 max-w-2xl mx-auto lg:mx-0 lg:max-w-none lg:me-[296px]">

          {/* زر الرجوع / إلغاء */}
          {step === 0 ? (
            <button type="button" onClick={onClose} disabled={loading}
              className="flex-1 border border-PowderBlueBorder dark:border-dark_border py-2.5 px-4 rounded-xl font-semibold text-MidnightNavyText dark:text-white hover:bg-gray-50 dark:hover:bg-dark_input flex items-center justify-center gap-2 disabled:opacity-50 text-sm transition-colors">
              <X className="w-4 h-4" />{t("إلغاء", "Cancel")}
            </button>
          ) : (
            <button type="button" onClick={prev} disabled={loading}
              className="flex-1 border border-PowderBlueBorder dark:border-dark_border py-2.5 px-4 rounded-xl font-semibold text-MidnightNavyText dark:text-white hover:bg-gray-50 dark:hover:bg-dark_input flex items-center justify-center gap-2 disabled:opacity-50 text-sm transition-colors">
              {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              {t("رجوع", "Back")}
            </button>
          )}

          {/* زر التالي / زر الإنشاء */}
          {!isLastStep ? (
            <button type="button" onClick={next} disabled={!canProceed}
              className="flex-1 bg-gradient-to-r from-primary to-orange-deep text-white py-2.5 px-4 rounded-xl font-semibold shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 transition-all text-sm active:scale-[0.98]">
              {t("التالي", "Next")}
              {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-[1.4] bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-2.5 px-4 rounded-xl font-semibold shadow-md shadow-emerald-600/25 hover:shadow-lg hover:shadow-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all text-sm active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("جاري الإنشاء والإرسال...", "Creating & sending...")}
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  {t("إنشاء الحصة التعويضية", "Create Make-up Session")}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}