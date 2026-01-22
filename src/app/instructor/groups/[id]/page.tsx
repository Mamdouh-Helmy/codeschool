"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
    Users,
    Calendar,
    Clock,
    BookOpen,
    TrendingUp,
    BarChart3,
    Eye,
    ChevronRight,
    AlertCircle,
    CheckCircle,
    XCircle,
    Loader2,
    Video,
    Download,
    MessageSquare,
    Bell,
    Phone,
    Mail,
    User,
    GraduationCap,
    Home,
    ArrowLeft,
    RefreshCw,
    FileText,
    Award,
    Target,
    AlertTriangle,
    Shield,
    Zap,
    Star,
    Trophy,
    PieChart,
    Layers,
    Hash,
    Globe,
    CreditCard,
    Settings,
    Edit,
    Trash2,
    MoreVertical,
    Clock3,
    CalendarDays,
    UserCheck,
    UserX,
    CalendarClock,
    BookOpenCheck,
    CheckSquare,
    ClipboardList,
    ChartBar,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Filter,
    Search,
    Plus,
    Minus,
    
} from "lucide-react";

// أنواع البيانات
interface Instructor {
    id: string;
    name: string;
    email: string;
    phone?: string;
}

interface Course {
    id: string;
    title: string;
    level: string;
    description: string;
    curriculum: Array<{
        title: string;
        description: string;
        order: number;
        lessons: Array<{
            title: string;
            order: number;
            sessionNumber: number;
        }>;
    }>;
}

interface Schedule {
    startDate: string;
    daysOfWeek: string[];
    timeFrom: string;
    timeTo: string;
    timezone: string;
}

interface Group {
    id: string;
    name: string;
    code: string;
    status: "active" | "completed" | "draft" | "cancelled";
    course: Course;
    instructors: Instructor[];
    schedule: Schedule;
    pricing: {
        price: number;
        paymentType: string;
        installmentPlan?: {
            numberOfInstallments: number;
            amountPerInstallment: number;
        };
    };
    automation: {
        whatsappEnabled: boolean;
        welcomeMessage: boolean;
        reminderEnabled: boolean;
        reminderBeforeHours: number;
        notifyGuardianOnAbsence: boolean;
        notifyOnSessionUpdate: boolean;
        completionMessage: boolean;
    };
    studentCount: number;
    maxStudents: number;
    metadata: {
        createdAt: string;
        updatedAt: string;
        completedAt?: string;
        completedBy?: string;
        completionMessagesSent?: boolean;
        completionMessagesSentAt?: string;
    };
}

interface Session {
    id: string;
    title: string;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    status: "scheduled" | "completed" | "cancelled" | "postponed";
    moduleIndex: number;
    sessionNumber: number;
    lessonIndexes: number[];
    attendanceTaken: boolean;
    meetingLink: string;
    recordingLink: string;
}

interface Student {
    id: string;
    name: string;
    email: string;
    phone: string;
    whatsapp: string;
    enrollmentNumber: string;
    guardianInfo: {
        name: string;
        relationship: string;
        phone: string;
        whatsappNumber: string;
    };
    attendance: {
        rate: number;
        attended: number;
        totalSessions: number;
        lastAttendance: string;
        streak: number;
        consecutiveAbsences: number;
        status: "good" | "warning" | "danger";
    };
    needsAttention: boolean;
}

interface AttendanceDaily {
    date: string;
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
}

interface ModuleStats {
    moduleNumber: number;
    totalSessions: number;
    completedSessions: number;
    attendanceTaken: number;
    progress: number;
}

interface GroupDetailsData {
    group: Group;
    stats: {
        students: {
            total: number;
            active: number;
            needingAttention: number;
            attendanceRate: number;
        };
        sessions: {
            total: number;
            completed: number;
            upcoming: number;
            cancelled: number;
            postponed: number;
        };
        attendance: {
            overallRate: number;
            sessionsWithAttendance: number;
            totalRecords: number;
            averageDaily: number;
        };
        progress: {
            overall: number;
            byModule: ModuleStats[];
        };
    };
    sessions: {
        all: Session[];
        byModule: Array<{
            moduleIndex: number;
            moduleNumber: number;
            sessions: Session[];
        }>;
        next: {
            id: string;
            title: string;
            date: string;
            time: string;
            moduleIndex: number;
            sessionNumber: number;
        } | null;
        last: {
            id: string;
            title: string;
            date: string;
            attendanceCount: number;
        } | null;
    };
    students: {
        all: Student[];
        needingAttention: Student[];
        topPerformers: Student[];
        attendanceBreakdown: {
            good: number;
            warning: number;
            danger: number;
        };
    };
    attendance: {
        daily: AttendanceDaily[];
        trends: {
            trend: string;
            change: number;
            direction: string;
            currentRate: number;
            previousRate: number;
        };
    };
    moduleProgress: ModuleStats[];
}

