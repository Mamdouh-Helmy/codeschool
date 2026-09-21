import type { MetricTrend } from "@/components/Dashboard/MetricCard";
import type { PerformancePoint } from "@/components/Dashboard/PerformanceChart";

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