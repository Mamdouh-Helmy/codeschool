"use client";
import { useState, useEffect } from "react";
import {
  Save, Eye, EyeOff, Settings, User, Code, FolderGit2,
  Link2, LayoutDashboard, Menu, X, ExternalLink, RefreshCw,
  CheckCircle2, TrendingUp, Globe, ChevronRight, Loader2,
  Sparkles, Award, Briefcase, GraduationCap, Wrench,
} from "lucide-react";
import BasicInfoSection from "./sections/BasicInfoSection";
import SkillsSection from "./sections/SkillsSection";
import ProjectsSection from "./sections/ProjectsSection";
import SocialLinksSection from "./sections/SocialLinksSection";
import SettingsSection from "./sections/SettingsSection";
import CertificatesSection from "./sections/CertificatesSection";
import ExperienceSection from "./sections/ExperienceSection";
import EducationSection from "./sections/EducationSection";
import ServicesSection from "./sections/ServicesSection";
import { Portfolio, PortfolioFormData } from "@/types/portfolio";
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
  { id: "basic", label: "portfolio.builder.basicInfo", icon: User, description: "portfolio.builder.basicInfoDesc" },
  { id: "experience", label: "portfolio.builder.experience", icon: Briefcase, description: "portfolio.builder.experienceDesc" },
  { id: "education", label: "portfolio.builder.education", icon: GraduationCap, description: "portfolio.builder.educationDesc" },
  { id: "skills", label: "portfolio.builder.skills", icon: Code, description: "portfolio.builder.skillsDesc" },
  { id: "projects", label: "portfolio.builder.projects", icon: FolderGit2, description: "portfolio.builder.projectsDesc" },
  { id: "services", label: "portfolio.builder.services", icon: Wrench, description: "portfolio.builder.servicesDesc" },
  { id: "certificates", label: "portfolio.builder.certificates", icon: Award, description: "portfolio.builder.certificatesDesc" },
  { id: "social", label: "portfolio.builder.socialLinks", icon: Link2, description: "portfolio.builder.socialLinksDesc" },
  { id: "settings", label: "portfolio.builder.settings", icon: Settings, description: "portfolio.builder.settingsDesc" },
];

const DEFAULT_STATS = { yearsOfExperience: 0, codeCommits: 0 };

/* ── Reusable Tailwind class strings (kept out of JSX to avoid repetition) ── */
const NAV_ITEM_BASE =
  "flex items-center gap-2.5 px-3 py-[9px] rounded-lg cursor-pointer border-none bg-transparent " +
  "text-[13px] w-full text-left relative transition-colors duration-150 " +
  "text-[#4a5568] dark:text-darkmuted hover:bg-[#f1f3f5] dark:hover:bg-dark_input hover:text-[#1a202c] dark:hover:text-white";
const NAV_ITEM_ACTIVE = "bg-primary/[0.18] text-primary hover:bg-primary/[0.18] hover:text-primary";

const BTN_PRIMARY =
  "flex items-center justify-center gap-[7px] w-full px-4 py-2.5 text-white border-none rounded-lg " +
  "text-[13px] font-semibold font-inherit cursor-pointer transition-colors duration-150 active:scale-[0.98] " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const BTN_OUTLINE =
  "flex items-center justify-center gap-[7px] w-full px-4 py-2 bg-transparent rounded-lg text-xs font-inherit " +
  "border transition-all duration-150 cursor-pointer";

const BTN_GHOST =
  "flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-transparent rounded-lg text-[11px] font-inherit " +
  "border border-[#e2e8f0] dark:border-dark_border text-[#4a5568] dark:text-darkmuted cursor-pointer transition-all duration-150 " +
  "hover:text-[#1a202c] dark:hover:text-white hover:border-[#cbd5e0] dark:hover:border-dark_border hover:bg-[#f1f3f5] dark:hover:bg-dark_input";

