"use client";
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
    Award,
    CheckCircle2,
    XCircle,
    Clock,
    Phone,
    PhoneOff,
    Users,
    RefreshCw,
    Wand2,
    Loader2,
    X,
    ImageOff,
    Maximize2,
    ZoomIn,
    ZoomOut,
    RotateCcw,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

// ─── Types ──────────────────────────────────────────────────────────────────
interface RecipientStatus {
    phone: string | null;
    delivered: boolean;
    deliveredAt?: string | null;
    pendingReason: "no_student_phone" | "no_guardian_phone" | "send_failed_or_pending" | null;
}

interface CertRow {
    studentId: string;
    studentName: string;
    studentGender: string;
    groupId: string;
    groupName: string;
    courseId: string;
    courseTitle: string;
    moduleId: string;
    moduleIndex: number;
    moduleTitle: string;
    imageUrl?: string;
    issuedAt?: string;
    student: RecipientStatus;
    guardian: RecipientStatus;
}

interface Summary {
    totalCertificateRecords: number;
    fullyDelivered: number;
    partiallyDelivered: number;
    pendingNoPhone: number;
    notGeneratedCount: number;
}

const BACKGROUND_OPTIONS = [
    { value: "navy-orange", label: "Navy / Orange" },
    { value: "blue-orange", label: "Blue / Orange" },
    { value: "gold-teal", label: "Gold / Teal" },
    { value: "orange-teal", label: "Orange / Teal" },
    { value: "teal-gold", label: "Teal / Gold" },
    { value: "navy-gold", label: "Navy / Gold" },
];

const reasonLabel: Record<string, string> = {
    no_student_phone: "مفيش رقم واتساب للطالب",
    no_guardian_phone: "مفيش رقم واتساب لولي الأمر",
    send_failed_or_pending: "فيه رقم بس الإرسال متأخر/فشل",
};

