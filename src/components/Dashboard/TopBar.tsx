// components/Dashboard/TopBar.tsx
"use client";

import { useCallback } from "react";
import { Icon } from "@iconify/react";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ThemeToggler from "@/components/Layout/Header/ThemeToggler";
import AdminNotificationBell from "@/components/Admin/AdminNotificationBell";
import SearchInput from "@/components/Dashboard/shared/SearchInput";
import DateRangePicker from "@/components/Dashboard/shared/DateRangePicker";
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
  isRTL?: boolean;
};

const TopBar = ({ onMenuClick, user: serverUser, isRTL = false }: TopBarProps) => {
  const { data: session } = useSession();
  const { t } = useI18n();
  const { locale, toggleLocale } = useLocale();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();

  const user =
    serverUser ??
    (session?.user
      ? {
          name: session.user.name as string,
          role: (session as any).user?.role || "guest",
          image: session.user.image || null,
        }
      : null);

  const displayName = user?.name || t("dashboard.user");
  const role = user?.role || "guest";
  const initials = displayName
    .split(" ")
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // ─── URL sync ──────────────────────────────────────────
  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => (v ? params.set(k, v) : params.delete(k)));
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const handleSearch = useCallback((q: string) => setParams({ q: q || null }), [setParams]);

  const handleDateRange = useCallback(
    (range: { from: Date | null; to: Date | null }) =>
      setParams({
        from: range.from ? range.from.toISOString() : null,
        to: range.to ? range.to.toISOString() : null,
      }),
    [setParams]
  );

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      if (typeof window !== "undefined") localStorage.removeItem("token");
      await signOut({ callbackUrl: "/" });
    } catch {
      await signOut({ callbackUrl: "/" });
    }
  };

  const iconBtn =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-dark_border dark:text-darktext dark:hover:bg-darkmode";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-dark_border dark:bg-darklight/95">
      <div className="flex h-16 items-center justify-between gap-3 px-3 lg:px-5">
        {/* Start: menu + search */}
        <div className="flex flex-1 items-center gap-2 lg:gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className={`${iconBtn} lg:hidden`}
            aria-label={t("dashboard.openNavigation")}
          >
            <Icon icon="ion:menu" className="h-5 w-5" />
          </button>

          <div className="hidden max-w-md flex-1 sm:block">
            <SearchInput
              defaultValue={searchParams.get("q") || ""}
              onDebouncedChange={handleSearch}
              placeholder={t("dashboard.searchPlaceholder")}
            />
          </div>
        </div>

        {/* End: actions */}
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="hidden w-[220px] sm:block">
            <DateRangePicker onChange={handleDateRange} />
          </div>

          <button
            type="button"
            aria-label="Toggle language"
            onClick={toggleLocale}
            className="h-9 rounded-lg border border-slate-300 px-2.5 text-[11px] font-bold transition hover:bg-slate-100 dark:border-dark_border dark:text-white dark:hover:bg-darkmode"
          >
            {locale === "en" ? "ع" : "EN"}
          </button>

          <ThemeToggler />
          <AdminNotificationBell isRTL={isRTL} t={t} locale={locale} />

          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-sm dark:border-dark_border dark:bg-darkmode">
            {user?.image ? (
              <img src={user.image} alt={displayName} className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                {initials}
              </div>
            )}
            <div className="hidden text-start text-[11px] sm:block">
              <p className="font-bold leading-tight text-slate-700 dark:text-white">{displayName}</p>
              <p className="text-slate-400">{t(`common.${role}`) || role}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="hidden text-[11px] font-medium text-red-500 hover:underline sm:block"
            >
              {t("profile.signOut")}
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="sm:hidden"
              aria-label={t("profile.signOut")}
            >
              <Icon icon="ion:log-out-outline" className="h-4 w-4 text-red-500 rtl:-scale-x-100" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile row */}
      <div className="flex gap-2 border-t border-slate-200 px-3 py-2 sm:hidden dark:border-dark_border">
        <SearchInput
          defaultValue={searchParams.get("q") || ""}
          onDebouncedChange={handleSearch}
          placeholder={t("dashboard.search")}
          className="flex-1"
        />
        <DateRangePicker onChange={handleDateRange} className="w-[130px]" />
      </div>
    </header>
  );
};

export default TopBar;