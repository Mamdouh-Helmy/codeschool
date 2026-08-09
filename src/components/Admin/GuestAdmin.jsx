// components/Admin/GuestAdmin.jsx
"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
    User,
    Users,
    Edit,
    Trash2,
    Search,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Phone,
    Calendar,
    Eye,
    UserCheck,
    UserPlus,
    Shield,
    ShieldOff,
    Hash,
    Globe,
    Filter,
    Mail,
    Github,
    Chrome,
} from "lucide-react";
import Modal from "./Modal";
import GuestForm from "./GuestForm";
import { useI18n } from "@/i18n/I18nProvider";

const PROVIDER_META = {
    credentials: { label: "Email", icon: Mail,   className: "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200" },
    google:      { label: "Google", icon: Chrome, className: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300" },
    github:      { label: "GitHub", icon: Github, className: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200" },
};

export default function GuestAdmin() {
    const { t } = useI18n();
    const [guests, setGuests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingGuest, setEditingGuest] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [filters, setFilters] = useState({
        search: "",
        authProvider: "",
        status: "",
        language: "",
        page: 1,
        limit: 10,
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        totalGuests: 0,
        totalPages: 1,
    });
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        inactive: 0,
        byProvider: { credentials: 0, google: 0, github: 0 },
    });

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        try {
            return new Date(dateString).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
            });
        } catch {
            return "N/A";
        }
    };

    const getGenderText = (gender) => {
        if (!gender) return "-";
        return gender === "male" ? "ذكر" : "أنثى";
    };

    const getLanguageLabel = (language) => {
        if (!language || language === "ar") return { flag: "🇸🇦", label: "عربي" };
        return { flag: "🇬🇧", label: "English" };
    };

    const loadGuests = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: filters.page.toString(),
                limit: filters.limit.toString(),
                ...(filters.search && { search: filters.search }),
                ...(filters.authProvider && { authProvider: filters.authProvider }),
                ...(filters.status && { status: filters.status }),
                ...(filters.language && { language: filters.language }),
            });

            const res = await fetch(`/api/guest?${queryParams}`, {
                cache: "no-store",
                headers: { "Cache-Control": "no-cache" },
            });

            const json = await res.json();

            if (json.success) {
                setGuests(json.data || []);
                if (json.pagination) {
                    setPagination({
                        page: json.pagination.page || 1,
                        limit: json.pagination.limit || 10,
                        totalGuests: json.pagination.totalGuests || 0,
                        totalPages: json.pagination.totalPages || 1,
                    });
                }
                if (json.stats) setStats(json.stats);
            } else {
                toast.error(json.message || t("guests.loadError") || "فشل تحميل الجيست");
            }
        } catch (err) {
            console.error("Error loading guests:", err);
            toast.error(t("guests.loadError") || "فشل تحميل الجيست");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadGuests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.page, filters.authProvider, filters.status, filters.language]);

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value,
            ...(key !== "page" && { page: 1 }),
        }));
    };

    const onSaved = async () => {
        await loadGuests();
        toast.success(
            isCreating
                ? t("guests.createdSuccess") || "تم إنشاء الجيست بنجاح"
                : t("guests.savedSuccess") || "تم حفظ التعديلات بنجاح"
        );
    };

    const onAddNew = () => {
        setIsCreating(true);
        setEditingGuest(null);
        setModalOpen(true);
    };

    const onEdit = (guest) => {
        setIsCreating(false);
        setEditingGuest(guest);
        setModalOpen(true);
    };

    const onView = async (id) => {
        try {
            const res = await fetch(`/api/guest/${id}`);
            const json = await res.json();
            if (json.success) {
                setIsCreating(false);
                setEditingGuest(json.data);
                setModalOpen(true);
            }
        } catch (err) {
            console.error("Error viewing guest:", err);
            toast.error(t("guests.loadError") || "فشل تحميل بيانات الجيست");
        }
    };

    const toggleActive = async (guest) => {
        try {
            const res = await fetch(`/api/guest/${guest._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !guest.isActive }),
            });
            const json = await res.json();
            if (json.success) {
                await loadGuests();
                toast.success(
                    !guest.isActive
                        ? t("guests.activated") || "تم تفعيل الحساب"
                        : t("guests.deactivated") || "تم إيقاف الحساب"
                );
            } else {
                toast.error(json.message || t("guests.updateFailed") || "فشل تحديث الحالة");
            }
        } catch (err) {
            console.error("Error toggling guest status:", err);
            toast.error(t("guests.updateError") || "حصل خطأ أثناء التحديث");
        }
    };

    const onDelete = async (id, name) => {
        toast(
            (toastInstance) => (
                <div className="w-404 max-w-full bg-white dark:bg-darkmode rounded-14 shadow-round-box p-4">
                    <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-600 font-bold">
                            !
                        </div>
                        <div className="flex-1">
                            <p className="text-16 font-semibold">
                                {t("common.delete")} {t("common.guest") || "Guest"}
                            </p>
                            <p className="text-14 mt-1 text-slate-500 dark:text-darktext">
                                {t("guests.deleteConfirm") || "متأكد إنك عاوز تمسح"} <strong>{name}</strong>؟
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            className="px-3 py-1 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded-14 text-15 hover:opacity-90 border border-PeriwinkleBorder/50"
                            onClick={() => toast.dismiss(toastInstance.id)}
                        >
                            {t("common.cancel")}
                        </button>
                        <button
                            className="px-3 py-1 bg-red-600 text-white rounded-14 text-15 hover:bg-red-700 shadow-sm"
                            onClick={async () => {
                                toast.dismiss(toastInstance.id);
                                try {
                                    const res = await fetch(`/api/guest/${id}`, { method: "DELETE" });
                                    if (res.ok) {
                                        await loadGuests();
                                        toast.success(t("guests.deletedSuccess") || "تم حذف الجيست");
                                    } else {
                                        const error = await res.json();
                                        toast.error(error.message || t("guests.deleteFailed") || "فشل الحذف");
                                    }
                                } catch (err) {
                                    console.error("Error deleting guest:", err);
                                    toast.error(t("guests.deleteError") || "حصل خطأ أثناء الحذف");
                                }
                            }}
                        >
                            {t("common.delete")}
                        </button>
                    </div>
                </div>
            ),
            { duration: Infinity, position: "top-center" }
        );
    };

    if (loading && guests.length === 0) {
        return (
            <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4 md:space-y-6 p-2 md:p-0">

            {/* Header */}
            <div className="bg-white dark:bg-darkmode rounded-xl shadow-sm p-4 md:p-6 border border-PowderBlueBorder dark:border-dark_border">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Users className="w-5 h-5 md:w-7 md:h-7 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-MidnightNavyText dark:text-white">
                                {t("guests.management") || "إدارة الجيست"}
                            </h1>
                            <p className="text-xs md:text-sm text-SlateBlueText dark:text-darktext">
                                {t("guests.managementDescription") || "الحسابات اللي لسه مالهاش دور محدد (Student / Instructor)"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onAddNew}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>{t("guests.addNew") || "إضافة جيست"}</span>
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] md:text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                                {t("guests.stats.total") || "الإجمالي"}
                            </p>
                            <p className="text-lg md:text-2xl font-bold text-MidnightNavyText dark:text-white mt-0.5">
                                {stats.total}
                            </p>
                        </div>
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] md:text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                                {t("guests.stats.active") || "فعّال"}
                            </p>
                            <p className="text-lg md:text-2xl font-bold text-MidnightNavyText dark:text-white mt-0.5">
                                {stats.active}
                            </p>
                        </div>
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                            <Shield className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] md:text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                                {t("guests.stats.inactive") || "موقوف"}
                            </p>
                            <p className="text-lg md:text-2xl font-bold text-MidnightNavyText dark:text-white mt-0.5">
                                {stats.inactive}
                            </p>
                        </div>
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                            <ShieldOff className="w-4 h-4 md:w-5 md:h-5 text-red-600 dark:text-red-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                    <p className="text-[10px] md:text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide mb-1.5">
                        {t("guests.stats.byProvider") || "مصدر التسجيل"}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                        {Object.entries(stats.byProvider).map(([key, count]) => {
                            const meta = PROVIDER_META[key];
                            if (!meta) return null;
                            const Icon = meta.icon;
                            return (
                                <span
                                    key={key}
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${meta.className}`}
                                >
                                    <Icon className="w-3 h-3" />
                                    {count}
                                </span>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                    <Filter className="w-3.5 h-3.5" />
                    {t("guests.filters") || "الفلاتر"}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div className="md:col-span-2 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t("guests.searchPlaceholder") || "دور بالاسم / الإيميل / اليوزرنيم..."}
                            value={filters.search}
                            onChange={(e) => handleFilterChange("search", e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && loadGuests()}
                            className="w-full pl-10 pr-4 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
                        />
                    </div>

                    <select
                        value={filters.authProvider}
                        onChange={(e) => handleFilterChange("authProvider", e.target.value)}
                        className="px-3 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
                    >
                        <option value="">{t("guests.filterAllProviders") || "كل مصادر التسجيل"}</option>
                        <option value="credentials">Email</option>
                        <option value="google">Google</option>
                        <option value="github">GitHub</option>
                    </select>

                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange("status", e.target.value)}
                        className="px-3 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
                    >
                        <option value="">{t("guests.filterAllStatus") || "كل الحالات"}</option>
                        <option value="active">{t("guests.active") || "فعّال"}</option>
                        <option value="inactive">{t("guests.inactive") || "موقوف"}</option>
                    </select>

                    <select
                        value={filters.language}
                        onChange={(e) => handleFilterChange("language", e.target.value)}
                        className="px-3 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
                    >
                        <option value="">{t("guests.filterAllLanguages") || "كل اللغات"}</option>
                        <option value="ar">🇸🇦 عربي</option>
                        <option value="en">🇬🇧 English</option>
                    </select>
                </div>
                <div className="flex justify-end mt-3">
                    <button
                        onClick={() => loadGuests()}
                        className="px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center gap-2 text-sm"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>{t("guests.refresh") || "تحديث"}</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border shadow-sm overflow-hidden">
                <div className="overflow-x-auto -mx-2 md:mx-0">
                    <div className="min-w-full inline-block align-middle">
                        <table className="min-w-full divide-y divide-PowderBlueBorder dark:divide-dark_border">
                            <thead className="bg-gray-50 dark:bg-dark_input">
                                <tr>
                                    <th className="py-2.5 px-3 md:px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                                        <div className="flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5" />
                                            {t("guests.table.guest") || "المستخدم"}
                                        </div>
                                    </th>
                                    <th className="py-2.5 px-3 md:px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                                        {t("guests.table.provider") || "مصدر التسجيل"}
                                    </th>
                                    <th className="py-2.5 px-3 md:px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                                        <div className="flex items-center gap-1.5">
                                            <Globe className="w-3.5 h-3.5" />
                                            {t("guests.table.language") || "اللغة"}
                                        </div>
                                    </th>
                                    <th className="py-2.5 px-3 md:px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                                        <div className="flex items-center gap-1.5">
                                            <Hash className="w-3.5 h-3.5" />
                                            {t("guests.table.username") || "اليوزرنيم"}
                                        </div>
                                    </th>
                                    <th className="py-2.5 px-3 md:px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                                        <div className="flex items-center gap-1.5">
                                            <Phone className="w-3.5 h-3.5" />
                                            {t("guests.table.contact") || "التواصل"}
                                        </div>
                                    </th>
                                    <th className="py-2.5 px-3 md:px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {t("guests.table.joined") || "الانضمام"}
                                        </div>
                                    </th>
                                    <th className="py-2.5 px-3 md:px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                                        {t("guests.table.status") || "الحالة"}
                                    </th>
                                    <th className="py-2.5 px-3 md:px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                                        {t("guests.table.actions") || "إجراءات"}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-PowderBlueBorder dark:divide-dark_border">
                                {guests.map((guest) => {
                                    const lang = getLanguageLabel(guest.language);
                                    const provider = PROVIDER_META[guest.authProvider] || PROVIDER_META.credentials;
                                    const ProviderIcon = provider.icon;
                                    return (
                                        <tr
                                            key={guest._id}
                                            className="hover:bg-gray-50 dark:hover:bg-dark_input transition-colors"
                                        >
                                            {/* Guest */}
                                            <td className="py-2.5 px-3 md:px-4">
                                                <div className="flex items-center gap-2.5">
                                                    <img
                                                        src={guest.image || "/images/default-avatar.jpg"}
                                                        alt={guest.name}
                                                        onError={(e) => { e.target.src = "/images/default-avatar.jpg"; }}
                                                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-sm text-MidnightNavyText dark:text-white truncate max-w-[120px] md:max-w-none">
                                                            {guest.name}
                                                        </p>
                                                        <p className="text-xs text-SlateBlueText dark:text-darktext truncate max-w-[120px] md:max-w-none">
                                                            {guest.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Provider */}
                                            <td className="py-2.5 px-3 md:px-4">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${provider.className}`}>
                                                    <ProviderIcon className="w-3 h-3" />
                                                    {provider.label}
                                                </span>
                                            </td>

                                            {/* Language */}
                                            <td className="py-2.5 px-3 md:px-4">
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                                    {lang.flag} {lang.label}
                                                </span>
                                            </td>

                                            {/* Username */}
                                            <td className="py-2.5 px-3 md:px-4">
                                                <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                                    @{guest.username || "N/A"}
                                                </span>
                                            </td>

                                            {/* Contact */}
                                            <td className="py-2.5 px-3 md:px-4">
                                                <div className="flex items-center gap-1 text-xs">
                                                    <Phone className="w-3 h-3 flex-shrink-0" />
                                                    <span className="truncate max-w-[80px] md:max-w-none">
                                                        {guest.profile?.phone || t("guests.table.noPhone") || "لا يوجد"}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Joined */}
                                            <td className="py-2.5 px-3 md:px-4">
                                                <div className="flex items-center gap-1.5 text-xs text-SlateBlueText dark:text-darktext">
                                                    <Calendar className="w-3 h-3 flex-shrink-0" />
                                                    <span>{formatDate(guest.createdAt)}</span>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="py-2.5 px-3 md:px-4">
                                                <button
                                                    onClick={() => toggleActive(guest)}
                                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                                                        guest.isActive
                                                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200"
                                                            : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200"
                                                    }`}
                                                    title={t("guests.toggleStatus") || "اضغط لتغيير الحالة"}
                                                >
                                                    {guest.isActive ? <Shield className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                                                    {guest.isActive ? t("guests.active") || "فعّال" : t("guests.inactive") || "موقوف"}
                                                </button>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-2.5 px-3 md:px-4">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => onView(guest._id)}
                                                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                        title={t("common.view")}
                                                    >
                                                        <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                                    </button>
                                                    <button
                                                        onClick={() => onEdit(guest)}
                                                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                        title={t("guests.editOrPromote") || "تعديل / ترقية"}
                                                    >
                                                        <UserCheck className="w-3.5 h-3.5 text-primary" />
                                                    </button>
                                                    <button
                                                        onClick={() => onDelete(guest._id, guest.name)}
                                                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                        title={t("common.delete")}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Empty State */}
                {guests.length === 0 && !loading && (
                    <div className="text-center py-8 md:py-12 px-4">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                            <Users className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                        </div>
                        <h3 className="text-base md:text-lg font-bold text-MidnightNavyText dark:text-white mb-1 md:mb-2">
                            {t("guests.noGuests") || "مفيش جيست دلوقتي"}
                        </h3>
                        <p className="text-xs md:text-sm text-SlateBlueText dark:text-darktext mb-4 md:mb-6 max-w-md mx-auto">
                            {filters.search || filters.authProvider || filters.status || filters.language
                                ? t("guests.noMatchingResults") || "مفيش نتايج مطابقة للفلتر"
                                : t("guests.noGuestsDescription") || "الحسابات الجديدة هتظهر هنا تلقائي، أو ضيف واحد يدوي"}
                        </p>
                        <button
                            onClick={onAddNew}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium text-sm transition-colors"
                        >
                            <UserPlus className="w-4 h-4" />
                            {t("guests.addFirst") || "إضافة أول جيست"}
                        </button>
                    </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="px-3 md:px-4 py-3 border-t border-PowderBlueBorder dark:border-dark_border">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
                            <div className="text-xs text-SlateBlueText dark:text-darktext">
                                {t("guests.pagination.showing") || "بعرض"}{" "}
                                <span className="font-medium">
                                    {(pagination.page - 1) * pagination.limit + 1}
                                </span>{" "}
                                {t("guests.pagination.to") || "إلى"}{" "}
                                <span className="font-medium">
                                    {Math.min(pagination.page * pagination.limit, pagination.totalGuests)}
                                </span>{" "}
                                {t("guests.pagination.of") || "من"}{" "}
                                <span className="font-medium">{pagination.totalGuests}</span>{" "}
                                {t("guests.pagination.guests") || "جيست"}
                            </div>
                            <div className="flex items-center gap-1 md:gap-2">
                                <button
                                    onClick={() => handleFilterChange("page", 1)}
                                    disabled={pagination.page === 1}
                                    className="p-1.5 md:p-2 border border-PowderBlueBorder dark:border-dark_border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-dark_input"
                                >
                                    <ChevronsLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                </button>
                                <button
                                    onClick={() => handleFilterChange("page", pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                    className="p-1.5 md:p-2 border border-PowderBlueBorder dark:border-dark_border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-dark_input"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                </button>
                                <span className="px-2 md:px-3 py-1 text-xs md:text-sm">
                                    {t("guests.pagination.page") || "صفحة"} {pagination.page}{" "}
                                    {t("guests.pagination.of") || "من"} {pagination.totalPages}
                                </span>
                                <button
                                    onClick={() => handleFilterChange("page", pagination.page + 1)}
                                    disabled={pagination.page === pagination.totalPages}
                                    className="p-1.5 md:p-2 border border-PowderBlueBorder dark:border-dark_border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-dark_input"
                                >
                                    <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                </button>
                                <button
                                    onClick={() => handleFilterChange("page", pagination.totalPages)}
                                    disabled={pagination.page === pagination.totalPages}
                                    className="p-1.5 md:p-2 border border-PowderBlueBorder dark:border-dark_border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-dark_input"
                                >
                                    <ChevronsRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            <Modal
                open={modalOpen}
                title={
                    isCreating
                        ? t("guestForm.addGuest") || "إضافة جيست جديد"
                        : editingGuest
                        ? t("guestForm.updateGuest") || "تعديل بيانات الجيست"
                        : t("guestForm.viewGuest") || "بيانات الجيست"
                }
                onClose={() => {
                    setModalOpen(false);
                    setEditingGuest(null);
                    setIsCreating(false);
                }}
                size="xl"
            >
                <GuestForm
                    initial={editingGuest}
                    isCreating={isCreating}
                    onClose={() => {
                        setModalOpen(false);
                        setEditingGuest(null);
                        setIsCreating(false);
                    }}
                    onSaved={onSaved}
                />
            </Modal>
        </div>
    );
}