export default function PortfolioBuilderUI({ portfolio, onSave, saving }: PortfolioBuilderUIProps) {
  const { t } = useI18n();
  const [activeSection, setActiveSection] = useState<string>("basic");

  const [formData, setFormData] = useState<PortfolioFormData>({
    title: t("portfolio.basic.titlePlaceholder"),
    description: "",
    ownerRole: "",
    ownerImage: "",
    cvUrl: "",
    stats: DEFAULT_STATS,
    skills: [],
    projects: [],
    certificates: [],
    experience: [],
    education: [],
    services: [],
    socialLinks: {},
    contactInfo: { email: "", phone: "", location: "" },
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
      setFormData({
        title: portfolio.title || t("portfolio.basic.titlePlaceholder"),
        description: portfolio.description || "",
        ownerRole: portfolio.ownerRole || "",
        ownerImage: portfolio.ownerImage || "",
        cvUrl: (portfolio as any).cvUrl || "",
        stats: (portfolio as any).stats || DEFAULT_STATS,
        skills: portfolio.skills || [],
        projects: portfolio.projects || [],
        certificates: portfolio.certificates || [],
        experience: portfolio.experience || [],
        education: portfolio.education || [],
        services: portfolio.services || [],
        socialLinks: portfolio.socialLinks || {},
        contactInfo: portfolio.contactInfo || { email: "", phone: "", location: "" },
        isPublished: portfolio.isPublished || false,
        views: portfolio.views || 0,
        settings: portfolio.settings || { theme: "dark", layout: "standard" },
        userId:
          (portfolio.userId as any)?._id ||
          (portfolio.userId as any)?.id ||
          (portfolio.userId as string) || "",
      });
    }
  }, [portfolio, t]);

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

  const getPortfolioId = (): string | null => {
    if (!portfolio) return null;
    return (portfolio as any)._id || (portfolio as any).id || null;
  };

  const portfolioId = getPortfolioId();
  // ✅ إضافة theme إلى query param لتمريره إلى صفحة المعاينة
  const previewUrl = portfolioId
    ? `/portfolio/${portfolioId}?theme=${formData.settings?.theme || 'dark'}`
    : null;

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
      case "basic": return <BasicInfoSection    {...props} />;
      case "experience": return <ExperienceSection   {...props} />;
      case "education": return <EducationSection    {...props} />;
      case "skills": return <SkillsSection       {...props} />;
      case "projects": return <ProjectsSection     {...props} />;
      case "services": return <ServicesSection     {...props} />;
      case "certificates": return <CertificatesSection {...props} />;
      case "social": return <SocialLinksSection  {...props} />;
      case "settings": return <SettingsSection     {...props} />;
      default: return <BasicInfoSection    {...props} />;
    }
  };

  const saveButtonClasses = `${BTN_PRIMARY} ${saveSuccess ? "bg-[#238636] hover:bg-[#238636]" : "bg-primary hover:bg-orange-deep"}`;

  return (
    <div className="pb-root">
      {/* Mobile overlay */}
      <div
        className={mobileMenuOpen ? "fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] lg:hidden" : "hidden"}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Header */}
      <div className="flex lg:hidden items-center justify-between px-4 py-3 bg-white dark:bg-darklight border-b border-[#e2e8f0] dark:border-dark_border fixed top-0 left-0 right-0 z-[80]">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="bg-transparent border border-[#e2e8f0] dark:border-dark_border rounded-lg p-1.5 text-[#1a202c] dark:text-white cursor-pointer flex items-center"
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <span className="text-sm font-semibold text-[#1a202c] dark:text-white flex items-center gap-[7px]">
          <LayoutDashboard size={16} className="text-primary" />
          {t("portfolio.builder.title")}
        </span>
        <button
          onClick={showPreview ? handleSaveAndRefreshPreview : handleSave}
          disabled={saving}
          className={`${saveButtonClasses} w-auto px-3.5 py-1.5 text-xs`}
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={13} /> : <Save size={13} />}
          {saving ? t("portfolio.builder.saving") : saveSuccess ? t("portfolio.status.saved") || "Saved!" : t("portfolio.builder.save")}
        </button>
      </div>

      <div className="flex h-screen bg-[#f8f9fa] dark:bg-darkmode font-sans text-[#1a202c] dark:text-white overflow-hidden">
        {/* Sidebar */}
        <aside
          className={
            "w-[280px] lg:w-60 bg-white dark:bg-darklight border-r border-[#e2e8f0] dark:border-dark_border " +
            "flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out z-[100] " +
            "fixed inset-y-0 left-0 lg:static " +
            (mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")
          }
        >
          <div className="flex items-center gap-2.5 px-[18px] pt-5 pb-4 border-b border-[#e2e8f0] dark:border-dark_border">
            <div className="w-[34px] h-[34px] bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <LayoutDashboard size={17} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#1a202c] dark:text-white tracking-tight">
                {t("portfolio.builder.title")}
              </div>
              <div className="text-[10px] text-[#4a5568] dark:text-darkmuted tracking-wide uppercase mt-0.5">
                Portfolio Studio
              </div>
            </div>
          </div>

          <nav className="flex-1 p-2.5 flex flex-col gap-0.5 overflow-y-auto">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => { setActiveSection(section.id); setMobileMenuOpen(false); }}
                  className={`${NAV_ITEM_BASE} ${isActive ? NAV_ITEM_ACTIVE : ""}`}
                >
                  <Icon size={16} className={`flex-shrink-0 ${isActive ? "text-primary" : "text-[#4a5568] dark:text-darkmuted"}`} />
                  <span className={isActive ? "font-semibold" : "font-normal"}>{t(section.label)}</span>
                  {isActive && <ChevronRight size={13} className="ml-auto opacity-60 text-primary" />}
                  {isActive && (
                    <span className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-r-[3px] bg-primary" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="px-2.5 py-3.5 border-t border-[#e2e8f0] dark:border-dark_border flex flex-col gap-2">
            <div className="flex items-center justify-between px-1 pb-2 border-b border-[#e2e8f0] dark:border-dark_border">
              <div className="flex items-center gap-1.5 text-[11px] text-[#4a5568] dark:text-darkmuted">
                <span
                  className={
                    "w-1.5 h-1.5 rounded-full " +
                    (formData.isPublished
                      ? "bg-[#3fb950] shadow-[0_0_6px_#3fb950]"
                      : "bg-[#a0aec0] dark:bg-dark_border")
                  }
                />
                {formData.isPublished ? t("portfolio.builder.published") || "Published" : t("portfolio.builder.draft") || "Draft"}
              </div>
              {formData.views > 0 && (
                <div className="flex items-center gap-1.5 text-[11px] text-[#4a5568] dark:text-darkmuted">
                  <TrendingUp size={12} />
                  {formData.views.toLocaleString()} {t("portfolio.builder.views") || "views"}
                </div>
              )}
            </div>

            <button
              onClick={showPreview ? handleSaveAndRefreshPreview : handleSave}
              disabled={saving}
              className={saveButtonClasses}
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={15} /> : <Save size={15} />}
              {saving ? t("portfolio.builder.saving") : saveSuccess ? t("portfolio.status.saved") || "Saved!" : t("portfolio.builder.save")}
            </button>

            {previewUrl ? (
              <>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={
                    BTN_OUTLINE +
                    " " +
                    (showPreview
                      ? "border-[#ff6437] text-[#ff6437] bg-[#ff6437]/[0.08]"
                      : "border-[#e2e8f0] dark:border-dark_border text-[#4a5568] dark:text-darkmuted hover:border-primary hover:text-primary hover:bg-primary/[0.08]")
                  }
                >
                  {showPreview ? <><EyeOff size={14} />{t("portfolio.builder.hidePreview") || "Hide Preview"}</> : <><Eye size={14} />{t("portfolio.builder.livePreview") || "Live Preview"}</>}
                </button>
                <button onClick={handleOpenInNewTab} className={BTN_GHOST}>
                  <ExternalLink size={12} />
                  {t("portfolio.builder.openInNewTab") || "Open in New Tab"}
                </button>
              </>
            ) : (
              <div className="text-[11px] text-[#a0aec0] dark:text-dark_border text-center bg-[#f1f3f5] dark:bg-dark_input border border-dashed border-[#e2e8f0] dark:border-dark_border rounded-lg px-3.5 py-2.5 leading-relaxed">
                <Sparkles size={13} className="inline mr-1 align-middle" />
                {t("portfolio.builder.saveToPreview") || "Save your portfolio to enable live preview"}
              </div>
            )}
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 pt-[57px] lg:pt-0">
          <div className="bg-white dark:bg-darklight border-b border-[#e2e8f0] dark:border-dark_border px-6 py-3.5 flex items-center justify-between gap-3 flex-shrink-0">
            <div className="flex flex-col gap-0.5">
              <div className="text-[15px] font-semibold text-[#1a202c] dark:text-white">
                {t(activeSecData?.label || "portfolio.builder.basicInfo")}
              </div>
              <div className="text-xs text-[#4a5568] dark:text-darkmuted">
                {t(activeSecData?.description || "portfolio.builder.basicInfoDesc")}
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-[11px] text-[#4a5568] dark:text-darkmuted">
                <Globe size={11} />
                <span>{t("portfolio.builder.title")}</span>
                <ChevronRight size={10} />
                <span className="text-primary font-medium">{t(activeSecData?.label || "portfolio.builder.basicInfo")}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            <div
              className="flex-1 overflow-y-auto px-4 py-5 md:px-8 md:py-7 transition-[width] duration-300 ease-in-out"
              style={{ width: showPreview && previewUrl ? "50%" : "100%" }}
            >
              <div className="max-w-[720px] mx-auto w-full">
                <div className="mb-7">
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase text-primary bg-primary/[0.18] border border-primary/25 px-2.5 py-1 rounded-full mb-2.5">
                    {activeSecData && (() => { const Icon = activeSecData.icon; return <Icon size={11} />; })()}
                    {t(activeSecData?.label || "portfolio.builder.basicInfo")}
                  </div>
                  <h2 className="text-[22px] font-bold text-[#1a202c] dark:text-white tracking-tight">
                    {t(activeSecData?.label || "portfolio.builder.basicInfo")}
                  </h2>
                  <p className="text-[13px] text-[#4a5568] dark:text-darkmuted mt-1 leading-relaxed">
                    {t(activeSecData?.description || "portfolio.builder.basicInfoDesc")}
                  </p>
                </div>
                {renderSection()}
              </div>
            </div>

            {showPreview && previewUrl && (
              <div className="w-1/2 border-l border-[#e2e8f0] dark:border-dark_border flex flex-col bg-[#f8f9fa] dark:bg-darkmode flex-shrink-0">
                <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-darklight border-b border-[#e2e8f0] dark:border-dark_border flex-shrink-0">
                  <div className="flex gap-[5px] items-center">
                    <div className="w-[11px] h-[11px] rounded-full bg-[#ff5f57]" />
                    <div className="w-[11px] h-[11px] rounded-full bg-[#febc2e]" />
                    <div className="w-[11px] h-[11px] rounded-full bg-[#28c840]" />
                  </div>
                  <div className="flex-1 mx-2.5 bg-[#f1f3f5] dark:bg-dark_input border border-[#e2e8f0] dark:border-dark_border rounded-md px-2.5 py-1 text-[11px] text-[#4a5568] dark:text-darkmuted font-mono whitespace-nowrap overflow-hidden text-ellipsis">
                    {previewUrl}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={handleRefreshPreview} className={`${BTN_GHOST} px-2 py-1`} title="Refresh">
                      <RefreshCw size={13} className={previewLoading ? "animate-spin" : ""} />
                    </button>
                    <button onClick={handleOpenInNewTab} className={`${BTN_GHOST} px-2 py-1`} title="Open">
                      <ExternalLink size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 relative overflow-hidden">
                  {previewLoading && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#f8f9fa] dark:bg-darkmode gap-2.5">
                      <div className="w-8 h-8 border-[2.5px] border-[#e2e8f0] dark:border-dark_border border-t-primary rounded-full animate-spin" />
                      <div className="text-xs text-[#4a5568] dark:text-darkmuted">
                        {t("portfolio.builder.loadingPreview") || "Loading preview…"}
                      </div>
                    </div>
                  )}
                  <iframe
                    key={iframeKey}
                    src={previewUrl}
                    className="w-full h-full border-none"
                    title="Portfolio Live Preview"
                    onLoad={() => setPreviewLoading(false)}
                    onError={() => setPreviewLoading(false)}
                  />
                </div>

                <div className="px-4 py-2 text-center bg-white dark:bg-darklight border-t border-[#e2e8f0] dark:border-dark_border text-[11px] text-[#a0aec0] dark:text-dark_border flex-shrink-0">
                  {t("portfolio.builder.previewNote") || "Save changes then refresh to see the latest version"}
                </div>
              </div>
            )}
          </div>

          {showPreview && previewUrl && (
            <div className="block lg:hidden px-4 py-2.5 bg-secondary/[0.15] border-t border-secondary/40 text-xs text-[#56d3ba] text-center">
              Live preview is available on large screens only.{" "}
              <button onClick={handleOpenInNewTab} className="bg-transparent border-none text-inherit font-inherit underline cursor-pointer">
                {t("portfolio.builder.openInNewTab") || "Open in new tab"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}