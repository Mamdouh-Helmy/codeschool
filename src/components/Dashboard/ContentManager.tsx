"use client";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { useI18n } from "@/i18n/I18nProvider";

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

type ContentManagerProps = {
  stats: ContentStat[];
  actions: ContentAction[];
};

const ContentManager = ({ stats, actions }: ContentManagerProps) => {
  const { t } = useI18n();

  return (
    <section className="flex h-full flex-col gap-4 sm:gap-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-dark_border dark:bg-darklight">
      <header>
        <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white">
          {t('dashboard.contentPerformance')}
        </h3>
        <p className="text-sm text-slate-500 dark:text-darktext">
          {t('dashboard.contentDescription')}
        </p>
      </header>
      <div className="grid gap-3 sm:gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 sm:px-4 py-3 dark:border-dark_border dark:bg-darkmode">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon icon={stat.icon} className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-SlateBlueText dark:text-darktext">{stat.label}</p>
                <p className="text-lg font-semibold text-MidnightNavyText dark:text-white">{stat.value}</p>
              </div>
            </div>
            <span
              className={`text-sm font-semibold ${
                stat.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600"
              }`}
            >
              {stat.change}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-auto space-y-3">
        <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-darktext">
          {t('dashboard.quickActions')}
        </p>
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 sm:px-4 py-3 text-sm font-medium text-primary transition hover:bg-primary/10 dark:border-dark_border dark:bg-darkmode"
          >
            <span>{action.label}</span>
            <span className="flex items-center gap-2 text-xs text-slate-500 dark:text-darktext">
              {action.description}
              <Icon icon="ion:arrow-forward" className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default ContentManager;