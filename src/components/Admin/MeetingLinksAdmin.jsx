"use client";
import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import {
    Link as LinkIcon,
    Plus,
    Edit,
    Trash2,
    Search,
    Filter,
    RefreshCw,
    Eye,
    EyeOff,
    Copy,
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Users,
    Globe,
    Lock,
    Unlock
} from "lucide-react";
import Modal from "./Modal";
import MeetingLinkForm from "./MeetingLinkForm";

export default function MeetingLinksAdmin() {
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingLink, setEditingLink] = useState(null);
    const [filters, setFilters] = useState({
        search: "",
        status: "",
        platform: "",
        page: 1,
        limit: 20
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1
    });
    const [stats, setStats] = useState({
        total: 0,
        available: 0,
        reserved: 0,
        in_use: 0,
        maintenance: 0,
        inactive: 0
    });
    const [showPassword, setShowPassword] = useState({});

    const loadLinks = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: filters.page,
                limit: filters.limit,
                ...(filters.search && { search: filters.search }),
                ...(filters.status && { status: filters.status }),
                ...(filters.platform && { platform: filters.platform })
            });

            const res = await fetch(`/api/meeting-links?${queryParams}`, {
                cache: "no-store"
            });

            const json = await res.json();

            if (json.success) {
                setLinks(json.data || []);
                setPagination(json.pagination || {});
                setStats(json.stats || {});
            } else {
                toast.error(json.error || "Failed to load meeting links");
            }
        } catch (err) {
            console.error("Error loading meeting links:", err);
            toast.error("Failed to load meeting links");
        } finally {
            setLoading(false);
        }
    };

    // Load links when filters change
    useEffect(() => {
        loadLinks();
    }, [filters.page, filters.status, filters.platform]);

    // Debounced search effect
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (filters.search !== undefined) {
                loadLinks();
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [filters.search]);

    const handleFilterChange = useCallback((key, value) => {
        setFilters(prev => ({ 
            ...prev, 
            [key]: value,
            page: key !== 'page' ? 1 : value // إعادة تعيين الصفحة إلى 1 عند تغيير الفلاتر
        }));
    }, []);

    const onSaved = async () => {
        await loadLinks();
        toast.success("Meeting link saved successfully");
    };

    const onEdit = (link) => {
        setEditingLink(link);
        setModalOpen(true);
    };

    const onDelete = async (id, name) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

        try {
            const res = await fetch(`/api/meeting-links/${id}`, {
                method: "DELETE",
            });

            const result = await res.json();

            if (res.ok && result.success) {
                await loadLinks();
                toast.success("Meeting link deleted successfully");
            } else {
                toast.error(result.error || "Failed to delete meeting link");
            }
        } catch (err) {
            console.error("Error deleting meeting link:", err);
            toast.error("Failed to delete meeting link");
        }
    };

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    const togglePassword = (id) => {
        setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // المحدث: دالة getStatusColor
    const getStatusColor = (status) => {
        switch (status) {
            case 'available': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'reserved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'in_use': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
            case 'maintenance': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const getPlatformIcon = (platform) => {
        switch (platform) {
            case 'zoom': return '🔷';
            case 'google_meet': return '🔴';
            case 'microsoft_teams': return '🔵';
            default: return '🔗';
        }
    };

    // دالة مساعدة للحصول على النسبة المئوية للاستخدام
    const getUsagePercentage = (link) => {
        if (!link.stats?.totalHours || !link.durationLimit) return 0;
        const maxPossibleHours = ((link.stats?.totalUses || 0) * link.durationLimit) / 60;
        if (maxPossibleHours === 0) return 0;
        return Math.min((link.stats.totalHours / maxPossibleHours) * 100, 100);
    };

    // دالة مساعدة للتحقق مما إذا كان الرابط قيد الاستخدام
    const isLinkInUse = (link) => {
        return link.status === 'in_use';
    };

    // دالة مساعدة للتحقق مما إذا كان الرابط محجوزاً
    const isLinkReserved = (link) => {
        return link.status === 'reserved';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-darkmode rounded-xl shadow-sm p-6 border border-gray-200 dark:border-dark_border">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <LinkIcon className="w-7 h-7 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Meeting Links
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-darktext">
                                    Manage virtual meeting rooms and their availability
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setEditingLink(null);
                            setModalOpen(true);
                        }}
                        className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 w-full md:w-auto justify-center"
                    >
                        <Plus className="w-4 h-4" />
                        Add New Link
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {Object.entries(stats).map(([key, value]) => (
                    <div key={key} className="bg-white dark:bg-darkmode rounded-xl p-4 border border-gray-200 dark:border-dark_border shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-darktext uppercase tracking-wide">
                                    {key.replace('_', ' ')}
                                </p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                    {value}
                                </p>
                            </div>
                            <div className={`w-10 h-10 ${getStatusColor(key)}/20 rounded-lg flex items-center justify-center`}>
                                <LinkIcon className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-gray-200 dark:border-dark_border shadow-sm">
                <div className="space-y-3 md:space-y-0 md:flex md:items-center md:gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search meeting links..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="px-3 py-2 text-sm border border-gray-300 dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
                        >
                            <option value="">All Status</option>
                            <option value="available">Available</option>
                            <option value="reserved">Reserved</option>
                            <option value="in_use">In Use</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="inactive">Inactive</option>
                        </select>

                        <select
                            value={filters.platform}
                            onChange={(e) => handleFilterChange('platform', e.target.value)}
                            className="px-3 py-2 text-sm border border-gray-300 dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
                        >
                            <option value="">All Platforms</option>
                            <option value="zoom">Zoom</option>
                            <option value="google_meet">Google Meet</option>
                            <option value="microsoft_teams">Microsoft Teams</option>
                            <option value="other">Other</option>
                        </select>

                        <button
                            onClick={() => loadLinks()}
                            className="px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center gap-2 text-sm"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Links Table */}
            <div className="bg-white dark:bg-darkmode rounded-xl border border-gray-200 dark:border-dark_border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-dark_border">
                        <thead className="bg-gray-50 dark:bg-dark_input">
                            <tr>
                                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase">
                                    Meeting Link
                                </th>
                                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase">
                                    Status
                                </th>
                                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase">
                                    Credentials
                                </th>
                                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase">
                                    Usage
                                </th>
                                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase">
                                    Availability
                                </th>
                                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-dark_border">
                            {links.map((link) => (
                                <tr key={link._id} className="hover:bg-gray-50 dark:hover:bg-dark_input transition-colors">
                                    <td className="py-4 px-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-lg">{getPlatformIcon(link.platform)}</span>
                                                <p className="font-medium text-sm text-gray-900 dark:text-white">
                                                    {link.name}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-gray-500 dark:text-darktext truncate max-w-xs">
                                                    {link.link}
                                                </p>
                                                <button
                                                    onClick={() => copyToClipboard(link.link, "Link")}
                                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                                    title="Copy link"
                                                >
                                                    <Copy className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="space-y-1">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(link.status)}`}>
                                                {link.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                            {isLinkInUse(link) && (
                                                <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                                                    <Clock className="w-3 h-3" />
                                                    Currently in use
                                                </div>
                                            )}
                                            {isLinkReserved(link) && !isLinkInUse(link) && (
                                                <div className="text-xs text-blue-600 dark:text-blue-400">
                                                    Reserved for session
                                                </div>
                                            )}
                                            {link.status === 'maintenance' && (
                                                <div className="text-xs text-yellow-600 dark:text-yellow-400">
                                                    Under maintenance
                                                </div>
                                            )}
                                            {link.status === 'inactive' && (
                                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                                    Inactive
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Lock className="w-3 h-3 text-gray-400" />
                                                <span className="text-sm">{link.credentials?.username || "No username"}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => togglePassword(link._id)}
                                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                                    title={showPassword[link._id] ? "Hide password" : "Show password"}
                                                >
                                                    {showPassword[link._id] ? (
                                                        <EyeOff className="w-3 h-3" />
                                                    ) : (
                                                        <Eye className="w-3 h-3" />
                                                    )}
                                                </button>
                                                <span className="text-sm font-mono">
                                                    {showPassword[link._id] ? (link.credentials?.password || "No password") : "••••••••"}
                                                </span>
                                                {link.credentials?.password && (
                                                    <button
                                                        onClick={() => copyToClipboard(link.credentials.password, "Password")}
                                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                                        title="Copy password"
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-500">Uses:</span>
                                                <span className="text-sm font-medium">{link.stats?.totalUses || 0}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-500">Hours:</span>
                                                <span className="text-sm font-medium">{link.stats?.totalHours?.toFixed(1) || 0}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                <div
                                                    className="bg-primary h-1.5 rounded-full"
                                                    style={{ width: `${getUsagePercentage(link)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="space-y-1 text-xs">
                                            <div className="flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                <span>Capacity: {link.capacity || 0}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                <span>Max: {link.durationLimit || 0}m</span>
                                            </div>
                                            <div className="text-gray-500">
                                                {link.allowedDays?.length || 0} days allowed
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => onEdit(link)}
                                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                title="Edit"
                                            >
                                                <Edit className="w-4 h-4 text-primary" />
                                            </button>
                                            <button
                                                onClick={() => onDelete(link._id, link.name)}
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
                {links.length === 0 && !loading && (
                    <div className="text-center py-12 px-4">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <LinkIcon className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                            No meeting links found
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-darktext mb-6">
                            {filters.search || filters.status
                                ? "Try changing your filters"
                                : "Get started by adding your first meeting link"}
                        </p>
                        {!filters.search && !filters.status && (
                            <button
                                onClick={() => setModalOpen(true)}
                                className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
                            >
                                <Plus className="w-4 h-4" />
                                Add First Link
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between bg-white dark:bg-darkmode rounded-xl p-4 border border-gray-200 dark:border-dark_border shadow-sm">
                    <div className="text-sm text-gray-500 dark:text-darktext">
                        Showing <span className="font-semibold">{((pagination.page - 1) * pagination.limit) + 1}</span> to{" "}
                        <span className="font-semibold">
                            {Math.min(pagination.page * pagination.limit, pagination.total)}
                        </span> of{" "}
                        <span className="font-semibold">{pagination.total}</span> links
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleFilterChange('page', pagination.page - 1)}
                            disabled={!pagination.hasPrev}
                            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-dark_border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => handleFilterChange('page', pagination.page + 1)}
                            disabled={!pagination.hasNext}
                            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-dark_border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Meeting Link Form Modal */}
            {modalOpen && (
                <Modal
                    open={modalOpen}
                    title={editingLink ? "Edit Meeting Link" : "Add New Meeting Link"}
                    onClose={() => {
                        setModalOpen(false);
                        setEditingLink(null);
                    }}
                    size="lg"
                >
                    <MeetingLinkForm
                        initial={editingLink}
                        onClose={() => {
                            setModalOpen(false);
                            setEditingLink(null);
                        }}
                        onSaved={onSaved}
                    />
                </Modal>
            )}
        </div>
    );
}