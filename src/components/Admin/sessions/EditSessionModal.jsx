"use client";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import toast from "react-hot-toast";
import {
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
  Clock,
  CheckCircle2,
  XCircle,
  CalendarClock,
  CalendarCheck,
  ArrowLeftRight,
  ShieldCheck,
  PauseCircle,
} from "lucide-react";
import ModalShell from "./ModalShell";

// ─────────────────────────────────────────────────────────────────────────────
// resolveVar / buildVariables / renderTemplate — unchanged business logic
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

function buildVariables(student, session, formData, dbVars = {}) {
  if (!student) return {};
  const lang         = (student.communicationPreferences?.preferredLanguage || "ar").toLowerCase();
  const gender       = (student.personalInfo?.gender       || "male").toLowerCase().trim();
  const relationship = (student.guardianInfo?.relationship || "father").toLowerCase().trim();
  const isMale       = gender !== "female";
  const isFather     = relationship !== "mother";
  const genderCtx    = { studentGender: gender, guardianType: relationship };

  const studentFirstName =
    lang === "ar"
      ? student.personalInfo?.nickname?.ar?.trim()  || student.personalInfo?.fullName?.split(" ")[0] || "الطالب"
      : student.personalInfo?.nickname?.en?.trim()  || student.personalInfo?.fullName?.split(" ")[0] || "Student";

  const guardianFirstName =
    lang === "ar"
      ? student.guardianInfo?.nickname?.ar?.trim()  || student.guardianInfo?.name?.split(" ")[0]   || "ولي الأمر"
      : student.guardianInfo?.nickname?.en?.trim()  || student.guardianInfo?.name?.split(" ")[0]   || "Guardian";

  const salutationBase_ar =
    resolveVar(dbVars, "salutation_ar", "ar", genderCtx) || (isMale ? "عزيزي الطالب" : "عزيزتي الطالبة");
  const guardianSalBase_ar =
    resolveVar(dbVars, "guardianSalutation_ar", "ar", genderCtx) || (isFather ? "عزيزي الأستاذ" : "عزيزتي السيدة");
  const guardianSalBase_en =
    resolveVar(dbVars, "guardianSalutation_en", "en", genderCtx) || (isFather ? "Dear Mr." : "Dear Mrs.");
  const childTitleAr = resolveVar(dbVars, "childTitle", "ar", genderCtx) || (isMale ? "ابنك" : "ابنتك");
  const childTitleEn = resolveVar(dbVars, "childTitle", "en", genderCtx) || (isMale ? "your son" : "your daughter");

  const guardianSalutation_ar = `${guardianSalBase_ar} ${guardianFirstName}`;
  const guardianSalutation_en = `${guardianSalBase_en} ${guardianFirstName}`;
  const guardianSalutation    = lang === "ar" ? guardianSalutation_ar : guardianSalutation_en;

  const studentSalutation_ar  = `${salutationBase_ar} ${studentFirstName}`;
  const studentSalutation     = lang === "ar" ? studentSalutation_ar : `Dear ${studentFirstName}`;

  const salutation_ar = studentSalutation_ar;
  const salutation_en = `Dear ${studentFirstName}`;
  const childTitle = lang === "ar" ? childTitleAr : childTitleEn;

  const sessionDate = session?.scheduledDate
    ? new Date(session.scheduledDate).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "";

  const newDateFormatted = formData?.newDate
    ? new Date(formData.newDate).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : (lang === "ar" ? "التاريخ الجديد" : "New Date");

  return {
    studentSalutation, guardianSalutation, salutation: guardianSalutation,
    salutation_ar, salutation_en,
    studentName: studentFirstName,
    studentFullName: student.personalInfo?.fullName || "",
    guardianName: guardianFirstName,
    guardianFullName: student.guardianInfo?.name || "",
    childTitle,
    sessionName: session?.title || "",
    date: sessionDate,
    time: `${session?.startTime || ""} - ${session?.endTime || ""}`,
    meetingLink: formData?.meetingLink || session?.meetingLink || "",
    newDate: newDateFormatted,
    newTime: formData?.newTime || "",
    groupCode: session?.groupId?.code || "",
    groupName: session?.groupId?.name || "",
    enrollmentNumber: student.enrollmentNumber || "",
  };
}

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

