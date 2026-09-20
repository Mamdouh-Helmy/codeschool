// components/Dashboard/LinearFunnelChart.tsx
"use client";
import { Icon } from "@iconify/react";

type Level = { level: string; count: number; color: string };

const levelMeta: Record<string, { ar: string; en: string; range: string; icon: string }> = {
  zero: { ar: "صفر", en: "Zero", range: "0h", icon: "ion:battery-dead-outline" },
  critical: { ar: "حرج", en: "Critical", range: "≤5h", icon: "ion:battery-half-outline" },
  low: { ar: "منخفض", en: "Low", range: "5–15h", icon: "ion:battery-charging-outline" },
  good: { ar: "جيد", en: "Good", range: ">15h", icon: "ion:battery-full-outline" },
};

const LinearFunnelChart = ({ data, locale = "en" }: { data: Level[]; locale?: "ar" | "en" }) => {
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <section className="relative flex h-full min-h-[400px] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-dark_border dark:bg-darklight">
      <header className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#feaf00]/15 text-[#feaf00]">
            <Icon icon="ion:battery-charging-outline" className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-MidnightNavyText dark:text-white">
              {locale === "ar" ? "صحة الرصيد" : "Credit Health"}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-darktext">
              {locale === "ar" ? "توزيع خطي لساعات الرصيد" : "Linear remaining hours"}
            </p>
          </div>
        </div>
      </header>

      <div className="mt-4">
        <div className="flex h-10 w-full overflow-hidden rounded-xl border border-slate-100 shadow-inner dark:border-dark_border">
          {data.map((d) => {
            const pct = total > 0 ? (d.count / total) * 100 : 0;
            return (
              <div
                key={d.level}
                className="relative flex items-center justify-center transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(135deg, ${d.color} 0%, ${d.color}dd 100%)`,
                }}
              >
                {pct > 15 && (
                  <span className="text-[10px] font-bold text-white drop-shadow">
                    {Math.round(pct)}%
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-1.5 flex justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-darktext">
          <span>0h</span>
          <span>5h</span>
          <span>15h</span>
          <span>∞</span>
        </div>
      </div>

      <ul className="mt-4 flex-1 space-y-2">
        {data.map((d) => {
          const meta = levelMeta[d.level] || { ar: d.level, en: d.level, range: "", icon: "ion:ellipse" };
          const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;

          return (
            <li
              key={d.level}
              className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-slate-100 bg-white px-3 py-2 transition-all hover:shadow-sm dark:border-dark_border dark:bg-darkmode"
            >
              <span className="absolute inset-y-0 start-0 w-1" style={{ background: d.color }} />

              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ background: `${d.color}18`, color: d.color }}
              >
                <Icon icon={meta.icon} className="h-4 w-4" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[13px] font-bold text-MidnightNavyText dark:text-white">
                    {locale === "ar" ? meta.ar : meta.en}
                  </p>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-darktext">
                    {meta.range}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-darklight">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: d.color }}
                    />
                  </div>
                  <span className="min-w-[24px] text-end text-[12px] font-bold text-MidnightNavyText dark:text-white">
                    {d.count}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-200 pt-2.5 dark:border-dark_border">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-darktext">
          {locale === "ar" ? "إجمالي الطلاب" : "Total tracked"}
        </span>
        <span className="text-sm font-bold text-MidnightNavyText dark:text-white">
          {total.toLocaleString()}
        </span>
      </div>
    </section>
  );
};

export default LinearFunnelChart;