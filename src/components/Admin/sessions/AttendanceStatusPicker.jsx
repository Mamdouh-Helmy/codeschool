"use client";
import React from "react";

const OPTIONS = [
  {
    value: "present",
    ar: "حاضر",
    en: "Present",
    dot: "bg-emerald-500",
    active: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30",
  },
  {
    value: "absent",
    ar: "غائب",
    en: "Absent",
    dot: "bg-rose-500",
    active: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30",
  },
  {
    value: "late",
    ar: "متأخر",
    en: "Late",
    dot: "bg-amber-500",
    active: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30",
  },
  {
    value: "excused",
    ar: "معتذر",
    en: "Excused",
    dot: "bg-sky-500",
    active: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30",
  },
];

export default function AttendanceStatusPicker({ value, onChange, disabled = false, isRTL = false }) {
  return (
    <div
      role="radiogroup"
      aria-label={isRTL ? "حالة الحضور" : "Attendance status"}
      className={`flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-white/10 dark:bg-white/5 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      {OPTIONS.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => !disabled && onChange(opt.value)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              disabled ? "cursor-not-allowed" : ""
            } ${
              isActive
                ? `${opt.active} shadow-sm ring-1`
                : "text-slate-500 hover:bg-white/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? opt.dot : "bg-slate-300 dark:bg-slate-600"}`} />
            {isRTL ? opt.ar : opt.en}
          </button>
        );
      })}
    </div>
  );
}