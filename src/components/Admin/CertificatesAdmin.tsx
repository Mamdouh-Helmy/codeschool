"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
    ImagePlus,
    Maximize2,
    Minimize2,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Image as ImageIcon,
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

interface CertificateAssets {
    badge?: string | null;
    logo?: string | null;
    stem?: string | null;
    iAIDL?: string | null;
    finland?: string | null;
    kidsafe?: string | null;
}

interface DesignForm {
    studentName: string;
    moduleTitle: string;
    signatureName: string;
    background: string;
    achievements: string;
}

const BACKGROUND_OPTIONS = [
    { value: "navy-orange", label: "Navy / Orange" },
    { value: "blue-orange", label: "Blue / Orange" },
    { value: "gold-teal", label: "Gold / Teal" },
    { value: "orange-teal", label: "Orange / Teal" },
    { value: "teal-gold", label: "Teal / Gold" },
    { value: "navy-gold", label: "Navy / Gold" },
];

// ✅ الصور والشعارات الثابتة القابلة للتخصيص من الأدمن. defaultSrc بيتعرض
// كمعاينة لو مفيش صورة مخصصة اترفعت لسه (نفس الصورة اللي certificateHtml.js
// بيستخدمها كـ fallback).
const ASSET_FIELDS = [
    { key: "badge", label: "الشارة (Badge)", defaultSrc: "/images/badge.png" },
    { key: "logo", label: "لوجو المدرسة", defaultSrc: "/images/code-logo.png" },
    { key: "stem", label: "شعار STEM", defaultSrc: "/images/stem.png" },
    { key: "iAIDL", label: "شعار iAIDL", defaultSrc: "/images/iAIDL.png" },
    { key: "finland", label: "شعار Finland", defaultSrc: "/images/finland.png" },
    { key: "kidsafe", label: "شعار KidSafe", defaultSrc: "/images/kidsafe.png" },
];

const reasonLabel: Record<string, string> = {
    no_student_phone: "مفيش رقم واتساب للطالب",
    no_guardian_phone: "مفيش رقم واتساب لولي الأمر",
    send_failed_or_pending: "فيه رقم بس الإرسال متأخر/فشل",
};

// ✅ عرض تصميم الشهادة الثابت (نفس viewport بتاع Puppeteer في certificateHtml.js)
const CERT_DESIGN_WIDTH = 1200;
// ✅ ارتفاع افتراضي بس لأول مرة قبل ما نقيس الارتفاع الحقيقي من الـ iframe.
// ✅ مقصود إنه أكبر من الارتفاع الطبيعي المتوقع (مش مطابق بالظبط) — لأن
// لو الافتراض أصغر من الحقيقي، المحتوى بيتقص فورًا في أول رندر قبل ما
// القياس الحقيقي يوصل؛ لو الافتراض أكبر، أسوأ حاجة ممكن تحصل إن الشهادة
// تبان أصغر شوية من المفروض مؤقتًا (مساحة فاضية)، مش قص.
const CERT_DESIGN_FALLBACK_HEIGHT = 1400;

// ✅ ثوابت الزوم مشتركة بين الـ Lightbox ومعاينة الشهادة المكبّرة، عشان
// سلوك التكبير يبقى متسق في كل الملف
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.5;