function getShiftedChainPreview(allSessions, currentSession, shiftDays = 7) {
  if (!currentSession || !allSessions?.length) return { shifting: [], skipped: [] };

  const sameGroup = allSessions
    .filter((s) => {
      const sGroupId = typeof s.group === "object" ? s.group?.id : s.groupId;
      const curGroupId = typeof currentSession.group === "object" ? currentSession.group?.id : currentSession.groupId;
      return (sGroupId || s.groupId) === (curGroupId || currentSession.groupId) || s.group?.id === currentSession.group?.id;
    })
    .slice()
    .sort((a, b) => a.moduleIndex - b.moduleIndex || a.sessionNumber - b.sessionNumber);

  const hasCurrent = sameGroup.some((s) => s.id === currentSession.id);
  if (!hasCurrent) return { shifting: [], skipped: [] };

  const chain = sameGroup;
  const shifting = [];
  const skipped = [];

  chain.forEach((s) => {
    const isTrigger = s.id === currentSession.id;
    if (s.status === "completed") { skipped.push(s); return; }
    if (!isTrigger && s.status === "cancelled") { skipped.push(s); return; }

    const oldDate = new Date(s.scheduledDate);
    const newDate = new Date(oldDate);
    newDate.setDate(newDate.getDate() + shiftDays);
    shifting.push({ ...s, oldDate, newDate, isTrigger });
  });

  return { shifting, skipped };
}

function formatShortDate(date, isRTL) {
  try {
    return date.toLocaleDateString(isRTL ? "ar-EG" : "en-US", { weekday: "short", day: "numeric", month: "short" });
  } catch {
    return "—";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS PICKER — redesigned as a segmented row instead of 4 equal SaaS cards
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "scheduled", labelAr: "مجدولة", labelEn: "Scheduled", hintAr: "هتفضل زي ما هي", hintEn: "Stays as is", icon: CalendarCheck, accent: "sky" },
  { value: "completed", labelAr: "مكتملة", labelEn: "Completed", hintAr: "+٢ ساعة للمدرب", hintEn: "+2h to instructor", icon: CheckCircle2, accent: "emerald" },
  { value: "postponed", labelAr: "مؤجلة", labelEn: "Postponed", hintAr: "تاريخ جديد + إشعار", hintEn: "New date + notice", icon: CalendarClock, accent: "amber" },
  { value: "cancelled", labelAr: "ملغاة", labelEn: "Cancelled", hintAr: "الباقي يترحل أسبوع", hintEn: "Rest shifts a week", icon: XCircle, accent: "rose" },
];

