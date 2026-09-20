// components/Dashboard/DashboardContent.tsx
"use client";

import { useMemo } from "react";
import MetricCard from "@/components/Dashboard/MetricCard";
import WeeklyEngagement from "@/components/Dashboard/WeeklyEngagement";
import ActivityTimeline from "@/components/Dashboard/ActivityTimeline";
import RecentStudents from "@/components/Dashboard/RecentStudents";
import ContentHub from "@/components/Dashboard/ContentHub";
import RadialFunnelChart from "@/components/Dashboard/RadialFunnelChart";
import VerticalFunnelChart from "@/components/Dashboard/VerticalFunnelChart";
import LinearFunnelChart from "@/components/Dashboard/LinearFunnelChart";
import RevenueChart from "@/components/Dashboard/RevenueChart";
import WelcomeHeader from "@/components/Dashboard/WelcomeHeader";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocale } from "@/app/context/LocaleContext";
import type { DashboardData } from "@/lib/api/dashboard";

type Props = {
  dashboardData: DashboardData;
  user?: { name?: string; role?: string; image?: string | null } | null;
};

const DashboardContent = ({ dashboardData, user }: Props) => {
  const { t } = useI18n();
  const { locale, formatNumber } = useLocale();
  const typedLocale = (locale || "en") as "ar" | "en";

  const safeUser = {
    name: user?.name || "Admin",
    role: user?.role || "admin",
    image: user?.image ?? null,
  };

  const performanceData = useMemo(() => {
    const days = typedLocale === "ar"
      ? ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return (dashboardData.performance || []).map((p, i) => ({
      ...p,
      label: days[i] || p.label,
    }));
  }, [dashboardData.performance, typedLocale]);

  const metrics = useMemo(
    () => [
      {
        label: t("dashboard.totalStudents"),
        value: formatNumber(dashboardData.stats.totalStudents || 0),
        icon: "ion:people-outline",
        trend: {
          value: "+12%",
          isPositive: true,
          description: t("dashboard.vsLastMonth"),
        },
        sublabel: `${dashboardData.stats.totalInstructors || 0} ${t("dashboard.instructors")} · ${dashboardData.stats.totalGroups || 0} ${t("dashboard.groups")}`,
        accent: "primary" as const,
      },
      {
        label: t("dashboard.activeSubscriptions"),
        value: formatNumber(dashboardData.stats.activeSubscriptions || 0),
        icon: "ion:card-outline",
        trend: {
          value: "+5%",
          isPositive: true,
          description: t("dashboard.vsLastMonth"),
        },
        sublabel: `${dashboardData.stats.pendingInvoices || 0} ${t("dashboard.pendingInvoices")}`,
        accent: "secondary" as const,
      },
      {
        label: t("dashboard.monthlyRevenue"),
        value: `EGP ${formatNumber(dashboardData.stats.monthlyRevenue || 0)}`,
        icon: "ion:cash-outline",
        trend: {
          value: `${(dashboardData.stats.revenueTrendPct || 0) > 0 ? "+" : ""}${dashboardData.stats.revenueTrendPct || 0}%`,
          isPositive: (dashboardData.stats.revenueTrendPct || 0) >= 0,
          description: t("dashboard.vsLastMonth"),
        },
        sublabel: `EGP ${formatNumber(dashboardData.stats.escrowAmount || 0)} ${t("dashboard.inEscrow")}`,
        accent: "emerald" as const,
      },
      {
        label: t("dashboard.courseCompletion"),
        value: `${dashboardData.stats.courseCompletion || 0}%`,
        icon: "ion:trophy-outline",
        trend: {
          value: "+8%",
          isPositive: true,
          description: t("dashboard.vsLastMonth"),
        },
        sublabel: `${dashboardData.stats.overdueInvoices || 0} ${t("dashboard.overdueInvoices")}`,
        accent: "amber" as const,
      },
    ],
    [dashboardData.stats, t, formatNumber]
  );

  const flows = dashboardData.flows;

  return (
    <div className="min-w-0 space-y-3">
      <WelcomeHeader
        userName={safeUser.name}
        userRole={safeUser.role}
        userImage={safeUser.image}
        stats={{
          totalStudents: dashboardData.stats.totalStudents || 0,
          activeGroups: dashboardData.stats.activeGroups || dashboardData.stats.totalGroups || 0,
          overdueInvoices: dashboardData.stats.overdueInvoices || 0,
          monthlyRevenue: dashboardData.stats.monthlyRevenue || 0,
        }}
        locale={typedLocale}
      />

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <RadialFunnelChart data={flows.studentLifecycle} locale={typedLocale} />
        <VerticalFunnelChart data={flows.billingFunnel} locale={typedLocale} />
        <LinearFunnelChart data={flows.creditHealth} locale={typedLocale} />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <RevenueChart data={dashboardData.revenueTrend} locale={typedLocale} />
        </div>
        <ActivityTimeline items={dashboardData.activities} locale={typedLocale} />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <WeeklyEngagement data={performanceData} locale={typedLocale} />
        </div>
        <ContentHub
          stats={dashboardData.content.stats}
          actions={dashboardData.content.actions}
          locale={typedLocale}
        />
      </section>

      <section>
        <RecentStudents records={dashboardData.enrollments} locale={typedLocale} />
      </section>
    </div>
  );
};

export default DashboardContent;