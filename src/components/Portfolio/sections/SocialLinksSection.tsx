"use client";

import {
  Github,
  Linkedin,
  Twitter,
  Globe,
  Youtube,
  Instagram,
  Facebook,
  Dribbble,
  CheckCircle2,
  ExternalLink,
  Share2,
  Lightbulb,
} from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { PortfolioFormData, SocialLinks } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";

/* ─── Types ───────────────────────────────────────────────── */
interface SocialLinksSectionProps {
  data: PortfolioFormData;
  onChange: (updates: Partial<PortfolioFormData>) => void;
}

interface Platform {
  key: keyof SocialLinks;
  label: string;
  i18nKey: string;
  Icon: React.ElementType;
  placeholder: string;
  color: string;
  bgColor: string;
  darkColor?: string;
  darkBgColor?: string;
}

/* ─── Platform Config ─────────────────────────────────────── */
const PLATFORMS: Platform[] = [
  {
    key: "github",
    label: "GitHub",
    i18nKey: "portfolio.social.github",
    Icon: Github,
    placeholder: "https://github.com/username",
    color: "#1f2328",
    bgColor: "rgba(31,35,40,.08)",
    darkColor: "#e6edf3",
    darkBgColor: "rgba(230,237,243,.10)",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    i18nKey: "portfolio.social.linkedin",
    Icon: Linkedin,
    placeholder: "https://linkedin.com/in/username",
    color: "#0a66c2",
    bgColor: "rgba(10,102,194,.08)",
  },
  {
    key: "twitter",
    label: "Twitter / X",
    i18nKey: "portfolio.social.twitter",
    Icon: Twitter,
    placeholder: "https://twitter.com/username",
    color: "#1d9bf0",
    bgColor: "rgba(29,155,240,.08)",
  },
  {
    key: "website",
    label: "Website",
    i18nKey: "portfolio.social.website",
    Icon: Globe,
    placeholder: "https://yourwebsite.com",
    color: "#16a34a",
    bgColor: "rgba(22,163,74,.08)",
  },
  {
    key: "youtube",
    label: "YouTube",
    i18nKey: "portfolio.social.youtube",
    Icon: Youtube,
    placeholder: "https://youtube.com/@username",
    color: "#dc2626",
    bgColor: "rgba(220,38,38,.08)",
  },
  {
    key: "instagram",
    label: "Instagram",
    i18nKey: "portfolio.social.instagram",
    Icon: Instagram,
    placeholder: "https://instagram.com/username",
    color: "#db2777",
    bgColor: "rgba(219,39,119,.08)",
  },
  {
    key: "facebook",
    label: "Facebook",
    i18nKey: "portfolio.social.facebook",
    Icon: Facebook,
    placeholder: "https://facebook.com/username",
    color: "#1877f2",
    bgColor: "rgba(24,119,242,.08)",
  },
  {
    key: "dribbble",
    label: "Dribbble",
    i18nKey: "portfolio.social.dribbble",
    Icon: Dribbble,
    placeholder: "https://dribbble.com/username",
    color: "#ea4c89",
    bgColor: "rgba(234,76,137,.08)",
  },
];

/* ─── Helpers ─────────────────────────────────────────────── */
function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/* ─── Sub-components ──────────────────────────────────────── */

