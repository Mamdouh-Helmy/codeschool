"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, Copy, AlertCircle, Users, Clock, Calendar, Eye, Zap, Globe, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocale } from "@/app/context/LocaleContext";

export default function InstructorNotificationModal({
  isOpen,
  onClose,
  instructors,
  groupData,
  onSendNotifications,
}) {
  const { t }      = useI18n();
  const { locale } = useLocale();
  const isRTL      = locale === "ar";

  const [messages, setMessages]                 = useState({});
  const [previewStates, setPreviewStates]       = useState({});
  const [sending, setSending]                   = useState(false);
  const [selectedInstructors, setSelectedInstructors] = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [loadingVars, setLoadingVars]           = useState(false);

  const [templateAr, setTemplateAr] = useState("");
  const [templateEn, setTemplateEn] = useState("");

  const [instructorLanguages, setInstructorLanguages] = useState({});

  // ── DB variables — full objects for gender-aware lookup ──────────────────
  const [dbVars, setDbVars] = useState({});

  const [showHints, setShowHints]             = useState({});
  const [selectedHintIndex, setSelectedHintIndex] = useState({});
  const [cursorPositions, setCursorPositions] = useState({});

  const textareaRefs = useRef({});
  const hintsRefs    = useRef({});
  const saveTimer    = useRef(null);
  const templateId   = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch DB variables — store FULL object
  // ─────────────────────────────────────────────────────────────────────────
  const fetchDbVariables = async () => {
    setLoadingVars(true);
    try {
      const res  = await fetch("/api/whatsapp/template-variables");
      const data = await res.json();
      if (data.success && data.data) {
        const varsMap = {};
        data.data.forEach(v => { varsMap[v.key] = v; });   // full object
        setDbVars(varsMap);
      }
    } catch (error) {
      console.error("❌ Error fetching template variables:", error);
    } finally {
      setLoadingVars(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // resolveVar — gender-aware (same pattern as StudentForm)
  //
  // For instructors we use genderType: "instructor"
  // genderContext: { instructorGender: "male"|"female" }
  // ─────────────────────────────────────────────────────────────────────────
  const resolveVar = useCallback((key, lang = "ar", genderContext = {}) => {
    const v = dbVars[key];
    if (!v) return null;

    const { instructorGender = "male" } = genderContext;
    const isMale = instructorGender === "male";

    if (v.hasGender) {
      if (v.genderType === "instructor") {
        return lang === "ar"
          ? (isMale ? v.valueMaleAr   : v.valueFemaleAr) || v.valueAr || ""
          : (isMale ? v.valueMaleEn   : v.valueFemaleEn) || v.valueEn || "";
      }
    }
    return lang === "ar" ? v.valueAr || "" : v.valueEn || "";
  }, [dbVars]);

  // ─────────────────────────────────────────────────────────────────────────
  // Build replacements map for one instructor + language
  // ─────────────────────────────────────────────────────────────────────────
  const buildReplacementsMap = useCallback((instructor, lang = "ar") => {
    if (!instructor || !groupData) return {};

    // instructor gender comes from their record (if stored), default male
    const instructorGender = (instructor.gender || "male").toLowerCase();
    const genderCtx        = { instructorGender };

    const instructorNick     = instructor.name?.split(" ")[0] || instructor.name || "";
    const instructorFullName = instructor.name || "";

    // ── Salutation from DB (key: "salutation" — group: group/instructor) ──
    // DB field stores e.g. valueAr = "أهلا يا", valueMaleAr = "أهلا يا" for instructors
    const greetingBase = resolveVar("salutation", lang, genderCtx)
      || resolveVar("instructorSalutation", lang, genderCtx)
      || (lang === "ar" ? "أهلا يا" : "Dear");

    const fullSalutation = `${greetingBase} ${instructorNick}`;

    // ── Instructor title from DB ───────────────────────────────────────────
    const instructorTitle = resolveVar("instructorTitle", lang, genderCtx)
      || (lang === "ar" ? "الأستاذ" : "Mr.");

    // ── Group data ────────────────────────────────────────────────────────
    const startDate = groupData.schedule?.startDate
      ? new Date(groupData.schedule.startDate).toLocaleDateString(
          lang === "ar" ? "ar-EG" : "en-US",
          { weekday: "long", year: "numeric", month: "long", day: "numeric" }
        )
      : "";

    const studentCount = groupData.currentStudentsCount || groupData.studentsCount || 0;
    const groupCode    = groupData.code || groupData.groupCode || "";
    const courseName   = groupData.courseSnapshot?.title || groupData.course?.title || "";
    const groupName    = groupData.name || "";
    const timeFrom     = groupData.schedule?.timeFrom || "";
    const timeTo       = groupData.schedule?.timeTo   || "";

    return {
      "{salutation}":          fullSalutation,
      "{instructorName}":      instructorNick,
      "{instructorFullName}":  instructorFullName,
      "{instructorTitle}":     instructorTitle,
      "{courseName}":          courseName,
      "{groupName}":           groupName,
      "{groupCode}":           groupCode,
      "{startDate}":           startDate,
      "{timeFrom}":            timeFrom,
      "{timeTo}":              timeTo,
      "{studentCount}":        studentCount.toString(),
    };
  }, [groupData, resolveVar]);

  // ─────────────────────────────────────────────────────────────────────────
  // replaceVariables — uses buildReplacementsMap
  // ─────────────────────────────────────────────────────────────────────────
  const replaceVariables = useCallback((messageTemplate, instructor, lang = "ar") => {
    if (!instructor || !groupData) return messageTemplate;
    const map    = buildReplacementsMap(instructor, lang);
    let   result = messageTemplate;
    for (const [key, value] of Object.entries(map)) {
      result = result.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value ?? "");
    }
    return result;
  }, [buildReplacementsMap, groupData]);

  // ─────────────────────────────────────────────────────────────────────────
  // Hint variables — examples from buildReplacementsMap
  // ─────────────────────────────────────────────────────────────────────────
  const getInstructorVariables = useCallback((instructor, lang = "ar") => {
    const map   = buildReplacementsMap(instructor, lang);
    const isAr  = lang === "ar";

    return [
      { key: "{salutation}",         label: isAr ? "التحية"                    : "Salutation",            icon: "👋", description: isAr ? "تحية المدرب (أهلا يا + الاسم)"    : "Instructor greeting (greeting + name)", example: map["{salutation}"]         },
      { key: "{instructorName}",     label: isAr ? "اسم المدرب (مختصر)"       : "Instructor Name",       icon: "👨‍🏫", description: isAr ? "الاسم المختصر للمدرب"           : "First name",                           example: map["{instructorName}"]     },
      { key: "{instructorFullName}", label: isAr ? "الاسم الكامل للمدرب"       : "Instructor Full Name",  icon: "👨‍🏫", description: isAr ? "الاسم الكامل للمدرب"            : "Full name",                            example: map["{instructorFullName}"] },
      { key: "{instructorTitle}",    label: isAr ? "لقب المدرب"               : "Instructor Title",      icon: "🎓", description: isAr ? "أستاذ / دكتور / مهندس"            : "Mr. / Dr. / Eng.",                     example: map["{instructorTitle}"]    },
      { key: "{courseName}",         label: isAr ? "اسم الكورس"               : "Course Name",           icon: "📚", description: isAr ? "اسم البرنامج التعليمي"             : "Program name",                         example: map["{courseName}"]         },
      { key: "{groupName}",          label: isAr ? "اسم المجموعة"             : "Group Name",            icon: "👥", description: isAr ? "اسم المجموعة"                     : "Group name",                           example: map["{groupName}"]          },
      { key: "{groupCode}",          label: isAr ? "كود المجموعة"             : "Group Code",            icon: "🔤", description: isAr ? "الكود التعريفي للمجموعة"           : "Group identifier",                     example: map["{groupCode}"]          },
      { key: "{startDate}",          label: isAr ? "تاريخ البدء"              : "Start Date",            icon: "📅", description: isAr ? "تاريخ بدء المجموعة"               : "Group start date",                     example: map["{startDate}"]          },
      { key: "{timeFrom}",           label: isAr ? "وقت البداية"              : "Time From",             icon: "⏰", description: isAr ? "وقت بدء الحصة"                    : "Session start time",                   example: map["{timeFrom}"]           },
      { key: "{timeTo}",             label: isAr ? "وقت النهاية"              : "Time To",               icon: "⏰", description: isAr ? "وقت نهاية الحصة"                  : "Session end time",                     example: map["{timeTo}"]             },
      { key: "{studentCount}",       label: isAr ? "عدد الطلاب"               : "Student Count",         icon: "👨‍🎓", description: isAr ? "عدد الطلاب المسجلين"            : "Enrolled students",                    example: map["{studentCount}"]       },
    ];
  }, [buildReplacementsMap]);

  // ─────────────────────────────────────────────────────────────────────────
  // Load template from API
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadTemplate = async () => {
      setLoading(true);
      try {
        const res  = await fetch("/api/whatsapp/instructor-templates?default=true");
        const data = await res.json();
        if (data.success && data.data) {
          setTemplateAr(data.data.contentAr || data.data.content || "");
          setTemplateEn(data.data.contentEn || "");
          templateId.current = data.data._id;
        }
      } catch (error) {
        console.error("Error loading template:", error);
        toast.error("فشل تحميل القالب");
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadTemplate();
      fetchDbVariables();
    }
  }, [isOpen]);

  // ─────────────────────────────────────────────────────────────────────────
  // Initialise per-instructor state when instructors + template are ready
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!instructors?.length || (!templateAr && !templateEn)) return;

    const newMessages     = {};
    const newPreviews     = {};
    const newHints        = {};
    const newHintIndexes  = {};
    const newCursors      = {};
    const newLanguages    = {};

    instructors.forEach(instructor => {
      const id = instructor._id || instructor.id;
      newLanguages[id]   = "ar";
      newMessages[id]    = templateAr;
      newPreviews[id]    = false;
      newHints[id]       = false;
      newHintIndexes[id] = 0;
      newCursors[id]     = 0;

      setSelectedInstructors(prev => prev.includes(id) ? prev : [...prev, id]);
    });

    setInstructorLanguages(newLanguages);
    setMessages(newMessages);
    setPreviewStates(newPreviews);
    setShowHints(newHints);
    setSelectedHintIndex(newHintIndexes);
    setCursorPositions(newCursors);
  }, [instructors, templateAr, templateEn]);

  // ─────────────────────────────────────────────────────────────────────────
  // Language toggle per instructor
  // ─────────────────────────────────────────────────────────────────────────
  const handleLanguageChange = (instructorId, lang) => {
    setInstructorLanguages(prev => ({ ...prev, [instructorId]: lang }));
    setMessages(prev => ({ ...prev, [instructorId]: lang === "ar" ? templateAr : templateEn }));
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Message change handler
  // ─────────────────────────────────────────────────────────────────────────
  const handleMessageChange = (instructorId, value, cursorPos) => {
    setMessages(prev => ({ ...prev, [instructorId]: value }));
    setCursorPositions(prev => ({ ...prev, [instructorId]: cursorPos }));

    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex      = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1 && lastAtIndex === cursorPos - 1) {
      setShowHints(prev => ({ ...prev, [instructorId]: true }));
      setSelectedHintIndex(prev => ({ ...prev, [instructorId]: 0 }));
    } else if (lastAtIndex === -1) {
      setShowHints(prev => ({ ...prev, [instructorId]: false }));
    }

    autoSave(instructorId, value);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Auto-save
  // ─────────────────────────────────────────────────────────────────────────
  const autoSave = (instructorId, content) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!templateId.current) return;
      const lang = instructorLanguages[instructorId];
      try {
        await fetch("/api/whatsapp/instructor-templates", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: templateId.current,
            [lang === "ar" ? "contentAr" : "contentEn"]: content,
            setAsDefault: true,
          }),
        });
      } catch (error) { console.error("Save error:", error); }
    }, 3000);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Insert variable
  // ─────────────────────────────────────────────────────────────────────────
  const insertVariable = (variable, instructorId) => {
    const textarea     = textareaRefs.current[instructorId];
    const currentValue = messages[instructorId];
    const cursorPos    = cursorPositions[instructorId];
    const textBefore   = currentValue.substring(0, cursorPos);
    const lastAtIndex  = textBefore.lastIndexOf("@");

    let newValue, newCursorPos;
    if (lastAtIndex !== -1) {
      newValue     = currentValue.substring(0, lastAtIndex) + variable.key + currentValue.substring(cursorPos);
      newCursorPos = lastAtIndex + variable.key.length;
    } else {
      newValue     = currentValue.substring(0, cursorPos) + variable.key + currentValue.substring(cursorPos);
      newCursorPos = cursorPos + variable.key.length;
    }

    setMessages(prev => ({ ...prev, [instructorId]: newValue }));
    setShowHints(prev => ({ ...prev, [instructorId]: false }));
    setCursorPositions(prev => ({ ...prev, [instructorId]: newCursorPos }));
    autoSave(instructorId, newValue);

    setTimeout(() => { textarea?.focus(); textarea?.setSelectionRange(newCursorPos, newCursorPos); }, 0);
  };

  const handleKeyDown = (e, instructorId, variables) => {
    if (!showHints[instructorId]) return;
    if (e.key === "ArrowDown")                  { e.preventDefault(); setSelectedHintIndex(prev => ({ ...prev, [instructorId]: (prev[instructorId] + 1) % variables.length })); }
    else if (e.key === "ArrowUp")               { e.preventDefault(); setSelectedHintIndex(prev => ({ ...prev, [instructorId]: (prev[instructorId] - 1 + variables.length) % variables.length })); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertVariable(variables[selectedHintIndex[instructorId]], instructorId); }
    else if (e.key === "Escape")                { e.preventDefault(); setShowHints(prev => ({ ...prev, [instructorId]: false })); }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.keys(hintsRefs.current).forEach(id => {
        if (hintsRefs.current[id] && !hintsRefs.current[id].contains(event.target))
          setShowHints(prev => ({ ...prev, [id]: false }));
      });
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleInstructor = (instructorId) =>
    setSelectedInstructors(prev => prev.includes(instructorId) ? prev.filter(id => id !== instructorId) : [...prev, instructorId]);

  const copyMessage = (instructorId) => {
    const instructor = instructors.find(i => (i._id || i.id) === instructorId);
    const lang       = instructorLanguages[instructorId] || "ar";
    const message    = replaceVariables(messages[instructorId], instructor, lang);
    navigator.clipboard.writeText(message);
    toast.success(lang === "ar" ? "تم النسخ!" : "Copied!");
  };

  const handleSend = async () => {
    if (selectedInstructors.length === 0) { toast.error("اختر مدرباً واحداً على الأقل"); return; }
    setSending(true);
    const toastId = toast.loading("جاري الإرسال...");
    try {
      const instructorMessages = {};
      for (const instructorId of selectedInstructors) {
        const instructor = instructors.find(i => (i._id || i.id) === instructorId);
        if (instructor) {
          const lang = instructorLanguages[instructorId] || "ar";
          instructorMessages[instructorId] = {
            message:  replaceVariables(messages[instructorId], instructor, lang),
            language: lang,
          };
        }
      }
      await onSendNotifications(instructorMessages);
      toast.success("تم الإرسال بنجاح!", { id: toastId });
      onClose();
    } catch (error) {
      toast.error(error.message || "فشل الإرسال", { id: toastId });
    } finally {
      setSending(false);
    }
  };

  if (!isOpen || !instructors?.length) return null;

  if (loading || loadingVars) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-darkmode rounded-2xl p-8">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-center mt-4">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className="bg-white dark:bg-darkmode rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary to-primary/90 text-white p-6 flex items-center justify-between border-b border-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center"><Users className="w-5 h-5" /></div>
            <div><h2 className="text-xl font-bold">إخطار المدربين</h2><p className="text-sm text-white/80">إخطار الحصة الأولى</p></div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6">

          {/* Group Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white text-sm font-bold">{groupData?.name?.slice(0, 2)}</div>
                <div>
                  <h3 className="font-semibold">{groupData?.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{groupData?.courseSnapshot?.title || groupData?.course?.title}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /><span>{groupData?.schedule?.startDate ? new Date(groupData.schedule.startDate).toLocaleDateString("ar-EG") : "N/A"}</span></div>
                <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /><span>{groupData?.schedule?.timeFrom} - {groupData?.schedule?.timeTo}</span></div>
                <div className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" /><span>{groupData?.currentStudentsCount || 0} طالب</span></div>
              </div>
            </div>
          </div>

          {/* Instructor Selection */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">اختر المدربين</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {instructors.map(instructor => {
                const id         = instructor._id || instructor.id;
                const isSelected = selectedInstructors.includes(id);
                return (
                  <label key={id} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleInstructor(id)} className="w-4 h-4 text-primary rounded" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{instructor.name}</p>
                        {instructor.gender && (
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                            {instructor.gender === "male" ? "👨 ذكر" : "👩 أنثى"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{instructor.email}</p>
                    </div>
                    {instructor.profile?.phone && (
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded">📱 {instructor.profile.phone}</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Per-instructor message editors */}
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {selectedInstructors.map(instructorId => {
              const instructor = instructors.find(i => (i._id || i.id) === instructorId);
              if (!instructor) return null;

              const lang      = instructorLanguages[instructorId] || "ar";
              const variables = getInstructorVariables(instructor, lang);
              const preview   = replaceVariables(messages[instructorId] || "", instructor, lang);
              const isAr      = lang === "ar";

              return (
                <div key={instructorId} className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 space-y-3">

                  {/* Header + language toggle */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{instructor.name}</h4>
                      {instructor.gender && (
                        <span className="text-xs bg-white dark:bg-gray-800 px-2 py-0.5 rounded">
                          {instructor.gender === "male" ? "👨" : "👩"}
                        </span>
                      )}
                      {/* Show resolved salutation as live preview chip */}
                      <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                        {buildReplacementsMap(instructor, lang)["{salutation}"]}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
                        <Globe className="w-3.5 h-3.5 text-gray-400 mx-1" />
                        <button type="button" onClick={() => handleLanguageChange(instructorId, "ar")}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${isAr ? "bg-primary text-white shadow-sm" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
                          عربي
                        </button>
                        <button type="button" onClick={() => handleLanguageChange(instructorId, "en")}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${!isAr ? "bg-primary text-white shadow-sm" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
                          English
                        </button>
                      </div>
                      <button onClick={() => copyMessage(instructorId)} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                        <Copy className="w-3 h-3" />{isAr ? "نسخ" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* Textarea */}
                  <div className="relative">
                    <textarea
                      ref={el => textareaRefs.current[instructorId] = el}
                      value={messages[instructorId] || ""}
                      onChange={e => handleMessageChange(instructorId, e.target.value, e.target.selectionStart)}
                      onKeyDown={e => handleKeyDown(e, instructorId, variables)}
                      className="w-full px-4 py-3 border-2 border-purple-200 dark:border-purple-800 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white resize-none h-40 text-sm"
                      dir={isAr ? "rtl" : "ltr"}
                      placeholder={isAr ? "اكتب @ لإظهار المتغيرات..." : "Type @ to show variables..."}
                    />
                    {showHints[instructorId] && (
                      <div ref={el => hintsRefs.current[instructorId] = el}
                        className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border-2 border-purple-300 dark:border-purple-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/30 border-b dark:border-purple-800">
                          <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1"><Zap className="w-3 h-3" />{isAr ? "المتغيرات المتاحة" : "Available Variables"}</p>
                        </div>
                        {variables.map((v, i) => (
                          <button key={v.key} type="button" onClick={() => insertVariable(v, instructorId)}
                            className={`w-full px-3 py-2 ${isAr ? "text-right" : "text-left"} hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-start gap-2 ${i === selectedHintIndex[instructorId] ? "bg-purple-100 dark:bg-purple-900/40" : ""}`}>
                            <span className="text-lg">{v.icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-mono text-purple-600 dark:text-purple-400">{v.key}</span>
                                <span className="text-xs text-gray-600 dark:text-gray-400">{v.label}</span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{v.description}</p>
                              <p className="text-xs text-purple-700 dark:text-purple-300 mt-1 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded inline-block">{v.example}</p>
                            </div>
                          </button>
                        ))}
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
                          ↑ ↓ {isAr ? "للتنقل • Enter للإدراج • Esc للإغلاق" : "to navigate • Enter to insert • Esc to close"}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Language chip */}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-block ${isAr ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"}`}>
                    {isAr ? "🇸🇦 الرسالة بالعربية" : "🇬🇧 Message in English"}
                  </span>

                  {/* Preview toggle */}
                  <div>
                    <button onClick={() => setPreviewStates(prev => ({ ...prev, [instructorId]: !prev[instructorId] }))}
                      className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {previewStates[instructorId] ? (isAr ? "إخفاء المعاينة" : "Hide Preview") : (isAr ? "عرض المعاينة" : "Show Preview")}
                    </button>
                    {previewStates[instructorId] && (
                      <div className="mt-2 bg-white dark:bg-gray-800 p-4 rounded-lg border border-purple-100 dark:border-purple-900 text-sm whitespace-pre-line max-h-48 overflow-y-auto" dir={isAr ? "rtl" : "ltr"}>
                        {preview}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Variables reference */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-300">
              <p className="font-medium mb-1">المتغيرات المتاحة / Available Variables:</p>
              <div className="space-y-1 text-xs font-mono">
                <p>{"{salutation}"} — التحية الكاملة (من قاعدة البيانات + اسم المدرب) / Full greeting from DB</p>
                <p>{"{instructorName}"} — الاسم المختصر / Short name</p>
                <p>{"{instructorFullName}"} — الاسم الكامل / Full name</p>
                <p>{"{instructorTitle}"} — اللقب (من قاعدة البيانات) / Title from DB</p>
                <p>{"{courseName}"} — اسم الكورس / Course name</p>
                <p>{"{groupName}"} — اسم المجموعة / Group name</p>
                <p>{"{groupCode}"} — كود المجموعة / Group code</p>
                <p>{"{startDate}"} — تاريخ البدء / Start date</p>
                <p>{"{timeFrom}"} / {"{timeTo}"} — أوقات الحصة / Session times</p>
                <p>{"{studentCount}"} — عدد الطلاب / Student count</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-darkmode border-t border-gray-200 dark:border-gray-700 p-6 flex gap-3">
          <button onClick={onClose} disabled={sending}
            className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50">
            إلغاء
          </button>
          <button onClick={handleSend} disabled={sending || selectedInstructors.length === 0}
            className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold">
            {sending
              ? <><Loader2 className="w-4 h-4 animate-spin" />جاري الإرسال...</>
              : <><Send className="w-4 h-4" />إرسال الإخطارات ({selectedInstructors.length})</>}
          </button>
        </div>
      </div>
    </div>
  );
}