"use client";
import React from "react";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";
import { Play, Users, Heart, Target, Award, X, Video } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

const Highlight = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAllVideosModalOpen, setIsAllVideosModalOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentVideo, setCurrentVideo] = useState("");
  const { t } = useI18n();

  const openModal = (videoUrl: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentVideo(videoUrl);
    setIsModalOpen(true);
  };

  const openAllVideosModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsAllVideosModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentVideo("");
  };

  const closeAllVideosModal = () => {
    setIsAllVideosModalOpen(false);
  };

  const stats = [
    { number: "2500+", label: t("highlight.stats.parents"), icon: Heart },
    { number: "890+", label: t("highlight.stats.coders"), icon: Users },
    { number: "3214+", label: t("highlight.stats.participants"), icon: Target },
    { number: "16+", label: t("highlight.stats.partnerships"), icon: Award }
  ];

  const slides = [
    {
      title: t("highlight.slides.showcase"),
      videoUrl: "https://www.facebook.com/reel/1241224360842408"
    },
    {
      title: t("highlight.slides.competition"),
      videoUrl: "https://www.facebook.com/reel/846940067682949"
    },
    {
      title: t("highlight.slides.graduation"),
      videoUrl: "https://youtube.com/shorts/5N1bYifaCws?si=iy3qO9nS0WXymkM2"
    },
    {
      title: t("highlight.slides.studentProjects") || "مشاريع الطلاب",
      videoUrl: "https://youtube.com/shorts/Xl6WWxK8HWY?si=vhUt4IfSGuMIVz_j"
    }
  ];

  const allVideos = [
    {
      title: t("highlight.slides.showcase"),
      videoUrl: "https://www.facebook.com/reel/1241224360842408",
    },
    {
      title: t("highlight.slides.competition"),
      videoUrl: "https://www.facebook.com/reel/846940067682949",
    },
    {
      title: t("highlight.slides.graduation"),
      videoUrl: "https://youtube.com/shorts/5N1bYifaCws?si=iy3qO9nS0WXymkM2",
    },
    {
      title: t("highlight.slides.studentProjects") || "مشاريع الطلاب",
      videoUrl: "https://youtube.com/shorts/Xl6WWxK8HWY?si=vhUt4IfSGuMIVz_j",
    },
  ];

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    arrows: false,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    pauseOnHover: true,
    beforeChange: (current: number, next: number) => setCurrentSlide(next),
    customPaging: (i: number) => (
      <div
        className={`w-3 h-3 rounded-full transition-all duration-300 ${
          i === currentSlide
            ? "bg-primary scale-125"
            : "bg-primary/30 hover:bg-primary/50"
        }`}
      />
    ),
    appendDots: (dots: React.ReactNode) => (
      <div className="mt-8">
        <ul className="flex justify-center space-x-3">{dots}</ul>
      </div>
    ),
    responsive: [
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  };

  // دالة محسنة لتحويل الروابط إلى embed
  const getEmbedUrl = (url: string) => {
    // فيسبوك رييل
    if (url.includes('facebook.com/reel')) {
      const videoId = url.split('/reel/')[1];
      const embedUrl = `https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Freel%2F${videoId}&show_text=0&width=500`;
      return embedUrl;
    }
    // فيسبوك عادي
    else if (url.includes('facebook.com/')) {
      const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&width=500`;
      return embedUrl;
    }
    // يوتيوب شورتس
    else if (url.includes('youtube.com/shorts/')) {
      const videoId = url.split('/shorts/')[1]?.split('?')[0];
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      return embedUrl;
    }
    // يوتيوب عادي
    else if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      return embedUrl;
    }
    // youtu.be
    else if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      return embedUrl;
    }
    // تيك توك
    else if (url.includes('tiktok.com')) {
      const videoId = url.split('/video/')[1]?.split('?')[0];
      const embedUrl = `https://www.tiktok.com/embed/v2/${videoId}`;
      return embedUrl;
    }

    return url;
  };

  // دالة لمعرفة نوع الفيديو لعرض رسالة إذا لم يكن مدعوم
  const getVideoType = (url: string) => {
    if (url.includes('facebook.com')) return 'facebook';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('tiktok.com')) return 'tiktok';
    return 'unknown';
  };

  return (
    <>
      <section className="bg-gradient-to-br from-IcyBreeze via-white to-PaleCyan dark:bg-gradient-to-br dark:from-darklight dark:via-darkmode dark:to-darklight relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000"></div>

        <div className="container relative z-10">
          <div className="grid lg:grid-cols-12 grid-cols-1 items-center gap-12 lg:gap-20 max-w-[125rem] mx-auto">
            {/* Content Section */}
            <div
              className="lg:col-span-5 col-span-1 py-8 lg:py-12"
              data-aos="fade-right"
              data-aos-delay="200"
              data-aos-duration="1000"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-4xl lg:text-5xl font-bold text-MidnightNavyText dark:text-white leading-tight">
                  {t("highlight.title.main")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70">{t("highlight.title.highlighted")}</span>
                </h2>
              </div>

              <p className="text-xl font-normal text-SlateBlueText dark:text-gray-300 max-w-2xl lg:pt-6 pt-4 lg:pb-10 pb-8 leading-relaxed">
                {t("highlight.description")}
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-2 gap-6 mb-10">
                {stats.map((stat, index) => {
                  const IconComponent = stat.icon;
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-4 bg-white/60 dark:bg-darkmode/60 rounded-2xl backdrop-blur-sm border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
                    >
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <IconComponent className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-primary">{stat.number}</h3>
                        <p className="text-sm font-medium text-SlateBlueText dark:text-gray-400">
                          {stat.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={openAllVideosModal}
                  className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary to-primary/80 text-white text-lg font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:from-primary hover:to-primary"
                >
                  <span>{t("highlight.viewStories")}</span>
                  <Play className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                </button>
              </div>
            </div>

            {/* Slider Section */}
            <div
              className="lg:col-span-7 col-span-1 lg:py-12 py-8"
              data-aos="fade-left"
              data-aos-delay="200"
              data-aos-duration="1000"
            >
              <div className="relative">
                <Slider {...settings}>
                  {slides.map((slide, index) => (
                    <div key={index} className="outline-none px-2">
                      <div className="relative group rounded-3xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500">
                        <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-gray-100 dark:bg-dark_input">
                          
                          {/* 🔥 الفيديو نفسه مباشرة بدون أي ماسك */}
                          <iframe
                            className="w-full h-full"
                            src={getEmbedUrl(slide.videoUrl)}
                            title={slide.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            loading="lazy"
                          />
                          
                          {/* Content Overlay */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                            <h3 className="text-xl font-bold text-white mb-2">
                              {slide.title}
                            </h3>
                            <div className="flex items-center justify-between">
                              <span className="text-white/90 text-sm">
                                {t("highlight.watchJourney")}
                              </span>
                              <span className="text-white/70 text-sm">
                                {index + 1}/{slides.length}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </Slider>
              </div>
            </div>
          </div>
        </div>

        {/* Single Video Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 w-full h-full bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative bg-white dark:bg-darkmode rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-PowderBlueBorder dark:border-dark_border">
                <h3 className="text-2xl font-bold text-MidnightNavyText dark:text-white">
                  {t("highlight.modalTitle")}
                </h3>
                <button
                  onClick={closeModal}
                  className="w-10 h-10 bg-primary/10 hover:bg-primary/20 text-primary rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                  aria-label={t("common.close")}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Video Container */}
              <div className="p-6">
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-100 dark:bg-dark_input">
                  {getVideoType(currentVideo) === 'youtube' || getVideoType(currentVideo) === 'facebook' ? (
                    <iframe
                      className="w-full h-full"
                      src={getEmbedUrl(currentVideo)}
                      title="Video player"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <Video className="w-16 h-16 text-primary mb-4" />
                      <h4 className="text-xl font-bold text-MidnightNavyText dark:text-white mb-2">
                        الفيديو غير متاح للتشغيل المدمج
                      </h4>
                      <p className="text-SlateBlueText dark:text-gray-400 mb-4">
                        يمكنك مشاهدة هذا الفيديو عبر زيارة الرابط الأصلي
                      </p>
                      <a
                        href={currentVideo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/80 transition-colors"
                      >
                        مشاهدة على المنصة الأصلية
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All Videos Modal */}
        {isAllVideosModalOpen && (
          <div className="fixed inset-0 w-full h-full bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative bg-white dark:bg-darkmode rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-PowderBlueBorder dark:border-dark_border">
                <h3 className="text-2xl font-bold text-MidnightNavyText dark:text-white">
                  {t("highlight.allVideos") || "All Success Stories"}
                </h3>
                <button
                  onClick={closeAllVideosModal}
                  className="w-10 h-10 bg-primary/10 hover:bg-primary/20 text-primary rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                  aria-label={t("common.close")}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Videos Grid */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allVideos.map((video, index) => (
                    <div
                      key={index}
                      className="group bg-white dark:bg-dark_input rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer"
                      onClick={(e) => {
                        openModal(video.videoUrl, e);
                        closeAllVideosModal();
                      }}
                    >
                      <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-dark_input">
                        {/* 🔥 الفيديو نفسه في الشبكة */}
                        <iframe
                          className="w-full h-full"
                          src={getEmbedUrl(video.videoUrl)}
                          title={video.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          loading="lazy"
                        />
                      </div>
                      <div className="p-4">
                        <h4 className="font-semibold text-MidnightNavyText dark:text-white text-lg mb-2">
                          {video.title}
                        </h4>
                        <p className="text-sm text-SlateBlueText dark:text-gray-400">
                          {t("highlight.clickToWatch") || "Click to watch full screen"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
};

export default Highlight;