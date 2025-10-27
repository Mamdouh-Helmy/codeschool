"use client";

import { Icon } from "@iconify/react";
import { useI18n } from "@/i18n/I18nProvider";

export type PerformancePoint = {
  label: string;
  value: number;
};

type PerformanceChartProps = {
  title: string;
  description: string;
  data: PerformancePoint[];
  goalLabel: string;
  goalValue: string;
};

const PerformanceChart = ({ title, description, data, goalLabel, goalValue }: PerformanceChartProps) => {
  const { t } = useI18n();

  const safeData = data || [];
  const maxValue = safeData.length > 0 ? Math.max(...safeData.map((point) => point.value)) : 0;

  const averageEngagement = safeData.length > 0 
    ? Math.round(safeData.reduce((sum, point) => sum + point.value, 0) / safeData.length)
    : 0;

  return (
    <section className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-dark_border dark:bg-darklight">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-darktext">{description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              <Icon icon="ion:trending-up" className="h-3 w-3" />
              {t('dashboard.realData')}
            </span>
            <span className="text-xs text-slate-500">
              {t('dashboard.avgEngagement')} {averageEngagement}% {t('dashboard.engagement')}
            </span>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Icon icon="ion:bar-chart" className="h-4 w-4" />
          {t('dashboard.liveMetrics')}
        </span>
      </header>
      
      <div className="mt-4 sm:mt-6 flex-1">
        <div className="flex items-end gap-2 sm:gap-4 rounded-2xl border border-dashed border-slate-200 bg-gradient-to-t from-slate-50 to-white p-4 sm:p-6 dark:border-dark_border dark:from-darkmode dark:to-darklight">
          {safeData.length > 0 ? (
            safeData.map((point) => {
              const height = maxValue === 0 ? 0 : Math.round((point.value / maxValue) * 100);
              return (
                <div key={point.label} className="flex w-full flex-col items-center gap-2 sm:gap-3">
                  <div className="flex h-24 sm:h-36 w-full items-end rounded-full bg-slate-200/60 p-1 dark:bg-darkmode">
                    <div
                      className="w-full rounded-full bg-gradient-to-t from-primary via-ElectricAqua to-Aquamarine transition-all duration-500 ease-in-out"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-MidnightNavyText dark:text-white">{point.value}%</p>
                    <p className="text-xs text-slate-500 dark:text-darktext">{point.label}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex h-24 sm:h-36 w-full items-center justify-center">
              <p className="text-slate-500 dark:text-darktext">{t('dashboard.loadingData')}</p>
            </div>
          )}
        </div>
      </div>
      
      <footer className="mt-4 sm:mt-6 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-dark_border dark:bg-darkmode">
          <span className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon icon="ion:checkmark-done-circle" className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-darktext">{goalLabel}</p>
            <p className="text-sm font-semibold text-MidnightNavyText dark:text-white">{goalValue}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-dark_border dark:bg-darkmode">
          <span className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <Icon icon="ion:stats-chart" className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-darktext">
              {t('dashboard.weeklyAverage')}
            </p>
            <p className="text-sm font-semibold text-MidnightNavyText dark:text-white">
              {averageEngagement}% {t('dashboard.engagement')}
            </p>
          </div>
        </div>
      </footer>
    </section>
  );
};

export default PerformanceChart;