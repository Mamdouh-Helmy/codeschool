"use client";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import toast from "react-hot-toast";
import {
  X,
  Save,
  MessageCircle,
  Users,
  Zap,
  RefreshCw,
  Clock,
  AlertTriangle,
  Ban,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// resolveVar — gender-aware value from a DB variable object
// same logic as AddStudentsToGroup
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
// buildVariables — DB-first, hardcoded fallback
// dbVars: map of { [key]: TemplateVariable }  (pass {} when not yet loaded)
// ─────────────────────────────────────────────────────────────────────────────
function buildVariables(student, status, session, dbVars = {}) {
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

  // ── Composed salutations ─────────────────────────────────────────────────
  const guardianSalutation_ar = `${guardianSalBase_ar} ${guardianFirstName}`;
  const guardianSalutation_en = `${guardianSalBase_en} ${guardianFirstName}`;
  const guardianSalutation    = lang === "ar" ? guardianSalutation_ar : guardianSalutation_en;

  const studentSalutation_ar = `${salutationBase_ar} ${studentFirstName}`;
  const studentSalutation    = lang === "ar" ? studentSalutation_ar : `Dear ${studentFirstName}`;

  const childTitle = lang === "ar" ? childTitleAr : childTitleEn;

  // ── Attendance status text (with Arabic feminine form) ───────────────────
  const statusMap = {
    ar: { absent: "غائب",   late: "متأخر",   excused: "معتذر",   present: "حاضر"    },
    en: { absent: "absent", late: "late",     excused: "excused", present: "present" },
  };
  const statusMapFemaleAr = {
    absent: "غائبة", late: "متأخرة", excused: "معتذرة", present: "حاضرة",
  };
  const statusText =
    lang === "ar" && !isMale
      ? (statusMapFemaleAr[status] || status)
      : (statusMap[lang]?.[status] || status);

  // ── Session data ─────────────────────────────────────────────────────────
  const sessionDate = session?.scheduledDate
    ? new Date(session.scheduledDate).toLocaleDateString(
        lang === "ar" ? "ar-EG" : "en-US",
        { weekday: "long", year: "numeric", month: "long", day: "numeric" }
      )
    : "";

  return {
    // Guardian
    guardianSalutation,
    guardianSalutation_ar,
    guardianSalutation_en,
    guardianName:     guardianFirstName,
    guardianFullName: student.guardianInfo?.name || "",
    relationship_ar,

    // Student
    salutation:      guardianSalutation, // common alias in templates
    studentSalutation,
    studentName:     studentFirstName,
    studentName_ar:  studentFirstName,
    studentName_en:  studentFirstName,
    studentFullName: student.personalInfo?.fullName || "",
    fullStudentName: student.personalInfo?.fullName || "",
    name_ar:         studentFirstName,
    name_en:         studentFirstName,
    fullName:        student.personalInfo?.fullName || "",

    // Gender
    childTitle,
    you_ar,
    welcome_ar,
    studentGender_ar,
    studentGender_en,

    // Status
    status:           statusText,
    attendanceStatus: statusText,

    // Session
    sessionName:  session?.title || "",
    date:         sessionDate,
    sessionDate,
    time:         `${session?.startTime || ""} - ${session?.endTime || ""}`,
    meetingLink:  session?.meetingLink || "",

    // Group
    groupName: session?.groupId?.name || "",
    groupCode: session?.groupId?.code || "",

    // Student extra
    enrollmentNumber: student.enrollmentNumber || "",

    // Language
    selectedLanguage_ar: lang === "ar" ? "العربية" : "الإنجليزية",
    selectedLanguage_en: lang === "ar" ? "Arabic"  : "English",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// renderTemplate — replace every {variable} with its resolved value
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
  // ── State ──────────────────────────────────────────────────────────────────
  const [attendance,        setAttendance]        = useState([]);
  const [rawTemplates,      setRawTemplates]      = useState({});    // raw {xxx} strings from DB
  const [customMessages,    setCustomMessages]    = useState({});    // what the textarea shows
  const [saving,            setSaving]            = useState(false);
  const [showMessageEditor, setShowMessageEditor] = useState({});
  const [showHints,         setShowHints]         = useState({});
  const [cursorPosition,    setCursorPosition]    = useState({});
  const [selectedHintIndex, setSelectedHintIndex] = useState({});
  const [loadingTemplates,  setLoadingTemplates]  = useState({});
  const [manuallyEdited,    setManuallyEdited]    = useState({});
  const [savingTemplate,    setSavingTemplate]    = useState({});
  const [templatesFetched,  setTemplatesFetched]  = useState(false);

  // ── DB template variables (gender-aware) ──────────────────────────────────
  const [dbVars, setDbVars] = useState({});

  const textareaRefs    = useRef({});
  const hintsRefs       = useRef({});
  const initialLoadDone = useRef(false);
  const fetchQueue      = useRef(new Set());

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

  // ── Helpers ────────────────────────────────────────────────────────────────
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
      return { hasBalance: false, remainingHours: 0, isBlocked: true };

    const remainingHours =
      student.creditSystem.currentPackage?.remainingHours || 0;

    const hasActiveFreeze = student.creditSystem.exceptions?.some(
      (e) =>
        e.type === "freeze" &&
        e.status === "active" &&
        (!e.endDate || new Date() <= new Date(e.endDate))
    );

    const isBlocked = hasActiveFreeze || remainingHours <= 0;
    return { hasBalance: remainingHours > 0, remainingHours, isBlocked };
  }, []);

  // ── Build rendered message (raw template + real student variables) ─────────
  const buildRenderedMessage = useCallback(
    (studentId, rawTemplate) => {
      const student = groupStudents.find(
        (s) => s._id?.toString() === studentId?.toString()
      );
      if (!student) return rawTemplate || "";

      const status    = getStudentStatus(studentId);
      const variables = buildVariables(student, status, session, dbVars);
      return renderTemplate(rawTemplate, variables);
    },
    [groupStudents, getStudentStatus, session, dbVars]
  );

  // ── Fetch template from API ───────────────────────────────────────────────
  const fetchTemplateForStudent = useCallback(
    async (studentId, status) => {
      if (!studentId || !status) return null;
      if (manuallyEdited[studentId]) return null;

      setLoadingTemplates((prev) => ({ ...prev, [studentId]: true }));
      try {
        const res  = await fetch(`/api/sessions/${session.id}/attendance-templates`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ attendanceStatus: status, studentId }),
        });
        const json = await res.json();

        if (json.success && json.data?.guardian?.content) {
          const raw = json.data.guardian.content;
          setRawTemplates((prev)   => ({ ...prev, [studentId]: raw }));
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
      setManuallyEdited((prev)   => ({ ...prev, [studentId]: false }));

      try {
        const res  = await fetch(`/api/sessions/${session.id}/attendance-templates`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ attendanceStatus: status, studentId }),
        });
        const json = await res.json();

        if (json.success && json.data?.guardian?.content) {
          const raw = json.data.guardian.content;
          setRawTemplates((prev)   => ({ ...prev, [studentId]: raw }));
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

  // ── Save template to DB ───────────────────────────────────────────────────
  const saveTemplateToDatabase = useCallback(
    async (studentId, rawContent) => {
      if (!studentId || !rawContent?.trim()) return;

      const status = getStudentStatus(studentId);
      if (!["absent", "late", "excused"].includes(status)) return;

      setSavingTemplate((prev) => ({ ...prev, [studentId]: true }));

      try {
        const typeMap = {
          absent:  "absence_notification",
          late:    "late_notification",
          excused: "excused_notification",
        };
        const nameMap = {
          absent:  "Absence Notification",
          late:    "Late Notification",
          excused: "Excused Absence Notification",
        };

        const templateType  = typeMap[status];
        const recipientType = "guardian";
        const student       = groupStudents.find(
          (s) => s._id?.toString() === studentId?.toString()
        );
        const studentLang = student?.communicationPreferences?.preferredLanguage || "ar";

        const searchRes  = await fetch(
          `/api/message-templates?type=${templateType}&default=true`
        );
        const searchJson = await searchRes.json();

        const updatePayload = {
          name:      nameMap[status],
          isDefault: true,
          ...(studentLang === "ar"
            ? { contentAr: rawContent, contentEn: searchJson.data?.[0]?.contentEn || "" }
            : { contentEn: rawContent, contentAr: searchJson.data?.[0]?.contentAr || "" }),
        };

        let saveRes, saveJson;

        if (searchJson.success && searchJson.data?.length > 0) {
          saveRes  = await fetch("/api/message-templates", {
            method:  "PUT",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ _id: searchJson.data[0]._id, ...updatePayload }),
          });
          saveJson = await saveRes.json();
        } else {
          saveRes  = await fetch("/api/message-templates", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              templateType,
              recipientType,
              ...updatePayload,
              isActive:  true,
              variables: [
                { key: "guardianSalutation", label: "Guardian Salutation" },
                { key: "studentName",        label: "Student Name"        },
                { key: "childTitle",         label: "Son / Daughter"      },
                { key: "status",             label: "Attendance Status"   },
                { key: "sessionName",        label: "Session Name"        },
                { key: "date",               label: "Date"                },
                { key: "time",               label: "Time"                },
                { key: "enrollmentNumber",   label: "Enrollment Number"   },
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

  // ── Update attendance status ──────────────────────────────────────────────
  const updateAttendanceStatus = useCallback(
    (studentId, status) => {
      const student = groupStudents.find(
        (s) => s._id?.toString() === studentId?.toString()
      );
      const { isBlocked, remainingHours } = checkStudentBalance(student);

      if (isBlocked && ["present", "late"].includes(status)) {
        toast.error(
          isRTL
            ? `لا يمكن تسجيل حضور - الرصيد صفر (${remainingHours}h)`
            : `Cannot mark attendance - Zero balance (${remainingHours}h)`
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
          next[idx]  = { ...next[idx], status };
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
        setCustomMessages((prev)    => { const n = { ...prev }; delete n[studentId]; return n; });
        setRawTemplates((prev)      => { const n = { ...prev }; delete n[studentId]; return n; });
        setManuallyEdited((prev)    => { const n = { ...prev }; delete n[studentId]; return n; });
      }
    },
    [fetchTemplateForStudent, manuallyEdited, groupStudents, checkStudentBalance, isRTL]
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
        next[idx]  = { ...next[idx], notes };
        return next;
      }
      return prev;
    });
  }, []);

  // ── Available variables for the hints dropdown ────────────────────────────
  const availableVariables = useMemo(
    () => [
      { key: "{guardianSalutation}", label: isRTL ? "تحية ولي الأمر (كاملة)"    : "Guardian Salutation",  icon: "👤" },
      { key: "{guardianName}",       label: isRTL ? "اسم ولي الأمر"             : "Guardian Name",        icon: "👤" },
      { key: "{studentName}",        label: isRTL ? "اسم الطالب"                : "Student Name",         icon: "👶" },
      { key: "{childTitle}",         label: isRTL ? "ابنك / ابنتك"              : "Son / Daughter",       icon: "👪" },
      { key: "{status}",             label: isRTL ? "حالة الحضور"               : "Attendance Status",    icon: "📊" },
      { key: "{attendanceStatus}",   label: isRTL ? "حالة الحضور (بديل)"        : "Attendance (alt)",     icon: "📊" },
      { key: "{sessionName}",        label: isRTL ? "اسم الجلسة"                : "Session Name",         icon: "📘" },
      { key: "{date}",               label: isRTL ? "التاريخ"                   : "Date",                 icon: "📅" },
      { key: "{time}",               label: isRTL ? "الوقت"                     : "Time",                 icon: "⏰" },
      { key: "{enrollmentNumber}",   label: isRTL ? "الرقم التعريفي"             : "Enrollment No.",       icon: "🔢" },
      { key: "{groupName}",          label: isRTL ? "اسم المجموعة"              : "Group Name",           icon: "👥" },
      { key: "{meetingLink}",        label: isRTL ? "رابط الجلسة"               : "Meeting Link",         icon: "🔗" },
    ],
    [isRTL]
  );

  // ── Textarea handlers ─────────────────────────────────────────────────────
  const handleTextareaInput = useCallback((e, studentId) => {
    const value     = e.target.value;
    const cursorPos = e.target.selectionStart;

    setCustomMessages((prev) => ({ ...prev, [studentId]: value }));
    setManuallyEdited((prev) => ({ ...prev, [studentId]: true  }));
    setCursorPosition((prev) => ({ ...prev, [studentId]: cursorPos }));

    const lastAt = value.substring(0, cursorPos).lastIndexOf("@");
    if (lastAt !== -1 && lastAt === cursorPos - 1) {
      setShowHints((prev)         => ({ ...prev, [studentId]: true }));
      setSelectedHintIndex((prev) => ({ ...prev, [studentId]: 0   }));
    } else {
      setShowHints((prev) => ({ ...prev, [studentId]: false }));
    }
  }, []);

  const insertVariable = useCallback(
    (studentId, variable) => {
      const textarea = textareaRefs.current[studentId];
      if (!textarea) return;

      const current   = customMessages[studentId] || "";
      const cursorPos = cursorPosition[studentId] || 0;
      const before    = current.substring(0, cursorPos);
      const lastAt    = before.lastIndexOf("@");

      let newValue, newCursor;
      if (lastAt !== -1) {
        newValue  = current.substring(0, lastAt) + variable.key + current.substring(cursorPos);
        newCursor = lastAt + variable.key.length;
      } else {
        newValue  = current.substring(0, cursorPos) + variable.key + current.substring(cursorPos);
        newCursor = cursorPos + variable.key.length;
      }

      setCustomMessages((prev) => ({ ...prev, [studentId]: newValue }));
      setManuallyEdited((prev) => ({ ...prev, [studentId]: true     }));
      setShowHints((prev)      => ({ ...prev, [studentId]: false    }));

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

  // ── Effects ────────────────────────────────────────────────────────────────

  // Initialise attendance from DB or student list
  useEffect(() => {
    if (initialLoadDone.current) return;
    if (attendanceData?.attendance?.length > 0) {
      setAttendance(attendanceData.attendance);
    } else if (groupStudents.length > 0) {
      setAttendance(
        groupStudents.map((s) => ({ studentId: s._id, status: "absent", notes: "" }))
      );
    }
    initialLoadDone.current = true;
  }, [attendanceData, groupStudents]);

  // Fetch templates for already-absent/late/excused students
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

  // Close hints on outside click
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

  // ── Save all attendance ───────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Render all messages (replace {variables} with real values) before sending
      const renderedMessages = {};
      Object.keys(customMessages).forEach((studentId) => {
        renderedMessages[studentId] = buildRenderedMessage(
          studentId,
          customMessages[studentId]
        );
      });

      const res  = await fetch(`/api/sessions/${session.id}/attendance`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          attendance: attendance.map((a) => ({
            studentId: a.studentId?._id || a.studentId?.id || a.studentId,
            status:    a.status,
            notes:     a.notes || "",
          })),
          customMessages: renderedMessages, // ← fully rendered, no {vars}
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(isRTL ? "تم حفظ الحضور بنجاح ✅" : "Attendance saved ✅");
        onClose();
        onRefresh();
      } else {
        toast.error(json.error || (isRTL ? "فشل الحفظ" : "Save failed"));
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
  ]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-darkmode rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        </div>
      </div>
    );
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    total:   groupStudents.length,
    present: attendance.filter((a) => a.status === "present").length,
    absent:  attendance.filter((a) => a.status === "absent").length,
    late:    attendance.filter((a) => a.status === "late").length,
    excused: attendance.filter((a) => a.status === "excused").length,
    blocked: groupStudents.filter((s) => checkStudentBalance(s).isBlocked).length,
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="bg-white dark:bg-darkmode rounded-xl shadow-lg max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">

        {/* ── Header ── */}
        <div className="p-6 border-b border-PowderBlueBorder dark:border-dark_border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-MidnightNavyText dark:text-white">
              {isRTL ? "تسجيل الحضور" : "Attendance"} — {session?.title}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(session?.scheduledDate).toLocaleDateString(
                isRTL ? "ar-EG" : "en-US",
                { weekday: "short", year: "numeric", month: "short", day: "numeric" }
              )}{" "}
              · {session?.startTime} {isRTL ? "إلى" : "to"} {session?.endTime}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Stats ── */}
        <div className="p-6 border-b border-PowderBlueBorder dark:border-dark_border bg-gray-50 dark:bg-dark_input">
          <div className="grid grid-cols-6 gap-4">
            {[
              { label: isRTL ? "الإجمالي" : "Total",   value: stats.total,   color: "text-gray-800 dark:text-white" },
              { label: isRTL ? "حاضر"    : "Present",  value: stats.present, color: "text-green-600"  },
              { label: isRTL ? "غائب"    : "Absent",   value: stats.absent,  color: "text-red-600"    },
              { label: isRTL ? "متأخر"   : "Late",     value: stats.late,    color: "text-yellow-600" },
              { label: isRTL ? "معتذر"   : "Excused",  value: stats.excused, color: "text-blue-600"   },
              { label: isRTL ? "محظور"   : "Blocked",  value: stats.blocked, color: "text-gray-500"   },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Students List ── */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {groupStudents.map((student) => {
              const studentId    = student._id?.toString();
              const status       = getStudentStatus(studentId);
              const notes        = getStudentNotes(studentId);
              const needsMessage = ["absent", "late", "excused"].includes(status);
              const studentLang  = student.communicationPreferences?.preferredLanguage || "ar";
              const gender       = (student.personalInfo?.gender       || "male").toLowerCase().trim();
              const relationship = (student.guardianInfo?.relationship || "father").toLowerCase().trim();

              const { remainingHours, isBlocked } = checkStudentBalance(student);

              // Live variables (DB-powered) for preview and context card
              const currentVars = buildVariables(student, status, session, dbVars);

              // Preview: raw template + render with real values
              const rawMsg     = customMessages[studentId] || "";
              const previewMsg = renderTemplate(rawMsg, currentVars);

              return (
                <div
                  key={studentId}
                  className={`border rounded-lg overflow-hidden ${
                    isBlocked
                      ? "border-gray-300 dark:border-gray-700 opacity-75"
                      : "border-PowderBlueBorder dark:border-dark_border"
                  }`}
                >
                  {/* ── Student row + select ── */}
                  <div
                    className={`flex items-center justify-between p-4 ${
                      isBlocked
                        ? "bg-gray-100 dark:bg-gray-800"
                        : "bg-white dark:bg-darkmode"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-MidnightNavyText dark:text-white">
                          {student.personalInfo?.fullName}
                        </p>
                        {isBlocked && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs">
                            <Ban className="w-3 h-3" />
                            {isRTL ? "محظور" : "Blocked"}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-500">
                        {isRTL ? "رقم" : "ID"}: {student.enrollmentNumber}
                      </p>

                      <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
                        <span className="text-blue-600 dark:text-blue-400">
                          {studentLang === "ar" ? "🇸🇦 عربي" : "🇬🇧 English"}
                        </span>
                        <span className="text-purple-600 dark:text-purple-400">
                          {gender === "female"
                            ? isRTL ? "👧 أنثى" : "👧 Female"
                            : isRTL ? "👦 ذكر"  : "👦 Male"}
                        </span>
                        <span className="text-green-600 dark:text-green-400">
                          {relationship === "mother"
                            ? isRTL ? "👩 أم"   : "👩 Mother"
                            : relationship === "father"
                              ? isRTL ? "👨 أب"  : "👨 Father"
                              : isRTL ? "👤 ولي" : "👤 Guardian"}
                        </span>
                        {student.creditSystem?.currentPackage && (
                          <span
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
                              remainingHours <= 0
                                ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                : remainingHours <= 2
                                  ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                  : remainingHours <= 5
                                    ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                                    : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>{remainingHours}h</span>
                          </span>
                        )}
                      </div>

                      {!isBlocked && remainingHours <= 2 && remainingHours > 0 && (
                        <p className="flex items-center gap-1 mt-1 text-xs text-red-600 dark:text-red-400">
                          <AlertTriangle className="w-3 h-3" />
                          {isRTL
                            ? `تحذير: الرصيد على وشك النفاذ (${remainingHours}h)`
                            : `Warning: Low balance (${remainingHours}h)`}
                        </p>
                      )}
                    </div>

                    <select
                      value={status}
                      onChange={(e) => updateAttendanceStatus(studentId, e.target.value)}
                      disabled={isBlocked}
                      className={`px-3 py-2 text-sm border rounded-lg dark:bg-dark_input dark:text-white ${
                        isBlocked
                          ? "border-gray-300 dark:border-gray-700 opacity-50 cursor-not-allowed"
                          : "border-PowderBlueBorder dark:border-dark_border"
                      }`}
                    >
                      <option value="present" disabled={isBlocked}>{isRTL ? "حاضر"  : "Present"}</option>
                      <option value="absent">                       {isRTL ? "غائب"  : "Absent" }</option>
                      <option value="late"    disabled={isBlocked}>{isRTL ? "متأخر" : "Late"   }</option>
                      <option value="excused">                      {isRTL ? "معتذر" : "Excused"}</option>
                    </select>
                  </div>

                  {/* ── Message editor (absent/late/excused, not blocked) ── */}
                  {!isBlocked && needsMessage && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 border-t border-purple-200 dark:border-purple-800 p-4">
                      <div className="flex items-start gap-3">
                        <MessageCircle className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 space-y-3">

                          {/* Title + reset button */}
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-purple-900 dark:text-purple-100 text-sm">
                              📨 {isRTL ? "رسالة لولي الأمر" : "Message for Guardian"}
                              {" "}({student.guardianInfo?.name || (isRTL ? "ولي الأمر" : "Guardian")})
                            </h4>
                            <button
                              onClick={() => resetToDefaultTemplate(studentId)}
                              disabled={loadingTemplates[studentId]}
                              className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-700 rounded hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-1"
                            >
                              <RefreshCw
                                className={`w-3 h-3 ${loadingTemplates[studentId] ? "animate-spin" : ""}`}
                              />
                              {isRTL ? "استعادة" : "Reset"}
                            </button>
                          </div>

                          {/* Context card (read-only) */}
                          <div className="p-2 bg-white dark:bg-gray-800 rounded border border-purple-200 dark:border-purple-700 text-xs space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-purple-500 font-medium">
                                {isRTL ? "تحية ولي الأمر:" : "Guardian greeting:"}
                              </span>
                              <span className="text-gray-800 dark:text-gray-200 font-semibold">
                                {currentVars.guardianSalutation}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-purple-500 font-medium">
                                {isRTL ? "الإشارة للطالب:" : "Student ref:"}
                              </span>
                              <span className="text-gray-800 dark:text-gray-200">
                                {currentVars.childTitle}{" "}
                                <strong>{currentVars.studentName}</strong>
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-purple-500 font-medium">
                                {isRTL ? "الحالة:" : "Status:"}
                              </span>
                              <span className="text-gray-800 dark:text-gray-200">
                                {currentVars.status}
                              </span>
                            </div>
                            {loadingTemplates[studentId] && (
                              <div className="flex items-center gap-2 text-purple-600">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                {isRTL ? "جاري تحميل القالب..." : "Loading template..."}
                              </div>
                            )}
                            {manuallyEdited[studentId] && (
                              <p className="text-orange-500 dark:text-orange-400">
                                ✏️ {isRTL ? "معدّلة يدوياً" : "Manually edited"}
                              </p>
                            )}
                          </div>

                          {/* Textarea — raw template */}
                          <div className="space-y-1 relative">
                            <label className="text-xs text-gray-600 dark:text-gray-400">
                              {isRTL
                                ? "نص القالب (اكتب @ لإدراج متغير)"
                                : "Template text (type @ to insert variable)"}
                            </label>

                            <textarea
                              ref={(el) => (textareaRefs.current[studentId] = el)}
                              value={rawMsg}
                              onChange={(e) => handleTextareaInput(e, studentId)}
                              onKeyDown={(e) => handleKeyDown(e, studentId)}
                              onSelect={(e) =>
                                setCursorPosition((prev) => ({
                                  ...prev,
                                  [studentId]: e.target.selectionStart,
                                }))
                              }
                              placeholder={
                                isRTL
                                  ? "مثال: {guardianSalutation}، {childTitle} {studentName} غاب اليوم."
                                  : "e.g. {guardianSalutation}, {childTitle} {studentName} was absent today."
                              }
                              className="w-full px-3 py-2.5 border-2 border-purple-200 dark:border-purple-700 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white resize-none h-28 font-mono text-sm"
                              dir={studentLang === "ar" ? "rtl" : "ltr"}
                            />

                            {/* Hints dropdown */}
                            {showHints[studentId] && (
                              <div
                                ref={(el) => (hintsRefs.current[studentId] = el)}
                                className="absolute z-50 w-full mt-1 bg-white dark:bg-darkmode border-2 border-purple-300 dark:border-purple-700 rounded-lg shadow-xl max-h-56 overflow-y-auto"
                              >
                                <div className="px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 border-b dark:border-purple-800">
                                  <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                                    <Zap className="w-3 h-3" />
                                    {isRTL ? "المتغيرات المتاحة" : "Available Variables"}
                                  </p>
                                </div>
                                {availableVariables.map((v, i) => (
                                  <button
                                    key={v.key}
                                    type="button"
                                    onClick={() => insertVariable(studentId, v)}
                                    className={`w-full px-3 py-2 text-right hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-2 ${
                                      i === (selectedHintIndex[studentId] || 0)
                                        ? "bg-purple-100 dark:bg-purple-900/40"
                                        : ""
                                    }`}
                                  >
                                    <span>{v.icon}</span>
                                    <div className="flex-1 flex items-center justify-between">
                                      <span className="text-sm font-mono text-purple-600 dark:text-purple-400">
                                        {v.key}
                                      </span>
                                      <span className="text-xs text-gray-500">{v.label}</span>
                                    </div>
                                  </button>
                                ))}
                                <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-t text-xs text-gray-400">
                                  ↑↓ {isRTL ? "للتنقل" : "navigate"} · Enter{" "}
                                  {isRTL ? "للإدراج" : "insert"} · Esc{" "}
                                  {isRTL ? "إغلاق" : "close"}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Notes */}
                          <div>
                            <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                              {isRTL ? "ملاحظات (اختياري)" : "Notes (optional)"}
                            </label>
                            <input
                              type="text"
                              value={notes}
                              onChange={(e) => updateStudentNotes(studentId, e.target.value)}
                              placeholder={isRTL ? "أضف ملاحظة..." : "Add a note..."}
                              className="w-full px-3 py-2 text-sm border border-purple-200 dark:border-purple-700 rounded-lg dark:bg-gray-800 dark:text-white"
                            />
                          </div>

                          {/* Live preview (rendered) */}
                          {previewMsg && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700 overflow-hidden">
                              <div className="bg-purple-50 dark:bg-purple-900/30 px-3 py-2 border-b flex items-center justify-between">
                                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                                  📋{" "}
                                  {isRTL
                                    ? "معاينة الرسالة الفعلية (بعد استبدال المتغيرات)"
                                    : "Live Preview (variables resolved)"}
                                </span>
                                <span className="text-xs text-purple-400">
                                  {studentLang === "ar" ? "🇸🇦" : "🇬🇧"} ·
                                  {gender === "female" ? " 👧" : " 👦"} ·
                                  {relationship === "mother" ? " 👩 أم" : " 👨 أب"}
                                </span>
                              </div>
                              <div
                                className="p-3 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700 max-h-48 overflow-y-auto"
                                dir={studentLang === "ar" ? "rtl" : "ltr"}
                              >
                                {previewMsg}
                              </div>
                            </div>
                          )}

                          {/* Save as default template */}
                          <div className="flex justify-end pt-2 border-t border-purple-200 dark:border-purple-800">
                            <button
                              onClick={() => saveTemplateToDatabase(studentId, rawMsg)}
                              disabled={!rawMsg || savingTemplate[studentId] || loadingTemplates[studentId]}
                              className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                            >
                              {savingTemplate[studentId] ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  {isRTL ? "جاري الحفظ..." : "Saving..."}
                                </>
                              ) : (
                                <>
                                  <Save className="w-3 h-3" />
                                  {isRTL ? "حفظ كقالب افتراضي" : "Save as Default Template"}
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Blocked + needs message ── */}
                  {isBlocked && needsMessage && (
                    <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 p-4 text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                        <Ban className="w-4 h-4" />
                        {isRTL
                          ? "تم تعطيل الإشعارات بسبب نفاد الرصيد"
                          : "Notifications disabled — zero balance"}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {groupStudents.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 font-medium">
                {isRTL ? "لا يوجد طلاب في هذه المجموعة" : "No students in this group"}
              </p>
            </div>
          )}
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
            disabled={saving}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                {isRTL ? "جاري الحفظ..." : "Saving..."}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isRTL ? "حفظ الحضور" : "Save Attendance"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}