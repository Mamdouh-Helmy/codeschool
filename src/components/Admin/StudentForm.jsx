"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  User, Mail, Phone, Calendar, Users, BookOpen, Globe, Save, X,
  ChevronDown, Search, Plus, CheckCircle, Lock, Shield, Home,
  MessageCircle, Bell, GlobeIcon, Hash, AlertCircle, Info,
  UserCircle, Languages, Sparkles, MessageSquare, RefreshCw,
  Eye, Zap, Loader2, Database, MapPin, Smartphone,
  ChevronLeft, ChevronRight, ArrowRight, ArrowLeft
} from "lucide-react";
import toast from "react-hot-toast";
import { useI18n } from "@/i18n/I18nProvider";

// ─── Step config ────────────────────────────────────────────────────────────
const STEPS = [
  { id: "account",     label_ar: "الحساب",    icon: User          },
  { id: "personal",    label_ar: "البيانات",   icon: UserCircle    },
  { id: "contact",     label_ar: "التواصل",   icon: Phone         },
  { id: "guardian",    label_ar: "ولي الأمر", icon: Users         },
  { id: "enrollment",  label_ar: "البرنامج",  icon: BookOpen      },
  { id: "preferences", label_ar: "المستندات", icon: Globe         },
  { id: "messages",    label_ar: "التأكيد",   icon: MessageCircle },
];

// ─── Shared input styles ────────────────────────────────────────────────────
const inputBase =
  "w-full px-4 py-3 border border-gray-200 dark:border-dark_border rounded-xl " +
  "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary " +
  "dark:bg-dark_input dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 " +
  "text-sm transition-all bg-white text-gray-800 disabled:opacity-60 disabled:cursor-not-allowed";

const labelBase =
  "block text-sm font-semibold text-gray-800 dark:text-white mb-2 text-right";

const selectBase =
  "w-full px-4 py-3 border border-gray-200 dark:border-dark_border rounded-xl " +
  "dark:bg-dark_input dark:text-white text-sm focus:outline-none " +
  "focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-800 appearance-none";

// ─── Helper: parse DOB from ISO string into {day, month, year} ──────────────
function parseDOB(raw) {
  if (!raw) return { day: "", month: "", year: "" };
  // handle "YYYY-MM-DD" or full ISO
  const date = new Date(raw);
  if (isNaN(date.getTime())) return { day: "", month: "", year: "" };
  return {
    day:   String(date.getUTCDate()).padStart(2, "0"),
    month: String(date.getUTCMonth() + 1).padStart(2, "0"),
    year:  String(date.getUTCFullYear()),
  };
}

// ─── Helper: normalize gender to "Male" | "Female" | "" ────────────────────
function normalizeGenderDisplay(raw) {
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower === "male")   return "Male";
  if (lower === "female") return "Female";
  return "";
}

