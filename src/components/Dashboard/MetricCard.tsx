import { Icon } from "@iconify/react";

export type MetricTrend = {
  value: string;
  isPositive: boolean;
  description: string;
};

type MetricCardProps = {
  label: string;
  value: string;
  icon: string;
  trend: MetricTrend;
  sublabel?: string;
};

const MetricCard = ({ label, value, icon, trend, sublabel }: MetricCardProps) => {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-dark_border dark:bg-darklight">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-SlateBlueText dark:text-darktext">{label}</p>
          <p className="mt-2 text-2xl sm:text-3xl font-semibold text-MidnightNavyText dark:text-white">{value}</p>
          {sublabel ? (
            <p className="mt-1 text-sm text-slate-400 dark:text-darktext">{sublabel}</p>
          ) : null}
        </div>
        <span className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon icon={icon} className="h-5 w-5 sm:h-6 sm:w-6" />
        </span>
      </div>
      <div className="mt-4 sm:mt-5 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-darkmode dark:text-white">
        <span
          className={`inline-flex items-center gap-1 font-semibold ${
            trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600"
          }`}
        >
          <Icon
            icon={trend.isPositive ? "ion:arrow-up" : "ion:arrow-down"}
            className="h-4 w-4"
          />
          {trend.value}
        </span>
        <span className="text-xs font-normal text-slate-500 dark:text-darktext">
          {trend.description}
        </span>
      </div>
    </article>
  );
};

export default MetricCard;