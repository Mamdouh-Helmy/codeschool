"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import {
  Search,
  X,
  MapPin,
  Globe,
  Loader2,
  AlertCircle,
  CheckCircle,
  Users,
  GraduationCap,
  CalendarClock,
  Hash,
  Video,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import MapLocationPicker from "./MapLocationPicker";

// ─── Constants ────────────────────────────────────────────────────────────────
const EMPTY_LOCATION = {
  lat: null,
  lng: null,
  placeName: "",
  country: "",
  address: "",
  extraDetails: "",
};

const DEFAULT_START = "10:00";
const DEFAULT_END = "11:00";

const DURATIONS = [
  { m: 30, label: "٣٠ دقيقة" },
  { m: 45, label: "٤٥ دقيقة" },
  { m: 60, label: "ساعة" },
  { m: 90, label: "ساعة ونص" },
];

const INPUT =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60 dark:border-dark_border dark:bg-dark_input dark:text-white [color-scheme:light] dark:[color-scheme:dark]";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function hasLocation(loc) {
  if (!loc) return false;
  return !!(
    loc.placeName?.trim() ||
    loc.address?.trim() ||
    (loc.lat != null && loc.lng != null)
  );
}

const toMin = (t) => {
  if (!t || !t.includes(":")) return NaN;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

function addMinutes(t, mins) {
  const base = toMin(t);
  if (Number.isNaN(base)) return t;
  const total = Math.min(base + mins, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const initialOf = (name) => (name || "؟").trim().charAt(0);

// pickers' matchers (module-level so they stay referentially stable)
const matchStudent = (s, q) =>
  (s.personalInfo?.fullName || "").toLowerCase().includes(q) ||
  (s.enrollmentNumber || "").toLowerCase().includes(q) ||
  (s.personalInfo?.whatsappNumber || "").toLowerCase().includes(q);

const matchInstructor = (i, q) =>
  (i.name || "").toLowerCase().includes(q) ||
  (i.email || "").toLowerCase().includes(q);

const studentMain = (s) => ({
  name: s.personalInfo?.fullName || "—",
  sub: [s.enrollmentNumber, s.personalInfo?.whatsappNumber]
    .filter(Boolean)
    .join(" · "),
});

const instructorMain = (i) => ({
  name: i.name || "—",
  sub: i.email || "",
});

// ─── Sub-components ──────────────────────────────────────────────────────────
function Section({ icon: Icon, title, hint, children }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-bold text-slate-800 dark:text-white">
          {title}
        </h3>
        {hint && (
          <span className="text-xs text-slate-400 dark:text-darksubtle">
            {hint}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ children }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-darkmuted">
      {children}
    </label>
  );
}

function ConflictBanner({ tone = "rose", children }) {
  const tones = {
    rose: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300",
    amber:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
  };
  return (
    <div
      role="alert"
      className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs leading-relaxed ${tones[tone]}`}
    >
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function PersonPicker({
  label,
  items,
  loading,
  selected,
  onSelect,
  onClear,
  matches,
  getMain,
  renderBadge,
  placeholder,
  emptyText,
  avatarTone,
  limit = 30,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? items.filter((i) => matches(i, q)) : items;
    return base.slice(0, limit);
  }, [items, query, matches, limit]);

  const sel = selected ? getMain(selected) : null;

  return (
    <div ref={boxRef} className="relative">
      <FieldLabel>{label}</FieldLabel>

      {sel ? (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5">
          <span
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarTone}`}
          >
            {initialOf(sel.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {sel.name}
            </p>
            {sel.sub && (
              <p className="truncate text-[11px] text-slate-500 dark:text-darkmuted">
                {sel.sub}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              onClear();
              setQuery("");
            }}
            aria-label={`إزالة ${label}`}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-rose-500 dark:hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              disabled={loading}
              placeholder={loading ? "جاري التحميل..." : placeholder}
              className={`${INPUT} pr-10 pl-9`}
            />
            {loading && (
              <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
            )}
          </div>

          {open && (
            <div className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-dark_border dark:bg-darklight">
              {list.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-slate-400">
                  {query ? emptyText : "مفيش بيانات متاحة"}
                </p>
              ) : (
                list.map((item) => {
                  const m = getMain(item);
                  return (
                    <button
                      key={item._id}
                      type="button"
                      onClick={() => {
                        onSelect(item);
                        setQuery("");
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-start transition-colors last:border-0 hover:bg-brand-soft dark:border-dark_border dark:hover:bg-white/5"
                    >
                      <span
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarTone}`}
                      >
                        {initialOf(m.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-white">
                          {m.name}
                        </p>
                        {m.sub && (
                          <p className="mt-0.5 truncate text-[11px] text-slate-400">
                            {m.sub}
                          </p>
                        )}
                      </div>
                      {renderBadge?.(item)}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function InterviewFormModal({
  initial = null,
  onClose,
  onSaved,
}) {
  const { t } = useI18n();
  const isEdit = !!initial?.id;

  // ── People ──
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [instructors, setInstructors] = useState([]);
  const [loadingInstructors, setLoadingInstructors] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState(null);

  // ── Form fields ──
  const [title, setTitle] = useState(initial?.title || "");
  const [scheduledDate, setScheduledDate] = useState(
    initial?.scheduledDate
      ? new Date(initial.scheduledDate).toISOString().split("T")[0]
      : todayISO()
  );
  const [startTime, setStartTime] = useState(initial?.startTime || DEFAULT_START);
  const [endTime, setEndTime] = useState(initial?.endTime || DEFAULT_END);

  // ── Delivery ──
  const [deliveryMode, setDeliveryMode] = useState(
    initial?.deliveryMode || "online"
  );
  const [locationDetails, setLocationDetails] = useState(
    initial?.locationDetails || EMPTY_LOCATION
  );
  const [availableLinks, setAvailableLinks] = useState([]);
  const [reservedLinks, setReservedLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [selectedLinkId, setSelectedLinkId] = useState(
    initial?.meetingLinkId || ""
  );

  // ── Checks & Save ──
  const [checking, setChecking] = useState(false);
  const [conflicts, setConflicts] = useState({});
  const [saving, setSaving] = useState(false);

  // ── Escape to close + lock page scroll ──
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, saving]);

  // ═══ Load students ═══
  useEffect(() => {
    const load = async () => {
      setLoadingStudents(true);
      try {
        const res = await fetch("/api/allStudents?status=Active&limit=1000", {
          cache: "no-store",
        });
        const json = await res.json();
        if (json.success) {
          setStudents(json.data || []);
        } else {
          toast.error(json.error || "فشل تحميل الطلاب");
        }
      } catch (e) {
        console.error(e);
        toast.error("خطأ في تحميل الطلاب");
      } finally {
        setLoadingStudents(false);
      }
    };
    load();
  }, []);

  // ═══ Load instructors ═══
  useEffect(() => {
    const load = async () => {
      setLoadingInstructors(true);
      try {
        const res = await fetch("/api/instructor", { cache: "no-store" });
        const json = await res.json();
        if (json.success) {
          setInstructors(json.data || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingInstructors(false);
      }
    };
    load();
  }, []);

  // ═══ Prefill when editing ═══
  useEffect(() => {
    if (!initial) return;

    if (initial.student?.id) {
      setSelectedStudent({
        _id: initial.student.id,
        personalInfo: { fullName: initial.student.name },
        enrollmentNumber: initial.student.enrollmentNumber,
        studentType: initial.student.studentType,
      });
    }

    if (initial.instructor?.id) {
      setSelectedInstructor({
        _id: initial.instructor.id,
        name: initial.instructor.name,
        email: initial.instructor.email,
      });
    }
  }, [initial]);

  // ═══ Load available links (online only) ═══
  useEffect(() => {
    if (deliveryMode !== "online" || !scheduledDate || !startTime || !endTime) {
      setAvailableLinks([]);
      setReservedLinks([]);
      return;
    }

    const load = async () => {
      setLoadingLinks(true);
      try {
        const url = `/api/admin/interviews/available-links?date=${scheduledDate}&startTime=${startTime}&endTime=${endTime}`;
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json();
        if (json.success) {
          const avail = json.data.available || [];
          const reserved = json.data.reserved || [];
          setAvailableLinks(avail);
          setReservedLinks(reserved);

          if (!selectedLinkId && avail.length > 0) {
            setSelectedLinkId(avail[0].id);
          }
          if (
            selectedLinkId &&
            !avail.some((l) => String(l.id) === String(selectedLinkId))
          ) {
            setSelectedLinkId(avail[0]?.id || "");
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingLinks(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryMode, scheduledDate, startTime, endTime]);

  // ═══ Real-time conflict check ═══
  useEffect(() => {
    if (!scheduledDate || !startTime || !endTime) {
      setConflicts({});
      return;
    }
    if (endTime <= startTime) {
      setConflicts({ timeError: "وقت النهاية لازم يكون بعد البداية" });
      return;
    }

    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const res = await fetch("/api/admin/interviews/check-availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: selectedStudent?._id,
            instructorId: selectedInstructor?._id,
            title: title.trim(),
            scheduledDate,
            startTime,
            endTime,
            deliveryMode,
            excludeInterviewId: initial?.id || null,
          }),
        });
        const json = await res.json();
        if (json.success) {
          setConflicts(json.data || {});
        }
      } catch (e) {
        console.error(e);
      } finally {
        setChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [
    title,
    scheduledDate,
    startTime,
    endTime,
    selectedStudent?._id,
    selectedInstructor?._id,
    deliveryMode,
    initial?.id,
  ]);

  // ═══ Time helpers ═══
  const handleStartChange = (value) => {
    const duration = toMin(endTime) - toMin(startTime);
    setStartTime(value);
    // keep the same duration when the start moves
    if (!Number.isNaN(duration) && duration > 0 && value) {
      setEndTime(addMinutes(value, duration));
    }
  };

  const currentDuration = toMin(endTime) - toMin(startTime);

  // ═══ Validation ═══
  const validation = useMemo(() => {
    const errors = [];

    if (!selectedStudent) errors.push("لازم تختار طالب");
    if (!selectedInstructor) errors.push("لازم تختار مدرس");
    if (!title.trim()) errors.push("لازم تكتب اسم المقابلة");
    if (!scheduledDate) errors.push("لازم تحدد التاريخ");
    if (!startTime || !endTime) errors.push("لازم تحدد الوقت");
    if (endTime <= startTime) errors.push("وقت النهاية لازم يكون بعد البداية");

    if (deliveryMode === "offline" && !hasLocation(locationDetails)) {
      errors.push("لازم تحدد مكان المقابلة");
    }
    if (deliveryMode === "online" && !selectedLinkId) {
      errors.push("لازم تختار لينك الاجتماع");
    }

    if (conflicts.titleConflict) errors.push("اسم المقابلة مستخدم بالفعل");
    if (conflicts.interviewConflict) errors.push("يوجد تعارض مع مقابلة أخرى");
    if (conflicts.studentSessionConflict)
      errors.push("الطالب عنده سيشن في نفس الوقت");
    if (conflicts.instructorSessionConflict)
      errors.push("المدرس عنده سيشن في نفس الوقت");

    return errors;
  }, [
    selectedStudent,
    selectedInstructor,
    title,
    scheduledDate,
    startTime,
    endTime,
    deliveryMode,
    locationDetails,
    selectedLinkId,
    conflicts,
  ]);

  const canSave = validation.length === 0 && !saving;

  // ═══ Save ═══
  const handleSave = useCallback(async () => {
    if (!canSave) {
      if (validation.length > 0) {
        toast.error(validation[0]);
      }
      return;
    }

    setSaving(true);
    try {
      const url = isEdit
        ? `/api/admin/interviews/${initial.id}`
        : "/api/admin/interviews";
      const method = isEdit ? "PUT" : "POST";

      const body = {
        studentId: selectedStudent._id,
        instructorId: selectedInstructor._id,
        title: title.trim(),
        scheduledDate,
        startTime,
        endTime,
        deliveryMode,
        meetingLinkId: deliveryMode === "online" ? selectedLinkId : null,
        location: deliveryMode === "offline" ? locationDetails.placeName : "",
        locationDetails: deliveryMode === "offline" ? locationDetails : null,
        sendWelcome: !isEdit,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(
          isEdit
            ? "✅ تم تحديث المقابلة"
            : "✅ تم إنشاء المقابلة وإرسال الترحيب"
        );
        onSaved?.();
      } else {
        toast.error(json.error || "فشل الحفظ");
      }
    } catch (e) {
      console.error(e);
      toast.error("خطأ في الاتصال");
    } finally {
      setSaving(false);
    }
  }, [
    canSave,
    validation,
    isEdit,
    initial?.id,
    selectedStudent,
    selectedInstructor,
    title,
    scheduledDate,
    startTime,
    endTime,
    deliveryMode,
    selectedLinkId,
    locationDetails,
    onSaved,
  ]);

  // ═══════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="interview-modal-title"
      dir="rtl"
    >
      <div className="flex max-h-[92vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:border dark:border-dark_border dark:bg-darklight">
        {/* ═══ Header ═══ */}
        <div className="relative flex items-center justify-between gap-3 bg-gradient-to-br from-secondary to-brand-deep px-6 py-5">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-brand-md">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <h2
                id="interview-modal-title"
                className="text-lg font-extrabold text-white"
              >
                {isEdit ? "تعديل المقابلة" : "مقابلة جديدة"}
              </h2>
              <p className="mt-0.5 text-xs text-white/70">
                {isEdit
                  ? "عدّل البيانات وهنتأكد من التعارضات تلقائيًا"
                  : "اختار الطالب والمدرس وحدد الميعاد"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
          <span className="absolute inset-x-0 bottom-0 h-1 bg-primary" />
        </div>

        {/* ═══ Body ═══ */}
        <div className="flex-1 divide-y divide-slate-100 overflow-y-auto px-6 py-5 dark:divide-dark_border [&>section]:py-5 [&>section:first-child]:pt-0 [&>section:last-child]:pb-0">
          {/* ── Participants ── */}
          <Section icon={Users} title="المشاركون">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <PersonPicker
                label="الطالب"
                items={students}
                loading={loadingStudents}
                selected={selectedStudent}
                onSelect={setSelectedStudent}
                onClear={() => setSelectedStudent(null)}
                matches={matchStudent}
                getMain={studentMain}
                placeholder="الاسم أو رقم القيد أو الهاتف"
                emptyText="لا يوجد طلاب مطابقين"
                avatarTone="bg-primary/10 text-primary"
                renderBadge={(s) => (
                  <span
                    className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      s.studentType === "adults"
                        ? "bg-secondary/10 text-secondary dark:bg-cyan-400/10 dark:text-cyan-300"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                    }`}
                  >
                    {s.studentType === "adults" ? "بالغ" : "طفل"}
                  </span>
                )}
              />
              <PersonPicker
                label="المُقابِل (المدرس)"
                items={instructors}
                loading={loadingInstructors}
                selected={selectedInstructor}
                onSelect={setSelectedInstructor}
                onClear={() => setSelectedInstructor(null)}
                matches={matchInstructor}
                getMain={instructorMain}
                placeholder="الاسم أو البريد"
                emptyText="لا يوجد مدرسين مطابقين"
                avatarTone="bg-secondary/10 text-secondary dark:bg-cyan-400/10 dark:text-cyan-300"
                limit={50}
              />
            </div>
          </Section>

          {/* ── Title ── */}
          <Section icon={Hash} title="اسم المقابلة">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: Interview - Ahmed"
              className={INPUT}
            />
            {conflicts.titleConflict && (
              <ConflictBanner>
                يوجد مقابلة بنفس الاسم:{" "}
                <strong>{conflicts.titleConflict.title}</strong>
              </ConflictBanner>
            )}
          </Section>

          {/* ── Schedule ── */}
          <Section icon={CalendarClock} title="التاريخ والوقت">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <FieldLabel>التاريخ</FieldLabel>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className={INPUT}
                />
              </div>
              <div>
                <FieldLabel>من</FieldLabel>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => handleStartChange(e.target.value)}
                  className={INPUT}
                />
              </div>
              <div>
                <FieldLabel>إلى</FieldLabel>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={INPUT}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">المدة:</span>
              {DURATIONS.map((d) => {
                const active = currentDuration === d.m;
                return (
                  <button
                    key={d.m}
                    type="button"
                    onClick={() => setEndTime(addMinutes(startTime, d.m))}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      active
                        ? "border-primary bg-primary text-white"
                        : "border-slate-200 text-slate-600 hover:border-primary/50 hover:text-primary dark:border-dark_border dark:text-darkmuted"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
              {checking && (
                <span className="ms-auto flex items-center gap-1.5 text-xs text-slate-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  بنتأكد من التعارضات...
                </span>
              )}
            </div>

            {conflicts.timeError && (
              <ConflictBanner>{conflicts.timeError}</ConflictBanner>
            )}
            {conflicts.interviewConflict && (
              <ConflictBanner>
                يوجد تعارض مع مقابلة أخرى:{" "}
                <strong>{conflicts.interviewConflict.title}</strong> (
                {conflicts.interviewConflict.startTime} -{" "}
                {conflicts.interviewConflict.endTime})
              </ConflictBanner>
            )}
            {conflicts.studentSessionConflict && (
              <ConflictBanner>
                الطالب عنده سيشن في نفس الوقت:{" "}
                <strong>{conflicts.studentSessionConflict.title}</strong>
              </ConflictBanner>
            )}
            {conflicts.instructorSessionConflict && (
              <ConflictBanner>
                المدرس عنده سيشن في نفس الوقت:{" "}
                <strong>{conflicts.instructorSessionConflict.title}</strong>
              </ConflictBanner>
            )}
          </Section>

          {/* ── Delivery ── */}
          <Section icon={Video} title="طريقة المقابلة">
            <div
              role="radiogroup"
              aria-label="طريقة المقابلة"
              className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-dark_input"
            >
              {[
                {
                  value: "online",
                  icon: Globe,
                  label: "أونلاين",
                  sub: "عن طريق لينك اجتماع",
                  tone: "text-secondary dark:text-cyan-300",
                },
                {
                  value: "offline",
                  icon: MapPin,
                  label: "حضوري",
                  sub: "في مقر محدد",
                  tone: "text-primary",
                },
              ].map((opt) => {
                const active = deliveryMode === opt.value;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setDeliveryMode(opt.value)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-start transition-all ${
                      active
                        ? "bg-white shadow-sm dark:bg-darklight"
                        : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 flex-shrink-0 ${
                        active ? opt.tone : "text-slate-400"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-white">
                        {opt.label}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-darkmuted">
                        {opt.sub}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Online: link picker */}
            {deliveryMode === "online" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FieldLabel>لينك الاجتماع</FieldLabel>
                  {availableLinks.length > 0 && (
                    <span className="mb-1.5 text-xs text-slate-400">
                      {availableLinks.length} لينك متاح
                    </span>
                  )}
                </div>

                {loadingLinks ? (
                  <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-6 dark:border-dark_border">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-xs text-slate-500">
                      بنفحص اللينكات المتاحة...
                    </span>
                  </div>
                ) : availableLinks.length === 0 ? (
                  <ConflictBanner tone="amber">
                    <p className="font-semibold">مفيش لينكات متاحة في الوقت ده</p>
                    <p className="mt-0.5 opacity-90">
                      كل اللينكات محجوزة. غيّر الوقت أو اختار مقابلة حضورية.
                    </p>
                  </ConflictBanner>
                ) : (
                  <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-dark_border">
                    {availableLinks.map((link) => {
                      const isSelected =
                        String(selectedLinkId) === String(link.id);
                      return (
                        <label
                          key={link.id}
                          className={`flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3.5 py-2.5 transition-colors last:border-0 dark:border-dark_border ${
                            isSelected
                              ? "bg-primary/5"
                              : "hover:bg-slate-50 dark:hover:bg-white/5"
                          }`}
                        >
                          <input
                            type="radio"
                            name="meetingLink"
                            checked={isSelected}
                            onChange={() => setSelectedLinkId(link.id)}
                            className="h-4 w-4 border-slate-300 text-primary focus:ring-primary"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                              {link.name}
                            </p>
                            <p
                              dir="ltr"
                              className="mt-0.5 truncate text-start font-mono text-[10px] text-slate-400"
                            >
                              {link.link}
                            </p>
                          </div>
                          <span className="flex-shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-white/5 dark:text-darkmuted">
                            {link.platform}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {reservedLinks.length > 0 && (
                  <details className="group">
                    <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-800 dark:text-darkmuted dark:hover:text-white">
                      {reservedLinks.length} لينك محجوز في الوقت ده
                    </summary>
                    <div className="mt-1.5 max-h-32 space-y-1.5 overflow-y-auto rounded-xl bg-slate-50 p-3 text-xs dark:bg-white/5">
                      {reservedLinks.map((l) => (
                        <div
                          key={l.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="font-semibold text-rose-600 dark:text-rose-400">
                            {l.name}
                          </span>
                          <span className="text-slate-500">
                            {l.reservedDays?.join("، ")} · {l.reservedTime}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* Offline: location picker */}
            {deliveryMode === "offline" && (
              <div className="space-y-2">
                <FieldLabel>مكان المقابلة</FieldLabel>
                <MapLocationPicker
                  value={locationDetails}
                  onChange={setLocationDetails}
                  t={t}
                />
                {!hasLocation(locationDetails) && (
                  <ConflictBanner tone="amber">
                    حدد مكان المقابلة على الخريطة أو اكتب العنوان.
                  </ConflictBanner>
                )}
              </div>
            )}
          </Section>
        </div>

        {/* ═══ Footer ═══ */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-dark_border dark:bg-white/[0.02]">
          <div className="min-w-0 flex-1 text-xs">
            {validation.length > 0 ? (
              <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{validation[0]}</span>
                {validation.length > 1 && (
                  <span className="flex-shrink-0 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                    +{validation.length - 1}
                  </span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-3.5 w-3.5" />
                كل حاجة تمام، جاهز للحفظ
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-white disabled:opacity-50 dark:border-dark_border dark:text-white dark:hover:bg-white/5"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-brand-md transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none dark:focus-visible:ring-offset-darklight"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  {isEdit ? "حفظ التعديلات" : "إنشاء المقابلة"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}