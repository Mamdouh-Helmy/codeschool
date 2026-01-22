"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocale } from "@/app/context/LocaleContext";
import WebinarRegistrationForm from "./WebinarRegistrationForm";

interface HeroImages {
  imageUrl?: string;
  secondImageUrl?: string;
  imageAlt?: string;
  secondImageAlt?: string;
  heroTitle?: string;
  heroDescription?: string;
  instructor1?: string;
  instructor1Role?: string;
  instructor2?: string;
  instructor2Role?: string;
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

// ✅ Cache خارج المكون لمنع إعادة جلب البيانات
let heroDataCache: {
  heroImages: HeroImages | null;
  nextWebinar: Webinar | null;
  timestamp: number;
  locale: string;
} | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

const Hero = () => {
  const { t } = useI18n();
  const { locale } = useLocale();
  const isRTL = locale === "ar"; // ✅ تحديد اتجاه اللغة
  const [showFullText, setShowFullText] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [heroImages, setHeroImages] = useState<HeroImages | null>(null);
  const [nextWebinar, setNextWebinar] = useState<Webinar | null>(null);
  const [loading, setLoading] = useState(true);
  
  // ✅ Refs لمنع race conditions
  const isMounted = useRef(true);
  const fetchController = useRef<AbortController | null>(null);

  // ✅ تحسين fetchData مع caching و abort
  useEffect(() => {
    isMounted.current = true;
    
    // إلغاء أي طلب سابق
    if (fetchController.current) {
      fetchController.current.abort();
    }
    
    fetchController.current = new AbortController();
    const signal = fetchController.current.signal;

    const fetchData = async () => {
      // ✅ التحقق من الـ cache أولاً
      if (
        heroDataCache &&
        Date.now() - heroDataCache.timestamp < CACHE_DURATION &&
        heroDataCache.locale === locale
      ) {
        if (isMounted.current) {
          setHeroImages(heroDataCache.heroImages);
          setNextWebinar(heroDataCache.nextWebinar);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        
        // ✅ جلب البيانات بالتوازي مع Promise.all
        const [heroRes, webinarRes] = await Promise.all([
          fetch(`/api/section-images-hero?sectionName=hero-section&activeOnly=true&language=${locale}`, {
            signal,
            cache: 'force-cache', // استخدام cache المتصفح
            headers: {
              'Cache-Control': 'max-age=300' // 5 دقائق
            }
          }),
          fetch('/api/webinars/next', {
            signal,
            cache: 'force-cache',
            headers: {
              'Cache-Control': 'max-age=60' // 1 دقيقة للـ webinars
            }
          })
        ]);

        // ✅ التحقق من الـ abort
        if (signal.aborted) return;

        const [heroResult, webinarResult] = await Promise.all([
          heroRes.json(),
          webinarRes.json()
        ]);

        if (!isMounted.current) return;

        let heroData: HeroImages | null = null;
        if (heroResult.success && heroResult.data.length > 0) {
          heroData = heroResult.data[0];
        }

        let webinarData: Webinar | null = null;
        if (webinarResult.success && webinarResult.data) {
          webinarData = webinarResult.data;
        }

        // ✅ حفظ في الـ cache
        heroDataCache = {
          heroImages: heroData,
          nextWebinar: webinarData,
          timestamp: Date.now(),
          locale
        };

        setHeroImages(heroData);
        setNextWebinar(webinarData);
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted');
          return;
        }
        console.error('Error fetching data:', error);
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted.current = false;
      if (fetchController.current) {
        fetchController.current.abort();
      }
    };
  }, [locale]); // ✅ الاعتماد فقط على locale

  // استخدام الوصف من API أو الترجمات الافتراضية
  const fullText = heroImages?.heroDescription || t("hero.description");
  const preview = fullText.split(" ").slice(0, 36).join(" ") + "...";

  const closeModal = () => {
    setShowFullText(false);
    setShowVideo(false);
    setShowRegistration(false);
  };

  const getImageSrc = (imageUrl: string | undefined, defaultImage: string): string => {
    if (!imageUrl) return defaultImage;
    if (imageUrl.startsWith('data:image')) return imageUrl;
    return imageUrl;
  };

  // استخدام البيانات من API أو الترجمات الافتراضية
  const displayTitle = heroImages?.heroTitle || t("hero.title");
  const instructor1Name = heroImages?.instructor1 || t("hero.instructor1");
  const instructor1Role = heroImages?.instructor1Role || t("hero.instructor1Role");
  const instructor2Name = heroImages?.instructor2 || t("hero.instructor2");
  const instructor2Role = heroImages?.instructor2Role || t("hero.instructor2Role");


  console.log("Hero Images:", heroImages);

  // نص الويبنار الديناميكي
  const webinarText = nextWebinar 
    && t("hero.webinar", { date: nextWebinar.formattedDate });

  // ✅ تحديد اتجاه الزوايا حسب اللغة
  const firstImageStyle = isRTL 
    ? "rounded-tr-[200px] rounded-bl-[200px]" // للعربية: أعلى يمين + أسفل يسار
    : "rounded-tl-[200px] rounded-br-[200px]"; // للإنجليزية: أعلى يسار + أسفل يمين
  
  const secondImageStyle = isRTL
    ? "rounded-tl-[200px] rounded-br-[200px] mt-32" // للعربية: أعلى يسار + أسفل يمين مع هامش
    : "rounded-tr-[200px] rounded-bl-[200px] mt-32"; // للإنجليزية: أعلى يمين + أسفل يسار مع هامش

  // ✅ تحسين الـ render
  return (
    <section className="dark:bg-darkmode pt-40 md:pt-22">
      <div className="container">
        <div className="grid lg:grid-cols-12 grid-cols-1 items-center gap-30">
          <div className="col-span-6">
            <p
              data-aos="fade-up"
              data-aos-delay="200"
              data-aos-duration="1000"
              className="relative z-0 inline-block text-primary text-lg font-bold before:absolute before:content-[''] before:bg-primary/20 before:w-full before:h-2 before:-z-1 dark:before:-z-1 before:bottom-0"
            >
              {nextWebinar ? (
                <button
                  onClick={() => setShowRegistration(true)}
                  className="hover:underline cursor-pointer"
                  disabled={loading}
                >
                  {webinarText}
                </button>
              ) : (
                webinarText
              )}
            </p>

            <h1
              className="py-4"
              data-aos="fade-up"
              data-aos-delay="300"
              data-aos-duration="1000"
            >
              {displayTitle}
            </h1>

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
                disabled={loading}
              >
                {t("hero.readMore")}
              </button>
            </p>

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
                disabled={loading}
              >
                <span className="!flex !items-center gap-14">
                  <i className="bg-[url('/images/hero/calander.svg')] bg-no-repeat bg-contain w-6 h-6 inline-block group-hover:bg-[url('/images/hero/calander-hover-white.svg')] filter brightness-0"></i>
                  {t("hero.watchDemo")}
                </span>
              </button>
            </div>
          </div>

          {/* الصور - فقط إذا لم يكن loading */}
          {!loading && (
            <div
              data-aos="fade-left"
              data-aos-delay="200"
              data-aos-duration="1000"
              className="col-span-6 lg:flex hidden items-center gap-3"
              dir={isRTL ? "rtl" : "ltr"}
            >
              {/* الحاوية الرئيسية للصورة الأولى مع البادج خارج الـ overflow */}
              <div className="relative w-full">
                {/* الصورة الأولى مع overflow فقط للصورة */}
                <div className={`relative w-full h-[450px] ${firstImageStyle} bg-[#ffbd59] overflow-hidden`}>
                  <img
                    src={getImageSrc(heroImages?.imageUrl, "/images/hero/john.png")}
                    alt={heroImages?.imageAlt || "hero"}
                    width={400}
                    height={500}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                
                {/* البادج خارج الـ overflow */}
                <div 
                  className={`bg-[#8c52ff] rounded-22 shadow-hero-box py-4 px-5 absolute top-3 z-50 ${
                    isRTL ? "-right-16" : "-left-20"
                  }`}
                >
                  <p className="text-lg font-bold text-white">{instructor1Name}</p>
                  <p className="text-base font-medium text-white text-center">{instructor1Role}</p>
                </div>
              </div>

              {/* الحاوية الرئيسية للصورة الثانية مع البادج خارج الـ overflow */}
              <div className="relative w-full">
                {/* الصورة الثانية مع overflow فقط للصورة */}
                <div className={`relative w-full h-[450px] ${secondImageStyle} bg-primary overflow-hidden`}>
                  <img
                    src={getImageSrc(heroImages?.secondImageUrl, "/images/hero/maria.png")}
                    alt={heroImages?.secondImageAlt || "hero"}
                    width={400}
                    height={500}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                
                {/* البادج خارج الـ overflow */}
                <div 
                  className={`bg-[#ffbd59] rounded-22 shadow-hero-box py-4 px-5 absolute top-40 z-50 ${
                    isRTL ? "-left-16" : "-right-20"
                  } xl:inline-block hidden`}
                >
                  <p className="text-lg font-bold text-white">{instructor2Name}</p>
                  <p className="text-base font-medium text-white text-center">{instructor2Role}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal للوصف الكامل */}
      {showFullText && (
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
              style={isRTL ? {right: 'auto', left: '12px'} : {}}
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
            // تحديث الـ cache بعد التسجيل
            if (heroDataCache) {
              heroDataCache.nextWebinar = {
                ...nextWebinar,
                currentAttendees: nextWebinar.currentAttendees + 1
              };
            }
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
              style={isRTL ? {right: 'auto', left: '12px'} : {}}
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