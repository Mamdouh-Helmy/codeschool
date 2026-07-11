"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import { Users, Clock, Inbox } from "lucide-react";

const SEEN_STORAGE_KEY = "admin_reschedule_seen_batches";
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

export default function AdminNotificationBell({ isRTL, t, locale = "ar" }) {
    const router = useRouter();
    const [batches, setBatches] = useState([]);
    const [open, setOpen] = useState(false);
    const [readIds, setReadIds] = useState(() => loadSeenSet());

    const readIdsRef = useRef(readIds);
    const notifiedRef = useRef(new Set()); // منعرضش toast للطلب نفسه مرتين في نفس الجلسة
    const firstLoadRef = useRef(true);
    const containerRef = useRef(null);

    useEffect(() => {
        readIdsRef.current = readIds;
    }, [readIds]);

    const poll = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/sessions/reschedule-requests", {
                cache: "no-store",
            });
            const json = await res.json();
            if (!json.success) return;

            const fresh = json.data.batches || [];
            setBatches(fresh);

            if (!firstLoadRef.current) {
                const newOnes = fresh.filter(
                    (b) => !notifiedRef.current.has(b.batchId) && !readIdsRef.current.has(b.batchId)
                );
                newOnes.forEach((b) => {
                    notifiedRef.current.add(b.batchId);
                    toast(
                        locale === "ar"
                            ? `طلب ترحيل جديد لمجموعة "${b.groupName || ""}"`
                            : `New reschedule request for "${b.groupName || ""}"`,
                        { icon: "🔔", position: "top-center", duration: 5000 }
                    );
                });
            } else {
                fresh.forEach((b) => notifiedRef.current.add(b.batchId));
                firstLoadRef.current = false;
            }
        } catch (err) {
            console.error("Error polling reschedule notifications:", err);
        }
    }, [locale]);

    useEffect(() => {
        poll();
        const interval = setInterval(poll, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [poll]);

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

    const unreadCount = batches.filter((b) => !readIds.has(b.batchId)).length;

    const markRead = useCallback((batchId) => {
        setReadIds((prev) => {
            const next = new Set(prev);
            next.add(batchId);
            saveSeenSet(next);
            return next;
        });
    }, []);

    const handleItemClick = (batch) => {
        markRead(batch.batchId);
        setOpen(false);
        router.push(`/admin/reschedule-requests?batchId=${batch.batchId}`);
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
                            {t("notifications.rescheduleRequests") || "Reschedule Requests"}
                        </p>
                        {unreadCount > 0 && (
                            <span className="text-[11px] font-semibold text-primary">
                                {unreadCount} {t("notifications.new") || "new"}
                            </span>
                        )}
                    </div>

                    {batches.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-8 text-center px-4">
                            <Inbox className="w-6 h-6 text-slate-300 dark:text-gray-600" />
                            <p className="text-xs text-slate-400 dark:text-gray-500">
                                {t("notifications.empty") || "No pending requests"}
                            </p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-100 dark:divide-dark_border">
                            {batches.map((b) => {
                                const isUnread = !readIds.has(b.batchId);
                                return (
                                    <li key={b.batchId}>
                                        <button
                                            onClick={() => handleItemClick(b)}
                                            className={`flex w-full items-start gap-2.5 px-3.5 py-3 text-start transition-colors hover:bg-slate-50 dark:hover:bg-dark_input/40 ${isUnread ? "bg-primary/[0.04] dark:bg-primary/[0.06]" : ""}`}
                                        >
                                            <div className="mt-0.5 flex-shrink-0">
                                                <span className={`block w-2 h-2 rounded-full ${isUnread ? "bg-primary" : "bg-transparent"}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs truncate ${isUnread ? "font-bold text-MidnightNavyText dark:text-white" : "font-medium text-slate-500 dark:text-darktext"}`}>
                                                    {b.groupName || t("reschedule.unknownGroup") || "Unknown Group"}
                                                </p>
                                                <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {b.sessions?.length || 0} {t("reschedule.sessionsAffected") || "sessions"}
                                                    <span className="text-slate-300 dark:text-gray-600">·</span>
                                                    <Clock className="w-3 h-3" />
                                                    {formatRelativeTime(b.requestedAt, locale)}
                                                </p>
                                            </div>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    {batches.length > 0 && (
                        <button
                            onClick={() => { setOpen(false); router.push("/admin/reschedule-requests"); }}
                            className="block w-full border-t border-slate-100 dark:border-dark_border py-2.5 text-center text-xs font-bold text-primary hover:bg-slate-50 dark:hover:bg-dark_input/40 transition-colors"
                        >
                            {t("notifications.viewAll") || "View all requests"}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}