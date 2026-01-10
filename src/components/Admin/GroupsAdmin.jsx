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
    Filter,
    RefreshCw,
    Eye,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    BookOpen,
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    TrendingUp,
    UserPlus,
    PlayCircle,
    Hash,
    DollarSign,
    Target
} from "lucide-react";
import Modal from "./Modal";
import GroupForm from "./GroupForm";
import AddStudentsToGroup from "./AddStudentsToGroup";
import { useI18n } from "@/i18n/I18nProvider";

export default function GroupsAdmin() {
    const { t } = useI18n();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
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
    const [addStudentsModalOpen, setAddStudentsModalOpen] = useState(false);
    const [selectedGroupForStudents, setSelectedGroupForStudents] = useState(null);
    const router = useRouter();

    // تحميل المجموعات
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
            console.log("Groups API Response:", json);

            if (json.success) {
                setGroups(json.data || []);

                if (json.pagination) {
                    setPagination(json.pagination);
                }

                if (json.stats) {
                    setStats(json.stats);
                }
            } else {
                toast.error(json.error || "Failed to load groups");
            }
        } catch (err) {
            console.error("Error loading groups:", err);
            toast.error("Failed to load groups");
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
        toast.success("Group saved successfully!");
    };

    const onEdit = (group) => {
        setEditingGroup(group);
        setModalOpen(true);
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
            toast.error("Failed to load group");
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
                            <p className="text-16 font-semibold">Delete Group</p>
                            <p className="text-14 mt-1 text-slate-500 dark:text-darktext">
                                Are you sure you want to delete <strong>{name}</strong>? All sessions will be cancelled.
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            className="px-3 py-1 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded-14 text-15 hover:opacity-90 border border-PeriwinkleBorder/50"
                            onClick={() => toast.dismiss(toastInstance.id)}
                        >
                            Cancel
                        </button>
                        <button
                            className="px-3 py-1 bg-red-600 text-white rounded-14 text-15 hover:bg-red-700 shadow-sm"
                            onClick={async () => {
                                toast.dismiss(toastInstance.id);
                                try {
                                    const res = await fetch(`/api/groups/${id}`, {
                                        method: "DELETE",
                                    });

                                    if (res.ok) {
                                        await loadGroups();
                                        toast.success("Group deleted successfully");
                                    } else {
                                        const error = await res.json();
                                        toast.error(error.error || "Failed to delete group");
                                    }
                                } catch (err) {
                                    console.error("Error deleting group:", err);
                                    toast.error("Failed to delete group");
                                }
                            }}
                        >
                            Delete
                        </button>
                    </div>
                </div>
            ),
            { duration: Infinity, position: "top-center" }
        );
    };

    const onActivate = async (id, name) => {
        toast(
            (toastInstance) => (
                <div className="w-404 max-w-full bg-white dark:bg-darkmode rounded-14 shadow-round-box p-4">
                    <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-600 font-bold">
                            <PlayCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <p className="text-16 font-semibold">Activate Group</p>
                            <p className="text-14 mt-1 text-slate-500 dark:text-darktext">
                                Activate <strong>{name}</strong>? This will generate all sessions automatically.
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            className="px-3 py-1 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded-14 text-15 hover:opacity-90 border border-PeriwinkleBorder/50"
                            onClick={() => toast.dismiss(toastInstance.id)}
                        >
                            Cancel
                        </button>
                        <button
                            className="px-3 py-1 bg-green-600 text-white rounded-14 text-15 hover:bg-green-700 shadow-sm"
                            onClick={async () => {
                                toast.dismiss(toastInstance.id);
                                const loadingToast = toast.loading("Activating group...");
                                try {
                                    const res = await fetch(`/api/groups/${id}/activate`, {
                                        method: "POST",
                                    });

                                    const result = await res.json();

                                    if (res.ok) {
                                        await loadGroups();
                                        toast.success("Group activated! Sessions are being generated...", {
                                            id: loadingToast
                                        });
                                    } else {
                                        toast.error(result.error || "Failed to activate group", {
                                            id: loadingToast
                                        });
                                    }
                                } catch (err) {
                                    console.error("Error activating group:", err);
                                    toast.error("Failed to activate group", { id: loadingToast });
                                }
                            }}
                        >
                            Activate
                        </button>
                    </div>
                </div>
            ),
            { duration: Infinity, position: "top-center" }
        );
    };

    const onAddStudents = (groupId) => {
         console.log(`📋 Opening Add Students modal for group: ${groupId}`);
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

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
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
        <div className="space-y-4 md:space-y-6 p-2 md:p-0">
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
                                    Groups Management
                                </h1>
                                <p className="text-xs md:text-sm text-SlateBlueText dark:text-darktext">
                                    Manage course groups, sessions, and students
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
                        Create New Group
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] md:text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                                Total
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
                                Active
                            </p>
                            <p className="text-lg md:text-2xl font-bold text-MidnightNavyText dark:text-white mt-0.5">
                                {stats.active}
                            </p>
                        </div>
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] md:text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                                Draft
                            </p>
                            <p className="text-lg md:text-2xl font-bold text-MidnightNavyText dark:text-white mt-0.5">
                                {stats.draft}
                            </p>
                        </div>
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-gray-600 dark:text-gray-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] md:text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                                Completed
                            </p>
                            <p className="text-lg md:text-2xl font-bold text-MidnightNavyText dark:text-white mt-0.5">
                                {stats.completed}
                            </p>
                        </div>
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <Target className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] md:text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                                Cancelled
                            </p>
                            <p className="text-lg md:text-2xl font-bold text-MidnightNavyText dark:text-white mt-0.5">
                                {stats.cancelled}
                            </p>
                        </div>
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                            <XCircle className="w-4 h-4 md:w-5 md:h-5 text-red-600 dark:text-red-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                <div className="space-y-3 md:space-y-0 md:flex md:items-center md:gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search groups..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="px-3 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
                        >
                            <option value="">All Statuses</option>
                            <option value="draft">Draft</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>

                        <button
                            onClick={() => loadGroups()}
                            className="px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center gap-2 text-sm"
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span className="hidden md:inline">Refresh</span>
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
                                <th className="py-3 px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase">
                                    Group
                                </th>
                                <th className="py-3 px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase">
                                    Course
                                </th>
                                <th className="py-3 px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase">
                                    Status
                                </th>
                                <th className="py-3 px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase">
                                    Students
                                </th>
                                <th className="py-3 px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase">
                                    Sessions
                                </th>
                                <th className="py-3 px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase">
                                    Schedule
                                </th>
                                <th className="py-3 px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase">
                                    Actions
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
                                        <p className="text-xs text-SlateBlueText dark:text-darktext">
                                            {group.course?.level}
                                        </p>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(group.status)}`}>
                                            {group.status}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm">
                                                {group.studentsCount}/{group.maxStudents}
                                            </span>
                                            {group.isFull && (
                                                <span className="text-xs text-red-600">Full</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="text-sm">
                                            {group.sessionsGenerated ? (
                                                <span className="text-green-600 flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" />
                                                    {group.totalSessions} sessions
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">Not generated</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="text-xs text-SlateBlueText dark:text-darktext">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(group.schedule?.startDate)}
                                            </div>
                                            <div className="flex items-center gap-1 mt-1">
                                                <Clock className="w-3 h-3" />
                                                {group.schedule?.timeFrom} - {group.schedule?.timeTo}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-1">
                                            {group.status === 'draft' && (
                                                <button
                                                    onClick={() => onActivate(group.id, group.name)}
                                                    className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                                                    title="Activate"
                                                >
                                                    <PlayCircle className="w-4 h-4 text-green-600" />
                                                </button>
                                            )}
                                            {group.status === 'active' && !group.isFull && (
                                                <button
                                                    onClick={() => onAddStudents(group.id)}
                                                    className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                                                    title="Add Students"
                                                >
                                                    <UserPlus className="w-4 h-4 text-blue-600" />
                                                </button>
                                            )}
                                            {group.sessionsGenerated && (
                                                <button
                                                    onClick={() => router.push(`/admin/sessions?groupId=${group.id}`)}
                                                    className="p-1.5 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded transition-colors"
                                                    title="View Sessions"
                                                >
                                                    <Calendar className="w-4 h-4 text-purple-600" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onView(group.id)}
                                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                title="View"
                                            >
                                                <Eye className="w-4 h-4 text-blue-600" />
                                            </button>
                                            <button
                                                onClick={() => onEdit(group)}
                                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                title="Edit"
                                            >
                                                <Edit className="w-4 h-4 text-primary" />
                                            </button>
                                            <button
                                                onClick={() => onDelete(group.id, group.name)}
                                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                title="Delete"
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
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-2">
                            No Groups Found
                        </h3>
                        <p className="text-sm text-SlateBlueText dark:text-darktext mb-6">
                            {filters.search || filters.status
                                ? "No groups match your filters"
                                : "Get started by creating your first group"}
                        </p>
                        {!filters.search && !filters.status && (
                            <button
                                onClick={() => setModalOpen(true)}
                                className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
                            >
                                <Plus className="w-4 h-4" />
                                Create First Group
                            </button>
                        )}
                    </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-PowderBlueBorder dark:border-dark_border">
                        <div className="flex items-center justify-between">
                            <div className="text-xs text-SlateBlueText dark:text-darktext">
                                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} groups
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleFilterChange('page', 1)}
                                    disabled={pagination.page === 1}
                                    className="p-2 border border-PowderBlueBorder dark:border-dark_border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronsLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleFilterChange('page', pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                    className="p-2 border border-PowderBlueBorder dark:border-dark_border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="px-3 py-1 text-sm">
                                    Page {pagination.page} of {pagination.totalPages}
                                </span>
                                <button
                                    onClick={() => handleFilterChange('page', pagination.page + 1)}
                                    disabled={pagination.page === pagination.totalPages}
                                    className="p-2 border border-PowderBlueBorder dark:border-dark_border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleFilterChange('page', pagination.totalPages)}
                                    disabled={pagination.page === pagination.totalPages}
                                    className="p-2 border border-PowderBlueBorder dark:border-dark_border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronsRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            <Modal
                open={modalOpen}
                title={editingGroup ? "Edit Group" : "Create New Group"}
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


            <Modal
                open={addStudentsModalOpen}
                title="Add Students to Group"
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
                    onStudentAdded={() => {
                        loadGroups();
                    }}
                />
            </Modal>
        </div>
    );
}