// components/Portfolio/public/PortfolioHeader.tsx
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
    Mail,
    MapPin,
    Briefcase
} from "lucide-react";
import { PublicPortfolio, SocialLinks } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";
import { ThemeStyles } from "@/utils/portfolioThemes";

interface PortfolioHeaderProps {
    portfolio: PublicPortfolio;
    themeStyles?: ThemeStyles;
}

const SocialIcon = ({ platform, url, themeStyles }: {
    platform: keyof SocialLinks;
    url: string;
    themeStyles?: ThemeStyles;
}) => {
    const { t } = useI18n();

    const icons = {
        github: Github,
        linkedin: Linkedin,
        twitter: Twitter,
        youtube: Youtube,
        instagram: Instagram,
        facebook: Facebook,
        website: Globe,
        dribbble: Dribbble,
    };

    const Icon = icons[platform];

    // دالة محسنة للحصول على نمط الأزرار بناءً على السمة
    const getSocialButtonStyle = (): string => {
        // استخدام نمط ثابت يعمل مع جميع السمات
        return "bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all duration-300";
    };

    const titles = {
        github: t("portfolio.social.github"),
        linkedin: t("portfolio.social.linkedin"),
        twitter: t("portfolio.social.twitter"),
        youtube: t("portfolio.social.youtube"),
        instagram: t("portfolio.social.instagram"),
        facebook: t("portfolio.social.facebook"),
        website: t("portfolio.social.website"),
        dribbble: t("portfolio.social.dribbble"),
    };

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`p-3 rounded-xl group relative ${getSocialButtonStyle()}`}
            title={titles[platform]}
        >
            <Icon className="w-5 h-5" />
            {/* Tooltip */}
            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                {titles[platform]}
            </div>
        </a>
    );
};

