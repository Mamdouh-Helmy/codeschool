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
    Link2Off,
    PauseCircle,
    Gift,
    MessageSquare,
    Archive,
    ArchiveRestore,
    CheckCheck,
    MoreVertical,
} from "lucide-react";
import Modal from "./Modal";
import GroupForm from "./GroupForm";
import AddStudentsToGroup from "./AddStudentsToGroup";
import InstructorNotificationModal from "./InstructorNotificationModal";
import MeetingLinksCheckModal from "./MeetingLinksCheckModal";
import FixGroupLinksModal from "./FixGroupLinksModal";
import GroupDetailsPage from "./GroupDetailsPage";
import GroupHoldModal from "./GroupHoldModal";
import MakeupSessionForm from "./MakeupSessionForm";
import GroupMessageModal from "./GroupMessageModal";
import { useConfirm } from "./ConfirmDialog";
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
    tags: "",
    groupType: "",
    archived: "",
    page: 1,
    limit: 10,
};

const INITIAL_PAGINATION = { page: 1, limit: 10, total: 0, totalPages: 1 };
const INITIAL_STATS = {
    total: 0,
    active: 0,
    draft: 0,
    completed: 0,
    cancelled: 0,
    onHold: 0,
    makeup: 0,
    kids: 0,
    adults: 0,
    archived: 0,
};

const DEFAULT_PENDING_ACTIVATION = {
    forceActivate: false,
    releaseReserved: false,
    selectedLinkIds: [],
    firstMeetingLink: "",
    linkAssignmentMode: "first_available",
};

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

// لون التايم ستامب (زي لون الوقت في الواتس) حسب الحالة
const STATUS_TIME_COLOR = {
    active: "text-emerald-600 dark:text-emerald-400",
    draft: "text-slate-400",
    completed: "text-sky-600 dark:text-sky-400",
    cancelled: "text-rose-500 dark:text-rose-400",
};

// حلقة الأفاتار (زي حلقة الستاتس في الواتس)
const STATUS_RING = {
    active: "from-emerald-400 to-emerald-600",
    draft: "from-slate-300 to-slate-400",
    completed: "from-sky-400 to-sky-600",
    cancelled: "from-rose-400 to-rose-600",
};

const AVATAR_GRADIENTS = [
    "from-orange-400 to-rose-500",
    "from-teal-500 to-emerald-600",
    "from-sky-500 to-indigo-600",
    "from-violet-500 to-fuchsia-600",
    "from-amber-400 to-orange-600",
    "from-cyan-500 to-blue-600",
];

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
        tags: "tags",
        groupType: "groupType",
        archived: "archived",
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

const getInitials = (name = "") => {
    const words = String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2);
    if (words.length === 0) return "?";
    return words.map((w) => Array.from(w)[0]).join("").toUpperCase();
};

const avatarGradientFor = (name = "") => {
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return AVATAR_GRADIENTS[sum % AVATAR_GRADIENTS.length];
};

