"use client";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import { Users, Clock, Inbox, AlertTriangle, Landmark, CalendarClock } from "lucide-react";

const SEEN_STORAGE_KEY = "admin_notifications_seen_v2"; // ✅ v2: مفاتيح مسبوقة بنوع الإشعار (reschedule:/billing:)
const POLL_INTERVAL_MS = 20000; // 20 ثانية

function loadSeenSet() {
    if (typeof window === "undefined") return new Set();
    try {
        const raw = localStorage.getItem(SEEN_STORAGE_KEY);
        return new Set(raw ? JSON.parse(raw) : []);
    } catch {
        return new Set();
    }
}

function saveSeenSet(set) {
    try {
        localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(Array.from(set)));
    } catch {
        // ignore quota / privacy-mode errors
    }
}

function formatRelativeTime(dateString, locale) {
    if (!dateString) return "";
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 1) return locale === "ar" ? "الآن" : "just now";
    if (diffMin < 60) return locale === "ar" ? `منذ ${diffMin} د` : `${diffMin}m ago`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return locale === "ar" ? `منذ ${diffH} س` : `${diffH}h ago`;
    const diffD = Math.round(diffH / 24);
    return locale === "ar" ? `منذ ${diffD} يوم` : `${diffD}d ago`;
}

// ✅ إعدادات عرض نوعي تنبيه الفوترة (نفس منطق صفحة /admin/billing-alerts)
const BILLING_TYPE_CFG = {
    overdue: {
        icon: CalendarClock,
        labelAr: "فاتورة متأخرة",
        labelEn: "Overdue invoice",
    },
    escrow_review: {
        icon: Landmark,
        labelAr: "مراجعة إسكرو (14 يوم)",
        labelEn: "Escrow review (14 days)",
    },
};

