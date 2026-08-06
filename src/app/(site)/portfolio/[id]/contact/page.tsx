"use client";

import { usePortfolio } from "../../../../../../context/PortfolioContext";
import Contact from "../../../../../components/Portfolio/public/pages/Contact";

export default function PortfolioContactPage() {
  const { portfolio } = usePortfolio();
  return <Contact portfolio={portfolio} />;
}