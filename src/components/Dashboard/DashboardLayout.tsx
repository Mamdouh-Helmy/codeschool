// components/Dashboard/DashboardLayout.tsx - الإصدار المحسن بالأيقونات المناسبة
"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar, { type DashboardNavItem } from "./Sidebar";
import TopBar from "./TopBar";

const createBadge = (value: string) => (
  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
    {value}
  </span>
);

const NAVIGATION: DashboardNavItem[] = [
  { label: "Home", href: "/", icon: "ion:home-outline" },
  { label: "Overview", href: "/admin", icon: "ion:speedometer-outline" },
  {
    label: "Webinars",
    href: "/admin/webinars",
    icon: "ion:videocam-outline",
    badge: createBadge("New"),
  },
  {
    label: "Projects",
    href: "/admin/projects",
    icon: "ion:briefcase-outline", // المشاريع
  },
  {
    label: "Blogs",
    href: "/admin/blogs",
    icon: "ion:newspaper-outline", // المقالات
  },
  {
    label: "Pricing",
    href: "/admin/pricing",
    icon: "ion:cash-outline", // الأسعار
  },
  {
    label: "Subscriptions",
    href: "/admin/subscriptions",
    icon: "ion:card-outline", // الاشتراكات
  },
  {
    label: "Events",
    href: "/admin/events",
    icon: "ion:calendar-outline", // الأحداث
  },
  {
    label: "Testimonials",
    href: "/admin/Testimonials",
    icon: "ion:chatbubbles-outline", // آراء العملاء
  },
  {
    label: "Schedules",
    href: "/admin/schedules",
    icon: "ion:time-outline", // الجداول الزمنية
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: "ion:settings-outline",
  },
];

type DashboardLayoutProps = {
  children: ReactNode;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    image?: string | null;
  } | null;
};

const DashboardLayout = ({ children, user }: DashboardLayoutProps) => {
  const pathname = usePathname();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const activePath = useMemo(() => {
    if (!pathname) return null;

    let bestMatch = NAVIGATION[0];

    for (const item of NAVIGATION) {
      if (pathname === item.href) {
        return item.href;
      }

      if (
        pathname.startsWith(item.href + "/") &&
        item.href.length > bestMatch.href.length
      ) {
        bestMatch = item;
      }
    }

    return bestMatch.href;
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-darkmode dark:text-white">
      <div className="flex min-h-screen w-full">
        <Sidebar
          items={NAVIGATION}
          activePath={activePath}
          isOpen={isSidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex min-h-screen flex-1 flex-col">
          <TopBar onMenuClick={() => setSidebarOpen(true)} user={user} />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
