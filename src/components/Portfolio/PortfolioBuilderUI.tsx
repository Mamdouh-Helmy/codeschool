// components/Portfolio/PortfolioBuilderUI.tsx
"use client";
import { useState, useEffect } from "react";
import { 
  Save, 
  Eye, 
  Settings, 
  User, 
  Code, 
  FolderGit2, 
  Link2,
  LayoutDashboard,
  Menu,
  X
} from "lucide-react";
import BasicInfoSection from "./sections/BasicInfoSection";
import SkillsSection from "./sections/SkillsSection";
import ProjectsSection from "./sections/ProjectsSection";
import SocialLinksSection from "./sections/SocialLinksSection";
import SettingsSection from "./sections/SettingsSection";
import PreviewPanel from "./PreviewPanel";
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
  icon: React.ComponentType<{ className?: string }>;
}

const SECTIONS: Section[] = [
  { id: "basic", label: "portfolio.builder.basicInfo", icon: User },
  { id: "skills", label: "portfolio.builder.skills", icon: Code },
  { id: "projects", label: "portfolio.builder.projects", icon: FolderGit2 },
  { id: "social", label: "portfolio.builder.socialLinks", icon: Link2 },
  { id: "settings", label: "portfolio.builder.settings", icon: Settings },
];

export default function PortfolioBuilderUI({ 
  portfolio, 
  onSave, 
  saving 
}: PortfolioBuilderUIProps) {
  const { t } = useI18n();
  const [activeSection, setActiveSection] = useState<string>("basic");
  const [formData, setFormData] = useState<PortfolioFormData>({
    title: t("portfolio.basic.titlePlaceholder"),
    description: "",
    skills: [],
    projects: [],
    socialLinks: {},
    contactInfo: {},
    isPublished: false,
    views: 0,
    settings: {
      theme: "light",
      layout: "standard"
    },
    userId: ""
  });
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    if (portfolio) {
      setFormData({
        title: portfolio.title || t("portfolio.basic.titlePlaceholder"),
        description: portfolio.description || "",
        skills: portfolio.skills || [],
        projects: portfolio.projects || [],
        socialLinks: portfolio.socialLinks || {},
        contactInfo: portfolio.contactInfo || {},
        isPublished: portfolio.isPublished || false,
        views: portfolio.views || 0,
        settings: portfolio.settings || {
          theme: "light",
          layout: "standard"
        },
        userId: portfolio.userId as string || ""
      });
    }
  }, [portfolio, t]);

  const updateFormData = (updates: Partial<PortfolioFormData>): void => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async (): Promise<void> => {
    const success = await onSave(formData);
    if (success) {
      // يمكن إضافة أي إجراء إضافي بعد الحفظ
    }
  };

  const renderSection = (): React.ReactNode => {
    const props = {
      data: formData,
      onChange: updateFormData,
    };

    switch (activeSection) {
      case "basic":
        return <BasicInfoSection {...props} />;
      case "skills":
        return <SkillsSection {...props} />;
      case "projects":
        return <ProjectsSection {...props} />;
      case "social":
        return <SocialLinksSection {...props} />;
      case "settings":
        return <SettingsSection {...props} />;
      default:
        return <BasicInfoSection {...props} />;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-white dark:bg-darkmode">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white dark:bg-darkmode border-b border-gray-200 dark:border-dark_border pt-32 p-6 ">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark_input transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-primary" />
              {t("portfolio.builder.title")}
            </h1>
          </div>
          
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Eye className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-[10000]
        w-80 lg:w-64 bg-gray-50 dark:bg-darklight border-r border-gray-200 dark:border-dark_border
        transition-transform duration-300 ease-in-out lg:transition-none
        flex flex-col h-full lg:h-screen
      `}>
        <div className="p-6 border-b border-gray-200 dark:border-dark_border">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            {t("portfolio.builder.title")}
          </h1>
        </div>

        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => {
                  setActiveSection(section.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                  activeSection === section.id
                    ? "bg-primary text-white shadow-md"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark_input"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{t(section.label)}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-dark_border space-y-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {saving ? t("portfolio.builder.saving") : t("portfolio.builder.save")}
          </button>

          {/* <button
            onClick={() => setShowPreview(!showPreview)}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2"
          >
            <Eye className="w-5 h-5" />
            {showPreview ? t("portfolio.builder.hidePreview") : t("portfolio.builder.livePreview")}
          </button> */}
        </div>
      </div>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 pt-8 md:pt-32">
        {/* Editor */}
        <div className={`
          ${showPreview ? 'lg:w-1/2' : 'w-full'} 
          flex-1 p-4 lg:p-6 overflow-y-auto
        `}>
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 lg:mb-8">
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t(SECTIONS.find(s => s.id === activeSection)?.label || "portfolio.builder.basicInfo")}
              </h2>
              <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400">
                {t("portfolio.builder.customizeSection", { 
                  section: t(SECTIONS.find(s => s.id === activeSection)?.label || "portfolio.builder.basicInfo").toLowerCase() 
                })}
              </p>
            </div>

            {renderSection()}
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="lg:w-1/2 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-dark_border">
            <PreviewPanel portfolio={formData} />
          </div>
        )}
      </div>
    </div>
  );
}