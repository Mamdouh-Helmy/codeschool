"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import {
    CalendarClock, RefreshCw, CheckCircle, XCircle, Clock,
    Calendar, Users, Hash, ChevronDown, ChevronRight, X,
    ArrowRightCircle, SkipForward, Loader2, Inbox, Layers,
    User, AlertCircle, MessageSquare, BadgeCheck, BadgeX, Info,
} from "lucide-react";
import Modal from "./Modal";
import { useI18n } from "@/i18n/I18nProvider";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateString, locale) => {
    if (!dateString) return "—";
    try {
        return new Date(dateString).toLocaleDateString(locale, {
            year: "numeric", month: "short", day: "numeric",
        });
    } catch {
        return "—";
    }
};

const formatDateTime = (dateString, locale) => {
    if (!dateString) return "—";
    try {
        return new Date(dateString).toLocaleString(locale, {
            year: "numeric", month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit",
        });
    } catch {
        return "—";
    }
};

const STATUS_COLORS = {
    scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200",
    completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200",
    postponed: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminRescheduleRequests() {
    const { t, language } = useI18n();
    const isRTL = language === "ar";
    const locale = isRTL ? "ar-EG" : "en-US";

    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const [detailsModal, setDetailsModal] = useState({ open: false, batch: null });
    const [rejectModal, setRejectModal] = useState({ open: false, batch: null });
    const [reviewNotes, setReviewNotes] = useState("");
    const [actionLoading, setActionLoading] = useState(null); // batchId currently being approved/rejected

    // ── Data Fetching ──────────────────────────────────────────────────────────
    const loadBatches = useCallback(async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true); else setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/admin/sessions/reschedule-requests", {
                cache: "no-store",
                headers: { "Cache-Control": "no-cache" },
            });
            const json = await res.json();
            if (json.success) {
                setBatches(json.data.batches || []);
            } else {
                setError(json.error || t("reschedule.load.failed") || "Failed to load requests");
            }
        } catch (err) {
            console.error("Error loading reschedule requests:", err);
            setError(t("reschedule.load.failed") || "Failed to load requests");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [t]);

    useEffect(() => {
        loadBatches();
    }, [loadBatches]);

    // ── Memos ──────────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const totalSessions = batches.reduce((sum, b) => sum + (b.sessions?.length || 0), 0);
        const singleCount = batches.filter((b) => b.viewMode === "single").length;
        const withNextCount = batches.filter((b) => b.viewMode === "withNext").length;
        return { totalBatches: batches.length, totalSessions, singleCount, withNextCount };
    }, [batches]);

    // ── Actions ────────────────────────────────────────────────────────────────
    const handleApprove = useCallback(async (batch) => {
        const confirmed = window.confirm(
            (t("reschedule.approve.confirm") || `Approve this reschedule request for group "{group}"? {count} session(s) will shift by one week.`)
                .replace("{group}", batch.groupName || "")
                .replace("{count}", batch.sessions?.length || 0)
        );
        if (!confirmed) return;

        setActionLoading(batch.batchId);
        const loadingToast = toast.loading(t("reschedule.approve.loading") || "Approving...", { position: "top-center" });
        try {
            const res = await fetch(`/api/admin/sessions/reschedule-requests/${batch.batchId}/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const json = await res.json();
            if (res.ok && json.success) {
                await loadBatches();
                toast.success(
                    json.message || t("reschedule.approve.success") || "Approved successfully",
                    { id: loadingToast, position: "top-center" }
                );
                setDetailsModal({ open: false, batch: null });
            } else {
                toast.error(json.error || t("reschedule.approve.failed") || "Approval failed", {
                    id: loadingToast, position: "top-center",
                });
            }
        } catch {
            toast.error(t("reschedule.approve.failed") || "Approval failed", {
                id: loadingToast, position: "top-center",
            });
        } finally {
            setActionLoading(null);
        }
    }, [loadBatches, t]);

    const openRejectModal = useCallback((batch) => {
        setReviewNotes("");
        setRejectModal({ open: true, batch });
    }, []);

    const handleReject = useCallback(async () => {
        const batch = rejectModal.batch;
        if (!batch) return;

        setActionLoading(batch.batchId);
        const loadingToast = toast.loading(t("reschedule.reject.loading") || "Rejecting...", { position: "top-center" });
        try {
            const res = await fetch(`/api/admin/sessions/reschedule-requests/${batch.batchId}/reject`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reviewNotes }),
            });
            const json = await res.json();
            if (res.ok && json.success) {
                await loadBatches();
                toast.success(
                    json.message || t("reschedule.reject.success") || "Rejected successfully",
                    { id: loadingToast, position: "top-center" }
                );
                setRejectModal({ open: false, batch: null });
                setDetailsModal({ open: false, batch: null });
            } else {
                toast.error(json.error || t("reschedule.reject.failed") || "Rejection failed", {
                    id: loadingToast, position: "top-center",
                });
            }
        } catch {
            toast.error(t("reschedule.reject.failed") || "Rejection failed", {
                id: loadingToast, position: "top-center",
            });
        } finally {
            setActionLoading(null);
        }
    }, [rejectModal.batch, reviewNotes, loadBatches, t]);

    // ── Loading State ──────────────────────────────────────────────────────────
    if (loading && batches.length === 0) {
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
                            <CalendarClock className="w-5 h-5 md:w-7 md:h-7 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-MidnightNavyText dark:text-white">
                                {t("reschedule.title") || "Session Access Requests"}
                            </h1>
                            <p className="text-xs md:text-sm text-SlateBlueText dark:text-darktext">
                                {t("reschedule.subtitle") || "Review instructor requests to open out-of-schedule sessions"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => loadBatches(true)}
                        className="bg-primary hover:bg-primary/90 text-white px-4 py-2.5 md:px-6 md:py-3 rounded-lg font-semibold text-xs md:text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2 w-full md:w-auto justify-center"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                        {t("reschedule.refresh") || "Refresh"}
                    </button>
                </div>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {[
                    { label: t("reschedule.stats.pending") || "Pending Requests", value: stats.totalBatches, color: "text-MidnightNavyText dark:text-white", icon: <Inbox className="w-8 h-8 md:w-10 md:h-10 text-primary" /> },
                    { label: t("reschedule.stats.sessions") || "Affected Sessions", value: stats.totalSessions, color: "text-blue-600", icon: <Layers className="w-8 h-8 md:w-10 md:h-10 text-blue-600" /> },
                    { label: t("reschedule.stats.single") || "Single Mode", value: stats.singleCount, color: "text-orange-600", icon: <ArrowRightCircle className="w-8 h-8 md:w-10 md:h-10 text-orange-600" /> },
                    { label: t("reschedule.stats.withNext") || "With-Next Mode", value: stats.withNextCount, color: "text-teal-600", icon: <SkipForward className="w-8 h-8 md:w-10 md:h-10 text-teal-600" /> },
                ].map((stat) => (
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

            {/* ── Error State ── */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium flex-1">{error}</p>
                    <button onClick={() => loadBatches()} className="text-xs font-bold text-red-600 hover:underline flex-shrink-0">
                        {t("reschedule.retry") || "Retry"}
                    </button>
                </div>
            )}

            {/* ── Empty State ── */}
            {!loading && !error && batches.length === 0 && (
                <div className="bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border shadow-sm text-center py-16 px-4">
                    <Inbox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold mb-2 text-MidnightNavyText dark:text-white">
                        {t("reschedule.empty.title") || "No Pending Requests"}
                    </h3>
                    <p className="text-sm text-SlateBlueText dark:text-darktext">
                        {t("reschedule.empty.description") || "All instructor session access requests have been reviewed."}
                    </p>
                </div>
            )}

            {/* ── Batches List ── */}
            {batches.length > 0 && (
                <div className="space-y-4">
                    {batches.map((batch) => (
                        <BatchCard
                            key={batch.batchId}
                            batch={batch}
                            locale={locale}
                            t={t}
                            isRTL={isRTL}
                            actionLoading={actionLoading}
                            onViewDetails={() => setDetailsModal({ open: true, batch })}
                            onApprove={() => handleApprove(batch)}
                            onReject={() => openRejectModal(batch)}
                        />
                    ))}
                </div>
            )}

            {/* ── Details Modal ── */}
            <Modal
                open={detailsModal.open}
                title={t("reschedule.details.title") || "Reschedule Request Details"}
                onClose={() => setDetailsModal({ open: false, batch: null })}
                size="lg"
            >
                {detailsModal.batch && (
                    <BatchDetails
                        batch={detailsModal.batch}
                        locale={locale}
                        t={t}
                        actionLoading={actionLoading}
                        onApprove={() => handleApprove(detailsModal.batch)}
                        onReject={() => openRejectModal(detailsModal.batch)}
                    />
                )}
            </Modal>

            {/* ── Reject Modal (with optional notes) ── */}
            <Modal
                open={rejectModal.open}
                title={t("reschedule.reject.title") || "Reject Request"}
                onClose={() => setRejectModal({ open: false, batch: null })}
                size="md"
            >
                <div className="space-y-4">
                    <p className="text-sm text-SlateBlueText dark:text-darktext">
                        {t("reschedule.reject.warning") ||
                            "This request will be rejected and nothing will change — no sessions will be shifted, and no access will be granted."}
                    </p>
                    <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                            {t("reschedule.reject.notesLabel") || "Reason (optional)"}
                        </label>
                        <textarea
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            rows={3}
                            placeholder={t("reschedule.reject.notesPlaceholder") || "Add a note for the instructor..."}
                            className="w-full px-3 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary dark:bg-dark_input dark:text-white resize-none"
                        />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            onClick={() => setRejectModal({ open: false, batch: null })}
                            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            {t("reschedule.cancel") || "Cancel"}
                        </button>
                        <button
                            onClick={handleReject}
                            disabled={actionLoading === rejectModal.batch?.batchId}
                            className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
                        >
                            {actionLoading === rejectModal.batch?.batchId
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <XCircle className="w-4 h-4" />}
                            {t("reschedule.reject.confirm") || "Reject Request"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ViewModeBadge({ viewMode, t }) {
    const isSingle = viewMode === "single";
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                isSingle
                    ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800/30"
                    : "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800/30"
            }`}
        >
            {isSingle ? <ArrowRightCircle className="w-3 h-3" /> : <SkipForward className="w-3 h-3" />}
            {isSingle
                ? (t("reschedule.mode.single") || "This Session Only")
                : (t("reschedule.mode.withNext") || "This + Following Sessions")}
        </span>
    );
}

function BatchCard({ batch, locale, t, isRTL, actionLoading, onViewDetails, onApprove, onReject }) {
    const [expanded, setExpanded] = useState(false);
    const isLoading = actionLoading === batch.batchId;
    const triggerSession = batch.sessions?.find((s) => s.isTrigger) || batch.sessions?.[0];

    return (
        <div className="bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border shadow-sm overflow-hidden">
            {/* Card Header */}
            <div className="p-4 md:p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="font-bold text-sm text-MidnightNavyText dark:text-white">
                                    {batch.groupName || t("reschedule.unknownGroup") || "Unknown Group"}
                                </h3>
                                {batch.groupCode && (
                                    <span className="text-xs text-SlateBlueText dark:text-darktext flex items-center gap-1">
                                        <Hash className="w-3 h-3" />{batch.groupCode}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <ViewModeBadge viewMode={batch.viewMode} t={t} />
                                <span className="text-xs text-SlateBlueText dark:text-darktext flex items-center gap-1">
                                    <Layers className="w-3 h-3" />
                                    {batch.sessions?.length || 0} {t("reschedule.sessionsAffected") || "sessions affected"}
                                </span>
                            </div>
                            {triggerSession && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 truncate">
                                    <span className="font-medium">{t("reschedule.triggerSession") || "Trigger session"}:</span>{" "}
                                    {triggerSession.title}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        {batch.requestedBy?.name && (
                            <div className="hidden md:flex items-center gap-1.5 text-xs text-SlateBlueText dark:text-darktext bg-gray-50 dark:bg-dark_input px-2.5 py-1.5 rounded-lg">
                                <User className="w-3 h-3" />
                                {batch.requestedBy.name}
                            </div>
                        )}
                        <div className="hidden md:flex items-center gap-1.5 text-xs text-SlateBlueText dark:text-darktext">
                            <Clock className="w-3 h-3" />
                            {formatDateTime(batch.requestedAt, locale)}
                        </div>
                    </div>
                </div>

                {/* Mobile-only requester info */}
                <div className="md:hidden flex items-center gap-3 mt-3 text-xs text-SlateBlueText dark:text-darktext">
                    {batch.requestedBy?.name && (
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{batch.requestedBy.name}</span>
                    )}
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDateTime(batch.requestedAt, locale)}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4">
                    <button
                        onClick={() => setExpanded((v) => !v)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-SlateBlueText dark:text-darktext hover:bg-gray-100 dark:hover:bg-dark_input transition-colors"
                    >
                        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                        {expanded
                            ? (t("reschedule.hideSessions") || "Hide sessions")
                            : (t("reschedule.showSessions") || "Show sessions")}
                    </button>
                    <button
                        onClick={onViewDetails}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                        <Info className="w-4 h-4" />
                        {t("reschedule.viewDetails") || "View details"}
                    </button>

                    <div className={`flex items-center gap-2 ${isRTL ? "mr-auto" : "ml-auto"}`}>
                        <button
                            onClick={onReject}
                            disabled={isLoading}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-red-600 border border-red-200 dark:border-red-800/30 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors disabled:opacity-60"
                        >
                            <XCircle className="w-4 h-4" />
                            {t("reschedule.reject.button") || "Reject"}
                        </button>
                        <button
                            onClick={onApprove}
                            disabled={isLoading}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm disabled:opacity-60"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            {t("reschedule.approve.button") || "Approve"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Expanded sessions list */}
            {expanded && (
                <div className="border-t border-PowderBlueBorder dark:border-dark_border bg-gray-50/60 dark:bg-dark_input/40">
                    <SessionsTable batch={batch} locale={locale} t={t} />
                </div>
            )}
        </div>
    );
}

function SessionsTable({ batch, locale, t }) {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-PowderBlueBorder dark:divide-dark_border">
                <thead>
                    <tr>
                        {[
                            t("reschedule.table.session") || "Session",
                            t("reschedule.table.status") || "Status",
                            t("reschedule.table.oldDate") || "Current Date",
                            t("reschedule.table.newDate") || "New Date",
                            t("reschedule.table.trigger") || "",
                        ].map((h) => (
                            <th key={h} className="py-2.5 px-4 text-xs font-semibold text-MidnightNavyText dark:text-white text-start">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-PowderBlueBorder dark:divide-dark_border">
                    {batch.sessions?.map((s) => (
                        <tr key={s.sessionId}>
                            <td className="py-2.5 px-4">
                                <p className="text-sm font-medium text-MidnightNavyText dark:text-white truncate max-w-xs">{s.title}</p>
                                <p className="text-[11px] text-SlateBlueText dark:text-darktext">
                                    {t("reschedule.table.module") || "Module"} {(s.moduleIndex ?? 0) + 1} · {t("reschedule.table.session") || "Session"} {s.sessionNumber}
                                </p>
                            </td>
                            <td className="py-2.5 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_COLORS[s.status] || STATUS_COLORS.scheduled}`}>
                                    {s.status}
                                </span>
                            </td>
                            <td className="py-2.5 px-4 text-xs text-SlateBlueText dark:text-darktext">
                                {formatDate(s.oldScheduledDate, locale)}
                            </td>
                            <td className="py-2.5 px-4 text-xs font-semibold text-primary">
                                {formatDate(s.newScheduledDate, locale)}
                            </td>
                            <td className="py-2.5 px-4">
                                {s.isTrigger && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ff6700]">
                                        <BadgeCheck className="w-3.5 h-3.5" />
                                        {t("reschedule.table.opensNow") || "Opens immediately"}
                                    </span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function BatchDetails({ batch, locale, t, actionLoading, onApprove, onReject }) {
    const isLoading = actionLoading === batch.batchId;

    return (
        <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-dark_input rounded-lg p-3">
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">{t("reschedule.details.group") || "Group"}</p>
                    <p className="text-sm font-bold text-MidnightNavyText dark:text-white">{batch.groupName || "—"}</p>
                </div>
                <div className="bg-gray-50 dark:bg-dark_input rounded-lg p-3">
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">{t("reschedule.details.requestedBy") || "Requested By"}</p>
                    <p className="text-sm font-bold text-MidnightNavyText dark:text-white">{batch.requestedBy?.name || "—"}</p>
                </div>
                <div className="bg-gray-50 dark:bg-dark_input rounded-lg p-3">
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">{t("reschedule.details.mode") || "Mode"}</p>
                    <ViewModeBadge viewMode={batch.viewMode} t={t} />
                </div>
                <div className="bg-gray-50 dark:bg-dark_input rounded-lg p-3">
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">{t("reschedule.details.shift") || "Shift"}</p>
                    <p className="text-sm font-bold text-MidnightNavyText dark:text-white">
                        +{batch.shiftDays || 7} {t("reschedule.details.days") || "days"}
                    </p>
                </div>
            </div>

            {/* Explanation box based on mode */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-xl p-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    {batch.viewMode === "single"
                        ? (t("reschedule.details.explainSingle") ||
                            "The trigger session will open immediately (link + attendance). All following sessions shift by one week and stay locked until their new date arrives.")
                        : (t("reschedule.details.explainWithNext") ||
                            "The trigger session will open immediately. Following sessions shift by one week and show content previews only — no link or attendance until their new date actually arrives.")}
                </p>
            </div>

            {/* Sessions table */}
            <div className="border border-PowderBlueBorder dark:border-dark_border rounded-xl overflow-hidden">
                <SessionsTable batch={batch} locale={locale} t={t} />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
                <button
                    onClick={onReject}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold text-red-600 border border-red-200 dark:border-red-800/30 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors disabled:opacity-60"
                >
                    <XCircle className="w-4 h-4" />
                    {t("reschedule.reject.button") || "Reject"}
                </button>
                <button
                    onClick={onApprove}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm disabled:opacity-60"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {t("reschedule.approve.button") || "Approve"}
                </button>
            </div>
        </div>
    );
}

// All icons (including Info) are imported from lucide-react at the top of this file.