export default function CertificatesAdmin() {
    const { t } = useI18n();

    const [issued, setIssued] = useState<CertRow[]>([]);
    const [notGenerated, setNotGenerated] = useState<CertRow[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"issued" | "pending">("issued");
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [zoomScale, setZoomScale] = useState(1);

    // ── Certificate design modal (live preview + assets editing) ───────────
    const [designModalOpen, setDesignModalOpen] = useState(false);

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

    const openLightbox = (url: string) => {
        setZoomScale(1);
        setLightboxUrl(url);
    };
    const closeLightbox = () => {
        setLightboxUrl(null);
        setZoomScale(1);
    };
    const zoomIn = () => setZoomScale((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
    const zoomOut = () => setZoomScale((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)));
    const resetZoom = () => setZoomScale(1);

    // ✅ Esc تقفل الـ Lightbox برضه، عشان السلوك يبقى متسق مع مودال التصميم
    useEffect(() => {
        if (!lightboxUrl) return;
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") closeLightbox();
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lightboxUrl]);

    const pendingRows = useMemo(
        () => [
            ...issued.filter((r) => !r.student.delivered || !r.guardian.delivered),
            ...notGenerated,
        ],
        [issued, notGenerated]
    );

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
                    <div className="flex items-start gap-3">
                        <div className="w-11 h-11 shrink-0 bg-primary/10 rounded-xl flex items-center justify-center">
                            <Award className="w-6 h-6 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold text-MidnightNavyText dark:text-white">
                                {t("certificates.management") || "إدارة الشهادات"}
                            </h1>
                            <p className="text-sm text-SlateBlueText dark:text-darktext max-w-2xl">
                                {t("certificates.managementDescription") ||
                                    "متابعة الشهادات اللي اتبعتت للطلبة وأولياء الأمور، ومين لسه معلق بسبب عدم توفر رقم واتساب."}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => setDesignModalOpen(true)}
                            className="bg-ElectricAqua hover:bg-ElectricAqua/90 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
                        >
                            <Wand2 className="w-4 h-4" />
                            تصميم الشهادة
                        </button>
                        <button
                            onClick={loadData}
                            className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            {t("common.refresh") || "تحديث"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    icon={<Award className="w-5 h-5 text-primary" />}
                    iconBg="bg-primary/10"
                    accent="bg-primary"
                    label="إجمالي سجلات الشهادات"
                    value={summary?.totalCertificateRecords ?? 0}
                />
                <StatCard
                    icon={<CheckCircle2 className="w-5 h-5 text-Aquamarine" />}
                    iconBg="bg-Aquamarine/10"
                    accent="bg-Aquamarine"
                    label="اتبعتت كاملة (طالب + ولي أمر)"
                    value={summary?.fullyDelivered ?? 0}
                />
                <StatCard
                    icon={<Clock className="w-5 h-5 text-LightYellow" />}
                    iconBg="bg-LightYellow/10"
                    accent="bg-LightYellow"
                    label="اتبعتت جزئياً"
                    value={summary?.partiallyDelivered ?? 0}
                />
                <StatCard
                    icon={<PhoneOff className="w-5 h-5 text-red-500" />}
                    iconBg="bg-red-500/10"
                    accent="bg-red-500"
                    label="معلقة (مفيش رقم)"
                    value={(summary?.pendingNoPhone ?? 0) + (summary?.notGeneratedCount ?? 0)}
                />
            </div>

            {/* Tabs */}
            <div className="inline-flex items-center gap-1 bg-IcyBreeze dark:bg-dark_input rounded-xl p-1">
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
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 z-10 bg-IcyBreeze dark:bg-dark_input text-MidnightNavyText dark:text-white">
                                    <tr>
                                        <th className="text-right p-3 font-semibold">الطالب</th>
                                        <th className="text-right p-3 font-semibold">الكورس / الموديول</th>
                                        <th className="text-right p-3 font-semibold">الجروب</th>
                                        <th className="text-right p-3 font-semibold">الطالب (واتساب)</th>
                                        <th className="text-right p-3 font-semibold">ولي الأمر (واتساب)</th>
                                        <th className="text-right p-3 font-semibold">الشهادة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-PowderBlueBorder dark:divide-dark_border">
                                    {pendingRows.map((row) => (
                                        <tr
                                            key={`${row.studentId}-${row.moduleId}`}
                                            className="hover:bg-IcyBreeze/60 dark:hover:bg-dark_input/60 transition-colors"
                                        >
                                            <td className="p-3">
                                                <div className="flex items-center gap-2.5">
                                                    <InitialsAvatar name={row.studentName} />
                                                    <span className="font-medium text-MidnightNavyText dark:text-white">
                                                        {row.studentName}
                                                    </span>
                                                </div>
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
                        </div>
                    )}
                </div>
            )}

            {/* Certificate design modal: live preview (iframe, no puppeteer) + assets editing */}
            {designModalOpen && (
                <CertificateDesignModal onClose={() => setDesignModalOpen(false)} />
            )}

            {/* Lightbox */}
            {lightboxUrl && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-[2px] z-[9999] flex items-center justify-center p-6 overflow-auto"
                    onClick={closeLightbox}
                >
                    {/* Controls */}
                    <div
                        className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 rounded-full px-2 py-1.5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={zoomOut}
                            disabled={zoomScale <= MIN_ZOOM}
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
                            disabled={zoomScale >= MAX_ZOOM}
                            className="text-white p-2 rounded-full hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="تكبير"
                        >
                            <ZoomIn className="w-4 h-4" />
                        </button>
                        <button
                            onClick={resetZoom}
                            disabled={zoomScale === MIN_ZOOM}
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
                            cursor: zoomScale < MAX_ZOOM ? "zoom-in" : "zoom-out",
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setZoomScale((z) => (z >= MAX_ZOOM ? 1 : +(z + ZOOM_STEP).toFixed(2)));
                        }}
                    />
                </div>
            )}
        </div>
    );
}