const selectCls = (isRTL) =>
    `w-full ${isRTL ? "pr-10 pl-4" : "pl-10 pr-4"} py-2.5 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all bg-white dark:bg-dark_input dark:text-white appearance-none`;

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GroupsAdmin() {
    const { t, language } = useI18n();
    const router = useRouter();
    const isRTL = language === "ar";

    // ✨ Custom confirm dialog (بديل window.confirm)
    const [confirm, confirmDialog] = useConfirm(isRTL);

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
    const [tagsList, setTagsList] = useState([]);
    const [tagsModalOpen, setTagsModalOpen] = useState(false);
    const [editingTag, setEditingTag] = useState(null);
    const [newTagName, setNewTagName] = useState("");
    const [newTagColor, setNewTagColor] = useState("#3B82F6");

    const [modalOpen, setModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [viewDetailsModal, setViewDetailsModal] = useState({ open: false, groupId: null });
    const [addStudentsModalOpen, setAddStudentsModalOpen] = useState(false);
    const [selectedGroupForStudents, setSelectedGroupForStudents] = useState(null);
    const [meetingLinksModal, setMeetingLinksModal] = useState({ open: false, groupId: null });
    const [fixLinksModal, setFixLinksModal] = useState({ open: false, groupId: null });
    const [instructorNotificationModal, setInstructorNotificationModal] = useState({
        open: false, groupData: null, instructors: [],
    });

    // ✅ Hold state
    const [holdModal, setHoldModal] = useState({ open: false, groupId: null });

    // 🎁 Make-up Session state
    const [makeupModalOpen, setMakeupModalOpen] = useState(false);

    const [pendingActivation, setPendingActivation] = useState(DEFAULT_PENDING_ACTIVATION);
    const [messageModal, setMessageModal] = useState({ open: false, groupId: null });

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

    const groupTypeLabels = useMemo(() => ({
        kids: t("groups.groupType.kids") || "Kids",
        adults: t("groups.groupType.adults") || "Adults",
    }), [t]);

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
        if (filters.tags) count++;
        if (filters.groupType) count++;
        if (filters.archived) count++;
        return count;
    }, [filters]);

    // عدد الفلاتر المتقدمة فقط (اللي جوه البانل) — للبادج على زرار الفلاتر
    const advancedFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.courseId) count++;
        if (filters.instructorId) count++;
        if (filters.capacity) count++;
        if (filters.daysOfWeek.length > 0) count++;
        if (filters.startDateFrom || filters.startDateTo) count++;
        if (filters.createdAtFrom || filters.createdAtTo) count++;
        if (filters.studentsCountMin || filters.studentsCountMax) count++;
        if (filters.sessionsGenerated) count++;
        if (filters.tags) count++;
        return count;
    }, [filters]);

    const onSendMessage = useCallback((groupId) => setMessageModal({ open: true, groupId }), []);
    const closeMessageModal = useCallback(() => setMessageModal({ open: false, groupId: null }), []);

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
                if (coursesJson.success) setCourses(coursesJson.data || []);
                if (instructorsJson.success) setInstructorsList(instructorsJson.data || []);
            } catch (err) {
                console.error("Error fetching filter data:", err);
            }
        };
        fetchFilterData();
    }, []);

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
                if (json.stats) setStats({ ...INITIAL_STATS, ...json.stats });
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

    const clearSearch = useCallback(() => {
        setSearchInput("");
        clearTimeout(searchTimeoutRef.current);
        setFilters((prev) => ({ ...prev, search: "", page: 1 }));
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

    const clearStatus = useCallback(() => {
        setFilters((prev) => ({ ...prev, status: [], page: 1 }));
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
        const ok = await confirm({
            variant: "danger",
            title: t("groups.delete.title") || "حذف الجروب",
            itemName: name,
            message:
                t("groups.delete.confirm")?.replace("{name}", name) ||
                "متأكد إنك عايز تحذف الجروب ده؟",
            note: t("groups.delete.warning") || "الإجراء ده مش ممكن التراجع عنه.",
            confirmText: t("groups.actions.delete") || "حذف",
            cancelText: t("common.cancel") || "إلغاء",
        });
        if (!ok) return;

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
    }, [loadGroups, t, confirm]);

    const onActivateWithNotification = useCallback((groupId) => {
        if (!groupId) {
            toast.error(t("groups.activate.invalidId"), { position: "top-center" });
            return;
        }
        setMeetingLinksModal({ open: true, groupId });
    }, [t]);

    const onMeetingLinksCheckConfirmed = useCallback(async (
        forceActivate,
        releaseReserved,
        selectedLinkIds = [],
        availableLinks = [],
        linkAssignmentMode = "first_available",
    ) => {
        const groupId = meetingLinksModal.groupId;
        setMeetingLinksModal({ open: false, groupId: null });

        const firstSelectedLink = availableLinks.find(
            (l) => selectedLinkIds.includes(l._id?.toString() || l.id?.toString())
        );
        const firstMeetingLink = firstSelectedLink?.link || "";
        setPendingActivation({
            forceActivate,
            releaseReserved,
            selectedLinkIds,
            firstMeetingLink,
            linkAssignmentMode,
        });

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
                    linkAssignmentMode: pendingActivation.linkAssignmentMode,
                }),
            });
            const result = await res.json();
            if (res.ok && result.success) {
                await loadGroups();
                toast.success(t("groups.activate.success"), { id: loadingToast, position: "top-center" });
                setInstructorNotificationModal({ open: false, groupData: null, instructors: [] });
                setPendingActivation(DEFAULT_PENDING_ACTIVATION);
            } else {
                toast.error(result.error || t("groups.activate.failed"), {
                    id: loadingToast,
                    position: "top-center",
                    duration: 8000,
                });
            }
        } catch {
            toast.error(t("groups.activate.failed"), { id: loadingToast, position: "top-center" });
        }
    }, [instructorNotificationModal, pendingActivation, loadGroups, t]);

    const onAddStudents = useCallback((groupId) => {
        setSelectedGroupForStudents(groupId);
        setAddStudentsModalOpen(true);
    }, []);

    const onFixLinks = useCallback((groupId) => {
        setFixLinksModal({ open: true, groupId });
    }, []);

    // ✅ فتح مودال Hold
    const onHold = useCallback((groupId) => {
        setHoldModal({ open: true, groupId });
    }, []);

    // 🎁 فتح مودال الحصة التعويضية
    const onMakeup = useCallback(() => {
        setMakeupModalOpen(true);
    }, []);

    const closeMakeupModal = useCallback(() => {
        setMakeupModalOpen(false);
    }, []);

    const onMakeupSaved = useCallback(async () => {
        await loadGroups();
        toast.success(
            t("groups.makeup.created") || "تم إنشاء الحصة التعويضية بنجاح",
            { position: "top-center" }
        );
    }, [loadGroups, t]);

    // ✅ فكّ الـ Hold مباشرة
    const onRelease = useCallback(async (groupId, groupName) => {
        const ok = await confirm({
            variant: "success",
            title: t("groups.actions.release") || "فكّ التعليق",
            itemName: groupName,
            message:
                t("groups.hold.confirmRelease")?.replace("{name}", groupName) ||
                "متأكد إنك عايز تفك الـ Hold عن الجروب ده؟",
            confirmText: t("groups.actions.release") || "فكّ الـ Hold",
            cancelText: t("common.cancel") || "إلغاء",
        });
        if (!ok) return;

        const loadingToast = toast.loading(
            t("groups.hold.releasing") || "جاري فك الـ Hold...",
            { position: "top-center" }
        );
        try {
            const res = await fetch(`/api/groups/${groupId}/hold`, {
                method: "DELETE",
            });
            const json = await res.json();
            if (json.success) {
                await loadGroups();
                toast.success(
                    t("groups.hold.releaseSuccess") || "تم فكّ الـ Hold بنجاح",
                    { id: loadingToast, position: "top-center" }
                );
            } else {
                toast.error(
                    json.error || t("groups.hold.releaseFailed") || "فشل فك الـ Hold",
                    { id: loadingToast, position: "top-center" }
                );
            }
        } catch (err) {
            console.error(err);
            toast.error(
                t("groups.hold.releaseFailed") || "فشل الاتصال",
                { id: loadingToast, position: "top-center" }
            );
        }
    }, [loadGroups, t, confirm]);

    // 🗄️ أرشفة جروب
    const onArchive = useCallback(async (groupId, groupName) => {
        const ok = await confirm({
            variant: "warning",
            title: "أرشفة الجروب",
            itemName: groupName,
            message: "هيتوقف أي رسائل أو أتمتة للجروب ده.",
            note: "تقدر ترجّعه من الأرشيف في أي وقت.",
            confirmText: "أرشفة",
            cancelText: "إلغاء",
        });
        if (!ok) return;

        const loadingToast = toast.loading("جاري الأرشفة...", { position: "top-center" });
        try {
            const res = await fetch(`/api/groups/${groupId}/archive`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            const json = await res.json();
            if (json.success) {
                await loadGroups();
                toast.success(json.message || "تم أرشفة الجروب", { id: loadingToast, position: "top-center" });
            } else {
                toast.error(json.error || "فشلت الأرشفة", { id: loadingToast, position: "top-center" });
            }
        } catch (err) {
            console.error(err);
            toast.error("فشل الاتصال", { id: loadingToast, position: "top-center" });
        }
    }, [loadGroups, confirm]);

    // ♻️ استرجاع جروب من الأرشيف
    const onRestore = useCallback(async (groupId) => {
        const loadingToast = toast.loading("جاري الاسترجاع...", { position: "top-center" });
        try {
            const res = await fetch(`/api/groups/${groupId}/archive`, { method: "DELETE" });
            const json = await res.json();
            if (json.success) {
                await loadGroups();
                toast.success(json.message || "تم استرجاع الجروب", { id: loadingToast, position: "top-center" });
            } else {
                toast.error(json.error || "فشل الاسترجاع", { id: loadingToast, position: "top-center" });
            }
        } catch (err) {
            console.error(err);
            toast.error("فشل الاتصال", { id: loadingToast, position: "top-center" });
        }
    }, [loadGroups]);

    const closeHoldModal = useCallback(() => {
        setHoldModal({ open: false, groupId: null });
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

    const handleDeleteTag = async (id) => {
        const tag = tagsList.find((tg) => tg._id === id);
        const ok = await confirm({
            variant: "danger",
            title: "حذف الوسم",
            itemName: tag?.name,
            message: "هيتشال الوسم نهائيًا من كل الجروبات.",
            note: "الإجراء ده مش ممكن التراجع عنه.",
            confirmText: "حذف",
            cancelText: "إلغاء",
        });
        if (!ok) return;

        try {
            const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Tag permanently deleted");
                await loadTags();
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
        setPendingActivation(DEFAULT_PENDING_ACTIVATION);
    }, []);

    const closeFixLinksModal = useCallback(() => {
        setFixLinksModal({ open: false, groupId: null });
    }, []);

    // ── Stories row config (دواير الستاتس) ─────────────────────────────────────
    const storiesConfig = useMemo(() => [
        {
            key: "total",
            label: t("groups.stats.total") || "Total",
            value: stats.total,
            grad: "from-primary to-orange-deep",
            badge: "bg-primary",
            icon: <Users className="w-3 h-3" />,
            active: filters.status.length === 0,
            onClick: clearStatus,
        },
        {
            key: "active",
            label: t("groups.stats.active") || "Active",
            value: stats.active,
            grad: "from-emerald-400 to-emerald-600",
            badge: "bg-emerald-500",
            icon: <CheckCircle className="w-3 h-3" />,
            active: filters.status.includes("active"),
            onClick: () => toggleStatus("active"),
        },
        {
            key: "onHold",
            label: t("groups.stats.onHold") || "On Hold",
            value: stats.onHold || 0,
            grad: "from-amber-400 to-amber-600",
            badge: "bg-amber-500",
            icon: <PauseCircle className="w-3 h-3" />,
        },
        {
            key: "draft",
            label: t("groups.stats.draft") || "Draft",
            value: stats.draft,
            grad: "from-slate-300 to-slate-500",
            badge: "bg-slate-500",
            icon: <AlertCircle className="w-3 h-3" />,
            active: filters.status.includes("draft"),
            onClick: () => toggleStatus("draft"),
        },
        {
            key: "completed",
            label: t("groups.stats.completed") || "Completed",
            value: stats.completed,
            grad: "from-sky-400 to-sky-600",
            badge: "bg-sky-500",
            icon: <Target className="w-3 h-3" />,
            active: filters.status.includes("completed"),
            onClick: () => toggleStatus("completed"),
        },
        {
            key: "cancelled",
            label: t("groups.stats.cancelled") || "Cancelled",
            value: stats.cancelled,
            grad: "from-rose-400 to-rose-600",
            badge: "bg-rose-500",
            icon: <XCircle className="w-3 h-3" />,
            active: filters.status.includes("cancelled"),
            onClick: () => toggleStatus("cancelled"),
        },
        {
            key: "makeup",
            label: t("groups.stats.makeup") || "Make-up",
            value: stats.makeup || 0,
            grad: "from-amber-brand to-orange-deep",
            badge: "bg-orange-deep",
            icon: <Gift className="w-3 h-3" />,
        },
    ], [stats, filters.status, t, clearStatus, toggleStatus]);

    // ── Filter chips (زي شيبس الواتس: الكل / غير مقروء / ...) ───────────────────
    const noQuickFilter = filters.status.length === 0 && !filters.groupType && !filters.archived;

    const chipBase = "shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all active:scale-95 whitespace-nowrap";
    const chipOn = "bg-primary/15 text-primary ring-1 ring-inset ring-primary/30 font-semibold";
    const chipOff = "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10";

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

    const showingFrom = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
    const showingTo = Math.min(pagination.page * pagination.limit, pagination.total);

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div
            className={`relative rounded-3xl p-3 md:p-5  ${isRTL ? "rtl" : "ltr"}`}
            dir={isRTL ? "rtl" : "ltr"}
            style={{
                backgroundImage: "radial-gradient(rgba(0,96,109,0.07) 1.2px, transparent 1.2px)",
                backgroundSize: "20px 20px",
            }}
        >
            <div className="max-w-7xl mx-auto space-y-4 md:space-y-5">

                {/* ── Stories row ── */}
                <div className="-mx-1 px-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="flex items-start gap-4 md:gap-6 min-w-max md:min-w-0 md:justify-center py-1">
                        {storiesConfig.map((s) => {
                            const clickable = typeof s.onClick === "function";
                            const Wrapper = clickable ? "button" : "div";
                            return (
                                <Wrapper
                                    key={s.key}
                                    {...(clickable ? { onClick: s.onClick, type: "button" } : {})}
                                    className={`group/story flex flex-col items-center gap-1.5 ${clickable ? "cursor-pointer active:scale-95" : ""} transition-transform`}
                                >
                                    <div className="relative">
                                        <div className={`p-[3px] rounded-full bg-gradient-to-tr ${s.grad} ${s.active === false ? "opacity-50 grayscale-[40%]" : ""} ${clickable ? "group-hover/story:scale-105" : ""} transition-all`}>
                                            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white dark:bg-darkmode border-[3px] border-white dark:border-darkmode flex items-center justify-center">
                                                <span className="text-lg md:text-xl font-extrabold text-MidnightNavyText dark:text-white tabular-nums">{s.value}</span>
                                            </div>
                                        </div>
                                        <span className={`absolute -bottom-0.5 -end-0.5 w-5 h-5 rounded-full ${s.badge} text-white flex items-center justify-center ring-2 ring-[#efeae2] dark:ring-[#0b141a]`}>
                                            {s.icon}
                                        </span>
                                    </div>
                                    <span className={`text-[11px] md:text-xs font-medium max-w-[72px] truncate ${s.active ? "text-MidnightNavyText dark:text-white font-semibold" : "text-SlateBlueText dark:text-darktext"}`}>
                                        {s.label}
                                    </span>
                                </Wrapper>
                            );
                        })}
                    </div>
                </div>

                {/* ── Chat panel ── */}
                <div className="bg-white dark:bg-darkmode rounded-2xl border border-PowderBlueBorder dark:border-dark_border shadow-[0_6px_24px_rgba(11,20,26,0.08)]">

                    {/* Top bar */}
                    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[#f0f2f5] dark:bg-darklight rounded-t-2xl border-b border-PowderBlueBorder/70 dark:border-dark_border">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-orange-deep flex items-center justify-center text-white shadow-md shadow-primary/25">
                                    <Users className="w-5 h-5" />
                                </div>
                                <span className="absolute bottom-0 end-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#f0f2f5] dark:ring-darklight" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-base md:text-lg font-bold tracking-tight text-MidnightNavyText dark:text-white truncate">
                                    {t("groups.title") || "Groups Management"}
                                </h1>
                                <p className="text-xs text-SlateBlueText dark:text-darktext truncate">
                                    {pagination.total} · {t("groups.subtitle") || "Manage your groups and sessions"}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                onClick={() => setTagsModalOpen(true)}
                                title={t("groups.tags.manage") || "Manage Tags"}
                                className="w-10 h-10 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            >
                                <Tag className="w-[18px] h-[18px]" />
                            </button>
                            <button
                                onClick={onMakeup}
                                title={t("groups.makeup.title") || "إنشاء حصة تعويضية"}
                                className="h-10 px-3 rounded-full flex items-center gap-2 text-primary bg-primary/10 hover:bg-primary/15 font-semibold text-xs transition-colors"
                            >
                                <Gift className="w-[18px] h-[18px]" />
                                <span className="hidden sm:inline">{t("groups.makeup.button") || "حصة تعويضية"}</span>
                            </button>
                            <button
                                onClick={() => { setEditingGroup(null); setModalOpen(true); }}
                                className="hidden md:flex h-10 px-4 rounded-full items-center gap-2 bg-primary hover:bg-primary/90 active:scale-95 text-white font-semibold text-sm shadow-md shadow-primary/25 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                {t("groups.create") || "Create Group"}
                            </button>
                        </div>
                    </div>

                    {/* Search + advanced toggle */}
                    <div className="px-3 md:px-4 pt-3 flex items-center gap-2">
                        <div className="relative flex-1 group">
                            <Search className={`absolute ${isRTL ? "right-3.5" : "left-3.5"} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors`} />
                            <input
                                type="text"
                                placeholder={t("groups.filters.search") || "Search by name or code..."}
                                value={searchInput}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className={`w-full ${isRTL ? "pr-10 pl-10" : "pl-10 pr-10"} py-2.5 text-sm rounded-xl bg-[#f0f2f5] dark:bg-dark_input border border-transparent focus:bg-white dark:focus:bg-dark_input focus:border-primary/40 focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white placeholder:text-gray-400`}
                            />
                            {searchInput && (
                                <button
                                    onClick={clearSearch}
                                    className={`absolute ${isRTL ? "left-2.5" : "right-2.5"} top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:bg-black/5 dark:hover:bg-white/10`}
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <button
                            onClick={() => setShowAdvancedFilters((v) => !v)}
                            title={t("groups.filters.advanced") || "Advanced"}
                            className={`relative shrink-0 h-10 w-10 rounded-xl flex items-center justify-center transition-all ${showAdvancedFilters
                                ? "bg-primary text-white shadow-md shadow-primary/25"
                                : "bg-[#f0f2f5] text-gray-600 hover:bg-gray-200 dark:bg-dark_input dark:text-gray-300 dark:hover:bg-white/10"
                                }`}
                        >
                            <SlidersHorizontal className="w-[18px] h-[18px]" />
                            {advancedFiltersCount > 0 && (
                                <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-darkmode tabular-nums">
                                    {advancedFiltersCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Filter chips */}
                    <div className="px-3 md:px-4 py-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <div className="flex items-center gap-2 min-w-max">
                            <button
                                onClick={() => setFilters((p) => ({ ...p, status: [], groupType: "", archived: "", page: 1 }))}
                                className={`${chipBase} ${noQuickFilter ? chipOn : chipOff}`}
                            >
                                {t("groups.filters.all") || "All"}
                            </button>

                            {["active", "draft", "completed", "cancelled"].map((status) => {
                                const on = filters.status.includes(status);
                                return (
                                    <button
                                        key={status}
                                        onClick={() => toggleStatus(status)}
                                        className={`${chipBase} ${on ? chipOn : chipOff}`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} />
                                        {statusLabels[status]}
                                        <span className="opacity-60 tabular-nums text-xs">{stats[status] || 0}</span>
                                    </button>
                                );
                            })}

                            <span className="w-px h-5 bg-gray-200 dark:bg-white/10 mx-1" />

                            {["kids", "adults"].map((type) => {
                                const on = filters.groupType === type;
                                return (
                                    <button
                                        key={type}
                                        onClick={() => handleFilterChange("groupType", on ? "" : type)}
                                        className={`${chipBase} ${on ? chipOn : chipOff}`}
                                    >
                                        <span>{type === "kids" ? "🧒" : "🧑"}</span>
                                        {groupTypeLabels[type]}
                                        <span className="opacity-60 tabular-nums text-xs">{stats[type] || 0}</span>
                                    </button>
                                );
                            })}

                            <span className="w-px h-5 bg-gray-200 dark:bg-white/10 mx-1" />

                            <button
                                onClick={() => handleFilterChange("archived", filters.archived === "only" ? "" : "only")}
                                className={`${chipBase} ${filters.archived === "only" ? chipOn : chipOff}`}
                            >
                                <Archive className="w-3.5 h-3.5" />
                                {t("groups.filters.archivedGroups") || "الأرشيف"}
                                {stats.archived > 0 && <span className="opacity-60 tabular-nums text-xs">{stats.archived}</span>}
                            </button>
                        </div>
                    </div>

                    {/* Advanced Filters Panel */}
                    {showAdvancedFilters && (
                        <div className="mx-3 md:mx-4 mb-3 space-y-5 p-4 rounded-2xl bg-[#f7f8fa] dark:bg-darklight/60 border border-PowderBlueBorder/70 dark:border-dark_border animate-in fade-in slide-in-from-top-1 duration-200">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="relative">
                                    <GraduationCap className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
                                    <select
                                        value={filters.courseId}
                                        onChange={(e) => handleFilterChange("courseId", e.target.value)}
                                        className={selectCls(isRTL)}
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

                                <div className="relative">
                                    <UserCheck className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
                                    <select
                                        value={filters.instructorId}
                                        onChange={(e) => handleFilterChange("instructorId", e.target.value)}
                                        className={selectCls(isRTL)}
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
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block">
                                        {t("groups.filters.capacity") || "Capacity"}
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { value: "", label: t("groups.filters.all") || "All" },
                                            { value: "full", label: t("groups.filters.full") || "Full" },
                                            { value: "available", label: t("groups.filters.available") || "Available" },
                                        ].map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => handleFilterChange("capacity", opt.value)}
                                                className={`${chipBase} !py-1.5 !text-xs ${filters.capacity === opt.value ? chipOn : chipOff}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block">
                                        {t("groups.filters.sessions") || "Sessions"}
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { value: "", label: t("groups.filters.all") || "All" },
                                            { value: "true", label: t("groups.filters.generated") || "Generated" },
                                            { value: "false", label: t("groups.filters.notGenerated") || "Not Generated" },
                                        ].map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => handleFilterChange("sessionsGenerated", opt.value)}
                                                className={`${chipBase} !py-1.5 !text-xs ${filters.sessionsGenerated === opt.value ? chipOn : chipOff}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

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
                                            className={`${chipBase} !py-1.5 !text-xs ${filters.daysOfWeek.includes(day) ? chipOn : chipOff}`}
                                        >
                                            {dayLabels[day]}
                                        </button>
                                    ))}
                                </div>
                            </div>

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
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ring-1 ring-inset active:scale-95 ${selected
                                                    ? "text-white ring-transparent shadow-sm"
                                                    : "bg-white text-gray-600 ring-gray-200 dark:bg-white/5 dark:text-gray-300 dark:ring-white/10"
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

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2 bg-white dark:bg-dark_input rounded-xl p-3 ring-1 ring-inset ring-gray-200 dark:ring-white/10">
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
                                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-full flex items-center gap-2 text-sm font-medium transition-all shadow-sm shadow-primary/20 active:scale-95"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                                        {t("groups.filters.refresh") || "Refresh"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* progress line (أثناء إعادة التحميل) */}
                    <div className="h-0.5 w-full overflow-hidden">
                        {loading && groups.length > 0 && <div className="h-full w-full bg-primary/70 animate-pulse" />}
                    </div>

                    {/* "notice pill" زي رسالة التشفير في الواتس */}
                    {groups.length > 0 && (
                        <div className="flex justify-center py-3">
                            <span className="px-3 py-1 rounded-lg bg-[#ffeecd] text-[#54656f] dark:bg-amber-500/10 dark:text-amber-200 text-[11px] font-medium shadow-sm tabular-nums">
                                {t("groups.pagination.showing")
                                    ?.replace("{from}", showingFrom)
                                    ?.replace("{to}", showingTo)
                                    ?.replace("{total}", pagination.total)
                                    || `Showing ${showingFrom}-${showingTo} of ${pagination.total}`}
                            </span>
                        </div>
                    )}

                    {/* ── Chat list ── */}
                    {groups.length > 0 && (
                        <ul className="divide-y divide-gray-100 dark:divide-dark_border">
                            {groups.map((group) => (
                                <GroupRow
                                    key={group.id}
                                    group={group}
                                    dayLabels={dayLabels}
                                    statusLabels={statusLabels}
                                    groupTypeLabels={groupTypeLabels}
                                    t={t}
                                    isRTL={isRTL}
                                    onViewDetails={onViewDetails}
                                    onActivate={onActivateWithNotification}
                                    onAddStudents={onAddStudents}
                                    onViewSessions={(id) => router.push(`/admin/sessions?groupId=${id}`)}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    onFixLinks={onFixLinks}
                                    onHold={onHold}
                                    onRelease={onRelease}
                                    onSendMessage={onSendMessage}
                                    onArchive={onArchive}
                                    onRestore={onRestore}
                                />
                            ))}
                        </ul>
                    )}

                    {/* Empty State */}
                    {groups.length === 0 && !loading && (
                        <div className="text-center py-16 px-4">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#f0f2f5] dark:bg-white/5 flex items-center justify-center">
                                <FolderOpen className="w-9 h-9 text-gray-300 dark:text-gray-500" />
                            </div>
                            <h3 className="text-base font-bold mb-1.5 text-MidnightNavyText dark:text-white">{t("groups.empty.title") || "No Groups Found"}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">{t("groups.empty.description") || "Try adjusting your filters or create a new group."}</p>
                            <button
                                onClick={() => setModalOpen(true)}
                                className="bg-primary hover:bg-primary/90 active:scale-95 text-white px-8 py-3 rounded-full font-semibold flex items-center gap-2 mx-auto shadow-md shadow-primary/25 transition-all"
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
            </div>

            {/* ── FAB (موبايل) زي زرار "محادثة جديدة" في الواتس ── */}
            <button
                onClick={() => { setEditingGroup(null); setModalOpen(true); }}
                title={t("groups.create") || "Create Group"}
                className="md:hidden fixed bottom-5 end-5 z-30 w-14 h-14 rounded-2xl bg-primary text-white shadow-xl shadow-primary/40 flex items-center justify-center active:scale-90 transition-transform"
            >
                <Plus className="w-6 h-6" />
            </button>

            <Modal open={modalOpen} onClose={closeGroupModal} size="2xl" noPadding>
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

            <Modal open={messageModal.open} title="إرسال رسالة للجروب" onClose={closeMessageModal} size="2xl">
                {messageModal.open && (
                    <GroupMessageModal groupId={messageModal.groupId} onClose={closeMessageModal} />
                )}
            </Modal>

            <MeetingLinksCheckModal
                isOpen={meetingLinksModal.open}
                groupId={meetingLinksModal.groupId}
                onClose={() => setMeetingLinksModal({ open: false, groupId: null })}
                onConfirm={onMeetingLinksCheckConfirmed}
            />

            <FixGroupLinksModal
                isOpen={fixLinksModal.open}
                groupId={fixLinksModal.groupId}
                onClose={closeFixLinksModal}
                onFixed={loadGroups}
            />

            <InstructorNotificationModal
                isOpen={instructorNotificationModal.open}
                onClose={closeInstructorModal}
                instructors={instructorNotificationModal.instructors}
                groupData={instructorNotificationModal.groupData}
                onSendNotifications={handleActivateAndNotify}
            />

            {/* ✅ Hold Modal */}
            {holdModal.open && (
                <Modal
                    open={holdModal.open}
                    title={t("groups.hold.modalTitle") || "تعليق الجروب (Hold)"}
                    onClose={closeHoldModal}
                    size="xl"
                >
                    <GroupHoldModal
                        groupId={holdModal.groupId}
                        groupName={
                            groups.find((g) => g.id === holdModal.groupId)?.name || ""
                        }
                        isAr={isRTL}
                        onClose={closeHoldModal}
                        onSaved={loadGroups}
                    />
                </Modal>
            )}

            {/* 🎁 Make-up Session Modal */}
            <Modal
                open={makeupModalOpen}
                onClose={closeMakeupModal}
                size="2xl"
                noPadding
            >
                <MakeupSessionForm
                    onClose={closeMakeupModal}
                    onSaved={onMakeupSaved}
                />
            </Modal>

            {/* ✅ مودال إدارة الوسوم */}
            <Modal
                open={tagsModalOpen}
                title={t("groups.tags.manage") || "Manage Tags"}
                onClose={() => { setTagsModalOpen(false); setEditingTag(null); }}
                size="md"
            >
                <div className="space-y-5 p-1">
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

            {/* ✨ Custom Confirm Dialog */}
            {confirmDialog}
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DateRangeFilter({ label, icon, fromValue, toValue, onFromChange, onToChange }) {
    return (
        <div className="bg-white dark:bg-dark_input rounded-xl p-3 ring-1 ring-inset ring-gray-200 dark:ring-white/10">
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

// ─── Chat-style row ───────────────────────────────────────────────────────────

function GroupRow({
    group, dayLabels, statusLabels, groupTypeLabels, t, isRTL,
    onViewDetails, onActivate, onAddStudents, onViewSessions,
    onEdit, onDelete, onFixLinks,
    onHold, onRelease,
    onSendMessage,
    onArchive, onRestore,
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [menuOpen]);

    const isOffline = group.deliveryMode === "offline";
    const isArchived = !!group.isArchived;
    const hasLinkIssue = !isOffline && !isArchived && !!group.linkHealth?.hasIssue;
    const isOnHold = !!group.isOnHold;
    const isMakeup = !!group.isMakeupGroup;
    const groupType = group.groupType;
    const linkIssueLabel = !isOffline && group.linkHealth?.orphanedCount > 0
        ? (t("groups.links.orphaned") || "لينك محذوف من الداتابيز")
        : (t("groups.links.missing") || "جلسات بدون لينك");

    const holdLabel = (() => {
        if (!isOnHold) return "";
        if (group.hold?.holdType === "indefinite") {
            return t("groups.hold.indefinite") || "Hold — مفتوح";
        }
        if (group.hold?.holdType === "sessions") {
            const consumed = group.hold.holdSessionsConsumed || 0;
            const total = group.hold.holdSessionsCount || 0;
            return `${t("groups.hold.sessions") || "Hold"}: ${consumed}/${total}`;
        }
        if (group.hold?.holdType === "until_session") {
            return t("groups.hold.untilSession") || "Hold لحد سيشن محددة";
        }
        return `${t("groups.hold.duration") || "Hold"}: ${group.hold?.holdDays || 0} ${t("groups.hold.days") || "أيام"}`;
    })();

    const ringGrad = isArchived
        ? "from-slate-300 to-slate-400"
        : isOnHold
            ? "from-amber-400 to-amber-600"
            : STATUS_RING[group.status] || STATUS_RING.draft;

    const bubbleCls = group.isFull
        ? "bg-rose-500 text-white"
        : "bg-primary text-white";

    const stop = (e) => e.stopPropagation();

    return (
        <li className={`group relative ${menuOpen ? "z-20" : ""} ${isArchived ? "opacity-75" : ""}`}>
            <div
                onClick={() => onViewDetails(group.id)}
                className="flex flex-wrap md:flex-nowrap items-start md:items-center gap-x-4 gap-y-1 px-4 py-3.5 cursor-pointer hover:bg-[#f5f6f6] dark:hover:bg-white/[0.04] active:bg-[#ebedee] dark:active:bg-white/[0.07] transition-colors"
            >
                {/* ── Avatar with status ring ── */}
                <div className="relative shrink-0">
                    <div className={`p-[2.5px] rounded-full bg-gradient-to-tr ${ringGrad}`}>
                        <div className="p-[2px] rounded-full bg-white dark:bg-darkmode">
                            <div className={`w-[52px] h-[52px] rounded-full bg-gradient-to-br ${avatarGradientFor(group.name)} flex items-center justify-center text-white font-extrabold text-lg shadow-inner`}>
                                {getInitials(group.name)}
                            </div>
                        </div>
                    </div>

                    {(groupType === "kids" || groupType === "adults") && (
                        <span
                            title={groupTypeLabels[groupType]}
                            className="absolute -bottom-0.5 -end-0.5 w-[22px] h-[22px] rounded-full bg-white dark:bg-darklight shadow flex items-center justify-center text-xs ring-1 ring-black/5"
                        >
                            {groupType === "kids" ? "🧒" : "🧑"}
                        </span>
                    )}

                    {isMakeup && (
                        <span
                            title={t("groups.makeup.badgeTitle") || "حصة تعويضية"}
                            className="absolute -top-0.5 -end-0.5 w-5 h-5 rounded-full bg-primary text-white shadow flex items-center justify-center ring-2 ring-white dark:ring-darkmode"
                        >
                            <Gift className="w-3 h-3" />
                        </span>
                    )}
                </div>

                {/* ── Main content ── */}
                <div className="flex-1 min-w-0 basis-[60%] md:basis-auto">
                    {/* line 1: name + inline badges */}
                    <div className="flex items-center gap-2 min-w-0">
                        <p className="font-semibold text-[15px] text-MidnightNavyText dark:text-white truncate">{group.name}</p>

                        <span className={`hidden sm:inline-flex shrink-0 items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[group.status] || STATUS_COLORS.draft}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[group.status] || STATUS_DOT.draft}`} />
                            {statusLabels[group.status] || group.status}
                        </span>

                        {isArchived && (
                            <span
                                className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300"
                                title={group.archive?.reason || ""}
                            >
                                <Archive className="w-3 h-3" />
                                {t("groups.archived") || "مؤرشف"}
                            </span>
                        )}
                    </div>

                    {/* line 2: ticks + course (زي آخر رسالة) */}
                    <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                        <CheckCheck
                            className={`w-4 h-4 shrink-0 ${group.sessionsGenerated ? "text-sky-500" : "text-gray-400"}`}
                            title={group.sessionsGenerated
                                ? `${t("groups.sessions.generated") || "Sessions generated"}: ${group.totalSessions}`
                                : (t("groups.sessions.notGenerated") || "Not generated")}
                        />
                        <p className="text-sm text-SlateBlueText dark:text-darktext truncate">
                            {group.course?.title || "N/A"}
                            {group.course?.level ? ` · ${group.course.level}` : ""}
                            {group.sessionsGenerated ? ` · ${group.totalSessions} ${t("groups.table.sessions") || "Sessions"}` : ""}
                        </p>
                    </div>

                    {/* line 3: chips */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                            <Hash className="w-3 h-3" />{group.code}
                        </span>

                        {group.schedule?.daysOfWeek && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                                <CalendarDays className="w-3 h-3" />
                                {group.schedule.daysOfWeek.map((d) => dayLabels[d] || d).join(", ")}
                            </span>
                        )}

                        {isOnHold && (
                            <span
                                title={group.hold?.holdReason || ""}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20"
                            >
                                <PauseCircle className="w-3 h-3" />
                                {holdLabel}
                            </span>
                        )}

                        {hasLinkIssue && (
                            <button
                                type="button"
                                onClick={(e) => { stop(e); onFixLinks(group.id); }}
                                title={linkIssueLabel}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20 transition-colors"
                            >
                                <Link2Off className="w-3 h-3" />
                                {linkIssueLabel}
                                {(group.linkHealth.missingCount + group.linkHealth.orphanedCount) > 0 && (
                                    <span className="tabular-nums">
                                        ({group.linkHealth.missingCount + group.linkHealth.orphanedCount})
                                    </span>
                                )}
                            </button>
                        )}

                        {group.tags && group.tags.length > 0 && group.tags.map((tag) => (
                            <span
                                key={tag._id}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                                style={{ backgroundColor: tag.color + "18", color: tag.color }}
                            >
                                <span className="w-1.5 h-1.5 rounded-full me-1" style={{ backgroundColor: tag.color }} />
                                {tag.name}
                            </span>
                        ))}
                    </div>
                </div>

                {/* ── End column: time + students bubble ── */}
                <div className="shrink-0 flex flex-col items-end gap-1.5 md:min-w-[84px]">
                    <span className={`text-xs font-semibold tabular-nums ${STATUS_TIME_COLOR[group.status] || STATUS_TIME_COLOR.draft}`}>
                        {group.schedule?.timeFrom || "—"}
                    </span>
                    <span
                        title={`${group.studentsCount}/${group.maxStudents}`}
                        className={`inline-flex items-center gap-1 min-w-[26px] h-[22px] px-2 rounded-full text-[11px] font-bold tabular-nums justify-center ${bubbleCls}`}
                    >
                        <Users className="w-3 h-3" />
                        {group.studentsCount}/{group.maxStudents}
                    </span>
                    {group.isFull && (
                        <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wide">
                            {t("groups.status.full") || "FULL"}
                        </span>
                    )}
                </div>

                {/* ── Actions (تظهر عند الـ hover على الديسكتوب) ── */}
                <div
                    onClick={stop}
                    className={`basis-full md:basis-auto order-last md:order-none ps-[68px] md:ps-0 pt-1 md:pt-0 flex items-center gap-0.5 transition-opacity ${menuOpen ? "md:opacity-100" : "md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"}`}
                >
                    <ActionButton onClick={() => onViewDetails(group.id)} hoverColor="blue" title={t("groups.actions.viewDetails") || "View Details"}>
                        <Info className="w-[18px] h-[18px] text-blue-600" />
                    </ActionButton>

                    {isArchived ? (
                        <ActionButton
                            onClick={() => onRestore(group.id)}
                            hoverColor="green"
                            title={t("groups.actions.restore") || "استرجاع من الأرشيف"}
                        >
                            <ArchiveRestore className="w-[18px] h-[18px] text-emerald-600" />
                        </ActionButton>
                    ) : (
                        <>
                            {group.status === "draft" && (
                                <ActionButton onClick={() => onActivate(group.id)} hoverColor="green" title={t("groups.actions.activate") || "Activate"}>
                                    <PlayCircle className="w-[18px] h-[18px] text-emerald-600" />
                                </ActionButton>
                            )}

                            {group.status === "active" && !isOnHold && (
                                <ActionButton
                                    onClick={() => onHold(group.id)}
                                    hoverColor="amber"
                                    title={t("groups.actions.hold") || "تعليق الجروب"}
                                >
                                    <PauseCircle className="w-[18px] h-[18px] text-amber-600" />
                                </ActionButton>
                            )}

                            {isOnHold && (
                                <ActionButton
                                    onClick={() => onRelease(group.id, group.name)}
                                    hoverColor="green"
                                    title={t("groups.actions.release") || "فكّ التعليق"}
                                >
                                    <PlayCircle className="w-[18px] h-[18px] text-emerald-600" />
                                </ActionButton>
                            )}

                            {(group.status === "active" || isOnHold) && (
                                <ActionButton onClick={() => onSendMessage(group.id)} hoverColor="blue" title="إرسال رسالة">
                                    <MessageSquare className="w-[18px] h-[18px] text-blue-600" />
                                </ActionButton>
                            )}

                            {group.status === "active" && !group.isFull && !isOnHold && (
                                <ActionButton onClick={() => onAddStudents(group.id)} hoverColor="blue" title={t("groups.actions.addStudents") || "Add Students"}>
                                    <UserPlus className="w-[18px] h-[18px] text-blue-600" />
                                </ActionButton>
                            )}
                        </>
                    )}

                    {/* ⋮ القايمة (زي سهم الشات في الواتس) */}
                    <div className="relative" ref={menuRef}>
                        <ActionButton
                            onClick={() => setMenuOpen((v) => !v)}
                            hoverColor="gray"
                            title={t("groups.actions.more") || "More"}
                        >
                            <MoreVertical className="w-[18px] h-[18px] text-gray-500 dark:text-gray-300" />
                        </ActionButton>

                        {menuOpen && (
                            <div
                                className={`absolute ${isRTL ? "left-0" : "right-0"} top-full mt-1 w-56 py-1.5 rounded-2xl bg-white dark:bg-darklight border border-gray-100 dark:border-dark_border shadow-[0_10px_40px_rgba(11,20,26,0.18)] animate-in fade-in zoom-in-95 duration-100 z-30`}
                            >
                                {group.sessionsGenerated && (
                                    <MenuItem
                                        icon={<Calendar className="w-4 h-4 text-purple-600" />}
                                        label={t("groups.actions.viewSessions") || "View Sessions"}
                                        onClick={() => { setMenuOpen(false); onViewSessions(group.id); }}
                                    />
                                )}

                                {!isArchived && hasLinkIssue && (
                                    <MenuItem
                                        icon={<Link2Off className="w-4 h-4 text-amber-600" />}
                                        label={t("groups.actions.fixLinks") || "إصلاح لينكات الاجتماعات"}
                                        onClick={() => { setMenuOpen(false); onFixLinks(group.id); }}
                                    />
                                )}

                                {!isArchived && (
                                    <>
                                        <MenuItem
                                            icon={<Edit className="w-4 h-4 text-primary" />}
                                            label={t("groups.actions.edit") || "Edit"}
                                            onClick={() => { setMenuOpen(false); onEdit(group); }}
                                        />
                                        <MenuItem
                                            icon={<Archive className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
                                            label={t("groups.actions.archive") || "أرشفة"}
                                            onClick={() => { setMenuOpen(false); onArchive(group.id, group.name); }}
                                        />
                                        <div className="my-1 h-px bg-gray-100 dark:bg-dark_border" />
                                        <MenuItem
                                            danger
                                            icon={<Trash2 className="w-4 h-4" />}
                                            label={t("groups.actions.delete") || "Delete"}
                                            onClick={() => { setMenuOpen(false); onDelete(group.id, group.name); }}
                                        />
                                    </>
                                )}

                                {isArchived && !group.sessionsGenerated && (
                                    <p className="px-4 py-2 text-xs text-gray-400">
                                        {t("groups.archived") || "مؤرشف"}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </li>
    );
}

function MenuItem({ icon, label, onClick, danger = false }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-start transition-colors ${danger
                ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                : "text-MidnightNavyText dark:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
        >
            <span className="shrink-0">{icon}</span>
            <span className="truncate">{label}</span>
        </button>
    );
}

function ActionButton({ onClick, hoverColor, title, children }) {
    const hoverClasses = {
        blue: "hover:bg-blue-50 dark:hover:bg-blue-900/30",
        green: "hover:bg-emerald-50 dark:hover:bg-emerald-900/30",
        purple: "hover:bg-purple-50 dark:hover:bg-purple-900/30",
        red: "hover:bg-red-50 dark:hover:bg-red-900/30",
        gray: "hover:bg-gray-100 dark:hover:bg-white/10",
        amber: "hover:bg-amber-50 dark:hover:bg-amber-900/30",
    };
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${hoverClasses[hoverColor]}`}
        >
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
        <div className="px-4 py-3.5 border-t border-gray-100 dark:border-dark_border bg-[#f0f2f5]/70 dark:bg-darklight/60 rounded-b-2xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-SlateBlueText dark:text-darktext order-2 sm:order-1 tabular-nums">
                    {t("groups.pagination.showing")
                        ?.replace("{from}", start)
                        ?.replace("{to}", end)
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
                                    className={`w-8 h-8 rounded-full text-xs font-semibold transition-all tabular-nums active:scale-90 ${p === page
                                        ? "bg-primary text-white shadow-sm shadow-primary/30"
                                        : "text-MidnightNavyText dark:text-white hover:bg-black/5 dark:hover:bg-white/10"
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
            className="w-8 h-8 flex items-center justify-center rounded-full text-MidnightNavyText dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
        >
            {children}
        </button>
    );
}