export default function StudentForm({ initial, onClose, onSaved }) {
  const { t, locale } = useI18n();
  const isRtl = locale === "ar";

  // ── step ────────────────────────────────────────────────────────────────
  const [step,    setStep]    = useState(0);
  const [animDir, setAnimDir] = useState(1);
  const [visible, setVisible] = useState(true);

  const goTo = (next) => {
    if (next === step) return;
    setAnimDir(next > step ? 1 : -1);
    setVisible(false);
    setTimeout(() => { setStep(next); setVisible(true); }, 180);
  };
  const next = () => goTo(Math.min(step + 1, STEPS.length - 1));
  const prev = () => goTo(Math.max(step - 1, 0));

  // ── DOB — stored separately so partial edits don't break the ISO string ─
  const [dob, setDob] = useState(() => parseDOB(initial?.personalInfo?.dateOfBirth));

  // sync DOB → form.personalInfo.dateOfBirth
  const dobToISO = ({ day, month, year }) => {
    if (!day || !month || !year || year.length < 4) return "";
    const d = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T12:00:00`);
    return isNaN(d.getTime()) ? "" : d.toISOString();
  };

  // ── form state ───────────────────────────────────────────────────────────
  const [form, setForm] = useState(() => ({
    authUserId: initial?.authUserId?._id || "",
    personalInfo: {
      fullName:       initial?.personalInfo?.fullName                   || "",
      nickname:       {
        ar: initial?.personalInfo?.nickname?.ar || "",
        en: initial?.personalInfo?.nickname?.en || "",
      },
      email:          initial?.personalInfo?.email                      || "",
      phone:          initial?.personalInfo?.phone                      || "",
      whatsappNumber: initial?.personalInfo?.whatsappNumber             || "",
      // stored as ISO; computed from dob state on submit
      dateOfBirth:    initial?.personalInfo?.dateOfBirth                || "",
      // ✅ FIX: normalize gender so "Male"/"male"/"Female"/"female" all work
      gender:         normalizeGenderDisplay(initial?.personalInfo?.gender),
      nationalId:     initial?.personalInfo?.nationalId                 || "",
      address: {
        street:     initial?.personalInfo?.address?.street     || "",
        city:       initial?.personalInfo?.address?.city       || "",
        state:      initial?.personalInfo?.address?.state      || "",
        postalCode: initial?.personalInfo?.address?.postalCode || "",
        country:    initial?.personalInfo?.address?.country    || "",
      },
    },
    guardianInfo: {
      name:           initial?.guardianInfo?.name                       || "",
      nickname:       {
        ar: initial?.guardianInfo?.nickname?.ar || "",
        en: initial?.guardianInfo?.nickname?.en || "",
      },
      relationship:   initial?.guardianInfo?.relationship               || "father",
      phone:          initial?.guardianInfo?.phone                      || "",
      whatsappNumber: initial?.guardianInfo?.whatsappNumber             || "",
      email:          initial?.guardianInfo?.email                      || "",
    },
    enrollmentInfo: {
      source:     initial?.enrollmentInfo?.source     || "Website",
      referredBy: initial?.enrollmentInfo?.referredBy || "",
      status:     initial?.enrollmentInfo?.status     || "Active",
    },
    academicInfo: {
      level:          initial?.academicInfo?.level          || "Beginner",
      groupIds:       initial?.academicInfo?.groupIds       || [],
      currentCourses: initial?.academicInfo?.currentCourses || [],
    },
    communicationPreferences: {
      preferredLanguage:    initial?.communicationPreferences?.preferredLanguage    || "ar",
      notificationChannels: initial?.communicationPreferences?.notificationChannels || { email: true, whatsapp: true, sms: false },
      marketingOptIn:       initial?.communicationPreferences?.marketingOptIn       ?? true,
    },
    whatsappCustomMessages: {
      firstMessage:  initial?.whatsappCustomMessages?.firstMessage  || "",
      secondMessage: initial?.whatsappCustomMessages?.secondMessage || "",
    },
  }));

  const [loading,          setLoading]          = useState(false);
  const [students,         setStudents]         = useState([]);
  const [studentsLoading,  setStudentsLoading]  = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [studentSearch,    setStudentSearch]    = useState("");
  const [selectedStudent,  setSelectedStudent]  = useState(null);
  const [manualStudents,   setManualStudents]   = useState([]);
  const [password,         setPassword]         = useState("");
  const [passwordConfirm,  setPasswordConfirm]  = useState("");

  // ── ✅ NEW: account-edit state for an EXISTING student (linked user) ─────
  const [editEmail,          setEditEmail]          = useState("");   // الإيميل بعد التعديل لطالب موجود
  const [newPassword,        setNewPassword]        = useState("");   // باسورد جديد (اختياري) لطالب موجود
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [updatingAccount,    setUpdatingAccount]    = useState(false); // لودينج خاص بتحديث الإيميل/الباسورد بس

  // ── ✅ NEW: real-time email-taken check (debounced) ──────────────────────
  // "idle"      → لسه مفيش فحص (الحقل فاضي أو لسه نفس الإيميل الأصلي)
  // "checking"  → جاري الفحص
  // "taken"     → الإيميل ده مستخدم من حساب تاني
  // "available" → الإيميل متاح
  const [emailCheckStatus, setEmailCheckStatus] = useState("idle");
  const emailCheckAbortRef = useRef(null);

  const [templates,        setTemplates]        = useState({ student: null, guardian: null });
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [savingTemplate,   setSavingTemplate]   = useState({ student: false, guardian: false });
  const [messagePreview,   setMessagePreview]   = useState({ student: "", guardian: "" });
  const [showStudentHints, setShowStudentHints] = useState(false);
  const [showGuardianHints,setShowGuardianHints]= useState(false);
  const [cursorPosition,   setCursorPosition]   = useState({ student: 0, guardian: 0 });
  const [selectedHintIndex,setSelectedHintIndex]= useState(0);
  const [dbVars,           setDbVars]           = useState({});
  const [loadingVars,      setLoadingVars]      = useState(false);

  const dropdownRef         = useRef(null);
  const studentTextareaRef  = useRef(null);
  const guardianTextareaRef = useRef(null);
  const studentHintsRef     = useRef(null);
  const guardianHintsRef    = useRef(null);

  // ── onChange helper ──────────────────────────────────────────────────────
  const onChange = (path, value) => {
    const parts = path.split(".");
    setForm(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let cur    = next;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]]) cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const handleAddressChange = (field, value) =>
    setForm(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        address: { ...prev.personalInfo.address, [field]: value },
      },
    }));

  // ── DB variables ─────────────────────────────────────────────────────────
  const fetchDbVariables = async () => {
    setLoadingVars(true);
    try {
      const res  = await fetch("/api/whatsapp/template-variables");
      const data = await res.json();
      if (data.success && data.data) {
        const map = {};
        data.data.forEach(v => { map[v.key] = v; });
        setDbVars(map);
      }
    } catch (e) { console.error(e); } finally { setLoadingVars(false); }
  };

  const resolveVar = useCallback((key, lang = "ar", genderContext = {}) => {
    const v = dbVars[key];
    if (!v) return null;
    const { studentGender = "Male", guardianType = "father" } = genderContext;
    const isMale   = studentGender === "Male";
    const isFather = guardianType  === "father";
    if (v.hasGender) {
      if (v.genderType === "student")
        return lang === "ar"
          ? (isMale ? v.valueMaleAr   : v.valueFemaleAr)  || v.valueAr || ""
          : (isMale ? v.valueMaleEn   : v.valueFemaleEn)  || v.valueEn || "";
      if (v.genderType === "guardian")
        return lang === "ar"
          ? (isFather ? v.valueFatherAr : v.valueMotherAr) || v.valueAr || ""
          : (isFather ? v.valueFatherEn : v.valueMotherEn) || v.valueEn || "";
    }
    return lang === "ar" ? v.valueAr || "" : v.valueEn || "";
  }, [dbVars]);

  const buildReplacementsMap = useCallback(() => {
    const gender       = form.personalInfo.gender       || "Male";
    const relationship = form.guardianInfo.relationship || "father";
    const isMale       = gender === "Male";
    const genderCtx    = { studentGender: gender, guardianType: relationship };

    const studentFullName  = form.personalInfo.fullName       || t("studentForm.student");
    const studentNickAr    = form.personalInfo.nickname?.ar   || studentFullName.split(" ")[0] || "الطالب";
    const studentNickEn    = form.personalInfo.nickname?.en   || studentFullName.split(" ")[0] || "Student";
    const guardianFullName = form.guardianInfo.name           || t("studentForm.guardian");
    const guardianNickAr   = form.guardianInfo.nickname?.ar   || guardianFullName.split(" ")[0] || "ولي الأمر";
    const guardianNickEn   = form.guardianInfo.nickname?.en   || guardianFullName.split(" ")[0] || "Guardian";

    const salutationAr         = resolveVar("salutation_ar",         "ar", genderCtx) || (isMale ? "عزيزي الطالب"   : "عزيزتي الطالبة");
    const salutationEn         = resolveVar("salutation_en",         "en", genderCtx) || "Dear student";
    const welcomeAr            = resolveVar("welcome_ar",            "ar", genderCtx) || (isMale ? "أهلاً بك"        : "أهلاً بكِ");
    const youAr                = resolveVar("you_ar",                "ar", genderCtx) || (isMale ? "أنت"             : "أنتِ");
    const guardianSalutationAr = resolveVar("guardianSalutation_ar", "ar", genderCtx)
      || (relationship === "father" ? "عزيزي الأستاذ" : relationship === "mother" ? "عزيزتي السيدة" : "عزيزي/عزيزتي");
    const guardianSalutationEn = resolveVar("guardianSalutation_en", "en", genderCtx)
      || (relationship === "father" ? "Dear Mr." : relationship === "mother" ? "Dear Mrs." : "Dear");
    const studentGenderAr      = resolveVar("studentGender_ar", "ar", genderCtx) || (isMale ? "الابن"  : "الابنة");
    const studentGenderEn      = resolveVar("studentGender_en", "en", genderCtx) || (isMale ? "son"    : "daughter");
    const relationshipAr       = resolveVar("relationship_ar",  "ar", genderCtx)
      || (relationship === "father" ? t("studentForm.relationship.father") : relationship === "mother" ? t("studentForm.relationship.mother") : t("studentForm.relationship.guardian"));

    return {
      "{name_ar}":               studentNickAr,
      "{name_en}":               studentNickEn,
      "{fullName}":              studentFullName,
      "{salutation_ar}":         `${salutationAr} ${studentNickAr}`,
      "{salutation_en}":         `${salutationEn} ${studentNickEn}`,
      "{you_ar}":                youAr,
      "{welcome_ar}":            welcomeAr,
      "{guardianName_ar}":       guardianNickAr,
      "{guardianName_en}":       guardianNickEn,
      "{guardianSalutation_ar}": `${guardianSalutationAr} ${guardianNickAr}`,
      "{guardianSalutation_en}": `${guardianSalutationEn} ${guardianNickEn}`,
      "{studentName_ar}":        studentNickAr,
      "{studentName_en}":        studentNickEn,
      "{fullStudentName}":       studentFullName,
      "{relationship_ar}":       relationshipAr,
      "{studentGender_ar}":      studentGenderAr,
      "{studentGender_en}":      studentGenderEn,
    };
  }, [form.personalInfo, form.guardianInfo, resolveVar, t]);

  const studentVariables = useMemo(() => {
    const map = buildReplacementsMap();
    return [
      { key: "{name_ar}",       label: t("studentForm.studentNicknameArabic"),  icon: "👤", example: map["{name_ar}"]       },
      { key: "{name_en}",       label: t("studentForm.studentNicknameEnglish"), icon: "👤", example: map["{name_en}"]       },
      { key: "{fullName}",      label: t("studentForm.fullName"),               icon: "📝", example: map["{fullName}"]      },
      { key: "{salutation_ar}", label: "التحية (عربي)",                         icon: "👋", example: map["{salutation_ar}"] },
      { key: "{salutation_en}", label: "التحية (إنجليزي)",                      icon: "👋", example: map["{salutation_en}"] },
      { key: "{you_ar}",        label: "أنت/أنتِ",                              icon: "💬", example: map["{you_ar}"]        },
      { key: "{welcome_ar}",    label: "الترحيب",                               icon: "🎉", example: map["{welcome_ar}"]    },
    ];
  }, [buildReplacementsMap, t]);

  const guardianVariables = useMemo(() => {
    const map = buildReplacementsMap();
    return [
      { key: "{guardianName_ar}",       label: t("studentForm.guardianNicknameArabic"),  icon: "👤", example: map["{guardianName_ar}"]       },
      { key: "{guardianName_en}",       label: t("studentForm.guardianNicknameEnglish"), icon: "👤", example: map["{guardianName_en}"]       },
      { key: "{guardianSalutation_ar}", label: "التحية الكاملة (عربي)",                  icon: "👋", example: map["{guardianSalutation_ar}"] },
      { key: "{guardianSalutation_en}", label: "التحية الكاملة (إنجليزي)",               icon: "👋", example: map["{guardianSalutation_en}"] },
      { key: "{studentName_ar}",        label: t("studentForm.studentNicknameArabic"),   icon: "👶", example: map["{studentName_ar}"]        },
      { key: "{studentName_en}",        label: t("studentForm.studentNicknameEnglish"),  icon: "👶", example: map["{studentName_en}"]        },
      { key: "{relationship_ar}",       label: "العلاقة",                                icon: "👨‍👩‍👦", example: map["{relationship_ar}"]       },
      { key: "{studentGender_ar}",      label: "الابن/الابنة",                           icon: "⚧",  example: map["{studentGender_ar}"]      },
    ];
  }, [buildReplacementsMap, t]);

  const replaceVariables = useCallback((message) => {
    if (!message) return "";
    const map = buildReplacementsMap();
    let result = message;
    for (const [key, value] of Object.entries(map))
      result = result.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value ?? "");
    return result;
  }, [buildReplacementsMap]);

  // ── templates ────────────────────────────────────────────────────────────
  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res  = await fetch("/api/whatsapp/templates?default=true");
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        const st = data.data.find(t => t.templateType === "student_welcome");
        const gt = data.data.find(t => t.templateType === "guardian_notification");
        setTemplates({ student: st, guardian: gt });
        if (!form.whatsappCustomMessages?.secondMessage && st) onChange("whatsappCustomMessages.secondMessage", st.content);
        if (!form.whatsappCustomMessages?.firstMessage  && gt) onChange("whatsappCustomMessages.firstMessage",  gt.content);
      }
    } catch { toast.error(t("common.error")); } finally { setLoadingTemplates(false); }
  };

  const saveTemplateUpdate = async (templateType, content) => {
    const key = templateType === "student_welcome" ? "student" : "guardian";
    setSavingTemplate(prev => ({ ...prev, [key]: true }));
    try {
      const tmpl = templates[key];
      if (!tmpl) return;
      const res  = await fetch("/api/whatsapp/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: tmpl._id, content, setAsDefault: true }),
      });
      const data = await res.json();
      if (data.success) { setTemplates(prev => ({ ...prev, [key]: data.data })); toast.success(t("common.saved"), { duration: 1500 }); }
    } catch { toast.error(t("common.error")); } finally { setSavingTemplate(prev => ({ ...prev, [key]: false })); }
  };

  useEffect(() => { fetchDbVariables(); }, []);
  useEffect(() => { fetchTemplates(); },   []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (form.whatsappCustomMessages?.secondMessage && templates.student && form.whatsappCustomMessages.secondMessage !== templates.student.content)
        saveTemplateUpdate("student_welcome", form.whatsappCustomMessages.secondMessage);
    }, 2000);
    return () => clearTimeout(timer);
  }, [form.whatsappCustomMessages?.secondMessage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (form.whatsappCustomMessages?.firstMessage && templates.guardian && form.whatsappCustomMessages.firstMessage !== templates.guardian.content)
        saveTemplateUpdate("guardian_notification", form.whatsappCustomMessages.firstMessage);
    }, 2000);
    return () => clearTimeout(timer);
  }, [form.whatsappCustomMessages?.firstMessage]);

  useEffect(() => {
    setMessagePreview({
      student:  replaceVariables(form.whatsappCustomMessages?.secondMessage || templates.student?.content  || ""),
      guardian: replaceVariables(form.whatsappCustomMessages?.firstMessage  || templates.guardian?.content || ""),
    });
  }, [replaceVariables, form.whatsappCustomMessages, templates]);

  // ── hints & textarea ─────────────────────────────────────────────────────
  const handleTextareaInput = (e, type) => {
    const value     = e.target.value;
    const cursorPos = e.target.selectionStart;
    if (type === "student") {
      onChange("whatsappCustomMessages.secondMessage", value);
      setCursorPosition(p => ({ ...p, student: cursorPos }));
      const lastAt = value.substring(0, cursorPos).lastIndexOf("@");
      if (lastAt !== -1 && lastAt === cursorPos - 1) { setShowStudentHints(true); setSelectedHintIndex(0); }
      else if (showStudentHints && lastAt === -1) setShowStudentHints(false);
    } else {
      onChange("whatsappCustomMessages.firstMessage", value);
      setCursorPosition(p => ({ ...p, guardian: cursorPos }));
      const lastAt = value.substring(0, cursorPos).lastIndexOf("@");
      if (lastAt !== -1 && lastAt === cursorPos - 1) { setShowGuardianHints(true); setSelectedHintIndex(0); }
      else if (showGuardianHints && lastAt === -1) setShowGuardianHints(false);
    }
  };

  const insertVariable = (variable, type) => {
    const textarea   = type === "student" ? studentTextareaRef.current : guardianTextareaRef.current;
    const currentVal = type === "student" ? form.whatsappCustomMessages?.secondMessage || "" : form.whatsappCustomMessages?.firstMessage || "";
    const cursorPos  = type === "student" ? cursorPosition.student : cursorPosition.guardian;
    const textBefore = currentVal.substring(0, cursorPos);
    const lastAt     = textBefore.lastIndexOf("@");
    let newValue, newCursorPos;
    if (lastAt !== -1) { newValue = currentVal.substring(0, lastAt) + variable.key + currentVal.substring(cursorPos); newCursorPos = lastAt + variable.key.length; }
    else               { newValue = currentVal.substring(0, cursorPos) + variable.key + currentVal.substring(cursorPos); newCursorPos = cursorPos + variable.key.length; }
    if (type === "student") { onChange("whatsappCustomMessages.secondMessage", newValue); setShowStudentHints(false); setCursorPosition(p => ({ ...p, student: newCursorPos })); }
    else                   { onChange("whatsappCustomMessages.firstMessage",  newValue); setShowGuardianHints(false); setCursorPosition(p => ({ ...p, guardian: newCursorPos })); }
    setTimeout(() => { textarea?.focus(); textarea?.setSelectionRange(newCursorPos, newCursorPos); }, 0);
  };

  const handleHintsKeyDown = (e, type) => {
    const vars      = type === "student" ? studentVariables : guardianVariables;
    const showHints = type === "student" ? showStudentHints : showGuardianHints;
    if (!showHints) return;
    if (e.key === "ArrowDown")             { e.preventDefault(); setSelectedHintIndex(p => (p + 1) % vars.length); }
    else if (e.key === "ArrowUp")          { e.preventDefault(); setSelectedHintIndex(p => (p - 1 + vars.length) % vars.length); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertVariable(vars[selectedHintIndex], type); }
    else if (e.key === "Escape")           { e.preventDefault(); type === "student" ? setShowStudentHints(false) : setShowGuardianHints(false); }
  };

  // ── students fetch ───────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setStudentsLoading(true);
      try {
        const res  = await fetch("/api/students");
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (data.success) setStudents(data.data || []);
      } catch { toast.error(t("students.loadError")); } finally { setStudentsLoading(false); }
    })();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current      && !dropdownRef.current.contains(e.target))      setShowUserDropdown(false);
      if (studentHintsRef.current  && !studentHintsRef.current.contains(e.target))  setShowStudentHints(false);
      if (guardianHintsRef.current && !guardianHintsRef.current.contains(e.target)) setShowGuardianHints(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ✅ FIX: also seed editEmail with the current account email when an
  // existing student is loaded into the form (edit mode entry point).
  useEffect(() => {
    if (initial?.authUserId) {
      const name  = initial.personalInfo?.fullName || initial.authUserId?.name  || "";
      const email = initial.personalInfo?.email    || initial.authUserId?.email || "";
      setStudentSearch(name);
      setSelectedStudent({ _id: initial.authUserId._id, name, email });
      setEditEmail(email); // ✅ تعبئة حقل الإيميل القابل للتعديل
    } else if (initial && !initial.authUserId) {
      setStudentSearch(initial.personalInfo?.fullName || "");
    }
  }, [initial]);

  // ── ✅ NEW: real-time "email already taken" check ────────────────────────
  // بيشتغل فقط على إيميل الحساب القابل للتعديل (editEmail) للطالب الموجود
  // فعليًا، وبعد فترة سكون صغيرة (debounce) عشان مانضربش السيرفر كل ضغطة.
  useEffect(() => {
    const isExistingStudent = selectedStudent && !selectedStudent.isManual;

    // مفيش داعي للفحص لو: مفيش طالب موجود، أو الإيميل فاضي، أو هو نفس
    // الإيميل الأصلي بتاع الحساب (مفيش تغيير فعلي).
    if (!isExistingStudent || !editEmail.trim() || editEmail.trim().toLowerCase() === (selectedStudent.email || "").toLowerCase()) {
      setEmailCheckStatus("idle");
      return;
    }

    const trimmed = editEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailCheckStatus("idle"); // إيميل غير مكتمل/غير صحيح الصيغة بعد — منعرضش حاجة
      return;
    }

    setEmailCheckStatus("checking");

    const controller = new AbortController();
    emailCheckAbortRef.current?.abort();
    emailCheckAbortRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ email: trimmed, excludeUserId: selectedStudent._id });
        const res  = await fetch(`/api/allStudents/checkEmail?${params}`, { signal: controller.signal });
        const data = await res.json();
        if (data.success && data.valid) {
          setEmailCheckStatus(data.exists ? "taken" : "available");
        } else {
          setEmailCheckStatus("idle");
        }
      } catch (err) {
        if (err.name !== "AbortError") setEmailCheckStatus("idle");
      }
    }, 500);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [editEmail, selectedStudent]);

  // ── student search helpers ───────────────────────────────────────────────
  const addManualStudent = (name) => {
    if (name.trim() && !manualStudents.some(s => s.name === name.trim())) {
      const s = { _id: `manual_${Date.now()}`, name: name.trim(), email: "", role: "student", isManual: true };
      setManualStudents(prev => [...prev, s]);
      return s;
    }
    return null;
  };

  // ✅ FIX: keep editEmail / newPassword in sync when a different existing
  // student is picked from the dropdown, and clear any leftover password
  // input from a previously selected student.
  const handleStudentSelect = (student) => {
    if (!student.isManual) {
      setSelectedStudent(student);
      onChange("personalInfo.fullName", student.name);
      onChange("personalInfo.email",   student.email);
      onChange("authUserId",           student._id);
      setEditEmail(student.email || ""); // ✅
      setNewPassword("");
      setNewPasswordConfirm("");
      setEmailCheckStatus("idle"); // ✅ تصفير حالة الفحص عند تبديل الطالب
    } else {
      setSelectedStudent(null);
      onChange("personalInfo.fullName", student.name);
      onChange("authUserId", "");
    }
    setStudentSearch(student.name);
    setShowUserDropdown(false);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    onChange("personalInfo.fullName", value);
    setStudentSearch(value);
    if (selectedStudent && value !== selectedStudent.name) { setSelectedStudent(null); onChange("authUserId", ""); }
  };

  const filteredStudents       = students.filter(s => s.name?.toLowerCase().includes(studentSearch.toLowerCase()) || s.email?.toLowerCase().includes(studentSearch.toLowerCase()));
  const filteredManualStudents = manualStudents.filter(s => s.name?.toLowerCase().includes(studentSearch.toLowerCase()));
  const isNameInLists          = studentSearch.trim() && (
    filteredStudents.some(s => s.name?.toLowerCase() === studentSearch.toLowerCase()) ||
    filteredManualStudents.some(s => s.name?.toLowerCase() === studentSearch.toLowerCase())
  );

  const resetToDefaultTemplate = (type) => {
    if (type === "student"  && templates.student)  { onChange("whatsappCustomMessages.secondMessage", templates.student.content);  toast.success(t("studentForm.templateRestored"), { duration: 2000 }); }
    if (type === "guardian" && templates.guardian) { onChange("whatsappCustomMessages.firstMessage",  templates.guardian.content); toast.success(t("studentForm.templateRestored"), { duration: 2000 }); }
  };

  const getGuardianIcon = () => ({ father: "👨", mother: "👩" }[form.guardianInfo.relationship] || "👤");

  // ── submit ───────────────────────────────────────────────────────────────
  const submit = async (e) => {
    e.preventDefault();

    const isExistingStudent = selectedStudent && !selectedStudent.isManual;

    // ── ✅ NEW: منع الحفظ لو الفحص الفوري أكد إن الإيميل مستخدم ──
    if (isExistingStudent && emailCheckStatus === "taken") {
      toast.error(t("studentForm.emailAlreadyTaken") || "هذا البريد الإلكتروني مستخدم من قبل حساب آخر");
      return;
    }

    // ── تحقق كلمة المرور لحساب جديد ──
    if (!selectedStudent && form.personalInfo.fullName) {
      if (password !== passwordConfirm) { toast.error(t("studentForm.passwordMismatch")); return; }
      if (password.length < 6)          { toast.error(t("studentForm.passwordLength"));   return; }
    }

    // ── تحقق كلمة المرور الجديدة لطالب موجود (لو حد كتب فيها) ──
    if (isExistingStudent && (newPassword || newPasswordConfirm)) {
      if (newPassword !== newPasswordConfirm) { toast.error(t("studentForm.passwordMismatch")); return; }
      if (newPassword.length < 6)             { toast.error(t("studentForm.passwordLength"));   return; }
    }

    setLoading(true);
    const toastId = toast.loading(initial?.id ? t("common.updating") : t("common.creating"));
    try {
      let userId = form.authUserId;

      if (!selectedStudent || selectedStudent.isManual) {
        // ── طالب جديد: إنشاء يوزر جديد ──
        const userRes  = await fetch("/api/allStudents/createUser", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.personalInfo.fullName, email: form.personalInfo.email, password, role: "student" }) });
        const userData = await userRes.json();
        if (!userRes.ok) throw new Error(userData.message);
        userId = userData.user?.id;
      } else if (isExistingStudent) {
        // ── طالب موجود: تحديث الإيميل و/أو الباسورد لو فيه تغيير ──
        const emailChanged        = editEmail && editEmail.trim().toLowerCase() !== (selectedStudent.email || "").toLowerCase();
        const wantsPasswordChange = !!newPassword;

        if (emailChanged || wantsPasswordChange) {
          const updateRes  = await fetch("/api/allStudents/updateUser", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              ...(emailChanged ? { email: editEmail.trim() } : {}),
              ...(wantsPasswordChange ? { password: newPassword } : {}),
            }),
          });
          const updateData = await updateRes.json();
          if (!updateRes.ok) throw new Error(updateData.message || (updateData.errors && Object.values(updateData.errors)[0]));
        }
      }

      // build final ISO from dob state
      const dateOfBirthISO = dobToISO(dob) || null;

      // ✅ FIX: keep Student.personalInfo.email in sync with the (possibly
      // just-updated) account email when editing an existing student.
      const finalEmail = isExistingStudent ? editEmail.trim().toLowerCase() : form.personalInfo.email;

      const payload   = { ...form, authUserId: userId, personalInfo: { ...form.personalInfo, email: finalEmail, dateOfBirth: dateOfBirthISO } };
      const studentId = initial?.id || initial?._id;
      const res       = await fetch(studentId ? `/api/allStudents/${studentId}` : "/api/allStudents", {
        method: studentId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      if (result.success) {
        toast.success(studentId ? t("common.updated") : t("common.created"), { id: toastId });
        onSaved(); onClose();
      }
    } catch (err) {
      toast.error(err.message || t("common.error"), { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const progress   = ((step + 1) / STEPS.length) * 100;
  const isLastStep = step === STEPS.length - 1;

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-white dark:bg-darkmode" dir="rtl">

      {/* ── Header ── */}
      <div className="bg-white dark:bg-darkmode px-6 pt-5 pb-0 border-b border-gray-100 dark:border-dark_border">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                {initial?.id ? t("studentForm.editTitle") : t("studentForm.createTitle") || "نظام التسجيل"}
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 dark:border-dark_border flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-start justify-between relative">
          <div className="absolute top-4 right-4 left-4 h-px bg-gray-200 dark:bg-gray-700 z-0" />
          {STEPS.map((s, i) => {
            const done   = i < step;
            const active = i === step;
            const Icon   = s.icon;
            return (
              <button key={s.id} type="button" onClick={() => goTo(i)} className="flex flex-col items-center gap-1.5 relative z-10" style={{ minWidth: 44 }}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200
                  ${done   ? "bg-primary text-white shadow-sm"
                  : active ? "bg-primary text-white shadow-md ring-4 ring-primary/20"
                           : "bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-2 border-gray-200 dark:border-gray-700"}`}
                >
                  {done ? <CheckCircle className="w-4 h-4" /> : active ? <Icon className="w-4 h-4" /> : <span className="text-xs">{i + 1}</span>}
                </div>
                <span className={`text-xs font-medium whitespace-nowrap transition-colors
                  ${active ? "text-primary" : done ? "text-gray-500 dark:text-gray-400" : "text-gray-400 dark:text-gray-600"}`}>
                  {t(`studentForm.step.${s.id}`) || s.label_ar}
                </span>
              </button>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-gray-100 dark:bg-gray-800 mt-4 -mx-6">
          <div className="h-full bg-primary rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6" style={{ animation: visible ? `sf-slide${animDir > 0 ? "In" : "Out"} 0.22s cubic-bezier(.22,.68,0,1.2) both` : "none" }}>

          <div className="flex items-center justify-end mb-1">
            <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
              الخطوة {step + 1} من {STEPS.length}
            </span>
          </div>
          <div className="text-right mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              {t(`studentForm.step.${STEPS[step].id}.title`) || ""}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t(`studentForm.step.${STEPS[step].id}.desc`) || ""}
            </p>
          </div>

          {/* ════════════════════════════════════════════
              STEP 0 — Account
          ════════════════════════════════════════════ */}
          {step === 0 && (
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{t("studentForm.searchHint") || "للتحقق من عدم وجود سجل مسبق"}</span>
                  <div className="flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-800 dark:text-white">
                      {t("studentForm.searchRegistered") || "البحث عن طالب مسجّل"}
                    </span>
                  </div>
                </div>
                <div className="relative" ref={dropdownRef}>
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={handleInputChange}
                    onFocus={() => setShowUserDropdown(true)}
                    placeholder={t("studentForm.searchByNameOrEmail") || "الاسم أو البريد الإلكتروني..."}
                    className={`${inputBase} pl-12 text-right`}
                  />
                  {showUserDropdown && (
                    <div className="absolute z-30 w-full mt-1.5 bg-white dark:bg-darklight border border-gray-200 dark:border-dark_border rounded-2xl shadow-xl overflow-hidden">
                      {studentSearch.trim() && !isNameInLists && (
                        <button type="button" onClick={() => { const s = addManualStudent(studentSearch); if (s) handleStudentSelect(s); }} className="w-full px-4 py-3 text-right hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700">
                          <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium dark:text-white">{t("studentForm.add")} "{studentSearch}"</p>
                            <p className="text-xs text-gray-400">{t("studentForm.newStudent") || "إنشاء طالب جديد"}</p>
                          </div>
                        </button>
                      )}
                      {filteredStudents.map(s => (
                        <button key={s._id} type="button" onClick={() => handleStudentSelect(s)} className="w-full px-4 py-3 text-right hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 text-right">
                            <p className="text-sm font-medium dark:text-white">{s.name}</p>
                            <p className="text-xs text-gray-400">{s.email}</p>
                          </div>
                        </button>
                      ))}
                      {filteredStudents.length === 0 && !studentSearch.trim() && (
                        <p className="px-4 py-3 text-sm text-gray-400 text-right">{t("common.search") || "ابدأ الكتابة للبحث..."}</p>
                      )}
                    </div>
                  )}
                </div>
                {selectedStudent && !selectedStudent.isManual && (
                  <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-xl border border-green-100 dark:border-green-900 justify-end">
                    <span>{t("studentForm.existingStudent") || "طالب موجود — سيتم الربط تلقائيًا"}</span>
                    <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs text-gray-400">{t("studentForm.orCreateNew") || "أو أنشئ حسابًا جديدًا"}</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>

              <div className="border border-orange-100 dark:border-orange-900/40 bg-orange-50/40 dark:bg-orange-900/10 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-sm font-bold text-gray-800 dark:text-white">
                    {t("studentForm.newAccountData") || "بيانات الحساب الجديد"}
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={labelBase}>{t("studentForm.fullName") || "الاسم الكامل"} <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input type="text" value={form.personalInfo.fullName} onChange={handleInputChange} placeholder={t("studentForm.fullNamePlaceholder") || "أدخل الاسم الكامل"} className={`${inputBase} pl-12 text-right`} disabled={selectedStudent && !selectedStudent.isManual} />
                  </div>
                </div>

                {/* ── الإيميل ──────────────────────────────────────────────
                    ✅ FIX: لطالب موجود (مرتبط بيوزر فعلي) الحقل بقى قابل
                    للتعديل بدل ما يكون disabled — القيمة بتتاخد من editEmail
                    وبتتحدّث فعليًا عبر /api/allStudents/updateUser في submit.
                    ✅ NEW: فحص فوري (debounced) لو الإيميل الجديد مستخدم
                    من حساب تاني قبل حتى ما يدوس حفظ.
                */}
                <div className="space-y-2">
                  <label className={labelBase}>{t("common.email") || "البريد الإلكتروني"} <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      type="email"
                      value={selectedStudent && !selectedStudent.isManual ? editEmail : form.personalInfo.email}
                      onChange={e => {
                        if (selectedStudent && !selectedStudent.isManual) {
                          setEditEmail(e.target.value);
                        } else {
                          onChange("personalInfo.email", e.target.value);
                        }
                      }}
                      placeholder="example@domain.com"
                      className={`${inputBase} pl-12 text-right ${emailCheckStatus === "taken" ? "border-red-400 focus:border-red-500 focus:ring-red-400" : ""}`}
                    />
                    {selectedStudent && !selectedStudent.isManual && emailCheckStatus === "checking" && (
                      <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                    )}
                    {selectedStudent && !selectedStudent.isManual && emailCheckStatus === "taken" && (
                      <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                    )}
                    {selectedStudent && !selectedStudent.isManual && emailCheckStatus === "available" && (
                      <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    )}
                  </div>

                  {/* رسائل حالة الفحص — بالأولوية: taken > checking > available > "سيتم التحديث" */}
                  {selectedStudent && !selectedStudent.isManual && emailCheckStatus === "taken" ? (
                    <div className="flex items-center justify-end gap-1.5 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl border border-red-100 dark:border-red-900">
                      <span>{t("studentForm.emailAlreadyTaken") || "هذا البريد الإلكتروني مستخدم من قبل حساب آخر"}</span>
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    </div>
                  ) : selectedStudent && !selectedStudent.isManual && emailCheckStatus === "checking" ? (
                    <div className="flex items-center justify-end gap-1.5 text-xs text-gray-400">
                      <span>{t("studentForm.checkingEmail") || "جاري التحقق من البريد الإلكتروني..."}</span>
                    </div>
                  ) : selectedStudent && !selectedStudent.isManual && emailCheckStatus === "available" ? (
                    <div className="flex items-center justify-end gap-1.5 text-xs text-emerald-600">
                      <span>{t("studentForm.emailAvailable") || "هذا البريد الإلكتروني متاح"}</span>
                      <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    </div>
                  ) : selectedStudent && !selectedStudent.isManual && editEmail !== selectedStudent.email && (
                    <div className="flex items-center justify-end gap-1.5 text-xs text-amber-600">
                      <Info className="w-3.5 h-3.5" />
                      <span>{t("studentForm.emailWillBeUpdated") || "سيتم تحديث الإيميل عند الحفظ"}</span>
                    </div>
                  )}
                </div>

                {/* ── كلمة مرور لحساب جديد (طالب جديد فقط) ── */}
                {(!selectedStudent || selectedStudent.isManual) && form.personalInfo.fullName && (
                  <div className="space-y-4 pt-2 border-t border-orange-100 dark:border-orange-900/40">
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white text-right">{t("studentForm.password") || "كلمة المرور"}</p>
                        <p className="text-xs text-gray-400 text-right">{t("studentForm.passwordSecure") || "آمن ومشفر"}</p>
                      </div>
                      <Shield className="w-5 h-5 text-primary flex-shrink-0" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className={labelBase}>{t("common.password") || "كلمة المرور"}</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={`${inputBase} text-right`} minLength={6} />
                      </div>
                      <div className="space-y-1.5">
                        <label className={labelBase}>{t("common.confirmPassword") || "تأكيد"}</label>
                        <input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} className={`${inputBase} text-right`} minLength={6} />
                      </div>
                    </div>
                    {password && passwordConfirm && password !== passwordConfirm && (
                      <div className="flex items-center justify-end gap-1.5 text-xs text-red-600">
                        <span>{t("studentForm.passwordMismatch") || "كلمتا المرور غير متطابقتين"}</span>
                        <AlertCircle className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                )}

                {/* ── ✅ NEW: تغيير كلمة المرور لطالب موجود (اختياري) ──────
                    يظهر فقط لو فيه طالب موجود فعليًا مرتبط بيوزر. سايبه
                    فاضي يعني مفيش تغيير، وده بيتفحص ويتبعت عبر updateUser.
                */}
                {selectedStudent && !selectedStudent.isManual && (
                  <div className="space-y-4 pt-2 border-t border-orange-100 dark:border-orange-900/40">
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white text-right">
                          {t("studentForm.changePassword") || "تغيير كلمة المرور"}
                        </p>
                        <p className="text-xs text-gray-400 text-right">
                          {t("studentForm.changePasswordHint") || "اتركها فاضية لو مش عاوز تغيّرها"}
                        </p>
                      </div>
                      <Shield className="w-5 h-5 text-primary flex-shrink-0" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className={labelBase}>{t("studentForm.newPassword") || "كلمة مرور جديدة"}</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className={`${inputBase} text-right`}
                          minLength={6}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={labelBase}>{t("common.confirmPassword") || "تأكيد"}</label>
                        <input
                          type="password"
                          value={newPasswordConfirm}
                          onChange={e => setNewPasswordConfirm(e.target.value)}
                          placeholder="••••••••"
                          className={`${inputBase} text-right`}
                          minLength={6}
                        />
                      </div>
                    </div>
                    {newPassword && newPasswordConfirm && newPassword !== newPasswordConfirm && (
                      <div className="flex items-center justify-end gap-1.5 text-xs text-red-600">
                        <span>{t("studentForm.passwordMismatch") || "كلمتا المرور غير متطابقتين"}</span>
                        <AlertCircle className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {newPassword && newPassword.length > 0 && newPassword.length < 6 && (
                      <div className="flex items-center justify-end gap-1.5 text-xs text-red-600">
                        <span>{t("studentForm.passwordLength") || "يجب أن تكون 6 أحرف على الأقل"}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════
              STEP 1 — Personal Info
              ✅ FIX: DOB uses separate dob state
              ✅ FIX: Gender reads form.personalInfo.gender (normalized)
          ════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-6">

              {/* Date of Birth ─── 3 separate number inputs */}
              <div className="space-y-2">
                <label className={labelBase}>
                  {t("common.dateOfBirth") || "تاريخ الميلاد"}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {/* Day */}
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 text-right">اليوم</p>
                    <input
                      type="number"
                      min={1} max={31}
                      placeholder="DD"
                      value={dob.day}
                      onChange={e => setDob(prev => ({ ...prev, day: e.target.value }))}
                      className={`${inputBase} text-center`}
                    />
                  </div>
                  {/* Month */}
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 text-right">الشهر</p>
                    <div className="relative">
                      <select
                        value={dob.month}
                        onChange={e => setDob(prev => ({ ...prev, month: e.target.value }))}
                        className={`${selectBase} text-center`}
                      >
                        <option value="">الشهر</option>
                        {["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"].map((m, i) => (
                          <option key={i} value={String(i + 1).padStart(2, "0")}>{m}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  {/* Year */}
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 text-right">السنة</p>
                    <input
                      type="number"
                      min={1920} max={new Date().getFullYear()}
                      placeholder="YYYY"
                      value={dob.year}
                      onChange={e => setDob(prev => ({ ...prev, year: e.target.value }))}
                      className={`${inputBase} text-center`}
                    />
                  </div>
                </div>

                {/* Live preview of assembled date */}
                {dob.day && dob.month && dob.year && dob.year.length === 4 && (
                  <div className="flex items-center justify-end gap-1.5 text-xs">
                    <span className="font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                      {new Date(`${dob.year}-${dob.month}-${dob.day}T12:00:00`).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                )}

                <div className="flex items-center justify-end gap-1.5 text-xs text-gray-400">
                  <span>{t("studentForm.dobHint") || "يُستخدم لحساب العمر والتحقق من الهوية"}</span>
                  <Info className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Gender ─── button group */}
              <div className="space-y-2">
                <label className={labelBase}>
                  {t("common.gender") || "الجنس"} <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "Male",   labelAr: "ذكر",  emoji: "♂️", color: "blue"  },
                    { value: "Female", labelAr: "أنثى", emoji: "♀️", color: "pink"  },
                  ].map(({ value, labelAr, emoji, color }) => {
                    const selected = form.personalInfo.gender === value;
                    const colors = {
                      blue: {
                        active:   "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300",
                        inactive: "border-gray-200 dark:border-gray-700 bg-white dark:bg-dark_input text-gray-500 hover:border-blue-300",
                        ring:     "ring-4 ring-blue-500/15",
                        dot:      "bg-blue-500",
                      },
                      pink: {
                        active:   "border-pink-500 bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300",
                        inactive: "border-gray-200 dark:border-gray-700 bg-white dark:bg-dark_input text-gray-500 hover:border-pink-300",
                        ring:     "ring-4 ring-pink-500/15",
                        dot:      "bg-pink-500",
                      },
                    }[color];
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => onChange("personalInfo.gender", value)}
                        className={`
                          relative flex items-center justify-center gap-2.5 py-4 rounded-xl border-2
                          text-sm font-semibold transition-all duration-200
                          ${selected ? `${colors.active} ${colors.ring}` : colors.inactive}
                        `}
                      >
                        {/* Selected indicator dot */}
                        {selected && (
                          <span className={`absolute top-2.5 left-2.5 w-2 h-2 rounded-full ${colors.dot}`} />
                        )}
                        <span className="text-xl leading-none">{emoji}</span>
                        <span>{labelAr}</span>
                        {selected && <CheckCircle className="w-4 h-4 absolute top-2.5 right-2.5 opacity-70" />}
                      </button>
                    );
                  })}
                </div>
                {/* Show selected value clearly */}
                {form.personalInfo.gender && (
                  <div className="flex items-center justify-end gap-1.5 text-xs">
                    <span className={`font-semibold px-2.5 py-1 rounded-full ${
                      form.personalInfo.gender === "Male"
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300"
                        : "bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300"
                    }`}>
                      {form.personalInfo.gender === "Male" ? "تم الاختيار: ذكر ♂️" : "تم الاختيار: أنثى ♀️"}
                    </span>
                  </div>
                )}
              </div>

              {/* Arabic nickname */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{t("studentForm.nicknameArabicHint") || "يظهر في الشاشات والجداول"}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {t("studentForm.shownInSchedules") || "يُعرض في الجداول"}
                    </span>
                    <label className={`${labelBase} mb-0`}>{t("studentForm.studentNicknameArabic") || "الاسم المختصر (عربي)"}</label>
                  </div>
                </div>
                <div className="relative">
                  <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    type="text"
                    value={form.personalInfo.nickname?.ar || ""}
                    onChange={e => onChange("personalInfo.nickname.ar", e.target.value)}
                    placeholder={t("studentForm.nicknameArabicPlaceholder") || "مثال: أحمد"}
                    dir="rtl"
                    className={`${inputBase} pl-12 text-right`}
                    maxLength={20}
                  />
                </div>
                <p className="text-xs text-gray-400 text-left">{(form.personalInfo.nickname?.ar || "").length}/20</p>
              </div>

              {/* English nickname */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{t("studentForm.nicknameEnglishHint") || "للشهادات والتقارير الإنجليزية"}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">{t("studentForm.optional") || "اختياري"}</span>
                    <label className={`${labelBase} mb-0`}>{t("studentForm.studentNicknameEnglish") || "الاسم المختصر (إنجليزي)"}</label>
                  </div>
                </div>
                <div className="relative">
                  <Languages className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    type="text"
                    value={form.personalInfo.nickname?.en || ""}
                    onChange={e => onChange("personalInfo.nickname.en", e.target.value)}
                    placeholder="e.g. Ahmed"
                    className={`${inputBase} pl-12 text-right`}
                    maxLength={20}
                  />
                </div>
                <p className="text-xs text-gray-400 text-left">{(form.personalInfo.nickname?.en || "").length}/20</p>
              </div>

              {/* National ID */}
              <div className="space-y-2">
                <label className={labelBase}>{t("studentForm.nationalId") || "رقم الهوية الوطنية / الإقامة"}</label>
                <input
                  type="text"
                  value={form.personalInfo.nationalId}
                  onChange={e => onChange("personalInfo.nationalId", e.target.value)}
                  placeholder={t("studentForm.nationalIdPlaceholder") || "30012011234567"}
                  className={`${inputBase} text-right`}
                />
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════
              STEP 2 — Contact
          ════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={labelBase}><Phone className="inline w-3.5 h-3.5 ml-1" />{t("common.phone") || "الهاتف"}</label>
                  <input type="tel" value={form.personalInfo.phone} onChange={e => onChange("personalInfo.phone", e.target.value)} placeholder="+201234567890" className={`${inputBase} text-right`} />
                </div>
                <div className="space-y-2">
                  <label className={labelBase}>
                    <MessageCircle className="inline w-3.5 h-3.5 ml-1 text-green-500" />
                    {t("common.whatsapp") || "واتساب"}
                    <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded-full mr-1">{t("studentForm.forMessages") || "للرسائل"}</span>
                  </label>
                  <input type="tel" value={form.personalInfo.whatsappNumber} onChange={e => onChange("personalInfo.whatsappNumber", e.target.value)} placeholder="01234567890" className={`${inputBase} text-right`} />
                </div>
              </div>
              <div className="space-y-3">
                <label className={`${labelBase} flex items-center gap-1.5 justify-end`}>
                  <MapPin className="w-3.5 h-3.5" />{t("common.address") || "العنوان"}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={form.personalInfo.address.street}     onChange={e => handleAddressChange("street",     e.target.value)} placeholder={t("common.street")     || "الشارع"}       className={`${inputBase} text-right`} />
                  <input type="text" value={form.personalInfo.address.city}       onChange={e => handleAddressChange("city",       e.target.value)} placeholder={t("common.city")       || "المدينة"}      className={`${inputBase} text-right`} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <input type="text" value={form.personalInfo.address.state}      onChange={e => handleAddressChange("state",      e.target.value)} placeholder={t("common.state")      || "المحافظة"}     className={`${inputBase} text-right`} />
                  <input type="text" value={form.personalInfo.address.postalCode} onChange={e => handleAddressChange("postalCode", e.target.value)} placeholder={t("common.postalCode") || "الكود البريدي"} className={`${inputBase} text-right`} />
                  <input type="text" value={form.personalInfo.address.country}    onChange={e => handleAddressChange("country",    e.target.value)} placeholder={t("common.country")    || "الدولة"}       className={`${inputBase} text-right`} />
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════
              STEP 3 — Guardian
          ════════════════════════════════════════════ */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={labelBase}>{t("studentForm.guardianName") || "اسم ولي الأمر"} <span className="text-red-500">*</span></label>
                  <input type="text" value={form.guardianInfo.name} onChange={e => onChange("guardianInfo.name", e.target.value)} placeholder={t("studentForm.guardianNamePlaceholder") || "الاسم الكامل"} className={`${inputBase} text-right`} />
                </div>
                <div className="space-y-2">
                  <label className={labelBase}>
                    {t("studentForm.guardianNicknameArabic") || "الاسم المختصر (عربي)"}
                    <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded-full mr-1">{t("studentForm.forMessages") || "للرسائل"}</span>
                  </label>
                  <input type="text" value={form.guardianInfo.nickname?.ar || ""} onChange={e => onChange("guardianInfo.nickname.ar", e.target.value)} placeholder="مثال: محمد" dir="rtl" className={`${inputBase} text-right`} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className={labelBase}>{t("studentForm.guardianNicknameEnglish") || "الاسم (إنجليزي)"}</label>
                  <input type="text" value={form.guardianInfo.nickname?.en || ""} onChange={e => onChange("guardianInfo.nickname.en", e.target.value)} placeholder="e.g. Mohamed" className={`${inputBase} text-right`} />
                </div>
                <div className="space-y-2">
                  <label className={labelBase}>
                    {t("common.relationship") || "العلاقة"}
                    <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded-full mr-1">{t("studentForm.determinesAddress") || "يؤثر على الرسائل"}</span>
                  </label>
                  <div className="relative">
                    <select value={form.guardianInfo.relationship} onChange={e => onChange("guardianInfo.relationship", e.target.value)} className={`${selectBase} text-right`}>
                      <option value="father">{t("studentForm.relationship.father") || "الأب"} 👨</option>
                      <option value="mother">{t("studentForm.relationship.mother") || "الأم"} 👩</option>
                      <option value="guardian">{t("studentForm.relationship.guardian") || "ولي أمر"} 👤</option>
                      <option value="other">{t("studentForm.relationship.other") || "أخرى"}</option>
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className={labelBase}>{t("common.phone") || "الهاتف"}</label>
                  <input type="tel" value={form.guardianInfo.phone} onChange={e => onChange("guardianInfo.phone", e.target.value)} placeholder="+201234567890" className={`${inputBase} text-right`} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={labelBase}>
                    <MessageCircle className="inline w-3.5 h-3.5 ml-1 text-green-500" />
                    {t("common.whatsapp") || "واتساب"}
                    <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded-full mr-1">{t("studentForm.forMessages") || "للرسائل"}</span>
                  </label>
                  <input type="tel" value={form.guardianInfo.whatsappNumber} onChange={e => onChange("guardianInfo.whatsappNumber", e.target.value)} placeholder="01234567890" className={`${inputBase} text-right`} />
                </div>
                <div className="space-y-2">
                  <label className={labelBase}>{t("common.email") || "البريد الإلكتروني"}</label>
                  <input type="email" value={form.guardianInfo.email} onChange={e => onChange("guardianInfo.email", e.target.value)} placeholder="guardian@example.com" className={`${inputBase} text-right`} />
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════
              STEP 4 — Enrollment
          ════════════════════════════════════════════ */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: t("studentForm.source") || "مصدر التسجيل", path: "enrollmentInfo.source", value: form.enrollmentInfo.source,
                    options: [{ value: "Website", label: "الموقع الإلكتروني" },{ value: "Referral", label: "إحالة" },{ value: "Marketing", label: "تسويق" },{ value: "Walk-in", label: "حضور مباشر" }] },
                  { label: t("studentForm.status") || "الحالة", path: "enrollmentInfo.status", value: form.enrollmentInfo.status,
                    options: [{ value: "Active", label: "نشط" },{ value: "Suspended", label: "موقوف" },{ value: "Graduated", label: "متخرج" },{ value: "Dropped", label: "منسحب" }] },
                  { label: t("studentForm.academicLevel") || "المستوى الأكاديمي", path: "academicInfo.level", value: form.academicInfo.level,
                    options: [{ value: "Beginner", label: "مبتدئ" },{ value: "Intermediate", label: "متوسط" },{ value: "Advanced", label: "متقدم" }] },
                ].map(({ label, path, value, options }) => (
                  <div key={path} className="space-y-2">
                    <label className={labelBase}>{label}</label>
                    <div className="relative">
                      <select value={value} onChange={e => onChange(path, e.target.value)} className={`${selectBase} text-right`}>
                        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════
              STEP 5 — Preferences
          ════════════════════════════════════════════ */}
          {step === 5 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className={labelBase}><GlobeIcon className="inline w-3.5 h-3.5 ml-1" />{t("studentForm.preferredLanguage") || "اللغة المفضلة"}</label>
                    <div className="relative">
                      <select value={form.communicationPreferences.preferredLanguage} onChange={e => onChange("communicationPreferences.preferredLanguage", e.target.value)} className={`${selectBase} text-right`}>
                        <option value="ar">{t("common.arabic") || "العربية"}</option>
                        <option value="en">{t("common.english") || "الإنجليزية"}</option>
                      </select>
                      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer p-3.5 rounded-xl border border-gray-200 dark:border-dark_border bg-white dark:bg-dark_input hover:border-primary/40 transition-colors">
                    <input type="checkbox" checked={form.communicationPreferences.marketingOptIn} onChange={e => onChange("communicationPreferences.marketingOptIn", e.target.checked)} className="w-4 h-4 accent-primary rounded" />
                    <span className="text-sm text-gray-700 dark:text-white">{t("studentForm.marketingOptIn") || "الاشتراك في العروض"}</span>
                  </label>
                </div>
                <div className="space-y-2">
                  <label className={labelBase}><Bell className="inline w-3.5 h-3.5 ml-1" />{t("studentForm.notificationChannels") || "قنوات الإشعارات"}</label>
                  <div className="border border-gray-200 dark:border-dark_border rounded-xl overflow-hidden">
                    {Object.entries(form.communicationPreferences.notificationChannels).map(([channel, enabled], i, arr) => (
                      <div key={channel} className={`flex items-center justify-between px-4 py-3 ${i < arr.length - 1 ? "border-b border-gray-100 dark:border-gray-800" : ""}`}>
                        <button type="button" onClick={() => onChange("communicationPreferences.notificationChannels", { ...form.communicationPreferences.notificationChannels, [channel]: !enabled })} className={`relative w-10 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${enabled ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"}`}>
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${enabled ? "right-1" : "left-1"}`} />
                        </button>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700 dark:text-white">{t(`studentForm.channel.${channel}`) || channel}</span>
                          {channel === "email"    && <Mail          className="w-4 h-4 text-gray-400" />}
                          {channel === "whatsapp" && <MessageCircle className="w-4 h-4 text-green-500" />}
                          {channel === "sms"      && <Smartphone    className="w-4 h-4 text-gray-400" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════
              STEP 6 — WhatsApp Messages
          ════════════════════════════════════════════ */}
          {step === 6 && (
            <div className="space-y-5">
              <div className="flex items-center justify-end gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 flex-wrap">
                {(loadingTemplates || loadingVars) && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                  <Zap className="w-3 h-3" />
                  <span>{t("studentForm.previewUpdatesAutomatically") || "المعاينة تتحدث تلقائيًا"}</span>
                </div>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${form.personalInfo.gender === "Male" ? "bg-blue-50 text-blue-700" : "bg-pink-50 text-pink-700"}`}>
                  {form.personalInfo.gender === "Male" ? "👦 ذكر" : "👧 أنثى"}
                </span>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span className="text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                  {getGuardianIcon()} {t(`studentForm.relationship.${form.guardianInfo.relationship}`) || form.guardianInfo.relationship}
                </span>
              </div>

              {[
                { type: "student",  color: "purple", num: 1, label: t("studentForm.studentMessage")  || "رسالة الطالب",    emoji: form.personalInfo.gender === "Male" ? "👦" : "👧", vars: studentVariables,  showHints: showStudentHints,  ref: studentTextareaRef,  hintsRef: studentHintsRef,  msgKey: "secondMessage", templateKey: "student"  },
                { type: "guardian", color: "blue",   num: 2, label: t("studentForm.guardianMessage") || "رسالة ولي الأمر", emoji: getGuardianIcon(),                               vars: guardianVariables, showHints: showGuardianHints, ref: guardianTextareaRef, hintsRef: guardianHintsRef, msgKey: "firstMessage",  templateKey: "guardian" },
              ].map(({ type, color, num, label, emoji, vars, showHints, ref, hintsRef, msgKey, templateKey }) => {
                const C = {
                  purple: { bg: "bg-purple-50/50 dark:bg-purple-900/10", border: "border-purple-100 dark:border-purple-900/40", numBg: "bg-purple-600", headerText: "text-purple-700 dark:text-purple-300", textaBorder: "border-purple-200 dark:border-purple-800", ring: "focus:ring-purple-400", previewBorder: "border-r-4 border-r-purple-500", savingText: "text-purple-600", btn: "text-purple-600 hover:bg-purple-50" },
                  blue:   { bg: "bg-blue-50/50 dark:bg-blue-900/10",     border: "border-blue-100 dark:border-blue-900/40",     numBg: "bg-blue-600",   headerText: "text-blue-700 dark:text-blue-300",     textaBorder: "border-blue-200 dark:border-blue-800",   ring: "focus:ring-blue-400",   previewBorder: "border-r-4 border-r-blue-500",   savingText: "text-blue-600",   btn: "text-blue-600 hover:bg-blue-50" },
                }[color];
                const val     = type === "student" ? form.whatsappCustomMessages?.secondMessage || "" : form.whatsappCustomMessages?.firstMessage || "";
                const sv      = type === "student" ? savingTemplate.student : savingTemplate.guardian;
                const tmpl    = templates[templateKey];
                const isDirty = val && tmpl?.content && val !== tmpl.content;
                return (
                  <div key={type} className={`rounded-2xl border p-5 space-y-4 ${C.bg} ${C.border}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {sv && <span className={`text-xs flex items-center gap-1 ${C.savingText}`}><Loader2 className="w-3 h-3 animate-spin" />{t("common.saving") || "جاري الحفظ"}...</span>}
                        {isDirty && (
                          <button type="button" onClick={() => resetToDefaultTemplate(templateKey)} className={`text-xs flex items-center gap-1 ${C.btn} px-2 py-1 rounded-lg transition-colors`}>
                            <RefreshCw className="w-3 h-3" />{t("studentForm.restoreDefault") || "استعادة"}
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-bold ${C.headerText}`}>{label} {emoji}</h4>
                        <span className={`w-6 h-6 ${C.numBg} text-white text-xs font-bold rounded-full flex items-center justify-center`}>{num}</span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">@ {t("studentForm.forVariables") || "للمتغيرات"}</span>
                        <span className="text-xs text-gray-400">{t("studentForm.messageText") || "نص الرسالة"}</span>
                      </div>
                      <textarea ref={ref} value={val} onChange={e => handleTextareaInput(e, type)} onKeyDown={e => handleHintsKeyDown(e, type)} className={`w-full px-4 py-3 border-2 ${C.textaBorder} rounded-xl focus:outline-none focus:ring-2 ${C.ring} dark:bg-dark_input dark:text-white resize-none h-32 text-sm text-right`} dir="rtl" placeholder={t("studentForm.messagePlaceholder") || "اكتب الرسالة هنا..."} />
                      {showHints && (
                        <div ref={hintsRef} className="absolute z-50 w-full mt-1 bg-white dark:bg-darklight border border-gray-200 dark:border-dark_border rounded-2xl shadow-xl max-h-52 overflow-y-auto">
                          <div className="p-2.5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t("studentForm.availableVariables") || "المتغيرات المتاحة"}</span>
                          </div>
                          {vars.map((v, i) => (
                            <button key={v.key} type="button" onClick={() => insertVariable(v, type)} className={`w-full px-4 py-2.5 text-right hover:bg-gray-50 dark:hover:bg-gray-800 flex items-start gap-2 ${i === selectedHintIndex ? "bg-gray-50 dark:bg-gray-800" : ""}`}>
                              <span className="text-lg">{v.icon}</span>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-400">{v.label}</span>
                                  <code className="text-xs text-primary font-mono">{v.key}</code>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">{t("common.example") || "مثال"}: {v.example}</p>
                              </div>
                            </button>
                          ))}
                          <div className="p-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 text-center">↑↓ للتنقل · Enter للإدراج · Esc للإغلاق</div>
                        </div>
                      )}
                    </div>
                    <div className="bg-white dark:bg-dark_input rounded-xl p-3.5 border border-gray-100 dark:border-gray-800">
                      <div className="flex items-center justify-end gap-1.5 mb-2">
                        <span className="text-xs font-medium text-gray-500">{t("studentForm.livePreview") || "معاينة مباشرة"}</span>
                        <Eye className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                      <div className={`bg-gray-50 dark:bg-gray-800/60 rounded-lg p-3 ${C.previewBorder} text-sm whitespace-pre-line max-h-36 overflow-y-auto text-gray-700 dark:text-gray-300 text-right leading-relaxed`}>
                        {(type === "student" ? messagePreview.student : messagePreview.guardian) || <span className="text-gray-400">{t("studentForm.noMessage") || "لا توجد رسالة"}</span>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{val.length} {t("common.characters") || "حرف"}</span>
                      <span>@ {t("studentForm.variablesHint") || "للمتغيرات"} · {t("studentForm.autoSave") || "يُحفظ تلقائيًا"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* ── Footer ── */}
      <div className="bg-white dark:bg-darkmode border-t border-gray-100 dark:border-dark_border px-6 py-4">
        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mb-3">
          <Shield className="w-3.5 h-3.5" />
          <span>{t("studentForm.secureData") || "بيانات مشفرة وآمنة"}</span>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={step === 0 ? onClose : prev} disabled={loading} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border-2 border-gray-200 dark:border-dark_border font-semibold text-sm text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-all">
            {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {step === 0 ? (t("common.cancel") || "إلغاء") : (t("common.back") || "رجوع")}
          </button>
          {isLastStep ? (
            <button type="button" onClick={submit} disabled={loading || loadingTemplates || (selectedStudent && !selectedStudent.isManual && emailCheckStatus === "taken")} className="flex-1 bg-primary hover:bg-orange-600 text-white py-2.5 px-6 rounded-xl font-bold text-sm shadow-sm hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />{initial?.id ? t("common.updating") : t("common.creating")}</>
                : <><Save className="w-4 h-4" />{initial?.id ? (t("common.update") || "تحديث") : (t("common.create") || "إنشاء الطالب")}</>
              }
            </button>
          ) : (
            <button type="button" onClick={next} className="flex-1 bg-primary hover:bg-orange-600 text-white py-2.5 px-6 rounded-xl font-bold text-sm shadow-sm hover:shadow-md flex items-center justify-center gap-2 transition-all">
              {t("common.next") || "التالي"}
              {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </div>
        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {STEPS.map((_, i) => (
            <button key={i} type="button" onClick={() => goTo(i)} className={`rounded-full transition-all duration-300 ${i === step ? "w-5 h-2 bg-primary" : i < step ? "w-2 h-2 bg-primary/40" : "w-2 h-2 bg-gray-200 dark:bg-gray-700"}`} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes sf-slideIn  { from { opacity: 0; transform: translateX(24px);  } to { opacity: 1; transform: translateX(0); } }
        @keyframes sf-slideOut { from { opacity: 0; transform: translateX(-24px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}