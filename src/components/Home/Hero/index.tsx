"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocale } from "@/app/context/LocaleContext";
import WebinarRegistrationForm from "./WebinarRegistrationForm"; // سننشئ هذا المكون

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

const Hero = () => {
  const { t } = useI18n();
  const { locale } = useLocale();
  const [showFullText, setShowFullText] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [heroImages, setHeroImages] = useState<HeroImages | null>(null);
  const [nextWebinar, setNextWebinar] = useState<Webinar | null>(null);
  const [loading, setLoading] = useState(true);

 // في الـ Hero component
useEffect(() => {
  const fetchData = async () => {
    try {
      // جلب بيانات الـ Hero
      const heroRes = await fetch(`/api/section-images-hero?sectionName=hero-section&activeOnly=true&language=${locale}`);
      const heroResult = await heroRes.json();
      if (heroResult.success && heroResult.data.length > 0) {
        setHeroImages(heroResult.data[0]);
      }

      // جلب الويبنار القادم
      const webinarRes = await fetch('/api/webinars/next');
      const webinarResult = await webinarRes.json();
      
      // console.log('Webinar API Response:', webinarResult); 
      
      if (webinarResult.success && webinarResult.data) {
        setNextWebinar(webinarResult.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [locale]);

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

  // نص الويبنار الديناميكي
  const webinarText = nextWebinar 
    && t("hero.webinar", { date: nextWebinar.formattedDate })
   

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
              >
                <span className="!flex !items-center gap-14">
                  <i className="bg-[url('/images/hero/calander.svg')] bg-no-repeat bg-contain w-6 h-6 inline-block group-hover:bg-[url('/images/hero/calander-hover-white.svg')] filter brightness-0"></i>
                  {t("hero.watchDemo")}
                </span>
              </button>

              {/* {nextWebinar && (
                <button
                  onClick={() => setShowRegistration(true)}
                  data-aos="fade-up"
                  data-aos-delay="700"
                  data-aos-duration="1000"
                  className="btn btn-3 bg-[#ffbd59] hover:bg-[#ffa726] text-white rounded-lg overflow-hidden"
                >
                  <span className="!flex !items-center gap-14">
                    <i className="bg-[url('/images/hero/webinar.svg')] bg-no-repeat bg-contain w-6 h-6 inline-block"></i>
                    {t("hero.registerNow") || "Register Now"}
                  </span>
                </button>
              )} */}
            </div>
          </div>

          {/* باقي الكود بدون تغيير */}
          <div
            data-aos="fade-left"
            data-aos-delay="200"
            data-aos-duration="1000"
            className="col-span-6 lg:flex hidden items-center gap-3"
            dir="ltr"
          >
            <div className="bg-[#ffbd59] relative rounded-tl-166 rounded-br-166 w-full" dir="ltr">
              <img
                src={getImageSrc(heroImages?.imageUrl, "/images/hero/john.png")}
                alt={heroImages?.imageAlt || "hero"}
                width={400}
                height={500}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="bg-[#8c52ff] rounded-22 shadow-hero-box py-4 px-5 absolute top-16 -left-20">
                <p className="text-lg font-bold text-white">{instructor1Name}</p>
                <p className="text-base font-medium text-white text-center">{instructor1Role}</p>
              </div>
            </div>

            <div className="bg-primary relative rounded-tr-166 rounded-bl-166 w-full mt-32">
              <img
                src={getImageSrc(heroImages?.secondImageUrl, "/images/hero/maria.png")}
                alt={heroImages?.secondImageAlt || "hero"}
                width={400}
                height={500}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="bg-[#ffbd59] rounded-22 shadow-hero-box py-4 px-5 absolute top-24 -right-20 xl:inline-block hidden">
                <p className="text-lg font-bold text-white">{instructor2Name}</p>
                <p className="text-base font-medium text-white text-center">{instructor2Role}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal للوصف الكامل */}
      {showFullText && (
        <div onClick={closeModal} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-darkmode p-6 rounded-lg shadow-xl md:w-[70vw] w-[90vw] mx-4 relative animate-fadeIn font-sans text-base text-SlateBlueText"
          >
            <h2 className="text-2xl font-bold text-[#8c52ff] mb-4">{displayTitle}</h2>
            <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-line">
              {fullText}
            </p>
            <button onClick={closeModal} className="absolute top-3 right-3 text-[#8c52ff] text-xl font-bold hover:opacity-80">×</button>
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
            // يمكن إضافة toast message هنا
            alert("تم التسجيل في الندوة بنجاح!");
          }}
        />
      )}

      {/* Modal للفيديو */}
      {showVideo && (
        <div onClick={closeModal} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-darkmode p-6 rounded-lg shadow-xl md:w-[70vw] w-[90vw] mx-4 relative animate-fadeIn"
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
              />
            </div>
            <button onClick={closeModal} className="absolute top-3 right-3 text-[#8c52ff] text-xl font-bold hover:opacity-80">×</button>
          </div>
        </div>
      )}
    </section>
  );
};

export default Hero;