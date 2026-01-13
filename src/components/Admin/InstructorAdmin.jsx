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
    Mail,
    Phone,
    Calendar,
    Eye,
    UserCog,
    Shield,
    Hash
} from "lucide-react";
import Modal from "./Modal";
import InstructorForm from "./InstructorForm";
import { useI18n } from "@/i18n/I18nProvider";

export default function InstructorAdmin() {
    const { t } = useI18n();
    const [instructors, setInstructors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingInstructor, setEditingInstructor] = useState(null);
    const [filters, setFilters] = useState({
        search: "",
        page: 1,
        limit: 10
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        totalInstructors: 0,
        totalPages: 1
    });

    // تنسيق التاريخ
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return 'N/A';
        }
    };

    // تحميل المدرسين
    const loadInstructors = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: filters.page.toString(),
                limit: filters.limit.toString(),
                ...(filters.search && { search: filters.search })
            });

            const res = await fetch(`/api/instructor?${queryParams}`, {
                cache: "no-store",
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });

            const json = await res.json();
            console.log("API Response:", json);

            if (json.success) {
                setInstructors(json.data || []);

                if (json.pagination) {
                    setPagination({
                        page: json.pagination.page || 1,
                        limit: json.pagination.limit || 10,
                        totalInstructors: json.pagination.totalInstructors || 0,
                        totalPages: json.pagination.totalPages || 1
                    });
                }
            } else {
                toast.error(json.message || t("instructors.loadError"));
            }
        } catch (err) {
            console.error("Error loading instructors:", err);
            toast.error(t("instructors.loadError"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInstructors();
    }, [filters.page]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
    };

    const onSaved = async () => {
        await loadInstructors();
        toast.success(t("instructors.savedSuccess"));
    };

    const onEdit = (instructor) => {
        setEditingInstructor(instructor);
        setModalOpen(true);
    };

    const onView = async (id) => {
        try {
            const res = await fetch(`/api/instructor/${id}`);
            const json = await res.json();

            if (json.success) {
                setEditingInstructor(json.data);
                setModalOpen(true);
            }
        } catch (err) {
            console.error("Error viewing instructor:", err);
            toast.error(t("instructors.loadError"));
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
                                {t("common.delete")} {t("common.instructor")}
                            </p>
                            <p className="text-14 mt-1 text-slate-500 dark:text-darktext">
                                {t("instructors.deleteConfirm")} <strong>{name}</strong>?
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
                                    const res = await fetch(`/api/instructors/${id}`, {
                                        method: "DELETE",
                                    });

                                    if (res.ok) {
                                        await loadInstructors();
                                        toast.success(t("instructors.deletedSuccess"));
                                    } else {
                                        const error = await res.json();
                                        toast.error(error.message || t("instructors.deleteFailed"));
                                    }
                                } catch (err) {
                                    console.error("Error deleting instructor:", err);
                                    toast.error(t("instructors.deleteError"));
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

    if (loading && instructors.length === 0) {
        return (
            <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4 md:space-y-6 p-2 md:p-0">
            {/* Header Section */}
            <div className="bg-white dark:bg-darkmode rounded-xl shadow-sm p-4 md:p-6 border border-PowderBlueBorder dark:border-dark_border">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1 md:space-y-2">
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <UserCog className="w-5 h-5 md:w-7 md:h-7 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold text-MidnightNavyText dark:text-white">
                                    {t("instructors.management")}
                                </h1>
                                <p className="text-xs md:text-sm text-SlateBlueText dark:text-darktext">
                                    {t("instructors.managementDescription")}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] md:text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                                {t("instructors.stats.total")}
                            </p>
                            <p className="text-lg md:text-2xl font-bold text-MidnightNavyText dark:text-white mt-0.5">
                                {pagination.totalInstructors}
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
                                {t("instructors.stats.active")}
                            </p>
                            <p className="text-lg md:text-2xl font-bold text-MidnightNavyText dark:text-white mt-0.5">
                                {instructors.filter(i => i.isActive).length}
                            </p>
                        </div>
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                            <Shield className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm col-span-2 md:col-span-1">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] md:text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                                {t("instructors.stats.thisMonth")}
                            </p>
                            <p className="text-lg md:text-2xl font-bold text-MidnightNavyText dark:text-white mt-0.5">
                                {instructors.filter(i => {
                                    const createdDate = new Date(i.createdAt);
                                    const now = new Date();
                                    return createdDate.getMonth() === now.getMonth() &&
                                        createdDate.getFullYear() === now.getFullYear();
                                }).length}
                            </p>
                        </div>
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <Calendar className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                <div className="space-y-3 md:space-y-0 md:flex md:items-center md:gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t("instructors.searchPlaceholder")}
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && loadInstructors()}
                                className="w-full pl-10 pr-4 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => loadInstructors()}
                            className="px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center gap-2 text-sm"
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span className="hidden md:inline">{t("instructors.refresh")}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Instructors Table */}
            <div className="bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border shadow-sm overflow-hidden">
                <div className="overflow-x-auto -mx-2 md:mx-0">
                    <div className="min-w-full inline-block align-middle">
                        <table className="min-w-full divide-y divide-PowderBlueBorder dark:divide-dark_border">
                            <thead className="bg-gray-50 dark:bg-dark_input">
                                <tr>
                                    <th className="py-2.5 px-3 md:px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                                        <div className="flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5" />
                                            {t("instructors.table.instructor")}
                                        </div>
                                    </th>
                                    <th className="py-2.5 px-3 md:px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                                        <div className="flex items-center gap-1.5">
                                            <Hash className="w-3.5 h-3.5" />
                                            {t("instructors.table.username")}
                                        </div>
                                    </th>
                                    <th className="py-2.5 px-3 md:px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                                        <div className="flex items-center gap-1.5">
                                            <Phone className="w-3.5 h-3.5" />
                                            {t("instructors.table.contact")}
                                        </div>
                                    </th>
                                    <th className="py-2.5 px-3 md:px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {t("instructors.table.joined")}
                                        </div>
                                    </th>
                                    <th className="py-2.5 px-3 md:px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                                        {t("instructors.table.actions")}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-PowderBlueBorder dark:divide-dark_border">
                                {instructors.map((instructor) => (
                                    <tr key={instructor._id} className="hover:bg-gray-50 dark:hover:bg-dark_input transition-colors">
                                        <td className="py-2.5 px-3 md:px-4">
                                            <div className="flex items-center gap-2.5">
                                                <img
                                                    src={instructor.image || "/images/default-avatar.jpg"}
                                                    alt={instructor.name}
                                                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                                />
                                                <div className="min-w-0">
                                                    <p className="font-medium text-sm text-MidnightNavyText dark:text-white truncate max-w-[120px] md:max-w-none">
                                                        {instructor.name}
                                                    </p>
                                                    <p className="text-xs text-SlateBlueText dark:text-darktext truncate max-w-[120px] md:max-w-none">
                                                        {instructor.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-3 md:px-4">
                                            <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                                @{instructor.username || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3 md:px-4">
                                            <div className="flex items-center gap-1 text-xs">
                                                <Phone className="w-3 h-3 flex-shrink-0" />
                                                <span className="truncate max-w-[80px] md:max-w-none">
                                                    {instructor.profile?.phone || t("instructors.table.noPhone")}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-3 md:px-4">
                                            <div className="flex items-center gap-1.5 text-xs text-SlateBlueText dark:text-darktext">
                                                <Calendar className="w-3 h-3 flex-shrink-0" />
                                                <span>{formatDate(instructor.createdAt)}</span>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-3 md:px-4">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => onView(instructor._id)}
                                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                    title={t("common.view")}
                                                >
                                                    <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                                </button>
                                                <button
                                                    onClick={() => onEdit(instructor)}
                                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                    title={t("common.edit")}
                                                >
                                                    <Edit className="w-3.5 h-3.5 text-primary" />
                                                </button>
                                                <button
                                                    onClick={() => onDelete(instructor._id, instructor.name)}
                                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                    title={t("common.delete")}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Empty State */}
                {instructors.length === 0 && !loading && (
                    <div className="text-center py-8 md:py-12 px-4">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                            <Users className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                        </div>
                        <h3 className="text-base md:text-lg font-bold text-MidnightNavyText dark:text-white mb-1 md:mb-2">
                            {t("instructors.noInstructors")}
                        </h3>
                        <p className="text-xs md:text-sm text-SlateBlueText dark:text-darktext mb-4 md:mb-6 max-w-md mx-auto">
                            {filters.search
                                ? t("instructors.noMatchingResults")
                                : t("instructors.noInstructorsDescription")}
                        </p>
                    </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="px-3 md:px-4 py-3 border-t border-PowderBlueBorder dark:border-dark_border">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
                            <div className="text-xs text-SlateBlueText dark:text-darktext">
                                {t("instructors.pagination.showing")} <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> {t("instructors.pagination.to")}{" "}
                                <span className="font-medium">
                                    {Math.min(pagination.page * pagination.limit, pagination.totalInstructors)}
                                </span>{" "}
                                {t("instructors.pagination.of")} <span className="font-medium">{pagination.totalInstructors}</span> {t("instructors.pagination.instructors")}
                            </div>
                            <div className="flex items-center gap-1 md:gap-2">
                                <button
                                    onClick={() => handleFilterChange('page', 1)}
                                    disabled={pagination.page === 1}
                                    className="p-1.5 md:p-2 border border-PowderBlueBorder dark:border-dark_border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-dark_input"
                                >
                                    <ChevronsLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                </button>
                                <button
                                    onClick={() => handleFilterChange('page', pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                    className="p-1.5 md:p-2 border border-PowderBlueBorder dark:border-dark_border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-dark_input"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                </button>
                                <span className="px-2 md:px-3 py-1 text-xs md:text-sm">
                                    {t("instructors.pagination.page")} {pagination.page} {t("instructors.pagination.of")} {pagination.totalPages}
                                </span>
                                <button
                                    onClick={() => handleFilterChange('page', pagination.page + 1)}
                                    disabled={pagination.page === pagination.totalPages}
                                    className="p-1.5 md:p-2 border border-PowderBlueBorder dark:border-dark_border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-dark_input"
                                >
                                    <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                </button>
                                <button
                                    onClick={() => handleFilterChange('page', pagination.totalPages)}
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
                title={editingInstructor ? t("instructorForm.updateInstructor") : t("instructorForm.viewInstructor")}
                onClose={() => {
                    setModalOpen(false);
                    setEditingInstructor(null);
                }}
                size="md"
            >
                <InstructorForm
                    initial={editingInstructor}
                    onClose={() => {
                        setModalOpen(false);
                        setEditingInstructor(null);
                    }}
                    onSaved={onSaved}
                />
            </Modal>
        </div>
    );
}