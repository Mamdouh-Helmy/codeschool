"use client";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import toast from "react-hot-toast";
import {
  Save,
  MessageCircle,
  Users,
  Zap,
  RefreshCw,
  Clock,
  AlertTriangle,
  Ban,
  PauseCircle,
  Lock,
  Check,
  CalendarClock,
} from "lucide-react";
import ModalShell from "./ModalShell";
import AttendanceStatusPicker from "./AttendanceStatusPicker";

// ─────────────────────────────────────────────────────────────────────────────
// resolveVar
// ─────────────────────────────────────────────────────────────────────────────
function resolveVar(dbVars, key, lang = "ar", genderContext = {}) {
  const v = dbVars[key];
  if (!v) return null;

  const { studentGender = "male", guardianType = "father" } = genderContext;
  const isMale = String(studentGender).toLowerCase() !== "female";
  const isFather = String(guardianType).toLowerCase() !== "mother";

  if (v.hasGender) {
    if (v.genderType === "student") {
      return lang === "ar"
        ? (isMale ? v.valueMaleAr : v.valueFemaleAr) || v.valueAr || null
        : (isMale ? v.valueMaleEn : v.valueFemaleEn) || v.valueEn || null;
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
// buildVariables
// ─────────────────────────────────────────────────────────────────────────────
function buildVariables(student, status, session, dbVars = {}) {
  if (!student) return {};

  const lang = (student.communicationPreferences?.preferredLanguage || "ar").toLowerCase();
  const gender = (student.personalInfo?.gender || "male").toLowerCase().trim();
  const relationship = (student.guardianInfo?.relationship || "father").toLowerCase().trim();
  const isMale = gender !== "female";
  const isFather = relationship !== "mother";
  const genderCtx = { studentGender: gender, guardianType: relationship };

  const studentFirstName =
    lang === "ar"
      ? student.personalInfo?.nickname?.ar?.trim() ||
      student.personalInfo?.fullName?.split(" ")[0] || "الطالب"
      : student.personalInfo?.nickname?.en?.trim() ||
      student.personalInfo?.fullName?.split(" ")[0] || "Student";

  const guardianFirstName =
    lang === "ar"
      ? student.guardianInfo?.nickname?.ar?.trim() ||
      student.guardianInfo?.name?.split(" ")[0] || "ولي الأمر"
      : student.guardianInfo?.nickname?.en?.trim() ||
      student.guardianInfo?.name?.split(" ")[0] || "Guardian";

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

  const you_ar =
    resolveVar(dbVars, "you_ar", "ar", genderCtx) ||
    (isMale ? "أنت" : "أنتِ");

  const welcome_ar =
    resolveVar(dbVars, "welcome_ar", "ar", genderCtx) ||
    (isMale ? "أهلاً بك" : "أهلاً بكِ");

  const studentGender_ar =
    resolveVar(dbVars, "studentGender_ar", "ar", genderCtx) ||
    (isMale ? "الابن" : "الابنة");

  const studentGender_en =
    resolveVar(dbVars, "studentGender_en", "en", genderCtx) ||
    (isMale ? "son" : "daughter");

  const relationship_ar =
    resolveVar(dbVars, "relationship_ar", "ar", genderCtx) ||
    (isFather ? "الأب" : "الأم");

  const guardianSalutation_ar = `${guardianSalBase_ar} ${guardianFirstName}`;
  const guardianSalutation_en = `${guardianSalBase_en} ${guardianFirstName}`;
  const guardianSalutation = lang === "ar" ? guardianSalutation_ar : guardianSalutation_en;

  const studentSalutation_ar = `${salutationBase_ar} ${studentFirstName}`;
  const studentSalutation = lang === "ar" ? studentSalutation_ar : `Dear ${studentFirstName}`;

  const childTitle = lang === "ar" ? childTitleAr : childTitleEn;

  const statusMap = {
    ar: { absent: "غائب", late: "متأخر", excused: "معتذر", present: "حاضر" },
    en: { absent: "absent", late: "late", excused: "excused", present: "present" },
  };
  const statusMapFemaleAr = {
    absent: "غائبة", late: "متأخرة", excused: "معتذرة", present: "حاضرة",
  };
  const statusText =
    lang === "ar" && !isMale
      ? (statusMapFemaleAr[status] || status)
      : (statusMap[lang]?.[status] || status);

  const sessionDate = session?.scheduledDate
    ? new Date(session.scheduledDate).toLocaleDateString(
      lang === "ar" ? "ar-EG" : "en-US",
      { weekday: "long", year: "numeric", month: "long", day: "numeric" }
    )
    : "";

  return {
    guardianSalutation,
    guardianSalutation_ar,
    guardianSalutation_en,
    guardianName: guardianFirstName,
    guardianFullName: student.guardianInfo?.name || "",
    relationship_ar,

    salutation: guardianSalutation,
    studentSalutation,
    studentName: studentFirstName,
    studentName_ar: studentFirstName,
    studentName_en: studentFirstName,
    studentFullName: student.personalInfo?.fullName || "",
    fullStudentName: student.personalInfo?.fullName || "",
    name_ar: studentFirstName,
    name_en: studentFirstName,
    fullName: student.personalInfo?.fullName || "",

    childTitle,
    you_ar,
    welcome_ar,
    studentGender_ar,
    studentGender_en,

    status: statusText,
    attendanceStatus: statusText,

    sessionName: session?.title || "",
    date: sessionDate,
    sessionDate,
    time: `${session?.startTime || ""} - ${session?.endTime || ""}`,
    meetingLink: session?.meetingLink || "",

    groupName: session?.groupId?.name || "",
    groupCode: session?.groupId?.code || "",

    enrollmentNumber: student.enrollmentNumber || "",

    selectedLanguage_ar: lang === "ar" ? "العربية" : "الإنجليزية",
    selectedLanguage_en: lang === "ar" ? "Arabic" : "English",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// renderTemplate
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
// Small design primitives
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_META = {
  present: { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-500/10", ring: "ring-emerald-200 dark:ring-emerald-500/20" },
  absent: { dot: "bg-rose-500", text: "text-rose-700 dark:text-rose-300", bg: "bg-rose-50 dark:bg-rose-500/10", ring: "ring-rose-200 dark:ring-rose-500/20" },
  late: { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-500/10", ring: "ring-amber-200 dark:ring-amber-500/20" },
  excused: { dot: "bg-sky-500", text: "text-sky-700 dark:text-sky-300", bg: "bg-sky-50 dark:bg-sky-500/10", ring: "ring-sky-200 dark:ring-sky-500/20" },
};

function StatCard({ label, value, meta }) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 text-center ${meta ? `${meta.bg} ${meta.ring} ring-1 border-transparent` : "border-slate-200 dark:border-white/10"}`}>
      <p className={`text-xl font-bold tabular-nums ${meta ? meta.text : "text-slate-800 dark:text-white"}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function HoldLockNotice({ isRTL, holdInfo }) {
  const t = (ar, en) => (isRTL ? ar : en);
  const holdLabel = (() => {
    if (!holdInfo) return "";
    if (holdInfo.holdType === "indefinite") return t("مفتوح لحد ما يتفك يدويًا", "Indefinite");
    if (holdInfo.holdType === "sessions")
      return t(`لعدد ${holdInfo.holdSessionsCount} سيشنات (اتستهلك ${holdInfo.holdSessionsConsumed || 0})`, `${holdInfo.holdSessionsCount} sessions (${holdInfo.holdSessionsConsumed || 0} used)`);
    if (holdInfo.holdType === "until_session") return t("لحد سيشن محددة", "Until a specific session");
    return t(`لمدة ${holdInfo.holdDays || 0} يوم`, `${holdInfo.holdDays || 0} days`);
  })();

  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/20">
        <PauseCircle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-amber-900 dark:text-amber-300">
            {t("السيشن دي مقفولة بسبب الـ Hold", "This session is locked (on hold)")}
          </p>
          <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
            {holdLabel}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
          {t(
            "مينفعش تسجل حضور للسيشن دي لحد ما الـ Hold يتفك. ارجع لصفحة المجموعات وفك الـ Hold لو محتاج تفتحها.",
            "You can't take attendance here until the hold is released — release it from the groups page first."
          )}
        </p>
        {holdInfo?.holdReason && (
          <p className="mt-1 text-[11px] italic text-amber-600 dark:text-amber-400">
            {t("السبب", "Reason")}: {holdInfo.holdReason}
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function AttendanceModal({
  session,
  attendanceData,
  groupStudents,
  loading,
  onClose,
  onRefresh,
  isRTL,
  t,
}) {
  const [attendance, setAttendance] = useState([]);
  const [rawTemplates, setRawTemplates] = useState({});
  const [customMessages, setCustomMessages] = useState({});
  const [saving, setSaving] = useState(false);
  const [showMessageEditor, setShowMessageEditor] = useState({});
  const [showHints, setShowHints] = useState({});
  const [cursorPosition, setCursorPosition] = useState({});
  const [selectedHintIndex, setSelectedHintIndex] = useState({});
  const [loadingTemplates, setLoadingTemplates] = useState({});
  const [manuallyEdited, setManuallyEdited] = useState({});
  const [savingTemplate, setSavingTemplate] = useState({});
  const [templatesFetched, setTemplatesFetched] = useState(false);

  const [dbVars, setDbVars] = useState({});

  const textareaRefs = useRef({});
  const hintsRefs = useRef({});
  const initialLoadDone = useRef(false);
  const fetchQueue = useRef(new Set());

  const initialRecordedStudentIds = useRef(new Set());

  const sessionLocked = !!attendanceData?.sessionLocked;
  const holdInfo = attendanceData?.group?.hold || null;

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

  const getStudentStatus = useCallback(
    (studentId) => {
      const record = attendance.find(
        (a) =>
          (a.studentId?._id || a.studentId?.id || a.studentId)?.toString() ===
          studentId?.toString()
      );
      return record?.status || "absent";
    },
    [attendance]
  );

  const getStudentNotes = useCallback(
    (studentId) => {
      const record = attendance.find(
        (a) =>
          (a.studentId?._id || a.studentId?.id || a.studentId)?.toString() ===
          studentId?.toString()
      );
      return record?.notes || "";
    },
    [attendance]
  );

  const checkStudentBalance = useCallback((student) => {
    if (!student?.creditSystem)
      return { hasBalance: false, remainingHours: 0, isZeroBalance: true };

    const remainingHours =
      student.creditSystem.currentPackage?.remainingHours || 0;

    const hasActiveFreeze = student.creditSystem.exceptions?.some(
      (e) =>
        e.type === "freeze" &&
        e.status === "active" &&
        (!e.endDate || new Date() <= new Date(e.endDate))
    );

    const isZeroBalance = hasActiveFreeze || remainingHours <= 0;
    return { hasBalance: remainingHours > 0, remainingHours, isZeroBalance };
  }, []);

  const isStudentLocked = useCallback(
    (student) => {
      const studentId = student?._id?.toString();
      if (!studentId) return true;
      if (initialRecordedStudentIds.current.has(studentId)) return false;
      return checkStudentBalance(student).isZeroBalance;
    },
    [checkStudentBalance]
  );

  const buildRenderedMessage = useCallback(
    (studentId, rawTemplate) => {
      const student = groupStudents.find(
        (s) => s._id?.toString() === studentId?.toString()
      );
      if (!student) return rawTemplate || "";

      const status = getStudentStatus(studentId);
      const variables = buildVariables(student, status, session, dbVars);
      return renderTemplate(rawTemplate, variables);
    },
    [groupStudents, getStudentStatus, session, dbVars]
  );

  const fetchTemplateForStudent = useCallback(
    async (studentId, status) => {
      if (!studentId || !status) return null;
      if (manuallyEdited[studentId]) return null;

      setLoadingTemplates((prev) => ({ ...prev, [studentId]: true }));
      try {
        const res = await fetch(`/api/sessions/${session.id}/attendance-templates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attendanceStatus: status, studentId }),
        });
        const json = await res.json();

        if (json.success && json.data?.guardian?.content) {
          const raw = json.data.guardian.content;
          setRawTemplates((prev) => ({ ...prev, [studentId]: raw }));
          setCustomMessages((prev) => ({ ...prev, [studentId]: raw }));
          setManuallyEdited((prev) => ({ ...prev, [studentId]: false }));
          return raw;
        }
      } catch (err) {
        console.error("Error fetching template:", err);
      } finally {
        setLoadingTemplates((prev) => ({ ...prev, [studentId]: false }));
      }
      return null;
    },
    [session.id, manuallyEdited]
  );

  const resetToDefaultTemplate = useCallback(
    async (studentId) => {
      const status = getStudentStatus(studentId);
      if (!status) return;

      setLoadingTemplates((prev) => ({ ...prev, [studentId]: true }));
      setManuallyEdited((prev) => ({ ...prev, [studentId]: false }));

      try {
        const res = await fetch(`/api/sessions/${session.id}/attendance-templates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attendanceStatus: status, studentId }),
        });
        const json = await res.json();

        if (json.success && json.data?.guardian?.content) {
          const raw = json.data.guardian.content;
          setRawTemplates((prev) => ({ ...prev, [studentId]: raw }));
          setCustomMessages((prev) => ({ ...prev, [studentId]: raw }));
          toast.success(isRTL ? "تم استعادة القالب الافتراضي" : "Default template restored");
        }
      } catch (err) {
        console.error("Error resetting template:", err);
        toast.error(isRTL ? "فشل استعادة القالب" : "Failed to restore template");
      } finally {
        setLoadingTemplates((prev) => ({ ...prev, [studentId]: false }));
      }
    },
    [session.id, getStudentStatus, isRTL]
  );

  const saveTemplateToDatabase = useCallback(
    async (studentId, rawContent) => {
      if (!studentId || !rawContent?.trim()) return;

      const status = getStudentStatus(studentId);
      if (!["absent", "late", "excused"].includes(status)) return;

      setSavingTemplate((prev) => ({ ...prev, [studentId]: true }));

      try {
        const typeMap = {
          absent: "absence_notification",
          late: "late_notification",
          excused: "excused_notification",
        };
        const nameMap = {
          absent: "Absence Notification",
          late: "Late Notification",
          excused: "Excused Absence Notification",
        };

        const templateType = typeMap[status];
        const recipientType = "guardian";
        const student = groupStudents.find(
          (s) => s._id?.toString() === studentId?.toString()
        );
        const studentLang = student?.communicationPreferences?.preferredLanguage || "ar";

        const searchRes = await fetch(
          `/api/message-templates?type=${templateType}&default=true`
        );
        const searchJson = await searchRes.json();

        const updatePayload = {
          name: nameMap[status],
          isDefault: true,
          ...(studentLang === "ar"
            ? { contentAr: rawContent, contentEn: searchJson.data?.[0]?.contentEn || "" }
            : { contentEn: rawContent, contentAr: searchJson.data?.[0]?.contentAr || "" }),
        };

        let saveRes, saveJson;

        if (searchJson.success && searchJson.data?.length > 0) {
          saveRes = await fetch("/api/message-templates", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ _id: searchJson.data[0]._id, ...updatePayload }),
          });
          saveJson = await saveRes.json();
        } else {
          saveRes = await fetch("/api/message-templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              templateType,
              recipientType,
              ...updatePayload,
              isActive: true,
              variables: [
                { key: "guardianSalutation", label: "Guardian Salutation" },
                { key: "studentName", label: "Student Name" },
                { key: "childTitle", label: "Son / Daughter" },
                { key: "status", label: "Attendance Status" },
                { key: "sessionName", label: "Session Name" },
                { key: "date", label: "Date" },
                { key: "time", label: "Time" },
                { key: "enrollmentNumber", label: "Enrollment Number" },
              ],
            }),
          });
          saveJson = await saveRes.json();
        }

        if (saveJson.success) {
          toast.success(
            isRTL
              ? `✅ تم حفظ القالب (${studentLang === "ar" ? "عربي" : "إنجليزي"})`
              : `✅ Template (${studentLang === "ar" ? "Arabic" : "English"}) saved`
          );
        } else {
          throw new Error(saveJson.error || "Save failed");
        }
      } catch (err) {
        console.error("Error saving template:", err);
        toast.error(
          isRTL ? "فشل حفظ القالب: " + err.message : "Failed: " + err.message
        );
      } finally {
        setSavingTemplate((prev) => ({ ...prev, [studentId]: false }));
      }
    },
    [groupStudents, getStudentStatus, isRTL]
  );

  const updateAttendanceStatus = useCallback(
    (studentId, status) => {
      if (sessionLocked) {
        toast.error(
          isRTL
            ? "السيشن دي مقفولة بسبب الـ Hold — مينفعش تسجل حضور"
            : "This session is locked due to hold — can't record attendance"
        );
        return;
      }

      const student = groupStudents.find(
        (s) => s._id?.toString() === studentId?.toString()
      );

      if (isStudentLocked(student)) {
        const { remainingHours } = checkStudentBalance(student);
        toast.error(
          isRTL
            ? `لا يمكن تسجيل الحضور - الرصيد صفر (${remainingHours}h)`
            : `Cannot record attendance - Zero balance (${remainingHours}h)`
        );
        return;
      }

      setAttendance((prev) => {
        const idx = prev.findIndex(
          (a) =>
            (a.studentId?._id || a.studentId?.id || a.studentId)?.toString() ===
            studentId?.toString()
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], status };
          return next;
        }
        return [...prev, { studentId, status, notes: "" }];
      });

      if (["absent", "late", "excused"].includes(status)) {
        setShowMessageEditor((prev) => ({ ...prev, [studentId]: true }));
        if (!manuallyEdited[studentId]) {
          fetchTemplateForStudent(studentId, status);
        }
      } else {
        setShowMessageEditor((prev) => ({ ...prev, [studentId]: false }));
        setCustomMessages((prev) => { const n = { ...prev }; delete n[studentId]; return n; });
        setRawTemplates((prev) => { const n = { ...prev }; delete n[studentId]; return n; });
        setManuallyEdited((prev) => { const n = { ...prev }; delete n[studentId]; return n; });
      }
    },
    [fetchTemplateForStudent, manuallyEdited, groupStudents, isStudentLocked, checkStudentBalance, isRTL, sessionLocked]
  );

  const updateStudentNotes = useCallback((studentId, notes) => {
    setAttendance((prev) => {
      const idx = prev.findIndex(
        (a) =>
          (a.studentId?._id || a.studentId?.id || a.studentId)?.toString() ===
          studentId?.toString()
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], notes };
        return next;
      }
      return prev;
    });
  }, []);

  const availableVariables = useMemo(
    () => [
      { key: "{guardianSalutation}", label: isRTL ? "تحية ولي الأمر (كاملة)" : "Guardian Salutation", icon: "👤" },
      { key: "{guardianName}", label: isRTL ? "اسم ولي الأمر" : "Guardian Name", icon: "👤" },
      { key: "{studentName}", label: isRTL ? "اسم الطالب" : "Student Name", icon: "👶" },
      { key: "{childTitle}", label: isRTL ? "ابنك / ابنتك" : "Son / Daughter", icon: "👪" },
      { key: "{status}", label: isRTL ? "حالة الحضور" : "Attendance Status", icon: "📊" },
      { key: "{attendanceStatus}", label: isRTL ? "حالة الحضور (بديل)" : "Attendance (alt)", icon: "📊" },
      { key: "{sessionName}", label: isRTL ? "اسم الجلسة" : "Session Name", icon: "📘" },
      { key: "{date}", label: isRTL ? "التاريخ" : "Date", icon: "📅" },
      { key: "{time}", label: isRTL ? "الوقت" : "Time", icon: "⏰" },
      { key: "{enrollmentNumber}", label: isRTL ? "الرقم التعريفي" : "Enrollment No.", icon: "🔢" },
      { key: "{groupName}", label: isRTL ? "اسم المجموعة" : "Group Name", icon: "👥" },
      { key: "{meetingLink}", label: isRTL ? "رابط الجلسة" : "Meeting Link", icon: "🔗" },
    ],
    [isRTL]
  );

  const handleTextareaInput = useCallback((e, studentId) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;

    setCustomMessages((prev) => ({ ...prev, [studentId]: value }));
    setManuallyEdited((prev) => ({ ...prev, [studentId]: true }));
    setCursorPosition((prev) => ({ ...prev, [studentId]: cursorPos }));

    const lastAt = value.substring(0, cursorPos).lastIndexOf("@");
    if (lastAt !== -1 && lastAt === cursorPos - 1) {
      setShowHints((prev) => ({ ...prev, [studentId]: true }));
      setSelectedHintIndex((prev) => ({ ...prev, [studentId]: 0 }));
    } else {
      setShowHints((prev) => ({ ...prev, [studentId]: false }));
    }
  }, []);

  const insertVariable = useCallback(
    (studentId, variable) => {
      const textarea = textareaRefs.current[studentId];
      if (!textarea) return;

      const current = customMessages[studentId] || "";
      const cursorPos = cursorPosition[studentId] || 0;
      const before = current.substring(0, cursorPos);
      const lastAt = before.lastIndexOf("@");

      let newValue, newCursor;
      if (lastAt !== -1) {
        newValue = current.substring(0, lastAt) + variable.key + current.substring(cursorPos);
        newCursor = lastAt + variable.key.length;
      } else {
        newValue = current.substring(0, cursorPos) + variable.key + current.substring(cursorPos);
        newCursor = cursorPos + variable.key.length;
      }

      setCustomMessages((prev) => ({ ...prev, [studentId]: newValue }));
      setManuallyEdited((prev) => ({ ...prev, [studentId]: true }));
      setShowHints((prev) => ({ ...prev, [studentId]: false }));

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursor, newCursor);
      }, 0);
    },
    [customMessages, cursorPosition]
  );

  const handleKeyDown = useCallback(
    (e, studentId) => {
      if (!showHints[studentId]) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedHintIndex((prev) => ({
          ...prev,
          [studentId]: ((prev[studentId] || 0) + 1) % availableVariables.length,
        }));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedHintIndex((prev) => ({
          ...prev,
          [studentId]:
            ((prev[studentId] || 0) - 1 + availableVariables.length) %
            availableVariables.length,
        }));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertVariable(studentId, availableVariables[selectedHintIndex[studentId] || 0]);
      } else if (e.key === "Escape") {
        setShowHints((prev) => ({ ...prev, [studentId]: false }));
      }
    },
    [showHints, selectedHintIndex, availableVariables, insertVariable]
  );

  useEffect(() => {
    if (initialLoadDone.current) return;
    if (loading) return;

    if (attendanceData?.attendance?.length > 0) {
      setAttendance(attendanceData.attendance);
      initialRecordedStudentIds.current = new Set(
        attendanceData.attendance.map((a) =>
          (a.studentId?._id || a.studentId?.id || a.studentId)?.toString()
        )
      );
    } else if (groupStudents.length > 0) {
      setAttendance(
        groupStudents.map((s) => ({ studentId: s._id, status: "absent", notes: "" }))
      );
    }
    initialLoadDone.current = true;
  }, [attendanceData, groupStudents, loading]);

  useEffect(() => {
    if (!groupStudents.length || !attendance.length || templatesFetched) return;

    const fetchAll = async () => {
      for (const student of groupStudents) {
        const status = getStudentStatus(student._id);
        if (["absent", "late", "excused"].includes(status)) {
          setShowMessageEditor((prev) => ({ ...prev, [student._id]: true }));
          if (!fetchQueue.current.has(student._id) && !manuallyEdited[student._id]) {
            fetchQueue.current.add(student._id);
            await fetchTemplateForStudent(student._id, status);
            fetchQueue.current.delete(student._id);
          }
        }
      }
      setTemplatesFetched(true);
    };

    fetchAll();
  }, [groupStudents, attendance]);

  useEffect(() => {
    const handler = (e) => {
      Object.keys(hintsRefs.current).forEach((id) => {
        if (hintsRefs.current[id] && !hintsRefs.current[id].contains(e.target)) {
          setShowHints((prev) => ({ ...prev, [id]: false }));
        }
      });
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSave = useCallback(async () => {
    if (sessionLocked) {
      toast.error(
        isRTL
          ? "السيشن دي مقفولة بسبب الـ Hold — مينفعش تحفظ الحضور"
          : "This session is locked due to hold — can't save attendance"
      );
      return;
    }

    setSaving(true);
    try {
      const renderedMessages = {};
      Object.keys(customMessages).forEach((studentId) => {
        renderedMessages[studentId] = buildRenderedMessage(
          studentId,
          customMessages[studentId]
        );
      });

      const res = await fetch(`/api/sessions/${session.id}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendance: attendance.map((a) => ({
            studentId: a.studentId?._id || a.studentId?.id || a.studentId,
            status: a.status,
            notes: a.notes || "",
          })),
          customMessages: renderedMessages,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(isRTL ? "تم حفظ الحضور بنجاح ✅" : "Attendance saved ✅");
        onClose();
        onRefresh();
      } else {
        if (json.code === "SESSION_ON_HOLD") {
          toast.error(
            isRTL
              ? "السيشن دي مقفولة بسبب الـ Hold — مينفعش تحفظ"
              : "Session is locked due to hold — can't save"
          );
        } else {
          toast.error(json.error || (isRTL ? "فشل الحفظ" : "Save failed"));
        }
      }
    } catch (err) {
      console.error("Error saving attendance:", err);
      toast.error(isRTL ? "حدث خطأ" : "An error occurred");
    } finally {
      setSaving(false);
    }
  }, [
    attendance,
    customMessages,
    session.id,
    isRTL,
    onClose,
    onRefresh,
    buildRenderedMessage,
    sessionLocked,
  ]);

  const stats = {
    total: groupStudents.length,
    present: attendance.filter((a) => a.status === "present").length,
    absent: attendance.filter((a) => a.status === "absent").length,
    late: attendance.filter((a) => a.status === "late").length,
    excused: attendance.filter((a) => a.status === "excused").length,
    blocked: groupStudents.filter((s) => isStudentLocked(s)).length,
  };

  const footer = (
    <>
      <button
        onClick={onClose}
        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
      >
        {isRTL ? "إلغاء" : "Cancel"}
      </button>
      <button
        onClick={handleSave}
        disabled={saving || sessionLocked}
        title={sessionLocked ? (isRTL ? "السيشن مقفولة بسبب الـ Hold" : "Session locked due to hold") : ""}
        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors ${sessionLocked
            ? "cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-white/5 dark:text-slate-500"
            : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
          }`}
      >
        {saving ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            {isRTL ? "جاري الحفظ..." : "Saving..."}
          </>
        ) : sessionLocked ? (
          <>
            <Lock className="h-4 w-4" />
            {isRTL ? "مقفولة" : "Locked"}
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            {isRTL ? "حفظ الحضور" : "Save Attendance"}
          </>
        )}
      </button>
    </>
  );

  if (loading) {
    return (
      <ModalShell open onClose={onClose} size="md" accent="emerald" isRTL={isRTL} title={isRTL ? "تسجيل الحضور" : "Attendance"}>
        <div className="flex flex-col items-center justify-center gap-3 py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
          <p className="text-sm text-slate-500">{isRTL ? "جاري التحميل..." : "Loading..."}</p>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      size="3xl"
      accent="emerald"
      isRTL={isRTL}
      title={`${isRTL ? "تسجيل الحضور" : "Attendance"} — ${session?.title}`}
      subtitle={`${new Date(session?.scheduledDate).toLocaleDateString(isRTL ? "ar-EG" : "en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })} · ${session?.startTime}–${session?.endTime}`}
      headerBadge={
        sessionLocked && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
            <Lock className="h-3 w-3" />
            {isRTL ? "مقفولة" : "Locked"}
          </span>
        )
      }
      footer={footer}
    >
      {sessionLocked && <HoldLockNotice isRTL={isRTL} holdInfo={holdInfo} />}

      {/* Stats strip */}
      <div className="mb-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
        <StatCard label={isRTL ? "الإجمالي" : "Total"} value={stats.total} />
        <StatCard label={isRTL ? "حاضر" : "Present"} value={stats.present} meta={STATUS_META.present} />
        <StatCard label={isRTL ? "غائب" : "Absent"} value={stats.absent} meta={STATUS_META.absent} />
        <StatCard label={isRTL ? "متأخر" : "Late"} value={stats.late} meta={STATUS_META.late} />
        <StatCard label={isRTL ? "معتذر" : "Excused"} value={stats.excused} meta={STATUS_META.excused} />
        <StatCard label={isRTL ? "محظور" : "Blocked"} value={stats.blocked} />
      </div>

      {/* Students */}
      <div className="space-y-3">
        {groupStudents.map((student) => {
          const studentId = student._id?.toString();
          const status = getStudentStatus(studentId);
          const notes = getStudentNotes(studentId);
          const needsMessage = ["absent", "late", "excused"].includes(status);
          const studentLang = student.communicationPreferences?.preferredLanguage || "ar";
          const gender = (student.personalInfo?.gender || "male").toLowerCase().trim();
          const relationship = (student.guardianInfo?.relationship || "father").toLowerCase().trim();

          const { remainingHours } = checkStudentBalance(student);
          const isLocked = isStudentLocked(student);
          const effectiveLocked = isLocked || sessionLocked;
          const meta = STATUS_META[status];

          const currentVars = buildVariables(student, status, session, dbVars);
          const rawMsg = customMessages[studentId] || "";
          const previewMsg = renderTemplate(rawMsg, currentVars);

          return (
            <div
              key={studentId}
              className={`overflow-hidden rounded-xl border transition-colors ${sessionLocked
                  ? "border-amber-200 dark:border-amber-500/20"
                  : effectiveLocked
                    ? "border-slate-200 dark:border-white/10"
                    : "border-slate-200 dark:border-white/10"
                } ${effectiveLocked ? "opacity-70" : ""}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 dark:bg-transparent">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${meta?.dot || "bg-slate-300"}`} />
                    <p className="font-semibold text-slate-800 dark:text-white">
                      {student.personalInfo?.fullName}
                    </p>
                    {sessionLocked && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                        <Lock className="h-3 w-3" /> {isRTL ? "مقفولة" : "Locked"}
                      </span>
                    )}
                    {!sessionLocked && isLocked && (
                      <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
                        <Ban className="h-3 w-3" /> {isRTL ? "محظور" : "Blocked"}
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Hash className="h-3 w-3" /> {student.enrollmentNumber}
                    </span>
                    <span>{studentLang === "ar" ? "🇸🇦 عربي" : "🇬🇧 English"}</span>
                    <span>{gender === "female" ? (isRTL ? "👧 أنثى" : "👧 Female") : (isRTL ? "👦 ذكر" : "👦 Male")}</span>
                    <span>
                      {relationship === "mother"
                        ? (isRTL ? "👩 أم" : "👩 Mother")
                        : relationship === "father"
                          ? (isRTL ? "👨 أب" : "👨 Father")
                          : (isRTL ? "👤 ولي" : "👤 Guardian")}
                    </span>
                    {student.creditSystem?.currentPackage && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${remainingHours <= 0
                            ? "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400"
                            : remainingHours <= 2
                              ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                              : remainingHours <= 5
                                ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                                : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                          }`}
                      >
                        <Clock className="h-3 w-3" /> {remainingHours}h
                      </span>
                    )}
                  </div>

                  {!effectiveLocked && remainingHours <= 2 && remainingHours > 0 && (
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="h-3 w-3" />
                      {isRTL ? `تحذير: الرصيد على وشك النفاذ (${remainingHours}h)` : `Low balance warning (${remainingHours}h)`}
                    </p>
                  )}
                </div>

                <AttendanceStatusPicker
                  value={status}
                  onChange={(val) => updateAttendanceStatus(studentId, val)}
                  disabled={effectiveLocked}
                  isRTL={isRTL}
                />
              </div>

              {sessionLocked && (
                <div className="border-t border-amber-100 bg-amber-50/50 p-3 text-center dark:border-amber-500/10 dark:bg-amber-500/5">
                  <p className="flex items-center justify-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                    <Lock className="h-3.5 w-3.5" />
                    {isRTL ? "تسجيل الحضور معطّل بسبب الـ Hold" : "Attendance disabled — session on hold"}
                  </p>
                </div>
              )}

              {!sessionLocked && isLocked && needsMessage && (
                <div className="border-t border-slate-100 bg-slate-50 p-3 text-center dark:border-white/10 dark:bg-white/[0.02]">
                  <p className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Ban className="h-3.5 w-3.5" />
                    {isRTL ? "تم تعطيل الإشعارات بسبب نفاد الرصيد" : "Notifications disabled — zero balance"}
                  </p>
                </div>
              )}

              {!effectiveLocked && needsMessage && (
                <div className="space-y-4 border-t border-violet-100 bg-violet-50/50 p-4 dark:border-violet-500/10 dark:bg-violet-500/5">
                  <div className="flex items-start gap-3">
                    <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-violet-900 dark:text-violet-200">
                          {isRTL ? "رسالة لولي الأمر" : "Message for guardian"}{" "}
                          <span className="font-normal text-violet-600 dark:text-violet-400">
                            ({student.guardianInfo?.name || (isRTL ? "ولي الأمر" : "Guardian")})
                          </span>
                        </h4>
                        <button
                          onClick={() => resetToDefaultTemplate(studentId)}
                          disabled={loadingTemplates[studentId]}
                          className="flex items-center gap-1 rounded-md border border-violet-200 bg-white px-2 py-1 text-[11px] font-medium text-violet-700 hover:bg-violet-50 dark:border-violet-500/20 dark:bg-white/5 dark:text-violet-300"
                        >
                          <RefreshCw className={`h-3 w-3 ${loadingTemplates[studentId] ? "animate-spin" : ""}`} />
                          {isRTL ? "استعادة" : "Reset"}
                        </button>
                      </div>

                      <div className="space-y-1 rounded-lg border border-violet-100 bg-white p-2.5 text-xs dark:border-violet-500/10 dark:bg-white/5">
                        <div className="flex items-center gap-2">
                          <span className="w-24 shrink-0 text-violet-500">{isRTL ? "تحية:" : "Greeting:"}</span>
                          <span className="font-medium text-slate-700 dark:text-slate-200">{currentVars.guardianSalutation}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-24 shrink-0 text-violet-500">{isRTL ? "الطالب:" : "Student:"}</span>
                          <span className="text-slate-700 dark:text-slate-200">{currentVars.childTitle} <strong>{currentVars.studentName}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-24 shrink-0 text-violet-500">{isRTL ? "الحالة:" : "Status:"}</span>
                          <span className="text-slate-700 dark:text-slate-200">{currentVars.status}</span>
                        </div>
                        {manuallyEdited[studentId] && (
                          <p className="pt-0.5 text-orange-500 dark:text-orange-400">✏️ {isRTL ? "معدّلة يدوياً" : "Manually edited"}</p>
                        )}
                      </div>

                      <div className="relative space-y-1">
                        <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          {isRTL ? "نص القالب (اكتب @ لإدراج متغير)" : "Template text (type @ for a variable)"}
                        </label>
                        <textarea
                          ref={(el) => (textareaRefs.current[studentId] = el)}
                          value={rawMsg}
                          onChange={(e) => handleTextareaInput(e, studentId)}
                          onKeyDown={(e) => handleKeyDown(e, studentId)}
                          onSelect={(e) => setCursorPosition((prev) => ({ ...prev, [studentId]: e.target.selectionStart }))}
                          placeholder={isRTL ? "مثال: {guardianSalutation}، {childTitle} {studentName} غاب اليوم." : "e.g. {guardianSalutation}, {childTitle} {studentName} was absent today."}
                          className="h-28 w-full resize-none rounded-lg border border-violet-200 bg-white px-3 py-2.5 font-mono text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-violet-500/20 dark:bg-white/5 dark:text-white"
                          dir={studentLang === "ar" ? "rtl" : "ltr"}
                        />
                        {showHints[studentId] && (
                          <div
                            ref={(el) => (hintsRefs.current[studentId] = el)}
                            className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-violet-200 bg-white shadow-xl dark:border-violet-500/30 dark:bg-[#171a24]"
                          >
                            <div className="border-b border-violet-100 bg-violet-50 px-3 py-1.5 dark:border-violet-500/10 dark:bg-violet-500/10">
                              <p className="flex items-center gap-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
                                <Zap className="h-3 w-3" /> {isRTL ? "المتغيرات المتاحة" : "Available Variables"}
                              </p>
                            </div>
                            {availableVariables.map((v, i) => (
                              <button
                                key={v.key}
                                type="button"
                                onClick={() => insertVariable(studentId, v)}
                                className={`flex w-full items-center gap-2 px-3 py-2 text-right hover:bg-violet-50 dark:hover:bg-violet-500/10 ${i === (selectedHintIndex[studentId] || 0) ? "bg-violet-100 dark:bg-violet-500/20" : ""
                                  }`}
                              >
                                <span>{v.icon}</span>
                                <div className="flex flex-1 items-center justify-between">
                                  <span className="font-mono text-sm text-violet-600 dark:text-violet-400">{v.key}</span>
                                  <span className="text-xs text-slate-500">{v.label}</span>
                                </div>
                              </button>
                            ))}
                            <div className="border-t bg-slate-50 px-3 py-1.5 text-[11px] text-slate-400 dark:bg-white/5">
                              ↑↓ {isRTL ? "للتنقل" : "navigate"} · Enter {isRTL ? "للإدراج" : "insert"} · Esc {isRTL ? "إغلاق" : "close"}
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          {isRTL ? "ملاحظات (اختياري)" : "Notes (optional)"}
                        </label>
                        <input
                          type="text"
                          value={notes}
                          onChange={(e) => updateStudentNotes(studentId, e.target.value)}
                          placeholder={isRTL ? "أضف ملاحظة..." : "Add a note..."}
                          className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 dark:border-violet-500/20 dark:bg-white/5 dark:text-white"
                        />
                      </div>

                      {previewMsg && (
                        <div className="overflow-hidden rounded-lg border border-violet-100 bg-white dark:border-violet-500/10 dark:bg-white/5">
                          <div className="flex items-center justify-between border-b border-violet-100 bg-violet-50 px-3 py-1.5 dark:border-violet-500/10 dark:bg-violet-500/10">
                            <span className="text-[11px] font-medium text-violet-700 dark:text-violet-300">
                              📋 {isRTL ? "معاينة الرسالة الفعلية" : "Live preview"}
                            </span>
                            <span className="text-[11px] text-violet-400">
                              {studentLang === "ar" ? "🇸🇦" : "🇬🇧"} · {gender === "female" ? "👧" : "👦"} · {relationship === "mother" ? "👩" : "👨"}
                            </span>
                          </div>
                          <div
                            className="max-h-48 overflow-y-auto whitespace-pre-wrap bg-slate-50/60 p-3 text-sm text-slate-700 dark:bg-transparent dark:text-slate-200"
                            dir={studentLang === "ar" ? "rtl" : "ltr"}
                          >
                            {previewMsg}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end border-t border-violet-100 pt-2 dark:border-violet-500/10">
                        <button
                          onClick={() => saveTemplateToDatabase(studentId, rawMsg)}
                          disabled={!rawMsg || savingTemplate[studentId] || loadingTemplates[studentId]}
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {savingTemplate[studentId] ? (
                            <><RefreshCw className="h-3 w-3 animate-spin" /> {isRTL ? "جاري الحفظ..." : "Saving..."}</>
                          ) : (
                            <><Save className="h-3 w-3" /> {isRTL ? "حفظ كقالب افتراضي" : "Save as default"}</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {groupStudents.length === 0 && (
          <div className="py-10 text-center">
            <Users className="mx-auto mb-2 h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-500">
              {isRTL ? "لا يوجد طلاب في هذه المجموعة" : "No students in this group"}
            </p>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

// small local icon (kept inline to avoid an extra import path assumption)
function Hash(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  );
}