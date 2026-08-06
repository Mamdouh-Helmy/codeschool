"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { X, Code2, Handshake, Sparkles, CheckCircle2 } from "lucide-react";
import { useLocale } from "@/app/context/LocaleContext";

interface GuestWelcomePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const GuestWelcomePopup: React.FC<GuestWelcomePopupProps> = ({ isOpen, onClose }) => {
  const { locale } = useLocale();
  const router = useRouter();
  const isRTL = locale === "ar";
  const direction = isRTL ? "rtl" : "ltr";

  const content = {
    ar: {
      title: "ابدأ ملفك الشخصي الموثق الآن!",
      subtitle1:
        "يسعدنا الانضمام للأسبقين في تأسيس الـ Personal Portfolio الخاص بك.",
      subtitle2:
        "هذه المنصة مصممة خصيصًا لتعكس خبراتك وتبرز مهاراتك بشكل احترافي يسهل مشاركتها مع شبكة علاقاتك أو جهات عمل مستقبلية.",
      point1:
        "من خلال ملفك الشخصي، ستتمكن من تنظيم مسيرتك المهنية وتقديم نفسك بشكل كبير ومعتمد في مجالك، بما يفتح لك أبواب التطور والنمو.",
      point2:
        "نحن نقدم لك أدوات ذكية لعرض إنجازاتك بأفضل صورة ممكنة لتكون جاهزًا لأي خطوة قادمة.",
      cta: "ابدأ في إضافة بياناتك وتحديث مسارك المهني.",
      button: "ابدأ بناء ملفك الشخصي",
      partnership: "Partnership",
      tedx: "TEDx",
      tedxSub: "T-TED",
    },
    en: {
      title: "Start Your Verified Personal Portfolio Now!",
      subtitle1:
        "We're excited to have you among the first to build your Personal Portfolio.",
      subtitle2:
        "This platform is designed to reflect your experience and highlight your skills professionally, making it easy to share with your network or future employers.",
      point1:
        "Through your portfolio, you'll be able to organize your career journey and present yourself as a credible expert in your field, opening doors for growth.",
      point2:
        "We give you smart tools to showcase your achievements in the best possible way, so you're ready for your next step.",
      cta: "Start adding your info and updating your career path.",
      button: "Build My Portfolio",
      partnership: "Partnership",
      tedx: "TEDx",
      tedxSub: "T-TED",
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Popup wrapper */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pointer-events-none">
            <motion.div
              key="guest-popup-content"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              dir={direction}
              className="relative w-full max-w-lg pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Card */}
              <div className="w-full max-h-[95vh] overflow-y-auto bg-white dark:bg-darkmode rounded-2xl sm:rounded-3xl shadow-2xl dark:shadow-black/40">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className={`absolute top-3 sm:top-4 ${
                    isRTL ? "left-3 sm:left-4" : "right-3 sm:right-4"
                  } z-[70] w-8 h-8 sm:w-9 sm:h-9 bg-white/90 dark:bg-darklight/90 rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-darklight transition-all duration-300 shadow-md hover:scale-110`}
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-darkmuted" />
                </button>

                {/* Top banner: partnership badges */}
                <div className="relative bg-gradient-to-br from-primary via-secondary to-teal-dark p-6 sm:p-8 flex items-center justify-center gap-3 sm:gap-5 overflow-hidden">
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(4)].map((_, i) => (
                      <motion.div
                        key={`sparkle-${i}`}
                        className="absolute"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                          y: [-15, 15, -15],
                          opacity: [0.2, 0.7, 0.2],
                          scale: [0.7, 1.2, 0.7],
                        }}
                        transition={{
                          duration: 4 + Math.random() * 2,
                          repeat: Infinity,
                          delay: Math.random() * 2,
                        }}
                      >
                        <Sparkles className="w-3 h-3 text-white/40" />
                      </motion.div>
                    ))}
                  </div>

                  {/* Code School badge */}
                  <div className="relative z-10 flex flex-col items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-16 px-3 sm:px-4 py-2.5 sm:py-3 border border-white/25">
                    <div className="bg-white rounded-full p-1.5 sm:p-2">
                      <Code2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <span className="text-white text-[10px] sm:text-xs font-bold tracking-wide">
                      CODE SCHOOL
                    </span>
                  </div>

                  {/* Partnership icon (link) */}
                  <div className="relative z-10 flex flex-col items-center gap-1.5">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-2.5 border border-white/30">
                      <Handshake className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <span className="text-white/90 text-[10px] sm:text-xs font-medium">
                      {t.partnership}
                    </span>
                  </div>

                  {/* TEDx badge */}
                  <div className="relative z-10 flex flex-col items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-16 px-3 sm:px-4 py-2.5 sm:py-3 border border-white/25">
                    <span className="text-white text-sm sm:text-base font-extrabold leading-none">
                      {t.tedx}
                      <span className="align-super text-[8px] sm:text-[10px] ms-0.5">x</span>
                    </span>
                    <span className="text-white/90 text-[9px] sm:text-[10px] font-semibold tracking-widest">
                      {t.tedxSub}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className={`p-5 sm:p-7 md:p-8 ${isRTL ? "text-right" : "text-left"}`}>
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-xl sm:text-2xl md:text-26 font-bold text-MidnightNavyText dark:text-white mb-3 sm:mb-4 leading-snug"
                  >
                    {t.title}
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-sm sm:text-base text-SlateBlueText dark:text-darkmuted leading-relaxed mb-3"
                  >
                    {t.subtitle1}
                  </motion.p>

                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="text-sm sm:text-base text-SlateBlueText dark:text-darkmuted leading-relaxed mb-5 sm:mb-6"
                  >
                    {t.subtitle2}
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-3 mb-5 sm:mb-6"
                  >
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-secondary flex-shrink-0 mt-0.5" />
                      <p className="text-sm sm:text-base text-MidnightNavyText dark:text-white leading-relaxed">
                        {t.point1}
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-secondary flex-shrink-0 mt-0.5" />
                      <p className="text-sm sm:text-base text-MidnightNavyText dark:text-white leading-relaxed">
                        {t.point2}
                      </p>
                    </div>
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className="text-sm sm:text-base font-medium text-MidnightNavyText dark:text-white mb-5 sm:mb-6"
                  >
                    {t.cta}
                  </motion.p>

                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStart}
                    className="w-full bg-secondary hover:bg-teal-dark text-white font-semibold py-3 sm:py-3.5 px-4 sm:px-6 rounded-12 sm:rounded-14 transition-all duration-300 shadow-lg hover:shadow-xl text-sm sm:text-base"
                  >
                    {t.button}
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