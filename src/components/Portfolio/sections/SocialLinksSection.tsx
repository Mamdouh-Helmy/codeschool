"use client";
import { 
  Github, Linkedin, Twitter, Globe, Youtube, 
  Instagram, Facebook, Dribbble 
} from "lucide-react";
import { PortfolioFormData, SocialLinks } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";

interface SocialLinksSectionProps {
  data: PortfolioFormData;
  onChange: (updates: Partial<PortfolioFormData>) => void;
}

const socialPlatforms = [
  { 
    key: 'github' as keyof SocialLinks, 
    label: "portfolio.social.github", 
    icon: Github, 
    placeholder: 'https://github.com/username',
    color: 'hover:text-gray-900 dark:hover:text-white'
  },
  { 
    key: 'linkedin' as keyof SocialLinks, 
    label: "portfolio.social.linkedin", 
    icon: Linkedin, 
    placeholder: 'https://linkedin.com/in/username',
    color: 'hover:text-blue-600'
  },
  { 
    key: 'twitter' as keyof SocialLinks, 
    label: "portfolio.social.twitter", 
    icon: Twitter, 
    placeholder: 'https://twitter.com/username',
    color: 'hover:text-blue-400'
  },
  { 
    key: 'website' as keyof SocialLinks, 
    label: "portfolio.social.website", 
    icon: Globe, 
    placeholder: 'https://yourwebsite.com',
    color: 'hover:text-green-600'
  },
  { 
    key: 'youtube' as keyof SocialLinks, 
    label: "portfolio.social.youtube", 
    icon: Youtube, 
    placeholder: 'https://youtube.com/c/username',
    color: 'hover:text-red-600'
  },
  { 
    key: 'instagram' as keyof SocialLinks, 
    label: "portfolio.social.instagram", 
    icon: Instagram, 
    placeholder: 'https://instagram.com/username',
    color: 'hover:text-pink-600'
  },
  { 
    key: 'facebook' as keyof SocialLinks, 
    label: "portfolio.social.facebook", 
    icon: Facebook, 
    placeholder: 'https://facebook.com/username',
    color: 'hover:text-blue-600'
  },
  { 
    key: 'dribbble' as keyof SocialLinks, 
    label: "portfolio.social.dribbble", 
    icon: Dribbble, 
    placeholder: 'https://dribbble.com/username',
    color: 'hover:text-pink-600'
  }
];

export default function SocialLinksSection({ data, onChange }: SocialLinksSectionProps) {
  const { t } = useI18n();

  const updateSocialLink = (platform: keyof SocialLinks, value: string): void => {
    const updatedSocialLinks = { ...data.socialLinks, [platform]: value };
    onChange({ socialLinks: updatedSocialLinks });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-darkmode rounded-lg border border-gray-200 dark:border-dark_border p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          {t("portfolio.social.title")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {socialPlatforms.map((platform) => {
            const Icon = platform.icon;
            const value = data.socialLinks?.[platform.key] || '';
            return (
              <div key={platform.key} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${value ? platform.color : 'text-gray-400'}`} />
                  {t(platform.label)}
                </label>
                <input
                  type="url"
                  value={value}
                  onChange={(e) => updateSocialLink(platform.key, e.target.value)}
                  placeholder={platform.placeholder}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white transition-colors"
                />
              </div>
            );
          })}
        </div>
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>{t("common.tip")}:</strong> {t("portfolio.social.tip")}
          </p>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-gray-50 dark:bg-dark_input rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
          {t("portfolio.social.preview")}
        </h4>
        <div className="flex flex-wrap gap-3">
          {socialPlatforms.map((platform) => {
            const Icon = platform.icon;
            const value = data.socialLinks?.[platform.key];
            if (!value) return null;
            return (
              <a
                key={platform.key}
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-4 py-2 bg-white dark:bg-darkmode border border-gray-200 dark:border-dark_border rounded-lg transition-all duration-300 ${platform.color} hover:shadow-md`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{t(platform.label)}</span>
              </a>
            );
          })}
          {Object.values(data.socialLinks || {}).filter(url => url && url.trim() !== '').length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {t("portfolio.social.noLinks")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}