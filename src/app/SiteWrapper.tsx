"use client";

import { ReactNode, useMemo } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";

// تحديد الـ Routes اللي هتتعامل كـ Dashboard
const DASHBOARD_PREFIXES: string[] = ["/admin"];

interface SiteWrapperProps {
  children: ReactNode;
  heroDescription?: string; // اختياري
}

const SiteWrapper: React.FC<SiteWrapperProps> = ({ children, heroDescription }) => {
  const pathname = usePathname() || "";

  const isDashboardRoute = useMemo((): boolean => {
    return DASHBOARD_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  }, [pathname]);

  if (isDashboardRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Header heroDescription={heroDescription } />
      {children}
      <Footer />
    </>
  );
};

export default SiteWrapper;