export default function CertificatesAdmin() {
    const { t } = useI18n();

    const [issued, setIssued] = useState<CertRow[]>([]);
    const [notGenerated, setNotGenerated] = useState<CertRow[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"issued" | "pending">("issued");
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [zoomScale, setZoomScale] = useState(1);

    const openLightbox = (url: string) => {
        setZoomScale(1);
        setLightboxUrl(url);
    };
    const closeLightbox = () => {
        setLightboxUrl(null);
        setZoomScale(1);
    };
    const zoomIn = () => setZoomScale((z) => Math.min(3, +(z + 0.5).toFixed(2)));
    const zoomOut = () => setZoomScale((z) => Math.max(1, +(z - 0.5).toFixed(2)));
    const resetZoom = () => setZoomScale(1);

    // ── Test / preview panel state ──────────────────────────────────────────
    const [testForm, setTestForm] = useState({
        studentName: "Youssef Mourad",
        moduleTitle: "Grade 5-6 Module 1 Chatbot Dev 1",
        signatureName: "Aya Elnagar",
        background: "navy-orange",
        achievements:
            "Define the concept of a chatbot and recognize its role in various applications\nExplain the fundamentals of algorithms and their significance in chatbot dev\nPython syntax, including variables, data types, and control structures",
    });
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/certificates", { cache: "no-store" });
            const json = await res.json();
            if (json.success) {
                setIssued(json.data.issued || []);
                setNotGenerated(json.data.notGenerated || []);
                setSummary(json.summary || null);
            } else {
                toast.error(json.error || "فشل تحميل بيانات الشهادات");
            }
        } catch (err) {
            console.error("Error loading certificates:", err);
            toast.error("حدث خطأ أثناء تحميل بيانات الشهادات");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const pendingRows = useMemo(
        () => [
            ...issued.filter((r) => !r.student.delivered || !r.guardian.delivered),
            ...notGenerated,
        ],
        [issued, notGenerated]
    );

    const generatePreview = async () => {
        setPreviewLoading(true);
        setPreviewUrl(null);
        try {
            const res = await fetch("/api/admin/certificates/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(testForm),
            });
            const json = await res.json();
            if (json.success) {
                setPreviewUrl(json.imageUrl);
            } else {
                toast.error(json.error || "فشل توليد الشهادة التجريبية");
            }
        } catch (err) {
            console.error("Error generating preview:", err);
            toast.error("حدث خطأ أثناء توليد الشهادة التجريبية");
        } finally {
            setPreviewLoading(false);
        }
    };

    const onTestChange = (field: string, value: string) =>
        setTestForm((prev) => ({ ...prev, [field]: value }));

    if (loading) {
        return (
            <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-darkmode rounded-xl shadow-sm p-6 border border-PowderBlueBorder dark:border-dark_border">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold text-MidnightNavyText dark:text-white flex items-center gap-3">
                            <Award className="w-7 h-7 text-primary" />
                            {t("certificates.management") || "إدارة الشهادات"}
                        </h1>
                        <p className="text-sm text-SlateBlueText dark:text-darktext max-w-2xl">
                            {t("certificates.managementDescription") ||
                                "متابعة الشهادات اللي اتبعتت للطلبة وأولياء الأمور، ومين لسه معلق بسبب عدم توفر رقم واتساب."}
                        </p>
                    </div>
                    <button
                        onClick={loadData}
                        className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        {t("common.refresh") || "تحديث"}
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    icon={<Award className="w-5 h-5 text-primary" />}
                    iconBg="bg-primary/10"
                    label="إجمالي سجلات الشهادات"
                    value={summary?.totalCertificateRecords ?? 0}
                />
                <StatCard
                    icon={<CheckCircle2 className="w-5 h-5 text-Aquamarine" />}
                    iconBg="bg-Aquamarine/10"
                    label="اتبعتت كاملة (طالب + ولي أمر)"
                    value={summary?.fullyDelivered ?? 0}
                />
                <StatCard
                    icon={<Clock className="w-5 h-5 text-LightYellow" />}
                    iconBg="bg-LightYellow/10"
                    label="اتبعتت جزئياً"
                    value={summary?.partiallyDelivered ?? 0}
                />
                <StatCard
                    icon={<PhoneOff className="w-5 h-5 text-red-500" />}
                    iconBg="bg-red-500/10"
                    label="معلقة (مفيش رقم)"
                    value={(summary?.pendingNoPhone ?? 0) + (summary?.notGeneratedCount ?? 0)}
                />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-PowderBlueBorder dark:border-dark_border">
                <TabButton active={tab === "issued"} onClick={() => setTab("issued")}>
                    <Award className="w-4 h-4" /> الشهادات الصادرة ({issued.length})
                </TabButton>
                <TabButton active={tab === "pending"} onClick={() => setTab("pending")}>
                    <PhoneOff className="w-4 h-4" /> معلقة بسبب رقم التلفون ({pendingRows.length})
                </TabButton>
            </div>

            {/* Issued tab */}
            {tab === "issued" && (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {issued.map((row) => (
                        <CertCard key={`${row.studentId}-${row.moduleId}`} row={row} onOpenImage={openLightbox} />
                    ))}
                    {issued.length === 0 && (
                        <EmptyState text="لسه مفيش أي شهادة اتولدت أو اتبعتت." />
                    )}
                </div>
            )}

            {/* Pending tab */}
            {tab === "pending" && (
                <div className="bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border overflow-hidden">
                    {pendingRows.length === 0 ? (
                        <EmptyState text="كل الشهادات المستحقة اتبعتت بنجاح 🎉" />
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-IcyBreeze dark:bg-dark_input text-MidnightNavyText dark:text-white">
                                <tr>
                                    <th className="text-right p-3">الطالب</th>
                                    <th className="text-right p-3">الكورس / الموديول</th>
                                    <th className="text-right p-3">الجروب</th>
                                    <th className="text-right p-3">الطالب (واتساب)</th>
                                    <th className="text-right p-3">ولي الأمر (واتساب)</th>
                                    <th className="text-right p-3">الشهادة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-PowderBlueBorder dark:divide-dark_border">
                                {pendingRows.map((row) => (
                                    <tr key={`${row.studentId}-${row.moduleId}`}>
                                        <td className="p-3 font-medium text-MidnightNavyText dark:text-white">
                                            {row.studentName}
                                        </td>
                                        <td className="p-3 text-SlateBlueText dark:text-darktext">
                                            {row.courseTitle} — {row.moduleTitle}
                                        </td>
                                        <td className="p-3 text-SlateBlueText dark:text-darktext">{row.groupName}</td>
                                        <td className="p-3">
                                            <RecipientBadge status={row.student} />
                                        </td>
                                        <td className="p-3">
                                            <RecipientBadge status={row.guardian} />
                                        </td>
                                        <td className="p-3">
                                            {row.imageUrl ? (
                                                <button
                                                    type="button"
                                                    onClick={() => openLightbox(row.imageUrl!)}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-12 font-semibold hover:bg-primary/20 transition-colors"
                                                >
                                                    <Maximize2 className="w-3.5 h-3.5" /> تكبير
                                                </button>
                                            ) : (
                                                <span className="text-11 text-SlateBlueText dark:text-darktext">
                                                    لسه معملتش
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* ── Test / Preview certificate design ── */}
            <div className="bg-white dark:bg-darkmode rounded-xl p-6 border border-PowderBlueBorder dark:border-dark_border shadow-sm space-y-5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-ElectricAqua/10 rounded-lg flex items-center justify-center">
                        <Wand2 className="w-4 h-4 text-ElectricAqua" />
                    </div>
                    <div>
                        <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
                            تجربة شكل الشهادة (Test)
                        </h3>
                        <p className="text-12 text-SlateBlueText dark:text-darktext">
                            معاينة تصميم الشهادة ببيانات تجريبية قبل استخدامها فعلياً
                        </p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <TestField label="اسم الطالب">
                            <input
                                type="text"
                                value={testForm.studentName}
                                onChange={(e) => onTestChange("studentName", e.target.value)}
                                className={inputCls}
                            />
                        </TestField>
                        <TestField label="اسم الموديول">
                            <input
                                type="text"
                                value={testForm.moduleTitle}
                                onChange={(e) => onTestChange("moduleTitle", e.target.value)}
                                className={inputCls}
                            />
                        </TestField>
                        <TestField label="اسم الموقّع">
                            <input
                                type="text"
                                value={testForm.signatureName}
                                onChange={(e) => onTestChange("signatureName", e.target.value)}
                                className={inputCls}
                            />
                        </TestField>
                        <TestField label="خلفية الشهادة">
                            <select
                                value={testForm.background}
                                onChange={(e) => onTestChange("background", e.target.value)}
                                className={inputCls}
                            >
                                {BACKGROUND_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </TestField>
                        <TestField label="الإنجازات (سطر لكل عنصر)">
                            <textarea
                                rows={4}
                                value={testForm.achievements}
                                onChange={(e) => onTestChange("achievements", e.target.value)}
                                className={`${inputCls} resize-none`}
                            />
                        </TestField>

                        <button
                            onClick={generatePreview}
                            disabled={previewLoading}
                            className="w-full bg-primary hover:bg-primary/90 text-white py-2.5 px-4 rounded-lg font-semibold text-13 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {previewLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> جاري التوليد...
                                </>
                            ) : (
                                <>
                                    <Wand2 className="w-4 h-4" /> توليد شهادة تجريبية
                                </>
                            )}
                        </button>
                    </div>

                    {/* preview */}
                    <div className="flex items-center justify-center bg-IcyBreeze dark:bg-dark_input rounded-lg border border-dashed border-PowderBlueBorder dark:border-dark_border min-h-[280px] p-3">
                        {previewLoading ? (
                            <div className="flex flex-col items-center gap-2 text-SlateBlueText dark:text-darktext">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span className="text-12">جاري توليد الصورة...</span>
                            </div>
                        ) : previewUrl ? (
                            <div className="relative group w-full flex items-center justify-center">
                                <img
                                    src={previewUrl}
                                    alt="Certificate preview"
                                    className="max-w-full max-h-[420px] rounded-lg shadow-md cursor-zoom-in"
                                    onClick={() => openLightbox(previewUrl)}
                                />
                                <button
                                    type="button"
                                    onClick={() => openLightbox(previewUrl)}
                                    className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 text-white text-12 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/80"
                                >
                                    <Maximize2 className="w-3.5 h-3.5" /> تكبير
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-SlateBlueText dark:text-darktext">
                                <ImageOff className="w-8 h-8" />
                                <span className="text-12">هتظهر المعاينة هنا بعد التوليد</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Lightbox */}
            {lightboxUrl && (
                <div
                    className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-6 overflow-auto"
                    onClick={closeLightbox}
                >
                    {/* Controls */}
                    <div
                        className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 rounded-full px-2 py-1.5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={zoomOut}
                            disabled={zoomScale <= 1}
                            className="text-white p-2 rounded-full hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="تصغير"
                        >
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="text-white text-12 font-medium w-12 text-center select-none">
                            {Math.round(zoomScale * 100)}%
                        </span>
                        <button
                            onClick={zoomIn}
                            disabled={zoomScale >= 3}
                            className="text-white p-2 rounded-full hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="تكبير"
                        >
                            <ZoomIn className="w-4 h-4" />
                        </button>
                        <button
                            onClick={resetZoom}
                            disabled={zoomScale === 1}
                            className="text-white p-2 rounded-full hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="إعادة الضبط"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        className="absolute top-6 right-6 text-white bg-white/10 hover:bg-white/20 rounded-full p-2"
                        onClick={closeLightbox}
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <img
                        src={lightboxUrl}
                        alt="Certificate"
                        className="rounded-lg shadow-2xl transition-transform duration-200 select-none"
                        style={{
                            maxWidth: zoomScale === 1 ? "100%" : "none",
                            maxHeight: zoomScale === 1 ? "100%" : "none",
                            transform: `scale(${zoomScale})`,
                            cursor: zoomScale < 3 ? "zoom-in" : "zoom-out",
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setZoomScale((z) => (z >= 3 ? 1 : +(z + 0.5).toFixed(2)));
                        }}
                    />
                </div>
            )}
        </div>
    );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCard({
    icon,
    iconBg,
    label,
    value,
}: {
    icon: React.ReactNode;
    iconBg: string;
    label: string;
    value: number;
}) {
    return (
        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                        {label}
                    </p>
                    <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">{value}</p>
                </div>
                <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

function TabButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2.5 text-13 font-semibold border-b-2 transition-all duration-200 ${active
                    ? "border-primary text-primary"
                    : "border-transparent text-SlateBlueText dark:text-darktext hover:text-primary"
                }`}
        >
            {children}
        </button>
    );
}

function RecipientBadge({ status }: { status: RecipientStatus }) {
    if (status.delivered) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-Aquamarine/20 text-Salem">
                <CheckCircle2 className="w-3 h-3" /> اتبعتت
            </span>
        );
    }

    if (!status.phone) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30">
                <PhoneOff className="w-3 h-3" /> {reasonLabel[status.pendingReason || "no_student_phone"]}
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-LightYellow/20 text-amber-700">
            <Clock className="w-3 h-3" /> {reasonLabel[status.pendingReason || "send_failed_or_pending"]}
        </span>
    );
}

function CertCard({
    row,
    onOpenImage,
}: {
    row: CertRow;
    onOpenImage: (url: string) => void;
}) {
    return (
        <div className="rounded-xl border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-darkmode overflow-hidden hover:shadow-md transition-all duration-300">
            <div
                className="relative group h-44 bg-gray-100 dark:bg-dark_input overflow-hidden cursor-zoom-in flex items-center justify-center"
                onClick={() => row.imageUrl && onOpenImage(row.imageUrl)}
            >
                {row.imageUrl ? (
                    <>
                        <img src={row.imageUrl} alt={row.studentName} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenImage(row.imageUrl!);
                                }}
                                className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 text-MidnightNavyText text-12 font-semibold shadow-md transition-opacity duration-200 hover:bg-white"
                            >
                                <Maximize2 className="w-3.5 h-3.5" /> تكبير الشهادة
                            </button>
                        </div>
                    </>
                ) : (
                    <ImageOff className="w-8 h-8 text-SlateBlueText dark:text-darktext" />
                )}
            </div>
            <div className="p-4 space-y-3">
                <div>
                    <h3 className="text-15 font-bold text-MidnightNavyText dark:text-white">
                        {row.studentName}
                    </h3>
                    <p className="text-12 text-SlateBlueText dark:text-darktext">
                        {row.courseTitle} — {row.moduleTitle}
                    </p>
                    <p className="text-11 text-SlateBlueText dark:text-darktext">{row.groupName}</p>
                </div>

                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-12">
                        <span className="flex items-center gap-1 text-SlateBlueText dark:text-darktext">
                            <Users className="w-3 h-3" /> الطالب
                        </span>
                        <RecipientBadge status={row.student} />
                    </div>
                    <div className="flex items-center justify-between text-12">
                        <span className="flex items-center gap-1 text-SlateBlueText dark:text-darktext">
                            <Phone className="w-3 h-3" /> ولي الأمر
                        </span>
                        <RecipientBadge status={row.guardian} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function TestField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                {label}
            </label>
            {children}
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="col-span-full text-center py-16">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm text-SlateBlueText dark:text-darktext">{text}</p>
        </div>
    );
}

const inputCls =
    "w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200";