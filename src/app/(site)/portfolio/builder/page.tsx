import PortfolioBuilder from '@/components/Portfolio/PortfolioBuilder';
import { Metadata } from "next";
import { useI18n } from "@/i18n/I18nProvider";

export const metadata: Metadata = {
  title: "Portfolio Builder | Codeschool",
};

export default function PortfolioBuilderPage() {
  return <PortfolioBuilder />;
}