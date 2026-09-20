// components/Dashboard/DashboardLayout.tsx
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "react-hot-toast";

import PrimarySidebar from "./PrimarySidebar";
import SecondarySidebar from "./SecondarySidebar";
import TopBar from "./TopBar";
import {
  useAdminNavigation,
  type CategoryItem,
  type DashboardNavItem,
} from "./navigation";

import { useLocale } from "@/app/context/LocaleContext";
import { UserProvider } from "@/app/context/UserContext";

type Props = {
  children: ReactNode;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    image?: string | null;
  } | null;
};

const DashboardLayout = ({ children, user }: Props) => {
  const { locale } = useLocale();
  const pathname = usePathname();
  const isRTL = locale === "ar";

  const { home, categories } = useAdminNavigation();

  const [mobileOpen, setMobileOpen] = useState(false); // mobile drawer
  const [panelOpen, setPanelOpen] = useState(true); // desktop secondary panel
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // ─── Active route → category ───────────────────────────
  const activePath = useMemo(() => {
    if (!pathname) return null;
    let best: string | null = null;
    for (const { href } of categories.flatMap((c: CategoryItem) => c.items)) {
      if (href === "/") continue;
      const match = pathname === href || pathname.startsWith(href + "/");
      if (match && (!best || href.length > best.length)) best = href;
    }
    return best;
  }, [pathname, categories]);

  const currentCategory = useMemo(
    () =>
      categories.find((c: CategoryItem) =>
        c.items.some((i: DashboardNavItem) => i.href === activePath)
      )?.id ?? null,
    [activePath, categories]
  );

  useEffect(() => {
    setMobileOpen(false);
    setActiveCategory(currentCategory);
  }, [pathname, currentCategory]);

  const selectedCategory = useMemo(
    () => categories.find((c: CategoryItem) => c.id === activeCategory) ?? null,
    [activeCategory, categories]
  );

  const handleCategoryClick = useCallback(
    (id: string) => {
      if (id === activeCategory) {
        setPanelOpen((open) => !open);
      } else {
        setActiveCategory(id);
        setPanelOpen(true);
      }
    },
    [activeCategory]
  );

  const panelVisible = panelOpen && !!selectedCategory;

  return (
    <UserProvider user={user ?? null}>
      <div
        className={`min-h-screen bg-slate-50 text-slate-900 dark:bg-darkmode dark:text-white ${isRTL ? "rtl" : "ltr"}`}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <Toaster
          position="top-center"
          containerStyle={{ zIndex: 99999 }}
          toastOptions={{
            className:
              "bg-white dark:bg-darkmode text-MidnightNavyText dark:text-white rounded-xl shadow-lg border border-slate-200 dark:border-dark_border p-3",
            success: { className: "bg-[#ff6700] text-white rounded-xl shadow-lg p-3" },
            error: { className: "bg-red-600 text-white rounded-xl shadow-lg p-3" },
            duration: 4000,
          }}
        />

        <PrimarySidebar
          home={home}
          categories={categories}
          activeCategory={activeCategory}
          activePath={activePath}
          isHomeActive={pathname === "/admin"}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          onCategoryClick={handleCategoryClick}
        />

        {selectedCategory && (
          <SecondarySidebar
            category={selectedCategory}
            activePath={activePath}
            isOpen={panelOpen}
            onClose={() => setPanelOpen(false)}
          />
        )}

        {/* rail = 5.5rem, panel = 15rem → 20.5rem */}
        <div
          className={`flex min-h-screen min-w-0 flex-col transition-[padding] duration-300 ${
            panelVisible ? "lg:ps-[20.5rem]" : "lg:ps-[5.5rem]"
          }`}
        >
          <Suspense fallback={<div className="h-16 border-b border-slate-200 bg-white dark:border-dark_border dark:bg-darklight" />}>
            <TopBar onMenuClick={() => setMobileOpen(true)} user={user ?? undefined} isRTL={isRTL} />
          </Suspense>

          <main className="flex-1 p-4 sm:p-5 lg:p-6">{children}</main>
        </div>
      </div>
    </UserProvider>
  );
};

export default DashboardLayout;