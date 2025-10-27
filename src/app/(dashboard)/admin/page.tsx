import { getDashboardData } from "@/lib/api/dashboard";
import DashboardContent from "@/components/Dashboard/DashboardContent";

export const revalidate = 300;

export default async function AdminDashboardPage() {
  try {
    // جلب البيانات باللغة الإنجليزية (سيتم التعامل مع اللغة في الـ client components)
    const dashboardData = await getDashboardData('en');

    return <DashboardContent dashboardData={dashboardData} />;
  } catch (error: any) {
    console.error("Error in dashboard page:", error);
    
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">
            Error Loading Dashboard
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Please check your API endpoints and try again.
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
            Error: {error.message}
          </p>
        </div>
      </div>
    );
  }
}