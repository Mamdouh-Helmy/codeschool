// /src/components/sessions/GroupCompletionModal.jsx
"use client";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import toast from "react-hot-toast";
import {
  X,
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
  Globe
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

  // ✅ State للقوالب الخام لكل طالب
  const [studentTemplates, setStudentTemplates] = useState({});
  const [guardianTemplates, setGuardianTemplates] = useState({});
  
  // ✅ State للقوالب المعدلة يدوياً لكل طالب
  const [editedStudentTemplates, setEditedStudentTemplates] = useState({});
  const [editedGuardianTemplates, setEditedGuardianTemplates] = useState({});
  
  // ✅ State للقالب المعروض حالياً في المحرر (للمعاينة فقط)
  const [currentStudentMessage, setCurrentStudentMessage] = useState('');
  const [currentGuardianMessage, setCurrentGuardianMessage] = useState('');

  const [previewStudentMessage, setPreviewStudentMessage] = useState("");
  const [previewGuardianMessage, setPreviewGuardianMessage] = useState("");
  const [showHints, setShowHints] = useState({ student: false, guardian: false });
  const [cursorPosition, setCursorPosition] = useState({ student: 0, guardian: 0 });
  const [selectedHintIndex, setSelectedHintIndex] = useState({ student: 0, guardian: 0 });
  const [selectedStudentForPreview, setSelectedStudentForPreview] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [manuallyEdited, setManuallyEdited] = useState({ student: false, guardian: false });
  const [sending, setSending] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState({ student: false, guardian: false });

  // ✅ DB template variables (نفس منطق ReminderModal)
  const [dbVars, setDbVars] = useState({});

  const studentTextareaRef = useRef(null);
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

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (hintsRef.current.student && !hintsRef.current.student.contains(event.target)) {
        setShowHints((prev) => ({ ...prev, student: false }));
      }
      if (hintsRef.current.guardian && !hintsRef.current.guardian.contains(event.target)) {
        setShowHints((prev) => ({ ...prev, guardian: false }));
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // اختيار أول طالب
  useEffect(() => {
    if (groupStudents.length > 0 && !selectedStudentForPreview) {
      setSelectedStudentForPreview(groupStudents[0]);
    }
  }, [groupStudents]);

  // ✅ بناء المتغيرات لكل طالب - مع دعم dbVars
  const buildVariables = useCallback(
    (student) => {
      if (!student) return {};
      
      const lang = student.communicationPreferences?.preferredLanguage || "ar";
      const gender = (student.personalInfo?.gender || "male").toLowerCase().trim();
      const relationship = (student.guardianInfo?.relationship || "father").toLowerCase().trim();
      const isMale = gender !== "female";
      const isFather = relationship !== "mother";
      const genderCtx = { studentGender: gender, guardianType: relationship };

      const studentFirstName =
        lang === "ar"
          ? student.personalInfo?.nickname?.ar?.trim() || student.personalInfo?.fullName?.split(" ")[0] || "الطالب"
          : student.personalInfo?.nickname?.en?.trim() || student.personalInfo?.fullName?.split(" ")[0] || "Student";

      const guardianFirstName =
        lang === "ar"
          ? student.guardianInfo?.nickname?.ar?.trim() || student.guardianInfo?.name?.split(" ")[0] || "ولي الأمر"
          : student.guardianInfo?.nickname?.en?.trim() || student.guardianInfo?.name?.split(" ")[0] || "Guardian";

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
      const guardianSalutation = lang === "ar" ? guardianSalutation_ar : guardianSalutation_en;

      const studentSalutation_ar = `${salutationBase_ar} ${studentFirstName}`;
      const studentSalutation = lang === "ar" ? studentSalutation_ar : `Dear ${studentFirstName}`;

      const childTitle = lang === "ar" ? childTitleAr : childTitleEn;

      return {
        studentSalutation,
        guardianSalutation,
        salutation: guardianSalutation,
        studentName: studentFirstName,
        studentFullName: student.personalInfo?.fullName || "",
        guardianName: guardianFirstName,
        guardianFullName: student.guardianInfo?.name || "",
        childTitle,
        groupName: group?.name || "",
        groupCode: group?.code || "",
        courseName: group?.courseSnapshot?.title || "",
        enrollmentNumber: student.enrollmentNumber || "",
        feedbackLink: formData.feedbackLink || "",
      };
    },
    [group, formData.feedbackLink, dbVars]
  );

  // ✅ استبدال المتغيرات في النص
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

  // ✅ جلب القوالب لجميع الطلاب
  useEffect(() => {
    const fetchAllTemplates = async () => {
      if (!resolvedGroupId || groupStudents.length === 0) return;
      
      setLoadingTemplates(true);
      try {
        const templatesPromises = groupStudents.map(async (student) => {
          const res = await fetch(`/api/groups/${resolvedGroupId}/completion-templates`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentId: student._id,
              feedbackLink: formData.feedbackLink,
            }),
          });
          const json = await res.json();
          
          if (json.success) {
            return {
              studentId: student._id,
              studentTemplate: json.data.student?.rawContent || json.data.student?.content || '',
              guardianTemplate: json.data.guardian?.rawContent || json.data.guardian?.content || ''
            };
          }
          return null;
        });

        const results = await Promise.all(templatesPromises);
        
        const newStudentTemplates = {};
        const newGuardianTemplates = {};
        
        results.forEach(result => {
          if (result) {
            newStudentTemplates[result.studentId] = result.studentTemplate;
            newGuardianTemplates[result.studentId] = result.guardianTemplate;
          }
        });

        setStudentTemplates(newStudentTemplates);
        setGuardianTemplates(newGuardianTemplates);

        if (groupStudents[0]) {
          setCurrentStudentMessage(newStudentTemplates[groupStudents[0]._id] || '');
          setCurrentGuardianMessage(newGuardianTemplates[groupStudents[0]._id] || '');
        }

      } catch (error) {
        console.error("Error fetching templates:", error);
        toast.error(isRTL ? "فشل تحميل القوالب" : "Failed to load templates");
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchAllTemplates();
  }, [resolvedGroupId, groupStudents, formData.feedbackLink, isRTL]);

  // ✅ المعاينة - تستخدم renderTemplate على الـ raw content
  useEffect(() => {
    if (!selectedStudentForPreview) return;
    setPreviewStudentMessage(renderTemplate(currentStudentMessage, selectedStudentForPreview));
    setPreviewGuardianMessage(renderTemplate(currentGuardianMessage, selectedStudentForPreview));
  }, [currentStudentMessage, currentGuardianMessage, selectedStudentForPreview, renderTemplate]);

  // المتغيرات المتاحة للـ hints
  const availableVariables = useMemo(
    () => [
      { key: "{studentSalutation}", label: isRTL ? "تحية الطالب" : "Student Salutation", icon: "👶" },
      { key: "{guardianSalutation}", label: isRTL ? "تحية ولي الأمر" : "Guardian Salutation", icon: "👤" },
      { key: "{studentName}", label: isRTL ? "اسم الطالب" : "Student Name", icon: "👶" },
      { key: "{guardianName}", label: isRTL ? "اسم ولي الأمر" : "Guardian Name", icon: "👤" },
      { key: "{childTitle}", label: isRTL ? "ابنك/ابنتك" : "Son/Daughter", icon: "👪" },
      { key: "{groupName}", label: isRTL ? "اسم المجموعة" : "Group Name", icon: "👥" },
      { key: "{groupCode}", label: isRTL ? "كود المجموعة" : "Group Code", icon: "🔢" },
      { key: "{courseName}", label: isRTL ? "اسم الكورس" : "Course Name", icon: "📘" },
      { key: "{enrollmentNumber}", label: isRTL ? "الرقم التعريفي" : "Enrollment No.", icon: "🔢" },
      { key: "{feedbackLink}", label: isRTL ? "رابط التقييم" : "Feedback Link", icon: "🔗" },
    ],
    [isRTL]
  );

  // عرض التحيات المتوقعة
  const salutationPreview = selectedStudentForPreview
    ? (() => {
        const vars = buildVariables(selectedStudentForPreview);
        return { student: vars.studentSalutation, guardian: vars.guardianSalutation };
      })()
    : { student: "", guardian: "" };

  // تغيير الطالب المختار للمعاينة
  const handleStudentPreviewChange = useCallback(
    (studentId) => {
      const student = groupStudents.find((s) => s._id === studentId);
      if (!student) return;
      
      setSelectedStudentForPreview(student);
      
      const studentTemplate = editedStudentTemplates[studentId] || studentTemplates[studentId] || '';
      const guardianTemplate = editedGuardianTemplates[studentId] || guardianTemplates[studentId] || '';
      
      setCurrentStudentMessage(studentTemplate);
      setCurrentGuardianMessage(guardianTemplate);
      
      setManuallyEdited({
        student: !!editedStudentTemplates[studentId],
        guardian: !!editedGuardianTemplates[studentId]
      });
    },
    [groupStudents, studentTemplates, guardianTemplates, editedStudentTemplates, editedGuardianTemplates]
  );

  // إعادة تعيين القوالب
  const resetToDefault = useCallback(async () => {
    if (!selectedStudentForPreview) return;
    
    setLoadingTemplates(true);
    try {
      const studentId = selectedStudentForPreview._id;
      
      const res = await fetch(`/api/groups/${resolvedGroupId}/completion-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentId,
          feedbackLink: formData.feedbackLink,
        }),
      });
      
      const json = await res.json();
      
      if (json.success) {
        const studentTemplate = json.data.student?.rawContent || json.data.student?.content || '';
        const guardianTemplate = json.data.guardian?.rawContent || json.data.guardian?.content || '';

        setStudentTemplates(prev => ({
          ...prev,
          [studentId]: studentTemplate
        }));
        setGuardianTemplates(prev => ({
          ...prev,
          [studentId]: guardianTemplate
        }));

        setEditedStudentTemplates(prev => {
          const newState = { ...prev };
          delete newState[studentId];
          return newState;
        });
        setEditedGuardianTemplates(prev => {
          const newState = { ...prev };
          delete newState[studentId];
          return newState;
        });

        setCurrentStudentMessage(studentTemplate);
        setCurrentGuardianMessage(guardianTemplate);
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

  // حفظ القالب في DB
  const saveTemplateToDatabase = useCallback(
    async (type, content) => {
      if (!content?.trim() || !selectedStudentForPreview) return;
      
      setSavingTemplate((prev) => ({ ...prev, [type]: true }));
      try {
        const templateType = type === "student" ? "group_completion_student" : "group_completion_guardian";
        const recipientType = type === "student" ? "student" : "guardian";
        const lang = selectedStudentForPreview.communicationPreferences?.preferredLanguage || "ar";
        const templateName = type === "student" ? "Group Completion - Student" : "Group Completion - Guardian";

        const searchRes = await fetch(`/api/message-templates?type=${templateType}&recipient=${recipientType}&default=true`);
        const searchJson = await searchRes.json();

        if (searchJson.success && searchJson.data.length > 0) {
          const templateId = searchJson.data[0]._id;
          const existingTemplate = searchJson.data[0];
          
          const updateData = { 
            id: templateId, 
            name: templateName, 
            isDefault: true,
            updatedAt: new Date()
          };
          
          if (lang === "ar") {
            updateData.contentAr = content;
            updateData.contentEn = existingTemplate.contentEn || '';
          } else {
            updateData.contentEn = content;
            updateData.contentAr = existingTemplate.contentAr || '';
          }
          
          const res = await fetch(`/api/message-templates`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updateData),
          });
          const json = await res.json();
          if (json.success) {
            toast.success(
              isRTL 
                ? `تم تحديث القالب (${lang === 'ar' ? 'عربي' : 'إنجليزي'})` 
                : `Template (${lang === 'ar' ? 'Arabic' : 'English'}) updated`
            );
            
            if (type === "student") {
              setStudentTemplates(prev => ({
                ...prev,
                [selectedStudentForPreview._id]: content
              }));
            } else {
              setGuardianTemplates(prev => ({
                ...prev,
                [selectedStudentForPreview._id]: content
              }));
            }
          } else throw new Error(json.error);
        } else {
          const newTemplate = {
            templateType,
            recipientType,
            name: templateName,
            description: `Group completion notification for ${recipientType}`,
            isDefault: true,
            isActive: true,
            variables: [
              { key: "guardianSalutation", label: "Guardian Salutation" },
              { key: "studentSalutation", label: "Student Salutation" },
              { key: "studentName", label: "Student Name" },
              { key: "guardianName", label: "Guardian Name" },
              { key: "childTitle", label: "Son/Daughter" },
              { key: "groupName", label: "Group Name" },
              { key: "groupCode", label: "Group Code" },
              { key: "courseName", label: "Course Name" },
              { key: "enrollmentNumber", label: "Enrollment Number" },
              { key: "feedbackLink", label: "Feedback Link" },
            ],
          };
          
          if (lang === "ar") { 
            newTemplate.contentAr = content; 
            newTemplate.contentEn = ''; 
          } else { 
            newTemplate.contentEn = content; 
            newTemplate.contentAr = ''; 
          }

          const res = await fetch(`/api/message-templates`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newTemplate),
          });
          const json = await res.json();
          if (json.success) {
            toast.success(
              isRTL 
                ? `تم حفظ القالب (${lang === 'ar' ? 'عربي' : 'إنجليزي'})` 
                : `Template (${lang === 'ar' ? 'Arabic' : 'English'}) saved`
            );
            
            if (type === "student") {
              setStudentTemplates(prev => ({
                ...prev,
                [selectedStudentForPreview._id]: content
              }));
            } else {
              setGuardianTemplates(prev => ({
                ...prev,
                [selectedStudentForPreview._id]: content
              }));
            }
          } else throw new Error(json.error);
        }
        
      } catch (error) {
        console.error("saveTemplate error:", error);
        toast.error(isRTL ? "فشل حفظ القالب: " + error.message : "Failed to save template: " + error.message);
      } finally {
        setSavingTemplate((prev) => ({ ...prev, [type]: false }));
      }
    },
    [selectedStudentForPreview, isRTL]
  );

  // دوال الـ hints
  const insertVariable = useCallback(
    (type, variable) => {
      const ref = type === "student" ? studentTextareaRef : guardianTextareaRef;
      const textarea = ref.current;
      if (!textarea) return;

      const currentValue = type === "student" ? currentStudentMessage : currentGuardianMessage;
      const cursorPos = cursorPosition[type];
      const beforeCursor = currentValue.substring(0, cursorPos);
      const lastAt = beforeCursor.lastIndexOf("@");

      let newValue, newCursorPos;
      if (lastAt !== -1) {
        newValue = currentValue.substring(0, lastAt) + variable.key + currentValue.substring(cursorPos);
        newCursorPos = lastAt + variable.key.length;
      } else {
        newValue = currentValue.substring(0, cursorPos) + variable.key + currentValue.substring(cursorPos);
        newCursorPos = cursorPos + variable.key.length;
      }

      if (type === "student") {
        setCurrentStudentMessage(newValue);
        if (selectedStudentForPreview) {
          setEditedStudentTemplates(prev => ({
            ...prev,
            [selectedStudentForPreview._id]: newValue
          }));
        }
      } else {
        setCurrentGuardianMessage(newValue);
        if (selectedStudentForPreview) {
          setEditedGuardianTemplates(prev => ({
            ...prev,
            [selectedStudentForPreview._id]: newValue
          }));
        }
      }
      
      setManuallyEdited((prev) => ({ ...prev, [type]: true }));
      setShowHints((prev) => ({ ...prev, [type]: false }));

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [currentStudentMessage, currentGuardianMessage, cursorPosition, selectedStudentForPreview]
  );

  const handleInput = useCallback((type) => (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    if (type === "student") {
      setCurrentStudentMessage(value);
      if (selectedStudentForPreview) {
        setEditedStudentTemplates(prev => ({
          ...prev,
          [selectedStudentForPreview._id]: value
        }));
      }
    } else {
      setCurrentGuardianMessage(value);
      if (selectedStudentForPreview) {
        setEditedGuardianTemplates(prev => ({
          ...prev,
          [selectedStudentForPreview._id]: value
        }));
      }
    }
    
    setManuallyEdited((prev) => ({ ...prev, [type]: true }));
    setCursorPosition((prev) => ({ ...prev, [type]: cursorPos }));
    
    const lastAt = value.substring(0, cursorPos).lastIndexOf("@");
    if (lastAt !== -1 && lastAt === cursorPos - 1) {
      setShowHints((prev) => ({ ...prev, [type]: true }));
      setSelectedHintIndex((prev) => ({ ...prev, [type]: 0 }));
    } else {
      setShowHints((prev) => ({ ...prev, [type]: false }));
    }
  }, [selectedStudentForPreview]);

  const handleKeyDown = useCallback((type) => (e) => {
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
  }, [showHints, selectedHintIndex, availableVariables, insertVariable]);

  // ✅ إرسال الرسائل
  const handleSend = useCallback(async () => {
    if (!currentStudentMessage?.trim() || !currentGuardianMessage?.trim()) {
      toast.error(isRTL ? "الرجاء كتابة الرسالتين" : "Please write both messages");
      return;
    }

    setSending(true);

    try {
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < groupStudents.length; i++) {
        const student = groupStudents[i];
        const studentId = student._id;

        const studentRaw = editedStudentTemplates[studentId] || studentTemplates[studentId] || '';
        const guardianRaw = editedGuardianTemplates[studentId] || guardianTemplates[studentId] || '';

        const studentMsg = renderTemplate(studentRaw, student);
        const guardianMsg = renderTemplate(guardianRaw, student);

        try {
          const res = await fetch(`/api/groups/${resolvedGroupId}/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              singleStudent: {
                studentId: student._id,
                studentMessage: studentMsg,
                guardianMessage: guardianMsg,
              },
              feedbackLink: formData.feedbackLink || null,
            }),
          });

          const json = await res.json();

          if (json.success) {
            successCount++;
            toast.success(
              `✅ ${student.personalInfo?.fullName} (${i + 1}/${groupStudents.length})`,
              { duration: 2500 }
            );
          } else {
            failCount++;
            toast.error(
              `❌ ${student.personalInfo?.fullName}: ${json.error || "Failed"}`,
              { duration: 3000 }
            );
          }
        } catch {
          failCount++;
          toast.error(`❌ ${student.personalInfo?.fullName}`, { duration: 3000 });
        }

        if (i < groupStudents.length - 1) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      toast.success(
        isRTL
          ? `🎉 اكتمل الإرسال: ${successCount} نجح، ${failCount} فشل`
          : `🎉 Done: ${successCount} sent, ${failCount} failed`,
        { duration: 5000 }
      );

      onClose();
      onRefresh();
    } catch (error) {
      console.error("handleSend error:", error);
      toast.error(isRTL ? "حدث خطأ غير متوقع" : "Unexpected error occurred");
    } finally {
      setSending(false);
    }
  }, [currentStudentMessage, currentGuardianMessage, resolvedGroupId, groupStudents, studentTemplates, guardianTemplates, editedStudentTemplates, editedGuardianTemplates, renderTemplate, formData.feedbackLink, isRTL, onClose, onRefresh]);

  // Hints Dropdown component
  const HintsDropdown = ({ type, borderColor, bgColor, textColor }) => (
    showHints[type] && (
      <div
        ref={(el) => (hintsRef.current[type] = el)}
        className={`absolute z-50 w-full mt-1 bg-white dark:bg-darkmode border-2 ${borderColor} rounded-lg shadow-xl max-h-56 overflow-y-auto`}
      >
        <div className={`px-3 py-1.5 ${bgColor} border-b dark:border-opacity-20`}>
          <p className={`text-xs font-semibold ${textColor} flex items-center gap-1`}>
            <Zap className="w-3 h-3" />
            {isRTL ? "المتغيرات المتاحة" : "Available Variables"}
          </p>
        </div>
        {availableVariables.map((v, i) => (
          <button
            key={v.key}
            type="button"
            onClick={() => insertVariable(type, v)}
            className={`w-full px-3 py-2 text-right hover:${bgColor} dark:hover:bg-opacity-20 flex items-center gap-2 ${
              i === selectedHintIndex[type] ? `${bgColor} dark:bg-opacity-40` : ""
            }`}
          >
            <span>{v.icon}</span>
            <div className="flex-1 flex items-center justify-between">
              <span className={`text-sm font-mono ${textColor}`}>{v.key}</span>
              <span className="text-xs text-gray-500">{v.label}</span>
            </div>
          </button>
        ))}
        <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-t text-xs text-gray-400">
          ↑↓ {isRTL ? "للتنقل" : "navigate"} · Enter {isRTL ? "للإدراج" : "insert"} · Esc {isRTL ? "إغلاق" : "close"}
        </div>
      </div>
    )
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white dark:bg-darkmode rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="p-6 border-b border-PowderBlueBorder dark:border-dark_border flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-MidnightNavyText dark:text-white">
                {isRTL ? `إتمام المجموعة - ${group?.name}` : `Complete Group - ${group?.name}`}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {isRTL ? `الكود: ${group?.code}` : `Code: ${group?.code}`}
                {group?.courseSnapshot?.title && ` · ${group.courseSnapshot.title}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Feedback Link */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
              <Link2 className="w-4 h-4" />
              {isRTL ? "رابط التقييم (اختياري)" : "Feedback Link (optional)"}
            </label>
            <input
              type="url"
              value={formData.feedbackLink}
              onChange={(e) => setFormData((prev) => ({ ...prev, feedbackLink: e.target.value }))}
              placeholder={isRTL ? "أدخل رابط استبيان التقييم..." : "Enter feedback form URL..."}
              className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
            />
          </div>

          {/* Messages Area */}
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-5">

            {/* Header with Reset */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                {isRTL ? "رسائل إتمام المجموعة" : "Group Completion Messages"}
              </h3>
              <button
                onClick={resetToDefault}
                disabled={loadingTemplates}
                className="px-3 py-1 text-xs bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${loadingTemplates ? "animate-spin" : ""}`} />
                {isRTL ? "استعادة القوالب" : "Reset Templates"}
              </button>
            </div>

            {/* Student Selector */}
            {groupStudents.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block">
                  {isRTL ? "اختر طالباً لمعاينة الرسالة:" : "Select student to preview:"}
                </label>
                <select
                  value={selectedStudentForPreview?._id || ""}
                  onChange={(e) => handleStudentPreviewChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-amber-300 dark:border-amber-700 rounded-lg dark:bg-gray-800 dark:text-white"
                  disabled={loadingTemplates}
                >
                  {groupStudents.map((student) => {
                    const lang = student.communicationPreferences?.preferredLanguage || "ar";
                    const gender = (student.personalInfo?.gender || "male").toLowerCase().trim();
                    const rel = (student.guardianInfo?.relationship || "father").toLowerCase().trim();
                    const isEdited = editedStudentTemplates[student._id] || editedGuardianTemplates[student._id];
                    
                    let optionText = student.personalInfo?.fullName || "";
                    optionText += ` · ${lang === "ar" ? "🇸🇦 عربي" : "🇬🇧 English"}`;
                    optionText += ` · ${gender === "female" ? "👧" : "👦"}`;
                    optionText += ` · ${rel === "mother" ? "👩 أم" : rel === "father" ? "👨 أب" : "👤"}`;
                    if (isEdited) optionText += " ✏️";
                    
                    return (
                      <option key={student._id} value={student._id}>
                        {optionText}
                      </option>
                    );
                  })}
                </select>

                {/* عرض التحيات */}
                {selectedStudentForPreview && (
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-amber-200 dark:border-amber-700 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-600 dark:text-amber-400 font-medium w-28 shrink-0">
                        👶 {isRTL ? "تحية الطالب:" : "Student:"}
                      </span>
                      <span className="text-gray-800 dark:text-gray-200 font-semibold">{salutationPreview.student}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-orange-600 dark:text-orange-400 font-medium w-28 shrink-0">
                        👪 {isRTL ? "تحية ولي الأمر:" : "Guardian:"}
                      </span>
                      <span className="text-gray-800 dark:text-gray-200 font-semibold">{salutationPreview.guardian}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Globe className="w-3 h-3" />
                      <span>
                        {isRTL ? 'لغة الطالب: ' : 'Student language: '}
                        {selectedStudentForPreview.communicationPreferences?.preferredLanguage === 'ar' ? '🇸🇦 العربية' : '🇬🇧 English'}
                      </span>
                    </div>
                    {(manuallyEdited.student || manuallyEdited.guardian) && (
                      <p className="text-orange-500 dark:text-orange-400 flex items-center gap-1 mt-1">
                        ✏️ {isRTL ? "هذا الطالب لديه رسائل معدلة يدوياً" : "This student has manually edited messages"}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Student Message */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <User className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <h4 className="font-semibold text-amber-900 dark:text-amber-100 text-sm">
                  {isRTL ? "رسالة للطالب" : "Message for Student"}
                </h4>
                {loadingTemplates && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-amber-500" />}
              </div>

              <div className="relative">
                <textarea
                  ref={studentTextareaRef}
                  value={currentStudentMessage}
                  onChange={handleInput("student")}
                  onKeyDown={handleKeyDown("student")}
                  onSelect={(e) => setCursorPosition((prev) => ({ ...prev, student: e.target.selectionStart }))}
                  placeholder={isRTL ? "اكتب رسالة الطالب..." : "Write student message..."}
                  className="w-full px-3 py-2.5 border-2 border-amber-200 dark:border-amber-700 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-gray-800 dark:text-white resize-none h-32 font-mono text-sm"
                  dir={isRTL ? "rtl" : "ltr"}
                />
                <span className="absolute bottom-2 left-2 text-xs text-gray-400">
                  @ {isRTL ? "للمتغيرات" : "for variables"}
                </span>
                <HintsDropdown
                  type="student"
                  borderColor="border-amber-300 dark:border-amber-700"
                  bgColor="bg-amber-50 dark:bg-amber-900/30"
                  textColor="text-amber-600 dark:text-amber-400"
                />
              </div>

              {/* Preview - Student */}
              {previewStudentMessage && selectedStudentForPreview && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-amber-200 dark:border-amber-700 overflow-hidden">
                  <div className="bg-amber-50 dark:bg-amber-900/30 px-3 py-2 border-b flex items-center justify-between">
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                      📋 {isRTL ? "معاينة للطالب" : "Student Preview"}
                    </span>
                    <span className="text-xs text-amber-500 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {selectedStudentForPreview.communicationPreferences?.preferredLanguage === "ar" ? "🇸🇦 عربي" : "🇬🇧 English"}
                      {" · "}
                      {(selectedStudentForPreview.personalInfo?.gender || "").toLowerCase() === "female" ? "👧" : "👦"}
                    </span>
                  </div>
                  <div className="p-3 text-sm whitespace-pre-wrap break-words max-h-48 overflow-y-auto" dir={selectedStudentForPreview.communicationPreferences?.preferredLanguage === 'ar' ? 'rtl' : 'ltr'}>
                    {previewStudentMessage}
                  </div>
                </div>
              )}
            </div>

            {/* Guardian Message */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Users className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <h4 className="font-semibold text-orange-900 dark:text-orange-100 text-sm">
                  {isRTL ? "رسالة لولي الأمر" : "Message for Guardian"}
                </h4>
              </div>

              <div className="relative">
                <textarea
                  ref={guardianTextareaRef}
                  value={currentGuardianMessage}
                  onChange={handleInput("guardian")}
                  onKeyDown={handleKeyDown("guardian")}
                  onSelect={(e) => setCursorPosition((prev) => ({ ...prev, guardian: e.target.selectionStart }))}
                  placeholder={isRTL ? "اكتب رسالة ولي الأمر..." : "Write guardian message..."}
                  className="w-full px-3 py-2.5 border-2 border-orange-200 dark:border-orange-700 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-white resize-none h-32 font-mono text-sm"
                  dir={isRTL ? "rtl" : "ltr"}
                />
                <span className="absolute bottom-2 left-2 text-xs text-gray-400">
                  @ {isRTL ? "للمتغيرات" : "for variables"}
                </span>
                <HintsDropdown
                  type="guardian"
                  borderColor="border-orange-300 dark:border-orange-700"
                  bgColor="bg-orange-50 dark:bg-orange-900/30"
                  textColor="text-orange-600 dark:text-orange-400"
                />
              </div>

              {/* Preview - Guardian */}
              {previewGuardianMessage && selectedStudentForPreview && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-700 overflow-hidden">
                  <div className="bg-orange-50 dark:bg-orange-900/30 px-3 py-2 border-b flex items-center justify-between">
                    <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                      📋 {isRTL ? "معاينة لولي الأمر" : "Guardian Preview"}
                    </span>
                    <span className="text-xs text-orange-500 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {selectedStudentForPreview.communicationPreferences?.preferredLanguage === "ar" ? "🇸🇦 عربي" : "🇬🇧 English"}
                      {" · "}
                      {(() => {
                        const rel = (selectedStudentForPreview.guardianInfo?.relationship || "").toLowerCase();
                        return rel === "mother" ? "👩 أم" : rel === "father" ? "👨 أب" : "👤";
                      })()}
                    </span>
                  </div>
                  <div className="p-3 text-sm whitespace-pre-wrap break-words max-h-48 overflow-y-auto" dir={selectedStudentForPreview.communicationPreferences?.preferredLanguage === 'ar' ? 'rtl' : 'ltr'}>
                    {previewGuardianMessage}
                  </div>
                </div>
              )}
            </div>

            {/* Save Template Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-amber-200 dark:border-amber-800">
              <button
                onClick={() => saveTemplateToDatabase("student", currentStudentMessage)}
                disabled={!currentStudentMessage || savingTemplate.student || loadingTemplates}
                className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
              >
                <Save className="w-3 h-3" />
                {savingTemplate.student ? (
                  <><RefreshCw className="w-3 h-3 animate-spin" /> {isRTL ? "جاري الحفظ..." : "Saving..."}</>
                ) : (
                  isRTL ? "حفظ قالب الطالب" : "Save Student Template"
                )}
              </button>
              <button
                onClick={() => saveTemplateToDatabase("guardian", currentGuardianMessage)}
                disabled={!currentGuardianMessage || savingTemplate.guardian || loadingTemplates}
                className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
              >
                <Save className="w-3 h-3" />
                {savingTemplate.guardian ? (
                  <><RefreshCw className="w-3 h-3 animate-spin" /> {isRTL ? "جاري الحفظ..." : "Saving..."}</>
                ) : (
                  isRTL ? "حفظ قالب ولي الأمر" : "Save Guardian Template"
                )}
              </button>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-2 text-xs text-blue-700 dark:text-blue-300">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              {isRTL
                ? `سيتم إرسال رسالتين مخصصتين لكل طالب (رسالة للطالب ورسالة لولي الأمر) بناءً على بيانات كل طالب (اللغة، الجنس، علاقة ولي الأمر). إجمالي الطلاب: ${groupStudents.length}`
                : `Two personalized messages will be sent per student (student message + guardian message) based on each student's data (language, gender, guardian relationship). Total students: ${groupStudents.length}`}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-PowderBlueBorder dark:border-dark_border flex items-center justify-end gap-3">
          <div className="flex-1">
            <p className="text-xs text-gray-500">
              <Globe className="w-3 h-3 inline mr-1" />
              {isRTL 
                ? 'سيتم إرسال القالب المناسب لكل طالب حسب لغته' 
                : 'Each student will receive the message in their preferred language'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-gray-50 dark:hover:bg-dark_input"
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
            className="px-5 py-2 text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-sm"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                {isRTL ? "جاري الإرسال..." : "Sending..."}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {isRTL ? `إرسال لـ ${groupStudents.length} طالب` : `Send to ${groupStudents.length} students`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}