// src/components/Blog/SocialSharing.tsx
"use client";
import { useI18n } from "@/i18n/I18nProvider";
import { Share2, Facebook, Instagram, MessageCircle, Linkedin, Copy, CheckCheck, Lightbulb } from "lucide-react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface SocialSharingProps {
    title: string;
    url: string;
}

export default function SocialSharing({ title, url }: SocialSharingProps) {
    const { t } = useI18n();
    const [copied, setCopied] = useState(false);
    const [currentUrl, setCurrentUrl] = useState(url);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setCurrentUrl(window.location.href);
        }
    }, []);

    // روابط المشاركة المضبوطة
    const shareLinks = {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`,
        instagram: null,
        tiktok: null,
    };

    const showToast = (message: string, type: 'success' | 'info' = 'success') => {
        if (type === 'success') {
            toast.success(message, {
                duration: 3000,
                position: 'top-right',
            });
        } else {
            toast(message, {
                duration: 4000,
                position: 'top-right',
                icon: '💡',
            });
        }
    };

    const handleShare = async (platform: string) => {
        if (platform === 'instagram' || platform === 'tiktok') {
            await navigator.clipboard.writeText(currentUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);

            const platformName = platform === 'instagram' ? 'Instagram' : 'TikTok';
            showToast(
                `${t("blog.linkCopiedFor") || "Link copied for"} ${platformName}. ${t("blog.pasteManually") || "You can now paste it manually"}`,
                'info'
            );
            return;
        }

        const shareUrl = shareLinks[platform as keyof typeof shareLinks];
        if (shareUrl) {
            const windowFeatures = "width=600,height=400,menubar=no,toolbar=no,location=no";
            window.open(shareUrl, "_blank", windowFeatures);
        }
    };

    // دالة لمشاركة عبر Web Share API إذا متاحة
    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    text: title,
                    url: currentUrl,
                });
            } catch (error) {
                console.log('Native share cancelled');
            }
        } else {
            await navigator.clipboard.writeText(currentUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
            showToast(t("blog.linkCopied") || "Link copied to clipboard!");
        }
    };

    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(currentUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        showToast(t("blog.linkCopiedSuccess") || "Link copied successfully!");
    };

    return (
        <div className="bg-IcyBreeze dark:bg-dark_input rounded-lg p-4 md:p-6 border border-PowderBlueBorder dark:border-dark_border">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6">
                {/* العنوان والأيقونة */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Share2 className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-base md:text-lg font-semibold text-MidnightNavyText dark:text-white">
                            {t("blog.shareThisPost") || "Share this post"}
                        </h3>
                        <p className="text-xs md:text-sm text-SlateBlueText dark:text-darktext mt-1">
                            {t("blog.helpSpreadWord") || "Help spread the word!"}
                        </p>
                    </div>
                </div>

                {/* أزرار المشاركة */}
                <div className="flex items-center gap-2 md:gap-3">
                    {/* Web Share API (للجوال) */}
                    <button
                        onClick={handleNativeShare}
                        className="w-8 h-8 md:w-10 md:h-10 bg-primary hover:bg-primary/90 text-white rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 flex-shrink-0"
                        title={t("blog.share") || "Share"}
                    >
                        <Share2 className="w-3 h-3 md:w-4 md:h-4" />
                    </button>

                    {/* أزرار المنصات */}
                    <div className="flex gap-1 md:gap-2">
                        {/* Facebook */}
                        <button
                            onClick={() => handleShare("facebook")}
                            className="w-8 h-8 md:w-10 md:h-10 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 group relative flex-shrink-0"
                            title={t("blog.shareOnFacebook") || "Share on Facebook"}
                        >
                            <Facebook className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="sr-only">Facebook</span>
                            <div className="absolute -top-8 md:-top-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none hidden md:block">
                                {t("blog.shareOnFacebook") || "Share on Facebook"}
                            </div>
                        </button>

                        {/* Instagram */}
                        <button
                            onClick={() => handleShare("instagram")}
                            className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] hover:opacity-90 text-white rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 group relative flex-shrink-0"
                            title={t("blog.copyForInstagram") || "Copy link for Instagram"}
                        >
                            <Instagram className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="sr-only">Instagram</span>
                            <div className="absolute -top-8 md:-top-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none hidden md:block">
                                {t("blog.copyForInstagram") || "Copy for Instagram"}
                            </div>
                        </button>

                        {/* TikTok */}
                        <button
                            onClick={() => handleShare("tiktok")}
                            className="w-8 h-8 md:w-10 md:h-10 bg-black hover:bg-gray-800 text-white rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 group relative flex-shrink-0"
                            title={t("blog.copyForTikTok") || "Copy link for TikTok"}
                        >
                            <MessageCircle className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="sr-only">TikTok</span>
                            <div className="absolute -top-8 md:-top-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none hidden md:block">
                                {t("blog.copyForTikTok") || "Copy for TikTok"}
                            </div>
                        </button>

                        {/* LinkedIn */}
                        <button
                            onClick={() => handleShare("linkedin")}
                            className="w-8 h-8 md:w-10 md:h-10 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 group relative flex-shrink-0"
                            title={t("blog.shareOnLinkedIn") || "Share on LinkedIn"}
                        >
                            <Linkedin className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="sr-only">LinkedIn</span>
                            <div className="absolute -top-8 md:-top-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none hidden md:block">
                                {t("blog.shareOnLinkedIn") || "Share on LinkedIn"}
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* رابط المشاركة */}
            <div className="mt-4 p-3 bg-white dark:bg-darkmode border border-PowderBlueBorder dark:border-dark_border rounded-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                    <span className="text-xs md:text-sm text-SlateBlueText dark:text-darktext truncate flex-1 min-w-0 mr-0 sm:mr-2">
                        {currentUrl}
                    </span>
                    <button
                        onClick={copyToClipboard}
                        className={`px-3 py-1.5 rounded text-xs md:text-sm font-medium transition-all duration-200 min-w-[70px] md:min-w-[80px] flex items-center justify-center gap-1 ${copied
                            ? "bg-green-500 text-white"
                            : "bg-primary/10 text-primary hover:bg-primary hover:text-white"
                            }`}
                    >
                        {copied ? (
                            <>
                                <CheckCheck className="w-3 h-3 flex-shrink-0" />
                                <span>{t("blog.copied") || "Copied!"}</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-3 h-3 flex-shrink-0" />
                                <span>{t("blog.copyLink") || "Copy Link"}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* رسالة مساعدة للمنصات اللي مش بتدعم المشاركة المباشرة */}
            <div className="mt-3 p-3 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 border border-primary/20 dark:border-primary/30 rounded-xl">
                <div className="flex items-start gap-2 md:gap-3">
                    <div className="w-5 h-5 md:w-6 md:h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Lightbulb className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-primary dark:text-white text-xs md:text-sm">
                            {t("blog.shareTip") || "Sharing Tip"}
                        </p>
                        <p className="mt-1 text-black dark:text-white text-xs leading-relaxed">
                            {t("blog.instagramTikTokTip") || "For Instagram & TikTok, the link will be copied - paste it manually in your post"}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}