import MetricCard from "@/components/Dashboard/MetricCard";
import PerformanceChart from "@/components/Dashboard/PerformanceChart";
import ActivityFeed from "@/components/Dashboard/ActivityFeed";
import RecentEnrollmentsTable from "@/components/Dashboard/RecentEnrollmentsTable";
import ContentManager from "@/components/Dashboard/ContentManager";
import { getDashboardData } from "@/lib/api/dashboard";

export const revalidate = 300;

export default async function AdminDashboardPage() {
  try {
    const dashboardData = await getDashboardData();

    const metricsData = [
      {
        label: "Total Students",
        value: dashboardData.stats.totalStudents.toLocaleString(),
        icon: "ion:people-outline",
        trend: {
          value: "+12%",
          isPositive: true,
          description: "vs last month",
        },
      },
      {
        label: "Active Subscriptions",
        value: dashboardData.stats.activeSubscriptions.toString(),
        icon: "ion:card-outline",
        trend: {
          value: "+5%",
          isPositive: true,
          description: "vs last month",
        },
      },
      {
        label: "Monthly Revenue",
        value: `$${dashboardData.stats.monthlyRevenue.toLocaleString()}`,
        icon: "ion:cash-outline",
        trend: {
          value: "+18%",
          isPositive: true,
          description: "vs last month",
        },
      },
      {
        label: "Course Completion",
        value: `${dashboardData.stats.courseCompletion}%`,
        icon: "ion:trophy-outline",
        trend: {
          value: "+8%",
          isPositive: true,
          description: "vs last month",
        },
      },
    ];

    const performanceProps = {
      title: "Student Engagement",
      description: "Weekly progress across all courses",
      data: dashboardData.performance,
      goalLabel: "Weekly Target",
      goalValue: "85% completion",
    };

    return (
      <div className="space-y-6 min-w-0">
        <header className="space-y-2 min-w-0">
          <h1 className="text-3xl font-bold text-MidnightNavyText dark:text-white">
            Admin Dashboard
          </h1>
          <p className="text-slate-600 dark:text-darktext">
            Welcome to your administration panel - Real-time data
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
  } catch (error: any) {
    console.error("Error in dashboard page:", error);
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">
            Error Loading Dashboard
          </h2>
          <p className="mt-2 text-gray-600">
            Please check your API endpoints and try again.
          </p>
          <p className="mt-1 text-sm text-gray-500">Error: {error.message}</p>
        </div>
      </div>
    );
  }
}
