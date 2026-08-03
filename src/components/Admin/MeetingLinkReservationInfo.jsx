"use client";
import { useState, useEffect, useCallback } from "react";
import {
    Calendar,
    Clock,
    Users,
    CheckCircle,
    History,
    AlertCircle,
    RefreshCw,
} from "lucide-react";

const DAYS = [
    { key: "Sunday", short: "Su" },
    { key: "Monday", short: "Mo" },
    { key: "Tuesday", short: "Tu" },
    { key: "Wednesday", short: "We" },
    { key: "Thursday", short: "Th" },
    { key: "Friday", short: "Fr" },
    { key: "Saturday", short: "Sa" },
];

function formatDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return `${formatDate(value)} · ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function MeetingLinkReservationInfo({ linkId }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [link, setLink] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/meeting-links/${linkId}`, { cache: "no-store" });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || "Failed to load reservation info");
            }
            setLink(json.data);
        } catch (err) {
            console.error("Error loading reservation info:", err);
            setError(err.message || "Failed to load reservation info");
        } finally {
            setLoading(false);
        }
    }, [linkId]);

    useEffect(() => {
        if (linkId) load();
    }, [linkId, load]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500 dark:text-darktext">Loading reservation details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-sm text-gray-600 dark:text-darktext">{error}</p>
                <button
                    onClick={load}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Try again
                </button>
            </div>
        );
    }

    const reservation = link?.currentReservation;
    const hasActiveGroup = !!reservation?.groupId;
    const isExpired = reservation?.endTime && new Date(reservation.endTime) < new Date();
    const activeDays = new Set(reservation?.daysOfWeek || []);
    const history = Array.isArray(link?.usageHistory) ? link.usageHistory : [];
    const totalUses = link?.stats?.totalUses || 0;

    return (
        <div className="space-y-5 pr-1">
            {/* Current Reservation */}
            <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Users className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
                            Current Reservation
                        </h3>
                    </div>
                    {hasActiveGroup && (
                        <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                isExpired
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                    : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                            }`}
                        >
                            {isExpired ? "Ended, not released" : "Active"}
                        </span>
                    )}
                </div>

                {hasActiveGroup ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
                                {(reservation.groupId?.name || "?").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-semibold text-sm text-MidnightNavyText dark:text-white">
                                    {reservation.groupId?.name || "Unknown group"}
                                </p>
                                {reservation.groupId?.code && (
                                    <p className="text-xs text-gray-500 dark:text-darktext">
                                        {reservation.groupId.code}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-darktext">Reservation period</p>
                                    <p className="text-sm font-medium text-MidnightNavyText dark:text-white">
                                        {formatDate(reservation.startTime)} → {formatDate(reservation.endTime)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-darktext">Time slot</p>
                                    <p className="text-sm font-medium text-MidnightNavyText dark:text-white">
                                        {reservation.timeFrom || "—"} - {reservation.timeTo || "—"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs text-gray-500 dark:text-darktext mb-2">Days reserved</p>
                            <div className="flex gap-1.5">
                                {DAYS.map((day) => {
                                    const active = activeDays.has(day.key);
                                    return (
                                        <div
                                            key={day.key}
                                            title={day.key}
                                            className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-semibold transition-colors ${
                                                active
                                                    ? "bg-primary text-white"
                                                    : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                                            }`}
                                        >
                                            {day.short}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="pt-3 border-t border-gray-100 dark:border-dark_border text-xs text-gray-500 dark:text-darktext">
                            Reserved by {reservation.reservedBy?.name || "someone"} on {formatDate(reservation.reservedAt)}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-center gap-2 py-6">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <p className="text-sm font-medium text-MidnightNavyText dark:text-white">
                            Not tied to any group right now
                        </p>
                        <p className="text-xs text-gray-500 dark:text-darktext">
                            This link is free and can be reserved for any schedule.
                        </p>
                    </div>
                )}
            </div>

            {/* Usage History */}
            <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <History className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                    </div>
                    <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
                        Usage History{" "}
                        {history.length > 0 && (
                            <span className="text-gray-400 font-normal">
                                ({totalUses > history.length ? `latest ${history.length} of ${totalUses}` : history.length})
                            </span>
                        )}
                    </h3>
                </div>

                {history.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-darktext py-4 text-center">
                        No usage recorded yet.
                    </p>
                ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {history.map((entry, idx) => (
                            <div
                                key={entry._id || idx}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm"
                            >
                                <div>
                                    <p className="font-medium text-MidnightNavyText dark:text-white">
                                        {entry.groupId?.name || "Unknown group"}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-darktext">
                                        {formatDateTime(entry.usedAt)}
                                    </p>
                                </div>
                                <span className="text-xs text-gray-500 dark:text-darktext whitespace-nowrap">
                                    {entry.duration ? `${entry.duration} min` : "—"}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}