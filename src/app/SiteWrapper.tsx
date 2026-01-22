// app/SiteWrapper.tsx - تحديث متقدم
"use client";

import { ReactNode, useMemo } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";

// تحديد الـ Routes اللي هتتعامل كـ Dashboard (بدون Header و Footer)
const DASHBOARD_PREFIXES: string[] = [
  "/admin",
  "/dashboard",
  "/marketing",
  "/instructor",
  "/portfolio/builder",
  "/portfolio/scanner"
];

// patterns للمسارات الديناميكية التي يجب أن تكون بدون header/footer
const DASHBOARD_PATTERNS: RegExp[] = [
  /^\/portfolio\/[^\/]+$/, // يطابق /portfolio/username (بدون أجزاء إضافية)
];

interface SiteWrapperProps {
  children: ReactNode;
}

const SiteWrapper: React.FC<SiteWrapperProps> = ({ children }) => {
  const pathname = usePathname() || "";

  const isDashboardRoute = useMemo((): boolean => {
    // تحقق من المسارات الثابتة
    const isStaticDashboard = DASHBOARD_PREFIXES.some((prefix) =>
      pathname.startsWith(prefix)
    );

    // تحقق من المسارات الديناميكية باستخدام regex
    const isDynamicDashboard = DASHBOARD_PATTERNS.some((pattern) =>
      pattern.test(pathname)
    );

    return isStaticDashboard || isDynamicDashboard;
  }, [pathname]);

  // لتصحيح: إذا كان المسار هو /portfolio فقط (بدون username) فلن يعتبر dashboard
  const isPortfolioHome = pathname === "/portfolio";

  if (isDashboardRoute && !isPortfolioHome) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
};

export default SiteWrapper;