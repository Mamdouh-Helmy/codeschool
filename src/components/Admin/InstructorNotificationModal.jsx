import { useState, useEffect } from "react";
import { X, Send, Copy, AlertCircle, Users, Clock, Calendar } from "lucide-react";
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

    // Initialize messages for each instructor
    // Initialize messages for each instructor
    useEffect(() => {
        if (!instructors || instructors.length === 0) return;

        const defaultMsg = isRTL
            ? `
عزيزي/عزيزتي {instructorName}،
يسرنا إعلامك بأن مجموعة جديدة قد تم تعيينها وتفعيلها بنجاح تحت إشرافك بالتفاصيل التالية:
📘 البرنامج: {courseName}
👥 رمز المجموعة: {groupCode}
📅 تاريخ الحصة الأولى: {startDate}
⏰ الموعد: {timeFrom} – {timeTo}
👦👧 عدد الطلاب: {studentCount}

📌 يرجى التأكد من التالي:
- مراجعة المنهج وخطة الجلسة قبل الحصة الأولى.
- فتح رابط الاجتماع الخاص بنا قبل ١٠-١٥ دقيقة على الأقل للتحضير.
- التأكد من جاهزية جميع الأدوات والحسابات والمواد المطلوبة.
- يجب تسجيل الحضور وتقييم الجلسة بعد كل حصة.

نقدر التزامك واحترافيتك ونتمنى لك رحلة تعليمية ناجحة ومؤثرة مع طلابك.

مع أطيب التحيات،
إدارة Code School 💻`
            : `Teaching Assignment Confirmation – Code School

Dear {instructorName},
We are pleased to inform you that a new group has been successfully assigned and activated under your supervision with the following details:
📘 Program: {courseName}
👥 Group Code: {groupCode}
📅 First Session Date: {startDate}
⏰ Schedule: {timeFrom} – {timeTo}
👦👧 Number of Students: {studentCount}

📌 Please ensure the following:
- Review the curriculum and session plan before the first session.
- Open our meeting link at least 10–15 minutes early for preparation.
- Make sure all required tools, accounts, and materials are ready.
- Attendance and session feedback must be recorded after each class.

We appreciate your commitment and professionalism and wish you a successful and impactful learning journey with your students.

Best regards,
Code School Management 💻`;

        const newMessages = {};
        const newPreviews = {};

        instructors.forEach((instructor) => {
            const id = instructor._id || instructor.id;
            newMessages[id] = defaultMsg;
            newPreviews[id] = false;
            setSelectedInstructors((prev) => {
                if (!prev.includes(id)) return [...prev, id];
                return prev;
            });
        });

        setMessages(newMessages);
        setPreviewStates(newPreviews);
    }, [instructors, isRTL]);

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString(isRTL ? "ar-EG" : "en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const generatePreview = (messageTemplate, instructor) => {
        const studentCount = groupData.currentStudentsCount || 0;
        const preview = messageTemplate
            .replace(/\{instructorName\}/g, instructor.name || t("instructorNotification.defaults.instructor"))
            .replace(/\{courseName\}/g, groupData.courseSnapshot?.title || groupData.course?.title || t("instructorNotification.defaults.course"))
            .replace(/\{groupCode\}/g, groupData.code || t("instructorNotification.defaults.groupCode"))
            .replace(/\{groupName\}/g, groupData.name || t("instructorNotification.defaults.groupName"))
            .replace(/\{startDate\}/g, formatDate(groupData.schedule?.startDate))
            .replace(/\{timeFrom\}/g, groupData.schedule?.timeFrom || t("instructorNotification.defaults.time"))
            .replace(/\{timeTo\}/g, groupData.schedule?.timeTo || t("instructorNotification.defaults.time"))
            .replace(/\{studentCount\}/g, studentCount);

        return preview;
    };

    const toggleInstructor = (instructorId) => {
        setSelectedInstructors((prev) =>
            prev.includes(instructorId)
                ? prev.filter((id) => id !== instructorId)
                : [...prev, instructorId]
        );
    };

    const copyMessage = (instructorId) => {
        const instructor = instructors.find(
            (i) => (i._id || i.id) === instructorId
        );
        const message = generatePreview(messages[instructorId], instructor);
        navigator.clipboard.writeText(message);
        toast.success(isRTL ? t("instructorNotification.messages.copied") : "Copied!");
    };

    const handleSend = async () => {
        if (selectedInstructors.length === 0) {
            toast.error(isRTL ? t("instructorNotification.errors.selectAtLeastOne") : "Select at least one instructor");
            return;
        }

        setSending(true);
        const toastId = toast.loading(isRTL ? t("instructorNotification.status.sending") : "Sending...");

        try {
            const instructorMessages = {};
            selectedInstructors.forEach((instructorId) => {
                const instructor = instructors.find((i) => (i._id || i.id) === instructorId);
                if (instructor) {
                    instructorMessages[instructorId] = generatePreview(
                        messages[instructorId],
                        instructor
                    );
                }
            });

            await onSendNotifications(instructorMessages);
            toast.success(
                isRTL ? t("instructorNotification.messages.sentSuccess") : "Sent successfully!",
                { id: toastId }
            );
            onClose();
        } catch (error) {
            toast.error(error.message || (isRTL ? t("instructorNotification.errors.sendFailed") : "Failed to send"), {
                id: toastId,
            });
        } finally {
            setSending(false);
        }
    };

    if (!isOpen || !instructors || instructors.length === 0) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div
                className="bg-white dark:bg-darkmode rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                dir={isRTL ? "rtl" : "ltr"}
            >
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-primary to-primary/90 text-white p-6 flex items-center justify-between border-b border-primary/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">
                                {isRTL ? t("instructorNotification.title") : "Instructor Notifications"}
                            </h2>
                            <p className="text-sm text-white/80">
                                {isRTL ? t("instructorNotification.subtitle") : "First session notification"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Group Info */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white text-sm font-bold">
                                    {groupData.code?.slice(0, 2) || t("instructorNotification.defaults.groupInitials")}
                                </div>
                                <div>
                                    <h3 className="font-semibold">{groupData.name}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {groupData.courseSnapshot?.title || groupData.course?.title}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 text-sm">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    <span>{formatDate(groupData.schedule?.startDate)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-primary" />
                                    <span>
                                        {groupData.schedule?.timeFrom} - {groupData.schedule?.timeTo}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-primary" />
                                    <span>
                                        {groupData.currentStudentsCount || 0} {isRTL ? t("common.students") : "students"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Instructors Selection */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-sm">
                            {isRTL ? t("instructorNotification.selectInstructors") : "Select Instructors"}
                        </h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {instructors.map((instructor) => {
                                const id = instructor._id || instructor.id;
                                const isSelected = selectedInstructors.includes(id);

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
                                            <p className="font-medium">{instructor.name}</p>
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
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {selectedInstructors.map((instructorId) => {
                            const instructor = instructors.find(
                                (i) => (i._id || i.id) === instructorId
                            );
                            if (!instructor) return null;

                            const showPreview = previewStates[instructorId];
                            const preview = generatePreview(messages[instructorId], instructor);

                            return (
                                <div
                                    key={instructorId}
                                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium">{instructor.name}</h4>
                                        <button
                                            onClick={() => copyMessage(instructorId)}
                                            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                                        >
                                            <Copy className="w-3 h-3" />
                                            {isRTL ? t("common.copy") : "Copy"}
                                        </button>
                                    </div>

                                    <textarea
                                        value={messages[instructorId]}
                                        onChange={(e) =>
                                            setMessages((prev) => ({
                                                ...prev,
                                                [instructorId]: e.target.value,
                                            }))
                                        }
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-dark_input dark:text-white text-sm resize-none h-24 font-mono"
                                        dir={isRTL ? "rtl" : "ltr"}
                                    />

                                    <button
                                        onClick={() =>
                                            setPreviewStates((prev) => ({
                                                ...prev,
                                                [instructorId]: !prev[instructorId],
                                            }))
                                        }
                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        {showPreview ? (isRTL ? t("common.hidePreview") : "Hide Preview") : (isRTL ? t("common.showPreview") : "Show Preview")}
                                    </button>

                                    {showPreview && (
                                        <div
                                            className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm whitespace-pre-wrap break-words max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700"
                                            dir={isRTL ? "rtl" : "ltr"}
                                        >
                                            {preview}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Helper Text */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800 dark:text-amber-300">
                            <p className="font-medium mb-1">
                                {isRTL ? t("instructorNotification.availableVariables") : "Available Variables:"}
                            </p>
                            <div className="space-y-1 text-xs font-mono">
                                <p>{"{instructorName}"} - {isRTL ? t("instructorNotification.variables.instructorName") : "Instructor name"}</p>
                                <p>{"{courseName}"} - {isRTL ? t("instructorNotification.variables.courseName") : "Course name"}</p>
                                <p>{"{groupCode}"} - {isRTL ? t("instructorNotification.variables.groupCode") : "Group code"}</p>
                                <p>{"{startDate}"} - {isRTL ? t("instructorNotification.variables.startDate") : "Start date"}</p>
                                <p>{"{timeFrom}"} - {isRTL ? t("instructorNotification.variables.timeFrom") : "Start time"}</p>
                                <p>{"{timeTo}"} - {isRTL ? t("instructorNotification.variables.timeTo") : "End time"}</p>
                                <p>{"{studentCount}"} - {isRTL ? t("instructorNotification.variables.studentCount") : "Student count"}</p>
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
                        {isRTL ? t("common.cancel") : "Cancel"}
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={sending || selectedInstructors.length === 0}
                        className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
                    >
                        {sending ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                {isRTL ? t("instructorNotification.status.sending") : "Sending..."}
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                {isRTL ? t("instructorNotification.buttons.sendNotifications") : "Send Notifications"}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}