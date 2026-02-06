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
    Hash,
    UserPlus,
    ShieldCheck
} from "lucide-react";
import Modal from "./Modal";
import AdminForm from "./AdminForm";
import { useI18n } from "@/i18n/I18nProvider";

export default function AdminManagement() {
    const { t } = useI18n();
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [filters, setFilters] = useState({
        search: "",
        page: 1,
        limit: 10
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        totalAdmins: 0,
        totalPages: 1
    });

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

    const loadAdmins = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: filters.page.toString(),
                limit: filters.limit.toString(),
                ...(filters.search && { search: filters.search })
            });

            const res = await fetch(`/api/admin?${queryParams}`, {
                cache: "no-store",
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });

            const json = await res.json();
            console.log("API Response:", json);

            if (json.success) {
                setAdmins(json.data || []);

                if (json.pagination) {
                    setPagination({
                        page: json.pagination.page || 1,
                        limit: json.pagination.limit || 10,
                        totalAdmins: json.pagination.totalAdmins || 0,
                        totalPages: json.pagination.totalPages || 1
                    });
                }
            } else {
                toast.error(json.message || t("admins.loadError") || "Failed to load admins");
            }
        } catch (err) {
            console.error("Error loading admins:", err);
            toast.error(t("admins.loadError") || "Failed to load admins");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAdmins();
    }, [filters.page]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
    };

    const onSaved = async () => {
        await loadAdmins();
        toast.success(
            isCreating
                ? t("admins.createdSuccess") || "Admin created successfully"
                : t("admins.savedSuccess") || "Admin updated successfully"
        );
    };

    const onAddNew = () => {
        setIsCreating(true);
        setEditingAdmin(null);
        setModalOpen(true);
    };

    const onEdit = (admin) => {
        setIsCreating(false);
        setEditingAdmin(admin);
        setModalOpen(true);
    };

    const onView = async (id) => {
        try {
            const res = await fetch(`/api/admin/${id}`);
            const json = await res.json();

            if (json.success) {
                setIsCreating(false);
                setEditingAdmin(json.data);
                setModalOpen(true);
            }
        } catch (err) {
            console.error("Error viewing admin:", err);
            toast.error(t("admins.loadError") || "Failed to load admin");
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
                                {t("common.delete") || "Delete"} {t("common.admin") || "Admin"}
                            </p>
                            <p className="text-14 mt-1 text-slate-500 dark:text-darktext">
                                {t("admins.deleteConfirm") || "Are you sure you want to delete"} <strong>{name}</strong>?
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            className="px-3 py-1 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded-14 text-15 hover:opacity-90 border border-PeriwinkleBorder/50"
                            onClick={() => toast.dismiss(toastInstance.id)}
                        >
                            {t("common.cancel") || "Cancel"}
                        </button>
                        <button
                            className="px-3 py-1 bg-red-600 text-white rounded-14 text-15 hover:bg-red-700 shadow-sm"
                            onClick={async () => {
                                toast.dismiss(toastInstance.id);
                                try {
                                    const res = await fetch(`/api/admin/${id}`, {
                                        method: "DELETE",
                                    });

                                    if (res.ok) {
                                        await loadAdmins();
                                        toast.success(t("admins.deletedSuccess") || "Admin deleted successfully");
                                    } else {
                                        const error = await res.json();
                                        toast.error(error.message || t("admins.deleteFailed") || "Failed to delete");
                                    }
                                } catch (err) {
                                    console.error("Error deleting admin:", err);
                                    toast.error(t("admins.deleteError") || "Error deleting admin");
                                }
                            }}
                        >
                            {t("common.delete") || "Delete"}
                        </button>
                    </div>
                </div>
            ),
            { duration: Infinity, position: "top-center" }
        );
    };

    if (loading && admins.length === 0) {
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
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                <ShieldCheck className="w-5 h-5 md:w-7 md:h-7 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold text-MidnightNavyText dark:text-white">
                                    {t("admins.management") || "System Administrators"}
                                </h1>
                                <p className="text-xs md:text-sm text-SlateBlueText dark:text-darktext">
                                    {t("admins.managementDescription") || "Manage platform administrators and system access"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Add New Admin Button */}
                    <button
                        onClick={onAddNew}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>{t("admins.addNew") || "Add New Admin"}</span>
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] md:text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                                {t("admins.stats.total") || "Total Admins"}
                            </p>
                            <p className="text-lg md:text-2xl font-bold text-MidnightNavyText dark:text-white mt-0.5">
                                {pagination.totalAdmins}
                            </p>
                        </div>
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                            <Users className="w-4 h-4 md:w-5 md:h-5 text-red-600 dark:text-red-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] md:text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                                {t("admins.stats.active") || "Active"}
                            </p>
                            <p className="text-lg md:text-2xl font-bold text-MidnightNavyText dark:text-white mt-0.5">
                                {admins.filter(a => a.isActive).length}
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
                                {t("admins.stats.thisMonth") || "This Month"}
                            </p>
                            <p className="text-lg md:text-2xl font-bold text-MidnightNavyText dark:text-white mt-0.5">
                                {admins.filter(a => {
                                    const createdDate = new Date(a.createdAt);
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
                                placeholder={t("admins.searchPlaceholder") || "Search by name, email or username..."}
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && loadAdmins()}
                                className="w-full pl-10 pr-4 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => loadAdmins()}
                            className="px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center gap-2 text-sm"
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span className="hidden md:inline">{t("admins.refresh") || "Refresh"}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Admins Table */}
            <div className="bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border shadow-sm overflow-hidden">
                <div className="overflow-x-auto -mx-2 md:mx-0">
                    <div className="min-w-full inline-block align-middle">
                        <table className="min-w-full divide-y divide-PowderBlueBorder dark:divide-dark_border">
                            <thead className="bg-gray-50 dark:bg-dark_input">
                                <tr>
                                    <th className="py-2.5 px-3 md:px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                                        <div className="flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5" />
                                            {t("admins.table.admin") || "Administrator"}
                                        </div>
                                    </th>
                                    <th className="py-2.5 px-3 md:px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                                        <div className="flex items-center gap-1.5">
                                            <Hash className="w-3.5 h-3.5" />
                                            {t("admins.table.username") || "Username"}
                                        </div>
                                    </th>
                                    <th className="py-2.5 px-3 md:px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                                        <div className="flex items-center gap-1.5">
                                            <Phone className="w-3.5 h-3.5" />
                                            {t("admins.table.contact") || "Contact"}
                                        </div>
                                    </th>
                                    <th className="py-2.5 px-3 md:px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {t("admins.table.joined") || "Joined"}
                                        </div>
                                    </th>
                                    <th className="py-2.5 px-3 md:px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                                        {t("admins.table.actions") || "Actions"}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-PowderBlueBorder dark:divide-dark_border">
                                {admins.map((admin) => (
                                    <tr key={admin._id} className="hover:bg-gray-50 dark:hover:bg-dark_input transition-colors">
                                        <td className="py-2.5 px-3 md:px-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="relative">
                                                    <img
                                                        src={admin.image || "/images/default-avatar.jpg"}
                                                        alt={admin.name}
                                                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                                    />
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-darkmode"></div>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-sm text-MidnightNavyText dark:text-white truncate max-w-[120px] md:max-w-none">
                                                        {admin.name}
                                                    </p>
                                                    <p className="text-xs text-SlateBlueText dark:text-darktext truncate max-w-[120px] md:max-w-none">
                                                        {admin.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-3 md:px-4">
                                            <span className="font-mono text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded">
                                                @{admin.username || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3 md:px-4">
                                            <div className="flex items-center gap-1 text-xs">
                                                <Phone className="w-3 h-3 flex-shrink-0" />
                                                <span className="truncate max-w-[80px] md:max-w-none">
                                                    {admin.profile?.phone || t("admins.table.noPhone") || "No phone"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-3 md:px-4">
                                            <div className="flex items-center gap-1.5 text-xs text-SlateBlueText dark:text-darktext">
                                                <Calendar className="w-3 h-3 flex-shrink-0" />
                                                <span>{formatDate(admin.createdAt)}</span>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-3 md:px-4">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => onView(admin._id)}
                                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                    title={t("common.view") || "View"}
                                                >
                                                    <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                                </button>
                                                <button
                                                    onClick={() => onEdit(admin)}
                                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                    title={t("common.edit") || "Edit"}
                                                >
                                                    <Edit className="w-3.5 h-3.5 text-primary" />
                                                </button>
                                                <button
                                                    onClick={() => onDelete(admin._id, admin.name)}
                                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                    title={t("common.delete") || "Delete"}
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
                {admins.length === 0 && !loading && (
                    <div className="text-center py-8 md:py-12 px-4">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                            <ShieldCheck className="w-6 h-6 md:w-8 md:h-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-base md:text-lg font-bold text-MidnightNavyText dark:text-white mb-1 md:mb-2">
                            {t("admins.noAdmins") || "No Administrators Found"}
                        </h3>
                        <p className="text-xs md:text-sm text-SlateBlueText dark:text-darktext mb-4 md:mb-6 max-w-md mx-auto">
                            {filters.search
                                ? t("admins.noMatchingResults") || "No results match your search criteria"
                                : t("admins.noAdminsDescription") || "Add system administrators to manage the platform"}
                        </p>
                        <button
                            onClick={onAddNew}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors"
                        >
                            <UserPlus className="w-4 h-4" />
                            {t("admins.addFirst") || "Add Your First Admin"}
                        </button>
                    </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="px-3 md:px-4 py-3 border-t border-PowderBlueBorder dark:border-dark_border">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
                            <div className="text-xs text-SlateBlueText dark:text-darktext">
                                {t("admins.pagination.showing") || "Showing"} <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> {t("admins.pagination.to") || "to"}{" "}
                                <span className="font-medium">
                                    {Math.min(pagination.page * pagination.limit, pagination.totalAdmins)}
                                </span>{" "}
                                {t("admins.pagination.of") || "of"} <span className="font-medium">{pagination.totalAdmins}</span> {t("admins.pagination.admins") || "admins"}
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
                                    {t("admins.pagination.page") || "Page"} {pagination.page} {t("admins.pagination.of") || "of"} {pagination.totalPages}
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
                title={
                    isCreating
                        ? t("adminForm.addAdmin") || "Add New Administrator"
                        : editingAdmin
                            ? t("adminForm.updateAdmin") || "Update Administrator"
                            : t("adminForm.viewAdmin") || "View Administrator"
                }
                onClose={() => {
                    setModalOpen(false);
                    setEditingAdmin(null);
                    setIsCreating(false);
                }}
                size="md"
            >
                <AdminForm
                    initial={editingAdmin}
                    isCreating={isCreating}
                    onClose={() => {
                        setModalOpen(false);
                        setEditingAdmin(null);
                        setIsCreating(false);
                    }}
                    onSaved={onSaved}
                />
            </Modal>
        </div>
    );
}