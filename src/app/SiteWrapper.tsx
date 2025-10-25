"use client";

import { ReactNode, useMemo } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";

const DASHBOARD_PREFIXES = ["/admin"];

const SiteWrapper = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();

  const isDashboardRoute = useMemo(() => {
    if (!pathname) return false;
    return DASHBOARD_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  }, [pathname]);

  if (isDashboardRoute) {
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
