"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import { X, CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";
import { useLocale } from "@/app/context/LocaleContext";

interface GuestWelcomePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GuestPopupContent {
  titleAr: string; titleAccentAr: string; subtitle1Ar: string; subtitle2Ar: string;
  point1TitleAr: string; point1Ar: string; point2TitleAr: string; point2Ar: string;
  ctaAr: string; buttonAr: string; tag1Ar: string; tag2Ar: string; tag3Ar: string; liveAr: string;
  titleEn: string; titleAccentEn: string; subtitle1En: string; subtitle2En: string;
  point1TitleEn: string; point1En: string; point2TitleEn: string; point2En: string;
  ctaEn: string; buttonEn: string; tag1En: string; tag2En: string; tag3En: string; liveEn: string;
  buttonLink: string;
  stampLogoUrlLight?: string;
  stampLogoUrlDark?: string;
  isActive: boolean;
}

const DEFAULT_LOGO_LIGHT = "/images/logo/logo.png";
const DEFAULT_LOGO_DARK  = "/images/logo/footer-logo-white.png";

const cardStage: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.13, delayChildren: 0.35 } },
};
const barIn: Variants = {
  hidden: { scaleX: 0, opacity: 0 },
  show: { scaleX: 1, opacity: 1, transition: { duration: 0.45, ease: "easeOut" } },
};
const tagIn: Variants = {
  hidden: { scale: 0, opacity: 0 },
  show: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 340, damping: 22 } },
};

