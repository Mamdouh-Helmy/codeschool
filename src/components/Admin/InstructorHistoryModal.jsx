"use client";
// components/Admin/InstructorHistoryModal.jsx
// ✅ مودال السجل الكامل للمدرس + فلترة بالشهر

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Clock, BookOpen, Users, CheckCircle } from "lucide-react";
import {
  ModalShell,
  ModalSkeleton,
  StatTile,
  formatDate,
  formatHM,
} from "./OverviewShared";

const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

function formatMonthLabel(monthKey) {
  if (!monthKey) return "";
  const [year, month] = monthKey.split("-");
  return `${ARABIC_MONTHS[parseInt(month, 10) - 1]} ${year}`;
}

const ROW_GRID =
  "sm:grid sm:grid-cols-[minmax(0,1.6fr)_56px_56px_72px_110px] sm:items-center sm:gap-4";

export default function InstructorHistoryModal({ instructorId, instructorName, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("");

  const loadData = async (month = "") => {
    setLoading(true);
    try {
      const url = month
        ? `/api/overview/instructor/${instructorId}?month=${month}`
        : `/api/overview/instructor/${instructorId}`;
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        toast.error(json.message || "فشل في تحميل السجل");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطأ في الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (instructorId) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instructorId]);

  const handleMonthChange = (month) => {
    setSelectedMonth(month);
    loadData(month);
  };

  const monthData = selectedMonth
    ? data?.monthsSummary.find((m) => m.monthKey === selectedMonth)
    : null;

  return (
    <ModalShell
      title={instructorName}
      avatarName={instructorName}
      subtitle={data?.jobTitle ? `السجل الكامل · ${data.jobTitle}` : "السجل الكامل للمدرس"}
      onClose={onClose}
      onRefresh={() => loadData(selectedMonth)}
      refreshing={loading && !!data}
    >
      {loading && !data ? (
        <ModalSkeleton />
      ) : !data ? (
        <p className="py-16 text-center text-sm text-slate-500 dark:text-darkmuted">
          مقدرناش نحمّل بيانات المدرس.
        </p>
      ) : (
        <div className={`space-y-6 transition-opacity ${loading ? "opacity-60" : ""}`}>
          {/* ── Totals ── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile label="إجمالي الساعات" value={formatHM(data.totalMinutes)} icon={Clock} />
            <StatTile
              label="إجمالي الجلسات"
              value={data.totalSessions}
              icon={CheckCircle}
              tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
            />
            <StatTile
              label="المجموعات"
              value={data.totalGroups}
              icon={Users}
              tone="bg-secondary/10 text-secondary dark:bg-cyan-400/10 dark:text-cyan-300"
            />
          </div>

          {/* ── Month filter ── */}
          <div>
            <p className="mb-2 text-xs font-bold text-slate-500 dark:text-darkmuted">
              اعرض جلسات شهر معيّن
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => handleMonthChange("")}
                className={`flex-shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  selectedMonth === ""
                    ? "border-primary bg-primary text-white"
                    : "border-slate-200 text-slate-600 hover:border-primary/50 dark:border-dark_border dark:text-darkmuted"
                }`}
              >
                كل الشهور
              </button>
              {data.monthsSummary.map((m) => (
                <button
                  key={m.monthKey}
                  onClick={() => handleMonthChange(m.monthKey)}
                  className={`flex-shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
                    selectedMonth === m.monthKey
                      ? "border-primary bg-primary text-white"
                      : "border-slate-200 text-slate-600 hover:border-primary/50 dark:border-dark_border dark:text-darkmuted"
                  }`}
                >
                  {formatMonthLabel(m.monthKey)} · {m.sessionsCount}
                </button>
              ))}
            </div>
          </div>

          {monthData && (
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {formatMonthLabel(selectedMonth)}: {monthData.sessionsCount} جلسة · {formatHM(monthData.totalMinutes)}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-darkmuted">
                المجموعات: {monthData.groups.join("، ")}
              </p>
            </div>
          )}

          {/* ── Sessions ── */}
          <div>
            <p className="mb-2 text-sm font-bold text-slate-900 dark:text-white">
              الجلسات ({data.sessions.length})
            </p>

            {data.sessions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400 dark:border-dark_border">
                مفيش جلسات في الفترة دي
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-dark_border">
                <div
                  className={`hidden border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 dark:border-dark_border dark:bg-white/[0.02] dark:text-darkmuted ${ROW_GRID}`}
                >
                  <span>الجلسة</span>
                  <span>حضور</span>
                  <span>غياب</span>
                  <span>المدة</span>
                  <span>التاريخ</span>
                </div>
                <ul className="divide-y divide-slate-100 dark:divide-dark_border">
                  {data.sessions.map((s) => (
                    <li
                      key={s.sessionId}
                      className={`flex flex-col gap-2 px-4 py-3 ${ROW_GRID}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <BookOpen className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {s.title}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-darkmuted">
                            {s.groupName} · {s.courseName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs sm:contents">
                        <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                          <span className="me-1 font-medium text-slate-400 sm:hidden">حضور</span>
                          {s.presentCount}
                        </span>
                        <span className="font-bold tabular-nums text-rose-600 dark:text-rose-400">
                          <span className="me-1 font-medium text-slate-400 sm:hidden">غياب</span>
                          {s.absentCount}
                        </span>
                        <span className="font-bold tabular-nums text-primary">
                          {formatHM(s.durationMinutes)}
                        </span>
                        <span className="text-slate-500 dark:text-darkmuted">
                          {formatDate(s.date)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </ModalShell>
  );
}