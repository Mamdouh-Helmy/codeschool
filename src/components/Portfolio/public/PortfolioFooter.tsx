// components/Portfolio/public/PortfolioFooter.tsx
"use client";
import { useState } from "react";
import footerBg from "../../../../public/images/portfolio/img/footer-bg.png";
import logo from "../../../../public/images/portfolio/img/logo.png";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFacebookF,
    faInstagram,
    faLinkedinIn,
    faGithub,
    faTwitter,
    faYoutube,
    faDribbble
} from "@fortawesome/free-brands-svg-icons";
import { Mail, Send } from "lucide-react";
import { PublicPortfolio } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";

interface PortfolioFooterProps {
    portfolio: PublicPortfolio;
}

// Newsletter Component
const Newsletter = ({ portfolio }: { portfolio: any }) => {
    const { t } = useI18n();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));

            setMessage({
                type: 'success',
                text: t("portfolio.newsletter.subscribed") || "Subscribed successfully!"
            });
            setEmail("");
        } catch (error) {
            setMessage({
                type: 'error',
                text: t("portfolio.newsletter.error") || "Something went wrong!"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="col-span-12 lg:col-span-6 py-4 sm:py-6">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
                {t("portfolio.newsletter.title") || "Stay Updated"}
            </h3>
            <p className="text-gray-300 text-sm sm:text-base mb-4 sm:mb-6">
                {t("portfolio.newsletter.description") || "Subscribe to our newsletter for the latest updates and news."}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="flex-1 relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t("portfolio.newsletter.placeholder") || "Enter your email"}
                        className="w-full bg-white/10 border border-white/30 text-white placeholder-gray-400 rounded-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-4 sm:px-6 py-2 sm:py-3 font-semibold transition-colors flex items-center justify-center gap-1 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                    <Send className="w-3 h-3 sm:w-4 sm:h-4" />
                    {loading ? t("portfolio.newsletter.subscribing") || "Subscribing..." : t("portfolio.newsletter.subscribe") || "Subscribe"}
                </button>
            </form>

            {message.text && (
                <p className={`mt-2 sm:mt-3 text-xs sm:text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {message.text}
                </p>
            )}
        </div>
    );
};

export default function PortfolioFooter({ portfolio }: PortfolioFooterProps) {
    const { t } = useI18n();
    const { socialLinks, userId } = portfolio;

    const socialIcons = [
        {
            icon: faFacebookF,
            link: socialLinks?.facebook,
            label: "Facebook"
        },
        {
            icon: faInstagram,
            link: socialLinks?.instagram,
            label: "Instagram"
        },
        {
            icon: faLinkedinIn,
            link: socialLinks?.linkedin,
            label: "LinkedIn"
        },
        {
            icon: faGithub,
            link: socialLinks?.github,
            label: "GitHub"
        },
        {
            icon: faTwitter,
            link: socialLinks?.twitter,
            label: "Twitter"
        },
        {
            icon: faYoutube,
            link: socialLinks?.youtube,
            label: "YouTube"
        },
        {
            icon: faDribbble,
            link: socialLinks?.dribbble,
            label: "Dribbble"
        },
    ].filter(item => item.link);

    return (
        <footer
            className="pb-8 sm:pb-10 md:pb-12 bg-center bg-cover bg-no-repeat"
            style={{ backgroundImage: `url(${footerBg.src})` }}
        >
            <div className="container mx-auto px-3 sm:px-4 md:px-6">
                {/* Main Content */}
                <div className="items-center grid grid-cols-12 gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-10 md:mb-12">
                    {/* Newsletter Section */}
                    <Newsletter portfolio={portfolio} />

                    {/* Logo Section - Middle on mobile, Left on desktop */}
                    <div className="lg:col-span-3 col-span-12 order-1 lg:order-2">
                        <div className="w-16 sm:w-20 md:w-24 mx-auto lg:mx-0">
                            <Image
                                src={logo}
                                alt="Logo"
                                className="w-full"
                                priority
                            />
                        </div>
                    </div>

                    {/* Social Links Section - Bottom on mobile, Right on desktop */}
                    <div className="lg:col-span-3 col-span-12 order-2 lg:order-3 text-center lg:text-end">
                        <div className="flex items-center justify-center lg:justify-end gap-2 sm:gap-3 flex-wrap mb-4 sm:mb-5">
                            {socialIcons.map((social, index) => (
                                <a
                                    key={index}
                                    href={social.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full border border-white/50 bg-white/10 text-white transition hover:bg-white hover:text-black hover:scale-105 duration-300"
                                    title={social.label}
                                    aria-label={social.label}
                                >
                                    <FontAwesomeIcon
                                        icon={social.icon}
                                        className="w-3 h-3 sm:w-4 sm:w-5"
                                    />
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Copyright Section */}
                <div className="text-center pt-6 sm:pt-8 border-t border-white/30">
                    <p className="text-white capitalize text-sm sm:text-base">
                        © {new Date().getFullYear()} {userId?.name || 'User'}&apos;s {t("portfolio.public.portfolio")}.
                        {t("portfolio.public.allRightsReserved") || " All Rights Reserved"}
                    </p>
                    <p className="text-gray-400 text-xs sm:text-sm mt-1 sm:mt-2">
                        {t("portfolio.public.builtWith") || "Built with ❤️ using Next.js"}
                    </p>
                </div>
            </div>
        </footer>
    );
}