export default function GroupDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const groupId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [groupData, setGroupData] = useState<GroupDetailsData | null>(null);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("overview");
    const [expandedModule, setExpandedModule] = useState<number | null>(null);

    useEffect(() => {
        fetchGroupDetails();
    }, [groupId]);

    const fetchGroupDetails = async () => {
        try {
            setLoading(true);
            setError("");

            console.log(`👥 [Group Details] Fetching data for group: ${groupId}`);

            const response = await fetch(`/api/instructor-dashboard/groups/${groupId}`, {
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            });

            const data = await response.json();

            console.log("📥 [Group Details] API Response:", {
                success: data.success,
                status: response.status,
            });

            if (!response.ok || !data.success) {
                throw new Error(data.message || "فشل في تحميل تفاصيل المجموعة");
            }

            setGroupData(data.data);

        } catch (error: any) {
            console.error("❌ [Group Details] Error:", error);
            setError(error.message || "حدث خطأ أثناء تحميل البيانات");

            if (error.message.includes("غير مصرح") || error.message.includes("UNAUTHORIZED")) {
                router.push("/signin");
            }
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return "تاريخ غير صالح";

            return date.toLocaleDateString("ar-EG", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            });
        } catch {
            return dateString;
        }
    };

    const formatTime = (timeString: string) => {
        return timeString || "غير محدد";
    };

    const formatShortDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return "تاريخ غير صالح";

            return date.toLocaleDateString("ar-EG", {
                month: "short",
                day: "numeric",
            });
        } catch {
            return dateString;
        }
    };

    const getDaysInArabic = (days: string[]) => {
        const daysMap: Record<string, string> = {
            Sunday: "الأحد",
            Monday: "الاثنين",
            Tuesday: "الثلاثاء",
            Wednesday: "الأربعاء",
            Thursday: "الخميس",
            Friday: "الجمعة",
            Saturday: "السبت",
        };

        return days.map((day) => daysMap[day] || day).join("، ");
    };

    const getStatusBadge = (status: string) => {
        const config = {
            active: {
                bg: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                text: "نشط",
                icon: TrendingUp,
            },
            completed: {
                bg: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
                text: "مكتمل",
                icon: CheckCircle,
            },
            draft: {
                bg: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
                text: "مسودة",
                icon: AlertCircle,
            },
            cancelled: {
                bg: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
                text: "ملغي",
                icon: XCircle,
            },
        };

        return config[status as keyof typeof config] || config.active;
    };

    const getAttendanceColor = (rate: number) => {
        if (rate >= 80) return "text-green-600 dark:text-green-400";
        if (rate >= 60) return "text-yellow-600 dark:text-yellow-400";
        return "text-red-600 dark:text-red-400";
    };

    const getAttendanceBgColor = (rate: number) => {
        if (rate >= 80) return "bg-green-100 dark:bg-green-900/20";
        if (rate >= 60) return "bg-yellow-100 dark:bg-yellow-900/20";
        return "bg-red-100 dark:bg-red-900/20";
    };

    const getProgressColor = (progress: number) => {
        if (progress >= 80) return "bg-green-600";
        if (progress >= 50) return "bg-yellow-600";
        return "bg-red-600";
    };

    const joinSession = (session: Session) => {
        // ✅ FIX: التحقق بشكل أفضل من وجود رابط الاجتماع
        const hasMeetingLink = session.meetingLink && session.meetingLink.trim() !== "";

        if (hasMeetingLink && session.status === 'scheduled') {
            window.open(session.meetingLink, "_blank");
        } else if (session.status === 'scheduled') {
            alert("لم يتم تعيين رابط للاجتماع لهذه الجلسة بعد. الرجاء التواصل مع الإدارة.");
        } else {
            alert(`لا يمكن الانضمام للجلسة. حالة الجلسة: ${getSessionStatusText(session.status)}`);
        }
    };

    const getSessionStatusText = (status: string) => {
        switch (status) {
            case "scheduled": return "مجدولة";
            case "completed": return "مكتملة";
            case "cancelled": return "ملغاة";
            case "postponed": return "مؤجلة";
            default: return status;
        }
    };

    const getSessionStatusBadge = (status: string) => {
        const config = {
            scheduled: {
                bg: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
                text: "مجدولة",
            },
            completed: {
                bg: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                text: "مكتملة",
            },
            cancelled: {
                bg: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
                text: "ملغاة",
            },
            postponed: {
                bg: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
                text: "مؤجلة",
            },
        };

        return config[status as keyof typeof config] || config.scheduled;
    };

    const getStudentStatusColor = (status: string) => {
        const config = {
            good: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
            warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
            danger: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        };
        return config[status as keyof typeof config] || config.good;
    };

    const toggleModule = (moduleNumber: number) => {
        setExpandedModule(expandedModule === moduleNumber ? null : moduleNumber);
    };

    // ✅ FIX: دالة لفحص وجود رابط الاجتماع
    const hasValidMeetingLink = (session: Session) => {
        return session.meetingLink && session.meetingLink.trim() !== "" &&
            session.meetingLink !== "null" &&
            !session.meetingLink.includes("undefined");
    };

    // ✅ FIX: دالة لجلب الجلسة الكاملة من مصفوفة الجلسات
    const getFullSession = (sessionId: string) => {
        return groupData?.sessions.all.find(s => s.id === sessionId);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="mt-4 text-gray-600 dark:text-gray-300">
                        جاري تحميل تفاصيل المجموعة...
                    </p>
                </div>
            </div>
        );
    }

    if (error && !groupData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
                <div className="text-center max-w-md mx-auto p-6">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        حدث خطأ
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={fetchGroupDetails}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            حاول مرة أخرى
                        </button>
                        <Link
                            href="/instructor/groups"
                            className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
                        >
                            العودة للمجموعات
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const { group, stats, sessions, students, attendance, moduleProgress } = groupData || {
        group: {
            id: "",
            name: "المجموعة",
            code: "غير معروف",
            status: "active",
            course: {
                id: "",
                title: "غير محدد",
                level: "غير محدد",
                description: "",
                curriculum: [],
            },
            instructors: [],
            schedule: {
                startDate: new Date().toISOString(),
                daysOfWeek: [],
                timeFrom: "",
                timeTo: "",
                timezone: "Africa/Cairo",
            },
            pricing: { price: 0, paymentType: "full" },
            automation: {
                whatsappEnabled: true,
                welcomeMessage: true,
                reminderEnabled: true,
                reminderBeforeHours: 24,
                notifyGuardianOnAbsence: true,
                notifyOnSessionUpdate: true,
                completionMessage: true,
            },
            studentCount: 0,
            maxStudents: 0,
            metadata: { createdAt: "", updatedAt: "" },
        },
        stats: {
            students: { total: 0, active: 0, needingAttention: 0, attendanceRate: 0 },
            sessions: { total: 0, completed: 0, upcoming: 0, cancelled: 0, postponed: 0 },
            attendance: { overallRate: 0, sessionsWithAttendance: 0, totalRecords: 0, averageDaily: 0 },
            progress: { overall: 0, byModule: [] },
        },
        sessions: {
            all: [],
            byModule: [],
            next: null,
            last: null,
        },
        students: {
            all: [],
            needingAttention: [],
            topPerformers: [],
            attendanceBreakdown: { good: 0, warning: 0, danger: 0 },
        },
        attendance: {
            daily: [],
            trends: { trend: "stable", change: 0, direction: "none", currentRate: 0, previousRate: 0 },
        },
        moduleProgress: [],
    };

    const statusConfig = getStatusBadge(group.status);
    const StatusIcon = statusConfig.icon;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-darkmode">
            {/* Header */}
            <div className="bg-white dark:bg-secondary shadow">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/instructor/groups"
                                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <Users className="w-5 h-5 text-primary" />
                                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {group.name}
                                    </h1>
                                    <span className={`px-3 py-1 rounded-full text-sm ${statusConfig.bg}`}>
                                        <StatusIcon className="inline w-4 h-4 mr-1 rtl:ml-1" />
                                        {statusConfig.text}
                                    </span>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300">
                                    {group.code} • {group.course.title}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={fetchGroupDetails}
                                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                                title="تحديث البيانات"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>
                            <Link
                                href="/instructor"
                                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                العودة للداشبورد
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="container mx-auto px-4 pt-6">
                <div className="bg-white dark:bg-secondary rounded-xl shadow-lg">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <nav className="flex overflow-x-auto">
                            <button
                                onClick={() => setActiveTab("overview")}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === "overview"
                                    ? "border-primary text-primary"
                                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                    }`}
                            >
                                <Home className="w-4 h-4" />
                                نظرة عامة
                            </button>
                            <button
                                onClick={() => setActiveTab("sessions")}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === "sessions"
                                    ? "border-primary text-primary"
                                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                    }`}
                            >
                                <Calendar className="w-4 h-4" />
                                الجلسات ({sessions.all.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("students")}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === "students"
                                    ? "border-primary text-primary"
                                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                    }`}
                            >
                                <User className="w-4 h-4" />
                                الطلاب ({stats.students.total})
                                {students.needingAttention.length > 0 && (
                                    <span className="px-2 py-0.5 text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-full">
                                        {students.needingAttention.length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab("attendance")}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === "attendance"
                                    ? "border-primary text-primary"
                                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                    }`}
                            >
                                <CheckSquare className="w-4 h-4" />
                                الحضور
                            </button>
                            <button
                                onClick={() => setActiveTab("progress")}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === "progress"
                                    ? "border-primary text-primary"
                                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                    }`}
                            >
                                <TrendingUp className="w-4 h-4" />
                                التقدم
                            </button>
                            <button
                                onClick={() => setActiveTab("settings")}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === "settings"
                                    ? "border-primary text-primary"
                                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                    }`}
                            >
                                <Settings className="w-4 h-4" />
                                الإعدادات
                            </button>
                        </nav>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-6">
                {activeTab === "overview" && (
                    <div className="space-y-6">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* بطاقة الطلاب */}
                            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">الطلاب</p>
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                                            {stats.students.total}
                                        </h3>
                                    </div>
                                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                        <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                </div>
                                <div className="text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">
                                        {stats.students.needingAttention > 0 ? (
                                            <span className="text-red-600 dark:text-red-400 font-medium">
                                                {stats.students.needingAttention} يحتاجون متابعة
                                            </span>
                                        ) : (
                                            "جميع الطلاب بخير"
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* بطاقة الجلسات */}
                            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">الحصص</p>
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                                            {stats.sessions.completed}/{stats.sessions.total}
                                        </h3>
                                    </div>
                                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                        <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
                                    </div>
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {stats.sessions.upcoming} جلسات قادمة
                                </div>
                            </div>

                            {/* بطاقة الحضور */}
                            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">نسبة الحضور</p>
                                        <h3 className={`text-2xl font-bold mt-2 ${getAttendanceColor(stats.attendance.overallRate)}`}>
                                            {stats.attendance.overallRate}%
                                        </h3>
                                    </div>
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getAttendanceBgColor(stats.attendance.overallRate)}`}>
                                        <CheckSquare className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {stats.attendance.sessionsWithAttendance} جلسة تم تسجيل الحضور
                                </div>
                            </div>

                            {/* بطاقة التقدم */}
                            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">التقدم العام</p>
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                                            {stats.progress.overall}%
                                        </h3>
                                    </div>
                                    <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                        <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                    </div>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                                    <div
                                        className={`h-2 rounded-full ${getProgressColor(stats.progress.overall)}`}
                                        style={{ width: `${stats.progress.overall}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* معلومات المجموعة */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* معلومات أساسية */}
                                <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                                    <div className="flex items-center gap-2 mb-6">
                                        <FileText className="w-5 h-5 text-primary" />
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            معلومات المجموعة
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                    اسم المجموعة
                                                </label>
                                                <p className="text-gray-900 dark:text-white font-medium">
                                                    {group.name}
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                    الكود
                                                </label>
                                                <p className="text-gray-900 dark:text-white font-medium">
                                                    {group.code}
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                    الكورس
                                                </label>
                                                <p className="text-gray-900 dark:text-white font-medium">
                                                    {group.course.title} ({group.course.level})
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                    السعة
                                                </label>
                                                <p className="text-gray-900 dark:text-white font-medium">
                                                    {group.studentCount}/{group.maxStudents} طالب
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                    وقت المجموعة
                                                </label>
                                                <p className="text-gray-900 dark:text-white font-medium">
                                                    {group.schedule.timeFrom} - {group.schedule.timeTo}
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                    أيام الأسبوع
                                                </label>
                                                <p className="text-gray-900 dark:text-white font-medium">
                                                    {getDaysInArabic(group.schedule.daysOfWeek)}
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                    تاريخ البدء
                                                </label>
                                                <p className="text-gray-900 dark:text-white font-medium">
                                                    {formatDate(group.schedule.startDate)}
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                    السعر
                                                </label>
                                                <p className="text-gray-900 dark:text-white font-medium">
                                                    {group.pricing.price} جنيه
                                                    {group.pricing.paymentType === "installments" && " (تقسيط)"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* المدرسون */}
                                <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                                    <div className="flex items-center gap-2 mb-6">
                                        <GraduationCap className="w-5 h-5 text-primary" />
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            المدرسون
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {group.instructors.map((instructor) => (
                                            <div key={instructor.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <User className="w-5 h-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium text-gray-900 dark:text-white">
                                                            {instructor.name}
                                                        </h4>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            {instructor.email}
                                                        </p>
                                                    </div>
                                                </div>
                                                {instructor.phone && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                        <Phone className="w-4 h-4" />
                                                        <span>{instructor.phone}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* الجانب الأيمن */}
                            <div className="space-y-6">
                                {/* الجلسة التالية */}
                                {sessions.next && (() => {
                                    // ✅ FIX: البحث عن الجلسة الكاملة في sessions.all
                                    const nextSessionFull = sessions.all.find(s => s.id === sessions.next?.id);
                                    const hasMeetingLink = nextSessionFull ? hasValidMeetingLink(nextSessionFull) : false;

                                    return (
                                        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                                            <div className="flex items-center gap-2 mb-4">
                                                <CalendarClock className="w-5 h-5 text-primary" />
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    الجلسة التالية
                                                </h3>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                                                        {sessions.next.title}
                                                    </h4>
                                                    <div className="space-y-2 text-sm">
                                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                            <Calendar className="w-4 h-4" />
                                                            <span>{formatDate(sessions.next.date)}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                            <Clock className="w-4 h-4" />
                                                            <span>{sessions.next.time}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                            <Layers className="w-4 h-4" />
                                                            <span>الموديول {sessions.next.moduleIndex + 1} - الجلسة {sessions.next.sessionNumber}</span>
                                                        </div>
                                                    </div>
                                                    <div className="mt-3">
                                                        <button
                                                            onClick={() => {
                                                                if (nextSessionFull) joinSession(nextSessionFull);
                                                            }}
                                                            className={`w-full px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${hasMeetingLink && nextSessionFull?.status === 'scheduled'
                                                                    ? "bg-primary text-white hover:bg-primary/90"
                                                                    : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed"
                                                                }`}
                                                            disabled={!hasMeetingLink || nextSessionFull?.status !== 'scheduled'}
                                                            title={!hasMeetingLink ? "لا يوجد رابط للاجتماع" : nextSessionFull?.status !== 'scheduled' ? "الجلسة غير مجدولة" : "انضم للجلسة"}
                                                        >
                                                            <Video className="w-4 h-4" />
                                                            <span>
                                                                {hasMeetingLink && nextSessionFull?.status === 'scheduled'
                                                                    ? "انضم للجلسة"
                                                                    : !hasMeetingLink
                                                                        ? "لا يوجد رابط"
                                                                        : "غير متاح"}
                                                            </span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* طلاب يحتاجون متابعة */}
                                {students.needingAttention.length > 0 && (
                                    <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <AlertTriangle className="w-5 h-5 text-yellow-600" />
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                يحتاجون متابعة
                                            </h3>
                                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full">
                                                {students.needingAttention.length}
                                            </span>
                                        </div>

                                        <div className="space-y-3">
                                            {students.needingAttention.slice(0, 3).map((student) => (
                                                <Link
                                                    key={student.id}
                                                    href={`/instructor/groups/${groupId}/students/${student.id}`}
                                                    className="block border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-all group"
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-yellow-700 transition-colors mb-1">
                                                                {student.name}
                                                            </h4>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                {student.attendance.rate}% حضور • {student.attendance.consecutiveAbsences} غياب متتالي
                                                            </p>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-yellow-600 transition-colors" />
                                                    </div>
                                                </Link>
                                            ))}

                                            {students.needingAttention.length > 3 && (
                                                <Link
                                                    href={`/instructor/groups/${groupId}/students?filter=needs-attention`}
                                                    className="block text-center text-sm text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300 pt-2 border-t border-yellow-200 dark:border-yellow-800"
                                                >
                                                    عرض جميع الطلاب ({students.needingAttention.length})
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* المتفوقون */}
                                {students.topPerformers.length > 0 && (
                                    <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Trophy className="w-5 h-5 text-yellow-600" />
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                الطلاب المتفوقون
                                            </h3>
                                        </div>

                                        <div className="space-y-3">
                                            {students.topPerformers.map((student, index) => (
                                                <div
                                                    key={student.id}
                                                    className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                                                        <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                                                            {index + 1}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-medium text-gray-900 dark:text-white">
                                                            {student.name}
                                                        </h4>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            {student.attendance.rate}% حضور
                                                        </p>
                                                    </div>
                                                    <Star className="w-4 h-4 text-yellow-500" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "sessions" && (
                    <div className="space-y-6">
                        {/* إحصائيات الجلسات */}
                        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-1">
                                        {stats.sessions.total}
                                    </div>
                                    <div className="text-sm text-blue-600 dark:text-blue-300">إجمالي الجلسات</div>
                                </div>

                                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                    <div className="text-2xl font-bold text-green-700 dark:text-green-400 mb-1">
                                        {stats.sessions.completed}
                                    </div>
                                    <div className="text-sm text-green-600 dark:text-green-300">مكتملة</div>
                                </div>

                                <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                    <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400 mb-1">
                                        {stats.sessions.upcoming}
                                    </div>
                                    <div className="text-sm text-yellow-600 dark:text-yellow-300">قادمة</div>
                                </div>

                                <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
                                    <div className="text-2xl font-bold text-gray-700 dark:text-gray-400 mb-1">
                                        {stats.sessions.cancelled}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-300">ملغاة</div>
                                </div>

                                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-400 mb-1">
                                        {stats.sessions.postponed}
                                    </div>
                                    <div className="text-sm text-purple-600 dark:text-purple-300">مؤجلة</div>
                                </div>
                            </div>
                        </div>

                        {/* قائمة الجلسات مقسمة بالموديولات */}
                        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <Layers className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    الجلسات مقسمة بالموديولات
                                </h3>
                            </div>

                            <div className="space-y-4">
                                {sessions.byModule.length > 0 ? (
                                    sessions.byModule.map((module) => (
                                        <div key={module.moduleIndex} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                            <button
                                                onClick={() => toggleModule(module.moduleNumber)}
                                                className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                        <span className="font-bold text-primary">{module.moduleNumber}</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900 dark:text-white">
                                                            الموديول {module.moduleNumber}
                                                        </h4>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            {module.sessions.length} جلسة • {module.sessions.filter(s => s.status === 'completed').length} مكتملة
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className={`px-3 py-1 rounded-full text-sm ${module.sessions.filter(s => s.status === 'completed').length === module.sessions.length
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                                        }`}>
                                                        {Math.round((module.sessions.filter(s => s.status === 'completed').length / module.sessions.length) * 100)}%
                                                    </span>
                                                    {expandedModule === module.moduleNumber ? (
                                                        <ChevronUp className="w-5 h-5 text-gray-400" />
                                                    ) : (
                                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </div>
                                            </button>

                                            {expandedModule === module.moduleNumber && (
                                                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                                                    <div className="space-y-3">
                                                        {module.sessions.map((session) => {
                                                            const statusConfig = getSessionStatusBadge(session.status);
                                                            const hasMeetingLink = hasValidMeetingLink(session);

                                                            return (
                                                                <div
                                                                    key={session.id}
                                                                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                                >
                                                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                                        <div className="flex-1">
                                                                            <div className="flex items-center gap-3 mb-2">
                                                                                <span className={`px-2 py-1 rounded-full text-xs ${statusConfig.bg}`}>
                                                                                    {statusConfig.text}
                                                                                </span>
                                                                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                                                                    الجلسة {session.sessionNumber}
                                                                                </span>
                                                                                {!session.attendanceTaken && session.status === 'completed' && (
                                                                                    <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                                                                        تحتاج تسجيل حضور
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                                                                                {session.title}
                                                                            </h4>

                                                                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                                                                <div className="flex items-center gap-1">
                                                                                    <Calendar className="w-4 h-4" />
                                                                                    <span>{formatDate(session.scheduledDate)}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-1">
                                                                                    <Clock className="w-4 h-4" />
                                                                                    <span>{session.startTime} - {session.endTime}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-1">
                                                                                    <BookOpen className="w-4 h-4" />
                                                                                    <span>الحصص {session.lessonIndexes.map(i => i + 1).join(', ')}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex gap-2">
                                                                            {/* ✅ FIX: عرض زر الانضمام فقط إذا كان هناك رابط صالح */}
                                                                            {session.status === "scheduled" && hasMeetingLink ? (
                                                                                <button
                                                                                    onClick={() => joinSession(session)}
                                                                                    className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1 text-sm"
                                                                                >
                                                                                    <Video className="w-4 h-4" />
                                                                                    <span>انضم</span>
                                                                                </button>
                                                                            ) : session.status === "scheduled" ? (
                                                                                <button
                                                                                    className="px-3 py-2 bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 rounded-lg flex items-center gap-1 text-sm cursor-not-allowed"
                                                                                    disabled
                                                                                    title="لا يوجد رابط للاجتماع"
                                                                                >
                                                                                    <Video className="w-4 h-4" />
                                                                                    <span>لا يوجد رابط</span>
                                                                                </button>
                                                                            ) : null}

                                                                            {session.attendanceTaken ? (
                                                                                <Link
                                                                                    href={`/instructor/sessions/${session.id}/attendance`}
                                                                                    className="px-3 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center gap-1 text-sm"
                                                                                >
                                                                                    <Eye className="w-4 h-4" />
                                                                                    <span>عرض الحضور</span>
                                                                                </Link>
                                                                            ) : session.status === 'completed' ? (
                                                                                <Link
                                                                                    href={`/instructor/sessions/${session.id}/attendance`}
                                                                                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1 text-sm"
                                                                                >
                                                                                    <CheckSquare className="w-4 h-4" />
                                                                                    <span>تسجيل حضور</span>
                                                                                </Link>
                                                                            ) : null}

                                                                            <Link
                                                                                href={`/instructor/sessions/${session.id}`}
                                                                                className="px-3 py-2 border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1 text-sm"
                                                                            >
                                                                                <Eye className="w-4 h-4" />
                                                                                <span>تفاصيل</span>
                                                                            </Link>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                            لا توجد جلسات
                                        </h4>
                                        <p className="text-gray-500 dark:text-gray-400">
                                            لم يتم إنشاء جلسات لهذه المجموعة بعد
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "students" && (
                    <div className="space-y-6">
                        {/* إحصائيات الطلاب */}
                        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-1">
                                        {stats.students.total}
                                    </div>
                                    <div className="text-sm text-blue-600 dark:text-blue-300">إجمالي الطلاب</div>
                                </div>

                                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                    <div className="text-2xl font-bold text-green-700 dark:text-green-400 mb-1">
                                        {students.attendanceBreakdown.good}
                                    </div>
                                    <div className="text-sm text-green-600 dark:text-green-300">ممتازين (80%+)</div>
                                </div>

                                <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                    <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400 mb-1">
                                        {students.attendanceBreakdown.warning}
                                    </div>
                                    <div className="text-sm text-yellow-600 dark:text-yellow-300">مقبولين (60-80%)</div>
                                </div>

                                <div className="text-center p-4 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                    <div className="text-2xl font-bold text-red-700 dark:text-red-400 mb-1">
                                        {students.attendanceBreakdown.danger}
                                    </div>
                                    <div className="text-sm text-red-600 dark:text-red-300">محفوفين بالمخاطر (أقل من 60%)</div>
                                </div>
                            </div>
                        </div>

                        {/* فلتر وبحث */}
                        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* بحث */}
                                <div className="relative">
                                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        placeholder="ابحث عن طالب..."
                                        className="w-full pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
                                    />
                                </div>

                                {/* تصفية حسب الحالة */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        حالة الطالب
                                    </label>
                                    <select className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white">
                                        <option value="all">جميع الطلاب</option>
                                        <option value="good">ممتازين فقط</option>
                                        <option value="warning">مقبولين فقط</option>
                                        <option value="danger">محفوفين بالمخاطر</option>
                                        <option value="needs-attention">يحتاجون متابعة</option>
                                    </select>
                                </div>

                                {/* إجراءات */}
                                <div className="flex items-end gap-2">
                                    <Link
                                        href={`/instructor/groups/${groupId}/students`}
                                        className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Users className="w-4 h-4" />
                                        <span>عرض صفحة الطلاب الكاملة</span>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* قائمة الطلاب */}
                        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-primary" />
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        جميع الطلاب ({students.all.length})
                                    </h3>
                                </div>
                                <Link
                                    href={`/instructor/groups/${groupId}/students`}
                                    className="text-primary hover:text-primary/80 text-sm flex items-center gap-1 transition-colors"
                                >
                                    عرض الكل
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">الطالب</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">نسبة الحضور</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">الحصص</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">آخر حضور</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">الغياب المتتالي</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">الحالة</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.all.length > 0 ? (
                                            students.all.map((student) => (
                                                <tr key={student.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">{student.name}</p>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">{student.enrollmentNumber}</p>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`font-medium ${getAttendanceColor(student.attendance.rate)}`}>
                                                                {student.attendance.rate}%
                                                            </span>
                                                            <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                                <div
                                                                    className={`h-2 rounded-full ${getProgressColor(student.attendance.rate)}`}
                                                                    style={{ width: `${student.attendance.rate}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className="text-gray-700 dark:text-gray-300">
                                                            {student.attendance.attended}/{student.attendance.totalSessions}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className="text-gray-700 dark:text-gray-300">
                                                            {student.attendance.lastAttendance ? formatShortDate(student.attendance.lastAttendance) : "لم يحضر بعد"}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className={`font-medium ${student.attendance.consecutiveAbsences >= 2
                                                            ? "text-red-600 dark:text-red-400"
                                                            : "text-gray-700 dark:text-gray-300"
                                                            }`}>
                                                            {student.attendance.consecutiveAbsences}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs ${getStudentStatusColor(student.attendance.status)}`}>
                                                            {student.attendance.status === "good" ? "ممتاز" :
                                                                student.attendance.status === "warning" ? "مقبول" : "محفوف بالمخاطر"}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex gap-2">
                                                            <Link
                                                                href={`/instructor/groups/${groupId}/students/${student.id}`}
                                                                className="p-2 text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors"
                                                                title="عرض التفاصيل"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </Link>
                                                            <Link
                                                                href={`/instructor/groups/${groupId}/attendance?student=${student.id}`}
                                                                className="p-2 text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors"
                                                                title="سجل الحضور"
                                                            >
                                                                <CheckSquare className="w-4 h-4" />
                                                            </Link>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={7} className="py-8 text-center">
                                                    <Users className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                                                    <p className="text-gray-500 dark:text-gray-400">لا توجد طلاب في هذه المجموعة</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "attendance" && (
                    <div className="space-y-6">
                        {/* إحصائيات الحضور */}
                        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
                                    <div className="text-3xl font-bold text-green-700 dark:text-green-400 mb-2">
                                        {stats.attendance.overallRate}%
                                    </div>
                                    <div className="text-lg font-medium text-green-600 dark:text-green-300 mb-1">نسبة الحضور العامة</div>
                                    <div className="text-sm text-green-500 dark:text-green-400">
                                        من {stats.attendance.totalRecords} تسجيل حضور
                                    </div>
                                </div>

                                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                    <div className="text-3xl font-bold text-blue-700 dark:text-blue-400 mb-2">
                                        {stats.attendance.averageDaily}%
                                    </div>
                                    <div className="text-lg font-medium text-blue-600 dark:text-blue-300 mb-1">متوسط الحضور اليومي</div>
                                    <div className="text-sm text-blue-500 dark:text-blue-400">
                                        {attendance.daily.length} يوم متابعة
                                    </div>
                                </div>

                                <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        {attendance.trends.direction === "up" ? (
                                            <>
                                                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                    +{attendance.trends.change}%
                                                </div>
                                            </>
                                        ) : attendance.trends.direction === "down" ? (
                                            <>
                                                <TrendingUp className="w-6 h-6 transform rotate-180 text-red-600 dark:text-red-400" />
                                                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                                    -{attendance.trends.change}%
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">مستقر</div>
                                        )}
                                    </div>
                                    <div className="text-lg font-medium text-purple-600 dark:text-purple-300 mb-1">اتجاه الحضور</div>
                                    <div className="text-sm text-purple-500 dark:text-purple-400">
                                        {attendance.trends.trend === "improving" ? "في تحسن" :
                                            attendance.trends.trend === "declining" ? "في انخفاض" : "مستقر"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* الحضور اليومي */}
                        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <CalendarDays className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    الحضور خلال آخر 7 أيام
                                </h3>
                            </div>

                            <div className="space-y-4">
                                {attendance.daily.length > 0 ? (
                                    attendance.daily.map((day) => {
                                        const attendanceRate = day.total > 0 ? Math.round((day.present / day.total) * 100) : 0;
                                        return (
                                            <div key={day.date} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                                <div className="flex justify-between items-center mb-3">
                                                    <div>
                                                        <h4 className="font-medium text-gray-900 dark:text-white">
                                                            {formatDate(day.date)}
                                                        </h4>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            {day.total} طالب
                                                        </p>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getAttendanceBgColor(attendanceRate)} ${getAttendanceColor(attendanceRate)}`}>
                                                        {attendanceRate}%
                                                    </span>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-green-600 dark:text-green-400">حاضر</span>
                                                        <span className="font-medium">{day.present}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-red-600 dark:text-red-400">غائب</span>
                                                        <span className="font-medium">{day.absent}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-yellow-600 dark:text-yellow-400">متأخر</span>
                                                        <span className="font-medium">{day.late}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-blue-600 dark:text-blue-400">معذور</span>
                                                        <span className="font-medium">{day.excused}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-8">
                                        <CalendarDays className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                                        <p className="text-gray-500 dark:text-gray-400">لا توجد بيانات حضور خلال الأيام الماضية</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* جلسات تحتاج تسجيل حضور */}
                        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    جلسات تحتاج تسجيل حضور
                                </h3>
                            </div>

                            <div className="space-y-3">
                                {sessions.all.filter(s => s.status === 'completed' && !s.attendanceTaken).length > 0 ? (
                                    sessions.all
                                        .filter(s => s.status === 'completed' && !s.attendanceTaken)
                                        .slice(0, 5)
                                        .map((session) => (
                                            <Link
                                                key={session.id}
                                                href={`/instructor/sessions/${session.id}/attendance`}
                                                className="block border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-all group"
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-yellow-700 transition-colors mb-1">
                                                            {session.title}
                                                        </h4>
                                                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                                            <span>{formatDate(session.scheduledDate)}</span>
                                                            <span>•</span>
                                                            <span>{session.startTime}</span>
                                                            <span>•</span>
                                                            <span>الموديول {session.moduleIndex + 1} - الجلسة {session.sessionNumber}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                                            اضغط لتسجيل الحضور
                                                        </span>
                                                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-yellow-600 transition-colors" />
                                                    </div>
                                                </div>
                                            </Link>
                                        ))
                                ) : (
                                    <div className="text-center py-4">
                                        <CheckCircle className="w-8 h-8 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                                            كل الجلسات المكتملة تم تسجيل حضورها ✓
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "progress" && (
                    <div className="space-y-6">
                        {/* تقدم المجموعة */}
                        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    تقدم المجموعة العام
                                </h3>
                                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                                    {stats.progress.overall}%
                                </span>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">0%</span>
                                    <span className="text-gray-500 dark:text-gray-400">50%</span>
                                    <span className="text-gray-500 dark:text-gray-400">100%</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                                    <div
                                        className={`h-4 rounded-full ${getProgressColor(stats.progress.overall)} transition-all duration-500`}
                                        style={{ width: `${stats.progress.overall}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                                {stats.sessions.completed} من {stats.sessions.total} جلسة مكتملة
                            </div>
                        </div>

                        {/* تقدم الموديولات */}
                        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <Layers className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    تقدم الموديولات
                                </h3>
                            </div>

                            <div className="space-y-6">
                                {moduleProgress.map((module) => (
                                    <div key={module.moduleNumber} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                    <span className="font-bold text-primary">{module.moduleNumber}</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                                        الموديول {module.moduleNumber}
                                                    </h4>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        {module.completedSessions} من {module.totalSessions} جلسة
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${module.progress === 100
                                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                                }`}>
                                                {module.progress}%
                                            </span>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-500 dark:text-gray-400">0%</span>
                                                <span className="text-gray-500 dark:text-gray-400">50%</span>
                                                <span className="text-gray-500 dark:text-gray-400">100%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${getProgressColor(module.progress)}`}
                                                    style={{ width: `${module.progress}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                                            <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                                                <div className="font-medium text-blue-700 dark:text-blue-400">{module.totalSessions}</div>
                                                <div className="text-blue-600 dark:text-blue-300">إجمالي الجلسات</div>
                                            </div>
                                            <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                                                <div className="font-medium text-green-700 dark:text-green-400">{module.completedSessions}</div>
                                                <div className="text-green-600 dark:text-green-300">مكتملة</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "settings" && (
                    <div className="space-y-6">
                        {/* إعدادات المجموعة */}
                        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <Settings className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    إعدادات المجموعة
                                </h3>
                            </div>

                            <div className="space-y-6">
                                {/* معلومات أساسية */}
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">المعلومات الأساسية</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                اسم المجموعة
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={group.name}
                                                    readOnly
                                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                                                />
                                                <button className="p-2 text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-primary">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                كود المجموعة
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={group.code}
                                                    readOnly
                                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                                                />
                                                <button className="p-2 text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-primary">
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* إعدادات الأتمتة */}
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">إعدادات الأتمتة</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="font-medium text-gray-900 dark:text-white">رسائل الواتساب</span>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    إرسال رسائل تلقائية عبر الواتساب
                                                </p>
                                            </div>
                                            <div className="relative inline-block w-12 h-6">
                                                <input
                                                    type="checkbox"
                                                    checked={group.automation.whatsappEnabled}
                                                    readOnly
                                                    className="sr-only peer"
                                                />
                                                <div className={`w-12 h-6 rounded-full peer-checked:bg-primary ${group.automation.whatsappEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                                                    }`}></div>
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${group.automation.whatsappEnabled ? 'translate-x-7' : 'translate-x-1'
                                                    }`}></div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="font-medium text-gray-900 dark:text-white">رسالة الترحيب</span>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    إرسال رسالة ترحيب عند انضمام الطالب
                                                </p>
                                            </div>
                                            <div className="relative inline-block w-12 h-6">
                                                <input
                                                    type="checkbox"
                                                    checked={group.automation.welcomeMessage}
                                                    readOnly
                                                    className="sr-only peer"
                                                />
                                                <div className={`w-12 h-6 rounded-full peer-checked:bg-primary ${group.automation.welcomeMessage ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                                                    }`}></div>
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${group.automation.welcomeMessage ? 'translate-x-7' : 'translate-x-1'
                                                    }`}></div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="font-medium text-gray-900 dark:text-white">تذكير قبل الجلسة</span>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    إرسال تذكير قبل الجلسة بـ {group.automation.reminderBeforeHours} ساعة
                                                </p>
                                            </div>
                                            <div className="relative inline-block w-12 h-6">
                                                <input
                                                    type="checkbox"
                                                    checked={group.automation.reminderEnabled}
                                                    readOnly
                                                    className="sr-only peer"
                                                />
                                                <div className={`w-12 h-6 rounded-full peer-checked:bg-primary ${group.automation.reminderEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                                                    }`}></div>
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${group.automation.reminderEnabled ? 'translate-x-7' : 'translate-x-1'
                                                    }`}></div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="font-medium text-gray-900 dark:text-white">إشعار ولي الأمر</span>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    إشعار ولي الأمر عند غياب الطالب
                                                </p>
                                            </div>
                                            <div className="relative inline-block w-12 h-6">
                                                <input
                                                    type="checkbox"
                                                    checked={group.automation.notifyGuardianOnAbsence}
                                                    readOnly
                                                    className="sr-only peer"
                                                />
                                                <div className={`w-12 h-6 rounded-full peer-checked:bg-primary ${group.automation.notifyGuardianOnAbsence ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                                                    }`}></div>
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${group.automation.notifyGuardianOnAbsence ? 'translate-x-7' : 'translate-x-1'
                                                    }`}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* الإجراءات */}
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">الإجراءات</h4>
                                    <div className="flex flex-wrap gap-3">
                                        <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                                            حفظ التغييرات
                                        </button>
                                        <button className="px-4 py-2 border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                            نسخ رابط المجموعة
                                        </button>
                                        <button className="px-4 py-2 border border-red-300 text-red-700 dark:border-red-600 dark:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                            <Trash2 className="inline w-4 h-4 mr-1 rtl:ml-1" />
                                            حذف المجموعة
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function Copy({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
    );
}