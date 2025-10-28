"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";

const Hero = () => {
  const { t } = useI18n();
  const [showFullText, setShowFullText] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const fullText = t("hero.description");
  const preview = fullText.split(" ").slice(0, 36).join(" ") + "...";

  const closeModal = () => {
    setShowFullText(false);
    setShowVideo(false);
  };

  return (
    <section className="dark:bg-darkmode py-40 md:py-22">
      <div className="container">
        <div className="grid lg:grid-cols-12 grid-cols-1 items-center gap-30">
          <div className="col-span-6">
            <p
              data-aos="fade-up"
              data-aos-delay="200"
              data-aos-duration="1000"
              className="relative z-0 inline-block text-primary text-lg font-bold before:absolute before:content-[''] before:bg-primary/20 before:w-full before:h-2 before:-z-1 dark:before:-z-1 before:bottom-0"
            >
              {t("hero.webinar", { date: "October 2, 2025" })}
            </p>
            <h1
              className="py-4"
              data-aos="fade-up"
              data-aos-delay="300"
              data-aos-duration="1000"
            >
              {t("hero.title")}
            </h1>
            <p
              data-aos="fade-up"
              data-aos-delay="400"
              data-aos-duration="1000"
              className="text-xl text-SlateBlueText dark:text-opacity-80 font-normal md:pb-14 pb-6 w-[500px]"
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
                href="/"
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

          {/* Right side with images stays as-is */}
          <div
            data-aos="fade-left"
            data-aos-delay="200"
            data-aos-duration="1000"
            className="col-span-6 lg:flex hidden items-center gap-3"
            dir="ltr"
          >
            <div className="bg-[#ffbd59] relative rounded-tl-166 rounded-br-166 w-full">
              <Image
                src="/images/hero/john.png"
                alt="hero"
                width={400}
                height={500}
                quality={100}
                className="w-full h-full"
              />
              <div className="bg-[#8c52ff] rounded-22 shadow-hero-box py-4 px-5 absolute top-16 -left-20">
                <p className="text-lg font-bold text-white">{t("hero.instructor1")}</p>
                <p className="text-base font-medium text-white text-center">
                  {t("hero.instructor1Role")}
                </p>
              </div>
            </div>
            <div className="bg-primary relative rounded-tr-166 rounded-bl-166 w-full mt-32">
              <Image
                src="/images/hero/maria.png"
                alt="hero"
                width={400}
                height={500}
                quality={100}
                className="w-full h-full"
              />
              <div className="bg-[#ffbd59] rounded-22 shadow-hero-box py-4 px-5 absolute top-24 -right-20 xl:inline-block hidden">
                <p className="text-lg font-bold text-white">{t("hero.instructor2")}</p>
                <p className="text-base font-medium text-white text-center">
                  {t("hero.instructor2Role")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for full text */}
      {showFullText && (
        <div
          onClick={closeModal}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-darkmode p-6 rounded-lg shadow-xl w-[70vw] max-w-none mx-4 relative animate-fadeIn font-sans text-base text-SlateBlueText"
            // Add here the same font class used in the site, e.g. font-sans or font-primary
          >
            <h2 className="text-2xl font-bold text-[#8c52ff] mb-4">
              {t("hero.title")}
            </h2>
            <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed">
              {fullText}
            </p>
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 text-[#8c52ff] text-xl font-bold hover:opacity-80"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Modal for video demo */}
      {showVideo && (
        <div
          onClick={closeModal}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-darkmode p-6 rounded-lg shadow-xl w-[70vw] max-w-none mx-4 relative animate-fadeIn"
          >
            <h2 className="text-2xl font-bold text-[#8c52ff] mb-4">
              {t("hero.watchDemo")}
            </h2>
            <div className="relative pb-[56.25%] h-0 overflow-hidden rounded">
              <iframe
                src="https://www.youtube.com/embed/1oDrJba2PSs?autoplay=1"
                className="absolute top-0 left-0 w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Code School Demo"
              />
            </div>
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 text-[#8c52ff] text-xl font-bold hover:opacity-80"
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