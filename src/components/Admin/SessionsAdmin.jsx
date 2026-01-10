"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Calendar,
  Clock,
  Users,
  BookOpen,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  Filter,
  Search,
  RefreshCw,
  PlayCircle,
  VideoIcon,
  ClipboardCheck
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SessionsAdmin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get('groupId');

  const [sessions, setSessions] = useState([]);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    upcoming: false,
    past: false
  });

  const loadSessions = async () => {
    if (!groupId) return;
    
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        ...(filters.status && { status: filters.status }),
        ...(filters.upcoming && { upcoming: 'true' }),
        ...(filters.past && { past: 'true' })
      });

      const res = await fetch(`/api/groups/${groupId}/sessions?${queryParams}`, {
        cache: "no-store"
      });

      const json = await res.json();

      if (json.success) {
        setSessions(json.data || []);
        setGroup(json.group);
      } else {
        toast.error(json.error || "Failed to load sessions");
      }
    } catch (err) {
      console.error("Error loading sessions:", err);
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [groupId, filters.status, filters.upcoming, filters.past]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'postponed': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const onViewAttendance = (sessionId) => {
    router.push(`/admin/sessions/${sessionId}/attendance`);
  };

  if (!groupId) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold mb-2">No Group Selected</h3>
        <p className="text-sm text-gray-600 mb-4">Please select a group first</p>
        <button
          onClick={() => router.push('/admin/groups')}
          className="bg-primary text-white px-6 py-2 rounded-lg"
        >
          Go to Groups
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-darkmode rounded-xl shadow-sm p-6 border border-PowderBlueBorder dark:border-dark_border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-MidnightNavyText dark:text-white">
              Sessions - {group?.name}
            </h1>
            <p className="text-sm text-SlateBlueText dark:text-darktext">
              Group Code: {group?.code}
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/groups')}
            className="text-primary hover:underline text-sm"
          >
            ← Back to Groups
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border">
        <div className="flex items-center gap-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="postponed">Postponed</option>
          </select>

          <div className="flex gap-2">
            <button
              onClick={() => setFilters(prev => ({ ...prev, upcoming: !prev.upcoming, past: false }))}
              className={`px-3 py-2 text-sm rounded-lg ${
                filters.upcoming ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, past: !prev.past, upcoming: false }))}
              className={`px-3 py-2 text-sm rounded-lg ${
                filters.past ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700'
              }`}
            >
              Past
            </button>
          </div>

          <button
            onClick={loadSessions}
            className="ml-auto px-3 py-2 bg-primary text-white rounded-lg flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Sessions List */}
      <div className="bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-PowderBlueBorder dark:divide-dark_border">
            <thead className="bg-gray-50 dark:bg-dark_input">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase">Session</th>
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase">Date & Time</th>
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase">Status</th>
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase">Attendance</th>
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-PowderBlueBorder dark:divide-dark_border">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-dark_input">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-sm">{session.title}</p>
                      <p className="text-xs text-gray-500">
                        Module {session.moduleIndex + 1} - Lesson {session.lessonIndex + 1}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(session.scheduledDate)}
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Clock className="w-3 h-3" />
                        {session.startTime} - {session.endTime}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                      {session.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {session.attendanceTaken ? (
                      <div className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Taken
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        Not taken
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => onViewAttendance(session.id)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      title="View Attendance"
                    >
                      <ClipboardCheck className="w-4 h-4 text-primary" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sessions.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">No Sessions Found</h3>
            <p className="text-sm text-gray-600">
              {filters.status || filters.upcoming || filters.past
                ? "No sessions match your filters"
                : "Sessions will appear here once the group is activated"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}