// ─── Certificate Design Modal ───────────────────────────────────────────────
// ✅ المودال بيتركب عبر React Portal مباشرة في document.body، عشان الخلفية
//    السودة الشفافة تغطي الشاشة كاملة فعليًا من غير أي فراغ فوق أو تحت
//    (transform على عنصر أب بيكسر سلوك position:fixed لو المودال مش portal).
//  - زرار "ملء الشاشة" بيوسع المودال لأقصى مساحة ممكنة.
//  - عمود الفورم بيسكرول لوحده، عمود المعاينة منطقة ثابتة تعرض الشهادة
//    بأكبر حجم يسمح بيه المكان تلقائيًا (contain-fit)، من غير زوم يدوي معقد.
//  - زرار "تكبير" بيفتح المعاينة في شاشة كاملة مخصصة (CertificateZoomOverlay)
//    فيها نفس منطق الزوم البسيط بتاع الـ Lightbox (خطوات ثابتة + تمرير طبيعي
//    للتنقل)، بدل نظام السحب اليدوي القديم اللي كان صعب الاستخدام.
function CertificateDesignModal({ onClose }: { onClose: () => void }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoomOverlayOpen, setZoomOverlayOpen] = useState(false);

    const [form, setForm] = useState<DesignForm>({
        studentName: "Youssef Mourad",
        moduleTitle: "Grade 5-6 Module 1 Chatbot Dev 1",
        signatureName: "Aya Elnagar",
        background: "navy-orange",
        achievements:
            "Define the concept of a chatbot and recognize its role in various applications\nExplain the fundamentals of algorithms and their significance in chatbot dev\nPython syntax, including variables, data types, and control structures",
    });

    const [html, setHtml] = useState<string | null>(null);
    const [htmlLoading, setHtmlLoading] = useState(true);

    const [assets, setAssets] = useState<CertificateAssets | null>(null);
    const [assetUploading, setAssetUploading] = useState<string | null>(null);

    // ✅ حاوية منطقة المعاينة (المساحة المتاحة بالكامل، عرض وارتفاع)
    const previewAreaRef = useRef<HTMLDivElement>(null);
    // ✅ الارتفاع الحقيقي لمحتوى الشهادة (بيتقاس من جوه الـ iframe بعد التحميل)
    const [naturalHeight, setNaturalHeight] = useState(CERT_DESIGN_FALLBACK_HEIGHT);
    // ✅ نسبة العرض التلقائية (contain-fit) اللي بتوريك الشهادة كاملة جوه
    // مساحة المعاينة من غير قص ولا سكرول — بدون أي زوم يدوي هنا
    const [previewScale, setPreviewScale] = useState(0.4);
    const [availableSize, setAvailableSize] = useState({ width: 0, height: 0 });

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // ✅ بيراقب ارتفاع محتوى الـ iframe بشكل مستمر (مش قياس لحظي واحد)، عشان
    // نلحق أي زيادة في الارتفاع بسبب تحميل الخطوط/الصور بعد الـ load event
    const heightObserverRef = useRef<ResizeObserver | null>(null);
    // ✅ مجموعة تايمرات شبكة الأمان اللي بتعيد القياس على فترات متفرقة، عشان
    // نلحق أي صورة بطيئة التحميل (زي شعارات من CDN) حتى لو استغرقت ثواني
    const heightSafetyTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    // ✅ true فقط لما نكون متأكدين إن كل الصور والخطوط جوه الـ iframe خلصت
    // تحميل فعليًا — قبل كده منعرضش الشهادة عشان مايبانش شكل ناقص (لوجو
    // غايب، أو تاريخ/توقيع متقطع) زي ما كان بيحصل قبل الإصلاح ده
    const [previewSettled, setPreviewSettled] = useState(false);

    const fetchPreviewHtml = async (nextForm: DesignForm) => {
        setHtmlLoading(true);
        try {
            const res = await fetch("/api/admin/certificates/preview-html", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...nextForm, interactive: true }),
            });
            const json = await res.json();
            if (json.success) {
                setHtml(json.html);
            } else {
                toast.error(json.error || "فشل تحميل معاينة الشهادة");
            }
        } catch (err) {
            console.error("Error fetching certificate preview html:", err);
            toast.error("حدث خطأ أثناء تحميل المعاينة");
        } finally {
            setHtmlLoading(false);
        }
    };

    const loadAssets = async () => {
        try {
            const res = await fetch("/api/admin/certificate-assets", { cache: "no-store" });
            const json = await res.json();
            if (json.success) {
                setAssets(json.data);
            } else {
                toast.error(json.error || "فشل تحميل إعدادات الصور");
            }
        } catch (err) {
            console.error("Error loading certificate assets:", err);
            toast.error("حدث خطأ أثناء تحميل إعدادات الصور");
        }
    };

    // ✅ أول ما البوب يفتح: هات الصور المخصصة الحالية وهات أول معاينة، وامنع
    // سكرول الصفحة اللي ورا المودال (خلفية الصفحة) وهو مفتوح
    useEffect(() => {
        loadAssets();
        fetchPreviewHtml(form);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prevOverflow;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ✅ تنضيف الـ ResizeObserver وتايمرات شبكة الأمان لما الـ component يتفكك
    useEffect(() => {
        return () => {
            heightObserverRef.current?.disconnect();
            heightSafetyTimeoutsRef.current.forEach(clearTimeout);
        };
    }, []);

    // ✅ Debounce: أي تغيير في الفورم يعمل إعادة طلب للمعاينة بعد 450ms من
    // آخر تغيير، عشان منضربش الـ API مع كل حرف بيتكتب
    const onFieldChange = (field: keyof DesignForm, value: string) => {
        const next = { ...form, [field]: value };
        setForm(next);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchPreviewHtml(next);
        }, 450);
    };

    // ✅ بيتابع مساحة منطقة المعاينة المتاحة فعليًا (عرض + ارتفاع الحاوية)
    useEffect(() => {
        const el = previewAreaRef.current;
        if (!el) return;

        const update = () => {
            setAvailableSize({ width: el.clientWidth, height: el.clientHeight });
        };

        update();
        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => observer.disconnect();
    }, [isFullscreen]);

    // ✅ previewScale = object-fit: contain حقيقي — أصغر نسبة بين (عرض
    // الحاوية الثابت / 1200) و(طول الحاوية الثابت / الطول الحقيقي للشهادة).
    // الشهادة دايمًا بتتصغّر عشان تتظبط بالكامل جوه صندوق ثابت المقاس، من
    // غير قص ومن غير سكرول. الشرط الوحيد عشان ده يشتغل صح 100%: لازم
    // naturalHeight يكون القيمة النهائية الصحيحة وقت الحساب — وده مضمون هنا
    // لأننا مش بنسمح بعرض الشهادة أصلاً (previewSettled=false) لحد ما
    // القياس يخلص تمامًا (شوف handleIframeLoad تحت).
    useEffect(() => {
        if (!availableSize.width || !availableSize.height) return;
        const widthScale = availableSize.width / CERT_DESIGN_WIDTH;
        const heightScale = availableSize.height / naturalHeight;
        const next = Math.min(widthScale, heightScale);
        if (next > 0 && Number.isFinite(next)) {
            setPreviewScale(+next.toFixed(4));
        }
    }, [availableSize, naturalHeight]);


    // ✅ بيقيس الارتفاع الحقيقي لمحتوى الـ iframe (scrollHeight) ويحدّث
    // naturalHeight لو القيمة الجديدة أكبر من اللي محفوظة. بنستخدم "أكبر
    // قيمة" مش "آخر قيمة" عشان أي قياس مبكر (قبل ما الخطوط/الصور تخلص
    // تحميل) ميرجعش يقلل الارتفاع تاني بالغلط.
    const measureIframeHeight = () => {
        try {
            const doc = iframeRef.current?.contentDocument;
            if (!doc) return;
            const measured = Math.max(
                doc.documentElement?.scrollHeight || 0,
                doc.body?.scrollHeight || 0,
                doc.documentElement?.offsetHeight || 0
            );
            if (measured > 0) {
                setNaturalHeight((prev) => (measured > prev ? measured : prev));
            }
        } catch (err) {
            // نادر جدًا مع srcDoc same-origin، بس لو حصل نسيب القيمة الحالية
        }
    };

    // ✅ بعد ما الـ srcDoc يتغيّر (fetchPreviewHtml رجّع HTML جديد)، بنرجّع
    // الشهادة لحالة "لسه بتستقر" — عشان منوريش المستخدم شكل ناقص (لوجو غايب،
    // تاريخ/توقيع متقطع) وهو بيتحمّل، لحد ما نتأكد إن كل حاجة خلصت فعليًا
    useEffect(() => {
        setPreviewSettled(false);
    }, [html]);

    // ✅ بعد ما محتوى الـ iframe يخلص "تحميل" الـ DOM (load event)، ده مش
    // كافي أبدًا — لسه ممكن يكون فيه صور (اللوجو، البادچ، الشعارات) وخطوط
    // (زي خط "CERTIFICATE" السيريف) شغالة تتحمل في الخلفية. لو عرضنا
    // الشهادة أو قسناها دلوقتي، هتبان ناقصة تفاصيل (زي ما كان بيحصل: لوجو
    // غايب، مفيش تاريخ ولا توقيع). فبدل القياس المبكر، بننتظر فعليًا:
    // 1) قياس أولي (بس للـ scale التقريبي وقت التحميل)
    // 2) ننتظر Promise واحد بيتحقق لما كل الصور تخلص تحميل (نجاح أو فشل)
    //    وكمان الخطوط (document.fonts.ready)
    // 3) بعد ما الاتنين يخلصوا: قياس نهائي + فريم إضافي (rAF) للتأكد إن
    //    الـ layout استقر فعليًا، وبعدها بس نعلّم المعاينة كـ "مستقرة"
    //    ونسمح بعرضها
    // 4) مراقبة مستمرة (ResizeObserver) لأي تغيير لاحق نادر
    // 5) شبكة أمان: مجموعة قياسات على فترات متفرقة (لصور بطيئة جدًا من CDN)
    const handleIframeLoad = () => {
        try {
            const doc = iframeRef.current?.contentDocument;
            if (!doc) return;

            measureIframeHeight();

            const fontsReady: Promise<unknown> = (doc as any).fonts?.ready ?? Promise.resolve();

            const imagePromises = Array.from(doc.images || []).map((img) =>
                img.complete
                    ? Promise.resolve()
                    : new Promise<void>((resolve) => {
                          img.addEventListener("load", () => resolve(), { once: true });
                          img.addEventListener("error", () => resolve(), { once: true });
                      })
            );

            Promise.all([fontsReady, ...imagePromises]).then(() => {
                measureIframeHeight();
                // ✅ فريم إضافي بعد التحميل عشان أي reflow أخير (مقاسات
                // الصور بعد ما تتحدد فعليًا) يتم قبل ما نثبّت previewSettled
                requestAnimationFrame(() => {
                    measureIframeHeight();
                    setPreviewSettled(true);
                });
            });

            heightObserverRef.current?.disconnect();
            const ro = new ResizeObserver(measureIframeHeight);
            ro.observe(doc.documentElement);
            heightObserverRef.current = ro;

            heightSafetyTimeoutsRef.current.forEach(clearTimeout);
            heightSafetyTimeoutsRef.current = [300, 800, 1500, 3000].map((delay) =>
                setTimeout(measureIframeHeight, delay)
            );
        } catch (err) {
            // نادر جدًا مع srcDoc same-origin، بس لو حصل نعتبر المعاينة
            // مستقرة على القيمة الحالية عشان منسيبش سبينر أبدي
            setPreviewSettled(true);
        }
    };

    const handleAssetUpload = async (key: string, file: File) => {
        if (!file) return;
        setAssetUploading(key);
        try {
            const uploadForm = new FormData();
            uploadForm.append("file", file);
            uploadForm.append("folder", "certificates/assets");

            const uploadRes = await fetch("/api/upload-image", {
                method: "POST",
                body: uploadForm,
            });
            const uploadJson = await uploadRes.json();

            if (!uploadJson.success) {
                toast.error(uploadJson.message || "فشل رفع الصورة");
                return;
            }

            const saveRes = await fetch("/api/admin/certificate-assets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key, imageUrl: uploadJson.imageUrl }),
            });
            const saveJson = await saveRes.json();

            if (saveJson.success) {
                setAssets(saveJson.data);
                toast.success("اتحدثت الصورة بنجاح");
                fetchPreviewHtml(form);
            } else {
                toast.error(saveJson.error || "فشل حفظ الصورة");
            }
        } catch (err) {
            console.error("Error uploading asset:", err);
            toast.error("حدث خطأ أثناء رفع الصورة");
        } finally {
            setAssetUploading(null);
        }
    };

    const handleAssetReset = async (key: string) => {
        setAssetUploading(key);
        try {
            const res = await fetch(`/api/admin/certificate-assets?key=${key}`, {
                method: "DELETE",
            });
            const json = await res.json();
            if (json.success) {
                setAssets(json.data);
                toast.success("اترجعت الصورة الافتراضية");
                fetchPreviewHtml(form);
            } else {
                toast.error(json.error || "فشل الاسترجاع");
            }
        } catch (err) {
            console.error("Error resetting asset:", err);
            toast.error("حدث خطأ أثناء الاسترجاع");
        } finally {
            setAssetUploading(null);
        }
    };

    // ✅ بيسمع لرسايل postMessage اللي جاية من جوه أي iframe (المعاينة
    // الصغيرة أو المعاينة المكبّرة) — لما المستخدم يدوس على صورة/شعار في
    // الشهادة نفسها، وبيفتح تلقائيًا نفس الـ file input بتاع الصورة دي
    useEffect(() => {
        function handleAssetClickMessage(event: MessageEvent) {
            if (event.data?.type !== "cert-asset-click") return;
            const key = event.data.key;
            const input = document.getElementById(`asset-upload-${key}`) as HTMLInputElement | null;
            input?.click();
        }
        window.addEventListener("message", handleAssetClickMessage);
        return () => window.removeEventListener("message", handleAssetClickMessage);
    }, []);

    // ✅ Esc تقفل المعاينة المكبّرة الأول لو مفتوحة، وإلا تقفل المودال نفسه
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key !== "Escape") return;
            if (zoomOverlayOpen) {
                setZoomOverlayOpen(false);
            } else {
                onClose();
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose, zoomOverlayOpen]);

    if (!mounted) return null;

    const modalContent = (
        <div
            className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className={`bg-white dark:bg-darkmode shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ${
                    isFullscreen
                        ? "w-[98vw] h-[96vh] rounded-xl"
                        : "w-full max-w-7xl h-[88vh] rounded-2xl"
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header (ثابت) */}
                <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-darkmode">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 bg-ElectricAqua/10 rounded-lg flex items-center justify-center shrink-0">
                            <Wand2 className="w-4.5 h-4.5 text-ElectricAqua" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-16 font-bold text-MidnightNavyText dark:text-white">
                                تصميم الشهادة
                            </h3>
                            <p className="text-11 text-SlateBlueText dark:text-darktext truncate">
                                دوس على أي صورة أو شعار في الشهادة نفسها عشان تغيّرها — التعديل بيتطبق على الشهادات الحقيقية
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            onClick={() => setIsFullscreen((v) => !v)}
                            className="text-SlateBlueText dark:text-darktext hover:bg-IcyBreeze dark:hover:bg-dark_input rounded-full p-2 transition-colors"
                            title={isFullscreen ? "تصغير النافذة" : "ملء الشاشة"}
                        >
                            {isFullscreen ? <Minimize2 className="w-4.5 h-4.5" /> : <Maximize2 className="w-4.5 h-4.5" />}
                        </button>
                        <button
                            onClick={onClose}
                            className="text-SlateBlueText dark:text-darktext hover:bg-red-500/10 hover:text-red-600 rounded-full p-2 transition-colors"
                            title="إغلاق"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body: ارتفاع ثابت، وكل عمود بيدير السكرول بتاعه لوحده */}
                <div className="flex-1 min-h-0 grid lg:grid-cols-[300px_minmax(0,1fr)] gap-5 p-5 overflow-hidden bg-IcyBreeze/40 dark:bg-transparent">
                    {/* ── يمين (RTL): فورم + صور، بيسكرول لوحده ── */}
                    <div className="min-h-0 overflow-y-auto pl-1 space-y-6">
                        <div className="bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border p-4 space-y-4">
                            <h4 className="text-13 font-semibold text-MidnightNavyText dark:text-white flex items-center gap-2">
                                <Wand2 className="w-3.5 h-3.5 text-primary" />
                                بيانات تجريبية للمعاينة
                            </h4>
                            <TestField label="اسم الطالب">
                                <input
                                    type="text"
                                    value={form.studentName}
                                    onChange={(e) => onFieldChange("studentName", e.target.value)}
                                    className={inputCls}
                                />
                            </TestField>
                            <TestField label="اسم الموديول">
                                <input
                                    type="text"
                                    value={form.moduleTitle}
                                    onChange={(e) => onFieldChange("moduleTitle", e.target.value)}
                                    className={inputCls}
                                />
                            </TestField>
                            <TestField label="اسم الموقّع">
                                <input
                                    type="text"
                                    value={form.signatureName}
                                    onChange={(e) => onFieldChange("signatureName", e.target.value)}
                                    className={inputCls}
                                />
                            </TestField>
                            <TestField label="خلفية الشهادة">
                                <select
                                    value={form.background}
                                    onChange={(e) => onFieldChange("background", e.target.value)}
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
                                    value={form.achievements}
                                    onChange={(e) => onFieldChange("achievements", e.target.value)}
                                    className={`${inputCls} resize-none`}
                                />
                            </TestField>
                        </div>

                        <div className="bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border p-4 space-y-3">
                            <div>
                                <h4 className="text-13 font-semibold text-MidnightNavyText dark:text-white flex items-center gap-2">
                                    <ImageIcon className="w-3.5 h-3.5 text-primary" />
                                    الصور والشعارات الثابتة
                                </h4>
                                <p className="text-11 text-SlateBlueText dark:text-darktext mt-0.5">
                                    نفس الصور اللي في المعاينة — دوس عليها هناك، أو ارفع من هنا
                                </p>
                            </div>

                            {assets === null ? (
                                <div className="flex justify-center py-6">
                                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {ASSET_FIELDS.map((field) => (
                                        <AssetCard
                                            key={field.key}
                                            field={field}
                                            currentUrl={assets[field.key as keyof CertificateAssets]}
                                            uploading={assetUploading === field.key}
                                            onUpload={handleAssetUpload}
                                            onReset={handleAssetReset}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── شمال: المعاينة — منطقة ثابتة، من غير سكرول جواها ── */}
                    <div className="min-h-0 flex flex-col gap-2">
                        {/* شريط أدوات المعاينة */}
                        <div className="shrink-0 flex items-center justify-between bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border px-3 py-2">
                            <div className="min-w-0">
                                <p className="text-11 font-semibold text-MidnightNavyText dark:text-white">
                                    المعاينة الحية
                                </p>
                                <p className="text-10 text-SlateBlueText dark:text-darktext">
                                    دوس على أي صورة أو شعار عشان تغيّره مباشرة
                                </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    onClick={() => fetchPreviewHtml(form)}
                                    className="p-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors"
                                    title="تحديث المعاينة"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${htmlLoading ? "animate-spin" : ""}`} />
                                </button>
                                <div className="w-px h-4 bg-PowderBlueBorder dark:bg-dark_border mx-1" />
                                <button
                                    onClick={() => setZoomOverlayOpen(true)}
                                    disabled={!html || !previewSettled}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-11 font-semibold hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    title="تكبير الشهادة وعرضها بحجم كبير وواضح"
                                >
                                    <Maximize2 className="w-3.5 h-3.5" /> تكبير
                                </button>
                            </div>
                        </div>

                        {/* ✅ منطقة المعاينة: overflow-y-auto عشان لو الشهادة (بعد ما
                            تتحجم على عرض الحاوية بالظبط) طلعت أطول من المساحة
                            المتاحة، تتسكرول عموديًا بشكل طبيعي بدل ما تتقص. العرض
                            دايمًا مطابق تمامًا لعرض الحاوية (overflow-x-hidden) فمفيش
                            قص أو سكرول أفقي أبدًا. */}
                        <div
                            ref={previewAreaRef}
                            className="relative flex-1 min-h-0 w-full rounded-xl border border-PowderBlueBorder dark:border-dark_border bg-gray-100 dark:bg-dark_input overflow-y-auto overflow-x-hidden flex items-start justify-center"
                        >
                            {/* ✅ سبينر ظاهر لحد ما يكون عندنا HTML + الشهادة اتقاست واستقرت
                                فعليًا (صور وخطوط خلصوا تحميل) — بدل ما نوري شكل ناقص
                                (لوجو غايب، تاريخ/توقيع متقطع) وهو لسه بيتحمّل جوه الـ iframe */}
                            {(!html || (htmlLoading && !previewSettled)) && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                            )}

                            {html && (
                                <div
                                    style={{
                                        width: CERT_DESIGN_WIDTH,
                                        height: naturalHeight,
                                        transform: `scale(${previewScale})`,
                                        transformOrigin: "top center",
                                        opacity: previewSettled ? (htmlLoading ? 0.5 : 1) : 0,
                                        transition: "opacity 150ms ease",
                                        boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
                                        flexShrink: 0,
                                        // ✅ بما إن العرض بيتحجم لعرض الحاوية بالظبط، لازم نصحح
                                        // الهامش السفلي عشان الـ transform:scale بيسيب فراغ
                                        // بمقدار الفرق بين الطول الأصلي والطول بعد التصغير —
                                        // marginBottom السالب بيقفل الفراغ ده فيبان السكرول مظبوط
                                        marginBottom: naturalHeight * (previewScale - 1),
                                        pointerEvents: previewSettled ? "auto" : "none",
                                    }}
                                >
                                    <iframe
                                        ref={iframeRef}
                                        srcDoc={html}
                                        title="Certificate live preview"
                                        scrolling="no"
                                        onLoad={handleIframeLoad}
                                        style={{
                                            width: CERT_DESIGN_WIDTH,
                                            height: naturalHeight,
                                            border: "none",
                                            display: "block",
                                            pointerEvents: "auto",
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {zoomOverlayOpen && html && (
                <CertificateZoomOverlay
                    html={html}
                    naturalHeight={naturalHeight}
                    onClose={() => setZoomOverlayOpen(false)}
                />
            )}
        </div>
    );

    // ✅ الأهم: بنركب المودال عبر Portal مباشرة جوه document.body، عشان
    // الخلفية السودة الشفافة (fixed inset-0) تغطي الشاشة كلها فعليًا،
    // مهما كانت الشجرة اللي فوقه فيها transform/filter/sticky أو أي حاجة
    // بتعمل containing block جديد بتكسر سلوك position:fixed.
    return createPortal(modalContent, document.body);
}

// ─── Certificate Zoom Overlay ───────────────────────────────────────────────
// ✅ عرض الشهادة بحجم كبير وواضح، بشاشة كاملة مخصصة. بيستخدم نفس فكرة
// الزوم البسيطة بتاع الـ Lightbox (خطوات ثابتة بالأزرار) بدل نظام السحب
// اليدوي المعقد اللي كان موجود قبل كده — والتنقل وقت التكبير بيتم بالتمرير
// الطبيعي (Scroll) اللي المتصفح بيديره لوحده، فمفيش أي حسابات ماوس يدوية
// ممكن تغلط. دوس على أي صورة جوه الشهادة هنا لسه بيشتغل عادي (نفس iframe).
function CertificateZoomOverlay({
    html,
    naturalHeight,
    onClose,
}: {
    html: string;
    naturalHeight: number;
    onClose: () => void;
}) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const stageRef = useRef<HTMLDivElement>(null);
    const [fitScale, setFitScale] = useState(1);
    const [zoomMultiplier, setZoomMultiplier] = useState(1);

    useEffect(() => {
        const el = stageRef.current;
        if (!el) return;
        const PADDING = 64;
        const update = () => {
            const widthScale = (el.clientWidth - PADDING) / CERT_DESIGN_WIDTH;
            const heightScale = (el.clientHeight - PADDING) / naturalHeight;
            // ✅ نفس هامش الأمان: تصغير خفيف مقصود بدل قص محتمل
            const next = Math.min(widthScale, heightScale) * 0.97;
            if (next > 0 && Number.isFinite(next)) {
                setFitScale(+next.toFixed(4));
            }
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => observer.disconnect();
    }, [naturalHeight]);

    const scale = +(fitScale * zoomMultiplier).toFixed(4);

    const zoomIn = () => setZoomMultiplier((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
    const zoomOut = () => setZoomMultiplier((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)));
    const resetZoom = () => setZoomMultiplier(1);

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100000] bg-black/90 backdrop-blur-sm flex flex-col" onClick={onClose}>
            {/* شريط الأدوات */}
            <div
                className="shrink-0 flex items-center justify-between px-5 py-3"
                onClick={(e) => e.stopPropagation()}
            >
                <p className="text-13 text-white/70">
                    استخدم عجلة الماوس أو السحب على شريط التمرير للتنقل وأنت مكبّر
                </p>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-1.5">
                        <button
                            onClick={zoomOut}
                            disabled={zoomMultiplier <= MIN_ZOOM}
                            className="text-white p-1.5 rounded-full hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="تصغير"
                        >
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="text-white text-12 font-medium w-12 text-center select-none">
                            {Math.round(zoomMultiplier * 100)}%
                        </span>
                        <button
                            onClick={zoomIn}
                            disabled={zoomMultiplier >= MAX_ZOOM}
                            className="text-white p-1.5 rounded-full hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="تكبير"
                        >
                            <ZoomIn className="w-4 h-4" />
                        </button>
                        <button
                            onClick={resetZoom}
                            disabled={zoomMultiplier === MIN_ZOOM}
                            className="text-white p-1.5 rounded-full hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="إعادة الضبط"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        className="text-white bg-white/10 hover:bg-white/20 rounded-full p-2"
                        onClick={onClose}
                        title="إغلاق (Esc)"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* ✅ منطقة العرض: overflow-auto بتخلي المتصفح يدير السكرول لوحده
                لما الزوم يكبّر الشهادة عن مساحة الشاشة — مفيش حسابات سحب يدوية */}
            <div
                ref={stageRef}
                className="flex-1 min-h-0 overflow-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="min-h-full min-w-full flex items-center justify-center p-8">
                    <div
                        style={{
                            width: CERT_DESIGN_WIDTH,
                            height: naturalHeight,
                            transform: `scale(${scale})`,
                            transformOrigin: "center center",
                            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                            flexShrink: 0,
                        }}
                    >
                        <iframe
                            srcDoc={html}
                            title="Certificate large preview"
                            scrolling="no"
                            style={{
                                width: CERT_DESIGN_WIDTH,
                                height: naturalHeight,
                                border: "none",
                                display: "block",
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCard({
    icon,
    iconBg,
    accent = "bg-transparent",
    label,
    value,
}: {
    icon: React.ReactNode;
    iconBg: string;
    accent?: string;
    label: string;
    value: number;
}) {
    return (
        <div className="group relative overflow-hidden bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                        {label}
                    </p>
                    <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">{value}</p>
                </div>
                <div
                    className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}
                >
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
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-13 font-semibold transition-all duration-200 ${
                active
                    ? "bg-white dark:bg-darkmode text-primary shadow-sm"
                    : "text-SlateBlueText dark:text-darktext hover:text-primary"
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

// ✅ دايرة مبدئية صغيرة بحروف اسم الطالب — بتساعد العين تفرّق بين الصفوف
// بسرعة في الجدول والكروت، بديل بسيط وخفيف عن رفع صورة بروفايل فعلية
function InitialsAvatar({ name }: { name: string }) {
    const initials = name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
    return (
        <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-11 font-bold">
            {initials || "?"}
        </div>
    );
}

function CertCard({
    row,
    onOpenImage,
}: {
    row: CertRow;
    onOpenImage: (url: string) => void;
}) {
    const fullyDelivered = row.student.delivered && row.guardian.delivered;
    return (
        <div className="group/card rounded-xl border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-darkmode overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div
                className="relative group h-44 bg-gray-100 dark:bg-dark_input overflow-hidden cursor-zoom-in flex items-center justify-center"
                onClick={() => row.imageUrl && onOpenImage(row.imageUrl)}
            >
                {row.imageUrl ? (
                    <>
                        <img
                            src={row.imageUrl}
                            alt={row.studentName}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                        />
                        {fullyDelivered && (
                            <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-10 font-semibold bg-Aquamarine/90 text-white shadow-sm">
                                <CheckCircle2 className="w-3 h-3" /> مكتملة
                            </span>
                        )}
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
                <div className="flex items-start gap-2.5">
                    <InitialsAvatar name={row.studentName} />
                    <div className="min-w-0">
                        <h3 className="text-15 font-bold text-MidnightNavyText dark:text-white truncate">
                            {row.studentName}
                        </h3>
                        <p className="text-12 text-SlateBlueText dark:text-darktext truncate">
                            {row.courseTitle} — {row.moduleTitle}
                        </p>
                        <p className="text-11 text-SlateBlueText dark:text-darktext truncate">{row.groupName}</p>
                    </div>
                </div>

                <div className="flex flex-col gap-2 pt-1 border-t border-PowderBlueBorder dark:border-dark_border">
                    <div className="flex items-center justify-between text-12 pt-2">
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

// ✅ كارت خاص بكل صورة/شعار ثابت — بيعرض المعاينة الحالية (مخصصة أو
// افتراضية)، وزرار رفع، وزرار استرجاع الافتراضي لو فيه صورة مخصصة.
// ملحوظة: الـ id بتاع الـ <input> هنا (`asset-upload-${field.key}`) هو
// نفسه اللي بيتفتح تلقائيًا لما تدوس على الصورة جوه المعاينة الحية/المكبّرة.
function AssetCard({
    field,
    currentUrl,
    uploading,
    onUpload,
    onReset,
}: {
    field: { key: string; label: string; defaultSrc: string };
    currentUrl?: string | null;
    uploading: boolean;
    onUpload: (key: string, file: File) => void;
    onReset: (key: string) => void;
}) {
    const inputId = `asset-upload-${field.key}`;
    return (
        <div className="rounded-lg border border-PowderBlueBorder dark:border-dark_border bg-IcyBreeze dark:bg-dark_input p-3 space-y-2 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between">
                <span className="text-11 font-semibold text-MidnightNavyText dark:text-white truncate">
                    {field.label}
                </span>
                {currentUrl && (
                    <span className="text-9 px-1.5 py-0.5 rounded-full bg-Aquamarine/20 text-Salem font-semibold shrink-0">
                        مخصصة
                    </span>
                )}
            </div>

            <div className="h-16 flex items-center justify-center bg-white dark:bg-darkmode rounded-md border border-dashed border-PowderBlueBorder dark:border-dark_border overflow-hidden">
                <img
                    src={currentUrl || field.defaultSrc}
                    alt={field.label}
                    className="max-h-full max-w-full object-contain"
                />
            </div>

            <div className="flex items-center gap-1.5">
                <label
                    htmlFor={inputId}
                    className="flex-1 cursor-pointer text-center inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-primary/10 text-primary text-10 font-semibold hover:bg-primary/20 transition-colors"
                >
                    {uploading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        <ImagePlus className="w-3 h-3" />
                    )}
                    رفع
                </label>
                <input
                    id={inputId}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onUpload(field.key, file);
                        e.target.value = "";
                    }}
                />
                {currentUrl && (
                    <button
                        type="button"
                        onClick={() => onReset(field.key)}
                        disabled={uploading}
                        className="p-1.5 rounded-md bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        title="استرجاع الافتراضي"
                    >
                        <RotateCcw className="w-3 h-3" />
                    </button>
                )}
            </div>
        </div>
    );
}

const inputCls =
    "w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200";
    