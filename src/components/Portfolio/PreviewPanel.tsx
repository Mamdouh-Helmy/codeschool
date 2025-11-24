// components/Portfolio/PreviewPanel.tsx
"use client";
import { useState } from "react";
import { Smartphone, Laptop, Tablet } from "lucide-react";
import { PortfolioFormData } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";
import { applyTheme } from "@/utils/portfolioThemes";

interface PreviewPanelProps {
  portfolio: PortfolioFormData;
}

type DeviceType = "mobile" | "tablet" | "desktop";

export default function PreviewPanel({ portfolio }: PreviewPanelProps) {
  const { t } = useI18n();
  const [device, setDevice] = useState<DeviceType>("desktop");
  
  const themeStyles = applyTheme(
    portfolio.settings?.theme || 'light', 
    portfolio.settings?.layout || 'standard'
  );

  // دالة مساعدة للحصول على ألوان النص بشكل آمن
  const getTextColor = (type: 'primary' | 'secondary' | 'muted' = 'primary') => {
    return themeStyles.text?.[type] || 
      (type === 'primary' ? 'text-gray-900' : 
       type === 'secondary' ? 'text-gray-700' : 'text-gray-500');
  };

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* Device Controls */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm lg:text-base">
            {t("portfolio.builder.preview")}
          </h3>
          <div className="flex gap-1 lg:gap-2">
            {(["mobile", "tablet", "desktop"] as DeviceType[]).map((dev) => (
              <button
                key={dev}
                onClick={() => setDevice(dev)}
                className={`p-2 rounded text-xs lg:text-sm ${
                  device === dev 
                    ? "bg-blue-600 text-white" 
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {dev === "mobile" && <Smartphone className="w-3 h-3 lg:w-4 lg:h-4" />}
                {dev === "tablet" && <Tablet className="w-3 h-3 lg:w-4 lg:h-4" />}
                {dev === "desktop" && <Laptop className="w-3 h-3 lg:w-4 lg:h-4" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 p-3 lg:p-4 overflow-auto">
        <div className={`
          mx-auto transition-all duration-300 overflow-hidden
          ${themeStyles.container}
          ${device === "mobile" ? "max-w-xs" : 
            device === "tablet" ? "max-w-md" : "max-w-full"}
        `}>
          {/* Preview Header */}
          <div className={`p-4 lg:p-6 ${themeStyles.header}`}>
            <h1 className="text-lg lg:text-2xl font-bold text-white">
              {portfolio?.title || t("portfolio.basic.titlePlaceholder")}
            </h1>
            <p className="text-white opacity-90 mt-2 text-sm lg:text-base">
              {portfolio?.description || t("portfolio.basic.descriptionPlaceholder")}
            </p>
          </div>

          {/* Preview Content */}
          <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
            {/* Contact Info Preview */}
            {(portfolio?.contactInfo?.email || portfolio?.contactInfo?.phone || portfolio?.contactInfo?.location) && (
              <div>
                <h3 className={`text-base lg:text-lg font-semibold mb-2 lg:mb-3 ${getTextColor('primary')}`}>
                  {t("portfolio.basic.contactInfo")}
                </h3>
                <div className={`space-y-1 lg:space-y-2 text-xs lg:text-sm ${getTextColor('secondary')}`}>
                  {portfolio.contactInfo.email && (
                    <div>{t("portfolio.basic.email")}: {portfolio.contactInfo.email}</div>
                  )}
                  {portfolio.contactInfo.phone && (
                    <div>{t("portfolio.basic.phone")}: {portfolio.contactInfo.phone}</div>
                  )}
                  {portfolio.contactInfo.location && (
                    <div>{t("portfolio.basic.location")}: {portfolio.contactInfo.location}</div>
                  )}
                </div>
              </div>
            )}

            {/* Skills Preview */}
            {portfolio?.skills && portfolio.skills.length > 0 && (
              <div>
                <h3 className={`text-base lg:text-lg font-semibold mb-2 lg:mb-3 ${getTextColor('primary')}`}>
                  {t("portfolio.skills.yourSkills")} ({portfolio.skills.length})
                </h3>
                <div className="space-y-2">
                  {portfolio.skills.slice(0, 3).map((skill, index) => (
                    <div key={index} className="space-y-1">
                      <div className={`flex justify-between text-xs lg:text-sm ${getTextColor('secondary')}`}>
                        <span>{skill.name}</span>
                        <span>{skill.level}%</span>
                      </div>
                      <div className={`w-full h-2 rounded-full ${themeStyles.skillBar}`}>
                        <div 
                          className={`h-full rounded-full ${themeStyles.skillFill} transition-all duration-1000`}
                          style={{ width: `${skill.level}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projects Preview */}
            {portfolio?.projects && portfolio.projects.length > 0 && (
              <div>
                <h3 className={`text-base lg:text-lg font-semibold mb-2 lg:mb-3 ${getTextColor('primary')}`}>
                  {t("portfolio.projects.yourProjects")} ({portfolio.projects.length})
                </h3>
                <div className="space-y-2 lg:space-y-3">
                  {portfolio.projects.slice(0, 2).map((project, index) => (
                    <div key={index} className={`p-2 lg:p-3 border rounded-lg ${themeStyles.border}`}>
                      <h4 className={`font-medium text-sm lg:text-base ${getTextColor('primary')}`}>
                        {project.title}
                      </h4>
                      <p className={`text-xs lg:text-sm opacity-75 mt-1 ${getTextColor('secondary')}`}>
                        {project.description?.substring(0, 80)}...
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {(!portfolio?.skills || portfolio.skills.length === 0) && 
             (!portfolio?.projects || portfolio.projects.length === 0) && (
              <div className={`text-center py-6 lg:py-8 ${getTextColor('muted')}`}>
                <p className="text-sm lg:text-base">{t("portfolio.preview.addContent")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}