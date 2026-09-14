"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
    AlertTriangle,
    Landmark,
    Ban,
    CalendarClock,
    CheckCircle2,
    RotateCcw,
    X,
    Save,
    Loader2,
    Clock,
    BadgeCheck,
    Inbox,
    ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

function formatMoney(n) {
    return `${Number(n || 0).toLocaleString("en-US")} EGP`;
}

function formatDate(date) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function daysSince(date) {
    if (!date) return 0;
    return Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
}

const TYPE_CFG = {
    overdue: {
        label: "فاتورة متأخرة",
        icon: CalendarClock,
        color: "text-red-600",
        bg: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    },
    escrow_review: {
        label: "مراجعة إسكرو (14 يوم)",
        icon: Landmark,
        color: "text-blue-600",
        bg: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    },
};

export default function BillingAlertsPage() {
    const [status, setStatus] = useState("open");
    const [typeFilter, setTypeFilter] = useState("all");
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actingAlert, setActingAlert] = useState(null); // alert being resolved (opens modal)
    const [submitting, setSubmitting] = useState(false);

    // Resolve form state
    const [resolveAction, setResolveAction] = useState("");
    const [newDueDate, setNewDueDate] = useState("");
    const [refundAmount, setRefundAmount] = useState("");
    const [reason, setReason] = useState("");

    const fetchAlerts = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ status });
            if (typeFilter !== "all") params.set("type", typeFilter);
            const res = await fetch(`/api/billing-alerts?${params.toString()}`);
            const data = await res.json();
            if (data.success) setAlerts(data.data || []);
            else toast.error(data.message || "تعذر تحميل التنبيهات");
        } catch (err) {
            toast.error(err.message || "تعذر تحميل التنبيهات");
        } finally {
            setLoading(false);
        }
    }, [status, typeFilter]);

    useEffect(() => {
        fetchAlerts();
    }, [fetchAlerts]);

    const openResolve = (alert, action) => {
        setActingAlert(alert);
        setResolveAction(action);
        setNewDueDate("");
        setRefundAmount("");
        setReason("");
    };

    const closeResolve = () => {
        setActingAlert(null);
        setResolveAction("");
    };

    const handleSubmitResolve = async () => {
        if (!actingAlert) return;

        if (resolveAction === "extend" && !newDueDate) {
            toast.error("حدد تاريخ الاستحقاق الجديد");
            return;
        }
        if (resolveAction === "refund" && (!refundAmount || Number(refundAmount) <= 0)) {
            toast.error("ادخل مبلغ استرجاع صحيح");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`/api/billing-alerts/${actingAlert._id}/resolve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: resolveAction,
                    newDueDate: resolveAction === "extend" ? newDueDate : undefined,
                    refundAmount: resolveAction === "refund" ? Number(refundAmount) : undefined,
                    reason,
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("تم تنفيذ الإجراء بنجاح");
                closeResolve();
                fetchAlerts();
            } else {
                toast.error(data.message || "حدث خطأ");
            }
        } catch (err) {
            toast.error(err.message || "حدث خطأ");
        } finally {
            setSubmitting(false);
        }
    };

    const openCount = alerts.filter((a) => a.status === "open").length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg shrink-0">
                    <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-MidnightNavyText dark:text-white">
                        تنبيهات الفوترة
                    </h1>
                    <p className="text-sm text-SlateBlueText dark:text-darktext">
                        فواتير متأخرة السداد، ومراجعات إسكرو محتاجة قرار (احتساب فلوس ولا استرجاع)
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex gap-2">
                    {[
                        { id: "open", label: "قيد المراجعة" },
                        { id: "resolved", label: "تمت المعالجة" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setStatus(tab.id)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${status === tab.id
                                ? "bg-primary text-white"
                                : "bg-white dark:bg-dark_input border border-PowderBlueBorder dark:border-dark_border text-MidnightNavyText dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    {[
                        { id: "all", label: "الكل" },
                        { id: "overdue", label: "متأخرة" },
                        { id: "escrow_review", label: "إسكرو" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setTypeFilter(tab.id)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${typeFilter === tab.id
                                ? "bg-MidnightNavyText dark:bg-white text-white dark:text-darkmode"
                                : "bg-gray-100 dark:bg-gray-800 text-SlateBlueText dark:text-darktext hover:bg-gray-200 dark:hover:bg-gray-700"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            ) : alerts.length === 0 ? (
                <div className="bg-white dark:bg-dark_input rounded-xl border border-PowderBlueBorder dark:border-dark_border p-12 text-center">
                    <Inbox className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-2">
                        {status === "open" ? "مفيش تنبيهات قيد المراجعة" : "مفيش تنبيهات متعالجة لسه"}
                    </h3>
                    <p className="text-sm text-SlateBlueText dark:text-darktext">
                        {status === "open"
                            ? "كل الفواتير والدفعات في وضع طبيعي دلوقتي."
                            : "لما تتخذ قرار على تنبيه، هيظهر هنا."}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {alerts.map((alert) => {
                        const cfg = TYPE_CFG[alert.type];
                        const Icon = cfg.icon;
                        const days = daysSince(alert.dueDateAtCreation);
                        const isOverdueType = alert.type === "overdue";

                        return (
                            <div
                                key={alert._id}
                                className="bg-white dark:bg-dark_input rounded-xl border border-PowderBlueBorder dark:border-dark_border p-5"
                            >
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                    <div className="flex items-start gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg}`}>
                                                    {cfg.label}
                                                </span>
                                                {alert.status === "open" && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">
                                                        منذ {days} يوم
                                                    </span>
                                                )}
                                            </div>
                                            <p className="font-semibold text-MidnightNavyText dark:text-white mt-1">
                                                {alert.studentId?.personalInfo?.fullName || "طالب"}
                                                <span className="text-xs text-SlateBlueText dark:text-darktext font-normal">
                                                    {" "}
                                                    • {alert.studentId?.enrollmentNumber}
                                                </span>
                                            </p>
                                            <p className="text-sm text-SlateBlueText dark:text-darktext mt-0.5">
                                                {isOverdueType
                                                    ? `فاتورة ${formatMoney(alert.invoiceId?.totalAmount)} — تاريخ الاستحقاق كان ${formatDate(alert.dueDateAtCreation)}`
                                                    : `دفعة ${formatMoney(alert.paymentId?.amount)} من فاتورة ${formatMoney(alert.invoiceId?.totalAmount)} — انتهت فترة الإسكرو في ${formatDate(alert.dueDateAtCreation)}`}
                                            </p>
                                        </div>
                                    </div>

                                    {alert.status === "resolved" ? (
                                        <div className="text-right">
                                            <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium inline-flex items-center gap-1">
                                                <BadgeCheck className="w-3.5 h-3.5" />
                                                {resolutionLabel(alert.resolution?.action)}
                                            </span>
                                            <p className="text-[11px] text-SlateBlueText dark:text-darktext mt-1">
                                                {formatDate(alert.resolution?.actedAt)}
                                            </p>
                                        </div>
                                    ) : isOverdueType ? (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openResolve(alert, "extend")}
                                                className="px-3 py-2 text-sm rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 inline-flex items-center gap-1.5"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                                تمديد الموعد
                                            </button>
                                            <button
                                                onClick={() => openResolve(alert, "suspend")}
                                                className="px-3 py-2 text-sm rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 inline-flex items-center gap-1.5"
                                            >
                                                <Ban className="w-3.5 h-3.5" />
                                                إيقاف الطالب
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openResolve(alert, "recognize")}
                                                className="px-3 py-2 text-sm rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/40 inline-flex items-center gap-1.5"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                احتساب كإيراد
                                            </button>
                                            <button
                                                onClick={() => openResolve(alert, "refund")}
                                                className="px-3 py-2 text-sm rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/40 inline-flex items-center gap-1.5"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                                استرجاع للطالب
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Resolve modal */}
            {actingAlert && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-darkmode rounded-xl w-full max-w-md">
                        <div className="p-4 border-b border-PowderBlueBorder dark:border-dark_border flex items-center justify-between">
                            <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white flex items-center gap-2">
                                {resolveAction === "extend" && <><RotateCcw className="w-5 h-5 text-blue-600" /> تمديد موعد الاستحقاق</>}
                                {resolveAction === "suspend" && <><Ban className="w-5 h-5 text-red-600" /> إيقاف الطالب</>}
                                {resolveAction === "recognize" && <><CheckCircle2 className="w-5 h-5 text-green-600" /> احتساب المبلغ كإيراد</>}
                                {resolveAction === "refund" && <><RotateCcw className="w-5 h-5 text-rose-600" /> استرجاع المبلغ للطالب</>}
                            </h3>
                            <button onClick={closeResolve} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <p className="text-sm text-SlateBlueText dark:text-darktext">
                                {actingAlert.studentId?.personalInfo?.fullName} • {actingAlert.studentId?.enrollmentNumber}
                            </p>

                            {resolveAction === "extend" && (
                                <div>
                                    <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-1.5">
                                        تاريخ الاستحقاق الجديد <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={newDueDate}
                                        onChange={(e) => setNewDueDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
                                    />
                                </div>
                            )}

                            {resolveAction === "suspend" && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                                    هيتم تعليق تسجيل الطالب وتحويل الفاتورة لحالة "موقوفة" فورًا.
                                </div>
                            )}

                            {resolveAction === "refund" && (
                                <div>
                                    <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-1.5">
                                        المبلغ المسترجع (EGP) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={actingAlert.paymentId?.amount}
                                        value={refundAmount}
                                        onChange={(e) => setRefundAmount(e.target.value)}
                                        className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
                                    />
                                    <p className="text-[11px] text-SlateBlueText dark:text-darktext mt-1">
                                        الحد الأقصى: {formatMoney(actingAlert.paymentId?.amount)}
                                    </p>
                                </div>
                            )}

                            {resolveAction === "recognize" && (
                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-700 dark:text-green-300">
                                    هيتم احتساب المبلغ كإيراد معترف به نهائيًا — مينفعش يترجع بعد كده.
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-1.5">
                                    ملاحظة (اختياري)
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows="2"
                                    className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-PowderBlueBorder dark:border-dark_border flex gap-3">
                            <button
                                onClick={closeResolve}
                                className="flex-1 px-4 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg text-MidnightNavyText dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleSubmitResolve}
                                disabled={submitting}
                                className="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {submitting ? "جارِ التنفيذ..." : "تأكيد"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function resolutionLabel(action) {
    switch (action) {
        case "extend": return "تم تمديد الموعد";
        case "suspend": return "تم إيقاف الطالب";
        case "recognize": return "تم احتسابه إيراد";
        case "refund": return "تم الاسترجاع";
        default: return "تمت المعالجة";
    }
}