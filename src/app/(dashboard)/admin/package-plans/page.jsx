"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Package,
    Plus,
    Pencil,
    Ban,
    CheckCircle2,
    Save,
    Loader2,
    CalendarRange,
    Sparkles,
    TrendingDown,
    Layers,
    Clock,
    BarChart3,
} from "lucide-react";
import toast from "react-hot-toast";
import AdminDrawer from "@/components/admin/AdminDrawer"; // ← عدّل المسار حسب مكان الملف عندك

const emptyForm = { name: "", slug: "", months: "", totalHours: "", price: "", order: 0 };

function slugify(text) {
    return text
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

const fmt = (n) => Number(n || 0).toLocaleString("en-US");
const perHour = (p) => (Number(p.totalHours) > 0 ? Number(p.price) / Number(p.totalHours) : 0);
const hoursPerMonth = (p) => (Number(p.months) > 0 ? Number(p.totalHours) / Number(p.months) : 0);
const monthsLabel = (m) => {
    const n = Number(m);
    if (n === 1) return "شهر";
    if (n === 2) return "شهرين";
    return `${n} ${n <= 10 ? "شهور" : "شهرًا"}`;
};
const round1 = (n) => (Math.round(n * 10) / 10).toLocaleString("en-US");

const inputCls =
    "w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-60";
const labelCls = "block text-sm font-medium text-gray-800 dark:text-white mb-1.5";
const muted = "text-gray-500 dark:text-darkmuted";
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";

/* ───────────── Mini chart primitive (SVG, no dependencies) ───────────── */

function PphComparisonChart({ items }) {
    if (items.length === 0) return null;
    const max = Math.max(...items.map((i) => i.pph));

    return (
        <div className="space-y-3">
            {items.map((i) => {
                const pct = max > 0 ? Math.max((i.pph / max) * 100, 4) : 0;
                return (
                    <div key={i.id} className="flex items-center gap-3">
                        <span className="w-24 sm:w-28 shrink-0 text-xs font-medium text-gray-700 dark:text-gray-200 truncate">
                            {i.name}
                        </span>
                        <div className="flex-1 h-2.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${i.isBest ? "bg-green-500" : "bg-[#004d59] dark:bg-teal-400"}`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <span
                            className={`w-20 shrink-0 text-xs font-bold tabular-nums text-left ${
                                i.isBest ? "text-green-600 dark:text-green-400" : "text-gray-800 dark:text-white"
                            }`}
                            dir="ltr"
                        >
                            {round1(i.pph)} EGP
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

export default function PackagePlansPage() {
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

    const closeForm = useCallback(() => setShowForm(false), []);

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
        setForm((f) => ({ ...f, name: value, slug: slugTouched ? f.slug : slugify(value) }));
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
            const res = await fetch(url, {
                method: isEdit ? "PUT" : "POST",
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
        if (
            !activating &&
            !confirm(
                `إيقاف باقة "${plan.name}"؟ لن تظهر للاختيار عند إضافة باكدج جديد، لكن الباكدجات القديمة اللي بتستخدمها هتفضل زي ما هي.`
            )
        ) {
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

    const visiblePlans = useMemo(
        () =>
            (showInactive ? plans : plans.filter((p) => p.isActive))
                .slice()
                .sort((a, b) => (a.order || 0) - (b.order || 0) || a.months - b.months),
        [plans, showInactive]
    );

    // مقارنة سعر الساعة بين الباقات المفعّلة بس
    const { maxPph, bestId } = useMemo(() => {
        const active = plans.filter((p) => p.isActive && Number(p.totalHours) > 0);
        if (active.length === 0) return { maxPph: 0, bestId: null };
        const values = active.map(perHour);
        const best = active.reduce((a, b) => (perHour(b) < perHour(a) ? b : a));
        return { maxPph: Math.max(...values), bestId: active.length > 1 ? best._id : null };
    }, [plans]);

    const overview = useMemo(() => {
        const active = plans.filter((p) => p.isActive);
        const totalHours = active.reduce((s, p) => s + Number(p.totalHours || 0), 0);
        const avgPph =
            active.filter((p) => Number(p.totalHours) > 0).length > 0
                ? active.reduce((s, p) => s + perHour(p), 0) / active.filter((p) => Number(p.totalHours) > 0).length
                : 0;
        const chartItems = active
            .filter((p) => Number(p.totalHours) > 0)
            .map((p) => ({ id: p._id, name: p.name, pph: perHour(p), isBest: p._id === bestId }))
            .sort((a, b) => a.pph - b.pph);
        return { activeCount: active.length, totalHours, avgPph, chartItems };
    }, [plans, bestId]);

    const draftPph = Number(form.totalHours) > 0 ? Number(form.price) / Number(form.totalHours) : 0;
    const draftHpm = Number(form.months) > 0 ? Number(form.totalHours) / Number(form.months) : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-[#004d59] to-[#003841] p-5 sm:p-6">
                <div className="absolute -left-10 -top-10 w-40 h-40 rounded-full bg-[#feaf00]/10 blur-2xl" aria-hidden="true" />
                <div className="relative flex items-start justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center shadow-lg shrink-0 ring-1 ring-white/10">
                            <Package className="w-6 h-6 text-[#feaf00]" />
                        </div>
                        <div>
                            <h1 className="!text-2xl !leading-snug font-bold text-white">باقات الساعات</h1>
                            <p className="text-sm mt-0.5 text-white/70">
                                الباقات المتاحة هنا هي اللي بتظهر عند إضافة باكدج جديد لأي طالب في صفحة إدارة الرصيد.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={openCreate}
                        className={`bg-[#feaf00] hover:bg-[#e6a000] text-[#003841] px-4 py-2.5 text-sm rounded-lg font-bold inline-flex items-center gap-2 shadow-sm transition-colors ${focusRing}`}
                    >
                        <Plus className="w-4 h-4" />
                        باقة جديدة
                    </button>
                </div>
            </div>

            {/* Overview: KPIs + price comparison */}
            {!loading && plans.length > 0 && (
                <div className="space-y-4">
                    {/* صف أفقي — نفس ارتفاع الكروت الثلاثة دايمًا، مش عمود طويل جنب شارت قصير */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <KpiCard icon={Layers} label="باقات مفعّلة" value={overview.activeCount} tone="bg-gray-900/5 dark:bg-white/5 text-gray-900 dark:text-white" />
                        <KpiCard icon={Clock} label="إجمالي الساعات المتاحة" value={fmt(overview.totalHours)} unit="ساعة" tone="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" />
                        <KpiCard icon={TrendingDown} label="متوسط سعر الساعة" value={overview.avgPph > 0 ? round1(overview.avgPph) : "—"} unit="EGP" tone="bg-[#feaf00]/10 text-[#946600] dark:text-[#feaf00]" />
                    </div>

                    {/* الشارت في صف مستقل بعرض كامل — ارتفاعه بيتحدد بمحتواه فعلًا (عدد الباقات)
                        مش بارتفاع عمود جنبه، عشان ميفضلش فراغ فاضي لما يكون فيه باقة أو اتنين بس */}
                    <div className="rounded-2xl border border-gray-200 dark:border-dark_border bg-white dark:bg-darklight p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="w-4 h-4 text-[#004d59] dark:text-white/70" />
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">مقارنة سعر الساعة بين الباقات المفعّلة</h3>
                        </div>
                        {overview.chartItems.length > 0 ? (
                            <PphComparisonChart items={overview.chartItems} />
                        ) : (
                            <p className={`text-sm ${muted}`}>لا توجد باقات مفعّلة بعدد ساعات صالح للمقارنة.</p>
                        )}
                        {overview.chartItems.length === 1 && (
                            <p className={`text-xs mt-4 pt-4 border-t border-gray-100 dark:border-dark_border ${muted}`}>
                                هتقدر تقارن بين أكتر من باقة هنا أول ما تفعّل باقة تانية.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className={`text-sm ${muted}`}>
                    {loading ? "" : `${visiblePlans.length} باقة${showInactive ? "" : " مفعّلة"}`}
                </p>
                <label className={`flex items-center gap-2 text-sm cursor-pointer select-none ${muted}`}>
                    <input
                        type="checkbox"
                        checked={showInactive}
                        onChange={(e) => setShowInactive(e.target.checked)}
                        className="rounded border-gray-300 dark:border-dark_border accent-[#ff6700]"
                    />
                    عرض الباقات الموقوفة
                </label>
            </div>

            {/* Plans */}
            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            ) : visiblePlans.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 dark:border-dark_border p-14 text-center">
                    <Sparkles className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-[#004d59] dark:text-white mb-1">لسه مفيش باقات</h3>
                    <p className={`text-sm mb-5 ${muted}`}>ابدأ بإضافة أول باقة — مثلًا 3 شهور و24 ساعة.</p>
                    <button
                        onClick={openCreate}
                        className={`bg-primary hover:bg-[#e65c00] text-white px-5 py-2.5 text-sm rounded-lg font-semibold inline-flex items-center gap-2 ${focusRing}`}
                    >
                        <Plus className="w-4 h-4" />
                        إضافة باقة
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {visiblePlans.map((plan) => {
                        const pph = perHour(plan);
                        const isBest = plan._id === bestId && plan.isActive;
                        const barPct = maxPph > 0 ? Math.max((pph / maxPph) * 100, 8) : 0;

                        return (
                            <article
                                key={plan._id}
                                className={`flex flex-col rounded-2xl border bg-white dark:bg-darklight overflow-hidden transition-shadow hover:shadow-lg ${
                                    plan.isActive
                                        ? "border-gray-200 dark:border-dark_border"
                                        : "border-dashed border-gray-300 dark:border-gray-700 opacity-60"
                                }`}
                            >
                                {/* رأس الكارت */}
                                <div className="flex items-start justify-between gap-3 px-5 pt-5">
                                    <div className="min-w-0">
                                        <h3 className="text-base font-bold text-[#004d59] dark:text-white truncate">{plan.name}</h3>
                                        <p className={`text-[11px] mt-0.5 font-mono ${muted}`} dir="ltr">
                                            {plan.slug}
                                        </p>
                                    </div>
                                    {!plan.isActive ? (
                                        <span className="text-[11px] px-2 py-1 rounded-md bg-gray-100 dark:bg-dark_input text-gray-500 dark:text-darkmuted flex-shrink-0">
                                            موقوفة
                                        </span>
                                    ) : isBest ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300 flex-shrink-0">
                                            <TrendingDown className="w-3 h-3" />
                                            الأوفر للساعة
                                        </span>
                                    ) : null}
                                </div>

                                {/* البطل: عدد الساعات */}
                                <div className="px-5 pt-5 pb-4">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl font-black tabular-nums leading-none text-[#004d59] dark:text-white">
                                            {plan.totalHours}
                                        </span>
                                        <span className="text-base font-semibold text-gray-600 dark:text-gray-300">ساعة</span>
                                    </div>
                                    <p className={`mt-2 text-sm flex items-center gap-1.5 ${muted}`}>
                                        <CalendarRange className="w-4 h-4" />
                                        على {monthsLabel(plan.months)} — حوالي {round1(hoursPerMonth(plan))} ساعة في الشهر
                                    </p>
                                </div>

                                {/* السعر + مقارنة سعر الساعة */}
                                <div className="mt-auto mx-5 mb-5 rounded-xl bg-gray-50 dark:bg-darkmode/50 border border-gray-200 dark:border-dark_border p-4">
                                    <div className="flex items-baseline justify-between">
                                        <span className={`text-xs ${muted}`}>السعر الافتراضي</span>
                                        <span className="text-xl font-black tabular-nums text-gray-900 dark:text-white" dir="ltr">
                                            {fmt(plan.price)} <span className={`text-xs font-medium ${muted}`}>EGP</span>
                                        </span>
                                    </div>
                                    <div className="mt-3">
                                        <div className="flex items-center justify-between text-xs mb-1.5">
                                            <span className={muted}>سعر الساعة</span>
                                            <span className={`font-bold tabular-nums ${isBest ? "text-green-600 dark:text-green-400" : "text-gray-800 dark:text-white"}`} dir="ltr">
                                                {round1(pph)} EGP
                                            </span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${isBest ? "bg-green-500" : "bg-[#004d59] dark:bg-teal-400"}`}
                                                style={{ width: `${barPct}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* إجراءات */}
                                <div className="flex items-center gap-2 px-5 py-3 border-t border-gray-200 dark:border-dark_border">
                                    <button
                                        onClick={() => openEdit(plan)}
                                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-dark_border text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-darkhover inline-flex items-center justify-center gap-1.5 transition-colors ${focusRing}`}
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                        تعديل
                                    </button>
                                    <button
                                        onClick={() => handleToggleActive(plan)}
                                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors ${focusRing} ${
                                            plan.isActive
                                                ? "text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
                                                : "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-500/15 dark:text-green-300 dark:hover:bg-green-500/25"
                                        }`}
                                    >
                                        {plan.isActive ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                        {plan.isActive ? "إيقاف" : "تفعيل"}
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {/* Create / Edit drawer */}
            <AdminDrawer
                isOpen={showForm}
                onClose={closeForm}
                locked={saving}
                title={editingId ? "تعديل الباقة" : "باقة جديدة"}
                subtitle={editingId ? form.name : "الباقة هتظهر عند تخصيص باكدج لأي طالب"}
                icon={Package}
                iconClassName="bg-[#004d59] text-[#feaf00]"
                footer={
                    <div className="flex gap-3">
                        <button
                            onClick={closeForm}
                            disabled={saving}
                            className={`px-5 py-2.5 text-sm font-medium border border-gray-300 dark:border-dark_border rounded-lg text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-darkhover disabled:opacity-50 ${focusRing}`}
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className={`flex-1 bg-primary hover:bg-[#e65c00] text-white px-4 py-2.5 text-sm rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors ${focusRing}`}
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? "جارِ الحفظ..." : editingId ? "حفظ التعديلات" : "إضافة الباقة"}
                        </button>
                    </div>
                }
            >
                <div>
                    <label className={labelCls}>اسم الباقة</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="مثال: باقة 3 شهور"
                        className={inputCls}
                    />
                </div>

                <div>
                    <label className={labelCls}>المعرف (slug)</label>
                    <input
                        type="text"
                        dir="ltr"
                        value={form.slug}
                        onChange={(e) => {
                            setSlugTouched(true);
                            setForm({ ...form, slug: slugify(e.target.value) });
                        }}
                        disabled={!!editingId}
                        className={`${inputCls} font-mono`}
                    />
                    <p className={`text-[11px] mt-1 ${muted}`}>
                        {editingId
                            ? "المعرف ثابت بعد الإنشاء عشان الباكدجات القديمة اللي مرتبطة بيه تفضل سليمة."
                            : "بيتحدد تلقائيًا من الاسم، وممكن تعدله يدويًا."}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelCls}>عدد الشهور</label>
                        <input type="number" min="1" value={form.months} onChange={(e) => setForm({ ...form, months: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>عدد الساعات</label>
                        <input type="number" min="0" value={form.totalHours} onChange={(e) => setForm({ ...form, totalHours: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>السعر الافتراضي (EGP)</label>
                        <input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>ترتيب العرض</label>
                        <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} className={inputCls} />
                    </div>
                </div>

                {/* معاينة حيّة */}
                <div className="rounded-xl border border-gray-200 dark:border-dark_border bg-gray-50 dark:bg-darkmode/40 p-4">
                    <p className={`text-xs mb-3 ${muted}`}>معاينة</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-2xl font-black tabular-nums text-[#004d59] dark:text-white" dir="ltr">
                                {draftPph > 0 ? round1(draftPph) : "—"}
                            </p>
                            <p className={`text-xs mt-0.5 ${muted}`}>EGP لكل ساعة</p>
                        </div>
                        <div>
                            <p className="text-2xl font-black tabular-nums text-[#004d59] dark:text-white" dir="ltr">
                                {draftHpm > 0 ? round1(draftHpm) : "—"}
                            </p>
                            <p className={`text-xs mt-0.5 ${muted}`}>ساعة في الشهر</p>
                        </div>
                    </div>
                    <p className={`text-[11px] mt-3 ${muted}`}>
                        السعر هنا افتراضي فقط — ممكن يتغير وقت تخصيص الباقة لطالب معين (لو فيه خصم مثلًا).
                    </p>
                </div>
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