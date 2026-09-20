// components/Dashboard/WeeklyEngagement.tsx
"use client";
import { Icon } from "@iconify/react";

export type PerformancePoint = { label: string; value: number };

type Props = {
  data: PerformancePoint[];
  locale?: "ar" | "en";
};

const WeeklyEngagement = ({ data, locale = "en" }: Props) => {
  const avg =
    data.length > 0
      ? Math.round(data.reduce((s, p) => s + p.value, 0) / data.length)
      : 0;
  const peak = data.length > 0 ? Math.max(...data.map((p) => p.value)) : 0;
  const peakDay = data.find((p) => p.value === peak)?.label || "—";

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (avg / 100) * circumference;

  return (
    <section className="relative flex h-full min-h-[400px] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-dark_border dark:bg-darklight">
      <header className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff6700]/10 text-[#ff6700]">
          <Icon icon="ion:stats-chart-outline" className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-bold text-MidnightNavyText dark:text-white">
            {locale === "ar" ? "تفاعل الأسبوع" : "Weekly Engagement"}
          </h3>
          <p className="text-[10px] text-slate-500 dark:text-darktext">
            {locale === "ar" ? "متوسط إشغال الجروبات" : "Avg group capacity"}
          </p>
        </div>
      </header>

      <div className="mt-4 flex items-center gap-4">
        <div className="relative shrink-0">
          <svg width="110" height="110" className="-rotate-90">
            <circle
              cx="55"
              cy="55"
              r={radius}
              fill="none"
              strokeWidth="10"
              className="stroke-slate-100 dark:stroke-darkmode"
            />
            <circle
              cx="55"
              cy="55"
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
                <stop offset="0%" stopColor="#004d59" />
                <stop offset="50%" stopColor="#ff6700" />
                <stop offset="100%" stopColor="#feaf00" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold leading-none text-MidnightNavyText dark:text-white">
              {avg}%
            </span>
            <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-darktext">
              {locale === "ar" ? "متوسط" : "AVG"}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-darkmode">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-darktext">
              {locale === "ar" ? "أعلى يوم" : "Peak Day"}
            </p>
            <p className="mt-0.5 text-[13px] font-bold text-MidnightNavyText dark:text-white">
              {peakDay} · {peak}%
            </p>
          </div>
          <div className="rounded-xl bg-emerald-500/5 p-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              {locale === "ar" ? "الحالة" : "Status"}
            </p>
            <p className="mt-0.5 text-[13px] font-bold text-MidnightNavyText dark:text-white">
              {avg >= 70
                ? locale === "ar" ? "ممتاز" : "Excellent"
                : avg >= 50
                  ? locale === "ar" ? "جيد" : "Good"
                  : locale === "ar" ? "بحاجة تحسين" : "Needs work"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        {data.map((p) => {
          const intensity = p.value / 100;
          return (
            <div key={p.label} className="flex items-center gap-2.5">
              <span className="w-10 shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-darktext">
                {p.label}
              </span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-darkmode">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${p.value}%`,
                    background: `linear-gradient(90deg, #004d59 ${intensity * 100}%, #ff6700 100%)`,
                  }}
                />
              </div>
              <span className="w-9 shrink-0 text-end text-[10px] font-bold tabular-nums text-MidnightNavyText dark:text-white">
                {p.value}%
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default WeeklyEngagement;