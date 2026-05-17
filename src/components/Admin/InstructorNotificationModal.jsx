"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Send, Copy, AlertCircle, Users, Clock, Calendar,
  Eye, Zap, Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

export default function InstructorNotificationModal({
  isOpen,
  onClose,
  instructors,
  groupData,
  onSendNotifications,
}) {
  const [messages, setMessages]                     = useState({});
  const [previewStates, setPreviewStates]           = useState({});
  const [sending, setSending]                       = useState(false);
  const [selectedInstructors, setSelectedInstructors] = useState([]);
  const [loading, setLoading]                       = useState(true);
  const [loadingVars, setLoadingVars]               = useState(false);

  const [templateAr, setTemplateAr] = useState("");
  const [templateEn, setTemplateEn] = useState("");

  // instructorId → "ar" | "en"  (auto-detected, not toggled)
  const [instructorLanguages, setInstructorLanguages] = useState({});

  const [dbVars, setDbVars]                       = useState({});
  const [showHints, setShowHints]                 = useState({});
  const [selectedHintIndex, setSelectedHintIndex] = useState({});
  const [cursorPositions, setCursorPositions]     = useState({});

  const textareaRefs = useRef({});
  const hintsRefs    = useRef({});
  const saveTimer    = useRef(null);
  const templateId   = useRef(null);

  // ── detect instructor language ──────────────────────────────────────────
  const detectLang = (instructor) =>
    instructor?.language === "en" ? "en" : "ar";

  // ── fetch DB variables ──────────────────────────────────────────────────
  const fetchDbVariables = async () => {
    setLoadingVars(true);
    try {
      const res  = await fetch("/api/whatsapp/template-variables");
      const data = await res.json();
      if (data.success && data.data) {
        const map = {};
        data.data.forEach((v) => { map[v.key] = v; });
        setDbVars(map);
      }
    } catch (err) {
      console.error("❌ Error fetching template variables:", err);
    } finally {
      setLoadingVars(false);
    }
  };

  // ── resolve a DB variable (gender-aware) ────────────────────────────────
  const resolveVar = useCallback(
    (key, lang = "ar", genderContext = {}) => {
      const v = dbVars[key];
      if (!v) return null;
      const isMale = (genderContext.instructorGender ?? "male") === "male";
      if (v.hasGender && v.genderType === "instructor") {
        return lang === "ar"
          ? (isMale ? v.valueMaleAr : v.valueFemaleAr) || v.valueAr || ""
          : (isMale ? v.valueMaleEn : v.valueFemaleEn) || v.valueEn || "";
      }
      return lang === "ar" ? v.valueAr || "" : v.valueEn || "";
    },
    [dbVars],
  );

  // ── build replacement map for one instructor ────────────────────────────
  const buildReplacementsMap = useCallback(
    (instructor, lang = "ar") => {
      if (!instructor || !groupData) return {};

      const instructorGender = (instructor.gender || "male").toLowerCase();
      const genderCtx        = { instructorGender };
      const nick             = instructor.name?.split(" ")[0] || instructor.name || "";

      const greetingBase =
        resolveVar("salutation", lang, genderCtx) ||
        resolveVar("instructorSalutation", lang, genderCtx) ||
        (lang === "ar" ? "أهلا يا" : "Dear");

      const instructorTitle =
        resolveVar("instructorTitle", lang, genderCtx) ||
        (lang === "ar" ? "الأستاذ" : "Mr.");

      const startDate = groupData.schedule?.startDate
        ? new Date(groupData.schedule.startDate).toLocaleDateString(
            lang === "ar" ? "ar-EG" : "en-US",
            { weekday: "long", year: "numeric", month: "long", day: "numeric" },
          )
        : "";

      return {
        "{salutation}":          `${greetingBase} ${nick}`,
        "{instructorName}":      nick,
        "{instructorFullName}":  instructor.name || "",
        "{instructorTitle}":     instructorTitle,
        "{courseName}":          groupData.courseSnapshot?.title || groupData.course?.title || "",
        "{groupName}":           groupData.name || "",
        "{groupCode}":           groupData.code || groupData.groupCode || "",
        "{startDate}":           startDate,
        "{timeFrom}":            groupData.schedule?.timeFrom || "",
        "{timeTo}":              groupData.schedule?.timeTo   || "",
        "{studentCount}":        String(groupData.currentStudentsCount || groupData.studentsCount || 0),
        "{firstMeetingLink}":    groupData.firstMeetingLink || "",
      };
    },
    [groupData, resolveVar],
  );

  // ── replace variables in a template ────────────────────────────────────
  const replaceVariables = useCallback(
    (template, instructor, lang = "ar") => {
      if (!instructor || !groupData) return template;
      const map    = buildReplacementsMap(instructor, lang);
      let   result = template;
      for (const [key, value] of Object.entries(map)) {
        result = result.replace(
          new RegExp(key.replace(/[{}]/g, "\\$&"), "g"),
          value ?? "",
        );
      }
      return result;
    },
    [buildReplacementsMap, groupData],
  );

  // ── variable hints list ─────────────────────────────────────────────────
  const getVariableHints = useCallback(
    (instructor, lang = "ar") => {
      const map  = buildReplacementsMap(instructor, lang);
      const isAr = lang === "ar";
      return [
        { key: "{salutation}",         label: isAr ? "التحية"               : "Salutation",           icon: "👋", example: map["{salutation}"]         },
        { key: "{instructorName}",     label: isAr ? "اسم المدرب (مختصر)"  : "Instructor Name",      icon: "👨‍🏫", example: map["{instructorName}"]     },
        { key: "{instructorFullName}", label: isAr ? "الاسم الكامل"         : "Full Name",            icon: "👨‍🏫", example: map["{instructorFullName}"] },
        { key: "{instructorTitle}",    label: isAr ? "لقب المدرب"           : "Instructor Title",     icon: "🎓", example: map["{instructorTitle}"]    },
        { key: "{courseName}",         label: isAr ? "اسم الكورس"           : "Course Name",          icon: "📚", example: map["{courseName}"]         },
        { key: "{groupName}",          label: isAr ? "اسم المجموعة"         : "Group Name",           icon: "👥", example: map["{groupName}"]          },
        { key: "{groupCode}",          label: isAr ? "كود المجموعة"         : "Group Code",           icon: "🔤", example: map["{groupCode}"]          },
        { key: "{startDate}",          label: isAr ? "تاريخ البدء"          : "Start Date",           icon: "📅", example: map["{startDate}"]          },
        { key: "{timeFrom}",           label: isAr ? "وقت البداية"          : "Time From",            icon: "⏰", example: map["{timeFrom}"]           },
        { key: "{timeTo}",             label: isAr ? "وقت النهاية"          : "Time To",              icon: "⏰", example: map["{timeTo}"]             },
        { key: "{studentCount}",       label: isAr ? "عدد الطلاب"           : "Student Count",        icon: "👨‍🎓", example: map["{studentCount}"]       },
        { key: "{firstMeetingLink}",   label: isAr ? "لينك أول سيشن"        : "First Meeting Link",   icon: "🔗", example: map["{firstMeetingLink}"] || (isAr ? "لم يُعيَّن" : "Not set") },
      ];
    },
    [buildReplacementsMap],
  );

  // ── load template from API ──────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

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
      } catch (err) {
        console.error("Error loading template:", err);
        toast.error("فشل تحميل القالب");
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
    fetchDbVariables();
  }, [isOpen]);

  // ── init per-instructor state when templates + instructors are ready ────
  useEffect(() => {
    if (!instructors?.length || (!templateAr && !templateEn)) return;

    const msgs       = {};
    const previews   = {};
    const hints      = {};
    const hintIdxs   = {};
    const cursors    = {};
    const langs      = {};

    instructors.forEach((instructor) => {
      const id   = instructor._id || instructor.id;
      const lang = detectLang(instructor);

      langs[id]    = lang;
      msgs[id]     = lang === "en" ? templateEn : templateAr;
      previews[id] = false;
      hints[id]    = false;
      hintIdxs[id] = 0;
      cursors[id]  = 0;

      setSelectedInstructors((prev) =>
        prev.includes(id) ? prev : [...prev, id],
      );
    });

    setInstructorLanguages(langs);
    setMessages(msgs);
    setPreviewStates(previews);
    setShowHints(hints);
    setSelectedHintIndex(hintIdxs);
    setCursorPositions(cursors);
  }, [instructors, templateAr, templateEn]);

  // ── message change ──────────────────────────────────────────────────────
  const handleMessageChange = (id, value, cursorPos) => {
    setMessages((prev) => ({ ...prev, [id]: value }));
    setCursorPositions((prev) => ({ ...prev, [id]: cursorPos }));

    const textBefore  = value.substring(0, cursorPos);
    const lastAtIndex = textBefore.lastIndexOf("@");

    if (lastAtIndex !== -1 && lastAtIndex === cursorPos - 1) {
      setShowHints((prev) => ({ ...prev, [id]: true }));
      setSelectedHintIndex((prev) => ({ ...prev, [id]: 0 }));
    } else if (lastAtIndex === -1) {
      setShowHints((prev) => ({ ...prev, [id]: false }));
    }

    autoSave(id, value);
  };

  // ── auto-save ───────────────────────────────────────────────────────────
  const autoSave = (id, content) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!templateId.current) return;
      const lang = instructorLanguages[id];
      try {
        await fetch("/api/whatsapp/instructor-templates", {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id:        templateId.current,
            [lang === "en" ? "contentEn" : "contentAr"]: content,
            setAsDefault: true,
          }),
        });
      } catch (err) {
        console.error("Save error:", err);
      }
    }, 3000);
  };

  // ── insert variable at cursor ───────────────────────────────────────────
  const insertVariable = (variable, id) => {
    const textarea    = textareaRefs.current[id];
    const current     = messages[id];
    const cursorPos   = cursorPositions[id];
    const textBefore  = current.substring(0, cursorPos);
    const lastAt      = textBefore.lastIndexOf("@");

    let newValue, newCursor;
    if (lastAt !== -1) {
      newValue  = current.substring(0, lastAt) + variable.key + current.substring(cursorPos);
      newCursor = lastAt + variable.key.length;
    } else {
      newValue  = current.substring(0, cursorPos) + variable.key + current.substring(cursorPos);
      newCursor = cursorPos + variable.key.length;
    }

    setMessages((prev) => ({ ...prev, [id]: newValue }));
    setShowHints((prev) => ({ ...prev, [id]: false }));
    setCursorPositions((prev) => ({ ...prev, [id]: newCursor }));
    autoSave(id, newValue);

    setTimeout(() => {
      textarea?.focus();
      textarea?.setSelectionRange(newCursor, newCursor);
    }, 0);
  };

  // ── keyboard navigation in hints ────────────────────────────────────────
  const handleKeyDown = (e, id, variables) => {
    if (!showHints[id]) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedHintIndex((prev) => ({ ...prev, [id]: (prev[id] + 1) % variables.length }));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedHintIndex((prev) => ({ ...prev, [id]: (prev[id] - 1 + variables.length) % variables.length }));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertVariable(variables[selectedHintIndex[id]], id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowHints((prev) => ({ ...prev, [id]: false }));
    }
  };

  // ── close hints on outside click ────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      Object.keys(hintsRefs.current).forEach((id) => {
        if (hintsRefs.current[id] && !hintsRefs.current[id].contains(e.target))
          setShowHints((prev) => ({ ...prev, [id]: false }));
      });
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleInstructor = (id) =>
    setSelectedInstructors((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const copyMessage = (id) => {
    const instructor = instructors.find((i) => (i._id || i.id) === id);
    const lang       = instructorLanguages[id] || "ar";
    const text       = replaceVariables(messages[id], instructor, lang);
    navigator.clipboard.writeText(text);
    toast.success(lang === "ar" ? "تم النسخ!" : "Copied!");
  };

  const handleSend = async () => {
    if (selectedInstructors.length === 0) {
      toast.error("اختر مدرباً واحداً على الأقل");
      return;
    }
    setSending(true);
    const toastId = toast.loading("جاري الإرسال...");
    try {
      const instructorMessages = {};
      for (const id of selectedInstructors) {
        const instructor = instructors.find((i) => (i._id || i.id) === id);
        if (instructor) {
          const lang = instructorLanguages[id] || "ar";
          instructorMessages[id] = {
            message:  replaceVariables(messages[id], instructor, lang),
            language: lang,
          };
        }
      }
      await onSendNotifications(instructorMessages);
      toast.success("تم الإرسال بنجاح!", { id: toastId });
      onClose();
    } catch (err) {
      toast.error(err.message || "فشل الإرسال", { id: toastId });
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-darkmode rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary to-primary/90 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">إخطار المدربين</h2>
              <p className="text-sm text-white/80">إخطار الحصة الأولى</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Group info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white text-sm font-bold">
                {groupData?.name?.slice(0, 2)}
              </div>
              <div>
                <h3 className="font-semibold">{groupData?.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {groupData?.courseSnapshot?.title || groupData?.course?.title}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>
                  {groupData?.schedule?.startDate
                    ? new Date(groupData.schedule.startDate).toLocaleDateString("ar-EG")
                    : "N/A"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>{groupData?.schedule?.timeFrom} - {groupData?.schedule?.timeTo}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span>{groupData?.currentStudentsCount || 0} طالب</span>
              </div>
            </div>
            {groupData?.firstMeetingLink ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">🔗 لينك أول سيشن:</span>
                <a
                  href={groupData.firstMeetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate max-w-xs"
                >
                  {groupData.firstMeetingLink}
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>لا يوجد لينك لأول سيشن — {"{firstMeetingLink}"} ستظهر فارغة</span>
              </div>
            )}
          </div>

          {/* Instructor selection */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">اختر المدربين</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {instructors.map((instructor) => {
                const id         = instructor._id || instructor.id;
                const isSelected = selectedInstructors.includes(id);
                const lang       = detectLang(instructor);
                return (
                  <label
                    key={id}
                    className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleInstructor(id)}
                      className="w-4 h-4 text-primary rounded"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{instructor.name}</p>
                        {instructor.gender && (
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                            {instructor.gender === "male" ? "👨 ذكر" : "👩 أنثى"}
                          </span>
                        )}
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                          {lang === "en" ? "🇬🇧 EN" : "🇸🇦 AR"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{instructor.email}</p>
                    </div>
                    {instructor.profile?.phone && (
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                        📱 {instructor.profile.phone}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Per-instructor message editors */}
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {selectedInstructors.map((id) => {
              const instructor = instructors.find((i) => (i._id || i.id) === id);
              if (!instructor) return null;

              const lang      = instructorLanguages[id] || "ar";
              const isAr      = lang === "ar";
              const variables = getVariableHints(instructor, lang);
              const preview   = replaceVariables(messages[id] || "", instructor, lang);

              return (
                <div
                  key={id}
                  className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 space-y-3"
                  dir={isAr ? "rtl" : "ltr"}
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{instructor.name}</h4>
                      {instructor.gender && (
                        <span className="text-xs bg-white dark:bg-gray-800 px-2 py-0.5 rounded">
                          {instructor.gender === "male" ? "👨" : "👩"}
                        </span>
                      )}
                      <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                        {buildReplacementsMap(instructor, lang)["{salutation}"]}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isAr ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"}`}>
                        {isAr ? "🇸🇦 عربي" : "🇬🇧 English"}
                      </span>
                    </div>
                    <button
                      onClick={() => copyMessage(id)}
                      className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      {isAr ? "نسخ" : "Copy"}
                    </button>
                  </div>

                  {/* Textarea + hints */}
                  <div className="relative">
                    <textarea
                      ref={(el) => (textareaRefs.current[id] = el)}
                      value={messages[id] || ""}
                      onChange={(e) =>
                        handleMessageChange(id, e.target.value, e.target.selectionStart)
                      }
                      onKeyDown={(e) => handleKeyDown(e, id, variables)}
                      className="w-full px-4 py-3 border-2 border-purple-200 dark:border-purple-800 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white resize-none h-40 text-sm"
                      dir={isAr ? "rtl" : "ltr"}
                      placeholder={isAr ? "اكتب @ لإظهار المتغيرات..." : "Type @ to show variables..."}
                    />
                    {showHints[id] && (
                      <div
                        ref={(el) => (hintsRefs.current[id] = el)}
                        className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border-2 border-purple-300 dark:border-purple-700 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                      >
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/30 border-b dark:border-purple-800">
                          <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {isAr ? "المتغيرات المتاحة" : "Available Variables"}
                          </p>
                        </div>
                        {variables.map((v, i) => (
                          <button
                            key={v.key}
                            type="button"
                            onClick={() => insertVariable(v, id)}
                            className={`w-full px-3 py-2 ${isAr ? "text-right" : "text-left"} hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-start gap-2 ${i === selectedHintIndex[id] ? "bg-purple-100 dark:bg-purple-900/40" : ""}`}
                          >
                            <span className="text-lg">{v.icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-mono text-purple-600 dark:text-purple-400">{v.key}</span>
                                <span className="text-xs text-gray-600 dark:text-gray-400">{v.label}</span>
                              </div>
                              {v.example && (
                                <p className="text-xs text-purple-700 dark:text-purple-300 mt-1 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded inline-block">
                                  {v.example}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 text-xs text-gray-500">
                          ↑ ↓ {isAr ? "للتنقل • Enter للإدراج • Esc للإغلاق" : "to navigate • Enter to insert • Esc to close"}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Preview */}
                  <button
                    onClick={() =>
                      setPreviewStates((prev) => ({ ...prev, [id]: !prev[id] }))
                    }
                    className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    {previewStates[id]
                      ? (isAr ? "إخفاء المعاينة" : "Hide Preview")
                      : (isAr ? "عرض المعاينة"  : "Show Preview")}
                  </button>
                  {previewStates[id] && (
                    <div
                      className="mt-2 bg-white dark:bg-gray-800 p-4 rounded-lg border border-purple-100 dark:border-purple-900 text-sm whitespace-pre-line max-h-48 overflow-y-auto"
                      dir={isAr ? "rtl" : "ltr"}
                    >
                      {preview}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-darkmode border-t border-gray-200 dark:border-gray-700 p-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={sending}
            className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={handleSend}
            disabled={sending || selectedInstructors.length === 0}
            className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
          >
            {sending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</>
            ) : (
              <><Send className="w-4 h-4" /> إرسال الإخطارات ({selectedInstructors.length})</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}