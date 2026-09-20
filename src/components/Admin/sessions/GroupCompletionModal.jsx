"use client";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import toast from "react-hot-toast";
import {
  Save,
  RefreshCw,
  Trophy,
  MessageCircle,
  User,
  Users,
  Zap,
  Link2,
  CheckCircle,
  Send,
  Globe,
  Info,
} from "lucide-react";
import ModalShell from "./ModalShell";

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
    hintBox: "border-violet-200 dark:border-violet-500/30",
    hintHead: "border-violet-100 bg-violet-50 dark:border-violet-500/10 dark:bg-violet-500/10",
    hintHeadText: "text-violet-700 dark:text-violet-300",
    hintHover: "hover:bg-violet-50 dark:hover:bg-violet-500/10",
    hintActive: "bg-violet-100 dark:bg-violet-500/20",
    hintKey: "text-violet-600 dark:text-violet-400",
  },
};

export default function GroupCompletionModal({
  group,
  groupId,
  groupStudents,
  onClose,
  onRefresh,
  isRTL,
  t,
}) {
  const resolvedGroupId = groupId || group?._id || group?.id;

  const [formData, setFormData] = useState({
    feedbackLink: "",
  });

  const [studentTemplates,  setStudentTemplates]  = useState({});
  const [guardianTemplates, setGuardianTemplates] = useState({});
  const [editedStudentTemplates,  setEditedStudentTemplates]  = useState({});
  const [editedGuardianTemplates, setEditedGuardianTemplates] = useState({});
  const [currentStudentMessage,  setCurrentStudentMessage]  = useState("");
  const [currentGuardianMessage, setCurrentGuardianMessage] = useState("");
  const [previewStudentMessage,  setPreviewStudentMessage]  = useState("");
  const [previewGuardianMessage, setPreviewGuardianMessage] = useState("");
  const [showHints,         setShowHints]         = useState({ student: false, guardian: false });
  const [cursorPosition,    setCursorPosition]    = useState({ student: 0, guardian: 0 });
  const [selectedHintIndex, setSelectedHintIndex] = useState({ student: 0, guardian: 0 });
  const [selectedStudentForPreview, setSelectedStudentForPreview] = useState(null);
  const [loadingTemplates,  setLoadingTemplates]  = useState(false);
  const [manuallyEdited,    setManuallyEdited]    = useState({ student: false, guardian: false });
  const [sending,           setSending]           = useState(false);
  const [savingTemplate,    setSavingTemplate]    = useState({ student: false, guardian: false });
  const [dbVars,            setDbVars]            = useState({});

  const studentTextareaRef  = useRef(null);
  const guardianTextareaRef = useRef(null);
  const hintsRef = useRef({ student: null, guardian: null });

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

  // ── Click outside handler ─────────────────────────────────────────────────
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

  // ── buildVariables ────────────────────────────────────────────────────────
  const buildVariables = useCallback(
    (student) => {
      if (!student) return {};

      const lang         = (student.communicationPreferences?.preferredLanguage || "ar").toLowerCase();
      const gender       = (student.personalInfo?.gender       || "male").toLowerCase().trim();
      const relationship = (student.guardianInfo?.relationship || "father").toLowerCase().trim();
      const isMale       = gender !== "female";
      const isFather     = relationship !== "mother";
      const genderCtx    = { studentGender: gender, guardianType: relationship };

      const studentFirstName =
        lang === "ar"
          ? student.personalInfo?.nickname?.ar?.trim() || student.personalInfo?.fullName?.split(" ")[0] || "الطالب"
          : student.personalInfo?.nickname?.en?.trim() || student.personalInfo?.fullName?.split(" ")[0] || "Student";

      const guardianFirstName =
        lang === "ar"
          ? student.guardianInfo?.nickname?.ar?.trim() || student.guardianInfo?.name?.split(" ")[0] || "ولي الأمر"
          : student.guardianInfo?.nickname?.en?.trim() || student.guardianInfo?.name?.split(" ")[0] || "Guardian";

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
      const guardianSalutation    = lang === "ar" ? guardianSalutation_ar : guardianSalutation_en;

      const studentSalutation_ar  = `${salutationBase_ar} ${studentFirstName}`;
      const studentSalutation_en  = `${salutationBase_en} ${studentFirstName}`;
      const studentSalutation     = lang === "ar" ? studentSalutation_ar : studentSalutation_en;

      const childTitle = lang === "ar" ? childTitleAr : childTitleEn;

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

        studentName:      studentFirstName,
        studentFullName:  student.personalInfo?.fullName || "",
        guardianName:     guardianFirstName,
        guardianFullName: student.guardianInfo?.name || "",

        childTitle,

        groupName:        group?.name || "",
        groupCode:        group?.code || "",
        courseName:       group?.courseSnapshot?.title || "",
        enrollmentNumber: student.enrollmentNumber || "",
        feedbackLink:     formData.feedbackLink || "",
      };
    },
    [group, formData.feedbackLink, dbVars]
  );

  // ── renderTemplate ────────────────────────────────────────────────────────
  const renderTemplate = useCallback(
    (template, student) => {
      if (!template || !student) return template || "";
      const variables = buildVariables(student);
      let result = template;
      Object.entries(variables).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
        }
      });
      return result;
    },
    [buildVariables]
  );

  // ── Fetch templates for all students ─────────────────────────────────────
  useEffect(() => {
    const fetchAllTemplates = async () => {
      if (!resolvedGroupId || groupStudents.length === 0) return;

      setLoadingTemplates(true);
      try {
        const results = await Promise.all(
          groupStudents.map(async (student) => {
            const res = await fetch(`/api/groups/${resolvedGroupId}/completion-templates`, {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body:    JSON.stringify({
                studentId:    student._id,
                feedbackLink: formData.feedbackLink,
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
  }, [resolvedGroupId, groupStudents, formData.feedbackLink, isRTL]);

  // ── Live preview ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedStudentForPreview) return;
    setPreviewStudentMessage(renderTemplate(currentStudentMessage,  selectedStudentForPreview));
    setPreviewGuardianMessage(renderTemplate(currentGuardianMessage, selectedStudentForPreview));
  }, [currentStudentMessage, currentGuardianMessage, selectedStudentForPreview, renderTemplate]);

  // ── Available variables for hints ─────────────────────────────────────────
  const availableVariables = useMemo(
    () => [
      { key: "{studentSalutation}",     label: isRTL ? "تحية الطالب (حسب اللغة)"    : "Student Salutation",        icon: "👶" },
      { key: "{studentSalutation_ar}",  label: isRTL ? "تحية الطالب - عربي"          : "Student Salutation (AR)",    icon: "👶" },
      { key: "{studentSalutation_en}",  label: isRTL ? "تحية الطالب - إنجليزي"       : "Student Salutation (EN)",    icon: "👶" },
      { key: "{salutation_ar}",         label: isRTL ? "التحية - عربي"               : "Salutation (AR)",            icon: "👋" },
      { key: "{salutation_en}",         label: isRTL ? "التحية - إنجليزي"            : "Salutation (EN)",            icon: "👋" },
      { key: "{guardianSalutation}",    label: isRTL ? "تحية ولي الأمر (حسب اللغة)" : "Guardian Salutation",        icon: "👤" },
      { key: "{guardianSalutation_ar}", label: isRTL ? "تحية ولي الأمر - عربي"       : "Guardian Salutation (AR)",   icon: "👤" },
      { key: "{guardianSalutation_en}", label: isRTL ? "تحية ولي الأمر - إنجليزي"   : "Guardian Salutation (EN)",   icon: "👤" },
      { key: "{salutation}",            label: isRTL ? "التحية العامة (ولي الأمر)"   : "Salutation (guardian alias)", icon: "👋" },
      { key: "{studentName}",           label: isRTL ? "اسم الطالب"                  : "Student Name",               icon: "👶" },
      { key: "{guardianName}",          label: isRTL ? "اسم ولي الأمر"              : "Guardian Name",              icon: "👤" },
      { key: "{childTitle}",            label: isRTL ? "ابنك/ابنتك"                  : "Son/Daughter",               icon: "👪" },
      { key: "{groupName}",             label: isRTL ? "اسم المجموعة"               : "Group Name",                 icon: "👥" },
      { key: "{groupCode}",             label: isRTL ? "كود المجموعة"               : "Group Code",                 icon: "🔢" },
      { key: "{courseName}",            label: isRTL ? "اسم الكورس"                 : "Course Name",                icon: "📘" },
      { key: "{enrollmentNumber}",      label: isRTL ? "الرقم التعريفي"             : "Enrollment No.",             icon: "🔢" },
      { key: "{feedbackLink}",          label: isRTL ? "رابط التقييم"               : "Feedback Link",              icon: "🔗" },
    ],
    [isRTL]
  );

  // ── Salutation preview ────────────────────────────────────────────────────
  const salutationPreview = useMemo(() => {
    if (!selectedStudentForPreview) return { student: "", guardian: "", childTitle: "" };
    const vars = buildVariables(selectedStudentForPreview);
    return {
      student:    vars.studentSalutation,
      guardian:   vars.guardianSalutation,
      childTitle: vars.childTitle,
    };
  }, [selectedStudentForPreview, buildVariables]);

  // ── Switch student for preview ────────────────────────────────────────────
  const handleStudentPreviewChange = useCallback(
    (studentId) => {
      const student = groupStudents.find((s) => s._id === studentId);
      if (!student) return;

      setSelectedStudentForPreview(student);

      setCurrentStudentMessage(
        editedStudentTemplates[studentId]  ?? studentTemplates[studentId]  ?? ""
      );
      setCurrentGuardianMessage(
        editedGuardianTemplates[studentId] ?? guardianTemplates[studentId] ?? ""
      );

      setManuallyEdited({
        student:  !!editedStudentTemplates[studentId],
        guardian: !!editedGuardianTemplates[studentId],
      });
    },
    [groupStudents, studentTemplates, guardianTemplates, editedStudentTemplates, editedGuardianTemplates]
  );

  // ── Reset to default templates ────────────────────────────────────────────
  const resetToDefault = useCallback(async () => {
    if (!selectedStudentForPreview) return;

    setLoadingTemplates(true);
    try {
      const studentId = selectedStudentForPreview._id;

      const res = await fetch(`/api/groups/${resolvedGroupId}/completion-templates`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ studentId, feedbackLink: formData.feedbackLink }),
      });
      const json = await res.json();

      if (json.success) {
        const st = json.data.student?.rawContent  || json.data.student?.content  || "";
        const gt = json.data.guardian?.rawContent || json.data.guardian?.content || "";

        setStudentTemplates((prev)  => ({ ...prev, [studentId]: st }));
        setGuardianTemplates((prev) => ({ ...prev, [studentId]: gt }));

        setEditedStudentTemplates((prev) => { const n = { ...prev }; delete n[studentId]; return n; });
        setEditedGuardianTemplates((prev) => { const n = { ...prev }; delete n[studentId]; return n; });

        setCurrentStudentMessage(st);
        setCurrentGuardianMessage(gt);
        setManuallyEdited({ student: false, guardian: false });

        toast.success(isRTL ? "تم استعادة القوالب الافتراضية" : "Default templates restored");
      }
    } catch (e) {
      console.error("resetToDefault error:", e);
      toast.error(isRTL ? "فشل استعادة القوالب" : "Failed to reset templates");
    } finally {
      setLoadingTemplates(false);
    }
  }, [selectedStudentForPreview, resolvedGroupId, formData.feedbackLink, isRTL]);

  // ── Save template to DB ───────────────────────────────────────────────────
  const saveTemplateToDatabase = useCallback(
    async (type, content) => {
      if (!content?.trim() || !selectedStudentForPreview) return;

      setSavingTemplate((prev) => ({ ...prev, [type]: true }));
      try {
        const templateType  = type === "student" ? "group_completion_student" : "group_completion_guardian";
        const recipientType = type === "student" ? "student" : "guardian";
        const lang          = selectedStudentForPreview.communicationPreferences?.preferredLanguage || "ar";
        const templateName  = type === "student" ? "Group Completion - Student" : "Group Completion - Guardian";

        const searchRes  = await fetch(`/api/message-templates?type=${templateType}&recipient=${recipientType}&default=true`);
        const searchJson = await searchRes.json();

        if (searchJson.success && searchJson.data.length > 0) {
          const existing   = searchJson.data[0];
          const updateData = {
            id:        existing._id,
            name:      templateName,
            isDefault: true,
            updatedAt: new Date(),
            ...(lang === "ar"
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
            description: `Group completion notification for ${recipientType}`,
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
              { key: "groupName",             label: "Group Name"             },
              { key: "groupCode",             label: "Group Code"             },
              { key: "courseName",            label: "Course Name"            },
              { key: "enrollmentNumber",      label: "Enrollment Number"      },
              { key: "feedbackLink",          label: "Feedback Link"          },
            ],
            ...(lang === "ar"
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
            ? `✅ تم حفظ القالب (${lang === "ar" ? "عربي" : "إنجليزي"})`
            : `✅ Template (${lang === "ar" ? "Arabic" : "English"}) saved`
        );

        const sid = selectedStudentForPreview._id;
        if (type === "student") setStudentTemplates((prev)  => ({ ...prev, [sid]: content }));
        else                    setGuardianTemplates((prev) => ({ ...prev, [sid]: content }));
      } catch (err) {
        console.error("saveTemplate error:", err);
        toast.error(
          isRTL
            ? "فشل حفظ القالب: " + err.message
            : "Failed to save template: " + err.message
        );
      } finally {
        setSavingTemplate((prev) => ({ ...prev, [type]: false }));
      }
    },
    [selectedStudentForPreview, isRTL]
  );

  // ── Insert variable into textarea ─────────────────────────────────────────
  const insertVariable = useCallback(
    (type, variable) => {
      const textarea   = type === "student" ? studentTextareaRef.current : guardianTextareaRef.current;
      const currentVal = type === "student" ? currentStudentMessage      : currentGuardianMessage;
      const cursorPos  = cursorPosition[type];
      if (!textarea) return;

      const before  = currentVal.substring(0, cursorPos);
      const lastAt  = before.lastIndexOf("@");

      let newValue, newCursor;
      if (lastAt !== -1) {
        newValue  = currentVal.substring(0, lastAt) + variable.key + currentVal.substring(cursorPos);
        newCursor = lastAt + variable.key.length;
      } else {
        newValue  = currentVal.substring(0, cursorPos) + variable.key + currentVal.substring(cursorPos);
        newCursor = cursorPos + variable.key.length;
      }

      if (type === "student") {
        setCurrentStudentMessage(newValue);
        if (selectedStudentForPreview)
          setEditedStudentTemplates((prev) => ({ ...prev, [selectedStudentForPreview._id]: newValue }));
      } else {
        setCurrentGuardianMessage(newValue);
        if (selectedStudentForPreview)
          setEditedGuardianTemplates((prev) => ({ ...prev, [selectedStudentForPreview._id]: newValue }));
      }

      setManuallyEdited((prev) => ({ ...prev, [type]: true }));
      setShowHints((prev)      => ({ ...prev, [type]: false }));

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursor, newCursor);
      }, 0);
    },
    [currentStudentMessage, currentGuardianMessage, cursorPosition, selectedStudentForPreview]
  );

  // ── Textarea input handler ────────────────────────────────────────────────
  const handleInput = useCallback(
    (type) => (e) => {
      const value     = e.target.value;
      const cursorPos = e.target.selectionStart;

      if (type === "student") {
        setCurrentStudentMessage(value);
        if (selectedStudentForPreview)
          setEditedStudentTemplates((prev) => ({ ...prev, [selectedStudentForPreview._id]: value }));
      } else {
        setCurrentGuardianMessage(value);
        if (selectedStudentForPreview)
          setEditedGuardianTemplates((prev) => ({ ...prev, [selectedStudentForPreview._id]: value }));
      }

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
    [selectedStudentForPreview]
  );

  // ── Keyboard navigation for hints ────────────────────────────────────────
  const handleKeyDown = useCallback(
    (type) => (e) => {
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

  // ── Send messages ─────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!currentStudentMessage?.trim() || !currentGuardianMessage?.trim()) {
      toast.error(isRTL ? "الرجاء كتابة الرسالتين" : "Please write both messages");
      return;
    }

    setSending(true);
    try {
      let successCount = 0;
      let failCount    = 0;

      for (let i = 0; i < groupStudents.length; i++) {
        const student   = groupStudents[i];
        const studentId = student._id;

        const rawStudent  = editedStudentTemplates[studentId]  ?? studentTemplates[studentId]  ?? "";
        const rawGuardian = editedGuardianTemplates[studentId] ?? guardianTemplates[studentId] ?? "";

        const studentMsg  = renderTemplate(rawStudent,  student);
        const guardianMsg = renderTemplate(rawGuardian, student);

        try {
          const res = await fetch(`/api/groups/${resolvedGroupId}/complete`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              singleStudent: {
                studentId:      student._id,
                studentMessage:  studentMsg,
                guardianMessage: guardianMsg,
              },
              feedbackLink: formData.feedbackLink || null,
            }),
          });

          const json = await res.json();

          if (json.success) {
            successCount++;
            toast.success(`✅ ${student.personalInfo?.fullName} (${i + 1}/${groupStudents.length})`, { duration: 2500 });
          } else {
            failCount++;
            toast.error(`❌ ${student.personalInfo?.fullName}: ${json.error || "Failed"}`, { duration: 3000 });
          }
        } catch {
          failCount++;
          toast.error(`❌ ${student.personalInfo?.fullName}`, { duration: 3000 });
        }

        if (i < groupStudents.length - 1) await new Promise((r) => setTimeout(r, 1500));
      }

      toast.success(
        isRTL
          ? `🎉 اكتمل الإرسال: ${successCount} نجح، ${failCount} فشل`
          : `🎉 Done: ${successCount} sent, ${failCount} failed`,
        { duration: 5000 }
      );

      onClose();
      onRefresh();
    } catch (err) {
      console.error("handleSend error:", err);
      toast.error(isRTL ? "حدث خطأ غير متوقع" : "Unexpected error occurred");
    } finally {
      setSending(false);
    }
  }, [
    currentStudentMessage, currentGuardianMessage,
    resolvedGroupId, groupStudents,
    studentTemplates, guardianTemplates,
    editedStudentTemplates, editedGuardianTemplates,
    renderTemplate, formData.feedbackLink,
    isRTL, onClose, onRefresh,
  ]);

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
    const Icon = isStudent ? User : Users;
    const currentMessage = isStudent ? currentStudentMessage : currentGuardianMessage;
    const previewMessage = isStudent ? previewStudentMessage : previewGuardianMessage;
    const previewLang = selectedStudentForPreview?.communicationPreferences?.preferredLanguage || "ar";
    const dir = previewLang === "ar" ? "rtl" : "ltr";

    return (
      <div className={`space-y-3 rounded-xl border p-4 ${c.panel}`}>
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-full ${c.iconWrap}`}>
            <Icon className={`h-4 w-4 ${c.icon}`} />
          </div>
          <h4 className={`text-sm font-semibold ${c.title}`}>
            {isStudent ? (isRTL ? "رسالة للطالب" : "Student Message") : (isRTL ? "رسالة لولي الأمر" : "Guardian Message")}
          </h4>
          {isStudent && loadingTemplates && (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-sky-300 border-t-sky-600" />
          )}
        </div>

        <div className="relative">
          <textarea
            ref={isStudent ? studentTextareaRef : guardianTextareaRef}
            value={currentMessage}
            onChange={handleInput(type)}
            onKeyDown={handleKeyDown(type)}
            onSelect={(e) => setCursorPosition((prev) => ({ ...prev, [type]: e.target.selectionStart }))}
            placeholder={isRTL ? "اكتب @ لإظهار المتغيرات..." : "Type @ for variables..."}
            className={`h-32 w-full resize-none rounded-lg border bg-white px-3 py-2.5 font-mono text-sm text-slate-800 outline-none focus:ring-2 dark:bg-white/5 dark:text-white ${c.textarea}`}
            dir={dir}
          />
          {renderHints(type)}
        </div>

        {previewMessage && selectedStudentForPreview && (
          <div className={`overflow-hidden rounded-lg border bg-white dark:bg-white/5 ${c.previewBox}`}>
            <div className={`flex items-center justify-between border-b px-3 py-1.5 ${c.previewHead}`}>
              <span className={`flex items-center gap-1.5 text-xs font-medium ${c.previewHeadText}`}>
                <MessageCircle className="h-3.5 w-3.5" />
                {isStudent ? (isRTL ? "معاينة للطالب" : "Student preview") : (isRTL ? "معاينة لولي الأمر" : "Guardian preview")}
              </span>
              <span className="text-[11px] text-slate-400">
                {previewLang === "ar" ? "🇸🇦" : "🇬🇧"}
                {" · "}
                {isStudent
                  ? ((selectedStudentForPreview.personalInfo?.gender || "").toLowerCase() === "female" ? "👧" : "👦")
                  : ((selectedStudentForPreview.guardianInfo?.relationship || "").toLowerCase() === "mother" ? "👩" : "👨")}
              </span>
            </div>
            <div
              className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words p-3 text-sm text-slate-700 dark:text-slate-200"
              dir={dir}
            >
              {previewMessage}
            </div>
          </div>
        )}
      </div>
    );
  };

  const footer = (
    <>
      <p className="me-auto hidden items-center gap-1 text-xs text-slate-400 sm:flex">
        <Globe className="h-3 w-3" />
        {isRTL
          ? "كل طالب هيستلم الرسالة بلغته المفضلة"
          : "Each student receives the message in their preferred language"}
      </p>
      <button
        onClick={onClose}
        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
      >
        {isRTL ? "إلغاء" : "Cancel"}
      </button>
      <button
        onClick={handleSend}
        disabled={
          sending ||
          loadingTemplates ||
          !currentStudentMessage?.trim() ||
          !currentGuardianMessage?.trim()
        }
        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-amber-500/20 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
      >
        {sending ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            {isRTL ? "جاري الإرسال..." : "Sending..."}
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            {isRTL ? `إرسال لـ ${groupStudents.length} طالب` : `Send to ${groupStudents.length} students`}
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
      title={isRTL ? `إتمام المجموعة — ${group?.name || ""}` : `Complete Group — ${group?.name || ""}`}
      subtitle={`${isRTL ? "الكود" : "Code"}: ${group?.code || ""}${group?.courseSnapshot?.title ? ` · ${group.courseSnapshot.title}` : ""}`}
      headerBadge={
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
          <Trophy className="h-3 w-3" />
          {groupStudents.length}
        </span>
      }
      footer={footer}
    >
      <div className="space-y-5">
        {/* Feedback link */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-white">
            <Link2 className="h-3.5 w-3.5" />
            {isRTL ? "رابط التقييم (اختياري)" : "Feedback Link (optional)"}
          </label>
          <input
            type="url"
            value={formData.feedbackLink}
            onChange={(e) => setFormData((prev) => ({ ...prev, feedbackLink: e.target.value }))}
            placeholder={isRTL ? "أدخل رابط استبيان التقييم..." : "Enter feedback form URL..."}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>

        {/* Messages area */}
        <div className="space-y-5 rounded-xl border border-amber-100 bg-amber-50/60 p-4 dark:border-amber-500/15 dark:bg-amber-500/5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
              <MessageCircle className="h-4 w-4" />
              {isRTL ? "رسائل إتمام المجموعة" : "Group Completion Messages"}
            </h3>
            <button
              onClick={resetToDefault}
              disabled={loadingTemplates}
              className="flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-60 dark:border-amber-500/20 dark:bg-white/5 dark:text-amber-300"
            >
              <RefreshCw className={`h-3 w-3 ${loadingTemplates ? "animate-spin" : ""}`} />
              {isRTL ? "استعادة القوالب" : "Reset Templates"}
            </button>
          </div>

          {/* Student selector */}
          {groupStudents.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                {isRTL ? "اختر طالباً لمعاينة الرسالة:" : "Select student to preview:"}
              </label>
              <div className="flex flex-wrap gap-2">
                {groupStudents.map((student) => {
                  const isSelected = selectedStudentForPreview?._id?.toString() === student._id?.toString();
                  const lang   = student.communicationPreferences?.preferredLanguage || "ar";
                  const gender = (student.personalInfo?.gender || "male").toLowerCase().trim();
                  const rel    = (student.guardianInfo?.relationship || "father").toLowerCase().trim();
                  const isEdited = editedStudentTemplates[student._id] || editedGuardianTemplates[student._id];

                  return (
                    <button
                      key={student._id}
                      onClick={() => handleStudentPreviewChange(student._id)}
                      disabled={loadingTemplates}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all disabled:opacity-60 ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 dark:border-white/10 dark:bg-transparent dark:text-slate-300"
                      }`}
                    >
                      <span>{gender === "female" ? "👧" : "👦"}</span>
                      <span>{student.personalInfo?.fullName?.split(" ")[0]}</span>
                      <span className="opacity-70">{lang === "ar" ? "🇸🇦" : "🇬🇧"}</span>
                      <span className="opacity-70">{rel === "mother" ? "👩" : rel === "father" ? "👨" : "👤"}</span>
                      {isEdited && <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />}
                    </button>
                  );
                })}
              </div>

              {selectedStudentForPreview && (
                <div className="space-y-1.5 rounded-lg border border-amber-100 bg-white p-3 text-xs dark:border-amber-500/10 dark:bg-white/5">
                  <div className="flex items-center gap-2">
                    <span className="w-28 shrink-0 font-medium text-sky-600 dark:text-sky-400">
                      👶 {isRTL ? "تحية الطالب:" : "Student:"}
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{salutationPreview.student}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-28 shrink-0 font-medium text-violet-600 dark:text-violet-400">
                      👪 {isRTL ? "تحية ولي الأمر:" : "Guardian:"}
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{salutationPreview.guardian}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-28 shrink-0 font-medium text-emerald-600 dark:text-emerald-400">
                      👶 {isRTL ? "ابنك/ابنتك:" : "Child title:"}
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{salutationPreview.childTitle}</span>
                  </div>
                  {(manuallyEdited.student || manuallyEdited.guardian) && (
                    <p className="pt-0.5 text-orange-500 dark:text-orange-400">
                      ✏️ {isRTL ? "هذا الطالب لديه رسائل معدلة يدوياً" : "This student has manually edited messages"}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {renderMessageEditor("student")}
          {renderMessageEditor("guardian")}

          {/* Save template buttons */}
          <div className="flex justify-end gap-2 border-t border-amber-100 pt-3 dark:border-amber-500/10">
            <button
              onClick={() => saveTemplateToDatabase("student", currentStudentMessage)}
              disabled={!currentStudentMessage || savingTemplate.student || loadingTemplates}
              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {savingTemplate.student ? (
                <><RefreshCw className="h-3 w-3 animate-spin" /> {isRTL ? "جاري الحفظ..." : "Saving..."}</>
              ) : (
                <><Save className="h-3 w-3" /> {isRTL ? "حفظ قالب الطالب" : "Save Student Template"}</>
              )}
            </button>
            <button
              onClick={() => saveTemplateToDatabase("guardian", currentGuardianMessage)}
              disabled={!currentGuardianMessage || savingTemplate.guardian || loadingTemplates}
              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {savingTemplate.guardian ? (
                <><RefreshCw className="h-3 w-3 animate-spin" /> {isRTL ? "جاري الحفظ..." : "Saving..."}</>
              ) : (
                <><Save className="h-3 w-3" /> {isRTL ? "حفظ قالب ولي الأمر" : "Save Guardian Template"}</>
              )}
            </button>
          </div>
        </div>

        {/* Info strip */}
        <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            {isRTL
              ? `هيتبعت رسالتين مخصصتين لكل طالب (رسالة للطالب ورسالة لولي الأمر) حسب بيانات كل طالب: اللغة والجنس وعلاقة ولي الأمر. إجمالي الطلاب: ${groupStudents.length}`
              : `Two personalized messages are sent per student (student + guardian) based on each student's language, gender and guardian relationship. Total students: ${groupStudents.length}`}
          </p>
        </div>
      </div>
    </ModalShell>
  );
}