// app/instructor/groups/[id]/evaluations/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
    Users,
    Star,
    Award,
    CheckCircle,
    AlertCircle,
    XCircle,
    Loader2,
    ArrowLeft,
    BarChart3,
    Download,
    Filter,
    Search,
    RefreshCw,
    User,
    GraduationCap,
    Calendar,
    Eye,
    Edit,
    Save,
    X,
    Clock,
    TrendingUp,
    TrendingDown,
    Minus,
    FileText,
    Mail,
    Phone,
    CheckSquare,
    AlertTriangle,
    Shield,
    BookOpen,
    Layers,
} from "lucide-react";

// أنواع البيانات
interface StudentEvaluation {
    id: string;
    name: string;
    email?: string;
    enrollmentNumber?: string;
    attendanceStats: {
        attended: number;
        totalSessions: number;
        percentage: number;
    };
    evaluation: {
        id?: string;
        criteria?: {
            understanding: number;
            commitment: number;
            attendance: number;
            participation: number;
        };
        finalDecision?: 'pass' | 'review' | 'repeat';
        notes?: string;
        calculatedStats?: {
            overallScore: number;
        };
        evaluatedAt?: string;
    } | null;
    isEvaluated: boolean;
}

interface GroupInfo {
    id: string;
    name: string;
    code: string;
    status: string;
    sessionsCompleted: number;
    totalSessions: number;
    evaluationStatus: {
        enabled: boolean;
        enabledAt?: string;
        completed: boolean;
        completedAt?: string;
    };
}

interface EvaluationStats {
    totalStudents: number;
    evaluated: number;
    pending: number;
    decisions: {
        pass: number;
        review: number;
        repeat: number;
    };
}

interface EvaluationResponse {
    success: boolean;
    data: {
        group: GroupInfo;
        students: StudentEvaluation[];
        stats: EvaluationStats;
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    };
    details?: string;
    groupStatus?: string;
    sessionsInfo?: {
        total: number;
        completed: number;
        incomplete?: Array<{
            title: string;
            status: string;
            date: string;
        }>;
    };
}

