"use client";

import { usePortfolio } from "../../../../../../context/PortfolioContext";
import Resume from "../../../../../components/Portfolio/public/pages/Resume";

export default function PortfolioResumePage() {
  const { portfolio } = usePortfolio();
  return <Resume portfolio={portfolio} />;
}