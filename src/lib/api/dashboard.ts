// lib/api/dashboard.ts
export interface DashboardStats {
  totalStudents: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  courseCompletion: number;
  totalProjects: number;
  totalBlogs: number;
  totalGroups: number;
  activeGroups: number;
  totalInstructors: number;
  pendingInvoices: number;
  overdueInvoices: number;
  escrowAmount: number;
  revenueTrendPct: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
  color: string;
  amount?: number;
}

export interface CreditLevel {
  level: string;
  count: number;
  color: string;
}

export interface RevenuePoint {
  month: string;
  collected: number;
  escrow: number;
}

export interface DashboardActivity {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  tone: "success" | "info" | "warning" | "error";
}

export interface DashboardEnrollment {
  id: string;
  name: string;
  email: string;
  course: string;
  progress: number;
  enrolledOn: string;
  status: "active" | "pending" | "trial";
}

export interface ContentStat {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: string;
}

export interface ContentAction {
  label: string;
  description: string;
  href: string;
}

export interface DashboardData {
  stats: DashboardStats;
  enrollments: DashboardEnrollment[];
  activities: DashboardActivity[];
  performance: { label: string; value: number }[];
  content: { stats: ContentStat[]; actions: ContentAction[] };
  flows: {
    studentLifecycle: FunnelStage[];
    billingFunnel: FunnelStage[];
    creditHealth: CreditLevel[];
  };
  revenueTrend: RevenuePoint[];
}

const API_BASE = process.env.NEXTAUTH_URL || "http://localhost:3000";

export async function getDashboardData(locale: "ar" | "en" = "en"): Promise<DashboardData> {
  const res = await fetch(`${API_BASE}/api/dashboard`, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": locale,
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.success || !json.data) throw new Error(json.message || "Failed");

  return normalize(json.data);
}

function normalize(data: any): DashboardData {
  return {
    stats: data.stats ?? {},
    enrollments: (data.enrollments ?? []).map((e: any, i: number) => ({
      ...e,
      id: e.id ?? `enroll-${i}-${Date.now()}`,
    })),
    activities: data.activities ?? [],
    performance: data.performance ?? [],
    content: {
      stats: data.content?.stats ?? [],
      actions: data.content?.actions ?? [],
    },
    flows: {
      studentLifecycle: data.flows?.studentLifecycle ?? [],
      billingFunnel: data.flows?.billingFunnel ?? [],
      creditHealth: data.flows?.creditHealth ?? [],
    },
    revenueTrend: data.revenueTrend ?? [],
  };
}