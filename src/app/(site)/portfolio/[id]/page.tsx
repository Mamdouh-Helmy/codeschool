"use client";

import { usePortfolio } from "../../../../../context/PortfolioContext";
import Home from "../../../../components/Portfolio/public/pages/Home";

export default function PortfolioHomePage() {
  const { portfolio } = usePortfolio();
  return <Home portfolio={portfolio} />;
}