const ACCENT_CLASSES = {
  sky:     { active: "border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300", icon: "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300" },
  emerald: { active: "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300", icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300" },
  amber:   { active: "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300", icon: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300" },
  rose:    { active: "border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300", icon: "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300" },
};

function StatusPicker({ value, onChange, isRTL, disabledValues = [] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {STATUS_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isActive = value === opt.value;
        const isDisabled = disabledValues.includes(opt.value);
        const c = ACCENT_CLASSES[opt.accent];

        return (
          <button
            key={opt.value}
            type="button"
            disabled={isDisabled}
            onClick={() => !isDisabled && onChange(opt.value)}
            title={isDisabled ? (isRTL ? "مقفول بسبب الـ Hold" : "Locked — group is on hold") : ""}
            className={`rounded-xl border p-3 text-left transition-all rtl:text-right ${
              isDisabled
                ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-40 dark:border-white/10 dark:bg-white/[0.02]"
                : isActive
                  ? `${c.active} shadow-sm`
                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-transparent dark:hover:border-white/20"
            }`}
          >
            <div className="mb-1.5 flex items-center gap-2">
              <div className={`flex h-6 w-6 items-center justify-center rounded-md ${isActive && !isDisabled ? c.icon : "bg-slate-100 text-slate-400 dark:bg-white/5"}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-semibold text-slate-800 dark:text-white">
                {isRTL ? opt.labelAr : opt.labelEn}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isDisabled ? (isRTL ? "مقفول (Hold)" : "Locked (Hold)") : (isRTL ? opt.hintAr : opt.hintEn)}
            </p>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CASCADE IMPACT STRIP
// ─────────────────────────────────────────────────────────────────────────────
function CascadeImpactStrip({ shifting, skipped, isRTL }) {
  if (shifting.length === 0 && skipped.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-white/10 dark:bg-white/[0.02]">
        <Info className="h-3.5 w-3.5 shrink-0" />
        {isRTL ? "مفيش سيشنات هتتأثر" : "No sessions will be affected"}
      </div>
    );
  }

  const followingCount = shifting.filter((s) => !s.isTrigger).length;

  return (
    <div className="overflow-hidden rounded-xl border border-rose-200 bg-rose-50/60 dark:border-rose-500/20 dark:bg-rose-500/5">
      <div className="flex items-center gap-2 border-b border-rose-200 bg-rose-100/70 px-3 py-2 dark:border-rose-500/20 dark:bg-rose-500/10">
        <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
        <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
          {isRTL
            ? `الجلسة هتترحل + ${followingCount} جلسة تانية هتترحل أسبوعًا لقدام`
            : `This session + ${followingCount} other session(s) shift forward a week`}
        </p>
      </div>
      <div className="flex gap-2 overflow-x-auto p-2.5">
        {shifting.map((s) => (
          <div
            key={s.id}
            className={`min-w-[150px] shrink-0 rounded-lg border bg-white p-2 dark:bg-[#171a24] ${
              s.isTrigger ? "border-rose-400 ring-1 ring-rose-300 dark:border-rose-500 dark:ring-rose-700" : "border-rose-200 dark:border-rose-500/20"
            }`}
          >
            {s.isTrigger && (
              <span className="mb-1 inline-block rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {isRTL ? "دي اللي بتلغيها" : "You're cancelling this"}
              </span>
            )}
            <p className="mb-1 truncate text-xs font-medium text-slate-800 dark:text-white">{s.title}</p>
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <span className="opacity-60 line-through">{formatShortDate(s.oldDate, isRTL)}</span>
              <span className="text-rose-500">←</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400">{formatShortDate(s.newDate, isRTL)}</span>
            </div>
          </div>
        ))}
        {skipped.map((s) => (
          <div key={s.id} className="min-w-[150px] shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-2 opacity-70 dark:border-white/10 dark:bg-white/[0.02]">
            <p className="mb-1 truncate text-xs font-medium text-slate-500">{s.title}</p>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <ShieldCheck className="h-3 w-3 shrink-0" />
              {s.status === "completed" ? (isRTL ? "مكتملة — مش هتتأثر" : "Completed — untouched") : (isRTL ? "ملغاة بالفعل" : "Already cancelled")}
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
export default function EditSessionModal({ session, groupStudents, allSessions = [], onClose, onRefresh, isRTL, t }) {
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

  const groupIsOnHold = !!session?.group?.isOnHold;

  const cascadePreview = useMemo(() => {
    if (!isCancelling || groupIsOnHold) return { shifting: [], skipped: [] };
    return getShiftedChainPreview(allSessions, session, 7);
  }, [isCancelling, groupIsOnHold, allSessions, session]);

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

  useEffect(() => {
    const handler = (e) => {
      if (hintsRef.current.student  && !hintsRef.current.student.contains(e.target)) setShowHints((prev) => ({ ...prev, student: false }));
      if (hintsRef.current.guardian && !hintsRef.current.guardian.contains(e.target)) setShowHints((prev) => ({ ...prev, guardian: false }));
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (groupStudents.length > 0 && !selectedStudentForPreview) {
      setSelectedStudentForPreview(groupStudents[0]);
    }
  }, [groupStudents]);

  useEffect(() => {
    if (groupIsOnHold) return;

    const fetchTemplates = async () => {
      if (!showReasonField || !selectedStudentForPreview) return;
      if (manuallyEdited.student && manuallyEdited.guardian) return;

      setLoadingTemplates(true);
      try {
        const eventType = formData.status === "cancelled" ? "session_cancelled" : "session_postponed";

        const res = await fetch(`/api/sessions/${session.id}/templates`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            eventType,
            studentId: selectedStudentForPreview._id,
            extraData: { newDate: formData.newDate, newTime: formData.newTime, meetingLink: formData.meetingLink },
          }),
        });

        const json = await res.json();
        if (json.success) {
          if (!manuallyEdited.student && json.data.student) {
            setFormData((prev) => ({ ...prev, studentMessage: json.data.student.rawContent || json.data.student.content || "" }));
          }
          if (!manuallyEdited.guardian && json.data.guardian) {
            setFormData((prev) => ({ ...prev, guardianMessage: json.data.guardian.rawContent || json.data.guardian.content || "" }));
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
  }, [formData.status, selectedStudentForPreview?._id, formData.newDate, formData.newTime, groupIsOnHold]);

  useEffect(() => {
    if (!selectedStudentForPreview) return;
    const vars = buildVariables(selectedStudentForPreview, session, formData, dbVars);
    setPreviewStudentMessage(renderTemplate(formData.studentMessage,  vars));
    setPreviewGuardianMessage(renderTemplate(formData.guardianMessage, vars));
  }, [formData.studentMessage, formData.guardianMessage, formData.meetingLink, formData.newDate, formData.newTime, selectedStudentForPreview, session, dbVars]);

  const saveTemplateToDatabase = useCallback(
    async (type, content) => {
      if (groupIsOnHold) {
        toast.error(isRTL ? "الجروب على Hold — مينفعش تحفظ قوالب" : "Group is on hold — can't save templates");
        return;
      }
      if (!selectedStudentForPreview || !content?.trim()) return;
      setSavingTemplate((prev) => ({ ...prev, [type]: true }));

      try {
        let templateType = "";
        if (formData.status === "cancelled") {
          templateType = type === "student" ? "session_cancelled_student" : "session_cancelled_guardian";
        } else if (formData.status === "postponed") {
          templateType = type === "student" ? "session_postponed_student" : "session_postponed_guardian";
        } else return;

        const recipientType = type === "student" ? "student" : "guardian";
        const studentLang = selectedStudentForPreview.communicationPreferences?.preferredLanguage || "ar";
        const templateName = formData.status === "cancelled"
          ? (type === "student" ? "Session Cancelled - Student" : "Session Cancelled - Guardian")
          : (type === "student" ? "Session Postponed - Student" : "Session Postponed - Guardian");

        const searchRes  = await fetch(`/api/message-templates?type=${templateType}&recipient=${recipientType}&default=true`);
        const searchJson = await searchRes.json();

        if (searchJson.success && searchJson.data.length > 0) {
          const existing    = searchJson.data[0];
          const updateData  = {
            id: existing._id, name: templateName, isDefault: true, updatedAt: new Date(),
            ...(studentLang === "ar" ? { contentAr: content, contentEn: existing.contentEn || "" } : { contentEn: content, contentAr: existing.contentAr || "" }),
          };
          const res  = await fetch("/api/message-templates", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updateData) });
          const json = await res.json();
          if (!json.success) throw new Error(json.error || "Update failed");
        } else {
          const newTemplate = {
            templateType, recipientType, name: templateName,
            description: `${formData.status} notification for ${recipientType}`,
            isDefault: true, isActive: true,
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
              ...(formData.status === "postponed" ? [{ key: "newDate", label: "New Date" }, { key: "newTime", label: "New Time" }] : []),
            ],
            ...(studentLang === "ar" ? { contentAr: content, contentEn: "" } : { contentEn: content, contentAr: "" }),
          };
          const res  = await fetch("/api/message-templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newTemplate) });
          const json = await res.json();
          if (!json.success) throw new Error(json.error || "Creation failed");
        }

        toast.success(isRTL ? `✅ تم حفظ القالب (${studentLang === "ar" ? "عربي" : "إنجليزي"})` : `✅ Template (${studentLang === "ar" ? "Arabic" : "English"}) saved`);
      } catch (error) {
        console.error("Error saving template:", error);
        toast.error(isRTL ? "فشل حفظ القالب: " + error.message : "Failed to save template: " + error.message);
      } finally {
        setSavingTemplate((prev) => ({ ...prev, [type]: false }));
      }
    },
    [formData.status, selectedStudentForPreview, isRTL, groupIsOnHold]
  );

  const salutationPreview = useMemo(() => {
    if (!selectedStudentForPreview) return null;
    return buildVariables(selectedStudentForPreview, session, formData, dbVars);
  }, [selectedStudentForPreview, session, formData, dbVars]);

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
      vars.push({ key: "{newDate}", label: isRTL ? "التاريخ الجديد" : "New Date", icon: "📅" }, { key: "{newTime}", label: isRTL ? "الوقت الجديد" : "New Time", icon: "⏰" });
    }
    return vars;
  }, [isRTL, isPostponed]);

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

      setTimeout(() => { textarea.focus(); textarea.setSelectionRange(newCursor, newCursor); }, 0);
    },
    [formData.studentMessage, formData.guardianMessage, cursorPosition]
  );

  const handleInput = useCallback((e, type) => {
    const value     = e.target.value;
    const cursorPos = e.target.selectionStart;
    const field     = type === "student" ? "studentMessage" : "guardianMessage";

    setFormData((prev) => ({ ...prev, [field]: value }));
    setManuallyEdited((prev) => ({ ...prev, [type]: true }));
    setCursorPosition((prev) => ({ ...prev, [type]: cursorPos }));

    const lastAt = value.substring(0, cursorPos).lastIndexOf("@");
    if (lastAt !== -1 && lastAt === cursorPos - 1) {
      setShowHints((prev) => ({ ...prev, [type]: true }));
      setSelectedHintIndex((prev) => ({ ...prev, [type]: 0 }));
    } else {
      setShowHints((prev) => ({ ...prev, [type]: false }));
    }
  }, []);

  const handleKeyDown = useCallback(
    (e, type) => {
      if (!showHints[type]) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedHintIndex((prev) => ({ ...prev, [type]: (prev[type] + 1) % availableVariables.length }));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedHintIndex((prev) => ({ ...prev, [type]: (prev[type] - 1 + availableVariables.length) % availableVariables.length }));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertVariable(type, availableVariables[selectedHintIndex[type]]);
      } else if (e.key === "Escape") {
        setShowHints((prev) => ({ ...prev, [type]: false }));
      }
    },
    [showHints, selectedHintIndex, availableVariables, insertVariable]
  );

  const handleStudentPreviewChange = useCallback(
    async (studentId) => {
      const student = groupStudents.find((s) => s._id === studentId);
      if (!student) return;
      setSelectedStudentForPreview(student);
      if (groupIsOnHold) return;

      if (!manuallyEdited.student || !manuallyEdited.guardian) {
        setLoadingTemplates(true);
        try {
          const eventType = formData.status === "cancelled" ? "session_cancelled" : "session_postponed";
          const res  = await fetch(`/api/sessions/${session.id}/templates`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType, studentId: student._id }) });
          const json = await res.json();
          if (json.success) {
            if (!manuallyEdited.student && json.data.student) setFormData((prev) => ({ ...prev, studentMessage: json.data.student.rawContent || json.data.student.content || "" }));
            if (!manuallyEdited.guardian && json.data.guardian) setFormData((prev) => ({ ...prev, guardianMessage: json.data.guardian.rawContent || json.data.guardian.content || "" }));
          }
        } catch (error) {
          console.error("Error fetching templates:", error);
        } finally {
          setLoadingTemplates(false);
        }
      }
    },
    [groupStudents, manuallyEdited, formData.status, session.id, groupIsOnHold]
  );

  const resetToDefault = useCallback(async () => {
    if (groupIsOnHold) return;
    if (!selectedStudentForPreview) return;
    setLoadingTemplates(true);
    try {
      const eventType = formData.status === "cancelled" ? "session_cancelled" : "session_postponed";
      const res  = await fetch(`/api/sessions/${session.id}/templates`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType, studentId: selectedStudentForPreview._id, extraData: { newDate: formData.newDate, newTime: formData.newTime, meetingLink: formData.meetingLink } }),
      });
      const json = await res.json();
      if (json.success) {
        setFormData((prev) => ({ ...prev, studentMessage: json.data.student?.rawContent || json.data.student?.content || "", guardianMessage: json.data.guardian?.rawContent || json.data.guardian?.content || "" }));
        setManuallyEdited({ student: false, guardian: false });
        toast.success(isRTL ? "تم استعادة القوالب الافتراضية" : "Default templates restored");
      }
    } catch (error) {
      console.error("Error resetting templates:", error);
      toast.error(isRTL ? "فشل استعادة القوالب" : "Failed to reset templates");
    } finally {
      setLoadingTemplates(false);
    }
  }, [selectedStudentForPreview, formData.status, formData.newDate, formData.newTime, formData.meetingLink, session.id, isRTL, groupIsOnHold]);

  const renderHints = (type) => {
    if (!showHints[type]) return null;
    return (
      <div ref={(el) => (hintsRef.current[type] = el)} className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-indigo-200 bg-white shadow-xl dark:border-indigo-500/30 dark:bg-[#171a24]">
        <div className="border-b border-indigo-100 bg-indigo-50 px-3 py-1.5 dark:border-indigo-500/10 dark:bg-indigo-500/10">
          <p className="flex items-center gap-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
            <Zap className="h-3 w-3" /> {isRTL ? "المتغيرات المتاحة" : "Available Variables"}
          </p>
        </div>
        {availableVariables.map((v, i) => (
          <button
            key={v.key}
            type="button"
            onClick={() => insertVariable(type, v)}
            className={`flex w-full items-center gap-2 px-3 py-2 text-right hover:bg-indigo-50 dark:hover:bg-indigo-500/10 ${i === selectedHintIndex[type] ? "bg-indigo-100 dark:bg-indigo-500/20" : ""}`}
          >
            <span>{v.icon}</span>
            <div className="flex flex-1 items-center justify-between">
              <span className="font-mono text-sm text-indigo-600 dark:text-indigo-400">{v.key}</span>
              <span className="text-xs text-slate-500">{v.label}</span>
            </div>
          </button>
        ))}
        <div className="border-t bg-slate-50 px-3 py-1.5 text-[11px] text-slate-400 dark:bg-white/5">
          ↑↓ {isRTL ? "للتنقل" : "navigate"} · Enter {isRTL ? "للإدراج" : "insert"} · Esc {isRTL ? "إغلاق" : "close"}
        </div>
      </div>
    );
  };

  const handleSave = useCallback(async () => {
    if (groupIsOnHold) {
      toast.error(isRTL ? "الجروب على Hold — مينفعش تعدّل أي حاجة في الجلسة" : "Group is on hold — can't make any changes");
      return;
    }
    if (showReasonField && (!formData.studentMessage?.trim() || !formData.guardianMessage?.trim())) {
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
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingLink: formData.meetingLink,
          recordingLink: formData.recordingLink,
          instructorNotes: formData.instructorNotes,
          status: formData.status,
          newDate: isPostponed ? formData.newDate : null,
          newTime: isPostponed ? formData.newTime : null,
          metadata: showReasonField ? { studentMessages, guardianMessages } : {},
        }),
      });

      const json = await res.json();
      if (json.success) {
        if (json.cascade?.shiftedCount > 0) {
          toast.success(isRTL ? `تم الإلغاء، وترحيل ${json.cascade.shiftedCount} جلسة تانية أسبوعًا لقدام` : `Cancelled — ${json.cascade.shiftedCount} other session(s) shifted forward a week`);
        } else {
          toast.success(isRTL ? "تم تحديث الجلسة بنجاح" : "Session updated successfully");
        }
        onClose();
        onRefresh();
      } else {
        if (json.code === "GROUP_ON_HOLD") {
          toast.error(isRTL ? "الجروب على Hold — مينفعش تعدّل أي حاجة" : "Group is on hold — can't make any changes");
        } else {
          toast.error(json.error || (isRTL ? "فشل التحديث" : "Update failed"));
        }
      }
    } catch (error) {
      console.error("Error saving session:", error);
      toast.error(isRTL ? "حدث خطأ" : "An error occurred");
    } finally {
      setSaving(false);
    }
  }, [formData, showReasonField, isPostponed, session, groupStudents, dbVars, isRTL, onClose, onRefresh, groupIsOnHold]);

  const footer = (
    <>
      <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
        {isRTL ? "إغلاق" : "Close"}
      </button>
      <button
        onClick={handleSave}
        disabled={saving || loadingTemplates || groupIsOnHold || (showReasonField && (!formData.studentMessage?.trim() || !formData.guardianMessage?.trim()))}
        title={groupIsOnHold ? (isRTL ? "الجروب على Hold — التعديل معطّل" : "Group is on hold — editing disabled") : ""}
        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors ${
          groupIsOnHold ? "cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-white/5 dark:text-slate-500" : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
        }`}
      >
        {saving ? (
          <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> {isRTL ? "جاري الحفظ..." : "Saving..."}</>
        ) : groupIsOnHold ? (
          <><PauseCircle className="h-4 w-4" /> {isRTL ? "مقفولة (Hold)" : "Locked (Hold)"}</>
        ) : (
          <><Save className="h-4 w-4" /> {isRTL ? "حفظ التغييرات" : "Save Changes"}</>
        )}
      </button>
    </>
  );

  return (
    <ModalShell
      open
      onClose={onClose}
      size="2xl"
      accent="indigo"
      isRTL={isRTL}
      title={isRTL ? `تعديل الجلسة — ${session?.title}` : `Edit Session — ${session?.title}`}
      subtitle={`${session?.scheduledDate ? new Date(session.scheduledDate).toLocaleDateString(isRTL ? "ar-EG" : "en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" }) : ""} · ${session?.startTime}–${session?.endTime}`}
      headerBadge={
        groupIsOnHold && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
            <PauseCircle className="h-3 w-3" /> {isRTL ? "مقفولة" : "Locked"}
          </span>
        )
      }
      footer={footer}
    >
      <div className="space-y-5">
        {groupIsOnHold && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/20">
              <PauseCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                {isRTL ? "الجروب على Hold — التعديل معطّل" : "Group is on hold — editing is disabled"}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                {isRTL
                  ? "مينفعش تعدّل أي حاجة في الجلسة دي لحد ما الـ Hold يتفك. ارجع لصفحة المجموعات وفك الـ Hold الأول."
                  : "You can't make changes here until the hold is released — release it from the groups page first."}
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-white">{isRTL ? "الحالة" : "Status"}</label>
          <StatusPicker
            value={formData.status}
            isRTL={isRTL}
            disabledValues={groupIsOnHold ? ["scheduled", "completed", "postponed", "cancelled"] : []}
            onChange={(val) => {
              if (groupIsOnHold) return;
              setFormData((prev) => ({ ...prev, status: val }));
              setManuallyEdited({ student: false, guardian: false });
            }}
          />
        </div>

        {isCancelling && !groupIsOnHold && (
          <CascadeImpactStrip shifting={cascadePreview.shifting} skipped={cascadePreview.skipped} isRTL={isRTL} />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-white">
              <Link2 className="h-3.5 w-3.5" /> {isRTL ? "رابط الاجتماع" : "Meeting Link"}
            </label>
            <input
              type="url"
              value={formData.meetingLink}
              onChange={(e) => setFormData((prev) => ({ ...prev, meetingLink: e.target.value }))}
              placeholder={isRTL ? "أدخل رابط الاجتماع" : "Enter meeting link"}
              disabled={groupIsOnHold}
              className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-white/5 dark:text-white ${groupIsOnHold ? "cursor-not-allowed opacity-50" : ""}`}
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-white">
              <VideoIcon className="h-3.5 w-3.5" /> {isRTL ? "رابط التسجيل" : "Recording Link"}
            </label>
            <input
              type="url"
              value={formData.recordingLink}
              onChange={(e) => setFormData((prev) => ({ ...prev, recordingLink: e.target.value }))}
              placeholder={isRTL ? "أدخل رابط التسجيل" : "Enter recording link"}
              disabled={groupIsOnHold}
              className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-white/5 dark:text-white ${groupIsOnHold ? "cursor-not-allowed opacity-50" : ""}`}
            />
          </div>
        </div>

        {isPostponed && (
          <div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-white">{isRTL ? "التاريخ الجديد" : "New Date"}</label>
                <input
                  type="date"
                  value={formData.newDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, newDate: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  min={new Date().toISOString().split("T")[0]}
                  disabled={groupIsOnHold}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-white">{isRTL ? "الوقت الجديد" : "New Time"}</label>
                <input
                  type="time"
                  value={formData.newTime}
                  onChange={(e) => setFormData((prev) => ({ ...prev, newTime: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  disabled={groupIsOnHold}
                />
              </div>
            </div>
            {formData.newDate && (
              <p className="mt-2 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <Info className="h-3.5 w-3.5 shrink-0" />
                {isRTL ? "هيتحفظ فورًا بمجرد الحفظ — مدة الجلسة هتفضل زي ما هي" : "Saved immediately — session duration stays the same"}
              </p>
            )}
          </div>
        )}

        {showReasonField && !groupIsOnHold && (
          <div className="space-y-5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-500/15 dark:bg-indigo-500/5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-indigo-900 dark:text-indigo-200">
                <MessageCircle className="h-4 w-4" /> {isRTL ? "رسائل الإشعار" : "Notification Messages"}
              </h3>
              <button onClick={resetToDefault} disabled={loadingTemplates} className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-500/20 dark:bg-white/5 dark:text-indigo-300">
                <RefreshCw className={`h-3 w-3 ${loadingTemplates ? "animate-spin" : ""}`} /> {isRTL ? "استعادة القوالب" : "Reset Templates"}
              </button>
            </div>

            {groupStudents.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">{isRTL ? "اختر طالباً لمعاينة الرسالة:" : "Select student to preview:"}</label>
                <div className="flex flex-wrap gap-2">
                  {groupStudents.map((student) => {
                    const isSelected = selectedStudentForPreview?._id?.toString() === student._id?.toString();
                    const lang   = student.communicationPreferences?.preferredLanguage || "ar";
                    const gender = (student.personalInfo?.gender || "male").toLowerCase();
                    const rel    = (student.guardianInfo?.relationship || "father").toLowerCase();
                    return (
                      <button
                        key={student._id}
                        onClick={() => handleStudentPreviewChange(student._id)}
                        disabled={loadingTemplates}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all ${
                          isSelected ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 text-slate-700 hover:border-indigo-300 dark:border-white/10 dark:text-slate-300"
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

                {salutationPreview && (
                  <div className="space-y-1.5 rounded-lg border border-indigo-100 bg-white p-3 text-xs dark:border-indigo-500/10 dark:bg-white/5">
                    <div className="flex items-center gap-2">
                      <span className="w-28 shrink-0 font-medium text-indigo-600 dark:text-indigo-400">👶 {isRTL ? "تحية الطالب:" : "Student:"}</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{salutationPreview.studentSalutation}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-28 shrink-0 font-medium text-violet-600 dark:text-violet-400">👪 {isRTL ? "تحية ولي الأمر:" : "Guardian:"}</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{salutationPreview.guardianSalutation}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-28 shrink-0 font-medium text-emerald-600 dark:text-emerald-400">👶 {isRTL ? "ابنك/ابنتك:" : "Child title:"}</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{salutationPreview.childTitle}</span>
                    </div>
                    {(manuallyEdited.student || manuallyEdited.guardian) && (
                      <p className="pt-1 text-orange-500 dark:text-orange-400">✏️ {isRTL ? "الرسائل معدلة يدوياً" : "Messages manually edited"}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-500/20">
                  <User className="h-4 w-4 text-sky-600 dark:text-sky-300" />
                </div>
                <h4 className="text-sm font-semibold text-sky-900 dark:text-sky-200">{isRTL ? "رسالة للطالب" : "Student Message"}</h4>
                {loadingTemplates && <div className="h-3 w-3 animate-spin rounded-full border-2 border-sky-300 border-t-sky-600" />}
              </div>
              <div className="relative">
                <textarea
                  ref={studentTextareaRef}
                  value={formData.studentMessage}
                  onChange={(e) => handleInput(e, "student")}
                  onKeyDown={(e) => handleKeyDown(e, "student")}
                  onSelect={(e) => setCursorPosition((prev) => ({ ...prev, student: e.target.selectionStart }))}
                  placeholder={isRTL ? "اكتب @ لإظهار المتغيرات..." : "Type @ for variables..."}
                  className="h-36 w-full resize-none rounded-lg border border-sky-200 bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-sky-500/20 dark:bg-white/5 dark:text-white"
                  dir={(selectedStudentForPreview?.communicationPreferences?.preferredLanguage || "ar") === "ar" ? "rtl" : "ltr"}
                />
                {renderHints("student")}
              </div>
              {previewStudentMessage && (
                <div className="overflow-hidden rounded-lg border border-sky-200 bg-white dark:border-sky-500/10 dark:bg-white/5">
                  <div className="flex items-center gap-2 border-b bg-sky-50 px-3 py-1.5 dark:border-sky-500/10 dark:bg-sky-500/10">
                    <MessageCircle className="h-3.5 w-3.5 text-sky-600 dark:text-sky-300" />
                    <span className="text-xs font-medium text-sky-700 dark:text-sky-300">{isRTL ? "معاينة رسالة الطالب" : "Student Preview"}</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words p-3 text-sm" dir={(selectedStudentForPreview?.communicationPreferences?.preferredLanguage || "ar") === "ar" ? "rtl" : "ltr"}>
                    {previewStudentMessage}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-500/20">
                  <Users className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                </div>
                <h4 className="text-sm font-semibold text-violet-900 dark:text-violet-200">{isRTL ? "رسالة لولي الأمر" : "Guardian Message"}</h4>
              </div>
              <div className="relative">
                <textarea
                  ref={guardianTextareaRef}
                  value={formData.guardianMessage}
                  onChange={(e) => handleInput(e, "guardian")}
                  onKeyDown={(e) => handleKeyDown(e, "guardian")}
                  onSelect={(e) => setCursorPosition((prev) => ({ ...prev, guardian: e.target.selectionStart }))}
                  placeholder={isRTL ? "اكتب @ لإظهار المتغيرات..." : "Type @ for variables..."}
                  className="h-36 w-full resize-none rounded-lg border border-violet-200 bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-violet-500/20 dark:bg-white/5 dark:text-white"
                  dir={(selectedStudentForPreview?.communicationPreferences?.preferredLanguage || "ar") === "ar" ? "rtl" : "ltr"}
                />
                {renderHints("guardian")}
              </div>
              {previewGuardianMessage && (
                <div className="overflow-hidden rounded-lg border border-violet-200 bg-white dark:border-violet-500/10 dark:bg-white/5">
                  <div className="flex items-center gap-2 border-b bg-violet-50 px-3 py-1.5 dark:border-violet-500/10 dark:bg-violet-500/10">
                    <MessageCircle className="h-3.5 w-3.5 text-violet-600 dark:text-violet-300" />
                    <span className="text-xs font-medium text-violet-700 dark:text-violet-300">{isRTL ? "معاينة رسالة ولي الأمر" : "Guardian Preview"}</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words p-3 text-sm" dir={(selectedStudentForPreview?.communicationPreferences?.preferredLanguage || "ar") === "ar" ? "rtl" : "ltr"}>
                    {previewGuardianMessage}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-indigo-100 pt-3 dark:border-indigo-500/10">
              <button onClick={() => saveTemplateToDatabase("student", formData.studentMessage)} disabled={!formData.studentMessage || savingTemplate.student || loadingTemplates} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {savingTemplate.student ? <><RefreshCw className="h-3 w-3 animate-spin" /> {isRTL ? "جاري الحفظ..." : "Saving..."}</> : <><Save className="h-3 w-3" /> {isRTL ? "حفظ قالب الطالب" : "Save Student Template"}</>}
              </button>
              <button onClick={() => saveTemplateToDatabase("guardian", formData.guardianMessage)} disabled={!formData.guardianMessage || savingTemplate.guardian || loadingTemplates} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {savingTemplate.guardian ? <><RefreshCw className="h-3 w-3 animate-spin" /> {isRTL ? "جاري الحفظ..." : "Saving..."}</> : <><Save className="h-3 w-3" /> {isRTL ? "حفظ قالب ولي الأمر" : "Save Guardian Template"}</>}
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-white">
            <FileText className="h-3.5 w-3.5" /> {isRTL ? "ملاحظات المدرب" : "Instructor Notes"}
          </label>
          <textarea
            value={formData.instructorNotes}
            onChange={(e) => setFormData((prev) => ({ ...prev, instructorNotes: e.target.value }))}
            placeholder={isRTL ? "أضف ملاحظات للمدرب..." : "Add instructor notes..."}
            rows={3}
            disabled={groupIsOnHold}
            className={`w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-white/5 dark:text-white ${groupIsOnHold ? "cursor-not-allowed opacity-50" : ""}`}
            dir={isRTL ? "rtl" : "ltr"}
          />
        </div>
      </div>
    </ModalShell>
  );
}