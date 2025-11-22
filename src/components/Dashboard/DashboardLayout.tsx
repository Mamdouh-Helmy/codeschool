// components/Dashboard/DashboardLayout.tsx
"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar, { type DashboardNavItem } from "./Sidebar";
import TopBar from "./TopBar";
import { useI18n } from "@/i18n/I18nProvider";

const createBadge = (value: string) => (
  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
    {value}
  </span>
);

const DashboardLayout = ({ children, user }: { children: ReactNode; user?: any }) => {
  const { t } = useI18n();
  const pathname = usePathname();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const NAVIGATION: DashboardNavItem[] = [
    { label: t('nav.homepage') || "Home", href: "/", icon: "ion:home-outline" },
    { label: t('dashboard.overview') || "Overview", href: "/admin", icon: "ion:speedometer-outline" },
    {
      label: t('dashboard.webinars') || "Webinars",
      href: "/admin/webinars",
      icon: "ion:videocam-outline",
      badge: createBadge(t('common.new') || "New"),
    },
    {
      label: t('dashboard.projects') || "Projects",
      href: "/admin/projects",
      icon: "ion:briefcase-outline",
    },
    {
      label: t('dashboard.blogs') || "Blogs",
      href: "/admin/blogs",
      icon: "ion:newspaper-outline",
    },
    {
      label: t('nav.pricing') || "Pricing",
      href: "/admin/pricing",
      icon: "ion:cash-outline",
    },
    {
      label: t('nav.subscriptions') || "Subscriptions",
      href: "/admin/subscriptions",
      icon: "ion:card-outline",
    },
    {
      label: t('dashboard.events') || "Events",
      href: "/admin/events",
      icon: "ion:calendar-outline",
    },
    {
      label: t('dashboard.testimonials') || "Testimonials",
      href: "/admin/Testimonials",
      icon: "ion:chatbubbles-outline",
    },
    {
      label: t('nav.schedules') || "Schedules",
      href: "/admin/schedules",
      icon: "ion:time-outline",
    },
    // رابط جديد لإدارة الصور
    {
      label: t('dashboard.sectionImages') || "Section Images",
      href: "/admin/sectionImages",
      icon: "ion:images-outline",
      badge: createBadge(t('common.new') || "New"),
    },
    {
      label: t('nav.curriculum') || "Curriculum",
      href: "/admin/curriculum",
      icon: "ion:school-outline",
      badge: createBadge(t('common.new') || "New"),
    },
    {
      label: t('dashboard.contacts') || "Contacts",
      href: "/admin/ContactsPage",
      icon: "ion:chatbubble-ellipses-outline",
      badge: createBadge(t('common.new') || "New"),
    },
    {
      label: t('nav.settings') || "Settings",
      href: "/admin/settings",
      icon: "ion:settings-outline",
    },

  ];

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