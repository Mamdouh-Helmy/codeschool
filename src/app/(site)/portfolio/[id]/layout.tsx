import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { fetchPortfolio } from "@/lib/fetchPortfolio";
import { PortfolioProvider } from "../../../../../context/PortfolioContext";
import Header from "../../../../components/Portfolio/public/Header";
import StairTransition from "../../../../components/Portfolio/public/StairTransition";
import "./scrollbar.css";

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export default async function PortfolioTemplateLayout({ children, params }: LayoutProps) {
  const { id } = await params;
  const portfolio = await fetchPortfolio(id);

  if (!portfolio) {
    notFound();
  }

  return (
    <PortfolioProvider portfolio={portfolio} id={id}>
      <Header />
      <StairTransition />
      {children}
    </PortfolioProvider>
  );
}