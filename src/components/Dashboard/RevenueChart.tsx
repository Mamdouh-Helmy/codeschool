// components/Dashboard/RevenueChart.tsx
"use client";
import { Icon } from "@iconify/react";

type Point = { month: string; collected: number; escrow: number };

const RevenueChart = ({ data, locale = "en" }: { data: Point[]; locale?: "ar" | "en" }) => {
  const W = 100;
  const H = 38;
  const max = Math.max(...data.map((d) => d.collected + d.escrow), 1);

  const buildPath = (key: "collected" | "escrow") =>
    data
      .map((d, i) => {
        const x = (i / Math.max(data.length - 1, 1)) * W;
        const y = H - (d[key] / max) * H;
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

  const buildArea = (key: "collected" | "escrow") =>
    `${buildPath(key)} L ${W} ${H} L 0 ${H} Z`;

  const totalCollected = data.reduce((s, d) => s + d.collected, 0);
  const totalEscrow = data.reduce((s, d) => s + d.escrow, 0);

  return (
    <section className="relative flex h-full min-h-[400px] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-dark_border dark:bg-darklight">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <Icon icon="ion:analytics-outline" className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-MidnightNavyText dark:text-white">
              {locale === "ar" ? "تدفق الإيرادات" : "Revenue Flow"}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-darktext">
              {locale === "ar" ? "آخر 6 شهور" : "Last 6 months"}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1 text-[10px] font-bold">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-slate-500 dark:text-darktext">
              {locale === "ar" ? "محصّل" : "Collected"}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#feaf00]" />
            <span className="text-slate-500 dark:text-darktext">
              {locale === "ar" ? "إسكرو" : "Escrow"}
            </span>
          </span>
        </div>
      </header>

      <div className="relative mt-4 flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-40 w-full overflow-visible">
          <defs>
            <linearGradient id="gradCollected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gradEscrow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#feaf00" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#feaf00" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((p) => (
            <line
              key={p}
              x1="0"
              x2={W}
              y1={H * p}
              y2={H * p}
              stroke="currentColor"
              strokeWidth="0.15"
              className="text-slate-200 dark:text-dark_border"
              strokeDasharray="0.5 0.5"
            />
          ))}

          <path d={buildArea("escrow")} fill="url(#gradEscrow)" />
          <path d={buildPath("escrow")} fill="none" stroke="#feaf00" strokeWidth="0.6" strokeLinecap="round" />

          <path d={buildArea("collected")} fill="url(#gradCollected)" />
          <path d={buildPath("collected")} fill="none" stroke="#10b981" strokeWidth="0.7" strokeLinecap="round" />

          {data.map((d, i) => {
            const x = (i / Math.max(data.length - 1, 1)) * W;
            const y1 = H - (d.collected / max) * H;
            const y2 = H - (d.escrow / max) * H;
            return (
              <g key={i}>
                <circle cx={x} cy={y1} r="0.7" fill="#10b981" />
                <circle cx={x} cy={y2} r="0.7" fill="#feaf00" />
              </g>
            );
          })}
        </svg>

        <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-400 dark:text-darktext">
          {data.map((d) => (
            <span key={d.month}>{d.month}</span>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl bg-emerald-500/5 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
            {locale === "ar" ? "محصّل" : "Collected"}
          </p>
          <p className="mt-1 text-lg font-bold text-MidnightNavyText dark:text-white">
            {totalCollected.toLocaleString()}
            <span className="ms-1 text-[10px] font-medium text-slate-400">EGP</span>
          </p>
        </div>
        <div className="rounded-xl bg-[#feaf00]/10 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#a67c00]">
            {locale === "ar" ? "إسكرو" : "Escrow"}
          </p>
          <p className="mt-1 text-lg font-bold text-MidnightNavyText dark:text-white">
            {totalEscrow.toLocaleString()}
            <span className="ms-1 text-[10px] font-medium text-slate-400">EGP</span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default RevenueChart;