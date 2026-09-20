// components/Dashboard/RadialFunnelChart.tsx
"use client";
import { Icon } from "@iconify/react";

type Stage = { stage: string; count: number; color: string };

const stageMeta: Record<string, { ar: string; en: string; icon: string }> = {
  enrolled: { ar: "مسجل", en: "Enrolled", icon: "ion:person-add-outline" },
  assigned_to_group: { ar: "في مجموعة", en: "In Group", icon: "ion:people-outline" },
  has_active_package: { ar: "باقة نشطة", en: "Active", icon: "ion:card-outline" },
  attended_session: { ar: "حضر سيشن", en: "Attended", icon: "ion:checkmark-done-outline" },
};

const RadialFunnelChart = ({ data, locale = "en" }: { data: Stage[]; locale?: "ar" | "en" }) => {
  const total = data.reduce((s, d) => s + d.count, 0);

  let acc = 0;
  const segments = data.map((d) => {
    const pct = total > 0 ? (d.count / total) * 100 : 0;
    const from = acc;
    acc += pct;
    return { ...d, from, to: acc, pct };
  });

  const gradient =
    total > 0
      ? segments.map((s) => `${s.color} ${s.from}% ${s.to}%`).join(", ")
      : "#e5e7eb 0% 100%";

  return (
    <section className="relative flex h-full min-h-[400px] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-dark_border dark:bg-darklight">
      <header className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff6700]/10 text-[#ff6700]">
            <Icon icon="ion:radio-button-on-outline" className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-MidnightNavyText dark:text-white">
              {locale === "ar" ? "دورة حياة الطالب" : "Student Lifecycle"}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-darktext">
              {locale === "ar" ? "توزيع دائري للمراحل" : "Radial funnel distribution"}
            </p>
          </div>
        </div>
      </header>

      <div className="relative mt-4 flex flex-1 items-center justify-center">
        <div className="relative">
          <div
            className="h-44 w-44 rounded-full transition-all duration-1000"
            style={{
              background: `conic-gradient(${gradient})`,
              boxShadow: "0 12px 40px -12px rgba(255,103,0,0.35)",
            }}
          />
          <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-white shadow-inner dark:bg-darklight">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-darktext">
              {locale === "ar" ? "الإجمالي" : "TOTAL"}
            </span>
            <span className="mt-0.5 text-3xl font-bold leading-none text-MidnightNavyText dark:text-white">
              {total}
            </span>
            <span className="text-[9px] text-slate-400 dark:text-darktext">
              {locale === "ar" ? "طالب" : "students"}
            </span>
          </div>
        </div>

        {segments.map((s, i) => {
          if (s.pct < 5) return null;
          const mid = (s.from + s.to) / 2;
          const angle = (mid / 100) * 360 - 90;
          const rad = (angle * Math.PI) / 180;
          const r = 47;
          const x = 50 + Math.cos(rad) * r;
          const y = 50 + Math.sin(rad) * r;

          return (
            <div
              key={i}
              className="pointer-events-none absolute text-[11px] font-bold text-white drop-shadow-md"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {Math.round(s.pct)}%
            </div>
          );
        })}
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-1.5">
        {data.map((d) => {
          const meta = stageMeta[d.stage] || { ar: d.stage, en: d.stage, icon: "ion:ellipse" };
          return (
            <li
              key={d.stage}
              className="flex items-center justify-between gap-1.5 rounded-lg border border-slate-100 bg-slate-50/60 px-2 py-1.5 dark:border-dark_border dark:bg-darkmode"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color }} />
                <span className="truncate text-[10px] font-semibold text-slate-600 dark:text-darktext">
                  {locale === "ar" ? meta.ar : meta.en}
                </span>
              </div>
              <span className="text-[11px] font-bold text-MidnightNavyText dark:text-white">
                {d.count}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default RadialFunnelChart;