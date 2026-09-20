// components/Dashboard/ContentHub.tsx
"use client";
import Link from "next/link";
import { Icon } from "@iconify/react";

export type ContentStat = {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: string;
};

export type ContentAction = {
  label: string;
  description: string;
  href: string;
};

const ContentHub = ({
  stats,
  actions,
  locale = "en",
}: {
  stats: ContentStat[];
  actions: ContentAction[];
  locale?: "ar" | "en";
}) => {
  return (
    <section className="relative flex h-full min-h-[400px] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-[#fff8f0] via-white to-white p-4 shadow-sm dark:border-dark_border dark:from-darkmode dark:via-darklight dark:to-darklight">
      <header className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6700]/20 to-[#feaf00]/10 text-[#ff6700]">
          <Icon icon="ion:sparkles-outline" className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-bold text-MidnightNavyText dark:text-white">
            {locale === "ar" ? "مركز المحتوى" : "Content Hub"}
          </h3>
          <p className="text-[10px] text-slate-500 dark:text-darktext">
            {locale === "ar" ? "المقالات والمشاريع" : "Blog & projects"}
          </p>
        </div>
      </header>

      <div className="mt-4 space-y-2.5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition-all hover:shadow-md dark:border-dark_border dark:bg-darkmode"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff6700]/15 to-[#feaf00]/10 text-[#ff6700]">
                <Icon icon={s.icon} className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-darktext">
                  {s.label}
                </p>
                <p className="mt-0.5 text-lg font-bold text-MidnightNavyText dark:text-white">
                  {s.value}
                </p>
              </div>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                s.isPositive
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-red-500/10 text-red-600"
              }`}
            >
              {s.change}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-auto space-y-1.5 pt-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-darktext">
          {locale === "ar" ? "إجراءات سريعة" : "Quick Actions"}
        </p>
        {actions.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="group flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-2 transition-all hover:border-[#ff6700]/40 hover:bg-[#ff6700]/5 dark:border-dark_border dark:bg-darkmode"
          >
            <div className="min-w-0">
              <p className="truncate text-[12px] font-bold text-MidnightNavyText dark:text-white">
                {a.label}
              </p>
              <p className="truncate text-[10px] text-slate-400 dark:text-darktext">
                {a.description}
              </p>
            </div>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ff6700]/10 text-[#ff6700] transition-all group-hover:bg-[#ff6700] group-hover:text-white">
              <Icon icon="ion:arrow-forward" className="h-3 w-3 rtl:rotate-180" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default ContentHub;