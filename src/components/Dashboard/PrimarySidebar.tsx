"use client";

import { Icon } from "@iconify/react";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import useSWR from "swr";

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

// Fetcher function for SWR
const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch stats');
    const data = await res.json();
    return data;
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
    
    // استخدام SWR للـ real-time updates
    const { data, error, isLoading } = useSWR(
        '/api/admin/stats',
        fetcher,
        {
            refreshInterval: 3000, // تحديث كل 3 ثواني
            revalidateOnFocus: true, // تحديث عند العودة للصفحة
            revalidateOnReconnect: true, // تحديث عند إعادة الاتصال
            dedupingInterval: 2000, // منع الطلبات المكررة
        }
    );

    // البيانات من الـ API
    const stats = data?.success ? data.data : {
        totalUsers: 0,
        activeCourses: 0,
    };

    // دالة لتنسيق الأرقام
    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US').format(num);
    };

    // For mobile, keep the full sidebar
    if (isMobile) {
        return (
            <>
                <div
                    className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-40 w-72 transform border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out dark:border-dark_border dark:bg-darklight ${isOpen ? "translate-x-0" : isRTL ? "translate-x-full" : "-translate-x-full"}`}
                >
                    <div className={`flex items-center justify-between px-6 pt-6 pb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="text-lg font-semibold text-MidnightNavyText dark:text-white">
                            {t('dashboard.adminConsole') || "Admin Console"}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary dark:text-darktext dark:hover:bg-darkmode"
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
                                            } ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
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
                                            <span className="text-xs text-slate-400 dark:text-darktext">
                                                {category.items.length}
                                            </span>
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

                    {/* Mobile footer with close button */}
                    <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-4 dark:border-dark_border dark:bg-darklight">
                        <button
                            onClick={onClose}
                            className="w-full rounded-lg bg-slate-100 py-3 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-darkmode dark:text-white dark:hover:bg-darkmode/80"
                        >
                            {t('common.close') || "Close Menu"}
                        </button>
                    </div>
                </div>

                {/* Overlay for mobile only */}
                {isOpen && (
                    <div
                        className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                        role="presentation"
                        onClick={onClose}
                    />
                )}
            </>
        );
    }

    // For desktop - icons only with hover effect
    return (
        <>
            <div
                className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-40 w-20 transform border-r border-slate-200 bg-white transition-all duration-300 ease-in-out hover:w-72 group dark:border-dark_border dark:bg-darklight lg:static lg:w-20 lg:hover:w-72`}
            >
                {/* Logo/Header - Small version */}
                <div className={`flex items-center justify-center px-4 pt-6 pb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="text-lg font-semibold text-MidnightNavyText dark:text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                        {t('dashboard.adminConsole') || "Admin Console"}
                    </div>
                    <div className="absolute left-1/2 transform -translate-x-1/2 group-hover:hidden">
                        <Icon icon="ion:settings-outline" className="h-6 w-6 text-primary" />
                    </div>
                </div>

                <div className="mt-8 px-2">
                    {/* Categories label - Hidden by default, shown on hover */}
                    <div className={`mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-darktext opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap ${isRTL ? 'text-right px-3' : 'text-left px-3'}`}>
                        {t('dashboard.categories') || "Categories"}
                    </div>

                    <nav className="space-y-2">
                        {categories.map((category) => {
                            const isActive = activeCategory === category.id;

                            return (
                                <button
                                    key={category.id}
                                    onClick={() => onCategoryClick(category.id)}
                                    className={`group/btn flex w-full items-center justify-between rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 relative overflow-hidden ${isActive
                                            ? "bg-primary/10 text-primary"
                                            : "text-SlateBlueText hover:bg-slate-100 hover:text-primary dark:text-darktext dark:hover:bg-darkmode"
                                        } ${isRTL ? 'flex-row-reverse' : ''}`}
                                    title={category.label}
                                >
                                    {/* Active indicator */}
                                    {isActive && (
                                        <div className={`absolute ${isRTL ? 'right-0' : 'left-0'} top-1/2 transform -translate-y-1/2 w-1 h-8 bg-primary rounded-r ${isRTL ? 'rounded-l rounded-r-none' : 'rounded-r rounded-l-none'}`} />
                                    )}
                                    
                                    {/* Icon */}
                                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <Icon
                                            icon={category.icon}
                                            className={`h-6 w-6 ${isActive ? "text-primary" : "text-current"
                                                }`}
                                        />
                                        {/* Label - Hidden by default, shown on sidebar hover */}
                                        <span className="truncate opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                                            {category.label}
                                        </span>
                                    </div>
                                    
                                    {/* Items count and chevron - Hidden by default, shown on sidebar hover */}
                                    <div className={`flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <span className="text-xs text-slate-400 dark:text-darktext whitespace-nowrap">
                                            {category.items.length}
                                        </span>
                                        <Icon
                                            icon={isRTL ? "ion:chevron-back" : "ion:chevron-forward"}
                                            className={`h-4 w-4 transition-transform ${isActive ? (isRTL ? "-rotate-90" : "rotate-90") : ""} ${isActive ? "text-primary" : "text-slate-400"
                                                }`}
                                        />
                                    </div>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Quick Stats Section - Hidden by default, shown on hover */}
                <div className="mt-8 border-t border-slate-200 px-4 pt-6 dark:border-dark_border opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className={`mb-4 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-darktext ${isRTL ? 'text-right' : 'text-left'}`}>
                            {t('dashboard.quickStats') || "Quick Stats"}
                        </div>
                        {/* Live indicator */}
                        {!isLoading && !error && (
                            <div className="flex items-center gap-1">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-[10px] text-green-600 dark:text-green-400">Live</span>
                            </div>
                        )}
                    </div>
                    <div className="space-y-3">
                        <div className={`flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 dark:bg-darkmode ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <span className="text-sm text-slate-600 dark:text-darktext">
                                {t('dashboard.totalUsers') || "Total Users"}
                            </span>
                            {isLoading ? (
                                <div className="h-4 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                            ) : error ? (
                                <span className="text-sm font-semibold text-red-500">--</span>
                            ) : (
                                <span className="text-sm font-semibold text-primary transition-all duration-300">
                                    {formatNumber(stats.totalUsers)}
                                </span>
                            )}
                        </div>
                        <div className={`flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 dark:bg-darkmode ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <span className="text-sm text-slate-600 dark:text-darktext">
                                {t('dashboard.activeCourses') || "Active Courses"}
                            </span>
                            {isLoading ? (
                                <div className="h-4 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                            ) : error ? (
                                <span className="text-sm font-semibold text-red-500">--</span>
                            ) : (
                                <span className="text-sm font-semibold text-primary transition-all duration-300">
                                    {formatNumber(stats.activeCourses)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PrimarySidebar;