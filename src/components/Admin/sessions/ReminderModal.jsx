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
  MapPin,
} from "lucide-react";
import ModalShell from "./ModalShell";

// ─────────────────────────────────────────────────────────────────────────────
// extractSessionShortName
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
// ✅ NEW: يدعم Offline (placeName, address, mapsLink, sessionLocationBlock)
// ✅ NEW: لو الطالب adults → guardian variables تطلع ""
// ─────────────────────────────────────────────────────────────────────────────
function buildVariables(student, session, dbVars = {}, options = {}) {
  if (!student) return {};

  const { isOffline = false, group = null } = options;

  const lang = (student.communicationPreferences?.preferredLanguage || "ar").toLowerCase();
  const gender = (student.personalInfo?.gender || "male").toLowerCase().trim();
  const relationship = (student.guardianInfo?.relationship || "father").toLowerCase().trim();
  const isMale = gender !== "female";
  const isFather = relationship !== "mother";
  const genderCtx = { studentGender: gender, guardianType: relationship };

  // ✅ هل الطالب بالغ؟
  const isAdult = student.studentType === "adults";

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
    resolveVar(dbVars, "salutation_en", "en", genderCtx) || "Dear";

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

  // ═══════════════════════════════════════════════════════════════════════
  // ✅ Offline Location — من الجروب أو من الـ session.group
  // ═══════════════════════════════════════════════════════════════════════
  const loc =
    group?.locationDetails ||
    session?.group?.locationDetails ||
    session?.locationDetails ||
    {};

  const groupLocation =
    group?.location ||
    session?.group?.location ||
    session?.location ||
    "";

  const placeName = loc.placeName || groupLocation || "";
  const address = loc.address || loc.extraDetails || "";

  let mapsLink = "";
  if (isOffline) {
    if (loc.lat != null && loc.lng != null) {
      mapsLink = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
    } else if (address) {
      mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    } else if (placeName) {
      mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}`;
    }
  }

  // ✅ Smart block (نفس اللي في الباك إند — عشان المعاينة تبقى مطابقة للرسالة الفعلية)
  const meetingLink = !isOffline ? (session?.meetingLink || "") : "";

  const sessionLocationBlock = isOffline
    ? [
        placeName && `📍 ${lang === "ar" ? "المكان" : "Location"}: ${placeName}`,
        address && `📌 ${lang === "ar" ? "العنوان" : "Address"}: ${address}`,
        mapsLink && `🗺️ ${lang === "ar" ? "اللوكيشن" : "Maps"}: ${mapsLink}`,
      ]
        .filter(Boolean)
        .join("\n")
    : meetingLink
      ? `🔗 ${lang === "ar" ? "رابط الحصة" : "Meeting Link"}: ${meetingLink}`
      : "";

  return {
    studentSalutation,
    studentSalutation_ar,
    studentSalutation_en,

    // ✅ Guardian — فاضية للطالب البالغ
    guardianSalutation: isAdult ? "" : guardianSalutation,
    guardianSalutation_ar: isAdult ? "" : guardianSalutation_ar,
    guardianSalutation_en: isAdult ? "" : guardianSalutation_en,

    salutation_ar: studentSalutation_ar,
    salutation_en: studentSalutation_en,

    salutation: isAdult ? studentSalutation : guardianSalutation,

    studentName: studentFirstName,
    studentFullName: student.personalInfo?.fullName || "",
    guardianName: isAdult ? "" : guardianFirstName,
    guardianFullName: isAdult ? "" : (student.guardianInfo?.name || ""),

    childTitle: isAdult ? "" : childTitle,

    sessionName: extractSessionShortName(session?.title) || "",
    date: sessionDate,
    time: `${session?.startTime || ""} - ${session?.endTime || ""}`,
    meetingLink,
    groupCode: session?.group?.code || session?.groupId?.code || "",
    groupName: session?.group?.name || session?.groupId?.name || "",
    enrollmentNumber: student.enrollmentNumber || "",

    // ✅ Offline — فاضية لو Online
    placeName: isOffline ? placeName : "",
    address: isOffline ? address : "",
    mapsLink: isOffline ? mapsLink : "",
    sessionLocationBlock,

    isAdult,
    isOffline,
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
// TONES
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

  // ═══════════════════════════════════════════════════════════════════════
  // ✅ NEW: Detect offline mode
  //    نعتمد على session.deliveryMode (Source of Truth بعد ما الجروب بيحطه)
  //    وبعدين session.group.deliveryMode كـ fallback
  // ═══════════════════════════════════════════════════════════════════════
  const isOffline =
    session?.deliveryMode === "offline" ||
    session?.group?.deliveryMode === "offline";

  // ✅ هل الطالب المختار بالغ؟
  const isAdultStudent = selectedStudentForPreview?.studentType === "adults";

  // ✅ الـ eventType اللي بنبعت بيه للـ templates API
  //    Online 24h → reminder_24h
  //    Online 1h  → reminder_1h  (الباك إند بيحولها لـ reminder_15min)
  //    Offline 24h → reminder_24h_offline
  //    Offline 1h  → reminder_30min_offline
  const templateEventType = useMemo(() => {
    if (isOffline) {
      return reminderType === "24hours"
        ? "reminder_24h_offline"
        : "reminder_30min_offline";
    }
    return reminderType === "24hours" ? "reminder_24h" : "reminder_1h";
  }, [isOffline, reminderType]);

  // ✅ نمط التذكير للعرض (24 ساعة / 30 دقيقة / 15 دقيقة)
  const reminderLabel = isOffline
    ? reminderType === "24hours"
      ? isRTL ? "تذكير 24 ساعة (Offline)" : "24h Location Reminder"
      : isRTL ? "تنبيه 30 دقيقة (Offline)" : "30min Drop-off Alert"
    : reminderType === "24hours"
      ? isRTL ? "تذكير قبل 24 ساعة" : "24-Hour Reminder"
      : isRTL ? "تذكير قبل 15 دقيقة" : "15-Minute Reminder";

  // ── Load DB vars ──────────────────────────────────────────────────────────
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

  // ── Click-outside for hints ───────────────────────────────────────────────
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

  // ── Select first student ──────────────────────────────────────────────────
  useEffect(() => {
    if (groupStudents.length > 0 && !selectedStudentForPreview) {
      setSelectedStudentForPreview(groupStudents[0]);
    }
  }, [groupStudents]);

  // ═══════════════════════════════════════════════════════════════════════
  // ✅ Fetch all templates
  //    - بيستخدم eventType الصح حسب Offline/Online
  //    - بيتخطى guardian للطالب البالغ
  //    - بيتخطى guardian للأوفلاين لو الطالب بالغ
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const fetchAllTemplates = async () => {
      if (!groupStudents.length) return;

      setLoadingTemplates(true);
      try {
        const results = await Promise.all(
          groupStudents.map(async (student) => {
            const res = await fetch(`/api/sessions/${session.id}/templates`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                eventType: templateEventType,
                studentId: student._id,
                extraData: {
                  meetingLink: session.meetingLink,
                  isOffline, // ✅ نمرر الحالة كـ hint للـ backend
                },
              }),
            });
            const json = await res.json();

            if (json.success) {
              const studentIsAdult = student.studentType === "adults";
              return {
                studentId: student._id,
                studentTemplate:
                  json.data.student?.rawContent || json.data.student?.content || "",
                // ✅ للطالب البالغ: منستخدمش قالب ولي الأمر خالص
                guardianTemplate: studentIsAdult
                  ? ""
                  : (json.data.guardian?.rawContent || json.data.guardian?.content || ""),
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
          setCurrentGuardianMessage(
            groupStudents[0].studentType === "adults"
              ? ""
              : (newGuardianTemplates[groupStudents[0]._id] || "")
          );
        }
      } catch (err) {
        console.error("Error fetching templates:", err);
        toast.error(isRTL ? "فشل تحميل القوالب" : "Failed to load templates");
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchAllTemplates();
  }, [
    groupStudents,
    reminderType,
    session.id,
    session.meetingLink,
    isRTL,
    templateEventType,
    isOffline,
  ]);

  // ═══════════════════════════════════════════════════════════════════════
  // ✅ Preview effect
  //    - للطالب البالغ: preview guardian يبقى فاضي
  //    - للأوفلاين: المتغيرات بتشمل placeName/address/mapsLink
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!selectedStudentForPreview) return;

    const vars = buildVariables(selectedStudentForPreview, session, dbVars, {
      isOffline,
      group: session?.group || null,
    });

    setPreviewStudentMessage(renderTemplate(currentStudentMessage, vars));

    if (isAdultStudent) {
      setPreviewGuardianMessage("");
    } else {
      setPreviewGuardianMessage(renderTemplate(currentGuardianMessage, vars));
    }
  }, [
    currentStudentMessage,
    currentGuardianMessage,
    selectedStudentForPreview,
    session,
    dbVars,
    isAdultStudent,
    isOffline,
  ]);

  // ═══════════════════════════════════════════════════════════════════════
  // ✅ Switch student
  // ═══════════════════════════════════════════════════════════════════════
  const handleSelectStudentForPreview = useCallback(
    (student) => {
      setSelectedStudentForPreview(student);
      setManuallyEdited({ student: false, guardian: false });

      const sid = student._id;
      const studentIsAdult = student.studentType === "adults";

      setCurrentStudentMessage(
        editedStudentTemplates[sid] ?? studentTemplates[sid] ?? ""
      );
      setCurrentGuardianMessage(
        studentIsAdult
          ? ""
          : (editedGuardianTemplates[sid] ?? guardianTemplates[sid] ?? "")
      );
    },
    [editedStudentTemplates, editedGuardianTemplates, studentTemplates, guardianTemplates]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // ✅ saveTemplateToDatabase
  //    - يختار الـ templateType الصح حسب:
  //      · Online vs Offline
  //      · kids vs adults (student)
  //      · 24h vs 30min/15min
  //    - بيمنع حفظ قالب guardian لو الطالب بالغ
  // ═══════════════════════════════════════════════════════════════════════
  const saveTemplateToDatabase = useCallback(
    async (type, content) => {
      if (!selectedStudentForPreview || !content?.trim()) return;

      // ✅ حماية: مفيش guardian save للطالب البالغ
      if (isAdultStudent && type === "guardian") return;

      setSavingTemplate((prev) => ({ ...prev, [type]: true }));

      try {
        // ✅ اختيار templateType + recipientType بالظبط زي ما الـ getTemplatesForEvent بيختار
        let templateType;
        let recipientType;

        if (type === "guardian") {
          recipientType = "guardian";
          if (isOffline) {
            templateType =
              reminderType === "24hours"
                ? "reminder_24h_offline_guardian"
                : "reminder_30min_offline_guardian";
          } else {
            templateType =
              reminderType === "24hours"
                ? "reminder_24h_guardian"
                : "reminder_15min_guardian";
          }
        } else {
          // Student
          recipientType = "student";
          if (isAdultStudent) {
            if (isOffline) {
              templateType =
                reminderType === "24hours"
                  ? "reminder_24h_offline_adult"
                  : "reminder_30min_offline_adult";
            } else {
              templateType =
                reminderType === "24hours"
                  ? "reminder_24h_adult"
                  : "reminder_15min_adult";
            }
          } else {
            if (isOffline) {
              templateType =
                reminderType === "24hours"
                  ? "reminder_24h_offline_student"
                  : "reminder_30min_offline_student";
            } else {
              templateType =
                reminderType === "24hours"
                  ? "reminder_24h_student"
                  : "reminder_15min_student";
            }
          }
        }

        const studentLang =
          selectedStudentForPreview.communicationPreferences?.preferredLanguage || "ar";

        const templateName = (() => {
          const modeAr = isOffline ? "Offline " : "";
          const typeAr = type === "student" ? "Student" : "Guardian";
          const reminderAr = reminderType === "24hours" ? "24h" : (isOffline ? "30min" : "15min");
          return `${reminderAr} ${modeAr}Reminder - ${typeAr}`;
        })();

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
          // ✅ Variables بتشمل offline لو محتاجين
          const variablesList = [
            { key: "studentSalutation", label: "Student Salutation" },
            { key: "studentSalutation_ar", label: "Student Salutation AR" },
            { key: "studentSalutation_en", label: "Student Salutation EN" },
            { key: "studentName", label: "Student Name" },
            { key: "sessionName", label: "Session Name" },
            { key: "date", label: "Date" },
            { key: "time", label: "Time" },
            { key: "enrollmentNumber", label: "Enrollment Number" },
          ];

          if (!isAdultStudent) {
            variablesList.push(
              { key: "guardianSalutation", label: "Guardian Salutation" },
              { key: "guardianSalutation_ar", label: "Guardian Salutation AR" },
              { key: "guardianSalutation_en", label: "Guardian Salutation EN" },
              { key: "guardianName", label: "Guardian Name" },
              { key: "childTitle", label: "Son/Daughter" },
            );
          }

          if (isOffline) {
            variablesList.push(
              { key: "placeName", label: "Location Name" },
              { key: "address", label: "Address" },
              { key: "mapsLink", label: "Maps Link" },
              { key: "sessionLocationBlock", label: "Location Block (auto)" },
            );
          } else {
            variablesList.push({ key: "meetingLink", label: "Meeting Link" });
          }

          const newTemplate = {
            templateType,
            recipientType,
            name: templateName,
            description: `${reminderType === "24hours" ? "24 hours" : (isOffline ? "30 minutes" : "15 minutes")} ${isOffline ? "offline " : ""}reminder for ${recipientType}`,
            isDefault: true,
            isActive: true,
            contentAr: studentLang === "ar" ? content : " ",
            contentEn: studentLang === "en" ? content : " ",
            variables: variablesList,
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
    [reminderType, selectedStudentForPreview, isRTL, isAdultStudent, isOffline]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // ✅ handleSend
  //    - بيبني studentMessages / guardianMessages بمتغيرات offline صح
  //    - بيتخطى guardian للطالب البالغ
  //    - بيمرر isOffline في الـ metadata
  // ═══════════════════════════════════════════════════════════════════════
  const handleSend = useCallback(async () => {
    setSending(true);
    try {
      const studentMessages = {};
      const guardianMessages = {};

      groupStudents.forEach((student) => {
        const sid = student._id.toString();
        const vars = buildVariables(student, session, dbVars, {
          isOffline,
          group: session?.group || null,
        });
        const studentIsAdult = student.studentType === "adults";

        const rawStudent = editedStudentTemplates[sid] ?? studentTemplates[sid] ?? "";
        const rawGuardian = studentIsAdult
          ? ""
          : (editedGuardianTemplates[sid] ?? guardianTemplates[sid] ?? "");

        studentMessages[sid] = renderTemplate(rawStudent, vars);

        if (!studentIsAdult) {
          guardianMessages[sid] = renderTemplate(rawGuardian, vars);
        }
      });

      const res = await fetch(`/api/sessions/${session.id}/send-reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reminderType,
          metadata: {
            studentMessages,
            guardianMessages,
            isOffline, // ✅ New flag للباك إند
          },
        }),
      });

      const json = await res.json();

      if (json.success) {
        toast.success(
          isRTL
            ? isOffline
              ? "تم إرسال التذكيرات (Offline) ✅"
              : "تم إرسال التذكيرات ✅"
            : isOffline
              ? "Offline reminders sent ✅"
              : "Reminders sent ✅"
        );
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
    isOffline,
  ]);

  // ═══════════════════════════════════════════════════════════════════════
  // ✅ getAvailableVariables — dynamic حسب isAdult + isOffline
  // ═══════════════════════════════════════════════════════════════════════
  const getAvailableVariables = useCallback(
    (isAdult) => {
      const studentVars = [
        { key: "{studentSalutation}", label: isRTL ? "تحية الطالب (حسب اللغة)" : "Student Salutation", icon: "👶" },
        { key: "{studentSalutation_ar}", label: isRTL ? "تحية الطالب - عربي" : "Student Salutation (AR)", icon: "👶" },
        { key: "{studentSalutation_en}", label: isRTL ? "تحية الطالب - إنجليزي" : "Student Salutation (EN)", icon: "👶" },
        { key: "{salutation_ar}", label: isRTL ? "التحية - عربي" : "Salutation (AR)", icon: "👋" },
        { key: "{salutation_en}", label: isRTL ? "التحية - إنجليزي" : "Salutation (EN)", icon: "👋" },
        { key: "{studentName}", label: isRTL ? "اسم الطالب" : "Student Name", icon: "👶" },
        { key: "{sessionName}", label: isRTL ? "اسم الجلسة" : "Session Name", icon: "📘" },
        { key: "{date}", label: isRTL ? "التاريخ" : "Date", icon: "📅" },
        { key: "{time}", label: isRTL ? "الوقت" : "Time", icon: "⏰" },
        { key: "{enrollmentNumber}", label: isRTL ? "الرقم التعريفي" : "Enrollment No.", icon: "🔢" },
      ];

      // ✅ Offline variables
      const offlineVars = [
        { key: "{placeName}", label: isRTL ? "اسم المكان" : "Location Name", icon: "📍" },
        { key: "{address}", label: isRTL ? "العنوان" : "Address", icon: "📌" },
        { key: "{mapsLink}", label: isRTL ? "رابط الخريطة" : "Maps Link", icon: "🗺️" },
        { key: "{sessionLocationBlock}", label: isRTL ? "بلوك الموقع (تلقائي)" : "Location Block (auto)", icon: "🧩" },
      ];

      // ✅ Online variables
      const onlineVars = [
        { key: "{meetingLink}", label: isRTL ? "رابط الاجتماع" : "Meeting Link", icon: "🔗" },
      ];

      // ✅ Guardian vars (for kids only)
      const guardianVars = [
        { key: "{guardianSalutation}", label: isRTL ? "تحية ولي الأمر (حسب اللغة)" : "Guardian Salutation", icon: "👤" },
        { key: "{guardianSalutation_ar}", label: isRTL ? "تحية ولي الأمر - عربي" : "Guardian Salutation (AR)", icon: "👤" },
        { key: "{guardianSalutation_en}", label: isRTL ? "تحية ولي الأمر - إنجليزي" : "Guardian Salutation (EN)", icon: "👤" },
        { key: "{salutation}", label: isRTL ? "التحية العامة (ولي الأمر)" : "Salutation (guardian alias)", icon: "👋" },
        { key: "{guardianName}", label: isRTL ? "اسم ولي الأمر" : "Guardian Name", icon: "👤" },
        { key: "{childTitle}", label: isRTL ? "ابنك/ابنتك" : "Son/Daughter", icon: "👪" },
      ];

      const locationVars = isOffline ? offlineVars : onlineVars;

      if (isAdult) {
        return [...studentVars, ...locationVars];
      }

      return [...studentVars, ...guardianVars, ...locationVars];
    },
    [isRTL, isOffline]
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
      const varsList = getAvailableVariables(isAdultStudent);

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedHintIndex((prev) => ({
          ...prev,
          [type]: (prev[type] + 1) % varsList.length,
        }));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedHintIndex((prev) => ({
          ...prev,
          [type]: (prev[type] - 1 + varsList.length) % varsList.length,
        }));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertVariable(type, varsList[selectedHintIndex[type]]);
      } else if (e.key === "Escape") {
        setShowHints((prev) => ({ ...prev, [type]: false }));
      }
    },
    [showHints, selectedHintIndex, getAvailableVariables, insertVariable, isAdultStudent]
  );

  // ✅ Salutation preview — بيستخدم buildVariables مع isOffline
  const salutationPreview = useMemo(() => {
    if (!selectedStudentForPreview) return null;
    return buildVariables(selectedStudentForPreview, session, dbVars, {
      isOffline,
      group: session?.group || null,
    });
  }, [selectedStudentForPreview, session, dbVars, isOffline]);

  // ── Hints dropdown ────────────────────────────────────────────────────────
  const renderHints = (type) => {
    if (!showHints[type]) return null;
    const c = TONES[type];
    const varsList = getAvailableVariables(isAdultStudent);
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
        {varsList.map((v, i) => (
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
      title={reminderLabel}
      subtitle={`${session?.title || ""} · ${new Date(session?.scheduledDate).toLocaleDateString(
        isRTL ? "ar-EG" : "en-US",
        { weekday: "short", year: "numeric", month: "short", day: "numeric" }
      )} · ${session?.startTime}`}
      headerBadge={
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
          {isOffline ? <MapPin className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
          {isOffline
            ? reminderType === "24hours" ? "24h 📍" : "30m 🚗"
            : reminderType === "24hours" ? "24h" : "15m"}
        </span>
      }
      footer={footer}
    >
      <div className="space-y-5">
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ✅ Offline Banner */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {isOffline && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-500/20 dark:bg-amber-500/10">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/20">
              <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900 dark:text-amber-300">
                📍 {isRTL ? "حصة Offline (حضورية)" : "Offline (On-site) Session"}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                {isRTL
                  ? "التذكير ده هيتبعت للطالب (وأولياء الأمور للأطفال) وفيه اسم المكان والعنوان ولينك الخريطة بدل رابط الميتنج."
                  : "The reminder will include the location name, address, and maps link instead of a meeting link."}
              </p>
            </div>
          </div>
        )}

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
              const isAdult = student.studentType === "adults";

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
                  <span>{isAdult ? "🧑" : gender === "female" ? "👧" : "👦"}</span>
                  <span>{student.personalInfo?.fullName?.split(" ")[0]}</span>
                  <span className="opacity-70">{lang === "ar" ? "🇸🇦" : "🇬🇧"}</span>
                  {!isAdult && (
                    <span className="opacity-70">{rel === "mother" ? "👩" : "👨"}</span>
                  )}
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

            {/* Guardian rows — للـ kids بس */}
            {!isAdultStudent && (
              <>
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
              </>
            )}

            {isAdultStudent && (
              <div className="flex items-center gap-2">
                <span className="w-28 shrink-0 font-medium text-indigo-600 dark:text-indigo-400">
                  🧑 {isRTL ? "نوع الطالب:" : "Type:"}
                </span>
                <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                  {isRTL ? "بالغ — بدون ولي أمر" : "Adult — No guardian"}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="w-28 shrink-0 font-medium text-amber-600 dark:text-amber-400">
                📘 {isRTL ? "اسم الجلسة:" : "Session:"}
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{salutationPreview.sessionName}</span>
            </div>

            {/* ✅ Offline location row */}
            {isOffline && (salutationPreview.placeName || salutationPreview.address) && (
              <div className="flex items-start gap-2 pt-1 border-t border-slate-100 dark:border-white/5">
                <span className="w-28 shrink-0 font-medium text-orange-600 dark:text-orange-400">
                  📍 {isRTL ? "المكان:" : "Location:"}
                </span>
                <div className="text-slate-700 dark:text-slate-200 space-y-0.5">
                  {salutationPreview.placeName && <p className="font-semibold">{salutationPreview.placeName}</p>}
                  {salutationPreview.address && <p className="text-[11px] opacity-80">{salutationPreview.address}</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Adult banner */}
        {isAdultStudent && (
          <div className="flex items-start gap-2.5 rounded-xl border border-indigo-200 bg-indigo-100/60 p-3.5 dark:border-indigo-500/20 dark:bg-indigo-500/10">
            <span className="text-lg shrink-0">🧑</span>
            <div className="text-xs text-indigo-800 dark:text-indigo-200">
              <p className="font-bold mb-0.5">
                {isRTL ? "الطالب بالغ (Adults)" : "Adult Student (Adults)"}
              </p>
              <p className="opacity-90 leading-relaxed">
                {isRTL
                  ? "هيتبعت تذكير للطالب بس — مفيش تذكير لولي الأمر لأنه طالب بالغ."
                  : "Only the student will get the reminder — no guardian reminder since the student is an adult."}
              </p>
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
            {!isAdultStudent && renderMessageEditor("guardian")}
          </div>
        )}
      </div>
    </ModalShell>
  );
}