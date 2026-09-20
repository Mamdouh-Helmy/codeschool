// app/(admin)/admin/page.tsx
"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useDashboardData } from "@/components/Dashboard/hooks/useDashboardData";
import DashboardContent from "@/components/Dashboard/DashboardContent";
import DashboardSkeleton from "@/components/Dashboard/DashboardSkeleton";
import { useCurrentUser } from "@/app/context/UserContext";
import { useLocale } from "@/app/context/LocaleContext";

export default function AdminDashboardPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const user = useCurrentUser();
  const { locale } = useLocale();
  const typedLocale = (locale || "en") as "ar" | "en";

  const { data, loading, error } = useDashboardData(typedLocale);

  const filteredData = useMemo(() => {
    if (!data) return data;
    if (!query) return data;

    const q = query.toLowerCase();

    return {
      ...data,
      enrollments: (data.enrollments || []).filter(
        (e) =>
          e.name?.toLowerCase().includes(q) ||
          e.email?.toLowerCase().includes(q) ||
          e.course?.toLowerCase().includes(q)
      ),
      activities: (data.activities || []).filter(
        (a) =>
          a.title?.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q)
      ),
    };
  }, [data, query]);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600">Error Loading Dashboard</h2>
          <p className="mt-2 text-[13px] text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!filteredData) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-slate-500">No data available</p>
      </div>
    );
  }

  return (
    <DashboardContent
      dashboardData={filteredData}
      user={user || { name: "Admin", role: "admin", image: null }}
    />
  );
}