export default function PortfolioHeader({ portfolio, themeStyles }: PortfolioHeaderProps) {
    const { t } = useI18n();
    const { userId, title, description, socialLinks, contactInfo } = portfolio;

    // دالة مساعدة للحصول على ألوان النص بشكل آمن
    const getTextColor = (type: 'primary' | 'secondary' | 'muted' = 'primary'): string => {
        if (!themeStyles) {
            return type === 'primary' ? 'text-gray-900' : 
                   type === 'secondary' ? 'text-gray-700' : 'text-gray-500';
        }
        return themeStyles.text?.[type] || 
            (type === 'primary' ? 'text-gray-900' : 
             type === 'secondary' ? 'text-gray-700' : 'text-gray-500');
    };

    // دالة للحصول على لون الأيقونات من السمة
    const getIconColor = (): string => {
        if (themeStyles?.skillFill) {
            const baseColor = themeStyles.skillFill;
            if (baseColor.includes('blue')) return 'text-blue-600';
            if (baseColor.includes('green')) return 'text-green-600';
            if (baseColor.includes('gray')) return 'text-gray-600';
        }
        return "text-blue-600";
    };

    // دالة للحصول على لون الـ hover من السمة
    const getHoverColor = (): string => {
        if (themeStyles?.skillFill) {
            const baseColor = themeStyles.skillFill;
            if (baseColor.includes('blue')) return 'hover:text-blue-600';
            if (baseColor.includes('green')) return 'hover:text-green-600';
            if (baseColor.includes('gray')) return 'hover:text-gray-600';
        }
        return "hover:text-blue-600";
    };

    // دالة للحصول على نمط الزر الأساسي من السمة
    const getPrimaryButtonStyle = (): string => {
        if (themeStyles?.skillFill) {
            const baseColor = themeStyles.skillFill;
            if (baseColor.includes('blue')) return 'bg-blue-600 hover:bg-blue-700 text-white';
            if (baseColor.includes('green')) return 'bg-green-600 hover:bg-green-700 text-white';
            if (baseColor.includes('gray')) return 'bg-gray-600 hover:bg-gray-700 text-white';
        }
        return "bg-blue-600 hover:bg-blue-700 text-white";
    };

    // دالة للحصول على تأثير hover للزر الثانوي من السمة
    const getSecondaryButtonHover = (): string => {
        if (themeStyles?.background.secondary) {
            return `hover:${themeStyles.background.secondary}`;
        }
        return "hover:bg-gray-50";
    };

    // تطبيق السمات المستقلة
    const getHeaderBackground = (): string => {
        if (themeStyles?.header) {
            return themeStyles.header;
        }
        return "portfolio-header portfolio-header-light";
    };

    const getContainerStyle = (): string => {
        if (themeStyles?.card) {
            return themeStyles.card;
        }
        return "bg-white rounded-2xl shadow-lg border border-gray-200";
    };

    const getStatsBackground = (): string => {
        if (themeStyles?.background.primary) {
            return themeStyles.background.primary;
        }
        return "bg-white";
    };

    const getContactBarBackground = (): string => {
        if (themeStyles?.background.secondary) {
            return themeStyles.background.secondary;
        }
        return "bg-gray-50";
    };

    // 🔥 إصلاح المشكلة: التحقق من وجود socialLinks قبل استخدام Object.entries
    const activeSocialLinks = socialLinks
        ? Object.entries(socialLinks).filter(([_, url]) =>
            url && typeof url === 'string' && url.trim() !== ""
        ) as [keyof SocialLinks, string][]
        : [];

    const userProfile = userId?.profile || {};
    const userJobInfo = userProfile.jobTitle || userProfile.company;

    return (
        <div className={`overflow-hidden ${getContainerStyle()}`}>
            {/* Hero Section with Gradient */}
            <div className={`px-4 sm:px-6 lg:px-8 py-8 sm:py-12 ${getHeaderBackground()}`}>
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 lg:gap-8 max-w-6xl mx-auto">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                        <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl">
                            <img
                                src={userId?.image || "/images/default-avatar.jpg"}
                                alt={userId?.name || 'User'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = "/images/default-avatar.jpg";
                                }}
                            />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 text-center lg:text-left">
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 leading-tight text-white">
                            {title}
                        </h1>

                        <p className="text-white text-lg sm:text-xl opacity-90 mb-6 leading-relaxed max-w-3xl">
                            {description}
                        </p>

                        {/* User Info Row */}
                        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4 mb-6 flex-wrap">
                            {/* Name and Role */}
                            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                                <span className="font-semibold text-white">
                                    {t("portfolio.public.by")} {userId?.name || 'User'}
                                </span>
                                {userId?.role && (
                                    <span className="px-2 py-1 bg-white/20 text-white rounded-full text-sm font-medium">
                                        {userId.role}
                                    </span>
                                )}
                            </div>

                            {/* Job Info */}
                            {userJobInfo && (
                                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                                    <Briefcase className="w-4 h-4 text-white/80" />
                                    <span className="text-white/90 text-sm">{userJobInfo}</span>
                                </div>
                            )}

                            {/* Location */}
                            {contactInfo?.location && (
                                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                                    <MapPin className="w-4 h-4 text-white/80" />
                                    <span className="text-white/90 text-sm">{contactInfo.location}</span>
                                </div>
                            )}
                        </div>

                        {/* Social Links */}
                        {activeSocialLinks.length > 0 && (
                            <div className="flex justify-center lg:justify-start gap-3 flex-wrap">
                                {activeSocialLinks.map(([platform, url]) => (
                                    <SocialIcon
                                        key={platform}
                                        platform={platform}
                                        url={url}
                                        themeStyles={themeStyles}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Contact Bar */}
            {(contactInfo?.email || contactInfo?.phone) && (
                <div className={`border-t ${getContactBarBackground()} ${themeStyles?.border || "border-gray-200"}`}>
                    <div className="px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-6xl mx-auto">
                            <div className={`text-sm ${getTextColor('muted')}`}>
                                {t("portfolio.public.available")}
                            </div>

                            <div className="flex items-center gap-4 flex-wrap justify-center">
                                {contactInfo.email && (
                                    <a
                                        href={`mailto:${contactInfo.email}`}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 ${getPrimaryButtonStyle()}`}
                                    >
                                        <Mail className="w-4 h-4" />
                                        <span className="text-sm font-medium">{t("portfolio.public.contact")}</span>
                                    </a>
                                )}

                                {contactInfo.phone && (
                                    <a
                                        href={`tel:${contactInfo.phone}`}
                                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors duration-200 ${
                                            themeStyles?.border || "border-gray-300"
                                        } ${
                                            getTextColor('secondary')
                                        } ${getSecondaryButtonHover()}`}
                                    >
                                        <span className="text-sm font-medium">
                                            {t("common.call")}: {contactInfo.phone}
                                        </span>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Bar */}
            <div className={`border-t ${getStatsBackground()} ${themeStyles?.border || "border-gray-200"}`}>
                <div className="px-4 sm:px-6 lg:px-8 py-4">
                    <div className={`flex items-center justify-center gap-4 sm:gap-6 lg:gap-8 text-sm ${getTextColor('muted')} flex-wrap`}>
                        <div className="text-center">
                            <div className={`text-2xl font-bold ${getIconColor()}`}>{portfolio.views || 0}</div>
                            <div className="text-xs">{t("portfolio.settings.totalViews")}</div>
                        </div>

                        <div className="text-center">
                            <div className={`text-2xl font-bold ${getIconColor()}`}>{portfolio.skills?.length || 0}</div>
                            <div className="text-xs">{t("portfolio.settings.skillsCount")}</div>
                        </div>

                        <div className="text-center">
                            <div className={`text-2xl font-bold ${getIconColor()}`}>{portfolio.projects?.length || 0}</div>
                            <div className="text-xs">{t("portfolio.settings.projectsCount")}</div>
                        </div>

                        <div className="text-center">
                            <div className={`text-2xl font-bold ${getIconColor()}`}>{activeSocialLinks.length}</div>
                            <div className="text-xs">{t("portfolio.settings.socialLinksCount")}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}