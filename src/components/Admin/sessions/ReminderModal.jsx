"use client";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import toast from "react-hot-toast";
import {
  X,
  Send,
  RefreshCw,
  MessageCircle,
  User,
  Users,
  Zap,
  Calendar,
  Clock,
  Save,
  Globe,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// resolveVar — gender-aware value from a DB TemplateVariable object
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
// ─────────────────────────────────────────────────────────────────────────────
function buildVariables(student, session, dbVars = {}) {
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

  const salutationBase_en =
    resolveVar(dbVars, "salutation_en", "en", genderCtx) ||
    "Dear";

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
  const studentSalutation_en  = `${salutationBase_en} ${studentFirstName}`;
  const studentSalutation     = lang === "ar" ? studentSalutation_ar : studentSalutation_en;

  const childTitle = lang === "ar" ? childTitleAr : childTitleEn;

  // ── Session data ─────────────────────────────────────────────────────────
  const sessionDate = session?.scheduledDate
    ? new Date(session.scheduledDate).toLocaleDateString(
        lang === "ar" ? "ar-EG" : "en-US",
        { weekday: "long", year: "numeric", month: "long", day: "numeric" }
      )
    : "";

  return {
    // ── تحيات الطالب ─────────────────────────────────────────────────────
    studentSalutation,          // يستخدم حسب لغة الطالب (ar أو en)
    studentSalutation_ar,       // دائماً العربي  → {studentSalutation_ar}
    studentSalutation_en,       // دائماً الإنجليزي → {studentSalutation_en}

    // ── تحيات ولي الأمر ───────────────────────────────────────────────────
    guardianSalutation,         // يستخدم حسب لغة الطالب → {guardianSalutation}
    guardianSalutation_ar,      // دائماً العربي  → {guardianSalutation_ar}
    guardianSalutation_en,      // دائماً الإنجليزي → {guardianSalutation_en}

    // ── ✅ FIX: المتغيرات اللي كانت مفقودة ──────────────────────────────
    // {salutation_ar} في قوالب الطالب → تحية الطالب بالعربي
    salutation_ar: studentSalutation_ar,
    // {salutation_en} في قوالب الطالب → تحية الطالب بالإنجليزي
    salutation_en: studentSalutation_en,

    // ── alias مشترك (للتوافق مع القوالب القديمة) ─────────────────────────
    // {salutation} → تحية ولي الأمر حسب لغة الطالب (الأكثر استخداماً في قوالب الولي)
    salutation: guardianSalutation,

    // ── أسماء ────────────────────────────────────────────────────────────
    studentName:      studentFirstName,
    studentFullName:  student.personalInfo?.fullName || "",
    guardianName:     guardianFirstName,
    guardianFullName: student.guardianInfo?.name || "",

    // ── childTitle ────────────────────────────────────────────────────────
    childTitle,

    // ── بيانات الجلسة ────────────────────────────────────────────────────
    sessionName:      session?.title       || "",
    date:             sessionDate,
    time:             `${session?.startTime || ""} - ${session?.endTime || ""}`,
    meetingLink:      session?.meetingLink  || "",
    groupCode:        session?.groupId?.code || "",
    groupName:        session?.groupId?.name || "",
    enrollmentNumber: student.enrollmentNumber || "",
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
export default function ReminderModal({
  session,
  groupStudents,
  reminderType,
  onClose,
  onRefresh,
  isRTL,
  t,
}) {
  // ── Template content shown in the editors ─────────────────────────────────
  const [currentStudentMessage,  setCurrentStudentMessage]  = useState("");
  const [currentGuardianMessage, setCurrentGuardianMessage] = useState("");

  // ── Raw templates per student (fetched from API) ──────────────────────────
  const [studentTemplates,  setStudentTemplates]  = useState({});
  const [guardianTemplates, setGuardianTemplates] = useState({});

  // ── Per-student manual edits ──────────────────────────────────────────────
  const [editedStudentTemplates,  setEditedStudentTemplates]  = useState({});
  const [editedGuardianTemplates, setEditedGuardianTemplates] = useState({});

  // ── Preview (rendered) ────────────────────────────────────────────────────
  const [previewStudentMessage,  setPreviewStudentMessage]  = useState("");
  const [previewGuardianMessage, setPreviewGuardianMessage] = useState("");

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showHints,               setShowHints]               = useState({ student: false, guardian: false });
  const [cursorPosition,          setCursorPosition]          = useState({ student: 0, guardian: 0 });
  const [selectedHintIndex,       setSelectedHintIndex]       = useState({ student: 0, guardian: 0 });
  const [selectedStudentForPreview, setSelectedStudentForPreview] = useState(null);
  const [loadingTemplates,        setLoadingTemplates]        = useState(false);
  const [manuallyEdited,          setManuallyEdited]          = useState({ student: false, guardian: false });
  const [savingTemplate,          setSavingTemplate]          = useState({ student: false, guardian: false });
  const [sending,                 setSending]                 = useState(false);

  // ── DB template variables ─────────────────────────────────────────────────
  const [dbVars, setDbVars] = useState({});

  const studentTextareaRef  = useRef(null);
  const guardianTextareaRef = useRef(null);
  const hintsRef            = useRef({ student: null, guardian: null });

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

  // ── Fetch templates for all students ─────────────────────────────────────
  useEffect(() => {
    const fetchAllTemplates = async () => {
      if (!groupStudents.length) return;

      setLoadingTemplates(true);
      try {
        const eventType = reminderType === "24hours" ? "reminder_24h" : "reminder_1h";

        const results = await Promise.all(
          groupStudents.map(async (student) => {
            const res  = await fetch(`/api/sessions/${session.id}/templates`, {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body:    JSON.stringify({
                eventType,
                studentId: student._id,
                extraData: { meetingLink: session.meetingLink },
              }),
            });
            const json = await res.json();

            if (json.success) {
              return {
                studentId:       student._id,
                studentTemplate:  json.data.student?.rawContent  || json.data.student?.content  || "",
                guardianTemplate: json.data.guardian?.rawContent || json.data.guardian?.content || "",
              };
            }
            return null;
          })
        );

        const newStudentTemplates  = {};
        const newGuardianTemplates = {};

        results.forEach((r) => {
          if (r) {
            newStudentTemplates[r.studentId]  = r.studentTemplate;
            newGuardianTemplates[r.studentId] = r.guardianTemplate;
          }
        });

        setStudentTemplates(newStudentTemplates);
        setGuardianTemplates(newGuardianTemplates);

        if (groupStudents[0]) {
          setCurrentStudentMessage(newStudentTemplates[groupStudents[0]._id]  || "");
          setCurrentGuardianMessage(newGuardianTemplates[groupStudents[0]._id] || "");
        }
      } catch (err) {
        console.error("Error fetching templates:", err);
        toast.error(isRTL ? "فشل تحميل القوالب" : "Failed to load templates");
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchAllTemplates();
  }, [groupStudents, reminderType, session.id, session.meetingLink, isRTL]);

  // ── Live preview (re-renders when message or student changes) ─────────────
  useEffect(() => {
    if (!selectedStudentForPreview) return;
    const vars = buildVariables(selectedStudentForPreview, session, dbVars);
    setPreviewStudentMessage(renderTemplate(currentStudentMessage,  vars));
    setPreviewGuardianMessage(renderTemplate(currentGuardianMessage, vars));
  }, [currentStudentMessage, currentGuardianMessage, selectedStudentForPreview, session, dbVars]);

  // ── Switch preview when a different student is selected ──────────────────
  const handleSelectStudentForPreview = useCallback(
    (student) => {
      setSelectedStudentForPreview(student);
      setManuallyEdited({ student: false, guardian: false });

      const sid = student._id;
      setCurrentStudentMessage(
        editedStudentTemplates[sid]  ?? studentTemplates[sid]  ?? ""
      );
      setCurrentGuardianMessage(
        editedGuardianTemplates[sid] ?? guardianTemplates[sid] ?? ""
      );
    },
    [editedStudentTemplates, editedGuardianTemplates, studentTemplates, guardianTemplates]
  );

  // ── Save template to DB ───────────────────────────────────────────────────
  const saveTemplateToDatabase = useCallback(
    async (type, content) => {
      if (!selectedStudentForPreview || !content?.trim()) return;

      setSavingTemplate((prev) => ({ ...prev, [type]: true }));

      try {
        const templateType =
          reminderType === "24hours"
            ? type === "student" ? "reminder_24h_student" : "reminder_24h_guardian"
            : type === "student" ? "reminder_1h_student"  : "reminder_1h_guardian";

        const recipientType = type === "student" ? "student" : "guardian";
        const studentLang   =
          selectedStudentForPreview.communicationPreferences?.preferredLanguage || "ar";

        const templateName =
          reminderType === "24hours"
            ? type === "student" ? "24h Reminder - Student" : "24h Reminder - Guardian"
            : type === "student" ? "1h Reminder - Student"  : "1h Reminder - Guardian";

        const searchRes  = await fetch(
          `/api/message-templates?type=${templateType}&recipient=${recipientType}&default=true`
        );
        const searchJson = await searchRes.json();

        if (searchJson.success && searchJson.data.length > 0) {
          const existing = searchJson.data[0];

          const updateData = {
            id:        existing._id,
            name:      templateName,
            isDefault: true,
            updatedAt: new Date(),
            ...(studentLang === "ar"
              ? { contentAr: content,       contentEn: existing.contentEn || "" }
              : { contentEn: content,       contentAr: existing.contentAr || "" }),
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
            description: `${reminderType === "24hours" ? "24 hours" : "1 hour"} reminder for ${recipientType}`,
            isDefault:   true,
            isActive:    true,
            variables: [
              { key: "guardianSalutation",    label: "Guardian Salutation"    },
              { key: "guardianSalutation_ar", label: "Guardian Salutation AR" },
              { key: "guardianSalutation_en", label: "Guardian Salutation EN" },
              { key: "studentSalutation",     label: "Student Salutation"     },
              { key: "studentSalutation_ar",  label: "Student Salutation AR"  },
              { key: "studentSalutation_en",  label: "Student Salutation EN"  },
              { key: "salutation_ar",         label: "Salutation AR"          },
              { key: "salutation_en",         label: "Salutation EN"          },
              { key: "salutation",            label: "Salutation"             },
              { key: "studentName",           label: "Student Name"           },
              { key: "guardianName",          label: "Guardian Name"          },
              { key: "childTitle",            label: "Son/Daughter"           },
              { key: "sessionName",           label: "Session Name"           },
              { key: "date",                  label: "Date"                   },
              { key: "time",                  label: "Time"                   },
              { key: "meetingLink",           label: "Meeting Link"           },
              { key: "enrollmentNumber",      label: "Enrollment Number"      },
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

        const sid = selectedStudentForPreview._id;
        if (type === "student") {
          setStudentTemplates((prev) => ({ ...prev, [sid]: content }));
        } else {
          setGuardianTemplates((prev) => ({ ...prev, [sid]: content }));
        }
      } catch (err) {
        console.error("Error saving template:", err);
        toast.error(
          isRTL
            ? "فشل حفظ القالب: " + err.message
            : "Failed to save template: " + err.message
        );
      } finally {
        setSavingTemplate((prev) => ({ ...prev, [type]: false }));
      }
    },
    [reminderType, selectedStudentForPreview, isRTL]
  );

  // ── Send reminders ────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    setSending(true);
    try {
      const studentMessages  = {};
      const guardianMessages = {};

      groupStudents.forEach((student) => {
        const sid  = student._id.toString();
        const vars = buildVariables(student, session, dbVars);

        const rawStudent  = editedStudentTemplates[sid]  ?? studentTemplates[sid]  ?? "";
        const rawGuardian = editedGuardianTemplates[sid] ?? guardianTemplates[sid] ?? "";

        studentMessages[sid]  = renderTemplate(rawStudent,  vars);
        guardianMessages[sid] = renderTemplate(rawGuardian, vars);
      });

      const res = await fetch(`/api/sessions/${session.id}/send-reminder`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          reminderType,
          metadata: {
            studentMessages,
            guardianMessages,
          },
        }),
      });

      const json = await res.json();

      if (json.success) {
        toast.success(isRTL ? "تم إرسال التذكيرات ✅" : "Reminders sent ✅");
        onClose();
        if (onRefresh) onRefresh();
      } else {
        toast.error(json.error || (isRTL ? "فشل الإرسال" : "Send failed"));
      }
    } catch (err) {
      console.error("Error sending reminders:", err);
      toast.error(isRTL ? "حدث خطأ" : "An error occurred");
    } finally {
      setSending(false);
    }
  }, [
    groupStudents,
    session,
    dbVars,
    studentTemplates,
    guardianTemplates,
    editedStudentTemplates,
    editedGuardianTemplates,
    reminderType,
    isRTL,
    onClose,
    onRefresh,
  ]);

  // ── Available variables for hints dropdown ────────────────────────────────
  const availableVariables = useMemo(
    () => [
      // تحيات الطالب
      { key: "{studentSalutation}",     label: isRTL ? "تحية الطالب (حسب اللغة)"     : "Student Salutation",        icon: "👶" },
      { key: "{studentSalutation_ar}",  label: isRTL ? "تحية الطالب - عربي"           : "Student Salutation (AR)",    icon: "👶" },
      { key: "{studentSalutation_en}",  label: isRTL ? "تحية الطالب - إنجليزي"        : "Student Salutation (EN)",    icon: "👶" },
      // ✅ المتغيرات المُصلحة
      { key: "{salutation_ar}",         label: isRTL ? "التحية - عربي"                : "Salutation (AR)",            icon: "👋" },
      { key: "{salutation_en}",         label: isRTL ? "التحية - إنجليزي"             : "Salutation (EN)",            icon: "👋" },
      // تحيات ولي الأمر
      { key: "{guardianSalutation}",    label: isRTL ? "تحية ولي الأمر (حسب اللغة)"  : "Guardian Salutation",        icon: "👤" },
      { key: "{guardianSalutation_ar}", label: isRTL ? "تحية ولي الأمر - عربي"        : "Guardian Salutation (AR)",   icon: "👤" },
      { key: "{guardianSalutation_en}", label: isRTL ? "تحية ولي الأمر - إنجليزي"    : "Guardian Salutation (EN)",   icon: "👤" },
      { key: "{salutation}",            label: isRTL ? "التحية العامة (ولي الأمر)"    : "Salutation (guardian alias)", icon: "👋" },
      // أسماء
      { key: "{studentName}",           label: isRTL ? "اسم الطالب"                   : "Student Name",               icon: "👶" },
      { key: "{guardianName}",          label: isRTL ? "اسم ولي الأمر"               : "Guardian Name",              icon: "👤" },
      { key: "{childTitle}",            label: isRTL ? "ابنك/ابنتك"                   : "Son/Daughter",               icon: "👪" },
      // بيانات الجلسة
      { key: "{sessionName}",           label: isRTL ? "اسم الجلسة"                   : "Session Name",               icon: "📘" },
      { key: "{date}",                  label: isRTL ? "التاريخ"                       : "Date",                       icon: "📅" },
      { key: "{time}",                  label: isRTL ? "الوقت"                         : "Time",                       icon: "⏰" },
      { key: "{meetingLink}",           label: isRTL ? "رابط الاجتماع"               : "Meeting Link",               icon: "🔗" },
      { key: "{enrollmentNumber}",      label: isRTL ? "الرقم التعريفي"              : "Enrollment No.",             icon: "🔢" },
    ],
    [isRTL]
  );

  // ── Generic insert variable helper ────────────────────────────────────────
  const insertVariable = useCallback(
    (type, variable) => {
      const isStudent   = type === "student";
      const textarea    = isStudent ? studentTextareaRef.current : guardianTextareaRef.current;
      const currentVal  = isStudent ? currentStudentMessage      : currentGuardianMessage;
      const cursorPos   = isStudent ? cursorPosition.student     : cursorPosition.guardian;

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

      if (isStudent) {
        setCurrentStudentMessage(newValue);
        if (selectedStudentForPreview) {
          setEditedStudentTemplates((prev) => ({
            ...prev,
            [selectedStudentForPreview._id]: newValue,
          }));
          setManuallyEdited((prev) => ({ ...prev, student: true }));
        }
        setShowHints((prev) => ({ ...prev, student: false }));
      } else {
        setCurrentGuardianMessage(newValue);
        if (selectedStudentForPreview) {
          setEditedGuardianTemplates((prev) => ({
            ...prev,
            [selectedStudentForPreview._id]: newValue,
          }));
          setManuallyEdited((prev) => ({ ...prev, guardian: true }));
        }
        setShowHints((prev) => ({ ...prev, guardian: false }));
      }

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursor, newCursor);
      }, 0);
    },
    [
      currentStudentMessage,
      currentGuardianMessage,
      cursorPosition,
      selectedStudentForPreview,
    ]
  );

  // ── Textarea input handlers ───────────────────────────────────────────────
  const handleInput = useCallback(
    (e, type) => {
      const value     = e.target.value;
      const cursorPos = e.target.selectionStart;
      const isStudent = type === "student";

      if (isStudent) {
        setCurrentStudentMessage(value);
        if (selectedStudentForPreview) {
          setEditedStudentTemplates((prev) => ({
            ...prev,
            [selectedStudentForPreview._id]: value,
          }));
          setManuallyEdited((prev) => ({ ...prev, student: true }));
        }
      } else {
        setCurrentGuardianMessage(value);
        if (selectedStudentForPreview) {
          setEditedGuardianTemplates((prev) => ({
            ...prev,
            [selectedStudentForPreview._id]: value,
          }));
          setManuallyEdited((prev) => ({ ...prev, guardian: true }));
        }
      }

      setCursorPosition((prev) => ({ ...prev, [type]: cursorPos }));

      const lastAt = value.substring(0, cursorPos).lastIndexOf("@");
      if (lastAt !== -1 && lastAt === cursorPos - 1) {
        setShowHints((prev)         => ({ ...prev, [type]: true }));
        setSelectedHintIndex((prev) => ({ ...prev, [type]: 0   }));
      } else {
        setShowHints((prev) => ({ ...prev, [type]: false }));
      }
    },
    [selectedStudentForPreview]
  );

  // ── Keyboard navigation for hints ────────────────────────────────────────
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

  // ── Salutation preview (for the context card) ─────────────────────────────
  const salutationPreview = useMemo(() => {
    if (!selectedStudentForPreview) return null;
    return buildVariables(selectedStudentForPreview, session, dbVars);
  }, [selectedStudentForPreview, session, dbVars]);

  // ── Hints dropdown ────────────────────────────────────────────────────────
  const renderHints = (type) => {
    if (!showHints[type]) return null;
    return (
      <div
        ref={(el) => (hintsRef.current[type] = el)}
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
            onClick={() => insertVariable(type, v)}
            className={`w-full px-3 py-2 text-right hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-2 ${
              i === selectedHintIndex[type]
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
          {isRTL ? "للإدراج" : "insert"} · Esc {isRTL ? "إغلاق" : "close"}
        </div>
      </div>
    );
  };

  // ── Textarea + preview block ──────────────────────────────────────────────
  const renderMessageEditor = (type) => {
    const isStudent       = type === "student";
    const currentMessage  = isStudent ? currentStudentMessage  : currentGuardianMessage;
    const previewMessage  = isStudent ? previewStudentMessage  : previewGuardianMessage;
    const isSaving        = savingTemplate[type];
    const isManual        = manuallyEdited[type];
    const studentLang     =
      selectedStudentForPreview?.communicationPreferences?.preferredLanguage || "ar";
    const color           = isStudent ? "purple" : "blue";

    const colorMap = {
      purple: {
        bg:      "bg-purple-50 dark:bg-purple-900/20",
        border:  "border-purple-200 dark:border-purple-800",
        textarea:"border-purple-200 dark:border-purple-700 focus:ring-purple-500",
        preview: "border-purple-200 dark:border-purple-700",
        previewHeader: "bg-purple-50 dark:bg-purple-900/30",
        previewText:   "text-purple-700 dark:text-purple-300",
        label:   "text-purple-600 dark:text-purple-400",
        divider: "border-purple-200 dark:border-purple-800",
      },
      blue: {
        bg:      "bg-blue-50 dark:bg-blue-900/20",
        border:  "border-blue-200 dark:border-blue-800",
        textarea:"border-blue-200 dark:border-blue-700 focus:ring-blue-500",
        preview: "border-blue-200 dark:border-blue-700",
        previewHeader: "bg-blue-50 dark:bg-blue-900/30",
        previewText:   "text-blue-700 dark:text-blue-300",
        label:   "text-blue-600 dark:text-blue-400",
        divider: "border-blue-200 dark:border-blue-800",
      },
    }[color];

    return (
      <div className={`${colorMap.bg} rounded-xl p-4 border ${colorMap.border}`}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`w-6 h-6 ${isStudent ? "bg-purple-500" : "bg-blue-500"} text-white text-xs font-bold rounded-full flex items-center justify-center`}
          >
            {isStudent ? "1" : "2"}
          </span>
          <h4 className={`text-sm font-bold ${colorMap.previewText}`}>
            {isStudent
              ? isRTL ? "رسالة الطالب 👶" : "Student Message 👶"
              : isRTL ? "رسالة ولي الأمر 👤" : "Guardian Message 👤"}
          </h4>
          {isManual && (
            <span className="text-xs text-orange-500 dark:text-orange-400 mr-auto">
              ✏️ {isRTL ? "معدّلة يدوياً" : "Manually edited"}
            </span>
          )}
        </div>

        {/* Textarea */}
        <div className="relative">
          <textarea
            ref={isStudent ? studentTextareaRef : guardianTextareaRef}
            value={currentMessage}
            onChange={(e) => handleInput(e, type)}
            onKeyDown={(e) => handleKeyDown(e, type)}
            onSelect={(e) =>
              setCursorPosition((prev) => ({
                ...prev,
                [type]: e.target.selectionStart,
              }))
            }
            placeholder={
              isRTL
                ? "اكتب @ لإظهار المتغيرات..."
                : "Type @ to show variables..."
            }
            className={`w-full px-4 py-3 border-2 ${colorMap.textarea} rounded-xl focus:ring-2 dark:bg-gray-800 dark:text-white resize-none h-36 text-sm font-mono`}
            dir={studentLang === "ar" ? "rtl" : "ltr"}
          />
          {renderHints(type)}
        </div>

        {/* Live preview */}
        {previewMessage && (
          <div className={`mt-3 rounded-lg border ${colorMap.preview} overflow-hidden`}>
            <div
              className={`${colorMap.previewHeader} px-3 py-1.5 border-b ${colorMap.divider} flex items-center gap-2`}
            >
              <MessageCircle className={`w-3.5 h-3.5 ${colorMap.label}`} />
              <span className={`text-xs font-medium ${colorMap.previewText}`}>
                {isRTL ? "معاينة الرسالة الفعلية" : "Live Preview"}
              </span>
            </div>
            <div
              className="p-3 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap bg-white dark:bg-gray-800 max-h-40 overflow-y-auto"
              dir={studentLang === "ar" ? "rtl" : "ltr"}
            >
              {previewMessage}
            </div>
          </div>
        )}

        {/* Save as default */}
        <div className={`flex justify-end pt-3 mt-2 border-t ${colorMap.divider}`}>
          <button
            onClick={() => saveTemplateToDatabase(type, currentMessage)}
            disabled={!currentMessage || isSaving}
            className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                {isRTL ? "جاري الحفظ..." : "Saving..."}
              </>
            ) : (
              <>
                <Save className="w-3 h-3" />
                {isRTL ? "حفظ كقالب افتراضي" : "Save as Default"}
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="bg-white dark:bg-darkmode rounded-xl shadow-lg max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">

        {/* ── Header ── */}
        <div className="p-6 border-b border-PowderBlueBorder dark:border-dark_border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              {reminderType === "24hours"
                ? isRTL ? "تذكير قبل 24 ساعة" : "24-Hour Reminder"
                : isRTL ? "تذكير قبل ساعة"    : "1-Hour Reminder"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {session?.title} ·{" "}
              {new Date(session?.scheduledDate).toLocaleDateString(
                isRTL ? "ar-EG" : "en-US",
                { weekday: "short", year: "numeric", month: "short", day: "numeric" }
              )}{" "}
              · {session?.startTime}
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Student selector */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              {isRTL ? "اختر طالباً للمعاينة" : "Select student for preview"}
              <span className="text-xs text-gray-400">
                ({groupStudents.length} {isRTL ? "طالب" : "students"})
              </span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {groupStudents.map((student) => {
                const sid        = student._id;
                const isSelected =
                  selectedStudentForPreview?._id?.toString() === sid?.toString();
                const lang       =
                  student.communicationPreferences?.preferredLanguage || "ar";
                const gender     =
                  (student.personalInfo?.gender || "male").toLowerCase();
                const rel        =
                  (student.guardianInfo?.relationship || "father").toLowerCase();
                const hasEdited  =
                  editedStudentTemplates[sid] || editedGuardianTemplates[sid];

                return (
                  <button
                    key={sid}
                    onClick={() => handleSelectStudentForPreview(student)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-primary text-white border-primary"
                        : "border-gray-300 dark:border-gray-600 hover:border-primary/50 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <span>{gender === "female" ? "👧" : "👦"}</span>
                    <span>{student.personalInfo?.fullName?.split(" ")[0]}</span>
                    <span className="opacity-70">
                      {lang === "ar" ? "🇸🇦" : "🇬🇧"}
                    </span>
                    <span className="opacity-70">
                      {rel === "mother" ? "👩" : "👨"}
                    </span>
                    {hasEdited && (
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Context card */}
          {salutationPreview && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 text-xs space-y-1">
              <p>
                <span className="font-medium text-gray-500 dark:text-gray-400">
                  {isRTL ? "تحية الطالب: " : "Student greeting: "}
                </span>
                <span className="text-primary font-semibold">
                  {salutationPreview.studentSalutation}
                </span>
              </p>
              <p>
                <span className="font-medium text-gray-500 dark:text-gray-400">
                  {isRTL ? "تحية ولي الأمر: " : "Guardian greeting: "}
                </span>
                <span className="text-primary font-semibold">
                  {salutationPreview.guardianSalutation}
                </span>
              </p>
              <p>
                <span className="font-medium text-gray-500 dark:text-gray-400">
                  {isRTL ? "ابنك/ابنتك: " : "Child title: "}
                </span>
                <span className="text-primary font-semibold">
                  {salutationPreview.childTitle}
                </span>
              </p>
              {/* ✅ عرض salutation_ar في الكارت للتأكد */}
              <p>
                <span className="font-medium text-gray-500 dark:text-gray-400">
                  {isRTL ? "salutation_ar: " : "salutation_ar: "}
                </span>
                <span className="text-primary font-semibold">
                  {salutationPreview.salutation_ar}
                </span>
              </p>
            </div>
          )}

          {/* Loading */}
          {loadingTemplates ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <span className="mr-2 text-sm text-gray-500">
                {isRTL ? "جاري تحميل القوالب..." : "Loading templates..."}
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              {renderMessageEditor("student")}
              {renderMessageEditor("guardian")}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="p-6 border-t border-PowderBlueBorder dark:border-dark_border flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {isRTL
              ? `سيتم إرسال ${groupStudents.length} رسالة`
              : `${groupStudents.length} messages will be sent`}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-gray-50 dark:hover:bg-dark_input"
            >
              {isRTL ? "إلغاء" : "Cancel"}
            </button>
            <button
              onClick={handleSend}
              disabled={sending || loadingTemplates}
              className="px-5 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
            >
              {sending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {isRTL ? "جاري الإرسال..." : "Sending..."}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {isRTL ? "إرسال التذكيرات" : "Send Reminders"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}