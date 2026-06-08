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
    UserCheck, Layers,
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
    page: 1,
    limit: 10,
};

const INITIAL_PAGINATION = { page: 1, limit: 10, total: 0, totalPages: 1 };
const INITIAL_STATS = { total: 0, active: 0, draft: 0, completed: 0, cancelled: 0 };

const STATUS_COLORS = {
    active:    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200",
    draft:     "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200",
    completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200",
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
        Sunday:    isRTL ? "الأحد"     : "Sun",
        Monday:    isRTL ? "الإثنين"   : "Mon",
        Tuesday:   isRTL ? "الثلاثاء"  : "Tue",
        Wednesday: isRTL ? "الأربعاء"  : "Wed",
        Thursday:  isRTL ? "الخميس"    : "Thu",
        Friday:    isRTL ? "الجمعة"    : "Fri",
        Saturday:  isRTL ? "السبت"     : "Sat",
    }), [isRTL]);

    const statusLabels = useMemo(() => ({
        active:    t("groups.status.active")    || "Active",
        draft:     t("groups.status.draft")     || "Draft",
        completed: t("groups.status.completed") || "Completed",
        cancelled: t("groups.status.cancelled") || "Cancelled",
    }), [t]);

    const statsConfig = useMemo(() => [
        { label: t("groups.stats.total")     || "Total",     value: stats.total,     color: "text-MidnightNavyText dark:text-white", icon: <Users      className="w-8 h-8 md:w-10 md:h-10 text-primary"    /> },
        { label: t("groups.stats.active")    || "Active",    value: stats.active,    color: "text-green-600",                        icon: <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-green-600" /> },
        { label: t("groups.stats.draft")     || "Draft",     value: stats.draft,     color: "text-gray-600",                         icon: <AlertCircle className="w-8 h-8 md:w-10 md:h-10 text-gray-600"  /> },
        { label: t("groups.stats.completed") || "Completed", value: stats.completed, color: "text-blue-600",                         icon: <Target      className="w-8 h-8 md:w-10 md:h-10 text-blue-600"  /> },
        { label: t("groups.stats.cancelled") || "Cancelled", value: stats.cancelled, color: "text-red-600",                          icon: <XCircle     className="w-8 h-8 md:w-10 md:h-10 text-red-600"   /> },
    ], [stats, t]);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.search)                                    count++;
        if (filters.status.length > 0)                         count++;
        if (filters.courseId)                                  count++;
        if (filters.instructorId)                              count++;
        if (filters.capacity)                                  count++;
        if (filters.daysOfWeek.length > 0)                     count++;
        if (filters.startDateFrom || filters.startDateTo)      count++;
        if (filters.createdAtFrom || filters.createdAtTo)      count++;
        if (filters.studentsCountMin || filters.studentsCountMax) count++;
        if (filters.sessionsGenerated)                         count++;
        return count;
    }, [filters]);

    // ── Data Fetching ──────────────────────────────────────────────────────────
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
                if (coursesJson.success)     setCourses(coursesJson.data || []);
                if (instructorsJson.success) setInstructorsList(instructorsJson.data || []);
            } catch (err) {
                console.error("Error fetching filter data:", err);
            }
        };
        fetchFilterData();
    }, []);

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
                if (json.stats)      setStats(json.stats);
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
                    forceActivate:   pendingActivation.forceActivate,
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
            <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
        );
    }

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className={`space-y-4 md:space-y-6 p-2 md:p-0 ${isRTL ? "rtl" : "ltr"}`} dir={isRTL ? "rtl" : "ltr"}>

            {/* ── Header ── */}
            <div className="bg-white dark:bg-darkmode rounded-xl shadow-sm p-4 md:p-6 border border-PowderBlueBorder dark:border-dark_border">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Users className="w-5 h-5 md:w-7 md:h-7 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-MidnightNavyText dark:text-white">
                                {t("groups.title") || "Groups Management"}
                            </h1>
                            <p className="text-xs md:text-sm text-SlateBlueText dark:text-darktext">
                                {t("groups.subtitle") || "Manage your groups and sessions"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setEditingGroup(null); setModalOpen(true); }}
                        className="bg-primary hover:bg-primary/90 text-white px-4 py-2.5 md:px-6 md:py-3 rounded-lg font-semibold text-xs md:text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2 w-full md:w-auto justify-center"
                    >
                        <Plus className="w-4 h-4" />
                        {t("groups.create") || "Create Group"}
                    </button>
                </div>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                {statsConfig.map((stat) => (
                    <div key={stat.label} className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] md:text-xs text-SlateBlueText dark:text-darktext uppercase">{stat.label}</p>
                                <p className={`text-lg md:text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                            </div>
                            {stat.icon}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Filters ── */}
            <div className="bg-white dark:bg-darkmode rounded-xl p-4 md:p-6 border border-PowderBlueBorder dark:border-dark_border shadow-sm space-y-4">

                {/* Row 1: Search + Course + Instructor + Advanced Toggle */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">

                    {/* Search */}
                    <div className="relative">
                        <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
                        <input
                            type="text"
                            placeholder={t("groups.filters.search") || "Search by name or code..."}
                            value={searchInput}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className={`w-full ${isRTL ? "pr-10 pl-4" : "pl-10 pr-4"} py-2.5 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary dark:bg-dark_input dark:text-white`}
                        />
                    </div>

                    {/* Course */}
                    <div className="relative">
                        <GraduationCap className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
                        <select
                            value={filters.courseId}
                            onChange={(e) => handleFilterChange("courseId", e.target.value)}
                            className={`w-full ${isRTL ? "pr-10 pl-4" : "pl-10 pr-4"} py-2.5 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary dark:bg-dark_input dark:text-white appearance-none`}
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
                            className={`w-full ${isRTL ? "pr-10 pl-4" : "pl-10 pr-4"} py-2.5 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary dark:bg-dark_input dark:text-white appearance-none`}
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
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            showAdvancedFilters
                                ? "bg-primary text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        {t("groups.filters.advanced") || "Advanced"}
                        {activeFiltersCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                                {activeFiltersCount}
                            </span>
                        )}
                        <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedFilters ? "rotate-180" : ""}`} />
                    </button>
                </div>

                {/* Advanced Filters Panel */}
                {showAdvancedFilters && (
                    <div className="space-y-4 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">

                        {/* Status + Capacity + Sessions */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                            {/* Status chips */}
                            <div>
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                                    {t("groups.filters.status") || "Status"}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {["draft", "active", "completed", "cancelled"].map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => toggleStatus(status)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                                                filters.status.includes(status)
                                                    ? STATUS_COLORS[status]
                                                    : "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                                            }`}
                                        >
                                            {statusLabels[status]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Capacity */}
                            <div>
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                                    {t("groups.filters.capacity") || "Capacity"}
                                </label>
                                <div className="flex gap-2">
                                    {[
                                        { value: "",          label: t("groups.filters.all")       || "All"       },
                                        { value: "full",      label: t("groups.filters.full")      || "Full"      },
                                        { value: "available", label: t("groups.filters.available") || "Available" },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleFilterChange("capacity", opt.value)}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                filters.capacity === opt.value
                                                    ? "bg-primary text-white"
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
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                                    {t("groups.filters.sessions") || "Sessions"}
                                </label>
                                <div className="flex gap-2">
                                    {[
                                        { value: "",      label: t("groups.filters.all")          || "All"           },
                                        { value: "true",  label: t("groups.filters.generated")    || "Generated"     },
                                        { value: "false", label: t("groups.filters.notGenerated") || "Not Generated" },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleFilterChange("sessionsGenerated", opt.value)}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                filters.sessionsGenerated === opt.value
                                                    ? "bg-primary text-white"
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
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" />
                                {t("groups.filters.daysOfWeek") || "Days of Week"}
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {DAYS_OF_WEEK.map((day) => (
                                    <button
                                        key={day}
                                        onClick={() => toggleDay(day)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                            filters.daysOfWeek.includes(day)
                                                ? "bg-primary text-white shadow-sm"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                                        }`}
                                    >
                                        {dayLabels[day]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Date Ranges */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DateRangeFilter
                                label={t("groups.filters.startDate") || "Start Date Range"}
                                icon={<Calendar className="w-3 h-3" />}
                                fromValue={filters.startDateFrom}
                                toValue={filters.startDateTo}
                                onFromChange={(v) => handleFilterChange("startDateFrom", v)}
                                onToChange={(v) => handleFilterChange("startDateTo", v)}
                            />
                            <DateRangeFilter
                                label={t("groups.filters.createdAt") || "Created Date Range"}
                                icon={<Clock className="w-3 h-3" />}
                                fromValue={filters.createdAtFrom}
                                toValue={filters.createdAtTo}
                                onFromChange={(v) => handleFilterChange("createdAtFrom", v)}
                                onToChange={(v) => handleFilterChange("createdAtTo", v)}
                            />
                        </div>

                        {/* Students Count + Actions */}
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-dark_input rounded-lg p-3">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span className="text-xs text-gray-500">{t("groups.filters.studentsCount") || "Students:"}</span>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Min"
                                    value={filters.studentsCountMin}
                                    onChange={(e) => handleFilterChange("studentsCountMin", e.target.value)}
                                    className="w-16 px-2 py-1.5 text-xs border rounded-lg dark:bg-dark_input dark:text-white"
                                />
                                <span className="text-gray-400">-</span>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Max"
                                    value={filters.studentsCountMax}
                                    onChange={(e) => handleFilterChange("studentsCountMax", e.target.value)}
                                    className="w-16 px-2 py-1.5 text-xs border rounded-lg dark:bg-dark_input dark:text-white"
                                />
                            </div>

                            <div className="flex items-center gap-2 ml-auto">
                                {activeFiltersCount > 0 && (
                                    <>
                                        <span className="px-3 py-1.5 bg-primary/10 text-primary text-xs rounded-full font-medium flex items-center gap-1">
                                            <Filter className="w-3 h-3" />
                                            {activeFiltersCount} {t("groups.filters.active") || "active"}
                                        </span>
                                        <button
                                            onClick={clearAllFilters}
                                            className="px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
                                        >
                                            <X className="w-3 h-3" />
                                            {t("groups.filters.clearAll") || "Clear All"}
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={loadGroups}
                                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-all"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    {t("groups.filters.refresh") || "Refresh"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Table ── */}
            <div className="bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-PowderBlueBorder dark:divide-dark_border">
                        <thead className="bg-gray-50 dark:bg-dark_input">
                            <tr>
                                {[
                                    t("groups.table.group")    || "Group",
                                    t("groups.table.course")   || "Course",
                                    t("groups.table.status")   || "Status",
                                    t("groups.table.students") || "Students",
                                    t("groups.table.sessions") || "Sessions",
                                    t("groups.table.actions")  || "Actions",
                                ].map((h) => (
                                    <th key={h} className={`py-3 px-4 ${isRTL ? "text-right" : "text-left"} text-xs font-semibold text-MidnightNavyText dark:text-white uppercase`}>
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
                    <div className="text-center py-12 px-4">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold mb-2">{t("groups.empty.title") || "No Groups Found"}</h3>
                        <p className="text-sm text-gray-500 mb-6">{t("groups.empty.description") || "Try adjusting your filters or create a new group."}</p>
                        <button
                            onClick={() => setModalOpen(true)}
                            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-semibold flex items-center gap-2 mx-auto"
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
                        onPageChange={(page) => handleFilterChange("page", page)}
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
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DateRangeFilter({ label, icon, fromValue, toValue, onFromChange, onToChange }) {
    return (
        <div className="bg-gray-50 dark:bg-dark_input rounded-lg p-3">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                {icon}
                {label}
            </label>
            <div className="flex items-center gap-2">
                <input
                    type="date"
                    value={fromValue}
                    onChange={(e) => onFromChange(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
                />
                <span className="text-gray-400">→</span>
                <input
                    type="date"
                    value={toValue}
                    onChange={(e) => onToChange(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
                />
            </div>
        </div>
    );
}

function GroupRow({ group, dayLabels, statusLabels, t, onViewDetails, onActivate, onAddStudents, onViewSessions, onEdit, onDelete }) {
    return (
        <tr className="hover:bg-gray-50 dark:hover:bg-dark_input transition-colors">

            {/* Group Info */}
            <td className="py-3 px-4">
                <p className="font-medium text-sm text-MidnightNavyText dark:text-white">{group.name}</p>
                <p className="text-xs text-SlateBlueText dark:text-darktext flex items-center gap-1">
                    <Hash className="w-3 h-3" />{group.code}
                </p>
                {group.schedule?.daysOfWeek && (
                    <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {group.schedule.daysOfWeek.map((d) => dayLabels[d] || d).join(", ")}
                        {" · "}{group.schedule.timeFrom}-{group.schedule.timeTo}
                    </p>
                )}
            </td>

            {/* Course */}
            <td className="py-3 px-4">
                <p className="text-sm text-MidnightNavyText dark:text-white">{group.course?.title || "N/A"}</p>
                <p className="text-xs text-SlateBlueText dark:text-darktext">{group.course?.level || ""}</p>
            </td>

            {/* Status */}
            <td className="py-3 px-4">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[group.status] || STATUS_COLORS.draft}`}>
                    {statusLabels[group.status] || group.status}
                </span>
            </td>

            {/* Students */}
            <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium">{group.studentsCount}/{group.maxStudents}</span>
                    {group.isFull && (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] rounded font-medium">
                            {t("groups.status.full") || "FULL"}
                        </span>
                    )}
                </div>
            </td>

            {/* Sessions */}
            <td className="py-3 px-4">
                {group.sessionsGenerated ? (
                    <span className="text-green-600 flex items-center gap-1 text-sm">
                        <CheckCircle className="w-3 h-3" />{group.totalSessions}
                    </span>
                ) : (
                    <span className="text-gray-400 text-sm flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {t("groups.sessions.notGenerated") || "Not generated"}
                    </span>
                )}
            </td>

            {/* Actions */}
            <td className="py-3 px-4">
                <div className="flex items-center gap-1">
                    <ActionButton onClick={() => onViewDetails(group.id)} hoverColor="blue"   title={t("groups.actions.viewDetails") || "View Details"}>
                        <Info className="w-4 h-4 text-blue-600" />
                    </ActionButton>
                    {group.status === "draft" && (
                        <ActionButton onClick={() => onActivate(group.id)} hoverColor="green" title={t("groups.actions.activate") || "Activate"}>
                            <PlayCircle className="w-4 h-4 text-green-600" />
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
        blue:   "hover:bg-blue-100 dark:hover:bg-blue-900/30",
        green:  "hover:bg-green-100 dark:hover:bg-green-900/30",
        purple: "hover:bg-purple-100 dark:hover:bg-purple-900/30",
        red:    "hover:bg-red-100 dark:hover:bg-red-900/30",
        gray:   "hover:bg-gray-100 dark:hover:bg-gray-700",
    };
    return (
        <button onClick={onClick} title={title} className={`p-1.5 rounded transition-colors ${hoverClasses[hoverColor]}`}>
            {children}
        </button>
    );
}

function Pagination({ pagination, t, onPageChange }) {
    const { page, totalPages, limit, total } = pagination;
    const start = (page - 1) * limit + 1;
    const end   = Math.min(page * limit, total);

    return (
        <div className="px-4 py-3 border-t border-PowderBlueBorder dark:border-dark_border">
            <div className="flex items-center justify-between">
                <p className="text-xs text-SlateBlueText">
                    {t("groups.pagination.showing")
                        ?.replace("{start}", start)
                        ?.replace("{end}", end)
                        ?.replace("{total}", total)
                        || `Showing ${start}-${end} of ${total}`}
                </p>
                <div className="flex items-center gap-2">
                    <PaginationButton onClick={() => onPageChange(1)}         disabled={page === 1}>           <ChevronsRight className="w-4 h-4" /></PaginationButton>
                    <PaginationButton onClick={() => onPageChange(page - 1)}  disabled={page === 1}>           <ChevronRight  className="w-4 h-4" /></PaginationButton>
                    <span className="px-3 py-1 text-sm font-medium">
                        {t("groups.pagination.page")
                            ?.replace("{page}", page)
                            ?.replace("{pages}", totalPages)
                            || `${page} / ${totalPages}`}
                    </span>
                    <PaginationButton onClick={() => onPageChange(page + 1)}  disabled={page === totalPages}> <ChevronLeft  className="w-4 h-4" /></PaginationButton>
                    <PaginationButton onClick={() => onPageChange(totalPages)} disabled={page === totalPages}> <ChevronsLeft className="w-4 h-4" /></PaginationButton>
                </div>
            </div>
        </div>
    );
}

function PaginationButton({ onClick, disabled, children }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="p-2 border rounded disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
            {children}
        </button>
    );
}