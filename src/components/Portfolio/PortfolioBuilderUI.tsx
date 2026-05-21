"use client";
import { useState, useEffect } from "react";
import {
  Save,
  Eye,
  EyeOff,
  Settings,
  User,
  Code,
  FolderGit2,
  Link2,
  LayoutDashboard,
  Menu,
  X,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  TrendingUp,
  Globe,
  ChevronRight,
  Loader2,
  Sparkles,
  Award,
} from "lucide-react";
import BasicInfoSection from "./sections/BasicInfoSection";
import SkillsSection from "./sections/SkillsSection";
import ProjectsSection from "./sections/ProjectsSection";
import SocialLinksSection from "./sections/SocialLinksSection";
import SettingsSection from "./sections/SettingsSection";
import CertificatesSection from "./sections/CertificatesSection";
import { Portfolio, PortfolioFormData, Certificate } from "@/types/portfolio"; // ✅ استيراد Certificate
import { useI18n } from "@/i18n/I18nProvider";

interface PortfolioBuilderUIProps {
  portfolio: Portfolio | null;
  onSave: (portfolioData: PortfolioFormData) => Promise<boolean>;
  saving: boolean;
}

interface Section {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  description: string;
}

const SECTIONS: Section[] = [
  {
    id: "basic",
    label: "portfolio.builder.basicInfo",
    icon: User,
    description: "portfolio.builder.basicInfoDesc",
  },
  {
    id: "skills",
    label: "portfolio.builder.skills",
    icon: Code,
    description: "portfolio.builder.skillsDesc",
  },
  {
    id: "projects",
    label: "portfolio.builder.projects",
    icon: FolderGit2,
    description: "portfolio.builder.projectsDesc",
  },
  {
    id: "certificates",
    label: "portfolio.builder.certificates",
    icon: Award,
    description: "portfolio.builder.certificatesDesc",
  },
  {
    id: "social",
    label: "portfolio.builder.socialLinks",
    icon: Link2,
    description: "portfolio.builder.socialLinksDesc",
  },
  {
    id: "settings",
    label: "portfolio.builder.settings",
    icon: Settings,
    description: "portfolio.builder.settingsDesc",
  },
];

