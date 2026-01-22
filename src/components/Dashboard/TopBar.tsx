"use client";

import { Icon } from "@iconify/react";
import ThemeToggler from "@/components/Layout/Header/ThemeToggler";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocale } from "@/app/context/LocaleContext";

type TopBarProps = {
  onMenuClick: () => void;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    image?: string | null;
  } | null;
  showSecondaryToggle?: boolean;
  onSecondaryToggle?: () => void;
  isRTL?: boolean;
};

const TopBar = ({
  onMenuClick,
  user: serverUser,
  showSecondaryToggle = false,
  onSecondaryToggle,
  isRTL = false
}: TopBarProps) => {
  const { data: session } = useSession();
  const { t } = useI18n();
  const { locale, toggleLocale } = useLocale();

  const [user, setUser] = useState<{
    name?: string;
    role?: string;
    image?: string | null;
  } | null>(
    serverUser
      ? {
        name: serverUser.name,
        role: serverUser.role,
        image: serverUser.image ?? null,
      }
      : null
  );

  useEffect(() => {
    if (serverUser) {
      setUser({
        name: serverUser.name,
        role: serverUser.role,
        image: serverUser.image ?? null,
      });
    } else if (session?.user) {
      setUser({
        name: session.user.name as string,
        role: (session as any).user?.role || "user",
        image: session.user.image || null,
      });
    }
  }, [serverUser, session]);

  const displayName = user?.name || t("dashboard.user") || "User";
  const role = user?.role || "guest";

  const initials = displayName
    .split(" ")
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    try {
      if (typeof window !== "undefined") {
        await fetch("/api/auth/logout", {
          method: "POST",
        });

        localStorage.removeItem("token");
      }
      await signOut({ callbackUrl: "/" });
    } catch (err) {
      console.error("Error during sign out:", err);
      try {
        await signOut({ callbackUrl: "/" });
      } catch { }
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-dark_border dark:bg-darklight/80">
      <div className={`flex items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3 lg:px-6 lg:py-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex flex-1 items-center gap-2 sm:gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Primary Menu Button - Adjust for mobile */}
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary lg:hidden dark:border-dark_border dark:text-darktext dark:hover:bg-darkmode"
            aria-label={t("dashboard.openNavigation") || "Open navigation"}
          >
            <Icon icon="ion:menu" className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          {/* Secondary sidebar toggle button - Desktop only */}
          {showSecondaryToggle && (
            <button
              type="button"
              onClick={onSecondaryToggle}
              className="hidden h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary lg:inline-flex dark:border-dark_border dark:text-darktext dark:hover:bg-darkmode"
              aria-label={t("dashboard.toggleSubmenu") || "Toggle submenu"}
            >
              <Icon icon="ion:apps-outline" className="h-5 w-5" />
            </button>
          )}

          {/* Search bar - Adjust for mobile */}
          <div className={`hidden max-w-md flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm sm:flex dark:border-dark_border dark:bg-darkmode ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Icon icon="ion:search" className="h-5 w-5 text-slate-400" />
            <input
              type="search"
              placeholder={
                t("dashboard.searchPlaceholder") ||
                "Search reports, users, or events"
              }
              className="w-full border-none bg-transparent text-sm text-slate-600 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-darktext"
              dir={isRTL ? "rtl" : "ltr"}
            />
          </div>
        </div>

        <div className={`flex items-center gap-1.5 sm:gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Schedule Review - Hidden on small mobile */}
          <div className={`hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm sm:flex dark:border-dark_border dark:bg-darkmode ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Icon icon="ion:calendar" className="h-5 w-5 text-primary" />
            <span className="hidden text-slate-600 dark:text-white sm:inline">
              {t("dashboard.scheduleReview") || "Schedule review"}
            </span>
          </div>

          {/* Language Toggle - Smaller on mobile */}
          <button
            aria-label="Toggle language"
            onClick={toggleLocale}
            className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-dark_border dark:text-white sm:px-3 sm:py-1 sm:text-sm"
          >
            {locale === "en" ? "العربية" : "English"}
          </button>

          <ThemeToggler />

          {/* Notifications - Adjust size for mobile */}
          <button
            type="button"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary dark:border-dark_border dark:text-darktext dark:hover:bg-darkmode"
            aria-label={
              t("dashboard.viewNotifications") || "View notifications"
            }
          >
            <Icon icon="ion:notifications-outline" className="h-5 w-5" />
            <span className={`absolute ${isRTL ? 'left-1.5' : 'right-1.5'} top-1.5 inline-flex h-2.5 w-2.5 rounded-full bg-primary`} />
          </button>

          {/* User Profile - Compact on mobile */}
          <div className={`flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1.5 shadow-sm sm:px-3 sm:py-2 dark:border-dark_border dark:bg-darkmode ${isRTL ? 'flex-row-reverse' : ''}`}>
            {user?.image ? (
              <img
                src={user.image || ""}
                alt="avatar"
                className="h-8 w-8 rounded-full object-cover sm:h-9 sm:w-9"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary sm:h-9 sm:w-9 sm:text-sm">
                {initials}
              </div>
            )}
            <div className={`hidden text-xs sm:block ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="font-medium text-slate-700 dark:text-white">
                {displayName}
              </p>
              <p className="text-slate-400">{role}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="ml-1 hidden text-xs text-red-500 hover:underline sm:block"
            >
              {t("profile.signOut") || "Sign out"}
            </button>
            {/* Mobile sign out icon */}
            <button
              onClick={handleSignOut}
              className="ml-1 sm:hidden"
              aria-label={t("profile.signOut") || "Sign out"}
            >
              <Icon icon="ion:log-out-outline" className="h-4 w-4 text-red-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile search bar - Appears at bottom */}
      <div className="border-t border-slate-200 px-3 py-2 dark:border-dark_border lg:hidden">
        <div className={`flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-dark_border dark:bg-darkmode ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Icon icon="ion:search" className="h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder={t("dashboard.search") || "Search..."}
            className="w-full border-none bg-transparent text-sm text-slate-600 outline-none dark:text-white"
            dir={isRTL ? "rtl" : "ltr"}
          />
        </div>
      </div>
    </header>
  );
};

export default TopBar;