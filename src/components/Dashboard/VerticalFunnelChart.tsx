// components/Dashboard/VerticalFunnelChart.tsx
"use client";
import { Icon } from "@iconify/react";

type Stage = { stage: string; count: number; color: string; amount?: number };

const stageMeta: Record<string, { ar: string; en: string; icon: string }> = {
  pending: { ar: "قيد الانتظار", en: "Pending", icon: "ion:time-outline" },
  escrow: { ar: "في الإسكرو", en: "In Escrow", icon: "ion:lock-closed-outline" },
  suspended: { ar: "موقوف", en: "Suspended", icon: "ion:pause-circle-outline" },
  paid: { ar: "مدفوع", en: "Paid", icon: "ion:checkmark-circle-outline" },
};

const VerticalFunnelChart = ({ data, locale = "en" }: { data: Stage[]; locale?: "ar" | "en" }) => {
  const total = data.reduce((s, d) => s + d.count, 0);
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <section className="relative flex h-full min-h-[400px] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-dark_border dark:bg-darklight">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#004d59] via-[#ff6700] to-[#feaf00]" />

      <header className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#004d59]/10 text-[#004d59] dark:text-[#00a3b8]">
            <Icon icon="ion:git-commit-outline" className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-MidnightNavyText dark:text-white">
              {locale === "ar" ? "خط الفواتير" : "Billing Pipeline"}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-darktext">
              {locale === "ar" ? "مراحل الفواتير عمودياً" : "Vertical invoice flow"}
            </p>
          </div>
        </div>
      </header>

      <div className="relative mt-4 flex-1">
        <div className="absolute bottom-2 left-[19px] top-2 w-0.5 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-100 dark:from-dark_border dark:via-dark_border" />

        <ul className="relative space-y-2.5">
          {data.map((d) => {
            const meta = stageMeta[d.stage] || { ar: d.stage, en: d.stage, icon: "ion:ellipse" };
            const width = Math.max(15, (d.count / maxCount) * 100);

            return (
              <li key={d.stage} className="relative flex items-stretch gap-3">
                <span
                  className="relative z-10 mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-4 border-white shadow-md dark:border-darklight"
                  style={{
                    background: d.color,
                    boxShadow: `0 0 0 3px ${d.color}22, 0 4px 14px ${d.color}40`,
                  }}
                >
                  <Icon icon={meta.icon} className="h-4 w-4 text-white" />
                </span>

                <div className="flex flex-1 items-center gap-3 overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-r from-white to-slate-50/40 px-3 py-2.5 shadow-sm dark:border-dark_border dark:from-darklight dark:to-darkmode">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13px] font-bold text-MidnightNavyText dark:text-white">
                        {locale === "ar" ? meta.ar : meta.en}
                      </p>
                      <span className="text-base font-bold tabular-nums text-MidnightNavyText dark:text-white">
                        {d.count}
                      </span>
                    </div>

                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-darklight">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${width}%`, background: d.color }}
                      />
                    </div>

                    {d.amount !== undefined && d.amount > 0 && (
                      <p className="mt-1 text-[10px] font-semibold text-slate-400 dark:text-darktext">
                        {(d.amount / 1000).toFixed(1)}k EGP{" "}
                        {locale === "ar" ? "معلق" : "outstanding"}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="relative mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2 dark:bg-darkmode">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-darktext">
          {locale === "ar" ? "إجمالي الفواتير" : "Total invoices"}
        </span>
        <span className="text-sm font-bold text-MidnightNavyText dark:text-white">
          {total.toLocaleString()}
        </span>
      </div>
    </section>
  );
};

export default VerticalFunnelChart;