"use client";
import { Icon } from "@iconify/react";

export type PerformancePoint = { label: string; value: number };

type Props = {
  title: string;
  description: string;
  data: PerformancePoint[];
  goalLabel: string;
  goalValue: string;
};

const PerformanceChart = ({ title, description, data, goalLabel, goalValue }: Props) => {
  const avg =
    data.length > 0
      ? Math.round(data.reduce((s, p) => s + p.value, 0) / data.length)
      : 0;
  const peak = data.length > 0 ? Math.max(...data.map((p) => p.value)) : 0;
  const peakDay = data.find((p) => p.value === peak)?.label || "—";

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (avg / 100) * circumference;

  return (
    <section className="relative flex h-full min-h-[420px] w-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-dark_border dark:bg-darklight">
      <header className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
              <Icon icon="ion:stats-chart-outline" className="h-4 w-4" />
            </span>
            <h3 className="text-base font-bold text-MidnightNavyText dark:text-white">
              {title}
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-darktext">
            {description}
          </p>
        </div>
      </header>

      <div className="mt-6 flex flex-1 items-center gap-6">
        {/* Circular Progress */}
        <div className="relative shrink-0">
          <svg width="130" height="130" className="-rotate-90">
            <circle
              cx="65"
              cy="65"
              r={radius}
              fill="none"
              strokeWidth="10"
              className="stroke-slate-100 dark:stroke-darkmode"
            />
            <circle
              cx="65"
              cy="65"
              r={radius}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              stroke="url(#perfGrad)"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="perfGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-MidnightNavyText dark:text-white">
              {avg}%
            </span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-darktext">
              avg
            </span>
          </div>
        </div>

        {/* Right summary */}
        <div className="flex-1 space-y-3">
          <div className="rounded-2xl bg-slate-50 p-3 dark:bg-darkmode">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-darktext">
              {goalLabel}
            </p>
            <p className="mt-1 text-sm font-bold text-MidnightNavyText dark:text-white">
              {goalValue}
            </p>
          </div>
          <div className="rounded-2xl bg-emerald-500/5 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
              Peak Day
            </p>
            <p className="mt-1 text-sm font-bold text-MidnightNavyText dark:text-white">
              {peakDay} · {peak}%
            </p>
          </div>
        </div>
      </div>

      {/* Weekday heat rows */}
      <div className="mt-6 space-y-2">
        {data.map((p) => {
          const intensity = p.value / 100;
          return (
            <div key={p.label} className="flex items-center gap-3">
              <span className="w-10 text-[10px] font-bold uppercase text-slate-500 dark:text-darktext">
                {p.label}
              </span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-darkmode">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${p.value}%`,
                    background: `linear-gradient(90deg, #8b5cf6 ${intensity * 100}%, #06b6d4 100%)`,
                  }}
                />
              </div>
              <span className="w-8 text-right text-[10px] font-bold text-MidnightNavyText dark:text-white">
                {p.value}%
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default PerformanceChart;