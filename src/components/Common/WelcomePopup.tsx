"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/i18n/I18nProvider";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  X,
  Phone,
  Mail,
  Star,
  Gift,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Users,
  GraduationCap,
  Heart,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useLocale } from "@/app/context/LocaleContext";

interface WelcomePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WelcomePopupData {
  // الصور
  imageUrl?: string;
  secondImageUrl?: string;
  imageAlt?: string;
  secondImageAlt?: string;
  
  // بيانات الـ Welcome Popup
  welcomeTitle?: string;
  welcomeSubtitle1?: string;
  welcomeSubtitle2?: string;
  welcomeFeature1?: string;
  welcomeFeature2?: string;
  welcomeFeature3?: string;
  welcomeFeature4?: string;
  welcomeFeature5?: string;
  welcomeFeature6?: string;
  
  // الأرقام
  discount?: number;
  happyParents?: string;
  graduates?: string;
}

const WelcomePopup: React.FC<WelcomePopupProps> = ({ isOpen, onClose }) => {
  const { locale } = useLocale();
  const { t } = useI18n();
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [welcomeData, setWelcomeData] = useState<WelcomePopupData | null>(null);

  const isRTL = locale === "ar";
  const direction = isRTL ? "rtl" : "ltr";

  useEffect(() => {
    const fetchWelcomeData = async () => {
      try {
        // جلب بيانات الـ Welcome Popup المخصصة
        const res = await fetch(`/api/section-images-hero?sectionName=welcome-popup&activeOnly=true&language=${locale}`);
        const result = await res.json();
        if (result.success && result.data.length > 0) {
          setWelcomeData(result.data[0]);
        }
      } catch (error) {
        console.error('Error fetching welcome popup data:', error);
      }
    };

    fetchWelcomeData();
  }, [locale]); // إضافة locale علشان البيانات تتغير مع تغيير اللغة

  const getImageSrc = (imageUrl: string | undefined, defaultImage: string): string => {
    if (!imageUrl) return defaultImage;
    if (imageUrl.startsWith('data:image')) return imageUrl;
    return imageUrl;
  };

  // استخدام البيانات من API أو الترجمات الافتراضية
  const slides = [
    {
      title: welcomeData?.welcomeTitle || t("hero.title") || "Empower Young Minds!",
      subtitle: welcomeData?.welcomeSubtitle1 || t("welcome.subtitle1") || "Transform your child's future with coding",
      imageUrl: getImageSrc(welcomeData?.imageUrl, "/images/hero/john.png"),
      features: [
        welcomeData?.welcomeFeature1 || t("welcome.feature1") || "Expert Coding Instructors",
        welcomeData?.welcomeFeature2 || t("welcome.feature2") || "Interactive Learning Platform",
        welcomeData?.welcomeFeature3 || t("welcome.feature3") || "Project-Based Curriculum",
      ],
      icon: GraduationCap,
    },
    {
      title: t("welcome.specialOffer") || "Special Launch Offer!",
      subtitle: welcomeData?.welcomeSubtitle2 || t("welcome.subtitle2") || "Get 30% off on all courses",
      imageUrl: getImageSrc(welcomeData?.secondImageUrl, "/images/hero/maria.png"),
      features: [
        welcomeData?.welcomeFeature4 || t("welcome.feature4") || "All Age Groups (6-18)",
        welcomeData?.welcomeFeature5 || t("welcome.feature5") || "International Certificate",
        welcomeData?.welcomeFeature6 || t("welcome.feature6") || "Flexible Schedule",
      ],
      icon: Heart,
    },
  ];

  const currentSlideData = slides[currentSlide];
  const CurrentIcon = currentSlideData.icon;
  const discount = welcomeData?.discount || 30;

  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, slides.length]);

  const handleWhatsAppContact = () => {
    const number = "201140474129";
    const message =
      locale === "ar"
        ? encodeURIComponent(
            t("welcome.whatsappMessage") || "مرحبًا! أهتم بدورات البرمجة للأطفال. هل يمكنكم مساعدتي؟",
          )
        : encodeURIComponent(
            t("welcome.whatsappMessage") || "Hello! I'm interested in coding courses for children. Can you help me?",
          );
    window.open(`https://wa.me/${number}?text=${message}`, "_blank");
    onClose();
  };

  const handlePhoneContact = () => {
    window.open("tel:+201140474129", "_self");
    onClose();
  };

  const handleEmailContact = () => {
    const subject =
      locale === "ar"
        ? encodeURIComponent(t("welcome.emailSubject") || "استفسار عن دورات البرمجة")
        : encodeURIComponent(t("welcome.emailSubject") || "Inquiry about Coding Courses");
    const body =
      locale === "ar"
        ? encodeURIComponent(
            t("welcome.emailBody") || "مرحبًا، أريد معرفة المزيد عن دورات البرمجة للأطفال.",
          )
        : encodeURIComponent(
            t("welcome.emailBody") || "Hello, I would like to know more about coding courses for children.",
          );
    window.open(
      `mailto:Engabdallah.naser@gmail.com?subject=${subject}&body=${body}`,
      "_self",
    );
    onClose();
  };
