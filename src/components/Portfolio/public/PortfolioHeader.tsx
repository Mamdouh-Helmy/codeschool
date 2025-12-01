// components/Portfolio/public/PortfolioHeader.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import headerImg from "../../../../public/images/portfolio/img/header-img.svg";
import banner from "../../../../public/images/portfolio/img/banner-bg.png";
// import "animate.css";
import TrackVisibility from "react-on-screen";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { PublicPortfolio, SocialLinks } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";

interface PortfolioHeaderProps {
    portfolio: PublicPortfolio;
}

export default function PortfolioHeader({ portfolio }: PortfolioHeaderProps) {
    const { t } = useI18n();
    const { userId, description, socialLinks, contactInfo } = portfolio;

    // Typing effect states
    const [loopNum, setLoopNum] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [text, setText] = useState("");
    const [delta, setDelta] = useState(300 - Math.random() * 100);
    const [index, setIndex] = useState(1);

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

    // Get social links if available
    const activeSocialLinks = socialLinks
        ? Object.entries(socialLinks).filter(([_, url]) =>
            url && typeof url === 'string' && url.trim() !== ""
        ) as [keyof SocialLinks, string][]
        : [];


    return (
        <section
            className="banner mt-0 py-[260px] bg-cover bg-no-repeat bg-top"
            style={{
                backgroundImage: `url(${banner.src})`,
            }}
            id="home"
        >
            <div className="container mx-auto">
                <div className="flex flex-wrap items-center">
                    {/* Left Column - Text Content */}
                    <div className="w-full md:w-6/12 xl:w-7/12">
                        <TrackVisibility>
                            {({ isVisible }) => (
                                <div
                                    className={
                                        isVisible ? "animate__animated animate__fadeIn" : ""
                                    }
                                >
                                    {/* Welcome Tag */}
                                    <span className="tagline mt-20 md:mt-0 font-bold tracking-[0.8px] px-2 py-1 bg-gradient-to-r text-white from-pink-500 to-purple-500 bg-opacity-50 border-none rounded-sm text-[20px] mb-4 inline-block">
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
                                            className="text-white font-bold text-[20px] mt-15 tracking-[0.8px] flex items-center hover:opacity-80 transition-opacity duration-300"
                                            onClick={() => console.log("connect")}
                                        >
                                            {t("portfolio.public.letsConnect") || "Let's Connect"}
                                            <ArrowRight
                                                className="ml-2 text-[25px] transition-transform duration-300 group-hover:translate-x-1"
                                            />
                                        </a>
                                    )}

                                    {/* Social Links (Optional - يمكن إضافتها إذا كنت تريدها) */}
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
                                                    {/* يمكنك إضافة أيقونات هنا إذا أردت */}
                                                    <span className="text-sm font-medium">
                                                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                                                    </span>
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </TrackVisibility>
                    </div>

                    {/* Right Column - Image */}
                    <div className="w-full md:w-6/12 xl:w-5/12">
                        <TrackVisibility>
                            {({ isVisible }) => (
                                <div
                                    className={
                                        isVisible ? "animate__animated animate__zoomIn" : ""
                                    }
                                >
                                    <Image
                                        src={userId?.image || headerImg}
                                        alt={userId?.name || 'User'}
                                        className="animate-[updown_3s_linear_infinite] rounded-full mt-10 md:mt-0 w-[200px] h-[200px] md:w-[350px] md:h-[350px] "
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
                            )}
                        </TrackVisibility>
                    </div>
                </div>
            </div>

            {/* Custom CSS for updown animation */}
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
            `}</style>
        </section>
    );
}