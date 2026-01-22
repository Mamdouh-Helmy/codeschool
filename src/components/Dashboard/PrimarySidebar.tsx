"use client";

import { Icon } from "@iconify/react";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n/I18nProvider";

export type DashboardNavItem = {
    label: string;
    href: string;
    icon: string;
    badge?: ReactNode;
};

export type CategoryItem = {
    id: string;
    label: string;
    icon: string;
    items: DashboardNavItem[];
};

type PrimarySidebarProps = {
    categories: CategoryItem[];
    activeCategory: string | null;
    isOpen: boolean;
    onClose: () => void;
    onCategoryClick: (categoryId: string) => void;
    isMobile?: boolean;
    isRTL?: boolean;
};

const PrimarySidebar = ({
    categories,
    activeCategory,
    isOpen,
    onClose,
    onCategoryClick,
    isMobile = false,
    isRTL = false
}: PrimarySidebarProps) => {
    const { t } = useI18n();

    return (
        <>
            <div
                className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-40 w-72 transform border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out dark:border-dark_border dark:bg-darklight lg:static lg:translate-x-0 ${isOpen ? "translate-x-0" : isRTL ? "translate-x-full" : "-translate-x-full"} lg:translate-x-0
                    } ${isMobile ? 'w-full max-w-[280px]' : ''}`}
            >
                <div className={`flex items-center justify-between px-6 pt-6 pb-4 lg:justify-center lg:pt-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="text-lg font-semibold text-MidnightNavyText dark:text-white">
                        {t('dashboard.adminConsole') || "Admin Console"}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary lg:hidden dark:text-darktext dark:hover:bg-darkmode"
                        aria-label={t('dashboard.closeNavigation') || "Close navigation"}
                    >
                        <Icon icon="ion:close" className="h-5 w-5" />
                    </button>
                </div>

                <div className="mt-8 px-4">
                    <div className={`mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-darktext ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t('dashboard.categories') || "Categories"}
                    </div>

                    <nav className="space-y-2">
                        {categories.map((category) => {
                            const isActive = activeCategory === category.id;

                            return (
                                <button
                                    key={category.id}
                                    onClick={() => onCategoryClick(category.id)}
                                    className={`group flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                                            ? "bg-primary/10 text-primary"
                                            : "text-SlateBlueText hover:bg-slate-100 hover:text-primary dark:text-darktext dark:hover:bg-darkmode"
                                        } ${isMobile ? 'py-3.5' : ''} ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
                                >
                                    <span className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <Icon
                                            icon={category.icon}
                                            className={`h-5 w-5 ${isActive ? "text-primary" : "text-current"
                                                }`}
                                        />
                                        <span className="truncate">{category.label}</span>
                                    </span>
                                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        {isMobile && (
                                            <span className="text-xs text-slate-400 dark:text-darktext">
                                                {category.items.length}
                                            </span>
                                        )}
                                        <Icon
                                            icon={isRTL ? "ion:chevron-back" : "ion:chevron-forward"}
                                            className={`h-4 w-4 transition-transform ${isActive ? (isRTL ? "-rotate-90" : "rotate-90") : ""} text-primary" : "text-slate-400"
                                                }`}
                                        />
                                    </div>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Quick Stats Section - Hidden on mobile */}
                {!isMobile && (
                    <div className="mt-8 border-t border-slate-200 px-4 pt-6 dark:border-dark_border">
                        <div className={`mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-darktext ${isRTL ? 'text-right' : 'text-left'}`}>
                            {t('dashboard.quickStats') || "Quick Stats"}
                        </div>
                        <div className="space-y-3">
                            <div className={`flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 dark:bg-darkmode ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <span className="text-sm text-slate-600 dark:text-darktext">
                                    {t('dashboard.totalUsers') || "Total Users"}
                                </span>
                                <span className="text-sm font-semibold text-primary">1,234</span>
                            </div>
                            <div className={`flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 dark:bg-darkmode ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <span className="text-sm text-slate-600 dark:text-darktext">
                                    {t('dashboard.activeCourses') || "Active Courses"}
                                </span>
                                <span className="text-sm font-semibold text-primary">48</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Mobile footer with close button */}
                {isMobile && (
                    <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-4 dark:border-dark_border dark:bg-darklight">
                        <button
                            onClick={onClose}
                            className="w-full rounded-lg bg-slate-100 py-3 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-darkmode dark:text-white dark:hover:bg-darkmode/80"
                        >
                            {t('common.close') || "Close Menu"}
                        </button>
                    </div>
                )}
            </div>

            {/* Overlay for mobile only */}
            {isOpen && isMobile && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                    role="presentation"
                    onClick={onClose}
                />
            )}
        </>
    );
};

export default PrimarySidebar;