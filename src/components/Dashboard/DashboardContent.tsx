"use client";

import MetricCard from "@/components/Dashboard/MetricCard";
import PerformanceChart from "@/components/Dashboard/PerformanceChart";
import ActivityFeed from "@/components/Dashboard/ActivityFeed";
import RecentEnrollmentsTable from "@/components/Dashboard/RecentEnrollmentsTable";
import ContentManager from "@/components/Dashboard/ContentManager";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocale } from "@/app/context/LocaleContext";

type DashboardContentProps = {
  dashboardData: any;
};

const DashboardContent = ({ dashboardData }: DashboardContentProps) => {
  const { t } = useI18n();
  const { locale, formatNumber } = useLocale();

  // تحويل أيام الأسبوع إلى اللغة الحالية
  const localizedPerformanceData = dashboardData.performance.map((point: any, index: number) => {
    const days = locale === 'ar' 
      ? ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    return {
      ...point,
      label: days[index] || point.label
    };
  });

  const metricsData = [
    {
      label: t('dashboard.totalStudents'),
      value: formatNumber(dashboardData.stats.totalStudents),
      icon: "ion:people-outline",
      trend: {
        value: "+12%",
        isPositive: true,
        description: t('dashboard.vsLastMonth'),
      },
    },
    {
      label: t('dashboard.activeSubscriptions'),
      value: formatNumber(dashboardData.stats.activeSubscriptions),
      icon: "ion:card-outline",
      trend: {
        value: "+5%",
        isPositive: true,
        description: t('dashboard.vsLastMonth'),
      },
    },
    {
      label: t('dashboard.monthlyRevenue'),
      value: `$${formatNumber(dashboardData.stats.monthlyRevenue)}`,
      icon: "ion:cash-outline",
      trend: {
        value: "+18%",
        isPositive: true,
        description: t('dashboard.vsLastMonth'),
      },
    },
    {
      label: t('dashboard.courseCompletion'),
      value: `${dashboardData.stats.courseCompletion}%`,
      icon: "ion:trophy-outline",
      trend: {
        value: "+8%",
        isPositive: true,
        description: t('dashboard.vsLastMonth'),
      },
    },
  ];

  const performanceProps = {
    title: t('dashboard.studentEngagement'),
    description: t('dashboard.weeklyProgress'),
    data: localizedPerformanceData,
    goalLabel: t('dashboard.weeklyTarget'),
    goalValue: t('dashboard.completionGoal'),
  };

  return (
    <div className="space-y-6 min-w-0">
      <header className="space-y-2 min-w-0">
        <h1 className="text-3xl font-bold text-MidnightNavyText dark:text-white">
          {t('dashboard.adminDashboard')}
        </h1>
        <p className="text-slate-600 dark:text-darktext">
          {t('dashboard.welcomeMessage')}
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 min-w-0">
        {metricsData.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3 min-w-0">
        <div className="xl:col-span-2 min-w-0">
          <PerformanceChart {...performanceProps} />
        </div>
        <ActivityFeed items={dashboardData.activities} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3 min-w-0">
        <div className="xl:col-span-2 min-w-0">
          <RecentEnrollmentsTable records={dashboardData.enrollments} />
        </div>
        <ContentManager {...dashboardData.content} />
      </section>
    </div>
  );
};

export default DashboardContent;