"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocale } from "@/app/context/LocaleContext";
import WebinarRegistrationForm from "./WebinarRegistrationForm";

interface SiteContent {
  _id: string;
  language: string;
  imageUrl: string;
  secondImageUrl: string;
  imageAlt: string;
  secondImageAlt: string;
  heroTitleAr: string;
  heroDescriptionAr: string;
  instructor1Ar: string;
  instructor1RoleAr: string;
  instructor2Ar: string;
  instructor2RoleAr: string;
  heroTitleEn: string;
  heroDescriptionEn: string;
  instructor1En: string;
  instructor1RoleEn: string;
  instructor2En: string;
  instructor2RoleEn: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface Webinar {
  _id: string;
  title: string;
  date: string;
  time: string;
  formattedDate: string;
  formattedTime: string;
  instructor: string;
  maxAttendees: number;
  currentAttendees: number;
}

const Hero = () => {
  const { t } = useI18n();
  const { locale } = useLocale();
  const isRTL = locale === "ar";

  const [showFullText, setShowFullText] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [siteContent, setSiteContent] = useState<SiteContent | null>(null);
  const [nextWebinar, setNextWebinar] = useState<Webinar | null>(null);
  const [loadingContent, setLoadingContent] = useState(true);
  const [loadingWebinar, setLoadingWebinar] = useState(true);

  // ✅ جلب بيانات Hero من API
  useEffect(() => {
    const fetchHeroData = async () => {
      try {
        setLoadingContent(true);
        const response = await fetch(`/api/section-images-hero?activeOnly=true`);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
          setSiteContent(result.data[0]);
        }
      } catch (error) {
        console.error('Error fetching hero data:', error);
      } finally {
        setLoadingContent(false);
      }
    };

    fetchHeroData();
  }, [locale]);

  // ✅ جلب بيانات Webinar من API منفصل
  useEffect(() => {
    const fetchWebinarData = async () => {
      try {
        setLoadingWebinar(true);
        const response = await fetch('/api/webinars/next');
        const result = await response.json();

        if (result.success && result.data) {
          setNextWebinar(result.data);
        }
      } catch (error) {
        console.error('Error fetching webinar data:', error);
      } finally {
        setLoadingWebinar(false);
      }
    };

    fetchWebinarData();
  }, []);

  // ✅ الحصول على البيانات بناءً على اللغة الحالية
  const getContentByLanguage = () => {
    if (!siteContent) return null;

    if (locale === "ar") {
      return {
        imageUrl: siteContent.imageUrl,
        secondImageUrl: siteContent.secondImageUrl,
        imageAlt: siteContent.imageAlt || "صورة الهيرو",
        secondImageAlt: siteContent.secondImageAlt || "الصورة الثانية",
        heroTitle: siteContent.heroTitleAr || "إطلاق طاقة المبدعين الصغار!",
        heroDescription: siteContent.heroDescriptionAr || "",
        instructor1: siteContent.instructor1Ar || "ياسين عبدالله",
        instructor1Role: siteContent.instructor1RoleAr || "تعلم الآلة",
        instructor2: siteContent.instructor2Ar || "فريدة عبدالله",
        instructor2Role: siteContent.instructor2RoleAr || "تطوير الويب",
      };
    } else {
      return {
        imageUrl: siteContent.imageUrl,
        secondImageUrl: siteContent.secondImageUrl,
        imageAlt: siteContent.imageAlt || "Hero image",
        secondImageAlt: siteContent.secondImageAlt || "Second image",
        heroTitle: siteContent.heroTitleEn || "Empower Young Minds!",
        heroDescription: siteContent.heroDescriptionEn || "",
        instructor1: siteContent.instructor1En || "Yassin Abdullah",
        instructor1Role: siteContent.instructor1RoleEn || "Machine Learning",
        instructor2: siteContent.instructor2En || "Farida Abdullah",
        instructor2Role: siteContent.instructor2RoleEn || "Web Development",
      };
    }
  };

  const content = getContentByLanguage();

  // استخدام الوصف من API أو الترجمات الافتراضية
  const fullText = content?.heroDescription || t("hero.description");
  const preview = fullText.split(" ").slice(0, 36).join(" ") + "...";

  const closeModal = () => {
    setShowFullText(false);
    setShowVideo(false);
    setShowRegistration(false);
  };

  const getImageSrc = (imageUrl: string | undefined, defaultImage: string): string => {
    if (!imageUrl) return defaultImage;
    if (imageUrl.startsWith('data:image')) return imageUrl;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
    return imageUrl;
  };

