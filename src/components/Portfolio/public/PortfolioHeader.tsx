// components/Portfolio/public/PortfolioHeader.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import headerImg from "../../../../public/images/portfolio/img/header-img.svg";
import banner from "../../../../public/images/portfolio/img/banner-bg.png";
import Image from "next/image";
import { ArrowRight, Globe, Menu, X } from "lucide-react";
import { PublicPortfolio, SocialLinks } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";
import Link from "next/link";
import { useLocale } from "@/app/context/LocaleContext";

interface PortfolioHeaderProps {
    portfolio: PublicPortfolio;
}

export default function PortfolioHeader({ portfolio }: PortfolioHeaderProps) {
    const { t } = useI18n();
    const { locale, toggleLocale } = useLocale();
    const { userId, description, socialLinks, contactInfo } = portfolio;

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [activeSection, setActiveSection] = useState("home");

    // Typing effect states
    const [loopNum, setLoopNum] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [text, setText] = useState("");
    const [delta, setDelta] = useState(300 - Math.random() * 100);
    const [index, setIndex] = useState(1);

    // Handle scroll effect for navbar and active section
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
            
            // تحديد القسم النشط
            const sections = ["home", "skills", "projects", "contact"];
            const scrollPosition = window.scrollY + 100; // إزاحة للتعويض عن الهيدر

            for (let i = sections.length - 1; i >= 0; i--) {
                const section = sections[i];
                const element = document.getElementById(section);
                if (element) {
                    const offsetTop = element.offsetTop;
                    const offsetBottom = offsetTop + element.offsetHeight;
                    
                    if (scrollPosition >= offsetTop && scrollPosition < offsetBottom) {
                        setActiveSection(section);
                        break;
                    }
                }
            }
        };
        
        window.addEventListener("scroll", handleScroll);
        // استدعاء أولي لتحديد القسم النشط
        handleScroll();
        
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Use job titles for typing effect
    const toRotate = userId?.profile?.jobTitle
        ? [userId.profile.jobTitle]
        : ["Web Developer", "Designer", "Freelancer"];

    const period = 2000;

    // Memoize the tick function
    const tick = useCallback(() => {
        let i = loopNum % toRotate.length;
        let fullText = toRotate[i];
        let updatedText = isDeleting
            ? fullText.substring(0, text.length - 1)
            : fullText.substring(0, text.length + 1);

        setText(updatedText);

        if (isDeleting) {
            setDelta((prevDelta) => prevDelta / 2);
        }

        if (!isDeleting && updatedText === fullText) {
            setIsDeleting(true);
            setIndex((prevIndex) => prevIndex - 1);
            setDelta(period);
        } else if (isDeleting && updatedText === "") {
            setIsDeleting(false);
            setLoopNum(loopNum + 1);
            setIndex(1);
            setDelta(500);
        } else {
            setIndex((prevIndex) => prevIndex + 1);
        }
    }, [loopNum, toRotate, isDeleting, text, period]);

    useEffect(() => {
        let ticker = setInterval(() => {
            tick();
        }, delta);

        return () => {
            clearInterval(ticker);
        };
    }, [text, delta, tick]);

    // Navigation links
    const navLinks = [
        { id: "home", label: t("nav.home") },
        { id: "skills", label: t("nav.skills") },
        { id: "projects", label: t("nav.projects") },
        { id: "contact", label: t("nav.contact") },
    ];

    // Get social links if available
    const activeSocialLinks = socialLinks
        ? Object.entries(socialLinks).filter(([_, url]) =>
            url && typeof url === 'string' && url.trim() !== ""
        ) as [keyof SocialLinks, string][]
        : [];

    const handleScrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
            setIsMenuOpen(false);
            setActiveSection(sectionId);
        }
    };

    // دالة لتحديد إذا كان الرابط نشطاً
    const isActive = (sectionId: string) => {
        return activeSection === sectionId;
    };

    return (
        <>
            {/* Navigation Header */}
            <header className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-gray-900/95 backdrop-blur-sm shadow-lg' : 'bg-transparent'}`}>
                <div className="container mx-auto px-4 py-3">
                    <div className="flex justify-between items-center">
                        {/* Logo */}
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30">
                                <Image
                                    src={userId?.image || headerImg}
                                    alt={userId?.name || 'User'}
                                    width={40}
                                    height={40}
                                    className="object-cover w-full h-full"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = headerImg.src;
                                    }}
                                />
                            </div>
                            <div>
                                <h2 className="text-white font-bold text-lg">{userId?.name || 'User'}</h2>
                                <p className="text-gray-300 text-xs">
                                    {userId?.profile?.jobTitle || 'Portfolio'}
                                </p>
                            </div>
                        </div>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center gap-5">
                            {navLinks.map((link) => (
                                <button
                                    key={link.id}
                                    onClick={() => handleScrollToSection(link.id)}
                                    className={`relative text-sm font-medium transition-all duration-300 ${
                                        isActive(link.id) 
                                            ? 'text-white font-semibold' 
                                            : 'text-white/80 hover:text-white'
                                    }`}
                                >
                                    {link.label}
                                    {/* مؤشر النشاط */}
                                    {isActive(link.id) && (
                                        <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"></span>
                                    )}
                                </button>
                            ))}

                            {/* Language Switcher */}
                            <button
                                aria-label="Toggle language"
                                onClick={toggleLocale}
                                className="text-sm px-3 py-1 rounded border border-slate-300 dark:border-dark_border dark:text-white hover:bg-white/10 transition-colors duration-300"
                            >
                                {locale === "en" ? "العربية" : "English"}
                            </button>
                        </nav>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="md:hidden text-white"
                        >
                            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation Menu */}
                <div className={`md:hidden absolute w-full bg-gray-900/95 backdrop-blur-sm shadow-lg transition-all duration-300 ${isMenuOpen ? 'max-h-64 py-4' : 'max-h-0 py-0'} overflow-hidden`}>
                    <div className="container mx-auto px-4">
                        <div className="flex flex-col space-y-4">
                            {navLinks.map((link) => (
                                <button
                                    key={link.id}
                                    onClick={() => handleScrollToSection(link.id)}
                                    className={`relative text-base font-medium transition-all duration-300 text-left ${
                                        isActive(link.id) 
                                            ? 'text-white font-semibold pl-3 border-l-2 border-pink-500' 
                                            : 'text-white/80 hover:text-white'
                                    }`}
                                >
                                    {link.label}
                                </button>
                            ))}

                            {/* Language Switcher Mobile */}
                            <button
                                aria-label="Toggle language"
                                onClick={toggleLocale}
                                className={`text-sm px-3 py-1 rounded border transition-colors duration-300 ${
                                    isActive('language')
                                        ? 'border-pink-500 text-white bg-white/10'
                                        : 'border-slate-300 dark:border-dark_border dark:text-white'
                                }`}
                            >
                                {locale === "en" ? "العربية" : "English"}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section
                className="banner py-[260px] bg-cover bg-no-repeat bg-top pt-28"
                style={{
                    backgroundImage: `url(${banner.src})`,
                }}
                id="home"
            >
                <div className="container mx-auto">
                    <div className="flex flex-wrap items-center">
                        {/* Left Column - Text Content */}
                        <div className="w-full md:w-6/12 xl:w-7/12">
                            {/* Welcome Tag */}
                            <span className="tagline font-bold tracking-[0.8px] px-2 py-1 bg-gradient-to-r text-white from-pink-500 to-purple-500 bg-opacity-50 border-none rounded-sm text-[20px] mb-4 inline-block">
                                {t("portfolio.public.welcome") || "Welcome to my Portfolio"}
                            </span>

                            {/* Main Title with Typing Effect */}
                            <h1 className="800px:text-[65px] text-3xl font-bold tracking-[0.8px] leading-none mb-5 text-white capitalize">
                                {t("portfolio.public.hi") || "Hi!"} I&apos;m {userId?.name || 'User'}{" "}
                                <span
                                    className="txt-rotate border-r-[0.08em] border-gray-500"
                                    data-period="1000"
                                    data-rotate={toRotate}
                                >
                                    <span className="wrap">{text}</span>
                                </span>
                            </h1>

                            {/* Description */}
                            <p className="text-gray-400 text-[18px] tracking-[0.8px] leading-[1.5em] w-[96%] mb-10">
                                {description || t("portfolio.public.defaultDescription")}
                            </p>

                            {/* Connect Button */}
                            {contactInfo?.phone && (
                                <a
                                    href={`tel:${contactInfo.phone}`}
                                    className="group text-white font-bold text-[20px] mt-15 tracking-[0.8px] flex items-center hover:opacity-80 transition-opacity duration-300"
                                    onClick={() => console.log("connect")}
                                >
                                    {t("portfolio.public.letsConnect") || "Let's Connect"}
                                    <ArrowRight
                                        className="ml-2 text-[25px] transition-transform duration-300 group-hover:translate-x-1"
                                    />
                                </a>
                            )}

                            {/* Social Links */}
                            {activeSocialLinks.length > 0 && (
                                <div className="mt-8 flex gap-3">
                                    {activeSocialLinks.slice(0, 4).map(([platform, url]) => (
                                        <a
                                            key={platform}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all duration-300"
                                            title={platform}
                                        >
                                            <span className="text-sm font-medium">
                                                {platform.charAt(0).toUpperCase() + platform.slice(1)}
                                            </span>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right Column - Image */}
                        <div className="w-full md:w-6/12 xl:w-5/12">
                            <div className="relative">
                                <Image
                                    src={userId?.image || headerImg}
                                    alt={userId?.name || 'User'}
                                    className="animate-[updown_3s_linear_infinite] rounded-full mt-10 md:mt-0 w-[200px] h-[200px] md:w-[350px] md:h-[350px] mx-auto"
                                    width={1000}
                                    height={1000}
                                    style={{
                                        objectFit: 'cover',
                                        boxShadow: '0 0 30px rgba(0, 0, 0, 0.3)'
                                    }}
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = headerImg.src;
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Custom CSS */}
            <style jsx>{`
                @keyframes updown {
                    0%, 100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-20px);
                    }
                }
                
                .txt-rotate {
                    display: inline-block;
                }
                
                .wrap {
                    display: inline-block;
                }
                
                .mt-15 {
                    margin-top: 15px;
                }
                
                /* Support for RTL */
                html[dir="rtl"] .ml-2 {
                    margin-left: 0;
                    margin-right: 0.5rem;
                }
                
                html[dir="rtl"] .group-hover\:translate-x-1:hover {
                    transform: translateX(-0.25rem);
                }
                
                html[dir="rtl"] .pl-3 {
                    padding-left: 0;
                    padding-right: 0.75rem;
                }
                
                html[dir="rtl"] .border-l-2 {
                    border-left: 0;
                    border-right: 2px solid;
                }
            `}</style>
        </>
    );
}