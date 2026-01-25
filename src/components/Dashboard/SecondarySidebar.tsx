"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import type { CategoryItem } from "./PrimarySidebar";

type SecondarySidebarProps = {
    category: CategoryItem;
    activePath: string | null;
    isOpen: boolean;
    onClose: () => void;
    currentCategory: string | null;
    isMobile?: boolean;
    isRTL?: boolean;
    onBackToCategories?: () => void;
};

const SecondarySidebar = ({
    category,
    activePath,
    isOpen,
    onClose,
    currentCategory,
    isMobile = false,
    isRTL = false,
    onBackToCategories
}: SecondarySidebarProps) => {
    const { t } = useI18n();

    return (
        <>
            <div
                className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-40 w-72 transform border-r border-slate-200 bg-white transition-all duration-300 ease-in-out dark:border-dark_border dark:bg-darklight lg:fixed lg:z-40 ${isMobile
                    ? isOpen ? "translate-x-0" : (isRTL ? "translate-x-full" : "-translate-x-full")
                    : isOpen ? "translate-x-0" : (isRTL ? "translate-x-full" : "-translate-x-full")
                    }`}
            >
                {/* Header */}
                <div className={`flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-dark_border ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {!isMobile && onBackToCategories && (
                            <button
                                onClick={onBackToCategories}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-darktext dark:hover:bg-darkmode"
                                aria-label={t('common.backToCategories') || "Back to Categories"}
                            >
                                <Icon icon={isRTL ? "ion:arrow-forward" : "ion:arrow-back"} className="h-5 w-5" />
                            </button>
                        )}
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                            <div className="text-sm font-semibold text-MidnightNavyText dark:text-white">
                                {category.label}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-darktext">
                                {category.items.length} {t('dashboard.items') || "items"}
                            </div>
                        </div>
                    </div>
                    {isMobile && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary dark:text-darktext dark:hover:bg-darkmode"
                            aria-label={t('dashboard.closeSubmenu') || "Close submenu"}
                        >
                            <Icon icon="ion:close" className="h-5 w-5" />
                        </button>
                    )}
                </div>

                <div className={`h-[calc(100vh-120px)] overflow-y-auto no-scrollbar px-2 ${isMobile ? 'pb-20' : 'pb-6'}`}>
                    <nav className="mt-4 space-y-1">
                        {category.items.map((item) => {
                            const isActive = activePath === item.href;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`group flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-200 ${isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-SlateBlueText hover:bg-slate-100 hover:text-primary dark:text-darktext dark:hover:bg-darkmode"
                                        } ${isMobile ? 'py-3.5' : ''} ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
                                    onClick={() => {
                                        if (isMobile) onClose();
                                    }}
                                >
                                    <span className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <Icon
                                            icon={item.icon}
                                            className={`h-5 w-5 ${isActive ? "text-primary" : "text-current"
                                                }`}
                                        />
                                        <span className="truncate">{item.label}</span>
                                    </span>
                                    {item.badge ? item.badge : null}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Recently Accessed - Hidden on mobile */}
                    {!isMobile && (
                        <div className="mt-8 border-t border-slate-200 px-4 pt-6 dark:border-dark_border">
                            <div className={`mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-darktext ${isRTL ? 'text-right' : 'text-left'}`}>
                                {t('dashboard.recentlyAccessed') || "Recently Accessed"}
                            </div>
                            <div className="space-y-2">
                                {category.items.slice(0, 3).map((item) => (
                                    <div
                                        key={item.href}
                                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-darktext dark:hover:bg-darkmode ${isRTL ? 'flex-row-reverse' : ''}`}
                                    >
                                        <Icon icon={item.icon} className="h-4 w-4" />
                                        <span className="truncate">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Mobile footer with back button */}
                {isMobile && onBackToCategories && (
                    <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-4 dark:border-dark_border dark:bg-darklight">
                        <button
                            onClick={onBackToCategories}
                            className={`flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100 py-3 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-darkmode dark:text-white dark:hover:bg-darkmode/80 ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                            <Icon icon={isRTL ? "ion:arrow-forward" : "ion:arrow-back"} className="h-5 w-5" />
                            {t('common.backToCategories') || "Back to Categories"}
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

export default SecondarySidebar;