// components/Dashboard/DashboardSkeleton.tsx
"use client";

export default function DashboardSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-32 w-full rounded-2xl bg-slate-200 dark:bg-darkmode" />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-36 rounded-2xl bg-slate-200 dark:bg-darkmode" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[400px] rounded-2xl bg-slate-200 dark:bg-darkmode" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="h-[400px] rounded-2xl bg-slate-200 dark:bg-darkmode xl:col-span-2" />
        <div className="h-[400px] rounded-2xl bg-slate-200 dark:bg-darkmode" />
      </div>
    </div>
  );
}