// console.log('Welcome Popup Data:', welcomeData);
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed inset-2 sm:inset-4 md:inset-8 lg:inset-16 xl:inset-20 z-50 flex items-center justify-center p-2 sm:p-4"
            dir={direction}
          >
            <div className="relative w-full max-w-4xl h-auto max-h-[98vh] bg-white dark:bg-darkmode rounded-2xl sm:rounded-3xl shadow-2xl border-none overflow-hidden">
              <button
                onClick={onClose}
                className={`absolute top-2 sm:top-4 ${isRTL ? "left-2 sm:left-4" : "right-2 sm:right-4"} z-10 w-8 h-8 sm:w-10 sm:h-10 bg-white/90 dark:bg-darklight/90 rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-darklight transition-all duration-300 shadow-lg hover:scale-110`}
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-darktext" />
              </button>

              <div
                className={`flex flex-col lg:flex-row ${isRTL ? "lg:flex-row-reverse" : ""} h-full`}
              >
                <div className="lg:w-1/2 xl:w-2/5 relative overflow-hidden bg-gradient-to-br from-primary via-[#7a45e6] to-[#6a3ac9] p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-[300px] sm:min-h-[400px] lg:min-h-[500px]">
                  <div className="absolute inset-0 overflow-hidden">
                    {[...Array(6)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                          y: [-20, 20, -20],
                          opacity: [0.2, 0.8, 0.2],
                          scale: [0.7, 1.3, 0.7],
                        }}
                        transition={{
                          duration: 4 + Math.random() * 3,
                          repeat: Infinity,
                          delay: Math.random() * 2,
                        }}
                      >
                        <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-white/50" />
                      </motion.div>
                    ))}
                  </div>

                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6 }}
                    className="relative z-10 text-center w-full"
                  >
                    <div className="mb-4 sm:mb-6">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 sm:p-4 w-16 h-16 sm:w-20 sm:h-20 mx-auto flex items-center justify-center mb-3">
                        <CurrentIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                      </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm rounded-14 sm:rounded-22 p-3 sm:p-4 mb-4 sm:mb-6 mx-auto max-w-[280px]">
                      <Image
                        src={currentSlideData.imageUrl}
                        alt={welcomeData?.imageAlt || "Welcome"}
                        width={200}
                        height={200}
                        className="w-20 h-20 sm:w-60 sm:h-60 md:w-40 md:h-40 object-contain mx-auto rounded-14"
                      />
                    </div>

                    <div className="w-full max-w-md mx-auto grid grid-cols-1 gap-2 sm:gap-3">
                      {currentSlideData.features.map((feature, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + index * 0.1 }}
                          className="w-full flex items-center gap-2 sm:gap-3 bg-white/20 backdrop-blur-sm rounded-12 sm:rounded-14 p-2 sm:p-3 md:p-4 border border-white/30"
                        >
                          <div className="bg-white/30 rounded-full p-1 flex-shrink-0">
                            <Star className="w-3 h-3 sm:w-4 sm:h-4 text-LightYellow" />
                          </div>
                          <span className="text-white font-semibold text-sm sm:text-base flex-1 text-center sm:text-start">
                            {feature}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  <div className="absolute bottom-3 sm:bottom-4 md:bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2">
                    {slides.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                          currentSlide === index
                            ? "bg-LightYellow w-4 sm:w-6 md:w-8 shadow-lg"
                            : "bg-white/60"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="lg:w-1/2 xl:w-3/5 p-4 sm:p-6 md:p-8 flex flex-col justify-center bg-IcyBreeze dark:bg-darklight overflow-y-auto">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className={isRTL ? "text-right" : "text-left"}
                  >
                    <div className="mb-4 sm:mb-6">
                      <motion.h2
                        className="text-2xl sm:text-3xl md:text-32 lg:text-40 font-bold text-MidnightNavyText dark:text-white mb-3 sm:mb-4 leading-tight"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        {currentSlideData.title}
                      </motion.h2>

                      <motion.p
                        className="text-base sm:text-lg text-SlateBlueText dark:text-darktext mb-4 sm:mb-6 leading-relaxed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        {currentSlideData.subtitle}
                      </motion.p>

                      {currentSlide === 1 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.4 }}
                          className="bg-gradient-to-r from-primary to-[#ffbd59] text-white p-3 sm:p-4 rounded-12 sm:rounded-14 mb-4 sm:mb-6 flex items-center gap-3 sm:gap-4 shadow-lg"
                        >
                          <div className="bg-white/20 rounded-full p-1 sm:p-2 flex-shrink-0">
                            <Gift className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                          <div>
                            <div className="font-bold text-xl sm:text-24">{discount}% OFF</div>
                            <div className="text-xs sm:text-sm opacity-90 font-medium">
                              {t("welcome.limitedTime") || "Limited Time Offer"}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="space-y-3 sm:space-y-4"
                    >
                      <h3 className="text-lg sm:text-20 font-semibold text-MidnightNavyText dark:text-white mb-3 sm:mb-4">
                        {t("welcome.contactUs") || "Start Your Child's Journey Today!"}
                      </h3>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleWhatsAppContact}
                        className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-12 sm:rounded-14 transition-all duration-300 flex items-center justify-center gap-2 sm:gap-3 shadow-lg hover:shadow-xl text-sm sm:text-base"
                      >
                        <FaWhatsapp className="text-xl sm:text-24" />
                        <span>
                          {t("welcome.whatsappButton") || "Free Consultation on WhatsApp"}
                        </span>
                        {isRTL ? (
                          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                        ) : (
                          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </motion.button>

                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handlePhoneContact}
                          className="bg-ElectricAqua hover:bg-RegalBlue text-white font-semibold py-2 sm:py-3 px-3 sm:px-4 rounded-12 sm:rounded-14 transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2 shadow-lg text-xs sm:text-sm"
                        >
                          <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>
                            {t("welcome.callButton") || "Call Now"}
                          </span>
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleEmailContact}
                          className="bg-primary hover:bg-[#7a45e6] text-white font-semibold py-2 sm:py-3 px-3 sm:px-4 rounded-12 sm:rounded-14 transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2 shadow-lg text-xs sm:text-sm"
                        >
                          <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>
                            {t("welcome.emailButton") || "Email Us"}
                          </span>
                        </motion.button>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                      className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-300 dark:border-dark_border"
                    >
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 md:gap-6 text-xs sm:text-sm text-SlateBlueText dark:text-darktext">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 sm:w-4 sm:h-4 text-YellowRating" />
                            <Star className="w-3 h-3 sm:w-4 sm:h-4 text-YellowRating" />
                            <Star className="w-3 h-3 sm:w-4 sm:h-4 text-YellowRating" />
                            <Star className="w-3 h-3 sm:w-4 sm:h-4 text-YellowRating" />
                            <Star className="w-3 h-3 sm:w-4 sm:h-4 text-YellowRating" />
                          </div>
                          <span className="font-semibold">4.9/5</span>
                        </div>
                        <span className="hidden sm:inline text-gray-400">•</span>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-primary" />
                          <span className="font-medium">
                            {welcomeData?.happyParents || t("welcome.happyParents") || "Happy Parents"}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default WelcomePopup;