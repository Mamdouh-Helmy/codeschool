"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  User, Mail, Phone, Calendar, Users, BookOpen, Globe, Save, X,
  ChevronDown, Search, Plus, CheckCircle, Lock, Shield, Home,
  MessageCircle, Bell, GlobeIcon, Hash, AlertCircle, Info,
  UserCircle, Languages, Sparkles, MessageSquare, RefreshCw,
  Eye, Zap, Loader2, Database, MapPin, Smartphone
} from "lucide-react";
import toast from "react-hot-toast";
import { useI18n } from "@/i18n/I18nProvider";

export default function StudentForm({ initial, onClose, onSaved }) {
  const { t, locale } = useI18n();

  // الحالة الرئيسية
  const [form, setForm] = useState(() => ({
    authUserId: initial?.authUserId?._id || "",
    personalInfo: {
      fullName: initial?.personalInfo?.fullName || "",
      nickname: {
        ar: initial?.personalInfo?.nickname?.ar || "",
        en: initial?.personalInfo?.nickname?.en || ""
      },
      email: initial?.personalInfo?.email || "",
      phone: initial?.personalInfo?.phone || "",
      whatsappNumber: initial?.personalInfo?.whatsappNumber || "",
      dateOfBirth: initial?.personalInfo?.dateOfBirth?.split('T')[0] || "",
      gender: initial?.personalInfo?.gender || "Male",
      nationalId: initial?.personalInfo?.nationalId || "",
      address: {
        street: initial?.personalInfo?.address?.street || "",
        city: initial?.personalInfo?.address?.city || "",
        state: initial?.personalInfo?.address?.state || "",
        postalCode: initial?.personalInfo?.address?.postalCode || "",
        country: initial?.personalInfo?.address?.country || ""
      }
    },
    guardianInfo: {
      name: initial?.guardianInfo?.name || "",
      nickname: {
        ar: initial?.guardianInfo?.nickname?.ar || "",
        en: initial?.guardianInfo?.nickname?.en || ""
      },
      relationship: initial?.guardianInfo?.relationship || "father",
      phone: initial?.guardianInfo?.phone || "",
      whatsappNumber: initial?.guardianInfo?.whatsappNumber || "",
      email: initial?.guardianInfo?.email || ""
    },
    enrollmentInfo: {
      source: initial?.enrollmentInfo?.source || "Website",
      referredBy: initial?.enrollmentInfo?.referredBy || "",
      status: initial?.enrollmentInfo?.status || "Active"
    },
    academicInfo: {
      level: initial?.academicInfo?.level || "Beginner",
      groupIds: initial?.academicInfo?.groupIds || [],
      currentCourses: initial?.academicInfo?.currentCourses || []
    },
    communicationPreferences: {
      preferredLanguage: initial?.communicationPreferences?.preferredLanguage || "ar",
      notificationChannels: initial?.communicationPreferences?.notificationChannels || {
        email: true,
        whatsapp: true,
        sms: false
      },
      marketingOptIn: initial?.communicationPreferences?.marketingOptIn || true
    },
    whatsappCustomMessages: {
      firstMessage: initial?.whatsappCustomMessages?.firstMessage || "",
      secondMessage: initial?.whatsappCustomMessages?.secondMessage || ""
    }
  }));

  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [manualStudents, setManualStudents] = useState([]);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  // حالة القوالب
  const [templates, setTemplates] = useState({
    student: null,
    guardian: null
  });
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState({ student: false, guardian: false });

  // معاينة الرسائل
  const [messagePreview, setMessagePreview] = useState({
    student: "",
    guardian: ""
  });

  // حالة hints
  const [showStudentHints, setShowStudentHints] = useState(false);
  const [showGuardianHints, setShowGuardianHints] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ student: 0, guardian: 0 });
  const [selectedHintIndex, setSelectedHintIndex] = useState(0);

  // Refs
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const studentTextareaRef = useRef(null);
  const guardianTextareaRef = useRef(null);
  const studentHintsRef = useRef(null);
  const guardianHintsRef = useRef(null);

  // المتغيرات المتاحة
  const studentVariables = [
    { key: "{name_ar}", label: t("studentForm.studentNicknameArabic"), icon: "👤", description: t("studentForm.nicknameArabicHint"), example: form.personalInfo.nickname?.ar || "أحمد" },
    { key: "{name_en}", label: t("studentForm.studentNicknameEnglish"), icon: "👤", description: t("studentForm.nicknameEnglishHint"), example: form.personalInfo.nickname?.en || "Ahmed" },
    { key: "{fullName}", label: t("studentForm.fullName"), icon: "📝", description: t("studentForm.fullName"), example: form.personalInfo.fullName || "أحمد محمد" },
    { key: "{salutation_ar}", label: "التحية (عربي)", icon: "👋", description: "عزيزي/عزيزتي", example: form.personalInfo.gender === "Male" ? "عزيزي الطالب" : "عزيزتي الطالبة" },
    { key: "{salutation_en}", label: "التحية (إنجليزي)", icon: "👋", description: "Dear student", example: "Dear student" },
    { key: "{you_ar}", label: "أنت/أنتِ", icon: "💬", description: "ضمير المخاطب", example: form.personalInfo.gender === "Male" ? "أنت" : "أنتِ" },
    { key: "{welcome_ar}", label: "الترحيب", icon: "🎉", description: "أهلاً بك/بكِ", example: form.personalInfo.gender === "Male" ? "أهلاً بك" : "أهلاً بكِ" },
  ];

  const guardianVariables = [
    { key: "{guardianName_ar}", label: t("studentForm.guardianNicknameArabic"), icon: "👤", description: t("studentForm.guardianNicknameHint"), example: form.guardianInfo.nickname?.ar || "محمد" },
    { key: "{guardianName_en}", label: t("studentForm.guardianNicknameEnglish"), icon: "👤", description: t("studentForm.guardianNicknameHint"), example: form.guardianInfo.nickname?.en || "Mohamed" },
    { key: "{studentName_ar}", label: t("studentForm.studentNicknameArabic"), icon: "👶", description: t("studentForm.nicknameArabicHint"), example: form.personalInfo.nickname?.ar || "أحمد" },
    { key: "{studentName_en}", label: t("studentForm.studentNicknameEnglish"), icon: "👶", description: t("studentForm.nicknameEnglishHint"), example: form.personalInfo.nickname?.en || "Ahmed" },
    { key: "{fullStudentName}", label: t("studentForm.fullName"), icon: "📝", description: "الاسم الكامل", example: form.personalInfo.fullName || "أحمد" },
    { key: "{relationship_ar}", label: "العلاقة", icon: "👨‍👩‍👦", description: t("studentForm.relationship"), example: form.guardianInfo.relationship === "father" ? t("studentForm.relationship.father") : t("studentForm.relationship.mother") },
    { key: "{studentGender_ar}", label: "جنس الطالب", icon: "⚧", description: "الابن/الابنة", example: form.personalInfo.gender === "Male" ? "الابن" : "الابنة" },
    { key: "{guardianSalutation_ar}", label: "التحية الكاملة", icon: "👋", description: "عزيزي الأستاذ + الاسم", example: `عزيزي الأستاذ ${form.guardianInfo.nickname?.ar || "محمد"}` },
  ];

  // ✅ استبدال المتغيرات في المعاينة - useCallback لضمان التحديث الصحيح
  const replaceVariables = useCallback((message) => {
    if (!message) return "";

    const gender = form.personalInfo.gender || "Male";
    const studentName = form.personalInfo.fullName || t("studentForm.student");
    const studentNickname = form.personalInfo.nickname?.ar || studentName.split(" ")[0];
    const studentNicknameEn = form.personalInfo.nickname?.en || studentName.split(" ")[0];

    const guardianName = form.guardianInfo.name || t("studentForm.guardian");
    const guardianNickname = form.guardianInfo.nickname?.ar || guardianName.split(" ")[0];
    const guardianNicknameEn = form.guardianInfo.nickname?.en || guardianName.split(" ")[0];
    const relationship = form.guardianInfo.relationship || "father";

    // ✅ التحية تعتمد على الجنس
    const isMale = gender === "Male";
    const studentSalutationAr = isMale
      ? `${t("common.dear.male")} ${studentNickname}`
      : `${t("common.dear.female")} ${studentNickname}`;
    const studentSalutationEn = `Dear student ${studentNicknameEn}`;

    // ✅ تحية ولي الأمر تعتمد على العلاقة
    let guardianSalutationAr = "";
    switch (relationship) {
      case "father":
        guardianSalutationAr = `${t("common.dear.father")} ${guardianNickname}`;
        break;
      case "mother":
        guardianSalutationAr = `${t("common.dear.mother")} ${guardianNickname}`;
        break;
      case "guardian":
        guardianSalutationAr = `${t("common.dear.guardian")} ${guardianNickname}`;
        break;
      default:
        guardianSalutationAr = `${t("common.dear.other")} ${guardianNickname}`;
    }

    // ✅ الابن/الابنة يعتمد على الجنس
    const studentTitleAr = isMale ? t("common.son") : t("common.daughter");

    return message
      .replace(/{name_ar}/g, studentNickname)
      .replace(/{name_en}/g, studentNicknameEn)
      .replace(/{fullName}/g, studentName)
      .replace(/{salutation_ar}/g, studentSalutationAr)
      .replace(/{salutation_en}/g, studentSalutationEn)
      .replace(/{you_ar}/g, isMale ? t("common.you.male") : t("common.you.female"))
      .replace(/{welcome_ar}/g, isMale ? t("common.welcome.male") : t("common.welcome.female"))
      .replace(/{guardianName_ar}/g, guardianNickname)
      .replace(/{guardianName_en}/g, guardianNicknameEn)
      .replace(/{studentName_ar}/g, studentNickname)
      .replace(/{studentName_en}/g, studentNicknameEn)
      .replace(/{fullStudentName}/g, studentName)
      .replace(/{relationship_ar}/g,
        relationship === "father" ? t("studentForm.relationship.father") :
        relationship === "mother" ? t("studentForm.relationship.mother") :
        relationship === "guardian" ? t("studentForm.relationship.guardian") : t("studentForm.relationship.other"))
      .replace(/{studentGender_ar}/g, studentTitleAr)
      .replace(/{guardianSalutation_ar}/g, guardianSalutationAr);
  }, [
    // ✅ كل التبعيات التي تؤثر على المعاينة
    form.personalInfo.gender,
    form.personalInfo.fullName,
    form.personalInfo.nickname?.ar,
    form.personalInfo.nickname?.en,
    form.guardianInfo.name,
    form.guardianInfo.nickname?.ar,
    form.guardianInfo.nickname?.en,
    form.guardianInfo.relationship,
    t
  ]);

  // جلب القوالب من الباك إند
  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await fetch("/api/whatsapp/templates?default=true");
      const data = await response.json();

      if (data.success && data.data.length > 0) {
        const studentTemplate = data.data.find(t => t.templateType === "student_welcome");
        const guardianTemplate = data.data.find(t => t.templateType === "guardian_notification");

        setTemplates({
          student: studentTemplate,
          guardian: guardianTemplate
        });

        // استخدم القوالب إذا لم يكن هناك رسائل مخصصة
        if (!form.whatsappCustomMessages?.secondMessage && studentTemplate) {
          onChange('whatsappCustomMessages.secondMessage', studentTemplate.content);
        }
        if (!form.whatsappCustomMessages?.firstMessage && guardianTemplate) {
          onChange('whatsappCustomMessages.firstMessage', guardianTemplate.content);
        }
      }
    } catch (error) {
      console.error("❌ Error fetching templates:", error);
      toast.error(t("common.error"));
    } finally {
      setLoadingTemplates(false);
    }
  };

  // حفظ التعديلات على القالب
  const saveTemplateUpdate = async (templateType, content) => {
    const key = templateType === "student_welcome" ? "student" : "guardian";
    setSavingTemplate(prev => ({ ...prev, [key]: true }));

    try {
      const template = templates[key];
      if (!template) return;

      const response = await fetch("/api/whatsapp/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: template._id,
          content: content,
          setAsDefault: true
        })
      });

      const data = await response.json();

      if (data.success) {
        setTemplates(prev => ({ ...prev, [key]: data.data }));
        toast.success(t("common.saved"), { duration: 1500 });
      }
    } catch (error) {
      console.error("❌ Error saving template:", error);
      toast.error(t("common.error"));
    } finally {
      setSavingTemplate(prev => ({ ...prev, [key]: false }));
    }
  };

  // جلب القوالب عند التحميل
  useEffect(() => {
    fetchTemplates();
  }, []);

  // حفظ تلقائي للرسائل
  useEffect(() => {
    const timer = setTimeout(() => {
      if (form.whatsappCustomMessages?.secondMessage && templates.student) {
        if (form.whatsappCustomMessages.secondMessage !== templates.student.content) {
          saveTemplateUpdate("student_welcome", form.whatsappCustomMessages.secondMessage);
        }
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [form.whatsappCustomMessages?.secondMessage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (form.whatsappCustomMessages?.firstMessage && templates.guardian) {
        if (form.whatsappCustomMessages.firstMessage !== templates.guardian.content) {
          saveTemplateUpdate("guardian_notification", form.whatsappCustomMessages.firstMessage);
        }
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [form.whatsappCustomMessages?.firstMessage]);

  // ✅ تحديث المعاينة - يعتمد على replaceVariables الذي يعتمد على كل الحقول المهمة
  useEffect(() => {
    setMessagePreview({
      student: replaceVariables(form.whatsappCustomMessages?.secondMessage || templates.student?.content || ""),
      guardian: replaceVariables(form.whatsappCustomMessages?.firstMessage || templates.guardian?.content || "")
    });
  }, [replaceVariables, form.whatsappCustomMessages, templates]);

  // معالجة إدخال النص
  const handleTextareaInput = (e, type) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;

    if (type === 'student') {
      onChange('whatsappCustomMessages.secondMessage', value);
      setCursorPosition(prev => ({ ...prev, student: cursorPos }));

      const textBeforeCursor = value.substring(0, cursorPos);
      const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

      if (lastAtSymbol !== -1 && lastAtSymbol === cursorPos - 1) {
        setShowStudentHints(true);
        setSelectedHintIndex(0);
      } else if (showStudentHints && lastAtSymbol === -1) {
        setShowStudentHints(false);
      }
    } else {
      onChange('whatsappCustomMessages.firstMessage', value);
      setCursorPosition(prev => ({ ...prev, guardian: cursorPos }));

      const textBeforeCursor = value.substring(0, cursorPos);
      const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

      if (lastAtSymbol !== -1 && lastAtSymbol === cursorPos - 1) {
        setShowGuardianHints(true);
        setSelectedHintIndex(0);
      } else if (showGuardianHints && lastAtSymbol === -1) {
        setShowGuardianHints(false);
      }
    }
  };

  // إدراج متغير
  const insertVariable = (variable, type) => {
    const textarea = type === 'student' ? studentTextareaRef.current : guardianTextareaRef.current;
    const currentValue = type === 'student'
      ? form.whatsappCustomMessages?.secondMessage || ""
      : form.whatsappCustomMessages?.firstMessage || "";
    const cursorPos = type === 'student' ? cursorPosition.student : cursorPosition.guardian;

    const textBeforeCursor = currentValue.substring(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    let newValue;
    let newCursorPos;

    if (lastAtSymbol !== -1) {
      newValue = currentValue.substring(0, lastAtSymbol) + variable.key + currentValue.substring(cursorPos);
      newCursorPos = lastAtSymbol + variable.key.length;
    } else {
      newValue = currentValue.substring(0, cursorPos) + variable.key + currentValue.substring(cursorPos);
      newCursorPos = cursorPos + variable.key.length;
    }

    if (type === 'student') {
      onChange('whatsappCustomMessages.secondMessage', newValue);
      setShowStudentHints(false);
      setCursorPosition(prev => ({ ...prev, student: newCursorPos }));
    } else {
      onChange('whatsappCustomMessages.firstMessage', newValue);
      setShowGuardianHints(false);
      setCursorPosition(prev => ({ ...prev, guardian: newCursorPos }));
    }

    setTimeout(() => {
      textarea?.focus();
      textarea?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // معالجة مفاتيح لوحة المفاتيح
  const handleHintsKeyDown = (e, type) => {
    const variables = type === 'student' ? studentVariables : guardianVariables;
    const showHints = type === 'student' ? showStudentHints : showGuardianHints;

    if (!showHints) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedHintIndex(prev => (prev + 1) % variables.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedHintIndex(prev => (prev - 1 + variables.length) % variables.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertVariable(variables[selectedHintIndex], type);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (type === 'student') {
        setShowStudentHints(false);
      } else {
        setShowGuardianHints(false);
      }
    }
  };

  // جلب الطلاب
  useEffect(() => {
    const fetchStudents = async () => {
      setStudentsLoading(true);
      try {
        const res = await fetch("/api/students");
        if (!res.ok) throw new Error("Failed to fetch students");
        const data = await res.json();
        if (data.success) setStudents(data.data || []);
      } catch (error) {
        console.error("Error fetching students:", error);
        toast.error(t("students.loadError"));
      } finally {
        setStudentsLoading(false);
      }
    };
    fetchStudents();
  }, []);

  // إغلاق dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setShowUserDropdown(false);
      if (studentHintsRef.current && !studentHintsRef.current.contains(event.target)) setShowStudentHints(false);
      if (guardianHintsRef.current && !guardianHintsRef.current.contains(event.target)) setShowGuardianHints(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // تحميل البيانات الأولية
  useEffect(() => {
    if (initial?.authUserId) {
      const studentName = initial.personalInfo?.fullName || initial.authUserId?.name || "";
      setStudentSearch(studentName);
      setSelectedStudent({
        _id: initial.authUserId._id,
        name: studentName,
        email: initial.authUserId.email
      });
    } else if (initial && !initial.authUserId) {
      setStudentSearch(initial.personalInfo?.fullName || "");
    }
  }, [initial]);

  // دالة تحديث الحقول
  const onChange = (path, value) => {
    const paths = path.split('.');
    setForm(prev => {
      const newForm = JSON.parse(JSON.stringify(prev));
      let current = newForm;
      for (let i = 0; i < paths.length - 1; i++) {
        if (!current[paths[i]]) current[paths[i]] = {};
        current = current[paths[i]];
      }
      current[paths[paths.length - 1]] = value;
      return newForm;
    });
  };

  // تحديث العنوان
  const handleAddressChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        address: { ...prev.personalInfo.address, [field]: value }
      }
    }));
  };

  // إضافة طالب يدوي
  const addManualStudent = (name) => {
    if (name.trim() && !manualStudents.some(s => s.name === name.trim())) {
      const newStudent = {
        _id: `manual_${Date.now()}`,
        name: name.trim(),
        email: "",
        role: "student",
        isManual: true
      };
      setManualStudents(prev => [...prev, newStudent]);
      return newStudent;
    }
    return null;
  };

  // اختيار طالب
  const handleStudentSelect = (student) => {
    if (!student.isManual) {
      setSelectedStudent(student);
      onChange('personalInfo.fullName', student.name);
      onChange('personalInfo.email', student.email);
      onChange('authUserId', student._id);
    } else {
      setSelectedStudent(null);
      onChange('personalInfo.fullName', student.name);
      onChange('authUserId', "");
    }
    setStudentSearch(student.name);
    setShowUserDropdown(false);
  };

  // تغيير اسم الطالب
  const handleInputChange = (e) => {
    const value = e.target.value;
    onChange('personalInfo.fullName', value);
    setStudentSearch(value);
    if (selectedStudent && value !== selectedStudent.name) {
      setSelectedStudent(null);
      onChange('authUserId', "");
    }
  };

  // تصفية الطلاب
  const filteredStudents = students.filter(s =>
    s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const filteredManualStudents = manualStudents.filter(s =>
    s.name?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const isNameInLists = studentSearch.trim() &&
    (filteredStudents.some(s => s.name?.toLowerCase() === studentSearch.toLowerCase()) ||
     filteredManualStudents.some(s => s.name?.toLowerCase() === studentSearch.toLowerCase()));

  // إعادة تعيين القالب
  const resetToDefaultTemplate = (type) => {
    if (type === 'student' && templates.student) {
      onChange('whatsappCustomMessages.secondMessage', templates.student.content);
      toast.success(t("studentForm.templateRestored"), { duration: 2000 });
    } else if (type === 'guardian' && templates.guardian) {
      onChange('whatsappCustomMessages.firstMessage', templates.guardian.content);
      toast.success(t("studentForm.templateRestored"), { duration: 2000 });
    }
  };

  // إرسال الفورم
  const submit = async (e) => {
    e.preventDefault();

    if (!selectedStudent && form.personalInfo.fullName) {
      if (password !== passwordConfirm) {
        toast.error(t("studentForm.passwordMismatch"));
        return;
      }
      if (password.length < 6) {
        toast.error(t("studentForm.passwordLength"));
        return;
      }
    }

    setLoading(true);
    const toastId = toast.loading(initial?.id ? t("common.updating") : t("common.creating"));

    try {
      let userId = form.authUserId;

      if (!selectedStudent || (selectedStudent && selectedStudent.isManual)) {
        const userRes = await fetch("/api/allStudents/createUser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.personalInfo.fullName,
            email: form.personalInfo.email,
            password: password,
            role: "student"
          }),
        });

        const userData = await userRes.json();
        if (!userRes.ok) throw new Error(userData.message);
        userId = userData.user?.id;
      }

      let dateOfBirthISO = null;
      if (form.personalInfo.dateOfBirth) {
        const dateObj = new Date(form.personalInfo.dateOfBirth + 'T12:00:00');
        if (isNaN(dateObj.getTime())) throw new Error(t("studentForm.invalidDate"));
        dateOfBirthISO = dateObj.toISOString();
      }

      const studentPayload = {
        ...form,
        authUserId: userId,
        personalInfo: {
          ...form.personalInfo,
          dateOfBirth: dateOfBirthISO
        }
      };

      const studentId = initial?.id || initial?._id;
      const method = studentId ? "PUT" : "POST";
      const url = studentId ? `/api/allStudents/${studentId}` : "/api/allStudents";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentPayload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      if (result.success) {
        toast.success(studentId ? t("common.updated") : t("common.created"), { id: toastId });

        if (!studentId && result.data?.whatsappAutomation?.triggered) {
          toast.success(t("studentForm.whatsappSending"), { duration: 3000 });
        }

        onSaved();
        onClose();
      }
    } catch (err) {
      console.error("❌ Error:", err);
      toast.error(err.message || t("common.error"), { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  // ✅ مساعد: أيقونة ولي الأمر حسب العلاقة
  const getGuardianIcon = () => {
    switch (form.guardianInfo.relationship) {
      case "father": return "👨";
      case "mother": return "👩";
      default: return "👤";
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {/* Student Selection */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">{t("studentForm.personalInfo")}</h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">{t("studentForm.personalDescription")}</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <Hash className="w-3 h-3" />
            {t("studentForm.fullName")}
          </label>

          <div className="relative" ref={dropdownRef}>
            <input
              ref={inputRef}
              type="text"
              value={form.personalInfo.fullName}
              onChange={handleInputChange}
              onFocus={() => setShowUserDropdown(true)}
              placeholder={t("studentForm.searchPlaceholder")}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary dark:bg-dark_input dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              disabled={loading}
            />
            <ChevronDown className={`absolute ${locale === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500`} />

            {showUserDropdown && (
              <div className="absolute z-20 w-full mt-1 bg-white dark:bg-darklight border border-PowderBlueBorder dark:border-dark_border rounded-lg shadow-lg dark:shadow-darkmd max-h-60 overflow-y-auto">
                <div className="p-2 border-b border-PowderBlueBorder dark:border-dark_border relative">
                  <Search className={`absolute ${locale === 'ar' ? 'right-5' : 'left-5'} top-4 w-4 h-4 text-gray-400 dark:text-gray-500`} />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder={t("common.search")}
                    className={`w-full ${locale === 'ar' ? 'pr-10 pl-3' : 'pl-10 pr-3'} py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white text-13 placeholder:text-gray-400 dark:placeholder:text-gray-500`}
                    autoFocus
                  />
                </div>

                {studentSearch.trim() && !isNameInLists && (
                  <button
                    type="button"
                    onClick={() => {
                      const newStudent = addManualStudent(studentSearch);
                      if (newStudent) handleStudentSelect(newStudent);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3 border-b border-PowderBlueBorder dark:border-dark_border"
                  >
                    <Plus className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-13 font-medium text-MidnightNavyText dark:text-white">{t("studentForm.add")} "{studentSearch}"</p>
                      <p className="text-11 text-SlateBlueText dark:text-darktext">{t("studentForm.newStudent")}</p>
                    </div>
                  </button>
                )}

                {filteredStudents.map((s) => (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() => handleStudentSelect(s)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3"
                  >
                    <User className="w-4 h-4 text-primary" />
                    <div className="flex-1">
                      <p className="text-13 font-medium text-MidnightNavyText dark:text-white truncate">{s.name}</p>
                      <p className="text-11 text-SlateBlueText dark:text-darktext truncate">{s.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedStudent && !selectedStudent.isManual && (
            <div className="text-11 text-green-600 bg-green-50 dark:bg-green-900/20 p-2 rounded flex items-center gap-2">
              <CheckCircle className="w-3 h-3" />
              {t("studentForm.existingStudent")}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <Mail className="w-3 h-3" />
            {t("common.email")}
          </label>
          <input
            type="email"
            value={form.personalInfo.email}
            onChange={(e) => onChange('personalInfo.email', e.target.value)}
            placeholder="student@example.com"
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary dark:bg-dark_input dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            disabled={selectedStudent && !selectedStudent.isManual}
            required={!selectedStudent}
          />
        </div>

        {(!selectedStudent || selectedStudent.isManual) && form.personalInfo.fullName && (
          <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h4 className="text-14 font-semibold text-MidnightNavyText dark:text-white">{t("studentForm.createAccount")}</h4>
                <p className="text-xs text-SlateBlueText dark:text-darktext">{t("studentForm.accountWillBeCreated")}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-MidnightNavyText dark:text-white mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  {t("common.password")}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  required={!selectedStudent}
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-MidnightNavyText dark:text-white mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  {t("common.confirmPassword")}
                </label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  required={!selectedStudent}
                  minLength={6}
                />
              </div>
            </div>

            {password && passwordConfirm && password !== passwordConfirm && (
              <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {t("studentForm.passwordMismatch")}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Personal Information */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">{t("studentForm.personalInfo")}</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2 flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              {t("common.dateOfBirth")}
            </label>
            <input
              type="date"
              value={form.personalInfo.dateOfBirth}
              onChange={(e) => onChange('personalInfo.dateOfBirth', e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2 flex items-center gap-2">
              <User className="w-3 h-3" />
              {t("common.gender")}
              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                {t("studentForm.determinesAddress")}
              </span>
            </label>
            {/* ✅ عند تغيير الجنس ستتحدث المعاينة تلقائياً */}
            <select
              value={form.personalInfo.gender}
              onChange={(e) => onChange('personalInfo.gender', e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
            >
              <option value="Male">{t("common.male")} 👦</option>
              <option value="Female">{t("common.female")} 👧</option>
              <option value="Other">{t("common.other")}</option>
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2 flex items-center gap-2">
              <UserCircle className="w-3 h-3 text-purple-500 dark:text-purple-400" />
              {t("studentForm.studentNicknameArabic")}
              <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">{t("studentForm.forMessages")}</span>
            </label>
            <input
              type="text"
              value={form.personalInfo.nickname?.ar || ""}
              onChange={(e) => onChange('personalInfo.nickname.ar', e.target.value)}
              placeholder={t("studentForm.nicknameArabicPlaceholder")}
              dir="rtl"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <p className="text-11 text-SlateBlueText dark:text-darktext mt-1">{t("studentForm.nicknameArabicHint")}</p>
          </div>

          <div>
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2 flex items-center gap-2">
              <Languages className="w-3 h-3" />
              {t("studentForm.studentNicknameEnglish")}
            </label>
            <input
              type="text"
              value={form.personalInfo.nickname?.en || ""}
              onChange={(e) => onChange('personalInfo.nickname.en', e.target.value)}
              placeholder={t("studentForm.nicknameEnglishPlaceholder")}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <p className="text-11 text-SlateBlueText dark:text-darktext mt-1">{t("studentForm.nicknameEnglishHint")}</p>
          </div>
        </div>

        <div>
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">{t("studentForm.nationalId")}</label>
          <input
            type="text"
            value={form.personalInfo.nationalId}
            onChange={(e) => onChange('personalInfo.nationalId', e.target.value)}
            placeholder={t("studentForm.nationalIdPlaceholder")}
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
            <Phone className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">{t("studentForm.contactInfo")}</h3>
        </div>
        <p className="text-12 text-SlateBlueText dark:text-darktext -mt-2">{t("studentForm.contactDescription")}</p>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">{t("common.phone")}</label>
            <input
              type="tel"
              value={form.personalInfo.phone}
              onChange={(e) => onChange('personalInfo.phone', e.target.value)}
              placeholder="+201234567890"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2 flex items-center gap-2">
              <MessageCircle className="w-3 h-3 text-green-500" />
              {t("common.whatsapp")}
              <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">{t("studentForm.forMessages")}</span>
            </label>
            <input
              type="tel"
              value={form.personalInfo.whatsappNumber}
              onChange={(e) => onChange('personalInfo.whatsappNumber', e.target.value)}
              placeholder="01234567890"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <p className="text-11 text-SlateBlueText dark:text-darktext mt-1">{t("studentForm.whatsappNote")}</p>
          </div>
        </div>

        {/* Address */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-13 font-medium text-MidnightNavyText dark:text-white">
            <MapPin className="w-4 h-4" />
            {t("common.address")}
          </label>
          <div className="grid md:grid-cols-2 gap-3">
            <input
              type="text"
              value={form.personalInfo.address.street}
              onChange={(e) => handleAddressChange('street', e.target.value)}
              placeholder={t("common.street")}
              className="px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <input
              type="text"
              value={form.personalInfo.address.city}
              onChange={(e) => handleAddressChange('city', e.target.value)}
              placeholder={t("common.city")}
              className="px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <input
              type="text"
              value={form.personalInfo.address.state}
              onChange={(e) => handleAddressChange('state', e.target.value)}
              placeholder={t("common.state")}
              className="px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <input
              type="text"
              value={form.personalInfo.address.postalCode}
              onChange={(e) => handleAddressChange('postalCode', e.target.value)}
              placeholder={t("common.postalCode")}
              className="px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <input
              type="text"
              value={form.personalInfo.address.country}
              onChange={(e) => handleAddressChange('country', e.target.value)}
              placeholder={t("common.country")}
              className="px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
        </div>
      </div>

      {/* Guardian Information */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">{t("studentForm.guardianInfo")}</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2 flex items-center gap-2">
              <User className="w-3 h-3" />
              {t("studentForm.guardianName")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.guardianInfo.name}
              onChange={(e) => onChange('guardianInfo.name', e.target.value)}
              placeholder={t("studentForm.guardianNamePlaceholder")}
              required
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2 flex items-center gap-2">
              <UserCircle className="w-3 h-3 text-blue-500 dark:text-blue-400" />
              {t("studentForm.guardianNicknameArabic")}
              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">{t("studentForm.forMessages")}</span>
            </label>
            <input
              type="text"
              value={form.guardianInfo.nickname?.ar || ""}
              onChange={(e) => onChange('guardianInfo.nickname.ar', e.target.value)}
              placeholder={t("studentForm.guardianNicknameArabicPlaceholder")}
              dir="rtl"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <p className="text-11 text-SlateBlueText dark:text-darktext mt-1">{t("studentForm.guardianNicknameHint")}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2 flex items-center gap-2">
              <Languages className="w-3 h-3" />
              {t("studentForm.guardianNicknameEnglish")}
            </label>
            <input
              type="text"
              value={form.guardianInfo.nickname?.en || ""}
              onChange={(e) => onChange('guardianInfo.nickname.en', e.target.value)}
              placeholder={t("studentForm.guardianNicknameEnglishPlaceholder")}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2 flex items-center gap-2">
              <Users className="w-3 h-3" />
              {t("common.relationship")} <span className="text-red-500">*</span>
              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">{t("studentForm.determinesAddress")}</span>
            </label>
            {/* ✅ عند تغيير العلاقة ستتحدث المعاينة تلقائياً */}
            <select
              value={form.guardianInfo.relationship}
              onChange={(e) => onChange('guardianInfo.relationship', e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
            >
              <option value="father">{t("studentForm.relationship.father")} 👨</option>
              <option value="mother">{t("studentForm.relationship.mother")} 👩</option>
              <option value="guardian">{t("studentForm.relationship.guardian")} 👤</option>
              <option value="other">{t("studentForm.relationship.other")}</option>
            </select>
          </div>

          <div>
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">{t("common.phone")}</label>
            <input
              type="tel"
              value={form.guardianInfo.phone}
              onChange={(e) => onChange('guardianInfo.phone', e.target.value)}
              placeholder="+201234567890"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2 flex items-center gap-2">
              <MessageCircle className="w-3 h-3 text-green-500" />
              {t("common.whatsapp")}
              <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">{t("studentForm.forMessages")}</span>
            </label>
            <input
              type="tel"
              value={form.guardianInfo.whatsappNumber}
              onChange={(e) => onChange('guardianInfo.whatsappNumber', e.target.value)}
              placeholder="01234567890"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">{t("common.email")}</label>
            <input
              type="email"
              value={form.guardianInfo.email}
              onChange={(e) => onChange('guardianInfo.email', e.target.value)}
              placeholder="guardian@example.com"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
        </div>
      </div>

      {/* Enrollment Information */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">{t("studentForm.enrollmentInfo")}</h3>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">{t("studentForm.source")}</label>
            <select
              value={form.enrollmentInfo.source}
              onChange={(e) => onChange('enrollmentInfo.source', e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
            >
              <option value="Website">{t("studentForm.source.website")}</option>
              <option value="Referral">{t("studentForm.source.referral")}</option>
              <option value="Marketing">{t("studentForm.source.marketing")}</option>
              <option value="Walk-in">{t("studentForm.source.walkin")}</option>
            </select>
          </div>

          <div>
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">{t("studentForm.status")}</label>
            <select
              value={form.enrollmentInfo.status}
              onChange={(e) => onChange('enrollmentInfo.status', e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
            >
              <option value="Active">{t("studentForm.status.active")}</option>
              <option value="Suspended">{t("studentForm.status.suspended")}</option>
              <option value="Graduated">{t("studentForm.status.graduated")}</option>
              <option value="Dropped">{t("studentForm.status.dropped")}</option>
            </select>
          </div>

          <div>
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">{t("studentForm.academicLevel")}</label>
            <select
              value={form.academicInfo.level}
              onChange={(e) => onChange('academicInfo.level', e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
            >
              <option value="Beginner">{t("studentForm.level.beginner")}</option>
              <option value="Intermediate">{t("studentForm.level.intermediate")}</option>
              <option value="Advanced">{t("studentForm.level.advanced")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Communication Preferences */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
            <Globe className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>
          <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">{t("studentForm.communicationPreferences")}</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2 flex items-center gap-2">
                <GlobeIcon className="w-3 h-3" />
                {t("studentForm.preferredLanguage")}
              </label>
              <select
                value={form.communicationPreferences.preferredLanguage}
                onChange={(e) => onChange('communicationPreferences.preferredLanguage', e.target.value)}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
              >
                <option value="ar">{t("common.arabic")}</option>
                <option value="en">{t("common.english")}</option>
              </select>
            </div>

            <div>
              <label className="flex items-center p-3 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-gray-50 dark:bg-gray-800">
                <input
                  type="checkbox"
                  checked={form.communicationPreferences.marketingOptIn}
                  onChange={(e) => onChange('communicationPreferences.marketingOptIn', e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className={`${locale === 'ar' ? 'mr-3' : 'ml-3'} text-sm text-MidnightNavyText dark:text-white`}>{t("studentForm.marketingOptIn")}</span>
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">{t("studentForm.notificationChannels")}</label>
            {Object.entries(form.communicationPreferences.notificationChannels).map(([channel, enabled]) => (
              <div key={channel} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                <div className="flex items-center gap-2">
                  {channel === 'email' && <Mail className="w-3 h-3 text-SlateBlueText dark:text-darktext" />}
                  {channel === 'whatsapp' && <MessageCircle className="w-3 h-3 text-green-500" />}
                  {channel === 'sms' && <Smartphone className="w-3 h-3 text-SlateBlueText dark:text-darktext" />}
                  <span className="text-sm text-MidnightNavyText dark:text-white capitalize">{t(`studentForm.channel.${channel}`)}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => {
                      const newChannels = {
                        ...form.communicationPreferences.notificationChannels,
                        [channel]: e.target.checked
                      };
                      onChange('communicationPreferences.notificationChannels', newChannels);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WhatsApp Messages */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white flex items-center gap-2">
                {t("studentForm.whatsappMessages")}
                <span className="text-xs bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  {t("studentForm.saved")}
                </span>
              </h3>
              <p className="text-12 text-SlateBlueText dark:text-darktext flex items-center gap-1 mt-1">
                <Zap className="w-3 h-3" />
                {t("studentForm.variablesHint")}
              </p>
            </div>
          </div>

          {loadingTemplates && (
            <div className="flex items-center gap-2 text-xs text-SlateBlueText dark:text-darktext">
              <Loader2 className="w-3 h-3 animate-spin" />
              {t("common.loading")}
            </div>
          )}
        </div>

        {/* ✅ بادج يوضح التأثير الحالي للجنس والعلاقة على الرسائل */}
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-500 dark:text-gray-400">{t("common.gender")}:</span>
            <span className={`font-semibold px-2 py-0.5 rounded-full ${
              form.personalInfo.gender === "Male"
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                : form.personalInfo.gender === "Female"
                  ? "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}>
              {form.personalInfo.gender === "Male" ? `👦 ${t("common.male")}` : form.personalInfo.gender === "Female" ? `👧 ${t("common.female")}` : t("common.other")}
            </span>
          </div>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-500 dark:text-gray-400">{t("common.relationship")}:</span>
            <span className="font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
              {getGuardianIcon()} {t(`studentForm.relationship.${form.guardianInfo.relationship}`)}
            </span>
          </div>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
            <Zap className="w-3 h-3" />
            <span>{t("studentForm.previewUpdatesAutomatically") || "المعاينة تتحدث تلقائياً"}</span>
          </div>
        </div>

        <div className="space-y-6">
          {/* رسالة الطالب */}
          <div className="space-y-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full flex items-center justify-center">1</span>
                <h4 className="text-14 font-bold text-purple-700 dark:text-purple-300">
                  {t("studentForm.studentMessage")} {form.personalInfo.gender === "Male" ? "👦" : "👧"}
                </h4>
              </div>
              {savingTemplate.student && (
                <span className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {t("common.saving")}...
                </span>
              )}
            </div>

            <div className="space-y-2 relative">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-SlateBlueText dark:text-darktext flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {t("studentForm.messageText")}
                  <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">@ {t("studentForm.forVariables")}</span>
                </label>
                {form.whatsappCustomMessages?.secondMessage && templates.student?.content &&
                 form.whatsappCustomMessages.secondMessage !== templates.student.content && (
                  <button
                    type="button"
                    onClick={() => resetToDefaultTemplate('student')}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    {t("studentForm.restoreDefault")}
                  </button>
                )}
              </div>

              <textarea
                ref={studentTextareaRef}
                value={form.whatsappCustomMessages?.secondMessage || ""}
                onChange={(e) => handleTextareaInput(e, 'student')}
                onKeyDown={(e) => handleHintsKeyDown(e, 'student')}
                className="w-full px-4 py-3 border-2 border-purple-200 dark:border-purple-800 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-dark_input dark:text-white resize-none h-40 text-sm"
                dir={locale === 'ar' ? 'rtl' : 'ltr'}
                placeholder={t("studentForm.messagePlaceholder")}
              />

              {/* Hints */}
              {showStudentHints && (
                <div ref={studentHintsRef} className="absolute z-50 w-full mt-1 bg-white dark:bg-darklight border-2 border-purple-300 dark:border-purple-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/30 border-b dark:border-purple-800">
                    <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {t("studentForm.availableVariables")}
                    </p>
                  </div>
                  {studentVariables.map((v, i) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v, 'student')}
                      className={`w-full px-3 py-2 text-right hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-start gap-2 ${
                        i === selectedHintIndex ? 'bg-purple-100 dark:bg-purple-900/40' : ''
                      }`}
                    >
                      <span className="text-lg">{v.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-mono text-purple-600 dark:text-purple-400">{v.key}</span>
                          <span className="text-xs text-SlateBlueText dark:text-darktext">{v.label}</span>
                        </div>
                        <p className="text-xs text-SlateBlueText dark:text-darktext mt-0.5">{v.description}</p>
                        <p className="text-xs text-purple-700 dark:text-purple-300 mt-1 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded inline-block">
                          {t("common.example")}: {v.example}
                        </p>
                      </div>
                    </button>
                  ))}
                  <div className="p-2 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 text-xs text-SlateBlueText dark:text-darktext">
                    ↑ ↓ {t("studentForm.forNavigation")} • Enter {t("studentForm.forInsert")} • Esc {t("studentForm.forClose")}
                  </div>
                </div>
              )}
            </div>

            {/* ✅ معاينة الطالب - تتحدث فور تغيير الجنس */}
            <div className="bg-white dark:bg-dark_input rounded-lg p-4 border border-purple-100 dark:border-purple-900">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400">{t("studentForm.livePreview")}</span>
                </div>
                {/* ✅ بادج يوضح التحية الحالية */}
                <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                  {form.personalInfo.gender === "Male" ? "عزيزي الطالب" : "عزيزتي الطالبة"}
                </span>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border-r-4 border-purple-500 text-sm whitespace-pre-line max-h-60 overflow-y-auto text-MidnightNavyText dark:text-white">
                {messagePreview.student || t("studentForm.noMessage")}
              </div>
            </div>

            <div className="flex justify-between text-xs text-SlateBlueText dark:text-darktext">
              <span>@ {t("studentForm.variablesHint")} • {t("studentForm.autoSave")}</span>
              <span className="bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded-full text-purple-700 dark:text-purple-300">
                {(form.whatsappCustomMessages?.secondMessage || "").length} {t("common.characters")}
              </span>
            </div>
          </div>

          {/* رسالة ولي الأمر */}
          <div className="space-y-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-xs font-bold rounded-full flex items-center justify-center">2</span>
                <h4 className="text-14 font-bold text-blue-700 dark:text-blue-300">
                  {t("studentForm.guardianMessage")} {getGuardianIcon()}
                </h4>
              </div>
              {savingTemplate.guardian && (
                <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {t("common.saving")}...
                </span>
              )}
            </div>

            <div className="space-y-2 relative">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-SlateBlueText dark:text-darktext flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {t("studentForm.messageText")}
                  <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">@ {t("studentForm.forVariables")}</span>
                </label>
                {form.whatsappCustomMessages?.firstMessage && templates.guardian?.content &&
                 form.whatsappCustomMessages.firstMessage !== templates.guardian.content && (
                  <button
                    type="button"
                    onClick={() => resetToDefaultTemplate('guardian')}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    {t("studentForm.restoreDefault")}
                  </button>
                )}
              </div>

              <textarea
                ref={guardianTextareaRef}
                value={form.whatsappCustomMessages?.firstMessage || ""}
                onChange={(e) => handleTextareaInput(e, 'guardian')}
                onKeyDown={(e) => handleHintsKeyDown(e, 'guardian')}
                className="w-full px-4 py-3 border-2 border-blue-200 dark:border-blue-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-dark_input dark:text-white resize-none h-40 text-sm"
                dir={locale === 'ar' ? 'rtl' : 'ltr'}
                placeholder={t("studentForm.messagePlaceholder")}
              />

              {/* Hints */}
              {showGuardianHints && (
                <div ref={guardianHintsRef} className="absolute z-50 w-full mt-1 bg-white dark:bg-darklight border-2 border-blue-300 dark:border-blue-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 border-b dark:border-blue-800">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {t("studentForm.availableVariables")}
                    </p>
                  </div>
                  {guardianVariables.map((v, i) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v, 'guardian')}
                      className={`w-full px-3 py-2 text-right hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-start gap-2 ${
                        i === selectedHintIndex ? 'bg-blue-100 dark:bg-blue-900/40' : ''
                      }`}
                    >
                      <span className="text-lg">{v.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-mono text-blue-600 dark:text-blue-400">{v.key}</span>
                          <span className="text-xs text-SlateBlueText dark:text-darktext">{v.label}</span>
                        </div>
                        <p className="text-xs text-SlateBlueText dark:text-darktext mt-0.5">{v.description}</p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded inline-block">
                          {t("common.example")}: {v.example}
                        </p>
                      </div>
                    </button>
                  ))}
                  <div className="p-2 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 text-xs text-SlateBlueText dark:text-darktext">
                    ↑ ↓ {t("studentForm.forNavigation")} • Enter {t("studentForm.forInsert")} • Esc {t("studentForm.forClose")}
                  </div>
                </div>
              )}
            </div>

            {/* ✅ معاينة ولي الأمر - تتحدث فور تغيير العلاقة */}
            <div className="bg-white dark:bg-dark_input rounded-lg p-4 border border-blue-100 dark:border-blue-900">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{t("studentForm.livePreview")}</span>
                </div>
                {/* ✅ بادج يوضح التحية الحالية لولي الأمر */}
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                  {form.guardianInfo.relationship === "father"
                    ? `عزيزي الأستاذ ${form.guardianInfo.nickname?.ar || ""}`
                    : form.guardianInfo.relationship === "mother"
                      ? `عزيزتي السيدة ${form.guardianInfo.nickname?.ar || ""}`
                      : `عزيزي/عزيزتي ${form.guardianInfo.nickname?.ar || ""}`}
                </span>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border-r-4 border-blue-500 text-sm whitespace-pre-line max-h-60 overflow-y-auto text-MidnightNavyText dark:text-white">
                {messagePreview.guardian || t("studentForm.noMessage")}
              </div>
            </div>

            <div className="flex justify-between text-xs text-SlateBlueText dark:text-darktext">
              <span>@ {t("studentForm.variablesHint")} • {t("studentForm.autoSave")}</span>
              <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full text-blue-700 dark:text-blue-300">
                {(form.whatsappCustomMessages?.firstMessage || "").length} {t("common.characters")}
              </span>
            </div>
          </div>

          {/* ملخص */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Database className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-1" />
              <div className="space-y-2 text-xs text-amber-800 dark:text-amber-300">
                <p className="font-bold text-sm">{t("studentForm.templateSystem")}:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>{t("studentForm.source")}:</strong> Database (MongoDB)</li>
                  <li><strong>{t("studentForm.save")}:</strong> {t("studentForm.autoSave")}</li>
                  <li><strong>{t("studentForm.sharing")}:</strong> {t("studentForm.sameMessages")}</li>
                  <li><strong>{t("studentForm.editing")}:</strong> {t("studentForm.editingApplies")}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-white dark:bg-darkmode pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 border border-PowderBlueBorder dark:border-dark_border py-3 px-4 rounded-lg font-semibold text-MidnightNavyText dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
          >
            <X className="w-4 h-4" />
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={loading || loadingTemplates}
            className="flex-1 bg-gradient-to-r from-primary to-primary/90 text-white py-3 px-4 rounded-lg font-semibold shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {initial?.id ? t("common.updating") : t("common.creating")}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {initial?.id ? t("common.update") : t("common.create")}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}