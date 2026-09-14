"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
    Package,
    Plus,
    Pencil,
    Ban,
    CheckCircle2,
    X,
    Save,
    Loader2,
    Clock,
    Banknote,
    CalendarRange,
    ArrowUpDown,
    Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { useI18n } from "@/i18n/I18nProvider";

const emptyForm = {
    name: "",
    slug: "",
    months: "",
    totalHours: "",
    price: "",
    order: 0,
};

function slugify(text) {
    return text
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

function formatMoney(n) {
    return `${Number(n || 0).toLocaleString("en-US")} EGP`;
}

export default function PackagePlansPage() {
    const { t } = useI18n();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [slugTouched, setSlugTouched] = useState(false);
    const [showInactive, setShowInactive] = useState(false);

    const fetchPlans = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/package-plans");
            const data = await res.json();
            if (data.success) setPlans(data.data || []);
            else toast.error(data.message || "تعذر تحميل الباقات");
        } catch (err) {
            toast.error(err.message || "تعذر تحميل الباقات");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPlans();
    }, [fetchPlans]);

    const openCreate = () => {
        setEditingId(null);
        setForm(emptyForm);
        setSlugTouched(false);
        setShowForm(true);
    };

    const openEdit = (plan) => {
        setEditingId(plan._id);
        setForm({
            name: plan.name,
            slug: plan.slug,
            months: plan.months,
            totalHours: plan.totalHours,
            price: plan.price,
            order: plan.order || 0,
        });
        setSlugTouched(true);
        setShowForm(true);
    };

    const handleNameChange = (value) => {
        setForm((f) => ({
            ...f,
            name: value,
            slug: slugTouched ? f.slug : slugify(value),
        }));
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.slug.trim() || !form.months || form.totalHours === "" || form.price === "") {
            toast.error("من فضلك املأ كل الحقول المطلوبة");
            return;
        }

        setSaving(true);
        try {
            const isEdit = !!editingId;
            const url = isEdit ? `/api/package-plans/${editingId}` : "/api/package-plans";
            const method = isEdit ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name.trim(),
                    slug: form.slug.trim(),
                    months: Number(form.months),
                    totalHours: Number(form.totalHours),
                    price: Number(form.price),
                    order: Number(form.order) || 0,
                }),
            });
            const data = await res.json();

            if (data.success) {
                toast.success(isEdit ? "تم تعديل الباقة" : "تمت إضافة الباقة");
                setShowForm(false);
                fetchPlans();
            } else {
                toast.error(data.message || "حدث خطأ");
            }
        } catch (err) {
            toast.error(err.message || "حدث خطأ");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (plan) => {
        const activating = !plan.isActive;
        if (!activating && !confirm(`إيقاف باقة "${plan.name}"؟ لن تظهر للاختيار عند إضافة باكدج جديد، لكن الباكدجات القديمة اللي بتستخدمها هتفضل زي ما هي.`)) {
            return;
        }

        try {
            if (activating) {
                const res = await fetch(`/api/package-plans/${plan._id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ isActive: true }),
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.message);
                toast.success("تم تفعيل الباقة");
            } else {
                const res = await fetch(`/api/package-plans/${plan._id}`, { method: "DELETE" });
                const data = await res.json();
                if (!data.success) throw new Error(data.message);
                toast.success("تم إيقاف الباقة");
            }
            fetchPlans();
        } catch (err) {
            toast.error(err.message || "حدث خطأ");
        }
    };

    const visiblePlans = showInactive ? plans : plans.filter((p) => p.isActive);
    const pricePerHour = (plan) => (plan.totalHours > 0 ? plan.price / plan.totalHours : 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-orange-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
                        <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-MidnightNavyText dark:text-white">
                            باقات الساعات
                        </h1>
                        <p className="text-sm text-SlateBlueText dark:text-darktext">
                            الباقات المتاحة هنا هي اللي بتظهر عند إضافة باكدج جديد لأي طالب في صفحة إدارة الرصيد.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-SlateBlueText dark:text-darktext cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={showInactive}
                            onChange={(e) => setShowInactive(e.target.checked)}
                            className="rounded border-PowderBlueBorder dark:border-dark_border"
                        />
                        عرض الباقات الموقوفة
                    </label>
                    <button
                        onClick={openCreate}
                        className="bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-lg font-semibold inline-flex items-center gap-2 shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        باقة جديدة
                    </button>
                </div>
            </div>

            {/* Plans grid */}
            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            ) : visiblePlans.length === 0 ? (
                <div className="bg-white dark:bg-dark_input rounded-xl border border-PowderBlueBorder dark:border-dark_border p-12 text-center">
                    <Sparkles className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-2">
                        لسه مفيش باقات
                    </h3>
                    <p className="text-sm text-SlateBlueText dark:text-darktext mb-4">
                        ابدأ بإضافة أول باقة — مثلاً 3 شهور و24 ساعة.
                    </p>
                    <button
                        onClick={openCreate}
                        className="bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-lg font-semibold inline-flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        إضافة باقة
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visiblePlans
                        .slice()
                        .sort((a, b) => (a.order || 0) - (b.order || 0) || a.months - b.months)
                        .map((plan) => (
                            <div
                                key={plan._id}
                                className={`relative bg-white dark:bg-dark_input rounded-xl border p-5 flex flex-col gap-4 transition-shadow hover:shadow-md ${plan.isActive
                                    ? "border-PowderBlueBorder dark:border-dark_border"
                                    : "border-dashed border-gray-300 dark:border-gray-700 opacity-60"
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-SlateBlueText dark:text-darktext font-mono">{plan.slug}</p>
                                        <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white">
                                            {plan.name}
                                        </h3>
                                    </div>
                                    {!plan.isActive && (
                                        <span className="text-[11px] px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                                            موقوفة
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
                                        <CalendarRange className="w-4 h-4 mx-auto mb-1 text-primary" />
                                        <p className="text-sm font-bold text-MidnightNavyText dark:text-white">{plan.months}</p>
                                        <p className="text-[11px] text-SlateBlueText dark:text-darktext">شهر</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
                                        <Clock className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                                        <p className="text-sm font-bold text-MidnightNavyText dark:text-white">{plan.totalHours}</p>
                                        <p className="text-[11px] text-SlateBlueText dark:text-darktext">ساعة</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
                                        <Banknote className="w-4 h-4 mx-auto mb-1 text-green-600" />
                                        <p className="text-sm font-bold text-MidnightNavyText dark:text-white">{plan.price}</p>
                                        <p className="text-[11px] text-SlateBlueText dark:text-darktext">EGP</p>
                                    </div>
                                </div>

                                <p className="text-xs text-SlateBlueText dark:text-darktext">
                                    {formatMoney(pricePerHour(plan).toFixed(1))} / ساعة تقريبًا
                                </p>

                                <div className="flex items-center gap-2 pt-2 border-t border-PowderBlueBorder dark:border-dark_border">
                                    <button
                                        onClick={() => openEdit(plan)}
                                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-PowderBlueBorder dark:border-dark_border text-MidnightNavyText dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center justify-center gap-1.5"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                        تعديل
                                    </button>
                                    <button
                                        onClick={() => handleToggleActive(plan)}
                                        className={`flex-1 px-3 py-2 text-sm rounded-lg inline-flex items-center justify-center gap-1.5 ${plan.isActive
                                            ? "bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40"
                                            : "bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/40"
                                            }`}
                                    >
                                        {plan.isActive ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                        {plan.isActive ? "إيقاف" : "تفعيل"}
                                    </button>
                                </div>
                            </div>
                        ))}
                </div>
            )}

            {/* Create / Edit modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-darkmode rounded-xl w-full max-w-md">
                        <div className="p-4 border-b border-PowderBlueBorder dark:border-dark_border flex items-center justify-between">
                            <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white flex items-center gap-2">
                                <Package className="w-5 h-5 text-primary" />
                                {editingId ? "تعديل الباقة" : "باقة جديدة"}
                            </h3>
                            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-1.5">
                                    اسم الباقة
                                </label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    placeholder="مثال: باقة 3 شهور"
                                    className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-1.5 flex items-center gap-1.5">
                                    المعرف (slug)
                                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                                </label>
                                <input
                                    type="text"
                                    value={form.slug}
                                    onChange={(e) => {
                                        setSlugTouched(true);
                                        setForm({ ...form, slug: slugify(e.target.value) });
                                    }}
                                    disabled={!!editingId}
                                    className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white disabled:opacity-60 font-mono text-sm"
                                />
                                <p className="text-[11px] text-SlateBlueText dark:text-darktext mt-1">
                                    {editingId
                                        ? "المعرف ثابت بعد الإنشاء عشان الباكدجات القديمة اللي مرتبطة بيه تفضل سليمة."
                                        : "بيتحدد تلقائيًا من الاسم، وممكن تعدله يدويًا."}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-1.5">
                                        عدد الشهور
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={form.months}
                                        onChange={(e) => setForm({ ...form, months: e.target.value })}
                                        className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-1.5">
                                        عدد الساعات
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.totalHours}
                                        onChange={(e) => setForm({ ...form, totalHours: e.target.value })}
                                        className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-1.5">
                                        السعر الافتراضي (EGP)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.price}
                                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                                        className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-1.5">
                                        ترتيب العرض
                                    </label>
                                    <input
                                        type="number"
                                        value={form.order}
                                        onChange={(e) => setForm({ ...form, order: e.target.value })}
                                        className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
                                    />
                                </div>
                            </div>

                            <p className="text-[11px] text-SlateBlueText dark:text-darktext">
                                السعر هنا افتراضي فقط — ممكن يتغير وقت تخصيص الباقة لطالب معين (لو فيه خصم مثلًا).
                            </p>
                        </div>

                        <div className="p-4 border-t border-PowderBlueBorder dark:border-dark_border flex gap-3">
                            <button
                                onClick={() => setShowForm(false)}
                                className="flex-1 px-4 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg text-MidnightNavyText dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {saving ? "جارِ الحفظ..." : "حفظ"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}