export default function AdminNotificationBell({ isRTL, t, locale = "ar" }) {
    const router = useRouter();

    // Reschedule batches (كما هي)
    const [batches, setBatches] = useState([]);

    // ✅ NEW: Billing alerts (overdue + escrow_review) المفتوحة
    const [billingAlerts, setBillingAlerts] = useState([]);

    const [open, setOpen] = useState(false);
    const [readIds, setReadIds] = useState(() => loadSeenSet());

    const readIdsRef = useRef(readIds);
    const notifiedRef = useRef(new Set()); // منعرضش toast للإشعار نفسه مرتين في نفس الجلسة
    const firstLoadRescheduleRef = useRef(true);
    const firstLoadBillingRef = useRef(true);
    const containerRef = useRef(null);

    useEffect(() => {
        readIdsRef.current = readIds;
    }, [readIds]);

    // ── Poll: طلبات الترحيل (كما هي) ──────────────────────────────────────
    const pollReschedule = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/sessions/reschedule-requests", {
                cache: "no-store",
            });
            const json = await res.json();
            if (!json.success) return;

            const fresh = json.data.batches || [];
            setBatches(fresh);

            if (!firstLoadRescheduleRef.current) {
                const newOnes = fresh.filter(
                    (b) =>
                        !notifiedRef.current.has(`reschedule:${b.batchId}`) &&
                        !readIdsRef.current.has(`reschedule:${b.batchId}`)
                );
                newOnes.forEach((b) => {
                    notifiedRef.current.add(`reschedule:${b.batchId}`);
                    toast(
                        locale === "ar"
                            ? `طلب ترحيل جديد لمجموعة "${b.groupName || ""}"`
                            : `New reschedule request for "${b.groupName || ""}"`,
                        { icon: "🔔", position: "top-center", duration: 5000 }
                    );
                });
            } else {
                fresh.forEach((b) => notifiedRef.current.add(`reschedule:${b.batchId}`));
                firstLoadRescheduleRef.current = false;
            }
        } catch (err) {
            console.error("Error polling reschedule notifications:", err);
        }
    }, [locale]);

    // ── ✅ NEW Poll: تنبيهات الفوترة المفتوحة (overdue + escrow_review) ──────
    const pollBilling = useCallback(async () => {
        try {
            const res = await fetch("/api/billing-alerts?status=open", {
                cache: "no-store",
            });
            const json = await res.json();
            if (!json.success) return;

            const fresh = json.data || [];
            setBillingAlerts(fresh);

            if (!firstLoadBillingRef.current) {
                const newOnes = fresh.filter(
                    (a) =>
                        !notifiedRef.current.has(`billing:${a._id}`) &&
                        !readIdsRef.current.has(`billing:${a._id}`)
                );
                newOnes.forEach((a) => {
                    notifiedRef.current.add(`billing:${a._id}`);
                    const studentName = a.studentId?.personalInfo?.fullName || "";
                    const typeLabel =
                        BILLING_TYPE_CFG[a.type]?.[locale === "ar" ? "labelAr" : "labelEn"] ||
                        a.type;
                    toast(
                        locale === "ar"
                            ? `${typeLabel} — ${studentName}`
                            : `${typeLabel} — ${studentName}`,
                        { icon: "💰", position: "top-center", duration: 5000 }
                    );
                });
            } else {
                fresh.forEach((a) => notifiedRef.current.add(`billing:${a._id}`));
                firstLoadBillingRef.current = false;
            }
        } catch (err) {
            console.error("Error polling billing alerts:", err);
        }
    }, [locale]);

    const pollAll = useCallback(() => {
        pollReschedule();
        pollBilling();
    }, [pollReschedule, pollBilling]);

    useEffect(() => {
        pollAll();
        const interval = setInterval(pollAll, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [pollAll]);

    useEffect(() => {
        if (!open) return;
        const handleClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    }, [open]);

    // ── ✅ دمج طلبات الترحيل وتنبيهات الفوترة في قائمة واحدة موحدة ───────────
    const items = useMemo(() => {
        const rescheduleItems = batches.map((b) => ({
            id: `reschedule:${b.batchId}`,
            kind: "reschedule",
            title: b.groupName || (t && t("reschedule.unknownGroup")) || "Unknown Group",
            timestamp: b.requestedAt,
            raw: b,
        }));

        const billingItems = billingAlerts.map((a) => {
            const cfg = BILLING_TYPE_CFG[a.type] || {};
            const typeLabel = locale === "ar" ? cfg.labelAr : cfg.labelEn;
            return {
                id: `billing:${a._id}`,
                kind: "billing",
                title: a.studentId?.personalInfo?.fullName || (locale === "ar" ? "طالب" : "Student"),
                subtitleOverride: typeLabel || a.type,
                timestamp: a.createdAt,
                raw: a,
            };
        });

        return [...rescheduleItems, ...billingItems].sort(
            (x, y) => new Date(y.timestamp || 0) - new Date(x.timestamp || 0)
        );
    }, [batches, billingAlerts, locale, t]);

    const unreadCount = items.filter((it) => !readIds.has(it.id)).length;

    const markRead = useCallback((id) => {
        setReadIds((prev) => {
            const next = new Set(prev);
            next.add(id);
            saveSeenSet(next);
            return next;
        });
    }, []);

    const handleItemClick = (item) => {
        markRead(item.id);
        setOpen(false);
        if (item.kind === "reschedule") {
            router.push(`/admin/reschedule-requests?batchId=${item.raw.batchId}`);
        } else {
            router.push(`/admin/billing-alerts`);
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary dark:border-dark_border dark:text-darktext dark:hover:bg-darkmode"
                aria-label={t("dashboard.viewNotifications") || "View notifications"}
            >
                <Icon icon="ion:notifications-outline" className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className={`absolute ${isRTL ? "left-1.5" : "right-1.5"} top-1.5 flex h-2.5 w-2.5 items-center justify-center`}>
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                    </span>
                )}
            </button>

            {open && (
                <div
                    className={`absolute z-30 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-dark_border dark:bg-darkmode ${isRTL ? "-left-24" : "right-0"}`}
                >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark_border px-3.5 py-2.5">
                        <p className="text-sm font-bold text-MidnightNavyText dark:text-white">
                            {t("notifications.title") || (locale === "ar" ? "الإشعارات" : "Notifications")}
                        </p>
                        {unreadCount > 0 && (
                            <span className="text-[11px] font-semibold text-primary">
                                {unreadCount} {t("notifications.new") || "new"}
                            </span>
                        )}
                    </div>

                    {items.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-8 text-center px-4">
                            <Inbox className="w-6 h-6 text-slate-300 dark:text-gray-600" />
                            <p className="text-xs text-slate-400 dark:text-gray-500">
                                {t("notifications.empty") || "No pending notifications"}
                            </p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-100 dark:divide-dark_border">
                            {items.map((item) => {
                                const isUnread = !readIds.has(item.id);

                                if (item.kind === "reschedule") {
                                    const b = item.raw;
                                    return (
                                        <li key={item.id}>
                                            <button
                                                onClick={() => handleItemClick(item)}
                                                className={`flex w-full items-start gap-2.5 px-3.5 py-3 text-start transition-colors hover:bg-slate-50 dark:hover:bg-dark_input/40 ${isUnread ? "bg-primary/[0.04] dark:bg-primary/[0.06]" : ""}`}
                                            >
                                                <div className="mt-0.5 flex-shrink-0">
                                                    <span className={`block w-2 h-2 rounded-full ${isUnread ? "bg-primary" : "bg-transparent"}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-xs truncate ${isUnread ? "font-bold text-MidnightNavyText dark:text-white" : "font-medium text-slate-500 dark:text-darktext"}`}>
                                                        {item.title}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                                                        <Users className="w-3 h-3" />
                                                        {b.sessions?.length || 0} {t("reschedule.sessionsAffected") || "sessions"}
                                                        <span className="text-slate-300 dark:text-gray-600">·</span>
                                                        <Clock className="w-3 h-3" />
                                                        {formatRelativeTime(item.timestamp, locale)}
                                                    </p>
                                                </div>
                                            </button>
                                        </li>
                                    );
                                }

                                // ✅ NEW: عنصر تنبيه فوترة (overdue / escrow_review)
                                const a = item.raw;
                                const cfg = BILLING_TYPE_CFG[a.type] || {};
                                const TypeIcon = cfg.icon || AlertTriangle;
                                return (
                                    <li key={item.id}>
                                        <button
                                            onClick={() => handleItemClick(item)}
                                            className={`flex w-full items-start gap-2.5 px-3.5 py-3 text-start transition-colors hover:bg-slate-50 dark:hover:bg-dark_input/40 ${isUnread ? "bg-primary/[0.04] dark:bg-primary/[0.06]" : ""}`}
                                        >
                                            <div className="mt-0.5 flex-shrink-0">
                                                <span className={`block w-2 h-2 rounded-full ${isUnread ? "bg-primary" : "bg-transparent"}`} />
                                            </div>
                                            <div className="mt-0.5 flex-shrink-0">
                                                <TypeIcon className={`w-3.5 h-3.5 ${a.type === "overdue" ? "text-red-500" : "text-blue-500"}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs truncate ${isUnread ? "font-bold text-MidnightNavyText dark:text-white" : "font-medium text-slate-500 dark:text-darktext"}`}>
                                                    {item.title}
                                                </p>
                                                <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                                                    {item.subtitleOverride}
                                                    <span className="text-slate-300 dark:text-gray-600">·</span>
                                                    <Clock className="w-3 h-3" />
                                                    {formatRelativeTime(item.timestamp, locale)}
                                                </p>
                                            </div>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    {items.length > 0 && (
                        <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-dark_border border-t border-slate-100 dark:border-dark_border rtl:divide-x-reverse">
                            <button
                                onClick={() => { setOpen(false); router.push("/admin/reschedule-requests"); }}
                                className="py-2.5 text-center text-xs font-bold text-primary hover:bg-slate-50 dark:hover:bg-dark_input/40 transition-colors"
                            >
                                {t("notifications.viewAll") || "Reschedule requests"}
                            </button>
                            <button
                                onClick={() => { setOpen(false); router.push("/admin/billing-alerts"); }}
                                className="py-2.5 text-center text-xs font-bold text-primary hover:bg-slate-50 dark:hover:bg-dark_input/40 transition-colors"
                            >
                                {locale === "ar" ? "تنبيهات الفوترة" : "Billing alerts"}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}