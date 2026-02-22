// components/InstructorNotificationModal.jsx
"use client";

import { useState, useEffect, useRef } from "react";
import { X, Send, Copy, AlertCircle, Users, Clock, Calendar, Eye, Zap, Globe } from "lucide-react";
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
    const { t } = useI18n();
    const { locale } = useLocale();
    const isRTL = locale === "ar";

    const [messages, setMessages] = useState({});
    const [previewStates, setPreviewStates] = useState({});
    const [sending, setSending] = useState(false);
    const [selectedInstructors, setSelectedInstructors] = useState([]);
    const [loading, setLoading] = useState(true);

    // ✅ قالبان - عربي وإنجليزي
    const [templateAr, setTemplateAr] = useState("");
    const [templateEn, setTemplateEn] = useState("");

    // ✅ لغة كل مدرب على حدة
    const [instructorLanguages, setInstructorLanguages] = useState({});

    // ✅ Hints state
    const [showHints, setShowHints] = useState({});
    const [selectedHintIndex, setSelectedHintIndex] = useState({});
    const [cursorPositions, setCursorPositions] = useState({});

    // ✅ Refs
    const textareaRefs = useRef({});
    const hintsRefs = useRef({});
    const saveTimer = useRef(null);
    const templateId = useRef(null);

    // ✅ جلب القالبين من الباك إند
    useEffect(() => {
        const loadTemplate = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/whatsapp/instructor-templates?default=true');
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
        }
    }, [isOpen]);

    // ✅ تهيئة الرسائل والحالة لكل مدرب
    useEffect(() => {
        if (!instructors || instructors.length === 0 || (!templateAr && !templateEn)) return;

        const newMessages = {};
        const newPreviews = {};
        const newHints = {};
        const newHintIndexes = {};
        const newCursors = {};
        const newLanguages = {};

        instructors.forEach((instructor) => {
            const id = instructor._id || instructor.id;
            // Default: عربي
            newLanguages[id] = "ar";
            newMessages[id] = templateAr;
            newPreviews[id] = false;
            newHints[id] = false;
            newHintIndexes[id] = 0;
            newCursors[id] = 0;

            setSelectedInstructors((prev) => {
                if (!prev.includes(id)) return [...prev, id];
                return prev;
            });
        });

        setInstructorLanguages(newLanguages);
        setMessages(newMessages);
        setPreviewStates(newPreviews);
        setShowHints(newHints);
        setSelectedHintIndex(newHintIndexes);
        setCursorPositions(newCursors);
    }, [instructors, templateAr, templateEn]);

    // ✅ تغيير لغة مدرب معين - يغير الرسالة للقالب المناسب
    const handleLanguageChange = (instructorId, lang) => {
        setInstructorLanguages(prev => ({ ...prev, [instructorId]: lang }));
        // استبدال النص بالقالب المناسب
        const newTemplate = lang === "ar" ? templateAr : templateEn;
        setMessages(prev => ({ ...prev, [instructorId]: newTemplate }));
    };

    // ✅ المتغيرات المتاحة
    const getInstructorVariables = (instructor, lang = "ar") => {
        const instructorName = instructor?.name?.split(" ")[0] || instructor?.name || "";
        const gender = instructor?.gender;
        let salutation = "";

        if (lang === "ar") {
            if (gender === "male") salutation = `عزيزي ${instructorName}`;
            else if (gender === "female") salutation = `عزيزتي ${instructorName}`;
            else salutation = `عزيزي/عزيزتي ${instructorName}`;
        } else {
            salutation = `Dear ${instructorName}`;
        }

        const startDate = groupData?.schedule?.startDate
            ? new Date(groupData.schedule.startDate).toLocaleDateString(
                lang === "ar" ? 'ar-EG' : 'en-US',
                { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
            )
            : "";

        const studentCount = groupData?.currentStudentsCount || groupData?.studentsCount || 0;

        if (lang === "ar") {
            return [
                { key: "{salutation}", label: "التحية", icon: "👋", description: "عزيزي/عزيزتي + الاسم", example: salutation },
                { key: "{instructorName}", label: "اسم المدرب", icon: "👤", description: "الاسم المختصر", example: instructorName },
                { key: "{groupName}", label: "اسم المجموعة", icon: "👥", description: "اسم المجموعة", example: groupData?.name || "" },
                { key: "{courseName}", label: "اسم الكورس", icon: "📚", description: "اسم البرنامج", example: groupData?.courseSnapshot?.title || "" },
                { key: "{startDate}", label: "تاريخ البدء", icon: "📅", description: "تاريخ بدء المجموعة", example: startDate },
                { key: "{timeFrom}", label: "وقت البداية", icon: "⏰", description: "وقت بدء الحصة", example: groupData?.schedule?.timeFrom || "" },
                { key: "{timeTo}", label: "وقت النهاية", icon: "⏰", description: "وقت نهاية الحصة", example: groupData?.schedule?.timeTo || "" },
                { key: "{studentCount}", label: "عدد الطلاب", icon: "👨‍🎓", description: "عدد الطلاب المسجلين", example: studentCount.toString() },
            ];
        } else {
            return [
                { key: "{salutation}", label: "Salutation", icon: "👋", description: "Dear + Name", example: salutation },
                { key: "{instructorName}", label: "Instructor Name", icon: "👤", description: "First name", example: instructorName },
                { key: "{groupName}", label: "Group Name", icon: "👥", description: "Group name", example: groupData?.name || "" },
                { key: "{courseName}", label: "Course Name", icon: "📚", description: "Program name", example: groupData?.courseSnapshot?.title || "" },
                { key: "{startDate}", label: "Start Date", icon: "📅", description: "Group start date", example: startDate },
                { key: "{timeFrom}", label: "Time From", icon: "⏰", description: "Session start time", example: groupData?.schedule?.timeFrom || "" },
                { key: "{timeTo}", label: "Time To", icon: "⏰", description: "Session end time", example: groupData?.schedule?.timeTo || "" },
                { key: "{studentCount}", label: "Student Count", icon: "👨‍🎓", description: "Enrolled students", example: studentCount.toString() },
            ];
        }
    };

    // ✅ استبدال المتغيرات - حسب اللغة المختارة
    const replaceVariables = (messageTemplate, instructor, lang = "ar") => {
        if (!instructor || !groupData) return messageTemplate;

        const instructorName = instructor.name?.split(" ")[0] || instructor.name || "";
        const gender = instructor.gender || "male";

        let salutation = "";
        if (lang === "ar") {
            if (gender === "male") salutation = `عزيزي ${instructorName}`;
            else if (gender === "female") salutation = `عزيزتي ${instructorName}`;
            else salutation = `عزيزي/عزيزتي ${instructorName}`;
        } else {
            salutation = `Dear ${instructorName}`;
        }

        const startDate = groupData.schedule?.startDate
            ? new Date(groupData.schedule.startDate).toLocaleDateString(
                lang === "ar" ? 'ar-EG' : 'en-US',
                { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
            )
            : "";

        const studentCount = groupData.currentStudentsCount || groupData.studentsCount || 0;

        return messageTemplate
            .replace(/\{salutation\}/g, salutation)
            .replace(/\{instructorName\}/g, instructorName)
            .replace(/\{groupName\}/g, groupData.name || "")
            .replace(/\{courseName\}/g, groupData.courseSnapshot?.title || groupData.course?.title || "")
            .replace(/\{startDate\}/g, startDate)
            .replace(/\{timeFrom\}/g, groupData.schedule?.timeFrom || "")
            .replace(/\{timeTo\}/g, groupData.schedule?.timeTo || "")
            .replace(/\{studentCount\}/g, studentCount.toString());
    };

    // ✅ تحديث الرسالة
    const handleMessageChange = (instructorId, value, cursorPos) => {
        setMessages(prev => ({ ...prev, [instructorId]: value }));
        setCursorPositions(prev => ({ ...prev, [instructorId]: cursorPos }));

        const textBeforeCursor = value.substring(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1 && lastAtIndex === cursorPos - 1) {
            setShowHints(prev => ({ ...prev, [instructorId]: true }));
            setSelectedHintIndex(prev => ({ ...prev, [instructorId]: 0 }));
        } else if (lastAtIndex === -1) {
            setShowHints(prev => ({ ...prev, [instructorId]: false }));
        }

        // ✅ حفظ تلقائي - يحفظ القالب المناسب حسب اللغة
        autoSave(instructorId, value);
    };

    // ✅ حفظ تلقائي - يحفظ contentAr أو contentEn حسب اللغة
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
                        setAsDefault: true
                    })
                });
                console.log(`✅ Template (${lang}) saved`);
            } catch (error) {
                console.error("Save error:", error);
            }
        }, 3000);
    };

    // ✅ إدراج متغير
    const insertVariable = (variable, instructorId) => {
        const textarea = textareaRefs.current[instructorId];
        const currentValue = messages[instructorId];
        const cursorPos = cursorPositions[instructorId];
        const textBeforeCursor = currentValue.substring(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        let newValue, newCursorPos;
        if (lastAtIndex !== -1) {
            newValue = currentValue.substring(0, lastAtIndex) + variable.key + currentValue.substring(cursorPos);
            newCursorPos = lastAtIndex + variable.key.length;
        } else {
            newValue = currentValue.substring(0, cursorPos) + variable.key + currentValue.substring(cursorPos);
            newCursorPos = cursorPos + variable.key.length;
        }

        setMessages(prev => ({ ...prev, [instructorId]: newValue }));
        setShowHints(prev => ({ ...prev, [instructorId]: false }));
        setCursorPositions(prev => ({ ...prev, [instructorId]: newCursorPos }));
        autoSave(instructorId, newValue);

        setTimeout(() => {
            textarea?.focus();
            textarea?.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const handleKeyDown = (e, instructorId, variables) => {
        if (!showHints[instructorId]) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedHintIndex(prev => ({ ...prev, [instructorId]: (prev[instructorId] + 1) % variables.length }));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedHintIndex(prev => ({ ...prev, [instructorId]: (prev[instructorId] - 1 + variables.length) % variables.length }));
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            insertVariable(variables[selectedHintIndex[instructorId]], instructorId);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setShowHints(prev => ({ ...prev, [instructorId]: false }));
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            Object.keys(hintsRefs.current).forEach(instructorId => {
                if (hintsRefs.current[instructorId] && !hintsRefs.current[instructorId].contains(event.target)) {
                    setShowHints(prev => ({ ...prev, [instructorId]: false }));
                }
            });
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleInstructor = (instructorId) => {
        setSelectedInstructors((prev) =>
            prev.includes(instructorId) ? prev.filter((id) => id !== instructorId) : [...prev, instructorId]
        );
    };

    const copyMessage = (instructorId) => {
        const instructor = instructors.find(i => (i._id || i.id) === instructorId);
        const lang = instructorLanguages[instructorId] || "ar";
        const message = replaceVariables(messages[instructorId], instructor, lang);
        navigator.clipboard.writeText(message);
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
            selectedInstructors.forEach((instructorId) => {
                const instructor = instructors.find((i) => (i._id || i.id) === instructorId);
                if (instructor) {
                    const lang = instructorLanguages[instructorId] || "ar";
                    instructorMessages[instructorId] = replaceVariables(messages[instructorId], instructor, lang);
                }
            });

            await onSendNotifications(instructorMessages);
            toast.success("تم الإرسال بنجاح!", { id: toastId });
            onClose();
        } catch (error) {
            toast.error(error.message || "فشل الإرسال", { id: toastId });
        } finally {
            setSending(false);
        }
    };

    if (!isOpen || !instructors || instructors.length === 0) return null;
    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-darkmode rounded-2xl p-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
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
                    {/* Group Info */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="space-y-3">
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
                                    <span>{groupData?.schedule?.startDate ? new Date(groupData.schedule.startDate).toLocaleDateString('ar-EG') : 'N/A'}</span>
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
                        </div>
                    </div>

                    {/* Instructors Selection */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-sm">اختر المدربين</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {instructors.map((instructor) => {
                                const id = instructor._id || instructor.id;
                                const isSelected = selectedInstructors.includes(id);
                                return (
                                    <label key={id} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition">
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
                                                        {instructor.gender === 'male' ? '👨 ذكر' : '👩 أنثى'}
                                                    </span>
                                                )}
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

                    {/* Messages */}
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                        {selectedInstructors.map((instructorId) => {
                            const instructor = instructors.find(i => (i._id || i.id) === instructorId);
                            if (!instructor) return null;

                            const lang = instructorLanguages[instructorId] || "ar";
                            const variables = getInstructorVariables(instructor, lang);
                            const preview = replaceVariables(messages[instructorId] || "", instructor, lang);
                            const isAr = lang === "ar";

                            return (
                                <div key={instructorId} className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 space-y-3">
                                    
                                    {/* Instructor Header + Language Toggle */}
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-medium">{instructor.name}</h4>
                                            {instructor.gender && (
                                                <span className="text-xs bg-white dark:bg-gray-800 px-2 py-0.5 rounded">
                                                    {instructor.gender === 'male' ? '👨' : '👩'}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* ✅ Language Toggle Buttons */}
                                            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
                                                <Globe className="w-3.5 h-3.5 text-gray-400 mx-1" />
                                                <button
                                                    type="button"
                                                    onClick={() => handleLanguageChange(instructorId, "ar")}
                                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                                                        isAr
                                                            ? "bg-primary text-white shadow-sm"
                                                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    }`}
                                                >
                                                    عربي
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleLanguageChange(instructorId, "en")}
                                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                                                        !isAr
                                                            ? "bg-primary text-white shadow-sm"
                                                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    }`}
                                                >
                                                    English
                                                </button>
                                            </div>

                                            <button
                                                onClick={() => copyMessage(instructorId)}
                                                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                                            >
                                                <Copy className="w-3 h-3" />
                                                {isAr ? "نسخ" : "Copy"}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Textarea */}
                                    <div className="relative">
                                        <textarea
                                            ref={el => textareaRefs.current[instructorId] = el}
                                            value={messages[instructorId] || ""}
                                            onChange={(e) => handleMessageChange(instructorId, e.target.value, e.target.selectionStart)}
                                            onKeyDown={(e) => handleKeyDown(e, instructorId, variables)}
                                            className="w-full px-4 py-3 border-2 border-purple-200 dark:border-purple-800 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white resize-none h-40 text-sm"
                                            dir={isAr ? "rtl" : "ltr"}
                                            placeholder={isAr ? "اكتب @ لإظهار المتغيرات..." : "Type @ to show variables..."}
                                        />

                                        {/* Hints */}
                                        {showHints[instructorId] && (
                                            <div
                                                ref={el => hintsRefs.current[instructorId] = el}
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
                                                        onClick={() => insertVariable(v, instructorId)}
                                                        className={`w-full px-3 py-2 ${isAr ? 'text-right' : 'text-left'} hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-start gap-2 ${
                                                            i === selectedHintIndex[instructorId] ? 'bg-purple-100 dark:bg-purple-900/40' : ''
                                                        }`}
                                                    >
                                                        <span className="text-lg">{v.icon}</span>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-sm font-mono text-purple-600 dark:text-purple-400">{v.key}</span>
                                                                <span className="text-xs text-gray-600 dark:text-gray-400">{v.label}</span>
                                                            </div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{v.description}</p>
                                                            <p className="text-xs text-purple-700 dark:text-purple-300 mt-1 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded inline-block">
                                                                {v.example}
                                                            </p>
                                                        </div>
                                                    </button>
                                                ))}
                                                <div className="p-2 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
                                                    ↑ ↓ {isAr ? "للتنقل • Enter للإدراج • Esc للإغلاق" : "to navigate • Enter to insert • Esc to close"}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Language indicator */}
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            isAr
                                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                        }`}>
                                            {isAr ? "🇸🇦 الرسالة بالعربية" : "🇬🇧 Message in English"}
                                        </span>
                                    </div>

                                    {/* Preview */}
                                    <div>
                                        <button
                                            onClick={() => setPreviewStates(prev => ({ ...prev, [instructorId]: !prev[instructorId] }))}
                                            className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                                        >
                                            <Eye className="w-3 h-3" />
                                            {previewStates[instructorId]
                                                ? (isAr ? "إخفاء المعاينة" : "Hide Preview")
                                                : (isAr ? "عرض المعاينة" : "Show Preview")
                                            }
                                        </button>

                                        {previewStates[instructorId] && (
                                            <div
                                                className="mt-2 bg-white dark:bg-gray-800 p-4 rounded-lg border border-purple-100 dark:border-purple-900 text-sm whitespace-pre-line max-h-48 overflow-y-auto"
                                                dir={isAr ? "rtl" : "ltr"}
                                            >
                                                {preview}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Helper Text */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800 dark:text-amber-300">
                            <p className="font-medium mb-1">المتغيرات المتاحة / Available Variables:</p>
                            <div className="space-y-1 text-xs font-mono">
                                <p>{"{salutation}"} - التحية / Salutation</p>
                                <p>{"{instructorName}"} - اسم المدرب / Instructor Name</p>
                                <p>{"{groupName}"} - اسم المجموعة / Group Name</p>
                                <p>{"{courseName}"} - اسم الكورس / Course Name</p>
                                <p>{"{startDate}"} - تاريخ البدء / Start Date</p>
                                <p>{"{studentCount}"} - عدد الطلاب / Student Count</p>
                            </div>
                        </div>
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
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                جاري الإرسال...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                إرسال الإخطارات ({selectedInstructors.length})
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}