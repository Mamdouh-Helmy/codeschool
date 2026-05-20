"use client";
import { Eye, EyeOff, Palette, Layout, BarChart2, AlertTriangle } from "lucide-react";
import { PortfolioFormData, PortfolioSettings } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";

interface SettingsSectionProps {
  data: PortfolioFormData;
  onChange: (updates: Partial<PortfolioFormData>) => void;
}

const THEMES = [
  { value: "light", label: "Light", desc: "Clean & professional", swatch: "#f9fafb" },
  { value: "dark", label: "Dark", desc: "Modern & sleek", swatch: "#1e293b" },
  { value: "blue", label: "Blue", desc: "Professional accent", swatch: "linear-gradient(135deg,#2563eb,#60a5fa)" },
  { value: "green", label: "Green", desc: "Fresh & vibrant", swatch: "linear-gradient(135deg,#16a34a,#4ade80)" },
];

const LAYOUTS = [
  { value: "standard", label: "Standard", desc: "Traditional layout" },
  { value: "minimal", label: "Minimal", desc: "Clean & focused" },
  { value: "creative", label: "Creative", desc: "Modern & dynamic" },
];

export default function SettingsSection({ data, onChange }: SettingsSectionProps) {
  const { t } = useI18n();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const portfolioUrl = `${origin}/portfolio/${data.userId}`;

  const set = (field: keyof PortfolioSettings, value: string) =>
    onChange({ settings: { ...data.settings, [field]: value } });

  const socialCount = Object.values(data.socialLinks || {}).filter(u => u?.trim()).length;

  return (
    <div className="space-y-5">

      {/* ── Visibility ─────────────────────────────────────────── */}
      <div className="pf-section">
        <div className="pf-section-header">
          <div className="pf-section-title">
            <div className="pf-section-title-icon">
              {data.isPublished ? <Eye size={15} /> : <EyeOff size={15} />}
            </div>
            {t("portfolio.settings.visibility")}
          </div>
          {data.isPublished && (
            <span className="pf-live-badge">
              <span className="pf-live-dot" />
              Live
            </span>
          )}
        </div>

        <div className="pf-section-body">
          <div className={`pf-row ${data.isPublished ? "active" : ""}`}>
            <div>
              <h4 className="pf-row-title">{t("portfolio.settings.public")} {t("portfolio.settings.portfolio")}</h4>
              <p className="pf-row-desc">
                {data.isPublished ? t("portfolio.settings.publicDescription") : t("portfolio.settings.privateDescription")}
              </p>
            </div>
            <div
              className={`sw ${data.isPublished ? "on" : ""}`}
              role="switch"
              aria-checked={data.isPublished}
              tabIndex={0}
              onClick={() => onChange({ isPublished: !data.isPublished })}
              onKeyDown={(e) => e.key === " " && onChange({ isPublished: !data.isPublished })}
            />
          </div>

          {data.isPublished && data._id && (
            <div className="pf-url-block">
              <p className="pf-url-hint">{t("portfolio.settings.shareLink")}</p>
              <div className="pf-url-row">
                <div className="pf-wrap">
                  <div className="pf-surface">
                    <input className="pf-input" type="text" readOnly value={portfolioUrl} />
                  </div>
                </div>
                <button
                  className="pf-copy-btn"
                  onClick={() => navigator.clipboard.writeText(portfolioUrl)}
                >
                  {t("portfolio.settings.copy")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Theme & Appearance ──────────────────────────────────── */}
      <div className="pf-section">
        <div className="pf-section-header">
          <div className="pf-section-title">
            <div className="pf-section-title-icon"><Palette size={15} /></div>
            {t("portfolio.settings.theme")} &amp; {t("portfolio.settings.appearance")}
          </div>
        </div>

        <div className="pf-section-body">
          <div>
            <span className="pf-label">{t("portfolio.settings.colorTheme")}</span>
            <div className="pf-theme-grid">
              {THEMES.map(th => (
                <button
                  key={th.value}
                  onClick={() => set("theme", th.value)}
                  className={`pf-theme-card ${data.settings.theme === th.value ? "selected" : ""}`}
                >
                  <div className="pf-theme-swatch" style={{ background: th.swatch }} />
                  <div className="pf-theme-label">{th.label}</div>
                  <div className="pf-theme-desc">{th.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="pf-label">{t("portfolio.settings.layoutStyle")}</span>
            <div className="pf-layout-grid">
              {LAYOUTS.map(lo => (
                <button
                  key={lo.value}
                  onClick={() => set("layout", lo.value)}
                  className={`pf-layout-card ${data.settings.layout === lo.value ? "selected" : ""}`}
                >
                  <div className="pf-layout-preview">
                    <Layout size={22} style={{ opacity: .45, color: "var(--pf-muted)" }} />
                  </div>
                  <div className="pf-layout-label">{lo.label}</div>
                  <div className="pf-layout-desc">{lo.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Statistics ──────────────────────────────────────────── */}
      {data._id && (
        <div className="pf-section">
          <div className="pf-section-header">
            <div className="pf-section-title">
              <div className="pf-section-title-icon"><BarChart2 size={15} /></div>
              {t("portfolio.settings.statistics")}
            </div>
            <span style={{ fontSize: 11, color: "var(--pf-muted)" }}>All time</span>
          </div>
          <div className="pf-section-body">
            <div className="pf-stats-grid">
              {[
                { value: data.views, label: t("portfolio.settings.totalViews") },
                { value: data.skills?.length ?? 0, label: t("portfolio.settings.skillsCount") },
                { value: data.projects?.length ?? 0, label: t("portfolio.settings.projectsCount") },
                { value: socialCount, label: t("portfolio.settings.socialLinksCount") },
              ].map((s, i) => (
                <div key={i} className="pf-stat">
                  <div className="pf-stat-value">{s.value}</div>
                  <div className="pf-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Danger Zone ─────────────────────────────────────────── */}
      <div className="pf-danger-section">
        <div className="pf-danger-header">
          <div className="pf-danger-title">
            <AlertTriangle size={15} />
            {t("portfolio.settings.dangerZone")}
          </div>
        </div>
        <div className="pf-danger-body">
          <div className="pf-danger-row">
            <div>
              <h4>{t("portfolio.settings.reset")}</h4>
              <p>{t("portfolio.settings.resetWarning")}</p>
            </div>
            <button
              className="pf-reset-btn"
              onClick={() => {
                if (confirm(t("portfolio.settings.resetConfirm"))) {
                  onChange({ skills: [], projects: [], socialLinks: {}, contactInfo: {}, settings: { theme: "light", layout: "standard" } });
                }
              }}
            >
              {t("portfolio.settings.reset")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}