export default function GroupEvaluationsPage() {
    const router = useRouter();
    const params = useParams();
    const groupId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<StudentEvaluation[]>([]);
    const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
    const [stats, setStats] = useState<EvaluationStats | null>(null);
    const [error, setError] = useState("");
    const [errorDetails, setErrorDetails] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDecision, setFilterDecision] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedStudent, setSelectedStudent] = useState<StudentEvaluation | null>(null);
    const [showEvaluationModal, setShowEvaluationModal] = useState(false);
    const [evaluationForm, setEvaluationForm] = useState({
        understanding: 3,
        commitment: 3,
        attendance: 3,
        participation: 3,
        finalDecision: "pass" as 'pass' | 'review' | 'repeat',
        notes: "",
    });
    const [saving, setSaving] = useState(false);
    const [sessionsInfo, setSessionsInfo] = useState<{
        total: number;
        completed: number;
        incomplete?: Array<{
            title: string;
            status: string;
            date: string;
        }>;
    } | null>(null);

    useEffect(() => {
        fetchEvaluations();
    }, [groupId, currentPage, filterDecision]);

    const fetchEvaluations = async () => {
        try {
            setLoading(true);
            setError("");
            setErrorDetails("");

            console.log(`📊 [Group Evaluations] Fetching evaluations for group: ${groupId}`);

            let url = `/api/instructor-dashboard/groups/${groupId}/evaluations?page=${currentPage}&limit=20`;

            if (searchTerm) {
                url += `&search=${encodeURIComponent(searchTerm)}`;
            }

            if (filterDecision !== "all") {
                url += `&decision=${filterDecision}`;
            }

            const response = await fetch(url, {
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            });

            const result: EvaluationResponse = await response.json();

            console.log("📥 [Group Evaluations] API Response:", {
                success: result.success,
                status: response.status,
                count: result.data?.students?.length,
                groupStatus: result.groupStatus,
                sessionsInfo: result.sessionsInfo,
            });

            if (!response.ok || !result.success) {
                // إذا كانت المشكلة هي أن المجموعة لم تكتمل بعد
                if (result.details?.includes("لا يمكن تقييم الطلاب إلا بعد اكتمال المجموعة")) {
                    setErrorDetails(result.details || `حالة المجموعة: ${result.groupStatus || "غير معروف"}`);
                    setSessionsInfo(result.sessionsInfo || null);
                    
                    // إذا كان هناك معلومات عن الجلسات، عرضها في الكنسول
                    if (result.sessionsInfo) {
                        console.log("📅 [Sessions Info]:", result.sessionsInfo);
                        if (result.sessionsInfo.incomplete && result.sessionsInfo.incomplete.length > 0) {
                            console.log("❌ Incomplete sessions:");
                            result.sessionsInfo.incomplete.forEach(session => {
                                console.log(`  - ${session.title}: ${session.status}`);
                            });
                        }
                    }
                }
                
                setStudents([]);
                setGroupInfo(null);
                setStats(null);
                return;
            }

            setStudents(result.data.students || []);
            setGroupInfo(result.data.group);
            setStats(result.data.stats);
            setSessionsInfo(result.data.group ? {
                total: result.data.group.totalSessions,
                completed: result.data.group.sessionsCompleted,
            } : null);

            // تحديث حالة المجموعة إذا لزم الأمر
            if (result.data.group && !result.data.group.evaluationStatus.enabled) {
                await enableEvaluations();
            }

        } catch (error: any) {
            console.error("❌ [Group Evaluations] Error:", error);
            setError(error.message || "حدث خطأ أثناء تحميل بيانات التقييم");

            if (error.message.includes("غير مصرح") || error.message.includes("UNAUTHORIZED")) {
                router.push("/signin");
            }
        } finally {
            setLoading(false);
        }
    };

    const enableEvaluations = async () => {
        try {
            const response = await fetch(`/api/instructor-dashboard/groups/${groupId}/evaluations/settings`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ action: "enable" }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                console.warn("⚠️ Failed to enable evaluations:", result.message);
            }
        } catch (error) {
            console.error("❌ Error enabling evaluations:", error);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchEvaluations();
    };

    const handleFilterChange = (decision: string) => {
        setFilterDecision(decision);
        setCurrentPage(1);
    };

    const handleEvaluateStudent = (student: StudentEvaluation) => {
        setSelectedStudent(student);

        if (student.evaluation) {
            setEvaluationForm({
                understanding: student.evaluation.criteria?.understanding || 3,
                commitment: student.evaluation.criteria?.commitment || 3,
                attendance: student.evaluation.criteria?.attendance || 3,
                participation: student.evaluation.criteria?.participation || 3,
                finalDecision: student.evaluation.finalDecision || "pass",
                notes: student.evaluation.notes || "",
            });
        } else {
            setEvaluationForm({
                understanding: 3,
                commitment: 3,
                attendance: student.attendanceStats.percentage >= 80 ? 4 :
                    student.attendanceStats.percentage >= 60 ? 3 : 2,
                participation: 3,
                finalDecision: "pass",
                notes: "",
            });
        }

        setShowEvaluationModal(true);
    };

    const handleSaveEvaluation = async () => {
        if (!selectedStudent) return;

        try {
            setSaving(true);

            const response = await fetch(`/api/instructor-dashboard/groups/${groupId}/evaluations`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    studentId: selectedStudent.id,
                    criteria: {
                        understanding: evaluationForm.understanding,
                        commitment: evaluationForm.commitment,
                        attendance: evaluationForm.attendance,
                        participation: evaluationForm.participation,
                    },
                    finalDecision: evaluationForm.finalDecision,
                    notes: evaluationForm.notes,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                if (result.details?.includes("لا يمكن تقييم الطلاب إلا بعد اكتمال المجموعة")) {
                    alert(`❌ ${result.message}\n\n${result.details}\n\nعدد الجلسات المكتملة: ${result.sessionsInfo?.completed}/${result.sessionsInfo?.total}`);
                    return;
                }
                throw new Error(result.message || "فشل في حفظ التقييم");
            }

            // تحديث القائمة
            fetchEvaluations();
            setShowEvaluationModal(false);
            setSelectedStudent(null);

        } catch (error: any) {
            console.error("❌ [Save Evaluation] Error:", error);
            alert(error.message || "حدث خطأ أثناء حفظ التقييم");
        } finally {
            setSaving(false);
        }
    };

    const handleExport = async () => {
        try {
            const response = await fetch(`/api/instructor-dashboard/groups/${groupId}/evaluations/export`, {
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "فشل في تصدير البيانات");
            }

            // تحميل ملف CSV
            const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `تقييمات-${groupInfo?.code}-${new Date().toISOString().split("T")[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error: any) {
            console.error("❌ [Export Evaluations] Error:", error);
            alert(error.message || "حدث خطأ أثناء التصدير");
        }
    };

    const handleMarkCompleted = async () => {
        if (!stats || stats.pending > 0) {
            alert(`لا يمكن إتمام التقييم. لا يزال هناك ${stats?.pending} طالب لم يتم تقييمهم.`);
            return;
        }

        if (!confirm("هل أنت متأكد من إتمام تقييم جميع طلاب المجموعة؟")) {
            return;
        }

        try {
            const response = await fetch(`/api/instructor-dashboard/groups/${groupId}/evaluations/settings`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ action: "mark_completed" }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "فشل في إتمام التقييم");
            }

            alert("تم إتمام تقييم جميع طلاب المجموعة بنجاح");
            fetchEvaluations();

        } catch (error: any) {
            console.error("❌ [Mark Completed] Error:", error);
            alert(error.message || "حدث خطأ أثناء إتمام التقييم");
        }
    };

    const handleMarkGroupCompleted = async () => {
        if (!sessionsInfo || sessionsInfo.completed !== sessionsInfo.total) {
            const incompleteCount = sessionsInfo ? sessionsInfo.total - sessionsInfo.completed : "غير معروف";
            alert(`لا يمكن إكمال المجموعة. لا تزال هناك ${incompleteCount} جلسة لم تكتمل.\n\nيجب إكمال جميع الجلسات أولاً من صفحة الجلسات.`);
            return;
        }

        if (!confirm("هل أنت متأكد من إكمال المجموعة؟ بعد إكمال المجموعة يمكنك البدء في تقييم الطلاب.")) {
            return;
        }

        try {
            const response = await fetch(`/api/instructor-dashboard/groups/${groupId}/complete`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "فشل في إكمال المجموعة");
            }

            alert("تم إكمال المجموعة بنجاح. يمكنك الآن البدء في تقييم الطلاب.");
            fetchEvaluations();

        } catch (error: any) {
            console.error("❌ [Mark Group Completed] Error:", error);
            alert(error.message || "حدث خطأ أثناء إكمال المجموعة");
        }
    };

    const getDecisionColor = (decision: string) => {
        const colors = {
            pass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
            review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
            repeat: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        };
        return colors[decision as keyof typeof colors] || "bg-gray-100 text-gray-800";
    };

    const getDecisionText = (decision: string) => {
        const texts = {
            pass: "ناجح",
            review: "قيد المراجعة",
            repeat: "يعيد",
        };
        return texts[decision as keyof typeof texts] || decision;
    };

    const getScoreColor = (score: number) => {
        if (score >= 4) return "text-green-600 dark:text-green-400";
        if (score >= 3) return "text-yellow-600 dark:text-yellow-400";
        return "text-red-600 dark:text-red-400";
    };

    const getAttendanceColor = (percentage: number) => {
        if (percentage >= 80) return "text-green-600 dark:text-green-400";
        if (percentage >= 60) return "text-yellow-600 dark:text-yellow-400";
        return "text-red-600 dark:text-red-400";
    };

    const renderStars = (score: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                className={`w-4 h-4 ${i < score ? "text-yellow-500 fill-yellow-500" : "text-gray-300 dark:text-gray-600"}`}
            />
        ));
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return "تاريخ غير صالح";
            
            return date.toLocaleDateString("ar-EG", {
                year: "numeric",
                month: "short",
                day: "numeric",
            });
        } catch {
            return dateString;
        }
    };

    if (loading && students.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="mt-4 text-gray-600 dark:text-gray-300">
                        جاري تحميل بيانات التقييم...
                    </p>
                </div>
            </div>
        );
    }

    if (error && students.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-darkmode">
                {/* Header */}
                <div className="bg-white dark:bg-secondary shadow">
                    <div className="container mx-auto px-4 py-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-center gap-4">
                                <Link
                                    href={`/instructor/groups/${groupId}`}
                                    className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </Link>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <AlertCircle className="w-6 h-6 text-red-500" />
                                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                            المجموعة غير مكتملة
                                        </h1>
                                        <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-full text-sm">
                                            غير جاهزة للتقييم
                                        </span>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300">
                                        يجب إكمال جميع جلسات المجموعة أولاً
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Link
                                    href={`/instructor/groups/${groupId}`}
                                    className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
                                >
                                    العودة للمجموعة
                                </Link>
                                <Link
                                    href={`/instructor/groups/${groupId}/sessions`}
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    الذهاب للجلسات
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="container mx-auto px-4 py-8">
                    <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 mb-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                                <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    {error}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-300 mb-4">
                                    {errorDetails}
                                </p>
                                
                                {sessionsInfo && (
                                    <div className="mt-6">
                                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                                            حالة الجلسات:
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-1">
                                                    {sessionsInfo.total}
                                                </div>
                                                <div className="text-sm text-blue-600 dark:text-blue-300">
                                                    إجمالي الجلسات
                                                </div>
                                            </div>

                                            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                                <div className="text-2xl font-bold text-green-700 dark:text-green-400 mb-1">
                                                    {sessionsInfo.completed}
                                                </div>
                                                <div className="text-sm text-green-600 dark:text-green-300">
                                                    جلسات مكتملة
                                                </div>
                                                <div className="text-xs text-green-500 dark:text-green-400 mt-1">
                                                    {Math.round((sessionsInfo.completed / sessionsInfo.total) * 100)}%
                                                </div>
                                            </div>

                                            <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400 mb-1">
                                                    {sessionsInfo.total - sessionsInfo.completed}
                                                </div>
                                                <div className="text-sm text-yellow-600 dark:text-yellow-300">
                                                    جلسات لم تكتمل
                                                </div>
                                                <div className="text-xs text-yellow-500 dark:text-yellow-400 mt-1">
                                                    يتطلب الإكمال
                                                </div>
                                            </div>
                                        </div>

                                        {/* شريط التقدم */}
                                        <div className="mt-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    تقدم الجلسات
                                                </span>
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    {sessionsInfo.completed}/{sessionsInfo.total} ({Math.round((sessionsInfo.completed / sessionsInfo.total) * 100)}%)
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                                <div
                                                    className="h-3 rounded-full bg-gradient-to-r from-yellow-500 to-amber-600"
                                                    style={{ width: `${(sessionsInfo.completed / sessionsInfo.total) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        {/* التعليمات */}
                                        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                            <h5 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                                                📝 التعليمات:
                                            </h5>
                                            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700 dark:text-blue-400">
                                                <li>اذهب إلى صفحة <Link href={`/instructor/groups/${groupId}/sessions`} className="underline font-medium">الجلسات</Link></li>
                                                <li>قم بإكمال جميع الجلسات المتبقية</li>
                                                <li>عد إلى هذه الصفحة للتقييم</li>
                                                <li>يمكنك البدء في تقييم الطلاب بعد إكمال جميع الجلسات</li>
                                            </ol>
                                        </div>

                                        {/* الإجراءات */}
                                        <div className="mt-6 flex flex-col sm:flex-row gap-3">
                                            <Link
                                                href={`/instructor/groups/${groupId}/sessions`}
                                                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Calendar className="w-5 h-5" />
                                                <span>الذهاب إلى الجلسات</span>
                                            </Link>
                                            <button
                                                onClick={fetchEvaluations}
                                                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <RefreshCw className="w-5 h-5" />
                                                <span>تحديث الحالة</span>
                                            </button>
                                            {sessionsInfo.completed === sessionsInfo.total && (
                                                <button
                                                    onClick={handleMarkGroupCompleted}
                                                    className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle className="w-5 h-5" />
                                                    <span>إكمال المجموعة</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const overallScore = selectedStudent?.evaluation?.calculatedStats?.overallScore ||
        Math.round((evaluationForm.understanding + evaluationForm.commitment +
            evaluationForm.attendance + evaluationForm.participation) / 4);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-darkmode">
            {/* Header */}
            <div className="bg-white dark:bg-secondary shadow">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <Link
                                href={`/instructor/groups/${groupId}`}
                                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <Award className="w-6 h-6 text-primary" />
                                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        تقييم طلاب المجموعة
                                    </h1>
                                    {groupInfo && (
                                        <>
                                            <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-sm">
                                                {groupInfo.name} ({groupInfo.code})
                                            </span>
                                            <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full text-sm">
                                                جلسات: {groupInfo.sessionsCompleted}/{groupInfo.totalSessions}
                                            </span>
                                        </>
                                    )}
                                </div>
                                <p className="text-gray-600 dark:text-gray-300">
                                    قم بتقييم طلاب المجموعة بناءً على الأداء والحضور
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={fetchEvaluations}
                                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                                title="تحديث البيانات"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleExport}
                                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                                title="تصدير التقييمات"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                            {stats?.pending === 0 && !groupInfo?.evaluationStatus.completed && (
                                <button
                                    onClick={handleMarkCompleted}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    <span>إتمام التقييم</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-6">
                {/* حالة الجلسات */}
                {groupInfo && groupInfo.sessionsCompleted < groupInfo.totalSessions && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl shadow-lg p-6 mb-6 border border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                                <div>
                                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">
                                        تذكير: جلسات غير مكتملة
                                    </h3>
                                    <p className="text-yellow-700 dark:text-yellow-400 text-sm">
                                        لديك {groupInfo.totalSessions - groupInfo.sessionsCompleted} جلسة لم تكتمل
                                    </p>
                                </div>
                            </div>
                            <Link
                                href={`/instructor/groups/${groupId}/sessions`}
                                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
                            >
                                <Calendar className="w-4 h-4" />
                                <span>الذهاب للجلسات</span>
                            </Link>
                        </div>
                    </div>
                )}

                {/* إحصائيات */}
                {stats && (
                    <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            إحصائيات التقييم
                        </h3>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-1">
                                    {stats.totalStudents}
                                </div>
                                <div className="text-sm text-blue-600 dark:text-blue-300">
                                    إجمالي الطلاب
                                </div>
                            </div>

                            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                <div className="text-2xl font-bold text-green-700 dark:text-green-400 mb-1">
                                    {stats.evaluated}
                                </div>
                                <div className="text-sm text-green-600 dark:text-green-300">
                                    تم تقييمهم
                                </div>
                                <div className="text-xs text-green-500 dark:text-green-400 mt-1">
                                    {Math.round((stats.evaluated / stats.totalStudents) * 100)}%
                                </div>
                            </div>

                            <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400 mb-1">
                                    {stats.pending}
                                </div>
                                <div className="text-sm text-yellow-600 dark:text-yellow-300">
                                    بانتظار التقييم
                                </div>
                                <div className="text-xs text-yellow-500 dark:text-yellow-400 mt-1">
                                    {stats.pending === 0 ? "جاهز للإتمام" : "يتطلب التقييم"}
                                </div>
                            </div>

                            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                <div className="text-2xl font-bold text-purple-700 dark:text-purple-400 mb-1">
                                    {stats.decisions.pass}
                                </div>
                                <div className="text-sm text-purple-600 dark:text-purple-300">
                                    ناجحين
                                </div>
                                <div className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                                    {stats.decisions.review} مراجعة، {stats.decisions.repeat} معادين
                                </div>
                            </div>
                        </div>

                        {/* شريط التقدم */}
                        {stats.totalStudents > 0 && (
                            <div className="mt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        تقدم التقييمات
                                    </span>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {stats.evaluated}/{stats.totalStudents} ({Math.round((stats.evaluated / stats.totalStudents) * 100)}%)
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                    <div
                                        className="h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-600"
                                        style={{ width: `${(stats.evaluated / stats.totalStudents) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* فلتر وبحث */}
                <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* بحث */}
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <form onSubmit={handleSearch}>
                                <input
                                    type="text"
                                    placeholder="ابحث عن طالب بالاسم أو الرقم..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
                                />
                            </form>
                        </div>

                        {/* تصفية حسب القرار */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                القرار النهائي
                            </label>
                            <select
                                value={filterDecision}
                                onChange={(e) => handleFilterChange(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
                            >
                                <option value="all">جميع القرارات</option>
                                <option value="pass">ناجح فقط</option>
                                <option value="review">قيد المراجعة فقط</option>
                                <option value="repeat">يعيد فقط</option>
                                <option value="not_evaluated">لم يتم التقييم</option>
                            </select>
                        </div>

                        {/* إجراءات */}
                        <div className="flex items-end gap-2">
                            <button
                                onClick={fetchEvaluations}
                                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                <span>تحديث البيانات</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* معلومات النتائج */}
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                                عرض {students.length} طالب
                                {stats && ` (${stats.evaluated} تم تقييمهم، ${stats.pending} بانتظار التقييم)`}
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            {groupInfo?.status === "completed" && (
                                <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full text-sm flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" />
                                    المجموعة مكتملة
                                </span>
                            )}
                            {groupInfo?.evaluationStatus.completed && (
                                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-full text-sm flex items-center gap-2">
                                    <Award className="w-4 h-4" />
                                    تم إتمام التقييم
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* قائمة الطلاب */}
                <div className="bg-white dark:bg-secondary rounded-xl shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-right py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                                        الطالب
                                    </th>
                                    <th className="text-right py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                                        الحضور
                                    </th>
                                    <th className="text-right py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                                        التقييم
                                    </th>
                                    <th className="text-right py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                                        القرار النهائي
                                    </th>
                                    <th className="text-right py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                                        إجراءات
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.length > 0 ? (
                                    students.map((student) => (
                                        <tr
                                            key={student.id}
                                            className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <User className="w-5 h-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900 dark:text-white">
                                                            {student.name}
                                                        </h4>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            {student.enrollmentNumber}
                                                            {student.email && ` • ${student.email}`}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-4 px-6">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-bold ${getAttendanceColor(student.attendanceStats.percentage)}`}>
                                                            {student.attendanceStats.percentage}%
                                                        </span>
                                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                                            ({student.attendanceStats.attended}/{student.attendanceStats.totalSessions})
                                                        </span>
                                                    </div>
                                                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                        <div
                                                            className={`h-2 rounded-full ${getAttendanceColor(student.attendanceStats.percentage).replace('text-', 'bg-').split(' ')[0]}`}
                                                            style={{ width: `${student.attendanceStats.percentage}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-4 px-6">
                                                {student.isEvaluated && student.evaluation ? (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            {renderStars(student.evaluation.calculatedStats?.overallScore || 0)}
                                                            <span className={`font-bold ${getScoreColor(student.evaluation.calculatedStats?.overallScore || 0)}`}>
                                                                {student.evaluation.calculatedStats?.overallScore?.toFixed(1) || "0.0"}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                                            تم التقييم في: {student.evaluation.evaluatedAt ? formatDate(student.evaluation.evaluatedAt) : "غير معروف"}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                                        <AlertCircle className="w-5 h-5" />
                                                        <span className="font-medium">لم يتم التقييم</span>
                                                    </div>
                                                )}
                                            </td>

                                            <td className="py-4 px-6">
                                                {student.isEvaluated && student.evaluation?.finalDecision ? (
                                                    <span className={`px-3 py-1 rounded-full text-sm inline-flex items-center gap-1 ${getDecisionColor(student.evaluation.finalDecision)}`}>
                                                        {student.evaluation.finalDecision === 'pass' && <CheckCircle className="w-4 h-4" />}
                                                        {student.evaluation.finalDecision === 'review' && <AlertTriangle className="w-4 h-4" />}
                                                        {student.evaluation.finalDecision === 'repeat' && <XCircle className="w-4 h-4" />}
                                                        {getDecisionText(student.evaluation.finalDecision)}
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                                        لم يتم تحديد
                                                    </span>
                                                )}
                                            </td>

                                            <td className="py-4 px-6">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEvaluateStudent(student)}
                                                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                                                    >
                                                        {student.isEvaluated ? (
                                                            <>
                                                                <Edit className="w-4 h-4" />
                                                                <span>تعديل التقييم</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Star className="w-4 h-4" />
                                                                <span>تقييم الطالب</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center">
                                            <Users className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                                لا توجد نتائج
                                            </h3>
                                            <p className="text-gray-500 dark:text-gray-400 mb-4">
                                                {searchTerm || filterDecision !== "all"
                                                    ? "لا توجد نتائج مطابقة للبحث"
                                                    : "لا توجد طلاب في هذه المجموعة"}
                                            </p>
                                            <div className="flex gap-3 justify-center">
                                                {(searchTerm || filterDecision !== "all") && (
                                                    <button
                                                        onClick={() => {
                                                            setSearchTerm("");
                                                            setFilterDecision("all");
                                                            setCurrentPage(1);
                                                            fetchEvaluations();
                                                        }}
                                                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                                                    >
                                                        إعادة تعيين الفلاتر
                                                    </button>
                                                )}
                                                <Link
                                                    href={`/instructor/groups/${groupId}`}
                                                    className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
                                                >
                                                    العودة للمجموعة
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {stats && Math.ceil(stats.totalStudents / 20) > 1 && (
                    <div className="mt-8 flex justify-center">
                        <nav className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                السابق
                            </button>

                            {Array.from({ length: Math.min(5, Math.ceil(stats.totalStudents / 20)) }, (_, i) => {
                                let pageNum;
                                const totalPages = Math.ceil(stats.totalStudents / 20);

                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`px-3 py-2 rounded-lg ${currentPage === pageNum
                                                ? "bg-primary text-white"
                                                : "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(stats.totalStudents / 20), prev + 1))}
                                disabled={currentPage === Math.ceil(stats.totalStudents / 20)}
                                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                التالي
                            </button>
                        </nav>
                    </div>
                )}
            </div>

            {/* Modal لتقييم الطالب */}
            {showEvaluationModal && selectedStudent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-secondary rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            {/* Header */}
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                        تقييم الطالب: {selectedStudent.name}
                                    </h2>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                                        {selectedStudent.enrollmentNumber} • الحضور: {selectedStudent.attendanceStats.percentage}%
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowEvaluationModal(false)}
                                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* معايير التقييم */}
                            <div className="space-y-6">
                                {/* مستوى الفهم */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="font-medium text-gray-900 dark:text-white">
                                            مستوى الفهم والفهمية
                                        </label>
                                        <span className={`font-bold ${getScoreColor(evaluationForm.understanding)}`}>
                                            {evaluationForm.understanding}/5
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map((score) => (
                                            <button
                                                key={score}
                                                onClick={() => setEvaluationForm(prev => ({ ...prev, understanding: score }))}
                                                className={`flex-1 py-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${evaluationForm.understanding === score
                                                        ? 'border-primary bg-primary/10 text-primary'
                                                        : 'border-gray-300 dark:border-gray-600 hover:border-primary hover:bg-primary/5'
                                                    }`}
                                            >
                                                <div className="flex">
                                                    {renderStars(score)}
                                                </div>
                                                <span className="text-sm font-medium">
                                                    {score === 1 && 'ضعيف جداً'}
                                                    {score === 2 && 'ضعيف'}
                                                    {score === 3 && 'متوسط'}
                                                    {score === 4 && 'جيد'}
                                                    {score === 5 && 'ممتاز'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* الالتزام */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="font-medium text-gray-900 dark:text-white">
                                            الالتزام والإنجاز
                                        </label>
                                        <span className={`font-bold ${getScoreColor(evaluationForm.commitment)}`}>
                                            {evaluationForm.commitment}/5
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map((score) => (
                                            <button
                                                key={score}
                                                onClick={() => setEvaluationForm(prev => ({ ...prev, commitment: score }))}
                                                className={`flex-1 py-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${evaluationForm.commitment === score
                                                        ? 'border-primary bg-primary/10 text-primary'
                                                        : 'border-gray-300 dark:border-gray-600 hover:border-primary hover:bg-primary/5'
                                                    }`}
                                            >
                                                <div className="flex">
                                                    {renderStars(score)}
                                                </div>
                                                <span className="text-sm font-medium">
                                                    {score === 1 && 'غير ملتزم'}
                                                    {score === 2 && 'ضعيف الالتزام'}
                                                    {score === 3 && 'مقبول'}
                                                    {score === 4 && 'ملتزم'}
                                                    {score === 5 && 'متميز'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* الحضور */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="font-medium text-gray-900 dark:text-white">
                                            الحضور والانضباط
                                        </label>
                                        <span className={`font-bold ${getScoreColor(evaluationForm.attendance)}`}>
                                            {evaluationForm.attendance}/5
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map((score) => (
                                            <button
                                                key={score}
                                                onClick={() => setEvaluationForm(prev => ({ ...prev, attendance: score }))}
                                                className={`flex-1 py-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${evaluationForm.attendance === score
                                                        ? 'border-primary bg-primary/10 text-primary'
                                                        : 'border-gray-300 dark:border-gray-600 hover:border-primary hover:bg-primary/5'
                                                    }`}
                                            >
                                                <div className="flex">
                                                    {renderStars(score)}
                                                </div>
                                                <span className="text-sm font-medium">
                                                    {score === 1 && 'مشكلات كبيرة'}
                                                    {score === 2 && 'مقبول مع مشكلات'}
                                                    {score === 3 && 'مقبول'}
                                                    {score === 4 && 'جيد'}
                                                    {score === 5 && 'متميز'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* المشاركة */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="font-medium text-gray-900 dark:text-white">
                                            المشاركة والتفاعل
                                        </label>
                                        <span className={`font-bold ${getScoreColor(evaluationForm.participation)}`}>
                                            {evaluationForm.participation}/5
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map((score) => (
                                            <button
                                                key={score}
                                                onClick={() => setEvaluationForm(prev => ({ ...prev, participation: score }))}
                                                className={`flex-1 py-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${evaluationForm.participation === score
                                                        ? 'border-primary bg-primary/10 text-primary'
                                                        : 'border-gray-300 dark:border-gray-600 hover:border-primary hover:bg-primary/5'
                                                    }`}
                                            >
                                                <div className="flex">
                                                    {renderStars(score)}
                                                </div>
                                                <span className="text-sm font-medium">
                                                    {score === 1 && 'ضعيف جداً'}
                                                    {score === 2 && 'ضعيف'}
                                                    {score === 3 && 'متوسط'}
                                                    {score === 4 && 'جيد'}
                                                    {score === 5 && 'متميز'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* المعدل العام */}
                                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-semibold text-blue-800 dark:text-blue-300">
                                                المعدل العام للتقييم
                                            </h4>
                                            <p className="text-sm text-blue-600 dark:text-blue-400">
                                                متوسط الدرجات في المعايير الأربعة
                                            </p>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                                                {overallScore.toFixed(1)}
                                            </div>
                                            <div className="flex justify-center mt-1">
                                                {renderStars(overallScore)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* القرار النهائي */}
                                <div className="space-y-2">
                                    <label className="font-medium text-gray-900 dark:text-white">
                                        القرار النهائي
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <button
                                            onClick={() => setEvaluationForm(prev => ({ ...prev, finalDecision: "pass" }))}
                                            className={`py-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${evaluationForm.finalDecision === "pass"
                                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                                    : 'border-gray-300 dark:border-gray-600 hover:border-green-500 hover:bg-green-50/50'
                                                }`}
                                        >
                                            <CheckCircle className="w-6 h-6" />
                                            <span className="font-medium">ناجح</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">(Pass)</span>
                                        </button>

                                        <button
                                            onClick={() => setEvaluationForm(prev => ({ ...prev, finalDecision: "review" }))}
                                            className={`py-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${evaluationForm.finalDecision === "review"
                                                    ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                                                    : 'border-gray-300 dark:border-gray-600 hover:border-yellow-500 hover:bg-yellow-50/50'
                                                }`}
                                        >
                                            <AlertTriangle className="w-6 h-6" />
                                            <span className="font-medium">قيد المراجعة</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">(Review)</span>
                                        </button>

                                        <button
                                            onClick={() => setEvaluationForm(prev => ({ ...prev, finalDecision: "repeat" }))}
                                            className={`py-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${evaluationForm.finalDecision === "repeat"
                                                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                                    : 'border-gray-300 dark:border-gray-600 hover:border-red-500 hover:bg-red-50/50'
                                                }`}
                                        >
                                            <XCircle className="w-6 h-6" />
                                            <span className="font-medium">يعيد</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">(Repeat)</span>
                                        </button>
                                    </div>
                                </div>

                                {/* الملاحظات */}
                                <div className="space-y-2">
                                    <label className="font-medium text-gray-900 dark:text-white">
                                        ملاحظات إضافية
                                    </label>
                                    <textarea
                                        value={evaluationForm.notes}
                                        onChange={(e) => setEvaluationForm(prev => ({ ...prev, notes: e.target.value }))}
                                        placeholder="أضف ملاحظاتك عن أداء الطالب، نقاط القوة والضعف، توصيات للمستقبل..."
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
                                        rows={4}
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        هذه الملاحظات ستكون مرئية للطالب والإدارة
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 justify-end mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={() => setShowEvaluationModal(false)}
                                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleSaveEvaluation}
                                    disabled={saving}
                                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>جاري الحفظ...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            <span>حفظ التقييم</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}