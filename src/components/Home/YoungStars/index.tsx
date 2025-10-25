'use client';
import React from "react";
import Link from "next/link";
import ThumbnailCarousel from "./ThumbnailCarousel";
import { Sparkles, Target, Rocket, Heart } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

const YoungStars = () => {
  const { t } = useI18n();

  return (
    <>
      <section className="bg-gradient-to-br from-primary/10 via-primary/5 to-primary/15 dark:bg-gradient-to-br dark:from-darklight dark:via-darkmode/50 dark:to-darklight relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse delay-500"></div>

        <div className="container relative z-10">
          <div className="grid lg:grid-cols-2 grid-cols-1 items-center gap-16 lg:gap-24">
            {/* Carousel Section */}
            <div
              data-aos="fade-right"
              data-aos-delay="200"
              data-aos-duration="1000"
              className="relative"
            >
              <div className="absolute -top-6 -left-6 w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -bottom-6 -right-6 w-12 h-12 bg-primary/80 rounded-full flex items-center justify-center shadow-lg">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <ThumbnailCarousel />
            </div>

            {/* Content Section */}
            <div
              className="lg:pt-0 pt-8"
              data-aos="fade-left"
              data-aos-delay="200"
              data-aos-duration="1000"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-4xl lg:text-5xl font-bold text-MidnightNavyText dark:text-white leading-tight">
                  {t("youngStars.title")}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70 block">
                    {t("youngStars.highlighted")}
                  </span>
                </h2>
              </div>

              <p className="text-xl font-normal text-SlateBlueText dark:text-gray-300 max-w-2xl lg:pt-8 pt-6 lg:pb-12 pb-8 leading-relaxed">
                {t("youngStars.description")}
              </p>

              {/* Features Grid */}
              <div className="grid grid-cols-2 gap-6 mb-10">
                <div className="flex items-center gap-3 p-4 bg-white/50 dark:bg-darkmode/50 rounded-2xl backdrop-blur-sm border border-white/20">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Heart className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-MidnightNavyText dark:text-white">
                      {t("youngStars.passionate")}
                    </p>
                    <p className="text-sm text-SlateBlueText dark:text-gray-400">
                      {t("youngStars.creators")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white/50 dark:bg-darkmode/50 rounded-2xl backdrop-blur-sm border border-white/20">
                  <div className="w-10 h-10 bg-primary/15 rounded-lg flex items-center justify-center">
                    <Rocket className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-MidnightNavyText dark:text-white">
                      {t("youngStars.innovative")}
                    </p>
                    <p className="text-sm text-SlateBlueText dark:text-gray-400">
                      {t("youngStars.thinkers")}
                    </p>
                  </div>
                </div>
              </div>

              <Link
                href="/leaders"
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-primary to-primary/80 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 hover:from-primary hover:to-primary overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-3">
                  {t("youngStars.meetLeaders")}
                  <Sparkles className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default YoungStars;