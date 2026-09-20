"use client";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import toast from "react-hot-toast";
import {
  Send,
  RefreshCw,
  MessageCircle,
  User,
  Users,
  Zap,
  Clock,
  Save,
} from "lucide-react";
import ModalShell from "./ModalShell";

// ─────────────────────────────────────────────────────────────────────────────
// extractSessionShortName — بياخد الجزء المهم من عنوان الجلسة
// ─────────────────────────────────────────────────────────────────────────────
function extractSessionShortName(title) {
  if (!title) return "";

  if (title.includes(":")) {
    const afterColon = title.split(":").slice(1).join(":").trim();
    if (afterColon.includes("&")) {
      return afterColon.split("&")[0].trim();
    }
    return afterColon;
  }

  if (title.includes(" - ")) {
    return title.split(" - ").slice(1).join(" - ").trim();
  }

  return title;
}

// ─────────────────────────────────────────────────────────────────────────────
// resolveVar — gender-aware value from a DB TemplateVariable object
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
// buildVariables — DB-first, hardcoded fallback
// ─────────────────────────────────────────────────────────────────────────────
function buildVariables(student, session, dbVars = {}) {
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

  const guardianSalutation_ar = `${guardianSalBase_ar} ${guardianFirstName}`;
  const guardianSalutation_en = `${guardianSalBase_en} ${guardianFirstName}`;
  const guardianSalutation = lang === "ar" ? guardianSalutation_ar : guardianSalutation_en;

  const studentSalutation_ar = `${salutationBase_ar} ${studentFirstName}`;
  const studentSalutation_en = `${salutationBase_en} ${studentFirstName}`;
  const studentSalutation = lang === "ar" ? studentSalutation_ar : studentSalutation_en;

  const childTitle = lang === "ar" ? childTitleAr : childTitleEn;

  const sessionDate = session?.scheduledDate
    ? new Date(session.scheduledDate).toLocaleDateString(
        lang === "ar" ? "ar-EG" : "en-US",
        { weekday: "long", year: "numeric", month: "long", day: "numeric" }
      )
    : "";

  return {
    studentSalutation,
    studentSalutation_ar,
    studentSalutation_en,

    guardianSalutation,
    guardianSalutation_ar,
    guardianSalutation_en,

    salutation_ar: studentSalutation_ar,
    salutation_en: studentSalutation_en,

    salutation: guardianSalutation,

    studentName: studentFirstName,
    studentFullName: student.personalInfo?.fullName || "",
    guardianName: guardianFirstName,
    guardianFullName: student.guardianInfo?.name || "",

    childTitle,

    sessionName: extractSessionShortName(session?.title) || "",
    date: sessionDate,
    time: `${session?.startTime || ""} - ${session?.endTime || ""}`,
    meetingLink: session?.meetingLink || "",
    groupCode: session?.groupId?.code || "",
    groupName: session?.groupId?.name || "",
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
// Tone maps (full class strings so Tailwind can see them)
// ─────────────────────────────────────────────────────────────────────────────
const TONES = {
  student: {
    panel: "border-sky-100 bg-sky-50/50 dark:border-sky-500/10 dark:bg-sky-500/5",
    iconWrap: "bg-sky-100 dark:bg-sky-500/20",
    icon: "text-sky-600 dark:text-sky-300",
    title: "text-sky-900 dark:text-sky-200",
    textarea: "border-sky-200 focus:border-sky-400 focus:ring-sky-100 dark:border-sky-500/20",
    previewBox: "border-sky-200 dark:border-sky-500/10",
    previewHead: "bg-sky-50 border-sky-100 dark:bg-sky-500/10 dark:border-sky-500/10",
    previewHeadText: "text-sky-700 dark:text-sky-300",
    previewIcon: "text-sky-600 dark:text-sky-300",
    divider: "border-sky-100 dark:border-sky-500/10",
    hintBox: "border-sky-200 dark:border-sky-500/30",
    hintHead: "border-sky-100 bg-sky-50 dark:border-sky-500/10 dark:bg-sky-500/10",
    hintHeadText: "text-sky-700 dark:text-sky-300",
    hintHover: "hover:bg-sky-50 dark:hover:bg-sky-500/10",
    hintActive: "bg-sky-100 dark:bg-sky-500/20",
    hintKey: "text-sky-600 dark:text-sky-400",
  },
  guardian: {
    panel: "border-violet-100 bg-violet-50/50 dark:border-violet-500/10 dark:bg-violet-500/5",
    iconWrap: "bg-violet-100 dark:bg-violet-500/20",
    icon: "text-violet-600 dark:text-violet-300",
    title: "text-violet-900 dark:text-violet-200",
    textarea: "border-violet-200 focus:border-violet-400 focus:ring-violet-100 dark:border-violet-500/20",
    previewBox: "border-violet-200 dark:border-violet-500/10",
    previewHead: "bg-violet-50 border-violet-100 dark:bg-violet-500/10 dark:border-violet-500/10",
    previewHeadText: "text-violet-700 dark:text-violet-300",
    previewIcon: "text-violet-600 dark:text-violet-300",
    divider: "border-violet-100 dark:border-violet-500/10",
    hintBox: "border-violet-200 dark:border-violet-500/30",
    hintHead: "border-violet-100 bg-violet-50 dark:border-violet-500/10 dark:bg-violet-500/10",
    hintHeadText: "text-violet-700 dark:text-violet-300",
    hintHover: "hover:bg-violet-50 dark:hover:bg-violet-500/10",
    hintActive: "bg-violet-100 dark:bg-violet-500/20",
    hintKey: "text-violet-600 dark:text-violet-400",
  },
};

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
  const [currentStudentMessage, setCurrentStudentMessage] = useState("");
  const [currentGuardianMessage, setCurrentGuardianMessage] = useState("");

  const [studentTemplates, setStudentTemplates] = useState({});
  const [guardianTemplates, setGuardianTemplates] = useState({});

  const [editedStudentTemplates, setEditedStudentTemplates] = useState({});
  const [editedGuardianTemplates, setEditedGuardianTemplates] = useState({});

  const [previewStudentMessage, setPreviewStudentMessage] = useState("");
  const [previewGuardianMessage, setPreviewGuardianMessage] = useState("");

  const [showHints, setShowHints] = useState({ student: false, guardian: false });
  const [cursorPosition, setCursorPosition] = useState({ student: 0, guardian: 0 });
  const [selectedHintIndex, setSelectedHintIndex] = useState({ student: 0, guardian: 0 });
  const [selectedStudentForPreview, setSelectedStudentForPreview] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [manuallyEdited, setManuallyEdited] = useState({ student: false, guardian: false });
  const [savingTemplate, setSavingTemplate] = useState({ student: false, guardian: false });
  const [sending, setSending] = useState(false);

  const [dbVars, setDbVars] = useState({});

  const studentTextareaRef = useRef(null);
  const guardianTextareaRef = useRef(null);
  const hintsRef = useRef({ student: null, guardian: null });

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
      if (hintsRef.current.student && !hintsRef.current.student.contains(e.target))
        setShowHints((prev) => ({ ...prev, student: false }));
      if (hintsRef.current.guardian && !hintsRef.current.guardian.contains(e.target))
        setShowHints((prev) => ({ ...prev, guardian: false }));
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
    const fetchAllTemplates = async () => {
      if (!groupStudents.length) return;

      setLoadingTemplates(true);
      try {
        const eventType = reminderType === "24hours" ? "reminder_24h" : "reminder_1h";

        const results = await Promise.all(
          groupStudents.map(async (student) => {
            const res = await fetch(`/api/sessions/${session.id}/templates`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                eventType,
                studentId: student._id,
                extraData: { meetingLink: session.meetingLink },
              }),
            });
            const json = await res.json();

            if (json.success) {
              return {
                studentId: student._id,
                studentTemplate: json.data.student?.rawContent || json.data.student?.content || "",
                guardianTemplate: json.data.guardian?.rawContent || json.data.guardian?.content || "",
              };
            }
            return null;
          })
        );

        const newStudentTemplates = {};
        const newGuardianTemplates = {};

        results.forEach((r) => {
          if (r) {
            newStudentTemplates[r.studentId] = r.studentTemplate;
            newGuardianTemplates[r.studentId] = r.guardianTemplate;
          }
        });

        setStudentTemplates(newStudentTemplates);
        setGuardianTemplates(newGuardianTemplates);

        if (groupStudents[0]) {
          setCurrentStudentMessage(newStudentTemplates[groupStudents[0]._id] || "");
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

  useEffect(() => {
    if (!selectedStudentForPreview) return;
    const vars = buildVariables(selectedStudentForPreview, session, dbVars);
    setPreviewStudentMessage(renderTemplate(currentStudentMessage, vars));
    setPreviewGuardianMessage(renderTemplate(currentGuardianMessage, vars));
  }, [currentStudentMessage, currentGuardianMessage, selectedStudentForPreview, session, dbVars]);

  const handleSelectStudentForPreview = useCallback(
    (student) => {
      setSelectedStudentForPreview(student);
      setManuallyEdited({ student: false, guardian: false });

      const sid = student._id;
      setCurrentStudentMessage(
        editedStudentTemplates[sid] ?? studentTemplates[sid] ?? ""
      );
      setCurrentGuardianMessage(
        editedGuardianTemplates[sid] ?? guardianTemplates[sid] ?? ""
      );
    },
    [editedStudentTemplates, editedGuardianTemplates, studentTemplates, guardianTemplates]
  );

  const saveTemplateToDatabase = useCallback(
    async (type, content) => {
      if (!selectedStudentForPreview || !content?.trim()) return;

      setSavingTemplate((prev) => ({ ...prev, [type]: true }));

      try {
        const templateType =
          reminderType === "24hours"
            ? type === "student" ? "reminder_24h_student" : "reminder_24h_guardian"
            : type === "student" ? "reminder_15min_student" : "reminder_15min_guardian";

        const recipientType = type === "student" ? "student" : "guardian";
        const studentLang =
          selectedStudentForPreview.communicationPreferences?.preferredLanguage || "ar";

        const templateName =
          reminderType === "24hours"
            ? type === "student" ? "24h Reminder - Student" : "24h Reminder - Guardian"
            : type === "student" ? "15min Reminder - Student" : "15min Reminder - Guardian";

        const searchRes = await fetch(
          `/api/message-templates?type=${templateType}&recipient=${recipientType}&default=true`
        );
        const searchJson = await searchRes.json();

        if (searchJson.success && searchJson.data?.length > 0) {
          const existing = searchJson.data[0];

          const updateData = {
            id: existing._id,
            name: templateName,
            isDefault: true,
            ...(studentLang === "ar"
              ? { contentAr: content, contentEn: existing.contentEn || " " }
              : { contentEn: content, contentAr: existing.contentAr || " " }),
          };

          const res = await fetch("/api/message-templates", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updateData),
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.error || "Update failed");
        } else {
          const newTemplate = {
            templateType,
            recipientType,
            name: templateName,
            description: `${reminderType === "24hours" ? "24 hours" : "15 minutes"} reminder for ${recipientType}`,
            isDefault: true,
            isActive: true,
            contentAr: studentLang === "ar" ? content : " ",
            contentEn: studentLang === "en" ? content : " ",
            variables: [
              { key: "guardianSalutation", label: "Guardian Salutation" },
              { key: "guardianSalutation_ar", label: "Guardian Salutation AR" },
              { key: "guardianSalutation_en", label: "Guardian Salutation EN" },
              { key: "studentSalutation", label: "Student Salutation" },
              { key: "studentSalutation_ar", label: "Student Salutation AR" },
              { key: "studentSalutation_en", label: "Student Salutation EN" },
              { key: "salutation_ar", label: "Salutation AR" },
              { key: "salutation_en", label: "Salutation EN" },
              { key: "salutation", label: "Salutation" },
              { key: "studentName", label: "Student Name" },
              { key: "guardianName", label: "Guardian Name" },
              { key: "childTitle", label: "Son/Daughter" },
              { key: "sessionName", label: "Session Name" },
              { key: "date", label: "Date" },
              { key: "time", label: "Time" },
              { key: "meetingLink", label: "Meeting Link" },
              { key: "enrollmentNumber", label: "Enrollment Number" },
            ],
          };

          const res = await fetch("/api/message-templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newTemplate),
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

  const handleSend = useCallback(async () => {
    setSending(true);
    try {
      const studentMessages = {};
      const guardianMessages = {};

      groupStudents.forEach((student) => {
        const sid = student._id.toString();
        const vars = buildVariables(student, session, dbVars);

        const rawStudent = editedStudentTemplates[sid] ?? studentTemplates[sid] ?? "";
        const rawGuardian = editedGuardianTemplates[sid] ?? guardianTemplates[sid] ?? "";

        studentMessages[sid] = renderTemplate(rawStudent, vars);
        guardianMessages[sid] = renderTemplate(rawGuardian, vars);
      });

      const res = await fetch(`/api/sessions/${session.id}/send-reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

  const availableVariables = useMemo(
    () => [
      { key: "{studentSalutation}", label: isRTL ? "تحية الطالب (حسب اللغة)" : "Student Salutation", icon: "👶" },
      { key: "{studentSalutation_ar}", label: isRTL ? "تحية الطالب - عربي" : "Student Salutation (AR)", icon: "👶" },
      { key: "{studentSalutation_en}", label: isRTL ? "تحية الطالب - إنجليزي" : "Student Salutation (EN)", icon: "👶" },
      { key: "{salutation_ar}", label: isRTL ? "التحية - عربي" : "Salutation (AR)", icon: "👋" },
      { key: "{salutation_en}", label: isRTL ? "التحية - إنجليزي" : "Salutation (EN)", icon: "👋" },
      { key: "{guardianSalutation}", label: isRTL ? "تحية ولي الأمر (حسب اللغة)" : "Guardian Salutation", icon: "👤" },
      { key: "{guardianSalutation_ar}", label: isRTL ? "تحية ولي الأمر - عربي" : "Guardian Salutation (AR)", icon: "👤" },
      { key: "{guardianSalutation_en}", label: isRTL ? "تحية ولي الأمر - إنجليزي" : "Guardian Salutation (EN)", icon: "👤" },
      { key: "{salutation}", label: isRTL ? "التحية العامة (ولي الأمر)" : "Salutation (guardian alias)", icon: "👋" },
      { key: "{studentName}", label: isRTL ? "اسم الطالب" : "Student Name", icon: "👶" },
      { key: "{guardianName}", label: isRTL ? "اسم ولي الأمر" : "Guardian Name", icon: "👤" },
      { key: "{childTitle}", label: isRTL ? "ابنك/ابنتك" : "Son/Daughter", icon: "👪" },
      { key: "{sessionName}", label: isRTL ? "اسم الجلسة" : "Session Name", icon: "📘" },
      { key: "{date}", label: isRTL ? "التاريخ" : "Date", icon: "📅" },
      { key: "{time}", label: isRTL ? "الوقت" : "Time", icon: "⏰" },
      { key: "{meetingLink}", label: isRTL ? "رابط الاجتماع" : "Meeting Link", icon: "🔗" },
      { key: "{enrollmentNumber}", label: isRTL ? "الرقم التعريفي" : "Enrollment No.", icon: "🔢" },
    ],
    [isRTL]
  );

  const insertVariable = useCallback(
    (type, variable) => {
      const isStudent = type === "student";
      const textarea = isStudent ? studentTextareaRef.current : guardianTextareaRef.current;
      const currentVal = isStudent ? currentStudentMessage : currentGuardianMessage;
      const cursorPos = isStudent ? cursorPosition.student : cursorPosition.guardian;

      if (!textarea) return;

      const before = currentVal.substring(0, cursorPos);
      const lastAt = before.lastIndexOf("@");

      let newValue, newCursor;
      if (lastAt !== -1) {
        newValue = currentVal.substring(0, lastAt) + variable.key + currentVal.substring(cursorPos);
        newCursor = lastAt + variable.key.length;
      } else {
        newValue = currentVal.substring(0, cursorPos) + variable.key + currentVal.substring(cursorPos);
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

  const handleInput = useCallback(
    (e, type) => {
      const value = e.target.value;
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
        setShowHints((prev) => ({ ...prev, [type]: true }));
        setSelectedHintIndex((prev) => ({ ...prev, [type]: 0 }));
      } else {
        setShowHints((prev) => ({ ...prev, [type]: false }));
      }
    },
    [selectedStudentForPreview]
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

  const salutationPreview = useMemo(() => {
    if (!selectedStudentForPreview) return null;
    return buildVariables(selectedStudentForPreview, session, dbVars);
  }, [selectedStudentForPreview, session, dbVars]);

  // ── Hints dropdown ────────────────────────────────────────────────────────
  const renderHints = (type) => {
    if (!showHints[type]) return null;
    const c = TONES[type];
    return (
      <div
        ref={(el) => (hintsRef.current[type] = el)}
        className={`absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border bg-white shadow-xl dark:bg-[#171a24] ${c.hintBox}`}
      >
        <div className={`border-b px-3 py-1.5 ${c.hintHead}`}>
          <p className={`flex items-center gap-1 text-xs font-semibold ${c.hintHeadText}`}>
            <Zap className="h-3 w-3" /> {isRTL ? "المتغيرات المتاحة" : "Available Variables"}
          </p>
        </div>
        {availableVariables.map((v, i) => (
          <button
            key={v.key}
            type="button"
            onClick={() => insertVariable(type, v)}
            className={`flex w-full items-center gap-2 px-3 py-2 text-right ${c.hintHover} ${
              i === selectedHintIndex[type] ? c.hintActive : ""
            }`}
          >
            <span>{v.icon}</span>
            <div className="flex flex-1 items-center justify-between">
              <span className={`font-mono text-sm ${c.hintKey}`}>{v.key}</span>
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

  // ── Message editor panel ──────────────────────────────────────────────────
  const renderMessageEditor = (type) => {
    const isStudent = type === "student";
    const c = TONES[type];
    const currentMessage = isStudent ? currentStudentMessage : currentGuardianMessage;
    const previewMessage = isStudent ? previewStudentMessage : previewGuardianMessage;
    const isSaving = savingTemplate[type];
    const isManual = manuallyEdited[type];
    const studentLang =
      selectedStudentForPreview?.communicationPreferences?.preferredLanguage || "ar";
    const Icon = isStudent ? User : Users;

    return (
      <div className={`space-y-3 rounded-xl border p-4 ${c.panel}`}>
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-full ${c.iconWrap}`}>
            <Icon className={`h-4 w-4 ${c.icon}`} />
          </div>
          <h4 className={`text-sm font-semibold ${c.title}`}>
            {isStudent ? (isRTL ? "رسالة للطالب" : "Student Message") : (isRTL ? "رسالة لولي الأمر" : "Guardian Message")}
          </h4>
          {isManual && (
            <span className="ms-auto text-[11px] text-orange-500 dark:text-orange-400">
              ✏️ {isRTL ? "معدّلة يدوياً" : "Manually edited"}
            </span>
          )}
        </div>

        <div className="relative">
          <textarea
            ref={isStudent ? studentTextareaRef : guardianTextareaRef}
            value={currentMessage}
            onChange={(e) => handleInput(e, type)}
            onKeyDown={(e) => handleKeyDown(e, type)}
            onSelect={(e) =>
              setCursorPosition((prev) => ({ ...prev, [type]: e.target.selectionStart }))
            }
            placeholder={isRTL ? "اكتب @ لإظهار المتغيرات..." : "Type @ for variables..."}
            className={`h-36 w-full resize-none rounded-lg border bg-white px-3 py-2.5 font-mono text-sm text-slate-800 outline-none focus:ring-2 dark:bg-white/5 dark:text-white ${c.textarea}`}
            dir={studentLang === "ar" ? "rtl" : "ltr"}
          />
          {renderHints(type)}
        </div>

        {previewMessage && (
          <div className={`overflow-hidden rounded-lg border bg-white dark:bg-white/5 ${c.previewBox}`}>
            <div className={`flex items-center gap-2 border-b px-3 py-1.5 ${c.previewHead}`}>
              <MessageCircle className={`h-3.5 w-3.5 ${c.previewIcon}`} />
              <span className={`text-xs font-medium ${c.previewHeadText}`}>
                {isRTL ? "معاينة الرسالة الفعلية" : "Live preview"}
              </span>
            </div>
            <div
              className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words p-3 text-sm text-slate-700 dark:text-slate-200"
              dir={studentLang === "ar" ? "rtl" : "ltr"}
            >
              {previewMessage}
            </div>
          </div>
        )}

        <div className={`flex justify-end border-t pt-2.5 ${c.divider}`}>
          <button
            onClick={() => saveTemplateToDatabase(type, currentMessage)}
            disabled={!currentMessage || isSaving}
            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSaving ? (
              <><RefreshCw className="h-3 w-3 animate-spin" /> {isRTL ? "جاري الحفظ..." : "Saving..."}</>
            ) : (
              <><Save className="h-3 w-3" /> {isRTL ? "حفظ كقالب افتراضي" : "Save as default"}</>
            )}
          </button>
        </div>
      </div>
    );
  };

  const footer = (
    <>
      <p className="me-auto text-xs text-slate-400">
        {isRTL
          ? `سيتم إرسال ${groupStudents.length} رسالة`
          : `${groupStudents.length} messages will be sent`}
      </p>
      <button
        onClick={onClose}
        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
      >
        {isRTL ? "إلغاء" : "Cancel"}
      </button>
      <button
        onClick={handleSend}
        disabled={sending || loadingTemplates}
        className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600 disabled:opacity-60"
      >
        {sending ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            {isRTL ? "جاري الإرسال..." : "Sending..."}
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            {isRTL ? "إرسال التذكيرات" : "Send Reminders"}
          </>
        )}
      </button>
    </>
  );

  return (
    <ModalShell
      open
      onClose={onClose}
      size="2xl"
      accent="amber"
      isRTL={isRTL}
      title={
        reminderType === "24hours"
          ? isRTL ? "تذكير قبل 24 ساعة" : "24-Hour Reminder"
          : isRTL ? "تذكير قبل 15 دقيقة" : "15-Minute Reminder"
      }
      subtitle={`${session?.title || ""} · ${new Date(session?.scheduledDate).toLocaleDateString(
        isRTL ? "ar-EG" : "en-US",
        { weekday: "short", year: "numeric", month: "short", day: "numeric" }
      )} · ${session?.startTime}`}
      headerBadge={
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
          <Clock className="h-3 w-3" />
          {reminderType === "24hours" ? "24h" : "15m"}
        </span>
      }
      footer={footer}
    >
      <div className="space-y-5">
        {/* Student selector */}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Users className="h-3.5 w-3.5" />
            {isRTL ? "اختر طالباً للمعاينة:" : "Select student to preview:"}
            <span className="text-slate-400">({groupStudents.length})</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {groupStudents.map((student) => {
              const sid = student._id;
              const isSelected = selectedStudentForPreview?._id?.toString() === sid?.toString();
              const lang = student.communicationPreferences?.preferredLanguage || "ar";
              const gender = (student.personalInfo?.gender || "male").toLowerCase();
              const rel = (student.guardianInfo?.relationship || "father").toLowerCase();
              const hasEdited = editedStudentTemplates[sid] || editedGuardianTemplates[sid];

              return (
                <button
                  key={sid}
                  onClick={() => handleSelectStudentForPreview(student)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-200 text-slate-700 hover:border-indigo-300 dark:border-white/10 dark:text-slate-300"
                  }`}
                >
                  <span>{gender === "female" ? "👧" : "👦"}</span>
                  <span>{student.personalInfo?.fullName?.split(" ")[0]}</span>
                  <span className="opacity-70">{lang === "ar" ? "🇸🇦" : "🇬🇧"}</span>
                  <span className="opacity-70">{rel === "mother" ? "👩" : "👨"}</span>
                  {hasEdited && <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Context card */}
        {salutationPreview && (
          <div className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-3 text-xs dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-2">
              <span className="w-28 shrink-0 font-medium text-sky-600 dark:text-sky-400">
                👶 {isRTL ? "تحية الطالب:" : "Student:"}
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{salutationPreview.studentSalutation}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-28 shrink-0 font-medium text-violet-600 dark:text-violet-400">
                👪 {isRTL ? "تحية ولي الأمر:" : "Guardian:"}
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{salutationPreview.guardianSalutation}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-28 shrink-0 font-medium text-emerald-600 dark:text-emerald-400">
                👶 {isRTL ? "ابنك/ابنتك:" : "Child title:"}
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{salutationPreview.childTitle}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-28 shrink-0 font-medium text-amber-600 dark:text-amber-400">
                📘 {isRTL ? "اسم الجلسة:" : "Session:"}
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{salutationPreview.sessionName}</span>
            </div>
          </div>
        )}

        {/* Editors */}
        {loadingTemplates ? (
          <div className="flex items-center justify-center gap-2 py-12">
            <RefreshCw className="h-5 w-5 animate-spin text-amber-500" />
            <span className="text-sm text-slate-500">
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
    </ModalShell>
  );
}