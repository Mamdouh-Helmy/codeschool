"use client";
import React, { useRef, useState, useEffect } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Star, Award, Users } from "lucide-react";

const ThumbnailCarousel: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const mainSliderRef = useRef<Slider | null>(null);
  const navSliderRef = useRef<Slider | null>(null);

  const leaders = [
    {
      image: "/images/ThumbnailSlider/Slider_1.png",
      name: "Ahmed Mohamed",
      achievement: "Top Coder 2024",
      projects: "15+ Projects"
    },
    {
      image: "/images/ThumbnailSlider/Slider_2.jpg", 
      name: "Sarah Johnson",
      achievement: "AI Innovator",
      projects: "12+ Projects"
    },
    {
      image: "/images/ThumbnailSlider/Slider_3.png",
      name: "Youssef Ali",
      achievement: "Game Developer",
      projects: "18+ Projects"
    },
    {
      image: "/images/ThumbnailSlider/Slider_4.jpg",
      name: "Lina Chen",
      achievement: "Web Designer",
      projects: "14+ Projects"
    }
  ];

  const NextArrow = ({ onClick }: { onClick?: () => void }) => (
    <button
      onClick={onClick}
      className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/95 hover:bg-white text-primary rounded-full w-12 h-12 flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-3xl border border-primary/20"
      aria-label="Next slide"
    >
      <ChevronRight size={24} className="text-primary" />
    </button>
  );

  const PrevArrow = ({ onClick }: { onClick?: () => void }) => (
    <button
      onClick={onClick}
      className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/95 hover:bg-white text-primary rounded-full w-12 h-12 flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-3xl border border-primary/20"
      aria-label="Previous slide"
    >
      <ChevronLeft size={24} className="text-primary" />
    </button>
  );

  const settingsMain = {
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    fade: true,
    asNavFor: navSliderRef.current as Slider,
    beforeChange: (current: number, next: number) => setActiveIndex(next),
    autoplay: true,
    autoplaySpeed: 5000,
    pauseOnHover: true,
  };

  const settingsNav = {
    slidesToShow: Math.min(4, leaders.length),
    slidesToScroll: 1,
    asNavFor: mainSliderRef.current as Slider,
    dots: false,
    centerMode: true,
    centerPadding: "0px",
    focusOnSelect: true,
    arrows: false,
    responsive: [
      {
        breakpoint: 1280,
        settings: {
          slidesToShow: Math.min(3, leaders.length),
        }
      },
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: Math.min(3, leaders.length),
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: Math.min(2, leaders.length),
        }
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          centerMode: false,
        }
      }
    ]
  };

  useEffect(() => {
    if (mainSliderRef.current && navSliderRef.current) {
      mainSliderRef.current.slickGoTo(activeIndex);
    }
  }, [activeIndex]);

  return (
    <div className="thumbnail-carousel w-full max-w-5xl mx-auto">
      {/* Main Slider */}
      <div className="main-slider mb-8 rounded-3xl overflow-hidden shadow-2xl relative group">
        <Slider
          {...settingsMain}
          ref={mainSliderRef}
        >
          {leaders.map((leader, index) => (
            <div key={index} className="outline-none">
              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden">
                <Image
                  src={leader.image}
                  alt={`Young Tech Leader - ${leader.name}`}
                  fill
                  quality={95}
                  className="object-cover transition-transform duration-1000 group-hover:scale-105"
                  priority={index === 0}
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                
                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-6 h-6 text-LightYellow" />
                    <span className="text-lg font-semibold text-LightYellow">
                      {leader.achievement}
                    </span>
                  </div>
                  
                  <h3 className="text-3xl font-bold mb-3 text-white">
                    {leader.name}
                  </h3>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-white/80" />
                      <span className="text-white/90">{leader.projects}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-YellowRating text-YellowRating" />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Slide Number Badge */}
                <div className="absolute top-6 right-6 bg-black/60 text-white px-4 py-2 rounded-2xl text-sm font-semibold backdrop-blur-md border border-white/20">
                  {index + 1} / {leaders.length}
                </div>
              </div>
            </div>
          ))}
        </Slider>
      </div>

      {/* Thumbnail Navigation */}
      <div className="thumbnail-nav px-8">
        <Slider
          {...settingsNav}
          ref={navSliderRef}
        >
          {leaders.map((leader, index) => (
            <div key={index} className="px-3 outline-none">
              <button
                onClick={() => setActiveIndex(index)}
                className={`relative aspect-[4/3] rounded-2xl overflow-hidden border-4 transition-all duration-500 transform ${
                  activeIndex === index
                    ? "border-primary scale-105 shadow-2xl ring-4 ring-primary/30"
                    : "border-white/50 dark:border-gray-600/50 opacity-80 hover:opacity-100 hover:scale-102 hover:border-primary/30"
                }`}
                aria-label={`View ${leader.name}'s profile`}
              >
                <Image
                  src={leader.image}
                  alt={`Thumbnail - ${leader.name}`}
                  fill
                  quality={80}
                  className="object-cover"
                />
                
                {/* Thumbnail Overlay */}
                <div className={`absolute inset-0 transition-all duration-300 ${
                  activeIndex === index 
                    ? "bg-primary/10" 
                    : "bg-black/20 hover:bg-black/10"
                }`} />
                
                {/* Thumbnail Info */}
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="bg-black/70 backdrop-blur-sm rounded-lg p-2 text-center">
                    <p className="text-xs font-semibold text-white truncate">
                      {leader.name}
                    </p>
                  </div>
                </div>
                
                {/* Active Indicator */}
                {activeIndex === index && (
                  <div className="absolute top-3 right-3 w-4 h-4 bg-primary rounded-full ring-2 ring-white animate-pulse" />
                )}
              </button>
            </div>
          ))}
        </Slider>
      </div>

      {/* Enhanced Progress Dots */}
      <div className="flex justify-center mt-8 space-x-4">
        {leaders.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`flex flex-col items-center transition-all duration-500 ${
              activeIndex === index
                ? "scale-110"
                : "scale-100 hover:scale-105"
            }`}
            aria-label={`Go to ${leaders[index].name}'s profile`}
          >
            <div className={`w-3 h-3 rounded-full transition-all duration-500 ${
              activeIndex === index
                ? "bg-primary scale-125 shadow-lg"
                : "bg-gray-300 dark:bg-gray-600 hover:bg-primary/50"
            }`} />
            <span className={`text-xs mt-2 font-medium transition-all duration-300 ${
              activeIndex === index
                ? "text-primary font-semibold"
                : "text-gray-500 dark:text-gray-400"
            }`}>
              {index + 1}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThumbnailCarousel;