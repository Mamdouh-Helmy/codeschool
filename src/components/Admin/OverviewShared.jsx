"use client";
// components/Admin/OverviewShared.jsx
// ✅ أدوات مشتركة لصفحة النظرة العامة ومودالات السجل

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, RefreshCw } from "lucide-react";

// ─── Formatters ───────────────────────────────────────────────────────────────
export function formatHM(totalMinutes) {
  const mins = Math.max(0, Math.round(totalMinutes || 0));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}د`;
  if (m === 0) return `${h}س`;
  return `${h}س ${m}د`;
}

export function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export function getInitials(name = "") {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase();
}

export const PACKAGE_LABELS = {
  "3months": "3 أشهر (24 ساعة)",
  "6months": "6 أشهر (48 ساعة)",
  "9months": "9 أشهر (72 ساعة)",
  "12months": "12 شهر (96 ساعة)",
};

// لون رصيد الساعات: خلص / ٥ ساعات أو أقل / كويس
export function balanceTone(remaining) {
  if (remaining <= 0)
    return { bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" };
  if (remaining <= 5)
    return { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" };
  return { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" };
}

// ─── Small UI pieces ──────────────────────────────────────────────────────────
const AVATAR_TONES = [
  "bg-primary/10 text-primary",
  "bg-secondary/10 text-secondary dark:bg-cyan-400/10 dark:text-cyan-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
];

export function Avatar({ name, idx = 0, size = "md" }) {
  const sz = size === "lg" ? "h-12 w-12 text-base" : "h-10 w-10 text-sm";
  return (
    <span
      className={`flex flex-shrink-0 items-center justify-center rounded-xl font-bold ${sz} ${AVATAR_TONES[idx % AVATAR_TONES.length]}`}
    >
      {getInitials(name) || "؟"}
    </span>
  );
}

export function ProgressBar({ pct, tone = "bg-primary", className = "" }) {
  const v = Math.max(0, Math.min(100, pct || 0));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-dark_input ${className}`}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${tone}`}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  tone = "bg-primary/10 text-primary",
  valueCls = "text-slate-900 dark:text-white",
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-dark_border dark:bg-darklight sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500 dark:text-darkmuted">
            {label}
          </p>
          <p className={`mt-1.5 text-3xl font-extrabold tabular-nums ${valueCls}`}>
            {value}
          </p>
          {sub && (
            <p className="mt-1 text-xs text-slate-400 dark:text-darksubtle">{sub}</p>
          )}
        </div>
        {Icon && (
          <span
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${tone}`}
          >
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
    </div>
  );
}

export function Segmented({ value, onChange, options, label }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-darklight"
    >
      {options.map((o) => {
        const active = value === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              active
                ? "bg-white text-secondary shadow-sm dark:bg-dark_input dark:text-primary"
                : "text-slate-500 hover:text-slate-800 dark:text-darkmuted dark:hover:text-white"
            }`}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {o.label}
            {o.count !== undefined && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-darkmuted"
                }`}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Modal shell (portal → يغطي الشاشة كلها) ─────────────────────────────────
export function ModalShell({
  title,
  subtitle,
  avatarName,
  onClose,
  onRefresh,
  refreshing,
  children,
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      dir="rtl"
    >
      <div className="flex max-h-[92vh] w-full max-w-[860px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:border dark:border-dark_border dark:bg-darklight">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-dark_border dark:bg-white/[0.02] sm:px-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <Avatar name={avatarName || title} size="lg" />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-extrabold text-slate-900 dark:text-white">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-darkmuted">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onRefresh && (
              <button
                onClick={onRefresh}
                aria-label="تحديث"
                title="تحديث"
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-primary dark:text-darkmuted dark:hover:bg-white/5"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="إغلاق"
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-darkmuted dark:hover:bg-white/5 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export function ModalSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-28 rounded-2xl bg-slate-100 dark:bg-dark_input" />
      <div className="h-9 w-72 rounded-xl bg-slate-100 dark:bg-dark_input" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-dark_input" />
      ))}
    </div>
  );
}