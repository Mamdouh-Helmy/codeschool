"use client";
import { Eye, EyeOff, Palette, Layout } from "lucide-react";
import { PortfolioFormData, PortfolioSettings } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";

interface SettingsSectionProps {
  data: PortfolioFormData;
  onChange: (updates: Partial<PortfolioFormData>) => void;
}

export default function SettingsSection({ data, onChange }: SettingsSectionProps) {
  const { t } = useI18n();

  const updateSettings = (field: keyof PortfolioSettings, value: string): void => {
    const updatedSettings = { ...data.settings, [field]: value };
    onChange({ settings: updatedSettings });
  };

  const themes = [
    { value: 'light', label: 'Light', description: 'Clean and professional light theme' },
    { value: 'dark', label: 'Dark', description: 'Modern dark theme for better readability' },
    { value: 'blue', label: 'Blue', description: 'Professional blue accent theme' },
    { value: 'green', label: 'Green', description: 'Fresh green accent theme' }
  ];

  const layouts = [
    { value: 'standard', label: 'Standard', description: 'Traditional portfolio layout' },
    { value: 'minimal', label: 'Minimal', description: 'Clean and minimal design' },
    { value: 'creative', label: 'Creative', description: 'Modern and creative layout' }
  ];

  return (
    <div className="space-y-6">
      {/* Publishing Settings */}
      <div className="bg-white dark:bg-darkmode rounded-lg border border-gray-200 dark:border-dark_border p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          {data.isPublished ? (
            <Eye className="w-5 h-5 text-green-500" />
          ) : (
            <EyeOff className="w-5 h-5 text-gray-500" />
          )}
          {t("portfolio.settings.visibility")}
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark_input rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                {t("portfolio.settings.public")} {t("portfolio.settings.portfolio")}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {data.isPublished 
                  ? t("portfolio.settings.publicDescription") 
                  : t("portfolio.settings.privateDescription")
                }
              </p>
            </div>
            <button
              onClick={() => onChange({ isPublished: !data.isPublished })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                data.isPublished ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                data.isPublished ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          {data.isPublished && data._id && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-700 dark:text-green-300">
                <strong>{t("portfolio.settings.livePortfolio")}</strong> {t("portfolio.settings.shareLink")}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/portfolio/${data.userId}`}
                  className="flex-1 px-3 py-2 bg-white dark:bg-dark_input border border-green-200 dark:border-green-800 rounded text-sm text-green-700 dark:text-green-300"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(`${typeof window !== 'undefined' ? window.location.origin : ''}/portfolio/${data.userId}`)}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                >
                  {t("portfolio.settings.copy")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Theme Settings */}
      <div className="bg-white dark:bg-darkmode rounded-lg border border-gray-200 dark:border-dark_border p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          {t("portfolio.settings.theme")} & {t("portfolio.settings.appearance")}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t("portfolio.settings.colorTheme")}
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {themes.map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => updateSettings('theme', theme.value)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    data.settings.theme === theme.value
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-dark_border hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className={`w-8 h-8 rounded mb-2 ${
                    theme.value === 'light' ? 'bg-gray-100 border' :
                    theme.value === 'dark' ? 'bg-gray-800' :
                    theme.value === 'blue' ? 'bg-blue-500' : 'bg-green-500'
                  }`} />
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    {theme.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {theme.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t("portfolio.settings.layoutStyle")}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {layouts.map((layout) => (
                <button
                  key={layout.value}
                  onClick={() => updateSettings('layout', layout.value)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    data.settings.layout === layout.value
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-dark_border hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="w-full h-16 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 rounded mb-2 flex items-center justify-center">
                    <Layout className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    {layout.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {layout.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Statistics */}
      {data._id && (
        <div className="bg-white dark:bg-darkmode rounded-lg border border-gray-200 dark:border-dark_border p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t("portfolio.settings.statistics")}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-dark_input rounded-lg">
              <div className="text-2xl font-bold text-primary">{data.views}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t("portfolio.settings.totalViews")}
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-dark_input rounded-lg">
              <div className="text-2xl font-bold text-primary">{data.skills?.length || 0}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t("portfolio.settings.skillsCount")}
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-dark_input rounded-lg">
              <div className="text-2xl font-bold text-primary">{data.projects?.length || 0}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t("portfolio.settings.projectsCount")}
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-dark_input rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {Object.values(data.socialLinks || {}).filter(url => url && url.trim() !== '').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t("portfolio.settings.socialLinksCount")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-6">
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-4">
          {t("portfolio.settings.dangerZone")}
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white dark:bg-darkmode rounded-lg border border-red-200 dark:border-red-800">
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-300">
                {t("portfolio.settings.reset")}
              </h4>
              <p className="text-sm text-red-600 dark:text-red-400">
                {t("portfolio.settings.resetWarning")}
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm(t("portfolio.settings.resetConfirm"))) {
                  onChange({
                    skills: [],
                    projects: [],
                    socialLinks: {},
                    contactInfo: {},
                    settings: { theme: 'light', layout: 'standard' }
                  });
                }
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {t("portfolio.settings.reset")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}