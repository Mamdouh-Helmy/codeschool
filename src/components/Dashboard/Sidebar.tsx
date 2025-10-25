// components/Dashboard/Sidebar.tsx
"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import type { ReactNode } from "react";

export type DashboardNavItem = {
  label: string;
  href: string;
  icon: string;
  badge?: ReactNode;
};

type SidebarProps = {
  items: DashboardNavItem[];
  activePath?: string | null;
  isOpen: boolean;
  onClose: () => void;
};

const Sidebar = ({ items, activePath, isOpen, onClose }: SidebarProps) => {
  return (
    <>
      <div
        className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out dark:border-dark_border dark:bg-darklight lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 lg:justify-center lg:pt-8">
          <div className="text-lg font-semibold text-MidnightNavyText dark:text-white">
            Admin Console
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary lg:hidden dark:text-darktext dark:hover:bg-darkmode"
            aria-label="Close navigation"
          >
            <Icon icon="ion:close" className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-4 space-y-1 px-2 pb-6">
          {items.map((item) => {
            const isActive = activePath === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary "
                    : "text-SlateBlueText hover:bg-slate-100 hover:text-primary dark:text-darktext dark:hover:bg-darkmode"
                }`}
                onClick={onClose}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    icon={item.icon}
                    className={`h-5 w-5 ${
                      isActive ? "text-primary" : "text-current"
                    }`}
                  />
                  {item.label}
                </span>
                {item.badge ? item.badge : null}
              </Link>
            );
          })}
        </nav>
      </div>

      {isOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          role="presentation"
          onClick={onClose}
        />
      ) : null}
    </>
  );
};

export default Sidebar;
