// context/PortfolioContext.tsx
"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PortfolioData } from "@/types/portfolio";

interface PortfolioContextValue {
  portfolio: PortfolioData;
  id: string;
  basePath: string;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider({
  portfolio,
  id,
  children,
}: {
  portfolio: PortfolioData;
  id: string;
  children: ReactNode;
}) {
  const basePath = `/portfolio/${id}`;

  return (
    <PortfolioContext.Provider value={{ portfolio, id, basePath }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) {
    throw new Error("usePortfolio must be used inside <PortfolioProvider>");
  }
  return ctx;
}