const GuestWelcomePopup: React.FC<GuestWelcomePopupProps> = ({ isOpen, onClose }) => {
  const { locale } = useLocale();
  const router = useRouter();
  const isRTL = locale === "ar";
  const direction = isRTL ? "rtl" : "ltr";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const [content, setContent] = useState<GuestPopupContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const fetchContent = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/section-guest-popup?activeOnly=true");
        const json = await res.json();

        if (json.success && json.data) {
          setContent(json.data);
        } else {
          setContent(null);
          onClose();
        }
      } catch (error) {
        console.error("Error fetching guest popup data:", error);
        setContent(null);
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [isOpen, onClose]);

  if (!isOpen || loading || !content) return null;

  const s = isRTL ? "Ar" : "En";
  const t = {
    title:       content[`title${s}` as keyof GuestPopupContent] as string,
    titleAccent: content[`titleAccent${s}` as keyof GuestPopupContent] as string,
    subtitle1:   content[`subtitle1${s}` as keyof GuestPopupContent] as string,
    subtitle2:   content[`subtitle2${s}` as keyof GuestPopupContent] as string,
    point1Title: content[`point1Title${s}` as keyof GuestPopupContent] as string,
    point1:      content[`point1${s}` as keyof GuestPopupContent] as string,
    point2Title: content[`point2Title${s}` as keyof GuestPopupContent] as string,
    point2:      content[`point2${s}` as keyof GuestPopupContent] as string,
    cta:         content[`cta${s}` as keyof GuestPopupContent] as string,
    button:      content[`button${s}` as keyof GuestPopupContent] as string,
    tag1:        content[`tag1${s}` as keyof GuestPopupContent] as string,
    tag2:        content[`tag2${s}` as keyof GuestPopupContent] as string,
    tag3:        content[`tag3${s}` as keyof GuestPopupContent] as string,
    live:        content[`live${s}` as keyof GuestPopupContent] as string,
  };

  const stampLight = content.stampLogoUrlLight || DEFAULT_LOGO_LIGHT;
  const stampDark  = content.stampLogoUrlDark  || DEFAULT_LOGO_DARK;

  const handleStart = () => {
    onClose();
    router.push(content.buttonLink || "/portfolio/builder");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="guest-popup-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-teal-deeper/70 backdrop-blur-md z-50"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pointer-events-none">
            <motion.div
              key="guest-popup-content"
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ type: "spring", damping: 22, stiffness: 260 }}
              dir={direction}
              className="relative w-full max-w-lg pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="absolute -inset-8 -z-10 bg-brand-warm opacity-30 dark:opacity-20 blur-3xl rounded-full pointer-events-none"
                aria-hidden="true"
              />

              <div className="w-full max-h-[95vh] overflow-y-auto bg-white dark:bg-darklight rounded-2xl sm:rounded-3xl shadow-brand-lg border border-white/60 dark:border-dark_border">
                <button
                  onClick={onClose}
                  aria-label={isRTL ? "إغلاق" : "Close"}
                  className={`absolute top-3 sm:top-4 ${
                    isRTL ? "left-3 sm:left-4" : "right-3 sm:right-4"
                  } z-[70] w-8 h-8 sm:w-9 sm:h-9 bg-white/90 dark:bg-dark_input/90 rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-dark_input transition-all duration-300 shadow-md hover:scale-110`}
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 text-secondary dark:text-darkmuted" />
                </button>

                {/* ── Hero: a portfolio card being stamped verified ── */}
                <div className="relative overflow-hidden bg-gradient-to-br from-IcyBreeze via-PaleCyan to-IcyBreeze dark:from-darkmode dark:via-teal-deeper dark:to-darkmode pt-6 pb-9 sm:pt-7 sm:pb-10 px-8">
                  <div
                    className="absolute inset-0 opacity-[0.07] dark:opacity-[0.1] pointer-events-none"
                    style={{
                      backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
                      backgroundSize: "16px 16px",
                      color: "#004d59",
                    }}
                    aria-hidden="true"
                  />

                  {/* Mini portfolio-card mockup */}
                  <div className="relative mx-auto w-[60%] sm:w-[54%]">
                    <motion.div
                      variants={cardStage}
                      initial="hidden"
                      animate="show"
                      style={{ rotate: isRTL ? 2.5 : -2.5 }}
                      className="relative bg-white dark:bg-darkcard rounded-14 shadow-brand-md border border-PeriwinkleBorder/60 dark:border-dark_border p-3 sm:p-3.5"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-brand-primary flex-shrink-0" />
                        <div className="flex-1 space-y-1">
                          <motion.div
                            variants={barIn}
                            style={{ transformOrigin: isRTL ? "right" : "left" }}
                            className="h-2 w-3/5 rounded-full bg-secondary/25 dark:bg-white/20"
                          />
                          <motion.div
                            variants={barIn}
                            style={{ transformOrigin: isRTL ? "right" : "left" }}
                            className="h-1.5 w-2/5 rounded-full bg-secondary/15 dark:bg-white/10"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-2">
                        {[t.tag1, t.tag2, t.tag3].map((tag, i) => (
                          <motion.span
                            key={i}
                            variants={tagIn}
                            className="text-[8px] sm:text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-amber-brand/15 text-teal-dark dark:text-amber-brand"
                          >
                            {tag}
                          </motion.span>
                        ))}
                      </div>

                      <motion.div variants={barIn} style={{ transformOrigin: isRTL ? "right" : "left" }}>
                        <div className="h-px w-full bg-PeriwinkleBorder dark:bg-dark_border mb-1.5" />
                        <div className="flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-secondary dark:bg-amber-brand" />
                          <span className="text-[8px] sm:text-[9px] font-medium text-secondary/70 dark:text-darkmuted">
                            {t.live}
                          </span>
                        </div>
                      </motion.div>
                    </motion.div>

                    {/* Verified rubber stamp — the signature element */}
                    <motion.div
                      initial={{ scale: 0, opacity: 0, rotate: isRTL ? 12 : -20 }}
                      animate={{ scale: 1, opacity: 1, rotate: isRTL ? 8 : -14 }}
                      transition={{ delay: 1.05, type: "spring", stiffness: 200, damping: 14 }}
                      className={`absolute -top-5 ${
                        isRTL ? "-left-6 sm:-left-8" : "-right-6 sm:-right-8"
                      } w-[92px] h-[92px] sm:w-[104px] sm:h-[104px]`}
                    >
                      <svg viewBox="0 0 120 120" className="w-full h-full text-secondary dark:text-amber-brand">
                        <defs>
                          <path
                            id="stampRing"
                            d="M 60,60 m -52,0 a 52,52 0 1,1 104,0 a 52,52 0 1,1 -104,0"
                          />
                        </defs>
                        <circle cx="60" cy="60" r="58" fill="none" stroke="currentColor" strokeOpacity="0.9" strokeWidth="2" />
                        <circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" strokeOpacity="0.9" strokeWidth="1.5" />
                        <text fontSize="9" fontWeight="700" letterSpacing="2.5" fill="currentColor">
                          <textPath href="#stampRing" startOffset="0%">
                            {isRTL
                              ? "كود سكول • ملف موثّق • كود سكول • ملف موثّق •"
                              : "CODE SCHOOL • VERIFIED • CODE SCHOOL • VERIFIED •"}
                          </textPath>
                        </text>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-darkmode flex items-center justify-center overflow-hidden shadow-sm">
                          {/* ✅ صورة اللايت — تظهر بس في اللايت مود */}
                          <div className="relative w-6 h-6 sm:w-7 sm:h-7 dark:hidden">
                            <Image src={stampLight} alt="Code School" fill className="object-contain" sizes="28px" />
                          </div>
                          {/* ✅ صورة الدارك — تظهر بس في الدارك مود */}
                          <div className="relative w-6 h-6 sm:w-7 sm:h-7 hidden dark:block">
                            <Image src={stampDark} alt="Code School" fill className="object-contain" sizes="28px" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Content */}
                <div className={`p-6 sm:p-8 ${isRTL ? "text-right" : "text-left"}`}>
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-2xl sm:text-28 md:text-32 font-extrabold text-MidnightNavyText dark:text-white mb-4 leading-tight tracking-tight"
                  >
                    {t.title}{" "}
                    <span className="relative inline-block text-primary">
                      {t.titleAccent}
                      <svg
                        className="absolute -bottom-1 left-0 w-full"
                        height="6"
                        viewBox="0 0 100 6"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                      >
                        <path d="M0,4 Q25,0 50,3 T100,2" stroke="#feaf00" strokeWidth="3" fill="none" strokeLinecap="round" />
                      </svg>
                    </span>
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-sm sm:text-base text-SlateBlueText dark:text-darkmuted leading-relaxed mb-2.5"
                  >
                    {t.subtitle1}
                  </motion.p>

                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="text-sm sm:text-base text-SlateBlueText dark:text-darkmuted leading-relaxed mb-6"
                  >
                    {t.subtitle2}
                  </motion.p>

                  {/* Two feature cards, side by side */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-2 gap-3 sm:gap-4 mb-6"
                  >
                    {[
                      { title: t.point1Title, body: t.point1 },
                      { title: t.point2Title, body: t.point2 },
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ y: -3 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="rounded-16 bg-IcyBreeze/80 dark:bg-dark_input/50 border border-PeriwinkleBorder/50 dark:border-dark_border p-3"
                      >
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-brand-primary flex items-center justify-center mb-1.5">
                          <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                        </div>
                        <p className="text-[11px] sm:text-xs font-semibold text-MidnightNavyText dark:text-white mb-0.5">
                          {item.title}
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-SlateBlueText/90 dark:text-darkmuted leading-relaxed">
                          {item.body}
                        </p>
                      </motion.div>
                    ))}
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className="text-sm sm:text-base font-medium text-MidnightNavyText dark:text-white mb-5"
                  >
                    {t.cta}
                  </motion.p>

                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStart}
                    className="group w-full relative overflow-hidden bg-brand-primary text-white font-semibold py-3.5 sm:py-4 px-6 rounded-14 transition-shadow duration-300 shadow-brand-md hover:shadow-brand-lg text-sm sm:text-base flex items-center justify-center gap-2"
                  >
                    <span
                      className="absolute inset-0 bg-brand-warm opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      aria-hidden="true"
                    />
                    <span className="relative">{t.button}</span>
                    <ArrowIcon className="relative w-4 h-4 transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default GuestWelcomePopup;