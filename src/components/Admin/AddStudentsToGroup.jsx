// components/AddStudentsToGroup.jsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  UserPlus, Search, CheckCircle, AlertCircle, Users, Loader2, Eye, Zap
} from "lucide-react";
import toast from "react-hot-toast";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocale } from "@/app/context/LocaleContext";

export default function AddStudentsToGroup({ groupId, onClose, onStudentAdded }) {
  const { locale } = useLocale();
  const { t } = useI18n();

  const [students, setStudents] = useState([]);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  // ── رسائل الطالب وولي الأمر ──────────────────────────────────────────────
  const [studentMessage, setStudentMessage] = useState("");
  const [guardianMessage, setGuardianMessage] = useState("");
  const [moduleOverviewMessage, setModuleOverviewMessage] = useState("");

  // ── preview ──────────────────────────────────────────────────────────────
  const [studentPreview, setStudentPreview] = useState("");
  const [guardianPreview, setGuardianPreview] = useState("");
  const [moduleOverviewPreview, setModuleOverviewPreview] = useState("");

  // ── hints ────────────────────────────────────────────────────────────────
  const [showStudentHints, setShowStudentHints] = useState(false);
  const [showGuardianHints, setShowGuardianHints] = useState(false);
  const [showModuleOverviewHints, setShowModuleOverviewHints] = useState(false);
  const [selectedHintIndex, setSelectedHintIndex] = useState(0);

  // ── cursors ──────────────────────────────────────────────────────────────
  const [studentCursor, setStudentCursor] = useState(0);
  const [guardianCursor, setGuardianCursor] = useState(0);
  const [moduleOverviewCursor, setModuleOverviewCursor] = useState(0);

  // ── DB vars ──────────────────────────────────────────────────────────────
  const [dbVars, setDbVars] = useState({});
  const [loadingVars, setLoadingVars] = useState(false);

  // ✅ supervisorName gender option — "male" | "female"
  const [supervisorGender, setSupervisorGender] = useState("male");

  // ── templates ────────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState({
    studentMaleAr: "", studentMaleEn: "",
    studentFemaleAr: "", studentFemaleEn: "",
    guardianFatherAr: "", guardianFatherEn: "",
    guardianMotherAr: "", guardianMotherEn: "",
    moduleOverviewAr: "", moduleOverviewEn: "",
  });

  // ── refs ─────────────────────────────────────────────────────────────────
  const saveTimer = useRef(null);
  const templateId = useRef(null);
  const studentTextareaRef = useRef(null);
  const guardianTextareaRef = useRef(null);
  const moduleOverviewTextareaRef = useRef(null);
  const studentHintsRef = useRef(null);
  const guardianHintsRef = useRef(null);
  const moduleOverviewHintsRef = useRef(null);

  const isRTL = locale === "ar";

  // ─────────────────────────────────────────────────────────────────────────
  // Gender flags helper
  // ─────────────────────────────────────────────────────────────────────────
  const getGenderFlags = useCallback((student) => {
    if (!student) return { isMale: true, isFather: true };
    const gender = String(student.personalInfo?.gender || "Male").toLowerCase();
    const relationship = String(student.guardianInfo?.relationship || "father").toLowerCase();
    return {
      isMale: gender !== "female",
      isFather: relationship !== "mother",
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch DB variables
  // ─────────────────────────────────────────────────────────────────────────
  const fetchDbVariables = async () => {
    setLoadingVars(true);
    try {
      const res = await fetch("/api/whatsapp/template-variables");
      const data = await res.json();
      if (data.success && data.data) {
        const map = {};
        data.data.forEach(v => { map[v.key] = v; });
        setDbVars(map);
      }
    } catch (err) {
      console.error("❌ Error fetching template variables:", err);
    } finally {
      setLoadingVars(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // resolveVar — gender-aware value from DB variable object
  // ─────────────────────────────────────────────────────────────────────────
  const resolveVar = useCallback((key, lang = "ar", genderContext = {}) => {
    const v = dbVars[key];
    if (!v) return null;
    const { studentGender = "Male", guardianType = "father", instructorGender = "male" } = genderContext;
    const isMale = String(studentGender).toLowerCase() !== "female";
    const isFather = String(guardianType).toLowerCase() !== "mother";
    const isMaleInstructor = String(instructorGender).toLowerCase() !== "female";

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
      // ✅ instructor gender-aware
      if (v.genderType === "instructor") {
        return lang === "ar"
          ? (isMaleInstructor ? v.valueMaleAr : v.valueFemaleAr) || v.valueAr || null
          : (isMaleInstructor ? v.valueMaleEn : v.valueFemaleEn) || v.valueEn || null;
      }
    }
    return lang === "ar" ? v.valueAr || null : v.valueEn || null;
  }, [dbVars]);

  // ─────────────────────────────────────────────────────────────────────────
  // getStudentContext
  // ─────────────────────────────────────────────────────────────────────────
  const getStudentContext = useCallback(() => {
    if (!selectedStudent) return null;

    const lang = selectedStudent.communicationPreferences?.preferredLanguage || "ar";
    const studentGender = selectedStudent.personalInfo?.gender || "Male";
    const guardianType = selectedStudent.guardianInfo?.relationship || "father";
    // ✅ instructorGender من الـ state
    const genderCtx = { studentGender, guardianType, instructorGender: supervisorGender };
    const { isMale, isFather } = getGenderFlags(selectedStudent);

    const studentFullName = selectedStudent.personalInfo?.fullName || "";
    const guardianFullName = selectedStudent.guardianInfo?.name || "";

    const studentNickAr = selectedStudent.personalInfo?.nickname?.ar || studentFullName.split(" ")[0] || "الطالب";
    const studentNickEn = selectedStudent.personalInfo?.nickname?.en || studentFullName.split(" ")[0] || "Student";
    const guardianNickAr = selectedStudent.guardianInfo?.nickname?.ar || guardianFullName.split(" ")[0] || "ولي الأمر";
    const guardianNickEn = selectedStudent.guardianInfo?.nickname?.en || guardianFullName.split(" ")[0] || "Guardian";

    const studentNick = lang === "ar" ? studentNickAr : studentNickEn;
    const guardianNick = lang === "ar" ? guardianNickAr : guardianNickEn;

    const salutationBaseAr =
      resolveVar("salutation_ar", "ar", genderCtx) ||
      (isMale ? "عزيزي الطالب" : "عزيزتي الطالبة");
    const salutationBaseEn =
      resolveVar("salutation_en", "en", genderCtx) || "Dear student";
    const guardianSalutationBaseAr =
      resolveVar("guardianSalutation_ar", "ar", genderCtx) ||
      (isFather ? "عزيزي الأستاذ" : "عزيزتي السيدة");
    const guardianSalutationBaseEn =
      resolveVar("guardianSalutation_en", "en", genderCtx) ||
      (isFather ? "Dear Mr." : "Dear Mrs.");
    const childTitleAr =
      resolveVar("childTitle", "ar", genderCtx) || (isMale ? "ابنك" : "ابنتك");
    const childTitleEn =
      resolveVar("childTitle", "en", genderCtx) || (isMale ? "your son" : "your daughter");

    const childTitle = lang === "ar" ? childTitleAr : childTitleEn;

    const salutationAr = `${salutationBaseAr} ${studentNickAr}`;
    const salutationEn = `${salutationBaseEn} ${studentNickEn}`;
    const guardianSalutationAr = `${guardianSalutationBaseAr} ${guardianNickAr}`;
    const guardianSalutationEn = `${guardianSalutationBaseEn} ${guardianNickEn}`;

    const studentSalutation = lang === "ar" ? salutationAr : salutationEn;
    const guardianSalutation = lang === "ar" ? guardianSalutationAr : guardianSalutationEn;

    // ✅ supervisorName gender-aware من DB
    const supervisorNameValue =
      resolveVar("supervisorName", lang, genderCtx) || "";

    return {
      lang, studentGender, guardianType, isMale, isFather,
      studentNick, guardianNick, childTitle,
      studentSalutation, guardianSalutation,
      salutationAr, salutationEn,
      guardianSalutationAr, guardianSalutationEn,
      childTitleAr, childTitleEn,
      supervisorNameValue,
    };
  }, [selectedStudent, resolveVar, getGenderFlags, supervisorGender]);

  // ─────────────────────────────────────────────────────────────────────────
  // buildReplacementsMap
  // ─────────────────────────────────────────────────────────────────────────
  const buildReplacementsMap = useCallback((type) => {
    const ctx = getStudentContext();
    if (!ctx || !group) return {};

    const {
      lang, isMale, isFather,
      studentNick, guardianNick, childTitle,
      salutationAr, salutationEn,
      guardianSalutationAr, guardianSalutationEn,
      supervisorNameValue,
    } = ctx;

    const startDate = group.schedule?.startDate
      ? new Date(group.schedule.startDate).toLocaleDateString(
        lang === "ar" ? "ar-EG" : "en-US",
        { weekday: "long", year: "numeric", month: "long", day: "numeric" }
      )
      : "";

    const instructorNames = buildInstructorsNames(group.instructors, lang);
    const firstMeetingLink = group.firstMeetingLink || "";
    const courseName = group.courseSnapshot?.title || "";
    const groupName = group.name || "";
    const timeFrom = group.schedule?.timeFrom || "";
    const timeTo = group.schedule?.timeTo || "";
    const moduleTitle = group.courseSnapshot?.currentModuleTitle || group.courseSnapshot?.title || "";

    const common = {
      "{groupName}": groupName,
      "{courseName}": courseName,
      "{startDate}": startDate,
      "{timeFrom}": timeFrom,
      "{timeTo}": timeTo,
      "{instructor}": instructorNames,
      "{firstMeetingLink}": firstMeetingLink,
      "{moduleTitle}": moduleTitle,
      // ✅ supervisorName gender-aware
      "{supervisorName}": supervisorNameValue,
    };

    if (type === "student") {
      return {
        "{salutation_ar}": salutationAr || (isMale ? `عزيزي الطالب ${studentNick}` : `عزيزتي الطالبة ${studentNick}`),
        "{salutation_en}": salutationEn || `Dear student ${studentNick}`,
        "{studentName}": studentNick,
        ...common,
      };
    } else {
      // guardian + moduleOverview
      return {
        // ✅ إضافة {guardianSalutation} بدون suffix للتوافق مع template الـ MessageTemplate
        "{guardianSalutation}": lang === "ar" ? guardianSalutationAr : guardianSalutationEn,
        "{guardianSalutation_ar}": guardianSalutationAr || (isFather ? `عزيزي الأستاذ ${guardianNick}` : `عزيزتي السيدة ${guardianNick}`),
        "{guardianSalutation_en}": guardianSalutationEn || `${isFather ? "Dear Mr." : "Dear Mrs."} ${guardianNick}`,
        "{guardianName}": guardianNick,
        "{studentName}": studentNick,
        "{childTitle}": childTitle,
        ...common,
      };
    }
  }, [getStudentContext, group]);

  // ─────────────────────────────────────────────────────────────────────────
  // replaceVars
  // ─────────────────────────────────────────────────────────────────────────
  const replaceVars = useCallback((msg, type) => {
    if (!msg || !selectedStudent || !group) return msg || "";
    const map = buildReplacementsMap(type);
    let result = msg;
    for (const [key, value] of Object.entries(map)) {
      result = result.replace(
        new RegExp(key.replace(/[{}]/g, "\\$&"), "g"),
        value ?? ""
      );
    }
    return result;
  }, [selectedStudent, group, buildReplacementsMap]);

  // ─────────────────────────────────────────────────────────────────────────
  // Hint variable lists
  // ─────────────────────────────────────────────────────────────────────────
  const getStudentVariables = useCallback(() => {
    const ctx = getStudentContext();
    if (!ctx || !group) return [];
    const map = buildReplacementsMap("student");
    const lang = ctx.lang;
    return [
      { key: "{salutation_ar}", icon: "👋", label: lang === "ar" ? "تحية الطالب (عربي)" : "Student Salutation (AR)", example: map["{salutation_ar}"] },
      { key: "{salutation_en}", icon: "👋", label: lang === "ar" ? "تحية الطالب (إنجليزي)" : "Student Salutation (EN)", example: map["{salutation_en}"] },
      { key: "{studentName}", icon: "👤", label: lang === "ar" ? "اسم الطالب" : "Student Name", example: map["{studentName}"] },
      { key: "{groupName}", icon: "👥", label: lang === "ar" ? "اسم المجموعة" : "Group Name", example: map["{groupName}"] },
      { key: "{courseName}", icon: "📚", label: lang === "ar" ? "اسم الكورس" : "Course Name", example: map["{courseName}"] },
      { key: "{startDate}", icon: "📅", label: lang === "ar" ? "تاريخ البدء" : "Start Date", example: map["{startDate}"] },
      { key: "{timeFrom}", icon: "⏰", label: lang === "ar" ? "وقت البداية" : "Time From", example: map["{timeFrom}"] },
      { key: "{timeTo}", icon: "⏰", label: lang === "ar" ? "وقت النهاية" : "Time To", example: map["{timeTo}"] },
      { key: "{instructor}", icon: "👨‍🏫", label: lang === "ar" ? "المدرب/المدربين" : "Instructor(s)", example: map["{instructor}"] },
      { key: "{firstMeetingLink}", icon: "🔗", label: lang === "ar" ? "رابط الجلسة الأولى" : "First Session Link", example: map["{firstMeetingLink}"] || (lang === "ar" ? "سيُضاف قريباً" : "Coming soon") },
    ];
  }, [getStudentContext, buildReplacementsMap, group]);

  const getGuardianVariables = useCallback(() => {
    const ctx = getStudentContext();
    if (!ctx || !group) return [];
    const map = buildReplacementsMap("guardian");
    const lang = ctx.lang;
    return [
      { key: "{guardianSalutation}", icon: "👋", label: lang === "ar" ? "تحية ولي الأمر" : "Guardian Salutation", example: map["{guardianSalutation}"] },
      { key: "{guardianSalutation_ar}", icon: "👋", label: lang === "ar" ? "تحية ولي الأمر (عربي)" : "Guardian Salutation (AR)", example: map["{guardianSalutation_ar}"] },
      { key: "{guardianSalutation_en}", icon: "👋", label: lang === "ar" ? "تحية ولي الأمر (إنجليزي)" : "Guardian Salutation (EN)", example: map["{guardianSalutation_en}"] },
      { key: "{guardianName}", icon: "👤", label: lang === "ar" ? "اسم ولي الأمر" : "Guardian Name", example: map["{guardianName}"] },
      { key: "{studentName}", icon: "👶", label: lang === "ar" ? "اسم الطالب" : "Student Name", example: map["{studentName}"] },
      { key: "{childTitle}", icon: "👨‍👦", label: lang === "ar" ? "ابنك/ابنتك" : "Child Title", example: map["{childTitle}"] },
      { key: "{groupName}", icon: "👥", label: lang === "ar" ? "اسم المجموعة" : "Group Name", example: map["{groupName}"] },
      { key: "{courseName}", icon: "📚", label: lang === "ar" ? "اسم الكورس" : "Course Name", example: map["{courseName}"] },
      { key: "{startDate}", icon: "📅", label: lang === "ar" ? "تاريخ البدء" : "Start Date", example: map["{startDate}"] },
      { key: "{timeFrom}", icon: "⏰", label: lang === "ar" ? "وقت البداية" : "Time From", example: map["{timeFrom}"] },
      { key: "{timeTo}", icon: "⏰", label: lang === "ar" ? "وقت النهاية" : "Time To", example: map["{timeTo}"] },
      { key: "{instructor}", icon: "👨‍🏫", label: lang === "ar" ? "المدرب/المدربين" : "Instructor(s)", example: map["{instructor}"] },
      { key: "{firstMeetingLink}", icon: "🔗", label: lang === "ar" ? "رابط الجلسة الأولى" : "First Session Link", example: map["{firstMeetingLink}"] || (lang === "ar" ? "سيُضاف قريباً" : "Coming soon") },
      { key: "{moduleTitle}", icon: "📘", label: lang === "ar" ? "عنوان الموديول" : "Module Title", example: map["{moduleTitle}"] },
      { key: "{supervisorName}", icon: "🎓", label: lang === "ar" ? "اسم المشرف" : "Supervisor Name", example: map["{supervisorName}"] },
    ];
  }, [getStudentContext, buildReplacementsMap, group]);

  // ─────────────────────────────────────────────────────────────────────────
  // Helper: format instructor names
  // ─────────────────────────────────────────────────────────────────────────
  const buildInstructorsNames = (instructors, language = "ar") => {
    if (!instructors?.length) return "";
    const names = instructors.map(i => i.userId?.name || i.name).filter(Boolean);
    if (!names.length) return "";
    if (names.length === 1) return names[0];
    if (language === "ar") {
      return names.length === 2
        ? `${names[0]} و ${names[1]}`
        : names.slice(0, -1).join(" / ") + " / " + names.at(-1);
    }
    return names.length === 2
      ? `${names[0]} & ${names[1]}`
      : names.slice(0, -1).join(", ") + " & " + names.at(-1);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Pick the right template slot for the current student
  // ─────────────────────────────────────────────────────────────────────────
  const pickTemplateSlot = useCallback((student, type) => {
    if (!student) return { ar: "", en: "" };
    const { isMale, isFather } = getGenderFlags(student);
    if (type === "student") {
      return isMale
        ? { ar: templates.studentMaleAr, en: templates.studentMaleEn }
        : { ar: templates.studentFemaleAr, en: templates.studentFemaleEn };
    } else if (type === "guardian") {
      return isFather
        ? { ar: templates.guardianFatherAr, en: templates.guardianFatherEn }
        : { ar: templates.guardianMotherAr, en: templates.guardianMotherEn };
    } else {
      return { ar: templates.moduleOverviewAr, en: templates.moduleOverviewEn };
    }
  }, [templates, getGenderFlags]);

  // ─────────────────────────────────────────────────────────────────────────
  // Load group + students + templates
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!groupId) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const [groupRes, studentsRes, templateRes, moduleOverviewRes] = await Promise.all([
          fetch(`/api/groups/${groupId}`),
          fetch("/api/allStudents?status=Active"),
          fetch(`/api/whatsapp/group-templates?default=true&groupId=${groupId}`),
          fetch(`/api/whatsapp/message-templates?type=module_overview&default=true`),
        ]);

        const groupData = await groupRes.json();
        if (groupData.success) setGroup(groupData.data);

        const studentsData = await studentsRes.json();
        if (studentsData.success) {
          const groupStudentIds = (groupData.data?.students || []).map(s => String(s._id || s.id || s));
          setStudents(studentsData.data.filter(s => !groupStudentIds.includes(String(s._id || s.id))));
        }

        // ── GroupTemplate (رسالة الطالب + ولي الأمر) ─────────────────────────
        if (templateRes.ok) {
          const templateData = await templateRes.json();
          if (templateData.success && templateData.data) {
            const d = templateData.data;
            templateId.current = d._id;
            setTemplates({
              studentMaleAr: d.studentMaleContentAr || d.studentContentAr || "",
              studentMaleEn: d.studentMaleContentEn || d.studentContentEn || "",
              studentFemaleAr: d.studentFemaleContentAr || d.studentContentAr || "",
              studentFemaleEn: d.studentFemaleContentEn || d.studentContentEn || "",
              guardianFatherAr: d.guardianFatherContentAr || d.guardianContentAr || "",
              guardianFatherEn: d.guardianFatherContentEn || d.guardianContentEn || "",
              guardianMotherAr: d.guardianMotherContentAr || d.guardianContentAr || "",
              guardianMotherEn: d.guardianMotherContentEn || d.guardianContentEn || "",
              moduleOverviewAr: "",
              moduleOverviewEn: "",
            });
          }
        }

        // ── MessageTemplate (رسالة نظرة عامة على الموديول) ───────────────────
        if (moduleOverviewRes.ok) {
          const moData = await moduleOverviewRes.json();
          if (moData.success && moData.data?.length > 0) {
            const mo = moData.data[0];
            setTemplates(prev => ({
              ...prev,
              moduleOverviewAr: mo.contentAr || "",
              moduleOverviewEn: mo.contentEn || "",
            }));
          }
        }

      } catch (err) {
        console.error("Error loading:", err);
        toast.error("فشل تحميل البيانات");
      } finally {
        setLoading(false);
      }
    };
    loadData();
    fetchDbVariables();
  }, [groupId]);

  // ─────────────────────────────────────────────────────────────────────────
  // Load correct template slot when student is selected
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedStudent) return;
    const lang = selectedStudent.communicationPreferences?.preferredLanguage || "ar";

    const studentSlot = pickTemplateSlot(selectedStudent, "student");
    const guardianSlot = pickTemplateSlot(selectedStudent, "guardian");
    const moduleOverviewSlot = pickTemplateSlot(selectedStudent, "moduleOverview");

    setStudentMessage(lang === "ar" ? studentSlot.ar : studentSlot.en);
    setGuardianMessage(lang === "ar" ? guardianSlot.ar : guardianSlot.en);
    setModuleOverviewMessage(lang === "ar" ? moduleOverviewSlot.ar : moduleOverviewSlot.en);
  }, [selectedStudent, templates]);

  // ─────────────────────────────────────────────────────────────────────────
  // Live preview — يتحدث كمان لما supervisorGender يتغير
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedStudent && group) {
      setStudentPreview(replaceVars(studentMessage, "student"));
      setGuardianPreview(replaceVars(guardianMessage, "guardian"));
      setModuleOverviewPreview(replaceVars(moduleOverviewMessage, "guardian"));
    }
  }, [studentMessage, guardianMessage, moduleOverviewMessage, selectedStudent, group, replaceVars, supervisorGender]);

  // ─────────────────────────────────────────────────────────────────────────
  // Auto-save
  // ─────────────────────────────────────────────────────────────────────────
  const autoSave = useCallback((type, content) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!templateId.current || !selectedStudent) return;

      const lang = selectedStudent.communicationPreferences?.preferredLanguage || "ar";
      const { isMale, isFather } = getGenderFlags(selectedStudent);

      let fieldKey;
      if (type === "student") {
        if (isMale) fieldKey = lang === "ar" ? "studentMaleContentAr" : "studentMaleContentEn";
        else fieldKey = lang === "ar" ? "studentFemaleContentAr" : "studentFemaleContentEn";
      } else if (type === "guardian") {
        if (isFather) fieldKey = lang === "ar" ? "guardianFatherContentAr" : "guardianFatherContentEn";
        else fieldKey = lang === "ar" ? "guardianMotherContentAr" : "guardianMotherContentEn";
      } else {
        fieldKey = lang === "ar" ? "moduleOverviewContentAr" : "moduleOverviewContentEn";
      }

      try {
        await fetch("/api/whatsapp/group-templates", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: templateId.current, [fieldKey]: content, setAsDefault: true }),
        });
        console.log(`✅ Auto-saved ${fieldKey}`);
      } catch (err) {
        console.error("Save error:", err);
      }
    }, 3000);
  }, [selectedStudent, getGenderFlags]);

  // ─────────────────────────────────────────────────────────────────────────
  // insertVariable
  // ─────────────────────────────────────────────────────────────────────────
  const insertVariable = (variable, type) => {
    const textarea = type === "student"
      ? studentTextareaRef.current
      : type === "guardian"
        ? guardianTextareaRef.current
        : moduleOverviewTextareaRef.current;

    const currentValue = type === "student"
      ? studentMessage
      : type === "guardian"
        ? guardianMessage
        : moduleOverviewMessage;

    const cursorPos = type === "student"
      ? studentCursor
      : type === "guardian"
        ? guardianCursor
        : moduleOverviewCursor;

    const textBefore = currentValue.substring(0, cursorPos);
    const lastAt = textBefore.lastIndexOf("@");

    let newValue, newCursorPos;
    if (lastAt !== -1) {
      newValue = currentValue.substring(0, lastAt) + variable.key + currentValue.substring(cursorPos);
      newCursorPos = lastAt + variable.key.length;
    } else {
      newValue = currentValue.substring(0, cursorPos) + variable.key + currentValue.substring(cursorPos);
      newCursorPos = cursorPos + variable.key.length;
    }

    if (type === "student") {
      setStudentMessage(newValue); setShowStudentHints(false); setStudentCursor(newCursorPos);
    } else if (type === "guardian") {
      setGuardianMessage(newValue); setShowGuardianHints(false); setGuardianCursor(newCursorPos);
    } else {
      setModuleOverviewMessage(newValue); setShowModuleOverviewHints(false); setModuleOverviewCursor(newCursorPos);
    }

    autoSave(type, newValue);
    setTimeout(() => { textarea?.focus(); textarea?.setSelectionRange(newCursorPos, newCursorPos); }, 0);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Textarea handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleStudentMessageChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setStudentMessage(value);
    setStudentCursor(cursorPos);
    autoSave("student", value);
    const lastAt = value.substring(0, cursorPos).lastIndexOf("@");
    if (lastAt !== -1 && lastAt === cursorPos - 1) { setShowStudentHints(true); setSelectedHintIndex(0); }
    else if (lastAt === -1) setShowStudentHints(false);
  };

  const handleGuardianMessageChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setGuardianMessage(value);
    setGuardianCursor(cursorPos);
    autoSave("guardian", value);
    const lastAt = value.substring(0, cursorPos).lastIndexOf("@");
    if (lastAt !== -1 && lastAt === cursorPos - 1) { setShowGuardianHints(true); setSelectedHintIndex(0); }
    else if (lastAt === -1) setShowGuardianHints(false);
  };

  const handleModuleOverviewMessageChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setModuleOverviewMessage(value);
    setModuleOverviewCursor(cursorPos);
    autoSave("moduleOverview", value);
    const lastAt = value.substring(0, cursorPos).lastIndexOf("@");
    if (lastAt !== -1 && lastAt === cursorPos - 1) { setShowModuleOverviewHints(true); setSelectedHintIndex(0); }
    else if (lastAt === -1) setShowModuleOverviewHints(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Keyboard navigation for hints
  // ─────────────────────────────────────────────────────────────────────────
  const handleKeyDown = (e, type) => {
    const variables = type === "student" ? getStudentVariables() : getGuardianVariables();
    const show = type === "student"
      ? showStudentHints
      : type === "guardian"
        ? showGuardianHints
        : showModuleOverviewHints;
    if (!show) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedHintIndex(p => (p + 1) % variables.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedHintIndex(p => (p - 1 + variables.length) % variables.length); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertVariable(variables[selectedHintIndex], type); }
    else if (e.key === "Escape") {
      e.preventDefault();
      if (type === "student") setShowStudentHints(false);
      else if (type === "guardian") setShowGuardianHints(false);
      else setShowModuleOverviewHints(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Close hints on outside click
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (studentHintsRef.current && !studentHintsRef.current.contains(e.target)) setShowStudentHints(false);
      if (guardianHintsRef.current && !guardianHintsRef.current.contains(e.target)) setShowGuardianHints(false);
      if (moduleOverviewHintsRef.current && !moduleOverviewHintsRef.current.contains(e.target)) setShowModuleOverviewHints(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // handleAdd
  // ─────────────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!selectedStudent) { toast.error("اختر طالباً أولاً"); return; }
    setAdding(true);
    const loadingToast = toast.loading("جاري الإضافة...");

    const resolvedStudentMessage = replaceVars(studentMessage, "student");
    const resolvedGuardianMessage = replaceVars(guardianMessage, "guardian");
    const resolvedModuleOverviewMessage = replaceVars(moduleOverviewMessage, "guardian");

    try {
      const res = await fetch(`/api/groups/${groupId}/add-student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: String(selectedStudent._id || selectedStudent.id),
          studentMessage: resolvedStudentMessage,
          guardianMessage: resolvedGuardianMessage,
          moduleOverviewMessage: resolvedModuleOverviewMessage,
          sendWhatsApp: true,
        }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success("تم إضافة الطالب بنجاح", { id: loadingToast });
        setStudents(prev => prev.filter(s => String(s._id || s.id) !== String(selectedStudent._id || selectedStudent.id)));
        setSelectedStudent(null);
        if (onStudentAdded) onStudentAdded();
      } else {
        toast.error(result?.error || "فشلت الإضافة", { id: loadingToast });
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error("فشلت الإضافة", { id: loadingToast });
    } finally {
      setAdding(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Hints dropdown renderer
  // ─────────────────────────────────────────────────────────────────────────
  const renderHints = (vars, type, show, hintsRef, color) => {
    if (!show || !vars.length) return null;
    const lang = getStudentContext()?.lang || "ar";

    const c = color === "purple"
      ? { border: "border-purple-300 dark:border-purple-700", header: "bg-purple-50 dark:bg-purple-900/30 border-b dark:border-purple-800", text: "text-purple-700 dark:text-purple-300", hover: "hover:bg-purple-50 dark:hover:bg-purple-900/20", active: "bg-purple-100 dark:bg-purple-900/40", mono: "text-purple-600 dark:text-purple-400", example: "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" }
      : color === "green"
        ? { border: "border-green-300 dark:border-green-700", header: "bg-green-50 dark:bg-green-900/30 border-b dark:border-green-800", text: "text-green-700 dark:text-green-300", hover: "hover:bg-green-50 dark:hover:bg-green-900/20", active: "bg-green-100 dark:bg-green-900/40", mono: "text-green-600 dark:text-green-400", example: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300" }
        : { border: "border-blue-300 dark:border-blue-700", header: "bg-blue-50 dark:bg-blue-900/30 border-b dark:border-blue-800", text: "text-blue-700 dark:text-blue-300", hover: "hover:bg-blue-50 dark:hover:bg-blue-900/20", active: "bg-blue-100 dark:bg-blue-900/40", mono: "text-blue-600 dark:text-blue-400", example: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" };

    return (
      <div ref={hintsRef} className={`absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border-2 ${c.border} rounded-lg shadow-xl max-h-56 overflow-y-auto`}>
        <div className={`p-2 ${c.header}`}>
          <p className={`text-xs font-semibold ${c.text} flex items-center gap-1`}>
            <Zap className="w-3 h-3" />
            {lang === "ar" ? "المتغيرات المتاحة" : "Available Variables"}
          </p>
        </div>
        {vars.map((v, i) => (
          <button key={v.key} type="button" onClick={() => insertVariable(v, type)}
            className={`w-full px-3 py-2 ${lang === "ar" ? "text-right" : "text-left"} ${c.hover} flex items-start gap-2 ${i === selectedHintIndex ? c.active : ""}`}>
            <span className="shrink-0">{v.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm font-mono ${c.mono} shrink-0`}>{v.key}</span>
                <span className="text-xs text-gray-500 truncate">{v.label}</span>
              </div>
              {v.example && (
                <span className={`text-xs mt-0.5 px-2 py-0.5 rounded inline-block truncate max-w-full ${c.example}`}>
                  {v.example}
                </span>
              )}
            </div>
          </button>
        ))}
        <div className="p-2 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 text-xs text-gray-500">
          ↑ ↓ {lang === "ar" ? "للتنقل • Enter للإدراج • Esc للإغلاق" : "navigate • Enter insert • Esc close"}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Guards
  // ─────────────────────────────────────────────────────────────────────────
  if (loading || loadingVars) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p>المجموعة غير موجودة</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render values
  // ─────────────────────────────────────────────────────────────────────────
  const currentCount = group.currentStudentsCount || group.students?.length || 0;
  const maxStudents = group.maxStudents || 0;
  const isFull = currentCount >= maxStudents;

  const filteredStudents = students.filter(s => {
    const name = s.personalInfo?.fullName?.toLowerCase() || "";
    const email = s.personalInfo?.email?.toLowerCase() || "";
    return name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
  });

  const ctx = getStudentContext();
  const lang = ctx?.lang || "ar";
  const studentVars = getStudentVariables();
  const guardianVars = getGuardianVariables();

  const instructorNamesDisplay = buildInstructorsNames(group.instructors, locale === "ar" ? "ar" : "en");

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>

      {/* Group Info */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 rounded-lg border border-primary/20">
        <h3 className="text-xl font-bold mb-1">{group.name}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{group.courseSnapshot?.title} - {group.code}</p>
        {group.instructors?.length > 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            <span className="font-medium">👨‍🏫 {group.instructors.length > 1 ? "المدربون" : "المدرب"}:</span>{" "}
            <span className="text-primary font-medium">{instructorNamesDisplay}</span>
          </p>
        )}
        {group.firstMeetingLink && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            <span className="font-medium">🔗 رابط الجلسة الأولى:</span>{" "}
            <a href={group.firstMeetingLink} target="_blank" rel="noopener noreferrer"
              className="text-blue-500 underline truncate inline-block max-w-xs align-bottom">
              {group.firstMeetingLink}
            </a>
          </p>
        )}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div><div className="text-2xl font-bold text-primary">{currentCount}</div><div className="text-xs text-gray-500">الحالي</div></div>
          <div><div className="text-2xl font-bold text-gray-600">{maxStudents}</div><div className="text-xs text-gray-500">الأقصى</div></div>
          <div><div className="text-2xl font-bold text-green-600">{maxStudents - currentCount}</div><div className="text-xs text-gray-500">المتاح</div></div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
        <input type="text" placeholder="ابحث عن طالب..." value={search}
          onChange={e => setSearch(e.target.value)}
          className={`w-full ${isRTL ? "pr-10 pl-4" : "pl-10 pr-4"} py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white`} />
      </div>

      {/* Students List */}
      <div className="max-h-72 overflow-y-auto space-y-2 border border-gray-300 dark:border-gray-600 rounded-lg p-3">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">لا يوجد طلاب متاحين</p>
          </div>
        ) : (
          filteredStudents.map(student => {
            const sid = String(student._id || student.id);
            const isSelected = selectedStudent && String(selectedStudent._id || selectedStudent.id) === sid;
            const sLang = student.communicationPreferences?.preferredLanguage || "ar";
            const sGender = String(student.personalInfo?.gender || "Male").toLowerCase();
            const sRelation = String(student.guardianInfo?.relationship || "father").toLowerCase();

            return (
              <div key={sid} onClick={() => !isFull && setSelectedStudent(student)}
                className={`p-3 border rounded-lg cursor-pointer transition-all
                  ${isSelected ? "border-primary bg-primary/5 dark:bg-primary/10" : "border-gray-200 dark:border-gray-700 hover:border-primary/50"}
                  ${isFull ? "opacity-50 cursor-not-allowed" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm">{student.personalInfo?.fullName}</h4>
                      {isSelected && <CheckCircle className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-xs text-gray-500">{student.personalInfo?.email}</p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded ${sLang === "ar" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"}`}>
                        {sLang === "ar" ? "🇸🇦 عربي" : "🇬🇧 English"}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                        {sGender === "female" ? "👧 أنثى" : "👦 ذكر"}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                        {sRelation === "mother" ? "👩 أم" : sRelation === "father" ? "👨 أب" : "👤 ولي أمر"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Messages Section */}
      {selectedStudent && ctx && (
        <div className="space-y-4">

          {/* Info bar */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{selectedStudent.personalInfo?.fullName}</span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${lang === "ar" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                {lang === "ar" ? "🇸🇦 الرسائل بالعربية" : "🇬🇧 Messages in English"}
              </span>
              <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                {ctx.isMale ? "👦 ذكر" : "👧 أنثى"}
              </span>
              <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                {ctx.isFather ? "👨 أب" : "👩 أم"}
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-500 space-y-1">
              <p><span className="font-medium">{lang === "ar" ? "تحية الطالب: " : "Student greeting: "}</span><span className="text-primary">{ctx.studentSalutation}</span></p>
              <p><span className="font-medium">{lang === "ar" ? "تحية ولي الأمر: " : "Guardian greeting: "}</span><span className="text-primary">{ctx.guardianSalutation}</span></p>
              <p><span className="font-medium">{lang === "ar" ? "ابنك/ابنتك: " : "Child title: "}</span><span className="text-primary">{ctx.childTitle}</span></p>
              {group.instructors?.length > 0 && (
                <p><span className="font-medium">{group.instructors.length > 1 ? (lang === "ar" ? "المدربون: " : "Instructors: ") : (lang === "ar" ? "المدرب: " : "Instructor: ")}</span><span className="text-primary">{buildInstructorsNames(group.instructors, lang)}</span></p>
              )}
            </div>
          </div>

          {/* رسالة الطالب */}
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 bg-purple-500 text-white text-xs font-bold rounded-full flex items-center justify-center">1</span>
              <h4 className="text-sm font-bold text-purple-700 dark:text-purple-300">
                {lang === "ar" ? "رسالة الطالب" : "Student Message"} {ctx.isMale ? "👦" : "👧"}
              </h4>
            </div>
            <div className="relative">
              <textarea ref={studentTextareaRef} value={studentMessage}
                onChange={handleStudentMessageChange} onKeyDown={e => handleKeyDown(e, "student")}
                className="w-full px-4 py-3 border-2 border-purple-200 dark:border-purple-800 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white resize-none h-40 text-sm"
                dir={lang === "ar" ? "rtl" : "ltr"}
                placeholder={lang === "ar" ? "اكتب @ لإظهار المتغيرات..." : "Type @ to show variables..."} />
              {renderHints(studentVars, "student", showStudentHints, studentHintsRef, "purple")}
            </div>
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="w-3.5 h-3.5 text-purple-600" />
                <span className="text-xs text-purple-600 font-medium">{lang === "ar" ? "معاينة الرسالة" : "Message Preview"}</span>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-100 dark:border-purple-900 text-sm whitespace-pre-line max-h-32 overflow-y-auto" dir={lang === "ar" ? "rtl" : "ltr"}>
                {studentPreview || (lang === "ar" ? "لا توجد معاينة" : "No preview")}
              </div>
            </div>
          </div>

          {/* رسالة ولي الأمر */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">2</span>
              <h4 className="text-sm font-bold text-blue-700 dark:text-blue-300">
                {lang === "ar" ? "رسالة ولي الأمر" : "Guardian Message"} {ctx.isFather ? "👨‍👦" : "👩‍👦"}
              </h4>
            </div>
            <div className="relative">
              <textarea ref={guardianTextareaRef} value={guardianMessage}
                onChange={handleGuardianMessageChange} onKeyDown={e => handleKeyDown(e, "guardian")}
                className="w-full px-4 py-3 border-2 border-blue-200 dark:border-blue-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white resize-none h-40 text-sm"
                dir={lang === "ar" ? "rtl" : "ltr"}
                placeholder={lang === "ar" ? "اكتب @ لإظهار المتغيرات..." : "Type @ to show variables..."} />
              {renderHints(guardianVars, "guardian", showGuardianHints, guardianHintsRef, "blue")}
            </div>
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs text-blue-600 font-medium">{lang === "ar" ? "معاينة الرسالة" : "Message Preview"}</span>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-100 dark:border-blue-900 text-sm whitespace-pre-line max-h-32 overflow-y-auto" dir={lang === "ar" ? "rtl" : "ltr"}>
                {guardianPreview || (lang === "ar" ? "لا توجد معاينة" : "No preview")}
              </div>
            </div>
          </div>

          {/* رسالة نظرة عامة على الموديول */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 bg-green-500 text-white text-xs font-bold rounded-full flex items-center justify-center">3</span>
              <h4 className="text-sm font-bold text-green-700 dark:text-green-300">
                {lang === "ar" ? "رسالة نظرة عامة على الموديول" : "Module Overview Message"} 📚
              </h4>
              <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-full">
                {lang === "ar" ? "لولي الأمر" : "To Guardian"}
              </span>
            </div>

            {/* ✅ Supervisor Gender Selector */}
            <div className="mb-3 flex items-center gap-3 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 rounded-lg px-3 py-2">
              <span className="text-xs font-medium text-green-700 dark:text-green-300 shrink-0">
                🎓 {lang === "ar" ? "جنس المشرف ({supervisorName}):" : "Supervisor Gender ({supervisorName}):"}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSupervisorGender("male")}
                  className={`text-xs px-3 py-1 rounded-full border transition-all ${supervisorGender === "male"
                    ? "bg-green-500 text-white border-green-500"
                    : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-green-400"}`}>
                  👨 {lang === "ar" ? "ذكر" : "Male"}
                </button>
                <button
                  type="button"
                  onClick={() => setSupervisorGender("female")}
                  className={`text-xs px-3 py-1 rounded-full border transition-all ${supervisorGender === "female"
                    ? "bg-green-500 text-white border-green-500"
                    : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-green-400"}`}>
                  👩 {lang === "ar" ? "أنثى" : "Female"}
                </button>
              </div>
              {/* ✅ عرض القيمة الحالية من DB */}
              {ctx.supervisorNameValue && (
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                  → {ctx.supervisorNameValue}
                </span>
              )}
            </div>

            <div className="relative">
              <textarea
                ref={moduleOverviewTextareaRef}
                value={moduleOverviewMessage}
                onChange={handleModuleOverviewMessageChange}
                onKeyDown={e => handleKeyDown(e, "moduleOverview")}
                className="w-full px-4 py-3 border-2 border-green-200 dark:border-green-800 rounded-xl focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white resize-none h-40 text-sm"
                dir={lang === "ar" ? "rtl" : "ltr"}
                placeholder={lang === "ar" ? "اكتب @ لإظهار المتغيرات... (مثال: {guardianSalutation}, {moduleTitle}, {supervisorName})" : "Type @ to show variables... (e.g. {guardianSalutation}, {moduleTitle}, {supervisorName})"}
              />
              {renderHints(guardianVars, "moduleOverview", showModuleOverviewHints, moduleOverviewHintsRef, "green")}
            </div>
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs text-green-600 font-medium">{lang === "ar" ? "معاينة الرسالة" : "Message Preview"}</span>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-100 dark:border-green-900 text-sm whitespace-pre-line max-h-32 overflow-y-auto" dir={lang === "ar" ? "rtl" : "ltr"}>
                {moduleOverviewPreview || (lang === "ar" ? "لا توجد معاينة" : "No preview")}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button onClick={onClose} disabled={adding}
          className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50">
          إلغاء
        </button>
        <button onClick={handleAdd}
          disabled={!selectedStudent || !studentMessage.trim() || !guardianMessage.trim() || isFull || adding}
          className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-2">
          {adding
            ? <><Loader2 className="w-4 h-4 animate-spin" />جاري الإضافة...</>
            : <><UserPlus className="w-4 h-4" />إضافة الطالب</>}
        </button>
      </div>
    </div>
  );
}