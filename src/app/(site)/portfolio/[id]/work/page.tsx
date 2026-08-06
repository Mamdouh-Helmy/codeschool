"use client";

import { usePortfolio } from "../../../../../../context/PortfolioContext";
import Work from "../../../../../components/Portfolio/public/pages/Work";

export default function PortfolioWorkPage() {
  const { portfolio } = usePortfolio();
  return <Work portfolio={portfolio} />;
}