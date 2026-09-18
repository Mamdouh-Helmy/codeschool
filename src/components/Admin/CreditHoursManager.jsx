"use client";
import React, { useState, useEffect, useCallback } from "react";
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
    CalendarDays,
    Zap,
    Info,
    RefreshCw,
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
    Award,
    Crown,
    BadgeCheck,
    BadgeX,
    BadgeAlert,
    CircleDollarSign,
    CreditCard,
    Wallet,
    PiggyBank,
    Landmark,
    Receipt,
    ArrowUpRight,
    ArrowDownRight,
    ScissorsLineDashed,
} from "lucide-react";
import toast from "react-hot-toast";
import { useI18n } from "@/i18n/I18nProvider";

// ─────────────────────────────────────────────────────────────────────────
// Billing helpers (خارج الكومبوننت — مفيش state)
// ─────────────────────────────────────────────────────────────────────────

const INVOICE_STATUS_CFG = {
    Paid: { label: "مدفوعة بالكامل", bg: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400", icon: BadgeCheck },
    Pending: { label: "قيد الدفع", bg: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400", icon: BadgeAlert },
    Suspended: { label: "موقوفة", bg: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400", icon: Ban },
    Escrow: { label: "قيد التحقق (إسكرو)", bg: "bg-secondary/10 dark:bg-secondary/20 text-secondary", icon: Landmark },
    Voided: { label: "ملغاة", bg: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400", icon: BadgeX },
};

const ESCROW_STATUS_CFG = {
    not_started: { label: "لم يبدأ بعد", bg: "bg-gray-100 dark:bg-gray-800 text-gray-500" },
    in_escrow: { label: "قيد الانتظار (إسكرو)", bg: "bg-secondary/10 dark:bg-secondary/20 text-secondary" },
    recognized: { label: "معترف به (إيراد)", bg: "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400" },
    refunded: { label: "مسترجع", bg: "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400" },
};

const PAYMENT_OPTIONS = [
    { id: "full", label: "دفع كامل", icon: BadgeCheck },
    { id: "partial", label: "دفع جزء", icon: PiggyBank },
    { id: "none", label: "بدون دفع", icon: Ban },
];

function getPaymentBadge(invoice) {
    if (!invoice) return { label: "لا يوجد فاتورة", bg: "bg-gray-100 dark:bg-gray-800 text-gray-400", icon: Info };
    const paid = invoice.paidAmount || 0;
    const total = invoice.totalAmount || 0;
    if (invoice.status === "Voided") return { label: "ملغاة", bg: "bg-gray-100 dark:bg-gray-800 text-gray-500", icon: BadgeX };
    if (total > 0 && paid >= total) return { label: "مدفوع بالكامل", bg: "bg-green-50 dark:bg-green-900/30 text-green-600", icon: BadgeCheck };
    if (paid > 0) return { label: "عربون / دفع جزئي", bg: "bg-amber-50 dark:bg-amber-900/30 text-amber-600", icon: PiggyBank };
    return { label: "لم يدفع بعد", bg: "bg-red-50 dark:bg-red-900/30 text-red-600", icon: BadgeX };
}

function formatMoney(n) {
    return `${Number(n || 0).toLocaleString("en-US")} EGP`;
}

// Shared input styles
const inputCls =
    "w-full px-3.5 py-2.5 rounded-lg border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-dark_input text-sm text-MidnightNavyText dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors";
const labelCls = "block text-xs font-medium text-SlateBlueText dark:text-darktext mb-1.5";

// ─────────────────────────────────────────────────────────────────────────
// Small chart primitives — hand-rolled SVG, no new dependency.
// ─────────────────────────────────────────────────────────────────────────

/** Circular progress ring showing hours remaining vs. total. The one bold
 *  visual element of the Overview tab — replaces the four cloned stat cards. */
function HoursRing({ used, total, size = 148, stroke = 14 }) {
    const safeTotal = Math.max(0, Number(total) || 0);
    const safeUsed = Math.min(safeTotal, Math.max(0, Number(used) || 0));
    const pct = safeTotal > 0 ? safeUsed / safeTotal : 0;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const dash = c * pct;

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
            <defs>
                <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#004d59" />
                    <stop offset="100%" stopColor="#ff6700" />
                </linearGradient>
            </defs>
            <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="currentColor"
                strokeWidth={stroke}
                className="text-gray-100 dark:text-gray-800"
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="url(#ringGradient)"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${c - dash}`}
                className="transition-all duration-700 ease-out"
            />
        </svg>
    );
}

/** Payment history as a small bar chart — green bars for payments, rose bars
 *  (below the baseline) for refunds. Reads directly off invoice.payments. */
function PaymentHistoryChart({ payments = [], height = 92 }) {
    if (!payments.length) return null;

    // Oldest → newest, left to right.
    const ordered = [...payments].sort((a, b) => new Date(a.date) - new Date(b.date));
    const magnitudes = ordered.map((p) => Math.abs(p.amount || 0));
    const max = Math.max(...magnitudes, 1);
    const baseline = height * 0.55;

    return (
        <div className="flex items-end gap-1.5" style={{ height }}>
            {ordered.map((p, i) => {
                const isRefund = p.type === "refund" || p.amount < 0;
                const mag = Math.abs(p.amount || 0);
                const barHeight = Math.max(4, (mag / max) * (height - baseline - 4));
                return (
                    <div
                        key={p._id || i}
                        className="relative flex-1 min-w-[6px] group"
                        style={{ height }}
                        title={`${isRefund ? "استرجاع" : "دفعة"} ${formatMoney(mag)}`}
                    >
                        <div
                            className={`absolute left-0 right-0 rounded-sm transition-all ${isRefund ? "bg-rose-400" : "bg-primary"
                                } group-hover:opacity-80`}
                            style={
                                isRefund
                                    ? { top: baseline, height: barHeight }
                                    : { bottom: height - baseline, height: barHeight }
                            }
                        />
                    </div>
                );
            })}
            {/* baseline */}
            <div
                className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-PowderBlueBorder dark:border-dark_border"
                style={{ marginTop: baseline }}
            />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────

export default function CreditHoursManager({ student, onClose, onUpdate }) {
    const { t, locale } = useI18n();
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showAddPackage, setShowAddPackage] = useState(false);
    const [showEditPackage, setShowEditPackage] = useState(false);
    const [showAddException, setShowAddException] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");
    const [expandedException, setExpandedException] = useState(null);
    const [selectedPackage, setSelectedPackage] = useState(null);

    const [currentStudent, setCurrentStudent] = useState(student);

    const [packagePlans, setPackagePlans] = useState([]);
    const [plansLoading, setPlansLoading] = useState(true);

    const [billingLoading, setBillingLoading] = useState(false);
    const [invoices, setInvoices] = useState([]);
    const [currentInvoice, setCurrentInvoice] = useState(null);
    const [showAddPayment, setShowAddPayment] = useState(false);
    const [showRefund, setShowRefund] = useState(false);
    const [paymentSubmitting, setPaymentSubmitting] = useState(false);
    const [refundSubmitting, setRefundSubmitting] = useState(false);
    const [expandedInvoice, setExpandedInvoice] = useState(null);
    const [newPayment, setNewPayment] = useState({ amount: "", method: "cash", notes: "" });
    const [refundData, setRefundData] = useState({ amount: "", reason: "" });

    useEffect(() => {
        setCurrentStudent(student);
    }, [student]);

    useEffect(() => {
        if (!currentStudent?._id && !currentStudent?.id) {
            console.error("❌ No valid student ID found!");
            toast.error("Student ID is missing");
            setTimeout(() => onClose(), 2000);
        }
    }, [currentStudent, onClose]);

    const fetchPackagePlans = useCallback(async () => {
        setPlansLoading(true);
        try {
            const res = await fetch("/api/package-plans?activeOnly=true");
            const data = await res.json();
            if (data.success) setPackagePlans(data.data || []);
        } catch (error) {
            console.error("❌ Error fetching package plans:", error);
        } finally {
            setPlansLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPackagePlans();
    }, [fetchPackagePlans]);

    const getPlanBySlug = useCallback(
        (slug) => packagePlans.find((p) => p.slug === slug),
        [packagePlans]
    );

    const describePackage = (pkg) => {
        const plan = getPlanBySlug(pkg?.packageType);
        return {
            label: pkg?.packageName || plan?.name || pkg?.packageType || "باقة",
            months: pkg?.months ?? plan?.months ?? "-",
        };
    };

    const [newPackage, setNewPackage] = useState({
        packagePlanId: "",
        price: 0,
        paymentOption: "full",
        amountPaid: 0,
        dueDate: "",
        startDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (packagePlans.length > 0 && !newPackage.packagePlanId) {
            const first = packagePlans[0];
            setNewPackage((prev) => ({
                ...prev,
                packagePlanId: first._id,
                price: first.price,
                amountPaid: first.price,
            }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [packagePlans]);

    const selectedPlan = packagePlans.find((p) => p._id === newPackage.packagePlanId) || null;

    const handlePaymentOptionChange = (option) => {
        setNewPackage((prev) => ({
            ...prev,
            paymentOption: option,
            amountPaid: option === "full" ? Number(prev.price) || 0 : option === "none" ? 0 : prev.amountPaid,
            dueDate: option === "full" ? "" : prev.dueDate,
        }));
    };

    const [editPackageData, setEditPackageData] = useState({
        packagePlanId: "",
        totalHours: 0,
        price: 0,
        startDate: "",
        endDate: "",
        reason: "",
    });
    const [editSubmitting, setEditSubmitting] = useState(false);

    const currentPkgHoursUsed = (() => {
        const pkg = currentStudent?.creditSystem?.currentPackage;
        if (!pkg) return 0;
        return Math.max(0, (pkg.totalHours || 0) - (pkg.remainingHours || 0));
    })();

    const openEditPackage = () => {
        const pkg = currentStudent?.creditSystem?.currentPackage;
        if (!pkg) return;
        setEditPackageData({
            packagePlanId: pkg.packagePlanId ? String(pkg.packagePlanId) : "",
            totalHours: pkg.totalHours || 0,
            price: pkg.price || 0,
            startDate: pkg.startDate ? new Date(pkg.startDate).toISOString().split("T")[0] : "",
            endDate: pkg.endDate ? new Date(pkg.endDate).toISOString().split("T")[0] : "",
            reason: "",
        });
        setShowEditPackage(true);
    };

    const handleEditPlanChange = (planId) => {
        const plan = packagePlans.find((p) => p._id === planId);
        setEditPackageData((prev) => ({
            ...prev,
            packagePlanId: planId,
            totalHours: plan ? plan.totalHours : prev.totalHours,
            price: plan ? plan.price : prev.price,
        }));
    };

    const handleEditPackage = async () => {
        const studentId = getStudentId();
        if (!studentId) {
            toast.error("Student ID is missing");
            return;
        }

        const totalHoursNum = Number(editPackageData.totalHours);
        if (!Number.isFinite(totalHoursNum) || totalHoursNum < 0) {
            toast.error("عدد الساعات غير صالح");
            return;
        }
        if (totalHoursNum < currentPkgHoursUsed) {
            toast.error(`الساعات الكلية لا يمكن أن تقل عن ${currentPkgHoursUsed} ساعة (مستخدمة بالفعل)`);
            return;
        }
        if (!editPackageData.startDate || !editPackageData.endDate) {
            toast.error("حدد تاريخ البداية والنهاية");
            return;
        }
        if (new Date(editPackageData.endDate) <= new Date(editPackageData.startDate)) {
            toast.error("تاريخ النهاية لازم يكون بعد تاريخ البداية");
            return;
        }

        setEditSubmitting(true);
        try {
            const response = await fetch(`/api/students/${studentId}/credit-package`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    packagePlanId: editPackageData.packagePlanId || undefined,
                    totalHours: totalHoursNum,
                    price: Number(editPackageData.price) || 0,
                    startDate: editPackageData.startDate,
                    endDate: editPackageData.endDate,
                    reason: editPackageData.reason.trim(),
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success("تم تعديل الباكدج بنجاح");
                if (data.priceChanged) {
                    toast("السعر اتغيّر — راجع الفاتورة يدويًا من تاب الفوترة لو محتاجة تحديث", { icon: "⚠️" });
                }
                setShowEditPackage(false);

                if (data.student) {
                    setCurrentStudent((prev) => ({ ...prev, ...data.student }));
                    if (onUpdate) {
                        onUpdate({ ...currentStudent, ...data.student });
                    }
                }
            } else {
                toast.error(data.message || t("common.error"));
            }
        } catch (error) {
            console.error("❌ Error editing package:", error);
            toast.error(error.message || t("common.error"));
        } finally {
            setEditSubmitting(false);
        }
    };

    const [newException, setNewException] = useState({
        type: "freeze",
        hours: 0,
        reason: "",
        startDate: new Date().toISOString().split('T')[0],
        endDate: "",
        notes: ""
    });

    const exceptionTypes = {
        freeze: {
            label: t("credit.exceptions.freeze"),
            icon: Snowflake,
            description: t("credit.exceptions.freezeDesc"),
            chipBg: "bg-secondary/10 dark:bg-secondary/20",
            chipText: "text-secondary",
            activeCls: "border-secondary bg-secondary/5 dark:bg-secondary/10",
            activeText: "text-secondary",
        },
        deduction: {
            label: t("credit.exceptions.deduction"),
            icon: Minus,
            description: t("credit.exceptions.deductionDesc"),
            chipBg: "bg-red-100 dark:bg-red-900/30",
            chipText: "text-red-600 dark:text-red-400",
            activeCls: "border-red-500 bg-red-50 dark:bg-red-900/20",
            activeText: "text-red-700 dark:text-red-400",
        },
        addition: {
            label: t("credit.exceptions.addition"),
            icon: Plus,
            description: t("credit.exceptions.additionDesc"),
            chipBg: "bg-green-100 dark:bg-green-900/30",
            chipText: "text-green-600 dark:text-green-400",
            activeCls: "border-green-500 bg-green-50 dark:bg-green-900/20",
            activeText: "text-green-700 dark:text-green-400",
        },
    };

    const calculateEffectiveRemainingHours = (creditSystem) => {
        if (!creditSystem) return 0;
        let total = 0;
        if (creditSystem.currentPackage) {
            total += creditSystem.currentPackage.remainingHours || 0;
        }
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

    const stats = currentStudent?.creditSystem ? {
        hasPackage: !!currentStudent.creditSystem.currentPackage,
        packageType: currentStudent.creditSystem.currentPackage?.packageType,
        totalHours: currentStudent.creditSystem.currentPackage?.totalHours || 0,
        usedHours: currentStudent.creditSystem.stats?.totalHoursUsed || 0,
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

    const getStudentId = () => {
        return currentStudent?._id || currentStudent?.id;
    };

    const fetchBilling = useCallback(async () => {
        const studentId = currentStudent?._id || currentStudent?.id;
        if (!studentId) return;

        setBillingLoading(true);
        try {
            const res = await fetch(`/api/invoices?studentId=${studentId}`);
            const data = await res.json();

            if (data.success) {
                const list = data.data || [];
                setInvoices(list);

                const latest = list.find(inv => inv.status !== "Voided") || list[0] || null;

                if (latest) {
                    const detailRes = await fetch(`/api/invoices/${latest._id}`);
                    const detailData = await detailRes.json();
                    if (detailData.success) {
                        setCurrentInvoice(detailData.data);
                    }
                } else {
                    setCurrentInvoice(null);
                }
            }
        } catch (error) {
            console.error("❌ Error fetching billing data:", error);
        } finally {
            setBillingLoading(false);
        }
    }, [currentStudent]);

    useEffect(() => {
        fetchBilling();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStudent?._id, currentStudent?.id]);

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
            const response = await fetch(`/api/students/${studentId}/credit-package`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                }
            });

            const data = await response.json();

            if (data.success) {
                toast.success("Package deleted successfully");

                if (data.student) {
                    setCurrentStudent(prev => ({
                        ...prev,
                        creditSystem: data.student.creditSystem
                    }));

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

    const handleAddPackage = async () => {
        const studentId = getStudentId();

        if (!studentId) {
            toast.error("Student ID is missing");
            return;
        }

        if (!newPackage.packagePlanId) {
            toast.error("اختار باقة أولًا");
            return;
        }

        const amountPaidNum = Number(newPackage.amountPaid) || 0;
        const priceNum = Number(newPackage.price) || 0;

        if (amountPaidNum > priceNum) {
            toast.error("المبلغ المدفوع لا يمكن أن يكون أكبر من سعر الباكدج");
            return;
        }

        if (newPackage.paymentOption === "partial" && (amountPaidNum <= 0 || amountPaidNum >= priceNum)) {
            toast.error("في حالة الدفع الجزئي، المبلغ لازم يكون أكبر من 0 وأقل من السعر الكامل");
            return;
        }

        if (newPackage.paymentOption !== "full" && !newPackage.dueDate) {
            toast.error("حدد تاريخ استحقاق باقي المبلغ");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/students/${studentId}/credit-package`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    packagePlanId: newPackage.packagePlanId,
                    price: priceNum,
                    startDate: newPackage.startDate,
                    paymentOption: newPackage.paymentOption,
                    amountPaid: newPackage.paymentOption === "partial" ? amountPaidNum : 0,
                    dueDate: newPackage.paymentOption === "full" ? undefined : newPackage.dueDate,
                })
            });

            const data = await response.json();

            if (data.success) {
                toast.success(t("credit.packageAdded"));
                setShowAddPackage(false);
                setNewPackage({
                    packagePlanId: packagePlans[0]?._id || "",
                    price: packagePlans[0]?.price || 0,
                    paymentOption: "full",
                    amountPaid: packagePlans[0]?.price || 0,
                    dueDate: "",
                    startDate: new Date().toISOString().split('T')[0],
                });

                if (data.student) {
                    setCurrentStudent(data.student);
                    if (onUpdate) {
                        onUpdate(data.student);
                    }
                }

                fetchBilling();
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

    const handleAddException = async () => {
        const studentId = getStudentId();

        if (!studentId) {
            toast.error("Student ID is missing");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/students/${studentId}/credit-exception`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(newException)
            });

            const data = await response.json();

            if (data.success) {
                toast.success(t("credit.exceptionAdded"));
                setShowAddException(false);

                if (data.student) {
                    setCurrentStudent(data.student);
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
            const response = await fetch(`/api/students/${studentId}/credit-exception/${exceptionId}/end`, {
                method: "POST"
            });

            const data = await response.json();

            if (data.success) {
                toast.success(t("credit.exceptionEnded"));

                if (data.student) {
                    setCurrentStudent(data.student);
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

    const handleAddPayment = async () => {
        if (!currentInvoice?._id) {
            toast.error("لا يوجد فاتورة لتسجيل الدفعة عليها");
            return;
        }

        const amount = Number(newPayment.amount);
        if (!amount || amount <= 0) {
            toast.error("ادخل مبلغ صحيح");
            return;
        }

        const remaining = (currentInvoice.totalAmount || 0) - (currentInvoice.paidAmount || 0);
        if (amount > remaining) {
            toast.error(`المبلغ أكبر من المتبقي (${formatMoney(remaining)})`);
            return;
        }

        setPaymentSubmitting(true);
        try {
            const res = await fetch(`/api/invoices/${currentInvoice._id}/payments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount,
                    method: newPayment.method,
                    notes: newPayment.notes,
                }),
            });
            const data = await res.json();

            if (data.success) {
                toast.success("تم تسجيل الدفعة بنجاح");
                setShowAddPayment(false);
                setNewPayment({ amount: "", method: "cash", notes: "" });
                fetchBilling();
            } else {
                toast.error(data.message || "حدث خطأ أثناء تسجيل الدفعة");
            }
        } catch (error) {
            console.error("❌ Error adding payment:", error);
            toast.error(error.message || "حدث خطأ أثناء تسجيل الدفعة");
        } finally {
            setPaymentSubmitting(false);
        }
    };

    const handleRefund = async () => {
        if (!currentInvoice?._id) {
            toast.error("لا يوجد فاتورة لعمل استرجاع منها");
            return;
        }

        const amount = Number(refundData.amount);
        if (!amount || amount <= 0) {
            toast.error("ادخل مبلغ صحيح");
            return;
        }

        if (amount > (currentInvoice.paidAmount || 0)) {
            toast.error(`لا يمكن استرجاع أكثر من المبلغ المدفوع فعليًا (${formatMoney(currentInvoice.paidAmount)})`);
            return;
        }

        if (!refundData.reason.trim()) {
            toast.error("سبب الاسترجاع مطلوب");
            return;
        }

        setRefundSubmitting(true);
        try {
            const res = await fetch(`/api/invoices/${currentInvoice._id}/refund`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount, reason: refundData.reason }),
            });
            const data = await res.json();

            if (data.success) {
                toast.success("تم تنفيذ الاسترجاع بنجاح");
                setShowRefund(false);
                setRefundData({ amount: "", reason: "" });
                fetchBilling();
            } else {
                toast.error(data.message || "حدث خطأ أثناء الاسترجاع");
            }
        } catch (error) {
            console.error("❌ Error refunding payment:", error);
            toast.error(error.message || "حدث خطأ أثناء الاسترجاع");
        } finally {
            setRefundSubmitting(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "active": return "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400";
            case "frozen": return "bg-secondary/10 text-secondary dark:bg-secondary/20";
            case "expired": return "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400";
            case "completed": return "bg-orange-coral/10 text-orange-coral dark:bg-orange-coral/20";
            case "no_package": return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
            default: return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case "active": return <CheckCircle className="w-4 h-4" />;
            case "frozen": return <Snowflake className="w-4 h-4" />;
            case "expired": return <Ban className="w-4 h-4" />;
            case "completed": return <Award className="w-4 h-4" />;
            default: return <AlertCircle className="w-4 h-4" />;
        }
    };

    const formatDate = (date) => {
        if (!date) return "N/A";
        return new Date(date).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getDaysRemaining = (endDate) => {
        if (!endDate) return 0;
        const days = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
        return days > 0 ? days : 0;
    };

    const currentInvoiceRemaining = currentInvoice
        ? Math.max(0, (currentInvoice.totalAmount || 0) - (currentInvoice.paidAmount || 0))
        : 0;
    const isInvoiceOverdue = currentInvoice
        && currentInvoice.status === "Pending"
        && new Date(currentInvoice.dueDate) < new Date();
    const paymentBadge = getPaymentBadge(currentInvoice);
    const paidPct = currentInvoice?.totalAmount > 0
        ? Math.min(100, Math.round((currentInvoice.paidAmount / currentInvoice.totalAmount) * 100))
        : 0;

    const TABS = [
        { id: "overview", label: t("credit.tabs.overview"), icon: Eye },
        { id: "packages", label: t("credit.tabs.packages"), icon: Package },
        { id: "billing", label: "الفوترة", icon: Wallet },
        { id: "exceptions", label: t("credit.tabs.exceptions"), icon: AlertCircle },
        { id: "history", label: t("credit.tabs.history"), icon: History },
    ];

    return (
        <div className="fixed inset-0 bg-teal-deeper/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-darkmode rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-PowderBlueBorder/60 dark:border-dark_border">
                {/* Header — quiet, structural; the one accent is the student's name */}
                <div className="px-6 py-5 border-b border-PowderBlueBorder dark:border-dark_border flex items-center justify-between bg-gradient-to-l from-secondary/5 dark:from-secondary/10 to-transparent">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="w-11 h-11 bg-secondary rounded-xl flex items-center justify-center shrink-0">
                            <span className="text-white font-bold text-base">
                                {(currentStudent?.personalInfo?.fullName || "?").trim().charAt(0)}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold text-MidnightNavyText dark:text-white truncate">
                                {currentStudent?.personalInfo?.fullName}
                            </h2>
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                                <span className="text-xs text-SlateBlueText dark:text-darktext">{currentStudent?.enrollmentNumber}</span>
                                {stats.hasPackage && (
                                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${getStatusColor(stats.status)} flex items-center gap-1`}>
                                        {getStatusIcon(stats.status)}
                                        {t(`credit.status.${stats.status}`)}
                                    </span>
                                )}
                                {currentInvoice && (
                                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${paymentBadge.bg} flex items-center gap-1`}>
                                        <paymentBadge.icon className="w-3 h-3" />
                                        {paymentBadge.label}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors shrink-0"
                    >
                        <X className="w-5 h-5 text-SlateBlueText dark:text-darktext" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 pt-4 pb-1 border-b border-PowderBlueBorder dark:border-dark_border">
                    <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-gray-100/70 dark:bg-gray-800/60 overflow-x-auto max-w-full">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative px-3.5 py-2 text-sm font-medium rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-all ${activeTab === tab.id
                                    ? "bg-white dark:bg-dark_input text-primary shadow-sm"
                                    : "text-SlateBlueText dark:text-darktext hover:text-MidnightNavyText dark:hover:text-white"
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                                {tab.id === "billing" && isInvoiceOverdue && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Overview Tab */}
                    {activeTab === "overview" && (
                        <div className="space-y-6">

                            {isInvoiceOverdue !== undefined && currentInvoice && currentInvoice.status !== "Paid" && currentInvoice.status !== "Voided" && (
                                <div className={`rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap border ${isInvoiceOverdue
                                    ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
                                    : "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800"
                                    }`}>
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle className={`w-5 h-5 shrink-0 ${isInvoiceOverdue ? "text-red-600" : "text-amber-600"}`} />
                                        <div>
                                            <p className={`text-sm font-semibold ${isInvoiceOverdue ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"}`}>
                                                {isInvoiceOverdue
                                                    ? `متأخر في السداد — متبقي ${formatMoney(currentInvoiceRemaining)}`
                                                    : `متبقي على الطالب ${formatMoney(currentInvoiceRemaining)} من إجمالي ${formatMoney(currentInvoice.totalAmount)}`}
                                            </p>
                                            <p className="text-xs text-SlateBlueText dark:text-darktext mt-0.5">
                                                تاريخ الاستحقاق: {formatDate(currentInvoice.dueDate)}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setActiveTab("billing")}
                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-dark_input border border-current text-inherit hover:opacity-80 transition-opacity"
                                    >
                                        عرض الفوترة
                                    </button>
                                </div>
                            )}

                            {/* ✅ Hero — one bold element: the hours ring, with meta beside it
                                instead of four cloned stat cards */}
                            {stats.hasPackage ? (
                                <div className="bg-white dark:bg-dark_input rounded-2xl border border-PowderBlueBorder dark:border-dark_border p-6">
                                    <div className="flex flex-col sm:flex-row items-center gap-8">
                                        <div className="relative shrink-0">
                                            <HoursRing used={stats.usedHours} total={stats.totalHours} />
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-3xl font-bold text-MidnightNavyText dark:text-white tabular-nums">
                                                    {stats.remainingHours}
                                                </span>
                                                <span className="text-[11px] text-SlateBlueText dark:text-darktext">
                                                    {t("credit.remainingHours")}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-5">
                                            <MetaStat icon={Clock} label={t("credit.totalHours")} value={`${stats.totalHours}h`} />
                                            <MetaStat icon={TrendingUp} label={t("credit.usedHours")} value={`${stats.usedHours}h`} sub={`${stats.totalSessions} ${t("credit.sessions")}`} />
                                            <MetaStat
                                                icon={CalendarDays}
                                                label={t("credit.daysRemaining")}
                                                value={stats.packageEndDate ? getDaysRemaining(stats.packageEndDate) : 0}
                                                sub={stats.packageEndDate ? formatDate(stats.packageEndDate) : t("credit.noPackage")}
                                            />
                                            <MetaStat
                                                icon={Zap}
                                                label={t("credit.usageProgress")}
                                                value={`${stats.usagePercentage}%`}
                                                tone={stats.usagePercentage > 80 ? "text-red-600" : stats.usagePercentage > 60 ? "text-amber-600" : "text-primary"}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-dark_input rounded-2xl border border-dashed border-PowderBlueBorder dark:border-dark_border p-10 text-center">
                                    <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                    <h3 className="text-base font-bold text-MidnightNavyText dark:text-white mb-1.5">
                                        {t("credit.noPackage")}
                                    </h3>
                                    <p className="text-sm text-SlateBlueText dark:text-darktext mb-5">
                                        {t("credit.noPackageDesc")}
                                    </p>
                                    <button
                                        onClick={() => setShowAddPackage(true)}
                                        className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg font-semibold inline-flex items-center gap-2 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        {t("credit.addPackage")}
                                    </button>
                                </div>
                            )}

                            {/* Package Details */}
                            {stats.hasPackage && (
                                <div className="bg-white dark:bg-dark_input rounded-2xl border border-PowderBlueBorder dark:border-dark_border p-6">
                                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                        <h3 className="text-base font-bold text-MidnightNavyText dark:text-white flex items-center gap-2">
                                            <Package className="w-5 h-5 text-primary" />
                                            {t("credit.currentPackage")}
                                        </h3>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setSelectedPackage(currentStudent.creditSystem.currentPackage)}
                                                className="text-sm text-SlateBlueText dark:text-darktext hover:text-primary flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                            >
                                                <Eye className="w-4 h-4" />
                                                <span className="hidden md:inline">{t("common.view")}</span>
                                            </button>
                                            <button
                                                onClick={openEditPackage}
                                                className="text-sm text-secondary hover:text-secondary flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-secondary/10 transition-colors"
                                                title="Edit package"
                                            >
                                                <Edit className="w-4 h-4" />
                                                <span className="hidden md:inline">تعديل</span>
                                            </button>
                                            <button
                                                onClick={handleDeletePackage}
                                                disabled={deleting}
                                                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                title="Delete package"
                                            >
                                                {deleting ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                                <span className="hidden md:inline">حذف</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <p className="text-xs text-SlateBlueText dark:text-darktext">{t("credit.packageType")}</p>
                                            <p className="text-base font-semibold text-MidnightNavyText dark:text-white mt-0.5">
                                                {describePackage(currentStudent.creditSystem.currentPackage).label}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-SlateBlueText dark:text-darktext">{t("credit.startDate")}</p>
                                            <p className="text-base font-semibold text-MidnightNavyText dark:text-white mt-0.5">
                                                {formatDate(currentStudent.creditSystem.currentPackage.startDate)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-SlateBlueText dark:text-darktext">{t("credit.endDate")}</p>
                                            <p className="text-base font-semibold text-MidnightNavyText dark:text-white mt-0.5">
                                                {formatDate(currentStudent.creditSystem.currentPackage.endDate)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-SlateBlueText dark:text-darktext">{t("credit.price")}</p>
                                            <p className="text-base font-semibold text-MidnightNavyText dark:text-white mt-0.5">
                                                {currentStudent.creditSystem.currentPackage.price || 0} EGP
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Active Exceptions */}
                            {stats.activeExceptions.length > 0 && (
                                <div className="bg-white dark:bg-dark_input rounded-2xl border border-PowderBlueBorder dark:border-dark_border p-6">
                                    <h3 className="text-base font-bold text-MidnightNavyText dark:text-white mb-4 flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5 text-amber-600" />
                                        {t("credit.activeExceptions")} ({stats.activeExceptions.length})
                                    </h3>

                                    <div className="space-y-2">
                                        {stats.activeExceptions.map(exception => {
                                            const cfg = exceptionTypes[exception.type] || {};
                                            const ExceptionIcon = cfg.icon || AlertCircle;
                                            return (
                                                <div key={exception._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.chipBg}`}>
                                                            <ExceptionIcon className={`w-4 h-4 ${cfg.chipText}`} />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-sm text-MidnightNavyText dark:text-white">
                                                                {cfg.label}
                                                            </p>
                                                            <p className="text-xs text-SlateBlueText dark:text-darktext">
                                                                {exception.reason} • {formatDate(exception.startDate)} - {exception.endDate ? formatDate(exception.endDate) : t("credit.ongoing")}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleEndException(exception._id)}
                                                        className="px-3 py-1.5 text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors shrink-0"
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
                                    className="p-4 bg-white dark:bg-dark_input border border-PowderBlueBorder dark:border-dark_border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all group text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                                            <Plus className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-MidnightNavyText dark:text-white">{t("credit.addPackage")}</p>
                                            <p className="text-xs text-SlateBlueText dark:text-darktext">{t("credit.addPackageDesc")}</p>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setShowAddException(true)}
                                    className="p-4 bg-white dark:bg-dark_input border border-PowderBlueBorder dark:border-dark_border rounded-xl hover:border-amber-brand/40 hover:shadow-sm transition-all group text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                                            <AlertCircle className="w-5 h-5 text-amber-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-MidnightNavyText dark:text-white">{t("credit.addException")}</p>
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
                            {stats.hasPackage && (
                                <div className="bg-white dark:bg-dark_input rounded-2xl border border-PowderBlueBorder dark:border-dark_border p-6">
                                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                        <h3 className="text-base font-bold text-MidnightNavyText dark:text-white flex items-center gap-2">
                                            <Crown className="w-5 h-5 text-amber-600" />
                                            {t("credit.currentPackage")}
                                            {currentInvoice && currentInvoice.packageId === stats.packageId && (
                                                <span className={`text-xs px-2.5 py-1 rounded-full ${paymentBadge.bg} flex items-center gap-1 font-medium`}>
                                                    <paymentBadge.icon className="w-3.5 h-3.5" />
                                                    {paymentBadge.label}
                                                </span>
                                            )}
                                        </h3>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={openEditPackage}
                                                className="text-sm text-secondary flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-secondary/10 transition-colors"
                                            >
                                                <Edit className="w-4 h-4" />
                                                <span>تعديل</span>
                                            </button>
                                            <button
                                                onClick={handleDeletePackage}
                                                disabled={deleting}
                                                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            >
                                                {deleting ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                                <span>حذف</span>
                                            </button>
                                        </div>
                                    </div>
                                    <PackageCard
                                        pkg={currentStudent.creditSystem.currentPackage}
                                        stats={stats}
                                        describePackage={describePackage}
                                        formatDate={formatDate}
                                    />
                                </div>
                            )}

                            {currentStudent.creditSystem?.packagesHistory?.length > 0 && (
                                <div className="bg-white dark:bg-dark_input rounded-2xl border border-PowderBlueBorder dark:border-dark_border p-6">
                                    <h3 className="text-base font-bold text-MidnightNavyText dark:text-white mb-4 flex items-center gap-2">
                                        <History className="w-5 h-5 text-secondary" />
                                        {t("credit.packageHistory")}
                                    </h3>
                                    <div className="space-y-3">
                                        {currentStudent.creditSystem.packagesHistory.map((pkg, index) => (
                                            <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
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
                                                    describePackage={describePackage}
                                                    formatDate={formatDate}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => setShowAddPackage(true)}
                                className="w-full p-4 border-2 border-dashed border-PowderBlueBorder dark:border-dark_border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Plus className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                                    <span className="font-semibold text-sm text-MidnightNavyText dark:text-white">
                                        {t("credit.addNewPackage")}
                                    </span>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* ✅ Billing Tab — invoice styled as an actual receipt, with a
                        payment-history bar chart instead of a plain list */}
                    {activeTab === "billing" && (
                        <div className="space-y-6">
                            {billingLoading && !currentInvoice ? (
                                <div className="flex items-center justify-center py-16">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                            ) : !currentInvoice ? (
                                <div className="bg-white dark:bg-dark_input rounded-2xl border border-dashed border-PowderBlueBorder dark:border-dark_border p-10 text-center">
                                    <Receipt className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                    <h3 className="text-base font-bold text-MidnightNavyText dark:text-white mb-1.5">
                                        لا يوجد فاتورة لهذا الطالب
                                    </h3>
                                    <p className="text-sm text-SlateBlueText dark:text-darktext">
                                        الفاتورة بتتعمل تلقائيًا عند إضافة باكدج جديدة لهذا الطالب.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Receipt card: totals right, dashed tear-line before the
                                        summary, echoing a real paper invoice */}
                                    <div className="bg-white dark:bg-dark_input rounded-2xl border border-PowderBlueBorder dark:border-dark_border overflow-hidden">
                                        <div className="p-6 flex items-center justify-between flex-wrap gap-3 border-b border-dashed border-PowderBlueBorder dark:border-dark_border">
                                            <h3 className="text-base font-bold text-MidnightNavyText dark:text-white flex items-center gap-2">
                                                <Receipt className="w-5 h-5 text-primary" />
                                                فاتورة الباكدج الحالية
                                            </h3>
                                            <span className={`text-sm px-3 py-1 rounded-full flex items-center gap-1.5 font-medium ${INVOICE_STATUS_CFG[currentInvoice.status]?.bg || "bg-gray-100 text-gray-500"
                                                }`}>
                                                {INVOICE_STATUS_CFG[currentInvoice.status]?.icon && (
                                                    (() => {
                                                        const Icon = INVOICE_STATUS_CFG[currentInvoice.status].icon;
                                                        return <Icon className="w-4 h-4" />;
                                                    })()
                                                )}
                                                {INVOICE_STATUS_CFG[currentInvoice.status]?.label || currentInvoice.status}
                                            </span>
                                        </div>

                                        <div className="p-6 grid md:grid-cols-[1fr_auto] gap-8">
                                            {/* Payment history chart */}
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <p className="text-xs font-medium text-SlateBlueText dark:text-darktext">
                                                        حركة الدفعات
                                                    </p>
                                                    <p className="text-xs text-SlateBlueText dark:text-darktext tabular-nums">
                                                        {(currentInvoice.payments || []).length} حركة
                                                    </p>
                                                </div>
                                                {(currentInvoice.payments || []).length > 0 ? (
                                                    <PaymentHistoryChart payments={currentInvoice.payments} />
                                                ) : (
                                                    <div className="h-[92px] flex items-center justify-center text-xs text-gray-400 border border-dashed border-PowderBlueBorder dark:border-dark_border rounded-lg">
                                                        لسه مفيش حركة دفع
                                                    </div>
                                                )}
                                            </div>

                                            {/* Totals — right-aligned like a receipt summary */}
                                            <div className="min-w-[220px] space-y-2 text-sm">
                                                <div className="flex justify-between gap-6">
                                                    <span className="text-SlateBlueText dark:text-darktext">إجمالي السعر</span>
                                                    <span className="font-semibold text-MidnightNavyText dark:text-white tabular-nums">{formatMoney(currentInvoice.totalAmount)}</span>
                                                </div>
                                                <div className="flex justify-between gap-6">
                                                    <span className="text-SlateBlueText dark:text-darktext">المدفوع فعليًا</span>
                                                    <span className="font-semibold text-green-600 tabular-nums">{formatMoney(currentInvoice.paidAmount)}</span>
                                                </div>
                                                <div className="pt-2 mt-2 border-t border-dashed border-PowderBlueBorder dark:border-dark_border flex justify-between gap-6">
                                                    <span className="font-medium text-MidnightNavyText dark:text-white">المتبقي</span>
                                                    <span className="font-bold text-amber-600 tabular-nums">{formatMoney(currentInvoiceRemaining)}</span>
                                                </div>
                                                <div className={`flex justify-between gap-6 pt-1 ${isInvoiceOverdue ? "text-red-600" : ""}`}>
                                                    <span className="text-SlateBlueText dark:text-darktext">تاريخ الاستحقاق</span>
                                                    <span className="font-medium tabular-nums">
                                                        {currentInvoice.dueDate ? formatDate(currentInvoice.dueDate) : "—"}
                                                    </span>
                                                </div>

                                                {/* segmented paid/remaining bar instead of a plain progress bar */}
                                                <div className="pt-3">
                                                    <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex">
                                                        <div className="h-full bg-green-500" style={{ width: `${paidPct}%` }} />
                                                        <div className="h-full bg-amber-300" style={{ width: `${100 - paidPct}%` }} />
                                                    </div>
                                                    <p className="text-[11px] text-SlateBlueText dark:text-darktext mt-1 text-right tabular-nums">
                                                        {paidPct}% تم سداده
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="px-6 pb-6 flex gap-3 flex-wrap">
                                            <button
                                                onClick={() => setShowAddPayment(true)}
                                                disabled={currentInvoiceRemaining <= 0 || currentInvoice.status === "Voided"}
                                                className="flex-1 min-w-[140px] bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                                            >
                                                <CreditCard className="w-4 h-4" />
                                                تسجيل دفعة جديدة
                                            </button>
                                            <button
                                                onClick={() => setShowRefund(true)}
                                                disabled={(currentInvoice.paidAmount || 0) <= 0 || currentInvoice.status === "Voided"}
                                                className="flex-1 min-w-[140px] bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 disabled:opacity-40 disabled:cursor-not-allowed text-rose-600 dark:text-rose-400 px-4 py-2.5 rounded-lg font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                                            >
                                                <Minus className="w-4 h-4" />
                                                استرجاع مبلغ
                                            </button>
                                        </div>
                                    </div>

                                    {/* Payments history — timeline list */}
                                    <div className="bg-white dark:bg-dark_input rounded-2xl border border-PowderBlueBorder dark:border-dark_border p-6">
                                        <h3 className="text-base font-bold text-MidnightNavyText dark:text-white mb-4 flex items-center gap-2">
                                            <History className="w-5 h-5 text-primary" />
                                            سجل الدفعات ({(currentInvoice.payments || []).length})
                                        </h3>

                                        {(currentInvoice.payments || []).length > 0 ? (
                                            <div className="space-y-2">
                                                {currentInvoice.payments.map((payment) => {
                                                    const isRefund = payment.type === "refund" || payment.amount < 0;
                                                    const escrowCfg = ESCROW_STATUS_CFG[payment.escrow?.status || "not_started"];
                                                    return (
                                                        <div key={payment._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg flex-wrap gap-2">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isRefund ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600" : "bg-green-100 dark:bg-green-900/30 text-green-600"
                                                                    }`}>
                                                                    {isRefund ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                                                </div>
                                                                <div>
                                                                    <p className={`font-semibold text-sm ${isRefund ? "text-rose-600" : "text-MidnightNavyText dark:text-white"}`}>
                                                                        {isRefund ? "استرجاع" : "دفعة"} — {formatMoney(Math.abs(payment.amount))}
                                                                    </p>
                                                                    <p className="text-xs text-SlateBlueText dark:text-darktext">
                                                                        {formatDate(payment.date)} • {payment.method || "cash"}
                                                                        {payment.notes ? ` • ${payment.notes}` : ""}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {!isRefund && (
                                                                <span className={`text-[11px] px-2 py-1 rounded-full font-medium ${escrowCfg.bg}`}>
                                                                    {escrowCfg.label}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                                                لا يوجد دفعات مسجلة على الفاتورة دي لحد دلوقتي
                                            </p>
                                        )}
                                    </div>

                                    {invoices.length > 1 && (
                                        <div className="bg-white dark:bg-dark_input rounded-2xl border border-PowderBlueBorder dark:border-dark_border p-6">
                                            <h3 className="text-base font-bold text-MidnightNavyText dark:text-white mb-4 flex items-center gap-2">
                                                <Landmark className="w-5 h-5 text-secondary" />
                                                فواتير سابقة
                                            </h3>
                                            <div className="space-y-2">
                                                {invoices
                                                    .filter(inv => inv._id !== currentInvoice._id)
                                                    .map((inv) => {
                                                        const cfg = INVOICE_STATUS_CFG[inv.status] || {};
                                                        return (
                                                            <button
                                                                key={inv._id}
                                                                onClick={() => setExpandedInvoice(expandedInvoice === inv._id ? null : inv._id)}
                                                                className="w-full text-left p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                            >
                                                                <div>
                                                                    <p className="text-sm font-medium text-MidnightNavyText dark:text-white">
                                                                        {formatMoney(inv.totalAmount)} — مدفوع {formatMoney(inv.paidAmount)}
                                                                    </p>
                                                                    <p className="text-xs text-SlateBlueText dark:text-darktext">
                                                                        {formatDate(inv.createdAt)}
                                                                    </p>
                                                                </div>
                                                                <span className={`text-xs px-2 py-1 rounded-full ${cfg.bg || "bg-gray-100 text-gray-500"}`}>
                                                                    {cfg.label || inv.status}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Exceptions Tab */}
                    {activeTab === "exceptions" && (
                        <div className="space-y-6">
                            {stats.activeExceptions.length > 0 && (
                                <div className="bg-white dark:bg-dark_input rounded-2xl border border-PowderBlueBorder dark:border-dark_border p-6">
                                    <h3 className="text-base font-bold text-MidnightNavyText dark:text-white mb-4 flex items-center gap-2">
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

                            {currentStudent.creditSystem?.exceptions?.filter(e => e.status !== "active").length > 0 && (
                                <div className="bg-white dark:bg-dark_input rounded-2xl border border-PowderBlueBorder dark:border-dark_border p-6">
                                    <h3 className="text-base font-bold text-MidnightNavyText dark:text-white mb-4 flex items-center gap-2">
                                        <History className="w-5 h-5 text-gray-500" />
                                        {t("credit.exceptionHistory")}
                                    </h3>
                                    <div className="space-y-2">
                                        {currentStudent.creditSystem.exceptions
                                            .filter(e => e.status !== "active")
                                            .map(exception => {
                                                const cfg = exceptionTypes[exception.type] || {};
                                                const ExceptionIcon = cfg.icon || AlertCircle;
                                                return (
                                                    <div key={exception._id} className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg text-sm">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-6 h-6 rounded flex items-center justify-center ${cfg.chipBg}`}>
                                                                    <ExceptionIcon className={`w-3 h-3 ${cfg.chipText}`} />
                                                                </div>
                                                                <span className="font-medium text-MidnightNavyText dark:text-white">
                                                                    {cfg.label}
                                                                </span>
                                                            </div>
                                                            <span className="text-xs text-SlateBlueText dark:text-darktext">
                                                                {formatDate(exception.startDate)} - {exception.endDate ? formatDate(exception.endDate) : t("credit.ongoing")}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-SlateBlueText dark:text-darktext mt-1 ms-8">
                                                            {exception.reason}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => setShowAddException(true)}
                                className="w-full p-4 border-2 border-dashed border-PowderBlueBorder dark:border-dark_border rounded-xl hover:border-amber-brand hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all group"
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
                                    <span className="font-semibold text-sm text-MidnightNavyText dark:text-white">
                                        {t("credit.addNewException")}
                                    </span>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* History Tab */}
                    {activeTab === "history" && (
                        <div className="space-y-6">
                            {currentStudent.creditSystem?.usageHistory?.length > 0 ? (
                                <div className="bg-white dark:bg-dark_input rounded-2xl border border-PowderBlueBorder dark:border-dark_border p-6">
                                    <h3 className="text-base font-bold text-MidnightNavyText dark:text-white mb-4 flex items-center gap-2">
                                        <History className="w-5 h-5 text-primary" />
                                        {t("credit.usageHistory")}
                                    </h3>
                                    <div className="space-y-2">
                                        {currentStudent.creditSystem.usageHistory
                                            .sort((a, b) => new Date(b.date) - new Date(a.date))
                                            .map((usage, index) => (
                                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                                                            <Clock className="w-4 h-4 text-primary" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-sm text-MidnightNavyText dark:text-white">
                                                                {usage.sessionTitle || t("credit.session")}
                                                            </p>
                                                            <p className="text-xs text-SlateBlueText dark:text-darktext">
                                                                {usage.groupName || t("credit.group")} • {formatDate(usage.date)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <span className={`font-bold text-sm ${usage.hoursDeducted < 0 ? "text-green-600" : "text-red-500"}`}>
                                                            {usage.hoursDeducted < 0 ? "+" : "-"}{Math.abs(usage.hoursDeducted)}h
                                                        </span>
                                                        <p className="text-xs text-SlateBlueText dark:text-darktext capitalize">
                                                            {usage.attendanceStatus}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-dark_input rounded-2xl border border-dashed border-PowderBlueBorder dark:border-dark_border p-10 text-center">
                                    <History className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                    <h3 className="text-base font-bold text-MidnightNavyText dark:text-white mb-1.5">
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
                <div className="p-4 border-t border-PowderBlueBorder dark:border-dark_border bg-gray-50/60 dark:bg-gray-800/30">
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
                <div className="fixed inset-0 bg-teal-deeper/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white dark:bg-darkmode rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-PowderBlueBorder/60 dark:border-dark_border">
                        <div className="p-4 border-b border-PowderBlueBorder dark:border-dark_border flex items-center justify-between sticky top-0 bg-white dark:bg-darkmode z-10">
                            <h3 className="text-base font-bold text-MidnightNavyText dark:text-white flex items-center gap-2">
                                <Package className="w-5 h-5 text-primary" />
                                {t("credit.addPackage")}
                            </h3>
                            <button onClick={() => setShowAddPackage(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {plansLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                </div>
                            ) : packagePlans.length === 0 ? (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-700 dark:text-amber-300">
                                    لسه مفيش باقات متاحة. من فضلك أضف باقة أولًا من صفحة "باقات الساعات".
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className={labelCls}>
                                            {t("credit.packageType")}
                                        </label>
                                        <select
                                            value={newPackage.packagePlanId}
                                            onChange={(e) => {
                                                const plan = packagePlans.find((p) => p._id === e.target.value);
                                                setNewPackage((prev) => ({
                                                    ...prev,
                                                    packagePlanId: e.target.value,
                                                    price: plan?.price || 0,
                                                    amountPaid: prev.paymentOption === "full" ? (plan?.price || 0) : prev.paymentOption === "none" ? 0 : prev.amountPaid,
                                                }));
                                            }}
                                            className={inputCls}
                                        >
                                            {packagePlans.map((plan) => (
                                                <option key={plan._id} value={plan._id}>
                                                    {plan.name} — {plan.months} شهر — {plan.totalHours} {t("credit.hours")}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className={labelCls}>
                                            {t("credit.price")} (EGP)
                                        </label>
                                        <input
                                            type="number"
                                            value={newPackage.price}
                                            onChange={(e) => setNewPackage({ ...newPackage, price: Number(e.target.value) })}
                                            className={inputCls}
                                            min="0"
                                        />
                                    </div>

                                    <div>
                                        <label className={labelCls}>
                                            طريقة الدفع
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {PAYMENT_OPTIONS.map((opt) => {
                                                const Icon = opt.icon;
                                                const active = newPackage.paymentOption === opt.id;
                                                return (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => handlePaymentOptionChange(opt.id)}
                                                        className={`p-3 border rounded-lg text-center transition-all ${active
                                                            ? "border-primary bg-primary/5"
                                                            : "border-PowderBlueBorder dark:border-dark_border hover:bg-gray-50 dark:hover:bg-gray-800"
                                                            }`}
                                                    >
                                                        <Icon className={`w-5 h-5 mx-auto mb-1 ${active ? "text-primary" : "text-gray-400"}`} />
                                                        <span className={`text-xs font-medium ${active ? "text-primary" : "text-MidnightNavyText dark:text-white"}`}>
                                                            {opt.label}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {newPackage.paymentOption === "partial" && (
                                        <div>
                                            <label className={labelCls}>
                                                المبلغ المدفوع الآن (EGP)
                                            </label>
                                            <input
                                                type="number"
                                                value={newPackage.amountPaid}
                                                onChange={(e) => setNewPackage({ ...newPackage, amountPaid: Number(e.target.value) })}
                                                className={inputCls}
                                                min="1"
                                                max={newPackage.price - 1}
                                            />
                                            {(Number(newPackage.amountPaid) <= 0 || Number(newPackage.amountPaid) >= Number(newPackage.price)) && (
                                                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" /> لازم يكون أكبر من 0 وأقل من السعر الكامل
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {newPackage.paymentOption !== "full" && (
                                        <div>
                                            <label className={labelCls}>
                                                تاريخ استحقاق باقي المبلغ <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={newPackage.dueDate}
                                                onChange={(e) => setNewPackage({ ...newPackage, dueDate: e.target.value })}
                                                className={inputCls}
                                            />
                                            <p className="text-[11px] text-SlateBlueText dark:text-darktext mt-1">
                                                بعد التاريخ ده، لو مدفعش الباقي، هيوصل تنبيه للأدمن في صفحة "تنبيهات الفوترة".
                                            </p>
                                        </div>
                                    )}

                                    <div>
                                        <label className={labelCls}>
                                            {t("credit.startDate")}
                                        </label>
                                        <input
                                            type="date"
                                            value={newPackage.startDate}
                                            onChange={(e) => setNewPackage({ ...newPackage, startDate: e.target.value })}
                                            className={inputCls}
                                        />
                                    </div>

                                    <div className="bg-primary/5 p-4 rounded-lg">
                                        <p className="text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
                                            {t("credit.packageSummary")}
                                        </p>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-SlateBlueText dark:text-darktext">{t("credit.totalHours")}:</span>
                                                <span className="font-semibold text-MidnightNavyText dark:text-white">
                                                    {selectedPlan?.totalHours ?? 0} {t("credit.hours")}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-SlateBlueText dark:text-darktext">{t("credit.duration")}:</span>
                                                <span className="font-semibold text-MidnightNavyText dark:text-white">
                                                    {selectedPlan?.months ?? 0} {t("credit.months")}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-SlateBlueText dark:text-darktext">{t("credit.endDate")}:</span>
                                                <span className="font-semibold text-MidnightNavyText dark:text-white">
                                                    {selectedPlan
                                                        ? new Date(
                                                            new Date(newPackage.startDate).setMonth(
                                                                new Date(newPackage.startDate).getMonth() + selectedPlan.months
                                                            )
                                                        ).toLocaleDateString()
                                                        : "-"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between pt-1 mt-1 border-t border-primary/20">
                                                <span className="text-SlateBlueText dark:text-darktext">المدفوع الآن:</span>
                                                <span className="font-semibold text-green-600">{formatMoney(newPackage.amountPaid)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-SlateBlueText dark:text-darktext">المتبقي:</span>
                                                <span className="font-semibold text-amber-600">
                                                    {formatMoney(Math.max(0, (Number(newPackage.price) || 0) - (Number(newPackage.amountPaid) || 0)))}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="p-4 border-t border-PowderBlueBorder dark:border-dark_border flex gap-3 sticky bottom-0 bg-white dark:bg-darkmode">
                            <button
                                onClick={() => setShowAddPackage(false)}
                                className="flex-1 px-4 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg text-sm text-MidnightNavyText dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                {t("common.cancel")}
                            </button>
                            <button
                                onClick={handleAddPackage}
                                disabled={loading || packagePlans.length === 0 || Number(newPackage.amountPaid) > Number(newPackage.price)}
                                className="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {loading ? t("common.saving") : t("common.save")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Package Modal */}
            {showEditPackage && currentStudent?.creditSystem?.currentPackage && (
                <div className="fixed inset-0 bg-teal-deeper/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white dark:bg-darkmode rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-PowderBlueBorder/60 dark:border-dark_border">
                        <div className="p-4 border-b border-PowderBlueBorder dark:border-dark_border flex items-center justify-between sticky top-0 bg-white dark:bg-darkmode z-10">
                            <h3 className="text-base font-bold text-MidnightNavyText dark:text-white flex items-center gap-2">
                                <Edit className="w-5 h-5 text-secondary" />
                                تعديل الباكدج
                            </h3>
                            <button onClick={() => setShowEditPackage(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="bg-secondary/5 border border-secondary/20 rounded-lg p-3 text-xs text-secondary flex items-start gap-2">
                                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>
                                    التعديل ده بيصحح بيانات الباكدج الحالي من غير ما يترحّل للتاريخ أو ينشئ فاتورة جديدة.
                                    الساعات المستخدمة فعليًا ({currentPkgHoursUsed}h) بتتحفظ زي ما هي.
                                </span>
                            </div>

                            <div>
                                <label className={labelCls}>نوع الباقة</label>
                                <select
                                    value={editPackageData.packagePlanId}
                                    onChange={(e) => handleEditPlanChange(e.target.value)}
                                    className={inputCls}
                                >
                                    {!packagePlans.some((p) => p._id === editPackageData.packagePlanId) && (
                                        <option value={editPackageData.packagePlanId}>
                                            {describePackage(currentStudent.creditSystem.currentPackage).label} (الباقة الأصلية)
                                        </option>
                                    )}
                                    {packagePlans.map((plan) => (
                                        <option key={plan._id} value={plan._id}>
                                            {plan.name} — {plan.months} شهر — {plan.totalHours} {t("credit.hours")}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[11px] text-SlateBlueText dark:text-darktext mt-1">
                                    تغيير الباقة بيحدّث الساعات والسعر تلقائيًا تحت — تقدر تعدلهم يدويًا بعد كده.
                                </p>
                            </div>

                            <div>
                                <label className={labelCls}>إجمالي الساعات</label>
                                <input
                                    type="number"
                                    value={editPackageData.totalHours}
                                    onChange={(e) => setEditPackageData({ ...editPackageData, totalHours: Number(e.target.value) })}
                                    className={inputCls}
                                    min={currentPkgHoursUsed}
                                />
                                <p className="text-[11px] text-SlateBlueText dark:text-darktext mt-1">
                                    الحد الأدنى المسموح {currentPkgHoursUsed}h (الساعات المستخدمة بالفعل)
                                </p>
                            </div>

                            <div>
                                <label className={labelCls}>{t("credit.price")} (EGP)</label>
                                <input
                                    type="number"
                                    value={editPackageData.price}
                                    onChange={(e) => setEditPackageData({ ...editPackageData, price: Number(e.target.value) })}
                                    className={inputCls}
                                    min="0"
                                />
                                <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 shrink-0" />
                                    تغيير السعر مش بيحدّث الفاتورة تلقائيًا — راجعها من تاب الفوترة لو لزم الأمر.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>{t("credit.startDate")}</label>
                                    <input
                                        type="date"
                                        value={editPackageData.startDate}
                                        onChange={(e) => setEditPackageData({ ...editPackageData, startDate: e.target.value })}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>{t("credit.endDate")}</label>
                                    <input
                                        type="date"
                                        value={editPackageData.endDate}
                                        onChange={(e) => setEditPackageData({ ...editPackageData, endDate: e.target.value })}
                                        className={inputCls}
                                        min={editPackageData.startDate}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>سبب التعديل ({t("credit.optional")})</label>
                                <textarea
                                    value={editPackageData.reason}
                                    onChange={(e) => setEditPackageData({ ...editPackageData, reason: e.target.value })}
                                    className={inputCls}
                                    rows="2"
                                    placeholder="مثال: تصحيح غلطة في عدد الساعات وقت الإضافة"
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-PowderBlueBorder dark:border-dark_border flex gap-3 sticky bottom-0 bg-white dark:bg-darkmode">
                            <button
                                onClick={() => setShowEditPackage(false)}
                                className="flex-1 px-4 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg text-sm text-MidnightNavyText dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                {t("common.cancel")}
                            </button>
                            <button
                                onClick={handleEditPackage}
                                disabled={editSubmitting}
                                className="flex-1 bg-secondary hover:bg-secondary/90 text-white px-4 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                            >
                                {editSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {editSubmitting ? t("common.saving") : "حفظ التعديل"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Payment Modal */}
            {showAddPayment && currentInvoice && (
                <div className="fixed inset-0 bg-teal-deeper/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white dark:bg-darkmode rounded-2xl w-full max-w-md border border-PowderBlueBorder/60 dark:border-dark_border">
                        <div className="p-4 border-b border-PowderBlueBorder dark:border-dark_border flex items-center justify-between">
                            <h3 className="text-base font-bold text-MidnightNavyText dark:text-white flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-primary" />
                                تسجيل دفعة جديدة
                            </h3>
                            <button onClick={() => setShowAddPayment(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
                                <p className="text-amber-700 dark:text-amber-300">
                                    المتبقي على الفاتورة: <strong>{formatMoney(currentInvoiceRemaining)}</strong>
                                </p>
                            </div>

                            <div>
                                <label className={labelCls}>
                                    المبلغ (EGP) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    value={newPayment.amount}
                                    onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                                    className={inputCls}
                                    min="1"
                                    max={currentInvoiceRemaining}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className={labelCls}>
                                    طريقة الدفع
                                </label>
                                <select
                                    value={newPayment.method}
                                    onChange={(e) => setNewPayment({ ...newPayment, method: e.target.value })}
                                    className={inputCls}
                                >
                                    <option value="cash">كاش</option>
                                    <option value="instapay">Instapay</option>
                                    <option value="vodafone_cash">فودافون كاش</option>
                                    <option value="bank_transfer">تحويل بنكي</option>
                                    <option value="other">أخرى</option>
                                </select>
                            </div>

                            <div>
                                <label className={labelCls}>
                                    ملاحظات (اختياري)
                                </label>
                                <textarea
                                    value={newPayment.notes}
                                    onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                                    className={inputCls}
                                    rows="2"
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-PowderBlueBorder dark:border-dark_border flex gap-3">
                            <button
                                onClick={() => setShowAddPayment(false)}
                                className="flex-1 px-4 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg text-sm text-MidnightNavyText dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleAddPayment}
                                disabled={paymentSubmitting}
                                className="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                            >
                                {paymentSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {paymentSubmitting ? "جارِ الحفظ..." : "تسجيل الدفعة"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Refund Modal */}
            {showRefund && currentInvoice && (
                <div className="fixed inset-0 bg-teal-deeper/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white dark:bg-darkmode rounded-2xl w-full max-w-md border border-PowderBlueBorder/60 dark:border-dark_border">
                        <div className="p-4 border-b border-PowderBlueBorder dark:border-dark_border flex items-center justify-between">
                            <h3 className="text-base font-bold text-MidnightNavyText dark:text-white flex items-center gap-2">
                                <Minus className="w-5 h-5 text-rose-500" />
                                استرجاع مبلغ
                            </h3>
                            <button onClick={() => setShowRefund(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-3 text-sm">
                                <p className="text-rose-700 dark:text-rose-300">
                                    الحد الأقصى للاسترجاع = المبلغ المدفوع فعليًا: <strong>{formatMoney(currentInvoice.paidAmount)}</strong>
                                </p>
                                <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                                    (مينفعش تسترجع مبلغ اتحول بالفعل لإيراد معترف به بعد فترة الإسكرو)
                                </p>
                            </div>

                            <div>
                                <label className={labelCls}>
                                    المبلغ المسترجع (EGP) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    value={refundData.amount}
                                    onChange={(e) => setRefundData({ ...refundData, amount: e.target.value })}
                                    className={inputCls}
                                    min="1"
                                    max={currentInvoice.paidAmount}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className={labelCls}>
                                    السبب <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={refundData.reason}
                                    onChange={(e) => setRefundData({ ...refundData, reason: e.target.value })}
                                    className={inputCls}
                                    rows="2"
                                    placeholder="سبب الاسترجاع..."
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-PowderBlueBorder dark:border-dark_border flex gap-3">
                            <button
                                onClick={() => setShowRefund(false)}
                                className="flex-1 px-4 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg text-sm text-MidnightNavyText dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleRefund}
                                disabled={refundSubmitting}
                                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                            >
                                {refundSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {refundSubmitting ? "جارِ التنفيذ..." : "تأكيد الاسترجاع"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Exception Modal */}
            {showAddException && (
                <div className="fixed inset-0 bg-teal-deeper/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white dark:bg-darkmode rounded-2xl w-full max-w-md border border-PowderBlueBorder/60 dark:border-dark_border">
                        <div className="p-4 border-b border-PowderBlueBorder dark:border-dark_border flex items-center justify-between">
                            <h3 className="text-base font-bold text-MidnightNavyText dark:text-white flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-amber-600" />
                                {t("credit.addException")}
                            </h3>
                            <button onClick={() => setShowAddException(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div>
                                <label className={labelCls}>
                                    {t("credit.exceptionType")}
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.entries(exceptionTypes).map(([key, cfg]) => {
                                        const Icon = cfg.icon;
                                        const active = newException.type === key;
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setNewException({ ...newException, type: key, hours: key === 'freeze' ? 0 : newException.hours })}
                                                className={`p-3 border rounded-lg text-center transition-all ${active ? cfg.activeCls : 'border-PowderBlueBorder dark:border-dark_border hover:bg-gray-50 dark:hover:bg-gray-800'
                                                    }`}
                                            >
                                                <Icon className={`w-5 h-5 mx-auto mb-1 ${active ? cfg.activeText : 'text-gray-400'}`} />
                                                <span className={`text-xs font-medium ${active ? cfg.activeText : 'text-MidnightNavyText dark:text-white'}`}>
                                                    {cfg.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-SlateBlueText dark:text-darktext mt-2">
                                    {exceptionTypes[newException.type]?.description}
                                </p>
                            </div>

                            {newException.type !== 'freeze' && (
                                <div>
                                    <label className={labelCls}>
                                        {newException.type === 'deduction' ? t("credit.hoursToDeduct") : t("credit.hoursToAdd")}
                                    </label>
                                    <input
                                        type="number"
                                        value={newException.hours}
                                        onChange={(e) => setNewException({ ...newException, hours: Number(e.target.value) })}
                                        className={inputCls}
                                        min="1"
                                        max="100"
                                        required={newException.type !== 'freeze'}
                                    />
                                </div>
                            )}

                            <div>
                                <label className={labelCls}>
                                    {t("credit.reason")} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newException.reason}
                                    onChange={(e) => setNewException({ ...newException, reason: e.target.value })}
                                    className={inputCls}
                                    placeholder={t("credit.reasonPlaceholder")}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>
                                        {t("credit.startDate")}
                                    </label>
                                    <input
                                        type="date"
                                        value={newException.startDate}
                                        onChange={(e) => setNewException({ ...newException, startDate: e.target.value })}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>
                                        {t("credit.endDate")} ({t("credit.optional")})
                                    </label>
                                    <input
                                        type="date"
                                        value={newException.endDate}
                                        onChange={(e) => setNewException({ ...newException, endDate: e.target.value })}
                                        className={inputCls}
                                        min={newException.startDate}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>
                                    {t("credit.notes")} ({t("credit.optional")})
                                </label>
                                <textarea
                                    value={newException.notes}
                                    onChange={(e) => setNewException({ ...newException, notes: e.target.value })}
                                    className={inputCls}
                                    rows="2"
                                    placeholder={t("credit.notesPlaceholder")}
                                />
                            </div>

                            {newException.type === 'freeze' && (
                                <div className="bg-secondary/5 border border-secondary/20 rounded-lg p-3">
                                    <div className="flex items-start gap-2">
                                        <Info className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-secondary">
                                                {t("credit.freezeWarning")}
                                            </p>
                                            <p className="text-xs text-secondary/80 mt-1">
                                                {t("credit.freezeDescription")}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {newException.type === 'deduction' && newException.hours > (stats.remainingHours || 0) && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
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
                                className="flex-1 px-4 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg text-sm text-MidnightNavyText dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                {t("common.cancel")}
                            </button>
                            <button
                                onClick={handleAddException}
                                disabled={loading || !newException.reason || (newException.type !== 'freeze' && !newException.hours)}
                                className="flex-1 bg-amber-brand hover:opacity-90 text-white px-4 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
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

// Meta stat used beside the hours ring in Overview — quiet, no card chrome
function MetaStat({ icon: Icon, label, value, sub, tone }) {
    return (
        <div>
            <div className="flex items-center gap-1.5 text-SlateBlueText dark:text-darktext mb-1">
                <Icon className="w-3.5 h-3.5" />
                <span className="text-xs">{label}</span>
            </div>
            <p className={`text-xl font-bold tabular-nums ${tone || "text-MidnightNavyText dark:text-white"}`}>{value}</p>
            {sub && <p className="text-[11px] text-SlateBlueText dark:text-darktext mt-0.5">{sub}</p>}
        </div>
    );
}

// Package Card Component
function PackageCard({ pkg, stats, describePackage, formatDate }) {
    const { t } = useI18n();
    const info = describePackage(pkg);

    const getStatusColor = (status) => {
        switch (status) {
            case "active": return "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400";
            case "frozen": return "bg-secondary/10 text-secondary dark:bg-secondary/20";
            case "expired": return "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400";
            case "completed": return "bg-orange-coral/10 text-orange-coral dark:bg-orange-coral/20";
            case "deleted": return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
            default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <Package className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div>
                        <p className="font-semibold text-sm text-MidnightNavyText dark:text-white">
                            {info.label}
                        </p>
                        <p className="text-xs text-SlateBlueText dark:text-darktext">
                            {formatDate(pkg.startDate)} - {formatDate(pkg.endDate)}
                        </p>
                    </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(pkg.status)}`}>
                    {pkg.status}
                </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
                    <p className="text-xs text-SlateBlueText dark:text-darktext">{t("credit.total")}</p>
                    <p className="text-base font-bold text-MidnightNavyText dark:text-white">{pkg.totalHours}h</p>
                </div>
                <div className="text-center p-2 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
                    <p className="text-xs text-SlateBlueText dark:text-darktext">{t("credit.used")}</p>
                    <p className="text-base font-bold text-secondary">{stats.usedHours}h</p>
                </div>
                <div className="text-center p-2 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
                    <p className="text-xs text-SlateBlueText dark:text-darktext">{t("credit.remaining")}</p>
                    <p className="text-base font-bold text-green-600 dark:text-green-400">{stats.remainingHours}h</p>
                </div>
            </div>

            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                    className={`h-1.5 rounded-full ${stats.usagePercentage > 80 ? 'bg-red-500' :
                        stats.usagePercentage > 60 ? 'bg-amber-brand' :
                            'bg-primary'
                        }`}
                    style={{ width: `${stats.usagePercentage}%` }}
                />
            </div>

            {pkg.editLog?.length > 0 && (
                <p className="text-[11px] text-SlateBlueText dark:text-darktext flex items-center gap-1">
                    <Info className="w-3 h-3 shrink-0" />
                    آخر تعديل: {formatDate(pkg.editLog[pkg.editLog.length - 1].editedAt)}
                    {pkg.editLog[pkg.editLog.length - 1].reason ? ` — ${pkg.editLog[pkg.editLog.length - 1].reason}` : ""}
                </p>
            )}
        </div>
    );
}

// Exception Card Component
function ExceptionCard({ exception, exceptionTypes, formatDate, onEnd, onExpand, isExpanded }) {
    const { t } = useI18n();
    const cfg = exceptionTypes[exception.type] || {};
    const ExceptionIcon = cfg.icon || AlertCircle;

    return (
        <div className="border border-PowderBlueBorder dark:border-dark_border rounded-lg overflow-hidden">
            <div className="p-3 bg-white dark:bg-dark_input">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.chipBg}`}>
                            <ExceptionIcon className={`w-4 h-4 ${cfg.chipText}`} />
                        </div>
                        <div>
                            <p className="font-semibold text-sm text-MidnightNavyText dark:text-white">
                                {cfg.label}
                            </p>
                            <p className="text-xs text-SlateBlueText dark:text-darktext">
                                {exception.reason}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-SlateBlueText dark:text-darktext hidden sm:inline">
                            {formatDate(exception.startDate)}
                            {exception.endDate && ` - ${formatDate(exception.endDate)}`}
                        </span>
                        <button
                            onClick={onExpand}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
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