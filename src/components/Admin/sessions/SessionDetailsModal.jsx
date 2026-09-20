"use client";
import React from "react";
import { Calendar, Clock, Link2, VideoIcon, FileText } from "lucide-react";
import ModalShell from "./ModalShell";

const STAT_META = {
  present: { text: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-500/10", ring: "ring-emerald-200 dark:ring-emerald-500/20" },
  absent:  { text: "text-rose-700 dark:text-rose-300",       bg: "bg-rose-50 dark:bg-rose-500/10",       ring: "ring-rose-200 dark:ring-rose-500/20" },
  late:    { text: "text-amber-700 dark:text-amber-300",     bg: "bg-amber-50 dark:bg-amber-500/10",     ring: "ring-amber-200 dark:ring-amber-500/20" },
  excused: { text: "text-sky-700 dark:text-sky-300",         bg: "bg-sky-50 dark:bg-sky-500/10",         ring: "ring-sky-200 dark:ring-sky-500/20" },
};

function StatCard({ label, value, meta }) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 text-center ${meta ? `${meta.bg} ${meta.ring} ring-1 border-transparent` : "border-slate-200 dark:border-white/10"}`}>
      <p className={`text-xl font-bold tabular-nums ${meta ? meta.text : "text-slate-800 dark:text-white"}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function InfoBlock({ icon: Icon, label, children }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      {children}
    </div>
  );
}

export default function SessionDetailsModal({ session, attendanceData, loading, onClose, isRTL, t }) {
  if (loading) {
    return (
      <ModalShell open onClose={onClose} size="md" accent="slate" isRTL={isRTL} title={isRTL ? "تفاصيل الجلسة" : "Session Details"}>
        <div className="flex flex-col items-center justify-center gap-3 py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
          <p className="text-sm text-slate-500">{isRTL ? "جاري التحميل..." : "Loading..."}</p>
        </div>
      </ModalShell>
    );
  }

  const stats = attendanceData?.stats || { total: 0, present: 0, absent: 0, late: 0, excused: 0 };

  const dateText = session?.scheduledDate
    ? new Date(session.scheduledDate).toLocaleDateString(isRTL ? "ar-EG" : "en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  const footer = (
    <button
      onClick={onClose}
      className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-900 dark:bg-white/10 dark:hover:bg-white/20"
    >
      {isRTL ? "إغلاق" : "Close"}
    </button>
  );

  return (
    <ModalShell
      open
      onClose={onClose}
      size="xl"
      accent="slate"
      isRTL={isRTL}
      title={`${isRTL ? "تفاصيل الجلسة" : "Session Details"} — ${session?.title || ""}`}
      subtitle={`${session?.startTime || ""}–${session?.endTime || ""}`}
      footer={footer}
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoBlock icon={Calendar} label={isRTL ? "التاريخ" : "Date"}>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">{dateText}</p>
          </InfoBlock>
          <InfoBlock icon={Clock} label={isRTL ? "الوقت" : "Time"}>
            <p className="text-sm font-semibold tabular-nums text-slate-800 dark:text-white">
              {session?.startTime} – {session?.endTime}
            </p>
          </InfoBlock>
        </div>

        {(session?.meetingLink || session?.recordingLink) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {session?.meetingLink && (
              <InfoBlock icon={Link2} label={isRTL ? "رابط الاجتماع" : "Meeting Link"}>
                <a
                  href={session.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  {session.meetingLink}
                </a>
              </InfoBlock>
            )}
            {session?.recordingLink && (
              <InfoBlock icon={VideoIcon} label={isRTL ? "رابط التسجيل" : "Recording Link"}>
                <a
                  href={session.recordingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  {session.recordingLink}
                </a>
              </InfoBlock>
            )}
          </div>
        )}

        {session?.instructorNotes && (
          <InfoBlock icon={FileText} label={isRTL ? "ملاحظات المدرب" : "Instructor Notes"}>
            <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-200">
              {session.instructorNotes}
            </p>
          </InfoBlock>
        )}

        <div>
          <h3 className="mb-2.5 text-sm font-semibold text-slate-700 dark:text-white">
            {isRTL ? "إحصائيات الحضور" : "Attendance Stats"}
          </h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            <StatCard label={isRTL ? "الإجمالي" : "Total"} value={stats.total} />
            <StatCard label={isRTL ? "حاضر" : "Present"} value={stats.present} meta={STAT_META.present} />
            <StatCard label={isRTL ? "غائب" : "Absent"} value={stats.absent} meta={STAT_META.absent} />
            <StatCard label={isRTL ? "متأخر" : "Late"} value={stats.late} meta={STAT_META.late} />
            <StatCard label={isRTL ? "معتذر" : "Excused"} value={stats.excused} meta={STAT_META.excused} />
          </div>
        </div>
      </div>
    </ModalShell>
  );
}