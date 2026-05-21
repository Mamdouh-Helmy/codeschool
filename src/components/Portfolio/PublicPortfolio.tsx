"use client";

import { useState, useEffect, useCallback } from "react";
import { Share2, Eye } from "lucide-react";
import toast from "react-hot-toast";

import PortfolioHeader from "./public/PortfolioHeader";
import SkillsShowcase from "./public/SkillsShowcase";
import ProjectsGallery from "./public/ProjectsGallery";
import CertificatesGallery from "./public/CertificatesGallery"; // ← جديد
import ContactSection from "./public/ContactSection";
import PortfolioFooter from "./public/PortfolioFooter";

import {
  PublicPortfolio as PublicPortfolioType,
  PortfolioApiResponse,
} from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";
import { applyTheme } from "@/utils/portfolioThemes";

/* ─── Types ───────────────────────────────────────────────── */
interface PublicPortfolioProps {
  username: string;
}

type ThemeColor = "primary" | "secondary" | "muted";

/* ─── Theme helpers ───────────────────────────────────────── */
function resolveAccentBase(skillFill: string | undefined): string {
  if (!skillFill) return "blue";
  if (skillFill.includes("green")) return "green";
  if (skillFill.includes("gray")) return "gray";
  return "blue";
}

function makeThemeHelpers(themeStyles: ReturnType<typeof applyTheme>) {
  const accent = resolveAccentBase(themeStyles?.skillFill);

  const textColor = (type: ThemeColor = "primary"): string =>
    themeStyles.text?.[type] ||
    { primary: "text-gray-900", secondary: "text-gray-700", muted: "text-gray-500" }[type];

  const iconColor = (): string => `text-${accent}-600`;
  const hoverColor = (): string => `hover:text-${accent}-600`;
  const primaryButton = (): string => `bg-${accent}-600 hover:bg-${accent}-700 text-white`;
  const secondaryButtonHover = (): string =>
    themeStyles?.background?.secondary
      ? `hover:${themeStyles.background.secondary}`
      : "hover:bg-gray-50";

  return { textColor, iconColor, hoverColor, primaryButton, secondaryButtonHover };
}

/* ─── PortfolioLoader ─────────────────────────────────────── */
function PortfolioLoader() {
  return (
    <div className="pf-loader-screen" aria-label="Loading portfolio" role="status">
      <div className="pf-loader-inner">
        <div className="pf-loader-rings" aria-hidden="true">
          <span className="pf-loader-ring pf-loader-ring--1" />
          <span className="pf-loader-ring pf-loader-ring--2" />
          <span className="pf-loader-ring pf-loader-ring--3" />
          <span className="pf-loader-dot" />
        </div>
        <div className="pf-loader-skeleton" aria-hidden="true">
          <span className="pf-skel pf-skel--title" />
          <span className="pf-skel pf-skel--sub" />
          <span className="pf-skel pf-skel--sub pf-skel--short" />
          <div className="pf-skel-row">
            <span className="pf-skel pf-skel--chip" />
            <span className="pf-skel pf-skel--chip" />
            <span className="pf-skel pf-skel--chip" />
          </div>
        </div>
        <p className="pf-loader-label">Building your portfolio…</p>
      </div>
    </div>
  );
}

/* ─── NotFound ────────────────────────────────────────────── */
function NotFound({
  message,
  label,
  goHomeLabel,
}: {
  message: string;
  label: string;
  goHomeLabel: string;
}) {
  return (
    <div className="pf-notfound-screen" role="alert">
      <div className="pf-notfound-inner">
        <div className="pf-notfound-icon" aria-hidden="true">
          <Eye size={40} />
        </div>
        <h1 className="pf-notfound-title">{label}</h1>
        <p className="pf-notfound-message">{message}</p>
        <button
          onClick={() => (window.location.href = "/")}
          className="pf-notfound-btn"
        >
          {goHomeLabel}
        </button>
      </div>
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────── */
export default function PublicPortfolio({ username }: PublicPortfolioProps) {
  const { t } = useI18n();

  const [portfolio, setPortfolio] = useState<PublicPortfolioType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── Data fetching ── */
  const fetchPortfolio = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/portfolio/${username}`);
      const data: PortfolioApiResponse = await res.json();

      if (data.success) {
        setPortfolio(data.portfolio);
      } else {
        const msg = data.message || t("portfolio.public.notFound");
        setError(msg);
        toast.error(msg);
      }
    } catch {
      const msg = t("portfolio.status.loadFailed");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [username, t]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  /* ── Share handler ── */
  const handleShare = useCallback(async () => {
    if (!portfolio) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: portfolio.title || t("portfolio.public.portfolio"),
          text: portfolio.description,
          url: window.location.href,
        });
      } catch {
        // user cancelled — no-op
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t("portfolio.public.linkCopied"));
    }
  }, [portfolio, t]);

  /* ── Theme ── */
  const themeStyles = applyTheme(
    portfolio?.settings?.theme ?? "dark",
    portfolio?.settings?.layout ?? "standard"
  );
  const theme = makeThemeHelpers(themeStyles);

  /* ── Skills data shape ── */
  const skillsData = portfolio
    ? {
        skillsTitle: portfolio.title ?? "My Skills",
        skillsSubtitle: portfolio.description ?? "Technical Proficiencies",
        skillsDesc: "Here are my technical skills and proficiency levels",
        skills: portfolio.skills,
      }
    : null;

  /* ── Render states ── */
  if (loading) return <PortfolioLoader />;

  if (error || !portfolio) {
    return (
      <NotFound
        message={error || t("portfolio.public.notFoundDescription")}
        label={t("portfolio.public.notFound")}
        goHomeLabel={t("common.goHome")}
      />
    );
  }

  /* ── Happy path ── */
  return (
    <div className="rounded-md">
      <div className={`min-h-screen ${themeStyles.container} rounded-lg`}>
        <PortfolioHeader portfolio={portfolio} />

        {portfolio.skills?.length > 0 && skillsData && (
          <SkillsShowcase portfolio={skillsData} />
        )}

        {portfolio.projects?.length > 0 && (
          <ProjectsGallery
            projects={portfolio.projects}
            themeStyles={themeStyles}
          />
        )}

        {/* ✅ Certificates — يظهر بس لو في شهادات */}
        {portfolio.certificates?.length > 0 && (
          <CertificatesGallery certificates={portfolio.certificates} />
        )}

        <ContactSection portfolio={portfolio} themeStyles={themeStyles} />

        <PortfolioFooter portfolio={portfolio} />
      </div>
    </div>
  );
}