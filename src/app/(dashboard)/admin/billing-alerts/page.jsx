"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    AlertTriangle,
    Landmark,
    Ban,
    CalendarClock,
    CheckCircle2,
    RotateCcw,
    Loader2,
    BadgeCheck,
    Inbox,
    Scale,
    Check,
    TrendingUp,
    Wallet,
    PieChart,
    BarChart3,
} from "lucide-react";
import toast from "react-hot-toast";
import AdminDrawer from "../../../../components/Admin/AdminDrawer"; // ← عدّل المسار حسب مكان الملف عندك

/* ───────────── Helpers ───────────── */

const formatMoney = (n) => `${Number(n || 0).toLocaleString("en-US")} EGP`;

function formatDate(date) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

function daysSince(date) {
    if (!date) return 0;
    return Math.max(0, Math.floor((new Date() - new Date(date)) / 86400000));
}

// شدة التأخير: بتتحكم في لون الشريط والحافة
function severity(days) {
    if (days >= 14) return { rail: "bg-red-500", bar: "bg-red-500", text: "text-red-600 dark:text-red-400", hex: "#ef4444" };
    if (days >= 7) return { rail: "bg-amber-500", bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", hex: "#f59e0b" };
    return { rail: "bg-teal-500", bar: "bg-teal-500", text: "text-teal-700 dark:text-teal-400", hex: "#14b8a6" };
}

function initials(name = "") {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "؟";
    if (parts.length === 1) return parts[0].slice(0, 2);
    return parts[0][0] + parts[1][0];
}

const TYPES = {
    overdue: {
        label: "فاتورة متأخرة",
        icon: CalendarClock,
        badge: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
        hex: "#ef4444",
        actions: ["extend", "suspend"],
    },
    escrow_review: {
        label: "مراجعة إسكرو",
        icon: Landmark,
        badge: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
        hex: "#3b82f6",
        actions: ["recognize", "refund"],
    },
};

const ACTIONS = {
    extend: {
        title: "تمديد موعد الاستحقاق",
        desc: "حدد تاريخ استحقاق جديد للفاتورة.",
        icon: CalendarClock,
        selected: "border-blue-500 bg-blue-50/70 dark:bg-blue-500/10",
        dot: "bg-blue-600",
        confirm: "bg-blue-600 hover:bg-blue-700",
        confirmLabel: "تمديد الموعد",
    },
    suspend: {
        title: "إيقاف الطالب",
        desc: "هيتم تعليق تسجيل الطالب وتحويل الفاتورة لحالة «موقوفة» فورًا.",
        icon: Ban,
        selected: "border-red-500 bg-red-50/70 dark:bg-red-500/10",
        dot: "bg-red-600",
        confirm: "bg-red-600 hover:bg-red-700",
        confirmLabel: "إيقاف الطالب",
    },
    recognize: {
        title: "احتساب كإيراد",
        desc: "المبلغ يتسجل إيراد معترف به نهائيًا — مينفعش يترجع بعد كده.",
        icon: CheckCircle2,
        selected: "border-green-500 bg-green-50/70 dark:bg-green-500/10",
        dot: "bg-green-600",
        confirm: "bg-green-600 hover:bg-green-700",
        confirmLabel: "احتساب الإيراد",
    },
    refund: {
        title: "استرجاع للطالب",
        desc: "رد المبلغ كله أو جزء منه للطالب.",
        icon: RotateCcw,
        selected: "border-rose-500 bg-rose-50/70 dark:bg-rose-500/10",
        dot: "bg-rose-600",
        confirm: "bg-rose-600 hover:bg-rose-700",
        confirmLabel: "تنفيذ الاسترجاع",
    },
};

const RESOLUTION_LABEL = {
    extend: "تم تمديد الموعد",
    suspend: "تم إيقاف الطالب",
    recognize: "تم احتسابه إيراد",
    refund: "تم الاسترجاع",
};

const inputCls =
    "w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";
const labelCls = "block text-sm font-medium text-gray-800 dark:text-white mb-1.5";
const muted = "text-gray-500 dark:text-darkmuted";
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";

/* ───────────── Mini chart primitives (SVG, no dependencies) ───────────── */

function DonutChart({ data, size = 132, thickness = 16 }) {
    const total = data.reduce((s, d) => s + d.value, 0);
    const r = (size - thickness) / 2;
    const c = 2 * Math.PI * r;
    let offset = 0;

    return (
        <div className="flex items-center gap-5">
            <div className="relative shrink-0" style={{ width: size, height: size }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={r}
                        fill="none"
                        strokeWidth={thickness}
                        className="stroke-gray-100 dark:stroke-white/5"
                    />
                    {total > 0 &&
                        data.map((d, i) => {
                            const frac = d.value / total;
                            const dash = frac * c;
                            const seg = (
                                <circle
                                    key={i}
                                    cx={size / 2}
                                    cy={size / 2}
                                    r={r}
                                    fill="none"
                                    stroke={d.color}
                                    strokeWidth={thickness}
                                    strokeDasharray={`${dash} ${c - dash}`}
                                    strokeDashoffset={-offset}
                                    strokeLinecap="butt"
                                    style={{ transition: "stroke-dasharray 500ms ease" }}
                                />
                            );
                            offset += dash;
                            return seg;
                        })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-gray-900 dark:text-white leading-none tabular-nums">{total}</span>
                    <span className={`text-[10px] mt-0.5 ${muted}`}>تنبيه</span>
                </div>
            </div>
            <div className="space-y-2.5 min-w-0">
                {data.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-gray-700 dark:text-gray-200 truncate">{d.label}</span>
                        <span className="font-bold text-gray-900 dark:text-white tabular-nums mr-auto">{d.value}</span>
                    </div>
                ))}
                {total === 0 && <p className={`text-xs ${muted}`}>لا توجد بيانات</p>}
            </div>
        </div>
    );
}

function AgeHistogram({ buckets, height = 108 }) {
    const max = Math.max(1, ...buckets.map((b) => b.value));
    return (
        <div className="flex items-end gap-3" style={{ height }}>
            {buckets.map((b, i) => {
                const h = Math.max(4, (b.value / max) * (height - 28));
                return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                        <span className="text-xs font-bold text-gray-900 dark:text-white tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                            {b.value}
                        </span>
                        <div className="w-full flex items-end justify-center" style={{ height: height - 28 }}>
                            <div
                                className="w-full max-w-[34px] rounded-t-md transition-all duration-500"
                                style={{ height: h, backgroundColor: b.color }}
                            />
                        </div>
                        <span className={`text-[11px] font-medium ${muted}`}>{b.label}</span>
                    </div>
                );
            })}
        </div>
    );
}

