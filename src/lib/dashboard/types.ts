import type { MetricTrend } from "@/components/Dashboard/MetricCard";
import type { PerformancePoint } from "@/components/Dashboard/PerformanceChart";
import type { ActivityItem } from "@/components/Dashboard/ActivityFeed";
import type { EnrollmentRecord } from "@/components/Dashboard/RecentEnrollmentsTable";
import type { ContentAction, ContentStat } from "@/components/Dashboard/ContentManager";

export type DashboardMetric = {
  label: string;
  value: string;
  icon: string;
  sublabel?: string;
  trend: MetricTrend;
};

export type HealthCard = {
  title: string;
  value: string;
  description: string;
  accent: string;
};

export type DashboardSnapshot = {
  metrics: DashboardMetric[];
  performance: {
    points: PerformancePoint[];
    title: string;
    description: string;
    goalLabel: string;
    goalValue: string;
  };
  activities: ActivityItem[];
  enrollments: EnrollmentRecord[];
  content: {
    stats: ContentStat[];
    actions: ContentAction[];
  };
  health: HealthCard[];
  updatedAt: string;
};

export type ScheduleEvent = {
  id: string;
  day: number;
  month: string;
  year: number;
};

export type ScheduleResponse = {
  events: ScheduleEvent[];
  updatedAt: string;
};
