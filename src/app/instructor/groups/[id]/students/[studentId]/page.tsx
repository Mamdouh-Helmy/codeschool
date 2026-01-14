// app/instructor/groups/[id]/students/[studentId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
    User,
    Mail,
    Phone,
    Calendar,
    Clock,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    XCircle,
    Loader2,
    ArrowLeft,
    Eye,
    MessageSquare,
    BookOpen,
    GraduationCap,
    Home,
    Users,
    Clock3,
    BarChart3,
    PieChart,
    LineChart,
    CalendarDays,
    Shield,
    Award,
    Target,
    Download,
    Printer,
    Mail as MailIcon,
    Phone as PhoneIcon,
    MessageCircle,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Star,
    Trophy,
    ShieldAlert,
    ShieldCheck,
    ShieldX,
    Edit,
    RefreshCw,
    Bell,
    CheckSquare,
    FileText,
    CreditCard,
    Globe,
    Hash,
    Layers,
    Video,
    ExternalLink,
    Filter,
    Search,
    MoreVertical,
    Copy,
    Share2,
    QrCode,
    PhoneCall,
    Smartphone,
    UserCheck,
    UserX,
    Clock as ClockIcon,
    Calendar as CalendarIcon,
    AlertTriangle,
    Settings,
} from "lucide-react";

// أنواع البيانات المحدثة (بعد إزالة الواتساب)
interface Student {
    id: string;
    personalInfo: {
        fullName: string;
        email: string;
        phone: string;
        whatsappNumber: string;
        dateOfBirth?: string;
        gender?: string;
        nationalId?: string;
        address?: {
            street: string;
            city: string;
            state: string;
            postalCode: string;
            country: string;
        };
    };
    guardianInfo: {
        name: string;
        relationship: string;
        phone: string;
        whatsappNumber: string;
        email: string;
    };
    enrollmentInfo: {
        enrollmentDate: string;
        status: "Active" | "Suspended" | "Graduated" | "Dropped";
        source: string;
        referredBy?: string;
    };
    academicInfo: {
        level: string;
        groupIds: string[];
        currentCourses: Array<{
            courseId: string;
            enrolledDate: string;
            progressPercentage: number;
        }>;
    };
    communicationPreferences: {
        preferredLanguage: "ar" | "en";
        notificationChannels: {
            email: boolean;
            whatsapp: boolean;
            sms: boolean;
        };
        marketingOptIn: boolean;
    };
    enrollmentNumber: string;
    metadata: {
        createdAt: string;
        updatedAt: string;
        lastSessionReminder24h?: string;
        lastSessionReminder1h?: string;
        totalSessionReminders: number;
    };
}

interface Attendance {
    rate: number;
    attended: number;
    totalSessions: number;
    lastAttendance: string | null;
    consecutiveAbsences: number;
    performance: "good" | "warning" | "danger";
    needsAttention: "normal" | "warning" | "urgent";
    records: Array<{
        sessionId: string;
        title: string;
        date: string;
        startTime: string;
        endTime: string;
        status: string;
        moduleIndex: number;
        sessionNumber: number;
        attendanceStatus: "present" | "absent" | "late" | "excused";
        notes: string;
        markedAt: string;
    }>;
    byDate: Record<string, string>;
}

interface GroupInfo {
    id: string;
    name: string;
    code: string;
    totalSessions: number;
    course: {
        title: string;
        level: string;
    } | null;
}

interface AttendanceStats {
    totalAttendanceRecords: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    attendanceTrends: {
        trend: string;
        change: number;
        direction: string;
        recentAttendance: number;
    };
    currentStreak: number;
}

interface StudentDetailsData {
    student: Student;
    attendance: Attendance;
    groupInfo: GroupInfo;
    stats: AttendanceStats;
}