  // استخدام البيانات من API أو الترجمات الافتراضية
  const displayTitle = content?.heroTitle || t("hero.title");
  const instructor1Name = content?.instructor1 || "";
  const instructor1Role = content?.instructor1Role || "";
  const instructor2Name = content?.instructor2 || "";
  const instructor2Role = content?.instructor2Role || "";

  // نص الويبنار الديناميكي
  const webinarText = nextWebinar
    ? t("hero.webinar", { date: nextWebinar.formattedDate })
    : t("hero.webinar", { date: "" });

  // ✅ تحديد اتجاه الزوايا حسب اللغة
  const firstImageStyle = isRTL
    ? "rounded-tr-[200px] rounded-bl-[200px]"
    : "rounded-tl-[200px] rounded-br-[200px]";

  const secondImageStyle = isRTL
    ? "rounded-tl-[200px] rounded-br-[200px] mt-32"
    : "rounded-tr-[200px] rounded-bl-[200px] mt-32";

  // تحديد ما إذا كان التحميل مكتملاً
  const isLoading = loadingContent;

  return (
    <section className="dark:bg-darkmode pt-40 md:pt-22">
      <div className="container">
        <div className="grid lg:grid-cols-12 grid-cols-1 items-center gap-30">
          <div className="col-span-6">
            {/* Webinar Badge */}
            <p
              data-aos="fade-up"
              data-aos-delay="200"
              data-aos-duration="1000"
              className="relative z-0 inline-block text-primary text-lg font-bold before:absolute before:content-[''] before:bg-primary/20 before:w-full before:h-2 before:-z-1 dark:before:-z-1 before:bottom-0"
            >
              {loadingWebinar ? (
                <span className="inline-block w-48 h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></span>
              ) : nextWebinar && (
                <button
                  onClick={() => setShowRegistration(true)}
                  className="hover:underline cursor-pointer"
                >
                  {webinarText}
                </button>
              )}
            </p>

            {/* Title */}
            {isLoading ? (
              <div className="py-4 space-y-3">
                <div className="w-3/4 h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                <div className="w-1/2 h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
              </div>
            ) : (
              <h1
                className="py-4"
                data-aos="fade-up"
                data-aos-delay="300"
                data-aos-duration="1000"
              >
                {displayTitle}
              </h1>
            )}

            {/* Description */}
            {isLoading ? (
              <div className="space-y-2 md:pb-14 pb-6">
                <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
              </div>
            ) : (
              <p
                data-aos="fade-up"
                data-aos-delay="400"
                data-aos-duration="1000"
                className="text-xl text-SlateBlueText dark:text-opacity-80 font-normal md:pb-14 pb-6 md:w-[500px]"
              >
                {preview}
                <button
                  onClick={() => setShowFullText(true)}
                  className="ml-2 text-[#8c52ff] underline font-semibold"
                >
                  {t("hero.readMore")}
                </button>
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex items-center md:justify-normal lg:justify-center justify-start flex-wrap gap-4">
              <Link
                href="/curriculum"
                data-aos="fade-up"
                data-aos-delay="500"
                data-aos-duration="1000"
                className="btn btn-1 hover-filled-slide-down rounded-lg overflow-hidden"
              >
                <span className="!flex !items-center gap-14">
                  <i className="bg-[url('/images/hero/tickets.svg')] bg-no-repeat bg-contain w-6 h-6 inline-block filter brightness-0"></i>
                  {t("hero.browseCourses")}
                </span>
              </Link>

              <button
                onClick={() => setShowVideo(true)}
                data-aos="fade-up"
                data-aos-delay="600"
                data-aos-duration="1000"
                className="btn_outline btn-2 hover-outline-slide-down group"
              >
                <span className="!flex !items-center gap-14">
                  <i className="bg-[url('/images/hero/calander.svg')] bg-no-repeat bg-contain w-6 h-6 inline-block group-hover:bg-[url('/images/hero/calander-hover-white.svg')] filter brightness-0"></i>
                  {t("hero.watchDemo")}
                </span>
              </button>
            </div>
          </div>

          {/* Images Section */}
          {isLoading ? (
            // Loading State
            <div className="col-span-6 lg:flex hidden items-center gap-3 animate-pulse">
              <div className="relative w-full">
                <div className={`relative w-full h-[450px] bg-gray-200 dark:bg-gray-700 ${firstImageStyle}`}></div>
              </div>
              <div className="relative w-full">
                <div className={`relative w-full h-[450px] bg-gray-300 dark:bg-gray-600 ${secondImageStyle}`}></div>
              </div>
            </div>
          ) : content ? (
            // Actual Images
            <div
              data-aos="fade-left"
              data-aos-delay="200"
              data-aos-duration="1000"
              className="col-span-6 lg:flex hidden items-center gap-3"
              dir={isRTL ? "rtl" : "ltr"}
            >
              {/* First Image Container */}
              <div className="relative w-full">
                {/* First Image with overflow */}
                <div className={`relative w-full h-[450px] ${firstImageStyle} bg-[#ffbd59] overflow-hidden`}>
                  <img
                    src={getImageSrc(content.imageUrl, "/images/hero/john.png")}
                    alt={content.imageAlt}
                    width={400}
                    height={500}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Badge outside overflow */}
                {instructor1Name && (
                  <div
                    className={`
      bg-[#8c52ff] rounded-2xl shadow-lg 
      py-3 px-4 
      absolute top-4 z-50
      transform transition-all duration-300
      hover:scale-105 hover:shadow-xl
      ${isRTL ? "right-0 translate-x-1/3" : "left-0 -translate-x-1/3"}
      lg:block hidden
    `}
                  >
                    <p className="text-base font-bold text-white whitespace-nowrap">
                      {instructor1Name}
                    </p>
                    <p className="text-sm font-medium text-white/90 text-center">
                      {instructor1Role}
                    </p>
                  </div>
                )}
              </div>

              {/* Second Image Container */}
              <div className="relative w-full">
                {/* Second Image with overflow */}
                <div className={`relative w-full h-[450px] ${secondImageStyle} bg-primary overflow-hidden`}>
                  <img
                    src={getImageSrc(content.secondImageUrl, "/images/hero/maria.png")}
                    alt={content.secondImageAlt}
                    width={400}
                    height={500}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Badge للمدرب الثاني */}
                {instructor2Name && (
                  <div
                    className={`
      bg-[#ffbd59] rounded-2xl shadow-lg 
      py-3 px-4 
      absolute top-36 z-50
      transform transition-all duration-300
      hover:scale-105 hover:shadow-xl
      ${isRTL ? "left-0 -translate-x-1/3" : "right-0 translate-x-1/3"}
      xl:block hidden
    `}
                  >
                    <p className="text-base font-bold text-white whitespace-nowrap">
                      {instructor2Name}
                    </p>
                    <p className="text-sm font-medium text-white/90 text-center">
                      {instructor2Role}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Modal للوصف الكامل */}
      {showFullText && content && (
        <div onClick={closeModal} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-darkmode p-6 rounded-lg shadow-xl md:w-[70vw] w-[90vw] mx-4 relative animate-fadeIn font-sans text-base text-SlateBlueText"
            dir={isRTL ? "rtl" : "ltr"}
          >
            <h2 className="text-2xl font-bold text-[#8c52ff] mb-4">{displayTitle}</h2>
            <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-line">
              {fullText}
            </p>
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 text-[#8c52ff] text-xl font-bold hover:opacity-80"
              style={isRTL ? { right: 'auto', left: '12px' } : {}}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Modal للتسجيل في الويبنار */}
      {showRegistration && nextWebinar && (
        <WebinarRegistrationForm
          webinar={nextWebinar}
          isOpen={showRegistration}
          onClose={closeModal}
          onSuccess={() => {
            closeModal();
            // تحديث بيانات الويبنار بعد التسجيل
            setNextWebinar({
              ...nextWebinar,
              currentAttendees: nextWebinar.currentAttendees + 1
            });
          }}
        />
      )}

      {/* Modal للفيديو */}
      {showVideo && (
        <div onClick={closeModal} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-darkmode p-6 rounded-lg shadow-xl md:w-[70vw] w-[90vw] mx-4 relative animate-fadeIn"
            dir={isRTL ? "rtl" : "ltr"}
          >
            <h2 className="text-2xl font-bold text-[#8c52ff] mb-4">{t("hero.watchDemo")}</h2>
            <div className="relative pb-[56.25%] h-0 overflow-hidden rounded">
              <iframe
                src="https://www.youtube.com/embed/p1CrKwmY_ps?autoplay=1"
                className="absolute top-0 left-0 w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Code School Demo"
                loading="lazy"
              />
            </div>
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 text-[#8c52ff] text-xl font-bold hover:opacity-80"
              style={isRTL ? { right: 'auto', left: '12px' } : {}}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default Hero;