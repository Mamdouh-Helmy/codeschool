"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import {
    CalendarClock, RefreshCw, CheckCircle, XCircle, Clock,
    Users, Hash, ChevronDown, MoreVertical,
    ArrowRightCircle, SkipForward, Loader2, Inbox, Layers,
    User, AlertCircle, BadgeCheck, Info, AlertTriangle, ArrowRight,
    Lock, Unlock,
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

// Brand-aligned status tokens — replaces generic Tailwind semantic colors
const STATUS_STYLES = {
    scheduled: "bg-[#004d59]/8 text-[#004d59] dark:bg-[#004d59]/15 dark:text-[#5fb8c4] border-[#004d59]/15 dark:border-[#004d59]/30",
    completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/30",
    cancelled: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border-red-200 dark:border-red-800/30",
    postponed: "bg-[#feaf00]/12 text-[#946600] dark:bg-[#feaf00]/15 dark:text-[#feaf00] border-[#feaf00]/25 dark:border-[#feaf00]/30",
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
    const [approveModal, setApproveModal] = useState({ open: false, batch: null });
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
    const openApproveModal = useCallback((batch) => {
        setApproveModal({ open: true, batch });
    }, []);

    const handleApprove = useCallback(async () => {
        const batch = approveModal.batch;
        if (!batch) return;

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
                setApproveModal({ open: false, batch: null });
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
    }, [approveModal.batch, loadBatches, t]);

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

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className={`space-y-4 md:space-y-6 p-2 md:p-0 ${isRTL ? "rtl" : "ltr"}`} dir={isRTL ? "rtl" : "ltr"}>

            {/* ── Header ── */}
            <div className="relative bg-white dark:bg-darkmode rounded-2xl shadow-sm p-4 md:p-6 border border-PowderBlueBorder dark:border-dark_border overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-[#feaf00] to-[#004d59]" />
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="p-2.5 bg-primary/10 rounded-xl">
                            <CalendarClock className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-MidnightNavyText dark:text-white tracking-tight">
                                {t("reschedule.title") || "Session Access Requests"}
                            </h1>
                            <p className="text-xs md:text-sm text-SlateBlueText dark:text-darktext mt-0.5">
                                {t("reschedule.subtitle") || "Review instructor requests to open out-of-schedule sessions"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => loadBatches(true)}
                        disabled={refreshing}
                        className="bg-primary hover:bg-primary/90 active:scale-[0.98] text-white px-4 py-2.5 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all shadow-sm hover:shadow-md flex items-center gap-2 w-full md:w-auto justify-center disabled:opacity-70"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                        {t("reschedule.refresh") || "Refresh"}
                    </button>
                </div>
            </div>

            {/* ── Stats ── */}
            {loading && batches.length === 0 ? (
                <StatsSkeleton />
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    {[
                        {
                            label: t("reschedule.stats.pending") || "Pending Requests",
                            value: stats.totalBatches,
                            accent: "#ff6700",
                            icon: <Inbox className="w-5 h-5" />,
                        },
                        {
                            label: t("reschedule.stats.sessions") || "Affected Sessions",
                            value: stats.totalSessions,
                            accent: "#004d59",
                            icon: <Layers className="w-5 h-5" />,
                        },
                        {
                            label: t("reschedule.stats.single") || "Single Mode",
                            value: stats.singleCount,
                            accent: "#ff6437",
                            icon: <ArrowRightCircle className="w-5 h-5" />,
                        },
                        {
                            label: t("reschedule.stats.withNext") || "With-Next Mode",
                            value: stats.withNextCount,
                            accent: "#feaf00",
                            icon: <SkipForward className="w-5 h-5" />,
                        },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="bg-white dark:bg-darkmode rounded-xl p-3.5 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm transition-shadow hover:shadow-md"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] md:text-[11px] text-SlateBlueText dark:text-darktext uppercase tracking-wide font-medium">
                                        {stat.label}
                                    </p>
                                    <p className="text-xl md:text-2xl font-bold text-MidnightNavyText dark:text-white mt-0.5">
                                        {stat.value}
                                    </p>
                                </div>
                                <div
                                    className="w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: `${stat.accent}14`, color: stat.accent }}
                                >
                                    {stat.icon}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Error State ── */}
            {error && (
                <div className="bg-white dark:bg-darkmode border border-red-200 dark:border-red-800/30 rounded-xl p-4 flex items-center gap-3 shadow-sm">
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg flex-shrink-0">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <p className="text-sm text-MidnightNavyText dark:text-white font-medium flex-1">{error}</p>
                    <button
                        onClick={() => loadBatches()}
                        className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/10 dark:text-red-300 border border-red-200 dark:border-red-800/30 px-3 py-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                    >
                        {t("reschedule.retry") || "Retry"}
                    </button>
                </div>
            )}

            {/* ── Loading skeleton for list ── */}
            {loading && batches.length === 0 && <BatchListSkeleton />}

            {/* ── Empty State ── */}
            {!loading && !error && batches.length === 0 && (
                <div className="bg-white dark:bg-darkmode rounded-2xl border border-PowderBlueBorder dark:border-dark_border shadow-sm text-center py-16 px-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-4">
                        <Inbox className="w-7 h-7 text-primary/50" />
                    </div>
                    <h3 className="text-base font-bold mb-1.5 text-MidnightNavyText dark:text-white">
                        {t("reschedule.empty.title") || "Nothing waiting for review"}
                    </h3>
                    <p className="text-sm text-SlateBlueText dark:text-darktext max-w-sm mx-auto">
                        {t("reschedule.empty.description") || "Every instructor reschedule request has been reviewed. New requests will show up here."}
                    </p>
                </div>
            )}

            {/* ── Batches List ── */}
            {!loading && batches.length > 0 && (
                <div className="space-y-3">
                    {batches.map((batch) => (
                        <BatchCard
                            key={batch.batchId}
                            batch={batch}
                            locale={locale}
                            t={t}
                            isRTL={isRTL}
                            actionLoading={actionLoading}
                            onViewDetails={() => setDetailsModal({ open: true, batch })}
                            onApprove={() => openApproveModal(batch)}
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
                size="xl"
            >
                {detailsModal.batch && (
                    <BatchDetails
                        batch={detailsModal.batch}
                        locale={locale}
                        t={t}
                        actionLoading={actionLoading}
                        onApprove={() => openApproveModal(detailsModal.batch)}
                        onReject={() => openRejectModal(detailsModal.batch)}
                    />
                )}
            </Modal>

            {/* ── Approve Modal ── */}
            <Modal
                open={approveModal.open}
                title={t("reschedule.approve.title") || "Approve Reschedule"}
                onClose={() => setApproveModal({ open: false, batch: null })}
                size="md"
            >
                {approveModal.batch && (
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-3.5">
                            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex-shrink-0">
                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                            </div>
                            <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
                                {(t("reschedule.approve.summary") ||
                                    'You\'re about to approve this request for "{group}". {count} session(s) will shift by one week.')
                                    .replace("{group}", approveModal.batch.groupName || "")
                                    .replace("{count}", approveModal.batch.sessions?.length || 0)}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 dark:bg-dark_input rounded-lg p-3">
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">{t("reschedule.details.mode") || "Mode"}</p>
                                <ViewModeBadge viewMode={approveModal.batch.viewMode} t={t} />
                            </div>
                            <div className="bg-gray-50 dark:bg-dark_input rounded-lg p-3">
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">{t("reschedule.details.shift") || "Shift"}</p>
                                <p className="text-sm font-bold text-MidnightNavyText dark:text-white">
                                    +{approveModal.batch.shiftDays || 7} {t("reschedule.details.days") || "days"}
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-SlateBlueText dark:text-darktext">
                            {t("reschedule.approve.note") || "This takes effect immediately and can't be undone automatically."}
                        </p>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                onClick={() => setApproveModal({ open: false, batch: null })}
                                className="px-4 py-2 text-sm font-medium text-SlateBlueText dark:text-darktext hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                {t("reschedule.cancel") || "Cancel"}
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={actionLoading === approveModal.batch?.batchId}
                                className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
                            >
                                {actionLoading === approveModal.batch?.batchId
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <CheckCircle className="w-4 h-4" />}
                                {t("reschedule.approve.confirmButton") || "Approve Request"}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ── Reject Modal ── */}
            <Modal
                open={rejectModal.open}
                title={t("reschedule.reject.title") || "Reject Request"}
                onClose={() => setRejectModal({ open: false, batch: null })}
                size="md"
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-3 bg-[#feaf00]/10 border border-[#feaf00]/25 rounded-xl p-3.5">
                        <AlertTriangle className="w-4 h-4 text-[#946600] dark:text-[#feaf00] flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-[#7a5500] dark:text-[#feaf00] leading-relaxed">
                            {t("reschedule.reject.warning") ||
                                "Rejecting leaves everything as-is — no sessions shift, and no access opens early."}
                        </p>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                            {t("reschedule.reject.notesLabel") || "Reason (optional)"}
                        </label>
                        <textarea
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            rows={3}
                            placeholder={t("reschedule.reject.notesPlaceholder") || "Add a note for the instructor..."}
                            className="w-full px-3 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-dark_input dark:text-white resize-none transition-shadow"
                        />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            onClick={() => setRejectModal({ open: false, batch: null })}
                            className="px-4 py-2 text-sm font-medium text-SlateBlueText dark:text-darktext hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
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

// ─── Skeleton Loaders ─────────────────────────────────────────────────────────

function StatsSkeleton() {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-darkmode rounded-xl p-3.5 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="space-y-2">
                            <div className="h-2.5 w-20 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                            <div className="h-6 w-10 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                        </div>
                        <div className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function BatchListSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border shadow-sm p-4 md:p-5">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
                        <div className="flex-1 space-y-2.5">
                            <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                            <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                            <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                        <div className="h-8 w-24 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
                        <div className="h-8 w-24 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
                        <div className="h-8 w-20 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse ms-auto" />
                    </div>
                </div>
            ))}
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
                    ? "bg-[#ff6437]/10 text-[#c44a23] border-[#ff6437]/25 dark:bg-[#ff6437]/15 dark:text-[#ff8a63] dark:border-[#ff6437]/30"
                    : "bg-[#004d59]/8 text-[#004d59] border-[#004d59]/20 dark:bg-[#004d59]/15 dark:text-[#5fb8c4] dark:border-[#004d59]/30"
            }`}
        >
            {isSingle ? <ArrowRightCircle className="w-3 h-3" /> : <SkipForward className="w-3 h-3" />}
            {isSingle
                ? (t("reschedule.mode.single") || "This Session Only")
                : (t("reschedule.mode.withNext") || "This + Following Sessions")}
        </span>
    );
}

// Signature element — visualizes the 7-day shift as a compact timeline
// instead of two disconnected date strings. This is the thing the whole
// feature is about, so it gets a dedicated visual rather than plain text.
function ShiftTimeline({ oldDate, newDate, shiftDays, locale, t, compact = false }) {
    return (
        <div className={`flex items-center gap-2 ${compact ? "" : "py-1"}`}>
            <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                <span className={`text-SlateBlueText dark:text-darktext ${compact ? "text-[11px]" : "text-xs"}`}>
                    {formatDate(oldDate, locale)}
                </span>
            </div>
            <div className="flex-1 min-w-[20px] max-w-[40px] flex items-center">
                <div className="h-px flex-1 bg-gradient-to-r from-gray-300 dark:from-gray-600 to-primary/60" />
                <ArrowRight className="w-3 h-3 text-primary/70 flex-shrink-0 -mx-0.5 rtl:rotate-180" />
            </div>
            <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                <span className={`font-bold text-primary ${compact ? "text-[11px]" : "text-xs"}`}>
                    {formatDate(newDate, locale)}
                </span>
            </div>
            {!compact && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                    +{shiftDays || 7}{t("reschedule.details.daysShort") || "d"}
                </span>
            )}
        </div>
    );
}

function BatchCard({ batch, locale, t, isRTL, actionLoading, onViewDetails, onApprove, onReject }) {
    const [expanded, setExpanded] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const isLoading = actionLoading === batch.batchId;
    const triggerSession = batch.sessions?.find((s) => s.isTrigger) || batch.sessions?.[0];

    // close kebab menu on outside click
    useEffect(() => {
        if (!menuOpen) return;
        const close = () => setMenuOpen(false);
        document.addEventListener("click", close);
        return () => document.removeEventListener("click", close);
    }, [menuOpen]);

    return (
        <div className="bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border shadow-sm overflow-hidden transition-shadow hover:shadow-md">
            {/* Card Header */}
            <div className="p-4 md:p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                <h3 className="font-bold text-sm text-MidnightNavyText dark:text-white">
                                    {batch.groupName || t("reschedule.unknownGroup") || "Unknown Group"}
                                </h3>
                                {batch.groupCode && (
                                    <span className="text-xs text-SlateBlueText dark:text-darktext flex items-center gap-1">
                                        <Hash className="w-3 h-3" />{batch.groupCode}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                <ViewModeBadge viewMode={batch.viewMode} t={t} />
                                <span className="text-xs text-SlateBlueText dark:text-darktext flex items-center gap-1">
                                    <Layers className="w-3 h-3" />
                                    {batch.sessions?.length || 0} {t("reschedule.sessionsAffected") || "sessions affected"}
                                </span>
                            </div>
                            {triggerSession && (
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">
                                        <span className="font-medium">{t("reschedule.triggerSession") || "Trigger session"}:</span>{" "}
                                        {triggerSession.title}
                                    </p>
                                    <ShiftTimeline
                                        oldDate={triggerSession.oldScheduledDate}
                                        newDate={triggerSession.newScheduledDate}
                                        shiftDays={batch.shiftDays}
                                        locale={locale}
                                        t={t}
                                        compact
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Requester info — desktop only */}
                    <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                        {batch.requestedBy?.name && (
                            <div className="flex items-center gap-1.5 text-xs text-SlateBlueText dark:text-darktext bg-gray-50 dark:bg-dark_input px-2.5 py-1.5 rounded-lg">
                                <User className="w-3 h-3" />
                                {batch.requestedBy.name}
                            </div>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-SlateBlueText dark:text-darktext">
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
                    {/* Desktop: full secondary actions */}
                    <button
                        onClick={() => setExpanded((v) => !v)}
                        className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-SlateBlueText dark:text-darktext hover:bg-gray-100 dark:hover:bg-dark_input transition-colors"
                    >
                        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                        {expanded
                            ? (t("reschedule.hideSessions") || "Hide sessions")
                            : (t("reschedule.showSessions") || "Show sessions")}
                    </button>
                    <button
                        onClick={onViewDetails}
                        className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-[#004d59] dark:text-[#5fb8c4] border border-[#004d59]/20 dark:border-[#5fb8c4]/25 bg-[#004d59]/[0.03] hover:bg-[#004d59]/10 dark:hover:bg-[#5fb8c4]/10 active:scale-[0.98] transition-all"
                    >
                        <Info className="w-4 h-4" />
                        {t("reschedule.viewDetails") || "View details"}
                    </button>

                    {/* Mobile: kebab menu collapsing secondary actions */}
                    <div className="relative md:hidden">
                        <button
                            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                            className="flex items-center justify-center w-9 h-9 rounded-lg text-SlateBlueText dark:text-darktext hover:bg-gray-100 dark:hover:bg-dark_input transition-colors"
                            aria-label={t("reschedule.moreActions") || "More actions"}
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>
                        {menuOpen && (
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className={`absolute z-10 top-full mt-1 ${isRTL ? "end-0" : "start-0"} w-48 bg-white dark:bg-darkmode border border-PowderBlueBorder dark:border-dark_border rounded-lg shadow-lg overflow-hidden`}
                            >
                                <button
                                    onClick={() => { setExpanded((v) => !v); setMenuOpen(false); }}
                                    className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-medium text-SlateBlueText dark:text-darktext hover:bg-gray-50 dark:hover:bg-dark_input transition-colors text-start"
                                >
                                    <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                                    {expanded
                                        ? (t("reschedule.hideSessions") || "Hide sessions")
                                        : (t("reschedule.showSessions") || "Show sessions")}
                                </button>
                                <div className="h-px bg-PowderBlueBorder dark:bg-dark_border" />
                                <button
                                    onClick={() => { onViewDetails(); setMenuOpen(false); }}
                                    className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-bold text-[#004d59] dark:text-[#5fb8c4] hover:bg-[#004d59]/5 dark:hover:bg-[#004d59]/15 transition-colors text-start"
                                >
                                    <Info className="w-4 h-4" />
                                    {t("reschedule.viewDetails") || "View details"}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className={`flex items-center gap-2 ${isRTL ? "mr-auto" : "ml-auto"}`}>
                        <button
                            onClick={onReject}
                            disabled={isLoading}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-red-600 border border-red-200 dark:border-red-800/30 hover:bg-red-50 dark:hover:bg-red-900/10 active:scale-[0.98] transition-all disabled:opacity-60"
                        >
                            <XCircle className="w-4 h-4" />
                            {t("reschedule.reject.button") || "Reject"}
                        </button>
                        <button
                            onClick={onApprove}
                            disabled={isLoading}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60"
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
                            t("reschedule.table.shift") || "Schedule shift",
                            t("reschedule.table.trigger") || "",
                        ].map((h, idx) => (
                            <th key={idx} className="py-2.5 px-4 text-xs font-semibold text-MidnightNavyText dark:text-white text-start">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-PowderBlueBorder dark:divide-dark_border">
                    {batch.sessions?.map((s) => (
                        <tr key={s.sessionId} className="hover:bg-gray-50/80 dark:hover:bg-dark_input/30 transition-colors">
                            <td className="py-2.5 px-4">
                                <p className="text-sm font-medium text-MidnightNavyText dark:text-white truncate max-w-xs">{s.title}</p>
                                <p className="text-[11px] text-SlateBlueText dark:text-darktext">
                                    {t("reschedule.table.module") || "Module"} {(s.moduleIndex ?? 0) + 1} · {t("reschedule.table.session") || "Session"} {s.sessionNumber}
                                </p>
                            </td>
                            <td className="py-2.5 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_STYLES[s.status] || STATUS_STYLES.scheduled}`}>
                                    {s.status}
                                </span>
                            </td>
                            <td className="py-2.5 px-4">
                                <ShiftTimeline
                                    oldDate={s.oldScheduledDate}
                                    newDate={s.newScheduledDate}
                                    shiftDays={batch.shiftDays}
                                    locale={locale}
                                    t={t}
                                />
                            </td>
                            <td className="py-2.5 px-4">
                                {s.isTrigger && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
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
    const isSingle = batch.viewMode === "single";
    const sessionCount = batch.sessions?.length || 0;

    return (
        <div className="space-y-5">
            {/* ── Status chip ── */}
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#946600] dark:text-[#feaf00] bg-[#feaf00]/10 border border-[#feaf00]/25 rounded-full w-fit px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#feaf00] animate-pulse" />
                {t("reschedule.details.statusPending") || "Awaiting your review"}
            </div>

            {/* ── Identity strip: who's asking, for which group ── */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-base text-MidnightNavyText dark:text-white truncate">
                            {batch.groupName || t("reschedule.unknownGroup") || "Unknown Group"}
                        </h3>
                        <p className="text-xs text-SlateBlueText dark:text-darktext flex items-center gap-1.5 mt-0.5">
                            <User className="w-3 h-3 flex-shrink-0" />
                            {batch.requestedBy?.name || "—"}
                            <span className="text-gray-300 dark:text-gray-600">·</span>
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            {formatDateTime(batch.requestedAt, locale)}
                        </p>
                    </div>
                </div>
                <ViewModeBadge viewMode={batch.viewMode} t={t} />
            </div>

            {/* ── Hero: the shift, as a number, not a label ── */}
            <div
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-[#ff6437] p-4 md:p-5 text-white"
                style={{
                    backgroundImage:
                        "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.14) 1px, transparent 0), linear-gradient(to bottom right, #ff6700, #ff6437)",
                    backgroundSize: "16px 16px, 100% 100%",
                }}
            >
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-[11px] uppercase tracking-wide text-white/75 font-semibold mb-1">
                            {t("reschedule.details.shift") || "Schedule shift"}
                        </p>
                        <p className="text-3xl md:text-4xl font-bold leading-none">
                            +{batch.shiftDays || 7}
                            <span className="text-base font-semibold ms-1.5 text-white/85">
                                {t("reschedule.details.days") || "days"}
                            </span>
                        </p>
                    </div>
                    <div className="w-px h-10 bg-white/25 flex-shrink-0" />
                    <div className="text-end flex-1">
                        <p className="text-[11px] uppercase tracking-wide text-white/75 font-semibold mb-1">
                            {t("reschedule.sessionsAffected") || "sessions affected"}
                        </p>
                        <p className="text-3xl md:text-4xl font-bold leading-none">{sessionCount}</p>
                    </div>
                </div>
                <div className="absolute -end-6 -bottom-6 w-28 h-28 rounded-full bg-white/10" />
                <div className="absolute -end-2 -bottom-10 w-20 h-20 rounded-full bg-white/10" />
            </div>

            {/* ── What happens: two concrete steps instead of a paragraph ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div className="flex items-start gap-2.5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-3.5">
                    <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex-shrink-0">
                        <Unlock className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-0.5">
                            {t("reschedule.details.stepNowTitle") || "Opens right away"}
                        </p>
                        <p className="text-[11px] text-emerald-700/90 dark:text-emerald-300/80 leading-relaxed">
                            {t("reschedule.details.stepNowBody") || "The trigger session gets its link and attendance immediately on approval."}
                        </p>
                    </div>
                </div>
                <div className="flex items-start gap-2.5 bg-[#004d59]/5 dark:bg-[#004d59]/10 border border-[#004d59]/15 dark:border-[#004d59]/25 rounded-xl p-3.5">
                    <div className="p-1.5 bg-[#004d59]/10 dark:bg-[#004d59]/20 rounded-lg flex-shrink-0">
                        <Lock className="w-4 h-4 text-[#004d59] dark:text-[#5fb8c4]" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-[#004d59] dark:text-[#5fb8c4] mb-0.5">
                            {isSingle
                                ? (t("reschedule.details.stepLaterTitleSingle") || "Rest stay locked")
                                : (t("reschedule.details.stepLaterTitleNext") || "Next session previews")}
                        </p>
                        <p className="text-[11px] text-[#004d59]/80 dark:text-[#5fb8c4]/80 leading-relaxed">
                            {isSingle
                                ? (t("reschedule.details.stepLaterBodySingle") || "Every other session shifts one week and stays locked until its new date.")
                                : (t("reschedule.details.stepLaterBodyNext") || "The session right after shows a content preview only — no link or attendance until its new date.")}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Sessions table ── */}
            <div className="pt-1 border-t border-PowderBlueBorder dark:border-dark_border">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mt-3 mb-2">
                    {t("reschedule.details.allSessions") || "All affected sessions"}
                </p>
                <div className="border border-PowderBlueBorder dark:border-dark_border rounded-xl overflow-hidden">
                    <SessionsTable batch={batch} locale={locale} t={t} />
                </div>
            </div>

            {/* ── Actions ── */}
            <div className="flex items-center justify-end gap-2 pt-1">
                <button
                    onClick={onReject}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold text-red-600 border border-red-200 dark:border-red-800/30 hover:bg-red-50 dark:hover:bg-red-900/10 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                    <XCircle className="w-4 h-4" />
                    {t("reschedule.reject.button") || "Reject"}
                </button>
                <button
                    onClick={onApprove}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {t("reschedule.approve.button") || "Approve"}
                </button>
            </div>
        </div>
    );
}