export default function PortfolioBuilderUI({
  portfolio,
  onSave,
  saving,
}: PortfolioBuilderUIProps) {
  const { t } = useI18n();
  const [activeSection, setActiveSection] = useState<string>("basic");

  // ✅ FIX: certificates مضاف بشكل صريح في الـ initial state
  const [formData, setFormData] = useState<PortfolioFormData>({
    title: t("portfolio.basic.titlePlaceholder"),
    description: "",
    skills: [],
    projects: [],
    certificates: [],
    socialLinks: {},
    contactInfo: {},
    isPublished: false,
    views: 0,
    settings: { theme: "dark", layout: "standard" },
    userId: "",
  });

  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (portfolio) {
      // ✅ FIX: استخدام Portfolio.certificates مباشرة (بدون as any) لأن النوع معرّف صح
      setFormData({
        title: portfolio.title || t("portfolio.basic.titlePlaceholder"),
        description: portfolio.description || "",
        skills: portfolio.skills || [],
        projects: portfolio.projects || [],
        certificates: portfolio.certificates || [],
        socialLinks: portfolio.socialLinks || {},
        contactInfo: portfolio.contactInfo || {},
        isPublished: portfolio.isPublished || false,
        views: portfolio.views || 0,
        settings: portfolio.settings || { theme: "dark", layout: "standard" },
        userId:
          (portfolio.userId as any)?.username ||
          (portfolio.userId as string) ||
          "",
      });
    }
  }, [portfolio, t]);

  // ✅ FIX: updateFormData يقبل Partial<PortfolioFormData> بشكل صريح يشمل certificates
  const updateFormData = (updates: Partial<PortfolioFormData>): void => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async (): Promise<void> => {
    const success = await onSave(formData);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  const getPreviewUsername = (): string | null => {
    if (!portfolio) return null;
    const userId = portfolio.userId;
    if (typeof userId === "object" && userId !== null) {
      return (userId as any).username || null;
    }
    return null;
  };

  const previewUsername = getPreviewUsername();
  const previewUrl = previewUsername ? `/portfolio/${previewUsername}` : null;

  const handleOpenInNewTab = () => {
    if (previewUrl) window.open(previewUrl, "_blank");
  };

  const handleSaveAndRefreshPreview = async () => {
    const success = await onSave(formData);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      if (showPreview) {
        setPreviewLoading(true);
        setIframeKey((prev) => prev + 1);
      }
    }
  };

  const handleRefreshPreview = () => {
    setPreviewLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  const activeSecData = SECTIONS.find((s) => s.id === activeSection);

  const renderSection = (): React.ReactNode => {
    const props = { data: formData, onChange: updateFormData };
    switch (activeSection) {
      case "basic":
        return <BasicInfoSection {...props} />;
      case "skills":
        return <SkillsSection {...props} />;
      case "projects":
        return <ProjectsSection {...props} />;
      case "certificates":
        return <CertificatesSection {...props} />;
      case "social":
        return <SocialLinksSection {...props} />;
      case "settings":
        return <SettingsSection {...props} />;
      default:
        return <BasicInfoSection {...props} />;
    }
  };

  return (
    <>
      {/* ── Brand CSS Variables ───────────────────────────── */}
      <style>{`
        .pb-root {
          --brand:        #ff6700;
          --brand-deep:   #e55a00;
          --brand-coral:  #ff6437;
          --brand-glow:   rgba(255,103,0,.18);
          --teal:         #004d59;
          --teal-light:   rgba(0,77,89,.35);
          --amber:        #feaf00;

          --bg:           #0a0f17;
          --card:         #161b22;
          --input:        #21262d;
          --border:       #30363d;
          --border-hover: #484f58;

          --txt-1:  #e6edf3;
          --txt-2:  #8b949e;
          --txt-3:  #484f58;

          --sidebar-w: 240px;
          --radius-sm: 8px;
          --radius-md: 10px;
          --radius-lg: 14px;
        }
        .pb-root * { box-sizing: border-box; }

        /* ── Scrollbar ── */
        .pb-root ::-webkit-scrollbar        { width: 4px; height: 4px; }
        .pb-root ::-webkit-scrollbar-track  { background: transparent; }
        .pb-root ::-webkit-scrollbar-thumb  { background: var(--border); border-radius: 4px; }
        .pb-root ::-webkit-scrollbar-thumb:hover { background: var(--brand); }

        /* ── Shell ── */
        .pb-shell {
          display: flex;
          height: 100vh;
          background: var(--bg);
          font-family: 'Geist', 'SF Pro Display', system-ui, sans-serif;
          color: var(--txt-1);
          overflow: hidden;
        }

        /* ── Sidebar ── */
        .pb-sidebar {
          width: var(--sidebar-w);
          background: var(--card);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          transition: transform .28s cubic-bezier(.4,0,.2,1);
          z-index: 100;
        }
        @media (max-width: 1023px) {
          .pb-sidebar {
            position: fixed;
            inset-y: 0; left: 0;
            width: 280px;
            transform: translateX(-100%);
          }
          .pb-sidebar.open { transform: translateX(0); }
        }

        /* ── Logo ── */
        .pb-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 20px 18px 16px;
          border-bottom: 1px solid var(--border);
        }
        .pb-logo-mark {
          width: 34px; height: 34px;
          background: var(--brand);
          border-radius: var(--radius-sm);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .pb-logo-text { font-size: 14px; font-weight: 600; color: var(--txt-1); letter-spacing: -.2px; }
        .pb-logo-sub  { font-size: 10px; color: var(--txt-2); letter-spacing: .04em; text-transform: uppercase; margin-top: 1px; }

        /* ── Nav ── */
        .pb-nav { flex: 1; padding: 12px 10px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
        .pb-nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: var(--radius-sm);
          cursor: pointer; border: none; background: none;
          color: var(--txt-2); font-size: 13px; font-family: inherit;
          width: 100%; text-align: left;
          transition: background .15s, color .15s;
          position: relative;
        }
        .pb-nav-item:hover  { background: var(--input); color: var(--txt-1); }
        .pb-nav-item.active { background: var(--brand-glow); color: var(--brand); }
        .pb-nav-item.active::before {
          content: '';
          position: absolute; left: 0; top: 20%; bottom: 20%;
          width: 3px; border-radius: 0 3px 3px 0;
          background: var(--brand);
        }
        .pb-nav-icon { flex-shrink: 0; }
        .pb-nav-item .pb-nav-icon { color: var(--txt-2); }
        .pb-nav-item.active .pb-nav-icon { color: var(--brand); }

        /* ── Sidebar Footer ── */
        .pb-footer {
          padding: 14px 10px;
          border-top: 1px solid var(--border);
          display: flex; flex-direction: column; gap: 8px;
        }
        .pb-stat-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 4px 8px; border-bottom: 1px solid var(--border);
        }
        .pb-stat-chip {
          display: flex; align-items: center; gap: 5px;
          font-size: 11px; color: var(--txt-2);
        }
        .pb-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #3fb950; box-shadow: 0 0 6px #3fb950;
        }
        .pb-dot.offline { background: var(--txt-3); box-shadow: none; }

        /* ── Buttons ── */
        .btn-primary {
          display: flex; align-items: center; justify-content: center; gap: 7px;
          width: 100%; padding: 10px 16px;
          background: var(--brand); color: #fff;
          border: none; border-radius: var(--radius-sm);
          font-size: 13px; font-weight: 600; font-family: inherit;
          cursor: pointer; transition: background .15s, transform .1s;
        }
        .btn-primary:hover  { background: var(--brand-deep); }
        .btn-primary:active { transform: scale(.98); }
        .btn-primary.success { background: #238636; }
        .btn-primary:disabled { opacity: .5; cursor: not-allowed; }

        .btn-outline {
          display: flex; align-items: center; justify-content: center; gap: 7px;
          width: 100%; padding: 8px 16px;
          background: transparent; color: var(--txt-2);
          border: 1px solid var(--border); border-radius: var(--radius-sm);
          font-size: 12px; font-family: inherit;
          cursor: pointer; transition: all .15s;
        }
        .btn-outline:hover { border-color: var(--brand); color: var(--brand); background: var(--brand-glow); }

        .btn-ghost {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          padding: 6px 10px;
          background: transparent; color: var(--txt-2);
          border: 1px solid var(--border); border-radius: var(--radius-sm);
          font-size: 11px; font-family: inherit; cursor: pointer;
          transition: all .15s;
        }
        .btn-ghost:hover { color: var(--txt-1); border-color: var(--border-hover); background: var(--input); }

        /* ── Mobile overlay ── */
        .pb-overlay {
          display: none;
          position: fixed; inset: 0;
          background: rgba(0,0,0,.6);
          backdrop-filter: blur(2px);
          z-index: 90;
        }
        @media (max-width: 1023px) { .pb-overlay.show { display: block; } }

        /* ── Mobile header ── */
        .pb-mobile-header {
          display: none;
          align-items: center; justify-content: space-between;
          padding: 12px 16px;
          background: var(--card); border-bottom: 1px solid var(--border);
          position: fixed; top: 0; left: 0; right: 0; z-index: 80;
        }
        @media (max-width: 1023px) { .pb-mobile-header { display: flex; } }

        /* ── Main ── */
        .pb-main {
          flex: 1; display: flex; flex-direction: column;
          overflow: hidden;
          min-width: 0;
        }
        @media (max-width: 1023px) { .pb-main { padding-top: 57px; } }

        /* ── Topbar ── */
        .pb-topbar {
          background: var(--card);
          border-bottom: 1px solid var(--border);
          padding: 14px 24px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-shrink: 0;
        }
        .pb-topbar-left { display: flex; flex-direction: column; gap: 2px; }
        .pb-section-title { font-size: 15px; font-weight: 600; color: var(--txt-1); }
        .pb-section-sub   { font-size: 12px; color: var(--txt-2); }
        .pb-breadcrumb {
          display: flex; align-items: center; gap: 5px;
          font-size: 11px; color: var(--txt-2);
        }
        .pb-breadcrumb-active { color: var(--brand); font-weight: 500; }

        /* ── Editor ── */
        .pb-editor {
          flex: 1; overflow-y: auto; padding: 28px 32px;
          transition: width .3s ease;
        }
        @media (max-width: 767px) { .pb-editor { padding: 20px 16px; } }

        /* ── Preview panel ── */
        .pb-preview-panel {
          width: 50%; border-left: 1px solid var(--border);
          display: flex; flex-direction: column; background: #0d1117;
          flex-shrink: 0;
        }
        .pb-preview-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 16px;
          background: var(--card); border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .pb-traffic-lights { display: flex; gap: 5px; align-items: center; }
        .pb-tl { width: 11px; height: 11px; border-radius: 50%; }
        .pb-url-bar {
          flex: 1; margin: 0 10px;
          background: var(--input); border: 1px solid var(--border);
          border-radius: 6px; padding: 4px 10px;
          font-size: 11px; color: var(--txt-2); font-family: monospace;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .pb-preview-actions { display: flex; gap: 4px; }
        .pb-preview-footer {
          padding: 8px 16px; text-align: center;
          background: var(--card); border-top: 1px solid var(--border);
          font-size: 11px; color: var(--txt-3);
          flex-shrink: 0;
        }

        /* ── Section wrapper ── */
        .pb-section-wrap { max-width: 720px; margin: 0 auto; width: 100%; }
        .pb-section-header { margin-bottom: 28px; }
        .pb-section-badge {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 600; letter-spacing: .06em;
          text-transform: uppercase; color: var(--brand);
          background: var(--brand-glow); border: 1px solid rgba(255,103,0,.25);
          padding: 4px 10px; border-radius: 20px; margin-bottom: 10px;
        }
        .pb-section-h { font-size: 22px; font-weight: 700; color: var(--txt-1); letter-spacing: -.4px; }
        .pb-section-p { font-size: 13px; color: var(--txt-2); margin-top: 4px; line-height: 1.5; }

        /* ── Spinner ── */
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin .7s linear infinite; }

        /* ── Loading overlay ── */
        .preview-loader {
          position: absolute; inset: 0; z-index: 10;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          background: #0d1117;
          gap: 10px;
        }
        .preview-loader-ring {
          width: 32px; height: 32px;
          border: 2.5px solid var(--border);
          border-top-color: var(--brand);
          border-radius: 50%;
          animation: spin .75s linear infinite;
        }
        .preview-loader-text { font-size: 12px; color: var(--txt-2); }

        /* ── Mobile preview note ── */
        .pb-mobile-preview-note {
          display: none;
          padding: 10px 16px;
          background: rgba(0,77,89,.15);
          border-top: 1px solid rgba(0,77,89,.4);
          font-size: 12px; color: #56d3ba; text-align: center;
        }
        @media (max-width: 1023px) { .pb-mobile-preview-note { display: block; } }
        .pb-mobile-preview-note button { background: none; border: none; color: inherit; font: inherit; text-decoration: underline; cursor: pointer; }

        /* ── No preview placeholder ── */
        .pb-no-preview {
          font-size: 11px; color: var(--txt-3); text-align: center;
          background: var(--input); border: 1px dashed var(--border);
          border-radius: var(--radius-sm); padding: 10px 14px; line-height: 1.5;
        }
      `}</style>

      <div className="pb-root">
        {/* ─── Mobile overlay ─── */}
        <div
          className={`pb-overlay ${mobileMenuOpen ? "show" : ""}`}
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* ─── Mobile Header ─── */}
        <div className="pb-mobile-header">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "6px",
              color: "var(--txt-1)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <span
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--txt-1)",
              display: "flex",
              alignItems: "center",
              gap: "7px",
            }}
          >
            <LayoutDashboard size={16} color="var(--brand)" />
            {t("portfolio.builder.title")}
          </span>

          <button
            onClick={showPreview ? handleSaveAndRefreshPreview : handleSave}
            disabled={saving}
            className="btn-primary"
            style={{ width: "auto", padding: "6px 14px", fontSize: "12px" }}
          >
            {saving ? (
              <Loader2 size={13} className="spin" />
            ) : saveSuccess ? (
              <CheckCircle2 size={13} />
            ) : (
              <Save size={13} />
            )}
            {saving
              ? t("portfolio.builder.saving")
              : saveSuccess
              ? t("portfolio.status.saved") || "Saved!"
              : t("portfolio.builder.save")}
          </button>
        </div>

        <div className="pb-shell">
          {/* ─── Sidebar ─── */}
          <aside className={`pb-sidebar ${mobileMenuOpen ? "open" : ""}`}>
            {/* Logo */}
            <div className="pb-logo">
              <div className="pb-logo-mark">
                <LayoutDashboard size={17} color="#fff" />
              </div>
              <div>
                <div className="pb-logo-text">
                  {t("portfolio.builder.title")}
                </div>
                <div className="pb-logo-sub">Portfolio Studio</div>
              </div>
            </div>

            {/* Nav */}
            <nav className="pb-nav">
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveSection(section.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`pb-nav-item ${isActive ? "active" : ""}`}
                  >
                    <Icon size={16} className="pb-nav-icon" />
                    <span style={{ fontWeight: isActive ? 600 : 400 }}>
                      {t(section.label)}
                    </span>
                    {isActive && (
                      <ChevronRight
                        size={13}
                        style={{ marginLeft: "auto", opacity: 0.6 }}
                        color="var(--brand)"
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="pb-footer">
              <div className="pb-stat-row">
                <div className="pb-stat-chip">
                  <span
                    className={`pb-dot ${
                      formData.isPublished ? "" : "offline"
                    }`}
                  />
                  {formData.isPublished
                    ? t("portfolio.builder.published") || "Published"
                    : t("portfolio.builder.draft") || "Draft"}
                </div>
                {formData.views > 0 && (
                  <div className="pb-stat-chip">
                    <TrendingUp size={12} />
                    {formData.views.toLocaleString()}{" "}
                    {t("portfolio.builder.views") || "views"}
                  </div>
                )}
              </div>

              <button
                onClick={showPreview ? handleSaveAndRefreshPreview : handleSave}
                disabled={saving}
                className={`btn-primary ${saveSuccess ? "success" : ""}`}
              >
                {saving ? (
                  <Loader2 size={15} className="spin" />
                ) : saveSuccess ? (
                  <CheckCircle2 size={15} />
                ) : (
                  <Save size={15} />
                )}
                {saving
                  ? t("portfolio.builder.saving")
                  : saveSuccess
                  ? t("portfolio.status.saved") || "Saved!"
                  : t("portfolio.builder.save")}
              </button>

              {previewUrl ? (
                <>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="btn-outline"
                    style={
                      showPreview
                        ? {
                            borderColor: "var(--brand-coral)",
                            color: "var(--brand-coral)",
                            background: "rgba(255,100,55,.08)",
                          }
                        : {}
                    }
                  >
                    {showPreview ? (
                      <>
                        <EyeOff size={14} />
                        {t("portfolio.builder.hidePreview") || "Hide Preview"}
                      </>
                    ) : (
                      <>
                        <Eye size={14} />
                        {t("portfolio.builder.livePreview") || "Live Preview"}
                      </>
                    )}
                  </button>

                  <button onClick={handleOpenInNewTab} className="btn-ghost">
                    <ExternalLink size={12} />
                    {t("portfolio.builder.openInNewTab") || "Open in New Tab"}
                  </button>
                </>
              ) : (
                <div className="pb-no-preview">
                  <Sparkles
                    size={13}
                    style={{
                      display: "inline",
                      marginRight: "4px",
                      verticalAlign: "middle",
                    }}
                  />
                  {t("portfolio.builder.saveToPreview") ||
                    "Save your portfolio to enable live preview"}
                </div>
              )}
            </div>
          </aside>

          {/* ─── Main ─── */}
          <div className="pb-main">
            {/* Topbar */}
            <div className="pb-topbar">
              <div className="pb-topbar-left">
                <div className="pb-section-title">
                  {t(activeSecData?.label || "portfolio.builder.basicInfo")}
                </div>
                <div className="pb-section-sub">
                  {t(
                    activeSecData?.description ||
                      "portfolio.builder.basicInfoDesc"
                  )}
                </div>
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                {/* Breadcrumb */}
                <div className="pb-breadcrumb">
                  <Globe size={11} />
                  <span>{t("portfolio.builder.title")}</span>
                  <ChevronRight size={10} />
                  <span className="pb-breadcrumb-active">
                    {t(activeSecData?.label || "portfolio.builder.basicInfo")}
                  </span>
                </div>

                {/* Save shortcut (desktop) */}
                <button
                  onClick={
                    showPreview ? handleSaveAndRefreshPreview : handleSave
                  }
                  disabled={saving}
                  className={`btn-primary ${saveSuccess ? "success" : ""}`}
                  style={{
                    width: "auto",
                    padding: "7px 16px",
                    display: "none",
                  }}
                >
                  {saving ? (
                    <Loader2 size={14} className="spin" />
                  ) : saveSuccess ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <Save size={14} />
                  )}
                  {saving
                    ? t("portfolio.builder.saving")
                    : saveSuccess
                    ? t("portfolio.status.saved") || "Saved!"
                    : t("portfolio.builder.save")}
                </button>
              </div>
            </div>

            {/* Content row */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              {/* Editor */}
              <div
                className="pb-editor"
                style={{
                  width: showPreview && previewUrl ? "50%" : "100%",
                }}
              >
                <div className="pb-section-wrap">
                  <div className="pb-section-header">
                    <div className="pb-section-badge">
                      {activeSecData &&
                        (() => {
                          const Icon = activeSecData.icon;
                          return <Icon size={11} />;
                        })()}
                      {t(activeSecData?.label || "portfolio.builder.basicInfo")}
                    </div>
                    <h2 className="pb-section-h">
                      {t(activeSecData?.label || "portfolio.builder.basicInfo")}
                    </h2>
                    <p className="pb-section-p">
                      {t(
                        activeSecData?.description ||
                          "portfolio.builder.basicInfoDesc"
                      )}
                    </p>
                  </div>

                  {renderSection()}
                </div>
              </div>

              {/* Live Preview Panel */}
              {showPreview && previewUrl && (
                <div className="pb-preview-panel">
                  {/* Preview header */}
                  <div className="pb-preview-header">
                    <div className="pb-traffic-lights">
                      <div className="pb-tl" style={{ background: "#ff5f57" }} />
                      <div className="pb-tl" style={{ background: "#febc2e" }} />
                      <div className="pb-tl" style={{ background: "#28c840" }} />
                    </div>
                    <div className="pb-url-bar">{previewUrl}</div>
                    <div className="pb-preview-actions">
                      <button
                        onClick={handleRefreshPreview}
                        className="btn-ghost"
                        title={
                          t("portfolio.builder.refreshPreview") || "Refresh"
                        }
                        style={{ padding: "5px 8px" }}
                      >
                        <RefreshCw
                          size={13}
                          className={previewLoading ? "spin" : ""}
                        />
                      </button>
                      <button
                        onClick={handleOpenInNewTab}
                        className="btn-ghost"
                        title={t("portfolio.builder.openInNewTab") || "Open"}
                        style={{ padding: "5px 8px" }}
                      >
                        <ExternalLink size={13} />
                      </button>
                    </div>
                  </div>

                  {/* iframe */}
                  <div
                    style={{
                      flex: 1,
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {previewLoading && (
                      <div className="preview-loader">
                        <div className="preview-loader-ring" />
                        <div className="preview-loader-text">
                          {t("portfolio.builder.loadingPreview") ||
                            "Loading preview…"}
                        </div>
                      </div>
                    )}
                    <iframe
                      key={iframeKey}
                      src={previewUrl}
                      style={{ width: "100%", height: "100%", border: "none" }}
                      title="Portfolio Live Preview"
                      onLoad={() => setPreviewLoading(false)}
                      onError={() => setPreviewLoading(false)}
                    />
                  </div>

                  {/* Preview footer */}
                  <div className="pb-preview-footer">
                    {t("portfolio.builder.previewNote") ||
                      "Save changes then refresh to see the latest version"}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile preview note */}
            {showPreview && previewUrl && (
              <div className="pb-mobile-preview-note">
                Live preview is available on large screens only.{" "}
                <button onClick={handleOpenInNewTab}>
                  {t("portfolio.builder.openInNewTab") || "Open in new tab"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}