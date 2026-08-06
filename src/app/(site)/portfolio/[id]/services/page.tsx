"use client";

import { usePortfolio } from "../../../../../../context/PortfolioContext";
import Services from "../../../../../components/Portfolio/public/pages/Services";

export default function PortfolioServicesPage() {
  const { portfolio } = usePortfolio();
  return <Services portfolio={portfolio} />;
}