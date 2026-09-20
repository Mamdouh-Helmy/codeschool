// components/Dashboard/PrimarySidebar.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import useSWR from "swr";
import { useI18n } from "@/i18n/I18nProvider";
import { NavLink, type CategoryItem, type DashboardNavItem } from "./navigation";

// Re-exported so existing imports keep working
export type { CategoryItem, DashboardNavItem };

type PrimarySidebarProps = {
  home: DashboardNavItem;
  categories: CategoryItem[];
  activeCategory: string | null;
  activePath: string | null;
  isHomeActive: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onCategoryClick: (categoryId: string) => void;
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
};

const compact = new Intl.NumberFormat("en-US", { notation: "compact" });

const IDLE =
  "text-SlateBlueText hover:bg-slate-100 hover:text-primary dark:text-darktext dark:hover:bg-darkmode";
const SELECTED = "bg-primary/10 text-primary";

const PrimarySidebar = ({
  home,
  categories,
  activeCategory,
  activePath,
  isHomeActive,
  mobileOpen,
  onMobileClose,
  onCategoryClick,
}: PrimarySidebarProps) => {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<string | null>(activeCategory);

  useEffect(() => setExpanded(activeCategory), [activeCategory]);

  const { data, error, isLoading } = useSWR("/api/admin/stats", fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  const stats = data?.success ? data.data : null;
  const show = (v?: number) =>
    isLoading ? "…" : error || v == null ? "--" : compact.format(v);

  const statRows = [
    { icon: "ion:people-outline", label: t("dashboard.totalUsers") || "Total Users", value: stats?.totalUsers },
    { icon: "ion:book-outline", label: t("dashboard.activeCourses") || "Active Courses", value: stats?.activeCourses },
  ];

  return (
    <>
      {/* ───────── Desktop rail ───────── */}
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-[5.5rem] flex-col border-e border-slate-200 bg-white dark:border-dark_border dark:bg-darklight lg:flex">
        <div className="flex h-16 shrink-0 items-center justify-center border-b border-slate-200 dark:border-dark_border">
          <Icon icon="ion:settings-outline" className="h-6 w-6 text-primary" />
        </div>

        <nav className="no-scrollbar flex-1 space-y-1 overflow-y-auto px-2 py-3" aria-label={t("dashboard.adminConsole") || "Admin Console"}>
          <Link
            href={home.href}
            aria-current={isHomeActive ? "page" : undefined}
            className={`relative flex flex-col items-center gap-1 rounded-lg px-1 py-2.5 text-center text-[11px] font-medium leading-tight transition-colors ${isHomeActive ? SELECTED : IDLE}`}
          >
            {isHomeActive && <span className="absolute inset-y-2 start-0 w-1 rounded-e bg-primary" />}
            <Icon icon={home.icon} className="h-6 w-6" />
            <span className="line-clamp-2 break-words">{home.label}</span>
          </Link>

          <div className="mx-2 my-2 border-t border-slate-200 dark:border-dark_border" />

          {categories.map((category) => {
            const active = activeCategory === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onCategoryClick(category.id)}
                aria-pressed={active}
                title={category.label}
                className={`relative flex w-full flex-col items-center gap-1 rounded-lg px-1 py-2.5 text-center text-[11px] font-medium leading-tight transition-colors ${active ? SELECTED : IDLE}`}
              >
                {active && <span className="absolute inset-y-2 start-0 w-1 rounded-e bg-primary" />}
                <Icon icon={category.icon} className="h-6 w-6" />
                <span className="line-clamp-2 break-words">{category.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Live stats — compact */}
        <div className="shrink-0 space-y-2 border-t border-slate-200 px-2 py-3 dark:border-dark_border">
          {statRows.map((s) => (
            <div key={s.label} title={s.label} className="flex flex-col items-center gap-0.5 text-slate-500 dark:text-darktext">
              <Icon icon={s.icon} className="h-4 w-4" />
              <span className="text-[11px] font-semibold text-primary">{show(s.value)}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* ───────── Mobile drawer ───────── */}
      <aside
        aria-hidden={!mobileOpen}
        className={`fixed inset-y-0 start-0 z-50 flex w-72 max-w-[85vw] flex-col border-e border-slate-200 bg-white transition-[transform,visibility] duration-300 ease-in-out dark:border-dark_border dark:bg-darklight lg:hidden ${
          mobileOpen ? "visible translate-x-0" : "invisible -translate-x-full rtl:translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4 dark:border-dark_border">
          <span className="text-lg font-semibold text-MidnightNavyText dark:text-white">
            {t("dashboard.adminConsole") || "Admin Console"}
          </span>
          <button
            type="button"
            onClick={onMobileClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary dark:text-darktext dark:hover:bg-darkmode"
            aria-label={t("dashboard.closeNavigation") || "Close navigation"}
          >
            <Icon icon="ion:close" className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <NavLink item={home} active={isHomeActive} onNavigate={onMobileClose} />

          {categories.map((category) => {
            const isOpen = expanded === category.id;
            return (
              <div key={category.id}>
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : category.id)}
                  aria-expanded={isOpen}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    activeCategory === category.id ? SELECTED : IDLE
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Icon icon={category.icon} className="h-5 w-5 shrink-0" />
                    <span className="truncate">{category.label}</span>
                  </span>
                  <Icon
                    icon="ion:chevron-down"
                    className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isOpen && (
                  <div className="ms-5 mt-1 space-y-1 border-s border-slate-200 ps-2 dark:border-dark_border">
                    {category.items.map((item) => (
                      <NavLink
                        key={item.href}
                        item={item}
                        active={activePath === item.href}
                        onNavigate={onMobileClose}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-2 border-t border-slate-200 p-4 dark:border-dark_border">
          {statRows.map((s) => (
            <div key={s.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-darkmode">
              <span className="text-slate-600 dark:text-darktext">{s.label}</span>
              <span className="font-semibold text-primary">{show(s.value)}</span>
            </div>
          ))}
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          role="presentation"
          onClick={onMobileClose}
        />
      )}
    </>
  );
};

export default PrimarySidebar;