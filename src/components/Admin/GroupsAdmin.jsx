"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
    Users,
    Plus,
    Edit,
    Trash2,
    Search,
    RefreshCw,
    Eye,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    UserPlus,
    PlayCircle,
    Hash,
    Target,
    Info
} from "lucide-react";
import Modal from "./Modal";
import GroupForm from "./GroupForm";
import AddStudentsToGroup from "./AddStudentsToGroup";
import InstructorNotificationModal from "./InstructorNotificationModal";
import MeetingLinksCheckModal from "./MeetingLinksCheckModal";
import GroupDetailsPage from "./GroupDetailsPage";
import { useI18n } from "@/i18n/I18nProvider";

export default function GroupsAdmin() {
    const { t, language } = useI18n();
    const router = useRouter();
    const isRTL = language === "ar";

    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    
    const [viewDetailsModal, setViewDetailsModal] = useState({
        open: false,
        groupId: null
    });

    const [instructorNotificationModal, setInstructorNotificationModal] = useState({
        open: false,
        groupData: null,
        instructors: []
    });

    const [meetingLinksModal, setMeetingLinksModal] = useState({
        open: false,
        groupId: null
    });

    const [pendingActivation, setPendingActivation] = useState({
        forceActivate: false,
        releaseReserved: false
    });

    const [addStudentsModalOpen, setAddStudentsModalOpen] = useState(false);
    const [selectedGroupForStudents, setSelectedGroupForStudents] = useState(null);

    const [filters, setFilters] = useState({
        search: "",
        status: "",
        courseId: "",
        page: 1,
        limit: 10
    });

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
    });

    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        draft: 0,
        completed: 0,
        cancelled: 0
    });

    const loadGroups = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: filters.page,
                limit: filters.limit,
                ...(filters.search && { search: filters.search }),
                ...(filters.status && { status: filters.status }),
                ...(filters.courseId && { courseId: filters.courseId })
            });

            const res = await fetch(`/api/groups?${queryParams}`, {
                cache: "no-store",
                headers: { 'Cache-Control': 'no-cache' }
            });

            const json = await res.json();

            if (json.success) {
                setGroups(json.data || []);
                if (json.pagination) setPagination(json.pagination);
                if (json.stats) setStats(json.stats);
            } else {
                toast.error(json.error || t("groups.load.failed"), { position: 'top-center' });
            }
        } catch (err) {
            console.error("Error loading groups:", err);
            toast.error(t("groups.load.failed"), { position: 'top-center' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadGroups();
    }, [filters.page, filters.status, filters.courseId]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
    };

    const onSaved = async () => {
        await loadGroups();
        toast.success(t("groups.saved.success"), { position: 'top-center' });
    };

    const onEdit = (group) => {
        setEditingGroup(group);
        setModalOpen(true);
    };

    const onViewDetails = (groupId) => {
        console.log(`📋 Opening details for group: ${groupId}`);
        setViewDetailsModal({
            open: true,
            groupId: groupId
        });
    };

    const onView = async (id) => {
        try {
            const res = await fetch(`/api/groups/${id}`);
            const json = await res.json();

            if (json.success) {
                setEditingGroup(json.data);
                setModalOpen(true);
            }
        } catch (err) {
            console.error("Error viewing group:", err);
            toast.error(t("groups.view.failed"), { position: 'top-center' });
        }
    };

    const onDelete = async (id, name) => {
        const confirmationModal = document.createElement('div');
        confirmationModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        confirmationModal.innerHTML = `
            <div class="bg-white dark:bg-darkmode rounded-xl shadow-xl max-w-md w-full p-6">
                <div class="flex items-start gap-4 mb-6">
                    <div class="flex-shrink-0">
                        <div class="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <svg class="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.196 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                    </div>
                    <div class="flex-1">
                        <h3 class="text-lg font-bold text-MidnightNavyText dark:text-white mb-2">
                            ${t("groups.delete.title")}
                        </h3>
                        <p class="text-sm text-gray-600 dark:text-gray-300">
                            ${t("groups.delete.confirm").replace("{name}", name)}
                        </p>
                        <p class="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">
                            ${t("groups.delete.warning")}
                        </p>
                    </div>
                </div>
                <div class="flex justify-end gap-3">
                    <button id="cancelDelete" class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        ${t("groups.delete.cancel")}
                    </button>
                    <button id="confirmDelete" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors">
                        ${t("groups.delete.confirmButton")}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(confirmationModal);

        document.getElementById('cancelDelete').onclick = () => {
            document.body.removeChild(confirmationModal);
        };

        document.getElementById('confirmDelete').onclick = async () => {
            const loadingToast = toast.loading(t("groups.delete.loading"), { position: 'top-center' });
            
            try {
                const res = await fetch(`/api/groups/${id}`, {
                    method: "DELETE",
                });

                if (res.ok) {
                    await loadGroups();
                    toast.success(t("groups.delete.success"), { id: loadingToast, position: 'top-center' });
                } else {
                    const error = await res.json();
                    toast.error(error.error || t("groups.delete.failed"), { id: loadingToast, position: 'top-center' });
                }
            } catch (err) {
                console.error("Error deleting group:", err);
                toast.error(t("groups.delete.failed"), { id: loadingToast, position: 'top-center' });
            } finally {
                document.body.removeChild(confirmationModal);
            }
        };

        confirmationModal.onclick = (e) => {
            if (e.target === confirmationModal) {
                document.body.removeChild(confirmationModal);
            }
        };
    };

    const onActivateWithNotification = async (groupId) => {
        console.log(`📂 Starting activation flow for group: ${groupId}`);

        if (!groupId) {
            toast.error(t("groups.activate.invalidId"), { position: 'top-center' });
            return;
        }

        setMeetingLinksModal({ open: true, groupId });
    };

    const onMeetingLinksCheckConfirmed = async (forceActivate, releaseReserved) => {
        const groupId = meetingLinksModal.groupId;
        
        setMeetingLinksModal({ open: false, groupId: null });
        setPendingActivation({ forceActivate, releaseReserved });

        try {
            const res = await fetch(`/api/groups/${groupId}`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
            });

            if (!res.ok) {
                throw new Error(`Failed to fetch group: ${res.status}`);
            }

            const json = await res.json();

            if (json.success && json.data) {
                setInstructorNotificationModal({
                    open: true,
                    groupData: json.data,
                    instructors: json.data.instructors || []
                });
            } else {
                throw new Error(json.error || t("groups.activate.loadError"));
            }
        } catch (err) {
            console.error("❌ Error loading group:", err);
            toast.error(err.message || t("groups.activate.loadError"), { position: 'top-center' });
        }
    };

    const handleActivateAndNotify = async (instructorMessages) => {
        const groupId = instructorNotificationModal?.groupData?._id || instructorNotificationModal?.groupData?.id;

        if (!groupId) {
            toast.error(t("groups.activate.invalidId"), { position: 'top-center' });
            return;
        }

        const loadingToast = toast.loading(t("groups.activate.loading"), { position: 'top-center' });

        try {
            const res = await fetch(`/api/groups/${groupId}/activate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    instructorMessages,
                    forceActivate: pendingActivation.forceActivate,
                    releaseReserved: pendingActivation.releaseReserved,
                })
            });

            const result = await res.json();

            if (res.ok && result.success) {
                await loadGroups();
                toast.success(t("groups.activate.success"), { id: loadingToast, position: 'top-center' });
                setInstructorNotificationModal({ open: false, groupData: null, instructors: [] });
                setPendingActivation({ forceActivate: false, releaseReserved: false });
            } else {
                toast.error(result.error || t("groups.activate.failed"), { id: loadingToast, position: 'top-center' });
            }
        } catch (err) {
            console.error("❌ Network Error:", err);
            toast.error(t("groups.activate.failed"), { id: loadingToast, position: 'top-center' });
        }
    };

    const onAddStudents = (groupId) => {
        setSelectedGroupForStudents(groupId);
        setAddStudentsModalOpen(true);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
            case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'active': return t("groups.status.active");
            case 'draft': return t("groups.status.draft");
            case 'completed': return t("groups.status.completed");
            case 'cancelled': return t("groups.status.cancelled");
            default: return status;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return 'N/A';
        }
    };

    if (loading && groups.length === 0) {
        return (
            <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className={`space-y-4 md:space-y-6 p-2 md:p-0 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className="bg-white dark:bg-darkmode rounded-xl shadow-sm p-4 md:p-6 border border-PowderBlueBorder dark:border-dark_border">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1 md:space-y-2">
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Users className="w-5 h-5 md:w-7 md:h-7 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold text-MidnightNavyText dark:text-white">
                                    {t("groups.title")}
                                </h1>
                                <p className="text-xs md:text-sm text-SlateBlueText dark:text-darktext">
                                    {t("groups.subtitle")}
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setEditingGroup(null);
                            setModalOpen(true);
                        }}
                        className="bg-primary hover:bg-primary/90 text-white px-4 py-2.5 md:px-6 md:py-3 rounded-lg font-semibold text-xs md:text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 w-full md:w-auto justify-center"
                    >
                        <Plus className="w-4 h-4" />
                        {t("groups.create")}
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] md:text-xs text-SlateBlueText dark:text-darktext uppercase">
                                {t("groups.stats.total")}
                            </p>
                            <p className="text-lg md:text-2xl font-bold text-MidnightNavyText dark:text-white">
                                {stats.total}
                            </p>
                        </div>
                        <Users className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                    </div>
                </div>

                <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] md:text-xs text-SlateBlueText dark:text-darktext uppercase">
                                {t("groups.stats.active")}
                            </p>
                            <p className="text-lg md:text-2xl font-bold text-green-600">
                                {stats.active}
                            </p>
                        </div>
                        <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-green-600" />
                    </div>
                </div>

                <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] md:text-xs text-SlateBlueText dark:text-darktext uppercase">
                                {t("groups.stats.draft")}
                            </p>
                            <p className="text-lg md:text-2xl font-bold text-gray-600">
                                {stats.draft}
                            </p>
                        </div>
                        <AlertCircle className="w-8 h-8 md:w-10 md:h-10 text-gray-600" />
                    </div>
                </div>

                <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] md:text-xs text-SlateBlueText dark:text-darktext uppercase">
                                {t("groups.stats.completed")}
                            </p>
                            <p className="text-lg md:text-2xl font-bold text-blue-600">
                                {stats.completed}
                            </p>
                        </div>
                        <Target className="w-8 h-8 md:w-10 md:h-10 text-blue-600" />
                    </div>
                </div>

                <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] md:text-xs text-SlateBlueText dark:text-darktext uppercase">
                                {t("groups.stats.cancelled")}
                            </p>
                            <p className="text-lg md:text-2xl font-bold text-red-600">
                                {stats.cancelled}
                            </p>
                        </div>
                        <XCircle className="w-8 h-8 md:w-10 md:h-10 text-red-600" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                <div className="space-y-3 md:space-y-0 md:flex md:items-center md:gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400`} />
                            <input
                                type="text"
                                placeholder={t("groups.filters.search")}
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary dark:bg-dark_input dark:text-white`}
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="px-3 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary dark:bg-dark_input dark:text-white"
                        >
                            <option value="">{t("groups.filters.all")}</option>
                            <option value="draft">{t("groups.status.draft")}</option>
                            <option value="active">{t("groups.status.active")}</option>
                            <option value="completed">{t("groups.status.completed")}</option>
                            <option value="cancelled">{t("groups.status.cancelled")}</option>
                        </select>

                        <button
                            onClick={() => loadGroups()}
                            className="px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center gap-2 text-sm"
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span className="hidden md:inline">{t("groups.filters.refresh")}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Groups Table */}
            <div className="bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-PowderBlueBorder dark:divide-dark_border">
                        <thead className="bg-gray-50 dark:bg-dark_input">
                            <tr>
                                <th className="py-3 px-4 text-right text-xs font-semibold text-MidnightNavyText dark:text-white uppercase">
                                    {t("groups.table.group")}
                                </th>
                                <th className="py-3 px-4 text-right text-xs font-semibold text-MidnightNavyText dark:text-white uppercase">
                                    {t("groups.table.course")}
                                </th>
                                <th className="py-3 px-4 text-right text-xs font-semibold text-MidnightNavyText dark:text-white uppercase">
                                    {t("groups.table.status")}
                                </th>
                                <th className="py-3 px-4 text-right text-xs font-semibold text-MidnightNavyText dark:text-white uppercase">
                                    {t("groups.table.students")}
                                </th>
                                <th className="py-3 px-4 text-right text-xs font-semibold text-MidnightNavyText dark:text-white uppercase">
                                    {t("groups.table.sessions")}
                                </th>
                                <th className="py-3 px-4 text-right text-xs font-semibold text-MidnightNavyText dark:text-white uppercase">
                                    {t("groups.table.actions")}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-PowderBlueBorder dark:divide-dark_border">
                            {groups.map((group) => (
                                <tr key={group.id} className="hover:bg-gray-50 dark:hover:bg-dark_input transition-colors">
                                    <td className="py-3 px-4">
                                        <div>
                                            <p className="font-medium text-sm text-MidnightNavyText dark:text-white">
                                                {group.name}
                                            </p>
                                            <p className="text-xs text-SlateBlueText dark:text-darktext flex items-center gap-1">
                                                <Hash className="w-3 h-3" />
                                                {group.code}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <p className="text-sm text-MidnightNavyText dark:text-white">
                                            {group.course?.title || 'N/A'}
                                        </p>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(group.status)}`}>
                                            {getStatusLabel(group.status)}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm">
                                                {group.studentsCount}/{group.maxStudents}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="text-sm">
                                            {group.sessionsGenerated ? (
                                                <span className="text-green-600 flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" />
                                                    {group.totalSessions}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">{t("groups.sessions.notGenerated")}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => onViewDetails(group.id)}
                                                className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                                                title={t("groups.actions.viewDetails")}
                                            >
                                                <Info className="w-4 h-4 text-blue-600" />
                                            </button>
                                            
                                            {group.status === 'draft' && (
                                                <button
                                                    onClick={() => onActivateWithNotification(group.id)}
                                                    className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                                                    title={t("groups.actions.activate")}
                                                >
                                                    <PlayCircle className="w-4 h-4 text-green-600" />
                                                </button>
                                            )}
                                            
                                            {group.status === 'active' && !group.isFull && (
                                                <button
                                                    onClick={() => onAddStudents(group.id)}
                                                    className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                                                    title={t("groups.actions.addStudents")}
                                                >
                                                    <UserPlus className="w-4 h-4 text-blue-600" />
                                                </button>
                                            )}
                                            
                                            {group.sessionsGenerated && (
                                                <button
                                                    onClick={() => router.push(`/admin/sessions?groupId=${group.id}`)}
                                                    className="p-1.5 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded transition-colors"
                                                    title={t("groups.actions.viewSessions")}
                                                >
                                                    <Calendar className="w-4 h-4 text-purple-600" />
                                                </button>
                                            )}
                                            
                                            <button
                                                onClick={() => onEdit(group)}
                                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                title={t("groups.actions.edit")}
                                            >
                                                <Edit className="w-4 h-4 text-primary" />
                                            </button>
                                            
                                            <button
                                                onClick={() => onDelete(group.id, group.name)}
                                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                title={t("groups.actions.delete")}
                                            >
                                                <Trash2 className="w-4 h-4 text-red-600" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Empty State */}
                {groups.length === 0 && !loading && (
                    <div className="text-center py-12 px-4">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold mb-2">{t("groups.empty.title")}</h3>
                        <p className="text-sm text-gray-500 mb-6">{t("groups.empty.description")}</p>
                        <button
                            onClick={() => setModalOpen(true)}
                            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-semibold flex items-center gap-2 mx-auto"
                        >
                            <Plus className="w-4 h-4" />
                            {t("groups.empty.button")}
                        </button>
                    </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-PowderBlueBorder dark:border-dark_border">
                        <div className="flex items-center justify-between">
                            <div className="text-xs text-SlateBlueText">
                                {t("groups.pagination.showing")
                                    .replace("{start}", ((pagination.page - 1) * pagination.limit + 1).toString())
                                    .replace("{end}", Math.min(pagination.page * pagination.limit, pagination.total).toString())
                                    .replace("{total}", pagination.total.toString())}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleFilterChange('page', 1)}
                                    disabled={pagination.page === 1}
                                    className="p-2 border rounded disabled:opacity-50"
                                >
                                    <ChevronsRight className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleFilterChange('page', pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                    className="p-2 border rounded disabled:opacity-50"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                                <span className="px-3 py-1 text-sm">
                                    {t("groups.pagination.page")
                                        .replace("{page}", pagination.page.toString())
                                        .replace("{pages}", pagination.totalPages.toString())}
                                </span>
                                <button
                                    onClick={() => handleFilterChange('page', pagination.page + 1)}
                                    disabled={pagination.page === pagination.totalPages}
                                    className="p-2 border rounded disabled:opacity-50"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleFilterChange('page', pagination.totalPages)}
                                    disabled={pagination.page === pagination.totalPages}
                                    className="p-2 border rounded disabled:opacity-50"
                                >
                                    <ChevronsLeft className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            
            {/* Group Form Modal */}
            <Modal
                open={modalOpen}
                title={editingGroup ? t("groups.edit") : t("groups.createNew")}
                onClose={() => {
                    setModalOpen(false);
                    setEditingGroup(null);
                }}
                size="xl"
            >
                <GroupForm
                    initial={editingGroup}
                    onClose={() => {
                        setModalOpen(false);
                        setEditingGroup(null);
                    }}
                    onSaved={onSaved}
                />
            </Modal>

            {/* Group Details Modal */}
            <Modal
                open={viewDetailsModal.open}
                title="" 
                onClose={() => setViewDetailsModal({ open: false, groupId: null })}
                size="full"
            >
                <GroupDetailsPage
                    groupId={viewDetailsModal.groupId}
                    onClose={() => {
                        setViewDetailsModal({ open: false, groupId: null });
                        loadGroups();
                    }}
                />
            </Modal>

            {/* Add Students Modal */}
            <Modal
                open={addStudentsModalOpen}
                title={t("groups.actions.addStudents")}
                onClose={() => {
                    setAddStudentsModalOpen(false);
                    setSelectedGroupForStudents(null);
                }}
                size="xl"
            >
                <AddStudentsToGroup
                    groupId={selectedGroupForStudents}
                    onClose={() => {
                        setAddStudentsModalOpen(false);
                        setSelectedGroupForStudents(null);
                    }}
                    onStudentAdded={() => loadGroups()}
                />
            </Modal>

            {/* Meeting Links Check Modal */}
            <MeetingLinksCheckModal
                isOpen={meetingLinksModal.open}
                groupId={meetingLinksModal.groupId}
                onClose={() => setMeetingLinksModal({ open: false, groupId: null })}
                onConfirm={onMeetingLinksCheckConfirmed}
            />

            {/* Instructor Notification Modal */}
            <InstructorNotificationModal
                isOpen={instructorNotificationModal.open}
                onClose={() => {
                    setInstructorNotificationModal({ open: false, groupData: null, instructors: [] });
                    setPendingActivation({ forceActivate: false, releaseReserved: false });
                }}
                instructors={instructorNotificationModal.instructors}
                groupData={instructorNotificationModal.groupData}
                onSendNotifications={handleActivateAndNotify}
            />
        </div>
    );
}