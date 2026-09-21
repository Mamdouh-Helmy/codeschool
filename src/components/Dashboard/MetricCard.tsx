// components/Dashboard/MetricCard.tsx
"use client";
import { Icon } from "@iconify/react";
import { METRIC_ACCENTS } from "@/lib/constants/dashboard";

export type MetricTrend = {
  value: string;
  isPositive: boolean;
  description: string;
};

type Props = {
  label: string;
  value: string;
  icon: string;
  trend: MetricTrend;
  sublabel?: string;
  accent?: keyof typeof METRIC_ACCENTS;
};

const MetricCard = ({ label, value, icon, trend, sublabel, accent = "primary" }: Props) => {
  const a = METRIC_ACCENTS[accent];

  return (
    <article className="group relative flex h-full min-h-[140px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-dark_border dark:bg-darklight">
      <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${a.bar}`} />

      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-darktext">
            {label}
          </p>
          <p className="mt-1.5 truncate text-2xl font-bold tracking-tight text-MidnightNavyText dark:text-white">
            {value}
          </p>
          {sublabel && (
            <p className="mt-1 truncate text-[11px] font-medium text-slate-400 dark:text-darktext">
              {sublabel}
            </p>
          )}
        </div>

        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${a.bg} ${a.ring} ${a.text}`}>
          <Icon icon={icon} className="h-5 w-5" />
        </span>
      </header>

      <footer className="mt-auto flex items-center gap-2 pt-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            trend.isPositive
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-red-500/10 text-red-600"
          }`}
        >
          <Icon icon={trend.isPositive ? "ion:trending-up" : "ion:trending-down"} className="h-3 w-3" />
          {trend.value}
        </span>
        <span className="truncate text-[10px] text-slate-400 dark:text-darktext">
          {trend.description}
        </span>
      </footer>
    </article>
  );
};

export default MetricCard;