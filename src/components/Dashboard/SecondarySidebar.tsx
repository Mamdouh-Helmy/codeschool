// components/Dashboard/SecondarySidebar.tsx
"use client";

import { Icon } from "@iconify/react";
import { useI18n } from "@/i18n/I18nProvider";
import { NavLink, type CategoryItem } from "./navigation";

type SecondarySidebarProps = {
  category: CategoryItem;
  activePath: string | null;
  isOpen: boolean;
  onClose: () => void;
};

/** Desktop only. On mobile the drawer in PrimarySidebar shows the items. */
const SecondarySidebar = ({ category, activePath, isOpen, onClose }: SecondarySidebarProps) => {
  const { t } = useI18n();

  return (
    <aside
      aria-hidden={!isOpen}
      className={`fixed inset-y-0 start-[5.5rem] z-30 hidden w-60 flex-col border-e border-slate-200 bg-white transition-[transform,visibility] duration-300 ease-in-out dark:border-dark_border dark:bg-darklight lg:flex ${
        isOpen ? "visible translate-x-0" : "invisible -translate-x-full rtl:translate-x-full"
      }`}
    >
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-4 dark:border-dark_border">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-MidnightNavyText dark:text-white">
            {category.label}
          </p>
          <p className="text-xs text-slate-500 dark:text-darktext">
            {category.items.length} {t("dashboard.items") || "items"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary dark:text-darktext dark:hover:bg-darkmode"
          aria-label={t("dashboard.closeSubmenu") || "Close submenu"}
        >
          <Icon icon="ion:chevron-back" className="h-5 w-5 rtl:rotate-180" />
        </button>
      </div>

      <nav className="no-scrollbar flex-1 space-y-1 overflow-y-auto p-2">
        {category.items.map((item) => (
          <NavLink key={item.href} item={item} active={activePath === item.href} />
        ))}
      </nav>
    </aside>
  );
};

export default SecondarySidebar;