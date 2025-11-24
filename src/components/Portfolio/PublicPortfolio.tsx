// components/Portfolio/PublicPortfolio.tsx
"use client";
import { useState, useEffect } from "react";
import { Share2, Eye, Download, Mail, Phone, MapPin, CheckCircle, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import Loader from "@/components/Common/Loader";
import PortfolioHeader from "./public/PortfolioHeader";
import SkillsShowcase from "./public/SkillsShowcase";
import ProjectsGallery from "./public/ProjectsGallery";
import ContactSection from "./public/ContactSection";
import { PublicPortfolio as PublicPortfolioType, PortfolioApiResponse } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";
import { applyTheme } from "@/utils/portfolioThemes";

interface PublicPortfolioProps {
    username: string;
}

export default function PublicPortfolio({ username }: PublicPortfolioProps) {
    const { t } = useI18n();
    const [portfolio, setPortfolio] = useState<PublicPortfolioType | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchPortfolio();
    }, [username]);

    const fetchPortfolio = async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch(`/api/portfolio/${username}`);
            const data: PortfolioApiResponse = await res.json();

            if (data.success) {
                setPortfolio(data.portfolio);
            } else {
                setError(data.message || t("portfolio.public.notFound"));
                toast.error(data.message || t("portfolio.status.loadFailed"));
            }
        } catch (error) {
            console.error("Error fetching portfolio:", error);
            setError(t("portfolio.status.loadFailed"));
            toast.error(t("portfolio.status.loadFailed"));
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async (): Promise<void> => {
        if (!portfolio) return;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: portfolio.title || t("portfolio.public.portfolio"),
                    text: portfolio.description,
                    url: window.location.href,
                });
            } catch (error) {
                console.error("Error sharing:", error);
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast.success(t("portfolio.public.linkCopied"));
        }
    };

    // دالة لتنسيق التاريخ
    const formatDate = (date: string | Date): string => {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return "Invalid Date";
        
        return dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // تطبيق السمات المستقلة
    const themeStyles = portfolio ? applyTheme(
        portfolio.settings?.theme || 'light',
        portfolio.settings?.layout || 'standard'
    ) : null;

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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader />
            </div>
        );
    }

    if (error || !portfolio) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                        <Eye className="w-12 h-12 text-red-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        {t("portfolio.public.notFound")}
                    </h1>
                    <p className="text-gray-600 mb-6">
                        {error || t("portfolio.public.notFoundDescription")}
                    </p>
                    <button
                        onClick={() => window.location.href = "/"}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                    >
                        {t("common.goHome")}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container p-6 mx-auto bg-white dark:bg-[#1f2937] mt-32 mb-10 rounded-md">
            <div className={`min-h-screen ${themeStyles?.container || "bg-gray-50"} pb-10 rounded-lg`}>
                
                {/* Action Bar */}
                <div className={`border-b ${themeStyles?.border || "border-gray-200"} ${themeStyles?.background.primary || "bg-white"}`}>
                    <div className="container mx-auto px-4 py-3">
                        <div className="flex justify-between items-center">
                            <div className={`text-sm ${getTextColor('muted')}`}>
                                <span className="flex items-center gap-1">
                                    <Eye className={`w-4 h-4 ${getIconColor()}`} />
                                    {portfolio.views || 0} {t("portfolio.public.views")}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleShare}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${getPrimaryButtonStyle()}`}
                                >
                                    <Share2 className="w-4 h-4" />
                                    {t("portfolio.public.share")}
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                                        themeStyles?.border || "border-gray-300"
                                    } ${getTextColor('secondary')} ${getSecondaryButtonHover()}`}
                                >
                                    <Download className="w-4 h-4" />
                                    {t("portfolio.public.export")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="container mx-auto px-4 py-8">
                    {/* Header Section */}
                    <PortfolioHeader portfolio={portfolio} themeStyles={themeStyles} />

                    {/* Contact Info Bar */}
                    {(portfolio.contactInfo?.email || portfolio.contactInfo?.phone || portfolio.contactInfo?.location) && (
                        <div className={`p-6 mb-8 ${themeStyles?.card || "bg-white rounded-lg border border-gray-200"}`}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {portfolio.contactInfo.email && (
                                    <div className={`flex items-center gap-3 ${getTextColor('secondary')}`}>
                                        <Mail className={`w-5 h-5 ${getIconColor()}`} />
                                        <a
                                            href={`mailto:${portfolio.contactInfo.email}`}
                                            className={`transition-colors ${getHoverColor()}`}
                                        >
                                            {portfolio.contactInfo.email}
                                        </a>
                                    </div>
                                )}
                                {portfolio.contactInfo.phone && (
                                    <div className={`flex items-center gap-3 ${getTextColor('secondary')}`}>
                                        <Phone className={`w-5 h-5 ${getIconColor()}`} />
                                        <a
                                            href={`tel:${portfolio.contactInfo.phone}`}
                                            className={`transition-colors ${getHoverColor()}`}
                                        >
                                            {portfolio.contactInfo.phone}
                                        </a>
                                    </div>
                                )}
                                {portfolio.contactInfo.location && (
                                    <div className={`flex items-center gap-3 ${getTextColor('secondary')}`}>
                                        <MapPin className={`w-5 h-5 ${getIconColor()}`} />
                                        <span>{portfolio.contactInfo.location}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Skills Section */}
                    {portfolio.skills && portfolio.skills.length > 0 && (
                        <SkillsShowcase skills={portfolio.skills} themeStyles={themeStyles} />
                    )}

                    {/* Projects Section */}
                    {portfolio.projects && portfolio.projects.length > 0 && (
                        <ProjectsGallery projects={portfolio.projects} themeStyles={themeStyles} />
                    )}

                    {/* Contact Section */}
                    <ContactSection portfolio={portfolio} themeStyles={themeStyles} />
                </div>

                {/* Footer */}
                <footer className={`border-t mt-12 ${themeStyles?.background.primary || "bg-white"} ${themeStyles?.border || "border-gray-200"}`}>
                    <div className="container mx-auto px-4 py-6">
                        <div className={`text-center ${getTextColor('muted')}`}>
                            <p className="mb-2">© {new Date().getFullYear()} {portfolio.userId?.name || 'User'}&apos;s {t("portfolio.public.portfolio")}. {t("portfolio.public.builtWith")} Codeschool.</p>
                            {portfolio.createdAt && portfolio.updatedAt && (
                                <p className="text-xs opacity-75">
                                    Portfolio created on {formatDate(portfolio.createdAt)} • 
                                    Last updated {formatDate(portfolio.updatedAt)}
                                </p>
                            )}
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}