/** Progress bar strip at the top */
function ProgressStrip({ filled, total }: { filled: number; total: number }) {
  const pct = Math.round((filled / total) * 100);
  return (
    <div className="pf-progress-strip">
      <div className="pf-progress-strip__row">
        <span className="pf-progress-strip__label">
          Profile completeness
        </span>
        <span className="pf-progress-strip__pct">{pct}%</span>
      </div>
      <div className="pf-progress-track" style={{ height: "5px" }}>
        <div
          className="pf-progress-fill"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

/** Single platform input field */
function PlatformField({
  platform,
  value,
  onChange,
}: {
  platform: Platform;
  value: string;
  onChange: (val: string) => void;
}) {
  const { t } = useI18n();
  const active = value.trim().length > 0;
  const valid = active && isValidUrl(value.trim());
  const invalid = active && !valid;

  const accentStyle = active
    ? ({ "--pf-primary": platform.color } as React.CSSProperties)
    : {};

  return (
    <div
      className={[
        "pf-group",
        active ? "pf-group--active" : "",
        invalid ? "pf-group--invalid" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        "--active-color": platform.color,
        "--active-color-dark": platform.darkColor ?? platform.color,
        "--active-bg-dark": platform.darkBgColor ?? platform.bgColor,
      } as React.CSSProperties}
    >
      {/* Label */}
      <label
        className="pf-label"
        htmlFor={`social-${platform.key}`}
      >
        <span className="pf-label__icon-wrap">
          <platform.Icon size={13} />
        </span>
        {t(platform.i18nKey)}
        {valid && (
          <CheckCircle2
            size={13}
            style={{ color: "#16a34a", marginLeft: "auto" }}
            aria-label="Valid URL"
          />
        )}
      </label>

      {/* Animated border + input */}
      <div className="pf-wrap" style={accentStyle}>
        <div className="pf-surface pf-surface--with-action">
          <input
            id={`social-${platform.key}`}
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={platform.placeholder}
            className="pf-input"
            aria-invalid={invalid}
            autoComplete="off"
            spellCheck={false}
          />
          {/* Open link button — only shown when valid */}
          {valid && (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="pf-surface__action"
              style={{ color: platform.color }}
              aria-label={`Open ${platform.label}`}
              tabIndex={0}
            >
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>

      {/* Inline validation hint */}
      {invalid && (
        <p className="pf-field-hint pf-field-hint--error" role="alert">
          Enter a valid URL starting with https://
        </p>
      )}
    </div>
  );
}

/** Preview chip for a filled platform */
function PreviewChip({ platform, value }: { platform: Platform; value: string }) {
  const { t } = useI18n();
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="pf-preview-chip"
          style={
            {
              "--chip-color": platform.color,
              "--chip-bg": platform.bgColor,
              "--chip-color-dark": platform.darkColor ?? platform.color,
              "--chip-bg-dark": platform.darkBgColor ?? platform.bgColor,
            } as React.CSSProperties
          }
        >
          <platform.Icon size={13} />
          {t(platform.i18nKey)}
        </a>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="pf-tooltip-content" side="top" sideOffset={5}>
          {value}
          <Tooltip.Arrow className="pf-tooltip-arrow" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/* ─── Main Component ──────────────────────────────────────── */
export default function SocialLinksSection({
  data,
  onChange,
}: SocialLinksSectionProps) {
  const { t } = useI18n();

  /** Update a single platform in the socialLinks map */
  const set = (platform: keyof SocialLinks, value: string) =>
    onChange({ socialLinks: { ...data.socialLinks, [platform]: value } });

  const filledPlatforms = PLATFORMS.filter(
    (p) => data.socialLinks?.[p.key]?.trim()
  );
  const filledCount = filledPlatforms.length;
  const validCount = filledPlatforms.filter((p) =>
    isValidUrl(data.socialLinks?.[p.key] ?? "")
  ).length;

  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="pf-social-section">

        {/* ── Section header ── */}
        <div className="pf-social-section__header">
          <div className="pf-social-section__title">
            <span className="pf-section-title-icon">
              <Share2 size={14} />
            </span>
            {t("portfolio.social.title")}
          </div>

          <div className="pf-social-section__badges">
            {validCount > 0 && (
              <span className="pf-badge pf-badge--success">
                <span className="pf-badge__dot" />
                {validCount} valid
              </span>
            )}
            <span className="pf-badge pf-badge--primary">
              {filledCount} / {PLATFORMS.length}{" "}
              {t("portfolio.settings.socialLinksCount")}
            </span>
          </div>
        </div>

        {/* ── Progress ── */}
        <ProgressStrip filled={filledCount} total={PLATFORMS.length} />

        {/* ── Platform grid ── */}
        <div className="pf-social-grid">
          {PLATFORMS.map((platform) => (
            <PlatformField
              key={platform.key}
              platform={platform}
              value={data.socialLinks?.[platform.key] ?? ""}
              onChange={(val) => set(platform.key, val)}
            />
          ))}
        </div>

        {/* ── Tip ── */}
        <div className="pf-tip-box">
          <Lightbulb size={15} className="pf-tip-box__icon" />
          <p>
            <strong>{t("common.tip")}:</strong> {t("portfolio.social.tip")}
          </p>
        </div>

        {/* ── Live preview ── */}
        <div className="pf-preview-panel">
          <p className="pf-preview-panel__label">
            {t("portfolio.social.preview")}
          </p>

          {filledCount === 0 ? (
            <p className="pf-preview-panel__empty">
              Fill in at least one link to see the preview
            </p>
          ) : (
            <div className="pf-preview-chips">
              {filledPlatforms.map((platform) => (
                <PreviewChip
                  key={platform.key}
                  platform={platform}
                  value={data.socialLinks![platform.key]!}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Tooltip.Provider>
  );
}