export default function StudentDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const groupId = params.id as string;
    const studentId = params.studentId as string;

    const [loading, setLoading] = useState(true);
    const [studentData, setStudentData] = useState<StudentDetailsData | null>(null);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("overview");
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    useEffect(() => {
        fetchStudentDetails();
    }, [groupId, studentId]);

    const fetchStudentDetails = async () => {
        try {
            setLoading(true);
            setError("");

            console.log(`👨‍🎓 [Student Details] Fetching data for student: ${studentId}, group: ${groupId}`);

            const response = await fetch(
                `/api/instructor-dashboard/groups/${groupId}/students/${studentId}`,
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                }
            );

            const data = await response.json();

            console.log("📥 [Student Details] API Response:", {
                success: data.success,
                status: response.status,
            });

            if (!response.ok || !data.success) {
                throw new Error(data.message || "فشل في تحميل تفاصيل الطالب");
            }

            setStudentData(data.data);
        } catch (error: any) {
            console.error("❌ [Student Details] Error:", error);
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
                year: "numeric",
            });
        } catch {
            return dateString;
        }
    };

    const formatDateTime = (dateString: string) => {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return "تاريخ غير صالح";

            return date.toLocaleDateString("ar-EG", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return dateString;
        }
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

    const getStatusColor = (status: string) => {
        const colors = {
            present: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
            absent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
            late: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
            excused: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        };
        return colors[status as keyof typeof colors] || colors.present;
    };

    const getPerformanceColor = (performance: string) => {
        const colors = {
            good: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
            warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
            danger: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        };
        return colors[performance as keyof typeof colors] || colors.good;
    };

    const getAttentionColor = (attention: string) => {
        const colors = {
            normal: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
            warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
            urgent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        };
        return colors[attention as keyof typeof colors] || colors.normal;
    };

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    const handleContact = (type: "whatsapp" | "phone" | "email", contact: string) => {
        switch (type) {
            case "whatsapp":
                window.open(`https://wa.me/${contact.replace(/\D/g, "")}`, "_blank");
                break;
            case "phone":
                window.open(`tel:${contact}`, "_blank");
                break;
            case "email":
                window.open(`mailto:${contact}`, "_blank");
                break;
        }
    };

    const exportStudentData = () => {
        if (!studentData) return;

        const data = {
            student: studentData.student,
            attendance: studentData.attendance,
            groupInfo: studentData.groupInfo,
            generatedAt: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `student-${studentData.student.enrollmentNumber}-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="mt-4 text-gray-600 dark:text-gray-300">
                        جاري تحميل تفاصيل الطالب...
                    </p>
                </div>
            </div>
        );
    }

    if (error && !studentData) {
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
                            onClick={fetchStudentDetails}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            حاول مرة أخرى
                        </button>
                        <Link
                            href={`/instructor/groups/${groupId}/students`}
                            className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
                        >
                            العودة للطلاب
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const { student, attendance, groupInfo, stats } = studentData || {
        student: {
            id: "",
            personalInfo: {
                fullName: "غير معروف",
                email: "",
                phone: "",
                whatsappNumber: "",
            },
            guardianInfo: {
                name: "",
                relationship: "",
                phone: "",
                whatsappNumber: "",
                email: "",
            },
            enrollmentInfo: {
                enrollmentDate: new Date().toISOString(),
                status: "Active",
                source: "",
            },
            academicInfo: {
                level: "",
                groupIds: [],
                currentCourses: [],
            },
            communicationPreferences: {
                preferredLanguage: "ar",
                notificationChannels: {
                    email: true,
                    whatsapp: true,
                    sms: false,
                },
                marketingOptIn: true,
            },
            enrollmentNumber: "",
            metadata: {
                createdAt: "",
                updatedAt: "",
                totalSessionReminders: 0,
            },
        },
        attendance: {
            rate: 0,
            attended: 0,
            totalSessions: 0,
            lastAttendance: null,
            consecutiveAbsences: 0,
            performance: "good",
            needsAttention: "normal",
            records: [],
            byDate: {},
        },
        groupInfo: {
            id: "",
            name: "",
            code: "",
            totalSessions: 0,
            course: null,
        },
        stats: {
            totalAttendanceRecords: 0,
            presentCount: 0,
            absentCount: 0,
            lateCount: 0,
            excusedCount: 0,
            attendanceTrends: {
                trend: "stable",
                change: 0,
                direction: "none",
                recentAttendance: 0,
            },
            currentStreak: 0,
        },
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-darkmode">
            {/* Header */}
            <div className="bg-white dark:bg-secondary shadow">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <Link
                                href={`/instructor/groups/${groupId}/students`}
                                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                        <User className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                            {student.personalInfo.fullName}
                                        </h1>
                                        <p className="text-gray-600 dark:text-gray-300">
                                            {student.enrollmentNumber} • {groupInfo.name}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={fetchStudentDetails}
                                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                                title="تحديث البيانات"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>
                            <button
                                onClick={exportStudentData}
                                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                تصدير البيانات
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs - تم تقليلها بعد إزالة الواتساب */}
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
                                onClick={() => setActiveTab("attendance")}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === "attendance"
                                    ? "border-primary text-primary"
                                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                    }`}
                            >
                                <CheckSquare className="w-4 h-4" />
                                الحضور والغياب ({attendance.records.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("details")}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === "details"
                                    ? "border-primary text-primary"
                                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                    }`}
                            >
                                <FileText className="w-4 h-4" />
                                التفاصيل الشخصية
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
                            {/* بطاقة الحضور */}
                            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">نسبة الحضور</p>
                                        <h3 className={`text-2xl font-bold mt-2 ${getAttendanceColor(attendance.rate)}`}>
                                            {attendance.rate}%
                                        </h3>
                                    </div>
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getAttendanceBgColor(attendance.rate)}`}>
                                        <CheckSquare className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {attendance.attended} من {attendance.totalSessions} جلسة
                                </div>
                            </div>

                            {/* بطاقة الغياب المتتالي */}
                            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">الغياب المتتالي</p>
                                        <h3 className={`text-2xl font-bold mt-2 ${attendance.consecutiveAbsences >= 3
                                            ? "text-red-600 dark:text-red-400"
                                            : attendance.consecutiveAbsences >= 2
                                                ? "text-yellow-600 dark:text-yellow-400"
                                                : "text-green-600 dark:text-green-400"
                                            }`}>
                                            {attendance.consecutiveAbsences}
                                        </h3>
                                    </div>
                                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                                        <UserX className="w-6 h-6 text-red-600 dark:text-red-400" />
                                    </div>
                                </div>
                                <div className="text-sm">
                                    <span className={attendance.needsAttention === "urgent"
                                        ? "text-red-600 dark:text-red-400 font-medium"
                                        : "text-gray-500 dark:text-gray-400"
                                    }>
                                        {attendance.needsAttention === "urgent"
                                            ? "يحتاج متابعة عاجلة"
                                            : attendance.needsAttention === "warning"
                                                ? "يحتاج متابعة"
                                                : "حالة طبيعية"
                                        }
                                    </span>
                                </div>
                            </div>

                            {/* بطاقة التقدم */}
                            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">سجل الحضور</p>
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                                            {stats.totalAttendanceRecords}
                                        </h3>
                                    </div>
                                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                                        <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                                    <div
                                        className="h-2 rounded-full bg-primary"
                                        style={{ width: `${Math.min(100, (stats.totalAttendanceRecords / attendance.totalSessions) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* بطاقة حالة التسجيل */}
                            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">حالة التسجيل</p>
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                                            {student.enrollmentInfo.status === "Active" ? "نشط" :
                                                student.enrollmentInfo.status === "Suspended" ? "موقوف" :
                                                    student.enrollmentInfo.status === "Graduated" ? "تخرج" : "منسحب"}
                                        </h3>
                                    </div>
                                    <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                                        <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                    </div>
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {formatShortDate(student.enrollmentInfo.enrollmentDate)}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* معلومات الطالب */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* معلومات الحضور */}
                                <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                                    <div className="flex items-center gap-2 mb-6">
                                        <BarChart3 className="w-5 h-5 text-primary" />
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            أداء الطالب
                                        </h3>
                                        <span className={`px-3 py-1 rounded-full text-sm ${getPerformanceColor(attendance.performance)}`}>
                                            {attendance.performance === "good" ? "ممتاز" :
                                                attendance.performance === "warning" ? "مقبول" : "محفوف بالمخاطر"}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                    نسبة الحضور الكلية
                                                </label>
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-2xl font-bold ${getAttendanceColor(attendance.rate)}`}>
                                                        {attendance.rate}%
                                                    </span>
                                                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                                        <div
                                                            className={`h-3 rounded-full ${getAttendanceBgColor(attendance.rate)}`}
                                                            style={{ width: `${attendance.rate}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                    آخر حضور
                                                </label>
                                                <p className="text-gray-900 dark:text-white font-medium">
                                                    {attendance.lastAttendance ? formatDate(attendance.lastAttendance) : "لم يحضر بعد"}
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                    تسلسل الحضور الحالي
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <Trophy className={`w-5 h-5 ${stats.currentStreak >= 5 ? "text-yellow-500" :
                                                        stats.currentStreak >= 3 ? "text-green-500" : "text-gray-400"
                                                        }`} />
                                                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                                                        {stats.currentStreak} جلسات متتالية
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                    توزيع الحضور
                                                </label>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-green-600 dark:text-green-400">حاضر</span>
                                                        <span className="font-medium">{stats.presentCount}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-red-600 dark:text-red-400">غائب</span>
                                                        <span className="font-medium">{stats.absentCount}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-yellow-600 dark:text-yellow-400">متأخر</span>
                                                        <span className="font-medium">{stats.lateCount}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-blue-600 dark:text-blue-400">معذور</span>
                                                        <span className="font-medium">{stats.excusedCount}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                    اتجاه الحضور
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    {stats.attendanceTrends.direction === "up" ? (
                                                        <>
                                                            <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                                                            <span className="text-green-600 dark:text-green-400 font-medium">
                                                                في تحسن (+{stats.attendanceTrends.change}%)
                                                            </span>
                                                        </>
                                                    ) : stats.attendanceTrends.direction === "down" ? (
                                                        <>
                                                            <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400 transform rotate-180" />
                                                            <span className="text-red-600 dark:text-red-400 font-medium">
                                                                في انخفاض (-{stats.attendanceTrends.change}%)
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <TrendingUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                                            <span className="text-gray-600 dark:text-gray-400 font-medium">مستقر</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* آخر سجلات الحضور */}
                                <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="w-5 h-5 text-primary" />
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                آخر سجلات الحضور
                                            </h3>
                                        </div>
                                        <Link
                                            href={`/instructor/groups/${groupId}/attendance?student=${studentId}`}
                                            className="text-primary hover:text-primary/80 text-sm flex items-center gap-1 transition-colors"
                                        >
                                            عرض الكل
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </div>

                                    <div className="space-y-3">
                                        {attendance.records.slice(0, 5).map((record) => (
                                            <div key={record.sessionId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                                                            {record.title}
                                                        </h4>
                                                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                                            <span>{formatDate(record.date)}</span>
                                                            <span>•</span>
                                                            <span>{record.startTime} - {record.endTime}</span>
                                                            <span>•</span>
                                                            <span>م {record.moduleIndex + 1} - ج {record.sessionNumber}</span>
                                                        </div>
                                                    </div>
                                                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(record.attendanceStatus)}`}>
                                                        {record.attendanceStatus === "present" ? "حاضر" :
                                                            record.attendanceStatus === "absent" ? "غائب" :
                                                                record.attendanceStatus === "late" ? "متأخر" : "معذور"}
                                                    </span>
                                                </div>
                                                {record.notes && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                                        ملاحظات: {record.notes}
                                                    </p>
                                                )}
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                                    مسجل في: {formatDateTime(record.markedAt)}
                                                </div>
                                            </div>
                                        ))}

                                        {attendance.records.length === 0 && (
                                            <div className="text-center py-8">
                                                <CalendarDays className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                                                <p className="text-gray-500 dark:text-gray-400">لا توجد سجلات حضور حتى الآن</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* الجانب الأيمن */}
                            <div className="space-y-6">
                                {/* معلومات المجموعة */}
                                <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Users className="w-5 h-5 text-primary" />
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            معلومات المجموعة
                                        </h3>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                            <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                                                {groupInfo.name}
                                            </h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                {groupInfo.code}
                                            </p>
                                            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <BookOpen className="w-4 h-4" />
                                                    <span>{groupInfo.course?.title || "غير محدد"}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Layers className="w-4 h-4" />
                                                    <span>{attendance.totalSessions} جلسة</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <BarChart3 className="w-4 h-4" />
                                                    <span>حضر {attendance.attended} جلسة</span>
                                                </div>
                                            </div>
                                        </div>

                                        <Link
                                            href={`/instructor/groups/${groupId}`}
                                            className="block w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-center"
                                        >
                                            الذهاب لصفحة المجموعة
                                        </Link>
                                    </div>
                                </div>

                                {/* إجراءات سريعة */}
                                <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Shield className="w-5 h-5 text-primary" />
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            إجراءات سريعة
                                        </h3>
                                    </div>

                                    <div className="space-y-3">
                                        {student.personalInfo.whatsappNumber && (
                                            <button
                                                onClick={() => handleContact("whatsapp", student.personalInfo.whatsappNumber)}
                                                className="w-full px-4 py-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                                مراسلة عبر واتساب
                                            </button>
                                        )}

                                        {student.personalInfo.phone && (
                                            <button
                                                onClick={() => handleContact("phone", student.personalInfo.phone)}
                                                className="w-full px-4 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <PhoneCall className="w-4 h-4" />
                                                الاتصال بالطالب
                                            </button>
                                        )}

                                        {student.personalInfo.email && (
                                            <button
                                                onClick={() => handleContact("email", student.personalInfo.email)}
                                                className="w-full px-4 py-2 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <MailIcon className="w-4 h-4" />
                                                إرسال بريد إلكتروني
                                            </button>
                                        )}

                                        {student.guardianInfo.phone && (
                                            <button
                                                onClick={() => handleContact("phone", student.guardianInfo.phone)}
                                                className="w-full px-4 py-2 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <PhoneCall className="w-4 h-4" />
                                                الاتصال بولي الأمر
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* ملخص أداء الطالب */}
                                <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Trophy className="w-5 h-5 text-primary" />
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            ملخص الأداء
                                        </h3>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-700 dark:text-gray-300">نسبة الحضور</span>
                                            <span className={`font-medium ${getAttendanceColor(attendance.rate)}`}>
                                                {attendance.rate}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-700 dark:text-gray-300">إجمالي الجلسات</span>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {attendance.totalSessions}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-700 dark:text-gray-300">الجلسات الحاضرة</span>
                                            <span className="font-medium text-green-600 dark:text-green-400">
                                                {attendance.attended}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-700 dark:text-gray-300">الغياب المتتالي</span>
                                            <span className={`font-medium ${attendance.consecutiveAbsences >= 3 ? "text-red-600 dark:text-red-400" :
                                                attendance.consecutiveAbsences >= 2 ? "text-yellow-600 dark:text-yellow-400" :
                                                    "text-gray-900 dark:text-white"
                                                }`}>
                                                {attendance.consecutiveAbsences}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-700 dark:text-gray-300">حالة الطالب</span>
                                            <span className={`px-2 py-1 rounded-full text-xs ${getAttentionColor(attendance.needsAttention)}`}>
                                                {attendance.needsAttention === "urgent" ? "يحتاج متابعة عاجلة" :
                                                    attendance.needsAttention === "warning" ? "يحتاج متابعة" : "حالة طبيعية"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "attendance" && (
                    <div className="space-y-6">
                        {/* إحصائيات الحضور */}
                        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                    <div className="text-2xl font-bold text-green-700 dark:text-green-400 mb-1">
                                        {stats.presentCount}
                                    </div>
                                    <div className="text-sm text-green-600 dark:text-green-300">حاضر</div>
                                </div>

                                <div className="text-center p-4 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                    <div className="text-2xl font-bold text-red-700 dark:text-red-400 mb-1">
                                        {stats.absentCount}
                                    </div>
                                    <div className="text-sm text-red-600 dark:text-red-300">غائب</div>
                                </div>

                                <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                    <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400 mb-1">
                                        {stats.lateCount}
                                    </div>
                                    <div className="text-sm text-yellow-600 dark:text-yellow-300">متأخر</div>
                                </div>

                                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-1">
                                        {stats.excusedCount}
                                    </div>
                                    <div className="text-sm text-blue-600 dark:text-blue-300">معذور</div>
                                </div>
                            </div>
                        </div>

                        {/* جدول الحضور */}
                        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <CalendarDays className="w-5 h-5 text-primary" />
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        سجل الحضور الكامل ({attendance.records.length} جلسة)
                                    </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => toggleSection("attendance-chart")}
                                        className="p-2 text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-primary"
                                    >
                                        {expandedSection === "attendance-chart" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {expandedSection === "attendance-chart" && (
                                <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">ملخص أداء الطالب</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <div className="text-lg font-bold text-primary">{attendance.rate}%</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">نسبة الحضور</div>
                                        </div>
                                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <div className="text-lg font-bold text-green-600 dark:text-green-400">{stats.presentCount}</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">حاضر</div>
                                        </div>
                                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <div className="text-lg font-bold text-red-600 dark:text-red-400">{stats.absentCount}</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">غائب</div>
                                        </div>
                                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{stats.lateCount}</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">متأخر</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">الجلسة</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">التاريخ والوقت</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">الموديول</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">الحضور</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">الملاحظات</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">مسجل في</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendance.records.length > 0 ? (
                                            attendance.records.map((record) => (
                                                <tr key={record.sessionId} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">{record.title}</p>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                الجلسة {record.sessionNumber}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div>
                                                            <p className="text-gray-900 dark:text-white">{formatDate(record.date)}</p>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                {record.startTime} - {record.endTime}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className="text-gray-900 dark:text-white">
                                                            الموديول {record.moduleIndex + 1}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(record.attendanceStatus)}`}>
                                                            {record.attendanceStatus === "present" ? "حاضر" :
                                                                record.attendanceStatus === "absent" ? "غائب" :
                                                                    record.attendanceStatus === "late" ? "متأخر" : "معذور"}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <p className="text-gray-900 dark:text-white text-sm max-w-xs truncate">
                                                            {record.notes || "لا توجد ملاحظات"}
                                                        </p>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            {formatDateTime(record.markedAt)}
                                                        </p>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="py-8 text-center">
                                                    <CalendarDays className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                                                    <p className="text-gray-500 dark:text-gray-400">لا توجد سجلات حضور حتى الآن</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ملاحظات الطالب */}
                        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <FileText className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    ملاحظات حول الطالب
                                </h3>
                            </div>

                            <div className="space-y-4">
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">تحليل الأداء</h4>
                                    <div className="space-y-2 text-gray-600 dark:text-gray-400">
                                        <p>
                                            {attendance.performance === "good"
                                                ? "✔ أداء الطالب ممتاز ويحافظ على نسبة حضور عالية."
                                                : attendance.performance === "warning"
                                                    ? "⚠ أداء الطالب مقبول ولكن يمكن تحسين نسبة الحضور."
                                                    : "❌ أداء الطالب يحتاج تحسين فوري في نسبة الحضور."}
                                        </p>
                                        {attendance.consecutiveAbsences > 0 && (
                                            <p>
                                                ⚠ لديه {attendance.consecutiveAbsences} غياب متتالي. {attendance.consecutiveAbsences >= 3
                                                    ? "هذا يدل على مشكلة تحتاج متابعة عاجلة."
                                                    : "يرجى متابعة حالته."}
                                            </p>
                                        )}
                                        {attendance.lastAttendance && (
                                            <p>
                                                📅 آخر حضور: {formatDate(attendance.lastAttendance)}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">توصيات</h4>
                                    <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                                        {attendance.performance === "danger" && (
                                            <li className="flex items-start gap-2">
                                                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                                                <span>يحتاج التواصل مع الطالب وولي الأمر لتوضيح أهمية الحضور.</span>
                                            </li>
                                        )}
                                        {attendance.consecutiveAbsences >= 2 && (
                                            <li className="flex items-start gap-2">
                                                <Bell className="w-4 h-4 text-yellow-500 mt-0.5" />
                                                <span>التأكد من أسباب الغياب المتتالي.</span>
                                            </li>
                                        )}
                                        {attendance.rate < 80 && (
                                            <li className="flex items-start gap-2">
                                                <TrendingUp className="w-4 h-4 text-blue-500 mt-0.5" />
                                                <span>تشجيع الطالب على تحسين نسبة الحضور.</span>
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "details" && (
                    <div className="space-y-6">
                        {/* المعلومات الشخصية */}
                        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <User className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    المعلومات الشخصية
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                            الاسم الكامل
                                        </label>
                                        <p className="text-gray-900 dark:text-white font-medium">
                                            {student.personalInfo.fullName}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                            البريد الإلكتروني
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <p className="text-gray-900 dark:text-white font-medium">
                                                {student.personalInfo.email || "غير متوفر"}
                                            </p>
                                            {student.personalInfo.email && (
                                                <button
                                                    onClick={() => handleContact("email", student.personalInfo.email)}
                                                    className="p-1 text-primary hover:text-primary/80"
                                                >
                                                    <MailIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                            رقم الهاتف
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <p className="text-gray-900 dark:text-white font-medium">
                                                {student.personalInfo.phone || "غير متوفر"}
                                            </p>
                                            {student.personalInfo.phone && (
                                                <button
                                                    onClick={() => handleContact("phone", student.personalInfo.phone)}
                                                    className="p-1 text-primary hover:text-primary/80"
                                                >
                                                    <PhoneIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                            رقم الواتساب
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <p className="text-gray-900 dark:text-white font-medium">
                                                {student.personalInfo.whatsappNumber || "غير متوفر"}
                                            </p>
                                            {student.personalInfo.whatsappNumber && (
                                                <button
                                                    onClick={() => handleContact("whatsapp", student.personalInfo.whatsappNumber)}
                                                    className="p-1 text-primary hover:text-primary/80"
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                            رقم التسجيل
                                        </label>
                                        <p className="text-gray-900 dark:text-white font-medium">
                                            {student.enrollmentNumber}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                            تاريخ الميلاد
                                        </label>
                                        <p className="text-gray-900 dark:text-white font-medium">
                                            {student.personalInfo.dateOfBirth ? formatDate(student.personalInfo.dateOfBirth) : "غير متوفر"}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                            النوع
                                        </label>
                                        <p className="text-gray-900 dark:text-white font-medium">
                                            {student.personalInfo.gender === "male" ? "ذكر" :
                                                student.personalInfo.gender === "female" ? "أنثى" : "غير محدد"}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                            الرقم القومي
                                        </label>
                                        <p className="text-gray-900 dark:text-white font-medium">
                                            {student.personalInfo.nationalId || "غير متوفر"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {student.personalInfo.address && (
                                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">العنوان</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                الشارع
                                            </label>
                                            <p className="text-gray-900 dark:text-white">
                                                {student.personalInfo.address.street || "غير متوفر"}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                المدينة
                                            </label>
                                            <p className="text-gray-900 dark:text-white">
                                                {student.personalInfo.address.city || "غير متوفر"}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                المحافظة
                                            </label>
                                            <p className="text-gray-900 dark:text-white">
                                                {student.personalInfo.address.state || "غير متوفر"}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                الرمز البريدي
                                            </label>
                                            <p className="text-gray-900 dark:text-white">
                                                {student.personalInfo.address.postalCode || "غير متوفر"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* معلومات ولي الأمر */}
                        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <Shield className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    معلومات ولي الأمر
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                            الاسم
                                        </label>
                                        <p className="text-gray-900 dark:text-white font-medium">
                                            {student.guardianInfo.name || "غير متوفر"}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                            العلاقة
                                        </label>
                                        <p className="text-gray-900 dark:text-white font-medium">
                                            {student.guardianInfo.relationship || "غير متوفر"}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                            رقم الهاتف
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <p className="text-gray-900 dark:text-white font-medium">
                                                {student.guardianInfo.phone || "غير متوفر"}
                                            </p>
                                            {student.guardianInfo.phone && (
                                                <button
                                                    onClick={() => handleContact("phone", student.guardianInfo.phone)}
                                                    className="p-1 text-primary hover:text-primary/80"
                                                >
                                                    <PhoneIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                            رقم الواتساب
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <p className="text-gray-900 dark:text-white font-medium">
                                                {student.guardianInfo.whatsappNumber || "غير متوفر"}
                                            </p>
                                            {student.guardianInfo.whatsappNumber && (
                                                <button
                                                    onClick={() => handleContact("whatsapp", student.guardianInfo.whatsappNumber)}
                                                    className="p-1 text-primary hover:text-primary/80"
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* التفضيلات */}
                        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <Settings className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    التفضيلات والإعدادات
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                            لغة التواصل المفضلة
                                        </label>
                                        <p className="text-gray-900 dark:text-white font-medium">
                                            {student.communicationPreferences.preferredLanguage === "ar" ? "العربية" : "الإنجليزية"}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                            قنوات الإشعارات
                                        </label>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${student.communicationPreferences.notificationChannels.email ? "bg-green-500" : "bg-gray-300"}`}></div>
                                                <span className="text-gray-900 dark:text-white">البريد الإلكتروني</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${student.communicationPreferences.notificationChannels.whatsapp ? "bg-green-500" : "bg-gray-300"}`}></div>
                                                <span className="text-gray-900 dark:text-white">الواتساب</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${student.communicationPreferences.notificationChannels.sms ? "bg-green-500" : "bg-gray-300"}`}></div>
                                                <span className="text-gray-900 dark:text-white">رسائل SMS</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                            حالة التسجيل
                                        </label>
                                        <span className={`px-3 py-1 rounded-full text-sm ${student.enrollmentInfo.status === "Active" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" :
                                            student.enrollmentInfo.status === "Suspended" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" :
                                                student.enrollmentInfo.status === "Graduated" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" :
                                                    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                            }`}>
                                            {student.enrollmentInfo.status === "Active" ? "نشط" :
                                                student.enrollmentInfo.status === "Suspended" ? "موقوف" :
                                                    student.enrollmentInfo.status === "Graduated" ? "تخرج" : "منسحب"}
                                        </span>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                            تاريخ التسجيل
                                        </label>
                                        <p className="text-gray-900 dark:text-white font-medium">
                                            {formatDate(student.enrollmentInfo.enrollmentDate)}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                            مصدر التسجيل
                                        </label>
                                        <p className="text-gray-900 dark:text-white font-medium">
                                            {student.enrollmentInfo.source || "غير محدد"}
                                        </p>
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