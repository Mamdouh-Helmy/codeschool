"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { ArrowRight, Menu, X } from "lucide-react";

import headerImg from "../../../../public/images/portfolio/img/header-img.svg";
import banner from "../../../../public/images/portfolio/img/banner-bg.png";

import { PublicPortfolio, SocialLinks } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocale } from "@/app/context/LocaleContext";

interface PortfolioHeaderProps {
    portfolio: PublicPortfolio;
}

const SECTIONS = ["home", "skills", "projects", "certificates", "contact"];

export default function PortfolioHeader({
    portfolio,
}: PortfolioHeaderProps) {
    const { t } = useI18n();
    const { locale, toggleLocale } = useLocale();

    const { userId, description, socialLinks, contactInfo } = portfolio;

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [activeSection, setActiveSection] = useState("home");

    // Typing Effect
    const roles = useMemo(
        () =>
            userId?.profile?.jobTitle
                ? [userId.profile.jobTitle]
                : ["Web Developer", "Designer", "Freelancer"],
        [userId]
    );

    const [text, setText] = useState("");
    const [loopNum, setLoopNum] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    const typingSpeed = isDeleting ? 70 : 150;
    const period = 2000;

    // Active Social Links
    const activeSocialLinks = useMemo(() => {
        if (!socialLinks) return [];

        return Object.entries(socialLinks).filter(
            ([_, url]) =>
                typeof url === "string" && url.trim() !== ""
        ) as [keyof SocialLinks, string][];
    }, [socialLinks]);

    // Navigation Links
    const navLinks = useMemo(
        () => [
            { id: "home", label: t("nav.home") },
            { id: "skills", label: t("nav.skills") },
            { id: "projects", label: t("nav.projects") },
            { id: "certificates", label: t("nav.certificates") },
            { id: "contact", label: t("nav.contact") },
        ],
        [t]
    );

    // Scroll Listener
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);

            const scrollPosition = window.scrollY + 120;

            for (let i = SECTIONS.length - 1; i >= 0; i--) {
                const section = document.getElementById(SECTIONS[i]);

                if (!section) continue;

                const top = section.offsetTop;
                const bottom = top + section.offsetHeight;

                if (
                    scrollPosition >= top &&
                    scrollPosition < bottom
                ) {
                    setActiveSection(SECTIONS[i]);
                    break;
                }
            }
        };

        handleScroll();

        window.addEventListener("scroll", handleScroll);

        return () =>
            window.removeEventListener("scroll", handleScroll);
    }, []);

    // Typing Effect
    const tick = useCallback(() => {
        const currentRole = roles[loopNum % roles.length];

        const updatedText = isDeleting
            ? currentRole.substring(0, text.length - 1)
            : currentRole.substring(0, text.length + 1);

        setText(updatedText);

        if (!isDeleting && updatedText === currentRole) {
            setTimeout(() => setIsDeleting(true), period);
        }

        if (isDeleting && updatedText === "") {
            setIsDeleting(false);
            setLoopNum((prev) => prev + 1);
        }
    }, [text, isDeleting, loopNum, roles]);

    useEffect(() => {
        const timer = setTimeout(tick, typingSpeed);

        return () => clearTimeout(timer);
    }, [tick, typingSpeed]);

    // Helpers
    const scrollToSection = (sectionId: string) => {
        const section = document.getElementById(sectionId);

        if (!section) return;

        section.scrollIntoView({
            behavior: "smooth",
        });

        setActiveSection(sectionId);
        setIsMenuOpen(false);
    };

    const isActive = (id: string) => activeSection === id;

    return (
        <>
            {/* Header */}
            <header
                className={`fixed top-0 z-50 w-full transition-all duration-300 ${
                    scrolled
                        ? "bg-gray-900/95 backdrop-blur-md shadow-lg"
                        : "bg-transparent"
                }`}
            >
                <div className="container mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-white/30">
                                <img
                                    src={userId?.image || headerImg.src}
                                    alt={userId?.name || "User"}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                        (
                                            e.target as HTMLImageElement
                                        ).src = headerImg.src;
                                    }}
                                />
                            </div>

                            <div>
                                <h2 className="text-lg font-bold text-white">
                                    {userId?.name || "User"}
                                </h2>

                                <p className="text-xs text-gray-300">
                                    {userId?.profile?.jobTitle ||
                                        "Portfolio"}
                                </p>
                            </div>
                        </div>

                        {/* Desktop Nav */}
                        <nav className="hidden items-center gap-5 md:flex">
                            {navLinks.map((link) => (
                                <button
                                    key={link.id}
                                    onClick={() =>
                                        scrollToSection(link.id)
                                    }
                                    className={`relative text-sm font-medium transition ${
                                        isActive(link.id)
                                            ? "text-white"
                                            : "text-white/70 hover:text-white"
                                    }`}
                                >
                                    {link.label}

                                    {isActive(link.id) && (
                                        <span className="absolute -bottom-1 left-0 h-0.5 w-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500" />
                                    )}
                                </button>
                            ))}

                            {/* Language */}
                            <button
                                onClick={toggleLocale}
                                className="rounded border border-white/20 px-3 py-1 text-sm text-white transition hover:bg-white/10"
                            >
                                {locale === "en"
                                    ? "العربية"
                                    : "English"}
                            </button>
                        </nav>

                        {/* Mobile Button */}
                        <button
                            className="text-white md:hidden"
                            onClick={() =>
                                setIsMenuOpen((prev) => !prev)
                            }
                        >
                            {isMenuOpen ? (
                                <X className="h-6 w-6" />
                            ) : (
                                <Menu className="h-6 w-6" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                <div
                    className={`overflow-hidden bg-gray-900/95 backdrop-blur-md transition-all duration-300 md:hidden ${
                        isMenuOpen
                            ? "max-h-96 py-4"
                            : "max-h-0"
                    }`}
                >
                    <div className="container mx-auto flex flex-col gap-4 px-4">
                        {navLinks.map((link) => (
                            <button
                                key={link.id}
                                onClick={() =>
                                    scrollToSection(link.id)
                                }
                                className={`text-left text-base transition ${
                                    isActive(link.id)
                                        ? "border-l-2 border-pink-500 pl-3 font-semibold text-white"
                                        : "text-white/70 hover:text-white"
                                }`}
                            >
                                {link.label}
                            </button>
                        ))}

                        <button
                            onClick={toggleLocale}
                            className="w-fit rounded border border-white/20 px-3 py-1 text-sm text-white"
                        >
                            {locale === "en"
                                ? "العربية"
                                : "English"}
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section
                id="home"
                className="banner bg-cover bg-top bg-no-repeat pb-28 pt-40"
                style={{
                    backgroundImage: `url(${banner.src})`,
                }}
            >
                <div className="container mx-auto px-4">
                    <div className="flex flex-wrap items-center">
                        {/* Content */}
                        <div className="w-full md:w-7/12">
                            <span className="mb-4 inline-block rounded bg-gradient-to-r from-pink-500 to-purple-500 px-3 py-1 text-sm font-semibold text-white">
                                {t("portfolio.public.welcome")}
                            </span>

                            <h1 className="mb-6 text-4xl font-bold leading-tight text-white md:text-6xl">
                                {t("portfolio.public.hi")}{" "}
                                {userId?.name}
                                <br />

                                <span className="border-r border-gray-400">
                                    {text}
                                </span>
                            </h1>

                            <p className="mb-8 max-w-2xl text-lg leading-8 text-gray-300">
                                {description ||
                                    t(
                                        "portfolio.public.defaultDescription"
                                    )}
                            </p>

                            {contactInfo?.phone && (
                                <a
                                    href={`tel:${contactInfo.phone}`}
                                    className="group inline-flex items-center gap-2 text-lg font-semibold text-white"
                                >
                                    {t(
                                        "portfolio.public.letsConnect"
                                    )}

                                    <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                                </a>
                            )}

                            {/* Social */}
                            {activeSocialLinks.length > 0 && (
                                <div className="mt-8 flex flex-wrap gap-3">
                                    {activeSocialLinks
                                        .slice(0, 4)
                                        .map(([platform, url]) => (
                                            <a
                                                key={platform}
                                                href={url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="rounded-full bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20"
                                            >
                                                {platform}
                                            </a>
                                        ))}
                                </div>
                            )}
                        </div>

                        {/* Image */}
                        <div className="mt-10 flex w-full justify-center md:mt-0 md:w-5/12">
                            <div className="relative">
                                <img
                                    src={headerImg.src}
                                    alt={userId?.name || "User"}
                                    className="h-[220px] w-[220px] animate-[updown_3s_linear_infinite] shadow-2xl md:h-[360px] md:w-[360px]"
                                    onError={(e) => {
                                        (
                                            e.target as HTMLImageElement
                                        ).src = headerImg.src;
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <style jsx>{`
                @keyframes updown {
                    0%,
                    100% {
                        transform: translateY(0);
                    }

                    50% {
                        transform: translateY(-15px);
                    }
                }

                html[dir="rtl"] .group:hover svg {
                    transform: translateX(-4px);
                }
            `}</style>
        </>
    );
}