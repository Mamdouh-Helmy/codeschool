// ActivityFeed.tsx
"use client";
import { Icon } from "@iconify/react";
import { useI18n } from "@/i18n/I18nProvider";

export type ActivityItem = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  tone: "success" | "info" | "warning";
};

type ActivityFeedProps = {
  items: ActivityItem[];
};

const toneStyles: Record<ActivityItem["tone"], string> = {
  success: "bg-emerald-500/10 text-emerald-500",
  info: "bg-primary/10 text-primary",
  warning: "bg-yellow-500/10 text-yellow-600",
};

const ActivityFeed = ({ items }: ActivityFeedProps) => {
  const { t } = useI18n();

  return (
    <section className="h-full rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-dark_border dark:bg-darklight">
      <header>
        <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white">
          {t('dashboard.latestActivity') || 'Latest activity'}
        </h3>
        <p className="text-sm text-slate-500 dark:text-darktext">
          {t('dashboard.activityDescription') || 'Monitor important updates from the community and internal team.'}
        </p>
      </header>
      <div className="mt-4 sm:mt-6 space-y-4 sm:space-y-5">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3 sm:gap-4">
            <span
              className={`flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl ${
                toneStyles[item.tone]
              }`}
            >
              <Icon icon={item.icon} className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
            <div className="flex-1">
              <p className="font-semibold text-MidnightNavyText dark:text-white">
                {item.title}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-darktext">
                {item.description}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-400 dark:text-darktext">
                {item.timestamp}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ActivityFeed;