"use client";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import toast from "react-hot-toast";
import {
  X,
  Save,
  RefreshCw,
  Link2,
  VideoIcon,
  FileText,
  MessageCircle,
  User,
  Users,
  Zap,
  Info,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  CalendarClock,
  CalendarCheck,
  ArrowLeftRight,
  ShieldCheck,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// resolveVar — نفس منطق ReminderModal تماماً
// ─────────────────────────────────────────────────────────────────────────────
function resolveVar(dbVars, key, lang = "ar", genderContext = {}) {
  const v = dbVars[key];
  if (!v) return null;

  const { studentGender = "male", guardianType = "father" } = genderContext;
  const isMale   = String(studentGender).toLowerCase() !== "female";
  const isFather = String(guardianType).toLowerCase()  !== "mother";

  if (v.hasGender) {
    if (v.genderType === "student") {
      return lang === "ar"
        ? (isMale ? v.valueMaleAr   : v.valueFemaleAr) || v.valueAr || null
        : (isMale ? v.valueMaleEn   : v.valueFemaleEn) || v.valueEn || null;
    }
    if (v.genderType === "guardian") {
      return lang === "ar"
        ? (isFather ? v.valueFatherAr : v.valueMotherAr) || v.valueAr || null
        : (isFather ? v.valueFatherEn : v.valueMotherEn) || v.valueEn || null;
    }
    if (v.genderType === "instructor") {
      return lang === "ar"
        ? (isMale ? v.valueMaleAr : v.valueFemaleAr) || v.valueAr || null
        : (isMale ? v.valueMaleEn : v.valueFemaleEn) || v.valueEn || null;
    }
  }

  return lang === "ar" ? v.valueAr || null : v.valueEn || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// buildVariables — DB-first, hardcoded fallback (مع دعم dbVars)
// ─────────────────────────────────────────────────────────────────────────────
function buildVariables(student, session, formData, dbVars = {}) {
  if (!student) return {};

  const lang         = (student.communicationPreferences?.preferredLanguage || "ar").toLowerCase();
  const gender       = (student.personalInfo?.gender       || "male").toLowerCase().trim();
  const relationship = (student.guardianInfo?.relationship || "father").toLowerCase().trim();
  const isMale       = gender !== "female";
  const isFather     = relationship !== "mother";
  const genderCtx    = { studentGender: gender, guardianType: relationship };

  // ── Names ────────────────────────────────────────────────────────────────
  const studentFirstName =
    lang === "ar"
      ? student.personalInfo?.nickname?.ar?.trim()  ||
        student.personalInfo?.fullName?.split(" ")[0] || "الطالب"
      : student.personalInfo?.nickname?.en?.trim()  ||
        student.personalInfo?.fullName?.split(" ")[0] || "Student";

  const guardianFirstName =
    lang === "ar"
      ? student.guardianInfo?.nickname?.ar?.trim()  ||
        student.guardianInfo?.name?.split(" ")[0]   || "ولي الأمر"
      : student.guardianInfo?.nickname?.en?.trim()  ||
        student.guardianInfo?.name?.split(" ")[0]   || "Guardian";

  // ── DB vars → fallback ───────────────────────────────────────────────────
  const salutationBase_ar =
    resolveVar(dbVars, "salutation_ar", "ar", genderCtx) ||
    (isMale ? "عزيزي الطالب" : "عزيزتي الطالبة");

  const guardianSalBase_ar =
    resolveVar(dbVars, "guardianSalutation_ar", "ar", genderCtx) ||
    (isFather ? "عزيزي الأستاذ" : "عزيزتي السيدة");

  const guardianSalBase_en =
    resolveVar(dbVars, "guardianSalutation_en", "en", genderCtx) ||
    (isFather ? "Dear Mr." : "Dear Mrs.");

  const childTitleAr =
    resolveVar(dbVars, "childTitle", "ar", genderCtx) ||
    (isMale ? "ابنك" : "ابنتك");

  const childTitleEn =
    resolveVar(dbVars, "childTitle", "en", genderCtx) ||
    (isMale ? "your son" : "your daughter");

  // ── Composed salutations ─────────────────────────────────────────────────
  const guardianSalutation_ar = `${guardianSalBase_ar} ${guardianFirstName}`;
  const guardianSalutation_en = `${guardianSalBase_en} ${guardianFirstName}`;
  const guardianSalutation    = lang === "ar" ? guardianSalutation_ar : guardianSalutation_en;

  const studentSalutation_ar  = `${salutationBase_ar} ${studentFirstName}`;
  const studentSalutation     = lang === "ar" ? studentSalutation_ar : `Dear ${studentFirstName}`;

  const salutation_ar = studentSalutation_ar;
  const salutation_en = `Dear ${studentFirstName}`;

  const childTitle = lang === "ar" ? childTitleAr : childTitleEn;

  // ── Session date ─────────────────────────────────────────────────────────
  const sessionDate = session?.scheduledDate
    ? new Date(session.scheduledDate).toLocaleDateString(
        lang === "ar" ? "ar-EG" : "en-US",
        { weekday: "long", year: "numeric", month: "long", day: "numeric" }
      )
    : "";

  // ── New date (for postponed) ─────────────────────────────────────────────
  const newDateFormatted = formData?.newDate
    ? new Date(formData.newDate).toLocaleDateString(
        lang === "ar" ? "ar-EG" : "en-US",
        { weekday: "long", year: "numeric", month: "long", day: "numeric" }
      )
    : (lang === "ar" ? "التاريخ الجديد" : "New Date");

  return {
    studentSalutation,
    guardianSalutation,
    salutation: guardianSalutation,
    salutation_ar,
    salutation_en,
    studentName:      studentFirstName,
    studentFullName:  student.personalInfo?.fullName || "",
    guardianName:     guardianFirstName,
    guardianFullName: student.guardianInfo?.name || "",
    childTitle,
    sessionName:      session?.title       || "",
    date:             sessionDate,
    time:             `${session?.startTime || ""} - ${session?.endTime || ""}`,
    meetingLink:      formData?.meetingLink || session?.meetingLink || "",
    newDate:          newDateFormatted,
    newTime:          formData?.newTime    || "",
    groupCode:        session?.groupId?.code || "",
    groupName:        session?.groupId?.name || "",
    enrollmentNumber: student.enrollmentNumber || "",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// renderTemplate — replace {variable} placeholders
// ─────────────────────────────────────────────────────────────────────────────
function renderTemplate(template, variables) {
  if (!template) return "";
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
    }
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// getShiftedChainPreview — بيحسب محليًا (من غير API) مين هيترحل لو السيشن
// دي اتلغت، بناءً على allSessions اللي الصفحة الأب محملاها أصلاً.
// ✅ السيشن نفسها (trigger) بقت بتترحل هي كمان +shiftDays، وبتفضل معلّمة
//    كـ isTrigger عشان الـ UI يوضحها لوحدها في الشريط.
// ─────────────────────────────────────────────────────────────────────────────
function getShiftedChainPreview(allSessions, currentSession, shiftDays = 7) {
  if (!currentSession || !allSessions?.length) return { shifting: [], skipped: [] };

  const sameGroup = allSessions
    .filter((s) => {
      const sGroupId = typeof s.group === "object" ? s.group?.id : s.groupId;
      const curGroupId = typeof currentSession.group === "object"
        ? currentSession.group?.id
        : currentSession.groupId;
      return (sGroupId || s.groupId) === (curGroupId || currentSession.groupId) || s.group?.id === currentSession.group?.id;
    })
    .slice()
    .sort((a, b) => a.moduleIndex - b.moduleIndex || a.sessionNumber - b.sessionNumber);

  const myIndex = sameGroup.findIndex((s) => s.id === currentSession.id);
  if (myIndex === -1) return { shifting: [], skipped: [] };

  const chain = sameGroup.slice(myIndex); // ✅ التريجر + كل اللي بعدها
  const shifting = [];
  const skipped = [];

  chain.forEach((s, idx) => {
    const isTrigger = idx === 0;

    if (s.status === "completed") {
      skipped.push(s);
      return;
    }
    if (!isTrigger && s.status === "cancelled") {
      skipped.push(s);
      return;
    }

    const oldDate = new Date(s.scheduledDate);
    const newDate = new Date(oldDate);
    newDate.setDate(newDate.getDate() + shiftDays);
    shifting.push({ ...s, oldDate, newDate, isTrigger });
  });

  return { shifting, skipped };
}

function formatShortDate(date, isRTL) {
  try {
    return date.toLocaleDateString(isRTL ? "ar-EG" : "en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return "—";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS PICKER — كروت بصرية بدل الـ <select>
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  {
    value: "scheduled",
    labelAr: "مجدولة",
    labelEn: "Scheduled",
    hintAr: "هتفضل زي ما هي",
    hintEn: "Stays as is",
    icon: CalendarCheck,
    ring: "ring-blue-500",
    activeBg: "bg-blue-50 dark:bg-blue-900/20",
    activeText: "text-blue-700 dark:text-blue-300",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
  },
  {
    value: "completed",
    labelAr: "مكتملة",
    labelEn: "Completed",
    hintAr: "+٢ ساعة للمدرب",
    hintEn: "+2h to instructor",
    icon: CheckCircle2,
    ring: "ring-green-500",
    activeBg: "bg-green-50 dark:bg-green-900/20",
    activeText: "text-green-700 dark:text-green-300",
    iconBg: "bg-green-100 dark:bg-green-900/40",
  },
  {
    value: "postponed",
    labelAr: "مؤجلة",
    labelEn: "Postponed",
    hintAr: "تاريخ جديد + إشعار",
    hintEn: "New date + notice",
    icon: CalendarClock,
    ring: "ring-amber-500",
    activeBg: "bg-amber-50 dark:bg-amber-900/20",
    activeText: "text-amber-700 dark:text-amber-300",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
  },
  {
    value: "cancelled",
    labelAr: "ملغاة",
    labelEn: "Cancelled",
    hintAr: "الباقي يترحل أسبوع",
    hintEn: "Rest shifts a week",
    icon: XCircle,
    ring: "ring-red-500",
    activeBg: "bg-red-50 dark:bg-red-900/20",
    activeText: "text-red-700 dark:text-red-300",
    iconBg: "bg-red-100 dark:bg-red-900/40",
  },
];

function StatusPicker({ value, onChange, isRTL }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {STATUS_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative text-left rtl:text-right p-3 rounded-xl border-2 transition-all ${
              isActive
                ? `${opt.activeBg} border-transparent ring-2 ${opt.ring}`
                : "bg-white dark:bg-dark_input border-PowderBlueBorder dark:border-dark_border hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isActive ? opt.iconBg : "bg-gray-100 dark:bg-gray-800"}`}>
                <Icon className={`w-4 h-4 ${isActive ? opt.activeText : "text-gray-400"}`} />
              </div>
              <span className={`text-sm font-semibold ${isActive ? opt.activeText : "text-MidnightNavyText dark:text-white"}`}>
                {isRTL ? opt.labelAr : opt.labelEn}
              </span>
            </div>
            <p className={`text-[11px] leading-tight ${isActive ? opt.activeText : "text-gray-400"}`}>
              {isRTL ? opt.hintAr : opt.hintEn}
            </p>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CASCADE IMPACT STRIP — بيظهر بس لما الحالة = ملغاة، وبيوضح الأثر قبل الحفظ
// ✅ أول كارت (لو موجود) بيبقى للـ trigger نفسها، معلّم بشارة "دي اللي هتلغيها"
// ─────────────────────────────────────────────────────────────────────────────
function CascadeImpactStrip({ shifting, skipped, isRTL }) {
  if (shifting.length === 0 && skipped.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-PowderBlueBorder dark:border-dark_border text-xs text-gray-500">
        <Info className="w-3.5 h-3.5 shrink-0" />
        {isRTL ? "مفيش سيشنات هتتأثر" : "No sessions will be affected"}
      </div>
    );
  }

  const followingCount = shifting.filter((s) => !s.isTrigger).length;

  return (
    <div className="rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50/60 dark:bg-red-900/10 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-red-100/70 dark:bg-red-900/25 border-b border-red-200 dark:border-red-800/50">
        <ArrowLeftRight className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
        <p className="text-xs font-semibold text-red-700 dark:text-red-300">
          {isRTL
            ? `الجلسة هتترحل + ${followingCount} جلسة تالية هتترحلوا أسبوع لقدام`
            : `This session + ${followingCount} upcoming session(s) will shift forward a week`}
        </p>
      </div>

      <div className="p-2.5 flex gap-2 overflow-x-auto">
        {shifting.map((s) => (
          <div
            key={s.id}
            className={`shrink-0 min-w-[150px] bg-white dark:bg-dark_input rounded-lg border p-2 ${
              s.isTrigger ? "border-red-400 dark:border-red-600 ring-1 ring-red-300 dark:ring-red-700" : "border-red-200 dark:border-red-800/40"
            }`}
          >
            {s.isTrigger && (
              <span className="inline-block mb-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-600 text-white">
                {isRTL ? "دي اللي بتلغيها" : "You're cancelling this"}
              </span>
            )}
            <p className="text-xs font-medium text-MidnightNavyText dark:text-white truncate mb-1">
              {s.title}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-gray-500">
              <span className="line-through opacity-60">{formatShortDate(s.oldDate, isRTL)}</span>
              <span className="text-red-500">←</span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {formatShortDate(s.newDate, isRTL)}
              </span>
            </div>
          </div>
        ))}

        {skipped.map((s) => (
          <div
            key={s.id}
            className="shrink-0 min-w-[150px] bg-gray-50 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700 p-2 opacity-70"
          >
            <p className="text-xs font-medium text-gray-500 truncate mb-1">{s.title}</p>
            <div className="flex items-center gap-1 text-[11px] text-gray-400">
              <ShieldCheck className="w-3 h-3 shrink-0" />
              {s.status === "completed"
                ? (isRTL ? "مكتملة — مش هتتأثر" : "Completed — untouched")
                : (isRTL ? "ملغاة بالفعل — مش هتتأثر" : "Already cancelled — untouched")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function EditSessionModal({
  session,
  groupStudents,
  allSessions = [],
  onClose,
  onRefresh,
  isRTL,
  t,
}) {
  const [formData, setFormData] = useState({
    meetingLink:     session?.meetingLink     || "",
    recordingLink:   session?.recordingLink   || "",
    instructorNotes: session?.instructorNotes || "",
    status:          session?.status          || "scheduled",
    studentMessage:  "",
    guardianMessage: "",
    newDate:         "",
    newTime:         "",
  });

  const [previewStudentMessage,  setPreviewStudentMessage]  = useState("");
  const [previewGuardianMessage, setPreviewGuardianMessage] = useState("");
  const [showHints,       setShowHints]       = useState({ student: false, guardian: false });
  const [cursorPosition,  setCursorPosition]  = useState({ student: 0, guardian: 0 });
  const [selectedHintIndex, setSelectedHintIndex] = useState({ student: 0, guardian: 0 });
  const [selectedStudentForPreview, setSelectedStudentForPreview] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [manuallyEdited,   setManuallyEdited]   = useState({ student: false, guardian: false });
  const [saving,           setSaving]           = useState(false);
  const [savingTemplate,   setSavingTemplate]   = useState({ student: false, guardian: false });

  const [dbVars, setDbVars] = useState({});

  const studentTextareaRef  = useRef(null);
  const guardianTextareaRef = useRef(null);
  const hintsRef = useRef({ student: null, guardian: null });

  const showReasonField = formData.status === "cancelled" || formData.status === "postponed";
  const isPostponed     = formData.status === "postponed";
  const isCancelling    = formData.status === "cancelled" && session?.status !== "cancelled";

  // ── Cascade preview (client-side, no extra API call) ───────────────────────
  const cascadePreview = useMemo(() => {
    if (!isCancelling) return { shifting: [], skipped: [] };
    return getShiftedChainPreview(allSessions, session, 7);
  }, [isCancelling, allSessions, session]);

  // ── Fetch DB template variables on mount ──────────────────────────────────
  useEffect(() => {
    fetch("/api/whatsapp/template-variables")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          const map = {};
          data.data.forEach((v) => { map[v.key] = v; });
          setDbVars(map);
        }
      })
      .catch((err) => console.error("❌ Failed to load template variables:", err));
  }, []);

  // ── Close hints on outside click ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (hintsRef.current.student  && !hintsRef.current.student.contains(e.target))
        setShowHints((prev) => ({ ...prev, student: false }));
      if (hintsRef.current.guardian && !hintsRef.current.guardian.contains(e.target))
        setShowHints((prev) => ({ ...prev, guardian: false }));
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Select first student by default ──────────────────────────────────────
  useEffect(() => {
    if (groupStudents.length > 0 && !selectedStudentForPreview) {
      setSelectedStudentForPreview(groupStudents[0]);
    }
  }, [groupStudents]);

  // ── Fetch templates from backend ──────────────────────────────────────────
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!showReasonField || !selectedStudentForPreview) return;
      if (manuallyEdited.student && manuallyEdited.guardian) return;

      setLoadingTemplates(true);
      try {
        const eventType =
          formData.status === "cancelled" ? "session_cancelled" : "session_postponed";

        const res = await fetch(`/api/sessions/${session.id}/templates`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            eventType,
            studentId: selectedStudentForPreview._id,
            extraData: {
              newDate:     formData.newDate,
              newTime:     formData.newTime,
              meetingLink: formData.meetingLink,
            },
          }),
        });

        const json = await res.json();
        if (json.success) {
          if (!manuallyEdited.student && json.data.student) {
            setFormData((prev) => ({
              ...prev,
              studentMessage: json.data.student.rawContent || json.data.student.content || "",
            }));
          }
          if (!manuallyEdited.guardian && json.data.guardian) {
            setFormData((prev) => ({
              ...prev,
              guardianMessage: json.data.guardian.rawContent || json.data.guardian.content || "",
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching templates:", error);
        toast.error(isRTL ? "فشل تحميل القوالب" : "Failed to load templates");
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, [formData.status, selectedStudentForPreview?._id, formData.newDate, formData.newTime]);

  // ── Live preview ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedStudentForPreview) return;
    const vars = buildVariables(selectedStudentForPreview, session, formData, dbVars);
    setPreviewStudentMessage(renderTemplate(formData.studentMessage,  vars));
    setPreviewGuardianMessage(renderTemplate(formData.guardianMessage, vars));
  }, [
    formData.studentMessage,
    formData.guardianMessage,
    formData.meetingLink,
    formData.newDate,
    formData.newTime,
    selectedStudentForPreview,
    session,
    dbVars,
  ]);

  // ── Save template to DB ───────────────────────────────────────────────────
  const saveTemplateToDatabase = useCallback(
    async (type, content) => {
      if (!selectedStudentForPreview || !content?.trim()) return;
      setSavingTemplate((prev) => ({ ...prev, [type]: true }));

      try {
        let templateType = "";
        if (formData.status === "cancelled") {
          templateType =
            type === "student" ? "session_cancelled_student" : "session_cancelled_guardian";
        } else if (formData.status === "postponed") {
          templateType =
            type === "student" ? "session_postponed_student" : "session_postponed_guardian";
        } else return;

        const recipientType = type === "student" ? "student" : "guardian";
        const studentLang =
          selectedStudentForPreview.communicationPreferences?.preferredLanguage || "ar";

        const templateName =
          formData.status === "cancelled"
            ? type === "student" ? "Session Cancelled - Student" : "Session Cancelled - Guardian"
            : type === "student" ? "Session Postponed - Student" : "Session Postponed - Guardian";

        const searchRes  = await fetch(
          `/api/message-templates?type=${templateType}&recipient=${recipientType}&default=true`
        );
        const searchJson = await searchRes.json();

        if (searchJson.success && searchJson.data.length > 0) {
          const existing    = searchJson.data[0];
          const updateData  = {
            id:        existing._id,
            name:      templateName,
            isDefault: true,
            updatedAt: new Date(),
            ...(studentLang === "ar"
              ? { contentAr: content, contentEn: existing.contentEn || "" }
              : { contentEn: content, contentAr: existing.contentAr || "" }),
          };

          const res  = await fetch("/api/message-templates", {
            method:  "PUT",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(updateData),
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.error || "Update failed");
        } else {
          const newTemplate = {
            templateType,
            recipientType,
            name:        templateName,
            description: `${formData.status} notification for ${recipientType}`,
            isDefault:   true,
            isActive:    true,
            variables: [
              { key: "guardianSalutation", label: "Guardian Salutation" },
              { key: "studentSalutation",  label: "Student Salutation"  },
              { key: "studentName",        label: "Student Name"        },
              { key: "guardianName",       label: "Guardian Name"       },
              { key: "childTitle",         label: "Son/Daughter"        },
              { key: "sessionName",        label: "Session Name"        },
              { key: "date",               label: "Date"                },
              { key: "time",               label: "Time"                },
              { key: "meetingLink",        label: "Meeting Link"        },
              { key: "enrollmentNumber",   label: "Enrollment Number"   },
              ...(formData.status === "postponed"
                ? [
                    { key: "newDate", label: "New Date" },
                    { key: "newTime", label: "New Time" },
                  ]
                : []),
            ],
            ...(studentLang === "ar"
              ? { contentAr: content, contentEn: "" }
              : { contentEn: content, contentAr: "" }),
          };

          const res  = await fetch("/api/message-templates", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(newTemplate),
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.error || "Creation failed");
        }

        toast.success(
          isRTL
            ? `✅ تم حفظ القالب (${studentLang === "ar" ? "عربي" : "إنجليزي"})`
            : `✅ Template (${studentLang === "ar" ? "Arabic" : "English"}) saved`
        );
      } catch (error) {
        console.error("Error saving template:", error);
        toast.error(
          isRTL
            ? "فشل حفظ القالب: " + error.message
            : "Failed to save template: " + error.message
        );
      } finally {
        setSavingTemplate((prev) => ({ ...prev, [type]: false }));
      }
    },
    [formData.status, selectedStudentForPreview, isRTL]
  );

  // ── Salutation preview card ───────────────────────────────────────────────
  const salutationPreview = useMemo(() => {
    if (!selectedStudentForPreview) return null;
    return buildVariables(selectedStudentForPreview, session, formData, dbVars);
  }, [selectedStudentForPreview, session, formData, dbVars]);

  // ── Available variables for hints ─────────────────────────────────────────
  const availableVariables = useMemo(() => {
    const vars = [
      { key: "{guardianSalutation}", label: isRTL ? "تحية ولي الأمر" : "Guardian Salutation", icon: "👤" },
      { key: "{studentSalutation}",  label: isRTL ? "تحية الطالب"    : "Student Salutation",  icon: "👶" },
      { key: "{studentName}",        label: isRTL ? "اسم الطالب"     : "Student Name",         icon: "👶" },
      { key: "{guardianName}",       label: isRTL ? "اسم ولي الأمر"  : "Guardian Name",        icon: "👤" },
      { key: "{childTitle}",         label: isRTL ? "ابنك/ابنتك"     : "Son/Daughter",         icon: "👪" },
      { key: "{sessionName}",        label: isRTL ? "اسم الجلسة"     : "Session Name",         icon: "📘" },
      { key: "{date}",               label: isRTL ? "التاريخ"        : "Date",                 icon: "📅" },
      { key: "{time}",               label: isRTL ? "الوقت"          : "Time",                 icon: "⏰" },
      { key: "{meetingLink}",        label: isRTL ? "رابط الاجتماع"  : "Meeting Link",         icon: "🔗" },
      { key: "{enrollmentNumber}",   label: isRTL ? "الرقم التعريفي" : "Enrollment No.",       icon: "🔢" },
    ];
    if (isPostponed) {
      vars.push(
        { key: "{newDate}", label: isRTL ? "التاريخ الجديد" : "New Date", icon: "📅" },
        { key: "{newTime}", label: isRTL ? "الوقت الجديد"   : "New Time", icon: "⏰" }
      );
    }
    return vars;
  }, [isRTL, isPostponed]);

  // ── Generic insert variable ───────────────────────────────────────────────
  const insertVariable = useCallback(
    (type, variable) => {
      const isStudent  = type === "student";
      const textarea   = isStudent ? studentTextareaRef.current : guardianTextareaRef.current;
      const currentVal = isStudent ? formData.studentMessage : formData.guardianMessage;
      const cursorPos  = isStudent ? cursorPosition.student  : cursorPosition.guardian;

      if (!textarea) return;

      const before = currentVal.substring(0, cursorPos);
      const lastAt = before.lastIndexOf("@");

      let newValue, newCursor;
      if (lastAt !== -1) {
        newValue  = currentVal.substring(0, lastAt) + variable.key + currentVal.substring(cursorPos);
        newCursor = lastAt + variable.key.length;
      } else {
        newValue  = currentVal.substring(0, cursorPos) + variable.key + currentVal.substring(cursorPos);
        newCursor = cursorPos + variable.key.length;
      }

      const field = isStudent ? "studentMessage" : "guardianMessage";
      setFormData((prev) => ({ ...prev, [field]: newValue }));
      setManuallyEdited((prev) => ({ ...prev, [type]: true }));
      setShowHints((prev) => ({ ...prev, [type]: false }));

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursor, newCursor);
      }, 0);
    },
    [formData.studentMessage, formData.guardianMessage, cursorPosition]
  );

  // ── Textarea handlers ─────────────────────────────────────────────────────
  const handleInput = useCallback(
    (e, type) => {
      const value     = e.target.value;
      const cursorPos = e.target.selectionStart;
      const field     = type === "student" ? "studentMessage" : "guardianMessage";

      setFormData((prev) => ({ ...prev, [field]: value }));
      setManuallyEdited((prev) => ({ ...prev, [type]: true }));
      setCursorPosition((prev) => ({ ...prev, [type]: cursorPos }));

      const lastAt = value.substring(0, cursorPos).lastIndexOf("@");
      if (lastAt !== -1 && lastAt === cursorPos - 1) {
        setShowHints((prev)         => ({ ...prev, [type]: true }));
        setSelectedHintIndex((prev) => ({ ...prev, [type]: 0   }));
      } else {
        setShowHints((prev) => ({ ...prev, [type]: false }));
      }
    },
    []
  );

  const handleKeyDown = useCallback(
    (e, type) => {
      if (!showHints[type]) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedHintIndex((prev) => ({
          ...prev,
          [type]: (prev[type] + 1) % availableVariables.length,
        }));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedHintIndex((prev) => ({
          ...prev,
          [type]: (prev[type] - 1 + availableVariables.length) % availableVariables.length,
        }));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertVariable(type, availableVariables[selectedHintIndex[type]]);
      } else if (e.key === "Escape") {
        setShowHints((prev) => ({ ...prev, [type]: false }));
      }
    },
    [showHints, selectedHintIndex, availableVariables, insertVariable]
  );

  // ── Change preview student ────────────────────────────────────────────────
  const handleStudentPreviewChange = useCallback(
    async (studentId) => {
      const student = groupStudents.find((s) => s._id === studentId);
      if (!student) return;
      setSelectedStudentForPreview(student);

      if (!manuallyEdited.student || !manuallyEdited.guardian) {
        setLoadingTemplates(true);
        try {
          const eventType =
            formData.status === "cancelled" ? "session_cancelled" : "session_postponed";
          const res  = await fetch(`/api/sessions/${session.id}/templates`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ eventType, studentId: student._id }),
          });
          const json = await res.json();
          if (json.success) {
            if (!manuallyEdited.student && json.data.student) {
              setFormData((prev) => ({
                ...prev,
                studentMessage: json.data.student.rawContent || json.data.student.content || "",
              }));
            }
            if (!manuallyEdited.guardian && json.data.guardian) {
              setFormData((prev) => ({
                ...prev,
                guardianMessage: json.data.guardian.rawContent || json.data.guardian.content || "",
              }));
            }
          }
        } catch (error) {
          console.error("Error fetching templates:", error);
        } finally {
          setLoadingTemplates(false);
        }
      }
    },
    [groupStudents, manuallyEdited, formData.status, session.id]
  );

  // ── Reset to defaults ─────────────────────────────────────────────────────
  const resetToDefault = useCallback(async () => {
    if (!selectedStudentForPreview) return;
    setLoadingTemplates(true);
    try {
      const eventType =
        formData.status === "cancelled" ? "session_cancelled" : "session_postponed";
      const res  = await fetch(`/api/sessions/${session.id}/templates`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          eventType,
          studentId: selectedStudentForPreview._id,
          extraData: {
            newDate:     formData.newDate,
            newTime:     formData.newTime,
            meetingLink: formData.meetingLink,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFormData((prev) => ({
          ...prev,
          studentMessage:  json.data.student?.rawContent  || json.data.student?.content  || "",
          guardianMessage: json.data.guardian?.rawContent || json.data.guardian?.content || "",
        }));
        setManuallyEdited({ student: false, guardian: false });
        toast.success(isRTL ? "تم استعادة القوالب الافتراضية" : "Default templates restored");
      }
    } catch (error) {
      console.error("Error resetting templates:", error);
      toast.error(isRTL ? "فشل استعادة القوالب" : "Failed to reset templates");
    } finally {
      setLoadingTemplates(false);
    }
  }, [
    selectedStudentForPreview,
    formData.status,
    formData.newDate,
    formData.newTime,
    formData.meetingLink,
    session.id,
    isRTL,
  ]);

  // ── Hints dropdown renderer ───────────────────────────────────────────────
  const renderHints = (type) => {
    if (!showHints[type]) return null;
    const isStudent = type === "student";
    const color     = isStudent ? "blue" : "purple";
    return (
      <div
        ref={(el) => (hintsRef.current[type] = el)}
        className={`absolute z-50 w-full mt-1 bg-white dark:bg-darkmode border-2 border-${color}-300 dark:border-${color}-700 rounded-lg shadow-xl max-h-56 overflow-y-auto`}
      >
        <div className={`px-3 py-1.5 bg-${color}-50 dark:bg-${color}-900/30 border-b dark:border-${color}-800`}>
          <p className={`text-xs font-semibold text-${color}-700 dark:text-${color}-300 flex items-center gap-1`}>
            <Zap className="w-3 h-3" />
            {isRTL ? "المتغيرات المتاحة" : "Available Variables"}
          </p>
        </div>
        {availableVariables.map((v, i) => (
          <button
            key={v.key}
            type="button"
            onClick={() => insertVariable(type, v)}
            className={`w-full px-3 py-2 text-right hover:bg-${color}-50 dark:hover:bg-${color}-900/20 flex items-center gap-2 ${
              i === selectedHintIndex[type] ? `bg-${color}-100 dark:bg-${color}-900/40` : ""
            }`}
          >
            <span>{v.icon}</span>
            <div className="flex-1 flex items-center justify-between">
              <span className={`text-sm font-mono text-${color}-600 dark:text-${color}-400`}>
                {v.key}
              </span>
              <span className="text-xs text-gray-500">{v.label}</span>
            </div>
          </button>
        ))}
        <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-t text-xs text-gray-400">
          ↑↓ {isRTL ? "للتنقل" : "navigate"} · Enter{" "}
          {isRTL ? "للإدراج" : "insert"} · Esc {isRTL ? "إغلاق" : "close"}
        </div>
      </div>
    );
  };

  // ── Save session ──────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (
      showReasonField &&
      (!formData.studentMessage?.trim() || !formData.guardianMessage?.trim())
    ) {
      toast.error(isRTL ? "الرجاء كتابة الرسالتين" : "Please write both messages");
      return;
    }

    setSaving(true);
    try {
      const studentMessages  = {};
      const guardianMessages = {};

      if (showReasonField) {
        groupStudents.forEach((student) => {
          const sid  = student._id.toString();
          const vars = buildVariables(student, session, formData, dbVars);
          studentMessages[sid]  = renderTemplate(formData.studentMessage,  vars);
          guardianMessages[sid] = renderTemplate(formData.guardianMessage, vars);
        });
      }

      const res = await fetch(`/api/sessions/${session.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          meetingLink:     formData.meetingLink,
          recordingLink:   formData.recordingLink,
          instructorNotes: formData.instructorNotes,
          status:          formData.status,
          newDate:         isPostponed ? formData.newDate : null,
          newTime:         isPostponed ? formData.newTime : null,
          metadata: showReasonField
            ? { studentMessages, guardianMessages }
            : {},
        }),
      });

      const json = await res.json();
      if (json.success) {
        if (json.cascade?.shiftedCount > 0) {
          toast.success(
            isRTL
              ? `تم الإلغاء، وترحيل ${json.cascade.shiftedCount} جلسة تالية أسبوعًا لقدام`
              : `Cancelled — ${json.cascade.shiftedCount} upcoming session(s) shifted forward a week`
          );
        } else {
          toast.success(isRTL ? "تم تحديث الجلسة بنجاح" : "Session updated successfully");
        }
        onClose();
        onRefresh();
      } else {
        toast.error(json.error || (isRTL ? "فشل التحديث" : "Update failed"));
      }
    } catch (error) {
      console.error("Error saving session:", error);
      toast.error(isRTL ? "حدث خطأ" : "An error occurred");
    } finally {
      setSaving(false);
    }
  }, [
    formData,
    showReasonField,
    isPostponed,
    session,
    groupStudents,
    dbVars,
    isRTL,
    onClose,
    onRefresh,
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white dark:bg-darkmode rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* ── Header ── */}
        <div className="p-6 border-b border-PowderBlueBorder dark:border-dark_border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-MidnightNavyText dark:text-white">
              {isRTL
                ? `تعديل الجلسة - ${session?.title}`
                : `Edit Session - ${session?.title}`}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {session?.scheduledDate
                ? new Date(session.scheduledDate).toLocaleDateString(
                    isRTL ? "ar-EG" : "en-US",
                    { weekday: "short", year: "numeric", month: "short", day: "numeric" }
                  )
                : ""}{" "}
              - {session?.startTime} {isRTL ? "إلى" : "to"} {session?.endTime}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Status — visual picker */}
          <div>
            <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
              {isRTL ? "الحالة" : "Status"}
            </label>
            <StatusPicker
              value={formData.status}
              isRTL={isRTL}
              onChange={(val) => {
                setFormData((prev) => ({ ...prev, status: val }));
                setManuallyEdited({ student: false, guardian: false });
              }}
            />
          </div>

          {/* ✅ Cascade impact — بيظهر فورًا لما تختار "ملغاة" */}
          {isCancelling && (
            <CascadeImpactStrip
              shifting={cascadePreview.shifting}
              skipped={cascadePreview.skipped}
              isRTL={isRTL}
            />
          )}

          {/* Meeting Link */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
              <Link2 className="w-4 h-4" />
              {isRTL ? "رابط الاجتماع" : "Meeting Link"}
            </label>
            <input
              type="url"
              value={formData.meetingLink}
              onChange={(e) => setFormData((prev) => ({ ...prev, meetingLink: e.target.value }))}
              placeholder={isRTL ? "أدخل رابط الاجتماع" : "Enter meeting link"}
              className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
            />
          </div>

          {/* Recording Link */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
              <VideoIcon className="w-4 h-4" />
              {isRTL ? "رابط التسجيل" : "Recording Link"}
            </label>
            <input
              type="url"
              value={formData.recordingLink}
              onChange={(e) => setFormData((prev) => ({ ...prev, recordingLink: e.target.value }))}
              placeholder={isRTL ? "أدخل رابط التسجيل" : "Enter recording link"}
              className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
            />
          </div>

          {/* New Date/Time — Postponed only */}
          {isPostponed && (
            <div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
                    {isRTL ? "التاريخ الجديد" : "New Date"}
                  </label>
                  <input
                    type="date"
                    value={formData.newDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, newDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
                    {isRTL ? "الوقت الجديد" : "New Time"}
                  </label>
                  <input
                    type="time"
                    value={formData.newTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, newTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
                  />
                </div>
              </div>
              {formData.newDate && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  {isRTL
                    ? "هيتحفظ في قاعدة البيانات فورًا بمجرد الحفظ — مدة الجلسة (من-إلى) هتفضل زي ما هي"
                    : "Will be saved to the database immediately — session duration stays the same"}
                </p>
              )}
            </div>
          )}

          {/* ── Messages (cancelled / postponed only) ── */}
          {showReasonField && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-5">

              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  {isRTL ? "رسائل الإشعار" : "Notification Messages"}
                </h3>
                <button
                  onClick={resetToDefault}
                  disabled={loadingTemplates}
                  className="px-3 py-1 text-xs bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingTemplates ? "animate-spin" : ""}`} />
                  {isRTL ? "استعادة القوالب" : "Reset Templates"}
                </button>
              </div>

              {/* Student selector */}
              {groupStudents.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block">
                    {isRTL ? "اختر طالباً لمعاينة الرسالة:" : "Select student to preview:"}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {groupStudents.map((student) => {
                      const isSelected =
                        selectedStudentForPreview?._id?.toString() === student._id?.toString();
                      const lang   = student.communicationPreferences?.preferredLanguage || "ar";
                      const gender = (student.personalInfo?.gender || "male").toLowerCase();
                      const rel    = (student.guardianInfo?.relationship || "father").toLowerCase();
                      return (
                        <button
                          key={student._id}
                          onClick={() => handleStudentPreviewChange(student._id)}
                          disabled={loadingTemplates}
                          className={`px-3 py-1.5 text-xs rounded-full border transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-primary text-white border-primary"
                              : "border-gray-300 dark:border-gray-600 hover:border-primary/50 text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          <span>{gender === "female" ? "👧" : "👦"}</span>
                          <span>{student.personalInfo?.fullName?.split(" ")[0]}</span>
                          <span className="opacity-70">{lang === "ar" ? "🇸🇦" : "🇬🇧"}</span>
                          <span className="opacity-70">{rel === "mother" ? "👩" : "👨"}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Salutation preview card */}
                  {salutationPreview && (
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700 space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-600 dark:text-blue-400 font-medium w-28 shrink-0">
                          👶 {isRTL ? "تحية الطالب:" : "Student:"}
                        </span>
                        <span className="text-gray-800 dark:text-gray-200 font-semibold">
                          {salutationPreview.studentSalutation}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-purple-600 dark:text-purple-400 font-medium w-28 shrink-0">
                          👪 {isRTL ? "تحية ولي الأمر:" : "Guardian:"}
                        </span>
                        <span className="text-gray-800 dark:text-gray-200 font-semibold">
                          {salutationPreview.guardianSalutation}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 dark:text-green-400 font-medium w-28 shrink-0">
                          👶 {isRTL ? "ابنك/ابنتك:" : "Child title:"}
                        </span>
                        <span className="text-gray-800 dark:text-gray-200 font-semibold">
                          {salutationPreview.childTitle}
                        </span>
                      </div>
                      {(manuallyEdited.student || manuallyEdited.guardian) && (
                        <p className="text-orange-500 dark:text-orange-400 flex items-center gap-1 mt-1">
                          ✏️ {isRTL ? "الرسائل معدلة يدوياً" : "Messages manually edited"}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Student Message ── */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
                    {isRTL ? "رسالة للطالب 👶" : "Student Message 👶"}
                  </h4>
                  {loadingTemplates && (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500" />
                  )}
                </div>

                <div className="relative">
                  <textarea
                    ref={studentTextareaRef}
                    value={formData.studentMessage}
                    onChange={(e) => handleInput(e, "student")}
                    onKeyDown={(e) => handleKeyDown(e, "student")}
                    onSelect={(e) =>
                      setCursorPosition((prev) => ({ ...prev, student: e.target.selectionStart }))
                    }
                    placeholder={isRTL ? "اكتب @ لإظهار المتغيرات..." : "Type @ for variables..."}
                    className="w-full px-3 py-2.5 border-2 border-blue-200 dark:border-blue-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white resize-none h-36 font-mono text-sm"
                    dir={
                      (selectedStudentForPreview?.communicationPreferences?.preferredLanguage || "ar") === "ar"
                        ? "rtl" : "ltr"
                    }
                  />
                  {renderHints("student")}
                </div>

                {previewStudentMessage && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700 overflow-hidden">
                    <div className="bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 border-b flex items-center gap-2">
                      <MessageCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                        {isRTL ? "معاينة رسالة الطالب" : "Student Preview"}
                      </span>
                    </div>
                    <div
                      className="p-3 text-sm whitespace-pre-wrap break-words max-h-48 overflow-y-auto"
                      dir={
                        (selectedStudentForPreview?.communicationPreferences?.preferredLanguage || "ar") === "ar"
                          ? "rtl" : "ltr"
                      }
                    >
                      {previewStudentMessage}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Guardian Message ── */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100 text-sm">
                    {isRTL ? "رسالة لولي الأمر 👤" : "Guardian Message 👤"}
                  </h4>
                </div>

                <div className="relative">
                  <textarea
                    ref={guardianTextareaRef}
                    value={formData.guardianMessage}
                    onChange={(e) => handleInput(e, "guardian")}
                    onKeyDown={(e) => handleKeyDown(e, "guardian")}
                    onSelect={(e) =>
                      setCursorPosition((prev) => ({ ...prev, guardian: e.target.selectionStart }))
                    }
                    placeholder={isRTL ? "اكتب @ لإظهار المتغيرات..." : "Type @ for variables..."}
                    className="w-full px-3 py-2.5 border-2 border-purple-200 dark:border-purple-700 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white resize-none h-36 font-mono text-sm"
                    dir={
                      (selectedStudentForPreview?.communicationPreferences?.preferredLanguage || "ar") === "ar"
                        ? "rtl" : "ltr"
                    }
                  />
                  {renderHints("guardian")}
                </div>

                {previewGuardianMessage && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700 overflow-hidden">
                    <div className="bg-purple-50 dark:bg-purple-900/30 px-3 py-1.5 border-b flex items-center gap-2">
                      <MessageCircle className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                        {isRTL ? "معاينة رسالة ولي الأمر" : "Guardian Preview"}
                      </span>
                    </div>
                    <div
                      className="p-3 text-sm whitespace-pre-wrap break-words max-h-48 overflow-y-auto"
                      dir={
                        (selectedStudentForPreview?.communicationPreferences?.preferredLanguage || "ar") === "ar"
                          ? "rtl" : "ltr"
                      }
                    >
                      {previewGuardianMessage}
                    </div>
                  </div>
                )}
              </div>

              {/* Save template buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                <button
                  onClick={() => saveTemplateToDatabase("student", formData.studentMessage)}
                  disabled={!formData.studentMessage || savingTemplate.student || loadingTemplates}
                  className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {savingTemplate.student ? (
                    <><RefreshCw className="w-3 h-3 animate-spin" /> {isRTL ? "جاري الحفظ..." : "Saving..."}</>
                  ) : (
                    <><Save className="w-3 h-3" /> {isRTL ? "حفظ قالب الطالب" : "Save Student Template"}</>
                  )}
                </button>
                <button
                  onClick={() => saveTemplateToDatabase("guardian", formData.guardianMessage)}
                  disabled={!formData.guardianMessage || savingTemplate.guardian || loadingTemplates}
                  className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {savingTemplate.guardian ? (
                    <><RefreshCw className="w-3 h-3 animate-spin" /> {isRTL ? "جاري الحفظ..." : "Saving..."}</>
                  ) : (
                    <><Save className="w-3 h-3" /> {isRTL ? "حفظ قالب ولي الأمر" : "Save Guardian Template"}</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Instructor Notes */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
              <FileText className="w-4 h-4" />
              {isRTL ? "ملاحظات المدرب" : "Instructor Notes"}
            </label>
            <textarea
              value={formData.instructorNotes}
              onChange={(e) => setFormData((prev) => ({ ...prev, instructorNotes: e.target.value }))}
              placeholder={isRTL ? "أضف ملاحظات للمدرب..." : "Add instructor notes..."}
              rows={3}
              className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white resize-none"
              dir={isRTL ? "rtl" : "ltr"}
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="p-6 border-t border-PowderBlueBorder dark:border-dark_border flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-gray-50 dark:hover:bg-dark_input"
          >
            {isRTL ? "إلغاء" : "Cancel"}
          </button>
          <button
            onClick={handleSave}
            disabled={
              saving ||
              loadingTemplates ||
              (showReasonField &&
                (!formData.studentMessage?.trim() || !formData.guardianMessage?.trim()))
            }
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                {isRTL ? "جاري الحفظ..." : "Saving..."}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isRTL ? "حفظ التغييرات" : "Save Changes"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}