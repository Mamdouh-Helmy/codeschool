"use client";
import React from "react";
import Image from "next/image";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import { X, CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";
import { useLocale } from "@/app/context/LocaleContext";

interface GuestWelcomePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ── Motion choreography: the mini card "fills itself in" ────────── */
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

  const content = {
    ar: {
      title: "شوف ملفك وهو",
      titleAccent: "بيتوثّق",
      subtitle1:
        "يسعدنا الانضمام للأسبقين في تأسيس الـ Personal Portfolio الخاص بك.",
      subtitle2:
        "منصة مصممة خصيصًا لتعكس خبراتك وتبرز مهاراتك بشكل احترافي، يسهل مشاركتها مع شبكة علاقاتك أو جهات عمل مستقبلية.",
      point1Title: "مسار مهني منظم",
      point1: "قدّم نفسك بشكل معتمد وموثوق في مجالك.",
      point2Title: "أدوات عرض ذكية",
      point2: "أبرز إنجازاتك بأفضل صورة ممكنة.",
      cta: "ابدأ في إضافة بياناتك وتحديث مسارك المهني",
      button: "ابدأ بناء ملفك الشخصي",
      tag1: "مهارة",
      tag2: "مهارة",
      tag3: "+٥",
      live: "موثّق",
    },
    en: {
      title: "Watch your profile",
      titleAccent: "get verified",
      subtitle1:
        "We're excited to have you among the first to build your Personal Portfolio.",
      subtitle2:
        "A platform designed to reflect your experience and highlight your skills professionally — easy to share with your network or future employers.",
      point1Title: "A career, organized",
      point1: "Present yourself as a credible, verified expert in your field.",
      point2Title: "Smart showcase tools",
      point2: "Highlight your achievements in the best possible light.",
      cta: "Start adding your info and updating your career path.",
      button: "Build My Portfolio",
      tag1: "Skill",
      tag2: "Skill",
      tag3: "+5",
      live: "Verified",
    },
  };

  const t = isRTL ? content.ar : content.en;

  const handleStart = () => {
    onClose();
    router.push("/portfolio/builder");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="guest-popup-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-teal-deeper/70 backdrop-blur-md z-50"
            onClick={onClose}
          />

          {/* Popup wrapper */}
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
              {/* Soft ambient wash behind the card — kept to one place, no scatter */}
              <div
                className="absolute -inset-8 -z-10 bg-brand-warm opacity-30 dark:opacity-20 blur-3xl rounded-full pointer-events-none"
                aria-hidden="true"
              />

              {/* Card */}
              <div className="w-full max-h-[95vh] overflow-y-auto bg-white dark:bg-darklight rounded-2xl sm:rounded-3xl shadow-brand-lg border border-white/60 dark:border-dark_border">
                {/* Close button */}
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
                          <div className="relative w-6 h-6 sm:w-7 sm:h-7 dark:hidden">
                            <Image src="/images/logo/logo.png" alt="Code School" fill className="object-contain" sizes="28px" />
                          </div>
                          <div className="relative w-6 h-6 sm:w-7 sm:h-7 hidden dark:block">
                            <Image
                              src="/images/logo/footer-logo-white.png"
                              alt="Code School"
                              fill
                              className="object-contain"
                              sizes="28px"
                            />
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