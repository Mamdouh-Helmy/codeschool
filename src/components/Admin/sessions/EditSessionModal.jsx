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
  Clock
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

  // ✅ المتغيرات الجديدة للقوالب التي تستخدم {salutation_ar} و {salutation_en}
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
    salutation: guardianSalutation, // alias للتوافق مع القوالب القديمة
    
    // ✅ المتغيرات الجديدة
    salutation_ar,   // للقوالب العربية التي تستخدم {salutation_ar}
    salutation_en,   // للقوالب الإنجليزية التي تستخدم {salutation_en}
    
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
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function EditSessionModal({
  session,
  groupStudents,
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

  // ✅ DB template variables (نفس منطق ReminderModal)
  const [dbVars, setDbVars] = useState({});

  const studentTextareaRef  = useRef(null);
  const guardianTextareaRef = useRef(null);
  const hintsRef = useRef({ student: null, guardian: null });

  const showReasonField = formData.status === "cancelled" || formData.status === "postponed";
  const isPostponed     = formData.status === "postponed";

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
          // ✅ نستخدم rawContent (القالب بدون replace) عشان المستخدم يقدر يعدل المتغيرات
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
  // ✅ FIX: بنبعت الرسائل كـ per-student objects جوه metadata
  // عشان onSessionStatusChanged في groupAutomation يعرف يعمل render صح لكل طالب
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
      // ✅ بنبني per-student rendered messages للباك إند
      // كل طالب بياخد render بمتغيراته هو
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
          // ✅ metadata بيحتوي على per-student rendered messages
          // الباك إند (onSessionStatusChanged) يقرأهم من:
          // metadata.studentMessages[studentId] و metadata.guardianMessages[studentId]
          metadata: showReasonField
            ? { studentMessages, guardianMessages }
            : {},
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(isRTL ? "تم تحديث الجلسة بنجاح" : "Session updated successfully");
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

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
              {isRTL ? "الحالة" : "Status"}
            </label>
            <select
              value={formData.status}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, status: e.target.value }));
                setManuallyEdited({ student: false, guardian: false });
              }}
              className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
            >
              <option value="scheduled">{isRTL ? "مجدولة"  : "Scheduled"}</option>
              <option value="completed">{isRTL ? "مكتملة"  : "Completed"}</option>
              <option value="cancelled">{isRTL ? "ملغاة"   : "Cancelled"}</option>
              <option value="postponed">{isRTL ? "مؤجلة"   : "Postponed"}</option>
            </select>
          </div>

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