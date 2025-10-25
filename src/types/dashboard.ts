export type MetricTrend = {
  value: string;
  isPositive: boolean;
  description: string;
};

export type PerformancePoint = {
  label: string;
  value: number;
};

export type ActivityItem = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  tone: "success" | "info" | "warning";
};

export type EnrollmentStatus = "active" | "pending" | "trial";

export type EnrollmentRecord = {
  id: string; // ✅ إضافة ID إجباري
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