// components/admin/GroupsAdmin.jsx
"use client";
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
    Users, Plus, Edit, Trash2, Search, RefreshCw,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    Calendar, Clock, CheckCircle, XCircle, AlertCircle,
    UserPlus, PlayCircle, Hash, Target, Info, Filter, X,
    SlidersHorizontal, ChevronDown, CalendarDays, GraduationCap,
    UserCheck, Layers, Tag, Sparkles, FolderOpen,
} from "lucide-react";
import Modal from "./Modal";
import GroupForm from "./GroupForm";
import AddStudentsToGroup from "./AddStudentsToGroup";
import InstructorNotificationModal from "./InstructorNotificationModal";
import MeetingLinksCheckModal from "./MeetingLinksCheckModal";
import GroupDetailsPage from "./GroupDetailsPage";
import { useI18n } from "@/i18n/I18nProvider";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const INITIAL_FILTERS = {
    search: "",
    status: [],
    courseId: "",
    instructorId: "",
    capacity: "",
    daysOfWeek: [],
    startDateFrom: "",
    startDateTo: "",
    createdAtFrom: "",
    createdAtTo: "",
    studentsCountMin: "",
    studentsCountMax: "",
    sessionsGenerated: "",
    tags: "", // ✅ إضافة فلتر tags (سيكون عبارة عن CSV من الـ IDs)
    page: 1,
    limit: 10,
};

const INITIAL_PAGINATION = { page: 1, limit: 10, total: 0, totalPages: 1 };
const INITIAL_STATS = { total: 0, active: 0, draft: 0, completed: 0, cancelled: 0 };

// Refined badge palette — soft tinted surface + matching ring instead of flat borders
const STATUS_COLORS = {
    active: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
    draft: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-700/40 dark:text-slate-300 dark:ring-slate-600/40",
    completed: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20",
    cancelled: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20",
};

