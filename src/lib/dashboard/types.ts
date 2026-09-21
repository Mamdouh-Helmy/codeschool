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

export type ActivityTone = "info" | "success" | "warning";

export type ActivityItem = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  tone: ActivityTone;
};

export type EnrollmentStatus = "active" | "trial" | "pending";

export type EnrollmentRecord = {
  id: string;
  name: string;
  email: string;
  course: string;
  progress: number;
  enrolledOn: string;
  status: EnrollmentStatus;
};

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