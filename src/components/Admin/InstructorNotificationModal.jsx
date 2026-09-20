"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X, Send, Copy, AlertCircle, Users, Clock, Calendar,
  Eye, Zap, Loader2, MapPin,
} from "lucide-react";
import toast from "react-hot-toast";

// Overlay بيتعمل render في document.body عشان يملا الشاشة طول وعرض
// بغض النظر عن أي transform / filter / z-index في الـ layout بتاع الأدمن
function ModalOverlay({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // منع سكرول الصفحة اللي ورا المودال
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex h-[100dvh] w-screen items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      {children}
    </div>,
    document.body,
  );
}

// ✅ Helper: build maps link for offline
function buildMapsLink(groupData) {
  const loc = groupData?.locationDetails || {};
  if (loc.lat != null && loc.lng != null) {
    return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
  }
  if (loc.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`;
  }
  if (loc.placeName || groupData?.location) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.placeName || groupData.location)}`;
  }
  return "";
}

export default function InstructorNotificationModal({
  isOpen,
  onClose,
  instructors,
  groupData,
  onSendNotifications,
}) {
  const [messages, setMessages] = useState({});
  const [previewStates, setPreviewStates] = useState({});
  const [sending, setSending] = useState(false);
  const [selectedInstructors, setSelectedInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingVars, setLoadingVars] = useState(false);

  const [templateAr, setTemplateAr] = useState("");
  const [templateEn, setTemplateEn] = useState("");

  // instructorId → "ar" | "en"  (auto-detected, not toggled)
  const [instructorLanguages, setInstructorLanguages] = useState({});

  const [dbVars, setDbVars] = useState({});
  const [showHints, setShowHints] = useState({});
  const [selectedHintIndex, setSelectedHintIndex] = useState({});
  const [cursorPositions, setCursorPositions] = useState({});

  const textareaRefs = useRef({});
  const hintsRefs = useRef({});
  const saveTimer = useRef(null);
  const templateId = useRef(null);

  // ✅ NEW: detect offline — computed once per render
  const isOffline = groupData?.deliveryMode === "offline";

  // ── detect instructor language ──────────────────────────────────────────
  const detectLang = (instructor) =>
    instructor?.language === "en" ? "en" : "ar";

  // ── fetch DB variables ──────────────────────────────────────────────────
  const fetchDbVariables = async () => {
    setLoadingVars(true);
    try {
      const res = await fetch("/api/whatsapp/template-variables");
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

  // ═════════════════════════════════════════════════════════════════════════
  // ✅ buildReplacementsMap — بسيطة: كل حقل منفصل حسب الحالة
  // ═════════════════════════════════════════════════════════════════════════
  const buildReplacementsMap = useCallback(
    (instructor, lang = "ar") => {
      if (!instructor || !groupData) return {};

      const isAr = lang === "ar";
      const instructorGender = (instructor.gender || "male").toLowerCase();
      const genderCtx = { instructorGender };
      const nick = instructor.name?.split(" ")[0] || instructor.name || "";

      const greetingBase =
        resolveVar("salutation", lang, genderCtx) ||
        resolveVar("instructorSalutation", lang, genderCtx) ||
        (isAr ? "أهلا يا" : "Dear");

      const startDate = groupData.schedule?.startDate
        ? new Date(groupData.schedule.startDate).toLocaleDateString(
            isAr ? "ar-EG" : "en-US",
            { weekday: "long", year: "numeric", month: "long", day: "numeric" },
          )
        : "";

      // ✅ Location data (للقالب Offline)
      const loc = groupData?.locationDetails || {};
      const placeName = loc.placeName || groupData?.location || "";
      const address = loc.address || loc.extraDetails || "";
      const mapsLink = buildMapsLink(groupData);

      // ✅ Meeting link (للقالب Online)
      const meetingLink = groupData.firstMeetingLink || "";

      return {
        // ── Instructor ──────────────────────────────────────────────────
        "{salutation}":           `${greetingBase} ${nick}`,
        // ✅ alias — بعض القوالب بتستخدم instructorSalutation
        "{instructorSalutation}": `${greetingBase} ${nick}`,
        "{instructorName}":       nick,
        "{instructorFullName}":   instructor.name || "",
        "{instructorTitle}":
          resolveVar("instructorTitle", lang, genderCtx) ||
          (isAr ? "الأستاذ" : "Mr."),

        // ── Course / Group ──────────────────────────────────────────────
        "{courseName}":      groupData.courseSnapshot?.title || groupData.course?.title || "",
        "{groupName}":       groupData.name || "",
        "{groupCode}":       groupData.code || groupData.groupCode || "",
        "{startDate}":       startDate,
        "{timeFrom}":        groupData.schedule?.timeFrom || "",
        "{timeTo}":          groupData.schedule?.timeTo || "",
        "{studentCount}":    String(groupData.currentStudentsCount || groupData.studentsCount || 0),

        // ── Online ──────────────────────────────────────────────────────
        // ✅ الـ 2 keys بيرجعوا لنفس القيمة — القوالب المختلفة بتستخدم واحد منهم
        "{meetingLink}":      meetingLink,
        "{firstMeetingLink}": meetingLink,

        // ── Offline ─────────────────────────────────────────────────────
        "{placeName}":       placeName,
        "{address}":         address,
        "{mapsLink}":        mapsLink,

        // ── للـ makeup (للتوافق) ────────────────────────────────────────
        "{sessionLocationBlock}": isOffline
          ? [
              placeName && `📍 المكان: ${placeName}`,
              address && `📌 العنوان: ${address}`,
              mapsLink && `🗺️ اللوكيشن: ${mapsLink}`,
            ]
              .filter(Boolean)
              .join("\n")
          : (meetingLink
              ? (isAr ? `🔗 لينك الحصة:\n${meetingLink}` : `🔗 Meeting Link:\n${meetingLink}`)
              : (isAr ? "🔗 لينك الحصة: لم يُعيَّن بعد" : "🔗 Meeting Link: Not assigned yet")),
      };
    },
    [groupData, resolveVar, isOffline],
  );

  // ═════════════════════════════════════════════════════════════════════════
  // ✅ replaceVariables — استبدال بسيط بدون regex معقد
  // ═════════════════════════════════════════════════════════════════════════
  const replaceVariables = useCallback(
    (template, instructor, lang = "ar") => {
      if (!instructor || !groupData) return template;

      const map = buildReplacementsMap(instructor, lang);
      let result = template;

      for (const [key, value] of Object.entries(map)) {
        result = result.replace(
          new RegExp(key.replace(/[{}]/g, "\\$&"), "g"),
          () => value ?? "",
        );
      }

      // تنظيف السطور الفاضية المتكررة
      result = result.replace(/\n{3,}/g, "\n\n").trim();

      return result;
    },
    [buildReplacementsMap, groupData],
  );

  // ═════════════════════════════════════════════════════════════════════════
  // ✅ getVariableHints — بسيطة: حسب الحالة
  // ═════════════════════════════════════════════════════════════════════════
  const getVariableHints = useCallback(
    (instructor, lang = "ar") => {
      const map = buildReplacementsMap(instructor, lang);
      const isAr = lang === "ar";

      const base = [
        { key: "{salutation}",     label: isAr ? "التحية"          : "Salutation",      icon: "👋",  example: map["{salutation}"] },
        { key: "{instructorName}", label: isAr ? "اسم المدرب"      : "Instructor Name", icon: "👨‍🏫", example: map["{instructorName}"] },
        { key: "{courseName}",     label: isAr ? "اسم الكورس"       : "Course Name",     icon: "📚",  example: map["{courseName}"] },
        { key: "{groupName}",      label: isAr ? "اسم المجموعة"     : "Group Name",      icon: "👥",  example: map["{groupName}"] },
        { key: "{startDate}",      label: isAr ? "تاريخ البدء"      : "Start Date",      icon: "📅",  example: map["{startDate}"] },
        { key: "{timeFrom}",       label: isAr ? "وقت البداية"      : "Time From",       icon: "⏰",  example: map["{timeFrom}"] },
        { key: "{timeTo}",         label: isAr ? "وقت النهاية"      : "Time To",         icon: "⏰",  example: map["{timeTo}"] },
        { key: "{studentCount}",   label: isAr ? "عدد الطلاب"       : "Student Count",   icon: "👨‍🎓", example: map["{studentCount}"] },
      ];

      if (isOffline) {
        return [
          ...base,
          { key: "{placeName}", label: isAr ? "اسم المكان"  : "Location Name", icon: "📍", example: map["{placeName}"] || (isAr ? "غير محدد" : "Not set") },
          { key: "{address}",   label: isAr ? "العنوان"      : "Address",       icon: "📌", example: map["{address}"] || (isAr ? "غير محدد" : "Not set") },
          { key: "{mapsLink}",  label: isAr ? "رابط الخريطة" : "Maps Link",     icon: "🗺️", example: map["{mapsLink}"] || (isAr ? "غير متاح" : "Not available") },
        ];
      }

      return [
        ...base,
        { key: "{meetingLink}", label: isAr ? "لينك الحصة" : "Meeting Link", icon: "🔗", example: map["{meetingLink}"] || (isAr ? "لم يُعيَّن" : "Not set") },
      ];
    },
    [buildReplacementsMap, isOffline],
  );

  // ═════════════════════════════════════════════════════════════════════════
  // ✅ load template from API — حسب الحالة (Online/Offline)
  // ═════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!isOpen) return;

    const loadTemplate = async () => {
      setLoading(true);
      try {
        // ✅ اختيار القالب المناسب حسب نوع الجروب
        const templateType = isOffline
          ? "group_activation_offline"
          : "group_activation";

        const res = await fetch(
          `/api/whatsapp/instructor-templates?type=${templateType}`,
        );
        const data = await res.json();

        // ✅ الـ API بيرجع array أو object
        const list = Array.isArray(data.data)
          ? data.data
          : data.data
          ? [data.data]
          : [];

        // دور على القالب اللي بنفس النوع — وإلا استخدم أول واحد
        const match =
          list.find((t) => t.templateType === templateType) || list[0];

        if (match) {
          setTemplateAr(match.contentAr || match.content || "");
          setTemplateEn(match.contentEn || "");
          templateId.current = match._id;
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
  }, [isOpen, isOffline]);

  // ── init per-instructor state when templates + instructors are ready ────
  useEffect(() => {
    if (!instructors?.length || (!templateAr && !templateEn)) return;

    const msgs = {};
    const previews = {};
    const hints = {};
    const hintIdxs = {};
    const cursors = {};
    const langs = {};

    instructors.forEach((instructor) => {
      const id = instructor._id || instructor.id;
      const lang = detectLang(instructor);

      langs[id] = lang;
      msgs[id] = lang === "en" ? templateEn : templateAr;
      previews[id] = false;
      hints[id] = false;
      hintIdxs[id] = 0;
      cursors[id] = 0;

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

    const textBefore = value.substring(0, cursorPos);
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
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: templateId.current,
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
    const textarea = textareaRefs.current[id];
    const current = messages[id];
    const cursorPos = cursorPositions[id];
    const textBefore = current.substring(0, cursorPos);
    const lastAt = textBefore.lastIndexOf("@");

    let newValue, newCursor;
    if (lastAt !== -1) {
      newValue = current.substring(0, lastAt) + variable.key + current.substring(cursorPos);
      newCursor = lastAt + variable.key.length;
    } else {
      newValue = current.substring(0, cursorPos) + variable.key + current.substring(cursorPos);
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
    const lang = instructorLanguages[id] || "ar";
    const text = replaceVariables(messages[id], instructor, lang);
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
            message: replaceVariables(messages[id], instructor, lang),
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

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading || loadingVars) {
    return (
      <ModalOverlay>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-2xl">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-center mt-4 text-sm text-gray-500 dark:text-gray-400">جاري التحميل...</p>
        </div>
      </ModalOverlay>
    );
  }

  // ── Main ────────────────────────────────────────────────────────────────
  return (
    <ModalOverlay>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,.35)] max-w-4xl w-full max-h-[90vh] overflow-y-auto scroll-thin border border-gray-100 dark:border-gray-800">

        {/* Header */}
        <div
          className={`sticky top-0 z-10 text-white p-6 flex items-center justify-between overflow-hidden ${
            isOffline
              ? "bg-gradient-to-r from-emerald-600 via-emerald-600 to-emerald-700"
              : "bg-gradient-to-r from-primary via-primary to-primary/90"
          }`}
        >
          <div className="absolute -top-10 -end-10 w-40 h-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shadow-inner ring-1 ring-white/20">
              {isOffline ? <MapPin className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {isOffline ? "إخطار المدربين (أوفلاين)" : "إخطار المدربين"}
              </h2>
              <p className="text-sm text-white/80">
                {isOffline
                  ? "إخطار الحصة الأولى — مع معلومات المكان"
                  : "إخطار الحصة الأولى"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="relative p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Group info */}
          <div
            className={`border rounded-xl p-4 space-y-3 shadow-sm ${
              isOffline
                ? "bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-900/20 dark:to-teal-900/10 border-emerald-200 dark:border-emerald-800"
                : "bg-gradient-to-br from-blue-50 to-sky-50/50 dark:from-blue-900/20 dark:to-sky-900/10 border-blue-200 dark:border-blue-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm ${
                  isOffline ? "bg-gradient-to-br from-emerald-500 to-emerald-600" : "bg-gradient-to-br from-primary to-primary/80"
                }`}
              >
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
              <div className="flex items-center gap-2 bg-white/60 dark:bg-black/10 rounded-lg px-2.5 py-1.5">
                <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="truncate">
                  {groupData?.schedule?.startDate
                    ? new Date(groupData.schedule.startDate).toLocaleDateString("ar-EG")
                    : "N/A"}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-white/60 dark:bg-black/10 rounded-lg px-2.5 py-1.5">
                <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="truncate">{groupData?.schedule?.timeFrom} - {groupData?.schedule?.timeTo}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/60 dark:bg-black/10 rounded-lg px-2.5 py-1.5">
                <Users className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="truncate">{groupData?.currentStudentsCount || 0} طالب</span>
              </div>
            </div>

            {/* ✅ Online: meeting link | ✅ Offline: location info */}
            {!isOffline && (
              groupData?.firstMeetingLink ? (
                <div className="flex items-center gap-2 text-sm bg-white/60 dark:bg-black/10 rounded-lg px-3 py-2">
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
                  <span>لا يوجد لينك لأول سيشن — {"{meetingLink}"} ستظهر فارغة</span>
                </div>
              )
            )}

            {isOffline && (
              <div className="rounded-lg bg-white dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700 px-3 py-2 text-xs space-y-1 shadow-sm">
                <p className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  مكان الحصة (Offline)
                </p>
                {groupData?.locationDetails?.placeName && (
                  <p className="text-emerald-700 dark:text-emerald-400">
                    📍 <strong>{groupData.locationDetails.placeName}</strong>
                  </p>
                )}
                {groupData?.locationDetails?.address && (
                  <p className="text-emerald-700 dark:text-emerald-400">
                    📌 {groupData.locationDetails.address}
                  </p>
                )}
                {buildMapsLink(groupData) && (
                  <a
                    href={buildMapsLink(groupData)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    🗺️ عرض على الخريطة
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Instructor selection */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-200">اختر المدربين</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto scroll-thin pe-1">
              {instructors.map((instructor) => {
                const id = instructor._id || instructor.id;
                const isSelected = selectedInstructors.includes(id);
                const lang = detectLang(instructor);
                return (
                  <label
                    key={id}
                    className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? isOffline
                          ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/60 dark:bg-emerald-900/20 shadow-sm"
                          : "border-primary/40 bg-primary/5 dark:bg-primary/10 shadow-sm"
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleInstructor(id)}
                      className="w-4 h-4 text-primary rounded accent-primary"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{instructor.name}</p>
                        {instructor.gender && (
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                            {instructor.gender === "male" ? "👨 ذكر" : "👩 أنثى"}
                          </span>
                        )}
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                          {lang === "en" ? "🇬🇧 EN" : "🇸🇦 AR"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{instructor.email}</p>
                    </div>
                    {instructor.profile?.phone && (
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                        📱 {instructor.profile.phone}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Per-instructor message editors */}
          <div className="space-y-4 max-h-[600px] overflow-y-auto scroll-thin pe-1">
            {selectedInstructors.map((id) => {
              const instructor = instructors.find((i) => (i._id || i.id) === id);
              if (!instructor) return null;

              const lang = instructorLanguages[id] || "ar";
              const isAr = lang === "ar";
              const variables = getVariableHints(instructor, lang);
              const preview = replaceVariables(messages[id] || "", instructor, lang);

              return (
                <div
                  key={id}
                  className={`border rounded-xl p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow duration-300 ${
                    isOffline
                      ? "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800"
                      : "bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800"
                  }`}
                  dir={isAr ? "rtl" : "ltr"}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{instructor.name}</h4>
                      {instructor.gender && (
                        <span className="text-xs bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full shadow-sm">
                          {instructor.gender === "male" ? "👨" : "👩"}
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          isOffline
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                            : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                        }`}
                      >
                        {buildReplacementsMap(instructor, lang)["{salutation}"]}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          isAr
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        }`}
                      >
                        {isAr ? "🇸🇦 عربي" : "🇬🇧 English"}
                      </span>
                    </div>
                    <button
                      onClick={() => copyMessage(id)}
                      className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/60 dark:hover:bg-black/10 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      {isAr ? "نسخ" : "Copy"}
                    </button>
                  </div>

                  <div className="relative">
                    <textarea
                      ref={(el) => (textareaRefs.current[id] = el)}
                      value={messages[id] || ""}
                      onChange={(e) =>
                        handleMessageChange(id, e.target.value, e.target.selectionStart)
                      }
                      onKeyDown={(e) => handleKeyDown(e, id, variables)}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 dark:bg-gray-800 dark:text-white resize-none h-40 text-sm transition-shadow focus:shadow-md ${
                        isOffline
                          ? "border-emerald-200 dark:border-emerald-800 focus:ring-emerald-500"
                          : "border-purple-200 dark:border-purple-800 focus:ring-purple-500"
                      }`}
                      dir={isAr ? "rtl" : "ltr"}
                      placeholder={isAr ? "اكتب @ لإظهار المتغيرات..." : "Type @ to show variables..."}
                    />
                    {showHints[id] && (
                      <div
                        ref={(el) => (hintsRefs.current[id] = el)}
                        className={`absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border-2 rounded-lg shadow-2xl max-h-60 overflow-y-auto scroll-thin ${
                          isOffline
                            ? "border-emerald-300 dark:border-emerald-700"
                            : "border-purple-300 dark:border-purple-700"
                        }`}
                      >
                        <div
                          className={`p-2 border-b dark:border-gray-700 ${
                            isOffline
                              ? "bg-emerald-50 dark:bg-emerald-900/30"
                              : "bg-purple-50 dark:bg-purple-900/30"
                          }`}
                        >
                          <p
                            className={`text-xs font-semibold flex items-center gap-1 ${
                              isOffline
                                ? "text-emerald-700 dark:text-emerald-300"
                                : "text-purple-700 dark:text-purple-300"
                            }`}
                          >
                            <Zap className="w-3 h-3" />
                            {isAr ? "المتغيرات المتاحة" : "Available Variables"}
                          </p>
                        </div>
                        {variables.map((v, i) => (
                          <button
                            key={v.key}
                            type="button"
                            onClick={() => insertVariable(v, id)}
                            className={`w-full px-3 py-2 ${isAr ? "text-right" : "text-left"} flex items-start gap-2 transition-colors ${
                              i === selectedHintIndex[id]
                                ? isOffline
                                  ? "bg-emerald-100 dark:bg-emerald-900/40"
                                  : "bg-purple-100 dark:bg-purple-900/40"
                                : isOffline
                                ? "hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                : "hover:bg-purple-50 dark:hover:bg-purple-900/20"
                            }`}
                          >
                            <span className="text-lg">{v.icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span
                                  className={`text-sm font-mono ${
                                    isOffline
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-purple-600 dark:text-purple-400"
                                  }`}
                                >
                                  {v.key}
                                </span>
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  {v.label}
                                </span>
                              </div>
                              {v.example && (
                                <p
                                  className={`text-xs mt-1 px-2 py-0.5 rounded inline-block ${
                                    isOffline
                                      ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30"
                                      : "text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30"
                                  }`}
                                >
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

                  <button
                    onClick={() =>
                      setPreviewStates((prev) => ({ ...prev, [id]: !prev[id] }))
                    }
                    className={`text-xs hover:underline flex items-center gap-1 ${
                      isOffline
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-purple-600 dark:text-purple-400"
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    {previewStates[id]
                      ? isAr
                        ? "إخفاء المعاينة"
                        : "Hide Preview"
                      : isAr
                      ? "عرض المعاينة"
                      : "Show Preview"}
                  </button>
                  {previewStates[id] && (
                    <div
                      className={`mt-2 bg-white dark:bg-gray-800 p-4 rounded-lg border text-sm whitespace-pre-line max-h-48 overflow-y-auto scroll-thin shadow-inner ${
                        isOffline
                          ? "border-emerald-100 dark:border-emerald-900"
                          : "border-purple-100 dark:border-purple-900"
                      }`}
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
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={sending}
            className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm transition-all disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={handleSend}
            disabled={sending || selectedInstructors.length === 0}
            className={`flex-1 px-6 py-3 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold shadow-md active:scale-[0.98] ${
              isOffline
                ? "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 shadow-emerald-600/25 hover:shadow-lg"
                : "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-primary/25 hover:shadow-lg"
            }`}
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> إرسال الإخطارات ({selectedInstructors.length})
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .scroll-thin {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 0, 0, 0.18) transparent;
        }
        .scroll-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scroll-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scroll-thin::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.18);
          border-radius: 999px;
        }
        .scroll-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }
        :global(.dark) .scroll-thin {
          scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
        }
        :global(.dark) .scroll-thin::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.18);
        }
        :global(.dark) .scroll-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </ModalOverlay>
  );
}