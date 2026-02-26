"use client";
import React, { useState, useEffect } from "react";
import {
    Clock,
    Calendar,
    AlertCircle,
    X,
    CheckCircle,
    Plus,
    Minus,
    Snowflake,
    History,
    Package,
    TrendingUp,
    Percent,
    CalendarDays,
    Zap,
    Info,
    Download,
    RefreshCw,
    Filter,
    Eye,
    Edit,
    Trash2,
    ChevronDown,
    ChevronUp,
    Save,
    Loader2,
    AlertTriangle,
    Ban,
    Flame,
    Heart,
    Star,
    Award,
    Crown,
    Gem,
    Shield,
    ShieldAlert,
    ShieldCheck,
    ShieldX,
    BadgeCheck,
    BadgeX,
    BadgeAlert,
    CircleDollarSign,
    CreditCard,
    Wallet,
    PiggyBank,
    Coins,
    Landmark,
    Receipt,
    ReceiptText,
    ReceiptCent,
    ReceiptEuro,
    ReceiptPoundSterling,
    ReceiptRussianRuble,
    ReceiptJapaneseYen,
    ReceiptIndianRupee,
    ReceiptSwissFranc,
    ReceiptBrazilianReal,
    ReceiptChineseYen,
    ReceiptThaiBaht,
    ReceiptKoreanWon,
    ReceiptVietnameseDong,
    ReceiptIndonesianRupiah,
    ReceiptMalaysianRinggit,
    ReceiptSingaporeDollar,
    ReceiptHongKongDollar,
    ReceiptNewZealandDollar,
    ReceiptCanadianDollar,
    ReceiptAustralianDollar,
    ReceiptUS,
    Dollar,
} from "lucide-react";
import toast from "react-hot-toast";
import { useI18n } from "@/i18n/I18nProvider";

