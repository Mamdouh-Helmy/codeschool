"use client";
import React, { useState, useEffect } from "react";
import { useLocale } from "@/app/context/LocaleContext";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ThumbnailCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { dir } = useLocale();

  const isRTL = dir === "rtl";

  const images = [
    "/images/ThumbnailSlider/Slider_1.png",
    "/images/ThumbnailSlider/Slider_2.jpg", 
    "/images/ThumbnailSlider/Slider_3.png",
    "/images/ThumbnailSlider/Slider_4.jpg"
  ];

  const nextSlide = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  // Auto-slide
  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 lg:px-8">
      {/* Main Carousel */}
      <div className="relative overflow-hidden rounded-2xl shadow-2xl">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
            direction: "ltr",
          }}
        >
          {images.map((src, index) => (
            <div key={index} className="w-full flex-shrink-0">
              {/* الصورة الكبيرة */}
              <img
                src={src}
                alt={`Student achievement ${index + 1}`}
                className="w-full h-full object-cover aspect-[4/3] rounded-2xl"
              />
            </div>
          ))}
        </div>

        {/* <button
          onClick={isRTL ? nextSlide : prevSlide}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 dark:bg-darkmode/80 hover:bg-white dark:hover:bg-darkmode text-primary p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={isRTL ? prevSlide : nextSlide}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 dark:bg-darkmode/80 hover:bg-white dark:hover:bg-darkmode text-primary p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
        >
          <ChevronRight className="w-6 h-6" />
        </button> */}
      </div>

{/*     
      <div className="flex justify-center mt-6">
        <div className="flex gap-3">
          {images.map((_, index) => (
            <div
              key={`indicator-${index}`}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                currentIndex === index 
                  ? 'bg-primary scale-125' 
                  : 'bg-CadetBlue'
              }`}
            />
          ))}
        </div>
      </div> */}

      {/* Progress Bar */}
      <div className="mt-4 w-full bg-primary/20 rounded-full h-1">
        <div
          className="bg-primary h-1 rounded-full transition-all duration-500"
          style={{
            width: `${((currentIndex + 1) / images.length) * 100}%`,
          }}
        />
      </div>
    </div>
  );
};

export default ThumbnailCarousel;