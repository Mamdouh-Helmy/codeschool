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
  Link as LinkIcon,
  ExternalLink,
  MapPin,
  ChevronDown,
  ChevronUp,
  Circle,
  XCircle,
  CheckCircle as CheckCircleIcon,
  Clock as ClockIcon,
  Video,
  User,
  CalendarDays,
  Activity,
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
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${formatDate(value)} · ${d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function getStatusColor(status) {
  switch (status) {
    case "scheduled":
      return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 ring-1 ring-inset ring-blue-600/10 dark:ring-blue-400/20";
    case "completed":
      return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-inset ring-emerald-600/10 dark:ring-emerald-400/20";
    case "cancelled":
      return "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 ring-1 ring-inset ring-rose-600/10 dark:ring-rose-400/20";
    case "postponed":
      return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 ring-1 ring-inset ring-amber-600/10 dark:ring-amber-400/20";
    default:
      return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 ring-1 ring-inset ring-gray-500/10";
  }
}

function getStatusDot(status) {
  switch (status) {
    case "scheduled":
      return "bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]";
    case "completed":
      return "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]";
    case "cancelled":
      return "bg-rose-500 shadow-[0_0_0_3px_rgba(244,63,94,0.15)]";
    case "postponed":
      return "bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.15)]";
    default:
      return "bg-gray-400";
  }
}

function getStatusIcon(status) {
  switch (status) {
    case "scheduled":
      return <ClockIcon className="w-3 h-3" />;
    case "completed":
      return <CheckCircleIcon className="w-3 h-3" />;
    case "cancelled":
      return <XCircle className="w-3 h-3" />;
    case "postponed":
      return <ClockIcon className="w-3 h-3" />;
    default:
      return <Circle className="w-3 h-3" />;
  }
}

export default function MeetingLinkReservationInfo({ linkId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/meeting-links/${linkId}/full`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load reservation info");
      }
      setData(json.data);

      if (json.data?.groups) {
        const allGroupIds = new Set(json.data.groups.map((g) => g.groupId));
        setExpandedGroups(allGroupIds);
      }
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

  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="relative w-11 h-11">
          <div className="absolute inset-0 rounded-full border-[3px] border-primary/15"></div>
          <div className="absolute inset-0 rounded-full border-[3px] border-primary border-t-transparent animate-spin"></div>
        </div>
        <p className="text-sm text-gray-500 dark:text-darktext tracking-wide">
          Loading reservation details…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-6">
        <div className="w-14 h-14 bg-rose-50 dark:bg-rose-500/10 rounded-2xl flex items-center justify-center ring-1 ring-rose-600/10 dark:ring-rose-400/20">
          <AlertCircle className="w-7 h-7 text-rose-500 dark:text-rose-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-MidnightNavyText dark:text-white">
            Couldn't load this reservation
          </p>
          <p className="text-sm text-gray-500 dark:text-darktext max-w-md mt-1">{error}</p>
        </div>
        <button
          onClick={load}
          className="px-5 py-2.5 bg-primary hover:bg-primary/90 active:scale-[0.98] text-white rounded-xl text-sm font-medium flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { link, groups, usageSummary, currentReservation, stats } = data;

  return (
    <>
      <style>{`
        .scrollbar-hidden {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hidden::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
        .accent-edge {
          background: linear-gradient(180deg, #004d59 0%, #ff6700 100%);
        }
      `}</style>

      <div className="space-y-5 pr-1 font-sans">

        {/* ========== Link Info Card ========== */}
        <div className="relative bg-white dark:bg-darkmode rounded-2xl border border-gray-100 dark:border-dark_border shadow-sm overflow-hidden">
          <span className="accent-edge absolute inset-y-0 left-0 w-1" />
          <div className="p-6 pl-7 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Video className="w-6 h-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold tracking-tight text-MidnightNavyText dark:text-white truncate">
                  {link.name}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-darktext bg-gray-100 dark:bg-gray-700/50 px-2.5 py-1 rounded-full">
                    {link.platform}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${
                      link.status === "available"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : link.status === "reserved"
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                        : link.status === "in_use"
                        ? "bg-[#ff6700]/10 text-[#ff6700] dark:bg-[#ff6700]/15 dark:text-[#ff9350]"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-400"
                    }`}
                  >
                    {link.status.replace("_", " ").toUpperCase()}
                  </span>
                </div>
                <a
                  href={link.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:text-[#ff6700] mt-3 flex items-center gap-1.5 font-medium transition-colors duration-200 w-fit"
                >
                  <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate max-w-[220px] sm:max-w-xs">{link.link}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>
            </div>
            <div className="flex items-center gap-5 sm:gap-0 sm:flex-col sm:items-end sm:divide-y sm:divide-gray-100 dark:sm:divide-dark_border shrink-0">
              <div className="text-center sm:text-right sm:pb-3">
                <div className="text-2xl font-bold tabular-nums text-MidnightNavyText dark:text-white">
                  {stats.totalUses}
                </div>
                <div className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-darktext">Total uses</div>
              </div>
              <div className="text-center sm:text-right sm:pt-3">
                <div className="text-2xl font-bold tabular-nums text-MidnightNavyText dark:text-white">
                  {stats.totalHours.toFixed(1)}h
                </div>
                <div className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-darktext">Total hours</div>
              </div>
            </div>
          </div>
        </div>

        {/* ========== Current Reservation ========== */}
        {currentReservation && (currentReservation.groupId || currentReservation.sessionId) && (
          <div className="bg-white dark:bg-darkmode rounded-2xl p-6 border border-gray-100 dark:border-dark_border shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <MapPin className="w-4.5 h-4.5 text-primary" />
              </div>
              <h3 className="text-base font-bold tracking-tight text-MidnightNavyText dark:text-white">
                Current Reservation
              </h3>
              <span
                className={`ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  currentReservation.isExpired
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    currentReservation.isExpired ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
                  }`}
                />
                {currentReservation.isExpired ? "Expired" : "Active"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-3.5">
                <p className="text-xs text-gray-500 dark:text-darktext flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Group
                </p>
                <p className="font-semibold text-MidnightNavyText dark:text-white mt-1 text-sm truncate">
                  {currentReservation.groupName || "Unknown Group"}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-3.5">
                <p className="text-xs text-gray-500 dark:text-darktext flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" /> Period
                </p>
                <p className="font-semibold text-MidnightNavyText dark:text-white mt-1 text-sm">
                  {formatDate(currentReservation.startTime)} → {formatDate(currentReservation.endTime)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-3.5">
                <p className="text-xs text-gray-500 dark:text-darktext flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Time
                </p>
                <p className="font-semibold text-MidnightNavyText dark:text-white mt-1 text-sm tabular-nums">
                  {currentReservation.timeFrom} - {currentReservation.timeTo}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-3.5">
                <p className="text-xs text-gray-500 dark:text-darktext flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Reserved
                </p>
                <p className="font-semibold text-MidnightNavyText dark:text-white mt-1 text-sm">
                  {formatDateTime(currentReservation.reservedAt)}
                </p>
              </div>
            </div>

            {currentReservation.daysOfWeek?.length > 0 && (
              <div className="mt-5">
                <p className="text-xs text-gray-500 dark:text-darktext mb-2.5 uppercase tracking-wide">Reserved Days</p>
                <div className="flex gap-1.5">
                  {DAYS.map((day) => {
                    const active = currentReservation.daysOfWeek.includes(day.key);
                    return (
                      <div
                        key={day.key}
                        title={day.key}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-semibold transition-all duration-200 ${
                          active
                            ? "bg-primary text-white shadow-md shadow-primary/20"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                        }`}
                      >
                        {day.short}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========== Groups Section ========== */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-gray-600 dark:text-gray-300" />
            </div>
            <h3 className="text-base font-bold tracking-tight text-MidnightNavyText dark:text-white">
              Groups Using This Link
              <span className="text-gray-400 font-normal ml-2 text-sm">
                ({groups.length} groups · {usageSummary.totalSessions} sessions)
              </span>
            </h3>
          </div>

          {groups.length === 0 ? (
            <div className="bg-white dark:bg-darkmode rounded-2xl p-12 text-center border border-gray-100 dark:border-dark_border shadow-sm">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
              </div>
              <p className="text-base font-semibold text-MidnightNavyText dark:text-white">
                No groups currently using this link
              </p>
              <p className="text-sm text-gray-500 dark:text-darktext mt-1">
                This link is free and available for assignment
              </p>
            </div>
          ) : (
            groups.map((group) => {
              const isOpen = expandedGroups.has(group.groupId);
              return (
                <div
                  key={group.groupId}
                  className="bg-white dark:bg-darkmode rounded-2xl border border-gray-100 dark:border-dark_border shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden"
                >
                  {/* Group Header */}
                  <div
                    className="p-5 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors duration-200"
                    onClick={() => toggleGroup(group.groupId)}
                    role="button"
                    aria-expanded={isOpen}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="font-bold text-primary text-sm">
                            {group.groupName.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-MidnightNavyText dark:text-white truncate">
                            {group.groupName}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-darktext">
                            <span className="font-mono">{group.groupCode}</span>
                            <span className="text-gray-300 dark:text-gray-600">·</span>
                            <span>{group.courseTitle}</span>
                            {group.courseLevel && (
                              <>
                                <span className="text-gray-300 dark:text-gray-600">·</span>
                                <span className="capitalize">{group.courseLevel}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right text-xs">
                          <div className="font-semibold text-MidnightNavyText dark:text-white tabular-nums">
                            {group.activePeriod.totalSessions} sessions
                          </div>
                          <div className="text-gray-500 dark:text-darktext">
                            {group.activePeriod.activeSessions} active
                          </div>
                        </div>
                        <div className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                          <ChevronDown className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    {/* Group Summary Chips */}
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <div className="bg-gray-50 dark:bg-gray-800/30 px-3.5 py-2 rounded-xl">
                        <span className="text-gray-500 dark:text-darktext">Schedule</span>
                        <p className="font-medium text-MidnightNavyText dark:text-white mt-0.5">
                          {group.schedule.daysOfWeek.join(", ")}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800/30 px-3.5 py-2 rounded-xl">
                        <span className="text-gray-500 dark:text-darktext">Time</span>
                        <p className="font-medium text-MidnightNavyText dark:text-white mt-0.5 tabular-nums">
                          {group.schedule.timeFrom} - {group.schedule.timeTo}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800/30 px-3.5 py-2 rounded-xl">
                        <span className="text-gray-500 dark:text-darktext">Active Period</span>
                        <p className="font-medium text-MidnightNavyText dark:text-white mt-0.5">
                          {group.activePeriod.firstSessionDate
                            ? formatDate(group.activePeriod.firstSessionDate)
                            : "—"}
                          {group.activePeriod.lastSessionDate &&
                            ` → ${formatDate(group.activePeriod.lastSessionDate)}`}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800/30 px-3.5 py-2 rounded-xl">
                        <span className="text-gray-500 dark:text-darktext">Status</span>
                        <span
                          className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            group.groupStatus === "active"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : group.groupStatus === "draft"
                              ? "bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-400"
                              : group.groupStatus === "completed"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
                          }`}
                        >
                          {group.groupStatus.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Status Counters */}
                    <div className="mt-3 flex flex-wrap gap-4 text-xs">
                      <span className="flex items-center gap-1.5 text-gray-500 dark:text-darktext">
                        Total: <strong className="text-MidnightNavyText dark:text-white tabular-nums">{group.activePeriod.totalSessions}</strong>
                      </span>
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Active: <strong className="tabular-nums">{group.activePeriod.activeSessions}</strong>
                      </span>
                      <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        Completed: <strong className="tabular-nums">{group.activePeriod.completedSessions}</strong>
                      </span>
                      <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        Cancelled: <strong className="tabular-nums">{group.activePeriod.cancelledSessions}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Expanded Session Timeline */}
                  {isOpen && (
                    <div className="border-t border-gray-100 dark:border-dark_border bg-gray-50/50 dark:bg-black/10">
                      <div className="p-5 max-h-80 overflow-y-auto scrollbar-hidden">
                        <div className="relative">
                          {/* connecting line */}
                          <div className="absolute left-[13px] top-2 bottom-2 w-px bg-gray-200 dark:bg-dark_border" />
                          <div className="space-y-2">
                            {group.sessions.map((session) => (
                              <div
                                key={session.sessionId}
                                className="relative flex items-start gap-4 pl-0"
                              >
                                {/* status dot on the timeline */}
                                <div className="relative z-10 mt-1.5 shrink-0">
                                  <span className={`block w-[9px] h-[9px] rounded-full ${getStatusDot(session.status)}`} />
                                </div>

                                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-white dark:bg-darkmode rounded-xl px-3.5 py-2.5 border border-gray-100 dark:border-dark_border">
                                  <span className="text-xs font-mono text-gray-400 dark:text-gray-500 shrink-0 w-8">
                                    S{session.sessionNumber}
                                  </span>

                                  <span className="text-sm font-medium text-MidnightNavyText dark:text-white truncate flex-1 min-w-0">
                                    {session.title || `Session ${session.sessionNumber}`}
                                  </span>

                                  <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 tabular-nums">
                                    {formatDate(session.scheduledDate)}
                                  </span>

                                  <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 tabular-nums">
                                    {session.startTime}–{session.endTime}
                                  </span>

                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${getStatusColor(
                                      session.status
                                    )}`}
                                  >
                                    {getStatusIcon(session.status)}
                                    {session.status}
                                  </span>

                                  <span
                                    className="shrink-0"
                                    title={session.hasLink ? "Uses this link" : "Does NOT use this link"}
                                  >
                                    {session.hasLink ? (
                                      <span className="text-xs text-emerald-600 dark:text-emerald-400">●</span>
                                    ) : (
                                      <span className="text-xs text-gray-300 dark:text-gray-600">○</span>
                                    )}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ========== Usage Summary ========== */}
        <div className="bg-white dark:bg-darkmode rounded-2xl p-6 border border-gray-100 dark:border-dark_border shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center">
              <History className="w-4.5 h-4.5 text-gray-600 dark:text-gray-300" />
            </div>
            <h3 className="text-base font-bold tracking-tight text-MidnightNavyText dark:text-white">
              Usage Summary
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-4 text-center border-t-2 border-gray-300 dark:border-gray-600">
              <p className="text-2xl font-bold tabular-nums text-MidnightNavyText dark:text-white">
                {usageSummary.totalSessions}
              </p>
              <p className="text-xs text-gray-500 dark:text-darktext mt-0.5">Total Sessions</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-500/[0.06] rounded-xl p-4 text-center border-t-2 border-emerald-400">
              <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {usageSummary.sessionsByStatus.scheduled}
              </p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">Active</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-500/[0.06] rounded-xl p-4 text-center border-t-2 border-blue-400">
              <p className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                {usageSummary.sessionsByStatus.completed}
              </p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">Completed</p>
            </div>
            <div className="bg-rose-50 dark:bg-rose-500/[0.06] rounded-xl p-4 text-center border-t-2 border-rose-400">
              <p className="text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
                {usageSummary.sessionsByStatus.cancelled}
              </p>
              <p className="text-xs text-rose-600/70 dark:text-rose-400/70 mt-0.5">Cancelled</p>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}