export default function CreditHoursManager({ student, onClose, onUpdate }) {
    const { t, locale } = useI18n();
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showAddPackage, setShowAddPackage] = useState(false);
    const [showAddException, setShowAddException] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");
    const [expandedException, setExpandedException] = useState(null);
    const [selectedPackage, setSelectedPackage] = useState(null);

    // ✅ استخدام state داخلي للطالب للتحديث الفوري
    const [currentStudent, setCurrentStudent] = useState(student);

    // ✅ تحديث currentStudent عند تغيير student من الخارج
    useEffect(() => {
        setCurrentStudent(student);
    }, [student]);

    // ✅ التحقق من صحة student object
    useEffect(() => {
        console.log("🎯 CreditHoursManager mounted with student:", currentStudent);
        console.log("🎯 Student ID:", currentStudent?._id || currentStudent?.id);

        if (!currentStudent?._id && !currentStudent?.id) {
            console.error("❌ No valid student ID found!");
            toast.error("Student ID is missing");
            setTimeout(() => onClose(), 2000);
        }
    }, [currentStudent, onClose]);

    // State for new package
    const [newPackage, setNewPackage] = useState({
        packageType: "3months",
        price: 0,
        startDate: new Date().toISOString().split('T')[0]
    });

    // State for new exception
    const [newException, setNewException] = useState({
        type: "freeze",
        hours: 0,
        reason: "",
        startDate: new Date().toISOString().split('T')[0],
        endDate: "",
        notes: ""
    });

    // Package types with their hours
    const packageTypes = {
        "3months": { label: t("credit.packages.3months"), hours: 24, icon: "🌱", color: "green" },
        "6months": { label: t("credit.packages.6months"), hours: 48, icon: "🌿", color: "blue" },
        "9months": { label: t("credit.packages.9months"), hours: 72, icon: "🌳", color: "purple" },
        "12months": { label: t("credit.packages.12months"), hours: 96, icon: "🌲", color: "amber" }
    };

    // Exception types
    const exceptionTypes = {
        freeze: { label: t("credit.exceptions.freeze"), icon: Snowflake, color: "blue", description: t("credit.exceptions.freezeDesc") },
        deduction: { label: t("credit.exceptions.deduction"), icon: Minus, color: "red", description: t("credit.exceptions.deductionDesc") },
        addition: { label: t("credit.exceptions.addition"), icon: Plus, color: "green", description: t("credit.exceptions.additionDesc") }
    };

    // ✅ حساب الرصيد الفعلي مع مراعاة الاستثناءات
    const calculateEffectiveRemainingHours = (creditSystem) => {
        if (!creditSystem) return 0;

        let total = 0;

        // رصيد الحزمة الحالية
        if (creditSystem.currentPackage) {
            total += creditSystem.currentPackage.remainingHours || 0;
        }

        // الاستثناءات النشطة من نوع addition
        if (creditSystem.exceptions) {
            const activeAdditions = creditSystem.exceptions.filter(
                e => e.type === 'addition' &&
                    e.status === 'active' &&
                    (!e.endDate || new Date() <= new Date(e.endDate))
            );
            activeAdditions.forEach(e => {
                total += e.hours || 0;
            });
        }

        return total;
    };

    // Get credit stats من currentStudent مع مراعاة الاستثناءات
    const stats = currentStudent?.creditSystem ? {
        hasPackage: !!currentStudent.creditSystem.currentPackage,
        packageType: currentStudent.creditSystem.currentPackage?.packageType,
        totalHours: currentStudent.creditSystem.currentPackage?.totalHours || 0,
        usedHours: currentStudent.creditSystem.stats?.totalHoursUsed || 0,

        // ✅ استخدام القيمة من creditInfo أولاً، ثم remainingHours من الباك إند
        remainingHours: currentStudent?.creditInfo?.remainingHours ||
            currentStudent.creditSystem.currentPackage?.remainingHours || 0,

        usagePercentage: currentStudent.creditSystem.currentPackage?.totalHours > 0
            ? Math.round((currentStudent.creditSystem.stats?.totalHoursUsed || 0) / currentStudent.creditSystem.currentPackage.totalHours * 100)
            : 0,
        status: currentStudent.creditSystem.status || "no_package",
        activeExceptions: currentStudent.creditSystem.exceptions?.filter(e => e.status === "active") || [],
        packageEndDate: currentStudent.creditSystem.currentPackage?.endDate,
        lastUsage: currentStudent.creditSystem.stats?.lastUsageDate,
        totalSessions: currentStudent.creditSystem.stats?.totalSessionsAttended || 0,
        packageId: currentStudent.creditSystem.currentPackage?._id
    } : {
        hasPackage: false,
        status: "no_package",
        activeExceptions: [],
        totalHours: 0,
        usedHours: 0,
        remainingHours: 0,
        usagePercentage: 0,
        totalSessions: 0,
        packageId: null
    };


    // ✅ الحصول على ID الطالب بشكل آمن
    const getStudentId = () => {
        return currentStudent?._id || currentStudent?.id;
    };

    // ✅ Handle deleting package
    const handleDeletePackage = async () => {
        const studentId = getStudentId();

        if (!studentId) {
            toast.error("Student ID is missing");
            return;
        }

        if (!stats.hasPackage) {
            toast.error("No active package to delete");
            return;
        }

        if (!confirm("Are you sure you want to delete this package? This action cannot be undone.")) {
            return;
        }

        setDeleting(true);
        try {
            console.log("🗑️ Deleting package for student ID:", studentId);

            const response = await fetch(`/api/students/${studentId}/credit-package`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                }
            });

            const data = await response.json();
            console.log("🗑️ Server response:", data);

            if (data.success) {
                toast.success("Package deleted successfully");

                // ✅ تحديث currentStudent فوراً
                if (data.student) {
                    setCurrentStudent(prev => ({
                        ...prev,
                        creditSystem: data.student.creditSystem
                    }));

                    // إرسال التحديث للـ parent
                    if (onUpdate) {
                        onUpdate({
                            ...currentStudent,
                            creditSystem: data.student.creditSystem
                        });
                    }
                }
            } else {
                toast.error(data.message || "Failed to delete package");
            }
        } catch (error) {
            console.error("❌ Error deleting package:", error);
            toast.error(error.message || "Error deleting package");
        } finally {
            setDeleting(false);
        }
    };

    // Handle adding new package
    const handleAddPackage = async () => {
        const studentId = getStudentId();

        if (!studentId) {
            toast.error("Student ID is missing");
            return;
        }

        setLoading(true);
        try {
            console.log("📦 Adding package for student ID:", studentId);

            const response = await fetch(`/api/students/${studentId}/credit-package`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(newPackage)
            });

            const data = await response.json();
            console.log("📦 Server response:", data);

            if (data.success) {
                toast.success(t("credit.packageAdded"));
                setShowAddPackage(false);

                // ✅ تحديث currentStudent فوراً بالبيانات الجديدة
                if (data.student) {
                    setCurrentStudent(data.student);

                    // إرسال التحديث للـ parent
                    if (onUpdate) {
                        onUpdate(data.student);
                    }
                }
            } else {
                toast.error(data.message || t("common.error"));
            }
        } catch (error) {
            console.error("❌ Error adding package:", error);
            toast.error(error.message || t("common.error"));
        } finally {
            setLoading(false);
        }
    };

    // Handle adding new exception
    const handleAddException = async () => {
        const studentId = getStudentId();

        if (!studentId) {
            toast.error("Student ID is missing");
            return;
        }

        setLoading(true);
        try {
            console.log("📝 Adding exception for student ID:", studentId);

            const response = await fetch(`/api/students/${studentId}/credit-exception`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(newException)
            });

            const data = await response.json();
            console.log("📝 Server response:", data);

            if (data.success) {
                toast.success(t("credit.exceptionAdded"));
                setShowAddException(false);

                // ✅ تحديث currentStudent فوراً بالبيانات الجديدة
                if (data.student) {
                    setCurrentStudent(data.student);

                    // إرسال التحديث للـ parent
                    if (onUpdate) {
                        onUpdate(data.student);
                    }
                }
            } else {
                toast.error(data.message || t("common.error"));
            }
        } catch (error) {
            console.error("❌ Error adding exception:", error);
            toast.error(error.message || t("common.error"));
        } finally {
            setLoading(false);
        }
    };

    // Handle ending exception
    const handleEndException = async (exceptionId) => {
        const studentId = getStudentId();

        if (!studentId) {
            toast.error("Student ID is missing");
            return;
        }

        if (!exceptionId) {
            toast.error("Exception ID is missing");
            return;
        }

        if (!confirm(t("credit.confirmEndException"))) return;

        setLoading(true);
        try {
            console.log("🔚 Ending exception:", { studentId, exceptionId });

            const response = await fetch(`/api/students/${studentId}/credit-exception/${exceptionId}/end`, {
                method: "POST"
            });

            const data = await response.json();
            console.log("🔚 Server response:", data);

            if (data.success) {
                toast.success(t("credit.exceptionEnded"));

                // ✅ تحديث currentStudent فوراً بالبيانات الجديدة
                if (data.student) {
                    setCurrentStudent(data.student);

                    // إرسال التحديث للـ parent
                    if (onUpdate) {
                        onUpdate(data.student);
                    }
                }
            } else {
                toast.error(data.message || t("common.error"));
            }
        } catch (error) {
            console.error("❌ Error ending exception:", error);
            toast.error(error.message || t("common.error"));
        } finally {
            setLoading(false);
        }
    };

    // Get status color
    const getStatusColor = (status) => {
        switch (status) {
            case "active": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
            case "frozen": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
            case "expired": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
            case "completed": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
            case "no_package": return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
            default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
        }
    };

    // Get status icon
    const getStatusIcon = (status) => {
        switch (status) {
            case "active": return <CheckCircle className="w-4 h-4" />;
            case "frozen": return <Snowflake className="w-4 h-4" />;
            case "expired": return <Ban className="w-4 h-4" />;
            case "completed": return <Award className="w-4 h-4" />;
            default: return <AlertCircle className="w-4 h-4" />;
        }
    };

    // Format date
    const formatDate = (date) => {
        if (!date) return "N/A";
        return new Date(date).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Calculate days remaining
    const getDaysRemaining = (endDate) => {
        if (!endDate) return 0;
        const days = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
        return days > 0 ? days : 0;
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-darkmode rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-PowderBlueBorder dark:border-dark_border flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                            <Package className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-MidnightNavyText dark:text-white flex items-center gap-2">
                                {t("credit.management")}
                                {stats.hasPackage && (
                                    <span className={`text-sm px-3 py-1 rounded-full ${getStatusColor(stats.status)} flex items-center gap-1`}>
                                        {getStatusIcon(stats.status)}
                                        {t(`credit.status.${stats.status}`)}
                                    </span>
                                )}
                            </h2>
                            <p className="text-sm text-SlateBlueText dark:text-darktext">
                                {currentStudent?.personalInfo?.fullName} • {currentStudent?.enrollmentNumber}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 pt-4 border-b border-PowderBlueBorder dark:border-dark_border">
                    <div className="flex gap-2">
                        {[
                            { id: "overview", label: t("credit.tabs.overview"), icon: Eye },
                            { id: "packages", label: t("credit.tabs.packages"), icon: Package },
                            { id: "exceptions", label: t("credit.tabs.exceptions"), icon: AlertCircle },
                            { id: "history", label: t("credit.tabs.history"), icon: History }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 text-sm font-medium rounded-t-lg flex items-center gap-2 transition-colors ${activeTab === tab.id
                                    ? "bg-primary text-white"
                                    : "hover:bg-gray-100 dark:hover:bg-gray-800 text-MidnightNavyText dark:text-white"
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Overview Tab */}
                    {activeTab === "overview" && (
                        <div className="space-y-6">
                            {/* Main Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* Total Hours */}
                                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-5 text-white shadow-lg">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                            <Clock className="w-5 h-5" />
                                        </div>
                                        <span className="text-2xl font-bold">{stats.totalHours}</span>
                                    </div>
                                    <p className="text-sm opacity-90">{t("credit.totalHours")}</p>
                                    <p className="text-xs opacity-75 mt-1">{t("credit.purchased")}</p>
                                </div>

                                {/* Used Hours */}
                                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-5 text-white shadow-lg">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                            <TrendingUp className="w-5 h-5" />
                                        </div>
                                        <span className="text-2xl font-bold">{stats.usedHours}</span>
                                    </div>
                                    <p className="text-sm opacity-90">{t("credit.usedHours")}</p>
                                    <p className="text-xs opacity-75 mt-1">{stats.totalSessions} {t("credit.sessions")}</p>
                                </div>

                                {/* Remaining Hours */}
                                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-5 text-white shadow-lg">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                            <Zap className="w-5 h-5" />
                                        </div>
                                        <span className="text-2xl font-bold">{stats.remainingHours}</span>
                                    </div>
                                    <p className="text-sm opacity-90">{t("credit.remainingHours")}</p>
                                    <div className="mt-2 bg-white/20 rounded-full h-1.5">
                                        <div
                                            className="bg-white h-1.5 rounded-full transition-all"
                                            style={{ width: `${stats.usagePercentage}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Days Remaining */}
                                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-5 text-white shadow-lg">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                            <CalendarDays className="w-5 h-5" />
                                        </div>
                                        <span className="text-2xl font-bold">
                                            {stats.packageEndDate ? getDaysRemaining(stats.packageEndDate) : 0}
                                        </span>
                                    </div>
                                    <p className="text-sm opacity-90">{t("credit.daysRemaining")}</p>
                                    <p className="text-xs opacity-75 mt-1">
                                        {stats.packageEndDate ? formatDate(stats.packageEndDate) : t("credit.noPackage")}
                                    </p>
                                </div>
                            </div>

                            {/* Package Details */}
                            {stats.hasPackage ? (
                                <div className="bg-white dark:bg-dark_input rounded-xl border border-PowderBlueBorder dark:border-dark_border p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white flex items-center gap-2">
                                            <Package className="w-5 h-5 text-primary" />
                                            {t("credit.currentPackage")}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setSelectedPackage(currentStudent.creditSystem.currentPackage)}
                                                className="text-sm text-primary hover:underline flex items-center gap-1"
                                            >
                                                <Eye className="w-4 h-4" />
                                                {t("common.view")}
                                            </button>
                                            {/* ✅ زر حذف الحزمة */}
                                            <button
                                                onClick={handleDeletePackage}
                                                disabled={deleting}
                                                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                                title="Delete package"
                                            >
                                                {deleting ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                                <span className="hidden md:inline">Delete</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <p className="text-xs text-SlateBlueText dark:text-darktext">{t("credit.packageType")}</p>
                                            <p className="text-lg font-semibold text-MidnightNavyText dark:text-white">
                                                {packageTypes[stats.packageType]?.icon} {packageTypes[stats.packageType]?.label}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-SlateBlueText dark:text-darktext">{t("credit.startDate")}</p>
                                            <p className="text-lg font-semibold text-MidnightNavyText dark:text-white">
                                                {formatDate(currentStudent.creditSystem.currentPackage.startDate)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-SlateBlueText dark:text-darktext">{t("credit.endDate")}</p>
                                            <p className="text-lg font-semibold text-MidnightNavyText dark:text-white">
                                                {formatDate(currentStudent.creditSystem.currentPackage.endDate)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-SlateBlueText dark:text-darktext">{t("credit.price")}</p>
                                            <p className="text-lg font-semibold text-MidnightNavyText dark:text-white">
                                                {currentStudent.creditSystem.currentPackage.price || 0} EGP
                                            </p>
                                        </div>
                                    </div>

                                    {/* Usage Progress */}
                                    <div className="mt-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-SlateBlueText dark:text-darktext">{t("credit.usageProgress")}</span>
                                            <span className="text-sm font-semibold text-MidnightNavyText dark:text-white">
                                                {stats.usedHours} / {stats.totalHours} {t("credit.hours")} ({stats.usagePercentage}%)
                                            </span>
                                        </div>
                                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-3 rounded-full transition-all ${stats.usagePercentage > 80 ? 'bg-red-500' :
                                                    stats.usagePercentage > 60 ? 'bg-orange-500' :
                                                        stats.usagePercentage > 40 ? 'bg-yellow-500' :
                                                            'bg-green-500'
                                                    }`}
                                                style={{ width: `${stats.usagePercentage}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-dark_input rounded-xl border border-PowderBlueBorder dark:border-dark_border p-8 text-center">
                                    <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-2">
                                        {t("credit.noPackage")}
                                    </h3>
                                    <p className="text-sm text-SlateBlueText dark:text-darktext mb-4">
                                        {t("credit.noPackageDesc")}
                                    </p>
                                    <button
                                        onClick={() => setShowAddPackage(true)}
                                        className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-semibold inline-flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        {t("credit.addPackage")}
                                    </button>
                                </div>
                            )}

                            {/* Active Exceptions */}
                            {stats.activeExceptions.length > 0 && (
                                <div className="bg-white dark:bg-dark_input rounded-xl border border-PowderBlueBorder dark:border-dark_border p-6">
                                    <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-4 flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5 text-amber-500" />
                                        {t("credit.activeExceptions")} ({stats.activeExceptions.length})
                                    </h3>

                                    <div className="space-y-3">
                                        {stats.activeExceptions.map(exception => {
                                            const ExceptionIcon = exceptionTypes[exception.type]?.icon || AlertCircle;
                                            return (
                                                <div key={exception._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${exception.type === 'freeze' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                                                            exception.type === 'deduction' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                                                                'bg-green-100 dark:bg-green-900/30 text-green-600'
                                                            }`}>
                                                            <ExceptionIcon className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-MidnightNavyText dark:text-white">
                                                                {exceptionTypes[exception.type]?.label}
                                                            </p>
                                                            <p className="text-xs text-SlateBlueText dark:text-darktext">
                                                                {exception.reason} • {formatDate(exception.startDate)} - {exception.endDate ? formatDate(exception.endDate) : t("credit.ongoing")}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleEndException(exception._id)}
                                                        className="px-3 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                                    >
                                                        {t("credit.endException")}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Quick Actions */}
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setShowAddPackage(true)}
                                    className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl hover:shadow-md transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Plus className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold text-MidnightNavyText dark:text-white">{t("credit.addPackage")}</p>
                                            <p className="text-xs text-SlateBlueText dark:text-darktext">{t("credit.addPackageDesc")}</p>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setShowAddException(true)}
                                    className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl hover:shadow-md transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <AlertCircle className="w-5 h-5 text-amber-500" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold text-MidnightNavyText dark:text-white">{t("credit.addException")}</p>
                                            <p className="text-xs text-SlateBlueText dark:text-darktext">{t("credit.addExceptionDesc")}</p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Packages Tab */}
                    {activeTab === "packages" && (
                        <div className="space-y-6">
                            {/* Current Package */}
                            {stats.hasPackage && (
                                <div className="bg-white dark:bg-dark_input rounded-xl border border-PowderBlueBorder dark:border-dark_border p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white flex items-center gap-2">
                                            <Crown className="w-5 h-5 text-amber-500" />
                                            {t("credit.currentPackage")}
                                        </h3>
                                        <button
                                            onClick={handleDeletePackage}
                                            disabled={deleting}
                                            className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            {deleting ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                            <span>Delete</span>
                                        </button>
                                    </div>
                                    <PackageCard
                                        pkg={currentStudent.creditSystem.currentPackage}
                                        stats={stats}
                                        packageTypes={packageTypes}
                                        formatDate={formatDate}
                                    />
                                </div>
                            )}

                            {/* Package History */}
                            {currentStudent.creditSystem?.packagesHistory?.length > 0 && (
                                <div className="bg-white dark:bg-dark_input rounded-xl border border-PowderBlueBorder dark:border-dark_border p-6">
                                    <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-4 flex items-center gap-2">
                                        <History className="w-5 h-5 text-purple-500" />
                                        {t("credit.packageHistory")}
                                    </h3>
                                    <div className="space-y-3">
                                        {currentStudent.creditSystem.packagesHistory.map((pkg, index) => (
                                            <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                <PackageCard
                                                    pkg={pkg}
                                                    stats={{
                                                        totalHours: pkg.totalHours,
                                                        usedHours: pkg.totalHours - pkg.remainingHours,
                                                        remainingHours: pkg.remainingHours,
                                                        usagePercentage: pkg.totalHours > 0
                                                            ? Math.round((pkg.totalHours - pkg.remainingHours) / pkg.totalHours * 100)
                                                            : 0
                                                    }}
                                                    packageTypes={packageTypes}
                                                    formatDate={formatDate}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Add Package Button */}
                            <button
                                onClick={() => setShowAddPackage(true)}
                                className="w-full p-4 border-2 border-dashed border-PowderBlueBorder dark:border-dark_border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Plus className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                                    <span className="font-semibold text-MidnightNavyText dark:text-white">
                                        {t("credit.addNewPackage")}
                                    </span>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* Exceptions Tab */}
                    {activeTab === "exceptions" && (
                        <div className="space-y-6">
                            {/* Active Exceptions */}
                            {stats.activeExceptions.length > 0 && (
                                <div className="bg-white dark:bg-dark_input rounded-xl border border-PowderBlueBorder dark:border-dark_border p-6">
                                    <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-4 flex items-center gap-2">
                                        <Flame className="w-5 h-5 text-red-500" />
                                        {t("credit.activeExceptions")} ({stats.activeExceptions.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {stats.activeExceptions.map(exception => (
                                            <ExceptionCard
                                                key={exception._id}
                                                exception={exception}
                                                exceptionTypes={exceptionTypes}
                                                formatDate={formatDate}
                                                onEnd={() => handleEndException(exception._id)}
                                                onExpand={() => setExpandedException(expandedException === exception._id ? null : exception._id)}
                                                isExpanded={expandedException === exception._id}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Exception History */}
                            {currentStudent.creditSystem?.exceptions?.filter(e => e.status !== "active").length > 0 && (
                                <div className="bg-white dark:bg-dark_input rounded-xl border border-PowderBlueBorder dark:border-dark_border p-6">
                                    <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-4 flex items-center gap-2">
                                        <History className="w-5 h-5 text-gray-500" />
                                        {t("credit.exceptionHistory")}
                                    </h3>
                                    <div className="space-y-2">
                                        {currentStudent.creditSystem.exceptions
                                            .filter(e => e.status !== "active")
                                            .map(exception => (
                                                <div key={exception._id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-6 h-6 rounded flex items-center justify-center ${exception.type === 'freeze' ? 'bg-blue-100 dark:bg-blue-900/30' :
                                                                exception.type === 'deduction' ? 'bg-red-100 dark:bg-red-900/30' :
                                                                    'bg-green-100 dark:bg-green-900/30'
                                                                }`}>
                                                                {exception.type === 'freeze' && <Snowflake className="w-3 h-3 text-blue-600" />}
                                                                {exception.type === 'deduction' && <Minus className="w-3 h-3 text-red-600" />}
                                                                {exception.type === 'addition' && <Plus className="w-3 h-3 text-green-600" />}
                                                            </div>
                                                            <span className="font-medium text-MidnightNavyText dark:text-white">
                                                                {exceptionTypes[exception.type]?.label}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs text-SlateBlueText dark:text-darktext">
                                                            {formatDate(exception.startDate)} - {exception.endDate ? formatDate(exception.endDate) : t("credit.ongoing")}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-SlateBlueText dark:text-darktext mt-1 ml-8">
                                                        {exception.reason}
                                                    </p>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Add Exception Button */}
                            <button
                                onClick={() => setShowAddException(true)}
                                className="w-full p-4 border-2 border-dashed border-PowderBlueBorder dark:border-dark_border rounded-xl hover:border-amber-500 hover:bg-amber-500/5 transition-all group"
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
                                    <span className="font-semibold text-MidnightNavyText dark:text-white">
                                        {t("credit.addNewException")}
                                    </span>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* History Tab */}
                    {activeTab === "history" && (
                        <div className="space-y-6">
                            {/* Usage History */}
                            {currentStudent.creditSystem?.usageHistory?.length > 0 ? (
                                <div className="bg-white dark:bg-dark_input rounded-xl border border-PowderBlueBorder dark:border-dark_border p-6">
                                    <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-4 flex items-center gap-2">
                                        <History className="w-5 h-5 text-primary" />
                                        {t("credit.usageHistory")}
                                    </h3>
                                    <div className="space-y-2">
                                        {currentStudent.creditSystem.usageHistory
                                            .sort((a, b) => new Date(b.date) - new Date(a.date))
                                            .map((usage, index) => (
                                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                                            <Clock className="w-4 h-4 text-primary" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-MidnightNavyText dark:text-white">
                                                                {usage.sessionTitle || t("credit.session")}
                                                            </p>
                                                            <p className="text-xs text-SlateBlueText dark:text-darktext">
                                                                {usage.groupName || t("credit.group")} • {formatDate(usage.date)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-bold text-red-500">-{usage.hoursDeducted}h</span>
                                                        <p className="text-xs text-SlateBlueText dark:text-darktext capitalize">
                                                            {usage.attendanceStatus}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-dark_input rounded-xl border border-PowderBlueBorder dark:border-dark_border p-8 text-center">
                                    <History className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-2">
                                        {t("credit.noHistory")}
                                    </h3>
                                    <p className="text-sm text-SlateBlueText dark:text-darktext">
                                        {t("credit.noHistoryDesc")}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-PowderBlueBorder dark:border-dark_border bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex justify-between items-center text-xs text-SlateBlueText dark:text-darktext">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {t("credit.lastUpdate")}: {currentStudent?.metadata?.updatedAt ? formatDate(currentStudent.metadata.updatedAt) : t("common.never")}
                            </span>
                            {stats.hasPackage && (
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {t("credit.packageEnds")}: {formatDate(stats.packageEndDate)}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => {
                                if (onUpdate) {
                                    onUpdate(currentStudent);
                                }
                            }}
                            className="flex items-center gap-1 text-primary hover:underline"
                        >
                            <RefreshCw className="w-3 h-3" />
                            {t("common.refresh")}
                        </button>
                    </div>
                </div>
            </div>

            {/* Add Package Modal */}
            {showAddPackage && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
                    <div className="bg-white dark:bg-darkmode rounded-xl w-full max-w-md">
                        <div className="p-4 border-b border-PowderBlueBorder dark:border-dark_border flex items-center justify-between">
                            <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white flex items-center gap-2">
                                <Package className="w-5 h-5 text-primary" />
                                {t("credit.addPackage")}
                            </h3>
                            <button onClick={() => setShowAddPackage(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Package Type */}
                            <div>
                                <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
                                    {t("credit.packageType")}
                                </label>
                                <select
                                    value={newPackage.packageType}
                                    onChange={(e) => setNewPackage({ ...newPackage, packageType: e.target.value })}
                                    className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
                                >
                                    {Object.entries(packageTypes).map(([key, value]) => (
                                        <option key={key} value={key}>
                                            {value.icon} {value.label} ({value.hours} {t("credit.hours")})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Price */}
                            <div>
                                <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
                                    {t("credit.price")} (EGP)
                                </label>
                                <input
                                    type="number"
                                    value={newPackage.price}
                                    onChange={(e) => setNewPackage({ ...newPackage, price: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
                                    min="0"
                                />
                            </div>

                            {/* Start Date */}
                            <div>
                                <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
                                    {t("credit.startDate")}
                                </label>
                                <input
                                    type="date"
                                    value={newPackage.startDate}
                                    onChange={(e) => setNewPackage({ ...newPackage, startDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
                                />
                            </div>

                            {/* Summary */}
                            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4 rounded-lg">
                                <p className="text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
                                    {t("credit.packageSummary")}
                                </p>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-SlateBlueText dark:text-darktext">{t("credit.totalHours")}:</span>
                                        <span className="font-semibold text-MidnightNavyText dark:text-white">
                                            {packageTypes[newPackage.packageType]?.hours} {t("credit.hours")}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-SlateBlueText dark:text-darktext">{t("credit.duration")}:</span>
                                        <span className="font-semibold text-MidnightNavyText dark:text-white">
                                            {newPackage.packageType === "3months" ? "3" :
                                                newPackage.packageType === "6months" ? "6" :
                                                    newPackage.packageType === "9months" ? "9" : "12"} {t("credit.months")}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-SlateBlueText dark:text-darktext">{t("credit.endDate")}:</span>
                                        <span className="font-semibold text-MidnightNavyText dark:text-white">
                                            {new Date(new Date(newPackage.startDate).setMonth(
                                                new Date(newPackage.startDate).getMonth() +
                                                (newPackage.packageType === "3months" ? 3 :
                                                    newPackage.packageType === "6months" ? 6 :
                                                        newPackage.packageType === "9months" ? 9 : 12)
                                            )).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-PowderBlueBorder dark:border-dark_border flex gap-3">
                            <button
                                onClick={() => setShowAddPackage(false)}
                                className="flex-1 px-4 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg text-MidnightNavyText dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                {t("common.cancel")}
                            </button>
                            <button
                                onClick={handleAddPackage}
                                disabled={loading}
                                className="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {loading ? t("common.saving") : t("common.save")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Exception Modal */}
            {showAddException && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
                    <div className="bg-white dark:bg-darkmode rounded-xl w-full max-w-md">
                        <div className="p-4 border-b border-PowderBlueBorder dark:border-dark_border flex items-center justify-between">
                            <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-amber-500" />
                                {t("credit.addException")}
                            </h3>
                            <button onClick={() => setShowAddException(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Exception Type */}
                            <div>
                                <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
                                    {t("credit.exceptionType")}
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.entries(exceptionTypes).map(([key, value]) => {
                                        const Icon = value.icon;
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setNewException({ ...newException, type: key, hours: key === 'freeze' ? 0 : newException.hours })}
                                                className={`p-3 border rounded-lg text-center transition-all ${newException.type === key
                                                    ? `border-${value.color}-500 bg-${value.color}-50 dark:bg-${value.color}-900/20`
                                                    : 'border-PowderBlueBorder dark:border-dark_border hover:bg-gray-50 dark:hover:bg-gray-800'
                                                    }`}
                                            >
                                                <Icon className={`w-5 h-5 mx-auto mb-1 ${newException.type === key ? `text-${value.color}-600` : 'text-gray-500'
                                                    }`} />
                                                <span className={`text-xs font-medium ${newException.type === key ? `text-${value.color}-700` : 'text-MidnightNavyText dark:text-white'
                                                    }`}>
                                                    {value.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-SlateBlueText dark:text-darktext mt-2">
                                    {exceptionTypes[newException.type]?.description}
                                </p>
                            </div>

                            {/* Hours (for deduction/addition) */}
                            {newException.type !== 'freeze' && (
                                <div>
                                    <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
                                        {newException.type === 'deduction' ? t("credit.hoursToDeduct") : t("credit.hoursToAdd")}
                                    </label>
                                    <input
                                        type="number"
                                        value={newException.hours}
                                        onChange={(e) => setNewException({ ...newException, hours: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
                                        min="1"
                                        max="100"
                                        required={newException.type !== 'freeze'}
                                    />
                                </div>
                            )}

                            {/* Reason */}
                            <div>
                                <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
                                    {t("credit.reason")} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newException.reason}
                                    onChange={(e) => setNewException({ ...newException, reason: e.target.value })}
                                    className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
                                    placeholder={t("credit.reasonPlaceholder")}
                                    required
                                />
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
                                        {t("credit.startDate")}
                                    </label>
                                    <input
                                        type="date"
                                        value={newException.startDate}
                                        onChange={(e) => setNewException({ ...newException, startDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
                                        {t("credit.endDate")} ({t("credit.optional")})
                                    </label>
                                    <input
                                        type="date"
                                        value={newException.endDate}
                                        onChange={(e) => setNewException({ ...newException, endDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
                                        min={newException.startDate}
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
                                    {t("credit.notes")} ({t("credit.optional")})
                                </label>
                                <textarea
                                    value={newException.notes}
                                    onChange={(e) => setNewException({ ...newException, notes: e.target.value })}
                                    className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
                                    rows="2"
                                    placeholder={t("credit.notesPlaceholder")}
                                />
                            </div>

                            {/* Warning for freeze */}
                            {newException.type === 'freeze' && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                                    <div className="flex items-start gap-2">
                                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                                {t("credit.freezeWarning")}
                                            </p>
                                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                {t("credit.freezeDescription")}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Warning for deduction */}
                            {newException.type === 'deduction' && newException.hours > (stats.remainingHours || 0) && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-red-700 dark:text-red-300">
                                                {t("credit.insufficientBalance")}
                                            </p>
                                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                {t("credit.currentBalance")}: {stats.remainingHours} {t("credit.hours")}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-PowderBlueBorder dark:border-dark_border flex gap-3">
                            <button
                                onClick={() => setShowAddException(false)}
                                className="flex-1 px-4 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg text-MidnightNavyText dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                {t("common.cancel")}
                            </button>
                            <button
                                onClick={handleAddException}
                                disabled={loading || !newException.reason || (newException.type !== 'freeze' && !newException.hours)}
                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {loading ? t("common.saving") : t("common.save")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Package Card Component
function PackageCard({ pkg, stats, packageTypes, formatDate }) {
    const { t } = useI18n();

    const getStatusColor = (status) => {
        switch (status) {
            case "active": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
            case "frozen": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
            case "expired": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
            case "completed": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
            case "deleted": return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
            default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{packageTypes[pkg.packageType]?.icon}</span>
                    <div>
                        <p className="font-semibold text-MidnightNavyText dark:text-white">
                            {packageTypes[pkg.packageType]?.label}
                        </p>
                        <p className="text-xs text-SlateBlueText dark:text-darktext">
                            {formatDate(pkg.startDate)} - {formatDate(pkg.endDate)}
                        </p>
                    </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(pkg.status)}`}>
                    {pkg.status}
                </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <p className="text-xs text-SlateBlueText dark:text-darktext">{t("credit.total")}</p>
                    <p className="text-lg font-bold text-MidnightNavyText dark:text-white">{pkg.totalHours}h</p>
                </div>
                <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <p className="text-xs text-SlateBlueText dark:text-darktext">{t("credit.used")}</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.usedHours}h</p>
                </div>
                <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <p className="text-xs text-SlateBlueText dark:text-darktext">{t("credit.remaining")}</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">{stats.remainingHours}h</p>
                </div>
            </div>

            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={`h-2 rounded-full ${stats.usagePercentage > 80 ? 'bg-red-500' :
                        stats.usagePercentage > 60 ? 'bg-orange-500' :
                            stats.usagePercentage > 40 ? 'bg-yellow-500' :
                                'bg-green-500'
                        }`}
                    style={{ width: `${stats.usagePercentage}%` }}
                />
            </div>
        </div>
    );
}

// Exception Card Component
function ExceptionCard({ exception, exceptionTypes, formatDate, onEnd, onExpand, isExpanded }) {
    const { t } = useI18n();
    const ExceptionIcon = exceptionTypes[exception.type]?.icon;
    const color = exceptionTypes[exception.type]?.color;

    return (
        <div className="border border-PowderBlueBorder dark:border-dark_border rounded-lg overflow-hidden">
            <div className="p-3 bg-white dark:bg-dark_input">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${color}-100 dark:bg-${color}-900/30`}>
                            <ExceptionIcon className={`w-4 h-4 text-${color}-600`} />
                        </div>
                        <div>
                            <p className="font-semibold text-MidnightNavyText dark:text-white">
                                {exceptionTypes[exception.type]?.label}
                            </p>
                            <p className="text-xs text-SlateBlueText dark:text-darktext">
                                {exception.reason}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-SlateBlueText dark:text-darktext">
                            {formatDate(exception.startDate)}
                            {exception.endDate && ` - ${formatDate(exception.endDate)}`}
                        </span>
                        <button
                            onClick={onExpand}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                        >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-PowderBlueBorder dark:border-dark_border">
                        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                            <div>
                                <p className="text-xs text-SlateBlueText dark:text-darktext">{t("credit.startDate")}</p>
                                <p className="font-medium text-MidnightNavyText dark:text-white">{formatDate(exception.startDate)}</p>
                            </div>
                            {exception.endDate && (
                                <div>
                                    <p className="text-xs text-SlateBlueText dark:text-darktext">{t("credit.endDate")}</p>
                                    <p className="font-medium text-MidnightNavyText dark:text-white">{formatDate(exception.endDate)}</p>
                                </div>
                            )}
                            {exception.hours && (
                                <div>
                                    <p className="text-xs text-SlateBlueText dark:text-darktext">
                                        {exception.type === 'deduction' ? t("credit.deducted") : t("credit.added")}
                                    </p>
                                    <p className={`font-medium ${exception.type === 'deduction' ? 'text-red-600' : 'text-green-600'}`}>
                                        {exception.type === 'deduction' ? '-' : '+'}{exception.hours}h
                                    </p>
                                </div>
                            )}
                            {exception.notes && (
                                <div className="col-span-2">
                                    <p className="text-xs text-SlateBlueText dark:text-darktext">{t("credit.notes")}</p>
                                    <p className="text-sm text-MidnightNavyText dark:text-white">{exception.notes}</p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={onEnd}
                            className="w-full px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2"
                        >
                            <Ban className="w-4 h-4" />
                            {t("credit.endException")}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}