const STATUS_DOT = {
    active: "bg-emerald-500",
    draft: "bg-slate-400",
    completed: "bg-sky-500",
    cancelled: "bg-rose-500",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildQueryParams = (filters) => {
    const params = new URLSearchParams({
        page: filters.page,
        limit: filters.limit,
    });

    const simpleKeys = {
        search: "search",
        courseId: "courseId",
        instructorId: "instructorId",
        capacity: "capacity",
        sessionsGenerated: "sessionsGenerated",
        startDateFrom: "startDateFrom",
        startDateTo: "startDateTo",
        createdAtFrom: "createdAtFrom",
        createdAtTo: "createdAtTo",
        studentsCountMin: "studentsMin",
        studentsCountMax: "studentsMax",
        tags: "tags", // ✅ إضافة
    };

    Object.entries(simpleKeys).forEach(([filterKey, paramKey]) => {
        if (filters[filterKey]) params.set(paramKey, filters[filterKey]);
    });

    filters.status.forEach((s) => params.append("status", s));
    filters.daysOfWeek.forEach((d) => params.append("days", d));

    return params;
};

const formatDate = (dateString, locale) => {
    if (!dateString) return "N/A";
    try {
        return new Date(dateString).toLocaleDateString(locale, {
            year: "numeric", month: "short", day: "numeric",
        });
    } catch {
        return "N/A";
    }
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GroupsAdmin() {
    const { t, language } = useI18n();
    const router = useRouter();
    const isRTL = language === "ar";

    // ── State ──────────────────────────────────────────────────────────────────
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState([]);
    const [instructorsList, setInstructorsList] = useState([]);
    const [filters, setFilters] = useState(INITIAL_FILTERS);
    const [searchInput, setSearchInput] = useState("");
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [pagination, setPagination] = useState(INITIAL_PAGINATION);
    const [stats, setStats] = useState(INITIAL_STATS);

    // ── Tags State ──────────────────────────────────────────────────────────────
    const [tagsList, setTagsList] = useState([]);                 // ✅ قائمة الوسوم
    const [tagsModalOpen, setTagsModalOpen] = useState(false);    // ✅ مودال إدارة الوسوم
    const [editingTag, setEditingTag] = useState(null);           // ✅ الوسم الجاري تعديله
    const [newTagName, setNewTagName] = useState("");             // ✅ اسم وسم جديد
    const [newTagColor, setNewTagColor] = useState("#3B82F6");    // ✅ لون وسم جديد

    const [modalOpen, setModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [viewDetailsModal, setViewDetailsModal] = useState({ open: false, groupId: null });
    const [addStudentsModalOpen, setAddStudentsModalOpen] = useState(false);
    const [selectedGroupForStudents, setSelectedGroupForStudents] = useState(null);
    const [meetingLinksModal, setMeetingLinksModal] = useState({ open: false, groupId: null });
    const [instructorNotificationModal, setInstructorNotificationModal] = useState({
        open: false, groupData: null, instructors: [],
    });
    const [pendingActivation, setPendingActivation] = useState({
        forceActivate: false, releaseReserved: false, selectedLinkIds: [], firstMeetingLink: "",
    });

    const searchTimeoutRef = useRef(null);

    // ── Memos ──────────────────────────────────────────────────────────────────
    const dayLabels = useMemo(() => ({
        Sunday: isRTL ? "الأحد" : "Sun",
        Monday: isRTL ? "الإثنين" : "Mon",
        Tuesday: isRTL ? "الثلاثاء" : "Tue",
        Wednesday: isRTL ? "الأربعاء" : "Wed",
        Thursday: isRTL ? "الخميس" : "Thu",
        Friday: isRTL ? "الجمعة" : "Fri",
        Saturday: isRTL ? "السبت" : "Sat",
    }), [isRTL]);

    const statusLabels = useMemo(() => ({
        active: t("groups.status.active") || "Active",
        draft: t("groups.status.draft") || "Draft",
        completed: t("groups.status.completed") || "Completed",
        cancelled: t("groups.status.cancelled") || "Cancelled",
    }), [t]);

    const statsConfig = useMemo(() => [
        {
            label: t("groups.stats.total") || "Total", value: stats.total,
            accent: "from-primary/15 via-primary/5 to-transparent", ring: "ring-primary/15",
            iconWrap: "bg-primary/10 text-primary",
            icon: <Users className="w-5 h-5 md:w-6 md:h-6" />,
        },
        {
            label: t("groups.stats.active") || "Active", value: stats.active,
            accent: "from-emerald-500/15 via-emerald-500/5 to-transparent", ring: "ring-emerald-500/15",
            iconWrap: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            icon: <CheckCircle className="w-5 h-5 md:w-6 md:h-6" />,
        },
        {
            label: t("groups.stats.draft") || "Draft", value: stats.draft,
            accent: "from-slate-400/15 via-slate-400/5 to-transparent", ring: "ring-slate-400/15",
            iconWrap: "bg-slate-400/10 text-slate-500 dark:text-slate-400",
            icon: <AlertCircle className="w-5 h-5 md:w-6 md:h-6" />,
        },
        {
            label: t("groups.stats.completed") || "Completed", value: stats.completed,
            accent: "from-sky-500/15 via-sky-500/5 to-transparent", ring: "ring-sky-500/15",
            iconWrap: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
            icon: <Target className="w-5 h-5 md:w-6 md:h-6" />,
        },
        {
            label: t("groups.stats.cancelled") || "Cancelled", value: stats.cancelled,
            accent: "from-rose-500/15 via-rose-500/5 to-transparent", ring: "ring-rose-500/15",
            iconWrap: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
            icon: <XCircle className="w-5 h-5 md:w-6 md:h-6" />,
        },
    ], [stats, t]);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.search) count++;
        if (filters.status.length > 0) count++;
        if (filters.courseId) count++;
        if (filters.instructorId) count++;
        if (filters.capacity) count++;
        if (filters.daysOfWeek.length > 0) count++;
        if (filters.startDateFrom || filters.startDateTo) count++;
        if (filters.createdAtFrom || filters.createdAtTo) count++;
        if (filters.studentsCountMin || filters.studentsCountMax) count++;
        if (filters.sessionsGenerated) count++;
        if (filters.tags) count++; // ✅
        return count;
    }, [filters]);

    // ── Data Fetching ──────────────────────────────────────────────────────────
    // جلب البيانات الأساسية (الكورسات، المدرسين)
    useEffect(() => {
        const fetchFilterData = async () => {
            try {
                const [coursesRes, instructorsRes] = await Promise.all([
                    fetch("/api/courses?limit=1000&isActive=true"),
                    fetch("/api/users?role=instructor&limit=1000"),
                ]);
                const [coursesJson, instructorsJson] = await Promise.all([
                    coursesRes.json(),
                    instructorsRes.json(),
                ]);
                if (coursesJson.success) setCourses(coursesJson.data || []);
                if (instructorsJson.success) setInstructorsList(instructorsJson.data || []);
            } catch (err) {
                console.error("Error fetching filter data:", err);
            }
        };
        fetchFilterData();
    }, []);

    // جلب الوسوم
    const loadTags = useCallback(async () => {
        try {
            const res = await fetch("/api/tags");
            const json = await res.json();
            if (json.success) setTagsList(json.data || []);
        } catch (err) {
            console.error("Error loading tags:", err);
        }
    }, []);

    useEffect(() => {
        loadTags();
    }, [loadTags]);

    // جلب المجموعات
    const loadGroups = useCallback(async () => {
        setLoading(true);
        try {
            const queryParams = buildQueryParams(filters);
            const res = await fetch(`/api/groups?${queryParams}`, {
                cache: "no-store",
                headers: { "Cache-Control": "no-cache" },
            });
            const json = await res.json();
            if (json.success) {
                setGroups(json.data || []);
                if (json.pagination) setPagination(json.pagination);
                if (json.stats) setStats(json.stats);
            } else {
                toast.error(json.error || t("groups.load.failed"), { position: "top-center" });
            }
        } catch (err) {
            console.error("Error loading groups:", err);
            toast.error(t("groups.load.failed"), { position: "top-center" });
        } finally {
            setLoading(false);
        }
    }, [filters, t]);

    useEffect(() => {
        loadGroups();
    }, [loadGroups]);

    // cleanup debounce on unmount
    useEffect(() => () => clearTimeout(searchTimeoutRef.current), []);

    // ── Filter Handlers ────────────────────────────────────────────────────────
    const handleFilterChange = useCallback((key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
    }, []);

    const handlePageChange = useCallback((page) => {
        setFilters((prev) => ({ ...prev, page }));
    }, []);

    const handleSearchChange = useCallback((value) => {
        setSearchInput(value);
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            setFilters((prev) => ({ ...prev, search: value, page: 1 }));
        }, 400);
    }, []);

    const toggleStatus = useCallback((status) => {
        setFilters((prev) => ({
            ...prev,
            page: 1,
            status: prev.status.includes(status)
                ? prev.status.filter((s) => s !== status)
                : [...prev.status, status],
        }));
    }, []);

    const toggleDay = useCallback((day) => {
        setFilters((prev) => ({
            ...prev,
            page: 1,
            daysOfWeek: prev.daysOfWeek.includes(day)
                ? prev.daysOfWeek.filter((d) => d !== day)
                : [...prev.daysOfWeek, day],
        }));
    }, []);

    // ✅ دالة لتبديل فلتر الوسم
    const toggleTagFilter = useCallback((tagId) => {
        setFilters((prev) => {
            const current = prev.tags ? prev.tags.split(",") : [];
            const newTags = current.includes(tagId)
                ? current.filter(id => id !== tagId)
                : [...current, tagId];
            return { ...prev, tags: newTags.join(","), page: 1 };
        });
    }, []);

    const clearAllFilters = useCallback(() => {
        setSearchInput("");
        setFilters(INITIAL_FILTERS);
    }, []);

    // ── Group Actions ──────────────────────────────────────────────────────────
    const onSaved = useCallback(async () => {
        await loadGroups();
        toast.success(t("groups.saved.success"), { position: "top-center" });
    }, [loadGroups, t]);

    const onEdit = useCallback((group) => {
        setEditingGroup(group);
        setModalOpen(true);
    }, []);

    const onViewDetails = useCallback((groupId) => {
        setViewDetailsModal({ open: true, groupId });
    }, []);

    const onDelete = useCallback(async (id, name) => {
        const confirmed = window.confirm(
            `${t("groups.delete.confirm")?.replace("{name}", name) || `Delete "${name}"?`}\n\n${t("groups.delete.warning") || "This action cannot be undone."}`
        );
        if (!confirmed) return;

        const loadingToast = toast.loading(t("groups.delete.loading"), { position: "top-center" });
        try {
            const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
            if (res.ok) {
                await loadGroups();
                toast.success(t("groups.delete.success"), { id: loadingToast, position: "top-center" });
            } else {
                const error = await res.json();
                toast.error(error.error || t("groups.delete.failed"), { id: loadingToast, position: "top-center" });
            }
        } catch {
            toast.error(t("groups.delete.failed"), { id: loadingToast, position: "top-center" });
        }
    }, [loadGroups, t]);

    const onActivateWithNotification = useCallback((groupId) => {
        if (!groupId) {
            toast.error(t("groups.activate.invalidId"), { position: "top-center" });
            return;
        }
        setMeetingLinksModal({ open: true, groupId });
    }, [t]);

    const onMeetingLinksCheckConfirmed = useCallback(async (forceActivate, releaseReserved, selectedLinkIds = [], availableLinks = []) => {
        const groupId = meetingLinksModal.groupId;
        setMeetingLinksModal({ open: false, groupId: null });

        const firstSelectedLink = availableLinks.find(
            (l) => selectedLinkIds.includes(l._id?.toString() || l.id?.toString())
        );
        const firstMeetingLink = firstSelectedLink?.link || "";
        setPendingActivation({ forceActivate, releaseReserved, selectedLinkIds, firstMeetingLink });

        try {
            const res = await fetch(`/api/groups/${groupId}`, {
                cache: "no-store",
                headers: { "Cache-Control": "no-cache" },
            });
            if (!res.ok) throw new Error(`Failed to fetch group: ${res.status}`);
            const json = await res.json();
            if (json.success && json.data) {
                setInstructorNotificationModal({
                    open: true,
                    groupData: { ...json.data, firstMeetingLink: firstMeetingLink || json.data.firstMeetingLink || "" },
                    instructors: json.data.instructors || [],
                });
            } else {
                throw new Error(json.error || t("groups.activate.loadError"));
            }
        } catch (err) {
            toast.error(err.message || t("groups.activate.loadError"), { position: "top-center" });
        }
    }, [meetingLinksModal.groupId, t]);

    const handleActivateAndNotify = useCallback(async (instructorMessages) => {
        const groupId = instructorNotificationModal?.groupData?._id || instructorNotificationModal?.groupData?.id;
        if (!groupId) {
            toast.error(t("groups.activate.invalidId"), { position: "top-center" });
            return;
        }

        const loadingToast = toast.loading(t("groups.activate.loading"), { position: "top-center" });
        try {
            const res = await fetch(`/api/groups/${groupId}/activate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    instructorMessages,
                    forceActivate: pendingActivation.forceActivate,
                    releaseReserved: pendingActivation.releaseReserved,
                    selectedLinkIds: pendingActivation.selectedLinkIds,
                }),
            });
            const result = await res.json();
            if (res.ok && result.success) {
                await loadGroups();
                toast.success(t("groups.activate.success"), { id: loadingToast, position: "top-center" });
                setInstructorNotificationModal({ open: false, groupData: null, instructors: [] });
                setPendingActivation({ forceActivate: false, releaseReserved: false, selectedLinkIds: [], firstMeetingLink: "" });
            } else {
                toast.error(result.error || t("groups.activate.failed"), { id: loadingToast, position: "top-center" });
            }
        } catch {
            toast.error(t("groups.activate.failed"), { id: loadingToast, position: "top-center" });
        }
    }, [instructorNotificationModal, pendingActivation, loadGroups, t]);

    const onAddStudents = useCallback((groupId) => {
        setSelectedGroupForStudents(groupId);
        setAddStudentsModalOpen(true);
    }, []);

    // ── Tag Management Functions ──────────────────────────────────────────────
    const handleAddTag = async () => {
        if (!newTagName.trim()) {
            toast.error("Tag name is required");
            return;
        }
        try {
            const res = await fetch("/api/tags", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
            });
            const json = await res.json();
            if (json.success) {
                toast.success("Tag added successfully");
                setNewTagName("");
                setNewTagColor("#3B82F6");
                await loadTags();
            } else {
                toast.error(json.error || "Failed to add tag");
            }
        } catch (err) {
            toast.error("Failed to add tag");
        }
    };

    const handleUpdateTag = async (id, name, color) => {
        try {
            const res = await fetch(`/api/tags/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, color }),
            });
            const json = await res.json();
            if (json.success) {
                toast.success("Tag updated");
                await loadTags();
                setEditingTag(null);
            } else {
                toast.error(json.error || "Failed to update tag");
            }
        } catch (err) {
            toast.error("Failed to update tag");
        }
    };

    // داخل GroupsAdmin.jsx

    const handleDeleteTag = async (id) => {
        if (!confirm("Are you sure you want to permanently delete this tag? It will be removed from all groups.")) return;
        try {
            const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Tag permanently deleted");
                await loadTags(); // ✅ تحديث القائمة فوراً
            } else {
                const json = await res.json();
                toast.error(json.error || "Failed to delete tag");
            }
        } catch (err) {
            toast.error("Failed to delete tag");
        }
    };

    // ── Modal Closers ──────────────────────────────────────────────────────────
    const closeGroupModal = useCallback(() => {
        setModalOpen(false);
        setEditingGroup(null);
    }, []);

    const closeViewDetailsModal = useCallback(() => {
        setViewDetailsModal({ open: false, groupId: null });
        loadGroups();
    }, [loadGroups]);

    const closeAddStudentsModal = useCallback(() => {
        setAddStudentsModalOpen(false);
        setSelectedGroupForStudents(null);
    }, []);

    const closeInstructorModal = useCallback(() => {
        setInstructorNotificationModal({ open: false, groupData: null, instructors: [] });
        setPendingActivation({ forceActivate: false, releaseReserved: false, selectedLinkIds: [], firstMeetingLink: "" });
    }, []);

    // ── Loading State ──────────────────────────────────────────────────────────
    if (loading && groups.length === 0) {
        return (
            <div className="flex flex-col justify-center items-center gap-3 p-16">
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-2 border-primary/15" />
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
                </div>
                <p className="text-xs text-SlateBlueText dark:text-darktext animate-pulse">
                    {t("groups.loading") || "Loading groups…"}
                </p>
            </div>
        );
    }

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className={`space-y-4 md:space-y-6 p-2 md:p-0 ${isRTL ? "rtl" : "ltr"}`} dir={isRTL ? "rtl" : "ltr"}>

            {/* ── Header ── */}
            <div className="relative overflow-hidden bg-white dark:bg-darkmode rounded-2xl shadow-sm p-4 md:p-6 border border-PowderBlueBorder dark:border-dark_border">
                <div className={`pointer-events-none absolute -top-16 ${isRTL ? "-left-16" : "-right-16"} w-56 h-56 rounded-full bg-primary/[0.06] blur-2xl`} />
                <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="p-2.5 md:p-3 bg-gradient-to-br from-primary/15 to-primary/5 rounded-xl ring-1 ring-primary/10">
                            <Users className="w-5 h-5 md:w-7 md:h-7 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-MidnightNavyText dark:text-white">
                                {t("groups.title") || "Groups Management"}
                            </h1>
                            <p className="text-xs md:text-sm text-SlateBlueText dark:text-darktext">
                                {t("groups.subtitle") || "Manage your groups and sessions"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* ✅ زر إدارة الوسوم */}
                        <button
                            onClick={() => setTagsModalOpen(true)}
                            className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700/60 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all flex items-center gap-2 border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                        >
                            <Tag className="w-4 h-4" />
                            {t("groups.tags.manage") || "Manage Tags"}
                        </button>
                        <button
                            onClick={() => { setEditingGroup(null); setModalOpen(true); }}
                            className="bg-primary hover:bg-primary/90 active:scale-[0.98] text-white px-4 py-2.5 md:px-6 md:py-3 rounded-xl font-semibold text-xs md:text-sm transition-all shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 flex items-center gap-2 w-full md:w-auto justify-center"
                        >
                            <Plus className="w-4 h-4" />
                            {t("groups.create") || "Create Group"}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                {statsConfig.map((stat) => (
                    <div
                        key={stat.label}
                        className={`relative overflow-hidden bg-white dark:bg-darkmode rounded-2xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm hover:shadow-md transition-shadow ring-1 ${stat.ring}`}
                    >
                        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${stat.accent}`} />
                        <div className="relative flex items-center justify-between">
                            <div>
                                <p className="text-[10px] md:text-xs font-medium text-SlateBlueText dark:text-darktext uppercase tracking-wide">{stat.label}</p>
                                <p className="text-lg md:text-2xl font-bold text-MidnightNavyText dark:text-white tabular-nums">{stat.value}</p>
                            </div>
                            <div className={`p-2 md:p-2.5 rounded-xl ${stat.iconWrap}`}>
                                {stat.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Filters ── */}
            <div className="bg-white dark:bg-darkmode rounded-2xl p-4 md:p-6 border border-PowderBlueBorder dark:border-dark_border shadow-sm space-y-4">

                {/* Row 1: Search + Course + Instructor + Advanced Toggle */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">

                    {/* Search */}
                    <div className="relative group">
                        <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors`} />
                        <input
                            type="text"
                            placeholder={t("groups.filters.search") || "Search by name or code..."}
                            value={searchInput}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className={`w-full ${isRTL ? "pr-10 pl-4" : "pl-10 pr-4"} py-2.5 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all dark:bg-dark_input dark:text-white`}
                        />
                    </div>

                    {/* Course */}
                    <div className="relative">
                        <GraduationCap className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
                        <select
                            value={filters.courseId}
                            onChange={(e) => handleFilterChange("courseId", e.target.value)}
                            className={`w-full ${isRTL ? "pr-10 pl-4" : "pl-10 pr-4"} py-2.5 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all dark:bg-dark_input dark:text-white appearance-none`}
                        >
                            <option value="">{t("groups.filters.allCourses") || "All Courses"}</option>
                            {courses.map((course) => (
                                <option key={course.id || course._id} value={course.id || course._id}>
                                    {course.title}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className={`absolute ${isRTL ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none`} />
                    </div>

                    {/* Instructor */}
                    <div className="relative">
                        <UserCheck className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
                        <select
                            value={filters.instructorId}
                            onChange={(e) => handleFilterChange("instructorId", e.target.value)}
                            className={`w-full ${isRTL ? "pr-10 pl-4" : "pl-10 pr-4"} py-2.5 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all dark:bg-dark_input dark:text-white appearance-none`}
                        >
                            <option value="">{t("groups.filters.allInstructors") || "All Instructors"}</option>
                            {instructorsList.map((inst) => (
                                <option key={inst.id || inst._id} value={inst.id || inst._id}>
                                    {inst.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className={`absolute ${isRTL ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none`} />
                    </div>

                    {/* Advanced Toggle */}
                    <button
                        onClick={() => setShowAdvancedFilters((v) => !v)}
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${showAdvancedFilters
                                ? "bg-primary text-white shadow-md shadow-primary/20"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                            }`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        {t("groups.filters.advanced") || "Advanced"}
                        {activeFiltersCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-xs tabular-nums">
                                {activeFiltersCount}
                            </span>
                        )}
                        <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedFilters ? "rotate-180" : ""}`} />
                    </button>
                </div>

                {/* Advanced Filters Panel */}
                {showAdvancedFilters && (
                    <div className="space-y-5 pt-4 border-t border-PowderBlueBorder dark:border-dark_border animate-in fade-in slide-in-from-top-1 duration-200">

                        {/* Status + Capacity + Sessions */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                            {/* Status chips */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block">
                                    {t("groups.filters.status") || "Status"}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {["draft", "active", "completed", "cancelled"].map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => toggleStatus(status)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${filters.status.includes(status)
                                                    ? STATUS_COLORS[status]
                                                    : "bg-gray-50 text-gray-500 ring-1 ring-inset ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700"
                                                }`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} />
                                            {statusLabels[status]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Capacity */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block">
                                    {t("groups.filters.capacity") || "Capacity"}
                                </label>
                                <div className="flex gap-2">
                                    {[
                                        { value: "", label: t("groups.filters.all") || "All" },
                                        { value: "full", label: t("groups.filters.full") || "Full" },
                                        { value: "available", label: t("groups.filters.available") || "Available" },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleFilterChange("capacity", opt.value)}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${filters.capacity === opt.value
                                                    ? "bg-primary text-white shadow-sm"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sessions Generated */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block">
                                    {t("groups.filters.sessions") || "Sessions"}
                                </label>
                                <div className="flex gap-2">
                                    {[
                                        { value: "", label: t("groups.filters.all") || "All" },
                                        { value: "true", label: t("groups.filters.generated") || "Generated" },
                                        { value: "false", label: t("groups.filters.notGenerated") || "Not Generated" },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleFilterChange("sessionsGenerated", opt.value)}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${filters.sessionsGenerated === opt.value
                                                    ? "bg-primary text-white shadow-sm"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Days of Week */}
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                                <CalendarDays className="w-3.5 h-3.5" />
                                {t("groups.filters.daysOfWeek") || "Days of Week"}
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {DAYS_OF_WEEK.map((day) => (
                                    <button
                                        key={day}
                                        onClick={() => toggleDay(day)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filters.daysOfWeek.includes(day)
                                                ? "bg-primary text-white shadow-sm shadow-primary/20"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                                            }`}
                                    >
                                        {dayLabels[day]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ✅ Tags Filter */}
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                                <Tag className="w-3.5 h-3.5" />
                                {t("groups.filters.tags") || "Tags"}
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {tagsList.map((tag) => {
                                    const selected = filters.tags ? filters.tags.split(",").includes(tag._id) : false;
                                    return (
                                        <button
                                            key={tag._id}
                                            onClick={() => toggleTagFilter(tag._id)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ring-1 ring-inset ${selected
                                                    ? "text-white ring-transparent shadow-sm"
                                                    : "bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600"
                                                }`}
                                            style={selected ? { backgroundColor: tag.color } : {}}
                                        >
                                            <span
                                                className="inline-block w-2 h-2 rounded-full"
                                                style={{ backgroundColor: selected ? "rgba(255,255,255,0.85)" : tag.color }}
                                            />
                                            {tag.name}
                                        </button>
                                    );
                                })}
                                {tagsList.length === 0 && (
                                    <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                                        {t("groups.tags.noTags") || "No tags available"}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Date Ranges */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DateRangeFilter
                                label={t("groups.filters.startDate") || "Start Date Range"}
                                icon={<Calendar className="w-3.5 h-3.5" />}
                                fromValue={filters.startDateFrom}
                                toValue={filters.startDateTo}
                                onFromChange={(v) => handleFilterChange("startDateFrom", v)}
                                onToChange={(v) => handleFilterChange("startDateTo", v)}
                            />
                            <DateRangeFilter
                                label={t("groups.filters.createdAt") || "Created Date Range"}
                                icon={<Clock className="w-3.5 h-3.5" />}
                                fromValue={filters.createdAtFrom}
                                toValue={filters.createdAtTo}
                                onFromChange={(v) => handleFilterChange("createdAtFrom", v)}
                                onToChange={(v) => handleFilterChange("createdAtTo", v)}
                            />
                        </div>

                        {/* Students Count + Actions */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-dark_input rounded-xl p-3 ring-1 ring-inset ring-gray-200 dark:ring-gray-700">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span className="text-xs text-gray-500">{t("groups.filters.studentsCount") || "Students:"}</span>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Min"
                                    value={filters.studentsCountMin}
                                    onChange={(e) => handleFilterChange("studentsCountMin", e.target.value)}
                                    className="w-16 px-2 py-1.5 text-xs border rounded-lg dark:bg-dark_input dark:text-white focus:ring-2 focus:ring-primary/30 outline-none"
                                />
                                <span className="text-gray-400">–</span>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Max"
                                    value={filters.studentsCountMax}
                                    onChange={(e) => handleFilterChange("studentsCountMax", e.target.value)}
                                    className="w-16 px-2 py-1.5 text-xs border rounded-lg dark:bg-dark_input dark:text-white focus:ring-2 focus:ring-primary/30 outline-none"
                                />
                            </div>

                            <div className={`flex items-center gap-2 ${isRTL ? "mr-auto" : "ml-auto"}`}>
                                {activeFiltersCount > 0 && (
                                    <>
                                        <span className="px-3 py-1.5 bg-primary/10 text-primary text-xs rounded-full font-medium flex items-center gap-1">
                                            <Filter className="w-3 h-3" />
                                            {activeFiltersCount} {t("groups.filters.active") || "active"}
                                        </span>
                                        <button
                                            onClick={clearAllFilters}
                                            className="px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1"
                                        >
                                            <X className="w-3 h-3" />
                                            {t("groups.filters.clearAll") || "Clear All"}
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={loadGroups}
                                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-all shadow-sm shadow-primary/20"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                                    {t("groups.filters.refresh") || "Refresh"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Table ── */}
            <div className="bg-white dark:bg-darkmode rounded-2xl border border-PowderBlueBorder dark:border-dark_border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-PowderBlueBorder dark:divide-dark_border">
                        <thead className="bg-gray-50/80 dark:bg-dark_input backdrop-blur-sm">
                            <tr>
                                {[
                                    t("groups.table.group") || "Group",
                                    t("groups.table.course") || "Course",
                                    t("groups.table.status") || "Status",
                                    t("groups.table.students") || "Students",
                                    t("groups.table.sessions") || "Sessions",
                                    t("groups.table.actions") || "Actions",
                                ].map((h) => (
                                    <th key={h} className={`py-3.5 px-4 ${isRTL ? "text-right" : "text-left"} text-[11px] font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider`}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-PowderBlueBorder dark:divide-dark_border">
                            {groups.map((group) => (
                                <GroupRow
                                    key={group.id}
                                    group={group}
                                    dayLabels={dayLabels}
                                    statusLabels={statusLabels}
                                    t={t}
                                    onViewDetails={onViewDetails}
                                    onActivate={onActivateWithNotification}
                                    onAddStudents={onAddStudents}
                                    onViewSessions={(id) => router.push(`/admin/sessions?groupId=${id}`)}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Empty State */}
                {groups.length === 0 && !loading && (
                    <div className="text-center py-16 px-4">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center ring-1 ring-inset ring-gray-200 dark:ring-gray-700">
                            <FolderOpen className="w-7 h-7 text-gray-300 dark:text-gray-600" />
                        </div>
                        <h3 className="text-base font-bold mb-1.5 text-MidnightNavyText dark:text-white">{t("groups.empty.title") || "No Groups Found"}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">{t("groups.empty.description") || "Try adjusting your filters or create a new group."}</p>
                        <button
                            onClick={() => setModalOpen(true)}
                            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 mx-auto shadow-md shadow-primary/20 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            {t("groups.empty.button") || "Create Group"}
                        </button>
                    </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <Pagination
                        pagination={pagination}
                        t={t}
                        isRTL={isRTL}
                        onPageChange={handlePageChange}
                    />
                )}
            </div>

            {/* ── Modals ── */}
            <Modal open={modalOpen} title={editingGroup ? t("groups.edit") : t("groups.createNew")} onClose={closeGroupModal} size="xl">
                <GroupForm initial={editingGroup} onClose={closeGroupModal} onSaved={onSaved} />
            </Modal>

            <Modal open={viewDetailsModal.open} title="" onClose={closeViewDetailsModal} size="full">
                <GroupDetailsPage groupId={viewDetailsModal.groupId} onClose={closeViewDetailsModal} />
            </Modal>

            <Modal open={addStudentsModalOpen} title={t("groups.actions.addStudents")} onClose={closeAddStudentsModal} size="xl">
                <AddStudentsToGroup
                    groupId={selectedGroupForStudents}
                    onClose={closeAddStudentsModal}
                    onStudentAdded={loadGroups}
                />
            </Modal>

            <MeetingLinksCheckModal
                isOpen={meetingLinksModal.open}
                groupId={meetingLinksModal.groupId}
                onClose={() => setMeetingLinksModal({ open: false, groupId: null })}
                onConfirm={onMeetingLinksCheckConfirmed}
            />

            <InstructorNotificationModal
                isOpen={instructorNotificationModal.open}
                onClose={closeInstructorModal}
                instructors={instructorNotificationModal.instructors}
                groupData={instructorNotificationModal.groupData}
                onSendNotifications={handleActivateAndNotify}
            />

            {/* ✅ مودال إدارة الوسوم */}
            <Modal
                open={tagsModalOpen}
                title={t("groups.tags.manage") || "Manage Tags"}
                onClose={() => { setTagsModalOpen(false); setEditingTag(null); }}
                size="md"
            >
                <div className="space-y-5 p-1">
                    {/* إضافة وسم جديد */}
                    <div className="bg-gray-50 dark:bg-dark_input/60 rounded-xl p-3 ring-1 ring-inset ring-gray-200 dark:ring-gray-700">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            {t("groups.tags.newTag") || "New tag"}
                        </p>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                                placeholder={t("groups.tags.newTag") || "New tag name"}
                                className="flex-1 px-3 py-2 border border-transparent bg-white dark:bg-dark_input rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none shadow-sm"
                            />
                            <label className="relative shrink-0">
                                <input
                                    type="color"
                                    value={newTagColor}
                                    onChange={(e) => setNewTagColor(e.target.value)}
                                    className="w-10 h-10 rounded-lg cursor-pointer border-2 border-white dark:border-dark_input shadow-sm appearance-none"
                                    style={{ backgroundColor: newTagColor }}
                                />
                            </label>
                            <button
                                onClick={handleAddTag}
                                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition shadow-sm shadow-primary/20 flex items-center gap-1.5 shrink-0"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                {t("common.add") || "Add"}
                            </button>
                        </div>
                    </div>

                    {/* قائمة الوسوم */}
                    <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                        {tagsList.map((tag) => (
                            <div key={tag._id} className="flex items-center justify-between p-2.5 rounded-xl ring-1 ring-inset ring-gray-100 dark:ring-gray-700 hover:ring-gray-200 dark:hover:bg-gray-800/60 transition">
                                {editingTag?._id === tag._id ? (
                                    <div className="flex items-center gap-2 flex-1">
                                        <input
                                            type="text"
                                            value={editingTag.name}
                                            onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                                            autoFocus
                                            className="flex-1 px-2.5 py-1.5 border rounded-lg text-sm dark:bg-dark_input dark:text-white focus:ring-2 focus:ring-primary/30 outline-none"
                                        />
                                        <input
                                            type="color"
                                            value={editingTag.color}
                                            onChange={(e) => setEditingTag({ ...editingTag, color: e.target.value })}
                                            className="w-8 h-8 p-0 border rounded-lg cursor-pointer"
                                        />
                                        <button
                                            onClick={() => handleUpdateTag(editingTag._id, editingTag.name, editingTag.color)}
                                            className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition"
                                        >
                                            {t("common.save") || "Save"}
                                        </button>
                                        <button
                                            onClick={() => setEditingTag(null)}
                                            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium hover:bg-gray-300 transition"
                                        >
                                            {t("common.cancel") || "Cancel"}
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2.5">
                                            <span
                                                className="inline-block w-3.5 h-3.5 rounded-full ring-2 ring-offset-2 ring-offset-white dark:ring-offset-darkmode"
                                                style={{ backgroundColor: tag.color, "--tw-ring-color": tag.color + "40" }}
                                            />
                                            <span className="text-sm font-medium text-MidnightNavyText dark:text-white">{tag.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setEditingTag({ _id: tag._id, name: tag.name, color: tag.color })}
                                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10 transition"
                                            >
                                                <Edit className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTag(tag._id)}
                                                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 transition"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                        {tagsList.length === 0 && (
                            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6 italic">
                                {t("groups.tags.noTags") || "No tags yet"}
                            </p>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DateRangeFilter({ label, icon, fromValue, toValue, onFromChange, onToChange }) {
    return (
        <div className="bg-gray-50 dark:bg-dark_input rounded-xl p-3 ring-1 ring-inset ring-gray-200 dark:ring-gray-700">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                {icon}
                {label}
            </label>
            <div className="flex items-center gap-2">
                <input
                    type="date"
                    value={fromValue}
                    onChange={(e) => onFromChange(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white focus:ring-2 focus:ring-primary/30 outline-none"
                />
                <span className="text-gray-400">→</span>
                <input
                    type="date"
                    value={toValue}
                    onChange={(e) => onToChange(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white focus:ring-2 focus:ring-primary/30 outline-none"
                />
            </div>
        </div>
    );
}

// ✅ تم تعديل GroupRow لعرض الوسوم
function GroupRow({ group, dayLabels, statusLabels, t, onViewDetails, onActivate, onAddStudents, onViewSessions, onEdit, onDelete }) {
    return (
        <tr className="group hover:bg-gray-50/80 dark:hover:bg-dark_input/60 transition-colors">

            {/* Group Info */}
            <td className="py-3.5 px-4">
                <p className="font-semibold text-sm text-MidnightNavyText dark:text-white">{group.name}</p>
                <p className="text-xs text-SlateBlueText dark:text-darktext flex items-center gap-1 mt-0.5">
                    <Hash className="w-3 h-3" />{group.code}
                </p>
                {/* ✅ عرض الوسوم */}
                {group.tags && group.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {group.tags.map((tag) => (
                            <span
                                key={tag._id}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                                style={{ backgroundColor: tag.color + '18', color: tag.color }}
                            >
                                <span className="w-1.5 h-1.5 rounded-full mr-1 rtl:mr-0 rtl:ml-1" style={{ backgroundColor: tag.color }} />
                                {tag.name}
                            </span>
                        ))}
                    </div>
                )}
                {group.schedule?.daysOfWeek && (
                    <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {group.schedule.daysOfWeek.map((d) => dayLabels[d] || d).join(", ")}
                        {" · "}{group.schedule.timeFrom}-{group.schedule.timeTo}
                    </p>
                )}
            </td>

            {/* Course */}
            <td className="py-3.5 px-4">
                <p className="text-sm text-MidnightNavyText dark:text-white">{group.course?.title || "N/A"}</p>
                <p className="text-xs text-SlateBlueText dark:text-darktext">{group.course?.level || ""}</p>
            </td>

            {/* Status */}
            <td className="py-3.5 px-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[group.status] || STATUS_COLORS.draft}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[group.status] || STATUS_DOT.draft}`} />
                    {statusLabels[group.status] || group.status}
                </span>
            </td>

            {/* Students */}
            <td className="py-3.5 px-4">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium tabular-nums">{group.studentsCount}/{group.maxStudents}</span>
                    {group.isFull && (
                        <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 text-[10px] rounded font-semibold">
                            {t("groups.status.full") || "FULL"}
                        </span>
                    )}
                </div>
            </td>

            {/* Sessions */}
            <td className="py-3.5 px-4">
                {group.sessionsGenerated ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-sm font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />{group.totalSessions}
                    </span>
                ) : (
                    <span className="text-gray-400 text-sm flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" />
                        {t("groups.sessions.notGenerated") || "Not generated"}
                    </span>
                )}
            </td>

            {/* Actions */}
            <td className="py-3.5 px-4">
                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <ActionButton onClick={() => onViewDetails(group.id)} hoverColor="blue" title={t("groups.actions.viewDetails") || "View Details"}>
                        <Info className="w-4 h-4 text-blue-600" />
                    </ActionButton>
                    {group.status === "draft" && (
                        <ActionButton onClick={() => onActivate(group.id)} hoverColor="green" title={t("groups.actions.activate") || "Activate"}>
                            <PlayCircle className="w-4 h-4 text-emerald-600" />
                        </ActionButton>
                    )}
                    {group.status === "active" && !group.isFull && (
                        <ActionButton onClick={() => onAddStudents(group.id)} hoverColor="blue" title={t("groups.actions.addStudents") || "Add Students"}>
                            <UserPlus className="w-4 h-4 text-blue-600" />
                        </ActionButton>
                    )}
                    {group.sessionsGenerated && (
                        <ActionButton onClick={() => onViewSessions(group.id)} hoverColor="purple" title={t("groups.actions.viewSessions") || "View Sessions"}>
                            <Calendar className="w-4 h-4 text-purple-600" />
                        </ActionButton>
                    )}
                    <ActionButton onClick={() => onEdit(group)} hoverColor="gray" title={t("groups.actions.edit") || "Edit"}>
                        <Edit className="w-4 h-4 text-primary" />
                    </ActionButton>
                    <ActionButton onClick={() => onDelete(group.id, group.name)} hoverColor="red" title={t("groups.actions.delete") || "Delete"}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                    </ActionButton>
                </div>
            </td>
        </tr>
    );
}

function ActionButton({ onClick, hoverColor, title, children }) {
    const hoverClasses = {
        blue: "hover:bg-blue-50 dark:hover:bg-blue-900/30",
        green: "hover:bg-emerald-50 dark:hover:bg-emerald-900/30",
        purple: "hover:bg-purple-50 dark:hover:bg-purple-900/30",
        red: "hover:bg-red-50 dark:hover:bg-red-900/30",
        gray: "hover:bg-gray-100 dark:hover:bg-gray-700",
    };
    return (
        <button onClick={onClick} title={title} className={`p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95 ${hoverClasses[hoverColor]}`}>
            {children}
        </button>
    );
}

// ─── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ pagination, t, isRTL, onPageChange }) {
    const { page, totalPages, limit, total } = pagination;
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);

    const pageNumbers = useMemo(() => {
        const delta = 1;
        const range = [];
        const rangeWithDots = [];
        let l;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
                range.push(i);
            }
        }

        for (const i of range) {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l > 2) {
                    rangeWithDots.push("...");
                }
            }
            rangeWithDots.push(i);
            l = i;
        }

        return rangeWithDots;
    }, [page, totalPages]);

    const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
    const NextIcon = isRTL ? ChevronLeft : ChevronRight;
    const FirstIcon = isRTL ? ChevronsRight : ChevronsLeft;
    const LastIcon = isRTL ? ChevronsLeft : ChevronsRight;

    return (
        <div className="px-4 py-3.5 border-t border-PowderBlueBorder dark:border-dark_border bg-gray-50/50 dark:bg-dark_input/30">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-SlateBlueText dark:text-darktext order-2 sm:order-1 tabular-nums">
                    {t("groups.pagination.showing")
                        ?.replace("{start}", start)
                        ?.replace("{end}", end)
                        ?.replace("{total}", total)
                        || `Showing ${start}-${end} of ${total}`}
                </p>
                <div className="flex items-center gap-1 order-1 sm:order-2">
                    <PaginationButton
                        onClick={() => onPageChange(1)}
                        disabled={page === 1}
                        title={t("groups.pagination.first") || "First"}
                    >
                        <FirstIcon className="w-4 h-4" />
                    </PaginationButton>

                    <PaginationButton
                        onClick={() => onPageChange(page - 1)}
                        disabled={page === 1}
                        title={t("groups.pagination.prev") || "Previous"}
                    >
                        <PrevIcon className="w-4 h-4" />
                    </PaginationButton>

                    <div className="flex items-center gap-1 mx-1">
                        {pageNumbers.map((p, idx) =>
                            p === "..." ? (
                                <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-gray-400">…</span>
                            ) : (
                                <button
                                    key={p}
                                    onClick={() => onPageChange(p)}
                                    aria-current={p === page ? "page" : undefined}
                                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all tabular-nums ${p === page
                                            ? "bg-primary text-white shadow-sm shadow-primary/30"
                                            : "text-MidnightNavyText dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                                        }`}
                                >
                                    {p}
                                </button>
                            )
                        )}
                    </div>

                    <PaginationButton
                        onClick={() => onPageChange(page + 1)}
                        disabled={page === totalPages}
                        title={t("groups.pagination.next") || "Next"}
                    >
                        <NextIcon className="w-4 h-4" />
                    </PaginationButton>

                    <PaginationButton
                        onClick={() => onPageChange(totalPages)}
                        disabled={page === totalPages}
                        title={t("groups.pagination.last") || "Last"}
                    >
                        <LastIcon className="w-4 h-4" />
                    </PaginationButton>
                </div>
            </div>
        </div>
    );
}

function PaginationButton({ onClick, disabled, title, children }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-PowderBlueBorder dark:border-dark_border text-MidnightNavyText dark:text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all"
        >
            {children}
        </button>
    );
}