/* ───────────── Page ───────────── */

export default function BillingAlertsPage() {
    const [status, setStatus] = useState("open");
    const [typeFilter, setTypeFilter] = useState("all");
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    const [actingAlert, setActingAlert] = useState(null);
    const [submitting, setSubmitting] = useState(false);
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

    const stats = useMemo(() => {
        let overdue = 0, escrow = 0, amount = 0;
        alerts.forEach((a) => {
            if (a.type === "overdue") {
                overdue += 1;
                amount += Number(a.invoiceId?.totalAmount || 0);
            } else {
                escrow += 1;
                amount += Number(a.paymentId?.amount || 0);
            }
        });
        return { total: alerts.length, overdue, escrow, amount };
    }, [alerts]);

    const ageBuckets = useMemo(() => {
        const buckets = [
            { label: "٠–٦ أيام", value: 0, color: "#14b8a6" },
            { label: "٧–١٣ يوم", value: 0, color: "#f59e0b" },
            { label: "١٤+ يوم", value: 0, color: "#ef4444" },
        ];
        alerts.forEach((a) => {
            const d = daysSince(a.dueDateAtCreation);
            if (d >= 14) buckets[2].value += 1;
            else if (d >= 7) buckets[1].value += 1;
            else buckets[0].value += 1;
        });
        return buckets;
    }, [alerts]);

    const typeSplit = useMemo(
        () => [
            { label: TYPES.overdue.label, value: stats.overdue, color: TYPES.overdue.hex },
            { label: TYPES.escrow_review.label, value: stats.escrow, color: TYPES.escrow_review.hex },
        ],
        [stats]
    );

    const openResolve = (alert) => {
        setActingAlert(alert);
        setResolveAction("");
        setNewDueDate("");
        setRefundAmount("");
        setReason("");
    };

    const closeResolve = useCallback(() => {
        setActingAlert(null);
        setResolveAction("");
    }, []);

    const maxRefund = Number(actingAlert?.paymentId?.amount || 0);

    const handleSubmitResolve = async () => {
        if (!actingAlert || !resolveAction) return;

        if (resolveAction === "extend" && !newDueDate) {
            toast.error("حدد تاريخ الاستحقاق الجديد");
            return;
        }
        if (resolveAction === "refund") {
            const amt = Number(refundAmount);
            if (!amt || amt <= 0) return toast.error("ادخل مبلغ استرجاع صحيح");
            if (maxRefund && amt > maxRefund) return toast.error(`المبلغ أكبر من الحد الأقصى (${formatMoney(maxRefund)})`);
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

    const actionCfg = ACTIONS[resolveAction];
    const actingType = actingAlert ? TYPES[actingAlert.type] || TYPES.overdue : null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-[#004d59] to-[#003841] p-5 sm:p-6">
                <div
                    className="absolute -left-10 -top-10 w-40 h-40 rounded-full bg-[#feaf00]/10 blur-2xl"
                    aria-hidden="true"
                />
                <div className="relative flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center shadow-lg shrink-0 ring-1 ring-white/10">
                        <AlertTriangle className="w-6 h-6 text-[#feaf00]" />
                    </div>
                    <div>
                        <h1 className="!text-2xl !leading-snug font-bold text-white">تنبيهات الفوترة</h1>
                        <p className="text-sm mt-0.5 text-white/70">
                            فواتير متأخرة السداد، ومراجعات إسكرو محتاجة قرار: احتساب الفلوس ولا استرجاعها.
                        </p>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="inline-flex p-1 rounded-xl bg-gray-100 dark:bg-dark_input" role="tablist">
                    {[
                        { id: "open", label: "قيد المراجعة" },
                        { id: "resolved", label: "تمت المعالجة" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            role="tab"
                            aria-selected={status === tab.id}
                            onClick={() => setStatus(tab.id)}
                            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${focusRing} ${
                                status === tab.id
                                    ? "bg-white dark:bg-darklight text-[#004d59] dark:text-white shadow-sm"
                                    : "text-gray-500 dark:text-darkmuted hover:text-gray-800 dark:hover:text-white"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex gap-1.5">
                    {[
                        { id: "all", label: "الكل" },
                        { id: "overdue", label: "متأخرة" },
                        { id: "escrow_review", label: "إسكرو" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setTypeFilter(tab.id)}
                            aria-pressed={typeFilter === tab.id}
                            className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors ${focusRing} ${
                                typeFilter === tab.id
                                    ? "border-[#004d59] bg-[#004d59] text-white dark:border-white dark:bg-white dark:text-gray-900"
                                    : "border-gray-300 dark:border-dark_border text-gray-600 dark:text-darkmuted hover:bg-gray-50 dark:hover:bg-darkhover"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Overview: KPI cards + charts */}
            {!loading && status === "open" && alerts.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* KPI stack */}
                    <div className="grid grid-cols-2 gap-4 lg:col-span-1">
                        <KpiCard icon={Inbox} label="تنبيهات مفتوحة" value={stats.total} tone="bg-gray-900/5 dark:bg-white/5 text-gray-900 dark:text-white" />
                        <KpiCard icon={CalendarClock} label="فواتير متأخرة" value={stats.overdue} tone="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400" />
                        <KpiCard icon={Landmark} label="مراجعات إسكرو" value={stats.escrow} tone="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" />
                        <KpiCard icon={Wallet} label="المبالغ المعنية" value={stats.amount.toLocaleString("en-US")} unit="EGP" tone="bg-[#feaf00]/10 text-[#946600] dark:text-[#feaf00]" />
                    </div>

                    {/* Donut: type split */}
                    <div className="rounded-2xl border border-gray-200 dark:border-dark_border bg-white dark:bg-darklight p-5 flex flex-col">
                        <div className="flex items-center gap-2 mb-4">
                            <PieChart className="w-4 h-4 text-[#004d59] dark:text-white/70" />
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">توزيع نوع التنبيهات</h3>
                        </div>
                        <div className="flex-1 flex items-center">
                            <DonutChart data={typeSplit} />
                        </div>
                    </div>

                    {/* Histogram: age distribution */}
                    <div className="rounded-2xl border border-gray-200 dark:border-dark_border bg-white dark:bg-darklight p-5 flex flex-col">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="w-4 h-4 text-[#004d59] dark:text-white/70" />
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">توزيع مدة الانتظار</h3>
                        </div>
                        <div className="flex-1 flex items-center">
                            <AgeHistogram buckets={ageBuckets} />
                        </div>
                    </div>
                </div>
            )}

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            ) : alerts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 dark:border-dark_border p-14 text-center">
                    <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-[#004d59] dark:text-white mb-1">
                        {status === "open" ? "مفيش تنبيهات قيد المراجعة" : "مفيش تنبيهات متعالجة لسه"}
                    </h3>
                    <p className={`text-sm ${muted}`}>
                        {status === "open"
                            ? "كل الفواتير والدفعات في وضع طبيعي دلوقتي."
                            : "لما تتخذ قرار على تنبيه، هيظهر هنا."}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {alerts.map((alert) => {
                        const cfg = TYPES[alert.type] || TYPES.overdue;
                        const Icon = cfg.icon;
                        const days = daysSince(alert.dueDateAtCreation);
                        const sev = severity(days);
                        const isOverdue = alert.type === "overdue";
                        const amount = isOverdue ? alert.invoiceId?.totalAmount : alert.paymentId?.amount;
                        const open = alert.status === "open";
                        const name = alert.studentId?.personalInfo?.fullName || "طالب";

                        return (
                            <article
                                key={alert._id}
                                className="relative grid gap-3 md:gap-6 md:grid-cols-[auto_minmax(0,1.5fr)_7.5rem_10rem_auto] items-center rounded-2xl border border-gray-200 dark:border-dark_border bg-white dark:bg-darklight pr-6 pl-5 py-4 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                            >
                                {open && <span className={`absolute top-0 bottom-0 right-0 w-1 ${sev.rail}`} aria-hidden="true" />}

                                {/* Avatar */}
                                <div
                                    className="hidden md:flex w-10 h-10 rounded-full items-center justify-center text-xs font-bold text-white shrink-0"
                                    style={{ backgroundColor: cfg.hex }}
                                >
                                    {initials(name)}
                                </div>

                                {/* الطالب + النوع */}
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-bold text-gray-900 dark:text-white truncate">{name}</p>
                                        <span className={`text-xs ${muted}`} dir="ltr">
                                            {alert.studentId?.enrollmentNumber}
                                        </span>
                                    </div>
                                    <div className="mt-1.5 flex items-start gap-2">
                                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md flex-shrink-0 ${cfg.badge}`}>
                                            <Icon className="w-3 h-3" />
                                            {cfg.label}
                                        </span>
                                        <p className={`text-xs leading-relaxed ${muted}`}>
                                            {isOverdue
                                                ? `الاستحقاق كان ${formatDate(alert.dueDateAtCreation)}`
                                                : `دفعة من فاتورة ${formatMoney(alert.invoiceId?.totalAmount)} — انتهت فترة الإسكرو ${formatDate(alert.dueDateAtCreation)}`}
                                        </p>
                                    </div>
                                </div>

                                {/* المبلغ */}
                                <div className="md:text-left" dir="ltr">
                                    <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums leading-none">
                                        {Number(amount || 0).toLocaleString("en-US")}
                                    </p>
                                    <p className={`text-[11px] mt-1 ${muted}`}>{isOverdue ? "EGP • فاتورة" : "EGP • دفعة"}</p>
                                </div>

                                {/* العمر / النتيجة */}
                                {open ? (
                                    <div>
                                        <div className="flex items-baseline justify-between text-xs mb-1.5">
                                            <span className={`font-bold ${sev.text}`}>منذ {days} يوم</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${sev.bar} transition-all duration-500`}
                                                style={{ width: `${Math.min((days / 30) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <span className="text-xs px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-500/15 text-green-700 dark:text-green-300 font-medium inline-flex items-center gap-1">
                                            <BadgeCheck className="w-3.5 h-3.5" />
                                            {RESOLUTION_LABEL[alert.resolution?.action] || "تمت المعالجة"}
                                        </span>
                                        <p className={`text-[11px] mt-1 ${muted}`}>{formatDate(alert.resolution?.actedAt)}</p>
                                    </div>
                                )}

                                {/* إجراء */}
                                <div className="md:justify-self-end">
                                    {open && (
                                        <button
                                            onClick={() => openResolve(alert)}
                                            className={`w-full md:w-auto px-4 py-2 text-sm font-semibold rounded-lg bg-[#004d59] text-white hover:bg-[#003b45] dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 inline-flex items-center justify-center gap-1.5 transition-colors ${focusRing}`}
                                        >
                                            <Scale className="w-4 h-4" />
                                            اتخاذ قرار
                                        </button>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {/* Decision drawer */}
            <AdminDrawer
                isOpen={!!actingAlert}
                onClose={closeResolve}
                locked={submitting}
                title="اتخاذ قرار"
                subtitle={actingAlert ? actingAlert.studentId?.personalInfo?.fullName || "طالب" : ""}
                icon={Scale}
                iconClassName="bg-[#004d59] text-[#feaf00]"
                footer={
                    <div className="flex gap-3">
                        <button
                            onClick={closeResolve}
                            disabled={submitting}
                            className={`px-5 py-2.5 text-sm font-medium border border-gray-300 dark:border-dark_border rounded-lg text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-darkhover disabled:opacity-50 ${focusRing}`}
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={handleSubmitResolve}
                            disabled={submitting || !resolveAction}
                            className={`flex-1 text-white px-4 py-2.5 text-sm rounded-lg font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors ${actionCfg?.confirm || "bg-gray-400"} ${focusRing}`}
                        >
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {submitting ? "جارِ التنفيذ..." : actionCfg?.confirmLabel || "اختار قرار الأول"}
                        </button>
                    </div>
                }
            >
                {actingAlert && (
                    <>
                        {/* سياق التنبيه */}
                        <div className="rounded-xl border border-gray-200 dark:border-dark_border bg-gray-50 dark:bg-darkmode/40 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${actingType.badge}`}>
                                    <actingType.icon className="w-3 h-3" />
                                    {actingType.label}
                                </span>
                                <span className={`text-xs ${muted}`} dir="ltr">
                                    {actingAlert.studentId?.enrollmentNumber}
                                </span>
                            </div>
                            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <dt className={`text-xs ${muted}`}>{actingAlert.type === "overdue" ? "قيمة الفاتورة" : "قيمة الدفعة"}</dt>
                                    <dd className="font-bold text-gray-900 dark:text-white tabular-nums">
                                        {formatMoney(actingAlert.type === "overdue" ? actingAlert.invoiceId?.totalAmount : actingAlert.paymentId?.amount)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className={`text-xs ${muted}`}>{actingAlert.type === "overdue" ? "تاريخ الاستحقاق" : "انتهاء الإسكرو"}</dt>
                                    <dd className="font-bold text-gray-900 dark:text-white">{formatDate(actingAlert.dueDateAtCreation)}</dd>
                                </div>
                            </dl>
                        </div>

                        {/* اختيار القرار */}
                        <fieldset>
                            <legend className="text-sm font-bold text-gray-900 dark:text-white mb-2.5">القرار</legend>
                            <div className="space-y-2.5" role="radiogroup">
                                {actingType.actions.map((key) => {
                                    const a = ACTIONS[key];
                                    const AIcon = a.icon;
                                    const on = resolveAction === key;
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            role="radio"
                                            aria-checked={on}
                                            onClick={() => setResolveAction(key)}
                                            className={`w-full text-right flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${focusRing} ${
                                                on
                                                    ? a.selected
                                                    : "border-gray-200 dark:border-dark_border hover:bg-gray-50 dark:hover:bg-darkhover"
                                            }`}
                                        >
                                            <span
                                                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                                    on ? `${a.dot} border-transparent` : "border-gray-300 dark:border-gray-600"
                                                }`}
                                            >
                                                {on && <Check className="w-3 h-3 text-white" strokeWidth={3.5} />}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="flex items-center gap-1.5 font-semibold text-sm text-gray-900 dark:text-white">
                                                    <AIcon className="w-4 h-4" />
                                                    {a.title}
                                                </span>
                                                <span className={`block text-xs mt-1 leading-relaxed ${muted}`}>{a.desc}</span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </fieldset>

                        {/* حقول مشروطة */}
                        {resolveAction === "extend" && (
                            <div>
                                <label className={labelCls}>
                                    تاريخ الاستحقاق الجديد <span className="text-red-500">*</span>
                                </label>
                                <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className={inputCls} />
                            </div>
                        )}

                        {resolveAction === "refund" && (
                            <div>
                                <label className={labelCls}>
                                    المبلغ المسترجع (EGP) <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        max={maxRefund || undefined}
                                        value={refundAmount}
                                        onChange={(e) => setRefundAmount(e.target.value)}
                                        className={inputCls}
                                    />
                                    {maxRefund > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setRefundAmount(String(maxRefund))}
                                            className={`px-3 text-xs font-semibold rounded-lg border border-gray-300 dark:border-dark_border text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-darkhover whitespace-nowrap ${focusRing}`}
                                        >
                                            المبلغ كامل
                                        </button>
                                    )}
                                </div>
                                <p className={`text-[11px] mt-1 ${muted}`}>الحد الأقصى: {formatMoney(maxRefund)}</p>
                            </div>
                        )}

                        <div>
                            <label className={labelCls}>ملاحظة (اختياري)</label>
                            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={`${inputCls} resize-none`} />
                        </div>
                    </>
                )}
            </AdminDrawer>
        </div>
    );
}

function KpiCard({ icon: Icon, label, value, unit, tone }) {
    return (
        <div className="rounded-2xl border border-gray-200 dark:border-dark_border bg-white dark:bg-darklight p-4 flex flex-col gap-3">
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${tone}`}>
                <Icon className="w-4.5 h-4.5" />
            </span>
            <div>
                <p className={`text-xs ${muted}`}>{label}</p>
                <p className="mt-0.5 text-xl font-black tabular-nums leading-none text-gray-900 dark:text-white">
                    {value}
                    {unit && <span className={`text-xs font-medium mr-1 ${muted}`}>{unit}</span>}
                </p>
            </div>
        </div>
    );
}