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
import PortfolioFooter from "./public/PortfolioFooter";
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
                console.log("🎨 Portfolio theme:", data.portfolio.settings?.theme);
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

    const formatDate = (date: string | Date): string => {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return "Invalid Date";

        return dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // تطبيق السمات - مع السمة المظلمة كإعداد افتراضي
    const themeStyles = applyTheme(
        portfolio?.settings?.theme || 'dark', // 🔥 السمة المظلمة كإعداد افتراضي
        portfolio?.settings?.layout || 'standard'
    );

    const getTextColor = (type: 'primary' | 'secondary' | 'muted' = 'primary'): string => {
        return themeStyles.text?.[type] ||
            (type === 'primary' ? 'text-gray-900' :
                type === 'secondary' ? 'text-gray-700' : 'text-gray-500');
    };

    const getIconColor = (): string => {
        if (themeStyles?.skillFill) {
            const baseColor = themeStyles.skillFill;
            if (baseColor.includes('blue')) return 'text-blue-600';
            if (baseColor.includes('green')) return 'text-green-600';
            if (baseColor.includes('gray')) return 'text-gray-600';
        }
        return "text-blue-600";
    };

    const getHoverColor = (): string => {
        if (themeStyles?.skillFill) {
            const baseColor = themeStyles.skillFill;
            if (baseColor.includes('blue')) return 'hover:text-blue-600';
            if (baseColor.includes('green')) return 'hover:text-green-600';
            if (baseColor.includes('gray')) return 'hover:text-gray-600';
        }
        return "hover:text-blue-600";
    };

    const getPrimaryButtonStyle = (): string => {
        if (themeStyles?.skillFill) {
            const baseColor = themeStyles.skillFill;
            if (baseColor.includes('blue')) return 'bg-blue-600 hover:bg-blue-700 text-white';
            if (baseColor.includes('green')) return 'bg-green-600 hover:bg-green-700 text-white';
            if (baseColor.includes('gray')) return 'bg-gray-600 hover:bg-gray-700 text-white';
        }
        return "bg-blue-600 hover:bg-blue-700 text-white";
    };

    const getSecondaryButtonHover = (): string => {
        if (themeStyles?.background.secondary) {
            return `hover:${themeStyles.background.secondary}`;
        }
        return "hover:bg-gray-50";
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <Loader />
            </div>
        );
    }

    if (error || !portfolio) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-4 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                        <Eye className="w-12 h-12 text-red-600 dark:text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {t("portfolio.public.notFound")}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
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
        <div className="container mx-auto mt-32 mb-10 rounded-md">
            <div className={`min-h-screen ${themeStyles.container}  rounded-lg`}>

                {/* Action Bar */}
                <div className={`border-b ${themeStyles.border} ${themeStyles.background.primary}`}>
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
                                        themeStyles.border
                                    } ${getTextColor('secondary')} ${getSecondaryButtonHover()}`}
                                >
                                    <Download className="w-4 h-4" />
                                    {t("portfolio.public.export")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Header Section */}
                <PortfolioHeader portfolio={portfolio} />

                {/* Skills Section */}
                {portfolio.skills && portfolio.skills.length > 0 && (
                    <SkillsShowcase portfolio={{
                        skillsTitle: portfolio.title || "My Skills",
                        skillsSubtitle: portfolio.description || "Technical Proficiencies",
                        skillsDesc: "Here are my technical skills and proficiency levels",
                        skills: portfolio.skills
                    }} />
                )}

                {/* Projects Section */}
                {portfolio.projects && portfolio.projects.length > 0 && (
                    <ProjectsGallery projects={portfolio.projects} themeStyles={themeStyles} />
                )}

                {/* Contact Section */}
                <ContactSection portfolio={portfolio} themeStyles={themeStyles} />

                <PortfolioFooter portfolio={portfolio} />
            </div>
        </div>
    );
}