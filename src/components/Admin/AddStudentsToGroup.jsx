// components/AddStudentsToGroup.jsx - COMPLETE REWRITE
// ✅ الإصلاحات:
// 1. عرض كل المدرسين مش بس الأول
// 2. إضافة {firstMeetingLink} متغير في التمبليتس
// 3. بناء أسماء المدرسين حسب اللغة (و / &)
// 4. استخدام group.firstMeetingLink من الـ API
// 5. ✅ FIX: gender.toLowerCase() لحل مشكلة "Female" vs "female"
"use client";

import { useState, useEffect, useRef } from "react";
import {
  UserPlus, Search, X, CheckCircle, AlertCircle, Users, Loader2,
  MessageCircle, Eye, Zap
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

  const [studentMessage, setStudentMessage] = useState("");
  const [guardianMessage, setGuardianMessage] = useState("");
  const [studentPreview, setStudentPreview] = useState("");
  const [guardianPreview, setGuardianPreview] = useState("");
  const [showStudentHints, setShowStudentHints] = useState(false);
  const [showGuardianHints, setShowGuardianHints] = useState(false);
  const [selectedHintIndex, setSelectedHintIndex] = useState(0);
  const [studentCursor, setStudentCursor] = useState(0);
  const [guardianCursor, setGuardianCursor] = useState(0);

  const [templates, setTemplates] = useState({
    studentAr: "",
    studentEn: "",
    guardianAr: "",
    guardianEn: "",
  });

  const saveTimer = useRef(null);
  const templateId = useRef(null);
  const studentTextareaRef = useRef(null);
  const guardianTextareaRef = useRef(null);
  const studentHintsRef = useRef(null);
  const guardianHintsRef = useRef(null);

  const isRTL = locale === "ar";

  // ============================================================
  // ✅ HELPER: بناء أسماء المدرسين حسب اللغة
  // ============================================================
  const buildInstructorsNames = (instructors, language = "ar") => {
    if (!instructors || instructors.length === 0) return "";
    const names = instructors.map((i) => i.name).filter(Boolean);
    if (names.length === 0) return "";
    if (names.length === 1) return names[0];
    if (language === "ar") {
      if (names.length === 2) return `${names[0]} و ${names[1]}`;
      return names.slice(0, -1).join(" / ") + " / " + names[names.length - 1];
    } else {
      if (names.length === 2) return `${names[0]} & ${names[1]}`;
      return names.slice(0, -1).join(", ") + " & " + names[names.length - 1];
    }
  };

  // ============================================================
  // استخراج اللغة المفضلة للطالب المختار
  // ============================================================
  const getStudentLang = () =>
    selectedStudent?.communicationPreferences?.preferredLanguage || "ar";

  // ============================================================
  // ✅ FIX: استخراج بيانات الطالب للعرض - مع toLowerCase للـ gender والـ relationship
  // ============================================================
  const getStudentInfo = () => {
    if (!selectedStudent) return null;
    const lang = getStudentLang();

    // ✅ FIX: toLowerCase() لضمان التوافق مع "Male"/"Female"/"male"/"female"
    const gender = (selectedStudent.personalInfo?.gender || "male").toLowerCase();
    const relationship = (selectedStudent.guardianInfo?.relationship || "father").toLowerCase();

    const studentNickname =
      lang === "ar"
        ? selectedStudent.personalInfo?.nickname?.ar || selectedStudent.personalInfo?.fullName?.split(" ")[0]
        : selectedStudent.personalInfo?.nickname?.en || selectedStudent.personalInfo?.fullName?.split(" ")[0];

    const guardianNickname =
      lang === "ar"
        ? selectedStudent.guardianInfo?.nickname?.ar || selectedStudent.guardianInfo?.name?.split(" ")[0]
        : selectedStudent.guardianInfo?.nickname?.en || selectedStudent.guardianInfo?.name?.split(" ")[0];

    // ✅ FIX: المقارنة دلوقتي بـ lowercase دايمًا
    let studentSalutation = "";
    if (lang === "ar") {
      studentSalutation = gender === "female" ? `عزيزتي ${studentNickname}` : `عزيزي ${studentNickname}`;
    } else {
      studentSalutation = `Dear ${studentNickname}`;
    }

    let guardianSalutation = "";
    if (lang === "ar") {
      if (relationship === "mother") guardianSalutation = `عزيزتي السيدة ${guardianNickname}`;
      else if (relationship === "father") guardianSalutation = `عزيزي الأستاذ ${guardianNickname}`;
      else guardianSalutation = `عزيزي/عزيزتي ${guardianNickname}`;
    } else {
      if (relationship === "mother") guardianSalutation = `Dear Mrs. ${guardianNickname}`;
      else if (relationship === "father") guardianSalutation = `Dear Mr. ${guardianNickname}`;
      else guardianSalutation = `Dear ${guardianNickname}`;
    }

    // ✅ FIX: childTitle بـ lowercase comparison
    const childTitle =
      lang === "ar"
        ? gender === "female" ? "ابنتك" : "ابنك"
        : gender === "female" ? "your daughter" : "your son";

    return { lang, gender, relationship, studentNickname, guardianNickname, studentSalutation, guardianSalutation, childTitle };
  };

  // ============================================================
  // ✅ المتغيرات المتاحة للطالب - مع {firstMeetingLink} وكل المدرسين
  // ============================================================
  const getStudentVariables = () => {
    const info = getStudentInfo();
    const lang = info?.lang || "ar";
    const startDate = group?.schedule?.startDate
      ? new Date(group.schedule.startDate).toLocaleDateString(
          lang === "ar" ? "ar-EG" : "en-US",
          { weekday: "long", year: "numeric", month: "long", day: "numeric" }
        )
      : "";

    const instructorNames = buildInstructorsNames(group?.instructors, lang);
    const firstMeetingLink = group?.firstMeetingLink || "";

    return [
      { key: "{salutation}", label: lang === "ar" ? "التحية" : "Salutation", icon: "👋", example: info?.studentSalutation || (lang === "ar" ? "عزيزي أحمد" : "Dear Ahmed") },
      { key: "{studentName}", label: lang === "ar" ? "اسم الطالب" : "Student Name", icon: "👤", example: info?.studentNickname || "أحمد" },
      { key: "{groupName}", label: lang === "ar" ? "اسم المجموعة" : "Group Name", icon: "👥", example: group?.name || "" },
      { key: "{courseName}", label: lang === "ar" ? "اسم الكورس" : "Course Name", icon: "📚", example: group?.courseSnapshot?.title || "" },
      { key: "{startDate}", label: lang === "ar" ? "تاريخ البدء" : "Start Date", icon: "📅", example: startDate },
      { key: "{timeFrom}", label: lang === "ar" ? "وقت البداية" : "Time From", icon: "⏰", example: group?.schedule?.timeFrom || "" },
      { key: "{timeTo}", label: lang === "ar" ? "وقت النهاية" : "Time To", icon: "⏰", example: group?.schedule?.timeTo || "" },
      { key: "{instructor}", label: lang === "ar" ? "المدرب/المدربين" : "Instructor(s)", icon: "👨‍🏫", example: instructorNames },
      { key: "{firstMeetingLink}", label: lang === "ar" ? "رابط الجلسة الأولى" : "First Session Link", icon: "🔗", example: firstMeetingLink || (lang === "ar" ? "سيُضاف قريباً" : "Coming soon") },
    ];
  };

  // ============================================================
  // ✅ المتغيرات المتاحة لولي الأمر - مع {firstMeetingLink} وكل المدرسين
  // ============================================================
  const getGuardianVariables = () => {
    const info = getStudentInfo();
    const lang = info?.lang || "ar";
    const startDate = group?.schedule?.startDate
      ? new Date(group.schedule.startDate).toLocaleDateString(
          lang === "ar" ? "ar-EG" : "en-US",
          { weekday: "long", year: "numeric", month: "long", day: "numeric" }
        )
      : "";

    const instructorNames = buildInstructorsNames(group?.instructors, lang);
    const firstMeetingLink = group?.firstMeetingLink || "";

    return [
      { key: "{salutation}", label: lang === "ar" ? "التحية" : "Salutation", icon: "👋", example: info?.guardianSalutation || (lang === "ar" ? "عزيزي الأستاذ محمد" : "Dear Mr. Mohamed") },
      { key: "{guardianName}", label: lang === "ar" ? "اسم ولي الأمر" : "Guardian Name", icon: "👤", example: info?.guardianNickname || "محمد" },
      { key: "{studentName}", label: lang === "ar" ? "اسم الطالب" : "Student Name", icon: "👶", example: info?.studentNickname || "أحمد" },
      { key: "{childTitle}", label: lang === "ar" ? "ابنك/ابنتك" : "Son/Daughter", icon: "👨‍👦", example: info?.childTitle || "ابنك" },
      { key: "{groupName}", label: lang === "ar" ? "اسم المجموعة" : "Group Name", icon: "👥", example: group?.name || "" },
      { key: "{courseName}", label: lang === "ar" ? "اسم الكورس" : "Course Name", icon: "📚", example: group?.courseSnapshot?.title || "" },
      { key: "{startDate}", label: lang === "ar" ? "تاريخ البدء" : "Start Date", icon: "📅", example: startDate },
      { key: "{timeFrom}", label: lang === "ar" ? "وقت البداية" : "Time From", icon: "⏰", example: group?.schedule?.timeFrom || "" },
      { key: "{timeTo}", label: lang === "ar" ? "وقت النهاية" : "Time To", icon: "⏰", example: group?.schedule?.timeTo || "" },
      { key: "{instructor}", label: lang === "ar" ? "المدرب/المدربين" : "Instructor(s)", icon: "👨‍🏫", example: instructorNames },
      { key: "{firstMeetingLink}", label: lang === "ar" ? "رابط الجلسة الأولى" : "First Session Link", icon: "🔗", example: firstMeetingLink || (lang === "ar" ? "سيُضاف قريباً" : "Coming soon") },
    ];
  };

  // ============================================================
  // جلب البيانات
  // ============================================================
  useEffect(() => {
    if (!groupId) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const [groupRes, studentsRes, templateRes] = await Promise.all([
          fetch(`/api/groups/${groupId}`),
          fetch("/api/allStudents?status=Active"),
          fetch(`/api/whatsapp/group-templates?default=true&groupId=${groupId}`),
        ]);

        const groupData = await groupRes.json();
        if (groupData.success) {
          setGroup(groupData.data);
          console.log("✅ Group loaded:", groupData.data?.name);
          console.log("📋 Instructors:", groupData.data?.instructors?.length);
          console.log("🔗 First Meeting Link:", groupData.data?.firstMeetingLink);
        }

        const studentsData = await studentsRes.json();
        if (studentsData.success) {
          const groupStudentIds = (groupData.data?.students || []).map(s =>
            String(s._id || s.id || s)
          );
          const available = studentsData.data.filter(
            s => !groupStudentIds.includes(String(s._id || s.id))
          );
          setStudents(available);
        }

        if (templateRes.ok) {
          const templateData = await templateRes.json();
          if (templateData.success && templateData.data) {
            templateId.current = templateData.data._id;
            setTemplates({
              studentAr: templateData.data.studentContentAr || templateData.data.content || "",
              studentEn: templateData.data.studentContentEn || "",
              guardianAr: templateData.data.guardianContentAr || templateData.data.content || "",
              guardianEn: templateData.data.guardianContentEn || "",
            });
          }
        }
      } catch (error) {
        console.error("Error loading:", error);
        toast.error("فشل تحميل البيانات");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [groupId]);

  // تحميل القالب حسب لغة الطالب
  useEffect(() => {
    if (!selectedStudent || !templates.studentAr) return;
    const lang = getStudentLang();
    setStudentMessage(lang === "ar" ? templates.studentAr : templates.studentEn);
    setGuardianMessage(lang === "ar" ? templates.guardianAr : templates.guardianEn);
  }, [selectedStudent, templates]);

  // ============================================================
  // ✅ استبدال المتغيرات - مع كل المدرسين و firstMeetingLink
  // ============================================================
  const replaceVars = (msg, type) => {
    if (!msg || !selectedStudent || !group) return "";
    const info = getStudentInfo();
    if (!info) return msg;

    const { lang, studentNickname, guardianNickname, studentSalutation, guardianSalutation, childTitle } = info;
    const salutation = type === "student" ? studentSalutation : guardianSalutation;

    const startDate = group.schedule?.startDate
      ? new Date(group.schedule.startDate).toLocaleDateString(
          lang === "ar" ? "ar-EG" : "en-US",
          { weekday: "long", year: "numeric", month: "long", day: "numeric" }
        )
      : "";

    const instructorNames = buildInstructorsNames(group.instructors, lang);
    const firstMeetingLink = group.firstMeetingLink || "";

    return msg
      .replace(/\{salutation\}/g, salutation)
      .replace(/\{studentName\}/g, studentNickname)
      .replace(/\{guardianName\}/g, guardianNickname)
      .replace(/\{childTitle\}/g, childTitle)
      .replace(/\{groupName\}/g, group.name || "")
      .replace(/\{courseName\}/g, group.courseSnapshot?.title || "")
      .replace(/\{startDate\}/g, startDate)
      .replace(/\{timeFrom\}/g, group.schedule?.timeFrom || "")
      .replace(/\{timeTo\}/g, group.schedule?.timeTo || "")
      .replace(/\{instructor\}/g, instructorNames)
      .replace(/\{firstMeetingLink\}/g, firstMeetingLink);
  };

  // تحديث المعاينة
  useEffect(() => {
    if (selectedStudent && group) {
      setStudentPreview(replaceVars(studentMessage, "student"));
      setGuardianPreview(replaceVars(guardianMessage, "guardian"));
    }
  }, [studentMessage, guardianMessage, selectedStudent, group]);

  // حفظ تلقائي
  const autoSave = (type, content) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!templateId.current) return;
      const lang = getStudentLang();
      const fieldMap = {
        student: lang === "ar" ? "studentContentAr" : "studentContentEn",
        guardian: lang === "ar" ? "guardianContentAr" : "guardianContentEn",
      };
      try {
        await fetch("/api/whatsapp/group-templates", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: templateId.current,
            [fieldMap[type]]: content,
            setAsDefault: true,
          }),
        });
      } catch (error) {
        console.error("Save error:", error);
      }
    }, 3000);
  };

  const handleStudentMessageChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setStudentMessage(value);
    setStudentCursor(cursorPos);
    autoSave("student", value);
    const textBefore = value.substring(0, cursorPos);
    const lastAt = textBefore.lastIndexOf("@");
    if (lastAt !== -1 && lastAt === cursorPos - 1) {
      setShowStudentHints(true);
      setSelectedHintIndex(0);
    } else if (lastAt === -1) {
      setShowStudentHints(false);
    }
  };

  const handleGuardianMessageChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setGuardianMessage(value);
    setGuardianCursor(cursorPos);
    autoSave("guardian", value);
    const textBefore = value.substring(0, cursorPos);
    const lastAt = textBefore.lastIndexOf("@");
    if (lastAt !== -1 && lastAt === cursorPos - 1) {
      setShowGuardianHints(true);
      setSelectedHintIndex(0);
    } else if (lastAt === -1) {
      setShowGuardianHints(false);
    }
  };

  const insertVariable = (variable, type) => {
    const textarea = type === "student" ? studentTextareaRef.current : guardianTextareaRef.current;
    const currentValue = type === "student" ? studentMessage : guardianMessage;
    const cursorPos = type === "student" ? studentCursor : guardianCursor;
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
      setStudentMessage(newValue);
      setShowStudentHints(false);
      setStudentCursor(newCursorPos);
    } else {
      setGuardianMessage(newValue);
      setShowGuardianHints(false);
      setGuardianCursor(newCursorPos);
    }
    autoSave(type, newValue);
    setTimeout(() => {
      textarea?.focus();
      textarea?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleKeyDown = (e, type) => {
    const variables = type === "student" ? getStudentVariables() : getGuardianVariables();
    const show = type === "student" ? showStudentHints : showGuardianHints;
    if (!show) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedHintIndex(p => (p + 1) % variables.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedHintIndex(p => (p - 1 + variables.length) % variables.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertVariable(variables[selectedHintIndex], type);
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (type === "student") setShowStudentHints(false);
      else setShowGuardianHints(false);
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (studentHintsRef.current && !studentHintsRef.current.contains(e.target)) setShowStudentHints(false);
      if (guardianHintsRef.current && !guardianHintsRef.current.contains(e.target)) setShowGuardianHints(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // إضافة الطالب
  const handleAdd = async () => {
    if (!selectedStudent) {
      toast.error("اختر طالباً أولاً");
      return;
    }
    setAdding(true);
    const loadingToast = toast.loading("جاري الإضافة...");
    try {
      const res = await fetch(`/api/groups/${groupId}/add-student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: String(selectedStudent._id || selectedStudent.id),
          studentMessage,
          guardianMessage,
          sendWhatsApp: true,
        }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success("تم إضافة الطالب بنجاح", { id: loadingToast });
        setStudents(prev =>
          prev.filter(s => String(s._id || s.id) !== String(selectedStudent._id || selectedStudent.id))
        );
        setSelectedStudent(null);
        if (onStudentAdded) onStudentAdded();
      } else {
        toast.error(result?.error || "فشلت الإضافة", { id: loadingToast });
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("فشلت الإضافة", { id: loadingToast });
    } finally {
      setAdding(false);
    }
  };

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  // ============================================================
  // LOADING STATE
  // ============================================================
  if (loading) {
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

  const currentCount = group.currentStudentsCount || group.students?.length || 0;
  const maxStudents = group.maxStudents || 0;
  const isFull = currentCount >= maxStudents;
  const filteredStudents = students.filter(s => {
    const name = s.personalInfo?.fullName?.toLowerCase() || "";
    const email = s.personalInfo?.email?.toLowerCase() || "";
    return name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
  });

  const info = getStudentInfo();
  const lang = info?.lang || "ar";
  const studentVars = getStudentVariables();
  const guardianVars = getGuardianVariables();

  const instructorNamesDisplay = buildInstructorsNames(group.instructors, locale === "ar" ? "ar" : "en");

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Group Info */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 rounded-lg border border-primary/20">
        <h3 className="text-xl font-bold mb-1">{group.name}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {group.courseSnapshot?.title} - {group.code}
        </p>
        {group.instructors && group.instructors.length > 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            <span className="font-medium">👨‍🏫 {group.instructors.length > 1 ? "المدربون" : "المدرب"}:</span>{" "}
            <span className="text-primary font-medium">{instructorNamesDisplay}</span>
          </p>
        )}
        {group.firstMeetingLink && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            <span className="font-medium">🔗 رابط الجلسة الأولى:</span>{" "}
            <a href={group.firstMeetingLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline truncate inline-block max-w-xs align-bottom">
              {group.firstMeetingLink}
            </a>
          </p>
        )}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-primary">{currentCount}</div>
            <div className="text-xs text-gray-500">الحالي</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">{maxStudents}</div>
            <div className="text-xs text-gray-500">الأقصى</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{maxStudents - currentCount}</div>
            <div className="text-xs text-gray-500">المتاح</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
        <input
          type="text"
          placeholder="ابحث عن طالب..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={`w-full ${isRTL ? "pr-10 pl-4" : "pl-10 pr-4"} py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white`}
        />
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

            // ✅ FIX: toLowerCase() في العرض كمان
            const sLang = student.communicationPreferences?.preferredLanguage || "ar";
            const sGender = (student.personalInfo?.gender || "male").toLowerCase();
            const sRelationship = (student.guardianInfo?.relationship || "father").toLowerCase();

            return (
              <div
                key={sid}
                onClick={() => !isFull && setSelectedStudent(student)}
                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-gray-200 dark:border-gray-700 hover:border-primary/50"
                } ${isFull ? "opacity-50 cursor-not-allowed" : ""}`}
              >
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
                      {/* ✅ FIX: عرض الجنس بشكل صحيح بعد toLowerCase */}
                      <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                        {sGender === "female" ? "👧 أنثى" : "👦 ذكر"}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                        {sRelationship === "mother" ? "👩 أم" : sRelationship === "father" ? "👨 أب" : "👤 ولي أمر"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Messages Section - يظهر فقط لو اختار طالب */}
      {selectedStudent && (
        <div className="space-y-4">
          {/* معلومات الطالب المختار */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{selectedStudent.personalInfo?.fullName}</span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${lang === "ar" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                {lang === "ar" ? "🇸🇦 الرسائل بالعربية" : "🇬🇧 Messages in English"}
              </span>
              {/* ✅ FIX: استخدام info?.gender اللي هو بالفعل lowercase */}
              <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                {info?.gender === "female" ? "👧 أنثى" : "👦 ذكر"}
              </span>
              <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                {info?.relationship === "mother" ? "👩 أم" : "👨 أب"}
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-500 space-y-1">
              <p>
                <span className="font-medium">تحية الطالب: </span>
                <span className="text-primary">{info?.studentSalutation}</span>
              </p>
              <p>
                <span className="font-medium">تحية ولي الأمر: </span>
                <span className="text-primary">{info?.guardianSalutation}</span>
              </p>
              {group.instructors && group.instructors.length > 0 && (
                <p>
                  <span className="font-medium">
                    {group.instructors.length > 1 ? "المدربون: " : "المدرب: "}
                  </span>
                  <span className="text-primary">{buildInstructorsNames(group.instructors, lang)}</span>
                </p>
              )}
              {group.firstMeetingLink && (
                <p>
                  <span className="font-medium">رابط الجلسة الأولى: </span>
                  <span className="text-blue-500 text-xs break-all">{group.firstMeetingLink}</span>
                </p>
              )}
            </div>
          </div>

          {/* رسالة الطالب */}
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 bg-purple-500 text-white text-xs font-bold rounded-full flex items-center justify-center">1</span>
              <h4 className="text-sm font-bold text-purple-700 dark:text-purple-300">
                {lang === "ar" ? "رسالة الطالب 👦" : "Student Message 👦"}
              </h4>
              {/* ✅ FIX: عرض التحية الصحيحة حسب الجنس */}
              <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded">
                {info?.gender === "female"
                  ? (lang === "ar" ? "عزيزتي" : "Dear")
                  : (lang === "ar" ? "عزيزي" : "Dear")}
              </span>
            </div>

            <div className="relative">
              <textarea
                ref={studentTextareaRef}
                value={studentMessage}
                onChange={handleStudentMessageChange}
                onKeyDown={e => handleKeyDown(e, "student")}
                className="w-full px-4 py-3 border-2 border-purple-200 dark:border-purple-800 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white resize-none h-40 text-sm"
                dir={lang === "ar" ? "rtl" : "ltr"}
                placeholder={lang === "ar" ? "اكتب @ لإظهار المتغيرات..." : "Type @ to show variables..."}
              />

              {showStudentHints && (
                <div
                  ref={studentHintsRef}
                  className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border-2 border-purple-300 dark:border-purple-700 rounded-lg shadow-xl max-h-56 overflow-y-auto"
                >
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/30 border-b dark:border-purple-800">
                    <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {lang === "ar" ? "المتغيرات المتاحة" : "Available Variables"}
                    </p>
                  </div>
                  {studentVars.map((v, i) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v, "student")}
                      className={`w-full px-3 py-2 ${lang === "ar" ? "text-right" : "text-left"} hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-start gap-2 ${i === selectedHintIndex ? "bg-purple-100 dark:bg-purple-900/40" : ""}`}
                    >
                      <span>{v.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-mono text-purple-600 dark:text-purple-400">{v.key}</span>
                          <span className="text-xs text-gray-500">{v.label}</span>
                        </div>
                        {v.example && (
                          <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded inline-block">
                            {v.example}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                  <div className="p-2 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 text-xs text-gray-500">
                    ↑ ↓ {lang === "ar" ? "للتنقل • Enter للإدراج • Esc للإغلاق" : "navigate • Enter insert • Esc close"}
                  </div>
                </div>
              )}
            </div>

            {/* معاينة الطالب */}
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="w-3.5 h-3.5 text-purple-600" />
                <span className="text-xs text-purple-600 font-medium">
                  {lang === "ar" ? "معاينة الرسالة" : "Message Preview"}
                </span>
              </div>
              <div
                className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-100 dark:border-purple-900 text-sm whitespace-pre-line max-h-32 overflow-y-auto"
                dir={lang === "ar" ? "rtl" : "ltr"}
              >
                {studentPreview || (lang === "ar" ? "لا توجد معاينة" : "No preview")}
              </div>
            </div>
          </div>

          {/* رسالة ولي الأمر */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">2</span>
              <h4 className="text-sm font-bold text-blue-700 dark:text-blue-300">
                {lang === "ar" ? "رسالة ولي الأمر 👨‍👦" : "Guardian Message 👨‍👦"}
              </h4>
              {/* ✅ FIX: عرض التحية الصحيحة للولي حسب العلاقة */}
              <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">
                {info?.relationship === "mother"
                  ? (lang === "ar" ? "عزيزتي السيدة" : "Dear Mrs.")
                  : (lang === "ar" ? "عزيزي الأستاذ" : "Dear Mr.")}
              </span>
            </div>

            <div className="relative">
              <textarea
                ref={guardianTextareaRef}
                value={guardianMessage}
                onChange={handleGuardianMessageChange}
                onKeyDown={e => handleKeyDown(e, "guardian")}
                className="w-full px-4 py-3 border-2 border-blue-200 dark:border-blue-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white resize-none h-40 text-sm"
                dir={lang === "ar" ? "rtl" : "ltr"}
                placeholder={lang === "ar" ? "اكتب @ لإظهار المتغيرات..." : "Type @ to show variables..."}
              />

              {showGuardianHints && (
                <div
                  ref={guardianHintsRef}
                  className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border-2 border-blue-300 dark:border-blue-700 rounded-lg shadow-xl max-h-56 overflow-y-auto"
                >
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 border-b dark:border-blue-800">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {lang === "ar" ? "المتغيرات المتاحة" : "Available Variables"}
                    </p>
                  </div>
                  {guardianVars.map((v, i) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v, "guardian")}
                      className={`w-full px-3 py-2 ${lang === "ar" ? "text-right" : "text-left"} hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-start gap-2 ${i === selectedHintIndex ? "bg-blue-100 dark:bg-blue-900/40" : ""}`}
                    >
                      <span>{v.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-mono text-blue-600 dark:text-blue-400">{v.key}</span>
                          <span className="text-xs text-gray-500">{v.label}</span>
                        </div>
                        {v.example && (
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded inline-block">
                            {v.example}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                  <div className="p-2 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 text-xs text-gray-500">
                    ↑ ↓ {lang === "ar" ? "للتنقل • Enter للإدراج • Esc للإغلاق" : "navigate • Enter insert • Esc close"}
                  </div>
                </div>
              )}
            </div>

            {/* معاينة ولي الأمر */}
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs text-blue-600 font-medium">
                  {lang === "ar" ? "معاينة الرسالة" : "Message Preview"}
                </span>
              </div>
              <div
                className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-100 dark:border-blue-900 text-sm whitespace-pre-line max-h-32 overflow-y-auto"
                dir={lang === "ar" ? "rtl" : "ltr"}
              >
                {guardianPreview || (lang === "ar" ? "لا توجد معاينة" : "No preview")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onClose}
          disabled={adding}
          className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
        >
          إلغاء
        </button>
        <button
          onClick={handleAdd}
          disabled={!selectedStudent || !studentMessage.trim() || !guardianMessage.trim() || isFull || adding}
          className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-2"
        >
          {adding ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              جاري الإضافة...
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              إضافة الطالب
            </>
          )}
        </button>
      </div>
    </div>
  );
}